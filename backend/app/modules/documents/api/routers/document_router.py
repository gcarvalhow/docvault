from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.modules.identity.dependencies import get_current_user, require_role

from app.modules.identity.domain.aggregates import User
from app.modules.identity.domain.enumerations import UserRole

from app.core.schemas.responses import IdentifierResponse
from app.modules.documents.application.schemas.requests import (
    CreateDocumentRequest,
    EditDocumentRequest,
    ChangeStatusRequest,
    AssignAnalystRequest,
)

from app.modules.documents.application.usecases import DocumentUseCase
from app.modules.documents.application.schemas.responses import DocumentResponse

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.post("", response_model=IdentifierResponse, status_code=201)
async def create(body: CreateDocumentRequest, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    return await DocumentUseCase(session).create(user, body)

@router.put("/{document_id}", status_code=204)
async def edit(
    document_id: UUID,
    body: EditDocumentRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    await DocumentUseCase(session).edit(user, document_id, body)

@router.patch("/{document_id}/status", status_code=204)
async def change_status(
    document_id: UUID,
    body: ChangeStatusRequest,
    user: User = Depends(require_role(UserRole.ADMIN, UserRole.ANALYST)),
    session: AsyncSession = Depends(get_db)
):
    await DocumentUseCase(session).change_status(user, document_id, body)

@router.patch("/{document_id}/analyst", status_code=204)
async def assign_analyst(
    document_id: UUID,
    body: AssignAnalystRequest,
    user: User = Depends(require_role(UserRole.ADMIN)),
    session: AsyncSession = Depends(get_db),
):
    await DocumentUseCase(session).assign_analyst(user, document_id, body)

@router.delete("/{document_id}", status_code=204)
async def delete(document_id: UUID, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    await DocumentUseCase(session).delete(user, document_id)

@router.get("/{document_id}", response_model=DocumentResponse, status_code=200)
async def get_by_id(document_id: UUID, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    return await DocumentUseCase(session).get_by_id(user, document_id)

@router.get("", response_model=list[DocumentResponse], status_code=200)
async def list_documents(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    return await DocumentUseCase(session).list_documents(user)