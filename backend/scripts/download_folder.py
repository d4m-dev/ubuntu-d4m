#!/usr/bin/env python3
import os
import json
import urllib.request
import urllib.error
import sys
import time
import math

# Đảm bảo script luôn chạy từ thư mục chứa nó
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# --- CẤU HÌNH ---
REPO_OWNER = "d4m-dev"
REPO_NAME = "media"
BRANCH = "main"

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def get_github_contents(path=""):
    """Lấy danh sách file/folder từ GitHub API"""
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/contents/{path}?ref={BRANCH}"
    try:
        req = urllib.request.Request(url)
        # Thêm User-Agent để tránh bị chặn bởi GitHub
        req.add_header('User-Agent', 'Python-Script')
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        if e.code == 403:
            print(f"{Colors.FAIL}❌ Lỗi: Vượt quá giới hạn request API của GitHub (Rate Limit).{Colors.ENDC}")
        elif e.code == 404:
            print(f"{Colors.FAIL}❌ Lỗi: Không tìm thấy đường dẫn '{path}'.{Colors.ENDC}")
        else:
            print(f"{Colors.FAIL}❌ Lỗi kết nối: {e}{Colors.ENDC}")
        return None
    except Exception as e:
        print(f"{Colors.FAIL}❌ Lỗi không xác định: {e}{Colors.ENDC}")
        return None

def format_size(size_bytes):
    """Định dạng dung lượng byte sang KB, MB..."""
    if size_bytes == 0:
        return "0 B"
    size_name = ("B", "KB", "MB", "GB", "TB")
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    return f"{s} {size_name[i]}"

