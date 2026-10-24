# Spendwise release boundaries

## Current build

Spendwise is **local-only and paywall-first**. No Spendwise authentication, cloud database, financial-data API or automatic synchronization is included. No backend provisioning or environment keys are required. Browser and Capacitor Android use the same React UI and local workspace model.

- Fresh installs: three-step local onboarding, empty records, Free plan.
- Free: core recording, manual accounts/transfers, categories, profile, all five light/dark appearances, JSON backup/restore and transaction CSV.
- Pro gates: Analytics, Budgets, Goals, Bills, Insights, Decision Lab. Ordinary navigation opens a common paywall; direct links cannot mount the tools.
- **No live billing.** No prices, trial duration, purchase success, local Pro activation switch or customer entitlement is invented. Subscribe is disabled; restore purchases explains that billing is not connected. Restoring a financial backup cannot activate Pro.

The previous backend/authentication integration, SQL/functions, native auth callback and cloud deployment configuration were removed. This code change does not remotely delete anything an operator might previously have deployed independently. Retire any such service under its actual data/retention policy; there is no automatic upload, remote migration or remote deletion in this app.

## Local storage and recovery

Workspace version remains `1`, under `spendwise-workspace-v1`. The new boolean `onboardingComplete` is persisted even before setup finishes. Older personal workspaces without that field migrate as completed; older sample workspaces keep their records and go through setup. Never silently clear older data merely because it originated as a demo.

The provider validates snapshots and saves edits synchronously to local storage, then reports storage failures visibly. If writing is blocked/full, edits remain available in memory for export; they are **not durable until storage succeeds**. Closing/reloading can lose unsaved changes. Unreadable stored data is preserved until the user explicitly replaces it, with raw-file recovery and backup restore available both in onboarding and Settings. Replacements require confirmation; Undo history is tab-local, bounded and does not survive reload.

Web records belong to this site origin and browser profile. Android records live in the app’s WebView storage. Neither a remote backup nor a recovery service exists. Changing host/browser profile, clearing storage, private browsing expiration, uninstalling, losing the device or storage eviction can make records unavailable. Financial backups are manual user-controlled JSON files. A display-currency change does not convert existing amounts.

Storage and exports are not application-encrypted. Android’s sandbox and disabled automatic backup do not constitute application-level encryption. Use accurate privacy copy, trusted devices and safe backup destinations. Validate actual storage persistence after app upgrades and OS lifecycle events on supported Android devices before release. Storage capacity is browser/WebView-dependent; benchmark realistic personal datasets. Cross-tab refreshes/stale-record checks do not provide transactional concurrent editing.

## Web deployment

```sh
npm ci
npm run typecheck
npm test
npx playwright install --with-deps chromium
npm run test:e2e:local
npm run test:e2e
npm run build
npm run test:offline
```

The Pages workflow performs these checks and deploys `dist` from `main`. The build uses relative asset URLs and an offline shell cache scoped to this app. No financial records or billing credentials belong in Git or the build. Hosting may log ordinary web requests; the application does not send financial/profile records to it. Serve on HTTPS, use a stable origin, rehearse offline updates and publish real business-owned privacy/support information before public launch.

Finance regression tests use a **development-only** legacy fixture on port 5175. The actual onboarding/Free/paywall suite runs without it on 5176. `import.meta.env.DEV` guards the fixture; production builds remove the environment-flag access. It must never become a customer unlock, release entitlement or payment substitute. The production offline check verifies all six gates, disabled billing and absence of that flag in the artifact.

## Connect billing later

Do not enable a working Subscribe action until real products, prices, entitlement verification and platform-specific purchase/restore behavior exist. In particular:

- Decide actual monthly/annual products, supported countries/currencies, pricing and refund/support policy with the business owner.
- Implement compliant Google Play billing for the Android distribution and an appropriate payment system for web. Review current platform requirements before implementation; there is no payment provider integrated here.
- Verify purchase results, restores, duplicate callbacks, pending/canceled/failed purchases, renewals, expiry, refunds and entitlement loss. Never trust editable workspace JSON/localStorage flags as proof of purchase.
- Define the offline entitlement policy, reinstall/device-transfer behavior and cancellation management. Financial records must remain device-local; do not add a finance database to implement billing.
- Keep basic tracking and backup/export/restore accessible independently of subscription status. Losing Pro must not delete existing financial records.
- Add accurate prices, renewal/offer disclosures and legal/support links only after products and platform configuration are real.

A subscription/store identity is distinct from a Spendwise profile; this app has no Spendwise account creation flow. Current gate coverage is not a secure payment-verification implementation.

## Android packaging

The checked-in Capacitor 8 project is a shared web UI in an Android container—not a separate fully native UI, signed binary or published store listing.

```sh
npm run android:sync
npm run android:open
```

`android:sync` builds and copies the bundled web app and App/Filesystem/Share plugins. It does **not** compile Java/Kotlin, verify a device, sign an APK/AAB or publish to Play. The native lifecycle integration handles back/dialog close and warns before exiting with unsaved data. Auth callback handling and its exported URL filter are removed. Native exports open a share sheet with a cache file; save a durable copy to the chosen destination. Cache exports are not proactively cleaned by this version.

### Before an Android release

- [ ] Replace example application ID `com.example.spendwise` with a business-owned ID; update Gradle namespace/application ID, Java package, strings and Capacitor config consistently.
- [ ] Configure Android Studio/JDK/SDK, build release variants and test on physical devices. Validate safe areas, keyboard, screen readers, orientation, back navigation, offline launch, close/reopen, upgrade persistence, file import and share-sheet cancellation/saving.
- [ ] Produce approved launcher/splash/store assets, business-owned privacy policy and support contact. Review current financial-features declaration, Data safety and billing-policy requirements against the actual local-only behavior; do not claim cloud security or bank integration.
- [ ] Keep backup/cleartext restrictions intentional; verify export provider/file permissions and data exposure with a security review. Add encryption/device-lock protection if the business needs it; neither is supplied here.
- [ ] Configure signing, protect the keystore outside Git, set release version/code, produce a signed AAB and complete Play Console testing/review.
- [ ] Treat live Pro billing as a separate release gate; do not advertise that customers can currently subscribe.

## Not validated here

No Android native compile, signed APK/AAB, emulator/physical-device run, Play Console release, live purchase/restore/refund or independent privacy/security audit has been performed. Browser tests use Chromium desktop and mobile emulation, not Safari or a physical phone. Automated accessibility checks supplement—not replace—manual assistive-technology testing.
