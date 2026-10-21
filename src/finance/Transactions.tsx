import { useMemo, useState, type FormEvent } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { AccountId, CategoryId, TxType } from '../lib/types';
import {
  assertUnchanged,
  csv,
  download,
  iso,
  parseQuickEntry,
  round,
  totals,
  uid,
  type Entry,
} from './model';
import { CategoryPicker } from './CategoryPicker';
import { useFinance } from './store';
import { CategoryIcon, Confirm, dateLabel, Empty, Modal } from './ui';

export function TransactionForm({
  entry,
  draft,
  onClose,
}: {
  entry?: Entry;
  draft?: Partial<Entry>;
  onClose: () => void;
}) {
  const { update, notify, w, CATEGORIES, ACCOUNTS, saveError } = useFinance();
  const [type, setType] = useState<TxType>(entry?.type ?? draft?.type ?? 'expense');
  const [category, setCategory] = useState<CategoryId>(
    entry?.category ??
      draft?.category ??
      Object.values(CATEGORIES).find((c) => c.type === (draft?.type ?? 'expense'))?.id ??
      '',
  );
  const [merchant, setMerchant] = useState(entry?.merchant ?? draft?.merchant ?? '');
  const [amount, setAmount] = useState(
    entry ? String(entry.amount) : draft?.amount ? String(draft.amount) : '',
  );
  const [date, setDate] = useState(entry?.date ?? iso());
  const [quick, setQuick] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const save = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 0.01 || n > 1e9 || !merchant.trim() || date > iso()) {
      setError(
        'Enter a valid amount, merchant, and a date no later than today. Use Bills for future payments.',
      );
      return;
    }
    const row: Entry = {
      id: entry?.id ?? uid(),
      merchant: merchant.trim(),
      amount: round(n),
      date,
      category,
      type,
      account: data.get('account') as AccountId,
      status: data.get('status') as Entry['status'],
      recurring: data.get('recurring') === 'on',
      note: String(data.get('note') ?? '').trim(),
    };
    const saved = update((current) => {
      if (entry)
        assertUnchanged(
          current.transactions.find((t) => t.id === entry.id),
          entry,
          'This transaction',
        );
      return {
        ...current,
        transactions: entry
          ? current.transactions.map((t) => (t.id === entry.id ? row : t))
          : [row, ...current.transactions],
      };
    });
    if (!saved) {
      setError(saveError());
      return;
    }
    notify(entry ? 'Transaction updated.' : 'Transaction added. Your plan is up to date.');
    onClose();
  };
  const applyQuick = () => {
    const p = parseQuickEntry(quick, new Date(), w);
    if (!p) {
      setError('Try “Coffee 6.50 yesterday” or “Salary 3500 #salary”.');
      return;
    }
    setMerchant(p.merchant!);
    setAmount(String(p.amount));
    setCategory(p.category ?? '');
    setType(p.type!);
    setDate(p.date!);
    setError('');
    notify('Details filled in. Review before saving.');
  };
  return (
    <Modal
      title={entry ? 'Edit transaction' : 'New transaction'}
      sub="Record an income or expense in your account."
      onClose={onClose}
    >
      <form onSubmit={save}>
        {!entry && (
          <div className="quick-entry">
            <label htmlFor="quick">
              <Sparkles size={15} />
              Quick capture
            </label>
            <div>
              <input
                id="quick"
                value={quick}
                onChange={(e) => setQuick(e.target.value)}
                placeholder="Coffee 6.50 yesterday #dining"
              />
              <button
                type="button"
                className="icon-button"
                aria-label="Fill transaction from quick capture"
                onClick={applyQuick}
              >
                <ArrowUpRight size={18} />
              </button>
            </div>
            <small>
              Amount + merchant, optional “yesterday” and #category. No AI, just a helpful shortcut.
            </small>
          </div>
        )}
        <div className="segmented">
          <button
            type="button"
            className={type === 'expense' ? 'active' : ''}
            onClick={() => {
              setType('expense');
              if (type !== 'expense')
                setCategory(Object.values(CATEGORIES).find((c) => c.type === 'expense')?.id ?? '');
            }}
          >
            <ArrowUpRight size={15} />
            Expense
          </button>
          <button
            type="button"
            className={type === 'income' ? 'active' : ''}
            onClick={() => {
              setType('income');
              if (type !== 'income')
                setCategory(Object.values(CATEGORIES).find((c) => c.type === 'income')?.id ?? '');
            }}
          >
            <ArrowDownLeft size={15} />
            Income
          </button>
        </div>
        <div className="form-grid">
          <label className="full">
            Merchant or description
            <input
              autoFocus
              required
              maxLength={120}
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="What was it for?"
            />
          </label>
          <label>
            Amount ({w.profile.currency})
            <input
              required
              type="number"
              min="0.01"
              max="1000000000"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label>
            Date
            <input required type="date" value={date} max={iso()} onChange={(e) => setDate(e.target.value)} />
          </label>
          <CategoryPicker value={category} onChange={setCategory} type={type} />
          <label>
            Account
            <select
              name="account"
              required
              aria-label="Account"
              defaultValue={entry?.account ?? w.accounts[0]?.id ?? ''}
            >
              {Object.values(ACCOUNTS).map((a) => (
                <option value={a.id} key={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select name="status" defaultValue={entry?.status ?? 'cleared'}>
              <option value="cleared">Cleared</option>
              <option value="pending">Pending</option>
            </select>
          </label>
          <label className="check-label">
            <input type="checkbox" name="recurring" defaultChecked={entry?.recurring} />
            Recurring payment flag
          </label>
          <label className="full">
            Note <span className="muted">(optional)</span>
            <textarea
              name="note"
              maxLength={500}
              defaultValue={entry?.note}
              placeholder="A little context for future you"
              rows={2}
            />
          </label>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <p className="form-hint">
          Recurring flags help identify patterns. Schedule future payments in Bills & subscriptions.
        </p>
        <div className="form-actions">
          {entry && (
            <button
              type="button"
              className="icon-button delete-entry"
              aria-label="Delete transaction"
              onClick={() => setDeleting(true)}
            >
              <Trash2 size={18} />
            </button>
          )}
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button">
            <Check size={16} />
            {entry ? 'Save changes' : 'Add transaction'}
          </button>
        </div>
      </form>
      {deleting && entry && (
        <Confirm
          title="Delete this money moment?"
          text={`Remove ${entry.merchant} from your records? Your balances and reports will update. This cannot be undone.`}
          action="Delete transaction"
          onClose={() => setDeleting(false)}
          onConfirm={() => {
            if (
              !update((w) => {
                assertUnchanged(
                  w.transactions.find((t) => t.id === entry.id),
                  entry,
                  'This transaction',
                );
                return { ...w, transactions: w.transactions.filter((t) => t.id !== entry.id) };
              })
            ) {
              setError(saveError());
              return;
            }
            notify('Transaction deleted.');
            onClose();
          }}
        />
      )}
    </Modal>
  );
}
export function TransactionRows({
  rows,
  onEdit,
  compact = false,
}: {
  rows: Entry[];
  onEdit: (t: Entry) => void;
  compact?: boolean;
}) {
  const { money, CATEGORIES, ACCOUNTS } = useFinance();
  return (
    <div className={`transaction-list ${compact ? 'compact' : ''}`}>
      {rows.map((t) => (
        <button
          className="transaction-row"
          key={t.id}
          onClick={() => onEdit(t)}
          aria-label={`Edit ${t.merchant}`}
          title={`Edit ${t.merchant}`}
        >
          <CategoryIcon id={t.category} />
          <div className="transaction-merchant">
            <strong>{t.merchant}</strong>
            <span>
              {compact
                ? CATEGORIES[t.category].label
                : `${CATEGORIES[t.category].label} · ${ACCOUNTS[t.account].label}`}
            </span>
          </div>
          <span className="transaction-date">{dateLabel(t.date)}</span>
          <span className={`transaction-amount ${t.type === 'income' ? 'positive' : ''}`}>
            {t.type === 'income' ? '+' : '−'}
            {money(t.amount, true)}
            {!compact && <small className={t.status === 'pending' ? 'pending' : ''}>{t.status}</small>}
          </span>
          {!compact && <Pencil size={14} className="row-edit" />}
        </button>
      ))}
    </div>
  );
}
export function Transactions({
  onEdit,
  onAdd,
  initialSearch = '',
}: {
  onEdit: (t: Entry) => void;
  onAdd: () => void;
  initialSearch?: string;
}) {
  const { w, update, notify, money, CATEGORIES, ACCOUNTS } = useFinance();
  const [q, setQ] = useState(initialSearch);
  const [type, setType] = useState('all');
  const [category, setCategory] = useState('all');
  const [account, setAccount] = useState('all');
  const [period, setPeriod] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const rows = useMemo(
    () =>
      w.transactions
        .filter(
          (t) =>
            (!q ||
              `${t.merchant} ${t.note ?? ''} ${CATEGORIES[t.category].label}`
                .toLowerCase()
                .includes(q.toLowerCase())) &&
            (type === 'all' || t.type === type) &&
            (category === 'all' || t.category === category) &&
            (account === 'all' || t.account === account) &&
            (period === 'all' || t.date.startsWith(period)) &&
            (status === 'all' || t.status === status),
        )
        .sort((a, b) =>
          sort === 'largest'
            ? b.amount - a.amount
            : sort === 'oldest'
              ? a.date.localeCompare(b.date)
              : b.date.localeCompare(a.date),
        ),
    [w.transactions, CATEGORIES, q, type, category, account, period, status, sort],
  );
  const pages = Math.max(1, Math.ceil(rows.length / 12));
  const current = Math.min(page, pages);
  const slice = rows.slice((current - 1) * 12, current * 12);
  const sum = totals(rows);
  const filterChange = (fn: () => void) => {
    fn();
    setPage(1);
    setSelected([]);
  };
  return (
    <div className="page-stack">
      <div className="summary-strip">
        <div>
          <span>Money in</span>
          <strong className="positive">{money(sum.income)}</strong>
        </div>
        <div>
          <span>Money out</span>
          <strong>{money(sum.expense)}</strong>
        </div>
        <div>
          <span>Net cash flow</span>
          <strong>{money(sum.net)}</strong>
        </div>
        <div>
          <span>Transactions</span>
          <strong>{rows.length.toLocaleString()}</strong>
        </div>
      </div>
      <section className="sw-panel">
        <div className="transaction-tools">
          <div className="search-field">
            <Search size={17} />
            <input
              aria-label="Search transactions"
              placeholder="Search merchants, notes, categories…"
              value={q}
              onChange={(e) => filterChange(() => setQ(e.target.value))}
            />
          </div>
          <button
            className="button secondary"
            aria-label="Export CSV"
            onClick={() => {
              download(`spendwise-${iso()}.csv`, csv(rows, w), 'text/csv;charset=utf-8');
              notify(`${rows.length} transactions exported.`);
            }}
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
        <div className="filter-row">
          <select
            aria-label="Transaction type"
            value={type}
            onChange={(e) => filterChange(() => setType(e.target.value))}
          >
            <option value="all">All types</option>
            <option value="expense">Expenses</option>
            <option value="income">Income</option>
          </select>
          <select
            aria-label="Filter category"
            value={category}
            onChange={(e) => filterChange(() => setCategory(e.target.value))}
          >
            <option value="all">All categories</option>
            {Object.values(CATEGORIES).map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter account"
            value={account}
            onChange={(e) => filterChange(() => setAccount(e.target.value))}
          >
            <option value="all">All accounts</option>
            {Object.values(ACCOUNTS).map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter month"
            value={period}
            onChange={(e) => filterChange(() => setPeriod(e.target.value))}
          >
            <option value="all">All time</option>
            {[...new Set(w.transactions.map((t) => t.date.slice(0, 7)))]
              .sort()
              .reverse()
              .map((m) => (
                <option key={m} value={m}>
                  {new Date(`${m}-02`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </option>
              ))}
          </select>
          <select
            aria-label="Filter status"
            value={status}
            onChange={(e) => filterChange(() => setStatus(e.target.value))}
          >
            <option value="all">All statuses</option>
            <option value="cleared">Cleared</option>
            <option value="pending">Pending</option>
          </select>
          <select
            aria-label="Sort transactions"
            value={sort}
            onChange={(e) => filterChange(() => setSort(e.target.value))}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="largest">Largest first</option>
          </select>
        </div>
        {selected.length > 0 && (
          <div className="selection-bar">
            <span>{selected.length} selected</span>
            <button
              onClick={() => {
                update((w) => ({
                  ...w,
                  transactions: w.transactions.map((t) =>
                    selected.includes(t.id) ? { ...t, status: 'cleared' } : t,
                  ),
                }));
                setSelected([]);
                notify('Selected transactions marked cleared.');
              }}
            >
              Mark cleared
            </button>
            <button onClick={() => setDeleting(true)}>
              <Trash2 size={14} />
              Delete
            </button>
            <button onClick={() => setSelected([])}>Cancel</button>
          </div>
        )}
        {rows.length ? (
          <>
            <div className="table-caption">
              <label className="check-label">
                <input
                  type="checkbox"
                  aria-label="Select this page"
                  checked={slice.length > 0 && slice.every((t) => selected.includes(t.id))}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...new Set([...selected, ...slice.map((t) => t.id)])]
                        : selected.filter((id) => !slice.some((t) => t.id === id)),
                    )
                  }
                />
                DESCRIPTION
              </label>
              <span>DATE / AMOUNT</span>
            </div>
            {slice.map((t) => (
              <div className="selectable-row" key={t.id}>
                <input
                  type="checkbox"
                  aria-label={`Select ${t.merchant}`}
                  checked={selected.includes(t.id)}
                  onChange={(e) =>
                    setSelected(e.target.checked ? [...selected, t.id] : selected.filter((id) => id !== t.id))
                  }
                />
                <TransactionRows rows={[t]} onEdit={onEdit} />
              </div>
            ))}
            <div className="pagination">
              <span>
                {(current - 1) * 12 + 1}–{Math.min(current * 12, rows.length)} of {rows.length} transactions
              </span>
              <div>
                <button
                  className="icon-button"
                  aria-label="Previous page"
                  disabled={current === 1}
                  onClick={() => setPage(current - 1)}
                >
                  <ChevronLeft size={17} />
                </button>
                <span>
                  {current} / {pages}
                </span>
                <button
                  className="icon-button"
                  aria-label="Next page"
                  disabled={current === pages}
                  onClick={() => setPage(current + 1)}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <Empty
            title="A clean slate"
            text="No transactions match. Try different filters, or capture your first money moment."
            action={
              <button className="button" onClick={onAdd}>
                <Plus size={16} />
                Add transaction
              </button>
            }
          />
        )}
      </section>
      {deleting && (
        <Confirm
          title="Delete selected transactions?"
          text={`This permanently removes ${selected.length} transactions and updates all your balances and reports. Export a backup first if you need to keep them.`}
          action="Delete transactions"
          onClose={() => setDeleting(false)}
          onConfirm={() => {
            update((w) => ({ ...w, transactions: w.transactions.filter((t) => !selected.includes(t.id)) }));
            setSelected([]);
            notify('Transactions deleted.');
          }}
        />
      )}
    </div>
  );
}
