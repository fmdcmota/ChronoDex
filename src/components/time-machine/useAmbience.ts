/**
 * Period ambience under the Time Machine and the chat: a quiet loop for the era's period, lowered
 * while the guide speaks, with a mute switch saved per device.
 *
 * Owner: Agent 4. Phone test round 1, chat item 4. Pure parts are in ./ambience.ts.
 *
 * Why Web Audio and not an <audio loop> element: iOS Safari ignores `HTMLMediaElement.volume`, so an
 * element could neither stay quiet nor duck. An AudioBufferSourceNode through a GainNode does both and
 * loops without a gap. The AudioContext can only start inside a tap on iOS, so the hook listens for
 * the player's taps on the document and resumes it there; that also recovers it after iOS interrupts
 * it for the microphone.
 *
 * Known trap: Web Audio on iOS follows the ring/silent switch, so with the phone on silent the
 * ambience is silent while the guide's voice (an <audio> element) still plays. That is acceptable.
 */
'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { ambienceBucket, ambienceGain, ambienceUrl, placeholderLoop, type AmbienceBucket } from './ambience';

/** Saved setting: ambience muted. Per device. */
const MUTED_KEY = 'chronodex.ambience.muted';
/** How quickly the level follows a change (duck, unduck, mute). A time constant, in seconds. */
const GAIN_TIME_CONSTANT_S = 0.25;
/** Length of the placeholder loop. */
const PLACEHOLDER_LOOP_S = 8;

/**
 * One player per page. Module level so a client-side move from the Time Machine to the chat keeps
 * the unlocked AudioContext.
 */
class AmbiencePlayer {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private playing: AmbienceBucket | null = null;
  private wanted: AmbienceBucket | null = null;
  private buffers = new Map<AmbienceBucket, Promise<AudioBuffer>>();
  private level = 0;

  /**
   * Create or resume the AudioContext. Must run inside a tap the first time on iOS.
   *
   * Side effects: may create an AudioContext.
   */
  unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.gain = this.ctx.createGain();
      this.gain.gain.value = 0;
      this.gain.connect(this.ctx.destination);
    }
    if (this.ctx.state !== 'running') void this.ctx.resume().catch(() => undefined);
    if (this.wanted && this.playing !== this.wanted) void this.startLoop(this.wanted);
  }

  /**
   * Ask for a period's loop. Starts at once if the context is unlocked, otherwise on the next tap.
   *
   * @param bucket - The loop, or null for none.
   */
  want(bucket: AmbienceBucket | null): void {
    this.wanted = bucket;
    if (!bucket) {
      this.stopLoop();
      return;
    }
    if (this.ctx && this.playing !== bucket) void this.startLoop(bucket);
  }

  /**
   * Set the level, smoothly.
   *
   * @param level - 0 to 1.
   */
  setLevel(level: number): void {
    this.level = level;
    if (!this.ctx || !this.gain) return;
    this.gain.gain.setTargetAtTime(level, this.ctx.currentTime, GAIN_TIME_CONSTANT_S);
  }

  /** Load a bucket's loop: the real file, or the placeholder when it is missing or will not decode. */
  private loadBuffer(bucket: AmbienceBucket): Promise<AudioBuffer> {
    const ctx = this.ctx as AudioContext;
    let p = this.buffers.get(bucket);
    if (!p) {
      p = fetch(ambienceUrl(bucket))
        .then((res) => {
          if (!res.ok) throw new Error(`ambience ${res.status}`);
          return res.arrayBuffer();
        })
        .then((bytes) => ctx.decodeAudioData(bytes))
        .catch(() => {
          const samples = placeholderLoop(ctx.sampleRate, PLACEHOLDER_LOOP_S);
          const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
          buffer.copyToChannel(samples, 0);
          return buffer;
        });
      this.buffers.set(bucket, p);
    }
    return p;
  }

  private async startLoop(bucket: AmbienceBucket): Promise<void> {
    const ctx = this.ctx;
    if (!ctx || !this.gain) return;
    this.playing = bucket;
    const buffer = await this.loadBuffer(bucket);
    // The year may have changed while the file loaded.
    if (this.wanted !== bucket || this.playing !== bucket) return;
    this.source?.stop();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.gain);
    source.start();
    this.source = source;
    this.setLevel(this.level);
  }

  private stopLoop(): void {
    try {
      this.source?.stop();
    } catch {
      // Already stopped.
    }
    this.source = null;
    this.playing = null;
  }
}

/** The page's one ambience player. */
const player = new AmbiencePlayer();

/** What useAmbience gives a screen. */
export interface AmbienceControls {
  /** The player's saved mute setting. */
  muted: boolean;
  /** Flip mute and save it. Call from a tap. */
  toggleMuted: () => void;
}

/**
 * Play the period's ambience while the calling screen is mounted.
 *
 * Side effects: listens for taps on the document (to unlock and resume audio on iOS); plays sound;
 * reads and writes the mute setting in localStorage. Stops the loop on unmount.
 *
 * @param year - The era's year, or null while it is not known (no sound).
 * @param ducked - True while the guide speaks: the loop drops to AMBIENCE_DUCKED_GAIN.
 * @returns The mute state and switch.
 */
export function useAmbience(year: number | null, ducked: boolean): AmbienceControls {
  const muted = useSyncExternalStore(subscribeMuted, readMuted, () => false);
  const bucket = year === null ? null : ambienceBucket(year);

  useEffect(() => {
    const onTap = () => player.unlock();
    document.addEventListener('click', onTap, true);
    document.addEventListener('touchend', onTap, true);
    return () => {
      document.removeEventListener('click', onTap, true);
      document.removeEventListener('touchend', onTap, true);
    };
  }, []);

  useEffect(() => {
    player.want(bucket);
  }, [bucket]);

  useEffect(() => () => player.want(null), []);

  useEffect(() => {
    player.setLevel(ambienceGain(muted, ducked));
  }, [muted, ducked]);

  const toggleMuted = useCallback(() => {
    player.unlock();
    safeSet(MUTED_KEY, readMuted() ? '0' : '1');
    for (const l of mutedListeners) l();
  }, []);

  return { muted, toggleMuted };
}

/** Screens listening for a mute change (both screens may be mounted during a route change). */
const mutedListeners = new Set<() => void>();

/** useSyncExternalStore subscribe for the mute setting. */
function subscribeMuted(listener: () => void): () => void {
  mutedListeners.add(listener);
  return () => {
    mutedListeners.delete(listener);
  };
}

/** The saved mute setting. */
function readMuted(): boolean {
  return safeGet(MUTED_KEY) === '1';
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
