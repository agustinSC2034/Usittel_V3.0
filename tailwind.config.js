/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./*.php",
    "./includes/**/*.php",
    "./pages/**/*.html",
    "./pages/**/*.php",
    "./datos-personales/**/*.html",
    "./bot/**/*.html",
    "./bot/**/*.php",
    "./assets/js/**/*.js",
    "./js/**/*.js",
    "./includes/public/**/*.html",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require("@tailwindcss/aspect-ratio"),
  ],
};
