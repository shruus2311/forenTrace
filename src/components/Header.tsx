import { useEffect, useState } from "react";
import { ShieldAlert, Activity, Radio } from "lucide-react";
import MusicStreamLine from "./MusicStreamLine";
import { cyberAudio } from "@/lib/audio";

export const Header = () => {
  const [utcTime, setUtcTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toISOString().substring(11, 19) + " UTC");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const scrollTo = (id: string) => {
    cyberAudio.playClick(920, 0.05);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className="fixed top-0 inset-x-0 z-40 px-4 md:px-8 py-4 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between p-3 px-5 rounded-2xl glass-surface border border-white/10 shadow-2xl">
        {/* Brand & Incident ID */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-lg bg-cyan-950/80 border border-[#00F2FE]/40 flex items-center justify-center shadow-[0_0_15px_rgba(0,242,254,0.3)]">
              <Radio className="w-4 h-4 text-[#00F2FE] animate-pulse" />
            </div>
            <div>
              <div className="font-display font-bold tracking-wider text-white text-base flex items-center gap-1.5">
                FOREN<span className="text-[#00F2FE]">TRACE</span>
              </div>
              <div className="font-mono text-[9px] text-[#00F2FE]/70 tracking-widest uppercase">
                NEURAL DIGITAL FORENSICS
              </div>
            </div>
          </div>

          {/* Incident Badge */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md bg-red-950/40 border border-red-500/30 text-red-400 font-mono text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            <span>INCIDENT #FT-2026-X9 // SEV-1</span>
          </div>
        </div>

        {/* Navigation Anchors */}
        <nav className="hidden md:flex items-center gap-1 font-mono text-xs">
          <button
            onClick={() => scrollTo("hero")}
            className="px-3 py-1.5 text-slate-300 hover:text-[#00F2FE] hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            [01] 3D_CORE
          </button>
          <button
            onClick={() => scrollTo("timeline")}
            className="px-3 py-1.5 text-slate-300 hover:text-[#00F2FE] hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            [02] TIMELINE
          </button>
          <button
            onClick={() => scrollTo("hex-inspector")}
            className="px-3 py-1.5 text-slate-300 hover:text-[#00F2FE] hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            [03] HEX_SCANNER
          </button>
          <button
            onClick={() => scrollTo("chain-of-custody")}
            className="px-3 py-1.5 text-slate-300 hover:text-[#00F2FE] hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            [04] CUSTODY_LEDGER
          </button>
        </nav>

        {/* Telemetry & Audio Equalizer */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 border border-white/5 font-mono text-[11px] text-cyan-300">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>{utcTime}</span>
          </div>

          <MusicStreamLine />
        </div>
      </div>
    </header>
  );
};

export default Header;
