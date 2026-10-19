import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { Polarity } from "@/lib/kpis";
import { cn } from "@/utils/cn";

interface TrendBadgeProps {
  delta: { value: number; unit: "pct" | "pts" } | null;
  goodWhen: Polarity;
  size?: "sm" | "md";
  className?: string;
}

export function TrendBadge({ delta, goodWhen, size = "md", className }: TrendBadgeProps) {
  const base = cn(
    "inline-flex items-center gap-0.5 rounded-full font-semibold tabular-nums transition-colors duration-300",
    size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs",
    className,
  );

  if (!delta || !Number.isFinite(delta.value)) {
    return (
      <span className={cn(base, "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400")} title="No data for the previous period">
        <Minus className="size-3" /> n/a
      </span>
    );
  }

  const v = delta.value;
  const flat = Math.abs(v) < 0.05;
  const up = v > 0;
  const good = goodWhen === "neutral" || flat ? null : goodWhen === "up" ? up : !up;
  const tone =
    good === null
      ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
      : good
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
        : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400";
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  const abs = Math.abs(v);
  const text = delta.unit === "pts" ? `${abs.toFixed(1)} pts` : `${abs >= 100 ? abs.toFixed(0) : abs.toFixed(1)}%`;

  return (
    <span className={cn(base, tone)}>
      <Icon className={size === "sm" ? "size-3" : "size-3.5"} strokeWidth={2.5} />
      {text}
    </span>
  );
}
