# 06 — Security hardening: threat model and controls

This document records every attack class considered for this stack
(React SPA on Netlify + ASP.NET Core API on Render + SQLite) and the control
that closes it. Verification commands are included so you can prove each
control works on the deployed site.

## 1. Network & transport

| Threat | Control |
| --- | --- |
| Protocol downgrade / cookie-session sniffing | `Strict-Transport-Security` (2 years, includeSubDomains) set by the API outside Development and by Netlify headers; both platforms terminate TLS at the edge |
| Missing/mis-set TLS on custom domains | Platform-enforced HTTPS on Netlify and Render; HSTS tells browsers to never retry over HTTP |
| Client IP spoofing for rate-limit evasion / wrong logging | `UseForwardedHeaders(X-Forwarded-For/Proto)` with `KnownProxies/KnownNetworks` cleared (platform-managed proxy tiers), applied **before** rate limiting |

Verify: `curl -sI https://<api>/api/health | grep -i strict`

## 2. Request-level DoS and abuse

| Threat | Control |
| --- | --- |
| Endpoint hammering, credential/booking brute force, scraping | ASP.NET Core rate limiting: global fixed window **300 req/min per client IP** on every endpoint |
| Booking spam / slot squatting | `booking` policy: **10 POST /api/bookings per IP per hour** |
| Form spam (newsletter, contact) | `forms` policy: **10 posts per IP per hour** |
| Booking-reference guessing | `lookup` policy: **30 per IP per hour** |
| Giant request bodies (memory/disk exhaustion) | Kestrel `MaxRequestBodySize = 64 KB` + early middleware rejecting declared `Content-Length > 64 KB` + `[RequestSizeLimit]` on controllers → clean **413** |
| Slowloris / header-flood | Kestrel `KeepAliveTimeout 60 s`, `RequestHeadersTimeout 30 s`, `MaxRequestLineSize 8 KB` |
| Server fingerprinting | `AddServerHeader = false`; no stack traces ever returned (generic JSON 500 via `UseExceptionHandler`, exception still logged server-side) |

Verify: 12 rapid `POST /api/newsletter` → the last responses are `429` with a JSON message and `Retry-After`-style window reset hourly. `smoke-test.mjs` automates this.

## 3. Input handling (injection, smuggling, stored XSS payloads)

