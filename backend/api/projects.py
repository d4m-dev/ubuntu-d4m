from core import urls as U
import os
import json
import math
import shutil
import zipfile
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from core.security import verify_token 

router = APIRouter(
    prefix=U.PROJECTS["PREFIX"],
    tags=["Project Hub"]
)

# 🚀 ĐÃ CHUYỂN TỌA ĐỘ VỀ NHÀ FRONTEND
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # Thư mục ubuntu-backend
HOSTING_DIR = os.path.abspath(os.path.join(BASE_DIR, "../frontend/hosted_projects"))

def get_dir_size(path):
    total = 0
    for dirpath, _, filenames in os.walk(path):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            if not os.path.islink(fp): 
                total += os.path.getsize(fp)
    return total

def format_size(size_bytes):
    if size_bytes == 0: return "0 B"
    size_name = ("B", "KB", "MB", "GB", "TB")
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    return f"{round(size_bytes / p, 2)} {size_name[i]}"

@router.get("/")
async def scan_projects():
    # Tự động tạo thư mục bên Frontend nếu chưa tồn tại
    os.makedirs(HOSTING_DIR, exist_ok=True)
    projects = []
    
    for folder in os.listdir(HOSTING_DIR):
        folder_path = os.path.join(HOSTING_DIR, folder)
        if os.path.isdir(folder_path):
            size_str = format_size(get_dir_size(folder_path))
            has_python = os.path.exists(os.path.join(folder_path, "index.py")) or \
                         os.path.exists(os.path.join(folder_path, "public", "index.py"))
            has_html = os.path.exists(os.path.join(folder_path, "index.html")) or \
                       os.path.exists(os.path.join(folder_path, folder, "index.html"))
            is_frozen = os.path.exists(os.path.join(folder_path, ".frozen"))
            
            thumbnail = None
            for ext in ["png", "jpg", "jpeg", "webp"]:
                if os.path.exists(os.path.join(folder_path, f"preview.{ext}")):
                    thumbnail = f"/projects/{folder}/preview.{ext}"; break
                elif os.path.exists(os.path.join(folder_path, f"cover.{ext}")):
                    thumbnail = f"/projects/{folder}/cover.{ext}"; break
            
            description = "Dự án mới triển khai. Chưa có mô tả."
            info_path = os.path.join(folder_path, "info.txt")
            pkg_path = os.path.join(folder_path, "package.json")
            
            if os.path.exists(info_path):
                with open(info_path, "r", encoding="utf-8") as f: description = f.read().strip()
            elif os.path.exists(pkg_path):
                try:
                    with open(pkg_path, "r", encoding="utf-8") as f:
                        pkg = json.load(f)
                        if "description" in pkg: description = pkg["description"]
                except: pass
            
            projects.append({
                "name": folder, "size": size_str, "has_python": has_python, 
                "has_html": has_html, "thumbnail": thumbnail, 
                "description": description, "is_frozen": is_frozen
            })
            
    return {"status": "success", "count": len(projects), "projects": projects}

@router.post("/toggle/{project_name}", dependencies=[Depends(verify_token)])
async def toggle_project_status(project_name: str):
    target_dir = os.path.join(HOSTING_DIR, project_name)
    if not os.path.exists(target_dir):
        raise HTTPException(status_code=404, detail="Dự án không tồn tại")
        
    frozen_file = os.path.join(target_dir, ".frozen")
    if os.path.exists(frozen_file):
        os.remove(frozen_file)
        return {"status": "success", "is_frozen": False}
    else:
        with open(frozen_file, "w") as f: f.write("FROZEN_STATE")
        return {"status": "success", "is_frozen": True}

# 🚀 TỐI ƯU: Xóa "async" để giải nén chạy luồng phụ, web không bị giật lag
@router.post("/upload", dependencies=[Depends(verify_token)])
def upload_project_zip(file: UploadFile = File(...)):
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ tải lên file .zip")
        
    project_name = file.filename.replace('.zip', '').strip().replace(' ', '-')
    temp_zip = os.path.join(HOSTING_DIR, file.filename)
    extract_path = os.path.join(HOSTING_DIR, project_name)
    
    try:
        # Ghi file Zip xuống ổ cứng tạm thời (tại nhà frontend)
        with open(temp_zip, "wb") as buffer: 
            shutil.copyfileobj(file.file, buffer)
            
        # 🛡️ THUẬT TOÁN KHIÊN CHẮN ZIP SLIP
        with zipfile.ZipFile(temp_zip, 'r') as zip_ref:
            # Lấy thư mục đích tuyệt đối (Absolute Path) làm ranh giới cách ly
            target_abs_path = os.path.abspath(extract_path)
            
            for member in zip_ref.namelist():
                # Lấy đường dẫn dự kiến của file sau khi giải nén
                member_abs_path = os.path.abspath(os.path.join(extract_path, member))
                
                # NGUYÊN TẮC: Mọi file giải nén ra phải NẰM BÊN TRONG thư mục đích
                if not member_abs_path.startswith(target_abs_path + os.sep) and member_abs_path != target_abs_path:
                    raise Exception(f"Phát hiện mã độc Zip Slip: Tệp '{member}' đang cố thoát khỏi vùng cách ly!")
            
            # Nếu vượt qua vòng quét bảo mật 100%, mới tiến hành giải nén
            zip_ref.extractall(extract_path)
            
        os.remove(temp_zip)
        return {"status": "success", "message": "Triển khai thành công"}
    except Exception as e:
        logging.error(f"ZIP SECURITY BLOCK: {str(e)}")
        if os.path.exists(temp_zip): os.remove(temp_zip)
        raise HTTPException(status_code=500, detail=f"Lỗi bảo mật giải nén: {str(e)}")