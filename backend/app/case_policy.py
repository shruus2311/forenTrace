"""Set, clear, or inspect a case access policy as a database operator."""

import argparse
from pathlib import Path

from psycopg.types.json import Jsonb
from pydantic import ValidationError

from app.core.database import database
from app.core.time_policy import TimePolicy


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("target_id")
    parser.add_argument("--evidence", action="store_true", help="Manage policy for a single evidence ID")
    action = parser.add_mutually_exclusive_group()
    action.add_argument("--set", type=Path, metavar="POLICY_JSON")
    action.add_argument("--clear", action="store_true")
    args = parser.parse_args()
    if database is None:
        parser.error("Configure PostgreSQL before managing case policies.")
    try:
        policy = TimePolicy.model_validate_json(args.set.read_bytes()) if args.set else None
    except (OSError, ValidationError) as error:
        parser.error(str(error))
    with database.connect() as conn:
        table, column, target = ("forentrace_evidence_policy", "evidence_id", "forentrace_evidence") if args.evidence else (
            "forentrace_case_policy", "case_id", "forentrace_cases")
        if not conn.execute(f"SELECT 1 FROM {target} WHERE id = %s", (args.target_id,)).fetchone():
            parser.error("Policy target not found.")
        if args.set or args.clear:
            conn.execute(f"INSERT INTO {table} ({column}, policy) VALUES (%s, %s)",
                         (args.target_id, Jsonb(policy.model_dump(mode="json")) if policy else None))
        record = conn.execute(f"SELECT policy FROM {table} WHERE {column} = %s ORDER BY id DESC LIMIT 1",
                              (args.target_id,)).fetchone()
        print(TimePolicy.model_validate(record[0]).model_dump_json() if record and record[0] is not None else "No evidence policy." if args.evidence else "No case policy.")


if __name__ == "__main__":
    main()
