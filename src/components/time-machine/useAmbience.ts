/**
 * Period ambience under the Time Machine and the chat: two quiet loops (music and street) for the era's period,
 * lowered while the guide speaks, silent while the microphone records, with a mute switch saved per device.
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
import {
  LAYER_MIX,
  LOOP_CROSSFADE_S,
  ambienceBucket,
  ambienceGain,
  ambienceUrl,
  crossfadeLoop,
  placeholderLoop,
  type AmbienceBucket,
  type AmbienceLayer,
  type AmbienceMode,
  type AmbienceScene,
} from './ambience';

/** Saved setting: ambience muted. Per device. */
const MUTED_KEY = 'chronodex.ambience.muted';
/** How quickly the level follows a duck, unduck or mute. A time constant, in seconds. */
const GAIN_TIME_CONSTANT_S = 0.25;
/** Going silent for the microphone must be quick, or the tail is recorded. */
const SILENCE_TIME_CONSTANT_S = 0.03;
/** Length of the placeholder street loop. */
const PLACEHOLDER_LOOP_S = 8;
/** Both layers, in start order. */
const LAYERS: AmbienceLayer[] = ['music', 'street'];

/**
 * One player per page. Module level so a client-side move from the Time Machine to the chat keeps
 * the unlocked AudioContext.
 *
 * Graph: one AudioBufferSourceNode per layer (looped) → that layer's GainNode (LAYER_MIX) → the master
 * GainNode (scene and mode level) → speakers.
 */
class AmbiencePlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private layerGain = new Map<AmbienceLayer, GainNode>();
  private sources: AudioBufferSourceNode[] = [];
  private playing: AmbienceBucket | null = null;
  private wanted: AmbienceBucket | null = null;
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
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
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      for (const layer of LAYERS) {
        const g = ctx.createGain();
        g.gain.value = LAYER_MIX[layer];
        g.connect(master);
        this.layerGain.set(layer, g);
      }
      this.ctx = ctx;
      this.master = master;
    }
    if (this.ctx.state !== 'running') void this.ctx.resume().catch(() => undefined);
    if (this.wanted && this.playing !== this.wanted) void this.startLoops(this.wanted);
  }

  /**
   * Ask for a period's loops. Starts at once if the context is unlocked, otherwise on the next tap.
   *
   * @param bucket - The period, or null for none.
   */
  want(bucket: AmbienceBucket | null): void {
    this.wanted = bucket;
    if (!bucket) {
      this.stopLoops();
      return;
    }
    if (this.ctx && this.playing !== bucket) void this.startLoops(bucket);
  }

  /**
   * Set the master level, smoothly; quickly when going silent for the microphone.
   *
   * @param level - 0 to 1.
   */
  setLevel(level: number): void {
    this.level = level;
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(level, now, level === 0 ? SILENCE_TIME_CONSTANT_S : GAIN_TIME_CONSTANT_S);
  }

  /**
   * Load one layer, its end crossfaded into its start. A missing street file becomes the placeholder noise;
   * a missing music file stays silent.
   */
  private loadBuffer(bucket: AmbienceBucket, layer: AmbienceLayer): Promise<AudioBuffer | null> {
    const ctx = this.ctx as AudioContext;
    const key = `${bucket}:${layer}`;
    let p = this.buffers.get(key);
    if (!p) {
      p = fetch(ambienceUrl(bucket, layer))
        .then((res) => {
          if (!res.ok) throw new Error(`ambience ${res.status}`);
          return res.arrayBuffer();
        })
        .then((bytes) => ctx.decodeAudioData(bytes))
        .then((decoded) => {
          const fade = Math.round(decoded.sampleRate * LOOP_CROSSFADE_S);
          const looped = ctx.createBuffer(decoded.numberOfChannels, decoded.length - Math.min(fade, Math.floor(decoded.length / 2)), decoded.sampleRate);
          for (let ch = 0; ch < decoded.numberOfChannels; ch++) looped.copyToChannel(crossfadeLoop(decoded.getChannelData(ch), fade), ch);
          return looped;
        })
        .catch(() => {
          if (layer === 'music') return null;
          const samples = placeholderLoop(ctx.sampleRate, PLACEHOLDER_LOOP_S);
          const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
          buffer.copyToChannel(samples, 0);
          return buffer;
        });
      this.buffers.set(key, p);
    }
    return p;
  }

  private async startLoops(bucket: AmbienceBucket): Promise<void> {
    const ctx = this.ctx;
    if (!ctx) return;
    this.playing = bucket;
    const buffers = await Promise.all(LAYERS.map((layer) => this.loadBuffer(bucket, layer)));
    // The year may have changed while the files loaded.
    if (this.wanted !== bucket || this.playing !== bucket) return;
    this.stopSources();
    LAYERS.forEach((layer, i) => {
      const buffer = buffers[i];
      const gain = this.layerGain.get(layer);
      if (!buffer || !gain) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gain);
      source.start();
      this.sources.push(source);
    });
    this.setLevel(this.level);
  }

  private stopSources(): void {
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        // Already stopped.
      }
    }
    this.sources = [];
  }

  private stopLoops(): void {
    this.stopSources();
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
 * @param mode - normal; ducked while the guide speaks; silent while the microphone records (use ambienceMode).
 * @param scene - Which screen: the chat plays much lower than the Time Machine (AMBIENCE_LEVELS).
 * @returns The mute state and switch.
 */
export function useAmbience(year: number | null, mode: AmbienceMode, scene: AmbienceScene): AmbienceControls {
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
    player.setLevel(ambienceGain(muted, mode, scene));
  }, [muted, mode, scene]);

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
