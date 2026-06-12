/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#0f0f11",
          surface: "#18181c",
          border: "#26262b"
        },
        brand: {
          primary: "#ff3b30",
          accent: "#007aff"
        }
      }
    },
  },
  plugins: [],
}
