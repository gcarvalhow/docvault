from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.identity.domain.aggregates import User
from app.core.infrastructure.repository import AsyncRepository

class UserRepository(AsyncRepository[User]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, User)