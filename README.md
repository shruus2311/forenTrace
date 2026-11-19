# ForenTrace

> **Privacy-Preserving Digital Evidence Provenance, Lineage, and Chain-of-Custody Platform**  
> *Every byte has a history. Every action has proof.*

---

## Overview

**ForenTrace** is an enterprise-grade digital forensics and cyber threat intelligence platform engineered for DFIR investigators, enterprise security operations centers, and federal incident response teams.

Built to conform with **ISO/IEC 27037** electronic evidence handling standards, ForenTrace pairs **cryptographically verifiable evidence management** (streaming multi-algorithm bitstream hashing, Ed25519 digital witness signatures, Merkle audit checkpoints) with a **Three.js WebGL provenance topology matrix** and an information-dense cybersecurity workstation interface.

---

## Key Workspaces & Capabilities

- **Intelligence Command Center**: High-value operational indicator cards, live forensic worker job queues, Recharts telemetry, and central 3D evidence provenance matrix.
- **Evidence Repository**: Multi-format artifact management (raw RAM dumps, EnCase `.E01` disk images, `.pcapng` network streams, and Windows `.evtx` logs) with 1-click hash copying (MD5, SHA-1, SHA-256, SSDEEP).
- **Lineage & Provenance Graph**: Interactive node-link graph mapping adversarial execution vectors from initial exploit to lateral movement and exfiltration.
- **Hex Memory & Packet Dissector**: Low-level 16-byte aligned register inspector with parallel ASCII translation, byte representation decoding, and YARA heuristic scan triggers.
- **Chain of Custody & Legal Ledger**: Cryptographically linked custodial transfer blocks with Ed25519 witness key attestation and Merkle checkpoint verification.
- **Workstation Access Terminal**: CAC / FIDO2 hardware token and investigator credential unlock terminal.

---

## Technology Stack

### Frontend Workstation
- **Framework**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, CSS Custom Variables
- **3D Engine**: Three.js, React Three Fiber (`@react-three/fiber`), Drei (`@react-three/drei`), Maath (`maath/easing`)
- **Animation & Physics**: Framer Motion / Motion, GSAP
- **Data Visualization**: Recharts
- **Icons & UI**: Lucide React, Custom Dark Design System

### Backend & Cryptographic Engine
- **Framework**: Python 3.13, FastAPI, Pydantic v2
- **Cryptography**: `cryptography` (Ed25519 signatures, RFC 3161 timestamps)
- **Streaming Multi-Hasher**: Memory-safe chunked SHA-256, SHA-512, and MD5
- **Integrity Trees**: Merkle tree inclusion proofs with tamper detection
- **Testing**: Pytest, Playwright (automated multi-view browser verification)

---

## Quickstart

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+ (for backend cryptographic engine)

### 1. Frontend Workstation Setup
```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) after starting PostgreSQL
and provisioning a user as shown below.

### 2. Backend Cryptographic Engine Setup
```bash
# From the repository root, install the backend dependencies
python -m pip install -r backend/requirements.txt

# Run automated cryptographic and API test suite
$env:PYTHONPATH="backend"; python -m pytest backend/tests/ -v

# Start FastAPI server
$env:PYTHONPATH="backend"; python -m uvicorn app.main:app --port 8000 --host 127.0.0.1
```
Interactive Swagger documentation is available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### PostgreSQL development mode

The web workstation requires PostgreSQL. With no database configured, set
`FORENTRACE_SEED_DEMO=true` explicitly to run the bundled fixture API locally.
For the workstation, start PostgreSQL with
Docker Compose and configure a persistent Ed25519 signing key:

```powershell
# Choose a local password on first setup and reuse it for this database volume.
$env:FORENTRACE_POSTGRES_PASSWORD = 'replace-with-a-local-password'
docker compose up -d --wait postgres
$password = [uri]::EscapeDataString($env:FORENTRACE_POSTGRES_PASSWORD)
$env:FORENTRACE_DATABASE_URL = "postgresql://forentrace:${password}@127.0.0.1:5432/forentrace"

