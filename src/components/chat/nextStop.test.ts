/**
 * Unit tests for the next-landmark suggestion. Owner: Agent 4 (A4-09).
 */
import { describe, expect, it } from 'vitest';
import { haversineM } from '@/lib/contracts';
import { landmarks } from '@fixtures/index';
import { chatHasExchange, nextStop } from './nextStop';

describe('nextStop', () => {
  it('never suggests the current landmark', () => {
    const fix = nextStop('queens-tower', landmarks, []);
    expect(fix).not.toBeNull();
    expect(fix?.landmark.id).not.toBe('queens-tower');
  });

  it('picks the nearest other landmark, measured between photo spots', () => {
    const qt = landmarks.find((l) => l.id === 'queens-tower')!;
    const others = landmarks.filter((l) => l.id !== 'queens-tower');
    const nearest = Math.min(...others.map((l) => haversineM(qt.photoSpot, l.photoSpot)));
    expect(nextStop('queens-tower', landmarks, [])?.distanceM).toBeCloseTo(nearest, 6);
  });

  it('skips collected landmarks', () => {
    const first = nextStop('queens-tower', landmarks, [])!;
    const second = nextStop('queens-tower', landmarks, [first.landmark.id]);
    expect(second?.landmark.id).not.toBe(first.landmark.id);
    expect(second!.distanceM).toBeGreaterThanOrEqual(first.distanceM);
  });

  it('returns null when everything else is collected or the landmark is unknown', () => {
    expect(nextStop('queens-tower', landmarks, landmarks.map((l) => l.id))).toBeNull();
    expect(nextStop('nowhere', landmarks, [])).toBeNull();
  });
});

describe('chatHasExchange', () => {
  it('is false with only the greeting', () => {
    expect(chatHasExchange([{ role: 'guide', text: 'Hello' }])).toBe(false);
    expect(chatHasExchange([])).toBe(false);
  });
  it('is false while the player waits for a reply', () => {
    expect(
      chatHasExchange([
        { role: 'guide', text: 'Hello' },
        { role: 'player', text: 'Hi' },
      ]),
    ).toBe(false);
  });
  it('is true once the guide has answered', () => {
    expect(
      chatHasExchange([
        { role: 'guide', text: 'Hello' },
        { role: 'player', text: 'Hi' },
        { role: 'guide', text: 'Welcome' },
      ]),
    ).toBe(true);
  });
});
