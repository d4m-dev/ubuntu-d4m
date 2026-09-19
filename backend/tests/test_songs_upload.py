# -*- coding: utf-8 -*-
"""
============================================================
🧪 TEST SONG UPLOAD (5-in-1)
============================================================
Dùng pytest + FastAPI TestClient để test luồng:
  1. Tạo mới bài hát (INSERT) với mock file upload audio.
  2. Cập nhật bài hát (UPDATE) khi folder đã tồn tại (partial upload).

Chạy:  cd backend && ./venv/bin/python -m pytest test_songs_upload.py -v
============================================================
"""
import os
import io
import uuid

from fastapi.testclient import TestClient

from core.security import create_access_token
from api.server import app

client = TestClient(app)

# Token admin giả (không cần DB thật để vượt qua verify — nhưng require_admin
# gọi get_current_active_user → đọc DB. Ta tạo user admin tạm nếu cần.
# Để đơn giản, ta tạo token với role=admin & active=1; hàm sẽ fallback.
ADMIN_TOKEN = create_access_token({
    "sub": "admin", "role": "admin", "id": 1, "active": 1, "jti": "test-admin-" + uuid.uuid4().hex,
})


def _auth_headers():
    return {"Authorization": f"Bearer {ADMIN_TOKEN}"}


def _make_audio_bytes():
    """Tạo file audio giả (đủ để mutagen đọc hoặc rỗng)."""
    # MP3 tối thiểu (header ID3) — mutagen có thể đọc nhưng length=0
    return io.BytesIO(b"ID3\x04\x00\x00\x00\x00\x00\x00" + b"\x00" * 128)


def test_check_folder_path_traversal_blocked():
    """Kiểm tra path traversal bị chặn.

    `../../etc` bị URL-normalize ở tầng FastAPI nên route không khớp -> 404
    (không thể truy cập thư mục ngoài). Đây là hành vi bảo mật đúng.
    Ngoài ra, `sanitize_folder_name` loại bỏ '..' và dấu '/' nếu đi qua hàm.
    """
    # 1. URL traversal -> 404 (bị chặn ở tầng route)
    r = client.get("/api/admin/songs/check-folder/../../etc", headers=_auth_headers())
    assert r.status_code == 404, "Path traversal phải bị chặn (404)"

    # 2. Folder chứa '..' nhưng encode -> sanitize loại bỏ
    r2 = client.get("/api/admin/songs/check-folder/..%2f..%2fetc", headers=_auth_headers())
    assert r2.status_code in (200, 404)
    if r2.status_code == 200:
        assert "../" not in r2.json().get("folder_name", "")


def test_upload_create_new_song():
    """Luồng TẠO MỚI: upload audio + cover cho folder chưa tồn tại -> INSERT."""
    folder = f"test_new_{uuid.uuid4().hex[:8]}"
    files = {
        "audio_file": ("audio.mp3", _make_audio_bytes(), "audio/mpeg"),
        "cover_image": ("cover.png", io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"0" * 20), "image/png"),
    }
    data = {"folder_name": folder, "title": "Bài Hát Test", "artist": "D4M Test"}
    r = client.post("/api/admin/songs/upload", data=data, files=files, headers=_auth_headers())

    assert r.status_code == 200, f"Upload thất bại: {r.text}"
    body = r.json()
    assert body["is_new"] is True, "Phải tạo mới"
    assert body["folder_name"] == folder
    assert body["saved_files"].get("audio_file"), "Phải lưu audio_file"
    assert body["saved_files"].get("cover_image"), "Phải lưu cover_image"

    # Verify record trong DB
    from core.database import db_executor
    row = db_executor.select_as_list_dict(
        "SELECT folder_name, title, artist, audio_file, cover_image FROM songs WHERE folder_name=%s",
        (folder,))
    assert row and row[0]["title"] == "Bài Hát Test", "Record chưa được INSERT đúng"


def test_upload_update_existing_song():
    """Luồng CẬP NHẬT: upload thêm lyric cho folder đã tồn tại -> UPDATE (partial)."""
    # Tạo folder đã có trước
    folder = f"test_upd_{uuid.uuid4().hex[:8]}"
    files = {"audio_file": ("audio.mp3", _make_audio_bytes(), "audio/mpeg")}
    client.post("/api/admin/songs/upload", data={"folder_name": folder, "title": "Gốc", "artist": "D4M"},
                files=files, headers=_auth_headers())

    # Upload thêm lyric + đổi artist (partial: không gửi lại audio)
    files2 = {"lyric_file": ("lyric.lrc", io.BytesIO(b"[00:00.00]La la la\n"), "text/plain")}
    data2 = {"folder_name": folder, "artist": "Nghệ Sĩ Mới"}
    r2 = client.post("/api/admin/songs/upload", data=data2, files=files2, headers=_auth_headers())

    assert r2.status_code == 200, f"Update thất bại: {r2.text}"
    body = r2.json()
    assert body["is_new"] is False, "Phải là cập nhật (đã tồn tại)"
    assert body["saved_files"].get("lyric_file"), "Phải lưu lyric_file"

    from core.database import db_executor
    row = db_executor.select_as_list_dict(
        "SELECT artist, lyric_file, audio_file FROM songs WHERE folder_name=%s", (folder,))
    assert row, "Không tìm thấy record"
    assert row[0]["artist"] == "Nghệ Sĩ Mới", "artist chưa được UPDATE"
    # lyric_file được đổi tên theo folder (vd: test_upd_xxx.lrc)
    assert row[0]["lyric_file"] == f"{folder}.lrc", f"lyric_file chưa được UPDATE đúng, nhận {row[0]['lyric_file']}"
    # audio_file được đổi tên theo folder (bước tạo mới)
    assert row[0]["audio_file"] == f"{folder}.mp3", f"audio_file sai, nhận {row[0]['audio_file']}"
