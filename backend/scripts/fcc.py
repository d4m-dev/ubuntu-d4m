#!/usr/bin/env python3
import os
import sys
import time
import socket
import subprocess

TARGET_PORT = 22424
LOG_FILE = "/tmp/fcc_error_log.txt"

class Colors:
    FAIL = '\033[91m'
    ENDC = '\033[0m'

def is_server_running(port):
    """Kiểm tra xem máy chủ đã chiếm dụng port chưa"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        result = s.connect_ex(('127.0.0.1', port))
        return result == 0

def kill_process_on_port(port):
    print(f"💥 CẢNH BÁO: Phát hiện cổng {port} đang bị chiếm dụng. Khởi động tiến trình giải phóng...")
    try:
        subprocess.run(f"fuser -k {port}/tcp", shell=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(1.5)
        if is_server_running(port):
            subprocess.run(f"lsof -t -i:{port} | xargs kill -9", shell=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            time.sleep(1)
        print(f"✅ Đã dọn dẹp sạch sẽ cổng mạng {port}!")
    except Exception:
        pass

def force_fcc_config():
    """Bức tử file cấu hình của fcc để đảm bảo nó không đọc sai cổng"""
    env_dir = os.path.expanduser("~/.fcc")
    os.makedirs(env_dir, exist_ok=True)
    env_file = os.path.join(env_dir, ".env")
    
    lines = []
    if os.path.exists(env_file):
        with open(env_file, "r") as f:
            lines = f.readlines()
    
    new_lines = []
    port_found, browser_found = False, False
    
    for line in lines:
        if line.startswith("PORT="):
            new_lines.append(f"PORT={TARGET_PORT}\n")
            port_found = True
        elif line.startswith("BROWSER="):
            new_lines.append("BROWSER=none\n")
            browser_found = True
        else:
            new_lines.append(line)
            
    if not port_found: new_lines.append(f"PORT={TARGET_PORT}\n")
    if not browser_found: new_lines.append("BROWSER=none\n")
        
    with open(env_file, "w") as f:
        f.writelines(new_lines)
    print("🔧 Đã cập nhật nòng cốt cấu hình: PORT=22424 & BROWSER=none.")

def start_fcc_server():
    print(f"⏳ Đang kích hoạt máy chủ proxy (fcc-server) tại cổng {TARGET_PORT}...")
    
    force_fcc_config()
    
    # Mở cổng ghi log (Hộp đen) để bắt lỗi nếu tiến trình chết yểu
    with open(LOG_FILE, "w") as log:
        # Bọc qua bash -c để đảm bảo hệ thống đọc được đủ môi trường (PATH)
        subprocess.Popen(
            "bash -c 'fcc-server'", 
            shell=True,
            stdout=log,
            stderr=subprocess.STDOUT,
            start_new_session=True
        )
    
    for i in range(24):
        if is_server_running(TARGET_PORT):
            return True
        time.sleep(0.5)
        sys.stdout.write("...")
        sys.stdout.flush()
        
    print() 
    return False

def main():
    print("==================================================")
    print("🤖 COMMAND CENTER: FREE CLAUDE CODE ENVIRONMENT   ")
    print("==================================================")
    
    if is_server_running(TARGET_PORT):
        kill_process_on_port(TARGET_PORT)
    else:
        print(f"✨ Khảo sát: Cổng mạng {TARGET_PORT} đang trống.")
        
    success = start_fcc_server()
    
    if not success:
        print(f"\n❌ LỖI TỬ NẠN: Máy chủ fcc-server đã bị crash ngầm!")
        print(f"👉 TRÍCH XUẤT HỘP ĐEN TỪ HỆ THỐNG:")
        try:
            with open(LOG_FILE, "r") as f:
                logs = f.read().strip()
                if logs:
                    print(f"{Colors.FAIL}{logs}{Colors.ENDC}")
                else:
                    print(f"{Colors.FAIL}Không có log. Lệnh 'fcc-server' không tồn tại (chưa cài đặt hoặc mất PATH).{Colors.ENDC}")
        except Exception:
            print("Không thể đọc hộp đen.")
        sys.exit(1)
    else:
        print(f"\n✅ Kết nối thành công! fcc-server đang chạy mượt mà tại Port: {TARGET_PORT}.")
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    target_dir = project_root
    
    target_subpath = ""
    if "-d" in sys.argv:
        try: target_subpath = sys.argv[sys.argv.index("-d") + 1]
        except IndexError: pass
    elif len(sys.argv) > 1 and not sys.argv[1].startswith("-"):
        target_subpath = sys.argv[1]

    if target_subpath:
        potential_dir = os.path.abspath(os.path.join(project_root, target_subpath))
        if not potential_dir.startswith(project_root):
            print(f"\n⚠️ CẢNH BÁO BẢO MẬT: Thư mục '{target_subpath}' nằm ngoài vùng an toàn!")
        elif not os.path.isdir(potential_dir):
            print(f"\n⚠️ CẢNH BÁO: Thư mục '{target_subpath}' hiện không tồn tại trong dự án!")
        else:
            target_dir = potential_dir

    os.chdir(target_dir)
    print(f"🚀 Định vị không gian phôi code tại: {target_dir}")
    print("-" * 50)
    
    try:
        my_env = os.environ.copy()
        my_env["BROWSER"] = "none"
        subprocess.call("bash -c 'fcc-claude'", shell=True, env=my_env)
    except KeyboardInterrupt:
        print("\n🏁 Đã ngắt kết nối an toàn khỏi Claude Code Terminal.")

if __name__ == "__main__":
    main()