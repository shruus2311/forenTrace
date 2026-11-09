/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: "#020408",
        void: "#040812",
        "cyber-cyan": "#00F2FE",
        "cyan-glow": "#4FACFE",
        "phosphor-green": "#10B981",
        "alert-red": "#FF2E54",
        "amber-gold": "#F59E0B",
        "border-glow": "rgba(0, 242, 254, 0.2)",
        // Dark Forensic Intelligence tokens
        forensic: {
          950: "#06080E",
          900: "#090D16",
          850: "#0C111C",
          800: "#101625",
          750: "#151C2E",
          700: "#1C2438",
          accent: "#00F2FE",
          accentHover: "#38BDF8",
          emerald: "#10B981",
          amber: "#F59E0B",
          crimson: "#EF4444",
          violet: "#818CF8",
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
      },
    },
  },
  plugins: [],
};
