# -*- coding: utf-8 -*-
"""
============================================================
👤 D4M PROFILE CÔNG KHAI
============================================================
- GET /api/users/{username}: thông tin user + playlist công khai
  (dùng để xem hồ sơ người khác, không cần đăng nhập).
============================================================
"""
import logging

from fastapi import APIRouter, HTTPException

from core.database import db_executor
from core.cache import cache_get, cache_set
from core import urls as U
from api.d4m_music import _song_json, _pl_folder
from services.spirit_service import spirit_select_sql, spirit_payload

logger = logging.getLogger("d4m_profile_public")

router = APIRouter(prefix=U.USERS["PREFIX"], tags=["Profile Public"])


@router.get(U.USERS["DETAIL"])
def get_public_profile(username: str):
    """Hồ sơ công khai của user + các playlist công khai của họ."""
    # Cache 60s
    cache_key = f"profile:{username}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    try:
        # 1. Thông tin user (kèm khung viền + Linh thú/Linh bảo)
        users = db_executor.select_as_list_dict(
            f"SELECT id, username, full_name, avatar_url, role, created_at, "
            f"avatar_frame, name_effect, {spirit_select_sql()} "
            f"FROM users u WHERE u.username=%s AND u.active=1", (username,))
        if not users:
            raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ công khai.")

        user = dict(users[0])

        # 2. Playlist công khai của user
        from core.database import db_manager
        playlists = db_executor.select_as_list_dict(
            "SELECT id, name, description, cover_image, created_at "
            "FROM playlists WHERE user_id=%s AND is_public=1 ORDER BY created_at DESC",
            (user["id"],))

        # 3. Đếm số bài trong playlist (dùng group by — tránh N+1)
        pl_json = []
        if playlists:
            from api.d4m_music import _playlists_json
            # _playlists_json cần conn (pymysql dict cursor); dùng db_executor gộp
            ids = [p["id"] for p in playlists]
            placeholders = ",".join(["%s"] * len(ids))
            counts = {}
            rows = db_executor.select_as_list_dict(
                f"SELECT playlist_id, COUNT(*) c FROM playlist_songs WHERE playlist_id IN ({placeholders}) GROUP BY playlist_id",
                ids)
            counts = {r["playlist_id"]: r["c"] for r in rows}
            for p in playlists:
                pl_json.append({
                    "id": p["id"], "name": p["name"], "description": p.get("description"),
                    "cover": p.get("cover_image"),
                    "song_count": counts.get(p["id"], 0),
                })

        spirit = spirit_payload(user)
        result = {
            "status": "success",
            "user": {
                "id": user["id"],
                "username": user["username"],
                "full_name": user["full_name"] or user["username"],
                "avatar_url": user["avatar_url"] or "",
                "role": user["role"],
                "created_at": user["created_at"].isoformat() if hasattr(user["created_at"], "isoformat") else str(user["created_at"] or ""),
                # 🖼️🐉💎 Cá nhân hóa
                "avatar_frame": user.get("avatar_frame"),
                "name_effect": user.get("name_effect") or "default",
                "pet": spirit["pet"],
                "treasure": spirit["treasure"],
            },
            "playlists": pl_json,
        }
        cache_set(cache_key, result, ttl=60)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"👤 Lỗi profile công khai {username}: {e}")
        raise HTTPException(status_code=500, detail="Lỗi lấy hồ sơ.")
