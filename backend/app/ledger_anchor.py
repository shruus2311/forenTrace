"""Initialize or check the independent custody ledger anchor."""

import argparse

from cryptography.exceptions import InvalidSignature

from app.core.config import settings
from app.core.database import database
from app.core.ledger_anchor import AnchorUnavailable
from app.services.custody_ledger import custody_ledger_service


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    actions = parser.add_subparsers(dest="command", required=True)
    initialize = actions.add_parser("initialize")
    initialize.add_argument("--adopt-existing", action="store_true")
    actions.add_parser("check")
    args = parser.parse_args()
    if database is None:
        parser.error("Independent ledger anchoring requires PostgreSQL.")
    if not settings.FORENTRACE_LEDGER_ANCHOR_ID:
        parser.error("Configure the independent ledger anchor first.")
    try:
        if args.command == "initialize":
            count = custody_ledger_service.initialize_anchor(adopt_existing=args.adopt_existing)
        else:
            records = custody_ledger_service.list_records()
            if not all(record.integrity_verified for record in records):
                raise InvalidSignature("The ledger failed block verification.")
            count = len(records)
    except (AnchorUnavailable, InvalidSignature) as error:
        parser.error(str(error))
    print(f"Independent ledger anchor confirmed through position {count}.")


if __name__ == "__main__":
    main()
