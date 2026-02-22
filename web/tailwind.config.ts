import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/sections/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand — deep navy
        primary: {
          DEFAULT: '#1a1a2e',
          dark: '#0f0f1a',
          light: '#2d2d50',
        },
        // Accent — Islamic green
        accent: {
          DEFAULT: '#16a34a',
          dark: '#15803d',
          light: '#22c55e',
        },
        // Gold — for highlights, ELO badges
        gold: {
          DEFAULT: '#d4a017',
          light: '#f5c842',
          dark: '#a37c0f',
        },
        // Surface / neutral
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f9fafb',
          border: '#e5e7eb',
        },
        // Text
        foreground: {
          DEFAULT: '#111827',
          muted: '#6b7280',
          inverted: '#ffffff',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-arabic)', 'serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        card: '0 2px 16px 0 rgba(26,26,46,0.08)',
        'card-hover': '0 8px 32px 0 rgba(26,26,46,0.16)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
