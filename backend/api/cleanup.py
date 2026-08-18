import os
import time
import shutil
from datetime import datetime
from api.audio_engine import WORKSPACE_DIR

# 1. Cấu trúc đường dẫn
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGS_DIR = os.path.join(BASE_DIR, "logs")

# Tách riêng 2 file log
ADMIN_LOG = os.path.join(LOGS_DIR, "admin.txt")
GUEST_LOG = os.path.join(LOGS_DIR, "guest.txt")
PENDING_DIR = os.path.join(WORKSPACE_DIR, "pending")

os.makedirs(LOGS_DIR, exist_ok=True)

def write_log(role: str, folder_name: str, message: str):
    """Ghi log tách biệt. Gắn kèm tên folder để dễ dàng tìm và xóa sau này."""
    try:
        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f"[{now}] {message} | Thư mục: {folder_name}\n"
        
        target_file = ADMIN_LOG if role == "admin" else GUEST_LOG
        
        with open(target_file, "a", encoding="utf-8") as f:
            f.write(log_entry)
        print(f"📝 [LOG {role.upper()}] {log_entry.strip()}")
    except Exception as e:
        print(f"❌ Lỗi ghi log: {e}")

def remove_guest_log(folder_name: str):
    """Quét file guest.txt, giữ lại các dòng KHÔNG chứa folder_name bị xóa"""
    if not os.path.exists(GUEST_LOG):
        return
    try:
        with open(GUEST_LOG, "r", encoding="utf-8") as f:
            lines = f.readlines()
        
        # Ghi đè lại file, bỏ qua dòng chứa tên thư mục rác
        with open(GUEST_LOG, "w", encoding="utf-8") as f:
            for line in lines:
                if f"Thư mục: {folder_name}" not in line:
                    f.write(line)
        print(f"🧹 Đã xóa data của '{folder_name}' khỏi guest.txt")
    except Exception as e:
        print(f"❌ Lỗi dọn dẹp text log: {e}")

def run_cleanup_task():
    """
    Hàm dọn rác pending/ chạy ngầm:
    1. Quét pending/, khóa cứng không cho quét ra ngoài.
    2. Xóa folder > 2 ngày + Xóa trùng lặp.
    3. Xóa luôn log trong guest.txt.
    """
    try:
        if not os.path.exists(PENDING_DIR):
            return
            
        current_time = time.time()
        two_days_seconds = 2 * 24 * 60 * 60
        folder_groups = {}
        
        for folder_name in os.listdir(PENDING_DIR):
            folder_path = os.path.join(PENDING_DIR, folder_name)
            
            if not os.path.isdir(folder_path):
                continue
                
            # 🛡️ BẢO VỆ CỨNG: Đường dẫn bắt buộc phải nằm trong 'pending'
            if "pending" not in folder_path.lower():
                continue
                
            folder_age = current_time - os.path.getctime(folder_path)
            
            # 1. TIÊU DIỆT: Thư mục quá 48 giờ
            if folder_age > two_days_seconds:
                shutil.rmtree(folder_path)
                remove_guest_log(folder_name) # Xóa log tương ứng
                continue
                
            # 2. XỬ LÝ TRÙNG LẶP: Gom nhóm theo tên bài (Bỏ đi phần _HHMMSS)
            last_underscore = folder_name.rfind('_')
            base_name = folder_name[:last_underscore] if last_underscore != -1 else folder_name
                
            if base_name not in folder_groups:
                folder_groups[base_name] = []
            
            folder_groups[base_name].append({
                "path": folder_path,
                "name": folder_name,
                "ctime": os.path.getctime(folder_path)
            })
            
        # 3. QUÉT NHÓM TRÙNG: Giữ 1 bản mới nhất, trảm bản cũ
        for base_name, folders in folder_groups.items():
            if len(folders) > 1:
                # Xếp theo thời gian tạo, mới nhất đứng đầu (index 0)
                folders.sort(key=lambda x: x["ctime"], reverse=True)
                
                # Xóa từ index 1 trở đi
                for old_folder in folders[1:]:
                    shutil.rmtree(old_folder["path"])
                    remove_guest_log(old_folder["name"]) # Xóa log bản cũ đi
                    
    except Exception as e:
        print(f"❌ [CLEANUP LỖI]: {e}")