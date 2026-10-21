import { Tag, Landmark, Wallet, CreditCard, PiggyBank } from 'lucide-react';
import { CATEGORIES as seeds, ACCOUNTS as accounts } from '../lib/categories';
import type { TxType } from '../lib/types';
import type { Workspace } from './model';
export interface Category {
  id: string;
  label: string;
  type: TxType;
  color: string;
  priority: number;
  pinned: boolean;
}
export interface Account {
  id: string;
  label: string;
  kind: 'bank' | 'cash' | 'credit' | 'savings';
  color: string;
}
export type Catalog = Pick<Workspace, 'categories' | 'accounts'>;
export const normalize = (s: string) => s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
export const labelName = (s: string) => s.normalize('NFKC').trim().replace(/\s+/g, ' ');
export const safeId = (s: unknown): s is string =>
  typeof s === 'string' &&
  /^[a-zA-Z][a-zA-Z0-9_-]{0,99}$/.test(s) &&
  !['constructor', 'prototype', 'all', 'new'].includes(s);
export const validName = (s: unknown): s is string =>
  typeof s === 'string' && s.trim().length > 0 && s.length <= 60 && !/[\x00-\x1f\x7f]/.test(s);
export const defaultCategories = (): Category[] =>
  Object.values(seeds).map((c, i) => ({
    id: c.id,
    label: c.label,
    type: c.type,
    color: c.color,
    priority: i,
    pinned: false,
  }));
export const defaultAccounts = (): Account[] =>
  Object.values(accounts).map((a) => ({
    id: a.id,
    label: a.label,
    color: a.color,
    kind: a.id === 'checking' ? 'bank' : (a.id as Account['kind']),
  }));
export const ordered = (categories: Category[]) =>
  categories
    .slice()
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) || a.priority - b.priority || a.label.localeCompare(b.label),
    );
export function catalogMaps(w: Catalog) {
  const categories = ordered(w.categories);
  return {
    CATEGORIES: Object.fromEntries(
      categories.map((c) => [
        c.id,
        { ...c, icon: Object.prototype.hasOwnProperty.call(seeds, c.id) ? seeds[c.id].icon : Tag },
      ]),
    ),
    ACCOUNTS: Object.fromEntries(
      w.accounts.map((a) => [
        a.id,
        { ...a, icon: { bank: Landmark, cash: Wallet, credit: CreditCard, savings: PiggyBank }[a.kind] },
      ]),
    ),
    EXPENSE_CATEGORIES: categories.filter((c) => c.type === 'expense').map((c) => c.id),
  };
}
export function addCategory(w: Workspace, name: string, type: TxType, id = `cat_${crypto.randomUUID()}`) {
  const label = labelName(name);
  if (!validName(label)) throw new Error('Use a category name between 1 and 60 characters.');
  const existing = w.categories.find((c) => c.type === type && normalize(c.label) === normalize(label));
  if (existing) return { w, id: existing.id };
  if (w.categories.length >= 200)
    throw new Error('Category limit reached (200). Remove an unused category first.');
  const category: Category = {
    id,
    label,
    type,
    color: '#26765c',
    priority: Math.min(1000000, Math.max(-1, ...w.categories.map((c) => c.priority)) + 1),
    pinned: false,
  };
  return {
    id,
    w: {
      ...w,
      categories: [...w.categories, category],
      budgets: type === 'expense' ? { ...w.budgets, [id]: 0 } : w.budgets,
    },
  };
}
export function removeCategory(
  w: Workspace,
  id: string,
  target?: string,
  discardUnusedBudget = false,
): Workspace {
  const c = w.categories.find((c) => c.id === id);
  if (!c) throw new Error('Category no longer exists.');
  const used = w.transactions.some((t) => t.category === id) || w.bills.some((b) => b.category === id);
  const to = w.categories.find((x) => x.id === target && x.id !== id && x.type === c.type);
  if ((used || ((w.budgets[id] ?? 0) > 0 && !discardUnusedBudget)) && !to)
    throw new Error('Select a replacement of the same type to preserve records and budget.');
  const { [id]: budget, ...budgets } = w.budgets;
  if (to && c.type === 'expense') budgets[to.id] = (budgets[to.id] ?? 0) + (budget ?? 0);
  return {
    ...w,
    categories: w.categories.filter((x) => x.id !== id),
    budgets,
    transactions: w.transactions.map((t) => (t.category === id ? { ...t, category: to!.id } : t)),
    bills: w.bills.map((b) => (b.category === id ? { ...b, category: to!.id } : b)),
  };
}
export function removeAccount(w: Workspace, id: string, target?: string): Workspace {
  if (!w.accounts.some((a) => a.id === id)) throw new Error('Account no longer exists.');
  const used =
    w.transactions.some((t) => t.account === id) ||
    w.bills.some((b) => b.account === id) ||
    w.transfers.some((t) => t.from === id || t.to === id) ||
    w.openings[id] !== 0;
  const to = w.accounts.find((a) => a.id === target && a.id !== id);
  if (used && !to) throw new Error('Select a replacement account to preserve your balance and records.');
  const { [id]: opening, ...openings } = w.openings;
  if (to) openings[to.id] = Math.round((openings[to.id] + opening) * 100) / 100;
  return {
    ...w,
    accounts: w.accounts.filter((a) => a.id !== id),
    openings,
    transactions: w.transactions.map((t) => (t.account === id ? { ...t, account: to!.id } : t)),
    bills: w.bills.map((b) => (b.account === id ? { ...b, account: to!.id } : b)),
    transfers: w.transfers
      .map((t) => ({ ...t, from: t.from === id ? to!.id : t.from, to: t.to === id ? to!.id : t.to }))
      .filter((t) => t.from !== t.to),
  };
}
