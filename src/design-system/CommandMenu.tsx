import React, { useState, useEffect } from 'react';
import { Search, FolderGit2, HardDrive, Binary, ShieldCheck, Terminal, X, ArrowRight } from 'lucide-react';
import { CASES, EVIDENCE_ITEMS } from '../data/mockForensicsData';
import { cyberAudio } from '../lib/audio';

interface CommandMenuProps {
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
        else {
          cyberAudio.playClick(920, 0.04);
          // open triggered from parent
        }
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-[#0B0F17] border border-white/15 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/10 gap-3">
          <Search className="w-4 h-4 text-[#00F2FE]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, artifact name, hash, or case number..."
            className="flex-1 bg-transparent border-none outline-none text-slate-100 placeholder:text-slate-500 font-sans text-sm"
            autoFocus
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-slate-400">
            ESC
          </kbd>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
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
                { id: 'dashboard', label: 'Intelligence Command Center', icon: Terminal },
                { id: 'evidence', label: 'Evidence Repository & Artifact Details', icon: HardDrive },
                { id: 'provenance', label: 'Evidence Lineage & Provenance Graph', icon: FolderGit2 },
                { id: 'hex', label: 'Memory & Packet Hex Analyzer', icon: Binary },
                { id: 'custody', label: 'Chain of Custody & Legal Ledger', icon: ShieldCheck },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-[#00F2FE]" />
                      <span>{item.label}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cases */}
          {filteredCases.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-mono uppercase text-slate-500 tracking-wider">
                ACTIVE CASES ({filteredCases.length})
              </div>
              <div className="space-y-1 mt-1">
                {filteredCases.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectCase(c.id);
                      onNavigate('dashboard');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white transition-colors cursor-pointer text-left"
                  >
                    <div>
                      <div className="font-mono text-[11px] text-[#00F2FE]">{c.caseNumber}</div>
                      <div className="font-medium text-xs text-white truncate max-w-md">{c.title}</div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{c.clientOrganization}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Evidence Artifacts */}
          {filteredEvidence.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-mono uppercase text-slate-500 tracking-wider">
                EVIDENCE ARTIFACTS ({filteredEvidence.length})
              </div>
              <div className="space-y-1 mt-1">
                {filteredEvidence.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => {
                      onSelectEvidence?.(e.id);
                      onNavigate('evidence');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white transition-colors cursor-pointer text-left"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-cyan-300 font-semibold">{e.name}</span>
                        <span className="text-[9px] px-1 rounded bg-black/60 border border-white/10 text-slate-400 font-mono">
                          {e.type}
                        </span>
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 truncate max-w-lg mt-0.5">
                        SHA256: {e.hashes.sha256}
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 shrink-0">{e.fileSize}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
