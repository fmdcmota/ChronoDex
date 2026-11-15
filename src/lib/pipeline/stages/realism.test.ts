/**
 * Tests for the realism rework (phone test round 1): the period prompts, real reference photographs, the
 * feathered canvas edge and the panorama upscaler. Owner: Agent 2 (Studio). Nothing here calls fal.
 */
import sharp from 'sharp';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SceneBrief } from '@/lib/contracts';
import { MAX_REFERENCE_PHOTOS, MODELS, type FalQueueLike } from '@/lib/fal';
import { CANVAS_HEIGHT_PX, CANVAS_WIDTH_PX, buildPanoramaCanvas, featherEdges } from './image';
import { buildPanoramaInput, buildUpscaleInput, runUpscale } from './inputs';
import { buildPanoramaPrompt, buildScenePrompt, periodCues } from './prompts';
import { periodLook } from '../run';
import { runScene, usableReferenceUrls } from './scene';

const brief: SceneBrief = {
  description: 'A pale-stone palace with a domed tower.',
  changes: { persists: ['the tower'], altered: [], notYetBuilt: ['the modern library'], gone: ['the palace wings'] },
  surroundings: 'Terraced houses behind the viewer.',
  referenceImageUrls: ['https://upload.wikimedia.org/a.jpg', 'https://upload.wikimedia.org/b.jpg'],
};

describe('periodCues', () => {
  it('names concrete things for each period, and nothing modern before 1900', () => {
    expect(periodCues(1893)).toMatch(/gas street lamps.*hansom cabs.*frock coats/);
    expect(periodCues(1893)).not.toMatch(/motor|tarmac|neon/);
    expect(periodCues(1941)).toMatch(/motor|blackout/);
    expect(periodCues(1962)).toMatch(/sodium|post-war/);
    expect(periodCues(2011)).toMatch(/modern|current/);
  });

  it('puts the boundaries at 1900, 1946 and 1980', () => {
    expect(periodCues(1899)).toBe(periodCues(1850));
    expect(periodCues(1900)).not.toBe(periodCues(1899));
    expect(periodCues(1946)).not.toBe(periodCues(1945));
    expect(periodCues(1980)).not.toBe(periodCues(1979));
  });
});

describe('period prompts', () => {
  it('both prompts ban the computer-generated look in words and carry the era cues', () => {
    for (const prompt of [buildScenePrompt(brief, 1893), buildPanoramaPrompt(brief.surroundings, brief.changes.notYetBuilt, 1893)]) {
      expect(prompt).toContain('never as a render');
      expect(prompt).toMatch(/no gloss, no oversaturation, no HDR/);
      expect(prompt).toContain(periodCues(1893));
    }
  });

  it('the colour look is restrained archive colour and the monochrome look is a sepia plate photograph', () => {
    expect(buildScenePrompt(brief, 1893, { look: 'colour' })).toContain('colourised the way museum restorers do it');
    expect(buildScenePrompt(brief, 1893)).toContain('colourised');
    const mono = buildScenePrompt(brief, 1893, { look: 'monochrome' });
    expect(mono).toContain('sepia albumen-print tones');
    expect(mono).toContain('No colour at all');
    expect(mono).not.toContain('colourised');
  });

  it('mentions the reference photographs only when there are some, as images after the first', () => {
    expect(buildScenePrompt(brief, 1893)).not.toContain('Copy their architecture');
    expect(buildScenePrompt(brief, 1893, { referenceCount: 1 })).toContain('image 2 is a real photograph');
    expect(buildScenePrompt(brief, 1893, { referenceCount: 3 })).toContain('images 2 to 4 are real photographs');
    expect(buildPanoramaPrompt('x', [], 1893, { referenceCount: 2 })).toContain('images 2 to 3 are real photographs');
  });

  it('keeps the geometry rules the panorama needs whatever the style', () => {
    const prompt = buildPanoramaPrompt('x', [], 1893, { look: 'monochrome', referenceCount: 3 });
    expect(prompt).toContain('equirectangular');
    expect(prompt).toContain('join seamlessly');
    expect(prompt).toContain('exact vertical middle');
  });
});

describe('reference photographs', () => {
  it('keeps http(s) URLs, drops Google and anything else, and stops at the limit', () => {
    const urls = [
      'https://upload.wikimedia.org/a.jpg',
      'https://maps.google.com/streetview.jpg',
      'https://lh3.googleusercontent.com/x.jpg',
      'ftp://example.com/old.jpg',
      'data:image/png;base64,AAAA',
      'http://example.org/b.jpg',
      'https://example.org/c.jpg',
      'https://example.org/d.jpg',
    ];
    const kept = usableReferenceUrls(urls);
    expect(kept).toEqual(['https://upload.wikimedia.org/a.jpg', 'http://example.org/b.jpg', 'https://example.org/c.jpg']);
    expect(kept.length).toBeLessThanOrEqual(MAX_REFERENCE_PHOTOS);
    expect(usableReferenceUrls(undefined)).toEqual([]);
  });

  it('puts the canvas first and the references after it in the panorama input', () => {
    const input = buildPanoramaInput('p', 'CANVAS', ['R1', 'R2']);
    expect(input).toMatchObject({ image_urls: ['CANVAS', 'R1', 'R2'], aspect_ratio: 'auto', resolution: '2K' });
    expect(buildPanoramaInput('p', 'CANVAS').image_urls).toEqual(['CANVAS']);
  });

  it('runScene sends no period photographs by default, because they changed the viewpoint (phone test 6.5)', async () => {
    const submitted: Record<string, unknown>[] = [];
    const queue: FalQueueLike = {
      async submit(_e, options) {
        submitted.push(options.input);
        return { request_id: 'r1' };
      },
      async status() {
        return { status: 'COMPLETED' };
      },
      async result() {
        return { data: { images: [{ url: 'https://cdn/scene.jpg' }] } };
      },
    };
    await runScene({ referencePhotoUrl: 'PRESENT', brief, year: 1893 }, { queue, pollIntervalMs: 0, checks: 'off' });
    expect(submitted[0].image_urls).toEqual(['PRESENT']);
    expect(submitted[0].prompt).not.toContain('real photograph of this place');
  });

  it('runScene sends the reference photo first, then the period photographs, and says so in the prompt, when asked', async () => {
    const submitted: Record<string, unknown>[] = [];
    const queue: FalQueueLike = {
      async submit(_endpoint, options) {
        submitted.push(options.input);
        return { request_id: 'r1' };
      },
      async status() {
        return { status: 'COMPLETED' };
      },
      async result() {
        return { data: { images: [{ url: 'https://cdn/scene.jpg' }] } };
      },
    };
    await runScene({ referencePhotoUrl: 'PRESENT', brief, year: 1893, look: 'monochrome', usePeriodReferences: true }, { queue, pollIntervalMs: 0 });
    expect(submitted[0].image_urls).toEqual(['PRESENT', 'https://upload.wikimedia.org/a.jpg', 'https://upload.wikimedia.org/b.jpg']);
    expect(submitted[0].prompt).toContain('images 2 to 3 are real photographs');
    expect(submitted[0].prompt).toContain('No colour at all');
  });
});

