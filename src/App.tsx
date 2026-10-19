import { useMemo, useRef, useState } from "react";
import { BudgetList } from "./components/BudgetList";
import { CashFlowChart } from "./components/charts/CashFlowChart";
import { CategoryBars } from "./components/charts/CategoryBars";
import { CategoryDonut } from "./components/charts/CategoryDonut";
import { WeekdayChart } from "./components/charts/WeekdayChart";
import { FilterBar } from "./components/FilterBar";
import { Header } from "./components/Header";
import { Insights } from "./components/Insights";
import { KpiCard } from "./components/KpiCard";
import { TopMerchants } from "./components/TopMerchants";
import { TransactionsTable } from "./components/TransactionsTable";
import { ThemeProvider } from "./hooks/useTheme";
import {
  aggregateSeries,
  allowedGranularities,
  autoGranularity,
  breakdownByCategory,
  breakdownByMerchant,
  budgetProgress,
  buildInsights,
  compareLabel,
  computeTotals,
  filterTransactions,
  getViewMode,
  presetLabel,
  presetRange,
  previousRange,
  PRESETS,
  topMerchants,
  weekdayStats,
} from "./lib/analytics";
import { CATEGORIES } from "./lib/categories";
import { generateDataset } from "./lib/data";
import { isSameDay, rangeLength } from "./lib/dates";
import { fmtDate, fmtInt, fmtRange, pluralize } from "./lib/format";
import { buildKpis } from "./lib/kpis";
import type { AccountId, CategoryId, DateRange, Filters, Granularity, RangePreset, Slice, TxType, TypeFilter } from "./lib/types";

const DEFAULT_PRESET: Exclude<RangePreset, "custom"> = "12m";

