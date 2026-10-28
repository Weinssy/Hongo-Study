/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./src/partials/**/*.html",
    "./grammar/**/*.html",
    "./kosakata/**/*.html",
    "./js/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        sakura: "#FCEEEF",
        crimson: "#D33827",
        ink: "#191A1E",
        mist: "#FAF8F5",
        matcha: "#2E7D47",
        surface: "#FFFFFF",
        "sumi-canvas": "#121316",
        "sumi-surface": "#1A1C22"
      },
      fontFamily: {
        display: ['"Shippori Mincho"', 'serif'],
        sans: ['"Plus Jakarta Sans"', '"Zen Kaku Gothic New"', 'sans-serif'],
        japanese: ['"Zen Kaku Gothic New"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'whisper': '0 4px 20px -2px rgba(25, 26, 30, 0.05)',
        'elevated': '0 12px 30px -4px rgba(25, 26, 30, 0.08)',
      }
    },
  },
  plugins: [],
}
