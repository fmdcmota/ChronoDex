/**
 * The shared Anthropic client for the Historian and the guide chat. Server and worker only.
 *
 * Owner: Agent 1 (Core). Implements MASTER.md section 7.
 * Credentials: the SDK resolves ANTHROPIC_API_KEY (or an `ant auth login` profile) itself.
 * The key never reaches the browser.
 */
import Anthropic from '@anthropic-ai/sdk';

const GLOBAL_KEY = '__chronodexAnthropic';

/**
 * Get the process-wide Anthropic client, creating it on first use.
 *
 * Created lazily, on the first request that needs it, so importing this module has no side
 * effects. Missing credentials surface as an error from the first request, not here.
 *
 * @returns The client.
 */
export function getAnthropic(): Anthropic {
  const g = globalThis as typeof globalThis & { [GLOBAL_KEY]?: Anthropic };
  g[GLOBAL_KEY] ??= new Anthropic();
  return g[GLOBAL_KEY];
}

/** The minimal client surface the Historian and the chat use, so tests can pass a fake. */
export type AnthropicLike = Pick<Anthropic, 'messages' | 'beta'>;
