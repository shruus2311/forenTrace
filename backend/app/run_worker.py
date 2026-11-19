"""Operator-run queue consumer. Only the fixed analyzer runs inside Docker."""

import argparse
from hashlib import sha256
from pathlib import Path
import re
import subprocess
from tempfile import TemporaryDirectory
import time

from cryptography.exceptions import InvalidSignature
from psycopg import OperationalError
from pydantic import TypeAdapter, ValidationError

from app.core.access import investigator_assigned
from app.core.config import settings
from app.core.database import database
from app.core.evidence_objects import StorageUnavailable
from app.schemas.analysis import AnalysisReport, REPORT_FORMATS
from app.services.analysis import claim, finish
from app.services.evidence_vault import evidence_vault_service

WORKER_IMAGE = "forentrace-file-profile:local"
REPORTS = TypeAdapter(AnalysisReport)


class WorkerError(RuntimeError):
    pass


def image_id() -> str:
    result = subprocess.run(["docker", "image", "inspect", "--format", "{{.Id}}", WORKER_IMAGE],
                            capture_output=True, text=True, timeout=10, check=True)
    identifier = result.stdout.strip()
    if not re.fullmatch(r"sha256:[a-f0-9]{64}", identifier):
        raise WorkerError("Docker did not return a valid analyzer image ID.")
    return identifier


def run_container(path: Path, name: str, identifier: str, analyzer: str) -> AnalysisReport:
    if "," in str(path):
        raise WorkerError("Worker scratch paths cannot contain commas.")
    command = ["docker", "run", "--rm", "--pull=never", "--name", name, "--network=none", "--read-only",
               "--user=65532:65532", "--cap-drop=ALL", "--security-opt=no-new-privileges",
               "--cpus=1", "--memory=96m", "--pids-limit=24", "--log-driver=none",
               "--env=HTTP_PROXY=", "--env=HTTPS_PROXY=", "--env=FTP_PROXY=", "--env=ALL_PROXY=", "--env=NO_PROXY=",
               "--env=http_proxy=", "--env=https_proxy=", "--env=ftp_proxy=", "--env=all_proxy=", "--env=no_proxy=",
               "--mount", f"type=bind,source={path},target=/input/evidence,readonly", identifier, analyzer]
    try:
        result = subprocess.run(command, capture_output=True, timeout=60, check=True)
        return REPORTS.validate_json(result.stdout)
    except (subprocess.TimeoutExpired, subprocess.CalledProcessError, ValidationError) as error:
        raise WorkerError("The isolated analyzer did not return a valid report.") from error
    finally:
        try:
            subprocess.run(["docker", "rm", "-f", name], stdout=subprocess.DEVNULL,
                           stderr=subprocess.DEVNULL, timeout=10)
        except (OSError, subprocess.TimeoutExpired):
            pass  # The analyzer also has an in-container deadline.


def process(job: dict, identifier: str) -> None:
    try:
        if job["analyzer"] not in REPORT_FORMATS:
            raise WorkerError("Unknown analyzer.")
        with database.connect() as conn:
            if not investigator_assigned(conn, job["case_id"], job["requested_by"]):
                raise WorkerError("The investigator no longer has write access to this case.")
        artifact = evidence_vault_service.get_artifact(job["evidence_id"], [job["case_id"]])
        if artifact is None or artifact.hashes.sha256 != job["input_sha256"]:
            raise WorkerError("The original evidence seal does not match the queued job.")
        with TemporaryDirectory(dir=settings.ANALYSIS_ARTIFACTS_DIR) as folder:
            path = Path(folder).resolve() / "evidence"
            size = 0
            digest = sha256()
            deadline = time.monotonic() + 120
            with evidence_vault_service.open_evidence(artifact) as source, path.open("xb") as staged:
                while chunk := source.read(1024 * 1024):
                    size += len(chunk)
                    if size > min(artifact.file_size_bytes, settings.FORENTRACE_MAX_UPLOAD_BYTES):
                        raise WorkerError("The evidence exceeds the sealed size or worker limit.")
                    if time.monotonic() > deadline:
                        raise WorkerError("The evidence store exceeded the staging deadline.")
                    digest.update(chunk)
                    staged.write(chunk)
            if size != artifact.file_size_bytes or digest.hexdigest() != job["input_sha256"]:
                raise WorkerError("The staged input does not match the sealed evidence.")
            path.chmod(0o444)
            try:
                report = run_container(path, f"forentrace-{job['lease_id'].hex}", identifier, job["analyzer"])
            finally:
                path.chmod(0o600)
        if (report.format != REPORT_FORMATS[job["analyzer"]]
                or report.sha256 != job["input_sha256"] or report.byte_count != size):
            raise WorkerError("The analyzer output does not match the sealed input.")
    except (InvalidSignature, StorageUnavailable, WorkerError, OSError) as error:
        message = str(error) if isinstance(error, WorkerError) else "The sealed evidence or analyzer is unavailable."
        finish(job, identifier, error=message)
    else:
        finish(job, identifier, report=report)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--once", action="store_true", help="Process at most one pending job")
    args = parser.parse_args()
    if not database:
        parser.error("Configure PostgreSQL before starting the worker.")
    try:
        identifier = image_id()
    except (WorkerError, subprocess.SubprocessError, OSError):
        parser.error("Build the forensic analyzer image and start Docker before running the worker.")
    backoff = 2
    while True:
        try:
            job = claim()
            if job:
                process(job, identifier)
        except OperationalError:
            print("PostgreSQL is unavailable. Any unconfirmed job will recover through its lease.", flush=True)
            if args.once:
                return 1
            time.sleep(backoff)
            backoff = min(30, backoff * 2)
            continue
        if args.once:
            return 0
        backoff = 2
        if not job:
            time.sleep(2)


if __name__ == "__main__":
    raise SystemExit(main())
