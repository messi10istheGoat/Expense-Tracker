import { CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "./categories";
import {
  addDays,
  addMonths,
  daysInMonth,
  diffDays,
  endOfDay,
  rangeLength,
  startOfDay,
  startOfMonth,
  startOfWeek,
  toISODate,
} from "./dates";
import { fmtCurrency, fmtDate, fmtDateLong, fmtDateShort, fmtMonth, fmtMonthLong, fmtRange, fmtSmart } from "./format";
import type {
  CategoryId,
  DateRange,
  ExpenseCategoryId,
  Filters,
  Granularity,
  RangePreset,
  SeriesPoint,
  Slice,
  Transaction,
  TxType,
  ViewMode,
} from "./types";

export const round2 = (n: number) => Math.round(n * 100) / 100;
const AVG_MONTH_DAYS = 30.4375;

// ───────────────────────────────────────────── Ranges

export const PRESETS: { value: Exclude<RangePreset, "custom">; label: string; long: string }[] = [
  { value: "7d", label: "7D", long: "Last 7 days" },
  { value: "30d", label: "30D", long: "Last 30 days" },
  { value: "90d", label: "90D", long: "Last 90 days" },
  { value: "6m", label: "6M", long: "Last 6 months" },
  { value: "ytd", label: "YTD", long: "Year to date" },
  { value: "12m", label: "12M", long: "Last 12 months" },
  { value: "all", label: "All", long: "All time" },
];

export function presetLabel(preset: RangePreset): string {
  return PRESETS.find((p) => p.value === preset)?.long ?? "Custom range";
}

export function presetRange(preset: Exclude<RangePreset, "custom">, today: Date, dataStart: Date): DateRange {
  const to = startOfDay(today);
  switch (preset) {
    case "7d":
      return { from: addDays(to, -6), to };
    case "30d":
      return { from: addDays(to, -29), to };
    case "90d":
      return { from: addDays(to, -89), to };
    // Month-aligned so monthly buckets are complete (current month is month-to-date)
    case "6m":
      return { from: startOfMonth(addMonths(to, -5)), to };
    case "ytd":
      return { from: new Date(to.getFullYear(), 0, 1), to };
    case "12m":
      return { from: startOfMonth(addMonths(to, -11)), to };
    case "all":
      return { from: startOfDay(dataStart), to };
  }
}

export function previousRange(range: DateRange): DateRange {
  const len = rangeLength(range);
  return { from: addDays(range.from, -len), to: addDays(range.from, -1) };
}

export function compareLabel(preset: RangePreset, range: DateRange): string {
  switch (preset) {
    case "7d":
      return "vs prior 7 days";
    case "30d":
      return "vs prior 30 days";
    case "90d":
      return "vs prior 90 days";
    case "6m":
      return "vs prior 6 months";
    case "12m":
      return "vs prior 12 months";
    default:
      return `vs prior ${rangeLength(range)} days`;
  }
}

// ───────────────────────────────────────────── Filtering

export function filterTransactions(
  txs: Transaction[],
  range: DateRange,
  f: Pick<Filters, "type" | "accounts" | "categories">,
): Transaction[] {
  const fromMs = startOfDay(range.from).getTime();
  const toMs = endOfDay(range.to).getTime();
  return txs.filter((t) => {
    const ms = t.date.getTime();
    if (ms < fromMs || ms > toMs) return false;
    if (f.type !== "all" && t.type !== f.type) return false;
    if (f.accounts.length && !f.accounts.includes(t.account)) return false;
    if (f.categories.length && !f.categories.includes(t.category)) return false;
    return true;
  });
}

export function getViewMode(f: Pick<Filters, "type" | "categories">): ViewMode {
  const anyCat = f.categories.length === 0;
  const income = f.type !== "expense" && (anyCat || f.categories.some((c) => CATEGORIES[c].type === "income"));
  const expense = f.type !== "income" && (anyCat || f.categories.some((c) => CATEGORIES[c].type === "expense"));
  if (income && expense) return "overview";
  if (income) return "income";
  return "spending";
}

// ───────────────────────────────────────────── Totals

export interface Totals {
  income: number;
  expenses: number;
  net: number;
  savingsRate: number | null;
  incomeCount: number;
  expenseCount: number;
  count: number;
  days: number;
  avgDailySpend: number;
  avgTransaction: number;
  avgMonthlyIncome: number;
  incomeSources: number;
  maxIncomeTx: Transaction | null;
  maxExpenseTx: Transaction | null;
}

export function computeTotals(txs: Transaction[], days: number): Totals {
  let income = 0;
  let expenses = 0;
  let incomeCount = 0;
  let expenseCount = 0;
  let maxIncomeTx: Transaction | null = null;
  let maxExpenseTx: Transaction | null = null;
  const sources = new Set<string>();
  for (const t of txs) {
    if (t.type === "income") {
      income += t.amount;
      incomeCount++;
      sources.add(t.merchant);
      if (!maxIncomeTx || t.amount > maxIncomeTx.amount) maxIncomeTx = t;
    } else {
      expenses += t.amount;
      expenseCount++;
      if (!maxExpenseTx || t.amount > maxExpenseTx.amount) maxExpenseTx = t;
    }
  }
  income = round2(income);
  expenses = round2(expenses);
  const net = round2(income - expenses);
  return {
    income,
    expenses,
    net,
    savingsRate: income > 0 ? (net / income) * 100 : null,
    incomeCount,
    expenseCount,
    count: txs.length,
    days,
    avgDailySpend: days ? expenses / days : 0,
    avgTransaction: expenseCount ? expenses / expenseCount : 0,
    avgMonthlyIncome: days ? (income / days) * AVG_MONTH_DAYS : 0,
    incomeSources: sources.size,
    maxIncomeTx,
    maxExpenseTx,
  };
}

// ───────────────────────────────────────────── Time series

export function autoGranularity(range: DateRange): Granularity {
  const n = rangeLength(range);
  if (n <= 35) return "day";
  if (n <= 150) return "week";
  return "month";
}

export function allowedGranularities(range: DateRange): Record<Granularity, boolean> {
  const n = rangeLength(range);
  return { day: n <= 120, week: n >= 14 && n <= 800, month: n >= 60 };
}

function bucketStart(d: Date, g: Granularity): Date {
  if (g === "day") return startOfDay(d);
  if (g === "week") return startOfWeek(d);
  return startOfMonth(d);
}

function nextBucket(d: Date, g: Granularity): Date {
  if (g === "day") return addDays(d, 1);
  if (g === "week") return addDays(d, 7);
  return addMonths(d, 1);
}

function axisLabel(d: Date, g: Granularity, multiYear: boolean): string {
  if (g === "month") return multiYear ? `${fmtMonth(d)} ’${String(d.getFullYear()).slice(2)}` : fmtMonth(d);
  return fmtDateShort(d);
}

function bucketRangeLabel(start: Date, end: Date, g: Granularity): string {
  if (g === "day") return fmtDateLong(start);
  if (g === "month" && start.getDate() === 1 && end.getDate() === daysInMonth(end)) return fmtMonthLong(start);
  return fmtRange(start, end);
}

export function aggregateSeries(txs: Transaction[], range: DateRange, g: Granularity): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  const index = new Map<string, SeriesPoint>();
  const multiYear = range.from.getFullYear() !== range.to.getFullYear();
  const rangeFrom = startOfDay(range.from);
  const rangeTo = startOfDay(range.to);

  for (let cursor = bucketStart(rangeFrom, g); cursor <= rangeTo; cursor = nextBucket(cursor, g)) {
    const lastDay = addDays(nextBucket(cursor, g), -1);
    const start = cursor < rangeFrom ? rangeFrom : cursor;
    const end = lastDay > rangeTo ? rangeTo : lastDay;
    const key = toISODate(cursor);
    const point: SeriesPoint = {
      key,
      start,
      end,
      label: axisLabel(cursor, g, multiYear),
      rangeLabel: bucketRangeLabel(start, end, g),
      days: diffDays(start, end) + 1,
      income: 0,
      expenses: 0,
      net: 0,
      incomeCount: 0,
      expenseCount: 0,
      maxIncome: 0,
      maxExpense: 0,
      cat: {},
    };
    points.push(point);
    index.set(key, point);
  }

  for (const t of txs) {
    const p = index.get(toISODate(bucketStart(t.date, g)));
    if (!p) continue;
    if (t.type === "income") {
      p.income += t.amount;
      p.incomeCount++;
      if (t.amount > p.maxIncome) p.maxIncome = t.amount;
    } else {
      p.expenses += t.amount;
      p.expenseCount++;
      if (t.amount > p.maxExpense) p.maxExpense = t.amount;
    }
    p.cat[t.category] = (p.cat[t.category] ?? 0) + t.amount;
  }

  for (const p of points) {
    p.income = round2(p.income);
    p.expenses = round2(p.expenses);
    p.net = round2(p.income - p.expenses);
    for (const k of Object.keys(p.cat) as CategoryId[]) p.cat[k] = round2(p.cat[k] ?? 0);
  }
  return points;
}

