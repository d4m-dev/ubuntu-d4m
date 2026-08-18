import jwt
import bcrypt  # 🚀 DÙNG TRỰC TIẾP LÕI BCRYPT, SA THẢI PASSLIB
from datetime import datetime, timedelta
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from core.config import settings
from core.rate_limit import generate_jti, is_token_blacklisted

# ==========================================
# ⚙️ CẤU HÌNH ADMIN & TOKEN
# ==========================================
ADMIN_USERNAME = getattr(settings, "ADMIN_USERNAME", "admin")
_ADMIN_PASSWORD_RAW = getattr(settings, "ADMIN_PASSWORD", "admin123")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

security_scheme = HTTPBearer()

# ==========================================
# 🔐 HỆ THỐNG MÃ HÓA (Chuẩn Bcrypt Trực Tiếp)
# ==========================================
def get_password_hash(password: str) -> str:
    """Băm mật khẩu người dùng trước khi lưu vào DB."""
    # Đổi chuỗi text thành byte trước khi băm
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(pwd_bytes, salt)
    # Trả về dạng string bình thường để dễ dàng lưu vào MariaDB/SQLite
    return hashed_password.decode('utf-8')

# Khởi tạo mã băm cho Admin ngay khi hệ thống vừa thức giấc
_ADMIN_PASSWORD_HASH = get_password_hash(_ADMIN_PASSWORD_RAW)

def verify_password(plain_password: str, hashed_password: str = None) -> bool:
    """
    Kiểm tra mật khẩu đa năng:
    - Nếu có hashed_password: So sánh cho User SSO.
    - Nếu không có hashed_password: Mặc định so sánh cho Admin.
    """
    password_byte_enc = plain_password.encode('utf-8')

    # Nếu không truyền mã băm vào, tự hiểu là đang test tài khoản Admin
    if hashed_password is None:
        hashed_password = _ADMIN_PASSWORD_HASH

    # Đảm bảo mã băm trong Database được chuyển về dạng byte để so sánh
    if isinstance(hashed_password, str):
        hashed_password = hashed_password.encode('utf-8')

    try:
        return bcrypt.checkpw(password_byte_enc, hashed_password)
    except ValueError:
        # Chống sập web nếu mã băm trong Database bị ai đó sửa bậy bạ
        return False

# ==========================================
# 🎫 HỆ THỐNG CẤP PHÁT & XÁC THỰC TOKEN
# ==========================================
def create_access_token(data: dict):
    """Đúc thẻ bài JWT (kèm jti để hỗ trợ blacklist khi Logout)."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    # jti = JWT ID duy nhất, dùng để vô hiệu hoá token khi logout
    if "jti" not in to_encode:
        to_encode["jti"] = generate_jti()
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Security(security_scheme)):
    """Giải mã và kiểm tra tính hợp lệ của Token (kèm blacklist check)."""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        # Vô hiệu hoá token đã đăng xuất
        if is_token_blacklisted(payload.get("jti", "")):
            raise HTTPException(status_code=401, detail="❌ Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại!")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="⚠️ Phiên đăng nhập đã hết hạn!")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="❌ Token không hợp lệ hoặc đã bị giả mạo!")


def decode_token(token: str) -> dict | None:
    """Giải mã token, trả payload hoặc None nếu lỗi (dùng cho optional auth)."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        # Bỏ qua token đã blacklist
        if is_token_blacklisted(payload.get("jti", "")):
            return None
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_current_active_user(authorization: str):
    """
    Kiểm tra token hợp lệ + user có `active = 1`.
    Trả payload nếu hợp lệ, ngược lại raise 401/403.
    - Token hỏng/hết hạn/blacklist -> 401
    - User không tồn tại / active != 1  -> 403
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Thiếu thẻ định danh (Token)")
    token = authorization.split(" ")[1]
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Token không hợp lệ hoặc đã hết hạn.")

    # Lấy user id từ payload (user_id, id hoặc sub nếu là số)
    uid = payload.get("user_id") or payload.get("id")
    sub = payload.get("sub")
    if not uid and sub and str(sub).isdigit():
        uid = int(sub)

    # Đọc active thật từ DB (đáng tin cậy hơn field trong token)
    try:
        from core.database import db_executor
        if uid:
            rows = db_executor.select_as_list_dict(
                "SELECT id, username, active, role FROM users WHERE id=%s", (uid,))
        elif sub:
            rows = db_executor.select_as_list_dict(
                "SELECT id, username, active, role FROM users WHERE username=%s", (sub,))
        else:
            rows = []
    except Exception:
        # fallback: dùng active trong token nếu có
        if payload.get("active") == 1:
            return payload
        raise HTTPException(status_code=403, detail="Tài khoản chưa được kích hoạt.")

    if not rows:
        raise HTTPException(status_code=401, detail="Không tìm thấy tài khoản trong Database.")

    user = rows[0]
    if user.get("active") != 1:
        raise HTTPException(status_code=403, detail="Tài khoản chưa được kích hoạt (active != 1). Liên hệ Admin.")

    payload["user_id"] = user["id"]
    payload["username"] = user["username"]
    payload["active"] = 1
    payload["role"] = user.get("role", payload.get("role"))
    return payload