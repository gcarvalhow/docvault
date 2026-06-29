from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.modules.identity.dependencies import get_current_user, require_role

from app.modules.identity.domain.aggregates import User
from app.modules.identity.domain.enumerations import UserRole
from app.modules.identity.application.schemas.requests import CreateUserRequest, InviteUserRequest
from app.modules.identity.application.schemas.responses import UserResponse
from app.modules.identity.application.usecases import UserUseCase
from app.core.schemas.responses import IdentifierResponse

router = APIRouter(prefix="/identity/users", tags=["Users"])

@router.post("", response_model=IdentifierResponse, status_code=201)
async def invite_user(
    request: InviteUserRequest,
    admin: User = Depends(require_role(UserRole.ADMIN)),
    session: AsyncSession = Depends(get_db),
):
    full_request = CreateUserRequest(
        email=request.email,
        role=request.role,
        password=request.password,
        confirm_password=request.confirm_password,
        organization_id=admin.organization_id,
    )
    return await UserUseCase(session).create(full_request, created_by=admin)

@router.get("/{user_id}", response_model=UserResponse, status_code=200)
async def get_user(user_id: UUID, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    return await UserUseCase(session).get_by_id(user, user_id)

@router.get("", response_model=list[UserResponse], status_code=200)
async def list_users(include_inactive: bool = False, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    return await UserUseCase(session).list_users(user, include_inactive)

@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: UUID, admin: User = Depends(require_role(UserRole.ADMIN)), session: AsyncSession = Depends(get_db)):
    await UserUseCase(session).delete(admin, user_id)
