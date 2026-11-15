/**
 * A2-r2-3: one production scene (runScene with its critic) for an era, from the current reference photo, without
 * touching the database. To compare framing before spending on a full regeneration. Owner: Agent 2. Spike.
 * Usage (repo root): MONGODB_DB=chronodex node --import tsx --env-file=.env.local spikes/agent-2/scene-trial.mts queens-tower_1893 <label>
 * Cost: about $0.16, up to $0.32 with the critic's retry.
 */
import { writeFileSync } from 'node:fs';
import { getEra, getLandmark, closeMongo } from '../../src/lib/db/index.ts';
import { toFalUrl } from '../../src/lib/media/index.ts';
import { runScene } from '../../src/lib/pipeline/stages/index.ts';

const [eraId, label = 'trial'] = process.argv.slice(2);
const era = await getEra(eraId);
const landmark = await getLandmark(era!.landmarkId);
const referencePhotoUrl = await toFalUrl(landmark!.referencePhotoUrl);
const t = Date.now();
const out = await runScene({ referencePhotoUrl, brief: era!.sceneBrief!, year: era!.year }, { pollIntervalMs: 1000 });
writeFileSync(`spikes/agent-2/out/scene-${label}.jpg`, Buffer.from(await (await fetch(out.url)).arrayBuffer()));
console.log(JSON.stringify({ seconds: Math.round((Date.now() - t) / 1000), size: `${out.widthPx}x${out.heightPx}`, check: out.check }, null, 1));
await closeMongo();
process.exit(0);
