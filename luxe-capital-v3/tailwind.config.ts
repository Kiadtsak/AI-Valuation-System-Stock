import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        gold: {
          50:  '#fdf9f0',
          100: '#faf0d6',
          200: '#f4e0ad',
          300: '#eccb79',
          400: '#e4b347',
          500: '#d4a574',
          600: '#b8863f',
          700: '#8f6530',
          800: '#6b4b26',
          900: '#4a341c',
        },
        ink: {
          50:  '#f4f4f5',
          100: '#e4e4e7',
          200: '#a1a1aa',
          300: '#71717a',
          400: '#52525b',
          500: '#3f3f46',
          600: '#27272a',
          700: '#1a1a1d',
          800: '#111113',
          900: '#08080a',
          950: '#030304',
        },
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #d4a574 0%, #f4e0ad 50%, #b8863f 100%)',
        'radial-glow': 'radial-gradient(circle at 50% 0%, rgba(212,165,116,0.15) 0%, transparent 50%)',
        'grid-pattern': 'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
      },
      boxShadow: {
        'gold-glow': '0 0 40px -10px rgba(212,165,116,0.4)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255,255,255,0.05)',
        'luxe': '0 0 0 1px rgba(255,255,255,0.04), 0 20px 80px -20px rgba(0,0,0,0.6)',
      },
      animation: {
        'shimmer': 'shimmer 3s linear infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'gradient-shift': 'gradientShift 8s ease infinite',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        gradientShift: {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%':     { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
