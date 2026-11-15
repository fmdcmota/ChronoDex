/**
 * Tests for runEraJob on the in-memory database and queue, with fake stages that record how they
 * were called. Owner: Agent 2 (Studio). Task A2-09. Nothing here calls the Historian or fal.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eraIdOf, type EraBrief, type Job, type StageKey } from '@/lib/contracts';
import { getEra, resetMemoryDb } from '@/lib/db';
import { historianModel } from '@/lib/historian';
import { claimNextJob, getJob, requestEraGeneration, resetMemoryJobs } from '@/lib/jobs';
import { placeholderBrief } from '@fixtures/index';
import { dryRunDeps, type PipelineDeps } from './deps';
import { runEraJob } from './index';
import type { StageContext } from './stages';
import type { StitchOutcome } from './stages/stitch';

const ERA_ID = eraIdOf('natural-history-museum', 1862);

/** Stage functions that fail on request. */
type Failures = Partial<Record<StageKey, string>>;

/** A recorder of calls, and the fake dependencies built on it. */
function makeDeps(failures: Failures = {}, durationOfTalkS: number | null = 44.2, stitch: StitchOutcome = { output: null, reason: 'test: not stitched' }) {
  const calls: { key: string; ctx: StageContext }[] = [];
  const briefCalls: number[] = [];
  const stitchCalls: { clipUrls: string[]; expectedDurationS: number }[] = [];
  /** Run one fake stage: record it, save a request id like a real stage would, fail if told to. */
  async function stage<T>(key: StageKey, ctx: StageContext, make: () => T): Promise<T> {
    calls.push({ key, ctx });
    await ctx.onRequestId?.(`${key}-req`);
    await ctx.onPoll?.();
    if (failures[key]) throw new Error(failures[key]);
    return make();
  }
  const out = (url: string, durationS: number | null = null) => ({ url, model: `model-${url}`, requestId: null, elapsedMs: 1, durationS });
  const deps: PipelineDeps = {
    async writeBrief(landmark, year) {
      briefCalls.push(year);
      if (failures.brief) throw new Error(failures.brief);
      return placeholderBrief(landmark, year) as EraBrief;
    },
    stages: {
      scene: (_i, ctx = {}) => stage('scene', ctx, () => out('scene.jpg')),
      panorama: (_i, ctx = {}) => stage('panorama', ctx, () => ({ ...out('pano.jpg'), widthPx: 2880, heightPx: 1440, attempts: 1, unpaintedFraction: 0 })),
      headshot: (_i, ctx = {}) => stage('headshot', ctx, () => out('head.jpg')),
      narration: (_i, ctx = {}) => stage('narration', ctx, () => out('voice.mp3')),
      guideFrame: (_i, ctx = {}) => stage('guide_frame', ctx, () => out('frame.jpg')),
      walkOn: (_i, ctx = {}) => stage('walk_on', ctx, () => out('on.mp4', 5)),
      walkOff: (_i, ctx = {}) => stage('walk_off', ctx, () => out('off.mp4', 5)),
      talk: (_i, ctx = {}) => stage('talk', ctx, () => out('talk.mp4', durationOfTalkS)),
      stitch: async (input) => {
        stitchCalls.push(input);
        return stitch;
      },
    },
  };
  return { deps, calls, briefCalls, stitchCalls, ran: () => calls.map((c) => c.key) };
}

/** Queue and claim a job for the test era. */
async function claim(includeVideo: boolean): Promise<Job> {
  process.env.VIDEO_GENERATION = 'on';
  process.env.VIDEO_ERAS = ERA_ID;
  await requestEraGeneration(ERA_ID, includeVideo);
  const job = await claimNextJob('test-worker');
  if (!job) throw new Error('no job claimed');
  return job;
}

/** Find a stage on a job as stored. */
async function stageOf(job: Job, key: StageKey) {
  return (await getJob(job.id))?.stages.find((s) => s.key === key);
}

