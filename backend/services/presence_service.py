# -*- coding: utf-8 -*-
"""
============================================================
🟢 PRESENCE SERVICE — Online/Offline bằng REDIS BITMAP
============================================================
Mỗi user có 1 bitmap theo NGÀY: key `seen:{uid}:{YYYYMMDD}`
  • bit thứ N (0..1439) = phút thứ N trong ngày → SETBIT khi user hoạt động
  • "Online"  = có bit trong ~5 phút gần nhất
  • "Online X phút/giờ trước" = quét ngược bitmap hôm nay/hôm qua tìm bit cuối

Ghi nhận hoạt động: gọi `ping(uid)` từ middleware/auth — tự throttle
theo phút bằng key `seenmin:{uid}` (TTL 90s) để không spam Redis.
============================================================
"""
import time
from datetime import datetime, timedelta

ONLINE_WINDOW_MIN = 5          # trong 5 phút gần nhất → "online"
SCAN_BACK_HOURS = 48           # quét ngược tối đa 48h


def _redis():
    try:
        from core.rate_limit import _get_redis
        return _get_redis()
    except Exception:
        return None


def _day_key(uid, d):
    return f"seen:{uid}:{d.strftime('%Y%m%d')}"


# ==========================================
# 📥 GHI NHẬN HOẠT ĐỘNG (throttle 1 phút)
# ==========================================
def ping(user_id: int):
    r = _redis()
    if not r:
        return
    try:
        now = datetime.now()
        minute = now.hour * 60 + now.minute
        # throttle: chỉ SETBIT khi sang phút mới
        if not r.set(f"seenmin:{user_id}", minute, nx=True, ex=90):
            return
        r.setbit(_day_key(user_id, now), minute, 1)
        r.expire(_day_key(user_id, now), 86400 * 3)  # giữ 3 ngày
    except Exception:
        pass


# ==========================================
# 📤 TRẠNG THÁI + "ONLINE X TRƯỚC"
# ==========================================
def _last_set_bit_before(r, uid, day, upto_minute):
    """Quét ngược từ upto_minute về 0 trong bitmap của `day`. Trả phút hoặc -1."""
    try:
        raw = r.get(_day_key(uid, day))
    except Exception:
        return -1
    if not raw:
        return -1
    # raw có thể bytes hoặc str (decode_responses) → chuẩn hoá về list int byte
    data = raw if isinstance(raw, (bytes, bytearray)) else raw.encode("latin-1")
    # bit thứ m nằm ở byte m//8, bit (7 - m%8) (Redis SETBIT big-endian trong byte)
    for m in range(min(upto_minute, 1439), -1, -1):
        byte = data[m // 8] if m // 8 < len(data) else 0
        if byte & (0x80 >> (m % 8)):
            return m
    return -1


def last_seen_minutes(user_id: int):
    """Số phút kể từ hoạt động gần nhất. -1 nếu không thấy trong 48h."""
    r = _redis()
    if not r:
        return -1
    now = datetime.now()
    cur = now.hour * 60 + now.minute
    # hôm nay
    m = _last_set_bit_before(r, user_id, now, cur)
    if m >= 0:
        return cur - m
    # hôm qua (phút = 1439 về phần còn lại)
    yest = now - timedelta(days=1)
    m = _last_set_bit_before(r, user_id, yest, 1439)
    if m >= 0:
        return (cur + 60) + (1439 - m)
    # xa hơn: quét từng ngày trong giới hạn
    for back in range(2, int(SCAN_BACK_HOURS / 24) + 1):
        d = now - timedelta(days=back)
        m = _last_set_bit_before(r, user_id, d, 1439)
        if m >= 0:
            return back * 1440 - m + cur
    return -1


def is_online(user_id: int) -> bool:
    mins = last_seen_minutes(user_id)
    return 0 <= mins <= ONLINE_WINDOW_MIN


def describe(user_id: int) -> dict:
    """{online: bool, label: 'Đang online' | 'Online 2 giờ trước' | 'Vắng'}"""
    mins = last_seen_minutes(user_id)
    if mins < 0:
        return {"online": False, "label": "Vắng mặt", "minutes": None}
    if mins <= ONLINE_WINDOW_MIN:
        return {"online": True, "label": "Đang online", "minutes": mins}
    if mins < 60:
        return {"online": False, "label": f"Online {mins} phút trước", "minutes": mins}
    hours = mins // 60
    if hours < 24:
        return {"online": False, "label": f"Online {hours} giờ trước", "minutes": mins}
    return {"online": False, "label": f"Online {mins // 1440} ngày trước", "minutes": mins}


def describe_many(user_ids) -> dict:
    return {uid: describe(uid) for uid in user_ids}
