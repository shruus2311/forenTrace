"""List pending registrations or recover an already stored original."""

import argparse
from uuid import UUID

from fastapi import HTTPException

from app.core.database import database
from app.core.evidence_objects import StorageUnavailable
from app.services.evidence_vault import evidence_vault_service


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("request_id", nargs="?", type=UUID, help="Omit to list pending registrations")
    args = parser.parse_args()
    if database is None:
        parser.error("Configure PostgreSQL before recovering evidence.")
    if args.request_id is None:
        with database.connect() as conn:
            rows = conn.execute("""
                SELECT request_id, evidence_id, case_id, created_at
                FROM forentrace_evidence_registrations WHERE NOT published ORDER BY created_at
            """)
            for request_id, evidence_id, case_id, created_at in rows:
                print(f"{request_id}  {evidence_id}  {case_id}  {created_at.isoformat()}")
        return
    try:
        artifact = evidence_vault_service.recover_registration(args.request_id)
    except HTTPException as error:
        parser.error(error.detail)
    except StorageUnavailable as error:
        parser.error(str(error))
    print(f"Registration published as {artifact.id}.")


if __name__ == "__main__":
    main()
