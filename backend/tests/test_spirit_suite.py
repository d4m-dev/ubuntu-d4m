# -*- coding: utf-8 -*-
"""Test suite tạm cho Linh thú/Linh bảo — chạy: python3 test_spirit_suite.py (xoá sau khi đạt)"""
import os, sys, json
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("ADMIN_PASSWORD", "admin123")
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO_DIR = os.path.dirname(BACKEND_DIR)
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)
import sqlglot

print("=" * 60); print("TEST 1: SQL files parse (mysql dialect)")
for f in ["../database/spirit_items.sql", "../database/schema_full.sql"]:
    stmts = [s for s in sqlglot.parse(open(os.path.join(REPO_DIR, f.lstrip("../"))).read(), read="mysql") if s]
    print(f"   ✅ {f}: {len(stmts)} statements")

print("=" * 60); print("TEST 2: db_schema queries parse")
from core.db_schema import get_d4m_schema_queries
qs = get_d4m_schema_queries()
for i, q in enumerate(qs):
    sqlglot.parse(q, read="mysql")
print(f"   ✅ {len(qs)} schema queries OK")

print("=" * 60); print("TEST 3: manifest JSON hợp lệ")
sp = json.load(open(os.path.join(BACKEND_DIR, "assets/spirit_items.json")))["data"]
fr = json.load(open(os.path.join(BACKEND_DIR, "assets/avatar_frames.json")))["data"]
assert len(sp) == 165 and all(i["image"].startswith("/linhbao/") for i in sp)
assert len(fr) == 429
from collections import Counter
print("   ✅ spirit_items.json:", len(sp), dict(Counter(i["kind"] for i in sp)))
print("   ✅ avatar_frames.json:", len(fr), dict(Counter(i["rarity"] for i in fr)))
# mọi image phải tồn tại trên đĩa
missing = [i["image"] for i in sp if not os.path.exists(os.path.join(BACKEND_DIR, "assets/linhbao", i["image"].split("/")[-1]))]
assert not missing, missing
print("   ✅ 165/165 ảnh linhbao khớp manifest")

print("=" * 60); print("TEST 4: spirit_payload + E2E router")
from services.spirit_service import spirit_payload, sync_catalog_from_manifest
row = {"equipped_pet": "tieu-bach-cuu", "pet_image": "/linhbao/tieu-bach-cuu.gif",
       "pet_name": "Tieu Bach Cuu", "pet_rarity": "common",
       "equipped_treasure": None, "treasure_image": None, "treasure_name": None, "treasure_rarity": None}
p = spirit_payload(row)
assert p["pet"]["id"] == "tieu-bach-cuu" and p["treasure"] is None
print("   ✅ spirit_payload OK")

# fake DB cho e2e
CAT = {(i["id"]): dict(i) for i in sp}
state = {"owned": {("1", "tieu-bach-cuu"), ("1", "ban-co")}, "xu": {"1": 100000},
         "users": {"1": {"equipped_pet": None, "equipped_treasure": None}}}
def fake_select(sql, params=None):
    s = " ".join(sql.split()).lower()
    if "from spirit_items where id=" in s:
        return [dict(CAT[params[0]])] if params[0] in CAT else []
    if "from spirit_items order by" in s: return [dict(i) for i in CAT.values()]
    if "and item_id=" in s and "user_spirit_items" in s:
        return [{"item_id": params[1]}] if (str(params[0]), params[1]) in state["owned"] else []
    if "select item_id from user_spirit_items" in s:
        return [{"item_id": i} for (u, i) in state["owned"] if u == str(params[0])]
    if "from user_spirit_items usi" in s:
        out = []
        for (u, i) in state["owned"]:
            if u == str(params[0]):
                it = dict(CAT[i]); it["acquired_at"] = None; out.append(it)
        return out
    if "select xu from players" in s: return [{"xu": state["xu"].get(str(params[0]), 0)}]
    if "equipped_pet" in s and "from users" in s: return [dict(state["users"].get(str(params[0]), {}))]
    return []
def fake_insert(sql, params=None):
    s = " ".join(sql.split()).lower()
    if "into user_spirit_items" in s: state["owned"].add((str(params[0]), params[1])); return 1
    if "into players" in s: state["xu"].setdefault(str(params[0]), 0); return 1
    return 1
def fake_update(sql, params=None):
    s = " ".join(sql.split()).lower()
    if "set xu = xu -" in s:
        price, uid = params[0], str(params[1])
        if state["xu"].get(uid, 0) >= price:
            state["xu"][uid] -= price; return 1
        return 0
    uid = str(params[-1])
    if "equipped_pet" in s: state["users"].setdefault(uid, {})["equipped_pet"] = None if "null" in s else params[0]
    else: state["users"].setdefault(uid, {})["equipped_treasure"] = None if "null" in s else params[0]
    return 1

import api.spirit as spirit
spirit.db_executor = type("E", (), {"select_as_list_dict": staticmethod(fake_select)})()
spirit.db_inserter = type("I", (), {"insert": staticmethod(fake_insert)})()
spirit.db_updater = type("U", (), {"update": staticmethod(fake_update)})()
from fastapi import FastAPI
from fastapi.testclient import TestClient
app = FastAPI(); app.include_router(spirit.router)
app.dependency_overrides[spirit.get_current_user] = lambda: {"user_id": 1, "username": "tester"}
c = TestClient(app)

r = c.get("/api/social/spirits/catalog").json()
assert r["status"] == "success" and len(r["data"]) == 165
pets = [i for i in r["data"] if i["kind"] == "pet"]
print(f"   ✅ catalog 165 items ({len(pets)} pet / {165-len(pets)} treasure)")

r = c.get("/api/social/spirits/me").json()
assert r["data"]["xu"] == 100000 and len(r["data"]["items"]) == 2
print("   ✅ /me OK")

r = c.post("/api/social/spirits/equip", json={"item_id": "tieu-bach-cuu"})
assert r.json()["status"] == "success"
r = c.post("/api/social/spirits/equip", json={"item_id": "ban-co"})
assert r.json()["status"] == "success"
r = c.post("/api/social/spirits/buy", json={"item_id": "nghich-thien-huyen-long"})  # legendary 500k > 100k
assert r.status_code == 400 and "Không đủ Xu" in r.json()["detail"]
print("   ✅ equip OK, buy thiếu Xu bị chặn")
print("\n🎉 ALL TESTS PASSED")
