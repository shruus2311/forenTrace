import React from 'react';

export interface BrandLogoProps {
  variant?: 'full' | 'compact' | 'icon' | 'sidebar' | 'login' | 'report';
  tagline?: 'digital-forensic' | 'evidence-integrity' | 'none';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  useImage?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'full',
  tagline = 'digital-forensic',
  size = 'md',
  className = '',
  useImage = false,
}) => {
  // If useImage is specified and variant is full or login, we can use the official high-res raster logo
  if (useImage && (variant === 'full' || variant === 'login' || variant === 'report')) {
    const sizeClasses = {
      xs: 'h-6',
      sm: 'h-8',
      md: 'h-10',
      lg: 'h-12',
      xl: 'h-16',
    };

    return (
      <div className={`flex items-center ${className}`}>
        <img
          src="/forentrace-logo.png"
          alt="FORENTRACE — Digital Forensic Intelligence"
          className={`${sizeClasses[size]} w-auto object-contain select-none`}
        />
      </div>
    );
  }

  // Size dimensions for vector rendering
  const sizeMap = {
    xs: { iconSize: 20, textClass: 'text-sm', subTextClass: 'text-[7px]' },
    sm: { iconSize: 26, textClass: 'text-base', subTextClass: 'text-[8px]' },
    md: { iconSize: 34, textClass: 'text-lg', subTextClass: 'text-[9px]' },
    lg: { iconSize: 44, textClass: 'text-2xl', subTextClass: 'text-[11px]' },
    xl: { iconSize: 58, textClass: 'text-3xl', subTextClass: 'text-[13px]' },
  };

  const currentSize = sizeMap[size];

  // SVG Fingerprint + Circuit + F-Mark Component
  const ForensicSymbol = ({ sizeInPx }: { sizeInPx: number }) => (
    <svg
      width={sizeInPx}
      height={sizeInPx}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 select-none"
    >
      <defs>
        <linearGradient id="fSymbolGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E3A8A" />
          <stop offset="60%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
        <linearGradient id="traceGradSymbol" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
      </defs>

      {/* Viewfinder Corner Framing */}
      <path
        d="M 14 26 L 14 14 L 26 14"
        stroke="currentColor"
        className="text-[#648DBB] dark:text-[#648DBB]"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 74 14 L 86 14 L 86 26"
        stroke="currentColor"
        className="text-[#648DBB] dark:text-[#648DBB]"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 14 74 L 14 86 L 26 86"
        stroke="currentColor"
        className="text-[#648DBB] dark:text-[#648DBB]"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 74 86 L 86 86 L 86 74"
        stroke="currentColor"
        className="text-[#648DBB] dark:text-[#648DBB]"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Circuit Traces Left */}
      <path d="M 2 38 L 10 38 L 16 46 L 22 46" stroke="url(#traceGradSymbol)" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="3" cy="38" r="2.5" fill="#38BDF8" />

      <path d="M 0 50 L 18 50" stroke="url(#traceGradSymbol)" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="3" cy="50" r="2.5" fill="#38BDF8" />

      <path d="M 4 64 L 12 64 L 18 56 L 24 56" stroke="url(#traceGradSymbol)" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="5" cy="64" r="2.5" fill="#38BDF8" />

      {/* Fingerprint concentric arcs */}
      <g stroke="currentColor" className="text-slate-400 dark:text-slate-500 opacity-80" strokeWidth="2.2" strokeLinecap="round">
        <ellipse cx="50" cy="46" rx="9" ry="11" fill="none" strokeDasharray="16 6" />
        <ellipse cx="50" cy="46" rx="16" ry="19" fill="none" strokeDasharray="24 8" />
        <ellipse cx="50" cy="47" rx="23" ry="26" fill="none" strokeDasharray="32 10" />
        <ellipse cx="50" cy="48" rx="29" ry="32" fill="none" strokeDasharray="42 12" />
      </g>

      {/* Geometric Sharp F Monogram */}
      {/* Vertical Spine */}
      <polygon
        points="38,24 50,24 50,78 38,84"
        fill="currentColor"
        className="text-[#1A202C] dark:text-[#0F172A]"
        stroke="#38BDF8"
        strokeWidth="1.6"
      />
      {/* Top Arm */}
      <polygon
        points="50,24 74,24 74,36 50,36"
        fill="currentColor"
        className="text-[#1A202C] dark:text-[#0F172A]"
        stroke="#38BDF8"
        strokeWidth="1.6"
      />
      {/* Middle Arm with Blue Gradient */}
      <polygon
        points="50,44 72,44 65,56 50,56"
        fill="url(#fSymbolGrad)"
        stroke="#60A5FA"
        strokeWidth="1.2"
      />
    </svg>
  );

  // If icon only is requested
  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <ForensicSymbol sizeInPx={currentSize.iconSize} />
      </div>
    );
  }

  // Tagline text selection
  const taglineText =
    tagline === 'evidence-integrity'
      ? 'EVIDENCE • INTEGRITY • INTELLIGENCE'
      : 'DIGITAL FORENSIC INTELLIGENCE';

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Icon mark */}
      <ForensicSymbol sizeInPx={currentSize.iconSize} />

      {/* Wordmark and tagline */}
      <div className="flex flex-col justify-center">
        <div className={`font-display font-extrabold tracking-wider leading-none ${currentSize.textClass}`}>
          <span className="text-[#202631] dark:text-[#E7EAF0]">FOREN</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#38BDF8]">
            TRACE
          </span>
        </div>

        {tagline !== 'none' && variant !== 'compact' && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="h-[1px] w-2.5 bg-slate-400 dark:bg-slate-600 opacity-60" />
            <span
              className={`font-mono uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap leading-none ${currentSize.subTextClass}`}
            >
              {taglineText}
            </span>
            <span className="h-[1px] w-2.5 bg-slate-400 dark:bg-slate-600 opacity-60" />
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandLogo;
