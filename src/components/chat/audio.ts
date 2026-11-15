/**
 * Small helpers for the chat's one reply <audio> element: play a URL reliably, and play the
 * in-memory earcons that also unlock it on iOS.
 *
 * Owner: Agent 4. Part of A4-08 (MASTER.md section 11).
 *
 * Phone test round 1 (iPhone, iOS 26.5.1, MEDIA-6): audio sometimes played only on the second tap.
 * Setting `src` and calling `play()` at once can race the load on Safari, so `playUrl` calls `load()`
 * first and retries `play()` once after the element can play.
 */
'use client';

import { earconWav, silenceWav, type EarconKind } from './tone';

/** How long the retry waits for `canplay` before trying anyway. */
const RETRY_WAIT_MS = 1500;
/** Length of the silent unlock clip. */
const SILENT_UNLOCK_MS = 60;

/** Blob URLs of the generated sounds, made once per page. */
const soundUrls = new Map<string, string>();

/**
 * Object URL for a generated sound, made once and reused (no leak per tap).
 *
 * @param key - Cache key.
 * @param make - Builds the WAV bytes.
 * @returns A blob: URL.
 */
function soundUrl(key: string, make: () => Uint8Array<ArrayBuffer>): string {
  let url = soundUrls.get(key);
  if (!url) {
    url = URL.createObjectURL(new Blob([make()], { type: 'audio/wav' }));
    soundUrls.set(key, url);
  }
  return url;
}

/**
 * Play a URL on an element: set the source, load, play, and retry once if the first play fails.
 *
 * @param el - The element. Must have been unlocked by a tap on iOS.
 * @param url - What to play.
 * @returns Resolves once playback has started.
 * @throws The second play() failure (for example NotAllowedError when the element was never unlocked).
 */
export async function playUrl(el: HTMLAudioElement, url: string): Promise<void> {
  el.pause();
  el.src = url;
  el.load();
  try {
    await el.play();
  } catch {
    await canPlay(el);
    await el.play();
  }
}

/**
 * Resolve when the element can play, or after RETRY_WAIT_MS, whichever is first.
 *
 * @param el - The element.
 * @returns Resolves, never rejects.
 */
function canPlay(el: HTMLAudioElement): Promise<void> {
  if (el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      el.removeEventListener('canplay', done);
      resolve();
    };
    const timer = setTimeout(done, RETRY_WAIT_MS);
    el.addEventListener('canplay', done);
  });
}

/**
 * Play an earcon, or silence, on the element. Call synchronously inside a tap: on iOS that also
 * unlocks the element for a reply that arrives later.
 *
 * Side effects: interrupts whatever the element was playing.
 *
 * @param el - The shared reply element.
 * @param kind - "on" (rising), "off" (falling) or "silent" (unlock only).
 */
export function playCue(el: HTMLAudioElement, kind: EarconKind | 'silent'): void {
  const url = kind === 'silent' ? soundUrl('silent', () => silenceWav(SILENT_UNLOCK_MS)) : soundUrl(kind, () => earconWav(kind));
  el.pause();
  el.src = url;
  // No load() here: on iOS, play() must be called in the same task as the tap, and it loads by itself.
  void el.play().catch(() => undefined);
}
