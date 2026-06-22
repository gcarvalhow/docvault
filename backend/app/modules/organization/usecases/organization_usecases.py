from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.schemas.responses import IdentifierResponse

from app.modules.organization.domain.aggregates import Organization
from app.modules.organization.schemas.requests import CreateOrganizationRequest

from app.modules.organization.infrastructure import OrganizationRepository

from app.modules.identity.usecases import UserUseCase
from app.modules.identity.domain.enumerations import UserRole
from app.modules.identity.schemas.requests import CreateUserRequest

class OrganizationUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = OrganizationRepository(session)
        self.user_usecase = UserUseCase(session)

    async def create(self, request: CreateOrganizationRequest) -> IdentifierResponse:
        organization_exists = await self.repository.find_async("name", request.organization.name)
        if organization_exists:
            raise HTTPException(status_code=409, detail="organization name already exists")

        organization = Organization.Create(name=request.organization.name)

        await self.repository.save(organization)

        await self.user_usecase.create(
            request=CreateUserRequest(
                email=request.user.email,
                organization_id=organization.id,
                password=request.user.password,
                confirm_password=request.user.confirm_password,
                role=UserRole.ADMIN,
            ),
        )

        return IdentifierResponse(id=organization.id)