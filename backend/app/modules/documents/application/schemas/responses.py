from uuid import UUID
from datetime import datetime

from pydantic import BaseModel

from app.modules.documents.domain.enumerations import DocumentCategory, DocumentStatus

class DocumentResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    title: str
    description: str | None
    category: DocumentCategory
    status: DocumentStatus
    owner_id: UUID
    analyst_id: UUID | None
    comment: str | None
    created_at: datetime
    updated_at: datetime