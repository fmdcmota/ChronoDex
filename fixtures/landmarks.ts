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

/** Every landmark in the game: the six around the venue in route order, then other cities. */
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
  // Other cities, added by Agent 3 with the human's go-ahead (15 Nov 2026). Coordinates, sources and
  // the facts behind each candidate year are in spikes/agent-3/src/lib/landmarks.ts (CITY_LANDMARKS).
  // The map opens on the city nearest the player (src/components/explore/lib/map-region.ts).
  {
    id: 'raffles-landing-site',
    name: 'Raffles’ Landing Site',
    blurb: 'Where Stamford Raffles stepped ashore in 1819 and a trading post became Singapore.',
    photoSpot: { lat: 1.2877911, lng: 103.8506662 },
    subject: { lat: 1.2877192, lng: 103.8507866 },
    rarity: 'rare',
    eraYears: [1819],
    ...sharedFields('raffles-landing-site'),
  },
  {
    id: 'raffles-hotel',
    name: 'Raffles Hotel',
    blurb: 'The white colonial landmark that opened its doors on Beach Road in 1887.',
    photoSpot: { lat: 1.2944185, lng: 103.8546951 },
    subject: { lat: 1.2946815, lng: 103.8546412 },
    rarity: 'common',
    eraYears: [1887],
    ...sharedFields('raffles-hotel'),
  },
  {
    id: 'merlion-park',
    name: 'Merlion Park',
    blurb: 'A lion’s head on a fish’s body, Singapore’s mascot, spouting at the river mouth since 1972.',
    photoSpot: { lat: 1.28676, lng: 103.85442 },
    subject: { lat: 1.2869646, lng: 103.8544639 },
    rarity: 'legendary',
    eraYears: [1972],
    ...sharedFields('merlion-park'),
  },
  {
    id: 'viking-ship-museum',
    name: 'Viking Ship Museum',
    blurb: 'Home of the Oseberg ship, buried with two women in the year 834 and dug up in 1904.',
    photoSpot: { lat: 59.904626, lng: 10.684288 },
    subject: { lat: 59.9048334, lng: 10.684127 },
    rarity: 'legendary',
    eraYears: [834, 1904],
    ...sharedFields('viking-ship-museum'),
  },
  {
    id: 'akershus-fortress',
    name: 'Akershus Fortress',
    blurb: 'A medieval castle begun around 1299 that has guarded Oslo’s harbour ever since.',
    photoSpot: { lat: 59.90611, lng: 10.736585 },
    subject: { lat: 59.90638, lng: 10.736316 },
    rarity: 'rare',
    eraYears: [1299, 1624],
    ...sharedFields('akershus-fortress'),
  },
  {
    id: 'emmanuel-college',
    name: 'Emmanuel College',
    blurb: 'Founded in 1584 and known as Emma, a Cambridge college whose garden pond ducks are famous.',
    photoSpot: { lat: 52.204144, lng: 0.125688 },
    subject: { lat: 52.20421, lng: 0.125419 },
    rarity: 'epic',
    eraYears: [1584, 1677],
    ...sharedFields('emmanuel-college'),
  },
  {
    id: 'great-wall-badaling',
    name: 'Great Wall at Badaling',
    blurb: 'The best-known stretch of the Ming Great Wall, guarding the mountain pass north of Beijing.',
    photoSpot: { lat: 40.350866, lng: 116.004287 },
    subject: { lat: 40.3509393, lng: 116.0040454 },
    rarity: 'legendary',
    eraYears: [1505],
    ...sharedFields('great-wall-badaling'),
  },
  // Demo cities added by Agent 6 (demo assets, 15 Nov 2026). Coordinates from OpenStreetMap; the photo
  // spot is where the Commons reference photo in data/reference/<id>.jpg was taken from (data/landmarks/<id>.json).
  {
    id: 'zocalo-cathedral',
    name: 'Zócalo and Metropolitan Cathedral',
    blurb: 'Mexico City’s great square, built over the sacred precinct of Tenochtitlan, the Aztec capital.',
    photoSpot: { lat: 19.43365, lng: -99.13320 },
    subject: { lat: 19.43445, lng: -99.13325 },
    rarity: 'legendary',
    eraYears: [1519],
    ...sharedFields('zocalo-cathedral'),
  },
  {
    id: 'dom-luis-bridge',
    name: 'Dom Luís I Bridge',
    blurb: 'Porto’s two-deck iron arch over the Douro, opened in 1886 by a pupil of Gustave Eiffel.',
    photoSpot: { lat: 41.13815, lng: -8.60895 },
    subject: { lat: 41.13895, lng: -8.60925 },
    rarity: 'epic',
    eraYears: [1886],
    ...sharedFields('dom-luis-bridge'),
  },
  // Lisbon, added by Agent 1 at the human's request (15 Nov 2026): the same riverside view before and
  // after the earthquake of 1 November 1755. In 1754 the Royal Ribeira Palace filled the west side of the
  // Terreiro do Paço; Pombal's rebuilt square, the Praça do Comércio, had its equestrian statue of José I
  // unveiled on 6 June 1775. Coordinates are OpenStreetMap ESTIMATES, not checked on site: the photo spot
  // is the Cais das Colunas steps on the Tagus, facing north across the square to the Rua Augusta.
  {
    id: 'praca-do-comercio',
    name: 'Praça do Comércio',
    blurb: 'Lisbon’s riverside square, where a royal palace stood until the great earthquake of 1755.',
    photoSpot: { lat: 38.70668, lng: -9.13648 },
    subject: { lat: 38.70775, lng: -9.13650 },
    rarity: 'legendary',
    eraYears: [1754, 1775],
    ...sharedFields('praca-do-comercio'),
  },
  {
    id: 'brandenburg-gate-east',
    name: 'Brandenburg Gate, East Berlin side',
    blurb: 'Seen from Unter den Linden, the gate stood in the death strip behind the Berlin Wall from 1961 to 1989.',
    photoSpot: { lat: 52.51625, lng: 13.3788 },
    subject: { lat: 52.51627, lng: 13.3777 },
    rarity: 'legendary',
    eraYears: [1987],
    ...sharedFields('brandenburg-gate-east'),
  },
];
