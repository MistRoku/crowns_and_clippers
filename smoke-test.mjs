// End-to-end smoke + security test for the Crown & Clipper API.
// Usage: node smoke-test.mjs   (expects the API on http://localhost:5000)
//
// NOTE: the rate-limit probes at the end consume the per-hour "forms" budget
// for your IP. Wait an hour (or use another IP) before re-running.
const BASE = process.env.API_BASE || 'http://localhost:5000';

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  return { status: res.status, data, headers: res.headers };
}

let failed = false;
const assert = (cond, msg) => {
  if (!cond) { console.error('  FAIL:', msg); failed = true; }
  else console.log('  ok -', msg);
};

const iso = (d) => d.toISOString().slice(0, 10);

// Pick a date ~3 days ahead that is not a Sunday
let future = new Date(Date.now() + 3 * 86400000);
if (future.getUTCDay() === 0) future = new Date(Date.now() + 4 * 86400000);
const date = iso(future);

console.log('--- Crown & Clipper API smoke + security test ---');

let r = await req('GET', '/api/health');
assert(r.status === 200 && r.data.status === 'ok', 'GET /api/health');

// --- Security headers on every response ---
assert(r.headers.get('x-content-type-options') === 'nosniff', 'X-Content-Type-Options: nosniff');
assert(r.headers.get('x-frame-options') === 'DENY', 'X-Frame-Options: DENY');
assert(!!r.headers.get('content-security-policy'), 'Content-Security-Policy present');
assert(r.headers.get('content-security-policy')?.includes("default-src 'none'"), 'API CSP is default-src none');
assert(!!r.headers.get('referrer-policy') && !!r.headers.get('permissions-policy'), 'Referrer + Permissions policies');

r = await req('GET', '/api/services');
assert(r.status === 200 && r.data.length === 13, `GET /api/services (13 services, got ${r.data?.length})`);
const skinFade = r.data.find((s) => s.slug === 'skin-fade');
assert(!!skinFade && skinFade.price === 300 && skinFade.durationMinutes === 45, 'skin-fade service shape');
const boxBraids = r.data.find((s) => s.slug === 'box-braids');
assert(!!boxBraids && boxBraids.category === 'Braids & Styles' && boxBraids.barberIds.length === 1, 'box braids exists with exactly one qualified stylist');

r = await req('GET', '/api/barbers');
assert(r.status === 200 && r.data.length === 5, `GET /api/barbers (5 staff, got ${r.data?.length})`);
const amara = r.data.find((b) => b.slug === 'amara-mensah');
const marcusId = r.data.find((b) => b.slug === 'marcus-reid')?.id;
const dannyId = r.data.find((b) => b.slug === 'danny-okafor')?.id;
assert(!!amara && boxBraids.barberIds[0] === amara.id, 'braiding specialist linked to box braids');
assert(Array.isArray(r.data[0].specialties) && r.data[0].specialties.length > 0, 'barber specialties are an array');

r = await req('GET', '/api/shop');
assert(r.status === 200 && r.data.hours.length === 7 && r.data.hours[6].closed === true, 'GET /api/shop (7 days, Sunday closed)');
assert(r.data.timezone === 'Africa/Johannesburg', 'shop timezone');

r = await req('GET', `/api/availability?date=${date}&serviceId=${skinFade.id}`);
assert(r.status === 200 && r.data.slots.length > 0, `GET availability ${date} (${r.data?.slots?.length} slots)`);
const firstFree = r.data.slots.find((s) => s.available);
assert(!!firstFree, `has a free slot (${firstFree.time})`);

// --- Create a booking; control characters in the name must be stripped ---
r = await req('POST', '/api/bookings', {
  serviceId: skinFade.id, barberId: null, date, time: firstFree.time,
  name: 'Test\u0007 Customer​', email: 'tester@mail.com', phone: '07700 900123',
  notes: 'Smoke test booking',
});
assert(r.status === 201 && /^CC-[A-Z2-9]{6}$/.test(r.data?.reference || ''), `POST booking created (${r.data?.reference})`);
assert(r.data?.customer?.name === 'Test Customer', 'control/zero-width chars stripped from name');
const ref = r.data?.reference;
const barberId = r.data?.barber?.id;
assert(!!r.data?.endTime && r.data?.shop?.timezone === 'Africa/Johannesburg', 'booking response has end time + shop info');
assert(r.data?.service?.name === 'Skin Fade' && r.data?.date === date && r.data?.startTime === firstFree.time, 'booking echoes selected details');

// --- Double-booking the SAME barber + slot must be rejected ---
const r2 = await req('POST', '/api/bookings', {
  serviceId: skinFade.id, barberId, date, time: firstFree.time,
  name: 'Second Customer', email: 'second@mail.com', phone: '07700 900456',
});
assert(r2.status === 409, `double booking rejected with 409 (got ${r2.status})`);

// --- That barber's availability now shows the slot as taken ---
r = await req('GET', `/api/availability?date=${date}&barberId=${barberId}&serviceId=${skinFade.id}`);
const slotNow = r.data?.slots?.find((s) => s.time === firstFree.time);
assert(slotNow && slotNow.available === false, 'booked barber slot is unavailable afterwards');

