import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Coffee,
  FlaskConical,
  Heart,
  Hourglass,
  Info,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { plan, round, uid, type Entry } from './model';
import { useFinance } from './store';
import { Empty, GoalGlyph, Panel, Progress } from './ui';

export function Lab({ onCapture }: { onCapture: (draft: Partial<Entry>) => void }) {
  const { w, update, money, notify } = useFinance();
  const [amount, setAmount] = useState('180');
  const [name, setName] = useState('That thing I’ve had my eye on');
  const [cut, setCut] = useState(25);
  const [goalId, setGoalId] = useState(w.goals[0]?.id ?? '');
  const n = Math.max(0, Math.min(1e9, Number(amount) || 0));
  const p = plan(w);
  const after = round(p.remaining - n);
  const hours = w.profile.hourlyRate > 0 ? n / w.profile.hourlyRate : null;
  const goal = w.goals.find((g) => g.id === goalId);
  const months = goal && goal.monthly > 0 ? Math.ceil(n / goal.monthly) : null;
  const comfortable = after >= w.profile.monthlyIncome * 0.1;
  const fits = after >= 0;
  const saveWish = () => {
    if (n < 0.01 || !name.trim()) {
      notify('Add a name and an amount first.');
      return;
    }
    update((w) => ({
      ...w,
      wishes: [
        { id: uid(), name: name.trim(), amount: round(n), createdAt: new Date().toISOString() },
        ...w.wishes,
      ],
    }));
    notify('Saved to your pause pocket. Give it a day, then decide.');
  };
  const last30 = w.transactions
    .filter(
      (t) =>
        t.type === 'expense' &&
        new Date(`${t.date}T12:00:00`).getTime() >= Date.now() - 30 * 86400000 &&
        ['dining', 'shopping', 'entertainment'].includes(t.category),
    )
    .reduce((s, t) => s + t.amount, 0);
  const freed = round((last30 * cut) / 100);
  return (
    <div className="page-stack lab-page">
      <div className="lab-intro">
        <span className="soft-badge">
          <FlaskConical size={14} />
          THE SPENDWISE DECISION LAB
        </span>
        <h2>
          A little pause.
          <br />
          <em>A better possibility.</em>
        </h2>
        <p>
          No judgment. No “you can’t.” Just a clearer view of the trade-offs
          <br className="desktop-only" /> before your next money decision.
        </p>
        <span className="lab-intro-decoration" aria-hidden="true">
          ✳
        </span>
      </div>
      <div className="lab-grid">
        <Panel title="Can I afford it?" sub="Try the purchase before you make it." className="purchase-panel">
          <div className="lab-form">
            <label>
              What are you thinking about?
              <input value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              Price tag ({w.profile.currency})
              <div className="price-input">
                <span>{w.profile.currency}</span>
                <input
                  aria-label="Purchase amount"
                  type="number"
                  min="0"
                  max="1000000000"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </label>
            <div className={`verdict ${!fits ? 'caution' : ''}`}>
              <span>{fits ? <ShieldCheck size={21} /> : <Info size={21} />}</span>
              <div>
                <strong>
                  {!w.profile.monthlyIncome
                    ? 'Start with your income plan'
                    : comfortable
                      ? 'There’s room in your plan.'
                      : fits
                        ? 'It fits, but leaves a thinner cushion.'
                        : 'This stretches your monthly plan.'}
                </strong>
                <p>
                  {!w.profile.monthlyIncome
                    ? 'Set planned monthly income in Settings for a useful estimate.'
                    : fits
                      ? `${money(after)} of planned spending room would remain.`
                      : `You’d be ${money(Math.abs(after))} beyond your planned spending room.`}
                </p>
              </div>
            </div>
            <div className="tradeoff-grid">
              <div>
                <Clock3 size={18} />
                <strong>{hours !== null ? `${hours.toFixed(1)} hours` : 'Set your rate'}</strong>
                <span>{hours !== null ? 'of take-home work' : 'in Settings for life-hours'}</span>
              </div>
              <div>
                <Coffee size={18} />
                <strong>{money(Math.max(0, after) / p.days)}</strong>
                <span>daily room afterward</span>
              </div>
            </div>
            <label>
              Put it in perspective
              <select value={goalId} onChange={(e) => setGoalId(e.target.value)}>
                <option value="">Choose a savings goal</option>
                {w.goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            {goal && (
              <div className="opportunity">
                <span>
                  <GoalGlyph emoji={goal.emoji} />
                </span>
                <p>
                  The same {money(n)} would cover{' '}
                  <strong>
                    {months
                      ? `${months} monthly allocation${months === 1 ? '' : 's'}`
                      : `${((n / goal.target) * 100).toFixed(1)}% of the target`}
                  </strong>{' '}
                  toward {goal.name}. That’s an alternative use—not a prediction that buying will delay your
                  goal.
                </p>
              </div>
            )}
            <div className="lab-buttons">
              <button className="button" onClick={saveWish}>
                <Hourglass size={16} />
                Sleep on it
              </button>
              <button
                className="button secondary"
                disabled={n < 0.01}
                onClick={() =>
                  onCapture({ merchant: name, amount: n, category: 'shopping', type: 'expense' })
                }
              >
                Log the purchase
                <ArrowUpRight size={15} />
              </button>
            </div>
          </div>
        </Panel>
        <div className="page-stack">
          <Panel
            title="The small-shift simulator"
            sub="Less of the forgettable. More of the meaningful."
            className="shift-panel"
          >
            <div className="shift-content">
              <div className="shift-icon">
                <Sparkles size={25} />
              </div>
              <p>
                Your dining, shopping & entertainment spending was <strong>{money(last30)}</strong> over the
                last 30 days.
              </p>
              <label className="slider-label" htmlFor="cut">
                What if you spent a little less?<strong>{cut}%</strong>
              </label>
              <input
                id="cut"
                type="range"
                min="0"
                max="75"
                step="5"
                value={cut}
                onChange={(e) => setCut(Number(e.target.value))}
              />
              <div className="shift-result">
                <span>Potential monthly space</span>
                <strong>+{money(freed)}</strong>
                <small>{money(freed * 12)} over a year, if repeated</small>
              </div>
              <div className="shift-bar">
                <span>Current spending</span>
                <Progress value={100} />
                <span>With your small shift</span>
                <Progress value={100 - cut} color="var(--chart-expense)" />
              </div>
              <p className="form-hint">
                A scenario, not a promise. Assumes the last 30 days repeat each month. No interest or price
                changes included.
              </p>
            </div>
          </Panel>
          <div className="lab-philosophy">
            <Heart size={19} />
            <p>
              Money is a tool for a life you like.
              <br />
              <strong>The best decision is the one you make intentionally.</strong>
            </p>
          </div>
        </div>
      </div>
      <Panel
        title="Your pause pocket"
        sub="A 24-hour breather between “I want it” and “I’ll take it”."
        action={
          <span className="soft-badge">
            <Hourglass size={13} />
            {w.wishes.length} on your mind
          </span>
        }
      >
        {w.wishes.length ? (
          <div className="wish-grid">
            {w.wishes.map((wish) => {
              const remainingHours = Math.max(0, 24 - (Date.now() - Date.parse(wish.createdAt)) / 3600000);
              return (
                <div className="wish-card" key={wish.id}>
                  <div className="wish-card-top">
                    <span>
                      <Hourglass size={16} />
                      {remainingHours > 0 ? `${Math.ceil(remainingHours)}h to reflect` : 'Ready to revisit'}
                    </span>
                    <button
                      className="icon-button"
                      aria-label={`Remove ${wish.name} from pause pocket`}
                      onClick={() => {
                        update((w) => ({ ...w, wishes: w.wishes.filter((x) => x.id !== wish.id) }));
                        notify('Let it go. One less thing on your mind.');
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <h3>{wish.name}</h3>
                  <strong>{money(wish.amount, true)}</strong>
                  <button
                    className="text-button"
                    onClick={() => {
                      setName(wish.name);
                      setAmount(String(wish.amount));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Revisit the trade-offs
                    <ArrowRight size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty
            title="Want it today. Still want it tomorrow?"
            text="Save a possible purchase above. A little distance can make a decision feel a lot clearer."
          />
        )}
      </Panel>
      <div className="info-note">
        <Info size={19} />
        <p>
          <strong>Here’s the math.</strong> Planned spending room = planned monthly income − logged expenses
          this month − next bill occurrences due this month or overdue − active monthly goal allocations. It
          is not cash available in your bank. Expenses may already include a scheduled bill; mark it paid to
          advance the reminder and avoid reserving it twice. The lab does not consider taxes, debt interest,
          or unknown future expenses and is not financial advice.
        </p>
      </div>
    </div>
  );
}
