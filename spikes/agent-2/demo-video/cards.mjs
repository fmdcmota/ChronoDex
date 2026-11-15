/**
 * Render the demo video's still layers with Chrome, in the app's pixel font: for each phone section a background
 * (cards/<id>-bg.png) and the phone bezel that sits over the recording (cards/bezel.png); Edith's lower third
 * (cards/guide-lower.png); and the end card (cards/close.png). Owner: Agent 2. Spike.
 * Usage: node spikes/agent-2/demo-video/cards.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { HERE, launch, sleep } from './cdp.mjs';
import { PHONE_SLOT, SECTIONS, SIZE } from './timeline.mjs';

const FONT = pathToFileURL(path.join(HERE, '../../../node_modules/@fontsource/jersey-10/files/jersey-10-latin-400-normal.woff2')).href;
const OUT = path.join(HERE, 'cards');
mkdirSync(OUT, { recursive: true });

const C = { ink: '#1e1a2b', night: '#14111d', paper: '#f6efd9', gold: '#f2b43c', goldDark: '#b97b1e', brick: '#c8553d', soft: '#cfc7e6', verdigris: '#4fa58f' };

const BASE_CSS = `
@font-face { font-family: 'Jersey 10'; src: url('${FONT}') format('woff2'); }
* { margin: 0; box-sizing: border-box; }
html, body { width: ${SIZE.w}px; height: ${SIZE.h}px; overflow: hidden; }
.pixel { font-family: 'Jersey 10', monospace; }
.body { font-family: 'Segoe UI', system-ui, sans-serif; }
`;

/** A starry, slightly glowing night background, the same family as the welcome screen. */
const SKY = `
  background:
    radial-gradient(2px 2px at 8% 14%, #fff9 98%, transparent), radial-gradient(1.5px 1.5px at 31% 82%, #fff7 98%, transparent),
    radial-gradient(2px 2px at 47% 8%, #fff8 98%, transparent), radial-gradient(1.5px 1.5px at 66% 91%, #fff6 98%, transparent),
    radial-gradient(2px 2px at 83% 21%, #fff8 98%, transparent), radial-gradient(1.5px 1.5px at 94% 63%, #fff6 98%, transparent),
    radial-gradient(1.5px 1.5px at 57% 47%, #fff5 98%, transparent), radial-gradient(2px 2px at 76% 74%, #fff6 98%, transparent),
    radial-gradient(ellipse at 22% 50%, #3b3270 0%, transparent 55%),
    radial-gradient(ellipse at 85% 110%, #4a3f8a99 0%, transparent 60%),
    linear-gradient(160deg, ${C.night} 0%, ${C.ink} 60%, #241f3a 100%);`;

const phoneSections = SECTIONS.filter((s) => s.parts);
const steps = (active) => phoneSections.map((s, i) => `<span style="display:inline-block;width:${s.id === active ? 46 : 14}px;height:14px;margin-right:10px;background:${s.id === active ? C.gold : '#ffffff33'}"></span>`).join('');

/** The background of a phone section: sky, the text panel on the right, the step dots. */
function sectionBg(sec) {
  return `<html><head><style>${BASE_CSS}</style></head><body style="${SKY}">
  <div style="position:absolute;left:${PHONE_SLOT.x - 30}px;top:${PHONE_SLOT.y - 30}px;width:${PHONE_SLOT.w + 60}px;height:${PHONE_SLOT.h + 60}px;border-radius:70px;box-shadow:0 0 80px 10px #f2b43c22, 0 30px 60px #0008;"></div>
  <div class="pixel" style="position:absolute;left:870px;top:92px;font-size:40px;letter-spacing:.14em;color:${C.gold};text-shadow:3px 3px 0 #000">CHRONODEX</div>
  <div style="position:absolute;left:870px;right:110px;top:300px">
    <div class="pixel" style="font-size:46px;letter-spacing:.12em;color:${C.gold};text-shadow:3px 3px 0 #000">${sec.kicker}</div>
    <div class="pixel" style="margin-top:18px;font-size:98px;line-height:.95;color:${C.paper};text-shadow:5px 5px 0 ${C.brick}, 10px 10px 0 #000">${sec.headline}</div>
    <div class="body" style="margin-top:40px;font-size:34px;line-height:1.35;color:${C.soft};max-width:860px">${sec.sub}</div>
  </div>
  <div style="position:absolute;left:870px;bottom:96px">${steps(sec.id)}</div>
  </body></html>`;
}

