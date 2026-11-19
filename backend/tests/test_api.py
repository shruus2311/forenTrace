from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
import json
import os
import subprocess
import sys
from threading import Barrier

import pytest
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient
from app.core.config import settings
from app.crypto.ed25519_signer import export_public_key_hex
from app.crypto.ledger import verify_document
from app.main import app
from app.schemas.custody import LedgerProofExport, SignedLedgerExport
from app.services.custody_ledger import CustodyLedgerService
from app.services.evidence_vault import EvidenceVaultService

client = TestClient(app)

@pytest.fixture(autouse=True)
def enable_demo_api(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "FORENTRACE_SEED_DEMO", True)
    monkeypatch.setattr(settings, "EVIDENCE_VAULT_DIR", tmp_path)
    vault = EvidenceVaultService()
    monkeypatch.setattr("app.api.v1.evidence.evidence_vault_service", vault)
    monkeypatch.setattr("app.api.v1.custody.evidence_vault_service", vault)
    monkeypatch.setattr("app.services.custody_ledger.evidence_vault_service", vault)
    monkeypatch.setattr("app.api.v1.custody.custody_ledger_service", CustodyLedgerService())


def test_evidence_api_requires_explicit_demo_mode_without_database(monkeypatch):
    monkeypatch.setattr(settings, "FORENTRACE_SEED_DEMO", False)
    assert client.get("/api/v1/evidence").status_code == 503

def test_concurrent_demo_initializers_publish_complete_fixtures(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "EVIDENCE_VAULT_DIR", tmp_path)
    ready = Barrier(2)

    def initialize():
        ready.wait(timeout=5)
        return [item.hashes.sha256 for item in EvidenceVaultService().list_artifacts()]

    with ThreadPoolExecutor(max_workers=2) as executor:
        first = executor.submit(initialize)
        second = executor.submit(initialize)
        assert len(first.result()) == 3
        assert first.result() == second.result()

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


def test_demo_evidence_and_ledger_apply_explicit_scope():
    vault = EvidenceVaultService()
    assert vault.get_artifact("EVD-9801", []) is None
    assert vault.get_artifact("EVD-9801", ["case-01"]).id == "EVD-9801"
    assert vault.list_artifacts(["case-01"], ids=[]) == []
    assert vault.list_artifacts(["case-01"], ids=["EVD-9801"], excluded_ids=["EVD-9801"]) == []
    export = CustodyLedgerService().export_ledger(None, "case-01", excluded_ids=["EVD-9801"])
    assert {record.evidence_id for record in export.records} == {"EVD-9802", "EVD-9805"}

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


def test_offline_custody_exports(tmp_path, monkeypatch):
    service = CustodyLedgerService()
    monkeypatch.setattr("app.api.v1.custody.custody_ledger_service", service)
    params = {"case_id": "case-01"}
    export_response = client.get("/api/v1/custody/export", params=params)
    proof_response = client.get("/api/v1/custody/CUST-003/proof", params=params)
    for response in (export_response, proof_response):
        assert response.status_code == 200
        assert response.headers["content-disposition"].startswith("attachment;")
    export = SignedLedgerExport.model_validate(export_response.json())
    proof = LedgerProofExport.model_validate(proof_response.json())
    assert len(export.records) == 3 and proof.leaf_index == 2
    assert export.checkpoint.root_hash == proof.checkpoint.root_hash
    verify_document(export, service.pub_key, "case-01")
    verify_document(proof, service.pub_key, "case-01")
    with pytest.raises(InvalidSignature):
        verify_document(export, Ed25519PrivateKey.generate().public_key(), "case-01")
    with pytest.raises(InvalidSignature):
        verify_document(export, service.pub_key, "wrong-case")

    for mutate in (
        lambda data: data["records"].pop(),
        lambda data: data["records"].reverse(),
        lambda data: data["checkpoint"].update(timestamp="2042-01-01T00:00:00Z"),
    ):
        tampered = deepcopy(export_response.json())
        mutate(tampered)
        with pytest.raises(InvalidSignature):
            verify_document(SignedLedgerExport.model_validate(tampered), service.pub_key, "case-01")

    tampered = proof_response.json()
    tampered["audit_path"][0]["sibling_hash"] = "f" * 64
    with pytest.raises(InvalidSignature):
        verify_document(LedgerProofExport.model_validate(tampered), service.pub_key, "case-01")
    with pytest.raises(InvalidSignature):
        verify_document(proof.model_copy(update={"leaf_index": 3}), service.pub_key, "case-01")

    trusted_key = tmp_path / "trusted-pubkey.hex"
    trusted_key.write_text(export_public_key_hex(service.pub_key), encoding="utf-8")
    exported_file = tmp_path / "proof.json"
    exported_file.write_bytes(proof_response.content)
    command = [sys.executable, "-m", "app.verify_ledger", "verify", str(exported_file),
               "--public-key", str(trusted_key), "--case-id", "case-01"]
    env = {**os.environ, "FORENTRACE_DATABASE_URL": "unusable-database-url"}
    assert subprocess.run(command, env=env, capture_output=True, timeout=10).returncode == 0
    invalid_index = proof_response.json()
    invalid_index["leaf_index"] = 0
    exported_file.write_text(json.dumps(invalid_index), encoding="utf-8")
    assert subprocess.run(command, env=env, capture_output=True, timeout=10).returncode == 1
