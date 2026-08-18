import os
from dotenv import load_dotenv

# 🚀 Nạp dữ liệu từ file .env vào hệ thống
load_dotenv()

def start_tunnel():
    """Bật đường hầm Zero Trust kết nối Backend ra api.d4mdev.click"""
    stop_tunnel()
    
    # Kéo Token từ trong két sắt .env ra
    TUNNEL_TOKEN = os.getenv("CLOUDFLARE_TUNNEL_TOKEN")
    
    # Check bảo mật, lỡ sếp quên dán vào .env thì báo lỗi ngay
    if not TUNNEL_TOKEN:
        print("❌ CẢNH BÁO: Không tìm thấy CLOUDFLARE_TUNNEL_TOKEN trong file .env!")
        return
        
    print("🚀 Đang khởi động khiên Zero Trust...")
    # Kích hoạt hầm bằng TOKEN lấy từ môi trường
    cmd = f"nohup cloudflared tunnel --no-autoupdate run --token {TUNNEL_TOKEN} > /dev/null 2>&1 &"
    os.system(cmd)

def stop_tunnel():
    """Tắt đường hầm Cloudflare"""
    os.system("pkill -f cloudflared")
    print("🛑 Đã ngắt kết nối đường hầm.")

def get_tunnel_url():
    """Trả về Cổng API chính thức để giao tiếp với Frontend"""
    return "https://api.d4mdev.click"