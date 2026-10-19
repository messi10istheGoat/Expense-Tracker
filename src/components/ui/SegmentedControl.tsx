import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/utils/cn";

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
  title?: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  ariaLabel: string;
  className?: string;
  stretch?: boolean;
}

/** Pill-style segmented control with a sliding active indicator. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  ariaLabel,
  className,
  stretch = false,
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const active = el.querySelector<HTMLButtonElement>('button[data-active="true"]');
      setIndicator(active ? { left: active.offsetLeft, width: active.offsetWidth } : null);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [value, options.length]);

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-xl bg-slate-100 p-1 transition-colors dark:bg-slate-800/80",
        stretch && "flex w-full sm:inline-flex sm:w-auto",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-1 bottom-1 rounded-lg bg-white shadow-sm ring-1 ring-slate-900/5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:bg-slate-950 dark:ring-white/10",
          indicator ? "opacity-100" : "opacity-0",
        )}
        style={indicator ? { left: indicator.left, width: indicator.width } : undefined}
      />
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            data-active={active}
            disabled={opt.disabled}
            title={opt.title}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative z-10 inline-flex items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:outline-none",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-sm",
              stretch && "flex-1 sm:flex-none",
              active
                ? "text-slate-900 dark:text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
              opt.disabled && "cursor-not-allowed opacity-40 hover:text-slate-500 dark:hover:text-slate-400",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
