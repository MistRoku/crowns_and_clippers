# 05 — Project walkthrough: where every requirement lives

Use this when revising the code or explaining decisions in an interview. Every bullet in the
assessment brief maps to concrete files.

## Architecture decisions (and why)

| Decision | Why |
| --- | --- |
| React (Vite + TS) frontend, ASP.NET Core 8 API backend | Required stack; also the industry-standard split: static SPA on a CDN-ish host, JSON API behind it |
| SQLite via EF Core (`EnsureCreated` + seeder) | Zero-setup database that behaves identically locally and in Docker; migrations would be the next step in a real team |
| All shop times computed in `Europe/London` (server `ShopClock`, client `luxon`) | Reviewers may be in any time zone; the appointment must mean "3 PM in Johannesburg", DST-safe |
| Availability generated server-side from opening hours + existing bookings | Single source of truth; the client can't invent or double-book slots |
| Calendar events built **client-side from the booking response** | No secrets needed, works with Google/Apple/Outlook, and the data is exactly what the customer chose |
| Static fallback catalogue (`src/data/fallback.ts`) | Marketing pages still render if the free-tier API is cold; booking always uses live data |

## Requirement → implementation map

**Pages** — `client/src/pages/*.tsx`: Home, Services, About, Contact/Booking split into
`Contact.tsx` + `Booking.tsx`, plus `Terms.tsx`, `Privacy.tsx`, `NotFound.tsx`. Routes in
`client/src/App.tsx`.

**Branding** — Logo: `components/Logo.tsx` (hand-built SVG emblem: crown + crossed
scissors, `currentColor` so it works on dark/light). Palette + type + spacing tokens:
`styles/global.css` `:root` block. Imagery: `public/images/*` (generated to one consistent
grade), alt text everywhere.

**Header** — `components/Header.tsx`: sticky, blur, active nav states, phone link, gold
Book Now; mobile: hamburger → full-screen panel, scroll lock, closes on navigation.

**Footer** — `components/Footer.tsx`: brand + blurb + socials, explore links, popular
service quick-book deep links (`/booking?service=…`), address/phone/email, hours, legal
links, dynamic copyright year.

**Booking system** — `pages/Booking.tsx` (wizard state machine) + `lib/api.ts`
(`createBooking`) + `controllers/BookingsController.cs` (validation, lead time,
double-booking 409, reference generation `CC-XXXXXX`) + `controllers/AvailabilityController.cs`
(30-min grid from `Data/OpeningHours.cs`, per-barber or any-barber availability).

**Calendar integration (required)** — `lib/calendar.ts`:
- `googleCalendarUrl()` — template link with `ctz=Europe/London` so Google converts correctly
- `outlookCalendarUrl()` — Outlook.com deep link with UTC ISO times
- `buildIcs()` / `downloadIcs()` — RFC 5545 file with `VTIMEZONE` (GMT/BST rules), `UID`,
  `DTSTAMP`, 2-hour `VALARM`; line-folding to the 75-octet limit; escaping of `, ; \` newlines
- `components/CalendarButtons.tsx` renders the three actions on the confirmation screen.
Everything derives from `toCalendarBooking(bookingResponse)` — the customer's actual selection.

**Popup/modal** — `components/OfferModal.tsx` + `components/Modal.tsx`: first-visit 10%
offer, email captured via `POST /api/newsletter`, closable (X/Esc/backdrop/no-thanks),
once-per-browser via localStorage, suppressed on `/booking`, `/terms`, `/privacy`.

**Terms & Conditions** — `pages/Terms.tsx`: 16 real sections (bookings, 24-h cancellation,
late arrival, pricing, offers, conduct, liability, governing law…), cross-linked with
Privacy; linked from footer and the booking consent checkbox.

**Responsive** — breakpoints at 1020/760/400 px in `global.css`; wizard, date strip,
slot grid, footer and header all re-flow; `prefers-reduced-motion` respected.

**Functionality & testing** — `smoke-test.mjs` (24 API checks), `docs/04-testing-checklist.md`
(manual QA). No debug output ships: Swagger is `IsDevelopment()`-only; console stays clean.

**Deployment** — `Dockerfile` (Render), `client/netlify.toml` (Netlify SPA + headers),
`docs/03-deployment.md`. Single-origin alternative (API serves the built SPA from
`wwwroot`) is already wired in `Program.cs` and tested.

## Backend tour (`server/CrownAndClipper.Api`)

- `Program.cs` — startup: PORT env binding, EF Core + SQLite, CORS from config,
  dev-only Swagger, static files + SPA fallback, `/api/health`
- `Data/AppDbContext.cs` — entities, unique indexes (service/barber slugs, booking
  reference), decimal→double for SQLite
- `Data/DbSeeder.cs` — 13 services, 5 specialists and the service-to-stylist qualification links (incremental, idempotent)
- `Data/OpeningHours.cs` — `ShopClock` (Europe/London now/today, 60-min lead time),
  weekly hours, slot grid generation, weekly schedule DTO for the frontend
- `Controllers/` — thin, validated endpoints; `BookingsController` assigns the first free
  barber when "no preference", rejects clashes with 409 and human messages

## Frontend tour (`client/src`)

- `lib/api.ts` — typed fetch wrapper with friendly offline/`ApiError` messages
- `lib/calendar.ts` — the calendar engine (see above)
- `lib/hours.ts` — live "Open now — until 19:00" status in shop time
- `data/shop.ts` — one place for address/phone/hours/socials (mirrors `ShopInfo.cs`)
- `components/` — Header, Footer, Logo, Modal, OfferModal, Reveal (scroll animations),
  SectionHeading, PageHero, ServiceCard, BarberCard, CalendarButtons, SocialIcons
- `styles/global.css` — the whole design system: tokens, buttons, cards, wizard, modal,
  legal, 404, responsive rules

## Interview talking points

1. **Time zones are the hidden trap** in booking systems — explain `ShopClock`,
   `ctz=` in Google links and `VTIMEZONE` in the ICS (winter vs summer bookings).
2. **Double-booking**: server-side overlap check (`start < existingEnd && existingStart < end`)
   per barber, 409 → client refreshes slots and keeps the user's progress.
3. **Graceful degradation**: static catalogue fallback, offline API messaging, retry buttons.
4. **Accessibility**: semantic landmarks, radiogroup wizard lists, `aria-pressed` slots,
   focus management in the modal, skip link, reduced motion.
5. **Deployment realism**: CORS origins via environment arrays, SPA redirects, dev-only
   Swagger, immutable image caching, free-tier cold-start mitigation.
