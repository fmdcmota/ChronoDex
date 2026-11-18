/**
 * The duck tutorial over the Map screen: the screen darkens, Professor Puddles (the Emma duck in its mortarboard)
 * waddles in and explains the game in five speech bubbles, about 15 seconds, babbling in chirpy blips as each
 * letter types out (lib/duck-voice.ts).
 *
 * Owner: Agent 3 (Explorer). Added at the human's request, 18 Nov 2026. Plays once per browser session, after the
 * welcome intro (lib/duck-tutorial.ts); `?duck=1` forces it, `?duck=0` skips it.
 *
 * Taps: a tap while a line is typing finishes it; a tap on a finished line goes to the next one. "Skip" ends it.
 * HOW TO REMOVE IT: delete the `<DuckTutorial />` block and its import in MapScreen.tsx.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { TUTORIAL_LINES, TUTORIAL_TIMING } from './lib/duck-tutorial';
import { playBlip, unlockDuckVoice } from './lib/duck-voice';

/** Props of DuckTutorial. */
export interface DuckTutorialProps {
  /** Called once the tutorial has faded out (finished or skipped). */
  onDone: () => void;
}

/**
 * The tutorial overlay.
 *
 * @param props - See DuckTutorialProps.
 * @param props.onDone - Called once it has gone.
 * @returns The overlay, until it has finished.
 */
