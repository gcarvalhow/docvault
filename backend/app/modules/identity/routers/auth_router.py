from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, Response

from app.config import settings
from app.database import get_db
from app.modules.identity.usecases import AuthUseCase
from app.modules.identity.schemas.requests import LoginRequest
from app.modules.identity.schemas.responses import TokenResponse

router = APIRouter(prefix="/identity/auth", tags=["Auth"])

@router.post("/login", response_model=TokenResponse, status_code=200)
async def login(body: LoginRequest, response: Response, session: AsyncSession = Depends(get_db)):
    access_token, refresh_token = await AuthUseCase(session).login(
        email=body.email,
        password=body.password,
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.environment != "development",
        samesite="strict",
        path="/identity/auth",
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
    )

    return TokenResponse(access_token=access_token)
