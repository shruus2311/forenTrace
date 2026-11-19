"""Issue a single-use passkey enrollment code after checking identity out of band."""

import argparse
from secrets import token_urlsafe

from app.core.access import _digest
from app.core.alerts import record_alert
from app.core.database import database


def issue(username: str, *, reset: bool = False) -> str:
    if database is None:
        raise ValueError("Configure PostgreSQL before enrolling passkeys.")
    code = token_urlsafe(32)
    with database.connect() as conn:
        if not conn.execute("SELECT 1 FROM forentrace_users WHERE username = %s FOR UPDATE", (username,)).fetchone():
            raise ValueError("Account not found.")
        if reset:
            conn.execute("DELETE FROM forentrace_passkeys WHERE username = %s", (username,))
            conn.execute("DELETE FROM forentrace_sessions WHERE username = %s", (username,))
            record_alert(conn, "account", username, "passkeys_reset")
        conn.execute("""
            INSERT INTO forentrace_passkey_enrollment (username, code_hash, expires_at)
            VALUES (%s, %s, now() + interval '15 minutes') ON CONFLICT (username) DO UPDATE
            SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, reserved_session = NULL
        """, (username, _digest(code)))
    return code


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("username")
    parser.add_argument("--reset", action="store_true", help="Revoke the account's passkeys and active sessions before recovery")
    args = parser.parse_args()
    try:
        print(issue(args.username, reset=args.reset))
    except ValueError as error:
        parser.error(str(error))


if __name__ == "__main__":
    main()
