/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    screens: {
      mobile: "480px",
      tablet: "1024px",
      desktop: "1280px",
    },
    extend: {
      colors: {
        dark: {
          bg: "rgb(var(--color-dark-bg, 10 10 13) / <alpha-value>)",
          surface: "rgb(var(--color-dark-surface, 20 20 24) / <alpha-value>)",
          elevated: "rgb(var(--color-dark-elevated, 28 28 34) / <alpha-value>)",
          border: "rgb(var(--color-dark-border, 42 42 50) / <alpha-value>)",
          muted: "rgb(var(--color-dark-muted, 46 46 56) / <alpha-value>)",
        },
        light: {
          bg: "rgb(var(--color-light-bg, 255 255 255) / <alpha-value>)",
          surface: "rgb(var(--color-light-surface, 242 242 247) / <alpha-value>)",
          elevated: "rgb(var(--color-light-elevated, 229 229 234) / <alpha-value>)",
          border: "rgb(var(--color-light-border, 209 209 214) / <alpha-value>)",
          muted: "rgb(var(--color-light-muted, 199 199 204) / <alpha-value>)",
        },
        brand: {
          primary: "rgb(var(--color-brand-primary, 255 59 48) / <alpha-value>)",
          primaryDark: "rgb(204 47 38 / <alpha-value>)",
          accent: "rgb(var(--color-brand-accent, 0 122 255) / <alpha-value>)",
          accentDark: "rgb(0 98 204 / <alpha-value>)",
          green: "rgb(52 199 89 / <alpha-value>)",
          yellow: "rgb(255 159 10 / <alpha-value>)",
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
        "4xs": ["7px", "9px"],
        "3xs": ["8px", "10px"],
        "2xs": ["10px", "14px"],
        "2.5xs": ["11px", "15px"],
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
      zIndex: {
        dropdown: "50",
        sidebar: "60",
        overlay: "70",
        modal: "80",
        tooltip: "90",
      },
      maxWidth: {
        login: "448px",
        account: "576px",
        content: "768px",
        studio: "1200px",
        wide: "1440px",
      },
      transitionDuration: {
        fast: "150ms",
        normal: "250ms",
        slow: "500ms",
      },
    },
  },
  plugins: [],
};
