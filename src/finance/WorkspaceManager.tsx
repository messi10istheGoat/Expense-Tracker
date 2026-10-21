import { useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import {
  normalize,
  ordered,
  removeAccount,
  removeCategory,
  validName,
  labelName,
  type Account,
  type Category,
} from './catalog';
import { assertUnchanged } from './model';
import { useFinance } from './store';
import { Modal, Panel, Empty } from './ui';
import { CategoryPicker } from './CategoryPicker';
export function CategoryManager() {
  const { w, update, notify, saveError } = useFinance();
  const [type, setType] = useState<'expense' | 'income'>('expense'),
    [editing, setEditing] = useState<Category | 'new' | null>(null),
    [deleting, setDeleting] = useState<Category | null>(null),
    [target, setTarget] = useState(''),
    [query, setQuery] = useState(''),
    [error, setError] = useState(''),
    [discard, setDiscard] = useState(false);
  const list = ordered(w.categories).filter((c) => c.type === type),
    used =
      deleting &&
      (w.transactions.some((t) => t.category === deleting.id) ||
        w.bills.some((b) => b.category === deleting.id)),
    budget = deleting ? (w.budgets[deleting.id] ?? 0) : 0;
  const move = (id: string, direction: number) => {
    const group = list.filter((c) => c.pinned === list.find((c) => c.id === id)?.pinned);
    const i = group.findIndex((c) => c.id === id),
      next = i + direction;
    if (next < 0 || next >= group.length) return;
    [group[i], group[next]] = [group[next], group[i]];
    const ranks = new Map(group.map((c, i) => [c.id, i]));
    update((current) => ({
      ...current,
      categories: current.categories.map((c) => (ranks.has(c.id) ? { ...c, priority: ranks.get(c.id)! } : c)),
    }));
  };
  return (
    <div id="settings-categories" className="settings-section">
      <Panel
        title="Categories"
        sub="Organize income and expenses. Pinned categories appear first in every picker."
        action={
          <button
            className="button secondary"
            onClick={() => {
              setEditing('new');
              setError('');
            }}
          >
            <Plus size={15} />
            New category
          </button>
        }
      >
        <div className="manager-toolbar">
          <div className="segmented">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                className={type === t ? 'active' : ''}
                aria-pressed={type === t}
                onClick={() => {
                  setType(t);
                  setQuery('');
                }}
              >
                {t === 'expense' ? 'Expenses' : 'Income'}
              </button>
            ))}
          </div>
          <input
            aria-label="Search categories"
            placeholder="Find category…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="managed-list" role="list" aria-label={`${type} category priority`} tabIndex={0}>
          {list
            .filter((c) => normalize(c.label).includes(normalize(query)))
            .map((c) => {
              const group = list.filter((x) => x.pinned === c.pinned),
                i = group.findIndex((x) => x.id === c.id);
              return (
                <div className="managed-row" role="listitem" key={c.id}>
                  <span className="managed-rank">{String(list.indexOf(c) + 1).padStart(2, '0')}</span>
                  <div>
                    <strong>{c.label}</strong>
                    <small>
                      {w.transactions.filter((t) => t.category === c.id).length} transactions
                      {c.pinned ? ' · Pinned' : ''}
                    </small>
                  </div>
                  <div className="managed-actions">
                    <button
                      className="icon-button"
                      aria-label={`${c.pinned ? 'Unpin' : 'Pin'} ${c.label}`}
                      aria-pressed={c.pinned}
                      onClick={() =>
                        update((s) => ({
                          ...s,
                          categories: s.categories.map((x) =>
                            x.id === c.id ? { ...x, pinned: !x.pinned } : x,
                          ),
                        }))
                      }
                    >
                      <Star size={15} fill={c.pinned ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Move ${c.label} up`}
                      disabled={i === 0 || !!query}
                      onClick={() => move(c.id, -1)}
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Move ${c.label} down`}
                      disabled={i === group.length - 1 || !!query}
                      onClick={() => move(c.id, 1)}
                    >
                      <ArrowDown size={15} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Edit ${c.label} category`}
                      onClick={() => {
                        setEditing(c);
                        setError('');
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Remove ${c.label} category`}
                      onClick={() => {
                        setDeleting(c);
                        setTarget('');
                        setError('');
                        setDiscard(false);
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          {!list.length && (
            <Empty
              title={`No ${type} categories`}
              text="Create a category here or while entering a transaction."
            />
          )}
        </div>
        <p className="manager-foot">
          Use the arrows to set priority within pinned or unpinned categories. Clear search to reorder.
        </p>
      </Panel>
      {editing && (
        <Modal
          title={editing === 'new' ? `New ${type} category` : 'Edit category'}
          onClose={() => setEditing(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const label = labelName(String(new FormData(e.currentTarget).get('label')));
              if (!validName(label)) {
                setError('Enter a category name (1–60 characters).');
                return;
              }
              if (
                w.categories.some(
                  (c) =>
                    c.type === type &&
                    c.id !== (editing === 'new' ? '' : editing.id) &&
                    normalize(c.label) === normalize(label),
                )
              ) {
                setError('A category with that name already exists.');
                return;
              }
              if (editing === 'new') {
                try {
                  const nextId = `cat_${crypto.randomUUID()}`;
                  if (
                    !update((s) => ({
                      ...s,
                      categories: [
                        ...s.categories,
                        {
                          id: nextId,
                          label,
                          type,
                          color: '#26765c',
                          priority: Math.min(
                            1000000,
                            Math.max(-1, ...s.categories.map((c) => c.priority)) + 1,
                          ),
                          pinned: false,
                        },
                      ],
                      budgets: type === 'expense' ? { ...s.budgets, [nextId]: 0 } : s.budgets,
                    }))
                  ) {
                    setError(saveError());
                    return;
                  }
                } catch {
                  setError('Could not create category.');
                  return;
                }
              } else if (
                !update((s) => ({
                  ...s,
                  categories: s.categories.map((c) => (c.id === editing.id ? { ...c, label } : c)),
                }))
              ) {
                setError(saveError());
                return;
              }
              setEditing(null);
              notify('Category saved.');
            }}
          >
            <label>
              Category name
              <input
                autoFocus
                name="label"
                required
                maxLength={60}
                defaultValue={editing === 'new' ? '' : editing.label}
              />
            </label>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button type="button" className="button secondary" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="button">Save category</button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal
          title={`Remove “${deleting.label}”?`}
          sub="Linked records are moved, never silently deleted."
          onClose={() => setDeleting(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!update((s) => removeCategory(s, deleting.id, target || undefined, discard))) {
                setError(saveError());
                return;
              }
              setDeleting(null);
              notify('Category removed.');
            }}
          >
            <p className="form-hint">
              {used
                ? 'Choose another category of the same type. Its monthly budget will be combined with this one.'
                : 'This category has no linked transactions or bills.'}
            </p>
            {!used && budget > 0 && (
              <label className="check-label">
                <input type="checkbox" checked={discard} onChange={(e) => setDiscard(e.target.checked)} />
                Delete this unused budget instead of moving it
              </label>
            )}
            {(used || (budget > 0 && !discard)) && (
              <CategoryPicker
                label="Move to category"
                value={target}
                onChange={setTarget}
                type={deleting.type}
                exclude={deleting.id}
              />
            )}{' '}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button type="button" className="button secondary" onClick={() => setDeleting(null)}>
                Cancel
              </button>
              <button className="button danger">Remove category</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
export function AccountEditor({ account, onClose }: { account?: Account; onClose: () => void }) {
  const { w, update, notify, saveError } = useFinance();
  const [error, setError] = useState('');
  const [original] = useState(() => ({ account, opening: account ? w.openings[account.id] : 0 }));
  const save = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget),
      label = labelName(String(d.get('name'))),
      opening = Number(d.get('opening'));
    if (!validName(label)) {
      setError('Enter an account name.');
      return;
    }
    if (w.accounts.some((a) => a.id !== account?.id && normalize(a.label) === normalize(label))) {
      setError('That account name already exists.');
      return;
    }
    const id = account?.id ?? `acc_${crypto.randomUUID()}`,
      item: Account = {
        id,
        label,
        kind: d.get('kind') as Account['kind'],
        color: account?.color ?? '#26765c',
      };
    if (
      !update((s) => {
        if (original.account) {
          assertUnchanged(
            s.accounts.find((a) => a.id === original.account!.id),
            original.account,
            'This account',
          );
          if (s.openings[original.account.id] !== original.opening)
            throw new Error('The opening balance changed. Reopen the latest account before saving.');
        }
        return {
          ...s,
          accounts: account ? s.accounts.map((a) => (a.id === id ? item : a)) : [...s.accounts, item],
          openings: { ...s.openings, [id]: opening },
        };
      })
    ) {
      setError(saveError());
      return;
    }
    notify('Account saved.');
    onClose();
  };
  return (
    <Modal
      title={account ? 'Edit account' : 'New account'}
      sub="Manual account. No bank credentials are required."
      onClose={onClose}
    >
      <form onSubmit={save}>
        <label>
          Account name
          <input name="name" autoFocus required maxLength={60} defaultValue={account?.label} />
        </label>
        <div className="form-grid editor-options">
          <label>
            Account type
            <select aria-label="Account type" name="kind" defaultValue={account?.kind ?? 'bank'}>
              <option value="bank">Bank</option>
              <option value="cash">Cash</option>
              <option value="savings">Savings</option>
              <option value="credit">Credit card</option>
            </select>
          </label>
          <label>
            Opening balance ({w.profile.currency})
            <input
              required
              name="opening"
              type="number"
              step="0.01"
              min="-1000000000000"
              max="1000000000000"
              defaultValue={account ? w.openings[account.id] : 0}
            />
          </label>
        </div>
        <p className="form-hint">
          Balance before your earliest recorded transaction. Enter a negative amount for debt.
        </p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button">Save account</button>
        </div>
      </form>
    </Modal>
  );
}
export function AccountRemoval({ id, onClose }: { id: string; onClose: () => void }) {
  const { w, update, saveError, notify } = useFinance();
  const [target, setTarget] = useState(''),
    [error, setError] = useState('');
  const a = w.accounts.find((a) => a.id === id);
  if (!a) return null;
  const used =
    w.transactions.some((t) => t.account === id) ||
    w.bills.some((b) => b.account === id) ||
    w.transfers.some((t) => t.from === id || t.to === id) ||
    w.openings[id] !== 0;
  return (
    <Modal
      title={`Remove “${a.label}”?`}
      sub="Your combined balance and financial transactions are preserved."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!update((s) => removeAccount(s, id, target || undefined))) {
            setError(saveError());
            return;
          }
          notify('Account removed.');
          onClose();
        }}
      >
        <p className="form-hint">
          {used
            ? 'Choose a replacement. Its opening balance and linked records will be combined with this account. Transfers between the two accounts cancel out and are removed.'
            : 'This account has no balance or linked records.'}
        </p>
        {used && (
          <label>
            Move records to
            <select
              required
              aria-label="Move records to"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="" disabled>
                Choose account
              </option>
              {w.accounts
                .filter((a) => a.id !== id)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
            </select>
          </label>
        )}
        {used && w.accounts.length === 1 && (
          <p className="form-hint">
            Create another account before removing your last account with records or money.
          </p>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button className="button secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button danger" disabled={used && !target}>
            Remove account
          </button>
        </div>
      </form>
    </Modal>
  );
}
