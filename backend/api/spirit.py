# -*- coding: utf-8 -*-
"""
============================================================
🐉💎 D4M SPIRIT v2 — 7 SLOT TRANG BỊ (Social Hub)
============================================================
- GET  /api/social/spirits/catalog      : Danh mục toàn bộ vật phẩm (7 loại)
- GET  /api/social/spirits/me           : Kho đồ đã sở hữu + trang bị + số Xu
- POST /api/social/spirits/buy          : Mua vật phẩm bằng Xu (players.xu)
- POST /api/social/spirits/equip        : Trang bị vật phẩm đã sở hữu
- POST /api/social/spirits/unequip      : Tháo trang bị (kind: frame|pet|treasure|title|ring|dharma|sect)
- POST /api/social/spirits/admin/grant  : Admin tặng vật phẩm cho user

7 loại vật phẩm (kind):
    frame (khung viền) · pet (linh thú) · treasure (linh bảo) ·
    title (danh hiệu)  · ring (nhẫn)     · dharma (pháp tướng) · sect (tông môn)

Nguồn dữ liệu: backend/assets_manifest.json (sinh bởi scripts/gen_assets_manifest.py)
Ảnh phục vụ tại /assets/<danh-mục>/<file> (mount trong api/server.py)
============================================================
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core import urls as U
from core.database import db_executor, db_inserter, db_updater
from services.sso_service import verify_admin
from services.spirit_service import EQUIP_SLOTS
from api.social import get_current_user  # 🔒 tái dùng bộ lọc token + kiểm tra active

router = APIRouter(prefix=U.SPIRIT["PREFIX"], tags=["Spirit — 7 slot trang bị"])

RARITY_LABEL = {
    "common": "Thường",
    "rare": "Hiếm",
    "epic": "Sử thi",
    "legendary": "Huyền thoại",
}

# Thứ tự hiển thị tab ngoài frontend
KIND_ORDER = {"frame": 0, "pet": 1, "treasure": 2, "dharma": 3,
              "title": 4, "ring": 5, "sect": 6}


# ==========================================
# 📦 SCHEMAS
# ==========================================
class BuyRequest(BaseModel):
    item_id: str


class EquipRequest(BaseModel):
    item_id: str


class UnequipRequest(BaseModel):
    kind: str  # frame|pet|treasure|title|ring|dharma|sect


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


def _equipped_map(uid: int) -> dict:
    """{kind: item_id} của 7 slot."""
    cols = ", ".join(EQUIP_SLOTS.values())
    rows = db_executor.select_as_list_dict(
        f"SELECT {cols} FROM users WHERE id=%s", (uid,))
    row = rows[0] if rows else {}
    return {kind: row.get(col) for kind, col in EQUIP_SLOTS.items()}


# ==========================================
# 📚 DANH MỤC (CATALOG)
# ==========================================
@router.get(U.SPIRIT["CATALOG"])
def get_catalog(current_user: dict = Depends(get_current_user)):
    """Danh mục toàn bộ vật phẩm 7 loại (kèm trạng thái sở hữu/trang bị)."""
    uid = current_user.get("user_id")
    items = db_executor.select_as_list_dict(
        "SELECT id, kind, name, description, image, rarity, price_xu, zorder "
        "FROM spirit_items ORDER BY zorder DESC, id ASC")
    owned = {r["item_id"] for r in db_executor.select_as_list_dict(
        "SELECT item_id FROM user_spirit_items WHERE user_id=%s", (uid,))}
    eq = _equipped_map(uid)
    equipped_ids = {v for v in eq.values() if v}

    data = []
    for it in items:
        it = _with_rarity_label(dict(it))
        it["owned"] = it["id"] in owned
        it["equipped"] = it["id"] in equipped_ids
        it["slot"] = it["kind"]  # alias dễ đọc cho frontend
        data.append(it)
    data.sort(key=lambda x: (KIND_ORDER.get(x["kind"], 99), x["id"]))
    return {"status": "success", "data": data, "equipped": eq}


# ==========================================
# 🎒 KHO ĐỒ CỦA TÔI
# ==========================================
@router.get(U.SPIRIT["ME"])
def get_my_spirits(current_user: dict = Depends(get_current_user)):
    """Kho đồ đã sở hữu + 7 slot trang bị + số Xu."""
    uid = current_user.get("user_id")
    eq = _equipped_map(uid)

    owned = db_executor.select_as_list_dict(
        "SELECT si.id, si.kind, si.name, si.description, si.image, si.rarity, "
        "       si.price_xu, usi.acquired_at "
        "FROM user_spirit_items usi "
        "JOIN spirit_items si ON si.id = usi.item_id "
        "WHERE usi.user_id=%s ORDER BY si.zorder DESC", (uid,))

    payload = {
        "xu": _get_xu(uid),
        "equipped": eq,
        # tương thích ngược
        "equipped_pet": eq.get("pet"),
        "equipped_treasure": eq.get("treasure"),
        "items": [_with_rarity_label(dict(r)) for r in owned],
    }
    return {"status": "success", "data": payload}


# ==========================================
# 🛒 MUA VẬT PHẨM (bằng Xu)
# ==========================================
@router.post(U.SPIRIT["BUY"])
def buy_item(body: BuyRequest, current_user: dict = Depends(get_current_user)):
    uid = current_user.get("user_id")
    item = _item_by_id(body.item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Vật phẩm không tồn tại trong bảo khố.")

    already = db_executor.select_as_list_dict(
        "SELECT item_id FROM user_spirit_items WHERE user_id=%s AND item_id=%s",
        (uid, body.item_id))
    if already:
        raise HTTPException(status_code=400, detail="Bạn đã sở hữu vật phẩm này rồi!")

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
        raise HTTPException(status_code=404, detail="Vật phẩm không tồn tại trong bảo khố.")
    if item["kind"] not in EQUIP_SLOTS:
        raise HTTPException(status_code=400, detail="Vật phẩm này không thể trang bị.")

    owned = db_executor.select_as_list_dict(
        "SELECT item_id FROM user_spirit_items WHERE user_id=%s AND item_id=%s",
        (uid, body.item_id))
    if not owned:
        raise HTTPException(status_code=403, detail="Bạn chưa sở hữu vật phẩm này. Hãy mua hoặc xin Admin tặng!")

    column = EQUIP_SLOTS[item["kind"]]
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
    if body.kind not in EQUIP_SLOTS:
        valid = "|".join(EQUIP_SLOTS)
        raise HTTPException(status_code=400, detail=f"Loại trang bị không hợp lệ ({valid}).")
    column = EQUIP_SLOTS[body.kind]
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
        raise HTTPException(status_code=404, detail="Vật phẩm không tồn tại trong bảo khố.")

    db_inserter.insert(
        "INSERT IGNORE INTO user_spirit_items (user_id, item_id) VALUES (%s, %s)",
        (body.user_id, body.item_id))
    return {"status": "success", "message": f"Đã tặng {item['name']} cho user #{body.user_id}."}
