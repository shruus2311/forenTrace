"""Verify a ForenTrace ledger export or inclusion proof offline."""

import argparse
import json
from pathlib import Path
import sys
from typing import Annotated

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from pydantic import Field, TypeAdapter, ValidationError

from app.crypto.ed25519_signer import export_public_key_hex, import_public_key_hex
from app.crypto.ledger import verify_document
from app.schemas.custody import LedgerProofExport, SignedLedgerExport

DOCUMENTS = TypeAdapter(Annotated[LedgerProofExport | SignedLedgerExport, Field(discriminator="format")])


def unique_object(pairs):
    result = {}
    for name, value in pairs:
        if name in result:
            raise ValueError("Duplicate field in ledger JSON.")
        result[name] = value
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    key = commands.add_parser("public-key", help="Print the public half of an operator's signing key")
    key.add_argument("signing_key_file", type=Path)
    verify = commands.add_parser("verify", help="Verify an exported JSON file using a trusted public key")
    verify.add_argument("document", type=Path)
    verify.add_argument("--public-key", type=Path, required=True, help="File containing trusted Ed25519 public key hex")
    verify.add_argument("--case-id", required=True)
    verify.add_argument("--organization-id")
    args = parser.parse_args()

    try:
        if args.command == "public-key":
            private_key = Ed25519PrivateKey.from_private_bytes(args.signing_key_file.read_bytes())
            print(export_public_key_hex(private_key.public_key()))
        else:
            public_key = import_public_key_hex(args.public_key.read_text(encoding="utf-8-sig"))
            with args.document.open(encoding="utf-8") as source:
                raw = json.load(source, object_pairs_hook=unique_object)
            document = DOCUMENTS.validate_python(raw)
            verify_document(document, public_key, args.case_id, args.organization_id)
            print(f"Verified {document.format} for case {args.case_id}.")
    except ValidationError:
        print("Verification failed: invalid ledger document format.", file=sys.stderr)
        return 1
    except (InvalidSignature, OSError, ValueError) as error:
        print(f"Ledger operation failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
