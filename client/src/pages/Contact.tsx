import { useState, type FormEvent } from 'react';
import PageHero, { usePageTitle } from '../components/PageHero';
import Reveal from '../components/Reveal';
import SectionHeading from '../components/SectionHeading';
import { api, errorMessage } from '../lib/api';
import { getOpenStatus } from '../lib/hours';
import { useShop } from '../context/ShopContext';
import { DateTime } from 'luxon';

interface ContactForm {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

const EMPTY: ContactForm = { name: '', email: '', phone: '', subject: '', message: '' };

export default function Contact() {
  usePageTitle('Contact & Find Us');
  const SHOP = useShop();
  const openStatus = getOpenStatus(SHOP.hours, SHOP.timezone);
  const todayIndex = DateTime.now().setZone(SHOP.timezone).weekday - 1;

  const [form, setForm] = useState<ContactForm>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactForm, string>>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [mapActive, setMapActive] = useState(false);

  const validate = (): boolean => {
    const e: Partial<Record<keyof ContactForm, string>> = {};
    if (form.name.trim().length < 2) e.name = 'Please enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim()))
      e.email = 'Please enter a valid email address.';
    if (form.message.trim().length < 10)
      e.message = 'Please write a message (at least 10 characters).';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate() || sending) return;

    setSending(true);
    setSent(null);
    setSendError(null);
    try {
      const res = await api.sendContactMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        subject: form.subject.trim() || undefined,
        message: form.message.trim(),
      });
      setSent(res.message);
      setForm(EMPTY);
    } catch (err) {
      setSendError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Contact & find us"
        title="Come Say Hello"
        intro="Questions about a style, a group booking, or lost property? Call, email or use the form. We reply within one business day."
        image="/images/exterior.jpg"
        imageAlt="The Crown & Clipper storefront on Stanley Avenue"
      />

      {/* Info cards */}
      <section className="section">
        <div className="container">
          <div className="scroll-row scroll-row-wide" role="region" tabIndex={0} aria-label="Contact details">
            <Reveal>
              <div className="info-card info-card-contact">
                <h3>Visit the shop</h3>
                <p>
                  <a href={SHOP.mapLink} target="_blank" rel="noopener noreferrer">
                    {SHOP.addressLine}
                    <br />
                    {SHOP.city} {SHOP.postcode}
                  </a>
                </p>
                <p className="info-card-note">
                  Secure off-street parking behind the gate. The Rea Vaya stop on Oxford
                  Road is a 400 m walk.
                </p>
              </div>
            </Reveal>
            <Reveal delay={90}>
              <div className="info-card info-card-contact">
                <h3>Call or email</h3>
                <p>
                  <a href={SHOP.phoneHref}>{SHOP.phoneDisplay}</a>
                  <br />
                  <a href={`mailto:${SHOP.email}`}>{SHOP.email}</a>
                </p>
                <p className="info-card-note">
                  Phone is the fastest route during opening hours. One of the team is
                  always between chairs.
                </p>
              </div>
            </Reveal>
            <Reveal delay={180}>
              <div className="info-card info-card-contact">
                <h3>
                  Opening hours{' '}
                  <span className={`open-pill-sm ${openStatus.isOpen ? 'open' : 'closed'}`}>
                    {openStatus.isOpen ? 'Open now' : 'Closed'}
                  </span>
                </h3>
                <ul className="hours-list" aria-label="Opening hours">
                  {SHOP.hours.map((h, i) => (
                    <li key={h.day} className={i === todayIndex ? 'today' : ''}>
                      <span>{h.day}</span>
                      <span>{h.open && h.close ? `${h.open} – ${h.close}` : 'Closed'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Form + map */}
      <section className="section section-alt">
        <div className="container contact-split">
          <Reveal className="contact-form-wrap">
            <SectionHeading
              align="left"
              eyebrow="Send a message"
              title="Drop Us a Line"
            />
            {sent ? (
              <div className="alert alert-success" role="status">
                <p>{sent}</p>
                <div className="alert-actions">
                  <button type="button" className="btn btn-outline-dark btn-sm" onClick={() => setSent(null)}>
                    Send another message
                  </button>
                </div>
              </div>
            ) : (
              <form className="booking-form" onSubmit={onSubmit} noValidate>
                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="ct-name">Name *</label>
                    <input
                      id="ct-name"
                      type="text"
                      autoComplete="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      aria-invalid={!!errors.name}
                      placeholder="e.g. Thabo Mokoena"
                    />
                    {errors.name && <p className="form-error-inline" role="alert">{errors.name}</p>}
                  </div>
                  <div className="form-field">
                    <label htmlFor="ct-email">Email *</label>
                    <input
                      id="ct-email"
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      aria-invalid={!!errors.email}
                      placeholder="you@example.co.za"
                    />
                    {errors.email && <p className="form-error-inline" role="alert">{errors.email}</p>}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="ct-phone">
                      Phone <span className="label-optional">(optional)</span>
                    </label>
                    <input
                      id="ct-phone"
                      type="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="082 123 4567"
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="ct-subject">
                      Subject <span className="label-optional">(optional)</span>
                    </label>
                    <input
                      id="ct-subject"
                      type="text"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="e.g. Group booking for a wedding party"
                    />
                  </div>
                </div>
                <div className="form-field">
                  <label htmlFor="ct-message">Message *</label>
                  <textarea
                    id="ct-message"
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    aria-invalid={!!errors.message}
                    placeholder="How can we help?"
                  />
                  {errors.message && <p className="form-error-inline" role="alert">{errors.message}</p>}
                </div>
                {sendError && (
                  <p className="form-error-inline" role="alert">
                    {sendError}
                  </p>
                )}
                <button type="submit" className="btn btn-gold btn-lg" disabled={sending}>
                  {sending ? (
                    <>
                      <span className="spinner spinner-dark" aria-hidden="true" /> Sending…
                    </>
                  ) : (
                    'Send message'
                  )}
                </button>
              </form>
            )}
          </Reveal>

          <Reveal delay={140} className="contact-map-wrap">
            <div className="map-frame">
              {mapActive ? (
                <iframe
                  title="Map showing Crown & Clipper Barber Co. at 44 Stanley Avenue, Johannesburg"
                  src={SHOP.mapEmbedSrc}
                  width="100%"
                  height="420"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              ) : (
                <button
                  type="button"
                  className="map-facade"
                  onClick={() => setMapActive(true)}
                  aria-label="Load interactive map of Crown & Clipper Barber Co., 44 Stanley Avenue, Johannesburg"
                >
                  <span className="map-facade-inner">
                    <strong>{SHOP.addressLine}</strong>
                    <span>
                      {SHOP.city} {SHOP.postcode}
                    </span>
                    <span className="btn btn-dark btn-sm">Load map</span>
                  </span>
                </button>
              )}
            </div>
            <div className="info-card map-note">
              <h3>Getting here</h3>
              <p>
                <strong>Car:</strong> secure off-street parking behind the gate.
                <br />
                <strong>Gautrain:</strong> Sandton station, then a 15-minute ride.
                <br />
                <strong>Bus:</strong> Rea Vaya Oxford Road stop, 400 m away.
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
