import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme, Theme } from './ThemeProvider';
import { cyberAudio } from '../lib/audio';

export interface ThemeToggleProps {
  variant?: 'segmented' | 'dropdown' | 'icon-button';
  size?: 'sm' | 'md';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'segmented',
  size = 'sm',
  className = '',
}) => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (newTheme: Theme) => {
    cyberAudio.playClick(newTheme === 'dark' ? 500 : 850, 0.04);
    setTheme(newTheme);
    setDropdownOpen(false);
  };

  const options: { id: Theme; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ];

  if (variant === 'segmented') {
    return (
      <div
        className={`inline-flex items-center p-0.5 rounded-lg bg-slate-200/80 dark:bg-[#171B22] border border-slate-300/80 dark:border-[#303743] ${className}`}
      >
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = theme === opt.id;

          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-[#1D232C] text-[#416F9E] dark:text-[#648DBB] shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title={`Switch to ${opt.label} mode`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Icon Button with Dropdown
  const CurrentIcon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="p-1.5 rounded-lg border border-slate-300 dark:border-[#303743] bg-white dark:bg-[#171B22] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1D232C] transition-colors cursor-pointer flex items-center justify-center shadow-sm"
        title={`Current theme: ${theme} (${resolvedTheme})`}
      >
        <CurrentIcon className="w-4 h-4 text-[#416F9E] dark:text-[#648DBB]" />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-1.5 w-36 rounded-lg bg-white dark:bg-[#1D232C] border border-slate-200 dark:border-[#303743] shadow-xl py-1 z-50 text-xs font-mono animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1 text-[10px] uppercase text-slate-400 dark:text-slate-500 font-semibold border-b border-slate-100 dark:border-[#303743]">
            Theme Mode
          </div>
          {options.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.id;

            return (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt.id)}
                className={`w-full flex items-center justify-between px-3 py-1.5 transition-colors cursor-pointer text-left ${
                  isSelected
                    ? 'bg-slate-100 dark:bg-[#171B22] text-[#416F9E] dark:text-[#648DBB] font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#242B36]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#416F9E] dark:text-[#648DBB]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;
