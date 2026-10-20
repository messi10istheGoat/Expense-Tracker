# Product direction: a little clarity, a little more possibility

## Research

The research focused on the products’ own public feature documentation, rather than copying their screens or claiming that every feature here is unique:

1. YNAB makes future and repeating transactions visible in its register and planning interface. Its guide also distinguishes a scheduled transaction from confirming that a transaction actually happened. [1](https://support.ynab.com/en_us/scheduled-transactions-a-guide-BygrAIFA9)
2. YNAB’s feature overview emphasizes deciding what money is for and setting savings goals. [2](https://www.ynab.com/features)
3. Monarch’s recurring-expense documentation describes calendar/list visibility for bills and subscriptions, along with paid confirmations. [3](https://www.monarch.com/blog/track-recurring-bills-and-subscriptions)
4. Monarch describes budgeting in terms of planned cash flow, rather than treating current account balances as a complete spending plan. [4](https://help.monarch.com/hc/en-us/articles/360048883631-Creating-Your-Budget-in-Monarch)

These establish useful foundations: capture, planning, goal progress, recurring commitments, and visibility. Spendwise implements local-first versions without pretending it has the bank integrations behind those products.

## The differentiating experience

The guiding product hypothesis is that recording spending is only half the job. People also need a gentle place to think **before** spending.

### Decision Lab

- A purchase scenario recalculates planned monthly room and daily room.
- A take-home hourly-rate input makes the price understandable in work hours.
- A savings-goal comparison shows an alternative use for the same amount without falsely predicting an exact delay.
- A small-shift simulator applies a user-chosen reduction to the last 30 days of dining, shopping, and entertainment expenses.
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

## Delivery boundaries

This implementation is a self-contained personal-finance workspace. Production bank imports, authentication, encrypted cloud storage, native device testing, receipt OCR, external notifications, tax reporting, and shared household permissions require additional infrastructure and independent security work. They are not represented by fake buttons or fictitious sync status.

Browser-based storage keeps setup simple and avoids transmitting financial records, but is not encrypted and can be cleared by the user or browser. Export/restore and clear privacy language are essential parts of the product, not optional fine print.

## Dedicated Analytics workspace

Analytics now follows Transactions in navigation, distinct from the existing pattern-detection Insights page. It provides interactive reports from logged workspace records, with transparent period-comparison and budget-proration semantics, drill-down editing, and exports. See [Analytics](ANALYTICS.md). The supplied banking reference informs the carbon/lime Neon look; Minimal is now explicitly black-and-white. Botanical and Brutalist remain available in both modes.
