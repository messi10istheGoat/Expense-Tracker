import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  CircleHelp,
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
import { balance, iso, monthKey, plan, totals, type Entry } from './model';
import { useSubscription } from '../product/Subscription';
import { useFinance } from './store';
import { AnimatedValue, CategoryIcon, dateLabel, Empty, GoalGlyph, LinkButton, Panel, Progress } from './ui';
import { TransactionRows } from './Transactions';
import { useChartColors } from '../hooks/useTheme';

export function CashChart({ month }: { month: string }) {
  const { w, money } = useFinance();
  const colors = useChartColors();
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
              <stop offset="0%" stopColor={colors.income} stopOpacity={0.16} />
              <stop offset="100%" stopColor={colors.income} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.expenses} stopOpacity={0.18} />
              <stop offset="100%" stopColor={colors.expenses} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={colors.grid} strokeDasharray="3 4" />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            minTickGap={35}
            tick={{ fill: colors.axis, fontSize: colors.fontSize }}
            tickFormatter={(v) =>
              `${new Date(y, m - 1).toLocaleDateString('en-US', { month: 'short' })} ${v}`
            }
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: colors.axis, fontSize: colors.fontSize }}
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
            type="stepAfter"
            dataKey="Income"
            stroke={colors.income}
            strokeWidth={2.5}
            fill="url(#incomeFill)"
          />
          <Area
            isAnimationActive={false}
            type="stepAfter"
            dataKey="Expenses"
            stroke={colors.expenses}
            strokeWidth={2.5}
            fill="url(#expenseFill)"
            strokeDasharray="5 4"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SpendingChart({
  month,
  onCategory,
}: {
  month: string;
  onCategory?: (category: string) => void;
}) {
  const { w, money, CATEGORIES, EXPENSE_CATEGORIES } = useFinance();
  const colors = useChartColors();
  const palette = colors.categories;
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
    <Empty title="No expenses yet" text="Add an expense to see where your money goes." />
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
  const { isPro } = useSubscription();
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
      amount: balance(w),
      format: (value: number) => money(value, true),
      icon: Wallet,
      note: `Across ${w.accounts.length} manual ${w.accounts.length === 1 ? 'account' : 'accounts'}`,
      type: 'neutral',
      spark: normalize(balanceTrend),
    },
    {
      label: 'Income',
      amount: t.income,
      format: (value: number) => money(value, true),
      icon: ArrowDownLeft,
      note: incomeChange
        ? `${incomeChange} ${t.income >= prev.income ? 'more' : 'less'} than prior period`
        : 'Recorded income this month',
      type: 'good',
      spark: normalize(cumulative.map((v) => v.income)),
    },
    {
      label: 'Expenses',
      amount: t.expense,
      format: (value: number) => money(value, true),
      icon: ArrowUpRight,
      note: expenseChange
        ? `${expenseChange} ${t.expense >= prev.expense ? 'more' : 'less'} than prior period`
        : 'Recorded expenses this month',
      type: t.expense <= prev.expense ? 'good' : 'warm',
      spark: normalize(cumulative.map((v) => v.expense)),
    },
    {
      label: 'Savings rate',
      amount: t.rate,
      format: (value: number) => `${value.toFixed(1)}%`,
      icon: Target,
      note: t.income ? `${money(t.net)} net cash flow` : 'Add income to calculate your rate',
      type: t.rate >= 0 ? 'good' : 'warm',
      spark: normalize(cumulative.map((v) => v.rate)),
    },
  ];
  return (
    <div className="page-stack overview-page">
      <div className="metric-grid">
        {cards.map((c, i) => (
          <div className="metric-card" key={c.label}>
            <div className="metric-top">
              <span>{c.label}</span>
              <c.icon size={17} />
            </div>
            <strong className="metric-value">
              <AnimatedValue value={c.amount} format={c.format} />
            </strong>
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
                  stroke={i === 2 ? 'var(--chart-expense)' : 'var(--chart-income)'}
                  strokeWidth="1.7"
                />
              </svg>
            </div>
          </div>
        ))}
      </div>
      <div className="overview-main-grid">
        <Panel
          title="Income & expenses"
          sub="Cumulative cash flow for the selected month"
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
              {t.net >= 0 ? 'Positive cash flow' : 'Time to rebalance'}
            </span>
          </div>
          <CashChart month={month} />
          <div className="chart-foot">
            <span>Recorded totals · transfers excluded</span>
            <span>Cumulative · {w.profile.currency}</span>
          </div>
        </Panel>
        <section className="breathing-card">
          <div className="breathing-top">
            <span>
              <span className="live-dot" />
              MONTHLY PLAN
            </span>
            <CircleHelp size={17} aria-label="An estimate based on your monthly plan" />
          </div>
          <p>Remaining to spend</p>
          <strong>
            {money(Math.max(0, p.remaining))}
            <span>this month</span>
          </strong>
          <dl className="plan-breakdown">
            <div>
              <dt>Planned income</dt>
              <dd>{money(w.profile.monthlyIncome)}</dd>
            </div>
            <div>
              <dt>Recorded spending</dt>
              <dd>−{money(p.spent)}</dd>
            </div>
            <div>
              <dt>Upcoming bills</dt>
              <dd>−{money(p.bills)}</dd>
            </div>
            <div>
              <dt>Savings allocations</dt>
              <dd>−{money(p.goals)}</dd>
            </div>
          </dl>
          <div className="daily-room">
            <span>Daily estimate</span>
            <strong>
              {money(p.daily)}
              <small> / day</small>
            </strong>
          </div>
          <button onClick={() => navigate('lab')}>
            Review a purchase
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
          title="Recent transactions"
          sub="Latest income and expenses in this period"
          action={<LinkButton onClick={() => navigate('transactions')}>View all</LinkButton>}
        >
          {recent.length ? (
            <TransactionRows rows={recent} onEdit={onEdit} compact />
          ) : (
            <Empty
              title="No transactions yet"
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
              <span className="small-dot" /> {rows.length} transactions this month
            </span>
            <button onClick={() => navigate('transactions')} aria-label="See all transactions">
              <ArrowRight size={16} />
            </button>
          </div>
        </Panel>
        <Panel
          title="Spending by category"
          sub="Expense breakdown for the selected month"
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
      {isPro ? (
        <>
          <div className="overview-main-grid">
            <Panel
              title="Savings goals"
              sub={isPro ? 'Progress toward your targets' : 'Pro · Plan and track your savings targets'}
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
              title="Upcoming payments"
              sub={isPro ? 'Next scheduled bills and subscriptions' : 'Pro · Organize recurring payments'}
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
              <span className="eyebrow">PURCHASE PLANNING</span>
              <strong>The next purchase can wait. Your peace of mind shouldn’t.</strong>
              <small>Try a what-if in the Decision Lab. See the trade-offs before you spend.</small>
            </span>
            <span className="teaser-action">
              Explore the lab <ArrowUpRight size={17} />
            </span>
          </button>
        </>
      ) : (
        <section className="pro-discovery">
          <div>
            <span className="pro-pill">SPENDWISE PRO</span>
            <h2>Planning and reports, when you need more</h2>
            <p>
              Budgets, savings goals, recurring bills, detailed analytics and purchase planning—all with
              records stored on this device.
            </p>
          </div>
          <button className="button secondary" onClick={() => navigate('analytics')}>
            Explore Pro
            <ArrowUpRight size={15} />
          </button>
        </section>
      )}
    </div>
  );
}
