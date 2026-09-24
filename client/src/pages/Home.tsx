import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Reveal from '../components/Reveal';
import SectionHeading from '../components/SectionHeading';
import ServiceCard from '../components/ServiceCard';
import BarberCard from '../components/BarberCard';
import { usePageTitle } from '../components/PageHero';
import { api, type Barber, type Service } from '../lib/api';
import { FALLBACK_BARBERS, FALLBACK_SERVICES } from '../data/fallback';
import { getOpenStatus } from '../lib/hours';
import { useShop } from '../context/ShopContext';

const TRUST_ITEMS = [
  'Master barbers',
  '4.9 out of 5 from 1,200+ reviews',
  'Walk-ins welcome',
  'Open six days a week',
  'Est. 2014',
];

const TESTIMONIALS = [
  {
    quote:
      'Best fade in Johannesburg, full stop. Sofia\u2019s blending is on another level. I wouldn\u2019t let anyone else near my hair.',
    name: 'James O.',
    source: 'Google review',
  },
  {
    quote:
      'Booked online in under a minute, dropped straight into my calendar, walked out sharp. This is how it should be done everywhere.',
    name: 'Priya S.',
    source: 'Google review',
  },
  {
    quote:
      'Took my six-year-old for his first proper cut. Tommy was brilliant with him. Patient, funny, and the result was spot on.',
    name: 'Dan W.',
    source: 'Facebook review',
  },
];

const STATS = [
  { value: '2014', label: 'Established' },
  { value: '40k+', label: 'Cuts and counting' },
  { value: '5', label: 'Barbers & stylists' },
  { value: '4.9/5', label: 'Average rating' },
];

