/**
 * Tests for the free checks before the paid critic, and the reference shrink (A2-i). Owner: Agent 2 (Studio).
 * Nothing here calls fal.
 */
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { MODELS, type FalQueueLike } from '@/lib/fal';
import type { SceneBrief } from '@/lib/contracts';
import { REFERENCE_MAX_SIDE_PX, shrinkReference } from '../media';
import { WIDESCREEN_RATIO, localVerdict, pictureProblems } from './localChecks';
import { runScene } from './scene';

describe('pictureProblems', () => {
  it('passes the sizes the models really return', () => {
    expect(pictureProblems({ widthPx: 1376, heightPx: 768 }, WIDESCREEN_RATIO)).toEqual([]);
    expect(pictureProblems({ widthPx: 2912, heightPx: 1440, bytes: 900_000 }, 2)).toEqual([]);
  });

  it('flags a square picture where 16:9 was asked for, and a 16:9 one where 2:1 was', () => {
    expect(pictureProblems({ widthPx: 1024, heightPx: 1024 }, WIDESCREEN_RATIO)[0]).toMatch(/wrong shape/);
    expect(pictureProblems({ widthPx: 1376, heightPx: 768 }, 2)[0]).toMatch(/wrong shape/);
  });

  it('flags a near-empty file, and does not hold unknown facts against a picture', () => {
    expect(pictureProblems({ bytes: 4000 }, 2)[0]).toMatch(/too small/);
    expect(pictureProblems({}, 2)).toEqual([]);
    expect(pictureProblems({ widthPx: null, heightPx: 768 }, 2)).toEqual([]);
  });

  it('builds a failed verdict that costs nothing', () => {
    expect(localVerdict(['x'], 'fix it')).toMatchObject({ passed: false, checked: true, hard: ['x'], fix: 'fix it', costUsd: 0 });
  });
});

describe('the scene skips the paid critic when the picture is the wrong shape', () => {
  const brief: SceneBrief = { description: 'd', changes: { persists: [], altered: [], notYetBuilt: [], gone: [] }, surroundings: 's', referenceImageUrls: [] };

  it('retries straight away with a shape fix and never calls the critic for the bad picture', async () => {
    const submitted: { endpoint: string; prompt: string }[] = [];
    let pictures = 0;
    const queue: FalQueueLike = {
      async submit(endpoint, options) {
        submitted.push({ endpoint, prompt: String(options.input.prompt) });
        return { request_id: `r${submitted.length}` };
      },
      async status() {
        return { status: 'COMPLETED' };
      },
      async result(endpoint) {
        if (endpoint === MODELS.image_check.endpoint) {
          return { data: { output: '{"anachronisms":[],"looks_computer_generated":false,"verdict":"pass","problems":[],"fix":""}', usage: { cost: 0.0125 } } };
        }
        pictures++;
        // First picture square (wrong), second 16:9.
        return { data: { images: [pictures === 1 ? { url: 'https://cdn/sq.jpg', width: 1024, height: 1024 } : { url: 'https://cdn/ok.jpg', width: 1376, height: 768 }] } };
      },
    };
    const out = await runScene({ referencePhotoUrl: 'R', brief, year: 1893 }, { queue, pollIntervalMs: 0 });
    const critics = submitted.filter((s) => s.endpoint === MODELS.image_check.endpoint);
    expect(critics).toHaveLength(1);
    expect(submitted[1].prompt).toContain('exactly 16:9');
    expect(out.url).toBe('https://cdn/ok.jpg');
    expect(out.check).toMatchObject({ passed: true, attempts: 2 });
  });
});

describe('shrinkReference', () => {
  it('shrinks a large photo to 1024 px on its long side, keeping the shape', async () => {
    const big = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: { r: 90, g: 80, b: 70 } } }).jpeg().toBuffer();
    const meta = await sharp(await shrinkReference(big)).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([REFERENCE_MAX_SIDE_PX, 683, 'jpeg']);
  });

  it('never enlarges a small photo', async () => {
    const small = await sharp({ create: { width: 600, height: 400, channels: 3, background: { r: 1, g: 2, b: 3 } } }).png().toBuffer();
    const meta = await sharp(await shrinkReference(small)).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([600, 400, 'jpeg']);
  });
});

describe('never 4K', () => {
  it('no image request asks for 4K, which costs double', async () => {
    const { buildImageEditInput, buildPanoramaInput, buildHeadshotInput } = await import('./inputs');
    for (const input of [buildImageEditInput('p', ['u']), buildPanoramaInput('p', 'c', ['r']), buildHeadshotInput('p')]) expect(input.resolution).not.toBe('4K');
  });
});
