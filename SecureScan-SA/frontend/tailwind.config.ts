import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 10px 30px rgba(0,0,0,0.35)'
      }
    }
  },
  plugins: []
} satisfies Config;

