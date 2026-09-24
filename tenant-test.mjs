// Multi-tenancy + RBAC verification for the Crown & Clipper API.
// Usage: node tenant-test.mjs   (expects a FRESH database on http://localhost:5000)
const BASE = process.env.API_BASE || 'http://localhost:5000';
const V = { 'X-Tenant-Slug': 'velvet-fades' };

async function req(method, path, body, headers = {}) {
  const res = await fetch(BASE + path, {
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

// A weekday ~3 days out (Sundays are closed)
let future = new Date(Date.now() + 3 * 86400000);
if (future.getUTCDay() === 0) future = new Date(Date.now() + 4 * 86400000);
const date = future.toISOString().slice(0, 10);

console.log('--- Tenant isolation + RBAC tests ---');

let r = await req('GET', '/api/shop');
assert(r.data.slug === 'crown-and-clipper', `default tenant branding (${r.data.name})`);
r = await req('GET', '/api/shop', null, V);
assert(r.data.slug === 'velvet-fades' && r.data.offerCode === 'VELVET10', `header-resolved tenant (${r.data.name})`);
r = await req('GET', '/api/services');
assert(r.data.length === 13, `tenant 1 catalogue (${r.data.length} services)`);
r = await req('GET', '/api/services', null, V);
assert(r.data.length === 3, `tenant 2 catalogue isolated (${r.data.length} services)`);
r = await req('GET', '/api/barbers', null, V);
assert(r.data.length === 2, `tenant 2 staff isolated (${r.data.length})`);
r = await req('GET', '/api/tenants');
assert(r.data.length === 2 && r.data[0].isDefault, 'tenant directory lists both shops, default first');

// --- Customer journey on tenant 1 ---
r = await req('POST', '/api/auth/register', { name: 'New Customer', email: 'new@mail.com', password: 'sup3r-s3cret!' });
assert(r.status === 201 && r.data.user.role === 'Customer', 'customer self-registration');
const cust = r.data.token;
r = await req('POST', '/api/auth/register', { name: 'New Customer', email: 'new@mail.com', password: 'sup3r-s3cret!' });
assert(r.status === 409, 'duplicate registration rejected per tenant');
r = await req('GET', '/api/me/bookings', null, { Authorization: `Bearer ${cust}` });
assert(r.status === 200 && r.data.length === 0, 'customer lists own bookings (empty)');
r = await req('GET', '/api/staff/schedule?date=' + date, null, { Authorization: `Bearer ${cust}` });
assert(r.status === 403, 'customer blocked from staff area (403)');
r = await req('GET', '/api/admin/stats', null, { Authorization: `Bearer ${cust}` });
assert(r.status === 403, 'customer blocked from admin area (403)');

const svc1 = (await req('GET', '/api/services')).data.find((s) => s.slug === 'skin-fade');
const av1 = await req('GET', `/api/availability?date=${date}&serviceId=${svc1.id}`);
const slot1 = av1.data.slots.find((s) => s.available);
r = await req('POST', '/api/bookings', {
  serviceId: svc1.id, barberId: null, date, time: slot1.time,
  name: 'New Customer', email: 'new@mail.com', phone: '07700 900222',
}, { Authorization: `Bearer ${cust}` });
assert(r.status === 201, `signed-in booking created (${r.data.reference})`);
const myRef = r.data.reference;
r = await req('GET', '/api/me/bookings', null, { Authorization: `Bearer ${cust}` });
assert(r.status === 200 && r.data.length === 1 && r.data[0].reference === myRef, 'booking appears in customer account');
r = await req('POST', `/api/me/bookings/${myRef}/cancel`, null, { Authorization: `Bearer ${cust}` });
assert(r.status === 200, 'customer cancels own booking >24h out');
r = await req('POST', `/api/me/bookings/${myRef}/cancel`, null, { Authorization: `Bearer ${cust}` });
assert(r.status === 400, 'double cancel rejected');

// --- Stylist role ---
r = await req('POST', '/api/auth/login', { email: 'sofia.karim@crownandclipper.co.za', password: 'Stylist!2024' });
assert(r.status === 200 && r.data.user.barberSlug === 'sofia-karim', 'stylist login links to chair');
const sty = r.data.token;
r = await req('GET', `/api/staff/schedule?date=${date}&days=14`, null, { Authorization: `Bearer ${sty}` });
assert(r.status === 200 && Array.isArray(r.data), `stylist schedule loads (${r.data.length} appointments)`);
r = await req('GET', '/api/admin/bookings', null, { Authorization: `Bearer ${sty}` });
assert(r.status === 403, 'stylist blocked from admin area (403)');

// --- Admin role + account management ---
r = await req('POST', '/api/auth/login', { email: 'admin@crownandclipper.co.za', password: 'ChangeMe!2024' });
assert(r.status === 200 && r.data.user.role === 'Admin', 'tenant-1 admin login');
const t1 = r.data.token;
r = await req('GET', '/api/admin/stats', null, { Authorization: `Bearer ${t1}` });
assert(r.status === 200 && typeof r.data.revenueNext7Days === 'number', 'admin stats');
r = await req('GET', '/api/admin/bookings', null, { Authorization: `Bearer ${t1}` });
assert(r.status === 200 && r.data.length === 1 && r.data[0].status === 'Cancelled', 'admin sees tenant bookings incl. cancellation');
r = await req('POST', '/api/admin/users', { name: 'Junior Stylist', email: 'junior@crownandclipper.co.za', password: 'start3r-pass!', role: 'Stylist', barberSlug: 'tommy-vance' }, { Authorization: `Bearer ${t1}` });
assert(r.status === 201 && r.data.role === 'Stylist', 'admin creates stylist account');
r = await req('POST', '/api/admin/users', { name: 'Second Owner', email: 'owner2@crownandclipper.co.za', password: 'start3r-pass!', role: 'Admin' }, { Authorization: `Bearer ${t1}` });
assert(r.status === 201 && r.data.role === 'Admin', 'admin creates admin account');
r = await req('POST', '/api/admin/users', { name: 'No Chair', email: 'nochair@crownandclipper.co.za', password: 'start3r-pass!', role: 'Stylist' }, { Authorization: `Bearer ${t1}` });
assert(r.status === 400, 'stylist account without chair rejected');
const juniorId = (await req('GET', '/api/admin/users', null, { Authorization: `Bearer ${t1}` })).data.find((u) => u.email === 'junior@crownandclipper.co.za').id;
r = await req('POST', `/api/admin/users/${juniorId}/active`, { active: false }, { Authorization: `Bearer ${t1}` });
assert(r.status === 200 && r.data.active === false, 'admin disables account');
r = await req('POST', '/api/auth/login', { email: 'junior@crownandclipper.co.za', password: 'start3r-pass!' });
assert(r.status === 401, 'disabled account cannot sign in');

// --- Cross-tenant guarantees ---
r = await req('GET', '/api/admin/stats', null, { Authorization: `Bearer ${t1}`, ...V });
assert(r.status === 401, 'tenant-1 token rejected on tenant 2');
r = await req('POST', '/api/auth/login', { email: 'admin@velvetfades.co.za', password: 'ChangeMe!2024' });
assert(r.status === 401, 'tenant-2 admin cannot sign in on tenant 1');
r = await req('POST', '/api/auth/login', { email: 'admin@velvetfades.co.za', password: 'ChangeMe!2024' }, V);
assert(r.status === 200, 'tenant-2 admin signs in on their own tenant');
const t2 = r.data.token;
r = await req('GET', '/api/admin/users', null, { Authorization: `Bearer ${t2}`, ...V });
assert(r.status === 200 && r.data.every((u) => u.tenantSlug === 'velvet-fades'), 'tenant-2 user list scoped');

const svc2 = (await req('GET', '/api/services', null, V)).data[0];
const av2 = await req('GET', `/api/availability?date=${date}&serviceId=${svc2.id}`, null, V);
const slot2 = av2.data.slots.find((s) => s.available);
r = await req('POST', '/api/bookings', {
  serviceId: svc2.id, barberId: null, date, time: slot2.time,
  name: 'Velvet Customer', email: 'velvet@mail.com', phone: '07700 900111',
}, V);
assert(r.status === 201 && r.data.shop.slug === 'velvet-fades', `booking lands on tenant 2 with its branding (${r.data.reference})`);
const ref2 = r.data.reference;
r = await req('POST', '/api/bookings/lookup', { reference: ref2, email: 'velvet@mail.com' });
assert(r.status === 404, 'tenant-1 lookup cannot see tenant-2 booking');
r = await req('GET', '/api/admin/bookings', null, { Authorization: `Bearer ${t1}` });
assert(r.status === 200 && r.data.every((b) => b.reference !== ref2), 'tenant-1 admin cannot see tenant-2 booking');
r = await req('GET', '/api/admin/bookings', null, { Authorization: `Bearer ${t2}`, ...V });
assert(r.status === 200 && r.data.length === 1 && r.data[0].reference === ref2, 'tenant-2 admin sees exactly their booking');

console.log(failed ? '\nTENANT TESTS FAILED' : '\nALL TENANT + RBAC TESTS PASSED');
process.exit(failed ? 1 : 0);
