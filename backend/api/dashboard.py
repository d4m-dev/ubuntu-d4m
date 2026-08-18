from core import urls as U
import os
import psutil
import time
import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from core.security import verify_token
from core.tunnel import get_tunnel_url, start_tunnel, stop_tunnel
from core.database import db_manager, db_executor 
from api.audio_engine import WORKSPACE_DIR

router = APIRouter(
    prefix=U.DASHBOARD["PREFIX"],
    tags=["Dashboard"],
    dependencies=[Depends(verify_token)] 
)

MUSIC_DIR = os.path.join(WORKSPACE_DIR, "music")

# ==========================================
# 🧠 TRÍ NHỚ VĨNH CỬU CHO J.A.R.V.I.S VÀ DASHBOARD
# ==========================================
STATUS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "core", "api_status.json")

DEFAULT_STATUS = {
    "internet_tunnel": {"active": False, "description": "Đường hầm Cloudflare bảo mật", "public_url": ""},
    "chatbox_ai": {"active": True, "description": "Module Chatbot AI & Phân tích Log", "public_url": ""},
    "social_db": {"active": True, "description": "Kết nối Database MariaDB Social Hub", "public_url": ""}
}

def load_status():
    """Khôi phục trạng thái từ ổ cứng khi Server vừa khởi động"""
    if os.path.exists(STATUS_FILE):
        try:
            with open(STATUS_FILE, "r", encoding="utf-8") as f:
                saved_status = json.load(f)
                # Ghép dữ liệu đã lưu với cấu trúc mặc định (đề phòng sếp thêm module mới)
                for key in DEFAULT_STATUS:
                    if key not in saved_status:
                        saved_status[key] = DEFAULT_STATUS[key]
                return saved_status
        except:
            pass
    return DEFAULT_STATUS.copy()

def save_status(status_dict):
    """Lưu trạng thái xuống ổ cứng mỗi khi có thay đổi"""
    os.makedirs(os.path.dirname(STATUS_FILE), exist_ok=True)
    with open(STATUS_FILE, "w", encoding="utf-8") as f:
        json.dump(status_dict, f, ensure_ascii=False, indent=4)

# 🔥 Khởi tạo não bộ từ ổ cứng thay vì hardcode bằng RAM
api_status_db = load_status()

# ==========================================
# 📊 API DASHBOARD LÕI
# ==========================================
@router.get("/system-stats")
async def get_system_stats():
    cpu_percent = psutil.cpu_percent(interval=0.1)
    ram = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    return {
        "status": "success",
        "cpu_usage_percent": cpu_percent,
        "ram": {
            "percent": ram.percent,
            "used_gb": round(ram.used / (1024**3), 2),
            "total_gb": round(ram.total / (1024**3), 2)
        },
        "storage": {
            "percent": disk.percent,
            "free_gb": round(disk.free / (1024**3), 2),
            "total_gb": round(disk.total / (1024**3), 2)
        }
    }

@router.get("/services")
async def get_services():
    if api_status_db["internet_tunnel"]["active"] and not api_status_db["internet_tunnel"]["public_url"]:
        api_status_db["internet_tunnel"]["public_url"] = get_tunnel_url()
    return {"status": "success", "services": api_status_db}

@router.post("/services/toggle/{service_name}")
async def toggle_service(service_name: str):
    if service_name in api_status_db:
        current_state = api_status_db[service_name]["active"]
        new_state = not current_state
        api_status_db[service_name]["active"] = new_state
        
        if service_name == "internet_tunnel":
            if new_state:
                start_tunnel()
                for _ in range(15):
                    time.sleep(0.2)
                    url = get_tunnel_url()
                    if url:
                        api_status_db["internet_tunnel"]["public_url"] = url
                        break
            else:
                stop_tunnel()
                api_status_db["internet_tunnel"]["public_url"] = ""
        
        # 🚀 GHI NHỚ VÀO Ổ CỨNG SAU MỖI LẦN GẠT CÔNG TẮC
        save_status(api_status_db)
                
        return {
            "status": "success", 
            "message": f"Đã {'BẬT' if new_state else 'TẮT'} dịch vụ {service_name}", 
            "service": service_name, 
            "active": new_state
        }
    
    return {"status": "error", "message": "Dịch vụ không tồn tại trong hệ thống."}

