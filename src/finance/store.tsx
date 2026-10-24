import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { makeWorkspace, STORAGE_KEY, validateWorkspace, type Workspace } from './model';
import { freshWorkspace } from '../product/local';
import { legacyTestMode } from '../product/features';
import { addCategory, catalogMaps } from './catalog';
import type { TxType } from '../lib/types';
interface FinanceContext extends ReturnType<typeof catalogMaps> {
  w: Workspace;
  update: (fn: (w: Workspace) => Workspace, options?: { replaceUnreadable?: boolean }) => boolean;
  notify: (message: string) => void;
  createCategory: (name: string, type: TxType) => string;
  money: (amount: number, decimals?: boolean) => string;
  storageError: boolean;
  saveError: () => string;
  undo: () => void;
  canUndo: boolean;
}
const Context = createContext<FinanceContext | null>(null);
export function FinanceProvider({ children }: { children: ReactNode }) {
  const [storageError, setStorageError] = useState(false);
  const unreadable = useRef(false);
  const [w, setW] = useState<Workspace>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return validateWorkspace(JSON.parse(raw));
    } catch {
      unreadable.current = true;
    }
    return legacyTestMode ? { ...makeWorkspace(), onboardingComplete: true } : freshWorkspace();
  });
  const current = useRef(w),
    dirty = useRef(false),
    fromAnotherTab = useRef(false),
    error = useRef('');
  const history = useRef<Workspace[]>([]);
  const [toast, setToast] = useState('');
  const notify = useCallback((s: string) => setToast(s), []);
  const update = useCallback(
    (fn: (w: Workspace) => Workspace, options?: { replaceUnreadable?: boolean }) => {
      try {
        if (unreadable.current && !options?.replaceUnreadable)
          throw new Error(
            'Stored data could not be read. Download the raw recovery file, then explicitly restore a backup or start an empty workspace.',
          );
        const before = current.current,
          after = validateWorkspace(fn(before));
        if (options?.replaceUnreadable) unreadable.current = false;
        history.current = [...history.current.slice(-9), before];
        current.current = after;
        dirty.current = true;
        fromAnotherTab.current = false;
        setW(after);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(after));
          setStorageError(false);
        } catch {
          setStorageError(true);
        }
        return true;
      } catch (e) {
        error.current = e instanceof Error ? e.message : 'Could not save this change.';
        notify(error.current);
        return false;
      }
    },
    [notify],
  );
  const createCategory = useCallback(
    (name: string, type: TxType) => {
      const next = addCategory(current.current, name, type);
      if (next.w !== current.current && !update(() => next.w)) throw new Error(error.current);
      return next.id;
    },
    [update],
  );
  const undo = useCallback(() => {
    const before = history.current.pop();
    if (!before) return;
    current.current = before;
    dirty.current = true;
    fromAnotherTab.current = false;
    setW(before);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(before));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
    notify('Last change undone.');
  }, [notify]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 6000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (unreadable.current && !dirty.current) {
      setStorageError(true);
      return;
    }
    if (fromAnotherTab.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(w));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [w]);
  useEffect(() => {
    const listener = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue)
        try {
          const next = validateWorkspace(JSON.parse(e.newValue));
          current.current = next;
          history.current = [];
          fromAnotherTab.current = true;
          unreadable.current = false;
          setW(next);
          notify('Workspace updated from another tab.');
        } catch {
          setStorageError(true);
        }
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }, [notify]);
  useEffect(() => {
    const handler = (e: Event) => notify((e as CustomEvent<string>).detail);
    window.addEventListener('spendwise:export-error', handler);
    return () => window.removeEventListener('spendwise:export-error', handler);
  }, [notify]);
  useEffect(() => {
    const guard = (e: Event) => {
      if (storageError && dirty.current) {
        if (e.type === 'beforeunload') {
          e.preventDefault();
          (e as BeforeUnloadEvent).returnValue = '';
        } else if (
          !window.confirm(
            'Your latest changes could not be saved on this device. Export a backup before closing. Close anyway?',
          )
        )
          e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', guard);
    window.addEventListener('spendwise:before-exit', guard);
    return () => {
      window.removeEventListener('beforeunload', guard);
      window.removeEventListener('spendwise:before-exit', guard);
    };
  }, [storageError]);
  const maps = useMemo(() => catalogMaps(w), [w.categories, w.accounts]);
  const money = useCallback(
    (n: number, decimals = false) =>
      new Intl.NumberFormat(w.profile.currency === 'BDT' ? 'en-BD' : 'en-US', {
        style: 'currency',
        currency: w.profile.currency,
        maximumFractionDigits: decimals ? 2 : 0,
        minimumFractionDigits: decimals ? 2 : 0,
      }).format(Math.abs(n) < 0.005 ? 0 : n),
    [w.profile.currency],
  );
  return (
    <Context.Provider
      value={{
        w,
        update,
        notify,
        createCategory,
        money,
        storageError,
        ...maps,
        saveError: () => error.current,
        undo,
        canUndo: history.current.length > 0,
      }}
    >
      {children}
      {toast && (
        <div className="toast" role="status">
          <span aria-hidden="true">✓</span>
          <div className="toast-copy">{toast}</div>
          {history.current.length > 0 && (
            <button className="undo-toast" onClick={undo}>
              Undo
            </button>
          )}
          <button aria-label="Dismiss notification" onClick={() => setToast('')}>
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export function useFinance() {
  const c = useContext(Context);
  if (!c) throw new Error('Finance provider missing');
  return c;
}
