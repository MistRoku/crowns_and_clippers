# 04 — Testing checklist (do this BEFORE you submit the URL)

Work through this on the **deployed** site, on desktop and on a real phone. Tick every box.
The assessment's own test journey is section 1 — everything else protects you from the
small things reviewers notice.

## 1. The required journey (exactly as the brief describes)

- [ ] Open the homepage: hero loads, imagery crisp, CTAs visible
- [ ] Navigate to **Services**: all 13 services show with prices and durations, grouped by category including Braids & Styles
- [ ] From Services, click **Book** on any service → booking page opens on step 2 with that
      service pre-selected (deep link works)
- [ ] Complete the wizard: barber → date → time → details → **Confirm booking**
- [ ] Confirmation shows reference, service, barber, date, start **and end** time, location
- [ ] Click **Google Calendar** (new tab): event pre-filled with the correct title, date,
      start/end times (in the shop's time zone), location and details
- [ ] Click **Apple Calendar (.ics)**: file downloads; open it — event appears with correct
      date/time, 2-hour reminder, reference in the description
- [ ] Click **Outlook**: compose form pre-filled correctly
- [ ] Book a **second** appointment for the same barber + same slot → you get the friendly
      "just booked at that time" message and fresh availability (409 handled)

## 2. Booking logic edge cases

- [ ] Sundays show as **closed** in the date strip and cannot be selected
- [ ] Same-day slots earlier than now + 1 hour are unavailable
- [ ] 90-minute "Full Works" shows fewer end-of-day slots than a 30-min cut (duration-aware grid)
- [ ] "No preference" assigns the first free barber and says who on the confirmation
- [ ] Invalid email / short phone / empty name → inline errors, no crash
- [ ] T&Cs checkbox required before confirming
- [ ] Refreshing mid-wizard doesn't break the page (state resets gracefully)

## 3. Header, footer, navigation

- [ ] Logo visible in header; clicking it goes home
- [ ] All nav links work and show active state on the current page
- [ ] **Book Now** button visible on every page, desktop and mobile
- [ ] Mobile (≤760 px): hamburger opens full-screen menu, closes on link tap and on Book Now
- [ ] Body scroll locked while menu/popup open
- [ ] Footer: nav links, popular services links, address → opens Google Maps, phone → `tel:`,
      email → `mailto:`, hours, socials (open in new tab), Terms, Privacy, copyright year

## 4. Popup / modal

- [ ] First-visit offer appears after a few seconds (fresh browser / private window)
- [ ] Submitting an email shows the success state with code `FIRSTCUT10`
- [ ] Closes via X, Esc key, backdrop click and "No thanks"
- [ ] After dismissal it does **not** reappear on refresh (localStorage)
- [ ] Does not appear on /booking (never interrupts the funnel)

## 5. Forms

- [ ] Contact form: validation errors inline; success message after valid submit
- [ ] Newsletter in offer modal saves via API (check API logs or DB if you can)

## 6. Legal & content

- [ ] /terms loads full Terms & Conditions (16 sections), links to Privacy and booking
- [ ] /privacy loads full Privacy Policy (11 sections)
- [ ] No lorem ipsum, no placeholder text, no "TODO" anywhere
- [ ] Prices/durations consistent between Services page, booking wizard and confirmation

## 7. Responsive & visual QA (375 px / 768 px / 1440 px)

- [ ] No horizontal scrolling on any page (check with DevTools device toolbar)
- [ ] Hero text readable over image at all sizes; buttons stack full-width on mobile
- [ ] Wizard steps, date strip (scrollable), slot grid and summary all usable at 375 px
- [ ] Images never stretched or pixelated; all have meaningful alt text
- [ ] Focus visible when tabbing (gold outline); skip link appears on first Tab
- [ ] Fonts load (Playfair Display + Libre Franklin) — no fallback flash on refresh

## 8. Technical health

- [ ] Browser console: **zero errors** on every page (warnings acceptable if explained)
- [ ] Network tab: no 404s (favicon, images, fonts)
- [ ] Lighthouse (DevTools) mobile: Performance ≥ 80, Accessibility ≥ 90, Best Practices ≥ 90, SEO ≥ 90
- [ ] Page titles update per route; meta description + OG image present (view-source)
- [ ] API health endpoint responds; /swagger is **not** reachable in production
- [ ] Hard refresh on /services, /booking, /terms (SPA redirect works on Netlify)

## 9. Calendar correctness (the graded feature — test thoroughly)

For a booking of **Skin Fade (45 min) at 15:00 on a chosen date**, verify the Google event
and the .ics both say: start 15:00, end **15:45**, same date, title contains "Skin Fade",
"Crown & Clipper" and the barber name, location = 44 Stanley Avenue, Milpark, Johannesburg 2092,
description contains the reference. Repeat once with a winter date (GMT) and a summer date
(BST) if booking far ahead — times must stay correct across the DST change.

## 10. Final submission

- [ ] Copy the Netlify URL, paste into an incognito window on your **phone over mobile data**
      (not your Wi-Fi) — full journey once more
- [ ] Submit **only the URL**, e.g. `https://crown-clipper.netlify.app`
