import { useEffect, useState } from "react";
import { Terminal, ShieldCheck, Cpu } from "lucide-react";

interface LoadingSkeletonProps {
  onComplete?: () => void;
}

const BOOT_LOGS = [
  "SYSTEM_BOOT: KERNEL_INITIALIZE [OK]",
  "MOUNTING FORENSIC DUMP TARGET: /dev/mem_0xFA",
  "ESTABLISHING NEURAL DECOMPILER GRAPH...",
  "RESOLVING EVOLUTIONARY CIPHER SUITES [SHA-256, ED25519]",
  "SYNCHRONIZING RECONSTRUCTED PACKET TOPOLOGY",
  "EVIDENCE INTEGRITY VERIFIED: ZERO DETECTED COLLISION",
  "FORENTRACE CONSOLE INITIALIZED. ENTER INVESTIGATION.",
];

export const LoadingSkeleton = ({ onComplete }: LoadingSkeletonProps) => {
  const [progress, setProgress] = useState(0);
  const [logIndex, setLogIndex] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => setFading(true), 300);
          setTimeout(() => onComplete && onComplete(), 900);
          return 100;
        }
        const jump = Math.floor(Math.random() * 8) + 4;
        const next = Math.min(prev + jump, 100);
        const nextLog = Math.floor((next / 100) * (BOOT_LOGS.length - 1));
        setLogIndex(nextLog);
        return next;
      });
    }, 70);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#020408] transition-opacity duration-700 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="relative w-full max-w-md p-8 glass-surface border border-cyan-500/20 rounded-xl overflow-hidden shadow-2xl">
        {/* Glow corner decorations */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#00F2FE]" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#00F2FE]" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#00F2FE]" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#00F2FE]" />

        {/* Header telemetry */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 font-mono text-xs text-[#00F2FE]/80">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 animate-spin text-[#00F2FE]" />
            <span>FORENTRACE // SECURE_INIT</span>
          </div>
          <span className="text-emerald-400">STATUS: BOOTING</span>
        </div>

        {/* Center Progress Ring / Percentage */}
        <div className="my-8 flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center">
            <div className="text-5xl font-mono font-bold tracking-tighter text-white">
              {progress}
              <span className="text-xl text-[#00F2FE] ml-1">%</span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-white/10 rounded-full mt-6 overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-[#00F2FE] via-emerald-400 to-[#00F2FE] transition-all duration-150 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Live Terminal Log readout */}
        <div className="bg-black/60 rounded p-3 font-mono text-[11px] text-slate-300 border border-white/5 min-h-[50px] flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-[#00F2FE] shrink-0" />
          <span className="truncate text-cyan-300/90">{BOOT_LOGS[logIndex]}</span>
        </div>

        <div className="mt-4 flex items-center justify-between text-[10px] font-mono text-white/40">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            SECURE RECONSTRUCTION ENGINE
          </span>
          <span>BUILD 2026.11 // ALPHA</span>
        </div>
      </div>
    </div>
  );
};

export default LoadingSkeleton;
