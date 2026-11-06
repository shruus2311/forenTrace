// ForenTrace Live Enterprise API Client
// Connects React Frontend Workstation to FastAPI Backend Engine

const API_BASE = 'http://127.0.0.1:8000';

export interface BackendHealthResponse {
  status: string;
  service: string;
  version: string;
  crypto_engine: string;
  iso_27037_compliance: string;
  timestamp: string;
}

export interface LiveVerificationResponse {
  artifact_id: string;
  is_valid: boolean;
  status: string;
  expected_sha256: string;
  computed_sha256: string;
  computed_sha512: string;
  byte_count: number;
  verified_at: string;
  throughput_mb_s: number;
  discrepancy_details: string | null;
}

export const forensicApi = {
  async getHealth(): Promise<BackendHealthResponse | null> {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async listEvidence(): Promise<any[] | null> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/evidence`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async verifyEvidence(artifactId: string): Promise<LiveVerificationResponse | null> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/evidence/${artifactId}/verify`, {
        method: 'POST',
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async listCustodyRecords(): Promise<any[] | null> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/custody`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async appendCustodyRecord(recordData: {
    evidence_id: string;
    evidence_name: string;
    transferred_from: string;
    transferred_to: string;
    purpose: string;
    location: string;
    witness_key: string;
  }): Promise<any | null> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/custody`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordData),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getMerkleCheckpoint(): Promise<any | null> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/custody/merkle-checkpoint`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },
};
