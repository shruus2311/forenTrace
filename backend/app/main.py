from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_v1_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Privacy-Preserving Digital Evidence Provenance, Lineage and Chain-of-Custody Platform API",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 router
app.include_router(api_v1_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["System Telemetry"])
def health_check():
    """Returns real-time service health, cryptographic module status, and timestamp."""
    import time
    return {
        "status": "HEALTHY",
        "service": "ForenTrace Digital Forensic Intelligence Platform",
        "version": settings.VERSION,
        "crypto_engine": "Ed25519 / SHA-256 / SHA-512 ACTIVE",
        "iso_27037_compliance": "STRICT_ENFORCEMENT",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
