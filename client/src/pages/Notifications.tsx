import { useCallback, useEffect, useState } from 'react';
import PageHero, { usePageTitle } from '../components/PageHero';
import ProtectedRoute from '../components/ProtectedRoute';
import { api, type InboxNotification } from '../lib/api';

const KIND_LABELS: Record<string, string> = {
  BookingConfirmed: 'Booking confirmed',
  BookingCancelled: 'Booking cancelled',
  ClientReminder24h: 'Reminder · 24 hours before',
  ClientReminder2h: 'Reminder · 2 hours before',
  StaffReminder2h: 'Chair alert · 2 hours before',
  StaffDayAhead: "Tomorrow's chair digest",
};

function NotificationsInner() {
  usePageTitle('Notifications', 'Your Crown & Clipper booking confirmations, cancellations and appointment reminders.', { path: '/notifications', noindex: true });
  const [items, setItems] = useState<InboxNotification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(() => {
    api.myNotifications().then(setItems).catch((e) => setError(String(e)));
  }, []);

  useEffect(load, [load]);

  const markAll = async () => {
    await api.markAllRead().catch(() => undefined);
    load();
  };

  return (
    <>
      <PageHero
        eyebrow="Your inbox"
        title="Notifications"
        intro="Booking confirmations, cancellations and appointment reminders, kept per shop."
      />
      <section className="section">
        <div className="container dashboard">
          <div className="dash-controls">
            <button type="button" className="btn btn-outline-dark btn-sm" onClick={markAll}>
              Mark all as read
            </button>
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              <p>{error}</p>
            </div>
          )}

          {!items && !error && (
            <div className="skeleton-list" role="status" aria-label="Loading notifications">
              <span className="skeleton skeleton-row" />
              <span className="skeleton skeleton-row" />
            </div>
          )}

          {items && items.length === 0 && (
            <div className="empty-state">
              <p>No notifications yet.</p>
            </div>
          )}

          {items && items.length > 0 && (
            <div className="dash-cards">
              {items.map((n) => (
                <article
                  key={n.id}
                  className={`dash-card notif-card ${n.readAtUtc ? 'read' : 'unread'}`}
                >
                  <div className="dash-card-head">
                    <h3>{KIND_LABELS[n.kind] ?? n.kind}</h3>
                    <span className="table-muted">{n.createdAtUtc}</span>
                  </div>
                  <p className="dash-card-meta">{n.subject}</p>
                  {expanded === n.id ? (
                    <pre className="notif-body">{n.body}</pre>
                  ) : (
                    <button
                      type="button"
                      className="notif-expand"
                      onClick={() => setExpanded(n.id)}
                    >
                      Show message
                    </button>
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

export default function Notifications() {
  return (
    <ProtectedRoute>
      <NotificationsInner />
    </ProtectedRoute>
  );
}
