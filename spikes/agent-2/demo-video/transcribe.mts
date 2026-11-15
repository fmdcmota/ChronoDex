/**
 * Transcribe the team's voice-over with word timestamps (fal Scribe v2, about $0.008 a minute), so the edit can
 * place each line. Owner: Agent 2. Spike. Usage: npx tsx --env-file=.env.local spikes/agent-2/demo-video/transcribe.mts <audio>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fal } from '@fal-ai/client';

const file = process.argv[2]!;
const url = await fal.storage.upload(new File([readFileSync(file)], 'voiceover.m4a', { type: 'audio/mp4' }));
const { data } = await fal.subscribe('fal-ai/elevenlabs/speech-to-text/scribe-v2', {
  input: { audio_url: url, language_code: 'eng', diarize: false, tag_audio_events: false },
});
writeFileSync('spikes/agent-2/demo-video/work2/transcript.json', JSON.stringify(data, null, 1));
const words = (data as { words?: { text: string; start: number; end: number; type?: string }[] }).words ?? [];
let line = '';
let lineStart = 0;
let last = 0;
for (const w of words) {
  if (w.type === 'spacing') continue;
  if (line && w.start - last > 0.45) { console.log(`${lineStart.toFixed(2)}-${last.toFixed(2)}  ${line}`); line = ''; }
  if (!line) lineStart = w.start;
  line += (line ? ' ' : '') + w.text;
  last = w.end;
}
if (line) console.log(`${lineStart.toFixed(2)}-${last.toFixed(2)}  ${line}`);
