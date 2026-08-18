import os
import re
import time
import asyncio
import psutil
import shutil
from google import genai
from core.config import settings
from api.dashboard import api_status_db
from core.database import get_raw_logs
from scripts.network_tunnel import start_tunnel, stop_tunnel, get_tunnel_url

# ==========================================
# 🧠 QUẢN LÝ TRÍ NHỚ VĂN BẢN
# ==========================================
bot_memory = {}
cached_available_models = []

# ==========================================
# ⚙️ CÁC HÀM TƯƠNG TÁC PHẦN CỨNG (ĐÃ THẨM MỸ HÓA)
# ==========================================
def get_device_battery():
    try:
        with open('/sys/class/power_supply/battery/capacity', 'r') as f: cap = f.read().strip()
        with open('/sys/class/power_supply/battery/status', 'r') as f: stat = f.read().strip()
        return f"{cap}% ({'⚡ Đang sạc' if stat == 'Charging' else '🔋 Dùng pin'})"
    except: return "🔋 Không xác định"

def execute_system_command(cmd: str) -> tuple:
    """Thực thi phần cứng và trả về văn bản định dạng HTML siêu đẹp"""
    if cmd == "STATS":
        cpu = psutil.cpu_percent(interval=0.1)
        ram = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        msg = (
            f"\n\n📊 <b>BÁO CÁO TÀI NGUYÊN HỆ THỐNG</b>\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"🎛️ <b>CPU:</b> <code>{cpu}%</code>\n"
            f"🧠 <b>RAM:</b> <code>{ram.percent}%</code> (<i>{round(ram.used/(1024**3), 1)}GB / {round(ram.total/(1024**3), 1)}GB</i>)\n"
            f"💾 <b>Bộ nhớ:</b> <code>{disk.percent}%</code> (<i>Trống {round(disk.free/(1024**3), 1)}GB</i>)\n"
            f"🔋 <b>Nguồn điện:</b> <code>{get_device_battery()}</code>\n"
            f"━━━━━━━━━━━━━━━━━━━━"
        )
        return msg, "Đã quét thông số phần cứng"
        
    elif cmd == "TOP":
        procs = sorted([p.info for p in psutil.process_iter(['name', 'memory_percent']) if p.info['memory_percent']], key=lambda p: p['memory_percent'], reverse=True)[:5]
        proc_rows = "\n".join([f"▪️ <code>{p['name']}</code>: <b>{p['memory_percent']:.1f}%</b> RAM" for p in procs])
        
        msg = (
            f"\n\n🔬 <b>TOP 5 TIẾN TRÌNH CHIẾM DỤNG RAM KHỦNG</b>\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"{proc_rows}\n"
            f"━━━━━━━━━━━━━━━━━━━━"
        )
        return msg, "Đã quét tiến trình"
        
    elif cmd == "CLEAN":
        from api.audio_engine import WORKSPACE_DIR
        freed = sum(1 for root, dirs, _ in os.walk(WORKSPACE_DIR) for d in dirs if d.startswith("temp_") and not shutil.rmtree(os.path.join(root, d), ignore_errors=True))
        
        msg = (
            f"\n\n✨ <b>HỆ THỐNG ĐÃ ĐƯỢC LÀM SẠCH</b>\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"🧹 Đã dọn dẹp triệt để: <b>{freed}</b> thư mục tạm rác AI.\n"
            f"🚀 Trạng thái ổ cứng hiện tại: <code>{psutil.disk_usage('/').percent}%</code>"
        )
        return msg, "Đã dọn rác"
        
    elif cmd == "BACKUP":
        return "", "BACKUP_REQUESTED"
    return "", None

def get_latest_lyrics_context() -> str:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    telegram_audio_dir = os.path.join(base_dir, "audio_workspace", "telegram")
    latest_file, latest_time = None, 0
    if os.path.exists(telegram_audio_dir):
        for root, _, files in os.walk(telegram_audio_dir):
            for file in files:
                if file.endswith(".lrc"):
                    f_path = os.path.join(root, file)
                    f_time = os.path.getmtime(f_path)
                    if f_time > latest_time: latest_time, latest_file = f_time, f_path
    if latest_file:
        try:
            with open(latest_file, "r", encoding="utf-8") as f: content = f.read()
            return f"\n\n[FILE LỜI BÀI HÁT MỚI NHẤT]:\n{content[:1000]}..."
        except: pass
    return ""

