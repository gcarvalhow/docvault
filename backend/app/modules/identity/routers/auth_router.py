from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, Response

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from app.dependencies import get_current_user, get_db
from app.modules.identity.domain.aggregates import User
from app.config import settings
from app.dependencies import get_db
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

@router.post("/logout", status_code=204)
async def logout(response: Response, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    await AuthUseCase(session).logout(user)
    response.delete_cookie(key="refresh_token", path="/identity/auth")

@router.post("/refresh", response_model=TokenResponse, status_code=200)
async def refresh(request: Request, response: Response, session: AsyncSession = Depends(get_db)):
    token = request.cookies.get("refresh_token")

    if not token:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    access_token, refresh_token = await AuthUseCase(session).refresh(token)

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