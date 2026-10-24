# Spendwise · Your money, on your device

A responsive personal-finance app for desktop/mobile web and a shared Capacitor Android shell, built with React 19, TypeScript, Vite and Recharts.

**No Spendwise account, sign-up/login, cloud database or automatic financial sync.** Records stay in this browser profile or the Android app’s device storage. Fresh installs start with onboarding and empty finances—not sample transactions or fictional balances.

**Monetization status: paywall now, billing later.** Pro destinations are locked and explain the subscription offer. Pricing, purchases, trials, upgrades and purchase restoration are unavailable; the app never simulates payment or activates a subscription. There is no published Android release yet. See [release boundaries](docs/RELEASE.md).

## Free and Pro

| Free—usable now                                                           | Pro—locked behind the paywall          |
| ------------------------------------------------------------------------- | -------------------------------------- |
| Overview: balances, income/expenses, basic cash flow and spending summary | Advanced Analytics and reports         |
| Transactions: add/edit/delete, filters, search, quick capture, CSV export | Category budgets                       |
| Manual accounts: create/edit/remove, transfers and opening balances       | Savings goals                          |
| Income/expense categories: edit, pin, reorder, searchable inline creation | Bills & subscriptions tracking         |
| Profile, currency, appearance and larger text                             | Explainable spending Insights          |
| Full JSON backup/validated restore, raw-file recovery, Undo               | Decision Lab and purchase pause pocket |

All six Pro routes are guarded, including direct hash URLs, desktop/mobile navigation, global search and Overview entry points. Subscription status is separate from financial data: importing a backup or editing a local plan flag cannot unlock Pro. Advanced tools remain implemented for future billing integration and regression-tested with an isolated development fixture.

## First run

1. Choose the name used **on this device** and a display currency (USD, BDT, EUR, GBP or INR).
2. Set up the first manual account, its type and opening balance. No bank credentials or bank connection.
3. Optionally enter a monthly income **plan**; it does not create an income transaction. Start with Free, with no trial or charge.

A backup can also be restored directly from setup. Existing records/older backups are validated and preserved. Incomplete setup remains incomplete after reload. Currency selection changes display, not the value of previously recorded amounts.

## Five appearances

Open **Style Studio** in the header or Settings. Every style supports light, dark and device mode, with locally bundled fonts and reduced-motion support.

| Style         | Character                                               |
| ------------- | ------------------------------------------------------- |
| Minimal       | Black, white and grayscale; default professional layout |
| Botanical     | Original warm cream and forest-green identity           |
| Brutalist     | Bold outlines, square corners and yellow accents        |
| Neon          | Carbon/neutral surfaces with electric yellow-lime       |
| Glassmorphism | Frosted panels and an embedded misty landscape          |

## Run locally

Use the Node version in `.nvmrc` (Node 22.12+ or 24+).

```sh
npm ci
npm run dev -- --host 0.0.0.0
```

No environment variables, database, API key or authentication provider are required. The production service worker caches the app shell after a successful online visit so the web app can reopen offline. The Android shell uses the packaged build rather than a remote website.

```sh
npm run typecheck
npm test
npx playwright install --with-deps chromium
npm run test:e2e:local   # real onboarding / Free / locked Pro behavior, desktop + mobile
npm run test:e2e         # isolated development finance + appearance regression fixture
npm run build
npm run test:offline     # built GitHub Pages subpath, offline setup/save and production Pro gates
npm run android:sync     # build and copy web assets/plugins; NOT a native compile
npm run android:open     # requires Android Studio / JDK / SDK
```

The finance regression server alone enables `VITE_E2E_LEGACY=1` on port 5175 under Vite development mode. It supplies historical sample records and test access to advanced screens. Ordinary preview and the local-plan suite do not enable it. **Production builds remove this flag entirely; it is not a purchase or customer entitlement.** The local suite runs separately on port 5176; the app preview remains on 5173.

`npm run review:screenshots` captures the actual onboarding, dashboard, entry form and paywall from a running ordinary development preview into ignored `test-results/review/`.

## Data ownership and limits

- Finance/profile data: validated JSON in `localStorage`, key `spendwise-workspace-v1`; appearance uses separate local preferences. No finance upload, analytics tracker, remote font or AI API is included.
- Save failures stay visible; current in-memory records can still be exported. Unreadable stored files are not silently overwritten. Raw-file recovery, explicit replacement, backup preview/confirmation and Undo are provided.
- Export JSON regularly. Restore manually on another device. Web data is specific to the browser profile **and site origin**; changing domain, clearing storage, private browsing expiry, device loss or uninstalling can leave it unavailable.
- Records and exports are **not application-encrypted**. A trusted device/browser profile and safe backup destination are required. A share destination chosen by the user may store a copy outside this app.
- Local storage has browser/WebView-specific size limits; this is a small personal-workspace architecture, not a high-volume accounting database. Separate-tab changes are observed, but simultaneous multi-tab writes are not transactionally serialized.
- Android exports use the Filesystem/Share plugins. The cache copy is not a durable backup; save through the share sheet. Device testing and store release tasks remain open.

## Documentation

- [Product scope and design rationale](docs/PRODUCT.md)
- [Appearance architecture and references](docs/APPEARANCE.md)
- [Pro Analytics calculation semantics](docs/ANALYTICS.md)
- [Release checklist / billing and native boundaries](docs/RELEASE.md)
- [Validation results and limitations](docs/QA.md)

GitHub Pages deployment is configured in `.github/workflows/deploy-pages.yml`; financial records are never part of the deployed site artifact.
