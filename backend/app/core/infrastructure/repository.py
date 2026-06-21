from typing import Any, Generic, List, Optional, Type, TypeVar

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update as sa_update

from app.core.domain.model import Model

T = TypeVar("T", bound=Model)

class AsyncRepository(Generic[T]):
    def __init__(self, session: AsyncSession, model: Type[T]) -> None:
        self._session = session
        self._model = model

    async def save(self, entity: T) -> None:
        self._session.add(entity)

    async def update(self, entity_id: Any, **fields) -> Optional[T]:
        await self._session.execute(
            sa_update(self._model).where(getattr(self._model, "id") == entity_id).values(**fields)
        )
        return await self.get_by_id(entity_id)

    async def get_by_id(self, entity_id: Any) -> Optional[T]:
        return await self._session.get(self._model, entity_id)

    async def delete(self, entity: T) -> None:
        await self._session.delete(entity)

    async def list_all(self) -> List[T]:
        result = await self._session.execute(select(self._model))
        return list(result.scalars().all())

    async def find_async(self, field: str, value: Any) -> Optional[T]:
        attr = getattr(self._model, field)
        result = await self._session.execute(select(self._model).where(attr == value))

        return result.scalar_one_or_none()