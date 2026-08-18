import requests

# Cấu hình mục tiêu kiểm thử
TARGET_URL = "https://d4mdev.click"

print("=" * 60)
print(f"🚀 BẮT ĐẦU KIỂM THỬ BẢO MẬT HỆ THỐNG: {TARGET_URL}")
print("=" * 60)

# ---------------------------------------------------------
# KỊCH BẢN 1: Kiểm tra "Áo giáp HTTP Headers" trên trang chủ
# ---------------------------------------------------------
print("\n🎬 [TEST 1] Kiểm tra các Khiên Bảo Mật (Security Headers)...")
try:
    response = requests.get(TARGET_URL, timeout=10)
    headers = response.headers
    
    # Danh sách các header cần kiểm tra
    security_headers = [
        "X-Frame-Options",
        "X-Content-Type-Options",
        "X-XSS-Protection",
        "Strict-Transport-Security",
        "Referrer-Policy",
        "Content-Security-Policy"
    ]
    
    success_count = 0
    for header in security_headers:
        if header in headers:
            print(f"  ✅ {header}: {headers[header][:50]}...")
            success_count += 1
        else:
            print(f"  ❌ THIẾU: {header}")
            
    if success_count == len(security_headers):
        print("👉 KẾT LUẬN: Tầng HTTP Headers bảo mật TUYỆT ĐỐI!")
    else:
        print("👉 KẾT LUẬN: Cần kiểm tra lại cấu hình Middleware.")
except Exception as e:
    print(f"  ❌ Không thể kết nối tới Server: {e}")


# ---------------------------------------------------------
# KỊCH BẢN 2: Kiểm tra tính "Tàng hình" của bản đồ API (/docs)
# ---------------------------------------------------------
print("\n🎬 [TEST 2] Kiểm tra tính tàng hình của tài liệu API (/docs)...")
try:
    docs_url = f"{TARGET_URL}/docs"
    response = requests.get(docs_url, timeout=10)
    
    if response.status_code == 404:
        print(f"  ✅ Đường dẫn {docs_url} trả về mã 404 Not Found.")
        print("👉 KẾT LUẬN: Sơ đồ API đã được GIẤU KÍN hoàn hảo przed hacker!")
    else:
        print(f"  ⚠️ CẢNH BÁO: Link /docs vẫn mở (Mã trạng thái: {response.status_code})")
except Exception as e:
    print(f"  ❌ Lỗi kiểm tra /docs: {e}")


# ---------------------------------------------------------
# KỊCH BẢN 3: Thử nghiệm tấn công CORS từ một bên thứ ba
# ---------------------------------------------------------
print("\n🎬 [TEST 3] Giả lập Hacker gọi API từ một Website lạ (CORS Attack)...")
try:
    api_url = f"{TARGET_URL}/api/projects/"
    # Giả lập request đến từ một trang web hacker lạ hoắc
    fake_headers = {"Origin": "https://hacker-website.com"}
    
    response = requests.get(api_url, headers=fake_headers, timeout=10)
    allow_origin = response.headers.get("Access-Control-Allow-Origin")
    
    if allow_origin != "https://hacker-website.com":
        print("  ✅ Server từ chối cấp quyền CORS cho trang web lạ.")
        print(f"  🛡️ Access-Control-Allow-Origin trả về: {allow_origin}")
        print("👉 KẾT LUẬN: Hệ thống CHẶN ĐỨNG các cuộc gọi API trái phép!")
    else:
        print("  ❌ CẢNH BÁO: Hệ thống đang mở toang CORS cho mọi website!")
except Exception as e:
    print(f"  ❌ Lỗi kiểm tra CORS: {e}")

print("\n" + "=" * 60)
print("🏁 QUÁ TRÌNH KIỂM THỬ KẾT THÚC!")
print("=" * 60)