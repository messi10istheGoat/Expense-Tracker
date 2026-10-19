import { ACCOUNTS, CATEGORIES, EXPENSE_CATEGORIES } from '../lib/categories';
import { generateDataset } from '../lib/data';
import type { AccountId, CategoryId, Transaction } from '../lib/types';

export const STORAGE_KEY = 'spendwise-workspace-v1';
export const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const iso = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const monthKey = (d = new Date()) => iso(d).slice(0, 7);
export const localDate = (s: string) => new Date(`${s}T12:00:00`);
export const uid = () => crypto.randomUUID();
export type Entry = Omit<Transaction, 'date'> & { date: string };
export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  monthly: number;
  color: string;
  emoji: string;
  deadline: string;
}
export interface Bill {
  id: string;
  name: string;
  amount: number;
  category: CategoryId;
  account: AccountId;
  nextDue: string;
  frequency: 'monthly' | 'yearly' | 'weekly';
}
export interface Transfer {
  id: string;
  from: AccountId;
  to: AccountId;
  amount: number;
  date: string;
  note: string;
}
export interface Wish {
  id: string;
  name: string;
  amount: number;
  createdAt: string;
}
export interface Workspace {
  version: 1;
  demo: boolean;
  transactions: Entry[];
  budgets: Record<string, number>;
  goals: Goal[];
  bills: Bill[];
  wishes: Wish[];
  transfers: Transfer[];
  openings: Record<AccountId, number>;
  profile: { name: string; currency: string; monthlyIncome: number; hourlyRate: number };
}
export const goalColors = ['#26765c', '#8c79bb', '#d2944b', '#5b8cb5', '#d17f80'];
export function makeWorkspace(demo = true, now = new Date()): Workspace {
  const budgets = Object.fromEntries(EXPENSE_CATEGORIES.map((id) => [id, CATEGORIES[id].budget ?? 0]));
  const base: Workspace = {
    version: 1,
    demo,
    transactions: [],
    budgets,
    goals: [],
    bills: [],
    wishes: [],
    transfers: [],
    openings: { checking: 0, savings: 0, credit: 0, cash: 0 },
    profile: { name: 'Alex', currency: 'USD', monthlyIncome: 7800, hourlyRate: 35 },
  };
  if (!demo)
    return {
      ...base,
      profile: { name: 'Friend', currency: 'USD', monthlyIncome: 0, hourlyRate: 0 },
      budgets: Object.fromEntries(EXPENSE_CATEGORIES.map((id) => [id, 0])),
    };
  const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  base.transactions = generateDataset(now)
    .transactions.filter((t) => t.date >= from)
    .map((t) => ({ ...t, date: iso(t.date) }));
  const desired = { checking: 4280.5, savings: 12450, credit: -684.2, cash: 240 };
  for (const id of Object.keys(desired) as AccountId[])
    base.openings[id] = round(
      desired[id] -
        base.transactions
          .filter((t) => t.account === id)
          .reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0),
    );
  base.goals = [
    {
      id: uid(),
      name: 'Japan, here we come',
      emoji: '⛩️',
      target: 5000,
      saved: 3250,
      monthly: 250,
      color: goalColors[0],
      deadline: iso(new Date(now.getFullYear() + 1, 3, 1)),
    },
    {
      id: uid(),
      name: 'Peace-of-mind fund',
      emoji: '🌱',
      target: 10000,
      saved: 6400,
      monthly: 350,
      color: goalColors[1],
      deadline: iso(new Date(now.getFullYear() + 1, 9, 1)),
    },
    {
      id: uid(),
      name: 'A creative little corner',
      emoji: '💻',
      target: 2400,
      saved: 800,
      monthly: 100,
      color: goalColors[2],
      deadline: iso(new Date(now.getFullYear() + 1, 5, 1)),
    },
  ];
  base.bills = [
    {
      id: uid(),
      name: 'Spotify Premium',
      amount: 11.99,
      category: 'entertainment',
      account: 'credit',
      nextDue: iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2)),
      frequency: 'monthly',
    },
    {
      id: uid(),
      name: 'Internet',
      amount: 65,
      category: 'utilities',
      account: 'checking',
      nextDue: iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 4)),
      frequency: 'monthly',
    },
    {
      id: uid(),
      name: 'Netflix',
      amount: 15.49,
      category: 'entertainment',
      account: 'credit',
      nextDue: iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6)),
      frequency: 'monthly',
    },
    {
      id: uid(),
      name: 'Rent',
      amount: 1800,
      category: 'housing',
      account: 'checking',
      nextDue: iso(new Date(now.getFullYear(), now.getMonth() + 1, 1)),
      frequency: 'monthly',
    },
  ];
  return base;
}
export function balance(w: Workspace, account?: AccountId) {
  const ids = account ? [account] : (Object.keys(w.openings) as AccountId[]);
  return round(
    ids.reduce((s, id) => s + w.openings[id], 0) +
      w.transactions
        .filter((t) => !account || t.account === account)
        .reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0) +
      (account
        ? w.transfers.reduce(
            (s, t) => s + (t.to === account ? t.amount : 0) - (t.from === account ? t.amount : 0),
            0,
          )
        : 0),
  );
}
export function totals(rows: Entry[]) {
  const income = round(rows.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0));
  const expense = round(rows.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0));
  return {
    income,
    expense,
    net: round(income - expense),
    rate: income > 0 ? ((income - expense) / income) * 100 : 0,
  };
}
export function upcomingTotal(w: Workspace, month = monthKey()) {
  return round(w.bills.filter((b) => b.nextDue.slice(0, 7) <= month).reduce((s, b) => s + b.amount, 0));
}
export function plan(w: Workspace, now = new Date()) {
  const spent = totals(w.transactions.filter((t) => t.date.startsWith(monthKey(now)))).expense;
  const bills = upcomingTotal(w, monthKey(now));
  const goals = round(
    w.goals
      .filter((g) => g.saved < g.target)
      .reduce((s, g) => s + Math.min(g.monthly, g.target - g.saved), 0),
  );
  const remaining = round(w.profile.monthlyIncome - spent - bills - goals);
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1;
  return { spent, bills, goals, remaining, daily: round(Math.max(0, remaining) / days), days };
}
export function advanceDue(date: string, frequency: Bill['frequency']) {
  const d = localDate(date);
  if (frequency === 'weekly') d.setDate(d.getDate() + 7);
  else {
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + (frequency === 'monthly' ? 1 : 12));
    d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  }
  return iso(d);
}
export function payBill(w: Workspace, id: string, today = iso()): Workspace {
  const b = w.bills.find((b) => b.id === id);
  if (!b) return w;
  return {
    ...w,
    transactions: [
      {
        id: uid(),
        merchant: b.name,
        amount: b.amount,
        date: today,
        category: b.category,
        account: b.account,
        type: CATEGORIES[b.category].type,
        status: 'cleared',
        recurring: true,
        note: `Bill occurrence: ${b.nextDue}`,
      },
      ...w.transactions,
    ],
    bills: w.bills.map((x) => (x.id === id ? { ...x, nextDue: advanceDue(x.nextDue, x.frequency) } : x)),
  };
}
export function parseQuickEntry(text: string, now = new Date()): Partial<Entry> | null {
  const match = text.match(/(?:^|\s)(\d+(?:\.\d{1,2})?)(?=\s|$)/);
  if (!match || Number(match[1]) <= 0) return null;
  const lower = text.toLowerCase();
  const mappings: [string[], CategoryId][] = [
    [['coffee', 'lunch', 'dinner', 'restaurant', 'pizza'], 'dining'],
    [['grocery', 'groceries', 'market'], 'groceries'],
    [['uber', 'bus', 'fuel', 'taxi'], 'transport'],
    [['salary', 'paycheck'], 'salary'],
    [['rent'], 'housing'],
    [['netflix', 'spotify', 'movie'], 'entertainment'],
  ];
  const explicit = text.match(/#(\w+)/)?.[1];
  const category: CategoryId =
    explicit && Object.prototype.hasOwnProperty.call(CATEGORIES, explicit)
      ? (explicit as CategoryId)
      : (mappings.find(([words]) => words.some((w) => lower.includes(w)))?.[1] ?? 'shopping');
  const d = new Date(now);
  if (/\byesterday\b/i.test(text)) d.setDate(d.getDate() - 1);
  return {
    merchant:
      text
        .replace(match[0], ' ')
        .replace(/#\w+|\byesterday\b|\btoday\b/gi, '')
        .trim() || 'Quick entry',
    amount: Number(match[1]),
    category,
    type: CATEGORIES[category].type,
    date: iso(d),
  };
}
const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1e12;
const validDate = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(localDate(v).getTime()) &&
  iso(localDate(v)) === v;
const str = (v: unknown, max = 500) => typeof v === 'string' && v.length <= max;
/** Strictly validate backups before replacing any existing browser data. */
export function validateWorkspace(value: unknown): Workspace {
  const fail = (): never => {
    throw new Error('This is not a valid Spendwise backup. Your current data has not been changed.');
  };
  if (!value || typeof value !== 'object') return fail();
  const w = value as Workspace;
  // Additive v1 migration: earlier backups did not include internal transfers.
  if (w.transfers === undefined) w.transfers = [];
  if (!Array.isArray(w.transfers) || w.transfers.length > 50000) return fail();
  const transferIds = new Set<string>();
  for (const t of w.transfers) {
    if (
      !t ||
      !str(t.id, 100) ||
      transferIds.has(t.id) ||
      !Object.prototype.hasOwnProperty.call(ACCOUNTS, t.from) ||
      !Object.prototype.hasOwnProperty.call(ACCOUNTS, t.to) ||
      t.from === t.to ||
      !isNum(t.amount) ||
      t.amount <= 0 ||
      !validDate(t.date) ||
      !str(t.note, 120)
    )
      return fail();
    transferIds.add(t.id);
  }
  if (
    !Array.isArray(w.wishes) ||
    w.wishes.length > 1000 ||
    w.wishes.some(
      (x) =>
        !x ||
        !str(x.id, 100) ||
        !str(x.name, 120) ||
        !x.name.trim() ||
        !isNum(x.amount) ||
        x.amount <= 0 ||
        !str(x.createdAt, 40) ||
        Number.isNaN(Date.parse(x.createdAt)),
    )
  )
    return fail();
  if (
    w.version !== 1 ||
    typeof w.demo !== 'boolean' ||
    !w.profile ||
    !str(w.profile.name, 60) ||
    !['USD', 'BDT', 'EUR', 'GBP', 'INR'].includes(w.profile.currency) ||
    !isNum(w.profile.monthlyIncome) ||
    w.profile.monthlyIncome < 0 ||
    !isNum(w.profile.hourlyRate) ||
    w.profile.hourlyRate < 0
  )
    return fail();
  if (!w.openings || !Object.keys(ACCOUNTS).every((a) => isNum(w.openings[a as AccountId]))) return fail();
  if (!w.budgets || !EXPENSE_CATEGORIES.every((c) => isNum(w.budgets[c]) && w.budgets[c] >= 0)) return fail();
  if (
    !Array.isArray(w.transactions) ||
    w.transactions.length > 50000 ||
    !Array.isArray(w.goals) ||
    w.goals.length > 1000 ||
    !Array.isArray(w.bills) ||
    w.bills.length > 1000
  )
    return fail();
  const ids = new Set<string>();
  for (const t of w.transactions) {
    if (
      !t ||
      !str(t.id, 100) ||
      ids.has(t.id) ||
      !validDate(t.date) ||
      !str(t.merchant, 120) ||
      !t.merchant.trim() ||
      !isNum(t.amount) ||
      t.amount <= 0 ||
      !Object.prototype.hasOwnProperty.call(CATEGORIES, t.category) ||
      CATEGORIES[t.category].type !== t.type ||
      !Object.prototype.hasOwnProperty.call(ACCOUNTS, t.account) ||
      !['cleared', 'pending'].includes(t.status) ||
      typeof t.recurring !== 'boolean' ||
      (t.note !== undefined && !str(t.note))
    )
      return fail();
    ids.add(t.id);
  }
  for (const list of [w.goals, w.bills]) {
    const seen = new Set<string>();
    for (const item of list) {
      if (!item || !str(item.id, 100) || seen.has(item.id) || !str(item.name, 120) || !item.name.trim())
        return fail();
      seen.add(item.id);
    }
  }
  for (const g of w.goals)
    if (
      !isNum(g.target) ||
      g.target <= 0 ||
      !isNum(g.saved) ||
      g.saved < 0 ||
      !isNum(g.monthly) ||
      g.monthly < 0 ||
      !/^#[0-9a-f]{6}$/i.test(g.color) ||
      !str(g.emoji, 12) ||
      !validDate(g.deadline)
    )
      return fail();
  for (const b of w.bills)
    if (
      !isNum(b.amount) ||
      b.amount <= 0 ||
      !Object.prototype.hasOwnProperty.call(CATEGORIES, b.category) ||
      CATEGORIES[b.category].type !== 'expense' ||
      !Object.prototype.hasOwnProperty.call(ACCOUNTS, b.account) ||
      !validDate(b.nextDue) ||
      !['weekly', 'monthly', 'yearly'].includes(b.frequency)
    )
      return fail();
  return w;
}
export function download(name: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csv(rows: Entry[]) {
  const cell = (v: string) => `"${(/^(?:\s*[=+\-@]|[\t\r])/.test(v) ? "'" : '') + v.replace(/"/g, '""')}"`;
  return [
    'Date,Merchant,Type,Category,Account,Amount,Status,Note',
    ...rows.map((t) =>
      [
        t.date,
        t.merchant,
        t.type,
        CATEGORIES[t.category].label,
        ACCOUNTS[t.account].label,
        String(t.amount),
        t.status,
        t.note ?? '',
      ]
        .map(cell)
        .join(','),
    ),
  ].join('\r\n');
}
