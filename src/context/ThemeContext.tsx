import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
  setTheme: () => {},
});

function applyTheme(theme: Theme) {
  if (Platform.OS === "web" && typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.style.backgroundColor =
      theme === "dark" ? "#0f0f11" : "#ffffff";
    document.body.style.color = theme === "dark" ? "#ffffff" : "#000000";
  }
}

function loadInitialTheme(): Theme {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    return (localStorage.getItem("openband_theme") as Theme) ?? "dark";
  }
  return "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(loadInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    if (Platform.OS === "web" && typeof localStorage !== "undefined") {
      localStorage.setItem("openband_theme", theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
