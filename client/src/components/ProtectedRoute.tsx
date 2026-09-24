import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import type { AuthUser } from '../lib/api';

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: AuthUser['role'][];
}

/**
 * Gate for signed-in areas. Redirects anonymous visitors to /login (with a
 * return path) and sends signed-in users without the required role home.
 */
export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <section className="section">
        <div className="container">
          <div className="skeleton-list" role="status" aria-label="Checking your session">
            <span className="skeleton skeleton-row" />
            <span className="skeleton skeleton-row" />
            <span className="skeleton skeleton-row" />
          </div>
        </div>
      </section>
    );
  }

  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
