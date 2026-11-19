from fastapi import APIRouter
from app.api.v1.analysis import router as analysis_router
from app.api.v1.auth import router as auth_router
from app.api.v1.evidence import router as evidence_router
from app.api.v1.custody import router as custody_router
from app.api.v1.security import router as security_router

api_v1_router = APIRouter()
api_v1_router.include_router(auth_router)
api_v1_router.include_router(evidence_router)
api_v1_router.include_router(custody_router)
api_v1_router.include_router(analysis_router)
api_v1_router.include_router(security_router)
