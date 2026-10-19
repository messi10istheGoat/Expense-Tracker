import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { makeWorkspace, STORAGE_KEY, validateWorkspace, type Workspace } from './model';

interface FinanceContext {
  w: Workspace;
  update: (fn: (current: Workspace) => Workspace) => void;
  notify: (message: string) => void;
  money: (amount: number, decimals?: boolean) => string;
  storageError: boolean;
}
const Context = createContext<FinanceContext | null>(null);
export function FinanceProvider({ children }: { children: ReactNode }) {
  const [storageError, setStorageError] = useState(false);
  const [loadError] = useState(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v) validateWorkspace(JSON.parse(v));
      return false;
    } catch {
      return true;
    }
  });
  const [w, setW] = useState<Workspace>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return validateWorkspace(JSON.parse(raw));
    } catch {
      /* keep broken storage untouched until the user explicitly changes data */
    }
    return makeWorkspace();
  });
  const [toast, setToast] = useState('');
  const dirty = useRef(false);
  const notify = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    if (loadError && !dirty.current) {
      setStorageError(true);
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(w));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [w, loadError]);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setW(validateWorkspace(JSON.parse(e.newValue)));
          notify('Workspace updated from another tab.');
        } catch {
          setStorageError(true);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [notify]);
  const update = useCallback((fn: (current: Workspace) => Workspace) => {
    dirty.current = true;
    setW((current) => fn(current));
  }, []);
  const money = useCallback(
    (amount: number, decimals = false) =>
      new Intl.NumberFormat(w.profile.currency === 'BDT' ? 'en-BD' : 'en-US', {
        style: 'currency',
        currency: w.profile.currency,
        maximumFractionDigits: decimals ? 2 : 0,
        minimumFractionDigits: decimals ? 2 : 0,
      }).format(Math.abs(amount) < 0.005 ? 0 : amount),
    [w.profile.currency],
  );
  return (
    <Context.Provider value={{ w, update, notify, money, storageError }}>
      {children}
      {toast && (
        <div className="toast" role="status">
          <span>✓</span>
          {toast}
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
