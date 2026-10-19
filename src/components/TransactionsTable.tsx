import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Download, Repeat, Search, X } from "lucide-react";
import { ACCOUNTS, CATEGORIES } from "@/lib/categories";
import { toISODate } from "@/lib/dates";
import { fmtCurrency, fmtDate, fmtDateShort, fmtInt, fmtTime } from "@/lib/format";
import type { CategoryId, Transaction, TxStatus } from "@/lib/types";
import { cn } from "@/utils/cn";
import { EmptyState } from "./ui/EmptyState";
import { Panel } from "./ui/Panel";
import { SegmentedControl } from "./ui/SegmentedControl";

type SortKey = "date" | "merchant" | "category" | "account" | "status" | "amount";
type SortState = { key: SortKey; dir: "asc" | "desc" };
type StatusFilter = "all" | TxStatus;

interface TransactionsTableProps {
  transactions: Transaction[];
  query: string;
  onQueryChange: (q: string) => void;
  onCategoryClick: (id: CategoryId) => void;
  onReset: () => void;
  subtitle: string;
}

const signed = (t: Transaction) => (t.type === "income" ? t.amount : -t.amount);

function compare(a: Transaction, b: Transaction, key: SortKey): number {
  switch (key) {
    case "date":
      return a.date.getTime() - b.date.getTime();
    case "merchant":
      return a.merchant.localeCompare(b.merchant);
    case "category":
      return CATEGORIES[a.category].label.localeCompare(CATEGORIES[b.category].label);
    case "account":
      return ACCOUNTS[a.account].label.localeCompare(ACCOUNTS[b.account].label);
    case "status":
      return a.status.localeCompare(b.status);
    case "amount":
      // Sort by magnitude so "largest first" works for both income and expenses
      return a.amount - b.amount || signed(a) - signed(b);
  }
}

function pageList(page: number, count: number): (number | "gap")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const set = new Set<number>([1, count, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => set.add(p));
  if (page >= count - 2) [count - 1, count - 2, count - 3].forEach((p) => set.add(p));
  const sorted = [...set].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push("gap");
    out.push(p);
    prev = p;
  }
  return out;
}

