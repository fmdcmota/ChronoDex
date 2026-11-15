/**
 * Tests for the gyroscope damping filter (gyroDamping.ts).
 *
 * Owner: Agent 4. Part of A4-03.
 */
import { describe, expect, it } from 'vitest';
import { DAMPED_STEP, DEAD_ZONE_RAD, angleDelta, attachGyroDamping, createGyroFilter, dampAngle, type DampableGyro } from './gyroDamping';

const DEG = Math.PI / 180;

describe('angleDelta', () => {
  it('takes the short way round', () => {
    expect(angleDelta(350 * DEG, 10 * DEG)).toBeCloseTo(20 * DEG);
    expect(angleDelta(10 * DEG, 350 * DEG)).toBeCloseTo(-20 * DEG);
    expect(angleDelta(0, 0)).toBe(0);
  });
});

describe('dampAngle', () => {
  it('takes the first reading as is and ignores tremor', () => {
    expect(dampAngle(null, 1, DEAD_ZONE_RAD)).toBe(1);
    expect(dampAngle(1, 1 + DEAD_ZONE_RAD / 2, DEAD_ZONE_RAD)).toBe(1);
  });

  it('eases towards a real turn and gets there', () => {
    let held: number | null = 0;
    for (let i = 0; i < 30; i++) held = dampAngle(held, 30 * DEG, DEAD_ZONE_RAD);
    expect(held).toBeGreaterThan(29 * DEG);
    expect(dampAngle(0, 30 * DEG, DEAD_ZONE_RAD)).toBeLessThan(30 * DEG);
  });
});

describe('createGyroFilter', () => {
  it('flattens noise around a steady direction', () => {
    const f = createGyroFilter();
    f.position({ yaw: 1, pitch: 0 });
    const noisy = [0.002, -0.003, 0.001, -0.002, 0.003].map((n) => f.position({ yaw: 1 + n, pitch: n }));
    for (const p of noisy) {
      expect(p.yaw).toBeCloseTo(1, 6);
      expect(p.pitch).toBeCloseTo(0, 6);
    }
  });

  it('crosses north without spinning and keeps yaw in 0..2π', () => {
    const f = createGyroFilter();
    f.position({ yaw: 359 * DEG, pitch: 0 });
    const p = f.position({ yaw: 5 * DEG, pitch: 0 });
    expect(p.yaw).toBeGreaterThanOrEqual(0);
    expect(p.yaw).toBeLessThan(2 * Math.PI);
    expect(angleDelta(359 * DEG, p.yaw)).toBeGreaterThan(0);
    expect(angleDelta(359 * DEG, p.yaw)).toBeLessThan(6 * DEG);
  });
});

describe('attachGyroDamping', () => {
  it('filters the targets of one frame and restores the camera methods', () => {
    const calls: [string, unknown, number | undefined][] = [];
    const position = { goto: (t: { yaw: number; pitch: number }, s?: number) => void calls.push(['pos', t, s]) };
    const roll = { goto: (v: number, s?: number) => void calls.push(['roll', v, s]) };
    const originalPositionGoto = position.goto;
    const gyro = {
      isEnabled: () => true,
      viewer: { dynamics: { position, roll } },
      __onBeforeRender(this: DampableGyro) {
        this.viewer.dynamics.position.goto({ yaw: 1, pitch: 0.1 }, 10);
        this.viewer.dynamics.roll.goto(0.05, 30);
      },
    };
    expect(attachGyroDamping(gyro, createGyroFilter())).toBe(true);
    gyro.__onBeforeRender();
    expect(calls[0]).toEqual(['pos', { yaw: 1, pitch: 0.1 }, DAMPED_STEP]);
    expect(calls[1][2]).toBeLessThan(30);
    expect(position.goto).toBe(originalPositionGoto);
  });

  it('does nothing when the handler is missing', () => {
    const gyro = { isEnabled: () => true, viewer: { dynamics: { position: { goto: () => undefined }, roll: { goto: () => undefined } } } };
    expect(attachGyroDamping(gyro, createGyroFilter())).toBe(false);
  });
});
