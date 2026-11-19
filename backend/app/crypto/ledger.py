"""Versioned custody proof verification without database or network access."""

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

from app.crypto.ed25519_signer import canonical_json, export_public_key_hex
from app.crypto.merkle import MerkleTree, hash_leaf, hash_pair
from app.schemas.custody import CustodyRecordRead, LedgerProofExport, SignedLedgerExport

GENESIS_HASH = "0" * 64


def block_payload(record: CustodyRecordRead) -> dict:
    return record.model_dump(exclude={"block_hash", "cryptographic_signature", "integrity_verified"})


def compute_block_hash(record: CustodyRecordRead) -> str:
    return hash_leaf(canonical_json(block_payload(record)).encode("utf-8"))


def verify_signature(public_key: Ed25519PublicKey, signature_hex: str, payload: dict) -> None:
    try:
        signature = bytes.fromhex(signature_hex)
        if signature.hex() != signature_hex:
            raise ValueError("Noncanonical signature encoding.")
        public_key.verify(signature, canonical_json(payload).encode("utf-8"))
    except (InvalidSignature, ValueError) as exc:
        raise InvalidSignature("Invalid Ed25519 signature.") from exc


def verify_block(record: CustodyRecordRead, public_key: Ed25519PublicKey) -> int:
    prefix, separator, suffix = record.id.partition("-")
    if prefix != "CUST" or not separator or not suffix.isascii() or not suffix.isdecimal() or len(suffix) > 19:
        raise InvalidSignature("Invalid custody record ID.")
    position = int(suffix)
    if (position < 1 or record.id != f"CUST-{position:03d}"
        or (position == 1 and record.previous_block_hash != GENESIS_HASH)
        or record.block_hash != compute_block_hash(record)):
        raise InvalidSignature("Invalid custody block.")
    marker = "SIG:ed25519:"
    if not record.cryptographic_signature.startswith(marker):
        raise InvalidSignature("Invalid custody signature format.")
    verify_signature(public_key, record.cryptographic_signature[len(marker):], {"block_hash": record.block_hash})
    return position


def verify_document(document: LedgerProofExport | SignedLedgerExport, public_key: Ed25519PublicKey,
                    case_id: str, organization_id: str | None = None) -> None:
    checkpoint = document.checkpoint
    if checkpoint.public_key_hex != export_public_key_hex(public_key):
        raise InvalidSignature("The checkpoint key does not match the trusted public key.")
    if checkpoint.case_ids != [case_id] or (organization_id is not None and checkpoint.organization_id != organization_id):
        raise InvalidSignature("The checkpoint does not match the expected scope.")
    verify_signature(public_key, checkpoint.signature_hex, checkpoint.model_dump(exclude={"signature_hex"}))
    if checkpoint.proofs_available != (checkpoint.block_count > 0):
        raise InvalidSignature("The checkpoint record count is inconsistent.")

    if isinstance(document, SignedLedgerExport):
        verify_signature(public_key, document.signature_hex, document.model_dump(exclude={"signature_hex"}))
        if len(document.records) != checkpoint.block_count:
            raise InvalidSignature("The export record count does not match its checkpoint.")
        last_position = 0
        last_hash = GENESIS_HASH
        for record in document.records:
            position = verify_block(record, public_key)
            if (not record.integrity_verified or position <= last_position
                or (position == last_position + 1 and record.previous_block_hash != last_hash)):
                raise InvalidSignature("The export record order or chain links are invalid.")
            last_position, last_hash = position, record.block_hash
        tree = MerkleTree([record.block_hash for record in document.records])
        if (tree.root or GENESIS_HASH) != checkpoint.root_hash:
            raise InvalidSignature("The export Merkle root does not match its checkpoint.")
    else:
        if not document.record.integrity_verified:
            raise InvalidSignature("The proof record is marked invalid.")
        verify_block(document.record, public_key)
        _verify_proof(document)


def _verify_proof(document: LedgerProofExport) -> None:
    width, index = document.checkpoint.block_count, document.leaf_index
    digest = document.record.block_hash
    if index >= width:
        raise InvalidSignature("The proof leaf index is outside the checkpoint.")
    for step in document.audit_path:
        expected_side = "L" if index % 2 else "R"
        if (width <= 1 or step.side != expected_side
            or (expected_side == "R" and index + 1 >= width and step.sibling_hash != digest)):
            raise InvalidSignature("Invalid Merkle proof path.")
        digest = hash_pair(step.sibling_hash, digest) if step.side == "L" else hash_pair(digest, step.sibling_hash)
        index //= 2
        width = (width + 1) // 2
    if width != 1 or digest != document.checkpoint.root_hash:
        raise InvalidSignature("The proof does not match the signed Merkle root.")
