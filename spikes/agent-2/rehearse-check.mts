/** R3-2c: after a rehearsal, show each era's guide video and job stages. Owner: Agent 2. Spike. */
import { MongoClient } from 'mongodb';
const c = new MongoClient(process.env.MONGODB_URI!); await c.connect();
const db = c.db(process.env.MONGODB_DB);
for (const id of process.argv.slice(2)) {
  const era = await db.collection('eras').findOne({ id });
  const job = await db.collection('jobs').find({ eraId: id }).sort({ createdAt: -1 }).limit(1).next();
  const segs = era?.guideVideo?.segments?.map((s: { kind: string; durationS: number }) => `${s.kind}:${s.durationS}s`).join(' ');
  const stages = job?.stages?.map((s: { key: string; state: string }) => `${s.key}=${s.state}`).join(' ');
  console.log(`${id}\n  scene ${era?.sceneImageUrl}\n  video ${era?.videoState} [${segs}]\n  job ${job?.state}: ${stages}`);
}
await c.close();
