import { Link } from 'react-router-dom';
import type { Service } from '../lib/api';
import { formatPrice } from '../lib/calendar';

export default function ServiceCard({ service }: { service: Service }) {
  return (
    <article className={`service-card ${service.isPopular ? 'popular' : ''}`}>
      <div className="service-card-head">
        <h3>{service.name}</h3>
        {service.isPopular && <span className="badge badge-gold">Popular</span>}
      </div>
      <p className="service-card-desc">{service.description}</p>
      <div className="service-card-foot">
        <p className="service-card-meta">
          <span className="service-price">{formatPrice(service.price)}</span>
          <span className="service-duration">{service.durationMinutes} min</span>
        </p>
        <Link to={`/booking?service=${service.slug}`} className="btn btn-outline-gold btn-sm">
          Book
        </Link>
      </div>
    </article>
  );
}
