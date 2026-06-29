from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi import Limiter

from app.config import settings
from app.core.shared import _format_validation_errors

from app.modules.audit.router import router as audit_router
from app.modules.identity.router import router as identity_router
from app.modules.documents.router import router as documents_router
from app.modules.organization.router import router as organization_router

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="DocVault", version="1.0.0")

app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Try again in 15 minutes."},
    )

_DOCS_PATHS = ("/docs", "/redoc", "/openapi.json")

@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    if not any(request.url.path.startswith(p) for p in _DOCS_PATHS):
        response.headers["Content-Security-Policy"] = "default-src 'none'"

    return response

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": _format_validation_errors(exc.errors())},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(identity_router)
app.include_router(organization_router)
app.include_router(documents_router)
app.include_router(audit_router)

@app.get("/health")
async def health():
    return {"status": "ok"}