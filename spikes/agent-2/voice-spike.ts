/**
 * A2-04 voice bake-off. Owner: Agent 2 (Studio). Implements MASTER.md 5.2 (narration, chat speech, speech to text)
 * and task A2-04.
 *
 * Reads one guide script with several Eleven v4 voices and several Gemini TTS voices (with style instructions),
 * then transcribes every clip with Scribe v2 to check that the words survive and to measure length (target ~45 s).
 * A human judges the accents by ear: open out/voices/index.html.
 *
 * Usage: npm run voices
 *
 * Cost, from list prices: Eleven v4 $0.08 per 1,000 characters, Gemini 3.8 Flash TTS $0.045 per 1,000,
 * Scribe v2 $0.008 per minute. The script is ~640 characters, so about $0.05 per Eleven clip,
 * $0.03 per Gemini clip, under $0.01 per transcription. About $0.75 for the whole run.
 */
import { timedFal, download, writeRecord, failAndExit, OUT_DIR, type FalImage } from './lib.js';
import { mkdir, writeFile } from 'node:fs/promises';

const ELEVEN = 'elevenlabs/tts/eleven-v4';
const GEMINI = 'google/gemini-3.8-flash-tts';
const SCRIBE = 'fal-ai/elevenlabs/speech-to-text/scribe-v2';

/** At most this many fal requests in flight, to stay polite to the queue. */
const MAX_CONCURRENT = 4;

/**
 * Stand-in guide script (Martha Hale, flower seller, 1880). 105-120 words as MASTER.md section 7 requires,
 * opening with her name. Not checked by the Historian; it only has to sound like a guide script.
 */
const SCRIPT =
  "Good afternoon, dearie! I'm Martha Hale, and I sell flowers on this very corner. Violets in spring, " +
  'lavender come summer, a penny a bunch. Mind your skirts on the road, now: the crossing boy will sweep you ' +
  'a path through the mud for a ha\'penny. See them grand new museums going up? Paid for by the Great ' +
  'Exhibition, so they say. A lady here never steps out without her gloves and bonnet, and a gentleman ' +
  "tips his hat, or he's no gentleman at all. Of an evening the lamplighter comes round with his long pole, " +
  'and the whole street glows gold. Now, buy a sprig for your coat, love, and off you go exploring!';

/** Delivery note for Gemini. Billing excludes it (schema page). */
const GEMINI_STYLE_FEMALE =
  'A warm, cheerful working-class London woman in her late thirties, a Victorian street flower seller, with a ' +
  'natural Cockney accent. Friendly and lively, smiling as she speaks, unhurried, like chatting to a visitor.';
const GEMINI_STYLE_MALE =
  'A warm, good-humoured working-class London man in his fifties, a Victorian street porter, with a natural ' +
  'Cockney accent. Friendly and steady, like chatting to a visitor.';

interface Candidate {
  key: string;
  endpoint: string;
  input: Record<string, unknown>;
  note: string;
}

/** British voices to try. Eleven names are from the schema page; which ones are British is from memory (MASTER 14). */
const CANDIDATES: Candidate[] = [
  ...['Alice', 'Lily', 'Charlotte', 'George', 'Daniel', 'Callum', 'Brian', 'Bill'].map((voice) => ({
    key: `eleven-${voice.toLowerCase()}`,
    endpoint: ELEVEN,
    input: { text: SCRIPT, voice, stability: 0.4, similarity_boost: 0.75, language_code: 'en' },
    note: `Eleven v4, ${voice}`,
  })),
  ...['Kore', 'Aoede', 'Leda', 'Gacrux'].map((voice) => ({
    key: `gemini-${voice.toLowerCase()}`,
    endpoint: GEMINI,
    input: { prompt: SCRIPT, voice, style_instructions: GEMINI_STYLE_FEMALE },
    note: `Gemini TTS, ${voice}, female Cockney style`,
  })),
  ...['Charon', 'Algieba', 'Iapetus', 'Rasalgethi'].map((voice) => ({
    key: `gemini-${voice.toLowerCase()}`,
    endpoint: GEMINI,
    input: { prompt: SCRIPT, voice, style_instructions: GEMINI_STYLE_MALE },
    note: `Gemini TTS, ${voice}, male Cockney style`,
  })),
];

interface AudioResult {
  audio: FalImage;
}
interface ScribeWord {
  text: string;
  start: number;
  end: number;
  type: string;
}
interface ScribeResult {
  text: string;
  words: ScribeWord[];
}

