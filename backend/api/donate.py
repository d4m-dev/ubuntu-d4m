# -*- coding: utf-8 -*-
"""
============================================================
💰 D4M DONATE & TỰ ĐỘNG KÍCH HOẠT TÀI KHOẢN — PayOS
============================================================
Cấu hình backend/.env:
  PAYOS_CLIENT_ID=... / PAYOS_API_KEY=... / PAYOS_CHECKSUM_KEY=...
  (tuỳ chọn) PAYOS_RETURN_URL / PAYOS_CANCEL_URL

Endpoints:
- POST /api/donate/qr            : PayOS payment request -> QR động 15 phút
                                   (chưa cấu hình key -> fallback VietQR)
- GET  /api/donate/status/{qr_id}: polling — TỰ HỎI PAYOS khi pending
- POST /api/donate/payos-webhook : webhook PayOS (verify HMAC-SHA256)
- POST /api/donate/sepay-webhook : tương thích ngược SePay

🔔 Mỗi lần tiền về -> alert Telegram realtime (core.tg_ecosystem.alert_donate)
============================================================
"""
import base64
import hashlib
import hmac
import io
import logging
import re
import time
import uuid
from datetime import datetime, timedelta
from urllib.parse import quote

try:
    import httpx
except ImportError:  # pragma: no cover
    httpx = None
    logging.getLogger("d4m_donate").warning("httpx thiếu -> PayOS fallback VietQR.")

from fastapi import APIRouter, Request, HTTPException, Header
from pydantic import BaseModel, Field

from core.config import settings
from core import urls as U
from core.database import db_executor, db_inserter, db_updater
from api.ws_donate import donate_manager

logger = logging.getLogger("d4m_donate")

router = APIRouter(prefix=U.DONATE["PREFIX"], tags=["Donate & PayOS"])

QR_TTL_MINUTES = 15
PAYOS_BASE = "https://api-merchant.payos.vn"


class DonateQRRequest(BaseModel):
    user_id: int = Field(..., gt=0)
    amount: int = Field(..., gt=0)


class SePayWebhookPayload(BaseModel):
    transferAmount: float = 0
    content: str = ""
    transID: str = ""
    time: str = ""


# ==========================================================
# 🔐 PAYOS CRYPTO
# ==========================================================
def payos_configured() -> bool:
    return bool(settings.PAYOS_CLIENT_ID and settings.PAYOS_API_KEY and settings.PAYOS_CHECKSUM_KEY)


def _create_link_signature(order_code, amount, description, return_url, cancel_url):
    data = (f"amount={amount}&cancelUrl={cancel_url}&description={description}"
            f"&orderCode={order_code}&returnUrl={return_url}")
    return hmac.new(settings.PAYOS_CHECKSUM_KEY.encode(), data.encode(),
                    hashlib.sha256).hexdigest()


