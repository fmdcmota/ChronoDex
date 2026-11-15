/**
 * Browser test for POST /api/voice/stt with a REAL microphone recording. Owner: Agent 2 (Studio). A2-11.
 *
 * Why: the route renames WebM (Chrome) and MP4 (Safari) uploads so fal accepts them, but only an MP3
 * has been proven. This serves a tiny page that records with MediaRecorder exactly as the app will,
 * posts it to the running app and prints the transcript and the format the browser produced.
 *
 * Usage (two terminals, from the repo root):
 *   1. npm run dev                                 # the app, normally on port 3000, with FAL_KEY set
 *   2. node spikes/agent-2/voice-test.mjs          # this page on http://localhost:4000
 * Open http://localhost:4000 in Chrome (localhost counts as a secure context, so the microphone works),
 * press Record, say a sentence, press Stop. Repeat in Safari on a Mac for MP4. A phone needs HTTPS, so
 * test phones through the deployed app instead.
 * Environment: APP_URL picks the app (default: https://localhost:3000, then http://localhost:3000, whichever
 * answers; `next dev --experimental-https` serves HTTPS with a self-signed certificate, which is accepted here
 * because it only ever talks to this machine). PORT overrides 4000.
 * For a real transcript the app must run with NEXT_PUBLIC_USE_MOCKS empty; with mocks on the answer is
 * "[mock transcript] ...".
 */
import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

const CANDIDATES = process.env.APP_URL ? [process.env.APP_URL] : ['https://localhost:3000', 'http://localhost:3000'];
const PORT = Number(process.env.PORT ?? 4000);

/**
 * POST a body to the app and return its status and text. Accepts the local self-signed certificate.
 *
 * @param base - App origin, http or https.
 * @param path - Path, for example /api/voice/stt.
 * @param headers - Headers to send.
 * @param body - The body.
 * @returns Status code and response text.
 */
function post(base, path, headers, body) {
  const url = new URL(path, base);
  const send = url.protocol === 'https:' ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const req = send(url, { method: 'POST', headers: { ...headers, 'content-length': body.length }, rejectUnauthorized: false }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode ?? 502, text: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.end(body);
  });
}

/** Send to the first app origin that answers. */
async function forward(path, headers, body) {
  let last;
  for (const base of CANDIDATES) {
    try {
      return { ...(await post(base, path, headers, body)), base };
    } catch (error) {
      last = error;
    }
  }
  throw new Error(`no app answered at ${CANDIDATES.join(' or ')}: ${last?.code ?? last?.message ?? last}. Is npm run dev running?`);
}

const PAGE = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>A2-11 voice test</title>
<style>body{font:16px system-ui;margin:2rem;max-width:40rem}button{font-size:1.2rem;padding:.6rem 1.2rem;margin-right:.5rem}pre{background:#eee;padding:1rem;white-space:pre-wrap}</style>
<h1>Voice in test</h1>
<p>Press Record, say a sentence, press Stop.</p>
<button id="rec">Record</button><button id="stop" disabled>Stop</button>
<pre id="out">Ready.</pre>
<script>
const out = document.getElementById('out'), rec = document.getElementById('rec'), stop = document.getElementById('stop');
let recorder, chunks = [];
rec.onclick = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  recorder = new MediaRecorder(stream);
  chunks = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.onstop = async () => {
    stream.getTracks().forEach((t) => t.stop());
    const blob = new Blob(chunks, { type: recorder.mimeType });
    const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm';
    out.textContent = 'Recorded ' + blob.size + ' bytes as ' + blob.type + '. Sending...';
    const form = new FormData();
    form.append('file', blob, 'speech.' + ext);
    const started = performance.now();
    const res = await fetch('/api/voice/stt', { method: 'POST', body: form });
    out.textContent += '\\nHTTP ' + res.status + ' in ' + Math.round(performance.now() - started) + ' ms\\n' + (await res.text());
  };
  recorder.start();
  rec.disabled = true; stop.disabled = false; out.textContent = 'Recording (' + recorder.mimeType + ')...';
};
stop.onclick = () => { recorder.stop(); rec.disabled = false; stop.disabled = true; };
</script>`;

createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(PAGE);
    return;
  }
  if (req.method === 'POST' && req.url === '/api/voice/stt') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    try {
      const upstream = await forward('/api/voice/stt', { 'content-type': req.headers['content-type'] ?? '' }, Buffer.concat(chunks));
      console.log(`forwarded to ${upstream.base}: HTTP ${upstream.status}`);
      res.writeHead(upstream.status, { 'Content-Type': 'application/json' }).end(upstream.text);
    } catch (error) {
      // Report it on the page instead of crashing the test server.
      console.error(error.message);
      res.writeHead(502, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: { code: 'app_unreachable', message: error.message } }));
    }
    return;
  }
  res.writeHead(404).end('Not found');
}).listen(PORT, () => console.log(`Voice test page: http://localhost:${PORT}  (forwarding to ${CANDIDATES.join(' or ')})`));
