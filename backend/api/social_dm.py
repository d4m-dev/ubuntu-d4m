# -*- coding: utf-8 -*-
"""
============================================================
💬 D4M SOCIAL HUB — DM & BÌNH LUẬN (Threads-style)
============================================================
- DM 1-1 realtime qua WebSocket /api/ws/dm/{user_id}
- Hộp thư (danh sách cuộc trò chuyện) + cửa sổ chat
- Bình luận + reply lồng nhau theo từng bài post

Bảo mật: mọi endpoint đều yêu cầu Bearer token (SSO).
============================================================
"""
import asyncio
import json
import logging
from typing import Dict, List, Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from pydantic import BaseModel, Field

from core import urls as U
from core.database import db_executor, db_inserter, db_updater
from services.spirit_service import spirit_select_sql, spirit_payload

logger = logging.getLogger("d4m_social_dm")

# Dùng lại bộ lọc định danh token từ social.py (tránh trùng lặp mã)
from api.social import get_current_user

router = APIRouter(prefix=U.SOCIAL["PREFIX"], tags=["Social DM & Comments"])
ws_router = APIRouter(prefix=U.WS["PREFIX"], tags=["Social DM WebSocket"])


# ==========================================================
# 🔌 QUẢN LÝ KẾT NỐI WEBSOCKET TIN NHẮN
# ==========================================================
class DMManager:
    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(str(user_id), []).append(ws)

    def disconnect(self, user_id: str, ws: WebSocket):
        conns = self.active.get(str(user_id))
        if conns and ws in conns:
            conns.remove(ws)
            if not conns:
                self.active.pop(str(user_id), None)

    async def send_to_user(self, user_id, payload: dict) -> bool:
        conns = self.active.get(str(user_id))
        if not conns:
            return False
        msg = json.dumps(payload, ensure_ascii=False)
        for ws in list(conns):
            try:
                await ws.send_text(msg)
            except Exception:
                self.disconnect(str(user_id), ws)
        return True


dm_manager = DMManager()


# WS lắng nghe tin nhắn realtime (prefix /api/ws/dm/{user_id})
@ws_router.websocket(U.WS["WS_DM"])
async def ws_dm(websocket: WebSocket, user_id: str):
    await dm_manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data in ("ping", "keepalive"):
                await websocket.send_text("pong")
                continue
            # 💬 Typing indicator: chuyển tiếp cho người kia trong cuộc trò chuyện
            try:
                msg = json.loads(data)
                if msg.get("type") == "typing" and msg.get("conversation_id"):
                    cid = msg["conversation_id"]
                    convo = db_executor.select_as_list_dict(
                        "SELECT user1_id, user2_id FROM conversations WHERE id=%s", (cid,))
                    if convo:
                        c = convo[0]
                        me_id = int(user_id)
                        other = c["user1_id"] if c["user1_id"] != me_id else c["user2_id"]
                        await dm_manager.send_to_user(other, {
                            "type": "typing",
                            "conversation_id": cid,
                            "sender_id": me_id,
                        })
            except Exception:
                pass
    except WebSocketDisconnect:
        dm_manager.disconnect(user_id, websocket)
    except Exception as e:
        logger.warning(f"💬 WS DM user {user_id} lỗi: {e}")
        dm_manager.disconnect(user_id, websocket)
class ConversationCreate(BaseModel):
    user_id: int = Field(..., gt=0)


class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)


class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)
    parent_id: Optional[int] = None
    image_url: Optional[str] = None  # 🖼️ Bình luận/trả lời bằng ảnh


# ==========================================================
# 🛠️ HELPERS
# ==========================================================
def _canonical_pair(a: int, b: int):
    """Đảm bảo cặp (user1 < user2) để khớp UNIQUE KEY."""
    return (a, b) if a < b else (b, a)


