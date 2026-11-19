from datetime import date, datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.custody import HexDigest, SignatureHex

CISA_KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
Analyzer = Literal["file-profile", "byte-entropy", "text-metrics", "cve-references", "attack-references"]
REPORT_FORMATS = {
    "file-profile": "forentrace.file-profile.v1",
    "byte-entropy": "forentrace.byte-entropy.v1",
    "text-metrics": "forentrace.text-metrics.v1",
    "cve-references": "forentrace.cve-references.v1",
    "attack-references": "forentrace.attack-references.v1",
}

class AnalysisRequest(BaseModel):
    case_id: str = Field(min_length=1, max_length=64)
    evidence_id: str = Field(min_length=1, max_length=64)
    analyzer: Analyzer = "file-profile"


class WorkerReport(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    sha256: HexDigest
    byte_count: int = Field(ge=0)


class FileReport(WorkerReport):
    format: Literal["forentrace.file-profile.v1"]
    classification: Literal["PDF", "PNG", "JPEG", "ZIP", "GZIP", "SQLite", "ELF", "MZ", "PCAPNG", "Unknown"]


class EntropyReport(WorkerReport):
    format: Literal["forentrace.byte-entropy.v1"]
    entropy_millibits: int = Field(ge=0, le=8000)
    distinct_bytes: int = Field(ge=0, le=256)

    @model_validator(mode="after")
    def validate_counts(self):
        if self.distinct_bytes > self.byte_count:
            raise ValueError("Distinct bytes exceed input size.")
        return self


class TextReport(WorkerReport):
    format: Literal["forentrace.text-metrics.v1"]
    printable_ascii_bytes: int = Field(ge=0)
    line_feeds: int = Field(ge=0)
    nul_bytes: int = Field(ge=0)

    @model_validator(mode="after")
    def validate_counts(self):
        if self.printable_ascii_bytes + self.line_feeds + self.nul_bytes > self.byte_count:
            raise ValueError("Text counters exceed input size.")
        return self


CVEId = Annotated[str, Field(pattern=r"^CVE-[0-9]{4}-[0-9]{4,19}$")]


class CVEReport(WorkerReport):
    format: Literal["forentrace.cve-references.v1"]
    cve_ids: list[CVEId] = Field(max_length=50)
    truncated: bool


TechniqueId = Annotated[str, Field(pattern=r"^T[0-9]{4}(?:\.[0-9]{3})?$")]


class AttackReport(WorkerReport):
    format: Literal["forentrace.attack-references.v1"]
    technique_ids: list[TechniqueId] = Field(max_length=50)
    truncated: bool


AnalysisReport = Annotated[FileReport | EntropyReport | TextReport | CVEReport | AttackReport, Field(discriminator="format")]


class SignedAnalysis(BaseModel):
    model_config = ConfigDict(extra="forbid")

    report: AnalysisReport
    report_sha256: HexDigest
    worker_image: str = Field(pattern=r"^sha256:[a-f0-9]{64}$")
    signature_hex: SignatureHex


class AnalysisJob(BaseModel):
    id: UUID
    case_id: str
    evidence_id: str
    requested_by: str
    input_sha256: HexDigest
    analyzer: Analyzer
    status: Literal["queued", "running", "completed", "failed"]
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
    result: SignedAnalysis | None
    error: str | None


class KEVEntry(BaseModel):
    cve_id: str
    vendor: str
    product: str
    title: str
    description: str
    action: str
    date_added: date
    due_date: date
    catalog_version: str
    imported_at: datetime
    source_mode: Literal["official_https", "local_file"]
    source_sha256: HexDigest
    source_url: str = CISA_KEV_URL
