import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Restrained green accent.
        brand: {
          DEFAULT: '#059669',
          dark: '#047857',
          light: '#34d399',
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