def _convo_other_user(convo: dict, me: int) -> dict:
    """Lấy thông tin người còn lại trong cuộc trò chuyện (kèm khung viền + Linh thú/Linh bảo)."""
    other_id = convo["user1_id"] if convo["user1_id"] != me else convo["user2_id"]
    u = db_executor.select_as_list_dict(
        f"""SELECT id, username, COALESCE(fullname, full_name, username) as fullname, avatar_url, role,
                   avatar_frame, name_effect, {spirit_select_sql()}
            FROM users u WHERE u.id=%s""", (other_id,))
    if not u:
        return {"id": other_id, "username": "?user", "fullname": "Người dùng", "avatar_url": "", "role": -1}
    row = dict(u[0])
    row.update(spirit_payload(row))
    return row


# ==========================================================
# 🚀 DM — DANH SÁCH CUỘC TRÒ CHUYỆN (HỘP THƯ)
# ==========================================================
@router.get(U.SOCIAL["CONVERSATIONS"])
def list_conversations(current_user: dict = Depends(get_current_user)):
    me = current_user["user_id"]
    try:
        rows = db_executor.select_as_list_dict(
            """SELECT c.id, c.user1_id, c.user2_id, c.created_at, c.last_message_at,
                      (SELECT content FROM messages m WHERE m.conversation_id = c.id
                       ORDER BY m.created_at DESC LIMIT 1) AS last_content,
                      (SELECT sender_id FROM messages m WHERE m.conversation_id = c.id
                       ORDER BY m.created_at DESC LIMIT 1) AS last_sender,
                      (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id <> %s AND m.is_read = 0) AS unread
               FROM conversations c
               WHERE c.user1_id = %s OR c.user2_id = %s
               ORDER BY c.last_message_at DESC""",
            (me, me, me))
        data = []
        for c in rows:
            other = _convo_other_user(c, me)
            dt = c.get("last_message_at")
            dt_str = dt.isoformat() if hasattr(dt, "isoformat") else str(dt) if dt else None
            data.append({
                "conversation_id": c["id"],
                "user": other,
                "last_content": c.get("last_content"),
                "last_sender_id": c.get("last_sender"),
                "last_message_at": dt_str,
                "unread": c.get("unread") or 0,
            })
        return {"status": "success", "data": data}
    except Exception as e:
        logger.error(f"💬 list_conversations lỗi: {e}")
        raise HTTPException(status_code=500, detail="Lỗi lấy hộp thư.")


# ==========================================================
# 🚀 DM — TẠO / MỞ CUỘC TRÒ CHUYỆN VỚI 1 NGƯỜI
# ==========================================================
@router.post(U.SOCIAL["CONVERSATIONS"])
def open_conversation(body: ConversationCreate, current_user: dict = Depends(get_current_user)):
    me = current_user["user_id"]
    other = body.user_id
    if me == other:
        raise HTTPException(status_code=400, detail="Không thể nhắn tin cho chính mình.")

    u1, u2 = _canonical_pair(me, other)
    convo = db_executor.select_as_list_dict(
        "SELECT * FROM conversations WHERE user1_id=%s AND user2_id=%s", (u1, u2))
    if convo:
        cid = convo[0]["id"]
    else:
        cid = db_inserter.insert(
            "INSERT INTO conversations (user1_id, user2_id) VALUES (%s,%s)", (u1, u2))
    # trả về conversation id + thông tin người kia
    c = db_executor.select_as_list_dict(
        "SELECT id, user1_id, user2_id, created_at FROM conversations WHERE id=%s", (cid,))[0]
    other_user = _convo_other_user(c, me)
    return {"status": "success", "data": {"conversation_id": cid, "user": other_user}}