def _verify_webhook_signature(data: dict, signature: str) -> bool:
    if not signature:
        return False
    parts = []
    for k in sorted(data.keys()):
        v = data.get(k)
        if v is None or str(v) in ("null", "undefined"):
            v = ""
        parts.append(f"{k}={v}")
    calc = hmac.new(settings.PAYOS_CHECKSUM_KEY.encode(),
                    "&".join(parts).encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(calc, signature)


def _qr_data_uri(qr_content: str) -> str:
    try:
        import qrcode
        buf = io.BytesIO()
        qrcode.make(qr_content).save(buf, format="PNG")
        return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    except Exception as e:
        logger.warning(f"[DONATE] qrcode lib lỗi, dùng quickchart: {e}")
        return f"https://quickchart.io/qr?size=240&text={quote(qr_content, safe='')}"


# ==========================================================
# 🖼️ TẠO QR (PayOS ưu tiên, VietQR fallback)
# ==========================================================
@router.post(U.DONATE["QR"])
async def create_donate_qr(req: DonateQRRequest):
    try:
        user = db_executor.select_as_list_dict(
            "SELECT id, username, full_name FROM users WHERE id=%s", (req.user_id,))
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản.")

        expires_at = datetime.utcnow() + timedelta(minutes=QR_TTL_MINUTES)
        qr_id = qr_url = None
        provider = "vietqr"

        if payos_configured() and httpx is not None:
            try:
                order_code = int(time.time() * 1000) % 10_000_000_000
                description = f"D4M {req.user_id}"
                return_url = getattr(settings, "PAYOS_RETURN_URL", "") or "https://payos.vn"
                cancel_url = getattr(settings, "PAYOS_CANCEL_URL", "") or "https://payos.vn"
                signature = _create_link_signature(order_code, req.amount, description,
                                                   return_url, cancel_url)
                resp = httpx.post(
                    f"{PAYOS_BASE}/v2/payment-requests",
                    headers={"x-client-id": settings.PAYOS_CLIENT_ID,
                             "x-api-key": settings.PAYOS_API_KEY,
                             "Content-Type": "application/json"},
                    json={"orderCode": order_code, "amount": req.amount,
                          "description": description, "returnUrl": return_url,
                          "cancelUrl": cancel_url, "signature": signature},
                    timeout=20)
                body = resp.json()
                if resp.status_code == 200 and str(body.get("code")) in ("00", "0000", "0"):
                    pdata = body.get("data", {})
                    qr_content = pdata.get("qrCode") or pdata.get("checkoutUrl") or ""
                    qr_url = _qr_data_uri(qr_content) if qr_content else pdata.get("checkoutUrl", "")
                    qr_id = str(order_code)
                    provider = "payos"
                    logger.info(f"[DONATE] PayOS OK link={pdata.get('paymentLinkId')}")
                else:
                    logger.error(f"[DONATE] PayOS từ chối: {resp.status_code} {body} -> VietQR")
            except Exception as e:
                logger.error(f"[DONATE] PayOS lỗi ({e}) -> VietQR")

        if qr_id is None:
            add_info = f"D4M {req.user_id}"
            qr_url = (
                f"https://img.vietqr.io/image/{settings.BANK_ID}-{settings.BANK_ACCOUNT}-compact2.png"
                f"?amount={req.amount}&addInfo={quote(add_info, safe='')}"
                f"&accountName={quote(settings.BANK_ACCOUNT_NAME or user[0].get('full_name') or '', safe='')}"
            )
            qr_id = uuid.uuid4().hex[:20]
            provider = "vietqr"

        db_inserter.insert(
            "INSERT INTO donate_qr (id, user_id, amount, qr_url, status, expires_at) "
            "VALUES (%s, %s, %s, %s, 'pending', %s)",
            (qr_id, req.user_id, req.amount, qr_url, expires_at.strftime("%Y-%m-%d %H:%M:%S")))

        return {"status": "success", "provider": provider, "qr_id": qr_id, "qr_url": qr_url,
                "add_info": f"D4M {req.user_id}", "amount": req.amount,
                "expires_at": expires_at.strftime("%Y-%m-%d %H:%M:%S"),
                "ttl_minutes": QR_TTL_MINUTES}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[DONATE] Lỗi tạo QR user {req.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Lỗi tạo mã QR.")


# ==========================================================
# 🔎 POLLING — TỰ HỎI PAYOS KHI PENDING
# ==========================================================
@router.get(U.DONATE["STATUS"])
async def donate_status(qr_id: str):
    rows = db_executor.select_as_list_dict(
        "SELECT status, amount, user_id FROM donate_qr WHERE id=%s", (qr_id,))
    if not rows:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên QR.")
    row = rows[0]

    if row["status"] == "pending" and payos_configured() and httpx is not None and qr_id.isdigit():
        try:
            resp = httpx.get(f"{PAYOS_BASE}/v2/payment-requests/{qr_id}",
                             headers={"x-client-id": settings.PAYOS_CLIENT_ID,
                                      "x-api-key": settings.PAYOS_API_KEY},
                             timeout=10)
            body = resp.json()
            if str(body.get("code")) in ("00", "0000", "0"):
                pdata = body.get("data") or {}
                st = str(pdata.get("status") or "").upper()
                if st in ("PAID", "SUCCESS", "COMPLETED"):
                    trans_id = str(pdata.get("reference") or pdata.get("paymentLinkId") or f"PAYOS-{qr_id}")
                    await _finalize_payment(row["user_id"], row["amount"], trans_id,
                                            f"D4M {row['user_id']}")
                    return {"status": "success", "qr_status": "success", "amount": row["amount"]}
                if st in ("CANCELLED", "EXPIRED"):
                    db_updater.update("UPDATE donate_qr SET status='expired' WHERE id=%s", (qr_id,))
                    return {"status": "success", "qr_status": "expired", "amount": row["amount"]}
        except Exception as e:
            logger.warning(f"[DONATE] Polling PayOS lỗi: {e}")

    return {"status": "success", "qr_status": row["status"], "amount": row["amount"]}


# ==========================================================
# 🧾 NGHIỆP VỤ CHUNG SAU KHI NHẬN TIỀN
# ==========================================================
async def _finalize_payment(user_id: int, amount: int, trans_id: str, content: str):
    if trans_id:
        exists = db_executor.select_as_list_dict(
            "SELECT id FROM donate_logs WHERE trans_id=%s", (trans_id,))
        if exists:
            return {"status": "ignored", "reason": "Giao dịch trùng lặp"}

    user = db_executor.select_as_list_dict(
        "SELECT id, username, active FROM users WHERE id=%s", (user_id,))
    if not user:
        return {"status": "ignored", "reason": "User không tồn tại"}

    qr = db_executor.select_as_list_dict(
        "SELECT id, status, expires_at FROM donate_qr WHERE user_id=%s AND status='pending' "
        "ORDER BY created_at DESC LIMIT 1", (user_id,))
    qr_id, qr_expired = None, False
    if qr:
        qr_id = qr[0]["id"]
        try:
            exp = qr[0]["expires_at"]
            exp_dt = exp if hasattr(exp, "timestamp") else datetime.strptime(str(exp), "%Y-%m-%d %H:%M:%S")
            if datetime.utcnow() > exp_dt:
                qr_expired = True
                db_updater.update("UPDATE donate_qr SET status='expired' WHERE id=%s", (qr_id,))
        except Exception:
            pass

    if user[0].get("active") != 1:
        db_updater.update("UPDATE users SET active = 1 WHERE id = %s", (user_id,))
        logger.info(f"[DONATE] ✅ Kích hoạt user {user_id}.")

    if qr_id and not qr_expired:
        db_updater.update("UPDATE donate_qr SET status='success' WHERE id=%s", (qr_id,))

    try:
        db_inserter.insert(
            "INSERT INTO donate_logs (user_id, qr_id, amount, content, trans_id, time, status) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (user_id, qr_id, amount, content, trans_id or uuid.uuid4().hex,
             datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
             "expired" if qr_expired else "success"))
    except Exception as e:
        if "Duplicate entry" in str(e):
            return {"status": "ignored", "reason": "Giao dịch trùng lặp"}
        logger.error(f"[DONATE] Lỗi lưu logs: {e}")

    try:
        await donate_manager.notify_payment_success(user_id, amount=amount,
                                                    trans_id=trans_id, qr_expired=qr_expired)
    except Exception as e:
        logger.error(f"[DONATE] WS notify lỗi: {e}")

    # 🔔 ALERT TELEGRAM REALTIME
    try:
        from core.tg_ecosystem import alert_donate
        import asyncio
        asyncio.create_task(alert_donate(user_id, amount))
    except Exception as e:
        logger.warning(f"[DONATE] TG alert lỗi: {e}")

    return {"status": "success", "amount": amount, "qr_expired": qr_expired}


# ==========================================================
# 🪝 WEBHOOK PAYOS
# ==========================================================
@router.post(U.DONATE["PAYOS_WEBHOOK"])
async def payos_webhook(request: Request):
    if not payos_configured():
        raise HTTPException(status_code=503, detail="PayOS chưa được cấu hình.")
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Body không hợp lệ.")

    data = body.get("data") or {}
    signature = body.get("signature") or ""
    if not _verify_webhook_signature(data, signature):
        logger.warning("[DONATE] PayOS webhook signature SAI - từ chối.")
        raise HTTPException(status_code=401, detail="Invalid signature")

    if not (body.get("success") is True or str(data.get("code")) == "00"):
        return {"status": "ignored", "reason": "Giao dịch chưa thành công"}

    content = str(data.get("description") or "")
    m = re.search(r"D4M\s*(\d+)", content, re.IGNORECASE)
    if not m:
        return {"status": "ignored", "reason": "Không khớp định dạng D4M {user_id}"}
    user_id = int(m.group(1))
    amount = int(data.get("amount") or 0)
    trans_id = str(data.get("reference") or data.get("paymentLinkId") or "")

    result = await _finalize_payment(user_id, amount, trans_id, content)
    logger.info(f"[DONATE] PayOS webhook user {user_id} +{amount}đ -> {result.get('status')}")
    return result


# ==========================================================
# 🪝 WEBHOOK SEPAY (tương thích ngược)
# ==========================================================
@router.post(U.DONATE["SEPAY_WEBHOOK"])
async def sepay_webhook(payload: SePayWebhookPayload, authorization: str = Header(default="")):
    expected = f"Bearer {settings.SEPAy_TOKEN}".strip()
    provided = (authorization or "").strip()
    if not expected or not provided or provided != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")

    content = (payload.content or "").strip()
    m = re.search(r"D4M\s*(\d+)", content, re.IGNORECASE)
    if not m:
        return {"status": "ignored", "reason": "Không khớp định dạng D4M {user_id}"}
    return await _finalize_payment(int(m.group(1)), int(payload.transferAmount),
                                   (payload.transID or "").strip(), content)
