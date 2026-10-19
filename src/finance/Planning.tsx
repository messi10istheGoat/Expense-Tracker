import { useState, type FormEvent } from 'react';
import {
  ArrowRightLeft,
  ArrowUpRight,
  BellRing,
  Check,
  CircleHelp,
  CreditCard,
  Pencil,
  Plus,
  Repeat2,
  Target,
  Trash2,
} from 'lucide-react';
import { ACCOUNTS, CATEGORIES, EXPENSE_CATEGORIES } from '../lib/categories';
import type { AccountId, CategoryId } from '../lib/types';
import {
  balance,
  goalColors,
  iso,
  localDate,
  monthKey,
  payBill,
  round,
  uid,
  type Bill,
  type Goal,
  type Transfer,
} from './model';
import { useFinance } from './store';
import { CategoryIcon, Confirm, dateLabel, Empty, GoalGlyph, Modal, Panel, Progress } from './ui';

export function Budgets({ month }: { month: string }) {
  const { w, update, money, notify } = useFinance();
  const [editing, setEditing] = useState<CategoryId | null>(null);
  const rows = EXPENSE_CATEGORIES.map((id) => ({
    id,
    spent: round(
      w.transactions
        .filter((t) => t.type === 'expense' && t.category === id && t.date.startsWith(month))
        .reduce((s, t) => s + t.amount, 0),
    ),
    limit: w.budgets[id] ?? 0,
  }));
  const spent = rows.reduce((s, r) => s + r.spent, 0);
  const budget = rows.reduce((s, r) => s + r.limit, 0);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = Number(new FormData(e.currentTarget).get('amount'));
    if (!Number.isFinite(v) || v < 0 || v > 1e9 || !editing) return;
    update((w) => ({ ...w, budgets: { ...w.budgets, [editing]: round(v) } }));
    notify('Monthly budget updated.');
    setEditing(null);
  };
  return (
    <div className="page-stack">
      <div className="budget-banner">
        <div>
          <span className="eyebrow">A PLAN, NOT A RESTRICTION</span>
          <h2>
            Spend on what matters.
            <br />
            <span>Let the rest go.</span>
          </h2>
          <p>Your category limits repeat every month. Adjust them as life changes.</p>
        </div>
        <div className="budget-banner-total">
          <span>Left in your plan</span>
          <strong>{money(budget - spent)}</strong>
          <span>
            {money(spent)} spent of {money(budget)} planned
          </span>
          <Progress value={budget ? (spent / budget) * 100 : 0} />
        </div>
      </div>
      <div className="budget-grid">
        {rows.map((r) => {
          const over = r.limit > 0 && r.spent > r.limit;
          const pct = r.limit ? (r.spent / r.limit) * 100 : 0;
          return (
            <section className="sw-panel budget-card" key={r.id}>
              <div className="budget-title">
                <CategoryIcon id={r.id} />
                <h3>{CATEGORIES[r.id].label}</h3>
                <button
                  className="icon-button"
                  aria-label={`Edit ${CATEGORIES[r.id].label} budget`}
                  onClick={() => setEditing(r.id)}
                >
                  <Pencil size={15} />
                </button>
              </div>
              <div className="budget-numbers">
                <strong>{money(r.spent)}</strong>
                <span>of {money(r.limit)}</span>
              </div>
              <Progress
                value={pct}
                color={over ? '#c07959' : pct > 85 ? '#c6a267' : CATEGORIES[r.id].color}
              />
              <div className="budget-status">
                <span className={over ? 'warning-text' : ''}>
                  {r.limit === 0
                    ? 'No budget set'
                    : over
                      ? `${money(r.spent - r.limit)} over budget`
                      : `${money(r.limit - r.spent)} available`}
                </span>
                <span>{r.limit ? `${Math.round(pct)}%` : '—'}</span>
              </div>
            </section>
          );
        })}
      </div>
      <div className="info-note">
        <CircleHelp size={18} />
        <p>
          These are planning limits, not separate bank balances. Spending is calculated from all logged
          expenses in the selected month, including pending transactions. Setting a limit to zero removes that
          category’s spending allowance.
        </p>
      </div>
      {editing && (
        <Modal
          title={`A plan for ${CATEGORIES[editing].label.toLowerCase()}`}
          sub="Choose a monthly limit that feels right for you."
          onClose={() => setEditing(null)}
        >
          <form onSubmit={submit}>
            <label>
              Monthly limit ({w.profile.currency})
              <input
                autoFocus
                name="amount"
                required
                type="number"
                min="0"
                max="1000000000"
                step="0.01"
                defaultValue={w.budgets[editing]}
              />
            </label>
            <div className="form-actions">
              <button type="button" className="button secondary" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="button">Save budget</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
function GoalForm({ goal, onClose }: { goal?: Goal; onClose: () => void }) {
  const { w, update, notify } = useFinance();
  const [color, setColor] = useState(goal?.color ?? goalColors[0]);
  const [emoji, setEmoji] = useState(goal?.emoji ?? '🌱');
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const target = Number(d.get('target')),
      saved = Number(d.get('saved')),
      monthly = Number(d.get('monthly'));
    if (![target, saved, monthly].every(Number.isFinite) || target <= 0 || saved < 0 || monthly < 0) return;
    const g: Goal = {
      id: goal?.id ?? uid(),
      name: String(d.get('name')).trim(),
      target: round(target),
      saved: round(saved),
      monthly: round(monthly),
      color,
      emoji,
      deadline: String(d.get('deadline')),
    };
    if (!g.name) return;
    update((w) => ({ ...w, goals: goal ? w.goals.map((x) => (x.id === goal.id ? g : x)) : [...w.goals, g] }));
    notify(goal ? 'Goal updated.' : 'A new dream, with a plan. Goal created.');
    onClose();
  };
  return (
    <Modal
      title={goal ? 'Refine your dream' : 'Make space for a dream'}
      sub="Give your savings something to look forward to."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="emoji-picker">
          {['🌱', '⛩️', '💻', '🏡', '✈️', '🚗', '🎓', '💛'].map((v) => (
            <button
              type="button"
              className={emoji === v ? 'selected' : ''}
              aria-label={`Choose ${v}`}
              key={v}
              onClick={() => setEmoji(v)}
            >
              <GoalGlyph emoji={v} />
            </button>
          ))}
        </div>
        <div className="form-grid">
          <label className="full">
            Goal name
            <input
              required
              autoFocus
              name="name"
              maxLength={120}
              defaultValue={goal?.name}
              placeholder="What are you dreaming of?"
            />
          </label>
          <label>
            Target ({w.profile.currency})
            <input
              required
              type="number"
              min="0.01"
              max="1000000000"
              step="0.01"
              name="target"
              defaultValue={goal?.target}
            />
          </label>
          <label>
            Already saved
            <input
              required
              type="number"
              min="0"
              max="1000000000"
              step="0.01"
              name="saved"
              defaultValue={goal?.saved ?? 0}
            />
          </label>
          <label>
            Monthly allocation
            <input
              required
              type="number"
              min="0"
              max="1000000000"
              step="0.01"
              name="monthly"
              defaultValue={goal?.monthly ?? 100}
            />
          </label>
          <label>
            Target date
            <input
              required
              type="date"
              name="deadline"
              defaultValue={
                goal?.deadline ?? iso(new Date(new Date().getFullYear() + 1, new Date().getMonth(), 1))
              }
            />
          </label>
        </div>
        <div className="color-picker">
          {goalColors.map((c) => (
            <button
              type="button"
              style={{ background: c }}
              className={color === c ? 'selected' : ''}
              aria-label={`Choose color ${c}`}
              key={c}
              onClick={() => setColor(c)}
            >
              {color === c && <Check size={14} />}
            </button>
          ))}
        </div>
        <p className="form-hint">
          Goals are earmarks, not account transfers. Your monthly allocation is reserved in the spending-room
          estimate; it does not move money automatically.
        </p>
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button">{goal ? 'Save changes' : 'Create goal'}</button>
        </div>
      </form>
    </Modal>
  );
}
export function Goals() {
  const { w, update, money, notify } = useFinance();
  const [form, setForm] = useState<Goal | 'new' | null>(null);
  const [funding, setFunding] = useState<Goal | null>(null);
  const [deleting, setDeleting] = useState<Goal | null>(null);
  const fund = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const n = Number(new FormData(e.currentTarget).get('amount'));
    if (!funding || !Number.isFinite(n) || n <= 0) return;
    update((w) => ({
      ...w,
      goals: w.goals.map((g) => (g.id === funding.id ? { ...g, saved: round(g.saved + n) } : g)),
    }));
    notify(
      funding.saved + n >= funding.target
        ? 'You did it! Your goal is fully funded. 🎉'
        : 'One step closer. Savings progress updated.',
    );
    setFunding(null);
  };
  return (
    <div className="page-stack">
      <div className="section-intro">
        <div>
          <span className="eyebrow">YOUR FUTURE HAS GOOD THINGS IN STORE</span>
          <h2>
            Small steps. <em>Wonderful possibilities.</em>
          </h2>
          <p>
            {money(w.goals.reduce((s, g) => s + g.saved, 0))} earmarked across {w.goals.length} dreams. Keep
            going.
          </p>
        </div>
        <button className="button" onClick={() => setForm('new')}>
          <Plus size={17} />
          New goal
        </button>
      </div>
      {w.goals.length ? (
        <div className="goal-grid">
          {w.goals.map((g) => {
            const complete = g.saved >= g.target;
            const months = g.monthly > 0 ? Math.ceil((g.target - g.saved) / g.monthly) : null;
            return (
              <section className="sw-panel goal-card" key={g.id}>
                <div className="goal-card-head">
                  <span className="goal-emoji" style={{ background: `${g.color}18` }}>
                    <GoalGlyph emoji={g.emoji} />
                  </span>
                  <div>
                    <button className="icon-button" aria-label={`Edit ${g.name}`} onClick={() => setForm(g)}>
                      <Pencil size={15} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Delete ${g.name}`}
                      onClick={() => setDeleting(g)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <span className="goal-state" style={{ color: g.color }}>
                  {complete ? 'THE DREAM IS FUNDED ✨' : 'A LITTLE CLOSER EVERY DAY'}
                </span>
                <h3>{g.name}</h3>
                <div className="goal-amount">
                  <strong>{money(g.saved)}</strong>
                  <span>of {money(g.target)}</span>
                </div>
                <Progress value={(g.saved / g.target) * 100} color={g.color} />
                <div className="goal-detail">
                  <span>{Math.round((g.saved / g.target) * 100)}% there</span>
                  <span>Target {dateLabel(g.deadline, true)}</span>
                </div>
                <div className="goal-projection">
                  <Target size={16} />
                  <span>
                    {complete
                      ? 'Look at you. You made it happen!'
                      : months
                        ? `About ${months} month${months === 1 ? '' : 's'} at ${money(g.monthly)}/month`
                        : 'Set a monthly allocation to see your timeline.'}
                  </span>
                </div>
                <button className="button secondary full-width" onClick={() => setFunding(g)}>
                  <Plus size={15} />
                  Record savings
                </button>
              </section>
            );
          })}
        </div>
      ) : (
        <Empty
          title="What’s your next chapter?"
          text="Create a savings goal and turn a someday into a plan."
          action={
            <button className="button" onClick={() => setForm('new')}>
              Create your first goal
            </button>
          }
        />
      )}
      <div className="info-note">
        <CircleHelp size={18} />
        <p>
          Recording savings updates the goal’s progress only. It does not debit an account or create an
          expense. Timelines assume the same monthly contribution and do not include interest. Goals can be
          edited to correct the saved amount.
        </p>
      </div>
      {form && <GoalForm goal={form === 'new' ? undefined : form} onClose={() => setForm(null)} />}
      {funding && (
        <Modal
          title={`A step toward ${funding.name}`}
          sub="Record money you’ve set aside for this goal."
          onClose={() => setFunding(null)}
        >
          <form onSubmit={fund}>
            <label>
              Amount to add ({w.profile.currency})
              <input
                required
                autoFocus
                type="number"
                name="amount"
                min="0.01"
                max="1000000000"
                step="0.01"
                placeholder="0.00"
              />
            </label>
            <p className="form-hint">This is a progress record, not a transfer between your accounts.</p>
            <div className="form-actions">
              <button type="button" className="button secondary" onClick={() => setFunding(null)}>
                Cancel
              </button>
              <button className="button">Record savings</button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Confirm
          title="Let this goal go?"
          text={`“${deleting.name}” will be removed. No account balances or transactions will change.`}
          action="Delete goal"
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            update((w) => ({ ...w, goals: w.goals.filter((g) => g.id !== deleting.id) }));
            notify('Goal removed. There’s always room for a new dream.');
          }}
        />
      )}
    </div>
  );
}
function BillForm({ bill, onClose }: { bill?: Bill; onClose: () => void }) {
  const { update, notify, w } = useFinance();
  const save = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const n = Number(d.get('amount'));
    const name = String(d.get('name')).trim();
    if (!Number.isFinite(n) || n <= 0 || !name) return;
    const b: Bill = {
      id: bill?.id ?? uid(),
      name,
      amount: round(n),
      category: d.get('category') as CategoryId,
      account: d.get('account') as AccountId,
      nextDue: String(d.get('date')),
      frequency: d.get('frequency') as Bill['frequency'],
    };
    update((w) => ({ ...w, bills: bill ? w.bills.map((x) => (x.id === bill.id ? b : x)) : [...w.bills, b] }));
    notify('Recurring payment saved.');
    onClose();
  };
  return (
    <Modal
      title={bill ? 'Edit recurring payment' : 'One less surprise'}
      sub="Keep a little space for what’s coming up."
      onClose={onClose}
    >
      <form onSubmit={save}>
        <div className="form-grid">
          <label className="full">
            Bill or subscription name
            <input
              required
              autoFocus
              name="name"
              maxLength={120}
              defaultValue={bill?.name}
              placeholder="Internet, rent, Spotify…"
            />
          </label>
          <label>
            Amount ({w.profile.currency})
            <input
              required
              name="amount"
              type="number"
              min="0.01"
              max="1000000000"
              step="0.01"
              defaultValue={bill?.amount}
            />
          </label>
          <label>
            Next due
            <input required name="date" type="date" defaultValue={bill?.nextDue ?? iso()} />
          </label>
          <label>
            Repeats
            <select name="frequency" defaultValue={bill?.frequency ?? 'monthly'}>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>
          <label>
            Category
            <select name="category" defaultValue={bill?.category ?? 'utilities'}>
              {EXPENSE_CATEGORIES.map((id) => (
                <option key={id} value={id}>
                  {CATEGORIES[id].label}
                </option>
              ))}
            </select>
          </label>
          <label className="full">
            Pay from
            <select name="account" defaultValue={bill?.account ?? 'checking'}>
              {Object.values(ACCOUNTS).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="form-hint">
          Reminders appear here in the app. No payments are made automatically, and no background
          notifications are sent.
        </p>
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button">Save payment</button>
        </div>
      </form>
    </Modal>
  );
}
export function Bills() {
  const { w, update, money, notify } = useFinance();
  const [form, setForm] = useState<Bill | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Bill | null>(null);
  const [paying, setPaying] = useState<Bill | null>(null);
  const bills = [...w.bills].sort((a, b) => a.nextDue.localeCompare(b.nextDue));
  const monthly = bills.reduce(
    (s, b) =>
      s +
      (b.frequency === 'yearly' ? b.amount / 12 : b.frequency === 'weekly' ? (b.amount * 52) / 12 : b.amount),
    0,
  );
  const monthBills = bills.filter((b) => b.nextDue.startsWith(monthKey()));
  return (
    <div className="page-stack">
      <div className="summary-strip">
        <div>
          <span>Monthly commitment</span>
          <strong>{money(monthly, true)}</strong>
        </div>
        <div>
          <span>Next occurrences this month</span>
          <strong>
            {money(
              monthBills.reduce((s, b) => s + b.amount, 0),
              true,
            )}
          </strong>
        </div>
        <div>
          <span>Needs attention</span>
          <strong>{bills.filter((b) => b.nextDue < iso()).length} overdue</strong>
        </div>
        <button className="button" onClick={() => setForm('new')}>
          <Plus size={16} />
          Add recurring bill
        </button>
      </div>
      <Panel
        title="Your upcoming commitments"
        sub="Nothing on autopilot. Mark a bill paid when you’ve actually paid it."
        action={
          <span className="soft-badge">
            <Repeat2 size={13} />
            {bills.length} recurring
          </span>
        }
      >
        {bills.length ? (
          <div className="bill-list">
            {bills.map((b) => {
              const overdue = b.nextDue < iso();
              const days = Math.round(
                (localDate(b.nextDue).getTime() - localDate(iso()).getTime()) / 86400000,
              );
              return (
                <div className="bill-row" key={b.id}>
                  <div className="bill-date">
                    <small>{localDate(b.nextDue).toLocaleDateString('en-US', { month: 'short' })}</small>
                    <strong>{localDate(b.nextDue).getDate()}</strong>
                  </div>
                  <CategoryIcon id={b.category} />
                  <div className="bill-info">
                    <h3>{b.name}</h3>
                    <span>
                      {b.frequency} · {ACCOUNTS[b.account].label}
                    </span>
                  </div>
                  <span className={`soft-badge ${overdue ? 'warm-badge' : ''}`}>
                    {overdue ? 'Overdue' : days === 0 ? 'Due today' : `In ${days} days`}
                  </span>
                  <strong>{money(b.amount, true)}</strong>
                  <div className="bill-actions">
                    <button className="button secondary small" onClick={() => setPaying(b)}>
                      <Check size={14} />
                      Mark paid
                    </button>
                    <button className="icon-button" aria-label={`Edit ${b.name}`} onClick={() => setForm(b)}>
                      <Pencil size={15} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Delete ${b.name}`}
                      onClick={() => setDeleting(b)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty
            title="Let’s look ahead"
            text="Add your regular bills and subscriptions. We’ll keep the next due date in sight."
            action={
              <button className="button" onClick={() => setForm('new')}>
                Add your first bill
              </button>
            }
          />
        )}
      </Panel>
      <div className="info-note">
        <BellRing size={18} />
        <p>
          Marking paid creates one cleared expense dated today and advances the next due date by one cycle. It
          does not send a real payment. Monthly commitment normalizes weekly × 52 ÷ 12 and yearly ÷ 12; the
          due list shows the next occurrence of each bill, not every future installment.
        </p>
      </div>
      {form && <BillForm bill={form === 'new' ? undefined : form} onClose={() => setForm(null)} />}
      {deleting && (
        <Confirm
          title="Remove this recurring bill?"
          text={`Future reminders for ${deleting.name} will stop. Existing transactions will stay in your history.`}
          action="Remove bill"
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            update((w) => ({ ...w, bills: w.bills.filter((b) => b.id !== deleting.id) }));
            notify('Recurring bill removed.');
          }}
        />
      )}{' '}
      {paying && (
        <Modal
          title={`Record ${paying.name} as paid?`}
          sub="This records a payment; it does not move real money."
          onClose={() => setPaying(null)}
        >
          <p className="muted leading-copy">
            Add a {money(paying.amount, true)} expense to {ACCOUNTS[paying.account].label} dated today for the
            occurrence due {dateLabel(paying.nextDue, true)}? Check your transaction history first to avoid
            logging it twice.
          </p>
          <div className="form-actions">
            <button className="button secondary" onClick={() => setPaying(null)}>
              Not yet
            </button>
            <button
              className="button"
              onClick={() => {
                update((w) => payBill(w, paying.id));
                setPaying(null);
                notify('Payment recorded. Next due date updated.');
              }}
            >
              Record payment
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
export function Accounts() {
  const { w, update, money, notify } = useFinance();
  const [editing, setEditing] = useState<AccountId | null>(null);
  const [moving, setMoving] = useState(false);
  const [deleting, setDeleting] = useState<Transfer | null>(null);
  const [transferError, setTransferError] = useState('');
  const move = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const from = d.get('from') as AccountId,
      to = d.get('to') as AccountId;
    const n = Number(d.get('amount'));
    if (from === to) {
      setTransferError('Choose two different accounts.');
      return;
    }
    if (!Number.isFinite(n) || n <= 0) return;
    const t: Transfer = {
      id: uid(),
      from,
      to,
      amount: round(n),
      date: String(d.get('date')),
      note: String(d.get('note') ?? '').trim(),
    };
    update((w) => ({ ...w, transfers: [t, ...w.transfers] }));
    setMoving(false);
    setTransferError('');
    notify('Transfer recorded. Your total balance is unchanged.');
  };
  const save = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    const n = Number(new FormData(e.currentTarget).get('opening'));
    if (!Number.isFinite(n)) return;
    update((w) => ({ ...w, openings: { ...w.openings, [editing]: round(n) } }));
    notify('Opening balance updated.');
    setEditing(null);
  };
  return (
    <div className="page-stack">
      <div className="section-intro">
        <div>
          <span className="eyebrow">ONE CLEAR PICTURE</span>
          <h2>
            A home for <em>all your money.</em>
          </h2>
          <p>Manual accounts. No bank connection, no credentials, no surprises.</p>
        </div>
        <span className="account-total">
          <small>Combined net balance</small>
          <strong>{money(balance(w), true)}</strong>
        </span>
      </div>
      <div className="account-grid">
        {Object.values(ACCOUNTS).map((a) => (
          <section className={`sw-panel account-card account-${a.id}`} key={a.id}>
            <div className="account-card-top">
              <a.icon size={24} />
              <span>MANUAL ACCOUNT</span>
              <button
                className="icon-button"
                aria-label={`Edit ${a.label} opening balance`}
                onClick={() => setEditing(a.id)}
              >
                <Pencil size={16} />
              </button>
            </div>
            <h3>{a.label}</h3>
            <strong>{money(balance(w, a.id), true)}</strong>
            <div className="account-card-foot">
              <span>{w.transactions.filter((t) => t.account === a.id).length} transactions</span>
              {a.id === 'credit' ? <CreditCard size={20} /> : <ArrowUpRight size={20} />}
            </div>
          </section>
        ))}
      </div>
      <Panel
        title="Keep your money moving"
        sub="Savings transfers and credit card payments, without counting them as spending."
        action={
          <button className="button secondary" onClick={() => setMoving(true)}>
            <ArrowRightLeft size={15} />
            Record transfer
          </button>
        }
      >
        {w.transfers.length ? (
          <div className="transfer-list">
            {[...w.transfers]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 20)
              .map((t) => (
                <div key={t.id}>
                  <span className="detective-circle">
                    <ArrowRightLeft size={17} />
                  </span>
                  <div>
                    <strong>
                      {ACCOUNTS[t.from].label} → {ACCOUNTS[t.to].label}
                    </strong>
                    <span>
                      {dateLabel(t.date, true)}
                      {t.note && ` · ${t.note}`}
                    </span>
                  </div>
                  <strong>{money(t.amount, true)}</strong>
                  <button
                    className="icon-button"
                    aria-label={`Delete transfer ${t.id}`}
                    onClick={() => setDeleting(t)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
          </div>
        ) : (
          <p className="panel-note">
            No transfers recorded. Moving money between your own accounts doesn’t create income or an expense.
            Log credit card purchases as expenses, then record the card payment here as a transfer.
          </p>
        )}
        {w.transfers.length > 20 && (
          <p className="panel-note">
            Showing the 20 most recent transfers. All {w.transfers.length} are included in your JSON backup
            and account balances.
          </p>
        )}
      </Panel>
      <Panel title="How balances work" sub="A useful picture, based only on what you record.">
        <div className="explanation-grid">
          <div>
            <span>01</span>
            <h3>Set your starting point</h3>
            <p>
              Enter each account’s balance before your first logged transaction. Credit card debt should be
              negative.
            </p>
          </div>
          <div>
            <span>02</span>
            <h3>Capture the everyday</h3>
            <p>Income adds to your balance. Expenses reduce it. Pending transactions are included, too.</p>
          </div>
          <div>
            <span>03</span>
            <h3>Keep it in perspective</h3>
            <p>
              These are local records, not live balances. Savings-goal earmarks do not change account
              balances.
            </p>
          </div>
        </div>
      </Panel>
      {editing && (
        <Modal
          title={`Set up ${ACCOUNTS[editing].label}`}
          sub="Opening balance + recorded income − recorded expenses = current balance."
          onClose={() => setEditing(null)}
        >
          <form onSubmit={save}>
            <label>
              Opening balance ({w.profile.currency})
              <input
                autoFocus
                required
                type="number"
                name="opening"
                step="0.01"
                min="-1000000000"
                max="1000000000"
                defaultValue={w.openings[editing]}
              />
            </label>
            <p className="form-hint">
              Use the balance before your earliest logged transaction. Use a negative number for credit card
              debt.
            </p>
            <div className="form-actions">
              <button type="button" className="button secondary" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="button">Save opening balance</button>
            </div>
          </form>
        </Modal>
      )}
      {moving && (
        <Modal
          title="A little money move"
          sub="Record a transfer between your own manual accounts."
          onClose={() => {
            setMoving(false);
            setTransferError('');
          }}
        >
          <form onSubmit={move}>
            <div className="form-grid">
              <label>
                From
                <select name="from" defaultValue="checking">
                  {Object.values(ACCOUNTS).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                To
                <select name="to" defaultValue="savings">
                  {Object.values(ACCOUNTS).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Amount ({w.profile.currency})
                <input
                  autoFocus
                  required
                  name="amount"
                  type="number"
                  min="0.01"
                  max="1000000000"
                  step="0.01"
                />
              </label>
              <label>
                Date
                <input required name="date" type="date" defaultValue={iso()} max={iso()} />
              </label>
              <label className="full">
                Note (optional)
                <input name="note" maxLength={120} placeholder="Moving a little toward my future" />
              </label>
            </div>
            {transferError && (
              <p className="form-error" role="alert">
                {transferError}
              </p>
            )}
            <p className="form-hint">
              This updates your local account records only. It does not move real money. Transfers are
              excluded from income, expenses, budgets, and savings-rate calculations. You may record a
              transfer even if it makes an account negative.
            </p>
            <div className="form-actions">
              <button type="button" className="button secondary" onClick={() => setMoving(false)}>
                Cancel
              </button>
              <button className="button">Record transfer</button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Confirm
          title="Remove this transfer?"
          text="Both account balances will be recalculated. No income or expense records will be changed."
          action="Delete transfer"
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            update((w) => ({ ...w, transfers: w.transfers.filter((t) => t.id !== deleting.id) }));
            notify('Transfer removed.');
          }}
        />
      )}
    </div>
  );
}
