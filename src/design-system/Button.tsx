import React from 'react';
import { cyberAudio } from '../lib/audio';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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
      'bg-[#00F2FE] hover:bg-[#38BDF8] text-[#07090E] font-semibold border border-transparent shadow-[0_0_15px_rgba(0,242,254,0.25)] focus:ring-2 focus:ring-[#00F2FE]/50',
    secondary:
      'bg-[#121622] hover:bg-[#181F30] text-slate-200 border border-white/10 hover:border-white/20 focus:ring-2 focus:ring-white/20',
    outline:
      'bg-transparent hover:bg-white/5 text-slate-300 border border-white/15 hover:border-white/30 focus:ring-2 focus:ring-white/20',
    ghost:
      'bg-transparent hover:bg-white/5 text-slate-400 hover:text-white border border-transparent focus:ring-1 focus:ring-white/20',
    danger:
      'bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/40 focus:ring-2 focus:ring-red-500/40',
    technical:
      'bg-[#0B0E17] hover:bg-[#121622] text-[#00F2FE] font-mono border border-[#00F2FE]/30 hover:border-[#00F2FE]/60 shadow-[0_0_10px_rgba(0,242,254,0.1)]',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5 rounded-md',
    md: 'text-xs px-3.5 py-2 gap-2 rounded-lg',
    lg: 'text-sm px-5 py-2.5 gap-2.5 rounded-lg',
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-sans tracking-wide transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none select-none active:scale-[0.98] ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
