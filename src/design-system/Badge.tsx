import React from 'react';
import { VerificationStatus, ThreatSeverity } from '../types/forensics';
import { ShieldCheck, AlertOctagon, Clock, HelpCircle, AlertTriangle } from 'lucide-react';

interface IntegrityBadgeProps {
  status: VerificationStatus;
  size?: 'sm' | 'md';
}

export const IntegrityBadge: React.FC<IntegrityBadgeProps> = ({ status, size = 'md' }) => {
  const configs = {
    VERIFIED: {
      label: 'VERIFIED',
      icon: ShieldCheck,
      classes: 'bg-[#062E1E] text-emerald-400 border-[#10B981]/40',
      dotColor: 'bg-emerald-400',
    },
    FAILED_VERIFICATION: {
      label: 'FAILED VERIFICATION',
      icon: AlertOctagon,
      classes: 'bg-[#381014] text-red-400 border-red-500/40',
      dotColor: 'bg-red-400',
    },
    PENDING_ANALYSIS: {
      label: 'PENDING ANALYSIS',
      icon: Clock,
      classes: 'bg-[#38230B] text-amber-300 border-amber-500/40',
      dotColor: 'bg-amber-400',
    },
    NOT_YET_VERIFIED: {
      label: 'NOT YET VERIFIED',
      icon: HelpCircle,
      classes: 'bg-[#1E293B] text-slate-400 border-slate-600/40',
      dotColor: 'bg-slate-500',
    },
  };

  const config = configs[status] || configs.NOT_YET_VERIFIED;
  const Icon = config.icon;

  const sizeClasses = size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-medium rounded border ${config.classes} ${sizeClasses} tracking-wider uppercase select-none`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
      <Icon className="w-3 h-3 shrink-0" />
      <span>{config.label}</span>
    </span>
  );
};

interface SeverityBadgeProps {
  severity: ThreatSeverity;
  size?: 'sm' | 'md';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, size = 'md' }) => {
  const configs = {
    CRITICAL: 'bg-red-950/70 text-red-400 border-red-500/30',
    HIGH: 'bg-amber-950/70 text-amber-400 border-amber-500/30',
    MEDIUM: 'bg-yellow-950/50 text-yellow-300 border-yellow-500/30',
    LOW: 'bg-blue-950/60 text-blue-300 border-blue-500/30',
    INFORMATIONAL: 'bg-slate-900 text-slate-400 border-slate-700/40',
  };

  const sizeClasses = size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-semibold rounded border ${configs[severity]} ${sizeClasses} tracking-wider uppercase select-none`}
    >
      {severity === 'CRITICAL' && <AlertTriangle className="w-2.5 h-2.5" />}
      <span>{severity}</span>
    </span>
  );
};
