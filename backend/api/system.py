# -*- coding: utf-8 -*-
from core import urls as U
"""
D4M System — API trạng thái cấu hình hệ thống.
Dùng cho trang /documentation hiển thị service nào đã cấu hình / chưa.
"""
import os
from fastapi import APIRouter

router = APIRouter(prefix=U.SYSTEM["PREFIX"], tags=["D4M System"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _env_val(key):
    """Trả giá trị env, rỗng nếu chưa set."""
    return (os.getenv(key) or "").strip()


@router.get("/config")
def system_config():
    """Trả trạng thái cấu hình các dịch vụ (không tiết lộ giá trị secret)."""
    gemini = _env_val("GEMINI_API_KEY")
    tg = _env_val("TELEGRAM_BOT_TOKEN")
    cf = _env_val("CLOUDFLARE_TUNNEL_TOKEN")
    jwt = _env_val("SECRET_KEY")
    db_pass = _env_val("DB_PASS")
    # Google credentials (file JSON trong thư mục auth/)
    auth_dir = os.path.join(BASE_DIR, "auth")
    google_creds = False
    if os.path.isdir(auth_dir):
        google_creds = any(
            f.endswith(".json") and "calendar" not in f
            for f in os.listdir(auth_dir)
        )

    return {
        "status": "success",
        "service": "D4M Ecosystem",
        "db": bool(db_pass),
        "jwt": bool(jwt and jwt != "super-secret-jwt-key-change-me-later"),
        "gemini": bool(gemini),
        "telegram": bool(tg),
        "cloudflare": bool(cf),
        "google": google_creds,
        "env": "production" if os.getenv("ENVIRONMENT") == "production" else "development",
        "services": [
            {"name": "Database (MariaDB)", "configured": bool(db_pass), "key": "db"},
            {"name": "JWT Secret", "configured": bool(jwt and jwt != "super-secret-jwt-key-change-me-later"), "key": "jwt"},
            {"name": "Gemini AI (J.A.R.V.I.S / AutoCode)", "configured": bool(gemini), "key": "gemini"},
            {"name": "Telegram Bot", "configured": bool(tg), "key": "telegram"},
            {"name": "Cloudflare Tunnel", "configured": bool(cf), "key": "cloudflare"},
            {"name": "Google Drive (credentials)", "configured": google_creds, "key": "google"},
        ],
    }
