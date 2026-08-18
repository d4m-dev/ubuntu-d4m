# -*- coding: utf-8 -*-
# Tên file: ubuntu-backend/schemas/astrology_schemas.py
from pydantic import BaseModel

class MatchRequest(BaseModel):
    name_1: str
    dob_1: str  # Format: YYYY-MM-DD
    name_2: str
    dob_2: str