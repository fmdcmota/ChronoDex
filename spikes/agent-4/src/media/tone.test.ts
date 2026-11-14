/** Unit tests for tone.ts and recorder.ts pure helpers (A4-08 spike, Agent 4). */
import { describe, expect, it } from 'vitest';
import { sineWav } from './tone';
import { extensionFor } from './recorder';

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
