# -*- coding: utf-8 -*-
# Tên file: api/audio_engine.py
import os
import re
import shutil
import subprocess
import asyncio
import httpx
from datetime import datetime
from urllib.parse import quote
from pydantic import BaseModel
from dotenv import load_dotenv

from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException, Request, Depends
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse

# 🚀 IMPORT SERVICE XỬ LÝ NHẠC MỚI TẠO
from services.music_service import MusicService
from core import urls as U
from core.rate_limit import RateLimiter

router = APIRouter(
    prefix=U.AUDIO["PREFIX"],
    tags=["Audio Engine & Music Streaming"]
)

# ==========================================
# 🚀 CẤU HÌNH ĐƯỜNG DẪN (TỪ .ENV & LOCAL)
# ==========================================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

WORKSPACE_DIR = os.path.join(BASE_DIR, "audio_workspace")
INPUT_DIR = os.path.join(WORKSPACE_DIR, "inputs")
OUTPUT_DIR = os.path.join(WORKSPACE_DIR, "outputs")

# Lấy thư mục nhạc từ .env (Xử lý đường dẫn tương đối ./)
env_music_dir = os.getenv("MUSIC_FILES_DIR", "./audio_workspace/music/")
if env_music_dir.startswith("./"):
    MUSIC_DIR = os.path.join(BASE_DIR, env_music_dir[2:])
else:
    MUSIC_DIR = env_music_dir

os.makedirs(INPUT_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(MUSIC_DIR, exist_ok=True)


def safe_join(base: str, *parts) -> str:
    """Chống path traversal: đảm bảo path nằm trong base. Trả '' nếu vi phạm."""
    path = os.path.realpath(os.path.join(base, *parts))
    base_real = os.path.realpath(base)
    if path != base_real and not path.startswith(base_real + os.sep):
        return ""
    return path


def safe_exists(base: str, *parts) -> str:
    """Trả path an toàn nếu file tồn tại, ngược lại ''."""
    p = safe_join(base, *parts)
    if p and os.path.exists(p):
        return p
    return ""

# 💉 Hàm Dependency Injection để gọi Service
def get_music_service():
    service = MusicService()
    try:
        yield service
    finally:
        service.close()

# ==========================================
# 🎵 API GIAO DIỆN ÂM NHẠC (FRONTEND)
# ==========================================
@router.get("/music/home")
async def get_music_home(service: MusicService = Depends(get_music_service)):
    """Trả về dữ liệu Trang chủ Âm nhạc (Trending, Playlists)"""
    trending = service.get_trending_songs(limit=20)
    playlists = service.get_public_playlists(limit=10)

    for s in trending:
        if s.get('cover_image'):
            s['cover'] = f"/api/audio/cover/{s['project']}/{s['cover_image']}"
        else:
            s['cover'] = "/assets/favicon/favicon-96x96.png"
        s['lyricFile'] = s.get('lyric_file')

    return {"status": "success", "trending": trending, "playlists": playlists}

class InteractRequest(BaseModel):
    song_id: int
    action: str
    user_id: int = None

@router.post("/music/interact")
async def interact_music(req: InteractRequest, request: Request, service: MusicService = Depends(get_music_service)):
    """API lưu trữ tương tác: Lượt nghe, Lượt tải, Thả tim"""
    ip_address = request.client.host
    try:
        service.record_interaction(req.song_id, req.action, req.user_id, ip_address)
        return {"status": "success", "message": f"Đã ghi nhận {req.action} cho bài {req.song_id}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi tương tác: {str(e)}")

# ==========================================
# 📡 STREAMING AUDIO & FILESYSTEM
# ==========================================
def chunked_file_reader(file_path: str, start: int, end: int, chunk_size: int = 1024 * 1024):
    with open(file_path, "rb") as f:
        f.seek(start)
        while (pos := f.tell()) <= end:
            read_size = min(chunk_size, end + 1 - pos)
            yield f.read(read_size)

# 🚦 Rate Limiter: tối đa 50 requests/phút/IP để chống DDoS & leech băng thông
_stream_limiter = RateLimiter(limit=50, window_seconds=60, prefix="audio_stream")


@router.get("/stream/{project_name}/{file_name}")
async def stream_audio(project_name: str, file_name: str, request: Request):
    # Chống DDoS / leech băng thông: giới hạn 50 requests/phút/IP
    _stream_limiter.check_request(request)

    # Quét ưu tiên: Kho nhạc chính -> Outputs AI -> Inputs AI (có chống path traversal)
    file_path = safe_exists(MUSIC_DIR, project_name, file_name)
    if not file_path:
        file_path = safe_exists(OUTPUT_DIR, project_name, file_name)
    if not file_path:
        file_path = safe_exists(INPUT_DIR, project_name, file_name)
    if not file_path:
        raise HTTPException(status_code=404, detail="Không tìm thấy tệp tin âm thanh.")

    if file_name.endswith((".lrc", ".txt")):
        return FileResponse(path=file_path, media_type="text/plain; charset=utf-8", filename=file_name)

    file_size = os.path.getsize(file_path)
    range_header = request.headers.get("Range")

    if range_header:
        match = re.search(r'bytes=(\d+)-(\d*)', range_header)
        start = int(match.group(1))
        end = int(match.group(2)) if match.group(2) else file_size - 1
        status_code = 206
        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(end - start + 1),
            "Content-Type": "audio/mpeg",
        }
        return StreamingResponse(chunked_file_reader(file_path, start, end), status_code=status_code, headers=headers)

    headers = {"Accept-Ranges": "bytes", "Content-Length": str(file_size), "Content-Type": "audio/mpeg"}
    return StreamingResponse(chunked_file_reader(file_path, 0, file_size - 1), headers=headers)

