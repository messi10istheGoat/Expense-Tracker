import { describe, it, expect } from 'vitest';
import { freshWorkspace, completeSetup, hasExistingData, type Setup } from './local';
import { makeWorkspace, validateWorkspace } from '../finance/model';
import { isProFeature, legacyTestMode } from './features';
const setup: Setup = {
  name: '  Sam  ',
  currency: 'BDT',
  accountName: '  Everyday   wallet ',
  kind: 'cash',
  opening: 250.75,
  monthlyIncome: 45000,
};
describe('local setup', () => {
  it('starts empty without fictional finances or identity', () => {
    const w = freshWorkspace();
    expect(validateWorkspace(JSON.parse(JSON.stringify(w)))).toEqual(w);
    expect(w.demo).toBe(false);
    expect(w.onboardingComplete).toBe(false);
    expect(w.profile).toEqual({ name: '', currency: 'USD', monthlyIncome: 0, hourlyRate: 0 });
    for (const key of ['transactions', 'transfers', 'goals', 'bills', 'wishes'] as const)
      expect(w[key]).toEqual([]);
    expect(Object.values(w.openings).every((v) => v === 0)).toBe(true);
    expect(Object.values(w.budgets).every((v) => v === 0)).toBe(true);
    expect(hasExistingData(w)).toBe(false);
  });
  it('persisting an incomplete setup never bypasses onboarding', () => {
    const w = validateWorkspace(JSON.parse(JSON.stringify(freshWorkspace())));
    expect(w.onboardingComplete).toBe(false);
  });
  it('collects a real local profile and first account without creating income transactions', () => {
    const before = freshWorkspace(),
      w = completeSetup(before, setup);
    expect(w.onboardingComplete).toBe(true);
    expect(w.profile.name).toBe('Sam');
    expect(w.profile.currency).toBe('BDT');
    expect(w.profile.monthlyIncome).toBe(45000);
    expect(w.accounts).toHaveLength(1);
    expect(w.accounts[0]).toMatchObject({ label: 'Everyday wallet', kind: 'cash' });
    expect(w.openings.checking).toBe(250.75);
    expect(w.transactions).toEqual([]);
    expect(before.onboardingComplete).toBe(false);
    expect(before.openings.checking).toBe(0);
  });
  it('keeps legacy records, catalogs, other accounts and advanced data through setup', () => {
    const before = makeWorkspace(true),
      copy = structuredClone(before),
      w = completeSetup(before, setup);
    for (const key of [
      'transactions',
      'transfers',
      'categories',
      'goals',
      'bills',
      'wishes',
      'budgets',
    ] as const)
      expect(w[key]).toEqual(before[key]);
    expect(w.accounts).toHaveLength(before.accounts.length);
    expect(w.openings.savings).toBe(before.openings.savings);
    expect(w.accounts[1]).toEqual(before.accounts[1]);
    expect(before).toEqual(copy);
    expect(w.demo).toBe(false);
  });
  it('does not discard empty, previously created manual accounts', () => {
    const before = makeWorkspace(false);
    expect(completeSetup(before, setup).accounts).toHaveLength(before.accounts.length);
  });
  it.each([
    { name: '   ' },
    { accountName: '' },
    { opening: Infinity },
    { monthlyIncome: -1 },
    { opening: 1e13 },
    { currency: 'XYZ' },
    { name: 'x'.repeat(61) },
  ])('rejects invalid setup %j', (patch) => {
    expect(() => completeSetup(freshWorkspace(), { ...setup, ...patch })).toThrow();
  });
  it('retains signed opening balances', () =>
    expect(completeSetup(freshWorkspace(), { ...setup, opening: -100 }).openings.checking).toBe(-100));
  it('migrates legacy personal backups, without forcing completed setup to run again', () => {
    const w: Record<string, unknown> = { ...makeWorkspace(false) };
    delete w.onboardingComplete;
    expect(validateWorkspace(w).onboardingComplete).toBe(true);
  });
  it('legacy sample records require setup, not silent deletion', () => {
    const w: Record<string, unknown> = { ...makeWorkspace() };
    delete w.onboardingComplete;
    const migrated = validateWorkspace(w);
    expect(migrated.onboardingComplete).toBe(false);
    expect(migrated.transactions.length).toBeGreaterThan(0);
  });
  it('rejects malformed onboarding metadata', () =>
    expect(() => validateWorkspace({ ...freshWorkspace(), onboardingComplete: 'yes' })).toThrow());
});
describe('paywall feature map', () => {
  it('locks every advanced destination, not free core routes or object prototype keys', () => {
    for (const id of ['analytics', 'budgets', 'goals', 'bills', 'insights', 'lab'])
      expect(isProFeature(id)).toBe(true);
    for (const id of ['overview', 'accounts', 'transactions', 'settings', 'constructor', '__proto__'])
      expect(isProFeature(id)).toBe(false);
  });
  it('does not enable a test entitlement in ordinary development or tests', () =>
    expect(legacyTestMode).toBe(false));
});
