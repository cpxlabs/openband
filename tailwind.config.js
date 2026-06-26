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
          bg: "var(--color-dark-bg, #0f0f11)",
          surface: "var(--color-dark-surface, #18181c)",
          elevated: "var(--color-dark-elevated, #1e1e24)",
          border: "var(--color-dark-border, #26262b)",
          muted: "var(--color-dark-muted, #2a2a30)",
        },
        light: {
          bg: "var(--color-light-bg, #ffffff)",
          surface: "var(--color-light-surface, #f2f2f7)",
          elevated: "var(--color-light-elevated, #e5e5ea)",
          border: "var(--color-light-border, #d1d1d6)",
          muted: "var(--color-light-muted, #c7c7cc)",
        },
        brand: {
          primary: "var(--color-brand-primary, #ff3b30)",
          primaryDark: "#cc2f26",
          accent: "var(--color-brand-accent, #007aff)",
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