beforeEach(() => {
  delete process.env.MONGODB_URI;
  delete process.env.NEXT_PUBLIC_USE_MOCKS;
  resetMemoryDb();
  resetMemoryJobs();
});
afterEach(() => {
  vi.unstubAllEnvs();
  delete process.env.VIDEO_GENERATION;
  delete process.env.VIDEO_ERAS;
});

describe('runEraJob, core tier', () => {
  it('writes the brief, then scene, panorama, headshot and narration, and marks the era ready', async () => {
    const job = await claim(false);
    const { deps, ran, briefCalls } = makeDeps();
    await runEraJob(job, deps);

    expect(briefCalls).toEqual([1862]);
    expect(ran()).toEqual(expect.arrayContaining(['scene', 'panorama', 'headshot', 'narration']));
    expect(ran().indexOf('scene')).toBeLessThan(ran().indexOf('panorama'));
    expect(ran()).not.toContain('guide_frame');

    const era = await getEra(ERA_ID);
    expect(era).toMatchObject({
      state: 'ready',
      sceneImageUrl: 'scene.jpg',
      narrationAudioUrl: 'voice.mp3',
      guide: { headshotUrl: 'head.jpg' },
      panorama: { url: 'pano.jpg', widthPx: 2880, heightPx: 1440, vFovDeg: 180 },
    });
    expect(era?.title).toBeTruthy();
    expect(era?.panorama?.centreBearingDeg).toBeGreaterThanOrEqual(0);
    expect(era?.panorama?.centreBearingDeg).toBeLessThan(360);
    expect((await getJob(job.id))?.state).toBe('succeeded');
  });

  it('records model, request id and timing on each job stage', async () => {
    const job = await claim(false);
    await runEraJob(job, makeDeps().deps);
    const scene = await stageOf(job, 'scene');
    expect(scene).toMatchObject({ state: 'done', model: 'model-scene.jpg', falRequestId: 'scene-req' });
    expect(scene?.startedAt).toBeTruthy();
    expect(scene?.finishedAt).toBeTruthy();
    expect(await stageOf(job, 'brief')).toMatchObject({ state: 'done', model: historianModel() });
  });

  it('a failed scene skips the panorama but headshot and narration still run; the era is failed', async () => {
    const job = await claim(false);
    const { deps, ran } = makeDeps({ scene: 'fal said no' });
    await runEraJob(job, deps);

    expect(ran()).not.toContain('panorama');
    expect(ran()).toEqual(expect.arrayContaining(['headshot', 'narration']));
    expect(await stageOf(job, 'scene')).toMatchObject({ state: 'failed', error: 'fal said no' });
    expect(await stageOf(job, 'panorama')).toMatchObject({ state: 'skipped' });
    expect(await getEra(ERA_ID)).toMatchObject({ state: 'failed', narrationAudioUrl: 'voice.mp3', sceneImageUrl: null });
    expect((await getJob(job.id))?.state).toBe('failed');
  });

  it('a failed brief skips every other stage', async () => {
    const job = await claim(true);
    const { deps, ran } = makeDeps({ brief: 'Historian declined' });
    await runEraJob(job, deps);
    expect(ran()).toEqual([]);
    expect(await stageOf(job, 'brief')).toMatchObject({ state: 'failed', error: 'Historian declined' });
    expect(await stageOf(job, 'scene')).toMatchObject({ state: 'skipped' });
    expect(await stageOf(job, 'guide_frame')).toMatchObject({ state: 'skipped' });
    expect(await getEra(ERA_ID)).toMatchObject({ state: 'failed', videoState: 'failed' });
  });
});

