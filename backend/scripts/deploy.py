import os
import subprocess
import datetime
import sys
import time
import threading
import itertools
import shutil
import socket

# Đảm bảo script luôn chạy từ thư mục chứa nó
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Định nghĩa Repo đích mới của d4m-dev
TARGET_REMOTE_URL = "git@github.com:d4m-dev/ubuntu-backend-core.git"

# Định nghĩa mã màu ANSI để làm đẹp output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

# Class Spinner để tạo hiệu ứng load xoay tròn
class Spinner:
    def __init__(self, message="Loading...", delay=0.1):
        self.spinner = itertools.cycle(['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'])
        self.delay = delay
        self.message = message
        self.running = False
        self.thread = None

    def spin(self):
        while self.running:
            sys.stdout.write(f"\r{Colors.OKCYAN}{next(self.spinner)}{Colors.ENDC} {self.message}")
            sys.stdout.flush()
            time.sleep(self.delay)
        sys.stdout.write('\r' + ' ' * (len(self.message) + 2) + '\r')

    def __enter__(self):
        self.running = True
        self.thread = threading.Thread(target=self.spin)
        self.thread.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.running = False
        if self.thread:
            self.thread.join()
        sys.stdout.write(f"\r{' ' * (len(self.message) + 2)}\r")
        sys.stdout.flush()

def run_command(command):
    """Chạy lệnh shell và trả về (stdout, stderr)"""
    try:
        result = subprocess.run(command, shell=False, check=True, capture_output=True, text=True, encoding='utf-8')
        return result.stdout, None
    except subprocess.CalledProcessError as e:
        return None, e.stderr

def check_internet():
    """Kiểm tra kết nối internet."""
    try:
        socket.create_connection(("8.8.8.8", 53), timeout=3)
        return True
    except OSError:
        return False

def setup_new_remote():
    """Kiểm tra và ép cấu hình Repo mới"""
    print(f"\n{Colors.OKBLUE}- Đang đồng bộ hóa tọa độ Repo mới...{Colors.ENDC}")
    if not os.path.exists(".git"):
        print(f"{Colors.WARNING}⚠️ Chưa tìm thấy Git. Đang tiến hành thiết lập từ đầu...{Colors.ENDC}")
        run_command("git init")
        run_command(f"git remote add origin {TARGET_REMOTE_URL}")
        run_command("git branch -M main")
        print(f"{Colors.OKGREEN}✅ Khởi tạo Git và nạp cấu hình GitHub mới thành công!{Colors.ENDC}")
        return True

    remote_url_raw, _ = run_command("git remote get-url origin")
    current_url = remote_url_raw.strip() if remote_url_raw else ""

    if current_url != TARGET_REMOTE_URL:
        print(f"{Colors.WARNING}⚠️ Phát hiện Remote cũ hoặc lệch URL ({current_url or 'Trống'}).{Colors.ENDC}")
        with Spinner("Đang chuyển hướng sang repo d4m-dev mới..."):
            if not current_url:
                run_command(f"git remote add origin {TARGET_REMOTE_URL}")
            else:
                run_command(f"git remote set-url origin {TARGET_REMOTE_URL}")
            run_command("git branch -M main")
        print(f"{Colors.OKGREEN}✅ Đã tái kết nối thành công tới: {TARGET_REMOTE_URL}{Colors.ENDC}")
    else:
        print(f"{Colors.OKGREEN}✅ Đường truyền tới Repo d4m-dev ổn định.{Colors.ENDC}")
    return True

# ========================================================
# ĐỊNH DẠNG COMMIT TỰ ĐỘNG THÔNG MINH
# ========================================================
def generate_smart_commit_message(current_time):
    """Tạo commit message theo định dạng thông minh"""
    status_out, _ = run_command("git status --porcelain")
    if not status_out:
        return f"d4m-dev commit unknown_changes + {current_time}"
    
    lines = status_out.strip().splitlines()
    files = [line[3:].strip() for line in lines if len(line) > 3]
    if not files: 
        return f"d4m-dev commit code_core + {current_time}"
    
    if len(files) == 1:
        return f"d4m-dev commit {files[0]} + {current_time}"
    elif len(files) <= 3:
        return f"d4m-dev commit {', '.join(files)} + {current_time}"
    else:
        try:
            common = os.path.commonpath(files)
            if common:
                return f"d4m-dev commit {len(files)} files in {common}/ + {current_time}"
        except ValueError:
            pass
        return f"d4m-dev commit {len(files)} files ({', '.join(files[:2])}...) + {current_time}"

