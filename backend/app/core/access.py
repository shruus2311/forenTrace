from datetime import datetime
from hashlib import scrypt, sha256
from hmac import compare_digest
from secrets import token_bytes, token_urlsafe
from typing import Literal

from fastapi import HTTPException, Request
from pydantic import BaseModel, PrivateAttr

from app.core.config import settings
from app.core.alerts import record_alert
from app.core.database import database
from app.core.time_policy import TimePolicy

SESSION_COOKIE = "forentrace_session"
SESSION_SECONDS = 8 * 60 * 60
CaseRole = Literal["viewer", "investigator"]


class CaseAccess(BaseModel):
    id: str
    role: CaseRole
    restriction: str | None = None
    access_policy: TimePolicy | None = None


class Identity(BaseModel):
    username: str
    organization_id: str
    cases: list[CaseAccess]
    _denied_evidence: dict[str, str] = PrivateAttr(default_factory=dict)
    _emergency_evidence: dict[str, str] = PrivateAttr(default_factory=dict)

    @property
    def denied_evidence(self) -> list[str]:
        return list(self._denied_evidence)

    def evidence_exclusions(self, cases: list[str]) -> list[str]:
        return [evidence_id for evidence_id, case_id in self._denied_evidence.items() if case_id in cases]

    def evidence_cases(self, evidence_id: str, case_id: str | None = None, *, write: bool = False,
                       emergency: bool = False) -> list[str]:
        granted_case = self._emergency_evidence.get(evidence_id) if emergency and not write else None
        if granted_case and (case_id is None or case_id == granted_case):
            return [granted_case]
        cases = self.case_ids(case_id, write=write)
        if evidence_id in self._denied_evidence:
            raise HTTPException(404, "Evidence not found.")
        return cases

    def case_ids(self, case_id: str | None = None, write: bool = False) -> list[str]:
        allowed = [case for case in self.cases if not write or case.role == "investigator"]
        if case_id is None:
            return [case.id for case in allowed if case.restriction is None]
        for case in allowed:
            if case.id == case_id:
                if case.restriction is not None:
                    with database.connect() as conn:
                        record_alert(conn, "account", self.username, "case_policy_denied")
                    raise HTTPException(403, case.restriction)
                return [case_id]
        raise HTTPException(403, "You do not have the required case permission.")


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt if salt is not None else token_bytes(16)
    digest = scrypt(password.encode(), salt=salt, n=2**15, r=8, p=3, maxmem=64 * 1024**2)
    return f"{salt.hex()}:{digest.hex()}"


def _digest(value: str) -> str:
    return sha256(value.encode()).hexdigest()


def _identity(conn, username: str, organization_id: str, step_up: datetime | None = None,
              session_hash: str | None = None) -> Identity:
    cases = conn.execute("""
        SELECT c.id, m.role, p.policy, now() FROM forentrace_case_members m
        JOIN forentrace_cases c ON c.id = m.case_id
        LEFT JOIN LATERAL (SELECT policy FROM forentrace_case_policy WHERE case_id = c.id ORDER BY id DESC LIMIT 1) p ON true
        WHERE m.username = %s AND c.organization_id = %s ORDER BY c.id
    """, (username, organization_id))
    access = []
    for case_id, role, policy_value, now in cases:
        policy = TimePolicy.model_validate(policy_value) if policy_value is not None else None
        access.append(CaseAccess(id=case_id, role=role, access_policy=policy,
                                 restriction=policy.restriction(now, step_up) if policy else None))
    identity = Identity(username=username, organization_id=organization_id, cases=access)
    case_ids = [case.id for case in access]
    if case_ids:
        identity._denied_evidence = {evidence_id: case_id for evidence_id, case_id, policy, now in conn.execute("""
            SELECT e.id, e.case_id, p.policy, now() FROM (
                SELECT DISTINCT ON (evidence_id) evidence_id, policy FROM forentrace_evidence_policy ORDER BY evidence_id, id DESC
            ) p JOIN forentrace_evidence e ON e.id = p.evidence_id WHERE p.policy IS NOT NULL AND e.case_id = ANY(%s)
        """, (case_ids,)) if TimePolicy.model_validate(policy).restriction(now, step_up)}
        if step_up is not None:
            identity._emergency_evidence = dict(conn.execute("""
                SELECT e.id, e.case_id FROM forentrace_emergency_access g
                JOIN forentrace_evidence e ON e.id = g.evidence_id
                WHERE g.username = %s AND g.session_hash = %s AND g.expires_at > now() AND g.reviewed_at IS NULL
                    AND g.ledger_id IS NOT NULL AND e.case_id = ANY(%s)
            """, (username, session_hash, [case.id for case in access if case.role == "investigator"])))
    return identity


