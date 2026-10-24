import { createContext, useContext, useState, type ReactNode } from 'react';
import { ArrowRight, Check, HardDrive, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { PRO_FEATURES, legacyTestMode, type ProFeature } from './features';
import { Modal } from '../finance/ui';
interface Subscription {
  isPro: boolean;
  openPaywall: (feature?: ProFeature) => void;
}
const Context = createContext<Subscription | null>(null);
export function useSubscription() {
  const context = useContext(Context);
  if (!context) throw new Error('Subscription provider missing');
  return context;
}
/** Paywall preview only: no storage flag or UI action can activate a production subscription. */
export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<ProFeature | 'all' | null>(null);
  const [notice, setNotice] = useState('');
  const openPaywall = (feature?: ProFeature) => {
    setNotice('');
    setSelection(feature ?? 'all');
  };
  return (
    <Context.Provider value={{ isPro: legacyTestMode, openPaywall }}>
      {children}
      {selection && (
        <Modal
          title="Spendwise Pro"
          sub={
            selection === 'all'
              ? 'More tools for your personal finances.'
              : `${PRO_FEATURES[selection].name} is a Pro feature.`
          }
          onClose={() => setSelection(null)}
        >
          <div className="paywall">
            <span className="pro-pill">
              <Sparkles size={13} />
              PRO
            </span>
            <h3>A clearer plan. All on your device.</h3>
            <p>
              Keep basic tracking free. A subscription will unlock these advanced tools—without creating a
              Spendwise account.
            </p>
            <ul>
              {Object.entries(PRO_FEATURES).map(([id, feature]) => (
                <li key={id} className={id === selection ? 'selected' : ''}>
                  <Check size={17} />
                  <div>
                    <strong>{feature.name}</strong>
                    <small>{feature.description}</small>
                  </div>
                </li>
              ))}
            </ul>
            <div className="billing-notice" role="status">
              <strong>Subscriptions are not available in this build yet.</strong>
              <p>
                Pricing and payments have not been connected. You will not be charged, and no trial or
                subscription will start.
              </p>
            </div>
            <button className="button full-width" disabled>
              Subscribe to Pro · coming soon
              <ArrowRight size={16} />
            </button>
            <div className="paywall-links">
              <button
                onClick={() =>
                  setNotice(
                    'Purchase restoration will be available after store billing is connected. No purchase was restored.',
                  )
                }
              >
                Restore purchases
              </button>
              <button onClick={() => setSelection(null)}>Continue with Free</button>
            </div>
            {notice && (
              <p className="form-hint" role="status">
                {notice}
              </p>
            )}
            <p className="paywall-privacy">
              <ShieldCheck size={15} />
              No Spendwise sign-up. Your financial records stay on this device. Backups and data management
              stay free.
            </p>
          </div>
        </Modal>
      )}
    </Context.Provider>
  );
}
export function ProGate({ feature, children }: { feature: ProFeature; children: ReactNode }) {
  const { isPro, openPaywall } = useSubscription();
  if (isPro) return children;
  const { name, description } = PRO_FEATURES[feature];
  return (
    <section className="locked-feature">
      <div className="locked-icon">
        <LockKeyhole size={28} />
      </div>
      <span className="pro-pill">SPENDWISE PRO</span>
      <h2>{name}</h2>
      <p>{description}</p>
      <p className="locked-note">
        This advanced tool is part of Pro. Basic tracking and your existing records remain available on the
        Free plan.
      </p>
      <button className="button" onClick={() => openPaywall(feature)}>
        View subscription
        <Sparkles size={16} />
      </button>
      <small>
        <HardDrive size={14} />
        Your records stay on this device. No account required.
      </small>
    </section>
  );
}
