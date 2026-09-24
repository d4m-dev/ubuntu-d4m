# -*- coding: utf-8 -*-
"""
============================================================
🪙 XU SERVICE — Nhiệm vụ kiếm Xu · Mua Xu (PayOS) · Tặng Xu
============================================================
Bảng:
  • xu_transactions  — sổ giao dịch Xu (task/buy/gift_send/gift_recv)
  • xu_task_done     — đánh dấu nhiệm vụ đã hoàn thành theo ngày

Nhiệm vụ hằng ngày (tự kiểm tra điều kiện trong DB):
  checkin       Điểm danh            +5.000 Xu
  first_post    Đăng bài đầu tiên    +10.000 Xu
  first_comment Bình luận đầu tiên   +3.000 Xu
"""
import time
import logging

# ==========================================
# 📋 DANH SÁCH NHIỆM VỤ + GÓI NẠP XU
# ==========================================
XU_TASKS = [
    {"key": "checkin",       "icon": "🌅", "label": "Điểm danh hằng ngày",
     "desc": "Ghé thăm giang hồ mỗi ngày", "reward": 5000},
    {"key": "first_post",    "icon": "📜", "label": "Đăng bài đầu tiên trong ngày",
     "desc": "Viết một bài đăng mới hôm nay", "reward": 10000},
    {"key": "first_comment", "icon": "💬", "label": "Bình luận đầu tiên trong ngày",
     "desc": "Để lại một bình luận hôm nay", "reward": 3000},
]

XU_PACKAGES = [
    {"id": "goi-nho",   "icon": "🪙", "name": "Gói Tiểu Đồng",   "vnd": 10000,  "xu": 50000},
    {"id": "goi-vua",   "icon": "💰", "name": "Gói Đệ Tử",       "vnd": 20000,  "xu": 120000},
    {"id": "goi-lon",   "icon": "🏮", "name": "Gói Trưởng Lão",  "vnd": 50000,  "xu": 350000},
    {"id": "goi-khung", "icon": "🐉", "name": "Gói Tông Chủ",    "vnd": 100000, "xu": 800000},
]

MIN_GIFT = 1000


def ensure_xu_schema():
    """Tạo bảng giao dịch Xu (idempotent, chạy cả MySQL lẫn MariaDB)."""
    try:
        from core.database import db_updater
        db_updater.update("""CREATE TABLE IF NOT EXISTS `xu_transactions` (
            `id`         BIGINT       NOT NULL AUTO_INCREMENT,
            `user_id`    INT          NOT NULL,
            `kind`       VARCHAR(20)  NOT NULL,
            `xu`         INT          NOT NULL DEFAULT 0,
            `vnd`        INT          NOT NULL DEFAULT 0,
            `ref`        VARCHAR(120) DEFAULT NULL,
            `note`       VARCHAR(255) DEFAULT NULL,
            `created_at` TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `idx_xu_user` (`user_id`),
            KEY `idx_xu_ref` (`ref`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci""")
        db_updater.update("""CREATE TABLE IF NOT EXISTS `xu_task_done` (
            `user_id`   INT         NOT NULL,
            `task_key`  VARCHAR(40) NOT NULL,
            `done_date` DATE        NOT NULL,
            PRIMARY KEY (`user_id`, `task_key`, `done_date`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci""")
    except Exception as e:
        logging.warning(f"🪙 ensure_xu_schema: {e}")


def get_xu(user_id: int) -> int:
    from core.database import db_executor
    rows = db_executor.select_as_list_dict(
        "SELECT xu FROM players WHERE user_id=%s", (user_id,))
    return int(rows[0]["xu"]) if rows else 0


def credit_xu(user_id: int, amount: int, kind: str, ref: str = None, note: str = None,
              vnd: int = 0) -> bool:
    """Cộng Xu + ghi sổ giao dịch. Trả False nếu user chưa có ví."""
    from core.database import db_updater
    affected = db_updater.update(
        "UPDATE players SET xu = xu + %s WHERE user_id=%s", (amount, user_id))
    if not affected:
        return False
    db_updater.update(
        "INSERT INTO xu_transactions (user_id, kind, xu, vnd, ref, note) VALUES (%s,%s,%s,%s,%s,%s)",
        (user_id, kind, amount, vnd, ref, note))
    return True


