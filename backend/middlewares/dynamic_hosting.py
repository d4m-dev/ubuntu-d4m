import os
import sys
import importlib.util
import warnings
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse, HTMLResponse
from starlette.types import Scope, Receive, Send

try:
    from a2wsgi import WSGIMiddleware
except ImportError:
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", category=DeprecationWarning)
            from starlette.middleware.wsgi import WSGIMiddleware
    except ImportError:
        WSGIMiddleware = None

_flask_app_cache = {}

# 🚀 ĐÃ CHUYỂN TỌA ĐỘ VỀ NHÀ FRONTEND
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # Thư mục ubuntu-backend
HOSTING_DIR = os.path.abspath(os.path.join(BASE_DIR, "../ubuntu-frontend/hosted_projects"))

class DynamicHostingMiddleware:
    def __init__(self, app):
        self.app = app
        os.makedirs(HOSTING_DIR, exist_ok=True)

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        path = scope["path"]

        # Chỉ hoạt động tại cổng /projects/
        if not path.startswith("/projects/"):
            return await self.app(scope, receive, send)

        sub_path = path[len("/projects/"):]
        parts = [p for p in sub_path.split("/") if p]

        if not parts:
            response = JSONResponse(status_code=404, content={"status": "error", "message": "❌ Không có tên dự án"})
            return await response(scope, receive, send)

        folder_name = parts[0]
        project_path = os.path.join(HOSTING_DIR, folder_name)

        if not os.path.isdir(project_path):
            response = JSONResponse(status_code=404, content={"status": "error", "message": f"❌ Không tìm thấy dự án: {folder_name}"})
            return await response(scope, receive, send)

        if os.path.exists(os.path.join(project_path, ".frozen")):
            html_content = f"""
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Dự Án Đang Bảo Trì</title>
                <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body class="bg-gray-900 text-white flex items-center justify-center h-screen">
                <div class="text-center bg-gray-800 p-8 rounded-2xl shadow-xl">
                    <h1 class="text-3xl font-black text-blue-400 mb-4">Đang Nâng Cấp</h1>
                    <p class="text-gray-400 mb-6">Dự án [{folder_name}] hiện đang bảo trì.</p>
                    <a href="/" class="px-6 py-2 bg-blue-600 rounded-lg text-white font-bold hover:bg-blue-500">Quay lại Hub</a>
                </div>
            </body>
            </html>
            """
            response = HTMLResponse(content=html_content, status_code=503)
            return await response(scope, receive, send)

        if len(parts) == 1 and not path.endswith("/"):
            redirect_url = f"{path}/"
            if scope.get("query_string"): 
                redirect_url += f"?{scope['query_string'].decode()}"
            response = RedirectResponse(url=redirect_url, status_code=307)
            return await response(scope, receive, send)

        remaining_path = "/".join(parts[1:])
        file_target = os.path.join(project_path, remaining_path)

        if remaining_path and not os.path.exists(file_target):
            nested_dir = os.path.join(project_path, folder_name)
            if os.path.exists(nested_dir):
                file_target = os.path.join(nested_dir, remaining_path)

        d4m_branding_injection = '''
    <link rel="icon" type="image/png" sizes="96x96" href="/src/favicon/d4m-dev/favicon-96x96.png">
</head>'''

        # LUỒNG 1: Trả về file tĩnh
        if remaining_path and os.path.isfile(file_target) and not file_target.endswith('.py'):
            if file_target.endswith('.html'):
                with open(file_target, 'r', encoding='utf-8') as f:
                    html_content = f.read()
                html_content = html_content.replace("</head>", d4m_branding_injection) if "</head>" in html_content else html_content
                response = HTMLResponse(content=html_content, status_code=200)
                return await response(scope, receive, send)
            else:
                response = FileResponse(file_target)
                return await response(scope, receive, send)

        # LUỒNG 2: Xử lý index.html gốc
        index_html = os.path.join(project_path, 'index.html')
        if not os.path.exists(index_html):
            nested_index = os.path.join(project_path, folder_name, 'index.html')
            if os.path.exists(nested_index): index_html = nested_index

        if not remaining_path or remaining_path == 'index.html':
            if os.path.exists(index_html):
                with open(index_html, 'r', encoding='utf-8') as f:
                    html_content = f.read()
                html_content = html_content.replace("</head>", d4m_branding_injection) if "</head>" in html_content else html_content
                response = HTMLResponse(content=html_content, status_code=200)
                return await response(scope, receive, send)

        # LUỒNG 3: WSGI
        index_py_public = os.path.join(project_path, 'public', 'index.py')
        index_py = os.path.join(project_path, 'index.py')
        target_py = index_py_public if os.path.exists(index_py_public) else (index_py if os.path.exists(index_py) else None)

        if target_py and WSGIMiddleware:
            try:
                asgi_app = self.get_or_load_wsgi_app(target_py)
                if asgi_app:
                    scope["root_path"] = f"/projects/{folder_name}"
                    return await asgi_app(scope, receive, send)
            except Exception as e:
                print(f"Lỗi chạy WSGI: {e}")

        response = JSONResponse(status_code=404, content={"status": "error", "message": f"❌ Không tìm thấy: {path}"})
        return await response(scope, receive, send)

    def get_or_load_wsgi_app(self, file_path):
        if not WSGIMiddleware: return None
        cache_key = os.path.abspath(file_path)
        if cache_key in _flask_app_cache: return _flask_app_cache[cache_key]
        try:
            module_name = f"hosted_app_{os.path.basename(os.path.dirname(file_path))}"
            spec = importlib.util.spec_from_file_location(module_name, file_path)
            if not spec or not spec.loader: return None
            module = importlib.util.module_from_spec(spec)
            sys.modules[module_name] = module
            old_cwd = os.getcwd()
            old_sys_path = sys.path.copy()
            try:
                script_dir = os.path.dirname(os.path.abspath(file_path))
                os.chdir(script_dir)
                if script_dir not in sys.path: sys.path.insert(0, script_dir)
                spec.loader.exec_module(module)
                flask_app = getattr(module, 'app', getattr(module, 'application', None))
                if flask_app:
                    asgi_app = WSGIMiddleware(flask_app)
                    _flask_app_cache[cache_key] = asgi_app
                    return asgi_app
            finally:
                os.chdir(old_cwd)
                sys.path = old_sys_path
        except Exception as e: print(f"❌ Lỗi WSGI: {e}")
        return None