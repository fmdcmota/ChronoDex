// Agent 6 spike: does Eleven v4 honour an accent audio tag? Two short clips, about $0.02.
import { fal } from '@fal-ai/client';
const line = 'Good day, traveller! My name is Itzel, and I sell flowers in the great market by the temple.';
for (const [voice, tag] of [['Jessica', 'Mexican Spanish accent'], ['Brian', 'Portuguese accent']] as const) {
  const r = await fal.subscribe('elevenlabs/tts/eleven-v4', { input: { text: `[${tag}] ${line}`, voice, stability: 0.4, language_code: 'en' } });
  console.log(voice, tag, (r.data as { audio: { url: string } }).audio.url);
}
