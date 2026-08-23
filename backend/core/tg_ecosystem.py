# -*- coding: utf-8 -*-
"""
============================================================
🌌 D4M ECOSYSTEM COMMAND CENTER — Telegram siêu cấp
============================================================
- 📊 Dashboard hệ sinh thái (Social / Music / Donate)
- 💰 /qr <tiền>  : tạo QR PayOS/VietQR ngay trong chat, tự báo khi tiền về
- 👥 /users      : danh sách user + nút kích hoạt/khóa từng user
- 🐉 /grant <id> : tặng Linh thú / Linh bảo bằng phím inline
- 🪙 /xu <id> <so>: cộng Xu vào ví game
- 🎵 /top        : top 5 bài được nghe nhiều nhất
- 🔔 Alert realtime: tiền về, user mới đăng ký
- 📅 Báo cáo hệ sinh thái mỗi sáng 08:00
============================================================
"""
import asyncio
import base64
import logging
from datetime import datetime

from core.config import settings
from core.database import db_executor, db_updater, db_inserter
from core.tg_utils import send_telegram_message

logger = logging.getLogger("d4m_tg_eco")

# Bộ nhớ phiên tương tác (chat_id -> dữ liệu)
pending_grant = {}   # chat_id -> user_id đích


def _q(sql, params=None):
    try:
        return db_executor.select_as_list_dict(sql, params)
    except Exception as e:
        logger.warning(f"[ECO] query lỗi: {e}")
        return []


def _fmt(n):
    try:
        return f"{int(n):,}"
    except Exception:
        return "0"


# ==========================================================
# 📊 THỐNG KÊ HỆ SINH THÁI
# ==========================================================
def stats_social():
    u = _q("SELECT COUNT(*) AS c, SUM(active=1) AS a FROM users")
    p = _q("SELECT COUNT(*) AS c FROM posts")
    c = _q("SELECT COUNT(*) AS c FROM post_comments")
    u, p, c = (u[0] if u else {}), (p[0] if p else {}), (c[0] if c else {})
    return (
        f"👥 Người dùng: <b>{_fmt(u.get('c'))}</b> (kích hoạt: {_fmt(u.get('a'))})\n"
        f"📝 Bài viết: <b>{_fmt(p.get('c'))}</b> • 💬 Bình luận: <b>{_fmt(c.get('c'))}</b>"
    )


def stats_music():
    s = _q("SELECT COUNT(*) AS c, SUM(total_views) AS v, SUM(total_likes) AS l FROM songs")
    s = s[0] if s else {}
    return (
        f"🎵 Bài hát: <b>{_fmt(s.get('c'))}</b>\n"
        f"▶️ Lượt nghe: <b>{_fmt(s.get('v'))}</b> • ❤️ Likes: <b>{_fmt(s.get('l'))}</b>"
    )


def stats_donate():
    t = _q("SELECT SUM(amount) AS s, COUNT(*) AS c FROM donate_logs "
           "WHERE DATE(created_at) = CURDATE()")
    a = _q("SELECT SUM(amount) AS s, COUNT(*) AS c FROM donate_logs")
    t, a = (t[0] if t else {}), (a[0] if a else {})
    return (
        f"📅 Hôm nay: <b>{_fmt(t.get('s'))}đ</b> ({_fmt(t.get('c'))} giao dịch)\n"
        f"🏦 Tổng cộng: <b>{_fmt(a.get('s'))}đ</b> ({_fmt(a.get('c'))} giao dịch)"
    )


async def cmd_dash():
    kb = {"inline_keyboard": [
        [{"text": " Social", "callback_data": "eco_social"},
         {"text": "🎵 Music", "callback_data": "eco_music"},
         {"text": "💰 Donate", "callback_data": "eco_donate"}],
        [{"text": "🎵 Top tuần", "callback_data": "eco_top"},
         {"text": "👥 Users", "callback_data": "eco_users"}],
    ]}
    await send_telegram_message(
        "🌌 <b>HỆ SINH THÁI D4M — TỔNG QUAN</b>\n\n"
        f"{stats_social()}\n\n{stats_music()}\n\n{stats_donate()}",
        reply_markup=kb)


