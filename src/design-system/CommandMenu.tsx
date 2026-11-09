import React, { useState, useEffect } from 'react';
import { Search, FolderGit2, HardDrive, Binary, ShieldCheck, Terminal, X, ArrowRight, CornerDownLeft } from 'lucide-react';
import { CASES, EVIDENCE_ITEMS } from '../data/mockForensicsData';
import { cyberAudio } from '../lib/audio';

export interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
  onSelectCase: (caseId: string) => void;
  onSelectEvidence?: (evidenceId: string) => void;
}

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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#090D16] border border-white/15 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/10 gap-3 bg-[#0C111C]">
          <Search className="w-4 h-4 text-[#00F2FE]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search forensic workspaces, artifacts, hashes, MITRE tactics..."
            className="flex-1 bg-transparent border-none outline-none text-slate-100 placeholder:text-slate-500 font-sans text-sm"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-500 hover:text-white p-1 rounded transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4 font-sans text-xs">
          {/* Quick Navigation Targets */}
          <div>
            <div className="px-2 py-1 text-[10px] font-mono uppercase text-slate-500 tracking-wider">
              SYSTEM WORKSPACES
            </div>
            <div className="space-y-1 mt-1">
              {[
                { id: 'dashboard', label: 'Intelligence Command Center', icon: Terminal, badge: 'OVERVIEW' },
                { id: 'evidence', label: 'Evidence Repository & Vault', icon: HardDrive, badge: '18 ARTIFACTS' },
                { id: 'provenance', label: 'Evidence Lineage & Provenance Graph', icon: FolderGit2, badge: 'ATTACK GRAPH' },
                { id: 'hex', label: 'Memory & Packet Hex Dissector', icon: Binary, badge: 'LOW-LEVEL' },
                { id: 'custody', label: 'Chain of Custody & Legal Ledger', icon: ShieldCheck, badge: 'ISO/IEC 27037' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      cyberAudio.playClick(880, 0.04);
                      onNavigate(item.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.06] text-slate-300 hover:text-white transition-colors cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-slate-400 group-hover:text-[#00F2FE] transition-colors" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                        {item.badge}
                      </span>
                      <CornerDownLeft className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Cases */}
          {filteredCases.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-mono uppercase text-slate-500 tracking-wider">
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
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.06] text-slate-300 hover:text-white transition-colors cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="font-mono text-[11px] text-[#00F2FE] font-bold shrink-0">
                        {c.caseNumber}
                      </span>
                      <span className="truncate font-medium">{c.title}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">
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
              <div className="px-2 py-1 text-[10px] font-mono uppercase text-slate-500 tracking-wider">
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
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.06] text-slate-300 hover:text-white transition-colors cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="font-mono text-[11px] text-[#00F2FE] font-bold shrink-0">
                        {e.id}
                      </span>
                      <span className="truncate">{e.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[10px] font-mono text-slate-400">{e.fileSize}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
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
        <div className="px-4 py-2 bg-[#060910] border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-2">
            <span>FORENTRACE COMMAND RUNNER</span>
            <span>•</span>
            <span className="text-slate-400">Ctrl + K to open anywhere</span>
          </div>
          <div className="flex items-center gap-1">
            <span>PRESS</span>
            <kbd className="px-1 py-0.2 bg-white/5 rounded border border-white/10 text-[9px] text-slate-400">
              ESC
            </kbd>
            <span>TO CLOSE</span>
          </div>
        </div>
      </div>
    </div>
  );
};
