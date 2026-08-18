# -*- coding: utf-8 -*-
# Tên file: ubuntu-backend/schemas/bio_schemas.py
from pydantic import BaseModel

class NumerologyRequest(BaseModel):
    full_name: str
    birth_date: str  # Định dạng bắt buộc: DD/MM/YYYY

class TrackRequest(BaseModel):
    link_id: str     # Ví dụ: "fb_profile", "github_repo"
    platform: str    # Ví dụ: "Facebook", "GitHub"