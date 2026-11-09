import { useState } from 'react';
import { Capacitor } from '@capacitor/core';

type TokenResponse = { access_token?: string; error?: string };
type GoogleAccounts = {
  oauth2: {
    initTokenClient: (config: {
      client_id: string;
      scope: string;
      callback: (response: TokenResponse) => void;
      error_callback: () => void;
    }) => { requestAccessToken: () => void };
  };
};
declare global {
  interface Window { google?: { accounts: GoogleAccounts } }
}

let scriptPromise: Promise<void> | undefined;
function loadGoogle() {
  if (window.google?.accounts.oauth2) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => { script.remove(); reject(new Error('Google could not be loaded. Check your connection and try again.')); };
      document.head.appendChild(script);
    }).catch((error: unknown) => { scriptPromise = undefined; throw error; });
  }
  return scriptPromise;
}

/** Optional profile import, not an authentication or cloud account system. */
export function GoogleProfile({ onName }: { onName: (name: string) => void }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const connect = async () => {
    if (!clientId) { setMessage('Google setup is not configured yet. You can continue with a local profile.'); return; }
    if (Capacitor.isNativePlatform()) { setMessage('Google profile import is available on the web only. Continue with a local profile here.'); return; }
    setBusy(true);
    setMessage('');
    try {
      await loadGoogle();
      if (!window.google?.accounts.oauth2) throw new Error('Google could not be loaded. Please try again.');
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid profile',
        callback: async (response) => {
          if (!response.access_token || response.error) {
            setMessage('Google access was not granted. You can continue with a local profile.');
            setBusy(false);
            return;
          }
          try {
            const result = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
              headers: { Authorization: `Bearer ${response.access_token}` },
            });
            if (!result.ok) throw new Error();
            const profile: unknown = await result.json();
            const name = (profile as { name?: unknown })?.name;
            if (typeof name !== 'string' || !name.trim()) throw new Error();
            onName(name.trim().slice(0, 60));
            setMessage('Name imported from Google. You can edit it below.');
          } catch {
            setMessage('Could not retrieve your Google profile. Please try again or enter your name.');
          } finally { setBusy(false); }
        },
        error_callback: () => { setMessage('Google sign-in was closed or blocked. Please try again.'); setBusy(false); },
      });
      client.requestAccessToken();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not open Google. Please try again.');
      setBusy(false);
    }
  };
  return (
    <div className="google-profile">
      <button type="button" className="google-profile-button" onClick={() => void connect()} disabled={busy}>
        <span className="google-profile-icon" aria-hidden="true">G</span>
        {busy ? 'Connecting to Google…' : 'Continue with Google'}
      </button>
      <small>Optional: import your name from Google. This does not create an online account or sync your data.</small>
      {message && <small role="status">{message}</small>}
      <div className="google-profile-divider"><span>or continue manually</span></div>
    </div>
  );
}
