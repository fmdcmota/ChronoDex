/**
 * The guide chat screen: a text-message thread with the guide of one landmark and year.
 *
 * Owner: Agent 4. Spike for A4-07 (text chat) and A4-08 (voice in and out), MASTER.md sections 1.2
 * part 3 and 11. Becomes `src/app/chat/[eraId]/` once the scaffold lands; the Era comes from
 * GET /api/eras/[eraId] then, and from a fixture here.
 *
 * Flow: the thread opens with the guide's greeting (or the saved history). Sending appends the
 * player's message, shows the typing dots, then streams the reply into a growing bubble. With
 * voice on, each finished reply is spoken through one <audio> element that was unlocked by the
 * send tap, because iOS blocks audio started later without a gesture (media spike test 2C).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage, EraId, Guide } from './contracts';
import { ChatHeader } from './ChatHeader';
import { Composer } from './Composer';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { clearHistory, loadHistory, saveHistory } from './history';
import { ApiError, speak, streamChat, transcribe } from './api';
import { extensionFor, type Recording } from '../media/recorder';
import { sineWav } from '../media/tone';

/** Props for ChatScreen. */
export interface ChatScreenProps {
  eraId: EraId;
  year: number;
  guide: Guide;
  playerId: string;
  backHref: string;
}

/** What the screen is doing right now. Input is disabled unless idle. */
type Phase = 'idle' | 'transcribing' | 'waiting' | 'streaming';

/** Saved setting: read replies aloud. Per device, not per era. */
const READ_ALOUD_KEY = 'chronodex.chat.readAloud';

/**
 * Full-height chat screen.
 *
 * @param props - The era, its guide, the anonymous player id and the back link.
 * @returns The screen.
 */
export function ChatScreen({ eraId, year, guide, playerId, backHref }: ChatScreenProps) {
  const greeting: ChatMessage = { role: 'guide', text: guide.greeting };
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = loadHistory(eraId);
    return saved.length > 0 ? saved : [greeting];
  });
  const [phase, setPhase] = useState<Phase>('idle');
  const [streamText, setStreamText] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [readAloud, setReadAloud] = useState(() => safeGet(READ_ALOUD_KEY) === '1');
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

  const audio = useRef<HTMLAudioElement | null>(null);
  const abort = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement | null>(null);

  // Keep the newest message in view as text streams in.
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [messages, streamText, phase]);

  // Stop any reply in flight when the player leaves.
  useEffect(() => () => abort.current?.abort(), []);

  /** Unlock the shared audio element for iOS. Must run synchronously inside a tap. */
  const unlockAudio = useCallback(() => {
    audio.current ??= new Audio();
    const el = audio.current;
    if (!el.paused) return;
    el.src = URL.createObjectURL(new Blob([sineWav(1, 50)], { type: 'audio/wav' }));
    void el.play().catch(() => undefined);
  }, []);

  /** Speak message `index` in the guide's voice. */
  const playMessage = useCallback(
    async (index: number, text: string) => {
      const el = (audio.current ??= new Audio());
      setSpeakingIndex(index);
      try {
        el.src = await speak(eraId, text);
        el.onended = () => setSpeakingIndex(null);
        await el.play();
      } catch (err) {
        setSpeakingIndex(null);
        setNotice(`Could not play the voice: ${describe(err)}`);
      }
    },
    [eraId],
  );

  /** Send one player message and stream the reply. */
  const send = useCallback(
    async (text: string) => {
      setNotice(null);
      const withMine = [...messages, { role: 'player' as const, text }];
      setMessages(withMine);
      saveHistory(eraId, withMine);
      setPhase('waiting');
      setStreamText('');

      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      let finalText: string | null = null;
      let errorText: string | null = null;
      let partial = '';
      try {
        await streamChat(
          { eraId, playerId, messages: withMine },
          (e) => {
            if (e.type === 'delta') {
              partial += e.text;
              setPhase('streaming');
              setStreamText(partial);
            } else if (e.type === 'done') {
              finalText = e.text;
            } else {
              errorText = e.message;
            }
          },
          ctrl.signal,
        );
      } catch (err) {
        if (ctrl.signal.aborted) return;
        errorText = describe(err);
      }

      // A stream that ends without `done` keeps whatever arrived, if anything did.
      const reply = finalText ?? (partial.trim() ? partial : null);
      setPhase('idle');
      setStreamText('');
      if (reply) {
        const all = [...withMine, { role: 'guide' as const, text: reply }];
        setMessages(all);
        saveHistory(eraId, all);
        if (readAloud) void playMessage(all.length - 1, reply);
      }
      if (errorText || !reply) {
        const reason = (errorText ?? 'no reply').replace(/[.\s]+$/, '');
        setNotice(`The guide could not answer: ${reason}. Try again.`);
      }
    },
    [messages, eraId, playerId, readAloud, playMessage],
  );

  /** Transcribe a hold-to-talk recording, then send it as a message. */
  const sendRecording = useCallback(
    async (rec: Recording) => {
      setPhase('transcribing');
      setNotice(null);
      try {
        const text = (await transcribe(rec.blob, `voice.${extensionFor(rec.type)}`)).trim();
        setPhase('idle');
        if (text) void send(text);
        else setNotice("Didn't catch that. Hold the mic and try again.");
      } catch (err) {
        setPhase('idle');
        setNotice(`Could not understand the recording: ${describe(err)}`);
      }
    },
    [send],
  );

  const reset = () => {
    abort.current?.abort();
    clearHistory(eraId);
    setMessages([greeting]);
    setPhase('idle');
    setStreamText('');
    setNotice(null);
  };

  const toggleReadAloud = () => {
    unlockAudio();
    setReadAloud((on) => {
      safeSet(READ_ALOUD_KEY, on ? '0' : '1');
      return !on;
    });
  };

  return (
    <div className="flex h-dvh flex-col bg-white">
      <ChatHeader guide={guide} year={year} backHref={backHref} readAloud={readAloud} onToggleReadAloud={toggleReadAloud} onReset={reset} />
      <main className="flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-4">
        <p className="pb-2 text-center text-[11px] text-zinc-400">
          {guide.name} is a fictional guide. Answers draw on the era&apos;s sources but may be wrong.
        </p>
        {messages.map((m, i) => (
          <MessageBubble
            key={i}
            message={m}
            onSpeak={m.role === 'guide' ? () => { unlockAudio(); void playMessage(i, m.text); } : undefined}
            speaking={speakingIndex === i}
          />
        ))}
        {phase === 'waiting' && <TypingIndicator />}
        {phase === 'streaming' && <MessageBubble message={{ role: 'guide', text: streamText }} streaming />}
        {phase === 'transcribing' && <p className="text-right text-xs text-zinc-400">Listening back…</p>}
        {notice && (
          <p role="alert" className="mx-auto max-w-[90%] rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
            {notice}
          </p>
        )}
        <div ref={bottom} />
      </main>
      <Composer
        enabled={phase === 'idle'}
        onSend={(t) => void send(t)}
        onRecording={(r) => void sendRecording(r)}
        onUserGesture={unlockAudio}
        onMicError={setNotice}
      />
    </div>
  );
}

/** Human-readable reason from any thrown value. */
function describe(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof TypeError) return 'no connection';
  return err instanceof Error ? err.message : String(err);
}

/** localStorage read that survives blocked storage. */
function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** localStorage write that survives blocked or full storage. */
function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Setting is lost on reload. Acceptable.
  }
}
