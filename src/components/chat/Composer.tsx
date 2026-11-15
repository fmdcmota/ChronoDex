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

import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from 'react';
import { HoldToTalkRecorder, type Recording } from './recorder';
import type { EarconKind } from './tone';
import { PIXEL_FRAME } from '@/components/time-machine/pixel';

/** Props for Composer. */
export interface ComposerProps {
  /** False while a reply is streaming or a recording is being transcribed. */
  enabled: boolean;
  onSend: (text: string) => void;
  onRecording: (rec: Recording) => void;
  /**
   * Called synchronously inside every tap that may later play audio, so the reply element is unlocked
   * on iOS: "on" when the mic opens, "off" when it closes, "silent" on Send.
   */
  onCue: (kind: EarconKind | 'silent') => void;
  /** Shown when the microphone is refused or missing. */
  onMicError: (message: string) => void;
  /** Called with true when a hold-to-talk press starts and false when it ends, so the ambience can go silent. */
  onMicOpenChange?: (open: boolean) => void;
}

/**
 * The message composer.
 *
 * @param props - Component props.
 * @param props.enabled - False while a reply streams or a recording is transcribed.
 * @param props.onSend - Called with the trimmed text.
 * @param props.onRecording - Called with a finished hold-to-talk recording.
 * @param props.onCue - Called inside every tap that may later play audio (iOS unlock, mic earcons).
 * @param props.onMicError - Called with a message when the microphone is refused or missing.
 * @param props.onMicOpenChange - Called with true on press and false on release or failure.
 * @returns The composer form.
 */
export function Composer({ enabled, onSend, onRecording, onCue, onMicError, onMicOpenChange }: ComposerProps) {
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const recorder = useRef<HoldToTalkRecorder | null>(null);
  const holding = useRef(false);

  // Release the microphone when the player leaves the chat, so the recording indicator goes away.
  useEffect(() => () => recorder.current?.close(), []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !enabled) return;
    onCue('silent');
    onSend(trimmed);
    setText('');
  };

  const finish = async () => {
    setRecording(false);
    onMicOpenChange?.(false);
    const rec = await recorder.current?.stop();
    if (rec) onRecording(rec);
  };

  const down = async (e: PointerEvent<HTMLButtonElement>) => {
    if (!enabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    onCue('on');
    holding.current = true;
    setRecording(true);
    // Before the mic opens, so the ambience is already fading when recording starts.
    onMicOpenChange?.(true);
    recorder.current ??= new HoldToTalkRecorder();
    try {
      await recorder.current.start();
      // The finger came up while the permission prompt was open.
      if (!holding.current) void finish();
    } catch (err) {
      holding.current = false;
      setRecording(false);
      onMicOpenChange?.(false);
      onMicError(err instanceof DOMException && err.name === 'NotAllowedError' ? 'Microphone access was refused. You can still type.' : 'No microphone available. You can still type.');
    }
  };

  const up = () => {
    if (!holding.current) return;
    holding.current = false;
    // finish() stops the recorder synchronously before its first await, so the off cue is not recorded.
    void finish();
    onCue('off');
  };

  const showMic = text.trim() === '';

  return (
    <form onSubmit={submit} className="flex items-end gap-2 border-t-[3px] border-(--ink) bg-(--paper-shade) px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={recording ? 'Listening… release to send' : 'Message'}
        disabled={recording}
        enterKeyHint="send"
        aria-label="Message"
        className="min-w-0 flex-1 rounded-full border-2 border-(--ink) bg-white px-4 py-2 text-[16px] outline-none focus:border-(--gold-dark)"
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
          className={`${PIXEL_FRAME} m-[3px] h-10 w-10 shrink-0 touch-none select-none text-lg [-webkit-touch-callout:none] disabled:opacity-40 ${
            recording ? 'scale-125 bg-(--brick) text-(--paper)' : 'bg-white text-(--ink)'
          } transition-transform`}
        >
          🎙
        </button>
      ) : (
        <button type="submit" disabled={!enabled} aria-label="Send" className={`${PIXEL_FRAME} m-[3px] h-10 w-10 shrink-0 bg-(--gold) text-lg font-bold text-(--ink) disabled:opacity-40`}>
          ↑
        </button>
      )}
    </form>
  );
}
