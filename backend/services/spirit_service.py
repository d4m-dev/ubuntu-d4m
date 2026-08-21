# -*- coding: utf-8 -*-
"""
============================================================
🐉💎 SPIRIT SERVICE — mảnh SQL + formatter dùng chung
cho feed, DM, bình luận, profile (tránh lặp code).
============================================================
Cách dùng trong câu SELECT (alias bảng users là `u`):
    SELECT ..., {SPIRIT_SELECT_SQL} FROM ...
Kết quả mỗi row có thêm: equipped_pet, equipped_treasure,
    pet_image, pet_name, pet_rarity, treasure_image, treasure_name, treasure_rarity
"""

RARITY_LABEL = {
    "common": "Thường",
    "rare": "Hiếm",
    "epic": "Sử thi",
    "legendary": "Huyền thoại",
}

# Mảnh SELECT — yêu cầu bảng users có alias `u`
SPIRIT_SELECT_SQL = """
    u.equipped_pet, u.equipped_treasure,
    (SELECT si.image  FROM spirit_items si WHERE si.id = u.equipped_pet)      AS pet_image,
    (SELECT si.name   FROM spirit_items si WHERE si.id = u.equipped_pet)      AS pet_name,
    (SELECT si.rarity FROM spirit_items si WHERE si.id = u.equipped_pet)      AS pet_rarity,
    (SELECT si.image  FROM spirit_items si WHERE si.id = u.equipped_treasure) AS treasure_image,
    (SELECT si.name   FROM spirit_items si WHERE si.id = u.equipped_treasure) AS treasure_name,
    (SELECT si.rarity FROM spirit_items si WHERE si.id = u.equipped_treasure) AS treasure_rarity
"""

# Mảnh SELECT "rỗng" — dùng khi DB CHƯA có bảng/cột linh vật,
# để feed / DM / profile KHÔNG BAO GIỜ gãy vì thiếu schema.
_SPIRIT_NULL_SQL = """
    NULL AS equipped_pet, NULL AS equipped_treasure,
    NULL AS pet_image, NULL AS pet_name, NULL AS pet_rarity,
    NULL AS treasure_image, NULL AS treasure_name, NULL AS treasure_rarity
"""

# ============================================================
# 🩺 THĂM DÒ SCHEMA (cache 1 lần / process)
# ============================================================
_SPIRIT_OK = None

def spirit_schema_ok(refresh: bool = False) -> bool:
    """True khi users có 2 cột equipped_* VÀ 2 bảng spirit_* tồn tại."""
    global _SPIRIT_OK
    if _SPIRIT_OK is None or refresh:
        try:
            from core.database import db_executor
            cols = db_executor.select_as_list_dict(
                "SELECT COLUMN_NAME FROM information_schema.COLUMNS "
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='users' "
                "AND COLUMN_NAME IN ('equipped_pet','equipped_treasure')")
            tables = db_executor.select_as_list_dict(
                "SELECT TABLE_NAME FROM information_schema.TABLES "
                "WHERE TABLE_SCHEMA = DATABASE() "
                "AND TABLE_NAME IN ('spirit_items','user_spirit_items')")
            _SPIRIT_OK = len(cols) == 2 and len(tables) == 2
        except Exception:
            _SPIRIT_OK = False
    return bool(_SPIRIT_OK)


def spirit_select_sql() -> str:
    """Trả mảnh SELECT phù hợp schema hiện tại (auto-degrade an toàn)."""
    return SPIRIT_SELECT_SQL if spirit_schema_ok() else _SPIRIT_NULL_SQL


