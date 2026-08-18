import asyncio
import httpx
import os
import subprocess
from datetime import datetime
from core.config import settings
from core.tg_utils import send_telegram_message

# Bộ nhớ đệm chống gửi thông báo lặp
daily_flags = {"morning": False, "afternoon": False, "evening": False, "backup": False}
last_weather_condition = ""

# Lịch các sự kiện và câu chúc (Đã được J.A.R.V.I.S mặn mòi hóa)
holidays = {
    "01/01": "🎉 BOOM! Chúc mừng Năm Mới sếp! Chúc hệ sinh thái D4M năm nay scale x100, server chạy mượt không rớt một nhịp!",
    "14/02": "💖 Happy Valentine sếp ơi! Code thì có thể debug chứ tình yêu thì cứ phải deploy thẳng production nhé!",
    "08/03": "🌸 Mùng 8/3! Chúc một nửa thế giới của sếp luôn rạng rỡ. Sếp nhớ có quà không là server 'cháy' đó!",
    "30/04": "🇻🇳 30/4 Giải phóng miền Nam! Sếp xách balo lên và đi chill thôi, server cứ để đệ lo!",
    "01/05": "👷 Quốc tế Lao động! Máy móc còn được nghỉ, sếp cũng phải tắt máy tính nghỉ ngơi đi nhé!",
    "02/09": "🇻🇳 Mừng Quốc khánh! Cờ đỏ sao vàng rợp trời, chúc sếp kỳ nghỉ lễ nạp full năng lượng!",
    "16/09": "🎂 HAPPY BIRTHDAY TƯ LỆNH LÝ THỪA ÂN! 🚀 Tuổi mới chúc sếp đập đâu trúng đó, não nảy số như RAM DDR5, bug tự động bay màu khi sếp lườm!",
    "20/10": "🌹 20/10 chói lọi! Chúc các bóng hồng xung quanh sếp luôn xinh đẹp và yêu thương sếp nhiều hơn!",
    "24/12": "🎄 Merry Christmas! Noel này server ấm lắm rồi, sếp ra đường quẩy đi cho có không khí!"
}

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKUP_DIR = os.path.join(BASE_DIR, "backups")

async def perform_db_backup():
    """Lõi thực thi kết xuất và nén Database"""
    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    db_name = getattr(settings, "DB_NAME", "social_hub") 
    db_user = getattr(settings, "DB_USER", "root")
    db_password = getattr(settings, "DB_PASS", "")
    
    sql_file = os.path.join(BACKUP_DIR, f"{db_name}_backup_{timestamp}.sql")
    gz_file = f"{sql_file}.gz"

    try:
        pass_str = f"-p{db_password}" if db_password else ""
        cmd = f"mysqldump -u {db_user} {pass_str} {db_name} | gzip > {gz_file}"
        
        process = await asyncio.to_thread(subprocess.run, cmd, shell=True, capture_output=True, text=True)
        
        if process.returncode != 0:
            await send_telegram_message(f"❌ <b>[BÁO ĐỘNG ĐỎ] Két sắt kẹt phím! Lỗi sao lưu:</b>\n<pre>{process.stderr}</pre>")
            return

        files = sorted([f for f in os.listdir(BACKUP_DIR) if f.endswith(".gz")])
        if len(files) > 7:
            for old_file in files[:-7]:
                try: os.remove(os.path.join(BACKUP_DIR, old_file))
                except: pass

        file_size_mb = os.path.getsize(gz_file) / (1024 * 1024)
        await send_telegram_message(
            f"📦 <b>[BẢO MẬT] Két Sắt Đã Bơm Niêm Phong!</b>\n"
            f"▫️ <b>Hàng nóng:</b> <code>{os.path.basename(gz_file)}</code>\n"
            f"▫️ <b>Cân nặng:</b> {file_size_mb:.2f} MB\n"
            f"<i>Dữ liệu của sếp đã an toàn tuyệt đối. Đệ đi ngủ đây! 🦉</i>"
        )

    except Exception as e:
        await send_telegram_message(f"❌ <b>[AUTO BACKUP]</b> Ngoại lệ hệ thống chọc thủng: {str(e)}")

