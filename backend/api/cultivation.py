# -*- coding: utf-8 -*-
"""
============================================================
🧘 D4M TU TIÊN — CẢNH GIỚI · ĐẢ TỌA · ĐỘT PHÁ · LINH CĂN · ĐAN DƯỢC
============================================================
- GET  /api/tu-tien/            : toàn trạng (50 realms + trạng thái đạo hữu)
- POST /api/tu-tien/meditate    : đả tọa (+200 tu vi, cooldown 60 phút)
- POST /api/tu-tien/breakthrough: đột phá cảnh giới
- POST /api/tu-tien/root        : chọn linh căn ngũ hành (1 lần)
- POST /api/tu-tien/use-pill    : tiêu hao đan dược → tu vi
============================================================
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core import urls as U
from services import cultivation_service as CS
from api.social import get_current_user

router = APIRouter(prefix=U.CULTIVATION["PREFIX"], tags=["Tu Tiên — Cảnh Giới"])


class RootRequest(BaseModel):
    root: str


class PillRequest(BaseModel):
    item_id: str


@router.get(U.CULTIVATION["STATE"])
def get_state(current_user: dict = Depends(get_current_user)):
    uid = current_user.get("user_id")
    st = CS.get_user_state(uid)
    realms = CS.get_realms()
    cur = CS.realm_of(st["realm_index"])
    nxt = realms[st["realm_index"] + 1] if st["realm_index"] + 1 < len(realms) else None
    progress = None
    if nxt:
        base = cur.get("required_exp", 0)
        span = max(1, nxt["required_exp"] - base)
        progress = max(0.0, min(1.0, (st["cultivation"] - base) / span))
    return {
        "status": "success",
        "data": {
            "realms": realms,
            "roots": CS.ROOTS,
            "user": {
                **{k: (v.isoformat() if hasattr(v, "isoformat") else v) for k, v in st.items()},
                "realm": cur,
                "next": nxt,
                "progress": progress,
                "meditate_exp": CS.MEDITATE_EXP,
                "cooldown_min": CS.MEDITATE_COOLDOWN_MIN,
            },
        },
    }


@router.post(U.CULTIVATION["MEDITATE"])
def meditate(current_user: dict = Depends(get_current_user)):
    uid = current_user.get("user_id")
    ok, msg = CS.meditate(uid)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"status": "success", "message": msg,
            "cultivation": CS.get_user_state(uid)["cultivation"]}


@router.post(U.CULTIVATION["BREAKTHROUGH"])
def breakthrough(current_user: dict = Depends(get_current_user)):
    uid = current_user.get("user_id")
    ok, msg = CS.try_breakthrough(uid)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"status": "success", "message": msg,
            "realm_index": CS.get_user_state(uid)["realm_index"]}


@router.post(U.CULTIVATION["ROOT"])
def choose_root(body: RootRequest, current_user: dict = Depends(get_current_user)):
    uid = current_user.get("user_id")
    ok, msg = CS.choose_root(uid, body.root)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"status": "success", "message": msg}


@router.post(U.CULTIVATION["USE_PILL"])
def use_pill(body: PillRequest, current_user: dict = Depends(get_current_user)):
    uid = current_user.get("user_id")
    ok, msg = CS.use_pill(uid, body.item_id)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"status": "success", "message": msg,
            "cultivation": CS.get_user_state(uid)["cultivation"]}