def is_git_corrupted(stderr):
    if not stderr: return False
    corruption_keywords = ["empty", "fatal: unable to read", "corrupt", "malformed", "repository is corrupted"]
    return any(keyword in stderr.lower() for keyword in corruption_keywords)

def repair_git():
    print(f"\n{Colors.FAIL}💥 PHÁT HIỆN KHO GIT BỊ HỎNG! KHỞI ĐỘNG TIẾN TRÌNH CỨU HỘ KHẨN CẤP...{Colors.ENDC}")
    with Spinner("Đang xóa cấu trúc Git bị hỏng..."):
        if os.path.exists(".git"):
            try:
                shutil.rmtree('.git')
            except OSError as e:
                print(f"\n{Colors.FAIL}❌ Không thể xóa thư mục .git: {e}. Vui lòng tự tay xóa.{Colors.ENDC}")
                return False
                
    with Spinner("Đang tái cấu trúc Git và nạp mã hóa Repo mới..."):
        run_command("git init")
        run_command(f"git remote add origin {TARGET_REMOTE_URL}")
        run_command("git branch -M main")

    print(f"\n{Colors.OKGREEN}✅ Cứu hộ thành công! Đã làm sạch và tái định vị môi trường Git về d4m-dev.{Colors.ENDC}")
    return True

def fix_git_lock():
    lock_file = os.path.join(".git", "index.lock")
    if os.path.exists(lock_file):
        try:
            os.remove(lock_file)
            print(f"\n{Colors.WARNING}⚠️ Đã tự động xóa file khóa bị kẹt (.git/index.lock).{Colors.ENDC}")
            return True
        except OSError:
            return False
    return False

def sync_with_remote():
    print(f"\n{Colors.OKBLUE}- Đang tự động đồng bộ với remote server...{Colors.ENDC}")
    current_branch_raw, _ = run_command("git rev-parse --abbrev-ref HEAD")
    current_branch = current_branch_raw.strip() if current_branch_raw else "main"

    with Spinner("Cất giữ thay đổi hiện tại (git stash)..."):
        stash_stdout, stash_err = run_command("git stash push --keep-index --include-untracked")
        if stash_err:
            print(f"\n{Colors.FAIL}❌ Không thể tạo stash: {stash_err}{Colors.ENDC}")
            return False

    with Spinner("Kéo cập nhật và rebase từ GitHub..."):
        _, pull_err = run_command(f"git pull origin {current_branch} --rebase --allow-unrelated-histories")

    if pull_err:
        print(f"\n{Colors.FAIL}❌ Xung đột dòng code khi đồng bộ: {pull_err}{Colors.ENDC}")
        print("   - Đang phá hủy tiến trình rebase để bảo vệ phôi code...")
        run_command("git rebase --abort")
        run_command("git stash pop")
        return False

    if stash_stdout and "No local changes to save" not in stash_stdout:
        with Spinner("Đổ ngược lại phôi thay đổi (stash pop)..."):
            _, pop_err = run_command("git stash pop")
            if pop_err:
                print(f"\n{Colors.FAIL}❌ Không thể pop stash: {pop_err}{Colors.ENDC}")
                return False

    print(f"{Colors.OKGREEN}✅ Đồng bộ hóa đám mây thành công.{Colors.ENDC}")
    return True

