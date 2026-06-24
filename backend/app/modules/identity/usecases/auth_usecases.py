from datetime import datetime, timedelta, timezone
from uuid import UUID
from jose import JWTError
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.modules.identity.domain.aggregates import User
from app.modules.identity.infrastructure.repositories import UserRepository
from app.modules.identity.services import PasswordService, JwtTokenService

class AuthUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._users = UserRepository(session)

    async def login(self, email: str, password: str) -> tuple[str, str]:
        user = await self._users.find_async("email", email)

        if not user or not user.is_active or not PasswordService.verify(password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        return await self._issue_tokens(user)
    
    async def logout(self, user: User) -> None:
        user.logout()
        await self._users.save(user)

    async def refresh(self, token: str) -> tuple[str, str]:
        try:
            payload = JwtTokenService.decode_token(token)
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        user = await self._users.get_by_id(UUID(user_id))

        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        token_hash = JwtTokenService.hash_token(token)
        stored = next((t for t in user.refresh_tokens if t.token_hash == token_hash), None)

        if not stored or not stored.is_valid():
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        user.revoke_refresh_token(stored.id)
        user.regenerate_stamp()

        return await self._issue_tokens(user)

    async def _issue_tokens(self, user: User) -> tuple[str, str]:
        refresh_token_str, token_hash = JwtTokenService.create_refresh_token(user_id=str(user.id))

        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
        user.add_refresh_token(token_hash=token_hash, expires_at=expires_at)

        access_token = JwtTokenService.create_access_token(
            user_id=str(user.id),
            role=user.role.value,
            security_stamp=str(user.security_stamp),
        )

        await self._users.save(user)
        return access_token, refresh_token_str