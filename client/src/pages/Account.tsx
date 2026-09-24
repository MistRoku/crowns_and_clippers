import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHero, { usePageTitle } from '../components/PageHero';
import CalendarButtons from '../components/CalendarButtons';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import { api, errorMessage, type BookingResponse } from '../lib/api';
import { formatLongDate, formatPrice } from '../lib/calendar';

function AccountInner() {
  usePageTitle('My bookings');
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .myBookings()
      .then(setBookings)
      .catch((e) => setError(errorMessage(e)));
  }, []);

  useEffect(load, [load]);

  const cancel = async (reference: string) => {
    setCancelling(reference);
    setNotice(null);
    try {
      const res = await api.cancelMyBooking(reference);
      setNotice(res.message);
      load();
    } catch (e) {
      setNotice(errorMessage(e));
    } finally {
      setCancelling(null);
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Your account"
        title={`Hello, ${user?.name.split(' ')[0] ?? 'there'}`}
        intro="Every booking made with this account, newest first. Cancellations are free up to 24 hours before your appointment."
      />
      <section className="section">
        <div className="container dashboard">
          {notice && (
            <div className="alert alert-info" role="status">
              <p>{notice}</p>
            </div>
          )}
          {error && (
            <div className="alert alert-error" role="alert">
              <p>{error}</p>
            </div>
          )}

          {!bookings && !error && (
            <div className="skeleton-list" role="status" aria-label="Loading your bookings">
              <span className="skeleton skeleton-row" />
              <span className="skeleton skeleton-row" />
            </div>
          )}

          {bookings && bookings.length === 0 && (
            <div className="empty-state">
              <p>No bookings yet.</p>
              <Link to="/booking" className="btn btn-gold">
                Book your first appointment
              </Link>
            </div>
          )}

          {bookings && bookings.length > 0 && (
            <div className="dash-cards">
              {bookings.map((b) => (
                <article key={b.reference} className="dash-card">
                  <div className="dash-card-head">
                    <h3>{b.service.name}</h3>
                    <span className={`status-chip ${b.status.toLowerCase()}`}>{b.status}</span>
                  </div>
                  <p className="dash-card-meta">
                    {formatLongDate(b.date)} · {b.startTime} – {b.endTime} · {b.barber.name} ·{' '}
                    {formatPrice(b.service.price)}
                  </p>
                  <p className="dash-card-ref">Reference {b.reference}</p>
                  {b.status === 'Confirmed' && (
                    <>
                      <CalendarButtons booking={b} />
                      <button
                        type="button"
                        className="btn btn-outline-dark btn-sm"
                        disabled={cancelling === b.reference}
                        onClick={() => cancel(b.reference)}
                      >
                        {cancelling === b.reference ? 'Cancelling…' : 'Cancel booking'}
                      </button>
                    </>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default function Account() {
  return (
    <ProtectedRoute>
      <AccountInner />
    </ProtectedRoute>
  );
}