describe('runEraJob, video tier', () => {
  it('makes the guide frame first, then three clips that all use it, and stores the segments in order', async () => {
    const job = await claim(true);
    const { deps, ran } = makeDeps();
    await runEraJob(job, deps);

    expect(ran().indexOf('guide_frame')).toBeGreaterThan(ran().indexOf('headshot'));
    expect(ran().indexOf('guide_frame')).toBeGreaterThan(ran().indexOf('narration'));
    for (const clip of ['walk_on', 'talk', 'walk_off']) expect(ran().indexOf(clip)).toBeGreaterThan(ran().indexOf('guide_frame'));

    const era = await getEra(ERA_ID);
    expect(era).toMatchObject({ state: 'ready', videoState: 'ready' });
    expect(era?.guideVideo?.segments).toEqual([
      { kind: 'walk_on', url: 'on.mp4', durationS: 5 },
      { kind: 'talk', url: 'talk.mp4', durationS: 44.2 },
      { kind: 'walk_off', url: 'off.mp4', durationS: 5 },
    ]);
    expect(era?.guideVideo?.stitchedUrl).toBeNull();
    expect(await stageOf(job, 'stitch')).toMatchObject({ state: 'skipped' });
    expect((await getJob(job.id))?.state).toBe('succeeded');
  });

  it('estimates the talk length from the script when the model reports none', async () => {
    const job = await claim(true);
    await runEraJob(job, makeDeps({}, null).deps);
    const talk = (await getEra(ERA_ID))?.guideVideo?.segments.find((s) => s.kind === 'talk');
    expect(talk?.durationS).toBeGreaterThan(5);
  });

  it('a failed clip leaves the core tier ready, marks the video failed and fails the job', async () => {
    const job = await claim(true);
    await runEraJob(job, makeDeps({ talk: 'avatar refused the audio' }).deps);
    expect(await getEra(ERA_ID)).toMatchObject({ state: 'ready', videoState: 'failed', guideVideo: null });
    expect(await stageOf(job, 'talk')).toMatchObject({ state: 'failed', error: 'avatar refused the audio' });
    expect((await getJob(job.id))?.state).toBe('failed');
  });

  it('stores the stitched file next to the three clips when the stitch passes, and tries it only after the video is ready', async () => {
    const job = await claim(true);
    const { deps, stitchCalls } = makeDeps({}, 44.2, { output: { url: 'https://cdn/all.mp4', model: 'm-stitch', requestId: 'r', elapsedMs: 1 }, reason: null });
    await runEraJob(job, deps);
    const era = await getEra(ERA_ID);
    expect(era?.guideVideo?.stitchedUrl).toBe('https://cdn/all.mp4');
    expect(era?.guideVideo?.segments).toHaveLength(3);
    expect(stitchCalls[0]).toEqual({ clipUrls: ['on.mp4', 'talk.mp4', 'off.mp4'], expectedDurationS: 54.2 });
    expect(await stageOf(job, 'stitch')).toMatchObject({ state: 'done', model: 'm-stitch' });
  });

  it('a refused or unverified stitch is skipped with the reason, never failed, and the video stays ready', async () => {
    const job = await claim(true);
    const { deps } = makeDeps({}, 44.2, { output: null, reason: 'fal refused the merge (403)' });
    await runEraJob(job, deps);
    expect(await getEra(ERA_ID)).toMatchObject({ videoState: 'ready', guideVideo: { stitchedUrl: null } });
    expect(await stageOf(job, 'stitch')).toMatchObject({ state: 'skipped', error: 'fal refused the merge (403)' });
    expect((await getJob(job.id))?.state).toBe('succeeded');
  });

  it('skips all video stages when the guide frame fails', async () => {
    const job = await claim(true);
    const { deps, ran } = makeDeps({ guide_frame: 'bad frame' });
    await runEraJob(job, deps);
    expect(ran()).not.toContain('talk');
    expect(await stageOf(job, 'talk')).toMatchObject({ state: 'skipped' });
    expect(await getEra(ERA_ID)).toMatchObject({ state: 'ready', videoState: 'failed' });
  });
});

