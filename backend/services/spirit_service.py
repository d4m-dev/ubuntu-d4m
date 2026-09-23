# -*- coding: utf-8 -*-
"""
============================================================
🐉💎 SPIRIT SERVICE v2 — mảnh SQL + formatter dùng chung
cho feed, DM, bình luận, profile (tránh lặp code).

7 slot trang bị (kind → cột trong bảng users):
    frame    → equipped_frame      (khung viền avatar)
    pet      → equipped_pet        (linh thú)
    treasure → equipped_treasure   (linh bảo)
    title    → equipped_title      (danh hiệu)
    ring     → equipped_ring       (nhẫn)
    dharma   → equipped_dharma     (pháp tướng)
    sect     → equipped_sect       (tông môn)
============================================================
Cách dùng trong câu SELECT (alias bảng users là `u`):
    SELECT ..., {spirit_select_sql()} FROM ...
Kết quả mỗi row có thêm: equipped_<slot> + <slot>_image/_name/_rarity
"""

RARITY_LABEL = {
    "common": "Thường",
    "rare": "Hiếm",
    "epic": "Sử thi",
    "legendary": "Huyền thoại",
}

# kind vật phẩm → cột trang bị trong bảng users
EQUIP_SLOTS = {
    "frame": "equipped_frame",
    "pet": "equipped_pet",
    "treasure": "equipped_treasure",
    "title": "equipped_title",
    "ring": "equipped_ring",
    "dharma": "equipped_dharma",
    "sect": "equipped_sect",
}

SLOT_FIELDS = ("frame", "pet", "treasure", "title", "ring", "dharma", "sect")

# Mảnh SELECT — yêu cầu bảng users có alias `u`
SPIRIT_SELECT_SQL = ",\n".join(
    ["u.realm_index", "u.spirit_root"]
    + [f"u.{EQUIP_SLOTS[s]}" for s in SLOT_FIELDS]
    + [
        f"(SELECT si.{f} FROM spirit_items si WHERE si.id = u.{EQUIP_SLOTS[s]}) AS {s}_{f}"
        for s in SLOT_FIELDS for f in ("image", "name", "rarity")
    ]
)

# Mảnh SELECT "rỗng" — dùng khi DB CHƯA có đủ schema linh vật,
# để feed / DM / profile KHÔNG BAO GIỜ gãy vì thiếu cột/bảng.
_SPIRIT_NULL_SQL = ",\n".join(
    ["NULL AS realm_index", "NULL AS spirit_root"]
    + [f"NULL AS {EQUIP_SLOTS[s]}" for s in SLOT_FIELDS]
    + [f"NULL AS {s}_{f}" for s in SLOT_FIELDS for f in ("image", "name", "rarity")]
)

# ============================================================
# 🩺 THĂM DÒ SCHEMA (cache 1 lần / process)
# ============================================================
_SPIRIT_OK = None


def spirit_schema_ok(refresh: bool = False) -> bool:
    """True khi users có đủ 7 cột equipped_* VÀ 2 bảng spirit_* tồn tại."""
    global _SPIRIT_OK
    if _SPIRIT_OK is None or refresh:
        try:
            from core.database import db_executor
            cols = db_executor.select_as_list_dict(
                "SELECT COLUMN_NAME FROM information_schema.COLUMNS "
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='users' "
                f"AND COLUMN_NAME IN ({','.join(repr(c) for c in list(EQUIP_SLOTS.values()) + ['realm_index'])})")
            tables = db_executor.select_as_list_dict(
                "SELECT TABLE_NAME FROM information_schema.TABLES "
                "WHERE TABLE_SCHEMA = DATABASE() "
                "AND TABLE_NAME IN ('spirit_items','user_spirit_items')")
            _SPIRIT_OK = len(cols) == len(EQUIP_SLOTS) + 1 and len(tables) == 2
        except Exception:
            _SPIRIT_OK = False
    return bool(_SPIRIT_OK)


def spirit_select_sql() -> str:
    """Trả mảnh SELECT phù hợp schema hiện tại (auto-degrade an toàn)."""
    return SPIRIT_SELECT_SQL if spirit_schema_ok() else _SPIRIT_NULL_SQL


