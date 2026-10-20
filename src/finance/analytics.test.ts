import { describe, expect, it } from 'vitest';
import {
  analyzeReport,
  matchingRows,
  percentageChange,
  priorRange,
  rangeDays,
  rangeError,
  reportCsv,
  reportRange,
  reportTotals,
  shiftDate,
  trendBuckets,
  type ReportFilters,
} from './analytics';
import type { Entry } from './model';
const entry = (id: string, date: string, amount: number, overrides: Partial<Entry> = {}): Entry => ({
  id,
  date,
  amount,
  merchant: 'Cafe',
  type: 'expense',
  category: 'dining',
  account: 'checking',
  status: 'cleared',
  recurring: false,
  ...overrides,
});
const filters: ReportFilters = {
  start: '2026-10-01',
  end: '2026-10-20',
  account: 'all',
  category: 'all',
  status: 'all',
};
const rows = [
  entry('a', '2026-10-01', 100),
  entry('b', '2026-10-20', 50, { merchant: ' cafe ', account: 'credit', status: 'pending' }),
  entry('c', '2026-10-15', 1000, { type: 'income', category: 'salary', merchant: 'Employer' }),
  entry('d', '2026-09-11', 60),
  entry('e', '2026-09-30', 500, { type: 'income', category: 'salary' }),
  entry('outside', '2026-10-21', 999),
  entry('old', '2026-09-10', 999),
];
describe('report date semantics', () => {
  it('uses inclusive calendar days and leap days', () => {
    expect(rangeDays({ start: '2024-02-01', end: '2024-02-29' })).toBe(29);
    expect(shiftDate('2024-03-01', -1)).toBe('2024-02-29');
    expect(rangeDays({ start: '2026-03-07', end: '2026-03-09' })).toBe(3);
  });
  it('defines month-to-date and exact 30/90 day presets', () => {
    expect(reportRange('month', '2026-10-20')).toEqual({ start: '2026-10-01', end: '2026-10-20' });
    for (const [id, days] of [
      ['30d', 30],
      ['90d', 90],
    ] as const)
      expect(rangeDays(reportRange(id, '2026-10-20'))).toBe(days);
  });
  it('handles last month across the year boundary and leap February', () => {
    expect(reportRange('lastMonth', '2026-01-10')).toEqual({ start: '2025-12-01', end: '2025-12-31' });
    expect(reportRange('lastMonth', '2024-03-10').end).toBe('2024-02-29');
  });
  it('defines year to date', () =>
    expect(reportRange('year', '2026-10-20')).toEqual({ start: '2026-01-01', end: '2026-10-20' }));
  it('compares an equally long, non-overlapping preceding interval', () => {
    const prior = priorRange(filters);
    expect(prior).toEqual({ start: '2026-09-11', end: '2026-09-30' });
    expect(rangeDays(prior)).toBe(rangeDays(filters));
  });
  it.each([
    { start: '2026-02-30', end: '2026-03-01' },
    { start: 'invalid', end: '2026-10-20' },
    { start: '2026-10-21', end: '2026-10-20' },
    { start: '2026-10-01', end: '2026-10-21' },
    { start: '1899-01-01', end: '1900-01-01' },
    { start: '2000-01-01', end: '2026-10-20' },
  ])('rejects invalid ranges: %j', (r) => expect(rangeError(r, '2026-10-20')).not.toBe(''));
  it('accepts a valid single-day range', () =>
    expect(rangeError({ start: '2026-10-20', end: '2026-10-20' }, '2026-10-20')).toBe(''));
  it('prevents invalid ranges reaching the report loop', () =>
    expect(() => analyzeReport(rows, { ...filters, start: 'invalid' }, {}, 'day')).toThrow(RangeError));
});
describe('real record analytics', () => {
  it('includes date boundaries and pending records without counting outside records', () =>
    expect(matchingRows(rows, filters).map((t) => t.id)).toEqual(['a', 'b', 'c']));
  it('applies account, category and status conjunctively', () =>
    expect(
      matchingRows(rows, { ...filters, account: 'checking', category: 'dining', status: 'cleared' }).map(
        (t) => t.id,
      ),
    ).toEqual(['a']));
  it('uses the same filters for the prior period', () => {
    const r = analyzeReport(rows, { ...filters, account: 'credit' }, {}, 'day');
    expect(r.totals.expense).toBe(50);
    expect(r.previous.expense).toBe(0);
    expect(r.previous.income).toBe(0);
  });
  it('computes income, expenses, net, daily average, purchase average and savings rate', () => {
    const r = analyzeReport(rows, filters, {}, 'day');
    expect(r.totals).toMatchObject({
      income: 1000,
      expense: 150,
      net: 850,
      count: 3,
      averageDaily: 7.5,
      averagePurchase: 75,
      savingsRate: 85,
      pending: 1,
    });
    expect(r.previous).toMatchObject({ income: 500, expense: 60, net: 440 });
  });
  it('handles empty data without inventing a savings rate', () => {
    const t = reportTotals([], 20);
    expect(t.savingsRate).toBeNull();
    expect(t.averagePurchase).toBe(0);
    expect(t.averageDaily).toBe(0);
  });
  it('retains negative net flow and negative savings rate', () =>
    expect(
      reportTotals([entry('a', '2026-10-01', 200), entry('b', '2026-10-01', 100, { type: 'income' })], 1),
    ).toMatchObject({ net: -100, savingsRate: -100 }));
  it('does not invent percent growth from zero and supports negative net baselines', () => {
    expect(percentageChange(100, 0)).toBeNull();
    expect(percentageChange(0, 0)).toBe(0);
    expect(percentageChange(50, 100)).toBe(-50);
    expect(percentageChange(50, -100)).toBe(150);
  });
  it('normalizes merchant names and ranks expenses only', () => {
    const r = analyzeReport(rows, filters, {}, 'day');
    expect(r.merchants).toEqual([{ id: 'cafe', label: 'Cafe', amount: 150, count: 2 }]);
    expect(r.categories.find((c) => c.id === 'dining')).toMatchObject({
      amount: 150,
      share: 100,
      count: 2,
      previous: 60,
    });
  });
  it('account activity reconciles to the report and excludes opening balances/transfers by construction', () => {
    const r = analyzeReport(rows, filters, {}, 'day');
    expect(r.accounts.reduce((s, a) => s + a.net, 0)).toBe(r.totals.net);
    expect(r.accounts.find((a) => a.id === 'credit')?.net).toBe(-50);
  });
  it('weekday averages include occurrences with no spending', () => {
    const r = analyzeReport(
      [entry('a', '2026-10-05', 10)],
      { ...filters, start: '2026-10-05', end: '2026-10-18' },
      {},
      'week',
    );
    expect(r.weekdays[0]).toEqual({ day: 'Mon', amount: 10, occurrences: 2, average: 5 });
  });
  it('prorates monthly limits using actual calendar month lengths', () => {
    const r = analyzeReport(
      [],
      { ...filters, start: '2024-02-15', end: '2024-03-10' },
      { dining: 290 },
      'month',
    );
    expect(r.budgetRows.find((b) => b.id === 'dining')?.allowance).toBe(243.55);
  });
  it.each(['day', 'week', 'month'] as const)(
    '%s buckets reconcile to totals and comparison totals',
    (size) => {
      const r = analyzeReport(rows, filters, {}, size);
      expect(r.buckets.reduce((s, b) => s + b.expense, 0)).toBe(150);
      expect(r.buckets.reduce((s, b) => s + b.previousExpense, 0)).toBe(60);
      expect(r.buckets[r.buckets.length - 1]?.end).toBe(filters.end);
    },
  );
  it('zero fills missing dates and correctly aligns prior days', () => {
    const b = trendBuckets([rows[0]], [rows[3]], filters, 'day');
    expect(b).toHaveLength(20);
    expect(b[0]).toMatchObject({ expense: 100, previousExpense: 60, previousStart: '2026-09-11' });
    expect(b[1].expense).toBe(0);
  });
  it('income category filters produce no expense categories or merchant claims', () => {
    const r = analyzeReport(rows, { ...filters, category: 'salary' }, {}, 'day');
    expect(r.categories).toEqual([]);
    expect(r.merchants).toEqual([]);
    expect(r.totals.income).toBe(1000);
  });
  it('exports filtered report data and escapes spreadsheet formulas and quotes', () => {
    const r = analyzeReport(
      [entry('safe', '2026-10-01', 20, { merchant: '=SUM(1,2)"' })],
      filters,
      {},
      'day',
    );
    const text = reportCsv(r, filters, 'BDT');
    expect(text).toContain('"\'=SUM(1,2)"""');
    expect(text).toContain('"BDT"');
    expect(text).toContain('2026-09-11');
    expect(text).toContain('"expense","20","0"');
    expect(text).not.toContain('Employer');
  });
});
