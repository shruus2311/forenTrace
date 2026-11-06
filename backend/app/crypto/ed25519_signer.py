import json
import time
from typing import Dict, Any, Tuple
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization
from cryptography.exceptions import InvalidSignature
from pydantic import BaseModel

class ManifestSignature(BaseModel):
    signer_id: str
    public_key_hex: str
    signature_hex: str
    canonical_payload: str
    signed_at: str

class VerificationSignatureResult(BaseModel):
    is_valid: bool
    signer_id: str
    public_key_hex: str
    verified_at: str
    error: str | None = None

def generate_ed25519_keypair() -> Tuple[ed25519.Ed25519PrivateKey, ed25519.Ed25519PublicKey]:
    """Generates a secure, cryptographically random Ed25519 keypair."""
    private_key = ed25519.Ed25519PrivateKey.generate()
    public_key = private_key.public_key()
    return private_key, public_key

def export_public_key_hex(public_key: ed25519.Ed25519PublicKey) -> str:
    """Exports raw 32-byte public key as hex string."""
    raw_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw
    )
    return raw_bytes.hex()

def import_public_key_hex(public_key_hex: str) -> ed25519.Ed25519PublicKey:
    """Imports 32-byte public key from hex string."""
    raw_bytes = bytes.fromhex(public_key_hex.strip())
    return ed25519.Ed25519PublicKey.from_public_bytes(raw_bytes)

def canonical_json(data: Dict[str, Any]) -> str:
    """Produces deterministic, sorted, whitespace-stripped canonical JSON string."""
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False)

def sign_manifest(
    private_key: ed25519.Ed25519PrivateKey,
    manifest_data: Dict[str, Any],
    signer_id: str
) -> ManifestSignature:
    """
    Signs a canonical evidentiary manifest using an Ed25519 private key.
    Produces tamper-evident digital seal.
    """
    payload_str = canonical_json(manifest_data)
    payload_bytes = payload_str.encode("utf-8")
    
    signature_bytes = private_key.sign(payload_bytes)
    pub_key_hex = export_public_key_hex(private_key.public_key())
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    return ManifestSignature(
        signer_id=signer_id,
        public_key_hex=pub_key_hex,
        signature_hex=signature_bytes.hex(),
        canonical_payload=payload_str,
        signed_at=timestamp,
    )

def verify_manifest_signature(
    manifest_signature: ManifestSignature
) -> VerificationSignatureResult:
    """
    Cryptographically verifies an Ed25519 signature against the canonical manifest payload.
    Returns explicit failure if the payload was modified by even 1 single bit.
    """
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    try:
        public_key = import_public_key_hex(manifest_signature.public_key_hex)
        sig_bytes = bytes.fromhex(manifest_signature.signature_hex)
        payload_bytes = manifest_signature.canonical_payload.encode("utf-8")

        public_key.verify(sig_bytes, payload_bytes)
        return VerificationSignatureResult(
            is_valid=True,
            signer_id=manifest_signature.signer_id,
            public_key_hex=manifest_signature.public_key_hex,
            verified_at=timestamp,
            error=None
        )
    except InvalidSignature:
        return VerificationSignatureResult(
            is_valid=False,
            signer_id=manifest_signature.signer_id,
            public_key_hex=manifest_signature.public_key_hex,
            verified_at=timestamp,
            error="INVALID_SIGNATURE: Cryptographic signature mismatch. Manifest data has been altered."
        )
    except Exception as e:
        return VerificationSignatureResult(
            is_valid=False,
            signer_id=manifest_signature.signer_id,
            public_key_hex=manifest_signature.public_key_hex,
            verified_at=timestamp,
            error=f"VERIFICATION_ERROR: {str(e)}"
        )