@router.get("/cover/{project_name}/{file_name}")
async def get_cover_image(project_name: str, file_name: str):
    # Vá lỗi nếu frontend vô tình gửi chữ "undefined"
    if project_name == "undefined":
        project_name = file_name.split('.')[0]

    file_path = safe_join(MUSIC_DIR, project_name, file_name)
    
    # Cache-Control: ảnh bìa gần như bất biến — cache lâu ở trình duyệt/CDN
    # (1 tuần = 604800s). CDN/proxy phía trước cũng cache nhờ public + immutable.
    cache_headers = {
        "Cache-Control": "public, max-age=604800, immutable",
        "X-Content-Type-Options": "nosniff",
    }

    # Kiểm tra xem file thật có tồn tại không (chống path traversal)
    if not file_path or not os.path.exists(file_path) or not file_name.endswith((".jpg", ".jpeg", ".png")):
        fallback_path = os.path.join(BASE_DIR, "assets", "favicon", "favicon-96x96.png")
        # CHỐNG CRASH: Phải kiểm tra file fallback có tồn tại không
        if os.path.exists(fallback_path):
            return FileResponse(path=fallback_path, headers=cache_headers)
        else:
            # Báo lỗi 404 êm ái, không làm sập server hay báo log rác
            raise HTTPException(status_code=404, detail="Không tìm thấy ảnh bìa.")
    
    media_type = "image/png" if file_name.endswith(".png") else "image/jpeg"
    return FileResponse(path=file_path, media_type=media_type, headers=cache_headers)

