import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHero, { usePageTitle } from '../components/PageHero';
import { useAuth } from '../context/AuthContext';
import { useShop } from '../context/ShopContext';
import { errorMessage } from '../lib/api';

export default function Register() {
  usePageTitle('Create an account', 'Create a Crown & Clipper account to book faster and keep every appointment in one place.', { path: '/register', noindex: true });
  const { register } = useAuth();
  const shop = useShop();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await register(name.trim(), email.trim(), password);
      navigate('/account');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Customer account"
        title="Create Your Account"
        intro={`Book faster, keep every ${shop.name} appointment in one place, and cancel online up to 24 hours ahead.`}
      />
      <section className="section">
        <div className="container auth-wrap">
          <form className="auth-card" onSubmit={onSubmit} noValidate>
            <h2>Register</h2>
            <div className="form-field">
              <label htmlFor="rg-name">Full name</label>
              <input
                id="rg-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Thabo Mokoena"
              />
            </div>
            <div className="form-field">
              <label htmlFor="rg-email">Email</label>
              <input
                id="rg-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.co.za"
              />
            </div>
            <div className="form-field">
              <label htmlFor="rg-password">Password (10+ characters)</label>
              <input
                id="rg-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="rg-confirm">Confirm password</label>
              <input
                id="rg-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {error && (
              <p className="form-error-inline" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-gold btn-block" disabled={busy}>
              {busy ? 'Creating account…' : 'Create account'}
            </button>
            <p className="auth-alt">
              Already registered? <Link to="/login">Sign in</Link>
            </p>
          </form>
        </div>
      </section>
    </>
  );
}
