# -*- coding: utf-8 -*-
# Tên file: ubuntu-backend/core/database.py
import logging
import threading
import asyncio
from mysql.connector import pooling
from core.config import settings
from core.db_schema import get_d4m_schema_queries

# 🚀 RE-EXPORT toàn bộ hàm SQLite Logging để giữ 100% tương thích ngược cho hệ thống
from core.db_logger import init_db, log_request, get_request_stats, get_raw_logs

# ==========================================
# --- MARIADB CHO SIÊU HỆ SINH THÁI D4M ---
# ==========================================
class DbManager:
    """Quản lý Connection Pool với Thread-Safe Singleton tối ưu hóa hiệu năng cao"""
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(DbManager, cls).__new__(cls)
                cls._instance.pool = None
        return cls._instance

    def _init_pool(self):
        try:
            self.pool = pooling.MySQLConnectionPool(
                pool_name="d4m_ecosystem_pool",
                pool_size=25,  # 🚀 Tăng pool size lên 25 để phục vụ hệ thống lớn chịu tải cao
                pool_reset_session=True,
                host=settings.DB_HOST,
                port=int(settings.DB_PORT),
                database=settings.DB_NAME,
                user=settings.DB_USER,
                password=settings.DB_PASS
            )
            print("✅ DB Connection Pool (Size: 25) đã được khởi tạo thành công!")
        except Exception as e:
            logging.error(f"⚠️ Khởi tạo MariaDB Pool thất bại (Sẽ thử lại sau): {e}")

    def connect(self):
        """Hàm Ping kiểm tra kết nối lúc Server khởi động (được gọi từ server.py)"""
        if self.pool is None:
            self._init_pool()
        else:
            try:
                conn = self.pool.get_connection()
                conn.close()
                print("✅ MariaDB Connection Pool hoạt động bình thường!")
            except Exception:
                self._init_pool()

    def get_connection(self):
        if self.pool is None:
            self._init_pool()
        if self.pool:
            return self.pool.get_connection()
        raise Exception("Connection pool chưa được khởi tạo hoặc CSDL MariaDB đang sập!")

    def init_social_tables(self):
        """Khởi tạo tự động các bảng cốt lõi của Hệ Sinh Thái D4M từ db_schema

        Vá lỗi: dùng pymysql thay vì mysql.connector để tránh lỗi
        "Commands out of sync" khi thực thi nhiều câu DDL trên MariaDB.
        """
        import pymysql
        conn = None
        cursor = None
        try:
            conn = pymysql.connect(
                host=settings.DB_HOST,
                port=int(settings.DB_PORT),
                user=settings.DB_USER,
                password=settings.DB_PASS,
                database=settings.DB_NAME,
                charset="utf8mb4",
                autocommit=True,
            )
            cursor = conn.cursor()

            cursor.execute("SET foreign_key_checks = 0;")
            for table_query in get_d4m_schema_queries():
                try:
                    cursor.execute(table_query)
                except Exception as e:
                    logging.warning(f"⚠️ Bảng (có thể đã tồn tại/lỗi cú pháp gốc): {e}")
            cursor.execute("SET foreign_key_checks = 1;")
            conn.commit()
            print("✅ Đã khởi tạo và đồng bộ thành công các Bảng Dữ Liệu của Hệ Sinh Thái D4M!")
        except Exception as e:
            logging.error(f"Lỗi khi khởi tạo cấu trúc MariaDB: {e}")
            if conn:
                try:
                    conn.rollback()
                except Exception:
                    pass
        finally:
            if cursor:
                try:
                    cursor.close()
                except Exception:
                    pass
            if conn:
                try:
                    conn.close()
                except Exception:
                    pass


# ==========================================
# --- BỘ CÔNG CỤ DAO (Data Access Object) HIỆN ĐẠI (SYNC & ASYNC) ---
# ==========================================
class DbExecutor:
    """Class chuyên xử lý các lệnh truy vấn (SELECT) lấy dữ liệu"""
    def __init__(self):
        self.db = db_manager

    def select_as_list_dict(self, sql, params=None):
        conn = None
        cursor = None
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(sql, params or ())
            return cursor.fetchall()
        except Exception as e:
            logging.error(f"DbExecutor EXCEPTION: {e} - SQL: {sql}")
            return []
        finally:
            if cursor: cursor.close()
            if conn: conn.close()

    async def aselect(self, sql, params=None):
        """🚀 ASYNC WRAPPER: Không chặn Event Loop của FastAPI khi Query CSDL"""
        return await asyncio.to_thread(self.select_as_list_dict, sql, params)

class DbInserter:
    """Class chuyên xử lý lệnh chèn (INSERT)"""
    def __init__(self):
        self.db = db_manager

    def insert(self, sql, params=None):
        conn = None
        cursor = None
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute(sql, params or ())
            conn.commit()
            return cursor.lastrowid
        except Exception as e:
            logging.error(f"DbInserter EXCEPTION: {e} - SQL: {sql}")
            if conn: conn.rollback()
            return None
        finally:
            if cursor: cursor.close()
            if conn: conn.close()

    async def ainsert(self, sql, params=None):
        """🚀 ASYNC WRAPPER: Non-blocking Insert"""
        return await asyncio.to_thread(self.insert, sql, params)

class DbUpdater:
    """Class chuyên xử lý lệnh cập nhật (UPDATE)"""
    def __init__(self):
        self.db = db_manager

    def update(self, sql, params=None):
        conn = None
        cursor = None
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute(sql, params or ())
            conn.commit()
            return cursor.rowcount
        except Exception as e:
            logging.error(f"DbUpdater EXCEPTION: {e} - SQL: {sql}")
            if conn: conn.rollback()
            return -1
        finally:
            if cursor: cursor.close()
            if conn: conn.close()

    async def aupdate(self, sql, params=None):
        """🚀 ASYNC WRAPPER: Non-blocking Update"""
        return await asyncio.to_thread(self.update, sql, params)

class DbDeleter:
    """Class chuyên xử lý lệnh xóa (DELETE)"""
    def __init__(self):
        self.db = db_manager

    def delete(self, sql, params=None):
        conn = None
        cursor = None
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute(sql, params or ())
            conn.commit()
            return cursor.rowcount
        except Exception as e:
            logging.error(f"DbDeleter EXCEPTION: {e} - SQL: {sql}")
            if conn: conn.rollback()
            return -1
        finally:
            if cursor: cursor.close()
            if conn: conn.close()

    async def adelete(self, sql, params=None):
        """🚀 ASYNC WRAPPER: Non-blocking Delete"""
        return await asyncio.to_thread(self.delete, sql, params)


# Khởi tạo Lõi Database Singleton cho toàn hệ thống
db_manager = DbManager()
db_executor = DbExecutor()
db_inserter = DbInserter()
db_updater = DbUpdater()
db_deleter = DbDeleter()