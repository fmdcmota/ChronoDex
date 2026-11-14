/**
 * Zod schemas matching every type in ./types.ts and the request bodies in ./api.ts.
 *
 * Owner: Agent 1 (Core). Implements MASTER.md section 4 ("adds matching zod schemas").
 * Routes validate input with these (A1-09); the Historian validates Claude's JSON with them (A1-11);
 * tests parse every fixture with them. The `AssertEqual` block at the bottom fails the type check if
 * a schema ever drifts from its TypeScript type.
 */
import { z } from 'zod';
import type * as T from './types';
import type * as A from './api';
import { LANDMARK_ID_PATTERN } from './helpers';

/** A finite number. Rejects NaN and Infinity, which JSON cannot carry anyway. */
const finite = () => z.number().finite();

/** ISO 8601 timestamp in UTC, for example "2026-11-14T15:30:00.000Z". */
export const IsoDateSchema = z.iso.datetime();

/** Lowercase kebab-case slug. */
export const LandmarkIdSchema = z.string().regex(LANDMARK_ID_PATTERN, 'expected kebab-case');

/** `<landmarkId>_<year>`. Use parseEraId to split it. */
export const EraIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*_-?\d+$/, 'expected <landmarkId>_<year>');

/** WGS84 degrees. */
export const LatLngSchema = z.object({
  lat: finite().min(-90).max(90),
  lng: finite().min(-180).max(180),
});

/** Badge rarity. */
export const RaritySchema = z.enum(['common', 'rare', 'epic', 'legendary']);

/** A landmark document. URLs may be site-relative ("/mock/sprite.svg"), so they are not URL-checked. */
export const LandmarkSchema = z.object({
  id: LandmarkIdSchema,
  name: z.string().min(1),
  blurb: z.string(),
  photoSpot: LatLngSchema,
  subject: LatLngSchema,
  captureRadiusM: finite().positive(),
  rarity: RaritySchema,
  spriteUrl: z.string().min(1),
  badgeUrl: z.string().min(1),
  referencePhotoUrl: z.string().min(1),
  eraYears: z.array(z.number().int()),
});

/** Lifecycle of a generated asset tier. */
export const AssetStateSchema = z.enum(['missing', 'queued', 'generating', 'ready', 'failed']);

/** A citation. */
export const SourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().min(1),
});

/** The Historian's visual description of the scene. */
export const SceneBriefSchema = z.object({
  description: z.string(),
  changes: z.object({
    persists: z.array(z.string()),
    altered: z.array(z.string()),
    notYetBuilt: z.array(z.string()),
    gone: z.array(z.string()),
  }),
  surroundings: z.string(),
  referenceImageUrls: z.array(z.string()),
});

/** The era's fictional guide. */
export const GuideSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  bio: z.string(),
  appearance: z.string(),
  voiceKey: z.string().min(1),
  script: z.string(),
  greeting: z.string(),
  headshotUrl: z.string().nullable(),
});

/** A 360° view or a cropped band of one. */
export const PanoramaSchema = z.object({
  url: z.string().min(1),
  widthPx: z.number().int().positive(),
  heightPx: z.number().int().positive(),
  vFovDeg: finite().positive().max(180),
  centreBearingDeg: finite().min(0).max(360),
});

/** Which clip of the guide video. */
export const SegmentKindSchema = z.enum(['walk_on', 'talk', 'walk_off']);

/** One clip of the guide video. */
export const VideoSegmentSchema = z.object({
  kind: SegmentKindSchema,
  url: z.string().min(1),
  durationS: finite().nonnegative(),
});

/** The three-clip guide video. */
export const GuideVideoSchema = z.object({
  segments: z.array(VideoSegmentSchema),
  stitchedUrl: z.string().nullable(),
});

/** One landmark in one year. */
export const EraSchema = z.object({
  id: EraIdSchema,
  landmarkId: LandmarkIdSchema,
  year: z.number().int(),
  state: AssetStateSchema,
  videoState: AssetStateSchema,
  title: z.string().nullable(),
  summary: z.string().nullable(),
  funFacts: z.array(z.string()),
  sources: z.array(SourceSchema),
  sceneBrief: SceneBriefSchema.nullable(),
  guide: GuideSchema.nullable(),
  sceneImageUrl: z.string().nullable(),
  panorama: PanoramaSchema.nullable(),
  narrationAudioUrl: z.string().nullable(),
  guideVideo: GuideVideoSchema.nullable(),
  updatedAt: IsoDateSchema,
});

/** What the Historian returns. The guide has no headshot yet. */
export const EraBriefSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  funFacts: z.array(z.string()),
  sources: z.array(SourceSchema),
  sceneBrief: SceneBriefSchema,
  guide: GuideSchema.omit({ headshotUrl: true }),
});

/** Every pipeline stage key, core tier first. */
export const StageKeySchema = z.enum([
  'brief',
  'scene',
  'panorama',
  'headshot',
  'narration',
  'guide_frame',
  'walk_on',
  'talk',
  'walk_off',
  'stitch',
]);

/** Progress of one stage. */
export const JobStageSchema = z.object({
  key: StageKeySchema,
  label: z.string(),
  state: z.enum(['pending', 'running', 'done', 'failed', 'skipped']),
  model: z.string().nullable(),
  falRequestId: z.string().nullable(),
  startedAt: IsoDateSchema.nullable(),
  finishedAt: IsoDateSchema.nullable(),
  error: z.string().nullable(),
});

