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
  Flower2,
  HardDrive,
  LayoutDashboard,
  Leaf,
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
} from 'lucide-react';
import { ThemeProvider, useTheme } from './hooks/useTheme';
import { FinanceProvider, useFinance } from './finance/store';
import { monthKey, type Entry } from './finance/model';
import { Overview } from './finance/Overview';
import { TransactionForm, Transactions } from './finance/Transactions';
import { Accounts, Bills, Budgets, Goals } from './finance/Planning';
import { Insights } from './finance/Insights';
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
    group: 'YOUR WORKSPACE',
    sub: 'A little clarity for your everyday.',
  },
  {
    id: 'transactions',
    label: 'Transactions',
    icon: ArrowDownUp,
    group: '',
    sub: 'Every money moment, all in one place.',
  },
  {
    id: 'accounts',
    label: 'Accounts',
    icon: Wallet,
    group: '',
    sub: 'The bigger picture, without the guesswork.',
  },
  {
    id: 'budgets',
    label: 'Budgets',
    icon: ChartNoAxesCombined,
    group: 'MAKE ROOM FOR MORE',
    sub: 'A thoughtful plan for the way you live.',
  },
  {
    id: 'goals',
    label: 'Savings goals',
    icon: Target,
    group: '',
    sub: 'For the things you can’t wait to make happen.',
  },
  {
    id: 'bills',
    label: 'Bills & subscriptions',
    icon: Repeat2,
    group: '',
    sub: 'A little foresight goes a long way.',
  },
  {
    id: 'insights',
    label: 'Insights',
    icon: ChartNoAxesCombined,
    group: 'A FRESH PERSPECTIVE',
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
    <Modal title="Find a little clarity" sub="Search transactions or jump to a page." onClose={onClose}>
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
        {transactions.length > 0 && <span className="eyebrow">MONEY MOMENTS</span>}
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
          Your data never leaves this device
          <ShieldCheck size={12} />
        </span>
      </div>
    </Modal>
  );
}
function WorkspaceApp() {
  const { w, storageError, notify } = useFinance();
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
  const title =
    page === 'overview'
      ? `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${w.profile.name}`
      : page === 'settings'
        ? 'Your little corner'
        : currentPage?.label;
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
          <strong>
            spendwise<span>®</span>
          </strong>
        </button>
        <div className="workspace-switch">
          <span className="workspace-avatar">{w.profile.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>My workspace</strong>
            <small>{w.demo ? 'Demo workspace' : 'On this device'}</small>
          </div>
          <Leaf size={14} />
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
                {p.id === 'lab' && <small className="new-badge">NEW</small>}
                {p.id === 'bills' && due > 0 && <small className="nav-count">{due}</small>}
              </button>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-inspiration">
            <Flower2 size={27} strokeWidth={1.5} />
            <strong>Good things take a little growing.</strong>
            <p>Give your next chapter a head start.</p>
            <button onClick={() => navigate('goals')}>
              Plant a savings goal
              <ArrowUpRight size={14} />
            </button>
          </div>
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
            <span>A little help</span>
            <ArrowUpRight size={14} />
          </button>
          <div className="local-status">
            <span className={storageError ? 'error-dot' : 'status-dot'} />
            {storageError ? 'Storage needs attention' : 'Saved on this device'}
            <HardDrive size={12} />
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
              <span>Find anything…</span>
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
            <button
              className="profile-avatar"
              onClick={() => navigate('settings')}
              aria-label="Open profile settings"
            >
              {w.profile.name.slice(0, 1).toUpperCase()}
            </button>
          </div>
        </header>
        <main id="workspace-content" ref={mainRef} tabIndex={-1} className="workspace-main">
          {!online && (
            <div className="offline-banner" role="status">
              <HardDrive size={15} />
              <span>You’re offline. Your records still work here and save on this device.</span>
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
              <h1>
                {title}
                {page === 'overview' && <span className="greeting-leaf">✳</span>}
              </h1>
              <p>{page === 'settings' ? 'Make Spendwise feel a little more like you.' : currentPage?.sub}</p>
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
          {page === 'accounts' && <Accounts />}
          {page === 'budgets' && <Budgets month={month} />}
          {page === 'goals' && <Goals />}
          {page === 'bills' && <Bills />}
          {page === 'insights' && <Insights month={month} onEdit={onEdit} navigate={navigate} />}
          {page === 'lab' && <Lab onCapture={(draft) => setTransaction({ draft })} />}
          {page === 'settings' && <Settings key={`${w.demo}-${w.profile.name}-${w.profile.currency}`} />}
          <footer className="workspace-footer">
            <span>
              <Sprout size={15} />
              Made for a life well spent.
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
                Local-first. Always yours.
              </span>
              <span>Spendwise © {new Date().getFullYear()}</span>
            </div>
          </footer>
        </main>
      </div>
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {[pages[0], pages[1], pages[3], pages[7]].map((p) => (
          <button
            className={page === p.id ? 'active' : ''}
            key={p.id}
            onClick={() => navigate(p.id)}
            aria-current={page === p.id ? 'page' : undefined}
          >
            <p.icon size={20} />
            <span>{p.id === 'lab' ? 'Decision lab' : p.label}</span>
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
          sub="A little room for every part of your plan."
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
              <span>A little help</span>
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
          title="A little help goes a long way"
          sub="Welcome to a more intentional relationship with money."
          onClose={() => setHelp(false)}
          wide
        >
          <div className="help-grid">
            <div>
              <span>01</span>
              <h3>Make it your own</h3>
              <p>
                Explore the demo, then start an empty workspace in Settings. Set your income plan and account
                opening balances.
              </p>
            </div>
            <div>
              <span>02</span>
              <h3>Capture the little things</h3>
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
              <h3>Little shortcuts</h3>
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
              No banks are connected. There is no cloud sync, sign-in, or automatic bill payment. Records live
              in this browser; clearing storage removes them. Keep backups and use a trusted device.
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
        <WorkspaceApp />
      </FinanceProvider>
    </ThemeProvider>
  );
}
