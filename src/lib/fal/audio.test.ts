/**
 * Unit tests for audio sniffing and upload naming. Owner: Agent 2 (Studio). Task A2-11.
 * The byte patterns are the real file signatures of each container.
 */
import { describe, expect, it } from 'vitest';
import { sniffAudio, uploadNameFor } from './audio';

/** Bytes from numbers and ASCII text, padded to 16 bytes. */
function bytes(...parts: (number | string)[]): Uint8Array {
  const out: number[] = [];
  for (const part of parts) {
    if (typeof part === 'number') out.push(part);
    else out.push(...[...part].map((c) => c.charCodeAt(0)));
  }
  while (out.length < 16) out.push(0);
  return Uint8Array.from(out);
}

describe('sniffAudio', () => {
  it('recognises each container from its signature', () => {
    expect(sniffAudio(bytes('OggS'))).toBe('ogg');
    expect(sniffAudio(bytes('fLaC'))).toBe('flac');
    expect(sniffAudio(bytes('RIFF', 0, 0, 0, 0, 'WAVE'))).toBe('wav');
    expect(sniffAudio(bytes(0x1a, 0x45, 0xdf, 0xa3))).toBe('webm');
    expect(sniffAudio(bytes(0, 0, 0, 0x20, 'ftypM4A '))).toBe('m4a');
    expect(sniffAudio(bytes('ID3', 4))).toBe('mp3');
    expect(sniffAudio(bytes(0xff, 0xfb, 0x90))).toBe('mp3');
    expect(sniffAudio(bytes(0xff, 0xf1, 0x50))).toBe('aac');
  });

  it('says unknown for anything else, including too few bytes', () => {
    expect(sniffAudio(bytes('hello world'))).toBe('unknown');
    expect(sniffAudio(new Uint8Array([]))).toBe('unknown');
  });
});

describe('uploadNameFor', () => {
  it('gives every recording an extension fal accepts', () => {
    const accepted = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac'];
    const samples = [bytes('OggS'), bytes(0x1a, 0x45, 0xdf, 0xa3), bytes(0, 0, 0, 0x20, 'ftypmp42'), bytes('ID3'), bytes('RIFF', 0, 0, 0, 0, 'WAVE'), bytes('x')];
    for (const sample of samples) {
      const extension = uploadNameFor(sample, '').split('.')[1];
      expect(accepted).toContain(extension);
    }
  });

  it('names Chrome WebM as .ogg and iOS MP4 as .m4a whatever the browser called them', () => {
    expect(uploadNameFor(bytes(0x1a, 0x45, 0xdf, 0xa3), 'audio/webm;codecs=opus')).toBe('speech.ogg');
    expect(uploadNameFor(bytes(0, 0, 0, 0x1c, 'ftypisom'), 'video/mp4')).toBe('speech.m4a');
  });

  it('trusts the bytes over a wrong MIME type, and falls back to the MIME type for unknown bytes', () => {
    expect(uploadNameFor(bytes('ID3'), 'audio/webm')).toBe('speech.mp3');
    expect(uploadNameFor(bytes('???'), 'audio/mp4')).toBe('speech.m4a');
    expect(uploadNameFor(bytes('???'), 'audio/mpeg')).toBe('speech.mp3');
    expect(uploadNameFor(bytes('???'), '')).toBe('speech.ogg');
  });
});
