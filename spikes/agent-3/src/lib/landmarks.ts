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

/**
 * Landmarks in other cities (Singapore, Oslo, Cambridge and Beijing), added 15 Nov 2026 to show the map style needs no
 * per-city work (see ../../ADD_A_CITY.md). Kept apart from SPIKE_LANDMARKS so the London map spike
 * still opens framed on London. The art script draws sprites for both lists.
 *
 * Coordinates: `subject` is an OpenStreetMap Nominatim point for the place (Merlion Park, Raffles'
 * Landing Site, Raffles Hotel, Vikingskipshuset). For Akershus Fortress it is the castle's
 * gatehouse end, read from the rendered map, because the Nominatim point lies in the grounds.
 * `photoSpot` points are ESTIMATES read off the rendered game map at zoom 18 (about 0.3 m per
 * screen pixel), each on a public path or plaza 15 to 35 m from the subject. Check them on site.
 * Era years are candidates the Historian must confirm: Raffles landed 1819; Raffles Hotel opened
 * 1887; the Merlion statue was unveiled 1972; the Oseberg ship burial dates to 834 and the ship was
 * dug up in 1904; Akershus was begun about 1299 and rebuilt as a Renaissance castle after the
 * 1624 fire of Oslo; Emmanuel College was founded in 1584 and its chapel, designed by Christopher
 * Wren, was completed in 1677. For Emmanuel the `subject` is the garden duck pond (read from the
 * rendered map, the OSM point lies in the Paddock) and the photoSpot a path beside it, inside the
 * college grounds, which are open to visitors in the daytime: check access before a real capture.
 * The Great Wall at Badaling: the subject is the OpenStreetMap "steps" node on the wall itself, the
 * photoSpot a point on the wall's walkway about 22 m along it, read off the rendered map. Badaling
 * is a ticketed site; check access before a real capture. 1505 is the Ming-era rebuilding year
 * usually given for this section: a candidate for the Historian to confirm.
 */
export const CITY_LANDMARKS: readonly Landmark[] = [
  {
    id: 'raffles-landing-site',
    name: 'Raffles’ Landing Site',
    blurb: 'Where Stamford Raffles stepped ashore in 1819 and a trading post became Singapore.',
    photoSpot: { lat: 1.2877911, lng: 103.8506662 },
    subject: { lat: 1.2877192, lng: 103.8507866 },
    captureRadiusM: GAME.CAPTURE_RADIUS_M,
    rarity: 'rare',
    spriteUrl: '/sprites/raffles-landing-site.png',
    badgeUrl: '/sprites/badges/raffles-landing-site.png',
    referencePhotoUrl: '',
    eraYears: [1819],
  },
  {
    id: 'raffles-hotel',
    name: 'Raffles Hotel',
    blurb: 'The white colonial landmark that opened its doors on Beach Road in 1887.',
    photoSpot: { lat: 1.2944185, lng: 103.8546951 },
    subject: { lat: 1.2946815, lng: 103.8546412 },
    captureRadiusM: GAME.CAPTURE_RADIUS_M,
    rarity: 'common',
    spriteUrl: '/sprites/raffles-hotel.png',
    badgeUrl: '/sprites/badges/raffles-hotel.png',
    referencePhotoUrl: '',
    eraYears: [1887],
  },
  {
    id: 'merlion-park',
    name: 'Merlion Park',
    blurb: 'A lion’s head on a fish’s body, Singapore’s mascot, spouting at the river mouth since 1972.',
    photoSpot: { lat: 1.28676, lng: 103.85442 },
    subject: { lat: 1.2869646, lng: 103.8544639 },
    captureRadiusM: GAME.CAPTURE_RADIUS_M,
    rarity: 'legendary',
    spriteUrl: '/sprites/merlion-park.png',
    badgeUrl: '/sprites/badges/merlion-park.png',
    referencePhotoUrl: '',
    eraYears: [1972],
  },
  {
    id: 'viking-ship-museum',
    name: 'Viking Ship Museum',
    blurb: 'Home of the Oseberg ship, buried with two women in the year 834 and dug up in 1904.',
    photoSpot: { lat: 59.904626, lng: 10.684288 },
    subject: { lat: 59.9048334, lng: 10.684127 },
    captureRadiusM: GAME.CAPTURE_RADIUS_M,
    rarity: 'legendary',
    spriteUrl: '/sprites/viking-ship-museum.png',
    badgeUrl: '/sprites/badges/viking-ship-museum.png',
    referencePhotoUrl: '',
    eraYears: [834, 1904],
  },
  {
    id: 'akershus-fortress',
    name: 'Akershus Fortress',
    blurb: 'A medieval castle begun around 1299 that has guarded Oslo’s harbour ever since.',
    photoSpot: { lat: 59.90611, lng: 10.736585 },
    subject: { lat: 59.90638, lng: 10.736316 },
    captureRadiusM: GAME.CAPTURE_RADIUS_M,
    rarity: 'rare',
    spriteUrl: '/sprites/akershus-fortress.png',
    badgeUrl: '/sprites/badges/akershus-fortress.png',
    referencePhotoUrl: '',
    eraYears: [1299, 1624],
  },
  {
    id: 'emmanuel-college',
    name: 'Emmanuel College',
    blurb: 'Founded in 1584 and known as Emma, a Cambridge college whose garden pond ducks are famous.',
    photoSpot: { lat: 52.204144, lng: 0.125688 },
    subject: { lat: 52.20421, lng: 0.125419 },
    captureRadiusM: GAME.CAPTURE_RADIUS_M,
    rarity: 'epic',
    spriteUrl: '/sprites/emmanuel-college.png',
    badgeUrl: '/sprites/badges/emmanuel-college.png',
    referencePhotoUrl: '',
    eraYears: [1584, 1677],
  },
  {
    id: 'great-wall-badaling',
    name: 'Great Wall at Badaling',
    blurb: 'The best-known stretch of the Ming Great Wall, guarding the mountain pass north of Beijing.',
    photoSpot: { lat: 40.350866, lng: 116.004287 },
    subject: { lat: 40.3509393, lng: 116.0040454 },
    captureRadiusM: GAME.CAPTURE_RADIUS_M,
    rarity: 'legendary',
    spriteUrl: '/sprites/great-wall-badaling.png',
    badgeUrl: '/sprites/badges/great-wall-badaling.png',
    referencePhotoUrl: '',
    eraYears: [1505],
  },
];

/** Every landmark the art script draws: London first, then the other cities. */
export const ART_LANDMARKS: readonly Landmark[] = [...SPIKE_LANDMARKS, ...CITY_LANDMARKS];
