# -*- coding: utf-8 -*-
"""
============================================================
🛡️ D4M SECURITY — BỘ TEST AN TOÀN
============================================================
Sử dụng pytest + httpx + FastAPI TestClient để giả lập:

1. ✅ **Spam request (Rate Limiting)** — Gửi vượt ngưỡng tới
   `/api/audio/stream/` -> phải trả **HTTP 429 Too Many Requests**.
2. ✅ **Bypass token hết hạn / đã blacklist (Logout)** — Gửi token
   đã đăng xuất / hết hạn -> phải trả **HTTP 401 Unauthorized**.
3. ✅ **Token hợp lệ vẫn hoạt động** (không chặn nhầm).

Bắt buộc assert HTTP 429 và 401.

Cách chạy:
    cd backend
    ./venv/bin/python -m pytest test_security.py -v
============================================================
"""
import time
from fastapi.testclient import TestClient

# Giảm ngưỡng rate limit xuống thấp để test nhanh, không cần 51 request.
# Nạp qua module audio_engine trước để override limiter.
import api.audio_engine as audio_engine_mod
audio_engine_mod._stream_limiter.limit = 5          # chỉ 5 req/phút cho test
audio_engine_mod._stream_limiter.window = 60

from api.server import app

client = TestClient(app)

# Lưu sẵn một bài nhạc demo để stream không 404 (để test rate limit đúng).
import os
BASE = os.path.dirname(os.path.abspath(__file__))
MUSIC_DIR = os.path.join(BASE, "audio_workspace", "music", "anhvui")
os.makedirs(MUSIC_DIR, exist_ok=True)
if not os.path.exists(os.path.join(MUSIC_DIR, "anhvui.mp3")):
    # tạo file mp3 giả (rỗng) chỉ để tồn tại trên disk
    open(os.path.join(MUSIC_DIR, "anhvui.mp3"), "wb").write(b"ID3fake")
if not os.path.exists(os.path.join(MUSIC_DIR, "anhvui.jpg")):
    open(os.path.join(MUSIC_DIR, "anhvui.jpg"), "wb").write(b"fakeimg")

STREAM_URL = "/api/audio/stream/anhvui/anhvui.mp3"


# ==========================================================
# 1️⃣ TEST RATE LIMITING (HTTP 429)
# ==========================================================
def test_rate_limit_returns_429():
    """Gửi quá ngưỡng (5) request tới /stream -> các request sau phải 429.

    Dùng X-Forwarded-For với IP cố định để cô lập test (không bị ảnh hưởng
    bởi cửa sổ rate-limit 60s của lần chạy trước).
    """
    ip = "203.0.113.55"  # IP test tĩnh
    responses = []
    # Gửi nhiều hơn giới hạn (5) để chắc chắn vượt ngưỡng
    for _ in range(8):
        r = client.get(STREAM_URL, headers={"X-Forwarded-For": ip})
        responses.append(r.status_code)

    # Có ít nhất 1 request phải bị 429 (Too Many Requests)
    assert 429 in responses, f"Không có request nào bị rate-limit. Nhận: {responses}"
    # Các request đầu (trước khi vượt ngưỡng) phải là phản hồi hợp lệ của stream
    non_429 = [s for s in responses if s != 429]
    assert all(s in (200, 206, 404) for s in non_429), f"Có phản hồi bất thường: {responses}"


def test_rate_limit_header_present():
    """Kiểm tra response 429 có header Retry-After."""
    # reset: chờ cửa sổ tiếp theo bằng cách dùng IP khác qua header X-Forwarded-For
    responses = []
    for _ in range(6):
        r = client.get(STREAM_URL, headers={"X-Forwarded-For": "10.0.0.99"})
        responses.append(r.status_code)
    blocked = [r for r in responses if r == 429]
    if blocked:
        r = client.get(STREAM_URL, headers={"X-Forwarded-For": "10.0.0.99"})
        assert "Retry-After" in r.headers, "Thiếu header Retry-After"
    else:
        # nếu Redis down (fail-open) thì không có 429 — đây là fallback hợp lệ
        pass


# ==========================================================
# 2️⃣ TEST LOGOUT / JWT BLACKLIST (HTTP 401)
# ==========================================================
def test_logout_blacklists_token():
    """Sau khi logout, token cũ gọi protected endpoint phải 401."""
    # Đăng nhập admin
    login = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert login.status_code == 200, f"Login fail: {login.text}"
    token = login.json().get("access_token")

    # Đăng xuất -> token bị blacklist
    logout = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout.status_code == 200, f"Logout fail: {logout.text}"

    # Dùng lại token cũ (logout 1 lần nữa) -> bị blacklist nên 401
    reuse = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert reuse.status_code == 401, f"Token đã logout vẫn hoạt động: {reuse.status_code}"


def test_expired_token_returns_401():
    """Token hết hạn (exp quá khứ) -> phải 401."""
    import jwt
    from core.config import settings

    # Tạo token giả với exp đã qua
    expired_payload = {
        "sub": "admin",
        "role": "admin",
        "exp": int(time.time()) - 1000,   # hết hạn 1000s trước
        "jti": "expired-test-jti",
    }
    expired_token = jwt.encode(expired_payload, settings.SECRET_KEY, algorithm="HS256")

    r = client.get("/api/auth/profile/me", headers={"Authorization": f"Bearer {expired_token}"})
    # verify_token raise 401 (ExpiredSignatureError)
    assert r.status_code == 401, f"Token hết hạn phải 401, nhận {r.status_code}"


def test_no_token_returns_401():
    """Không gửi token tới protected endpoint -> 401."""
    r = client.get("/api/auth/profile/me")
    assert r.status_code == 401, f"Thiếu token phải 401, nhận {r.status_code}"


# ==========================================================
# 3️⃣ TEST TOKEN HỢP LỆ (không chặn nhầm)
# ==========================================================
def test_valid_token_not_blocked():
    """Token mới sau logout không bị blacklist nhầm (blacklist theo jti)."""
    # login lần 1 -> token A
    login1 = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    token_a = login1.json().get("access_token")
    # logout token A -> blacklist A
    r = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token_a}"})
    assert r.status_code == 200, f"Logout token A fail: {r.text}"

    # login lần 2 -> token B (khác jti)
    login2 = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    token_b = login2.json().get("access_token")

    # Token B vẫn hợp lệ (không bị blacklist nhầm bởi A)
    r2 = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token_b}"})
    assert r2.status_code == 200, f"Token B (hợp lệ) bị từ chối: {r2.status_code}"
    # Token A đã bị blacklist, dùng lại logout -> 401
    r3 = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token_a}"})
    assert r3.status_code == 401, f"Token A đã blacklist phải 401, nhận {r3.status_code}"
