import { ArrowRight, CalendarRange, Landmark, RotateCcw, Tags, X } from "lucide-react";
import { PRESETS } from "@/lib/analytics";
import { ACCOUNTS, ACCOUNT_IDS, CATEGORIES, ESSENTIALS, EXPENSE_CATEGORIES, INCOME_CATEGORIES, LIFESTYLE } from "@/lib/categories";
import { clampDate, parseISODate, toISODate } from "@/lib/dates";
import { fmtInt } from "@/lib/format";
import type { AccountId, CategoryId, DateRange, Filters, RangePreset, TypeFilter } from "@/lib/types";
import { cn } from "@/utils/cn";
import { MultiSelect, type MultiOption } from "./ui/MultiSelect";
import { SegmentedControl } from "./ui/SegmentedControl";

interface FilterBarProps {
  filters: Filters;
  dataStart: Date;
  today: Date;
  counts: { accounts: Map<AccountId, number>; categories: Map<CategoryId, number> };
  isDefault: boolean;
  onPreset: (p: Exclude<RangePreset, "custom">) => void;
  onRange: (r: DateRange) => void;
  onType: (t: TypeFilter) => void;
  onAccounts: (a: AccountId[]) => void;
  onCategories: (c: CategoryId[]) => void;
  onReset: () => void;
}

const TYPE_OPTIONS: { value: TypeFilter; label: React.ReactNode }[] = [
  { value: "all", label: "All" },
  {
    value: "income",
    label: (
      <>
        <span className="size-1.5 rounded-full bg-emerald-500" /> Income
      </>
    ),
  },
  {
    value: "expense",
    label: (
      <>
        <span className="size-1.5 rounded-full bg-rose-500" /> Expenses
      </>
    ),
  },
];