function exportCsv(rows: Transaction[]) {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const header = ["Date", "Time", "Merchant", "Category", "Account", "Type", "Status", "Amount", "Note"];
  const lines = rows.map((t) =>
    [
      toISODate(t.date),
      fmtTime(t.date),
      t.merchant,
      CATEGORIES[t.category].label,
      ACCOUNTS[t.account].label,
      t.type,
      t.status,
      signed(t).toFixed(2),
      t.note ?? "",
    ]
      .map(esc)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `spendwise-transactions-${toISODate(new Date())}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  className,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState;
  onSort: (k: SortKey) => void;
  className?: string;
  align?: "left" | "right";
}) {
  const active = sort.key === sortKey;
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn("px-3 py-2.5 font-semibold", align === "right" && "text-right", className)}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 rounded-md tracking-wider uppercase transition-colors hover:text-slate-900 dark:hover:text-white",
          active && "text-slate-900 dark:text-white",
          align === "right" && "flex-row-reverse",
        )}
      >
        {label}
        {active ? (
          sort.dir === "asc" ? (
            <ArrowUp className="size-3" strokeWidth={2.5} />
          ) : (
            <ArrowDown className="size-3" strokeWidth={2.5} />
          )
        ) : (
          <ChevronsUpDown className="size-3 opacity-40" />
        )}
      </button>
    </th>
  );
}

function StatusPill({ status }: { status: TxStatus }) {
  return status === "cleared" ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
      <span className="size-1.5 rounded-full bg-emerald-500" />
      Cleared
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
      <span className="size-1.5 animate-pulse rounded-full bg-amber-500" />
      Pending
    </span>
  );
}

export function TransactionsTable({ transactions, query, onQueryChange, onCategoryClick, onReset, subtitle }: TransactionsTableProps) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortState>({ key: "date", dir: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = status === "all" ? transactions : transactions.filter((t) => t.status === status);
    if (q) {
      list = list.filter(
        (t) =>
          t.merchant.toLowerCase().includes(q) ||
          CATEGORIES[t.category].label.toLowerCase().includes(q) ||
          ACCOUNTS[t.account].label.toLowerCase().includes(q) ||
          (t.note ?? "").toLowerCase().includes(q) ||
          t.amount.toFixed(2).includes(q),
      );
    }
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => (compare(a, b, sort.key) || a.date.getTime() - b.date.getTime()) * dir);
  }, [transactions, query, status, sort]);

  useEffect(() => setPage(1), [transactions, query, status, sort, pageSize]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  const { inflow, outflow } = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    for (const t of rows) {
      if (t.type === "income") inflow += t.amount;
      else outflow += t.amount;
    }
    return { inflow, outflow };
  }, [rows]);

  const onSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "date" || key === "amount" ? "desc" : "asc" }));

  return (
    <Panel
      title={
        <span className="inline-flex items-center gap-2">
          Transactions
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 tabular-nums dark:bg-slate-800 dark:text-slate-300">
            {fmtInt(rows.length)}
          </span>
        </span>
      }
      subtitle={subtitle}
      actions={
        <button
          type="button"
          onClick={() => exportCsv(rows)}
          disabled={rows.length === 0}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Download className="size-4" />
          Export CSV
        </button>
      }
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search merchant, category, note or amount…"
            aria-label="Search transactions"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-9 pl-9 text-sm text-slate-800 transition-colors outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <SegmentedControl
          size="sm"
          ariaLabel="Status filter"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All" },
            { value: "cleared", label: "Cleared" },
            { value: "pending", label: "Pending" },
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No transactions found"
          message={query ? `Nothing matches “${query}” with the current filters.` : "No transactions match the current filters."}
          onReset={() => {
            onQueryChange("");
            setStatus("all");
            onReset();
          }}
        />
      ) : (
        <>
          <div className="-mx-4 overflow-x-auto sm:-mx-5">
            <table className="w-full min-w-[320px] text-sm">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50/70 text-left text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
                  <SortHeader label="Date" sortKey="date" sort={sort} onSort={onSort} className="hidden pl-4 sm:table-cell sm:pl-5" />
                  <SortHeader label="Merchant" sortKey="merchant" sort={sort} onSort={onSort} className="pl-4 sm:pl-3" />
                  <SortHeader label="Category" sortKey="category" sort={sort} onSort={onSort} className="hidden md:table-cell" />
                  <SortHeader label="Account" sortKey="account" sort={sort} onSort={onSort} className="hidden xl:table-cell" />
                  <SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} className="hidden sm:table-cell" />
                  <SortHeader label="Amount" sortKey="amount" sort={sort} onSort={onSort} align="right" className="w-px pr-4 whitespace-nowrap sm:pr-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {pageRows.map((t) => {
                  const cat = CATEGORIES[t.category];
                  const acct = ACCOUNTS[t.account];
                  const Icon = cat.icon;
                  const AcctIcon = acct.icon;
                  return (
                    <tr key={t.id} className="animate-fade-in transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
                      <td className="hidden py-3 pr-3 pl-4 whitespace-nowrap sm:table-cell sm:pl-5">
                        <div className="text-[13px] text-slate-700 dark:text-slate-200">{fmtDate(t.date)}</div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500">{fmtTime(t.date)}</div>
                      </td>
                      <td className="max-w-0 py-3 pr-3 pl-4 sm:max-w-none sm:pl-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${cat.color}1a`, color: cat.color }}>
                            <Icon className="size-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 truncate text-[13px] font-medium text-slate-800 dark:text-slate-100">
                              <span className="truncate">{t.merchant}</span>
                              {t.recurring && (
                                <span title="Recurring" className="shrink-0 text-slate-400 dark:text-slate-500">
                                  <Repeat className="size-3" />
                                </span>
                              )}
                            </p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                              <span className="sm:hidden">{fmtDateShort(t.date)} · </span>
                              <span className="md:hidden">
                                {cat.label}
                                {t.note ? " · " : ""}
                              </span>
                              {t.note ?? <span className="hidden md:inline xl:hidden">{acct.label}</span>}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-3 py-3 md:table-cell">
                        <button
                          type="button"
                          onClick={() => onCategoryClick(t.category)}
                          title={`Filter to ${cat.label}`}
                          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap transition-opacity hover:opacity-80"
                          style={{ backgroundColor: `${cat.color}1a`, color: cat.color }}
                        >
                          <span className="size-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                          {cat.label}
                        </button>
                      </td>
                      <td className="hidden px-3 py-3 xl:table-cell">
                        <div className="flex items-center gap-2 text-[13px] whitespace-nowrap text-slate-600 dark:text-slate-300">
                          <AcctIcon className="size-3.5 text-slate-400" />
                          {acct.label}
                          {acct.mask && <span className="text-[11px] text-slate-400 dark:text-slate-500">{acct.mask}</span>}
                        </div>
                      </td>
                      <td className="hidden px-3 py-3 sm:table-cell">
                        <StatusPill status={t.status} />
                      </td>
                      <td
                        className={cn(
                          "w-px py-3 pr-4 pl-3 text-right text-[13px] font-semibold whitespace-nowrap tabular-nums sm:pr-5",
                          t.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-slate-100",
                        )}
                      >
                        {t.type === "income" ? "+" : "−"}
                        {fmtCurrency(t.amount, 2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="whitespace-nowrap">
                Showing{" "}
                <span className="font-semibold text-slate-700 tabular-nums dark:text-slate-200">
                  {fmtInt(start + 1)}–{fmtInt(start + pageRows.length)}
                </span>{" "}
                of <span className="font-semibold text-slate-700 tabular-nums dark:text-slate-200">{fmtInt(rows.length)}</span>
              </span>
              <span className="hidden text-slate-300 sm:inline dark:text-slate-600">|</span>
              <span className="whitespace-nowrap">
                In <span className="font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">+{fmtCurrency(inflow, 2)}</span>
              </span>
              <span className="whitespace-nowrap">
                Out <span className="font-semibold text-slate-700 tabular-nums dark:text-slate-200">−{fmtCurrency(outflow, 2)}</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
              <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                Rows
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {[10, 25, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>

              <nav className="flex items-center gap-1" aria-label="Pagination">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(1, safePage - 1))}
                  disabled={safePage === 1}
                  aria-label="Previous page"
                  className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="px-2 text-xs font-medium text-slate-500 tabular-nums sm:hidden dark:text-slate-400">
                  {safePage} / {pageCount}
                </span>
                <div className="hidden items-center gap-1 sm:flex">
                  {pageList(safePage, pageCount).map((p, i) =>
                    p === "gap" ? (
                      <span key={`gap-${i}`} className="px-1 text-xs text-slate-400">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        aria-current={p === safePage ? "page" : undefined}
                        className={cn(
                          "h-8 min-w-8 rounded-lg px-2 text-xs font-medium tabular-nums transition-colors",
                          p === safePage
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                            : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                        )}
                      >
                        {p}
                      </button>
                    ),
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setPage(Math.min(pageCount, safePage + 1))}
                  disabled={safePage === pageCount}
                  aria-label="Next page"
                  className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <ChevronRight className="size-4" />
                </button>
              </nav>
            </div>
          </div>
        </>
      )}
    </Panel>
  );
}
