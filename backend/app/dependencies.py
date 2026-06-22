from typing_extensions import Annotated
from uuid import UUID
from jose import JWTError
from typing import AsyncGenerator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.identity.domain.aggregates import User
from app.modules.identity.domain.enumerations import UserRole

from app.database import AsyncSessionLocal
from app.modules.identity.services import JwtTokenService
from app.modules.identity.infrastructure.repositories import UserRepository

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        async with session.begin():
            yield session

_bearer = HTTPBearer(auto_error=False)
_401 = HTTPException(status_code=401, detail="Invalid or expired token", headers={"WWW-Authenticate": "Bearer"})

async def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(_bearer), session: AsyncSession = Depends(get_db)) -> User:
    if credentials is None:
        raise _401

    try:
        payload = JwtTokenService.decode_token(credentials.credentials)
    except JWTError:
        raise _401

    if payload.get("type") != "access":
        raise _401

    user_id = payload.get("sub")
    security_stamp = payload.get("security_stamp")

    if not user_id or not security_stamp:
        raise _401

    user = await UserRepository(session).get_by_id(UUID(user_id))

    if not user or not user.is_active:
        raise _401

    if str(user.security_stamp) != security_stamp:
        raise _401

    return user

def require_role(*roles: UserRole):
    async def _check(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        
        return user
        
    return _check