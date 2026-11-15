/**
 * Mock mode: the typed API client answered from fixtures, with no network or database.
 *
 * Owner: Agent 1 (Core). Implements MASTER.md section 4.5, task A1-05.
 * Turned on by NEXT_PUBLIC_USE_MOCKS=1 (see ./index.ts). Agents 3 and 4 build against it until M2.
 *
 * Behaviour:
 * - Landmarks and eras come from fixtures/. One era (queens-tower_1893) is fully populated.
 * - generateEra on a missing era starts a fake job that advances through its stages over about
 *   MOCK_JOB_DURATION_MS. Progress is computed from the clock on each read, so there are no timers
 *   and polling works exactly as it will against the real API. Media appears stage by stage.
 * - Captures apply the real capture rule (resolveCapture) and persist in localStorage, so the Dex
 *   survives a reload. Everything else resets on reload.
 * - Chat streams a canned in-character reply word by word.
 */
import {
  CORE_STAGES,
  VIDEO_STAGES,
  buildStages,
  eraIdOf,
  eraNeedsGeneration,
  parseEraId,
  resolveCapture,
  type Capture,
  type CaptureRequest,
  type CaptureResult,
  type ChatRequest,
  type ChatStreamEvent,
  type Era,
  type EraBrief,
  type EraId,
  type EraResponse,
  type Job,
  type JobStage,
  type Landmark,
  type LandmarkId,
  type StageKey,
} from '@/lib/contracts';
import {
  MOCK_AUDIO_URL,
  MOCK_HEADSHOT_URL,
  MOCK_PANORAMA,
  MOCK_REFERENCE_URL,
  MOCK_SCENE_URL,
  MOCK_VIDEO_DURATION_S,
  MOCK_VIDEO_URL,
  eras as fixtureEras,
  landmarks as fixtureLandmarks,
  placeholderBrief,
} from '@fixtures/index';
import { withDemoEras, withDemoLandmarks } from '@/lib/demo';
import { ApiError } from './errors';
import { httpApi } from './http';
import { randomUuid } from './player';
import type { ChatOptions, ChronodexApi } from './types';

/** How long a fake job takes from creation to success. MASTER.md 4.5 says about 20 seconds. */
export const MOCK_JOB_DURATION_MS = 20_000;

/** localStorage key for mock captures. */
export const MOCK_CAPTURES_STORAGE_KEY = 'chronodex.mock.captures';

/** Model name shown on fake stages. Real endpoint ids live only in src/lib/fal/models.ts. */
const MOCK_MODEL = 'mock';

/** Text the mock speech-to-text returns. */
export const MOCK_TRANSCRIPT = 'What was daily life like here?';

/**
 * When each stage runs, as fractions of the job's duration: [start, end].
 * Mirrors the dependency graph in MASTER.md 5.1: scene, headshot and narration run in parallel
 * after the brief; panorama follows scene; the video tier follows the core tier.
 * With the video tier, the core tier is compressed into the first half.
 */
const CORE_WINDOWS: Record<(typeof CORE_STAGES)[number], [number, number]> = {
  brief: [0.05, 0.25],
  scene: [0.25, 0.5],
  headshot: [0.25, 0.45],
  narration: [0.25, 0.55],
  panorama: [0.5, 1],
};
const VIDEO_WINDOWS: Record<(typeof VIDEO_STAGES)[number], [number, number]> = {
  guide_frame: [0.5, 0.6],
  walk_on: [0.6, 0.75],
  talk: [0.6, 0.9],
  walk_off: [0.9, 1],
  // The stitch stage is optional (A2-14). Mock mode always skips it, so stitchedUrl stays null.
  stitch: [1, 1],
};
const VIDEO_TIER_CORE_SCALE = 0.5;

/**
 * The window a stage runs in.
 *
 * @param key - The stage.
 * @param includeVideo - Whether the job has the video tier (which compresses the core tier).
 * @returns [start, end] as fractions of MOCK_JOB_DURATION_MS.
 */
