from core import urls as U
import os
import re
import json
import subprocess
import asyncio
import unicodedata
from datetime import datetime
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from fastapi.responses import FileResponse
from urllib.parse import quote, unquote
from mutagen.mp3 import MP3
from mutagen.id3 import ID3, APIC, TIT2, TPE1, error
from fastapi import Header
import jwt

from api.audio_engine import WORKSPACE_DIR, process_audio_pipeline
from api.cleanup import write_log, run_cleanup_task

router = APIRouter(prefix=U.YTDL["PREFIX"], tags=["YouTube Downloader Pro"])

SECRET_KEY = os.getenv("ADMIN_KEY", "admin16868")
MUSIC_DIR = os.path.join(WORKSPACE_DIR, "music")
PENDING_DIR = os.path.join(WORKSPACE_DIR, "pending")

os.makedirs(MUSIC_DIR, exist_ok=True)
os.makedirs(PENDING_DIR, exist_ok=True)

def sanitize_title(title: str) -> str:
    text = unicodedata.normalize('NFKD', title).encode('ASCII', 'ignore').decode('utf-8')
    safe = re.sub(r'[^a-z0-9]', '', text.lower())
    return safe or "unknown"

def embed_metadata(mp3_path: str, title: str, uploader: str, cover_path: str):
    try:
        audio = MP3(mp3_path, ID3=ID3)
        try: audio.add_tags()
        except error: pass
        audio.tags.add(TIT2(encoding=3, text=title))
        audio.tags.add(TPE1(encoding=3, text=uploader))
        if os.path.exists(cover_path):
            with open(cover_path, 'rb') as albumart:
                audio.tags.add(APIC(encoding=3, mime='image/jpeg', type=3, desc=u'Cover', data=albumart.read()))
        audio.save()
        print(f"🎨 [Metadata] Đã đóng gói Ảnh bìa & Thông tin cho: {title}")
    except Exception as e:
        print(f"❌ [Metadata Lỗi]: Không thể đóng gói cho {title} - {e}")

def run_admin_audio_pipeline(full_file_path: str, safe_title: str, ext: str, original_title: str, uploader: str):
    try:
        print(f"🛸 [AI Pipeline] Khởi động bóc tách chuyên sâu cho bài: {safe_title} (Nguồn: {ext})")
        process_audio_pipeline(
            file_path=full_file_path,
            clean_name=safe_title,
            task_id=safe_title,
            ext=ext,
            separate_beat=True,
            extract_lyrics=True,
            base_out_dir=MUSIC_DIR,
            base_in_dir=MUSIC_DIR
        )

        target_dir = os.path.join(MUSIC_DIR, safe_title)
        old_lyrics = os.path.join(target_dir, f"{safe_title}_lyrics.lrc")
        new_lyrics = os.path.join(target_dir, f"{safe_title}.lrc")
        if os.path.exists(old_lyrics):
            if os.path.exists(new_lyrics): os.remove(new_lyrics)
            os.rename(old_lyrics, new_lyrics)

        if ext == ".mp4":
            old_converted = os.path.join(target_dir, f"{safe_title}_converted.mp3")
            main_mp3 = os.path.join(target_dir, f"{safe_title}.mp3")
            if os.path.exists(old_converted):
                if os.path.exists(main_mp3): os.remove(main_mp3)
                os.rename(old_converted, main_mp3)

        old_vocal = os.path.join(target_dir, f"{safe_title}_vocal.mp3")
        if os.path.exists(old_vocal): os.remove(old_vocal)
        flag_file = os.path.join(target_dir, f"{safe_title}_completed.txt")
        if os.path.exists(flag_file): os.remove(flag_file)

        final_mp3 = os.path.join(target_dir, f"{safe_title}.mp3")
        final_beat = os.path.join(target_dir, f"{safe_title}_beat.mp3")
        cover_jpg = os.path.join(target_dir, f"{safe_title}.jpg")

        if os.path.exists(final_mp3): embed_metadata(final_mp3, original_title, uploader, cover_jpg)
        if os.path.exists(final_beat): embed_metadata(final_beat, f"{original_title} (Beat)", uploader, cover_jpg)

        final_mp4 = os.path.join(target_dir, f"{safe_title}.mp4")
        if ext == ".mp4" and full_file_path != final_mp4:
            if os.path.exists(full_file_path):
                import shutil
                shutil.copy2(full_file_path, final_mp4)

        print(f"✅ [AI Pipeline] Đã hoàn thành trọn vẹn combo 5 tài nguyên cho: {safe_title}")
    except Exception as e:
        print(f"❌ [AI Pipeline Lỗi]: {str(e)}")

