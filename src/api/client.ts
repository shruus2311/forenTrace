// ForenTrace Live Enterprise API Client
// Connects React Frontend Workstation to FastAPI Backend Engine

import type { VerificationStatus } from '../types/forensics';

const API_BASE = '/api/v1';
let sessionGeneration = 0;

export interface CaseAccess {
  id: string;
  role: 'viewer' | 'investigator';
  restriction?: string;
  access_policy?: {
    timezone: string; weekdays: number[]; opens?: string; closes?: string;
    valid_from?: string; valid_until?: string; step_up_minutes?: number;
  };
}

export interface SessionIdentity {
  username: string;
  organization_id: string;
  cases: CaseAccess[];
}

async function protectedFetch(path: string, init?: RequestInit) {
  const generation = sessionGeneration;
  const response = await fetch(API_BASE + path, init);
  if (response.status === 401 && generation === sessionGeneration) {
    sessionGeneration += 1;
    window.dispatchEvent(new Event('forentrace-session-expired'));
  }
  return response;
}

async function readResult<T>(response: Response): Promise<T> {
  if (response.ok) return await response.json();
  const body = await response.json().catch(() => null);
  throw new Error(typeof body?.detail === 'string' ? body.detail : 'The forensic API could not complete the request.');
}

export interface LiveEvidenceArtifact {
  id: string;
  name: string;
  type: string;
  file_size_human: string;
  source_host: string;
  custodian: string;
  hashes: { md5: string; sha1: string; sha256: string };
  integrity_status: VerificationStatus;
  signature_ed25519: string;
  mitre_techniques: string[];
  derived_artifact_count: number;
  anomaly_score: number;
  notes: string | null;
  storage: { bucket: string; version: string } | null;
}

export type Analyzer = 'file-profile' | 'byte-entropy' | 'text-metrics' | 'cve-references' | 'attack-references';

export interface AnalysisJob {
  id: string;
  evidence_id: string;
  input_sha256: string;
  analyzer: Analyzer;
  status: 'queued' | 'running' | 'completed' | 'failed';
  result: {
    report: { byte_count: number } & (
      { format: 'forentrace.file-profile.v1'; classification: string } |
      { format: 'forentrace.byte-entropy.v1'; entropy_millibits: number; distinct_bytes: number } |
      { format: 'forentrace.text-metrics.v1'; printable_ascii_bytes: number; line_feeds: number; nul_bytes: number } |
      { format: 'forentrace.cve-references.v1'; cve_ids: string[]; truncated: boolean } |
      { format: 'forentrace.attack-references.v1'; technique_ids: string[]; truncated: boolean }
    );
    report_sha256: string;
    worker_image: string;
  } | null;
  error: string | null;
}

export interface CaseSearchResults {
  evidence: LiveEvidenceArtifact[];
  reports: AnalysisJob[];
  intelligence: {
    cve_id: string; vendor: string; product: string; title: string; description: string;
    action: string; catalog_version: string; imported_at: string;
    source_mode: 'official_https' | 'local_file'; source_url: string;
  }[];
}

export type CorrelationDecision = 'confirmed' | 'dismissed';
export interface CorrelationReview { decision: CorrelationDecision; reviewed_by: string; reviewed_at: string }
export interface Correlation {
  id: string; kind: 'direct_observation' | 'external_intelligence_match'; value: string;
  matched_fields: string[]; source: string; logic: string; confidence: 'exact_hash' | 'exact_identifier';
  source_updated_at: string; evidence_id: string; related_id: string; report_id: string | null;
  context: string | null;
  review: CorrelationReview | null;
}
export interface SecurityAlert { kind: string; first_at: string; last_at: string; occurrences: number }
export interface PasskeyState { enabled: boolean; credentials: string[]; verified_at: string | null }
export interface IntelligenceSource {
  source: string; version: string | null; observed_at: string | null; imported_at: string | null;
  source_mode: string | null; last_attempt: string | null; last_success: string | null; last_error: string | null;
}
export interface EmergencyApproval {
  id: string; evidence_id: string; case_id: string; reason: string;
  activate_before: string; expires_at: string | null; ledger_id: string | null;
}

async function securityPost(path: string, body?: unknown) {
  return protectedFetch('/security' + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000),
  });
}

