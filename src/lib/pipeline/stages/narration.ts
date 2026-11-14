/**
 * Stage `narration`: turn the guide's script into speech.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 5.1 (stage narration), task A2-08.
 */
import type { Guide } from '@/lib/contracts';
import { MODELS, synthesizeSpeech } from '@/lib/fal';
import type { StageContext, StageOutput } from './types';

/**
 * Read the guide's script aloud in the guide's voice.
 *
 * Model: MODELS.narration (Eleven v4). The voice comes from VOICE_CATALOG through `guide.voiceKey`.
 * Cost and time: about $0.08 per 1,000 characters, about 12 s for a 600-character script (A2-04).
 * Length: the clip runs about 2.9 words a second, so a 130-word script is about 45 s.
 * Side effects: one fal request. Writes nothing; the orchestrator stores the URL.
 *
 * @param input - The guide whose script is spoken.
 * @param input.guide - Needs `script` and `voiceKey`.
 * @param ctx - Resume id and callbacks. `ctx.endpoint` is ignored: the voice routes pick their own model.
 * @returns URL of an MP3 on fal's CDN, with the model and timing.
 * @throws Error on an unknown voice key or an empty script. FalStageError when fal fails.
 */
export async function runNarration(input: { guide: Pick<Guide, 'script' | 'voiceKey'> }, ctx: StageContext = {}): Promise<StageOutput> {
  const startMs = Date.now();
  let requestId: string | null = null;
  const { endpoint: ignored, ...runContext } = ctx;
  void ignored;
  const url = await synthesizeSpeech(input.guide.script, input.guide.voiceKey, undefined, {
    ...runContext,
    onRequestId: async (id) => {
      requestId = id;
      await runContext.onRequestId?.(id);
    },
  });
  return { url, model: MODELS.narration.endpoint, requestId, elapsedMs: Date.now() - startMs };
}
