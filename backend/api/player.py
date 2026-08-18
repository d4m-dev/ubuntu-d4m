from core import urls as U
import os
from fastapi import APIRouter

router = APIRouter(
    prefix=U.PLAYER["PREFIX"],
    tags=["Music Pro Ultimate Player"]
)

# Tự động lấy thư mục gốc của dự án
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Trỏ thẳng vào thư mục chứa thành phẩm nhạc cuối cùng
MUSIC_DIR = os.path.join(BASE_DIR, "audio_workspace", "music")

@router.get("/tracks")
async def get_all_tracks():
    """Quét toàn bộ kho nhạc và xuất danh sách phát"""
    tracks = []
    if not os.path.exists(MUSIC_DIR):
        return {"status": "success", "tracks": tracks}
    
    for folder_name in os.listdir(MUSIC_DIR):
        folder_path = os.path.join(MUSIC_DIR, folder_name)
        if not os.path.isdir(folder_path): 
            continue
            
        original_mp3 = f"{folder_name}.mp3"
        beat_mp3 = f"{folder_name}_beat.mp3"
        lrc_file = f"{folder_name}.lrc"
        cover_img = f"{folder_name}.jpg" 
        
        # Chỉ lấy bài hát nếu tồn tại file gốc
        if os.path.exists(os.path.join(folder_path, original_mp3)):
            tracks.append({
                "id": folder_name,
                "title": folder_name.replace("_", " ").title(),
                # URL trỏ chuẩn về /media/music/
                "original_url": f"/media/music/{folder_name}/{original_mp3}",
                "beat_url": f"/media/music/{folder_name}/{beat_mp3}" if os.path.exists(os.path.join(folder_path, beat_mp3)) else None,
                "lrc_url": f"/media/music/{folder_name}/{lrc_file}" if os.path.exists(os.path.join(folder_path, lrc_file)) else None,
                "cover_url": f"/media/music/{folder_name}/{cover_img}" if os.path.exists(os.path.join(folder_path, cover_img)) else "/src/favicon/ubuntu-backend/favicon-96x96.png"
            })
            
    return {"status": "success", "tracks": tracks}