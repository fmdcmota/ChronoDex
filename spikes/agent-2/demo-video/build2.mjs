/**
 * Assemble demo video 2 (SCRIPT-2.md) from the team's recordings, the cards (cards2/, plus the first video's bezel
 * and end card) and the app's sounds, following timeline2.mjs. Owner: Agent 2. Spike.
 *
 * Sections, hard cuts: problem card · street and phone side by side · Edith full frame · chat · pipeline card ·
 * end card with the walking duck.
 * Usage: node spikes/agent-2/demo-video/build2.mjs   (after cards2.mjs)
 * Output: out/chronodex-demo-2.mp4 (1920x1080, 30 fps) and out/timeline-2.json. Work files: work2/. No paid call.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { HERE } from './cdp.mjs';
import { BEDS, CREDITS_DUCK, FPS, PHONE_SLOT, SIZE } from './timeline.mjs';
import { CHAT, DUR, GUIDE_CLIPS, PIPELINE, SBS, SBS_LENGTH_S, SBS_PHASES, SBS_SOUNDS, SCREEN_OFFSETS, SOURCES, VICTORIAN_FROM_R, VO } from './timeline2.mjs';

const FFMPEG = createRequire(import.meta.url)('ffmpeg-static');
const W = (...p) => path.join(HERE, 'work2', ...p);
const R = (p) => path.resolve(HERE, p);
const fwd = (p) => p.replace(/\\/g, '/');
mkdirSync(W(), { recursive: true });
mkdirSync(path.join(HERE, 'out'), { recursive: true });

const ff = (...a) => execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...a], { stdio: ['ignore', 'inherit', 'inherit'] });
const VENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS)];
const loopPng = (png) => ['-loop', '1', '-framerate', String(FPS), '-i', png];

/** Still images shown one after another for given lengths, as one clip (concat demuxer). */
function slideshow(stills, outFile) {
  let txt = '';
  for (const s of stills) txt += `file '${fwd(s.png)}'\nduration ${s.dur.toFixed(4)}\n`;
  txt += `file '${fwd(stills.at(-1).png)}'\n`;
  const list = outFile.replace(/\.mp4$/, '.txt');
  writeFileSync(list, txt);
  const total = stills.reduce((n, s) => n + s.dur, 0);
  ff('-f', 'concat', '-safe', '0', '-i', list, '-vf', `fps=${FPS},format=yuv420p`, '-t', total.toFixed(3), ...VENC, '-an', outFile);
  return total;
}

const pieces = [];
const placed = [];
const sfx = [];
const voice = [];
let clock = 0;
const section = (id, file, dur) => { pieces.push(file); placed.push({ id, start: clock, end: clock + dur }); clock += dur; };

// ---- 1. The problem -------------------------------------------------------------------------------------------
{
  const out = W('1-problem.mp4');
  ff(...loopPng(R('cards2/problem.png')), '-vf', `fps=${FPS},format=yuv420p`, '-t', String(DUR.problem), ...VENC, '-an', out);
  for (const b of VO.problem) voice.push({ ...b, at: clock + b.at });
  section('problem', out, DUR.problem);
}

