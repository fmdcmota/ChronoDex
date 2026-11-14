/**
 * Unit tests for the pipeline stages: prompt builders, the panorama image helpers, the model input
 * builders and each stage run against a fake fal queue. Owner: Agent 2 (Studio). Task A2-08.
 * Nothing here calls fal or the network.
 */
import sharp from 'sharp';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MODELS, type FalQueueLike } from '@/lib/fal';
import type { SceneBrief } from '@/lib/contracts';
import {
  CANVAS_HEIGHT_PX,
  CANVAS_WIDTH_PX,
  PANORAMA_HEIGHT_PX,
  PANORAMA_WIDTH_PX,
  buildPanoramaCanvas,
  toEquirectangular,
  unpaintedFraction,
} from './image';
import { buildHeadshotInput, buildImageEditInput, buildPanoramaInput, buildTalkInput, buildWalkInput } from './inputs';
import {
  buildGuideFramePrompt,
  buildHeadshotPrompt,
  buildPanoramaPrompt,
  buildScenePrompt,
  buildTalkPrompt,
  buildWalkPrompt,
} from './prompts';
import { runGuideFrame, runHeadshot, runNarration, runScene, runTalk, runWalkOff, runWalkOn } from './index';

const brief: SceneBrief = {
  description: 'A broad Victorian street.',
  changes: {
    persists: ['the stucco terrace on the left'],
    altered: ['gas lamps'],
    notYetBuilt: ['cars', 'road markings'],
    gone: [],
  },
  surroundings: 'Terraces on both sides.',
  referenceImageUrls: [],
};
const guide = {
  name: 'Martha Hale',
  role: 'flower seller',
  appearance: 'A woman in her late thirties, dark bonnet, green dress.',
  script: 'Good afternoon, I am Martha Hale.',
  voiceKey: 'eleven-lily',
};

/** A fake queue that returns `data` after one poll and records every submitted input. */
function queueReturning(data: unknown): FalQueueLike & { submitted: { endpoint: string; input: Record<string, unknown> }[] } {
  const submitted: { endpoint: string; input: Record<string, unknown> }[] = [];
  return {
    submitted,
    async submit(endpoint, options) {
      submitted.push({ endpoint, input: options.input });
      return { request_id: 'req-42' };
    },
    async status() {
      return { status: 'COMPLETED' };
    },
    async result() {
      return { data };
    },
  };
}

describe('prompt builders', () => {
  it('scene prompt carries the year and each list, and an empty list gets a fallback line', () => {
    const prompt = buildScenePrompt(brief, 1880);
    expect(prompt).toContain('year 1880');
    expect(prompt).toContain('- the stucco terrace on the left');
    expect(prompt).toContain('- cars');
    expect(prompt).toContain('- gas lamps');
    expect(prompt).toMatch(/ADD BACK[^\n]*\n- nothing/);
  });

  it('panorama prompt keeps the not-yet-built list and asks for a seamless wrap', () => {
    const prompt = buildPanoramaPrompt('Terraces on both sides.', ['cars', 'road markings'], 1880);
    expect(prompt).toContain('- road markings');
    expect(prompt).toContain('Terraces on both sides.');
    expect(prompt).toContain('join seamlessly');
  });

  it('headshot, guide frame and walk prompts use the guide and never mention a real person', () => {
    expect(buildHeadshotPrompt(guide, 1880)).toContain('Martha Hale');
    const frame = buildGuideFramePrompt(guide, 1880);
    expect(frame).toContain('waist up');
    expect(frame).toContain('image 2');
    expect(buildWalkPrompt(guide, 'on')).toContain('walks into the frame');
    expect(buildWalkPrompt(guide, 'off')).toContain('walks out of the frame');
    expect(buildWalkPrompt(guide, 'on')).toContain('a woman in her late thirties, dark bonnet, green dress,');
    expect(buildTalkPrompt()).toContain('camera is still');
  });
});

