/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './index.tsx',
    './src/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#1e40af',
        'brand-secondary': '#1d4ed8',
        'brand-accent': '#3b82f6',
        'brand-light': '#eff6ff',
        'status-compliant': '#16a34a',
        'status-pending': '#f97316',
        'status-noncompliant': '#dc2626',
      },
    },
  },
  plugins: [],
};


