/**
 * Spend guards for the public voice routes: a per-caller rate limit and a cache of spoken replies.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 5.3 rule 1 (an open endpoint lets anyone spend
 * our credits) and rule 4 (never pay twice), task A2-11. In memory, per server process: enough to stop
 * a loop in a browser or a casual abuser, not a determined one. On Vercel every function instance has
 * its own counters, so the real ceiling is a multiple of the limit. A shared store would fix that.
 */

/** Result of asking a limiter whether a caller may go ahead. */
export interface RateDecision {
  /** True when the call may proceed. */
  ok: boolean;
  /** Seconds until the caller's window resets. 0 when allowed. */
  retryAfterS: number;
}

/** A fixed-window rate limiter. */
export interface RateLimiter {
  /**
   * Count one call for a caller and say whether it is allowed.
   *
   * @param key - Who is calling, for example an IP address.
   * @returns Whether to proceed and, if not, when to retry.
   */
  check(key: string): RateDecision;
}

/** Most callers a limiter remembers before it forgets expired windows. Bounds memory. */
const MAX_TRACKED_CALLERS = 5000;

/**
 * Create a fixed-window limiter: at most `limit` calls per caller in each `windowMs`.
 *
 * @param limit - Calls allowed per window.
 * @param windowMs - Window length in milliseconds.
 * @param now - Clock in milliseconds, injectable for tests. Default Date.now.
 * @returns The limiter.
 */
export function createRateLimiter(limit: number, windowMs: number, now: () => number = Date.now): RateLimiter {
  const windows = new Map<string, { startMs: number; count: number }>();
  return {
    check(key) {
      const nowMs = now();
      if (windows.size > MAX_TRACKED_CALLERS) {
        for (const [caller, w] of windows) if (nowMs - w.startMs >= windowMs) windows.delete(caller);
      }
      const current = windows.get(key);
      if (!current || nowMs - current.startMs >= windowMs) {
        windows.set(key, { startMs: nowMs, count: 1 });
        return { ok: true, retryAfterS: 0 };
      }
      current.count++;
      if (current.count <= limit) return { ok: true, retryAfterS: 0 };
      return { ok: false, retryAfterS: Math.max(1, Math.ceil((current.startMs + windowMs - nowMs) / 1000)) };
    },
  };
}

/** Most spoken replies the cache keeps. A reply is a short MP3 link, so this is a few kilobytes. */
const MAX_CACHED_REPLIES = 500;

/** Remembered speech: voice and text in, audio URL out. Oldest entries are dropped first. */
export interface SpeechCache {
  /** The URL spoken before for this voice and text, or undefined. */
  get(voiceKey: string, text: string): string | undefined;
  /** Remember a URL for this voice and text. */
  set(voiceKey: string, text: string, url: string): void;
}

/**
 * Create a bounded speech cache. Replaying a chat reply asks for the same text again, and the second
 * request should cost nothing. fal's URLs last at least 7 days (MASTER.md 5.3 rule 8), well beyond a demo.
 *
 * @param maxEntries - Most entries kept. Default MAX_CACHED_REPLIES.
 * @returns The cache.
 */
export function createSpeechCache(maxEntries: number = MAX_CACHED_REPLIES): SpeechCache {
  const entries = new Map<string, string>();
  const keyOf = (voiceKey: string, text: string): string => `${voiceKey}\u0000${text}`;
  return {
    get: (voiceKey, text) => entries.get(keyOf(voiceKey, text)),
    set(voiceKey, text, url) {
      entries.set(keyOf(voiceKey, text), url);
      if (entries.size > maxEntries) entries.delete(entries.keys().next().value as string);
    },
  };
}
