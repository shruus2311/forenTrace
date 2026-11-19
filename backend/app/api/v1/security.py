from datetime import datetime, timedelta
from secrets import token_urlsafe
from urllib.parse import urlsplit
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from webauthn import (
    base64url_to_bytes, generate_authentication_options, generate_registration_options, options_to_json,
    verify_authentication_response, verify_registration_response,
)
from webauthn.helpers import bytes_to_base64url, parse_authentication_credential_json
from webauthn.helpers.exceptions import WebAuthnException
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria, PublicKeyCredentialDescriptor, UserVerificationRequirement,
)

from app.api.v1.analysis import authenticated
from app.core.access import Identity, SESSION_COOKIE, _digest, authenticate_password
from app.core.alerts import Alert, list_alerts, record_alert
from app.core.config import settings
from app.core.database import database
from app.services.emergency_access import EmergencyApproval, activate, approvals
from app.services.custody_ledger import CustodyRequestConflict
from cryptography.exceptions import InvalidSignature

router = APIRouter(prefix="/security", tags=["Workstation security"])
REQUIRED = UserVerificationRequirement.REQUIRED


class Password(BaseModel):
    password: str = Field(min_length=1, max_length=256, repr=False)


class EnrollmentPassword(Password):
    enrollment_code: str | None = Field(default=None, min_length=16, max_length=100, repr=False)


class PasskeyState(BaseModel):
    enabled: bool
    credentials: list[str]
    verified_at: datetime | None


def relying_party() -> tuple[str, str]:
    origin = settings.FORENTRACE_WEBAUTHN_ORIGIN
    if not origin:
        raise HTTPException(503, "Passkeys are unavailable until the workstation origin is configured.")
    try:
        url = urlsplit(origin)
        host = url.hostname
        allowed = url.scheme == "https" or (url.scheme == "http" and host == "localhost")
        if not host or not allowed or origin != f"{url.scheme}://{host}" + (f":{url.port}" if url.port else ""):
            raise ValueError
    except ValueError as error:
        raise HTTPException(503, "The configured passkey origin is invalid.") from error
    return origin, host


def session_hash(request: Request) -> str:
    return _digest(request.cookies[SESSION_COOKIE])


def lock_passkey_account(conn, username: str) -> None:
    # Recovery also locks the account before touching credentials or sessions.
    conn.execute("SELECT 1 FROM forentrace_users WHERE username = %s FOR UPDATE", (username,))


def confirm_password(body: Password, request: Request, identity: Identity):
    try:
        authenticate_password(identity.username, body.password, request.client.host if request.client else "unknown")
    except HTTPException as error:
        if error.status_code == 401:
            raise HTTPException(403, "Password confirmation failed.") from error
        raise


def require_enrollment_session(conn, request: Request, *, operator_approved: bool):
    row = conn.execute("""
        SELECT expires_at, last_seen_at, step_up_at FROM forentrace_sessions WHERE token_hash = %s FOR UPDATE
    """, (session_hash(request),)).fetchone()
    now = conn.execute("SELECT clock_timestamp()").fetchone()[0]
    if not row or row[0] <= now or row[1] <= now - timedelta(minutes=settings.FORENTRACE_SESSION_IDLE_MINUTES):
        raise HTTPException(401, "Sign in to continue.")
    step_up = row[2]
    if not operator_approved and (step_up is None or not now - timedelta(minutes=10) < step_up <= now):
        raise HTTPException(403, "Verify with an existing passkey or use an operator enrollment code.")


def store_challenge(request: Request, kind: str, options, *, username: str = "", code: str | None = None) -> Response:
    token_hash = session_hash(request)
    code_hash = _digest(code) if code is not None else None
    with database.connect() as conn:
        if kind == "enroll":
            require_enrollment_session(conn, request, operator_approved=code_hash is not None)
            if code_hash is not None and not conn.execute("""
                UPDATE forentrace_passkey_enrollment SET reserved_session = %s
                WHERE username = %s AND code_hash = %s AND expires_at > clock_timestamp()
                    AND (reserved_session IS NULL OR reserved_session = %s)
                RETURNING username
            """, (token_hash, username, code_hash, token_hash)).fetchone():
                raise HTTPException(403, "The enrollment code is unavailable for this session.")
        conn.execute("""
            INSERT INTO forentrace_webauthn_challenges (session_hash, kind, challenge, expires_at, enrollment_code_hash)
            VALUES (%s, %s, %s, clock_timestamp() + interval '2 minutes', %s) ON CONFLICT (session_hash, kind) DO UPDATE
            SET challenge = EXCLUDED.challenge, expires_at = EXCLUDED.expires_at, enrollment_code_hash = EXCLUDED.enrollment_code_hash
        """, (token_hash, kind, options.challenge, code_hash))
    return Response(content=options_to_json(options), media_type="application/json")


