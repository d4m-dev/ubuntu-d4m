# -*- coding: utf-8 -*-
"""
🛡️ BÁO CÁO BẢO MẬT — tích hợp từ scripts/gen_security_report.py.
Đọc semgrep_report.json (kết quả semgrep) -> tóm tắt cho Telegram.
Lệnh bot: /security
"""
import json
import os
from datetime import datetime


def _root() -> str:
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def security_summary(limit: int = 6) -> str:
    path = os.path.join(_root(), "semgrep_report.json")
    if not os.path.exists(path):
        return (
            "🛡️ <b>BÁO CÁO BẢO MẬT</b>\n"
            "💡 Chưa có <code>semgrep_report.json</code>.\n"
            "Tạo bằng:\n<code>semgrep scan --config auto backend --json > semgrep_report.json</code>"
        )
    try:
        with open(path, encoding="utf-8") as f:
            results = json.load(f).get("results", [])
    except Exception as e:
        return f"❌ Lỗi đọc báo cáo: {e}"

    high = sum(1 for r in results if r.get("extra", {}).get("severity") == "ERROR")
    med = sum(1 for r in results if r.get("extra", {}).get("severity") == "WARNING")
    low = len(results) - high - med

    lines = [
        "🛡️ <b>BÁO CÁO BẢO MẬT (semgrep)</b>",
        f"⏰ {datetime.now().strftime('%d/%m %H:%M')}",
        f"🔴 High: <b>{high}</b> • 🟡 Med: <b>{med}</b> • ⚪ Low: <b>{low}</b>",
    ]
    if not results:
        lines.append("✅ Hệ thống an toàn tuyệt đối — không phát hiện lỗ hổng!")
        return "\n".join(lines)

    lines.append("⚠️ Các vấn đề đầu tiên:")
    for i, item in enumerate(results[:limit], 1):
        sev = item.get("extra", {}).get("severity", "INFO")
        rule = item.get("check_id", "?").split(".")[-1]
        p = item.get("path", "?")
        ln = item.get("start", {}).get("line", 0)
        icon = "🔴" if sev == "ERROR" else "🟡" if sev == "WARNING" else "⚪"
        lines.append(f"{icon} <code>{p}:{ln}</code> {rule}")
    return "\n".join(lines)
