import { useCallback, useEffect, useState, type FormEvent } from 'react';
import PageHero, { usePageTitle } from '../components/PageHero';
import ProtectedRoute from '../components/ProtectedRoute';
import { useShop } from '../context/ShopContext';
import {
  api,
  errorMessage,
  type AdminMessage,
  type AdminSignup,
  type AdminStats,
  type AuthUser,
  type BookingResponse,
  type OutboxNotification,
} from '../lib/api';
import { formatLongDate, formatPrice } from '../lib/calendar';

type Tab = 'overview' | 'bookings' | 'messages' | 'signups' | 'users' | 'outbox';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'messages', label: 'Messages' },
  { id: 'signups', label: 'Newsletter' },
  { id: 'users', label: 'Accounts' },
  { id: 'outbox', label: 'Notification outbox' },
];

function AdminInner() {
  usePageTitle('Admin dashboard');
  const shop = useShop();
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <>
      <PageHero
        eyebrow="Owner dashboard"
        title={`Running ${shop.name}`}
        intro="Bookings, inbox, newsletter list and staff accounts for this shop only. Other shops on the platform cannot see this data."
      />
      <section className="section">
        <div className="container dashboard">
          <div className="dash-tabs" role="tablist" aria-label="Admin sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`admin-tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`admin-panel-${t.id}`}
                className={`chip ${tab === t.id ? 'selected' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div
            role="tabpanel"
            id={`admin-panel-${tab}`}
            aria-labelledby={`admin-tab-${tab}`}
          >
          {tab === 'overview' && <Overview />}
          {tab === 'bookings' && <Bookings />}
          {tab === 'messages' && <Messages />}
          {tab === 'signups' && <Signups />}
          {tab === 'users' && <Users />}
          {tab === 'outbox' && <Outbox />}
          </div>
        </div>
      </section>
    </>
  );
}

function Overview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.adminStats().then(setStats).catch((e) => setError(errorMessage(e)));
  }, []);

  if (error) return <AlertError msg={error} />;
  if (!stats) return <SkeletonRows n={3} />;

  const cards = [
    { label: 'Appointments today', value: String(stats.today) },
    { label: 'Next 7 days', value: String(stats.next7Days) },
    { label: 'Revenue next 7 days', value: formatPrice(stats.revenueNext7Days) },
    { label: 'Confirmed all-time', value: String(stats.totalConfirmed) },
    { label: 'Registered customers', value: String(stats.registeredCustomers) },
    { label: 'Newsletter signups', value: String(stats.newsletterSignups) },
    { label: 'Contact messages', value: String(stats.contactMessages) },
  ];

  return (
    <div className="stat-grid">
      {cards.map((c) => (
        <div key={c.label} className="stat-card">
          <span className="stat-card-value">{c.value}</span>
          <span className="stat-card-label">{c.label}</span>
        </div>
      ))}
    </div>
  );
}

function Bookings() {
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState<BookingResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    setRows(null);
    setError(null);
    api
      .adminBookings({ date: date || undefined, status: status || undefined })
      .then(setRows)
      .catch((e) => setError(errorMessage(e)));
  }, [date, status]);

  useEffect(load, [load]);

  const cancel = async (id: number) => {
    try {
      const res = await api.adminCancelBooking(id);
      setNotice(res.message);
      load();
    } catch (e) {
      setNotice(errorMessage(e));
    }
  };

  return (
    <>
      <div className="dash-controls">
        <label htmlFor="ad-date">Date</label>
        <input id="ad-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <label htmlFor="ad-status">Status</label>
        <select id="ad-status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>
      {notice && <AlertInfo msg={notice} />}
      {error && <AlertError msg={error} />}
      {!rows && !error && <SkeletonRows n={4} />}
      {rows && rows.length === 0 && <Empty msg="No bookings match this filter." />}
      {rows && rows.length > 0 && (
        <div className="table-scroll">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Ref</th>
              <th>Date</th>
              <th>Time</th>
              <th>Service</th>
              <th>Stylist</th>
              <th>Customer</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.reference}>
                <td>{b.reference}</td>
                <td>{formatLongDate(b.date)}</td>
                <td>
                  {b.startTime} – {b.endTime}
                </td>
                <td>{b.service.name}</td>
                <td>{b.barber.name}</td>
                <td>
                  {b.customer.name}
                  <br />
                  <span className="table-muted">{b.customer.email}</span>
                </td>
                <td>
                  <span className={`status-chip ${b.status.toLowerCase()}`}>{b.status}</span>
                </td>
                <td>
                  {b.status === 'Confirmed' && (
                    <button
                      type="button"
                      className="btn btn-outline-dark btn-sm"
                      onClick={() => cancel(b.id)}
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </>
  );
}

function Messages() {
  const [rows, setRows] = useState<AdminMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.adminMessages().then(setRows).catch((e) => setError(errorMessage(e)));
  }, []);

  if (error) return <AlertError msg={error} />;
  if (!rows) return <SkeletonRows n={3} />;
  if (rows.length === 0) return <Empty msg="No contact messages yet." />;

  return (
    <div className="dash-cards">
      {rows.map((m) => (
        <article key={m.id} className="dash-card">
          <div className="dash-card-head">
            <h3>{m.subject ?? 'General enquiry'}</h3>
            <span className="table-muted">{m.received}</span>
          </div>
          <p className="dash-card-meta">
            {m.name} · <a href={`mailto:${m.email}`}>{m.email}</a>
            {m.phone ? ` · ${m.phone}` : ''}
          </p>
          <p>{m.message}</p>
        </article>
      ))}
    </div>
  );
}

function Signups() {
  const [rows, setRows] = useState<AdminSignup[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.adminSignups().then(setRows).catch((e) => setError(errorMessage(e)));
  }, []);

  if (error) return <AlertError msg={error} />;
  if (!rows) return <SkeletonRows n={3} />;
  if (rows.length === 0) return <Empty msg="No newsletter signups yet." />;

  return (
    <div className="table-scroll">
    <table className="dash-table">
      <thead>
        <tr>
          <th>Email</th>
          <th>Source</th>
          <th>Received</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((s) => (
          <tr key={s.id}>
            <td>{s.email}</td>
            <td>{s.source ?? 'website'}</td>
            <td>{s.received}</td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

function Users() {
  const [rows, setRows] = useState<AuthUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Stylist');
  const [barberSlug, setBarberSlug] = useState('');
  const [barbers, setBarbers] = useState<{ slug: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.adminUsers().then(setRows).catch((e) => setError(errorMessage(e)));
  }, []);

  useEffect(() => {
    load();
    api.getBarbers().then((bs) => setBarbers(bs.map((b) => ({ slug: b.slug, name: b.name }))));
  }, [load]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      await api.adminCreateUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        barberSlug: role === 'Stylist' ? barberSlug : undefined,
      });
      setName('');
      setEmail('');
      setPassword('');
      setNotice('Account created.');
      load();
    } catch (err) {
      setNotice(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (u: AuthUser) => {
    try {
      await api.adminSetActive(u.id, !u.active);
      load();
    } catch (err) {
      setNotice(errorMessage(err));
    }
  };

  return (
    <>
      {notice && <AlertInfo msg={notice} />}
      {error && <AlertError msg={error} />}
      {!rows && !error && <SkeletonRows n={3} />}
      {rows && (
        <div className="table-scroll">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Chair</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.barberName ?? '—'}</td>
                <td>
                  <span className={`status-chip ${u.active ? 'confirmed' : 'cancelled'}`}>
                    {u.active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-outline-dark btn-sm"
                    onClick={() => toggle(u)}
                  >
                    {u.active ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      <form className="auth-card dash-create" onSubmit={create}>
        <h3>Create staff account</h3>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="us-name">Name</label>
            <input id="us-name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="us-email">Email</label>
            <input id="us-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="us-pass">Password (10+ chars)</label>
            <input id="us-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="us-role">Role</label>
            <select id="us-role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="Stylist">Stylist</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
        </div>
        {role === 'Stylist' && (
          <div className="form-field">
            <label htmlFor="us-chair">Link to chair</label>
            <select id="us-chair" value={barberSlug} onChange={(e) => setBarberSlug(e.target.value)}>
              <option value="">Choose a staff profile…</option>
              {barbers.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <button type="submit" className="btn btn-gold" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>
    </>
  );
}

function Outbox() {
  const [data, setData] = useState<{ provider: string; items: OutboxNotification[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    api.adminNotifications().then(setData).catch((e) => setError(errorMessage(e)));
  }, []);

  useEffect(load, [load]);

  const run = async () => {
    try {
      const res = await api.runReminders();
      setNotice(`Reminder scan finished: ${res.created} created, ${res.sent} dispatched (transport: ${res.provider}).`);
      load();
    } catch (e) {
      setNotice(errorMessage(e));
    }
  };

  const resend = async (id: number) => {
    try {
      const res = await api.adminResendNotification(id);
      setNotice(`Re-queued and dispatched ${res.sent} message(s).`);
      load();
    } catch (e) {
      setNotice(errorMessage(e));
    }
  };

  return (
    <>
      <div className="dash-controls">
        <button type="button" className="btn btn-gold btn-sm" onClick={run}>
          Run reminder scan now
        </button>
        {data && <span className="table-muted">email transport: {data.provider}</span>}
      </div>
      {notice && <AlertInfo msg={notice} />}
      {error && <AlertError msg={error} />}
      {!data && !error && <SkeletonRows n={4} />}
      {data && data.items.length === 0 && <Empty msg="No messages yet. Bookings and reminders will appear here." />}
      {data && data.items.length > 0 && (
        <div className="table-scroll">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Created</th>
              <th>Kind</th>
              <th>Channel</th>
              <th>Recipient</th>
              <th>Subject</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.items.map((n) => (
              <tr key={n.id}>
                <td>{n.createdAtUtc}</td>
                <td>{n.kind}</td>
                <td>{n.channel}</td>
                <td>
                  {n.recipientName}
                  <br />
                  <span className="table-muted">{n.recipientEmail}</span>
                </td>
                <td>{n.subject}</td>
                <td>
                  <span className={`status-chip ${n.status === 'Sent' ? 'confirmed' : n.status === 'Failed' ? 'cancelled' : ''}`}>
                    {n.status}
                    {n.status === 'Pending' ? ` (${n.attempts})` : ''}
                  </span>
                </td>
                <td>
                  {n.status === 'Failed' && n.channel === 'Email' && (
                    <button type="button" className="btn btn-outline-dark btn-sm" onClick={() => resend(n.id)}>
                      Resend
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </>
  );
}

// ---- small helpers -------------------------------------------------------

function AlertError({ msg }: { msg: string }) {
  return (
    <div className="alert alert-error" role="alert">
      <p>{msg}</p>
    </div>
  );
}

function AlertInfo({ msg }: { msg: string }) {
  return (
    <div className="alert alert-info" role="status">
      <p>{msg}</p>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="empty-state">
      <p>{msg}</p>
    </div>
  );
}

function SkeletonRows({ n }: { n: number }) {
  return (
    <div className="skeleton-list" role="status" aria-label="Loading">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="skeleton skeleton-row" />
      ))}
    </div>
  );
}

export default function Admin() {
  return (
    <ProtectedRoute roles={['Admin']}>
      <AdminInner />
    </ProtectedRoute>
  );
}