describe('never paying twice', () => {
  it('a second job after a failure repeats only what is missing', async () => {
    const first = await claim(false);
    await runEraJob(first, makeDeps({ scene: 'boom' }).deps);

    const second = await claim(false);
    const { deps, ran, briefCalls } = makeDeps();
    await runEraJob(second, deps);

    expect(briefCalls).toEqual([]);
    expect(ran().sort()).toEqual(['panorama', 'scene']);
    expect(await getEra(ERA_ID)).toMatchObject({ state: 'ready', sceneImageUrl: 'scene.jpg' });
    expect(await stageOf(second, 'headshot')).toMatchObject({ state: 'skipped' });
  });

  it('a re-claimed job passes each stage its saved fal request id, including the guide frame', async () => {
    const job = await claim(true);
    await runEraJob(job, makeDeps({ talk: 'worker died here' }).deps);

    // Another worker takes the same job over: its stages still carry the saved request ids.
    const reclaimed = (await getJob(job.id)) as Job;
    const { deps, calls } = makeDeps();
    await runEraJob(reclaimed, deps);

    const resumeIdOf = (key: string) => calls.find((c) => c.key === key)?.ctx.resumeRequestId;
    expect(resumeIdOf('guide_frame')).toBe('guide_frame-req');
    expect(resumeIdOf('talk')).toBe('talk-req');
    expect(await getEra(ERA_ID)).toMatchObject({ videoState: 'ready' });
  });
});

describe('dry run', () => {
  it('with NEXT_PUBLIC_USE_MOCKS=1 and no deps argument, fills the era from fixtures without any network', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCKS', '1');
    const job = await claim(true);
    await runEraJob(job);
    expect(await getEra(ERA_ID)).toMatchObject({ state: 'ready', videoState: 'ready' });
    expect(dryRunDeps.stages.talk).toBeTypeOf('function');
    expect(await stageOf(job, 'scene')).toMatchObject({ state: 'done', model: 'dry-run' });
  });
});

