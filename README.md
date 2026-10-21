# Spendwise · Personal finance, connected

A responsive personal-finance workspace for desktop web and Android, built with React 19, TypeScript, Vite, Recharts, Supabase and Capacitor.

**Current status:** working local demo plus configurable customer authentication/cloud sync and an Android packaging foundation. No hosted backend, signed Android release or Play Store listing is provisioned by this repository. See the [setup and release checklist](docs/RELEASE.md) before enabling real customer accounts.

The unconfigured preview needs no credentials and opens a clearly labeled local demo. Set the two public values in `.env.example` after provisioning Supabase to enable real email/password sign-in, confirmation/recovery, customer-specific records and revision-checked cross-device sync.

## What you can do

- **Overview:** monthly income, expenses, net cash flow, savings rate, cumulative cash-flow chart, category breakdown, upcoming bills, and savings-goal progress.
- **Transactions:** add, edit, delete, search, filter by month/type/category/account/status, sort, paginate, bulk-clear, bulk-delete, and export the filtered results as CSV.
- **Analytics:** a dedicated section after Transactions with date/account/category/status filters, equal-length comparisons, daily/weekly/monthly charts, category and merchant drill-down, weekday averages, account activity, prorated budget checks, editable source records, and report/transaction CSV exports.
- **Quick capture:** enter `Coffee 6.50 yesterday #dining`, review the suggested fields, and save. This is a deterministic parser, not a remote AI service.
- **Manual accounts:** create, rename, edit and remove bank, savings, credit and cash accounts; safely reassign linked records and merge balances; internal transfers and credit-card-payment records that do not inflate income or expenses.
- **Categories:** manage income/expense names, pinning and priority in Settings; searchable entry pickers support explicit inline Add and immediately select the new category without losing the draft.
- **Account sync:** real Supabase client integration, user-isolated database access, durable pending changes, offline cached reopening, explicit conflict decisions, account sign-out and a configurable deletion function. Setup is required.
- **Android foundation:** checked-in Capacitor project, lifecycle/deep-link handling, back-button integration and native share-sheet exports. Native builds and store publication require Android tooling/release work.
- **Budgets:** editable recurring monthly category limits, actual spending, remaining allowance, and over-budget warnings.
- **Savings goals:** create/edit/delete goals, record savings progress, set monthly allocations and target dates, and estimate funding timelines.
- **Bills & subscriptions:** create/edit/remove weekly, monthly, or annual reminders. Marking a bill paid creates one expense and advances its next due date. It never sends a real payment.
- **Insights:** six-month cash-flow comparisons, category analysis, a 12-week spending fingerprint, explainable repeat-charge detection, and possible-duplicate review.
- **Decision Lab:** preview a purchase’s effect on planned spending room, see its take-home work-hour cost, compare an alternative savings allocation, and simulate a reduction in recorded expense totals.
- **Pause pocket:** keep possible purchases in a persistent wishlist with a 24-hour reflection window. Nothing prevents you from deciding sooner; this is a nudge, not a lock.
- **Data ownership:** validated JSON backup/restore, CSV export, cross-tab demo updates, tab-local Undo, and explicit backup replacement. Cloud accounts use one active tab per browser profile to protect recovery data.
- **Personalization:** name, planned take-home income, hourly rate, five currency display options, five persistent visual styles, light/dark/device color modes, and a larger reading size.
- **Responsive navigation:** desktop sidebar, mobile bottom navigation, global search (`Ctrl/⌘ K`), new transaction shortcut (`N`), native focus-trapped dialogs, and reduced-motion support.
- **Installable app:** web manifest and app icons; the production service worker caches the single-file app shell so it can reopen offline after a successful online visit.

## Choose your look

Open **Style Studio** in the header (the palette icon on small screens), or visit **Settings → Style Studio**. Changes preview immediately across the whole app.

| Style         | Personality                                                   | Modes        |
| ------------- | ------------------------------------------------------------- | ------------ |
| Minimal       | Pure black, white, and grayscale; crisp typography            | Light + dark |
| Botanical     | The original warm cream and forest-green Spendwise            | Light + dark |
| Brutalist     | Bold outlines, square corners, offset shadows, yellow accents | Light + dark |
| Neon          | Carbon black, electric lime, and sculpted neutral cards       | Light + dark |
| Glassmorphism | Frosted panels, a misty landscape, and soft pastel highlights | Light + dark |

