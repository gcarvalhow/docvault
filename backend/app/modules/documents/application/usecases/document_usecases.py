from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.schemas.responses import IdentifierResponse

from app.modules.identity.domain.aggregates import User
from app.modules.identity.domain.enumerations import UserRole
from app.modules.identity.domain.policies import (
    can_create_document,
    can_view_document,
    can_edit_document,
    can_delete_document,
    can_change_document_status,
)

from app.modules.documents.domain.aggregates import Document
from app.modules.documents.domain.enumerations import DocumentStatus
from app.modules.documents.infrastructure.repositories import DocumentRepository
from app.modules.documents.application.schemas.requests import (
    CreateDocumentRequest,
    EditDocumentRequest,
    ChangeStatusRequest,
)

from app.modules.documents.application.schemas.responses import DocumentResponse
from app.modules.audit.infrastructure.services import AuditService
from app.modules.audit.domain.enumerations import AuditAction


class DocumentUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repository = DocumentRepository(session)

    async def create(self, user: User, request: CreateDocumentRequest) -> IdentifierResponse:
        if not can_create_document(user.role):
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        document = Document.create(
            title=request.title,
            description=request.description,
            category=request.category,
            owner_id=user.id,
        )

        await self._repository.save(document)

        await AuditService.log(
            self._session,
            user_id=user.id,
            user_email=user.email,
            action=AuditAction.DOC_CREATED,
            target_type="document",
            target_id=document.id,
        )

        return IdentifierResponse(id=document.id)

    async def list_documents(self, user: User) -> list[DocumentResponse]:
        if user.role == UserRole.ADMIN:
            docs = await self._repository.list_all_active()
        elif user.role == UserRole.ANALYST:
            docs = await self._repository.list_for_analyst(user.id)
        else:
            docs = await self._repository.list_by_owner(user.id)

        return [DocumentResponse.model_validate(d) for d in docs]

    async def get_by_id(self, user: User, document_id: UUID) -> DocumentResponse:
        document = await self._repository.get_active_by_id(document_id)

        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        is_owner = document.owner_id == user.id
        if not can_view_document(user.role, is_owner=is_owner):
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        return DocumentResponse.model_validate(document)

    async def edit(self, user: User, document_id: UUID, request: EditDocumentRequest) -> None:
        document = await self._repository.get_active_by_id(document_id)

        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        is_owner = document.owner_id == user.id
        if not can_edit_document(user.role, is_owner=is_owner, status=document.status.value):
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        document.edit(
            title=request.title,
            category=request.category,
            description=request.description,
        )

        await AuditService.log(
            self._session,
            user_id=user.id,
            user_email=user.email,
            action=AuditAction.DOC_EDITED,
            target_type="document",
            target_id=document.id,
        )

    async def change_status(self, user: User, document_id: UUID, request: ChangeStatusRequest) -> None:
        document = await self._repository.get_active_by_id(document_id)

        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        if not can_change_document_status(user.role):
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        if user.role == UserRole.ANALYST and request.status == DocumentStatus.PENDING:
            raise HTTPException(status_code=403, detail="Analysts cannot revert status to pending")

        document.change_status(
            new_status=request.status,
            analyst_id=request.analyst_id,
            comment=request.comment,
        )
        await AuditService.log(
            self._session,
            user_id=user.id,
            user_email=user.email,
            action=AuditAction.DOC_STATUS_CHANGED,
            target_type="document",
            target_id=document.id,
            detail=f"status={request.status.value}",
        )

    async def delete(self, user: User, document_id: UUID) -> None:
        document = await self._repository.get_active_by_id(document_id)

        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        is_owner = document.owner_id == user.id
        if not can_delete_document(user.role, is_owner=is_owner, status=document.status.value):
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        document.is_active = False
        await AuditService.log(
            self._session,
            user_id=user.id,
            user_email=user.email,
            action=AuditAction.DOC_DELETED,
            target_type="document",
            target_id=document.id,
        )