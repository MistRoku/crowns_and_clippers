import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, type InboxNotification } from '../lib/api';

const KIND_LABELS: Record<string, string> = {
  BookingConfirmed: 'Booking confirmed',
  BookingCancelled: 'Booking cancelled',
  ClientReminder24h: 'Reminder · 24 h',
  ClientReminder2h: 'Reminder · 2 h',
  StaffReminder2h: 'Chair alert · 2 h',
  StaffDayAhead: "Tomorrow's chair",
};

/**
 * Header notification bell: unread badge, latest messages dropdown and
 * mark-all-read. Polls gently while the user is signed in.
 */
export default function NotificationBell() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InboxNotification[] | null>(null);

  const loadCount = useCallback(() => {
    api.unreadCount().then((r) => setCount(r.count)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }
    loadCount();
    const timer = window.setInterval(loadCount, 60_000);
    return () => window.clearInterval(timer);
  }, [user, loadCount]);

  useEffect(() => {
    if (!open) return;
    api.myNotifications().then(setItems).catch(() => setItems([]));
  }, [open]);

  if (!user) return null;

  const markAll = async () => {
    await api.markAllRead().catch(() => undefined);
    loadCount();
    api.myNotifications().then(setItems).catch(() => undefined);
  };

  return (
    <div className="bell-menu">
      <button
        type="button"
        className="bell-toggle"
        aria-label={`Notifications (${count} unread)`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
          <path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 15 18 9" />
          <path d="M10 20a2.2 2.2 0 0 0 4 0" />
        </svg>
        {count > 0 && <span className="bell-badge">{count > 9 ? '9+' : count}</span>}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="account-overlay"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
          />
          <div className="bell-dropdown" role="region" aria-label="Notifications">
            <div className="bell-head">
              <strong>Notifications</strong>
              {count > 0 && (
                <button type="button" className="bell-mark" onClick={markAll}>
                  Mark all read
                </button>
              )}
            </div>
            {items === null && <p className="bell-empty">Loading…</p>}
            {items !== null && items.length === 0 && (
              <p className="bell-empty">Nothing yet. Booking reminders will appear here.</p>
            )}
            {items !== null && items.length > 0 && (
              <ul className="bell-list">
                {items.slice(0, 8).map((n) => (
                  <li key={n.id} className={n.readAtUtc ? 'read' : 'unread'}>
                    <span className="bell-kind">{KIND_LABELS[n.kind] ?? n.kind}</span>
                    <span className="bell-subject">{n.subject}</span>
                    <span className="bell-time">{n.createdAtUtc}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="bell-foot">
              <Link to="/notifications" onClick={() => setOpen(false)}>
                View all notifications
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
