# 08 — Notification system: reminders for clients and staff

Every message the platform sends (confirmations, cancellations, reminders) flows
through one **outbox + scheduler + transport** pipeline, and lands on two channels:

- **Email** (real SMTP when configured; logged outbox otherwise)
- **In-app inbox** (header bell + `/notifications` page) for anyone with an account

## 1. What gets sent, to whom

| Event / window | Client | Stylist |
| --- | --- | --- |
| Booking created | confirmation email + in-app | confirmation email + in-app |
| Booking cancelled (by anyone) | cancellation email + in-app | cancellation email + in-app |
| ~24 h before start | "see you tomorrow" reminder, email + in-app, with Google Calendar link | |
| ~2 h before start | "today at HH:MM" reminder, email + in-app | chair alert with customer name, service and booking notes |
| Every day at 18:00 shop time | | day-ahead digest listing tomorrow's chair, per stylist |

Reminder windows are evaluated in **each tenant's own time zone**, and generation is
idempotent: a `DedupeKey` (kind + channel + booking + recipient + day) with a unique
database index guarantees a reminder can never be sent twice, no matter how often the
scheduler runs.

## 2. Architecture

```
booking lifecycle events ──► ReminderService ──► Notifications table (outbox)
background ReminderWorker ─┘        │            Email rows: Pending
(every Reminders:IntervalMinutes)   │            InApp rows: Sent (inbox) + ReadAt
                                    ▼
                            IEmailSender ── SmtpEmailSender  (SMTP:* configured)
                                    └────── LogEmailSender   (default: logs + outbox UI)
```

- `Services/ReminderService.cs` — scan windows, build messages, dedupe, dispatch with
  up to 3 attempts per email (Pending → Sent / Failed)
- `Services/ReminderWorker.cs` — `BackgroundService` running scan + dispatch for all
  tenants every 5 minutes (configurable)
- `Services/NotificationTemplates.cs` — plain-text bodies with appointment facts,
  address, reference and a ready-made Google Calendar link
- `Services/EmailSenders.cs` — transport abstraction (MailKit SMTP or log/outbox)
- Admin trigger: `POST /api/admin/notifications/run` runs a per-tenant pass immediately
  (used by the dashboard button and the tests)

## 3. Where users see them

- **Header bell** with unread badge (polls every 60 s while signed in), dropdown preview,
  "Mark all read"
- **/notifications** — full inbox per user, expandable message bodies
- **Admin → Notification outbox** — every email/in-app row for the tenant with status
  (Pending/Sent/Failed), attempts, recipient, subject; **Resend** re-queues failed emails;
  **Run reminder scan now** triggers an immediate pass and reports created/dispatched counts
  plus the active transport

## 4. Configuration (Render environment)

| Variable | Purpose | Default |
| --- | --- | --- |
| `SMTP__HOST`, `SMTP__PORT`, `SMTP__USERNAME`, `SMTP__PASSWORD`, `SMTP__FROM` | Enable real email delivery (any SMTP provider: SendGrid, Mailgun, Fastmail…) | unset → log/outbox transport |
| `SITE_BASE_URL` | Base URL used in email links (account management, staff dashboard) | `http://localhost:5173` |
| `Reminders__IntervalMinutes` | Scheduler interval | `5` |

Without SMTP credentials nothing is lost: every reminder is still generated, dispatched
through the log transport, visible in the admin outbox and delivered to in-app inboxes,
so the whole flow is demonstrable and testable.

## 5. Verification

```powershell
node notification-test.mjs   # 19 checks on a fresh DB
```

Covers: 4 confirmation messages per booking (client + stylist × email + in-app), outbox
dispatch, 24 h reminder pair with correct subject, scheduler idempotency, bell unread
counts, mark-all-read, stylist inbox delivery, resend guard (only failed emails), and
cancellation notices to both sides.
