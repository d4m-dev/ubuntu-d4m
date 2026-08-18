# -*- coding: utf-8 -*-
from core import urls as U
# Tên file: /ubuntu-backend/api/ai_admin.py
import jwt
import logging
from fastapi import APIRouter, Depends, HTTPException, Header

from core.security import verify_token, get_current_active_user
from core.config import settings
from schemas.ai_schemas import ChatRequest, ManualScheduleRequest
from services import scheduler, ai_engine

router = APIRouter(
    prefix=U.AI_ADMIN["PREFIX"],
    tags=["AI Admin"],
    dependencies=[Depends(verify_token)] 
)

def get_user_id_from_token(authorization: str) -> int:
    try:
        if not authorization: return 1
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return payload.get("user_id") or payload.get("id") or 1 
    except Exception:
        return 1

def require_active(authorization: str):
    """Bắt buộc user active=1 mới dùng được J.A.R.V.I.S."""
    return get_current_active_user(authorization)

@router.get("/schedules")
async def get_schedules(month: int, year: int, authorization: str = Header(None)):
    try:
        data = scheduler.get_monthly_schedules(month, year)
        return {"status": "success", "data": data}
    except Exception as e:
        logging.error(f"Lỗi GET Schedules: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/schedule")
async def save_manual_schedule(req: ManualScheduleRequest, authorization: str = Header(None)):
    user_id = get_user_id_from_token(authorization)
    try:
        return scheduler.save_manual_schedule(user_id, req.date, req.shift_name)
    except Exception as e:
        logging.error(f"Lỗi POST Schedule: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat")
async def ai_admin_chat(request: ChatRequest, authorization: str = Header(None)):
    # Chỉ user active = 1 mới dùng được J.A.R.V.I.S
    get_current_active_user(authorization)
    user_id = get_user_id_from_token(authorization)
    try:
        return ai_engine.process_ai_chat(user_id, request.message)
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        logging.error(f"Lỗi POST AI Chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))