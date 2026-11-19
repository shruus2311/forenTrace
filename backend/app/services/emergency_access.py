from datetime import datetime, timezone
from hashlib import sha256
from uuid import UUID, uuid4

from fastapi import HTTPException
from psycopg.rows import dict_row
from pydantic import BaseModel

from app.core.access import investigator_assigned
from app.core.alerts import record_alert
from app.core.config import settings
from app.core.database import database
from app.crypto.ed25519_signer import canonical_json
from app.schemas.custody import CustodyRecordCreate
from app.services.custody_ledger import custody_ledger_service
from app.services.evidence_vault import evidence_vault_service


class EmergencyApproval(BaseModel):
    id: UUID
    evidence_id: str
    case_id: str
    reason: str
    activate_before: datetime
    expires_at: datetime | None
    ledger_id: str | None


def check_label(value: str, maximum: int):
    value = value.strip()
    if not 1 <= len(value) <= maximum or not value.isprintable():
        raise ValueError(f"Use 1–{maximum} printable characters.")
    return value


def approve(username: str, evidence_id: str, reason: str, operator: str, duration: int) -> UUID:
    reason, operator = check_label(reason, 1000), check_label(operator, 80)
    if username == operator or not 1 <= duration <= 15:
        raise ValueError("Use a separate approving operator and a duration of 1–15 minutes.")
    with database.connect() as conn:
        case = conn.execute("SELECT case_id FROM forentrace_evidence WHERE id = %s", (evidence_id,)).fetchone()
        if not case or not investigator_assigned(conn, case[0], username):
            raise ValueError("Emergency access requires an investigator assigned to the evidence case.")
        grant_id = uuid4()
        conn.execute("""
            INSERT INTO forentrace_emergency_access (id, evidence_id, username, reason, approved_by, activate_before, duration_minutes)
            VALUES (%s, %s, %s, %s, %s, now() + interval '15 minutes', %s)
        """, (grant_id, evidence_id, username, reason, operator, duration))
    return grant_id


def review(grant_id: UUID, operator: str, note: str) -> None:
    operator, note = check_label(operator, 80), check_label(note, 1000)
    with database.connect() as conn:
        if not conn.execute("""
            UPDATE forentrace_emergency_access SET reviewed_by = %s, reviewed_at = now(), review_note = %s
            WHERE id = %s AND reviewed_at IS NULL AND username <> %s
            RETURNING id
        """, (operator, note, grant_id, operator)).fetchone():
            raise ValueError("No open approval was found for operator review.")


def approvals(username: str, token_hash: str) -> list[EmergencyApproval]:
    with database.connect() as conn, conn.cursor(row_factory=dict_row) as cursor:
        return [EmergencyApproval.model_validate(row) for row in cursor.execute("""
            SELECT g.id, g.evidence_id, e.case_id, g.reason, g.activate_before, g.expires_at, g.ledger_id
            FROM forentrace_emergency_access g JOIN forentrace_evidence e ON e.id = g.evidence_id
            JOIN forentrace_case_members m ON m.case_id = e.case_id AND m.username = g.username
            JOIN forentrace_users u ON u.username = m.username
            JOIN forentrace_cases c ON c.id = m.case_id AND c.organization_id = u.organization_id
            WHERE g.username = %s AND m.role = 'investigator' AND g.reviewed_at IS NULL AND
                ((g.session_hash IS NULL AND g.activate_before > now()) OR (g.session_hash = %s AND g.expires_at > now()
                AND EXISTS (SELECT 1 FROM forentrace_sessions s WHERE s.token_hash = g.session_hash AND s.step_up_at IS NOT NULL)))
            ORDER BY g.approved_at DESC LIMIT 50
        """, (username, token_hash))]


def _approval_expired(conn, deadline: datetime) -> bool:
    return deadline <= conn.execute("SELECT clock_timestamp()").fetchone()[0]


def activate(grant_id: UUID, username: str, token_hash: str) -> str:
    with database.connect() as conn, conn.cursor(row_factory=dict_row) as cursor:
        grant = cursor.execute("""
            SELECT g.*, e.case_id FROM forentrace_emergency_access g JOIN forentrace_evidence e ON e.id = g.evidence_id
            WHERE g.id = %s AND g.username = %s AND g.reviewed_at IS NULL FOR UPDATE OF g
        """, (grant_id, username)).fetchone()
        if grant is None or not investigator_assigned(conn, grant["case_id"], username):
            raise HTTPException(404, "Emergency approval not found.")
        if grant["session_hash"] is not None:
            still_verified = grant["session_hash"] == token_hash and conn.execute("""
                SELECT 1 FROM forentrace_sessions WHERE token_hash = %s AND step_up_at IS NOT NULL
                    AND expires_at > clock_timestamp() AND %s > clock_timestamp()
            """, (token_hash, grant["expires_at"])).fetchone()
            if still_verified:
                return grant["ledger_id"]
            raise HTTPException(409, "The approval has already been used.")
        if _approval_expired(conn, grant["activate_before"]):
            raise HTTPException(409, "The approval expired before activation.")

        def has_recent_passkey():
            return conn.execute("""
                SELECT 1 FROM forentrace_sessions WHERE token_hash = %s AND username = %s
                AND expires_at > clock_timestamp() AND last_seen_at > clock_timestamp() - %s * interval '1 minute'
                AND step_up_at > clock_timestamp() - interval '5 minutes' AND step_up_at <= clock_timestamp() FOR UPDATE
            """, (token_hash, username, settings.FORENTRACE_SESSION_IDLE_MINUTES)).fetchone()

        if not has_recent_passkey():
            raise HTTPException(403, "Verify with a passkey before activating emergency access.")
        artifact = evidence_vault_service.get_artifact(grant["evidence_id"], [grant["case_id"]])
        if artifact is None:
            raise HTTPException(404, "Evidence not found.")
        commitment = sha256(canonical_json({
            "id": str(grant_id), "evidence_id": artifact.id, "username": username, "reason": grant["reason"],
            "approved_by": grant["approved_by"], "approved_at": grant["approved_at"].astimezone(timezone.utc).isoformat(),
            "activate_before": grant["activate_before"].astimezone(timezone.utc).isoformat(), "duration_minutes": grant["duration_minutes"],
        }).encode()).hexdigest()
        block = custody_ledger_service.append_record(CustodyRecordCreate(
            evidence_id=artifact.id, evidence_name=artifact.name, transferred_from="Case access policy",
            transferred_to=username, purpose=f"Emergency approval {grant_id} · SHA-256 {commitment}",
            location="ForenTrace access control", witness_key="",
        ), grant_id, username, event_type="emergency_access_intent")
        if not has_recent_passkey() or _approval_expired(conn, grant["activate_before"]):
            raise HTTPException(409, "The verification or approval expired during activation.")
        conn.execute("""
            UPDATE forentrace_emergency_access SET session_hash = %s, activated_at = clock_timestamp(),
                expires_at = clock_timestamp() + duration_minutes * interval '1 minute', ledger_id = %s WHERE id = %s
        """, (token_hash, block.id, grant_id))
        record_alert(conn, "case", grant["case_id"], "emergency_access_activated")
        record_alert(conn, "account", username, "emergency_access_activated")
        return block.id
