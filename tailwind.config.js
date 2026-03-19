/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./*.php",
    "./includes/**/*.php",
    "./pages/**/*.html",
    "./pages/**/*.php",
    "./bot/**/*.html",
    "./bot/**/*.php",
    "./assets/js/**/*.js",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require("@tailwindcss/aspect-ratio"),
  ],
};
