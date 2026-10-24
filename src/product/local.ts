import { makeWorkspace, validateWorkspace, type Workspace } from '../finance/model';
import { labelName, validName } from '../finance/catalog';
export const CURRENCIES = [
  ['USD', 'US Dollar ($)'],
  ['BDT', 'Bangladeshi Taka (৳)'],
  ['EUR', 'Euro (€)'],
  ['GBP', 'British Pound (£)'],
  ['INR', 'Indian Rupee (₹)'],
] as const;
export function freshWorkspace(): Workspace {
  const base = makeWorkspace(false);
  return {
    ...base,
    onboardingComplete: false,
    accounts: [{ ...base.accounts[0], label: 'Everyday account' }],
    openings: { checking: 0 },
    profile: { name: '', currency: 'USD', monthlyIncome: 0, hourlyRate: 0 },
  };
}
export function hasExistingData(w: Workspace) {
  return !!(
    w.profile.name.trim() ||
    w.accounts.length > 1 ||
    w.accounts.some((a) => a.id !== 'checking' || a.label !== 'Everyday account' || a.kind !== 'bank') ||
    w.transactions.length ||
    w.transfers.length ||
    w.goals.length ||
    w.bills.length ||
    w.wishes.length ||
    Object.values(w.openings).some((n) => n !== 0)
  );
}
export interface Setup {
  name: string;
  currency: string;
  accountName: string;
  kind: Workspace['accounts'][number]['kind'];
  opening: number;
  monthlyIncome: number;
}
export function completeSetup(w: Workspace, setup: Setup): Workspace {
  const name = labelName(setup.name),
    accountName = labelName(setup.accountName);
  if (!validName(name) || !validName(accountName))
    throw new Error('Enter a name and account name, each between 1 and 60 characters.');
  if (!CURRENCIES.some(([id]) => id === setup.currency)) throw new Error('Choose a supported currency.');
  if (
    !Number.isFinite(setup.opening) ||
    Math.abs(setup.opening) > 1e12 ||
    !Number.isFinite(setup.monthlyIncome) ||
    setup.monthlyIncome < 0 ||
    setup.monthlyIncome > 1e9
  )
    throw new Error('Enter valid opening balance and planned income amounts.');
  const keep = hasExistingData(w),
    id = keep && w.accounts[0] ? w.accounts[0].id : 'checking';
  const account = { id, label: accountName, kind: setup.kind, color: w.accounts[0]?.color ?? '#26765c' };
  return validateWorkspace({
    ...w,
    demo: false,
    onboardingComplete: true,
    accounts: keep ? [account, ...w.accounts.filter((a) => a.id !== id)] : [account],
    openings: keep ? { ...w.openings, [id]: setup.opening } : { [id]: setup.opening },
    profile: {
      ...w.profile,
      name,
      currency: setup.currency,
      monthlyIncome: Math.round(setup.monthlyIncome * 100) / 100,
    },
  });
}
