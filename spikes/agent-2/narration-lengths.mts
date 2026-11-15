/** R3-2b: narration length of every demo era from public/demo, no network. Owner: Agent 2. Spike. */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { audioSeconds } from './audio-seconds.mts';
for (const id of readdirSync('public/demo')) {
  const dir = `public/demo/${id}`;
  const f = ['narration.mp3', 'narration.wav'].find((n) => existsSync(`${dir}/${n}`));
  const era = JSON.parse(readFileSync(`data/demo/eras/${id}.json`, 'utf8'));
  const words = (era.guide?.script ?? era.era?.guide?.script ?? '').split(/\s+/).filter(Boolean).length;
  const s = f ? audioSeconds(readFileSync(`${dir}/${f}`)) : null;
  console.log(`${id.padEnd(30)} ${f ?? 'NO NARRATION'}  ${s?.toFixed(1)} s  ${words} words  files: ${readdirSync(dir).join(', ')}`);
}
