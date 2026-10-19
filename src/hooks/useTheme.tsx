import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  APPEARANCE_KEYS,
  readAppearance,
  resolveMode,
  type Appearance,
  type ColorMode,
  type ModePreference,
  type StyleId,
  type TextSize,
} from '../finance/appearance';

interface ThemeContextValue {
  theme: ColorMode;
  mode: ModePreference;
  style: StyleId;
  textSize: TextSize;
  isDark: boolean;
  toggle: () => void;
  setStyle: (style: StyleId) => void;
  setMode: (mode: ModePreference) => void;
  setTextSize: (size: TextSize) => void;
}
const ThemeContext = createContext<ThemeContextValue | null>(null);
function initialAppearance(): Appearance {
  try {
    return readAppearance(window.localStorage);
  } catch {
    return readAppearance();
  }
}
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(() => ({ appearance: initialAppearance(), persist: true }));
  const { appearance } = preferences;
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  const theme = resolveMode(appearance.mode, systemDark);
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const changed = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    query.addEventListener('change', changed);
    const sync = (e: StorageEvent) => {
      if (Object.values(APPEARANCE_KEYS).some((key) => key === e.key) || e.key === null)
        setPreferences({ appearance: initialAppearance(), persist: false });
    };
    window.addEventListener('storage', sync);
    return () => {
      query.removeEventListener('change', changed);
      window.removeEventListener('storage', sync);
    };
  }, []);
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.dataset.style = appearance.style;
    root.dataset.textSize = appearance.textSize;
    root.style.colorScheme = theme;
    const background = getComputedStyle(root).getPropertyValue('--bg').trim();
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((meta) => meta.setAttribute('content', background));
  }, [appearance, theme]);
  useLayoutEffect(() => {
    // Storage events are read-only: echoing them back can race with the source tab's next edit.
    if (!preferences.persist) return;
    const { appearance } = preferences;
    try {
      localStorage.setItem(APPEARANCE_KEYS.style, appearance.style);
      localStorage.setItem(APPEARANCE_KEYS.mode, appearance.mode);
      localStorage.setItem(APPEARANCE_KEYS.textSize, appearance.textSize);
    } catch {
      /* The finance provider separately reports financial-storage failures. */
    }
  }, [preferences]);
  const setStyle = useCallback(
    (style: StyleId) =>
      setPreferences(({ appearance }) => ({
        appearance: { ...appearance, style },
        persist: true,
      })),
    [],
  );
  const setMode = useCallback(
    (mode: ModePreference) =>
      setPreferences(({ appearance }) => ({
        appearance: { ...appearance, mode },
        persist: true,
      })),
    [],
  );
  const setTextSize = useCallback(
    (textSize: TextSize) =>
      setPreferences(({ appearance }) => ({
        appearance: { ...appearance, textSize },
        persist: true,
      })),
    [],
  );
  const toggle = useCallback(
    () =>
      setPreferences(({ appearance }) => ({
        appearance: {
          ...appearance,
          mode: resolveMode(appearance.mode, systemDark) === 'dark' ? 'light' : 'dark',
        },
        persist: true,
      })),
    [systemDark],
  );
  const value = useMemo(
    () => ({ ...appearance, theme, isDark: theme === 'dark', toggle, setStyle, setMode, setTextSize }),
    [appearance, theme, toggle, setStyle, setMode, setTextSize],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('Theme provider missing');
  return context;
}
/** SVGs accept CSS custom properties, so charts update with every theme without duplicated palettes. */
export function useChartColors() {
  const { textSize } = useTheme();
  return {
    fontSize: textSize === 'large' ? 14 : 12,
    income: 'var(--chart-income)',
    expenses: 'var(--chart-expense)',
    categories: Array.from({ length: 5 }, (_, i) => `var(--chart-category-${i + 1})`),
    grid: 'var(--chart-grid)',
    axis: 'var(--muted)',
    cursor: 'var(--border-strong)',
    cursorFill: 'var(--surface-alt)',
    surface: 'var(--surface)',
    muted: 'var(--muted)',
    net: 'var(--green)',
    netDark: 'var(--green)',
  };
}