Choose **Use device** to follow your system appearance, or pick a fixed mode. The header sun/moon button switches modes without changing your style. **Larger** increases body text, labels, and chart text. Preferences survive reloads and synchronize across tabs on the same origin; they never modify financial records or JSON backups. Returning users with the old light/dark preference retain Botanical. New installs start with Minimal and follow the device.

The refreshed layouts use clearer headings, higher-contrast secondary text, consistent form sizing, and responsive cards/tables across all ten pages. Hover, press, progress, modal, and financial-value feedback respect reduced-motion preferences. See [appearance design notes](docs/APPEARANCE.md) for the reference links and implementation details.

**Glassmorphism** adds translucent, blurred panels over a locally bundled mountain scene. It supports reduced-transparency preferences with solid surfaces, and its background remains available offline—no external image service is required.

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
npm test                          # Finance, backup, and appearance unit tests
npm run build                     # TypeScript checks + production build
npx playwright install chromium  # One-time browser installation
npm run test:e2e                   # Desktop/mobile workflows, themes, and axe checks
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

The demo is stored under `spendwise-workspace-v1`. Configured customer accounts use Supabase Auth and a user-owned cloud workspace. Cached customer snapshots and unsynced edits are scoped by user ID on the device. Device records, sign-in persistence and exported files have **no application-level encryption**; use a trusted device and sign out before sharing it. Read [storage, synchronization and release limitations](docs/RELEASE.md).

There are no bank connections, real payment processing, receipt OCR, ads, telemetry, AI API calls or shared-household permissions. This is not a regulated accounting platform or financial advice. No bank-grade/end-to-end encryption claim is made. Fonts are bundled locally. The demo sends no financial data to a server; configured accounts necessarily communicate with your deployed Supabase service.

## Deploy to GitHub Pages

1. Set **Settings → Pages → Build and deployment → Source → GitHub Actions**.
2. Configure the public cloud Actions variables if deploying an account-enabled build (see [release setup](docs/RELEASE.md)); leave them empty for the demo. The workflow runs on `main` after changes are merged through your normal review process. The workflow installs dependencies on Linux, runs unit tests, checks TypeScript, builds, runs desktop/mobile and production/offline checks, and publishes only `dist/`.
3. Visit `https://messi10isthegoat.github.io/Expense-Tracker/` after the workflow succeeds.

If the changes are already on `main` when the source setting changes, use **Actions → Deploy to GitHub Pages → Run workflow** and select `main`. Pull requests run checks without deploying.

Other static hosts should use Node 22 LTS, `npm ci`, build command `npm run build`, and output directory `dist`. Serve HTTPS (or localhost) for service-worker/install support. Paths are relative and navigation uses hashes, so repository subpaths work without rewrite rules. Publish the entire `dist/`, including the manifest, service worker, and icons.

Never commit `node_modules/`, `dist/`, or generated test artifacts.

## Code map

- `src/finance/Analytics.tsx`, `analytics.ts`: interactive reports, validated date ranges, comparison/bucket math, and report exports. See [analytics semantics](docs/ANALYTICS.md).
- `src/finance/model.ts`: data model, backup validation/migration, financial/date helpers, CSV and quick-entry logic.
- `src/finance/store.tsx`: validated financial updates, demo persistence, Undo, cloud change delivery and external-revision application.
- `src/cloud/`: Auth/account UI, Supabase repository, durable CAS sync engine and single-tab write lease.
- `src/platform/`, `capacitor.config.ts`, `android/`: native lifecycle, exports and Android packaging.
- `supabase/`: SQL migration, local Auth configuration and server-only account-deletion function.
- `src/finance/catalog.ts`, `CategoryPicker.tsx`, `WorkspaceManager.tsx`: editable catalogs and entry controls.
- `src/finance/`: the ten application sections and shared dialogs.
- `src/finance/appearance.ts`, `ThemeStudio.tsx`, `src/hooks/useTheme.tsx`: appearance preferences, migration, chooser, and provider.
- `src/finance/styles/`: semantic palettes, base typography, layout, components, page styles, appearance treatments, and reduced-motion-aware interactions (imported by `spendwise.css`).
- `src/lib/data.ts`: deterministic demo-data generator.
- `public/`: install metadata, icons, and the production offline shell worker.
- `tests/`: desktop/mobile finance workflows, ten-palette accessibility checks, appearance persistence, keyboard controls, system mode, and cross-tab tests.
- `scripts/verify-offline.mjs`: real subpath/offline production verification.
- `docs/PRODUCT.md`: research notes, product choices, and deliberate boundaries.
