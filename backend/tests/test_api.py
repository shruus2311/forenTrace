from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "HEALTHY"
    assert "Ed25519" in data["crypto_engine"]

def test_evidence_api_list_and_verify():
    # 1. List evidence
    res = client.get("/api/v1/evidence")
    assert res.status_code == 200
    artifacts = res.json()
    assert len(artifacts) >= 3

    # Check EVD-9801 is present
    target = next((a for a in artifacts if a["id"] == "EVD-9801"), None)
    assert target is not None
    assert target["name"] == "DC01_PHYSICAL_RAM_IMAGE.raw"
    assert target["integrity_status"] == "VERIFIED"

    # 2. Trigger real streaming hash verification
    verify_res = client.post("/api/v1/evidence/EVD-9801/verify")
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["is_valid"] is True
    assert v_data["status"] == "VERIFIED"
    assert v_data["computed_sha256"] == target["hashes"]["sha256"]
    assert v_data["byte_count"] > 0
    assert v_data["throughput_mb_s"] > 0

def test_custody_api_list_append_and_merkle():
    # 1. List custody records
    res = client.get("/api/v1/custody")
    assert res.status_code == 200
    records = res.json()
    assert len(records) >= 3

    # 2. Append new signed custody block
    new_block_data = {
        "evidence_id": "EVD-9801",
        "evidence_name": "DC01_PHYSICAL_RAM_IMAGE.raw",
        "transferred_from": "ForenTrace Triage Lab",
        "transferred_to": "Federal Secure Evidentiary Locker 04",
        "purpose": "Custody transfer for federal grand jury presentation",
        "location": "Federal Vault 12",
        "witness_key": "HW_TOKEN_TEST_9082"
    }
    append_res = client.post("/api/v1/custody", json=new_block_data)
    assert append_res.status_code == 201
    created_block = append_res.json()
    assert created_block["evidence_id"] == "EVD-9801"
    assert created_block["integrity_verified"] is True
    assert "SIG:ed25519:" in created_block["cryptographic_signature"]
    assert len(created_block["block_hash"]) == 64

    # 3. Check Merkle checkpoint root
    merkle_res = client.get("/api/v1/custody/merkle-checkpoint")
    assert merkle_res.status_code == 200
    m_data = merkle_res.json()
    assert len(m_data["root_hash"]) == 64
    assert m_data["block_count"] >= 4
