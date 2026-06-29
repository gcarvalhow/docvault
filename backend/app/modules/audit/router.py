from fastapi import APIRouter

from app.modules.audit.api.routers.audit_router import router as audit_router

router = APIRouter()
router.include_router(audit_router)