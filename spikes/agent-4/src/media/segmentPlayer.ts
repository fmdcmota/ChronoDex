/**
 * Play the guide video's segments (walk_on, talk, walk_off) back to back with no visible gap.
 *
 * Owner: Agent 4. Spike for A4-04 (MASTER.md section 11, decision D-008), written to be lifted
 * into src/components/time-machine/ once the scaffold exists.
 *
 * Why two <video> elements: changing `src` on one element blanks it while the next file loads,
 * which shows as a black flash between clips. Instead the next clip is preloaded in a second,
 * hidden element sitting under the first. When the current clip ends, the hidden one is shown
 * (it already displays its first frame) and played, and the old one loads the clip after that.
 *
 * Why `prime()`: iOS Safari only lets an element play with sound once it has been played from a
 * user gesture. The standby element is started by an `ended` event, not a tap, so both elements
 * are played and paused once inside the first tap.
 */

/** One clip to play. Same fields as the contract's `VideoSegment` that the player needs. */
export interface PlayableSegment {
  url: string;
  /** Label for logs, for example "walk_on". */
  kind: string;
}

/** Emitted measurements, so the spike can show how big each gap was. */
export interface SegmentPlayerEvents {
  /** A clip started. `gapMs` is the time from the previous clip's end to this one playing. */
  onSegmentStart?: (index: number, kind: string, gapMs: number | null) => void;
  /** The last clip ended. */
  onFinished?: () => void;
  /** A clip failed to load or play. The player skips to the next one. */
  onError?: (index: number, kind: string, message: string) => void;
}

/**
 * Plays a list of clips in order through two stacked video elements.
 *
 * Side effects: creates two <video> elements inside `container` and owns them until `destroy()`.
 */
export class SegmentPlayer {
  private readonly els: [HTMLVideoElement, HTMLVideoElement];
  /** Index into `els` of the element currently visible. */
  private activeEl = 0;
  /** Index into `segments` of the clip currently playing. */
  private index = 0;
  private endedAtMs: number | null = null;
  private primed = false;
  /** Last segment index reported to onSegmentStart, so a resume after pause is not reported again. */
  private reportedIndex = -1;

  /**
   * @param container - Element the videos fill. Should be position: relative (or fixed/absolute).
   * @param segments - Clips in play order. Must not be empty.
   * @param events - Optional callbacks for measurements and errors.
   * @throws Error when `segments` is empty.
   */
  constructor(
    container: HTMLElement,
    private readonly segments: PlayableSegment[],
    private readonly events: SegmentPlayerEvents = {},
  ) {
    if (segments.length === 0) throw new Error('SegmentPlayer needs at least one segment');
    this.els = [this.makeVideo(), this.makeVideo()];
    for (const el of this.els) container.appendChild(el);
    this.load(0, 0);
    if (segments.length > 1) this.load(1, 1);
    this.show(0);
  }

  /**
   * Unlock both elements for sound on iOS. Call synchronously inside a tap handler, before `play()`.
   * Safe to call more than once.
   */
  prime(): void {
    if (this.primed) return;
    this.primed = true;
    const standby = this.els[1 - this.activeEl];
    // play() then pause() inside the gesture marks the element as user-activated.
    standby.muted = true;
    void standby.play().then(() => {
      standby.pause();
      standby.currentTime = 0;
      standby.muted = false;
    }).catch(() => {
      standby.muted = false;
    });
  }

  /** Start or resume the current clip. Call from a tap the first time (see `prime`). */
  play(): Promise<void> {
    this.prime();
    return this.els[this.activeEl].play();
  }

  /** Pause the current clip. */
  pause(): void {
    this.els[this.activeEl].pause();
  }

  /** Remove the video elements and stop all loading. */
  destroy(): void {
    for (const el of this.els) {
      el.pause();
      el.removeAttribute('src');
      el.load();
      el.remove();
    }
  }

  private makeVideo(): HTMLVideoElement {
    const el = document.createElement('video');
    // playsInline stops iOS jumping to its own full-screen player.
    el.playsInline = true;
    el.preload = 'auto';
    el.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:transparent;';
    el.addEventListener('ended', () => this.handleEnded(el));
    el.addEventListener('playing', () => this.handlePlaying(el));
    el.addEventListener('error', () => {
      if (el !== this.els[this.activeEl]) return;
      const seg = this.segments[this.index];
      this.events.onError?.(this.index, seg.kind, el.error?.message || `media error ${el.error?.code ?? '?'}`);
      this.handleEnded(el);
    });
    return el;
  }

  /** Point element `elIndex` at segment `segIndex` and start buffering it. */
  private load(elIndex: number, segIndex: number): void {
    const el = this.els[elIndex];
    el.src = this.segments[segIndex].url;
    el.load();
  }

  /** Make element `elIndex` the visible one. The other sits underneath, hidden. */
  private show(elIndex: number): void {
    this.activeEl = elIndex;
    this.els[elIndex].style.zIndex = '2';
    this.els[elIndex].style.opacity = '1';
    this.els[1 - elIndex].style.zIndex = '1';
    this.els[1 - elIndex].style.opacity = '0';
  }

  private handleEnded(el: HTMLVideoElement): void {
    if (el !== this.els[this.activeEl]) return;
    this.endedAtMs = performance.now();
    const next = this.index + 1;
    if (next >= this.segments.length) {
      this.events.onFinished?.();
      return;
    }
    const finishedEl = this.activeEl;
    this.index = next;
    // The standby already holds `next` and shows its first frame, so swapping now does not flash.
    this.show(1 - finishedEl);
    void this.els[this.activeEl].play().catch((err: unknown) => {
      this.events.onError?.(next, this.segments[next].kind, `play refused: ${String(err)}`);
    });
    // Reuse the finished element for the clip after next.
    if (next + 1 < this.segments.length) this.load(finishedEl, next + 1);
  }

  private handlePlaying(el: HTMLVideoElement): void {
    if (el !== this.els[this.activeEl] || this.reportedIndex === this.index) return;
    this.reportedIndex = this.index;
    const gapMs = this.endedAtMs === null ? null : performance.now() - this.endedAtMs;
    this.endedAtMs = null;
    this.events.onSegmentStart?.(this.index, this.segments[this.index].kind, gapMs);
  }
}
