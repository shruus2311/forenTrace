from datetime import datetime
from cryptography.exceptions import InvalidSignature
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.access import Identity, current_identity, investigator_assigned
from app.core.config import settings
from app.core.database import database
from app.schemas.analysis import AnalysisJob, AnalysisRequest, KEVEntry
from app.schemas.evidence import EvidenceArtifactRead
from app.services.analysis import enqueue, list_jobs
from app.services.correlation import Correlation, Decision, Review, correlations
from app.services.evidence_vault import evidence_vault_service
from app.services.projections import ProjectionUnavailable, lineage_ids, list_kev, search_ids
from pydantic import BaseModel, ValidationError

router = APIRouter(prefix="/analysis", tags=["Forensic analysis"])


class Lineage(BaseModel):
    evidence: EvidenceArtifactRead
    reports: list[AnalysisJob]


class SearchResults(BaseModel):
    evidence: list[EvidenceArtifactRead]
    reports: list[AnalysisJob]
    intelligence: list[KEVEntry]


class ReviewRequest(BaseModel):
    decision: Decision


def authenticated(identity: Identity | None = Depends(current_identity)) -> Identity:
    if identity is None or database is None:
        raise HTTPException(503, "Analysis requires an authenticated PostgreSQL workstation.")
    return identity


class IntelligenceSource(BaseModel):
    source: str
    version: str | None
    observed_at: datetime | None
    imported_at: datetime | None
    source_mode: str | None
    last_attempt: datetime | None
    last_success: datetime | None
    last_error: str | None


@router.get("/intelligence/sources", response_model=list[IntelligenceSource])
def intelligence_sources(identity: Identity = Depends(authenticated)):
    with database.connect() as conn:
        return [IntelligenceSource(source=source, version=version, observed_at=observed, imported_at=imported,
                                   source_mode=mode, last_attempt=attempted, last_success=successful, last_error=error)
                for source, version, observed, imported, mode, attempted, successful, error in conn.execute("""
            WITH catalog AS (
                SELECT source, version, observed_at, imported_at, source_mode FROM forentrace_intel_catalogs
                UNION ALL SELECT 'cisa-kev', version, released_at, imported_at, source_mode FROM forentrace_kev_catalog
            )
            SELECT s.source, c.version, c.observed_at, c.imported_at, c.source_mode, m.last_attempt, m.last_success, m.last_error
            FROM (VALUES ('cisa-kev'), ('first-epss'), ('mitre-attack')) s(source)
            LEFT JOIN catalog c ON c.source = s.source LEFT JOIN forentrace_maintenance m ON m.task = s.source
            ORDER BY s.source
        """)]


def original(case_id: str, evidence_id: str) -> EvidenceArtifactRead:
    artifact = evidence_vault_service.get_artifact(evidence_id, [case_id])
    if artifact is None:
        raise HTTPException(404, "Evidence not found.")
    return artifact


@router.get("/correlations", response_model=list[Correlation])
def correlate(case_id: str, evidence_id: str, identity: Identity = Depends(authenticated)):
    identity.evidence_cases(evidence_id, case_id)
    try:
        with database.connect() as conn:
            conn.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
            return correlations(conn, case_id, evidence_id, identity.denied_evidence)
    except (InvalidSignature, ValidationError) as error:
        raise HTTPException(409, "A correlation source failed integrity verification.") from error


@router.put("/correlations/{correlation_id}", response_model=Review)
def review_correlation(correlation_id: str, body: ReviewRequest, case_id: str, evidence_id: str,
                       identity: Identity = Depends(authenticated)):
    identity.evidence_cases(evidence_id, case_id, write=True)
    try:
        with database.connect() as conn:
            if not investigator_assigned(conn, case_id, identity.username):
                raise HTTPException(403, "You do not have the required case permission.")
            if not any(match.id == correlation_id for match in correlations(conn, case_id, evidence_id, identity.denied_evidence)):
                raise HTTPException(404, "Correlation not found in the current sources.")
            decision, who, when = conn.execute("""
                INSERT INTO forentrace_correlation_reviews (correlation_id, case_id, decision, reviewed_by)
                VALUES (%s, %s, %s, %s) ON CONFLICT (correlation_id) DO UPDATE
                SET decision = EXCLUDED.decision, reviewed_by = EXCLUDED.reviewed_by, reviewed_at = now()
                RETURNING decision, reviewed_by, reviewed_at
            """, (correlation_id, case_id, body.decision, identity.username)).fetchone()
            return Review(decision=decision, reviewed_by=who, reviewed_at=when)
    except (InvalidSignature, ValidationError) as error:
        raise HTTPException(409, "A correlation source failed integrity verification.") from error


@router.post("/jobs", response_model=AnalysisJob, status_code=202)
def queue_job(body: AnalysisRequest, identity: Identity = Depends(authenticated)):
    identity.evidence_cases(body.evidence_id, body.case_id, write=True)
    try:
        return enqueue(original(body.case_id, body.evidence_id), identity.username, body.analyzer)
    except (InvalidSignature, ValidationError) as error:
        raise HTTPException(409, "The evidence or analysis result failed integrity verification.") from error


@router.get("/jobs", response_model=list[AnalysisJob])
def jobs(case_id: str, identity: Identity = Depends(authenticated)):
    identity.case_ids(case_id)
    try:
        return list_jobs(case_id, excluded_ids=identity.denied_evidence)
    except (InvalidSignature, ValidationError) as error:
        raise HTTPException(409, "An analysis result failed integrity verification.") from error


@router.get("/lineage", response_model=Lineage)
def lineage(case_id: str, evidence_id: str, identity: Identity = Depends(authenticated)):
    identity.evidence_cases(evidence_id, case_id, emergency=True)
    try:
        evidence = original(case_id, evidence_id)
        ids = lineage_ids(case_id, evidence_id) if settings.FORENTRACE_NEO4J_URI else None
        reports = list_jobs(case_id, evidence_id=evidence_id, ids=ids)
        if any(report.input_sha256 != evidence.hashes.sha256 for report in reports):
            raise InvalidSignature("A lineage report does not match the original seal.")
        return Lineage(evidence=evidence, reports=reports)
    except ProjectionUnavailable as error:
        raise HTTPException(503, str(error)) from error
    except (InvalidSignature, ValidationError) as error:
        raise HTTPException(409, "The evidence or analysis result failed integrity verification.") from error


@router.get("/search", response_model=SearchResults)
def search(case_id: str, q: str = Query(min_length=1, max_length=160), identity: Identity = Depends(authenticated)):
    identity.case_ids(case_id)
    q = q.strip()
    if not q:
        raise HTTPException(422, "Enter a search term.")
    excluded = identity.evidence_exclusions([case_id])
    try:
        if settings.FORENTRACE_OPENSEARCH_URL:
            evidence_ids, job_ids, kev_ids = search_ids(case_id, q, excluded_ids=excluded)
            evidence = evidence_vault_service.list_artifacts([case_id], ids=evidence_ids, excluded_ids=excluded)
            reports = list_jobs(case_id, ids=job_ids, excluded_ids=excluded)
            intelligence = list_kev(ids=kev_ids)
        else:
            evidence = evidence_vault_service.list_artifacts([case_id], query=q, excluded_ids=excluded)
            reports = list_jobs(case_id, query=q, excluded_ids=excluded)
            intelligence = list_kev(query=q)
        return SearchResults(evidence=evidence, reports=reports, intelligence=intelligence)
    except ProjectionUnavailable as error:
        raise HTTPException(503, str(error)) from error
    except (InvalidSignature, ValidationError) as error:
        raise HTTPException(409, "A search result failed integrity verification.") from error
