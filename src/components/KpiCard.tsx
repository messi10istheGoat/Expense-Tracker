import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import type { KpiSpec } from "@/lib/kpis";
import { Sparkline } from "./ui/Sparkline";
import { TrendBadge } from "./ui/TrendBadge";

interface KpiCardProps {
  spec: KpiSpec;
  compareText: string;
  index: number;
}

export function KpiCard({ spec, compareText, index }: KpiCardProps) {
  const animated = useAnimatedNumber(spec.value);
  const Icon = spec.icon;

  return (
    <article
      className="group animate-fade-up relative min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_32px_-12px_rgba(15,23,42,0.16)] sm:p-5 dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-none dark:hover:border-slate-700"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 -right-12 size-36 rounded-full opacity-[0.10] blur-2xl transition-opacity duration-500 group-hover:opacity-[0.2] dark:opacity-[0.14]"
        style={{ backgroundColor: spec.color }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${spec.color}1a`, color: spec.color }}>
            <Icon className="size-[18px]" />
          </span>
          <h3 className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">{spec.label}</h3>
        </div>
        <TrendBadge delta={spec.delta} goodWhen={spec.goodWhen} />
      </div>

      <div className="relative mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[26px] leading-none font-semibold tracking-tight text-slate-900 tabular-nums sm:text-[28px] dark:text-white">
            {spec.format(animated)}
          </p>
          <p className="mt-2 truncate text-xs text-slate-500 dark:text-slate-400">{spec.footnote}</p>
        </div>
        <div className="w-24 shrink-0 sm:w-28">
          <Sparkline data={spec.spark} color={spec.color} height={44} />
        </div>
      </div>

      <div className="relative mt-4 flex items-center justify-between gap-2 border-t border-dashed border-slate-200 pt-3 text-[11px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
        <span className="truncate">{compareText}</span>
        <span className="shrink-0 tabular-nums">{spec.previousText ?? "No prior data"}</span>
      </div>
    </article>
  );
}
