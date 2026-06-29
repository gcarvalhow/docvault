from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.modules.identity.dependencies import require_role
from app.modules.identity.domain.enumerations import UserRole

from app.modules.audit.infrastructure.repositories import AuditRepository
from app.modules.audit.application.schemas.responses import AuditLogResponse

router = APIRouter(prefix="/audit", tags=["Audit"])

@router.get("/logs", response_model=list[AuditLogResponse], status_code=200)
async def list_logs(
    action: Optional[str] = None,
    user_email: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    _: None = Depends(require_role(UserRole.ADMIN)),
    session: AsyncSession = Depends(get_db),
):
    logs = await AuditRepository(session).list_by_filters(
        action=action,
        user_email=user_email,
        limit=limit,
        offset=offset,
    )
    return [AuditLogResponse.model_validate(log) for log in logs]