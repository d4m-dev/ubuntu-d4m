import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # ==========================================
    # ⚙️ CẤU HÌNH MÁY CHỦ
    # ==========================================
    HOST: str = "0.0.0.0"
    PORT: int = 16868
    ENVIRONMENT: str = "development"
    SECRET_KEY: str

    # Tài khoản Admin (Mặc định lấy từ .env, không có thì xài dự phòng)
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str

    # ==========================================
    # 🗄️ CẤU HÌNH CƠ SỞ DỮ LIỆU
    # ==========================================
    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASS: str = ""
    DB_NAME: str = "social_hub"
    DB_ADMIN_PORT: int = 8888

    # ==========================================
    # 🤖 CẤU HÌNH API BÊN THỨ 3
    # ==========================================
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""
    GEMINI_API_KEY: str = ""

    # ==========================================
    # 💰 DONATE / SEPAY / VIETQR
    # ==========================================
    SEPAy_TOKEN: str = ""            # Token xác thực Webhook SePay
    BANK_ID: str = "MB"              # Mã ngân hàng VietQR (VD: MB, VCB, TCB...)
    BANK_ACCOUNT: str = ""           # Số tài khoản nhận tiền
    BANK_ACCOUNT_NAME: str = ""      # Tên chủ tài khoản

    # Cú pháp chuẩn của Pydantic V2
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding='utf-8',
        extra="ignore"
    )

settings = Settings()