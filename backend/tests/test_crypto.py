import io
import tempfile
from pathlib import Path
import pytest

from app.crypto.hasher import (
    compute_stream_fingerprint,
    compute_file_fingerprint,
    verify_file_integrity,
)
from app.crypto.ed25519_signer import (
    generate_ed25519_keypair,
    sign_manifest,
    verify_manifest_signature,
    ManifestSignature,
)
from app.crypto.merkle import MerkleTree, hash_leaf

def test_streaming_hasher_known_vector():
    # Test with standard known payload
    test_data = b"FORENTRACE_EVIDENCE_PAYLOAD_TEST_VAD_0x7FFF"
    stream = io.BytesIO(test_data)
    fp = compute_stream_fingerprint(stream)

    assert len(fp.sha256) == 64
    assert len(fp.sha512) == 128
    assert len(fp.md5) == 32
    assert fp.byte_count == len(test_data)

def test_file_integrity_verification_success_and_tamper():
    with tempfile.NamedTemporaryFile("wb", delete=False) as f:
        f.write(b"VERIFIED_EVIDENCE_BITSTREAM_CORRECT")
        temp_path = f.name

    try:
        # 1. Compute valid fingerprint
        fp = compute_file_fingerprint(temp_path)
        valid_res = verify_file_integrity(temp_path, fp.sha256)
        assert valid_res.is_valid is True
        assert valid_res.discrepancy_details is None

        # 2. Tamper with expected hash (tamper detection test)
        tampered_hash = fp.sha256[:-4] + "0000"
        tampered_res = verify_file_integrity(temp_path, tampered_hash)
        assert tampered_res.is_valid is False
        assert "CRITICAL EVIDENCE CORRUPTION" in tampered_res.discrepancy_details
    finally:
        Path(temp_path).unlink(missing_ok=True)

def test_ed25519_digital_manifest_signing_and_tamper():
    priv, pub = generate_ed25519_keypair()
    manifest = {
        "artifact_id": "EVD-TEST-001",
        "sha256": "a19f88c347d19e9284210e3952ba5c8321049281de37bc01289456ef198a2301",
        "custodian": "Agent Thorne",
        "timestamp": "2026-11-06T12:00:00Z"
    }

    # Sign manifest
    sig = sign_manifest(priv, manifest, signer_id="HW_KEY_9082")
    assert sig.signer_id == "HW_KEY_9082"
    assert len(sig.signature_hex) == 128  # Ed25519 is 64 bytes = 128 hex chars

    # Verify signature passes
    v_res = verify_manifest_signature(sig)
    assert v_res.is_valid is True
    assert v_res.error is None

    # Tamper with payload (modify 1 bit)
    tampered_sig = ManifestSignature(
        signer_id=sig.signer_id,
        public_key_hex=sig.public_key_hex,
        signature_hex=sig.signature_hex,
        canonical_payload=sig.canonical_payload.replace("Agent Thorne", "Adversary"),
        signed_at=sig.signed_at
    )
    tampered_v_res = verify_manifest_signature(tampered_sig)
    assert tampered_v_res.is_valid is False
    assert "INVALID_SIGNATURE" in tampered_v_res.error

def test_merkle_tree_root_and_inclusion_proof():
    records = [
        b"CUSTODY_BLOCK_001_RAM_CAPTURE",
        b"CUSTODY_BLOCK_002_E01_IMAGE",
        b"CUSTODY_BLOCK_003_PCAP_STREAM",
        b"CUSTODY_BLOCK_004_CARVED_LOADER",
    ]
    leaf_hashes = [hash_leaf(r) for r in records]

    tree = MerkleTree(leaf_hashes)
    assert tree.root is not None
    assert len(tree.root) == 64

    # Verify inclusion proof for block 2
    proof = tree.get_proof(2)
    assert proof.is_valid is True
    assert proof.root_hash == tree.root

    # Alter root - verification must fail
    fake_root = "0" * 64
    assert tree.verify_proof(proof.leaf_hash, proof.audit_path, fake_root) is False
