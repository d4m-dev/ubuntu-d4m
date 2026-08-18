from starlette.datastructures import MutableHeaders

class SecurityHeadersMiddleware:
    """Lá chắn thép Pure ASGI: Ép dính bảo mật vào mọi luồng dữ liệu cấp thấp"""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                # 1. Chống nhúng iFrame (Clickjacking)
                headers.append("X-Frame-Options", "DENY")
                
                # 2. Chống giả mạo định dạng file
                headers.append("X-Content-Type-Options", "nosniff")
                
                # 3. Kích hoạt bộ lọc chống XSS của trình duyệt
                headers.append("X-XSS-Protection", "1; mode=block")
                
                # 4. Ép HTTPS toàn diện (HSTS)
                headers.append("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
                
                # 5. Ẩn đường dẫn gốc khi user bấm link ra ngoài
                headers.append("Referrer-Policy", "strict-origin-when-cross-origin")
                
                # 6. CSP: Giới hạn nguồn tài nguyên tin cậy (Đã cấp VIP cho Google Fonts và WebSockets)
                csp_rules = (
                    "default-src 'self' 'unsafe-inline' 'unsafe-eval' ws: wss: "
                    "https://cdn.tailwindcss.com https://cdnjs.cloudflare.com "
                    "https://fonts.googleapis.com https://fonts.gstatic.com; "
                    "img-src 'self' data: https:; "
                    "font-src 'self' data: https://cdnjs.cloudflare.com https://fonts.gstatic.com;"
                )
                headers.append("Content-Security-Policy", csp_rules)
                
            await send(message)

        await self.app(scope, receive, send_wrapper)