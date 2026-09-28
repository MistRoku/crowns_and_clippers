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
    <section className="page-hero">
      {image && (
        <>
          <img
            className="page-hero-img"
            src={image}
            alt=""
            aria-hidden={!imageAlt}
            fetchPriority="high"
            decoding="async"
          />
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
export function usePageTitle(title: string, description?: string, opts?: { path?: string; noindex?: boolean }) {
  usePageMeta({ title, description, path: opts?.path, noindex: opts?.noindex });
}

const SITE_URL = 'https://crownandclipper.co.za';
const DEFAULT_DESCRIPTION =
  "Crown & Clipper Barber Co. - Johannesburg's premium barbershop since 2014, on Stanley Avenue, Milpark. Classic cuts, skin fades, beard sculpts and hot towel shaves. Book online in under a minute.";

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

interface PageMeta {
  title: string;
  description?: string;
  /** Route path used for og:url + canonical, e.g. "/services". Defaults to home. */
  path?: string;
  /** Pass for auth/account/dashboard pages so crawlers skip them. */
  noindex?: boolean;
}

/**
 * Per-page SEO: unique title, meta description, OG/Twitter tags and canonical
 * URL. Single-page apps otherwise share one static head tag set forever.
 */
export function usePageMeta({ title, description = DEFAULT_DESCRIPTION, path = '/', noindex = false }: PageMeta) {
  useEffect(() => {
    const fullTitle = `${title} | Crown & Clipper Barber Co.`;
    const url = `${SITE_URL}${path}`;
    document.title = fullTitle;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', url);
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);
    return () => {
      document.title = 'Crown & Clipper Barber Co. | Premium Barbershop in Johannesburg';
    };
  }, [title, description, path, noindex]);
}
