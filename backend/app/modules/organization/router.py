from fastapi import APIRouter

from app.modules.organization.routers.organization_router import router as organization_router

router = APIRouter()
router.include_router(organization_router)