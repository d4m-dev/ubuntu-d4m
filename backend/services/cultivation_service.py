# -*- coding: utf-8 -*-
"""
============================================================
🧘 CULTIVATION SERVICE — HỆ THỐNG TU TIÊN (Phàm Nhân Tu Tiên)
============================================================
Nguồn dữ liệu cảnh giới: backend/assets/tu-vi/tu-vi-sys.json (50 realms)
Cơ chế:
  • Tu vi (cultivation/exp) kiếm qua: nhiệm vụ Xu, đả tọa, đan dược
  • Đột phá khi tu vi ≥ required_exp của realm kế tiếp (có thiên kiếp → hương vị)
  • Linh căn ngũ hành (kim/mộc/thủy/hỏa/thổ): chọn 1 lần, +10% tu vi
Cột bảng users: realm_index, cultivation, spirit_root, last_meditate
============================================================
"""
import os
import json
import logging
from datetime import datetime, timedelta

MEDITATE_COOLDOWN_MIN = 60
MEDITATE_EXP = 200
ROOT_BONUS = 0.10  # +10% tu vi khi đã chọn linh căn

ROOTS = [
    {"id": "kim",  "label": "Kim",  "image": "/assets/ngu-hanh/kim.png"},
    {"id": "moc",  "label": "Mộc",  "image": "/assets/ngu-hanh/moc.png"},
    {"id": "thuy", "label": "Thủy", "image": "/assets/ngu-hanh/thuy.png"},
    {"id": "hoa",  "label": "Hỏa",  "image": "/assets/ngu-hanh/hoa.png"},
    {"id": "tho",  "label": "Thổ",  "image": "/assets/ngu-hanh/tho.png"},
]

_REALMS = None
_REALMS_PATH = None


def _manifest_path() -> str:
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, "assets", "tu-vi", "tu-vi-sys.json")


def get_realms(refresh: bool = False):
    """Danh sách 50 cảnh giới, URL đã chuẩn hoá về /assets/tu-vi/..."""
    global _REALMS
    if _REALMS is None or refresh:
        try:
            data = json.load(open(_manifest_path(), encoding="utf-8"))
            base = "/assets/tu-vi"
            out = []
            for i, r in enumerate(data.get("realms", [])):
                rr = dict(r)
                rr["index"] = i
                for k in ("font_file", "bg_gif"):
                    v = rr.get(k) or ""
                    rr[k] = (base + v[1:]) if v.startswith("./") else v
                out.append(rr)
            _REALMS = out
        except Exception as e:
            logging.error(f"🧘 tu-vi-sys.json lỗi: {e}")
            _REALMS = []
    return _REALMS


def realm_of(index: int) -> dict:
    realms = get_realms()
    if not realms:
        return {}
    return realms[max(0, min(index or 0, len(realms) - 1))]


def ensure_cultivation_schema():
    try:
        from core.database import db_executor, db_updater
        cols = {r["COLUMN_NAME"] for r in db_executor.select_as_list_dict(
            "SELECT COLUMN_NAME FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='users' "
            "AND COLUMN_NAME IN ('realm_index','cultivation','spirit_root','last_meditate')")}
        if "realm_index" not in cols:
            db_updater.update("ALTER TABLE `users` ADD COLUMN `realm_index` INT NOT NULL DEFAULT 0")
        if "cultivation" not in cols:
            db_updater.update("ALTER TABLE `users` ADD COLUMN `cultivation` BIGINT NOT NULL DEFAULT 0")
        if "spirit_root" not in cols:
            db_updater.update("ALTER TABLE `users` ADD COLUMN `spirit_root` VARCHAR(20) DEFAULT NULL")
        if "last_meditate" not in cols:
            db_updater.update("ALTER TABLE `users` ADD COLUMN `last_meditate` DATETIME DEFAULT NULL")
        print("🧘 [Cultivation] Schema OK")
    except Exception as e:
        logging.warning(f"🧘 ensure_cultivation_schema: {e}")


def get_user_state(user_id: int) -> dict:
    from core.database import db_executor
    rows = db_executor.select_as_list_dict(
        "SELECT realm_index, cultivation, spirit_root, last_meditate FROM users WHERE id=%s",
        (user_id,))
    if not rows:
        return {"realm_index": 0, "cultivation": 0, "spirit_root": None, "last_meditate": None}
    r = rows[0]
    return {
        "realm_index": int(r.get("realm_index") or 0),
        "cultivation": int(r.get("cultivation") or 0),
        "spirit_root": r.get("spirit_root"),
        "last_meditate": r["last_meditate"],
    }


