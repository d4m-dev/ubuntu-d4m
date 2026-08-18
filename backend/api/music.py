import os
from core import urls as U
import re
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse, FileResponse

# Khởi tạo luồng Router độc lập cho tính năng Music Hub
router = APIRouter(
    prefix=U.MUSIC["PREFIX"],
    tags=["Music Hub API"]
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MUSIC_DIR = os.path.join(BASE_DIR, "audio_workspace", "music")

# ==========================================
# 🔍 HÀM BỔ TRỢ: BÓC TÁCH METADATA TỪ FILE .LRC
# ==========================================
def parse_lrc_metadata(lrc_path: str, default_title: str) -> dict:
    """Đọc file .lrc và trích xuất thông tin ti, ar, al, by nếu có"""
    metadata = {
        "title": default_title,
        "artist": "d4m-dev Studio",
        "album": "Single",
        "by": "AI Engine"
    }
    
    if not os.path.exists(lrc_path):
        return metadata
        
    try:
        with open(lrc_path, "r", encoding="utf-8") as f:
            content = f.read()
            
            ti_match = re.search(r'\[ti:\s*(.*?)\]', content, re.IGNORECASE)
            ar_match = re.search(r'\[ar:\s*(.*?)\]', content, re.IGNORECASE)
            al_match = re.search(r'\[al:\s*(.*?)\]', content, re.IGNORECASE)
            by_match = re.search(r'\[by:\s*(.*?)\]', content, re.IGNORECASE)
            
            if ti_match and ti_match.group(1).strip():
                metadata["title"] = ti_match.group(1).strip()
            if ar_match and ar_match.group(1).strip():
                metadata["artist"] = ar_match.group(1).strip()
            if al_match and al_match.group(1).strip():
                metadata["album"] = al_match.group(1).strip()
            if by_match and by_match.group(1).strip():
                metadata["by"] = by_match.group(1).strip()
    except Exception as e:
        print(f"⚠️ Lỗi bóc dữ liệu LRC: {e}")
        
    return metadata

# ==========================================
# 🎧 LÕI STREAMING & ĐỌC FILE TỰ ĐỘNG
# ==========================================
def chunked_file_reader(file_path: str, start: int, end: int, chunk_size: int = 1024 * 1024):
    with open(file_path, "rb") as f:
        f.seek(start)
        while (pos := f.tell()) <= end:
            read_size = min(chunk_size, end + 1 - pos)
            yield f.read(read_size)

@router.get("/stream/{folder}/{filename}")
async def stream_media(folder: str, filename: str, request: Request):
    """API Stream trực tiếp file Nhạc hoặc Video"""
    file_path = os.path.join(MUSIC_DIR, folder, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File không tồn tại")
    
    file_size = os.path.getsize(file_path)
    range_header = request.headers.get("Range")
    content_type = "video/mp4" if filename.endswith(".mp4") else "audio/mpeg"

    if range_header:
        match = re.search(r'bytes=(\d+)-(\d*)', range_header)
        start = int(match.group(1))
        end = int(match.group(2)) if match.group(2) else file_size - 1
        
        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(end - start + 1),
            "Content-Type": content_type,
        }
        return StreamingResponse(chunked_file_reader(file_path, start, end), status_code=206, headers=headers)
    
    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(file_size),
        "Content-Type": content_type,
    }
    return StreamingResponse(chunked_file_reader(file_path, 0, file_size - 1), headers=headers)

@router.get("/cover/{folder}")
async def get_cover(folder: str):
    """API tự động tìm file .jpg hoặc .png làm ảnh bìa"""
    folder_path = os.path.join(MUSIC_DIR, folder)
    if os.path.exists(folder_path):
        for f in os.listdir(folder_path):
            if f.lower().endswith(('.jpg', '.jpeg', '.png')):
                return FileResponse(os.path.join(folder_path, f))
    raise HTTPException(status_code=404, detail="Không tìm thấy ảnh bìa")

@router.get("/lyrics/{folder}")
async def get_lyrics(folder: str):
    """API tự động tìm file .lrc trong thư mục"""
    folder_path = os.path.join(MUSIC_DIR, folder)
    lrc_file = None
    if os.path.exists(folder_path):
        for f in os.listdir(folder_path):
            if f.lower().endswith('.lrc'):
                lrc_file = os.path.join(folder_path, f)
                break
                
    if not lrc_file:
        return {"status": "error", "message": "Chưa có file lời."}

    lyrics_data = []
    try:
        with open(lrc_file, "r", encoding="utf-8") as f:
            for line in f.readlines():
                match = re.search(r'\[(\d{2}):(\d{2}\.\d{2,3})\](.*)', line)
                if match:
                    mins = int(match.group(1))
                    secs = float(match.group(2))
                    text = match.group(3).strip()
                    if text:
                        time_ms = int((mins * 60 + secs) * 1000)
                        lyrics_data.append({"time": time_ms, "text": text})
        return {"status": "success", "folder": folder, "lyrics": lyrics_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# 📂 NÂNG CẤP: QUÉT TÊN FILE ĐỘNG (DYNAMIC SCANNING)
# ==========================================
@router.get("/list")
async def get_music_list():
    """Tự động phân loại beat, vocal, video, lrc dựa theo đuôi file"""
    if not os.path.exists(MUSIC_DIR):
        return {"status": "success", "songs": []}

    songs = []
    try:
        for folder_name in os.listdir(MUSIC_DIR):
            folder_path = os.path.join(MUSIC_DIR, folder_name)
            
            if os.path.isdir(folder_path):
                display_name = folder_name.replace("-", " ").replace("_", " ").title()
                files = os.listdir(folder_path)
                
                # Quét và nhặt đúng file vào rổ
                vocal_file = next((f for f in files if f.endswith('.mp3') and not f.endswith('_beat.mp3')), None)
                beat_file = next((f for f in files if f.endswith('_beat.mp3')), None)
                video_file = next((f for f in files if f.endswith('.mp4')), None)
                lrc_file = next((f for f in files if f.endswith('.lrc')), None)
                
                song_title = display_name
                artist_name = "d4m-dev Studio"
                album_name = "Single"

                if lrc_file:
                    meta = parse_lrc_metadata(os.path.join(folder_path, lrc_file), display_name)
                    song_title = meta["title"]
                    artist_name = meta["artist"]
                    album_name = meta["album"]
                
                if vocal_file or beat_file or video_file:
                    songs.append({
                        "id": folder_name,
                        "title": song_title,
                        "artist": artist_name,
                        "album": album_name,
                        "cover_api": f"/api/music/cover/{folder_name}",
                        "flags": {
                            "vocal": vocal_file,    # Trả thẳng tên file thay vì True/False
                            "beat": beat_file,      # Trả thẳng tên file
                            "video": video_file,    # Trả thẳng tên file
                            "lyrics": lrc_file is not None
                        }
                    })
                
        return {"status": "success", "total": len(songs), "songs": songs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi quét kho nhạc: {str(e)}")