# -*- coding: utf-8 -*-
# Tên file: ubuntu-backend/core/db_logger.py
import os
import sqlite3
import logging

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "database", "logs.db")

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS access_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ip_address TEXT,
                method TEXT,
                path TEXT,
                status_code INTEGER,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()

def log_request(ip, method, path, status_code):
    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO access_logs (ip_address, method, path, status_code) VALUES (?, ?, ?, ?)",
                (ip, method, path, status_code)
            )
            conn.commit()
    except Exception as e:
        logging.error(f"Lỗi ghi log SQLite: {e}")

def get_request_stats():
    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT substr(datetime(timestamp, 'localtime'), 12, 5) as minute, COUNT(*)
                FROM access_logs
                GROUP BY minute ORDER BY minute DESC LIMIT 10
            ''')
            rows = cursor.fetchall()
            rows.reverse()
            return {"timeline": [{"time": row[0], "count": row[1]} for row in rows]}
    except Exception:
        return {"timeline": []}

def get_raw_logs(limit=30):
    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT datetime(timestamp, 'localtime'), ip_address, method, path, status_code 
                FROM access_logs ORDER BY id DESC LIMIT ?
            ''', (limit,))
            rows = cursor.fetchall()
            return "\n".join([f"[{r[0]}] IP: {r[1]} | {r[2]} {r[3]} | Status: {r[4]}" for r in rows])
    except Exception:
        return "Không thể đọc Access Logs."