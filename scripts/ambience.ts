/**
 * `scripts/ambience.ts`: generate the period music and street-sound loops for the chat.
 *
 * Owner: Agent 2 (Studio). Human-assigned after phone test round 1. Implements the "ambience loops" item in
 * notebook/agent-2.md; Agent 4 owns playback.
 *
 * Usage (repo root, FAL_KEY in .env.local, NEXT_PUBLIC_USE_MOCKS empty):
 *   npx tsx --env-file=.env.local scripts/ambience.ts                      all four buckets, music and street
 *   npx tsx --env-file=.env.local scripts/ambience.ts --bucket 1850-1899   one bucket
 *   npx tsx --env-file=.env.local scripts/ambience.ts --dry-run            print the prompts and the cost, spend nothing
 *   add --music-only or --street-only to make just one layer
 *
 * Output, in public/audio/ambience/:
 *   <bucket>.m4a           the music loop (45 s, instrumental)
 *   <bucket>-street.mp3    the street-sound loop (30 s, set to loop smoothly)
 *   manifest.json          file names, models, request ids, lengths and costs, for Agent 4 and the "made with fal" story
 * Cost: about $0.11 per music loop and $0.06 per street loop, so about $0.70 for everything.
 * Re-running overwrites the files. A failed file is reported and the rest carry on; the exit code is 1 if any failed.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import {
  AMBIENCE_BUCKETS,
  MODELS,
  MUSIC_LOOP_SECONDS,
  STREET_LOOP_SECONDS,
  buildMusicPrompt,
  buildStreetPrompt,
  runFal,
  type AmbienceBucket,
} from '@/lib/fal';

/** Where the files go, relative to the repo root. Served by Next.js as /audio/ambience/. */
const OUT_DIR = 'public/audio/ambience';
/** How closely the sound-effects model follows the prompt, 0 to 1. A little looser than its 0.3 default keeps it natural. */
const STREET_PROMPT_INFLUENCE = 0.4;
/** Sonilo bills at least 10 s per sample and $0.0025 per second (schema page). */
const MUSIC_USD_PER_SECOND = 0.0025;
/** ElevenLabs sound effects bill $0.002 per second (schema page). */
const STREET_USD_PER_SECOND = 0.002;

/** One generated file, as recorded in the manifest. */
interface ManifestEntry {
  bucket: AmbienceBucket;
  layer: 'music' | 'street';
  file: string;
  endpoint: string;
  requestId: string;
  seconds: number;
  estimatedCostUsd: number;
  generationSeconds: number;
  prompt: string;
}

