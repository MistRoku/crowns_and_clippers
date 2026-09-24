import { useEffect } from 'react';

interface PageHeroProps {
  eyebrow: string;
  title: string;
  intro?: string;
  image?: string;
  imageAlt?: string;
}

/** Compact banner used at the top of every inner page. */
export default function PageHero({ eyebrow, title, intro, image, imageAlt }: PageHeroProps) {
  return (
    <section
      className="page-hero"
      style={image ? { backgroundImage: `url(${image})` } : undefined}
    >
      {image && (
        <>
          <div className="page-hero-scrim" aria-hidden="true" />
          {imageAlt && <span className="visually-hidden">Background photo: {imageAlt}</span>}
        </>
      )}
      <div className="container page-hero-inner">
        <p className="eyebrow eyebrow-gold">{eyebrow}</p>
        <h1>{title}</h1>
        {intro && <p className="page-hero-intro">{intro}</p>}
      </div>
    </section>
  );
}

/** Sets the document title for the current page. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | Crown & Clipper Barber Co.`;
    return () => {
      document.title = 'Crown & Clipper Barber Co. | Premium Barbershop in Johannesburg';
    };
  }, [title]);
}
