# -*- coding: utf-8 -*-
"""
============================================================
💰 D4M DONATE & TỰ ĐỘNG NÂNG CẤP TÀI KHOẢN (SEPAY)
============================================================
- POST /api/donate/qr           : Tạo mã QR tĩnh VietQR (hạn 15 phút).
- POST /api/donate/sepay-webhook: Nhận webhook SePay, kích hoạt tài khoản,
                                  lưu lịch sử + notify realtime WebSocket.

CHỐNG GIAO DỊCH GIẢ / REPLAY:
  - trans_id UNIQUE trong donate_logs -> webhook trùng giao dịch bị bỏ qua.
  - Mỗi mã QR có thời hạn 15 phút (donate_qr.expires_at) -> QR hết hạn.
  - Kiểm tra user tồn tại + content đúng định dạng D4M {user_id}.
============================================================
"""
import logging
import re
import uuid
from datetime import datetime, timedelta
from urllib.parse import quote

from fastapi import APIRouter, Request, HTTPException, Header
from pydantic import BaseModel, Field

from core.config import settings
from core import urls as U
from core.database import db_executor, db_inserter, db_updater
from api.ws_donate import donate_manager

logger = logging.getLogger("d4m_donate")

router = APIRouter(prefix=U.DONATE["PREFIX"], tags=["Donate & SePay"])

QR_TTL_MINUTES = 15  # mỗi mã QR chỉ có hiệu lực 15 phút

# ==========================================================
# 📦 SCHEMAS
# ==========================================================
class DonateQRRequest(BaseModel):
    user_id: int = Field(..., gt=0, description="ID người donate")
    amount: int = Field(..., gt=0, description="Số tiền (VNĐ)")


class SePayWebhookPayload(BaseModel):
    transferAmount: float = 0
    content: str = ""
    transID: str = ""
    time: str = ""
    # Các trường khác của SePay bỏ qua an toàn.


