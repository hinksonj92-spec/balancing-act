import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#6C5CE7',
        'primary-light': '#A29BFE',
        success: '#00B894',
        warning: '#FDCB6E',
        danger: '#E17055',
        info: '#0984E3',
        teal: '#00CEC9',
        pink: '#E84393',
        // Category colors
        spiritual: '#6C5CE7',
        family: '#E17055',
        emotional: '#FDCB6E',
        personal: '#00B894',
        physical: '#0984E3',
        financial: '#00CEC9',
        intellectual: '#A29BFE',
        ecclesiastical: '#E84393',
        // Dark mode backgrounds
        'dark-bg': '#1A1A2E',
        'dark-card': '#16213E',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        button: '24px',
      },
      spacing: {
        unit: '8px',
      },
    },
  },
  plugins: [],
};

export default config;
