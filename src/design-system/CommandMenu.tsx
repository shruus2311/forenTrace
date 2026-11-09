import React, { useState, useEffect } from 'react';
import {
  Search,
  FolderGit2,
  HardDrive,
  Binary,
  ShieldCheck,
  Terminal,
  X,
  ArrowRight,
  CornerDownLeft,
  Briefcase,
  Layers,
  FileCheck2,
  Cpu,
  Radio,
  FileSearch,
  History,
  FileText,
  Activity,
  Users,
  Settings,
  ShieldAlert,
  DownloadCloud,
} from 'lucide-react';
import { CASES, EVIDENCE_ITEMS } from '../data/mockForensicsData';
import { cyberAudio } from '../lib/audio';

export interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
  onSelectCase: (caseId: string) => void;
  onSelectEvidence?: (evidenceId: string) => void;
}

export const WORKSPACE_MODULES = [
  { id: 'dashboard', label: 'Command Center', icon: Terminal, category: 'Operations', badge: 'OVERVIEW' },
  { id: 'cases', label: 'Case Management', icon: Briefcase, category: 'Operations', badge: 'ACTIVE' },
  { id: 'workspace', label: 'Investigation Workspace', icon: FolderGit2, category: 'Operations', badge: 'TRIAGE' },
  { id: 'evidence', label: 'Evidence Vault', icon: HardDrive, category: 'Evidence', badge: '18 ARTIFACTS' },
  { id: 'acquisition', label: 'Evidence Acquisition', icon: DownloadCloud, category: 'Evidence', badge: 'WRITE-BLOCK' },
  { id: 'integrity', label: 'Evidence Integrity', icon: ShieldCheck, category: 'Evidence', badge: 'SHA-256' },
  { id: 'disk', label: 'Disk Forensics', icon: Layers, category: 'Deep Analysis', badge: 'NTFS/$MFT' },
  { id: 'memory', label: 'Memory Forensics', icon: Cpu, category: 'Deep Analysis', badge: 'VAD/RAM' },
  { id: 'network', label: 'Network Forensics & PCAP', icon: Radio, category: 'Deep Analysis', badge: 'PCAP/TLS' },
  { id: 'malware', label: 'Malware & Hex Dissector', icon: Binary, category: 'Deep Analysis', badge: 'YARA' },
  { id: 'artifacts', label: 'Artifact Analysis', icon: FileSearch, category: 'Deep Analysis', badge: 'PREFETCH' },
  { id: 'timeline', label: 'Timeline Analysis', icon: History, category: 'Deep Analysis', badge: 'MACB' },
  { id: 'threat-intel', label: 'AI & Threat Intelligence', icon: ShieldAlert, category: 'Intelligence', badge: 'MITRE' },
  { id: 'custody', label: 'Chain of Custody', icon: FileCheck2, category: 'Legal & Custodial', badge: 'ISO 27037' },
  { id: 'reports', label: 'Forensic Reports', icon: FileText, category: 'Legal & Custodial', badge: 'EXPORT' },
  { id: 'audit', label: 'Audit Trail', icon: Activity, category: 'Administration', badge: 'LOGS' },
  { id: 'users', label: 'User & Role Management', icon: Users, category: 'Administration', badge: 'RBAC' },
  { id: 'settings', label: 'System Settings', icon: Settings, category: 'Administration', badge: 'ENCLAVE' },
];

export const CommandMenu: React.FC<CommandMenuProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onSelectCase,
  onSelectEvidence,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredModules = WORKSPACE_MODULES.filter(
    (m) =>
      m.label.toLowerCase().includes(query.toLowerCase()) ||
      m.category.toLowerCase().includes(query.toLowerCase()) ||
      m.badge.toLowerCase().includes(query.toLowerCase())
  );

  const filteredCases = CASES.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.caseNumber.toLowerCase().includes(query.toLowerCase())
  );

  const filteredEvidence = EVIDENCE_ITEMS.filter(
    (e) =>
      e.name.toLowerCase().includes(query.toLowerCase()) ||
      e.id.toLowerCase().includes(query.toLowerCase()) ||
      e.hashes.sha256.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 px-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-[#171B22] border border-slate-300 dark:border-[#303743] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-[#303743] gap-3 bg-slate-50 dark:bg-[#1D232C]">
          <Search className="w-4 h-4 text-[#416F9E] dark:text-[#648DBB] shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search forensic workspaces, artifacts, hashes, MITRE tactics..."
            className="flex-1 bg-transparent border-none outline-none text-slate-800 dark:text-[#E7EAF0] placeholder:text-slate-400 dark:placeholder:text-slate-500 font-sans text-sm"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white dark:bg-white/[0.06] border border-slate-300 dark:border-white/10 text-[10px] font-mono text-slate-500 dark:text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4 font-sans text-xs">
          {/* Quick Navigation Targets */}
          <div>
            <div className="px-2 py-1 text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 font-semibold tracking-wider">
              FORENSIC WORKSPACES ({filteredModules.length})
            </div>
            <div className="space-y-1 mt-1">
              {filteredModules.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      cyberAudio.playClick(880, 0.04);
                      onNavigate(item.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#242B36] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className="w-4 h-4 text-slate-400 dark:text-slate-400 group-hover:text-[#416F9E] dark:group-hover:text-[#648DBB] transition-colors shrink-0" />
                      <span className="font-medium truncate">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#1D232C] border border-slate-200 dark:border-[#303743]">
                        {item.badge}
                      </span>
                      <CornerDownLeft className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Cases */}
          {filteredCases.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 font-semibold tracking-wider">
                INVESTIGATION CASES ({filteredCases.length})
              </div>
              <div className="space-y-1 mt-1">
                {filteredCases.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      cyberAudio.playScan(700);
                      onSelectCase(c.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#242B36] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="font-mono text-[11px] text-[#416F9E] dark:text-[#648DBB] font-bold shrink-0">
                        {c.caseNumber}
                      </span>
                      <span className="truncate font-medium">{c.title}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0 ml-2">
                      {c.threatLevel}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Forensic Evidence Items */}
          {filteredEvidence.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 font-semibold tracking-wider">
                ARTIFACT MATCHES ({filteredEvidence.length})
              </div>
              <div className="space-y-1 mt-1">
                {filteredEvidence.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => {
                      cyberAudio.playClick(920, 0.04);
                      onNavigate('evidence');
                      onSelectEvidence?.(e.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#242B36] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="font-mono text-[11px] text-[#416F9E] dark:text-[#648DBB] font-bold shrink-0">
                        {e.id}
                      </span>
                      <span className="truncate">{e.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{e.fileSize}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-[#142820] text-[#337D5C] dark:text-[#4D9B78] border border-[#337D5C]/30 dark:border-[#4D9B78]/40">
                        {e.integrityStatus}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-[#111318] border-t border-slate-200 dark:border-[#303743] flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-[#9AA4B2]">
          <div className="flex items-center gap-2">
            <span>FORENTRACE COMMAND RUNNER</span>
            <span>•</span>
            <span>Ctrl + K to open anywhere</span>
          </div>
          <div className="flex items-center gap-1">
            <span>PRESS</span>
            <kbd className="px-1 py-0.2 bg-white dark:bg-white/[0.06] rounded border border-slate-300 dark:border-white/10 text-[9px]">
              ESC
            </kbd>
            <span>TO CLOSE</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandMenu;
