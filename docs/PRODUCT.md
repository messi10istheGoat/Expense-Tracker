# Product direction: a dependable finance workspace

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
- An explicit demo label, a destructive-action confirmation boundary, and an empty-workspace path.
- One currency per workspace; currency selection never silently converts existing money.

## Commercial product direction and boundaries

The default product identity is restrained Minimal: neutral surfaces, one prominent entry action, exact financial balances, plain labels, consistent table/form controls and a desktop review/mobile capture split. Botanical, Brutalist, Neon and Glassmorphism remain optional personalization rather than separate product brands. Generated concept art is not part of this redesign.

Compact navigation keeps Overview, Transactions, Analytics and Accounts visible, with secondary tools in More. Analytics stays immediately after Transactions. Category entry follows editable-combobox keyboard behavior with explicit create/select; draft fields are not reset when a category is created or a cloud refresh arrives.

The web and Android apps share React UI through Capacitor. Supabase integration supplies configurable email/password auth and user-specific revision-checked sync; it is not a fake signed-in demo. The repository also includes RLS/CAS SQL, account deletion integration, user-scoped recovery/cache, explicit conflict decisions and an Android project. **Provisioning, hosted end-to-end checks, native-device validation, privacy/business operations and store publication remain release work.** See [RELEASE.md](RELEASE.md) for precise setup, limitations and gates.

Device data and exports are not application-encrypted. Cloud access authorization is not end-to-end encryption. Whole-workspace snapshots and one active tab per customer/browser profile are deliberate MVP limitations. Bank imports, receipts, payments, external notifications, MFA, production abuse controls and collaborative households are not supplied as completed features.

Research informing interaction/platform choices: [WAI-ARIA editable combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/), [NN/g cognitive load](https://www.nngroup.com/articles/4-principles-reduce-cognitive-load/), [Android adaptive navigation](https://developer.android.com/develop/adaptive-apps/guides/build-adaptive-navigation), [Capacitor Android workflow](https://capacitorjs.com/docs/android), and [Google Play financial-features declaration](https://support.google.com/googleplay/android-developer/answer/13849271). These are implementation guidance, not evidence of a usability certification or store approval.

## Dedicated Analytics workspace

Analytics now follows Transactions in navigation, distinct from the existing pattern-detection Insights page. It provides interactive reports from logged workspace records, with transparent period-comparison and budget-proration semantics, drill-down editing, and exports. See [Analytics](ANALYTICS.md). The supplied banking reference informs the carbon/lime Neon look; Minimal is now explicitly black-and-white. Botanical and Brutalist remain available in both modes.
