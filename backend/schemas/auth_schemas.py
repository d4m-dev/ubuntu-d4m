# -*- coding: utf-8 -*-
# Tên file: ubuntu-backend/schemas/auth_schemas.py
from pydantic import BaseModel, EmailStr, Field

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)

class SSORegisterRequest(BaseModel):
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)
    full_name: str
    email: EmailStr

class SSOVerifyOTP(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)

class UpdateProfileRequest(BaseModel):
    full_name: str = None
    dob: str = None
    phone: str = None
    address: str = None
    cccd: str = None
    # 🖼️ Hệ thống cá nhân hóa: khung avatar, hiệu ứng tên, theme chat
    avatar_frame: str = None
    name_effect: str = None
    chat_theme: str = None

class ChangeEmailRequest(BaseModel):
    new_email: EmailStr

class VerifyChangeEmailRequest(BaseModel):
    new_email: EmailStr
    otp: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, description="Mật khẩu mới phải từ 6 ký tự")