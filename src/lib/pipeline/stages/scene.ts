/**
 * Stage `scene`: edit the reference photo to the era's year.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 5.1 (stage scene), task A2-08, the realism rework after
 * phone test round 1, and the image check of task A2-12.
 */
import type { SceneBrief } from '@/lib/contracts';
import { MAX_REFERENCE_PHOTOS } from '@/lib/fal';
import { checkScene } from './critic';
import { criticContext, generateChecked } from './checked';
import { WIDESCREEN_RATIO, localVerdict, pictureProblems } from './localChecks';
import { buildImageEditInput, runImageModel } from './inputs';
import { buildSceneCheckPrompt, buildScenePrompt, withCorrection, type PromptStyle } from './prompts';
import type { StageContext, StageOutput } from './types';

/**
 * Keep only usable period photograph URLs, at most MAX_REFERENCE_PHOTOS.
 *
 * @param urls - Candidate URLs, normally SceneBrief.referenceImageUrls.
 * @returns The first few http(s) URLs. Anything else (and any Google address) is dropped.
 */
export function usableReferenceUrls(urls: string[] | undefined): string[] {
  return (urls ?? []).filter(isUsableReferenceUrl).slice(0, MAX_REFERENCE_PHOTOS);
}

/**
 * Whether one URL may be given to the model as a reference photograph: http(s) only, and never a Google
 * address (MASTER.md section 6). Street View images are served from googleusercontent.com and gstatic.com,
 * so the whole family is refused, not just google.com.
 *
 * @param url - The candidate.
 * @returns True when it is a plain http(s) URL that is not Google's.
 */
function isUsableReferenceUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && !/google|gstatic|ggpht/i.test(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Edit the present-day reference photo into the same place in `year`, then have the critic judge it.
 *
 * Model: MODELS.scene (Nano Banana Pro edit; schema at https://fal.ai/models/<endpoint>/llms.txt).
 * Cost and time: about $0.15 and 20 to 26 s at 1K, 16:9 (A2-02, 1376x768 out), plus about $0.0125 and 5 s for the
 * check. A failed check (an anachronism, or a computer-generated look) repeats the edit once with the critic's
 * advice added and keeps the better picture.
 * Realism (bake-off, Queen's Tower 1893): the period prompt alone already removed the polished film-set look,
 * and 1 to 3 real period photographs of the place, passed after the main image, made the vanished building
 * look like the real one. Trade-off: with references the model reframes the view, so the camera position is
 * no longer identical to the reference photo; the then/now slider may not line up.
 * The reference photo must already be 16:9: the model centre-crops anything else (A2-02 trap).
 * Side effects: one or two fal edits and one or two critic requests. Writes nothing; the orchestrator stores the URL.
 *
 * @param input - The reference photo URL, the Historian's scene brief and the year.
 * @param input.referencePhotoUrl - URL of the present-day photo (Landmark.referencePhotoUrl).
 * @param input.brief - The scene brief from the Historian. Its `referenceImageUrls` (public domain archive
 *   photographs) are passed to the model as extra images, at most MAX_REFERENCE_PHOTOS.
 * @param input.year - The era's year.
 * @param input.look - `colour` (default) or `monochrome`. A human decision, see PromptStyle.
 * @param ctx - Resume id, callbacks, optional fallback endpoint, and `checks` to switch the critic off.
 * @returns URL of the edited scene on fal's CDN, with the model, timing and the critic's report.
 * @throws FalStageError when fal rejects the request or returns no image. The critic never throws.
 */
export async function runScene(
  input: { referencePhotoUrl: string; brief: SceneBrief; year: number; look?: PromptStyle['look'] },
  ctx: StageContext = {},
): Promise<StageOutput> {
  const references = usableReferenceUrls(input.brief.referenceImageUrls);
  const prompt = buildScenePrompt(input.brief, input.year, { look: input.look, referenceCount: references.length });
  const checkPrompt = buildSceneCheckPrompt(input.year, input.brief.changes.notYetBuilt);
  const { output, report } = await generateChecked({
    ctx,
    generate: (fix, runCtx) => runImageModel('scene', buildImageEditInput(withCorrection(prompt, fix), [input.referencePhotoUrl, ...references]), runCtx),
    judge: async (picture) => {
      // Free first (A2-i): a picture of the wrong shape never reaches the paid critic.
      const free = pictureProblems(picture, WIDESCREEN_RATIO);
      if (free.length) return { verdict: localVerdict(free, 'The picture must be exactly 16:9 landscape, the same framing as image 1.') };
      return ({ verdict: await checkScene(picture.url, checkPrompt, criticContext(ctx)) });
    },
  });
  return { ...output, check: report };
}
