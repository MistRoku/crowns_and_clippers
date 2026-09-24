import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHero, { usePageTitle } from '../components/PageHero';
import Reveal from '../components/Reveal';
import SectionHeading from '../components/SectionHeading';
import BarberCard from '../components/BarberCard';
import { api, type Barber } from '../lib/api';
import { FALLBACK_BARBERS } from '../data/fallback';

const VALUES = [
  {
    title: 'Craft',
    text: 'Scissor work, clipper work and razor work, learned properly and practised daily.',
  },
  {
    title: 'Character',
    text: 'Every barber here has their own style and their own regulars, and your bookings stay with them.',
  },
  {
    title: 'Consistency',
    text: 'The same sharp result in January as in July. We check every cut against the mirror twice.',
  },
  {
    title: 'Community',
    text: 'Ten years on Stanley Avenue means we\u2019ve cut grandfathers, oupas and their grandsons. That\u2019s the point.',
  },
];

const TIMELINE = [
  { year: '2014', text: 'Marcus Reid opens a two-chair shop on Stanley Avenue with a borrowed coffee machine.' },
  { year: '2017', text: 'Named Best Barbershop in Johannesburg at the Jozi Readers\u2019 Choice Awards.' },
  { year: '2021', text: 'We knock through next door: four chairs, a traditional shave room and a proper waiting bench.' },
  { year: '2023', text: 'Amara Mensah joins with the shop\u2019s first dedicated braiding and locs chair.' },
  { year: '2024', text: 'Ten years, 40,000+ cuts, and a second generation of regulars walking through the door.' },
];

export default function About() {
  usePageTitle('Our Story & Barbers');

  const [barbers, setBarbers] = useState<Barber[]>(FALLBACK_BARBERS);

  useEffect(() => {
    api.getBarbers().then(setBarbers).catch(() => undefined);
  }, []);

  return (
    <>
      <PageHero
        eyebrow="Our story"
        title="The Shop on Stanley Avenue"
        intro="A decade of sharp cuts, hot towels and good conversation in the heart of Johannesburg."
        image="/images/interior.jpg"
        imageAlt="Inside Crown & Clipper Barber Co."
      />

      {/* Story */}
      <section className="section">
        <div className="container story-grid">
          <Reveal className="story-media">
            <img
              src="/images/gallery-3.jpg"
              alt="Marcus Reid finishing a classic scissor cut"
              loading="lazy"
              decoding="async"
              width="800"
              height="880"
            />
          </Reveal>
          <Reveal delay={120} className="story-copy">
            <p className="eyebrow">Since 2014</p>
            <h2>Started With Two Chairs and a Standard</h2>
            <p>
              Marcus Reid spent ten years cutting hair in London before coming home to
              Johannesburg with one idea: build a barbershop where the craft comes first.
              Proper consultations, proper scissor work, proper hot towels, every single
              appointment.
            </p>
            <p>
              Word travelled the way it does in this city: by haircut. Within three years
              the two chairs became four, Sofia and Danny came on board, and the little shop
              on Stanley Avenue picked up a Jozi Readers' Choice award we still keep on the shelf next to
              the coffee machine.
            </p>
            <p>
              In 2023 Amara Mensah joined with the shop's first dedicated braiding and locs
              chair, and plaiting craft became part of the house standard. Her books now
              fill weeks ahead.
            </p>
            <p>
              Today Tommy keeps the next generation sharp, our books are open six days a
              week, and the standard hasn't moved an inch. Whether it's your first fade or
              your fortieth year of the same trim, you'll get the same thing: our full
              attention, and a cut worth walking out smiling about.
            </p>
            <Link to="/booking" className="btn btn-gold">
              Book your chair
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Values (scroll row) */}
      <section className="section section-alt">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow="What we stand for"
              title="Four Things We Never Compromise"
            />
          </Reveal>
          <div className="scroll-row scroll-row-wide" role="region" tabIndex={0} aria-label="Our values">
            {VALUES.map((v, i) => (
              <div key={v.title} className="value-card">
                <span className="value-number" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3>{v.title}</h3>
                <p>{v.text}</p>
              </div>
            ))}
          </div>

          <Reveal>
            <div className="timeline" aria-label="Shop milestones">
              {TIMELINE.map((t) => (
                <div key={t.year} className="timeline-item">
                  <span className="timeline-year">{t.year}</span>
                  <p>{t.text}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Team (stacked editorial rows) */}
      <section className="section">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow="The team"
              title="Meet the Barbers"
              intro="Book any of them directly. Or choose “no preference” and we'll pair you with the first free chair."
            />
          </Reveal>
          <div className="barbers-stack">
            {barbers.map((barber) => (
              <BarberCard key={barber.slug} barber={barber} showBio />
            ))}
          </div>
          <Reveal>
            <div className="section-cta">
              <Link to="/booking" className="btn btn-gold btn-lg">
                Book an Appointment
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
