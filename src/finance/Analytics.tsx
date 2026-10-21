import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ArrowUpDown,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Layers3,
  Search,
  SlidersHorizontal,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useChartColors } from '../hooks/useTheme';
import {
  analyzeReport,
  merchantKey,
  percentageChange,
  rangeError,
  reportCsv,
  reportRange,
  type BucketSize,
  type ReportBucket,
  type ReportFilters,
  type ReportMetric,
  type ReportPreset,
} from './analytics';
import { csv, download, iso, type Entry } from './model';
import { useFinance } from './store';
import { AnimatedValue, CategoryIcon, dateLabel, Empty, Panel, Progress } from './ui';

const presets: { id: ReportPreset; label: string }[] = [
  { id: 'month', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
  { id: 'year', label: 'Year to date' },
  { id: 'custom', label: 'Custom dates' },
];
const initialFilters = (): ReportFilters => ({
  ...reportRange('month'),
  account: 'all',
  category: 'all',
  status: 'all',
});
const formatRange = (start: string, end: string) => `${dateLabel(start, true)} – ${dateLabel(end, true)}`;
function Change({
  value,
  previous,
  lowerIsBetter = false,
}: {
  value: number;
  previous: number;
  lowerIsBetter?: boolean;
}) {
  const change = percentageChange(value, previous);
  const lower = (change ?? 0) < 0;
  const good = change !== null && change !== 0 && (lowerIsBetter ? lower : !lower);
  const Icon = lower ? ArrowDownRight : ArrowUpRight;
  return (
    <span className={`analytics-change ${good ? 'favorable' : ''}`}>
      {change !== null && change !== 0 && <Icon size={14} />}
      {change === null
        ? 'No previous baseline'
        : change === 0
          ? 'No change'
          : `${Math.abs(change).toFixed(1)}% ${lower ? 'less' : 'more'}`}
    </span>
  );
}
interface Drill {
  kind: 'category' | 'merchant' | 'account';
  id: string;
  label: string;
}
export function Analytics({ onEdit, onAdd }: { onEdit: (entry: Entry) => void; onAdd: () => void }) {
  const { w, money, notify, CATEGORIES, ACCOUNTS } = useFinance();
  const colors = useChartColors();
  const [filters, setFilters] = useState(initialFilters);
  const [preset, setPreset] = useState<ReportPreset>('month');
  const [draft, setDraft] = useState({ start: filters.start, end: filters.end });
  const [error, setError] = useState('');
  const [size, setSize] = useState<BucketSize>('day');
  const [metric, setMetric] = useState<ReportMetric>('expense');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [compare, setCompare] = useState(true);
  const [drill, setDrill] = useState<Drill | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const report = useMemo(
    () => analyzeReport(w.transactions, filters, w.budgets, size, w),
    [w.transactions, w.budgets, filters, size, w.categories, w.accounts],
  );
  const rows = useMemo(
    () =>
      report.rows
        .filter((t) => {
          if (drill?.kind === 'category' && t.category !== drill.id) return false;
          if (drill?.kind === 'merchant' && (t.type !== 'expense' || merchantKey(t.merchant) !== drill.id))
            return false;
          if (drill?.kind === 'account' && t.account !== drill.id) return false;
          return `${t.merchant} ${t.note ?? ''}`.toLowerCase().includes(search.trim().toLowerCase());
        })
        .sort((a, b) =>
          sort === 'largest'
            ? b.amount - a.amount || b.date.localeCompare(a.date)
            : b.date.localeCompare(a.date) || b.amount - a.amount,
        ),
    [report.rows, drill, search, sort],
  );
  const pages = Math.max(1, Math.ceil(rows.length / 8));
  const currentPage = Math.min(page, pages);
  const visibleRows = rows.slice((currentPage - 1) * 8, currentPage * 8);
  useEffect(() => {
    setDrill(null);
    setSearch('');
    setPage(1);
  }, [filters]);
  const openDrill = (next: Drill) => {
    setDrill(next);
    setSearch('');
    setPage(1);
    requestAnimationFrame(() => {
      detailHeading.current?.focus({ preventScroll: true });
      detailHeading.current?.scrollIntoView({
        block: 'start',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
    });
  };
  const choosePreset = (id: ReportPreset) => {
    setPreset(id);
    setError('');
    if (id === 'custom') {
      setDraft({ start: filters.start, end: filters.end });
      return;
    }
    const range = reportRange(id);
    setFilters((f) => ({ ...f, ...range }));
    setSize(id === '90d' ? 'week' : id === 'year' ? 'month' : 'day');
  };
  const exportReport = () => {
    download(
      `spendwise-analytics-${filters.start}-${filters.end}.csv`,
      reportCsv(report, filters, w.profile.currency),
      'text/csv;charset=utf-8',
    );
    notify('Analytics report exported. Filters and comparison dates are included.');
  };
  const metricLabel = metric === 'expense' ? 'Spending' : metric === 'income' ? 'Income' : 'Net flow';
  const previousKey =
    metric === 'expense' ? 'previousExpense' : metric === 'income' ? 'previousIncome' : 'previousNet';
  const activeColor = metric === 'expense' ? colors.expenses : colors.income;
  const topCategories = report.categories.filter((c) => c.amount > 0);
  const retention = report.totals.savingsRate;
  const maxWeekday = Math.max(1, ...report.weekdays.map((d) => d.average));
  const tooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: readonly { payload?: ReportBucket }[];
  }) => {
    const bucket = payload?.[0]?.payload;
    if (!active || !bucket) return null;
    return (
      <div className="analytics-tooltip">
        <strong>{formatRange(bucket.start, bucket.end)}</strong>
        <span>
          {metricLabel}: <b>{money(bucket[metric], true)}</b>
        </span>
        {compare && (
          <>
            <small>Prior: {formatRange(bucket.previousStart, bucket.previousEnd)}</small>
            <span>
              {metricLabel}: <b>{money(bucket[previousKey], true)}</b>
            </span>
          </>
        )}
      </div>
    );
  };
  return (
    <div className="page-stack analytics-page">
      <div className="analytics-toolbar">
        <div className="analytics-period">
          <CalendarDays size={17} />
          <label className="sr-only" htmlFor="report-period">
            Report period
          </label>
          <select
            id="report-period"
            value={preset}
            onChange={(e) => choosePreset(e.target.value as ReportPreset)}
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <span className="analytics-date-label">{formatRange(filters.start, filters.end)}</span>
        <button className="button secondary" onClick={exportReport}>
          <Download size={16} />
          Export report
        </button>
      </div>
      {preset === 'custom' && (
        <form
          className="analytics-custom-range"
          onSubmit={(e) => {
            e.preventDefault();
            const message = rangeError(draft);
            setError(message);
            if (message) return;
            setFilters((f) => ({ ...f, ...draft }));
            setSize('month');
          }}
        >
          <label>
            Start date
            <input
              type="date"
              min="1900-01-01"
              max={iso()}
              required
              value={draft.start}
              onChange={(e) => setDraft((d) => ({ ...d, start: e.target.value }))}
            />
          </label>
          <label>
            End date
            <input
              type="date"
              min="1900-01-01"
              max={iso()}
              required
              value={draft.end}
              onChange={(e) => setDraft((d) => ({ ...d, end: e.target.value }))}
            />
          </label>
          <button className="button" type="submit">
            Apply range
          </button>
          <span>Report shows the applied dates above. Maximum 3,660 days.</span>
          {error && <p role="alert">{error}</p>}
        </form>
      )}
      <div className="analytics-filters">
        <span className="analytics-filter-label">
          <SlidersHorizontal size={16} />
          Refine your view
        </span>
        <label>
          <span className="sr-only">Analytics account</span>
          <select
            aria-label="Analytics account"
            value={filters.account}
            onChange={(e) =>
              setFilters((f) => ({ ...f, account: e.target.value as ReportFilters['account'] }))
            }
          >
            <option value="all">All accounts</option>
            {Object.values(ACCOUNTS).map((a) => (
              <option value={a.id} key={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Analytics category</span>
          <select
            aria-label="Analytics category"
            value={filters.category}
            onChange={(e) =>
              setFilters((f) => ({ ...f, category: e.target.value as ReportFilters['category'] }))
            }
          >
            <option value="all">All categories</option>
            {Object.values(CATEGORIES).map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Analytics status</span>
          <select
            aria-label="Analytics status"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as ReportFilters['status'] }))}
          >
            <option value="all">All statuses</option>
            <option value="cleared">Cleared only</option>
            <option value="pending">Pending only</option>
          </select>
        </label>
        <button
          className="text-button"
          onClick={() => {
            setFilters(initialFilters());
            setPreset('month');
            setSize('day');
            setError('');
          }}
        >
          Reset filters
        </button>
      </div>
      <div className="analytics-summary-grid">
        <section className="analytics-hero">
          <div className="analytics-hero-top">
            <span>
              <span className="analytics-signal" /> THE MONEY PICTURE
            </span>
            <ChartNoAxesCombined size={24} />
          </div>
          <h2>
            Every move.
            <br />
            <span>A little more clarity.</span>
          </h2>
          <div className="analytics-hero-value">
            <span>Total spending this period</span>
            <strong data-testid="analytics-total-spending">
              <AnimatedValue value={report.totals.expense} format={money} />
            </strong>
            <div>
              <Change value={report.totals.expense} previous={report.previous.expense} lowerIsBetter />
              <span>vs. the previous {report.days} days</span>
            </div>
          </div>
          <div className="analytics-hero-footer">
            <span>
              <Layers3 size={15} />
              {report.totals.count} matching records
            </span>
            <span>
              {w.demo ? 'DEMO DATA' : 'YOUR LOGGED DATA'}
              <ArrowUpRight size={16} />
            </span>
          </div>
          <div className="analytics-orbit" aria-hidden="true">
            <i />
            <i />
            <span>↗</span>
          </div>
        </section>
        <section className="sw-panel analytics-retention">
          <div className="analytics-section-label">
            <span>INCOME RETAINED</span>
            <ArrowUpRight size={19} />
          </div>
          <div
            className="analytics-retention-ring"
            style={{ '--retained': `${Math.max(0, Math.min(100, retention ?? 0))}%` } as CSSProperties}
          >
            <div>
              <strong>{retention === null ? '—' : `${retention.toFixed(1)}%`}</strong>
              <span>
                {retention === null
                  ? 'No logged income'
                  : retention < 0
                    ? 'Spending above income'
                    : 'Net / income'}
              </span>
            </div>
          </div>
          <h3>
            {retention === null
              ? 'Start with the full picture.'
              : retention < 0
                ? 'A moment to rebalance.'
                : 'Make room for what’s next.'}
          </h3>
          <p>
            {retention === null
              ? 'A retention rate needs logged income in this filtered period.'
              : `${money(report.totals.net)} net cash flow from ${money(report.totals.income)} in income. This is not your bank balance.`}
          </p>
        </section>
      </div>
      <div className="analytics-kpis">
        {[
          {
            label: 'Money in',
            value: report.totals.income,
            prior: report.previous.income,
            icon: ArrowDownLeft,
          },
          {
            label: 'Money out',
            value: report.totals.expense,
            prior: report.previous.expense,
            icon: ArrowUpRight,
            lower: true,
          },
          { label: 'Net cash flow', value: report.totals.net, prior: report.previous.net, icon: Wallet },
          {
            label: 'Daily spending',
            value: report.totals.averageDaily,
            prior: report.previous.averageDaily,
            icon: CalendarDays,
            lower: true,
          },
        ].map((k) => (
          <section className="sw-panel analytics-kpi" key={k.label}>
            <div>
              <span>{k.label}</span>
              <k.icon size={18} />
            </div>
            <strong>
              <AnimatedValue value={k.value} format={money} />
            </strong>
            <Change value={k.value} previous={k.prior} lowerIsBetter={k.lower} />
          </section>
        ))}
      </div>
      <div className="analytics-main-grid">
        <Panel
          title="Your money over time"
          sub="The detail behind the bigger picture"
          className="analytics-trend-panel"
          action={
            <span className="analytics-panel-icon">
              <ChartNoAxesCombined size={18} />
            </span>
          }
        >
          <div className="analytics-chart-controls">
            <div className="analytics-segments" role="group" aria-label="Chart metric">
              {(['expense', 'income', 'net'] as const).map((id) => (
                <button key={id} aria-pressed={metric === id} onClick={() => setMetric(id)}>
                  {id === 'expense' ? 'Spending' : id === 'income' ? 'Income' : 'Net flow'}
                </button>
              ))}
            </div>
            <label>
              <span className="sr-only">Chart grouping</span>
              <select
                aria-label="Chart grouping"
                value={size}
                onChange={(e) => setSize(e.target.value as BucketSize)}
              >
                <option value="day" disabled={report.days > 366}>
                  Daily{report.days > 366 ? ' (up to 366 days)' : ''}
                </option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </select>
            </label>
          </div>
          <div className="analytics-chart-head">
            <div>
              <strong>{money(report.totals[metric])}</strong>
              <span>
                {metricLabel.toLowerCase()} · {report.days} calendar days
              </span>
            </div>
            <div className="analytics-segments chart-type" role="group" aria-label="Chart display">
              <button aria-pressed={chartType === 'area'} onClick={() => setChartType('area')}>
                Line
              </button>
              <button aria-pressed={chartType === 'bar'} onClick={() => setChartType('bar')}>
                Bars
              </button>
            </div>
          </div>
          <div
            className="analytics-trend-chart"
            role="img"
            aria-label={`${metricLabel} chart; ${size} totals. Exact values are available in the chart data table below.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={report.buckets} margin={{ top: 16, right: 12, left: -15, bottom: 4 }}>
                <defs>
                  <linearGradient id="analytics-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={activeColor} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={activeColor} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={colors.grid} strokeDasharray="3 5" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  minTickGap={40}
                  tick={{ fill: colors.axis, fontSize: colors.fontSize }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: colors.axis, fontSize: colors.fontSize }}
                  tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 100) / 10}k` : `${v}`)}
                />
                <Tooltip content={tooltip} cursor={{ stroke: colors.cursor, strokeDasharray: '3 3' }} />
                {chartType === 'area' ? (
                  <Area
                    name={metricLabel}
                    dataKey={metric}
                    type="monotone"
                    stroke={activeColor}
                    strokeWidth={2.5}
                    fill="url(#analytics-fill)"
                    isAnimationActive={false}
                  />
                ) : (
                  <Bar
                    name={metricLabel}
                    dataKey={metric}
                    fill={activeColor}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                    isAnimationActive={false}
                  />
                )}{' '}
                {compare && (
                  <Line
                    name="Previous period"
                    dataKey={previousKey}
                    type="monotone"
                    stroke={colors.muted}
                    strokeWidth={1.5}
                    strokeDasharray="4 5"
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="analytics-chart-foot">
            <span>
              <i style={{ background: activeColor }} />
              Current period
            </span>
            <label>
              <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
              Compare previous period
            </label>
          </div>
          <details className="analytics-chart-data">
            <summary>View chart data & comparison dates</summary>
            <div className="analytics-table-scroll">
              <table>
                <caption className="sr-only">Chart data in {w.profile.currency}</caption>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Income</th>
                    <th>Spending</th>
                    <th>Net flow</th>
                    {compare && (
                      <>
                        <th>Prior {metricLabel.toLowerCase()}</th>
                        <th>Prior dates</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {report.buckets.map((b) => (
                    <tr key={b.start}>
                      <th scope="row">{formatRange(b.start, b.end)}</th>
                      <td>{money(b.income, true)}</td>
                      <td>{money(b.expense, true)}</td>
                      <td>{money(b.net, true)}</td>
                      {compare && (
                        <>
                          <td>{money(b[previousKey], true)}</td>
                          <td>{formatRange(b.previousStart, b.previousEnd)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </Panel>
        <Panel
          title="Where it went"
          sub="Select a category to inspect its records"
          className="analytics-category-panel"
          action={
            <span className="analytics-panel-icon">
              <Filter size={17} />
            </span>
          }
        >
          {topCategories.length ? (
            <>
              <div
                className="analytics-donut"
                role="img"
                aria-label="Spending distribution; category totals and percentages listed below"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topCategories}
                      dataKey="amount"
                      nameKey="label"
                      innerRadius="70%"
                      outerRadius="90%"
                      paddingAngle={4}
                      cornerRadius={4}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {topCategories.map((c, i) => (
                        <Cell key={c.id} fill={colors.categories[i % colors.categories.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div>
                  <span>Total spent</span>
                  <strong>{money(report.totals.expense)}</strong>
                  <small>{topCategories.length} categories</small>
                </div>
              </div>
              <div className="analytics-category-list">
                {topCategories.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => openDrill({ kind: 'category', id: c.id, label: c.label })}
                    aria-label={`Inspect ${c.label} transactions`}
                  >
                    <i style={{ background: colors.categories[i % colors.categories.length] }} />
                    <span>{c.label}</span>
                    <strong>{money(c.amount)}</strong>
                    <small>{c.share.toFixed(1)}%</small>
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <Empty title="No spending in this view" text="Try a wider date range or a different filter." />
          )}
        </Panel>
      </div>
      <div className="analytics-secondary-grid">
        <Panel
          title="Top merchants"
          sub="Ranked by total spending, not number of visits"
          action={
            <span className="analytics-panel-icon">
              <ArrowUpDown size={17} />
            </span>
          }
        >
          {report.merchants.length ? (
            <ol className="analytics-merchants">
              {report.merchants.slice(0, 5).map((m, i) => (
                <li key={m.id}>
                  <button
                    onClick={() => openDrill({ kind: 'merchant', id: m.id, label: m.label })}
                    aria-label={`Inspect ${m.label} spending`}
                  >
                    <span className="analytics-rank">{String(i + 1).padStart(2, '0')}</span>
                    <span>
                      <strong>{m.label}</strong>
                      <small>
                        {m.count} {m.count === 1 ? 'purchase' : 'purchases'} ·{' '}
                        {report.totals.expense ? ((m.amount / report.totals.expense) * 100).toFixed(1) : 0}%
                        of spending
                      </small>
                    </span>
                    <b>{money(m.amount)}</b>
                    <ArrowUpRight size={16} />
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <Empty title="No merchants yet" text="Expense records will appear here." />
          )}
        </Panel>
        <Panel title="The weekly rhythm" sub="Average spent per occurrence of each weekday">
          <div className="analytics-weekdays">
            {report.weekdays.map((d) => (
              <div key={d.day}>
                <span>{money(d.average)}</span>
                <div>
                  <i style={{ height: `${(d.average / maxWeekday) * 100}%` }} />
                </div>
                <strong>{d.day}</strong>
                <small>
                  {d.occurrences} {d.occurrences === 1 ? 'day' : 'days'}
                </small>
              </div>
            ))}
          </div>
          <p className="analytics-card-note">
            Includes calendar days with no logged spending. Missing records are not proof of no spending.
          </p>
        </Panel>
      </div>
      <div className="analytics-secondary-grid">
        <Panel title="The account perspective" sub="Logged activity only · internal transfers excluded">
          <div className="analytics-account-list">
            {report.accounts.map((a) => (
              <button
                key={a.id}
                onClick={() => openDrill({ kind: 'account', id: a.id, label: a.label })}
                aria-label={`Inspect ${a.label} activity`}
              >
                <span className="analytics-account-icon">
                  <Wallet size={19} />
                </span>
                <span>
                  <strong>{a.label}</strong>
                  <small>
                    {a.count} records · in {money(a.income)} / out {money(a.expense)}
                  </small>
                </span>
                <span>
                  <b>{money(a.net)}</b>
                  <small>
                    net flow <ArrowUpRight size={12} />
                  </small>
                </span>
              </button>
            ))}
          </div>
        </Panel>
        <Panel title="A check on your plan" sub="Spending vs. prorated monthly category limits">
          {report.budgetRows.some((b) => b.allowance > 0 || b.amount > 0) ? (
            <div className="analytics-budget-list">
              {report.budgetRows.map((b) => (
                <div key={b.id}>
                  <div>
                    <span>{b.label}</span>
                    <strong>
                      {money(b.amount)} <small>/ {b.allowance > 0 ? money(b.allowance) : 'not set'}</small>
                    </strong>
                  </div>
                  <Progress
                    value={b.allowance ? (b.amount / b.allowance) * 100 : 0}
                    color={b.amount > b.allowance ? 'var(--warm)' : 'var(--green)'}
                  />
                  {b.allowance > 0 && b.amount > b.allowance && (
                    <small className="warning-text">
                      {money(b.amount - b.allowance)} over this allowance
                    </small>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="A plan starts with a limit"
              text="Set monthly category limits in Budgets to compare your progress."
            />
          )}
          <p className="analytics-card-note">
            Current workspace limits are prorated for the selected calendar dates, not historical budget
            snapshots. Filters narrow spending, not your workspace limits.
          </p>
        </Panel>
      </div>
      <div className="analytics-facts">
        <span>
          <Sparkles size={19} />
          <strong>The little details add up.</strong>
        </span>
        <p>
          Average purchase <b>{money(report.totals.averagePurchase, true)}</b>
        </p>
        <p>
          Largest expense <b>{report.biggest ? money(report.biggest.amount, true) : '—'}</b>
          {report.biggest && (
            <button className="text-button" onClick={() => onEdit(report.biggest!)}>
              {report.biggest.merchant}
              <ArrowUpRight size={13} />
            </button>
          )}
        </p>
        <p>
          <b>{report.totals.pending}</b> pending records included in this view.
        </p>
      </div>
      <Panel
        className="analytics-details-panel"
        title="Behind the numbers"
        sub="Inspect, search, export, or edit the records powering this report"
      >
        <h3 ref={detailHeading} tabIndex={-1} className="analytics-detail-title">
          {drill ? `Transactions · ${drill.label}` : 'All matching transactions'}
          <span>{rows.length} records</span>
        </h3>
        <div className="analytics-detail-controls">
          {drill && (
            <button
              className="analytics-drill-chip"
              onClick={() => {
                setDrill(null);
                setPage(1);
              }}
            >
              <X size={14} />
              Clear drill-down
            </button>
          )}
          <label className="analytics-search">
            <Search size={16} />
            <span className="sr-only">Search analytics transactions</span>
            <input
              value={search}
              placeholder="Search a merchant or note…"
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            <span className="sr-only">Sort analytics transactions</span>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
            >
              <option value="newest">Newest first</option>
              <option value="largest">Largest amount</option>
            </select>
          </label>
          <button
            className="button secondary small"
            disabled={!rows.length}
            onClick={() => {
              download(
                `spendwise-analytics-transactions-${filters.start}-${filters.end}.csv`,
                csv(rows, w),
                'text/csv;charset=utf-8',
              );
              notify(`${rows.length} matching transaction records exported.`);
            }}
          >
            <Download size={15} />
            Export transactions
          </button>
        </div>
        {rows.length ? (
          <>
            <div className="analytics-table-scroll">
              <table className="analytics-transactions">
                <caption className="sr-only">
                  Filtered analytics transactions. Amounts in {w.profile.currency}. Select a merchant to edit
                  its record.
                </caption>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Merchant / description</th>
                    <th>Category</th>
                    <th>Account</th>
                    <th>Status</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((t) => (
                    <tr key={t.id}>
                      <td>{dateLabel(t.date)}</td>
                      <th scope="row">
                        <button onClick={() => onEdit(t)}>
                          <CategoryIcon id={t.category} />
                          <span>
                            {t.merchant}
                            <small>{t.type === 'income' ? 'Income' : 'Expense'}</small>
                          </span>
                        </button>
                      </th>
                      <td>{CATEGORIES[t.category].label}</td>
                      <td>{ACCOUNTS[t.account].label}</td>
                      <td>
                        <span className="analytics-status">
                          {t.status === 'cleared' ? (
                            <Check size={12} />
                          ) : (
                            <span className="analytics-pending-dot" />
                          )}
                          {t.status}
                        </span>
                      </td>
                      <td>
                        {t.type === 'income' ? '+' : '−'}
                        {money(t.amount, true)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="analytics-pagination">
              <span>
                {(currentPage - 1) * 8 + 1}–{Math.min(currentPage * 8, rows.length)} of {rows.length} records
              </span>
              <div>
                <button
                  className="icon-button"
                  disabled={currentPage === 1}
                  aria-label="Previous analytics page"
                  onClick={() => setPage(currentPage - 1)}
                >
                  <ChevronLeft size={17} />
                </button>
                <span>
                  Page {currentPage} of {pages}
                </span>
                <button
                  className="icon-button"
                  disabled={currentPage === pages}
                  aria-label="Next analytics page"
                  onClick={() => setPage(currentPage + 1)}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <Empty
            title="No matching records"
            text="Clear the drill-down, adjust your filters, or add a transaction."
            action={
              <button className="button secondary" onClick={onAdd}>
                Add transaction
                <ArrowRight size={15} />
              </button>
            }
          />
        )}
      </Panel>
      <div className="analytics-method">
        <span>
          <ChartNoAxesCombined size={16} />
          Transparent by design
        </span>
        <p>
          Based on your logged transactions, not a bank feed. Pending records count unless filtered out.
          Transfers, opening balances, bill reminders, and goal earmarks are excluded. Comparison:{' '}
          <strong>{formatRange(report.previousRange.start, report.previousRange.end)}</strong>, an equally
          long preceding period with the same filters; chart buckets align by elapsed days. A missing prior
          baseline means “no previous baseline,” not a growth claim.
        </p>
      </div>
    </div>
  );
}
