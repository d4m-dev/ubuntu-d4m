# -*- coding: utf-8 -*-
# Tên file: ubuntu-backend/services/email_service.py
import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

def send_otp_email(to_email: str, otp_code: str, username: str) -> bool:
    sender_email = os.getenv("SENDER_EMAIL")
    sender_password = os.getenv("SENDER_PASSWORD")
    if not sender_email or not sender_password:
        logging.error("❌ Thiếu cấu hình SMTP SENDER_EMAIL hoặc SENDER_PASSWORD trong .env")
        return False
    try:
        msg = MIMEMultipart()
        msg['From'] = f"D4M ID System <{sender_email}>"
        msg['To'] = to_email
        msg['Subject'] = "Mã Xác Thực Định Danh - D4M Ecosystem"
        html_body = f"""
        <html><body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="max-w: 500px; margin: auto; background: white; padding: 30px; border-radius: 10px; text-align: center;">
                <h2 style="color: #3b82f6;">Xác Thực D4M ID</h2>
                <p>Xin chào <strong>{username}</strong>,</p>
                <p>Mã OTP xác thực tài khoản của bạn là:</p>
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #8b5cf6; margin: 20px 0; padding: 15px; background: #f3f4f6; border-radius: 8px;">{otp_code}</div>
            </div>
        </body></html>
        """
        msg.attach(MIMEText(html_body, 'html'))
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(sender_email, sender_password)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        logging.error(f"⚠️ SMTP Error: {e}")
        return False