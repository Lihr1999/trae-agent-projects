/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        coffee: {
          50: '#faf6f3',
          100: '#f2e8e0',
          200: '#e6d1c1',
          300: '#d6b49b',
          400: '#c49473',
          500: '#b87f59',
          600: '#a66b4d',
          700: '#8a5540',
          800: '#3E2723',
          900: '#2C1810',
        },
        accent: {
          orange: '#FF6D00',
          cyan: '#00B8D4',
          red: '#D50000',
          blue: '#2962FF',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ripple': 'ripple 1s ease-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '100%': { transform: 'scale(4)', opacity: '0' },
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
