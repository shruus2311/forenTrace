import React, { useEffect, useState } from 'react';
import { Search, ShieldAlert, Activity, User, Bell, Key, LogOut } from 'lucide-react';
import MusicStreamLine from '../MusicStreamLine';
import { ThemeToggle } from '../../design-system/ThemeToggle';
import { cyberAudio } from '../../lib/audio';

export interface TopBarProps {
  onOpenCommandMenu: () => void;
  activeCaseNumber: string;
  currentViewTitle?: string;
  onLogout?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenCommandMenu,
  activeCaseNumber,
  currentViewTitle = 'Command Center',
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
    <header className="h-16 bg-white/95 dark:bg-[#171B22]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#303743] px-4 md:px-6 flex items-center justify-between gap-4 z-20 select-none shadow-sm transition-colors duration-150">
      {/* Left: Active Investigation Badge & Search Trigger */}
      <div className="flex items-center gap-3.5 flex-1 max-w-xl">
        {/* Case & Triage Badge */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-[#1D232C] border border-slate-200 dark:border-[#303743] font-mono text-xs text-slate-700 dark:text-slate-300">
          <span className="w-2 h-2 rounded-full bg-[#B74D55] dark:bg-[#C66B70] animate-pulse" />
          <span className="text-[#416F9E] dark:text-[#648DBB] font-bold">{activeCaseNumber}</span>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span className="text-[#B74D55] dark:text-[#C66B70] font-semibold tracking-wider text-[11px]">
            SEV-1 TRIAGE
          </span>
        </div>

        {/* Global Command Search Box */}
        <button
          onClick={onOpenCommandMenu}
          className="flex-1 flex items-center justify-between px-3.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-300/80 dark:border-[#303743] hover:border-[#416F9E] dark:hover:border-[#648DBB] text-slate-500 dark:text-[#9AA4B2] hover:text-slate-800 dark:hover:text-slate-200 text-xs font-sans transition-colors cursor-pointer text-left shadow-sm"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Search className="w-3.5 h-3.5 text-[#416F9E] dark:text-[#648DBB] shrink-0" />
            <span className="truncate">Search workspaces, artifacts, hashes, MITRE...</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0 ml-2">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Center: ISO/IEC 27037 Compliance Classification Banner */}
      <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded bg-[#FDF0F1] dark:bg-[#2C181A] border border-[#B74D55]/25 dark:border-[#C66B70]/30 text-[#B74D55] dark:text-[#C66B70] font-mono text-[10px] tracking-widest uppercase">
        <ShieldAlert className="w-3.5 h-3.5 text-[#B74D55] dark:text-[#C66B70]" />
        <span>EVIDENTIARY CHAIN STRICT // ISO/IEC 27037</span>
      </div>

      {/* Right: Theme Toggle, Telemetry & User Controls */}
      <div className="flex items-center gap-3">
        {/* Professional Theme Switcher Toggle */}
        <ThemeToggle variant="segmented" />

        {/* UTC Clock */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-[#303743] font-mono text-xs text-[#416F9E] dark:text-[#648DBB]">
          <Activity className="w-3 h-3 text-[#337D5C] dark:text-[#4D9B78] animate-pulse" />
          <span>{utcTime}</span>
        </div>

        {/* Audio Synthesizer Toggle */}
        <MusicStreamLine />

        {/* Investigator Profile Credentials */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-[#303743]">
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#1D232C] border border-[#416F9E]/30 dark:border-[#648DBB]/40 flex items-center justify-center text-[#416F9E] dark:text-[#648DBB] shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden md:block text-left font-mono">
            <div className="text-xs text-slate-800 dark:text-[#E7EAF0] font-medium flex items-center gap-1.5">
              <span>V. Raghunath</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#337D5C] dark:bg-[#4D9B78]" />
            </div>
            <div className="text-[10px] text-slate-500 dark:text-[#9AA4B2]">DFIR_LEAD // ID_9082</div>
          </div>
          {onLogout && (
            <button
              onClick={() => {
                cyberAudio.playClick(440, 0.05);
                onLogout();
              }}
              title="Lock Workstation"
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
