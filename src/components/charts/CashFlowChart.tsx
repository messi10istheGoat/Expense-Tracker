import { useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useChartColors } from "@/hooks/useTheme";
import { round2, type Totals } from "@/lib/analytics";
import { SERIES_COLORS } from "@/lib/categories";
import { fmtCompact, fmtCurrency, fmtSigned, pluralize } from "@/lib/format";
import type { Granularity, SeriesPoint, ViewMode } from "@/lib/types";
import { cn } from "@/utils/cn";
import { EmptyState } from "../ui/EmptyState";
import { Panel } from "../ui/Panel";
import { SegmentedControl } from "../ui/SegmentedControl";
import { TooltipCard, TooltipRow, type TipProps } from "./ChartTooltip";

type SeriesKey = "income" | "expenses" | "net";
type View = "flow" | "cumulative";
type CashPoint = SeriesPoint & { cumulative: number };

interface CashFlowChartProps {
  series: SeriesPoint[];
  totals: Totals;
  mode: ViewMode;
  granularity: Granularity;
  allowed: Record<Granularity, boolean>;
  onGranularity: (g: Granularity) => void;
  onReset: () => void;
  className?: string;
}

const GRAN_LABEL: Record<Granularity, string> = { day: "daily", week: "weekly", month: "monthly" };

function CashFlowTooltip({
  active,
  payload,
  view,
  mode,
  netColor,
  cumulativeLabel,
  cumulativeColor,
}: TipProps<CashPoint> & { view: View; mode: ViewMode; netColor: string; cumulativeLabel: string; cumulativeColor: string }) {
  const p = active ? payload?.[0]?.payload : undefined;
  if (!p) return null;
  return (
    <TooltipCard title={p.rangeLabel} footer={pluralize(p.incomeCount + p.expenseCount, "transaction")}>
      {view === "flow" ? (
        <>
          {mode !== "spending" && <TooltipRow color={SERIES_COLORS.income} label="Income" value={fmtCurrency(p.income, 2)} />}
          {mode !== "income" && <TooltipRow color={SERIES_COLORS.expenses} label="Expenses" value={fmtCurrency(p.expenses, 2)} />}
          {mode === "overview" && <TooltipRow color={netColor} dashed label="Net" value={fmtSigned(p.net)} emphasis />}
        </>
      ) : (
        <>
          <TooltipRow color={cumulativeColor} label={cumulativeLabel} value={fmtCurrency(p.cumulative, 2)} emphasis />
          <TooltipRow label="This period" value={mode === "overview" ? fmtSigned(p.net) : fmtCurrency(mode === "spending" ? p.expenses : p.income, 2)} />
        </>
      )}
    </TooltipCard>
  );
}

