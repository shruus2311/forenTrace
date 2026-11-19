from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from psycopg import connect

from app.core.config import settings
from app.crypto.ed25519_signer import export_public_key_hex


class Database:
    def __init__(self):
        key_file = settings.FORENTRACE_SIGNING_KEY_FILE
        if key_file is None:
            raise RuntimeError("FORENTRACE_SIGNING_KEY_FILE is required with PostgreSQL")
        self.signing_key = Ed25519PrivateKey.from_private_bytes(key_file.read_bytes())
        public_key = export_public_key_hex(self.signing_key.public_key())

        with self.connect() as conn:
            conn.execute("SELECT pg_advisory_xact_lock(130518, 1)")
            conn.execute("""
                CREATE TABLE IF NOT EXISTS forentrace_signer (
                    singleton boolean PRIMARY KEY CHECK (singleton),
                    public_key text NOT NULL
                );
                CREATE TABLE IF NOT EXISTS forentrace_evidence (
                    id text PRIMARY KEY,
                    manifest jsonb NOT NULL,
                    integrity_status text,
                    verified_at text
                );
                CREATE TABLE IF NOT EXISTS forentrace_custody (
                    position bigint PRIMARY KEY CHECK (position > 0),
                    record jsonb NOT NULL
                );
                ALTER TABLE forentrace_custody ADD COLUMN IF NOT EXISTS anchor_pending boolean NOT NULL DEFAULT FALSE;
                ALTER TABLE forentrace_custody ADD COLUMN IF NOT EXISTS request_id uuid;
                ALTER TABLE forentrace_custody ADD COLUMN IF NOT EXISTS requested_by text;
                CREATE UNIQUE INDEX IF NOT EXISTS forentrace_custody_request_id ON forentrace_custody (request_id);
                CREATE TABLE IF NOT EXISTS forentrace_ledger_anchor_binding (
                    singleton boolean PRIMARY KEY CHECK (singleton), anchor_id text NOT NULL
                );
                CREATE TABLE IF NOT EXISTS forentrace_organizations (id text PRIMARY KEY);
                CREATE TABLE IF NOT EXISTS forentrace_cases (
                    id text PRIMARY KEY, organization_id text NOT NULL REFERENCES forentrace_organizations
                );
                CREATE TABLE IF NOT EXISTS forentrace_users (
                    username text PRIMARY KEY, organization_id text NOT NULL REFERENCES forentrace_organizations,
                    password_hash text NOT NULL
                );
                CREATE TABLE IF NOT EXISTS forentrace_case_members (
                    case_id text NOT NULL REFERENCES forentrace_cases,
                    username text NOT NULL REFERENCES forentrace_users,
                    role text NOT NULL CHECK (role IN ('viewer', 'investigator')),
                    PRIMARY KEY (case_id, username)
                );
                CREATE TABLE IF NOT EXISTS forentrace_sessions (
                    token_hash text PRIMARY KEY, username text NOT NULL REFERENCES forentrace_users,
                    expires_at timestamptz NOT NULL
                );
                ALTER TABLE forentrace_sessions ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();
                ALTER TABLE forentrace_sessions ADD COLUMN IF NOT EXISTS step_up_at timestamptz;
                CREATE TABLE IF NOT EXISTS forentrace_case_policy (
                    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    case_id text NOT NULL REFERENCES forentrace_cases,
                    policy jsonb,
                    recorded_at timestamptz NOT NULL DEFAULT now()
                );
                CREATE INDEX IF NOT EXISTS forentrace_case_policy_latest ON forentrace_case_policy (case_id, id DESC);
                CREATE TABLE IF NOT EXISTS forentrace_passkeys (
                    credential_id bytea PRIMARY KEY, username text NOT NULL REFERENCES forentrace_users,
                    public_key bytea NOT NULL, sign_count bigint NOT NULL, enrolled_at timestamptz NOT NULL DEFAULT now()
                );
                CREATE INDEX IF NOT EXISTS forentrace_passkeys_user ON forentrace_passkeys (username);
                CREATE TABLE IF NOT EXISTS forentrace_webauthn_challenges (
                    session_hash text NOT NULL REFERENCES forentrace_sessions ON DELETE CASCADE,
                    kind text NOT NULL CHECK (kind IN ('enroll', 'verify')), challenge bytea NOT NULL,
                    expires_at timestamptz NOT NULL, PRIMARY KEY (session_hash, kind)
                );
                ALTER TABLE forentrace_webauthn_challenges ADD COLUMN IF NOT EXISTS enrollment_code_hash text;
                CREATE TABLE IF NOT EXISTS forentrace_passkey_enrollment (
                    username text PRIMARY KEY REFERENCES forentrace_users, code_hash text NOT NULL, expires_at timestamptz NOT NULL
                );
                ALTER TABLE forentrace_passkey_enrollment ADD COLUMN IF NOT EXISTS reserved_session text;
                CREATE TABLE IF NOT EXISTS forentrace_alerts (
                    scope text NOT NULL CHECK (scope IN ('account', 'case')), target text NOT NULL,
                    kind text NOT NULL, bucket timestamptz NOT NULL, first_at timestamptz NOT NULL DEFAULT now(),
                    last_at timestamptz NOT NULL DEFAULT now(), occurrences integer NOT NULL DEFAULT 1,
                    PRIMARY KEY (scope, target, kind, bucket)
                );
                CREATE INDEX IF NOT EXISTS forentrace_alerts_recent ON forentrace_alerts (scope, target, last_at DESC);
                CREATE TABLE IF NOT EXISTS forentrace_login_attempts (
                    bucket text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL
                );
                ALTER TABLE forentrace_login_attempts ADD COLUMN IF NOT EXISTS in_flight integer NOT NULL DEFAULT 0;
                INSERT INTO forentrace_organizations VALUES ('demo') ON CONFLICT DO NOTHING;
                INSERT INTO forentrace_cases VALUES ('case-01', 'demo') ON CONFLICT DO NOTHING;
                ALTER TABLE forentrace_evidence ADD COLUMN IF NOT EXISTS case_id text REFERENCES forentrace_cases;
                CREATE TABLE IF NOT EXISTS forentrace_evidence_policy (
                    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    evidence_id text NOT NULL REFERENCES forentrace_evidence,
                    policy jsonb, recorded_at timestamptz NOT NULL DEFAULT now()
                );
                CREATE INDEX IF NOT EXISTS forentrace_evidence_policy_latest
                    ON forentrace_evidence_policy (evidence_id, id DESC);
                CREATE TABLE IF NOT EXISTS forentrace_emergency_access (
                    id uuid PRIMARY KEY, evidence_id text NOT NULL REFERENCES forentrace_evidence,
                    username text NOT NULL REFERENCES forentrace_users,
                    reason text NOT NULL, approved_by text NOT NULL, approved_at timestamptz NOT NULL DEFAULT now(),
                    activate_before timestamptz NOT NULL, duration_minutes integer NOT NULL CHECK (duration_minutes BETWEEN 1 AND 15),
                    session_hash text, activated_at timestamptz, expires_at timestamptz, ledger_id text,
                    reviewed_by text, reviewed_at timestamptz, review_note text
                );
                CREATE INDEX IF NOT EXISTS forentrace_emergency_access_person
                    ON forentrace_emergency_access (username, session_hash, expires_at);
                UPDATE forentrace_evidence SET case_id = 'case-01'
                    WHERE case_id IS NULL AND manifest->>'case_id' = 'case-01';
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint
                        WHERE conrelid = 'forentrace_evidence'::regclass
                          AND conname = 'forentrace_evidence_new_rows_require_case'
                    ) THEN
                        ALTER TABLE forentrace_evidence
                            ADD CONSTRAINT forentrace_evidence_new_rows_require_case
                            CHECK (case_id IS NOT NULL) NOT VALID;
                    END IF;
                END $$;
                CREATE TABLE IF NOT EXISTS forentrace_analysis_jobs (
                    id uuid PRIMARY KEY,
                    case_id text NOT NULL REFERENCES forentrace_cases,
                    evidence_id text NOT NULL REFERENCES forentrace_evidence,
                    requested_by text NOT NULL REFERENCES forentrace_users,
                    input_sha256 text NOT NULL,
                    status text NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
                    created_at timestamptz NOT NULL DEFAULT now(),
                    started_at timestamptz,
                    finished_at timestamptz,
                    attempts integer NOT NULL DEFAULT 0,
                    lease_id uuid,
                    lease_until timestamptz,
                    result jsonb,
                    error text
                );
                ALTER TABLE forentrace_analysis_jobs ADD COLUMN IF NOT EXISTS analyzer text NOT NULL
                    DEFAULT 'file-profile';
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'forentrace_analysis_jobs'::regclass
                                   AND conname = 'forentrace_analysis_analyzer_v3') THEN
                        ALTER TABLE forentrace_analysis_jobs DROP CONSTRAINT IF EXISTS forentrace_analysis_jobs_analyzer_check;
                        ALTER TABLE forentrace_analysis_jobs DROP CONSTRAINT IF EXISTS forentrace_analysis_analyzer_v2;
                        ALTER TABLE forentrace_analysis_jobs ADD CONSTRAINT forentrace_analysis_analyzer_v3
                            CHECK (analyzer IN ('file-profile', 'byte-entropy', 'text-metrics', 'cve-references', 'attack-references'));
                    END IF;
                END $$;
                CREATE TABLE IF NOT EXISTS forentrace_correlation_reviews (
                    correlation_id text PRIMARY KEY, case_id text NOT NULL REFERENCES forentrace_cases,
                    reviewed_by text NOT NULL REFERENCES forentrace_users,
                    decision text NOT NULL CHECK (decision IN ('confirmed', 'dismissed')),
                    reviewed_at timestamptz NOT NULL DEFAULT now()
                );
                CREATE INDEX IF NOT EXISTS forentrace_evidence_case_sha256
                    ON forentrace_evidence (case_id, (manifest->'hashes'->>'sha256'), id);
                DROP INDEX IF EXISTS forentrace_analysis_one_active;
                CREATE UNIQUE INDEX IF NOT EXISTS forentrace_analysis_one_active_per_analyzer
                    ON forentrace_analysis_jobs (evidence_id, input_sha256, analyzer) WHERE status <> 'failed';
                CREATE INDEX IF NOT EXISTS forentrace_analysis_case_created
                    ON forentrace_analysis_jobs (case_id, created_at DESC);
                DROP INDEX IF EXISTS forentrace_analysis_findings_fts;
                CREATE INDEX IF NOT EXISTS forentrace_analysis_findings_fts_v2
                    ON forentrace_analysis_jobs USING GIN
                    (to_tsvector('simple', coalesce(result->'report'->>'classification', '') || ' ' ||
                                           coalesce(result->>'report_sha256', '') || ' ' || input_sha256 || ' ' || analyzer))
                    WHERE status = 'completed';
                CREATE INDEX IF NOT EXISTS forentrace_evidence_fts
                    ON forentrace_evidence USING GIN
                    (to_tsvector('simple', coalesce(manifest->>'name', '') || ' ' ||
                                           coalesce(manifest->>'type', '') || ' ' ||
                                           coalesce(manifest->'hashes'->>'sha256', '') || ' ' || id));
                CREATE TABLE IF NOT EXISTS forentrace_kev_catalog (
                    singleton boolean PRIMARY KEY CHECK (singleton),
                    version text NOT NULL, released_at timestamptz NOT NULL, imported_at timestamptz NOT NULL,
                    source_mode text NOT NULL CHECK (source_mode IN ('official_https', 'local_file')),
                    source_sha256 text NOT NULL
                );
                CREATE TABLE IF NOT EXISTS forentrace_kev_entries (
                    cve_id text PRIMARY KEY, vendor text NOT NULL, product text NOT NULL,
                    title text NOT NULL, description text NOT NULL, action text NOT NULL,
                    date_added date NOT NULL, due_date date NOT NULL
                );
                CREATE INDEX IF NOT EXISTS forentrace_kev_fts ON forentrace_kev_entries USING GIN
                    (to_tsvector('simple', cve_id || ' ' || vendor || ' ' || product || ' ' || title || ' ' || description));
                CREATE TABLE IF NOT EXISTS forentrace_maintenance (
                    task text PRIMARY KEY, next_due timestamptz NOT NULL DEFAULT now(),
                    last_attempt timestamptz, last_success timestamptz, last_error text
                );
                CREATE TABLE IF NOT EXISTS forentrace_intel_catalogs (
                    source text PRIMARY KEY, version text NOT NULL, observed_at timestamptz NOT NULL,
                    imported_at timestamptz NOT NULL DEFAULT now(), source_sha256 text NOT NULL,
                    source_mode text NOT NULL CHECK (source_mode IN ('official_https', 'local_file'))
                );
                CREATE TABLE IF NOT EXISTS forentrace_intel_entries (
                    source text NOT NULL REFERENCES forentrace_intel_catalogs, identifier text NOT NULL,
                    detail jsonb NOT NULL, PRIMARY KEY (source, identifier)
                );
                CREATE TABLE IF NOT EXISTS forentrace_evidence_registrations (
                    request_id uuid PRIMARY KEY,
                    evidence_id text NOT NULL UNIQUE,
                    case_id text NOT NULL REFERENCES forentrace_cases,
                    requested_by text NOT NULL REFERENCES forentrace_users,
                    object_bucket text,
                    expected_sha256 text,
                    draft jsonb NOT NULL,
                    published boolean NOT NULL DEFAULT FALSE,
                    created_at timestamptz NOT NULL DEFAULT now()
                );
            """)
            conn.execute(
                "INSERT INTO forentrace_signer VALUES (TRUE, %s) ON CONFLICT DO NOTHING",
                (public_key,),
            )
            stored_key = conn.execute("SELECT public_key FROM forentrace_signer").fetchone()[0]
            if stored_key != public_key:
                raise RuntimeError("The configured Ed25519 key does not match the database signer")

    @staticmethod
    def connect():
        return connect(settings.FORENTRACE_DATABASE_URL.get_secret_value(), connect_timeout=5)


database = Database() if settings.FORENTRACE_DATABASE_URL is not None else None
