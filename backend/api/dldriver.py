# -*- coding: utf-8 -*-
from core import urls as U
import os
import re
import io
import time
import uuid
import threading
from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends, Header

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

from core.security import get_current_active_user

router = APIRouter(prefix=U.DLDRIVER["PREFIX"], tags=["Google Drive Core"])

# ==========================================================
# 🔒 YÊU CẦU: user hợp lệ + active = 1 + role admin
# ==========================================================
def require_active_admin(authorization: str = Header(None)):
    """
    Chỉ user có active = 1 VÀ là admin (role=1) mới được dùng GG Drive.
    Token phải hợp lệ (không blacklist / không hết hạn) -> 401 nếu không.
    User không tồn tại / active != 1 -> 403.
    """
    payload = get_current_active_user(authorization)
    role = payload.get("role")
    try:
        is_admin = int(role) == 1
    except (TypeError, ValueError):
        is_admin = False
    if not is_admin:
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền sử dụng Google Drive.")
    return payload

SCOPES = ['https://www.googleapis.com/auth/drive']

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUTH_DIR = os.path.join(BASE_DIR, 'auth')
os.makedirs(AUTH_DIR, exist_ok=True)

TOKEN_PATH = os.path.join(AUTH_DIR, 'token.json')
CREDENTIALS_PATH = os.path.join(AUTH_DIR, 'credentials.json')

task_progress = {}
progress_lock = threading.Lock()

class CopyRequest(BaseModel):
    source_url: str
    target_url: Optional[str] = "root"
    from_page: Optional[int] = 0
    to_page: Optional[int] = 0
    max_gb: Optional[float] = 700.0
    ignore_keywords: Optional[str] = "_tmp, test, sample"
    mode: Optional[str] = "copy"  # 'copy' | 'download'
    destination: Optional[str] = "/sdcard/Downloads"

def get_drive_service():
    if not os.path.exists(TOKEN_PATH):
        # Hướng dẫn rõ ràng để admin cấu hình (token.json hoặc credentials.json)
        if os.path.exists(CREDENTIALS_PATH):
            detail = ("Đã có credentials.json nhưng CHƯA có token.json. "
                      "Cần chạy OAuth flow (đăng nhập Google 1 lần) để sinh token.json "
                      "trong thư mục backend/auth/.")
        else:
            detail = ("Thiếu file cấu hình Google Drive. "
                      "Vui lòng tạo OAuth Client ID (Desktop) tại Google Cloud Console, "
                      "tải file về đặt tên 'credentials.json' trong backend/auth/, "
                      "sau đó chạy script khởi tạo để sinh 'token.json'.")
        raise HTTPException(status_code=401, detail=detail)

    try:
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(TOKEN_PATH, 'w') as token:
                token.write(creds.to_json())
        return build('drive', 'v3', credentials=creds)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Lỗi xác thực Google Drive: {str(e)}")

def extract_id(url_or_id: str) -> Optional[str]:
    if not url_or_id: return None
    match = re.search(r'folders/([a-zA-Z0-9-_]+)', url_or_id)
    if match: return match.group(1)
    match = re.search(r'id=([a-zA-Z0-9-_]+)', url_or_id)
    if match: return match.group(1)
    return url_or_id

def update_task_state(task_id: str, status: str = None, message: str = None, add_bytes: int = 0, skip_inc: int = 0, file_inc: int = 0, current_file: str = None, speed_mbps: float = None):
    with progress_lock:
        if task_id not in task_progress:
            return
        state = task_progress[task_id]
        if status: state["status"] = status
        if message:
            time_str = time.strftime("%I:%M:%S %p")
            state["logs"].append(f"[{time_str}] [Google Drive] {message}")
            if len(state["logs"]) > 100: state["logs"].pop(0)
        if add_bytes > 0:
            state["copied_bytes"] += add_bytes
        if skip_inc > 0:
            state["skipped_files"] += skip_inc
        if file_inc > 0:
            state["copied_files"] += file_inc
        if current_file is not None:
            state["current_file"] = current_file
        if speed_mbps is not None:
            state["speed_mbps"] = round(speed_mbps, 2)

def should_ignore_file(name: str, ignore_str: str) -> bool:
    if not ignore_str: return False
    keywords = [k.strip().lower() for k in ignore_str.split(",") if k.strip()]
    return any(k in name.lower() for k in keywords)

