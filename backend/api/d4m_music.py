# -*- coding: utf-8 -*-
"""
D4M MUSIC (Bản gộp) - Backend module music riêng của D4M Music Pro
Chạy chung DB `social_hub` với toàn hệ sinh thái, prefix `/api/dmusic/*`

Đã vá các lỗi:
- Xác thực JWT qua Authorization header (không còn user_id query param giả mạo)
- Dùng connection pool (không mở/đóng connection mỗi request)
- Sanitize SQL LIKE (% , _) chống wildcard abuse
- Kiểm tra email trùng khi đăng ký
- Cache ảnh bìa (tránh os.path.exists mỗi request)
"""
import os
import re
import time
import logging
import threading
import queue
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from core.security import get_password_hash, verify_password, create_access_token
from core import urls as U
from core.cache import cache_get, cache_set, cache_delete_prefix

logger = logging.getLogger("d4m_music")

router = APIRouter(prefix=U.DMUSIC["PREFIX"], tags=["D4M Music (Merged)"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MUSIC_DIR = os.path.join(BASE_DIR, "audio_workspace", "music")

# ==========================================
# 🔑 AUTH SECURITY (Optional & Required JWT)
# ==========================================
_bearer = HTTPBearer(auto_error=False)


def get_optional_user_id(credentials: HTTPAuthorizationCredentials = Depends(_bearer)) -> int | None:
    """Lấy user_id từ JWT nếu có token, trả None nếu không (endpoint public)."""
    if not credentials:
        return None
    from core.security import decode_token
    payload = decode_token(credentials.credentials)
    if not payload:
        return None
    try:
        return int(payload.get("sub"))
    except (TypeError, ValueError):
        return None


def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(_bearer)) -> int:
    """Bắt buộc có token hợp lệ, trả user_id (endpoint cá nhân)."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Cần đăng nhập để truy cập.")
    from core.security import decode_token
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Token không hợp lệ hoặc đã hết hạn.")
    try:
        return int(payload["sub"])
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Token không hợp lệ.")


# ==========================================
# 🗄️ CONNECTION POOL (Thread-safe, tự viết)
# ==========================================
import pymysql
from pymysql.cursors import DictCursor

_pool_q = None
_pool_lock = threading.Lock()
_POOL_SIZE = 10


def _make_conn():
    from dotenv import load_dotenv
    load_dotenv(os.path.join(BASE_DIR, ".env"))
    return pymysql.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASS", ""),
        database=os.getenv("DB_NAME", "social_hub"),
        cursorclass=DictCursor,
        autocommit=False,
        charset="utf8mb4",
    )


def _get_pool():
    global _pool_q
    if _pool_q is None:
        with _pool_lock:
            if _pool_q is None:
                _pool_q = queue.Queue(maxsize=_POOL_SIZE)
                for _ in range(_POOL_SIZE):
                    try:
                        _pool_q.put(_make_conn())
                    except Exception as e:
                        logger.error(f"Khởi tạo connection pool lỗi: {e}")
                        break
    return _pool_q


def _db():
    from contextlib import contextmanager

    @contextmanager
    def _ctx():
        pool = _get_pool()
        conn = None
        try:
            try:
                conn = pool.get_nowait()
            except queue.Empty:
                conn = _make_conn()
            yield conn
            try:
                conn.commit()
            except Exception:
                pass
        except Exception:
            try:
                conn.rollback()
            except Exception:
                pass
            raise
        finally:
            if conn is not None:
                try:
                    pool.put_nowait(conn)
                except queue.Full:
                    try:
                        conn.close()
                    except Exception:
                        pass

    return _ctx()


# ==========================================
# MODELS
# ==========================================
class RegisterReq(BaseModel):
    username: str
    password: str
    full_name: str = ""
    email: str = None


class LoginReq(BaseModel):
    username: str
    password: str


class GuestReq(BaseModel):
    username: str = ""


class InteractReq(BaseModel):
    song_id: int
    action: str  # view | download


class ToggleLikeReq(BaseModel):
    song_id: int


# ==========================================
# HELPERS
# ==========================================
# Cache (project, cover) -> url để tránh os.path.exists lặp lại
_cover_cache = {}


def _cover_url(folder, cover):
    if not cover:
        return "/api/audio/cover/default/default.jpg"
    key = (folder, cover)
    if key not in _cover_cache:
        if os.path.exists(os.path.join(MUSIC_DIR, folder, cover)):
            _cover_cache[key] = f"/api/audio/cover/{folder}/{cover}"
        else:
            _cover_cache[key] = "/api/audio/cover/default/default.jpg"
    return _cover_cache[key]


def _song_json(row):
    folder = row.get("folder_name") or row.get("project") or ""
    return {
        "id": row["id"],
        "folder_name": folder,
        "title": row["title"],
        "artist": row["artist"],
        "cover": _cover_url(folder, row.get("cover_image")),
        "audio": f"/api/audio/stream/{folder}/{row.get('audio_file') or row.get('file')}",
        "beat": f"/api/audio/stream/{folder}/{row['beat_file']}" if row.get("beat_file") else None,
        "lyrics": f"/api/audio/lyrics/{folder}/{row['lyric_file']}" if row.get("lyric_file") else None,
        "duration": row.get("duration") or 0,
        "total_views": row.get("total_views") or 0,
        "total_likes": row.get("total_likes") or 0,
        "total_downloads": row.get("total_downloads") or 0,
    }


def _user_public(row):
    return {
        "id": row["id"],
        "username": row["username"],
        "full_name": row.get("full_name") or row.get("fullname"),
        "email": row.get("email"),
        "avatar_url": row.get("avatar_url") or "",
        "role": row.get("role") or -1,
        "is_verified": bool(row.get("is_verified")),
    }


def _sanitize_like(q: str) -> str:
    """Chống wildcard abuse %_%_ trong LIKE."""
    return q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _get_liked_ids(conn, user_id):
    if not user_id:
        return set()
    with conn.cursor() as cur:
        cur.execute("SELECT song_id FROM song_likes WHERE user_id=%s", (user_id,))
        return {r["song_id"] for r in cur.fetchall()}


# ==========================================
# 🔑 AUTH
# ==========================================
@router.post(U.DMUSIC["AUTH_REGISTER"])
def d4m_register(req: RegisterReq):
    with _db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE username=%s", (req.username,))
            if cur.fetchone():
                raise HTTPException(400, "Tên đăng nhập đã tồn tại.")
            if req.email:
                cur.execute("SELECT id FROM users WHERE email=%s", (req.email,))
                if cur.fetchone():
                    raise HTTPException(400, "Email đã được sử dụng.")
            cur.execute(
                "INSERT INTO users (username, full_name, email, password_hash, avatar_url, role, is_verified, active) "
                "VALUES (%s,%s,%s,%s,'',-1,1,1)",
                (req.username, req.full_name or req.username, req.email,
                 get_password_hash(req.password)),
            )
            uid = cur.lastrowid
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE id=%s", (uid,))
            row = cur.fetchone()
    token = create_access_token({"sub": str(uid), "role": -1})
    return {"status": "success", "access_token": token, "token_type": "bearer", "user": _user_public(row)}


@router.post(U.DMUSIC["AUTH_LOGIN"])
def d4m_login(req: LoginReq):
    with _db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE username=%s", (req.username,))
            row = cur.fetchone()
    if not row or not verify_password(req.password, row.get("password_hash") or ""):
        raise HTTPException(401, "Sai tên đăng nhập hoặc mật khẩu.")
    if row.get("active") != 1:
        raise HTTPException(403, "Tài khoản đã bị khóa.")
    token = create_access_token({"sub": str(row["id"]), "role": row.get("role")})
    return {"status": "success", "access_token": token, "token_type": "bearer", "user": _user_public(row)}


@router.post(U.DMUSIC["AUTH_GUEST"])
def d4m_guest(req: GuestReq):
    base = (req.username or "khach").strip().lower().replace(" ", "_")
    username = f"{base}_{int(time.time() * 1000)}"
    avatar = f"https://api.dicebear.com/7.x/avataaars/svg?seed={username}"
    with _db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (username, full_name, password_hash, avatar_url, role, is_verified, active) "
                "VALUES (%s,%s,'',%s,-1,0,1)",
                (username, req.username or "Khách nghe nhạc", avatar),
            )
            uid = cur.lastrowid
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE id=%s", (uid,))
            row = cur.fetchone()
    token = create_access_token({"sub": str(uid), "role": -1})
    return {"status": "success", "access_token": token, "token_type": "bearer", "user": _user_public(row)}


# ==========================================
# 🎵 MUSIC (Public, optional auth để hiện liked)
# ==========================================
@router.get(U.DMUSIC["MUSIC_HOME"])
def d4m_home(user_id: int = Depends(get_optional_user_id)):
    # Cache theo user để giảm tải DB (60s). Không cache khi không đăng nhập dùng key chung.
    cache_key = f"home:{user_id or 0}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    with _db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM songs WHERE status=1 ORDER BY total_views DESC LIMIT 20")
            trending = cur.fetchall()
            cur.execute("SELECT * FROM playlists WHERE is_public=1 ORDER BY created_at DESC LIMIT 10")
            playlists = cur.fetchall()
            liked_ids = _get_liked_ids(conn, user_id)

        pl_json = _playlists_json(conn, playlists)

        songs = []
        for s in trending:
            js = _song_json(s)
            js["liked"] = s["id"] in liked_ids
            songs.append(js)

        result = {"status": "success", "trending": songs, "playlists": pl_json}

    cache_set(cache_key, result, ttl=60)
    return result


def _playlists_json(conn, playlists):
    """Build playlist JSON + song_count gộp 1 query (tránh N+1)."""
    if not playlists:
        return []
    ids = [p["id"] for p in playlists]
    # 1 query lấy số bài cho mọi playlist
    counts = {}
    with conn.cursor() as cur:
        placeholders = ",".join(["%s"] * len(ids))
        cur.execute(
            f"SELECT playlist_id, COUNT(*) c FROM playlist_songs WHERE playlist_id IN ({placeholders}) GROUP BY playlist_id",
            ids)
        for row in cur.fetchall():
            counts[row["playlist_id"]] = row["c"]

    pl_json = []
    for p in playlists:
        pl_json.append({
            "id": p["id"], "name": p["name"], "description": p.get("description"),
            "cover": f"/api/audio/cover/{_pl_folder(conn, p['id'])}/{p['cover_image']}" if p.get("cover_image") else None,
            "song_count": counts.get(p["id"], 0), "is_public": bool(p.get("is_public")),
        })
    return pl_json


def _pl_folder(conn, playlist_id):
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT s.folder_name, s.cover_image FROM playlist_songs ps "
                "JOIN songs s ON s.id=ps.song_id WHERE ps.playlist_id=%s ORDER BY ps.sort_order LIMIT 1",
                (playlist_id,),
            )
            row = cur.fetchone()
        if row and row.get("cover_image") and os.path.exists(os.path.join(MUSIC_DIR, row["folder_name"], row["cover_image"])):
            return row["folder_name"]
    except Exception:
        pass
    return "default"


@router.get(U.DMUSIC["MUSIC_SEARCH"])
def d4m_search(q: str = "", user_id: int = Depends(get_optional_user_id)):
    with _db() as conn:
        q = (q or "").strip()
        with conn.cursor() as cur:
            if q:
                like = f"%{_sanitize_like(q)}%"
                cur.execute(
                    "SELECT * FROM songs WHERE status=1 AND (title LIKE %s OR artist LIKE %s ESCAPE '\\\\') "
                    "ORDER BY total_views DESC LIMIT 50", (like, like))
            else:
                cur.execute("SELECT * FROM songs WHERE status=1 ORDER BY total_views DESC LIMIT 50")
            rows = cur.fetchall()
            liked_ids = _get_liked_ids(conn, user_id)
        songs = []
        for s in rows:
            js = _song_json(s)
            js["liked"] = s["id"] in liked_ids
            songs.append(js)
        return {"status": "success", "query": q, "total": len(songs), "results": songs}


@router.get(U.DMUSIC["MUSIC_PLAYLIST"])
def d4m_playlist(playlist_id: int, user_id: int = Depends(get_optional_user_id)):
    with _db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM playlists WHERE id=%s", (playlist_id,))
            pl = cur.fetchone()
            if not pl:
                raise HTTPException(404, "Không tìm thấy playlist.")
            cur.execute(
                "SELECT s.* FROM playlist_songs ps JOIN songs s ON s.id=ps.song_id "
                "WHERE ps.playlist_id=%s AND s.status=1 ORDER BY ps.sort_order", (playlist_id,))
            rows = cur.fetchall()
            liked_ids = _get_liked_ids(conn, user_id)
        songs = []
        for s in rows:
            js = _song_json(s)
            js["liked"] = s["id"] in liked_ids
            songs.append(js)
        return {
            "status": "success",
            "playlist": {
                "id": pl["id"], "name": pl["name"], "description": pl.get("description"),
                "cover": f"/api/audio/cover/{_pl_folder(conn, pl['id'])}/{pl['cover_image']}" if pl.get("cover_image") else None,
                "song_count": len(songs),
            },
            "songs": songs,
        }


# ==========================================
# 📚 LIBRARY (Bắt buộc JWT)
# ==========================================
@router.get(U.DMUSIC["LIB_LIKED"])
def d4m_liked(user_id: int = Depends(get_current_user_id)):
    with _db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT s.* FROM song_likes sl JOIN songs s ON s.id=sl.song_id "
                "WHERE sl.user_id=%s AND s.status=1 ORDER BY sl.liked_at DESC", (user_id,))
            rows = cur.fetchall()
        songs = []
        for s in rows:
            js = _song_json(s)
            js["liked"] = True
            songs.append(js)
        return {"status": "success", "songs": songs}


@router.get(U.DMUSIC["LIB_HISTORY"])
def d4m_history(user_id: int = Depends(get_current_user_id)):
    with _db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT s.*, MAX(sv.listened_at) last_listen FROM song_views sv "
                "JOIN songs s ON s.id=sv.song_id WHERE sv.user_id=%s AND s.status=1 "
                "GROUP BY s.id ORDER BY last_listen DESC LIMIT 50", (user_id,))
            rows = cur.fetchall()
            liked_ids = _get_liked_ids(conn, user_id)
        songs = []
        for s in rows:
            js = _song_json(s)
            js["liked"] = s["id"] in liked_ids
            js["last_listen"] = s.get("last_listen")
            songs.append(js)
        return {"status": "success", "songs": songs}


@router.get(U.DMUSIC["LIB_MY_PLAYLISTS"])
def d4m_my_playlists(user_id: int = Depends(get_current_user_id)):
    with _db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM playlists WHERE user_id=%s ORDER BY created_at DESC", (user_id,))
            playlists = cur.fetchall()
        # Gộp COUNT thành 1 query (tránh N+1)
        pl_json = _playlists_json(conn, playlists)
        return {"status": "success", "playlists": pl_json}


@router.post(U.DMUSIC["LIB_INTERACT"])
def d4m_interact(req: InteractReq, request: Request, user_id: int = Depends(get_optional_user_id)):
    """Ghi nhận lượt nghe/tải. user_id lấy từ JWT (nullable nếu khách)."""
    with _db() as conn:
        ip = request.client.host
        with conn.cursor() as cur:
            if req.action == "view":
                cur.execute("UPDATE songs SET total_views=total_views+1 WHERE id=%s", (req.song_id,))
                cur.execute("INSERT INTO song_views (song_id, user_id, ip_address) VALUES (%s,%s,%s)",
                            (req.song_id, user_id, ip))
            elif req.action == "download":
                cur.execute("UPDATE songs SET total_downloads=total_downloads+1 WHERE id=%s", (req.song_id,))
                cur.execute("INSERT INTO song_downloads (song_id, user_id, file_type, ip_address) VALUES (%s,%s,'mp3',%s)",
                            (req.song_id, user_id, ip))
            else:
                raise HTTPException(400, "Hành động không hợp lệ.")
    return {"status": "success", "action": req.action}


@router.post(U.DMUSIC["LIB_TOGGLE_LIKE"])
def d4m_toggle_like(req: ToggleLikeReq, user_id: int = Depends(get_current_user_id)):
    with _db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM song_likes WHERE user_id=%s AND song_id=%s", (user_id, req.song_id))
            exists = cur.fetchone()
            if exists:
                cur.execute("DELETE FROM song_likes WHERE user_id=%s AND song_id=%s", (user_id, req.song_id))
                cur.execute("UPDATE songs SET total_likes=GREATEST(total_likes-1,0) WHERE id=%s", (req.song_id,))
                liked = False
            else:
                cur.execute("INSERT INTO song_likes (user_id, song_id) VALUES (%s,%s)", (user_id, req.song_id))
                cur.execute("UPDATE songs SET total_likes=total_likes+1 WHERE id=%s", (req.song_id,))
                liked = True
            cur.execute("SELECT total_likes FROM songs WHERE id=%s", (req.song_id,))
            tl = cur.fetchone()["total_likes"]
    # Xóa cache home (liked state đổi)
    cache_delete_prefix("home:")
    return {"status": "success", "liked": liked, "total_likes": tl}
