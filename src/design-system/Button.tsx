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
      'bg-[#416F9E] hover:bg-[#335980] dark:bg-[#648DBB] dark:hover:bg-[#7DA4D1] text-white dark:text-[#111318] font-semibold border border-transparent shadow-sm focus:ring-1 focus:ring-[#416F9E]',
    secondary:
      'bg-white hover:bg-slate-50 dark:bg-[#1D232C] dark:hover:bg-[#242B36] text-slate-700 dark:text-[#E7EAF0] border border-slate-300 dark:border-[#303743] shadow-sm focus:ring-1 focus:ring-slate-400',
    outline:
      'bg-transparent hover:bg-slate-100 dark:hover:bg-white/[0.05] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#303743] focus:ring-1 focus:ring-slate-400',
    ghost:
      'bg-transparent hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent',
    danger:
      'bg-[#FDF0F1] hover:bg-[#FCE2E4] dark:bg-[#2C181A] dark:hover:bg-[#3D1E22] text-[#B74D55] dark:text-[#C66B70] border border-[#B74D55]/30 dark:border-[#C66B70]/40 focus:ring-1 focus:ring-[#B74D55]',
    technical:
      'bg-[#EBF2F9] hover:bg-[#DCE7F3] dark:bg-[#1A2838] dark:hover:bg-[#23354B] text-[#416F9E] dark:text-[#648DBB] font-mono border border-[#416F9E]/30 dark:border-[#648DBB]/40 shadow-sm',
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

export default Button;