# ============================================================
# 🛠️ MIGRATION TƯƠNG THÍCH CẢ MySQL LẪN MariaDB
# ============================================================
def ensure_spirit_schema() -> bool:
    try:
        from core.database import db_executor, db_updater
        db_updater.update("""CREATE TABLE IF NOT EXISTS `spirit_items` (
            `id` VARCHAR(80) NOT NULL, `kind` VARCHAR(20) NOT NULL DEFAULT 'treasure',
            `name` VARCHAR(150) NOT NULL, `description` VARCHAR(255) DEFAULT NULL,
            `image` VARCHAR(255) NOT NULL, `rarity` VARCHAR(20) NOT NULL DEFAULT 'common',
            `price_xu` INT NOT NULL DEFAULT 0, `zorder` INT NOT NULL DEFAULT 0,
            PRIMARY KEY (`id`), KEY `idx_kind` (`kind`))
            ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci""")
        db_updater.update("""CREATE TABLE IF NOT EXISTS `user_spirit_items` (
            `user_id` INT NOT NULL, `item_id` VARCHAR(80) NOT NULL,
            `acquired_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`user_id`, `item_id`))
            ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci""")

        # Nâng cấp cột kind: bản cũ là ENUM('pet','treasure') → VARCHAR(20)
        try:
            kind_type = db_executor.select_as_list_dict(
                "SELECT COLUMN_TYPE FROM information_schema.COLUMNS "
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='spirit_items' "
                "AND COLUMN_NAME='kind'")
            if kind_type and str(kind_type[0].get("COLUMN_TYPE", "")).lower().startswith("enum"):
                db_updater.update(
                    "ALTER TABLE `spirit_items` MODIFY `kind` VARCHAR(20) NOT NULL DEFAULT 'treasure'")
        except Exception:
            pass

        cols = {r["COLUMN_NAME"] for r in db_executor.select_as_list_dict(
            "SELECT COLUMN_NAME FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='users' "
            f"AND COLUMN_NAME IN ({','.join(repr(c) for c in list(EQUIP_SLOTS.values()) + ['realm_index','cultivation','spirit_root','last_meditate'])})")}
        for col in EQUIP_SLOTS.values():
            if col not in cols:
                db_updater.update(f"ALTER TABLE `users` ADD COLUMN `{col}` VARCHAR(80) DEFAULT NULL")
        # 🧘 cột hệ thống tu tiên
        if "realm_index" not in cols:
            db_updater.update("ALTER TABLE `users` ADD COLUMN `realm_index` INT NOT NULL DEFAULT 0")
        if "cultivation" not in cols:
            db_updater.update("ALTER TABLE `users` ADD COLUMN `cultivation` BIGINT NOT NULL DEFAULT 0")
        if "spirit_root" not in cols:
            db_updater.update("ALTER TABLE `users` ADD COLUMN `spirit_root` VARCHAR(20) DEFAULT NULL")
        if "last_meditate" not in cols:
            db_updater.update("ALTER TABLE `users` ADD COLUMN `last_meditate` DATETIME DEFAULT NULL")
    except Exception as e:
        import logging
        logging.warning(f"🐉 ensure_spirit_schema: {e}")
    ok = spirit_schema_ok(refresh=True)
    print(f"🐉 [Spirit] Schema OK (7 slot): {ok}")
    return ok


def spirit_payload(row: dict) -> dict:
    """Ép phần trang bị (7 slot) của 1 DB row thành JSON gọn cho frontend.

    Trả về: {"frame": {...}|None, "pet": ..., "treasure": ..., "title": ...,
             "ring": ..., "dharma": ..., "sect": ...}
    """
    out = {
        "realm_index": int(row.get("realm_index") or 0) if row.get("realm_index") is not None else 0,
        "spirit_root": row.get("spirit_root"),
    }
    for s in SLOT_FIELDS:
        item_id = row.get(EQUIP_SLOTS[s])
        image = row.get(f"{s}_image")
        if not item_id or not image:
            out[s] = None
            continue
        rarity = row.get(f"{s}_rarity") or "common"
        out[s] = {
            "id": item_id,
            "image": image,
            "name": row.get(f"{s}_name"),
            "rarity": rarity,
            "rarity_label": RARITY_LABEL.get(rarity, "Thường"),
        }
    return out