# ==========================================
# ✅ KIỂM TRA ĐIỀU KIỆN NHIỆM VỤ
# ==========================================
def task_completed(user_id: int, task_key: str) -> bool:
    from core.database import db_executor
    if task_key == "checkin":
        return True  # điểm danh luôn hợp lệ (1 lần/ngày do xu_task_done chặn)
    if task_key == "first_post":
        rows = db_executor.select_as_list_dict(
            "SELECT id FROM posts WHERE user_id=%s AND DATE(created_at)=CURDATE() LIMIT 1",
            (user_id,))
        return bool(rows)
    if task_key == "first_comment":
        rows = db_executor.select_as_list_dict(
            "SELECT id FROM post_comments WHERE user_id=%s AND DATE(created_at)=CURDATE() LIMIT 1",
            (user_id,))
        return bool(rows)
    return False


def task_done_today(user_id: int, task_key: str) -> bool:
    from core.database import db_executor
    rows = db_executor.select_as_list_dict(
        "SELECT 1 AS ok FROM xu_task_done WHERE user_id=%s AND task_key=%s AND done_date=CURDATE()",
        (user_id, task_key))
    return bool(rows)


def claim_task(user_id: int, task_key: str):
    """Nhận thưởng nhiệm vụ. Trả (ok, message)."""
    from core.database import db_inserter
    task = next((t for t in XU_TASKS if t["key"] == task_key), None)
    if not task:
        return False, "Nhiệm vụ không tồn tại."
    if task_done_today(user_id, task_key):
        return False, "Hôm nay đạo hữu đã nhận nhiệm vụ này rồi!"
    if not task_completed(user_id, task_key):
        return False, f"Chưa đủ điều kiện: {task['desc']}."
    # Đánh dấu + thưởng (INSERT IGNORE chống nhận đúp race condition)
    inserted = db_inserter.insert(
        "INSERT IGNORE INTO xu_task_done (user_id, task_key, done_date) VALUES (%s,%s,CURDATE())",
        (user_id, task_key))
    if not inserted:
        return False, "Hôm nay đạo hữu đã nhận nhiệm vụ này rồi!"
    if not credit_xu(user_id, task["reward"], "task", ref=task_key, note=task["label"]):
        return False, "Chưa có ví Xu — hãy vào Social Hub một lần."
    # 🧘 nhiệm vụ cũng sinh tu vi
    try:
        from services.cultivation_service import gain_cultivation
        TU_VI_OF = {"checkin": 500, "first_post": 1000, "first_comment": 300}
        gain_cultivation(user_id, TU_VI_OF.get(task_key, 300))
    except Exception:
        pass
    return True, f"🎉 Hoàn thành «{task['label']}» +{task['reward']:,} Xu!"


# ==========================================
# 💳 MUA XU QUA PAYOS
# ==========================================
def new_order_code() -> int:
    return int(time.time() * 1000) % 10_000_000_000


def find_pending_buy(order_code: str):
    from core.database import db_executor
    rows = db_executor.select_as_list_dict(
        "SELECT id, user_id, xu, vnd, note FROM xu_transactions "
        "WHERE ref=%s AND kind='buy' AND note='pending' LIMIT 1", (str(order_code),))
    return rows[0] if rows else None


def finalize_buy(order_code: str, trans_id: str = None):
    """Xác nhận thanh toán PayOS → cộng Xu. 1 đơn = 1 dòng giao dịch (không ghi trùng)."""
    from core.database import db_updater
    row = find_pending_buy(order_code)
    if not row:
        return None  # đã xử lý hoặc không tồn tại
    # Đánh dấu THÀNH CÔNG trên chính dòng 'buy' (chống đúp) rồi cộng Xu
    affected = db_updater.update(
        "UPDATE xu_transactions SET note=%s WHERE id=%s AND note='pending'",
        (f"success|Nạp {row['xu']:,} Xu ({row['vnd']:,}đ)", row["id"]))
    if not affected:
        return None
    db_updater.update("UPDATE players SET xu = xu + %s WHERE user_id=%s",
                      (row["xu"], row["user_id"]))
    return row
