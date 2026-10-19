import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  Leaf,
  MoreHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CATEGORIES, EXPENSE_CATEGORIES } from '../lib/categories';
import { balance, iso, monthKey, plan, totals, type Entry } from './model';
import { useFinance } from './store';
import { CategoryIcon, dateLabel, Empty, GoalGlyph, LinkButton, Panel, Progress } from './ui';
import { TransactionRows } from './Transactions';
import { useTheme } from '../hooks/useTheme';

export function CashChart({ month }: { month: string }) {
  const { w, money } = useFinance();
  const { isDark } = useTheme();
  const rows = w.transactions.filter((t) => t.date.startsWith(month));
  const [y, m] = month.split('-').map(Number);
  const days = new Date(y, m, 0).getDate();
  const maxDay = month === monthKey() ? new Date().getDate() : days;
  let income = 0,
    expense = 0;
  const data = Array.from({ length: maxDay }, (_, i) => {
    const daily = totals(rows.filter((t) => Number(t.date.slice(-2)) === i + 1));
    income += daily.income;
    expense += daily.expense;
    return { day: i + 1, Income: income, Expenses: expense };
  });
  return (
    <div
      className="cash-chart"
      role="img"
      aria-label={`Cumulative income ${money(income)} and expenses ${money(expense)} for ${month}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#347c60" stopOpacity={0.16} />
              <stop offset="100%" stopColor="#347c60" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b9c898" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#b9c898" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={isDark ? '#34433d' : '#e9eeea'} strokeDasharray="3 4" />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            minTickGap={35}
            tick={{ fill: '#91a096', fontSize: 11 }}
            tickFormatter={(v) =>
              `${new Date(y, m - 1).toLocaleDateString('en-US', { month: 'short' })} ${v}`
            }
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#91a096', fontSize: 11 }}
            tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : `${v}`)}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              fontSize: 12,
              color: 'var(--text)',
            }}
            formatter={(v) => money(Number(v), true)}
            labelFormatter={(v) => `Day ${v}`}
          />
          <Area
            isAnimationActive={false}
            type="monotone"
            dataKey="Income"
            stroke="#347c60"
            strokeWidth={2.5}
            fill="url(#incomeFill)"
          />
          <Area
            isAnimationActive={false}
            type="monotone"
            dataKey="Expenses"
            stroke="#b2be8e"
            strokeWidth={2.5}
            fill="url(#expenseFill)"
            strokeDasharray="5 4"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
const palette = ['#347c60', '#8dae91', '#c5d4af', '#d9b985', '#aaa0c2', '#ced3d0'];
export function SpendingChart({
  month,
  onCategory,
}: {
  month: string;
  onCategory?: (category: string) => void;
}) {
  const { w, money } = useFinance();
  const rows = w.transactions.filter((t) => t.date.startsWith(month) && t.type === 'expense');
  const sum = totals(rows).expense;
  const all = EXPENSE_CATEGORIES.map((id) => ({
    id,
    name: CATEGORIES[id].label,
    value: rows.filter((t) => t.category === id).reduce((s, t) => s + t.amount, 0),
  }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);
  const data = all.slice(0, 4).map((c, i) => ({ ...c, color: palette[i] }));
  if (all.length > 4)
    data.push({
      id: 'travel',
      name: 'Other',
      value: all.slice(4).reduce((s, c) => s + c.value, 0),
      color: palette[4],
    });
  return !sum ? (
    <Empty title="Your story starts here" text="Add an expense to see where your money goes." />
  ) : (
    <div className="spending-body">
      <div className="donut-chart" role="img" aria-label={`Spending breakdown: ${money(sum)} total`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              isAnimationActive={false}
              data={data}
              dataKey="value"
              innerRadius={63}
              outerRadius={83}
              paddingAngle={4}
              cornerRadius={4}
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {data.map((c) => (
                <Cell key={c.name} fill={c.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => money(Number(v), true)}
              contentStyle={{
                background: 'var(--surface)',
                borderRadius: 12,
                border: '1px solid var(--border)',
                fontSize: 12,
                color: 'var(--text)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <span>Total spent</span>
          <strong>{money(sum)}</strong>
          <small>this month</small>
        </div>
      </div>
      <div className="category-legend">
        {data.map((c) => (
          <button
            key={c.name}
            disabled={!onCategory || c.name === 'Other'}
            onClick={() => onCategory?.(c.id)}
          >
            <span className="legend-dot" style={{ background: c.color }} />
            <span>{c.name}</span>
            <strong>{money(c.value)}</strong>
            <small>{((c.value / sum) * 100).toFixed(0)}%</small>
          </button>
        ))}
      </div>
    </div>
  );
}
export function Overview({
  month,
  navigate,
  onEdit,
}: {
  month: string;
  navigate: (page: string) => void;
  onEdit: (t: Entry) => void;
}) {
  const { w, money } = useFinance();
  const p = plan(w);
  const rows = w.transactions.filter((t) => t.date.startsWith(month));
  const t = totals(rows);
  const recent = [...rows].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const [year, m] = month.split('-').map(Number);
  const prevKey = monthKey(new Date(year, m - 2, 1));
  const cutoff = month === monthKey() ? new Date().getDate() : 31;
  const prev = totals(
    w.transactions.filter((t) => t.date.startsWith(prevKey) && Number(t.date.slice(-2)) <= cutoff),
  );
  const change = (value: number, previous: number) =>
    previous > 0 ? `${Math.abs(((value - previous) / previous) * 100).toFixed(1)}%` : null;
  const incomeChange = change(t.income, prev.income);
  const expenseChange = change(t.expense, prev.expense);
  const bills = [...w.bills].sort((a, b) => a.nextDue.localeCompare(b.nextDue)).slice(0, 3);
  // Small trends use the same recorded money as the larger reports, never sample shapes.
  const lastDay = Math.min(cutoff, new Date(year, m, 0).getDate());
  const cumulative = Array.from({ length: 12 }, (_, i) => {
    const day = Math.max(1, lastDay - 11 + i);
    return totals(rows.filter((row) => Number(row.date.slice(-2)) <= day));
  });
  const balanceTrend = Array.from({ length: 12 }, (_, i) => {
    const day = new Date();
    day.setDate(day.getDate() - 11 + i);
    return balance(w) - totals(w.transactions.filter((row) => row.date > iso(day))).net;
  });
  const normalize = (values: number[]) => {
    const min = Math.min(...values),
      span = Math.max(...values) - min;
    return values.map((value) => (span ? 8 + ((value - min) / span) * 50 : 30));
  };
  const cards = [
    {
      label: 'Total balance',
      value: money(balance(w)),
      icon: Wallet,
      note: 'Across your 4 manual accounts',
      type: 'neutral',
      spark: normalize(balanceTrend),
    },
    {
      label: 'Income',
      value: money(t.income),
      icon: ArrowDownLeft,
      note: incomeChange
        ? `${incomeChange} ${t.income >= prev.income ? 'more' : 'less'} than prior period`
        : 'Money coming your way',
      type: 'good',
      spark: normalize(cumulative.map((v) => v.income)),
    },
    {
      label: 'Expenses',
      value: money(t.expense),
      icon: ArrowUpRight,
      note: expenseChange
        ? `${expenseChange} ${t.expense >= prev.expense ? 'more' : 'less'} than prior period`
        : 'Every little moment, accounted for',
      type: t.expense <= prev.expense ? 'good' : 'warm',
      spark: normalize(cumulative.map((v) => v.expense)),
    },
    {
      label: 'Savings rate',
      value: `${t.rate.toFixed(1)}%`,
      icon: Target,
      note: t.income ? `${money(t.net)} net cash flow` : 'Add income to calculate your rate',
      type: t.rate >= 0 ? 'good' : 'warm',
      spark: normalize(cumulative.map((v) => v.rate)),
    },
  ];
  return (
    <div className="page-stack overview-page">
      <div className="welcome-note">
        <span className="note-leaf">
          <Leaf size={18} />
        </span>
        <p>
          A little awareness today. <strong>A little more freedom tomorrow.</strong>
        </p>
        <span className="quiet-label">YOUR MONEY, MINDFULLY</span>
      </div>
      <div className="metric-grid">
        {cards.map((c, i) => (
          <div className="metric-card" key={c.label}>
            <div className="metric-top">
              <span>{c.label}</span>
              <c.icon size={17} />
            </div>
            <strong className="metric-value">{c.value}</strong>
            <div className="metric-bottom">
              <span className={c.type}>
                {i === 1 || i === 2 ? (
                  (i === 1 ? t.income >= prev.income : t.expense >= prev.expense) ? (
                    <ArrowUpRight size={13} />
                  ) : (
                    <ArrowDownRight size={13} />
                  )
                ) : (
                  <span className="tiny-dot" />
                )}
                {c.note}
              </span>
              <svg viewBox="0 0 90 35" aria-hidden="true">
                <path
                  d={`M${c.spark.map((v, j) => `${j * 8},${35 - v / 2.2}`).join(' L')}`}
                  fill="none"
                  stroke={i === 2 ? '#b6a17e' : '#84ad92'}
                  strokeWidth="1.7"
                />
              </svg>
            </div>
          </div>
        ))}
      </div>
      <div className="overview-main-grid">
        <Panel
          title="The ebb & flow"
          sub="A clearer picture of money in and out"
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
          <div className="cash-summary">
            <strong>{money(t.net)}</strong>
            <span>
              net cash flow <span className="small-dot">·</span>{' '}
              {new Date(`${month}-02`).toLocaleDateString('en-US', { month: 'long' })}
            </span>
            <span className="chart-summary-pill">
              <TrendingUp size={13} />
              {t.net >= 0 ? 'Room to grow' : 'Time to rebalance'}
            </span>
          </div>
          <CashChart month={month} />
          <div className="chart-foot">
            <span>Little by little, it adds up.</span>
            <span>Cumulative · {w.profile.currency}</span>
          </div>
        </Panel>
        <section className="breathing-card">
          <div className="breathing-top">
            <span>
              <span className="live-dot" />
              ROOM TO BREATHE
            </span>
            <CircleHelp size={17} aria-label="An estimate based on your monthly plan" />
          </div>
          <p>Your planned spending room</p>
          <strong>
            {money(Math.max(0, p.remaining))}
            <span>this month</span>
          </strong>
          <div className="breathing-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit orbit-three" />
            <div className="sprout">
              <svg viewBox="0 0 130 110">
                <path d="M64 100V52C63 36 42 25 25 29c-1 25 11 40 39 37" fill="#d0ddad" />
                <path d="M64 78c0-32 22-58 49-57 1 31-15 52-49 57" fill="#a6c895" />
                <path d="M64 100V65m0 13 31-39M64 64 39 43" fill="none" stroke="#1f563f" strokeWidth="2" />
              </svg>
            </div>
            <span className="art-spark">✧</span>
            <span className="art-spark two">✦</span>
          </div>
          <div className="daily-room">
            <span>A gentle daily guide</span>
            <strong>
              {money(p.daily)}
              <small> / day</small>
            </strong>
          </div>
          <button onClick={() => navigate('lab')}>
            Can I afford that little extra?
            <ArrowUpRight size={17} />
          </button>
          <small>
            Based on planned income, logged expenses,
            <br />
            next bills & monthly goal allocations. Not bank funds.
          </small>
        </section>
      </div>
      <div className="overview-main-grid">
        <Panel
          title="Recent money moments"
          sub="The everyday things that shape the bigger picture"
          action={<LinkButton onClick={() => navigate('transactions')}>View all</LinkButton>}
        >
          {recent.length ? (
            <TransactionRows rows={recent} onEdit={onEdit} compact />
          ) : (
            <Empty
              title="Your first money moment awaits"
              text="Add a transaction to start seeing the bigger picture."
              action={
                <button className="button" onClick={() => navigate('transactions')}>
                  Get started
                </button>
              }
            />
          )}
          <div className="panel-bottom">
            <span>
              <span className="small-dot" /> {rows.length} moments captured this month
            </span>
            <button onClick={() => navigate('transactions')} aria-label="See all transactions">
              <ArrowRight size={16} />
            </button>
          </div>
        </Panel>
        <Panel
          title="Where it went"
          sub="Every expense has a story"
          action={
            <button
              className="icon-button"
              aria-label="Open spending insights"
              onClick={() => navigate('insights')}
            >
              <MoreHorizontal size={19} />
            </button>
          }
        >
          <SpendingChart month={month} />
        </Panel>
      </div>
      <div className="overview-main-grid">
        <Panel
          title="Dreams in the making"
          sub="Not just saving money. Making things possible."
          action={<LinkButton onClick={() => navigate('goals')}>All goals</LinkButton>}
        >
          {w.goals.length ? (
            <div className="mini-goals">
              {w.goals.slice(0, 3).map((g) => (
                <button key={g.id} onClick={() => navigate('goals')}>
                  <span className="goal-emoji" style={{ background: `${g.color}15` }}>
                    <GoalGlyph emoji={g.emoji} />
                  </span>
                  <h3>{g.name}</h3>
                  <div>
                    <strong>{money(g.saved)}</strong>
                    <span>of {money(g.target)}</span>
                  </div>
                  <Progress value={(g.saved / g.target) * 100} color={g.color} />
                  <small>
                    {Math.round((g.saved / g.target) * 100)}% of the way there
                    <ChevronRight size={13} />
                  </small>
                </button>
              ))}
            </div>
          ) : (
            <Empty
              title="Give your money a purpose"
              text="A trip, a safety net, a fresh start. What are you saving for?"
              action={
                <button className="button" onClick={() => navigate('goals')}>
                  Create a goal
                </button>
              }
            />
          )}
        </Panel>
        <Panel
          title="Around the corner"
          sub="A little heads-up for future you"
          action={<LinkButton onClick={() => navigate('bills')}>See all</LinkButton>}
        >
          <div className="upcoming-list">
            {bills.length ? (
              bills.map((b) => (
                <button key={b.id} onClick={() => navigate('bills')}>
                  <CategoryIcon id={b.category} size={16} />
                  <div>
                    <strong>{b.name}</strong>
                    <span>
                      <CalendarDays size={11} />
                      {dateLabel(b.nextDue)}
                      {b.nextDue < iso() && ' · overdue'}
                    </span>
                  </div>
                  <strong>{money(b.amount, true)}</strong>
                </button>
              ))
            ) : (
              <p className="muted">No upcoming bills. Add a recurring payment to plan ahead.</p>
            )}
          </div>
          <div className="bill-note">
            <Sparkles size={15} />
            <span>A plan feels better than a surprise.</span>
          </div>
        </Panel>
      </div>
      <button className="lab-teaser" onClick={() => navigate('lab')}>
        <span className="lab-teaser-icon">
          <Sparkles size={23} />
        </span>
        <span>
          <span className="eyebrow">A LITTLE EXPERIMENT. A SMARTER DECISION.</span>
          <strong>The next purchase can wait. Your peace of mind shouldn’t.</strong>
          <small>Try a what-if in the Decision Lab. See the trade-offs before you spend.</small>
        </span>
        <span className="teaser-action">
          Explore the lab <ArrowUpRight size={17} />
        </span>
      </button>
    </div>
  );
}
