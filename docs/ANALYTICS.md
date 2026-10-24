# Analytics workspace

**Availability:** Analytics is a Pro destination. The current paywall-first build keeps it locked; pricing and real billing are not configured. The calculations below describe the implemented tool and its development regression coverage, not an active subscription offer.

Open **Analytics**, immediately after Transactions in desktop navigation and mobile bottom navigation. It is separate from **Insights**, which retains its repeat-charge, possible-duplicate, and spending-fingerprint tools.

## Controls and reports

- **Periods:** this month to date, last complete month, last 30/90 inclusive calendar days, year to date, or applied custom dates.
- **Filters:** account, category (including income categories), and cleared/pending status. Reset restores this-month/all-accounts/all-categories/all-statuses. These are temporary report controls; they never rewrite financial data.
- **Summaries:** income, expense, net cash flow, average daily spending, income-retention rate, average purchase, largest expense, and matching/pending counts.
- **Trend:** spending, income, or net-flow metric; line/area or bars; daily/weekly/monthly aggregation; optional preceding-period comparison; exact accessible chart-data table. Daily grouping is limited to ranges of at most 366 days for rendering performance.
- **Breakdowns:** category amounts/shares, five highest-spending merchants, weekday spending averages, per-account income/expense/net activity, and current budget-limit comparisons.
- **Drill-down:** category, merchant, and account buttons focus/scroll to matching source records. Search merchant/notes, sort newest/largest, paginate eight rows at a time, and open the existing transaction editor. Edits immediately recalculate the report. Clearing drill-down retains the global report filters.
- **Exports:** report CSV includes applied filters, exact current/prior dates, summary values, all trend buckets, categories, all matching merchant groups, accounts, weekday averages, and budget allowances. The separate transaction CSV exports all records matching the report plus drill-down/search, not just the visible page. Currency codes are included in the report, and formula-like user text is escaped for spreadsheet safety.

## Financial semantics

The source is `Workspace.transactions`, not generated chart values or a separate dataset. Pending transactions count unless excluded by the status filter. Amounts are positive; income/expense types determine net-flow signs. Transfers, opening balances, bill reminders, and savings-goal earmarks do not count as analytical income or expenses. Account summaries show **activity**, not balances. The app still has no bank connection or financial advice service.

All dates are inclusive local calendar dates stored as ISO strings. Date arithmetic uses UTC calendar stamps solely to avoid daylight-saving day-length errors; it does not shift the user's recorded dates. Custom ranges require valid dates between 1900-01-01 and today, start no later than end, and no more than 3,660 days. Draft custom inputs do not change the displayed report until **Apply range** succeeds. Invalid inputs leave the applied report intact.

The comparison is the immediately preceding, non-overlapping interval of **equal day count**, with identical account/category/status filters. For example, October 1–20 compares with September 11–30, not September 1–20 or all of September. Both date ranges are exposed in the chart table, report export, and explanatory footer. Percent changes use the absolute prior amount as denominator, so signed net-flow baselines remain meaningful. A nonzero current value with zero prior value has **no previous baseline**, not fabricated percentage growth; zero versus zero is no change. Missing records are not proof of no spending.

Daily buckets cover individual dates; weekly buckets are consecutive seven-day groups beginning at the report start, not ISO calendar weeks. Monthly buckets use calendar-month boundaries with partial edge months. Each previous bucket maps to the same elapsed days within the preceding interval; previous totals reconcile without silently dropping surplus calendar days. Empty buckets are zero-filled. Income retention is net / logged income, not an account balance or investment return; without income it is undefined (shown as a dash). Negative rates are retained as text, with only the decorative ring clamped to 0–100%.

Weekday averages divide total logged spending by the number of occurrences of that weekday in the range, including dates with no logged transactions. Merchant groups normalize case and trim whitespace, and rank **expenses by total**, not visits. They do not infer subscriptions or recurring commitments.

Budget allowances use **current recurring monthly category limits**, prorated by the actual days selected in each month (including leap years). They are planning references, not historical budget snapshots. Account/status filters narrow spending, but do not invent account-specific limits. Income-category filters have no expense-category budget rows. No limits, balances, forecasts, or recommendations are fabricated for empty data.

## Implementation and validation

- `src/finance/analytics.ts`: pure date validation/arithmetic, matching, aggregation, comparisons, grouping, prorated budget references, and safe report export.
- `src/finance/Analytics.tsx`: reactive report controls and source-record drill-down, using the existing finance provider and transaction editor.
- `src/finance/styles/analytics.css`: semantic theme-aware styling, responsive layout, scoped chart/table presentation. No additional remote assets or APIs.
- `src/finance/analytics.test.ts`: boundaries, leap dates, invalid/custom intervals, zero baselines, negative net, all filters, bucket reconciliation, weekday denominators, budget proration, normalized merchants, and export escaping.
- `tests/analytics.spec.ts`: deterministic validated workspace fixtures; desktop/mobile navigation, filtering, date validation, chart controls, drill-down, search, exports, edit recalculation, empty states, eight-appearance axe checks, and five-width/larger-text layout coverage.

Automated accessibility coverage is a regression check, not certification. Desktop/mobile projects use Chromium, with mobile touch/viewport emulation rather than native Safari.
