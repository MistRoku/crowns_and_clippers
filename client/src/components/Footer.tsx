import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoLockup } from './Logo';
import { SOCIAL_ICONS } from './SocialIcons';
import { useShop } from '../context/ShopContext';
import { api, currentTenantSlug, setTenantSlug, type TenantSummary } from '../lib/api';

const year = new Date().getFullYear();

export default function Footer() {
  const shop = useShop();
  const [tenants, setTenants] = useState<TenantSummary[] | null>(null);

  useEffect(() => {
    api.getTenants().then(setTenants).catch(() => undefined);
  }, []);

  const currentSlug = currentTenantSlug() ?? tenants?.find((t) => t.isDefault)?.slug ?? shop.slug;

  const switchTenant = (tenant: TenantSummary) => {
    setTenantSlug(tenant.isDefault ? null : tenant.slug);
    window.location.assign('/');
  };

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        {/* Brand */}
        <div className="footer-col footer-brand-col">
          <Link to="/" className="footer-brand" aria-label={`${shop.name} - home`}>
            <LogoLockup compact />
          </Link>
          <p className="footer-blurb">
            {shop.city}'s home of precision cuts, sharp fades and traditional grooming since{' '}
            {shop.estYear}. Walk in a customer, walk out a regular.
          </p>
          <div className="footer-socials">
            {shop.social.map((s) => {
              const Icon = SOCIAL_ICONS[s.label];
              return (
                <a
                  key={s.label}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${shop.name} on ${s.label} (opens in a new tab)`}
                  className="social-link"
                >
                  {Icon ? <Icon /> : null}
                </a>
              );
            })}
          </div>
        </div>

        {/* Explore */}
        <div className="footer-col">
          <h3 className="footer-heading">Explore</h3>
          <ul className="footer-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/services">Services &amp; Prices</Link></li>
            <li><Link to="/about">Our Story &amp; Barbers</Link></li>
            <li><Link to="/contact">Contact &amp; Find Us</Link></li>
            <li><Link to="/booking" className="footer-book">Book an Appointment</Link></li>
            <li><Link to="/account">My Bookings</Link></li>
          </ul>
        </div>

        {/* Services quick-book */}
        <div className="footer-col">
          <h3 className="footer-heading">Popular Services</h3>
          <ul className="footer-links">
            <li><Link to="/booking?service=skin-fade">Skin Fade</Link></li>
            <li><Link to="/booking?service=box-braids">Box Braids</Link></li>
            <li><Link to="/booking?service=classic-cut">Classic Cut</Link></li>
            <li><Link to="/booking?service=cut-and-beard">Cut &amp; Beard Combo</Link></li>
            <li><Link to="/booking?service=hot-towel-shave">Hot Towel Royal Shave</Link></li>
            <li><Link to="/booking?service=the-full-works">The Full Works</Link></li>
          </ul>
        </div>

        {/* Visit us */}
        <div className="footer-col">
          <h3 className="footer-heading">Visit Us</h3>
          <address className="footer-address">
            <a href={shop.mapLink} target="_blank" rel="noopener noreferrer">
              {shop.addressLine}
              <br />
              {shop.city} {shop.postcode}
            </a>
            <br />
            <a href={shop.phoneHref}>{shop.phoneDisplay}</a>
            <br />
            <a href={`mailto:${shop.email}`}>{shop.email}</a>
          </address>
          <ul className="footer-hours" aria-label="Opening hours">
            <li><span>Mon – Fri</span><span>9:00 – 19:00</span></li>
            <li><span>Saturday</span><span>9:00 – 18:00</span></li>
            <li><span>Sunday</span><span>Closed</span></li>
          </ul>
        </div>
      </div>

      {/* Multi-tenant shop switcher (visible when more than one shop exists) */}
      {tenants && tenants.length > 1 && (
        <div className="footer-shops">
          <div className="container footer-shops-inner" aria-label="Our shops">
            <span className="footer-shops-label">Our shops:</span>
            {tenants.map((t) => (
              <button
                key={t.slug}
                type="button"
                className={`tenant-link ${t.slug === currentSlug ? 'current' : ''}`}
                onClick={() => switchTenant(t)}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <p>© {year} {shop.name} All rights reserved.</p>
          <nav className="footer-legal" aria-label="Legal">
            <Link to="/terms">Terms &amp; Conditions</Link>
            <span aria-hidden="true">·</span>
            <Link to="/privacy">Privacy Policy</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
