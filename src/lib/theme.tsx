import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("amanah-theme")) as Theme | null;
    if (stored === "light" || stored === "dark") {
      setThemeState(stored);
    } else if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setThemeState("dark");
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    const handler = () => {
      const stored = localStorage.getItem("amanah-settings");
      if (stored) {
        const { theme: cloudTheme } = JSON.parse(stored);
        if (cloudTheme === "light" || cloudTheme === "dark") {
          setThemeState(cloudTheme);
        }
      }
    };
    window.addEventListener("amanah-settings-changed", handler);
    return () => window.removeEventListener("amanah-settings-changed", handler);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    if (typeof window !== "undefined") {
      localStorage.setItem("amanah-theme", t);
      // Also update settings store for sync
      const raw = localStorage.getItem("amanah-settings");
      const settings = raw ? JSON.parse(raw) : {};
      localStorage.setItem("amanah-settings", JSON.stringify({ ...settings, theme: t }));
    }
  }, []);

  const toggleTheme = useCallback(() => setTheme(theme === "dark" ? "light" : "dark"), [theme, setTheme]);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
