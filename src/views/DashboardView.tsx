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
  Sparkles,
  Layers,
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

export interface DashboardViewProps {
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
      description: 'Hashing 18 artifacts across 3 storage nodes with SHA-256 bitstream verification...',
    });

    setTimeout(() => {
      cyberAudio.playClick(1050, 0.08);
      showToast({
        type: 'success',
        title: 'Integrity Verification Confirmed',
        description: 'All 18 artifacts match master root SHA-256 checksums. Zero divergence detected.',
      });
    }, 1200);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Investigation Case Briefing Header Card */}
      <div className="p-6 rounded-2xl bg-[#090D17] border border-white/[0.08] shadow-2xl relative overflow-hidden">
        {/* Subtle radial ambient light */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
              <span className="px-2.5 py-0.5 rounded-md bg-[#00F2FE]/10 text-[#00F2FE] border border-cyan-400/30 font-bold tracking-wider">
                {currentCase.caseNumber}
              </span>
              <SeverityBadge severity={currentCase.threatLevel} />
              <span className="text-slate-600">|</span>
              <span className="text-slate-300 font-sans text-xs">
                CLIENT: <span className="text-white font-medium">{currentCase.clientOrganization}</span>
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 font-sans text-xs">
                LEAD: <span className="text-slate-200">{currentCase.leadInvestigator}</span>
              </span>
            </div>

            <h1 className="font-display font-bold text-xl sm:text-2xl text-white tracking-wide">
              {currentCase.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl font-sans leading-relaxed">
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
              icon={<HardDrive className="w-4 h-4 text-cyan-300" />}
            >
              Browse Vault ({currentCase.evidenceCount})
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
            <div className="w-7 h-7 rounded-md bg-cyan-950/60 border border-cyan-500/20 flex items-center justify-center text-[#00F2FE]">
              <HardDrive className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-mono font-bold text-white tracking-tight">
            18 <span className="text-xs text-slate-400 font-normal">ARTIFACTS</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-white/[0.04]">
            <span>VOLUME: 1.02 TB</span>
            <span className="text-emerald-400 font-medium">100% INDEXED</span>
          </div>
        </Card>

        {/* Metric 2 */}
        <Card className="hover:border-white/20">
          <div className="flex items-center justify-between font-mono text-xs text-slate-400">
            <span>CRYPTOGRAPHIC HASHES</span>
            <div className="w-7 h-7 rounded-md bg-emerald-950/60 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-mono font-bold text-emerald-400 tracking-tight">
            100% <span className="text-xs text-slate-400 font-normal">VERIFIED</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-white/[0.04]">
            <span>SHA-256 MATCHED</span>
            <span className="text-emerald-400 font-bold">0 TAMPER DETECTED</span>
          </div>
        </Card>

        {/* Metric 3 */}
        <Card className="hover:border-white/20">
          <div className="flex items-center justify-between font-mono text-xs text-slate-400">
            <span>ACTIVE DFIR JOBS</span>
            <div className="w-7 h-7 rounded-md bg-indigo-950/60 border border-indigo-500/20 flex items-center justify-center text-[#818CF8]">
              <Cpu className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-mono font-bold text-white tracking-tight">
            2 <span className="text-xs text-slate-400 font-normal">RUNNING</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-white/[0.04]">
            <span>VOLATILITY 3 // VAD</span>
            <span className="text-cyan-300 font-medium">84% PROG</span>
          </div>
        </Card>

        {/* Metric 4 */}
        <Card className="hover:border-white/20">
          <div className="flex items-center justify-between font-mono text-xs text-slate-400">
            <span>CUSTODY CONTINUITY</span>
            <div className="w-7 h-7 rounded-md bg-amber-950/60 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-mono font-bold text-white tracking-tight">
            3 <span className="text-xs text-slate-400 font-normal">BLOCKS</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-white/[0.04]">
            <span>FIPS 140-3 HW KEY</span>
            <span className="text-emerald-400 font-semibold">LEGAL SEAL</span>
          </div>
        </Card>
      </div>

      {/* Centerpiece: Signature 3D Evidence Provenance Matrix */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div>
            <h2 className="font-sans font-bold text-sm tracking-wider uppercase text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#00F2FE]" />
              <span>CENTRAL FORENSIC EVIDENCE TOPOLOGY</span>
            </h2>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Recharts Telemetry Ingestion */}
        <div className="lg:col-span-7">
          <Card
            title="Evidence Ingestion & Anomaly Spikes"
            subtitle="Throughput over 24-hr investigation window (MB/s)"
            icon={<Activity className="w-4 h-4 text-[#00F2FE]" />}
          >
            <div className="h-[220px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={INGESTION_METRICS} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00F2FE" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#00F2FE" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="violetGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818CF8" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#818CF8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="time"
                    stroke="#475569"
                    fontSize={10}
                    fontFamily="JetBrains Mono"
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#475569"
                    fontSize={10}
                    fontFamily="JetBrains Mono"
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#090D16',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      fontFamily: 'JetBrains Mono',
                      fontSize: '11px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="networkMB"
                    stroke="#818CF8"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#violetGrad)"
                    name="Network Stream (MB)"
                  />
                  <Area
                    type="monotone"
                    dataKey="memoryMB"
                    stroke="#00F2FE"
                    strokeWidth={1.5}
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
              <span className="text-[10px] font-mono text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                4 WORKERS ONLINE
              </span>
            }
          >
            <div className="space-y-3 font-mono text-xs">
              {FORENSIC_JOBS.map((job) => (
                <div
                  key={job.id}
                  className="p-3 rounded-lg bg-[#070A12] border border-white/[0.06] hover:border-white/10 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-xs truncate max-w-[200px]">
                      {job.name}
                    </span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-md border font-bold ${
                        job.status === 'RUNNING'
                          ? 'bg-cyan-950/80 text-[#00F2FE] border-cyan-400/30 animate-pulse'
                          : job.status === 'COMPLETED'
                          ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-900 text-slate-400 border-slate-700/40'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        job.status === 'COMPLETED'
                          ? 'bg-emerald-400'
                          : 'bg-gradient-to-r from-[#00F2FE] to-[#818CF8]'
                      }`}
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>PROGRESS: {job.progress}%</span>
                    <span>FINDINGS: <strong className="text-slate-200">{job.findingsCount}</strong> DETECTED</span>
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
