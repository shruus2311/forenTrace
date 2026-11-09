import React, { useState } from 'react';
import {
  Briefcase,
  Search,
  Filter,
  Plus,
  ArrowRight,
  ShieldAlert,
  Clock,
  HardDrive,
  Users,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { SeverityBadge } from '../design-system/Badge';
import { CASES } from '../data/mockForensicsData';
import { InvestigationCase } from '../types/forensics';
import { cyberAudio } from '../lib/audio';
import { useToast } from '../design-system/Toast';

export interface CaseManagementViewProps {
  activeCaseId: string;
  onSelectCase: (caseId: string) => void;
  onNavigate: (view: string) => void;
}

export const CaseManagementView: React.FC<CaseManagementViewProps> = ({
  activeCaseId,
  onSelectCase,
  onNavigate,
}) => {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredCases = CASES.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.clientOrganization.toLowerCase().includes(search.toLowerCase()) ||
      c.leadInvestigator.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenCase = (c: InvestigationCase) => {
    cyberAudio.playScan(700);
    onSelectCase(c.id);
    showToast({
      type: 'info',
      title: `Case Context Switched: ${c.caseNumber}`,
      description: `Loaded investigation workspace for ${c.clientOrganization}`,
    });
    onNavigate('dashboard');
  };

  const handleCreateCase = () => {
    cyberAudio.playClick(900, 0.05);
    showToast({
      type: 'info',
      title: 'New Case Intake Initialized',
      description: 'Opening ISO/IEC 27037 compliant incident intake protocol...',
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#303743]">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-[#E7EAF0] tracking-wide flex items-center gap-2.5">
            <Briefcase className="w-5 h-5 text-[#416F9E] dark:text-[#648DBB]" />
            <span>CASE MANAGEMENT & INVESTIGATION REGISTRY</span>
          </h1>
          <p className="text-xs font-mono text-slate-500 dark:text-[#9AA4B2] mt-1">
            Centralized register of DFIR incidents, evidentiary holds, and judicial proceedings.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleCreateCase}
          icon={<Plus className="w-4 h-4" />}
        >
          Initialize Case Intake
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by case number, incident name, client, or lead investigator..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-[#1D232C] border border-slate-300 dark:border-[#303743] text-slate-900 dark:text-[#E7EAF0] font-mono text-xs focus:border-[#416F9E] dark:focus:border-[#648DBB] outline-none transition-colors shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 font-mono text-xs">
          {[
            { id: 'ALL', label: 'ALL CASES' },
            { id: 'ACTIVE_TRIAGE', label: 'ACTIVE TRIAGE' },
            { id: 'ANALYSIS_IN_PROGRESS', label: 'IN PROGRESS' },
            { id: 'EVIDENTIARY_SEALED', label: 'SEALED' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => {
                setStatusFilter(st.id);
                cyberAudio.playClick(800, 0.03);
              }}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === st.id
                  ? 'bg-[#EBF2F9] dark:bg-[#1D232C] text-[#416F9E] dark:text-[#648DBB] font-bold border border-[#416F9E]/40 dark:border-[#648DBB]/40 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#303743]'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cases List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCases.map((c) => {
          const isActive = c.id === activeCaseId;

          return (
            <Card
              key={c.id}
              className={`transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'border-[#416F9E] dark:border-[#648DBB] ring-1 ring-[#416F9E]/50 dark:ring-[#648DBB]/50'
                  : ''
              }`}
            >
              <div className="space-y-3 font-mono">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#303743]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#416F9E] dark:text-[#648DBB]">
                      {c.caseNumber}
                    </span>
                    {isActive && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-[#142820] text-[#337D5C] dark:text-[#4D9B78] font-bold border border-[#337D5C]/30">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <SeverityBadge severity={c.threatLevel} size="sm" />
                </div>

                <div>
                  <h3 className="font-sans font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                    {c.title}
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-[#9AA4B2] mt-0.5 font-sans">
                    Client: <strong className="text-slate-700 dark:text-slate-200">{c.clientOrganization}</strong>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 font-sans line-clamp-2 leading-relaxed">
                  {c.summary}
                </p>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100 dark:border-[#303743]">
                  <div>
                    <span className="text-slate-400 text-[10px] block">EVIDENCE:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold">{c.evidenceCount} Artifacts</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">LEAD INVESTIGATOR:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium truncate block">{c.leadInvestigator}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    variant={isActive ? 'primary' : 'secondary'}
                    size="sm"
                    className="w-full"
                    onClick={() => handleOpenCase(c)}
                    icon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    {isActive ? 'Continue Investigation' : 'Switch to This Case'}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CaseManagementView;
