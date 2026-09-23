# -*- coding: utf-8 -*-
"""
============================================================
🪙 D4M XU — Nhiệm vụ kiếm Xu · Mua Xu (PayOS) · Tặng Xu
============================================================
- GET  /api/xu/tasks                  : danh sách nhiệm vụ + trạng thái hôm nay
- POST /api/xu/tasks/claim            : nhận thưởng nhiệm vụ
- GET  /api/xu/packages               : các gói nạp Xu
- POST /api/xu/buy                    : tạo link thanh toán PayOS
- GET  /api/xu/buy/status/{order}     : polling kết quả thanh toán
- GET  /api/xu/return                 : PayOS returnUrl — xác nhận + về Social Hub
- POST /api/xu/gift                   : tặng Xu cho đạo hữu khác
- GET  /api/xu/history                : sổ giao dịch gần nhất
============================================================
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field

from core import urls as U
from core.config import settings
from core.database import db_executor
from services import xu_service as XS
from api.social import get_current_user
# 🔁 Tái dùng bộ PayOS đã kiểm chứng của donate
from api.donate import (_create_link_signature, _http_post, _http_get,
                        PAYOS_BASE, payos_configured)

router = APIRouter(prefix=U.XU["PREFIX"], tags=["Xu — Nhiệm vụ · Mua · Tặng"])
logger = logging.getLogger("xu")


class ClaimRequest(BaseModel):
    task_key: str


class BuyRequest(BaseModel):
    package_id: str


class GiftRequest(BaseModel):
    to_username: str
    amount: int = Field(..., gt=0)
    note: str = ""


# ==========================================
# 📋 NHIỆM VỤ KIẾM XU
# ==========================================
@router.get(U.XU["TASKS"])
def get_tasks(current_user: dict = Depends(get_current_user)):
    uid = current_user.get("user_id")
    tasks = []
    for t in XS.XU_TASKS:
        tasks.append({
            **t,
            "done": XS.task_done_today(uid, t["key"]),
            "completed": XS.task_completed(uid, t["key"]),
        })
    return {"status": "success", "data": {"xu": XS.get_xu(uid), "tasks": tasks}}


@router.post(U.XU["CLAIM"])
def claim_task(body: ClaimRequest, current_user: dict = Depends(get_current_user)):
    uid = current_user.get("user_id")
    ok, msg = XS.claim_task(uid, body.task_key)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"status": "success", "message": msg, "xu": XS.get_xu(uid)}


# ==========================================
# 💳 MUA XU (PAYOS)
# ==========================================
@router.get(U.XU["PACKAGES"])
def get_packages(current_user: dict = Depends(get_current_user)):
    return {"status": "success", "data": XS.XU_PACKAGES,
            "payos_ready": payos_configured()}


@router.post(U.XU["BUY"])
async def buy_xu(body: BuyRequest, current_user: dict = Depends(get_current_user)):
    uid = current_user.get("user_id")
    pkg = next((p for p in XS.XU_PACKAGES if p["id"] == body.package_id), None)
    if not pkg:
        raise HTTPException(status_code=404, detail="Gói nạp không tồn tại.")
    if not payos_configured():
        raise HTTPException(status_code=503,
                            detail="Cổng thanh toán PayOS chưa cấu hình (thiếu khóa trong .env).")

    order_code = XS.new_order_code()
    description = f"D4M XU {uid}"[:25]  # PayOS giới hạn 25 ký tự
    return_url = getattr(settings, "PAYOS_RETURN_URL", "") or \
        f"{U.XU.get('RETURN_FALLBACK', '')}" or "https://payos.vn"
    cancel_url = getattr(settings, "PAYOS_CANCEL_URL", "") or "https://payos.vn"
    signature = _create_link_signature(order_code, pkg["vnd"], description,
                                       return_url, cancel_url)
    try:
        resp = await _http_post(
            f"{PAYOS_BASE}/v2/payment-requests",
            headers={"x-client-id": settings.PAYOS_CLIENT_ID,
                     "x-api-key": settings.PAYOS_API_KEY,
                     "Content-Type": "application/json"},
            json={"orderCode": order_code, "amount": pkg["vnd"],
                  "description": description, "returnUrl": return_url,
                  "cancelUrl": cancel_url, "signature": signature},
            timeout=20)
        data = resp.json()
    except Exception as e:
        logger.error(f"[XU] PayOS lỗi kết nối: {e}")
        raise HTTPException(status_code=502, detail="Không kết nối được cổng thanh toán.")

    if resp.status_code != 200 or str(data.get("code")) not in ("00", "0000", "0"):
        logger.error(f"[XU] PayOS từ chối: {resp.status_code} {data}")
        raise HTTPException(status_code=502, detail="Cổng thanh toán từ chối tạo đơn.")

    pdata = data.get("data", {}) or {}
    checkout_url = pdata.get("checkoutUrl") or pdata.get("qrCode") or ""
    if not checkout_url:
        raise HTTPException(status_code=502, detail="PayOS không trả link thanh toán.")

    # Ghi sổ giao dịch PENDING (ref = orderCode, note='pending' để idempotent)
    from core.database import db_updater
    db_updater.update(
        "INSERT INTO xu_transactions (user_id, kind, xu, vnd, ref, note) "
        "VALUES (%s,'buy',%s,%s,%s,'pending')",
        (uid, pkg["xu"], pkg["vnd"], str(order_code)))
    logger.info(f"[XU] Tạo đơn nạp {pkg['id']} user={uid} order={order_code}")
    return {"status": "success", "order_code": str(order_code),
            "checkout_url": checkout_url, "vnd": pkg["vnd"], "xu": pkg["xu"]}


@router.get(U.XU["BUY_STATUS"])
async def buy_status(order_code: str, current_user: dict = Depends(get_current_user)):
    """Frontend polling sau khi mở cổng thanh toán."""
    row = XS.find_pending_buy(order_code)
    if not row:
        # có thể đã hoàn tất ở /return — kiểm tra sổ giao dịch
        rows = db_executor.select_as_list_dict(
            "SELECT note FROM xu_transactions WHERE ref=%s AND kind='buy' LIMIT 1",
            (str(order_code),))
        if rows and str(rows[0]["note"]).startswith("paid"):
            return {"status": "success", "paid": True, "xu": XS.get_xu(current_user.get("user_id"))}
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn nạp.")

    if not payos_configured():
        return {"status": "success", "paid": False}
    try:
        resp = await _http_get(f"{PAYOS_BASE}/v2/payment-requests/{order_code}",
                               headers={"x-client-id": settings.PAYOS_CLIENT_ID,
                                        "x-api-key": settings.PAYOS_API_KEY},
                               timeout=10)
        data = resp.json()
        if str(data.get("code")) in ("00", "0000", "0"):
            pdata = data.get("data") or {}
            st = str(pdata.get("status") or "").upper()
            if st in ("PAID", "SUCCESS", "COMPLETED"):
                trans_id = str(pdata.get("reference") or pdata.get("paymentLinkId")
                               or f"PAYOS-{order_code}")
                XS.finalize_buy(order_code, trans_id)
                return {"status": "success", "paid": True,
                        "xu": XS.get_xu(current_user.get("user_id"))}
            if st in ("CANCELLED", "EXPIRED"):
                from core.database import db_updater
                db_updater.update(
                    "UPDATE xu_transactions SET note='cancelled' WHERE ref=%s AND note='pending'",
                    (str(order_code),))
                return {"status": "success", "paid": False, "cancelled": True}
    except Exception as e:
        logger.warning(f"[XU] polling PayOS lỗi: {e}")
    return {"status": "success", "paid": False}


@router.get(U.XU["RETURN"], include_in_schema=False)
async def xu_return(orderCode: str = "", code: str = "", cancel: bool = False):
    """PayOS điều hướng về sau thanh toán → xác nhận rồi đưa về Social Hub."""
    if orderCode and not cancel and str(code) in ("00", "0000", "0", ""):
        try:
            resp = await _http_get(f"{PAYOS_BASE}/v2/payment-requests/{orderCode}",
                                   headers={"x-client-id": settings.PAYOS_CLIENT_ID,
                                            "x-api-key": settings.PAYOS_API_KEY},
                                   timeout=10)
            data = resp.json()
            pdata = data.get("data") or {}
            if str(pdata.get("status") or "").upper() in ("PAID", "SUCCESS", "COMPLETED"):
                XS.finalize_buy(orderCode, str(pdata.get("reference") or ""))
                return RedirectResponse("/social/social-hub?xu=nap-thanh-cong", status_code=302)
        except Exception as e:
            logger.warning(f"[XU] return-verify lỗi: {e}")
    return RedirectResponse("/social/social-hub?xu=da-huy", status_code=302)


# ==========================================
# 🎁 TẶNG XU
# ==========================================
@router.post(U.XU["GIFT"])
def gift_xu(body: GiftRequest, current_user: dict = Depends(get_current_user)):
    uid = current_user.get("user_id")
    if body.amount < XS.MIN_GIFT:
        raise HTTPException(status_code=400,
                            detail=f"Tối thiểu {XS.MIN_GIFT:,} Xu mỗi lần tặng.")

    target = db_executor.select_as_list_dict(
        "SELECT id, username FROM users WHERE username=%s AND id!=%s",
        (body.to_username.strip(), uid))
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy đạo hữu này.")
    to_id = target[0]["id"]

    from core.database import db_updater, db_inserter
    balance = XS.get_xu(uid)
    if balance < body.amount:
        raise HTTPException(status_code=400,
                            detail=f"Không đủ Xu! Bạn có {balance:,} Xu.")
    # Trừ nguyên tử (chống race) → cộng cho người nhận → ghi sổ 2 chiều
    affected = db_updater.update(
        "UPDATE players SET xu = xu - %s WHERE user_id=%s AND xu >= %s",
        (body.amount, uid, body.amount))
    if not affected:
        raise HTTPException(status_code=400, detail="Không đủ Xu!")
    db_inserter.insert("INSERT IGNORE INTO players (user_id) VALUES (%s)", (to_id,))
    db_updater.update("UPDATE players SET xu = xu + %s WHERE user_id=%s",
                      (body.amount, to_id))
    note = (body.note or "").strip()[:200] or "Tặng Xu"
    db_updater.update(
        "INSERT INTO xu_transactions (user_id, kind, xu, ref, note) VALUES (%s,'gift_send',%s,%s,%s)",
        (uid, -body.amount, f"to:{body.to_username}", note))
    db_updater.update(
        "INSERT INTO xu_transactions (user_id, kind, xu, ref, note) VALUES (%s,'gift_recv',%s,%s,%s)",
        (to_id, body.amount,
         f"from:{current_user.get('username', uid)}", note))
    return {"status": "success",
            "message": f"🎁 Đã tặng {body.amount:,} Xu cho @{body.to_username}!",
            "xu": XS.get_xu(uid)}


# ==========================================
# 📒 SỔ GIAO DỊCH
# ==========================================
@router.get(U.XU["HISTORY"])
def xu_history(current_user: dict = Depends(get_current_user)):
    uid = current_user.get("user_id")
    rows = db_executor.select_as_list_dict(
        "SELECT kind, xu, vnd, note, created_at FROM xu_transactions "
        "WHERE user_id=%s ORDER BY id DESC LIMIT 20", (uid,))
    out = []
    for r in rows:
        out.append({
            "kind": r["kind"], "xu": r["xu"], "vnd": r.get("vnd") or 0,
            "note": r.get("note"),
            "created_at": str(r["created_at"]) if r.get("created_at") else None,
        })
    return {"status": "success", "data": {"xu": XS.get_xu(uid), "history": out}}