async def cb_dash(kind):
    if kind == "social":
        await send_telegram_message(f"👥 <b>SOCIAL HUB</b>\n{stats_social()}")
    elif kind == "music":
        await send_telegram_message(f"🎵 <b>D4M MUSIC</b>\n{stats_music()}")
    elif kind == "donate":
        await send_telegram_message(f"💰 <b>DONATE</b>\n{stats_donate()}")
    elif kind == "top":
        await cmd_top()


# ==========================================================
# 🎵 TOP 5 TUẦN
# ==========================================================
async def cmd_top():
    rows = _q("SELECT title, artist, total_views FROM songs ORDER BY total_views DESC LIMIT 5")
    if not rows:
        await send_telegram_message("🎵 Thư viện nhạc trống trơn sếp ơi!")
        return
    medal = ["🥇", "🥈", "", "4️⃣", "5️⃣"]
    lines = [f"{medal[i]} <b>{r['title']}</b> — {r['artist']} • {_fmt(r['total_views'])} lượt"
             for i, r in enumerate(rows)]
    await send_telegram_message("🏆 <b>TOP 5 BÀI ĐƯỢC NGHE NHIỀU NHẤT</b>\n\n" + "\n".join(lines))


# ==========================================================
# 👥 QUẢN LÝ USERS
# ==========================================================
async def cmd_users():
    rows = _q("SELECT id, username, active, created_at FROM users ORDER BY id DESC LIMIT 8")
    if not rows:
        await send_telegram_message("👥 Chưa có user nào trong DB.")
        return
    kb_rows, txt = [], ["👥 <b>8 USER GẦN NHẤT</b> (chạm để bật/tắt):"]
    for r in rows:
        st = "🟢" if r["active"] == 1 else "⛔"
        txt.append(f"{st} <code>{r['id']}</code> • {r['username']}")
        kb_rows.append([{"text": f"{'⛔ Khóa' if r['active'] == 1 else '🟢 Mở'} #{r['id']} {r['username'][:12]}",
                         "callback_data": f"user_act_{r['id']}"}])
    await send_telegram_message("\n".join(txt), reply_markup={"inline_keyboard": kb_rows})


async def cb_user_toggle(user_id):
    rows = _q("SELECT active, username FROM users WHERE id=%s", (user_id,))
    if not rows:
        await send_telegram_message(f"❌ Không tìm thấy user {user_id}.")
        return
    new = 0 if rows[0]["active"] == 1 else 1
    db_updater.update("UPDATE users SET active=%s WHERE id=%s", (new, user_id))
    await send_telegram_message(
        f"{'🟢 ĐÃ KÍCH HOẠT' if new else '⛔ ĐÃ KHÓA'} user <b>{rows[0]['username']}</b> (#{user_id})")
    await cmd_users()


# ==========================================================
# 🪙 CỘNG XU
# ==========================================================
async def cmd_xu(user_id, amount):
    db_inserter.insert("INSERT IGNORE INTO players (user_id, xu) VALUES (%s, 0)", (user_id,))
    db_updater.update("UPDATE players SET xu = xu + %s WHERE user_id=%s", (amount, user_id))
    rows = _q("SELECT xu FROM players WHERE user_id=%s", (user_id,))
    now = rows[0]["xu"] if rows else 0
    await send_telegram_message(
        f"🪙 Đã cộng <b>{_fmt(amount)} Xu</b> cho user #{user_id}.\nSố dư hiện tại: <b>{_fmt(now)} Xu</b>")


