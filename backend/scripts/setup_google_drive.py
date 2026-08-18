# -*- coding: utf-8 -*-
"""
============================================================
📁 GOOGLE DRIVE — KHỞI TẠO TOKEN (OAuth)
============================================================
Sinh file `backend/auth/token.json` từ `credentials.json` để
trang GG Drive Commander hoạt động.

BƯỚC 1: Tạo OAuth Client ID (Desktop) tại
   https://console.cloud.google.com/apis/credentials
   - Scopes bắt buộc: https://www.googleapis.com/auth/drive
   - Tải JSON về, đặt tên `credentials.json`, cho vào `backend/auth/`

BƯỚC 2: Chạy script (sẽ mở trình duyệt đăng nhập Google 1 lần)
   cd backend
   ./venv/bin/python scripts/setup_google_drive.py

BƯỚC 3: Xong — backend/auth/token.json đã sinh. Trang hoạt động.

Yêu cầu: pip install google-auth google-auth-oauthlib google-api-python-client
============================================================
"""
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUTH_DIR = os.path.join(BASE, "auth")
CREDENTIALS_PATH = os.path.join(AUTH_DIR, "credentials.json")
TOKEN_PATH = os.path.join(AUTH_DIR, "token.json")

SCOPES = ['https://www.googleapis.com/auth/drive']


def main():
    os.makedirs(AUTH_DIR, exist_ok=True)

    if not os.path.exists(CREDENTIALS_PATH):
        print("❌ Thiếu file credentials.json")
        print(f"   Đặt OAuth Client JSON vào: {CREDENTIALS_PATH}")
        print("   Hướng dẫn: xem README backend mục Google Drive.")
        sys.exit(1)

    try:
        from google_auth_oauthlib.flow import InstalledAppFlow
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
    except ImportError:
        print("❌ Thiếu thư viện. Chạy:")
        print("   pip install google-auth google-auth-oauthlib google-api-python-client")
        sys.exit(1)

    creds = None
    if os.path.exists(TOKEN_PATH):
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_PATH, SCOPES)
            creds = flow.run_local_server(port=0)

        with open(TOKEN_PATH, "w") as token:
            token.write(creds.to_json())
        print(f"✅ Đã sinh token.json tại: {TOKEN_PATH}")
        print("   Trang GG Drive Commander giờ có thể hoạt động.")
    else:
        print("✅ token.json đã hợp lệ sẵn, không cần làm gì thêm.")


if __name__ == "__main__":
    main()
