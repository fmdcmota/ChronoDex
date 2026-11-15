/** Unit tests for tone.ts and recorder.ts pure helpers. Owner: Agent 4 (A4-08). */
import { describe, expect, it } from 'vitest';
import { earconWav, notesWav, silenceWav, sineWav } from './tone';
import { extensionFor, hasAudio, MIN_RECORDING_BYTES, streamIsUsable } from './recorder';

describe('sineWav', () => {
  it('writes a RIFF/WAVE header and the right data size', () => {
    const wav = sineWav(440, 1000);
    const v = new DataView(wav.buffer);
    expect(String.fromCharCode(...wav.slice(0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...wav.slice(8, 12))).toBe('WAVE');
    expect(v.getUint32(24, true)).toBe(22050);
    expect(v.getUint32(40, true)).toBe(22050 * 2);
    expect(wav.length).toBe(44 + 22050 * 2);
  });
});

describe('extensionFor', () => {
  it('maps recorder MIME types to upload extensions', () => {
    expect(extensionFor('audio/webm;codecs=opus')).toBe('webm');
    expect(extensionFor('audio/mp4')).toBe('m4a');
    expect(extensionFor('audio/ogg;codecs=opus')).toBe('ogg');
    expect(extensionFor('')).toBe('bin');
  });
});

describe('earconWav and notesWav', () => {
  /** Samples after the header, as numbers. */
  const samplesOf = (wav: Uint8Array<ArrayBuffer>) => {
    const v = new DataView(wav.buffer);
    const out: number[] = [];
    for (let off = 44; off + 1 < wav.length; off += 2) out.push(v.getInt16(off, true));
    return out;
  };

  it('starts and ends at silence, so it never clicks', () => {
    for (const kind of ['on', 'off'] as const) {
      const s = samplesOf(earconWav(kind));
      expect(Math.abs(s[0])).toBeLessThan(50);
      expect(Math.abs(s[s.length - 1])).toBeLessThan(400);
    }
  });

  it('stays soft: peak under a quarter of full scale', () => {
    const peak = Math.max(...samplesOf(earconWav('on')).map(Math.abs));
    expect(peak).toBeGreaterThan(0.15 * 0x7fff);
    expect(peak).toBeLessThan(0.25 * 0x7fff);
  });

  it('is about 180 ms: two 80 ms notes and a 20 ms gap', () => {
    expect(samplesOf(earconWav('off')).length).toBe(Math.round(22050 * 0.08) * 2 + Math.round(22050 * 0.02));
  });

  it('rises for on and falls for off (more zero crossings means higher pitch)', () => {
    const crossings = (s: number[]) => s.slice(1).filter((x, i) => (x >= 0) !== (s[i] >= 0)).length;
    const half = (kind: 'on' | 'off', second: boolean) => {
      const s = samplesOf(earconWav(kind));
      const n = Math.round(22050 * 0.08);
      return crossings(second ? s.slice(s.length - n) : s.slice(0, n));
    };
    expect(half('on', true)).toBeGreaterThan(half('on', false));
    expect(half('off', true)).toBeLessThan(half('off', false));
  });

  it('writes silence between notes and for a 0 Hz note', () => {
    const s = samplesOf(notesWav([440, 0], 50, 10, 0.5, 5));
    const n = Math.round(22050 * 0.05);
    expect(s.slice(n, s.length).every((x) => x === 0)).toBe(true);
  });

  it('silenceWav is all zeros', () => {
    expect(samplesOf(silenceWav(60)).every((x) => x === 0)).toBe(true);
  });
});

describe('hasAudio', () => {
  it('rejects the 5-byte recordings seen on iOS and keeps real ones', () => {
    const rec = (bytes: number) => ({ blob: new Blob([new Uint8Array(bytes)]), type: 'audio/webm', durationMs: 4000 });
    expect(hasAudio(rec(5))).toBe(false);
    expect(hasAudio(rec(MIN_RECORDING_BYTES - 1))).toBe(false);
    expect(hasAudio(rec(92278))).toBe(true);
  });
});

describe('streamIsUsable', () => {
  const track = (readyState: 'live' | 'ended', muted = false, enabled = true) => ({ readyState, muted, enabled }) as MediaStreamTrack;
  const stream = (...tracks: MediaStreamTrack[]) => ({ getAudioTracks: () => tracks });

  it('needs a stream with live, unmuted, enabled audio tracks', () => {
    expect(streamIsUsable(null)).toBe(false);
    expect(streamIsUsable(stream())).toBe(false);
    expect(streamIsUsable(stream(track('live')))).toBe(true);
    expect(streamIsUsable(stream(track('ended')))).toBe(false);
    expect(streamIsUsable(stream(track('live', true)))).toBe(false);
    expect(streamIsUsable(stream(track('live', false, false)))).toBe(false);
    expect(streamIsUsable(stream(track('live'), track('ended')))).toBe(false);
  });
});
