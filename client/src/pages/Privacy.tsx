import { Link } from 'react-router-dom';
import PageHero, { usePageTitle } from '../components/PageHero';
import { useShop } from '../context/ShopContext';

export default function Privacy() {
  usePageTitle('Privacy Policy', 'How Crown & Clipper handles bookings, contact messages and newsletter signups under South African data law.', { path: '/privacy' });
  const SHOP = useShop();

  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        intro="What we collect, why we collect it, and how to get it removed. Last updated: 1 September 2026."
      />

      <section className="section">
        <div className="container legal-body">
          <nav className="legal-nav" aria-label="Legal pages">
            <Link to="/terms">Terms &amp; Conditions</Link>
            <Link to="/privacy" aria-current="page">Privacy Policy</Link>
          </nav>

          <h2>1. Who we are</h2>
          <p>
            Crown &amp; Clipper Barber Co. Ltd ("we", "us") is the data controller for the
            personal information handled by this website and our booking system. We are registered in South Africa (Pty) Ltd, registration number 2014/091456/07, at {SHOP.addressLine},{' '}
            {SHOP.city} {SHOP.postcode}. Questions about privacy can be sent to{' '}
            <a href={`mailto:${SHOP.email}`}>{SHOP.email}</a>.
          </p>

          <h2>2. Information we collect</h2>
          <ul>
            <li>
              <strong>Booking details:</strong> your name, email address, phone number, the
              service, barber, date and time you choose, and any notes you add (for example
              about hair type or accessibility).
            </li>
            <li>
              <strong>Contact form messages:</strong> your name, email address, optional
              phone number and the message you send us.
            </li>
            <li>
              <strong>Offer signups:</strong> the email address you enter in our first-visit
              offer or newsletter form.
            </li>
            <li>
              <strong>Technical data:</strong> standard server logs such as IP address,
              browser type and pages requested, used to keep the site secure and working.
            </li>
          </ul>
          <p>
            We do not ask for, and you should not send us, special category data (such as
            health information) beyond brief notes needed to perform a service safely. If
            you share such information in booking notes, we process it solely to provide the
            service you asked for.
          </p>

          <h2>3. Why we process it (legal bases)</h2>
          <ul>
            <li>
              <strong>To fulfil your booking:</strong> performing our contract with you (POPIA, section 11(1)(b)), which means scheduling the appointment, confirming it and contacting you about changes.
            </li>
            <li>
              <strong>To answer your messages:</strong> our legitimate interests in running and promoting our business (POPIA, section 11(1)(f)).
            </li>
            <li>
              <strong>For marketing emails:</strong> only with your consent, given when you submit the offer/newsletter form (POPIA, section 11(1)(a)). You can withdraw consent at
              any time via the unsubscribe link or by emailing us.
            </li>
            <li>
              <strong>For security and legal compliance:</strong> legitimate interests and legal obligations (POPIA, section 11(1)(f) and (c)).
            </li>
          </ul>

          <h2>4. How long we keep it</h2>
          <p>
            Booking records are kept for 24 months after the appointment (to handle queries,
            no-shows and accounting). Contact form messages are kept for 12 months.
            Marketing list emails are kept until you unsubscribe. Server logs are kept for
            up to 90 days. When retention ends, data is deleted or anonymised.
          </p>

          <h2>5. Sharing</h2>
          <p>
            We do not sell your personal data. We share it only with the providers needed to
            run the website and booking system: our website host, our API/database host, and
            our email provider. Each is contractually obliged to protect your data. When you
            click "Add to calendar", your browser communicates directly with Google, Apple or
            Microsoft. We receive no data from that interaction and those providers act under their own privacy policies.
          </p>

          <h2>6. Cookies and local storage</h2>
          <p>
            This website does not use advertising or cross-site tracking cookies. We use the
            browser's local storage for one functional purpose: remembering that you have
            seen (or dismissed) the first-visit offer popup so it does not keep appearing.
            Essential cookies may be set by our hosting providers for security and load
            balancing. Because we do not use non-essential tracking, no cookie consent
            banner is required; if we ever add analytics we will update this policy and ask
            for consent first.
          </p>

          <h2>7. Your rights</h2>
          <p>Under POPIA (the Protection of Personal Information Act) you have the right to:</p>
          <ul>
            <li>request a copy of the personal data we hold about you;</li>
            <li>ask us to correct inaccurate data;</li>
            <li>ask us to erase your data where there is no compelling reason to keep it;</li>
            <li>restrict or object to certain processing;</li>
            <li>receive your data in a portable, machine-readable format;</li>
            <li>withdraw consent to marketing at any time;</li>
            <li>complain to the Information Regulator of South Africa (inforegulator.org.za) if you believe we have mishandled your data.</li>
          </ul>
          <p>
            To exercise any of these rights, email <a href={`mailto:${SHOP.email}`}>{SHOP.email}</a>{' '}
            or write to us at {SHOP.fullAddress}. We will respond within one month, and we
            may ask you to confirm your identity first. There is no fee for these requests
            in normal circumstances.
          </p>

          <h2>8. Security</h2>
          <p>
            All traffic to this website is served over HTTPS. Booking data is stored in an
            access-controlled database, and only shop staff who need it to run the
            appointment book can see it. No system is perfectly secure, but we take
            reasonable, current measures to protect your information.
          </p>

          <h2>9. Children</h2>
          <p>
            Our services are not directed at children under 16 for online booking purposes.
            A parent or guardian should make bookings on behalf of children and provide any
            personal data.
          </p>

          <h2>10. Changes to this policy</h2>
          <p>
            We may update this policy when our practices or the law change. The current
            version is always published on this page with its "last updated" date.
          </p>

          <h2>11. Contact</h2>
          <p>
            For anything privacy-related, contact us at{' '}
            <a href={`mailto:${SHOP.email}`}>{SHOP.email}</a> or{' '}
            <a href={SHOP.phoneHref}>{SHOP.phoneDisplay}</a>, or in person at the shop.
          </p>

          <div className="legal-footer-nav">
            <Link to="/terms" className="btn btn-outline-dark">Read the Terms &amp; Conditions</Link>
            <Link to="/booking" className="btn btn-gold">Book an Appointment</Link>
          </div>
        </div>
      </section>
    </>
  );
}
