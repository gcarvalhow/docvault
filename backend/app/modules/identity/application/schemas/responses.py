from uuid import UUID
from datetime import datetime

from pydantic import BaseModel

from app.modules.identity.domain.enumerations import UserRole


class TokenResponse(BaseModel):
    access_token: str


class UserResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    email: str
    role: UserRole
    organization_id: UUID
    is_active: bool
    created_at: datetime