// ---- 2. One real run: street and phone side by side, in sync ---------------------------------------------------
const sbsStart = clock;
{
  // The screen recording, re-timed onto the street film's clock.
  const segs = SCREEN_OFFSETS.map((o, i) => {
    const f = W(`2-screen-${i}.mp4`);
    ff('-ss', (o.from + o.offsetS).toFixed(3), '-t', (o.to - o.from).toFixed(3), '-i', R(SOURCES.screen),
      '-vf', `fps=${FPS},scale=${SBS.phone.w}:${SBS.phone.h}:flags=lanczos,setsar=1,format=yuv420p`, ...VENC, '-an', f);
    return f;
  });
  const screen = W('2-screen.mp4');
  writeFileSync(W('2-screen.txt'), segs.map((f) => `file '${fwd(f)}'`).join('\n'));
  ff('-f', 'concat', '-safe', '0', '-i', W('2-screen.txt'), '-c', 'copy', screen);
  // The text panel changes with the run.
  const bg = W('2-bg.mp4');
  slideshow(SBS_PHASES.map((p, i) => ({ png: R(`cards2/sbs-bg-${i}.png`), dur: (SBS_PHASES[i + 1]?.from ?? SBS_LENGTH_S) - p.from })), bg);
  const out = W('2-sbs.mp4');
  ff('-i', bg, '-t', String(SBS_LENGTH_S), '-i', R(SOURCES.street), '-i', screen, ...loopPng(R('cards2/sbs-frame.png')),
    '-filter_complex',
    `[1:v]fps=${FPS},scale=${SBS.street.w}:${SBS.street.h}:flags=lanczos,setsar=1[st];[2:v]setpts=PTS-STARTPTS[sc];` +
    `[0:v][st]overlay=${SBS.street.x}:${SBS.street.y}:eof_action=repeat[a];[a][sc]overlay=${SBS.phone.x}:${SBS.phone.y}:eof_action=repeat[b];` +
    `[b][3:v]overlay=0:0,trim=duration=${SBS_LENGTH_S}[v]`,
    '-map', '[v]', '-t', String(SBS_LENGTH_S), ...VENC, '-an', out);
  for (const s of SBS_SOUNDS) sfx.push({ file: R(s.file), at: clock + s.r, vol: s.vol });
  for (const b of VO.run) voice.push({ ...b, at: clock + b.r });
  section('run-side-by-side', out, SBS_LENGTH_S);
}
const victorianStart = sbsStart + VICTORIAN_FROM_R;

// ---- 2b. Edith, full frame -----------------------------------------------------------------------------------------
const clips = [];
for (const [i, c] of GUIDE_CLIPS.entries()) {
  const len = c.to - c.from;
  const out = W(`2-guide-${i}.mp4`);
  ff('-ss', String(c.from), '-t', len.toFixed(3), '-i', R(c.file), ...loopPng(R('cards2/guide-lower.png')),
    '-filter_complex', `[0:v]scale=${SIZE.w}:${SIZE.h}:flags=lanczos,fps=${FPS},setsar=1[b];[b][1]overlay=0:0,trim=duration=${len.toFixed(3)}[v]`,
    '-map', '[v]', '-t', len.toFixed(3), ...VENC, '-an', out);
  clips.push({ file: R(c.file), at: clock, from: c.from, len, vol: c.vol });
  section(`run-guide-${i}`, out, len);
}

// ---- 2c. The chat (the first video's recording, in its phone layout) ----------------------------------------------
{
  const idx = JSON.parse(readFileSync(path.join(HERE, 'frames', CHAT.part.scene, 'index.json'), 'utf8'));
  const { from, to } = CHAT.part;
  const before = [...idx.frames].reverse().find((f) => f.t <= from) ?? idx.frames[0];
  const list = [{ ...before, t: from }, ...idx.frames.filter((f) => f.t > from && f.t < to)];
  const dir = fwd(path.join(HERE, 'frames', CHAT.part.scene));
  let txt = '';
  list.forEach((f, i) => { txt += `file '${dir}/${f.file}'\nduration ${((list[i + 1]?.t ?? to) - f.t).toFixed(5)}\n`; });
  txt += `file '${dir}/${list.at(-1).file}'\n`;
  writeFileSync(W('2-chat.txt'), txt);
  const phone = W('2-chat-phone.mp4');
  const pad = Math.max(0, CHAT.dur - (to - from));
  ff('-f', 'concat', '-safe', '0', '-i', W('2-chat.txt'),
    '-vf', `fps=${FPS},scale=${PHONE_SLOT.w}:${PHONE_SLOT.h}:flags=lanczos,tpad=stop_mode=clone:stop_duration=${pad.toFixed(3)},format=yuv420p`,
    '-t', String(CHAT.dur), ...VENC, '-an', phone);
  const out = W('2-chat.mp4');
  ff(...loopPng(R('cards2/chat-bg.png')), '-i', phone, ...loopPng(R('cards/bezel.png')),
    '-filter_complex', `[0][1]overlay=${PHONE_SLOT.x}:${PHONE_SLOT.y}:eof_action=repeat[a];[a][2]overlay=0:0,trim=duration=${CHAT.dur}[v]`,
    '-map', '[v]', '-t', String(CHAT.dur), ...VENC, '-an', out);
  for (const s of CHAT.sounds) sfx.push({ file: R(s.file), at: clock + (s.t - from), vol: s.vol, len: s.len, edith: /edith/.test(s.file) });
  for (const b of VO.chat) voice.push({ ...b, at: clock + b.at });
  section('run-chat', out, CHAT.dur);
}
const victorianEnd = clock;

