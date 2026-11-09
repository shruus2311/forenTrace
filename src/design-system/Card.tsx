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
    default: 'bg-[#0C111C] border-white/[0.08] hover:border-white/[0.14]',
    surface: 'bg-[#101625] border-white/[0.10] hover:border-white/[0.18]',
    accent: 'bg-[#0C1322] border-cyan-500/25 shadow-[0_0_24px_rgba(0,242,254,0.04)]',
    critical: 'bg-[#180B0F] border-red-500/25 shadow-[0_0_24px_rgba(239,68,68,0.04)]',
  };

  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${variants[variant]} ${className}`}
    >
      {(title || headerAction) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && <span className="text-[#00F2FE] shrink-0">{icon}</span>}
            <div className="min-w-0 truncate">
              {title && (
                <h3 className="font-sans font-semibold text-xs tracking-wider uppercase text-slate-200 truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">{subtitle}</p>
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
