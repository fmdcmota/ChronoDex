/**
 * Render the still layers of demo video 2 (SCRIPT-2.md) with Chrome, in the same style as the first video
 * (cards.mjs): the problem card, the side-by-side backgrounds and their frame, Edith's lower third, the chat
 * background, and the pipeline card in stages (one PNG per tool lit). The end card is the first video's
 * cards/close.png, unchanged. Owner: Agent 2. Spike.
 * Usage: node spikes/agent-2/demo-video/cards2.mjs   Output: cards2/*.png
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { HERE, launch, sleep } from './cdp.mjs';
import { PHONE_SLOT, SIZE } from './timeline.mjs';
import { PIPELINE, SBS, SBS_PHASES } from './timeline2.mjs';

const FONT = pathToFileURL(path.join(HERE, '../../../node_modules/@fontsource/jersey-10/files/jersey-10-latin-400-normal.woff2')).href;
const DEMO = (f) => pathToFileURL(path.join(HERE, '../../../public/demo', f)).href;
const OUT = path.join(HERE, 'cards2');
mkdirSync(OUT, { recursive: true });

const C = { ink: '#1e1a2b', night: '#14111d', paper: '#f6efd9', gold: '#f2b43c', brick: '#c8553d', soft: '#cfc7e6', verdigris: '#4fa58f' };
const BASE_CSS = `
@font-face { font-family: 'Jersey 10'; src: url('${FONT}') format('woff2'); }
* { margin: 0; box-sizing: border-box; }
html, body { width: ${SIZE.w}px; height: ${SIZE.h}px; overflow: hidden; }
.pixel { font-family: 'Jersey 10', monospace; }
.body { font-family: 'Segoe UI', system-ui, sans-serif; }`;
/** The first video's starry night background. */
const SKY = `background:
  radial-gradient(2px 2px at 8% 14%, #fff9 98%, transparent), radial-gradient(1.5px 1.5px at 31% 82%, #fff7 98%, transparent),
  radial-gradient(2px 2px at 47% 8%, #fff8 98%, transparent), radial-gradient(1.5px 1.5px at 66% 91%, #fff6 98%, transparent),
  radial-gradient(2px 2px at 83% 21%, #fff8 98%, transparent), radial-gradient(1.5px 1.5px at 94% 63%, #fff6 98%, transparent),
  radial-gradient(1.5px 1.5px at 57% 47%, #fff5 98%, transparent), radial-gradient(2px 2px at 76% 74%, #fff6 98%, transparent),
  radial-gradient(ellipse at 22% 50%, #3b3270 0%, transparent 55%), radial-gradient(ellipse at 85% 110%, #4a3f8a99 0%, transparent 60%),
  linear-gradient(160deg, ${C.night} 0%, ${C.ink} 60%, #241f3a 100%);`;
const PARTS = ['problem', 'run', 'built', 'new'];
const steps = (active) => PARTS.map((p) => `<span style="display:inline-block;width:${p === active ? 46 : 14}px;height:14px;margin-right:10px;background:${p === active ? C.gold : '#ffffff33'}"></span>`).join('');
const kicker = (t, size = 46) => `<div class="pixel" style="font-size:${size}px;letter-spacing:.12em;color:${C.gold};text-shadow:3px 3px 0 #000">${t}</div>`;
const headline = (t, size = 98) => `<div class="pixel" style="margin-top:18px;font-size:${size}px;line-height:.95;color:${C.paper};text-shadow:5px 5px 0 ${C.brick}, 10px 10px 0 #000">${t}</div>`;
const sub = (t, w = 860) => `<div class="body" style="margin-top:36px;font-size:34px;line-height:1.35;color:${C.soft};max-width:${w}px">${t}</div>`;
const page = (body, style = SKY) => `<html><head><style>${BASE_CSS}</style></head><body style="${style}">${body}</body></html>`;

/** Part 1: today's Royal Albert Hall, ordinary, with the problem on the left. */
function problem() {
  return page(`
  <div style="position:absolute;inset:0;background:url('${DEMO('reference/royal-albert-hall.jpg')}') center/cover;filter:saturate(.85)"></div>
  <div style="position:absolute;inset:0;background:linear-gradient(90deg,#14111df5 0%,#14111de0 42%,#14111d55 70%,transparent 100%)"></div>
  <div class="pixel" style="position:absolute;left:110px;top:92px;font-size:40px;letter-spacing:.14em;color:${C.gold};text-shadow:3px 3px 0 #000">CHRONODEX</div>
  <div style="position:absolute;left:110px;top:300px;width:900px">
    ${kicker('01 · THE PROBLEM')}${headline('History you walk straight past', 108)}
    ${sub('A plaque gives you a date, not a feeling. Chronodex is for visitors, students and anyone exploring a city on foot.', 800)}
  </div>
  <div class="pixel" style="position:absolute;right:150px;bottom:190px;padding:10px 22px;background:#b9a27a;border:4px solid #6e5a38;color:#3b2e18;font-size:40px;letter-spacing:.08em;box-shadow:6px 6px 0 #0008">ROYAL ALBERT HALL · 1871</div>
  <div style="position:absolute;left:110px;bottom:96px">${steps('problem')}</div>`, 'background:#000');
}

