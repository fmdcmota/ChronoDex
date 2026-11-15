/** List an era's stored media (newest first) and save the newest scene and panorama locally. Owner: Agent 2. Spike, read only. */
import { writeFileSync } from 'node:fs';
import { MongoClient } from 'mongodb';
import { openMedia } from '../../src/lib/media/index.ts';
const id = process.argv[2];
const client = new MongoClient(process.env.MONGODB_URI as string);
const db = client.db(process.env.MONGODB_DB);
const rows = await db.collection('media_assets').find({ eraId: id }).sort({ createdAt: -1 }).limit(10).toArray();
for (const r of rows) console.log(r._id, r.name, r.contentType, r.bytes, r.createdAt);
for (const name of ['scene', 'panorama']) {
  const r = rows.find((x) => x.name === name);
  if (!r) continue;
  const chunks: Uint8Array[] = [];
  for await (const c of (await openMedia(String(r._id))) as unknown as AsyncIterable<Uint8Array>) chunks.push(c);
  writeFileSync(`spikes/agent-2/out/regen-${name}.jpg`, Buffer.concat(chunks));
}
await client.close();
process.exit(0);
