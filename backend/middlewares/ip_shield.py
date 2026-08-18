import time
import json
import os
from collections import defaultdict
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from user_agents import parse

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECURITY_DIR = os.path.join(BASE_DIR, "logs", "security")
os.makedirs(SECURITY_DIR, exist_ok=True)

BLACKLIST_FILE = os.path.join(SECURITY_DIR, "blacklist.json")
ACCESS_LOG_FILE = os.path.join(SECURITY_DIR, "access_log.json")

IP_REQUEST_TRACKER = defaultdict(list)
MAX_REQUESTS = 60
TIME_WINDOW = 10
BAN_DURATION = 86400

# 🚀 DANH SÁCH TRẮNG (KIM BÀI MIỄN TỬ)
WHITELIST_IPS = {"192.168.110.123", "127.0.0.1", "localhost", "::1"}

def load_blacklist():
    if os.path.exists(BLACKLIST_FILE):
        try:
            with open(BLACKLIST_FILE, "r") as f: return json.load(f)
        except: return {}
    return {}

def save_blacklist(data):
    with open(BLACKLIST_FILE, "w") as f: json.dump(data, f, indent=4)

def log_access_async(ip, path, user_agent_string):
    try:
        ua = parse(user_agent_string)
        device_meta = f"{ua.os.family} {ua.os.version_string} - {ua.browser.family}"
        if ua.is_mobile: device_meta = f"📱 Mobile | {device_meta}"
        elif ua.is_pc: device_meta = f"💻 PC | {device_meta}"
        else: device_meta = f"🤖 Bot/Unknown | {device_meta}"

        log_entry = {"time": time.time(), "ip": ip, "path": path, "device": device_meta}
        logs = []
        if os.path.exists(ACCESS_LOG_FILE):
            with open(ACCESS_LOG_FILE, "r") as f:
                try: logs = json.load(f)
                except: pass
        logs.append(log_entry)
        with open(ACCESS_LOG_FILE, "w") as f: json.dump(logs[-10000:], f)
    except Exception: pass

class IPShieldMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = request.headers.get("CF-Connecting-IP") or request.headers.get("X-Forwarded-For") or request.client.host
        if client_ip and "," in client_ip: client_ip = client_ip.split(",")[0].strip()

        # 🚀 KIỂM TRA KIM BÀI MIỄN TỬ
        if client_ip in WHITELIST_IPS:
            return await call_next(request)

        blacklist = load_blacklist()
        
        # KIỂM TRA IP CÓ ĐANG BỊ PHONG TỎA KHÔNG
        if client_ip in blacklist:
            ban_info = blacklist[client_ip]
            if time.time() < ban_info["expires_at"]:
                return JSONResponse(
                    status_code=403, 
                    content={
                        "status": "error",
                        "error": {
                            "title": "KẾT NỐI BỊ TỪ CHỐI",
                            "message": "Hệ thống Khiên bảo mật AEGIS đã ngắt kết nối của bạn.",
                            "ip": client_ip,
                            "reason": ban_info['reason']
                        }
                    }
                )
            else:
                del blacklist[client_ip]
                save_blacklist(blacklist)

        # TRÌNH THEO DÕI SPAM
        current_time = time.time()
        IP_REQUEST_TRACKER[client_ip] = [t for t in IP_REQUEST_TRACKER[client_ip] if current_time - t < TIME_WINDOW]
        IP_REQUEST_TRACKER[client_ip].append(current_time)

        if len(IP_REQUEST_TRACKER[client_ip]) > MAX_REQUESTS:
            reason = "Vượt quá giới hạn tốc độ yêu cầu (DDOS/Spam)"
            blacklist[client_ip] = {
                "reason": reason,
                "banned_at": current_time,
                "expires_at": current_time + BAN_DURATION
            }
            save_blacklist(blacklist)
            print(f"🚨 [AEGIS] Bắn hạ IP: {client_ip}")
            return JSONResponse(
                status_code=429, 
                content={
                    "status": "error",
                    "error": {
                        "title": "PHÁT HIỆN TẤN CÔNG (DDOS/SPAM)",
                        "message": "Hệ thống nhận diện lưu lượng bất thường. Đã đưa vào Blacklist.",
                        "ip": client_ip,
                        "reason": reason
                    }
                }
            )

        user_agent = request.headers.get("User-Agent", "Unknown")
        log_access_async(client_ip, request.url.path, user_agent)

        return await call_next(request)