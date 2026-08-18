# -*- coding: utf-8 -*-
# Tên file: ubuntu-backend/services/ai_engine.py
import re
import time
import json
import logging
from datetime import datetime
from google import genai

from core.config import settings
from core.database import get_raw_logs, db_executor
from api.dashboard import api_status_db, save_status 
from core.tunnel import start_tunnel, stop_tunnel
from services.scheduler import batch_update_schedules_from_ai

def process_ai_chat(user_id: int, message: str) -> dict:
    if not settings.GEMINI_API_KEY:
        raise ValueError("Chưa cấu hình GEMINI_API_KEY.")

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    try:
        available_models = [m.name.replace('models/', '') for m in client.models.list() if 'gemini' in m.name.lower()]
        chosen_model = next((m for m in available_models if 'gemini-1.5-flash' in m), available_models[0])
    except:
        chosen_model = 'gemini-1.5-flash'

    # Thu thập dữ liệu ngữ cảnh cho J.A.R.V.I.S
    recent_logs = get_raw_logs(limit=30)
    current_status = "\n".join([f"- {k}: {'ĐANG BẬT' if v['active'] else 'ĐANG TẮT'}" for k, v in api_status_db.items()])
    
    now = datetime.now()
    weekdays = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"]
    now_str = f"{weekdays[int(now.strftime('%w'))]}, ngày {now.strftime('%d/%m/%Y, %H:%M')}"
    
    try:
        sql_sch = """SELECT work_date, shift_name, start_time, end_time, is_off 
                     FROM work_schedules 
                     WHERE work_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
                     AND work_date <= DATE_ADD(CURDATE(), INTERVAL 21 DAY) 
                     ORDER BY work_date ASC"""
        raw_sch = db_executor.select_as_list_dict(sql_sch)
        sch_text = "DỮ LIỆU LỊCH TRÌNH CỦA SẾP TRONG DATABASE:\n"
        if raw_sch:
            for s in raw_sch:
                d_str = s['work_date'].strftime('%Y-%m-%d') if hasattr(s['work_date'], 'strftime') else str(s['work_date'])[:10]
                if s.get('is_off'):
                    sch_text += f"- Ngày {d_str}: NGHỈ LÀM (OFF)\n"
                else:
                    sch_text += f"- Ngày {d_str}: Ca {s.get('shift_name')}\n"
        else:
            sch_text += "- Chưa có lịch trình nào được lưu.\n"
    except Exception:
        sch_text = ""
    
    system_prompt = f"""
    Bạn là J.A.R.V.I.S - Trợ lý Hệ sinh thái D4M.
    Thời gian hệ thống: {now_str}. 

    {current_status}

    {sch_text}

    QUY TẮC ĐIỀU KHIỂN:
    1. BẬT/TẮT DỊCH VỤ: Chèn `[TOGGLE: ten_dich_vu]`
    2. QUẢN LÝ LỊCH TRÌNH: Dựa theo 18 ca làm (M5..M10, A11..A6, N7..N10). Nếu nghỉ là OFF.
       Chèn khối JSON vào cuối câu (CHỈ CẦN date, shift_name, is_off):
       [SCHEDULE_DATA: [{{"date": "YYYY-MM-DD", "shift_name": "M5", "is_off": false}}, ...]]

    Yêu cầu của Sếp: {message}
    """

    max_retries = 3
    reply_text = ""
    action_taken = ""

    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=chosen_model,
                contents=system_prompt,
            )
            reply_text = response.text
            break
        except Exception as call_err:
            if attempt < max_retries - 1:
                time.sleep(2) 
                continue
            raise ValueError(f"Lỗi API Model {chosen_model}: {str(call_err)}")

    # 🧠 BỘ XỬ LÝ NHẬN LỆNH J.A.R.V.I.S (ĐÃ GẮN CHIP GHI NHỚ)
    match_toggle = re.search(r'\[TOGGLE:\s*([a-zA-Z0-9_]+)\]', reply_text)
    if match_toggle:
        target_service = match_toggle.group(1).strip()
        if target_service in api_status_db:
            new_state = not api_status_db[target_service]["active"]
            if target_service == "internet_tunnel": 
                start_tunnel() if new_state else stop_tunnel()
            
            api_status_db[target_service]["active"] = new_state
            save_status(api_status_db)
            action_taken = f"Đã {'BẬT' if new_state else 'TẮT'} {target_service}"
        reply_text = re.sub(r'\[TOGGLE:\s*([a-zA-Z0-9_]+)\]', '', reply_text).strip()

    # 🚀 GỌI HOÁN ĐỔI SANG SCHEDULER SERVICE THAY VÌ TỰ VIẾT SQL TẠI ĐÂY
    match_schedule = re.search(r'\[SCHEDULE_DATA:\s*(\[.*\])\s*\]', reply_text, re.DOTALL)
    if match_schedule:
        schedule_json_str = match_schedule.group(1)
        try:
            schedules = json.loads(schedule_json_str)
            inserted_count = batch_update_schedules_from_ai(user_id, schedules)
            msg_sch = f"Đã cập nhật {inserted_count} lịch làm việc."
            action_taken = f"{action_taken} | {msg_sch}" if action_taken else msg_sch
        except Exception as json_err:
            logging.error(f"Lỗi parse JSON lịch trình từ AI: {json_err}")
        
        reply_text = re.sub(r'\[SCHEDULE_DATA:\s*\[.*\]\s*\]', '', reply_text, flags=re.DOTALL).strip()

    return {"status": "success", "reply": reply_text, "action_executed": action_taken}