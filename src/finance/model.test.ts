import { describe, expect, it } from 'vitest';
import {
  advanceDue,
  balance,
  csv,
  iso,
  localDate,
  makeWorkspace,
  monthKey,
  parseQuickEntry,
  payBill,
  plan,
  round,
  totals,
  upcomingTotal,
  validateWorkspace,
  type Bill,
  type Entry,
} from './model';
const now = new Date(2026, 9, 19, 12);
const entry = (overrides: Partial<Entry> = {}): Entry => ({
  id: 'one',
  date: '2026-10-19',
  merchant: 'Coffee',
  amount: 6.5,
  category: 'dining',
  account: 'checking',
  type: 'expense',
  status: 'cleared',
  recurring: false,
  ...overrides,
});
const bill: Bill = {
  id: 'rent',
  name: 'Rent',
  amount: 500,
  nextDue: '2026-10-20',
  category: 'housing',
  account: 'checking',
  frequency: 'monthly',
};
describe('workspace and backup integrity', () => {
  it('round-trips generated demo data through JSON and validation', () => {
    const w = makeWorkspace(true, now);
    expect(w.transactions.length).toBeGreaterThan(100);
    expect(validateWorkspace(JSON.parse(JSON.stringify(w)))).toEqual(w);
  });
  it('starts a personal workspace without demo money', () => {
    const w = makeWorkspace(false, now);
    expect(w.demo).toBe(false);
    expect(balance(w)).toBe(0);
    expect(w.transactions).toEqual([]);
    expect(w.goals).toEqual([]);
    expect(w.profile.monthlyIncome).toBe(0);
  });
  it('generates deliberate, consistent demo balances', () => {
    const w = makeWorkspace(true, now);
    expect(balance(w, 'checking')).toBe(4280.5);
    expect(balance(w, 'credit')).toBe(-684.2);
    expect(balance(w)).toBe(16286.3);
  });
  it.each([null, {}, { version: 2 }, 'not a backup'])('rejects malformed input %j', (value) =>
    expect(() => validateWorkspace(value)).toThrow('valid Spendwise backup'),
  );
  it.each([-5, 0, Infinity, NaN])('rejects invalid transaction amount %s', (amount) => {
    const w = makeWorkspace(false);
    w.transactions = [entry({ amount })];
    expect(() => validateWorkspace(w)).toThrow();
  });
  it('rejects income categorized as an expense', () => {
    const w = makeWorkspace(false);
    w.transactions = [entry({ type: 'income' })];
    expect(() => validateWorkspace(w)).toThrow();
  });
  it('rejects duplicate transaction IDs', () => {
    const w = makeWorkspace(false);
    w.transactions = [entry(), entry()];
    expect(() => validateWorkspace(w)).toThrow();
  });
  it('rejects invalid dates and unknown/prototype account names', () => {
    const w = makeWorkspace(false);
    w.transactions = [entry({ date: '2026-02-31' })];
    expect(() => validateWorkspace(w)).toThrow();
    w.transactions = [entry({ account: '__proto__' as Entry['account'] })];
    expect(() => validateWorkspace(w)).toThrow();
  });
  it('rejects negative goal contributions, malformed bill dates, and wishlist prices', () => {
    const w = makeWorkspace(true, now);
    w.goals[0].monthly = -1;
    expect(() => validateWorkspace(w)).toThrow();
    const b = makeWorkspace(true, now);
    b.bills[0].nextDue = '2026-13-01';
    expect(() => validateWorkspace(b)).toThrow();
    const c = makeWorkspace(false);
    c.wishes = [{ id: 'x', name: 'Laptop', amount: -1, createdAt: now.toISOString() }];
    expect(() => validateWorkspace(c)).toThrow();
  });
});
describe('financial calculations', () => {
  it('sums currency without floating-point drift and treats pending as real spending', () => {
    const t = totals([
      entry({ amount: 0.1 }),
      entry({ amount: 0.2, status: 'pending' }),
      entry({ amount: 1, type: 'income', category: 'salary' }),
    ]);
    expect(t.expense).toBe(0.3);
    expect(t.net).toBe(0.7);
    expect(t.rate).toBe(70);
    expect(round(1.005)).toBe(1.01);
  });
  it('does not invent a savings rate without income', () => {
    expect(totals([entry()]).rate).toBe(0);
  });
  it('balances opening funds, income, expenses, credit debt, and account scope', () => {
    const w = makeWorkspace(false);
    w.openings.checking = 100;
    w.openings.credit = -50;
    w.transactions = [
      entry({ amount: 10 }),
      entry({ id: 'two', amount: 30, category: 'salary', type: 'income' }),
    ];
    expect(balance(w, 'checking')).toBe(120);
    expect(balance(w)).toBe(70);
  });
  it('reserves current/overdue next bills, excluding future-month commitments', () => {
    const w = makeWorkspace(false);
    w.bills = [
      bill,
      { ...bill, id: 'old', nextDue: '2026-09-30' },
      { ...bill, id: 'next', nextDue: '2026-11-01' },
    ];
    expect(upcomingTotal(w, '2026-10')).toBe(1000);
  });
  it('explains planned room, goal allocations, and the inclusive days remaining', () => {
    const w = makeWorkspace(false);
    w.profile.monthlyIncome = 2000;
    w.transactions = [entry({ amount: 100 }), entry({ id: 'old', date: '2026-09-01', amount: 500 })];
    w.bills = [bill];
    w.goals = [
      {
        id: 'g',
        name: 'Fund',
        target: 1000,
        saved: 950,
        monthly: 200,
        emoji: '🌱',
        color: '#26765c',
        deadline: '2027-01-01',
      },
    ];
    expect(plan(w, now)).toEqual({
      spent: 100,
      bills: 500,
      goals: 50,
      remaining: 1350,
      daily: 103.85,
      days: 13,
    });
  });
  it('does not show a negative daily allowance', () => {
    const w = makeWorkspace(false);
    w.transactions = [entry()];
    expect(plan(w, now).daily).toBe(0);
    expect(plan(w, now).remaining).toBe(-6.5);
  });
});
describe('internal transfers', () => {
  it('moves account balances without changing total balance or spending', () => {
    const w = makeWorkspace(false);
    w.openings.checking = 500;
    w.openings.credit = -100;
    w.transfers = [
      { id: 'move', from: 'checking', to: 'credit', amount: 100, date: '2026-10-19', note: 'Card payment' },
    ];
    expect(balance(w, 'checking')).toBe(400);
    expect(balance(w, 'credit')).toBe(0);
    expect(balance(w)).toBe(400);
    expect(totals(w.transactions).expense).toBe(0);
  });
  it('rejects same-account transfers and migrates older backups safely', () => {
    const w = makeWorkspace(false);
    w.transfers = [{ id: 'bad', from: 'checking', to: 'checking', amount: 10, date: '2026-10-19', note: '' }];
    expect(() => validateWorkspace(w)).toThrow();
    const old = JSON.parse(JSON.stringify(makeWorkspace(false)));
    delete old.transfers;
    expect(validateWorkspace(old).transfers).toEqual([]);
  });
});
describe('bill lifecycle and dates', () => {
  it.each([
    ['2026-01-31', 'monthly', '2026-02-28'],
    ['2028-01-31', 'monthly', '2028-02-29'],
    ['2028-02-29', 'yearly', '2029-02-28'],
    ['2026-12-31', 'monthly', '2027-01-31'],
    ['2026-12-28', 'weekly', '2027-01-04'],
  ] as const)('advances %s %s to %s', (date, freq, expected) =>
    expect(advanceDue(date, freq)).toBe(expected),
  );
  it('records exactly one expense and advances only the paid bill', () => {
    const w = makeWorkspace(false);
    w.bills = [bill];
    const next = payBill(w, 'rent', '2026-10-19');
    expect(next.transactions).toHaveLength(1);
    expect(next.transactions[0]).toMatchObject({
      merchant: 'Rent',
      amount: 500,
      status: 'cleared',
      date: '2026-10-19',
      account: 'checking',
    });
    expect(next.bills[0].nextDue).toBe('2026-11-20');
    expect(w.bills[0].nextDue).toBe('2026-10-20');
  });
  it('ignores a missing bill without altering state', () => {
    const w = makeWorkspace(false);
    expect(payBill(w, 'missing')).toBe(w);
  });
  it('uses local calendar dates rather than UTC truncation', () => {
    expect(iso(localDate('2026-01-01'))).toBe('2026-01-01');
    expect(monthKey(now)).toBe('2026-10');
  });
});
describe('quick capture and CSV safety', () => {
  it('parses amount, category, merchant, and yesterday', () =>
    expect(parseQuickEntry('Coffee 6.50 yesterday #dining', now)).toEqual({
      merchant: 'Coffee',
      amount: 6.5,
      category: 'dining',
      type: 'expense',
      date: '2026-10-18',
    }));
  it('identifies income and handles the year boundary', () => {
    expect(parseQuickEntry('Salary 3500', now)?.type).toBe('income');
    expect(parseQuickEntry('Uber 12 yesterday', new Date(2026, 0, 1))?.date).toBe('2025-12-31');
  });
  it('rejects missing/zero amounts and safely falls back for unknown categories', () => {
    expect(parseQuickEntry('Coffee')).toBeNull();
    expect(parseQuickEntry('Coffee 0')).toBeNull();
    expect(parseQuickEntry('Gift 15 #unknown', now)?.category).toBe('shopping');
    expect(parseQuickEntry('Gift 15 #__proto__', now)?.category).toBe('shopping');
  });
  it('escapes quotes/newlines and prevents spreadsheet formula injection', () => {
    const result = csv([entry({ merchant: '=HYPERLINK("test")', note: 'one\ntwo' })]);
    expect(result).toContain('"\'=HYPERLINK(""test"")"');
    expect(result).toContain('"one\ntwo"');
    expect(result).toContain('Date,Merchant');
  });
});
