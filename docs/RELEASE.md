# Web + Android release guide

## Honest status

This repository contains the working React application, a Supabase integration, SQL authorization/revision-write migration, account-deletion function, and a Capacitor Android project. **It is not a deployed customer service or a published Play Store application.**

Without cloud environment values, the preview opens a browser-local demo. Sign-in explicitly explains that it is not configured; it never simulates a successful login or sync. With configuration, the application opens real Supabase email/password authentication and a customer-specific workspace. New cloud accounts start empty, separate from sample records.

Automated local tests are not a hosted Supabase security audit, email-deliverability check, real-device test, or store approval.

## 1. Provision a dedicated Supabase project

Use the Supabase dashboard/CLI on your own developer environment. Select a region and data retention policy appropriate to your customers. Do not paste service-role keys into chat or frontend files.

1. Apply `supabase/migrations/202610210001_workspaces.sql` with the SQL editor, or link the CLI project and run `supabase db push`. Back up any existing database before migrations.
2. Enable email/password sign-in, email confirmation, a minimum 12-character password policy, production SMTP, rate limits, and appropriate signup abuse protection. `supabase/config.toml` documents local defaults; remote dashboard settings must also be configured. CAPTCHA integration, MFA, and a dedicated session/device management screen are not included in this foundation; add and verify the intended abuse/security controls before public signup.
3. Set Auth's Site URL to the canonical HTTPS web URL **including the repository subpath**, if any. Allow exact callback URLs for that web URL and `spendwise://auth-callback`. Do not use broad production redirect wildcards. PKCE email links must be opened on the device/browser that requested them; request a new recovery link there if necessary.
4. Deploy account deletion: `supabase functions deploy delete-account --no-verify-jwt`. The function independently verifies the bearer token using Auth `getUser()` and only deletes that verified user; it never accepts a client-supplied user ID. Set the function's `ALLOWED_ORIGINS` secret to a comma-separated list of exact origins, such as your canonical web origin and the packaged Android origin `https://localhost`. Paths/trailing slashes are not origins. Verify the actual native origin on a device. The automatically provided `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` remain server-only. Test CORS, missing/expired tokens, cross-account attempts, and deletion on a disposable project.
5. Add the project's public URL and **publishable** key to `.env.local`, following `.env.example`. Rebuild/restart after changing values. Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are required. Never use an `sb_secret_…`/service-role key in a `VITE_` variable.
6. Configure database backups and actually rehearse restore, alerting, capacity limits, incident handling, support, and deletion retention. Enable a suitable Supabase plan/backup policy; this repository does not provision one.

```sh
npm ci
npm run dev
# production web bundle:
npm run build
```

### Authorization and sync contract

- `workspaces.user_id` references Auth users with cascading deletion. Row-level security allows authenticated customers to read only their own row. Anonymous reads and direct client writes are denied.
- `save_workspace(payload, expected_revision)` is a narrowly granted SECURITY DEFINER RPC with an empty search path. It derives ownership from `auth.uid()` and atomically checks the revision. SQLSTATE `40001` triggers a visible conflict, never a silent overwrite. Database constraints reject demo payloads and payloads larger than 10 MiB. The frontend strictly validates the complete model; the database is not a complete financial schema validator.
- Writes are serialized and debounced by 500 ms. An edit arriving during an in-flight request remains pending. Active devices poll revisions every 15 seconds and on resume; an unchanged revision does not replace app state or drafts. Changed snapshots download only when needed. Transaction, recurring-payment, savings-goal and account editors reject stale records rather than overwriting an intervening remote edit. No realtime collaboration or field-level automatic merge is claimed.
- Conflicts offer downloadable device/cloud versions and require an explicit acknowledged choice. A second intervening edit produces another conflict, not a forced update.
- Modern HTTPS Web Locks allow **one active customer-workspace tab per browser profile** to protect the shared durable outbox. A second tab explains the restriction and waits for the first to close; it then acquires the write lease. Independent devices/browser profiles are supported through server revision checks. This is a deliberate MVP limitation, not multi-editor collaboration.
- Account snapshots and pending edits are scoped by user ID in local storage (`spendwise-outbox-v1:<user-id>` and `:saved`). Saved snapshots permit offline reopening after a prior successful load, while the session remains locally available. Authentication refresh/recovery still needs a network. Cloud sync runs while the app is active; there is **no guaranteed background sync** after Android closes the app.
- Device copies, sign-in persistence, and downloaded files have **no application-level encryption**. Do not claim end-to-end encryption or bank-grade storage. Android's app sandbox and disabling automatic backup are not equivalent to an encrypted application database. Evaluate secure native credential storage, device-lock requirements, local database encryption, CSP and an independent security review before handling real customer financial data.
- Recovery storage failures remain visible. Unreadable recovery files block editing until explicitly exported/discarded; they are not silently replaced. Explicit sign-out warns before discarding pending edits and clears that user's local snapshots/recovery after Auth sign-out succeeds. Other devices, copied exports, browser/OS backups, and operator database backups are not remotely erased by this local cleanup.
- Whole-workspace snapshots are an early small-workspace architecture. The model caps accounts (100), categories (200), transactions/transfers (50,000 each); the database's 10 MiB cap may be reached first. Benchmark realistic records and network costs. Migrate to per-record versioning/transactional APIs before high-volume use, collaborative access, or large-scale service operation.

