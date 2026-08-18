# -*- coding: utf-8 -*-
# Tên file: ubuntu-backend/services/scheduler.py
import logging
import calendar
from datetime import datetime
from core.database import db_inserter, db_executor

SHIFT_TIME_MAP = {
    "M5": ("05:00", "13:00"), "M6": ("06:00", "14:00"), "M7": ("07:00", "15:00"), "M8": ("08:00", "16:00"), "M9": ("09:00", "17:00"), "M10": ("10:00", "18:00"),
    "A11": ("11:00", "19:00"), "A12": ("12:00", "20:00"), "A1": ("13:00", "21:00"), "A2": ("14:00", "22:00"), "A3": ("15:00", "23:00"), "A4": ("16:00", "00:00"), "A5": ("17:00", "01:00"), "A6": ("18:00", "02:00"),
    "N7": ("19:00", "03:00"), "N8": ("20:00", "04:00"), "N9": ("21:00", "05:00"), "N10": ("22:00", "06:00")
}

def get_monthly_schedules(month: int, year: int) -> dict:
    last_day = calendar.monthrange(year, month)[1]
    start_date = f"{year}-{month:02d}-01"
    end_date = f"{year}-{month:02d}-{last_day:02d}"
    
    sql = f"""SELECT id, work_date, shift_name, is_off 
              FROM work_schedules 
              WHERE work_date >= '{start_date}' AND work_date <= '{end_date}'"""
    records = db_executor.select_as_list_dict(sql)
    
    schedule_dict = {}
    if records:
        for r in records:
            d = r['work_date']
            date_str = d.strftime('%Y-%m-%d') if hasattr(d, 'strftime') else str(d)[:10] 
            schedule_dict[date_str] = {
                "id": r['id'],
                "shift_name": r['shift_name'],
                "is_off": bool(r['is_off'])
            }
    return schedule_dict

def save_manual_schedule(user_id: int, date: str, shift_name: str) -> dict:
    is_off = 1 if shift_name == "OFF" else 0
    start_time, end_time = None, None
    if not is_off and shift_name != "DELETE":
        start_time, end_time = SHIFT_TIME_MAP.get(shift_name, ("00:00", "08:00"))
    
    check_sql = f"SELECT id, gcal_event_id FROM work_schedules WHERE work_date='{date}'"
    existing = db_executor.select_as_list_dict(check_sql)
    
    gcal_event_id = None
    if existing:
        for ex in existing:
            if ex.get('gcal_event_id'):
                gcal_event_id = ex.get('gcal_event_id')
                break
        db_inserter.insert(f"DELETE FROM work_schedules WHERE work_date='{date}'", ())
    
    if shift_name == "DELETE":
        return {"status": "success", "message": "Đã xóa lịch"}

    new_gcal_id = None
    try:
        from core.gcal import add_event
        new_gcal_id = add_event(
            date_str=date, shift_name=shift_name, 
            start_time=start_time, end_time=end_time, 
            is_off=is_off, event_id=gcal_event_id
        )
    except Exception as e:
        logging.error(f"Manual Sync Gcal Error: {e}")

    sql = '''INSERT INTO work_schedules 
             (user_id, work_date, shift_name, start_time, end_time, is_off, gcal_event_id) 
             VALUES (%s, %s, %s, %s, %s, %s, %s)'''
    db_inserter.insert(sql, (user_id, date, shift_name, start_time, end_time, is_off, new_gcal_id))
        
    return {"status": "success"}

def batch_update_schedules_from_ai(user_id: int, schedules_list: list) -> int:
    """Hàm tách rời giúp AI Engine không cần đụng trực tiếp vào lệnh SQL"""
    inserted_count = 0
    for sch in schedules_list:
        is_off = 1 if sch.get('is_off') else 0
        safe_shift = sch.get('shift_name') or 'OFF'
        work_date = sch.get('date')
        
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
        except Exception as g_err: 
            logging.error(f"Gcal AI Sync Error: {g_err}")

        sql = '''INSERT INTO work_schedules 
                 (user_id, work_date, shift_name, start_time, end_time, is_off, gcal_event_id) 
                 VALUES (%s, %s, %s, %s, %s, %s, %s)'''
        db_inserter.insert(sql, (user_id, work_date, safe_shift, s_time, e_time, is_off, gcal_id))
        inserted_count += 1
    return inserted_count