/** Part 2 background: two video slots (street, phone) and the text panel on the right. */
function sbsBg(phase) {
  const label = (r, t) => `<div class="pixel" style="position:absolute;left:${r.x}px;top:${r.y - 52}px;width:${r.w}px;text-align:center;font-size:36px;letter-spacing:.16em;color:${C.gold};text-shadow:3px 3px 0 #000">${t}</div>`;
  const glow = (r) => `<div style="position:absolute;left:${r.x - 24}px;top:${r.y - 24}px;width:${r.w + 48}px;height:${r.h + 48}px;border-radius:50px;box-shadow:0 0 70px 8px #f2b43c22, 0 30px 60px #0008"></div>`;
  return page(`
  ${glow(SBS.street)}${glow(SBS.phone)}${label(SBS.street, 'IN THE STREET')}${label(SBS.phone, 'ON THE PHONE')}
  <div class="pixel" style="position:absolute;left:${SBS.panelX}px;top:92px;font-size:40px;letter-spacing:.14em;color:${C.gold};text-shadow:3px 3px 0 #000">CHRONODEX</div>
  <div style="position:absolute;left:${SBS.panelX}px;right:80px;top:300px">
    ${kicker(phase.kicker, 40)}${headline(phase.headline, 80)}${sub(phase.sub, 680)}
  </div>
  <div style="position:absolute;left:${SBS.panelX}px;bottom:96px">${steps('run')}</div>`);
}

/** The frame over both videos: a dark border whose rounded inner edge covers the square corners. */
function sbsFrame() {
  const t = 14;
  const box = (r, rad) => `<div style="position:absolute;left:${r.x - t}px;top:${r.y - t}px;width:${r.w + 2 * t}px;height:${r.h + 2 * t}px;border:${t}px solid #0b0912;border-radius:${rad + t}px;box-shadow:inset 0 0 0 2px #2e2840, 0 0 0 3px #3a3350"></div>`;
  return page(`${box(SBS.street, 26)}${box(SBS.phone, 34)}`, 'background:transparent');
}

/** Edith's lower third over her full-frame video. */
function guideLower() {
  return page(`
  <div class="pixel" style="position:absolute;left:48px;top:40px;padding:8px 18px;background:#1e1a2bd9;color:${C.paper};font-size:34px;letter-spacing:.06em">AI reconstruction · made with fal</div>
  <div style="position:absolute;left:0;right:0;bottom:0;height:300px;background:linear-gradient(0deg,#000c,transparent)"></div>
  <div style="position:absolute;left:72px;bottom:70px">
    ${kicker('02 · MEET THE GUIDE', 40)}
    <div class="pixel" style="font-size:96px;line-height:1;color:${C.paper};text-shadow:5px 5px 0 ${C.brick}, 9px 9px 0 #000">Edith Marlow</div>
    <div class="body" style="margin-top:8px;font-size:32px;color:${C.paper}">Garden attendant · Royal Albert Hall, 1871 · video and voice generated with fal</div>
  </div>`, 'background:transparent');
}

/** The chat section: the first video's phone layout. */
function chatBg() {
  return page(`
  <div style="position:absolute;left:${PHONE_SLOT.x - 30}px;top:${PHONE_SLOT.y - 30}px;width:${PHONE_SLOT.w + 60}px;height:${PHONE_SLOT.h + 60}px;border-radius:70px;box-shadow:0 0 80px 10px #f2b43c22, 0 30px 60px #0008;"></div>
  <div class="pixel" style="position:absolute;left:870px;top:92px;font-size:40px;letter-spacing:.14em;color:${C.gold};text-shadow:3px 3px 0 #000">CHRONODEX</div>
  <div style="position:absolute;left:870px;right:110px;top:300px">
    ${kicker('02 · ONE REAL RUN')}${headline('Text her, or talk to her')}${sub('She answers from her era\'s sources, in her own voice.')}
  </div>
  <div style="position:absolute;left:870px;bottom:96px">${steps('run')}</div>`);
}