def download_file_with_progress(file_url, local_path, file_size):
    """Tải file với thanh tiến trình và tốc độ"""
    try:
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        
        filename = os.path.basename(local_path)
        if len(filename) > 25:
            display_name = filename[:22] + "..."
        else:
            display_name = filename.ljust(25)

        start_time = time.time()
        
        with urllib.request.urlopen(file_url) as response, open(local_path, 'wb') as out_file:
            downloaded = 0
            block_size = 8192
            
            while True:
                buffer = response.read(block_size)
                if not buffer:
                    break
                downloaded += len(buffer)
                out_file.write(buffer)
                
                elapsed = time.time() - start_time
                if elapsed > 0:
                    speed = downloaded / elapsed
                    speed_str = f"{format_size(speed)}/s"
                else:
                    speed_str = "Calculating..."
                
                if file_size > 0:
                    percent = min(100, downloaded * 100 / file_size)
                    bar_length = 20
                    filled_length = int(bar_length * percent // 100)
                    bar = '█' * filled_length + '░' * (bar_length - filled_length)
                    sys.stdout.write(f"\r   ⬇️  {display_name} |{Colors.BLUE}{bar}{Colors.ENDC}| {percent:5.1f}% | {format_size(downloaded)}/{format_size(file_size)} | {Colors.GREEN}{speed_str}{Colors.ENDC}")
                else:
                    sys.stdout.write(f"\r   ⬇️  {display_name} | {format_size(downloaded)} | {Colors.GREEN}{speed_str}{Colors.ENDC}")
                sys.stdout.flush()
        
        print()
        return True
    except Exception as e:
        print(f"\n   {Colors.FAIL}❌ Lỗi tải file {local_path}: {e}{Colors.ENDC}")
        return False

def select_folder_interactive():
    """Menu chọn folder tương tác"""
    current_path = ""
    history = [] # Stack để lưu đường dẫn cha
    
    while True:
        display_path = current_path if current_path else "Root"
        print(f"\n{Colors.HEADER}╔════════════════════════════════════════╗{Colors.ENDC}")
        print(f"{Colors.HEADER}║ 📂 DUYỆT: {display_path.ljust(28)[:28]} ║{Colors.ENDC}")
        print(f"{Colors.HEADER}╚════════════════════════════════════════╝{Colors.ENDC}")
        
        items = get_github_contents(current_path)
        
        if items is None:
            if history:
                current_path = history.pop()
                continue
            else:
                return None

        # Lọc chỉ lấy thư mục để duyệt
        dirs = [i for i in items if i['type'] == 'dir']
        
        print(f"{Colors.GREEN}0. [📥 TẢI VỀ THƯ MỤC NÀY]{Colors.ENDC}")
        
        start_idx = 1
        if current_path:
            print(f"{Colors.WARNING}1. [..] (Quay lại){Colors.ENDC}")
            start_idx = 2
        
        if not dirs:
            print(f"   (Không có thư mục con)")
        
        for idx, d in enumerate(dirs):
            print(f"{start_idx + idx}. 📁 {d['name']}/")
            
        print(f"{Colors.FAIL}q. Thoát{Colors.ENDC}")

        try:
            choice = input(f"\n{Colors.BOLD}👉 Chọn số: {Colors.ENDC}").strip().lower()
            
            if choice == 'q':
                return None
            
            choice_idx = int(choice)
            
            if choice_idx == 0:
                return current_path
            
            if current_path and choice_idx == 1:
                if history:
                    current_path = history.pop()
                else:
                    current_path = ""
                continue
                
            real_idx = choice_idx - start_idx
            if 0 <= real_idx < len(dirs):
                history.append(current_path)
                current_path = dirs[real_idx]['path']
            else:
                print(f"{Colors.FAIL}❌ Số không hợp lệ!{Colors.ENDC}")
        except ValueError:
            print(f"{Colors.FAIL}❌ Vui lòng nhập số!{Colors.ENDC}")

def scan_files_recursive(remote_path, collected_files):
    """Quét đệ quy để lấy danh sách file và dung lượng"""
    sys.stdout.write(f"\r{Colors.CYAN}🔍 Đang quét: {remote_path if remote_path else 'Root'}{' ' * 20}{Colors.ENDC}")
    sys.stdout.flush()
    
    contents = get_github_contents(remote_path)
    if not contents: return

    for item in contents:
        if item['type'] == 'file':
            collected_files.append(item)
        elif item['type'] == 'dir':
            scan_files_recursive(item['path'], collected_files)

def main():
    print(f"{Colors.BOLD}========================================{Colors.ENDC}")
    print(f"{Colors.BOLD}   TOOL TẢI FOLDER TỪ GITHUB REPO       {Colors.ENDC}")
    print(f"{Colors.BOLD}   Repo: {REPO_OWNER}/{REPO_NAME}       {Colors.ENDC}")
    print(f"{Colors.BOLD}========================================{Colors.ENDC}")
    
    selected_path = select_folder_interactive()
    
    if selected_path is not None: # Có thể là chuỗi rỗng "" (Root)
        display_name = selected_path if selected_path else "Toàn bộ Repo"
        print(f"\n{Colors.GREEN}✅ Bạn đã chọn: {display_name}{Colors.ENDC}")
        
        print(f"\n{Colors.BOLD}🚀 Đang phân tích thư mục...{Colors.ENDC}")
        all_files = []
        scan_files_recursive(selected_path, all_files)
        print("\r" + " " * 80 + "\r", end="")
        
        total_size = sum(f['size'] for f in all_files)
        print(f"{Colors.CYAN}📊 Thống kê:{Colors.ENDC}")
        print(f"   - Số lượng file: {Colors.BOLD}{len(all_files)}{Colors.ENDC}")
        print(f"   - Tổng dung lượng: {Colors.BOLD}{format_size(total_size)}{Colors.ENDC}")

        confirm = input(f"Bạn có chắc muốn tải về '{display_name}' không? (y/n): ").lower()
        if confirm == 'y':
            # Xác định thư mục đích
            if selected_path:
                folder_name = os.path.basename(selected_path)
            else:
                folder_name = f"{REPO_NAME}-main"
                
            local_path = os.path.join(os.getcwd(), folder_name)
            
            if os.path.exists(local_path):
                print(f"{Colors.WARNING}⚠️  Thư mục '{folder_name}' đã tồn tại. File sẽ được ghi đè.{Colors.ENDC}")
            
            print(f"\n🚀 Bắt đầu tải về vào: {local_path}\n")
            
            success_count = 0
            for item in all_files:
                rel_path = item['path']
                if selected_path and rel_path.startswith(selected_path):
                    rel_path = rel_path[len(selected_path):].lstrip('/')
                file_local_path = os.path.join(local_path, rel_path)
                if download_file_with_progress(item['download_url'], file_local_path, item['size']):
                    success_count += 1

            print(f"\n{Colors.OKGREEN}🎉 Hoàn tất! Đã tải {success_count}/{len(all_files)} file.{Colors.ENDC}")
    else:
        print("\n❌ Đã hủy bỏ.")

if __name__ == "__main__":
    main()