/** A generation job for one era. */
export const JobSchema = z.object({
  id: z.string().min(1),
  eraId: EraIdSchema,
  includeVideo: z.boolean(),
  state: z.enum(['queued', 'running', 'succeeded', 'failed']),
  stages: z.array(JobStageSchema),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});

/** A collected badge. */
export const CaptureSchema = z.object({
  id: z.string().min(1),
  playerId: z.string().min(1),
  landmarkId: LandmarkIdSchema,
  photoUrl: z.string().min(1),
  location: LatLngSchema,
  accuracyM: finite().nonnegative(),
  distanceM: finite().nonnegative(),
  capturedAt: IsoDateSchema,
});

/** Response of POST /api/captures. */
export const CaptureResultSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    capture: CaptureSchema,
    landmark: LandmarkSchema,
    alreadyCollected: z.boolean(),
  }),
  z.object({
    ok: z.literal(false),
    reason: z.enum(['too_far', 'location_missing', 'photo_missing']),
    nearest: z.object({ landmarkId: LandmarkIdSchema, distanceM: finite().nonnegative() }).nullable(),
  }),
]);

/** One chat bubble. */
export const ChatMessageSchema = z.object({
  role: z.enum(['player', 'guide']),
  text: z.string(),
});

/** One SSE event from POST /api/chat. */
export const ChatStreamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('delta'), text: z.string() }),
  z.object({ type: z.literal('done'), text: z.string() }),
  z.object({ type: z.literal('error'), message: z.string() }),
]);

// ---------------------------------------------------------------------------
// Request bodies (MASTER.md 4.3)
// ---------------------------------------------------------------------------

/** Longest chat message accepted from a player, in characters. Keeps prompt cost bounded. */
export const MAX_CHAT_MESSAGE_CHARS = 2000;
/** Most messages of history sent with one chat request. */
export const MAX_CHAT_HISTORY = 60;
/** Longest text POST /api/voice/tts will speak, in characters. */
export const MAX_TTS_CHARS = 1500;

/** Error response body. */
export const ApiErrorBodySchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

/** POST /api/captures request. A missing or malformed location becomes null, not a 400. */
export const CaptureRequestSchema = z.object({
  playerId: z.string().min(1),
  photoUrl: z.string(),
  location: LatLngSchema.nullable().catch(null),
  accuracyM: finite().nonnegative(),
  spoofed: z.boolean().optional(),
});

/** POST /api/eras/[eraId]/generate request. */
export const GenerateRequestSchema = z.object({
  includeVideo: z.boolean(),
});

/** POST /api/chat request. */
export const ChatRequestSchema = z.object({
  eraId: EraIdSchema,
  playerId: z.string().min(1),
  messages: z
    .array(ChatMessageSchema.extend({ text: z.string().max(MAX_CHAT_MESSAGE_CHARS) }))
    .min(1)
    .max(MAX_CHAT_HISTORY),
});

/** POST /api/voice/tts request. */
export const TtsRequestSchema = z.object({
  eraId: EraIdSchema,
  text: z.string().min(1).max(MAX_TTS_CHARS),
});

// ---------------------------------------------------------------------------
// Compile-time drift check: each schema's output must equal its TypeScript type exactly.
// ---------------------------------------------------------------------------

type Equal<X, Y> = [X] extends [Y] ? ([Y] extends [X] ? true : false) : false;
type AssertEqual<X, Y> = Equal<X, Y> extends true ? true : ['schema drifted from type', X, Y];

/** Not used at runtime. Fails `npm run typecheck` when a schema and its type disagree. */
export type _SchemaTypeChecks = [
  AssertEqual<z.infer<typeof LatLngSchema>, T.LatLng>,
  AssertEqual<z.infer<typeof LandmarkSchema>, T.Landmark>,
  AssertEqual<z.infer<typeof SourceSchema>, T.Source>,
  AssertEqual<z.infer<typeof SceneBriefSchema>, T.SceneBrief>,
  AssertEqual<z.infer<typeof GuideSchema>, T.Guide>,
  AssertEqual<z.infer<typeof PanoramaSchema>, T.Panorama>,
  AssertEqual<z.infer<typeof VideoSegmentSchema>, T.VideoSegment>,
  AssertEqual<z.infer<typeof GuideVideoSchema>, T.GuideVideo>,
  AssertEqual<z.infer<typeof EraSchema>, T.Era>,
  AssertEqual<z.infer<typeof EraBriefSchema>, T.EraBrief>,
  AssertEqual<z.infer<typeof JobStageSchema>, T.JobStage>,
  AssertEqual<z.infer<typeof JobSchema>, T.Job>,
  AssertEqual<z.infer<typeof CaptureSchema>, T.Capture>,
  AssertEqual<z.infer<typeof CaptureResultSchema>, T.CaptureResult>,
  AssertEqual<z.infer<typeof ChatMessageSchema>, T.ChatMessage>,
  AssertEqual<z.infer<typeof ChatStreamEventSchema>, T.ChatStreamEvent>,
  AssertEqual<z.infer<typeof CaptureRequestSchema>, A.CaptureRequest>,
  AssertEqual<z.infer<typeof GenerateRequestSchema>, A.GenerateRequest>,
  AssertEqual<z.infer<typeof ChatRequestSchema>, A.ChatRequest>,
  AssertEqual<z.infer<typeof TtsRequestSchema>, A.TtsRequest>,
  AssertEqual<z.infer<typeof ApiErrorBodySchema>, A.ApiErrorBody>,
];

/** Every element of _SchemaTypeChecks must be `true`; this line turns a mismatch into an error. */
const _schemaChecksPass: _SchemaTypeChecks extends true[] ? true : never = true;
void _schemaChecksPass;
