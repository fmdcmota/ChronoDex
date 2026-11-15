/**
 * Assemble the demo video from the recordings (frames/), the cards (cards/) and the sounds (assets/, the app's own
 * audio), following timeline.mjs. Owner: Agent 2. Spike.
 *
 * Usage: node spikes/agent-2/demo-video/build.mjs [--vo path/to/voiceover.mp3]
 * Output: out/chronodex-demo.mp4 (1920x1080, 30 fps, H.264 + AAC) and out/timeline.json (where each section and
 * sound landed). Work files go to work/. No network, no paid call.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { HERE } from './cdp.mjs';
import { BEDS, FPS, PHONE_SLOT, SECTIONS, SIZE } from './timeline.mjs';

const FFMPEG = createRequire(import.meta.url)('ffmpeg-static');
const W = (...p) => path.join(HERE, 'work', ...p);
const R = (p) => path.resolve(HERE, p);
mkdirSync(W(), { recursive: true });
mkdirSync(path.join(HERE, 'out'), { recursive: true });
const args = process.argv.slice(2);
const voIndex = args.indexOf('--vo');
const VO = voIndex >= 0 ? path.resolve(args[voIndex + 1]) : null;

const ff = (...a) => execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...a], { stdio: ['ignore', 'inherit', 'inherit'] });
const VENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS)];
const FADE_S = 0.2;

/** Load a recording's frame index. */
const recordings = new Map();
function rec(scene) {
  if (!recordings.has(scene)) recordings.set(scene, JSON.parse(readFileSync(path.join(HERE, 'frames', scene, 'index.json'), 'utf8')));
  return recordings.get(scene);
}

/**
 * Turn a slice of a recording into a phone-sized clip at a constant frame rate.
 * Frames are held for as long as the screen did not change (the screencast only sends changes).
 */
function phoneClip(part, speed, outFile, padToS) {
  const { frames } = rec(part.scene);
  const before = [...frames].reverse().find((f) => f.t <= part.from) ?? frames[0];
  const inside = frames.filter((f) => f.t > part.from && f.t < part.to);
  const list = [{ ...before, t: part.from }, ...inside];
  const dir = path.join(HERE, 'frames', part.scene).replace(/\\/g, '/');
  let txt = '';
  list.forEach((f, i) => {
    const next = i + 1 < list.length ? list[i + 1].t : part.to;
    txt += `file '${dir}/${f.file}'\nduration ${((next - f.t) / speed).toFixed(5)}\n`;
  });
  txt += `file '${dir}/${list.at(-1).file}'\n`;
  const listFile = outFile.replace(/\.mp4$/, '.txt');
  writeFileSync(listFile, txt);
  const lengthS = (part.to - part.from) / speed;
  const pad = Math.max(0, padToS - lengthS);
  ff('-f', 'concat', '-safe', '0', '-i', listFile,
    '-vf', `fps=${FPS},scale=${PHONE_SLOT.w}:${PHONE_SLOT.h}:flags=lanczos,tpad=stop_mode=clone:stop_duration=${pad.toFixed(3)},format=yuv420p`,
    '-t', padToS.toFixed(3), ...VENC, '-an', outFile);
  return lengthS;
}

/** Put a phone clip into its card: background, the recording in the slot, the bezel over it. */
function composePhone(bgPng, phoneMp4, durS, outFile, fade = { in: true, out: true }) {
  const fades = [fade.in ? `fade=t=in:st=0:d=${FADE_S}` : null, fade.out ? `fade=t=out:st=${(durS - FADE_S).toFixed(3)}:d=${FADE_S}` : null].filter(Boolean).join(',');
  ff('-loop', '1', '-framerate', String(FPS), '-i', bgPng, '-i', phoneMp4, '-loop', '1', '-framerate', String(FPS), '-i', R('cards/bezel.png'),
    '-filter_complex', `[0][1]overlay=${PHONE_SLOT.x}:${PHONE_SLOT.y}:eof_action=repeat[a];[a][2]overlay=0:0,trim=duration=${durS.toFixed(3)}${fades ? ',' + fades : ''}[v]`,
    '-map', '[v]', '-t', durS.toFixed(3), ...VENC, '-an', outFile);
}

