from base64 import b64encode
from contextlib import closing, contextmanager
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlsplit

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import settings
from app.crypto.hasher import compute_stream_fingerprint
from app.schemas.evidence import EvidenceObject


class StorageUnavailable(RuntimeError):
    pass


class OriginalAlreadyExists(StorageUnavailable):
    pass


@lru_cache
def client():
    endpoint = settings.FORENTRACE_S3_ENDPOINT
    if not endpoint or not settings.FORENTRACE_S3_ACCESS_KEY or not settings.FORENTRACE_S3_SECRET_KEY:
        raise StorageUnavailable("Configure the protected evidence store and its scoped credentials.")
    url = urlsplit(endpoint)
    if (url.scheme != "https" and not (url.scheme == "http" and url.hostname in {"localhost", "127.0.0.1", "::1"})):
        raise StorageUnavailable("The evidence store requires HTTPS outside loopback.")
    return boto3.client(
        "s3", endpoint_url=endpoint, region_name="us-east-1",
        aws_access_key_id=settings.FORENTRACE_S3_ACCESS_KEY.get_secret_value(),
        aws_secret_access_key=settings.FORENTRACE_S3_SECRET_KEY.get_secret_value(),
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}, connect_timeout=5, read_timeout=15),
    )


def store_original(artifact_id: str, staged: Path, md5: str) -> EvidenceObject:
    try:
        with staged.open("rb") as body:
            result = client().put_object(
                Bucket=settings.FORENTRACE_S3_BUCKET, Key=f"originals/{artifact_id}",
                Body=body, ContentLength=staged.stat().st_size, ContentType="application/octet-stream",
                ContentMD5=b64encode(bytes.fromhex(md5)).decode("ascii"), IfNoneMatch="*",
                ObjectLockMode="COMPLIANCE",
                ObjectLockRetainUntilDate=datetime.now(timezone.utc) + timedelta(days=settings.FORENTRACE_S3_RETENTION_DAYS),
            )
    except ClientError as error:
        if error.response["Error"]["Code"] in {"PreconditionFailed", "ConditionalRequestConflict"}:
            raise OriginalAlreadyExists("This original has already been stored.") from error
        raise StorageUnavailable("The protected store could not accept the original evidence.") from error
    except BotoCoreError as error:
        raise StorageUnavailable("The protected store could not accept the original evidence.") from error
    version = result.get("VersionId")
    if not version or version == "null":
        raise StorageUnavailable("The protected store did not confirm an object version.")
    return EvidenceObject(bucket=settings.FORENTRACE_S3_BUCKET, version=version)


def recover_original(artifact_id: str, bucket: str, expected_sha256: str, size: int) -> EvidenceObject:
    if bucket != settings.FORENTRACE_S3_BUCKET:
        raise StorageUnavailable("The pending original belongs to a different configured bucket.")
    try:
        response = client().get_object(Bucket=bucket, Key=f"originals/{artifact_id}")
        with closing(response["Body"]) as stream:
            version = response.get("VersionId")
            retain_until = response.get("ObjectLockRetainUntilDate")
            if (version in {None, "", "null"} or response.get("ObjectLockMode") != "COMPLIANCE"
                    or retain_until is None or retain_until <= datetime.now(timezone.utc)
                    or response.get("ContentLength") != size):
                raise StorageUnavailable("The pending object lacks its expected size, lock, or version.")
            fingerprint = compute_stream_fingerprint(stream)
    except (BotoCoreError, ClientError) as error:
        raise StorageUnavailable("The pending original is not available in the protected store.") from error
    if fingerprint.sha256 != expected_sha256 or fingerprint.byte_count != size:
        raise StorageUnavailable("The pending original differs from the registered fingerprint.")
    return EvidenceObject(bucket=bucket, version=version)


@contextmanager
def open_original(artifact_id: str, storage: EvidenceObject):
    if storage.bucket != settings.FORENTRACE_S3_BUCKET:
        raise StorageUnavailable("The evidence object belongs to a different configured bucket.")
    try:
        response = client().get_object(Bucket=storage.bucket, Key=f"originals/{artifact_id}", VersionId=storage.version)
        with closing(response["Body"]) as stream:
            yield stream
    except (BotoCoreError, ClientError) as error:
        raise StorageUnavailable("The sealed evidence object version could not be read.") from error
