/**
 * Tests for the refused-capture wording (task A3-06). Owner: Agent 3.
 */
import { describe, expect, it } from 'vitest';
import { landmarks } from '@fixtures/index';
import { describeApiFailure, describeCaptureFailure, type CaptureFailure } from './capture-messages';
import { ApiError } from '@/lib/client';

const albert = landmarks.find((l) => l.id === 'royal-albert-hall')!;

describe('describeCaptureFailure', () => {
  it('says how far and which way when too far', () => {
    // 0.002 degrees (about 220 m) south of the Albert Hall photo spot, so it lies to the north.
    const player = { lat: albert.photoSpot.lat - 0.002, lng: albert.photoSpot.lng };
    const failure: CaptureFailure = {
      ok: false,
      reason: 'too_far',
      nearest: { landmarkId: 'royal-albert-hall', distanceM: 222 },
    };
    expect(describeCaptureFailure(failure, landmarks, player)).toBe(
      'You are 220 m from Royal Albert Hall. Head north to reach its photo spot.',
    );
  });

  it('leaves the direction out when the position is unknown', () => {
    const failure: CaptureFailure = {
      ok: false,
      reason: 'too_far',
      nearest: { landmarkId: 'royal-albert-hall', distanceM: 1460 },
    };
    expect(describeCaptureFailure(failure, landmarks, null)).toBe(
      'You are 1.5 km from Royal Albert Hall. Get within 50 m of its photo spot.',
    );
  });

  it('copes with no nearest landmark or an unknown id', () => {
    const none: CaptureFailure = { ok: false, reason: 'too_far', nearest: null };
    const unknown: CaptureFailure = { ok: false, reason: 'too_far', nearest: { landmarkId: 'nowhere', distanceM: 5 } };
    expect(describeCaptureFailure(none, landmarks, null)).toBe('No landmark is within 50 m of you.');
    expect(describeCaptureFailure(unknown, landmarks, null)).toBe('No landmark is within 50 m of you.');
  });

  it('explains a missing location and a missing photo', () => {
    expect(describeCaptureFailure({ ok: false, reason: 'location_missing', nearest: null }, landmarks, null)).toContain(
      'Allow location access',
    );
    expect(describeCaptureFailure({ ok: false, reason: 'photo_missing', nearest: null }, landmarks, null)).toContain(
      'Take it again',
    );
  });
});

describe('describeApiFailure', () => {
  it.each([
    [new ApiError(0, 'network_error', 'x'), 'capture', 'Could not reach the server. Check your signal and try again.'],
    [new ApiError(0, 'network_error', 'x'), 'upload', 'Could not reach the server. Check your signal and try again.'],
    [new ApiError(413, 'too_large', 'x'), 'upload', 'That photo is too big to send. Take it again.'],
    [new ApiError(403, 'spoofed_location', 'x'), 'capture', 'Fake locations are switched off on the server.'],
    [new ApiError(500, 'internal', 'x'), 'capture', 'The server had a problem. Try again in a moment.'],
    [new ApiError(400, 'bad_request', 'x'), 'capture', 'Something went wrong. Try again.'],
    [new Error('boom'), 'capture', 'Something went wrong. Try again.'],
    ['text', 'upload', 'Something went wrong. Try again.'],
    [null, 'capture', 'Something went wrong. Try again.'],
  ] as const)('words %#', (error, step, expected) => {
    expect(describeApiFailure(error, step)).toBe(expected);
  });

  it.each([404, 405, 409, 501])('treats %i on the upload step as a missing upload route', (status) => {
    expect(describeApiFailure(new ApiError(status, 'http_error', 'x'), 'upload')).toBe(
      'The server cannot take photos yet. Try again later.',
    );
  });

  it('does not blame the upload route for the same statuses on the capture step', () => {
    for (const status of [404, 405, 409, 501]) {
      expect(describeApiFailure(new ApiError(status, 'http_error', 'x'), 'capture')).not.toContain('take photos');
    }
  });

  it('never shows the raw server message', () => {
    expect(describeApiFailure(new ApiError(500, 'internal', 'stack trace at db.ts:12'))).not.toContain('db.ts');
  });
});
