from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.organization.domain.aggregates import Organization
from app.core.infrastructure.repository import AsyncRepository

class OrganizationRepository(AsyncRepository[Organization]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Organization)