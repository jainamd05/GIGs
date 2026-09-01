/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7f2', 100: '#d6ece0', 500: '#1f9d61', 600: '#178050', 700: '#12633e',
        },
      },
    },
  },
  plugins: [],
};