def attempt_push():
    current_branch_raw, err = run_command("git rev-parse --abbrev-ref HEAD")
    if err: return False, err
    current_branch = current_branch_raw.strip()

    # Dùng chuẩn push an toàn có tracking -u
    push_command = f"git push -u origin {current_branch}"

    for attempt in range(3):
        print(f"\n{Colors.OKBLUE}- Đang đẩy lên GitHub d4m-dev '{current_branch}' (lần {attempt + 1}/3)...{Colors.ENDC}")
        with Spinner("Đang truyền dữ liệu lên GitHub..."):
            _, stderr = run_command(push_command)
            
        if not stderr:
            return True, None

        err_msg = stderr.strip().splitlines()[-1]
        print(f"{Colors.WARNING}⚠️ Lỗi đường truyền: {err_msg}{Colors.ENDC}")

        if "Permission denied" in stderr or "publickey" in stderr:
            print(f"\n{Colors.FAIL}❌ LỖI XÁC THỰC: Hãy đảm bảo sếp đã thêm SSH Key của thiết bị này vào tài khoản GitHub d4m-dev!{Colors.ENDC}")
            return False, "SSH Auth Failed"

        if "non-fast-forward" in stderr or "updates were rejected" in stderr or "failed to push some refs" in stderr:
            print(f"{Colors.WARNING} -> Máy chủ GitHub đang có dữ liệu hoặc lịch sử lệch pha với Local.{Colors.ENDC}")
            if sync_with_remote():
                continue
            else:
                # ÉP PUSH ĐÈ NẾU XUNG ĐỘT QUÁ MẠNH
                print(f"\n{Colors.FAIL}⚠️ CẢNH BÁO TỐI CAO: Không thể tự động hợp nhất code. Sếp có muốn ÉP PUSH ĐÈ (Force Push) không?{Colors.ENDC}")
                print(f"{Colors.WARNING}   (Toàn bộ code trên GitHub sẽ bị xóa sạch và thay thế bằng code của máy cục bộ hiện tại){Colors.ENDC}")
                
                ans = input(f"{Colors.OKCYAN} 👉 Nhập 'y' để KHAI HỎA PUSH ĐÈ, phím khác để hủy: {Colors.ENDC}").lower().strip()
                if ans == 'y':
                    print(f"\n{Colors.OKBLUE}- Đang tiến hành FORCE PUSH...{Colors.ENDC}")
                    with Spinner("Đang nghiền nát lịch sử cũ và ghi đè..."):
                        _, f_err = run_command(f"git push -u origin {current_branch} --force")
                    if not f_err:
                        return True, None
                    return False, f_err
                
                return False, "Auto-sync failed & Force Push aborted"

        if is_git_corrupted(stderr):
            return False, stderr

        if attempt < 2:
            print(f"   -> Thử lại sau 5 giây...")
            time.sleep(5)
            
    return False, stderr

def optimize_repo():
    with Spinner("Đang tối ưu nén tệp tin rác Git (git gc)..."):
        run_command("git gc --auto")

def deploy_process(custom_message=None, yes_to_all=False):
    skip_commit = False

    setup_new_remote()

    with Spinner("Đang kiểm tra trạng thái phôi code..."):
        status, err = run_command("git status --porcelain")

    if err:
        if is_git_corrupted(err): return "needs_repair"
        print(f"\n{Colors.FAIL}❌ Lỗi Git Status: {err}{Colors.ENDC}")
        return "failed"

    if not status.strip():
        current_branch_raw, _ = run_command("git rev-parse --abbrev-ref HEAD")
        current_branch = current_branch_raw.strip() if current_branch_raw else "main"
        unpushed_raw, _ = run_command(f"git log origin/{current_branch}..HEAD --oneline")

        if unpushed_raw and unpushed_raw.strip():
            print(f"\n{Colors.WARNING}⚠️ Có commit cũ nằm ở hàng đợi chưa được push. Tiến hành đẩy lên GitHub ngay...{Colors.ENDC}")
            skip_commit = True
        else:
            print(f"\n{Colors.OKGREEN}✅ Sạch sẽ! Toàn bộ hệ thống hiện tại đã đồng nhất với GitHub d4m-dev.{Colors.ENDC}")
            return "success"

    current_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    if not skip_commit:
        with Spinner("Đang gom hồ sơ (git add)..."):
            _, err = run_command("git add .")
            if err and "index.lock" in err:
                if fix_git_lock():
                    with Spinner("Đang thử lại gom hồ sơ (git add)..."):
                        _, err = run_command("git add .")

        if err:
            if is_git_corrupted(err): return "needs_repair"
            print(f"\n{Colors.FAIL}❌ Lỗi git add: {err}{Colors.ENDC}")
            return "failed"

        MAX_FILE_SIZE_MB = 80
        with Spinner("Đang cân đo kích thước tệp tin..."):
            large_files = []
            staged_files_raw, _ = run_command("git diff --name-only --staged")
            if staged_files_raw:
                for filename in staged_files_raw.strip().splitlines():
                    if os.path.isfile(filename):
                        try:
                            size_in_mb = os.path.getsize(filename) / (1024 * 1024)
                            if size_in_mb > MAX_FILE_SIZE_MB:
                                large_files.append((filename, size_in_mb))
                        except OSError:
                            pass

        if large_files:
            print(f"\n\n{Colors.WARNING}⚠️ Phát hiện file dung lượng quá khổ (>80MB):{Colors.ENDC}")
            for filename, size in large_files:
                print(f" - {filename} ({size:.2f} MB)")

            if not yes_to_all:
                answer = input("👉 Sếp có muốn tiếp tục ép nén tệp lớn này không? (y/n): ").lower().strip()
                if answer != 'y':
                    print(f"{Colors.FAIL}❌ Đã dừng lệnh. Sếp hãy reset file lớn ra rồi chạy lại nhé.{Colors.ENDC}")
                    return "failed"

        if custom_message:
            commit_message = custom_message
        else:
            commit_message = generate_smart_commit_message(current_time)

        safe_commit_message = commit_message.replace('"', '\\"')
        print(f"\n{Colors.OKCYAN}📝 Ghi nhận mã số Commit: \"{commit_message}\"{Colors.ENDC}")
        with Spinner("Đang niêm phong Commit..."):
            _, err = run_command(f'git commit -m "{safe_commit_message}"')

        if err and "index.lock" in err:
            if fix_git_lock():
                with Spinner("Đang thử lại niêm phong..."):
                    _, err = run_command(f'git commit -m "{safe_commit_message}"')

        if err and "nothing to commit" not in err and "no changes added to commit" not in err:
            if is_git_corrupted(err): return "needs_repair"
            print(f"\n{Colors.FAIL}❌ Lỗi đóng gói Commit: {err}{Colors.ENDC}")
            return "failed"

    current_branch_raw, _ = run_command("git rev-parse --abbrev-ref HEAD")
    current_branch = current_branch_raw.strip() if current_branch_raw else "main"

    if not yes_to_all:
        print("\n")
        answer = input(f"🤔 Sẵn sàng phóng code lên máy chủ GitHub d4m-dev ['{current_branch}']. Xác nhận? (y/n): ").lower().strip()
        if answer != 'y':
            print(f"{Colors.FAIL}❌ Lệnh đã bị hủy bởi sếp.{Colors.ENDC}")
            return "failed"

    push_success, push_err = attempt_push()
    if not push_success:
        if is_git_corrupted(push_err): return "needs_repair"
        return "failed"

    optimize_repo()
    print(f"\n{Colors.OKGREEN}🎉 [DEPLOY THÀNH CÔNG] Code đã được đẩy an toàn lên Repo d4m-dev lúc {current_time}!{Colors.ENDC}")
    return "success"