describe('panorama image helpers', () => {
  it('puts the scene in the middle of a grey 2:1 canvas and leaves the corners grey', async () => {
    const scene = await sharp({ create: { width: 800, height: 450, channels: 3, background: { r: 255, g: 0, b: 0 } } }).png().toBuffer();
    const canvas = await buildPanoramaCanvas(scene);
    const meta = await sharp(canvas).metadata();
    expect([meta.width, meta.height]).toEqual([CANVAS_WIDTH_PX, CANVAS_HEIGHT_PX]);
    const { data, info } = await sharp(canvas).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const pixel = (x: number, y: number): number[] => Array.from(data.subarray((y * info.width + x) * 3, (y * info.width + x) * 3 + 3));
    expect(pixel(CANVAS_WIDTH_PX / 2, CANVAS_HEIGHT_PX / 2)).toEqual([255, 0, 0]);
    expect(pixel(5, 5)).toEqual([128, 128, 128]);
    expect(pixel(CANVAS_WIDTH_PX - 5, CANVAS_HEIGHT_PX - 5)).toEqual([128, 128, 128]);
  });

  it('keeps a very tall scene on the canvas', async () => {
    const tall = await sharp({ create: { width: 300, height: 900, channels: 3, background: { r: 0, g: 255, b: 0 } } }).png().toBuffer();
    const canvas = await buildPanoramaCanvas(tall, { horizonFraction: 0.9 });
    expect((await sharp(canvas).metadata()).height).toBe(CANVAS_HEIGHT_PX);
  });

  it('turns a 2.02:1 model picture into exactly 2:1 JPEG', async () => {
    const odd = await sharp({ create: { width: 2912, height: 1440, channels: 3, background: { r: 10, g: 20, b: 30 } } }).png().toBuffer();
    const meta = await sharp(await toEquirectangular(odd)).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([PANORAMA_WIDTH_PX, PANORAMA_HEIGHT_PX, 'jpeg']);
    expect(PANORAMA_WIDTH_PX / PANORAMA_HEIGHT_PX).toBe(2);
  });
});

describe('unpaintedFraction', () => {
  it('is 1 for the bare grey canvas and 0 for a coloured picture', async () => {
    const grey = await sharp({ create: { width: 400, height: 200, channels: 3, background: { r: 128, g: 128, b: 128 } } }).png().toBuffer();
    const colour = await sharp({ create: { width: 400, height: 200, channels: 3, background: { r: 200, g: 180, b: 160 } } }).png().toBuffer();
    expect(await unpaintedFraction(grey)).toBe(1);
    expect(await unpaintedFraction(colour)).toBe(0);
  });

  it('measures a third of the picture left grey', async () => {
    const bottomGrey = await sharp({ create: { width: 300, height: 150, channels: 3, background: { r: 128, g: 128, b: 128 } } })
      .composite([{ input: await sharp({ create: { width: 300, height: 100, channels: 3, background: { r: 220, g: 40, b: 40 } } }).png().toBuffer(), left: 0, top: 0 }])
      .png()
      .toBuffer();
    expect(await unpaintedFraction(bottomGrey)).toBeCloseTo(1 / 3, 1);
  });
});

describe('input builders', () => {
  it('image edit input is 16:9 JPEG at 1K, and the panorama uses auto at 2K', () => {
    expect(buildImageEditInput('p', ['u1', 'u2'])).toEqual({
      prompt: 'p',
      image_urls: ['u1', 'u2'],
      aspect_ratio: '16:9',
      resolution: '1K',
      output_format: 'jpeg',
    });
    expect(buildPanoramaInput('p', 'u')).toMatchObject({ aspect_ratio: 'auto', resolution: '2K', image_urls: ['u'] });
    expect(buildHeadshotInput('p')).toMatchObject({ aspect_ratio: '1:1', resolution: '1K' });
  });

  it('walk input always asks for 720p, and the Flux fallback also switches audio off', () => {
    expect(buildWalkInput(MODELS.walk_on.endpoint, 'p', 's', 'e')).toEqual({
      prompt: 'p',
      start_image_url: 's',
      end_image_url: 'e',
      duration: 5,
      resolution: '720p',
    });
    expect(buildWalkInput(MODELS.walk_on.fallback as string, 'p', 's', 'e')).toMatchObject({ generate_audio: false, resolution: '720p' });
  });

  it('talk input gives Kling a prompt and gives the Fabric fallback its required resolution', () => {
    expect(buildTalkInput(MODELS.talk.endpoint, 'img', 'aud', 'p')).toEqual({ image_url: 'img', audio_url: 'aud', prompt: 'p' });
    expect(buildTalkInput(MODELS.talk.fallback as string, 'img', 'aud', 'p')).toEqual({ image_url: 'img', audio_url: 'aud', resolution: '480p' });
  });
});

