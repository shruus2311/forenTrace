import os
import time
from contextlib import contextmanager, nullcontext
from hashlib import sha256
from pathlib import Path
from re import fullmatch
from tempfile import TemporaryDirectory
from threading import Lock
from typing import Dict, List, Optional
from uuid import UUID, uuid4
from cryptography.exceptions import InvalidSignature
from fastapi import HTTPException
from psycopg import Connection
from psycopg.types.json import Jsonb
from pydantic import ValidationError

from app.core.access import investigator_assigned
from app.core.config import settings
from app.core.database import database
from app.core.evidence_objects import OriginalAlreadyExists, StorageUnavailable, open_original, recover_original, store_original
from app.crypto.hasher import compute_file_fingerprint, compute_stream_fingerprint, verify_fingerprint
from app.crypto.ed25519_signer import canonical_json, generate_ed25519_keypair, sign_manifest, export_public_key_hex
from app.crypto.ledger import verify_signature
from app.schemas.evidence import EvidenceArtifactRead, HashCollection, EvidenceVerifyResponse


def manifest_payload(artifact: EvidenceArtifactRead) -> dict:
    excluded = {"integrity_status", "last_verified_at", "signature_ed25519"}
    if artifact.storage is None:
        excluded.add("storage")
    return artifact.model_dump(exclude=excluded)

def human_readable_size(size_bytes: int) -> str:
    for unit, threshold in (("GB", 1024**3), ("MB", 1024**2), ("KB", 1024)):
        if size_bytes >= threshold:
            return f"{size_bytes / threshold:.2f} {unit}"
    return f"{size_bytes} B"