function stageWindow(key: StageKey, includeVideo: boolean): [number, number] {
  if (key in CORE_WINDOWS) {
    const [start, end] = CORE_WINDOWS[key as keyof typeof CORE_WINDOWS];
    return includeVideo ? [start * VIDEO_TIER_CORE_SCALE, end * VIDEO_TIER_CORE_SCALE] : [start, end];
  }
  return VIDEO_WINDOWS[key as keyof typeof VIDEO_WINDOWS];
}

/** A fake job in progress: everything needed to recompute its state at any moment. */
interface ActiveJob {
  job: Job;
  startedMs: number;
  /** The era as it was when the job was created. */
  baseEra: Era;
  brief: EraBrief;
  /** Stages whose output already existed, so they are reported as skipped. */
  skipped: Set<StageKey>;
}

/** Options for createMockApi. All optional; tests inject a clock, storage and zero delays. */
export interface MockApiOptions {
  /** Clock in milliseconds. Defaults to Date.now. */
  now?: () => number;
  /** Where captures persist. Defaults to window.localStorage when there is one. */
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  /** Simulated latency of every call. Defaults to 150 ms. */
  latencyMs?: number;
  /** Delay between streamed chat words. Defaults to 45 ms. */
  chatWordDelayMs?: number;
  /**
   * Speak chat replies through the real POST /api/voice/tts instead of returning the sample clip.
   * Defaults to true in a browser, false elsewhere (tests).
   */
  liveVoice?: boolean;
}

const DEFAULT_LATENCY_MS = 150;
const DEFAULT_CHAT_WORD_DELAY_MS = 45;

/**
 * Wait.
 *
 * @param ms - Milliseconds. Zero or less resolves on the next microtask.
 */
