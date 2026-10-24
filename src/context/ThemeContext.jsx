import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export const THEMES = [
  { id: "maroon", label: "Marun", swatch: "#800020" },
  { id: "tosca", label: "Toska", swatch: "#118f91" },
  { id: "adminlte", label: "AdminLTE", swatch: "#0d5abe" }
];

const STORAGE_KEY = "dhouse-theme";
const DEFAULT_THEME = "tosca";
const ThemeContext = createContext(null);

function readTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return THEMES.some((theme) => theme.id === saved) ? saved : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Sinkronkan antar tab.
  useEffect(() => {
    function onStorage(event) {
      if (event.key === STORAGE_KEY) {
        setThemeState(THEMES.some((item) => item.id === event.newValue) ? event.newValue : DEFAULT_THEME);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((next) => {
    if (!THEMES.some((item) => item.id === next)) return;
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* Tema tetap berfungsi tanpa penyimpanan. */
    }
  }, []);

  const value = useMemo(() => ({ theme, setTheme, themes: THEMES }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme harus dipakai di dalam <ThemeProvider>");
  return context;
}
