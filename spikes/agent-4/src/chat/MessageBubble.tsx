/**
 * One text-message bubble: the guide's on the left in grey, the player's on the right in blue.
 *
 * Owner: Agent 4. Spike for A4-07 (MASTER.md section 1.2 step 10: "looks like a text-message thread").
 */
import type { ChatMessage } from './contracts';

/** Props for MessageBubble. */
export interface MessageBubbleProps {
  message: ChatMessage;
  /** True while this guide bubble is still receiving streamed text. */
  streaming?: boolean;
  /** Shown under guide bubbles. Plays the reply aloud. Omit to hide the button. */
  onSpeak?: () => void;
  /** True while this bubble's audio is loading or playing. */
  speaking?: boolean;
}

/**
 * Render one message. Guide bubbles get a small "play" control so any reply can be heard in the
 * guide's voice, not only the newest.
 *
 * @param props - The message and optional voice controls.
 * @returns The bubble row.
 */
export function MessageBubble({ message, streaming, onSpeak, speaking }: MessageBubbleProps) {
  const mine = message.role === 'player';
  return (
    <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[80%] whitespace-pre-wrap break-words px-3.5 py-2 text-[15px] leading-snug ${
          mine ? 'rounded-2xl rounded-br-md bg-blue-500 text-white' : 'rounded-2xl rounded-bl-md bg-zinc-200 text-zinc-900'
        }`}
      >
        {message.text}
        {streaming && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-zinc-500 align-text-bottom" />}
      </div>
      {onSpeak && !streaming && (
        <button
          type="button"
          onClick={onSpeak}
          disabled={speaking}
          className="mt-1 ml-1 text-xs text-zinc-500 disabled:text-blue-500"
          aria-label="Play this reply aloud"
        >
          {speaking ? '♪ playing…' : '▶ listen'}
        </button>
      )}
    </div>
  );
}