/** Lower-case words with punctuation removed, for comparing a transcript with the script. */
function wordsOf(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z' ]+/g, ' ').split(/\s+/).filter(Boolean);
}

/**
 * Word error rate: word-level edit distance divided by the reference length.
 *
 * @param reference - The script.
 * @param hypothesis - The transcript.
 * @returns 0 for a perfect match. Above about 0.1 means words were garbled or skipped.
 */
export function wordErrorRate(reference: string, hypothesis: string): number {
  const ref = wordsOf(reference);
  const hyp = wordsOf(hypothesis);
  let previous = Array.from({ length: hyp.length + 1 }, (_, j) => j);
  for (let i = 1; i <= ref.length; i++) {
    const current = [i];
    for (let j = 1; j <= hyp.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[hyp.length] / ref.length;
}

/** Run async jobs with at most `limit` in flight, keeping input order in the results. */
async function pool<T, R>(items: T[], limit: number, run: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await run(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Synthesize one candidate, transcribe it, and measure it. Never throws: failures are recorded. */
async function evaluate(candidate: Candidate): Promise<Record<string, unknown>> {
  try {
    const tts = await timedFal<AudioResult>(candidate.key, candidate.endpoint, candidate.input);
    const ext = candidate.endpoint === GEMINI ? 'wav' : 'mp3';
    const localPath = await download(tts.data.audio.url, `voices/${candidate.key}.${ext}`);
    // Scribe: diarize and event tags off, as MASTER 5.2 says. This also proves Scribe takes MP3 and WAV.
    const stt = await timedFal<ScribeResult>(`${candidate.key} stt`, SCRIBE, {
      audio_url: tts.data.audio.url,
      language_code: 'eng',
      diarize: false,
      tag_audio_events: false,
    });
    const spoken = stt.data.words.filter((word) => word.type === 'word');
    const durationS = spoken.length ? spoken[spoken.length - 1].end : null;
    return {
      key: candidate.key,
      note: candidate.note,
      ttsMs: tts.elapsedMs,
      sttMs: stt.elapsedMs,
      durationS,
      wer: Number(wordErrorRate(SCRIPT, stt.data.text).toFixed(3)),
      transcript: stt.data.text,
      audioUrl: tts.data.audio.url,
      contentType: tts.data.audio.content_type,
      localPath,
      requestIds: { tts: tts.requestId, stt: stt.requestId },
    };
  } catch (error) {
    const body = (error as { body?: unknown }).body;
    console.error(`${candidate.key} failed:`, (error as Error).message, body ? JSON.stringify(body) : '');
    return { key: candidate.key, note: candidate.note, error: (error as Error).message, body };
  }
}

/** Build a listening page so the human can compare voices side by side. */
function listeningPage(rows: Record<string, unknown>[]): string {
  const body = rows
    .map((row) =>
      row.error
        ? `<tr><td>${row.note}</td><td colspan="3">failed: ${row.error}</td></tr>`
        : `<tr><td>${row.note}</td><td><audio controls preload="none" src="${String(row.localPath).replace(`${OUT_DIR}/voices/`, '')}"></audio></td>` +
          `<td>${row.durationS} s</td><td>${row.wer}</td></tr>`,
    )
    .join('\n');
  return `<!doctype html><meta charset="utf-8"><title>A2-04 voices</title>
<style>body{font:15px system-ui;margin:2rem}td{padding:.4rem .8rem;border-bottom:1px solid #ddd}</style>
<h1>A2-04 voice bake-off</h1><p>${SCRIPT}</p>
<table><tr><th>Voice</th><th>Listen</th><th>Length</th><th>WER</th></tr>${body}</table>`;
}

/** Run every candidate, then write the record and the listening page. */
async function main(): Promise<void> {
  console.log(`Script: ${wordsOf(SCRIPT).length} words, ${SCRIPT.length} characters`);
  await mkdir(`${OUT_DIR}/voices`, { recursive: true });
  const rows = await pool(CANDIDATES, MAX_CONCURRENT, evaluate);
  await writeRecord('voices/voice-spike.json', { script: SCRIPT, rows });
  await writeFile(`${OUT_DIR}/voices/index.html`, listeningPage(rows));
  console.log('\nkey | length s | WER | tts s');
  for (const row of rows) {
    console.log(row.error ? `${row.key} | FAILED` : `${row.key} | ${row.durationS} | ${row.wer} | ${(Number(row.ttsMs) / 1000).toFixed(1)}`);
  }
}

main().catch((error: unknown) => failAndExit('A2-04', error));
