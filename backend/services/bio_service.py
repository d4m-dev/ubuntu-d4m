# -*- coding: utf-8 -*-
# Tên file: ubuntu-backend/services/bio_service.py
from fastapi import HTTPException
from core.database import db_inserter
from schemas.bio_schemas import NumerologyRequest

def calculate_life_path_pytago(dob_str: str) -> int:
    try:
        d, m, y = dob_str.split('/')
        total_sum = sum(int(digit) for digit in d + m + y if digit.isdigit())
        while total_sum > 9 and total_sum not in (11, 22, 33):
            total_sum = sum(int(digit) for digit in str(total_sum))
        return total_sum
    except Exception:
        raise HTTPException(status_code=400, detail="Định dạng ngày sinh không hợp lệ. Vui lòng dùng DD/MM/YYYY.")

def get_numerology_analysis_dict(life_path: int) -> dict:
    analysis_db = {
        2: {"title": "Người Hòa Giải", "desc": "Trực giác cực kỳ nhạy bén, sinh ra để kết nối và thấu hiểu người khác."},
        3: {"title": "Người Truyền Cảm Hứng", "desc": "Sáng tạo, hoạt ngôn, mang lại năng lượng tích cực cho mọi người."},
        4: {"title": "Người Xây Dựng", "desc": "Thực tế, logic, có kỷ luật cao và vô cùng đáng tin cậy."},
        5: {"title": "Người Phiêu Lưu", "desc": "Yêu tự do, thích nghi nhanh, luôn tìm kiếm sự đổi mới."},
        6: {"title": "Người Chăm Sóc", "desc": "Trách nhiệm, yêu thương gia đình, giàu lòng nhân ái."},
        7: {"title": "Nhà Triết Học", "desc": "Sâu sắc, thích phân tích, tìm kiếm chân lý và sự thật."},
        8: {"title": "Nhà Điều Hành", "desc": "Độc lập, có tư duy kinh doanh và khả năng quản lý tài chính xuất sắc."},
        9: {"title": "Người Nhân Đạo", "desc": "Bao dung, lý tưởng hóa, luôn muốn cống hiến cho cộng đồng."},
        11: {"title": "Người Mơ Mộng Thực Tế (Master)", "desc": "Tiềm năng tâm linh mạnh mẽ, trực giác phi thường."},
        22: {"title": "Bậc Thầy Kiến Tạo (Master)", "desc": "Biến ước mơ lớn thành hiện thực, tầm nhìn vĩ mô."},
        33: {"title": "Bậc Thầy Chữa Lành (Master)", "desc": "Tình yêu thương vô điều kiện, sức ảnh hưởng sâu rộng."}
    }
    return analysis_db.get(life_path, {"title": "Người Tiên Phong", "desc": "Độc lập, tự tin, mang tố chất của một nhà lãnh đạo bẩm sinh."})

def process_numerology(data: NumerologyRequest) -> dict:
    lp_num = calculate_life_path_pytago(data.birth_date)
    traits = get_numerology_analysis_dict(lp_num)
    return {
        "status": "success",
        "data": {
            "requested_name": data.full_name,
            "dob": data.birth_date,
            "life_path_number": lp_num,
            "traits": traits
        }
    }

def record_bio_tracking_safe(link_id: str, platform: str, ip_address: str, user_agent: str):
    """🚀 Thay thế Raw Cursor bằng DAO chuẩn mực an toàn"""
    sql = "INSERT INTO bio_tracking (link_id, platform, ip_address, user_agent) VALUES (%s, %s, %s, %s)"
    try:
        db_inserter.insert(sql, (link_id, platform, ip_address, user_agent))
    except Exception as e:
        print(f"Lỗi lưu tracking ngầm: {e}")

def get_bio_config_data(username: str) -> dict:
    return {
        "status": "success",
        "config": {
            "profile_name": "@" + username,
            "avatar_url": f"https://api.dicebear.com/7.x/adventurer/svg?seed={username}",
            "theme": {
                "background_gradient": "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
                "button_style": "glassmorphism"
            },
            "links": [
                {"id": "fb_profile", "title": "Kết nối Facebook", "url": "https://facebook.com/...", "icon": "facebook"},
                {"id": "github_repo", "title": "Dự án trên GitHub", "url": "https://github.com/...", "icon": "github"}
            ]
        }
    }