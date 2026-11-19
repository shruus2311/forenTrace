import os
from pathlib import Path
from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "ForenTrace Evidence Intelligence Platform"
    API_V1_STR: str = "/api/v1"
    VERSION: str = "1.0.0"
    
    # Evidence Vault configuration (Read-only enforcement target)
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    EVIDENCE_VAULT_DIR: Path = DATA_DIR / "vault"
    ANALYSIS_ARTIFACTS_DIR: Path = DATA_DIR / "artifacts"
    FORENTRACE_DATABASE_URL: SecretStr | None = None
    FORENTRACE_SIGNING_KEY_FILE: Path | None = None
    FORENTRACE_SEED_DEMO: bool = False
    FORENTRACE_COOKIE_SECURE: bool = True
    FORENTRACE_SESSION_IDLE_MINUTES: int = Field(default=30, ge=1, le=480)
    FORENTRACE_WEBAUTHN_ORIGIN: str | None = None
    FORENTRACE_MAX_UPLOAD_BYTES: int = 100 * 1024 * 1024
    FORENTRACE_S3_ENDPOINT: str | None = None
    FORENTRACE_S3_BUCKET: str = "forentrace-evidence"
    FORENTRACE_S3_ACCESS_KEY: SecretStr | None = None
    FORENTRACE_S3_SECRET_KEY: SecretStr | None = None
    FORENTRACE_S3_RETENTION_DAYS: int = Field(default=30, ge=1, le=36500)
    FORENTRACE_LEDGER_ANCHOR_ENDPOINT: str | None = None
    FORENTRACE_LEDGER_ANCHOR_BUCKET: str = "forentrace-ledger-anchors"
    FORENTRACE_LEDGER_ANCHOR_ID: str | None = Field(default=None, pattern=r"^[a-z0-9][a-z0-9-]{0,63}$")
    FORENTRACE_LEDGER_ANCHOR_ACCESS_KEY: SecretStr | None = None
    FORENTRACE_LEDGER_ANCHOR_SECRET_KEY: SecretStr | None = None
    FORENTRACE_LEDGER_ANCHOR_RETENTION_DAYS: int = Field(default=3650, ge=1, le=36500)
    FORENTRACE_OPENSEARCH_URL: str | None = None
    FORENTRACE_OPENSEARCH_USERNAME: str | None = None
    FORENTRACE_OPENSEARCH_PASSWORD: SecretStr | None = None
    FORENTRACE_NEO4J_URI: str | None = None
    FORENTRACE_NEO4J_USERNAME: str = "neo4j"
    FORENTRACE_NEO4J_PASSWORD: SecretStr | None = None
    FORENTRACE_KEV_INTERVAL_MINUTES: int = Field(default=360, ge=1)
    FORENTRACE_SYNC_ATTACK: bool = False
    FORENTRACE_PROJECTION_INTERVAL_MINUTES: int = Field(default=2, ge=1)

    @property
    def seed_demo(self) -> bool:
        return self.FORENTRACE_SEED_DEMO
    
    # CORS Origins
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    model_config = SettingsConfigDict(case_sensitive=True)

settings = Settings()

# Ensure data directories exist
os.makedirs(settings.EVIDENCE_VAULT_DIR, exist_ok=True)
os.makedirs(settings.ANALYSIS_ARTIFACTS_DIR, exist_ok=True)