# ============================================================
# 🔄 SYNC DANH MỤC TỪ MANIFEST v2 (backend/assets_manifest.json)
# Gọi 1 lần khi backend khởi động: thêm MỚI / cập nhật vật phẩm,
# dọn item cũ không còn trong manifest, và migrate dữ liệu legacy.
# ============================================================
def sync_catalog_from_manifest(base_dir: str = None) -> int:
    import os, json, logging
    if base_dir is None:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(base_dir, "assets_manifest.json")
    if not os.path.exists(path):
        logging.warning("🐉 assets_manifest.json chưa có — bỏ qua sync catalog.")
        return 0
    try:
        manifest = json.load(open(path, encoding="utf-8"))
        data = manifest.get("data", [])
    except Exception as e:
        logging.error(f"🐉 assets_manifest.json lỗi: {e}")
        return 0

    from core.database import db_inserter, db_executor, db_updater
    n = 0
    valid_ids = []
    for it in data:
        if not it.get("id") or not it.get("image"):
            continue
        if not (it.get("equippable") or it.get("usable")):
            continue  # chỉ đưa vào cửa hàng item equip được hoặc đan dược
        db_inserter.insert(
            """INSERT INTO spirit_items (id, kind, name, description, image, rarity, price_xu, zorder)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
               ON DUPLICATE KEY UPDATE
                 kind=VALUES(kind), name=VALUES(name), description=VALUES(description),
                 image=VALUES(image), rarity=VALUES(rarity), price_xu=VALUES(price_xu), zorder=VALUES(zorder)""",
            (it["id"], it.get("kind", "treasure"), it.get("name", it["id"]),
             it.get("description") or "", it["image"], it.get("rarity", "common"),
             int(it.get("price_xu") or 0), int(it.get("zorder") or 0)))
        valid_ids.append(it["id"])
        n += 1

    # 🧹 Dọn vật phẩm cũ không còn trong manifest (tránh rác catalog)
    try:
        if valid_ids:
            existing = {r["id"] for r in db_executor.select_as_list_dict(
                "SELECT id FROM spirit_items")}
            stale = existing - set(valid_ids)
            if stale:
                db_updater.update(
                    f"DELETE FROM spirit_items WHERE id IN ({','.join(['%s'] * len(stale))})",
                    tuple(stale))
                db_updater.update(
                    f"DELETE FROM user_spirit_items WHERE item_id IN ({','.join(['%s'] * len(stale))})",
                    tuple(stale))
                print(f"🐉 [Spirit] Đã dọn {len(stale)} item cũ khỏi catalog.")
    except Exception as e:
        logging.warning(f"🐉 dọn catalog cũ: {e}")

    # 🔁 Migrate legacy: equipped_pet/treasure id cũ (không tiền tố) → id mới
    try:
        prefix_of = {"equipped_pet": "linh-thu-", "equipped_treasure": "linh-bao-"}
        for col, prefix in prefix_of.items():
            rows = db_executor.select_as_list_dict(
                f"SELECT id, {col} AS v FROM users WHERE {col} IS NOT NULL AND {col} NOT LIKE %s",
                (prefix + "%",))
            for r in rows:
                new_id = prefix + str(r["v"])
                hit = db_executor.select_as_list_dict(
                    "SELECT id FROM spirit_items WHERE id=%s", (new_id,))
                if hit:
                    db_updater.update(f"UPDATE users SET {col}=%s WHERE id=%s", (new_id, r["id"]))
        # 🖼️ Legacy avatar_frame (URL/filename) → equipped_frame theo manifest khung
        frame_rows = db_executor.select_as_list_dict(
            "SELECT id, avatar_frame FROM users WHERE avatar_frame IS NOT NULL "
            "AND avatar_frame != '' AND (equipped_frame IS NULL OR equipped_frame='')")
        import re
        khung_ids = {r["id"] for r in db_executor.select_as_list_dict(
            "SELECT id FROM spirit_items WHERE kind='frame'")}
        for r in frame_rows:
            fname = str(r["avatar_frame"]).rsplit("/", 1)[-1]
            slug = re.sub(r"\.[a-z0-9]+$", "", fname, flags=re.I).lower()
            cand = f"khung-{slug}"
            if cand in khung_ids:
                db_updater.update(
                    "UPDATE users SET equipped_frame=%s WHERE id=%s", (cand, r["id"]))
    except Exception as e:
        logging.warning(f"🐉 migrate legacy equip: {e}")

    print(f"🐉 [Spirit] Đã đồng bộ {n} vật phẩm (7 loại) từ assets_manifest.json vào DB.")
    return n
