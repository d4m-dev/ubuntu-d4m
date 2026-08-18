# -*- coding: utf-8 -*-
"""
============================================================
🎵 D4M SONGS UPLOAD TOÀN DIỆN (5-in-1)
============================================================
Upload nhạc gồm 5 loại file: audio, beat, video, cover, lyric.

API:
  - GET  /api/admin/songs/check-folder/{folder_name}
  - POST /api/admin/songs/upload

Đặc điểm:
  - Bảo mật: mọi endpoint phải qua `require_admin` (role == 1 hoặc 'admin').
  - Partial Upload: chỉ lưu đè những file được gửi lên.
  - Tự tạo/UPDATE record trong bảng `songs` theo folder_name.
  - Tự động đọc duration (mutagen) từ file audio.
  - SQL parameterized (chống SQL injection) + safe_join (chống path traversal).
============================================================
"""
import os
import logging

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Header
from typing import Optional

from core import urls as U
from core.database import db_executor, db_inserter, db_updater
from core.cache import cache_delete_prefix
from core.security import get_current_active_user
from api.upload import safe_join, validate_upload, save_upload, AUDIO_WORKSPACE

logger = logging.getLogger("d4m_songs_upload")

router = APIRouter(prefix=U.SONGS_UPLOAD["PREFIX"], tags=["Songs Upload (5-in-1)"])

# ==========================================================
# 🔒 DEPENDENCY: BẮT BUỘC ADMIN (role == 1 hoặc role == 'admin')
# ==========================================================
def require_admin(authorization: str = Header(None)):
    """Chỉ admin (role=1 hoặc 'admin') mới được dùng. Yêu cầu active=1."""
    payload = get_current_active_user(authorization)  # trả 401/403 nếu token/active sai
    role = payload.get("role")
    is_admin = (str(role) == "1") or (str(role).lower() == "admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Chỉ Admin mới được phép upload nhạc.")
    return payload


# ==========================================================
# 🛡️ CHUẨN HÓA TÊN THƯ MỤC (chống path traversal)
# ==========================================================
def sanitize_folder_name(name: str) -> str:
    """Chuẩn hóa tên thư mục: bỏ path traversal, ký tự đặc biệt."""
    name = (name or "").strip().replace("/", "_").replace("\\", "_").replace("..", "_")
    # chỉ giữ chữ, số, gạch ngang, gạch dưới
    safe = "".join(c for c in name if c.isalnum() or c in "-_")
    return safe[:150]


# ==========================================================
# 📦 HELPER: ĐỌC DURATION BẰNG MUTAGEN
# ==========================================================
def read_duration(file_path: str) -> int:
    """Đọc thời lượng (giây) của file audio bằng mutagen. Trả 0 nếu lỗi."""
    try:
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".mp3":
            from mutagen.mp3 import MP3
            audio = MP3(file_path)
        elif ext in (".m4a", ".mp4"):
            from mutagen.mp4 import MP4
            audio = MP4(file_path)
        elif ext == ".flac":
            from mutagen.flac import FLAC
            audio = FLAC(file_path)
        else:
            return 0
        return int(getattr(audio.info, "length", 0))
    except Exception as e:
        logger.warning(f"⚠️ Không đọc được duration {file_path}: {e}")
        return 0


# ==========================================================
# 🔍 API 1: CHECK-FOLDER
# ==========================================================
@router.get(U.SONGS_UPLOAD["CHECK_FOLDER"])
def check_folder(folder_name: str, admin=Depends(require_admin)):
    """Kiểm tra thư mục + trả danh sách file có sẵn + thông tin bài hát từ DB."""
    folder = sanitize_folder_name(folder_name)
    if not folder:
        raise HTTPException(status_code=400, detail="Tên thư mục không hợp lệ.")

    # Thư mục vật lý
    folder_path = safe_join(AUDIO_WORKSPACE, folder)
    exists_dir = os.path.isdir(folder_path)

    files_present = []
    if exists_dir:
        for f in sorted(os.listdir(folder_path)):
            full = os.path.join(folder_path, f)
            if os.path.isfile(full):
                files_present.append(f)

    # Thông tin bài hát từ DB (parameterized)
    song = None
    row = db_executor.select_as_list_dict(
        "SELECT id, folder_name, title, artist, cover_image, audio_file, beat_file, "
        "video_file, lyric_file, duration, status FROM songs WHERE folder_name=%s",
        (folder,))
    if row:
        song = row[0]

    return {
        "status": "success",
        "folder_name": folder,
        "exists": exists_dir,
        "files": files_present,
        "song": song,
    }


