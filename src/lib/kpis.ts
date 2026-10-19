import {
  CalendarDays,
  CreditCard,
  HandCoins,
  Layers,
  PiggyBank,
  Receipt,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { Totals } from "./analytics";
import { fmtCurrency, fmtInt, fmtPercent, fmtSmart, pluralize } from "./format";
import type { SeriesPoint, ViewMode } from "./types";

export type Polarity = "up" | "down" | "neutral";

export interface KpiSpec {
  id: string;
  label: string;
  value: number;
  format: (n: number) => string;
  /** Change vs previous period, null when there's nothing to compare against. */
  delta: { value: number; unit: "pct" | "pts" } | null;
  previousText: string | null;
  goodWhen: Polarity;
  color: string;
  icon: LucideIcon;
  spark: number[];
  footnote: string;
}

function pctChange(cur: number, prev: number): number | null {
  if (!Number.isFinite(prev) || Math.abs(prev) < 0.01) return null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

const AVG_MONTH_DAYS = 30.4375;

export function buildKpis(mode: ViewMode, cur: Totals, prev: Totals | null, series: SeriesPoint[]): KpiSpec[] {
  const pct = (a: number, b: number | undefined) => {
    if (b === undefined) return null;
    const v = pctChange(a, b);
    return v === null ? null : { value: v, unit: "pct" as const };
  };
  const prevText = (fmt: (n: number) => string, v: number | undefined) => (v === undefined ? null : `Prev. ${fmt(v)}`);

  const incomeCard: KpiSpec = {
    id: "income",
    label: "Total income",
    value: cur.income,
    format: (n) => fmtCurrency(n),
    delta: pct(cur.income, prev?.income),
    previousText: prevText(fmtCurrency, prev?.income),
    goodWhen: "up",
    color: "#10b981",
    icon: HandCoins,
    spark: series.map((p) => p.income),
    footnote: pluralize(cur.incomeCount, "deposit"),
  };

  const spendCard: KpiSpec = {
    id: "expenses",
    label: "Total spending",
    value: cur.expenses,
    format: (n) => fmtCurrency(n),
    delta: pct(cur.expenses, prev?.expenses),
    previousText: prevText(fmtCurrency, prev?.expenses),
    goodWhen: "down",
    color: "#f43f5e",
    icon: CreditCard,
    spark: series.map((p) => p.expenses),
    footnote: pluralize(cur.expenseCount, "transaction"),
  };

  if (mode === "overview") {
    const months = cur.days / AVG_MONTH_DAYS;
    const rateDelta =
      cur.savingsRate !== null && prev && prev.savingsRate !== null
        ? { value: cur.savingsRate - prev.savingsRate, unit: "pts" as const }
        : null;
    return [
      incomeCard,
      spendCard,
      {
        id: "net",
        label: "Net savings",
        value: cur.net,
        format: (n) => fmtCurrency(n),
        delta: pct(cur.net, prev?.net),
        previousText: prevText(fmtCurrency, prev?.net),
        goodWhen: "up",
        color: "#6366f1",
        icon: PiggyBank,
        spark: series.map((p) => p.net),
        footnote: months >= 1.5 ? `≈ ${fmtCurrency(cur.net / months)} per month` : `≈ ${fmtSmart(cur.days ? cur.net / cur.days : 0)} per day`,
      },
      {
        id: "rate",
        label: "Savings rate",
        value: cur.savingsRate ?? 0,
        format: (n) => fmtPercent(n),
        delta: rateDelta,
        previousText: prev && prev.savingsRate !== null ? `Prev. ${fmtPercent(prev.savingsRate)}` : null,
        goodWhen: "up",
        color: "#f59e0b",
        icon: Target,
        spark: series.map((p) => (p.income > 0 ? Math.max(-100, (p.net / p.income) * 100) : 0)),
        footnote: (cur.savingsRate ?? 0) >= 20 ? "On track · goal is 20%" : "Below the 20% goal",
      },
    ];
  }

  if (mode === "spending") {
    const weeks = Math.max(1, cur.days / 7);
    return [
      spendCard,
      {
        id: "daily",
        label: "Avg. daily spend",
        value: cur.avgDailySpend,
        format: fmtSmart,
        delta: pct(cur.avgDailySpend, prev?.avgDailySpend),
        previousText: prevText(fmtSmart, prev?.avgDailySpend),
        goodWhen: "down",
        color: "#f97316",
        icon: CalendarDays,
        spark: series.map((p) => (p.days ? p.expenses / p.days : 0)),
        footnote: `Across ${pluralize(cur.days, "day")}`,
      },
      {
        id: "count",
        label: "Transactions",
        value: cur.expenseCount,
        format: fmtInt,
        delta: pct(cur.expenseCount, prev?.expenseCount),
        previousText: prevText(fmtInt, prev?.expenseCount),
        goodWhen: "neutral",
        color: "#0ea5e9",
        icon: Layers,
        spark: series.map((p) => p.expenseCount),
        footnote: `≈ ${(cur.expenseCount / weeks).toFixed(1)} per week`,
      },
      {
        id: "avgtx",
        label: "Avg. transaction",
        value: cur.avgTransaction,
        format: fmtSmart,
        delta: pct(cur.avgTransaction, prev?.avgTransaction),
        previousText: prevText(fmtSmart, prev?.avgTransaction),
        goodWhen: "down",
        color: "#a855f7",
        icon: Receipt,
        spark: series.map((p) => (p.expenseCount ? p.expenses / p.expenseCount : 0)),
        footnote: cur.maxExpenseTx ? `Largest: ${fmtSmart(cur.maxExpenseTx.amount)}` : "No purchases",
      },
    ];
  }

  // income-only view
  return [
    incomeCard,
    {
      id: "monthly",
      label: "Avg. monthly income",
      value: cur.avgMonthlyIncome,
      format: (n) => fmtCurrency(n),
      delta: pct(cur.avgMonthlyIncome, prev?.avgMonthlyIncome),
      previousText: prevText(fmtCurrency, prev?.avgMonthlyIncome),
      goodWhen: "up",
      color: "#3b82f6",
      icon: CalendarDays,
      spark: series.map((p) => (p.days ? (p.income / p.days) * AVG_MONTH_DAYS : 0)),
      footnote: "Normalized to a 30-day month",
    },
    {
      id: "deposits",
      label: "Deposits",
      value: cur.incomeCount,
      format: fmtInt,
      delta: pct(cur.incomeCount, prev?.incomeCount),
      previousText: prevText(fmtInt, prev?.incomeCount),
      goodWhen: "neutral",
      color: "#14b8a6",
      icon: Layers,
      spark: series.map((p) => p.incomeCount),
      footnote: `From ${pluralize(cur.incomeSources, "source")}`,
    },
    {
      id: "largest",
      label: "Largest deposit",
      value: cur.maxIncomeTx?.amount ?? 0,
      format: fmtSmart,
      delta: pct(cur.maxIncomeTx?.amount ?? 0, prev ? prev.maxIncomeTx?.amount ?? 0 : undefined),
      previousText: prev ? `Prev. ${fmtSmart(prev.maxIncomeTx?.amount ?? 0)}` : null,
      goodWhen: "up",
      color: "#8b5cf6",
      icon: Trophy,
      spark: series.map((p) => p.maxIncome),
      footnote: cur.maxIncomeTx ? cur.maxIncomeTx.merchant : "No deposits",
    },
  ];
}
