from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
import redis.asyncio as redis
import logging

# Định cấu hình giới hạn
RATE_LIMIT_DURATION = 60
RATE_LIMIT_REQUESTS = 60

# 🚀 Khởi tạo kết nối lõi Redis cục bộ siêu tốc
redis_client = redis.Redis(host='127.0.0.1', port=6379, db=0, decode_responses=True)

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 🚀 XUYÊN THỦNG CLOUDFLARE ĐỂ LẤY IP THẬT CỦA KHÁCH
        client_ip = request.headers.get("CF-Connecting-IP") or \
                    request.headers.get("X-Forwarded-For", request.client.host).split(',')[0].strip()
        
        path = request.url.path

        # 🛡️ ĐẶC QUYỀN VIP: MIỄN TRỪ RATE LIMIT (BYPASS)
        if request.method == "GET" or \
           path.startswith("/api/dashboard/system-stats") or \
           path.startswith("/api/dashboard/analytics") or \
           path.startswith("/ws/"):
            return await call_next(request)

        # 🚀 CHUYỂN DỮ LIỆU ĐẾM SANG LƯU TRỮ TRÊN REDIS
        redis_key = f"rate_limit:{client_ip}"
        
        try:
            requests_count = await redis_client.incr(redis_key)
            
            if requests_count == 1:
                await redis_client.expire(redis_key, RATE_LIMIT_DURATION)
                
            # 🛑 KIỂM TRA GIỚI HẠN REQUEST
            if requests_count > RATE_LIMIT_REQUESTS:
                logging.warning(f"🚨 LÁ CHẮN REDIS: Chặn {client_ip} tại {path} (Spam: {requests_count} Req)")
                
                # CHỈ TRẢ VỀ JSON THUẦN TÚY CHO FRONTEND XỬ LÝ
                return JSONResponse(
                    status_code=429,
                    content={
                        "status": "error", 
                        "error": {
                            "title": "Hệ thống quá tải", 
                            "message": f"IP của bạn đã chạm mốc {RATE_LIMIT_REQUESTS} tác vụ. Nghỉ tay 60 giây nhé!"
                        }
                    }
                )

        except Exception as e:
            logging.error(f"Lỗi Redis Rate Limit (Bypass an toàn): {e}")

        return await call_next(request)