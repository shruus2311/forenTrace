from typing import List
from fastapi import APIRouter, HTTPException, status
from app.schemas.custody import CustodyRecordCreate, CustodyRecordRead, MerkleCheckpointRead
from app.services.custody_ledger import custody_ledger_service

router = APIRouter(prefix="/custody", tags=["Chain of Custody"])

@router.get("", response_model=List[CustodyRecordRead])
def list_custody_records():
    """Retrieves immutable, hash-linked chain-of-custody audit blocks."""
    return custody_ledger_service.list_records()

@router.post("", response_model=CustodyRecordRead, status_code=status.HTTP_201_CREATED)
def append_custody_record(record_in: CustodyRecordCreate):
    """
    Appends a new custody transfer record, digitally signed with Ed25519 and hash-linked
    to the preceding block.
    """
    return custody_ledger_service.append_record(record_in)

@router.get("/merkle-checkpoint", response_model=MerkleCheckpointRead)
def get_merkle_checkpoint():
    """Retrieves current Merkle tree root hash for ISO/IEC 27037 audit verification."""
    return custody_ledger_service.get_merkle_checkpoint()
