from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.shared import assert_same_tenant
from app.core.schemas.responses import IdentifierResponse

from app.modules.organization.domain.aggregates import Organization
from app.modules.identity.application.schemas.requests import CreateUserRequest
from app.modules.organization.application.schemas.responses import OrganizationResponse
from app.modules.organization.application.schemas.requests import CreateOrganizationRequest, UpdateOrganizationRequest

from app.modules.identity.domain.enumerations import UserRole
from app.modules.identity.application.usecases import UserUseCase

from app.modules.organization.infrastructure.repositories import OrganizationRepository

class OrganizationUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._repository = OrganizationRepository(session)
        self._user_usecase = UserUseCase(session)

    async def create(self, request: CreateOrganizationRequest) -> IdentifierResponse:
        organization_exists = await self._repository.find_async("name", request.organization.name)
        if organization_exists:
            raise HTTPException(status_code=409, detail="organization name already exists")

        organization = Organization.Create(name=request.organization.name)

        await self._repository.save(organization)

        await self._user_usecase.create(
            request=CreateUserRequest(
                email=request.user.email,
                organization_id=organization.id,
                password=request.user.password,
                confirm_password=request.user.confirm_password,
                role=UserRole.ADMIN,
            ),
        )

        return IdentifierResponse(id=organization.id)

    async def update(self, organization_id: UUID, requesting_user_org_id: UUID, request: UpdateOrganizationRequest) -> None:
        organization = await self._repository.get_by_id(organization_id)
        if not organization:
            raise HTTPException(status_code=404, detail="organization not found")

        assert_same_tenant(organization.id, requesting_user_org_id)

        name_conflict = await self._repository.find_async("name", request.name)
        if name_conflict and name_conflict.id != organization_id:
            raise HTTPException(status_code=409, detail="organization name already exists")

        await self._repository.update(organization_id, name=request.name)

    async def get(self, organization_id: UUID) -> OrganizationResponse:
        organization = await self._repository.get_by_id(organization_id)
        if not organization:
            raise HTTPException(status_code=404, detail="organization not found")

        return OrganizationResponse(
            id=organization.id,
            name=organization.name,
            created_at=organization.created_at,
            updated_at=organization.updated_at,
        )