# Create the key once. Keep the file private and back it up with the database.
New-Item -ItemType Directory -Force .env.keys | Out-Null
@'
from pathlib import Path
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
with Path(".env.keys/forentrace-ed25519.key").open("xb") as key_file:
    key_file.write(Ed25519PrivateKey.generate().private_bytes_raw())
'@ | python -
$env:FORENTRACE_SIGNING_KEY_FILE = (Resolve-Path .env.keys/forentrace-ed25519.key).Path

# Optional. Import the bundled demonstration fixtures into a new database.
$env:FORENTRACE_SEED_DEMO = 'true'
$env:PYTHONPATH = 'backend'

# For local HTTP only. Leave the secure cookie enabled with HTTPS.
$env:FORENTRACE_COOKIE_SECURE = 'false'

# Provision a demo account and case assignment. The first run prompts for a password.
python -m app.provision demo my-investigator case-01 investigator

# Or provision a separate organization and private case.
python -m app.provision lab my-lab-investigator lab-case-01 investigator

python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

PostgreSQL stores the signed evidence manifests and custody blocks. Evidence files
stay in the local vault. The API checks the configured signing key against the
database public key on startup. Use the same provisioning command to grant an
existing user another case or change their case role to `viewer`. Case IDs and
usernames are globally unique. The `demo` organization owns the bundled sample
case `case-01`.
On upgrade, existing signed demo manifests are assigned to `case-01`. Other
legacy rows without a verified case assignment stay hidden. Before making a
legacy row accessible, an operator must confirm its original signed case ID,
provision that case in the correct organization, and set the row's case ID to
match. Restore the original signed manifest from backup if its case ID is missing.

Use **Register Evidence** to upload a file into the selected case. An investigator
can register, re-verify and record custody transfers. A viewer can read evidence
and custody records for their assigned cases. Registration accepts files up to
100 MiB by default. Set `FORENTRACE_MAX_UPLOAD_BYTES` to adjust the limit. An
optional acquisition SHA-256 must match before the upload is accepted.

Vite proxies the API on the same origin during development. A hosted deployment
must route `/api/v1/*` and `/health` to FastAPI before the SPA fallback, use HTTPS,
and set `CORS_ORIGINS` to a JSON list containing its trusted frontend origin.
Configure forwarded client addresses only from trusted proxies so login limits
apply to the actual client address.

To run the PostgreSQL integration test, point `FORENTRACE_TEST_DATABASE_URL` at a
development database where the user can create schemas. The test uses a temporary
schema, signing key and copy of the evidence fixtures.

```powershell
$env:FORENTRACE_TEST_DATABASE_URL = $env:FORENTRACE_DATABASE_URL
python -m pytest backend/tests/test_postgres.py -q
```

### Browser tests with Playwright

Use the PostgreSQL development setup above, a Python environment with the
backend requirements installed, and the repository's npm dependencies. Point
`FORENTRACE_TEST_DATABASE_URL` at a disposable database where the test user can
create schemas. Leave local ports 8000 and 5173 available for the test servers.

```powershell
npx playwright install chromium
$env:FORENTRACE_TEST_DATABASE_URL = $env:FORENTRACE_DATABASE_URL
npm run test:e2e
```

The runner starts FastAPI and Vite and uses a temporary PostgreSQL schema,
signing key, and local evidence vault. It tests evidence registration and retry,
offline verification of a signed custody export, authorization for search and
lineage, and the analysis outage state. Pass `-- --headed` to watch the suite.
On failure, use `npx playwright show-trace <trace.zip>` with the trace from
`test-results/`.
Set `PLAYWRIGHT_CHROMIUM_CHANNEL=chrome` to use an installed Google Chrome.

### ForenTrace 2.0 implementation order

1. Preserve the existing React, Vite, Three.js, and FastAPI workspaces. Establish
   durable evidence seals and custody history in PostgreSQL.
2. Add authenticated sessions, organization and case permissions, and evidence
   registration. Carry the authenticated actor into every protected operation.
3. Publish ledger verification, independently verifiable proofs and signed exports.
4. Add isolated forensic workers and protected object storage, then feed source
   ingestion, search and evidence lineage as real workflows produce data.
