"""Run browser tests with a fresh PostgreSQL schema, signing key, and vault."""

import os
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
from unittest.mock import patch
from uuid import uuid4

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from psycopg import connect, sql
from psycopg.conninfo import make_conninfo


def main() -> int:
    url = os.environ.get("FORENTRACE_TEST_DATABASE_URL")
    if not url:
        raise SystemExit("Set FORENTRACE_TEST_DATABASE_URL to a disposable PostgreSQL database.")
    root = Path(__file__).resolve().parents[2]
    backend = root / "backend"
    schema = "test_playwright_" + uuid4().hex
    with TemporaryDirectory() as folder, connect(url, autocommit=True) as admin:
        scratch = Path(folder)
        key = Ed25519PrivateKey.generate()
        private_file, public_file = scratch / "signing.key", scratch / "public-key.hex"
        private_file.write_bytes(key.private_bytes_raw())
        public_file.write_text(key.public_key().public_bytes_raw().hex(), encoding="ascii")
        admin.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
        try:
            for name in tuple(os.environ):
                if name.startswith("FORENTRACE_"):
                    del os.environ[name]
            os.environ.update(
                PYTHONPATH=str(backend), FORENTRACE_DATABASE_URL=make_conninfo(url, options=f"-c search_path={schema}"),
                FORENTRACE_SIGNING_KEY_FILE=str(private_file), FORENTRACE_COOKIE_SECURE="false",
                FORENTRACE_SEED_DEMO="false", EVIDENCE_VAULT_DIR=str(scratch / "vault"),
                ANALYSIS_ARTIFACTS_DIR=str(scratch / "analysis"), FORENTRACE_E2E_PYTHON=sys.executable,
                FORENTRACE_E2E_PUBLIC_KEY=str(public_file),
            )
            sys.path.insert(0, str(backend))
            from app.core.database import database
            from app.provision import provision
            from app.services.evidence_vault import evidence_vault_service
            from psycopg.types.json import Jsonb

            with patch("app.provision.getpass", return_value="forentrace-e2e-test-password"):
                provision("browser-lab", "browser-investigator", "browser-case", "investigator")
                provision("browser-lab", "browser-investigator", "browser-secondary", "investigator")
                provision("outside-lab", "browser-outsider", "outside-case", "viewer")
            original = scratch / "vault" / "restricted-original"
            original.write_bytes(b"Synthetic evidence for the restricted browser fixture.")
            artifact = evidence_vault_service.register(original, "browser-case", "restricted fixture.txt", "OTHER",
                                                       None, "browser-investigator")
            with database.connect() as conn:
                conn.execute("INSERT INTO forentrace_evidence_policy (evidence_id, policy) VALUES (%s, %s)",
                             (artifact.id, Jsonb({"valid_from": "2099-01-01T00:00:00Z"})))
            os.environ["FORENTRACE_E2E_RESTRICTED_ID"] = artifact.id
            return subprocess.call(["node", str(root / "node_modules" / "@playwright" / "test" / "cli.js"),
                                    "test", *sys.argv[1:]], cwd=root)
        finally:
            admin.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))


if __name__ == "__main__":
    raise SystemExit(main())
