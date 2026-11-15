// Agent 6: list the generated media of every era in a few databases. Reads only.
import { MongoClient } from 'mongodb';
const c = new MongoClient(process.env.MONGODB_URI!);
await c.connect();
for (const db of ['chronodex', 'chronodex_dev_agent2', 'chronodex_dev_alex']) {
  const eras = await c.db(db).collection('eras').find({ $or: [{ sceneImageUrl: { $ne: null } }, { 'guide.headshotUrl': { $ne: null } }] }).toArray();
  for (const e of eras) console.log(db, e._id ?? e.id, e.state, e.videoState, e.sceneImageUrl, e.panorama?.url, e.guide?.headshotUrl, e.narrationAudioUrl, e.guide?.name);
  console.log(db, 'landmarks', await c.db(db).collection('landmarks').countDocuments(), 'eras', await c.db(db).collection('eras').countDocuments());
}
await c.close();
