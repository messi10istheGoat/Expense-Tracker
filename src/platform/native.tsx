import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
/** Offline app lifecycle only. No authentication callbacks or network calls. */
export function NativeLifecycle() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = App.addListener('backButton', ({ canGoBack }) => {
      const dialogs = document.querySelectorAll('dialog[open]'),
        top = dialogs[dialogs.length - 1] as HTMLDialogElement | undefined;
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
      if (window.dispatchEvent(new Event('spendwise:before-exit', { cancelable: true }))) void App.exitApp();
    });
    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, []);
  return null;
}
