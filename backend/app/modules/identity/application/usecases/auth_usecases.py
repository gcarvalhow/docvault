from uuid import UUID
from jose import JWTError
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.modules.identity.domain.aggregates import User
from app.modules.identity.infrastructure.repositories import UserRepository
from app.modules.identity.infrastructure.services import PasswordService, JwtTokenService
from app.modules.audit.infrastructure.services import AuditService
from app.modules.audit.domain.enumerations import AuditAction

class AuthUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._user_repository = UserRepository(session)

    async def login(self, email: str, password: str, ip: str | None = None) -> tuple[str, str]:
        user = await self._user_repository.find_async("email", email)

        if not user or not user.is_active or not PasswordService.verify(password, user.password_hash):
            await AuditService.log(
                self._session,
                user_email=email,
                action=AuditAction.LOGIN_FAILED,
                ip=ip,
                detail="Invalid credentials",
            )
            raise HTTPException(status_code=401, detail="Invalid credentials")

        tokens = await self._issue_tokens(user)
        await AuditService.log(
            self._session,
            user_id=user.id,
            user_email=user.email,
            action=AuditAction.LOGIN_SUCCESS,
            ip=ip,
        )
        return tokens
    
    async def logout(self, user: User, ip: str | None = None) -> None:
        user.logout()
        await self._user_repository.save(user)
        await AuditService.log(
            self._session,
            user_id=user.id,
            user_email=user.email,
            action=AuditAction.LOGOUT,
            ip=ip,
        )

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

        user = await self._user_repository.get_by_id(UUID(user_id))

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

        await self._user_repository.save(user)
        return access_token, refresh_token_str