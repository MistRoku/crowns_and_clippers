import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHero, { usePageTitle } from '../components/PageHero';
import Reveal from '../components/Reveal';
import SectionHeading from '../components/SectionHeading';
import ServiceCard from '../components/ServiceCard';
import { api, type Service } from '../lib/api';
import { FALLBACK_SERVICES } from '../data/fallback';
import { useShop } from '../context/ShopContext';

const CATEGORIES = ['Cuts', 'Beard & Shave', 'Braids & Styles', 'Packages', 'Kids & Students'] as const;

const GOOD_TO_KNOW = [
  {
    title: 'Walk-ins welcome',
    text: 'Turn up any time we\u2019re open. Booking ahead means zero waiting and the barber you want.',
  },
  {
    title: '24-hour cancellation',
    text: 'Plans change. Give us 24 hours\u2019 notice and we\u2019ll move your slot, no charge, no fuss.',
  },
  {
    title: 'Student friendly',
    text: 'Bring a valid student ID for R180 cuts any weekday before 4pm. Exam-season slots go fast.',
  },
  {
    title: 'Running late?',
    text: 'We hold your chair for 10 minutes. Beyond that we may need to shorten or reschedule the service.',
  },
];

export default function Services() {
  usePageTitle('Services & Prices', 'Classic cuts from R240, skin fades, beard sculpts, hot-towel shaves, braids, locs and packages at Crown & Clipper, Milpark Johannesburg. Prices include VAT.', { path: '/services' });
  const SHOP = useShop();

  const [services, setServices] = useState<Service[]>(FALLBACK_SERVICES);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    api
      .getServices()
      .then((data) => {
        setServices(data);
        setUsingFallback(false);
      })
      .catch(() => setUsingFallback(true));
  }, []);

  const grouped = CATEGORIES.map((category) => ({
    category,
    items: services.filter((s) => s.category === category),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <PageHero
        eyebrow="Services & prices"
        title="The Full Menu"
        intro="Every cut includes a consultation, wash where relevant, and a finish with premium product. Prices include VAT."
        image="/images/tools.jpg"
        imageAlt="Barber tools arranged on a station"
      />

      <section className="section">
        <div className="container">
          {usingFallback && (
            <div className="alert alert-info" role="status">
              <p>
                Showing our standard menu. Live availability will load on the{' '}
                <Link to="/booking">booking page</Link>.
              </p>
            </div>
          )}

          {grouped.map((group, gi) => (
            <div
              key={group.category}
              className="services-category"
              id={group.category.toLowerCase().replace(/[^a-z]+/g, '-')}
            >
              <Reveal>
                <SectionHeading
                  align="left"
                  eyebrow={`${gi + 1} of ${grouped.length}`}
                  title={group.category}
                />
              </Reveal>
              <div className="scroll-row" role="region" tabIndex={0} aria-label={`${group.category} services`}>
                {group.items.map((service) => (
                  <ServiceCard key={service.slug} service={service} />
                ))}
              </div>
            </div>
          ))}

          {/* Signature package highlight */}
          <Reveal>
            <div className="package-banner">
              <div className="package-banner-copy">
                <p className="eyebrow eyebrow-gold">The signature experience</p>
                <h2>The Full Works, R650</h2>
                <p>
                  Ninety unhurried minutes: haircut, beard sculpt, hot-towel shave finish,
                  wash and style. Coffee (or a measure of something stronger) included.
                  The perfect gift: ask about gift cards at the counter.
                </p>
                <Link to="/booking?service=the-full-works" className="btn btn-gold">
                  Book The Full Works
                </Link>
              </div>
              <div className="package-banner-media">
                <img
                  src="/images/gallery-2.jpg"
                  alt="Hot towel treatment during a traditional shave"
                  loading="lazy"
                  decoding="async"
                  width="720"
                  height="520"
                />
              </div>
            </div>
          </Reveal>

          {/* Good to know (scroll row) */}
          <div className="good-to-know">
            <Reveal>
              <SectionHeading eyebrow="Before you book" title="Good to Know" />
            </Reveal>
            <div className="scroll-row scroll-row-wide" role="region" tabIndex={0} aria-label="Booking information">
              {GOOD_TO_KNOW.map((item) => (
                <div key={item.title} className="info-card">
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <Reveal>
            <div className="section-cta">
              <p>
                Not sure what suits you? Book any cut. Every appointment starts with a
                proper consultation.
              </p>
              <Link to="/booking" className="btn btn-gold btn-lg">
                Book an Appointment
              </Link>
              <p className="section-cta-alt">
                Or call <a href={SHOP.phoneHref}>{SHOP.phoneDisplay}</a>
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
