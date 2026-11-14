/**
 * Local copy of the contract types the chat spike needs, from MASTER.md section 4.1.
 *
 * Owner: Agent 4. Spike for A4-07 only. When the scaffold lands, delete this file and import the
 * same names from `@/lib/contracts` (Agent 1). Do not change these shapes here: they are frozen at M0.
 */

/** `${landmarkId}_${year}`, for example "queens-tower_1893". */
export type EraId = string;

/** The guide persona for one landmark and year. Fictional, never a real named person. */
export interface Guide {
  name: string;
  role: string;
  bio: string;
  appearance: string;
  voiceKey: string;
  script: string;
  /** First chat bubble. */
  greeting: string;
  /** Square portrait, the chat profile picture. Null until the pipeline has made it. */
  headshotUrl: string | null;
}

/** One message in the chat. */
export interface ChatMessage {
  role: 'player' | 'guide';
  text: string;
}

/** One JSON object per SSE `data:` line from POST /api/chat. */
export type ChatStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; text: string }
  | { type: 'error'; message: string };