# ==========================================================
# 📤 API 2: UPLOAD (5-in-1, Partial Upload)
# ==========================================================
@router.post(U.SONGS_UPLOAD["UPLOAD"])
async def upload_song(
    folder_name: str = Form(...),
    title: str = Form(None),
    artist: str = Form(None),
    audio_file: Optional[UploadFile] = File(None),
    beat_file: Optional[UploadFile] = File(None),
    video_file: Optional[UploadFile] = File(None),
    cover_image: Optional[UploadFile] = File(None),
    lyric_file: Optional[UploadFile] = File(None),
    admin=Depends(require_admin),
):
    """Upload 5 file nhạc. Tạo mới hoặc cập nhật record songs theo folder_name."""
    try:
        folder = sanitize_folder_name(folder_name)
        if not folder:
            raise HTTPException(status_code=400, detail="Tên thư mục không hợp lệ.")

        title_final = (title or "").strip() or folder.replace("_", " ").replace("-", " ").title()
        artist_final = (artist or "").strip() or "Unknown"

        # --- 1. Tạo thư mục (chống path traversal) ---
        target_dir = safe_join(AUDIO_WORKSPACE, folder)
        os.makedirs(target_dir, exist_ok=True)

        # --- 2. Map file upload -> (tên file, loại) ---
        # Đổi tên theo folder để đồng bộ (audio = folder.mp3, cover = folder.jpg...)
        uploads = {
            "audio_file": (audio_file, f"{folder}", "audio"),
            "beat_file": (beat_file, f"{folder}_beat", "audio"),
            "video_file": (video_file, f"{folder}", "video"),
            "cover_image": (cover_image, f"{folder}", "image"),
            "lyric_file": (lyric_file, f"{folder}", "lyric"),
        }

        saved = {}  # field -> tên file thực tế đã lưu
        audio_saved_path = None

        for field, (file_obj, base_name, kind) in uploads.items():
            if file_obj is None:
                continue
            # Validate đuôi file theo loại
            validate_upload(file_obj, kind)
            ext = os.path.splitext(file_obj.filename or "")[1].lower()
            final_name = f"{base_name}{ext}"
            dest = os.path.join(target_dir, final_name)
            # Ghi an toàn (giới hạn kích thước)
            save_upload(file_obj, dest, kind)
            saved[field] = final_name
            if field == "audio_file":
                audio_saved_path = dest

        if not saved:
            raise HTTPException(status_code=400, detail="Không có file nào được tải lên.")

        # --- 3. Đọc duration từ file audio (nếu có) ---
        duration = 0
        if audio_saved_path and os.path.exists(audio_saved_path):
            duration = read_duration(audio_saved_path)

        # --- 4. Kiểm tra record trong DB ---
        existing = db_executor.select_as_list_dict(
            "SELECT id FROM songs WHERE folder_name=%s", (folder,))
        is_new = not existing

        # Xây dict giá trị (chỉ cập nhật field có dữ liệu mới hoặc meta)
        # Nếu là bài mới, lấy file audio mặc định (bắt buộc có audio_file)
        db_fields = {
            "title": title_final,
            "artist": artist_final,
            "duration": duration if duration else 0,
        }
        # Ánh xạ field upload -> cột DB
        col_map = {
            "audio_file": "audio_file",
            "beat_file": "beat_file",
            "video_file": "video_file",
            "cover_image": "cover_image",
            "lyric_file": "lyric_file",
        }
        for field, fname in saved.items():
            db_fields[col_map[field]] = fname

        if is_new:
            # Kiểm tra bắt buộc có audio_file
            if "audio_file" not in db_fields:
                # thư mục đã tạo nhưng không có audio -> báo lỗi
                raise HTTPException(status_code=400, detail="Bài hát mới bắt buộc phải có file audio.")
            # INSERT (parameterized) — folder_name bắt buộc
            insert_fields = {"folder_name": folder, **db_fields}
            cols = list(insert_fields.keys())
            vals = [insert_fields[c] for c in cols]
            placeholders = ", ".join(["%s"] * len(vals))
            sql = f"INSERT INTO songs ({', '.join(cols)}) VALUES ({placeholders})"
            db_inserter.insert(sql, vals)
            logger.info(f"🎵 Đã tạo bài hát mới: {folder}")
        else:
            # UPDATE (chỉ cập nhật field có trong db_fields)
            set_clause = ", ".join([f"{c}=%s" for c in db_fields])
            vals = list(db_fields.values()) + [existing[0]["id"]]
            sql = f"UPDATE songs SET {set_clause} WHERE id=%s"
            db_updater.update(sql, vals)
            logger.info(f"🎵 Đã cập nhật bài hát: {folder}")

        # --- 5. Xóa cache dữ liệu hot (home music) ---
        cache_delete_prefix("home:")
        cache_delete_prefix("search:")

        return {
            "status": "success",
            "message": ("Đã tạo bài hát mới." if is_new else "Đã cập nhật bài hát."),
            "folder_name": folder,
            "is_new": is_new,
            "saved_files": saved,
            "duration": duration,
            "title": title_final,
            "artist": artist_final,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🎵 Lỗi upload bài hát: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Lỗi upload: {str(e)}")
