// Agent 5 spike: print the bounding box and centroid of named OSM buildings. Usage: node outline.mjs <regex>
import fs from 'node:fs';
const d = JSON.parse(fs.readFileSync(new URL('./cache/osm/geom.json', import.meta.url), 'utf8'));
const re = new RegExp(process.argv[2], 'i');
for (const e of d.elements) { const n = e.tags?.name || ''; if (!re.test(n) || !(e.tags.building || e.tags.man_made)) continue;
  const pts = e.type === 'way' ? e.geometry : (e.members || []).filter((m) => m.role === 'outer' && m.geometry).flatMap((m) => m.geometry);
  const la = pts.map((p) => p.lat), lo = pts.map((p) => p.lon);
  console.log(`${e.type}/${e.id} ${n}: lat ${Math.min(...la).toFixed(6)}..${Math.max(...la).toFixed(6)} lng ${Math.min(...lo).toFixed(6)}..${Math.max(...lo).toFixed(6)} wikidata ${e.tags.wikidata || '-'}`); }
