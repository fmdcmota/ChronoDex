/** Tests for the per-caller request limits (Agent 1, A1-12). */
import { describe, expect, it } from 'vitest';
import { createRateLimiter } from '@/lib/fal/guards';
import { callerKey, limitOrNull } from './limits';

const request = (ip?: string) => new Request('http://x.test/api', { headers: ip ? { 'x-forwarded-for': ip } : {} });

describe('callerKey', () => {
  it('uses the first forwarded address, else a shared local bucket', () => {
    expect(callerKey(request('1.2.3.4, 5.6.7.8'))).toBe('1.2.3.4');
    expect(callerKey(request())).toBe('local');
  });
});

describe('limitOrNull', () => {
  it('lets calls through up to the limit, then answers 429 with Retry-After, per caller', async () => {
    const limiter = createRateLimiter(2, 60_000);
    expect(limitOrNull(limiter, request('1.1.1.1'))).toBeNull();
    expect(limitOrNull(limiter, request('1.1.1.1'))).toBeNull();
    const refused = limitOrNull(limiter, request('1.1.1.1'));
    expect(refused?.status).toBe(429);
    expect(Number(refused?.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect(((await refused?.json()) as { error: { code: string } }).error.code).toBe('rate_limited');
    expect(limitOrNull(limiter, request('2.2.2.2'))).toBeNull();
  });
});
