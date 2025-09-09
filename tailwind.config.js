/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./_includes/**/*.{html,md}",
    "./_layouts/**/*.{html,md}",
    "./collections/**/*.{html,md}",
    "./_posts/**/*.{html,md}",
    "./blog/**/*.html",
    "./*.{html,md}",
    "./assets/js/**/*.js"
  ],
  darkMode: "media", // 필요 시 'class' 또는 false
  theme: {
    screens: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px" },
    extend: {},
  },
  plugins: [require("@tailwindcss/typography")],
};