// ---- 3. How it's built: the pipeline card, each tool lighting as it is named --------------------------------------
{
  const vo = VO.built[0];
  const voAt = vo.at; // seconds into the section
  const lights = PIPELINE.lightAtVo.map((t) => voAt + (t - vo.from));
  const stills = [{ png: R('cards2/pipeline-0.png'), dur: lights[0] }];
  lights.forEach((t, i) => stills.push({ png: R(`cards2/pipeline-${i + 1}.png`), dur: (lights[i + 1] ?? DUR.built) - t }));
  const out = W('3-built.mp4');
  slideshow(stills, out);
  voice.push({ ...vo, at: clock + vo.at });
  section('built', out, DUR.built);
}

// ---- 4. What's new: the first video's end card, unchanged, with the walking duck ----------------------------------
const closeStart = clock;
{
  const out = W('4-close.mp4');
  const d = CREDITS_DUCK;
  const dur = DUR.close;
  const fw = Math.round(160 * d.scale), fh = Math.round(128 * d.scale);
  const x = `-${fw}+(${SIZE.w}+${fw})*t/${dur}`;
  ff(...loopPng(R('cards/close.png')), ...loopPng(R(d.sheet)),
    '-filter_complex',
    `[1]split[s1][s2];[s1]crop=160:128:0:0,scale=${fw}:${fh}:flags=neighbor[f1];[s2]crop=160:128:160:0,scale=${fw}:${fh}:flags=neighbor[f2];` +
    `[0][f1]overlay=x='${x}':y=${d.y}:enable='lt(mod(t,${2 * d.frameS}),${d.frameS})'[a];` +
    `[a][f2]overlay=x='${x}':y=${d.y}:enable='gte(mod(t,${2 * d.frameS}),${d.frameS})',trim=duration=${dur}[v]`,
    '-map', '[v]', '-t', String(dur), ...VENC, '-an', out);
  for (const b of VO.close) voice.push({ ...b, at: clock + b.at });
  section('close', out, dur);
}
const total = clock;
writeFileSync(W('pieces.txt'), pieces.map((f) => `file '${fwd(f)}'`).join('\n'));
const silent = W('video.mp4');
ff('-f', 'concat', '-safe', '0', '-i', W('pieces.txt'), '-c', 'copy', silent);