export interface LiveCustodyRecord {
  id: string;
  record_number: string;
  timestamp: string;
  evidence_id: string;
  evidence_name: string;
  transferred_from: string;
  transferred_to: string;
  purpose: string;
  location: string;
  cryptographic_signature: string;
  witness_key: string;
  integrity_verified: boolean;
  block_hash: string;
  event_type?: 'emergency_access_intent';
}

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
  async intelligenceSources(): Promise<IntelligenceSource[]> {
    return readResult(await protectedFetch('/analysis/intelligence/sources', { signal: AbortSignal.timeout(10000) }));
  },

  async emergencyApprovals(): Promise<EmergencyApproval[]> {
    return readResult(await protectedFetch('/security/emergency', { signal: AbortSignal.timeout(10000) }));
  },

  async activateEmergency(id: string) {
    return readResult<{ ledger_id: string }>(await securityPost('/emergency/' + encodeURIComponent(id) + '/activate'));
  },

  async downloadOriginal(id: string): Promise<Blob> {
    const response = await protectedFetch('/evidence/' + encodeURIComponent(id) + '/original', { signal: AbortSignal.timeout(300000) });
    if (!response.ok) await readResult(response);
    if (!response.headers.get('Content-Disposition')?.startsWith('attachment;')) throw new Error('The forensic API did not return the original.');
    return response.blob();
  },

  async correlations(caseId: string, evidenceId: string): Promise<Correlation[]> {
    return readResult(await protectedFetch('/analysis/correlations?' + new URLSearchParams({ case_id: caseId, evidence_id: evidenceId }), {
      signal: AbortSignal.timeout(10000),
    }));
  },

  async reviewCorrelation(caseId: string, evidenceId: string, id: string, decision: CorrelationDecision): Promise<CorrelationReview> {
    return readResult(await protectedFetch('/analysis/correlations/' + id + '?' + new URLSearchParams({ case_id: caseId, evidence_id: evidenceId }), {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision }),
      signal: AbortSignal.timeout(10000),
    }));
  },

  async securityAlerts(caseId?: string): Promise<SecurityAlert[]> {
    return readResult(await protectedFetch('/security/alerts' + (caseId ? '?' + new URLSearchParams({ case_id: caseId }) : ''), {
      signal: AbortSignal.timeout(10000),
    }));
  },

  async passkeyState(): Promise<PasskeyState> {
    return readResult(await protectedFetch('/security/passkeys', { signal: AbortSignal.timeout(10000) }));
  },

  async usePasskey(action: 'enroll' | 'verify', password?: string, enrollmentCode?: string) {
    if (typeof PublicKeyCredential === 'undefined' || !PublicKeyCredential.parseCreationOptionsFromJSON
        || !PublicKeyCredential.parseRequestOptionsFromJSON) throw new Error('Use a current browser on the secure workstation origin.');
    const response = await securityPost('/passkeys/' + action + '/options', password === undefined ? undefined : {
      password, enrollment_code: enrollmentCode || undefined,
    });
    const options = await readResult(response);
    const credential = action === 'enroll'
      ? await navigator.credentials.create({ publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(options as Parameters<typeof PublicKeyCredential.parseCreationOptionsFromJSON>[0]) })
      : await navigator.credentials.get({ publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(options as Parameters<typeof PublicKeyCredential.parseRequestOptionsFromJSON>[0]) });
    if (!(credential instanceof PublicKeyCredential)) throw new Error('The browser did not return a passkey response.');
    const finish = await securityPost('/passkeys/' + action + '/finish', credential.toJSON());
    if (!finish.ok) await readResult(finish);
    if (action === 'verify') sessionGeneration += 1;
  },

  async revokePasskey(id: string, password: string) {
    const response = await securityPost('/passkeys/' + encodeURIComponent(id) + '/revoke', { password });
    if (!response.ok) await readResult(response);
  },

  async listAnalysis(caseId: string): Promise<AnalysisJob[]> {
    return readResult(await protectedFetch('/analysis/jobs?' + new URLSearchParams({ case_id: caseId }), {
      signal: AbortSignal.timeout(10000),
    }));
  },

  async queueAnalysis(caseId: string, evidenceId: string, analyzer: Analyzer): Promise<AnalysisJob> {
    return readResult(await protectedFetch('/analysis/jobs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ case_id: caseId, evidence_id: evidenceId, analyzer }),
      signal: AbortSignal.timeout(10000),
    }));
  },

  async searchCase(caseId: string, query: string): Promise<CaseSearchResults> {
    return readResult(await protectedFetch('/analysis/search?' + new URLSearchParams({ case_id: caseId, q: query }), {
      signal: AbortSignal.timeout(10000),
    }));
  },

  async evidenceLineage(caseId: string, evidenceId: string): Promise<{ evidence: LiveEvidenceArtifact; reports: AnalysisJob[] }> {
    return readResult(await protectedFetch('/analysis/lineage?' + new URLSearchParams({
      case_id: caseId, evidence_id: evidenceId,
    }), { signal: AbortSignal.timeout(10000) }));
  },

  async login(username: string, password: string): Promise<SessionIdentity> {
    const identity = await readResult<SessionIdentity>(await fetch(API_BASE + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      signal: AbortSignal.timeout(10000),
    }));
    sessionGeneration += 1;
    return identity;
  },

  async getSession(): Promise<SessionIdentity | null> {
    const response = await fetch(API_BASE + '/auth/session', { signal: AbortSignal.timeout(3000) });
    return response.status === 401 ? null : readResult(response);
  },

  async logout(): Promise<void> {
    const response = await fetch(API_BASE + '/auth/logout', { method: 'POST', signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('Sign-out could not be confirmed. Try again.');
    sessionGeneration += 1;
  },

  async registerEvidence(caseId: string, file: File, type: string, expectedSha256: string,
                         idempotencyKey: string): Promise<LiveEvidenceArtifact> {
    const query = new URLSearchParams({ case_id: caseId, filename: file.name, type });
    if (expectedSha256) query.set('expected_sha256', expectedSha256);
    const signal = AbortSignal.timeout(5 * 60 * 1000);
    const unconfirmed = 'Registration could not be confirmed. Check the Evidence Vault or retry with the same file and details.';
    let response: Response;
    try {
      response = await protectedFetch('/evidence?' + query, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream', 'Idempotency-Key': idempotencyKey },
        body: file,
        signal,
      });
      if (response.ok) return await readResult<LiveEvidenceArtifact>(response);
    } catch {
      throw new Error(unconfirmed);
    }
    if (response.status >= 500) throw new Error(unconfirmed);
    return readResult(response);
  },

  async getHealth(): Promise<BackendHealthResponse | null> {
    try {
      const res = await fetch('/health', { signal: AbortSignal.timeout(2000) });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async listEvidence(caseId: string): Promise<LiveEvidenceArtifact[] | null> {
    try {
      const res = await protectedFetch('/evidence?case_id=' + encodeURIComponent(caseId), { signal: AbortSignal.timeout(3000) });
      if (!res.ok) return null;
      const items = await res.json();
      return Array.isArray(items) ? items : null;
    } catch {
      return null;
    }
  },

  async verifyEvidence(artifactId: string): Promise<LiveVerificationResponse | null> {
    try {
      const res = await protectedFetch(`/evidence/${encodeURIComponent(artifactId)}/verify`, {
        method: 'POST',
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async listCustodyRecords(caseId: string): Promise<LiveCustodyRecord[] | null> {
    try {
      const res = await protectedFetch('/custody?case_id=' + encodeURIComponent(caseId), { signal: AbortSignal.timeout(3000) });
      if (!res.ok) return null;
      const records = await res.json();
      return Array.isArray(records) ? records : null;
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
  }, requestId: string): Promise<LiveCustodyRecord | null> {
    try {
      const res = await protectedFetch('/custody', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': requestId },
        body: JSON.stringify(recordData),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async downloadCustodyFile(caseId: string, recordId?: string): Promise<Blob> {
    const path = recordId ? `/custody/${encodeURIComponent(recordId)}/proof` : '/custody/export';
    const response = await protectedFetch(path + '?case_id=' + encodeURIComponent(caseId), {
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) await readResult(response);
    if (!response.headers.get('Content-Type')?.startsWith('application/json')
        || !response.headers.get('Content-Disposition')?.startsWith('attachment;')) {
      throw new Error('The forensic API did not return a ledger download.');
    }
    return response.blob();
  },
};