class YTDLInfoRequest(BaseModel):
    url: str

class YTDLDownloadRequest(BaseModel):
    url: str
    format: str
    quality: str
    title: str

@router.post("/info")
async def get_video_info(req: YTDLInfoRequest):
    python_expanded = os.path.expanduser("~/myenv/bin/python3")
    args = [python_expanded, "-m", "yt_dlp", "--dump-json", "--no-warnings", "--no-playlist", req.url]
    try:
        result = await asyncio.to_thread(subprocess.run, args, capture_output=True, text=True)
        if result.returncode != 0: raise Exception(f"yt-dlp error: {result.stderr}")
        info = json.loads(result.stdout)
        duration = info.get("duration", 0)

        audio_320_size = round((duration * 320) / 8192, 1) if duration else 0
        audio_128_size = round((duration * 128) / 8192, 1) if duration else 0
        best_audio_size = 0
        for f in info.get("formats", []):
            if f.get("acodec") != "none" and f.get("vcodec") == "none":
                size = f.get("filesize") or f.get("filesize_approx") or 0
                if size > best_audio_size: best_audio_size = size

        video_sizes = {}
        for f in info.get("formats", []):
            h = f.get("height")
            if h and h > 0 and f.get("vcodec") != "none":
                size = f.get("filesize") or f.get("filesize_approx") or 0
                if f.get("acodec") == "none": size += best_audio_size
                size_mb = round(size / (1024 * 1024), 1)
                if h not in video_sizes or size_mb > video_sizes[h]: video_sizes[h] = size_mb

        resolutions = [{"height": h, "size": f"{video_sizes[h]} MB" if video_sizes[h] > 0 else "Chưa rõ"} for h in sorted(video_sizes.keys(), reverse=True)]
        return {
            "status": "success", "title": info.get("title", "YouTube Video"), "thumbnail": info.get("thumbnail", ""),
            "resolutions": resolutions, "audio_sizes": {"320": f"{audio_320_size} MB", "128": f"{audio_128_size} MB"}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/download")
async def process_download(req: YTDLDownloadRequest, background_tasks: BackgroundTasks, authorization: str = Header(None)):
    try:
        is_admin = False
        if authorization and authorization.startswith("Bearer "):
            token = authorization.split(" ")[1]
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
                if payload.get("role") == 1: is_admin = True
            except: pass

        safe_title = sanitize_title(req.title)

        if is_admin:
            save_dir = os.path.join(MUSIC_DIR, safe_title)
            out_tmpl = os.path.join(save_dir, f"{safe_title}.%(ext)s")
        else:
            folder_guest = f"{safe_title}_{datetime.now().strftime('%H%M%S')}"
            save_dir = os.path.join(PENDING_DIR, folder_guest)
            out_tmpl = os.path.join(save_dir, f"d4m-dev_{safe_title}.%(ext)s")
            os.makedirs(save_dir, exist_ok=True)

        python_expanded = os.path.expanduser("~/myenv/bin/python3")
        thumbnail_cmd = "--write-thumbnail --convert-thumbnails jpg" if is_admin else ""
        yt_dlp_base = [python_expanded, "-m", "yt_dlp", "--concurrent-fragments", "5", "--no-warnings", "--no-playlist"]
        if thumbnail_cmd: yt_dlp_base.extend(thumbnail_cmd.split())

        if req.format == "mp3":
            audio_q = "0" if req.quality == "320" else "5"
            args = yt_dlp_base + ["-f", "bestaudio/best", "-x", "--audio-format", "mp3", "--audio-quality", audio_q, "-o", out_tmpl, req.url]
        else:
            args = yt_dlp_base + ["-f", f"bestvideo[height<={req.quality}][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best", "--merge-output-format", "mp4", "-o", out_tmpl, req.url]

        result = await asyncio.to_thread(subprocess.run, args, capture_output=True, text=True)
        if result.returncode != 0: raise Exception(f"Lỗi tiến trình yt-dlp: {result.stderr}")

        downloaded_file = None
        target_prefix = f"{safe_title}" if is_admin else f"d4m-dev_{safe_title}"
        for f in os.listdir(save_dir):
            if f.startswith(target_prefix) and f.endswith(req.format):
                downloaded_file = f
                break
        if not downloaded_file: raise Exception("Hệ thống tải thành công nhưng tệp không xuất hiện.")
        full_file_path = os.path.join(save_dir, downloaded_file)

        if is_admin:
            # 🚀 TỐI ƯU: Ném thẳng lệnh xử lý Demucs vào Hàng đợi Celery để chống đứng máy
            from core.tasks import task_admin_ytdl_pipeline
            task_admin_ytdl_pipeline.delay(full_file_path, safe_title, f".{req.format}", req.title, "YouTube Music")
            write_log("admin", safe_title, f"Sếp đã tải và đẩy bóc tách AI: {downloaded_file}")
        else:
            write_log("guest", folder_guest, f"Khách tải: {downloaded_file}")
            background_tasks.add_task(run_cleanup_task)

        return {
            "status": "success", "file_name": downloaded_file,
            "download_url": f"/api/ytdl/file/{quote(os.path.basename(save_dir))}/{quote(downloaded_file)}"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class YTDLSearchRequest(BaseModel):
    query: str

@router.post("/search")
async def search_youtube(req: YTDLSearchRequest):
    python_expanded = os.path.expanduser("~/myenv/bin/python3")
    safe_query = req.query.replace('"', '').replace("'", "")
    args = [python_expanded, "-m", "yt_dlp", f"ytsearch40:{safe_query}", "--dump-json", "--no-warnings", "--flat-playlist"]
    try:
        result = await asyncio.to_thread(subprocess.run, args, capture_output=True, text=True)
        search_results = []
        for line in result.stdout.strip().split('\n'):
            if line.strip():
                try:
                    data = json.loads(line)
                    dur = data.get("duration", 0)
                    dur_str = f"{int(dur//60)}:{int(dur%60):02d}" if dur else "?:??"
                    search_results.append({
                        "id": data.get("id"), "title": data.get("title"), "thumbnail": f"https://i.ytimg.com/vi/{data.get('id')}/mqdefault.jpg",
                        "uploader": data.get("uploader") or data.get("channel") or "Unknown", "duration": dur_str
                    })
                except: continue
        return {"status": "success", "results": search_results}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@router.get("/trending")
async def get_trending():
    python_expanded = os.path.expanduser("~/myenv/bin/python3")
    args = [python_expanded, "-m", "yt_dlp", "ytsearch40:nhac tre thinh hanh moi nhat", "--dump-json", "--no-warnings", "--flat-playlist"]
    try:
        result = await asyncio.to_thread(subprocess.run, args, capture_output=True, text=True)
        results = []
        for line in result.stdout.strip().split('\n'):
            if line.strip():
                try:
                    data = json.loads(line)
                    v_id = data.get("id") or data.get("url")
                    if not v_id: continue
                    if "watch?v=" in str(v_id): v_id = str(v_id).split("watch?v=")[1].split("&")[0]
                    dur = data.get("duration")
                    dur_str = f"{int(dur//60)}:{int(dur%60):02d}" if dur else "🔥 Hot"
                    results.append({
                        "id": v_id, "title": data.get("title") or "YouTube Video", "thumbnail": f"https://i.ytimg.com/vi/{v_id}/mqdefault.jpg",
                        "uploader": data.get("uploader") or data.get("channel") or data.get("author") or "YouTube Music", "duration": dur_str
                    })
                except: continue
        return {"status": "success", "results": results}
    except Exception as e:
        return {"status": "error", "results": []}

@router.get("/file/{folder_name}/{file_name}")
async def serve_download_file(folder_name: str, file_name: str):
    decoded_folder = unquote(folder_name)
    decoded_file = unquote(file_name)
    path_admin = os.path.join(MUSIC_DIR, decoded_folder, decoded_file)
    path_guest = os.path.join(PENDING_DIR, decoded_folder, decoded_file)
    if os.path.exists(path_admin): file_path = path_admin
    elif os.path.exists(path_guest): file_path = path_guest
    else: raise HTTPException(status_code=404, detail="Trái đất không tìm thấy file này! Có thể đã bị xóa.")
    return FileResponse(path=file_path, filename=decoded_file, media_type='application/octet-stream')