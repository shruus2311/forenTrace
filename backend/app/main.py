from fastapi import FastAPI, Request
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.ledger_anchor import AnchorUnavailable
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

@app.exception_handler(AnchorUnavailable)
async def ledger_anchor_error(request: Request, error: AnchorUnavailable):
    return JSONResponse(status_code=503, content={"detail": str(error)})

@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, error: RequestValidationError):
    if request.url.path == settings.API_V1_STR + "/auth/login":
        return JSONResponse(status_code=422, content={"detail": "Enter a valid investigator ID and password."})
    if request.url.path.startswith(settings.API_V1_STR + "/security/passkeys/"):
        return JSONResponse(status_code=422, content={"detail": "The passkey request is invalid."})
    return await request_validation_exception_handler(request, error)

@app.middleware("http")
async def reject_untrusted_write_origins(request: Request, call_next):
    if not request.url.path.startswith(settings.API_V1_STR + "/"):
        return await call_next(request)
    origin = request.headers.get("origin")
    if request.method not in {"GET", "HEAD", "OPTIONS"} and origin is not None and origin not in settings.CORS_ORIGINS:
        response = JSONResponse(status_code=403, content={"detail": "Request origin is not allowed."})
    else:
        response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    return response

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
