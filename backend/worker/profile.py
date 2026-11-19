"""Fixed byte-profile analyzer. Input is always opened as bytes."""

from hashlib import sha256
from collections import Counter
import json
import re
from math import log2
import signal
import sys

MAGIC = (
    (b"%PDF-", "PDF"), (b"\x89PNG\r\n\x1a\n", "PNG"), (b"\xff\xd8\xff", "JPEG"),
    (b"PK\x03\x04", "ZIP"), (b"PK\x05\x06", "ZIP"), (b"\x1f\x8b", "GZIP"), (b"SQLite format 3\x00", "SQLite"),
    (b"\x7fELF", "ELF"), (b"MZ", "MZ"), (b"\x0a\x0d\x0d\x0a", "PCAPNG"),
)

signal.alarm(45)
analyzer = sys.argv[1] if len(sys.argv) == 2 else "file-profile"
if analyzer not in {"file-profile", "byte-entropy", "text-metrics", "cve-references", "attack-references"}:
    raise SystemExit("Unknown analyzer")
digest = sha256()
size = printable = line_feeds = nul = 0
counts = Counter()
non_printable = bytes(range(32)) + bytes(range(127, 256))
reference_pattern = re.compile(
    rb"(?<![a-z0-9])T[0-9]{4}(?:\.[0-9]{3})?(?![a-z0-9]|\.[0-9])" if analyzer == "attack-references"
    else rb"(?<![a-z0-9])CVE-[0-9]{4}-[0-9]{4,19}(?![a-z0-9])", re.IGNORECASE,
)
references = set()
tail = b""
continued = False


def scan_references(data, start, final=False):
    for match in reference_pattern.finditer(data, start):
        # Leave space for a dot and digit that could extend an ATT&CK token.
        if final or match.end() < len(data) - 1:
            references.add(match.group().decode("ascii").upper())
            if len(references) > 50:
                break


with open("/input/evidence", "rb") as evidence:
    prefix = evidence.peek(16)[:16]
    while chunk := evidence.read(1024 * 1024):
        digest.update(chunk)
        size += len(chunk)
        if analyzer == "byte-entropy":
            counts.update(chunk)
        elif analyzer == "text-metrics":
            printable += len(chunk.translate(None, non_printable))
            line_feeds += chunk.count(b"\n")
            nul += chunk.count(b"\0")
        elif analyzer in {"cve-references", "attack-references"} and len(references) <= 50:
            data = tail + chunk
            scan_references(data, int(continued))
            continued = len(data) > 32
            tail = data[-32:]
report = {"format": f"forentrace.{analyzer}.v1", "sha256": digest.hexdigest(), "byte_count": size}
if analyzer == "file-profile":
    report["classification"] = next((label for magic, label in MAGIC if prefix.startswith(magic)), "Unknown")
elif analyzer == "byte-entropy":
    entropy = -sum((count / size) * log2(count / size) for count in counts.values())
    report.update(entropy_millibits=round(entropy * 1000), distinct_bytes=len(counts))
elif analyzer == "text-metrics":
    report.update(printable_ascii_bytes=printable, line_feeds=line_feeds, nul_bytes=nul)
else:
    if len(references) <= 50:
        scan_references(tail, int(continued), final=True)
    field = "cve_ids" if analyzer == "cve-references" else "technique_ids"
    report.update({field: sorted(references)[:50], "truncated": len(references) > 50})
print(json.dumps(report))
