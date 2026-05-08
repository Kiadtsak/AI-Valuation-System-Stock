import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Distinctive — not Inter or system
        display: ['var(--font-display)', 'serif'],     // Instrument Serif (editorial)
        sans: ['var(--font-sans)', 'sans-serif'],      // Manrope (refined)
        mono: ['var(--font-mono)', 'monospace'],       // JetBrains Mono
      },
      colors: {
        // Quantix-inspired dark navy + violet
        ink: {
          950: '#0a0a14',  // deepest background
          900: '#0f0f1c',  // base
          800: '#161628',  // cards bg
          700: '#1d1d33',  // elevated
          600: '#252540',  // borders
          500: '#383852',  // muted
        },
        violet: {
          glow: '#9b8cff',  // primary accent
          deep: '#6f5fd6',
          soft: '#b8aaff',
        },
        positive: '#3ddc84',
        negative: '#ff5577',
      },
      backgroundImage: {
        'violet-glow': 'radial-gradient(circle at top left, rgba(155, 140, 255, 0.35) 0%, rgba(155, 140, 255, 0.08) 25%, transparent 60%)',
        'card-gradient': 'linear-gradient(135deg, rgba(35, 35, 60, 0.6) 0%, rgba(20, 20, 35, 0.8) 100%)',
        'pill-positive': 'linear-gradient(135deg, rgba(61, 220, 132, 0.15) 0%, rgba(61, 220, 132, 0.05) 100%)',
        'pill-negative': 'linear-gradient(135deg, rgba(255, 85, 119, 0.15) 0%, rgba(255, 85, 119, 0.05) 100%)',
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
        'card-hover': '0 8px 32px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(155, 140, 255, 0.1)',
        'violet': '0 0 40px rgba(155, 140, 255, 0.15)',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fadeIn 0.4s ease-out both',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
