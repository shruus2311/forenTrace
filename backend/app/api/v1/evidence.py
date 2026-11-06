from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from app.schemas.evidence import EvidenceArtifactRead, EvidenceVerifyResponse
from app.services.evidence_vault import evidence_vault_service

router = APIRouter(prefix="/evidence", tags=["Evidence Repository"])

@router.get("", response_model=List[EvidenceArtifactRead])
def list_evidence(case_id: Optional[str] = Query(None, description="Filter by Case ID")):
    """Retrieves authenticated digital forensic artifacts with integrity status."""
    return evidence_vault_service.list_artifacts(case_id=case_id)

@router.get("/{artifact_id}", response_model=EvidenceArtifactRead)
def get_evidence(artifact_id: str):
    """Retrieves a single forensic artifact by ID."""
    artifact = evidence_vault_service.get_artifact(artifact_id)
    if not artifact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Evidence {artifact_id} not found.")
    return artifact

@router.post("/{artifact_id}/verify", response_model=EvidenceVerifyResponse)
def verify_evidence(artifact_id: str):
    """
    Executes real-time streaming cryptographic hash verification of stored evidence bytes.
    Computes simultaneous SHA-256 and SHA-512 against origin master signature.
    """
    try:
        return evidence_vault_service.verify_artifact(artifact_id)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Evidence {artifact_id} not found.")
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
