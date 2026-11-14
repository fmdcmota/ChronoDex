/**
 * runEraJob: run every stage of one generation job and write each result the moment it exists.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 5.1 (the stage graph), 5.3 rules 2, 4 and 6,
 * and section 4.4 (runEraJob), task A2-09.
 *
 * The graph:
 *   brief (Claude) ─┬─ scene ── panorama
 *                   ├─ headshot
 *                   └─ narration
 *   video tier, once scene + headshot + narration exist:
 *     guide_frame ─┬─ walk_on
 *                  ├─ talk
 *                  └─ walk_off          (stitch is not built yet, A2-14: marked skipped)
 *
 * Rules it keeps:
 * - Write as it lands: every result goes to the Era with patchEra at once, so the player sees the 360°
 *   view long before the video exists. Only the video segments are written together, at the end.
 * - Never pay twice: a core stage whose output is already on the Era is skipped. Every stage saves its
 *   fal request id on the job stage as soon as fal accepts it, and a re-claimed job passes that id back,
 *   so fal returns the finished result instead of running it again. This also recovers the guide frame,
 *   which has no Era field.
 * - Show the work: each stage records its model, start and finish on the job, for the progress sheet.
 * - A failed stage does not stop independent stages. Its dependants are marked skipped. The era's core
 *   tier is `failed` if any core piece is missing, and asking again retries only what is missing.
 * - Keep the lease: a wait for fal renews the job lease (heartbeatJob) at most once a minute.
 */
import { bearingDeg, type Era, type EraBrief, type Guide, type Job, type StageKey, parseEraId } from '@/lib/contracts';
import { getEra, getLandmark, patchEra } from '@/lib/db';
import { finishJob, heartbeatJob, patchStage } from '@/lib/jobs';
import { HISTORIAN_MODEL } from '@/lib/historian';
import { MODELS, WALK_DURATION_S } from '@/lib/fal';
import { defaultDeps, PANORAMA_VFOV_DEG, type PipelineDeps } from './deps';
import type { StageContext, StageOutput } from './stages';

/** Renew the job lease at most this often while waiting on fal. The lease is 10 minutes (jobs/README). */
export const HEARTBEAT_INTERVAL_MS = 60_000;
/** Spoken words per second, measured on 16 voice clips in A2-04. Used only to guess a clip length fal does not report. */
export const SPEECH_WORDS_PER_S = 2.9;

/** The text half of an era is present when the Historian has already written it. */
function hasBrief(era: Era): boolean {
  return Boolean(era.title && era.summary && era.sceneBrief && era.guide);
}

/** Rebuild the Historian's brief from an era that already has one. */
function briefFromEra(era: Era): EraBrief {
  const { headshotUrl, ...guide } = era.guide as Guide;
  void headshotUrl;
  return {
    title: era.title as string,
    summary: era.summary as string,
    funFacts: era.funFacts,
    sources: era.sources,
    sceneBrief: era.sceneBrief as NonNullable<Era['sceneBrief']>,
    guide,
  };
}

/** Whole words in a script, for estimating how long it takes to say. */
function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Run a claimed job to the end.
 *
 * Side effects: Claude and fal requests (none in dry-run mode), writes to the era and the job, and
 * always finishes the job, `succeeded` only when every requested tier is complete.
 * Never throws: an unexpected error is logged and the job is finished as `failed`.
 *
 * @param job - A job in state `running`, as returned by claimNextJob. A re-claimed job keeps its stages.
 * @param deps - The Historian and stage functions. Defaults to the dry-run set when
 *   NEXT_PUBLIC_USE_MOCKS=1 and to the real, paid set otherwise. Tests inject fakes.
 * @returns Resolves when the job is finished, either way.
 */
export async function runEraJob(job: Job, deps: PipelineDeps = defaultDeps()): Promise<void> {
  try {
    const ok = await executeJob(job, deps);
    await finishJob(job.id, ok ? 'succeeded' : 'failed');
  } catch (err) {
    console.error(`runEraJob: job ${job.id} crashed`, err);
    await finishJob(job.id, 'failed').catch(() => undefined);
  }
}