export default function Home() {
  usePageTitle('Premium Barbershop in Johannesburg');
  const SHOP = useShop();
  const openStatus = getOpenStatus(SHOP.hours, SHOP.timezone);

  const [services, setServices] = useState<Service[]>(FALLBACK_SERVICES);
  const [barbers, setBarbers] = useState<Barber[]>(FALLBACK_BARBERS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Live data when the API is reachable; the static mirror otherwise.
    Promise.all([api.getServices(), api.getBarbers()])
      .then(([svc, brb]) => {
        setServices(svc);
        setBarbers(brb);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const popular = services.filter((s) => s.isPopular).slice(0, 4);
  const teasers = popular.length > 0 ? popular : services.slice(0, 3);

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section className="hero">
        <img
          className="hero-img"
          src="/images/hero-main.jpg"
          alt="A barber finishing a precise fade at Crown & Clipper"
          fetchPriority="high"
          decoding="async"
        />
        <div className="hero-scrim" aria-hidden="true" />
        <div className="container hero-content">
          <p className="eyebrow eyebrow-gold">
            {SHOP.city} · Est. {SHOP.founded}
          </p>
          <h1>
            Sharp Cuts.
            <br />
            <em>Timeless</em> Style.
          </h1>
          <p className="hero-sub">
            Traditional barbering with a modern edge. Precision cuts, skin fades, beard
            sculpts and hot-towel shaves, delivered by master barbers on Stanley Avenue.
          </p>
          <div className="hero-actions">
            <Link to="/booking" className="btn btn-gold btn-lg">
              Book an Appointment
            </Link>
            <Link to="/services" className="btn btn-outline-light btn-lg">
              Services &amp; Prices
            </Link>
          </div>
          <div className="hero-meta">
            <span className={`open-pill ${openStatus.isOpen ? 'open' : 'closed'}`}>
              <span className="open-dot" aria-hidden="true" />
              {openStatus.text}
            </span>
            <span className="hero-meta-item">
              <a href={SHOP.phoneHref}>Call {SHOP.phoneDisplay}</a>
            </span>
          </div>
        </div>
      </section>

      {/* ---------------- TRUST STRIP ---------------- */}
      <div className="trust-strip" role="region" tabIndex={0} aria-label="Why customers choose us">
        <div className="container trust-strip-inner">
          {TRUST_ITEMS.map((item) => (
            <span key={item} className="trust-item">
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ---------------- SERVICES TEASER (scroll row) ---------------- */}
      <section className="section">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow="The menu"
              title="Services Worth Rebooking"
              intro="Every service includes a consultation, a finish with premium product, and as much or as little conversation as you like. Scroll for the favourites, or see the full menu."
            />
          </Reveal>
          <div className="scroll-row" role="region" tabIndex={0} aria-label="Popular services">
            {loading
              ? [0, 1, 2].map((i) => <div key={i} className="skeleton skeleton-card" />)
              : teasers.map((service) => (
                  <ServiceCard key={service.slug} service={service} />
                ))}
          </div>
          <Reveal>
            <div className="section-cta">
              <Link to="/services" className="btn btn-outline-dark">
                See all services &amp; prices
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- ABOUT TEASER ---------------- */}
      <section className="section section-alt">
        <div className="container about-teaser">
          <Reveal className="about-teaser-media">
            <img
              src="/images/interior.jpg"
              alt="The Crown & Clipper shop floor with leather chairs and warm lighting"
              loading="lazy"
              decoding="async"
              width="800"
              height="880"
            />
            <div className="about-teaser-badge">
              <span className="badge-number">10+</span>
              <span className="badge-label">years in {SHOP.city}</span>
            </div>
          </Reveal>
          <Reveal delay={120} className="about-teaser-copy">
            <p className="eyebrow">Our story</p>
            <h2>Ten Years of Sharp Cuts</h2>
            <p>
              Crown &amp; Clipper started in 2014 with two chairs, one mirror and a simple
              belief: a great haircut is a craft worth practising daily. A decade later
              we're five chairs strong: four master barbers and a dedicated braiding and
              locs specialist. We still cut by appointment, and we still know our regulars
              by name (and by their exact fade setting).
            </p>
            <p>
              Come for the cut, stay for the coffee, the cricket on the TV and a chair
              that feels like yours.
            </p>
            <div className="stats-row" aria-label="Shop statistics">
              {STATS.map((s) => (
                <div key={s.label} className="stat">
                  <span className="stat-value">{s.value}</span>
                  <span className="stat-label">{s.label}</span>
                </div>
              ))}
            </div>
            <Link to="/about" className="btn btn-dark">
              Meet the barbers
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ---------------- BARBERS (scroll row) ---------------- */}
      <section className="section">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow="The team"
              title="Pick Your Barber"
              intro="Barbers and stylists, each with their own speciality and one shared standard: the sharpest result you've had all year. Scroll to meet them all."
            />
          </Reveal>
          <div className="scroll-row" role="region" tabIndex={0} aria-label="Our barbers">
            {loading
              ? [0, 1, 2, 3].map((i) => <div key={i} className="skeleton skeleton-barber" />)
              : barbers.map((barber) => (
                  <BarberCard key={barber.slug} barber={barber} />
                ))}
          </div>
        </div>
      </section>

      {/* ---------------- TESTIMONIALS (scroll row) ---------------- */}
      <section className="section section-dark">
        <div className="container">
          <Reveal>
            <SectionHeading
              light
              eyebrow="Word on the street"
              title="What the Regulars Say"
            />
          </Reveal>
          <div className="scroll-row scroll-row-wide" role="region" tabIndex={0} aria-label="Customer reviews">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="testimonial-card">
                <blockquote>“{t.quote}”</blockquote>
                <figcaption>
                  {t.name} <span>· {t.source}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- GALLERY ---------------- */}
      <section className="gallery-strip" aria-label="Photos from the shop">
        <img src="/images/gallery-1.jpg" alt="A fresh skin fade being finished with clippers" loading="lazy" decoding="async" width="600" height="450" />
        <img src="/images/gallery-2.jpg" alt="Beard sculpting with a straight razor" loading="lazy" decoding="async" width="600" height="450" />
        <img src="/images/gallery-3.jpg" alt="Barber tools laid out on a leather roll" loading="lazy" decoding="async" width="600" height="450" />
        <img src="/images/tools.jpg" alt="Clippers, scissors and comb on the station" loading="lazy" decoding="async" width="600" height="450" />
      </section>

      {/* ---------------- CTA BAND ---------------- */}
      <section className="cta-band">
        <div className="container cta-band-inner">
          <Reveal>
            <p className="eyebrow eyebrow-gold">Your chair is waiting</p>
            <h2>Ready When You Are</h2>
            <p className="cta-band-sub">
              Book online in under a minute and add it straight to your calendar. Or ring
              us and we'll sort you out the old-fashioned way.
            </p>
            <div className="cta-band-actions">
              <Link to="/booking" className="btn btn-gold btn-lg">
                Book Now
              </Link>
              <a href={SHOP.phoneHref} className="btn btn-outline-light btn-lg">
                {SHOP.phoneDisplay}
              </a>
            </div>
            <p className="cta-band-hours">
              Mon–Fri 9:00–19:00 · Sat 9:00–18:00 · Sun closed · {SHOP.addressLine}, {SHOP.city}
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
