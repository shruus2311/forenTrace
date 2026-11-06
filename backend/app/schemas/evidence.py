from typing import List, Optional, Dict
from pydantic import BaseModel, Field

class HashCollection(BaseModel):
    md5: str
    sha1: str
    sha256: str
    sha512: Optional[str] = None
    ssdeep: Optional[str] = None

class EvidenceArtifactBase(BaseModel):
    name: str
    case_id: str
    type: str  # MEMORY_DUMP, DISK_IMAGE, PACKET_CAPTURE, etc.
    source_host: str
    custodian: str
    notes: Optional[str] = None

class EvidenceArtifactCreate(EvidenceArtifactBase):
    expected_sha256: str

class EvidenceArtifactRead(EvidenceArtifactBase):
    id: str
    file_size_bytes: int
    file_size_human: str
    ingest_date: str
    hashes: HashCollection
    integrity_status: str  # VERIFIED, FAILED_VERIFICATION, PENDING_ANALYSIS, NOT_YET_VERIFIED
    last_verified_at: str
    signature_ed25519: str
    mitre_techniques: List[str] = []
    derived_artifact_count: int = 0
    anomaly_score: int = 0

class EvidenceVerifyRequest(BaseModel):
    artifact_id: str
    recompute_all_hashes: bool = True

class EvidenceVerifyResponse(BaseModel):
    artifact_id: str
    is_valid: bool
    status: str
    expected_sha256: str
    computed_sha256: str
    computed_sha512: str
    byte_count: int
    verified_at: str
    throughput_mb_s: float
    discrepancy_details: Optional[str] = None
