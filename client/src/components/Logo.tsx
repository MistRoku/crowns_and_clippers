import { useShop } from '../context/ShopContext';

/**
 * Hand-drawn SVG logo for the brand: a crowned emblem with crossed scissors.
 * Uses currentColor so it adapts to dark/light placements.
 */
export function LogoMark({ size = 44, title }: { size?: number; title?: string }) {
  const shop = useShop();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title ?? `${shop.name} logo`}
      className="logo-mark"
    >
      {/* Rings */}
      <circle cx="60" cy="60" r="57" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="60" cy="60" r="51" stroke="currentColor" strokeWidth="1" opacity="0.5" />

      {/* Crown */}
      <path
        d="M40 56 L43.5 36 L51.5 46 L60 30 L68.5 46 L76.5 36 L80 56 Z"
        fill="currentColor"
      />
      <circle cx="43.5" cy="33.5" r="2.6" fill="currentColor" />
      <circle cx="60" cy="27.5" r="3" fill="currentColor" />
      <circle cx="76.5" cy="33.5" r="2.6" fill="currentColor" />
      <rect x="40" y="58" width="40" height="6" rx="1.6" fill="currentColor" />

      {/* Crossed scissors */}
      <g stroke="currentColor" strokeWidth="3.4" strokeLinecap="round">
        <line x1="54.5" y1="88" x2="70" y2="67.5" />
        <line x1="65.5" y1="88" x2="50" y2="67.5" />
      </g>
      <circle cx="60" cy="79.5" r="2.1" fill="currentColor" />
      <circle cx="51.5" cy="92.5" r="4.6" stroke="currentColor" strokeWidth="2.8" fill="none" />
      <circle cx="68.5" cy="92.5" r="4.6" stroke="currentColor" strokeWidth="2.8" fill="none" />

      {/* Side dots */}
      <circle cx="24" cy="60" r="1.8" fill="currentColor" />
      <circle cx="96" cy="60" r="1.8" fill="currentColor" />
    </svg>
  );
}

/** Full lockup used in the header: emblem + tenant wordmark. */
export function LogoLockup({ compact = false }: { compact?: boolean }) {
  const shop = useShop();
  return (
    <span className={`brand ${compact ? 'brand-compact' : ''}`}>
      <LogoMark size={compact ? 38 : 44} />
      <span className="brand-text">
        <span className="brand-name">{shop.name}</span>
        <span className="brand-sub">
          {shop.city} · Est. {shop.estYear}
        </span>
      </span>
    </span>
  );
}
