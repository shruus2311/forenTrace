import React, { useEffect, useState } from 'react';
import { Search, ShieldAlert, Activity, User, Bell, Key, LogOut } from 'lucide-react';
import MusicStreamLine from '../MusicStreamLine';
import { cyberAudio } from '../../lib/audio';

export interface TopBarProps {
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
    <header className="h-16 bg-[#080C15]/95 backdrop-blur-md border-b border-white/[0.08] px-4 md:px-6 flex items-center justify-between gap-4 z-20 select-none">
      {/* Left: Active Investigation Badge & Search Trigger */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#101625] border border-white/10 font-mono text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-[#00F2FE] font-bold">{activeCaseNumber}</span>
          <span className="text-slate-600">|</span>
          <span className="text-rose-400 font-semibold tracking-wider">SEV-1 TRIAGE</span>
        </div>

        {/* Global Command Search Box */}
        <button
          onClick={onOpenCommandMenu}
          className="flex-1 flex items-center justify-between px-3.5 py-1.5 rounded-lg bg-[#060910] border border-white/10 hover:border-cyan-400/40 text-slate-400 hover:text-slate-200 text-xs font-sans transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Search className="w-3.5 h-3.5 text-[#00F2FE] shrink-0" />
            <span className="truncate">Search artifacts, hashes, MITRE tactics...</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 text-[10px] font-mono text-slate-400 shrink-0 ml-2">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Center: Classification Banner */}
      <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded bg-[#2B0E14] border border-rose-500/25 text-rose-300 font-mono text-[10px] tracking-widest uppercase">
        <ShieldAlert className="w-3 h-3 text-rose-400" />
        <span>RESTRICTED // EVIDENTIARY CHAIN STRICT // ISO 27037</span>
      </div>

      {/* Right: Telemetry & User Controls */}
      <div className="flex items-center gap-3">
        {/* UTC Clock */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#060910] border border-white/[0.08] font-mono text-xs text-cyan-300">
          <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span>{utcTime}</span>
        </div>

        {/* Audio Synthesizer Toggle */}
        <MusicStreamLine />

        {/* Investigator Credentials */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-white/[0.08]">
          <div className="w-8 h-8 rounded-full bg-[#101726] border border-cyan-400/30 flex items-center justify-center text-[#00F2FE] shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden md:block text-left font-mono">
            <div className="text-xs text-white font-medium flex items-center gap-1.5">
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
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
