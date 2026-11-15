// Agent 5 spike: check a candidate photo spot against OpenStreetMap geometry.
// Usage: node geo.mjs <lat> <lng> <subjectLat> <subjectLng>   (reads cache/osm/geom.json)
// Prints: buildings the spot is inside, nearest walkable ways, nearest roads, and every building
// the sight line to the subject crosses.
import fs from 'node:fs';
const d = JSON.parse(fs.readFileSync(new URL('./cache/osm/geom.json', import.meta.url), 'utf8'));
const [lat, lng, slat, slng] = process.argv.slice(2).map(Number);
const R = 6371008.8, rad = (x) => (x * Math.PI) / 180;
const toXY = (p) => ({ x: rad(p.lon - lng) * Math.cos(rad(lat)) * R, y: rad(p.lat - lat) * R });
const rings = (e) => (e.type === 'way' ? [e.geometry] : (e.members || []).filter((m) => m.role === 'outer' && m.geometry).map((m) => m.geometry)).filter(Boolean);
const inside = (pt, ring) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const a = ring[i], b = ring[j]; if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) c = !c; } return c; };
const segDist = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y; const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy); };
const cross = (p1, p2, p3, p4) => { const d1 = (p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x), d2 = (p4.x - p3.x) * (p2.y - p3.y) - (p4.y - p3.y) * (p2.x - p3.x), d3 = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x), d4 = (p2.x - p1.x) * (p4.y - p1.y) - (p2.y - p1.y) * (p4.x - p1.x); return d1 * d2 < 0 && d3 * d4 < 0; };
const O = { x: 0, y: 0 }, S = toXY({ lat: slat, lon: slng });
const label = (e) => `${e.type}/${e.id} ${e.tags?.name || e.tags?.['addr:housenumber'] || ''} [${e.tags?.building || e.tags?.highway || e.tags?.man_made || ''}${e.tags?.footway ? ':' + e.tags.footway : ''}]`;
const walk = [], road = [];
for (const e of d.elements) {
  const t = e.tags || {};
  if (t.building || t.man_made === 'tower') {
    for (const g of rings(e)) {
      const ring = g.map(toXY);
      if (inside(O, ring)) console.log('INSIDE', label(e));
      let hit = false; for (let i = 1; i < ring.length; i++) if (cross(O, S, ring[i - 1], ring[i])) hit = true;
      if (hit) console.log('SIGHT LINE CROSSES', label(e), inside(S, ring) ? '(subject building)' : '');
    }
  } else if (t.highway && e.geometry) {
    const pts = e.geometry.map(toXY); let m = Infinity; for (let i = 1; i < pts.length; i++) m = Math.min(m, segDist(O, pts[i - 1], pts[i]));
    (/footway|pedestrian|path|steps|living_street/.test(t.highway) ? walk : road).push([m, label(e)]);
  }
}
const top = (a) => a.sort((x, y) => x[0] - y[0]).slice(0, 4).map(([m, l]) => `${m.toFixed(1)} m ${l}`).join('\n  ');
console.log('distance to subject', Math.hypot(S.x, S.y).toFixed(1), 'm, bearing', ((Math.atan2(S.x, S.y) * 180) / Math.PI + 360) % 360 | 0);
console.log('walkable:\n  ' + top(walk)); console.log('roads:\n  ' + top(road));
