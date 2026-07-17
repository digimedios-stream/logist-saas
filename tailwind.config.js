/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        white: 'rgb(var(--white) / <alpha-value>)',
        black: 'rgb(var(--black) / <alpha-value>)',
        slate: {
          50: 'rgb(var(--slate-50) / <alpha-value>)',
          100: 'rgb(var(--slate-100) / <alpha-value>)',
          200: 'rgb(var(--slate-200) / <alpha-value>)',
          300: 'rgb(var(--slate-300) / <alpha-value>)',
          400: 'rgb(var(--slate-400) / <alpha-value>)',
          500: 'rgb(var(--slate-500) / <alpha-value>)',
          600: 'rgb(var(--slate-600) / <alpha-value>)',
          700: 'rgb(var(--slate-700) / <alpha-value>)',
          800: 'rgb(var(--slate-800) / <alpha-value>)',
          900: 'rgb(var(--slate-900) / <alpha-value>)',
          950: 'rgb(var(--slate-950) / <alpha-value>)',
        },
        // Lazdin custom colors mapped to css variables for theming
        lazdin: {
          bg: 'rgb(var(--lazdin-bg) / <alpha-value>)',
          surface: 'rgb(var(--lazdin-surface) / <alpha-value>)',
          'surface-high': 'rgb(var(--lazdin-surface-high) / <alpha-value>)',
          'surface-highest': 'rgb(var(--lazdin-surface-highest) / <alpha-value>)',
          'surface-low': 'rgb(var(--lazdin-surface-low) / <alpha-value>)',
          'surface-lowest': 'rgb(var(--lazdin-surface-lowest) / <alpha-value>)',
          'primary-container': 'rgb(var(--lazdin-primary-container) / <alpha-value>)',
          emerald: 'rgb(var(--lazdin-emerald) / <alpha-value>)',
          'emerald-dark': 'rgb(var(--lazdin-emerald-dark) / <alpha-value>)',
          'emerald-container': 'rgb(var(--lazdin-emerald-container) / <alpha-value>)',
          blue: 'rgb(var(--lazdin-blue) / <alpha-value>)',
          'blue-container': 'rgb(var(--lazdin-blue-container) / <alpha-value>)',
          orange: 'rgb(var(--lazdin-orange) / <alpha-value>)',
          'orange-light': 'rgb(var(--lazdin-orange-light) / <alpha-value>)',
          'orange-dark': 'rgb(var(--lazdin-orange-dark) / <alpha-value>)',
          outline: 'rgb(var(--lazdin-outline) / <alpha-value>)',
          'outline-variant': 'rgb(var(--lazdin-outline-variant) / <alpha-value>)',
          'on-surface': 'rgb(var(--lazdin-on-surface) / <alpha-value>)',
          'on-surface-variant': 'rgb(var(--lazdin-on-surface-variant) / <alpha-value>)',
          'on-primary-container': 'rgb(var(--lazdin-on-primary-container) / <alpha-value>)',
          error: 'rgb(var(--lazdin-error) / <alpha-value>)',
          'error-container': 'rgb(var(--lazdin-error-container) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        headline: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-in': 'slide-in-right 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