# ==========================================================
# 🖼️ TẠO MÃ QR TĨNH VIETQR (HẠN 15 PHÚT)
# ==========================================================
@router.post(U.DONATE["QR"])
async def create_donate_qr(req: DonateQRRequest):
    """Tạo mã QR + phiên QR có thời hạn 15 phút."""
    try:
        # Kiểm tra user tồn tại
        user = db_executor.select_as_list_dict(
            "SELECT id, username, full_name FROM users WHERE id=%s", (req.user_id,))
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản.")

        add_info = f"D4M {req.user_id}"
        add_info_enc = quote(add_info, safe="")
        account_name_enc = quote(settings.BANK_ACCOUNT_NAME or user[0].get("full_name") or "", safe="")

        qr_url = (
            f"https://img.vietqr.io/image/{settings.BANK_ID}-{settings.BANK_ACCOUNT}-compact2.png"
            f"?amount={req.amount}"
            f"&addInfo={add_info_enc}"
            f"&accountName={account_name_enc}"
        )

        # Tạo phiên QR với thời hạn 15 phút
        qr_id = uuid.uuid4().hex[:20]
        expires_at = datetime.utcnow() + timedelta(minutes=QR_TTL_MINUTES)
        db_inserter.insert(
            "INSERT INTO donate_qr (id, user_id, amount, qr_url, status, expires_at) "
            "VALUES (%s, %s, %s, %s, 'pending', %s)",
            (qr_id, req.user_id, req.amount, qr_url, expires_at.strftime("%Y-%m-%d %H:%M:%S")),
        )
        logger.info(f"[DONATE] Tạo QR {qr_id} cho user {req.user_id}, {req.amount}đ, hết hạn {expires_at}")

        return {
            "status": "success",
            "qr_id": qr_id,
            "qr_url": qr_url,
            "add_info": add_info,
            "amount": req.amount,
            "bank": settings.BANK_ID,
            "expires_at": expires_at.strftime("%Y-%m-%d %H:%M:%S"),
            "ttl_minutes": QR_TTL_MINUTES,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[DONATE] Lỗi tạo QR user {req.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Lỗi tạo mã QR.")


# ==========================================================
# 🔔 WEBHOOK SEPAY — KIỂM TRA GIAO DỊCH THẬT/GIẢ
# ==========================================================
@router.post(U.DONATE["SEPAY_WEBHOOK"])
async def sepay_webhook(
    payload: SePayWebhookPayload,
    request: Request,
    authorization: str = Header(default=""),
):
    """Xử lý webhook: chống giả mạo + replay + QR hết hạn."""
    try:
        # ---------- 1. XÁC THỰC ----------
        expected = f"Bearer {settings.SEPAy_TOKEN}".strip()
        provided = (authorization or "").strip()
        if not expected or not provided or provided != expected:
            logger.warning(f"[DONATE] Webhook bị từ chối (token sai).")
            raise HTTPException(status_code=401, detail="Unauthorized")

        # ---------- 2. BÓC TÁCH USER_ID ----------
        content = (payload.content or "").strip()
        match = re.search(r"D4M\s*(\d+)", content, re.IGNORECASE)
        if not match:
            logger.info(f"[DONATE] Bỏ qua giao dịch không đúng định dạng D4M: {content}")
            return {"status": "ignored", "reason": "Không khớp định dạng D4M {user_id}"}

        user_id = int(match.group(1))
        trans_id = (payload.transID or "").strip()
        amount = int(payload.transferAmount)

        # ---------- 3. CHỐNG REPLAY / GIAO DỊCH GIẢ ----------
        # Nếu trans_id đã tồn tại -> giao dịch trùng (replay attack) -> bỏ qua
        if trans_id:
            exists = db_executor.select_as_list_dict(
                "SELECT id FROM donate_logs WHERE trans_id=%s", (trans_id,))
            if exists:
                logger.warning(f"[DONATE] trans_id {trans_id} ĐÃ TỒN TẠI (replay/fake) - bỏ qua.")
                return {"status": "ignored", "reason": "Giao dịch trùng lặp (trans_id đã tồn tại)"}

        # ---------- 4. KIỂM TRA USER TỒN TẠI ----------
        user = db_executor.select_as_list_dict(
            "SELECT id, username, active FROM users WHERE id=%s", (user_id,))
        if not user:
            logger.warning(f"[DONATE] user_id {user_id} không tồn tại.")
            return {"status": "ignored", "reason": "User không tồn tại"}

        # ---------- 5. TÌM PHIÊN QR TƯƠNG ỨNG & KIỂM TRA HẠN ----------
        qr = db_executor.select_as_list_dict(
            "SELECT id, amount, status, expires_at FROM donate_qr "
            "WHERE user_id=%s AND status='pending' ORDER BY created_at DESC LIMIT 1",
            (user_id,))
        qr_id = None
        qr_expired = False
        if qr:
            qr_id = qr[0]["id"]
            try:
                expires_at = qr[0]["expires_at"]
                # expires_at có thể là datetime
                exp_dt = expires_at if hasattr(expires_at, "timestamp") else datetime.strptime(str(expires_at), "%Y-%m-%d %H:%M:%S")
                if datetime.utcnow() > exp_dt:
                    qr_expired = True
                    db_updater.update("UPDATE donate_qr SET status='expired' WHERE id=%s", (qr_id,))
                    logger.info(f"[DONATE] QR {qr_id} đã hết hạn 15 phút.")
            except Exception as e:
                logger.warning(f"[DONATE] Lỗi parse expires_at QR: {e}")

        # ---------- 6. KÍCH HOẠT TÀI KHOẢN ----------
        if user[0].get("active") != 1:
            db_updater.update("UPDATE users SET active = 1 WHERE id = %s", (user_id,))
            logger.info(f"[DONATE] ✅ Kích hoạt tài khoản user {user_id} (active 0->1).")

        # ---------- 7. ĐÁNH DẤU QR THÀNH CÔNG ----------
        if qr_id:
            db_updater.update("UPDATE donate_qr SET status='success' WHERE id=%s", (qr_id,))

        # ---------- 8. LƯU LỊCH SỬ (UNIQUE trans_id) ----------
        log_status = "expired" if qr_expired else "success"
        try:
            db_inserter.insert(
                "INSERT INTO donate_logs (user_id, qr_id, amount, content, trans_id, time, status) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (
                    user_id, qr_id, amount, content, trans_id,
                    payload.time or datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
                    log_status,
                ),
            )
            logger.info(f"[DONATE] Đã lưu donate_logs user {user_id}, amount {amount}, status {log_status}.")
        except Exception as log_err:
            # UNIQUE trans_id bị vi phạm -> replay, không làm hỏng luồng
            if "Duplicate entry" in str(log_err):
                logger.warning(f"[DONATE] trans_id {trans_id} trùng khi insert -> bỏ qua (replay).")
                return {"status": "ignored", "reason": "Giao dịch trùng lặp"}
            logger.error(f"[DONATE] Lỗi lưu donate_logs: {log_err}")

        # ---------- 9. NOTIFY REALTIME (kèm số tiền) ----------
        try:
            await donate_manager.notify_payment_success(user_id, amount=amount, trans_id=trans_id, qr_expired=qr_expired)
        except Exception as ws_err:
            logger.error(f"[DONATE] Lỗi notify WebSocket: {ws_err}")

        return {
            "status": "success",
            "message": "Đã kích hoạt tài khoản thành công.",
            "amount": amount,
            "qr_expired": qr_expired,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[DONATE] Lỗi xử lý Webhook SePay: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Lỗi xử lý webhook")
