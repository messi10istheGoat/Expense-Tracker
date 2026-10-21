import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { makeWorkspace, STORAGE_KEY, validateWorkspace, type Workspace } from './model';
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
export function FinanceProvider({
  children,
  initial,
  onChange,
  externalVersion,
}: {
  children: ReactNode;
  initial?: Workspace;
  onChange?: (w: Workspace) => void;
  externalVersion?: number;
}) {
  const [storageError, setStorageError] = useState(false);
  const unreadable = useRef(false);
  const [w, setW] = useState<Workspace>(() => {
    if (initial) return initial;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return validateWorkspace(JSON.parse(raw));
    } catch {
      unreadable.current = true;
    }
    return makeWorkspace();
  });
  const current = useRef(w),
    dirty = useRef(false),
    remote = useRef(false),
    error = useRef('');
  const history = useRef<Workspace[]>([]);
  const appliedVersion = useRef(externalVersion);
  useLayoutEffect(() => {
    if (initial && externalVersion !== appliedVersion.current) {
      appliedVersion.current = externalVersion;
      current.current = initial;
      history.current = [];
      dirty.current = false;
      setW(initial);
    }
  }, [initial, externalVersion]);
  const [toast, setToast] = useState('');
  const notify = useCallback((s: string) => setToast(s), []);
  const update = useCallback(
    (fn: (w: Workspace) => Workspace, options?: { replaceUnreadable?: boolean }) => {
      try {
        if (unreadable.current && !options?.replaceUnreadable)
          throw new Error(
            'Stored data could not be read. Recover the raw file in Settings, then explicitly restore a backup or start an empty workspace.',
          );
        const before = current.current,
          after = validateWorkspace(fn(before));
        if (onChange && after.demo)
          throw new Error('Sample workspaces cannot be saved to a customer account. Use the separate demo.');
        onChange?.(after);
        if (options?.replaceUnreadable) unreadable.current = false;
        history.current = [...history.current.slice(-9), before];
        current.current = after;
        dirty.current = true;
        remote.current = false;
        setW(after);
        return true;
      } catch (e) {
        error.current = e instanceof Error ? e.message : 'Could not save this change.';
        notify(error.current);
        return false;
      }
    },
    [notify, onChange],
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
    onChange?.(before);
    current.current = before;
    dirty.current = true;
    remote.current = false;
    setW(before);
    notify('Last change undone.');
  }, [notify, onChange]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 6000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (onChange) return;
    if (unreadable.current && !dirty.current) {
      setStorageError(true);
      return;
    }
    if (remote.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(w));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [w, onChange]);
  useEffect(() => {
    if (onChange) return;
    const listener = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue)
        try {
          const next = validateWorkspace(JSON.parse(e.newValue));
          current.current = next;
          history.current = [];
          remote.current = true;
          unreadable.current = false;
          setW(next);
          notify('Workspace updated from another tab.');
        } catch {
          setStorageError(true);
        }
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }, [notify, onChange]);
  useEffect(() => {
    const handler = (e: Event) => notify((e as CustomEvent<string>).detail);
    window.addEventListener('spendwise:export-error', handler);
    return () => window.removeEventListener('spendwise:export-error', handler);
  }, [notify]);
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
