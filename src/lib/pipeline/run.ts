/**
 * runEraJob: run every stage of one generation job and write each result the moment it exists.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 5.1 (the stage graph), 5.3 rules 2, 4 and 6,
 * and section 4.4 (runEraJob), task A2-09.
 *
 * The graph:
 *   brief (Historian) ─┬─ scene ── panorama
 *                   ├─ headshot
 *                   └─ narration
 *   video tier, once scene + headshot + narration exist:
 *     guide_frame ─┬─ walk_on
 *                  ├─ talk
 *                  └─ walk_off
 *   then, optionally, stitch: one file instead of three, used only if its audio and length survive
 *
 * Rules it keeps:
 * - Keep every file: each output is copied into the media store (`./media.ts`, Agent 4's `@/lib/media`) and the
 *   Era holds `/api/media/<id>`, never a fal URL that expires. Stored inputs go back to fal through `toFalUrl`.
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
import { historianModel } from '@/lib/historian';
import { MODELS, WALK_DURATION_S } from '@/lib/fal';
import { defaultDeps, PANORAMA_VFOV_DEG, type PipelineDeps } from './deps';
import { passThroughMedia } from './media';
import type { StageContext, StageOutput } from './stages';

/** Renew the job lease at most this often while waiting on fal. The lease is 10 minutes (jobs/README). */
export const HEARTBEAT_INTERVAL_MS = 60_000;
/** Spoken words per second, measured on 16 voice clips in A2-04. Used only to guess a clip length fal does not report. */
export const SPEECH_WORDS_PER_S = 2.9;

/**
 * The look of period pictures, from the PERIOD_LOOK setting: `monochrome` for real black-and-white style
 * photographs, anything else (or nothing) for the default restrained colour. A human decision (asked on the
 * board); a setting, not a constant, so it can change without a code change.
 *
 * @returns `monochrome` or `colour`.
 */
