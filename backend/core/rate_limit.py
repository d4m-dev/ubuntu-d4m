# -*- coding: utf-8 -*-
"""
============================================================
🛡️ D4M SECURITY — RATE LIMITING & JWT BLACKLIST (REDIS)
============================================================
Chống DDoS / leech băng thông / replay token đã đăng xuất.

- `RateLimiter`   : Fixed-window counter qua Redis (chống spam request).
- `is_token_blacklisted` / `blacklist_token` : Vô hiệu hoá JWT sau Logout.
- Graceful fallback: Nếu Redis không chạy, KHÔNG chặn (fail-open) để hệ
  thống không sập, đồng thời log cảnh báo.
============================================================
"""
import logging
import time
import uuid

from fastapi import HTTPException, Request
from core.config import settings

logger = logging.getLogger("d4m_security")

# ==========================================================
# 🔌 KẾT NỐI REDIS (Lazy, thread-safe, graceful fallback)
# ==========================================================
_redis = None
_redis_ok = None


def _get_redis():
    """Trả về redis client hoặc None nếu không kết nối được."""
    global _redis, _redis_ok
    if _redis_ok is False:
        return None
    if _redis is None:
        try:
            import redis
            _redis = redis.Redis(
                host=getattr(settings, "REDIS_HOST", "127.0.0.1"),
                port=int(getattr(settings, "REDIS_PORT", 6379)),
                db=0,
                socket_connect_timeout=0.5,
                socket_timeout=0.5,
                decode_responses=True,
            )
            _redis.ping()
            _redis_ok = True
            logger.info("✅ Redis Rate Limit & Blacklist: sẵn sàng.")
        except Exception as e:
            _redis_ok = False
            _redis = None
            logger.warning(f"⚠️ Redis không khả dụng (fail-open): {e}")
    return _redis


def redis_available() -> bool:
    return _get_redis() is not None


# ==========================================================
# 🚦 RATE LIMITER — Fixed Window (Redis INCR + EXPIRE)
# ==========================================================
class RateLimiter:
    """
    Giới hạn số request trong một cửa sổ thời gian theo IP.

    Cách hoạt động:
      1. key = rate:audio:{ip}:{window_id}
      2. INCR key, lần đầu tiên SET EXPIRE = window seconds
      3. Nếu count > limit -> 429 Too Many Requests

    `Redis INCR + EXPIRE` là atomic, nên chống race condition.
    """

    def __init__(self, limit: int = 50, window_seconds: int = 60, prefix: str = "rate"):
        self.limit = limit
        self.window = window_seconds
        self.prefix = prefix

    def check(self, client_ip: str) -> None:
        """Nếu vượt giới hạn -> raise HTTP 429."""
        r = _get_redis()
        # Fail-open: Redis down thì bỏ qua (tránh sập streaming)
        if r is None:
            return

        window_id = int(time.time() // self.window)
        key = f"d4m:{self.prefix}:{client_ip}:{window_id}"
        try:
            count = r.incr(key)
            if count == 1:
                r.expire(key, self.window + 5)
            if count > self.limit:
                retry_after = self.window - (time.time() % self.window)
                raise HTTPException(
                    status_code=429,
                    detail="⚠️ Quá nhiều yêu cầu. Vui lòng thử lại sau.",
                    headers={"Retry-After": str(int(retry_after))},
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"⚠️ Rate limit Redis lỗi (fail-open): {e}")

    def check_request(self, request: Request) -> None:
        """Helper lấy IP từ request rồi gọi check."""
        ip = _get_client_ip(request)
        self.check(ip)


def _get_client_ip(request: Request) -> str:
    """Lấy IP thật (ưu tiên X-Forwarded-For, fallback client host)."""
    fwd = request.headers.get("X-Forwarded-For")
    if fwd:
        # lấy IP đầu tiên (IP gốc của client)
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ==========================================================
# ⛔ JWT BLACKLIST (Vô hiệu hoá token sau Logout)
# ==========================================================
JTI_BLACKLIST_PREFIX = "d4m:jwt:blacklist"
JWT_DEFAULT_TTL = int(getattr(settings, "JWT_EXPIRE_MINUTES", 24 * 60) * 60)


def blacklist_token(jti: str, ttl: int = JWT_DEFAULT_TTL) -> bool:
    """
    Thêm jti của token vào blacklist với TTL = thời gian hết hạn token.
    Trả True nếu blacklist thành công (hoặc Redis down — fail-open vẫn trả True
    vì việc logout không nên fail).
    """
    r = _get_redis()
    if r is None:
        return True
    try:
        r.setex(f"{JTI_BLACKLIST_PREFIX}:{jti}", ttl, "1")
        return True
    except Exception as e:
        logger.warning(f"⚠️ Blacklist token lỗi (fail-open): {e}")
        return True


def is_token_blacklisted(jti: str) -> bool:
    """Kiểm tra token có trong blacklist không. Nếu Redis down -> False (không chặn)."""
    r = _get_redis()
    if r is None:
        return False
    try:
        return r.exists(f"{JTI_BLACKLIST_PREFIX}:{jti}") > 0
    except Exception:
        return False


def generate_jti() -> str:
    """Sinh JWT ID duy nhất cho mỗi token."""
    return uuid.uuid4().hex
