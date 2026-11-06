// ForenTrace Enterprise Digital Forensics Types

export type VerificationStatus = 'VERIFIED' | 'FAILED_VERIFICATION' | 'PENDING_ANALYSIS' | 'NOT_YET_VERIFIED';

export type ArtifactType = 'MEMORY_DUMP' | 'DISK_IMAGE' | 'PACKET_CAPTURE' | 'EVENT_LOGS' | 'REGISTRY_HIVE' | 'MALWARE_BINARY';

export type ThreatSeverity = 'INFORMATIONAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface EvidenceArtifact {
  id: string;
  name: string;
  caseId: string;
  type: ArtifactType;
  fileSize: string;
  ingestDate: string;
  sourceHost: string;
  custodian: string;
  hashes: {
    md5: string;
    sha1: string;
    sha256: string;
    ssdeep?: string;
  };
  integrityStatus: VerificationStatus;
  lastVerifiedAt: string;
  signatureEd25519: string;
  mitreTechniques: string[];
  derivedArtifactCount: number;
  anomalyScore: number; // 0 - 100
  notes: string;
}

export interface InvestigationCase {
  id: string;
  caseNumber: string;
  title: string;
  clientOrganization: string;
  leadInvestigator: string;
  threatLevel: ThreatSeverity;
  status: 'ACTIVE_TRIAGE' | 'ANALYSIS_IN_PROGRESS' | 'EVIDENTIARY_SEALED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  evidenceCount: number;
  unverifiedCount: number;
  summary: string;
}

export interface CustodyRecord {
  id: string;
  recordNumber: string;
  timestamp: string;
  evidenceId: string;
  evidenceName: string;
  transferredFrom: string;
  transferredTo: string;
  purpose: string;
  location: string;
  cryptographicSignature: string;
  witnessKey: string;
  integrityVerified: boolean;
}

export interface ForensicJob {
  id: string;
  name: string;
  tool: 'VOLATILITY_3' | 'TSK_AUTOPSY' | 'ZEEK_PCAP' | 'YARA_NEURAL' | 'PLASO_TIMELINE';
  targetEvidenceId: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress: number;
  startedAt: string;
  runtimeSeconds: number;
  findingsCount: number;
}

export interface ProvenanceNode {
  id: string;
  label: string;
  type: 'SOURCE' | 'PROCESS' | 'PAYLOAD' | 'NETWORK' | 'PERSISTENCE' | 'EXFILTRATION';
  timestamp: string;
  status: VerificationStatus;
  severity: ThreatSeverity;
  details: string;
  connections: string[]; // Connected node IDs
  coordinates: [number, number, number]; // 3D coordinates
}