# ==========================================================
# 🚀 DM — LẤY LỊCH SỬ TIN NHẮN
# ==========================================================
@router.get(U.SOCIAL["CONVERSATION_MESSAGES"])
def get_messages(conversation_id: int, current_user: dict = Depends(get_current_user)):
    me = current_user["user_id"]
    convo = db_executor.select_as_list_dict(
        "SELECT * FROM conversations WHERE id=%s", (conversation_id,))
    if not convo:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc trò chuyện.")
    c = convo[0]
    if c["user1_id"] not in (me,) and c["user2_id"] not in (me,):
        raise HTTPException(status_code=403, detail="Bạn không thuộc cuộc trò chuyện này.")
    rows = db_executor.select_as_list_dict(
        f"""SELECT m.id, m.sender_id, m.content, m.created_at, m.is_read,
                  u.username, COALESCE(u.fullname, u.full_name, u.username) as fullname, u.avatar_url,
                  u.avatar_frame, u.name_effect, u.chat_theme,
                  {spirit_select_sql()}
           FROM messages m
           JOIN users u ON m.sender_id = u.id
           WHERE m.conversation_id=%s ORDER BY m.created_at ASC LIMIT 500""", (conversation_id,))
    data = []
    for m in rows:
        dt = m.get("created_at")
        spirit = spirit_payload(m)
        data.append({
            "id": m["id"], "sender_id": m["sender_id"], "content": m["content"],
            "created_at": dt.isoformat() if hasattr(dt, "isoformat") else str(dt) if dt else None,
            "is_read": m["is_read"], "username": m["username"], "fullname": m["fullname"],
            "avatar_url": m["avatar_url"],
            "avatar_frame": m.get("avatar_frame"),
            "name_effect": m.get("name_effect") or "default",
            "chat_theme": m.get("chat_theme") or "default",
            "pet": spirit["pet"], "treasure": spirit["treasure"],
        })
    # đánh dấu đã đọc tất cả tin nhắn của người khác
    try:
        db_updater.update(
            "UPDATE messages SET is_read=1 WHERE conversation_id=%s AND sender_id<>%s AND is_read=0",
            (conversation_id, me))
    except Exception:
        pass
    return {"status": "success", "data": data}


# ==========================================================
# 🚀 DM — GỬI TIN NHẮN
# ==========================================================
@router.post(U.SOCIAL["CONVERSATION_SEND"])
async def send_message(conversation_id: int, body: MessageCreate,
                       current_user: dict = Depends(get_current_user)):
    me = current_user["user_id"]
    convo = db_executor.select_as_list_dict(
        "SELECT * FROM conversations WHERE id=%s", (conversation_id,))
    if not convo:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc trò chuyện.")
    c = convo[0]
    if c["user1_id"] != me and c["user2_id"] != me:
        raise HTTPException(status_code=403, detail="Bạn không thuộc cuộc trò chuyện này.")

    mid = db_inserter.insert(
        "INSERT INTO messages (conversation_id, sender_id, content) VALUES (%s,%s,%s)",
        (conversation_id, me, body.content.strip()))
    db_updater.update(
        "UPDATE conversations SET last_message_at=current_timestamp() WHERE id=%s", (conversation_id,))

    msg = db_executor.select_as_list_dict(
        f"""SELECT m.id, m.sender_id, m.content, m.created_at, m.is_read,
                  u.username, COALESCE(u.fullname, u.full_name, u.username) as fullname, u.avatar_url,
                  u.avatar_frame, u.name_effect, u.chat_theme,
                  {spirit_select_sql()}
           FROM messages m JOIN users u ON m.sender_id=u.id WHERE m.id=%s""", (mid,))[0]
    dt = msg.get("created_at")
    spirit = spirit_payload(msg)
    payload = {
        "type": "dm",
        "conversation_id": conversation_id,
        "data": {
            "id": msg["id"], "sender_id": msg["sender_id"], "content": msg["content"],
            "created_at": dt.isoformat() if hasattr(dt, "isoformat") else str(dt) if dt else None,
            "is_read": 0, "username": msg["username"], "fullname": msg["fullname"], "avatar_url": msg["avatar_url"],
            "avatar_frame": msg.get("avatar_frame"),
            "name_effect": msg.get("name_effect") or "default",
            "chat_theme": msg.get("chat_theme") or "default",
            "pet": spirit["pet"], "treasure": spirit["treasure"],
        },
    }
    # gửi realtime cho người nhận
    other_id = c["user1_id"] if c["user1_id"] != me else c["user2_id"]
    try:
        asyncio.get_event_loop().create_task(dm_manager.send_to_user(other_id, payload))
    except Exception:
        pass
    return {"status": "success", "data": payload["data"]}


