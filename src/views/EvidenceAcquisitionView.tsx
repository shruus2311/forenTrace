import React, { useState } from 'react';
import {
  DownloadCloud,
  HardDrive,
  Cpu,
  Radio,
  ShieldCheck,
  Lock,
  Play,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  FileCheck2,
} from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { useToast } from '../design-system/Toast';
import { cyberAudio } from '../lib/audio';

export const EvidenceAcquisitionView: React.FC = () => {
  const { showToast } = useToast();
  const [acquisitionType, setAcquisitionType] = useState<'DISK' | 'RAM' | 'NETWORK'>('DISK');
  const [sourceDrive, setSourceDrive] = useState('/dev/nvme0n1 (Samsung 980 PRO 1TB)');
  const [format, setFormat] = useState('E01');
  const [writeBlockerVerified, setWriteBlockerVerified] = useState(true);
  const [isAcquiring, setIsAcquiring] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleStartAcquisition = () => {
    if (!writeBlockerVerified) {
      showToast({
        type: 'error',
        title: 'Hardware Write-Blocker Required',
        description: 'ISO/IEC 27037 prohibits bitstream acquisition without physical write-blocking attestation.',
      });
      return;
    }

    setIsAcquiring(true);
    setProgress(0);
    cyberAudio.playScan(680);
    showToast({
      type: 'info',
      title: 'Acquisition Pipeline Initialized',
      description: `Streaming raw bitstream with continuous SHA-256 multi-hashing from ${sourceDrive}...`,
    });

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsAcquiring(false);
          cyberAudio.playClick(1150, 0.08);
          showToast({
            type: 'success',
            title: 'Forensic Image Sealed & Verified',
            description: 'SHA-256: 4f8b21...c890 matches origin source bit-for-bit. Added to Evidence Vault.',
          });
          return 100;
        }
        return prev + 20;
      });
    }, 600);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#303743]">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-[#E7EAF0] tracking-wide flex items-center gap-2.5">
            <DownloadCloud className="w-5 h-5 text-[#416F9E] dark:text-[#648DBB]" />
            <span>EVIDENCE ACQUISITION & BITSTREAM IMAGING</span>
          </h1>
          <p className="text-xs font-mono text-slate-500 dark:text-[#9AA4B2] mt-1">
            Forensically sound physical bitstream imaging, memory capture, and tap acquisition with hardware write-blocking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-[#EAF5F0] dark:bg-[#142820] text-[#337D5C] dark:text-[#4D9B78] border border-[#337D5C]/30 font-semibold flex items-center gap-1.5">
            <Lock className="w-3 h-3" />
            WRITE-BLOCKER: ACTIVE
          </span>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            id: 'DISK',
            label: 'PHYSICAL STORAGE BITSTREAM',
            desc: 'Bit-for-bit bitstream duplicate (E01, RAW, DD)',
            icon: HardDrive,
          },
          {
            id: 'RAM',
            label: 'VOLATILE MEMORY EXTRACTION',
            desc: 'Kernel DMA memory dump with zero paging collision',
            icon: Cpu,
          },
          {
            id: 'NETWORK',
            label: 'TAP INTERFACE NETWORK INGEST',
            desc: 'Non-intrusive gigabit fiber tap packet ingestion',
            icon: Radio,
          },
        ].map((item) => {
          const Icon = item.icon;
          const isSelected = acquisitionType === item.id;

          return (
            <div
              key={item.id}
              onClick={() => {
                setAcquisitionType(item.id as any);
                cyberAudio.playClick(800, 0.03);
              }}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#EBF2F9] dark:bg-[#1D232C] border-[#416F9E] dark:border-[#648DBB] shadow-sm'
                  : 'bg-white dark:bg-[#171B22] border-slate-200 dark:border-[#303743] hover:border-slate-300 dark:hover:border-[#404957]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'bg-[#416F9E] dark:bg-[#648DBB] text-white dark:text-[#111318]'
                      : 'bg-slate-100 dark:bg-[#111318] text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                    {item.label}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-[#9AA4B2] mt-0.5 font-sans">
                    {item.desc}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Acquisition Parameters Form & Real-time Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7">
          <Card
            title="Acquisition Configuration & Device Parameters"
            subtitle="Adheres to ISO/IEC 27037 electronic evidence handling specification"
          >
            <div className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 text-[10px] uppercase mb-1">
                  Target Source Device / Tap Interface
                </label>
                <select
                  value={sourceDrive}
                  onChange={(e) => setSourceDrive(e.target.value)}
                  disabled={isAcquiring}
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-300 dark:border-[#303743] text-slate-900 dark:text-[#E7EAF0] outline-none"
                >
                  <option value="/dev/nvme0n1 (Samsung 980 PRO 1TB)">
                    /dev/nvme0n1 (Samsung 980 PRO 1TB - Primary OS Bitstream)
                  </option>
                  <option value="/dev/sda (Crucial MX500 500GB)">
                    /dev/sda (Crucial MX500 500GB - Secondary Evidence Volume)
                  </option>
                  <option value="RAM_CORE_PHYSICAL (64GB DDR5)">
                    RAM_CORE_PHYSICAL (64GB DDR5 ECC Registered)
                  </option>
                  <option value="TAP0_10GB_SFP+ (Border Gateway Tap)">
                    TAP0_10GB_SFP+ (Border Gateway Tap Interface)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 text-[10px] uppercase mb-1">
                    Forensic Output Format
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    disabled={isAcquiring}
                    className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-300 dark:border-[#303743] text-slate-900 dark:text-[#E7EAF0] outline-none"
                  >
                    <option value="E01">Expert Witness Compression (.E01)</option>
                    <option value="RAW">Raw dd Bitstream (.raw / .dd)</option>
                    <option value="AFF4">Advanced Forensic Framework 4 (.aff4)</option>
                    <option value="PCAPNG">Next-Gen Packet Capture (.pcapng)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 text-[10px] uppercase mb-1">
                    Simultaneous Multi-Hashing
                  </label>
                  <input
                    type="text"
                    disabled
                    value="SHA-256 + SHA-512 + MD5"
                    className="w-full p-2.5 rounded-lg bg-slate-100 dark:bg-[#111318] border border-slate-300 dark:border-[#303743] text-slate-600 dark:text-slate-300"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#EAF5F0] dark:bg-[#142820] border border-[#337D5C]/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[#337D5C] dark:text-[#4D9B78]">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Hardware Write-Blocker Attestation Confirmed (Tableau T8u USB 3.0)</span>
                </div>
                <span className="font-bold text-[#337D5C] dark:text-[#4D9B78]">VERIFIED</span>
              </div>

              {isAcquiring && (
                <div className="space-y-2 p-3 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-[#303743]">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#416F9E] dark:text-[#648DBB] font-bold">ACQUIRING BITSTREAM...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#416F9E] dark:bg-[#648DBB] transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>THROUGHPUT: 420 MB/s</span>
                    <span>REMAINING: {(100 - progress) * 0.4}s</span>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="md"
                  disabled={isAcquiring}
                  onClick={handleStartAcquisition}
                  className="w-full py-2.5"
                  icon={<Play className="w-4 h-4" />}
                >
                  {isAcquiring ? 'Acquisition in Progress...' : 'Start Certified Bitstream Acquisition'}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <Card title="Evidentiary Write-Blocking Standard">
            <div className="space-y-3 font-sans text-xs text-slate-600 dark:text-slate-300">
              <p className="leading-relaxed">
                Pursuant to ISO/IEC 27037:2012 guidelines, physical bitstream acquisition must guarantee zero write-back or modification of source registers.
              </p>
              <div className="font-mono text-[11px] p-3 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-[#303743] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">WRITE ATTEMPTS:</span>
                  <span className="text-[#337D5C] dark:text-[#4D9B78] font-bold">0 (HARD BLOCKED)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">BUFFER INTEGRITY:</span>
                  <span className="text-[#337D5C] dark:text-[#4D9B78] font-bold">100% UNMODIFIED</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">WITNESS KEY:</span>
                  <span className="text-slate-700 dark:text-slate-300 font-bold">FIPS140-3:9082</span>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Recent Ingested Images">
            <div className="space-y-2 font-mono text-xs">
              {[
                { name: 'DC01_PHYSICAL_RAM_IMAGE.raw', size: '64.0 GB', time: '10 mins ago', status: 'VERIFIED' },
                { name: 'BORDER_GATEWAY_TAP_INTERFACE.pcapng', size: '1.42 GB', time: '1 hr ago', status: 'VERIFIED' },
              ].map((img, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-[#303743] flex items-center justify-between"
                >
                  <div className="truncate mr-2">
                    <div className="font-semibold text-slate-800 dark:text-white truncate">{img.name}</div>
                    <div className="text-[10px] text-slate-400">{img.size} • {img.time}</div>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-[#142820] text-[#337D5C] dark:text-[#4D9B78] font-bold border border-[#337D5C]/30 shrink-0">
                    {img.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EvidenceAcquisitionView;
