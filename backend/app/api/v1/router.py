from fastapi import APIRouter
from app.api.v1.evidence import router as evidence_router
from app.api.v1.custody import router as custody_router

api_v1_router = APIRouter()
api_v1_router.include_router(evidence_router)
api_v1_router.include_router(custody_router)
