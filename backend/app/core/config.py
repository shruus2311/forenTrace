import os
from pathlib import Path
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
