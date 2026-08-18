# -*- coding: utf-8 -*-
"""
🚀 D4M MUSIC DEMO SERVER (Bản gộp)
Chạy riêng phần music (không khởi động toàn bộ hệ sinh thái D4M để tránh phụ thuộc
Redis / Telegram / Celery / Tunnel). Mount đúng router d4m_music + streaming audio.

Chạy:  ./venv/bin/python run_music_demo.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.d4m_music import router as d4m_music_router
# Dùng lại audio_engine (stream/cover/lyrics) có sẵn của hệ sinh thái
from api.audio_engine import router as audio_router
from api.music import router as music_router  # /api/music/* sẵn có

app = FastAPI(title="D4M Music Demo (Merged)", version="1.0.0")

# CORS — giới hạn origin (không dùng * cho môi trường production)
_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:16868",
    "http://127.0.0.1:16868",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(d4m_music_router)
app.include_router(audio_router)
app.include_router(music_router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "D4M Music Demo (Merged)"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=16868)
