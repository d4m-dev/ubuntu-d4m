import os
import yt_dlp
from celery import Celery

# ==========================================
# 🚀 KHỞI TẠO CELERY & REDIS
# ==========================================
celery_app = Celery(
    "d4m_worker",
    broker="redis://127.0.0.1:6379/0",
    backend="redis://127.0.0.1:6379/0"
)

# 🛡️ CẤU HÌNH BẢO VỆ CPU: Ép máy chủ chỉ xử lý 1 tác vụ tại 1 thời điểm (Chống nghẽn RAM)
celery_app.conf.update(
    worker_concurrency=1,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    timezone='Asia/Ho_Chi_Minh'
)

# ==========================================
# ⚙️ CẤU HÌNH ĐƯỜNG DẪN LƯU TRỮ
# ==========================================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEDIA_DIR = os.path.join(BASE_DIR, "media_workspace")
COOKIES_FILE = os.path.join(BASE_DIR, "core", "cookies.txt") # 🛡️ Bùa tàng hình vượt mặt kiểm duyệt

# ==========================================
# 🎧 CÁC TÁC VỤ AI AUDIO (GIỮ NGUYÊN CỦA SẾP)
# ==========================================
@celery_app.task(name="tasks.process_audio")
def task_process_audio(*args, **kwargs):
    # Import cục bộ để chống lỗi vòng lặp (Circular Import)
    from api.audio_engine import process_audio_pipeline
    process_audio_pipeline(*args, **kwargs)
    return "Audio Pipeline Hoàn Thành"

@celery_app.task(name="tasks.admin_ytdl_pipeline")
def task_admin_ytdl_pipeline(*args, **kwargs):
    from api.ytdl import run_admin_audio_pipeline
    run_admin_audio_pipeline(*args, **kwargs)
    return "YTDL AI Pipeline Hoàn Thành"

# ==========================================
# 🌐 TÁC VỤ OMNI-DOWNLOADER (TIKTOK, IG, FB, YT)
# ==========================================
@celery_app.task(name="tasks.omni_download_task")
def omni_download_task(url: str):
    """
    Trạm tải video đa vũ trụ. Tự động nhận diện nền tảng để tải.
    """
    # Tự động Radar nhận diện nền tảng
    platform = "youtube"
    if "tiktok.com" in url: platform = "tiktok"
    elif "instagram.com" in url: platform = "instagram"
    elif "facebook.com" in url: platform = "facebook"
    
    save_path = os.path.join(MEDIA_DIR, platform)
    os.makedirs(save_path, exist_ok=True)
    
    # Cấu hình lõi yt-dlp tối ưu hóa cho MỌI nền tảng
    ydl_opts = {
        'outtmpl': f'{save_path}/%(id)s_%(title).50s.%(ext)s',
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'quiet': True,
        'no_warnings': True,
        'cookiefile': COOKIES_FILE if os.path.exists(COOKIES_FILE) else None,
    }
    
    # Ép xung riêng cho TikTok (Cố gắng lấy bản gốc chất lượng cao không Watermark)
    if platform == "tiktok":
        ydl_opts['format'] = 'bestvideo+bestaudio/best'
        
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Bắt đầu bóc tách và tải về
            info = ydl.extract_info(url, download=True)
            file_path = ydl.prepare_filename(info)
            
            return {
                "status": "success", 
                "platform": platform, 
                "title": info.get('title', 'Unknown'), 
                "file": file_path
            }
    except Exception as e:
        return {"status": "error", "message": str(e)}