5. Add correlation, time-based access, biometric step-up, and alerts driven by
   recorded events.

### Milestone 5 workstation workflows

In **Forensic Analysis**, select an original and choose **Show Correlations**.
ForenTrace matches sealed SHA-256 hashes within the same case. Run the isolated
**CVE references** analyzer to match observed CVE identifiers against the imported
CISA KEV catalog. Rebuild the worker image before queueing the new analyzer.
Results show the exact fields, source timestamp, supporting evidence and analyst
decision. Confirming an identifier match does not establish exploitation or
affectedness. A changed catalog snapshot requires a new review for that match.

FIRST EPSS adds the estimated 30-day exploitation probability for a cited CVE.
The **ATT&CK references** analyzer matches technique IDs in the sealed file to
MITRE Enterprise ATT&CK metadata. Both matches are passive references. The
analysis workspace shows each catalog's provenance, freshness, and sync status.
Import from the official URLs or pass `--file` for a bounded local snapshot.

```powershell
python -m app.ingest_intelligence first-epss
python -m app.ingest_intelligence mitre-attack
```

Maintenance refreshes EPSS daily. Set `FORENTRACE_SYNC_ATTACK=true` for weekly
ATT&CK refreshes. Imports preserve the previous snapshot when validation fails.

For scheduled case access, an operator can set a policy from an IANA time-zone
schedule and optional offset-aware validity dates. This example allows Monday
through Friday and requires passkey verification within the previous ten minutes.

```json
{
  "timezone": "America/New_York",
  "weekdays": [1, 2, 3, 4, 5],
  "opens": "09:00",
  "closes": "17:00",
  "step_up_minutes": 10
}
```

```powershell
python -m app.case_policy case-01 --set case-policy.json
python -m app.case_policy case-01
python -m app.case_policy EVD-123 --evidence --set evidence-policy.json
```

Use `--clear` to append a policy revocation. A window spanning midnight uses
the weekday on which it opens. `valid_from` and `valid_until` accept ISO 8601
timestamps with offsets. The backend applies policy to case reads and writes
using its own clock. Sessions expire after eight hours or after inactivity.
Set `FORENTRACE_SESSION_IDLE_MINUTES` to change the default 30-minute idle limit.
Evidence policies use the same schema and must be satisfied along with the case
policy. Restricted evidence is excluded from search, analysis, and signed case
ledger exports. When a checkpoint omits evidence under those rules, the signed
visibility marker is `policy-filtered`. Use the current verifier for exports
containing that marker or emergency security events.

For emergency read-only access, a database operator approves a named, existing
case investigator for one original and enters the justification at the prompt.

```powershell
python -m app.emergency_access approve investigator EVD-123 --operator duty-operator --minutes 10
python -m app.emergency_access pending-review
python -m app.emergency_access review <approval-uuid> --operator review-operator
```

The investigator opens **System Settings**, verifies with a passkey, and
activates the approval within 15 minutes. The activation needs a passkey event
from the previous five minutes and seals an activation intent to the ledger.
When independent custody anchoring is enabled, the intent must reach that anchor
before access opens. The grant and its immediate alerts commit together after a
final expiry check. The grant opens only the approved original and
its direct lineage in that session. It lasts at most 15 minutes and stops after
revocation, session change, or operator review. The review closes the grant and
records the operator’s note. The ledger contains the approval ID and a hash of
its terms. The justification itself stays in the operator record and the
approved investigator’s security workspace.

Set `FORENTRACE_WEBAUTHN_ORIGIN` to the exact workstation HTTPS origin and include
it in `CORS_ORIGINS`. For development, use `http://localhost:5173` and open the
workstation at that address. After confirming the user's identity through an
independent channel, issue a single-use code with `python -m app.passkey_invite <username>`
and deliver it privately. It expires in 15 minutes. From **System Settings**,
confirm the account password and supply the code to enroll the first passkey.
If the browser prompt is cancelled, use the same session and code to try again.
Add or revoke existing passkeys with the password and a recent passkey verification.
For recovery after losing every key, the operator can issue a new code with
`--reset` to revoke the old credentials and sessions. Use **Verify with passkey**
to step up the password-authenticated session. A compatible authenticator can use a local
biometric, PIN, or security key. ForenTrace verifies the WebAuthn response and
stores the public credential. It never receives face images, biometric templates,
or the device PIN. Configure and test enrollment before requiring step-up on a case.

