# -*- coding: utf-8 -*-
"""
============================================================
⚡ D4M CACHE — Redis JSON Cache (tăng hiệu năng, giảm tải DB)
============================================================
- cache_get(key)        : lấy JSON từ Redis (None nếu miss/Redis down)
- cache_set(key, value) : lưu JSON với TTL
- cache_delete_prefix   : xóa theo prefix (khi data đổi)
- Graceful: Redis down thì bỏ qua (fail-open, không làm hỏng request)
============================================================
"""
import json
import logging

logger = logging.getLogger("d4m_cache")

# Dùng chung redis client với rate_limit
from core.rate_limit import _get_redis


def cache_get(key: str):
    """Trả JSON hoặc None nếu miss / Redis không khả dụng."""
    r = _get_redis()
    if r is None:
        return None
    try:
        raw = r.get(f"d4m:cache:{key}")
        return json.loads(raw) if raw else None
    except Exception as e:
        logger.warning(f"⚠️ Cache get lỗi (fail-open): {e}")
        return None


def cache_set(key: str, value, ttl: int = 60):
    """Lưu JSON với TTL (giây). Trả False nếu Redis down."""
    r = _get_redis()
    if r is None:
        return False
    try:
        r.setex(f"d4m:cache:{key}", ttl, json.dumps(value, ensure_ascii=False, default=str))
        return True
    except Exception as e:
        logger.warning(f"⚠️ Cache set lỗi (fail-open): {e}")
        return False


def cache_delete(key: str):
    r = _get_redis()
    if r is None:
        return
    try:
        r.delete(f"d4m:cache:{key}")
    except Exception:
        pass


def cache_delete_prefix(prefix: str):
    """Xóa toàn bộ key bắt đầu bằng prefix (dùng khi data đổi)."""
    r = _get_redis()
    if r is None:
        return
    try:
        keys = r.keys(f"d4m:cache:{prefix}*")
        if keys:
            r.delete(*keys)
    except Exception as e:
        logger.warning(f"⚠️ Cache delete prefix lỗi: {e}")
