# Validation report · 22 October 2026

This report covers the **local-only onboarding / Free plan / locked Pro pivot**, not the superseded cloud implementation. Checks run against the actual React app and built production artifact.

## Results

| Check                                                | Result                                          |
| ---------------------------------------------------- | ----------------------------------------------- |
| TypeScript (`npm run typecheck`, also part of build) | Passed                                          |
| Unit tests (`npm test`)                              | **110 passed, 5 files**                         |
| Local onboarding / Free / Pro browser suite          | **26 passed**, desktop and mobile Chromium      |
| Finance / appearance regression suite                | **98 passed**, desktop and mobile Chromium      |
| Built production subpath + offline integration       | Passed                                          |
| Production build                                     | Passed; single-file HTML ~1.21 MB, gzip ~430 KB |
| Capacitor Android asset/plugin sync                  | Passed; App, Filesystem and Share plugins       |
| Production dependency audit (`npm audit --omit=dev`) | **0 reported vulnerabilities**                  |
| Whitespace / patch check (`git diff --check`)        | Passed                                          |

The local suite runs the real Free-plan behavior without test entitlements. The finance suite explicitly uses the **development-only** legacy fixture to retain coverage of implemented advanced tools while production keeps them locked. Its results are not evidence of a real purchase or activated customer subscription.

## Coverage

- Fresh onboarding has no imaginary name, transactions, income or balances. Reloading incomplete setup does not complete it. Name/currency/account/opening balance are saved on-device, with planned income separate from transactions.
- Free transaction entry and inline category creation preserve drafts; accounts and category management remain functional. Core backup/restore stays free, uses confirmation, and supports Undo. A backup can restore on a new browser context from onboarding.
- All six direct Pro hashes remain locked without mounting the advanced tool. Desktop navigation, mobile bottom navigation, Overview and global search lead to the same paywall. Pricing/purchases remain unavailable, Subscribe is disabled and restore purchases cannot report a successful restoration. Fake local plan flags do not unlock Pro.
- Invalid backup imports do not replace records. Corrupt initial storage remains untouched and can be downloaded raw; explicit replacement unblocks setup. Simulated write failures remain visible and the unsaved in-memory records can still be exported.
- Local flows make no third-party requests and report no runtime exceptions in the covered paths. Automated WCAG A/AA checks cover each onboarding step and the paywall at 320px; existing finance/appearance checks cover the five styles in both light and dark.
- The finance fixture exercises transactions, quick capture, transfers, account/category CRUD, reassignment, goals, bills, budgets, Lab, Analytics filtering/drill-down/export, appearance persistence/cross-tab changes, dialog/keyboard behavior and responsive layouts.
- The production check serves the real `/Expense-Tracker/` subpath: service-worker control, offline first-run setup, offline record saving/reload, offline appearance persistence including embedded Glass landscape, all six Pro gates after reload, disabled billing, no third-party requests and removal of the development entitlement flag from the bundle.

Initial local-test runs exposed outdated test selectors; these were corrected to the app’s actual accessible labels. A later parallel stress run exceeded the default 30-second budget in the combined onboarding/account/backup/restore workflow on desktop. The local suite now allows 60 seconds per workflow; the subsequent complete isolated run passed **26/26**, with that workflow completing in about 10 seconds. No application behavior was changed to bypass those checks. The complete finance suite passed **98/98** in one run.

## Actual UI review

`npm run review:screenshots` captured real onboarding, dashboard, transaction form and paywall screens at 1440×1000 and 390×844, under ignored `test-results/review/`. Reduced motion produces settled financial values rather than capturing number interpolation. The reviewed mobile paywall keeps the unavailable-billing disclosure, disabled Subscribe action and Continue with Free visible. Screens are actual browser output, not generated concepts or production customer records.

## Not validated / remaining boundaries

- **No live billing:** product prices, purchases, trials, entitlement verification, renewals, refunds and actual store restoration are not implemented.
- **No native build/device run:** Capacitor synchronization is not a Java/Kotlin compile, signed APK/AAB, physical Android test or Play Store release. The example application ID still needs replacement.
- No Safari/iOS physical-device coverage, manual screen-reader certification, independent security audit or high-volume performance certification.
- Device storage and exports are not application-encrypted; no online backup or recovery exists. Clearing storage, losing the device or uninstalling can remove records. Storage limits/eviction vary by browser and WebView. Simultaneous multi-tab edits are not transactionally serialized.
- Native export cache files are not proactively cleaned in this version; a cache copy is not a durable backup. Native persistence, file import/share, upgrade behavior, permissions, lifecycle and billing must be validated on actual Android devices before release.

See [RELEASE.md](RELEASE.md) for launch gates. Passing browser tests and asset synchronization do not mean the app has been published or that customers can subscribe.
