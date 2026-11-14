/**
 * Shared domain types for Chronodex. Every agent imports these.
 *
 * Owner: Agent 1 (Core). Implements MASTER.md section 4.1, copied unchanged.
 * The only additions are doc comments on exports that had none, which the lint rule requires
 * (MASTER.md 8.4 rule 9). Frozen at M0: a change needs a CONTRACT post on BOARD.md, a human yes,
 * and an entry in the contract log in DEV_NOTEBOOK.md.
 */

/** Lowercase kebab-case slug, for example "queens-tower". Never contains "_". */
export type LandmarkId = string;

/** `${landmarkId}_${year}`, for example "queens-tower_1893". Always build it with eraIdOf(). */
export type EraId = string;

/**
 * WGS84 degrees.
 * GeoJSON, MongoDB and MapLibre all use [lng, lat] order. Convert only in src/lib/db and in map code.
 */
export interface LatLng {
  lat: number;
  lng: number;
}

/** How rare a landmark's badge is. Drives badge art and the Dex. */
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

/** A real place a player can capture. Seeded by Agent 1, never created by players. */
export interface Landmark {
  id: LandmarkId;
  name: string;
  /** One line for the map card. */
  blurb: string;
  /** Where the player stands. The 50 m check measures to this point, not to the building. */
  photoSpot: LatLng;
  /** The thing being photographed. With photoSpot it gives the viewing bearing. */
  subject: LatLng;
  /** Metres. GAME.CAPTURE_RADIUS_M unless a landmark needs more. */
  captureRadiusM: number;
  rarity: Rarity;
  /** Map marker art, transparent PNG. */
  spriteUrl: string;
  /** Dex badge art, transparent PNG. */
  badgeUrl: string;
  /** Present-day photo from photoSpot facing subject, normalised to 16:9. Base image for every era edit. */
  referencePhotoUrl: string;
  /** Ascending. Each year has one Era document, generated or not. */
  eraYears: number[];
}

/** Lifecycle of a generated asset tier on an Era. */
export type AssetState = 'missing' | 'queued' | 'generating' | 'ready' | 'failed';

/** A citation for a historical claim. */
export interface Source {
  title: string;
  url: string;
}

/** What the fal pipeline needs to know about how the place looked. Written by the Historian. */
export interface SceneBrief {
  /** What the camera sees from photoSpot in this year, in plain visual terms. */
  description: string;
  /** Differences from the reference photo. Drives the edit prompt. */
  changes: {
    persists: string[];
    altered: string[];
    notYetBuilt: string[];
    gone: string[];
  };
  /** What surrounds the viewer through 360 degrees. Drives the panorama prompt. */
  surroundings: string;
  /** Period images to attach as model references. Public domain or openly licensed only. Never Google imagery. */
  referenceImageUrls: string[];
}

/** The fictional person from the era who appears in the video and answers in the chat. */
export interface Guide {
  /** Fictional. Never a real named person. */
  name: string;
  /** For example "Porter at the Imperial Institute". */
  role: string;
  /** Two sentences, first person. */
  bio: string;
  /** Age, build, clothing. Used in image prompts. */
  appearance: string;
  /** Key into VOICE_CATALOG in src/lib/fal/voices.ts. */
  voiceKey: string;
  /** 105 to 120 words, about 45 seconds spoken. Opens with a self-introduction by name. */
  script: string;
  /** First chat bubble. */
  greeting: string;
  /** Square portrait, the chat profile picture. Null until the pipeline has made it. */
  headshotUrl: string | null;
}

/** A 360° (or cropped-band) view of the place in one year. */
export interface Panorama {
  url: string;
  widthPx: number;
  heightPx: number;
  /** Vertical field of view the image covers. 180 means full equirectangular (2:1). Less means a cropped band. */
  vFovDeg: number;
  /** Compass bearing, 0 to 360 clockwise from north, at the horizontal centre of the image. */
  centreBearingDeg: number;
}

/** The three clips of a guide video, in play order (assumption A6). */
export type SegmentKind = 'walk_on' | 'talk' | 'walk_off';

/** One clip of the guide video. */
export interface VideoSegment {
  kind: SegmentKind;
  url: string;
  durationS: number;
}