// ---- Sound -----------------------------------------------------------------------------------------------------------
const inputs = [];
const chains = [];
const labels = [];
const addInput = (a) => { inputs.push(...a); return inputs.filter((x) => x === '-i').length - 1; };
const BED_GAIN = 0.55; // the voice is always on top
// The period music and street sound fill the quiet moments (the 360° look-around, Edith's walk-on) at full level,
// and step down under every spoken line: the voice-over, Edith's talking clip and her chat reply.
const speech = [
  ...clips.filter((c) => c.vol > 1).map((c) => [c.at, c.at + c.len]),
  ...sfx.filter((e) => e.edith).map((e) => [e.at, e.at + e.len]),
  ...voice.map((v) => [v.at - 0.2, v.at + (v.to - v.from) + 0.3]),
].filter(([a, b]) => b > victorianStart && a < victorianEnd);
const duckExpr = speech.map(([a, b]) => `between(t,${(a - victorianStart).toFixed(2)},${(b - victorianStart).toFixed(2)})`).join('+');
const bed = (file, from, to, vol, extra = '') => {
  const i = addInput(['-stream_loop', '-1', '-i', R(file)]);
  const len = to - from;
  chains.push(`[${i}:a]atrim=duration=${len.toFixed(3)},asetpts=PTS-STARTPTS,volume=${(vol * BED_GAIN).toFixed(3)}${extra},afade=t=in:d=1,afade=t=out:st=${(len - 1.5).toFixed(3)}:d=1.5,adelay=${Math.round(from * 1000)}:all=1[b${i}]`);
  labels.push(`[b${i}]`);
};
bed(BEDS.modern, 0, victorianStart, 0.32);
bed(BEDS.victorianMusic, victorianStart, victorianEnd, 1.1, `,volume='if(${duckExpr},0.32,1)':eval=frame`);
bed(BEDS.victorianStreet, victorianStart, victorianEnd, 1.1, `,volume='if(${duckExpr},0.35,1)':eval=frame`);
bed(BEDS.modern, victorianEnd - 0.5, total, 0.4);
for (const e of [...sfx, ...clips.map((c) => ({ ...c, clip: true }))]) {
  const i = addInput(e.clip ? ['-ss', String(e.from), '-t', e.len.toFixed(3), '-i', e.file] : e.len ? ['-t', e.len.toFixed(3), '-i', e.file] : ['-i', e.file]);
  const fade = e.len ? `,afade=t=out:st=${(e.len - 0.3).toFixed(3)}:d=0.3` : '';
  chains.push(`[${i}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=${e.vol}${fade},adelay=${Math.round(e.at * 1000)}:all=1[e${i}]`);
  labels.push(`[e${i}]`);
}
// The voice-over: each block cut from the recording, levelled once, soft-edged, and laid on its pictures.
for (const [n, b] of voice.entries()) {
  const len = b.to - b.from;
  const i = addInput(['-ss', String(b.from), '-t', len.toFixed(3), '-i', R(SOURCES.voiceOver)]);
  chains.push(`[${i}:a]aformat=sample_rates=48000:channel_layouts=stereo,loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:d=0.04,afade=t=out:st=${(len - 0.08).toFixed(3)}:d=0.08,adelay=${Math.round(b.at * 1000)}:all=1[vo${n}]`);
  labels.push(`[vo${n}]`);
}
const mixed = W('audio.wav');
ff(...inputs, '-filter_complex',
  `${chains.join(';')};${labels.join('')}amix=inputs=${labels.length}:normalize=0:duration=longest,atrim=duration=${total},alimiter=limit=0.9[m]`,
  '-map', '[m]', '-ar', '48000', '-ac', '2', mixed);

const outFile = path.join(HERE, 'out', 'chronodex-demo-2.mp4');
ff('-i', silent, '-i', mixed, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', outFile);
// Overlaps between voice blocks would garble the narration: report them.
const sorted = [...voice].sort((a, b) => a.at - b.at);
sorted.forEach((b, i) => { const n = sorted[i + 1]; if (n && b.at + (b.to - b.from) > n.at) console.warn(`voice overlap at ${n.at.toFixed(2)} s`); });
writeFileSync(path.join(HERE, 'out', 'timeline-2.json'), JSON.stringify({
  totalS: total, sections: placed,
  voice: sorted.map((b) => ({ line: b.line ?? '', at: Number(b.at.toFixed(2)), end: Number((b.at + b.to - b.from).toFixed(2)) })),
  sounds: sfx.map((e) => ({ file: path.basename(e.file), at: Number(e.at.toFixed(2)) })),
}, null, 1));
console.log(`built ${outFile} (${total.toFixed(1)} s); close card from ${closeStart.toFixed(1)} s`);
console.table(placed.map((p) => ({ id: p.id, start: p.start.toFixed(2), end: p.end.toFixed(2) })));
