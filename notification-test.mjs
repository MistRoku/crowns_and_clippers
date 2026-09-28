// Notification system verification (reminders for clients AND staff).
// Usage: node notification-test.mjs   (expects a FRESH database on :5000)
const B = process.env.API_BASE || 'http://localhost:5000';

async function req(method, path, body, headers = {}) {
  const res = await fetch(B + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  return { status: res.status, data };
}

let failed = false;
const assert = (cond, msg) => {
  if (!cond) { console.error('  FAIL:', msg); failed = true; }
  else console.log('  ok -', msg);
};

// A slot ~24h from now in shop time (Africa/Johannesburg, SAST), rounded up to the
// 30-minute grid. If "now + 24h" falls outside opening hours the 24h-reminder
// assertions are skipped gracefully (run the test during shop daytime).
const fmt = new Intl.DateTimeFormat('en-ZA', {
  timeZone: 'Africa/Johannesburg', hour12: false,
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
});
const plus24 = new Date(Date.now() + 86400000 + 20 * 60000); // ~24h20m out
const parts = Object.fromEntries(fmt.formatToParts(plus24).map((x) => [x.type, x.value]));
let hour = Number(parts.hour) % 24;
let minute = Number(parts.minute) < 30 ? 30 : 0;
if (Number(parts.minute) >= 30) hour += 1;
const inWindow = hour >= 9 && hour <= 18;
let date = `${parts.year}-${parts.month}-${parts.day}`;
if (!inWindow) {
  // Evening run: fall back to midday two days out (still >24h, cancellable).
  const plus48 = new Date(Date.now() + 2 * 86400000);
  const p48 = Object.fromEntries(fmt.formatToParts(plus48).map((x) => [x.type, x.value]));
  date = `${p48.year}-${p48.month}-${p48.day}`;
  hour = 12;
  minute = 0;
}
const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

console.log('--- Notification system tests ---');

// Customer account + booking ~24h out
let r = await req('POST', '/api/auth/register', { name: 'Reminded Customer', email: 'remind@mail.com', password: 'sup3r-s3cret!' });
assert(r.status === 201, 'customer registered');
const cust = r.data.token;

const svc = (await req('GET', '/api/services')).data.find((s) => s.slug === 'classic-cut');
r = await req('POST', '/api/bookings', {
  serviceId: svc.id, barberId: null, date, time,
  name: 'Reminded Customer', email: 'remind@mail.com', phone: '07700 900333',
}, { Authorization: `Bearer ${cust}` });
assert(r.status === 201, `booking ~24h out created (${r.data.reference}, ${date} ${time})`);
const ref = r.data.reference;

// Confirmation notices fired on creation (client + stylist, email + in-app).
// Run one scheduler pass first so pending emails are dispatched.
const admin = (await req('POST', '/api/auth/login', { email: 'admin@crownandclipper.co.za', password: 'ChangeMe!2024' })).data.token;
const AH = { Authorization: `Bearer ${admin}` };
await req('POST', '/api/admin/notifications/run', null, AH);
r = await req('GET', '/api/admin/notifications', null, AH);
assert(r.status === 200 && r.data.provider === 'log', `outbox reachable, transport = ${r.data.provider}`);
const confirmed = r.data.items.filter((n) => n.kind === 'BookingConfirmed');
assert(confirmed.length === 4, `booking confirmation produced 4 messages (client+stylist x email+in-app), got ${confirmed.length}`);
assert(confirmed.some((n) => n.channel === 'Email' && n.status === 'Sent'), 'confirmation email dispatched via outbox');
assert(confirmed.some((n) => n.channel === 'InApp' && n.recipientEmail === 'remind@mail.com'), 'client in-app confirmation delivered');

// Customer inbox + bell
r = await req('GET', '/api/me/notifications', null, { Authorization: `Bearer ${cust}` });
assert(r.status === 200 && r.data.some((n) => n.kind === 'BookingConfirmed') && r.data.length === (inWindow ? 2 : 1), 'customer inbox has confirmation (+ 24h reminder when in window)');
r = await req('GET', '/api/me/notifications/unread-count', null, { Authorization: `Bearer ${cust}` });
assert(r.data.count === (inWindow ? 2 : 1), `unread count = ${inWindow ? 2 : 1} (got ${r.data.count})`);

// The first run above already enqueued the 24h pair (booking is ~24h out).
if (inWindow) {
  r = await req('GET', '/api/admin/notifications', null, AH);
  assert(r.data.items.filter((n) => n.kind === 'ClientReminder24h').length === 2, '24h reminder pair enqueued by the scan');
} else {
  console.log('  .. 24h window skipped (outside shop daytime)');
}

// Idempotency: a second pass must not duplicate
const before = (await req('GET', '/api/admin/notifications', null, AH)).data.items.length;
const run2 = await req('POST', '/api/admin/notifications/run', null, AH);
const after = (await req('GET', '/api/admin/notifications', null, AH)).data.items.length;
assert(run2.data.created === 0 && before === after, `second scan is idempotent (${before} -> ${after})`);

r = await req('GET', '/api/admin/notifications?status=Sent', null, AH);
const rem = r.data.items.filter((n) => n.kind === 'ClientReminder24h');
if (inWindow) {
  assert(rem.length === 2 && rem.find((n) => n.channel === 'Email').subject.includes('tomorrow'), '24h client reminder email + in-app with correct subject');
} else {
  console.log('  .. 24h reminder assertions skipped');
}
const staffRem = r.data.items.filter((n) => n.kind === 'StaffDayAhead' || n.kind === 'StaffReminder2h');
console.log(`  .. staff messages in outbox: ${staffRem.length} (day-ahead digest appears after 18:00 shop time)`);

// Customer sees the reminder in-app and can clear the bell
r = await req('GET', '/api/me/notifications', null, { Authorization: `Bearer ${cust}` });
if (inWindow) assert(r.data.some((n) => n.kind === 'ClientReminder24h'), '24h reminder in customer inbox');
r = await req('POST', '/api/me/notifications/read', null, { Authorization: `Bearer ${cust}` });
assert(r.status === 200 && r.data.updated >= 1, `mark-all-read cleared ${r.data.updated} messages`);
r = await req('GET', '/api/me/notifications/unread-count', null, { Authorization: `Bearer ${cust}` });
assert(r.data.count === 0, 'bell unread count back to 0');

// Stylist inbox got the confirmation too
const sty = (await req('POST', '/api/auth/login', { email: 'marcus.reid@crownandclipper.co.za', password: 'Stylist!2024' })).data.token;
r = await req('GET', '/api/me/notifications', null, { Authorization: `Bearer ${sty}` });
assert(r.data.some((n) => n.kind === 'BookingConfirmed'), 'stylist inbox received the booking confirmation');

// Resend guard: only failed emails can be re-queued
const sentEmail = confirmed.find((n) => n.channel === 'Email');
r = await req('POST', `/api/admin/notifications/${sentEmail.id}/resend`, null, AH);
assert(r.status === 400, 'resending a non-failed email is rejected');

// Cancellation notifies both sides
r = await req('POST', `/api/me/bookings/${ref}/cancel`, null, { Authorization: `Bearer ${cust}` });
assert(r.status === 200, 'customer cancels >24h out');
r = await req('GET', '/api/admin/notifications', null, AH);
const canc = r.data.items.filter((n) => n.kind === 'BookingCancelled');
assert(canc.length >= 2, `cancellation notified client + stylist (${canc.length} messages)`);
r = await req('GET', '/api/me/notifications', null, { Authorization: `Bearer ${sty}` });
assert(r.data.some((n) => n.kind === 'BookingCancelled'), 'stylist inbox received the cancellation');

console.log(failed ? '\nNOTIFICATION TESTS FAILED' : '\nALL NOTIFICATION TESTS PASSED');
process.exit(failed ? 1 : 0);
