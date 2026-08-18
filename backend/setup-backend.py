import os
import subprocess
import sys

# Khai báo mã màu cho đẹp mắt
GREEN = '\033[92m'
CYAN = '\033[96m'
WARNING = '\033[93m'
FAIL = '\033[91m'
ENDC = '\033[0m'

def run_command(cmd):
    """Hàm thực thi lệnh Linux an toàn"""
    print(f"{CYAN}Đang thực thi: {cmd}{ENDC}")
    result = subprocess.run(cmd, shell=False)
    if result.returncode != 0:
        print(f"{FAIL}❌ Lỗi nghiêm trọng khi chạy lệnh: {cmd}{ENDC}")
        sys.exit(1)

def main():
    print(f"{GREEN}=================================================={ENDC}")
    print(f"{GREEN}🚀 HỆ THỐNG CÀI ĐẶT TỰ ĐỘNG D4M-DEV CORE 🚀{ENDC}")
    print(f"{GREEN}=================================================={ENDC}")

    # Đường dẫn chuẩn môi trường ảo của sếp
    env_dir = os.path.expanduser("~/myenv")
    
    # Bước 1: Khởi tạo phòng riêng (Virtual Environment)
    print(f"\n{WARNING}[1/3] Kiểm tra Môi trường ảo (Virtual Environment)...{ENDC}")
    if not os.path.exists(env_dir):
        print(f"-> Đang tiến hành xây dựng môi trường ảo mới tại {env_dir}")
        run_command(f"python3 -m venv {env_dir}")
    else:
        print(f"-> ✅ Môi trường ảo đã tồn tại ở {env_dir}. Bỏ qua bước tạo.")

    # Thiết lập đường dẫn công cụ pip3
    pip_path = os.path.join(env_dir, "bin", "pip3")
    req_file = "requirements.txt"

    # Bước 2: Nâng cấp cốt lõi
    print(f"\n{WARNING}[2/3] Cập nhật bộ cài đặt Pip lên bản mới nhất...{ENDC}")
    run_command(f"{pip_path} install --upgrade pip")

    # Bước 3: Cài đặt toàn bộ vũ khí
    print(f"\n{WARNING}[3/3] Tiến hành nạp thư viện từ {req_file}...{ENDC}")
    if os.path.exists(req_file):
        run_command(f"{pip_path} install -r {req_file}")
    else:
        print(f"{FAIL}❌ Không tìm thấy file {req_file}. Sếp hãy kiểm tra lại nhé.{ENDC}")
        sys.exit(1)

    print(f"\n{GREEN}=================================================={ENDC}")
    print(f"{GREEN}🎉 [THÀNH CÔNG] TOÀN BỘ HỆ THỐNG ĐÃ SẴN SÀNG! 🎉{ENDC}")
    print(f"Để khởi động máy chủ Backend, sếp chỉ cần gõ đúng 1 dòng lệnh:{ENDC}")
    print(f"{CYAN}{env_dir}/bin/python3 main.py{ENDC}")
    print(f"{GREEN}=================================================={ENDC}")

if __name__ == '__main__':
    # Đảm bảo script được chạy đúng trong thư mục dự án
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    main()