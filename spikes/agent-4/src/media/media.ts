/**
 * Media spike page (media.html): back-to-back guide clips, hold-to-talk, delayed reply playback.
 *
 * Owner: Agent 4. Spikes for A4-04 (guide player) and A4-08 (voice in and out), MASTER.md section 11.
 * Everything needing a phone is listed in PHONE_TEST.md, Test 2.
 *
 * Real clips from Agent 2 can replace the test clips: `media.html?clips=<url1>,<url2>,<url3>`.
 */
import '../style.css';
import { SegmentPlayer, type PlayableSegment } from './segmentPlayer';
import { recordTestClip, type TestClipSpec } from './testClips';
import { HoldToTalkRecorder, extensionFor, pickAudioType } from './recorder';
import { sineWav } from './tone';

/** Same order and kinds as the contract's SegmentKind. Lengths are short to keep the test quick. */
const TEST_CLIPS: TestClipSpec[] = [
  { kind: 'walk_on', colour: '#2a6fdb', toneHz: 330, durationMs: 3000 },
  { kind: 'talk', colour: '#1f9d55', toneHz: 440, durationMs: 4000 },
  { kind: 'walk_off', colour: '#c0392b', toneHz: 550, durationMs: 3000 },
];
/** Stand-in for a server round trip before a TTS reply comes back. */
const FAKE_REPLY_DELAY_MS = 3000;
/** Gap between the two beeps in test 2C. */
const SECOND_BEEP_DELAY_MS = 1500;

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const logEl = $<HTMLPreElement>('log');

/** Prepend a timestamped line to the on-screen log. */
function log(msg: string): void {
  logEl.textContent = `${new Date().toLocaleTimeString()} ${msg}\n${logEl.textContent ?? ''}`.slice(0, 4000);
}

log(`userAgent: ${navigator.userAgent}`);
log(`secure context: ${window.isSecureContext}, MediaRecorder: ${typeof MediaRecorder !== 'undefined'}, audio type: ${pickAudioType() || '(browser default)'}`);

// ---------- 2A. Clips back to back ----------

const makeBtn = $<HTMLButtonElement>('make');
const playBtn = $<HTMLButtonElement>('play');
const stage = $<HTMLDivElement>('stage');
let player: SegmentPlayer | null = null;

/** Build a player for the given clips and enable Play. */
function usePlayer(segments: PlayableSegment[]): void {
  player?.destroy();
  player = new SegmentPlayer(stage, segments, {
    onSegmentStart: (i, kind, gapMs) => log(`clip ${i} ${kind} playing${gapMs === null ? '' : `, gap ${gapMs.toFixed(0)} ms`}`),
    onFinished: () => { log('all clips finished'); playBtn.textContent = 'Play'; },
    onError: (i, kind, message) => log(`clip ${i} ${kind} error: ${message}`),
  });
  playBtn.disabled = false;
}

const urlClips = new URLSearchParams(location.search).get('clips');
if (urlClips) {
  const kinds = ['walk_on', 'talk', 'walk_off'];
  usePlayer(urlClips.split(',').map((url, i) => ({ url, kind: kinds[i] ?? `clip${i}` })));
  makeBtn.hidden = true;
  log('using clips from ?clips=');
}

makeBtn.addEventListener('click', async () => {
  makeBtn.disabled = true;
  makeBtn.textContent = 'Recording clips…';
  try {
    // Created inside the tap so iOS lets it run.
    const audio = new AudioContext();
    const made: PlayableSegment[] = [];
    for (const spec of TEST_CLIPS) {
      const clip = await recordTestClip(spec, audio);
      log(`made ${spec.kind}: ${clip.type}`);
      made.push({ url: clip.url, kind: spec.kind });
    }
    await audio.close();
    usePlayer(made);
    makeBtn.textContent = 'Make test clips again';
  } catch (err) {
    log(`could not make clips: ${String(err)}`);
    makeBtn.textContent = 'Make test clips';
  } finally {
    makeBtn.disabled = false;
  }
});

