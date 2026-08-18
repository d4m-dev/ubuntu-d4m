from core import urls as U
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import time

router = APIRouter(
    prefix=U.WIDGETS["PREFIX"],
    tags=["Web Widgets"]
)

# --- THỜI TIẾT (WEATHER WIDGET) ---
@router.get("/weather")
async def get_weather(city: str = "Phú Quốc"):
    """API cung cấp dữ liệu thời tiết cho Widget (Dữ liệu giả lập tạm thời)"""
    return {
        "status": "success",
        "data": {
            "location": city,
            "temperature": 29,
            "condition": "Nhiều mây, gió nhẹ",
            "humidity": 78,
            "icon": "partly-cloudy"
        }
    }

# --- ÂM NHẠC (MUSIC PRO WIDGET) ---
@router.get("/music/now-playing")
async def get_now_playing():
    """API cung cấp trạng thái nhạc đang phát cho Music Widget"""
    return {
        "status": "success",
        "data": {
            "song_name": "Cưới Chính (Remix)",
            "artist": "Nal",
            "is_playing": True,
            "progress_ms": 125000,
            "duration_ms": 240000,
            "cover_url": "https://i.imgur.com/sample-cover.jpg",
            "has_lyrics": True
        }
    }

class SleepTimerRequest(BaseModel):
    minutes: int

@router.post("/music/sleep-timer")
async def set_sleep_timer(request: SleepTimerRequest):
    """API thiết lập hẹn giờ tắt nhạc tự động"""
    if request.minutes <= 0:
        raise HTTPException(status_code=400, detail="Thời gian hẹn giờ phải lớn hơn 0")
        
    shutdown_time = time.time() + (request.minutes * 60)
    
    return {
        "status": "success",
        "message": f"⏳ Đã thiết lập thành công. Nhạc sẽ tự động tắt sau {request.minutes} phút.",
        "shutdown_at_timestamp": shutdown_time
    }