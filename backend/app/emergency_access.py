"""Approve, list for review, or close a time-limited emergency evidence approval."""

import argparse
from uuid import UUID

from app.core.database import database
from app.services.emergency_access import approve, review


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    actions = parser.add_subparsers(dest="command", required=True)
    approval = actions.add_parser("approve")
    approval.add_argument("username")
    approval.add_argument("evidence_id")
    approval.add_argument("--operator", required=True)
    approval.add_argument("--minutes", required=True, type=int)
    actions.add_parser("pending-review")
    close = actions.add_parser("review")
    close.add_argument("id", type=UUID)
    close.add_argument("--operator", required=True)
    args = parser.parse_args()
    if database is None:
        parser.error("Configure PostgreSQL before managing emergency access.")
    try:
        if args.command == "approve":
            print(approve(args.username, args.evidence_id, input("Approval reason: "), args.operator, args.minutes))
        elif args.command == "review":
            review(args.id, args.operator, input("Review note: "))
        else:
            with database.connect() as conn:
                for row in conn.execute("""
                    SELECT id, username, evidence_id, approved_by, reason, activated_at, expires_at, ledger_id
                    FROM forentrace_emergency_access WHERE reviewed_at IS NULL
                        AND (activated_at IS NOT NULL OR activate_before <= now()) ORDER BY approved_at
                """):
                    print(*row, sep=" · ")
    except ValueError as error:
        parser.error(str(error))


if __name__ == "__main__":
    main()