// ───────────────────────────────────────────── Breakdowns

export function sumByCategory(txs: Transaction[], type: TxType): Map<CategoryId, number> {
  const sums = new Map<CategoryId, number>();
  for (const t of txs) {
    if (t.type !== type) continue;
    sums.set(t.category, (sums.get(t.category) ?? 0) + t.amount);
  }
  return sums;
}

export function breakdownByCategory(txs: Transaction[], type: TxType): Slice[] {
  const sums = new Map<CategoryId, { value: number; count: number }>();
  let total = 0;
  for (const t of txs) {
    if (t.type !== type) continue;
    const s = sums.get(t.category) ?? { value: 0, count: 0 };
    s.value += t.amount;
    s.count++;
    sums.set(t.category, s);
    total += t.amount;
  }
  const ids: CategoryId[] = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  return ids
    .filter((id) => (sums.get(id)?.value ?? 0) > 0)
    .map((id) => {
      const s = sums.get(id)!;
      return {
        id,
        categoryId: id,
        label: CATEGORIES[id].label,
        value: round2(s.value),
        pct: total ? (s.value / total) * 100 : 0,
        color: CATEGORIES[id].color,
        count: s.count,
      };
    })
    .sort((a, b) => b.value - a.value);
}

const MERCHANT_PALETTE = ["#6366f1", "#0ea5e9", "#22c55e", "#f97316", "#ec4899", "#a855f7"];
const OTHER_COLOR = "#94a3b8";

