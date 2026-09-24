import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DateTime } from 'luxon';
import PageHero, { usePageTitle } from '../components/PageHero';
import CalendarButtons from '../components/CalendarButtons';
import {
  api,
  ApiError,
  errorMessage,
  type Availability,
  type Barber,
  type BookingResponse,
  type Service,
} from '../lib/api';
import { formatLongDate, formatPrice } from '../lib/calendar';
import { useShop } from '../context/ShopContext';

type Step = 1 | 2 | 3 | 4;

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: 'Service' },
  { n: 2, label: 'Barber' },
  { n: 3, label: 'Date & Time' },
  { n: 4, label: 'Your Details' },
];

interface FormState {
  name: string;
  email: string;
  phone: string;
  notes: string;
  agree: boolean;
}

const EMPTY_FORM: FormState = { name: '', email: '', phone: '', notes: '', agree: false };

/** Build the next 21 days (shop-local) for the date picker. */
function buildDateOptions(timezone: string): string[] {
  const today = DateTime.now().setZone(timezone).startOf('day');
  return Array.from({ length: 21 }, (_, i) => today.plus({ days: i }).toISODate()!).filter(Boolean);
}

/** First date that isn't a Sunday (shop closed). */
function firstOpenDate(timezone: string): string {
  const today = DateTime.now().setZone(timezone).startOf('day');
  for (let i = 0; i < 22; i++) {
    const candidate = today.plus({ days: i });
    if (candidate.weekday !== 7) return candidate.toISODate()!;
  }
  return today.toISODate()!;
}

