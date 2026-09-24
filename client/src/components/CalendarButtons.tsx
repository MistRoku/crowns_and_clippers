import type { BookingResponse } from '../lib/api';
import {
  downloadIcs,
  googleCalendarUrl,
  outlookCalendarUrl,
  toCalendarBooking,
} from '../lib/calendar';

/**
 * The required calendar integration: after a booking is confirmed, the
 * customer can add THAT appointment (their service, barber, date and times)
 * to Google Calendar, Apple Calendar (via .ics) or Outlook.
 */
export default function CalendarButtons({ booking }: { booking: BookingResponse }) {
  const cal = toCalendarBooking(booking);

  return (
    <div className="calendar-actions">
      <p className="calendar-actions-title">
        Never miss it: add this appointment to your calendar
      </p>
      <div className="calendar-actions-buttons">
        <a
          className="btn btn-dark"
          href={googleCalendarUrl(cal)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Google Calendar
        </a>
        <button type="button" className="btn btn-gold" onClick={() => downloadIcs(cal)}>
          Apple Calendar (.ics)
        </button>
        <a
          className="btn btn-outline-dark"
          href={outlookCalendarUrl(cal)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Outlook
        </a>
      </div>
      <p className="calendar-actions-note">
        The event includes your barber, service, reference {booking.reference} and a reminder
        two hours before your appointment.
      </p>
    </div>
  );
}
