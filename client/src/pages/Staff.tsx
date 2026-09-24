import { useCallback, useEffect, useState } from 'react';
import PageHero, { usePageTitle } from '../components/PageHero';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import { api, errorMessage, type StaffAppointment } from '../lib/api';
import { formatLongDate } from '../lib/calendar';
import { DateTime } from 'luxon';
import { useShop } from '../context/ShopContext';

function StaffInner() {
  usePageTitle('My schedule');
  const { user } = useAuth();
  const shop = useShop();
  const [date, setDate] = useState(() =>
    DateTime.now().setZone(shop.timezone).toISODate() ?? new Date().toISOString().slice(0, 10),
  );
  const [days, setDays] = useState(1);
  const [rows, setRows] = useState<StaffAppointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setRows(null);
    setError(null);
    api
      .staffSchedule(date, days)
      .then(setRows)
      .catch((e) => setError(errorMessage(e)));
  }, [date, days]);

  useEffect(load, [load]);

  return (
    <>
      <PageHero
        eyebrow="Staff area"
        title={`Your chair, ${user?.barberName ?? user?.name ?? ''}`}
        intro="Your confirmed appointments for the selected window. Cancelled slots drop off automatically."
      />
      <section className="section">
        <div className="container dashboard">
          <div className="dash-controls">
            <label htmlFor="st-date">From date</label>
            <input
              id="st-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <label htmlFor="st-days">Window</label>
            <select id="st-days" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={1}>1 day</option>
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
            </select>
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              <p>{error}</p>
            </div>
          )}

          {!rows && !error && (
            <div className="skeleton-list" role="status" aria-label="Loading your schedule">
              <span className="skeleton skeleton-row" />
              <span className="skeleton skeleton-row" />
              <span className="skeleton skeleton-row" />
            </div>
          )}

          {rows && rows.length === 0 && (
            <div className="empty-state">
              <p>Nothing booked in this window yet.</p>
            </div>
          )}

          {rows && rows.length > 0 && (
            <div className="table-scroll">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Service</th>
                  <th>Customer</th>
                  <th>Reference</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.reference}>
                    <td>{formatLongDate(r.date)}</td>
                    <td>
                      {r.startTime} – {r.endTime}
                    </td>
                    <td>{r.service}</td>
                    <td>{r.customerName}</td>
                    <td>{r.reference}</td>
                    <td>
                      <span className={`status-chip ${r.status.toLowerCase()}`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default function Staff() {
  return (
    <ProtectedRoute roles={['Stylist', 'Admin']}>
      <StaffInner />
    </ProtectedRoute>
  );
}
