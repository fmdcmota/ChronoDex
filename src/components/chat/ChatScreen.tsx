/**
 * The guide chat: a text-message thread with the guide of one landmark and year.
 *
 * Owner: Agent 4. Implements A4-07 (text chat) and A4-08 (voice in and out), MASTER.md sections
 * 1.2 part 3, 7 (chat rules live on the server) and 11. Proven in spikes/agent-4/chat.html.
 *
 * Data: `api.getEra` for the guide; `api.streamChat` (POST /api/chat, Claude, a fraction of a cent
 * per reply) streams the answer; `api.textToSpeech` (fal Eleven v4 turbo, about $0.04 per 1,000
 * characters) and `api.speechToText` (fal Scribe v2, about $0.008 per minute) handle voice.
 *
 * Flow: the thread opens with the guide's greeting, or the history saved for this era. Sending
 * appends the player's message, shows the typing dots, then streams the reply into a growing
 * bubble. With voice on, each finished reply is spoken through one <audio> element that was
 * unlocked by the send tap, because iOS blocks audio started later without a gesture.
 * Every tap that may lead to sound plays a cue on that element (./audio.ts): a soft rising or
 * falling earcon for the mic and the voice switch, silence for Send. Reset (↺) clears the thread,
 * shows the typing dots for GREETING_DELAY_MS, then the greeting arrives again.
 * Period ambience plays underneath (../time-machine/useAmbience.ts) and drops while the guide speaks.
 * While the era's job runs, the screen polls it, so the guide and headshot appear without a reload.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GAME, parseEraId, type ChatMessage, type Era, type EraId, type EraResponse } from '@/lib/contracts';
import { ApiError, api, getPlayerId } from '@/lib/client';
import { ChatHeader } from './ChatHeader';
import { Composer } from './Composer';
import { MessageBubble } from './MessageBubble';
import { failureNotice } from './notice';
import { NextStopCard } from './NextStopCard';
import { chatHasExchange } from './nextStop';
import { TypingIndicator } from './TypingIndicator';
import { clearHistory, loadHistory, saveHistory } from './history';
import { hasAudio, type Recording } from './recorder';
import { playCue, playUrl } from './audio';
import type { EarconKind } from './tone';
import { BTN_PRIMARY } from '@/components/time-machine/pixel';
import { useAmbience } from '@/components/time-machine/useAmbience';

/** Props for ChatScreen. */
export interface ChatScreenProps {
  eraId: EraId;
}

/** What the screen is doing right now. Input is enabled only when idle. */
type Phase = 'idle' | 'transcribing' | 'waiting' | 'streaming';

/** Saved setting: read replies aloud. Per device, not per era. */
const READ_ALOUD_KEY = 'chronodex.chat.readAloud';
/** After a reset, how long the typing dots show before the greeting arrives again. */
export const GREETING_DELAY_MS = 1000;
/** Shown instead of sending an empty or near-empty recording, or an empty transcript. */
export const NOT_CAUGHT_NOTICE = "Didn't catch that. Hold the mic and try again.";

/**
 * Full-screen chat for one era. Loads the era, then renders the thread.
 *
 * @param props - Component props.
 * @param props.eraId - The era, from the route.
 * @returns The screen.
 */
