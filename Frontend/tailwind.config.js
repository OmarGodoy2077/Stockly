// @ts-nocheck
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        // Extended colors for better light/dark mode support
        surface: {
          light: '#ffffff',
          'light-secondary': '#f9fafb',
          'light-tertiary': '#f3f4f6',
          dark: '#111827',
          'dark-secondary': '#1f2937',
          'dark-tertiary': '#374151',
        },
        border: {
          light: '#e5e7eb',
          dark: '#374151',
        },
        text: {
          light: '#111827',
          'light-secondary': '#6b7280',
          'light-tertiary': '#9ca3af',
          dark: '#f9fafb',
          'dark-secondary': '#d1d5db',
          'dark-tertiary': '#9ca3af',
        },
      },
      spacing: {
        safe: 'env(safe-area-inset-bottom)',
      },
      fontFamily: {
        sans: ['Inter var', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      backgroundColor: {
        'input-light': '#ffffff',
        'input-dark': '#1f2937',
      },
      textColor: {
        'input-light': '#111827',
        'input-dark': '#f9fafb',
      },
      borderColor: {
        'input-light': '#d1d5db',
        'input-dark': '#374151',
      },
      animation: {
        slideDown: 'slideDown 0.2s ease-out',
      },
      keyframes: {
        slideDown: {
          'from': { opacity: '0', transform: 'translateY(-10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