System Settings shows account alerts and authorized case alerts from actual
events. The current rules cover repeated password failures, access policy denials,
passkey actions, and failed analysis jobs. Repeated events are grouped in
15-minute intervals. New alerts appear when the workspace loads or refreshes.

### Verify ledger downloads offline

In **Chain of Custody**, select a case and choose **Download Signed Ledger** for
its ledger snapshot or **Download Proof** on a record. Viewers and investigators
can download files for assigned cases. The API supplies signed checkpoints at
`GET /api/v1/custody/merkle-checkpoint?case_id=<case>`.

On a trusted operator machine, derive the public verification key from the
deployment signing key and distribute the public key through a separately
authenticated channel. Keep the private key on the operator's machine.

```powershell
$env:PYTHONPATH = 'backend'
python -m app.verify_ledger public-key $env:FORENTRACE_SIGNING_KEY_FILE |
  Set-Content -Encoding utf8 trusted-ledger-key.hex
python -m app.verify_ledger verify forentrace-ledger-case-01.json --public-key trusted-ledger-key.hex --case-id case-01 --organization-id demo
```

The same verification command accepts a proof JSON file. The verifier needs only
Python, Pydantic, cryptography, the document, and the trusted public key. It
returns a nonzero exit code for a failed check.

The export signature covers the document format, signed checkpoint, and ordered
case records. Proofs authenticate one block at a specific case-relative leaf
index. The verifier checks SHA-256 block hashes, Ed25519 signatures, Merkle roots,
and previous-block links between adjacent exported positions. Checkpoints use
UTF-8 JSON with sorted keys and no insignificant whitespace. Merkle parents are
SHA-256 of the two lowercase hexadecimal child hashes concatenated as text.
The final child is duplicated on odd levels, and an empty case has the all-zero
root. Scoped exports use one database snapshot and may have gaps in global
block positions. The timestamp records when the server signed that snapshot.
To check freshness offline, compare the export against a checkpoint you retained
independently. The live API can also check its ledger against an independent anchor.

### Protected evidence storage and isolated analysis

Enable MinIO for new originals before registering evidence that requires a
retention lock. Existing local originals remain readable. The application seals
the MinIO bucket and object version into the evidence manifest and always reads
that version. An unavailable configured store causes registration to fail.

