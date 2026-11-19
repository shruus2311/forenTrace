from contextlib import ExitStack
from hashlib import sha256
from os import fsync
from pathlib import Path
from tempfile import NamedTemporaryFile, TemporaryDirectory, TemporaryFile
from typing import List, Optional
from uuid import UUID
from cryptography.exceptions import InvalidSignature
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from starlette.background import BackgroundTask
from starlette.concurrency import run_in_threadpool

from app.core.access import Identity, current_identity
from app.core.config import settings
from app.core.evidence_objects import StorageUnavailable
from app.schemas.evidence import EvidenceArtifactRead, EvidenceVerifyResponse
from app.services.evidence_vault import evidence_vault_service

router = APIRouter(prefix="/evidence", tags=["Evidence Repository"])

@router.get("", response_model=List[EvidenceArtifactRead])
def list_evidence(case_id: Optional[str] = Query(None, description="Filter by Case ID"),
                  identity: Identity | None = Depends(current_identity)):
    """Retrieves authenticated digital forensic artifacts with integrity status."""
    try:
        cases = identity.case_ids(case_id) if identity else ([case_id] if case_id else None)
        return evidence_vault_service.list_artifacts(cases, excluded_ids=identity.denied_evidence if identity else None)
    except InvalidSignature as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

@router.get("/{artifact_id}", response_model=EvidenceArtifactRead)
def get_evidence(artifact_id: str, identity: Identity | None = Depends(current_identity)):
    """Retrieves a single forensic artifact by ID."""
    try:
        artifact = evidence_vault_service.get_artifact(artifact_id, identity.evidence_cases(artifact_id, emergency=True) if identity else None)
    except InvalidSignature as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    if not artifact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Evidence {artifact_id} not found.")
    return artifact

@router.post("/{artifact_id}/verify", response_model=EvidenceVerifyResponse)
def verify_evidence(artifact_id: str, identity: Identity | None = Depends(current_identity)):
    """
    Executes real-time streaming cryptographic hash verification of stored evidence bytes.
    Computes simultaneous SHA-256 and SHA-512 against origin master signature.
    """
    try:
        return evidence_vault_service.verify_artifact(
            artifact_id, identity.evidence_cases(artifact_id, write=True) if identity else None,
        )
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Evidence {artifact_id} not found.")
    except InvalidSignature as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    except StorageUnavailable as e:
        raise HTTPException(503, str(e)) from e


@router.get("/{artifact_id}/original")
def download_original(artifact_id: str, request: Request, identity: Identity | None = Depends(current_identity)):
    if identity is None:
        raise HTTPException(503, "Original downloads require PostgreSQL.")
    try:
        artifact = evidence_vault_service.get_artifact(artifact_id, identity.evidence_cases(artifact_id, emergency=True))
    except InvalidSignature as error:
        raise HTTPException(409, "The evidence manifest failed integrity verification.") from error
    if artifact is None:
        raise HTTPException(404, "Evidence not found.")
    try:
        staged = TemporaryFile(dir=settings.ANALYSIS_ARTIFACTS_DIR)
    except OSError as error:
        raise HTTPException(503, "Scratch storage for the original is unavailable.") from error
    try:
        digest = sha256()
        size = 0
        with evidence_vault_service.open_evidence(artifact) as source:
            while chunk := source.read(1024 * 1024):
                size += len(chunk)
                if size > artifact.file_size_bytes:
                    raise HTTPException(409, "The original differs from its sealed fingerprint.")
                digest.update(chunk)
                staged.write(chunk)
        if size != artifact.file_size_bytes or digest.hexdigest() != artifact.hashes.sha256:
            raise HTTPException(409, "The original differs from its sealed fingerprint.")
        refreshed = current_identity(request)
        if refreshed is None or artifact.case_id not in refreshed.evidence_cases(artifact.id, emergency=True):
            raise HTTPException(404, "Evidence not found.")
        staged.seek(0)
    except (OSError, StorageUnavailable) as error:
        staged.close()
        raise HTTPException(503, "The sealed evidence original is unavailable.") from error
    except BaseException:
        staged.close()
        raise
    def content():
        try:
            yield from iter(lambda: staged.read(1024 * 1024), b"")
        finally:
            staged.close()

    return StreamingResponse(content(), media_type="application/octet-stream",
                             headers={"Content-Disposition": 'attachment; filename="evidence-original.bin"',
                                      "Content-Length": str(size), "X-Content-Type-Options": "nosniff"},
                             background=BackgroundTask(staged.close))


@router.post("", response_model=EvidenceArtifactRead, status_code=201)
async def register_evidence(
    request: Request,
    case_id: str = Query(min_length=1, max_length=64),
    filename: str = Query(min_length=1, max_length=255, pattern=r"^[^/\\\x00-\x1f\x7f]+$"),
    artifact_type: str = Query(alias="type", pattern=r"^(MEMORY_DUMP|DISK_IMAGE|PACKET_CAPTURE|EVENT_LOGS|REGISTRY_HIVE|MALWARE_BINARY|OTHER)$"),
    expected_sha256: str | None = Query(None, pattern=r"^[a-fA-F0-9]{64}$"),
    idempotency_key: UUID | None = Header(None),
    identity: Identity | None = Depends(current_identity),
):
    if identity is None:
        raise HTTPException(503, "Evidence registration requires PostgreSQL.")
    identity.case_ids(case_id, write=True)
    if request.headers.get("content-type", "").split(";", 1)[0].strip().lower() != "application/octet-stream":
        raise HTTPException(415, "Use application/octet-stream for evidence bytes.")
    uploads = settings.EVIDENCE_VAULT_DIR / ".uploads"
    with ExitStack() as scratch:
        size = 0
        try:
            uploads.mkdir(mode=0o700, exist_ok=True)
            directory = scratch.enter_context(TemporaryDirectory(dir=uploads))
            with NamedTemporaryFile(mode="wb", delete=False, dir=directory) as output:
                staged = Path(output.name)
                async for chunk in request.stream():
                    size += len(chunk)
                    if size > settings.FORENTRACE_MAX_UPLOAD_BYTES:
                        raise HTTPException(413, "Evidence file exceeds the upload limit.")
                    if chunk:
                        await run_in_threadpool(output.write, chunk)
                await run_in_threadpool(output.flush)
                await run_in_threadpool(fsync, output.fileno())
        except OSError as error:
            raise HTTPException(503, "Evidence upload staging is unavailable.") from error
        if size == 0:
            raise HTTPException(422, "Choose a non-empty evidence file.")
        active_identity = await run_in_threadpool(current_identity, request)
        active_identity.case_ids(case_id, write=True)
        try:
            return await run_in_threadpool(evidence_vault_service.register, staged, case_id, filename,
                                           artifact_type, expected_sha256, active_identity.username, idempotency_key,
                                           active_identity.denied_evidence)
        except StorageUnavailable as e:
            raise HTTPException(503, str(e)) from e
