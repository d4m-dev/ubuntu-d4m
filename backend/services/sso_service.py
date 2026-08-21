# -*- coding: utf-8 -*-
# Tên file: ubuntu-backend/services/sso_service.py
import jwt
import random
import string
import time
from fastapi import HTTPException, Header
from core.security import verify_password, create_access_token, get_password_hash, ADMIN_USERNAME
from core.config import settings
from core.database import db_executor, db_inserter, db_updater
from services.email_service import send_otp_email
from schemas.auth_schemas import LoginRequest, SSORegisterRequest, SSOVerifyOTP

# ==========================================
# 🔒 LOGIN LOCKOUT & RATE LIMIT (chống brute-force)
# ==========================================
# Dùng dict trong memory (đủ cho single-process; production nên dùng Redis)
_login_attempts = {}  # key: username -> {"count": n, "lock_until": epoch}

MAX_LOGIN_ATTEMPTS = 5
LOGIN_LOCK_SECONDS = 15 * 60  # 15 phút

def _check_lockout(username: str):
    """Nếu đang bị khóa -> raise 429."""
    rec = _login_attempts.get(username)
    if rec and rec.get("lock_until") and time.time() < rec["lock_until"]:
        remaining = int(rec["lock_until"] - time.time())
        raise HTTPException(status_code=429, detail=f"Quá nhiều lần đăng nhập sai. Thử lại sau {remaining//60} phút.")

def _register_failed(username: str):
    """Tăng biến đếm; nếu vượt ngưỡng -> khóa."""
    rec = _login_attempts.setdefault(username, {"count": 0, "lock_until": 0})
    rec["count"] += 1
    if rec["count"] >= MAX_LOGIN_ATTEMPTS:
        rec["lock_until"] = time.time() + LOGIN_LOCK_SECONDS
        rec["count"] = 0

def _reset_lockout(username: str):
    _login_attempts.pop(username, None)

# OTP brute-force protection (theo email)
_otp_attempts = {}  # key: email -> count
MAX_OTP_ATTEMPTS = 5

def _check_otp_lockout(email: str):
    if _otp_attempts.get(email, 0) >= MAX_OTP_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Quá nhiều lần nhập OTP sai. Vui lòng thử lại sau 15 phút.")

# ==========================================
# 🛡️ LÁ CHẮN RADAR XÁC THỰC
# ==========================================
def get_current_user_id(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập lại.")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=401, detail="Token hết hạn hoặc lỗi.")
    # 🔄 Tương thích mọi dạng token: SSO (id + sub=username), music (sub=str(id)), admin (sub, role)
    uid = payload.get("id") or payload.get("user_id")
    sub = payload.get("sub")
    if not uid and sub is not None:
        if str(sub).isdigit():
            uid = int(sub)
        else:
            rows = db_executor.select_as_list_dict(
                "SELECT id FROM users WHERE username=%s", (sub,))
            if rows:
                uid = rows[0]["id"]
    # Admin cấu hình (không nằm bảng users) vẫn hợp lệ — uid=None
    if not uid and payload.get("role") not in (1, "admin"):
        raise HTTPException(status_code=401, detail="Không xác định được tài khoản.")
    return uid, sub

def verify_admin(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập lại.")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        role = payload.get("role")
        if role != 1 and role != "admin":
            raise HTTPException(status_code=403, detail="CẢNH BÁO: Không đủ thẩm quyền! Chỉ Tư Lệnh mới được cấp phép truy cập.")
        return payload.get("id"), payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Token hết hạn hoặc lỗi.")

# ==========================================
# 🔑 NGHIỆP VỤ SSO & AUTHENTICATION
# ==========================================
def process_admin_login(req: LoginRequest):
    _check_lockout(req.username)
    if req.username != ADMIN_USERNAME or not verify_password(req.password):
        _register_failed(req.username)
        raise HTTPException(status_code=401, detail="❌ Sai thông tin đăng nhập!")
    _reset_lockout(req.username)
    return create_access_token(data={"sub": req.username, "role": "admin"})

def process_sso_register(data: SSORegisterRequest):
    existing = db_executor.select_as_list_dict("SELECT id FROM users WHERE username=%s OR email=%s", (data.username, data.email))
    if existing: raise HTTPException(status_code=400, detail="Tài khoản hoặc Email đã tồn tại!")
    
    otp_code = ''.join(random.choices(string.digits, k=6))
    if not send_otp_email(data.email, otp_code, data.username): 
        raise HTTPException(status_code=500, detail="Lỗi gửi mail hệ thống.")
    
    hashed_password = get_password_hash(data.password)
    sql = "INSERT INTO users (username, password_hash, full_name, email, is_verified, otp_code) VALUES (%s, %s, %s, %s, FALSE, %s)"
    db_inserter.insert(sql, (data.username, hashed_password, data.full_name, data.email, otp_code))

def process_sso_verify(data: SSOVerifyOTP):
    # Chống brute-force OTP
    _check_otp_lockout(data.email)
    users = db_executor.select_as_list_dict("SELECT id, otp_code FROM users WHERE email=%s AND is_verified=FALSE", (data.email,))
    if not users or users[0]['otp_code'] != data.otp:
        _otp_attempts[data.email] = _otp_attempts.get(data.email, 0) + 1
        raise HTTPException(status_code=400, detail="OTP không hợp lệ hoặc sai email!")
    _otp_attempts.pop(data.email, None)
    db_updater.update("UPDATE users SET is_verified=TRUE, otp_code=NULL WHERE id=%s", (users[0]['id'],))

def process_sso_login(data: LoginRequest):
    _check_lockout(data.username)
    users = db_executor.select_as_list_dict(
        "SELECT id, username, password_hash, is_verified, full_name, role, active FROM users WHERE (username=%s OR email=%s)", 
        (data.username, data.username)
    )
    if not users or not verify_password(data.password, users[0]['password_hash']): 
        _register_failed(data.username)
        raise HTTPException(status_code=401, detail="Sai thông tin đăng nhập!")
    user = users[0]
    if not user['is_verified']: 
        raise HTTPException(status_code=403, detail="Tài khoản chưa được xác thực Email!")
    if user.get('active') != 1:
        raise HTTPException(status_code=403, detail="Tài khoản chưa được kích hoạt. Hãy donate để kích hoạt!")
    _reset_lockout(data.username)

    return create_access_token(
        data={
            "sub": user['username'], "id": user['id'],
            "full_name": user['full_name'] or user['username'],
            "role": user['role'], "active": user['active']
        }
    )