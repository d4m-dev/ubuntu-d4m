from core import urls as U
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from core.security import verify_token
from core.task import omni_download_task

router = APIRouter(prefix=U.OMNI["PREFIX"], tags=["Omni Downloader"])

class DownloadRequest(BaseModel):
    url: str

@router.post("/download")
async def start_universal_download(req: DownloadRequest, admin=Depends(verify_token)):
    url = req.url
    if not url:
        raise HTTPException(status_code=400, detail="Không thấy Link đâu sếp ơi!")
        
    # Phân tích nhanh tên gọi để báo cáo lại UI
    platform = "Youtube"
    if "tiktok.com" in url: platform = "TikTok"
    elif "instagram.com" in url: platform = "Instagram"
    elif "facebook.com" in url: platform = "Facebook"
        
    # Ném ngay vào ngầm Celery để giải phóng luồng chính FastAPI
    task = omni_download_task.delay(url)
    
    return {
        "status": "success",
        "message": f"🚀 Đã kích hoạt radar trích xuất dữ liệu từ {platform}!",
        "task_id": task.id
    }