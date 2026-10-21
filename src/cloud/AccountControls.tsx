import { useState } from 'react';
import { Cloud, LogIn, RefreshCw, LogOut, TriangleAlert, UserRound } from 'lucide-react';
import { useAccount } from './CloudProvider';
import { supabase } from './client';
import { useFinance } from '../finance/store';
import { download, iso } from '../finance/model';
import { Modal } from '../finance/ui';
const labels = {
  loading: 'Loading',
  saved: 'Saved to cloud',
  saving: 'Syncing…',
  pending: 'Changes pending',
  offline: 'Not synced',
  conflict: 'Sync conflict',
  error: 'Sync unavailable',
};
export function CloudStatus() {
  const { session, sync, openLogin } = useAccount();
  const { w } = useFinance();
  return (
    <button
      className={`cloud-status${sync?.status === 'conflict' || sync?.status === 'offline' ? ' needs-attention' : ''}`}
      onClick={() => (session ? void window.dispatchEvent(new Event('spendwise:open-account')) : openLogin())}
    >
      <Cloud size={14} />
      <span>
        {session && sync
          ? labels[sync.status]
          : w.demo
            ? 'Demo · this browser only'
            : 'Local workspace · this browser'}
      </span>
    </button>
  );
}
export function AccountControls() {
  const account = useAccount();
  const { w, notify } = useFinance();
  const [panel, setPanel] = useState<'account' | 'conflict' | 'delete' | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [confirm, setConfirm] = useState(''),
    [discard, setDiscard] = useState(false);
  // Event listener is attached by a small shared hook below; no DOM is used as an application state store.
  useAccountShortcut(() => {
    setPanel(account.sync?.conflict ? 'conflict' : 'account');
    setError('');
    setDiscard(false);
  });
  const signOut = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await account.signOut();
    } catch {
      setError('Could not sign out. Please retry.');
    } finally {
      setBusy(false);
    }
  };
  if (!account.session)
    return (
      <button className="button secondary sign-in-button" onClick={account.openLogin}>
        <LogIn size={15} />
        <span>Sign in</span>
      </button>
    );
  const conflict = account.sync?.conflict;
  return (
    <>
      <button
        className="icon-button"
        aria-label="Open account"
        onClick={() => {
          setPanel('account');
          setError('');
        }}
      >
        <UserRound size={18} />
      </button>
      {panel === 'account' && (
        <Modal title="Your account" sub={account.session.user.email} onClose={() => setPanel(null)}>
          <div className="account-sync-card">
            <Cloud size={20} />
            <div>
              <strong>{account.sync ? labels[account.sync.status] : 'Loading'}</strong>
              <p>
                {account.sync?.status === 'saved'
                  ? 'Your records are saved to your account. Other signed-in devices check for changes every 15 seconds and when the app resumes.'
                  : account.sync?.error || 'Keep this app open until changes finish syncing.'}
              </p>
            </div>
            <button
              className="icon-button"
              aria-label="Retry sync"
              onClick={() => void account.engine?.sync()}
            >
              <RefreshCw size={17} />
            </button>
          </div>
          {account.sync?.recoveryError && (
            <p className="form-error" role="alert">
              Recovery storage is unavailable. Keep this tab open and export a backup before leaving.
            </p>
          )}
          {conflict && (
            <button className="button secondary" onClick={() => setPanel('conflict')}>
              Review sync conflict
            </button>
          )}
          <button
            className="button secondary account-backup"
            onClick={() => download(`spendwise-backup-${iso()}.json`, JSON.stringify(w, null, 2))}
          >
            Download a backup
          </button>
          {account.engine?.hasPending() && (
            <label className="check-label">
              <input type="checkbox" checked={discard} onChange={(e) => setDiscard(e.target.checked)} />I
              understand signing out will discard unsynced changes on this device. I have backed up anything I
              need.
            </label>
          )}
          <p className="form-hint">
            Cached records and pending changes are stored on this device without application-level encryption.
            Sign out on shared devices. Signing out clears this account’s cached records and recovery file,
            not its saved cloud records.
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button
              className="text-button account-delete-link"
              onClick={() => {
                setPanel('delete');
                setConfirm('');
                setError('');
              }}
            >
              Delete account
            </button>
            <button
              className="button secondary"
              disabled={busy || (!!account.engine?.hasPending() && !discard)}
              onClick={() => void signOut()}
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </Modal>
      )}
      {panel === 'conflict' && conflict && (
        <Modal
          title="Choose which records to keep"
          sub="Another device saved changes. No version has been silently overwritten."
          onClose={() => setPanel(null)}
        >
          <div className="sync-conflict-versions">
            {[
              { title: 'This device', value: w },
              { title: 'Cloud version', value: conflict.workspace },
            ].map(({ title, value }) => (
              <section key={title}>
                <strong>{title}</strong>
                <p>
                  {value.transactions.length} transactions · {value.accounts.length} accounts
                </p>
                <button
                  className="text-button"
                  onClick={() =>
                    download(
                      `spendwise-${title === 'Cloud version' ? 'cloud' : 'device'}-${iso()}.json`,
                      JSON.stringify(value, null, 2),
                    )
                  }
                >
                  Download this version
                </button>
              </section>
            ))}
          </div>
          <p className="form-hint">
            Choose the cloud version to discard this device’s unsynced edits. Choose this device to replace
            the cloud version with its records. Download both if you need to reconcile them manually.
          </p>
          <label className="check-label">
            <input type="checkbox" checked={discard} onChange={(e) => setDiscard(e.target.checked)} />I have
            reviewed both versions and understand one will replace the other.
          </label>
          <div className="form-actions">
            <button
              className="button secondary"
              disabled={!discard}
              onClick={() => {
                account.engine?.resolve('cloud');
                setPanel(null);
              }}
            >
              Use cloud version
            </button>
            <button
              className="button"
              disabled={!discard}
              onClick={() => {
                account.engine?.resolve('device');
                setPanel(null);
              }}
            >
              Use this device
            </button>
          </div>
        </Modal>
      )}
      {panel === 'delete' && (
        <Modal
          title="Delete your account permanently?"
          sub="This removes your sign-in and all cloud financial records. This cannot be undone."
          onClose={() => setPanel(null)}
        >
          <p className="form-hint">
            Download a backup first. Data previously exported or copied to other devices is not remotely
            erased. This device’s recovery file is cleared after deletion succeeds.
          </p>
          <button
            className="button secondary account-backup"
            onClick={() => download(`spendwise-backup-${iso()}.json`, JSON.stringify(w, null, 2))}
          >
            Download backup first
          </button>
          <label>
            Type DELETE to confirm
            <input value={confirm} autoComplete="off" onChange={(e) => setConfirm(e.target.value)} />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button className="button secondary" onClick={() => setPanel('account')}>
              Keep account
            </button>
            <button
              className="button danger"
              disabled={confirm !== 'DELETE' || busy}
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  const { error } = await supabase!.functions.invoke('delete-account', {
                    body: { confirmation: 'DELETE' },
                  });
                  if (error) throw error;
                  await account.signOut();
                  notify('Account deleted.');
                } catch {
                  setError('Deletion did not complete. Retry or contact support.');
                } finally {
                  setBusy(false);
                }
              }}
            >
              <TriangleAlert size={16} />
              Delete account
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
import { useEffect, useRef } from 'react';
function useAccountShortcut(callback: () => void) {
  const ref = useRef(callback);
  ref.current = callback;
  useEffect(() => {
    const fn = () => ref.current();
    window.addEventListener('spendwise:open-account', fn);
    return () => window.removeEventListener('spendwise:open-account', fn);
  }, []);
}
