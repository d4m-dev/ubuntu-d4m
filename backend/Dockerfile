# ============================================================
# 🔧 D4M BACKEND — Dockerfile
# FastAPI D4M Ecosystem (port 16868)
# ============================================================
FROM python:3.11-slim

# Cài các thư viện hệ thống cần thiết
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements & cài dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy mã nguồn backend
COPY . .

# Thư mục media nhạc (bind mount nếu muốn giữ file thật)
RUN mkdir -p /app/audio_workspace/music

EXPOSE 16868

# Chạy backend (main.py — toàn bộ hệ sinh thái)
CMD ["python", "main.py"]