export function FilterBar({
  filters,
  dataStart,
  today,
  counts,
  isDefault,
  onPreset,
  onRange,
  onType,
  onAccounts,
  onCategories,
  onReset,
}: FilterBarProps) {
  const { range } = filters;

  const setFrom = (value: string) => {
    const d = parseISODate(value);
    if (!d) return;
    const from = clampDate(d, dataStart, today);
    onRange({ from, to: from > range.to ? from : range.to });
  };
  const setTo = (value: string) => {
    const d = parseISODate(value);
    if (!d) return;
    const to = clampDate(d, dataStart, today);
    onRange({ from: to < range.from ? to : range.from, to });
  };

  const accountOptions: MultiOption<AccountId>[] = ACCOUNT_IDS.map((id) => ({
    value: id,
    label: ACCOUNTS[id].label,
    icon: ACCOUNTS[id].icon,
    color: ACCOUNTS[id].color,
    hint: fmtInt(counts.accounts.get(id) ?? 0),
  }));

  const categoryIds: CategoryId[] = [
    ...(filters.type !== "income" ? EXPENSE_CATEGORIES : []),
    ...(filters.type !== "expense" ? INCOME_CATEGORIES : []),
  ];
  const categoryOptions: MultiOption<CategoryId>[] = categoryIds.map((id) => ({
    value: id,
    label: CATEGORIES[id].label,
    icon: CATEGORIES[id].icon,
    color: CATEGORIES[id].color,
    group: CATEGORIES[id].type === "expense" ? "Expenses" : "Income",
    hint: fmtInt(counts.categories.get(id) ?? 0),
  }));
  const quickPicks =
    filters.type === "income"
      ? []
      : [
          { label: "Essentials", values: [...ESSENTIALS] as CategoryId[] },
          { label: "Lifestyle", values: [...LIFESTYLE] as CategoryId[] },
        ];

  const chips: { key: string; label: string; color: string; onRemove: () => void }[] = [
    ...(filters.type !== "all"
      ? [
          {
            key: "type",
            label: filters.type === "income" ? "Income only" : "Expenses only",
            color: filters.type === "income" ? "#10b981" : "#f43f5e",
            onRemove: () => onType("all"),
          },
        ]
      : []),
    ...filters.accounts.map((a) => ({
      key: `a-${a}`,
      label: ACCOUNTS[a].label,
      color: ACCOUNTS[a].color,
      onRemove: () => onAccounts(filters.accounts.filter((x) => x !== a)),
    })),
    ...filters.categories.map((c) => ({
      key: `c-${c}`,
      label: CATEGORIES[c].label,
      color: CATEGORIES[c].color,
      onRemove: () => onCategories(filters.categories.filter((x) => x !== c)),
    })),
  ];

  const inputCls =
    "w-full min-w-0 bg-transparent text-[13px] text-slate-700 tabular-nums outline-none [color-scheme:light] dark:text-slate-200 dark:[color-scheme:dark]";

  return (
    <div className="z-30 -mx-4 bg-slate-50/85 px-4 py-3 backdrop-blur-xl transition-colors duration-300 sm:-mx-6 sm:px-6 lg:sticky lg:top-16 lg:-mx-8 lg:px-8 dark:bg-slate-950/80">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors duration-300 dark:border-slate-800/80 dark:bg-slate-900/70">
        <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
          {/* Date range */}
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
              <SegmentedControl
                ariaLabel="Date range preset"
                options={PRESETS.map((p) => ({ value: p.value, label: p.label, title: p.long }))}
                value={filters.preset === "custom" ? null : filters.preset}
                onChange={onPreset}
              />
            </div>
            <div
              className={cn(
                "flex h-10 min-w-0 items-center gap-2 rounded-xl border px-3 transition-colors sm:w-[330px] sm:shrink-0",
                filters.preset === "custom"
                  ? "border-indigo-300 bg-indigo-50/60 dark:border-indigo-500/40 dark:bg-indigo-500/10"
                  : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
              )}
            >
              <CalendarRange className="size-4 shrink-0 text-slate-400" />
              <input
                type="date"
                aria-label="Start date"
                className={inputCls}
                value={toISODate(range.from)}
                min={toISODate(dataStart)}
                max={toISODate(today)}
                onChange={(e) => setFrom(e.target.value)}
              />
              <ArrowRight className="size-3.5 shrink-0 text-slate-400" />
              <input
                type="date"
                aria-label="End date"
                className={inputCls}
                value={toISODate(range.to)}
                min={toISODate(dataStart)}
                max={toISODate(today)}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>

          {/* Segments */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <SegmentedControl ariaLabel="Transaction type" options={TYPE_OPTIONS} value={filters.type} onChange={onType} className="col-span-2 sm:col-span-1" stretch />
            <MultiSelect label="Accounts" icon={Landmark} options={accountOptions} selected={filters.accounts} onChange={onAccounts} className="sm:w-48" />
            <MultiSelect
              label="Categories"
              icon={Tags}
              options={categoryOptions}
              selected={filters.categories}
              onChange={onCategories}
              quickPicks={quickPicks}
              className="sm:w-52"
            />
            <button
              type="button"
              onClick={onReset}
              disabled={isDefault}
              className={cn(
                "col-span-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40 sm:col-span-1 sm:ml-auto 2xl:ml-0 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
                isDefault && "hidden sm:inline-flex",
              )}
            >
              <RotateCcw className="size-4" />
              Reset
            </button>
          </div>
        </div>

        {chips.length > 0 && (
          <div className="animate-fade-in mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
            <span className="mr-1 text-xs font-medium text-slate-400 dark:text-slate-500">Active filters</span>
            {chips.map((chip) => (
              <span
                key={chip.key}
                className="animate-pop inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-1 pr-1 pl-2.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: chip.color }} />
                {chip.label}
                <button
                  type="button"
                  onClick={chip.onRemove}
                  aria-label={`Remove ${chip.label} filter`}
                  className="flex size-4 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={onReset}
              className="ml-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
