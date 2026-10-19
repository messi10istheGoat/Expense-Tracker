import { CalendarDays, PiggyBank, Receipt, Repeat, Sparkles, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import type { Insight, InsightKind } from "@/lib/analytics";
import { cn } from "@/utils/cn";
import { EmptyState } from "./ui/EmptyState";
import { Panel } from "./ui/Panel";

const ICONS: Record<InsightKind, LucideIcon> = {
  "trend-up": TrendingUp,
  "trend-down": TrendingDown,
  savings: PiggyBank,
  calendar: CalendarDays,
  receipt: Receipt,
  repeat: Repeat,
};

const TONES: Record<Insight["tone"], string> = {
  positive: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  negative: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
  neutral: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
};

export function Insights({ items, className }: { items: Insight[]; className?: string }) {
  return (
    <Panel
      className={className}
      title={
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="size-4 text-violet-500" /> Smart insights
        </span>
      }
      subtitle="Auto-generated from your current filters"
    >
      {items.length === 0 ? (
        <EmptyState title="No insights yet" message="Widen the date range or relax filters to surface patterns." />
      ) : (
        <ul className="space-y-2.5">
          {items.map((item, i) => {
            const Icon = ICONS[item.kind];
            return (
              <li
                key={`${item.id}-${item.title}`}
                className="animate-fade-up flex gap-3 rounded-xl border border-slate-100 p-3 transition-colors hover:border-slate-200 dark:border-slate-800 dark:hover:border-slate-700"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", TONES[item.tone])}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{item.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
