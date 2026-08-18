# -*- coding: utf-8 -*-
# Tên file: ubuntu-backend/schemas/ai_schemas.py
from pydantic import BaseModel, Field

class ChatRequest(BaseModel):
    message: str = Field(..., max_length=1000)

class ManualScheduleRequest(BaseModel):
    date: str 
    shift_name: str
