// Agent 6: delete one landmark and its eras from the database the app reads (seed never deletes). Usage: <landmarkId>
import { MongoClient } from 'mongodb';
const id = process.argv[2];
if (!id) throw new Error('Name a landmark id');
const c = new MongoClient(process.env.MONGODB_URI!);
await c.connect();
const db = c.db(process.env.MONGODB_DB ?? 'chronodex_dev');
const l = await db.collection('landmarks').deleteMany({ $or: [{ _id: id as never }, { id }] });
const e = await db.collection('eras').deleteMany({ $or: [{ landmarkId: id }, { _id: { $regex: `^${id}_` } as never }] });
console.log(`${process.env.MONGODB_DB}: deleted ${l.deletedCount} landmark(s), ${e.deletedCount} era(s) for ${id}`);
await c.close();
