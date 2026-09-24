# -*- coding: utf-8 -*-
"""
🟢 PRESENCE API — online/offline + "Online X giờ trước" (Redis bitmap)
- GET  /api/social/presence/{user_id}   : trạng thái 1 user
- POST /api/social/presence             : batch {ids:[...]} cho danh sách DM
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List

from core import urls as U
from services import presence_service as PS
from api.social import get_current_user

router = APIRouter(prefix="/api/social/presence", tags=["Presence — Online"])


class BatchIds(BaseModel):
    ids: List[int]


@router.get("/ping")
def presence_ping(current_user: dict = Depends(get_current_user)):
    """Heartbeat: đánh dấu người gọi đang online + trả trạng thái của chính họ."""
    me = current_user.get("user_id")
    PS.ping(me)
    return {"status": "success", "data": PS.describe(me)}


@router.get("/{user_id}")
def get_presence(user_id: int, current_user: dict = Depends(get_current_user)):
    return {"status": "success", "data": PS.describe(user_id)}


@router.post("")
def batch_presence(body: BatchIds, current_user: dict = Depends(get_current_user)):
    return {"status": "success", "data": PS.describe_many(body.ids[:200])}
