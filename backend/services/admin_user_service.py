# -*- coding: utf-8 -*-
# Tên file: ubuntu-backend/services/admin_user_service.py
from fastapi import HTTPException
from core.database import db_executor, db_updater, db_deleter

def admin_get_all_users():
    sql = "SELECT id, username, full_name, email, phone, role, active, is_verified, avatar_url, created_at FROM users ORDER BY created_at DESC"
    users = db_executor.select_as_list_dict(sql)
    for u in users:
        if not u.get("avatar_url"): 
            u["avatar_url"] = f"https://ui-avatars.com/api/?name={u['username']}&background=random&color=fff"
    return users

def admin_toggle_user_active(target_id: int, admin_id: int):
    if admin_id == target_id:
        raise HTTPException(status_code=400, detail="Không thể tự khóa tài khoản của chính mình!")
    users = db_executor.select_as_list_dict("SELECT active FROM users WHERE id=%s", (target_id,))
    if not users: raise HTTPException(status_code=404, detail="Không tìm thấy mục tiêu.")
    
    new_state = 0 if users[0]['active'] == 1 else 1
    db_updater.update("UPDATE users SET active=%s WHERE id=%s", (new_state, target_id))
    return new_state

def admin_change_user_role(target_id: int, admin_id: int):
    if admin_id == target_id:
        raise HTTPException(status_code=400, detail="Không thể tự giáng chức chính mình!")
    users = db_executor.select_as_list_dict("SELECT role FROM users WHERE id=%s", (target_id,))
    if not users: raise HTTPException(status_code=404, detail="Không tìm thấy mục tiêu.")
    
    new_role = 1 if users[0]['role'] == 0 else 0
    db_updater.update("UPDATE users SET role=%s WHERE id=%s", (new_role, target_id))
    return new_role

def admin_delete_user(target_id: int, admin_id: int):
    if admin_id == target_id:
        raise HTTPException(status_code=400, detail="Lệnh tự hủy đã bị cấm!")
    db_deleter.delete("DELETE FROM users WHERE id=%s", (target_id,))