export function periodLook(): 'colour' | 'monochrome' {
  return process.env.PERIOD_LOOK === 'monochrome' ? 'monochrome' : 'colour';
}

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
 * Side effects: Historian and fal requests (none in dry-run mode), writes to the era and the job, and
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

  const media = deps.media ?? passThroughMedia;
  /**
   * Keep an output in our media store and return the URL to write on the Era. If storing fails the paid result is
   * not thrown away: the fal URL is kept (it lives at least 7 days) and the problem is logged, so
   * scripts/persist-media.ts can store it later.
   */
  async function keep(url: string, name: string): Promise<string> {
    try {
      return await media.persist(url, job.eraId, name);
    } catch (err) {
      console.error(`runEraJob: could not store ${name} for ${job.eraId}, keeping the fal URL: ${err instanceof Error ? err.message : String(err)}`);
      return url;
    }
  }
  /** Period photographs for the model: shrunk and uploaded once. One that cannot be fetched is dropped, not fatal. */
  async function preparedReferences(urls: string[]): Promise<string[]> {
    const ready = await Promise.all(
      urls.map((url) =>
        media.prepareReference(url).catch((err: unknown) => {
          console.warn(`runEraJob: dropping period reference ${url}: ${err instanceof Error ? err.message : String(err)}`);
          return null;
        }),
      ),
    );
    return ready.filter((url): url is string => url !== null);
  }

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
      if (out.check) {
        // The worker log is where a human sees whether the critic had to step in, and what it still disliked.
        const c = out.check;
        const verdict = c.checked ? (c.passed ? 'passed the check' : `kept with problems: ${c.problems.join('; ')}`) : 'not checked';
        console.log(`runEraJob: ${key} for ${job.eraId}: ${c.attempts} attempt(s), ${verdict}, check cost ${c.checkCostUsd.toFixed(4)} USD`);
      }
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
    await step('brief', historianModel(), async () => {
      const startedMs = Date.now();
      briefBox.value = await deps.writeBrief(landmark, year);
      return { url: '', model: historianModel(), requestId: null, elapsedMs: Date.now() - startedMs };
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
          const out = await step('scene', MODELS.scene.endpoint, async (ctx) => {
            // toFalUrl refuses an .svg and uploads /reference/<id>.jpg once (A2-a); references are shrunk (A2-i).
            const referencePhotoUrl = await media.toFalUrl(landmark.referencePhotoUrl);
            const referenceImageUrls = await preparedReferences(brief.sceneBrief.referenceImageUrls ?? []);
            const made = await deps.stages.scene({ referencePhotoUrl, brief: { ...brief.sceneBrief, referenceImageUrls }, year, look: periodLook() }, ctx);
            return { ...made, url: await keep(made.url, 'scene') };
          });
          if (out) {
            sceneUrl = out.url;
            await patchEra(job.eraId, { sceneImageUrl: out.url });
          }
        }
        if (era.panorama) await skip('panorama', null);
        else if (!sceneUrl) await skip('panorama', 'Skipped: the scene failed');
        else {
          const out = await step('panorama', MODELS.panorama.endpoint, async (ctx) => {
            const sceneForFal = await media.toFalUrl(sceneUrl as string);
            const referenceImageUrls = await preparedReferences(brief.sceneBrief.referenceImageUrls ?? []);
            const made = await deps.stages.panorama({ sceneUrl: sceneForFal, brief: { ...brief.sceneBrief, referenceImageUrls }, year, look: periodLook() }, ctx);
            const keptUrl = await keep(made.url, 'panorama');
            await patchEra(job.eraId, {
              panorama: {
                url: keptUrl,
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
        const out = await step('headshot', MODELS.headshot.endpoint, async (ctx) => {
          const made = await deps.stages.headshot({ guide, year }, ctx);
          return { ...made, url: await keep(made.url, 'headshot') };
        });
        if (out) {
          headshotUrl = out.url;
          // patchEra replaces `guide` whole, so write the complete guide with the portrait in it.
          await patchEra(job.eraId, { guide: { ...guide, headshotUrl: out.url } });
        }
      })(),
      (async () => {
        if (narrationUrl) return skip('narration', null);
        const out = await step('narration', MODELS.narration.endpoint, async (ctx) => {
          const made = await deps.stages.narration({ guide }, ctx);
          return { ...made, url: await keep(made.url, 'narration') };
        });
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
  // Stored inputs become live fal URLs once, here, for every video stage. A failure (an expired upload that cannot be
  // renewed) fails the video tier with the reason instead of sending fal a URL it cannot read.
  let falInputs: { scene: string; headshot: string; narration: string };
  try {
    falInputs = {
      scene: await media.toFalUrl(sceneUrl as string),
      headshot: await media.toFalUrl(headshotUrl as string),
      narration: await media.toFalUrl(narrationUrl as string),
    };
  } catch (err) {
    const reason = `Skipped: the stored inputs could not be sent to fal (${err instanceof Error ? err.message : String(err)})`;
    for (const key of videoKeys) await skip(key, reason.slice(0, 500));
    await patchEra(job.eraId, { videoState: 'failed' });
    return false;
  }
  const frame = await step('guide_frame', MODELS.guide_frame.endpoint, (ctx) =>
    deps.stages.guideFrame({ sceneUrl: falInputs.scene, headshotUrl: falInputs.headshot, guide, year }, ctx),
  );
  let clips: [StageOutput | null, StageOutput | null, StageOutput | null] = [null, null, null];
  if (!frame) {
    for (const key of ['walk_on', 'talk', 'walk_off'] as const) await skip(key, 'Skipped: the guide frame failed');
  } else {
    // The guide frame is stored too, so a later run can resume from it, but the clips use the fal URL directly.
    void keep(frame.url, 'guide_frame');
    const walkInput = { sceneUrl: falInputs.scene, guideFrameUrl: frame.url, guide };
    clips = await Promise.all([
      step('walk_on', MODELS.walk_on.endpoint, (ctx) => deps.stages.walkOn(walkInput, ctx)),
      step('talk', MODELS.talk.endpoint, (ctx) => deps.stages.talk({ guideFrameUrl: frame.url, narrationUrl: falInputs.narration }, ctx)),
      step('walk_off', MODELS.walk_off.endpoint, (ctx) => deps.stages.walkOff(walkInput, ctx)),
    ]);
  }
  const [walkOn, talk, walkOff] = clips;
  if (walkOn && talk && walkOff) {
    const talkDurationS = talk.durationS ?? Math.round(wordCount(guide.script) / SPEECH_WORDS_PER_S);
    const [walkOnUrl, talkUrl, walkOffUrl] = await Promise.all([keep(walkOn.url, 'walk_on'), keep(talk.url, 'talk'), keep(walkOff.url, 'walk_off')]);
    const segments = [
      { kind: 'walk_on' as const, url: walkOnUrl, durationS: walkOn.durationS ?? WALK_DURATION_S },
      { kind: 'talk' as const, url: talkUrl, durationS: talkDurationS },
      { kind: 'walk_off' as const, url: walkOffUrl, durationS: walkOff.durationS ?? WALK_DURATION_S },
    ];
    // The three clips are already a complete guide video, so mark it ready now. Stitching is a bonus after that.
    await patchEra(job.eraId, { guideVideo: { segments, stitchedUrl: null }, videoState: 'ready' });

    // Optional: one file instead of three. It is only used if the audio and the length survive (stages/stitch.ts);
    // otherwise, and whenever fal refuses (it does on our key today), the player plays the three clips in order.
    // A failed stitch is recorded as skipped, never failed, so it cannot fail the job or the era.
    await patchStage(job.id, 'stitch', { state: 'running', model: MODELS.stitch.endpoint, startedAt: new Date().toISOString(), finishedAt: null, error: null });
    // fal must read the clips, so it gets the fal URLs, not our stored ones.
    const outcome = await deps.stages.stitch({ clipUrls: [walkOn.url, talk.url, walkOff.url], expectedDurationS: segments.reduce((sum, s) => sum + s.durationS, 0) });
    if (outcome.output) {
      await patchEra(job.eraId, { guideVideo: { segments, stitchedUrl: await keep(outcome.output.url, 'stitched') } });
      await patchStage(job.id, 'stitch', { state: 'done', model: outcome.output.model, finishedAt: new Date().toISOString() });
    } else {
      console.log(`runEraJob: stitch for ${job.eraId} skipped: ${outcome.reason}`);
      await patchStage(job.id, 'stitch', { state: 'skipped', error: outcome.reason, finishedAt: new Date().toISOString() });
    }
    return coreComplete;
  }
  await skip('stitch', 'Skipped: a clip is missing');
  await patchEra(job.eraId, { videoState: 'failed' });
  return false;
}
