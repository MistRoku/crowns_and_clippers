# Crown & Clipper Barber Co. — Full-Stack Website

A complete, production-style website for a fictional premium barbershop in Johannesburg, South Africa (Gauteng).
Built as a **React + C# (ASP.NET Core)** full-stack application, ready to deploy to
**Netlify (frontend)** and **Render (backend API)**.

> This is a fictional business created for a web development assessment. All names,
> reviews, addresses and company details are invented.

---

## What's inside

| Part     | Tech                                                        | Folder     |
| -------- | ----------------------------------------------------------- | ---------- |
| Frontend | React 18, TypeScript, Vite, React Router, Luxon             | `client/`  |
| Backend  | C# / ASP.NET Core 8 Web API, EF Core, SQLite                | `server/`  |
| Docs     | Installation → build → test → deploy, written for Windows + Zed IDE | `docs/` |

### Features (mapped to the assessment brief)

- **Pages**: Home, Services, About, Contact, Booking, Terms & Conditions, Privacy Policy, 404
- **Brand**: custom SVG logo (crown + crossed scissors emblem), charcoal/cream/brass palette,
  Playfair Display + Libre Franklin typography, consistent imagery
- **Header**: sticky, logo, nav with active states, phone link, gold **Book Now** CTA,
  full-screen mobile menu with scroll lock
- **Footer**: navigation, popular-service quick-book links, address/phone/email, opening
  hours, social links, legal links, copyright
- **Booking system**: 4-step wizard — service type (category chips: cuts, beard & shave,
  braids & styles, packages, kids) → qualified barber/stylist (or "no preference") →
  live date & time availability (30-min grid, opening hours, 1-hour lead time,
  double-booking prevention, stylist-qualification enforcement) → validated customer
  details → confirmation with booking reference
- **Notifications & reminders**: outbox + background scheduler + pluggable email transport
  (SMTP when configured, logged outbox otherwise). Clients get confirmations, cancellations
  and 24 h / 2 h appointment reminders; stylists get chair alerts and a day-ahead digest.
  In-app inbox with header bell + unread badge; admin outbox with statuses and resend.
  Idempotent by dedupe-key, tenant-timezone aware. See [`docs/08-notifications.md`](docs/08-notifications.md)
- **Multi-tenancy + accounts**: multiple barbershops on one deployment (tenant resolved by
  subdomain or shop switcher, data isolated by EF Core query filters), JWT auth with three
  roles per tenant (Customer / Stylist / Admin), customer account with own-bookings and
  24-h cancellation, stylist schedule dashboard, admin dashboard (stats, bookings, inbox,
  newsletter, account management). See [`docs/07-multi-tenancy-auth.md`](docs/07-multi-tenancy-auth.md)
- **Stylist qualifications**: every service links to the staff trained to deliver it
  (e.g. box braids book only with Amara, our braiding & locs specialist); the wizard,
  availability engine and booking API all enforce the links
- **Calendar integration** (required): confirmation screen offers **Google Calendar**,
  **Apple Calendar (.ics download)** and **Outlook** — every event is generated from the
  customer's actual selection (service, barber, date, start/end time, location, reference,
  2-hour reminder), correctly handling the shop's Europe/London time zone (GMT/BST)
- **Popup/modal**: first-visit offer (10% off, code `FIRSTCUT10`) with email capture saved
  via the API, dismissible (X, Esc, backdrop, "no thanks"), shown once via localStorage,
  never interrupts the booking flow
- **Working forms**: booking, contact and newsletter all POST to the C# API with
  server-side validation and friendly error states
- **Responsive**: desktop / tablet / mobile layouts throughout, accessible
  (skip link, ARIA, focus states, reduced-motion support)

### API endpoints

| Method | Route                     | Purpose                                   |
| ------ | ------------------------- | ----------------------------------------- |
| GET    | `/api/health`             | Uptime check                              |
| GET    | `/api/services`           | Service menu                              |
| GET    | `/api/services/{slug}`    | Single service                            |
| GET    | `/api/barbers`            | Barber profiles                           |
| GET    | `/api/shop`               | Business info + weekly opening hours      |
| GET    | `/api/availability`       | Free/booked slots for date+barber+service |
| POST   | `/api/bookings`           | Create a booking (validated, conflict-safe) |
| POST   | `/api/bookings/lookup`    | Look up a booking (reference + owner email) |
| POST   | `/api/newsletter`         | Offer-modal / newsletter email capture    |
| POST   | `/api/contact`            | Contact form messages                     |

Swagger UI is available at `http://localhost:5000/swagger` in development only.

---

## Quick start (full guides in `docs/`)

Prerequisites: **Node.js LTS**, **.NET 8 SDK**, **Zed IDE** — see
[`docs/01-installation.md`](docs/01-installation.md).

```powershell
# Terminal 1 — C# API on http://localhost:5000
cd server\CrownAndClipper.Api
dotnet run

# Terminal 2 — React app on http://localhost:5173
cd client
npm install
npm run dev
```

Open **http://localhost:5173** and book an appointment.

Then follow:

1. [`docs/01-installation.md`](docs/01-installation.md) — install Node, .NET and Zed on Windows
2. [`docs/02-run-locally.md`](docs/02-run-locally.md) — open in Zed, run and explore both apps
3. [`docs/03-deployment.md`](docs/03-deployment.md) — GitHub → Render (API) → Netlify (site)
4. [`docs/04-testing-checklist.md`](docs/04-testing-checklist.md) — full QA before submitting the URL
5. [`docs/05-project-walkthrough.md`](docs/05-project-walkthrough.md) — how every requirement is implemented (for interviews)
6. [`docs/06-security.md`](docs/06-security.md) — threat model, hardening controls and how to verify them
7. [`docs/07-multi-tenancy-auth.md`](docs/07-multi-tenancy-auth.md) — tenants, roles, seeded accounts, deployment config
8. [`docs/08-notifications.md`](docs/08-notifications.md) — reminder scheduler, outbox, email transports, configuration

## Smoke test

With the API running locally:

```powershell
node smoke-test.mjs
```

Runs 44 end-to-end checks: catalogue, availability, booking, double-booking rejection,
Sunday closure, validation, newsletter, contact — plus security probes (headers, CSP,
input sanitising, length limits, 413 body cap, PII-safe lookup, 429 rate limiting).

## Repository layout

```
crown-and-clipper/
├─ client/                     # React + TypeScript (Vite) → Netlify
│  ├─ public/images/           # brand imagery + favicon
│  ├─ src/
│  │  ├─ components/           # Header, Footer, Modal, OfferModal, wizard pieces…
│  │  ├─ data/                 # shop constants + API fallback catalogue
│  │  ├─ lib/                  # api client, calendar (ICS/Google/Outlook), hours
│  │  ├─ pages/                # Home, Services, About, Booking, Contact, Legal, 404
│  │  └─ styles/global.css     # full design system
│  └─ netlify.toml             # build config + SPA redirects
├─ server/CrownAndClipper.Api/ # ASP.NET Core 8 Web API → Render (Docker)
│  ├─ Controllers/             # Services, Barbers, Availability, Bookings, Shop
│  ├─ Data/                    # EF Core context, seeder, opening-hours logic
│  ├─ Models/                  # Entities
│  └─ Dtos/                    # Response shapes
├─ docs/                       # step-by-step guides
├─ Dockerfile                  # for deploying the API
└─ smoke-test.mjs              # end-to-end API tests
```
