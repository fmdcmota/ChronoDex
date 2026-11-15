/**
 * Zod schemas for the Archivist's data files: `data/landmarks/<landmarkId>.json` and
 * `data/eras/<eraId>.json`.
 *
 * Owner: Agent 5 (Archivist). Implements AGENT5.md sections 5.2 and 5.3, task A5-01.
 * The schemas check shape only. The rules that need arithmetic, other files or the network live in
 * ./checks.ts and ./validate.ts. Objects are strict: an unknown key is a mistake, because the
 * Historian and the seed read these files by key.
 */
import { z } from 'zod';
import { EraIdSchema, LandmarkIdSchema, LatLngSchema, SourceSchema } from '@/lib/contracts';

/** The only schema version these scripts read. */
export const SCHEMA_VERSION = 1;

/** A calendar year the game can show. The range rejects typos such as 18930. */
const YearSchema = z.number().int().min(1000).max(2100);

/** A compass bearing, 0 to 360 clockwise from north. */
const BearingSchema = z.number().finite().min(0).max(360);

/** How far a landmark file has got: done, waiting on something listed, or waiting on a human. */
export const LandmarkStatusSchema = z.enum(['validated', 'partial', 'blocked']);

/** Where the reference photo came from. `h1_validated` is the team's own photo and is best. */
export const ReferencePhotoStatusSchema = z.enum(['h1_validated', 'commons_stand_in', 'missing']);

/** One receipt for a coordinate: the map object or database entry it was read from. */
export const GeometryEvidenceSchema = z.strictObject({
  kind: z.enum(['osm', 'wikidata', 'commons', 'historic_england', 'other']),
  /** For example "way/788526940" or "Q7270127". */
  ref: z.string().min(1),
  url: z.url(),
  note: z.string().min(1),
});

/**
 * The present-day photo every scene edit starts from. All fields except `status` and `notes` are
 * null while `status` is `missing`.
 */
export const ReferencePhotoSchema = z.strictObject({
  status: ReferencePhotoStatusSchema,
  /** Repo path of the 1600x900 JPEG, for example "data/reference/queens-tower.jpg". */
  file: z.string().nullable(),
  /** Direct URL of the original file the crop was made from. */
  originalUrl: z.url().nullable(),
  /** The page that states the licence and author. */
  pageUrl: z.url().nullable(),
  licence: z.string().nullable(),
  author: z.string().nullable(),
  /** ISO 8601 date the photo was taken. */
  takenAt: z.string().nullable(),
  /** Camera position, when the source records one. */
  takenFrom: LatLngSchema.nullable(),
  /** Camera bearing, when known. */
  facingDeg: BearingSchema.nullable(),
  /** The crop box in words, so the crop can be repeated. */
  crop: z.string().nullable(),
  notes: z.string(),
});

/** `data/landmarks/<landmarkId>.json`: geometry, reference photo and years for one landmark. */
export const LandmarkFileSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: LandmarkIdSchema,
  name: z.string().min(1),
  status: LandmarkStatusSchema,
  subject: LatLngSchema,
  photoSpot: LatLngSchema,
  /** Bearing from photoSpot to subject. */
  facingDeg: BearingSchema,
  /** Distance from photoSpot to subject, in metres. */
  distanceM: z.number().finite().positive(),
  captureRadiusM: z.number().finite().positive(),
  geometryEvidence: z.array(GeometryEvidenceSchema).min(1),
  photoSpotReason: z.string().min(1),
  referencePhoto: ReferencePhotoSchema,
  /** Ascending. Each year has one era file. */
  eraYears: z.array(YearSchema),
  /** Why each year is worth seeing, keyed by the year as text. */
  eraYearsReason: z.record(z.string(), z.string().min(1)),
  /** Years considered and dropped, with the reason. */
  rejectedYears: z.record(z.string(), z.string().min(1)),
  openQuestions: z.array(z.string().min(1)),
});

/** How well a fact is supported. `high` meets AGENT5.md rule 4.3; `medium` is one good secondary source. */
export const ConfidenceSchema = z.enum(['high', 'medium']);