class EvidenceVaultService:
    """
    Cryptographic Evidence Repository Service.
    Enforces read-only access to physical bitstreams and real-time streaming hash verification.
    """
    def __init__(self):
        self.vault_dir = Path(settings.EVIDENCE_VAULT_DIR)
        self.priv_key = database.signing_key if database else generate_ed25519_keypair()[0]
        self.pub_key = self.priv_key.public_key()
        self.signer_id = f"FORENTRACE_ED25519_{export_public_key_hex(self.pub_key)[:12]}"
        self.artifacts_db: Dict[str, EvidenceArtifactRead] = {}
        self.demo_verification_lock = Lock()
        if settings.seed_demo:
            if database:
                with database.connect() as conn:
                    conn.execute("LOCK TABLE forentrace_evidence IN SHARE ROW EXCLUSIVE MODE")
                    if not conn.execute("SELECT 1 FROM forentrace_evidence WHERE case_id = 'case-01' LIMIT 1").fetchone():
                        for artifact in self._demo_artifacts():
                            conn.execute(
                                "INSERT INTO forentrace_evidence (id, case_id, manifest) VALUES (%s, %s, %s)",
                                (artifact.id, artifact.case_id, Jsonb(artifact.model_dump())),
                            )
            else:
                self.artifacts_db = {artifact.id: artifact for artifact in self._demo_artifacts()}

    def _demo_artifacts(self):
        """Seal the bundled demo fixtures when initializing a new vault."""
        samples = [
            (
                "EVD-9801",
                "DC01_PHYSICAL_RAM_IMAGE.raw",
                b"FORENTRACE_DUMP_DC01_RAM_PAGE_VAD_0x7FFF5FA0_LSASS_CORRUPT" * 1024,
                "MEMORY_DUMP",
                "DC01.aegis.internal (IP: 10.200.4.10)",
                "Agent M. Thorne (On-site Triage)",
                ["T1055.012", "T1003.001"],
                94,
                8,
                "Volatile RAM captured using LiME kernel driver. VAD analysis indicates unbacked executable memory segment at base 0x7FFF5FA0.",
            ),
            (
                "EVD-9802",
                "BORDER_GATEWAY_TAP_INTERFACE.pcapng",
                b"PCAPNG_CAPTURE_EGRESS_TLS1.3_JA3_COBALT_STRIKE_HEARTBEAT" * 2048,
                "PACKET_CAPTURE",
                "SW-CORE-01_TAP_PORT_4",
                "Network SecOps SOC Tier 3",
                ["T1071.001", "T1573.002"],
                88,
                14,
                "Full packet capture covering 48-hour anomalous egress window. JA3S TLS fingerprints reveal custom Cobalt Strike beacon profile.",
            ),
            (
                "EVD-9805",
                "STAGE2_REFLECTIVE_LOADER.bin",
                b"\x90\x90\x90\x31\xc0\x50\x68//sh\x68/bin\x89\xe3\x50\x53\x89\xe1\x31\xd2\xb0\x0b\xcd\x80" * 64,
                "MALWARE_BINARY",
                "Carved from Memory Offset 0x7FFF5FB0",
                "ForenTrace Neural Decompiler Engine",
                ["T1027.002", "T1140"],
                99,
                3,
                "High-entropy obfuscated shellcode executing reflective PE injection. Contains embedded configuration payload with 3 C2 fallback IPs.",
            ),
        ]

        for (
            art_id,
            filename,
            content,
            art_type,
            host,
            custodian,
            mitre,
            anomaly,
            derived_count,
            notes,
        ) in samples:
            file_path = self.vault_dir / filename
            if not database and not file_path.exists():
                with TemporaryDirectory(dir=self.vault_dir) as directory:
                    staged = Path(directory) / filename
                    staged.write_bytes(content)
                    try:
                        os.link(staged, file_path)
                    except FileExistsError:
                        pass

            fp = compute_file_fingerprint(file_path)
            if fp.sha256 != sha256(content).hexdigest():
                raise RuntimeError(f"Bundled evidence fixture does not match its expected digest: {filename}")

            artifact = EvidenceArtifactRead(
                id=art_id,
                name=filename,
                case_id="case-01",
                type=art_type,
                source_host=host,
                custodian=custodian,
                notes=notes,
                file_size_bytes=fp.byte_count,
                file_size_human=human_readable_size(fp.byte_count),
                ingest_date="2026-11-04T16:45:12Z",
                hashes=HashCollection(
                    md5=fp.md5,
                    sha1=fp.sha1,
                    sha256=fp.sha256,
                    sha512=fp.sha512,
                ),
                integrity_status="VERIFIED",
                last_verified_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                signature_ed25519="",
                mitre_techniques=mitre,
                derived_artifact_count=derived_count,
                anomaly_score=anomaly,
            )
            sig = sign_manifest(self.priv_key, manifest_payload(artifact), self.signer_id)
            artifact.signature_ed25519 = f"ed25519:{sig.signature_hex}"
            yield artifact

    def _verify_manifest(self, artifact: EvidenceArtifactRead):
        try:
            self.pub_key.verify(
                bytes.fromhex(artifact.signature_ed25519.removeprefix("ed25519:")),
                canonical_json(manifest_payload(artifact)).encode("utf-8"),
            )
        except (InvalidSignature, ValueError) as exc:
            raise InvalidSignature("The stored evidence manifest has an invalid signature.") from exc

    def _read_artifact(self, row) -> EvidenceArtifactRead:
        artifact_id, case_id, manifest, integrity_status, verified_at = row
        artifact = EvidenceArtifactRead.model_validate(manifest)
        if artifact.id != artifact_id or artifact.case_id != case_id:
            raise InvalidSignature("The stored evidence manifest does not match its record or case ID.")
        self._verify_manifest(artifact)
        if integrity_status is not None:
            artifact.integrity_status = integrity_status
            artifact.last_verified_at = verified_at
        return artifact

    def list_artifacts(self, case_ids: list[str] | None = None, *, connection: Connection | None = None,
                       query: str | None = None, ids: list[str] | None = None,
                       excluded_ids: list[str] | None = None) -> List[EvidenceArtifactRead]:
        if database:
            sql = "SELECT id, case_id, manifest, integrity_status, verified_at FROM forentrace_evidence WHERE case_id = ANY(%s)"
            params = [case_ids or []]
            order = " ORDER BY id"
            if query is not None:
                sql += """ AND to_tsvector('simple', coalesce(manifest->>'name', '') || ' ' ||
                           coalesce(manifest->>'type', '') || ' ' ||
                           coalesce(manifest->'hashes'->>'sha256', '') || ' ' || id) @@ websearch_to_tsquery('simple', %s)"""
                params.append(query)
                order += " LIMIT 50"
            if ids is not None:
                sql += " AND id = ANY(%s)"
                params.append(ids)
            if excluded_ids:
                sql += " AND id <> ALL(%s)"
                params.append(excluded_ids)
            with (database.connect() if connection is None else nullcontext(connection)) as conn:
                rows = conn.execute(sql + order, params).fetchall()
            items = [self._read_artifact(row) for row in rows]
        else:
            included = set(ids) if ids is not None else None
            excluded = set(excluded_ids or [])
            items = [artifact for artifact in self.artifacts_db.values()
                     if (included is None or artifact.id in included) and artifact.id not in excluded]
        if case_ids is not None:
            items = [i for i in items if i.case_id in case_ids]
        return items

    def get_artifact(self, artifact_id: str, case_ids: list[str] | None = None, *,
                     verification_connection: Connection | None = None) -> Optional[EvidenceArtifactRead]:
        if database:
            sql = """SELECT id, case_id, manifest, integrity_status, verified_at FROM forentrace_evidence
                     WHERE id = %s AND case_id = ANY(%s)"""
            if verification_connection is not None:
                sql += " FOR UPDATE"
            with (database.connect() if verification_connection is None else nullcontext(verification_connection)) as conn:
                row = conn.execute(sql, (artifact_id, case_ids or [])).fetchone()
            return self._read_artifact(row) if row else None
        artifact = self.artifacts_db.get(artifact_id)
        return artifact if artifact and (case_ids is None or artifact.case_id in case_ids) else None

    def register(self, staged: Path, case_id: str, name: str, artifact_type: str,
                 expected_sha256: str | None, username: str, request_id: UUID | None = None,
                 excluded_ids: list[str] | None = None) -> EvidenceArtifactRead:
        if database is None:
            raise HTTPException(503, "Evidence registration requires PostgreSQL.")
        fingerprint = compute_file_fingerprint(staged)
        expected_sha256 = expected_sha256.lower() if expected_sha256 else None
        if expected_sha256 and fingerprint.sha256 != expected_sha256:
            raise HTTPException(422, "The upload does not match the supplied SHA-256.")
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        artifact = EvidenceArtifactRead(
            id=f"EVD-{uuid4().hex}", name=name, case_id=case_id, type=artifact_type,
            source_host="", custodian=username, file_size_bytes=fingerprint.byte_count,
            file_size_human=human_readable_size(fingerprint.byte_count), ingest_date=timestamp,
            hashes=HashCollection(md5=fingerprint.md5, sha1=fingerprint.sha1, sha256=fingerprint.sha256,
                                  sha512=fingerprint.sha512),
            integrity_status="VERIFIED" if expected_sha256 else "NOT_YET_VERIFIED",
            last_verified_at=timestamp if expected_sha256 else "", signature_ed25519="",
        )
        request_id = request_id or uuid4()
        bucket = settings.FORENTRACE_S3_BUCKET if settings.FORENTRACE_S3_ENDPOINT else None
        manifest = artifact.model_dump()
        payload = self._registration_payload(request_id, bucket, expected_sha256, manifest)
        signature = sign_manifest(self.priv_key, payload, self.signer_id)
        with database.connect() as conn:
            if not investigator_assigned(conn, case_id, username):
                raise HTTPException(403, "You do not have the required case permission.")
            conn.execute("""
                INSERT INTO forentrace_evidence_registrations
                    (request_id, evidence_id, case_id, requested_by, object_bucket, expected_sha256, draft)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (request_id) DO NOTHING
            """, (request_id, artifact.id, case_id, username, bucket, expected_sha256,
                  Jsonb({"manifest": manifest, "signature_hex": signature.signature_hex})))
        # Commit the signed intent before any write to the evidence store.
        return self.recover_registration(request_id, staged=staged, attempted=artifact, expected_sha256=expected_sha256,
                                         excluded_ids=excluded_ids)

    @staticmethod
    def _registration_payload(request_id: UUID, bucket: str | None, expected_sha256: str | None, manifest: dict):
        return {"format": "forentrace.registration-intent.v1", "request_id": str(request_id),
                "object_bucket": bucket, "expected_sha256": expected_sha256, "manifest": manifest}

    def recover_registration(self, request_id: UUID, *, staged: Path | None = None,
                             attempted: EvidenceArtifactRead | None = None,
                             expected_sha256: str | None = None, excluded_ids: list[str] | None = None) -> EvidenceArtifactRead:
        if database is None:
            raise HTTPException(503, "Evidence recovery requires PostgreSQL.")
        with database.connect() as conn:
            row = conn.execute("""
                SELECT evidence_id, case_id, requested_by, object_bucket, expected_sha256, draft, published
                FROM forentrace_evidence_registrations WHERE request_id = %s FOR UPDATE
            """, (request_id,)).fetchone()
            if row is None:
                raise HTTPException(404, "Registration request not found.")
            evidence_id, case_id, username, bucket, expected, draft, published = row
            if excluded_ids and evidence_id in excluded_ids:
                raise HTTPException(404, "Evidence not found.")
            if attempted is not None and (attempted.case_id != case_id or attempted.custodian != username):
                raise HTTPException(409, "This registration key is already in use.")
            if not investigator_assigned(conn, case_id, username):
                raise HTTPException(403, "The registering investigator no longer has write access.")
            try:
                artifact = EvidenceArtifactRead.model_validate(draft["manifest"])
                verify_signature(self.pub_key, draft["signature_hex"],
                                 self._registration_payload(request_id, bucket, expected, draft["manifest"]))
            except (InvalidSignature, ValidationError, KeyError, TypeError) as error:
                raise HTTPException(409, "The stored registration intent failed integrity verification.") from error
            if (artifact.id, artifact.case_id, artifact.custodian) != (evidence_id, case_id, username):
                raise HTTPException(409, "The stored registration intent disagrees with its database record.")
            if attempted is not None and (
                (attempted.name, attempted.type, attempted.hashes, expected_sha256)
                != (artifact.name, artifact.type, artifact.hashes, expected)
            ):
                raise HTTPException(409, "This registration key was used with different evidence or metadata.")
            if published:
                original = self.get_artifact(evidence_id, [case_id], verification_connection=conn)
                if original is None:
                    raise HTTPException(409, "The published registration is missing its evidence manifest.")
                return original
            if bucket is not None:
                if bucket != settings.FORENTRACE_S3_BUCKET:
                    raise StorageUnavailable("The pending registration belongs to a different configured bucket.")
                if staged is not None:
                    try:
                        artifact.storage = store_original(evidence_id, staged, artifact.hashes.md5)
                    except OriginalAlreadyExists:
                        pass
                if artifact.storage is None:
                    artifact.storage = recover_original(evidence_id, bucket, artifact.hashes.sha256, artifact.file_size_bytes)
            else:
                directory = self.vault_dir / "registered"
                path = directory / evidence_id
                try:
                    directory.mkdir(mode=0o700, exist_ok=True)
                    if staged is not None:
                        try:
                            os.link(staged, path)
                        except FileExistsError:
                            pass
                    with self.open_evidence(artifact) as source:
                        fingerprint = compute_stream_fingerprint(source)
                        if os.name == "posix":
                            os.fsync(source.fileno())
                    if os.name == "posix":
                        for ancestor in (directory, self.vault_dir):
                            descriptor = os.open(ancestor, os.O_RDONLY | os.O_DIRECTORY)
                            try:
                                os.fsync(descriptor)
                            finally:
                                os.close(descriptor)
                except FileNotFoundError as error:
                    raise StorageUnavailable("The pending original is not available in the local vault.") from error
                except OSError as error:
                    raise StorageUnavailable("The pending original could not be made durable in the local vault.") from error
                if fingerprint.sha256 != artifact.hashes.sha256 or fingerprint.byte_count != artifact.file_size_bytes:
                    raise StorageUnavailable("The pending original differs from the registered fingerprint.")
            signature = sign_manifest(self.priv_key, manifest_payload(artifact), self.signer_id)
            artifact.signature_ed25519 = f"ed25519:{signature.signature_hex}"
            conn.execute("INSERT INTO forentrace_evidence (id, case_id, manifest) VALUES (%s, %s, %s)",
                         (artifact.id, case_id, Jsonb(artifact.model_dump())))
            conn.execute("UPDATE forentrace_evidence_registrations SET published = TRUE WHERE request_id = %s", (request_id,))
        return artifact

    @contextmanager
    def open_evidence(self, artifact: EvidenceArtifactRead):
        if artifact.storage:
            with open_original(artifact.id, artifact.storage) as source:
                yield source
            return
        path = (self.vault_dir / "registered" / artifact.id
                if fullmatch(r"EVD-[0-9a-f]{32}", artifact.id) else self.vault_dir / artifact.name)
        resolved = path.resolve()
        if not resolved.is_relative_to(self.vault_dir.resolve()) or not resolved.is_file():
            raise FileNotFoundError("Evidence bytes are unavailable in the vault.")
        with resolved.open("rb") as source:
            yield source

    def verify_artifact(self, artifact_id: str, case_ids: list[str] | None = None) -> EvidenceVerifyResponse:
        if database:
            with database.connect() as conn:
                return self._verify_artifact(artifact_id, case_ids, conn)
        with self.demo_verification_lock:
            return self._verify_artifact(artifact_id, case_ids, None)

    def _verify_artifact(self, artifact_id: str, case_ids: list[str] | None,
                         connection: Connection | None) -> EvidenceVerifyResponse:
        artifact = self.get_artifact(artifact_id, case_ids, verification_connection=connection)
        if not artifact:
            raise KeyError(f"Artifact {artifact_id} not found in evidence vault.")
        start = time.perf_counter()
        with self.open_evidence(artifact) as source:
            verification = verify_fingerprint(compute_stream_fingerprint(source), artifact.id, artifact.hashes.sha256)
        elapsed = max(time.perf_counter() - start, 0.0001)
        throughput = (verification.byte_count / (1024 * 1024)) / elapsed

        status = "VERIFIED" if verification.is_valid else "FAILED_VERIFICATION"
        if connection is not None:
            connection.execute(
                "UPDATE forentrace_evidence SET integrity_status = %s, verified_at = %s WHERE id = %s",
                (status, verification.verified_at, artifact_id),
            )
        else:
            artifact.integrity_status = status
            artifact.last_verified_at = verification.verified_at

        return EvidenceVerifyResponse(
            artifact_id=artifact_id,
            is_valid=verification.is_valid,
            status=status,
            expected_sha256=verification.expected_sha256,
            computed_sha256=verification.computed_sha256,
            computed_sha512=verification.computed_sha512,
            byte_count=verification.byte_count,
            verified_at=verification.verified_at,
            throughput_mb_s=round(throughput, 2),
            discrepancy_details=verification.discrepancy_details,
        )

evidence_vault_service = EvidenceVaultService()
