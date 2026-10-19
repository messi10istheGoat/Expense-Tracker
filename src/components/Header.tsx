import { Moon, Sun, Wallet } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/utils/cn";

function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      className="relative inline-flex h-9 w-16 shrink-0 items-center rounded-full border border-slate-200 bg-slate-100 p-1 transition-colors duration-300 hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
    >
      <Sun className="absolute left-2 size-3.5 text-slate-400 transition-opacity duration-300 dark:opacity-100" aria-hidden />
      <Moon className="absolute right-2 size-3.5 text-slate-400 transition-opacity duration-300" aria-hidden />
      <span
        className={cn(
          "relative z-10 flex size-7 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-900/5 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] dark:bg-slate-950 dark:ring-white/10",
          isDark ? "translate-x-[26px]" : "translate-x-0",
        )}
      >
        <Sun
          className={cn(
            "absolute size-4 text-amber-500 transition-all duration-500",
            isDark ? "scale-0 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100",
          )}
        />
        <Moon
          className={cn(
            "absolute size-4 text-indigo-300 transition-all duration-500",
            isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0",
          )}
        />
      </span>
    </button>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl transition-colors duration-300 dark:border-slate-800/70 dark:bg-slate-950/75">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25">
            <Wallet className="size-[18px]" />
          </div>
          <div className="leading-tight">
            <p className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">Spendwise</p>
            <p className="hidden text-xs text-slate-500 sm:block dark:text-slate-400">Personal finance tracker</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 md:inline-flex dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Synced · 4 accounts
          </span>
          <ThemeToggle />
          <div
            className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-xs font-semibold text-white shadow-sm"
            title="Alex Morgan"
            aria-label="Signed in as Alex Morgan"
          >
            AM
          </div>
        </div>
      </div>
    </header>
  );
}
