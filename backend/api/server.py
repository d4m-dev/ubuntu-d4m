import os
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware  
from fastapi.staticfiles import StaticFiles

# --- 1. CORE & TASKS ---
from core.database import init_db, db_manager
from core.scheduler import ai_janitor_task
from core.telegram import telegram_polling_task
from api.audio_engine import WORKSPACE_DIR
from api.admin_scripts import scheduler, restore_schedules

# --- 2. MIDDLEWARES (Lá Chắn Đa Tầng) ---
from middlewares.logger_tracker import LoggerTrackerMiddleware
from middlewares.rate_limit import RateLimitMiddleware
from middlewares.dynamic_hosting import DynamicHostingMiddleware
from middlewares.auto_branding import AutoBrandingMiddleware
from middlewares.ip_shield import IPShieldMiddleware
from middlewares.security_headers import SecurityHeadersMiddleware

# --- 3. ROUTERS ---
from api import (
    player, dashboard, websockets, chatbox, social, auth, widgets, 
    projects, ai_admin, audio_engine, bio_premium, music, telegram_bot, astrology, ytdl,
    admin_scripts, admin_security, dldriver, autocode, omni_dl, d4m_music, system,
    donate, ws_donate, upload, notification, profile_public, songs_upload, social_dm
)

# ==========================================
# ⚙️ QUẢN LÝ VÒNG ĐỜI ỨNG DỤNG (LIFESPAN)
# ==========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()                   
    db_manager.connect()   
    db_manager.init_social_tables() 
    task_janitor = asyncio.create_task(ai_janitor_task())
    task_telegram = asyncio.create_task(telegram_polling_task())
    
    scheduler.start()
    restore_schedules()
    print("⏰ [Admin Scripts] Cỗ máy định thời gian đã được kích hoạt!")
    
    yield 
    
    scheduler.shutdown()
    task_janitor.cancel()
    task_telegram.cancel()
    if getattr(db_manager, "pool", None):
        print("Đã giải phóng MariaDB Connection Pool an toàn!")

# ==========================================
# 🚀 KHỞI TẠO HỆ THỐNG FASTAPI (PURE API)
# ==========================================
app = FastAPI(
    title="Ubuntu Backend Core PURE API", 
    version="2.0.0", 
    lifespan=lifespan,
    docs_url=None, redoc_url=None, openapi_url=None 
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.critical(f"CRITICAL FAULT on {request.url.path}: {str(exc)}")
    return JSONResponse(status_code=500, content={"status": "error", "message": "❌ Lỗi hệ thống nội bộ."})

# ==========================================
# 🛡️ CẤU HÌNH MIDDLEWARES & CORS
# ==========================================
def setup_middlewares(app: FastAPI):
    ALLOWED_ORIGINS = [
        "https://d4mdev.click", 
        "https://api.d4mdev.click",
        "http://127.0.0.1:16868", "http://localhost:16868",
        "http://127.0.0.1:36868", "http://localhost:36868",
        "http://127.0.0.1:5173",  "http://localhost:5173",  # <-- Cổng mặc định của Vite / React
        "http://127.0.0.1:3000",  "http://localhost:3000",  # <-- Cổng React Create-App
        "http://127.0.0.1:5500",  "http://localhost:5500",  # <-- Cổng VS Code Live Server
        "http://127.0.0.1:8080",  "http://localhost:8080",  # <-- Cổng Vue/Web-server
        "null"                                              # <-- Cho phép mở trực tiếp file:// trên trình duyệt
    ]
    
    app.add_middleware(DynamicHostingMiddleware) 
    app.add_middleware(AutoBrandingMiddleware)
    app.add_middleware(LoggerTrackerMiddleware) 
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    app.add_middleware(SecurityHeadersMiddleware) 
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(IPShieldMiddleware) 
    app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# ==========================================
# 🧩 GẮN KẾT MEDIA & ĐỊNH TUYẾN
# ==========================================
def setup_static_mounts(app: FastAPI):
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Chỉ giữ lại các thư mục Media do Backend sinh ra, bỏ thư mục giao diện tĩnh
    STATIC_DIRS = {
        "media_music": os.path.join(BASE_DIR, "audio_workspace", "music"),
        "audio_files": os.path.join(BASE_DIR, "audio_workspace", "outputs"),
        "images_workspace": os.path.join(BASE_DIR, "images_workspace"),
        "telegram_audio": os.path.join(WORKSPACE_DIR, "telegram")
    }

    for route_name, dir_path in STATIC_DIRS.items():
        os.makedirs(dir_path, exist_ok=True)
        route_url = "/static/telegram" if route_name == "telegram_audio" else f"/{route_name.replace('_files', '-files')}"
        app.mount(route_url, StaticFiles(directory=dir_path), name=route_name)

def setup_routers(app: FastAPI):
    api_routers = [
        auth.router, dashboard.router, websockets.router, chatbox.router, social.router,
        widgets.router, projects.router, ai_admin.router, audio_engine.router, bio_premium.router,
        music.router, telegram_bot.router, astrology.router, ytdl.router, player.router, admin_scripts.router,
        admin_security.router, dldriver.router, autocode.router, omni_dl.router,
        d4m_music.router,  # D4M Music (Merged)
        system.router,     # D4M System (config status)
        upload.router,     # 🛡️ Admin Upload (validate file)
        donate.router,     # 💰 Donate QR + SePay webhook
        ws_donate.router,  # 💰 Donate WebSocket realtime
        notification.router,  # 🔔 Notification realtime
        notification.ws_router,  # 🔔 Notification WebSocket realtime
        profile_public.router,  # 👤 Profile công khai
        songs_upload.router,  # 🎵 Songs Upload (5-in-1)
        social_dm.router,     # 💬 Social DM & Bình luận
        social_dm.ws_router   # 💬 Social DM WebSocket realtime
    ]
    for r in api_routers:
        app.include_router(r)

# ==========================================
# 🚀 KÍCH HOẠT CHUỖI KHỞI ĐỘNG
# ==========================================
setup_middlewares(app)
setup_static_mounts(app)
setup_routers(app)