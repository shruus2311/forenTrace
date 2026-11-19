from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, model_serializer

HexDigest = Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]
SignatureHex = Annotated[str, Field(pattern=r"^[a-f0-9]{128}$")]

class CustodyRecordCreate(BaseModel):
    evidence_id: str
    evidence_name: str
    transferred_from: str
    transferred_to: str
    purpose: str
    location: str
    witness_key: str

class CustodyRecordRead(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: str
    record_number: str
    timestamp: str
    evidence_id: str
    evidence_name: str
    transferred_from: str
    transferred_to: str
    purpose: str
    location: str
    cryptographic_signature: str
    witness_key: str
    integrity_verified: bool
    previous_block_hash: str
    block_hash: str
    event_type: Literal["emergency_access_intent"] | None = None

    @model_serializer(mode="wrap")
    def preserve_transfer_format(self, serialize):
        payload = serialize(self)
        if self.event_type is None:
            payload.pop("event_type", None)
        return payload

class MerkleCheckpointRead(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    format: Literal["forentrace.checkpoint.v1"]
    checkpoint_id: str
    root_hash: HexDigest
    block_count: int = Field(ge=0)
    timestamp: str
    proofs_available: bool
    organization_id: str | None
    case_ids: list[str] | None
    public_key_hex: HexDigest
    signature_hex: SignatureHex
    visibility: Literal["policy-filtered"] | None = None

    @model_serializer(mode="wrap")
    def preserve_checkpoint_format(self, serialize):
        payload = serialize(self)
        if self.visibility is None:
            payload.pop("visibility", None)
        return payload


class LedgerProofStep(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    sibling_hash: HexDigest
    side: Literal["L", "R"]


class LedgerProofExport(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    format: Literal["forentrace.ledger-proof.v1"]
    checkpoint: MerkleCheckpointRead
    record: CustodyRecordRead
    leaf_index: int = Field(ge=0)
    audit_path: list[LedgerProofStep]


class SignedLedgerExport(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    format: Literal["forentrace.ledger-export.v1"]
    checkpoint: MerkleCheckpointRead
    records: list[CustodyRecordRead]
    signature_hex: SignatureHex
