/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        slate: {
          350: "#a1b0cb",
          750: "#233044",
          850: "#172033",
        },
      },
    },
  },
  plugins: [],
}
