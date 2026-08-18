import asyncio
import time
import os
import sys
import logging

# ==========================================
# ⚙️ CẤU HÌNH ĐƯỜNG DẪN & THỜI GIAN
# ==========================================
TIMEOUT_SECONDS = 15 * 60

# 🚀 ĐÃ FIX: Tự động nội suy đường dẫn gốc, bất chấp sếp để thư mục ở đâu
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATUS_FILE = os.path.join(BASE_DIR, "core", ".ai_active")
SHUTDOWN_SCRIPT = os.path.join(BASE_DIR, "scripts", "shutdown_ai.py")

# ==========================================
# 🧠 TRẠNG THÁI HOẠT ĐỘNG (State Management)
# ==========================================
class JanitorState:
    """Quản lý biến trạng thái bằng Class thay vì dùng 'global' dễ gây lỗi"""
    last_activity_time = time.time()

    @classmethod
    def update_activity(cls):
        """Hàm này được gọi mỗi khi có tương tác để reset lại đồng hồ"""
        cls.last_activity_time = time.time()

# Bộc lộ hàm ra ngoài cho các Router khác gọi (VD: Gọi update_activity() khi chat)
update_activity = JanitorState.update_activity


# ==========================================
# 🚀 TÁC VỤ QUÉT NGẦM (BACKGROUND TASK)
# ==========================================
async def ai_janitor_task():
    """Tác vụ chạy ngầm kiểm tra và dọn dẹp AI nếu quá hạn"""
    logging.info("🕒 Trình quản lý tài nguyên (AI Janitor) đã khởi động ngầm.")
    
    while True:
        await asyncio.sleep(60)
        
        # Chỉ kiểm tra nếu hệ thống báo AI đang trong trạng thái Active
        if os.path.exists(STATUS_FILE):
            idle_time = time.time() - JanitorState.last_activity_time
            
            if idle_time >= TIMEOUT_SECONDS:
                logging.warning(f"⏰ AI đã nhàn rỗi {idle_time/60:.1f} phút. Kích hoạt dọn dẹp RAM...")
                try:
                    # 🚀 ĐÃ FIX: Dùng sys.executable để lấy ĐÚNG lõi Python đang chạy (bất kể môi trường ảo nào)
                    # 🚀 ĐÃ FIX: Dùng subprocess bất đồng bộ để KHÔNG LÀM TREO WEB của người khác
                    process = await asyncio.create_subprocess_exec(
                        sys.executable, SHUTDOWN_SCRIPT,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE
                    )
                    
                    # Chờ tiến trình tắt AI kết thúc và lấy kết quả
                    stdout, stderr = await process.communicate()
                    
                    if process.returncode == 0:
                        logging.info("🧹 Auto-Shutdown hoàn tất. Đã giải phóng RAM thành công!")
                        # Chủ động dọn dẹp file trạng thái cho chắc cú
                        if os.path.exists(STATUS_FILE):
                            os.remove(STATUS_FILE)
                    else:
                        logging.error(f"❌ Lỗi khi tự tắt AI (Mã lỗi {process.returncode}): {stderr.decode('utf-8')}")
                        
                except Exception as e:
                    logging.error(f"❌ Lỗi hệ thống nghiêm trọng khi gọi tắt AI: {e}")