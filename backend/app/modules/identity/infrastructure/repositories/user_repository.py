from uuid import UUID
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.identity.domain.aggregates import User
from app.core.infrastructure.repository import AsyncRepository


class UserRepository(AsyncRepository[User]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, User)

    async def list_by_organization(self, organization_id: UUID) -> Sequence[User]:
        result = await self._session.execute(
            select(User).where(User.organization_id == organization_id)
        )
        return result.scalars().all()
