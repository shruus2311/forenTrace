"""Import FIRST EPSS scores and MITRE Enterprise ATT&CK technique metadata."""

import argparse
import csv
import gzip
from datetime import date, datetime, timezone
from email.utils import parsedate_to_datetime
from hashlib import sha256
from io import BytesIO, TextIOWrapper
import json
from pathlib import Path
import re
from urllib.parse import urlsplit
from urllib.error import HTTPError
from urllib.request import HTTPRedirectHandler, build_opener

from psycopg.types.json import Jsonb

from app.core.database import database

URLS = {
    "first-epss": "https://epss.empiricalsecurity.com/epss_scores-current.csv.gz",
    "mitre-attack": "https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack.json",
}
MAX_BYTES = 64 * 1024 * 1024
MAX_EPSS_ROWS = 700_000


class FeedRateLimited(RuntimeError):
    def __init__(self, header: str | None):
        try:
            seconds = int(header) if header and header.isdecimal() else int(
                (parsedate_to_datetime(header) - datetime.now(timezone.utc)).total_seconds())
        except (TypeError, ValueError, OverflowError):
            seconds = 900
        self.retry_after = min(max(seconds, 60), 86400)
        super().__init__("The intelligence feed is rate limited.")


class FeedRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, newurl):
        next_url = urlsplit(newurl)
        if next_url.scheme != "https" or next_url.netloc != urlsplit(request.full_url).netloc:
            raise ValueError("Intelligence feed redirected to an unexpected source.")
        return super().redirect_request(request, fp, code, message, headers, newurl)


def parse_epss(raw):
    if raw.startswith(b"\x1f\x8b"):
        with gzip.GzipFile(fileobj=BytesIO(raw)) as stream:
            raw = stream.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        raise ValueError("The expanded EPSS snapshot exceeds its size limit.")
    with TextIOWrapper(BytesIO(raw), encoding="utf-8", newline="") as text:
        header = re.fullmatch(r"#model_version:([a-zA-Z0-9_.-]{1,40}),score_date:([^\s,]{10,40})\s*", text.readline(128))
        if header is None:
            raise ValueError("The EPSS model or score date is missing.")
        model, score_date = header.groups()
        observed = (datetime.combine(date.fromisoformat(score_date), datetime.min.time(), timezone.utc)
                    if len(score_date) == 10 else datetime.fromisoformat(score_date))
        if observed.utcoffset() is None:
            raise ValueError("The EPSS score date must include an offset.")
        reader = csv.DictReader(text)
        if reader.fieldnames != ["cve", "epss", "percentile"]:
            raise ValueError("The EPSS columns are invalid.")
        entries = {}
        for index, row in enumerate(reader):
            key = row["cve"]
            if (index >= MAX_EPSS_ROWS or not re.fullmatch(r"CVE-[0-9]{4}-[0-9]{4,19}", key or "")
                    or key in entries or None in row):
                raise ValueError("Invalid or duplicate EPSS record.")
            score, percentile = float(row["epss"]), float(row["percentile"])
            if not (0 <= score <= 1 and 0 <= percentile <= 1):
                raise ValueError("EPSS values must be probabilities.")
            entries[key] = {"score": score, "percentile": percentile}
    return f"{model} · {observed.date().isoformat()}", observed, entries


def parse_attack(raw):
    bundle = json.loads(raw)
    if not isinstance(bundle, dict) or bundle.get("type") != "bundle" or not isinstance(bundle.get("objects"), list):
        raise ValueError("Expected a MITRE STIX bundle.")
    entries = {}
    updates = []
    for item in bundle["objects"]:
        if item.get("type") != "attack-pattern":
            continue
        modified = datetime.fromisoformat(item["modified"])
        if modified.utcoffset() is None:
            raise ValueError("MITRE timestamps must include an offset.")
        updates.append(modified)
        if item.get("revoked") or item.get("x_mitre_deprecated"):
            continue
        references = [ref for ref in item.get("external_references", ()) if ref.get("source_name") == "mitre-attack"]
        if len(references) != 1:
            raise ValueError("Each technique must have a single MITRE reference.")
        identifier = references[0].get("external_id", "")
        title = item.get("name", "")
        if (not re.fullmatch(r"T[0-9]{4}(?:\.[0-9]{3})?", identifier) or identifier in entries
                or not isinstance(title, str) or not 1 <= len(title) <= 200):
            raise ValueError("Invalid or duplicate MITRE technique.")
        entries[identifier] = {"title": title}
    if not entries:
        raise ValueError("The bundle contains no active enterprise techniques.")
    newest = max(updates)
    return newest.date().isoformat(), newest, entries


def ingest(source: str, raw: bytes, *, official: bool = False) -> int:
    if len(raw) > MAX_BYTES:
        raise ValueError("The intelligence snapshot exceeds its size limit.")
    parser = {"first-epss": parse_epss, "mitre-attack": parse_attack}[source]
    version, observed, entries = parser(raw)
    if not entries:
        raise ValueError("The intelligence snapshot is empty.")
    digest = sha256(raw).hexdigest()
    with database.connect() as conn:
        conn.execute("SELECT pg_advisory_xact_lock(130518, %s)", (17 if source == "first-epss" else 18,))
        current = conn.execute("SELECT observed_at, source_sha256 FROM forentrace_intel_catalogs WHERE source = %s", (source,)).fetchone()
        if current and current[1] == digest:
            if official:
                conn.execute("UPDATE forentrace_intel_catalogs SET source_mode = 'official_https' WHERE source = %s", (source,))
            return 0
        if current and observed < current[0]:
            raise ValueError("The intelligence snapshot is older than the current catalog.")
        conn.execute("""
            INSERT INTO forentrace_intel_catalogs (source, version, observed_at, source_sha256, source_mode)
            VALUES (%s, %s, %s, %s, %s) ON CONFLICT (source) DO UPDATE SET version = EXCLUDED.version,
            observed_at = EXCLUDED.observed_at, imported_at = now(), source_sha256 = EXCLUDED.source_sha256, source_mode = EXCLUDED.source_mode
        """, (source, version, observed, digest, "official_https" if official else "local_file"))
        conn.execute("DELETE FROM forentrace_intel_entries WHERE source = %s", (source,))
        with conn.cursor().copy("COPY forentrace_intel_entries (source, identifier, detail) FROM STDIN") as copy:
            for identifier, detail in entries.items():
                copy.write_row((source, identifier, Jsonb(detail)))
    return len(entries)


def import_official(source: str) -> int:
    try:
        with build_opener(FeedRedirect()).open(URLS[source], timeout=30) as response:
            return ingest(source, response.read(MAX_BYTES + 1), official=True)
    except HTTPError as error:
        if error.code == 429:
            raise FeedRateLimited(error.headers.get("Retry-After")) from error
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", choices=URLS)
    parser.add_argument("--file", type=Path)
    args = parser.parse_args()
    if database is None:
        parser.error("Configure PostgreSQL before importing intelligence.")
    try:
        if args.file:
            with args.file.open("rb") as snapshot:
                count = ingest(args.source, snapshot.read(MAX_BYTES + 1))
        else:
            count = import_official(args.source)
    except (OSError, ValueError, TypeError, KeyError, AttributeError, FeedRateLimited) as error:
        parser.error(f"The intelligence import failed ({type(error).__name__}).")
    print(f"Imported {count} records from {args.source}.")


if __name__ == "__main__":
    main()
