/**
 * The catalogue of guide voices. The Historian picks a key; TTS turns the key into a voice.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 4.4 (VOICE_CATALOG), tasks A2-04 and A2-07.
 *
 * PROVISIONAL: A2-04 generated 16 clips (spikes/agent-2/out/review.html) but a human has not yet
 * listened and chosen. The voices below are ElevenLabs names whose British accent is from memory
 * (MASTER.md section 14, "not verified"), so treat the descriptions as unconfirmed until the human
 * picks. Replace this list from the picks and update notebook/agent-2.md in the same commit.
 */

/** One voice the guide can speak with. */
export interface VoiceEntry {
  /** Plain words the Historian uses to pick a voice, for example "older man, London accent". */
  description: string;
  /** Which speech service reads this voice. Only ElevenLabs is used today. */
  provider: 'elevenlabs';
  /** The provider's voice name, as passed in the `voice` field (the chat model takes the same names). */
  voiceName: string;
  /** ElevenLabs stability, 0 to 1. Lower is more expressive. 0.4 was used for every A2-04 clip. */
  stability: number;
  /**
   * ElevenLabs audio tag that sets the accent, for guides outside Britain, for example "Mexican Spanish accent".
   * synthesizeSpeech puts it in square brackets before the text. Checked 15 Nov 2026 (Agent 6,
   * spikes/agent-6/accent-test.mts): Eleven v4 honours the tag and does not read it aloud (a Scribe
   * transcript of the clip has no tag words). Absent for the British voices.
   */
  accentTag?: string;
}

/** ElevenLabs stability used for all guide voices until a human says otherwise (A2-04). */
const DEFAULT_STABILITY = 0.4;

/** Every voice, by key. Guide.voiceKey must be one of these keys. */
export const VOICE_CATALOG: Record<string, VoiceEntry> = {
  'eleven-alice': {
    description: 'Younger woman, British accent, bright and friendly (unconfirmed by ear)',
    provider: 'elevenlabs',
    voiceName: 'Alice',
    stability: DEFAULT_STABILITY,
  },
  'eleven-lily': {
    description: 'Woman in her thirties or forties, British accent, warm (unconfirmed by ear)',
    provider: 'elevenlabs',
    voiceName: 'Lily',
    stability: DEFAULT_STABILITY,
  },
  'eleven-george': {
    description: 'Older man, British accent, warm and steady (unconfirmed by ear)',
    provider: 'elevenlabs',
    voiceName: 'George',
    stability: DEFAULT_STABILITY,
  },
  'eleven-daniel': {
    description: 'Man in his forties or fifties, British accent, calm and authoritative (unconfirmed by ear)',
    provider: 'elevenlabs',
    voiceName: 'Daniel',
    stability: DEFAULT_STABILITY,
  },
  // Guides for the demo cities outside Britain (Agent 6, 15 Nov 2026). Same premade ElevenLabs voices, with an
  // accent tag. The accent's quality is unconfirmed by ear.
  'eleven-mx-woman': {
    description: 'Younger woman, Mexican Spanish accent, lively (for Mexico City guides; unconfirmed by ear)',
    provider: 'elevenlabs',
    voiceName: 'Jessica',
    stability: DEFAULT_STABILITY,
    accentTag: 'Mexican Spanish accent',
  },
  'eleven-mx-man': {
    description: 'Man in his thirties or forties, Mexican Spanish accent, warm (for Mexico City guides; unconfirmed by ear)',
    provider: 'elevenlabs',
    voiceName: 'Chris',
    stability: DEFAULT_STABILITY,
    accentTag: 'Mexican Spanish accent',
  },
  'eleven-pt-man': {
    description: 'Man in his forties, Portuguese accent, friendly (for Porto guides; unconfirmed by ear)',
    provider: 'elevenlabs',
    voiceName: 'Brian',
    stability: DEFAULT_STABILITY,
    accentTag: 'Portuguese accent',
  },
  'eleven-pt-woman': {
    description: 'Woman in her thirties, Portuguese accent, warm (for Porto guides; unconfirmed by ear)',
    provider: 'elevenlabs',
    voiceName: 'Sarah',
    stability: DEFAULT_STABILITY,
    accentTag: 'Portuguese accent',
  },
  'eleven-sg-man': {
    description: 'Man in his thirties or forties, Malay accent, easy-going (for Singapore guides; unconfirmed by ear)',
    provider: 'elevenlabs',
    voiceName: 'Eric',
    stability: DEFAULT_STABILITY,
    accentTag: 'Malay accent',
  },
  'eleven-sg-woman': {
    description: 'Younger woman, Malay accent, bright (for Singapore guides; unconfirmed by ear)',
    provider: 'elevenlabs',
    voiceName: 'Laura',
    stability: DEFAULT_STABILITY,
    accentTag: 'Malay accent',
  },
};

/**
 * Look up a voice by key.
 *
 * @param voiceKey - A key of VOICE_CATALOG, normally Guide.voiceKey.
 * @returns The voice entry.
 * @throws Error naming the valid keys when the key is not in the catalogue.
 */
export function getVoice(voiceKey: string): VoiceEntry {
  const voice = VOICE_CATALOG[voiceKey];
  if (!voice) {
    throw new Error(`Unknown voice key "${voiceKey}". Valid keys: ${Object.keys(VOICE_CATALOG).join(', ')}`);
  }
  return voice;
}
