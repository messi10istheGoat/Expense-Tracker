# Product direction: a dependable finance workspace

## Current product contract

Spendwise is an **on-device personal-finance app**, not a cloud service. There is no Spendwise account, email/password login, cloud database, automatic financial sync, or bank connection. The same React UI runs in the browser and the Capacitor Android shell.

First-run setup collects a local name, display currency, first manual money account/type/opening balance and optional planned income. A fresh install contains no sample transactions, fictional identity, income or balances. Setup completion is explicit and persisted; simply opening or reloading the app cannot complete it. Existing valid records and older backups are preserved, not automatically replaced with empty data.

| Free                                                                                                                                               | Pro (locked in this build)                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Overview, transactions, quick capture, accounts/transfers, categories, profile, five themes/light-dark, JSON backup/restore, transaction CSV, Undo | Analytics, budgets, goals, recurring bills, Insights, Decision Lab/pause pocket |

Selecting a Pro destination opens a common subscription paywall. Direct hash links render a locked screen, without mounting the advanced tool. Subscription purchases, pricing, trials, upgrades and purchase restoration are **not configured**. No screen or persisted plan flag can activate Pro in production. Core data ownership never requires a subscription.

## Research

The research focused on the products’ own public feature documentation, rather than copying their screens or claiming that every feature here is unique:

1. YNAB makes future and repeating transactions visible in its register and planning interface. Its guide also distinguishes a scheduled transaction from confirming that a transaction actually happened. [1](https://support.ynab.com/en_us/scheduled-transactions-a-guide-BygrAIFA9)
2. YNAB’s feature overview emphasizes deciding what money is for and setting savings goals. [2](https://www.ynab.com/features)
3. Monarch’s recurring-expense documentation describes calendar/list visibility for bills and subscriptions, along with paid confirmations. [3](https://www.monarch.com/blog/track-recurring-bills-and-subscriptions)
4. Monarch describes budgeting in terms of planned cash flow, rather than treating current account balances as a complete spending plan. [4](https://help.monarch.com/hc/en-us/articles/360048883631-Creating-Your-Budget-in-Monarch)

These establish useful foundations: capture, planning, goal progress, recurring commitments, and visibility. Spendwise implements manual-entry equivalents without pretending it has the bank integrations behind those products.

## The differentiating experience

The guiding product hypothesis is that recording spending is only half the job. People also need a gentle place to think **before** spending.

### Decision Lab

- A purchase scenario recalculates planned monthly room and daily room.
- A take-home hourly-rate input makes the price understandable in work hours.
- A savings-goal comparison shows an alternative use for the same amount without falsely predicting an exact delay.
- A small-shift simulator applies a user-chosen reduction to all recorded expenses in the last 30 days, including custom categories.
- A pause pocket preserves wanted purchases with a 24-hour reflection counter. The user stays in control; it is not an enforced lockout.

The differentiation is this cohesive, nonjudgmental decision workflow—not an unverified claim that no other app has any individual element.

### Explainable pattern detective

- Possible repeats: the same normalized merchant in at least two of the last four calendar months, similar amounts within 10% or one unit of the selected currency, and no more than two charges per month on average.
- Possible duplicates: same date, normalized merchant, amount, type, and account in the selected month.
- Spending fingerprint: 84 calendar days of logged expense totals. Empty records are explicitly not presented as verified no-spend days.

There is no remote AI call or invented confidence score. The user can inspect the underlying records. Nothing is deleted or converted into a subscription automatically.

## Design decisions

- Five selectable design languages: Minimal, the preserved cream/green Botanical original, Brutalist, Neon, and Glassmorphism; each supports light/dark/device mode. Locally hosted Inter, stronger hierarchy, larger reading size, and semantic chart palettes prioritize readability. See [Appearance](APPEARANCE.md) for design references and architecture.
- An overview built around readable financial summaries and actions rather than decorative chart overload.
- A fixed desktop sidebar, compact mobile bottom navigation, and an all-pages sheet.
- Native dialogs for keyboard focus containment and escape behavior; shared scroll-lock accounting for nested confirmations.
- Empty first-use records, explicit destructive-action confirmations, recoverable imports, and visible Free/Pro boundaries.
- One currency per workspace; currency selection never silently converts existing money.

## Commercial product direction and boundaries

The default product identity is restrained Minimal: neutral surfaces, one prominent entry action, exact financial balances, plain labels, consistent table/form controls and a desktop review/mobile capture split. Botanical, Brutalist, Neon and Glassmorphism remain optional personalization rather than separate product brands. Generated concept art is not part of this redesign.

Compact navigation keeps Overview, Transactions, Analytics and Accounts visible, with secondary tools in More. Analytics stays immediately after Transactions. Category entry follows editable-combobox keyboard behavior with explicit create/select; draft fields are not reset when a category is created or another tab updates local records.

The web and Android apps share React UI through Capacitor. Finance records use local device storage only; backups move records manually. The previous backend SDK, authentication screens/provider, remote-sync code, SQL/functions, callback intent filter and cloud CI configuration have been removed. See [RELEASE.md](RELEASE.md) for native/billing launch gates.

Device data and exports are not application-encrypted. Clearing storage or uninstalling can remove records; no online recovery is available. Simultaneous edits in separate tabs are not transactionally serialized. Bank imports, receipts, automatic payments, external notifications and collaborative households are not completed features. Advanced calculations remain implemented and regression-tested with an explicit development-only fixture; that is not a customer subscription or an upgrade mechanism.

Research informing interaction/platform choices: [WAI-ARIA editable combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/), [NN/g cognitive load](https://www.nngroup.com/articles/4-principles-reduce-cognitive-load/), [Android adaptive navigation](https://developer.android.com/develop/adaptive-apps/guides/build-adaptive-navigation), [Capacitor Android workflow](https://capacitorjs.com/docs/android), and [Google Play financial-features declaration](https://support.google.com/googleplay/android-developer/answer/13849271). These are implementation guidance, not evidence of a usability certification or store approval.

## Dedicated Analytics workspace

Analytics now follows Transactions in navigation, distinct from the existing pattern-detection Insights page. It provides interactive reports from logged workspace records, with transparent period-comparison and budget-proration semantics, drill-down editing, and exports. See [Analytics](ANALYTICS.md). The supplied banking reference informs the carbon/lime Neon look; Minimal is now explicitly black-and-white. Botanical and Brutalist remain available in both modes.
