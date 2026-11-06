import React from 'react';
import {
  ShieldCheck,
  HardDrive,
  Cpu,
  Lock,
  Activity,
  ArrowUpRight,
  AlertTriangle,
  Play,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { IntegrityBadge, SeverityBadge } from '../design-system/Badge';
import { SignatureEvidenceGraph } from '../components/3d/SignatureEvidenceGraph';
import {
  CASES,
  EVIDENCE_ITEMS,
  FORENSIC_JOBS,
  CUSTODY_RECORDS,
  INGESTION_METRICS,
} from '../data/mockForensicsData';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { useToast } from '../design-system/Toast';
import { cyberAudio } from '../lib/audio';

interface DashboardViewProps {
  activeCaseId: string;
  onNavigate: (view: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  activeCaseId,
  onNavigate,
}) => {
  const { showToast } = useToast();
  const currentCase = CASES.find((c) => c.id === activeCaseId) || CASES[0];

  const handleVerifyAll = () => {
    cyberAudio.playScan(720);
    showToast({
      type: 'info',
      title: 'Automated Integrity Check Triggered',
      description: 'Hashing 18 artifacts across 3 storage nodes with SHA-256...',
    });

    setTimeout(() => {
      cyberAudio.playClick(1050, 0.08);
      showToast({
        type: 'success',
        title: 'Integrity Verification Confirmed',
        description: 'All 18 artifacts match master root SHA-256 checksums. Zero divergence.',
      });
    }, 1200);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Investigation Case Briefing Header Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0F1420] via-[#0C1018] to-[#0A0D15] border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00F2FE]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2 font-mono text-xs">
              <span className="px-2 py-0.5 rounded bg-[#00F2FE]/15 text-[#00F2FE] border border-[#00F2FE]/30 font-bold">
                {currentCase.caseNumber}
              </span>
              <SeverityBadge severity={currentCase.threatLevel} />
              <span className="text-slate-400">|</span>
              <span className="text-slate-300 font-sans font-medium">
                {currentCase.clientOrganization}
              </span>
            </div>

            <h1 className="font-display font-bold text-xl sm:text-2xl text-white tracking-wide">
              {currentCase.title}
            </h1>

            <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-3xl font-sans leading-relaxed">
              {currentCase.summary}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              variant="primary"
              size="md"
              soundType="scan"
              onClick={handleVerifyAll}
              icon={<ShieldCheck className="w-4 h-4" />}
            >
              Verify All Hashes
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => onNavigate('evidence')}
              icon={<HardDrive className="w-4 h-4" />}
            >
              Browse Evidence ({currentCase.evidenceCount})
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Metric Strips: 4 High-Value Operational Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <Card className="hover:border-white/20">
          <div className="flex items-center justify-between font-mono text-xs text-slate-400">
            <span>INGESTED EVIDENCE</span>
            <HardDrive className="w-4 h-4 text-[#00F2FE]" />
          </div>
          <div className="mt-2 text-2xl font-mono font-bold text-white">
            18 <span className="text-xs text-slate-400 font-normal">ARTIFACTS</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>VOLUME: 1.02 TB</span>
            <span className="text-emerald-400">100% INDEXED</span>
          </div>
        </Card>

        {/* Metric 2 */}
        <Card className="hover:border-white/20">
          <div className="flex items-center justify-between font-mono text-xs text-slate-400">
            <span>CRYPTOGRAPHIC HASHES</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-mono font-bold text-emerald-400">
            100% <span className="text-xs text-slate-400 font-normal">VERIFIED</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>SHA-256 MATCHED</span>
            <span className="text-emerald-400 font-bold">0 TAMPER</span>
          </div>
        </Card>

        {/* Metric 3 */}
        <Card className="hover:border-white/20">
          <div className="flex items-center justify-between font-mono text-xs text-slate-400">
            <span>ACTIVE DFIR JOBS</span>
            <Cpu className="w-4 h-4 text-[#818CF8]" />
          </div>
          <div className="mt-2 text-2xl font-mono font-bold text-white">
            2 <span className="text-xs text-slate-400 font-normal">RUNNING</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>VOLATILITY 3 // VAD</span>
            <span className="text-cyan-300">84% PROG</span>
          </div>
        </Card>

        {/* Metric 4 */}
        <Card className="hover:border-white/20">
          <div className="flex items-center justify-between font-mono text-xs text-slate-400">
            <span>CUSTODY CONTINUITY</span>
            <Lock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-mono font-bold text-white">
            3 <span className="text-xs text-slate-400 font-normal">BLOCKS</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>FIPS 140-3 HW KEY</span>
            <span className="text-emerald-400">LEGAL SEAL</span>
          </div>
        </Card>
      </div>

      {/* Centerpiece: Signature 3D Evidence Provenance Matrix */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="font-sans font-bold text-sm tracking-wider uppercase text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#00F2FE]" />
              <span>CENTRAL FORENSIC EVIDENCE TOPOLOGY</span>
            </h2>
            <p className="text-[11px] font-mono text-slate-400">
              Interactive WebGL provenance graph correlating volatile RAM, TLS beacons, and carved stagers.
            </p>
          </div>
          <Button
            variant="technical"
            size="sm"
            onClick={() => onNavigate('provenance')}
            icon={<ArrowUpRight className="w-3.5 h-3.5" />}
          >
            Open Full Graph
          </Button>
        </div>

        <SignatureEvidenceGraph
          onSelectNodeDetail={(node) => {
            showToast({
              type: 'info',
              title: `Selected: ${node.label}`,
              description: `Classification: ${node.category} | Severity: ${node.severity}`,
            });
          }}
        />
      </div>

      {/* Two Column Layout: Ingestion Telemetry + Active Forensic Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Recharts Telemetry Ingestion */}
        <div className="lg:col-span-7">
          <Card
            title="Evidence Ingestion & Anomaly Spikes"
            subtitle="Throughput over 24-hr investigation window (MB/s)"
            icon={<Activity className="w-4 h-4 text-[#00F2FE]" />}
          >
            <div className="h-[220px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={INGESTION_METRICS}>
                  <defs>
                    <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00F2FE" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#00F2FE" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="violetGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818CF8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#818CF8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="time"
                    stroke="#475569"
                    fontSize={11}
                    fontFamily="JetBrains Mono"
                  />
                  <YAxis stroke="#475569" fontSize={11} fontFamily="JetBrains Mono" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0B0F17',
                      borderColor: '#1E293B',
                      borderRadius: '8px',
                      fontFamily: 'JetBrains Mono',
                      fontSize: '11px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="networkMB"
                    stroke="#818CF8"
                    fillOpacity={1}
                    fill="url(#violetGrad)"
                    name="Network Stream (MB)"
                  />
                  <Area
                    type="monotone"
                    dataKey="memoryMB"
                    stroke="#00F2FE"
                    fillOpacity={1}
                    fill="url(#cyanGrad)"
                    name="Memory Carved (MB)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Right: Active Forensic Jobs */}
        <div className="lg:col-span-5">
          <Card
            title="Live Forensic Job Queue"
            subtitle="Autonomous decompiler & correlation tasks"
            icon={<Cpu className="w-4 h-4 text-[#818CF8]" />}
            headerAction={
              <span className="text-[10px] font-mono text-emerald-400">
                4 CLUSTER WORKERS ACTIVE
              </span>
            }
          >
            <div className="space-y-3 font-mono text-xs">
              {FORENSIC_JOBS.map((job) => (
                <div
                  key={job.id}
                  className="p-3 rounded-lg bg-[#07090E] border border-white/5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-xs truncate max-w-[200px]">
                      {job.name}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${
                        job.status === 'RUNNING'
                          ? 'bg-cyan-950/80 text-[#00F2FE] border-[#00F2FE]/40 animate-pulse'
                          : job.status === 'COMPLETED'
                          ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                          : 'bg-slate-900 text-slate-400 border-slate-700/40'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        job.status === 'COMPLETED'
                          ? 'bg-emerald-400'
                          : 'bg-gradient-to-r from-[#00F2FE] to-[#818CF8]'
                      }`}
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>PROGRESS: {job.progress}%</span>
                    <span>FINDINGS: {job.findingsCount} DETECTED</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
