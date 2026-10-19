import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "spendwise-theme";

function initialTheme(): Theme {
  if (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) return "dark";
  return "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage unavailable */
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);
  const value = useMemo(() => ({ theme, isDark: theme === "dark", toggle }), [theme, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

/** Theme-aware colors for chart chrome (grid, axes, cursor, surfaces). */
export function useChartColors() {
  const { isDark } = useTheme();
  return useMemo(
    () =>
      isDark
        ? {
            grid: "#1e293b",
            axis: "#64748b",
            cursor: "#475569",
            cursorFill: "rgba(148, 163, 184, 0.08)",
            surface: "#0f172a",
            muted: "#334155",
            net: "#818cf8",
          }
        : {
            grid: "#e2e8f0",
            axis: "#94a3b8",
            cursor: "#cbd5e1",
            cursorFill: "rgba(148, 163, 184, 0.14)",
            surface: "#ffffff",
            muted: "#cbd5e1",
            net: "#6366f1",
          },
    [isDark],
  );
}
