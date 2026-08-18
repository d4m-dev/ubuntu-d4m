import httpx
import os
import zipfile
from datetime import datetime
from core.config import settings

def get_device_battery():
    try:
        with open('/sys/class/power_supply/battery/capacity', 'r') as f:
            capacity = f.read().strip()
        with open('/sys/class/power_supply/battery/status', 'r') as f:
            status = f.read().strip()
        icon = "⚡ Đang sạc" if status == "Charging" else "🔋 Dùng pin"
        return f"{capacity}% ({icon})"
    except:
        return "🔋 Không xác định"

def create_backup_zip():
    backup_filename = f"SourceCode_Optimized_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
    backup_path = os.path.join("/tmp", backup_filename)
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    ignored_folders = {'.git', 'myenv', 'venv', '__pycache__', 'audio_workspace', 'hosted_projects', 'node_modules', 'avatar-server', 'logs' }
    
    with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(base_dir):
            dirs[:] = [d for d in dirs if d not in ignored_folders]
            for file in files:
                if file.endswith(('.pyc', '.pyo', '.pyd', '.zip', '.tar.gz')): 
                    continue
                abs_file = os.path.join(root, file)
                rel_file = os.path.relpath(abs_file, base_dir)
                zipf.write(abs_file, rel_file)
    return backup_path

async def send_telegram_message(text: str, reply_markup: dict = None):
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID: return False
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {"chat_id": settings.TELEGRAM_CHAT_ID, "text": text, "parse_mode": "HTML"}
    if reply_markup: payload["reply_markup"] = reply_markup
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=payload, timeout=5.0)
            return res.status_code == 200
    except: return False

async def send_telegram_menu():
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID: return False
    from api.dashboard import api_status_db
    tunnel_status = "🟢 ĐANG BẬT" if api_status_db["internet_tunnel"]["active"] else "🔴 ĐANG TẮT"
    keyboard = {
        "inline_keyboard": [
            [{"text": f"🌐 Tên miền & Tunnel: {tunnel_status}", "callback_data": "toggle_tunnel"}],
            [{"text": "📊 Giám Sát", "callback_data": "server_stats"}, {"text": "🔬 Top Tiến Trình", "callback_data": "top_processes"}],
            [{"text": "🧹 Dọn rác", "callback_data": "clean_trash"}, {"text": "📦 Sao Lưu", "callback_data": "backup_code"}],
            [{"text": "🔄 Khởi động lại", "callback_data": "restart_api"}]
        ]
    }
    await send_telegram_message(
        "🎛️ <b>TRUNG TÂM CHỈ HUY UBUNTU CORE</b>\n\n"
        "💡 <b>Mẹo thao tác:</b>\n"
        "- Ném <code>Link YouTube</code> để bot tải siêu tốc.\n"
        "- Lệnh DJ: <code>Phát bài [tên]</code>.\n"
        "- Gõ <code>>[lệnh bash]</code> để chạy Terminal từ xa.", 
        reply_markup=keyboard
    )