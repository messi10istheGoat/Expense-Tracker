import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useChartColors, useTheme } from "@/hooks/useTheme";
import type { WeekdayStat } from "@/lib/analytics";
import { fmtCompact, fmtCurrency, fmtSmart, pluralize } from "@/lib/format";
import type { TxType } from "@/lib/types";
import { EmptyState } from "../ui/EmptyState";
import { Panel } from "../ui/Panel";
import { TooltipCard, TooltipRow, type TipProps } from "./ChartTooltip";

interface WeekdayChartProps {
  stats: WeekdayStat[];
  focus: TxType;
  onReset: () => void;
  className?: string;
}

function WeekdayTooltip({ active, payload, accent, focus }: TipProps<WeekdayStat> & { accent: string; focus: TxType }) {
  const s = active ? payload?.[0]?.payload : undefined;
  if (!s) return null;
  return (
    <TooltipCard title={s.day} footer={`${pluralize(s.occurrences, s.day)} in range`}>
      <TooltipRow color={accent} label={focus === "expense" ? "Avg. spend / day" : "Avg. income / day"} value={fmtSmart(s.avg)} emphasis />
      <TooltipRow label="Total" value={fmtCurrency(s.total, 2)} />
      <TooltipRow label="Transactions" value={s.count} />
    </TooltipCard>
  );
}

export function WeekdayChart({ stats, focus, onReset, className }: WeekdayChartProps) {
  const colors = useChartColors();
  const { isDark } = useTheme();
  const accent = focus === "expense" ? "#6366f1" : "#10b981";
  const soft = focus === "expense" ? (isDark ? "#312e81" : "#c7d2fe") : isDark ? "#064e3b" : "#a7f3d0";

  const { maxIndex, weekdayAvg, weekendAvg, hasData } = useMemo(() => {
    let max = -1;
    stats.forEach((s, i) => {
      if (s.avg > 0 && (max < 0 || s.avg > stats[max].avg)) max = i;
    });
    const avgOf = (list: WeekdayStat[]) => {
      const occ = list.reduce((a, s) => a + s.occurrences, 0);
      return occ ? list.reduce((a, s) => a + s.total, 0) / occ : 0;
    };
    return {
      maxIndex: max,
      weekdayAvg: avgOf(stats.slice(0, 5)),
      weekendAvg: avgOf(stats.slice(5)),
      hasData: stats.some((s) => s.total > 0),
    };
  }, [stats]);

  return (
    <Panel
      className={className}
      title={focus === "expense" ? "Spending by weekday" : "Income by weekday"}
      subtitle="Average per day · excludes recurring bills"
    >
      {!hasData ? (
        <div className="h-[300px]">
          <EmptyState onReset={onReset} />
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Weekdays</p>
              <p className="text-base font-semibold text-slate-900 tabular-nums dark:text-white">
                {fmtSmart(weekdayAvg)}
                <span className="text-xs font-normal text-slate-400">/day</span>
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Weekends</p>
              <p className="text-base font-semibold text-slate-900 tabular-nums dark:text-white">
                {fmtSmart(weekendAvg)}
                <span className="text-xs font-normal text-slate-400">/day</span>
              </p>
            </div>
          </div>
          <div className="h-52 sm:h-[218px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                <CartesianGrid vertical={false} stroke={colors.grid} strokeDasharray="3 3" />
                <XAxis dataKey="short" tickLine={false} axisLine={false} tick={{ fill: colors.axis, fontSize: 11 }} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: colors.axis, fontSize: 11 }} tickFormatter={(v: number) => fmtCompact(v)} width={48} />
                <Tooltip
                  content={<WeekdayTooltip accent={accent} focus={focus} />}
                  cursor={{ fill: colors.cursorFill, radius: 8 }}
                  animationDuration={180}
                  wrapperStyle={{ outline: "none" }}
                />
                <Bar dataKey="avg" name="Average" radius={[8, 8, 3, 3]} maxBarSize={38} animationDuration={850} animationEasing="ease-out">
                  {stats.map((s, i) => (
                    <Cell key={s.day} fill={i === maxIndex ? accent : soft} style={{ transition: "fill 300ms ease" }} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Panel>
  );
}
