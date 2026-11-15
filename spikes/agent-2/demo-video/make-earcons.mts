/** Write the chat's real earcons (src/components/chat/tone.ts) to assets/ for the edit. Owner: Agent 2. Spike. */
import { writeFileSync } from 'node:fs';
import { earconWav } from '../../../src/components/chat/tone.ts';
for (const kind of ['on', 'off'] as const) writeFileSync(`assets/earcon-${kind}.wav`, earconWav(kind));
console.log('earcons written');
