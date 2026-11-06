import { ShieldCheck, Terminal, Cpu, HardDrive } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="relative z-20 border-t border-white/10 bg-[#020408]/90 backdrop-blur-xl py-12 px-6 md:px-12 font-mono text-xs text-slate-400">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 text-white font-display font-bold text-lg">
            <span>FORENTRACE</span>
            <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-mono text-[10px]">
              EVIDENCE VERIFIED
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-1 font-sans">
            Autonomous Digital Forensics, Neural Memory Reconstruction & Cyber Investigation Platform.
          </p>
        </div>

        {/* Telemetry Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/50 border border-white/5">
            <Cpu className="w-3.5 h-3.5 text-[#00F2FE]" />
            <div>
              <div className="text-white/40 text-[9px]">ENGINE LATENCY</div>
              <div className="text-[#00F2FE]">3.8ms // 120 FPS</div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/50 border border-white/5">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <div>
              <div className="text-white/40 text-[9px]">DUMP INTEGRITY</div>
              <div className="text-emerald-400">SHA-256 ZERO LOSS</div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/50 border border-white/5 col-span-2 sm:col-span-1">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />
            <div>
              <div className="text-white/40 text-[9px]">ISO/IEC 27037</div>
              <div className="text-white">COMPLIANT</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-slate-500">
        <div className="flex items-center gap-2">
          <Terminal className="w-3 h-3 text-[#00F2FE]" />
          <span>SESSION HASH: 9fa1c744e8d352bc19468e4c029df40a6b57912e // ENCRYPTED</span>
        </div>
        <div>
          © 2026 ForenTrace Lab. All Forensic Artifacts Sealed Under Chain of Custody.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
