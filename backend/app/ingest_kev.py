"""Import a validated CISA Known Exploited Vulnerabilities catalog snapshot."""

import argparse
from datetime import date, datetime
from hashlib import sha256
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import urlopen

from pydantic import BaseModel, Field, ValidationError

from app.core.database import database
from app.schemas.analysis import CISA_KEV_URL

MAX_BYTES = 16 * 1024 * 1024


class Vulnerability(BaseModel):
    cveID: str = Field(pattern=r"^CVE-[0-9]{4}-[0-9]{4,}$", max_length=32)
    vendorProject: str = Field(min_length=1, max_length=512)
    product: str = Field(min_length=1, max_length=512)
    vulnerabilityName: str = Field(min_length=1, max_length=2000)
    shortDescription: str = Field(min_length=1, max_length=10000)
    requiredAction: str = Field(min_length=1, max_length=10000)
    dateAdded: date
    dueDate: date


class Catalog(BaseModel):
    catalogVersion: str = Field(min_length=1, max_length=64)
    dateReleased: datetime
    count: int = Field(ge=1, strict=True)
    vulnerabilities: list[Vulnerability] = Field(min_length=1, max_length=10000)


def ingest(raw: bytes, *, from_https: bool = False, allow_unchanged: bool = False) -> int:
    if len(raw) > MAX_BYTES:
        raise ValueError("CISA KEV catalog exceeds the import size limit.")
    catalog = Catalog.model_validate_json(raw)
    ids = {entry.cveID for entry in catalog.vulnerabilities}
    if catalog.dateReleased.utcoffset() is None or len(ids) != catalog.count or len(ids) != len(catalog.vulnerabilities):
        raise ValueError("CISA KEV catalog contains an invalid release time, count, or duplicate CVE.")
    digest = sha256(raw).hexdigest()
    with database.connect() as conn:
        conn.execute("SELECT pg_advisory_xact_lock(130518, 4)")
        current = conn.execute("SELECT released_at, source_sha256, source_mode FROM forentrace_kev_catalog").fetchone()
        if current and allow_unchanged and current[1] == digest:
            if from_https and current[2] == "local_file":
                conn.execute("UPDATE forentrace_kev_catalog SET source_mode = 'official_https', imported_at = now()")
            return 0
        if current and catalog.dateReleased <= current[0]:
            raise ValueError("The CISA KEV catalog release must be newer than the current import.")
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM forentrace_kev_entries")
            cursor.executemany("INSERT INTO forentrace_kev_entries VALUES (%s, %s, %s, %s, %s, %s, %s, %s)", [
                (entry.cveID, entry.vendorProject, entry.product, entry.vulnerabilityName,
                 entry.shortDescription, entry.requiredAction, entry.dateAdded, entry.dueDate)
                for entry in catalog.vulnerabilities
            ])
        conn.execute("""
            INSERT INTO forentrace_kev_catalog VALUES (TRUE, %s, %s, now(), %s, %s)
            ON CONFLICT (singleton) DO UPDATE
            SET version = EXCLUDED.version, released_at = EXCLUDED.released_at, imported_at = EXCLUDED.imported_at,
                source_mode = EXCLUDED.source_mode, source_sha256 = EXCLUDED.source_sha256
        """, (catalog.catalogVersion, catalog.dateReleased, "official_https" if from_https else "local_file",
              digest))
    return len(ids)


def import_official(*, allow_unchanged: bool = False) -> int:
    with urlopen(CISA_KEV_URL, timeout=20) as source:
        location = urlsplit(source.geturl())
        if location.scheme != "https" or location.hostname not in {"www.cisa.gov", "cisa.gov"}:
            raise ValueError("CISA catalog redirected to an unexpected source.")
        return ingest(source.read(MAX_BYTES + 1), from_https=True, allow_unchanged=allow_unchanged)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--file", type=Path, help="Import a locally supplied copy of the official catalog")
    args = parser.parse_args()
    if not database:
        parser.error("Configure PostgreSQL before importing the catalog.")
    try:
        if args.file:
            with args.file.open("rb") as source:
                count = ingest(source.read(MAX_BYTES + 1))
        else:
            count = import_official()
    except ValidationError:
        parser.error("CISA KEV catalog format is invalid.")
    except (OSError, ValueError) as error:
        parser.error(str(error))
    print(f"Imported {count} CISA KEV entries.")


if __name__ == "__main__":
    main()
