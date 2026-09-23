# -*- coding: utf-8 -*-
"""Test suite Spirit v2 (7 slot) — chạy: python3 tests/test_spirit_suite.py"""
import os, sys, json
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("ADMIN_PASSWORD", "admin123")
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO_DIR = os.path.dirname(BACKEND_DIR)
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)
import sqlglot

print("=" * 60); print("TEST 1: SQL files parse (mysql dialect)")
for f in ["database/spirit_items.sql", "database/schema_full.sql"]:
    stmts = [s for s in sqlglot.parse(open(os.path.join(REPO_DIR, f)).read(), read="mysql") if s]
    print(f"   ✅ {f}: {len(stmts)} statements")

print("=" * 60); print("TEST 2: db_schema queries parse")
from core.db_schema import get_d4m_schema_queries
qs = get_d4m_schema_queries()
for i, q in enumerate(qs):
    sqlglot.parse(q, read="mysql")
print(f"   ✅ {len(qs)} schema queries OK")

print("=" * 60); print("TEST 3: assets_manifest.json v2 hợp lệ")
m = json.load(open(os.path.join(BACKEND_DIR, "assets_manifest.json"), encoding="utf-8"))
data = m["data"]
assert m["status"] == "success" and m["version"] == 2
ids = [i["id"] for i in data]
assert len(ids) == len(set(ids)), "TRÙNG ID trong manifest!"
assert all(i["image"].startswith("/assets/") for i in data), "image phải bắt đầu /assets/"
equip = [i for i in data if i["equippable"]]
assert len(equip) > 900, f"item equip quá ít: {len(equip)}"
from collections import Counter
print("   ✅ manifest:", len(data), "items |", len(equip), "equip |",
      dict(Counter(i["kind"] for i in equip)))
for kind in ("frame", "pet", "treasure", "dharma", "title", "ring", "sect"):
    n = sum(1 for i in equip if i["kind"] == kind)
    assert n > 0, f"thiếu kind {kind}"
print("   ✅ đủ 7 kind equip")

print("=" * 60); print("TEST 4: spirit_payload 7 slot")
from services.spirit_service import spirit_payload, EQUIP_SLOTS, SLOT_FIELDS
assert len(EQUIP_SLOTS) == 7 and len(SLOT_FIELDS) == 7
row = {"equipped_frame": "khung-x", "frame_image": "/assets/khung/x.png",
       "frame_name": "Khung X", "frame_rarity": "rare"}
for s in SLOT_FIELDS[1:]:
    row[EQUIP_SLOTS[s]] = None
    for f in ("image", "name", "rarity"):
        row[f"{s}_{f}"] = None
p = spirit_payload(row)
assert p["frame"]["id"] == "khung-x" and p["frame"]["rarity_label"] == "Hiếm"
assert all(p[s] is None for s in SLOT_FIELDS[1:])
print("   ✅ spirit_payload 7 slot OK")

print("=" * 60); print("TEST 5: E2E router v2 (fake DB)")
CAT = {i["id"]: dict(i) for i in equip}
first_pet = next(i for i in equip if i["kind"] == "pet")
first_treasure = next(i for i in equip if i["kind"] == "treasure")
first_frame = next(i for i in equip if i["kind"] == "frame")
expensive = max(equip, key=lambda i: i["price_xu"])

state = {
    "owned": {(1, first_pet["id"]), (1, first_treasure["id"]), (1, first_frame["id"])},
    "xu": {1: 100000},
    "users": {1: {c: None for c in EQUIP_SLOTS.values()}},
}
EQUIP_COLS = list(EQUIP_SLOTS.values())

def fake_select(sql, params=None):
    s = " ".join(sql.split()).lower()
    if "from spirit_items where id=" in s:
        return [dict(CAT[params[0]])] if params[0] in CAT else []
    if "from spirit_items order by" in s:
        return [dict(i) for i in CAT.values()]
    if "user_spirit_items where user_id=%s and item_id=%s" in s.replace("=", "="):
        return [{"item_id": params[1]}] if (params[0], params[1]) in state["owned"] else []
    if "select item_id from user_spirit_items" in s:
        return [{"item_id": i} for (u, i) in state["owned"] if u == params[0]]
    if "from user_spirit_items usi" in s:
        out = []
        for (u, iid) in state["owned"]:
            if u == params[0] and iid in CAT:
                it = dict(CAT[iid]); it["acquired_at"] = None; out.append(it)
        return out
    if "select xu from players" in s:
        return [{"xu": state["xu"].get(params[0], 0)}]
    if "from users where id=" in s:
        return [dict(state["users"].get(params[0], {}))]
    return []

def fake_insert(sql, params=None):
    s = " ".join(sql.split()).lower()
    if "into user_spirit_items" in s:
        state["owned"].add((params[0], params[1])); return 1
    if "into players" in s:
        state["xu"].setdefault(params[0], 0); return 1
    return 1

def fake_update(sql, params=None):
    s = " ".join(sql.split()).lower()
    if "set xu = xu -" in s:
        price, uid = params[0], params[1]
        if state["xu"].get(uid, 0) >= price:
            state["xu"][uid] -= price; return 1
        return 0
    uid = params[-1]
    for col in EQUIP_COLS:
        if f"set {col}=" in s:
            state["users"].setdefault(uid, {})
            state["users"][uid][col] = None if "null" in s else params[0]
            return 1
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
assert r["status"] == "success" and len(r["data"]) == len(equip)
assert set(r["equipped"].keys()) == set(EQUIP_SLOTS.keys())
print(f"   ✅ catalog {len(r['data'])} items, equipped map 7 slot")

r = c.get("/api/social/spirits/me").json()
assert r["data"]["xu"] == 100000 and len(r["data"]["items"]) == 3
assert r["data"]["equipped"]["pet"] is None
print("   ✅ /me OK")

r = c.post("/api/social/spirits/equip", json={"item_id": first_pet["id"]})
assert r.json()["status"] == "success" and r.json()["kind"] == "pet"
r = c.post("/api/social/spirits/equip", json={"item_id": first_frame["id"]})
assert r.json()["status"] == "success" and r.json()["kind"] == "frame"
r = c.get("/api/social/spirits/me").json()
assert r["data"]["equipped"]["pet"] == first_pet["id"]
assert r["data"]["equipped"]["frame"] == first_frame["id"]
print("   ✅ equip pet + frame OK")

r = c.post("/api/social/spirits/unequip", json={"kind": "frame"})
assert r.json()["status"] == "success"
r = c.post("/api/social/spirits/unequip", json={"kind": "sai-loai"})
assert r.status_code == 400
print("   ✅ unequip OK + chặn kind sai")

r = c.post("/api/social/spirits/buy", json={"item_id": expensive["id"]})
assert r.status_code == 400 and "Không đủ Xu" in r.json()["detail"], r.text
cheap = min((i for i in equip if i["id"] not in {first_pet["id"], first_treasure["id"]}),
            key=lambda i: i["price_xu"])
state["xu"][1] = cheap["price_xu"] + 10
r = c.post("/api/social/spirits/buy", json={"item_id": cheap["id"]})
assert r.json()["status"] == "success" and r.json()["xu"] == 10
print(f"   ✅ buy OK (trừ đúng {cheap['price_xu']:,} Xu), chặn mua khi thiếu Xu")

print("\n🎉 ALL TESTS PASSED (Spirit v2 — 7 slot)")
