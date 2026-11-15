/**
 * The demo video's scenes, recorded from the running app (SCRIPT.md). Owner: Agent 2. Spike.
 * Usage (repo root, dev server on https://localhost:3000): node spikes/agent-2/demo-video/scenes.mjs <scene> [...]
 * Scenes: welcome, map, capture, memory, time, guide, chat. Frames go to spikes/agent-2/demo-video/frames/<scene>/.
 */
import path from 'node:path';
import { HERE, launch, sleep } from './cdp.mjs';

/** Where things are (data/demo/landmarks.json). */
const SPOT = {
  exhibitionRoad: { lat: 51.4979, lng: -0.1745 },
  rahRingEdge: { lat: 51.49955, lng: -0.17725 },
  rah: { lat: 51.50003, lng: -0.17742 },
};

/**
 * Wait until the map has no tiles left to load (then a moment more), or `ms` at the most. Without a map, just wait.
 */
async function settle(s, ms) {
  const end = Date.now() + ms;
  await sleep(600);
  while (Date.now() < end) {
    const done = await s.evaluate(`!window.__chronodexMap || window.__chronodexMap.areTilesLoaded()`).catch(() => true);
    if (done) break;
    await sleep(200);
  }
  await sleep(Math.min(1200, Math.max(0, end - Date.now())));
}

/** Clear what a previous run left in the browser, so every scene starts like a first visit. */
async function fresh(s, pathName) {
  await s.goto('/?intro=0');
  await s.evaluate('localStorage.clear(); sessionStorage.clear(); true');
  await s.goto(pathName);
}

