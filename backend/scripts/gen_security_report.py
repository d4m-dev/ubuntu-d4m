import json
import os
import sys
from datetime import datetime


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)


JSON_PATH = os.path.join(PROJECT_ROOT, "semgrep_report.json")
OUTPUT_HTML = os.path.join(PROJECT_ROOT, "ubuntu-frontend", "admin", "security_report.html")

def generate_html():
    if not os.path.exists(JSON_PATH):
        print(f"❌ Không tìm thấy file báo cáo tại: {JSON_PATH}")
        print("💡 Hãy chạy lệnh semgrep scan trước!")
        return

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)


    results = data.get("results", [])
    total_issues = len(results)
    
    # Phân loại mức độ nghiêm trọng
    high_count = sum(1 for r in results if r.get("extra", {}).get("severity") == "ERROR")
    med_count = sum(1 for r in results if r.get("extra", {}).get("severity") == "WARNING")
    low_count = total_issues - high_count - med_count

    # Dựng thẻ HTML cho từng lỗi
    cards_html = ""
    if total_issues == 0:
        cards_html = """
        <div class="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-8 text-center my-8">
            <i class="fa-solid fa-shield-check text-6xl text-emerald-400 mb-4 animate-bounce"></i>
            <h3 class="text-2xl font-bold text-white">Hệ Thống An Toàn Tuyệt Đối!</h3>
            <p class="text-gray-400 mt-2">Không phát hiện lỗ hổng bảo mật nào sau khi đã lọc các cảnh báo rác.</p>
        </div>
        """
    else:
        for idx, item in enumerate(results, 1):
            rule_id = item.get("check_id", "Unknown Rule")
            path = item.get("path", "Unknown File")
            start_line = item.get("start", {}).get("line", 0)
            end_line = item.get("end", {}).get("line", 0)
            extra = item.get("extra", {})
            message = extra.get("message", "Không có chi tiết")
            severity = extra.get("severity", "INFO")
            code_snippet = extra.get("lines", "").strip()

            # Chọn màu sắc theo mức độ
            badge_color = "bg-red-500/20 text-red-400 border-red-500/30" if severity == "ERROR" else "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
            icon = "fa-radiation" if severity == "ERROR" else "fa-triangle-exclamation"

            cards_html += f"""
            <div class="bg-gray-900/80 border border-white/10 rounded-2xl p-6 mb-6 hover:border-blue-500/50 transition-all shadow-lg">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b border-white/5">
                    <div class="flex items-center gap-3">
                        <span class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-bold text-blue-400 font-mono">#{idx}</span>
                        <div>
                            <span class="text-xs font-mono text-gray-500 block">{rule_id}</span>
                            <h4 class="text-lg font-bold text-white tracking-wide"><i class="fa-solid fa-file-code text-blue-400 mr-2"></i>{path} <span class="text-sm font-normal text-purple-400">(Dòng {start_line} - {end_line})</span></h4>
                        </div>
                    </div>
                    <span class="px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 uppercase font-mono {badge_color}">
                        <i class="fa-solid {icon}"></i> {severity}
                    </span>
                </div>
                <p class="text-gray-300 text-sm mb-4 leading-relaxed bg-black/40 p-4 rounded-xl border border-white/5 font-sans">
                    <strong class="text-white">💡 Chẩn đoán:</strong> {message}
                </p>
                <div class="relative">
                    <span class="absolute top-2 right-3 text-[10px] text-gray-500 font-mono uppercase">Code Lỗi</span>
                    <pre class="bg-black/80 text-red-300 p-4 rounded-xl font-mono text-xs overflow-x-auto border border-red-500/20"><code>{code_snippet}</code></pre>
                </div>
            </div>
            """

    # Gói vào bộ khung HTML D4M Matrix
    html_template = f"""
    <!DOCTYPE html>
    <html lang="vi" class="dark">
    <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>D4M Security Audit | Aegis Shield Report</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Outfit:wght@400;700;900&family=Inter:wght@400;600&display=swap" rel="stylesheet">
        <style>
            body {{ background-color: #030712; color: #f8fafc; font-family: 'Inter', sans-serif; }}
            h1, h2, h3, h4 {{ font-family: 'Outfit', sans-serif; }}
            .font-mono {{ font-family: 'Fira Code', monospace; }}
            .cyber-grid {{ position: fixed; inset: 0; z-index: -1; background-size: 50px 50px; background-image: linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px); }}
        </style>
    </head>
    <body class="min-h-screen p-6 md:p-12 relative">
        <div class="cyber-grid"></div>
        <div class="max-w-6xl mx-auto">
            <!-- Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 bg-gray-900/60 p-8 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl">
                <div>
                    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase mb-3 font-mono">
                        <i class="fa-solid fa-radar animate-spin"></i> Aegis Shield Intelligence
                    </div>
                    <h1 class="text-3xl md:text-5xl font-black text-white tracking-tight">Báo Cáo An Ninh Code <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">D4M Matrix</span></h1>
                    <p class="text-gray-400 text-sm mt-2">Thời gian quét: <strong class="text-white">{datetime.now().strftime('%d/%m/%Y - %H:%M:%S')}</strong> | Đã tự động lọc rác CDN & Vendor.</p>
                </div>
                <!-- Thống kê nhanh -->
                <div class="flex gap-4 w-full md:w-auto justify-end">
                    <div class="bg-black/50 border border-white/10 px-6 py-4 rounded-2xl text-center min-w-[100px]">
                        <span class="text-2xl font-black text-white font-mono">{total_issues}</span>
                        <span class="block text-[11px] text-gray-400 uppercase font-bold mt-1">Tổng Lỗi</span>
                    </div>
                    <div class="bg-red-500/10 border border-red-500/20 px-6 py-4 rounded-2xl text-center min-w-[100px]">
                        <span class="text-2xl font-black text-red-400 font-mono">{high_count}</span>
                        <span class="block text-[11px] text-red-300 uppercase font-bold mt-1">Nghiêm Trọng</span>
                    </div>
                    <div class="bg-yellow-500/10 border border-yellow-500/20 px-6 py-4 rounded-2xl text-center min-w-[100px]">
                        <span class="text-2xl font-black text-yellow-400 font-mono">{med_count}</span>
                        <span class="block text-[11px] text-yellow-300 uppercase font-bold mt-1">Cảnh Báo</span>
                    </div>
                </div>
            </div>

            <!-- Danh sách Lỗi -->
            <div class="space-y-6">
                <h2 class="text-xl font-bold text-gray-300 tracking-wide flex items-center gap-2">
                    <i class="fa-solid fa-list-check text-purple-400"></i> Danh sách chi tiết cần gia cố ({total_issues} mục)
                </h2>
                {cards_html}
            </div>

            <!-- Footer -->
            <div class="mt-12 text-center text-xs text-gray-500 font-mono border-t border-white/5 pt-6">
                D4M Cloud Workspace Security Module &copy; 2026. Powered by Semgrep & Aegis Shield.
            </div>
        </div>
    </body>
    </html>
    """

    # Tạo thư mục admin nếu chưa có và lưu file
    os.makedirs(os.path.dirname(OUTPUT_HTML), exist_ok=True)
    with open(OUTPUT_HTML, "w", encoding="utf-8") as f:
        f.write(html_template)

    print(f"✅ ĐÃ XUẤT BÁO CÁO HTML SIÊU ĐẸP TẠI: {os.path.abspath(OUTPUT_HTML)}")
    print("🌐 Sếp có thể mở trình duyệt và truy cập: http://localhost:5500/ubuntu-frontend/admin/security_report.html (hoặc tên miền D4M tương ứng)")

if __name__ == "__main__":
    generate_html()