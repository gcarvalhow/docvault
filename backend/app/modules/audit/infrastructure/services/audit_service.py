from uuid import UUID
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.audit.domain.entities import AuditLog
from app.modules.audit.infrastructure.repositories import AuditRepository

class AuditService:
    @staticmethod
    async def log(
        session: AsyncSession,
        user_email: str,
        action: str,
        user_id: Optional[UUID] = None,
        target_type: Optional[str] = None,
        target_id: Optional[UUID] = None,
        detail: Optional[str] = None,
        ip: Optional[str] = None,
    ) -> None:
        try:
            entry = AuditLog(
                user_id=user_id,
                user_email=user_email,
                action=action,
                target_type=target_type,
                target_id=target_id,
                detail=detail,
                ip=ip,
            )
            await AuditRepository(session).save(entry)
        except Exception:
            pass