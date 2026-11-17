/**
 * Showcase mode: the public portfolio build at fmota.com/chronodex, which must never spend credits.
 *
 * Owner: Agent 4 (R3-4e, hosting). Switched on by NEXT_PUBLIC_SHOWCASE=1 at build time (the `host` script at
 * the repo root sets it). It is a NEXT_PUBLIC_ variable so the server routes and the screens read the same
 * value. When it is off, nothing in the app changes.
 *
 * What it does, and where:
 * - Only landmarks with at least one generated era are listed, each with only its generated years
 *   (`showcaseLandmarks`, `showcaseEras`; GET /api/landmarks, GET /api/landmarks/[id]/eras, POST /api/captures).
 * - Nothing new is generated: POST /api/eras/[id]/generate answers with the era as it is and no job.
 * - Chat and voice are off: POST /api/chat, /api/voice/tts and /api/voice/stt refuse with 403, and the chat
 *   screen shows SHOWCASE_CHAT_NOTICE in place of the message box.
 * - Capture photos skip fal: POST /api/uploads writes them to a folder on the hosting PC (./photos.ts, server only)
 *   and returns a placeholder URL on the reserved `.invalid` domain, which the Dex does not show. The player's
 *   photo still lives on their phone in the memory box.
 * Eras without a guide video still play GuideStandIn: the guide's portrait over the scene with the narration.
 *
 * The keys are also removed from the server's environment by `host`, so a missed code path fails rather than spends.
 */
import type { Era, Landmark } from '@/lib/contracts';

/** True in the public no-credit build. Read at build time. */
export const SHOWCASE = process.env.NEXT_PUBLIC_SHOWCASE === '1';

/** Error code the chat and voice routes answer with in showcase mode. */
export const SHOWCASE_DISABLED_CODE = 'showcase_disabled';

/**
 * Text shown in place of the chat's message box in showcase mode.
 *
 * Example: showcaseChatNotice('Thomas Meacham', 1893) returns
 * "Chat is switched off on this public demo to save AI tokens. In the full game you can text or talk with Thomas: …"
 *
 * @param guideName - The guide's full name. Only the first word is used, as in the chat header.
 * @param year - The era's year.
 * @returns Two sentences.
 */
export function showcaseChatNotice(guideName: string, year: number): string {
  const first = guideName.trim().split(/\s+/)[0] || 'your guide';
  return (
    'Chat is switched off on this public demo to save AI tokens. ' +
    `In the full game you can text or talk with ${first}: ask about the history of this place, daily life in ${year}, ` +
    'and where to go next, and hear the answers in their voice.'
  );
}

/**
 * Whether an era has its generated content: text, guide and a picture. In practice an era is either complete
 * (state "ready") or empty ("missing"); this also guards against a half-made one.
 *
 * @param era - The era.
 * @returns True when the Time Machine can show it.
 */
export function eraHasContent(era: Era): boolean {
  return era.state === 'ready' && era.guide !== null && (era.panorama !== null || era.sceneImageUrl !== null);
}

/**
 * Keep only an era list's generated eras.
 *
 * @param eras - Eras of one landmark.
 * @returns The eras with content, in the same order.
 */
export function showcaseEras(eras: Era[]): Era[] {
  return eras.filter(eraHasContent);
}

/**
 * Keep only landmarks with at least one generated era, each with `eraYears` cut down to the generated years.
 *
 * Side effects: none. Reads eras through the function it is given, one call per landmark (about 30 small reads).
 *
 * @param landmarks - All landmarks.
 * @param listEras - Reads one landmark's eras (src/lib/db listEras), passed in so this module stays free of the db.
 * @returns The landmarks a showcase visitor can play, in the same order.
 */
export async function showcaseLandmarks(landmarks: Landmark[], listEras: (id: string) => Promise<Era[]>): Promise<Landmark[]> {
  const withEras = await Promise.all(
    landmarks.map(async (landmark) => ({ landmark, eras: showcaseEras(await listEras(landmark.id)) })),
  );
  return withEras
    .filter(({ eras }) => eras.length > 0)
    .map(({ landmark, eras }) => ({ ...landmark, eraYears: eras.map((e) => e.year).sort((a, b) => a - b) }));
}
