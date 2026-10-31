"""Per-user rate limiting via slowapi."""
import jwt
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from .config import JWT_SECRET, JWT_ALGORITHM


def get_user_id_or_ip(request: Request) -> str:
    """Per-user rate limit key, falls back to IP if not authenticated."""
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if token:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = payload.get("sub")
            if user_id:
                return f"user:{user_id}"
        except jwt.InvalidTokenError:
            pass
    return f"ip:{get_remote_address(request)}"


limiter = Limiter(key_func=get_user_id_or_ip, headers_enabled=False)
