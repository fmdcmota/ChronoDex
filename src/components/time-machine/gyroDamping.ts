/**
 * Damping for the 360° view's motion control: drop hand tremor, ease real turns. Pure, unit tested.
 *
 * Owner: Agent 4. Part of A4-03, after phone feedback: PSV's 'smooth' mode lagged (round 1) and 'fast' jitters
 * (15 Nov). The gyroscope plugin feeds raw sensor angles to the camera every frame and offers only those two
 * speeds, so PanoramaView filters each target through here before the camera moves (see attachGyroDamping).
 *
 * The filter, per frame and per angle:
 * 1. Dead zone: a change smaller than DEAD_ZONE_RAD from the held angle is ignored. Tremor and sensor noise are
 *    a fraction of a degree; a deliberate turn passes it within one or two frames.
 * 2. Exponential smoothing: the held angle moves SMOOTHING of the way to the reading. Low enough to soak up
 *    spikes, high enough that the view does not trail a turn.
 * Yaw wraps at 2π, so its difference is taken the short way round.
 */

/** Ignore changes smaller than this, radians (0.25°). */
export const DEAD_ZONE_RAD = (0.25 * Math.PI) / 180;
/** Roll is noisier and matters less: a larger dead zone, radians (0.8°). */
export const ROLL_DEAD_ZONE_RAD = (0.8 * Math.PI) / 180;
/** Fraction of the remaining difference taken each frame, 0 to 1. */
export const SMOOTHING = 0.25;
/** Camera speed passed to PSV with each damped target. Between its 'smooth' (3) and 'fast' (10). */
export const DAMPED_STEP = 5;
/** Camera speed for roll. PSV uses 10 ('smooth') or 30 ('fast'). */
export const DAMPED_ROLL_STEP = 8;

const TWO_PI = 2 * Math.PI;

/**
 * Signed shortest difference from one angle to another, in -π..π.
 *
 * @param from - Radians.
 * @param to - Radians.
 * @returns `to - from`, wrapped.
 */
export function angleDelta(from: number, to: number): number {
  let d = (to - from) % TWO_PI;
  if (d > Math.PI) d -= TWO_PI;
  if (d < -Math.PI) d += TWO_PI;
  return d;
}

/**
 * One filter step for one angle.
 *
 * @param held - The current filtered angle, or null on the first reading.
 * @param reading - The new raw angle.
 * @param deadZoneRad - Changes smaller than this are ignored.
 * @param smoothing - Fraction of the difference to take, 0 to 1.
 * @returns The new filtered angle (yaw-safe: not normalised, callers that need 0..2π normalise).
 */
export function dampAngle(held: number | null, reading: number, deadZoneRad: number, smoothing = SMOOTHING): number {
  if (held === null) return reading;
  const d = angleDelta(held, reading);
  if (Math.abs(d) < deadZoneRad) return held;
  return held + d * smoothing;
}

/** Filter state for one viewer: the held yaw, pitch and roll. */
export interface GyroFilter {
  /**
   * Filter a camera target.
   *
   * @param target - Raw yaw and pitch from the plugin, radians.
   * @param target.yaw - Radians.
   * @param target.pitch - Radians.
   * @returns The damped target, yaw in 0..2π.
   */
  position(target: { yaw: number; pitch: number }): { yaw: number; pitch: number };
  /**
   * Filter a roll target.
   *
   * @param roll - Raw roll, radians.
   * @returns The damped roll.
   */
  roll(roll: number): number;
  /** Forget the held angles, so the next reading is taken as is (call when motion starts again). */
  reset(): void;
}

/**
 * Create a filter.
 *
 * @returns A fresh filter with no held angles.
 */
export function createGyroFilter(): GyroFilter {
  let yaw: number | null = null;
  let pitch: number | null = null;
  let roll: number | null = null;
  return {
    position(target) {
      yaw = dampAngle(yaw, target.yaw, DEAD_ZONE_RAD);
      pitch = dampAngle(pitch, target.pitch, DEAD_ZONE_RAD);
      return { yaw: ((yaw % TWO_PI) + TWO_PI) % TWO_PI, pitch };
    },
    roll(value) {
      roll = dampAngle(roll, value, ROLL_DEAD_ZONE_RAD);
      return roll;
    },
    reset() {
      yaw = pitch = roll = null;
    },
  };
}

/** The parts of PSV's viewer and gyroscope plugin the damping touches. Kept structural so tests need no WebGL. */
export interface DampableGyro {
  isEnabled(): boolean;
  viewer: {
    dynamics: {
      position: { goto(target: { yaw: number; pitch: number }, speedMult?: number): void };
      roll: { goto(value: number, speedMult?: number): void };
    };
  };
}

/**
 * Put the filter between the gyroscope plugin and the camera.
 *
 * How: the plugin's per-frame handler (`__onBeforeRender`, called as a method, so an instance override takes
 * effect) ends with `dynamics.position.goto(target, step)` and `dynamics.roll.goto(roll, step)`. For the length of
 * that one call those two methods are swapped for filtered ones, then restored. Drag, Reset and the plugin's own
 * stop animation use the originals. If a PSV upgrade renames the handler, this does nothing and motion still
 * works undamped.
 *
 * @param gyro - The plugin instance from `viewer.getPlugin(GyroscopePlugin)`.
 * @param filter - The filter. Reset it when motion is switched on.
 * @returns True when the handler was found and wrapped.
 */
export function attachGyroDamping(gyro: DampableGyro, filter: GyroFilter): boolean {
  const host = gyro as unknown as { __onBeforeRender?: () => void };
  const original = host.__onBeforeRender;
  if (typeof original !== 'function') return false;
  host.__onBeforeRender = function dampedBeforeRender(this: DampableGyro) {
    if (!this.isEnabled()) return original.call(this);
    const position = this.viewer.dynamics.position;
    const roll = this.viewer.dynamics.roll;
    const gotoPosition = position.goto;
    const gotoRoll = roll.goto;
    position.goto = (target) => gotoPosition.call(position, filter.position(target), DAMPED_STEP);
    roll.goto = (value) => gotoRoll.call(roll, filter.roll(value), DAMPED_ROLL_STEP);
    try {
      original.call(this);
    } finally {
      position.goto = gotoPosition;
      roll.goto = gotoRoll;
    }
  };
  return true;
}
