import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        felt: {
          DEFAULT: '#1a5c38',
          light: '#2d7a50',
          dark: '#0f3d25',
          border: '#0a2918',
          rim: '#143d26',
        },
        card: {
          white: '#f9f6ef',
          red: '#c8102e',
          black: '#1a1a1a',
          border: '#d4c9b8',
        },
        chip: {
          red: '#e53e3e',
          blue: '#3182ce',
          green: '#38a169',
          black: '#2d3748',
          white: '#f7fafc',
          gold: '#d69e2e',
        },
        gold: {
          DEFAULT: '#d69e2e',
          light: '#f6e05e',
          dark: '#b7791f',
        },
      },
      fontFamily: {
        card: ['"Playfair Display"', 'Georgia', 'serif'],
        ui: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.2)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
        'card-selected': '0 0 0 3px #f6e05e, 0 4px 16px rgba(0,0,0,0.4)',
        felt: 'inset 0 2px 16px rgba(0,0,0,0.4), inset 0 0 60px rgba(0,0,0,0.15)',
        'felt-rim': '0 4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
        chip: '0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
        glow: '0 0 20px rgba(214,158,46,0.4)',
      },
      backgroundImage: {
        'felt-texture': "radial-gradient(ellipse at center, #2d7a50 0%, #1a5c38 50%, #0f3d25 100%)",
        'card-back-pattern': "repeating-linear-gradient(45deg, #1e3a8a 0px, #1e3a8a 2px, #1e40af 2px, #1e40af 8px)",
      },
      animation: {
        'card-deal': 'cardDeal 0.3s ease-out forwards',
        'card-flip': 'cardFlip 0.4s ease-in-out forwards',
        'chip-stack': 'chipStack 0.2s ease-out forwards',
        'win-bounce': 'winBounce 0.6s ease-in-out',
        'pulse-gold': 'pulseGold 1.5s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out forwards',
        'fade-in': 'fadeIn 0.2s ease-out forwards',
      },
      keyframes: {
        cardDeal: {
          '0%': { transform: 'scale(0.8) translateY(-20px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        cardFlip: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
        chipStack: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        winBounce: {
          '0%, 100%': { transform: 'scale(1)' },
          '25%': { transform: 'scale(1.15) rotate(-3deg)' },
          '75%': { transform: 'scale(1.15) rotate(3deg)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(214,158,46,0.4)' },
          '50%': { boxShadow: '0 0 24px rgba(214,158,46,0.8)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      screens: {
        'xs': '375px',
      },
    },
  },
  plugins: [],
} satisfies Config;
