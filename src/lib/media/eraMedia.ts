/**
 * Rewrite an Era's media URLs to our own stored copies. Pure apart from the injected `keep` function.
 *
 * Owner: Agent 4 (Time Machine). Task A4-13 (scripts/persist-media.ts), notebook/agent-4-panorama-plan.md
 * section 3. Also usable by the pipeline (A2-h) to persist a whole Era in one call.
 */
import type { Era } from '@/lib/contracts';
import { mediaIdFromUrl } from './store';

/** One media field of an Era that points somewhere other than our store. */
export interface EraMediaRef {
  /** Short name, for example "panorama" or "walk_on". Recorded on the ledger. */
  name: string;
  url: string;
}

/**
 * Tell whether a URL still needs persisting: an http(s) URL that is not one of ours.
 *
 * @param url - A media URL, or null.
 * @returns False for null, our `/api/media` URLs, and site paths such as fixtures' `/mock/scene.svg`.
 */
export function needsPersisting(url: string | null | undefined): url is string {
  return Boolean(url && /^https?:\/\//i.test(url) && !mediaIdFromUrl(url));
}

/**
 * List the media an Era holds that is not in our store yet.
 *
 * @param era - The era.
 * @param options - Options.
 * @param options.includeVideo - False leaves the guide video clips out (tens of MB each). Default true.
 * @returns The references, in a stable order: scene, panorama, narration, headshot, clips, stitched.
 */
export function unpersistedMedia(era: Era, options: { includeVideo?: boolean } = {}): EraMediaRef[] {
  const out: EraMediaRef[] = [];
  const add = (name: string, url: string | null | undefined): void => {
    if (needsPersisting(url)) out.push({ name, url });
  };
  add('scene', era.sceneImageUrl);
  add('panorama', era.panorama?.url);
  add('narration', era.narrationAudioUrl);
  add('headshot', era.guide?.headshotUrl);
  if (options.includeVideo !== false) {
    for (const s of era.guideVideo?.segments ?? []) add(s.kind, s.url);
    add('stitched', era.guideVideo?.stitchedUrl);
  }
  return out;
}

/**
 * Build the Era patch that swaps each persisted URL for its stored copy.
 *
 * @param era - The era as read.
 * @param replaced - Map from old URL to new `/api/media/<id>` URL. URLs not in the map are left alone.
 * @returns A patch for patchEra holding only the fields that changed (whole objects for panorama, guide and
 *   guideVideo, since patchEra replaces top-level fields), or an empty object when nothing changed.
 */
export function eraMediaPatch(era: Era, replaced: ReadonlyMap<string, string>): Partial<Era> {
  const swap = (url: string | null): string | null => (url && replaced.get(url)) || url;
  const patch: Partial<Era> = {};
  if (era.sceneImageUrl && replaced.has(era.sceneImageUrl)) patch.sceneImageUrl = swap(era.sceneImageUrl);
  if (era.panorama && replaced.has(era.panorama.url)) patch.panorama = { ...era.panorama, url: swap(era.panorama.url)! };
  if (era.narrationAudioUrl && replaced.has(era.narrationAudioUrl)) patch.narrationAudioUrl = swap(era.narrationAudioUrl);
  if (era.guide?.headshotUrl && replaced.has(era.guide.headshotUrl)) patch.guide = { ...era.guide, headshotUrl: swap(era.guide.headshotUrl) };
  if (era.guideVideo) {
    const v = era.guideVideo;
    const changed = v.segments.some((s) => replaced.has(s.url)) || (v.stitchedUrl !== null && replaced.has(v.stitchedUrl));
    if (changed) {
      patch.guideVideo = {
        segments: v.segments.map((s) => ({ ...s, url: swap(s.url)! })),
        stitchedUrl: swap(v.stitchedUrl),
      };
    }
  }
  return patch;
}
