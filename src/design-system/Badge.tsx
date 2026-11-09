import React from 'react';
import { VerificationStatus, ThreatSeverity } from '../types/forensics';
import { ShieldCheck, AlertOctagon, Clock, HelpCircle, AlertTriangle } from 'lucide-react';

export interface IntegrityBadgeProps {
  status: VerificationStatus;
  size?: 'sm' | 'md';
}

export const IntegrityBadge: React.FC<IntegrityBadgeProps> = ({ status, size = 'md' }) => {
  const configs = {
    VERIFIED: {
      label: 'VERIFIED',
      icon: ShieldCheck,
      classes: 'bg-[#081F17] text-emerald-300 border-emerald-500/30',
      dotColor: 'bg-emerald-400',
    },
    FAILED_VERIFICATION: {
      label: 'FAILED VERIFICATION',
      icon: AlertOctagon,
      classes: 'bg-[#290E14] text-rose-300 border-rose-500/30',
      dotColor: 'bg-rose-500 animate-pulse',
    },
    PENDING_ANALYSIS: {
      label: 'PENDING ANALYSIS',
      icon: Clock,
      classes: 'bg-[#261808] text-amber-300 border-amber-500/30',
      dotColor: 'bg-amber-400 animate-pulse',
    },
    NOT_YET_VERIFIED: {
      label: 'NOT YET VERIFIED',
      icon: HelpCircle,
      classes: 'bg-[#121622] text-slate-400 border-slate-700/40',
      dotColor: 'bg-slate-500',
    },
  };

  const config = configs[status] || configs.NOT_YET_VERIFIED;
  const Icon = config.icon;

  const sizeClasses = size === 'sm' ? 'text-[9px] px-2 py-0.5' : 'text-[10px] px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-medium rounded-md border ${config.classes} ${sizeClasses} tracking-wider uppercase select-none`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
      <Icon className="w-3 h-3 shrink-0" />
      <span>{config.label}</span>
    </span>
  );
};

export interface SeverityBadgeProps {
  severity: ThreatSeverity;
  size?: 'sm' | 'md';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, size = 'md' }) => {
  const configs = {
    CRITICAL: {
      classes: 'bg-[#2B0E14] text-rose-300 border-rose-500/30',
      dot: 'bg-rose-500 animate-pulse',
    },
    HIGH: {
      classes: 'bg-[#2B1808] text-amber-300 border-amber-500/30',
      dot: 'bg-amber-400',
    },
    MEDIUM: {
      classes: 'bg-[#25220C] text-yellow-300 border-yellow-500/30',
      dot: 'bg-yellow-400',
    },
    LOW: {
      classes: 'bg-[#0E1B2B] text-sky-300 border-sky-500/30',
      dot: 'bg-sky-400',
    },
    INFORMATIONAL: {
      classes: 'bg-[#101524] text-slate-400 border-slate-700/40',
      dot: 'bg-slate-500',
    },
  };

  const config = configs[severity] || configs.INFORMATIONAL;
  const sizeClasses = size === 'sm' ? 'text-[9px] px-2 py-0.5' : 'text-[10px] px-2.5 py-0.5';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-semibold rounded-md border ${config.classes} ${sizeClasses} tracking-wider uppercase select-none`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {severity === 'CRITICAL' && <AlertTriangle className="w-2.5 h-2.5 shrink-0 text-rose-400" />}
      <span>{severity}</span>
    </span>
  );
};