With [MinIO Client](https://docs.min.io/community/minio-object-store/reference/minio-mc.html)
installed, set separate root and application credentials in the operator shell.
Use the root credentials only to provision the bucket and scoped application
account. The following uses the default bucket name in the included policy.

```powershell
# Set FORENTRACE_MINIO_ROOT_USER / FORENTRACE_MINIO_ROOT_PASSWORD and
# FORENTRACE_S3_ACCESS_KEY / FORENTRACE_S3_SECRET_KEY before running these commands.
docker compose -f compose.storage.yaml up -d --build --wait
mc alias set forentrace http://127.0.0.1:9000 $env:FORENTRACE_MINIO_ROOT_USER $env:FORENTRACE_MINIO_ROOT_PASSWORD
mc mb --with-lock forentrace/forentrace-evidence
mc admin user add forentrace $env:FORENTRACE_S3_ACCESS_KEY $env:FORENTRACE_S3_SECRET_KEY
mc admin policy create forentrace evidence-originals backend/evidence-storage-policy.json
mc admin policy attach forentrace evidence-originals --user $env:FORENTRACE_S3_ACCESS_KEY
$env:FORENTRACE_S3_ENDPOINT = 'http://127.0.0.1:9000'
$env:FORENTRACE_S3_BUCKET = 'forentrace-evidence'
# Optional. Set the deployment retention period before uploading. Default is 30 days.
$env:FORENTRACE_S3_RETENTION_DAYS = '30'
```

Start FastAPI with those S3 settings. Use HTTPS for a remote store, back up the
database and retained originals, and restrict the API and worker's scratch
directories to their operator accounts. COMPLIANCE retention prevents deletion
of a protected version until its retention expires. The bundled evidence policy
grants `s3:GetObjectRetention` on `originals/` so registration recovery can verify
the retained version's lock.

### Independent ledger checkpoints and interrupted uploads

For custody rollback detection, provision an Object Lock bucket on an independently
administered S3-compatible service with its own backup and recovery schedule. On
MinIO, create the bucket with `mc mb --with-lock`. Give the application dedicated
credentials scoped to the anchor bucket and deployment prefix. The example
`backend/ledger-anchor-policy.json` uses the default bucket name and allows writes
and retention without delete permissions. Narrow `ledgers/*` to
`ledgers/<deployment-id>/*` if the bucket hosts multiple deployments. Enable the
same settings on every custody API process before initializing the anchor.

```powershell
$env:PYTHONPATH = 'backend'
$env:FORENTRACE_LEDGER_ANCHOR_ENDPOINT = 'https://ledger-anchor.example.org'
$env:FORENTRACE_LEDGER_ANCHOR_ID = 'forentrace-production'
$env:FORENTRACE_LEDGER_ANCHOR_BUCKET = 'forentrace-ledger-anchors'
# Supply FORENTRACE_LEDGER_ANCHOR_ACCESS_KEY and FORENTRACE_LEDGER_ANCHOR_SECRET_KEY securely.
# Set FORENTRACE_LEDGER_ANCHOR_RETENTION_DAYS to your retention period. Default is 3650 days.
python -m app.ledger_anchor initialize
python -m app.ledger_anchor check
```

For an existing ledger, verify the head against a trusted backup or previously
retained checkpoint before running `python -m app.ledger_anchor initialize --adopt-existing`.
This anchors the verified starting head and every subsequent transfer. Once bound,
custody requests return `503` when the anchor is unavailable and `409` when the
database disagrees with it. Anchored custody writes require an `Idempotency-Key`
UUID. After an unconfirmed transfer, retry with the same details and key to get
the original signed block. The workstation reuses the key for an unchanged form.

Evidence registration commits a signed intent before uploading. A retry with the
same `Idempotency-Key` UUID and the same file and metadata resumes that intent.
The workstation reuses the key when retrying an unchanged form. API callers
should retain the UUID until registration is confirmed. Evidence becomes visible
once the manifest is committed, with the exact retained version sealed into it.

From the API operator environment, run `python -m app.recover_evidence` to list
pending attempts. Run `python -m app.recover_evidence <request-uuid>` to publish an
already stored original after verifying its bytes and retention. If the original
never reached storage, retry the registration with its original file and key.
The local filesystem fallback syncs the original and directory entries on POSIX.
Use MinIO for protected originals on Windows, where the fallback cannot confirm
that directory entries survived a power loss.

### Running the analysis worker

Run the queue coordinator separately from FastAPI, on a Docker host, with the
same database, signing key, and vault configuration. Give the coordinator access
to Docker. The API does not need Docker privileges.

```powershell
docker build -t forentrace-file-profile:local backend/worker
$env:PYTHONPATH = 'backend'
python -m app.run_worker
```

In **Forensic Analysis**, investigators can choose a file profile, byte entropy
or text metrics for an assigned case. The coordinator verifies the sealed input before mounting a single
read-only copy in the analyzer. The analyzer runs as a non-root user with no
network, dropped capabilities, and resource and time limits. It returns the file
size, SHA-256, and the selected analyzer's output. A file profile labels known
headers. Entropy measures byte distribution. Text metrics count printable ASCII,
line feeds, and NUL bytes. These observations do not establish a file's purpose. The
coordinator checks the result and signs the relationship between the original,
the report hash, the job, and the analyzer image. The analyzer does not execute
or unpack the evidence. Use **Refresh Jobs** to see current results.

Use the same workspace to search case evidence, reports, and the CISA Known
Exploited Vulnerabilities catalog, or open **View Lineage**. The catalog is a
separate public source. A search hit alone does not correlate a CVE with evidence.

```powershell
python -m app.ingest_kev
# Or import a locally saved copy. Search labels it as a local file import.
python -m app.ingest_kev --file path/to/known_exploited_vulnerabilities.json
```

### OpenSearch, Neo4j, and scheduled imports

The indexes are replaceable projections. PostgreSQL is the authority for case
permissions and signed evidence and reports. Search excludes evidence restricted
by policy and its reports before OpenSearch ranks and limits results. The API
checks scope again when loading candidate records from PostgreSQL. Neo4j holds
original and derived-report IDs and their edges. The API checks case membership
and evidence policy before asking Neo4j, then verifies each signed report
against the original. Emergency approvals allow direct lineage for the approved
original through System Settings. They leave case search scoped to usual access.

```powershell
# Choose a strong FORENTRACE_NEO4J_PASSWORD before running Compose.
docker compose -f compose.indexes.yaml up -d --wait
$env:FORENTRACE_OPENSEARCH_URL = 'http://127.0.0.1:9200'
$env:FORENTRACE_NEO4J_URI = 'bolt://127.0.0.1:7687'
$env:FORENTRACE_KEV_INTERVAL_MINUTES = '360'
$env:FORENTRACE_PROJECTION_INTERVAL_MINUTES = '2'
$env:PYTHONPATH = 'backend'
python -m app.run_maintenance
# Use --once to run only tasks that are due and exit.
```

Set the connection variables for FastAPI as well. Keep the bundled services on
a trusted local machine. The development OpenSearch node has security disabled
and binds to loopback. For a remote deployment use authenticated TLS endpoints.
Set `FORENTRACE_OPENSEARCH_USERNAME` and `FORENTRACE_OPENSEARCH_PASSWORD` for
OpenSearch basic authentication. Use `bolt+s://` or `neo4j+s://` for remote Neo4j.
Use dedicated projection services or databases for each ForenTrace deployment.

Maintenance keeps each task's next run, last attempt, last success, and last
error in PostgreSQL. An unchanged official catalog is a successful check.
Transient failures retry within five minutes and preserve the previous import.
Projection updates publish in an OpenSearch alias switch and a Neo4j transaction.
Rebuild the OpenSearch projection after upgrading so reports include their
original evidence ID. Allow one refresh interval for new evidence, reports, or
catalog rows to appear. Neo4j reports unavailable when an authorized original
has yet to reach the graph.
Without external endpoints the workstation uses PostgreSQL search and lineage.
A configured projection that cannot serve a request returns an unavailable
state. The development coordinator rebuilds full projections, so bulk processing
will need an incremental refresh strategy.

The PostgreSQL integration suite accepts `FORENTRACE_TEST_FORENSIC_WORKER=1`
to run the real Docker analyzer. An isolated versioned test bucket can also be
supplied for storage integration. Set `FORENTRACE_TEST_DATABASE_URL`,
`FORENTRACE_TEST_S3_ENDPOINT`, `FORENTRACE_TEST_S3_ACCESS_KEY`, and
`FORENTRACE_TEST_S3_SECRET_KEY`, then run `python backend/tests/run_storage_integration.py -q`.
The runner provisions separate disposable Object Lock buckets for evidence and
ledger checkpoints, and expires current and noncurrent versions after the
one-day test retention. Empty buckets can be removed by the test operator.
Run with `FORENTRACE_TEST_INDEXES=1`, `FORENTRACE_TEST_OPENSEARCH_URL`,
`FORENTRACE_TEST_NEO4J_URI`, and `FORENTRACE_TEST_NEO4J_PASSWORD` to check live
OpenSearch and Neo4j. Supply disposable endpoints. The tests rebuild the managed
read projections on those endpoints.

---

## Production Build

```bash
npm run build
```

---

## Security & Evidence Integrity Principles

1. **Original Evidence Immutability**: All evidence bitstreams are accessed in read-only binary mode (`"rb"`). Files are never modified or executed.
2. **Deterministic Cryptographic Manifests**: Canonical JSON sorting guarantees identical hash generation across distributed architectures.
3. **No Unverified Claims**: Verification statuses strictly reflect computed bitstream hashes against origin master seals.