# ==========================================================
# 🚀 DM — ĐÁNH DẤU ĐÃ ĐỌC
# ==========================================================
@router.post(U.SOCIAL["CONVERSATION_READ"])
def mark_read(conversation_id: int, current_user: dict = Depends(get_current_user)):
    me = current_user["user_id"]
    try:
        db_updater.update(
            "UPDATE messages SET is_read=1 WHERE conversation_id=%s AND sender_id<>%s AND is_read=0",
            (conversation_id, me))
    except Exception as e:
        logger.error(f"mark_read lỗi: {e}")
    return {"status": "success"}


# ==========================================================
# 🚀 DM — TÌM KIẾM NGƯỜI DÙNG
# ==========================================================
@router.get(U.SOCIAL["USER_SEARCH"])
def search_users(q: str = "", current_user: dict = Depends(get_current_user)):
    me = current_user["user_id"]
    try:
        base = f"""SELECT u.id, u.username, COALESCE(u.fullname, u.full_name, u.username) as fullname,
                          u.avatar_url, u.role, u.avatar_frame, {spirit_select_sql()}
                   FROM users u WHERE u.id<>%s"""
        if q:
            rows = db_executor.select_as_list_dict(
                base + " AND (u.username LIKE %s OR u.fullname LIKE %s OR u.full_name LIKE %s)"
                       " ORDER BY u.id ASC LIMIT 20",
                (me, f"%{q}%", f"%{q}%", f"%{q}%"))
        else:
            rows = db_executor.select_as_list_dict(
                base + " ORDER BY u.id ASC LIMIT 20", (me,))
        data = []
        for r in rows:
            r = dict(r)
            r.update(spirit_payload(r))
            data.append(r)
        return {"status": "success", "data": data}
    except Exception as e:
        logger.error(f"search_users lỗi: {e}")
        raise HTTPException(status_code=500, detail="Lỗi tìm kiếm.")


# ==========================================================
# 🚀 DM — DANH SÁCH NGƯỜI DÙNG
# ==========================================================
@router.get(U.SOCIAL["USERS"])
def list_users(current_user: dict = Depends(get_current_user)):
    me = current_user["user_id"]
    try:
        rows = db_executor.select_as_list_dict(
            f"""SELECT u.id, u.username, COALESCE(u.fullname, u.full_name, u.username) as fullname,
                       u.avatar_url, u.role, u.avatar_frame, {spirit_select_sql()}
               FROM users u WHERE u.id<>%s ORDER BY u.id ASC LIMIT 50""", (me,))
        data = []
        for r in rows:
            r = dict(r)
            r.update(spirit_payload(r))
            data.append(r)
        return {"status": "success", "data": data}
    except Exception as e:
        logger.error(f"list_users lỗi: {e}")
        raise HTTPException(status_code=500, detail="Lỗi lấy danh sách.")