# ============================================================
# 🛠️ MIGRATION TƯƠNG THÍCH CẢ MySQL LẪN MariaDB
# (ALTER ... ADD COLUMN IF NOT EXISTS chỉ MariaDB hiểu — ở đây
#  ta kiểm tra information_schema rồi ALTER thường, chạy được cả hai)
# ============================================================
def ensure_spirit_schema() -> bool:
    try:
        from core.database import db_executor, db_updater
        db_updater.update("""CREATE TABLE IF NOT EXISTS `spirit_items` (
            `id` VARCHAR(50) NOT NULL, `kind` ENUM('pet','treasure') NOT NULL,
            `name` VARCHAR(150) NOT NULL, `description` VARCHAR(255) DEFAULT NULL,
            `image` VARCHAR(255) NOT NULL, `rarity` VARCHAR(20) NOT NULL DEFAULT 'common',
            `price_xu` INT NOT NULL DEFAULT 0, `zorder` INT NOT NULL DEFAULT 0,
            PRIMARY KEY (`id`), KEY `idx_kind` (`kind`))
            ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci""")
        db_updater.update("""CREATE TABLE IF NOT EXISTS `user_spirit_items` (
            `user_id` INT NOT NULL, `item_id` VARCHAR(50) NOT NULL,
            `acquired_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`user_id`, `item_id`))
            ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci""")
        cols = {r["COLUMN_NAME"] for r in db_executor.select_as_list_dict(
            "SELECT COLUMN_NAME FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='users' "
            "AND COLUMN_NAME IN ('equipped_pet','equipped_treasure')")}
        if "equipped_pet" not in cols:
            db_updater.update("ALTER TABLE `users` ADD COLUMN `equipped_pet` VARCHAR(50) DEFAULT NULL")
        if "equipped_treasure" not in cols:
            db_updater.update("ALTER TABLE `users` ADD COLUMN `equipped_treasure` VARCHAR(50) DEFAULT NULL")
    except Exception as e:
        import logging
        logging.warning(f"🐉 ensure_spirit_schema: {e}")
    ok = spirit_schema_ok(refresh=True)
    print(f"🐉 [Spirit] Schema OK: {ok}")
    return ok


def spirit_payload(row: dict) -> dict:
    """Ép phần Linh thú/Linh bảo của 1 DB row thành JSON gọn cho frontend."""
    def _one(prefix: str):
        if not row.get(f"equipped_{prefix}") or not row.get(f"{prefix}_image"):
            return None
        rarity = row.get(f"{prefix}_rarity") or "common"
        return {
            "id": row[f"equipped_{prefix}"],
            "image": row[f"{prefix}_image"],
            "name": row.get(f"{prefix}_name"),
            "rarity": rarity,
            "rarity_label": RARITY_LABEL.get(rarity, "Thường"),
        }
    return {"pet": _one("pet"), "treasure": _one("treasure")}


# ============================================================
# 🔄 SYNC DANH MỤC TỪ FILE MANIFEST (backend/assets/spirit_items.json)
# Gọi 1 lần khi backend khởi động: thêm MỚI / cập nhật thông tin vật phẩm
# mà KHÔNG cần sửa code hay chạy SQL tay.
# ============================================================
def sync_catalog_from_manifest(base_dir: str = None) -> int:
    import os, json, logging
    if base_dir is None:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(base_dir, "assets", "spirit_items.json")
    if not os.path.exists(path):
        return 0
    try:
        data = json.load(open(path, encoding="utf-8")).get("data", [])
    except Exception as e:
        logging.error(f"🐉 spirit_items.json lỗi: {e}")
        return 0

    from core.database import db_inserter
    n = 0
    for it in data:
        if not it.get("id") or not it.get("image"):
            continue
        db_inserter.insert(
            """INSERT INTO spirit_items (id, kind, name, description, image, rarity, price_xu, zorder)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
               ON DUPLICATE KEY UPDATE
                 kind=VALUES(kind), name=VALUES(name), description=VALUES(description),
                 image=VALUES(image), rarity=VALUES(rarity), price_xu=VALUES(price_xu), zorder=VALUES(zorder)""",
            (it["id"], it.get("kind", "treasure"), it.get("name", it["id"]),
             it.get("description") or "", it["image"], it.get("rarity", "common"),
             int(it.get("price_xu") or 0), int(it.get("zorder") or 0)))
        n += 1
    print(f"🐉 [Spirit] Đã đồng bộ {n} Linh thú/Linh bảo từ spirit_items.json vào DB.")
    return n

