import { useState } from "react";
import { ArrowLeft, MousePointerClick } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { fmtCurrency, fmtPercent, pluralize } from "@/lib/format";
import type { Slice } from "@/lib/types";
import { cn } from "@/utils/cn";
import { EmptyState } from "../ui/EmptyState";
import { Panel } from "../ui/Panel";
import { TooltipCard, TooltipRow, type TipProps } from "./ChartTooltip";

interface CategoryDonutProps {
  slices: Slice[];
  title: string;
  subtitle: string;
  centerLabel: string;
  drill: { label: string; onBack: () => void } | null;
  onSliceClick: (slice: Slice) => void;
  onReset: () => void;
  className?: string;
}

function DonutTooltip({ active, payload }: TipProps<Slice>) {
  const s = active ? payload?.[0]?.payload : undefined;
  if (!s) return null;
  return (
    <TooltipCard title={s.label}>
      <TooltipRow color={s.color} label="Amount" value={fmtCurrency(s.value, 2)} emphasis />
      <TooltipRow label="Share" value={fmtPercent(s.pct)} />
      <TooltipRow label="Transactions" value={s.count} />
    </TooltipCard>
  );
}

export function CategoryDonut({ slices, title, subtitle, centerLabel, drill, onSliceClick, onReset, className }: CategoryDonutProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIndex = slices.findIndex((s) => s.id === activeId);
  const active = activeIndex >= 0 ? slices[activeIndex] : null;
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const txCount = slices.reduce((sum, s) => sum + s.count, 0);

  return (
    <Panel
      className={className}
      title={title}
      subtitle={subtitle}
      actions={
        drill ? (
          <button
            type="button"
            onClick={drill.onBack}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
          >
            <ArrowLeft className="size-3.5" />
            {drill.label}
          </button>
        ) : (
          <span className="hidden items-center gap-1 text-[11px] text-slate-400 sm:inline-flex dark:text-slate-500">
            <MousePointerClick className="size-3.5" /> Click to drill in
          </span>
        )
      }
    >
      {slices.length === 0 ? (
        <EmptyState onReset={onReset} />
      ) : (
        <div className="grid items-center gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:grid-cols-1">
          <div className="relative mx-auto aspect-square w-full max-w-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="label"
                  innerRadius="70%"
                  outerRadius="98%"
                  paddingAngle={slices.length > 1 ? 2 : 0}
                  cornerRadius={6}
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                  isAnimationActive
                  animationDuration={850}
                  animationEasing="ease-out"
                  onMouseEnter={(_, i) => setActiveId(slices[i]?.id ?? null)}
                  onMouseLeave={() => setActiveId(null)}
                  onClick={(_, i) => slices[i] && onSliceClick(slices[i])}
                >
                  {slices.map((s, i) => (
                    <Cell
                      key={s.id}
                      fill={s.color}
                      fillOpacity={activeIndex < 0 || activeIndex === i ? 1 : 0.25}
                      style={{ transition: "fill-opacity 200ms ease", cursor: "pointer", outline: "none" }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} animationDuration={150} wrapperStyle={{ outline: "none" }} allowEscapeViewBox={{ x: true, y: true }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
              <span className="max-w-full truncate text-[11px] font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">
                {active ? active.label : centerLabel}
              </span>
              <span key={active?.id ?? "total"} className="animate-pop text-xl font-semibold tracking-tight text-slate-900 tabular-nums dark:text-white">
                {fmtCurrency(active ? active.value : total)}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {active ? `${fmtPercent(active.pct)} of total` : pluralize(txCount, "transaction")}
              </span>
            </div>
          </div>

          <ul className="space-y-0.5">
            {slices.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveId(s.id)}
                  onMouseLeave={() => setActiveId(null)}
                  onFocus={() => setActiveId(s.id)}
                  onBlur={() => setActiveId(null)}
                  onClick={() => onSliceClick(s)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-all duration-200",
                    activeIndex === i ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-800/50",
                    activeIndex >= 0 && activeIndex !== i && "opacity-45",
                  )}
                >
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-slate-700 dark:text-slate-200">{s.label}</span>
                  <span className="w-11 shrink-0 text-right text-xs text-slate-400 tabular-nums dark:text-slate-500">{s.pct.toFixed(1)}%</span>
                  <span className="w-[72px] shrink-0 text-right text-[13px] font-medium text-slate-900 tabular-nums dark:text-slate-100">{fmtCurrency(s.value)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}