playBtn.addEventListener('click', () => {
  if (!player) return;
  if (playBtn.textContent === 'Pause') {
    player.pause();
    playBtn.textContent = 'Play';
    return;
  }
  player.play().then(() => { playBtn.textContent = 'Pause'; }).catch((err: unknown) => log(`play refused: ${String(err)}`));
});

// ---------- 2B. Hold to talk ----------

const talkBtn = $<HTMLButtonElement>('talk');
const playback = $<HTMLAudioElement>('playback');
const saveLink = $<HTMLAnchorElement>('save');
const recorder = new HoldToTalkRecorder();
/** Set while the button is held, so a release during the permission prompt still stops cleanly. */
let holding = false;

talkBtn.addEventListener('pointerdown', async (e) => {
  e.preventDefault();
  // Keep receiving pointerup even if the finger slides off the button.
  talkBtn.setPointerCapture(e.pointerId);
  holding = true;
  talkBtn.classList.add('on');
  talkBtn.textContent = 'Recording… release to stop';
  try {
    await recorder.start();
    log('recording started');
    // The finger came up while the permission prompt was open.
    if (!holding) void finish();
  } catch (err) {
    holding = false;
    talkBtn.classList.remove('on');
    talkBtn.textContent = 'Hold to talk';
    log(`microphone refused: ${String(err)}`);
  }
});

/** Stop recording and show the result. */
async function finish(): Promise<void> {
  talkBtn.classList.remove('on');
  talkBtn.textContent = 'Hold to talk';
  const rec = await recorder.stop();
  if (!rec) { log('recording too short or not started, discarded'); return; }
  const url = URL.createObjectURL(rec.blob);
  playback.src = url;
  saveLink.href = url;
  saveLink.download = `recording.${extensionFor(rec.type)}`;
  saveLink.hidden = false;
  log(`recorded ${(rec.durationMs / 1000).toFixed(1)} s, ${rec.blob.size} bytes, type ${rec.type}`);
}

for (const ev of ['pointerup', 'pointercancel'] as const) {
  talkBtn.addEventListener(ev, () => {
    if (!holding) return;
    holding = false;
    void finish();
  });
}
// Long-press on iOS would otherwise open the callout menu.
talkBtn.addEventListener('contextmenu', (e) => e.preventDefault());

// ---------- 2C. Reply plays after a delay ----------

const delayedBtn = $<HTMLButtonElement>('delayed');
/** Reused element, unlocked by the tap. This is the pattern the chat screen will use. */
const replyAudio = new Audio();

delayedBtn.addEventListener('click', () => {
  // Unlock inside the gesture: play a silent clip on the element that will play the reply later.
  replyAudio.src = URL.createObjectURL(new Blob([sineWav(1, 50)], { type: 'audio/wav' }));
  void replyAudio.play().catch(() => undefined);
  log('waiting 3 s for the fake reply…');

  window.setTimeout(() => {
    // Approach 1, naive: a brand-new element, no gesture. Often blocked on iOS.
    const fresh = new Audio(URL.createObjectURL(new Blob([sineWav(440, 400)], { type: 'audio/wav' })));
    fresh.play().then(() => log('beep 1 (new element): played')).catch((err: unknown) => log(`beep 1 (new element): BLOCKED ${String(err)}`));

    window.setTimeout(() => {
      // Approach 2: the element unlocked by the tap.
      replyAudio.src = URL.createObjectURL(new Blob([sineWav(660, 400)], { type: 'audio/wav' }));
      replyAudio.play().then(() => log('beep 2 (unlocked element): played')).catch((err: unknown) => log(`beep 2 (unlocked element): BLOCKED ${String(err)}`));
    }, SECOND_BEEP_DELAY_MS);
  }, FAKE_REPLY_DELAY_MS);
});