@router.get("/lyrics/{project_name}/{file_name}")
async def get_lyrics_file(project_name: str, file_name: str):
    lrc_path = os.path.join(MUSIC_DIR, project_name, file_name)
    if not os.path.exists(lrc_path):
        lrc_path = os.path.join(OUTPUT_DIR, project_name, file_name)
        if not os.path.exists(lrc_path):
            return {"status": "error", "message": "Bài hát này chưa có lời."}

    lyrics_data = []
    try:
        with open(lrc_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
            for line in lines:
                match = re.search(r'\[(\d{2}):(\d{2}\.\d{2,3})\](.*)', line)
                if match:
                    mins, secs, text = int(match.group(1)), float(match.group(2)), match.group(3).strip()
                    if text:
                        lyrics_data.append({"time": int((mins * 60 + secs) * 1000), "text": text})
        return {"status": "success", "project": project_name, "lyrics": lyrics_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý file lời: {str(e)}")


# ==========================================
# 🛠️ MODULE TÁCH BEAT, KÉO LYRICS BẰNG AI (CODE GỐC GIỮ NGUYÊN)
# ==========================================
def sanitize_folder_name(filename: str) -> tuple:
    name, ext = os.path.splitext(filename)
    clean_name = re.sub(r'[^\w\-_]', '_', name)
    clean_name = re.sub(r'_+', '_', clean_name).strip('_')
    return clean_name, ext

def fetch_lyrics_multi_api(query: str, output_path: str, title: str = "", artist: str = "") -> bool:
    search_query = query.replace('_', ' ').replace('-', ' ').strip()
    _title = title if title else search_query
    _artist = artist if artist else "Unknown"

    with httpx.Client(timeout=10.0) as client:
        try:
            res = client.get("https://lrclib.net/api/search", params={"q": search_query})
            if res.status_code == 200:
                data = res.json()
                if data and len(data) > 0:
                    for track in data:
                        if track.get("syncedLyrics"):
                            with open(output_path, "w", encoding="utf-8") as f:
                                f.write(track.get("syncedLyrics"))
                            return True
                        elif track.get("plainLyrics"):
                            with open(output_path, "w", encoding="utf-8") as f:
                                f.write(track.get("plainLyrics"))
                            return True
        except Exception as e:
            print(f"⚠️ [API LRCLIB] Lỗi: {e}")

        try:
            url = f"https://api.lyrics.ovh/v1/{quote(_artist)}/{quote(_title)}"
            res = client.get(url)
            if res.status_code == 200:
                data = res.json()
                if data.get("lyrics"):
                    with open(output_path, "w", encoding="utf-8") as f:
                        f.write(data.get("lyrics"))
                    return True
        except Exception as e:
            print(f"⚠️ [API Lyrics.ovh] Lỗi hoặc không tìm thấy: {e}")
    return False

def process_audio_pipeline(file_path: str, clean_name: str, task_id: str, ext: str, separate_beat: bool, extract_lyrics: bool, title: str = "", artist: str = "", base_in_dir=INPUT_DIR, base_out_dir=OUTPUT_DIR):
    project_dir = os.path.join(base_out_dir, clean_name)
    os.makedirs(project_dir, exist_ok=True)

    vocal_output = os.path.join(project_dir, f"{task_id}_vocal.mp3")
    beat_output = os.path.join(project_dir, f"{task_id}_beat.mp3")
    lyrics_output = os.path.join(project_dir, f"{task_id}_lyrics.lrc")

    video_extensions = ['.mp4', '.mov', '.mkv', '.avi', '.flv', '.webm']
    if ext.lower() in video_extensions:
        print(f"🎬 [Audio Engine] Phát hiện Video ({ext}). Đang trích xuất MP3...")
        song_input_dir = os.path.join(base_in_dir, clean_name)
        os.makedirs(song_input_dir, exist_ok=True)
        mp3_converted_path = os.path.join(song_input_dir, f"{task_id}_converted.mp3")
        try:
            subprocess.run([
                "ffmpeg", "-y", "-i", file_path,
                "-q:a", "0", "-map", "a", mp3_converted_path
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            file_path = mp3_converted_path
            ext = '.mp3'
        except subprocess.CalledProcessError as e:
            err_msg = e.stderr.decode('utf-8') if e.stderr else str(e)
            print(f"❌ Lỗi chuyển đổi Video sang MP3: {err_msg}")

    if separate_beat:
        print(f"🎵 [Audio Engine] Đang bóc tách Beat/Vocal chuẩn Demucs cho: {task_id}")
        temp_demucs_dir = os.path.join(WORKSPACE_DIR, f"temp_demucs_{task_id}")
        os.makedirs(temp_demucs_dir, exist_ok=True)
        try:
            env = os.environ.copy()
            env["OMP_NUM_THREADS"] = "1"
            demucs_path = os.path.expanduser("~/myenv/bin/demucs")
            subprocess.run([
                demucs_path, "-d", "cpu", "-j", "1", "--segment", "7",
                "--two-stems=vocals", "-o", temp_demucs_dir, file_path
            ], env=env, check=True)

            raw_out_dir = os.path.join(temp_demucs_dir, "htdemucs", os.path.splitext(os.path.basename(file_path))[0])
            if os.path.exists(raw_out_dir):
                vocal_wav = os.path.join(raw_out_dir, "vocals.wav")
                beat_wav = os.path.join(raw_out_dir, "no_vocals.wav")

                if os.path.exists(vocal_wav):
                    subprocess.run(["ffmpeg", "-y", "-i", vocal_wav, "-b:a", "192k", vocal_output], shell=False)
                if os.path.exists(beat_wav):
                    subprocess.run(["ffmpeg", "-y", "-i", beat_wav, "-b:a", "192k", beat_output], shell=False)
            else:
                print(f"❌ Không tìm thấy thư mục kết quả tại: {raw_out_dir}")
        except subprocess.CalledProcessError as e:
            print(f"❌ Lỗi nội bộ tại Demucs khi chạy lệnh.")
        finally:
            if os.path.exists(temp_demucs_dir):
                shutil.rmtree(temp_demucs_dir)

    if extract_lyrics:
        print(f"📝 [Audio Engine] Đang rà quét APIs tìm lời bài hát cho: {clean_name}")
        is_lyric_found = fetch_lyrics_multi_api(clean_name, lyrics_output, title, artist)

        if is_lyric_found:
            print(f"⚡ Đã tải lời bài hát từ Internet thành công!")
        else:
            print("⚠️ Các nguồn API đều không có lời bài hát này. Đang tạo file LRC chuẩn 'Coming soon'...")
            fallback_title = title if title else clean_name
            fallback_artist = artist if artist else "Unknown"
            fallback_content = f"[ti:{fallback_title}]\n[ar:{fallback_artist}]\n[00:00.00]coming soon\n"
            with open(lyrics_output, "w", encoding="utf-8") as f:
                f.write(fallback_content)

    try:
        is_success = False
        if separate_beat and (os.path.exists(vocal_output) or os.path.exists(beat_output)):
            is_success = True
        elif not separate_beat and os.path.exists(lyrics_output):
            is_success = True

        if is_success:
            print(f"✅ [Audio Engine] Hoàn thành trọn vẹn Pipeline cho dự án: {task_id}")
            with open(os.path.join(project_dir, f"{task_id}_completed.txt"), "w", encoding="utf-8") as f:
                f.write("DONE")
        else:
            print(f"❌ [Audio Engine] Tiến trình AI thất bại. Hủy tạo cờ giao diện cho: {task_id}")
    except Exception as e:
        print(f"⚠️ Không thể xử lý cờ hoàn thành: {e}")


@router.post("/extract")
async def extract_audio_features(background_tasks: BackgroundTasks, file: UploadFile = File(...), custom_name: str = Form(None), separate_beat: bool = Form(True), extract_lyrics: bool = Form(True)):
    try:
        original_clean, ext = sanitize_folder_name(file.filename)
        final_name = custom_name.strip() if custom_name and custom_name.strip() else original_clean
        clean_name, _ = sanitize_folder_name(final_name)
        task_id = f"{clean_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        song_input_dir = os.path.join(INPUT_DIR, clean_name)
        os.makedirs(song_input_dir, exist_ok=True)
        saved_input_path = os.path.join(song_input_dir, f"{task_id}{ext}")

        with open(saved_input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        from core.tasks import task_process_audio
        task_process_audio.delay(saved_input_path, clean_name, task_id, ext, separate_beat, extract_lyrics, final_name, "Unknown", song_input_dir, OUTPUT_DIR)

        expected_outputs = {}
        if separate_beat:
            expected_outputs["vocal"] = f"/api/audio/stream/{clean_name}/{task_id}_vocal.mp3"
            expected_outputs["beat"] = f"/api/audio/stream/{clean_name}/{task_id}_beat.mp3"
        if extract_lyrics:
            expected_outputs["lyrics"] = f"/api/audio/stream/{clean_name}/{task_id}_lyrics.lrc"

        return JSONResponse(status_code=202, content={
            "status": "processing",
            "message": f"Đã chuyển tác vụ '{task_id}' vào Băng chuyền xử lý AI.",
            "project_folder": f"{clean_name}/{task_id}",
            "expected_outputs": expected_outputs
        })
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(error)}")

@router.get("/status/{song_name}/{task_id}")
async def check_audio_status(song_name: str, task_id: str):
    if os.path.exists(os.path.join(OUTPUT_DIR, song_name, f"{task_id}_completed.txt")):
        return {"status": "completed"}
    return {"status": "processing"}