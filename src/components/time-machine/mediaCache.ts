/**
 * Keep generated pictures and narration on the phone, so a second visit downloads nothing.
 *
 * Owner: Agent 4. Task A4-14, notebook/agent-4-panorama-plan.md section 3.3.
 *
 * - Cache Storage `chronodex-media-v1` holds our `/api/media/<id>` files (content hashes, so never stale) and fal
 *   CDN files (also never rewritten). A hit is shown from an object URL with no request at all.
 * - Private mode and some in-app browsers refuse Cache Storage, or fal refuses CORS: every failure falls back to the
 *   plain URL, so the worst case is today's behaviour.
 * - Video clips are not routed through here: they are tens of MB and must stream with Range. The media route's
 *   `immutable` header already keeps them in the browser's HTTP cache.
 */
'use client';

import { useEffect, useState } from 'react';

/** Cache Storage name. Bump the version to drop every cached file. */
export const MEDIA_CACHE_NAME = 'chronodex-media-v1';
/** Hosts whose files never change once made: fal's CDN. */
const FAL_HOST_PATTERN = /(^|\.)fal\.(media|run|ai)$/i;

/**
 * Tell whether a URL may be kept in Cache Storage: our content-hashed media, or a fal CDN file. Fixtures and mock
 * images are left alone, since they can change while developing.
 *
 * @param url - A media URL from an Era or Landmark.
 * @param origin - The page's origin, for resolving relative URLs. Defaults to `window.location.origin`.
 * @returns True when the bytes behind the URL can never change.
 */
export function isCacheableMediaUrl(url: string, origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin): boolean {
  let u: URL;
  try {
    u = new URL(url, origin);
  } catch {
    return false;
  }
  if (u.origin === new URL(origin).origin) return u.pathname.startsWith('/api/media/');
  return u.protocol === 'https:' && FAL_HOST_PATTERN.test(u.hostname);
}

/** Resolved display URLs (object URLs, or the original on failure) for this page's lifetime. */
const resolved = new Map<string, string>();
/** In-flight resolutions, so two components asking for one file share one download. */
const pending = new Map<string, Promise<string>>();

/** Open the cache, or null where Cache Storage is unavailable. */
async function openCache(): Promise<Cache | null> {
  try {
    if (typeof caches === 'undefined') return null;
    return await caches.open(MEDIA_CACHE_NAME);
  } catch {
    return null;
  }
}

/**
 * Fetch a file into the cache if it is not there yet, and return the cached response.
 *
 * @param url - A cacheable URL.
 * @returns The response from the cache or the network, or null on any failure.
 */
async function fetchIntoCache(url: string): Promise<Response | null> {
  const cache = await openCache();
  try {
    const hit = await cache?.match(url);
    if (hit) return hit;
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) return null;
    // Store a copy; a refused write (quota, private mode) still lets this visit use the response.
    await cache?.put(url, res.clone()).catch(() => undefined);
    return res;
  } catch {
    return null;
  }
}

/**
 * The URL to show for a media file: an object URL from the cache when possible, else the URL itself.
 *
 * Side effects: may download the file once and keep it in Cache Storage. Object URLs live for the page's
 * lifetime (a few MB per year visited), so switching back to a year is instant.
 *
 * @param url - A media URL.
 * @returns A URL safe to put in `src`. Never rejects.
 */
export function resolveMediaUrl(url: string): Promise<string> {
  if (!isCacheableMediaUrl(url)) return Promise.resolve(url);
  const done = resolved.get(url);
  if (done) return Promise.resolve(done);
  let job = pending.get(url);
  if (!job) {
    job = (async () => {
      const res = await fetchIntoCache(url);
      let out = url;
      try {
        if (res) out = URL.createObjectURL(await res.blob());
      } catch {
        out = url;
      }
      resolved.set(url, out);
      pending.delete(url);
      return out;
    })();
    pending.set(url, job);
  }
  return job;
}

/**
 * Download files into Cache Storage in the background, one at a time, without making object URLs.
 *
 * Why: when the Time Machine opens, the landmark's other ready years are fetched so switching year is instant.
 * One at a time so the prefetch never competes much with the year being looked at.
 *
 * @param urls - Media URLs. Non-cacheable ones are skipped.
 * @returns Resolves when all are done. Never rejects.
 */
export async function prefetchMedia(urls: (string | null | undefined)[]): Promise<void> {
  for (const url of urls) {
    if (!url || !isCacheableMediaUrl(url) || resolved.has(url)) continue;
    await fetchIntoCache(url);
  }
}

/**
 * React hook: the display URL for a media file.
 *
 * @param url - A media URL, or null.
 * @returns The original URL straight away when it is not cacheable; for a cacheable one, null until the cache or
 *   network answers (show a placeholder), then an object URL, or the original URL if caching failed.
 */
export function useCachedMediaUrl(url: string | null | undefined): string | null {
  const [, setTick] = useState(0);
  const immediate = !url ? null : !isCacheableMediaUrl(url) ? url : (resolved.get(url) ?? undefined);
  useEffect(() => {
    if (!url || immediate !== undefined) return;
    let live = true;
    void resolveMediaUrl(url).then(() => {
      if (live) setTick((n) => n + 1);
    });
    return () => {
      live = false;
    };
  }, [url, immediate]);
  return immediate ?? null;
}
