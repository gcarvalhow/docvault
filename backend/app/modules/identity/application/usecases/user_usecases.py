from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.shared import assert_same_tenant
from app.core.schemas.responses import IdentifierResponse

from app.modules.identity.domain.aggregates import User
from app.modules.identity.application.schemas.responses import UserResponse

from app.modules.identity.infrastructure.repositories import UserRepository
from app.modules.identity.application.schemas.requests import CreateUserRequest
from app.modules.identity.infrastructure.services import PasswordService
from app.modules.audit.infrastructure.services import AuditService
from app.modules.audit.domain.enumerations import AuditAction


class UserUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repository = UserRepository(session)

    async def create(self, request: CreateUserRequest, created_by: User | None = None) -> IdentifierResponse:
        user_exists = await self._repository.find_async("email", request.email)
        if user_exists:
            raise HTTPException(status_code=409, detail="user email already exists")

        user = User.Create(
            email=request.email,
            password_hash=PasswordService.hash(request.password),
            organization_id=request.organization_id,
            role=request.role,
        )

        await self._repository.save(user)

        await AuditService.log(
            self._session,
            user_id=created_by.id if created_by else None,
            user_email=created_by.email if created_by else request.email,
            action=AuditAction.USER_CREATED,
            target_type="user",
            target_id=user.id,
            detail=f"role={request.role.value}",
        )

        return IdentifierResponse(id=user.id)

    async def get_by_id(self, requesting_user: User, user_id: UUID) -> UserResponse:
        user = await self._repository.get_by_id(user_id)

        if not user or not user.is_active:
            raise HTTPException(status_code=404, detail="User not found")

        assert_same_tenant(user.organization_id, requesting_user.organization_id)
        return UserResponse.model_validate(user)

    async def list_users(self, requesting_user: User, include_inactive: bool = False) -> list[UserResponse]:
        users = await self._repository.list_by_organization(requesting_user.organization_id)
        if not include_inactive:
            users = [u for u in users if u.is_active]
        return [UserResponse.model_validate(u) for u in users]

    async def delete(self, admin: User, user_id: UUID) -> None:
        user = await self._repository.get_by_id(user_id)

        if not user or not user.is_active:
            raise HTTPException(status_code=404, detail="User not found")

        assert_same_tenant(user.organization_id, admin.organization_id)

        if user.id == admin.id:
            raise HTTPException(status_code=400, detail="Cannot delete your own account")

        user.deactivate()
        await self._repository.save(user)

        await AuditService.log(
            self._session,
            user_id=admin.id,
            user_email=admin.email,
            action=AuditAction.USER_DEACTIVATED,
            target_type="user",
            target_id=user.id,
        )