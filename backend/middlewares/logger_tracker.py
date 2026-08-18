# -*- coding: utf-8 -*-
# Tên file: /ubuntu-backend/middlewares/logger_tracker.py
import asyncio
import time
import html
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from core.database import log_request
from api.websockets import manager
from core.telegram import send_telegram_message

class LoggerTrackerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 🚀 LẤY IP THẬT XUYÊN CLOUDFLARE
        client_ip = request.headers.get("CF-Connecting-IP") or \
                    request.headers.get("X-Forwarded-For", request.client.host).split(',')[0].strip()
                    
        method = request.method
        path = request.url.path
        
        # 🛑 BỘ LỌC CHỐNG SPAM ĐẲNG CẤP PRO VIP
        # Danh sách các API chạy ngầm liên tục cần bị "tàng hình" trên Terminal
        IGNORE_PATHS = [
            "/api/dashboard/system-stats",
            "/api/dashboard/tasks",
            "/api/dashboard/services",
            "/api/dashboard/bio-stats",
            "/api/dashboard/analytics"
        ]
        
        # Nếu là cổng WebSocket, file tĩnh, hoặc API ngầm -> Cho qua, KHÔNG GHI LOG
        if path.startswith("/api/ws/") or path.startswith("/static/") or path in IGNORE_PATHS:
            return await call_next(request)
            
        start_time = time.time() # ⏱️ Bắt đầu đếm giờ
        
        try:
            response = await call_next(request)
            process_time = round((time.time() - start_time) * 1000, 2) # Tính ra số mili-giây (ms)
            status_code = response.status_code
            
            if status_code >= 500:
                # 🚀 BỌC KHIÊN html.escape() CHỐNG HACKER TRUYỀN MÃ ĐỘC LÀM SẬP BOT TELEGRAM
                safe_path = html.escape(path)
                safe_ip = html.escape(client_ip)
                alert_msg = f"🚨 <b>BÁO ĐỘNG SẬP MÁY CHỦ ({status_code})</b>\n🌐 Đường dẫn: <code>{safe_path}</code>\n👤 IP: {safe_ip}"  # nosemgrep: python.django.security.injection.raw-html-format
                asyncio.create_task(send_telegram_message(alert_msg))
                
            elif status_code == 404 and "/admin" in path:
                safe_path = html.escape(path)
                safe_ip = html.escape(client_ip)
                alert_msg = f"🛡️ <b>CẢNH BÁO DÒ TÌM ADMIN</b>\n👤 IP: <code>{safe_ip}</code> đang cố truy cập: {safe_path}"  # nosemgrep: python.django.security.injection.raw-html-format
                asyncio.create_task(send_telegram_message(alert_msg))
                
            # Ghi Log xuống Database (MariaDB/SQLite)
            log_request(client_ip, method, path, status_code)
            
            # 🚀 BẮN DỮ LIỆU LÊN WEBSOCKET CHO DASHBOARD
            log_msg = f"[{method}] {path} - Status: {status_code} - IP: {client_ip} - Time: {process_time}ms"
            asyncio.create_task(manager.broadcast(log_msg))
            
            return response
            
        except Exception as e:
            process_time = round((time.time() - start_time) * 1000, 2)
            safe_path = html.escape(path)
            safe_err = html.escape(str(e))
            error_msg = f"🔥 <b>CRASH NGHIÊM TRỌNG</b>\n🌐 Path: {safe_path}\n❌ Chi tiết: <code>{safe_err}</code>"  # nosemgrep: python.django.security.injection.raw-html-format
            asyncio.create_task(send_telegram_message(error_msg))
            
            # Bắn log lỗi chữ đỏ lên giao diện UI của Sếp
            asyncio.create_task(manager.broadcast(f"[{method}] {path} - Status: 500 - IP: {client_ip} - Time: {process_time}ms - ERROR: {str(e)}"))
            raise e