/** The guide walking on, talking for about 45 s and walking off. */
export interface GuideVideo {
  /** Play in order with no gap. */
  segments: VideoSegment[];
  /** One-file version, when the stitch stage worked. */
  stitchedUrl: string | null;
}

/** One landmark in one year. Shared by all players. One document per entry in Landmark.eraYears. */
export interface Era {
  id: EraId;
  landmarkId: LandmarkId;
  year: number;
  /** Core tier: text, scene, panorama, headshot, narration. */
  state: AssetState;
  /** Guide video tier. Separate because it is the slowest and costs the most. */
  videoState: AssetState;

  // Text, written by the Historian (Claude). Null or empty while state is 'missing'.
  title: string | null;
  summary: string | null;
  funFacts: string[];
  sources: Source[];
  sceneBrief: SceneBrief | null;
  guide: Guide | null;

  // Media, made by the fal pipeline. Each is null until it exists.
  /** The reference photo edited to this year. Same framing, 16:9. */
  sceneImageUrl: string | null;
  panorama: Panorama | null;
  /** The guide reading guide.script. Plays over the panorama until the video exists. */
  narrationAudioUrl: string | null;
  guideVideo: GuideVideo | null;

  /** ISO 8601, UTC. */
  updatedAt: string;
}

/** What the Historian returns: the text half of an Era, complete, with no headshot yet. */
export interface EraBrief {
  title: string;
  summary: string;
  funFacts: string[];
  sources: Source[];
  sceneBrief: SceneBrief;
  guide: Omit<Guide, 'headshotUrl'>;
}

/** One step of the era pipeline (MASTER.md section 5.1). */
export type StageKey =
  // core tier
  | 'brief' | 'scene' | 'panorama' | 'headshot' | 'narration'
  // video tier
  | 'guide_frame' | 'walk_on' | 'talk' | 'walk_off' | 'stitch';

/** Progress of one pipeline stage inside a Job. */
export interface JobStage {
  key: StageKey;
  /** Shown to the player, for example "Painting the street as it was in 1893". */
  label: string;
  state: 'pending' | 'running' | 'done' | 'failed' | 'skipped';
  /** fal endpoint id or Claude model id that did the work. Shown in the progress sheet. */
  model: string | null;
  /** Saved as soon as fal accepts the request, so a restarted worker resumes instead of paying twice. */
  falRequestId: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
}

/** A request to generate the missing parts of one Era. Run by the worker. */
export interface Job {
  id: string;
  eraId: EraId;
  /** False runs the core tier only. */
  includeVideo: boolean;
  state: 'queued' | 'running' | 'succeeded' | 'failed';
  stages: JobStage[];
  createdAt: string;
  updatedAt: string;
}

/** A player's collected badge: the photo they took within range of a landmark. */
export interface Capture {
  id: string;
  /** Anonymous UUID kept in the browser's localStorage. There are no accounts. */
  playerId: string;
  landmarkId: LandmarkId;
  photoUrl: string;
  location: LatLng;
  /** Accuracy radius reported by the browser, in metres. */
  accuracyM: number;
  /** Computed on the server: distance from location to the landmark's photoSpot. */
  distanceM: number;
  capturedAt: string;
}

/** Response of POST /api/captures. */
export type CaptureResult =
  | { ok: true; capture: Capture; landmark: Landmark; alreadyCollected: boolean }
  | {
      ok: false;
      reason: 'too_far' | 'location_missing' | 'photo_missing';
      nearest: { landmarkId: LandmarkId; distanceM: number } | null;
    };

/** One bubble in the guide chat. */
export interface ChatMessage {
  role: 'player' | 'guide';
  text: string;
}

/** One JSON object per SSE `data:` line from POST /api/chat. */
export type ChatStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; text: string }
  | { type: 'error'; message: string };

/** Game-wide constants. Use these, never bare numbers (MASTER.md 8.4 rule 6). */
export const GAME = {
  CAPTURE_RADIUS_M: 50,
  /** GPS is poor between tall buildings. Up to this much of the reported accuracy is forgiven. */
  ACCURACY_ALLOWANCE_MAX_M: 25,
  /** How often screens poll while a job is running. */
  POLL_INTERVAL_MS: 3000,
} as const;
