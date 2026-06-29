from uuid import UUID
from typing import Optional, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.documents.domain.aggregates import Document
from app.modules.documents.domain.enumerations import DocumentStatus

from app.core.infrastructure.repository import AsyncRepository

class DocumentRepository(AsyncRepository[Document]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Document)

    async def list_by_owner(self, owner_id: UUID) -> Sequence[Document]:
        result = await self._session.execute(
            select(Document).where(Document.owner_id == owner_id, Document.is_active == True)
        )

        return result.scalars().all()

    async def list_by_statuses(self, statuses: list[DocumentStatus]) -> Sequence[Document]:
        result = await self._session.execute(
            select(Document).where(Document.status.in_(statuses), Document.is_active == True)
        )

        return result.scalars().all()

    async def list_for_analyst(self, analyst_id: UUID) -> Sequence[Document]:
        result = await self._session.execute(
            select(Document).where(
                Document.is_active == True,
                (
                    (Document.status == DocumentStatus.PENDING) |
                    ((Document.status == DocumentStatus.IN_REVIEW) & (Document.analyst_id == analyst_id))
                ),
            )
        )

        return result.scalars().all()

    async def list_all_active(self) -> Sequence[Document]:
        result = await self._session.execute(
            select(Document).where(Document.is_active == True)
        )

        return result.scalars().all()

    async def get_active_by_id(self, document_id: UUID) -> Optional[Document]:
        result = await self._session.execute(
            select(Document).where(Document.id == document_id, Document.is_active == True)
        )

        return result.scalar_one_or_none()