const SCENES = {
  /** 0:00 Welcome: the intro, the tap, the fall through the clouds. */
  async welcome() {
    const s = await launch();
    try {
      await s.gps(SPOT.exhibitionRoad.lat, SPOT.exhibitionRoad.lng);
      // Warm the tile cache: the landing street, the zooms on the way down, and the globe.
      await fresh(s, '/?intro=0');
      await s.waitFor(`window.__chronodexMap && window.__chronodexMap.isStyleLoaded() && document.querySelector('.player')`);
      await settle(s, 4000);
      for (const zoom of [14, 11, 8, 5, 1.6]) {
        await s.evaluate(`window.__chronodexMap.jumpTo({ zoom: ${zoom} }), true`);
        await settle(s, 1500);
      }
      await s.goto('/?intro=1');
      await s.waitFor(`document.querySelector('.ci-enter') && window.__chronodexMap && window.__chronodexMap.isStyleLoaded()`);
      await settle(s, 5000);
      await s.start('welcome');
      await sleep(2600);
      s.mark('tap');
      await s.tap('.ci-enter');
      await sleep(7000);
      await s.stop();
    } finally { s.close(); }
  },

  /** 0:09 The map: glide over the landmarks, out to the globe, visit the three ducks, back to the city. */
  async map() {
    const s = await launch();
    try {
      await s.gps(SPOT.exhibitionRoad.lat, SPOT.exhibitionRoad.lng);
      await fresh(s, '/?intro=0');
      await s.waitFor(`window.__chronodexMap && window.__chronodexMap.isStyleLoaded() && document.querySelector('.player')`);
      await settle(s, 4000);
      const ease = (opts) => s.evaluate(`window.__chronodexMap.easeTo(${JSON.stringify(opts)}), true`);
      const fly = (opts) => s.evaluate(`window.__chronodexMap.flyTo(${JSON.stringify(opts)}), true`);
      const startCamera = await s.evaluate(`(() => { const m = window.__chronodexMap, c = m.getCenter(); return { center: [c.lng, c.lat], zoom: m.getZoom() }; })()`);
      // Rehearsal: every place the camera will go, so its tiles are cached before the take.
      // The World button zooms out over London through every level, and City comes back the same way.
      const london = [-0.1759, 51.4986];
      const outward = [15.35, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2.4, 1.6].map((zoom) => [london, zoom]);
      for (const [centre, zoom] of [...outward, [[0, 30], 1.6], [[-38, 45.5], 2.8], [[-38, 45.5], 3.4], [[7, 25], 3.0], [[7, 25], 3.6], [[109, 39], 3.2], [[109, 39], 3.8]]) {
        await s.evaluate(`window.__chronodexMap.jumpTo(${JSON.stringify({ center: centre, zoom })}), true`);
        await settle(s, 1800);
      }
      await s.evaluate(`window.__chronodexMap.jumpTo(${JSON.stringify(startCamera)}), true`);
      await settle(s, 3500);
      await s.start('map');
      await sleep(1200);
      s.mark('glide');
      await ease({ center: [-0.1759, 51.4986], zoom: 15.35, duration: 3800 });
      await sleep(4300);
      s.mark('world');
      // Camera moves are stepped (cdp.mjs): every frame is taken with its tiles drawn, so nothing pops in.
      const cam = () => s.evaluate(`(() => { const m = window.__chronodexMap, c = m.getCenter(); return { lng: c.lng, lat: c.lat, zoom: m.getZoom() }; })()`);
      const put = (lng, lat, zoom) => s.evaluate(`window.__chronodexMap.jumpTo({ center: [${lng}, ${lat}], zoom: ${zoom} }), true`);
      const smooth = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
      const lerp = (a, b, k) => a + (b - a) * k;
      /** A flight: the centre glides across while the zoom dips out by `dip` in the middle, like flyTo. */
      const flight = async (to, durationS, dip = 0) => {
        const from = await cam();
        await s.stepped(async (k) => {
          const e = smooth(k);
          await put(lerp(from.lng, to.lng, e), lerp(from.lat, to.lat, e), lerp(from.zoom, to.zoom, e) - dip * Math.sin(Math.PI * k));
        }, durationS);
      };
      const here = await cam();
      await flight({ lng: here.lng, lat: here.lat, zoom: 1.6 }, 2.0);
      await sleep(900);
      // Fly over each duck's route first (from the far side of the globe a duck's screen position means nothing),
      // then find the duck and settle on it, close enough to see it walk or sail.
      const routes = [
        ['duck-atlantic', [-38, 45.5], 3.4],
        ['duck-sahara', [7, 25], 3.6],
        ['duck-greatwall', [109, 39], 3.8],
      ];
      for (const [label, centre, zoom] of routes) {
        s.mark(label);
        await flight({ lng: centre[0], lat: centre[1], zoom: zoom - 0.6 }, 1.7, 0.5);
        // The duck nearest this route on screen (the markers' order does not follow the routes); null if none is near.
        const at = await s.evaluate(`(() => {
          const m = window.__chronodexMap, c = m.getCanvas().getBoundingClientRect();
          let best = null;
          for (const el of document.querySelectorAll('.emma-voyage')) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.right < c.left || r.left > c.right || r.bottom < c.top || r.top > c.bottom) continue;
            const p = m.unproject([r.x + r.width / 2 - c.x, r.y + r.height / 2 - c.y]);
            const d = Math.hypot(p.lng - ${JSON.stringify(centre)}[0], p.lat - ${JSON.stringify(centre)}[1]);
            if (d < 25 && (!best || d < best.d)) best = { d, at: [p.lng, p.lat] };
          }
          return best && best.at;
        })()`);
        console.log(label, at);
        if (at) await flight({ lng: at[0], lat: at[1], zoom }, 1.0);
        await sleep(1600);
      }
      s.mark('city');
      // Home to London: across the globe, then down into South Kensington.
      const far = await cam();
      await s.stepped(async (k) => {
        const e = smooth(k);
        const across = smooth(Math.min(1, k / 0.6));
        const zoom = k < 0.5 ? lerp(far.zoom, 1.8, smooth(k / 0.5)) : lerp(1.8, 15.2, smooth((k - 0.5) / 0.5));
        await put(lerp(far.lng, -0.1759, across), lerp(far.lat, 51.4986, across), zoom);
        void e;
      }, 2.8);
      await sleep(1500);
      await s.stop();
    } finally { s.close(); }
  },

  /**
   * 0:28 Collect, then 0:44 Memory box, in one browser so the photo just taken is in the box.
   * The player walks into the Royal Albert Hall ring, captures it (the fake camera shows the reference photo), the
   * coin twirls; then the Dex, and the memory box opened.
   */
  async capture() {
    const s = await launch({ fakeCamera: path.join(HERE, 'rah-camera.mjpeg') });
    try {
      const from = { lat: 51.49880, lng: -0.17752 };
      await s.gps(from.lat, from.lng);
      await fresh(s, '/?intro=0');
      await s.waitFor(`window.__chronodexMap && window.__chronodexMap.isStyleLoaded() && document.querySelector('.player')`);
      await s.evaluate(`window.__chronodexMap.jumpTo({ center: [-0.17746, 51.49962], zoom: 16.55 }), true`);
      await settle(s, 5000);
      await s.start('capture');
      await sleep(1000);
      s.mark('walk');
      const steps = 36;
      for (let i = 1; i <= steps; i++) {
        const k = i / steps;
        await s.gps(from.lat + (SPOT.rah.lat - from.lat) * k, from.lng + (SPOT.rah.lng - from.lng) * k);
        await sleep(110);
      }
      await s.waitFor(`/Capture Royal Albert Hall/.test(document.querySelector('.capture')?.textContent ?? '') && !document.querySelector('.capture').disabled`);
      await sleep(1300);
      s.mark('tap-capture');
      await s.tap('.capture');
      await s.waitFor(`document.querySelector('[aria-label="Take the photo"]') && document.querySelector('video')?.readyState >= 2`);
      await sleep(1600);
      s.mark('shutter');
      await s.tap('[aria-label="Take the photo"]');
      await s.waitFor(`[...document.querySelectorAll('button')].some((b) => /Use this photo/.test(b.textContent))`);
      await sleep(1100);
      s.mark('use-photo');
      await s.tap('button', 'Use this photo');
      await s.waitFor(`document.querySelector('.award-twirl')`);
      s.mark('award');
      await sleep(4200);
      await s.stop();

      // Memory box: the Dex with the new badge, then the chest opened.
      await s.goto('/dex');
      await s.waitFor(`document.querySelector('[aria-label^="Memory box"]')`);
      await sleep(400);
      await s.start('memory');
      await sleep(2200);
      s.mark('open-box');
      await s.tap('[aria-label^="Memory box"]');
      await sleep(3800);
      await s.stop();
      if (s.errors.length) console.log('page errors:', s.errors.slice(0, 5));
    } finally { s.close(); }
  },

  /**
   * 0:52 Time Machine (the 360° view and Sources), then 1:16 the guide (Edith's video), in one browser.
   * The guide recording logs which clip plays and where (marks "clip <kind> <currentTime>"), so the edit can lay
   * Edith's real audio under the silent screen recording at the right moment.
   */
  async time() {
    const s = await launch();
    try {
      await s.gps(SPOT.rah.lat, SPOT.rah.lng);
      await fresh(s, '/time/royal-albert-hall');
      await s.waitFor(`[...document.querySelectorAll('button')].some((b) => /Meet Edith/.test(b.textContent)) && document.querySelector('canvas')`);
      await sleep(3500);
      const box = await s.evaluate(`(() => { const c = document.querySelector('canvas').getBoundingClientRect(); return { x: c.x, y: c.y, w: c.width, h: c.height }; })()`);
      const midY = box.y + box.h * 0.45;
      await s.start('time');
      await sleep(2000);
      s.mark('look-around');
      // Turn all the way round: drags from right to left turn the view to the right.
      for (let i = 0; i < 6; i++) {
        await s.drag(box.x + box.w * 0.85, midY, box.x + box.w * 0.15, midY, 1500);
        await sleep(250);
      }
      s.mark('tilt-up');
      await s.drag(box.x + box.w * 0.5, box.y + box.h * 0.3, box.x + box.w * 0.5, box.y + box.h * 0.75, 1400);
      await sleep(1200);
      s.mark('reset');
      await s.tap('button', '^Reset$');
      await sleep(1800);
      s.mark('sources');
      await s.tap('button', 'Sources');
      await sleep(3200);
      const close = await s.centreOf('[aria-label="Close"], button', '^(Close|×|Done)$');
      if (close) await s.tapAt(close.x, close.y); else await s.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape' });
      await sleep(1200);
      await s.stop();

      // The guide: Edith walks on, talks, walks off. Log the playing clip four times a second.
      await s.start('guide');
      await sleep(1000);
      s.mark('meet');
      await s.tap('button', 'Meet Edith');
      const end = Date.now() + 52000;
      let last = '';
      while (Date.now() < end) {
        const now = await s.evaluate(`(() => {
          const v = [...document.querySelectorAll('video')].find((x) => !x.paused && x.currentTime > 0);
          return v ? (v.currentSrc.match(/(walk_on|talk|walk_off)/)?.[1] ?? 'other') + ' ' + v.currentTime.toFixed(2) : 'none';
        })()`);
        const kind = now.split(' ')[0];
        if (kind !== last) { s.mark(`clip ${now}`); last = kind; }
        await sleep(250);
      }
      await s.stop();
      if (s.errors.length) console.log('page errors:', s.errors.slice(0, 5));
    } finally { s.close(); }
  },

  /**
   * 1:38 Chat with Edith, on the mocks-off server (DEMO_BASE=http://localhost:3100): a real streamed reply, then
   * "Play this reply aloud" (the one fal call: Eleven v4 turbo speech, a few cents). The spoken reply's URL is taken
   * from the network and saved to frames/chat/tts.json for the edit.
   */
  async chat() {
    const s = await launch();
    try {
      await s.send('Network.enable');
      const ttsRequests = new Set();
      const tts = [];
      s.on('Network.responseReceived', (p) => { if (/\/api\/voice\/tts/.test(p.response.url)) ttsRequests.add(p.requestId); });
      s.on('Network.loadingFinished', async (p) => {
        if (!ttsRequests.has(p.requestId)) return;
        const body = await s.send('Network.getResponseBody', { requestId: p.requestId }).catch(() => null);
        if (body) tts.push(JSON.parse(body.body));
      });
      await fresh(s, '/chat/royal-albert-hall_1871');
      await s.waitFor(`document.querySelector('[aria-label="Message"]') && document.body.innerText.includes('Morning to you')`);
      await sleep(2500);
      await s.start('chat');
      await sleep(1500);
      s.mark('type');
      await s.tap('[aria-label="Message"]');
      for (const ch of 'What did tickets cost?') {
        await s.send('Input.insertText', { text: ch });
        await sleep(55);
      }
      await sleep(500);
      s.mark('send');
      await s.tap('[aria-label="Send"]');
      await s.waitFor(`document.querySelector('[aria-label="The guide is typing"]')`, 10000).catch(() => undefined);
      await s.waitFor(`!document.querySelector('[aria-label="The guide is typing"]') && document.querySelectorAll('[aria-label="Play this reply aloud"]').length >= 2`, 40000);
      s.mark('reply-done');
      await sleep(1500);
      s.mark('play');
      const plays = await s.evaluate(`document.querySelectorAll('[aria-label="Play this reply aloud"]').length`);
      const last = await s.evaluate(`(() => { const b = [...document.querySelectorAll('[aria-label="Play this reply aloud"]')].at(-1); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
      await s.tapAt(last.x, last.y);
      // Her voice starts when the bubble says "playing" (the speech is made on the server first, about 1 to 2 s).
      await s.waitFor(`document.body.innerText.includes('playing')`, 15000).catch(() => undefined);
      s.mark('voice');
      await sleep(12500);
      await s.stop();
      const reply = await s.evaluate(`[...document.querySelectorAll('[aria-label="Play this reply aloud"]')].at(-1).closest('div').innerText`);
      const { writeFileSync } = await import('node:fs');
      writeFileSync(path.join(HERE, 'frames', 'chat', 'tts.json'), JSON.stringify({ plays, reply, tts }, null, 1));
      console.log('reply:', reply.slice(0, 300), '\ntts:', JSON.stringify(tts).replace(/files\/[^"]+/g, 'files/<…>'));
      if (s.errors.length) console.log('page errors:', s.errors.slice(0, 5));
    } finally { s.close(); }
  },
};

for (const name of process.argv.slice(2)) {
  if (!SCENES[name]) throw new Error(`unknown scene ${name}; known: ${Object.keys(SCENES).join(', ')}`);
  console.log(`recording ${name}`);
  await SCENES[name]();
}
console.log('frames in', path.join(HERE, 'frames'));
