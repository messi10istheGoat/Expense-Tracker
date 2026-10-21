import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { download, makeWorkspace } from '../finance/model';
import { FinanceProvider } from '../finance/store';
import { cloudConfigured, repository, supabase } from './client';
import { SyncEngine, type SyncSnapshot } from './sync';
import { WorkspaceLease } from './WorkspaceLease';
import { AuthScreen } from './AuthScreen';
import { NativeLifecycle } from '../platform/native';
interface AccountContext {
  session: Session | null;
  demo: boolean;
  configured: boolean;
  openLogin: () => void;
  signOut: () => Promise<void>;
  sync: SyncSnapshot | null;
  engine: SyncEngine | null;
  recovery: boolean;
  finishRecovery: () => void;
}
const Context = createContext<AccountContext | null>(null);
export const useAccount = () => {
  const value = useContext(Context);
  if (!value) throw new Error('Account provider missing');
  return value;
};
export function AccountProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null),
    [loading, setLoading] = useState(cloudConfigured),
    [demo, setDemo] = useState(!cloudConfigured),
    [login, setLogin] = useState(false),
    [recovery, setRecovery] = useState(false);
  const eventVersion = useRef(0);
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      eventVersion.current++;
      if (!alive) return;
      setSession(next);
      setLoading(false);
      if (next) {
        setDemo(false);
        setLogin(false);
      }
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') setRecovery(false);
    });
    const version = eventVersion.current;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (alive && version === eventVersion.current) {
          setSession(error ? null : data.session);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  const base = {
    session,
    demo,
    configured: cloudConfigured,
    openLogin: () => setLogin(true),
    signOut: async () => {
      if (!supabase) return;
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      setSession(null);
      setDemo(false);
      setLogin(false);
    },
    sync: null,
    engine: null,
    recovery,
    finishRecovery: () => setRecovery(false),
  };
  if (loading)
    return (
      <div className="account-loading" role="status">
        Loading your account…
      </div>
    );
  if (session && recovery)
    return (
      <Context.Provider value={base}>
        <NativeLifecycle />
        <AuthScreen
          onDemo={() => {
            void base.signOut();
          }}
        />
      </Context.Provider>
    );
  if (session)
    return (
      <Context.Provider value={base}>
        <NativeLifecycle />
        <WorkspaceLease key={session.user.id} userId={session.user.id}>
          <CloudWorkspace session={session}>{children}</CloudWorkspace>
        </WorkspaceLease>
      </Context.Provider>
    );
  return (
    <Context.Provider value={base}>
      <NativeLifecycle />
      {demo && !login ? (
        <FinanceProvider>{children}</FinanceProvider>
      ) : (
        <AuthScreen
          onDemo={() => {
            setDemo(true);
            setLogin(false);
          }}
        />
      )}
    </Context.Provider>
  );
}
function CloudWorkspace({ session, children }: { session: Session; children: ReactNode }) {
  const parent = useAccount();
  // One cloud engine per mount/user; data never falls back to another user's or demo storage.
  const [engine, setEngine] = useState<SyncEngine | null>(null);
  useEffect(() => {
    const initial = makeWorkspace(false);
    const name = session.user.user_metadata?.display_name;
    if (typeof name === 'string' && name.trim()) initial.profile.name = name.trim().slice(0, 60);
    const next = new SyncEngine(
      repository(session.user.id),
      initial,
      {
        getItem: (k) => localStorage.getItem(k),
        setItem: (k, v) => localStorage.setItem(k, v),
        removeItem: (k) => localStorage.removeItem(k),
      },
      `spendwise-outbox-v1:${session.user.id}`,
    );
    setEngine(next);
    const start = setTimeout(() => void next.start(), 0);
    const timer = setInterval(() => void next.sync(), 15000);
    const refresh = () => {
      if (!document.hidden) void next.sync();
    };
    window.addEventListener('online', refresh);
    window.addEventListener('spendwise:resume', refresh);
    document.addEventListener('visibilitychange', refresh);
    const unload = (e: BeforeUnloadEvent) => {
      if (next.hasPending()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', unload);
    const exit = (e: Event) => {
      if (
        next.hasPending() &&
        !window.confirm(
          'Close with changes waiting to sync? They can only be recovered if device storage is available. Keep Spendwise open to finish syncing.',
        )
      )
        e.preventDefault();
    };
    window.addEventListener('spendwise:before-exit', exit);
    return () => {
      next.dispose();
      clearTimeout(start);
      clearInterval(timer);
      window.removeEventListener('online', refresh);
      window.removeEventListener('spendwise:resume', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('beforeunload', unload);
      window.removeEventListener('spendwise:before-exit', exit);
    };
  }, [session.user.id]);
  if (!engine)
    return (
      <div className="account-loading" role="status">
        Opening your workspace…
      </div>
    );
  return (
    <EngineWorkspace engine={engine} parent={parent}>
      {children}
    </EngineWorkspace>
  );
}
function EngineWorkspace({
  engine,
  parent,
  children,
}: {
  engine: SyncEngine;
  parent: AccountContext;
  children: ReactNode;
}) {
  const sync = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  const [error, setError] = useState('');
  const value = {
    ...parent,
    engine,
    sync,
    signOut: async () => {
      await parent.signOut();
      engine.clearRecovery();
    },
  };
  if (!sync.ready)
    return (
      <Context.Provider value={value}>
        <div className="account-loading cloud-loading-page">
          <h1>{sync.status === 'error' ? 'Cannot open your cloud workspace' : 'Opening your workspace'}</h1>
          <p role="status">{sync.error || 'Checking your account and loading saved records.'}</p>
          {error && <p role="alert">{error}</p>}
          {sync.recoveryBlocked && (
            <>
              <button
                className="button secondary"
                onClick={() => {
                  try {
                    download('spendwise-raw-account-recovery.json', engine.recoveryText() ?? '{}');
                  } catch {
                    setError('Storage access is blocked. Enable it to recover your file.');
                  }
                }}
              >
                Export raw recovery file
              </button>
              <button
                className="button danger"
                onClick={() => {
                  if (
                    window.confirm(
                      'Discard this unreadable device recovery file and load the cloud version? Unsynced edits may be lost. Export the file first.',
                    )
                  )
                    void engine.discardRecovery();
                }}
              >
                Discard device recovery and load cloud
              </button>
            </>
          )}
          <button className="button" disabled={sync.recoveryBlocked} onClick={() => void engine.sync()}>
            Retry
          </button>
          <button
            className="button secondary"
            onClick={() => {
              if (
                !engine.hasPending() ||
                window.confirm('Sign out and discard this device’s unsynced recovery file?')
              )
                void value.signOut().catch(() => setError('Could not sign out. Please try again.'));
            }}
          >
            Sign out
          </button>
        </div>
      </Context.Provider>
    );
  return (
    <Context.Provider value={value}>
      <FinanceProvider initial={sync.workspace} externalVersion={sync.generation} onChange={engine.change}>
        {children}
      </FinanceProvider>
    </Context.Provider>
  );
}
