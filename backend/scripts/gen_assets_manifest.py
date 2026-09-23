"""Sinh manifest tài sản v2 từ danh sách file backend/assets (git ls-tree).

Chạy: python3 scripts/gen_assets_manifest.py /tmp/all_assets.txt
Ghi:  backend/assets_manifest.json
"""
import hashlib, json, os, re, sys
from datetime import datetime, timezone

IMG_EXT = {".png", ".gif", ".webp", ".jpg", ".jpeg"}

# category -> (kind, equippable, label tiếng Việt)
CATEGORIES = {
    "khung":      ("frame",    True,  "Khung viền"),
    "linh-thu":   ("pet",      True,  "Linh thú"),
    "linh-bao":   ("treasure", True,  "Linh bảo"),
    "danh-hieu":  ("title",    True,  "Danh hiệu"),
    "nhan":       ("ring",     True,  "Nhẫn"),
    "phap-tuong": ("dharma",   True,  "Pháp tướng"),
    "tong-mon":   ("sect",     True,  "Tông môn"),
    "tu-vi":      ("resource", False, "Tử vi"),
    "luyen-dan":  ("resource", False, "Luyện đan"),
    "ngu-hanh":   ("resource", False, "Ngũ hành"),
    "tai-nguyen": ("resource", False, "Tài nguyên"),
    "he-thong":   ("resource", False, "Hệ thống"),
    "background": ("resource", False, "Background"),
}

RARITY_PRICE = {"common": 20000, "rare": 60000, "epic": 180000, "legendary": 500000}
ZORDER = {"frame": 3, "pet": 4, "treasure": 1, "dharma": 2, "title": 0, "ring": 0, "sect": 0, "resource": 0}


def rarity_of(seed: str) -> str:
    """Phân bổ độ hiếm tất định theo hash: 62/20/13/5 %."""
    h = int(hashlib.sha1(seed.encode("utf-8")).hexdigest(), 16) % 100
    if h < 62:
        return "common"
    if h < 82:
        return "rare"
    if h < 95:
        return "epic"
    return "legendary"


def prettify(slug: str) -> str:
    return " ".join(w.capitalize() for w in slug.split("-") if w)


def slugify(fname: str, category: str) -> str:
    slug = os.path.splitext(fname)[0]
    if category == "tong-mon":
        slug = re.sub(r"-[0-9a-f]{8}$", "", slug)  # bỏ hash đuôi
    slug = re.sub(r"[^a-z0-9\-]+", "-", slug.lower()).strip("-")
    return slug or "item"


def main():
    listing = sys.argv[1] if len(sys.argv) > 1 else "/tmp/all_assets.txt"
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    lines = [ln.strip() for ln in open(listing, encoding="utf-8") if ln.strip()]

    data, seen_ids, stats = [], set(), {}
    for rel in sorted(lines):
        parts = rel.split("/", 1)
        if len(parts) < 2:
            continue
        category, sub = parts[0], parts[1]
        if category not in CATEGORIES:
            continue
        ext = os.path.splitext(sub)[1].lower()
        if ext not in IMG_EXT:
            continue  # bỏ qua font/css/json
        kind, equippable, label = CATEGORIES[category]
        fname = os.path.basename(sub)
        slug = slugify(fname, category)
        item_id = f"{category}-{slug}"
        if item_id in seen_ids:  # trùng (file khác đuôi) → kèm số
            n = 2
            while f"{item_id}-{n}" in seen_ids:
                n += 1
            item_id = f"{item_id}-{n}"
        seen_ids.add(item_id)

        rarity = rarity_of(item_id) if equippable else "common"
        data.append({
            "id": item_id,
            "kind": kind,
            "category": category,
            "name": prettify(slug) if category != "tong-mon" else f"Tông Môn {slug}",
            "image": f"/assets/{category}/{sub}",
            "rarity": rarity,
            "price_xu": RARITY_PRICE[rarity] if equippable else 0,
            "zorder": ZORDER[kind],
            "equippable": equippable,
        })
        stats.setdefault(category, {"count": 0, "rarity": {}})
        stats[category]["count"] += 1
        stats[category]["rarity"][rarity] = stats[category]["rarity"].get(rarity, 0) + 1

    manifest = {
        "status": "success",
        "version": 2,
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "base_url": "/assets",
        "categories": {c: {"kind": k, "equippable": e, "label": lb,
                           "count": stats.get(c, {}).get("count", 0)}
                       for c, (k, e, lb) in CATEGORIES.items()},
        "data": data,
    }
    out = os.path.join(base, "assets_manifest.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)

    print(f"✅ {len(data)} items → {out}")
    for c, s in stats.items():
        eq = CATEGORIES[c][1]
        print(f"  {c:12s} {s['count']:4d} {'[EQUIP]' if eq else '[UI]   '} {s['rarity'] if eq else ''}")


if __name__ == "__main__":
    main()
