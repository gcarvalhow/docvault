from uuid import UUID
from typing import Optional
from datetime import datetime

from pydantic import BaseModel

class AuditLogResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    user_id: Optional[UUID]
    user_email: str
    action: str
    target_type: Optional[str]
    target_id: Optional[UUID]
    detail: Optional[str]
    ip: Optional[str]
    created_at: datetime