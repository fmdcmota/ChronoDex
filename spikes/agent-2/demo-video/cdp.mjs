/**
 * Demo video recorder: drives a headless Chrome over the DevTools protocol at phone size and records the screen as
 * timestamped frames (Page.startScreencast). Owner: Agent 2. Spike, never imported by src/.
 *
 * One scene = one recording: start(), act with the helpers, stop(). Frames land in frames/<scene>/ with index.json
 * ({file, t} in seconds from the start), which build.mjs turns into a constant-frame-rate clip.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
export const BASE = process.env.DEMO_BASE ?? 'https://localhost:3000';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Phone viewport, CSS pixels; frames are recorded at DPR 2. */
export const PHONE = { width: 390, height: 844, dpr: 2 };

/**
 * Launch Chrome and open one page.
 *
 * @param {object} [opts]
 * @param {string} [opts.fakeCamera] - An .mjpeg file the fake camera shows.
 * @param {number} [opts.port]
 * @returns The session helpers.
 */
export async function launch(opts = {}) {
  const port = opts.port ?? 9340;
  const profile = mkdtempSync(path.join(os.tmpdir(), 'demo-cdp-'));
  const args = [
    '--headless=new', `--remote-debugging-port=${port}`, '--ignore-certificate-errors', `--user-data-dir=${profile}`,
    '--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
    '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--hide-scrollbars', '--mute-audio',
    ...(opts.fakeCamera ? [`--use-file-for-fake-video-capture=${opts.fakeCamera}`] : []),
    'about:blank',
  ];
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', args, { stdio: 'ignore' });
  let targets;
  for (let i = 0; i < 80 && !targets; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { await sleep(200); }
  }
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const pending = new Map();
  const handlers = new Map();
  const errors = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method && handlers.has(m.method)) for (const h of handlers.get(m.method)) h(m.params);
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? 'exception');
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const i = ++id;
    pending.set(i, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const on = (method, fn) => { if (!handlers.has(method)) handlers.set(method, []); handlers.get(method).push(fn); };

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: PHONE.width, height: PHONE.height, deviceScaleFactor: PHONE.dpr, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  // The video shows the product, not the developer tools: hide Next.js's dev indicator and overlay, the MOCK DATA
  // tag and the spoof panel (the recorder sets the GPS itself). Only in this recording browser; the app is untouched.
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `(() => {
      const css = 'nextjs-portal, .mock-tag, .dev-panel { display: none !important; }';
      const add = () => { const s = document.createElement('style'); s.textContent = css; document.documentElement.appendChild(s); };
      if (document.documentElement) add(); else document.addEventListener('DOMContentLoaded', add);
    })();`,
  });
  const origin = new URL(BASE).origin;
  await send('Browser.grantPermissions', { origin, permissions: ['geolocation', 'videoCapture', 'audioCapture'] });

  /** Evaluate an expression in the page and return its value. */
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(`evaluate: ${r.exceptionDetails.exception?.description ?? expression}`);
    return r.result.value;
  };

  /** Wait until an expression is truthy. */
  const waitFor = async (expression, timeoutMs = 20000) => {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      if (await evaluate(`!!(${expression})`).catch(() => false)) return;
      await sleep(150);
    }
    throw new Error(`timed out waiting for ${expression}`);
  };

  /** Set the fake GPS. */
  const gps = (lat, lng, accuracy = 8) => send('Emulation.setGeolocationOverride', { latitude: lat, longitude: lng, accuracy });

  const goto = async (pathName) => {
    await send('Page.navigate', { url: BASE + pathName });
    await sleep(500);
  };

  /** Centre of the first element matching a CSS selector whose text matches `text` (optional). */
  const centreOf = (selector, text) => evaluate(`(() => {
    const els = [...document.querySelectorAll(${JSON.stringify(selector)})];
    const el = ${text ? `els.find((e) => new RegExp(${JSON.stringify(text)}, 'i').test(e.textContent || e.getAttribute('aria-label') || ''))` : 'els[0]'};
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  })()`);

  /** A real tap (touch events, so it looks and behaves like a finger). */
  const tapAt = async (x, y) => {
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await sleep(60);
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  const tap = async (selector, text) => {
    const c = await centreOf(selector, text);
    if (!c) throw new Error(`tap: nothing matches ${selector} ${text ?? ''}`);
    await tapAt(c.x, c.y);
    return c;
  };
  /** A mouse click, for elements that listen to click only. */
  const click = async (selector, text) => {
    const c = await centreOf(selector, text);
    if (!c) throw new Error(`click: nothing matches ${selector} ${text ?? ''}`);
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await send('Input.dispatchMouseEvent', { type, x: c.x, y: c.y, button: 'left', clickCount: 1 });
    }
    return c;
  };
  /** A smooth one-finger drag with the mouse, over `ms`. */
  const drag = async (x1, y1, x2, y2, ms = 1200) => {
    const steps = Math.max(8, Math.round(ms / 16));
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x1, y: y1 });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x1, y: y1, button: 'left', clickCount: 1 });
    for (let i = 1; i <= steps; i++) {
      const k = i / steps;
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x1 + (x2 - x1) * e, y: y1 + (y2 - y1) * e, button: 'left', buttons: 1 });
      await sleep(ms / steps);
    }
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x2, y: y2, button: 'left', clickCount: 1 });
  };

  /** Recording state. */
  let rec = null;
  on('Page.screencastFrame', (p) => {
    send('Page.screencastFrameAck', { sessionId: p.sessionId }).catch(() => undefined);
    if (!rec) return;
    const t = p.metadata.timestamp - rec.t0;
    if (t < 0) return;
    const file = `f${String(rec.frames.length).padStart(5, '0')}.jpg`;
    writeFileSync(path.join(rec.dir, file), Buffer.from(p.data, 'base64'));
    rec.frames.push({ file, t });
  });
  /** Marks a moment in the recording (seconds), for the edit. */
  const mark = (label) => { if (rec) rec.marks.push({ label, t: Date.now() / 1000 - rec.t0 }); };

  const start = async (scene) => {
    const dir = path.join(HERE, 'frames', scene);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    rec = { scene, dir, frames: [], marks: [], t0: Date.now() / 1000 };
    await send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: PHONE.width * PHONE.dpr, maxHeight: PHONE.height * PHONE.dpr, everyNthFrame: 1 });
  };
  const stop = async () => {
    await send('Page.stopScreencast');
    await sleep(200);
    const r = rec;
    rec = null;
    const duration = Date.now() / 1000 - r.t0;
    writeFileSync(path.join(r.dir, 'index.json'), JSON.stringify({ scene: r.scene, duration, frames: r.frames, marks: r.marks }, null, 1));
    const fps = r.frames.length / duration;
    console.log(`[${r.scene}] ${r.frames.length} frames in ${duration.toFixed(1)} s (${fps.toFixed(1)} fps)`);
    return r;
  };

  const close = () => { try { ws.close(); } catch { /* closed */ } chrome.kill(); };
  return { send, on, evaluate, waitFor, gps, goto, centreOf, tap, tapAt, click, drag, start, stop, mark, close, errors };
}
