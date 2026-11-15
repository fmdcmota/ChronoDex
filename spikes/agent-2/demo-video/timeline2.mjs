/**
 * Demo video 2's timeline (SCRIPT-2.md): the team's recordings, where each voice-over block lands, and the sounds.
 * Owner: Agent 2. Spike. Shared by cards2.mjs (pictures) and build2.mjs (video and audio).
 *
 * Part 2 shows the team's two recordings of one real run side by side, in sync: the street (filmed by a teammate)
 * and the phone's own screen recording. The screen recording runs behind the street film by 0.55 s at the start and
 * 0.85 s from the camera onwards (matched on the cloud burst, the map, the badge twirl, the motion prompt and the
 * horse in the 360° view); the switch falls on the camera prompt's black screen.
 */
const ROOT = '../../..';

/** The team's files, in the repo root (not committed). */
export const SOURCES = {
  street: `${ROOT}/Real life Demo.mp4`,
  screen: `${ROOT}/Screen_recording.mp4`,
  voiceOver: `${ROOT}/Voiceover.mp4`,
};

/** Seconds of the street film shown side by side: up to the tap on "Meet Edith". */
export const SBS_LENGTH_S = 43.6;
/** Screen-recording time = street time + offset, per stretch (see the header). */
export const SCREEN_OFFSETS = [{ from: 0, to: 9.5, offsetS: 0.55 }, { from: 9.5, to: SBS_LENGTH_S, offsetS: 0.85 }];

/** Side-by-side layout in the 1920x1080 frame: the street film, the screen recording, the text panel. */
export const SBS = {
  street: { x: 90, y: 120, w: 518, h: 920 },
  phone: { x: 658, y: 120, w: 414, h: 920 },
  panelX: 1150,
};

/** The text panel during part 2 (seconds of the street film). */
export const SBS_PHASES = [
  { from: 0, kicker: '02 · ONE REAL RUN', headline: 'Enter the timestream', sub: 'One real run at the Royal Albert Hall, filmed in the street and recorded on the phone at the same time.' },
  { from: 6.5, kicker: '02 · ONE REAL RUN', headline: 'Stand in the ring. Snap it. Win the badge.', sub: 'The server checks you are within 50 m of the landmark before the badge is yours.' },
  { from: 19.5, kicker: '02 · ONE REAL RUN', headline: 'Royal Albert Hall, 1871', sub: 'Move the phone to look all the way around the place as it stood. An AI reconstruction, from cited sources.' },
];

/** The pipeline card's boxes, left to right, each above the real Royal Albert Hall 1871 output it made. */
export const PIPELINE = {
  boxes: [
    { tool: 'DEEPSEEK', what: 'researches the year, writes the brief', doc: '<b>The Royal Albert Hall Opens, 1871</b><br>Opened 29 March 1871…<br><i>3 sources cited</i><br>Guide: Edith Marlow' },
    { tool: 'FAL', what: 'the scene', img: 'scene.jpg' },
    { tool: 'FAL', what: 'the 360° view', img: 'panorama.jpg' },
    { tool: 'FAL', what: 'portrait, voices, music', img: 'headshot.jpg' },
    { tool: 'FAL', what: 'the guide\'s video', img: 'guide_frame.jpg' },
  ],
  /**
   * When each next tool lights, in seconds of the voice-over recording (fal Scribe word timings): DeepSeek, fal,
   * "three sixty", "voices", "video", Claude, MongoDB.
   */
  lightAtVo: [69.26, 73.22, 77.16, 78.14, 79.94, 80.88, 83.34],
};

/** Voice-over blocks: seconds in the recording (fal Scribe word timings) and where each starts in its section. */
export const VO = {
  problem: [{ from: 1.26, to: 12.84, at: 1.0 }],
  // Part 2 blocks are placed on the street film's clock (r).
  run: [
    { line: "Here's one real run…", from: 14.0, to: 20.26, r: 0.4 },
    { line: 'Every landmark has a ring…', from: 22.9, to: 29.36, r: 7.0 },
    { line: 'Badge is yours…', from: 32.28, to: 34.94, r: 17.0 },
    { line: 'Now the time machine…', from: 35.46, to: 43.74, r: 20.2 },
    { line: 'Then someone from that year…', from: 48.6, to: 50.52, r: 41.6 },
  ],
  chat: [{ line: 'And you can keep talking…', from: 60.62, to: 64.84, at: 0.4 }],
  built: [{ from: 68.44, to: 87.8, at: 0.5 }],
  close: [{ from: 90.38, to: 103.14, at: 0.5 }],
};

/** App sounds in part 2, on the street film's clock. */
export const SBS_SOUNDS = [
  { file: 'assets/whoosh.wav', r: 3.0, vol: 0.7 },
  { file: 'assets/shutter.wav', r: 14.0, vol: 0.8 },
  { file: 'assets/coin.wav', r: 16.25, vol: 0.7 },
  { file: 'assets/coin.wav', r: 16.8, vol: 0.5 },
  { file: 'assets/chest.wav', r: 19.25, vol: 0.45 },
];
/** The 1871 scene first fills the screen here (street clock): the period music and street sounds start. */
export const VICTORIAN_FROM_R = 22.5;

/** Edith's own clips, full frame, after the tap on "Meet Edith". */
export const GUIDE_CLIPS = [
  { file: `${ROOT}/public/demo/royal-albert-hall_1871/walk_on.mp4`, from: 0, to: 5.04, vol: 0.5 },
  { file: `${ROOT}/public/demo/royal-albert-hall_1871/talk.mp4`, from: 0, to: 5.75, vol: 1.9 },
];

/** The chat, from the first video's recording (a real reply, and Edith's real spoken reply). */
export const CHAT = {
  part: { scene: 'chat', from: 1.0, to: 19.7 },
  dur: 19,
  sounds: [
    { file: 'assets/earcon-on.wav', t: 6.9, vol: 0.8 },
    { file: 'assets/edith-reply.mp3', t: 7.9, vol: 1.9, len: 11.15 },
  ],
};

/** Section lengths that are not set by a recording. */
export const DUR = { problem: 13.6, built: 20.2, close: 13.8 };
