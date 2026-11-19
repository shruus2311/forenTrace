import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from uuid import uuid4

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from psycopg import connect, sql
from psycopg.conninfo import make_conninfo


def test_seals_and_custody_survive_restart(tmp_path):
    url = os.environ.get("FORENTRACE_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Run with FORENTRACE_TEST_DATABASE_URL to enable PostgreSQL integration")

    vault = tmp_path / "vault"
    backend = Path(__file__).resolve().parents[1]
    shutil.copytree(backend / "data" / "vault", vault)
    key_file = tmp_path / "signing-key"
    key_file.write_bytes(Ed25519PrivateKey.generate().private_bytes_raw())
    schema = f"test_forentrace_{uuid4().hex}"
    env = {
        **{key: value for key, value in os.environ.items()
           if not key.startswith(("FORENTRACE_S3_", "FORENTRACE_OPENSEARCH_", "FORENTRACE_NEO4J_"))},
        "PYTHONPATH": str(backend),
        "EVIDENCE_VAULT_DIR": str(vault),
        "ANALYSIS_ARTIFACTS_DIR": str(tmp_path / "artifacts"),
        "FORENTRACE_DATABASE_URL": make_conninfo(url, options=f"-c search_path={schema}"),
        "FORENTRACE_SIGNING_KEY_FILE": str(key_file),
        "FORENTRACE_SEED_DEMO": "true",
        "FORENTRACE_COOKIE_SECURE": "false",
        "FORENTRACE_MAX_UPLOAD_BYTES": "1024",
    }
    if os.environ.get("FORENTRACE_TEST_S3_ENDPOINT"):
        for name in ("ENDPOINT", "BUCKET", "ACCESS_KEY", "SECRET_KEY"):
            env[f"FORENTRACE_S3_{name}"] = os.environ[f"FORENTRACE_TEST_S3_{name}"]
        env["FORENTRACE_S3_RETENTION_DAYS"] = "1"

    def run_api(script, *, timeout=30):
        preamble = """
import json
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.crypto.ledger import verify_document
from app.core.database import database
from app.main import app
from app.provision import provision
from app.schemas.custody import LedgerProofExport, SignedLedgerExport

client = TestClient(app)
evidence = '/api/v1/evidence/EVD-9801'
custody = '/api/v1/custody'
login = '/api/v1/auth/login'
password = 'controlled-test-password'
assert client.get(evidence).status_code == 401
assert client.get(custody).status_code == 401
assert client.get(custody + '/export', params={'case_id': 'case-01'}).status_code == 401
with patch('app.provision.getpass', return_value=password):
    provision('demo', 'investigator', 'case-01', 'investigator')
assert client.post(login, json={'username': 'investigator', 'password': password}).status_code == 200
"""
        result = subprocess.run(
            [sys.executable, "-c", preamble + script],
            env=env, capture_output=True, text=True, timeout=timeout,
        )
        assert result.returncode == 0, result.stderr
        return json.loads(result.stdout)

    with connect(url, autocommit=True) as admin:
        admin.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
        try:
            with connect(env["FORENTRACE_DATABASE_URL"]) as legacy:
                legacy.execute("""
                    CREATE TABLE forentrace_evidence (
                        id text PRIMARY KEY, manifest jsonb NOT NULL, integrity_status text, verified_at text
                    );
                    INSERT INTO forentrace_evidence (id, manifest) VALUES ('legacy-unassigned', '{}');
                """)
            baseline = run_api("""
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from fastapi import HTTPException
from app.core.access import login as authenticate

assert client.get('/api/v1/auth/session').json()['cases'] == [{'id': 'case-01', 'role': 'investigator'}]
assert client.get('/api/v1/evidence/legacy-unassigned').status_code == 404
assert client.get('/api/v1/evidence').headers['cache-control'] == 'no-store'
assert client.post(login, json={'username': 'investigator', 'password': 'wrong'}).status_code == 401
limited_bucket = sha256(chr(0).join(('user:192.0.2.10', 'investigator')).encode()).hexdigest()
available_bucket = sha256(chr(0).join(('user:192.0.2.11', 'investigator')).encode()).hexdigest()
with database.connect() as conn:
    conn.execute(
        "INSERT INTO forentrace_login_attempts (bucket, count, expires_at) VALUES (%s, 10, now() + interval '15 minutes')",
        (limited_bucket,),
    )
for host, attempted_password, expected_status in (
    ('192.0.2.10', password, 429), ('192.0.2.11', 'wrong', 401),
):
    try:
        authenticate('investigator', attempted_password, host, None)
        raise AssertionError('Authentication should have been blocked')
    except HTTPException as error:
        assert error.status_code == expected_status
assert authenticate('investigator', password, '192.0.2.11', None)[0].username == 'investigator'
with database.connect() as conn:
    assert conn.execute("SELECT count FROM forentrace_login_attempts WHERE bucket = %s",
                        (available_bucket,)).fetchone() is None
assert client.post(login, headers={'Origin': 'https://untrusted.example'},
                   json={'username': 'investigator', 'password': password}).status_code == 403
with patch('app.provision.getpass', return_value=password):
    provision('demo', 'viewer', 'case-01', 'viewer')
    provision('demo', 'other', 'case-other', 'investigator')
    provision('north', 'outsider', 'north-case', 'investigator')

def account(username):
    result = TestClient(app)
    response = result.post(login, json={'username': username, 'password': password})
    assert response.status_code == 200
    assert 'HttpOnly' in response.headers['set-cookie'] and 'SameSite=strict' in response.headers['set-cookie']
    return result

def register(account, case, content=b'auth fixture', **params):
    return account.post('/api/v1/evidence',
        params={'case_id': case, 'filename': 'test.txt', 'type': 'OTHER', **params},
        content=content, headers={'Content-Type': 'application/octet-stream'})

viewer, other, outsider = account('viewer'), account('other'), account('outsider')
assert viewer.get(evidence).status_code == 200
assert viewer.post(evidence + '/verify').status_code == 404
assert register(viewer, 'case-01').status_code == 403
assert other.get(evidence).status_code == 404
assert register(other, 'case-01').status_code == 403
assert outsider.get(custody).json() == []
assert outsider.get('/api/v1/evidence', params={'case_id': 'case-01'}).status_code == 403
assert register(outsider, 'case-01').status_code == 403
foreign = register(outsider, 'north-case')
assert foreign.status_code == 201 and foreign.json()['integrity_status'] == 'NOT_YET_VERIFIED'
assert client.get('/api/v1/evidence/' + foreign.json()['id']).status_code == 404
assert register(client, 'case-01', content=b'x' * 1025).status_code == 413
assert register(client, 'case-01', expected_sha256='0' * 64).status_code == 422
assert register(client, 'case-01', filename='../outside').status_code == 422
registered = register(client, 'case-01', expected_sha256=sha256(b'auth fixture').hexdigest())
assert registered.status_code == 201, registered.text
assert registered.json()['custodian'] == 'investigator'
assert registered.json()['integrity_status'] == 'VERIFIED'
assert client.post('/api/v1/evidence/' + registered.json()['id'] + '/verify').json()['is_valid']
assert [item['name'] for item in client.get('/api/v1/evidence').json()].count('test.txt') == 1
captured = viewer.cookies.get('forentrace_session')
assert viewer.post('/api/v1/auth/logout').status_code == 204
viewer.cookies.set('forentrace_session', captured)
assert viewer.get(evidence).status_code == 401

manifest = client.get(evidence).json()
assert client.post(evidence + '/verify').json()['is_valid']
transfer = {
    'evidence_id': manifest['id'], 'evidence_name': manifest['name'],
    'transferred_from': 'Intake', 'transferred_to': 'Secure storage',
    'purpose': 'Controlled test', 'location': 'Test vault', 'witness_key': 'Test',
}
assert account('viewer').post(custody, json=transfer).status_code == 404
assert outsider.post(custody, json=transfer).status_code == 404
foreign_transfer = outsider.post(custody, json={**transfer, 'evidence_id': foreign.json()['id']}).json()
assert foreign_transfer['evidence_id'] == foreign.json()['id']
with ThreadPoolExecutor() as executor:
    responses = list(executor.map(lambda _: client.post(custody, json=transfer), range(3)))
assert all(response.status_code == 201 for response in responses)
chain = client.get(custody).json()
assert len(chain) == 6 and all(block['integrity_verified'] for block in chain)
assert foreign_transfer['id'] not in {block['id'] for block in chain}
assert client.get(custody + '/' + foreign_transfer['id'] + '/proof',
                  params={'case_id': 'case-01'}).status_code == 404
assert outsider.get(custody + '/export', params={'case_id': 'case-01'}).status_code == 403
viewer = account('viewer')
params = {'case_id': 'case-01'}
exported = SignedLedgerExport.model_validate(viewer.get(custody + '/export', params=params).json())
proof = LedgerProofExport.model_validate(viewer.get(custody + '/' + chain[0]['id'] + '/proof', params=params).json())
trusted_key = database.signing_key.public_key()
verify_document(exported, trusted_key, 'case-01', 'demo')
verify_document(proof, trusted_key, 'case-01', 'demo')
assert [block.id for block in exported.records] == [block['id'] for block in reversed(chain)]
print(json.dumps({
    'digest': manifest['hashes']['sha256'],
    'signature': manifest['signature_ed25519'],
    'head': chain[0]['block_hash'],
    'root': client.get(custody + '/merkle-checkpoint').json()['root_hash'],
    'registered_id': registered.json()['id'],
}))
""")
            (vault / "DC01_PHYSICAL_RAM_IMAGE.raw").write_bytes(b"modified in the isolated test vault")
            restarted = run_api("""
manifest = client.get(evidence).json()
registered = next(item for item in client.get('/api/v1/evidence').json() if item['name'] == 'test.txt')
assert client.post('/api/v1/evidence/' + registered['id'] + '/verify').json()['is_valid']
result = client.post(evidence + '/verify').json()
assert result['is_valid'] is False
assert result['expected_sha256'] == manifest['hashes']['sha256']
assert client.get(evidence).json()['integrity_status'] == 'FAILED_VERIFICATION'
chain = client.get(custody).json()
assert len(chain) == 6 and all(block['integrity_verified'] for block in chain)
print(json.dumps({
    'digest': result['expected_sha256'],
    'signature': manifest['signature_ed25519'],
    'head': chain[0]['block_hash'],
    'root': client.get(custody + '/merkle-checkpoint').json()['root_hash'],
    'registered_id': registered['id'],
}))
""")
            assert restarted == baseline
            assert run_api("""
import os
import subprocess
import sys
from app.ingest_kev import ingest
from app.schemas.analysis import FileReport
from app.services.analysis import claim, finish
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier, Event
from psycopg.errors import LockNotAvailable
from app.crypto.hasher import compute_stream_fingerprint

hashed, release = Event(), Event()
def pause_after_hash(source):
    fingerprint = compute_stream_fingerprint(source)
    hashed.set()
    assert release.wait(timeout=10)
    return fingerprint

with patch('app.services.evidence_vault.compute_stream_fingerprint', side_effect=pause_after_hash):
    with ThreadPoolExecutor(max_workers=1) as pool:
        verification = pool.submit(client.post, '/api/v1/evidence/EVD-9802/verify')
        try:
            assert hashed.wait(timeout=10)
            with database.connect() as conn:
                try:
                    conn.execute("SELECT id FROM forentrace_evidence WHERE id = 'EVD-9802' FOR UPDATE NOWAIT")
                    raise AssertionError('Verification released its row lock before publication.')
                except LockNotAvailable:
                    pass
        finally:
            release.set()
        assert verification.result().json()['is_valid']

def provisioning_password(prompt):
    if prompt == 'New password: ':
        ready.wait(timeout=5)
    return password

def provision_same_user():
    try:
        provision('demo', 'race-user', 'case-01', 'viewer')
        return 'created'
    except ValueError as error:
        assert 'password you entered was not installed' in str(error)
        return 'conflict'

ready = Barrier(2)
with patch('app.provision.getpass', side_effect=provisioning_password), ThreadPoolExecutor(max_workers=2) as pool:
    assert sorted(pool.map(lambda _: provision_same_user(), range(2))) == ['conflict', 'created']

case = {'case_id': 'case-01'}
artifact = next(item for item in client.get('/api/v1/evidence').json() if item['name'] == 'test.txt')
body = {**case, 'evidence_id': artifact['id']}
worker_api = '/api/v1/analysis'
assert TestClient(app).get(worker_api + '/jobs', params=case).status_code == 401
reader = TestClient(app)
assert reader.post(login, json={'username': 'viewer', 'password': password}).status_code == 200
assert reader.post(worker_api + '/jobs', json=body).status_code == 403
outsider = TestClient(app)
assert outsider.post(login, json={'username': 'outsider', 'password': password}).status_code == 200
assert outsider.get(worker_api + '/jobs', params=case).status_code == 403
assert outsider.get(worker_api + '/lineage', params={**body, 'case_id': 'north-case'}).status_code == 404
foreign_matches = outsider.get(worker_api + '/search', params={
    'case_id': 'north-case', 'q': artifact['hashes']['sha256'],
}).json()['evidence']
assert foreign_matches and all(item['id'] != artifact['id'] for item in foreign_matches)
queued = client.post(worker_api + '/jobs', json=body)
assert queued.status_code == 202, queued.text
assert client.post(worker_api + '/jobs', json=body).json()['id'] == queued.json()['id']
if os.environ.get('FORENTRACE_TEST_FORENSIC_WORKER') == '1':
    subprocess.run([sys.executable, '-m', 'app.run_worker', '--once'], check=True, timeout=120)
else:
    job = claim()
    assert claim() is None
    assert finish(job, 'sha256:' + 'a' * 64, report=FileReport(
        format='forentrace.file-profile.v1', sha256=artifact['hashes']['sha256'],
        byte_count=artifact['file_size_bytes'], classification='Unknown',
    ))
lineage = reader.get(worker_api + '/lineage', params=body)
assert lineage.status_code == 200, lineage.text
reports = lineage.json()['reports']
assert len(reports) == 1 and reports[0]['status'] == 'completed', reports
assert reports[0]['input_sha256'] == artifact['hashes']['sha256']
assert len(reports[0]['result']['signature_hex']) == 128
if os.environ.get('FORENTRACE_S3_ENDPOINT'):
    from botocore.exceptions import ClientError
    from app.core.evidence_objects import client as s3_client
    storage = artifact['storage']
    assert storage['version']
    bucket, key = storage['bucket'], 'originals/' + artifact['id']
    assert s3_client().get_object_retention(Bucket=bucket, Key=key, VersionId=storage['version'])['Retention']['Mode'] == 'COMPLIANCE'
    try:
        s3_client().delete_object(Bucket=bucket, Key=key, VersionId=storage['version'])
        raise AssertionError('Protected original unexpectedly allowed deletion.')
    except ClientError as error:
        assert error.response['Error']['Code'] in {'AccessDenied', 'InvalidRequest'}
    later = s3_client().put_object(Bucket=bucket, Key=key, Body=b'new test object version')
    assert later['VersionId'] != storage['version']
    assert client.post('/api/v1/evidence/' + artifact['id'] + '/verify').json()['is_valid']
matching = client.get(worker_api + '/search', params={**case, 'q': 'Unknown'}).json()
assert [report['id'] for report in matching['reports']] == [queued.json()['id']]
assert outsider.get(worker_api + '/search', params={'case_id': 'north-case', 'q': 'Unknown'}).json()['reports'] == []

from app.run_worker import process
waiting = client.post(worker_api + '/jobs', json={**case, 'evidence_id': 'EVD-9802'}).json()
with database.connect() as conn:
    conn.execute("UPDATE forentrace_case_members SET role = 'viewer' WHERE username = 'investigator'")
try:
    process(claim(), 'sha256:' + 'a' * 64)
    denied = next(job for job in reader.get(worker_api + '/jobs', params=case).json() if job['id'] == waiting['id'])
    assert denied['status'] == 'failed' and 'write access' in denied['error']
finally:
    with database.connect() as conn:
        conn.execute("UPDATE forentrace_case_members SET role = 'investigator' WHERE username = 'investigator'")

catalog = {'catalogVersion': 'test-1', 'dateReleased': '2026-01-05T00:00:00Z', 'count': 1, 'vulnerabilities': [{
    'cveID': 'CVE-2026-12345', 'vendorProject': 'Fixture Vendor', 'product': 'Controlled Product',
    'vulnerabilityName': 'Controlled catalog title', 'shortDescription': 'Integration fixture',
    'requiredAction': 'Apply the approved update.', 'dateAdded': '2026-01-04', 'dueDate': '2026-01-15',
}]}
assert ingest(json.dumps(catalog).encode()) == 1
matches = reader.get(worker_api + '/search', params={**case, 'q': 'CVE-2026-12345'}).json()['intelligence']
assert len(matches) == 1 and matches[0]['source_mode'] == 'local_file'
from app.run_maintenance import run_due
from app.services.projections import sync_lineage, sync_search
from app.core.config import settings
from pydantic import SecretStr

with database.connect() as maintenance:
    maintenance.autocommit = True
    calls = []
    def import_scheduled():
        calls.append(1)
        assert ingest(json.dumps(catalog).encode(), allow_unchanged=True) == 0
    assert run_due(maintenance, 'test-feed', 111, 30, import_scheduled)
    assert run_due(maintenance, 'test-feed', 111, 30, import_scheduled)
    assert len(calls) == 1
    successful = maintenance.execute("SELECT last_success FROM forentrace_maintenance WHERE task = 'test-feed'").fetchone()
    maintenance.execute("UPDATE forentrace_maintenance SET next_due = now() WHERE task = 'test-feed'")
    def fail_feed():
        raise OSError('Controlled feed outage')
    assert not run_due(maintenance, 'test-feed', 111, 30, fail_feed)
    failed = maintenance.execute("SELECT last_success, last_error FROM forentrace_maintenance WHERE task = 'test-feed'").fetchone()
    assert failed == (successful[0], 'OSError')

assert client.post(worker_api + '/jobs', json={**body, 'analyzer': 'arbitrary-command'}).status_code == 422
if os.environ.get('FORENTRACE_TEST_FORENSIC_WORKER') == '1':
    jobs_by_analyzer = {}
    for analyzer in ('byte-entropy', 'text-metrics'):
        accepted = client.post(worker_api + '/jobs', json={**body, 'analyzer': analyzer})
        assert accepted.status_code == 202, accepted.text
        jobs_by_analyzer[analyzer] = accepted.json()['id']
        subprocess.run([sys.executable, '-m', 'app.run_worker', '--once'], check=True, timeout=120)
    completed = reader.get(worker_api + '/lineage', params=body).json()['reports']
    reports_by_analyzer = {job['analyzer']: job['result']['report'] for job in completed}
    assert reports_by_analyzer['text-metrics']['printable_ascii_bytes'] == len(b'auth fixture')
    assert reports_by_analyzer['text-metrics']['line_feeds'] == 0
    assert reports_by_analyzer['byte-entropy']['distinct_bytes'] == len(set(b'auth fixture'))
    assert 0 < reports_by_analyzer['byte-entropy']['entropy_millibits'] < 8000
    assert len(set(jobs_by_analyzer.values()) | {queued.json()['id']}) == 3

if os.environ.get('FORENTRACE_TEST_INDEXES') == '1':
    settings.FORENTRACE_OPENSEARCH_URL = os.environ['FORENTRACE_TEST_OPENSEARCH_URL']
    settings.FORENTRACE_NEO4J_URI = os.environ['FORENTRACE_TEST_NEO4J_URI']
    settings.FORENTRACE_NEO4J_PASSWORD = SecretStr(os.environ['FORENTRACE_TEST_NEO4J_PASSWORD'])
    with database.connect() as maintenance:
        maintenance.autocommit = True
        assert run_due(maintenance, 'test-search', 112, 2, sync_search)
        assert run_due(maintenance, 'test-lineage', 113, 2, sync_lineage)
    indexed = reader.get(worker_api + '/search', params={**case, 'q': 'CVE-2026-12345'})
    assert indexed.status_code == 200, indexed.text
    assert indexed.json()['intelligence'][0]['cve_id'] == 'CVE-2026-12345'
    indexed_report = reader.get(worker_api + '/search', params={**case, 'q': 'Unknown'})
    assert indexed_report.status_code == 200, indexed_report.text
    assert [item['id'] for item in indexed_report.json()['reports']] == [queued.json()['id']]
    assert outsider.get(worker_api + '/search', params={'case_id': 'north-case', 'q': 'Unknown'}).json()['reports'] == []
    graph = reader.get(worker_api + '/lineage', params=body)
    assert graph.status_code == 200, graph.text
    assert queued.json()['id'] in {job['id'] for job in graph.json()['reports']}
    assert outsider.get(worker_api + '/lineage', params={**body, 'case_id': 'north-case'}).status_code == 404

try:
    ingest(json.dumps(catalog).encode())
    raise AssertionError('Stale catalog unexpectedly replaced the active release.')
except ValueError:
    pass
with database.connect() as conn:
    conn.execute("UPDATE forentrace_analysis_jobs SET result = jsonb_set(result, '{report,classification}', "
                 "to_jsonb(%s::text)) WHERE evidence_id = %s AND analyzer = 'file-profile'", ('PDF', artifact['id']))
assert reader.get(worker_api + '/lineage', params=body).status_code == 409
print(json.dumps(True))
""", timeout=420)
            assert run_api("""
from app.schemas.custody import CustodyRecordCreate
from app.services.custody_ledger import custody_ledger_service
from app.services.evidence_vault import evidence_vault_service

original_list = evidence_vault_service.list_artifacts
def append_during_snapshot(cases, *, connection=None):
    artifacts = original_list(cases, connection=connection)
    if connection is not None:
        custody_ledger_service.append_record(CustodyRecordCreate(
            evidence_id='EVD-9801', evidence_name='DC01_PHYSICAL_RAM_IMAGE.raw',
            transferred_from='Intake', transferred_to='Storage', purpose='Concurrent transfer',
            location='Test vault', witness_key='Test',
        ))
    return artifacts

with patch.object(evidence_vault_service, 'list_artifacts', side_effect=append_during_snapshot):
    response = client.get(custody + '/export', params={'case_id': 'case-01'})
assert response.status_code == 200
assert response.json()['checkpoint']['block_count'] == 6
assert len(client.get(custody).json()) == 7
print(json.dumps(True))
""")

            with connect(env["FORENTRACE_DATABASE_URL"]) as conn:
                conn.execute("""
                    UPDATE forentrace_custody
                    SET record = record || '{"purpose": "altered"}'::jsonb WHERE position = 1
                """)
                conn.execute("""
                    UPDATE forentrace_evidence
                    SET manifest = manifest || '{"notes": "altered"}'::jsonb WHERE id = 'EVD-9801'
                """)
            assert run_api("""
assert client.get(evidence).status_code == 409
assert client.post(evidence + '/verify').status_code == 409
assert client.get(custody).status_code == 409
assert client.get(custody + '/merkle-checkpoint').status_code == 409
assert client.get(custody + '/export', params={'case_id': 'case-01'}).status_code == 409
print(json.dumps(True))
""")
            with connect(env["FORENTRACE_DATABASE_URL"]) as conn:
                conn.execute("""
                    UPDATE forentrace_evidence AS target SET manifest = source.manifest
                    FROM forentrace_evidence AS source
                    WHERE target.id = 'EVD-9801' AND source.id = 'EVD-9802'
                """)
            assert run_api("""
assert client.get(evidence).status_code == 409
assert client.get('/api/v1/evidence').status_code == 409
assert client.post(evidence + '/verify').status_code == 409
assert client.post('/api/v1/evidence/EVD-9802/verify').json()['is_valid']
print(json.dumps(True))
""")
        finally:
            admin.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))
