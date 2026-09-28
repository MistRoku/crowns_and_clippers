import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PageHero, { usePageTitle } from '../components/PageHero';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../lib/api';

export default function Login() {
  usePageTitle('Sign in', 'Sign in to Crown & Clipper to track your bookings and manage your appointments.', { path: '/login', noindex: true });
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') ?? '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const user = await login(email.trim(), password);
      const fallback =
        user.role === 'Admin' ? '/admin' : user.role === 'Stylist' ? '/staff' : '/account';
      navigate(next.startsWith('/') ? next : fallback);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Team & customer sign in"
        title="Welcome Back"
        intro="Customers can track their bookings here. Stylists see their chair schedule, and owners get the full shop dashboard."
      />
      <section className="section">
        <div className="container auth-wrap">
          <form className="auth-card" onSubmit={onSubmit} noValidate>
            <h2>Sign in</h2>
            <div className="form-field">
              <label htmlFor="li-email">Email</label>
              <input
                id="li-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.co.za"
              />
            </div>
            <div className="form-field">
              <label htmlFor="li-password">Password</label>
              <input
                id="li-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
              />
            </div>
            {error && (
              <p className="form-error-inline" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-gold btn-block" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
            <p className="auth-alt">
              No account? <Link to="/register">Create one</Link>
            </p>
          </form>

          <details className="auth-demo">
            <summary>Demo accounts (seeded)</summary>
            <ul>
              <li>
                <strong>Owner:</strong> admin@crownandclipper.co.za / ChangeMe!2024
              </li>
              <li>
                <strong>Stylist:</strong> sofia.karim@crownandclipper.co.za / Stylist!2024
              </li>
              <li>
                <strong>Second shop owner:</strong> admin@velvetfades.co.za / ChangeMe!2024
                (switch shops from the footer first)
              </li>
            </ul>
            <p>Change these passwords in production via the admin dashboard.</p>
          </details>
        </div>
      </section>
    </>
  );
}
