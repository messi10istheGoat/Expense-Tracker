import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface PanelProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
  style?: React.CSSProperties;
}

export function Panel({ title, subtitle, actions, children, className, bodyClassName, id, style }: PanelProps) {
  return (
    <section
      id={id}
      style={style}
      className={cn(
        "animate-fade-up min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] transition-colors duration-300 sm:p-5",
        "dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-none",
        className,
      )}
    >
      {(title || actions) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