// --- Qualification rules: braids bookable only with qualified stylists ---
r = await req('GET', `/api/availability?date=${date}&serviceId=${boxBraids.id}&barberId=${marcusId}`);
assert(r.status === 400, `unqualified stylist blocked from availability (400, got ${r.status})`);
const braidsAvail = await req('GET', `/api/availability?date=${date}&serviceId=${boxBraids.id}`);
const braidsSlot = braidsAvail.data.slots.find((s) => s.available);
assert(!!braidsSlot, 'box braids exposes available slots');
r = await req('POST', '/api/bookings', { serviceId: boxBraids.id, barberId: null, date, time: braidsSlot.time, name: 'Braids Customer', email: 'braids@mail.com', phone: '07700 900777' });
assert(r.status === 201 && r.data.barber.name === 'Amara Mensah', `no-preference braids booking auto-assigned to the specialist (${r.data?.barber?.name})`);
const [bh, bm] = braidsSlot.time.split(':').map(Number);
const endMin = bh * 60 + bm + boxBraids.durationMinutes;
const endStr = String(Math.floor(endMin / 60)).padStart(2, '0') + ':' + String(endMin % 60).padStart(2, '0');
assert(r.data.endTime === endStr, `braids end time respects ${boxBraids.durationMinutes}-min duration (${r.data.endTime})`);
r = await req('POST', '/api/bookings', { serviceId: boxBraids.id, barberId: dannyId, date, time: braidsSlot.time, name: 'Wrong Stylist', email: 'wrong@mail.com', phone: '07700 900888' });
assert(r.status === 400, `booking with unqualified stylist rejected (400, got ${r.status})`);

// --- Lookup now requires reference AND matching email (no PII oracle) ---
r = await req('POST', '/api/bookings/lookup', { reference: ref, email: 'tester@mail.com' });
assert(r.status === 200 && r.data.reference === ref, 'lookup with correct email succeeds');
r = await req('POST', '/api/bookings/lookup', { reference: ref, email: 'attacker@evil.com' });
assert(r.status === 404, `lookup with wrong email reveals nothing (404, got ${r.status})`);
r = await req('POST', '/api/bookings/lookup', { reference: 'CC-AAAAAA', email: 'tester@mail.com' });
assert(r.status === 404, 'unknown reference returns the same 404');

// --- Sunday must be closed ---
let sunday = new Date(Date.now() + 86400000);
for (let i = 1; i <= 10; i++) {
  const x = new Date(Date.now() + i * 86400000);
  if (x.getUTCDay() === 0) { sunday = x; break; }
}
r = await req('GET', `/api/availability?date=${iso(sunday)}`);
assert(r.status === 200 && r.data.closed === true && r.data.slots.length === 0, `Sunday ${iso(sunday)} is closed`);

// --- Validation & input limits ---
r = await req('POST', '/api/bookings', { serviceId: skinFade.id, date, time: '09:00', name: '', email: 'bad', phone: '1' });
assert(r.status === 400, `bad customer details rejected (${r.status})`);
r = await req('POST', '/api/bookings', { serviceId: 999, date, time: '09:00', name: 'X Y', email: 'x@y.com', phone: '07700900000' });
assert(r.status === 400, `unknown service rejected (${r.status})`);
r = await req('POST', '/api/bookings', { serviceId: skinFade.id, date, time: '09:07', name: 'X Y', email: 'x@y.com', phone: '07700900000' });
assert(r.status === 400, `off-grid time rejected (${r.status})`);
r = await req('POST', '/api/bookings', { serviceId: skinFade.id, date, time: '09:00', name: 'A'.repeat(120), email: 'x@y.com', phone: '07700900000' });
assert(r.status === 400, `over-long name rejected (${r.status})`);
r = await req('POST', '/api/bookings', { serviceId: skinFade.id, date, time: '09:00', name: 'X Y', email: 'x@y..com', phone: '07700900000' });
assert(r.status === 400, `malformed email (consecutive dots) rejected (${r.status})`);

// --- Request body cap (64 KB) ---
r = await req('POST', '/api/contact', { name: 'Jane Doe', email: 'jane@mail.com', message: 'x'.repeat(100_000) });
assert(r.status === 413, `oversized body rejected with 413 (got ${r.status})`);

// --- Newsletter + contact ---
r = await req('POST', '/api/newsletter', { email: 'offer@mail.com', source: 'offer-modal' });
assert(r.status === 200 && r.data.ok === true, 'newsletter signup');
r = await req('POST', '/api/newsletter', { email: 'offer@mail.com', source: 'offer-modal' });
assert(r.status === 200 && /already/i.test(r.data.message || ''), 'newsletter duplicate handled');
r = await req('POST', '/api/newsletter', { email: 'not-an-email' });
assert(r.status === 400, 'newsletter bad email rejected');

r = await req('POST', '/api/contact', { name: 'Jane Doe', email: 'jane@mail.com', message: 'Do you take walk-ins on Saturdays?' });
assert(r.status === 202 && r.data.ok === true, 'contact message accepted');
r = await req('POST', '/api/contact', { name: 'J', email: 'bad', message: 'short' });
assert(r.status === 400, 'contact validation rejects bad input');

// --- Rate limiting: burn the 10/hour "forms" budget, expect 429 ---
let lastStatus = 0;
for (let i = 0; i < 8; i++) {
  const probe = await req('POST', '/api/newsletter', { email: `probe${i}@mail.com` });
  lastStatus = probe.status;
}
assert(lastStatus === 429, `form endpoint rate-limits with 429 (last status ${lastStatus})`);

console.log(failed ? '\nSMOKE TEST FAILED' : '\nALL SMOKE + SECURITY TESTS PASSED');
process.exit(failed ? 1 : 0);
