import { useState } from "react";
import { View } from "@react-three/drei";
import ForensicEvidenceCore, { ForensicModule } from "@/components/3d/ForensicEvidenceCore";
import { cyberAudio } from "@/lib/audio";
import { ShieldCheck, HardDrive, Network, Binary, Sparkles, ArrowRight } from "lucide-react";

export const HeroSection = () => {
  const [activeModule, setActiveModule] = useState<ForensicModule>("MEM_CORE");

  const handleSelect = (mod: ForensicModule) => {
    setActiveModule(mod);
    cyberAudio.playClick(mod === "CRYPTO_VAULT" ? 620 : 880, 0.07);
  };

  return (
    <section id="hero" className="relative min-h-screen flex flex-col justify-between pt-28 pb-16 px-4 md:px-12 overflow-hidden">
      {/* 3D WebGL Viewport Container (mapped via @react-three/drei View) */}
      <div className="absolute inset-0 pointer-events-auto">
        <View className="w-full h-full">
          <ForensicEvidenceCore activeModule={activeModule} scale={1.15} />
        </View>
      </div>

      {/* Top Banner & Kinetic Sub-header */}
      <div className="relative z-20 max-w-4xl pointer-events-none select-none">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-[#00F2FE]/30 backdrop-blur-md mb-6">
          <Sparkles className="w-3.5 h-3.5 text-[#00F2FE]" />
          <span className="font-mono text-xs text-[#00F2FE] tracking-widest uppercase">
            NEXT-GEN FORENSIC INTELLIGENCE // AI DECOMPILER
          </span>
        </div>

        <h1 className="font-display font-extrabold text-4xl sm:text-6xl lg:text-7xl tracking-tight leading-[1.05] text-white">
          RECONSTRUCT <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F2FE] via-emerald-400 to-[#00F2FE]">
            CRIME-SCENE
          </span> <br />
          EVIDENCE IN 3D.
        </h1>

        <p className="mt-6 text-slate-300 text-sm sm:text-base max-w-xl font-sans leading-relaxed">
          Decompile kernel memory dumps, trace adversarial packet flows, and verify cryptographic chain-of-custody artifacts with volumetric WebGL precision.
        </p>

        {/* Action CTAs */}
        <div className="mt-8 flex flex-wrap items-center gap-4 pointer-events-auto">
          <button
            onClick={() => {
              cyberAudio.playScan(660);
              const el = document.getElementById("timeline");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#00F2FE] text-black font-mono font-semibold text-xs tracking-wider uppercase hover:bg-cyan-300 transition-all shadow-[0_0_25px_rgba(0,242,254,0.4)] cursor-pointer"
          >
            <span>DISSECT TIMELINE</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              cyberAudio.playClick(440, 0.05);
              const el = document.getElementById("hex-inspector");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="flex items-center gap-2 px-5 py-3.5 rounded-xl glass-surface border border-white/10 hover:border-[#00F2FE]/40 text-slate-200 font-mono text-xs tracking-wider uppercase transition-colors cursor-pointer"
          >
            <Binary className="w-4 h-4 text-[#00F2FE]" />
            <span>OPEN HEX SCANNER</span>
          </button>
        </div>
      </div>

      {/* Bottom Interactive Module Selector (Inspired by genius-adidas product switcher) */}
      <div className="relative z-20 flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pt-12 pointer-events-auto">
        {/* Module Switcher Buttons */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl glass-surface border border-white/10 backdrop-blur-2xl">
          <button
            onClick={() => handleSelect("MEM_CORE")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs tracking-wider transition-all cursor-pointer ${
              activeModule === "MEM_CORE"
                ? "bg-[#00F2FE] text-black font-semibold shadow-[0_0_15px_rgba(0,242,254,0.3)]"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>[01] MEM_CORE</span>
          </button>

          <button
            onClick={() => handleSelect("PACKET_STREAM")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs tracking-wider transition-all cursor-pointer ${
              activeModule === "PACKET_STREAM"
                ? "bg-[#10B981] text-black font-semibold shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>[02] PACKET_STREAM</span>
          </button>

          <button
            onClick={() => handleSelect("CRYPTO_VAULT")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs tracking-wider transition-all cursor-pointer ${
              activeModule === "CRYPTO_VAULT"
                ? "bg-[#FF2E54] text-white font-semibold shadow-[0_0_15px_rgba(255,46,84,0.4)]"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>[03] CRYPTO_VAULT</span>
          </button>
        </div>

        {/* Live Forensic Telemetry Card */}
        <div className="p-4 rounded-xl glass-surface border border-white/10 font-mono text-xs min-w-[280px]">
          <div className="text-[10px] text-white/40 pb-2 border-b border-white/5 flex justify-between">
            <span>ACTIVE INVESTIGATION TARGET</span>
            <span className="text-[#00F2FE]">LIVE POINTER DAMPED</span>
          </div>
          <div className="pt-2.5 space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">TARGET:</span>
              <span className="text-white font-bold">{activeModule}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">ARTIFACTS:</span>
              <span className="text-emerald-400">1,492 EXTRACTED</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">CONFIDENCE:</span>
              <span className="text-[#00F2FE]">99.98% VERIFIED</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
