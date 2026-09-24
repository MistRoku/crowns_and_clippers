import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import OfferModal from './components/OfferModal';
import { ShopProvider } from './context/ShopContext';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Services from './pages/Services';
import About from './pages/About';
import Booking from './pages/Booking';
import Contact from './pages/Contact';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Login from './pages/Login';
import Register from './pages/Register';
import Account from './pages/Account';
import Notifications from './pages/Notifications';
import Staff from './pages/Staff';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';

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
          </main>
          <Footer />
          <OfferModal />
        </div>
      </AuthProvider>
    </ShopProvider>
  );
}
