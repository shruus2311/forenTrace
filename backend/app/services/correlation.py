from datetime import datetime, timezone
from hashlib import sha256
from typing import Literal

from cryptography.exceptions import InvalidSignature
from fastapi import HTTPException
from psycopg.rows import dict_row
from pydantic import BaseModel

from app.core.database import database
from app.crypto.ed25519_signer import canonical_json
from app.schemas.analysis import AttackReport, CVEReport
from app.services.analysis import JOB_COLUMNS, read_job
from app.services.evidence_vault import evidence_vault_service
from app.services.projections import list_kev

Decision = Literal["confirmed", "dismissed"]


class Review(BaseModel):
    decision: Decision
    reviewed_by: str
    reviewed_at: datetime


class Correlation(BaseModel):
    id: str
    kind: Literal["direct_observation", "external_intelligence_match"]
    value: str
    matched_fields: list[str]
    source: str
    logic: str
    confidence: Literal["exact_hash", "exact_identifier"]
    source_updated_at: datetime
    evidence_id: str
    related_id: str
    report_id: str | None = None
    context: str | None = None
    review: Review | None = None


def correlations(conn, case_id: str, evidence_id: str, excluded_ids: list[str] | None = None) -> list[Correlation]:
    originals = evidence_vault_service.list_artifacts([case_id], ids=[evidence_id], connection=conn)
    if not originals:
        raise HTTPException(404, "Evidence not found.")
    original = originals[0]
    digest = original.hashes.sha256
    peer_ids = [row[0] for row in conn.execute("""
        SELECT id FROM forentrace_evidence WHERE case_id = %s AND id <> %s AND manifest->'hashes'->>'sha256' = %s
            AND id <> ALL(%s)
        ORDER BY id LIMIT 50
    """, (case_id, evidence_id, digest, excluded_ids or []))]
    matches = []
    for peer in evidence_vault_service.list_artifacts([case_id], ids=peer_ids, connection=conn):
        # The ID is symmetric so the same pair has one analyst decision.
        row_id = sha256(canonical_json([case_id, "sha256", sorted([evidence_id, peer.id]), digest]).encode()).hexdigest()
        matches.append(Correlation(
            id=row_id, kind="direct_observation", value=digest, matched_fields=["evidence.hashes.sha256"] * 2,
            source="Signed evidence manifests", logic="Exact SHA-256 equality between two sealed originals in this case.",
            confidence="exact_hash", source_updated_at=datetime.fromisoformat(max(original.ingest_date, peer.ingest_date))
            .astimezone(timezone.utc), evidence_id=evidence_id, related_id=peer.id,
        ))
    with conn.cursor(row_factory=dict_row) as cursor:
        rows = cursor.execute(f"""
            SELECT DISTINCT ON (analyzer) {JOB_COLUMNS} FROM forentrace_analysis_jobs
            WHERE case_id = %s AND evidence_id = %s AND analyzer IN ('cve-references', 'attack-references') AND status = 'completed'
            ORDER BY analyzer, finished_at DESC, id DESC
        """, (case_id, evidence_id)).fetchall()
    for row in rows:
        job = read_job(row)
        report = job.result.report
        if job.input_sha256 != digest:
            raise InvalidSignature("The correlation report does not match the evidence seal.")
        if isinstance(report, CVEReport):
            for entry in list_kev(ids=report.cve_ids, connection=conn):
                row_id = sha256(canonical_json([case_id, evidence_id, str(job.id), entry.cve_id,
                                               entry.source_sha256]).encode()).hexdigest()
                matches.append(Correlation(
                    id=row_id, kind="external_intelligence_match", value=entry.cve_id,
                    matched_fields=["signed_report.cve_ids", "cisa_kev.cve_id"],
                    source=f"CISA KEV {entry.catalog_version} ({entry.source_mode})",
                    logic="Exact CVE identifier match. A reference alone cannot establish exploitation or affectedness.",
                    confidence="exact_identifier", source_updated_at=entry.imported_at, evidence_id=evidence_id,
                    related_id=entry.cve_id, report_id=str(job.id),
                ))
            source, identifiers, field = "first-epss", report.cve_ids, "cve_ids"
        elif isinstance(report, AttackReport):
            source, identifiers, field = "mitre-attack", report.technique_ids, "technique_ids"
        else:
            raise InvalidSignature("The correlation report has an unexpected format.")
        for identifier, detail, version, updated, source_hash, mode in conn.execute("""
            SELECT e.identifier, e.detail, c.version, c.observed_at, c.source_sha256, c.source_mode
            FROM forentrace_intel_entries e JOIN forentrace_intel_catalogs c USING (source)
            WHERE e.source = %s AND e.identifier = ANY(%s) ORDER BY e.identifier
        """, (source, identifiers)):
            row_id = sha256(canonical_json([case_id, evidence_id, str(job.id), source, identifier, source_hash]).encode()).hexdigest()
            if source == "first-epss":
                label = "FIRST EPSS"
                context = f"30-day exploitation probability {detail['score']:.2%} · Percentile {detail['percentile']:.2%}"
            else:
                label = "MITRE ATT&CK"
                context = detail["title"]
            matches.append(Correlation(
                id=row_id, kind="external_intelligence_match", value=identifier,
                matched_fields=[f"signed_report.{field}", f"{source}.identifier"],
                source=f"{label} {version} ({mode})", logic="Exact identifier match to an external reference.",
                confidence="exact_identifier", source_updated_at=updated, evidence_id=evidence_id,
                related_id=identifier, report_id=str(job.id), context=context,
            ))
    reviews = {key: Review(decision=decision, reviewed_by=actor, reviewed_at=when)
               for key, decision, actor, when in conn.execute("""
        SELECT correlation_id, decision, reviewed_by, reviewed_at FROM forentrace_correlation_reviews
        WHERE case_id = %s AND correlation_id = ANY(%s)
    """, (case_id, [match.id for match in matches]))}
    for match in matches:
        match.review = reviews.get(match.id)
    return matches