# ==========================================
# 🚀 HÀM ĐỒNG BỘ: CHẠY NỘI TRONG THREAD (GIỮ NGUYÊN LOGIC CỦA SẾP)
# ==========================================
def sync_ai_worker(chat_id: str, message: str, is_admin_mode: bool, context_addon: str):
    global cached_available_models
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    
    # BỘ LỌC VÀ LẤY MODEL SIÊU CHUẨN (Khắc phục 100% lỗi 404)
    if not cached_available_models:
        try: cached_available_models = [m.name for m in client.models.list() if 'gemini' in m.name.lower()]
        except: pass
    if not cached_available_models: cached_available_models = ['models/gemini-1.5-flash']

    target_models = ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-pro', 'gemini-pro']
    reply_text, toggle_target, cmd_action = "", None, None

    ui_formatting_instruction = (
        "\n\nQUY ĐỊNH TRÌNH BÀY GIAO DIỆN (UI): "
        "Hãy trình bày câu trả lời thật đẹp mắt, có khoảng cách dòng thông thoáng, phân chia danh sách bằng biểu tượng emoji rõ ràng. "
        "BẮT BUỘC sử dụng linh hoạt các thẻ HTML sau để nhấn mạnh: "
        "- Dùng <b>chữ in đậm</b> cho tiêu đề hoặc từ khóa cốt lõi. "
        "- Dùng <code>đoạn code ngắn</code> cho thông số, cổng, tên file, tên biến. "
        "- Dùng <pre>khối mã lệnh</pre> khi viết các đoạn mã Python/Bash dài để sếp dễ sao chép."
    )

    # ------------------------------------------------------------
    # 👑 NHÂN CÁCH ADMIN 
    # ------------------------------------------------------------
    if is_admin_mode:
        recent_logs = get_raw_logs(limit=20)
        current_status = "\n".join([f"- {k}: {'ĐANG BẬT' if v['active'] else 'ĐANG TẮT'}" for k, v in api_status_db.items()])
        
        sys_prompt = f"""
        Bạn là AI Quản trị viên tối cao của hệ thống Ubuntu. Ngôn ngữ: Tiếng Việt.
        Trạng thái vận hành: {current_status}
        Nhật ký hệ thống: {recent_logs}
        
        QUY TẮC ĐIỀU KHIỂN BẰNG MÃ LỆNH ngầm (CHÈN VÀO CUỐI CÂU):
        1. Yêu cầu bật/tắt (internet_tunnel): Chèn [TOGGLE: ten_dich_vu]
        2. Sếp muốn xem RAM, CPU, Pin: Chèn [CMD: STATS]
        3. Sếp muốn xem ứng dụng ngốn RAM nhất: Chèn [CMD: TOP]
        4. Sếp muốn dọn rác AI: Chèn [CMD: CLEAN]
        5. Sếp muốn sao lưu/backup mã nguồn: Chèn [CMD: BACKUP]
        
        Yêu cầu hiện tại của Sếp: {message} {ui_formatting_instruction}
        """
        
        for attempt in range(3):
            try:
                target_str = target_models[attempt % len(target_models)]
                chosen_model = next((m for m in cached_available_models if target_str in m.lower()), cached_available_models[0]).replace('models/', '')
                reply_text = client.models.generate_content(model=chosen_model, contents=sys_prompt).text
                break
            except Exception as e:
                if '503' in str(e) or '429' in str(e):
                    if attempt < 2: time.sleep(1.5); continue
                raise e

        # Bóc tách lệnh ngầm
        match_toggle = re.search(r'\[TOGGLE:\s*([a-zA-Z0-9_]+)\]', reply_text)
        if match_toggle:
            toggle_target = match_toggle.group(1).strip()
            reply_text = re.sub(r'\[TOGGLE:\s*([a-zA-Z0-9_]+)\]', '', reply_text).strip()
            
        match_cmd = re.search(r'\[CMD:\s*([a-zA-Z0-9_]+)\]', reply_text)
        if match_cmd:
            cmd_code = match_cmd.group(1).strip()
            reply_text = re.sub(r'\[CMD:\s*([a-zA-Z0-9_]+)\]', '', reply_text).strip()
            cmd_result_text, cmd_action = execute_system_command(cmd_code)
            reply_text += cmd_result_text
            
        return reply_text, toggle_target, cmd_action
        
    # ------------------------------------------------------------
    # 💬 NHÂN CÁCH TRỢ LÝ TÂM SỰ 
    # ------------------------------------------------------------
    else:
        if chat_id not in bot_memory:
            bot_memory[chat_id] = "Bạn là trợ lý AI thông minh, sở hữu gu thẩm mỹ thiết kế UI tinh tế. Luôn xưng 'mình', gọi tôi là 'sếp'.\n"
            
        if len(bot_memory[chat_id]) > 3500:
            bot_memory[chat_id] = "Bạn là trợ lý AI thông minh.\n[Dọn dẹp trí nhớ cũ...]\n" + bot_memory[chat_id][-2000:]

        current_prompt = bot_memory[chat_id] + f"\nSếp: {message + context_addon} {ui_formatting_instruction}\nAI:"

        for attempt in range(3):
            try:
                target_str = target_models[attempt % len(target_models)]
                chosen_model = next((m for m in cached_available_models if target_str in m.lower()), cached_available_models[0]).replace('models/', '')
                reply_text = client.models.generate_content(model=chosen_model, contents=current_prompt).text
                bot_memory[chat_id] = current_prompt + f" {reply_text}"
                break 
            except Exception as e:
                if '503' in str(e) or '429' in str(e):
                    if attempt < 2: time.sleep(1.5); continue
                raise e

        return reply_text, None, None

