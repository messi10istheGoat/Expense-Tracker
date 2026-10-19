import { useEffect, useState } from "react";
import type { BudgetRow } from "@/lib/analytics";
import { CATEGORIES } from "@/lib/categories";
import { fmtCurrency } from "@/lib/format";
import { cn } from "@/utils/cn";
import { EmptyState } from "./ui/EmptyState";
import { Panel } from "./ui/Panel";

interface BudgetListProps {
  rows: BudgetRow[];
  available: boolean;
  onCategoryClick: (id: BudgetRow["id"]) => void;
  className?: string;
}

function statusColor(pct: number, base: string) {
  if (pct > 100) return "#f43f5e";
  if (pct > 85) return "#f59e0b";
  return base;
}

export function BudgetList({ rows, available, onCategoryClick, className }: BudgetListProps) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const spent = rows.reduce((s, r) => s + r.spent, 0);
  const budget = rows.reduce((s, r) => s + r.budget, 0);
  const pct = budget ? (spent / budget) * 100 : 0;
  const over = rows.filter((r) => r.pct > 100).length;

  return (
    <Panel
      className={className}
      title="Budgets"
      subtitle="Monthly budgets prorated to the selected range"
      actions={
        available && rows.length > 0 ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              over
                ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
            )}
          >
            {over ? `${over} over budget` : "All on track"}
          </span>
        ) : null
      }
    >
      {!available || rows.length === 0 ? (
        <EmptyState title="Budgets track spending" message="Include expense categories in your filters to see budget progress." />
      ) : (
        <>
          <div className="mb-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Total used</span>
              <span className="text-sm text-slate-500 tabular-nums dark:text-slate-400">
                <span className="font-semibold text-slate-900 dark:text-white">{fmtCurrency(spent)}</span> / {fmtCurrency(budget)}
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700/60">
              <div
                className="h-full rounded-full transition-[width,background-color] duration-700 ease-out"
                style={{ width: `${ready ? Math.min(100, pct) : 0}%`, backgroundColor: statusColor(pct, "#6366f1") }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
              {pct.toFixed(0)}% of budget · {budget - spent >= 0 ? `${fmtCurrency(budget - spent)} left` : `${fmtCurrency(spent - budget)} over`}
            </p>
          </div>

          <ul className="thin-scrollbar max-h-[300px] space-y-3 overflow-y-auto pr-1">
            {rows.map((r) => {
              const Icon = CATEGORIES[r.id].icon;
              const color = statusColor(r.pct, r.color);
              return (
                <li key={r.id}>
                  <button type="button" onClick={() => onCategoryClick(r.id)} className="group w-full text-left" title={`Filter to ${r.label}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: `${r.color}1f`, color: r.color }}>
                          <Icon className="size-3.5" />
                        </span>
                        <span className="truncate text-[13px] font-medium text-slate-700 group-hover:text-slate-900 dark:text-slate-200 dark:group-hover:text-white">{r.label}</span>
                      </span>
                      <span className="shrink-0 text-xs text-slate-400 tabular-nums">
                        <span className="font-medium text-slate-700 dark:text-slate-200">{fmtCurrency(r.spent)}</span> / {fmtCurrency(r.budget)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full transition-[width,background-color] duration-700 ease-out"
                        style={{ width: `${ready ? Math.min(100, r.pct) : 0}%`, backgroundColor: color }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] text-slate-400 tabular-nums dark:text-slate-500">
                      <span style={r.pct > 85 ? { color } : undefined}>{r.pct.toFixed(0)}% used</span>
                      <span>{r.budget - r.spent >= 0 ? `${fmtCurrency(r.budget - r.spent)} left` : `${fmtCurrency(r.spent - r.budget)} over`}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Panel>
  );
}