async def fetch_financial_report():
    """Lấy dữ liệu Tỉ giá USD, JPY và Vàng"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get("https://open.er-api.com/v6/latest/USD")
            data = res.json()
            vnd_rate = data["rates"]["VND"]
            jpy_rate = data["rates"]["JPY"]
            
            usd_to_vnd = vnd_rate
            jpy_to_vnd = vnd_rate / jpy_rate
            
            estimated_gold_usd_per_oz = 2350.00 
            gold_vnd_per_luong = estimated_gold_usd_per_oz * 1.205 * usd_to_vnd
            
            report = (
                f"📊 <b>TÌNH HÌNH KINH TẾ VĨ MÔ SÁNG NAY:</b>\n"
                f"🇺🇸 1 USD = {usd_to_vnd:,.0f} VNĐ\n"
                f"🇯🇵 1 JPY = {jpy_to_vnd:,.0f} VNĐ\n"
                f"🥇 Vàng (World): {estimated_gold_usd_per_oz:,.0f} USD/Oz (~ {gold_vnd_per_luong:,.0f} VNĐ/Lượng)\n"
                f"<i>(Lưu ý: Tỉ giá chỉ để sếp tham khảo gồng lãi, không phải lời khuyên đầu tư nha! 🚀)</i>"
            )
            return report
    except Exception as e:
        return "⚠️ Vệ tinh tài chính đang tắc đường, đệ không lấy được số liệu sáng nay sếp ạ."

async def check_weather_alert():
    """Giám sát vệ tinh thời tiết khu vực"""
    global last_weather_condition
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get("https://vi.wttr.in/Phu Quoc?format=%C")
            condition = res.text.strip().lower()
            
            alert_msg = ""
            if "rain" in condition or "mưa" in condition or "drizzle" in condition:
                alert_msg = "🌧️ <b>Éc éc, trời chuyển mưa rồi!</b> Lên đồ đi ra ngoài thì sếp nhớ giắt theo cái ô/áo mưa nhé, ướt sũng là không ai fix bug thay đâu!"
            elif "storm" in condition or "bão" in condition or "thunder" in condition or "dông" in condition:
                alert_msg = "⛈️ <b>ALARM! Bão tố phong ba đang tới!</b> Trú ẩn ngay sếp ơi! Tiện thể liếc qua xem nguồn điện máy chủ có ổn định không nha."
            elif "clear" in condition or "sun" in condition or "nắng" in condition:
                alert_msg = "☀️ <b>Trời nắng cực gắt!</b> Thời tiết này chỉ hợp ngồi phòng máy lạnh code thôi. Nếu ra ngoài sếp nhớ bôi kem chống nắng và bú nhiều nước vào!"
            
            if alert_msg and condition != last_weather_condition:
                last_weather_condition = condition
                await send_telegram_message(f"🚨 <b>CẢNH BÁO THỜI TIẾT PHÚ QUỐC:</b>\n{alert_msg}")
    except:
        pass

async def run_scheduler():
    """Vòng lặp thời gian cốt lõi của hệ thống"""
    global daily_flags
    await asyncio.sleep(5)
    
    while True:
        now = datetime.now()
        current_time = now.strftime("%H:%M")
        current_date = now.strftime("%d/%m")
        
        if current_time == "00:00":
            daily_flags = {k: False for k in daily_flags}
            await asyncio.sleep(60)
            continue
            
        if current_time == "07:00" and not daily_flags["morning"]:
            msg = f"🌅 <b>PING!</b> Chào buổi sáng sếp Lý Thừa Ân! Đêm qua ngủ ngon chứ? Hệ thống đã khởi động full công suất, sẵn sàng chờ lệnh khai hỏa ngày mới từ sếp!\n\n"
            if current_date in holidays:
                msg += f"🎊 <b>SỰ KIỆN HÔM NAY:</b> {holidays[current_date]}\n\n"
            fin_report = await fetch_financial_report()
            msg += fin_report
            await send_telegram_message(msg)
            daily_flags["morning"] = True
            
        elif current_time == "12:00" and not daily_flags["afternoon"]:
            await send_telegram_message("🍲 <b>Đói bụng chưa sếp ơi?</b> Tới giờ nạp năng lượng rồi! Buông bàn phím xuống, order gì ngon ngon lấp đầy bao tử đi, cày cố là tụt đường huyết đó!")
            daily_flags["afternoon"] = True
            
        elif current_time == "18:00" and not daily_flags["evening"]:
            await send_telegram_message("🌆 <b>Hết giờ hành chính!</b> Tắt máy, giãn gân cốt và xách mông đi quẩy thôi sếp. Căng thẳng quá thì bật Music Hub lên chill, chuyện bug bủng để mai tính!")
            daily_flags["evening"] = True
            
        # 🦉 Nightly Backup (Lúc 02:00)
        elif current_time == "02:00" and not daily_flags.get("backup"):
            await send_telegram_message("🦉 <b>[NIGHT SHIFT]</b> Cú đêm J.A.R.V.I.S đang âm thầm đóng gói dữ liệu Két Sắt. Sếp cứ an giấc, để đệ lo!")
            await perform_db_backup()
            daily_flags["backup"] = True

        if now.minute in [0, 30]:
            await check_weather_alert()

        await asyncio.sleep(60)