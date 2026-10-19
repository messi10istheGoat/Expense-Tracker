import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

/** Shape of the props Recharts injects into a cloned tooltip element. */
export interface TipProps<T> {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: T; value?: unknown; dataKey?: unknown; name?: unknown; color?: string }>;
  label?: unknown;
}

export function TooltipCard({ title, children, footer }: { title?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="pointer-events-none min-w-[200px] rounded-xl border border-slate-200/80 bg-white/95 px-3.5 py-3 text-xs shadow-xl shadow-slate-900/10 backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/95 dark:shadow-black/40">
      {title && <p className="mb-2 font-semibold text-slate-900 dark:text-slate-100">{title}</p>}
      <div className="space-y-1.5">{children}</div>
      {footer && <div className="mt-2.5 border-t border-slate-100 pt-2 text-slate-400 dark:border-slate-800 dark:text-slate-500">{footer}</div>}
    </div>
  );
}

export function TooltipRow({
  color,
  label,
  value,
  emphasis,
  dashed,
}: {
  color?: string;
  label: ReactNode;
  value: ReactNode;
  emphasis?: boolean;
  dashed?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-5">
      <span className="flex min-w-0 items-center gap-2 text-slate-500 dark:text-slate-400">
        {color &&
          (dashed ? (
            <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundImage: `linear-gradient(90deg, ${color} 60%, transparent 60%)`, backgroundSize: "4px 2px" }} />
          ) : (
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          ))}
        <span className="truncate">{label}</span>
      </span>
      <span className={cn("font-medium text-slate-900 tabular-nums dark:text-slate-100", emphasis && "font-semibold")}>{value}</span>
    </div>
  );
}
