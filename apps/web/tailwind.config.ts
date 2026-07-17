import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Restrained deep-red accent per the brand guidelines.
        brand: {
          DEFAULT: '#b91c1c',
          dark: '#991b1b',
          light: '#ef4444',
        },
        // Off-white surfaces.
        canvas: '#faf9f7',
      },
      fontFamily: {
        sans: ['var(--font-vazir)', 'Vazirmatn', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.9rem',
      },
    },
  },
  plugins: [],
};

export default config;