/**
 * Part 3: the pipeline, with the first `lit` tools lit (the rest dim), each above the real Royal Albert Hall
 * 1871 output it made.
 */
function pipeline(lit) {
  const on = (i) => i < lit;
  const box = (n, i) => {
    const p = PIPELINE.boxes[i];
    const thumb = p.img
      ? `<div style="height:170px;background:url('${DEMO(`royal-albert-hall_1871/${p.img}`)}') center/cover;border-bottom:3px solid #0b0912"></div>`
      : `<div class="body" style="height:170px;padding:16px 18px;background:${C.paper};color:${C.ink};font-size:20px;line-height:1.35;border-bottom:3px solid #0b0912">${p.doc}</div>`;
    return `<div style="position:absolute;left:${110 + i * 345}px;top:400px;width:300px;opacity:${on(i) ? 1 : 0.28};transition:none">
      <div style="border:4px solid ${on(i) ? C.gold : '#5a5170'};background:#1e1a2b;box-shadow:${on(i) ? '0 0 40px #f2b43c55,' : ''} 8px 8px 0 #000">
        ${thumb}
        <div style="padding:14px 18px">
          <div class="pixel" style="font-size:36px;color:${C.gold};letter-spacing:.06em">${p.tool}</div>
          <div class="body" style="font-size:24px;color:${C.paper};margin-top:4px">${p.what}</div>
        </div>
      </div>
      ${i < PIPELINE.boxes.length - 1 ? `<div class="pixel" style="position:absolute;right:-42px;top:120px;font-size:52px;color:${on(i + 1) ? C.gold : '#5a5170'}">▸</div>` : ''}
    </div>`;
  };
  const claudeOn = lit > PIPELINE.boxes.length;
  const mongoOn = lit > PIPELINE.boxes.length + 1;
  return page(`
  <div class="pixel" style="position:absolute;left:110px;top:92px;font-size:40px;letter-spacing:.14em;color:${C.gold};text-shadow:3px 3px 0 #000">CHRONODEX</div>
  <div style="position:absolute;left:110px;top:170px">${kicker('03 · HOW IT\'S BUILT')}${headline('One pipeline per era', 92)}</div>
  ${PIPELINE.boxes.map(box).join('')}
  <div style="position:absolute;left:455px;top:770px;width:645px;padding:14px 22px;border:4px solid ${claudeOn ? C.verdigris : '#3d4a48'};background:#1e1a2b;opacity:${claudeOn ? 1 : 0.28};box-shadow:8px 8px 0 #000">
    <span class="pixel" style="font-size:36px;color:${C.verdigris}">CLAUDE ✓</span>
    <span class="body" style="font-size:24px;color:${C.paper};margin-left:14px">checks every picture before it is kept</span>
  </div>
  <div style="position:absolute;left:110px;right:110px;top:885px;padding:14px 22px;border:4px solid ${mongoOn ? C.verdigris : '#3d4a48'};background:#1e1a2b;opacity:${mongoOn ? 1 : 0.28};box-shadow:8px 8px 0 #000">
    <span class="pixel" style="font-size:36px;color:${C.verdigris}">MONGODB ATLAS</span>
    <span class="body" style="font-size:24px;color:${C.paper};margin-left:14px">stores it all: each era is made once and shared by every player</span>
  </div>
  <div style="position:absolute;right:110px;top:110px">${steps('built')}</div>`);
}

const s = await launch({ port: 9343 });
try {
  await s.send('Emulation.setDeviceMetricsOverride', { width: SIZE.w, height: SIZE.h, deviceScaleFactor: 1, mobile: false });
  await s.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  const render = async (name, html, transparent = false) => {
    const file = path.join(OUT, `${name}.html`);
    writeFileSync(file, html);
    await s.send('Emulation.setDefaultBackgroundColorOverride', transparent ? { color: { r: 0, g: 0, b: 0, a: 0 } } : {});
    await s.send('Page.navigate', { url: pathToFileURL(file).href });
    await sleep(700);
    await s.evaluate('Promise.all([document.fonts.ready, ...[...document.images].map((i) => i.decode().catch(() => 0))]).then(() => true)');
    await sleep(300);
    const r = await s.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(r.data, 'base64'));
    console.log('card', name);
  };
  await render('problem', problem());
  for (const [i, ph] of SBS_PHASES.entries()) await render(`sbs-bg-${i}`, sbsBg(ph));
  await render('sbs-frame', sbsFrame(), true);
  await render('guide-lower', guideLower(), true);
  await render('chat-bg', chatBg());
  for (let lit = 0; lit <= PIPELINE.boxes.length + 2; lit++) await render(`pipeline-${lit}`, pipeline(lit));
} finally { s.close(); }
