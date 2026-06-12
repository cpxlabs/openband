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
          elevated: "#1e1e24",
          border: "#26262b",
          muted: "#2a2a30",
        },
        brand: {
          primary: "#ff3b30",
          primaryDark: "#cc2f26",
          accent: "#007aff",
          accentDark: "#0062cc",
          green: "#34c759",
          yellow: "#ff9f0a",
        },
        gray: {
          150: "#e5e5ea",
          250: "#c7c7cc",
          350: "#8e8e93",
          450: "#636366",
          550: "#48484a",
          650: "#363639",
          750: "#2c2c2e",
          850: "#1c1c1e",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        "2xs": ["10px", "14px"],
      },
      spacing: {
        4.5: "18px",
        18: "72px",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
      },
      borderWidth: {
        0.5: "0.5px",
      },
    },
  },
  plugins: [],
};
