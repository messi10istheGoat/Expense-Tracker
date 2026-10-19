import { ChevronRight } from "lucide-react";
import type { MerchantRow } from "@/lib/analytics";
import { CATEGORIES } from "@/lib/categories";
import { fmtCurrency, pluralize } from "@/lib/format";
import type { TxType } from "@/lib/types";
import { EmptyState } from "./ui/EmptyState";
import { Panel } from "./ui/Panel";
import { TrendBadge } from "./ui/TrendBadge";

interface TopMerchantsProps {
  rows: MerchantRow[];
  focus: TxType;
  onSelect: (merchant: string) => void;
  onReset: () => void;
  className?: string;
}

export function TopMerchants({ rows, focus, onSelect, onReset, className }: TopMerchantsProps) {
  const max = rows[0]?.total ?? 1;
  return (
    <Panel
      className={className}
      title={focus === "expense" ? "Top merchants" : "Top income sources"}
      subtitle="Click one to see its transactions"
    >
      {rows.length === 0 ? (
        <EmptyState onReset={onReset} />
      ) : (
        <ol className="space-y-1">
          {rows.map((m, i) => {
            const meta = CATEGORIES[m.category];
            const Icon = meta.icon;
            return (
              <li key={m.merchant} className="animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                <button
                  type="button"
                  onClick={() => onSelect(m.merchant)}
                  className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}>
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[13px] font-medium text-slate-800 dark:text-slate-100">{m.merchant}</p>
                      <p className="shrink-0 text-[13px] font-semibold text-slate-900 tabular-nums dark:text-white">{fmtCurrency(m.total)}</p>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full transition-[width] duration-700 ease-out"
                        style={{ width: `${Math.max(4, (m.total / max) * 100)}%`, backgroundColor: meta.color }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {meta.label} · {pluralize(m.count, "txn")}
                      </p>
                      {m.change !== null ? (
                        <TrendBadge size="sm" delta={{ value: m.change, unit: "pct" }} goodWhen={focus === "expense" ? "down" : "up"} />
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">new</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500 dark:text-slate-600" />
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}
