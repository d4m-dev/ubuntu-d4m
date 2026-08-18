from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

class AutoBrandingMiddleware(BaseHTTPMiddleware):
    """
    Lá chắn Thương Hiệu Ngầm:
    Đóng dấu bản quyền hệ thống vào mọi luồng dữ liệu mà không can thiệp cấu trúc JSON
    """
    async def dispatch(self, request: Request, call_next):
        # Cho phép luồng dữ liệu chạy qua bình thường với tốc độ tối đa
        response = await call_next(request)
        
        # 🚀 ĐÓNG DẤU BẢN QUYỀN VÀO HTTP HEADERS (Chuẩn Enterprise)
        response.headers["X-Powered-By"] = "D4M Core API Engine"
        response.headers["X-System-Architect"] = "Ly Thua An"
        response.headers["X-Backend-Version"] = "Ubuntu-2.0.0-Decoupled"
        
        return response