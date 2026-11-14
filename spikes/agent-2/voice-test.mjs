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
 * Environment: APP_URL overrides http://localhost:3000, PORT overrides 4000.
 */
import { createServer } from 'node:http';

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';
const PORT = Number(process.env.PORT ?? 4000);

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
    const upstream = await fetch(`${APP_URL}/api/voice/stt`, {
      method: 'POST',
      headers: { 'content-type': req.headers['content-type'] ?? '' },
      body: Buffer.concat(chunks),
    });
    res.writeHead(upstream.status, { 'Content-Type': 'application/json' }).end(await upstream.text());
    return;
  }
  res.writeHead(404).end('Not found');
}).listen(PORT, () => console.log(`Voice test page: http://localhost:${PORT}  (forwarding to ${APP_URL})`));
