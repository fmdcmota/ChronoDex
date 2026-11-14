/**
 * Bottom bar of the chat: a text box with Send, or a hold-to-talk mic button while the box is empty.
 *
 * Owner: Agent 4. Part of A4-07 (text) and A4-08 (voice in).
 *
 * The mic button uses HoldToTalkRecorder (./recorder.ts). Pointer capture keeps the release
 * even when the finger slides off, and the CSS stops iOS opening its long-press menu (see the
 * README traps in spikes/agent-4).
 */
'use client';

import { useRef, useState, type FormEvent, type PointerEvent } from 'react';
import { HoldToTalkRecorder, type Recording } from './recorder';

/** Props for Composer. */
export interface ComposerProps {
  /** False while a reply is streaming or a recording is being transcribed. */
  enabled: boolean;
  onSend: (text: string) => void;
  onRecording: (rec: Recording) => void;
  /** Called on any tap that may later play audio, so the reply element can be unlocked on iOS. */
  onUserGesture: () => void;
  /** Shown when the microphone is refused or missing. */
  onMicError: (message: string) => void;
}

/**
 * The message composer.
 *
 * @param props - Component props.
 * @param props.enabled - False while a reply streams or a recording is transcribed.
 * @param props.onSend - Called with the trimmed text.
 * @param props.onRecording - Called with a finished hold-to-talk recording.
 * @param props.onUserGesture - Called inside every tap that may later play audio (iOS unlock).
 * @param props.onMicError - Called with a message when the microphone is refused or missing.
 * @returns The composer form.
 */
export function Composer({ enabled, onSend, onRecording, onUserGesture, onMicError }: ComposerProps) {
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const recorder = useRef<HoldToTalkRecorder | null>(null);
  const holding = useRef(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !enabled) return;
    onUserGesture();
    onSend(trimmed);
    setText('');
  };

  const finish = async () => {
    setRecording(false);
    const rec = await recorder.current?.stop();
    if (rec) onRecording(rec);
  };

  const down = async (e: PointerEvent<HTMLButtonElement>) => {
    if (!enabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    onUserGesture();
    holding.current = true;
    setRecording(true);
    recorder.current ??= new HoldToTalkRecorder();
    try {
      await recorder.current.start();
      // The finger came up while the permission prompt was open.
      if (!holding.current) void finish();
    } catch (err) {
      holding.current = false;
      setRecording(false);
      onMicError(err instanceof DOMException && err.name === 'NotAllowedError' ? 'Microphone access was refused. You can still type.' : 'No microphone available. You can still type.');
    }
  };

  const up = () => {
    if (!holding.current) return;
    holding.current = false;
    void finish();
  };

  const showMic = text.trim() === '';

  return (
    <form onSubmit={submit} className="flex items-end gap-2 border-t border-zinc-200 bg-white px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={recording ? 'Listening… release to send' : 'Message'}
        disabled={recording}
        enterKeyHint="send"
        aria-label="Message"
        className="min-w-0 flex-1 rounded-full border border-zinc-300 bg-zinc-50 px-4 py-2 text-[16px] outline-none focus:border-blue-400"
      />
      {showMic ? (
        <button
          type="button"
          disabled={!enabled}
          onPointerDown={down}
          onPointerUp={up}
          onPointerCancel={up}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Hold to talk"
          className={`h-10 w-10 shrink-0 touch-none select-none rounded-full text-lg [-webkit-touch-callout:none] disabled:opacity-40 ${
            recording ? 'scale-125 bg-red-500 text-white' : 'bg-zinc-100 text-zinc-700'
          } transition-transform`}
        >
          🎙
        </button>
      ) : (
        <button type="submit" disabled={!enabled} aria-label="Send" className="h-10 w-10 shrink-0 rounded-full bg-blue-500 text-lg text-white disabled:opacity-40">
          ↑
        </button>
      )}
    </form>
  );
}
