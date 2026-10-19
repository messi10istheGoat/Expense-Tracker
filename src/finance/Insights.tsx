import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Fingerprint,
  Lightbulb,
  Repeat2,
  SearchCheck,
  TrendingUp,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CATEGORIES, EXPENSE_CATEGORIES } from '../lib/categories';
import { iso, monthKey, totals, type Entry } from './model';
import { useFinance } from './store';
import { dateLabel, Empty, Panel } from './ui';
import { SpendingChart } from './Overview';
import { useTheme } from '../hooks/useTheme';

export function Insights({
  month,
  onEdit,
  navigate,
}: {
  month: string;
  onEdit: (t: Entry) => void;
  navigate: (page: string) => void;
}) {
  const { w, money } = useFinance();
  const { isDark } = useTheme();
  const rows = w.transactions.filter((t) => t.date.startsWith(month));
  const sum = totals(rows);
  const merchants = new Map<string, Entry[]>();
  for (const t of w.transactions.filter(
    (t) =>
      t.type === 'expense' && t.date >= iso(new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1)),
  )) {
    const key = t.merchant.toLowerCase().trim();
    merchants.set(key, [...(merchants.get(key) ?? []), t]);
  }
  const recurring = [...merchants.values()]
    .filter((group) => {
      const months = new Set(group.map((t) => t.date.slice(0, 7)));
      const avg = group.reduce((s, t) => s + t.amount, 0) / group.length;
      return (
        months.size >= 2 &&
        group.length <= months.size * 2 &&
        group.every((t) => Math.abs(t.amount - avg) <= Math.max(1, avg * 0.1))
      );
    })
    .sort((a, b) => b[0].amount - a[0].amount)
    .slice(0, 5);
  const groups = new Map<string, Entry[]>();
  for (const t of rows) {
    const key = `${t.date}:${t.merchant.toLowerCase().trim()}:${t.amount}:${t.account}:${t.type}`;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  const duplicates = [...groups.values()].filter((g) => g.length > 1).slice(0, 4);
  const dates = Array.from({ length: 84 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 83 + i);
    const key = iso(d);
    const total = totals(w.transactions.filter((t) => t.date === key)).expense;
    return { date: key, total };
  });
  const activeDates = new Set(w.transactions.map((t) => t.date));
  const noSpend = dates.filter((d) => d.total === 0 && activeDates.has(d.date)).length;
  const data = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(`${month}-02T12:00:00`);
    d.setMonth(d.getMonth() - 5 + i);
    const key = monthKey(d);
    const v = totals(w.transactions.filter((t) => t.date.startsWith(key)));
    return {
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      Income: v.income,
      Expenses: v.expense,
    };
  });
  const cats = EXPENSE_CATEGORIES.map((id) => ({
    id,
    value: totals(rows.filter((t) => t.category === id)).expense,
  })).sort((a, b) => b.value - a.value);
  const weekdays = Array.from({ length: 7 }, (_, day) => ({
    day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day],
    total: totals(rows.filter((t) => new Date(`${t.date}T12:00:00`).getDay() === day)).expense,
  }));
  const maxWeekday = [...weekdays].sort((a, b) => b.total - a.total)[0];
  return (
    <div className="page-stack">
      <div className="insight-banner">
        <span>
          <Fingerprint size={28} />
        </span>
        <div>
          <span className="eyebrow">YOUR MONEY HAS A PATTERN</span>
          <h2>
            Let’s find the <em>interesting bits.</em>
          </h2>
          <p>Explainable insights from your records. No black box. No judgment.</p>
        </div>
        <span className="soft-badge">
          <SearchCheck size={14} />
          RULE-BASED, NOT AI
        </span>
      </div>
      <div className="insight-cards">
        <section className="sw-panel insight-card">
          <span className="insight-icon">
            <TrendingUp size={19} />
          </span>
          <span className="eyebrow">THE BIG PICTURE</span>
          <h3>{sum.net >= 0 ? 'You kept more than you spent.' : 'Your spending outpaced income.'}</h3>
          <p>
            {money(sum.income)} came in and {money(sum.expense)} went out in{' '}
            {new Date(`${month}-02`).toLocaleDateString('en-US', { month: 'long' })}. Your net cash flow was{' '}
            <strong>{money(sum.net)}</strong>.
          </p>
        </section>
        <section className="sw-panel insight-card">
          <span className="insight-icon amber">
            <Lightbulb size={19} />
          </span>
          <span className="eyebrow">YOUR BIGGEST CHAPTER</span>
          <h3>
            {cats[0]?.value
              ? `${CATEGORIES[cats[0].id].label} takes the largest slice.`
              : 'Every story starts somewhere.'}
          </h3>
          <p>
            {cats[0]?.value
              ? `${money(cats[0].value)} went to ${CATEGORIES[cats[0].id].label.toLowerCase()}—${((cats[0].value / sum.expense) * 100).toFixed(0)}% of your expenses. A useful place to look if you want to adjust your plan.`
              : 'Add transactions to discover your spending patterns.'}
          </p>
        </section>
        <section className="sw-panel insight-card">
          <span className="insight-icon lilac">
            <CalendarDays size={19} />
          </span>
          <span className="eyebrow">YOUR WEEKLY RHYTHM</span>
          <h3>{sum.expense ? `${maxWeekday.day} has the biggest total.` : 'A fresh start, any day.'}</h3>
          <p>
            {sum.expense
              ? `${money(maxWeekday.total)} of this month’s expenses happened on ${maxWeekday.day}. This is a total, not a per-day average—one large bill can influence it.`
              : 'Capture your everyday spending to reveal your weekly rhythm.'}
          </p>
        </section>
      </div>
      <div className="overview-main-grid">
        <Panel
          title="The longer view"
          sub="Income and expenses over six calendar months"
          action={
            <div className="chart-key">
              <span>
                <i />
                Income
              </span>
              <span>
                <i />
                Expenses
              </span>
            </div>
          }
        >
          <div className="report-chart" role="img" aria-label="Six-month income and expense comparison">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barGap={6} margin={{ left: -10, right: 5 }}>
                <CartesianGrid
                  vertical={false}
                  stroke={isDark ? '#34433d' : '#e9eeea'}
                  strokeDasharray="3 4"
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#91a096' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#91a096' }}
                  tickFormatter={(v) => `${v / 1000}k`}
                />
                <Tooltip
                  formatter={(v) => money(Number(v), true)}
                  contentStyle={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Bar
                  isAnimationActive={false}
                  dataKey="Income"
                  fill="#347c60"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={27}
                />
                <Bar
                  isAnimationActive={false}
                  dataKey="Expenses"
                  fill="#c5d4af"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={27}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-foot">
            <span>Current month is month-to-date, not a forecast.</span>
            <span>{w.profile.currency}</span>
          </div>
        </Panel>
        <Panel title="Your spending mix" sub="See the shape of your month">
          <SpendingChart month={month} />
        </Panel>
      </div>
      <Panel
        title="Your spending fingerprint"
        sub="The last 12 weeks, one little day at a time."
        action={<span className="soft-badge">{noSpend} logged income-only days</span>}
      >
        <div className="heatmap-scroll">
          <div className="heatmap-labels">
            <span>12 WEEKS AGO</span>
            <span>6 WEEKS AGO</span>
            <span>TODAY</span>
          </div>
          <div className="heatmap">
            {dates.map((d) => (
              <div
                key={d.date}
                tabIndex={0}
                title={`${dateLabel(d.date, true)}: ${money(d.total, true)} spent${activeDates.has(d.date) ? '' : ' · no records'}`}
                aria-label={`${dateLabel(d.date, true)}: ${money(d.total, true)} spent${activeDates.has(d.date) ? '' : ', no records'}`}
                style={{
                  background:
                    d.total === 0
                      ? 'var(--surface-alt)'
                      : d.total < 30
                        ? '#dbe6d0'
                        : d.total < 100
                          ? '#abc7a8'
                          : d.total < 300
                            ? '#689a74'
                            : '#2b694d',
                }}
              />
            ))}
          </div>
        </div>
        <div className="heatmap-foot">
          <span>Blank days mean no logged expenses—not proof of a no-spend day.</span>
          <span>
            Less <i style={{ background: '#dbe6d0' }} />
            <i style={{ background: '#abc7a8' }} />
            <i style={{ background: '#689a74' }} />
            <i style={{ background: '#2b694d' }} /> More
          </span>
        </div>
      </Panel>
      <div className="two-columns">
        <Panel
          title="The repeat detective"
          sub="Similar charges from the same merchant across two or more months."
          action={<Repeat2 size={18} className="muted" />}
        >
          {recurring.length ? (
            <div className="detective-list">
              {recurring.map((g) => (
                <button key={g[0].id} onClick={() => onEdit(g[0])}>
                  <span className="detective-circle">
                    <Repeat2 size={17} />
                  </span>
                  <div>
                    <strong>{g[0].merchant}</strong>
                    <span>
                      {g.length} charges · amounts within 10% or {money(1)}
                    </span>
                  </div>
                  <strong>~{money(g.reduce((s, t) => s + t.amount, 0) / g.length, true)}</strong>
                  <ArrowRight size={15} />
                </button>
              ))}
            </div>
          ) : (
            <Empty
              title="Nothing repeating yet"
              text="We look for a similar amount at the same merchant across at least two months. Keep capturing your money moments."
            />
          )}
          <p className="panel-note">
            Possible repeats, not confirmed subscriptions. Last four calendar months, at most two charges per
            merchant per month on average.
          </p>
        </Panel>
        <Panel
          title="A second look"
          sub="Possible duplicates worth reviewing—not automatic deletions."
          action={<SearchCheck size={19} className="muted" />}
        >
          {duplicates.length ? (
            <div className="detective-list">
              {duplicates.map((g) => (
                <button key={g[0].id} onClick={() => onEdit(g[0])}>
                  <span className="detective-circle amber">
                    <SearchCheck size={18} />
                  </span>
                  <div>
                    <strong>{g[0].merchant}</strong>
                    <span>
                      {g.length} matching charges · {dateLabel(g[0].date)}
                    </span>
                  </div>
                  <strong>{money(g[0].amount, true)}</strong>
                  <ArrowRight size={15} />
                </button>
              ))}
            </div>
          ) : (
            <Empty
              title="Looking nice and tidy"
              text="No same-day charges with matching merchant, amount, type, and account were found in this month."
            />
          )}
          <p className="panel-note">
            Identical transactions can be intentional. Review your records before removing anything.
          </p>
        </Panel>
      </div>
      <button className="lab-teaser compact-teaser" onClick={() => navigate('lab')}>
        <span className="lab-teaser-icon">
          <Lightbulb size={24} />
        </span>
        <span>
          <strong>Turn an insight into a possibility.</strong>
          <small>Use the Decision Lab to explore what a small spending shift could mean.</small>
        </span>
        <ArrowUpRight size={20} />
      </button>
    </div>
  );
}
