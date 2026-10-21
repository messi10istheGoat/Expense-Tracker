import { useEffect, useState, type ReactNode } from 'react';
/** One durable outbox writer per user/browser profile. Separate devices use server CAS. */
export function WorkspaceLease({ userId, children }: { userId: string; children: ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'active' | 'blocked' | 'unsupported'>('checking'),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let stopped = false,
      release: (() => void) | undefined;
    setStatus('checking');
    if (!navigator.locks) {
      setStatus('unsupported');
      return;
    }
    const controller = new AbortController();
    // Queue (with cancellation), rather than ifAvailable: StrictMode cleanup can still
    // be releasing the previous lease when the next effect starts.
    const blocked = setTimeout(() => {
      if (!stopped) setStatus('blocked');
    }, 250);
    void navigator.locks
      .request(`spendwise-workspace:${userId}`, { signal: controller.signal }, async (lock) => {
        clearTimeout(blocked);
        if (stopped || !lock) return;
        setStatus('active');
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      })
      .catch(() => {
        if (!stopped && !controller.signal.aborted) {
          clearTimeout(blocked);
          setStatus('unsupported');
        }
      });
    return () => {
      stopped = true;
      clearTimeout(blocked);
      controller.abort();
      release?.();
    };
  }, [userId, attempt]);
  if (status === 'active') return children;
  return (
    <main className="account-loading">
      <h1>
        {status === 'checking'
          ? 'Opening your workspace'
          : status === 'blocked'
            ? 'Spendwise is open in another tab'
            : 'A secure browser connection is required'}
      </h1>
      <p>
        {status === 'checking'
          ? 'Checking this device’s workspace access…'
          : status === 'blocked'
            ? 'To protect unsynced records, only one tab can edit this account at a time in the same browser profile. Use the other tab, or close it to open this workspace here automatically. Other devices can still use cloud sync.'
            : 'Open Spendwise over HTTPS in a current browser with Web Locks support. This protects your device recovery file from concurrent tab writes.'}
      </p>
      {status !== 'checking' && (
        <button className="button" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </button>
      )}
    </main>
  );
}