# ==========================================================
# 🐉 TẶNG LINH THÚ / LINH BẢO
# ==========================================================
async def cmd_grant(user_id):
    rows = _q("SELECT id FROM users WHERE id=%s", (user_id,))
    if not rows:
        await send_telegram_message(f"❌ User {user_id} không tồn tại.")
        return
    pending_grant[str(user_id)] = user_id
    kb = {"inline_keyboard": [[
        {"text": "🐉 Linh thú", "callback_data": "spirit_pg_pet_0"},
        {"text": "💎 Linh bảo", "callback_data": "spirit_pg_treasure_0"},
    ]]}
    await send_telegram_message(
        f"🐉💎 Tặng linh vật cho user <b>#{user_id}</b> — chọn loại:", reply_markup=kb)


async def cb_spirit_page(kind, page):
    target = None
    # user đích: lưu trong phiên gần nhất (grant flow)
    if pending_grant:
        target = list(pending_grant.values())[-1]
    if not target:
        await send_telegram_message("❌ Chưa chọn user. Dùng <code>/grant &lt;user_id&gt;</code> trước nhé.")
        return
    rows = _q("SELECT id, name, rarity, kind FROM spirit_items WHERE kind=%s "
              "ORDER BY zorder DESC, id ASC LIMIT 100", (kind,))
    if not rows:
        await send_telegram_message("📦 Kho linh vật trống.")
        return
    pages = [rows[i:i + 20] for i in range(0, len(rows), 20)]
    page = max(0, min(page, len(pages) - 1))
    kb, txt_rows = [], []
    for r in pages[page]:
        emo = "🐉" if r["kind"] == "pet" else "💎"
        kb.append([{"text": f"{emo} {r['name']} [{r['rarity']}]",
                    "callback_data": f"spirit_give_{r['id']}"}])
    nav = []
    if page > 0:
        nav.append({"text": "⬅️ Trang trước", "callback_data": f"spirit_pg_{kind}_{page-1}"})
    if page < len(pages) - 1:
        nav.append({"text": "➡️ Trang sau", "callback_data": f"spirit_pg_{kind}_{page+1}"})
    if nav:
        kb.append(nav)
    await send_telegram_message(
        f"🎁 Tặng <b>{'Linh thú' if kind == 'pet' else 'Linh bảo'}</b> cho user #{target} "
        f"(trang {page+1}/{len(pages)}):",
        reply_markup={"inline_keyboard": kb})


async def cb_spirit_give(item_id):
    target = list(pending_grant.values())[-1] if pending_grant else None
    if not target:
        await send_telegram_message("❌ Hết phiên tặng. Dùng <code>/grant &lt;user_id&gt;</code> lại nhé.")
        return
    item = _q("SELECT name, kind FROM spirit_items WHERE id=%s", (item_id,))
    if not item:
        await send_telegram_message("❌ Linh vật không tồn tại.")
        return
    db_inserter.insert(
        "INSERT IGNORE INTO user_spirit_items (user_id, item_id) VALUES (%s, %s)",
        (target, item_id))
    emo = "🐉" if item[0]["kind"] == "pet" else "💎"
    await send_telegram_message(
        f"✅ Đã tặng {emo} <b>{item[0]['name']}</b> cho user #{target}!")


