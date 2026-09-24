import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Modal from './Modal';
import { LogoMark } from './Logo';
import { api, errorMessage } from '../lib/api';
import { useShop } from '../context/ShopContext';

const STORAGE_KEY = 'crown-clipper-offer-seen';
const DELAY_MS = 4500;

/**
 * First-visit offer modal (the site's purposeful popup).
 * Shows once per visitor after a short delay, offers a 10% first-cut
 * discount in exchange for an email signup, and never interrupts the
 * booking flow itself.
 */
export default function OfferModal() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done'>('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const SHOP = useShop();

  useEffect(() => {
    // Don't interrupt people who are already booking or reading legal pages,
    // and never show more than once per browser.
    const interruptedPages = ['/booking', '/terms', '/privacy'];
    if (interruptedPages.includes(location.pathname)) return;
    if (window.localStorage.getItem(STORAGE_KEY)) return;

    const timer = window.setTimeout(() => {
      setOpen(true);
      window.localStorage.setItem(STORAGE_KEY, '1');
    }, DELAY_MS);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => setOpen(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === 'saving') return;

    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }

    setError(null);
    setStatus('saving');
    try {
      const res = await api.subscribeNewsletter(trimmed, 'offer-modal');
      setMessage(res.message);
      setStatus('done');
    } catch (err) {
      setError(errorMessage(err));
      setStatus('idle');
    }
  };

  return (
    <Modal open={open} onClose={close} labelledBy="offer-title" className="offer-modal">
      <div className="offer-content">
        <div className="offer-emblem">
          <LogoMark size={54} />
        </div>
        {status === 'done' ? (
          <div className="offer-success">
            <p className="eyebrow eyebrow-center">You're in</p>
            <h3 id="offer-title">{message || 'Your code is ready.'}</h3>
            <p className="offer-code-chip" aria-label={`Discount code ${SHOP.offerCode}`}>
              {SHOP.offerCode}
            </p>
            <p className="offer-note">Quote the code at your first visit for 10% off any service.</p>
            <Link to="/booking" className="btn btn-gold btn-block" onClick={close}>
              Book Your First Cut
            </Link>
          </div>
        ) : (
          <>
            <p className="eyebrow eyebrow-center">First visit?</p>
            <h3 id="offer-title">
              Take <em>10% off</em> your first cut
            </h3>
            <p className="offer-copy">
              Join the Crown &amp; Clipper list and we'll give you code{' '}
              <strong>{SHOP.offerCode}</strong> - plus first dibs on Saturday slots and
              seasonal offers.
            </p>
            <form className="offer-form" onSubmit={onSubmit} noValidate>
              <label className="visually-hidden" htmlFor="offer-email">
                Email address
              </label>
              <input
                id="offer-email"
                type="email"
                data-autofocus
                placeholder="you@example.co.za"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                aria-invalid={!!error}
                aria-describedby={error ? 'offer-error' : undefined}
              />
              <button type="submit" className="btn btn-gold" disabled={status === 'saving'}>
                {status === 'saving' ? 'Claiming…' : 'Claim My Offer'}
              </button>
            </form>
            {error && (
              <p id="offer-error" className="form-error-inline" role="alert">
                {error}
              </p>
            )}
            <p className="offer-fineprint">No spam, ever. Unsubscribe anytime.</p>
            <button type="button" className="offer-dismiss" onClick={close}>
              No thanks, I'll pay full price
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
