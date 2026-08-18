import os
import asyncio
import httpx
import subprocess
import re
from datetime import datetime
from core.config import settings
from core.tg_utils import send_telegram_message

# --- LUỒNG XỬ LÝ DEMUCS & WHISPER ---
async def trigger_audio_processing(chat_id: str, file_id: str, chosen_name: str, original_filename: str, option: str):
    await send_telegram_message(f"📥 <b>Đang nạp file:</b> <code>{chosen_name}</code>...")
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            file_res = await client.get(f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/getFile?file_id={file_id}")
            resp_data = file_res.json()
            if not resp_data.get("ok"): raise Exception(f"Telegram từ chối tải: {resp_data.get('description')}")
                
            tg_file_path = resp_data["result"]["file_path"]
            download_url = f"https://api.telegram.org/file/bot{settings.TELEGRAM_BOT_TOKEN}/{tg_file_path}"
            
            from api.audio_engine import sanitize_folder_name, process_audio_pipeline, WORKSPACE_DIR
            TELEGRAM_DIR = os.path.join(WORKSPACE_DIR, "telegram")
            os.makedirs(TELEGRAM_DIR, exist_ok=True)
            
            clean_name, _ = sanitize_folder_name(chosen_name)
            _, ext = sanitize_folder_name(original_filename)
            task_id = f"{clean_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            project_dir = os.path.join(TELEGRAM_DIR, clean_name)
            os.makedirs(project_dir, exist_ok=True)
            
            saved_input_path = os.path.join(project_dir, f"{task_id}{ext}")
            file_data = await client.get(download_url)
            with open(saved_input_path, "wb") as f: f.write(file_data.content)
                
            separate_beat = option in ["vocal", "beat", "all"]
            extract_lyrics = option in ["lyric", "all"]
            
            await send_telegram_message(f"⚙️ <b>Đang chạy AI trích xuất:</b> {clean_name}")
            await asyncio.to_thread(process_audio_pipeline, saved_input_path, clean_name, task_id, ext, separate_beat, extract_lyrics, TELEGRAM_DIR, TELEGRAM_DIR)
            
            files_to_send = []
            if option in ["vocal", "all"]: files_to_send.append(f"{task_id}_vocal.mp3")
            if option in ["beat", "all"]: files_to_send.append(f"{task_id}_beat.mp3")
            if option in ["lyric", "all"]: files_to_send.append(f"{task_id}_lyrics.lrc")
            
            await send_telegram_message(f"✅ <b>AI đã xong:</b> Đang gửi {clean_name}...")
            for f_name in files_to_send:
                f_path = os.path.join(project_dir, f_name)
                if os.path.exists(f_path):
                    with open(f_path, "rb") as f:
                        await client.post(f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendDocument", data={"chat_id": chat_id}, files={"document": f}, timeout=120.0)
    except Exception as e:
        await send_telegram_message(f"❌ Lỗi hạ tầng Audio: {e}")

# --- LUỒNG TẢI YOUTUBE ĐA LUỒNG ---
async def trigger_ytdl_download(chat_id: str, task_info: dict, quality: str):
    url = task_info["url"]
    fmt = task_info["format"]
    title = task_info["title"]
    
    await send_telegram_message(f"🚀 <b>Đang kéo dữ liệu:</b> <code>{title}</code>\n⏳ Khởi động động cơ 5 luồng siêu tốc...")
    try:
        safe_title = re.sub(r'[\\/*?:"<>|]', "", title).strip() or "Unknown_Video"
        from api.audio_engine import WORKSPACE_DIR
        task_dir = os.path.join(WORKSPACE_DIR, "youtube", safe_title)
        os.makedirs(task_dir, exist_ok=True)
        
        out_tmpl = os.path.join(task_dir, f"d4m-dev_{safe_title}.%(ext)s")
        python_exec = os.path.expanduser("~/myenv/bin/python3")
        
        yt_dlp_base = f'"{python_exec}" -m yt_dlp --concurrent-fragments 5 --no-warnings --no-playlist'
        
        if fmt == "mp3":
            audio_q = "0" if quality == "320" else "5"
            cmd = f'{yt_dlp_base} -f "bestaudio/best" -x --audio-format mp3 --audio-quality {audio_q} -o "{out_tmpl}" "{url}"'
            send_method, file_key = "sendAudio", "audio"
        else:
            cmd = f'{yt_dlp_base} -f "bestvideo[height<={quality}]+bestaudio/best[height<={quality}]/best" --merge-output-format mp4 -o "{out_tmpl}" "{url}"'
            send_method, file_key = "sendVideo", "video"
            
        res = await asyncio.to_thread(subprocess.run, cmd, shell=True, capture_output=True, text=True)
        if res.returncode != 0: raise Exception(f"Lỗi tải yt-dlp: {res.stderr}")
            
        downloaded_file = None
        for f in os.listdir(task_dir):
            if f.startswith(f"d4m-dev_{safe_title}") and os.path.isfile(os.path.join(task_dir, f)):
                downloaded_file = os.path.join(task_dir, f)
                break
                
        if not downloaded_file: raise Exception("Tải xong nhưng mất file.")
        
        file_size_mb = os.path.getsize(downloaded_file) / (1024 * 1024)
        if file_size_mb > 49.5:
            from urllib.parse import quote
            tunnel_url = ""
            try:
                from scripts.network_tunnel import get_tunnel_url
                tunnel_url = get_tunnel_url()
            except: pass
            
            base_url = tunnel_url if tunnel_url else "http://192.168.110.123:16868"
            web_deep_link = f"{base_url}/yt-downloader?url={quote(url)}"
            
            kb = {"inline_keyboard": [[{"text": "🌐 Mở Web Tải Trực Tiếp", "url": web_deep_link}]]}
            await send_telegram_message(
                f"⚠️ <b>File đã tải xong nhưng nặng {file_size_mb:.1f} MB!</b>\n"
                f"Giới hạn của Telegram API là 50MB.", reply_markup=kb)
            return
            
        await send_telegram_message(f"✅ <b>Đã lưu kho ({file_size_mb:.1f} MB):</b> Đang bắn lên Telegram...")
        
        async with httpx.AsyncClient(timeout=None) as client:
            with open(downloaded_file, "rb") as f:
                tg_res = await client.post(f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/{send_method}", data={"chat_id": chat_id}, files={file_key: f})
                if tg_res.status_code != 200: raise Exception(f"Telegram từ chối: {tg_res.text}")
                    
    except Exception as e:
        await send_telegram_message(f"❌ <b>Lỗi tải YouTube:</b> {e}")


# ==========================================
# 🚀 CHAT AI J.A.R.V.I.S TELEGRAM
# ==========================================
SHIFT_TIME_MAP = {
    "M5": ("05:00", "13:00"), "M6": ("06:00", "14:00"), "M7": ("07:00", "15:00"), "M8": ("08:00", "16:00"), "M9": ("09:00", "17:00"), "M10": ("10:00", "18:00"),
    "A11": ("11:00", "19:00"), "A12": ("12:00", "20:00"), "A1": ("13:00", "21:00"), "A2": ("14:00", "22:00"), "A3": ("15:00", "23:00"), "A4": ("16:00", "00:00"), "A5": ("17:00", "01:00"), "A6": ("18:00", "02:00"),
    "N7": ("19:00", "03:00"), "N8": ("20:00", "04:00"), "N9": ("21:00", "05:00"), "N10": ("22:00", "06:00")
}

async def trigger_jarvis_ai(chat_id: str, text: str):
    async with httpx.AsyncClient() as client:
        await client.post(f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendChatAction", json={"chat_id": chat_id, "action": "typing"})
    
    try:
        from google import genai
        import json, re, time
        from datetime import datetime
        from core.database import db_inserter, db_executor
        from api.dashboard import api_status_db
        from scripts.network_tunnel import start_tunnel, stop_tunnel
        
        client_ai = genai.Client(api_key=settings.GEMINI_API_KEY)
        try:
            available_models = [m.name.replace('models/', '') for m in client_ai.models.list() if 'gemini' in m.name.lower()]
            chosen_model = next((m for m in available_models if 'gemini-1.5-flash' in m), available_models[0])
        except:
            chosen_model = 'gemini-1.5-flash'

        now = datetime.now()
        weekdays = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"]
        now_str = f"{weekdays[int(now.strftime('%w'))]}, ngày {now.strftime('%d/%m/%Y, %H:%M')}"
        current_status = "\n".join([f"- {k}: {'ĐANG BẬT' if v['active'] else 'ĐANG TẮT'}" for k, v in api_status_db.items()])
        
        try:
            sql_sch = """SELECT work_date, shift_name, start_time, end_time, is_off 
                         FROM work_schedules 
                         WHERE work_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
                         AND work_date <= DATE_ADD(CURDATE(), INTERVAL 21 DAY) 
                         ORDER BY work_date ASC"""
            raw_sch = db_executor.select_as_list_dict(sql_sch)
            sch_text = "DỮ LIỆU LỊCH TRÌNH TRONG DB:\n"
            if raw_sch:
                for s in raw_sch:
                    d_str = s['work_date'].strftime('%Y-%m-%d') if hasattr(s['work_date'], 'strftime') else str(s['work_date'])[:10]
                    if s.get('is_off'): sch_text += f"- Ngày {d_str}: NGHỈ LÀM (OFF)\n"
                    else: sch_text += f"- Ngày {d_str}: Ca {s.get('shift_name')}\n"
            else:
                sch_text += "- Chưa có lịch trình.\n"
        except Exception:
            sch_text = ""

        system_prompt = f"""
        Bạn là J.A.R.V.I.S.
        Thời gian: {now_str}. 
        {current_status}
        {sch_text}

        QUY TẮC:
        1. BẬT/TẮT DỊCH VỤ: `[TOGGLE: ten_dich_vu]`
        2. LỊCH LÀM: 18 ca (M5..M10, A11..A6, N7..N10). Nếu nghỉ là OFF.
           Chèn JSON vào cuối (Chỉ cần date, shift_name, is_off):
           [SCHEDULE_DATA: [{{"date": "YYYY-MM-DD", "shift_name": "N10", "is_off": false}}, ...]]

        Yêu cầu Sếp: {text}
        """

        response = await asyncio.to_thread(client_ai.models.generate_content, model=chosen_model, contents=system_prompt)
        reply_text = response.text
        action_taken = ""

        match_toggle = re.search(r'\[TOGGLE:\s*([a-zA-Z0-9_]+)\]', reply_text)
        if match_toggle:
            target_service = match_toggle.group(1).strip()
            if target_service in api_status_db:
                new_state = not api_status_db[target_service]["active"]
                if target_service == "internet_tunnel": start_tunnel() if new_state else stop_tunnel()
                api_status_db[target_service]["active"] = new_state
                action_taken = f"Đã {'BẬT' if new_state else 'TẮT'} {target_service}"
            reply_text = re.sub(r'\[TOGGLE:\s*([a-zA-Z0-9_]+)\]', '', reply_text).strip()

        match_schedule = re.search(r'\[SCHEDULE_DATA:\s*(\[.*\])\s*\]', reply_text, re.DOTALL)
        if match_schedule:
            schedule_json_str = match_schedule.group(1)
            try:
                schedules = json.loads(schedule_json_str)
                user_id = 1
                inserted_count = 0
                for sch in schedules:
                    is_off = 1 if sch.get('is_off') else 0
                    safe_shift = sch.get('shift_name') or 'OFF'
                    work_date = sch.get('date')
                    
                    # 🚀 CORE XỬ LÝ GIỜ BẰNG DICTIONARY (KHÔNG CHO AI TÍNH NỮA)
                    if is_off or safe_shift == 'OFF':
                        s_time, e_time = None, None
                    else:
                        s_time, e_time = SHIFT_TIME_MAP.get(safe_shift.upper(), ("00:00", "08:00"))
                    
                    check_sql = f"SELECT id, gcal_event_id FROM work_schedules WHERE work_date='{work_date}'"
                    existing_records = db_executor.select_as_list_dict(check_sql)
                    
                    existing_gcal_id = None
                    if existing_records:
                        for ex in existing_records:
                            if ex.get('gcal_event_id'):
                                existing_gcal_id = ex.get('gcal_event_id')
                                break
                        db_inserter.insert(f"DELETE FROM work_schedules WHERE work_date='{work_date}'", ())

                    gcal_id = None
                    try:
                        from core.gcal import add_event
                        gcal_id = add_event(
                            date_str=work_date, shift_name=safe_shift,
                            start_time=s_time, end_time=e_time,
                            is_off=is_off, event_id=existing_gcal_id
                        )
                    except Exception: pass

                    sql = '''INSERT INTO work_schedules 
                             (user_id, work_date, shift_name, start_time, end_time, is_off, gcal_event_id) 
                             VALUES (%s, %s, %s, %s, %s, %s, %s)'''
                    db_inserter.insert(sql, (user_id, work_date, safe_shift, s_time, e_time, is_off, gcal_id))
                    inserted_count += 1
                
                msg_sch = f"Đã cập nhật {inserted_count} lịch làm việc."
                action_taken = f"{action_taken} | {msg_sch}" if action_taken else msg_sch
            except Exception as json_err:
                print(f"Lỗi JSON: {json_err}")
            
            reply_text = re.sub(r'\[SCHEDULE_DATA:\s*\[.*\]\s*\]', '', reply_text, flags=re.DOTALL).strip()

        final_msg = f"🤖 <b>J.A.R.V.I.S:</b>\n\n{reply_text}"
        if action_taken: final_msg += f"\n\n⚡ <i>{action_taken}</i>"
            
        await send_telegram_message(final_msg)
    except Exception as e:
        await send_telegram_message(f"❌ <b>Lỗi xử lý AI:</b> {str(e)}")