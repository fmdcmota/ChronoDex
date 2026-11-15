// Agent 5 spike: polite Wikimedia Commons API client with an on-disk cache.
// Usage:
//   node commons.mjs search "<words>"            files matching a full-text search (namespace 6)
//   node commons.mjs cat "<Category name>"        files and subcategories of a category
//   node commons.mjs geo <lat> <lng> [radiusM]     files geotagged near a point
//   node commons.mjs info "File:A.jpg" "File:B.jpg" ...   size, licence, author, date, 1920 px thumbnail
//   node commons.mjs get <url> <outfile>           download one image (for looking at it)
// Sends the User-Agent AGENT5.md rule 4.5 asks for, waits 1.1 s before each uncached request, and
// caches every API answer under cache/api/ so a rerun costs nothing.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const UA = 'Chronodex-hackathon-archivist/0.1';
const API = 'https://commons.wikimedia.org/w/api.php';
const CACHE = new URL('./cache/api/', import.meta.url);
const PAUSE_MS = 1100;
fs.mkdirSync(CACHE, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
  const qs = new URLSearchParams({ format: 'json', formatversion: '2', ...params }).toString();
  const file = new URL(crypto.createHash('sha1').update(qs).digest('hex').slice(0, 16) + '.json', CACHE);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  await sleep(PAUSE_MS);
  const res = await fetch(`${API}?${qs}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} for ${qs}`);
  const json = await res.json();
  fs.writeFileSync(file, JSON.stringify(json));
  return json;
}

const strip = (html) => String(html ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'search') {
  const d = await api({ action: 'query', list: 'search', srnamespace: '6', srlimit: '50', srsearch: args.join(' ') });
  for (const r of d.query.search) console.log(r.title);
} else if (cmd === 'cat') {
  const d = await api({ action: 'query', list: 'categorymembers', cmtitle: `Category:${args[0].replace(/^Category:/, '')}`, cmtype: 'file|subcat', cmlimit: '500' });
  for (const r of d.query.categorymembers) console.log(r.title);
} else if (cmd === 'geo') {
  const [lat, lng, radius = '300'] = args;
  const d = await api({ action: 'query', list: 'geosearch', gscoord: `${lat}|${lng}`, gsradius: radius, gsnamespace: '6', gslimit: '100' });
  for (const r of d.query.geosearch) console.log(`${Math.round(r.dist)} m\t${r.title}`);
} else if (cmd === 'info') {
  for (let i = 0; i < args.length; i += 20) {
    const titles = args.slice(i, i + 20).join('|');
    const d = await api({ action: 'query', prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1920', titles });
    for (const p of d.query.pages) {
      const ii = p.imageinfo?.[0];
      if (!ii) { console.log(`${p.title}: no imageinfo`); continue; }
      const m = ii.extmetadata ?? {};
      console.log(JSON.stringify({
        title: p.title,
        pageUrl: ii.descriptionurl,
        original: `${ii.width}x${ii.height} ${ii.mime}`,
        thumb: ii.thumburl ? `${ii.thumbwidth}x${ii.thumbheight} ${ii.thumburl}` : null,
        licence: strip(m.LicenseShortName?.value),
        author: strip(m.Artist?.value).slice(0, 120),
        date: strip(m.DateTimeOriginal?.value).slice(0, 80),
        description: strip(m.ImageDescription?.value).slice(0, 300),
      }));
    }
  }
} else if (cmd === 'get') {
  const [url, out] = args;
  await sleep(PAUSE_MS);
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  console.log(`${out}: ${res.headers.get('content-type')}`);
} else {
  console.log('usage: node commons.mjs search|cat|geo|info|get ...');
}
