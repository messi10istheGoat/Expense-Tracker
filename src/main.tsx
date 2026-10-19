import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './finance/spendwise.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Production only: the single-file application shell can open without a network.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error) => {
      console.warn('Offline shell could not be registered:', error);
    });
  });
}
