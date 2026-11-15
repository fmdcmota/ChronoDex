/**
 * Every fixture validates against its zod schema, and the fixtures agree with each other.
 * Owner: Agent 1.
 */
import { describe, expect, it } from 'vitest';
import {
  CaptureRequestSchema,
  ChatRequestSchema,
  EraBriefSchema,
  EraSchema,
  JobSchema,
  LandmarkSchema,
  eraIdOf,
  parseEraId,
} from '@/lib/contracts';
import { VOICE_CATALOG } from '@/lib/fal/voices';
import { HERO_ERA_ID, eras, heroBrief, landmarks, placeholderBrief, sampleJobs } from './index';

describe('fixtures', () => {
  it('has thirteen landmarks (six in London, then Singapore, Oslo, Cambridge and Beijing), each valid, with unique ids and ascending years', () => {
    expect(landmarks).toHaveLength(13);
    expect(new Set(landmarks.map((l) => l.id)).size).toBe(13);
    for (const landmark of landmarks) {
      expect(LandmarkSchema.parse(landmark)).toEqual(landmark);
      expect([...landmark.eraYears].sort((a, b) => a - b)).toEqual(landmark.eraYears);
    }
  });

  it('has exactly one era per landmark year, each valid', () => {
    const expected = landmarks.flatMap((l) => l.eraYears.map((y) => eraIdOf(l.id, y)));
    expect(eras.map((e) => e.id)).toEqual(expected);
    for (const era of eras) {
      expect(EraSchema.parse(era)).toEqual(era);
      expect(parseEraId(era.id)).toEqual({ landmarkId: era.landmarkId, year: era.year });
    }
  });

  it('has one fully populated hero era and the rest missing', () => {
    const ready = eras.filter((e) => e.state === 'ready');
    expect(ready.map((e) => e.id)).toEqual([HERO_ERA_ID]);
    const hero = ready[0];
    expect(hero.videoState).toBe('ready');
    expect(hero.panorama && hero.sceneImageUrl && hero.narrationAudioUrl && hero.guide?.headshotUrl).toBeTruthy();
    expect(hero.guideVideo?.segments.map((s) => s.kind)).toEqual(['walk_on', 'talk', 'walk_off']);
    expect(eras.filter((e) => e.id !== HERO_ERA_ID).every((e) => e.state === 'missing' && e.guide === null)).toBe(true);
  });

  it('hero brief follows the Historian rules that can be checked mechanically', () => {
    expect(EraBriefSchema.parse(heroBrief)).toEqual(heroBrief);
    const words = heroBrief.guide.script.trim().split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(105);
    expect(words).toBeLessThanOrEqual(120);
    expect(heroBrief.guide.script).toContain(heroBrief.guide.name);
    expect(heroBrief.sources.length).toBeGreaterThan(0);
  });

  it('every voiceKey used by a fixture is in the voice catalogue', () => {
    for (const l of landmarks) {
      for (const y of l.eraYears) expect(VOICE_CATALOG).toHaveProperty(placeholderBrief(l, y).guide.voiceKey);
    }
  });

  it('has one valid sample job in each state', () => {
    for (const [state, job] of Object.entries(sampleJobs)) {
      expect(JobSchema.parse(job)).toEqual(job);
      expect(job.state).toBe(state);
    }
  });
});

describe('request schemas', () => {
  it('turns a missing or malformed capture location into null', () => {
    const base = { playerId: 'p', photoUrl: 'u', accuracyM: 5 };
    expect(CaptureRequestSchema.parse({ ...base }).location).toBeNull();
    expect(CaptureRequestSchema.parse({ ...base, location: { lat: 'x' } }).location).toBeNull();
    expect(CaptureRequestSchema.parse({ ...base, location: { lat: 51.5, lng: -0.17 } }).location).toEqual({ lat: 51.5, lng: -0.17 });
  });

  it('rejects an empty chat and a bad era id', () => {
    expect(ChatRequestSchema.safeParse({ eraId: HERO_ERA_ID, playerId: 'p', messages: [] }).success).toBe(false);
    expect(ChatRequestSchema.safeParse({ eraId: 'nope', playerId: 'p', messages: [{ role: 'player', text: 'hi' }] }).success).toBe(false);
    expect(ChatRequestSchema.safeParse({ eraId: HERO_ERA_ID, playerId: 'p', messages: [{ role: 'player', text: 'hi' }] }).success).toBe(true);
  });
});

describe('fixture art', () => {
  it('every sprite, badge and locked badge exists in public/', async () => {
    const { existsSync } = await import('node:fs');
    const { lockedBadgeUrl } = await import('./landmarks');
    for (const l of landmarks) {
      for (const url of [l.spriteUrl, l.badgeUrl, lockedBadgeUrl(l), l.referencePhotoUrl]) {
        expect(url.startsWith('/'), url).toBe(true);
        expect(existsSync(`public${url}`), url).toBe(true);
      }
    }
  });
});
