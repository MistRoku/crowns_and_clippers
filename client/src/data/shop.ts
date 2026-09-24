import type { ShopHoursEntry, ShopInfo } from '../lib/api';

/**
 * Default (fallback) branding for the primary tenant. Live values always come
 * from GET /api/shop via ShopContext; these keep the site rendering before the
 * first response and if the API is briefly unreachable.
 */
export const FALL_SHOP: ShopInfo = {
  slug: 'crown-and-clipper',
  name: 'Crown & Clipper Barber Co.',
  tagline: 'Sharp cuts. Timeless style.',
  addressLine: '44 Stanley Avenue, Milpark',
  city: 'Johannesburg',
  postcode: '2092',
  fullAddress: '44 Stanley Avenue, Milpark, Johannesburg 2092',
  phone: '+27 11 482 1234',
  email: 'hello@crownandclipper.co.za',
  timezone: 'Africa/Johannesburg',
  offerCode: 'FIRSTCUT10',
  estYear: 2014,
  hours: [
    { day: 'Monday', open: '9:00', close: '19:00' },
    { day: 'Tuesday', open: '9:00', close: '19:00' },
    { day: 'Wednesday', open: '9:00', close: '19:00' },
    { day: 'Thursday', open: '9:00', close: '19:00' },
    { day: 'Friday', open: '9:00', close: '19:00' },
    { day: 'Saturday', open: '9:00', close: '18:00' },
    { day: 'Sunday', open: null, close: null },
  ],
};

export const SHOP_SOCIALS = [
  { label: 'Instagram', url: 'https://www.instagram.com/crownandclipper.joburg' },
  { label: 'Facebook', url: 'https://www.facebook.com/crownandclipperjoburg' },
  { label: 'TikTok', url: 'https://www.tiktok.com/@crownandclipper.joburg' },
];

/** UI-friendly derivations from the tenant record. */
export interface ShopView extends ShopInfo {
  founded: number;
  phoneDisplay: string;
  phoneHref: string;
  mapLink: string;
  mapEmbedSrc: string;
  social: typeof SHOP_SOCIALS;
}

export function toShopView(shop: ShopInfo): ShopView {
  return {
    ...shop,
    founded: shop.estYear,
    phoneDisplay: shop.phone.startsWith('+27 ')
      ? '0' + shop.phone.slice(4)
      : shop.phone,
    phoneHref: `tel:+${shop.phone.replace(/[^0-9]/g, '')}`,
    mapLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.fullAddress)}`,
    mapEmbedSrc: `https://www.google.com/maps?q=${encodeURIComponent(shop.fullAddress)}&output=embed`,
    social: SHOP_SOCIALS,
  };
}

export const FALL_SHOP_VIEW: ShopView = toShopView(FALL_SHOP);

export type { ShopHoursEntry };
