import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownUp,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Command,
  FlaskConical,
  HardDrive,
  LayoutDashboard,
  Menu,
  Moon,
  Palette,
  Plus,
  Repeat2,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Sprout,
  Sun,
  Target,
  Wallet,
  LockKeyhole,
} from 'lucide-react';
import { FirstRun } from './product/Onboarding';
import { ProGate, SubscriptionProvider, useSubscription } from './product/Subscription';
import { isProFeature } from './product/features';
import { NativeLifecycle } from './platform/native';
import { ThemeProvider, useTheme } from './hooks/useTheme';
import { FinanceProvider, useFinance } from './finance/store';
import { monthKey, type Entry } from './finance/model';
import { Overview } from './finance/Overview';
import { TransactionForm, Transactions } from './finance/Transactions';
import { Accounts, Bills, Budgets, Goals } from './finance/Planning';
import { Insights } from './finance/Insights';
import { Analytics } from './finance/Analytics';
import { Lab } from './finance/Lab';
import { Settings } from './finance/Settings';
import { ThemeStudio } from './finance/ThemeStudio';
import { STYLES } from './finance/appearance';
import { Modal } from './finance/ui';

const pages = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    group: 'WORKSPACE',
    sub: 'Balances, cash flow, and upcoming payments.',
  },
  {
    id: 'transactions',
    label: 'Transactions',
    icon: ArrowDownUp,
    group: '',
    sub: 'Review and manage your income and expenses.',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: ChartNoAxesCombined,
    group: '',
    sub: 'Explore spending patterns and compare periods.',
  },
  {
    id: 'accounts',
    label: 'Accounts',
    icon: Wallet,
    group: '',
    sub: 'Manage your accounts, balances, and transfers.',
  },
  {
    id: 'budgets',
    label: 'Budgets',
    icon: ChartNoAxesCombined,
    group: 'PLANNING',
    sub: 'Set monthly spending limits by category.',
  },
  {
    id: 'goals',
    label: 'Savings goals',
    icon: Target,
    group: '',
    sub: 'Set targets and track your contributions.',
  },
  {
    id: 'bills',
    label: 'Bills & subscriptions',
    icon: Repeat2,
    group: '',
    sub: 'Keep track of recurring payments and due dates.',
  },
  {
    id: 'insights',
    label: 'Insights',
    icon: ChartNoAxesCombined,
    group: 'TOOLS',
    sub: 'The patterns behind your everyday spending.',
  },
  {
    id: 'lab',
    label: 'Decision lab',
    icon: FlaskConical,
    group: '',
    sub: 'Explore the possibilities before you spend.',
  },
];
interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
const getPage = () => {
  const hash = window.location.hash.slice(1);
  return [...pages.map((p) => p.id), 'settings'].includes(hash) ? hash : 'overview';
};
function SearchDialog({
  onClose,
  navigate,
  onEdit,
}: {
  onClose: () => void;
  navigate: (p: string) => void;
  onEdit: (t: Entry) => void;
}) {
  const { w, money } = useFinance();
  const [q, setQ] = useState('');
  const transactions =
    q.length > 1
      ? w.transactions
          .filter((t) => `${t.merchant} ${t.note ?? ''}`.toLowerCase().includes(q.toLowerCase()))
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 6)
      : [];
  const destinations = [...pages, { id: 'settings', label: 'Settings', icon: SettingsIcon }].filter(
    (p) => !q || p.label.toLowerCase().includes(q.toLowerCase()),
  );
  const go = (id: string) => {
    navigate(id);
    onClose();
  };
  return (
    <Modal title="Search workspace" sub="Search transactions or jump to a page." onClose={onClose}>
      <div className="search-field palette-search">
        <Search size={19} />
        <input
          autoFocus
          aria-label="Search workspace"
          placeholder="Try a merchant, a note, or “goals”…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="command-results">
        {destinations.length > 0 && <span className="eyebrow">JUMP TO</span>}
        {destinations.map((p) => (
          <button key={p.id} onClick={() => go(p.id)}>
            <p.icon size={17} />
            <span>{p.label}</span>
            <ArrowUpRight size={14} />
          </button>
        ))}
        {transactions.length > 0 && <span className="eyebrow">TRANSACTIONS</span>}
        {transactions.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              onClose();
              onEdit(t);
            }}
          >
            <ArrowDownUp size={16} />
            <span>
              {t.merchant}
              <small>{t.date}</small>
            </span>
            <strong>{money(t.amount, true)}</strong>
          </button>
        ))}
        {q && !destinations.length && !transactions.length && (
          <p className="search-empty">Nothing found. Try another merchant, note, or page name.</p>
        )}
      </div>
      <div className="palette-foot">
        <span>
          <kbd>esc</kbd> to close
        </span>
        <span>
          Search your workspace records
          <ShieldCheck size={12} />
        </span>
      </div>
    </Modal>
  );
}
function WorkspaceApp() {
  const { w, storageError, notify } = useFinance();
  const { isPro, openPaywall } = useSubscription();
  const { isDark, toggle, style } = useTheme();
  const [page, setPage] = useState(getPage);
  const [month, setMonth] = useState(monthKey());
  const [online, setOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const [help, setHelp] = useState(false);
  const [studio, setStudio] = useState(false);
  const [transaction, setTransaction] = useState<{ entry?: Entry; draft?: Partial<Entry> } | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const navigate = (id: string) => {
    if (isProFeature(id) && !isPro) {
      setMobileOpen(false);
      openPaywall(id);
      return;
    }
    setPage(id);
    window.location.hash = id;
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  useEffect(() => {
    const onOnline = () => setOnline(navigator.onLine);
    const onInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as InstallPrompt);
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOnline);
    window.addEventListener('beforeinstallprompt', onInstall);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOnline);
      window.removeEventListener('beforeinstallprompt', onInstall);
    };
  }, []);
  useEffect(() => {
    const onHash = () => {
      setPage(getPage());
      setMobileOpen(false);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearch((s) => !s);
        return;
      }
      if (e.key === 'Escape') setMobileOpen(false);
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select, dialog') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setTransaction({});
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    document.title = `Spendwise · ${page === 'settings' ? 'Settings' : (pages.find((p) => p.id === page)?.label ?? 'Overview')}`;
  }, [page]);
  const currentPage = pages.find((p) => p.id === page);
  const onEdit = (t: Entry) => setTransaction({ entry: t });
  const due = w.bills.filter(
    (b) => new Date(`${b.nextDue}T12:00:00`).getTime() <= Date.now() + 7 * 86400000,
  ).length;
  const monthOptions = [
    ...new Set([
      monthKey(),
      ...w.transactions.map((t) => t.date.slice(0, 7)),
      ...Array.from({ length: 6 }, (_, i) =>
        monthKey(new Date(new Date().getFullYear(), new Date().getMonth() - i, 1)),
      ),
    ]),
  ]
    .sort()
    .reverse();
  const title = page === 'settings' ? 'Settings' : currentPage?.label;
  return (
    <div className="spendwise">
      <a
        className="skip-link"
        href="#workspace-content"
        onClick={(e) => {
          e.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Skip to content
      </a>
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate('overview')} aria-label="Spendwise home">
          <span>
            <Sprout size={25} strokeWidth={1.8} />
          </span>
          <strong>spendwise</strong>
        </button>
        <div className="workspace-switch">
          <span className="workspace-avatar">{w.profile.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{w.profile.name}’s workspace</strong>
            <small>{isPro ? 'Pro' : 'Free'} · on this device</small>
          </div>
        </div>
        <nav aria-label="Main navigation">
          {pages.map((p) => (
            <div key={p.id}>
              {p.group && <span className="nav-heading">{p.group}</span>}
              <button
                className={`nav-link ${page === p.id ? 'active' : ''}`}
                aria-current={page === p.id ? 'page' : undefined}
                onClick={() => navigate(p.id)}
              >
                <p.icon size={18} strokeWidth={1.7} />
                <span>{p.label}</span>
                {isProFeature(p.id) && !isPro && (
                  <LockKeyhole size={13} className="nav-lock" aria-label="Pro feature" />
                )}
                {p.id === 'bills' && due > 0 && <small className="nav-count">{due}</small>}
              </button>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={`nav-link ${page === 'settings' ? 'active' : ''}`}
            onClick={() => navigate('settings')}
            aria-current={page === 'settings' ? 'page' : undefined}
          >
            <SettingsIcon size={18} />
            <span>Settings</span>
          </button>
          <button className="nav-link" onClick={() => setHelp(true)}>
            <CircleHelp size={18} />
            <span>Help & shortcuts</span>
            <ArrowUpRight size={14} />
          </button>
          <div className="local-status">
            <HardDrive size={13} />
            Stored on this device
          </div>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="workspace-header">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span className="desktop-only">My workspace</span>
            <ChevronRight size={13} className="desktop-only" />
            <strong>{page === 'settings' ? 'Settings' : currentPage?.label}</strong>
          </div>
          <div className="header-actions">
            <button
              className="studio-trigger"
              aria-label="Open Style Studio"
              title="Personalize your workspace"
              onClick={() => setStudio(true)}
            >
              <Palette size={18} />
              <span>{STYLES.find((item) => item.id === style)?.name}</span>
              <ChevronDown size={13} />
            </button>
            <button className="header-search" aria-label="Search workspace" onClick={() => setSearch(true)}>
              <Search size={16} />
              <span>Search…</span>
              <kbd>
                <Command size={10} /> K
              </kbd>
            </button>
            <button
              className="icon-button"
              onClick={toggle}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <span className="header-divider" />
            <button className="button secondary plan-button" onClick={() => openPaywall()}>
              {isPro ? 'Pro' : 'Get Pro'}
            </button>
          </div>
        </header>
        <main id="workspace-content" ref={mainRef} tabIndex={-1} className="workspace-main">
          {!online && (
            <div className="offline-banner" role="status">
              <HardDrive size={15} />
              <span>You’re offline. Tracking and local saving still work. No connection needed.</span>
            </div>
          )}
          {storageError && (
            <div role="alert" className="storage-banner">
              Browser storage needs attention. Download a backup before leaving.{' '}
              <button onClick={() => navigate('settings')}>
                Manage data
                <ArrowRight size={13} />
              </button>
            </div>
          )}
          <div className="page-heading">
            <div>
              {page === 'overview' && (
                <span className="eyebrow heading-eyebrow">
                  <span className="tiny-dot" />
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
              )}
              <h1>{title}</h1>
              <p>
                {page === 'settings'
                  ? 'Manage your profile, categories, appearance, and data.'
                  : currentPage?.sub}
              </p>
            </div>
            <div className="heading-actions">
              {['overview', 'budgets', 'insights'].includes(page) && (
                <div className="month-picker">
                  <CalendarDays size={15} />
                  <select
                    aria-label="Selected month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                  >
                    {monthOptions.map((m) => (
                      <option key={m} value={m}>
                        {new Date(`${m}-02`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} />
                </div>
              )}
              <button
                className="button add-button"
                aria-label="Add transaction"
                onClick={() => setTransaction({})}
              >
                <Plus size={17} />
                <span>Add transaction</span>
              </button>
            </div>
          </div>
          {page === 'overview' && <Overview month={month} navigate={navigate} onEdit={onEdit} />}
          {page === 'transactions' && <Transactions onEdit={onEdit} onAdd={() => setTransaction({})} />}
          {page === 'analytics' && (
            <ProGate feature="analytics">
              <Analytics onEdit={onEdit} onAdd={() => setTransaction({})} />
            </ProGate>
          )}
          {page === 'accounts' && <Accounts />}
          {page === 'budgets' && (
            <ProGate feature="budgets">
              <Budgets month={month} />
            </ProGate>
          )}
          {page === 'goals' && (
            <ProGate feature="goals">
              <Goals />
            </ProGate>
          )}
          {page === 'bills' && (
            <ProGate feature="bills">
              <Bills />
            </ProGate>
          )}
          {page === 'insights' && (
            <ProGate feature="insights">
              <Insights month={month} onEdit={onEdit} navigate={navigate} />
            </ProGate>
          )}
          {page === 'lab' && (
            <ProGate feature="lab">
              <Lab onCapture={(draft) => setTransaction({ draft })} />
            </ProGate>
          )}
          {page === 'settings' && <Settings key={`${w.demo}-${w.profile.name}-${w.profile.currency}`} />}
          <footer className="workspace-footer">
            <span>
              <Sprout size={15} />
              Personal finance workspace
            </span>
            <div>
              {installPrompt && (
                <button
                  onClick={async () => {
                    try {
                      await installPrompt.prompt();
                      const choice = await installPrompt.userChoice;
                      if (choice.outcome === 'accepted') notify('Spendwise is ready for your home screen.');
                    } finally {
                      setInstallPrompt(null);
                    }
                  }}
                >
                  Install Spendwise
                  <Plus size={12} />
                </button>
              )}
              {w.demo && (
                <button onClick={() => navigate('settings')}>
                  Demo workspace
                  <ArrowUpRight size={11} />
                </button>
              )}
              <span>
                <ShieldCheck size={12} />
                Stored only on this device
              </span>
              <span>Spendwise © {new Date().getFullYear()}</span>
            </div>
          </footer>
        </main>
      </div>
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {['overview', 'transactions', 'analytics', 'accounts']
          .map((id) => pages.find((p) => p.id === id)!)
          .map((p) => (
            <button
              className={page === p.id ? 'active' : ''}
              aria-label={`${p.label}${!isPro && isProFeature(p.id) ? ' · Pro' : ''}`}
              key={p.id}
              onClick={() => navigate(p.id)}
              aria-current={page === p.id ? 'page' : undefined}
            >
              <p.icon size={20} />
              <span>
                {p.label}
                {!isPro && isProFeature(p.id) && (
                  <LockKeyhole size={9} className="mobile-pro-mark" aria-hidden="true" />
                )}
              </span>
            </button>
          ))}
        <button onClick={() => setMobileOpen(true)} aria-label="More pages">
          <Menu size={20} />
          <span>More</span>
        </button>
      </nav>
      {mobileOpen && (
        <Modal
          title="Your workspace"
          sub="Choose a section of your workspace."
          onClose={() => setMobileOpen(false)}
        >
          <nav className="mobile-page-list" aria-label="All pages">
            {[...pages, { id: 'settings', label: 'Settings', icon: SettingsIcon }].map((p) => (
              <button className={page === p.id ? 'active' : ''} key={p.id} onClick={() => navigate(p.id)}>
                <p.icon size={20} />
                <span>{p.label}</span>
                {page === p.id ? <Check size={16} /> : <ChevronRight size={16} />}
              </button>
            ))}
            <button
              onClick={() => {
                setMobileOpen(false);
                setHelp(true);
              }}
            >
              <CircleHelp size={19} />
              <span>Help & shortcuts</span>
              <ArrowUpRight size={16} />
            </button>
          </nav>
        </Modal>
      )}
      {studio && (
        <Modal
          title="Style Studio"
          sub="A different mood. The same Spendwise."
          wide
          onClose={() => setStudio(false)}
        >
          <ThemeStudio compact />
        </Modal>
      )}
      {search && <SearchDialog onClose={() => setSearch(false)} navigate={navigate} onEdit={onEdit} />}
      {transaction && (
        <TransactionForm
          entry={transaction.entry}
          draft={transaction.draft}
          onClose={() => setTransaction(null)}
        />
      )}
      {help && (
        <Modal
          title="Help & shortcuts"
          sub="Capture, planning, backups, and account sync."
          onClose={() => setHelp(false)}
          wide
        >
          <div className="help-grid">
            <div>
              <span>01</span>
              <h3>Make it your own</h3>
              <p>
                Set your preferred currency and income plan in Settings, and manage your manual money accounts
                in Accounts.
              </p>
            </div>
            <div>
              <span>02</span>
              <h3>Record transactions</h3>
              <p>
                Add income and expenses. Try Quick capture: “Coffee 6.50 yesterday”. Review the suggested
                details before saving.
              </p>
            </div>
            <div>
              <span>03</span>
              <h3>Give your money direction</h3>
              <p>
                Set monthly category budgets, create savings goals, and schedule your bills. Goals are
                earmarks, not account transfers.
              </p>
            </div>
            <div>
              <span>04</span>
              <h3>Make a thoughtful choice</h3>
              <p>
                Use the Decision Lab to preview a purchase, see its work-hour cost, or save it in your 24-hour
                pause pocket.
              </p>
            </div>
            <div>
              <span>05</span>
              <h3>Take your data with you</h3>
              <p>
                Download a full JSON backup in Settings. Export filtered transactions as CSV. Backups can be
                restored on another device.
              </p>
            </div>
            <div>
              <span>⌘</span>
              <h3>Keyboard shortcuts</h3>
              <p>
                <kbd>Ctrl / ⌘ K</kbd> Search your workspace
                <br />
                <kbd>N</kbd> New transaction
                <br />
                <kbd>Esc</kbd> Close a dialog
              </p>
            </div>
          </div>
          <div className="info-note">
            <ShieldCheck size={19} />
            <p>
              All financial records are stored on this device. No sign-up, cloud sync, bank connection, or
              automatic payment is included. Use a trusted device and keep backups; clearing storage or
              uninstalling can remove your records. Local records and exports are not application-encrypted.
            </p>
          </div>
          <div className="form-actions">
            <button className="button" onClick={() => setHelp(false)}>
              I’ve got this
              <Sparkles size={15} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
export default function App() {
  return (
    <ThemeProvider>
      <FinanceProvider>
        <SubscriptionProvider>
          <NativeLifecycle />
          <FirstRun>
            <WorkspaceApp />
          </FirstRun>
        </SubscriptionProvider>
      </FinanceProvider>
    </ThemeProvider>
  );
}
