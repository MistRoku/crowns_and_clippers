/**
 * Calendar integration - the heart of the booking experience.
 *
 * Every function below is driven by the customer's ACTUAL selected booking
 * details (service, barber, date, start/end time in the shop's time zone),
 * never a hard-coded appointment:
 *
 *  - googleCalendarUrl()  -> deep link that opens Google Calendar pre-filled
 *  - outlookCalendarUrl() -> deep link for Outlook.com / Outlook app
 *  - buildIcs()           -> RFC 5545 .ics file (Apple Calendar, Outlook
 *                            desktop and any other calendar app)
 */
import { DateTime } from 'luxon';
import type { BookingResponse } from './api';

export interface CalendarBooking {
  reference: string;
  serviceName: string;
  durationMinutes: number;
  barberName: string;
  date: string; // yyyy-MM-dd (shop local)
  startTime: string; // HH:mm (shop local, 24h)
  endTime: string; // HH:mm
  shopName: string;
  address: string;
  phone: string;
  timezone: string; // IANA zone, e.g. Europe/London
  customerName: string;
}

/** Convert an API booking response into calendar-ready details. */
export function toCalendarBooking(b: BookingResponse): CalendarBooking {
  return {
    reference: b.reference,
    serviceName: b.service.name,
    durationMinutes: b.service.durationMinutes,
    barberName: b.barber.name,
    date: b.date,
    startTime: b.startTime,
    endTime: b.endTime,
    shopName: b.shop.name,
    address: b.shop.fullAddress,
    phone: b.shop.phone,
    timezone: b.shop.timezone,
    customerName: b.customer.name,
  };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function startEnd(b: CalendarBooking) {
  const start = DateTime.fromISO(`${b.date}T${b.startTime}`, { zone: b.timezone });
  const end = DateTime.fromISO(`${b.date}T${b.endTime}`, { zone: b.timezone });
  if (!start.isValid || !end.isValid) {
    throw new Error('Invalid booking date/time - could not build the calendar event.');
  }
  return { start, end };
}

function eventTitle(b: CalendarBooking): string {
  return `${b.serviceName} at ${b.shopName} - with ${b.barberName}`;
}

function eventDetails(b: CalendarBooking): string {
  return [
    `Booking reference: ${b.reference}`,
    `Service: ${b.serviceName} (${b.durationMinutes} minutes)`,
    `Barber: ${b.barberName}`,
    `Booked for: ${b.customerName}`,
    '',
    `${b.shopName}, ${b.address}`,
    `Phone: ${b.phone}`,
    '',
    'Please arrive 5 minutes early.',
    'Need to change or cancel? Call us at least 24 hours before your appointment.',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Google Calendar
// ---------------------------------------------------------------------------

/**
 * Google Calendar template link.
 * Times are sent in the shop's local time together with ctz=<IANA zone>, so
 * Google converts them correctly for the customer's own calendar/time zone,
 * including BST/GMT transitions.
 */
export function googleCalendarUrl(b: CalendarBooking): string {
  const { start, end } = startEnd(b);
  const fmt = (dt: DateTime) => dt.toFormat("yyyyMMdd'T'HHmmss");

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: eventTitle(b),
    dates: `${fmt(start)}/${fmt(end)}`,
    ctz: b.timezone,
    details: eventDetails(b),
    location: `${b.shopName}, ${b.address}`,
    sf: 'true',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Outlook (web)
// ---------------------------------------------------------------------------

export function outlookCalendarUrl(b: CalendarBooking): string {
  const { start, end } = startEnd(b);

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    startdt: start.toUTC().toISO({ suppressMilliseconds: true }) ?? '',
    enddt: end.toUTC().toISO({ suppressMilliseconds: true }) ?? '',
    subject: eventTitle(b),
    body: eventDetails(b),
    location: `${b.shopName}, ${b.address}`,
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Apple Calendar / universal .ics file
// ---------------------------------------------------------------------------

/**
 * VTIMEZONE block for the booking's zone. Africa/Johannesburg (SAST) has no
 * daylight saving, so a single STANDARD component is correct; the Europe/London
 * DST rules are kept for any legacy zone.
 */
function vtimezone(tz: string): string[] {
  if (tz === 'Africa/Johannesburg') {
    return [
      'BEGIN:VTIMEZONE',
      `TZID:${tz}`,
      'BEGIN:STANDARD',
      'TZOFFSETFROM:+0200',
      'TZOFFSETTO:+0200',
      'TZNAME:SAST',
      'DTSTART:19700101T000000',
      'END:STANDARD',
      'END:VTIMEZONE',
    ];
  }
  return [
    'BEGIN:VTIMEZONE',
    `TZID:${tz}`,
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:+0000',
    'TZOFFSETTO:+0100',
    'TZNAME:BST',
    'DTSTART:19700329T010000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0000',
    'TZNAME:GMT',
    'DTSTART:19701025T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];
}

function icsEscape(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Fold long content lines to stay within the RFC 5545 75-octet limit. */
function foldLine(line: string): string {
  if (line.length <= 73) return line;
  const parts: string[] = [line.slice(0, 73)];
  let rest = line.slice(73);
  while (rest.length > 0) {
    parts.push(' ' + rest.slice(0, 72));
    rest = rest.slice(72);
  }
  return parts.join('\r\n');
}

/** Build a complete RFC 5545 VCALENDAR document for the booking. */
export function buildIcs(b: CalendarBooking): string {
  const dtstamp = DateTime.utc().toFormat("yyyyMMdd'T'HHmmss'Z'");
  const compact = (v: string) => v.replace(/[-:]/g, '');
  const dtstart = `${compact(b.date)}T${compact(b.startTime)}00`;
  const dtend = `${compact(b.date)}T${compact(b.endTime)}00`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Crown and Clipper Barber Co.//Bookings//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    // Zone rules so the event stays correct for any appointment date
    // for any appointment date (GMT in winter, BST in summer).
    ...vtimezone(b.timezone),
    'BEGIN:VEVENT',
    `UID:${b.reference.toLowerCase()}@crownandclipper.co.za`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=${b.timezone}:${dtstart}`,
    `DTEND;TZID=${b.timezone}:${dtend}`,
    `SUMMARY:${icsEscape(eventTitle(b))}`,
    `LOCATION:${icsEscape(`${b.shopName}, ${b.address}`)}`,
    `DESCRIPTION:${icsEscape(eventDetails(b))}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsEscape(`Your ${b.serviceName} at ${b.shopName} is in 2 hours`)}`,
    'TRIGGER:-PT2H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.map(foldLine).join('\r\n') + '\r\n';
}

/** Generate the .ics file and trigger a download in the browser. */
export function downloadIcs(b: CalendarBooking): void {
  const blob = new Blob([buildIcs(b)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `crown-clipper-${b.reference.toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------------------
// Display formatting
// ---------------------------------------------------------------------------

/** "2026-09-25" -> "Friday 25 September 2026" */
export function formatLongDate(dateIso: string): string {
  const dt = DateTime.fromISO(dateIso);
  return dt.isValid ? dt.toFormat('cccc d LLLL yyyy') : dateIso;
}

/** "2026-09-25" -> "Fri 25 Sep" (date chips in the wizard) */
export function formatShortDate(dateIso: string): { weekday: string; day: string; month: string } {
  const dt = DateTime.fromISO(dateIso);
  return {
    weekday: dt.toFormat('EEE'),
    day: dt.toFormat('d'),
    month: dt.toFormat('LLL'),
  };
}

/** R300 -> "R300"; keeps decimals only when needed (e.g. R300.50). */
export function formatPrice(price: number): string {
  return Number.isInteger(price) ? `R${price}` : `R${price.toFixed(2)}`;
}
