import { Link } from 'react-router-dom';
import PageHero, { usePageTitle } from '../components/PageHero';
import { useShop } from '../context/ShopContext';

export default function Terms() {
  usePageTitle('Terms & Conditions');
  const SHOP = useShop();

  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Terms & Conditions"
        intro="The fine print, written like humans. Last updated: 1 September 2026."
      />

      <section className="section">
        <div className="container legal-body">
          <nav className="legal-nav" aria-label="Legal pages">
            <Link to="/terms" aria-current="page">Terms &amp; Conditions</Link>
            <Link to="/privacy">Privacy Policy</Link>
          </nav>

          <h2>1. About us</h2>
          <p>
            These terms and conditions govern your use of the Crown &amp; Clipper website
            and your booking of appointments with Crown &amp; Clipper Barber Co. Ltd, a company registered in South Africa (Pty) Ltd, registration number 2014/091456/07, whose registered office and trading address is {SHOP.addressLine}, {SHOP.city}{' '}
            {SHOP.postcode} ("we", "us", "the shop"). By using this website or making a
            booking, you agree to these terms. If you do not agree with them, please do not
            use the website or our services.
          </p>

          <h2>2. Using this website</h2>
          <p>
            This website is provided for personal, non-commercial use. You agree not to
            misuse it, interfere with its operation, attempt unauthorised access to its
            systems, or use automated tools to make bulk or fraudulent bookings. We may
            suspend access to anyone who does. All content on the site, including text, imagery, our logo and brand elements, is the property of Crown &amp; Clipper
            Barber Co. Ltd and may not be reproduced without our written permission.
          </p>

          <h2>3. Bookings and confirmation</h2>
          <p>
            Bookings are made through our online booking system or by telephone. An
            appointment is confirmed when the booking system displays a confirmation screen
            with a booking reference (for example, CC-K7XQ2M). Please keep this reference. You will need it if you contact us about your appointment.
          </p>
          <p>
            Slots are held for one person per booking. For group bookings (three or more
            people), please contact us directly so we can schedule enough chairs and time.
            Same-day online bookings must be made at least one hour before the appointment
            time.
          </p>

          <h2>4. Calendar integration</h2>
          <p>
            After booking, we offer links to add the appointment to Google Calendar, Apple
            Calendar or Microsoft Outlook. These are third-party services; when you use
            them, your interaction is governed by the respective provider's terms and
            privacy policies. We do not access your calendar and do not store any data with
            those providers beyond what your browser sends when you click the link.
          </p>

          <h2>5. Cancelling, rescheduling and late arrival</h2>
          <p>
            We ask for at least <strong>24 hours' notice</strong> to cancel or reschedule
            an appointment, by phone on {SHOP.phoneDisplay} or in person at the shop. This
            lets us offer the chair to someone on the waiting list.
          </p>
          <p>
            We hold your chair for <strong>10 minutes</strong> after your appointment time.
            If you arrive later than that, we may need to shorten the service to fit the
            next appointment or, if we cannot accommodate you, treat the appointment as
            cancelled. Repeated cancellations with less than 24 hours' notice, or failure to
            attend without notice, may result in future bookings requiring a deposit or
            being declined.
          </p>

          <h2>6. Prices and payment</h2>
          <p>
            All prices are shown in pounds sterling and include VAT where applicable. We
            aim to keep prices on this website accurate; if a price is displayed in error we
            will confirm the correct price with you before your appointment. Payment is taken
            at the shop after your service, by card, cash or contactless payment. We do not
            take card details over the internet.
          </p>

          <h2>7. Promotional offers</h2>
          <p>
            Promotional codes (such as the first-visit discount {SHOP.offerCode}) are valid
            for one use per customer, cannot be exchanged for cash, and cannot be combined
            with other offers unless stated. Quote the code when you arrive. We may withdraw
            or amend any promotion at any time. Student prices require a valid student ID
            card to be shown at the appointment.
          </p>

          <h2>8. Health, safety and conduct</h2>
          <p>
            Please tell your barber about any skin conditions, allergies, medication or
            recent treatments that could affect your service, particularly before any shave, wax or chemical service. We cannot perform services where doing so would
            be unsafe.
          </p>
          <p>
            We operate a zero-tolerance policy on abusive, discriminatory or threatening
            behaviour towards our staff or other customers. We may refuse or end a service
            without refund in such cases. Customers must follow any reasonable instructions
            from our barbers, including hygiene and seating arrangements.
          </p>

          <h2>9. Children</h2>
          <p>
            Children under 12 must be accompanied by a parent or guardian throughout the
            appointment. We reserve the right to stop a cut if a child becomes distressed,
            in which case a reduced charge may apply at the barber's discretion.
          </p>

          <h2>10. Personal property</h2>
          <p>
            Please keep personal belongings with you. We take care in the shop, but we
            cannot accept responsibility for loss of or damage to items left on the
            premises.
          </p>

          <h2>11. Your data</h2>
          <p>
            Our handling of your personal information is described in the{' '}
            <Link to="/privacy">Privacy Policy</Link>, which forms part of these terms.
          </p>

          <h2>12. Limitation of liability</h2>
          <p>
            Nothing in these terms limits liability that cannot lawfully be limited,
            including for death or personal injury caused by negligence, or for fraud.
            Subject to that, our total liability arising out of or in connection with a
            booking or your use of this website is limited to the price of the service
            booked. We are not liable for indirect or consequential losses, or for the
            availability of third-party services such as calendar providers or mapping
            services.
          </p>

          <h2>13. Changes to these terms and to the website</h2>
          <p>
            We may update these terms from time to time, for example to reflect changes in pricing, opening hours or the law. The version published on this page at the
            time you make a booking is the version that applies to it. We may also suspend
            or withdraw parts of the website for maintenance; we will restore service as
            quickly as we can.
          </p>

          <h2>14. General</h2>
          <p>
            If any part of these terms is found unenforceable, the remainder continues in
            effect. Our failure to enforce any term immediately does not waive our right to
            enforce it later.
          </p>

          <h2>15. Governing law</h2>
          <p>
            These terms are governed by the laws of the Republic of South Africa, and the courts of the Gauteng Division of the High Court, Johannesburg, have exclusive jurisdiction over any dispute arising from them, your use of this website, or any appointment with us.
          </p>

          <h2>16. Contact</h2>
          <p>
            Questions about these terms? Email <a href={`mailto:${SHOP.email}`}>{SHOP.email}</a>,
            call <a href={SHOP.phoneHref}>{SHOP.phoneDisplay}</a>, or write to us at{' '}
            {SHOP.fullAddress}.
          </p>

          <div className="legal-footer-nav">
            <Link to="/privacy" className="btn btn-outline-dark">Read the Privacy Policy</Link>
            <Link to="/booking" className="btn btn-gold">Book an Appointment</Link>
          </div>
        </div>
      </section>
    </>
  );
}