def main():
    print(f"{Colors.HEADER}{Colors.BOLD}=============================================={Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}==    MÁY PHÓNG DỮ LIỆU LÊN GITHUB D4M-DEV  =={Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}=============================================={Colors.ENDC}")

    with Spinner("Đang dò tìm sóng mạng vệ tinh Internet..."):
        if not check_internet():
            print(f"\n{Colors.WARNING}⚠️ Cảnh báo: Máy chủ đang chạy ngoại tuyến (Offline). Tiến trình có thể kẹt.{Colors.ENDC}")

    yes_to_all = "-y" in sys.argv or "--yes" in sys.argv
    custom_message = None

    if yes_to_all:
        print(f"{Colors.OKCYAN}⚙️ Chế độ tự động (-y) kích hoạt. Tự động thông qua các chốt xác nhận.{Colors.ENDC}")

    if "-m" in sys.argv:
        try:
            msg_index = sys.argv.index("-m") + 1
            if msg_index < len(sys.argv):
                custom_message = sys.argv[msg_index]
                sys.argv.pop(msg_index)
                sys.argv.pop(msg_index - 1)
                print(f"{Colors.OKBLUE}💬 Ghi nhận Log tùy chỉnh: \"{custom_message}\"{Colors.ENDC}")
        except (ValueError, IndexError):
            pass

    for attempt in range(2):
        if attempt > 0:
            print(f"\n{Colors.WARNING}--- TÁI KHỞI ĐỘNG CHUYẾN PHÓNG (Lần {attempt + 1}/2) ---{Colors.ENDC}")

        result = deploy_process(custom_message, yes_to_all)

        if result == "success":
            return
        if result == "needs_repair":
            if attempt < 1:
                if not repair_git():
                    print(f"\n{Colors.FAIL}❌ Quy trình cứu hộ tự động thất bại. Dừng chương trình.{Colors.ENDC}")
                    break
            else:
                print(f"\n{Colors.FAIL}❌ Đã thử cứu hộ nhưng phôi lỗi quá nặng. Khóa tiến trình.{Colors.ENDC}")
        if result == "failed":
            print(f"\n{Colors.FAIL}❌ Tiến trình dừng do xung đột phần cứng hoặc phân quyền.{Colors.ENDC}")
            break

if __name__ == "__main__":
    main()
