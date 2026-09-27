/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./js/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        sakura: "#FFB7C5",
        crimson: "#BC002D",
        ink: "#20242a",
        mist: "#f5f7f8",
      },
      fontFamily: {
        display: ["Georgia", "serif"],
        sans: ["Trebuchet MS", "sans-serif"],
      },
    },
  },
  plugins: [],
}
