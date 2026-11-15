/**
 * R3-2c: copy the landmarks and eras of one database into a scratch database, so the video tier can be rehearsed
 * (`scripts/pregenerate.ts --rehearse`) on the real demo eras without writing fixture media into them.
 * Owner: Agent 2. Spike script, not used by src/.
 *
 * Usage (repo root): node --import tsx --env-file=.env.local spikes/agent-2/copy-db.mts chronodex chronodex_rehearse_agent2
 * The target's landmarks, eras and jobs are replaced. Refuses to write into "chronodex".
 */
import { MongoClient } from 'mongodb';

const [from, to] = process.argv.slice(2);
if (!from || !to) throw new Error('usage: copy-db.mts <from db> <to db>');
if (to === 'chronodex') throw new Error('refusing to overwrite the demo database');
const client = new MongoClient(process.env.MONGODB_URI!);
await client.connect();
for (const name of ['landmarks', 'eras']) {
  const docs = await client.db(from).collection(name).find().toArray();
  await client.db(to).collection(name).deleteMany({});
  if (docs.length) await client.db(to).collection(name).insertMany(docs);
  console.log(`${name}: copied ${docs.length} from ${from} to ${to}`);
}
await client.db(to).collection('jobs').deleteMany({});
await client.close();
