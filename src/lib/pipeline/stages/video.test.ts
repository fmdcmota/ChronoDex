/**
 * Tests for the MP4 inspector, the stitch check and the stitch stage. Owner: Agent 2 (Studio). Task A2-14.
 * Synthetic files are built box by box so the tests need no ffmpeg and no network; real clips from the spikes are
 * also checked when they are on disk.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { FalQueueLike } from '@/lib/fal';
import { runStitch } from './stitch';
import { inspectMp4, verifyStitch } from './video';

/** One MP4 box: 4-byte size, 4-letter type, payload. */
function box(type: string, ...payload: Uint8Array[]): Uint8Array {
  const body = payload.reduce((all, p) => Uint8Array.from([...all, ...p]), new Uint8Array());
  const out = new Uint8Array(8 + body.length);
  new DataView(out.buffer).setUint32(0, out.length);
  out.set([...type].map((c) => c.charCodeAt(0)), 4);
  out.set(body, 8);
  return out;
}
const u32 = (n: number): Uint8Array => Uint8Array.from([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);

/** A track box with the given handler type. */
function track(handler: 'soun' | 'vide'): Uint8Array {
  const hdlr = box('hdlr', u32(0), u32(0), Uint8Array.from([...handler].map((c) => c.charCodeAt(0))), new Uint8Array(12));
  return box('trak', box('mdia', hdlr));
}
/** A movie header: version 0, time scale 1000, the given duration in seconds. */
function mvhd(seconds: number): Uint8Array {
  return box('mvhd', u32(0), u32(0), u32(0), u32(1000), u32(Math.round(seconds * 1000)), new Uint8Array(80));
}
/** A whole file: an ftyp box and a moov box holding the header and the tracks. */
function mp4(seconds: number, ...handlers: ('soun' | 'vide')[]): Uint8Array {
  const ftyp = box('ftyp', Uint8Array.from([...'isom'].map((c) => c.charCodeAt(0))), u32(0));
  return Uint8Array.from([...ftyp, ...box('moov', mvhd(seconds), ...handlers.map(track))]);
}

describe('inspectMp4', () => {
  it('finds the audio and video tracks and the length', () => {
    expect(inspectMp4(mp4(54.2, 'vide', 'soun'))).toEqual({ hasAudio: true, hasVideo: true, durationS: 54.2 });
    expect(inspectMp4(mp4(10, 'vide'))).toEqual({ hasAudio: false, hasVideo: true, durationS: 10 });
    expect(inspectMp4(mp4(10, 'soun', 'vide'))).toMatchObject({ hasAudio: true, hasVideo: true });
  });

  it('gives nothing for a file that is not an MP4, or is cut off', () => {
    expect(inspectMp4(new TextEncoder().encode('this is plainly not a video'))).toEqual({ hasAudio: false, hasVideo: false, durationS: null });
    expect(inspectMp4(new Uint8Array([]))).toEqual({ hasAudio: false, hasVideo: false, durationS: null });
    expect(inspectMp4(mp4(10, 'vide', 'soun').subarray(0, 30)).hasAudio).toBe(false);
  });

  const walk = path.resolve(__dirname, '..', '..', '..', '..', 'spikes', 'agent-2', 'out', 'walk-on-5s.mp4');
  it.skipIf(!existsSync(walk))('reads a real Kling clip: it has audio, video and is about 5 s', () => {
    const info = inspectMp4(readFileSync(walk));
    expect(info.hasVideo).toBe(true);
    expect(info.hasAudio).toBe(true);
    expect(info.durationS).toBeGreaterThan(4.5);
    expect(info.durationS).toBeLessThan(5.5);
  });
});

describe('verifyStitch', () => {
  it('accepts a file with audio, video and the right length', () => {
    expect(verifyStitch({ hasAudio: true, hasVideo: true, durationS: 54.0 }, 54.2)).toEqual({ ok: true, reason: null });
  });

  it('refuses a silent file, a video-less file, an unreadable one and one of the wrong length, each with a reason', () => {
    expect(verifyStitch({ hasAudio: false, hasVideo: true, durationS: 54 }, 54).reason).toMatch(/audio did not survive/);
    expect(verifyStitch({ hasAudio: true, hasVideo: false, durationS: 54 }, 54).reason).toMatch(/no video/);
    expect(verifyStitch({ hasAudio: true, hasVideo: true, durationS: null }, 54).reason).toMatch(/readable length/);
    const short = verifyStitch({ hasAudio: true, hasVideo: true, durationS: 39 }, 54);
    expect(short.ok).toBe(false);
    expect(short.reason).toMatch(/39\.0 s .* 54\.0 s/);
  });
});

describe('runStitch', () => {
  /** A queue that either succeeds with a video URL or fails the way fal does for our key. */
  function queue(behaviour: 'ok' | 'forbidden' | 'novideo'): FalQueueLike & { submitted: Record<string, unknown>[] } {
    const submitted: Record<string, unknown>[] = [];
    return {
      submitted,
      async submit(_e, options) {
        submitted.push(options.input);
        return { request_id: 'st-1' };
      },
      async status() {
        return { status: 'COMPLETED' };
      },
      async result() {
        if (behaviour === 'forbidden') throw Object.assign(new Error('Forbidden'), { status: 403, body: { detail: 'Access denied' } });
        return { data: behaviour === 'novideo' ? {} : { video: { url: 'https://cdn.example/merged.mp4' } } };
      },
    };
  }

  it('says why when fal refuses the merge, as it does on our key, and never throws', async () => {
    const outcome = await runStitch({ clipUrls: ['a', 'b', 'c'], expectedDurationS: 54 }, { queue: queue('forbidden'), pollIntervalMs: 0 });
    expect(outcome.output).toBeNull();
    expect(outcome.reason).toMatch(/403.*ffmpeg API is not enabled/);
  });

  it('says so when the merge returns no video, and asks for an explicit 1280x720 so the clips are not shrunk to the smallest', async () => {
    const q = queue('novideo');
    const outcome = await runStitch({ clipUrls: ['a', 'b', 'c'], expectedDurationS: 54 }, { queue: q, pollIntervalMs: 0 });
    expect(outcome).toEqual({ output: null, reason: 'the merge returned no video' });
    expect(q.submitted[0]).toEqual({ video_urls: ['a', 'b', 'c'], resolution: { width: 1280, height: 720 } });
  });
});