def take_challenge(request: Request, kind: str) -> tuple[bytes, str | None]:
    with database.connect() as conn:
        row = conn.execute("""
            DELETE FROM forentrace_webauthn_challenges WHERE session_hash = %s AND kind = %s
            RETURNING challenge, expires_at > clock_timestamp(), enrollment_code_hash
        """, (session_hash(request), kind)).fetchone()
    if row is None or not row[1]:
        raise HTTPException(409, "Start a new passkey request.")
    return row[0], row[2]


def descriptors(username: str):
    with database.connect() as conn:
        return [PublicKeyCredentialDescriptor(id=value) for (value,) in conn.execute(
            "SELECT credential_id FROM forentrace_passkeys WHERE username = %s ORDER BY enrolled_at", (username,))]


def failed(identity: Identity, error: Exception):
    with database.connect() as conn:
        record_alert(conn, "account", identity.username, "passkey_verification_failed")
    raise HTTPException(403, "The passkey response could not be verified.") from error


@router.get("/passkeys", response_model=PasskeyState)
def passkey_state(request: Request, identity: Identity = Depends(authenticated)):
    with database.connect() as conn:
        row = conn.execute("SELECT step_up_at FROM forentrace_sessions WHERE token_hash = %s",
                           (session_hash(request),)).fetchone()
    return PasskeyState(enabled=bool(settings.FORENTRACE_WEBAUTHN_ORIGIN), verified_at=row[0] if row else None,
                        credentials=[bytes_to_base64url(item.id) for item in descriptors(identity.username)])


@router.post("/passkeys/enroll/options")
def enrollment_options(body: EnrollmentPassword, request: Request, identity: Identity = Depends(authenticated)):
    _, host = relying_party()
    confirm_password(body, request, identity)
    keys = descriptors(identity.username)
    if len(keys) >= 10:
        raise HTTPException(409, "Remove an enrolled passkey first.")
    options = generate_registration_options(
        rp_id=host, rp_name="ForenTrace", user_name=identity.username, user_id=bytes.fromhex(_digest(identity.username)),
        authenticator_selection=AuthenticatorSelectionCriteria(user_verification=REQUIRED), exclude_credentials=keys,
    )
    return store_challenge(request, "enroll", options, username=identity.username, code=body.enrollment_code)


@router.post("/passkeys/enroll/finish", status_code=204)
def enroll(credential: dict, request: Request, identity: Identity = Depends(authenticated)):
    origin, host = relying_party()
    challenge, code_hash = take_challenge(request, "enroll")
    try:
        key = verify_registration_response(credential=credential, expected_challenge=challenge,
                                           expected_rp_id=host, expected_origin=origin, require_user_verification=True)
    except (WebAuthnException, ValueError, TypeError) as error:
        failed(identity, error)
    with database.connect() as conn:
        lock_passkey_account(conn, identity.username)
        require_enrollment_session(conn, request, operator_approved=code_hash is not None)
        if code_hash is not None and not conn.execute("""
            DELETE FROM forentrace_passkey_enrollment WHERE username = %s AND code_hash = %s
                AND reserved_session = %s AND expires_at > clock_timestamp() RETURNING username
        """, (identity.username, code_hash, session_hash(request))).fetchone():
            raise HTTPException(403, "The enrollment code is unavailable for this session.")
        if conn.execute("SELECT count(*) FROM forentrace_passkeys WHERE username = %s", (identity.username,)).fetchone()[0] >= 10:
            raise HTTPException(409, "Remove an enrolled passkey first.")
        if not conn.execute("""
            INSERT INTO forentrace_passkeys (credential_id, username, public_key, sign_count) VALUES (%s, %s, %s, %s)
            ON CONFLICT DO NOTHING RETURNING credential_id
        """, (key.credential_id, identity.username, key.credential_public_key, key.sign_count)).fetchone():
            raise HTTPException(409, "This passkey is already enrolled.")
        record_alert(conn, "account", identity.username, "passkey_enrolled")