/** A full-frame generated clip (Edith), scaled to 1080p, with the lower third over it. */
function fullFrame(clip, outFile, fade) {
  const len = clip.to - clip.from;
  const fades = [fade.in ? `fade=t=in:st=0:d=${FADE_S}` : null, fade.out ? `fade=t=out:st=${(len - FADE_S).toFixed(3)}:d=${FADE_S}` : null].filter(Boolean).join(',');
  ff('-ss', String(clip.from), '-t', len.toFixed(3), '-i', R(clip.file), '-loop', '1', '-framerate', String(FPS), '-i', R('cards/guide-lower.png'),
    '-filter_complex', `[0:v]scale=${SIZE.w}:${SIZE.h}:flags=lanczos,fps=${FPS},setsar=1[b];[b][1]overlay=0:0,trim=duration=${len.toFixed(3)}${fades ? ',' + fades : ''}[v]`,
    '-map', '[v]', '-t', len.toFixed(3), ...VENC, '-an', outFile);
  return len;
}

// ---- Pictures ---------------------------------------------------------------------------------------------------
const pieces = [];
const placed = [];
const audioEvents = [];
let clock = 0;
for (const sec of SECTIONS) {
  const start = clock;
  if (sec.card === 'end') {
    const out = W(`${sec.id}.mp4`);
    ff('-loop', '1', '-framerate', String(FPS), '-i', R('cards/close.png'),
      '-vf', `trim=duration=${sec.dur},fade=t=in:st=0:d=0.6,fade=t=out:st=${sec.dur - 1}:d=1`, '-t', String(sec.dur), ...VENC, '-an', out);
    pieces.push(out);
    clock += sec.dur;
    placed.push({ id: sec.id, start, end: clock });
    continue;
  }
  // The phone part of the section: the whole section, or the lead-in before full-frame clips.
  const fullLen = (sec.fullFrame ?? []).reduce((n, c) => n + (c.to - c.from), 0);
  const phoneDur = sec.dur - fullLen;
  const totalLen = sec.parts.reduce((n, p) => n + (p.to - p.from), 0);
  const speed = Math.max(1, totalLen / phoneDur);
  const phoneFiles = [];
  let offset = 0;
  const partStarts = [];
  for (const [i, part] of sec.parts.entries()) {
    const isLast = i === sec.parts.length - 1;
    const length = (part.to - part.from) / speed;
    const target = isLast ? phoneDur - offset : length;
    const file = W(`${sec.id}-phone-${i}.mp4`);
    phoneClip(part, speed, file, target);
    partStarts.push({ part, at: start + offset });
    phoneFiles.push(file);
    offset += target;
  }
  let phoneMp4 = phoneFiles[0];
  if (phoneFiles.length > 1) {
    phoneMp4 = W(`${sec.id}-phone.mp4`);
    const listFile = W(`${sec.id}-phone-list.txt`);
    writeFileSync(listFile, phoneFiles.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
    ff('-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', phoneMp4);
  }
  const composed = W(`${sec.id}.mp4`);
  composePhone(R(`cards/${sec.id}-bg.png`), phoneMp4, phoneDur, composed, { in: true, out: !sec.fullFrame });
  pieces.push(composed);
  let at = start + phoneDur;
  for (const [i, clip] of (sec.fullFrame ?? []).entries()) {
    const out = W(`${sec.id}-full-${i}.mp4`);
    const len = fullFrame(clip, out, { in: i === 0, out: i === sec.fullFrame.length - 1 });
    pieces.push(out);
    audioEvents.push({ file: R(clip.file), at, from: clip.from, len, vol: clip.vol, kind: 'clip' });
    at += len;
  }
  // Sounds placed on recording moments: map the recording time into the finished video.
  for (const snd of sec.sounds ?? []) {
    const ps = partStarts.find(({ part }) => part.scene === snd.at.scene && snd.at.t >= part.from && snd.at.t <= part.to);
    if (!ps) { console.warn(`sound ${snd.file} at ${snd.at.scene} ${snd.at.t} is outside the section's parts`); continue; }
    audioEvents.push({ file: R(snd.file), at: ps.at + (snd.at.t - ps.part.from) / speed, vol: snd.vol, kind: 'sfx' });
  }
  clock += sec.dur;
  placed.push({ id: sec.id, start, end: clock, speed: Number(speed.toFixed(3)) });
}
const total = clock;
const listFile = W('pieces.txt');
writeFileSync(listFile, pieces.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
const silent = W('video.mp4');
ff('-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', silent);

// ---- Sound --------------------------------------------------------------------------------------------------------
const sec = (id) => placed.find((p) => p.id === id);
const modernA = { start: 0, end: sec('memory').end };
const victorian = { start: sec('time').start, end: sec('chat').end };
const close = sec('close');
// Under Edith's own voice (her clips and her chat reply) the period music steps down.
const duck = audioEvents.filter((e) => e.kind === 'clip' || /edith-reply/.test(e.file)).map((e) => [e.at, e.at + (e.len ?? 14.5)]);
const duckExpr = duck.map(([a, b]) => `between(t,${(a - victorian.start).toFixed(2)},${(b - victorian.start).toFixed(2)})`).join('+');

const inputs = [];
const chains = [];
const labels = [];
const addInput = (a) => { inputs.push(...a); return inputs.filter((x) => x === '-i').length - 1; };
// With a voice-over the beds sit lower, so the voice is always on top.
const BED_GAIN = VO ? 0.55 : 1;
const bed = (file, from, to, vol, extra = '') => {
  const i = addInput(['-stream_loop', '-1', '-i', R(file)]);
  const len = to - from;
  chains.push(`[${i}:a]atrim=duration=${len.toFixed(3)},asetpts=PTS-STARTPTS,volume=${(vol * BED_GAIN).toFixed(3)}${extra},afade=t=in:d=1,afade=t=out:st=${(len - 1.5).toFixed(3)}:d=1.5,adelay=${Math.round(from * 1000)}:all=1[b${i}]`);
  labels.push(`[b${i}]`);
};
bed(BEDS.modern, modernA.start, modernA.end, 0.32);
bed(BEDS.victorianMusic, victorian.start, victorian.end, 0.42, duckExpr ? `,volume='if(${duckExpr},0.3,1)':eval=frame` : '');
bed(BEDS.victorianStreet, victorian.start, victorian.end, 0.45, duckExpr ? `,volume='if(${duckExpr},0.35,1)':eval=frame` : '');
bed(BEDS.modern, close.start - 0.5, close.end, 0.4);
for (const e of audioEvents) {
  const i = addInput(e.kind === 'clip' ? ['-ss', String(e.from), '-t', e.len.toFixed(3), '-i', e.file] : ['-i', e.file]);
  const fade = e.kind === 'clip' ? `,afade=t=out:st=${(e.len - 0.3).toFixed(3)}:d=0.3` : '';
  chains.push(`[${i}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=${e.vol}${fade},adelay=${Math.round(e.at * 1000)}:all=1[e${i}]`);
  labels.push(`[e${i}]`);
}
if (VO && existsSync(VO)) {
  const i = addInput(['-i', VO]);
  chains.push(`[${i}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.0[vo]`);
  labels.push('[vo]');
}
const mixed = W('audio.wav');
ff(...inputs, '-filter_complex',
  `${chains.join(';')};${labels.join('')}amix=inputs=${labels.length}:normalize=0:duration=longest,atrim=duration=${total},alimiter=limit=0.9[m]`,
  '-map', '[m]', '-ar', '48000', '-ac', '2', mixed);

const outFile = path.join(HERE, 'out', 'chronodex-demo.mp4');
ff('-i', silent, '-i', mixed, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', outFile);
writeFileSync(path.join(HERE, 'out', 'timeline.json'), JSON.stringify({ totalS: total, sections: placed, sounds: audioEvents.map((e) => ({ file: path.basename(e.file), at: Number(e.at.toFixed(2)) })), voiceOver: VO }, null, 1));
console.log(`built ${outFile} (${total.toFixed(1)} s)`);
console.table(placed);
