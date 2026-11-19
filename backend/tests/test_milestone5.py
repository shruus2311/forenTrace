import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from psycopg import connect, sql
from psycopg.conninfo import make_conninfo

from app.core.time_policy import TimePolicy


def test_overnight_policy_uses_the_opening_day_and_local_timezone():
    policy = TimePolicy(timezone="America/New_York", weekdays={1}, opens="22:00", closes="03:00", step_up_minutes=10)
    now = datetime(2026, 7, 7, 6, 30, tzinfo=timezone.utc)  # Tuesday 02:30 local, Monday's window.
    assert "passkey" in policy.restriction(now, None)
    assert policy.restriction(now, now.replace(minute=29)) is None
    assert "hours" in policy.restriction(now.replace(hour=7), now)
    assert "days" in policy.restriction(now.replace(day=8), now)
    assert "passkey" in policy.restriction(now, now.replace(minute=20))


def test_scoped_correlations_and_security_events(tmp_path):
    url = os.environ.get("FORENTRACE_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Configure a disposable PostgreSQL database for the Milestone 5 integration test.")
    key_file = tmp_path / "signing-key"
    key_file.write_bytes(Ed25519PrivateKey.generate().private_bytes_raw())
    schema = "test_milestone5_" + uuid4().hex
    env = {
        **{key: value for key, value in os.environ.items()
           if not key.startswith(("FORENTRACE_S3_", "FORENTRACE_LEDGER_ANCHOR_", "FORENTRACE_OPENSEARCH_", "FORENTRACE_NEO4J_"))},
        "PYTHONPATH": str(Path(__file__).resolve().parents[1]),
        "FORENTRACE_DATABASE_URL": make_conninfo(url, options=f"-c search_path={schema}"),
        "FORENTRACE_SIGNING_KEY_FILE": str(key_file),
        "FORENTRACE_COOKIE_SECURE": "false",
        "FORENTRACE_SEED_DEMO": "false",
        "FORENTRACE_WEBAUTHN_ORIGIN": "http://localhost:5173",
        "EVIDENCE_VAULT_DIR": str(tmp_path / "vault"),
        "ANALYSIS_ARTIFACTS_DIR": str(tmp_path / "artifacts"),
    }
    script = r'''
import json
import gzip
import os
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait
from datetime import timedelta
from hashlib import sha256
from threading import Event, Lock, current_thread
from time import monotonic, sleep
from types import SimpleNamespace
from unittest.mock import patch
from fastapi.testclient import TestClient
from fastapi import HTTPException
from psycopg.types.json import Jsonb
from app.core.database import database
from app.core.access import authenticate_password
from app.core.ledger_anchor import AnchorUnavailable
from app.crypto.ledger import verify_document
from app.ingest_intelligence import ingest as ingest_intelligence
from app.ingest_kev import ingest
from app.main import app
from app.passkey_invite import issue
from app.provision import provision
from app.schemas.analysis import AttackReport, CVEReport
from app.schemas.custody import SignedLedgerExport
from app.services.analysis import claim, finish
from app.services.emergency_access import approve, review as review_emergency

with patch('app.provision.getpass', return_value='milestone-five-synthetic-password'):
    provision('org', 'investigator', 'case-one', 'investigator')
    provision('org', 'investigator', 'case-two', 'investigator')
    provision('org', 'viewer', 'case-one', 'viewer')
    provision('org', 'resetter', 'case-one', 'investigator')
    provision('outside', 'outsider', 'case-outside', 'investigator')

def login(username, failures=0):
    client = TestClient(app)
    for _ in range(failures):
        assert client.post('/api/v1/auth/login', json={'username': username, 'password': 'wrong'}).status_code == 401
    assert client.post('/api/v1/auth/login', json={'username': username, 'password': 'milestone-five-synthetic-password'}).status_code == 200
    return client

client, viewer, outsider = login('investigator', 5), login('viewer'), login('outsider')
security = '/api/v1/security'
assert 'repeated_password_failures' in {row['kind'] for row in client.get(security + '/alerts').json()}
assert viewer.get(security + '/alerts').json() == []
assert client.get(security + '/passkeys').json()['credentials'] == []
assert client.post(security + '/passkeys/enroll/options', json={'password': 'wrong'}).status_code == 403
enrollment = security + '/passkeys/enroll/options'
password = {'password': 'milestone-five-synthetic-password'}
assert client.post(enrollment, json=password).status_code == 403
invited = {**password, 'enrollment_code': issue('investigator')}
assert viewer.post(enrollment, json=invited).status_code == 403
other_enrollment_session = login('investigator')
first_options = client.post(enrollment, json=invited)
assert first_options.status_code == 200
assert other_enrollment_session.post(enrollment, json=invited).status_code == 403
retried_options = client.post(enrollment, json=invited)
assert retried_options.status_code == 200 and first_options.json()['challenge'] != retried_options.json()['challenge']
assert client.post(security + '/passkeys/enroll/finish', json={}).status_code == 403
assert client.post(security + '/passkeys/enroll/finish', json={}).status_code == 409
assert client.post(enrollment, json=invited).status_code == 200
enrolled = SimpleNamespace(credential_id=b'enrollment-fixture', credential_public_key=b'fixture', sign_count=0)
with patch('app.api.v1.security.verify_registration_response', return_value=enrolled):
    assert client.post(security + '/passkeys/enroll/finish', json={}).status_code == 204
assert client.post(enrollment, json=invited).status_code == 403
with database.connect() as conn:
    conn.execute("UPDATE forentrace_sessions SET step_up_at = now() - interval '11 minutes' WHERE username = 'investigator'")
from webauthn.helpers import bytes_to_base64url
assert client.post(security + '/passkeys/' + bytes_to_base64url(enrolled.credential_id) + '/revoke', json=password).status_code == 403

# Put a CVE reference across the analyzer's read boundary and a non-token at the EOF.
data = b' ' * (1024 * 1024 - 6) + b'CVE-2021-44228 and T1059.001 and T1059.001x and cve-2026-55555x'
base = '/api/v1/evidence'
with patch('app.api.v1.evidence.fsync', side_effect=OSError('Controlled staging failure')), \
     patch('app.api.v1.evidence.evidence_vault_service.register') as register:
    staged = client.post(base, params={'case_id': 'case-one', 'filename': 'stage.txt', 'type': 'OTHER'},
                         content=b'fixture', headers={'Content-Type': 'application/octet-stream'})
    assert staged.status_code == 503 and 'staging' in staged.json()['detail']
    register.assert_not_called()
def upload(case, filename, content=data):
    headers = {'Content-Type': 'application/octet-stream'}
    if filename == 'source.txt':
        headers['Idempotency-Key'] = 'c124bf3e-6e42-4cf0-8907-073b96aba12b'
    response = client.post(base, params={'case_id': case, 'filename': filename, 'type': 'OTHER'},
                           content=content, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()['id']

first = upload('case-one', 'source.txt')
peer = upload('case-one', 'same-bytes.txt')
other_case = upload('case-two', 'separate-case.txt')
analysis = '/api/v1/analysis'
criteria = {'case_id': 'case-one', 'evidence_id': first}
assert client.post(analysis + '/jobs', json={**criteria, 'analyzer': 'cve-references'}).status_code == 202
lease_connection = database.connect()
lease_connection.execute('SELECT transaction_timestamp()')
ready_to_claim = lease_connection.execute('SELECT clock_timestamp() FROM pg_sleep(0.02)').fetchone()[0]
with patch.object(database, 'connect', return_value=lease_connection):
    job = claim()
assert job['started_at'] >= ready_to_claim
assert job['lease_until'] - job['started_at'] == timedelta(minutes=5)
image = 'sha256:' + '1' * 64
if os.environ.get('FORENTRACE_TEST_FORENSIC_WORKER') == '1':
    from app.run_worker import process, image_id
    process(job, image_id())
    jobs = client.get(analysis + '/jobs', params={'case_id': 'case-one'}).json()
    assert jobs[0]['result']['report']['cve_ids'] == ['CVE-2021-44228'], jobs
else:
    assert finish(job, image, report=CVEReport(format='forentrace.cve-references.v1', sha256=sha256(data).hexdigest(),
                                             byte_count=len(data), cve_ids=['CVE-2021-44228'], truncated=False))

def catalog(release, version):
    return json.dumps({'catalogVersion': version, 'dateReleased': release, 'count': 1, 'vulnerabilities': [
        {'cveID': 'CVE-2021-44228', 'vendorProject': 'Fixture', 'product': 'Fixture', 'vulnerabilityName': 'Fixture CVE',
         'shortDescription': 'Synthetic correlation source.', 'requiredAction': 'Review source.',
         'dateAdded': '2026-01-01', 'dueDate': '2026-02-01'}]}).encode()

assert ingest(catalog('2026-01-01T00:00:00Z', 'fixture-1')) == 1
route = analysis + '/correlations'
result = client.get(route, params=criteria)
assert result.status_code == 200, result.text
matches = {item['kind']: item for item in result.json()}
assert matches['direct_observation']['related_id'] == peer
assert other_case not in result.text
cve = matches['external_intelligence_match']
assert cve['report_id'] == str(job['id']) and cve['value'] == 'CVE-2021-44228'
review = route + '/' + cve['id']
assert outsider.get(route, params=criteria).status_code == 403
assert viewer.put(review, params=criteria, json={'decision': 'confirmed'}).status_code == 403
assert client.put(review, params=criteria, json={'decision': 'confirmed'}).json()['reviewed_by'] == 'investigator'
assert client.get(route, params=criteria).json()[1]['review']['decision'] == 'confirmed'
assert ingest(catalog('2026-02-01T00:00:00Z', 'fixture-2')) == 1
assert client.get(route, params=criteria).json()[1]['review'] is None

assert client.post(analysis + '/jobs', json={**criteria, 'analyzer': 'file-profile'}).status_code == 202
assert finish(claim(), image, error='Synthetic worker failure')
assert viewer.get(security + '/alerts', params={'case_id': 'case-one'}).json()[0]['kind'] == 'analysis_job_failed'
assert outsider.get(security + '/alerts', params={'case_id': 'case-one'}).status_code == 403
with database.connect() as conn:
    conn.execute("INSERT INTO forentrace_case_policy (case_id, policy) VALUES ('case-one', %s)",
                 (Jsonb({'step_up_minutes': 5}),))
assert client.get(route, params=criteria).status_code == 403
assert client.get(base + '/' + first).status_code == 404
assert client.get(base + '/' + other_case).status_code == 200
assert 'case_policy_denied' in {row['kind'] for row in client.get(security + '/alerts').json()}
with database.connect() as conn:
    conn.execute("UPDATE forentrace_sessions SET last_seen_at = now() - interval '9 hours' WHERE username = 'investigator'")
assert client.get('/api/v1/auth/session').status_code == 401

# Hold verification inside its credential transaction until PostgreSQL shows recovery waiting on a lock.
resetter = login('resetter')
credential_id = b'test-credential-id'
with database.connect() as conn:
    conn.execute("INSERT INTO forentrace_passkeys (credential_id, username, public_key, sign_count) VALUES (%s, 'resetter', %s, 0)",
                 (credential_id, b'fixture'))
assert resetter.post(security + '/passkeys/verify/options').status_code == 200
in_verification = Event()
release_verification = Event()
real_connect = database.connect

def tagged_connect():
    conn = real_connect()
    if current_thread().name.startswith('passkey-reset'):
        conn.execute("SET application_name = 'forentrace_m5_reset'")
        conn.commit()
    return conn

def checked_signature(**kwargs):
    in_verification.set()
    assert release_verification.wait(10)
    return SimpleNamespace(credential_id=credential_id, new_sign_count=1)

with (ThreadPoolExecutor(max_workers=1) as web, ThreadPoolExecutor(max_workers=1, thread_name_prefix='passkey-reset') as ops,
      patch.object(database, 'connect', tagged_connect),
      patch('app.api.v1.security.parse_authentication_credential_json', return_value=SimpleNamespace(raw_id=credential_id)),
      patch('app.api.v1.security.verify_authentication_response', side_effect=checked_signature)):
    verification = web.submit(resetter.post, security + '/passkeys/verify/finish', json={})
    assert in_verification.wait(10)
    recovery = ops.submit(issue, 'resetter', reset=True)
    try:
        with real_connect() as observer:
            observer.autocommit = True
            deadline = monotonic() + 5
            while monotonic() < deadline:
                if observer.execute("""
                    SELECT 1 FROM pg_stat_activity WHERE application_name = 'forentrace_m5_reset' AND wait_event_type = 'Lock'
                """).fetchone():
                    break
                sleep(0.02)
            else:
                raise AssertionError('The concurrent recovery did not reach its database lock.')
    finally:
        release_verification.set()
    assert verification.result(timeout=10).status_code == 204
    assert len(recovery.result(timeout=10)) >= 32
assert resetter.get('/api/v1/auth/session').status_code == 401
with database.connect() as conn:
    assert not conn.execute("SELECT 1 FROM forentrace_passkeys WHERE username = 'resetter'").fetchone()

# Every concurrent password check reserves a slot before the expensive hash runs.
reserved, release = Event(), Event()
seen_lock = Lock()
seen = []
def hold_hash(*args):
    with seen_lock:
        seen.append(1)
        if len(seen) == 10:
            reserved.set()
    assert release.wait(10)
    return 'wrong'

def check_password():
    try:
        authenticate_password('resetter', 'wrong', 'fixture-concurrent-host')
    except HTTPException as error:
        return error.status_code

with ThreadPoolExecutor(max_workers=11) as threads, patch('app.core.access.hash_password', side_effect=hold_hash):
    attempts = [threads.submit(check_password) for _ in range(11)]
    try:
        assert reserved.wait(10)
        early, _ = wait(attempts, timeout=5, return_when=FIRST_COMPLETED)
        assert [attempt.result() for attempt in early] == [429]
    finally:
        release.set()
    assert sorted(attempt.result(timeout=10) for attempt in attempts) == [401] * 10 + [429]

# Additional source matches use snapshots and signed references.
client = login('investigator')
with database.connect() as conn:
    conn.execute("INSERT INTO forentrace_case_policy (case_id, policy) VALUES ('case-one', NULL)")
epss = b'#model_version:v1,score_date:2026-11-07T12:00:28Z\ncve,epss,percentile\nCVE-2021-44228,0.91,0.99\n'
assert ingest_intelligence('first-epss', gzip.compress(epss)) == 1
try:
    ingest_intelligence('first-epss', epss.replace(b'0.91', b'1.5'))
except ValueError:
    pass
else:
    raise AssertionError('An invalid EPSS snapshot replaced the current data.')
technique = {'type': 'attack-pattern', 'name': 'Controlled Technique', 'modified': '2026-11-07T00:00:00Z',
             'external_references': [{'source_name': 'mitre-attack', 'external_id': 'T1059.001'}]}
retained = {**technique, 'modified': '2026-11-06T00:00:00Z',
            'external_references': [{'source_name': 'mitre-attack', 'external_id': 'T1000'}]}
def attack_catalog(*items):
    return json.dumps({'type': 'bundle', 'objects': items}).encode()
assert ingest_intelligence('mitre-attack', attack_catalog(technique, retained)) == 2
assert client.post(analysis + '/jobs', json={**criteria, 'analyzer': 'attack-references'}).status_code == 202
attack_job = claim()
if os.environ.get('FORENTRACE_TEST_FORENSIC_WORKER') == '1':
    process(attack_job, image_id())
    assert client.get(analysis + '/jobs', params={'case_id': 'case-one'}).json()[0]['result']['report']['technique_ids'] == ['T1059.001']
else:
    assert finish(attack_job, image, report=AttackReport(format='forentrace.attack-references.v1', sha256=sha256(data).hexdigest(),
                                                        byte_count=len(data), technique_ids=['T1059.001'], truncated=False))
sources = client.get(analysis + '/intelligence/sources').json()
assert all(entry['imported_at'] for entry in sources)
extra = client.get(route, params=criteria).json()
assert any('FIRST EPSS' in item['source'] and '91.00%' in item['context'] for item in extra)
assert any('MITRE ATT&CK' in item['source'] and item['context'] == 'Controlled Technique' for item in extra)
revoked = {**technique, 'modified': '2026-11-08T00:00:00Z', 'revoked': True}
assert ingest_intelligence('mitre-attack', attack_catalog(revoked, retained)) == 1
assert not any('MITRE ATT&CK' in item['source'] for item in client.get(route, params=criteria).json())

# The evidence window must apply to all indirect paths as well as original downloads.
live_indexes = os.environ.get('FORENTRACE_TEST_INDEXES') == '1'
if live_indexes:
    from pydantic import SecretStr
    from app.core.config import settings
    from app.services.projections import lineage_ids, search_ids, sync_lineage, sync_search

    settings.FORENTRACE_OPENSEARCH_URL = os.environ['FORENTRACE_TEST_OPENSEARCH_URL']
    settings.FORENTRACE_NEO4J_URI = os.environ['FORENTRACE_TEST_NEO4J_URI']
    settings.FORENTRACE_NEO4J_PASSWORD = SecretStr(os.environ['FORENTRACE_TEST_NEO4J_PASSWORD'])
    crowded = [upload('case-one', 'capacitytest log.txt', b'restricted fixture') for _ in range(51)]
    visible = upload('case-one', 'capacitytest visible original with extra context.txt', b'visible fixture')
    sync_search()
    sync_lineage()
    assert len(set(search_ids('case-one', 'capacitytest')[0]) & set(crowded)) == 50
    assert str(job['id']) in {str(value) for value in lineage_ids('case-one', first)}
    allowed = viewer.get(analysis + '/lineage', params=criteria)
    assert allowed.status_code == 200, allowed.text
    assert {report['id'] for report in allowed.json()['reports']} == {str(job['id']), str(attack_job['id'])}
    empty = viewer.get(analysis + '/lineage', params={'case_id': 'case-one', 'evidence_id': visible})
    assert empty.status_code == 200 and empty.json()['reports'] == [], empty.text
    pending_evidence = upload('case-two', 'awaiting graph refresh.txt', b'pending graph fixture')
    pending = client.get(analysis + '/lineage', params={'case_id': 'case-two', 'evidence_id': pending_evidence})
    assert pending.status_code == 503 and 'next refresh' in pending.json()['detail'], pending.text
    assert outsider.get(analysis + '/lineage', params=criteria).status_code == 403
    assert outsider.get(analysis + '/search', params={'case_id': 'case-one', 'q': 'capacitytest'}).status_code == 403

custody = '/api/v1/custody'
transfer = {'evidence_id': first, 'evidence_name': 'fixture', 'transferred_from': 'Intake', 'transferred_to': 'Vault',
            'purpose': 'Scope test', 'location': 'fixture', 'witness_key': ''}
signed = client.post(custody, json=transfer)
assert signed.status_code == 201, signed.text
case = {'case_id': 'case-one'}
with database.connect() as conn:
    conn.execute('INSERT INTO forentrace_evidence_policy (evidence_id, policy) SELECT unnest(%s::text[]), %s',
                 ([first, *(crowded if live_indexes else [])], Jsonb({'valid_from': '2099-01-01T00:00:00Z'})))
if live_indexes:
    query = {**case, 'q': 'capacitytest'}
    result = viewer.get(analysis + '/search', params=query)
    assert result.status_code == 200, result.text
    assert {item['id'] for item in result.json()['evidence']} == {visible}, result.text
    assert viewer.get(analysis + '/lineage', params=criteria).status_code == 404
    assert search_ids('case-one', sha256(data).hexdigest(), excluded_ids=[first])[1] == []
    assert viewer.get(analysis + '/search', params={**case, 'q': sha256(data).hexdigest()}).json()['reports'] == []
assert client.get(base + '/' + first).status_code == 404
assert client.get(base + '/' + first + '/original').status_code == 404
assert client.post(base + '/' + first + '/verify').status_code == 404
assert client.post(base, params={**case, 'filename': 'source.txt', 'type': 'OTHER'}, content=data,
                   headers={'Content-Type': 'application/octet-stream', 'Idempotency-Key': 'c124bf3e-6e42-4cf0-8907-073b96aba12b'}).status_code == 404
assert {artifact['id'] for artifact in client.get(base, params=case).json()} == ({peer, visible} if live_indexes else {peer})
assert client.get(analysis + '/jobs', params=case).json() == []
assert client.get(analysis + '/lineage', params=criteria).status_code == 404
assert client.get(analysis + '/search', params={**case, 'q': 'source'}).json()['evidence'] == []
assert client.get(route, params={**case, 'evidence_id': peer}).json() == []
assert client.post(custody, json=transfer).status_code == 404
assert client.get(custody, params=case).json() == []
export = SignedLedgerExport.model_validate(client.get(custody + '/export', params=case).json())
assert export.checkpoint.visibility == 'policy-filtered' and export.records == []
verify_document(export, database.signing_key.public_key(), case_id='case-one')
assert client.get(custody + '/' + signed.json()['id'] + '/proof', params=case).status_code == 404

grant = approve('investigator', first, 'Controlled incident response', 'duty-operator', 10)
activation = security + '/emergency/' + str(grant) + '/activate'
assert client.get(security + '/emergency').json()[0]['ledger_id'] is None
assert viewer.post(activation).status_code == 404
assert client.post(activation).status_code == 403
# Assurances and passkey cryptography are tested separately with the browser authenticator.
with database.connect() as conn:
    conn.execute("UPDATE forentrace_sessions SET step_up_at = now() WHERE username='investigator'")
    conn.execute("INSERT INTO forentrace_case_policy (case_id, policy) VALUES ('case-one', %s)",
                 (Jsonb({'valid_from': '2099-01-01T00:00:00Z'}),))
with patch('app.services.emergency_access.custody_ledger_service.append_record', side_effect=AnchorUnavailable('Synthetic outage')):
    assert client.post(activation).status_code == 503
assert client.get(base + '/' + first + '/original').status_code == 404
activated = client.post(activation)
assert activated.status_code == 200, activated.text
assert client.post(activation).json() == activated.json()
assert client.get(base + '/' + first + '/original').content == data
emergency_lineage = client.get(analysis + '/lineage', params=criteria)
assert emergency_lineage.status_code == 200, emergency_lineage.text
assert {report['id'] for report in emergency_lineage.json()['reports']} == {str(job['id']), str(attack_job['id'])}
assert client.get(analysis + '/lineage', params={**case, 'evidence_id': peer}).status_code == 403
assert client.get(analysis + '/search', params={**case, 'q': 'source'}).status_code == 403
assert client.get(base + '/' + peer).status_code == 404
assert client.post(custody, json=transfer).status_code == 404
assert 'emergency_access_activated' in {event['kind'] for event in client.get(security + '/alerts').json()}
different_session = login('investigator')
assert different_session.get(base + '/' + first + '/original').status_code == 404
assert different_session.get(analysis + '/lineage', params=criteria).status_code == 403
review_emergency(grant, 'review-operator', 'Reviewed and closed.')
assert client.get(base + '/' + first + '/original').status_code == 404
assert client.get(analysis + '/lineage', params=criteria).status_code == 403
expiring = approve('investigator', first, 'Controlled expiry test', 'duty-operator', 1)
expiry_activation = security + '/emergency/' + str(expiring) + '/activate'
assert client.post(expiry_activation).status_code == 200
with database.connect() as conn:
    conn.execute("UPDATE forentrace_sessions SET step_up_at = NULL WHERE username = 'investigator'")
assert client.get(security + '/emergency').json() == []
assert client.post(expiry_activation).status_code == 409
assert client.get(base + '/' + first + '/original').status_code == 404
with database.connect() as conn:
    conn.execute("UPDATE forentrace_sessions SET step_up_at = now() WHERE username = 'investigator'")
    conn.execute("UPDATE forentrace_emergency_access SET expires_at = now() - interval '1 second' WHERE id = %s", (expiring,))
assert client.get(base + '/' + first + '/original').status_code == 404
from app.services.custody_ledger import custody_ledger_service
before_expiry = approve('investigator', first, 'Controlled ledger timing', 'duty-operator', 1)
with (patch('app.services.emergency_access._approval_expired', side_effect=[False, True]) as expiry,
      patch.object(custody_ledger_service, 'append_record', wraps=custody_ledger_service.append_record) as append):
    assert client.post(security + '/emergency/' + str(before_expiry) + '/activate').status_code == 409
    append.assert_called_once()
    assert expiry.call_count == 2
assert client.get(base + '/' + first + '/original').status_code == 404
with database.connect() as conn:
    assert conn.execute('SELECT activated_at, ledger_id FROM forentrace_emergency_access WHERE id = %s', (before_expiry,)).fetchone() == (None, None)
with database.connect() as conn:
    conn.execute("INSERT INTO forentrace_case_policy (case_id, policy) VALUES ('case-one', NULL)")
    conn.execute('INSERT INTO forentrace_evidence_policy (evidence_id, policy) VALUES (%s, NULL)', (first,))
export = SignedLedgerExport.model_validate(client.get(custody + '/export', params=case).json())
assert [record.event_type for record in export.records] == [None] + ['emergency_access_intent'] * 3
assert 'Controlled incident response' not in export.model_dump_json()
verify_document(export, database.signing_key.public_key(), case_id='case-one')
'''
    with connect(url, autocommit=True) as admin:
        admin.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
        try:
            result = subprocess.run([sys.executable, "-c", script], env=env, capture_output=True, text=True, timeout=160)
            assert result.returncode == 0, result.stdout + result.stderr
        finally:
            admin.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))
