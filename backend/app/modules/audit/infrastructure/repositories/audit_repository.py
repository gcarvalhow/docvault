from typing import Optional, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.infrastructure.repository import AsyncRepository
from app.modules.audit.domain.entities import AuditLog

class AuditRepository(AsyncRepository[AuditLog]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, AuditLog)

    async def list_by_filters(
        self,
        action: Optional[str] = None,
        user_email: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Sequence[AuditLog]:
        query = select(AuditLog).order_by(AuditLog.created_at.desc())

        if action:
            query = query.where(AuditLog.action == action)
        if user_email:
            query = query.where(AuditLog.user_email == user_email)

        query = query.offset(offset).limit(limit)
        result = await self._session.execute(query)
        return result.scalars().all()