| Threat | Control |
| --- | --- |
| SQL injection | EF Core parameterised queries everywhere; no raw SQL |
| Control-character / ANSI / bidi-override smuggling in stored text | `InputSanitizer` strips control chars, zero-width code points and bidi overrides; collapses whitespace; normalises newlines |
| Over-long fields (storage abuse) | Validate-then-reject (never silent truncation): name ≤ 80, email ≤ 254, phone ≤ 20 chars/15 digits, notes ≤ 500, subject ≤ 120, message ≤ 2000; **database-enforced** via EF `HasMaxLength` on every column |
| Malformed emails / phones / names | Shape validators (regex + digit counts + consecutive-dot rejection) before persistence |
| Stored XSS via booking/contact text | React escapes all rendered values by default; no `dangerouslySetInnerHTML` anywhere; `.ics` output escapes `, ; \` and newlines per RFC 5545; Google/Outlook links are URL-encoded query params |
| Mass assignment / over-posting | Fixed `record` DTOs; entities are never bound from requests |

## 4. Authorisation & data exposure

| Threat | Control |
| --- | --- |
| PII oracle via booking lookup (old `GET /api/bookings/{ref}` returned any booking) | Replaced by `POST /api/bookings/lookup` requiring **reference + the exact email used**; identical 404 for "unknown" and "not yours", so existence is never revealed |
| Guessable references | `RandomNumberGenerator` (CSPRNG), unbiased modulo over a 32-symbol alphabet, uniqueness-checked; the old `Random.Shared` (predictable PRNG) is gone |
| Double-booking race (TOCTOU: two concurrent requests pass the overlap check) | Process-wide `SemaphoreSlim` gate around check-then-insert **plus** a unique index on `(BarberId, Date, StartTime)` as the database backstop; `DbUpdateException` → friendly 409 |
| CORS abuse | Explicit origin allow-list from configuration (local dev + your Netlify URL); no wildcards, no credentials |
| Information leakage on errors | Global exception handler returns one generic JSON message; Swagger compiled out of Production (`IsDevelopment()` gate) |

## 5. Browser-side defence (the React app)

| Threat | Control |
| --- | --- |
| XSS / content injection | Strict **Content-Security-Policy** on Netlify (and served by the API in single-host mode): `script-src 'self'`, no `object-src`, `frame-ancestors 'none'`, fonts/maps allow-listed, `connect-src 'self'` + your API origin. JSON API responses get `default-src 'none'` |
| Clickjacking | `X-Frame-Options: DENY` + `frame-ancestors 'none'` |
| MIME sniffing | `X-Content-Type-Options: nosniff` |
| Referrer leakage | `Referrer-Policy: strict-origin-when-cross-origin` |
| Feature abuse | `Permissions-Policy` disables camera/mic/geolocation/payment/usb |
| Cross-origin leaks | `Cross-Origin-Opener-Policy` + `Cross-Origin-Resource-Policy: same-origin` |
| Open redirect via router | react-router upgraded to ≥ 7.18.4 (advisories GHSA-wrjc-x8rr-h8h6 / GHSA-337j-9hxr-rhxg fixed) |
| Tab-nabbing | Every `target="_blank"` carries `rel="noopener noreferrer"` |
| Malicious third-party content | Only Google Fonts (stylesheets/fonts) and the Google Maps embed are permitted by CSP; no other third-party scripts exist |

## 6. Supply chain

| Threat | Control |
| --- | --- |
| Vulnerable npm packages | `npm audit` clean (0 vulnerabilities): Vite 7 + esbuild ≥ 0.25 (GHSA-67mh-4wv8-2f99 fixed), react-router-dom 7.18+ |
| Unpinned builds | `package-lock.json` committed; NuGet versions pinned in the `.csproj` |
| Secrets in repo | None exist: only `.env.*.example` placeholder templates are committed (real `client/.env*` files are git-ignored); config holds no credentials; CORS origins and `VITE_API_URL` are plain (non-secret, public-in-bundle) settings injected per environment |

## 7. CSRF note

The API is **cookie-less**: no authentication cookies or session tokens exist, so
classic CSRF does not apply. State-changing endpoints accept only
`Content-Type: application/json` from CORS-allowed origins (browsers cannot send
cross-origin JSON without a successful CORS preflight, which unauthorised origins
fail). If cookie auth is ever added, add anti-forgery tokens at the same time.

## 8. Residual risks (accepted, documented)

- **Free-tier cold starts** are availability, not security, but reviewers hitting a
  sleeping container see a slow first response; mitigate with an uptime ping.
- **SQLite single-writer**: the in-process booking gate protects one instance.
  If you scale to multiple API instances, move to Postgres and enforce overlap
  checks with serializable transactions or an exclusion constraint.
- **No authentication by design** (public booking site). The lookup email check is
  deliberately lightweight ownership proof, not login.
- Rate limits are per-IP; determined attackers can rotate IPs. The limits exist to
  stop casual abuse and accidents, not targeted distributed attacks.

## 9. Keeping it secure after deployment

1. Re-run `node smoke-test.mjs` against the live API after every deploy
   (`API_BASE=https://<api> node smoke-test.mjs`).
2. `npm audit` and `dotnet list package --include-transitive` monthly; upgrade on advisories.
3. Keep `AllowedOrigins` exact-match (scheme + host, no trailing slash, no `*`).
4. If you add analytics or any new third-party script, update the CSP in
   `client/netlify.toml` **and** `SecurityHeadersMiddleware.SiteCsp` together.
5. Never enable Swagger or detailed errors outside Development.
6. To rotate the JWT signing key, set a new `JWT_SECRET` value and restart the
   API — all sessions invalidate at once (tokens live max 8 h, so the forced
   re-login window is bounded by design). Password hashes need no migration:
   the `v1$` prefix versions the format for future upgrades.