@router.post("/passkeys/verify/options")
def verification_options(request: Request, identity: Identity = Depends(authenticated)):
    _, host = relying_party()
    keys = descriptors(identity.username)
    if not keys:
        raise HTTPException(409, "Enroll a passkey first.")
    options = generate_authentication_options(rp_id=host, allow_credentials=keys, user_verification=REQUIRED)
    return store_challenge(request, "verify", options)


@router.post("/passkeys/verify/finish", status_code=204)
def verify(credential: dict, request: Request, response: Response, identity: Identity = Depends(authenticated)):
    origin, host = relying_party()
    challenge, _ = take_challenge(request, "verify")
    try:
        assertion = parse_authentication_credential_json(credential)
        token = token_urlsafe(32)
        with database.connect() as conn:
            lock_passkey_account(conn, identity.username)
            key = conn.execute("""
                SELECT public_key, sign_count FROM forentrace_passkeys
                WHERE credential_id = %s AND username = %s FOR UPDATE
            """, (assertion.raw_id, identity.username)).fetchone()
            if key is None:
                raise ValueError("Unknown credential")
            result = verify_authentication_response(
                credential=assertion, expected_challenge=challenge, expected_rp_id=host, expected_origin=origin,
                credential_public_key=key[0], credential_current_sign_count=key[1], require_user_verification=True,
            )
            conn.execute("UPDATE forentrace_passkeys SET sign_count = %s WHERE credential_id = %s",
                         (result.new_sign_count, result.credential_id))
            session = conn.execute("""
                DELETE FROM forentrace_sessions WHERE token_hash = %s AND expires_at > now()
                RETURNING expires_at, ceil(extract(epoch from expires_at - now()))::int
            """, (session_hash(request),)).fetchone()
            if not session:
                raise HTTPException(401, "Sign in to continue.")
            conn.execute("""
                INSERT INTO forentrace_sessions (token_hash, username, expires_at, step_up_at) VALUES (%s, %s, %s, now())
            """, (_digest(token), identity.username, session[0]))
            record_alert(conn, "account", identity.username, "passkey_verified")
    except (WebAuthnException, ValueError, TypeError) as error:
        failed(identity, error)
    response.set_cookie(SESSION_COOKIE, token, max_age=session[1], httponly=True,
                        secure=settings.FORENTRACE_COOKIE_SECURE, samesite="strict", path=settings.API_V1_STR)


@router.post("/passkeys/{credential_id}/revoke", status_code=204)
def revoke(credential_id: str, body: Password, request: Request, identity: Identity = Depends(authenticated)):
    confirm_password(body, request, identity)
    try:
        key = base64url_to_bytes(credential_id)
    except ValueError as error:
        raise HTTPException(404, "Passkey not found.") from error
    with database.connect() as conn:
        lock_passkey_account(conn, identity.username)
        if not conn.execute("DELETE FROM forentrace_passkeys WHERE credential_id = %s AND username = %s RETURNING username",
                            (key, identity.username)).fetchone():
            raise HTTPException(404, "Passkey not found.")
        require_enrollment_session(conn, request, operator_approved=False)
        conn.execute("UPDATE forentrace_sessions SET step_up_at = NULL WHERE username = %s", (identity.username,))
        record_alert(conn, "account", identity.username, "passkey_revoked")


@router.get("/alerts", response_model=list[Alert])
def alerts(case_id: str | None = None, identity: Identity = Depends(authenticated)):
    if case_id:
        identity.case_ids(case_id)
    with database.connect() as conn:
        return list_alerts(conn, "case" if case_id else "account", case_id or identity.username)


@router.get("/emergency", response_model=list[EmergencyApproval])
def emergency_approvals(request: Request, identity: Identity = Depends(authenticated)):
    return approvals(identity.username, session_hash(request))


@router.post("/emergency/{approval_id}/activate")
def activate_emergency(approval_id: UUID, request: Request, identity: Identity = Depends(authenticated)):
    try:
        return {"ledger_id": activate(approval_id, identity.username, session_hash(request))}
    except (CustodyRequestConflict, InvalidSignature) as error:
        raise HTTPException(409, "The emergency activation could not be sealed to the ledger.") from error
