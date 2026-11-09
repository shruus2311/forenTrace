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
      classes:
        'bg-[#EAF5F0] text-[#337D5C] border-[#337D5C]/30 dark:bg-[#142820] dark:text-[#4D9B78] dark:border-[#4D9B78]/40',
      dotColor: 'bg-[#337D5C] dark:bg-[#4D9B78]',
    },
    FAILED_VERIFICATION: {
      label: 'FAILED VERIFICATION',
      icon: AlertOctagon,
      classes:
        'bg-[#FDF0F1] text-[#B74D55] border-[#B74D55]/30 dark:bg-[#2C181A] dark:text-[#C66B70] dark:border-[#C66B70]/40',
      dotColor: 'bg-[#B74D55] dark:bg-[#C66B70] animate-pulse',
    },
    PENDING_ANALYSIS: {
      label: 'PENDING ANALYSIS',
      icon: Clock,
      classes:
        'bg-[#FDF6EB] text-[#A9772D] border-[#A9772D]/30 dark:bg-[#2B2113] dark:text-[#C69A54] dark:border-[#C69A54]/40',
      dotColor: 'bg-[#A9772D] dark:bg-[#C69A54] animate-pulse',
    },
    NOT_YET_VERIFIED: {
      label: 'NOT YET VERIFIED',
      icon: HelpCircle,
      classes:
        'bg-slate-100 text-slate-600 border-slate-300 dark:bg-[#1D232C] dark:text-slate-400 dark:border-slate-700/50',
      dotColor: 'bg-slate-400 dark:bg-slate-500',
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
      classes:
        'bg-[#FDF0F1] text-[#B74D55] border-[#B74D55]/30 dark:bg-[#2C181A] dark:text-[#C66B70] dark:border-[#C66B70]/40',
      dot: 'bg-[#B74D55] dark:bg-[#C66B70] animate-pulse',
    },
    HIGH: {
      classes:
        'bg-[#FDF6EB] text-[#A9772D] border-[#A9772D]/30 dark:bg-[#2B2113] dark:text-[#C69A54] dark:border-[#C69A54]/40',
      dot: 'bg-[#A9772D] dark:bg-[#C69A54]',
    },
    MEDIUM: {
      classes:
        'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-600/30',
      dot: 'bg-amber-500',
    },
    LOW: {
      classes:
        'bg-[#EBF2F9] text-[#416F9E] border-[#416F9E]/30 dark:bg-[#1A2838] dark:text-[#648DBB] dark:border-[#648DBB]/40',
      dot: 'bg-[#416F9E] dark:bg-[#648DBB]',
    },
    INFORMATIONAL: {
      classes:
        'bg-slate-100 text-slate-600 border-slate-300 dark:bg-[#171B22] dark:text-slate-400 dark:border-slate-700/40',
      dot: 'bg-slate-400 dark:bg-slate-500',
    },
  };

  const config = configs[severity] || configs.INFORMATIONAL;
  const sizeClasses = size === 'sm' ? 'text-[9px] px-2 py-0.5' : 'text-[10px] px-2.5 py-0.5';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-semibold rounded-md border ${config.classes} ${sizeClasses} tracking-wider uppercase select-none`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {severity === 'CRITICAL' && (
        <AlertTriangle className="w-2.5 h-2.5 shrink-0 text-[#B74D55] dark:text-[#C66B70]" />
      )}
      <span>{severity}</span>
    </span>
  );
};

export default { IntegrityBadge, SeverityBadge };
