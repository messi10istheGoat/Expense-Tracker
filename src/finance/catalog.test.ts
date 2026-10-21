import { describe, it, expect } from 'vitest';
import { addCategory, removeAccount, removeCategory, ordered } from './catalog';
import { assertUnchanged, balance, csv, makeWorkspace, parseQuickEntry, validateWorkspace } from './model';
describe('editable financial catalogs', () => {
  it('compares stale financial records independently of JSONB key order', () => {
    expect(() => assertUnchanged({ amount: 12, id: 'a' }, { id: 'a', amount: 12 }, 'Record')).not.toThrow();
    expect(() => assertUnchanged({ amount: 13, id: 'a' }, { id: 'a', amount: 12 }, 'Record')).toThrow(
      'changed',
    );
    expect(() => assertUnchanged(undefined, { id: 'a' }, 'Record')).toThrow('removed');
  });
  it('migrates older v1 backups without losing money', () => {
    const w = makeWorkspace();
    const old = { ...w, categories: undefined, accounts: undefined };
    expect(validateWorkspace(old)).toEqual(w);
  });
  it('creates normalized categories and prevents duplicate names', () => {
    const w = makeWorkspace(false),
      a = addCategory(w, '  Pet   care  ', 'expense', 'pet');
    expect(a.w.categories.at(-1)?.label).toBe('Pet care');
    expect(addCategory(a.w, 'PET CARE', 'expense').id).toBe('pet');
    expect(validateWorkspace(a.w).budgets.pet).toBe(0);
  });
  it('keeps expense and income names separate', () => {
    const w = addCategory(makeWorkspace(false), 'Other', 'expense', 'otherExpense').w;
    expect(addCategory(w, 'Other', 'income', 'otherIncome').id).toBe('otherIncome');
  });
  it('supports custom-category quick entry and CSV labels', () => {
    const w = addCategory(makeWorkspace(false), 'Pet care', 'expense', 'pet').w;
    const p = parseQuickEntry('Vet 40 #"Pet care"', new Date(), w);
    expect(p?.category).toBe('pet');
    expect(p?.merchant).toBe('Vet');
    expect(
      csv(
        [
          {
            id: 't',
            merchant: 'Vet',
            date: '2026-10-21',
            amount: 40,
            type: 'expense',
            category: 'pet',
            account: 'checking',
            status: 'cleared',
            recurring: false,
          },
        ],
        w,
      ),
    ).toContain('Pet care');
  });
  it('reassigns linked records and combines budgets without losing expenses', () => {
    const w = makeWorkspace(),
      count = w.transactions.length,
      total = balance(w),
      budget = (w.budgets.dining ?? 0) + (w.budgets.groceries ?? 0);
    const next = validateWorkspace(removeCategory(w, 'dining', 'groceries'));
    expect(next.transactions.length).toBe(count);
    expect(balance(next)).toBe(total);
    expect(next.budgets.groceries).toBe(budget);
    expect(next.transactions.some((t) => t.category === 'dining')).toBe(false);
  });
  it('rejects removal of a used category without a same-type replacement', () => {
    expect(() => removeCategory(makeWorkspace(), 'dining')).toThrow();
    expect(() => removeCategory(makeWorkspace(), 'dining', 'salary')).toThrow();
  });
  it('preserves total balance when accounts merge and removes only self-transfers', () => {
    const w = makeWorkspace();
    w.transfers = [
      { id: 'a', from: 'checking', to: 'savings', amount: 22, date: '2026-10-01', note: '' },
      { id: 'b', from: 'cash', to: 'checking', amount: 10, date: '2026-10-01', note: '' },
    ];
    const next = validateWorkspace(removeAccount(w, 'checking', 'savings'));
    expect(balance(next)).toBe(balance(w));
    expect(next.transactions.length).toBe(w.transactions.length);
    expect(next.transfers).toHaveLength(1);
    expect(next.transfers[0].to).toBe('savings');
  });
  it('requires replacement for money or history, permits removing unused accounts', () => {
    expect(() => removeAccount(makeWorkspace(), 'checking')).toThrow();
    expect(validateWorkspace(removeAccount(makeWorkspace(false), 'checking')).accounts).toHaveLength(3);
  });
  it('rejects duplicate, reserved and broken references in backups', () => {
    const w = makeWorkspace();
    expect(() => validateWorkspace({ ...w, categories: [...w.categories, w.categories[0]] })).toThrow();
    expect(() =>
      validateWorkspace({ ...w, accounts: w.accounts.map((a, i) => (i ? a : { ...a, id: 'all' })) }),
    ).toThrow();
    expect(() => validateWorkspace({ ...w, categories: [] })).toThrow();
  });
  it('sorts pinned then priority without mutating stored order', () => {
    const w = makeWorkspace();
    w.categories[3] = { ...w.categories[3], pinned: true };
    expect(ordered(w.categories)[0].id).toBe(w.categories[3].id);
    expect(w.categories[0].id).not.toBe(w.categories[3].id);
  });
});
