import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { LogoLockup } from './Logo';
import { useShop } from '../context/ShopContext';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export default function Header() {
  const shop = useShop();
  const { user, logout, hasRole } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  // Close dropdowns on Escape.
  useEffect(() => {
    if (!accountOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAccountOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [accountOpen]);

  // Subtle style change once the user scrolls.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const accountLinks = (
    <>
      <li>
        <Link to="/account">My bookings</Link>
      </li>
      {hasRole('Stylist', 'Admin') && (
        <li>
          <Link to="/staff">My schedule</Link>
        </li>
      )}
      {hasRole('Admin') && (
        <li>
          <Link to="/admin">Admin dashboard</Link>
        </li>
      )}
    </>
  );

  return (
    <header className={`site-header ${scrolled ? 'scrolled' : ''} ${menuOpen ? 'menu-open' : ''}`}>
      <div className="container header-inner">
        <Link to="/" className="header-brand" aria-label={`${shop.name} - home`}>
          <LogoLockup />
        </Link>

        <nav className="header-nav" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <a href={shop.phoneHref} className="header-phone">
            {shop.phoneDisplay}
          </a>
          <Link to="/booking" className="btn btn-gold header-cta">
            Book Now
          </Link>

          <NotificationBell />

          {user ? (
            <div className="account-menu">
              <button
                type="button"
                className="account-toggle"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                aria-controls="account-menu-list"
                onClick={() => setAccountOpen((v) => !v)}
              >
                {user.name.split(' ')[0]}
                <span className="account-role">{user.role}</span>
              </button>
              {accountOpen && (
                <>
                  <button
                    type="button"
                    className="account-overlay"
                    aria-label="Close account menu"
                    onClick={() => setAccountOpen(false)}
                  />
                  <ul className="account-dropdown" id="account-menu-list" role="menu" aria-label="Account">
                    {accountLinks}
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setAccountOpen(false);
                        }}
                      >
                        Sign out
                      </button>
                    </li>
                  </ul>
                </>
              )}
            </div>
          ) : (
            <Link to="/login" className="header-signin">
              Sign in
            </Link>
          )}

          <button
            type="button"
            className={`menu-toggle ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {/* Mobile navigation panel */}
      <div id="mobile-nav" className={`mobile-nav ${menuOpen ? 'open' : ''}`}>
        <nav aria-label="Mobile navigation">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
          {user ? (
            <>
              <NavLink to="/account" className="mobile-nav-link">
                My bookings
              </NavLink>
              <NavLink to="/notifications" className="mobile-nav-link">
                Notifications
              </NavLink>
              {hasRole('Stylist', 'Admin') && (
                <NavLink to="/staff" className="mobile-nav-link">
                  My schedule
                </NavLink>
              )}
              {hasRole('Admin') && (
                <NavLink to="/admin" className="mobile-nav-link">
                  Admin dashboard
                </NavLink>
              )}
            </>
          ) : (
            <NavLink to="/login" className="mobile-nav-link">
              Sign in
            </NavLink>
          )}
        </nav>
        <div className="mobile-nav-footer">
          {user ? (
            <button
              type="button"
              className="btn btn-outline-light btn-block"
              onClick={() => {
                logout();
                setMenuOpen(false);
              }}
            >
              Sign out ({user.name.split(' ')[0]})
            </button>
          ) : (
            <Link to="/register" className="btn btn-outline-light btn-block">
              Create an account
            </Link>
          )}
          <a href={shop.phoneHref} className="mobile-nav-phone">
            Call {shop.phoneDisplay}
          </a>
          <Link to="/booking" className="btn btn-gold btn-block">
            Book Now
          </Link>
        </div>
      </div>
    </header>
  );
}
