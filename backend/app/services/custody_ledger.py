import time
from contextlib import contextmanager
from threading import Lock
from uuid import UUID, uuid4

from cryptography.exceptions import InvalidSignature
from psycopg.types.json import Jsonb
from pydantic import ValidationError

from app.core.config import settings
from app.core.database import database
from app.core.ledger_anchor import AnchorUnavailable, LedgerAnchor
from app.crypto.ledger import GENESIS_HASH, compute_block_hash, verify_block
from app.crypto.merkle import MerkleTree
from app.crypto.ed25519_signer import generate_ed25519_keypair, sign_manifest, export_public_key_hex
from app.schemas.custody import (
    CustodyRecordCreate, CustodyRecordRead, LedgerProofExport, LedgerProofStep, MerkleCheckpointRead, SignedLedgerExport,
)
from app.services.evidence_vault import evidence_vault_service


class CustodyRequestConflict(ValueError):
    pass


class CustodyLedgerService:
    """Stores hash-linked, Ed25519-signed evidence transfers."""

    def __init__(self):
        self.priv_key = database.signing_key if database else generate_ed25519_keypair()[0]
        self.pub_key = self.priv_key.public_key()
        self.witness_id = f"FORENTRACE_ED25519_{export_public_key_hex(self.pub_key)[:12]}"
        self.chain: list[CustodyRecordRead] = []
        self.lock = Lock()
        if settings.seed_demo:
            if database:
                with database.connect() as conn:
                    conn.execute("LOCK TABLE forentrace_custody IN SHARE ROW EXCLUSIVE MODE")
                    if (not conn.execute("SELECT 1 FROM forentrace_custody LIMIT 1").fetchone()
                            and not conn.execute("SELECT 1 FROM forentrace_ledger_anchor_binding").fetchone()):
                        for position, record in enumerate(self._demo_records(), start=1):
                            self._insert_record(conn, position, record)
            else:
                self.chain = list(self._demo_records())

    def _demo_records(self):
        records = [
            (
                "EVD-9801",
                "DC01_PHYSICAL_RAM_IMAGE.raw",
                "Target Machine DC01 / Host Bus Adapter",
                "Encrypted Triage Storage Pod (SN: TPM-8812)",
                "Initial acquisition of volatile physical memory under live intrusion condition",
                "Aegis Data Center Server Room 4, Rack 12",
            ),
            (
                "EVD-9802",
                "BORDER_GATEWAY_TAP_INTERFACE.pcapng",
                "Switch Core TAP Port 4",
                "Network Forensic Ingestion Node 01",
                "TAP packet stream capture for TLS beacon correlation",
                "Aegis Perimeter Security Enclave",
            ),
            (
                "EVD-9805",
                "STAGE2_REFLECTIVE_LOADER.bin",
                "Volatility 3 Malfind Decompilation Subsystem",
                "Malware Sandbox Enclave (VLAN 999 Isolation)",
                "Isolated dynamic detonator inspection of extracted memory shellcode payload",
                "ForenTrace Virtualized Detonation Pod 01",
            ),
        ]

        prev_hash = GENESIS_HASH
        for idx, (ev_id, ev_name, src, dst, purpose, loc) in enumerate(records, start=1):
            transfer = CustodyRecordCreate(
                evidence_id=ev_id,
                evidence_name=ev_name,
                transferred_from=src,
                transferred_to=dst,
                purpose=purpose,
                location=loc,
                witness_key=self.witness_id,
            )
            record = self._sign_record(transfer, idx, prev_hash, f"2026-11-04T16:5{idx}:00Z")
            yield record
            prev_hash = record.block_hash

    def _sign_record(self, data: CustodyRecordCreate, index: int, previous_hash: str, timestamp: str, event_type=None):
        record = CustodyRecordRead(
            **data.model_dump(exclude={"witness_key"}),
            event_type=event_type,
            id=f"CUST-{index:03d}",
            record_number=f"CC-2026-0884-{index:02d}",
            timestamp=timestamp,
            cryptographic_signature="",
            witness_key=self.witness_id,
            integrity_verified=False,
            previous_block_hash=previous_hash,
            block_hash="",
        )
        record.block_hash = compute_block_hash(record)
        signature = sign_manifest(self.priv_key, {"block_hash": record.block_hash}, self.witness_id)
        record.cryptographic_signature = f"SIG:ed25519:{signature.signature_hex}"
        record.integrity_verified = self._valid_block(record, index, previous_hash)
        return record

    def _valid_block(self, record: CustodyRecordRead, index: int, previous_hash: str) -> bool:
        try:
            return record.previous_block_hash == previous_hash and verify_block(record, self.pub_key) == index
        except InvalidSignature:
            return False

    def _validated_chain(self, records):
        previous_hash = GENESIS_HASH
        valid = True
        for index, record in enumerate(records, start=1):
            valid = valid and self._valid_block(record, index, previous_hash)
            yield record.model_copy(update={"integrity_verified": valid})
            previous_hash = record.block_hash

    @staticmethod
    @contextmanager
    def _connection():
        with database.connect() as conn:
            if settings.FORENTRACE_LEDGER_ANCHOR_ENDPOINT or settings.FORENTRACE_LEDGER_ANCHOR_ID:
                # Session lock spans the database commit and the independent anchor write.
                conn.execute("SELECT pg_advisory_lock(130518, 5)")
                conn.commit()
            yield conn

    @staticmethod
    def _stored_records(conn):
        rows = conn.execute("""
            SELECT position, record, anchor_pending FROM forentrace_custody ORDER BY position
        """).fetchall()
        records = []
        pending = []
        for index, (position, record, anchor_pending) in enumerate(rows, start=1):
            if position != index:
                raise InvalidSignature("The custody ledger has a missing block position.")
            try:
                records.append(CustodyRecordRead.model_validate(record))
            except ValidationError as error:
                raise InvalidSignature("The custody ledger contains an invalid block.") from error
            if anchor_pending:
                pending.append(position)
        return records, pending

    def _read_records(self, conn):
        records, pending = self._stored_records(conn)
        binding = conn.execute("SELECT anchor_id FROM forentrace_ledger_anchor_binding").fetchone()
        if not (binding or pending or settings.FORENTRACE_LEDGER_ANCHOR_ENDPOINT or settings.FORENTRACE_LEDGER_ANCHOR_ID):
            return records
        anchor = LedgerAnchor(self.priv_key)
        if binding != (anchor.id,):
            raise AnchorUnavailable("Initialize the configured independent ledger anchor before serving custody.")
        position = len(records)
        baseline = anchor.read(None)
        if baseline is None:
            raise AnchorUnavailable("The independent ledger baseline is missing.")
        if (baseline.position > position or anchor.has_later_head(position)
                or (baseline.position and records[baseline.position - 1].block_hash != baseline.block_hash)):
            raise InvalidSignature("The custody ledger is behind its independent checkpoint.")
        if pending and pending != [position]:
            raise InvalidSignature("The custody ledger contains an unexpected pending head.")
        head_hash = records[-1].block_hash if records else GENESIS_HASH
        head = baseline if position == baseline.position else anchor.read(position)
        if head is not None:
            if head.block_hash != head_hash:
                raise InvalidSignature("The custody head disagrees with its independent checkpoint.")
            return records
        if pending != [position] or position <= baseline.position:
            raise InvalidSignature("The custody head is missing its independent checkpoint.")
        predecessor = baseline if position - 1 == baseline.position else anchor.read(position - 1)
        if (predecessor is None or predecessor.block_hash != records[-1].previous_block_hash
                or not all(record.integrity_verified for record in self._validated_chain(records))):
            raise InvalidSignature("The pending custody head cannot be recovered.")
        anchor.write(position, head_hash)
        return records

    def initialize_anchor(self, *, adopt_existing: bool = False) -> int:
        if database is None:
            raise AnchorUnavailable("Independent ledger anchoring requires PostgreSQL.")
        anchor = LedgerAnchor(self.priv_key)
        with self._connection() as conn:
            conn.execute("LOCK TABLE forentrace_custody IN SHARE ROW EXCLUSIVE MODE")
            binding = conn.execute("SELECT anchor_id FROM forentrace_ledger_anchor_binding").fetchone()
            if binding:
                records = self._read_records(conn)
                if not all(record.integrity_verified for record in self._validated_chain(records)):
                    raise InvalidSignature("The custody ledger failed integrity verification.")
                return len(records)
            records, pending = self._stored_records(conn)
            position = len(records)
            if position and not adopt_existing:
                raise AnchorUnavailable("Use --adopt-existing only after verifying the current ledger against a trusted backup.")
            if pending or anchor.has_later_head(0) or not all(
                record.integrity_verified for record in self._validated_chain(records)
            ):
                raise InvalidSignature("The current chain cannot be adopted as a new independent baseline.")
            anchor.write(position, records[-1].block_hash if records else GENESIS_HASH, baseline=True)
            conn.execute("INSERT INTO forentrace_ledger_anchor_binding VALUES (TRUE, %s)", (anchor.id,))
            return position

    @staticmethod
    def _insert_record(conn, position: int, record: CustodyRecordRead, *, pending: bool = False,
                       request_id: UUID | None = None, requested_by: str | None = None):
        conn.execute(
            """INSERT INTO forentrace_custody (position, record, anchor_pending, request_id, requested_by)
               VALUES (%s, %s, %s, %s, %s)""",
            (position, Jsonb(record.model_dump()), pending, request_id, requested_by),
        )

    def list_records(self) -> list[CustodyRecordRead]:
        if database:
            with self._connection() as conn:
                records = self._read_records(conn)
        else:
            with self.lock:
                records = self.chain.copy()
        return list(self._validated_chain(records))[::-1]

    def _next_record(self, data: CustodyRecordCreate, records: list[CustodyRecordRead], event_type=None):
        if not all(record.integrity_verified for record in self._validated_chain(records)):
            raise InvalidSignature("The custody ledger failed integrity verification.")
        previous_hash = records[-1].block_hash if records else GENESIS_HASH
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        return self._sign_record(data, len(records) + 1, previous_hash, timestamp, event_type)

    def append_record(self, data: CustodyRecordCreate, request_id: UUID | None = None,
                      requested_by: str | None = None, *, event_type=None) -> CustodyRecordRead:
        if database:
            with self._connection() as conn:
                conn.execute("LOCK TABLE forentrace_custody IN SHARE ROW EXCLUSIVE MODE")
                records = self._read_records(conn)
                anchored = settings.FORENTRACE_LEDGER_ANCHOR_ID is not None
                conn.execute("UPDATE forentrace_custody SET anchor_pending = FALSE WHERE anchor_pending")
                if request_id is not None:
                    existing = conn.execute("SELECT position, requested_by FROM forentrace_custody WHERE request_id = %s",
                                            (request_id,)).fetchone()
                    if existing:
                        position, owner = existing
                        record = records[position - 1]
                        fields = data.model_dump(exclude={"evidence_name", "witness_key"})
                        if owner != requested_by or record.event_type != event_type or record.model_dump(include=set(fields)) != fields:
                            raise CustodyRequestConflict("This custody request key was used with a different transfer.")
                        validated = list(self._validated_chain(records))
                        if not all(block.integrity_verified for block in validated):
                            raise InvalidSignature("The custody ledger failed integrity verification.")
                        return validated[position - 1]
                record = self._next_record(data, records, event_type)
                position = len(records) + 1
                self._insert_record(conn, position, record, pending=anchored, request_id=request_id, requested_by=requested_by)
                if anchored:
                    conn.commit()
                    LedgerAnchor(self.priv_key).write(position, record.block_hash)
                    conn.execute("UPDATE forentrace_custody SET anchor_pending = FALSE WHERE position = %s", (position,))
                return record
        with self.lock:
            record = self._next_record(data, self.chain, event_type)
            self.chain.append(record)
            return record

    def _snapshot(self, organization_id: str | None, case_ids: list[str] | None, excluded_ids: list[str] | None = None):
        if database:
            with self._connection() as conn:
                conn.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
                filters = {"excluded_ids": excluded_ids} if excluded_ids else {}
                evidence_ids = {artifact.id for artifact in evidence_vault_service.list_artifacts(case_ids, connection=conn, **filters)}
                records = list(self._validated_chain(self._read_records(conn)))
        else:
            evidence_ids = None if case_ids is None else {
                artifact.id for artifact in evidence_vault_service.list_artifacts(case_ids)
            }
            records = list(reversed(self.list_records())) if evidence_ids or evidence_ids is None else []
        if not all(record.integrity_verified for record in records):
            raise InvalidSignature("The custody ledger failed integrity verification.")
        excluded = set(excluded_ids or [])
        records = [record for record in records
                   if (evidence_ids is None or record.evidence_id in evidence_ids) and record.evidence_id not in excluded]
        tree = MerkleTree([record.block_hash for record in records])
        payload = {
            "format": "forentrace.checkpoint.v1",
            "checkpoint_id": f"CHK-{uuid4().hex}",
            "root_hash": tree.root or GENESIS_HASH,
            "block_count": len(records),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "proofs_available": bool(records),
            "organization_id": organization_id,
            "case_ids": case_ids,
            "public_key_hex": export_public_key_hex(self.pub_key),
        }
        if excluded_ids:
            payload["visibility"] = "policy-filtered"
        signature = sign_manifest(self.priv_key, payload, self.witness_id)
        return records, tree, MerkleCheckpointRead(**payload, signature_hex=signature.signature_hex)

    def get_merkle_checkpoint(self, organization_id: str | None, case_ids: list[str] | None,
                              excluded_ids: list[str] | None = None) -> MerkleCheckpointRead:
        _, _, checkpoint = self._snapshot(organization_id, case_ids, excluded_ids)
        return checkpoint

    def export_ledger(self, organization_id: str | None, case_id: str,
                      excluded_ids: list[str] | None = None) -> SignedLedgerExport:
        records, _, checkpoint = self._snapshot(organization_id, [case_id], excluded_ids)
        payload = {
            "format": "forentrace.ledger-export.v1",
            "checkpoint": checkpoint.model_dump(),
            "records": [record.model_dump() for record in records],
        }
        signature = sign_manifest(self.priv_key, payload, self.witness_id)
        return SignedLedgerExport(
            format="forentrace.ledger-export.v1", checkpoint=checkpoint, records=records,
            signature_hex=signature.signature_hex,
        )

    def export_proof(self, record_id: str, organization_id: str | None, case_id: str,
                     excluded_ids: list[str] | None = None) -> LedgerProofExport:
        records, tree, checkpoint = self._snapshot(organization_id, [case_id], excluded_ids)
        for index, record in enumerate(records):
            if record.id == record_id:
                return LedgerProofExport(
                    format="forentrace.ledger-proof.v1", checkpoint=checkpoint, record=record, leaf_index=index,
                    audit_path=[LedgerProofStep(sibling_hash=digest, side=side)
                                for digest, side in tree.get_proof(index).audit_path],
                )
        raise KeyError(record_id)

custody_ledger_service = CustodyLedgerService()
