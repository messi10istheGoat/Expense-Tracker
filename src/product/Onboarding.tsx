import { useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, HardDrive, ShieldCheck, Sprout } from 'lucide-react';
import { useFinance } from '../finance/store';
import { download, iso, STORAGE_KEY, validateWorkspace, type Workspace } from '../finance/model';
import { CURRENCIES, completeSetup, freshWorkspace, hasExistingData, type Setup } from './local';
import { Modal } from '../finance/ui';
import { legacyTestMode } from './features';
export function FirstRun({ children }: { children: ReactNode }) {
  const { w } = useFinance();
  return w.onboardingComplete || legacyTestMode ? children : <Onboarding />;
}
export function Onboarding() {
  const { w, update, saveError, storageError } = useFinance(),
    existing = hasExistingData(w);
  const [step, setStep] = useState(1),
    [error, setError] = useState('');
  const [pending, setPending] = useState<Workspace | null>(null);
  const [setup, setSetup] = useState<Setup>({
    name: existing ? w.profile.name : '',
    currency: w.profile.currency,
    accountName: existing ? (w.accounts[0]?.label ?? 'Everyday account') : 'Everyday account',
    kind: existing ? (w.accounts[0]?.kind ?? 'bank') : 'bank',
    opening: existing ? (w.openings[w.accounts[0]?.id] ?? 0) : 0,
    monthlyIncome: existing ? w.profile.monthlyIncome : 0,
  });
  const set = <K extends keyof Setup>(key: K, value: Setup[K]) => setSetup((s) => ({ ...s, [key]: value }));
  const recoverRaw = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) throw new Error('No stored file was found.');
      download(`spendwise-recovery-${iso()}.txt`, raw, 'text/plain');
    } catch {
      setError('Stored data could not be accessed. Allow device storage access, or restore a backup.');
    }
  };
  const restore = async (file: File) => {
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('Backup is too large (maximum 10 MB).');
      setPending(validateWorkspace(JSON.parse(await file.text())));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read this backup.');
    }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (step < 3) {
      if (step === 1 && !setup.name.trim()) {
        setError('Enter the name you would like to use.');
        return;
      }
      setStep(step + 1);
      return;
    }
    try {
      if (!update((current) => completeSetup(current, setup))) {
        setError(saveError());
        return;
      }
      location.hash = 'overview';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your setup.');
    }
  };
  return (
    <main className="onboarding-shell">
      <section className="onboarding-story">
        <div className="setup-brand">
          <Sprout size={27} />
          <strong>spendwise</strong>
        </div>
        <div>
          <span className="eyebrow">YOUR MONEY. YOUR DEVICE.</span>
          <h1>Make room for a clearer picture.</h1>
          <p>Record your spending, see your balances, and build a routine that works for you.</p>
          <ul>
            <li>
              <Check size={18} />
              No sign-up or password
            </li>
            <li>
              <Check size={18} />
              No cloud database or bank connection
            </li>
            <li>
              <Check size={18} />
              Start with Free. Choose Pro when you need more.
            </li>
          </ul>
        </div>
        <small>
          <HardDrive size={16} />
          Your name is a local profile—not an online account.
        </small>
      </section>
      <section className="onboarding-panel">
        <div className="setup-progress" aria-label={`Setup step ${step} of 3`}>
          {['About you', 'Your account', 'Ready to go'].map((label, i) => (
            <span
              key={label}
              aria-current={step === i + 1 ? 'step' : undefined}
              className={step >= i + 1 ? 'active' : ''}
            >
              <b>{step > i + 1 ? <Check size={13} /> : i + 1}</b>
              <span>{label}</span>
            </span>
          ))}
        </div>
        <form onSubmit={submit} className="setup-form">
          <span className="eyebrow">STEP {step} OF 3</span>
          <h2>
            {step === 1
              ? 'Let’s make it yours'
              : step === 2
                ? 'Add your first account'
                : 'You’re ready to start'}
          </h2>
          <p>
            {step === 1
              ? 'A few details to personalize this device. No email, phone number, or password required.'
              : step === 2
                ? 'This is a manual money account, like a wallet or bank account. We never connect to your bank.'
                : 'Basic tracking is free. Advanced planning and reporting tools will offer a Pro subscription.'}
          </p>
          {existing && (
            <div className="setup-existing">
              <strong>Existing records found.</strong>
              <p>
                Setup will keep your transactions, categories, and other records. Your first account’s name
                and opening balance will use the details below.
              </p>
              <button
                type="button"
                className="text-button"
                onClick={() => download(`spendwise-before-setup-${iso()}.json`, JSON.stringify(w, null, 2))}
              >
                Download a backup first
              </button>
            </div>
          )}
          {step === 1 && (
            <div className="setup-fields">
              <label>
                Your name
                <input
                  autoFocus
                  autoComplete="given-name"
                  value={setup.name}
                  onChange={(e) => set('name', e.target.value)}
                  maxLength={60}
                  required
                  placeholder="What should we call you?"
                />
              </label>
              <label>
                Display currency
                <select value={setup.currency} onChange={(e) => set('currency', e.target.value)}>
                  {CURRENCIES.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
                <small>One currency per workspace. Changing it later does not convert amounts.</small>
              </label>
            </div>
          )}
          {step === 2 && (
            <div className="setup-fields">
              <label>
                Account name
                <input
                  autoFocus
                  value={setup.accountName}
                  onChange={(e) => set('accountName', e.target.value)}
                  maxLength={60}
                  required
                />
              </label>
              <div className="setup-two">
                <label>
                  Account type
                  <select value={setup.kind} onChange={(e) => set('kind', e.target.value as Setup['kind'])}>
                    <option value="bank">Bank</option>
                    <option value="cash">Cash / wallet</option>
                    <option value="savings">Savings</option>
                    <option value="credit">Credit card</option>
                  </select>
                </label>
                <label>
                  Opening balance ({setup.currency})
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="-1000000000000"
                    max="1000000000000"
                    value={setup.opening}
                    onChange={(e) => set('opening', Number(e.target.value))}
                    required
                  />
                </label>
              </div>
              <small>
                Start at zero, or enter the balance before your first recorded transaction. Use a negative
                amount for debt.
              </small>
            </div>
          )}
          {step === 3 && (
            <div className="setup-fields">
              <dl className="setup-summary">
                <div>
                  <dt>Local profile</dt>
                  <dd>{setup.name}</dd>
                </div>
                <div>
                  <dt>Account</dt>
                  <dd>{setup.accountName}</dd>
                </div>
                <div>
                  <dt>Currency</dt>
                  <dd>{setup.currency}</dd>
                </div>
                <div>
                  <dt>Starting plan</dt>
                  <dd>Free · no trial or charge</dd>
                </div>
              </dl>
              <label>
                Planned monthly income (optional)
                <input
                  type="number"
                  min="0"
                  max="1000000000"
                  step="0.01"
                  inputMode="decimal"
                  value={setup.monthlyIncome}
                  onChange={(e) => set('monthlyIncome', Number(e.target.value))}
                />
                <small>A planning amount only. This does not add an income transaction.</small>
              </label>
              <div className="setup-privacy">
                <ShieldCheck size={19} />
                <p>
                  Your data stays in this browser or app on this device. No automatic sync or online recovery.
                  Clearing storage or uninstalling can remove your records—keep backups. Device records and
                  exported files are not application-encrypted.
                </p>
              </div>
            </div>
          )}
          {storageError && (
            <div className="setup-existing" role="alert">
              <strong>Device storage needs attention.</strong>
              <p>
                Unreadable stored records will not be overwritten automatically. Download the raw file for
                recovery, restore a backup below, or explicitly start again. If saving is blocked, allow
                storage access in this browser or app.
              </p>
              <button type="button" className="text-button" onClick={recoverRaw}>
                Download raw stored data
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  if (
                    window.confirm(
                      'Replace stored data with an empty workspace? Download a recovery copy first. This discards the unreadable stored file.',
                    )
                  ) {
                    if (!update(() => freshWorkspace(), { replaceUnreadable: true })) setError(saveError());
                    else setError('');
                  }
                }}
              >
                Discard unreadable data and start again
              </button>
            </div>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="setup-actions">
            {step > 1 && (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setError('');
                  setStep(step - 1);
                }}
              >
                <ArrowLeft size={16} />
                Back
              </button>
            )}
            <button className="button">
              {step === 3 ? 'Start using Spendwise' : 'Continue'}
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
        <div className="setup-restore">
          <label className="text-button">
            Have a backup? Restore from a file
            <input
              aria-label="Restore a Spendwise backup"
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void restore(file);
                e.currentTarget.value = '';
              }}
            />
          </label>
        </div>
        <small className="setup-footer">No account to create. No financial records sent to a server.</small>
      </section>
      {pending && (
        <Modal
          title="Restore this backup?"
          sub="This replaces records on this device. Download any existing records first."
          onClose={() => setPending(null)}
        >
          <div className="backup-review">
            <strong>
              {pending.profile.name || 'Local profile'} · {pending.profile.currency}
            </strong>
            <span>
              {pending.transactions.length} transactions · {pending.accounts.length} accounts ·{' '}
              {pending.goals.length} goals
            </span>
            <p>
              Records are restored to this device only. Restoring financial data does not activate a Pro
              subscription.
            </p>
          </div>
          <div className="form-actions">
            <button className="button secondary" onClick={() => setPending(null)}>
              Cancel
            </button>
            <button
              className="button"
              onClick={() => {
                if (update(() => pending, { replaceUnreadable: true })) {
                  setSetup({
                    name: pending.profile.name,
                    currency: pending.profile.currency,
                    accountName: pending.accounts[0]?.label ?? 'Everyday account',
                    kind: pending.accounts[0]?.kind ?? 'bank',
                    opening: pending.openings[pending.accounts[0]?.id] ?? 0,
                    monthlyIncome: pending.profile.monthlyIncome,
                  });
                  setPending(null);
                  setStep(1);
                  location.hash = 'overview';
                } else {
                  setPending(null);
                  setError(saveError());
                }
              }}
            >
              Restore backup
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