/** Do the work. Returns true when every requested tier finished. */
async function executeJob(job: Job, deps: PipelineDeps): Promise<boolean> {
  const { landmarkId, year } = parseEraId(job.eraId);
  const [landmark, startEra] = await Promise.all([getLandmark(landmarkId), getEra(job.eraId)]);
  if (!landmark || !startEra) throw new Error(`Era "${job.eraId}" or its landmark is missing`);

  const wantsVideo = job.includeVideo && startEra.videoState !== 'ready';
  await patchEra(job.eraId, { state: startEra.state === 'ready' ? 'ready' : 'generating', ...(wantsVideo ? { videoState: 'generating' } : {}) });

  let lastHeartbeatMs = Date.now();
  /**
   * Run one stage with its bookkeeping. Resolves to the output, or null when it failed. A thrown error
   * is recorded on the job stage and does not propagate, so independent stages carry on.
   */
  async function step(key: StageKey, model: string, run: (ctx: StageContext) => Promise<StageOutput>): Promise<StageOutput | null> {
    const saved = job.stages.find((stage) => stage.key === key)?.falRequestId ?? null;
    await patchStage(job.id, key, { state: 'running', model, startedAt: new Date().toISOString(), finishedAt: null, error: null });
    try {
      const out = await run({
        resumeRequestId: saved,
        onRequestId: async (id) => void (await patchStage(job.id, key, { falRequestId: id })),
        onPoll: async () => {
          if (Date.now() - lastHeartbeatMs >= HEARTBEAT_INTERVAL_MS) {
            lastHeartbeatMs = Date.now();
            await heartbeatJob(job.id);
          }
        },
      });
      await patchStage(job.id, key, { state: 'done', model: out.model, finishedAt: new Date().toISOString() });
      return out;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`runEraJob: stage ${key} failed for ${job.eraId}: ${message}`);
      await patchStage(job.id, key, { state: 'failed', error: message.slice(0, 500), finishedAt: new Date().toISOString() });
      return null;
    }
  }
  /** Record a stage that did not run because something it needs is missing, or its output already exists. */
  async function skip(key: StageKey, reason: string | null): Promise<null> {
    await patchStage(job.id, key, { state: 'skipped', error: reason });
    return null;
  }

  // ---- brief -------------------------------------------------------------------------------------
  // A holder object: TypeScript cannot see an assignment made inside the step's callback.
  const briefBox: { value: EraBrief | null } = { value: null };
  if (hasBrief(startEra)) {
    briefBox.value = briefFromEra(startEra);
    await skip('brief', null);
  } else {
    await step('brief', HISTORIAN_MODEL, async () => {
      const startedMs = Date.now();
      briefBox.value = await deps.writeBrief(landmark, year);
      return { url: '', model: HISTORIAN_MODEL, requestId: null, elapsedMs: Date.now() - startedMs };
    });
    if (briefBox.value) {
      const written = briefBox.value;
      await patchEra(job.eraId, {
        title: written.title,
        summary: written.summary,
        funFacts: written.funFacts,
        sources: written.sources,
        sceneBrief: written.sceneBrief,
        guide: { ...written.guide, headshotUrl: null },
      });
    }
  }
  const brief = briefBox.value;

  // Era as stored now: later writes and the "already exists" checks read from it.
  let era = (await getEra(job.eraId)) as Era;
  const coreStages: StageKey[] = ['scene', 'panorama', 'headshot', 'narration'];
  let sceneUrl: string | null = era.sceneImageUrl;
  let headshotUrl: string | null = era.guide?.headshotUrl ?? null;
  let narrationUrl: string | null = era.narrationAudioUrl;

  if (!brief) {
    for (const key of coreStages) await skip(key, 'Skipped: the brief failed');
  } else {
    const guide = brief.guide;
    // Three independent branches. Within the first, panorama waits for the scene.
    await Promise.all([
      (async () => {
        if (sceneUrl) await skip('scene', null);
        else {
          const out = await step('scene', MODELS.scene.endpoint, (ctx) =>
            deps.stages.scene({ referencePhotoUrl: landmark.referencePhotoUrl, brief: brief.sceneBrief, year }, ctx),
          );
          if (out) {
            sceneUrl = out.url;
            await patchEra(job.eraId, { sceneImageUrl: out.url });
          }
        }
        if (era.panorama) await skip('panorama', null);
        else if (!sceneUrl) await skip('panorama', 'Skipped: the scene failed');
        else {
          const out = await step('panorama', MODELS.panorama.endpoint, async (ctx) => {
            const made = await deps.stages.panorama({ sceneUrl: sceneUrl as string, brief: brief.sceneBrief, year }, ctx);
            await patchEra(job.eraId, {
              panorama: {
                url: made.url,
                widthPx: made.widthPx,
                heightPx: made.heightPx,
                vFovDeg: PANORAMA_VFOV_DEG,
                centreBearingDeg: bearingDeg(landmark.photoSpot, landmark.subject),
              },
            });
            return made;
          });
          void out;
        }
      })(),
      (async () => {
        if (headshotUrl) return skip('headshot', null);
        const out = await step('headshot', MODELS.headshot.endpoint, (ctx) => deps.stages.headshot({ guide, year }, ctx));
        if (out) {
          headshotUrl = out.url;
          // patchEra replaces `guide` whole, so write the complete guide with the portrait in it.
          await patchEra(job.eraId, { guide: { ...guide, headshotUrl: out.url } });
        }
      })(),
      (async () => {
        if (narrationUrl) return skip('narration', null);
        const out = await step('narration', MODELS.narration.endpoint, (ctx) => deps.stages.narration({ guide }, ctx));
        if (out) {
          narrationUrl = out.url;
          await patchEra(job.eraId, { narrationAudioUrl: out.url });
        }
      })(),
    ]);
  }

  era = (await getEra(job.eraId)) as Era;
  const coreComplete = Boolean(era.sceneImageUrl && era.panorama && era.guide?.headshotUrl && era.narrationAudioUrl);
  await patchEra(job.eraId, { state: coreComplete ? 'ready' : 'failed' });
  if (!job.includeVideo) return coreComplete;

  // ---- video tier --------------------------------------------------------------------------------
  const videoKeys: StageKey[] = ['guide_frame', 'walk_on', 'talk', 'walk_off', 'stitch'];
  if (era.videoState === 'ready') {
    for (const key of videoKeys) await skip(key, null);
    return coreComplete;
  }
  const needs = brief && sceneUrl && headshotUrl && narrationUrl;
  if (!needs) {
    for (const key of videoKeys) await skip(key, 'Skipped: the core tier is incomplete');
    await patchEra(job.eraId, { videoState: 'failed' });
    return false;
  }
  const guide = brief.guide;
  const frame = await step('guide_frame', MODELS.guide_frame.endpoint, (ctx) =>
    deps.stages.guideFrame({ sceneUrl: sceneUrl as string, headshotUrl: headshotUrl as string, guide, year }, ctx),
  );
  let clips: [StageOutput | null, StageOutput | null, StageOutput | null] = [null, null, null];
  if (!frame) {
    for (const key of ['walk_on', 'talk', 'walk_off'] as const) await skip(key, 'Skipped: the guide frame failed');
  } else {
    const walkInput = { sceneUrl: sceneUrl as string, guideFrameUrl: frame.url, guide };
    clips = await Promise.all([
      step('walk_on', MODELS.walk_on.endpoint, (ctx) => deps.stages.walkOn(walkInput, ctx)),
      step('talk', MODELS.talk.endpoint, (ctx) => deps.stages.talk({ guideFrameUrl: frame.url, narrationUrl: narrationUrl as string }, ctx)),
      step('walk_off', MODELS.walk_off.endpoint, (ctx) => deps.stages.walkOff(walkInput, ctx)),
    ]);
  }
  // Joining the clips into one file is A2-14. The player plays the three segments in order meanwhile.
  await skip('stitch', 'Not built yet: the player plays the three clips in order');

  const [walkOn, talk, walkOff] = clips;
  if (walkOn && talk && walkOff) {
    const talkDurationS = talk.durationS ?? Math.round(wordCount(guide.script) / SPEECH_WORDS_PER_S);
    await patchEra(job.eraId, {
      guideVideo: {
        segments: [
          { kind: 'walk_on', url: walkOn.url, durationS: walkOn.durationS ?? WALK_DURATION_S },
          { kind: 'talk', url: talk.url, durationS: talkDurationS },
          { kind: 'walk_off', url: walkOff.url, durationS: walkOff.durationS ?? WALK_DURATION_S },
        ],
        stitchedUrl: null,
      },
      videoState: 'ready',
    });
    return coreComplete;
  }
  await patchEra(job.eraId, { videoState: 'failed' });
  return false;
}
