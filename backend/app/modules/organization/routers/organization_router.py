from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.core.schemas.responses import IdentifierResponse
from app.modules.organization.schemas.requests import CreateOrganizationRequest

from app.modules.organization.usecases import OrganizationUseCase

router = APIRouter(prefix="/organization", tags=["Organization"])

@router.post("", response_model=IdentifierResponse, status_code=201)
async def create(body: CreateOrganizationRequest, session: AsyncSession = Depends(get_db)):
    return await OrganizationUseCase(session).create(body)