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
  Briefcase,
  Layers,
  FileCheck2,
  FileSearch,
  History,
  FileText,
  Activity,
  Users,
  Settings,
  ShieldAlert,
  DownloadCloud,
} from 'lucide-react';
import { cyberAudio } from '../../lib/audio';
import { CASES } from '../../data/mockForensicsData';
import { BrandLogo } from '../brand/BrandLogo';

export interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeCaseId: string;
  onSelectCase: (caseId: string) => void;
}

interface NavSection {
  title: string;
  items: {
    id: string;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: string;
  }[];
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

  const sections: NavSection[] = [
    {
      title: 'OPERATIONS',
      items: [
        { id: 'dashboard', label: 'Command Center', icon: Terminal, badge: 'LIVE' },
        { id: 'cases', label: 'Case Management', icon: Briefcase, badge: 'ACTIVE' },
        { id: 'workspace', label: 'Investigation Workspace', icon: FolderGit2 },
      ],
    },
    {
      title: 'EVIDENCE & VAULT',
      items: [
        { id: 'evidence', label: 'Evidence Vault', icon: HardDrive, badge: '18' },
        { id: 'acquisition', label: 'Evidence Acquisition', icon: DownloadCloud },
        { id: 'integrity', label: 'Integrity Verification', icon: ShieldCheck, badge: 'SHA-256' },
      ],
    },
    {
      title: 'DEEP FORENSIC ANALYSIS',
      items: [
        { id: 'disk', label: 'Disk Forensics', icon: Layers },
        { id: 'memory', label: 'Memory Forensics', icon: Cpu },
        { id: 'network', label: 'Network & PCAP', icon: Radio },
        { id: 'malware', label: 'Malware & Hex Dissector', icon: Binary },
        { id: 'artifacts', label: 'Artifact Analysis', icon: FileSearch },
        { id: 'timeline', label: 'Timeline Analysis', icon: History },
      ],
    },
    {
      title: 'INTELLIGENCE & LEGAL',
      items: [
        { id: 'threat-intel', label: 'Threat Intelligence', icon: ShieldAlert, badge: 'MITRE' },
        { id: 'custody', label: 'Chain of Custody', icon: FileCheck2, badge: 'ISO' },
        { id: 'reports', label: 'Forensic Reports', icon: FileText },
      ],
    },
    {
      title: 'ADMINISTRATION',
      items: [
        { id: 'audit', label: 'Audit Trail', icon: Activity },
        { id: 'users', label: 'User & Roles', icon: Users },
        { id: 'settings', label: 'System Settings', icon: Settings },
      ],
    },
  ];

  const handleNav = (id: string) => {
    cyberAudio.playClick(id === currentView ? 500 : 880, 0.04);
    onNavigate(id);
  };

  return (
    <aside
      className={`relative z-30 flex flex-col justify-between bg-white dark:bg-[#171B22] border-r border-slate-200 dark:border-[#303743] transition-all duration-300 select-none ${
        collapsed ? 'w-16' : 'w-64'
      } shrink-0`}
    >
      {/* Top Branding & Case Selector */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-3.5 border-b border-slate-200 dark:border-[#303743] justify-between bg-slate-50/60 dark:bg-[#1D232C]/70">
          {!collapsed ? (
            <div className="flex items-center overflow-hidden">
              <BrandLogo variant="compact" size="sm" />
            </div>
          ) : (
            <div className="mx-auto">
              <BrandLogo variant="icon" size="sm" />
            </div>
          )}

          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer hidden md:flex items-center justify-center shrink-0"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Active Investigation Case Switcher */}
        {!collapsed && (
          <div className="p-3 border-b border-slate-200 dark:border-[#303743] bg-slate-50/40 dark:bg-[#111318]/40">
            <div className="text-[9px] font-mono uppercase text-slate-400 dark:text-slate-500 font-semibold tracking-wider mb-1 flex justify-between items-center">
              <span>ACTIVE CASE CONTEXT</span>
              <span className="text-[#337D5C] dark:text-[#4D9B78] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#337D5C] dark:bg-[#4D9B78] animate-pulse" />
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
                className="w-full p-2 pr-7 rounded-lg bg-white dark:bg-[#1D232C] border border-slate-300 dark:border-[#303743] text-slate-800 dark:text-[#E7EAF0] font-mono text-[11px] outline-none hover:border-[#416F9E] dark:hover:border-[#648DBB] focus:border-[#416F9E] dark:focus:border-[#648DBB] transition-colors cursor-pointer appearance-none shadow-sm"
              >
                {CASES.map((c) => (
                  <option key={c.id} value={c.id} className="bg-white dark:bg-[#1D232C] text-slate-800 dark:text-[#E7EAF0]">
                    {c.caseNumber} - {c.title.substring(0, 20)}...
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-[#9AA4B2] px-0.5">
              <span className="truncate max-w-[130px]">{currentCase.clientOrganization}</span>
              <span className="text-[#B74D55] dark:text-[#C66B70] font-semibold">{currentCase.threatLevel}</span>
            </div>
          </div>
        )}

        {/* Scrollable Navigation Groups */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {sections.map((sec, secIdx) => (
            <div key={secIdx}>
              {!collapsed && (
                <div className="px-3 py-1 text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">
                  {sec.title}
                </div>
              )}
              <div className="space-y-0.5 mt-0.5">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-sans transition-all duration-150 cursor-pointer text-left relative ${
                        isActive
                          ? 'bg-[#EBF2F9] dark:bg-[#1D232C] text-[#416F9E] dark:text-[#648DBB] font-semibold shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#242B36]'
                      }`}
                      title={collapsed ? item.label : undefined}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#416F9E] dark:bg-[#648DBB] rounded-r" />
                      )}
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-[#416F9E] dark:text-[#648DBB]'
                            : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                        }`}
                      />
                      {!collapsed && (
                        <div className="flex-1 flex items-center justify-between overflow-hidden">
                          <span className="truncate">{item.label}</span>
                          {item.badge && (
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                                isActive
                                  ? 'bg-[#416F9E]/15 text-[#416F9E] border-[#416F9E]/30 dark:bg-[#648DBB]/20 dark:text-[#648DBB] dark:border-[#648DBB]/30 font-semibold'
                                  : 'bg-slate-100 dark:bg-[#111318] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/5'
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
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Telemetry & Security Enclave Controls */}
      <div className="p-3 border-t border-slate-200 dark:border-[#303743] bg-slate-50/60 dark:bg-[#111318] space-y-2 shrink-0">
        {!collapsed ? (
          <>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-[#9AA4B2]">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3 h-3 text-[#337D5C] dark:text-[#4D9B78]" />
                KERNEL TELEMETRY
              </span>
              <span className="text-[#337D5C] dark:text-[#4D9B78] font-semibold">ONLINE // OK</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-[#9AA4B2]">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-[#416F9E] dark:text-[#648DBB]" />
                HSM ENCLAVE
              </span>
              <span className="text-slate-700 dark:text-[#E7EAF0] font-medium">FIPS 140-3 VALID</span>
            </div>
          </>
        ) : (
          <div
            className="flex justify-center text-[#337D5C] dark:text-[#4D9B78] py-1"
            title="Kernel Telemetry Online // FIPS 140-3 HSM Valid"
          >
            <Cpu className="w-4 h-4" />
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