describe('feathered canvas edge', () => {
  it('fades the outer pixels to transparent and leaves the middle solid', async () => {
    const solid = await sharp({ create: { width: 200, height: 100, channels: 3, background: { r: 255, g: 0, b: 0 } } }).png().toBuffer();
    const feathered = await featherEdges(solid, 200, 100, 40);
    const { data, info } = await sharp(feathered).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const alphaAt = (x: number, y: number): number => data[(y * info.width + x) * 4 + 3];
    expect(alphaAt(100, 50)).toBe(255);
    expect(alphaAt(0, 50)).toBe(0);
    expect(alphaAt(20, 50)).toBeGreaterThan(100);
    expect(alphaAt(20, 50)).toBeLessThan(160);
    expect(alphaAt(100, 0)).toBe(0);
  });

  it('a feathered canvas blends the scene edge into the grey; a hard one does not', async () => {
    const scene = await sharp({ create: { width: 800, height: 450, channels: 3, background: { r: 255, g: 0, b: 0 } } }).png().toBuffer();
    const pixelAtSceneEdge = async (featherPx: number): Promise<number[]> => {
      const canvas = await buildPanoramaCanvas(scene, { featherPx });
      const { data, info } = await sharp(canvas).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      const x = Math.round((CANVAS_WIDTH_PX - Math.round(CANVAS_WIDTH_PX / 3)) / 2) + 2;
      const y = CANVAS_HEIGHT_PX / 2;
      return Array.from(data.subarray((y * info.width + x) * 3, (y * info.width + x) * 3 + 3));
    };
    const hard = await pixelAtSceneEdge(0);
    const soft = await pixelAtSceneEdge(60);
    expect(hard).toEqual([255, 0, 0]);
    expect(soft[0]).toBeLessThan(200);
    expect(soft[1]).toBeGreaterThan(60);
  });
});

describe('panorama upscale', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is registered with a fallback, and asks for a plain multiplication', () => {
    expect(MODELS.panorama_upscale.endpoint).toMatch(/seedvr/);
    expect(MODELS.panorama_upscale.fallback).toBeTruthy();
    expect(buildUpscaleInput('U', 1.4)).toEqual({ image_url: 'U', upscale_mode: 'factor', upscale_factor: 1.4 });
  });

  it('runUpscale returns the enlarged image URL and fails clearly when there is none', async () => {
    const queueWith = (data: unknown): FalQueueLike => ({
      async submit() {
        return { request_id: 'u1' };
      },
      async status() {
        return { status: 'COMPLETED' };
      },
      async result() {
        return { data };
      },
    });
    const ok = await runUpscale('U', 1.4, { queue: queueWith({ image: { url: 'https://cdn/big.png' } }), pollIntervalMs: 0 });
    expect(ok).toMatchObject({ url: 'https://cdn/big.png', model: MODELS.panorama_upscale.endpoint, requestId: 'u1' });
    await expect(runUpscale('U', 1.4, { queue: queueWith({}), pollIntervalMs: 0 })).rejects.toThrow(/returned no image/);
  });
});

describe('periodLook', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is colour unless PERIOD_LOOK says monochrome', () => {
    vi.stubEnv('PERIOD_LOOK', '');
    expect(periodLook()).toBe('colour');
    vi.stubEnv('PERIOD_LOOK', 'sepia');
    expect(periodLook()).toBe('colour');
    vi.stubEnv('PERIOD_LOOK', 'monochrome');
    expect(periodLook()).toBe('monochrome');
  });
});

describe('colour look with old photographs as references', () => {
  it('tells the model to take shapes, not sepia tones, from the references in the colour look only', () => {
    expect(buildScenePrompt(brief, 1893, { look: 'colour', referenceCount: 2 })).toContain('never black and white or sepia');
    expect(buildPanoramaPrompt('x', [], 1893, { look: 'colour', referenceCount: 2 })).toContain('never black and white or sepia');
    expect(buildScenePrompt(brief, 1893, { look: 'monochrome', referenceCount: 2 })).not.toContain('never black and white or sepia');
    expect(buildScenePrompt(brief, 1893, { look: 'colour' })).not.toContain('never black and white or sepia');
  });
});
