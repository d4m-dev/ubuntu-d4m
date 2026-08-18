from core import urls as U
import asyncio
import os
import json
from typing import List, Dict
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(prefix=U.WS["PREFIX"], tags=["WebSockets"])

# Tự động nhận diện thư mục gốc để tránh lỗi Crash khi Terminal chạy lệnh
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ==========================================
# 1. HỆ THỐNG QUẢN LÝ KẾT NỐI CHUNG (Terminal, Logs)
# ==========================================
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass

manager = ConnectionManager()

@router.websocket("/logs")
async def websocket_logs(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@router.websocket("/terminal")
async def terminal_websocket(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_text("✅ [Hệ thống] Đã kết nối Terminal bảo mật tại Port 16868.\nroot@d4m-backend:~# ")
    try:
        while True:
            data = await websocket.receive_text()
            if not data.strip(): continue
            try:
                # Sử dụng đường dẫn động thay vì gán cứng
                process = await asyncio.create_subprocess_shell(
                    data,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=BASE_DIR 
                )
                stdout, stderr = await process.communicate()
                
                if stdout: await websocket.send_text(stdout.decode('utf-8'))
                if stderr: await websocket.send_text(f"LỖI: {stderr.decode('utf-8')}")
                
                await websocket.send_text("\nroot@d4m-backend:~# ")
            except Exception as e:
                await websocket.send_text(f"Lỗi thực thi: {str(e)}\nroot@d4m-backend:~# ")
    except WebSocketDisconnect:
        pass


# ==========================================
# 2. HỆ THỐNG MÁY CHỦ TRÒ CHƠI (Avatar Glass Town)
# ==========================================
class GameRoomManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.players_state: Dict[str, dict] = {}

    async def connect(self, player_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[player_id] = websocket
        # Tọa độ sinh ra ngẫu nhiên quanh khu vực trung tâm map
        self.players_state[player_id] = {"x": 400 + (len(self.players_state) * 10), "y": 300, "action": "idle"}
        # Báo cho người mới toàn bộ danh sách người chơi hiện có
        await websocket.send_text(json.dumps({"type": "init", "players": self.players_state}))

    def disconnect(self, player_id: str):
        if player_id in self.active_connections:
            del self.active_connections[player_id]
        if player_id in self.players_state:
            del self.players_state[player_id]

    async def broadcast(self, message: dict):
        # Phát thanh (Broadcast) dữ liệu JSON đến tất cả người chơi trong Map
        for connection in list(self.active_connections.values()):
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                pass

game_room = GameRoomManager()

@router.websocket("/game/{player_id}")
async def game_multiplayer_endpoint(websocket: WebSocket, player_id: str):
    await game_room.connect(player_id, websocket)
    
    # Báo cho toàn server biết có Nông dân mới vào làng
    await game_room.broadcast({
        "type": "player_joined", 
        "id": player_id, 
        "state": game_room.players_state[player_id]
    })
    
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            
            # Xử lý cập nhật tọa độ 8 hướng liên tục
            if payload["type"] == "move":
                game_room.players_state[player_id]["x"] = payload["x"]
                game_room.players_state[player_id]["y"] = payload["y"]
                
                await game_room.broadcast({
                    "type": "player_moved",
                    "id": player_id,
                    "x": payload["x"],
                    "y": payload["y"]
                })
                
            # Xử lý chat bong bóng realtime
            elif payload["type"] == "chat":
                await game_room.broadcast({
                    "type": "chat",
                    "id": player_id,
                    "msg": payload["msg"]
                })
                
    except WebSocketDisconnect:
        game_room.disconnect(player_id)
        # Báo cho toàn server xóa Sprite của người chơi này đi
        await game_room.broadcast({"type": "player_left", "id": player_id})
    except Exception as e:
        print(f"Lỗi kết nối Socket Game: {e}")
        game_room.disconnect(player_id)