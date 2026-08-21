# -*- coding: utf-8 -*-
import os
import jwt
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends, Header, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel

from core import urls as U
from core.config import settings
from core.database import db_executor, db_inserter, db_deleter
from services.social_media_service import (
    process_image_upload, safe_social_path, SOCIAL_MEDIA_DIR, _is_safe_filename,
)
from services.spirit_service import spirit_select_sql, spirit_payload

router = APIRouter(prefix=U.SOCIAL["PREFIX"], tags=["Social Hub"])


# ==========================================
# 🛡️ BỘ LỌC BẢO MẬT & ĐỊNH DANH TOKEN SSO THÔNG MINH
# ==========================================
def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Thiếu thẻ định danh (Token)")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])

        user_id = payload.get("user_id") or payload.get("id")
        sub = payload.get("sub")

        db_user = None
        if user_id:
            db_user = db_executor.select_as_list_dict(
                "SELECT id, username, active FROM users WHERE id=%s", (user_id,))
        elif sub:
            if str(sub).isdigit():
                db_user = db_executor.select_as_list_dict(
                    "SELECT id, username, active FROM users WHERE id=%s", (int(sub),))
            else:
                db_user = db_executor.select_as_list_dict(
                    "SELECT id, username, active FROM users WHERE username=%s", (sub,))

        if not db_user:
            raise HTTPException(status_code=401, detail="Không tìm thấy tài khoản trong Database")
        if db_user[0].get("active") != 1:
            raise HTTPException(status_code=403, detail="Tài khoản chưa được kích hoạt")

        payload["user_id"] = db_user[0]["id"]
        payload["username"] = db_user[0]["username"]
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Thẻ định danh đã hết hạn")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Thẻ định danh không hợp lệ")


# ==========================================
# 📦 SCHEMAS (ĐỊNH DẠNG DỮ LIỆU)
# ==========================================
class PostCreate(BaseModel):
    content: str
    attached_media: Optional[str] = None
    media_type: Optional[str] = None
    media_url: Optional[str] = None
    # 🖼️ Đăng ảnh kèm status (nhiều ảnh)
    image_urls: List[str] = []
    # 🎵 Thông tin nhạc đính kèm (từ thư viện có sẵn)
    music_title: Optional[str] = None
    music_artist: Optional[str] = None


