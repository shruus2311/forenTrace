import React from 'react';
import {
  Terminal,
  HardDrive,
  FolderGit2,
  Binary,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Radio,
  Cpu,
  Lock,
  ChevronDown,
} from 'lucide-react';
import { cyberAudio } from '../../lib/audio';
import { CASES } from '../../data/mockForensicsData';

export interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeCaseId: string;
  onSelectCase: (caseId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  collapsed,
  onToggleCollapse,
  activeCaseId,
  onSelectCase,
}) => {
  const currentCase = CASES.find((c) => c.id === activeCaseId) || CASES[0];

  const navItems = [
    { id: 'dashboard', label: 'Command Center', icon: Terminal, badge: 'LIVE' },
    { id: 'evidence', label: 'Evidence Vault', icon: HardDrive, badge: '18' },
    { id: 'provenance', label: 'Provenance Graph', icon: FolderGit2, badge: 'ATTACK' },
    { id: 'hex', label: 'Hex Dissector', icon: Binary, badge: 'VAD' },
    { id: 'custody', label: 'Chain of Custody', icon: ShieldCheck, badge: 'ISO' },
  ];

  const handleNav = (id: string) => {
    cyberAudio.playClick(id === currentView ? 500 : 880, 0.04);
    onNavigate(id);
  };

  return (
    <aside
      className={`relative z-30 flex flex-col justify-between bg-[#080C15] border-r border-white/[0.08] transition-all duration-300 select-none ${
        collapsed ? 'w-16' : 'w-64'
      } shrink-0`}
    >
      {/* Top Branding & Case Selector */}
      <div>
        <div className="h-16 flex items-center px-4 border-b border-white/[0.08] justify-between bg-[#0A0F1A]">
          {!collapsed ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_12px_rgba(0,242,254,0.2)] shrink-0">
                <Radio className="w-4 h-4 text-[#00F2FE]" />
              </div>
              <div className="truncate">
                <div className="font-display font-extrabold text-sm text-white tracking-wider">
                  FOREN<span className="text-[#00F2FE]">TRACE</span>
                </div>
                <div className="font-mono text-[9px] text-[#00F2FE]/70 tracking-widest uppercase">
                  ENTERPRISE DFIR
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-400/40 flex items-center justify-center">
              <Radio className="w-4 h-4 text-[#00F2FE]" />
            </div>
          )}

          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer hidden md:flex items-center justify-center"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Active Investigation Case Switcher */}
        {!collapsed && (
          <div className="p-3 border-b border-white/[0.06] bg-[#0A0F1A]/60">
            <div className="text-[9px] font-mono uppercase text-slate-500 tracking-wider mb-1.5 flex justify-between items-center">
              <span>ACTIVE CASE CONTEXT</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE
              </span>
            </div>
            <div className="relative">
              <select
                value={activeCaseId}
                onChange={(e) => {
                  onSelectCase(e.target.value);
                  cyberAudio.playScan(700);
                }}
                className="w-full p-2 pr-7 rounded-lg bg-[#060910] border border-white/10 text-slate-200 font-mono text-[11px] outline-none hover:border-cyan-400/40 focus:border-cyan-400 transition-colors cursor-pointer appearance-none"
              >
                {CASES.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#0A0E18] text-slate-200">
                    {c.caseNumber} - {c.title.substring(0, 22)}...
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-slate-400 px-0.5">
              <span className="truncate max-w-[130px]">{currentCase.clientOrganization}</span>
              <span className="text-rose-400 font-semibold">{currentCase.threatLevel}</span>
            </div>
          </div>
        )}

        {/* Primary Navigation Items */}
        <nav className="p-2 space-y-1 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-sans transition-all duration-150 cursor-pointer text-left relative ${
                  isActive
                    ? 'bg-[#101726] text-[#00F2FE] border border-cyan-400/30 font-medium shadow-[0_0_15px_rgba(0,242,254,0.06)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                }`}
                title={collapsed ? item.label : undefined}
              >
                {isActive && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#00F2FE] rounded-r" />
                )}
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-[#00F2FE]' : 'text-slate-400 group-hover:text-white'
                  }`}
                />
                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between overflow-hidden">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                          isActive
                            ? 'bg-cyan-950/80 text-[#00F2FE] border-cyan-400/30 font-semibold'
                            : 'bg-black/40 text-slate-500 border-white/5'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Telemetry & Security Controls */}
      <div className="p-3 border-t border-white/[0.08] bg-[#070A12] space-y-2">
        {!collapsed ? (
          <>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3 h-3 text-emerald-400" />
                KERNEL TELEMETRY
              </span>
              <span className="text-emerald-400 font-semibold">ONLINE // 120 FPS</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-[#00F2FE]" />
                HSM ENCLAVE
              </span>
              <span className="text-slate-300 font-medium">FIPS 140-3 VALID</span>
            </div>
          </>
        ) : (
          <div className="flex justify-center text-emerald-400 py-1" title="Kernel Telemetry Online // FIPS 140-3">
            <Cpu className="w-4 h-4" />
          </div>
        )}
      </div>
    </aside>
  );
};
