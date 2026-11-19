from io import BufferedReader, BytesIO
import json
from pathlib import Path
import runpy
from unittest.mock import Mock
from zipfile import ZipFile

import pytest
from psycopg import OperationalError

from app import run_worker


@pytest.mark.parametrize("entries", [[], ["fixture.txt"]])
def test_file_profile_recognizes_zip_with_or_without_entries(entries, monkeypatch, capsys):
    archive = BytesIO()
    with ZipFile(archive, "w") as writer:
        for name in entries:
            writer.writestr(name, "fixture")
    archive.seek(0)
    monkeypatch.setattr("sys.argv", ["profile.py", "file-profile"])
    monkeypatch.setattr("signal.alarm", lambda seconds: None, raising=False)
    with BufferedReader(archive) as stream:
        monkeypatch.setattr("builtins.open", lambda file, mode: stream)
        runpy.run_path(str(Path(__file__).resolve().parents[1] / "worker" / "profile.py"), run_name="__main__")
    assert json.loads(capsys.readouterr().out)["classification"] == "ZIP"


def test_worker_retries_database_disconnect_without_replaying_a_job(monkeypatch):
    job = {"id": "test-job"}
    claim = Mock(side_effect=[OperationalError("controlled disconnect"), job, KeyboardInterrupt()])
    process = Mock()
    sleep = Mock()
    monkeypatch.setattr(run_worker, "database", object())
    monkeypatch.setattr(run_worker, "image_id", lambda: "sha256:" + "a" * 64)
    monkeypatch.setattr(run_worker, "claim", claim)
    monkeypatch.setattr(run_worker, "process", process)
    monkeypatch.setattr(run_worker.time, "sleep", sleep)
    monkeypatch.setattr("sys.argv", ["run_worker"])

    with pytest.raises(KeyboardInterrupt):
        run_worker.main()

    sleep.assert_called_once_with(2)
    process.assert_called_once_with(job, "sha256:" + "a" * 64)
