// Probe a page: screenshots over time and the buttons on it. Usage: node probe.mjs <path> <seconds...>
import { writeFileSync } from 'node:fs';
import { launch, sleep } from './cdp.mjs';
const [pathName, ...times] = process.argv.slice(2);
const s = await launch({ port: 9341 });
await s.gps(51.50003, -0.17742);
await s.goto('/?intro=0');
await s.evaluate('localStorage.clear(); sessionStorage.clear(); true');
await s.goto('/' + pathName.replace(/^\/+/, ''));
let last = 0;
for (const t of times.map(Number)) {
  await sleep((t - last) * 1000); last = t;
  const r = await s.send('Page.captureScreenshot', { format: 'jpeg', quality: 70 });
  writeFileSync(`probe-${t}.jpg`, Buffer.from(r.data, 'base64'));
}
console.log(await s.evaluate(`JSON.stringify([...document.querySelectorAll('button, a')].map(b => (b.getAttribute('aria-label') || b.textContent).trim().slice(0, 40)).filter(Boolean))`));
console.log('video els', await s.evaluate(`document.querySelectorAll('video').length`), 'errors', s.errors.slice(0, 3));
s.close();
