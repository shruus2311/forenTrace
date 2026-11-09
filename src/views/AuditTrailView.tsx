import React, { useState } from 'react';
import {
  Activity,
  Search,
  Filter,
  ShieldCheck,
  Lock,
  Download,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { useToast } from '../design-system/Toast';
import { cyberAudio } from '../lib/audio';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  operatorId: string;
  operatorRole: string;
  action: string;
  targetResource: string;
  clientIp: string;
  status: 'SUCCESS' | 'WARNING' | 'ALERT';
  hashSignature: string;
}

const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'AUD-8801',
    timestamp: '2026-11-09 14:32:04 UTC',
    operatorId: 'INV-9082 (V. Raghunath)',
    operatorRole: 'DFIR_LEAD',
    action: 'CUSTODIAL_TRANSFER_SIGNED',
    targetResource: 'DC01_PHYSICAL_RAM_IMAGE.raw',
    clientIp: '10.36.242.151',
    status: 'SUCCESS',
    hashSignature: 'SIG:ed25519:0x89a1f28b',
  },
  {
    id: 'AUD-8802',
    timestamp: '2026-11-09 14:31:18 UTC',
    operatorId: 'INV-9082 (V. Raghunath)',
    operatorRole: 'DFIR_LEAD',
    action: 'STREAMING_HASH_VERIFICATION',
    targetResource: 'STAGE2_REFLECTIVE_LOADER.bin',
    clientIp: '10.36.242.151',
    status: 'SUCCESS',
    hashSignature: 'SIG:ed25519:0x41e0b9c1',
  },
  {
    id: 'AUD-8803',
    timestamp: '2026-11-09 14:28:44 UTC',
    operatorId: 'INV-4011 (M. Henderson)',
    operatorRole: 'FORENSIC_ANALYST',
    action: 'UNALLOCATED_CLUSTER_CARVE',
    targetResource: 'PARTITION_C_MFT_#49201',
    clientIp: '10.36.242.190',
    status: 'SUCCESS',
    hashSignature: 'SIG:ed25519:0x6f91ad20',
  },
  {
    id: 'AUD-8804',
    timestamp: '2026-11-09 14:15:02 UTC',
    operatorId: 'INV-9082 (V. Raghunath)',
    operatorRole: 'DFIR_LEAD',
    action: 'WORKSTATION_FIDO2_UNLOCK',
    targetResource: 'SECURE_ENCLAVE_NODE_04',
    clientIp: '10.36.242.151',
    status: 'SUCCESS',
    hashSignature: 'SIG:ed25519:0x1b77ce45',
  },
];

export const AuditTrailView: React.FC = () => {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');

  const filteredLogs = MOCK_AUDIT_LOGS.filter(
    (l) =>
      l.operatorId.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.targetResource.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#303743]">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-[#E7EAF0] tracking-wide flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-[#416F9E] dark:text-[#648DBB]" />
            <span>IMMUTABLE AUDIT TRAIL & SYSTEM INTEGRITY REGISTER</span>
          </h1>
          <p className="text-xs font-mono text-slate-500 dark:text-[#9AA4B2] mt-1">
            Tamper-evident, cryptographically chained activity ledger preserving operator accountability.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            cyberAudio.playScan(600);
            showToast({
              type: 'success',
              title: 'Audit Register Exported',
              description: 'Exported cryptographic audit ledger conforming to NIST SP 800-86.',
            });
          }}
          icon={<Download className="w-3.5 h-3.5" />}
        >
          Export Signed Audit Register
        </Button>
      </div>

      {/* Compliance Strip */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#171B22] border border-slate-200 dark:border-[#303743] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#EAF5F0] dark:bg-[#142820] border border-[#337D5C]/30 flex items-center justify-center text-[#337D5C] dark:text-[#4D9B78]">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="font-mono text-xs font-bold text-slate-900 dark:text-white">
              APPEND-ONLY CRYPTOGRAPHIC LOG TREE ACTIVE
            </div>
            <div className="text-[11px] font-mono text-slate-500 dark:text-[#9AA4B2]">
              Audit hashes linked via Ed25519 signature chain. Zero record deletions permitted.
            </div>
          </div>
        </div>

        <span className="font-mono text-xs text-[#337D5C] dark:text-[#4D9B78] font-bold px-2.5 py-1 rounded bg-[#EAF5F0] dark:bg-[#142820] border border-[#337D5C]/30">
          CHAIN INTEGRITY: 100% UNCOMPROMISED
        </span>
      </div>

      {/* Search */}
      <div className="relative w-full">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search audit trail by operator, action, or target resource..."
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-[#1D232C] border border-slate-300 dark:border-[#303743] text-slate-900 dark:text-[#E7EAF0] font-mono text-xs focus:border-[#416F9E] dark:focus:border-[#648DBB] outline-none transition-colors shadow-sm"
        />
      </div>

      {/* Audit Log Table */}
      <div className="rounded-xl bg-white dark:bg-[#1D232C] border border-slate-200 dark:border-[#303743] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-xs">
            <thead className="bg-slate-50 dark:bg-[#171B22] border-b border-slate-200 dark:border-[#303743] font-mono text-[11px] text-slate-500 dark:text-[#9AA4B2]">
              <tr>
                <th className="py-3 px-4 font-medium">LOG ID & TIMESTAMP</th>
                <th className="py-3 px-4 font-medium">OPERATOR</th>
                <th className="py-3 px-4 font-medium">ACTION EXECUTED</th>
                <th className="py-3 px-4 font-medium">TARGET RESOURCE</th>
                <th className="py-3 px-4 text-right font-medium">CRYPTO WITNESS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#303743]/60 font-mono text-xs">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-[#242B36] transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#416F9E] dark:text-[#648DBB]">{log.id}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">{log.timestamp}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-slate-900 dark:text-white font-medium">{log.operatorId}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">{log.operatorRole} • {log.clientIp}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#111318] border border-slate-200 dark:border-white/[0.08] text-[10px] text-slate-700 dark:text-slate-300 font-bold">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300 truncate max-w-xs">
                    {log.targetResource}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-500 dark:text-slate-400 font-mono text-[10px]">
                    {log.hashSignature}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditTrailView;
