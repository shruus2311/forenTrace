from typing import Optional, List, Tuple
from pydantic import BaseModel

class CustodyRecordCreate(BaseModel):
    evidence_id: str
    evidence_name: str
    transferred_from: str
    transferred_to: str
    purpose: str
    location: str
    witness_key: str

class CustodyRecordRead(BaseModel):
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

class MerkleCheckpointRead(BaseModel):
    checkpoint_id: str
    root_hash: str
    block_count: int
    timestamp: str
    proofs_available: bool
