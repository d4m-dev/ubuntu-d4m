# -*- coding: utf-8 -*-
"""
============================================================
🔔 D4M NOTIFICATION — THÔNG BÁO REALTIME
============================================================
- WebSocket /api/ws/notify/{user_id}: lắng nghe thông báo realtime.
- POST /api/notification/push: gửi thông báo (admin/service) -> lưu DB + WS.
- GET  /api/notification/list: danh sách thông báo của user.
- POST /api/notification/read: đánh dấu đã đọc.

Hàm dùng chung: `push_notification(user_id, type, title, message)`
  -> lưu vào bảng `notifications` + gửi realtime qua WS.
============================================================
"""
import json
import logging
from typing import Dict, List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from pydantic import BaseModel, Field

from core import urls as U
from core.database import db_executor, db_inserter, db_updater

logger = logging.getLogger("d4m_notification")

router = APIRouter(prefix=U.NOTIFICATION["PREFIX"], tags=["Notification"])
ws_router = APIRouter(prefix=U.WS["PREFIX"], tags=["Notification WebSocket"])


# ==========================================================
# 🔌 QUẢN LÝ KẾT NỐI WEBSOCKET THÔNG BÁO
# ==========================================================
class NotifyManager:
    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(user_id, []).append(ws)

    def disconnect(self, user_id: str, ws: WebSocket):
        conns = self.active.get(user_id)
        if conns and ws in conns:
            conns.remove(ws)
            if not conns:
                self.active.pop(user_id, None)

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


notify_manager = NotifyManager()


# WS lắng nghe thông báo (prefix /api/ws/notify/{user_id})
@ws_router.websocket(U.NOTIFICATION["WS_NOTIFY"])
async def ws_notify(websocket: WebSocket, user_id: str):
    await notify_manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data in ("ping", "keepalive"):
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        notify_manager.disconnect(user_id, websocket)
    except Exception as e:
        logger.warning(f"🔔 WS notify user {user_id} lỗi: {e}")
        notify_manager.disconnect(user_id, websocket)


# ==========================================================
# 📦 SCHEMA
# ==========================================================
class PushNotificationRequest(BaseModel):
    user_id: int = Field(..., gt=0)
    type: str = "info"          # info | success | warning | donate
    title: str
    message: str = ""


# ==========================================================
# 🚀 HÀM DÙNG CHUNG (push_notification)
# ==========================================================
def push_notification(user_id: int, type: str = "info", title: str = "", message: str = "") -> bool:
    """
    Lưu thông báo vào DB + gửi realtime qua WS.
    Trả True nếu đã gửi (đủ DB hoặc WS). Không raise lỗi để không phá luồng chính.
    """
    ok = False
    # 1. Lưu DB
    try:
        db_inserter.insert(
            "INSERT INTO notifications (user_id, type, title, message, is_read) VALUES (%s,%s,%s,%s,0)",
            (user_id, type, title, message))
        ok = True
    except Exception as e:
        logger.error(f"🔔 Lỗi lưu notification: {e}")

    # 2. Gửi realtime (bất đồng bộ — đăng ký task)
    try:
        import asyncio
        asyncio.get_event_loop().create_task(
            notify_manager.send_to_user(user_id, {
                "type": "notification",
                "data": {"type": type, "title": title, "message": message},
            }))
    except Exception:
        pass
    return ok


# ==========================================================
# 🔌 ENDPOINTS
# ==========================================================
@router.post(U.NOTIFICATION["PUSH"])
async def push(req: PushNotificationRequest):
    """Đẩy thông báo cho user (dùng cho admin/service)."""
    try:
        user = db_executor.select_as_list_dict("SELECT id FROM users WHERE id=%s", (req.user_id,))
        if not user:
            raise HTTPException(status_code=404, detail="User không tồn tại.")
        push_notification(req.user_id, req.type, req.title, req.message)
        return {"status": "success", "message": "Đã gửi thông báo."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🔔 Lỗi push notification: {e}")
        raise HTTPException(status_code=500, detail="Lỗi gửi thông báo.")


@router.get(U.NOTIFICATION["LIST"])
async def list_notifications(user_id: int):
    """Danh sách thông báo của user (mới nhất trước)."""
    try:
        rows = db_executor.select_as_list_dict(
            "SELECT id, type, title, message, is_read, created_at "
            "FROM notifications WHERE user_id=%s ORDER BY id DESC LIMIT 50", (user_id,))
        return {"status": "success", "notifications": rows}
    except Exception as e:
        logger.error(f"🔔 Lỗi list notification: {e}")
        raise HTTPException(status_code=500, detail="Lỗi lấy thông báo.")


@router.post(U.NOTIFICATION["READ"])
async def mark_read(notification_id: int, user_id: int):
    """Đánh dấu một thông báo đã đọc."""
    db_updater.update(
        "UPDATE notifications SET is_read=1 WHERE id=%s AND user_id=%s",
        (notification_id, user_id))
    return {"status": "success"}


@router.post(U.NOTIFICATION["READ_ALL"])
async def mark_all_read(user_id: int):
    """Đánh dấu tất cả thông báo của user đã đọc."""
    db_updater.update("UPDATE notifications SET is_read=1 WHERE user_id=%s", (user_id,))
    return {"status": "success"}
