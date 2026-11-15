/**
 * The catalogue of guide voices. The Historian picks a key; TTS turns the key into a voice.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 4.4 (VOICE_CATALOG), tasks A2-04, A2-07 and A2-r2-4.
 *
 * FINAL for London (15 Nov 2026): the human listened to the 16 A2-04 clips (spikes/agent-2/out/review.html) and
 * picked five: Eleven v4 Charlotte and Daniel, and Gemini TTS Kore, Aoede (women) and Iapetus (a man) with the
 * Cockney style instruction. Agent 6 added the accent voices for the cities outside Britain. The first provisional
 * London voices (Alice, Lily, George) are RETIRED: never offered for a new guide, but kept so eras already stored
 * with those keys still speak. Use `selectableVoices()` for anything that offers a choice.
 */

/** One voice the guide can speak with. */
export interface VoiceEntry {
  /** Plain words the Historian uses to pick a voice, for example "older man, London accent". */
  description: string;
  /**
   * Which speech service reads this voice. `elevenlabs`: MODELS.narration (and MODELS.chat_speech for fast chat
   * replies). `gemini`: MODELS.gemini_speech for both, with `styleInstructions`.
   */
  provider: 'elevenlabs' | 'gemini';
  /** The provider's voice name, as passed in its `voice` field. */
  voiceName: string;
  /** ElevenLabs stability, 0 to 1. Lower is more expressive. 0.4 was used for every A2-04 clip. Unused by Gemini. */
  stability: number;
  /** Gemini only: how to deliver the line (accent, warmth, pace). Billed as nothing; only the spoken text is billed. */
  styleInstructions?: string;
  /** True for a voice no new guide may get. It still speaks for eras already stored with it. */
  retired?: boolean;
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

/** Gemini delivery for the London women: the instruction the human heard in A2-04, without the flower-seller role. */
const COCKNEY_WOMAN =
  'A warm, cheerful working-class London woman with a natural Cockney accent. Friendly and lively, smiling as she speaks, unhurried, like chatting to a visitor.';
/** Gemini delivery for the London man: the instruction the human heard in A2-04, without the porter role. */
const COCKNEY_MAN = 'A warm, good-humoured working-class London man with a natural Cockney accent. Friendly and steady, like chatting to a visitor.';

/** Every voice, by key. Guide.voiceKey must be one of these keys. New guides take one of `selectableVoices()`. */
export const VOICE_CATALOG: Record<string, VoiceEntry> = {
  // London, picked by the human by ear (HUMAN_TASKS 2.2).
  'eleven-charlotte': {
    description: 'Woman, British accent, clear and composed. For London guides who are not working-class Londoners',
    provider: 'elevenlabs',
    voiceName: 'Charlotte',
    stability: DEFAULT_STABILITY,
  },
  'eleven-daniel': {
    description: 'Man in his forties or fifties, British accent, calm and authoritative. For London guides who are not working-class Londoners',
    provider: 'elevenlabs',
    voiceName: 'Daniel',
    stability: DEFAULT_STABILITY,
  },
  'gemini-kore': {
    description: 'Woman, working-class London, Cockney accent, warm and lively. For London street and working guides',
    provider: 'gemini',
    voiceName: 'Kore',
    stability: DEFAULT_STABILITY,
    styleInstructions: COCKNEY_WOMAN,
  },
  'gemini-aoede': {
    description: 'Woman, working-class London, Cockney accent, warm and cheerful (a second Cockney woman, different from Kore)',
    provider: 'gemini',
    voiceName: 'Aoede',
    stability: DEFAULT_STABILITY,
    styleInstructions: COCKNEY_WOMAN,
  },
  'gemini-iapetus': {
    description: 'Man, working-class London, Cockney accent, good-humoured and steady. For London street and working guides',
    provider: 'gemini',
    voiceName: 'Iapetus',
    stability: DEFAULT_STABILITY,
    styleInstructions: COCKNEY_MAN,
  },
  // Retired: the first provisional London voices. Eras already stored with these keys still speak with them.
  'eleven-alice': {
    description: 'RETIRED, do not choose. Younger woman, British accent',
    provider: 'elevenlabs',
    voiceName: 'Alice',
    stability: DEFAULT_STABILITY,
    retired: true,
  },
  'eleven-lily': {
    description: 'RETIRED, do not choose. Woman, British accent',
    provider: 'elevenlabs',
    voiceName: 'Lily',
    stability: DEFAULT_STABILITY,
    retired: true,
  },
  'eleven-george': {
    description: 'RETIRED, do not choose. Older man, British accent',
    provider: 'elevenlabs',
    voiceName: 'George',
    stability: DEFAULT_STABILITY,
    retired: true,
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
  'eleven-de-man': {
    description: 'Man in his forties, German accent, dry and matter-of-fact (for Berlin guides; unconfirmed by ear)',
    provider: 'elevenlabs',
    voiceName: 'Roger',
    stability: DEFAULT_STABILITY,
    accentTag: 'German accent',
  },
  'eleven-de-woman': {
    description: 'Woman in her thirties, German accent, warm (for Berlin guides; unconfirmed by ear)',
    provider: 'elevenlabs',
    voiceName: 'Matilda',
    stability: DEFAULT_STABILITY,
    accentTag: 'German accent',
  },
  'eleven-br-man': {
    description: 'Man in his forties, Brazilian Portuguese accent, easy-going (for Rio guides; unconfirmed by ear)',
    provider: 'elevenlabs',
    voiceName: 'Liam',
    stability: DEFAULT_STABILITY,
    accentTag: 'Brazilian Portuguese accent',
  },
  'eleven-br-woman': {
    description: 'Woman in her thirties, Brazilian Portuguese accent, bright (for Rio guides; unconfirmed by ear)',
    provider: 'elevenlabs',
    voiceName: 'Jessica',
    stability: DEFAULT_STABILITY,
    accentTag: 'Brazilian Portuguese accent',
  },
  'eleven-it-man': {
    description: 'Man in his forties, Italian accent, warm and theatrical (for Rome guides; unconfirmed by ear)',
    provider: 'elevenlabs',
    voiceName: 'Will',
    stability: DEFAULT_STABILITY,
    accentTag: 'Italian accent',
  },
  'eleven-it-woman': {
    description: 'Woman in her thirties, Italian accent, lively (for Rome guides; unconfirmed by ear)',
    provider: 'elevenlabs',
    voiceName: 'Charlotte',
    stability: DEFAULT_STABILITY,
    accentTag: 'Italian accent',
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
 * The voices a new guide may be given: every catalogue entry that is not retired. The Historian should offer only these.
 *
 * @returns Key to entry, without the retired voices.
 */
export function selectableVoices(): Record<string, VoiceEntry> {
  return Object.fromEntries(Object.entries(VOICE_CATALOG).filter(([, voice]) => !voice.retired));
}

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