export default function Booking() {
  usePageTitle('Book an Appointment');
  const SHOP = useShop();
  const [searchParams] = useSearchParams();

  // Catalogue
  const [services, setServices] = useState<Service[] | null>(null);
  const [barbers, setBarbers] = useState<Barber[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // Wizard state
  const [step, setStep] = useState<Step>(1);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [barberChoice, setBarberChoice] = useState<number | 'any'>('any');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [barberNote, setBarberNote] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);

  // Availability
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [availLoading, setAvailLoading] = useState(false);
  const [availError, setAvailError] = useState<string | null>(null);
  const [availRefreshKey, setAvailRefreshKey] = useState(0);

  // Details form + submission
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingResponse | null>(null);

  const dateOptions = useMemo(() => buildDateOptions(SHOP.timezone), [SHOP.timezone]);

  // Show the 21-day window one week at a time so the strip never
  // overflows the wizard panel (previously 21 chips forced page-wide scroll).
  const WEEK_SIZE = 7;
  const [weekOffset, setWeekOffset] = useState(0);
  const weekCount = Math.max(1, Math.ceil(dateOptions.length / WEEK_SIZE));
  const safeWeek = Math.min(weekOffset, weekCount - 1);
  const visibleDates = useMemo(
    () => dateOptions.slice(safeWeek * WEEK_SIZE, safeWeek * WEEK_SIZE + WEEK_SIZE),
    [dateOptions, safeWeek],
  );

  const selectedService = useMemo(
    () => services?.find((s) => s.id === serviceId) ?? null,
    [services, serviceId],
  );
  const selectedBarber = useMemo(
    () => (barberChoice === 'any' ? null : barbers?.find((b) => b.id === barberChoice) ?? null),
    [barbers, barberChoice],
  );

  const categories = useMemo(
    () => Array.from(new Set((services ?? []).map((s) => s.category))),
    [services],
  );

  const visibleServices = useMemo(
    () =>
      categoryFilter === 'All'
        ? services ?? []
        : (services ?? []).filter((s) => s.category === categoryFilter),
    [services, categoryFilter],
  );

  /** Staff qualified for the chosen service (everyone, until one is chosen). */
  const qualifiedBarbers = useMemo(() => {
    if (!barbers) return [];
    if (!selectedService) return barbers;
    return barbers.filter((b) => selectedService.barberIds.includes(b.id));
  }, [barbers, selectedService]);

  const estimatedEndTime = useMemo(() => {
    if (!date || !time || !selectedService) return null;
    const start = DateTime.fromISO(`${date}T${time}`, { zone: SHOP.timezone });
    if (!start.isValid) return null;
    return start.plus({ minutes: selectedService.durationMinutes }).toFormat('HH:mm');
  }, [date, time, selectedService]);

  // ------------------------------------------------------------------
  // Load services & barbers; apply ?service= / ?barber= deep links
  // ------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    setLoadError(null);

    (async () => {
      try {
        const [svc, brb] = await Promise.all([api.getServices(), api.getBarbers()]);
        if (cancelled) return;
        setServices(svc);
        setBarbers(brb);

        const serviceSlug = searchParams.get('service');
        const barberSlug = searchParams.get('barber');
        const matchedService = serviceSlug ? svc.find((s) => s.slug === serviceSlug) : undefined;
        const matchedBarber = barberSlug ? brb.find((b) => b.slug === barberSlug) : undefined;

        if (matchedService) setServiceId(matchedService.id);

        const barberQualified =
          !!matchedBarber &&
          (!matchedService || matchedService.barberIds.includes(matchedBarber.id));

        if (matchedBarber) {
          if (barberQualified) setBarberChoice(matchedBarber.id);
          else
            setBarberNote(
              `${matchedBarber.name} doesn't offer ${matchedService?.name ?? 'that service'}, so we've reset your stylist choice.`,
            );
        }

        if (matchedService) setStep(matchedService && barberQualified ? 3 : 2);
        else if (matchedBarber) setStep(2);
      } catch (e) {
        if (!cancelled) setLoadError(errorMessage(e));
      }
    })();

    return () => {
      cancelled = true;
    };
    // Runs once on mount and whenever the user hits "try again".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey]);

  // If the chosen stylist isn't qualified for the chosen service, reset.
  useEffect(() => {
    if (!selectedService || !barbers || barberChoice === 'any') return;
    if (!selectedService.barberIds.includes(barberChoice)) {
      const name = barbers.find((b) => b.id === barberChoice)?.name ?? 'That stylist';
      setBarberChoice('any');
      setBarberNote(
        `${name} doesn't offer ${selectedService.name}, so we've reset your stylist choice.`,
      );
    }
  }, [selectedService, barberChoice, barbers]);

  // Pick a sensible default date when entering step 3.
  useEffect(() => {
    if (step === 3 && !date) setDate(firstOpenDate(SHOP.timezone));
  }, [step, date]);

  // Keep the visible week in sync when the selected date moves
  // (e.g. the default date) and clamp the pager to the 21-day window.
  useEffect(() => {
    if (!date) return;
    const idx = dateOptions.indexOf(date);
    if (idx >= 0) setWeekOffset(Math.floor(idx / WEEK_SIZE));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, dateOptions]);

  // ------------------------------------------------------------------
  // Fetch availability whenever date / barber / service changes
  // ------------------------------------------------------------------
  useEffect(() => {
    if (step !== 3 || !date || !serviceId) return;

    let cancelled = false;
    setAvailLoading(true);
    setAvailError(null);

    (async () => {
      try {
        const result = await api.getAvailability(
          date,
          barberChoice === 'any' ? null : barberChoice,
          serviceId,
        );
        if (cancelled) return;
        setAvailability(result);
        // Drop the selected time if it's no longer free.
        setTime((prev) =>
          prev && result.slots.some((s) => s.time === prev && s.available) ? prev : null,
        );
      } catch (e) {
        if (!cancelled) {
          setAvailError(errorMessage(e));
          setAvailability(null);
        }
      } finally {
        if (!cancelled) setAvailLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [step, date, barberChoice, serviceId, availRefreshKey]);

  // ------------------------------------------------------------------
  // Details form
  // ------------------------------------------------------------------
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (form.name.trim().length < 2) errors.name = 'Please enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim()))
      errors.email = 'Please enter a valid email address.';
    if (form.phone.replace(/\D/g, '').length < 7)
      errors.phone = 'Please enter a valid phone number.';
    if (form.notes.length > 500) errors.notes = 'Notes must be under 500 characters.';
    if (!form.agree) errors.agree = 'Please accept the booking terms to continue.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !selectedService || !date || !time) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await api.createBooking({
        serviceId: selectedService.id,
        barberId: barberChoice === 'any' ? null : barberChoice,
        date,
        time,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        notes: form.notes.trim() || undefined,
      });
      setBooking(res);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setSubmitError(errorMessage(err));
      // Slot taken while we were filling in details: back to step 3, refreshed.
      if (err instanceof ApiError && err.status === 409) {
        setTime(null);
        setAvailRefreshKey((k) => k + 1);
        setStep(3);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetWizard = () => {
    setBooking(null);
    setServiceId(null);
    setBarberChoice('any');
    setDate(null);
    setTime(null);
    setAvailability(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setSubmitError(null);
    setCategoryFilter('All');
    setBarberNote(null);
    setStep(1);
  };

  const canJumpTo = (target: Step): boolean => {
    if (target === 1) return true;
    if (target === 2) return !!serviceId;
    if (target === 3) return !!serviceId;
    return !!serviceId && !!date && !!time;
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <>
      <PageHero
        eyebrow="Book your chair"
        title="Book an Appointment"
        intro="Pick your service, your barber and your time. You'll be able to add the appointment straight to your calendar when you're done."
        image="/images/interior.jpg"
        imageAlt="The Crown & Clipper shop floor"
      />

      <section className="section booking-section">
        <div className="container">
          {loadError && (
            <div className="alert alert-error" role="alert">
              <p>{loadError}</p>
              <div className="alert-actions">
                <button type="button" className="btn btn-dark btn-sm" onClick={() => setRetryKey((k) => k + 1)}>
                  Try again
                </button>
                <a className="btn btn-outline-dark btn-sm" href={SHOP.phoneHref}>
                  Call {SHOP.phoneDisplay}
                </a>
              </div>
            </div>
          )}

          {booking ? (
            /* ---------------- CONFIRMATION ---------------- */
            <div className="booking-confirmation">
              <div className="confirmation-check" aria-hidden="true">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 12.5 9.5 18 20 6.5" />
                </svg>
              </div>
              <p className="eyebrow eyebrow-center eyebrow-gold">Appointment confirmed</p>
              <h2 className="confirmation-title">You're booked{booking.customer.name ? `, ${booking.customer.name.split(' ')[0]}` : ''}!</h2>
              <p className="confirmation-reference">
                Booking reference <strong>{booking.reference}</strong>
              </p>

              <div className="confirmation-card">
                <div className="confirmation-row">
                  <span>Service</span>
                  <strong>
                    {booking.service.name} · {formatPrice(booking.service.price)}
                  </strong>
                </div>
                <div className="confirmation-row">
                  <span>Barber</span>
                  <strong>{booking.barber.name}</strong>
                </div>
                <div className="confirmation-row">
                  <span>Date</span>
                  <strong>{formatLongDate(booking.date)}</strong>
                </div>
                <div className="confirmation-row">
                  <span>Time</span>
                  <strong>
                    {booking.startTime} – {booking.endTime} ({booking.service.durationMinutes} min)
                  </strong>
                </div>
                <div className="confirmation-row">
                  <span>Where</span>
                  <strong>
                    <a href={SHOP.mapLink} target="_blank" rel="noopener noreferrer">
                      {booking.shop.addressLine}, {booking.shop.city} {booking.shop.postcode}
                    </a>
                  </strong>
                </div>
                <div className="confirmation-row">
                  <span>Questions?</span>
                  <strong>
                    <a href={SHOP.phoneHref}>{SHOP.phoneDisplay}</a>
                  </strong>
                </div>
              </div>

              <CalendarButtons booking={booking} />

              <p className="confirmation-fineprint">
                Please arrive 5 minutes early. Need to change or cancel? Give us at least 24
                hours' notice on {SHOP.phoneDisplay}. A confirmation email is on its way to{' '}
                {booking.customer.email}.
              </p>

              <div className="confirmation-actions">
                <button type="button" className="btn btn-outline-dark" onClick={resetWizard}>
                  Book another appointment
                </button>
                <Link to="/services" className="btn btn-gold">
                  Back to services
                </Link>
              </div>
            </div>
          ) : !loadError ? (
            /* ---------------- WIZARD ---------------- */
            <div className="booking-layout">
              <div className="booking-main">
                {/* Progress */}
                <ol className="wizard-steps" aria-label="Booking progress">
                  {STEPS.map((s) => (
                    <li
                      key={s.n}
                      className={`wizard-step ${step === s.n ? 'current' : ''} ${step > s.n ? 'done' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() => canJumpTo(s.n) && setStep(s.n)}
                        disabled={!canJumpTo(s.n) || step === s.n}
                        aria-current={step === s.n ? 'step' : undefined}
                      >
                        <span className="wizard-step-num" aria-hidden="true">
                          {s.n}
                        </span>
                        <span className="wizard-step-label">{s.label}</span>
                      </button>
                    </li>
                  ))}
                </ol>

                {submitError && (
                  <div className="alert alert-error" role="alert">
                    <p>{submitError}</p>
                  </div>
                )}

                {/* STEP 1 - SERVICE */}
                {step === 1 && (
                  <div className="wizard-panel">
                    <h2 className="wizard-title">Choose your service</h2>
                    {services ? (
                      <>
                      <div className="chip-row" role="group" aria-label="Filter services by type">
                        {['All', ...categories].map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            className={`chip ${categoryFilter === cat ? 'selected' : ''}`}
                            aria-pressed={categoryFilter === cat}
                            onClick={() => setCategoryFilter(cat)}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      <div className="select-list" role="radiogroup" aria-label="Services">
                        {visibleServices.map((service) => (
                          <button
                            key={service.id}
                            type="button"
                            role="radio"
                            aria-checked={serviceId === service.id}
                            className={`select-item ${serviceId === service.id ? 'selected' : ''}`}
                            onClick={() => {
                              setServiceId(service.id);
                              setBarberNote(null);
                            }}
                          >
                            <span className="select-item-main">
                              <span className="select-item-name">
                                {service.name}
                                {service.isPopular && <span className="badge badge-gold badge-sm">Popular</span>}
                              </span>
                              <span className="select-item-desc">{service.description}</span>
                            </span>
                            <span className="select-item-side">
                              <span className="select-item-price">{formatPrice(service.price)}</span>
                              <span className="select-item-duration">{service.durationMinutes} min</span>
                            </span>
                          </button>
                        ))}
                      </div>
                      </>
                    ) : (
                      <div className="skeleton-list" role="status" aria-label="Loading services">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <span key={i} className="skeleton skeleton-row" />
                        ))}
                      </div>
                    )}
                    <div className="wizard-nav">
                      <span />
                      <button
                        type="button"
                        className="btn btn-gold"
                        disabled={!serviceId}
                        onClick={() => setStep(2)}
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2 - BARBER */}
                {step === 2 && (
                  <div className="wizard-panel">
                    <h2 className="wizard-title">Choose your barber or stylist</h2>
                    {barberNote && (
                      <p className="slots-message" role="status">
                        {barberNote} Only stylists qualified for {selectedService?.name ?? 'your service'} are shown below.
                      </p>
                    )}
                    {barbers ? (
                      <div className="select-list" role="radiogroup" aria-label="Barbers">
                        <button
                          type="button"
                          role="radio"
                          aria-checked={barberChoice === 'any'}
                          className={`select-item ${barberChoice === 'any' ? 'selected' : ''}`}
                          onClick={() => setBarberChoice('any')}
                        >
                          <span className="select-item-main">
                            <span className="select-item-name">No preference</span>
                            <span className="select-item-desc">
                              We'll assign the first free stylist qualified for{' '}
                              {selectedService?.name ?? 'your service'}.
                            </span>
                          </span>
                          <span className="select-item-side">
                            <span className="select-item-price">Fastest</span>
                          </span>
                        </button>
                        {qualifiedBarbers.map((barber: Barber) => (
                          <button
                            key={barber.id}
                            type="button"
                            role="radio"
                            aria-checked={barberChoice === barber.id}
                            className={`select-item select-item-barber ${barberChoice === barber.id ? 'selected' : ''}`}
                            onClick={() => setBarberChoice(barber.id)}
                          >
                            <img
                              className="select-item-photo"
                              src={barber.photoUrl}
                              alt={barber.name}
                              loading="lazy"
                              decoding="async"
                              width="56"
                              height="56"
                            />
                            <span className="select-item-main">
                              <span className="select-item-name">{barber.name}</span>
                              <span className="select-item-desc">
                                {barber.title} · {barber.specialties.join(', ')}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="skeleton-list" role="status" aria-label="Loading barbers">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <span key={i} className="skeleton skeleton-row" />
                        ))}
                      </div>
                    )}
                    <div className="wizard-nav">
                      <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
                        Back
                      </button>
                      <button type="button" className="btn btn-gold" onClick={() => setStep(3)}>
                        Continue
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3 - DATE & TIME */}
                {step === 3 && (
                  <div className="wizard-panel">
                    <h2 className="wizard-title">Pick a date &amp; time</h2>
                    <p className="wizard-subtitle">
                      All times are South African Standard Time (SAST). Same-day bookings need at least one hour's notice.
                    </p>

                    <div className="date-nav">
                      <button
                        type="button"
                        className="btn btn-outline-dark btn-sm"
                        onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
                        disabled={safeWeek === 0}
                        aria-label="Show previous week"
                      >
                        ← Prev week
                      </button>
                      <span className="date-nav-label" role="status">
                        Week {safeWeek + 1} of {weekCount}
                      </span>
                      <button
                        type="button"
                        className="btn btn-outline-dark btn-sm"
                        onClick={() => setWeekOffset((w) => Math.min(weekCount - 1, w + 1))}
                        disabled={safeWeek >= weekCount - 1}
                        aria-label="Show next week"
                      >
                        Next week →
                      </button>
                    </div>

                    <div className="date-strip" role="group" aria-label="Choose a date">
                      {visibleDates.map((iso) => {
                        const dt = DateTime.fromISO(iso);
                        const isSunday = dt.weekday === 7;
                        const selected = date === iso;
                        return (
                          <button
                            key={iso}
                            type="button"
                            className={`date-chip ${selected ? 'selected' : ''} ${isSunday ? 'closed' : ''}`}
                            onClick={() => !isSunday && setDate(iso)}
                            disabled={isSunday}
                            aria-pressed={selected}
                            title={isSunday ? 'Closed on Sundays' : dt.toFormat('cccc d LLLL')}
                          >
                            <span className="date-chip-day">{dt.toFormat('EEE')}</span>
                            <span className="date-chip-num">{dt.toFormat('d')}</span>
                            <span className="date-chip-month">{dt.toFormat('LLL')}</span>
                          </button>
                        );
                      })}
                    </div>

                    {availLoading && (
                      <div className="skeleton-slots" role="status" aria-label="Loading available times">
                        {Array.from({ length: 12 }, (_, i) => (
                          <span key={i} className="skeleton skeleton-slot" />
                        ))}
                      </div>
                    )}

                    {!availLoading && availError && (
                      <div className="alert alert-error" role="alert">
                        <p>{availError}</p>
                        <div className="alert-actions">
                          <button
                            type="button"
                            className="btn btn-dark btn-sm"
                            onClick={() => setAvailRefreshKey((k) => k + 1)}
                          >
                            Try again
                          </button>
                        </div>
                      </div>
                    )}

                    {!availLoading && !availError && availability && (
                      <>
                        {availability.closed || availability.past ? (
                          <p className="slots-message">{availability.message}</p>
                        ) : (
                          <>
                            <div className="slots-grid" role="group" aria-label="Available times">
                              {availability.slots.map((slot) => (
                                <button
                                  key={slot.time}
                                  type="button"
                                  className={`slot-btn ${time === slot.time ? 'selected' : ''}`}
                                  disabled={!slot.available}
                                  aria-pressed={time === slot.time}
                                  title={slot.available ? `Book ${slot.time}` : 'Unavailable'}
                                  onClick={() => setTime(slot.time)}
                                >
                                  {slot.time}
                                </button>
                              ))}
                            </div>
                            {availability.slots.every((s) => !s.available) && (
                              <p className="slots-message">
                                Fully booked on this date. Please try another day.
                              </p>
                            )}
                          </>
                        )}
                      </>
                    )}

                    <div className="wizard-nav">
                      <button type="button" className="btn btn-ghost" onClick={() => setStep(2)}>
                        Back
                      </button>
                      <button
                        type="button"
                        className="btn btn-gold"
                        disabled={!time}
                        onClick={() => setStep(4)}
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 4 - DETAILS */}
                {step === 4 && (
                  <div className="wizard-panel">
                    <h2 className="wizard-title">Your details</h2>
                    <p className="wizard-subtitle">
                      We'll use these to confirm your booking and let you know about any changes.
                    </p>
                    <form className="booking-form" onSubmit={onSubmit} noValidate>
                      <div className="form-row">
                        <div className="form-field">
                          <label htmlFor="bk-name">Full name *</label>
                          <input
                            id="bk-name"
                            type="text"
                            autoComplete="name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            aria-invalid={!!formErrors.name}
                            placeholder="e.g. Thabo Mokoena"
                          />
                          {formErrors.name && <p className="form-error-inline" role="alert">{formErrors.name}</p>}
                        </div>
                        <div className="form-field">
                          <label htmlFor="bk-phone">Phone *</label>
                          <input
                            id="bk-phone"
                            type="tel"
                            autoComplete="tel"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            aria-invalid={!!formErrors.phone}
                            placeholder="e.g. 082 123 4567"
                          />
                          {formErrors.phone && <p className="form-error-inline" role="alert">{formErrors.phone}</p>}
                        </div>
                      </div>
                      <div className="form-field">
                        <label htmlFor="bk-email">Email *</label>
                        <input
                          id="bk-email"
                          type="email"
                          autoComplete="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          aria-invalid={!!formErrors.email}
                          placeholder="you@example.co.za"
                        />
                        {formErrors.email && <p className="form-error-inline" role="alert">{formErrors.email}</p>}
                      </div>
                      <div className="form-field">
                        <label htmlFor="bk-notes">
                          Anything we should know? <span className="label-optional">(optional)</span>
                        </label>
                        <textarea
                          id="bk-notes"
                          rows={3}
                          maxLength={500}
                          value={form.notes}
                          onChange={(e) => setForm({ ...form, notes: e.target.value })}
                          placeholder="Hair type, inspiration photos, accessibility needs…"
                        />
                        <p className="char-count">{form.notes.length}/500</p>
                        {formErrors.notes && <p className="form-error-inline" role="alert">{formErrors.notes}</p>}
                      </div>
                      <div className="form-field form-checkbox">
                        <label htmlFor="bk-agree">
                          <input
                            id="bk-agree"
                            type="checkbox"
                            checked={form.agree}
                            onChange={(e) => setForm({ ...form, agree: e.target.checked })}
                            aria-invalid={!!formErrors.agree}
                          />
                          <span>
                            I agree to the{' '}
                            <Link to="/terms" target="_blank">Terms &amp; Conditions</Link>, including
                            the 24-hour cancellation policy. *
                          </span>
                        </label>
                        {formErrors.agree && <p className="form-error-inline" role="alert">{formErrors.agree}</p>}
                      </div>

                      <div className="wizard-nav">
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setStep(3)}
                          disabled={submitting}
                        >
                          Back
                        </button>
                        <button type="submit" className="btn btn-gold" disabled={submitting}>
                          {submitting ? (
                            <>
                              <span className="spinner spinner-dark" aria-hidden="true" /> Confirming…
                            </>
                          ) : (
                            'Confirm booking'
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* SUMMARY SIDEBAR */}
              <aside className="booking-summary" aria-label="Booking summary">
                <h3 className="booking-summary-title">Your appointment</h3>
                <dl className="summary-list">
                  <div className="summary-item">
                    <dt>Service</dt>
                    <dd>
                      {selectedService ? (
                        <>
                          {selectedService.name}
                          <span className="summary-muted">
                            {' '}· {selectedService.durationMinutes} min
                          </span>
                        </>
                      ) : (
                        <span className="summary-muted">Not selected yet</span>
                      )}
                    </dd>
                  </div>
                  <div className="summary-item">
                    <dt>Barber</dt>
                    <dd>
                      {barberChoice === 'any' ? (
                        <span className="summary-muted">First available</span>
                      ) : selectedBarber ? (
                        selectedBarber.name
                      ) : (
                        <span className="summary-muted">Not selected yet</span>
                      )}
                    </dd>
                  </div>
                  <div className="summary-item">
                    <dt>Date</dt>
                    <dd>
                      {date ? (
                        formatLongDate(date)
                      ) : (
                        <span className="summary-muted">Not selected yet</span>
                      )}
                    </dd>
                  </div>
                  <div className="summary-item">
                    <dt>Time</dt>
                    <dd>
                      {time ? (
                        <>
                          {time}
                          {estimatedEndTime && (
                            <span className="summary-muted"> – {estimatedEndTime}</span>
                          )}
                        </>
                      ) : (
                        <span className="summary-muted">Not selected yet</span>
                      )}
                    </dd>
                  </div>
                  <div className="summary-item summary-total">
                    <dt>Total</dt>
                    <dd>{selectedService ? formatPrice(selectedService.price) : 'TBC'}</dd>
                  </div>
                </dl>
                <div className="summary-foot">
                  <p>
                    <strong>{SHOP.name}</strong>
                    <br />
                    <a href={SHOP.mapLink} target="_blank" rel="noopener noreferrer">
                      {SHOP.addressLine}, {SHOP.city} {SHOP.postcode}
                    </a>
                    <br />
                    <a href={SHOP.phoneHref}>{SHOP.phoneDisplay}</a>
                  </p>
                  <p className="summary-offer">
                    First visit? Use code <strong>{SHOP.offerCode}</strong> for 10% off.
                  </p>
                </div>
              </aside>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
