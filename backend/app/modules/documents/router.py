from fastapi import APIRouter

from app.modules.documents.api.routers.document_router import router as document_router

router = APIRouter()
router.include_router(document_router)