describe('stages against a fake queue', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('scene sends the reference photo and returns the first image with the model and request id', async () => {
    const queue = queueReturning({ images: [{ url: 'https://cdn/scene.jpg' }] });
    const out = await runScene({ referencePhotoUrl: 'https://cdn/ref.jpg', brief, year: 1880 }, { queue, pollIntervalMs: 0 });
    expect(out).toMatchObject({ url: 'https://cdn/scene.jpg', model: MODELS.scene.endpoint, requestId: 'req-42' });
    expect(queue.submitted[0].endpoint).toBe(MODELS.scene.endpoint);
    expect(queue.submitted[0].input.image_urls).toEqual(['https://cdn/ref.jpg']);
  });

  it('uses the fallback endpoint when the context names one, and saves the request id', async () => {
    const queue = queueReturning({ images: [{ url: 'https://cdn/s.jpg' }] });
    const saved: string[] = [];
    const out = await runScene(
      { referencePhotoUrl: 'r', brief, year: 1880 },
      { queue, pollIntervalMs: 0, endpoint: MODELS.scene.fallback as string, onRequestId: (id) => void saved.push(id) },
    );
    expect(out.model).toBe(MODELS.scene.fallback);
    expect(saved).toEqual(['req-42']);
  });

  it('headshot and guide frame return image URLs; the guide frame sends scene then headshot', async () => {
    const headshotQueue = queueReturning({ images: [{ url: 'https://cdn/h.jpg' }] });
    expect((await runHeadshot({ guide, year: 1880 }, { queue: headshotQueue, pollIntervalMs: 0 })).url).toBe('https://cdn/h.jpg');
    const frameQueue = queueReturning({ images: [{ url: 'https://cdn/f.jpg' }] });
    await runGuideFrame({ sceneUrl: 'S', headshotUrl: 'H', guide, year: 1880 }, { queue: frameQueue, pollIntervalMs: 0 });
    expect(frameQueue.submitted[0].input.image_urls).toEqual(['S', 'H']);
  });

  it('walk on starts at the empty scene and walk off starts at the guide frame', async () => {
    const queue = queueReturning({ video: { url: 'https://cdn/w.mp4' } });
    const input = { sceneUrl: 'SCENE', guideFrameUrl: 'FRAME', guide };
    await runWalkOn(input, { queue, pollIntervalMs: 0 });
    await runWalkOff(input, { queue, pollIntervalMs: 0 });
    expect(queue.submitted[0].input).toMatchObject({ start_image_url: 'SCENE', end_image_url: 'FRAME' });
    expect(queue.submitted[1].input).toMatchObject({ start_image_url: 'FRAME', end_image_url: 'SCENE' });
  });

  it('talk sends the frame and the narration and returns the video', async () => {
    const queue = queueReturning({ video: { url: 'https://cdn/t.mp4' }, duration: 10.1 });
    const out = await runTalk({ guideFrameUrl: 'FRAME', narrationUrl: 'AUDIO' }, { queue, pollIntervalMs: 0 });
    expect(out.url).toBe('https://cdn/t.mp4');
    expect(queue.submitted[0].input).toMatchObject({ image_url: 'FRAME', audio_url: 'AUDIO' });
  });

  it('narration speaks the script in the guide voice and reports the request id', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCKS', '');
    const queue = queueReturning({ audio: { url: 'https://cdn/n.mp3' } });
    const out = await runNarration({ guide }, { queue, pollIntervalMs: 0 });
    expect(out).toMatchObject({ url: 'https://cdn/n.mp3', model: MODELS.narration.endpoint, requestId: 'req-42' });
    expect(queue.submitted[0].input).toMatchObject({ text: guide.script, voice: 'Lily' });
  });

  it('fails with the endpoint named when a result holds no image or no video', async () => {
    await expect(runScene({ referencePhotoUrl: 'r', brief, year: 1880 }, { queue: queueReturning({ images: [] }), pollIntervalMs: 0 })).rejects.toThrow(
      /returned no image for stage scene/,
    );
    await expect(runTalk({ guideFrameUrl: 'f', narrationUrl: 'a' }, { queue: queueReturning({}), pollIntervalMs: 0 })).rejects.toThrow(
      /returned no video for stage talk/,
    );
  });
});
