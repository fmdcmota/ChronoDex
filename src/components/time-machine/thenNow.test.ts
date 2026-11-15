/**
 * Unit tests for the then/now slider maths. Owner: Agent 4 (A4-06).
 */
import { describe, expect, it } from 'vitest';
import { THEN_NOW_MISALIGNED_ERAS, THEN_NOW_START_PERCENT, canCompareThenNow, clampPercent, percentAfterKey, percentFromPointer } from './thenNow';

describe('clampPercent', () => {
  it('keeps values inside 0 to 100', () => {
    expect(clampPercent(-10)).toBe(0);
    expect(clampPercent(42)).toBe(42);
    expect(clampPercent(140)).toBe(100);
  });
  it('turns NaN into the start position', () => {
    expect(clampPercent(Number.NaN)).toBe(THEN_NOW_START_PERCENT);
  });
});

describe('percentFromPointer', () => {
  it('maps the pointer across the box', () => {
    expect(percentFromPointer(100, 100, 200)).toBe(0);
    expect(percentFromPointer(200, 100, 200)).toBe(50);
    expect(percentFromPointer(300, 100, 200)).toBe(100);
  });
  it('clamps a pointer dragged outside the box', () => {
    expect(percentFromPointer(0, 100, 200)).toBe(0);
    expect(percentFromPointer(999, 100, 200)).toBe(100);
  });
  it('falls back to the start position for an empty box', () => {
    expect(percentFromPointer(50, 0, 0)).toBe(THEN_NOW_START_PERCENT);
    expect(percentFromPointer(50, 0, -5)).toBe(THEN_NOW_START_PERCENT);
  });
});

describe('percentAfterKey', () => {
  it('steps with the arrow keys and clamps', () => {
    expect(percentAfterKey(50, 'ArrowLeft')).toBe(45);
    expect(percentAfterKey(50, 'ArrowRight')).toBe(55);
    expect(percentAfterKey(2, 'ArrowDown')).toBe(0);
    expect(percentAfterKey(98, 'ArrowUp')).toBe(100);
  });
  it('jumps to the ends with Home and End', () => {
    expect(percentAfterKey(50, 'Home')).toBe(0);
    expect(percentAfterKey(50, 'End')).toBe(100);
  });
  it('ignores other keys', () => {
    expect(percentAfterKey(50, 'a')).toBeNull();
  });
});

describe('canCompareThenNow (R3-4c)', () => {
  it('needs both pictures', () => {
    expect(canCompareThenNow('x_1900', null, '/r.jpg')).toBe(false);
    expect(canCompareThenNow('x_1900', '/s.jpg', '')).toBe(false);
    expect(canCompareThenNow('x_1900', '/s.jpg', '/r.jpg')).toBe(true);
  });
  it('hides the demo eras whose scene is from another viewpoint', () => {
    expect(canCompareThenNow('queens-tower_1893', '/s.jpg', '/r.jpg')).toBe(false);
    expect(THEN_NOW_MISALIGNED_ERAS.size).toBe(8);
  });
});
