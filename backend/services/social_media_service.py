# -*- coding: utf-8 -*-
"""
============================================================
🖼️ D4M SOCIAL MEDIA SERVICE — Upload Ảnh An Toàn & Tối Ưu
============================================================
Xử lý upload ảnh cho bài đăng / bình luận (Threads-style):

🛡️ AN TOÀN:
  - Không tin content-type từ client → kiểm tra bằng MAGIC BYTES (python-magic)
  - Dùng Pillow mở thật file để xác nhận là ảnh hợp lệ (chống polyglot/script giả ảnh)
  - Tên file ngẫu nhiên (uuid4) → chống path traversal & trùng lặp
  - Giới hạn kích thước + chống decompression bomb

⚡ NHANH & TỐI ƯU:
  - Resize về tối đa MAX_DIM (giảm băng thông)
  - Nén thành WebP quality ~82 (giảm 50-70% dung lượng so với PNG/JPG)
  - Xoay ảnh theo EXIF orientation
  - Cache-Control dài hạn khi trả file
============================================================
"""
import io
import os
import re
import uuid
from datetime import datetime
from typing import Optional

from fastapi import UploadFile, HTTPException
from PIL import Image, ImageOps

# Đường dẫn gốc
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOCIAL_MEDIA_DIR = os.path.join(BASE_DIR, "images_workspace", "social")
SOCIAL_STICKER_DIR = os.path.join(BASE_DIR, "images_workspace", "social_stickers")

# Cấu hình
MAX_UPLOAD_BYTES = 8 * 1024 * 1024          # 8 MB / ảnh
MAX_DIM = 1600                               # cạnh dài tối đa 1600px (feed)
WEBP_QUALITY = 82                            # chất lượng WebP
ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
# Magic bytes các định dạng ảnh hợp lệ
MAGIC_PATTERNS = [
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"RIFF", "image/webp"),
    (b"GIF87a", "image/gif"),
    (b"GIF89a", "image/gif"),
]

MAX_PIXELS = 4000 * 4000  # giới hạn pixel để chống decompression bomb


def detect_mime_from_bytes(data: bytes) -> Optional[str]:
    """Xác định MIME thực bằng magic bytes (không tin client)."""
    for magic, mime in MAGIC_PATTERNS:
        if data.startswith(magic):
            return mime
    return None


def safe_social_path(*parts) -> str:
    """Chống path traversal: ép đường dẫn nằm trong SOCIAL_MEDIA_DIR."""
    path = os.path.realpath(os.path.join(SOCIAL_MEDIA_DIR, *parts))
    base = os.path.realpath(SOCIAL_MEDIA_DIR)
    if not (path == base or path.startswith(base + os.sep)):
        raise HTTPException(status_code=400, detail="Đường dẫn không hợp lệ.")
    return path


def _is_safe_filename(name: str) -> bool:
    """Chỉ cho phép tên file là chuỗi an toàn (hex uuid32 + đuôi webp)."""
    return bool(re.fullmatch(r"[a-f0-9]{32}\.webp", name))


def process_image_upload(file: UploadFile) -> dict:
    """Nhận file ảnh → validate → tối ưu → lưu WebP → trả thông tin URL.

    Trả về: {"filename": "...", "url": "/api/social/image/....webp", "size": n}
    """
    # 1) Đọc toàn bộ (đã giới hạn)
    raw = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Ảnh vượt quá giới hạn 8MB.")

    # 2) Validate magic bytes thật
    real_mime = detect_mime_from_bytes(raw)
    if real_mime not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="File không phải ảnh hợp lệ (JPG/PNG/WebP/GIF).")

    # 3) Dùng Pillow mở thật để xác nhận + tối ưu
    try:
        img = Image.open(io.BytesIO(raw))
        img.load()
    except Exception:
        raise HTTPException(status_code=400, detail="Không đọc được file ảnh.")

    # 4) Chống decompression bomb
    if img.width * img.height > MAX_PIXELS:
        raise HTTPException(status_code=400, detail="Ảnh quá lớn về kích thước pixel.")

    # 5) Xoay theo EXIF orientation
    img = ImageOps.exif_transpose(img)

    # 6) Chuyển về RGB (WebP không hỗ trợ palette/alpha một số chế độ)
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGB")

    # 7) Resize giữ tỷ lệ nếu cạnh dài > MAX_DIM
    if max(img.size) > MAX_DIM:
        ratio = MAX_DIM / float(max(img.size))
        new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
        img = img.resize(new_size, Image.LANCZOS)

    # 8) Nén WebP
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=WEBP_QUALITY, optimize=True)
    optimized = buf.getvalue()

    # 9) Lưu file với tên uuid
    today = datetime.now().strftime("%Y%m")
    rel_dir = os.path.join(SOCIAL_MEDIA_DIR, today)
    os.makedirs(rel_dir, exist_ok=True)

    filename = f"{uuid.uuid4().hex}.webp"
    file_path = safe_social_path(today, filename)
    with open(file_path, "wb") as f:
        f.write(optimized)

    return {
        "filename": filename,
        "path": f"{today}/{filename}",
        "url": f"/api/social/image/{today}/{filename}",
        "size": len(optimized),
        "orig_size": len(raw),
    }