def gain_cultivation(user_id: int, amount: int) -> int:
    """Cộng tu vi (áp dụng bonus linh căn). Trả tổng mới."""
    from core.database import db_updater
    st = get_user_state(user_id)
    bonus = 1 + (ROOT_BONUS if st["spirit_root"] else 0)
    add = int(round(amount * bonus))
    db_updater.update("UPDATE users SET cultivation = cultivation + %s WHERE id=%s",
                      (add, user_id))
    return st["cultivation"] + add


# ==========================================
# 🧘 ĐẢ TỌA (cooldown 60 phút)
# ==========================================
def meditate(user_id: int):
    from core.database import db_updater, db_executor
    st = get_user_state(user_id)
    now = datetime.now()
    if st["last_meditate"]:
        last = st["last_meditate"]
        if isinstance(last, str):
            last = datetime.fromisoformat(last)
        if now - last < timedelta(minutes=MEDITATE_COOLDOWN_MIN):
            wait = int((timedelta(minutes=MEDITATE_COOLDOWN_MIN) - (now - last)).total_seconds() // 60) + 1
            return False, f"🕐 Linh khí chưa hồi — còn {wait} phút nữa mới đả tọa tiếp được."
    total = gain_cultivation(user_id, MEDITATE_EXP)
    db_updater.update("UPDATE users SET last_meditate=%s WHERE id=%s",
                      (now.strftime("%Y-%m-%d %H:%M:%S"), user_id))
    root = db_executor.select_as_list_dict("SELECT spirit_root FROM users WHERE id=%s", (user_id,))
    _ = root
    return True, f"🧘 Đả tọa thành công +{MEDITATE_EXP} tu vi! Tổng: {total:,}"


# ==========================================
# ⚡ ĐỘT PHÁ CẢNH GIỚI
# ==========================================
def try_breakthrough(user_id: int):
    from core.database import db_updater
    st = get_user_state(user_id)
    realms = get_realms()
    if not realms:
        return False, "Hệ thống cảnh giới chưa sẵn sàng."
    if st["realm_index"] >= len(realms) - 1:
        return False, "Đạo hữu đã đạt đỉnh phong — Đạo Tổ!"
    nxt = realms[st["realm_index"] + 1]
    if st["cultivation"] < nxt["required_exp"]:
        return False, (f"Chưa đủ tu vi! Cần {nxt['required_exp']:,} "
                       f"(hiện {st['cultivation']:,}).")
    db_updater.update("UPDATE users SET realm_index = realm_index + 1 WHERE id=%s", (user_id,))
    trib = (nxt.get("tribulation") or {}).get("name")
    msg = f"⚡ ĐỘT PHÁ! Đạo hữu thăng lên «{nxt['display_title']}»"
    if trib:
        msg += f" — vượt qua {trib}!"
    return True, msg


# ==========================================
# 🌱 CHỌN LINH CĂN (1 lần duy nhất)
# ==========================================
def choose_root(user_id: int, root_id: str):
    from core.database import db_updater
    if root_id not in {r["id"] for r in ROOTS}:
        return False, "Linh căn không tồn tại."
    st = get_user_state(user_id)
    if st["spirit_root"]:
        return False, "Đạo hữu đã định hình linh căn — không thể thay đổi!"
    db_updater.update("UPDATE users SET spirit_root=%s WHERE id=%s", (root_id, user_id))
    label = next(r["label"] for r in ROOTS if r["id"] == root_id)
    return True, f"🌱 Linh căn «{label}» đã thức tỉnh! +10% tu vi vĩnh viễn."


# ==========================================
# 💊 DÙNG ĐAN DƯỢC (tiêu hao vật phẩm luyện đan)
# ==========================================
def use_pill(user_id: int, item_id: str):
    from core.database import db_executor, db_updater
    rows = db_executor.select_as_list_dict(
        "SELECT si.id, si.name, si.rarity FROM user_spirit_items usi "
        "JOIN spirit_items si ON si.id = usi.item_id "
        "WHERE usi.user_id=%s AND usi.item_id=%s AND si.category='luyen-dan'",
        (user_id, item_id))
    if not rows:
        return False, "Đạo hữu không sở hữu đan dược này."
    item = rows[0]
    rarity = item.get("rarity") or "common"
    exp = {"common": 500, "rare": 2000, "epic": 8000, "legendary": 30000}.get(rarity, 500)
    db_updater.update("DELETE FROM user_spirit_items WHERE user_id=%s AND item_id=%s",
                      (user_id, item_id))
    total = gain_cultivation(user_id, exp)
    return True, f"💊 Đã luyện hóa «{item['name']}» +{exp:,} tu vi! Tổng: {total:,}"
