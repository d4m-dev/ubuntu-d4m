# -*- coding: utf-8 -*-
import os
import logging
from datetime import datetime, timedelta
from google.oauth2 import service_account
from googleapiclient.discovery import build
from dotenv import load_dotenv

load_dotenv()

SCOPES = ['https://www.googleapis.com/auth/calendar']
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERVICE_ACCOUNT_FILE = os.path.join(BASE_DIR, 'auth', 'd4m-calendar-key.json')

CALENDAR_ID = os.getenv("GCAL_EMAIL")

def get_gcal_service():
    try:
        if not os.path.exists(SERVICE_ACCOUNT_FILE):
            logging.error("Không tìm thấy file d4m-calendar-key.json")
            return None
        creds = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
        return build('calendar', 'v3', credentials=creds)
    except Exception as e:
        logging.error(f"Lỗi khởi tạo GCal Service: {e}")
        return None

# 🚀 NÂNG CẤP: Thêm tham số event_id để phục vụ việc SỬA LỊCH
def add_event(date_str, shift_name, start_time, end_time, is_off, event_id=None):
    """Hàm tạo HOẶC cập nhật sự kiện lịch thông minh J.A.R.V.I.S"""
    service = get_gcal_service()
    if not service: return None

    TIMEZONE = 'Asia/Ho_Chi_Minh'

    try:
        if is_off:
            event = {
                'summary': '🏖️ NGHỈ LÀM (OFF)',
                'description': 'J.A.R.V.I.S set lịch nghỉ tự động.',
                'start': {'date': date_str, 'timeZone': TIMEZONE},
                'end': {'date': date_str, 'timeZone': TIMEZONE},
                'colorId': '11', 
                'reminders': {'useDefault': False} 
            }
        else:
            start_dt = datetime.strptime(f"{date_str} {start_time}", "%Y-%m-%d %H:%M")
            end_dt = datetime.strptime(f"{date_str} {end_time}", "%Y-%m-%d %H:%M")
            if end_dt <= start_dt: end_dt += timedelta(days=1)

            color_id = '9' 
            shift_upper = str(shift_name).upper()
            if shift_upper.startswith('M'): color_id = '9'
            elif shift_upper.startswith('A'): color_id = '5'
            elif shift_upper.startswith('N'): color_id = '3'

            event = {
                'summary': f'💼 Đi làm: Ca {shift_upper}',
                'location': 'Discovery 1', 
                'description': 'J.A.R.V.I.S đã lên lịch ca làm.',
                'start': {'dateTime': start_dt.isoformat(), 'timeZone': TIMEZONE},
                'end': {'dateTime': end_dt.isoformat(), 'timeZone': TIMEZONE},
                'colorId': color_id,
                'reminders': {'useDefault': False},
            }

        # 🚀 KIỂM TRA: Nếu đã có ID cũ -> CẬP NHẬT đè lên
        if event_id:
            try:
                event_result = service.events().update(calendarId=CALENDAR_ID, eventId=event_id, body=event).execute()
                print(f"✅ [Google Calendar] Đã CẬP NHẬT lịch: {event.get('summary')} vào {date_str}")
                return event_result.get('id')
            except Exception:
                # Nếu cập nhật lỗi (VD: Sếp lỡ tay xóa lịch trên điện thoại) -> Im lặng bỏ qua để tạo mới ở dưới
                pass

        # 🟢 TẠO MỚI (Dành cho Lịch mới, hoặc Lịch cũ bị mất)
        event_result = service.events().insert(calendarId=CALENDAR_ID, body=event).execute()
        print(f"✅ [Google Calendar] Đã TẠO MỚI lịch: {event.get('summary')} vào {date_str}")
        return event_result.get('id')
    
    except Exception as e:
        logging.error(f"Lỗi khi đẩy lịch lên Google: {e}")
        return None