# ==========================================
# 🖼️ UPLOAD ẢNH (bài đăng / bình luận) — an toàn + tối ưu
# ==========================================
@router.post(U.SOCIAL["UPLOAD_IMAGE"])
async def upload_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload ảnh: validate magic bytes + Pillow, nén WebP, trả URL tạm."""
    result = process_image_upload(file)
    return {"status": "success", **result}


# ==========================================
# 🎨 STICKER GIF (bài đăng / bình luận)
# ==========================================
from services.social_media_service import SOCIAL_STICKER_DIR

@router.get(U.SOCIAL["STICKERS"])
async def list_stickers(current_user: dict = Depends(get_current_user)):
    """Danh sách sticker GIF có sẵn trong thư mục social_stickers."""
    try:
        if not os.path.isdir(SOCIAL_STICKER_DIR):
            return {"status": "success", "data": []}
        files = []
        for f in sorted(os.listdir(SOCIAL_STICKER_DIR)):
            if f.lower().endswith(".gif") and os.path.isfile(os.path.join(SOCIAL_STICKER_DIR, f)):
                files.append({
                    "name": f,
                    "url": f"/api/social/sticker/{f}",
                })
        return {"status": "success", "data": files}
    except Exception as e:
        return {"status": "success", "data": []}


@router.get(U.SOCIAL["STICKER_FILE"])
async def get_sticker(filename: str):
    """Trả file sticker GIF (an toàn, chống path traversal)."""
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Tên file không hợp lệ.")
    file_path = os.path.join(SOCIAL_STICKER_DIR, filename)
    if not os.path.exists(file_path) or not filename.lower().endswith(".gif"):
        raise HTTPException(status_code=404, detail="Sticker không tồn tại.")
    return FileResponse(
        file_path,
        media_type="image/gif",
        headers={"Cache-Control": "public, max-age=31536000, immutable",
                 "X-Content-Type-Options": "nosniff"},
    )


# ==========================================
# 🖼️ TRẢ FILE ẢNH SOCIAL (có Cache-Control dài hạn)
# ==========================================
@router.get(U.SOCIAL["IMAGE"])
async def get_social_image(year_month: str, filename: str):
    if not _is_safe_filename(filename):
        raise HTTPException(status_code=400, detail="Tên file không hợp lệ.")
    file_path = safe_social_path(year_month, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Ảnh không tồn tại.")
    return FileResponse(
        file_path,
        media_type="image/webp",
        headers={"Cache-Control": "public, max-age=31536000, immutable",
                 "X-Content-Type-Options": "nosniff"},
    )


# ==========================================
# 🚀 CÁC ĐƯỜNG DẪN API (ENDPOINTS)
# ==========================================
@router.get("/feed")
def get_feed(current_user: dict = Depends(get_current_user)):
    """Lấy danh sách bảng tin an toàn chống Crash 100%."""
    try:
        sql = f"""
            SELECT
                p.id as post_id, p.content, p.created_at, p.attached_media, p.media_type,
                u.id as user_id, u.username,
                COALESCE(u.fullname, u.full_name, u.username) as fullname,
                u.avatar_url, u.role, u.avatar_frame, u.name_effect, u.chat_theme,
                {spirit_select_sql()},
                (SELECT GROUP_CONCAT(m.file_url SEPARATOR '||') FROM media m
                 WHERE m.post_id = p.id AND m.media_type = 'image') as images,
                (SELECT m.file_url FROM media m
                 WHERE m.post_id = p.id AND m.media_type IN ('audio','video') LIMIT 1) as media_file,
                (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) as comment_count
            FROM posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
            LIMIT 50
        """
        posts = db_executor.select_as_list_dict(sql)

        formatted_posts = []
        for post in posts:
            dt = post.get("created_at")
            dt_str = dt.isoformat() if hasattr(dt, "isoformat") else str(dt) if dt else None
            images = (post.get("images") or "").split("||") if post.get("images") else []

            spirit = spirit_payload(post)
            formatted_posts.append({
                "post_id": post["post_id"],
                "user_id": post["user_id"],
                "username": post["username"],
                "fullname": post["fullname"],
                "avatar_url": post["avatar_url"],
                "role": post["role"],
                "avatar_frame": post.get("avatar_frame"),
                "name_effect": post.get("name_effect") or "default",
                "chat_theme": post.get("chat_theme") or "default",
                "pet": spirit["pet"],           # 🐉 Linh thú đang trang bị
                "treasure": spirit["treasure"], # 💎 Linh bảo đang trang bị
                "content": post["content"],
                "created_at": dt_str,
                "attached_media": post["attached_media"],
                "media_type": post["media_type"],
                "comment_count": post.get("comment_count") or 0,
                "images": images,
                "stream_links": {"vocal_url": post["media_file"], "video_url": post["media_file"], "cover_url": ""}
                                 if post.get("media_file") else None,
            })

        return {"status": "success", "data": formatted_posts}
    except Exception as e:
        return {"status": "error", "message": f"Lỗi nội bộ Database: {str(e)}", "data": []}


@router.post("/posts")
def create_post(post: PostCreate, current_user: dict = Depends(get_current_user)):
    """Đăng bài mới - Khóa cứng ID của người đăng từ Token.
    Hỗ trợ: status + nhiều ảnh + đính kèm nhạc từ thư viện."""
    user_id = current_user.get("user_id")

    sql_post = "INSERT INTO posts (user_id, content, attached_media, media_type) VALUES (%s, %s, %s, %s)"
    post_id = db_inserter.insert(sql_post, (user_id, post.content, post.attached_media, post.media_type))

    if not post_id:
        raise HTTPException(status_code=500, detail="Lỗi khi lưu bài viết vào Database")

    # 🖼️ Lưu các ảnh đính kèm
    for img_url in post.image_urls or []:
        if img_url:
            db_inserter.insert(
                "INSERT INTO media (post_id, file_url, media_type) VALUES (%s, %s, 'image')",
                (post_id, img_url))

    # 🎵 Lưu nhạc/video đính kèm
    if post.media_url:
        db_inserter.insert(
            "INSERT INTO media (post_id, file_url, media_type) VALUES (%s, %s, %s)",
            (post_id, post.media_url, post.media_type or 'audio'))

    return {"status": "success", "message": "Đăng bài thành công", "post_id": post_id}


@router.delete("/posts/{post_id}")
def delete_post(post_id: int, current_user: dict = Depends(get_current_user)):
    """Xóa bài viết - Cấp quyền tối cao cho Admin."""
    user_id = current_user.get("user_id")
    role = current_user.get("role", 0)

    sql_check = "SELECT user_id FROM posts WHERE id = %s"
    post_data = db_executor.select_as_list_dict(sql_check, (post_id,))

    if not post_data:
        raise HTTPException(status_code=404, detail="Bài viết không tồn tại")

    post_owner_id = post_data[0]["user_id"]

    if post_owner_id != user_id and int(role) != 1:
        raise HTTPException(status_code=403, detail="Sếp không có quyền xóa bài của người khác!")

    sql_delete = "DELETE FROM posts WHERE id = %s"
    affected = db_deleter.delete(sql_delete, (post_id,))

    if affected > 0:
        return {"status": "success", "message": "Đã cho bay màu vĩnh viễn"}
    else:
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi xóa")
