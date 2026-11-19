import os
import subprocess
import sys
from pathlib import Path
from uuid import uuid4

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from psycopg import connect, sql
from psycopg.conninfo import make_conninfo


def test_independent_head_and_interrupted_registrations(tmp_path):
    names = ("DATABASE_URL", "S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY", "S3_SECRET_KEY", "ANCHOR_BUCKET")
    config = {name: os.environ.get(f"FORENTRACE_TEST_{name}") for name in names}
    if not all(config.values()):
        pytest.skip("Supply disposable PostgreSQL and separate S3 evidence and anchor test buckets.")

    backend = Path(__file__).resolve().parents[1]
    signing_key = tmp_path / "signing-key"
    signing_key.write_bytes(Ed25519PrivateKey.generate().private_bytes_raw())
    schema = "test_durability_" + uuid4().hex
    env = {
        **{key: value for key, value in os.environ.items()
           if not key.startswith(("FORENTRACE_S3_", "FORENTRACE_LEDGER_ANCHOR_"))},
        "PYTHONPATH": str(backend),
        "EVIDENCE_VAULT_DIR": str(tmp_path / "vault"),
        "ANALYSIS_ARTIFACTS_DIR": str(tmp_path / "artifacts"),
        "FORENTRACE_DATABASE_URL": make_conninfo(config["DATABASE_URL"], options=f"-c search_path={schema}"),
        "FORENTRACE_SIGNING_KEY_FILE": str(signing_key),
        "FORENTRACE_SEED_DEMO": "false",
        "FORENTRACE_COOKIE_SECURE": "false",
        "FORENTRACE_S3_ENDPOINT": config["S3_ENDPOINT"],
        "FORENTRACE_S3_BUCKET": config["S3_BUCKET"],
        "FORENTRACE_S3_ACCESS_KEY": config["S3_ACCESS_KEY"],
        "FORENTRACE_S3_SECRET_KEY": config["S3_SECRET_KEY"],
        "FORENTRACE_S3_RETENTION_DAYS": "1",
        "FORENTRACE_LEDGER_ANCHOR_ENDPOINT": config["S3_ENDPOINT"],
        "FORENTRACE_LEDGER_ANCHOR_BUCKET": config["ANCHOR_BUCKET"],
        "FORENTRACE_LEDGER_ANCHOR_ACCESS_KEY": config["S3_ACCESS_KEY"],
        "FORENTRACE_LEDGER_ANCHOR_SECRET_KEY": config["S3_SECRET_KEY"],
        "FORENTRACE_LEDGER_ANCHOR_RETENTION_DAYS": "1",
        "FORENTRACE_LEDGER_ANCHOR_ID": "test-" + uuid4().hex,
    }

    def run(script):
        setup = """
from unittest.mock import patch
from uuid import UUID
from fastapi.testclient import TestClient
from app.core.database import database
from app.core.evidence_objects import StorageUnavailable
from app.core.ledger_anchor import AnchorUnavailable, LedgerAnchor
from app.main import app
from app.provision import provision
from app.services.custody_ledger import custody_ledger_service
from app.services.evidence_vault import evidence_vault_service

with patch('app.provision.getpass', return_value='controlled-durability-password'):
    provision('lab', 'investigator', 'durability', 'investigator')
client = TestClient(app, raise_server_exceptions=False)
assert client.post('/api/v1/auth/login',
    json={'username': 'investigator', 'password': 'controlled-durability-password'}).status_code == 200
case = {'case_id': 'durability'}
custody = '/api/v1/custody'
evidence = '/api/v1/evidence'
def transfer(evidence_id):
    return {'evidence_id': evidence_id, 'evidence_name': 'fixture',
            'transferred_from': 'Intake', 'transferred_to': 'Vault', 'purpose': 'Durability test',
            'location': 'Test lab', 'witness_key': ''}
transfer_key = {'Idempotency-Key': '7b0135d3-774f-4583-9130-37d463677670'}
"""
        result = subprocess.run([sys.executable, "-c", setup + script], env=env,
                                capture_output=True, text=True, timeout=90)
        assert result.returncode == 0, result.stdout + result.stderr

    def run_cli(module, *args):
        result = subprocess.run([sys.executable, "-m", module, *args], env=env,
                                capture_output=True, text=True, timeout=30)
        assert result.returncode == 0, result.stdout + result.stderr
        return result.stdout

    with connect(config["DATABASE_URL"], autocommit=True) as admin:
        admin.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
        try:
            run("""
from app.core.evidence_objects import store_original
assert client.get(custody, params=case).status_code == 503
assert client.get(custody + '/merkle-checkpoint', params=case).status_code == 503
assert custody_ledger_service.initialize_anchor() == 0

def interrupt_after_store(*args, **kwargs):
    store_original(*args, **kwargs)
    raise StorageUnavailable('Controlled lost object-store acknowledgement.')

def upload(key, data=b'controlled original'):
    return client.post(evidence, params={**case, 'filename': 'original.txt', 'type': 'OTHER'},
                       content=data, headers={'Content-Type': 'application/octet-stream', 'Idempotency-Key': key})

first = '2e1ad1e6-5aa0-4cf2-a655-1c14e4e29e70'
second = 'dedb8d56-b6b1-457f-873a-b4a56eabf1dd'
with patch('app.services.evidence_vault.store_original', side_effect=interrupt_after_store):
    assert upload(first).status_code == 503
    assert upload(second).status_code == 503
assert client.get(evidence, params=case).json() == []
with database.connect() as conn:
    saved = conn.execute("SELECT evidence_id FROM forentrace_evidence_registrations WHERE request_id = %s",
                         (UUID(first),)).fetchone()[0]
assert upload(first, b'different bytes').status_code == 409
retried = upload(first)
assert retried.status_code == 201, retried.text
assert retried.json()['id'] == saved
assert retried.json()['storage']['version'] == upload(first).json()['storage']['version']
assert len(client.get(evidence, params=case).json()) == 1
assert client.post(custody, json=transfer(saved)).status_code == 422
assert client.post(custody, json=transfer(saved),
                   headers={'Idempotency-Key': '12822116-3241-4637-9d5f-99bf45a5509d'}).status_code == 201
with patch.object(LedgerAnchor, 'write', side_effect=AnchorUnavailable('Controlled anchor outage.')):
    assert client.post(custody, json=transfer(saved), headers=transfer_key).status_code == 503
    assert client.get(custody + '/export', params=case).status_code == 503
with database.connect() as conn:
    assert conn.execute("SELECT position FROM forentrace_custody WHERE anchor_pending").fetchone() == (2,)
""")
            pending = "dedb8d56-b6b1-457f-873a-b4a56eabf1dd"
            assert pending in run_cli("app.recover_evidence")
            assert "Registration published as EVD-" in run_cli("app.recover_evidence", pending)
            assert pending not in run_cli("app.recover_evidence")
            run("""
from cryptography.exceptions import InvalidSignature

second = UUID('dedb8d56-b6b1-457f-873a-b4a56eabf1dd')
recovered = evidence_vault_service.recover_registration(second)
assert recovered.storage is not None
assert evidence_vault_service.recover_registration(second).storage == recovered.storage
assert client.post(evidence + '/' + recovered.id + '/verify').json()['is_valid']
assert len(client.get(evidence, params=case).json()) == 2
first = UUID('2e1ad1e6-5aa0-4cf2-a655-1c14e4e29e70')
saved = evidence_vault_service.recover_registration(first).id
retry = client.post(custody, json=transfer(saved), headers=transfer_key)
assert retry.status_code == 201, retry.text
assert retry.json()['id'] == 'CUST-002'
assert client.post(custody, json=transfer(recovered.id), headers=transfer_key).status_code == 409
chain = client.get(custody, params=case)
assert chain.status_code == 200, chain.text
assert len(chain.json()) == 2
head = LedgerAnchor(database.signing_key).read(2)
assert head.block_hash == chain.json()[0]['block_hash']
assert client.get(custody + '/export', params=case).status_code == 200
distinct = client.post(custody, json=transfer(saved),
                       headers={'Idempotency-Key': 'f6d7c1cd-fe4e-4519-aca9-b599a3e65348'})
assert distinct.status_code == 201 and distinct.json()['id'] == 'CUST-003'
assert custody_ledger_service.initialize_anchor() == 3
with database.connect() as conn:
    conn.execute("UPDATE forentrace_custody SET record = record || jsonb_build_object('purpose', 'Changed') WHERE position = 3")
try:
    custody_ledger_service.initialize_anchor()
except InvalidSignature:
    pass
else:
    raise AssertionError('An existing anchor confirmed a tampered custody record.')
with database.connect() as conn:
    conn.execute("DELETE FROM forentrace_custody WHERE position = 3")
assert client.get(custody, params=case).status_code == 409
assert client.get(custody + '/merkle-checkpoint', params=case).status_code == 409
assert client.get(custody + '/export', params=case).status_code == 409
assert client.post(custody, json=transfer(recovered.id), headers=transfer_key).status_code == 409
""")
        finally:
            admin.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))
