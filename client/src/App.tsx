import { Suspense, lazy, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import { ShopProvider } from './context/ShopContext';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';

// Lazy-load everything below the landing page so the initial bundle stays small.
const Services = lazy(() => import('./pages/Services'));
const About = lazy(() => import('./pages/About'));
const Booking = lazy(() => import('./pages/Booking'));
const Contact = lazy(() => import('./pages/Contact'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Account = lazy(() => import('./pages/Account'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Staff = lazy(() => import('./pages/Staff'));
const Admin = lazy(() => import('./pages/Admin'));
const NotFound = lazy(() => import('./pages/NotFound'));
const OfferModal = lazy(() => import('./components/OfferModal'));

/** Scrolls to the top (or to a #hash target) on every navigation. */
function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, hash]);

  return null;
}

export default function App() {
  return (
    <ShopProvider>
      <AuthProvider>
        <div className="app-shell">
          <a className="skip-link" href="#main-content">
            Skip to main content
          </a>
          <Header />
          <ScrollManager />
          <main id="main-content">
            <Suspense
              fallback={
                <div className="container section" role="status" aria-label="Loading page">
                  <span className="skeleton skeleton-row" />
                  <span className="skeleton skeleton-row" />
                  <span className="skeleton skeleton-row" />
                </div>
              }
            >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/services" element={<Services />} />
              <Route path="/about" element={<About />} />
              <Route path="/booking" element={<Booking />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/account" element={<Account />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/staff" element={<Staff />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </main>
          <Footer />
          <Suspense fallback={null}>
            <OfferModal />
          </Suspense>
        </div>
      </AuthProvider>
    </ShopProvider>
  );
}
