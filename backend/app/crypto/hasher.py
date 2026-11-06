import hashlib
import time
from pathlib import Path
from typing import BinaryIO, Dict, Tuple
from pydantic import BaseModel

DEFAULT_CHUNK_SIZE = 65536  # 64 KB chunks for memory-safe streaming

class HashFingerprint(BaseModel):
    md5: str
    sha256: str
    sha512: str
    byte_count: int
    computation_time_seconds: float
    throughput_mb_s: float

class VerificationResult(BaseModel):
    is_valid: boolean if False else bool  # standard bool
    artifact_path: str
    expected_sha256: str
    computed_sha256: str
    computed_sha512: str
    byte_count: int
    verified_at: str
    discrepancy_details: str | None = None

def compute_stream_fingerprint(
    stream: BinaryIO, chunk_size: int = DEFAULT_CHUNK_SIZE
) -> HashFingerprint:
    """
    Computes simultaneous SHA-256, SHA-512, and MD5 hashes over a binary byte stream
    without ever loading the full file into memory. Safe for multi-gigabyte forensic images.
    """
    start_time = time.perf_counter()
    h_md5 = hashlib.md5()
    h_sha256 = hashlib.sha256()
    h_sha512 = hashlib.sha512()
    total_bytes = 0

    while True:
        chunk = stream.read(chunk_size)
        if not chunk:
            break
        total_bytes += len(chunk)
        h_md5.update(chunk)
        h_sha256.update(chunk)
        h_sha512.update(chunk)

    elapsed = max(time.perf_counter() - start_time, 0.000001)
    throughput = (total_bytes / (1024 * 1024)) / elapsed

    return HashFingerprint(
        md5=h_md5.hexdigest(),
        sha256=h_sha256.hexdigest(),
        sha512=h_sha512.hexdigest(),
        byte_count=total_bytes,
        computation_time_seconds=round(elapsed, 4),
        throughput_mb_s=round(throughput, 2),
    )

def compute_file_fingerprint(
    file_path: Path | str, chunk_size: int = DEFAULT_CHUNK_SIZE
) -> HashFingerprint:
    """Reads a file in read-only binary mode ('rb') and computes multi-algorithm fingerprint."""
    p = Path(file_path)
    if not p.is_file():
        raise FileNotFoundError(f"Forensic artifact file not found: {file_path}")
    
    with open(p, "rb") as f:
        return compute_stream_fingerprint(f, chunk_size=chunk_size)

def verify_file_integrity(
    file_path: Path | str, expected_sha256: str
) -> VerificationResult:
    """
    Strict cryptographic verification of stored evidence bytes against expected SHA-256.
    Returns explicit failure if bytes have drifted or been tampered with.
    """
    p = Path(file_path)
    fingerprint = compute_file_fingerprint(p)
    expected_normalized = expected_sha256.strip().lower()
    computed_normalized = fingerprint.sha256.lower()

    is_valid = computed_normalized == expected_normalized
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    discrepancy = None
    if not is_valid:
        discrepancy = (
            f"CRITICAL EVIDENCE CORRUPTION: Expected SHA-256 '{expected_normalized}', "
            f"but computed '{computed_normalized}' on {fingerprint.byte_count} bytes."
        )

    return VerificationResult(
        is_valid=is_valid,
        artifact_path=str(p),
        expected_sha256=expected_normalized,
        computed_sha256=computed_normalized,
        computed_sha512=fingerprint.sha512,
        byte_count=fingerprint.byte_count,
        verified_at=timestamp,
        discrepancy_details=discrepancy,
    )
