# -*- coding: utf-8 -*-
"""
💾 SCAN DUNG LƯỢNG — tích hợp từ scripts/scan_sizes.py vào hệ thống.
Dùng bởi bot Telegram: lệnh /scan
"""
import os
import datetime

SKIP_DIRS = {".git", "node_modules", "dist", "__pycache__", ".vite", ".venv"}


def format_size(size_bytes: float) -> str:
    """bytes -> KB/MB/GB dễ đọc."""
    if size_bytes == 0:
        return "0 B"
    size_name = ("B", "KB", "MB", "GB", "TB")
    i = 0
    while size_bytes >= 1024 and i < len(size_name) - 1:
        size_bytes /= 1024.0
        i += 1
    return f"{size_bytes:.2f} {size_name[i]}"


def _root() -> str:
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def size_report(limit: int = 12) -> str:
    """Báo cáo dung lượng gọn cho Telegram (top file nặng)."""
    root = _root()
    file_list, total, count = [], 0, 0
    for cur, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in files:
            p = os.path.join(cur, f)
            try:
                if os.path.exists(p) and not os.path.islink(p):
                    sz = os.path.getsize(p)
                    file_list.append((os.path.relpath(p, root), sz))
                    total += sz
                    count += 1
            except OSError:
                pass
    file_list.sort(key=lambda x: x[1], reverse=True)
    lines = [
        "💾 <b>BÁO CÁO DUNG LƯỢNG HỆ THỐNG</b>",
        f"⏰ {datetime.datetime.now().strftime('%d/%m %H:%M')}",
        f"📦 Tổng: <b>{format_size(total)}</b> • {count} file",
        "🔥 Top file nặng:",
    ]
    for path, sz in file_list[:limit]:
        lines.append(f"• <code>{format_size(sz):>10}</code> | {path}")
    return "\n".join(lines)