export default function DuckTutorial({ onDone }: DuckTutorialProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [shown, setShown] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const line = TUTORIAL_LINES[lineIndex] ?? '';
  const typing = shown < line.length;
  const last = lineIndex >= TUTORIAL_LINES.length - 1;

  const leave = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
    setTimeout(() => onDoneRef.current(), TUTORIAL_TIMING.LEAVE_MS);
  }, []);

  const next = useCallback(() => {
    if (last) leave();
    else {
      setLineIndex((i) => i + 1);
      setShown(0);
    }
  }, [last, leave]);

  // Type the line out one character at a time, a blip per letter (every other one, so it chatters, not buzzes).
  useEffect(() => {
    if (leaving) return;
    if (typing) {
      const t = setTimeout(
        () => {
          const char = line[shown] ?? '';
          if (shown % 2 === 0) playBlip(char);
          setShown(shown + 1);
        },
        shown === 0 && lineIndex === 0 ? TUTORIAL_TIMING.ENTER_MS : TUTORIAL_TIMING.CHAR_MS,
      );
      return () => clearTimeout(t);
    }
    const t = setTimeout(next, TUTORIAL_TIMING.HOLD_MS);
    return () => clearTimeout(t);
  }, [shown, typing, line, lineIndex, next, leaving]);

  /** Any tap: wake the audio (it needs a tap), then finish the line or move on. */
  const onTap = () => {
    unlockDuckVoice();
    if (typing) setShown(line.length);
    else next();
  };

  return (
    <div
      className={`dt-root${leaving ? ' dt-leaving' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="How to play"
      onPointerDown={onTap}
    >
      <style>{DUCK_TUTORIAL_CSS}</style>
      <button
        type="button"
        className="dt-skip"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={leave}
      >
        SKIP ▶▶
      </button>

      <div className="dt-stage">
        <div className="dt-bubble" aria-live="polite">
          <p>
            {line.slice(0, shown)}
            <span className="dt-ghost" aria-hidden="true">
              {line.slice(shown)}
            </span>
          </p>
          <div className="dt-foot">
            <span className="dt-dots" aria-hidden="true">
              {TUTORIAL_LINES.map((_, i) => (
                <i key={i} className={i <= lineIndex ? 'on' : ''} />
              ))}
            </span>
            {!typing && <span className="dt-more">{last ? 'GO! ▶' : '▼'}</span>}
          </div>
        </div>
        <div className={`dt-duck${typing ? ' dt-talking' : ''}`} aria-hidden="true" />
      </div>
    </div>
  );
}

/**
 * Styles, rendered in a <style> tag (this repo's CSS rule breaks CSS modules; see WelcomeIntro.styles.ts).
 * Every class is prefixed `dt-`. The sprite is public/sprites/duck/professor.png: two 96 px frames side by side,
 * shown at 1.5x (3 device pixels per art pixel on a 2x phone, so it stays sharp).
 */
const DUCK_TUTORIAL_CSS = `
.dt-root {
  position: fixed;
  inset: 0;
  z-index: 70;
  background: rgba(12, 9, 24, 0.74);
  font-family: var(--font-pixel);
  color: var(--ink);
  touch-action: none;
  cursor: pointer;
  animation: dt-fade-in ${TUTORIAL_TIMING.ENTER_MS}ms ease both;
}
.dt-leaving { animation: dt-fade-out ${TUTORIAL_TIMING.LEAVE_MS}ms ease both; }
@keyframes dt-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes dt-fade-out { from { opacity: 1; } to { opacity: 0; } }

.dt-skip {
  position: absolute;
  top: calc(var(--safe-top) + 14px);
  right: 14px;
  font-family: var(--font-pixel);
  font-size: 20px;
  color: var(--paper);
  background: transparent;
  border: 2px solid rgba(246, 239, 217, 0.5);
  padding: 4px 10px;
  cursor: pointer;
}

.dt-stage {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(var(--safe-bottom) + 28px);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0 16px;
  max-width: 520px;
  margin: 0 auto;
}

.dt-bubble {
  position: relative;
  align-self: stretch;
  background: var(--paper);
  box-shadow: var(--pixel-frame), 0 8px 0 0 rgba(0, 0, 0, 0.35);
  margin: 0 3px 22px;
  padding: 14px 16px 10px;
  animation: dt-pop 260ms cubic-bezier(.2,1.6,.4,1) both;
  animation-delay: 120ms;
}
.dt-bubble p {
  margin: 0;
  font-size: 26px;
  line-height: 1.08;
  min-height: 2.16em;
}
.dt-ghost { visibility: hidden; }
/* The tail, pointing down at the duck. */
.dt-bubble::after {
  content: '';
  position: absolute;
  left: 104px;
  bottom: -18px;
  width: 18px;
  height: 18px;
  background: var(--paper);
  clip-path: polygon(0 0, 100% 0, 0 100%);
  filter: drop-shadow(-3px 0 0 var(--ink)) drop-shadow(0 3px 0 var(--ink));
}
@keyframes dt-pop { from { transform: scale(0.6) translateY(20px); opacity: 0; } to { transform: none; opacity: 1; } }

.dt-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
  min-height: 20px;
}
.dt-dots { display: flex; gap: 5px; }
.dt-dots i {
  width: 8px;
  height: 8px;
  background: var(--paper-shade);
}
.dt-dots i.on { background: var(--gold-dark); }
.dt-more {
  font-size: 20px;
  color: var(--brick);
  animation: dt-blink 0.8s steps(2) infinite;
}
@keyframes dt-blink { 50% { opacity: 0; } }

.dt-duck {
  width: 144px;
  height: 144px;
  margin-left: 8px;
  background: url('/sprites/duck/professor.png') 0 0 / 288px 144px no-repeat;
  image-rendering: pixelated;
  transform-origin: 50% 100%;
  animation: dt-waddle-in 700ms steps(6) both;
}
.dt-talking {
  animation: dt-waddle-in 700ms steps(6) both, dt-frames 0.24s steps(1) infinite, dt-bob 0.24s ease-in-out infinite;
}
@keyframes dt-waddle-in { from { translate: -180px 0; } to { translate: 0 0; } }
@keyframes dt-frames { 0% { background-position-x: 0; } 50% { background-position-x: -144px; } }
@keyframes dt-bob { 0%, 100% { transform: translateY(0) scaleY(1); } 50% { transform: translateY(-4px) scaleY(1.03); } }

@media (prefers-reduced-motion: reduce) {
  .dt-duck, .dt-talking, .dt-bubble { animation: none; }
}
`;
