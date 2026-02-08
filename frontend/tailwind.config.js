
export default {
  content: ["./index.html", "./src*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        hull: {
          950: '#050810',
          900: '#0a0e17',
          800: '#111827',
          700: '#1a2332',
          600: '#243044',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
        signal: {
          red: '#ef4444',
          green: '#22c55e',
          blue: '#3b82f6',
          amber: '#f59e0b',
        }
      },
      fontFamily: {
        display: ['"JetBrains Mono"', 'monospace'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'scan': 'scan 2s linear infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        }
      }
    },
  },
  plugins: [],
}
