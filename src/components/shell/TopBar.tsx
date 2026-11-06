import React, { useEffect, useState } from 'react';
import { Search, ShieldAlert, Activity, User, Bell, Key, LogOut } from 'lucide-react';
import MusicStreamLine from '../MusicStreamLine';
import { cyberAudio } from '../../lib/audio';

interface TopBarProps {
  onOpenCommandMenu: () => void;
  activeCaseNumber: string;
  onLogout?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenCommandMenu,
  activeCaseNumber,
  onLogout,
}) => {
  const [utcTime, setUtcTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toISOString().substring(11, 19) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-[#0B0F17]/95 backdrop-blur-md border-b border-white/10 px-4 md:px-6 flex items-center justify-between gap-4 z-20 select-none">
      {/* Left: Active Investigation Badge & Search Trigger */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-[#121622] border border-white/10 font-mono text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span className="text-[#00F2FE] font-bold">{activeCaseNumber}</span>
          <span className="text-slate-500">|</span>
          <span className="text-red-400 font-semibold">SEV-1 TRIAGE</span>
        </div>

        {/* Global Command Search Box */}
        <button
          onClick={onOpenCommandMenu}
          className="flex-1 flex items-center justify-between px-3.5 py-1.5 rounded-lg bg-[#07090E] border border-white/10 hover:border-[#00F2FE]/40 text-slate-400 hover:text-slate-200 text-xs font-sans transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-[#00F2FE]" />
            <span className="truncate">Search artifacts, hashes, MITRE tactics...</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-slate-400">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Center: Classification Banner */}
      <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded bg-red-950/30 border border-red-500/20 text-red-300 font-mono text-[10px] tracking-widest uppercase">
        <ShieldAlert className="w-3 h-3 text-red-400" />
        <span>RESTRICTED // EVIDENTIARY CHAIN STRICT // NOFORN</span>
      </div>

      {/* Right: Telemetry & User Controls */}
      <div className="flex items-center gap-3">
        {/* UTC Clock */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/40 border border-white/5 font-mono text-xs text-cyan-300">
          <Activity className="w-3 h-3 text-emerald-400" />
          <span>{utcTime}</span>
        </div>

        {/* Audio Synthesizer Toggle */}
        <MusicStreamLine />

        {/* Investigator Credentials */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-white/10">
          <div className="w-8 h-8 rounded-full bg-[#121622] border border-[#00F2FE]/30 flex items-center justify-center text-[#00F2FE] shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden md:block text-left font-mono">
            <div className="text-xs text-white font-medium flex items-center gap-1">
              <span>V. Raghunath</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            <div className="text-[10px] text-slate-500">DFIR_LEAD // ID_9082</div>
          </div>
          {onLogout && (
            <button
              onClick={() => {
                cyberAudio.playClick(440, 0.05);
                onLogout();
              }}
              title="Lock Workstation"
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