export function breakdownByMerchant(txs: Transaction[], type: TxType, topN = 6): Slice[] {
  const sums = new Map<string, { value: number; count: number }>();
  let total = 0;
  for (const t of txs) {
    if (t.type !== type) continue;
    const s = sums.get(t.merchant) ?? { value: 0, count: 0 };
    s.value += t.amount;
    s.count++;
    sums.set(t.merchant, s);
    total += t.amount;
  }
  const sorted = [...sums.entries()].sort((a, b) => b[1].value - a[1].value);
  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN);
  const slices: Slice[] = top.map(([merchant, s], i) => ({
    id: `m:${merchant}`,
    label: merchant,
    value: round2(s.value),
    pct: total ? (s.value / total) * 100 : 0,
    color: MERCHANT_PALETTE[i % MERCHANT_PALETTE.length],
    count: s.count,
  }));
  if (rest.length) {
    const value = rest.reduce((acc, [, s]) => acc + s.value, 0);
    const count = rest.reduce((acc, [, s]) => acc + s.count, 0);
    slices.push({
      id: "m:__other",
      label: `Other (${rest.length})`,
      value: round2(value),
      pct: total ? (value / total) * 100 : 0,
      color: OTHER_COLOR,
      count,
    });
  }
  return slices;
}

// ───────────────────────────────────────────── Weekday patterns

