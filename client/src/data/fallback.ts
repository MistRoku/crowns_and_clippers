import type { Barber, Service } from '../lib/api';

/**
 * Static mirror of the seeded catalogue. Marketing pages fall back to this
 * if the API is briefly unreachable, so the site never looks broken.
 * Keep in sync with server/CrownAndClipper.Api/Data/DbSeeder.cs
 * (including barberIds, the service-to-stylist qualification links).
 */
export const FALLBACK_SERVICES: Service[] = [
  { id: 1, slug: 'classic-cut', name: 'Classic Cut', description: 'A precision scissor or clipper cut tailored to you, finished with a wash, style and product of your choice.', price: 240, durationMinutes: 30, category: 'Cuts', isPopular: true, barberIds: [1, 2, 3, 4] },
  { id: 2, slug: 'skin-fade', name: 'Skin Fade', description: 'A razor-sharp zero-gap fade blended seamlessly into a styled top. Our most requested cut.', price: 300, durationMinutes: 45, category: 'Cuts', isPopular: true, barberIds: [1, 2, 3, 4] },
  { id: 3, slug: 'beard-sculpt', name: 'Beard Sculpt & Trim', description: 'Shape-up, line-up and full beard trim with clippers and scissors, finished with beard oil.', price: 180, durationMinutes: 30, category: 'Beard & Shave', isPopular: false, barberIds: [1, 2, 3] },
  { id: 4, slug: 'hot-towel-shave', name: 'Hot Towel Royal Shave', description: 'A traditional straight-razor shave with hot towels, pre-shave oil and a soothing aftershave balm.', price: 350, durationMinutes: 45, category: 'Beard & Shave', isPopular: false, barberIds: [1, 2] },
  { id: 5, slug: 'cut-and-beard', name: 'Cut & Beard Combo', description: 'Any haircut paired with a full beard sculpt - the complete refresh in one chair visit.', price: 450, durationMinutes: 60, category: 'Packages', isPopular: true, barberIds: [1, 2, 3] },
  { id: 6, slug: 'the-full-works', name: 'The Full Works', description: 'Our signature experience: haircut, beard sculpt, hot-towel shave finish, wash and style. Coffee or whisky included.', price: 650, durationMinutes: 90, category: 'Packages', isPopular: false, barberIds: [1, 2] },
  { id: 7, slug: 'kids-cut', name: 'Kids Cut (Under 12)', description: 'Patient, friendly haircuts for our youngest clients - booster seats, cartoons and lollipops on standby.', price: 150, durationMinutes: 30, category: 'Kids & Students', isPopular: false, barberIds: [3, 4] },
  { id: 8, slug: 'student-cut', name: 'Student Cut', description: 'Any classic style at a student-friendly price. Just bring a valid student ID on the day.', price: 180, durationMinutes: 30, category: 'Kids & Students', isPopular: false, barberIds: [2, 3, 4] },
  { id: 9, slug: 'box-braids', name: 'Box Braids', description: 'Knotless or classic box braids, installed neatly with care for your edges and finished with a shine serum.', price: 850, durationMinutes: 150, category: 'Braids & Styles', isPopular: true, barberIds: [5] },
  { id: 10, slug: 'cornrows', name: 'Cornrows', description: 'Straight-back or freestyle cornrows, plaited crisp and even, finished with edge control.', price: 450, durationMinutes: 90, category: 'Braids & Styles', isPopular: false, barberIds: [5, 3] },
  { id: 11, slug: 'two-strand-twists', name: 'Two-Strand Twists', description: 'Defined two-strand twists on natural hair, with a wash and condition on request.', price: 550, durationMinutes: 120, category: 'Braids & Styles', isPopular: false, barberIds: [5, 3] },
  { id: 12, slug: 'loc-retwist', name: 'Loc Retwist & Style', description: 'A neat retwist for locs at any stage, styled and set so they hold for weeks.', price: 500, durationMinutes: 90, category: 'Braids & Styles', isPopular: false, barberIds: [5] },
  { id: 13, slug: 'silk-press', name: 'Silk Press & Blowout', description: 'Wash, blowout and silk press with heat protectant: smooth movement without chemical relaxers.', price: 600, durationMinutes: 90, category: 'Braids & Styles', isPopular: false, barberIds: [5] },
];

export const FALLBACK_BARBERS: Barber[] = [
  { id: 1, slug: 'marcus-reid', name: 'Marcus Reid', title: 'Master Barber & Founder', bio: "Marcus opened Crown & Clipper in 2014 after a decade in London's Saville Row shops. He blends old-school scissor craft with modern finishes, and still gives the sharpest straight-razor shave in the city.", specialties: ['Classic cuts', 'Scissor work', 'Straight-razor shaves'], photoUrl: '/images/barbers/marcus-reid.jpg', yearsExperience: 18 },
  { id: 2, slug: 'sofia-karim', name: 'Sofia Karim', title: 'Senior Barber', bio: 'Sofia is our fade perfectionist - her skin fades and beard sculpts are geometric works of art. She keeps a loyal books-only clientele and mentors our junior barbers.', specialties: ['Skin fades', 'Beard sculpting', 'Modern styles'], photoUrl: '/images/barbers/sofia-karim.jpg', yearsExperience: 11 },
  { id: 3, slug: 'danny-okafor', name: 'Danny Okafor', title: 'Barber', bio: 'Danny specialises in afro and textured hair - twists, waves and crisp line-ups. His chair is the loudest in the shop, in the best possible way.', specialties: ['Afro & textured hair', 'Twists', 'Sharp line-ups'], photoUrl: '/images/barbers/danny-okafor.jpg', yearsExperience: 7 },
  { id: 4, slug: 'tommy-vance', name: 'Tommy Vance', title: 'Barber', bio: 'Tommy joined us fresh from barber college and never looked back. Calm with kids, quick with clippers, and the reason our crops and textured styles stay on trend.', specialties: ['Kids cuts', 'Crops', 'Fades'], photoUrl: '/images/barbers/tommy-vance.jpg', yearsExperience: 4 },
  { id: 5, slug: 'amara-mensah', name: 'Amara Mensah', title: 'Hair Stylist · Braiding & Locs', bio: 'Amara leads our braiding chair: box braids, cornrows, locs and silk presses installed with patience and precision. Her books fill weeks ahead, so plan early.', specialties: ['Box braids', 'Cornrows', 'Locs', 'Silk press'], photoUrl: '/images/barbers/amara-mensah.jpg', yearsExperience: 9 },
];
