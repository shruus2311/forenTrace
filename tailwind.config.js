/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Theme semantic tokens
        theme: {
          main: 'var(--bg-main)',
          secondary: 'var(--bg-secondary)',
          surface: 'var(--surface)',
          'surface-hover': 'var(--surface-hover)',
          border: 'var(--border)',
          'border-subtle': 'var(--border-subtle)',
          primary: 'var(--text-primary)',
          secondaryText: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          accent: 'var(--accent)',
          'accent-hover': 'var(--accent-hover)',
          'accent-light': 'var(--accent-light)',
          success: 'var(--success)',
          'success-bg': 'var(--success-bg)',
          warning: 'var(--warning)',
          'warning-bg': 'var(--warning-bg)',
          critical: 'var(--critical)',
          'critical-bg': 'var(--critical-bg)',
        },
        // Forensic Intelligence specific tokens
        forensic: {
          mainDark: "#111318",
          secondaryDark: "#171B22",
          surfaceDark: "#1D232C",
          borderDark: "#303743",
          accentDark: "#648DBB",
          mainLight: "#F5F6F8",
          secondaryLight: "#FFFFFF",
          surfaceLight: "#FFFFFF",
          borderLight: "#E1E5EA",
          accentLight: "#416F9E",
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
