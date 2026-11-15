/**
 * R3-2b (finish line V4): for every demo era, check that each input the video tier needs exists and that fal can
 * read it, exactly as runEraJob does (media.toFalUrl), and measure the narration's length against the talk model.
 * Owner: Agent 2. Spike script, not used by src/.
 *
 * Usage (repo root): MONGODB_DB=chronodex NEXT_PUBLIC_USE_MOCKS= node --import tsx --env-file=.env.local spikes/agent-2/video-inputs.mts [eraId ...]
 * Cost: nothing paid. toFalUrl stores each /demo/ file in the media store once and uploads it to fal storage (free);
 * the real run reuses those uploads while they are fresh.
 * Output: one line per era, and spikes/agent-2/out/video-inputs.json.
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { getEra, closeMongo } from '../../src/lib/db/index.ts';
import { toFalUrl } from '../../src/lib/media/index.ts';
import { audioSeconds } from './audio-seconds.mts';

// With mocks on, uploadToFal returns a placeholder path and the media store would cache it as the file's fal URL
// (this happened at 04:20 on 15 Nov; spikes/agent-2/falurl-repair.mts cleared it).
if (process.env.NEXT_PUBLIC_USE_MOCKS === '1') throw new Error('Run with NEXT_PUBLIC_USE_MOCKS= (empty): mock uploads would poison the media store');
const ids = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync('data/demo/eras').map((f) => f.replace(/\.json$/, ''));
const rows: Record<string, unknown>[] = [];
for (const id of ids) {
  const era = await getEra(id);
  if (!era) { rows.push({ id, problem: 'no era in this database' }); console.log(`${id}: NO ERA`); continue; }
  const inputs = { scene: era.sceneImageUrl, headshot: era.guide?.headshotUrl ?? null, narration: era.narrationAudioUrl };
  const row: Record<string, unknown> = { id, state: era.state, videoState: era.videoState, voice: era.guide?.voiceKey, words: era.guide?.script.split(/\s+/).filter(Boolean).length, inputs };
  const problems: string[] = [];
  for (const [name, url] of Object.entries(inputs)) {
    if (!url) { problems.push(`${name} missing`); continue; }
    try {
      const fal = await toFalUrl(url);
      const res = await fetch(fal);
      const bytes = Buffer.from(await res.arrayBuffer());
      row[`${name}Fal`] = { status: res.status, type: res.headers.get('content-type'), kb: Math.round(bytes.length / 1024) };
      if (!res.ok) problems.push(`${name}: fal URL answers ${res.status}`);
      if (name === 'narration') row.narrationS = Math.round((audioSeconds(bytes) ?? NaN) * 10) / 10;
    } catch (err) {
      problems.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  row.problems = problems;
  rows.push(row);
  console.log(`${id.padEnd(30)} ${era.state}/${era.videoState}  voice ${row.voice}  ${row.words} words  narration ${row.narrationS} s  ${problems.length ? 'PROBLEMS: ' + problems.join('; ') : 'ok'}`);
}
writeFileSync('spikes/agent-2/out/video-inputs.json', JSON.stringify(rows, null, 1));
await closeMongo();
process.exit(0);
