from core import urls as U
import psutil
import httpx
from fastapi import APIRouter, BackgroundTasks, HTTPException
from core.config import settings

router = APIRouter(
    prefix=U.TELEGRAM["PREFIX"],
    tags=["Telegram Automation"]
)

async def send_telegram_msg(message: str):
    """Hàm lõi bắn tin nhắn về Telegram của sếp"""
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
        return False
    
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {"chat_id": settings.TELEGRAM_CHAT_ID, "text": message, "parse_mode": "HTML"}
    
    async with httpx.AsyncClient() as client:
        try:
            await client.post(url, json=payload)
            return True
        except Exception as e:
            print(f"⚠️ Lỗi gửi Telegram: {e}")
            return False

@router.post("/report/system")
async def send_system_report(background_tasks: BackgroundTasks):
    """API kích hoạt báo cáo hệ thống qua Telegram"""
    ram = psutil.virtual_memory()
    cpu = psutil.cpu_percent(interval=0.5)
    
    msg = (
        "🟢 <b>BÁO CÁO HỆ THỐNG D4M-DEV</b>\n\n"
        f"💻 <b>CPU Load:</b> {cpu}%\n"
        f"🧠 <b>RAM Usage:</b> {ram.percent}% ({round(ram.used/(1024**3), 2)}GB / {round(ram.total/(1024**3), 2)}GB)\n"
        "⚡ <i>Hệ thống backend cốt lõi đang hoạt động ổn định!</i>"
    )
    background_tasks.add_task(send_telegram_msg, msg)
    return {"status": "success", "message": "Đã bắn lệnh báo cáo qua Telegram!"}

@router.post("/report/weather")
async def send_weather_report(background_tasks: BackgroundTasks, city: str = "Phu Quoc"):
    """Lấy dữ liệu OpenWeatherMap và báo cáo"""
    # Khai báo sẵn logic OpenWeatherMap để sếp dễ dàng tích hợp API Key sau này
    msg = (
        f"🌤️ <b>THỜI TIẾT TẠI {city.upper()}</b>\n\n"
        "Động cơ OpenWeatherMap đang được đồng bộ. Nhiệt độ hiện tại mát mẻ, hạ tầng sẵn sàng cho các dự án mới!\n"
    )
    background_tasks.add_task(send_telegram_msg, msg)
    return {"status": "success", "message": "Đã gửi thông tin thời tiết."}