# -*- coding: utf-8 -*-
# Tên file: ubuntu-backend/services/astrology_service.py
from datetime import datetime
from schemas.astrology_schemas import MatchRequest

def calc_life_path(dob_str: str) -> int:
    """Rút gọn ngày sinh thành Số Chủ Đạo (1-9)"""
    digits = [int(d) for d in dob_str if d.isdigit()]
    total = sum(digits)
    while total > 9 and total not in (11, 22, 33):
        total = sum(int(d) for d in str(total))
    return total

def calc_venus_element(month: int) -> str:
    """Nội suy nguyên tố sao Kim dựa trên tháng sinh"""
    elements = {
        1: "Đất", 2: "Khí", 3: "Nước", 4: "Lửa",
        5: "Đất", 6: "Khí", 7: "Nước", 8: "Lửa",
        9: "Đất", 10: "Khí", 11: "Nước", 12: "Lửa"
    }
    return elements.get(month, "Khí")

def process_compatibility_match(data: MatchRequest) -> dict:
    try:
        date1 = datetime.strptime(data.dob_1, "%Y-%m-%d")
        date2 = datetime.strptime(data.dob_2, "%Y-%m-%d")

        lp1 = calc_life_path(data.dob_1)
        lp2 = calc_life_path(data.dob_2)

        venus1 = calc_venus_element(date1.month)
        venus2 = calc_venus_element(date2.month)

        base_score = 60
        if (lp1 + lp2) % 2 == 0: base_score += 15
        else: base_score += 5

        if venus1 == venus2: base_score += 20
        elif (venus1 == "Đất" and venus2 == "Nước") or (venus1 == "Lửa" and venus2 == "Khí"): base_score += 15
        else: base_score += 8

        # Cap điểm ở mức 99% để tạo sự lãng mạn
        final_score = min(base_score, 99)

        return {
            "status": "success",
            "score": final_score,
            "person_1": {"life_path": lp1, "venus": venus1},
            "person_2": {"life_path": lp2, "venus": venus2},
            "message": f"Sự kết hợp giữa Năng lượng số {lp1} ({venus1}) và Số {lp2} ({venus2}) tạo ra độ tương hợp đạt {final_score}%."
        }
    except Exception:
        return {"status": "error", "message": "Vui lòng nhập ngày sinh chuẩn định dạng YYYY-MM-DD."}