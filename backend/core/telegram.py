import asyncio
import httpx
import psutil
import os
import shutil
import subprocess
import re
import time
import json
import uuid
import sys
from urllib.parse import quote
from core.config import settings

# Lấy đồ nghề từ các file vệ tinh
from core.tg_utils import get_device_battery, create_backup_zip, send_telegram_message, send_telegram_menu
from core.tg_handlers import trigger_audio_processing, trigger_ytdl_download, trigger_jarvis_ai

# 🚀 IMPORT BỘ LẬP LỊCH TÁC VỤ NGẦM
from core.tg_scheduler import run_scheduler

# BỘ NHỚ TRẠNG THÁI
pending_audio_tasks = {}
pending_ytdl_tasks = {}

def get_web_ui_url(yt_url):
    return f"https://d4mdev.click/yt-downloader?url={quote(yt_url)}"

async def telegram_polling_task():
    if not settings.TELEGRAM_BOT_TOKEN: return
    print(f"🤖 Trợ lý Telegram đã khởi động! Đang chờ lệnh từ Sếp...")
    
    # Cắm điện cho trạm lập lịch
    asyncio.create_task(run_scheduler())
    
    update_id = 0
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/getUpdates"
    
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    RESTART_LOCK_FILE = os.path.join(BASE_DIR, ".restart_lock")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        while True:
            try:
                res = await client.get(url, params={"offset": update_id, "timeout": 20})
                if res.status_code == 200:
                    data = res.json()
                    for update in data.get("result", []):
                        update_id = update["update_id"] + 1
                        
                        # ==========================================
                        # 1. TIẾP NHẬN FILE TỪ MÁY
                        # ==========================================
                        if "message" in update and str(update["message"]["chat"]["id"]) == str(settings.TELEGRAM_CHAT_ID):
                            msg = update["message"]
                            chat_id = str(msg["chat"]["id"])
                            file_id, file_name = None, "telegram_audio.mp3"
                            
                            if "audio" in msg: file_id, file_name = msg["audio"]["file_id"], msg["audio"].get("file_name", file_name)
                            elif "document" in msg: file_id, file_name = msg["document"]["file_id"], msg["document"].get("file_name", file_name)
                            elif "video" in msg: file_id, file_name = msg["video"]["file_id"], msg["video"].get("file_name", "telegram_video.mp4")
                                
                            if file_id:
                                custom_caption = msg.get("caption", "").strip()
                                suggested_name = custom_caption if custom_caption else file_name.split('.')[0]
                                pending_audio_tasks[chat_id] = {
                                    "step": "name", "file_id": file_id, "original_filename": file_name,
                                    "suggested_name": suggested_name, "chosen_name": ""
                                }
                                keyboard = {"inline_keyboard": [
                                    [{"text": f"✅ Dùng tên: {suggested_name}", "callback_data": "confirm_audio_name"}],
                                    [{"text": "❌ Hủy bỏ", "callback_data": "cancel_audio_name"}]
                                ]}
                                await send_telegram_message("📥 <b>Bot đã nhận tệp!</b>\n\nSếp muốn đặt tên dự án là gì?\n✏️ Gõ tin nhắn để nhập tên mới:", reply_markup=keyboard)
                                continue

                        # ==========================================
                        # 2. XỬ LÝ LỆNH VĂN BẢN (TEXT/LINKS)
                        # ==========================================
                        if "message" in update and "text" in update["message"]:
                            text = update["message"]["text"].strip()
                            chat_id = str(update["message"]["chat"]["id"])
                            
                            if chat_id == str(settings.TELEGRAM_CHAT_ID).strip():
                                
                                # A. Đặt tên Dự án Audio
                                if chat_id in pending_audio_tasks and pending_audio_tasks[chat_id].get("step") == "name" and not text.startswith(">") and not re.search(r'^\/', text):
                                    pending_audio_tasks[chat_id]["chosen_name"] = text
                                    pending_audio_tasks[chat_id]["step"] = "option"
                                    kb_options = {"inline_keyboard": [
                                        [{"text": "🎤 Tách Giọng", "callback_data": "extract_vocal"}, {"text": "🥁 Tách Nhạc", "callback_data": "extract_beat"}],
                                        [{"text": "📝 Tìm Lời bài hát (.lrc)", "callback_data": "extract_lyric"}],
                                        [{"text": "🌟 Xử lý TẤT CẢ", "callback_data": "extract_all"}],
                                        [{"text": "❌ Hủy bỏ", "callback_data": "cancel_audio_name"}]
                                    ]}
                                    await send_telegram_message(f"✅ Đã chốt tên: <b>{text}</b>\nChọn chức năng:", reply_markup=kb_options)
                                    continue
                                
                                # B. YOUTUBE PRO: TÍCH HỢP BỘ LỌC 50MB VÀ DEEP LINK WEB
                                yt_match = re.search(r'(?:tải|tai|download)?\s*(mp3|mp4|video|audio)?\s*(https?://(?:www\.)?(?:youtube\.com|youtu\.be)[^\s]+)', text, re.IGNORECASE)
                                if yt_match:
                                    fmt_str = yt_match.group(1).lower() if yt_match.group(1) else None
                                    yt_url = yt_match.group(2)
                                    req_fmt = 'mp3' if fmt_str in ['mp3', 'audio'] else 'mp4' if fmt_str in ['mp4', 'video'] else None
                                    
                                    await send_telegram_message("⏳ <b>Đang quét vệ tinh YouTube...</b>")
                                    try:
                                        python_exec = os.path.expanduser("~/myenv/bin/python3")
                                        cmd = f'"{python_exec}" -m yt_dlp --dump-json --no-warnings --no-playlist "{yt_url}"'
                                        res_cmd = await asyncio.to_thread(subprocess.run, cmd, shell=True, capture_output=True, text=True)
                                        
                                        if res_cmd.returncode != 0: raise Exception(f"Không thể phân tích video này.\nChi tiết: {res_cmd.stderr[:200]}")
                                        
                                        info = json.loads(res_cmd.stdout)
                                        duration = info.get("duration", 0)
                                        
                                        audio_320_size = round((duration * 320) / 8192, 1) if duration else 0
                                        audio_128_size = round((duration * 128) / 8192, 1) if duration else 0
                                        
                                        best_audio_size = 0
                                        for f in info.get("formats", []):
                                            if f.get("acodec") != "none" and f.get("vcodec") == "none":
                                                s = f.get("filesize") or f.get("filesize_approx") or 0
                                                if s > best_audio_size: best_audio_size = s
                                                
                                        video_sizes = {}
                                        for f in info.get("formats", []):
                                            h = f.get("height")
                                            if h and h > 0 and f.get("vcodec") != "none":
                                                s = f.get("filesize") or f.get("filesize_approx") or 0
                                                if f.get("acodec") == "none": s += best_audio_size
                                                mb = round(s / (1024 * 1024), 1)
                                                if h not in video_sizes or mb > video_sizes[h]: video_sizes[h] = mb
                                        
                                        task_id = str(uuid.uuid4())[:8]
                                        safe_title = info.get("title", "YouTube Video")
                                        
                                        web_deep_link = get_web_ui_url(yt_url)
                                        
                                        pending_ytdl_tasks[chat_id] = {
                                            "task_id": task_id, "url": yt_url, "title": safe_title,
                                            "video_sizes": video_sizes, "audio_320": audio_320_size,
                                            "audio_128": audio_128_size, "format": req_fmt
                                        }
                                        
                                        if req_fmt == "mp4":
                                            kb = {"inline_keyboard": []}
                                            has_large_files = False
                                            for h in sorted(video_sizes.keys(), reverse=True):
                                                sz = video_sizes[h]
                                                if sz <= 49.5:
                                                    btn_text = f"🎬 {h}p • {sz} MB" if sz > 0 else f"🎬 {h}p"
                                                    kb["inline_keyboard"].append([{"text": btn_text, "callback_data": f"ytdl_dl_{task_id}_{h}"}])
                                                else: has_large_files = True
                                            if has_large_files:
                                                kb["inline_keyboard"].append([{"text": "🌐 Tải chất lượng cao (>50MB)", "url": web_deep_link}])
                                                
                                            await send_telegram_message(f"🎬 <b>{safe_title}</b>\nSếp chọn độ phân giải MP4:", reply_markup=kb)
                                            
                                        elif req_fmt == "mp3":
                                            kb = {"inline_keyboard": []}
                                            has_large_mp3 = False
                                            if audio_320_size <= 49.5: kb["inline_keyboard"].append([{"text": f"🎧 320kbps • {audio_320_size} MB", "callback_data": f"ytdl_dl_{task_id}_320"}])
                                            else: has_large_mp3 = True
                                            
                                            if audio_128_size <= 49.5: kb["inline_keyboard"].append([{"text": f"🎵 128kbps • {audio_128_size} MB", "callback_data": f"ytdl_dl_{task_id}_128"}])
                                            else: has_large_mp3 = True
                                            
                                            if has_large_mp3: kb["inline_keyboard"].append([{"text": "🌐 Tải Âm thanh quá lớn (>50MB)", "url": web_deep_link}])
                                            await send_telegram_message(f"🎧 <b>{safe_title}</b>\nSếp chọn chất lượng MP3:", reply_markup=kb)
                                            
                                        else:
                                            kb = {"inline_keyboard": [
                                                [{"text": "🎬 Tải Video (MP4)", "callback_data": f"ytdl_fmt_{task_id}_mp4"}],
                                                [{"text": "🎧 Tải Âm thanh (MP3)", "callback_data": f"ytdl_fmt_{task_id}_mp3"}]
                                            ]}
                                            await send_telegram_message(f"🎥 <b>{safe_title}</b>\nSếp muốn tải định dạng nào?", reply_markup=kb)
                                    except Exception as e: await send_telegram_message(f"❌ Lỗi YouTube: {e}")
                                    continue
                                
                                # C. Terminal & Menu Khác
                                if text.startswith(">"):
                                    try:
                                        result = await asyncio.to_thread(subprocess.run, text[1:].strip(), shell=True, capture_output=True, text=True, timeout=15)
                                        output = result.stdout or result.stderr or "✅ Lệnh chạy thành công."
                                        await send_telegram_message(f"📟 <b>Terminal:</b>\n<pre>{output[:3900]}</pre>")
                                    except Exception as e: await send_telegram_message(f"❌ Lỗi Terminal: {e}")
                                        
                                elif text in ["/start", "/menu", "menu"]: await send_telegram_menu()
                                        
                                elif text.startswith("/weather"):
                                    city = text.split(maxsplit=1)[1] if len(text.split()) > 1 else "Phu Quoc"
                                    try:
                                        w_res = await client.get(f"https://vi.wttr.in/{city}?format=%C|%t|%h|%w", timeout=10.0)
                                        if w_res.status_code == 200: await send_telegram_message(f"🌤️ <b>{city.upper()}</b>: {w_res.text}")
                                    except Exception as e: await send_telegram_message(f"❌ Lỗi thời tiết: {e}")
                                        
                                # D. LỆNH DJ ÂM NHẠC
                                elif re.search(r'^(bật|phát|nghe|mở|tìm|cho\s+sếp)\b', text.lower()):
                                    text_lower = text.lower()
                                    is_video = bool(re.search(r'\b(video|mv|mp4)\b', text_lower))
                                    is_beat = bool(re.search(r'\b(beat|karaoke|nhạc nền|không lời)\b', text_lower))
                                    song_name = re.sub(r'^(bật|phát|nghe|mở|tìm|cho\s+sếp|xin|cái|bản|nhạc|bài\s+hát|bài|video|mv|beat|karaoke|của)\s+', '', text_lower).strip()
                                    song_name = re.sub(r'\s+(nhé|nha|đi\s+em|đi|nữa|giúp\s+sếp|với)$', '', song_name).strip()
                                    
                                    if not song_name: continue

                                    MUSIC_DIR = os.path.join(BASE_DIR, "audio_workspace", "music")
                                    found_folder = next((f for f in os.listdir(MUSIC_DIR) if song_name.replace(" ", "") in f.replace("-", "").replace("_", "").lower()), None) if os.path.exists(MUSIC_DIR) else None
                                    
                                    if found_folder:
                                        file_path = os.path.join(MUSIC_DIR, found_folder, "4.mp4" if is_video else ("3.mp3" if is_beat else "2.mp3"))
                                        if not os.path.exists(file_path): file_path = os.path.join(MUSIC_DIR, found_folder, "2.mp3")
                                        if os.path.exists(file_path):
                                            await send_telegram_message(f"💿 <b>Đã tìm thấy bài:</b> <code>{found_folder}</code>")
                                            async with httpx.AsyncClient() as dl_client:
                                                with open(file_path, "rb") as f:
                                                    if file_path.endswith(".mp4"): await dl_client.post(f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendVideo", data={"chat_id": chat_id}, files={"video": f}, timeout=120.0)
                                                    else: await dl_client.post(f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendAudio", data={"chat_id": chat_id}, files={"audio": f}, timeout=120.0)
                                            continue 
                                            
                                    await send_telegram_message(f"🌐 Đang kích hoạt yt-dlp thăm dò: <b>{song_name}</b>...")
                                    try:
                                        from api.audio_engine import WORKSPACE_DIR
                                        TEMP_DL_DIR = os.path.join(WORKSPACE_DIR, "temp_downloads")
                                        tmp_id = str(uuid.uuid4())[:8]
                                        out_tmpl = os.path.join(TEMP_DL_DIR, f"dl_{tmp_id}.%(ext)s")
                                        yt_dlp_base = f'"{os.path.expanduser("~/myenv/bin/python3")}" -m yt_dlp'
                                        
                                        cmd = f'{yt_dlp_base} -f "best[ext=mp4]/best" "ytsearch1:{song_name} official mv" -o "{out_tmpl}" --max-filesize 45M' if is_video else f'{yt_dlp_base} -f "bestaudio" -x --audio-format mp3 "ytsearch1:{song_name} karaoke beat" -o "{out_tmpl}" --max-filesize 45M' if is_beat else f'{yt_dlp_base} -f "bestaudio" -x --audio-format mp3 "ytsearch1:{song_name} official audio" -o "{out_tmpl}" --max-filesize 45M'
                                        send_method, file_key = ("sendVideo", "video") if is_video else ("sendAudio", "audio")
                                        
                                        await asyncio.to_thread(subprocess.run, cmd, shell=True)
                                        dl_file = next((f for f in os.listdir(TEMP_DL_DIR) if f.startswith(f"dl_{tmp_id}")), None)
                                        if dl_file:
                                            async with httpx.AsyncClient() as dl_client:
                                                with open(os.path.join(TEMP_DL_DIR, dl_file), "rb") as f:
                                                    await dl_client.post(f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/{send_method}", data={"chat_id": chat_id}, files={file_key: f}, timeout=120.0)
                                            os.remove(os.path.join(TEMP_DL_DIR, dl_file))
                                    except Exception as e: await send_telegram_message(f"❌ Lỗi tải mạng: {e}")

                                else:
                                    asyncio.create_task(trigger_jarvis_ai(chat_id, text))
                                        
                        # ==========================================
                        # 3. XỬ LÝ NÚT BẤM (CALLBACK)
                        # ==========================================
                        elif "callback_query" in update:
                            cb = update["callback_query"]
                            data_cb = cb["data"]
                            cb_id = cb["id"]
                            chat_id = str(cb["message"]["chat"]["id"])
                            
                            if chat_id == str(settings.TELEGRAM_CHAT_ID).strip():
                                
                                if data_cb.startswith("ytdl_fmt_"):
                                    parts = data_cb.split("_")
                                    tid, fmt = parts[2], parts[3]
                                    if chat_id in pending_ytdl_tasks and pending_ytdl_tasks[chat_id]["task_id"] == tid:
                                        pending_ytdl_tasks[chat_id]["format"] = fmt
                                        task_info = pending_ytdl_tasks[chat_id]
                                        web_deep_link = get_web_ui_url(task_info["url"])
                                        
                                        if fmt == "mp4":
                                            kb = {"inline_keyboard": []}
                                            has_large_files = False
                                            for h in sorted(task_info["video_sizes"].keys(), reverse=True):
                                                sz = task_info["video_sizes"][h]
                                                if sz <= 49.5:
                                                    btn_text = f"🎬 {h}p • {sz} MB" if sz > 0 else f"🎬 {h}p"
                                                    kb["inline_keyboard"].append([{"text": btn_text, "callback_data": f"ytdl_dl_{tid}_{h}"}])
                                                else: has_large_files = True
                                            if has_large_files:
                                                kb["inline_keyboard"].append([{"text": "🌐 Tải chất lượng cao (>50MB)", "url": web_deep_link}])
                                            await send_telegram_message(f"🎬 <b>{task_info['title']}</b>\nChọn độ phân giải:", reply_markup=kb)
                                            
                                        elif fmt == "mp3":
                                            kb = {"inline_keyboard": []}
                                            a320, a128 = task_info['audio_320'], task_info['audio_128']
                                            has_large_mp3 = False
                                            if a320 <= 49.5: kb["inline_keyboard"].append([{"text": f"🎧 320kbps • {a320} MB", "callback_data": f"ytdl_dl_{tid}_320"}])
                                            else: has_large_mp3 = True
                                            if a128 <= 49.5: kb["inline_keyboard"].append([{"text": f"🎵 128kbps • {a128} MB", "callback_data": f"ytdl_dl_{tid}_128"}])
                                            else: has_large_mp3 = True
                                            if has_large_mp3: kb["inline_keyboard"].append([{"text": "🌐 Tải Âm thanh quá lớn (>50MB)", "url": web_deep_link}])
                                            await send_telegram_message(f"🎧 <b>{task_info['title']}</b>\nChọn chất lượng:", reply_markup=kb)
                                
                                elif data_cb.startswith("ytdl_dl_"):
                                    parts = data_cb.split("_")
                                    tid, quality = parts[2], parts[3]
                                    if chat_id in pending_ytdl_tasks and pending_ytdl_tasks[chat_id]["task_id"] == tid:
                                        task_info = pending_ytdl_tasks.pop(chat_id)
                                        asyncio.create_task(trigger_ytdl_download(chat_id, task_info, quality))
                                
                                elif data_cb == "confirm_audio_name":
                                    if chat_id in pending_audio_tasks and pending_audio_tasks[chat_id].get("step") == "name":
                                        suggested = pending_audio_tasks[chat_id]["suggested_name"]
                                        pending_audio_tasks[chat_id]["chosen_name"] = suggested
                                        pending_audio_tasks[chat_id]["step"] = "option"
                                        kb_options = {"inline_keyboard": [[{"text": "🎤 Tách Giọng", "callback_data": "extract_vocal"}, {"text": "🥁 Tách Nhạc", "callback_data": "extract_beat"}], [{"text": "🌟 Xử lý TẤT CẢ", "callback_data": "extract_all"}]]}
                                        await send_telegram_message(f"✅ Đã chốt tên: <b>{suggested}</b>", reply_markup=kb_options)
                                        
                                elif data_cb in ["extract_vocal", "extract_beat", "extract_lyric", "extract_all"]:
                                    if chat_id in pending_audio_tasks and pending_audio_tasks[chat_id].get("step") == "option":
                                        task_data = pending_audio_tasks.pop(chat_id)
                                        opt = "vocal" if "vocal" in data_cb else "beat" if "beat" in data_cb else "lyric" if "lyric" in data_cb else "all"
                                        asyncio.create_task(trigger_audio_processing(chat_id, task_data["file_id"], task_data["chosen_name"], task_data["original_filename"], opt))
                                
                                # -----------------------------------------------------
                                # 🚀 FIX 4 NÚT MENU THẦN THÁNH CỦA SẾP DƯỚI NÀY ĐÂY 🚀
                                # -----------------------------------------------------
                                from api.dashboard import api_status_db, save_status
                                from scripts.network_tunnel import start_tunnel, stop_tunnel, get_tunnel_url
                                
                                if data_cb == "toggle_tunnel":
                                    if not api_status_db["internet_tunnel"]["active"]:
                                        start_tunnel()
                                        api_status_db["internet_tunnel"]["active"] = True
                                        api_status_db["internet_tunnel"]["public_url"] = get_tunnel_url()
                                        save_status(api_status_db)
                                        await send_telegram_message(f"✅ Tunnel đã mở chạy ngầm!\n🌐 Link: {get_tunnel_url()}")
                                    else:
                                        stop_tunnel()
                                        api_status_db["internet_tunnel"]["active"] = False
                                        api_status_db["internet_tunnel"]["public_url"] = ""
                                        save_status(api_status_db)
                                        await send_telegram_message("🔴 Đã ngắt kết nối Cloudflare Tunnel!")
                                    await send_telegram_menu()
                                    
                                # 1. FIX GIÁM SÁT (Thêm Ổ cứng + Pin điện thoại/VPS)
                                elif data_cb == "server_stats":
                                    cpu = psutil.cpu_percent(interval=0.5)
                                    ram = psutil.virtual_memory()
                                    disk = psutil.disk_usage('/') # Đọc ổ lưu trữ gốc của VPS/Android
                                    bat = get_device_battery()
                                    
                                    msg = f"🎛️ <b>Thống Kê Máy Chủ Hệ Thống</b>\n\n"
                                    msg += f"🖥️ CPU: <b>{cpu}%</b>\n"
                                    msg += f"🧠 RAM: <b>{ram.percent}%</b> (Dùng: {round(ram.used/(1024**3), 2)}GB / Tổng: {round(ram.total/(1024**3), 2)}GB)\n"
                                    msg += f"💾 Ổ cứng: <b>{disk.percent}%</b> (Còn trống: {round(disk.free/(1024**3), 2)}GB)\n"
                                    msg += f"🔋 {bat}"
                                    await send_telegram_message(msg)

                                # 2. FIX TOP TIẾN TRÌNH (Bằng thư viện Python để chống lỗi nền tảng chéo)
                                elif data_cb == "top_processes":
                                    try:
                                        # Quét thẳng bằng lõi psutil, bao chạy trên cả Termux và Ubuntu
                                        processes = []
                                        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
                                            try: processes.append(proc.info)
                                            except: pass
                                        
                                        # Lọc ra 10 đứa ngốn CPU mạnh nhất
                                        processes = sorted(processes, key=lambda p: p['cpu_percent'], reverse=True)[:10]
                                        res_str = "PID   | TÊN TIẾN TRÌNH | CPU | RAM\n"
                                        res_str += "-"*35 + "\n"
                                        for p in processes:
                                            res_str += f"{p['pid']:<5} | {p['name'][:12]:<12} | {p['cpu_percent']}% | {round(p['memory_percent'], 1)}%\n"
                                        
                                        await send_telegram_message(f"🔬 <b>Top Tiến Trình Đang Chạy:</b>\n<pre>{res_str}</pre>")
                                    except Exception as e:
                                        await send_telegram_message(f"❌ Lỗi quét tiến trình: {e}")

                                # 3. FIX DỌN RÁC (Đã quét sạch rác Demucs/Whisper/Audio Tải Tạm)
                                elif data_cb == "clean_trash":
                                    await send_telegram_message("🧹 <b>Đang dọn dẹp rác hệ thống...</b>\n- Xóa file tải Youtube tạm thời\n- Xóa phôi rác AI Audio\n- Kích hoạt Cleanup tác vụ rác")
                                    try:
                                        from api.audio_engine import WORKSPACE_DIR
                                        # Xóa thư mục Youtube Tạm
                                        temp_dl = os.path.join(WORKSPACE_DIR, "temp_downloads")
                                        if os.path.exists(temp_dl): shutil.rmtree(temp_dl, ignore_errors=True)
                                        # Xóa thư mục AI Phôi (Demucs/Whisper) đang mắc kẹt
                                        for f in os.listdir(WORKSPACE_DIR):
                                            if f.startswith("temp_"):
                                                p = os.path.join(WORKSPACE_DIR, f)
                                                if os.path.isdir(p): shutil.rmtree(p, ignore_errors=True)
                                        
                                        # Kích hoạt luôn luồng dọn rác phụ của hệ thống sếp
                                        try:
                                            from api.cleanup import run_cleanup_task
                                            await asyncio.to_thread(run_cleanup_task)
                                        except: pass
                                        
                                        await send_telegram_message("✅ <b>Hoàn tất!</b> Hệ thống đã sạch sẽ 100%.")
                                    except Exception as e:
                                        await send_telegram_message(f"❌ Lỗi dọn rác: {e}")

                                elif data_cb == "backup_code":
                                    await send_telegram_message("📦 Đang đóng gói source code...")
                                    try:
                                        zip_file_path = await asyncio.to_thread(create_backup_zip)
                                        with open(zip_file_path, "rb") as f:
                                            await client.post(f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendDocument", data={"chat_id": chat_id}, files={"document": f}, timeout=60.0)
                                        os.remove(zip_file_path)
                                    except Exception as e: await send_telegram_message(f"❌ Lỗi sao lưu: {e}")

                                # 4. FIX KHỞI ĐỘNG LẠI (Sử dụng thuật toán Re-Spawn bằng Bash)
                                elif data_cb == "restart_api":
                                    await send_telegram_message("🔄 <b>Đang tái khởi động toàn bộ hệ thống...</b>\n<i>Quá trình này mất khoảng 5-10 giây, Sếp vui lòng đợi chút!</i>")
                                    await client.post(f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/answerCallbackQuery", json={"callback_query_id": cb_id})
                                    
                                    # Lệnh cực mạnh: Đợi 2 giây (để tin nhắn gửi đi thành công)
                                    # Kéo sập main.py và start_all.py đang chạy, rồi gọi bash gọi start_all.py mới tinh
                                    start_script = os.path.join(BASE_DIR, "start_all.py")
                                    cmd = f"(sleep 2 && pkill -f 'main.py' && pkill -f 'start_all.py' && nohup python3 {start_script} > /dev/null 2>&1 &) &"
                                    os.system(cmd)
                                    
                                    # Ép chết luồng Bot hiện tại để tiến trình mới tiếp quản
                                    sys.exit(0) 
                                
                                # Gửi cờ xác nhận với Telegram Server để nút bấm không bị "quay quay"
                                await client.post(f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/answerCallbackQuery", json={"callback_query_id": cb_id})
                                
            except Exception as e:
                await asyncio.sleep(5)
            await asyncio.sleep(1)