# ==========================================================
# 💬 BÌNH LUẬN — LẤY DANH SÁCH
# ==========================================================
@router.get(U.SOCIAL["POST_COMMENTS"])
def get_comments(post_id: int, current_user: dict = Depends(get_current_user)):
    try:
        rows = db_executor.select_as_list_dict(
            f"""SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content, c.image_url, c.created_at,
                      u.username, COALESCE(u.fullname, u.full_name, u.username) as fullname, u.avatar_url, u.role,
                      u.avatar_frame, u.name_effect, u.chat_theme,
                      {spirit_select_sql()}
               FROM post_comments c
               JOIN users u ON c.user_id = u.id
               WHERE c.post_id=%s ORDER BY c.created_at ASC""", (post_id,))
        # Gom reply theo parent
        comments, replies = [], {}
        for r in rows:
            dt = r.get("created_at")
            spirit = spirit_payload(r)
            item = {
                "id": r["id"], "post_id": r["post_id"], "user_id": r["user_id"],
                "parent_id": r["parent_id"], "content": r["content"], "image_url": r.get("image_url"),
                "created_at": dt.isoformat() if hasattr(dt, "isoformat") else str(dt) if dt else None,
                "username": r["username"], "fullname": r["fullname"], "avatar_url": r["avatar_url"], "role": r["role"],
                "avatar_frame": r.get("avatar_frame"), "name_effect": r.get("name_effect") or "default",
                "pet": spirit["pet"], "treasure": spirit["treasure"],
            }
            if r["parent_id"]:
                replies.setdefault(r["parent_id"], []).append(item)
            else:
                comments.append(item)
        for c in comments:
            c["replies"] = replies.get(c["id"], [])
        return {"status": "success", "data": comments}
    except Exception as e:
        logger.error(f"get_comments lỗi: {e}")
        return {"status": "success", "data": []}


# ==========================================================
# 💬 BÌNH LUẬN — THÊM (comment hoặc reply)
# ==========================================================
@router.post(U.SOCIAL["POST_COMMENTS"])
def add_comment(post_id: int, body: CommentCreate, current_user: dict = Depends(get_current_user)):
    me = current_user["user_id"]
    post = db_executor.select_as_list_dict("SELECT id, user_id FROM posts WHERE id=%s", (post_id,))
    if not post:
        raise HTTPException(status_code=404, detail="Bài viết không tồn tại.")
    if body.parent_id:
        parent = db_executor.select_as_list_dict(
            "SELECT id, post_id FROM post_comments WHERE id=%s", (body.parent_id,))
        if not parent or parent[0]["post_id"] != post_id:
            raise HTTPException(status_code=400, detail="Bình luận gốc không hợp lệ.")
    cid = db_inserter.insert(
        "INSERT INTO post_comments (post_id, user_id, parent_id, content, image_url) VALUES (%s,%s,%s,%s,%s)",
        (post_id, me, body.parent_id, body.content.strip(), body.image_url))

    # 🔔 Gửi thông báo "hoạt động" cho chủ bài viết (giống Threads activity)
    try:
        if post[0].get("user_id") and post[0]["user_id"] != me:
            from api.notification import push_notification
            push_notification(
                post[0]["user_id"], "activity",
                f"💬 {current_user.get('username','ai đó')} đã bình luận bài viết của bạn",
                body.content.strip()[:120])
    except Exception:
        pass
    comment = db_executor.select_as_list_dict(
        f"""SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content, c.image_url, c.created_at,
                  u.username, COALESCE(u.fullname, u.full_name, u.username) as fullname, u.avatar_url, u.role,
                  u.avatar_frame, u.name_effect,
                  {spirit_select_sql()}
           FROM post_comments c JOIN users u ON c.user_id=u.id WHERE c.id=%s""", (cid,))[0]
    dt = comment.get("created_at")
    spirit = spirit_payload(comment)
    return {"status": "success", "data": {
        "id": comment["id"], "post_id": comment["post_id"], "user_id": comment["user_id"],
        "parent_id": comment["parent_id"], "content": comment["content"], "image_url": comment.get("image_url"),
        "created_at": dt.isoformat() if hasattr(dt, "isoformat") else str(dt) if dt else None,
        "username": comment["username"], "fullname": comment["fullname"],
        "avatar_url": comment["avatar_url"], "role": comment["role"], "replies": [],
        "avatar_frame": comment.get("avatar_frame"), "name_effect": comment.get("name_effect") or "default",
        "pet": spirit["pet"], "treasure": spirit["treasure"],
    }}