export function CashFlowChart({ series, totals, mode, granularity, allowed, onGranularity, onReset, className }: CashFlowChartProps) {
  const colors = useChartColors();
  const [view, setView] = useState<View>("flow");
  const [hidden, setHidden] = useState<Record<SeriesKey, boolean>>({ income: false, expenses: false, net: false });

  const data: CashPoint[] = useMemo(() => {
    let run = 0;
    return series.map((p) => {
      run += mode === "overview" ? p.net : mode === "spending" ? p.expenses : p.income;
      return { ...p, cumulative: round2(run) };
    });
  }, [series, mode]);

  const legend: { key: SeriesKey; label: string; color: string; value: string; dashed?: boolean }[] = [];
  if (mode !== "spending") legend.push({ key: "income", label: "Income", color: SERIES_COLORS.income, value: fmtCurrency(totals.income) });
  if (mode !== "income") legend.push({ key: "expenses", label: "Expenses", color: SERIES_COLORS.expenses, value: fmtCurrency(totals.expenses) });
  if (mode === "overview") legend.push({ key: "net", label: "Net", color: colors.net, value: fmtSigned(totals.net, 0), dashed: true });

  const showIncome = view === "flow" && mode !== "spending" && !hidden.income;
  const showExpenses = view === "flow" && mode !== "income" && !hidden.expenses;
  const showNet = view === "flow" && mode === "overview" && !hidden.net;

  const cumulativeLabel = mode === "overview" ? "Cumulative net" : mode === "spending" ? "Cumulative spend" : "Cumulative income";
  const cumulativeColor = mode === "overview" ? colors.net : mode === "spending" ? SERIES_COLORS.expenses : SERIES_COLORS.income;
  const finalCumulative = data.length ? data[data.length - 1].cumulative : 0;
  const empty = totals.count === 0;

  return (
    <Panel
      className={className}
      title="Cash flow"
      subtitle={`${view === "flow" ? "Money in vs. money out" : "Running total across the period"} · ${GRAN_LABEL[granularity]}`}
      actions={
        <>
          <SegmentedControl
            size="sm"
            ariaLabel="Chart view"
            value={view}
            onChange={setView}
            options={[
              { value: "flow", label: "Flow" },
              { value: "cumulative", label: "Cumulative" },
            ]}
          />
          <SegmentedControl
            size="sm"
            ariaLabel="Group by"
            value={granularity}
            onChange={onGranularity}
            options={(["day", "week", "month"] as Granularity[]).map((g) => ({
              value: g,
              label: g[0].toUpperCase(),
              title: `Group ${GRAN_LABEL[g]}`,
              disabled: !allowed[g],
            }))}
          />
        </>
      }
    >
      <div className="mb-3 flex min-h-[44px] flex-wrap items-center gap-2">
        {view === "flow" ? (
          legend.map((item) => {
            const off = hidden[item.key];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setHidden((h) => ({ ...h, [item.key]: !h[item.key] }))}
                aria-pressed={!off}
                title={off ? `Show ${item.label}` : `Hide ${item.label}`}
                className={cn(
                  "group flex items-center gap-2.5 rounded-xl border px-3 py-1.5 text-left transition-all duration-200",
                  off
                    ? "border-dashed border-slate-200 opacity-50 dark:border-slate-700"
                    : "border-slate-200 bg-slate-50/60 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-slate-700",
                )}
              >
                {item.dashed ? (
                  <span className="h-0.5 w-4 rounded-full" style={{ backgroundImage: `linear-gradient(90deg, ${item.color} 60%, transparent 60%)`, backgroundSize: "5px 2px" }} />
                ) : (
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                )}
                <span className="text-xs text-slate-500 dark:text-slate-400">{item.label}</span>
                <span className="text-sm font-semibold text-slate-900 tabular-nums dark:text-slate-100">{item.value}</span>
              </button>
            );
          })
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums dark:text-white">
              {mode === "overview" ? fmtSigned(finalCumulative, 0) : fmtCurrency(finalCumulative)}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{cumulativeLabel.toLowerCase()} by end of period</span>
          </div>
        )}
      </div>

      <div className="h-64 sm:h-72 lg:h-[300px]">
        {empty ? (
          <EmptyState onReset={onReset} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: -4 }}>
              <defs>
                <linearGradient id="cf-income" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SERIES_COLORS.income} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={SERIES_COLORS.income} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cf-expenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SERIES_COLORS.expenses} stopOpacity={0.24} />
                  <stop offset="100%" stopColor={SERIES_COLORS.expenses} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cf-cumulative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={cumulativeColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={cumulativeColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={colors.grid} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: colors.axis, fontSize: 11 }}
                tickMargin={10}
                minTickGap={24}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: colors.axis, fontSize: 11 }}
                tickFormatter={(v: number) => fmtCompact(v)}
                width={56}
              />
              <Tooltip
                content={
                  <CashFlowTooltip
                    view={view}
                    mode={mode}
                    netColor={colors.net}
                    cumulativeLabel={cumulativeLabel}
                    cumulativeColor={cumulativeColor}
                  />
                }
                cursor={{ stroke: colors.cursor, strokeWidth: 1, strokeDasharray: "4 4" }}
                animationDuration={180}
                wrapperStyle={{ outline: "none" }}
              />
              {view === "cumulative" && <ReferenceLine y={0} stroke={colors.axis} strokeOpacity={0.45} />}
              {showIncome && (
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke={SERIES_COLORS.income}
                  strokeWidth={2.5}
                  fill="url(#cf-income)"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: colors.surface }}
                  animationDuration={900}
                  animationEasing="ease-out"
                />
              )}
              {showExpenses && (
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="Expenses"
                  stroke={SERIES_COLORS.expenses}
                  strokeWidth={2.5}
                  fill="url(#cf-expenses)"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: colors.surface }}
                  animationDuration={900}
                  animationEasing="ease-out"
                />
              )}
              {showNet && (
                <Line
                  type="monotone"
                  dataKey="net"
                  name="Net"
                  stroke={colors.net}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: colors.surface }}
                  animationDuration={900}
                  animationEasing="ease-out"
                />
              )}
              {view === "cumulative" && (
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  name={cumulativeLabel}
                  stroke={cumulativeColor}
                  strokeWidth={2.5}
                  fill="url(#cf-cumulative)"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: colors.surface }}
                  animationDuration={900}
                  animationEasing="ease-out"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </Panel>
  );
}
