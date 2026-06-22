from datetime import datetime, timedelta, timezone

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