/**
 * Live player position from the browser, with a development spoof (MASTER.md task A3-05).
 *
 * Owner: Agent 3 (Explorer). Ported from spikes/agent-3/src/lib/location.ts, with the spike's
 * `./contracts-copy` swapped for `@/lib/contracts`.
 *
 * One small state machine that any screen can subscribe to. Framework-free on purpose, so the
 * app can wrap it in a React hook (`usePlayerLocation`) at the port without changing the logic.
 *
 * Browser facts this relies on:
 * - Geolocation works only in a secure context (HTTPS or localhost). On plain HTTP the browser
 *   refuses without prompting, so that case is reported as its own state, not as "denied".
 * - `watchPosition` error codes: 1 PERMISSION_DENIED, 2 POSITION_UNAVAILABLE, 3 TIMEOUT.
 * - iOS Safari asks once per site. After a "Don't allow" the player has to change it in
 *   Settings, so the denied message says where.
 */
import type { LatLng } from '@/lib/contracts';

/** Where the position came from. A spoofed fix is marked so the server can refuse it (A1-14). */
export type FixSource = 'gps' | 'spoof';

/** One position reading. */
export interface PlayerFix {
  position: LatLng;
  /** Accuracy radius the browser reported, in metres (68 % confidence). */
  accuracyM: number;
  source: FixSource;
  /** When the reading was taken, epoch milliseconds. */
  atMs: number;
}

/** Everything a screen needs to show the location state. */
export type LocationState =
  | { status: 'idle' }
  | { status: 'unsupported' }
  | { status: 'insecure' }
  | { status: 'locating' }
  | { status: 'ready'; fix: PlayerFix }
  | { status: 'denied' }
  | { status: 'unavailable'; lastFix: PlayerFix | null }
  | { status: 'timeout'; lastFix: PlayerFix | null };

/** Give up on a single reading after this long. watchPosition keeps trying afterwards. */
const FIX_TIMEOUT_MS = 15_000;
/** Accept a cached reading up to this old, so the map has a dot straight away. */
const MAX_FIX_AGE_MS = 5_000;

/**
 * A short sentence for each state, written for the player.
 *
 * @param state - Current location state.
 * @returns The message, or null when there is nothing to say (a good fix).
 */
export function locationMessage(state: LocationState): string | null {
  switch (state.status) {
    case 'idle':
      return 'Share your location to see where you are on the map.';
    case 'unsupported':
      return 'This browser cannot share its location. Try Safari or Chrome.';
    case 'insecure':
      return 'Location needs a secure (https) link. Open the https address instead.';
    case 'locating':
      return 'Finding you…';
    case 'ready':
      return null;
    case 'denied':
      return 'Location is blocked. Allow it for this site in your browser settings (on iPhone: Settings, Safari, Location), then reload.';
    case 'unavailable':
      return 'Your phone cannot get a position right now. Step outside or away from tall buildings.';
    case 'timeout':
      return 'Still looking for a GPS signal…';
  }
}

/** Called with every state change. */
export type LocationListener = (state: LocationState) => void;

/**
 * Tracks the player's position. Call start() from a user gesture (a button press), because
 * some browsers only show the permission prompt in response to one.
 */
export class LocationTracker {
  private state: LocationState = { status: 'idle' };
  private watchId: number | null = null;
  private lastFix: PlayerFix | null = null;
  private spoofed = false;
  private readonly listeners = new Set<LocationListener>();

  /** The current state. */
  get current(): LocationState {
    return this.state;
  }

  /**
   * Subscribe to state changes. The listener is called once at once with the current state.
   *
   * @returns A function that unsubscribes.
   */
  subscribe(listener: LocationListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  /**
   * Ask for permission and start watching the position. Safe to call twice.
   * Side effects: may show the browser's location prompt. Keeps the GPS on until stop().
   */
  start(): void {
    if (this.watchId !== null || this.spoofed) return;
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return this.emit({ status: 'unsupported' });
    if (typeof window !== 'undefined' && !window.isSecureContext) return this.emit({ status: 'insecure' });
    this.emit({ status: 'locating' });
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (this.spoofed) return;
        const fix: PlayerFix = {
          position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          accuracyM: pos.coords.accuracy,
          source: 'gps',
          atMs: pos.timestamp,
        };
        this.lastFix = fix;
        this.emit({ status: 'ready', fix });
      },
      (err) => {
        if (this.spoofed) return;
        if (err.code === err.PERMISSION_DENIED) {
          this.stopWatching();
          this.emit({ status: 'denied' });
        } else if (err.code === err.TIMEOUT) {
          this.emit({ status: 'timeout', lastFix: this.lastFix });
        } else {
          this.emit({ status: 'unavailable', lastFix: this.lastFix });
        }
      },
      { enableHighAccuracy: true, timeout: FIX_TIMEOUT_MS, maximumAge: MAX_FIX_AGE_MS },
    );
  }

  /**
   * Development only: pretend to be somewhere. Stops real GPS readings from overriding it
   * until clearSpoof(). Screens show it only when NEXT_PUBLIC_DEV_TOOLS=1, and the server
   * refuses spoofed captures unless ALLOW_SPOOFED_LOCATION=1 (MASTER.md section 8.2).
   *
   * @param position - Where to pretend to be.
   * @param accuracyM - Accuracy to report.
   */
  spoof(position: LatLng, accuracyM: number): void {
    this.spoofed = true;
    this.emit({ status: 'ready', fix: { position, accuracyM, source: 'spoof', atMs: Date.now() } });
  }

  /** End the spoof and go back to real GPS. */
  clearSpoof(): void {
    if (!this.spoofed) return;
    this.spoofed = false;
    if (this.lastFix && this.watchId !== null) this.emit({ status: 'ready', fix: this.lastFix });
    else {
      this.stopWatching();
      this.emit({ status: 'idle' });
    }
  }

  /** Stop the GPS. Call when the screen unmounts. */
  stop(): void {
    this.stopWatching();
    this.spoofed = false;
    this.emit({ status: 'idle' });
  }

  private stopWatching(): void {
    if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
  }

  private emit(state: LocationState): void {
    this.state = state;
    for (const l of this.listeners) l(state);
  }
}
