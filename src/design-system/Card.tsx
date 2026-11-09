import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'surface' | 'accent' | 'critical';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  headerAction,
  title,
  subtitle,
  icon,
  variant = 'default',
}) => {
  const variants = {
    default:
      'bg-white dark:bg-[#1D232C] border-slate-200 dark:border-[#303743] hover:border-slate-300 dark:hover:border-[#404957] shadow-sm',
    surface:
      'bg-[#F8FAFC] dark:bg-[#171B22] border-slate-200 dark:border-[#303743] hover:border-slate-300 dark:hover:border-[#404957]',
    accent:
      'bg-[#F0F5FA] dark:bg-[#15202E] border-[#416F9E]/30 dark:border-[#648DBB]/35 shadow-sm',
    critical:
      'bg-[#FDF2F3] dark:bg-[#251518] border-[#B74D55]/30 dark:border-[#C66B70]/35 shadow-sm',
  };

  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${variants[variant]} ${className}`}
    >
      {(title || headerAction) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-[#303743]/60">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && <span className="text-[#416F9E] dark:text-[#648DBB] shrink-0">{icon}</span>}
            <div className="min-w-0 truncate">
              {title && (
                <h3 className="font-sans font-semibold text-xs tracking-wider uppercase text-slate-800 dark:text-[#E7EAF0] truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-[11px] font-mono text-slate-500 dark:text-[#9AA4B2] mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {headerAction && <div className="shrink-0 ml-3">{headerAction}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
};

export default Card;
