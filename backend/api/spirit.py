# -*- coding: utf-8 -*-
"""
============================================================
🐉💎 D4M SPIRIT — LINH THÚ & LINH BẢO (Social Hub)
============================================================
- GET  /api/social/spirits/catalog      : Danh mục toàn bộ Linh thú + Linh bảo
- GET  /api/social/spirits/me           : Kho đồ đã sở hữu + trang bị + số Xu
- POST /api/social/spirits/buy          : Mua vật phẩm bằng Xu (players.xu)
- POST /api/social/spirits/equip        : Trang bị vật phẩm đã sở hữu
- POST /api/social/spirits/unequip      : Tháo trang bị (kind: pet | treasure)
- POST /api/social/spirits/admin/grant  : Admin tặng vật phẩm cho user

Thêm vật phẩm mới:
  1. Thả ảnh vào  backend/assets/pets/  hoặc  backend/assets/treasures/
  2. INSERT INTO spirit_items (...) — hoặc tặng qua admin/grant
============================================================
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core import urls as U
from core.database import db_executor, db_inserter, db_updater
from services.sso_service import verify_admin
from api.social import get_current_user  # 🔒 tái dùng bộ lọc token + kiểm tra active

router = APIRouter(prefix=U.SPIRIT["PREFIX"], tags=["Spirit — Linh thú & Linh bảo"])

RARITY_LABEL = {
    "common": "Thường",
    "rare": "Hiếm",
    "epic": "Sử thi",
    "legendary": "Huyền thoại",
}


# ==========================================
# 📦 SCHEMAS
# ==========================================
class BuyRequest(BaseModel):
    item_id: str


class EquipRequest(BaseModel):
    item_id: str


class UnequipRequest(BaseModel):
    kind: str  # "pet" | "treasure"


class GrantRequest(BaseModel):
    user_id: int
    item_id: str


# ==========================================
# 🧰 HÀM HỖ TRỢ
# ==========================================
def _item_by_id(item_id: str) -> dict:
    rows = db_executor.select_as_list_dict(
        "SELECT id, kind, name, description, image, rarity, price_xu, zorder "
        "FROM spirit_items WHERE id=%s", (item_id,))
    return rows[0] if rows else None


def _with_rarity_label(item: dict) -> dict:
    item["rarity_label"] = RARITY_LABEL.get(item.get("rarity"), "Thường")
    return item


def _get_xu(user_id: int) -> int:
    rows = db_executor.select_as_list_dict(
        "SELECT xu FROM players WHERE user_id=%s", (user_id,))
    return int(rows[0]["xu"]) if rows else 0


def _ensure_player(user_id: int):
    """Tạo hồ sơ game nếu chưa có (để có ví Xu)."""
    db_inserter.insert("INSERT IGNORE INTO players (user_id) VALUES (%s)", (user_id,))


# ==========================================
# 📚 DANH MỤC (CATALOG)
# ==========================================
@router.get(U.SPIRIT["CATALOG"])
def get_catalog(current_user: dict = Depends(get_current_user)):
    """Danh mục toàn bộ Linh thú + Linh bảo (kèm trạng thái sở hữu của người gọi)."""
    uid = current_user.get("user_id")
    items = db_executor.select_as_list_dict(
        "SELECT id, kind, name, description, image, rarity, price_xu, zorder "
        "FROM spirit_items ORDER BY kind ASC, zorder DESC, id ASC")
    owned = {r["item_id"] for r in db_executor.select_as_list_dict(
        "SELECT item_id FROM user_spirit_items WHERE user_id=%s", (uid,))}
    equipped = db_executor.select_as_list_dict(
        "SELECT equipped_pet, equipped_treasure FROM users WHERE id=%s", (uid,))
    eq = equipped[0] if equipped else {}

    data = []
    for it in items:
        it = _with_rarity_label(dict(it))
        it["owned"] = it["id"] in owned
        it["equipped"] = (it["id"] == eq.get("equipped_pet")
                          or it["id"] == eq.get("equipped_treasure"))
        data.append(it)
    return {"status": "success", "data": data}


# ==========================================
# 🎒 KHO ĐỒ CỦA TÔI
# ==========================================
@router.get(U.SPIRIT["ME"])
def get_my_spirits(current_user: dict = Depends(get_current_user)):
    """Kho đồ đã sở hữu + trang bị hiện tại + số Xu."""
    uid = current_user.get("user_id")
    eq_rows = db_executor.select_as_list_dict(
        "SELECT equipped_pet, equipped_treasure FROM users WHERE id=%s", (uid,))
    eq = eq_rows[0] if eq_rows else {"equipped_pet": None, "equipped_treasure": None}

    owned = db_executor.select_as_list_dict(
        "SELECT si.id, si.kind, si.name, si.description, si.image, si.rarity, "
        "       si.price_xu, usi.acquired_at "
        "FROM user_spirit_items usi "
        "JOIN spirit_items si ON si.id = usi.item_id "
        "WHERE usi.user_id=%s ORDER BY si.kind ASC, si.zorder DESC", (uid,))

    return {
        "status": "success",
        "data": {
            "xu": _get_xu(uid),
            "equipped_pet": eq.get("equipped_pet"),
            "equipped_treasure": eq.get("equipped_treasure"),
            "items": [_with_rarity_label(dict(r)) for r in owned],
        },
    }


# ==========================================
# 🛒 MUA VẬT PHẨM (bằng Xu)
# ==========================================
@router.post(U.SPIRIT["BUY"])
def buy_item(body: BuyRequest, current_user: dict = Depends(get_current_user)):
    uid = current_user.get("user_id")
    item = _item_by_id(body.item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Linh vật không tồn tại trong bảo khố.")

    already = db_executor.select_as_list_dict(
        "SELECT item_id FROM user_spirit_items WHERE user_id=%s AND item_id=%s",
        (uid, body.item_id))
    if already:
        raise HTTPException(status_code=400, detail="Bạn đã sở hữu linh vật này rồi!")

    price = int(item.get("price_xu") or 0)
    _ensure_player(uid)

    if price > 0:
        # Trừ Xu nguyên tử: chỉ UPDATE khi đủ tiền (chống race condition)
        affected = db_updater.update(
            "UPDATE players SET xu = xu - %s WHERE user_id=%s AND xu >= %s",
            (price, uid, price))
        if not affected:
            raise HTTPException(
                status_code=400,
                detail=f"Không đủ Xu! Cần {price:,} Xu, bạn hiện có {_get_xu(uid):,} Xu.")

    db_inserter.insert(
        "INSERT IGNORE INTO user_spirit_items (user_id, item_id) VALUES (%s, %s)",
        (uid, body.item_id))

    return {
        "status": "success",
        "message": f"🎉 Đã thu phục {item['name']}!",
        "xu": _get_xu(uid),
    }


# ==========================================
# ⚔️ TRANG BỊ / THÁO TRANG BỊ
# ==========================================
@router.post(U.SPIRIT["EQUIP"])
def equip_item(body: EquipRequest, current_user: dict = Depends(get_current_user)):
    uid = current_user.get("user_id")
    item = _item_by_id(body.item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Linh vật không tồn tại trong bảo khố.")

    owned = db_executor.select_as_list_dict(
        "SELECT item_id FROM user_spirit_items WHERE user_id=%s AND item_id=%s",
        (uid, body.item_id))
    if not owned:
        raise HTTPException(status_code=403, detail="Bạn chưa sở hữu linh vật này. Hãy mua hoặc xin Admin tặng!")

    column = "equipped_pet" if item["kind"] == "pet" else "equipped_treasure"
    db_updater.update(f"UPDATE users SET {column}=%s WHERE id=%s", (body.item_id, uid))

    return {
        "status": "success",
        "message": f"✨ Đã trang bị {item['name']}!",
        "kind": item["kind"],
        "equipped": body.item_id,
    }


@router.post(U.SPIRIT["UNEQUIP"])
def unequip_item(body: UnequipRequest, current_user: dict = Depends(get_current_user)):
    uid = current_user.get("user_id")
    if body.kind not in ("pet", "treasure"):
        raise HTTPException(status_code=400, detail="Loại trang bị không hợp lệ (pet|treasure).")
    column = "equipped_pet" if body.kind == "pet" else "equipped_treasure"
    db_updater.update(f"UPDATE users SET {column}=NULL WHERE id=%s", (uid,))
    return {"status": "success", "message": "Đã tháo trang bị.", "kind": body.kind}


# ==========================================
# 👑 ADMIN TẶNG VẬT PHẨM
# ==========================================
@router.post(U.SPIRIT["ADMIN_GRANT"])
def admin_grant(body: GrantRequest, auth_data: tuple = Depends(verify_admin)):
    target = db_executor.select_as_list_dict(
        "SELECT id FROM users WHERE id=%s", (body.user_id,))
    if not target:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại.")
    item = _item_by_id(body.item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Linh vật không tồn tại trong bảo khố.")

    db_inserter.insert(
        "INSERT IGNORE INTO user_spirit_items (user_id, item_id) VALUES (%s, %s)",
        (body.user_id, body.item_id))
    return {"status": "success", "message": f"Đã tặng {item['name']} cho user #{body.user_id}."}
