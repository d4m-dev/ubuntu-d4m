# -*- coding: utf-8 -*-
from core import urls as U
import os
import io
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Header
from typing import Optional
from PIL import Image
from google import genai
import jwt
from core.config import settings

router = APIRouter(prefix=U.AUTOCODE["PREFIX"], tags=["AutoCode AI Promax"])

# ==========================================
# 🛡️ BẢO MẬT: CHỈ ADMIN MỚI ĐƯỢC XÀI CHÙA API KEY
# ==========================================
def verify_admin(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Thiếu thẻ định danh. Vui lòng đăng nhập hệ sinh thái.")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        if payload.get("role") != 1:
            raise HTTPException(status_code=403, detail="Chỉ có Tư Lệnh (Admin) mới được phép dùng AI AutoCode!")
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Token không hợp lệ hoặc đã hết hạn")

def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Không tìm thấy GEMINI_API_KEY trong file .env!")
    return genai.Client(api_key=api_key)

# ==========================================
# 🚀 ENDPOINTS
# ==========================================
@router.get("/models")
def get_models(admin: dict = Depends(verify_admin)):
    """Lấy danh sách các models được hỗ trợ bởi API key hiện tại."""
    client = get_gemini_client()
    try:
        models_list = []
        for m in client.models.list():
            if 'gemini' in m.name.lower():
                models_list.append({
                    "name": m.name,
                    "display": getattr(m, 'display_name', m.name)
                })
        # Ưu tiên gemini-1.5-flash lên đầu
        models_list.sort(key=lambda x: 'flash' in x['name'].lower(), reverse=True)
        return {"models": models_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate")
async def generate_code(
    image: UploadFile = File(...),
    model: str = Form("models/gemini-1.5-flash"),
    prompt: Optional[str] = Form(""),
    admin: dict = Depends(verify_admin)
):
    """Nhận hình ảnh, gọi Gemini API và trả về mã nguồn"""
    client = get_gemini_client()
    
    if not image.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File tải lên không phải là hình ảnh hợp lệ")

    try:
        # Đọc file Async tốc độ cao
        image_bytes = await image.read()
        img = Image.open(io.BytesIO(image_bytes))

        base_prompt = """
        Bạn là một Chuyên gia Lập trình Front-end xuất sắc (Senior Front-end Developer).
        Nhiệm vụ của bạn là chuyển đổi thiết kế giao diện UI trong bức ảnh này thành mã nguồn thực tế.
        YÊU CẦU NGHIÊM NGẶT:
        1. Viết tất cả vào MỘT file HTML duy nhất (bao gồm cả <style> và <script>).
        2. Mã nguồn phải có cấu trúc tốt, semantic HTML.
        3. Phải Responsive (hiển thị tốt trên cả Mobile và Desktop).
        4. Sử dụng Tailwind CSS qua CDN (<script src="https://cdn.tailwindcss.com"></script>).
        5. Tái tạo màu sắc, font chữ, khoảng cách (margin/padding) giống hệt ảnh nhất có thể.
        6. KHÔNG giải thích, KHÔNG viết thêm bất kỳ văn bản nào ngoài mã nguồn. 
        7. Trả về định dạng code block chuẩn.
        """
        
        final_prompt = base_prompt
        if prompt:
            final_prompt += f"\n\nYÊU CẦU BỔ SUNG TỪ NGƯỜI DÙNG:\n{prompt}"

        # Gọi API GenAI SDK mới
        response = client.models.generate_content(
            model=model,
            contents=[final_prompt, img]
        )
        
        # Bóc tách thông minh: Tự động loại bỏ mọi thẻ Markdown (```html, ```python, ```jsx,...)
        clean_code = response.text.strip()
        if clean_code.startswith("```"):
            clean_code = clean_code.split("\n", 1)[-1] # Cắt bỏ dòng thẻ mở đầu
        if clean_code.endswith("```"):
            clean_code = clean_code[:-3].strip() # Cắt bỏ 3 dấu ngáy ở cuối
        
        # Lưu Backup an toàn
        backup_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "database", "latest_generated_code.html")
        os.makedirs(os.path.dirname(backup_path), exist_ok=True)
        with open(backup_path, "w", encoding="utf-8") as f:
            f.write(clean_code)

        return {"success": True, "code": clean_code, "message": "Tạo code thành công!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi AI Core: {str(e)}")
