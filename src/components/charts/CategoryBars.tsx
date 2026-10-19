import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type BarShapeProps } from "recharts";
import { useChartColors } from "@/hooks/useTheme";
import { CATEGORIES } from "@/lib/categories";
import { fmtCompact, fmtCurrency } from "@/lib/format";
import type { CategoryId, Granularity, SeriesPoint, TxType } from "@/lib/types";
import { cn } from "@/utils/cn";
import { EmptyState } from "../ui/EmptyState";
import { Panel } from "../ui/Panel";
import { TooltipCard, TooltipRow, type TipProps } from "./ChartTooltip";

type Row = { key: string; label: string; rangeLabel: string; __top: CategoryId | null; __total: number } & Partial<Record<CategoryId, number>>;

interface CategoryBarsProps {
  series: SeriesPoint[];
  focus: TxType;
  granularity: Granularity;
  onCategoryClick: (id: CategoryId) => void;
  onReset: () => void;
  className?: string;
}

const GRAN_LABEL: Record<Granularity, string> = { day: "Daily", week: "Weekly", month: "Monthly" };

function StackTooltip({ active, payload, cats, highlight }: TipProps<Row> & { cats: CategoryId[]; highlight: CategoryId | null }) {
  const row = active ? payload?.[0]?.payload : undefined;
  if (!row) return null;
  const items = cats.map((c) => ({ c, v: row[c] ?? 0 })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
  return (
    <TooltipCard title={row.rangeLabel} footer={<span className="flex justify-between font-medium text-slate-600 dark:text-slate-300"><span>Total</span><span className="tabular-nums">{fmtCurrency(row.__total, 2)}</span></span>}>
      {items.length === 0 && <p className="text-slate-400">No activity</p>}
      {items.map(({ c, v }) => (
        <div key={c} className={cn("transition-opacity", highlight && highlight !== c && "opacity-40")}>
          <TooltipRow color={CATEGORIES[c].color} label={CATEGORIES[c].label} value={fmtCurrency(v, 2)} emphasis={highlight === c} />
        </div>
      ))}
    </TooltipCard>
  );
}

/** Rounds only the top-most visible segment of each stack. */
function makeShape(cat: CategoryId) {
  return function StackSegment(props: BarShapeProps) {
    const { x, y, width, height, fill, fillOpacity, payload } = props;
    if (!height || height <= 0 || !width) return <g />;
    const isTop = (payload as Row | undefined)?.__top === cat;
    const r = isTop ? Math.min(5, width / 2, height) : 0;
    const d = r
      ? `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`
      : `M${x},${y} h${width} v${height} h${-width} Z`;
    return <path d={d} fill={fill} fillOpacity={fillOpacity} style={{ transition: "fill-opacity 200ms ease" }} />;
  };
}

export function CategoryBars({ series, focus, granularity, onCategoryClick, onReset, className }: CategoryBarsProps) {
  const colors = useChartColors();
  const [highlight, setHighlight] = useState<CategoryId | null>(null);

  const cats = useMemo(() => {
    const totals = new Map<CategoryId, number>();
    for (const p of series) {
      for (const [k, v] of Object.entries(p.cat) as [CategoryId, number][]) {
        if (CATEGORIES[k].type === focus) totals.set(k, (totals.get(k) ?? 0) + v);
      }
    }
    return [...totals.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  }, [series, focus]);

  const data: Row[] = useMemo(
    () =>
      series.map((p) => {
        const row: Row = { key: p.key, label: p.label, rangeLabel: p.rangeLabel, __top: null, __total: 0 };
        for (const c of cats) {
          const v = p.cat[c] ?? 0;
          row[c] = v;
          row.__total += v;
          if (v > 0) row.__top = c; // stacking order = cats order → last non-zero is on top
        }
        return row;
      }),
    [series, cats],
  );

  const shapes = useMemo(() => Object.fromEntries(cats.map((c) => [c, makeShape(c)])) as Record<CategoryId, ReturnType<typeof makeShape>>, [cats]);

  return (
    <Panel
      className={className}
      title={focus === "expense" ? "Spending by category" : "Income by source"}
      subtitle={`${GRAN_LABEL[granularity]} breakdown · hover a category to isolate it`}
    >
      {cats.length === 0 ? (
        <div className="h-[300px]">
          <EmptyState onReset={onReset} />
        </div>
      ) : (
        <>
          <div className="h-64 sm:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: -4 }} barCategoryGap="24%">
                <CartesianGrid vertical={false} stroke={colors.grid} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: colors.axis, fontSize: 11 }}
                  tickMargin={10}
                  minTickGap={20}
                  interval="preserveStartEnd"
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: colors.axis, fontSize: 11 }} tickFormatter={(v: number) => fmtCompact(v)} width={56} />
                <Tooltip
                  content={<StackTooltip cats={cats} highlight={highlight} />}
                  cursor={{ fill: colors.cursorFill, radius: 6 }}
                  animationDuration={180}
                  wrapperStyle={{ outline: "none" }}
                />
                {cats.map((c) => (
                  <Bar
                    key={c}
                    dataKey={c}
                    stackId="stack"
                    name={CATEGORIES[c].label}
                    fill={CATEGORIES[c].color}
                    fillOpacity={highlight && highlight !== c ? 0.18 : 1}
                    shape={shapes[c]}
                    maxBarSize={44}
                    animationDuration={850}
                    animationEasing="ease-out"
                    onMouseEnter={() => setHighlight(c)}
                    onMouseLeave={() => setHighlight(null)}
                    onClick={() => onCategoryClick(c)}
                    style={{ cursor: "pointer" }}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {cats.map((c) => (
              <button
                key={c}
                type="button"
                onMouseEnter={() => setHighlight(c)}
                onMouseLeave={() => setHighlight(null)}
                onFocus={() => setHighlight(c)}
                onBlur={() => setHighlight(null)}
                onClick={() => onCategoryClick(c)}
                title={`Filter to ${CATEGORIES[c].label}`}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-200",
                  highlight === c
                    ? "border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:text-slate-300 dark:hover:border-slate-700",
                  highlight && highlight !== c && "opacity-50",
                )}
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: CATEGORIES[c].color }} />
                {CATEGORIES[c].label}
              </button>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}