export interface WeekdayStat {
  day: string;
  short: string;
  total: number;
  avg: number;
  occurrences: number;
  count: number;
}

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function weekdayStats(txs: Transaction[], range: DateRange, type: TxType): WeekdayStat[] {
  const occurrences = new Array<number>(7).fill(0);
  const len = rangeLength(range);
  for (let i = 0; i < len; i++) occurrences[(addDays(range.from, i).getDay() + 6) % 7]++;
  const totals = new Array<number>(7).fill(0);
  const counts = new Array<number>(7).fill(0);
  for (const t of txs) {
    if (t.type !== type || t.recurring) continue; // recurring bills would skew the pattern
    const i = (t.date.getDay() + 6) % 7;
    totals[i] += t.amount;
    counts[i]++;
  }
  return WEEKDAYS.map((day, i) => ({
    day,
    short: day.slice(0, 3),
    total: round2(totals[i]),
    count: counts[i],
    occurrences: occurrences[i],
    avg: occurrences[i] ? round2(totals[i] / occurrences[i]) : 0,
  }));
}

// ───────────────────────────────────────────── Budgets

export interface BudgetRow {
  id: ExpenseCategoryId;
  label: string;
  color: string;
  spent: number;
  budget: number;
  pct: number;
}

export function budgetProgress(txs: Transaction[], range: DateRange, selected: CategoryId[]): BudgetRow[] {
  const months = rangeLength(range) / AVG_MONTH_DAYS;
  const spent = sumByCategory(txs, "expense");
  return EXPENSE_CATEGORIES.filter((c) => selected.length === 0 || selected.includes(c))
    .map((id) => {
      const budget = round2((CATEGORIES[id].budget ?? 0) * months);
      const s = round2(spent.get(id) ?? 0);
      return { id, label: CATEGORIES[id].label, color: CATEGORIES[id].color, spent: s, budget, pct: budget ? (s / budget) * 100 : 0 };
    })
    .sort((a, b) => b.pct - a.pct);
}

// ───────────────────────────────────────────── Merchants

export interface MerchantRow {
  merchant: string;
  category: CategoryId;
  total: number;
  count: number;
  change: number | null;
}

