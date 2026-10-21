import { catalogMaps, defaultCategories, defaultAccounts, type Catalog } from './catalog';
import type { AccountId, CategoryId } from '../lib/types';
import { iso, round, type Entry } from './model';

export interface ReportRange {
  start: string;
  end: string;
}
export interface ReportFilters extends ReportRange {
  account: AccountId | 'all';
  category: CategoryId | 'all';
  status: 'all' | 'pending' | 'cleared';
}
export type ReportPreset = 'month' | 'lastMonth' | '30d' | '90d' | 'year' | 'custom';
export type BucketSize = 'day' | 'week' | 'month';
export type ReportMetric = 'expense' | 'income' | 'net';
const DAY = 86400000;
// UTC calendar arithmetic avoids DST-length days, while ISO inputs remain local calendar dates.
const stamp = (date: string) => Date.parse(`${date}T00:00:00Z`);
export const shiftDate = (date: string, days: number) =>
  new Date(stamp(date) + days * DAY).toISOString().slice(0, 10);
export const rangeDays = (range: ReportRange) =>
  Math.round((stamp(range.end) - stamp(range.start)) / DAY) + 1;
export function rangeError(range: ReportRange, today = iso()): string {
  const valid = (s: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(stamp(s)) &&
    new Date(stamp(s)).toISOString().slice(0, 10) === s;
  if (!valid(range.start) || !valid(range.end)) return 'Choose valid start and end dates.';
  if (range.start > range.end) return 'The start date must be on or before the end date.';
  if (range.start < '1900-01-01' || range.end > today)
    return 'Choose dates between January 1, 1900 and today.';
  if (rangeDays(range) > 3660) return 'Choose a range of 3,660 days or fewer.';
  return '';
}
export function reportRange(preset: Exclude<ReportPreset, 'custom'>, today = iso()): ReportRange {
  if (preset === '30d' || preset === '90d')
    return { start: shiftDate(today, preset === '30d' ? -29 : -89), end: today };
  if (preset === 'year') return { start: `${today.slice(0, 4)}-01-01`, end: today };
  if (preset === 'lastMonth') {
    const end = shiftDate(`${today.slice(0, 7)}-01`, -1);
    return { start: `${end.slice(0, 7)}-01`, end };
  }
  return { start: `${today.slice(0, 7)}-01`, end: today };
}
export function priorRange(range: ReportRange): ReportRange {
  return { start: shiftDate(range.start, -rangeDays(range)), end: shiftDate(range.start, -1) };
}
export function matchingRows(rows: Entry[], filters: ReportFilters, range: ReportRange = filters) {
  return rows.filter(
    (t) =>
      t.date >= range.start &&
      t.date <= range.end &&
      (filters.account === 'all' || t.account === filters.account) &&
      (filters.category === 'all' || t.category === filters.category) &&
      (filters.status === 'all' || t.status === filters.status),
  );
}
export function reportTotals(rows: Entry[], days: number) {
  const income = round(rows.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0));
  const expenses = rows.filter((t) => t.type === 'expense');
  const expense = round(expenses.reduce((s, t) => s + t.amount, 0));
  const net = round(income - expense);
  return {
    income,
    expense,
    net,
    count: rows.length,
    expenseCount: expenses.length,
    averageDaily: round(expense / days),
    averagePurchase: expenses.length ? round(expense / expenses.length) : 0,
    savingsRate: income > 0 ? (net / income) * 100 : null,
    pending: rows.filter((t) => t.status === 'pending').length,
  };
}
export function percentageChange(current: number, previous: number): number | null {
  return previous === 0 ? (current === 0 ? 0 : null) : ((current - previous) / Math.abs(previous)) * 100;
}
export interface ReportBucket extends ReportRange {
  label: string;
  previousStart: string;
  previousEnd: string;
  income: number;
  expense: number;
  net: number;
  previousIncome: number;
  previousExpense: number;
  previousNet: number;
}
export function trendBuckets(
  rows: Entry[],
  previous: Entry[],
  range: ReportRange,
  size: BucketSize,
): ReportBucket[] {
  const prior = priorRange(range);
  const buckets: ReportBucket[] = [];
  for (let start = range.start; start <= range.end;) {
    let end = size === 'day' ? start : shiftDate(start, 6);
    if (size === 'month') {
      const d = new Date(stamp(start));
      end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    }
    if (end > range.end) end = range.end;
    const previousStart = shiftDate(prior.start, rangeDays({ start: range.start, end: start }) - 1);
    const previousEnd = shiftDate(previousStart, rangeDays({ start, end }) - 1);
    const currentTotals = reportTotals(
      rows.filter((t) => t.date >= start && t.date <= end),
      1,
    );
    const previousTotals = reportTotals(
      previous.filter((t) => t.date >= previousStart && t.date <= previousEnd),
      1,
    );
    buckets.push({
      start,
      end,
      previousStart,
      previousEnd,
      label: new Date(stamp(start)).toLocaleDateString('en-US', {
        timeZone: 'UTC',
        ...(size === 'month' ? { month: 'short', year: '2-digit' } : { month: 'short', day: 'numeric' }),
      }),
      income: currentTotals.income,
      expense: currentTotals.expense,
      net: currentTotals.net,
      previousIncome: previousTotals.income,
      previousExpense: previousTotals.expense,
      previousNet: previousTotals.net,
    });
    start = shiftDate(end, 1);
  }
  return buckets;
}
export const merchantKey = (name: string) => name.trim().toLocaleLowerCase();
export function analyzeReport(
  transactions: Entry[],
  filters: ReportFilters,
  budgets: Record<string, number>,
  size: BucketSize,
  catalog: Catalog = { categories: defaultCategories(), accounts: defaultAccounts() },
) {
  const { CATEGORIES, ACCOUNTS, EXPENSE_CATEGORIES }=catalogMaps(catalog);
  const invalid = rangeError(filters, filters.end);
  if (invalid) throw new RangeError(invalid);
  const previousRange = priorRange(filters);
  const rows = matchingRows(transactions, filters);
  const previousRows = matchingRows(transactions, filters, previousRange);
  const days = rangeDays(filters);
  const totals = reportTotals(rows, days);
  const previous = reportTotals(previousRows, days);
  const categories = EXPENSE_CATEGORIES.filter((id) => filters.category === 'all' || filters.category === id)
    .map((id) => {
      const current = rows.filter((t) => t.type === 'expense' && t.category === id);
      const amount = round(current.reduce((s, t) => s + t.amount, 0));
      return {
        id,
        label: CATEGORIES[id].label,
        amount,
        count: current.length,
        share: totals.expense ? (amount / totals.expense) * 100 : 0,
        previous: round(
          previousRows
            .filter((t) => t.type === 'expense' && t.category === id)
            .reduce((s, t) => s + t.amount, 0),
        ),
      };
    })
    .sort((a, b) => b.amount - a.amount);
  const merchantMap = new Map<string, { id: string; label: string; amount: number; count: number }>();
  for (const t of rows.filter((t) => t.type === 'expense')) {
    const id = merchantKey(t.merchant);
    const m = merchantMap.get(id) ?? { id, label: t.merchant.trim(), amount: 0, count: 0 };
    m.amount = round(m.amount + t.amount);
    m.count++;
    merchantMap.set(id, m);
  }
  const merchants = [...merchantMap.values()].sort((a, b) => b.amount - a.amount);
  const accounts = Object.values(ACCOUNTS)
    .filter((a) => filters.account === 'all' || a.id === filters.account)
    .map((a) => ({
      id: a.id,
      label: a.label,
      ...reportTotals(
        rows.filter((t) => t.account === a.id),
        days,
      ),
    }));
  const weekdays = Array.from({ length: 7 }, (_, i) => {
    const day = (i + 1) % 7;
    let occurrences = 0;
    for (let date = filters.start; date <= filters.end; date = shiftDate(date, 1))
      if (new Date(stamp(date)).getUTCDay() === day) occurrences++;
    const amount = round(
      rows
        .filter((t) => t.type === 'expense' && new Date(stamp(t.date)).getUTCDay() === day)
        .reduce((s, t) => s + t.amount, 0),
    );
    return {
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day],
      amount,
      occurrences,
      average: occurrences ? round(amount / occurrences) : 0,
    };
  });
  // Recurring monthly category allowances prorated by calendar days, not a fake historical budget snapshot.
  let monthWeight = 0;
  for (let date = filters.start; date <= filters.end; date = shiftDate(date, 1)) {
    const d = new Date(stamp(date));
    monthWeight += 1 / new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  }
  const budgetRows = categories.map((c) => ({ ...c, allowance: round((budgets[c.id] ?? 0) * monthWeight) }));
  const biggest = rows.filter((t) => t.type === 'expense').sort((a, b) => b.amount - a.amount)[0] ?? null;
  return {
    rows,
    previousRows,
    days,
    totals,
    previous,
    previousRange,
    categories,
    merchants,
    accounts,
    weekdays,
    budgetRows,
    biggest,
    buckets: trendBuckets(rows, previousRows, filters, size),
  };
}
export type AnalyticsReport = ReturnType<typeof analyzeReport>;
export function reportCsv(report: AnalyticsReport, filters: ReportFilters, currency: string) {
  const cell = (v: string | number) => {
    const s = String(v);
    return `"${(typeof v === 'string' && /^\s*[=+\-@\t\r]/.test(s) ? "'" : '') + s.replace(/"/g, '""')}"`;
  };
  const lines: (string | number)[][] = [
    ['Section', 'Label', 'Value', 'Previous / reference', 'Unit'],
    ['Period', 'Start', filters.start, report.previousRange.start, 'date'],
    ['Period', 'End', filters.end, report.previousRange.end, 'date'],
    ['Filter', 'Account', filters.account, '', 'id'],
    ['Filter', 'Category', filters.category, '', 'id'],
    ['Filter', 'Status', filters.status, '', 'status'],
    ...(['income', 'expense', 'net', 'count', 'averageDaily', 'averagePurchase'] as const).map((k) => [
      'Summary',
      k,
      report.totals[k],
      report.previous[k],
      k === 'count' ? 'records' : currency,
    ]),
    [
      'Summary',
      'Savings rate',
      report.totals.savingsRate ?? '',
      report.previous.savingsRate ?? '',
      'percent',
    ],
    ...report.buckets.flatMap((b) =>
      (['income', 'expense', 'net'] as const).map((k) => [
        'Trend',
        `${b.start} to ${b.end}: ${k}`,
        b[k],
        b[k === 'income' ? 'previousIncome' : k === 'expense' ? 'previousExpense' : 'previousNet'],
        currency,
      ]),
    ),
    ...report.categories.map((c) => ['Category', c.label, c.amount, c.previous, currency]),
    ...report.merchants.map((m) => ['Merchant', m.label, m.amount, m.count, `${currency} / count`]),
    ...report.accounts.map((a) => ['Account net flow', a.label, a.net, a.count, `${currency} / count`]),
    ...report.weekdays.map((d) => [
      'Weekday average',
      d.day,
      d.average,
      d.occurrences,
      `${currency} / occurrences`,
    ]),
    ...report.budgetRows.map((b) => ['Prorated budget', b.label, b.amount, b.allowance, currency]),
  ];
  return lines.map((line) => line.map(cell).join(',')).join('\r\n');
}
