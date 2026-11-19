from datetime import datetime, timezone
from hashlib import sha256
from uuid import UUID, uuid4

from cryptography.exceptions import InvalidSignature
from fastapi import HTTPException
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from app.core.access import investigator_assigned
from app.core.alerts import record_alert
from app.core.database import database
from app.crypto.ed25519_signer import canonical_json, sign_manifest
from app.crypto.ledger import verify_signature
from app.schemas.analysis import AnalysisJob, AnalysisReport, Analyzer, REPORT_FORMATS, SignedAnalysis
from app.schemas.evidence import EvidenceArtifactRead

JOB_COLUMNS = """id, case_id, evidence_id, requested_by, input_sha256, analyzer, status,
                 created_at, started_at, finished_at, result, error"""
FINDING_VECTOR = """to_tsvector('simple', coalesce(result->'report'->>'classification', '') || ' ' ||
                           coalesce(result->>'report_sha256', '') || ' ' || input_sha256 || ' ' || analyzer)"""


def report_payload(job: dict, result: dict, finished_at: datetime) -> dict:
    return {
        "format": "forentrace.analysis-provenance.v1", "job_id": str(job["id"]),
        "case_id": job["case_id"], "evidence_id": job["evidence_id"], "input_sha256": job["input_sha256"],
        "requested_by": job["requested_by"], "worker_image": result["worker_image"],
        "report_sha256": result["report_sha256"],
        "started_at": job["started_at"].astimezone(timezone.utc).isoformat(),
        "finished_at": finished_at.astimezone(timezone.utc).isoformat(),
    }


def report_digest(report: AnalysisReport) -> str:
    return sha256(canonical_json(report.model_dump()).encode()).hexdigest()


def read_job(row: dict) -> AnalysisJob:
    job = AnalysisJob.model_validate(row)
    if job.status == "completed":
        result = job.result
        if (result is None or job.finished_at is None or job.started_at is None
                or result.report.format != REPORT_FORMATS[job.analyzer]
                or result.report.sha256 != job.input_sha256 or result.report_sha256 != report_digest(result.report)):
            raise InvalidSignature("The stored analysis result failed integrity verification.")
        verify_signature(database.signing_key.public_key(), result.signature_hex,
                         report_payload(row, result.model_dump(), job.finished_at))
    elif job.result is not None:
        raise InvalidSignature("The stored analysis result has an invalid status.")
    return job


def enqueue(artifact: EvidenceArtifactRead, username: str, analyzer: Analyzer) -> AnalysisJob:
    with database.connect() as conn, conn.cursor(row_factory=dict_row) as cursor:
        if not investigator_assigned(conn, artifact.case_id, username):
            raise HTTPException(403, "You do not have the required case permission.")
        cursor.execute(f"""
            INSERT INTO forentrace_analysis_jobs (id, case_id, evidence_id, requested_by, input_sha256, analyzer, status)
            VALUES (%s, %s, %s, %s, %s, %s, 'queued') ON CONFLICT DO NOTHING
            RETURNING {JOB_COLUMNS}
        """, (uuid4(), artifact.case_id, artifact.id, username, artifact.hashes.sha256, analyzer))
        row = cursor.fetchone()
        if row is None:
            cursor.execute(f"""
                SELECT {JOB_COLUMNS} FROM forentrace_analysis_jobs
                WHERE case_id = %s AND evidence_id = %s AND input_sha256 = %s AND analyzer = %s
                ORDER BY (status <> 'failed') DESC, created_at DESC LIMIT 1
            """, (artifact.case_id, artifact.id, artifact.hashes.sha256, analyzer))
            row = cursor.fetchone()
        return read_job(row)


def list_jobs(case_id: str, *, evidence_id: str | None = None, query: str | None = None,
              ids: list[UUID] | None = None, excluded_ids: list[str] | None = None) -> list[AnalysisJob]:
    sql = f"SELECT {JOB_COLUMNS} FROM forentrace_analysis_jobs WHERE case_id = %s"
    params = [case_id]
    if evidence_id is not None:
        sql += " AND evidence_id = %s AND status = 'completed'"
        params.append(evidence_id)
    if query is not None:
        sql += f" AND status = 'completed' AND {FINDING_VECTOR} @@ websearch_to_tsquery('simple', %s)"
        params.append(query)
    if ids is not None:
        sql += " AND status = 'completed' AND id = ANY(%s)"
        params.append(ids)
    if excluded_ids:
        sql += " AND evidence_id <> ALL(%s)"
        params.append(excluded_ids)
    with database.connect() as conn, conn.cursor(row_factory=dict_row) as cursor:
        cursor.execute(sql + " ORDER BY created_at DESC, id DESC LIMIT 100", params)
        return [read_job(row) for row in cursor]


def claim() -> dict | None:
    with database.connect() as conn, conn.cursor(row_factory=dict_row) as cursor:
        expired = cursor.execute("""
            UPDATE forentrace_analysis_jobs SET status = 'failed', finished_at = statement_timestamp(), error = 'Worker lease expired.',
                lease_id = NULL, lease_until = NULL
            WHERE status = 'running' AND lease_until <= statement_timestamp() AND attempts >= 3
            RETURNING case_id
        """).fetchall()
        for row in sorted(expired, key=lambda row: row["case_id"]):
            record_alert(conn, "case", row["case_id"], "analysis_job_failed")
        candidate = cursor.execute("""
            SELECT id FROM forentrace_analysis_jobs WHERE status = 'queued'
                OR (status = 'running' AND lease_until <= statement_timestamp() AND attempts < 3)
            ORDER BY created_at, id LIMIT 1 FOR UPDATE SKIP LOCKED
        """).fetchone()
        if candidate is None:
            return None
        cursor.execute(f"""
            UPDATE forentrace_analysis_jobs
            SET status = 'running', started_at = statement_timestamp(), attempts = attempts + 1,
                lease_id = %s, lease_until = statement_timestamp() + interval '5 minutes'
            WHERE id = %s RETURNING {JOB_COLUMNS}, lease_id, lease_until
        """, (uuid4(), candidate["id"]))
        return cursor.fetchone()


def finish(job: dict, image_id: str, *, report: AnalysisReport | None = None, error: str | None = None) -> bool:
    finished_at = datetime.now(timezone.utc)
    result = None
    if report is not None:
        result = {"report": report.model_dump(), "worker_image": image_id, "report_sha256": report_digest(report)}
        signature = sign_manifest(database.signing_key, report_payload(job, result, finished_at), "forentrace-analysis")
        result["signature_hex"] = signature.signature_hex
        SignedAnalysis.model_validate(result)
    with database.connect() as conn:
        updated = conn.execute("""
            UPDATE forentrace_analysis_jobs SET status = %s, result = %s, error = %s, finished_at = %s,
                lease_id = NULL, lease_until = NULL
            WHERE id = %s AND lease_id = %s AND status = 'running' AND lease_until > now()
        """, ("completed" if result else "failed", Jsonb(result) if result else None, error,
              finished_at, job["id"], job["lease_id"]))
        if updated.rowcount == 1 and result is None:
            record_alert(conn, "case", job["case_id"], "analysis_job_failed")
        return updated.rowcount == 1
