from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.identity.domain.aggregates import User

from app.core.schemas.responses import IdentifierResponse
from app.modules.identity.schemas.requests import CreateUserRequest

from app.modules.identity.services import PasswordService
from app.modules.identity.infrastructure.repositories import UserRepository

class UserUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = UserRepository(session)

    async def create(self, request: CreateUserRequest) -> IdentifierResponse:
        user_exists = await self.repository.find_async("email", request.email)
        if user_exists:
            raise HTTPException(status_code=409, detail="user email already exists")

        user = User.Create(
            email=request.email,
            password_hash=PasswordService.hash(request.password),
            organization_id=request.organization_id,
            role=request.role,
        )

        await self.repository.save(user)
        return IdentifierResponse(id=user.id)