/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2fbf6",
          100: "#dff6e8",
          400: "#3fbf7f",
          500: "#22a866",
          600: "#178a52",
          700: "#136e42",
        },
        alert: {
          500: "#e0473c",
          600: "#c53a30",
        },
      },
    },
  },
  plugins: [],
};
