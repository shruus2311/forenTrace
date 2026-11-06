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
  ExternalLink,
} from 'lucide-react';
import { cyberAudio } from '../../lib/audio';
import { CASES } from '../../data/mockForensicsData';

interface SidebarProps {
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
    { id: 'evidence', label: 'Evidence Repository', icon: HardDrive, badge: '18' },
    { id: 'provenance', label: 'Provenance Graph', icon: FolderGit2 },
    { id: 'hex', label: 'Hex Analyzer', icon: Binary },
    { id: 'custody', label: 'Chain of Custody', icon: ShieldCheck, badge: 'LEGAL' },
  ];

  const handleNav = (id: string) => {
    cyberAudio.playClick(id === currentView ? 500 : 880, 0.04);
    onNavigate(id);
  };

  return (
    <aside
      className={`relative z-30 flex flex-col justify-between bg-[#0A0D15] border-r border-white/10 transition-all duration-300 select-none ${
        collapsed ? 'w-16' : 'w-64'
      } shrink-0`}
    >
      {/* Top Branding & Workstation Header */}
      <div>
        <div className="h-16 flex items-center px-4 border-b border-white/10 justify-between">
          {!collapsed ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-[#00F2FE]/40 flex items-center justify-center shadow-[0_0_15px_rgba(0,242,254,0.25)] shrink-0">
                <Radio className="w-4 h-4 text-[#00F2FE]" />
              </div>
              <div className="truncate">
                <div className="font-display font-bold text-sm text-white tracking-wider">
                  FOREN<span className="text-[#00F2FE]">TRACE</span>
                </div>
                <div className="font-mono text-[9px] text-[#00F2FE]/70 tracking-widest uppercase">
                  ENTERPRISE DFIR
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-8 h-8 rounded-lg bg-cyan-950/80 border border-[#00F2FE]/40 flex items-center justify-center">
              <Radio className="w-4 h-4 text-[#00F2FE]" />
            </div>
          )}

          <button
            onClick={onToggleCollapse}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer hidden md:block"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Active Investigation Case Switcher */}
        {!collapsed && (
          <div className="p-3 border-b border-white/5 bg-[#0D111A]">
            <div className="text-[9px] font-mono uppercase text-slate-500 tracking-wider mb-1.5 flex justify-between">
              <span>ACTIVE CASE CONTEXT</span>
              <span className="text-emerald-400 font-bold">ACTIVE</span>
            </div>
            <select
              value={activeCaseId}
              onChange={(e) => {
                onSelectCase(e.target.value);
                cyberAudio.playScan(700);
              }}
              className="w-full p-2 rounded-lg bg-[#07090E] border border-white/10 text-slate-200 font-mono text-[11px] outline-none hover:border-[#00F2FE]/40 transition-colors cursor-pointer"
            >
              {CASES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.caseNumber} - {c.title.substring(0, 24)}...
                </option>
              ))}
            </select>
            <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="truncate max-w-[140px]">{currentCase.clientOrganization}</span>
              <span className="text-red-400 font-bold">{currentCase.threatLevel}</span>
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-sans transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#121622] text-[#00F2FE] border border-[#00F2FE]/30 font-semibold shadow-[0_0_15px_rgba(0,242,254,0.08)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-[#00F2FE]' : 'text-slate-400'
                  }`}
                />
                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between overflow-hidden">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                          isActive
                            ? 'bg-[#00F2FE]/20 text-[#00F2FE] border-[#00F2FE]/30'
                            : 'bg-black/50 text-slate-500 border-white/5'
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

      {/* Bottom Telemetry & Workstation Session Controls */}
      <div className="p-3 border-t border-white/10 bg-[#07090E] space-y-2">
        {!collapsed ? (
          <>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3 h-3 text-emerald-400" />
                KERNEL TELEMETRY
              </span>
              <span className="text-emerald-400">120 FPS // OK</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-[#00F2FE]" />
                HSM ENCLAVE
              </span>
              <span className="text-slate-300">FIPS 140-3</span>
            </div>
          </>
        ) : (
          <div className="flex justify-center text-emerald-400" title="Kernel Telemetry Online">
            <Cpu className="w-4 h-4" />
          </div>
        )}
      </div>
    </aside>
  );
};
