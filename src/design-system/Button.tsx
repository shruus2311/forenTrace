import React from 'react';
import { cyberAudio } from '../lib/audio';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'technical';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  soundType?: 'click' | 'scan' | 'none';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  soundType = 'click',
  className = '',
  onClick,
  disabled,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && soundType !== 'none') {
      if (soundType === 'scan') {
        cyberAudio.playScan(620);
      } else {
        cyberAudio.playClick(variant === 'primary' ? 950 : 800, 0.04);
      }
    }
    onClick?.(e);
  };

  const variants = {
    primary:
      'bg-[#00F2FE] hover:bg-[#38BDF8] text-[#06080E] font-semibold border border-cyan-300/40 shadow-[0_0_12px_rgba(0,242,254,0.2)] focus:ring-1 focus:ring-cyan-400',
    secondary:
      'bg-[#101625] hover:bg-[#151D2E] text-slate-200 border border-white/10 hover:border-white/20 focus:ring-1 focus:ring-white/20',
    outline:
      'bg-transparent hover:bg-white/[0.04] text-slate-300 border border-white/15 hover:border-white/30 focus:ring-1 focus:ring-white/20',
    ghost:
      'bg-transparent hover:bg-white/[0.06] text-slate-400 hover:text-white border border-transparent focus:ring-1 focus:ring-white/20',
    danger:
      'bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 focus:ring-1 focus:ring-red-500/40',
    technical:
      'bg-[#0A101C] hover:bg-[#0E1626] text-[#00F2FE] font-mono border border-cyan-500/30 hover:border-cyan-400/60 shadow-[0_0_10px_rgba(0,242,254,0.08)]',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5 rounded-md font-medium',
    md: 'text-xs px-3.5 py-2 gap-2 rounded-lg font-medium',
    lg: 'text-sm px-4.5 py-2.5 gap-2.5 rounded-lg font-medium',
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center tracking-wide transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:pointer-events-none select-none active:scale-[0.99] ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children && <span>{children}</span>}
    </button>
  );
};