function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const dataset = useMemo(() => generateDataset(), []);
  const { start: dataStart, end: today } = dataset;

  const makeDefaults = (): Filters => ({
    preset: DEFAULT_PRESET,
    range: presetRange(DEFAULT_PRESET, today, dataStart),
    type: "all",
    accounts: [],
    categories: [],
  });

  const [filters, setFilters] = useState<Filters>(makeDefaults);
  const [granOverride, setGranOverride] = useState<Granularity | null>(null);
  const [query, setQuery] = useState("");
  const tableRef = useRef<HTMLDivElement>(null);

  // ───────────── Filter actions
  const setPreset = (preset: Exclude<RangePreset, "custom">) => {
    setFilters((f) => ({ ...f, preset, range: presetRange(preset, today, dataStart) }));
    setGranOverride(null);
  };

  const setRange = (range: DateRange) => {
    const match = PRESETS.find((p) => {
      const r = presetRange(p.value, today, dataStart);
      return isSameDay(r.from, range.from) && isSameDay(r.to, range.to);
    });
    setFilters((f) => ({ ...f, range, preset: match ? match.value : "custom" }));
    setGranOverride(null);
  };

  const setType = (type: TypeFilter) =>
    setFilters((f) => ({
      ...f,
      type,
      categories: type === "all" ? f.categories : f.categories.filter((c) => CATEGORIES[c].type === type),
    }));

  const setAccounts = (accounts: AccountId[]) => setFilters((f) => ({ ...f, accounts }));
  const setCategories = (categories: CategoryId[]) => setFilters((f) => ({ ...f, categories }));

  const focusCategory = (id: CategoryId) =>
    setFilters((f) => ({
      ...f,
      categories: [id],
      type: f.type === "all" || f.type === CATEGORIES[id].type ? f.type : "all",
    }));

  const reset = () => {
    setFilters(makeDefaults());
    setGranOverride(null);
    setQuery("");
  };

  const scrollToTable = () => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const showMerchant = (merchant: string) => {
    setQuery(merchant);
    scrollToTable();
  };

  // ───────────── Derived data — every view reads from the same filtered set
  const { range } = filters;
  const days = rangeLength(range);
  const mode = getViewMode(filters);
  const focus: TxType = mode === "income" ? "income" : "expense";
  const prevRange = useMemo(() => previousRange(range), [range]);
  const comparable = prevRange.from.getTime() >= dataStart.getTime();

  const current = useMemo(() => filterTransactions(dataset.transactions, range, filters), [dataset, range, filters]);
  const previous = useMemo(
    () => (comparable ? filterTransactions(dataset.transactions, prevRange, filters) : null),
    [dataset, prevRange, filters, comparable],
  );

  const allowed = allowedGranularities(range);
  const granularity: Granularity = granOverride && allowed[granOverride] ? granOverride : autoGranularity(range);

  const series = useMemo(() => aggregateSeries(current, range, granularity), [current, range, granularity]);
  const totals = useMemo(() => computeTotals(current, days), [current, days]);
  const prevTotals = useMemo(() => (previous ? computeTotals(previous, days) : null), [previous, days]);
  const kpis = useMemo(() => buildKpis(mode, totals, prevTotals, series), [mode, totals, prevTotals, series]);

  const focusCats = filters.categories.filter((c) => CATEGORIES[c].type === focus);
  const drillCategory = focusCats.length === 1 ? focusCats[0] : null;
  const slices = useMemo(
    () =>
      drillCategory
        ? breakdownByMerchant(
            current.filter((t) => t.category === drillCategory),
            focus,
          )
        : breakdownByCategory(current, focus),
    [current, focus, drillCategory],
  );

  const weekdays = useMemo(() => weekdayStats(current, range, focus), [current, range, focus]);
  const budgets = useMemo(() => budgetProgress(current, range, filters.categories), [current, range, filters.categories]);
  const merchants = useMemo(() => topMerchants(current, previous, focus, 6), [current, previous, focus]);
  const insights = useMemo(() => buildInsights({ current, previous, totals, mode, weekdays }), [current, previous, totals, mode, weekdays]);

  const counts = useMemo(() => {
    const accounts = new Map<AccountId, number>();
    const categories = new Map<CategoryId, number>();
    for (const t of filterTransactions(dataset.transactions, range, { type: "all", accounts: [], categories: [] })) {
      accounts.set(t.account, (accounts.get(t.account) ?? 0) + 1);
      categories.set(t.category, (categories.get(t.category) ?? 0) + 1);
    }
    return { accounts, categories };
  }, [dataset, range]);

  const isDefault = filters.preset === DEFAULT_PRESET && filters.type === "all" && !filters.accounts.length && !filters.categories.length;

  const onSliceClick = (s: Slice) => {
    if (s.categoryId) focusCategory(s.categoryId);
    else if (!s.id.startsWith("m:__")) showMerchant(s.label);
  };

  const rangeText = fmtRange(range.from, range.to);
  const compareText = comparable ? compareLabel(filters.preset, range) : "No earlier data to compare";

  const donut = drillCategory
    ? {
        title: `${CATEGORIES[drillCategory].label} by merchant`,
        subtitle: "Click a merchant to see its transactions",
        center: CATEGORIES[drillCategory].label,
        drill: { label: "All categories", onBack: () => setCategories(filters.categories.filter((c) => c !== drillCategory)) },
      }
    : focus === "expense"
      ? { title: "Spending breakdown", subtitle: "Share of spending by category", center: "Total spent", drill: null }
      : { title: "Income sources", subtitle: "Share of income by source", center: "Total income", drill: null };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-[1440px] px-4 pb-10 sm:px-6 lg:px-8">
        <div className="animate-fade-in flex flex-col gap-2 pt-6 pb-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{greeting()}, Alex</p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px] dark:text-white">Your money at a glance</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-200">{presetLabel(filters.preset)}</span>
            <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
            {rangeText}
            <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
            {pluralize(days, "day")}
          </p>
        </div>

        <FilterBar
          filters={filters}
          dataStart={dataStart}
          today={today}
          counts={counts}
          isDefault={isDefault}
          onPreset={setPreset}
          onRange={setRange}
          onType={setType}
          onAccounts={setAccounts}
          onCategories={setCategories}
          onReset={reset}
        />

        <div className="mt-1 space-y-4 sm:space-y-5">
          <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
            {kpis.map((k, i) => (
              <KpiCard key={k.id} spec={k} compareText={compareText} index={i} />
            ))}
          </section>

          <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
            <CashFlowChart
              className="lg:col-span-2"
              series={series}
              totals={totals}
              mode={mode}
              granularity={granularity}
              allowed={allowed}
              onGranularity={setGranOverride}
              onReset={reset}
            />
            <CategoryDonut
              slices={slices}
              title={donut.title}
              subtitle={donut.subtitle}
              centerLabel={donut.center}
              drill={donut.drill}
              onSliceClick={onSliceClick}
              onReset={reset}
            />
          </div>

          <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
            <CategoryBars className="lg:col-span-2" series={series} focus={focus} granularity={granularity} onCategoryClick={focusCategory} onReset={reset} />
            <WeekdayChart stats={weekdays} focus={focus} onReset={reset} />
          </div>

          <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
            <BudgetList rows={budgets} available={mode !== "income"} onCategoryClick={focusCategory} />
            <TopMerchants rows={merchants} focus={focus} onSelect={showMerchant} onReset={reset} />
            <Insights className="md:col-span-2 xl:col-span-1" items={insights} />
          </div>

          <div ref={tableRef} className="scroll-mt-20 lg:scroll-mt-48">
            <TransactionsTable
              transactions={current}
              query={query}
              onQueryChange={setQuery}
              onCategoryClick={focusCategory}
              onReset={reset}
              subtitle={`${presetLabel(filters.preset)} · ${rangeText}`}
            />
          </div>
        </div>

        <footer className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-slate-200 pt-6 text-center text-xs text-slate-400 sm:flex-row sm:text-left dark:border-slate-800 dark:text-slate-500">
          <p>© {today.getFullYear()} Spendwise · Demo data generated locally — no real accounts connected.</p>
          <p className="tabular-nums">
            {fmtInt(dataset.transactions.length)} transactions · {fmtDate(dataStart)} – {fmtDate(today)}
          </p>
        </footer>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Dashboard />
    </ThemeProvider>
  );
}