def bg_copy_worker(task_id: str, src_id: str, target_parent_id: str, ignore_kw: str, max_bytes: float):
    try:
        service = get_drive_service()
        update_task_state(task_id, status="running", message=f"Bắt đầu kết nối thư mục nguồn ID: {src_id}...")

        def _recursive_copy(s_id, t_parent_id):
            if task_progress.get(task_id, {}).get("status") == "stopped":
                return
            
            folder_meta = service.files().get(fileId=s_id, fields='name').execute()
            s_name = folder_meta.get('name', 'Unknown_Folder')
            
            new_folder_meta = {'name': s_name, 'mimeType': 'application/vnd.google-apps.folder', 'parents': [t_parent_id] if t_parent_id and t_parent_id != 'root' else []}
            new_folder = service.files().create(body=new_folder_meta, fields='id').execute()
            new_id = new_folder.get('id')
            
            query = f"'{s_id}' in parents and trashed = false"
            page_token = None
            
            while True:
                if task_progress.get(task_id, {}).get("status") == "stopped":
                    break
                results = service.files().list(q=query, fields="nextPageToken, files(id, name, size, mimeType)", pageToken=page_token).execute()
                for item in results.get('files', []):
                    if task_progress.get(task_id, {}).get("status") == "stopped":
                        break
                    
                    name = item.get('name', 'unknown')
                    size = int(item.get('size', 0))
                    
                    # Kiểm tra bỏ qua từ khóa
                    if should_ignore_file(name, ignore_kw):
                        update_task_state(task_id, skip_inc=1, message=f"Đã bỏ qua theo từ khóa: [{name}]")
                        continue
                    
                    # Kiểm tra giới hạn dung lượng
                    current_gb = task_progress[task_id]["copied_bytes"] / (1024**3)
                    if current_gb >= max_bytes:
                        update_task_state(task_id, status="stopped", message="Đã chạm giới hạn dung lượng tối đa (GB).")
                        return

                    if item['mimeType'] == 'application/vnd.google-apps.folder':
                        _recursive_copy(item['id'], new_id)
                    else:
                        start_t = time.time()
                        update_task_state(task_id, current_file=name, message=f"Đang copy file: [{name}]...")
                        try:
                            service.files().copy(fileId=item['id'], body={'name': name, 'parents': [new_id]}).execute()
                            duration = max(time.time() - start_t, 0.1)
                            speed_mb = (size / (1024**2)) / duration if size > 0 else 15.5
                            update_task_state(task_id, add_bytes=size, file_inc=1, speed_mbps=speed_mb, message=f"Đã copy xong file: [{name}]. Kích thước: {round(size/(1024**2), 2)} MB. Tốc độ: {round(speed_mb, 2)} MB/s")
                        except Exception as err:
                            update_task_state(task_id, skip_inc=1, message=f"Lỗi sao chép [{name}]: {str(err)}")

                page_token = results.get('nextPageToken', None)
                if not page_token: break

        _recursive_copy(src_id, target_parent_id)
        if task_progress.get(task_id, {}).get("status") != "stopped":
            update_task_state(task_id, status="completed", message="Hoàn tất toàn bộ tác vụ sao chép Google Drive!")
    except Exception as e:
        update_task_state(task_id, status="failed", message=f"Lỗi hệ thống lõi: {str(e)}")

# --- ENDPOINTS ---
@router.get("/status")
def check_status(admin=Depends(require_active_admin)):
    is_auth = os.path.exists(TOKEN_PATH)
    has_creds = os.path.exists(CREDENTIALS_PATH)
    return {
        "authenticated": is_auth,
        "has_credentials": has_creds,
        "email": "admin@d4mdev.click" if is_auth else None,
        "status_text": "Đã kết nối API" if is_auth else ("Cần sinh token.json" if has_creds else "Thiếu credentials.json"),
    }

@router.post("/copy")
def start_copy(payload: CopyRequest, background_tasks: BackgroundTasks, admin=Depends(require_active_admin)):
    src_id = extract_id(payload.source_url)
    target_id = extract_id(payload.target_url) if payload.target_url else "root"
    if not src_id:
        raise HTTPException(status_code=400, detail="URL Thư mục nguồn không hợp lệ")
        
    task_id = str(uuid.uuid4())
    task_progress[task_id] = {
        "status": "running",
        "copied_bytes": 0,
        "skipped_files": 0,
        "speed_mbps": 0.0,
        "copied_files": 0,
        "current_file": "Đang chuẩn bị kết nối tới Google Drive API...",
        "logs": [f"[{time.strftime('%I:%M:%S %p')}] [Google Drive] Khởi tạo luồng sao chép Drive-to-Drive..."]
    }
    
    max_bytes = (payload.max_gb or 700.0)
    background_tasks.add_task(bg_copy_worker, task_id, src_id, target_id, payload.ignore_keywords, max_bytes)
    return {"task_id": task_id}

@router.post("/stop/{task_id}")
def stop_task(task_id: str, admin=Depends(require_active_admin)):
    if task_id in task_progress:
        task_progress[task_id]["status"] = "stopped"
        update_task_state(task_id, message="Sếp đã bấm dừng tiến trình sao chép khẩn cấp!")
        return {"status": "success", "message": "Đã dừng tiến trình"}
    raise HTTPException(status_code=404, detail="Không tìm thấy tiến trình")

@router.get("/progress/{task_id}")
def get_progress(task_id: str, admin=Depends(require_active_admin)):
    if task_id not in task_progress:
        raise HTTPException(status_code=404, detail="Task not found")
    return task_progress[task_id]