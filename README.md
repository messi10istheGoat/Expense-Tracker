# Spendwise · A life well spent

A responsive, local-first expense tracker for desktop and mobile. Built with React 19, TypeScript, Vite, Tailwind CSS, and Recharts. No backend, credentials, paid APIs, or environment variables are needed.

## What you can do

- **Overview:** monthly income, expenses, net cash flow, savings rate, cumulative cash-flow chart, category breakdown, upcoming bills, and savings-goal progress.
- **Transactions:** add, edit, delete, search, filter by month/type/category/account/status, sort, paginate, bulk-clear, bulk-delete, and export the filtered results as CSV.
- **Quick capture:** enter `Coffee 6.50 yesterday #dining`, review the suggested fields, and save. This is a deterministic parser, not a remote AI service.
- **Manual accounts:** checking, savings, credit, and cash; editable opening balances; internal transfers and credit-card-payment records that do not inflate income or expenses.
- **Budgets:** editable recurring monthly category limits, actual spending, remaining allowance, and over-budget warnings.
- **Savings goals:** create/edit/delete goals, record savings progress, set monthly allocations and target dates, and estimate funding timelines.
- **Bills & subscriptions:** create/edit/remove weekly, monthly, or annual reminders. Marking a bill paid creates one expense and advances its next due date. It never sends a real payment.
- **Insights:** six-month cash-flow comparisons, category analysis, a 12-week spending fingerprint, explainable repeat-charge detection, and possible-duplicate review.
- **Decision Lab:** preview a purchase’s effect on planned spending room, see its take-home work-hour cost, compare an alternative savings allocation, and simulate smaller discretionary spending.
- **Pause pocket:** keep possible purchases in a persistent wishlist with a 24-hour reflection window. Nothing prevents you from deciding sooner; this is a nudge, not a lock.
- **Data ownership:** validated JSON backup/restore, CSV export, cross-tab workspace updates, and explicit empty/demo workspace choices.
- **Personalization:** name, planned take-home income, hourly rate, five currency display options, and persistent light/dark themes.
- **Responsive navigation:** desktop sidebar, mobile bottom navigation, global search (`Ctrl/⌘ K`), new transaction shortcut (`N`), native focus-trapped dialogs, and reduced-motion support.
- **Installable app:** web manifest and app icons; the production service worker caches the single-file app shell so it can reopen offline after a successful online visit.

## Start developing

Use Node.js 22.12+ (Node 22 LTS is pinned in `.nvmrc`).

```sh
nvm use
npm ci
npm run dev
```

The development server binds to `0.0.0.0` and permits Arena preview domains. The service worker is **production-only**, so it does not cache development code.

## Build and test

```sh
npm test                          # Financial, date, parser, and backup unit tests
npm run build                     # TypeScript checks + production build
npx playwright install chromium  # One-time browser installation
npm run test:e2e                   # Desktop Chrome + mobile Chromium workflows
npm run test:offline               # Built app at /Expense-Tracker/, offline edits and reload
npm run preview                    # Preview the production site
```

`test:offline` requires an existing `dist/` from `npm run build`. Tests can use a preinstalled Chromium binary through `CHROMIUM_EXECUTABLE` instead of Playwright’s downloaded browser. The mobile test project emulates an iPhone viewport/touch behavior in Chromium; it does not claim to test actual Safari or native devices.

## Your first personal workspace

The app starts with clearly labeled generated demo records. To use it for your own money:

1. Open **Settings → A fresh chapter → Start an empty workspace**. Back up any existing data first.
2. Set your name, currency, planned take-home monthly income, and optional hourly rate.
3. Open **Accounts** and enter balances from before your first logged transaction. Credit card debt is a negative balance.
4. Add transactions, category budgets, goals, and bill reminders.
5. Download regular JSON backups in **Settings**. Restore a backup on another device to move your workspace there.

## Important financial semantics

- Amounts are positive; the transaction’s income/expense type determines its sign. Pending transactions count in balances and reports.
- **Account balance** = opening balance + income − expenses + incoming internal transfers − outgoing internal transfers. Total net balance is unaffected by transfers.
- **Net cash flow** = income − expenses. **Savings rate** = net cash flow ÷ income; it is shown as zero when income is zero.
- **Planned spending room** = planned monthly income − logged current-month expenses − next bill occurrences due this month or overdue − active monthly goal allocations. Daily guidance divides non-negative room by remaining calendar days, including today.
- Spending room is a **planning estimate, not available bank funds**. It excludes unknown future expenses, tax changes, and debt interest. A bill already logged manually still needs its reminder advanced to avoid reserving it twice.
- Budget limits repeat monthly; historical budget-limit snapshots and rollover are not implemented.
- Savings goals are **earmarks**, not financial account balances or automatic transfers. Record a transfer separately if money moved between accounts.
- Goal timeline estimates assume unchanged monthly contributions and no interest. Target dates do not guarantee completion.
- Bill lists reserve **one next occurrence per bill**, not every weekly installment remaining in the month. Paying an overdue bill advances one cycle at a time. Month-end due dates clamp to the next month’s last valid day.
- Changing currency changes labels only. No exchange-rate conversion or mixed-currency accounting is performed.

## Privacy and scope

Data is stored under `spendwise-workspace-v1` in this browser’s local storage, which is **not encrypted**. The app has no login, bank sync, cloud database, telemetry, background push reminders, receipt OCR, shared households, or real payment processing. Do not use it as a regulated accounting system or as financial advice.

Clearing browser data or using a different browser profile removes/hides that workspace. Offline caching preserves the app shell, not an additional backup of your records. Fonts are bundled locally; the production app makes no third-party font or API requests. A storage failure is shown explicitly, and unreadable stored data is not automatically overwritten until you change the workspace.

## Deploy to GitHub Pages

1. Set **Settings → Pages → Build and deployment → Source → GitHub Actions**.
2. Merge the changes into `main`. The workflow installs dependencies on Linux, runs unit tests, checks TypeScript, builds, runs desktop/mobile and production/offline checks, and publishes only `dist/`.
3. Visit `https://messi10isthegoat.github.io/Expense-Tracker/` after the workflow succeeds.

If the changes are already on `main` when the source setting changes, use **Actions → Deploy to GitHub Pages → Run workflow** and select `main`. Pull requests run checks without deploying.

Other static hosts should use Node 22 LTS, `npm ci`, build command `npm run build`, and output directory `dist`. Serve HTTPS (or localhost) for service-worker/install support. Paths are relative and navigation uses hashes, so repository subpaths work without rewrite rules. Publish the entire `dist/`, including the manifest, service worker, and icons.

Never commit `node_modules/`, `dist/`, or generated test artifacts.

## Code map

- `src/finance/model.ts`: data model, backup validation/migration, financial/date helpers, CSV and quick-entry logic.
- `src/finance/store.tsx`: local persistence, storage failure reporting, currency display, notifications, cross-tab updates.
- `src/finance/`: the nine application sections, shared dialogs, and responsive styling.
- `src/lib/data.ts`: deterministic demo-data generator.
- `public/`: install metadata, icons, and the production offline shell worker.
- `tests/`: desktop and mobile browser workflows.
- `scripts/verify-offline.mjs`: real subpath/offline production verification.
- `docs/PRODUCT.md`: research notes, product choices, and deliberate boundaries.