/** Download a URL to a file. */
async function save(url: string, path: string): Promise<number> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`download failed (${response.status}) for ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(path, bytes);
  return bytes.length;
}

/** File extension for a fal audio file, from its URL or content type. The music model returns .m4a. */
function extensionOf(file: { url?: string; content_type?: string }, fallback: string): string {
  const fromUrl = file.url?.match(/\.(m4a|mp3|wav|ogg|aac)(\?|$)/i)?.[1]?.toLowerCase();
  if (fromUrl) return fromUrl;
  if (file.content_type?.includes('mp4')) return 'm4a';
  if (file.content_type?.includes('mpeg')) return 'mp3';
  return fallback;
}

/** Make the music loop for one bucket. */
async function music(bucket: AmbienceBucket): Promise<ManifestEntry> {
  const prompt = buildMusicPrompt(bucket);
  const result = await runFal<{ audio?: { url?: string; content_type?: string } }>(MODELS.ambience_music.endpoint, { prompt, duration: MUSIC_LOOP_SECONDS, num_samples: 1 });
  const audio = result.data.audio;
  if (!audio?.url) throw new Error(`${bucket} music: the model returned no audio`);
  const file = `${bucket}.${extensionOf(audio, 'm4a')}`;
  const bytes = await save(audio.url, `${OUT_DIR}/${file}`);
  console.log(`music  ${bucket}: ${file} (${Math.round(bytes / 1024)} KB, ${(result.elapsedMs / 1000).toFixed(0)} s)`);
  return { bucket, layer: 'music', file, endpoint: MODELS.ambience_music.endpoint, requestId: result.requestId, seconds: MUSIC_LOOP_SECONDS, estimatedCostUsd: Number((MUSIC_LOOP_SECONDS * MUSIC_USD_PER_SECOND).toFixed(4)), generationSeconds: Math.round(result.elapsedMs / 1000), prompt };
}

/** Make the street-sound loop for one bucket. */
async function street(bucket: AmbienceBucket): Promise<ManifestEntry> {
  const prompt = buildStreetPrompt(bucket);
  const result = await runFal<{ audio?: { url?: string; content_type?: string } }>(MODELS.ambience_street.endpoint, {
    text: prompt,
    duration_seconds: STREET_LOOP_SECONDS,
    loop: true,
    prompt_influence: STREET_PROMPT_INFLUENCE,
    output_format: 'mp3_44100_128',
  });
  const audio = result.data.audio;
  if (!audio?.url) throw new Error(`${bucket} street: the model returned no audio`);
  const file = `${bucket}-street.${extensionOf(audio, 'mp3')}`;
  const bytes = await save(audio.url, `${OUT_DIR}/${file}`);
  console.log(`street ${bucket}: ${file} (${Math.round(bytes / 1024)} KB, ${(result.elapsedMs / 1000).toFixed(0)} s)`);
  return { bucket, layer: 'street', file, endpoint: MODELS.ambience_street.endpoint, requestId: result.requestId, seconds: STREET_LOOP_SECONDS, estimatedCostUsd: Number((STREET_LOOP_SECONDS * STREET_USD_PER_SECOND).toFixed(4)), generationSeconds: Math.round(result.elapsedMs / 1000), prompt };
}

/** Run the script. */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const bucketArg = args[args.indexOf('--bucket') + 1];
  const buckets = args.includes('--bucket') ? AMBIENCE_BUCKETS.filter((b) => b === bucketArg) : [...AMBIENCE_BUCKETS];
  if (buckets.length === 0) throw new Error(`Unknown bucket "${bucketArg}". Choose from ${AMBIENCE_BUCKETS.join(', ')}.`);
  const layers = { music: !args.includes('--street-only'), street: !args.includes('--music-only') };
  const estimate = buckets.length * ((layers.music ? MUSIC_LOOP_SECONDS * MUSIC_USD_PER_SECOND : 0) + (layers.street ? STREET_LOOP_SECONDS * STREET_USD_PER_SECOND : 0));

  if (args.includes('--dry-run')) {
    for (const b of buckets) {
      if (layers.music) console.log(`[${b}] MUSIC  ${buildMusicPrompt(b)}\n`);
      if (layers.street) console.log(`[${b}] STREET ${buildStreetPrompt(b)}\n`);
    }
    console.log(`Dry run: nothing generated. Estimated cost ${estimate.toFixed(2)} USD.`);
    return;
  }
  if (!process.env.FAL_KEY || process.env.NEXT_PUBLIC_USE_MOCKS === '1') {
    throw new Error('Needs FAL_KEY in .env.local and NEXT_PUBLIC_USE_MOCKS empty (mock mode would not call fal).');
  }
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`Generating ${buckets.length} bucket(s). Estimated cost ${estimate.toFixed(2)} USD.`);

  const jobs = buckets.flatMap((b) => [...(layers.music ? [{ b, layer: 'music' as const, run: () => music(b) }] : []), ...(layers.street ? [{ b, layer: 'street' as const, run: () => street(b) }] : [])]);
  const settled = await Promise.allSettled(jobs.map((job) => job.run()));
  const entries: ManifestEntry[] = [];
  let failed = 0;
  settled.forEach((outcome, i) => {
    if (outcome.status === 'fulfilled') entries.push(outcome.value);
    else {
      failed++;
      console.error(`FAILED ${jobs[i].layer} ${jobs[i].b}: ${outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason)}`);
    }
  });
  entries.sort((a, b) => a.bucket.localeCompare(b.bucket) || a.layer.localeCompare(b.layer));
  const spent = entries.reduce((sum, e) => sum + e.estimatedCostUsd, 0);
  await writeFile(`${OUT_DIR}/manifest.json`, JSON.stringify({ generatedAt: new Date().toISOString(), estimatedCostUsd: Number(spent.toFixed(4)), files: entries }, null, 2));
  console.log(`\nDone: ${entries.length} file(s), ${failed} failed, about ${spent.toFixed(2)} USD. Manifest: ${OUT_DIR}/manifest.json`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
