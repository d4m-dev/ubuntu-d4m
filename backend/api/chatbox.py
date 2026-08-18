from core import urls as U
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import subprocess
import os
import asyncio
from core.scheduler import update_activity # Import hàm reset đồng hồ

router = APIRouter(
    prefix=U.CHATBOX["PREFIX"],
    tags=["Chatbox AI"]
)

STATUS_FILE = "/mnt/sdcard/ubuntu-backend-core/core/.ai_active"
START_SCRIPT = "/mnt/sdcard/ubuntu-backend-core/scripts/start_ai.py"

class ChatRequest(BaseModel):
    prompt: str

@router.post("/ask")
async def ask_ai(request: ChatRequest):
    # 1. Reset lại mốc thời gian hoạt động ngay khi nhận request
    update_activity()
    
    # 2. Kiểm tra trạng thái AI
    if not os.path.exists(STATUS_FILE):
        print("\n⚙️ AI đang ngủ. Đang gọi quá trình đánh thức...")
        try:
            python_exec = os.path.expanduser("~/myenv/bin/python3")
            subprocess.run([python_exec, START_SCRIPT], check=True)
            print("✨ Đánh thức AI thành công!")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"❌ Lỗi hệ thống: {str(e)}")
        
    # 3. Xử lý logic Chat
    print(f"📥 Đang xử lý tin nhắn: {request.prompt}")
    await asyncio.sleep(1.5)
    
    reply = f"🤖 Đây là phản hồi tự động. Tôi đã nhận được yêu cầu: '{request.prompt}'. Hệ thống backend đã sẵn sàng!"
    
    return {
        "status": "success",
        "reply": reply
    }