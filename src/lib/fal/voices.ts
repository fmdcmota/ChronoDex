/**
 * The catalogue of guide voices. The Historian picks a key; TTS turns the key into a voice.
 *
 * Owner: Agent 2 (Studio). Created by Agent 1 as an M0 stub (MASTER.md section 4.4).
 * TODO(agent-2): A2-04 replaces the two placeholders with four to six real voices (men and women,
 * older and younger, British accents) and adds whatever fields TTS needs (provider, voice name,
 * style instructions). Keep `description`: the Historian reads it to choose a voice.
 */

/** One voice the guide can speak with. */
export interface VoiceEntry {
  /** Plain words the Historian uses to pick a voice, for example "older man, London accent". */
  description: string;
}

/** Every voice, by key. Guide.voiceKey must be one of these keys. */
export const VOICE_CATALOG: Record<string, VoiceEntry> = {
  'placeholder-male-older': { description: 'Placeholder: older man, British accent' },
  'placeholder-female-younger': { description: 'Placeholder: younger woman, British accent' },
};