def investigator_assigned(conn, case_id: str, username: str) -> bool:
    return conn.execute("""
        SELECT 1 FROM forentrace_case_members m
        JOIN forentrace_users u ON u.username = m.username
        JOIN forentrace_cases c ON c.id = m.case_id AND c.organization_id = u.organization_id
        WHERE m.case_id = %s AND m.username = %s AND m.role = 'investigator'
        FOR SHARE OF m, c, u
    """, (case_id, username)).fetchone() is not None


def authenticate_password(username: str, password: str, host: str) -> str:
    if database is None:
        raise HTTPException(503, "Login requires PostgreSQL.")
    host_bucket = _digest(f"host:{host}")
    account_bucket = _digest(f"user:{host}\0{username}")
    limits = {host_bucket: 50, account_bucket: 10}
    reservations = {}
    with database.connect() as conn:
        for bucket, limit in limits.items():
            reservation = conn.execute("""
                INSERT INTO forentrace_login_attempts (bucket, count, expires_at, in_flight)
                VALUES (%s, 0, now() + interval '15 minutes', 1)
                ON CONFLICT (bucket) DO UPDATE SET
                    count = CASE WHEN forentrace_login_attempts.expires_at <= now() THEN 0 ELSE forentrace_login_attempts.count END,
                    in_flight = CASE WHEN forentrace_login_attempts.expires_at <= now() THEN 1 ELSE forentrace_login_attempts.in_flight + 1 END,
                    expires_at = CASE WHEN forentrace_login_attempts.expires_at <= now()
                        THEN EXCLUDED.expires_at ELSE forentrace_login_attempts.expires_at END
                WHERE forentrace_login_attempts.expires_at <= now()
                    OR forentrace_login_attempts.count + forentrace_login_attempts.in_flight < %s
                RETURNING expires_at
            """, (bucket, limit)).fetchone()
            if reservation is None:
                raise HTTPException(429, "Too many login attempts. Try again later.")
            reservations[bucket] = reservation[0]
        conn.execute("""
            DELETE FROM forentrace_login_attempts WHERE bucket IN (
                SELECT bucket FROM forentrace_login_attempts WHERE expires_at <= now() LIMIT 250 FOR UPDATE SKIP LOCKED
            )
        """)
        user = conn.execute(
            "SELECT organization_id, password_hash FROM forentrace_users WHERE username = %s",
            (username,),
        ).fetchone()
    stored = user[1] if user else f"{'0' * 32}:{'0' * 128}"
    salt = bytes.fromhex(stored.split(":", 1)[0])
    verified = compare_digest(hash_password(password, salt), stored) and user is not None
    with database.connect() as conn:
        for bucket, expires_at in reservations.items():
            account = bucket == account_bucket
            updated = conn.execute("""
                UPDATE forentrace_login_attempts SET in_flight = in_flight - 1,
                    count = CASE WHEN %s THEN 0 ELSE count + %s END
                WHERE bucket = %s AND expires_at = %s RETURNING count, in_flight
            """, (account and verified, int(not verified), bucket, expires_at)).fetchone()
            if account and updated == (0, 0):
                conn.execute("DELETE FROM forentrace_login_attempts WHERE bucket = %s", (bucket,))
            if user and account and updated and not verified and updated[0] == 5:
                record_alert(conn, "account", username, "repeated_password_failures")
    if not verified:
        raise HTTPException(401, "Invalid investigator ID or password.")
    return user[0]


def login(username: str, password: str, host: str, previous: str | None) -> tuple[Identity, str]:
    organization = authenticate_password(username, password, host)
    token = token_urlsafe(32)
    with database.connect() as conn:
        conn.execute("DELETE FROM forentrace_sessions WHERE expires_at <= now() OR token_hash = %s",
                     (_digest(previous) if previous else "",))
        conn.execute("""
            INSERT INTO forentrace_sessions (token_hash, username, expires_at) VALUES (%s, %s, now() + %s * interval '1 second')
        """, (_digest(token), username, SESSION_SECONDS))
        return _identity(conn, username, organization), token


def current_identity(request: Request) -> Identity | None:
    if database is None:
        if settings.FORENTRACE_SEED_DEMO is True:
            return None
        raise HTTPException(503, "The authenticated API requires PostgreSQL.")
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        with database.connect() as conn:
            user = conn.execute("""
                UPDATE forentrace_sessions s SET last_seen_at = now() FROM forentrace_users u
                WHERE s.username = u.username AND s.token_hash = %s AND s.expires_at > now()
                    AND s.last_seen_at > now() - %s * interval '1 minute'
                RETURNING u.username, u.organization_id, s.step_up_at
            """, (_digest(token), settings.FORENTRACE_SESSION_IDLE_MINUTES)).fetchone()
            if user:
                return _identity(conn, *user, session_hash=_digest(token))
    raise HTTPException(401, "Sign in to continue.")


def revoke_session(request: Request) -> None:
    token = request.cookies.get(SESSION_COOKIE)
    if token and database:
        with database.connect() as conn:
            conn.execute("DELETE FROM forentrace_sessions WHERE token_hash = %s", (_digest(token),))
