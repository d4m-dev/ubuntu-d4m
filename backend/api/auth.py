# -*- coding: utf-8 -*-
from core import urls as U
# Tên file: ubuntu-backend/api/auth.py
from fastapi import APIRouter, Depends, UploadFile, File, Header, HTTPException
from core.rate_limit import blacklist_token
from core.security import decode_token
from schemas.auth_schemas import *
from services.sso_service import (
    get_current_user_id, verify_admin, process_admin_login,
    process_sso_register, process_sso_verify, process_sso_login
)
from services.admin_user_service import (
    admin_get_all_users, admin_toggle_user_active,
    admin_change_user_role, admin_delete_user
)
from services.profile_service import (
    get_user_profile, update_user_profile, upload_user_avatar,
    request_email_change, verify_email_change,
    process_forgot_password, process_reset_password
)

router = APIRouter(prefix=U.AUTH["PREFIX"], tags=["Authentication & SSO"])

# ==========================================
# 👑 API BẢNG PHONG THẦN (ADMIN QUẢN LÝ USER)
# ==========================================
@router.get("/admin/users")
async def admin_get_users(auth_data: tuple = Depends(verify_admin)):
    users = admin_get_all_users()
    return {"status": "success", "users": users}

@router.put("/admin/users/{target_id}/toggle-active")
async def admin_toggle_active(target_id: int, auth_data: tuple = Depends(verify_admin)):
    admin_id, _ = auth_data
    new_state = admin_toggle_user_active(target_id, admin_id)
    return {"status": "success", "new_state": new_state, "message": "Đã đổi trạng thái tài khoản."}

@router.put("/admin/users/{target_id}/change-role")
async def admin_change_role(target_id: int, auth_data: tuple = Depends(verify_admin)):
    admin_id, _ = auth_data
    new_role = admin_change_user_role(target_id, admin_id)
    return {"status": "success", "new_role": new_role, "message": "Đã cập nhật Tước vị."}

@router.delete("/admin/users/{target_id}")
async def admin_delete_user_route(target_id: int, auth_data: tuple = Depends(verify_admin)):
    admin_id, _ = auth_data
    admin_delete_user(target_id, admin_id)
    return {"status": "success", "message": "Đã thanh trừng tài khoản khỏi hệ thống!"}

# ==========================================
# 🔑 API ĐĂNG NHẬP & ĐĂNG KÝ
# ==========================================
@router.post("/login")
async def login(request: LoginRequest):
    token = process_admin_login(request)
    return {"status": "success", "message": "✅ Đăng nhập thành công!", "access_token": token, "token_type": "bearer"}

@router.post("/sso/register")
async def register_sso(data: SSORegisterRequest):
    process_sso_register(data)
    return {"status": "success", "message": "Đã tạo tài khoản, chờ xác thực OTP."}

@router.post("/sso/verify")
async def verify_otp(data: SSOVerifyOTP):
    process_sso_verify(data)
    return {"status": "success", "message": "Xác thực định danh thành công."}

@router.post("/sso/login")
async def sso_login(data: LoginRequest):
    token = process_sso_login(data)
    return {"status": "success", "message": "Đăng nhập thành công!", "access_token": token}

# ==========================================
# 🚪 API ĐĂNG XUẤT — Blacklist JWT Token
# ==========================================
@router.post("/logout")
async def logout(authorization: str = Header(None)):
    """
    Đăng xuất: vô hiệu hoá hoàn toàn token hiện tại (JWT Blacklist).

    Token được thêm vào Redis blacklist với TTL bằng thời gian còn lại,
    nên dù token chưa hết hạn cũng không thể tái sử dụng.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Thiếu thẻ định danh (Token)")

    token = authorization.split(" ")[1]
    payload = decode_token(token)
    if payload is None:
        # Token đã hết hạn / không hợp lệ / đã blacklist
        raise HTTPException(status_code=401, detail="Token không hợp lệ hoặc đã hết hạn.")

    jti = payload.get("jti")
    if jti:
        blacklist_token(jti)

    return {"status": "success", "message": "Đã đăng xuất. Token vô hiệu hoá hoàn toàn."}

# ==========================================
# 👤 API QUẢN LÝ HỒ SƠ & BẢO MẬT
# ==========================================
@router.get("/profile/me")
async def get_my_profile(auth_data: tuple = Depends(get_current_user_id)):
    user_id, _ = auth_data
    return {"status": "success", "data": get_user_profile(user_id)}

@router.put("/profile/update")
async def update_profile(data: UpdateProfileRequest, auth_data: tuple = Depends(get_current_user_id)):
    user_id, _ = auth_data
    update_user_profile(user_id, data)
    return {"status": "success", "message": "Đã lưu hồ sơ an toàn!"}

@router.post("/profile/avatar")
async def upload_avatar(file: UploadFile = File(...), auth_data: tuple = Depends(get_current_user_id)):
    user_id, username = auth_data
    url = upload_user_avatar(user_id, username, file)
    return {"status": "success", "avatar_url": url}

@router.post("/profile/change-email/request")
async def request_change_email_route(data: ChangeEmailRequest, auth_data: tuple = Depends(get_current_user_id)):
    user_id, username = auth_data
    request_email_change(user_id, username, data)
    return {"status": "success", "message": "Đã gửi mã OTP đến Email mới."}

@router.post("/profile/change-email/verify")
async def verify_change_email_route(data: VerifyChangeEmailRequest, auth_data: tuple = Depends(get_current_user_id)):
    user_id, _ = auth_data
    verify_email_change(user_id, data)
    return {"status": "success", "message": "Đổi Email thành công!"}

@router.post("/forgot-password/request")
async def request_forgot_password_route(data: ForgotPasswordRequest):
    process_forgot_password(data)
    return {"status": "success", "message": "Đã gửi mã OTP khôi phục mật khẩu vào Email của sếp!"}

@router.post("/forgot-password/reset")
async def reset_password_route(data: ResetPasswordRequest):
    process_reset_password(data)
    return {"status": "success", "message": "Khôi phục mật khẩu thành công! Giờ sếp có thể đăng nhập bình thường."}

# Re-export các hàm lá chắn để giữ 100% tương thích cho các file khác
__all__ = ["router", "get_current_user_id", "verify_admin"]