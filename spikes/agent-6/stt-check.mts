// Agent 6 spike: transcribe the accent clips to make sure the tag is not read aloud. About $0.001.
import { fal } from '@fal-ai/client';
for (const url of process.argv.slice(2)) {
  const r = await fal.subscribe('fal-ai/elevenlabs/speech-to-text/scribe-v2', { input: { audio_url: url, language_code: 'eng', diarize: false, tag_audio_events: false } });
  console.log((r.data as { text: string }).text);
}
