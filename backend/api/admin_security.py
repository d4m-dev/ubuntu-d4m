from core import urls as U
import os
import json
from collections import Counter
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from api.admin_scripts import verify_admin_token

router = APIRouter(prefix=U.SECURITY["PREFIX"], tags=["Aegis Security Shield"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECURITY_DIR = os.path.join(BASE_DIR, "logs", "security")
BLACKLIST_FILE = os.path.join(SECURITY_DIR, "blacklist.json")
ACCESS_LOG_FILE = os.path.join(SECURITY_DIR, "access_log.json")

# 🚀 DANH SÁCH TRẮNG (Phải khớp với bên middleware)
WHITELIST_IPS = {"192.168.110.123", "127.0.0.1", "localhost", "::1"}

@router.get("/radar")
async def get_radar_stats(admin=Depends(verify_admin_token)):
    if not os.path.exists(ACCESS_LOG_FILE):
        return {"status": "success", "data": "Chưa có dữ liệu"}
        
    with open(ACCESS_LOG_FILE, "r") as f:
        logs = json.load(f)
        
    ip_counter = Counter([log["ip"] for log in logs])
    top_ips = ip_counter.most_common(5)
    
    hour_counter = Counter([datetime.fromtimestamp(log["time"]).strftime("%H:00") for log in logs])
    peak_hour = hour_counter.most_common(1)[0] if hour_counter else ("Không rõ", 0)

    devices = Counter([log["device"].split(" | ")[0] for log in logs if " | " in log["device"]])
    
    report = {
        "total_requests": len(logs),
        "peak_hour": f"{peak_hour[0]} (với {peak_hour[1]} lượt truy cập)",
        "device_stats": dict(devices),
        "top_attackers_or_users": [{"ip": ip, "count": count} for ip, count in top_ips]
    }
    return {"status": "success", "report": report}

class BanRequest(BaseModel):
    ip: str
    reason: str = "Bị khóa thủ công bởi Admin"
    hours: int = 24  # Nếu gửi -1 thì là Vĩnh viễn

@router.get("/blacklist")
async def get_blacklist(admin=Depends(verify_admin_token)):
    if os.path.exists(BLACKLIST_FILE):
        with open(BLACKLIST_FILE, "r") as f:
            return {"status": "success", "blacklist": json.load(f)}
    return {"status": "success", "blacklist": {}}

@router.post("/ban")
async def ban_ip(req: BanRequest, admin=Depends(verify_admin_token)):
    # 🚀 CHỐT CHẶN BẢO VỆ ĐỒNG ĐỘI
    if req.ip in WHITELIST_IPS:
        raise HTTPException(status_code=400, detail="Không thể bắn hạ! Mục tiêu này là IP nội bộ/Backend đã được cấp Kim bài miễn tử.")

    blacklist = {}
    if os.path.exists(BLACKLIST_FILE):
        with open(BLACKLIST_FILE, "r") as f: 
            blacklist = json.load(f)
            
    # Xử lý án phạt (Nếu hours == -1 thì khóa vĩnh viễn đến năm 9999)
    if req.hours == -1:
        expires_at = 253402300799 
        time_msg = "VĨNH VIỄN"
    else:
        expires_at = datetime.now().timestamp() + (req.hours * 3600)
        time_msg = f"{req.hours} giờ"
        
    blacklist[req.ip] = {
        "reason": req.reason,
        "banned_at": datetime.now().timestamp(),
        "expires_at": expires_at
    }
    
    os.makedirs(os.path.dirname(BLACKLIST_FILE), exist_ok=True)
    with open(BLACKLIST_FILE, "w") as f: 
        json.dump(blacklist, f, indent=4)
        
    return {"status": "success", "message": f"Đã tống cổ IP {req.ip} vào ngục {time_msg}!"}

@router.post("/unban/{ip}")
async def unban_ip(ip: str, admin=Depends(verify_admin_token)):
    if os.path.exists(BLACKLIST_FILE):
        with open(BLACKLIST_FILE, "r") as f: blacklist = json.load(f)
        if ip in blacklist:
            del blacklist[ip]
            with open(BLACKLIST_FILE, "w") as f: json.dump(blacklist, f, indent=4)
            return {"status": "success", "message": f"Đã phóng thích IP {ip}."}
    raise HTTPException(status_code=404, detail="IP này không nằm trong sổ đen.")