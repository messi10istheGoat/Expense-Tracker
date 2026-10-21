import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { supabase } from '../cloud/client';
export function NativeLifecycle() {
  const [error, setError] = useState('');
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    const seen = new Set<string>();
    const link = async (url: string) => {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'spendwise:' || parsed.hostname !== 'auth-callback' || seen.has(url)) return;
        seen.add(url);
        const code = parsed.searchParams.get('code');
        if (!code || !supabase) throw new Error('Invalid account link.');
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
      } catch {
        if (!disposed) setError('This account link could not be opened. Request a new link on this device.');
      }
    };
    const listeners = [
      App.addListener('appUrlOpen', ({ url }) => void link(url)),
      App.addListener('backButton', ({ canGoBack }) => {
        const dialogs = document.querySelectorAll('dialog[open]');
        const top = dialogs[dialogs.length - 1] as HTMLDialogElement | undefined;
        if (top) {
          top.dispatchEvent(new Event('cancel', { cancelable: true }));
          return;
        }
        if (canGoBack) {
          history.back();
          return;
        }
        if (location.hash && location.hash !== '#overview') {
          location.hash = 'overview';
          return;
        }
        if (window.dispatchEvent(new Event('spendwise:before-exit', { cancelable: true })))
          void App.exitApp();
      }),
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          supabase?.auth.startAutoRefresh();
          window.dispatchEvent(new Event('spendwise:resume'));
        } else supabase?.auth.stopAutoRefresh();
      }),
    ];
    App.getLaunchUrl()
      .then((launch) => {
        if (!disposed && launch) void link(launch.url);
      })
      .catch(() => setError('Could not read the account link.'));
    return () => {
      disposed = true;
      listeners.forEach((listener) => void listener.then((handle) => handle.remove()));
    };
  }, []);
  return error ? (
    <div className="platform-error" role="alert">
      {error}
      <button onClick={() => setError('')}>Dismiss</button>
    </div>
  ) : null;
}
