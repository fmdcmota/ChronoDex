/**
 * The six seeded landmarks around the venue (MASTER.md section 12).
 *
 * Owner: Agent 1 (Core). Task A1-04.
 *
 * COORDINATES ARE APPROXIMATE. They were placed by hand from general knowledge of South
 * Kensington, not surveyed. `scripts/seed.ts` (A1-08) replaces photoSpot with the GPS recorded in
 * the H1 reference photos. Until then, test captures with the dev spoof panel, not on the street.
 * Era years are candidates; the Historian confirms each with citations before generation.
 */
import { GAME, type Landmark } from '@/lib/contracts';
import { MOCK_BADGE_URL, MOCK_REFERENCE_URL, MOCK_SPRITE_URL } from './media';

/** Fields every seeded landmark shares until real art and photos exist. */
const PLACEHOLDER_MEDIA = {
  spriteUrl: MOCK_SPRITE_URL,
  badgeUrl: MOCK_BADGE_URL,
  referencePhotoUrl: MOCK_REFERENCE_URL,
  captureRadiusM: GAME.CAPTURE_RADIUS_M,
} as const;

/** Every landmark in the game, in route order. */
export const landmarks: Landmark[] = [
  {
    id: 'huxley-building',
    name: 'Huxley Building',
    blurb: 'Home of this hackathon, on the site of a vanished Norman Shaw house at 180 Queen’s Gate.',
    photoSpot: { lat: 51.499, lng: -0.18 },
    subject: { lat: 51.499, lng: -0.1792 },
    rarity: 'epic',
    eraYears: [1885, 1961],
    ...PLACEHOLDER_MEDIA,
  },
  {
    id: 'queens-tower',
    name: 'Queen’s Tower',
    blurb: 'The last piece of the Imperial Institute, still standing over Queen’s Lawn.',
    photoSpot: { lat: 51.498, lng: -0.1768 },
    subject: { lat: 51.4983, lng: -0.1768 },
    rarity: 'legendary',
    eraYears: [1893, 1962],
    ...PLACEHOLDER_MEDIA,
  },
  {
    id: 'royal-albert-hall',
    name: 'Royal Albert Hall',
    blurb: 'Opened in 1871 on land bought with the Great Exhibition’s profits.',
    photoSpot: { lat: 51.4999, lng: -0.1774 },
    subject: { lat: 51.5009, lng: -0.1774 },
    rarity: 'common',
    eraYears: [1871],
    ...PLACEHOLDER_MEDIA,
  },
  {
    id: 'exhibition-road',
    name: 'Exhibition Road',
    blurb: 'The museum road, rebuilt as a shared space for people and traffic.',
    photoSpot: { lat: 51.497, lng: -0.174 },
    subject: { lat: 51.498, lng: -0.1742 },
    rarity: 'common',
    eraYears: [1862, 2011],
    ...PLACEHOLDER_MEDIA,
  },
  {
    id: 'v-and-a',
    name: 'V&A, Exhibition Road side',
    blurb: 'Wartime shrapnel scars kept in the stone as a memorial.',
    photoSpot: { lat: 51.4963, lng: -0.1742 },
    subject: { lat: 51.4963, lng: -0.1736 },
    rarity: 'rare',
    eraYears: [1941],
    ...PLACEHOLDER_MEDIA,
  },
  {
    id: 'natural-history-museum',
    name: 'Natural History Museum',
    blurb: 'A cathedral to nature, built where the 1862 International Exhibition once stood.',
    photoSpot: { lat: 51.495, lng: -0.1764 },
    subject: { lat: 51.4958, lng: -0.1764 },
    rarity: 'rare',
    eraYears: [1862, 1881],
    ...PLACEHOLDER_MEDIA,
  },
];