/** One sourced claim about the place in or near the year. */
export const FactSchema = z.strictObject({
  claim: z.string().min(1),
  sources: z.array(SourceSchema),
  confidence: ConfidenceSchema,
  /** True when the fact changes what the camera sees. */
  visible: z.boolean(),
  /** True when the fact is short and surprising enough for the fun-fact list. */
  funFact: z.boolean(),
});

/** What a daily-life note is for when the Historian writes the guide. */
export const DailyLifeUseSchema = z.enum(['dress', 'transport', 'prices', 'customs', 'speech', 'work', 'food', 'other']);

/** One sourced note on everyday life in the area in the year. */
export const DailyLifeSchema = z.strictObject({
  claim: z.string().min(1),
  sources: z.array(SourceSchema),
  use: DailyLifeUseSchema,
});

/** The view in the year, in a painter's words. Maps one to one onto the contract's SceneBrief. */
export const SceneSchema = z.strictObject({
  description: z.string().min(1),
  persists: z.array(z.string()),
  altered: z.array(z.string()),
  notYetBuilt: z.array(z.string()),
  gone: z.array(z.string()),
  surroundings: z.string().min(1),
});

/** How closely a period image matches the player's view. Only the first two go to the image model. */
export const ImageMatchSchema = z.enum(['same_view', 'nearby', 'context']);

/** How sure the depicted date is: stated, within five years, or a range. */
export const DateCertaintySchema = z.enum(['exact', 'circa', 'range']);

/** One period image with its licence receipt. */
export const ReferenceImageSchema = z.strictObject({
  /** Direct image file URL, 1024 to 2048 px on the long side. */
  url: z.url(),
  /** The file page that states licence and author. */
  pageUrl: z.url(),
  title: z.string().min(1),
  /** The year or years the image shows, not the upload date. For example "1893" or "1886-1890". */
  date: z.string().min(1),
  dateCertainty: DateCertaintySchema,
  /** Exactly as the source states it. */
  licence: z.string().min(1),
  author: z.string().min(1),
  widthPx: z.number().int().positive(),
  heightPx: z.number().int().positive(),
  match: ImageMatchSchema,
  /** Bearing the image looks along, when it can be told. */
  facingDeg: BearingSchema.nullable(),
  notes: z.string(),
});

/** A plausible everyday occupation at the place in the year, with its receipt. Never a real person. */
export const RoleSchema = z.strictObject({
  role: z.string().min(1),
  sources: z.array(SourceSchema),
});

/** Period detail the Historian needs to write a believable fictional guide. */
export const GuideGroundingSchema = z.strictObject({
  roles: z.array(RoleSchema),
  dress: z.string(),
  speech: z.string(),
  prices: z.string(),
  transport: z.string(),
});

/** Whether an era is ready to generate from. */
export const EraStatusSchema = z.enum(['validated', 'thin_record', 'rejected']);

/** `data/eras/<eraId>.json`: the research dossier for one landmark in one year. */
export const EraFileSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  eraId: EraIdSchema,
  landmarkId: LandmarkIdSchema,
  year: YearSchema,
  status: EraStatusSchema,
  facts: z.array(FactSchema),
  dailyLife: z.array(DailyLifeSchema),
  scene: SceneSchema,
  referenceImages: z.array(ReferenceImageSchema),
  guideGrounding: GuideGroundingSchema,
  /** Union of every URL cited above, deduplicated. Becomes Era.sources. */
  sources: z.array(SourceSchema),
  gaps: z.array(z.string().min(1)),
  /** ISO 8601, UTC: when the sources were last opened and read. */
  checkedAt: z.iso.datetime(),
});

/** A landmark data file. */
export type LandmarkFile = z.infer<typeof LandmarkFileSchema>;
/** The reference photo block of a landmark data file. */
export type ReferencePhoto = z.infer<typeof ReferencePhotoSchema>;
/** An era dossier. */
export type EraFile = z.infer<typeof EraFileSchema>;
/** One sourced claim in an era dossier. */
export type Fact = z.infer<typeof FactSchema>;
/** One period image in an era dossier. */
export type ReferenceImage = z.infer<typeof ReferenceImageSchema>;
/** A citation, as in the contract's Source. */
export type DataSource = z.infer<typeof SourceSchema>;
