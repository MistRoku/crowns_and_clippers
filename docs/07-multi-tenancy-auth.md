# 07 — Multi-tenancy, accounts & role-based access

The platform now hosts **multiple barbershop businesses (tenants)** on one codebase and
one deployment, with **three roles per tenant** controlling what each user sees and does.
The public marketing + booking site stays fully open (no login needed to book), exactly as
the assessment requires. Accounts add power features on top.

## 1. Tenants

| Concept | Implementation |
| --- | --- |
| Tenant record | `Tenants` table: slug, name, tagline, address, phone, email, timezone, offer code, est. year, `IsDefault`, `Active` |
| Resolution order | 1) subdomain (`velvet-fades.example.com`) → 2) `X-Tenant-Slug` request header (the SPA's shop switcher sends it) → 3) default tenant |
| Data isolation | Every tenant-scoped table carries `TenantId`; **EF Core global query filters** scope all reads automatically; writes stamp the resolved tenant |
| Seeded tenants | `crown-and-clipper` (default, full catalogue) and `velvet-fades` (demo second shop with its own services, staff, branding) |
| Switching shops in the UI | Footer "Our shops" buttons (fed by `GET /api/tenants`) or `?tenant=velvet-fades` in the URL; the choice persists in `localStorage` and is sent as `X-Tenant-Slug` |
| Inactive tenant | Explicit subdomain/header for an inactive slug returns 404 JSON |

Branding flows from the tenant: header/footer wordmark, address, phone, hours, offer code
and est. year all come from `GET /api/shop` (ShopContext), so the same build renders each
shop with its own identity.

## 2. Users & roles

| Role | How accounts are created | Sees / can do |
| --- | --- | --- |
| **Customer** | Self-registration at `/register` (rate-limited) | `/account`: own bookings (incl. guest bookings matched by email), add-to-calendar, cancel up to 24 h before start |
| **Stylist** | Seeded per tenant, or created by an admin (must link to a staff profile) | `/staff`: own chair schedule for a 1–14 day window |
| **Admin** | Seeded per tenant, or created by another admin | `/admin`: stats, all bookings + cancel (no 24 h limit), contact inbox, newsletter list, create/disable accounts |

Password storage: PBKDF2-SHA256, 100k iterations, per-user salt, constant-time verify
(`Security/PasswordHasher.cs`). Sessions: JWT (HS256, 8 h) carrying `sub`, `email`, name,
`role`, `tenant` and (for stylists) `barber`.

### Seeded demo credentials (change in production)

| Tenant | Account | Email | Password |
| --- | --- | --- | --- |
| Crown & Clipper | Owner/admin | admin@crownandclipper.co.za | `ChangeMe!2024` |
| Crown & Clipper | Stylists | marcus.reid@ / sofia.karim@ / danny.okafor@ / tommy.vance@ / amara.mensah@ crownandclipper.co.za | `Stylist!2024` |
| Velvet Fades | Owner/admin | admin@velvetfades.co.za | `ChangeMe!2024` |
| Velvet Fades | Stylists | rio.callum@ / nadia.brooks@ velvetfades.co.za | `Stylist!2024` |

## 3. Authorization enforcement (server-side, defence in depth)

1. **Endpoint attributes**: `[Authorize]`, `[Authorize(Roles = Roles.Stylist)]`,
   `[Authorize(Roles = Roles.Admin)]` on Me/Staff/Admin controllers.
2. **Cross-tenant token guard** (middleware): a valid token whose `tenant` claim differs
   from the resolved request tenant is rejected with 401, so tokens never work across shops.
3. **Query filters**: even with a valid token, every query returns only the current
   tenant's rows; ownership checks (`UserId`, `BarberId`) further restrict within a tenant.
4. **Rate limits**: `/api/auth/*` gets its own 20/hour/IP window against brute force.
5. **No existence oracles**: login returns one generic 401 for unknown email, wrong
   password or disabled account.

## 4. Configuration for deployment

Render (API) environment:

- `JWT_SECRET` — **required in Production**; the app refuses to start without it.
  Generate with: `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`
- `AllowedOrigins__0`, `__1`, … — your Netlify URL(s). If you later serve tenants on
  subdomains, add each origin.

Netlify (client): nothing new; the shop switcher and `?tenant=` work on the free tier
because tenant selection travels as a header, not as a host name. True subdomain tenancy
only needs DNS + platform routing pointed at the same sites.

## 5. Verification

```powershell
node smoke-test.mjs    # 44 public-flow + security checks (default tenant)
node tenant-test.mjs   # 35 tenant-isolation + RBAC checks (needs a fresh DB)
```

`tenant-test.mjs` proves, among others: per-tenant catalogues, cross-tenant token
rejection, role gates (403s), disabled-account lockout, admin account management,
cancel-policy enforcement, and that tenant-1 admins cannot see tenant-2 bookings.

## 6. Adding a new tenant

Insert a `TenantDef` in `Data/DbSeeder.cs` (tenant fields, catalogue, staff, starter
accounts) and redeploy; seeding is incremental and idempotent. For production tenants,
create the row + admin account directly (or extend the admin dashboard with a tenant
manager) rather than committing seeds.