# ==========================================
# 🚀 HÀM GIAO TIẾP VỚI TELEGRAM BOT (ĐÃ FIX DÒ LINK)
# ==========================================
async def process_telegram_ai(chat_id: str, message: str) -> dict:
    if not settings.GEMINI_API_KEY: return {"reply": "⚠️ Chưa cấu hình GEMINI_API_KEY.", "action_executed": None}

    try:
        admin_keywords = ["bật", "tắt", "tunnel", "hạ tầng", "hệ thống", "trạng thái", "ram", "cpu", "pin", "tiến trình", "dọn rác", "dọn dẹp", "sao lưu", "backup"]
        is_admin_mode = any(kw in message.lower() for kw in admin_keywords)
        context_addon = get_latest_lyrics_context() if not is_admin_mode and any(kw in message.lower() for kw in ["lời", "bài hát", "lyric"]) else ""
        
        reply_text, toggle_target, cmd_action = await asyncio.to_thread(sync_ai_worker, chat_id, message, is_admin_mode, context_addon)
        
        action_taken = cmd_action 
        if toggle_target and toggle_target in api_status_db:
            new_state = not api_status_db[toggle_target]["active"]
            
            # 🚀 XỬ LÝ RIÊNG CHO TUNNEL: TÍCH HỢP VÒNG LẶP DÒ LINK 15 GIÂY
            if toggle_target == "internet_tunnel":
                if new_state: 
                    start_tunnel()
                    link_found = ""
                    for _ in range(15):
                        await asyncio.sleep(1)
                        link_found = get_tunnel_url()
                        if link_found: break
                        
                    if link_found:
                        api_status_db["internet_tunnel"]["public_url"] = link_found
                        reply_text += f"\n\n✅ <b>Hệ thống xác nhận:</b> Tunnel đã mở thành công!\n🌐 <b>Link Public:</b> {link_found}"
                    else:
                        reply_text += "\n\n⚠️ <b>Thông báo:</b> Đã gửi lệnh bật Tunnel nhưng đường truyền mạng hiện đang chậm, chưa dò được link. Sếp vui lòng kiểm tra lại sau nhé."
                else: 
                    stop_tunnel()
                    api_status_db["internet_tunnel"]["public_url"] = ""
                    reply_text += "\n\n🔴 <b>Hệ thống xác nhận:</b> Đã ngắt kết nối Cloudflare Tunnel thành công!"
            
            api_status_db[toggle_target]["active"] = new_state
            if action_taken is None:
                action_taken = f"Lệnh phần cứng: {'BẬT' if new_state else 'TẮT'} {toggle_target}"

        return {"reply": reply_text, "action_executed": action_taken}

    except Exception as e:
        return {"reply": f"Lỗi hệ thống ngầm: {str(e)[:200]}", "action_executed": "Lỗi AI"}