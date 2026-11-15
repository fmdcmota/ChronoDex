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
