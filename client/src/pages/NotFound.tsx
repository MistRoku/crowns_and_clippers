import { Link } from 'react-router-dom';
import { usePageTitle } from '../components/PageHero';
import { LogoMark } from '../components/Logo';

export default function NotFound() {
  usePageTitle('Page Not Found', 'The page you asked for does not exist. Head home or book an appointment at Crown & Clipper.', { noindex: true });

  return (
    <section className="notfound">
      <div className="container notfound-inner">
        <div className="notfound-mark" aria-hidden="true">
          <LogoMark size={72} />
        </div>
        <p className="eyebrow eyebrow-center eyebrow-gold">Error 404</p>
        <h1>This page got faded out of existence</h1>
        <p className="notfound-sub">
          The link may be old, or the page may have been renamed. No worries: everything you need is one click away.
        </p>
        <div className="notfound-actions">
          <Link to="/" className="btn btn-gold btn-lg">
            Back to home
          </Link>
          <Link to="/booking" className="btn btn-outline-dark btn-lg">
            Book an appointment
          </Link>
        </div>
        <nav className="notfound-links" aria-label="Popular pages">
          <Link to="/services">Services</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
        </nav>
      </div>
    </section>
  );
}