## 2. Deploy the web app

The app supports static hosting and repository subpaths. Upload all of `dist/`, not just `index.html`. Serve HTTPS; Web Locks and service workers need secure contexts. Keep Auth callbacks and the Edge Function origin allowlist in sync with your domain.

For GitHub Pages, the build workflow reads the two public Supabase values from repository **Actions variables** with the same names. Empty variables intentionally produce the local demo. Client configuration is embedded at build time and is public. CI browser tests exercise the unconfigured demo and a separate mocked-cloud server; they do not sign in to your production project.

Before public signup, publish actual business-owned **privacy policy, terms, support contact, and a public account/data deletion request page**. Wire the published privacy/terms links into the account-creation screen. The current preview has a disclosure, not legal documents. Make accurate disclosures about financial records, email/account identifiers, cloud processors, device copies, exported data, retention, backups, and deletion exceptions. A web deletion-request route is not supplied here; the in-app deletion integration alone is not the complete store requirement.

## 3. Package Android with Capacitor

This is a **shared React/WebView UI with native bridges**, not a fully native Kotlin interface. Native integrations include email-link callbacks, app resume refresh, Android back handling, cache-file export and the native share sheet. Web service-worker registration is intentionally skipped inside Capacitor.

The checked-in Android project currently uses an **example application ID**, generic generated launcher/splash assets, versionCode 1 and versionName 1.0. It compiles against/targets API 36, min SDK 24, and its generated Capacitor Gradle configuration requires Java 21. Confirm supported SDK/JDK/Android Studio versions against the installed Capacitor release.

Before the first release:
- Choose and verify a business-owned application ID and brand/trademark availability. Replace `com.example.spendwise` consistently in `capacitor.config.ts`, the Android `namespace`/`applicationId`, Java package declarations/directories and strings. Changing the config alone does not rename a generated native project.
- Replace generated icons/splash resources with approved production brand assets. Configure theme-aware system bars and validate Android edge-to-edge, safe areas, keyboard, font scaling, navigation and accessibility on physical devices. Add verified HTTPS App Links on a business-owned domain rather than relying solely on a custom scheme for a public release.
- Review native session storage and privacy hardening; backup is disabled and cleartext network traffic is disallowed in the manifest. The custom `spendwise://auth-callback` intent is registered. PKCE verification is used; actual signup/recovery email round-trips must be tested on Android.

```sh
npm run android:sync    # typecheck + production web build + cap sync android
npm run android:open    # Android Studio
# On a machine with Java 21, Android SDK and Gradle dependencies available:
cd android
./gradlew assembleDebug
# Configure secure release signing in Android Studio, then generate a signed AAB.
```

Never commit keystores, passwords, `local.properties`, or private signing configuration. Use Play App Signing and secure CI secrets/credential management. Do not add a development `server.url` to a release config. Native assets are copied by `android:sync`, not committed under `assets/public`.

**This sandbox has no Java/Android SDK.** Capacitor project generation and web-asset/plugin synchronization can be validated here; APK/AAB compilation, installation, signing and Play upload cannot be claimed from those checks.

## 4. Release gates — not optional

- [ ] Dedicated backend migrated; real two-user RLS and stale-write tests against the hosted project.
- [ ] Real sign-up/confirmation, invalid-password, reset/recovery, expired session and refresh tested on web and Android.
- [ ] Cross-device edits, offline restart, airplane mode, conflict decisions, quota/storage failures, sign-out and account deletion exercised with non-production records.
- [ ] Delete-account function deployed, audited and tested; public deletion-request page published with retention and deletion policy.
- [ ] Privacy policy/terms/support linked in UI and store; cloud region, processors, retention, financial-data handling and Data safety answers reviewed.
- [ ] Android identity/assets, secure credential storage decision, signing, accessibility, TalkBack, keyboard, orientation, tablet, edge-to-edge, slow network, low memory, upgrade/restore and lifecycle tests completed on devices.
- [ ] AAB builds and installs; versioning and signing keys protected; internal/closed testing and Play's current target SDK/quality requirements checked in Play Console.
- [ ] Google Play financial-features declaration and Data safety disclosures completed accurately. The app records personal finances; it does not provide bank connectivity, lending, investment execution or payments.
- [ ] Business ownership, privacy/security review, database backups/restore, monitoring, support, operating costs and incident response approved.

## Local verification

```sh
npm run typecheck
npm test                  # finance + catalog + sync-engine + PostgreSQL/RLS tests
npm run test:e2e          # desktop/mobile demo flows, themes and automated accessibility
npm run test:e2e:cloud    # real client with mocked HTTP, not a deployed backend
npm run build
npm run test:offline      # production shell at /Expense-Tracker/ and offline demo persistence
npm run android:sync
```

`@electric-sql/pglite` runs the migration and authorization tests in a local PostgreSQL-compatible WASM engine. It does not test Supabase's HTTP gateway/Auth service, email delivery, Edge Function deployment, or production secrets. Mocked-cloud browser tests similarly verify app interactions without asserting that a live service exists.
