import hashlib
from jose import jwt
from uuid import uuid4
from datetime import datetime, timedelta, timezone

from app.config import settings

class JwtTokenService:
    _algorithm = "HS256"

    @classmethod
    def _now(cls) -> datetime:
        return datetime.now(timezone.utc)

    @classmethod
    def create_access_token(cls, user_id: str, role: str, security_stamp: str) -> str:
        payload = {
            "sub": user_id, "role": role, "security_stamp": security_stamp, "type": "access",
            "exp": cls._now() + timedelta(minutes=settings.access_token_expire_minutes),
            "iat": cls._now(),
        }

        return jwt.encode(payload, settings.jwt_secret_key, algorithm=cls._algorithm)

    @classmethod
    def create_refresh_token(cls, user_id: str) -> tuple[str, str]:
        jti = str(uuid4())

        payload = {
            "sub": user_id, "jti": jti, "type": "refresh",
            "exp": cls._now() + timedelta(days=settings.refresh_token_expire_days),
            "iat": cls._now(),
        }

        token = jwt.encode(payload, settings.jwt_secret_key, algorithm=cls._algorithm)
        token_hash = hashlib.sha256(token.encode()).hexdigest()

        return token, token_hash

    @classmethod
    def hash_token(cls, token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    @classmethod
    def decode_token(cls, token: str) -> dict:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[cls._algorithm])