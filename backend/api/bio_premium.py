# -*- coding: utf-8 -*-
from core import urls as U
# Tên file: ubuntu-backend/api/bio_premium.py
from fastapi import APIRouter, Request
from schemas.bio_schemas import NumerologyRequest, TrackRequest
from services.bio_service import (
    process_numerology, record_bio_tracking_safe, get_bio_config_data
)

router = APIRouter(
    prefix=U.BIO["PREFIX"],
    tags=["Link-in-Bio Premium"]
)

@router.post("/calculate")
async def calculate_numerology_route(data: NumerologyRequest):
    return process_numerology(data)

@router.post("/track")
async def track_click_route(data: TrackRequest, request: Request):
    ip_address = request.client.host
    user_agent = request.headers.get('user-agent', 'Unknown')
    record_bio_tracking_safe(data.link_id, data.platform, ip_address, user_agent)
    return {"status": "success", "message": "Click recorded invisibly"}

@router.get("/config/{username}")
async def get_dynamic_config_route(username: str):
    return get_bio_config_data(username)