import os
import sys
import time
import socket
import atexit
import subprocess
import uvicorn
from core.config import settings

# Ép hệ thống nhận diện thư mục gốc để không bị lỗi ModuleNotFoundError
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Import app sau khi đã chèn BASE_DIR
from api.server import app

# 🚀 IMPORT ĐƯỜNG HẦM ZERO TRUST TỪ CORE
from core.tunnel import start_tunnel, stop_tunnel

# ==========================================
# 📡 TRINH SÁT KIỂM TRA CỔNG (PORT SCANNER)
# ==========================================
def is_port_open(port: int, host: str = '127.0.0.1') -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.2)
        return s.connect_ex((host, port)) == 0

def wait_for_port(port: int, host: str = '127.0.0.1', timeout: float = 5.0) -> bool:
    start_time = time.time()
    while time.time() - start_time < timeout:
        if is_port_open(port, host): return True
        time.sleep(0.5)
    return False

# ==========================================
# 🚀 HỆ THỐNG TỰ ĐỘNG KHỞI CHẠY DỊCH VỤ NGẦM
# ==========================================
def start_background_services():
    print("====================================================")
    print("⏳ Đang đánh thức các Lõi Dịch Vụ ngầm...")
    
    # 1. KÍCH NỔ MARIADB
    if is_port_open(3306):
        print("✅ MariaDB (3306): Đang chạy sẵn.")
    else:
        os.system("nohup mysqld_safe > /dev/null 2>&1 &")
        if wait_for_port(3306, timeout=6.0):
            print("✅ MariaDB (3306): Đã được đánh thức thành công!")
        else:
            print("⚠️ MariaDB (3306): Khởi động chậm hoặc gặp sự cố.")

    # 2. KÍCH NỔ REDIS (Bypass lỗi ARM64 của Termux/Android)
    redis_ready = False
    if is_port_open(6379):
        print("✅ Redis (6379): Băng chuyền đang chạy sẵn.")
        redis_ready = True
    else:
        os.system("nohup redis-server --ignore-warnings ARM64-COW-BUG > /dev/null 2>&1 &")
        if wait_for_port(6379, timeout=5.0):
            print("✅ Redis (6379): Băng chuyền điều phối đã sẵn sàng!")
            redis_ready = True
        else:
            print("❌ Redis (6379): BẬT THẤT BẠI. Task AI sẽ không chạy được!")

    # 3. KÍCH NỔ CELERY WORKER (Chỉ chạy khi Redis sống)
    if redis_ready:
        celery_executable = os.path.expanduser("~/myenv/bin/celery")
        if os.path.exists(celery_executable):
            celery_proc = subprocess.Popen(
                [celery_executable, "-A", "core.tasks", "worker", "--loglevel=warning", "--concurrency=1"],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, cwd=BASE_DIR
            )
            print("✅ Celery Worker: Robot gánh vác tác vụ AI đã vào vị trí!")
            atexit.register(lambda: celery_proc.terminate())
        else:
            print("⚠️ Celery Worker: Không tìm thấy file chạy Celery trong myenv!")

    # 4. KÍCH NỔ GIAO DIỆN ADMINER DB
    db_admin_dir = os.path.join(BASE_DIR, "db-admin")
    os.makedirs(db_admin_dir, exist_ok=True)
    adminer_file = os.path.join(db_admin_dir, "index.php")
    
    if not os.path.exists(adminer_file):
        os.system(f"wget -q https://github.com/vrana/adminer/releases/download/v4.8.1/adminer-4.8.1-mysql.php -O {adminer_file}")
    
    admin_port = settings.DB_ADMIN_PORT
    if not is_port_open(admin_port):
        php_proc = subprocess.Popen(["php", "-S", f"0.0.0.0:{admin_port}", "-t", db_admin_dir], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if wait_for_port(admin_port, timeout=3.0):
            atexit.register(lambda: php_proc.terminate())
    print(f"✅ Giao diện DB: Sẵn sàng tại http://{settings.HOST}:{admin_port}")

    # 🚀 5. KÍCH NỔ ĐƯỜNG HẦM CLOUDFLARE
    try:
        start_tunnel()
        # Đảm bảo khi tắt server bằng Ctrl+C thì hầm cũng tự động sập theo cho an toàn
        atexit.register(stop_tunnel)
        print("✅ Cloudflare Tunnel: Khiên Zero Trust đã được kích hoạt và online!")
    except Exception as e:
        print(f"❌ Lỗi khởi động đường hầm Cloudflare: {e}")

if __name__ == "__main__":
    start_background_services()
    print("====================================================")
    print(f"🚀 UBUNTU PURE-BACKEND LÕI ĐÃ LÊN SÓNG")
    print(f"🎯 Port API: {settings.PORT} | 🌐 Môi trường: {settings.ENVIRONMENT.upper()}")
    print("====================================================")
    
    uvicorn.run("api.server:app", host=settings.HOST, port=settings.PORT, 
                reload=(settings.ENVIRONMENT == "development"), log_level="warning")