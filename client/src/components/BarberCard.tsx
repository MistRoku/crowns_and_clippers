import { Link } from 'react-router-dom';
import type { Barber } from '../lib/api';

interface BarberCardProps {
  barber: Barber;
  showBio?: boolean;
}

export default function BarberCard({ barber, showBio = false }: BarberCardProps) {
  return (
    <article className="barber-card">
      <div className="barber-photo">
        <img src={barber.photoUrl} alt={`${barber.name}, ${barber.title} at Crown & Clipper`} loading="lazy" decoding="async" width="400" height="400" />
        <span className="barber-experience">{barber.yearsExperience} yrs</span>
      </div>
      <div className="barber-info">
        <h3>{barber.name}</h3>
        <p className="barber-title">{barber.title}</p>
        {showBio && <p className="barber-bio">{barber.bio}</p>}
        <ul className="barber-specialties" aria-label={`${barber.name}'s specialties`}>
          {barber.specialties.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <Link to={`/booking?barber=${barber.slug}`} className="btn btn-outline-gold btn-sm">
          Book with {barber.name.split(' ')[0]}
        </Link>
      </div>
    </article>
  );
}
