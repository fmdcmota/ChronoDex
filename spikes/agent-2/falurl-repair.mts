/**
 * R3-2b repair: find media-store records whose cached `falUrl` is not an http(s) URL and, with --fix, clear it.
 * Owner: Agent 2. Spike script, not used by src/.
 *
 * Why: in mock mode uploadToFal returns the placeholder "/mock/reference.svg". When anything called toFalUrl with
 * NEXT_PUBLIC_USE_MOCKS=1 against a real database, the store recorded that placeholder as the file's fal URL for
 * six days, so later real calls (the video tier) would send fal a site path. Clearing the field makes the next
 * toFalUrl upload the file afresh (free). The bytes and every other field are untouched.
 *
 * Usage (repo root): MONGODB_DB=chronodex node --import tsx --env-file=.env.local spikes/agent-2/falurl-repair.mts [--fix]
 */
import { MongoClient } from 'mongodb';

const fix = process.argv.includes('--fix');
const client = new MongoClient(process.env.MONGODB_URI!);
await client.connect();
const db = client.db(process.env.MONGODB_DB);
const names = (await db.listCollections().toArray()).map((c) => c.name).filter((n) => /media/i.test(n) && !/\.(files|chunks)$/.test(n));
for (const name of names) {
  const filter = { falUrl: { $type: 'string', $not: /^https?:\/\//i } };
  const bad = await db.collection(name).find(filter).project({ name: 1, sourceUrl: 1, falUrl: 1, createdAt: 1 }).toArray();
  console.log(`${db.databaseName}.${name}: ${bad.length} record(s) with a non-http falUrl`);
  for (const b of bad) console.log(`  ${b._id}  ${b.sourceUrl}  falUrl=${b.falUrl}  created ${b.createdAt}`);
  if (fix && bad.length) {
    const res = await db.collection(name).updateMany(filter, { $set: { falUrl: null, falUrlExpiresAt: null } });
    console.log(`  cleared ${res.modifiedCount}`);
  }
}
await client.close();