function sleep(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

/**
 * Create an independent mock API with its own in-memory state.
 *
 * @param options - Clock, storage and delays. See MockApiOptions.
 * @returns An object with the same methods as the real client.
 */
export function createMockApi(options: MockApiOptions = {}): ChronodexApi {
  const now = options.now ?? Date.now;
  const latencyMs = options.latencyMs ?? DEFAULT_LATENCY_MS;
  const chatWordDelayMs = options.chatWordDelayMs ?? DEFAULT_CHAT_WORD_DELAY_MS;
  const liveVoice = options.liveVoice ?? typeof window !== 'undefined';
  const storage =
    options.storage !== undefined
      ? options.storage
      : typeof window !== 'undefined'
        ? safeLocalStorage()
        : null;

  // The kept demo set (src/lib/demo) over the fixtures, so mock mode shows the real demo eras.
  const landmarks: Landmark[] = withDemoLandmarks(fixtureLandmarks);
  const eras = new Map<EraId, Era>(withDemoEras(fixtureEras).map((era) => [era.id, era]));
  const jobs = new Map<EraId, ActiveJob>();
  let memoryCaptures: Capture[] = [];

  const iso = (ms: number) => new Date(ms).toISOString();

  function findLandmark(id: LandmarkId): Landmark {
    const landmark = landmarks.find((l) => l.id === id);
    if (!landmark) throw new ApiError(404, 'not_found', `No landmark "${id}"`);
    return landmark;
  }

  function findEra(eraId: EraId): Era {
    const era = eras.get(eraId);
    if (!era) throw new ApiError(404, 'not_found', `No era "${eraId}"`);
    return era;
  }

  function readCaptures(): Capture[] {
    if (!storage) return memoryCaptures;
    try {
      const raw = storage.getItem(MOCK_CAPTURES_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Capture[]) : [];
    } catch {
      return [];
    }
  }

  function writeCaptures(captures: Capture[]): void {
    memoryCaptures = captures;
    if (!storage) return;
    try {
      storage.setItem(MOCK_CAPTURES_STORAGE_KEY, JSON.stringify(captures));
    } catch {
      // Storage full or blocked: keep the in-memory copy.
    }
  }

  /** Recompute a fake job and its era at the current time. Commits and clears finished jobs. */
  function materialise(eraId: EraId): EraResponse {
    const active = jobs.get(eraId);
    if (!active) return { era: structuredClone(findEra(eraId)), job: null };

    const t = now();
    const progress = (t - active.startedMs) / MOCK_JOB_DURATION_MS;
    const { includeVideo } = active.job;

    const stages: JobStage[] = active.job.stages.map((stage) => {
      if (active.skipped.has(stage.key)) return { ...stage, state: 'skipped' };
      const [start, end] = stageWindow(stage.key, includeVideo);
      const startedAt = iso(active.startedMs + start * MOCK_JOB_DURATION_MS);
      if (progress >= end) {
        return { ...stage, state: 'done', model: MOCK_MODEL, startedAt, finishedAt: iso(active.startedMs + end * MOCK_JOB_DURATION_MS) };
      }
      if (progress >= start) {
        return { ...stage, state: 'running', model: MOCK_MODEL, falRequestId: `mock-${stage.key}`, startedAt };
      }
      return stage;
    });

    const done = (key: StageKey) => stages.some((s) => s.key === key && s.state === 'done');
    const started = (keys: readonly StageKey[]) =>
      stages.some((s) => keys.includes(s.key) && (s.state === 'running' || s.state === 'done'));
    const tierDone = (keys: readonly StageKey[]) =>
      stages.filter((s) => keys.includes(s.key)).every((s) => s.state === 'done' || s.state === 'skipped');

    const era: Era = structuredClone(active.baseEra);
    const { brief } = active;
    if (done('brief')) {
      era.title = brief.title;
      era.summary = brief.summary;
      era.funFacts = [...brief.funFacts];
      era.sources = brief.sources.map((s) => ({ ...s }));
      era.sceneBrief = structuredClone(brief.sceneBrief);
      era.guide = { ...brief.guide, headshotUrl: era.guide?.headshotUrl ?? null };
    }
    if (done('scene')) era.sceneImageUrl = MOCK_SCENE_URL;
    if (done('panorama')) era.panorama = { ...MOCK_PANORAMA };
    if (done('headshot') && era.guide) era.guide.headshotUrl = MOCK_HEADSHOT_URL;
    if (done('narration')) era.narrationAudioUrl = MOCK_AUDIO_URL;

    if (!active.skipped.has('brief')) {
      era.state = tierDone(CORE_STAGES) ? 'ready' : started(CORE_STAGES) ? 'generating' : 'queued';
    }
    if (includeVideo) {
      era.videoState = tierDone(VIDEO_STAGES) ? 'ready' : started(VIDEO_STAGES) ? 'generating' : 'queued';
      if (tierDone(VIDEO_STAGES)) {
        era.guideVideo = {
          segments: (['walk_on', 'talk', 'walk_off'] as const).map((kind) => ({
            kind,
            url: MOCK_VIDEO_URL,
            durationS: MOCK_VIDEO_DURATION_S,
          })),
          stitchedUrl: null,
        };
      }
    }
    era.updatedAt = iso(t);

    const allDone = stages.every((s) => s.state === 'done' || s.state === 'skipped');
    if (allDone) {
      // A finished job is no longer active: commit the era and report no job, as the real API will.
      eras.set(eraId, era);
      jobs.delete(eraId);
      return { era: structuredClone(era), job: null };
    }
    const job: Job = {
      ...active.job,
      state: stages.some((s) => s.state !== 'pending' && s.state !== 'skipped') ? 'running' : 'queued',
      stages,
      updatedAt: iso(t),
    };
    return { era: structuredClone(era), job };
  }

  /** Compose a canned guide reply for the mock chat. */
  function cannedReply(era: Era, playerTurns: number): string {
    const facts = era.funFacts.length > 0 ? era.funFacts : ['Every street here has a story.'];
    const fact = facts[(playerTurns - 1) % facts.length];
    return `What a fine question! Here is something I can tell you: ${fact} Is there anything else you would like to know about ${era.year}?`;
  }

  return {
    async listLandmarks() {
      await sleep(latencyMs);
      return structuredClone(landmarks);
    },

    async getDex(playerId) {
      await sleep(latencyMs);
      return readCaptures()
        .filter((c) => c.playerId === playerId)
        .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
    },

    async postCapture(body: CaptureRequest): Promise<CaptureResult> {
      await sleep(latencyMs);
      if (!body.location) return { ok: false, reason: 'location_missing', nearest: null };
      const { hit, nearest } = resolveCapture(body.location, body.accuracyM, landmarks);
      const nearestOut = nearest ? { landmarkId: nearest.landmark.id, distanceM: nearest.distanceM } : null;
      if (!body.photoUrl) return { ok: false, reason: 'photo_missing', nearest: nearestOut };
      if (!hit) return { ok: false, reason: 'too_far', nearest: nearestOut };

      const captures = readCaptures();
      const existing = captures.find((c) => c.playerId === body.playerId && c.landmarkId === hit.landmark.id);
      if (existing) return { ok: true, capture: existing, landmark: structuredClone(hit.landmark), alreadyCollected: true };

      const capture: Capture = {
        id: randomUuid(),
        playerId: body.playerId,
        landmarkId: hit.landmark.id,
        photoUrl: body.photoUrl,
        location: { ...body.location },
        accuracyM: body.accuracyM,
        distanceM: hit.distanceM,
        capturedAt: iso(now()),
      };
      writeCaptures([...captures, capture]);
      return { ok: true, capture, landmark: structuredClone(hit.landmark), alreadyCollected: false };
    },

    async listEras(landmarkId) {
      await sleep(latencyMs);
      const landmark = findLandmark(landmarkId);
      return landmark.eraYears.map((year) => materialise(eraIdOf(landmark.id, year)).era);
    },

    async getEra(eraId) {
      await sleep(latencyMs);
      return materialise(eraId);
    },

    async generateEra(eraId, includeVideo) {
      await sleep(latencyMs);
      const current = materialise(eraId);
      if (current.job) return current;
      if (!eraNeedsGeneration(current.era, includeVideo)) return current;

      const { landmarkId, year } = parseEraId(eraId);
      const landmark = findLandmark(landmarkId);
      const coreReady = current.era.state === 'ready';
      const skipped = new Set<StageKey>(coreReady ? CORE_STAGES : []);
      // Mock mode never stitches; the real pipeline may (A2-14).
      if (includeVideo) skipped.add('stitch');
      const t = now();
      const job: Job = {
        id: `mock-job-${randomUuid()}`,
        eraId,
        includeVideo,
        state: 'queued',
        stages: buildStages(year, includeVideo),
        createdAt: iso(t),
        updatedAt: iso(t),
      };
      const baseEra = structuredClone(current.era);
      if (!coreReady) baseEra.state = 'queued';
      if (includeVideo) baseEra.videoState = 'queued';
      eras.set(eraId, baseEra);
      jobs.set(eraId, { job, startedMs: t, baseEra, brief: placeholderBrief(landmark, year), skipped });
      return materialise(eraId);
    },

    async *streamChat(body: ChatRequest, chatOptions?: ChatOptions): AsyncGenerator<ChatStreamEvent> {
      await sleep(latencyMs);
      const era = eras.get(body.eraId);
      if (!era?.guide) {
        yield { type: 'error', message: 'This era has no guide yet' };
        return;
      }
      const playerTurns = Math.max(1, body.messages.filter((m) => m.role === 'player').length);
      const words = cannedReply(era, playerTurns).split(' ');
      let text = '';
      for (const [i, word] of words.entries()) {
        if (chatOptions?.signal?.aborted) return;
        await sleep(chatWordDelayMs);
        const delta = i === 0 ? word : ` ${word}`;
        text += delta;
        yield { type: 'delta', text: delta };
      }
      yield { type: 'done', text };
    },

    async uploadPhoto(file) {
      await sleep(latencyMs);
      // A blob URL lets the Dex show the player's own photo during this session.
      return typeof URL.createObjectURL === 'function' && typeof window !== 'undefined'
        ? URL.createObjectURL(file)
        : MOCK_REFERENCE_URL;
    },

    async textToSpeech(eraId, text) {
      findEra(eraId);
      // In the browser the guide speaks for real: the server's voice route answers with fal speech when
      // it has a key (a chat reply costs a fraction of a cent). A sample clip here sounded like a broken
      // play button. Tests (no window) keep the sample.
      if (liveVoice) return httpApi.textToSpeech(eraId, text);
      await sleep(latencyMs);
      return MOCK_AUDIO_URL;
    },

    async speechToText() {
      await sleep(latencyMs);
      return MOCK_TRANSCRIPT;
    },
  };
}

/** window.localStorage, or null where reading it throws (some private modes). */
function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