describe('keeping every file (A2-a, A2-h, A2-i)', () => {
  /** Fake media hooks that tag URLs, so the test can see which ones went where. */
  function fakeMedia(options: { failPersist?: boolean; refuse?: RegExp } = {}) {
    const log = { toFal: [] as string[], persisted: [] as string[], references: [] as string[] };
    const media = {
      async toFalUrl(url: string) {
        log.toFal.push(url);
        if (options.refuse?.test(url)) throw new Error(`refusing ${url}: an SVG cannot be sent to fal`);
        return `fal:${url}`;
      },
      async persist(url: string, eraId: string, name: string) {
        log.persisted.push(`${eraId}/${name}`);
        if (options.failPersist) throw new Error('store is down');
        return `/api/media/${name}`;
      },
      async prepareReference(url: string) {
        log.references.push(url);
        return `small:${url}`;
      },
    };
    return { media, log };
  }

  /** The fake deps, with every stage's input recorded. */
  function recordingDeps(media: PipelineDeps['media']) {
    const base = makeDeps();
    const inputs: Record<string, unknown> = {};
    const wrap = <K extends keyof PipelineDeps['stages']>(key: K) =>
      (async (input: unknown, ctx?: StageContext) => {
        inputs[key] = input;
        return (base.deps.stages[key] as (i: unknown, c?: StageContext) => Promise<unknown>)(input, ctx);
      }) as PipelineDeps['stages'][K];
    const deps: PipelineDeps = {
      ...base.deps,
      media,
      stages: {
        scene: wrap('scene'),
        panorama: wrap('panorama'),
        headshot: wrap('headshot'),
        narration: wrap('narration'),
        guideFrame: wrap('guideFrame'),
        walkOn: wrap('walkOn'),
        walkOff: wrap('walkOff'),
        talk: wrap('talk'),
        stitch: wrap('stitch'),
      },
    };
    return { deps, inputs };
  }

  it('writes our stored URLs on the Era, never the fal ones, for every core and video output', async () => {
    const job = await claim(true);
    const { media, log } = fakeMedia();
    await runEraJob(job, recordingDeps(media).deps);
    const era = await getEra(ERA_ID);
    expect(era).toMatchObject({
      state: 'ready',
      videoState: 'ready',
      sceneImageUrl: '/api/media/scene',
      narrationAudioUrl: '/api/media/narration',
      guide: { headshotUrl: '/api/media/headshot' },
      panorama: { url: '/api/media/panorama' },
    });
    expect(era?.guideVideo?.segments.map((s) => s.url)).toEqual(['/api/media/walk_on', '/api/media/talk', '/api/media/walk_off']);
    expect(log.persisted).toEqual(expect.arrayContaining([`${ERA_ID}/scene`, `${ERA_ID}/panorama`, `${ERA_ID}/headshot`, `${ERA_ID}/narration`, `${ERA_ID}/guide_frame`]));
  });

  it('sends fal the reference photo, the scene, the headshot and the narration through toFalUrl, and shrunk period photos', async () => {
    const job = await claim(true);
    const { media, log } = fakeMedia();
    const { deps, inputs } = recordingDeps(media);
    await runEraJob(job, deps);
    const scene = inputs.scene as { referencePhotoUrl: string; brief: { referenceImageUrls: string[] } };
    expect(scene.referencePhotoUrl.startsWith('fal:')).toBe(true);
    for (const url of scene.brief.referenceImageUrls) expect(url.startsWith('small:')).toBe(true);
    expect((inputs.panorama as { sceneUrl: string }).sceneUrl).toBe('fal:/api/media/scene');
    expect(inputs.guideFrame).toMatchObject({ sceneUrl: 'fal:/api/media/scene', headshotUrl: 'fal:/api/media/headshot' });
    expect(inputs.talk).toMatchObject({ narrationUrl: 'fal:/api/media/narration' });
    expect(log.toFal).toEqual(expect.arrayContaining(['/api/media/scene', '/api/media/headshot', '/api/media/narration']));
  });

  it('fails the scene with a clear message when the reference photo is an SVG, and makes no picture', async () => {
    const job = await claim(false);
    const { media } = fakeMedia({ refuse: /\.svg$/ });
    const { deps, inputs } = recordingDeps(media);
    await runEraJob(job, deps);
    expect(inputs.scene).toBeUndefined();
    const scene = (await getJob(job.id))?.stages.find((s) => s.key === 'scene');
    expect(scene).toMatchObject({ state: 'failed' });
    expect(scene?.error).toMatch(/SVG cannot be sent to fal/);
  });

  it('keeps the fal URL when storing fails, so a paid result is never thrown away', async () => {
    const job = await claim(false);
    const warn = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { media } = fakeMedia({ failPersist: true });
    await runEraJob(job, recordingDeps(media).deps);
    expect(await getEra(ERA_ID)).toMatchObject({ state: 'ready', sceneImageUrl: 'scene.jpg', narrationAudioUrl: 'voice.mp3' });
    warn.mockRestore();
  });
});

describe('flagging a picture kept with problems (HUMAN_TASKS 2.4)', () => {
  it('writes the critic\'s reasons on the job stage while the stage stays done', async () => {
    const job = await claim(false);
    const base = makeDeps();
    const deps: PipelineDeps = {
      ...base.deps,
      stages: {
        ...base.deps.stages,
        panorama: async () => ({
          url: 'pano.jpg', model: 'm', requestId: null, elapsedMs: 1, widthPx: 2880, heightPx: 1440, attempts: 3, unpaintedFraction: 0,
          check: { passed: false, checked: true, attempts: 3, problems: ['not a 360 panorama'], checkCostUsd: 0.04 },
        }),
      },
    };
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await runEraJob(job, deps);
    log.mockRestore();
    const stage = (await getJob(job.id))?.stages.find((s) => s.key === 'panorama');
    expect(stage?.state).toBe('done');
    expect(stage?.error).toMatch(/KEPT WITH PROBLEMS after 3 attempts: not a 360 panorama/);
    expect(await getEra(ERA_ID)).toMatchObject({ state: 'ready' });
  });
});
