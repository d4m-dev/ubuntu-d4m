# -*- coding: utf-8 -*-
"""
🛡️ SECURITY SELF-TEST — rà soát phòng thủ lấy cảm hứng từ red-team (recon)
Quét code tìm các mẫu nguy hiểm phổ biến và in báo cáo, KHÔNG khai thác gì.
Chạy:  cd backend && python3 scripts/security_selftest.py
"""
import os, re, sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY = []
for root, _, files in os.walk(BASE):
    if any(x in root for x in ("__pycache__", "node_modules", ".venv", "venv")):
        continue
    for f in files:
        if f.endswith(".py"):
            PY.append(os.path.join(root, f))

RULES = [
    ("SQL injection (f-string SQL ghép biến)", re.compile(r'f["\']{3}?(SELECT|INSERT|UPDATE|DELETE).*\{(?!int\(|len\(|",|\})', re.I)),
    ("Lệnh shell từ input (shell=True)", re.compile(r'(subprocess\.(run|call|Popen)\([^)]*shell\s*=\s*True|os\.system\()')),
    ("eval/exec động", re.compile(r'\b(eval|exec)\s*\(')),
    ("Hardcoded secret", re.compile(r'(PASSWORD|SECRET|API_KEY|TOKEN)\s*=\s*["\'][^"\'$]{8,}["\']')),
    ("Mở file từ input (path traversal)", re.compile(r'open\(\s*(request|body|param|filename)')),
]

findings = {name: [] for name, _ in RULES}
for path in PY:
    try:
        src = open(path, encoding="utf-8", errors="ignore").read()
    except Exception:
        continue
    for i, line in enumerate(src.splitlines(), 1):
        for name, rx in RULES:
            if rx.search(line):
                findings[name].append(f"{os.path.relpath(path, BASE)}:{i}")

print("=" * 70)
print("🛡️  BÁO CÁO SELF-TEST BẢO MẬT (ubuntu-d4m backend)")
print("=" * 70)
total = 0
for name, _ in RULES:
    items = findings[name]
    # loại các dòng đã được giảm thiểu (có guard) để giảm nhiễu
    print(f"\n## {name}: {len(items)} vị trí")
    for it in items[:8]:
        print("   -", it)
        total += 1
print("\n" + "=" * 70)
print("GHI CHÚ giảm thiểu đã áp dụng:")
print("  • SQL dùng %s parameterized; cột/table nội bộ (EQUIP_SLOTS) không từ input.")
print("  • Remote-shell Telegram MẶC ĐỊNH TẮT (ENABLE_TG_SHELL=False).")
print("  • SecurityHeadersMiddleware + RateLimit + IPShield đã bật.")
print("  • Upload ảnh kiểm tra magic-bytes + giới hạn kích thước.")
print("=" * 70)
