"""Local operator command for provisioning users and case assignments."""

import argparse
from getpass import getpass
import re

from app.core.access import hash_password
from app.core.database import database


def provision(organization: str, username: str, case_id: str, role: str) -> None:
    if database is None:
        raise ValueError("Configure PostgreSQL before provisioning a user.")
    if any(not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,63}", value)
           for value in (organization, username, case_id)):
        raise ValueError("Organization, username, and case must be lowercase identifiers up to 64 characters.")

    with database.connect() as conn:
        user = conn.execute("SELECT organization_id FROM forentrace_users WHERE username = %s",
                            (username,)).fetchone()
    password_hash = None
    if not user:
        password = getpass("New password: ")
        if not 12 <= len(password) <= 256 or password != getpass("Confirm password: "):
            raise ValueError("Use a matching password between 12 and 256 characters.")
        password_hash = hash_password(password)

    with database.connect() as conn:
        conn.execute("INSERT INTO forentrace_organizations VALUES (%s) ON CONFLICT DO NOTHING", (organization,))
        if password_hash:
            created = conn.execute("""
                INSERT INTO forentrace_users VALUES (%s, %s, %s)
                ON CONFLICT DO NOTHING RETURNING username
            """, (username, organization, password_hash)).fetchone()
            if created is None:
                raise ValueError("Another operator created this user. The password you entered was not installed.")
        if conn.execute("SELECT organization_id FROM forentrace_users WHERE username = %s",
                        (username,)).fetchone() != (organization,):
            raise ValueError("That username belongs to a different organization.")
        conn.execute("INSERT INTO forentrace_cases VALUES (%s, %s) ON CONFLICT DO NOTHING",
                     (case_id, organization))
        if conn.execute("SELECT organization_id FROM forentrace_cases WHERE id = %s",
                        (case_id,)).fetchone() != (organization,):
            raise ValueError("That case belongs to a different organization.")
        conn.execute("""
            INSERT INTO forentrace_case_members VALUES (%s, %s, %s)
            ON CONFLICT (case_id, username) DO UPDATE SET role = EXCLUDED.role
        """, (case_id, username, role))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("organization")
    parser.add_argument("username")
    parser.add_argument("case")
    parser.add_argument("role", choices=("viewer", "investigator"))
    args = parser.parse_args()
    try:
        provision(args.organization, args.username, args.case, args.role)
    except ValueError as error:
        parser.error(str(error))
