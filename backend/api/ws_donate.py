# -*- coding: utf-8 -*-
"""
============================================================
💰 D4M DONATE — WEBSOCKET REALTIME
============================================================
Quản lý kết nối WebSocket theo từng user_id để nhận thông báo
khi thanh toán donate thành công (gọi từ Webhook SePay).

- Client mở:  /api/ws/donate/{user_id}
- Webhook gọi: notify_payment_success(user_id)
  -> gửi {"status":"success"} tới connection của user đó.
============================================================
"""
import asyncio
import logging
from typing import Dict, List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from core import urls as U

logger = logging.getLogger("d4m_donate_ws")

router = APIRouter(prefix=U.WS["PREFIX"], tags=["Donate WebSocket"])


class DonateConnectionManager:
    """Quản lý các kết nối WS donate theo user_id."""

    def __init__(self):
        # user_id -> list[WebSocket]
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active.setdefault(user_id, []).append(websocket)
        logger.info(f"[DONATE WS] user {user_id} kết nối. Tổng: {len(self.active.get(user_id, []))}")

    def disconnect(self, user_id: str, websocket: WebSocket) -> None:
        conns = self.active.get(user_id)
        if conns and websocket in conns:
            conns.remove(websocket)
            if not conns:
                self.active.pop(user_id, None)
        logger.info(f"[DONATE WS] user {user_id} ngắt kết nối.")

    async def notify_payment_success(self, user_id, amount: int = 0, trans_id: str = "", qr_expired: bool = False) -> bool:
        """Gửi message thành công (kèm số tiền) tới mọi connection của user."""
        uid = str(user_id)
        conns = self.active.get(uid)
        if not conns:
            logger.info(f"[DONATE WS] user {uid} không có connection active, bỏ qua notify.")
            return False

        import json as _json
        message = _json.dumps({
            "status": "success",
            "amount": amount,
            "trans_id": trans_id,
            "qr_expired": qr_expired,
        })
        delivered = False
        for ws in list(conns):
            try:
                await ws.send_text(message)
                delivered = True
            except Exception as e:
                logger.warning(f"[DONATE WS] Gửi notify tới user {uid} lỗi: {e}")
                self.disconnect(uid, ws)
        return delivered


donate_manager = DonateConnectionManager()


@router.websocket(U.DONATE["WS_DONATE"])
async def websocket_donate(websocket: WebSocket, user_id: str):
    """Endpoint WebSocket lắng nghe trạng thái thanh toán donate của user."""
    await donate_manager.connect(user_id, websocket)
    try:
        # Duy trì kết nối; nếu client gửi ping thì trả pong (giữ kết nối sống)
        while True:
            data = await websocket.receive_text()
            if data in ("ping", "keepalive"):
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        donate_manager.disconnect(user_id, websocket)
    except Exception as e:
        logger.warning(f"[DONATE WS] Lỗi user {user_id}: {e}")
        donate_manager.disconnect(user_id, websocket)