/** The bezel over the recording: a dark frame whose rounded inner edge covers the video's square corners. */
function bezel() {
  const t = 16;
  return `<html><head><style>${BASE_CSS}</style></head><body style="background:transparent">
  <div style="position:absolute;left:${PHONE_SLOT.x - t}px;top:${PHONE_SLOT.y - t}px;width:${PHONE_SLOT.w + 2 * t}px;height:${PHONE_SLOT.h + 2 * t}px;
    border:${t}px solid #0b0912;border-radius:${40 + t}px;box-shadow:inset 0 0 0 2px #2e2840, 0 0 0 3px #3a3350"></div>
  </body></html>`;
}

/** Edith's lower third, over her full-frame video. */
function guideLower(sec) {
  return `<html><head><style>${BASE_CSS}</style></head><body style="background:transparent">
  <div class="pixel" style="position:absolute;left:48px;top:40px;padding:8px 18px;background:#1e1a2bd9;color:${C.paper};font-size:34px;letter-spacing:.06em">AI reconstruction · made with fal</div>
  <div style="position:absolute;left:0;right:0;bottom:0;height:300px;background:linear-gradient(0deg,#000c,transparent)"></div>
  <div style="position:absolute;left:72px;bottom:70px">
    <div class="pixel" style="font-size:40px;letter-spacing:.12em;color:${C.gold};text-shadow:3px 3px 0 #000">${sec.kicker}</div>
    <div class="pixel" style="font-size:96px;line-height:1;color:${C.paper};text-shadow:5px 5px 0 ${C.brick}, 9px 9px 0 #000">Edith Marlow</div>
    <div class="body" style="margin-top:8px;font-size:32px;color:${C.paper}">Garden attendant · Royal Albert Hall, 1871 · video and voice generated with fal</div>
  </div>
  </body></html>`;
}

/** The end card: title, line, fal, the team, and a strip of ground for the duck that walks across it. */
function endCard() {
  const team = ['Ishan', 'Alex', 'Fernando', 'Azlan'];
  return `<html><head><style>${BASE_CSS}</style></head><body style="${SKY}">
  <div style="position:absolute;left:0;right:0;top:110px;text-align:center">
    <div class="pixel" style="font-size:44px;letter-spacing:.24em;color:${C.gold};text-shadow:3px 3px 0 #000">WELCOME, TIME TRAVELLER</div>
    <div class="pixel" style="font-size:230px;line-height:1;color:${C.paper};text-shadow:8px 8px 0 ${C.brick}, 16px 16px 0 #000">CHRONODEX</div>
    <div class="body" style="margin-top:18px;font-size:44px;color:${C.paper}">Collect the city. Then step into its past.</div>
    <div class="pixel" style="margin-top:58px;font-size:44px;letter-spacing:.1em;color:${C.gold};text-shadow:3px 3px 0 #000">ALL IMAGE AND AUDIO GENERATION BY FAL</div>
    <div class="pixel" style="margin-top:44px;font-size:36px;letter-spacing:.2em;color:${C.soft}">MADE BY</div>
    <div class="pixel" style="margin-top:6px;font-size:72px;letter-spacing:.06em;color:${C.paper};text-shadow:4px 4px 0 #000">${team.join('  ·  ')}</div>
  </div>
  <div style="position:absolute;left:0;right:0;top:1030px;height:6px;background:${C.verdigris};box-shadow:0 6px 0 #2f6b5c"></div>
  </body></html>`;
}

const s = await launch({ port: 9342 });
try {
  await s.send('Emulation.setDeviceMetricsOverride', { width: SIZE.w, height: SIZE.h, deviceScaleFactor: 1, mobile: false });
  await s.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  const render = async (name, html, transparent = false) => {
    const file = path.join(OUT, `${name}.html`);
    writeFileSync(file, html);
    await s.send('Emulation.setDefaultBackgroundColorOverride', transparent ? { color: { r: 0, g: 0, b: 0, a: 0 } } : {});
    await s.send('Page.navigate', { url: pathToFileURL(file).href });
    await sleep(700);
    await s.evaluate('document.fonts.ready.then(() => true)');
    const r = await s.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(r.data, 'base64'));
    console.log('card', name);
  };
  for (const sec of phoneSections) await render(`${sec.id}-bg`, sectionBg(sec));
  await render('bezel', bezel(), true);
  await render('guide-lower', guideLower(SECTIONS.find((x) => x.id === 'guide')), true);
  await render('close', endCard());
} finally { s.close(); }
