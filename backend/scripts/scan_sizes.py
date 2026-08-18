import os
import sys
import datetime

def format_size(size_bytes):
    """Chuyển đổi bytes sang định dạng dễ đọc (KB, MB, GB)"""
    if size_bytes == 0:
        return "0 B"
    size_name = ("B", "KB", "MB", "GB", "TB")
    i = 0
    while size_bytes >= 1024 and i < len(size_name) - 1:
        size_bytes /= 1024.0
        i += 1
    return f"{size_bytes:.2f} {size_name[i]}"

def scan_project(root_dir, output_file="project_size_report.txt"):
    print("=======================================================")
    print("🚀 ĐANG KHỞI ĐỘNG HỆ THỐNG QUÉT VỆ TINH DUNG LƯỢNG FILE")
    print(f"📂 Thư mục quét: {root_dir}")
    print("=======================================================")
    
    file_list = []
    total_project_size = 0
    total_files = 0
    
    for root, dirs, files in os.walk(root_dir):
        # Bỏ qua thư mục .git để đỡ nhiễu thông số
        if '.git' in root.split(os.sep):
            continue
            
        for file in files:
            file_path = os.path.join(root, file)
            try:
                # Lấy dung lượng file
                if os.path.exists(file_path) and not os.path.islink(file_path):
                    size_bytes = os.path.getsize(file_path)
                    relative_path = os.path.relpath(file_path, root_dir)
                    file_list.append((relative_path, size_bytes))
                    total_project_size += size_bytes
                    total_files += 1
            except Exception as e:
                pass

    # Sắp xếp danh sách file theo dung lượng giảm dần
    file_list.sort(key=lambda x: x[1], reverse=True)
    
    # Tiến hành ghi file báo cáo
    current_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("=======================================================\n")
        f.write("📊 BÁO CÁO KIỂM SOÁT DUNG LƯỢNG DỰ ÁN UBUNTU-CORE\n")
        f.write(f"⏰ Thời gian quét: {current_time}\n")
        f.write(f"📁 Thư mục gốc: {root_dir}\n")
        f.write(f"📦 Tổng dung lượng dự án: {format_size(total_project_size)}\n")
        f.write(f"🗂️ Tổng số lượng tệp tin: {total_files} file\n")
        f.write("=======================================================\n\n")
        
        f.write("🔥 [DANH SÁCH FILE SẮP XẾP THEO DUNG LƯỢNG GIẢM DẦN]\n")
        f.write("-" * 80 + "\n")
        f.write(f"{'DUNG LƯỢNG':<15} | {'ĐƯỜNG DẪN FILE'}\n")
        f.write("-" * 80 + "\n")
        
        for rel_path, size in file_list:
            f.write(f"{format_size(size):<15} | {rel_path}\n")
            
        f.write("\n\n🛡️ [GỢI Ý TỐI ƯU HÓA]\n")
        f.write("Các file/thư mục này thường làm nặng Repo GitHub, hãy cân nhắc ném vào .gitignore:\n")
        f.write("- Môi trường ảo: myenv/ hoặc venv/\n")
        f.write("- Thư mục nhạc AI: audio_workspace/, music/, pending/\n")
        f.write("- Database & Log: database/logs.db, *.log\n")

    # In kết quả trực quan ra Terminal
    print(f"✨ Quét thành công {total_files} tệp tin!")
    print(f"📊 Tổng khối lượng: \033[91m\033[1m{format_size(total_project_size)}\033[0m")
    print(f"📝 Đã xuất báo cáo chi tiết vào file: \033[92m{output_file}\033[0m")
    print("\n🔥 TOP 15 FILE NẶNG NHẤT LÀM NGHẼN ĐƯỜNG TRUYỀN GITHUB:")
    print("-" * 75)
    for i, (rel_path, size) in enumerate(file_list[:15]):
        # Định dạng màu đỏ cho các file > 10MB
        color_start = "\033[93m" if size > 10*1024*1024 else ""
        color_end = "\033[0m" if color_start else ""
        print(f"{i+1:02d}. {color_start}{format_size(size):<12}{color_end} -> {rel_path}")
    print("-" * 75)
    print("👉 Hãy mở 'project_size_report.txt' để xem toàn bộ danh sách nhé!")

if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    os.chdir(project_root)
    scan_project(project_root)