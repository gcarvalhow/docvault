from uuid import UUID
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

from app.modules.documents.domain.enumerations import DocumentCategory, DocumentStatus

TitleStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=200)]

class CreateDocumentRequest(BaseModel):
    title: TitleStr
    description: str | None = None
    category: DocumentCategory

class EditDocumentRequest(BaseModel):
    title: TitleStr
    description: str | None = None
    category: DocumentCategory

class ChangeStatusRequest(BaseModel):
    status: DocumentStatus
    analyst_id: UUID | None = None
    comment: str | None = None

class AssignAnalystRequest(BaseModel):
    analyst_id: UUID | None = None