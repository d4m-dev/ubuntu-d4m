import os
import re

def update_tracks_js():
    # 1. Định vị tọa độ thư mục gốc (lùi 1 cấp từ scripts/)
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
    BASE_DIR = os.path.dirname(SCRIPT_DIR)
    
    MUSIC_DIR = os.path.join(BASE_DIR, "audio_workspace", "music")
    JS_FILE = os.path.join(BASE_DIR, "src", "tracks.js")
    
    print("====================================================")
    print("🚀 KHỞI ĐỘNG HỆ THỐNG QUÉT & ĐỒNG BỘ TRACKS MUSIC")
    print("====================================================")

    # 2. Kiểm tra thư mục chứa nhạc
    if not os.path.exists(MUSIC_DIR):
        print(f"❌ Không tìm thấy kho nhạc tại: {MUSIC_DIR}")
        return

    # 3. Đọc dữ liệu cũ từ file tracks.js
    if os.path.exists(JS_FILE):
        with open(JS_FILE, "r", encoding="utf-8") as f:
            js_content = f.read()
    else:
        # Nếu chưa có file thì tạo mới bộ khung mảng
        os.makedirs(os.path.dirname(JS_FILE), exist_ok=True)
        js_content = "window.TRACKS = [\n]"

    # 4. Trích xuất danh sách folder đã tồn tại & tìm ID lớn nhất để tăng tự động
    existing_folders = set(re.findall(r'audio_workspace/music/([^/]+)/', js_content))
    
    ids = [int(i) for i in re.findall(r'id:\s*(\d+)', js_content)]
    next_id = max(ids) + 1 if ids else 1

    new_tracks = []
    
    # 5. Quét thư mục nhạc để tìm lính mới
    for folder in sorted(os.listdir(MUSIC_DIR)):
        folder_path = os.path.join(MUSIC_DIR, folder)
        if not os.path.isdir(folder_path):
            continue
            
        # Nếu phát hiện thư mục chưa có mặt trong file JS
        if folder not in existing_folders:
            
            # ---------------------------------------------------------
            # 💡 BỘ MÁY HÚT METADATA TỪ FILE .LRC
            # ---------------------------------------------------------
            title = folder # Dự phòng: nếu không có [ti:] thì lấy tên thư mục
            artist = "Unknown Artist" # Dự phòng cho ca sĩ
            
            lrc_path = os.path.join(folder_path, f"{folder}.lrc")
            if os.path.exists(lrc_path):
                try:
                    with open(lrc_path, 'r', encoding='utf-8') as lrc_file:
                        lrc_content = lrc_file.read()
                        
                        # Quét tìm tag [ti: Tên Bài Hát]
                        ti_match = re.search(r'\[ti:\s*(.*?)\]', lrc_content, re.IGNORECASE)
                        if ti_match and ti_match.group(1).strip():
                            title = ti_match.group(1).strip()
                            
                        # Quét tìm tag [ar: Ca Sĩ]
                        ar_match = re.search(r'\[ar:\s*(.*?)\]', lrc_content, re.IGNORECASE)
                        if ar_match and ar_match.group(1).strip():
                            artist = ar_match.group(1).strip()
                except Exception as e:
                    print(f"⚠️ Lỗi đọc file lrc của {folder}: {e}")
            # ---------------------------------------------------------

            # Xử lý chuỗi để tránh làm gãy cú pháp JS nếu tên bài có dấu ngoặc kép
            title = title.replace('"', '\\"')
            artist = artist.replace('"', '\\"')

            # Tạo khối object JavaScript
            track_str = f"""  {{
    id: {next_id},
    title: "{title}",
    artist: "{artist}",
    cover: "../audio_workspace/music/{folder}/{folder}.jpg",
    audioSrc: "../audio_workspace/music/{folder}/{folder}.mp3",
    instrumentalSrc: "../audio_workspace/music/{folder}/{folder}_beat.mp3",
    videoSrc: "../audio_workspace/music/{folder}/{folder}.mp4",
    lyricSrc: "../audio_workspace/music/{folder}/{folder}.lrc"
  }}"""
            new_tracks.append(track_str)
            next_id += 1

    # 6. Đánh giá kết quả và bơm vào file JS
    if not new_tracks:
        print("✅ Sạch sẽ! Không có bài hát nào mới cần đồng bộ.")
        return

    # Tìm vị trí đóng mảng ']' cuối cùng để chèn dữ liệu vào ngay trước đó
    last_bracket_idx = js_content.rfind(']')
    
    if last_bracket_idx != -1:
        # Lấy toàn bộ nội dung từ đầu cho đến trước dấu ngoặc vuông đóng
        base_content = js_content[:last_bracket_idx].rstrip()
        
        # Thêm dấu phẩy ',' nối nếu mảng cũ đã có bài hát
        if not base_content.endswith('[') and not base_content.endswith(','):
            base_content += ",\n\n"
        elif base_content.endswith('['):
            base_content += "\n"
            
        # Nối các bài hát mới lại, cách nhau bằng dấu phẩy
        new_content = base_content + ",\n\n".join(new_tracks) + "\n]"
        
        # Ghi đè file với dữ liệu mới
        with open(JS_FILE, "w", encoding="utf-8") as f:
            f.write(new_content)
            
        print(f"🎉 ĐÃ THÊM THÀNH CÔNG {len(new_tracks)} BÀI HÁT MỚI VÀO: src/tracks.js")
        for track in new_tracks:
            # In ra tên các bài vừa thêm bằng cách lấy Regex tìm dòng title
            match_title = re.search(r'title:\s*"([^"]+)"', track)
            if match_title:
                print(f"   + {match_title.group(1)}")
    else:
        print("❌ Lỗi định dạng file tracks.js: Không tìm thấy dấu đóng mảng ']'")

if __name__ == "__main__":
    update_tracks_js()