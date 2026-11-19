"""Signed append-only ledger heads held outside PostgreSQL."""

from base64 import b64encode
from contextlib import closing
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from hashlib import md5
from typing import Literal
from urllib.parse import urlsplit

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
from cryptography.exceptions import InvalidSignature
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.core.config import settings
from app.crypto.ed25519_signer import canonical_json, sign_manifest
from app.crypto.ledger import GENESIS_HASH, verify_signature
from app.schemas.custody import HexDigest, SignatureHex


class AnchorUnavailable(RuntimeError):
    pass


class AnchorHead(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    format: Literal["forentrace.independent-head.v1"]
    anchor_id: str
    kind: Literal["baseline", "head"]
    position: int = Field(ge=0)
    block_hash: HexDigest
    signature_hex: SignatureHex


@lru_cache
def anchor_client():
    endpoint = settings.FORENTRACE_LEDGER_ANCHOR_ENDPOINT
    access = settings.FORENTRACE_LEDGER_ANCHOR_ACCESS_KEY
    secret = settings.FORENTRACE_LEDGER_ANCHOR_SECRET_KEY
    if not (endpoint and access and secret and settings.FORENTRACE_LEDGER_ANCHOR_ID):
        raise AnchorUnavailable("Independent ledger anchor configuration is incomplete.")
    url = urlsplit(endpoint)
    if url.scheme != "https" and not (url.scheme == "http" and url.hostname in {"127.0.0.1", "::1", "localhost"}):
        raise AnchorUnavailable("Independent ledger anchoring requires TLS outside loopback.")
    return boto3.client(
        "s3", endpoint_url=endpoint, region_name="us-east-1",
        aws_access_key_id=access.get_secret_value(), aws_secret_access_key=secret.get_secret_value(),
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}, connect_timeout=5, read_timeout=10),
    )


class LedgerAnchor:
    def __init__(self, signing_key):
        self.id = settings.FORENTRACE_LEDGER_ANCHOR_ID
        self.bucket = settings.FORENTRACE_LEDGER_ANCHOR_BUCKET
        self.prefix = f"ledgers/{self.id}/"
        self.signing_key = signing_key
        self.client = anchor_client()

    def key(self, position: int | None) -> str:
        return self.prefix + ("baseline" if position is None else f"heads/{position:020d}")

    def read(self, position: int | None) -> AnchorHead | None:
        key = self.key(position)
        try:
            objects = self.client.list_objects_v2(Bucket=self.bucket, Prefix=key, MaxKeys=1)
            if not any(item["Key"] == key for item in objects.get("Contents", [])):
                return None
            result = self.client.get_object(Bucket=self.bucket, Key=key)
            with closing(result["Body"]) as body:
                raw = body.read(4097)
        except (BotoCoreError, ClientError) as error:
            raise AnchorUnavailable("The independent ledger anchor could not be read.") from error
        try:
            head = AnchorHead.model_validate_json(raw)
        except ValidationError as error:
            raise InvalidSignature("The independent checkpoint is malformed.") from error
        if (len(raw) > 4096 or result.get("ObjectLockMode") != "COMPLIANCE"
                or result.get("VersionId") in {None, "", "null"}
                or head.anchor_id != self.id or head.kind != ("baseline" if position is None else "head")
                or (position is not None and head.position != position)
                or (head.position == 0 and head.block_hash != GENESIS_HASH)):
            raise InvalidSignature("The independent checkpoint does not match its protected location.")
        verify_signature(self.signing_key.public_key(), head.signature_hex,
                         head.model_dump(exclude={"signature_hex"}))
        return head

    def has_later_head(self, position: int) -> bool:
        try:
            result = self.client.list_objects_v2(Bucket=self.bucket, Prefix=self.prefix + "heads/",
                                                 StartAfter=self.key(position), MaxKeys=1)
        except (BotoCoreError, ClientError) as error:
            raise AnchorUnavailable("The independent ledger history could not be checked.") from error
        return bool(result.get("Contents"))

    def write(self, position: int, block_hash: str, *, baseline: bool = False) -> None:
        payload = {"format": "forentrace.independent-head.v1", "anchor_id": self.id,
                   "kind": "baseline" if baseline else "head", "position": position, "block_hash": block_hash}
        signature = sign_manifest(self.signing_key, payload, "forentrace-ledger-anchor")
        raw = canonical_json({**payload, "signature_hex": signature.signature_hex}).encode("utf-8")
        slot = None if baseline else position
        try:
            result = self.client.put_object(
                Bucket=self.bucket, Key=self.key(slot), Body=raw, ContentType="application/json",
                ContentMD5=b64encode(md5(raw).digest()).decode("ascii"), IfNoneMatch="*",
                ObjectLockMode="COMPLIANCE",
                ObjectLockRetainUntilDate=datetime.now(timezone.utc)
                + timedelta(days=settings.FORENTRACE_LEDGER_ANCHOR_RETENTION_DAYS),
            )
        except ClientError as error:
            if error.response["Error"]["Code"] not in {"PreconditionFailed", "ConditionalRequestConflict"}:
                raise AnchorUnavailable("The independent checkpoint could not be written.") from error
            previous = self.read(slot)
            if previous is None or previous.position != position or previous.block_hash != block_hash:
                raise InvalidSignature("The independent checkpoint already has a different head.") from error
            return
        except BotoCoreError as error:
            raise AnchorUnavailable("The independent checkpoint could not be confirmed.") from error
        if result.get("VersionId") in {None, "", "null"}:
            raise AnchorUnavailable("The anchor store did not confirm a protected version.")
