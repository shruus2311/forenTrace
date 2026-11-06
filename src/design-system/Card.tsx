import React from 'react';

interface CardProps {
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
    default: 'bg-[#0E121B] border-white/10',
    surface: 'bg-[#121622] border-white/12',
    accent: 'bg-[#0B1320] border-[#00F2FE]/25 shadow-[0_0_20px_rgba(0,242,254,0.05)]',
    critical: 'bg-[#1A0D12] border-red-500/30',
  };

  return (
    <div
      className={`rounded-xl border transition-all ${variants[variant]} ${className}`}
    >
      {(title || headerAction) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            {icon && <span className="text-[#00F2FE] shrink-0">{icon}</span>}
            <div>
              {title && (
                <h3 className="font-sans font-semibold text-xs tracking-wider uppercase text-slate-200">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-[11px] font-mono text-slate-400 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
};
