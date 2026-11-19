"""Run backend integration tests with fresh, expiring Object Lock buckets."""

import os
from pathlib import Path
import subprocess
import sys
from uuid import uuid4

import boto3
from botocore.config import Config


def main() -> int:
    required = ("DATABASE_URL", "S3_ENDPOINT", "S3_ACCESS_KEY", "S3_SECRET_KEY")
    if any(not os.environ.get(f"FORENTRACE_TEST_{name}") for name in required):
        raise SystemExit("Set the disposable database URL and S3 endpoint and provisioning credentials.")
    client = boto3.client(
        "s3", endpoint_url=os.environ["FORENTRACE_TEST_S3_ENDPOINT"], region_name="us-east-1",
        aws_access_key_id=os.environ["FORENTRACE_TEST_S3_ACCESS_KEY"],
        aws_secret_access_key=os.environ["FORENTRACE_TEST_S3_SECRET_KEY"],
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )
    env = {**os.environ, "PYTHONPATH": str(Path(__file__).resolve().parents[1])}
    for label, variable in (("evidence", "S3_BUCKET"), ("anchor", "ANCHOR_BUCKET")):
        bucket = f"forentrace-test-{label}-{uuid4().hex}"
        client.create_bucket(Bucket=bucket, ObjectLockEnabledForBucket=True)
        client.put_bucket_lifecycle_configuration(Bucket=bucket, LifecycleConfiguration={"Rules": [
            {"ID": "expire-test-versions", "Filter": {"Prefix": ""}, "Status": "Enabled",
             "Expiration": {"Days": 2}, "NoncurrentVersionExpiration": {"NoncurrentDays": 2}},
            {"ID": "expire-empty-delete-markers", "Filter": {"Prefix": ""}, "Status": "Enabled",
             "Expiration": {"ExpiredObjectDeleteMarker": True}},
        ]})
        env[f"FORENTRACE_TEST_{variable}"] = bucket
    return subprocess.call([sys.executable, "-m", "pytest", str(Path(__file__).resolve().parent), *sys.argv[1:]], env=env)


if __name__ == "__main__":
    raise SystemExit(main())
