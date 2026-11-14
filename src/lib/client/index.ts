/**
 * The typed API client every screen uses: `import { api } from '@/lib/client'`.
 *
 * Owner: Agent 1 (Core). Implements MASTER.md sections 4.3 and 4.5, task A1-05.
 * With NEXT_PUBLIC_USE_MOCKS=1 it answers from fixtures (./mock.ts); otherwise it calls the API.
 * The flag is read at build time, so restart `npm run dev` after changing it.
 */
import { httpApi } from './http';
import { createMockApi } from './mock';
import type { ChronodexApi } from './types';

/** True when the client serves fixtures instead of calling the API. */
// Written out in full so Next.js can inline it into the browser bundle.
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === '1';

/** The client. One shared instance, so mock state is shared across screens. */
export const api: ChronodexApi = USE_MOCKS ? createMockApi() : httpApi;

export { ApiError } from './errors';
export { getPlayerId, randomUuid, PLAYER_ID_STORAGE_KEY } from './player';
export { SseParser, parseChatEvent, formatSseEvent } from './sse';
export { createMockApi, MOCK_JOB_DURATION_MS } from './mock';
export type { ChronodexApi, ChatOptions } from './types';
export type { MockApiOptions } from './mock';
