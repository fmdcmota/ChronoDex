/**
 * The six demo landmarks (MASTER.md section 12), for the map spike only.
 * Owner: Agent 3. The real list is Agent 1's `fixtures/` (task A1-04), served by `GET /api/landmarks`.
 *
 * Coordinates:
 * - `subject` points were looked up on OpenStreetMap Nominatim on 14 Nov 2026 (building or way
 *   centroid). Two exceptions, both estimated from the map: the Natural History Museum, whose
 *   centroid is deep inside a 200 m building, uses its Cromwell Road entrance; the V&A uses its
 *   Exhibition Road side, which is the one this landmark is about.
 * - `photoSpot` points are ESTIMATES: a public pavement spot facing the subject, picked from the
 *   map. Replace them with the GPS from the team's H1 photos before any real capture test.
 *
 * Rarities copy Agent 1's fixtures/landmarks.ts, because badge rims are baked from them.
 * Sprite and badge URLs are the app's public paths: public/sprites/ is Agent 3's (MASTER.md
 * section 3), so badges live in public/sprites/badges/.
 *
 * Era years are the candidates from MASTER.md section 12, not yet confirmed by the Historian.
 * `referencePhotoUrl` is empty until the H1 photos exist. The map does not use it.
 */
import { GAME, type Landmark } from './contracts-copy';

/** Six landmarks around the venue, ordered as the walking route in CHRONODEX.md section 9. */
export const SPIKE_LANDMARKS: readonly Landmark[] = [
  {
    id: 'huxley-building',
    name: 'Huxley Building',
    blurb: '180 Queen’s Gate. A Norman Shaw house once stood here.',
    photoSpot: { lat: 51.49889, lng: -0.17945 },
    subject: { lat: 51.498888, lng: -0.1788682 },
    captureRadiusM: GAME.CAPTURE_RADIUS_M,
    rarity: 'epic',
    spriteUrl: '/sprites/huxley-building.png',
    badgeUrl: '/sprites/badges/huxley-building.png',
    referencePhotoUrl: '',
    eraYears: [1885, 1961],
  },
  {
    id: 'queens-tower',
    name: 'Queen’s Tower',
    blurb: 'The last piece of the Imperial Institute.',
    photoSpot: { lat: 51.49805, lng: -0.1769 },
    subject: { lat: 51.4983515, lng: -0.1768905 },
    captureRadiusM: GAME.CAPTURE_RADIUS_M,
    rarity: 'legendary',
    spriteUrl: '/sprites/queens-tower.png',
    badgeUrl: '/sprites/badges/queens-tower.png',
    referencePhotoUrl: '',
    eraYears: [1893, 1962],
  },
  {
    id: 'royal-albert-hall',
    name: 'Royal Albert Hall',
    blurb: 'Opened 1871 with the Great Exhibition’s profits.',
    photoSpot: { lat: 51.50003, lng: -0.17742 },
    subject: { lat: 51.501007, lng: -0.1774058 },
    captureRadiusM: GAME.CAPTURE_RADIUS_M,
    rarity: 'common',
    spriteUrl: '/sprites/royal-albert-hall.png',
    badgeUrl: '/sprites/badges/royal-albert-hall.png',
    referencePhotoUrl: '',
    eraYears: [1871],
  },
  {
    id: 'exhibition-road',
    name: 'Exhibition Road',
    blurb: 'The museum mile, rebuilt as a shared street in 2011.',
    photoSpot: { lat: 51.4974, lng: -0.1739 },
    subject: { lat: 51.4981218, lng: -0.1740327 },
    captureRadiusM: GAME.CAPTURE_RADIUS_M,
    rarity: 'common',
    spriteUrl: '/sprites/exhibition-road.png',
    badgeUrl: '/sprites/badges/exhibition-road.png',
    referencePhotoUrl: '',
    eraYears: [1862, 2011],
  },
  {
    id: 'v-and-a',
    name: 'V&A, Exhibition Road',
    blurb: 'Blitz scars left in the stone as a memorial.',
    photoSpot: { lat: 51.4967, lng: -0.1737 },
    subject: { lat: 51.4967, lng: -0.1729 },
    captureRadiusM: GAME.CAPTURE_RADIUS_M,
    rarity: 'rare',
    spriteUrl: '/sprites/v-and-a.png',
    badgeUrl: '/sprites/badges/v-and-a.png',
    referencePhotoUrl: '',
    eraYears: [1941],
  },
  {
    id: 'natural-history-museum',
    name: 'Natural History Museum',
    blurb: 'Built on the site of the 1862 exhibition hall.',
    photoSpot: { lat: 51.49535, lng: -0.17625 },
    subject: { lat: 51.49575, lng: -0.17625 },
    captureRadiusM: GAME.CAPTURE_RADIUS_M,
    rarity: 'rare',
    spriteUrl: '/sprites/natural-history-museum.png',
    badgeUrl: '/sprites/badges/natural-history-museum.png',
    referencePhotoUrl: '',
    eraYears: [1862, 1881],
  },
];