# ==========================================
# 📈 TRAFFIC ANALYTICS (Máy Đếm Nhịp Tim)
# ==========================================
@router.get("/analytics")
async def get_traffic_analytics():
    """Đếm log trong bảng api_logs, gom nhóm theo từng phút trong 7 phút gần nhất"""
    if not getattr(db_manager, "connection", None):
        return {"status": "error", "message": "Mất kết nối MariaDB"}

    try:
        # Chuẩn bị trước 7 mốc thời gian (Phút hiện tại lùi về 7 phút trước)
        now = datetime.now()
        timeline = []
        labels = []
        for i in range(6, -1, -1):
            target_time = now - timedelta(minutes=i)
            labels.append(target_time.strftime("%H:%M"))
            timeline.append({"time": target_time.strftime("%H:%M"), "count": 0})

        # Quét Database để lấy log trong 10 phút gần nhất (dư ra 3 phút cho chắc)
        cursor = db_manager.connection.cursor()
        ten_mins_ago = (now - timedelta(minutes=10)).strftime("%Y-%m-%d %H:%M:%S")
        
        cursor.execute("""
            SELECT timestamp 
            FROM api_logs 
            WHERE timestamp >= %s
        """, (ten_mins_ago,))
        
        # Đổ dữ liệu log thực tế vào các mốc thời gian tương ứng
        for row in cursor.fetchall():
            log_time_str = row[0].strftime("%H:%M")
            for item in timeline:
                if item["time"] == log_time_str:
                    item["count"] += 1
                    break
                    
        cursor.close()

        # Tách ra mảng Labels (Thời gian) và Values (Lượt truy cập) để trả về Frontend
        values = [item["count"] for item in timeline]

        return {
            "status": "success", 
            "data": {
                "labels": labels,
                "values": values
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ==========================================
# 🚀 THEO DÕI HÀNG ĐỢI AI (MUSIC HUB)
# ==========================================
@router.get("/tasks")
async def get_active_tasks():
    tasks = []
    if not os.path.exists(MUSIC_DIR):
        return {"status": "success", "tasks": tasks}
        
    for folder_name in os.listdir(MUSIC_DIR):
        folder_path = os.path.join(MUSIC_DIR, folder_name)
        if not os.path.isdir(folder_path): continue
        
        final_mp3 = os.path.join(folder_path, f"{folder_name}.mp3")
        final_beat = os.path.join(folder_path, f"{folder_name}_beat.mp3")
        final_lrc = os.path.join(folder_path, f"{folder_name}.lrc")
        
        is_complete = os.path.exists(final_mp3) and os.path.exists(final_beat) and os.path.exists(final_lrc)
        
        if is_complete: continue
            
        status = "Đang xử lý..."
        progress = 10
        color = "blue"
        
        temp_demucs = os.path.join(WORKSPACE_DIR, f"temp_demucs_{folder_name}")
        temp_whisper = os.path.join(WORKSPACE_DIR, f"temp_whisper_{folder_name}")
        converted_mp3 = os.path.join(folder_path, f"{folder_name}_converted.mp3")
        
        if os.path.exists(temp_whisper):
            status = "🤖 Đang nghe & viết lời (Whisper AI)"
            progress = 80
            color = "purple"
        elif os.path.exists(temp_demucs):
            status = "🎵 Đang bóc tách Beat (Demucs AI)"
            progress = 40
            color = "orange"
        elif os.path.exists(converted_mp3):
            status = "⏳ Đang chuẩn bị phôi Audio (FFmpeg)"
            progress = 20
            color = "blue"
        else:
            status = "📥 Đang tải tài nguyên gốc"
            progress = 5
            color = "gray"
            
        tasks.append({
            "id": folder_name,
            "title": folder_name,
            "status": status,
            "progress": progress,
            "color": color
        })
        
    return {"status": "success", "tasks": tasks}

# ==========================================================
# 📊 MUSIC ANALYTICS — biểu đồ lượt nghe/thích 7 ngày
# ==========================================================
@router.get("/music-analytics")
async def get_music_analytics():
    """Lượt nghe & thả tim theo ngày trong 7 ngày gần nhất (cho biểu đồ admin)."""
    try:
        today = datetime.now().date()
        labels = []
        views = []
        likes = []
        for i in range(6, -1, -1):
            day = (today - timedelta(days=i))
            label = day.strftime("%d/%m")
            labels.append(label)

            # Lượt nghe trong ngày
            day_start = f"{day} 00:00:00"
            day_end = f"{day} 23:59:59"
            v = db_executor.select_as_list_dict(
                "SELECT COUNT(*) c FROM song_views WHERE listened_at BETWEEN %s AND %s",
                (day_start, day_end))
            views.append(v[0]["c"] if v else 0)

            # Lượt thích trong ngày
            l = db_executor.select_as_list_dict(
                "SELECT COUNT(*) c FROM song_likes WHERE liked_at BETWEEN %s AND %s",
                (day_start, day_end))
            likes.append(l[0]["c"] if l else 0)

        # Tổng
        total_songs = db_executor.select_as_list_dict("SELECT COUNT(*) c FROM songs")[0]["c"]
        total_views_all = db_executor.select_as_list_dict("SELECT COALESCE(SUM(total_views),0) c FROM songs")[0]["c"]

        return {
            "status": "success",
            "data": {
                "labels": labels,
                "views": views,
                "likes": likes,
                "totals": {
                    "songs": total_songs,
                    "views": total_views_all,
                },
            },
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
