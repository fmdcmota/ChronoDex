/** Print one era's media fields and its recent jobs (read only). Owner: Agent 2. Spike. Usage: era-peek.mts <eraId> */
import { getEra, closeMongo } from '../../src/lib/db/index.ts';
import { collections } from '../../src/lib/db/mongo.ts';
const id = process.argv[2];
const e = await getEra(id);
console.log(JSON.stringify({ state: e?.state, updatedAt: e?.updatedAt, scene: e?.sceneImageUrl, panorama: e?.panorama?.url, headshot: e?.guide?.headshotUrl, narration: e?.narrationAudioUrl }, null, 1));
const { jobs } = await collections();
for (const j of await jobs.find({ eraId: id }).sort({ createdAt: -1 }).limit(5).toArray()) console.log(j._id, j.state, j.createdAt, (j as { workerId?: string }).workerId ?? '');
await closeMongo();
process.exit(0);
