# -*- coding: utf-8 -*-
# Tên file: services/music_service.py
import os
import pymysql
from pymysql.cursors import DictCursor
from dotenv import load_dotenv

# Nạp file .env từ thư mục gốc
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

def get_db_connection():
    """Tạo kết nối tới MariaDB dựa trên biến môi trường"""
    return pymysql.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASS", ""),
        database=os.getenv("DB_NAME", "social_hub"),
        cursorclass=DictCursor,
        autocommit=True
    )

class MusicService:
    def __init__(self):
        self.db = get_db_connection()

    def close(self):
        self.db.close()

    def get_trending_songs(self, limit: int = 20):
        with self.db.cursor() as cur:
            cur.execute("""
                SELECT id, folder_name AS project, title, artist, 
                       cover_image, audio_file AS file, beat_file, lyric_file 
                FROM songs 
                WHERE status = 1 
                ORDER BY total_views DESC 
                LIMIT %s
            """, (limit,))
            return cur.fetchall()

    def get_public_playlists(self, limit: int = 10):
        with self.db.cursor() as cur:
            cur.execute("""
                SELECT id, name, description, cover_image 
                FROM playlists 
                WHERE is_public = 1 
                ORDER BY created_at DESC 
                LIMIT %s
            """, (limit,))
            return cur.fetchall()

    def record_interaction(self, song_id: int, action: str, user_id: int = None, ip_address: str = "0.0.0.0"):
        with self.db.cursor() as cur:
            if action == "view":
                cur.execute("UPDATE songs SET total_views = total_views + 1 WHERE id = %s", (song_id,))
                cur.execute("INSERT INTO song_views (song_id, user_id, ip_address) VALUES (%s, %s, %s)", 
                            (song_id, user_id, ip_address))
            elif action == "like":
                cur.execute("UPDATE songs SET total_likes = total_likes + 1 WHERE id = %s", (song_id,))
                if user_id:
                    cur.execute("INSERT IGNORE INTO song_likes (song_id, user_id) VALUES (%s, %s)", 
                                (song_id, user_id))
            elif action == "download":
                cur.execute("UPDATE songs SET total_downloads = total_downloads + 1 WHERE id = %s", (song_id,))
                cur.execute("INSERT INTO song_downloads (song_id, user_id, file_type, ip_address) VALUES (%s, %s, %s, %s)", 
                            (song_id, user_id, "mp3", ip_address))