export function topMerchants(current: Transaction[], previous: Transaction[] | null, type: TxType, n = 6): MerchantRow[] {
  const agg = new Map<string, { total: number; count: number; cats: Map<CategoryId, number> }>();
  for (const t of current) {
    if (t.type !== type) continue;
    const a = agg.get(t.merchant) ?? { total: 0, count: 0, cats: new Map<CategoryId, number>() };
    a.total += t.amount;
    a.count++;
    a.cats.set(t.category, (a.cats.get(t.category) ?? 0) + 1);
    agg.set(t.merchant, a);
  }
  const prev = new Map<string, number>();
  for (const t of previous ?? []) {
    if (t.type === type) prev.set(t.merchant, (prev.get(t.merchant) ?? 0) + t.amount);
  }
  return [...agg.entries()]
    .map(([merchant, a]) => {
      const category = [...a.cats.entries()].sort((x, y) => y[1] - x[1])[0][0];
      const p = prev.get(merchant) ?? 0;
      return {
        merchant,
        category,
        total: round2(a.total),
        count: a.count,
        change: previous && p > 0 ? ((a.total - p) / p) * 100 : null,
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, n);
}

// ───────────────────────────────────────────── Insights

export type InsightKind = "trend-up" | "trend-down" | "savings" | "calendar" | "receipt" | "repeat";

export interface Insight {
  id: string;
  kind: InsightKind;
  tone: "positive" | "negative" | "neutral";
  title: string;
  detail: string;
}

export function buildInsights(args: {
  current: Transaction[];
  previous: Transaction[] | null;
  totals: Totals;
  mode: ViewMode;
  weekdays: WeekdayStat[];
}): Insight[] {
  const { current, previous, totals, mode, weekdays } = args;
  const focus: TxType = mode === "income" ? "income" : "expense";
  const out: Insight[] = [];

  // Biggest category movement vs the previous period
  if (previous) {
    const cur = sumByCategory(current, focus);
    const prev = sumByCategory(previous, focus);
    let best: { id: CategoryId; diff: number; pct: number } | null = null;
    for (const [id, p] of prev) {
      if (p < 40) continue;
      const diff = (cur.get(id) ?? 0) - p;
      if (!best || Math.abs(diff) > Math.abs(best.diff)) best = { id, diff, pct: (diff / p) * 100 };
    }
    if (best && Math.abs(best.pct) >= 5) {
      const up = best.diff > 0;
      const good = focus === "expense" ? !up : up;
      out.push({
        id: "movement",
        kind: up ? "trend-up" : "trend-down",
        tone: good ? "positive" : "negative",
        title: `${CATEGORIES[best.id].label} ${up ? "up" : "down"} ${Math.abs(best.pct).toFixed(0)}%`,
        detail: `${fmtCurrency(Math.abs(best.diff))} ${up ? "more" : "less"} than the previous period.`,
      });
    }
  }

  // Savings rate
  if (mode === "overview" && totals.savingsRate !== null) {
    const r = totals.savingsRate;
    out.push({
      id: "savings",
      kind: "savings",
      tone: r >= 20 ? "positive" : r >= 0 ? "neutral" : "negative",
      title: r >= 0 ? `You kept ${r.toFixed(0)}% of your income` : `Overspent by ${fmtCurrency(-totals.net)}`,
      detail:
        r >= 20
          ? "Above the 20% savings guideline — nice work."
          : r >= 0
            ? "Below the 20% guideline — trimming lifestyle spend could close the gap."
            : "Spending exceeded income during this period.",
    });
  }

  // Priciest weekday
  const ranked = [...weekdays].sort((a, b) => b.avg - a.avg);
  const top = ranked[0];
  if (top && top.avg > 0) {
    const others = weekdays.filter((w) => w.day !== top.day);
    const otherOcc = others.reduce((s, w) => s + w.occurrences, 0);
    const otherAvg = otherOcc ? others.reduce((s, w) => s + w.total, 0) / otherOcc : 0;
    out.push({
      id: "weekday",
      kind: "calendar",
      tone: "neutral",
      title: focus === "expense" ? `${top.day}s are your priciest day` : `Most income lands on ${top.day}s`,
      detail: `Avg ${fmtSmart(top.avg)} vs ${fmtSmart(otherAvg)} on other days (excl. recurring).`,
    });
  }

  // Subscriptions
  if (focus === "expense") {
    const subs = new Map<string, number>();
    for (const t of current) if (t.note === "Subscription") subs.set(t.merchant, t.amount);
    if (subs.size) {
      const monthly = [...subs.values()].reduce((s, v) => s + v, 0);
      const names = [...subs.keys()];
      out.push({
        id: "subs",
        kind: "repeat",
        tone: "neutral",
        title: `Subscriptions cost ${fmtCurrency(monthly, 2)}/mo`,
        detail: `${names.length} active: ${names.slice(0, 3).join(", ")}${names.length > 3 ? ` +${names.length - 3} more` : ""}.`,
      });
    }
  }

  // Largest single transaction
  const largest = focus === "expense" ? totals.maxExpenseTx : totals.maxIncomeTx;
  if (largest) {
    out.push({
      id: "largest",
      kind: "receipt",
      tone: "neutral",
      title: `Largest ${focus === "expense" ? "expense" : "deposit"}: ${largest.merchant}`,
      detail: `${fmtCurrency(largest.amount, 2)} on ${fmtDate(largest.date)} · ${CATEGORIES[largest.category].label}`,
    });
  }

  return out.slice(0, 4);
}
