/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./views/**/*.ejs', './public/js/**/*.js'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff8f0',
          100: '#feedd8',
          200: '#fcd9af',
          300: '#f9be7c',
          400: '#f5a04a',
          500: '#E8922F', // DigitalProductValley orange
          600: '#d07a1a',
          700: '#ad6118',
          800: '#8a4e1a',
          900: '#704118',
        },
        navy: {
          600: '#243252',
          700: '#1e2b47',
          800: '#192340',
          900: '#131c33',
        },
        pink: {
          500: '#ec4899',
          600: '#db2777',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
