import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, ShieldCheck, Sprout } from 'lucide-react';
import { authRedirect, supabase } from './client';
import { useAccount } from './CloudProvider';
export function AuthScreen({ onDemo }: { onDemo: () => void }) {
  const account = useAccount();
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const recovery = account.recovery;
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    const form = new FormData(e.currentTarget),
      email = String(form.get('email') ?? '').trim(),
      password = String(form.get('password') ?? '');
    try {
      if (recovery) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        account.finishRecovery();
      } else if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error('Could not sign in. Check your email and password, then try again.');
      } else if (mode === 'signup') {
        const name = String(form.get('name')).trim();
        if (!name) throw new Error('Enter your name.');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: authRedirect(), data: { display_name: name } },
        });
        if (error) throw error;
        if (!data.session) setNotice('Check your email to confirm your account before signing in.');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: authRedirect() });
        if (error) throw error;
        setNotice('If this email has an account, a password reset link will arrive shortly.');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to connect. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const change = (next: typeof mode) => {
    setMode(next);
    setError('');
    setNotice('');
  };
  return (
    <main className="auth-shell">
      <section className="auth-story">
        <a
          className="auth-brand"
          href="#overview"
          onClick={(e) => {
            e.preventDefault();
            onDemo();
          }}
        >
          <Sprout size={26} />
          spendwise
        </a>
        <div>
          <span className="eyebrow">PERSONAL FINANCE, CONNECTED</span>
          <h1>Know where your money stands.</h1>
          <p>One place to record spending, plan your month, and keep your accounts in view.</p>
          <ul>
            <li>
              <Check size={17} />
              Your records on web and Android
            </li>
            <li>
              <Check size={17} />
              Flexible accounts and categories
            </li>
            <li>
              <Check size={17} />
              No bank login required
            </li>
          </ul>
          <div className="auth-record-preview" aria-label="Illustrative transaction list">
            <span>AN EXAMPLE OF YOUR DAILY VIEW</span>
            <div>
              <strong>Groceries</strong>
              <b>−$52.80</b>
            </div>
            <div>
              <strong>Monthly salary</strong>
              <b>+$3,500.00</b>
            </div>
            <div>
              <strong>Transport</strong>
              <b>−$12.00</b>
            </div>
            <small>Illustrative amounts, not customer data.</small>
          </div>
        </div>
        <small>
          <ShieldCheck size={15} />
          Your account is separate from the demo.
        </small>
      </section>
      <section className="auth-form-panel">
        <button className="text-button" onClick={onDemo}>
          <ArrowLeft size={16} />
          {recovery ? 'Cancel recovery and sign out' : 'Explore the demo'}
        </button>
        <div className="auth-form-content">
          <span className="eyebrow">{recovery ? 'ACCOUNT RECOVERY' : 'YOUR SPENDWISE ACCOUNT'}</span>
          <h2>
            {recovery
              ? 'Choose a new password'
              : mode === 'signin'
                ? 'Welcome back'
                : mode === 'signup'
                  ? 'Create your account'
                  : 'Reset your password'}
          </h2>
          <p>
            {recovery
              ? 'Use at least 12 characters.'
              : mode === 'signup'
                ? 'Start with a private, empty workspace. Demo records are never imported automatically.'
                : mode === 'reset'
                  ? 'We’ll email you a link to securely reset your password.'
                  : 'Sign in to access your synced financial records.'}
          </p>
          {!account.configured && (
            <div className="auth-notice" role="status">
              <strong>Cloud sign-in is not configured in this preview.</strong>
              <p>
                The demo works locally. A deployed backend and email configuration are required before
                customer accounts can be used.
              </p>
            </div>
          )}
          <form onSubmit={submit}>
            {!recovery && mode === 'signup' && (
              <label>
                Your name
                <input name="name" autoComplete="given-name" required maxLength={60} />
              </label>
            )}
            {!recovery && (
              <label>
                Email address
                <input name="email" type="email" autoComplete="email" required maxLength={254} />
              </label>
            )}
            {(recovery || mode !== 'reset') && (
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete={recovery || mode === 'signup' ? 'new-password' : 'current-password'}
                  minLength={recovery || mode === 'signup' ? 12 : 1}
                  maxLength={256}
                  required
                />
                {(recovery || mode === 'signup') && (
                  <small>At least 12 characters. A unique passphrase works well.</small>
                )}
              </label>
            )}
            {mode === 'signup' && (
              <p className="auth-legal">
                Your records are stored in your cloud account. This preview is not a bank, payment service, or
                financial adviser. Read the service’s published privacy policy and terms before a public
                launch.
              </p>
            )}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="auth-notice">
                {notice}
              </p>
            )}
            <button className="button" disabled={!account.configured || busy}>
              {busy
                ? 'Please wait…'
                : recovery
                  ? 'Update password'
                  : mode === 'signin'
                    ? 'Sign in'
                    : mode === 'signup'
                      ? 'Create account'
                      : 'Send reset link'}
              <ArrowRight size={16} />
            </button>
          </form>
          {!recovery && (
            <div className="auth-form-links">
              {mode === 'signin' ? (
                <>
                  <button onClick={() => change('reset')}>Forgot password?</button>
                  <p>
                    New to Spendwise? <button onClick={() => change('signup')}>Create an account</button>
                  </p>
                </>
              ) : (
                <button onClick={() => change('signin')}>Back to sign in</button>
              )}
            </div>
          )}
        </div>
        <small className="auth-device-note">
          A personal finance workspace. Not a connected bank account.
        </small>
      </section>
    </main>
  );
}
