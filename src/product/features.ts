export const PRO_FEATURES = {
  analytics: {
    name: 'Advanced analytics',
    description: 'Compare periods and explore detailed spending reports.',
  },
  budgets: { name: 'Category budgets', description: 'Set spending limits and follow your monthly plan.' },
  goals: { name: 'Savings goals', description: 'Plan targets and record progress toward them.' },
  bills: {
    name: 'Bills & subscriptions',
    description: 'Organize recurring payments and upcoming due dates.',
  },
  insights: {
    name: 'Spending insights',
    description: 'Review patterns, possible duplicates and repeat charges.',
  },
  lab: { name: 'Decision Lab', description: 'Explore a purchase before you commit to it.' },
} as const;
export type ProFeature = keyof typeof PRO_FEATURES;
export function isProFeature(value: string): value is ProFeature {
  return Object.prototype.hasOwnProperty.call(PRO_FEATURES, value);
}
// Opt-in finance regression fixtures; Vite removes this branch from production builds.
export const legacyTestMode = import.meta.env.DEV && import.meta.env.VITE_E2E_LEGACY === '1';