export function ChatScreen({ eraId }: ChatScreenProps) {
  const [loaded, setLoaded] = useState<EraResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const backHref = backHrefFor(eraId);
  const era = loaded?.era ?? null;

  useEffect(() => {
    let live = true;
    api.getEra(eraId).then(
      (res) => live && setLoaded(res),
      (err: unknown) => live && setLoadError(describe(err)),
    );
    return () => {
      live = false;
    };
  }, [eraId]);

  // While the era's job runs and the guide or its headshot is missing, poll so they appear without a reload.
  const waitingForGuide = Boolean(loaded?.job) && !loaded?.era.guide?.headshotUrl;
  useEffect(() => {
    if (!waitingForGuide) return;
    const timer = setInterval(() => {
      api.getEra(eraId).then(setLoaded, () => undefined);
    }, GAME.POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [waitingForGuide, eraId]);

  if (!era?.guide) {
    const message =
      loadError ??
      (!era
        ? 'Finding your guide…'
        : loaded?.job
          ? 'Your guide is on the way. This page updates by itself.'
          : 'This guide has not arrived yet. Open the Time Machine for this year first.');
    return (
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-(--paper) p-6 text-center text-(--ink-soft)">
        <p>{message}</p>
        {(loadError || era) && (
          <a href={backHref} className={BTN_PRIMARY}>
            Back to the Time Machine
          </a>
        )}
      </div>
    );
  }

  return <ChatThread era={era as Era & { guide: NonNullable<Era['guide']> }} backHref={backHref} />;
}

/** Props for the loaded thread. */
interface ChatThreadProps {
  era: Era & { guide: NonNullable<Era['guide']> };
  backHref: string;
}

/**
 * The thread itself, once the era and its guide are known.
 *
 * @param props - Component props.
 * @param props.era - The era, with a guide.
 * @param props.backHref - The back link.
 * @returns The thread.
 */
function ChatThread({ era, backHref }: ChatThreadProps) {
  const { id: eraId, year, guide } = era;
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = loadHistory(eraId);
    return saved.length > 0 ? saved : [{ role: 'guide', text: guide.greeting }];
  });
  const [phase, setPhase] = useState<Phase>('idle');
  const [streamText, setStreamText] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [readAloud, setReadAloud] = useState(() => safeGet(READ_ALOUD_KEY) === '1');
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const ambience = useAmbience(year, speakingIndex !== null);

  const audio = useRef<HTMLAudioElement | null>(null);
  const abort = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement | null>(null);
  const greetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the newest message in view as text streams in.
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [messages, streamText, phase]);

  // Stop any reply in flight, any audio and the greeting timer when the player leaves.
  useEffect(
    () => () => {
      abort.current?.abort();
      audio.current?.pause();
      if (greetTimer.current) clearTimeout(greetTimer.current);
    },
    [],
  );

  /**
   * Play a cue on the shared reply element. Must run synchronously inside a tap: that also unlocks
   * the element on iOS for a reply that arrives later. A silent cue does not cut off a reply playing.
   */
  const cue = useCallback((kind: EarconKind | 'silent') => {
    const el = (audio.current ??= new Audio());
    if (kind === 'silent' && !el.paused) return;
    el.onpause = el.onended = null;
    setSpeakingIndex(null);
    playCue(el, kind);
  }, []);

  /** Speak message `index` in the guide's voice. */
  const playMessage = useCallback(
    async (index: number, text: string) => {
      const el = (audio.current ??= new Audio());
      el.onpause = el.onended = null;
      setSpeakingIndex(index);
      try {
        await playUrl(el, await api.textToSpeech(eraId, text));
        el.onpause = el.onended = () => setSpeakingIndex(null);
      } catch (err) {
        setSpeakingIndex(null);
        setNotice(`Could not play the voice: ${describe(err)}.`);
      }
    },
    [eraId],
  );

  /** Send one player message and stream the reply. */
  const send = useCallback(
    async (text: string) => {
      setNotice(null);
      const withMine: ChatMessage[] = [...messages, { role: 'player', text }];
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
        for await (const e of api.streamChat({ eraId, playerId: getPlayerId(), messages: withMine }, { signal: ctrl.signal })) {
          if (e.type === 'delta') {
            partial += e.text;
            setPhase('streaming');
            setStreamText(partial);
          } else if (e.type === 'done') {
            finalText = e.text;
          } else {
            errorText = e.message;
          }
        }
      } catch (err) {
        if (ctrl.signal.aborted) return;
        errorText = describe(err);
      }
      if (ctrl.signal.aborted) return;

      // A stream that ends without `done` keeps whatever arrived, if anything did.
      const reply = finalText ?? (partial.trim() ? partial : null);
      setPhase('idle');
      setStreamText('');
      if (reply) {
        const all: ChatMessage[] = [...withMine, { role: 'guide', text: reply }];
        setMessages(all);
        saveHistory(eraId, all);
        if (readAloud) void playMessage(all.length - 1, reply);
      }
      if (errorText || !reply) {
        setNotice(failureNotice(guide.name, errorText));
      }
    },
    [messages, eraId, guide.name, readAloud, playMessage],
  );

  /** Transcribe a hold-to-talk recording, then send it as a message. */
  const sendRecording = useCallback(
    async (rec: Recording) => {
      setNotice(null);
      // iOS sometimes hands back a few bytes and no sound (phone test round 1, MEDIA-5): never send those.
      if (!hasAudio(rec)) {
        setNotice(NOT_CAUGHT_NOTICE);
        return;
      }
      setPhase('transcribing');
      try {
        const text = (await api.speechToText(rec.blob)).trim();
        setPhase('idle');
        if (text) void send(text);
        else setNotice(NOT_CAUGHT_NOTICE);
      } catch (err) {
        setPhase('idle');
        setNotice(`Could not understand the recording: ${describe(err)}.`);
      }
    },
    [send],
  );

  /** Start over: clear the thread, show the typing dots, then the greeting arrives (read aloud if voice is on). */
  const reset = () => {
    abort.current?.abort();
    if (greetTimer.current) clearTimeout(greetTimer.current);
    audio.current?.pause();
    cue('silent');
    clearHistory(eraId);
    setMessages([]);
    setPhase('waiting');
    setStreamText('');
    setNotice(null);
    greetTimer.current = setTimeout(() => {
      greetTimer.current = null;
      setMessages([{ role: 'guide', text: guide.greeting }]);
      setPhase('idle');
      if (readAloud) void playMessage(0, guide.greeting);
    }, GREETING_DELAY_MS);
  };

  const toggleReadAloud = () => {
    cue(readAloud ? 'off' : 'on');
    setReadAloud((on) => {
      safeSet(READ_ALOUD_KEY, on ? '0' : '1');
      return !on;
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-(--paper) text-(--ink)">
      <ChatHeader
        guide={guide}
        year={year}
        backHref={backHref}
        readAloud={readAloud}
        onToggleReadAloud={toggleReadAloud}
        ambienceMuted={ambience.muted}
        onToggleAmbience={ambience.toggleMuted}
        onReset={reset}
      />
      <main className="flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-4">
        <p className="m-0! pb-2 text-center text-[11px] text-(--ink-soft)">
          {guide.name} is a fictional guide. Answers draw on the era&apos;s sources but may be wrong.
        </p>
        {messages.map((m, i) => (
          <MessageBubble
            key={i}
            message={m}
            onSpeak={
              m.role === 'guide'
                ? () => {
                    cue('silent');
                    void playMessage(i, m.text);
                  }
                : undefined
            }
            speaking={speakingIndex === i}
          />
        ))}
        {phase === 'waiting' && <TypingIndicator />}
        {phase === 'streaming' && <MessageBubble message={{ role: 'guide', text: streamText }} streaming />}
        {phase === 'transcribing' && <p className="m-0! text-right text-xs text-(--ink-soft)">Listening back…</p>}
        {notice && (
          <p role="alert" className="mx-auto! max-w-[90%] bg-(--paper-shade) px-3 py-2 text-center text-xs text-(--ink)">
            {notice}
          </p>
        )}
        {phase === 'idle' && chatHasExchange(messages) && <NextStopCard landmarkId={era.landmarkId} />}
        <div ref={bottom} />
      </main>
      <Composer
        enabled={phase === 'idle'}
        onSend={(t) => void send(t)}
        onRecording={(r) => void sendRecording(r)}
        onCue={cue}
        onMicError={setNotice}
      />
    </div>
  );
}

/**
 * Back link for an era's chat: that landmark's Time Machine.
 *
 * @param eraId - The era.
 * @returns `/time/<landmarkId>`, or `/` when the id is malformed.
 */
export function backHrefFor(eraId: EraId): string {
  try {
    return `/time/${parseEraId(eraId).landmarkId}`;
  } catch {
    return '/';
  }
}

/** Human-readable reason from any thrown value. */
function describe(err: unknown): string {
  if (err instanceof ApiError) return err.message;
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
    // The setting is lost on reload. Acceptable.
  }
}
