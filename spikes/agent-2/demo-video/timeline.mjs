/**
 * The demo video's timeline: sections in order, which recording each uses, the on-screen text, and the sounds.
 * Owner: Agent 2. Spike. Shared by cards.mjs (pictures) and build.mjs (video and audio).
 *
 * First cut: section lengths follow SCRIPT.md's target times. When the voice-over arrives, each section's `dur`
 * is set from where its lines fall in the recording and the cut is rebuilt; nothing else changes.
 *
 * Part times are seconds in the recording (frames/<scene>/index.json). A part longer than its share of the
 * section is sped up evenly; a shorter one holds its last frame.
 */
const REPO = '../../..';

export const SECTIONS = [
  {
    id: 'welcome', dur: 9, kicker: '01 · ENTER', headline: 'Fall through the clouds to where you stand',
    sub: 'The welcome screen asks for your location, then drops you onto your street.',
    parts: [{ scene: 'welcome', from: 0.6, to: 9.8 }],
    sounds: [{ file: 'assets/whoosh.wav', at: { scene: 'welcome', t: 3.2 }, vol: 0.7 }],
  },
  {
    id: 'map', dur: 20, kicker: '02 · EXPLORE', headline: 'A pixel map of real landmarks',
    sub: 'Zoom out to a globe, where three costumed ducks are on voyages of their own.',
    parts: [{ scene: 'map', from: 1.0, to: 27.4 }],
    sounds: [],
  },
  {
    id: 'collect', dur: 16, kicker: '03 · COLLECT', headline: 'Stand in the ring. Snap it. Win the badge.',
    sub: 'Within 50 m of a landmark, its photo earns its badge in your Dex.',
    parts: [{ scene: 'capture', from: 1.0, to: 16.1 }, { scene: 'memory', from: 0.0, to: 2.0 }],
    sounds: [
      { file: 'assets/shutter.wav', at: { scene: 'capture', t: 9.77 }, vol: 0.8 },
      { file: 'assets/coin.wav', at: { scene: 'capture', t: 12.08 }, vol: 0.7 },
      { file: 'assets/coin.wav', at: { scene: 'capture', t: 12.6 }, vol: 0.5 },
    ],
  },
  {
    id: 'memory', dur: 8, kicker: '04 · KEEP', headline: 'Every photo, in your memory box',
    sub: 'Kept on your phone, so the keepsakes open offline and never expire.',
    parts: [{ scene: 'memory', from: 2.0, to: 6.3 }],
    sounds: [{ file: 'assets/chest.wav', at: { scene: 'memory', t: 2.25 }, vol: 0.7 }],
  },
  {
    id: 'time', dur: 24, kicker: '05 · TIME MACHINE', headline: 'Royal Albert Hall, 1871',
    sub: 'Look all the way around the place as it stood, with its sources, its music and its street sounds.',
    parts: [{ scene: 'time', from: 1.0, to: 33.7 }],
    sounds: [],
  },
  {
    id: 'guide', dur: 13, kicker: '06 · MEET THE GUIDE', headline: 'Someone from that year walks up to you',
    sub: 'Edith Marlow, garden attendant. Her video and voice are generated with fal.',
    // A moment in the app, then her real clips full frame (walk on, then her introduction).
    parts: [{ scene: 'guide', from: 0.5, to: 2.6 }],
    fullFrame: [
      { file: `${REPO}/public/demo/royal-albert-hall_1871/walk_on.mp4`, from: 0, to: 5.04, vol: 0.5 },
      { file: `${REPO}/public/demo/royal-albert-hall_1871/talk.mp4`, from: 0, to: 5.75, vol: 1.9 },
    ],
    sounds: [],
  },
  {
    id: 'chat', dur: 19, kicker: '07 · TALK', headline: 'Text her, or talk to her',
    sub: 'She answers from her era\'s sources, in her own voice.',
    parts: [{ scene: 'chat', from: 1.0, to: 19.7 }],
    sounds: [
      { file: 'assets/earcon-on.wav', at: { scene: 'chat', t: 6.9 }, vol: 0.8 },
      // The speech is made on the server first; her voice starts about a second after the tap.
      // Her first sentence only (it ends at 11.1 s), so she has finished before the closing line.
      { file: 'assets/edith-reply.mp3', at: { scene: 'chat', t: 7.9 }, vol: 1.9, len: 11.15 },
    ],
  },
  { id: 'close', dur: 11, card: 'end' },
];

/**
 * The team's voice-over (WhatsApp recording, 87 s), cut into its nine spoken blocks at the pauses SCRIPT.md asked
 * for, each placed at the start of the pictures it describes. `from`/`to`: seconds in the recording (found with
 * ffmpeg silencedetect); `at`: seconds in the finished video.
 */
export const VOICE_OVER = {
  file: 'assets/voiceover.mp4',
  blocks: [
    { line: 'Every street has a past...', from: 2.0, to: 5.95, at: 1.2 },
    { line: 'It starts as a game...', from: 6.6, to: 21.3, at: 9.5 },
    { line: 'Stand within fifty metres...', from: 21.9, to: 26.3, at: 29.5 },
    { line: 'Every badge lands in your Dex...', from: 28.15, to: 34.95, at: 43.0 },
    { line: 'Then the payoff: the Time Machine...', from: 35.95, to: 45.5, at: 53.5 },
    { line: 'Every era is researched...', from: 50.85, to: 55.85, at: 71.3 },
    { line: 'Then someone from that year...', from: 56.6, to: 59.05, at: 77.2 },
    { line: "And she'll keep talking...", from: 70.05, to: 74.5, at: 90.4 },
    { line: 'Every picture, voice and video...', from: 77.25, to: 87.19, at: 109.4 },
  ],
};

/** The duck that walks across the credits (the app's own sprite sheet: two 160x128 frames, facing right). */
export const CREDITS_DUCK = { sheet: '../../../public/sprites/duck/chinese.png', frameS: 0.34, scale: 1.25, y: 878 };

/** Music beds, in seconds of the finished video (filled in by build.mjs from the sections). */
export const BEDS = {
  modern: `${REPO}/public/audio/ambience/1980-now.m4a`,
  victorianMusic: `${REPO}/public/audio/ambience/1850-1899.m4a`,
  victorianStreet: `${REPO}/public/audio/ambience/1850-1899-street.mp3`,
};

/** The phone's screen inside the 1920x1080 frame (cards.mjs draws the bezel round it). */
export const PHONE_SLOT = { x: 262, y: 38, w: 464, h: 1004 };
export const SIZE = { w: 1920, h: 1080 };
export const FPS = 30;
