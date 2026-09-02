/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Royal blue primary (from reference mockups)
        brand: {
          50: '#eef4ff',
          100: '#dae6ff',
          200: '#bcd0ff',
          300: '#8eb0ff',
          400: '#5a86fb',
          500: '#3560f4',
          600: '#2540eb',
          700: '#1e33c4',
          800: '#1e2f9c',
          900: '#1d2c7c',
        },
        // Emerald accent — verified / match / success
        accent: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        // Dark navy panels
        ink: {
          700: '#1b2540',
          800: '#141d36',
          900: '#0d1428',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Poppins', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      backgroundImage: {
        'grad-brand': 'linear-gradient(120deg, #2540eb 0%, #7c3aed 100%)',
        'grad-cta': 'linear-gradient(120deg, #2540eb 0%, #10b981 100%)',
        'grad-sos': 'linear-gradient(120deg, #f43f5e 0%, #7c3aed 100%)',
        'grad-ink': 'linear-gradient(160deg, #1b2540 0%, #0d1428 100%)',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 6px 20px -8px rgb(15 23 42 / 0.12)',
        pop: '0 20px 45px -12px rgb(15 23 42 / 0.35)',
        glow: '0 0 0 4px rgb(37 64 235 / 0.12)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      keyframes: {
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'sheet-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'toast-in': 'toast-in 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.24s ease-out',
        'sheet-up': 'sheet-up 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
