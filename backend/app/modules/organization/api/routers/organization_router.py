from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends

from app.dependencies import get_db
from app.modules.identity.dependencies import get_current_user, require_role

from app.modules.identity.domain.aggregates import User
from app.modules.identity.domain.enumerations import UserRole

from app.core.schemas.responses import IdentifierResponse
from app.modules.organization.application.schemas.responses import OrganizationResponse
from app.modules.organization.application.schemas.requests import CreateOrganizationRequest, UpdateOrganizationRequest

from app.modules.organization.application.usecases import OrganizationUseCase

router = APIRouter(prefix="/organization", tags=["Organization"])


@router.get("", response_model=OrganizationResponse, status_code=200)
async def get(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    return await OrganizationUseCase(session).get(user.organization_id)


@router.post("", response_model=IdentifierResponse, status_code=201)
async def create(body: CreateOrganizationRequest, session: AsyncSession = Depends(get_db)):
    return await OrganizationUseCase(session).create(body)


@router.put("/{organization_id}", status_code=204)
async def update(
    organization_id: UUID,
    body: UpdateOrganizationRequest,
    user: User = Depends(require_role(UserRole.ADMIN)),
    session: AsyncSession = Depends(get_db),
):
    await OrganizationUseCase(session).update(organization_id, user.organization_id, body)