# ==========================================================
# 💰 QR DONATE NGAY TRONG CHAT
# ==========================================================
async def cmd_qr(amount):
    """Tạo phiên donate + gửi QR + canh tiền về (không phụ thuộc webhook)."""
    if not amount or amount < 10000:
        await send_telegram_message("💰 Cú pháp: <code>/qr 50000</code> (tối thiểu 10.000đ)")
        return
    owner = _q("SELECT id FROM users WHERE role=1 ORDER BY id ASC LIMIT 1") or _q("SELECT id FROM users ORDER BY id LIMIT 1")
    if not owner:
        await send_telegram_message("❌ Chưa có user trong DB để gắn phiên QR.")
        return
    uid = owner[0]["id"]
    try:
        from api.donate import create_donate_qr, DonateQRRequest
        res = await create_donate_qr(DonateQRRequest(user_id=uid, amount=amount))
    except Exception as e:
        await send_telegram_message(f"❌ Lỗi tạo QR: {e}")
        return

    qr_url, qr_id = res.get("qr_url"), res.get("qr_id")
    await send_telegram_message(
        f"💰 <b>QR DONATE {_fmt(amount)}đ</b> (provider: {res.get('provider')})\n"
        f"Nội dung: <code>D4M {uid}</code> • hạn 15 phút\n"
        f"<i>Tiền về đệ sẽ báo ngay tại đây!</i>")
    # Gửi ảnh QR (data-uri base64 hoặc URL)
    try:
        import httpx
        async with httpx.AsyncClient(timeout=30) as client:
            if qr_url and qr_url.startswith("data:image"):
                raw = base64.b64decode(qr_url.split(",", 1)[1])
                await client.post(
                    f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendPhoto",
                    data={"chat_id": settings.TELEGRAM_CHAT_ID,
                          "caption": f"💰 QR donate {_fmt(amount)}đ"},
                    files={"photo": ("qr.png", raw, "image/png")})
            elif qr_url:
                await client.post(
                    f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendPhoto",
                    data={"chat_id": settings.TELEGRAM_CHAT_ID, "photo": qr_url,
                          "caption": f"💰 QR donate {_fmt(amount)}đ"})
    except Exception as e:
        logger.warning(f"[ECO] gửi ảnh QR lỗi: {e}")

    asyncio.create_task(_watch_qr(qr_id, amount))


async def _watch_qr(qr_id, amount):
    """Canh tiền về mỗi 5s (hỏi thẳng PayOS), tối đa 15 phút."""
    try:
        from api import donate as dmod
    except Exception:
        return
    for _ in range(180):
        await asyncio.sleep(5)
        try:
            r = await dmod.donate_status(qr_id)
            if r.get("qr_status") == "success":
                await send_telegram_message(
                    f" <b>TIỀN ĐÃ VỀ!</b> +{_fmt(amount)}đ (mã {qr_id})\n"
                    f"Tài khoản donate đã được kích hoạt ✅")
                return
            if r.get("qr_status") == "expired":
                await send_telegram_message(f"⌛ QR {_fmt(amount)}đ đã hết hạn.")
                return
        except Exception:
            pass
    await send_telegram_message(f"⌛ Hết thời gian canh QR {_fmt(amount)}đ.")


# ==========================================================
# 🔔 ALERTS REALTIME
# ==========================================================
async def alert_donate(user_id, amount):
    await send_telegram_message(
        f"💰 <b>[DONATE]</b> +{_fmt(amount)}đ từ user #{user_id} — tiền đã về két! 🎉")


async def alert_new_user(username, user_id):
    await send_telegram_message(
        f"🆕 <b>[USER MỚI]</b> {username} (#{user_id}) vừa xác thực gia nhập hệ sinh thái!")


# ==========================================================
# 📅 BÁO CÁO HỆ SINH THÁI MỖI SÁNG 08:00
# ==========================================================
async def daily_loop():
    """Vòng lặp báo sáng — chạy song song với polling."""
    await asyncio.sleep(10)
    last_day = None
    while True:
        try:
            now = datetime.now()
            if now.hour == 8 and last_day != now.date():
                last_day = now.date()
                await send_telegram_message(
                    f"🌅 <b>BÁO CÁO HỆ SINH THÁI {now.strftime('%d/%m')}</b>\n\n"
                    f"👥 {stats_social()}\n\n🎵 {stats_music()}\n\n💰 {stats_donate()}\n\n"
                    f"<i>Chúc sếp một ngày deploy không bug! 🚀</i>")
        except Exception as e:
            logger.warning(f"[ECO] daily loop: {e}")
        await asyncio.sleep(60)
