from typing import Annotated, List
from uuid import UUID
from cryptography.exceptions import InvalidSignature
from fastapi import APIRouter, Depends, Header, HTTPException, Path, Query, status
from fastapi.responses import JSONResponse
from app.core.access import Identity, current_identity
from app.core.config import settings
from app.schemas.custody import (
    CustodyRecordCreate, CustodyRecordRead, LedgerProofExport, MerkleCheckpointRead, SignedLedgerExport,
)
from app.services.custody_ledger import CustodyRequestConflict, custody_ledger_service
from app.services.evidence_vault import evidence_vault_service

router = APIRouter(prefix="/custody", tags=["Chain of Custody"])
ExportCase = Annotated[str, Query(pattern=r"^[a-z0-9][a-z0-9_-]{0,63}$")]

@router.get("", response_model=List[CustodyRecordRead])
def list_custody_records(case_id: str | None = None, identity: Identity | None = Depends(current_identity)):
    """Retrieves immutable, hash-linked chain-of-custody audit blocks."""
    try:
        allowed = scoped_evidence(identity, case_id)
        records = [record for record in custody_ledger_service.list_records()
                   if allowed is None or record.evidence_id in allowed]
        if identity and any(not record.integrity_verified for record in records):
            raise InvalidSignature("The custody ledger failed integrity verification.")
        return records
    except InvalidSignature as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

@router.post("", response_model=CustodyRecordRead, status_code=status.HTTP_201_CREATED)
def append_custody_record(record_in: CustodyRecordCreate, idempotency_key: UUID | None = Header(None),
                          identity: Identity | None = Depends(current_identity)):
    """
    Appends a new custody transfer record, digitally signed with Ed25519 and hash-linked
    to the preceding block.
    """
    try:
        artifact = evidence_vault_service.get_artifact(record_in.evidence_id,
                                                        identity.evidence_cases(record_in.evidence_id, write=True) if identity else None)
        if artifact is None:
            raise HTTPException(404, "Evidence not found.")
        if idempotency_key is None and settings.FORENTRACE_LEDGER_ANCHOR_ID:
            raise HTTPException(422, "Supply an Idempotency-Key UUID for an anchored custody transfer.")
        record_in = record_in.model_copy(update={"evidence_name": artifact.name})
        return custody_ledger_service.append_record(record_in, idempotency_key, identity.username if identity else None)
    except (CustodyRequestConflict, InvalidSignature) as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

@router.get("/merkle-checkpoint", response_model=MerkleCheckpointRead)
def get_merkle_checkpoint(case_id: str | None = None, identity: Identity | None = Depends(current_identity)):
    """Returns a signed checkpoint for the caller's authorized custody records."""
    try:
        case_ids = identity.case_ids(case_id) if identity else ([case_id] if case_id else None)
        return custody_ledger_service.get_merkle_checkpoint(
            identity.organization_id if identity else None, case_ids,
            identity.evidence_exclusions(case_ids) if identity else None,
        )
    except InvalidSignature as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

@router.get("/export", response_model=SignedLedgerExport)
def export_ledger(case_id: ExportCase, identity: Identity | None = Depends(current_identity)):
    """Downloads a signed export of custody records for one case."""
    try:
        if identity:
            identity.case_ids(case_id)
        document = custody_ledger_service.export_ledger(identity.organization_id if identity else None, case_id,
                                                        identity.evidence_exclusions([case_id]) if identity else None)
    except InvalidSignature as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return JSONResponse(document.model_dump(), headers={
        "Content-Disposition": f'attachment; filename="forentrace-ledger-{case_id}.json"',
    })


@router.get("/{record_id}/proof", response_model=LedgerProofExport)
def export_proof(record_id: Annotated[str, Path(pattern=r"^CUST-[0-9]{3,19}$")],
                 case_id: ExportCase, identity: Identity | None = Depends(current_identity)):
    """Downloads one custody block and its inclusion path to a signed case checkpoint."""
    try:
        if identity:
            identity.case_ids(case_id)
        document = custody_ledger_service.export_proof(
            record_id, identity.organization_id if identity else None, case_id, identity.evidence_exclusions([case_id]) if identity else None,
        )
    except KeyError:
        raise HTTPException(404, "Custody record not found.")
    except InvalidSignature as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return JSONResponse(document.model_dump(), headers={
        "Content-Disposition": f'attachment; filename="forentrace-proof-{case_id}-{record_id}.json"',
    })


def scoped_evidence(identity: Identity | None, case_id: str | None) -> set[str] | None:
    if identity is None and case_id is None:
        return None
    cases = identity.case_ids(case_id) if identity else [case_id]
    return {artifact.id for artifact in evidence_vault_service.list_artifacts(cases,
                                                                             excluded_ids=identity.denied_evidence if identity else None)}
