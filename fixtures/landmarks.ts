/**
 * The six seeded landmarks around the venue (MASTER.md section 12).
 *
 * Owner: Agent 1 (Core). Task A1-04.
 *
 * Coordinates, from Agent 3's map spike (spikes/agent-3/src/lib/landmarks.ts, 14 Nov 2026):
 * - `subject`: OpenStreetMap Nominatim building centroids, except the Natural History Museum
 *   (its Cromwell Road entrance) and the V&A (its Exhibition Road side), estimated from the map.
 * - `photoSpot`: ESTIMATES, a public pavement spot facing the subject. `scripts/seed.ts` will
 *   replace them with the GPS in the H1 reference photos (A1-08 part 2). Until then, test
 *   captures with the dev spoof panel, not on the street.
 * Art: Agent 3's sprites and badges in public/sprites/. Badge rims are baked from `rarity`, so a
 * rarity change needs new art: tell Agent 3.
 * Era years are candidates; the Historian confirms each with citations before generation.
 */
import { GAME, type Landmark, type LandmarkId } from '@/lib/contracts';
import { MOCK_REFERENCE_URL } from './media';

/**
 * Fields every seeded landmark shares: Agent 3's art paths, the placeholder reference photo
 * until the H1 photos exist, and the default capture radius.
 *
 * @param id - Landmark id.
 * @returns The shared fields.
 */
function sharedFields(id: LandmarkId) {
  return {
    spriteUrl: `/sprites/${id}.png`,
    badgeUrl: `/sprites/badges/${id}.png`,
    referencePhotoUrl: MOCK_REFERENCE_URL,
    captureRadiusM: GAME.CAPTURE_RADIUS_M,
  };
}

/**
 * The "not yet collected" badge art Agent 3 ships beside each badge.
 *
 * @param landmark - The landmark.
 * @returns Site path of the silhouette PNG.
 */
export function lockedBadgeUrl(landmark: Pick<Landmark, 'id'>): string {
  return `/sprites/badges/${landmark.id}-locked.png`;
}

/** Every landmark in the game, in route order. */
export const landmarks: Landmark[] = [
  {
    id: 'huxley-building',
    name: 'Huxley Building',
    blurb: 'Home of this hackathon, on the site of a vanished Norman Shaw house at 180 Queen’s Gate.',
    photoSpot: { lat: 51.49889, lng: -0.17945 },
    subject: { lat: 51.498888, lng: -0.1788682 },
    rarity: 'epic',
    eraYears: [1885, 1961],
    ...sharedFields('huxley-building'),
  },
  {
    id: 'queens-tower',
    name: 'Queen’s Tower',
    blurb: 'The last piece of the Imperial Institute, still standing over Queen’s Lawn.',
    photoSpot: { lat: 51.49805, lng: -0.1769 },
    subject: { lat: 51.4983515, lng: -0.1768905 },
    rarity: 'legendary',
    eraYears: [1893, 1962],
    ...sharedFields('queens-tower'),
  },
  {
    id: 'royal-albert-hall',
    name: 'Royal Albert Hall',
    blurb: 'Opened in 1871 on land bought with the Great Exhibition’s profits.',
    photoSpot: { lat: 51.50003, lng: -0.17742 },
    subject: { lat: 51.501007, lng: -0.1774058 },
    rarity: 'common',
    eraYears: [1871],
    ...sharedFields('royal-albert-hall'),
  },
  {
    id: 'exhibition-road',
    name: 'Exhibition Road',
    blurb: 'The museum road, rebuilt as a shared space for people and traffic.',
    photoSpot: { lat: 51.4974, lng: -0.1739 },
    subject: { lat: 51.4981218, lng: -0.1740327 },
    rarity: 'common',
    eraYears: [1862, 2011],
    ...sharedFields('exhibition-road'),
  },
  {
    id: 'v-and-a',
    name: 'V&A, Exhibition Road side',
    blurb: 'Wartime shrapnel scars kept in the stone as a memorial.',
    photoSpot: { lat: 51.4967, lng: -0.1737 },
    subject: { lat: 51.4967, lng: -0.1729 },
    rarity: 'rare',
    eraYears: [1941],
    ...sharedFields('v-and-a'),
  },
  {
    id: 'natural-history-museum',
    name: 'Natural History Museum',
    blurb: 'A cathedral to nature, built where the 1862 International Exhibition once stood.',
    photoSpot: { lat: 51.49535, lng: -0.17625 },
    subject: { lat: 51.49575, lng: -0.17625 },
    rarity: 'rare',
    eraYears: [1862, 1881],
    ...sharedFields('natural-history-museum'),
  },
];
