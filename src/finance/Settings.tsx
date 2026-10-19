import { useRef, useState, type FormEvent } from 'react';
import {
  ArrowDownToLine,
  Check,
  Database,
  Download,
  FileJson,
  Globe2,
  HardDrive,
  LockKeyhole,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sun,
  Upload,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { download, iso, makeWorkspace, STORAGE_KEY, validateWorkspace, type Workspace } from './model';
import { useFinance } from './store';
import { Confirm, Modal, Panel } from './ui';

export function Settings() {
  const { w, update, notify, storageError } = useFinance();
  const { isDark, toggle } = useTheme();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Workspace | null>(null);
  const [error, setError] = useState('');
  const [reset, setReset] = useState<'personal' | 'demo' | null>(null);
  const save = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const name = String(d.get('name')).trim();
    const monthlyIncome = Number(d.get('income')),
      hourlyRate = Number(d.get('rate'));
    if (!name || ![monthlyIncome, hourlyRate].every((n) => Number.isFinite(n) && n >= 0)) return;
    update((w) => ({
      ...w,
      profile: { name, monthlyIncome, hourlyRate, currency: String(d.get('currency')) },
    }));
    notify('Your preferences are saved.');
  };
  const restore = async (file?: File) => {
    if (!file) return;
    setError('');
    if (file.size > 10 * 1024 * 1024) {
      setError('Please choose a backup smaller than 10 MB.');
      return;
    }
    try {
      setPending(validateWorkspace(JSON.parse(await file.text())));
    } catch (e) {
      setError(
        e instanceof SyntaxError
          ? 'That file isn’t valid JSON. Please choose a Spendwise backup.'
          : e instanceof Error
            ? e.message
            : 'Could not read this file.',
      );
    }
    if (input.current) input.current.value = '';
  };
  return (
    <div className="page-stack settings-page">
      <Panel title="Make yourself at home" sub="A few details to make your plan more useful.">
        <form className="settings-form" onSubmit={save}>
          <div className="form-grid">
            <label>
              Your first name
              <input name="name" required maxLength={60} defaultValue={w.profile.name} />
            </label>
            <label>
              Display currency
              <select name="currency" defaultValue={w.profile.currency}>
                {[
                  ['USD', 'US Dollar ($)'],
                  ['BDT', 'Bangladeshi Taka (৳)'],
                  ['EUR', 'Euro (€)'],
                  ['GBP', 'British Pound (£)'],
                  ['INR', 'Indian Rupee (₹)'],
                ].map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Planned monthly take-home income
              <input
                type="number"
                min="0"
                max="1000000000"
                step="0.01"
                name="income"
                required
                defaultValue={w.profile.monthlyIncome}
              />
            </label>
            <label>
              Take-home hourly rate
              <input
                type="number"
                min="0"
                max="1000000"
                step="0.01"
                name="rate"
                required
                defaultValue={w.profile.hourlyRate}
              />
            </label>
          </div>
          <div className="info-note small-note">
            <Globe2 size={17} />
            <p>
              Currency changes the display label only. Existing amounts are not converted. Choose one currency
              for this workspace; mixed-currency transactions aren’t supported.
            </p>
          </div>
          <p className="form-hint">
            Your income plan powers the spending-room estimate. Your hourly rate powers the Decision Lab’s
            “life-hours” view. Neither is automatically logged as income.
          </p>
          <button className="button">
            <Check size={16} />
            Save preferences
          </button>
        </form>
      </Panel>
      <Panel title="A view that feels like you" sub="A little easier on the eyes, day or night.">
        <div className="theme-options">
          <button
            className={!isDark ? 'selected' : ''}
            onClick={() => {
              if (isDark) toggle();
            }}
          >
            <Sun size={24} />
            <strong>Light & airy</strong>
            <span>A fresh perspective</span>
            {!isDark && <Check size={17} />}
          </button>
          <button
            className={isDark ? 'selected' : ''}
            onClick={() => {
              if (!isDark) toggle();
            }}
          >
            <Moon size={24} />
            <strong>After hours</strong>
            <span>A little softer at night</span>
            {isDark && <Check size={17} />}
          </button>
        </div>
      </Panel>
      <div className="info-note">
        <HardDrive size={19} />
        <p>
          <strong>A home-screen kind of app.</strong> Install Spendwise from your browser’s app menu on
          desktop or Android. On iPhone/iPad, use Safari → Share → Add to Home Screen. After the first
          successful online visit to the production site, the app shell can reopen offline. Each device has
          its own workspace—use a JSON backup to move your records.
        </p>
      </div>
      <Panel
        title="Your data. Your hands."
        sub="This workspace lives in this browser—not on a server."
        action={<HardDrive size={18} className="muted" />}
      >
        <div className="data-options">
          <div>
            <span className="setting-icon">
              <Download size={22} />
            </span>
            <div>
              <h3>Take a backup</h3>
              <p>
                Download transactions, transfers, budgets, bills, goals, pause-pocket items, and preferences
                as a restorable JSON file.
              </p>
            </div>
            <button
              className="button secondary"
              onClick={() => {
                download(`spendwise-backup-${iso()}.json`, JSON.stringify(w, null, 2));
                notify('Backup downloaded. Keep it somewhere safe.');
              }}
            >
              <ArrowDownToLine size={15} />
              Download backup
            </button>
          </div>
          <div>
            <span className="setting-icon">
              <Upload size={22} />
            </span>
            <div>
              <h3>Restore your workspace</h3>
              <p>Restore a Spendwise JSON backup. This replaces your current data after confirmation.</p>
            </div>
            <button className="button secondary" onClick={() => input.current?.click()}>
              <FileJson size={15} />
              Choose backup
            </button>
            <input
              ref={input}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              aria-label="Choose Spendwise backup"
              onChange={(e) => void restore(e.target.files?.[0])}
            />
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {storageError && (
            <div className="storage-settings-error">
              <p>
                Browser storage could not be loaded or saved. Download a backup before closing this tab. If an
                older unreadable workspace exists, you can recover its raw file below.
              </p>
              <button
                className="button secondary small"
                onClick={() => {
                  try {
                    download(
                      `spendwise-raw-recovery-${iso()}.json`,
                      localStorage.getItem(STORAGE_KEY) ?? '{}',
                    );
                  } catch {
                    notify('Browser storage is blocked. Download the current backup above instead.');
                  }
                }}
              >
                Recover stored file
              </button>
            </div>
          )}
        </div>
      </Panel>
      <div className="privacy-card">
        <span>
          <ShieldCheck size={27} />
        </span>
        <div>
          <h3>Private by design. Honest by default.</h3>
          <p>
            No account required. No analytics, ads, bank connections, or AI API calls. Data stays in browser
            local storage, which is <strong>not encrypted</strong>. Anyone with access to this browser profile
            may access it. Clearing browser data removes your workspace, so keep regular backups.
          </p>
          <div>
            <span>
              <LockKeyhole size={13} />
              No data sent to our servers
            </span>
            <span>
              <Database size={13} />
              Stored on this device
            </span>
          </div>
        </div>
      </div>
      <Panel
        title="A fresh chapter"
        sub={`You’re currently in ${w.demo ? 'demo mode with sample data' : 'your personal workspace'}.`}
      >
        <div className="reset-options">
          <div>
            <h3>Start your own journey</h3>
            <p>Clear all sample data and begin with empty accounts, goals, and transactions.</p>
            <button className="button secondary" onClick={() => setReset('personal')}>
              Start an empty workspace
            </button>
          </div>
          <div>
            <h3>Explore with sample data</h3>
            <p>Replace the current workspace with a fresh set of demo records to explore the app.</p>
            <button className="button secondary" onClick={() => setReset('demo')}>
              <RotateCcw size={14} />
              Reset to demo
            </button>
          </div>
        </div>
      </Panel>
      {pending && (
        <Modal
          title="Restore this backup?"
          sub="Your current workspace will be replaced—not merged."
          onClose={() => setPending(null)}
        >
          <div className="restore-summary">
            <FileJson size={32} />
            <h3>{pending.profile.name}’s workspace</h3>
            <p>
              {pending.transactions.length} transactions · {pending.goals.length} goals ·{' '}
              {pending.bills.length} bills
            </p>
            <span>
              Currency: {pending.profile.currency} · {pending.demo ? 'Demo' : 'Personal'}
            </span>
          </div>
          <p className="form-hint">
            Download a backup of your current workspace first if you want to keep it.
          </p>
          <div className="form-actions">
            <button className="button secondary" onClick={() => setPending(null)}>
              Cancel
            </button>
            <button
              className="button"
              onClick={() => {
                update(() => pending);
                setPending(null);
                notify('Backup restored. Welcome back.');
              }}
            >
              Replace & restore
            </button>
          </div>
        </Modal>
      )}
      {reset && (
        <Confirm
          title={reset === 'personal' ? 'Ready for your own chapter?' : 'Reset to sample data?'}
          text="This replaces all transactions, transfers, goals, budgets, bills, opening balances, and preferences. Download a backup first—this cannot be undone."
          action={reset === 'personal' ? 'Start empty' : 'Reset to demo'}
          onClose={() => setReset(null)}
          onConfirm={() => {
            update(() => makeWorkspace(reset === 'demo'));
            notify(
              reset === 'personal'
                ? 'A clean slate. Start by setting your income plan and opening balances.'
                : 'Demo workspace is ready to explore.',
            );
          }}
        />
      )}
    </div>
  );
}
