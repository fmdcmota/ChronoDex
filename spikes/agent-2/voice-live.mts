/** Speak one line in each picked voice through the production synthesizeSpeech and transcribe it back. Owner: Agent 2. Spike. Under a cent per voice. */
import { synthesizeSpeech, transcribe } from '../../src/lib/fal/index.ts';
for (const key of process.argv.slice(2)) {
  const t = Date.now();
  const url = await synthesizeSpeech("Good afternoon! Mind the carriages as you cross, won't you?", key, { fast: true });
  const ms = Date.now() - t;
  console.log(key, `${ms} ms`, url.slice(-20), '->', JSON.stringify(await transcribe(url)));
}
process.exit(0);
