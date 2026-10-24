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
  RotateCcw,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { useSubscription } from '../product/Subscription';
import { freshWorkspace } from '../product/local';
import { legacyTestMode } from '../product/features';
import { CategoryManager } from './WorkspaceManager';
import { ThemeStudio } from './ThemeStudio';
import { download, iso, makeWorkspace, STORAGE_KEY, validateWorkspace, type Workspace } from './model';
import { useFinance } from './store';
import { Confirm, Modal, Panel } from './ui';

export function Settings() {
  const { w, update, notify, storageError } = useFinance();
  const { isPro, openPaywall } = useSubscription();
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
    if (
      !update((w) => ({
        ...w,
        profile: { name, monthlyIncome, hourlyRate, currency: String(d.get('currency')) },
      }))
    )
      return;
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
      const restored = validateWorkspace(JSON.parse(await file.text()));
      setPending(restored);
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
      <Panel
        title="Profile & preferences"
        sub="Used for display and planning. Changing currency does not convert recorded amounts."
      >
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
      <CategoryManager />
      <Panel className="appearance-panel">
        <ThemeStudio />
      </Panel>
      <Panel
        title="Your plan"
        sub="No Spendwise account required. Your plan never changes where your records are stored."
      >
        <div className="plan-settings">
          <div>
            <strong>Spendwise {isPro ? 'Pro' : 'Free'}</strong>
            <p>
              {isPro
                ? 'Development regression fixture. No real subscription is active.'
                : 'Basic tracking, accounts, categories, personalization and backups are free.'}
            </p>
          </div>
          <button className="button secondary" onClick={() => openPaywall()}>
            View Pro features
          </button>
        </div>
      </Panel>
      <div className="info-note">
        <HardDrive size={19} />
        <p>
          <strong>Stored only on this device.</strong> No sign-up, cloud database, automatic sync or online
          account recovery. On the web, data belongs to this browser profile. On Android, it stays in this
          app’s device storage. Export and restore a backup to move records manually.
        </p>
      </div>
      <Panel
        title="Backup, storage & privacy"
        sub="Keep a backup before clearing storage or uninstalling the app."
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
                notify('Backup export requested. Check your downloads or share destination.');
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
          <h3>Where your data is stored</h3>
          <p>
            Financial records stay on this device. There is no cloud database or Spendwise login. Device
            storage and exported backups are not application-encrypted. Anyone with access to this browser
            profile or unlocked app may be able to read them. Clearing storage or uninstalling the app can
            remove records. Keep backups in a safe place. No bank connections, advertising trackers, or AI API
            calls are included.
          </p>
          <div>
            <span>
              <LockKeyhole size={13} />
              No bank credentials required
            </span>
            <span>
              <Database size={13} />
              Stored on this device
            </span>
          </div>
        </div>
      </div>
      <Panel
        title="Reset this device"
        sub="Download a backup first. Clearing records cannot be reversed after closing the app."
      >
        <div className="reset-options">
          <div>
            <h3>Start again</h3>
            <p>
              Clear local financial records and return to setup. This does not cancel any future store
              subscription.
            </p>
            <button className="button secondary" onClick={() => setReset('personal')}>
              Start an empty workspace
            </button>
          </div>
          {legacyTestMode && (
            <div>
              <h3>Regression test data</h3>
              <button className="button secondary" onClick={() => setReset('demo')}>
                <RotateCcw size={14} />
                Reset to demo
              </button>
            </div>
          )}
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
                if (!update(() => pending, { replaceUnreadable: true })) return;
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
            if (
              !update(() => (legacyTestMode ? makeWorkspace(reset === 'demo') : freshWorkspace()), {
                replaceUnreadable: true,
              })
            )
              return;
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
