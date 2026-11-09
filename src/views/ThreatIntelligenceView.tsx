import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  ExternalLink,
  Target,
  Sparkles,
  Layers,
  ArrowRight,
  Database,
  FileCheck2,
} from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { SeverityBadge } from '../design-system/Badge';
import { cyberAudio } from '../lib/audio';
import { useToast } from '../design-system/Toast';

interface MitreTactic {
  id: string;
  tactic: string;
  techniqueId: string;
  techniqueName: string;
  detectedCount: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  confidence: number;
  evidenceSource: string;
}

const MOCK_MITRE_CORRELATIONS: MitreTactic[] = [
  {
    id: 'T1059.001',
    tactic: 'Execution',
    techniqueId: 'T1059.001',
    techniqueName: 'PowerShell Hidden Encoded Command',
    detectedCount: 4,
    severity: 'HIGH',
    confidence: 98,
    evidenceSource: 'DC01_PHYSICAL_RAM_IMAGE.raw',
  },
  {
    id: 'T1055.012',
    tactic: 'Defense Evasion',
    techniqueId: 'T1055.012',
    techniqueName: 'Process Hollowing (lsass.exe)',
    detectedCount: 1,
    severity: 'CRITICAL',
    confidence: 99.4,
    evidenceSource: 'DC01_PHYSICAL_RAM_IMAGE.raw (VAD Tree)',
  },
  {
    id: 'T1071.001',
    tactic: 'Command & Control',
    techniqueId: 'T1071.001',
    techniqueName: 'Web Protocols (Malleable HTTPS C2)',
    detectedCount: 142,
    severity: 'CRITICAL',
    confidence: 96.8,
    evidenceSource: 'BORDER_GATEWAY_TAP_INTERFACE.pcapng',
  },
  {
    id: 'T1003.001',
    tactic: 'Credential Access',
    techniqueId: 'T1003.001',
    techniqueName: 'LSASS Memory Dumping',
    detectedCount: 2,
    severity: 'HIGH',
    confidence: 94.2,
    evidenceSource: 'DC01_PHYSICAL_RAM_IMAGE.raw',
  },
  {
    id: 'T1078.002',
    tactic: 'Lateral Movement',
    techniqueId: 'T1078.002',
    techniqueName: 'Valid Accounts: Domain Accounts',
    detectedCount: 8,
    severity: 'MEDIUM',
    confidence: 88.0,
    evidenceSource: 'Windows_Security_Audit_1102.evtx',
  },
];

export const ThreatIntelligenceView: React.FC = () => {
  const { showToast } = useToast();
  const [selectedTactic, setSelectedTactic] = useState<MitreTactic>(MOCK_MITRE_CORRELATIONS[0]);
  const [search, setSearch] = useState('');

  const filtered = MOCK_MITRE_CORRELATIONS.filter(
    (m) =>
      m.techniqueName.toLowerCase().includes(search.toLowerCase()) ||
      m.techniqueId.toLowerCase().includes(search.toLowerCase()) ||
      m.tactic.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#303743]">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-[#E7EAF0] tracking-wide flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-[#B74D55] dark:text-[#C66B70]" />
            <span>AI INTELLIGENCE & MITRE ATT&CK CORRELATION</span>
          </h1>
          <p className="text-xs font-mono text-slate-500 dark:text-[#9AA4B2] mt-1">
            Autonomous threat attribution mapping forensic artifacts directly to adversary TTPs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-[#EBF2F9] dark:bg-[#1A2838] text-[#416F9E] dark:text-[#648DBB] border border-[#416F9E]/30 font-semibold">
            ATTRIBUTION: APT29 / COZY BEAR (89% SIMILARITY)
          </span>
        </div>
      </div>

      {/* MITRE ATT&CK Matrix Grid & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-4">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search MITRE techniques (e.g. 'T1055' or 'LSASS')..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-[#1D232C] border border-slate-300 dark:border-[#303743] text-slate-900 dark:text-[#E7EAF0] font-mono text-xs focus:border-[#416F9E] dark:focus:border-[#648DBB] outline-none transition-colors shadow-sm"
            />
          </div>

          <div className="space-y-3">
            {filtered.map((item) => {
              const isSelected = selectedTactic.id === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedTactic(item);
                    cyberAudio.playClick(item.severity === 'CRITICAL' ? 620 : 880, 0.04);
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#EBF2F9] dark:bg-[#1D232C] border-[#416F9E] dark:border-[#648DBB] shadow-sm translate-x-1.5'
                      : 'bg-white dark:bg-[#171B22] border-slate-200 dark:border-[#303743] hover:border-slate-300 dark:hover:border-[#404957]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-[#416F9E] dark:text-[#648DBB] font-bold">
                        {item.techniqueId}
                      </span>
                      <span className="font-sans font-semibold text-sm text-slate-900 dark:text-white">
                        {item.techniqueName}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#111318] border border-slate-200 dark:border-white/[0.08] font-mono text-[10px] text-slate-600 dark:text-slate-300">
                        {item.tactic}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-xs">
                      <span className="text-slate-500">CONF: {item.confidence}%</span>
                      <SeverityBadge severity={item.severity} size="sm" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected TTP Inspector */}
        <div className="lg:col-span-4 rounded-xl bg-white dark:bg-[#1D232C] border border-[#416F9E]/30 dark:border-[#648DBB]/40 p-5 shadow-sm space-y-4 font-mono text-xs">
          <div className="pb-3 border-b border-slate-100 dark:border-[#303743]">
            <div className="text-[10px] text-slate-400">MITRE TECHNIQUE CORRELATION</div>
            <div className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
              {selectedTactic.techniqueId} - {selectedTactic.techniqueName}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-slate-400 text-[10px] block">TACTIC CATEGORY:</span>
              <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedTactic.tactic}</span>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] block">EVIDENCE BITSTREAM SOURCE:</span>
              <span className="text-[#416F9E] dark:text-[#648DBB] font-bold break-all">
                {selectedTactic.evidenceSource}
              </span>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] block">OBSERVED EVENT FREQUENCY:</span>
              <span className="text-slate-800 dark:text-slate-200">{selectedTactic.detectedCount} Telemetry Occurrences</span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-[#303743] space-y-2">
              <div className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#416F9E] dark:text-[#648DBB]" />
                <span>AI Forensics Hypothesis</span>
              </div>
              <p className="font-sans text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Adversary executed reflective DLL injection to hollow the lsass.exe address space. Used unbacked memory pages with PAGE_EXECUTE_READWRITE permissions to execute Cobalt Strike beacon.
              </p>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={() => {
                  cyberAudio.playScan(680);
                  showToast({
                    type: 'success',
                    title: 'STIX 2.1 Threat Bundle Exported',
                    description: `Generated structured IOC correlation for ${selectedTactic.techniqueId}`,
                  });
                }}
                icon={<Database className="w-4 h-4" />}
              >
                Export STIX 2.1 IOC Bundle
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreatIntelligenceView;
