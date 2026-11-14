/**
 * runFal: the one wrapper every fal model call goes through.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 5.3 rules 1 and 2, task A2-07.
 *
 * Why not fal.subscribe: subscribe hides the request id until the call finishes. If the worker
 * dies during a 4-minute talk-video request, a restart would submit again and pay twice. runFal
 * submits to the queue, hands the request id to the caller the moment fal accepts it (the pipeline
 * saves it on the job stage), then polls. Given a saved id it skips the submit and just polls, so a
 * restarted worker picks the same request up again. fal keeps running a request after the client
 * disconnects, so the saved id stays valid.
 *
 * Server and worker only: FAL_KEY is read from the environment by @fal-ai/client and must never
 * reach the browser.
 */
import { fal } from '@fal-ai/client';

/** How often to ask fal for the status of a request. The slowest stages take minutes, so 2 s is plenty. */
export const DEFAULT_POLL_INTERVAL_MS = 2000;
/** Give up on a single request after this long. The 45 s talk clip takes about 15 minutes (A2-05). */
export const DEFAULT_TIMEOUT_MS = 25 * 60 * 1000;

/** What went wrong with a fal call. Carries enough to find the request on fal's dashboard. */
export class FalStageError extends Error {
  /** Endpoint that was being called. */
  readonly endpoint: string;
  /** fal request id, when fal had accepted the request. */
  readonly requestId: string | null;
  /** HTTP status from fal, when the failure was an HTTP error. */
  readonly status: number | null;
  /** Response body fal sent, which usually names a bad field. */
  readonly body: unknown;

  /**
   * Build the error from a message and the details of the failed call.
   *
   * @param message - What failed, in one sentence.
   * @param details - The endpoint and whatever else is known.
   * @param details.endpoint - Endpoint being called.
   * @param details.requestId - Request id, if known.
   * @param details.status - HTTP status, if any.
   * @param details.body - Response body, if any.
   */
  constructor(message: string, details: { endpoint: string; requestId?: string | null; status?: number | null; body?: unknown }) {
    super(message);
    this.name = 'FalStageError';
    this.endpoint = details.endpoint;
    this.requestId = details.requestId ?? null;
    this.status = details.status ?? null;
    this.body = details.body;
  }
}

/** The three queue calls runFal uses. The real fal client satisfies this; tests pass a fake. */
export interface FalQueueLike {
  /** Submit a request. Resolves with fal's request id. */
  submit(endpoint: string, options: { input: Record<string, unknown> }): Promise<{ request_id: string }>;
  /** Ask for a request's status. */
  status(endpoint: string, options: { requestId: string }): Promise<{ status: string }>;
  /** Read a finished request's output. */
  result(endpoint: string, options: { requestId: string }): Promise<{ data: unknown }>;
}

/** Options for one runFal call. Every field is optional. */
export interface FalRunContext {
  /** A request id saved by an earlier run. When set, nothing is submitted and that request is polled. */
  resumeRequestId?: string | null;
  /** Called once, as soon as fal accepts the request. Save the id here so a restart can resume. */
  onRequestId?: (requestId: string) => void | Promise<void>;
  /** Called after every status check. Use it to renew the job lease (heartbeatJob) during long waits. */
  onPoll?: () => void | Promise<void>;
  /** Milliseconds between status checks. Default DEFAULT_POLL_INTERVAL_MS. */
  pollIntervalMs?: number;
  /** Milliseconds before giving up. Default DEFAULT_TIMEOUT_MS. */
  timeoutMs?: number;
  /** The queue to use. Default is the real fal client. */
  queue?: FalQueueLike;
}

/** What a finished call returns. */
export interface FalRunResult<T> {
  /** The model's output, as documented on its schema page. */
  data: T;
  /** fal's request id, for the job stage and the dashboard. */
  requestId: string;
  /** Wall-clock milliseconds from submit (or resume) to result. */
  elapsedMs: number;
  /** Endpoint that produced the data. */
  endpoint: string;
}

/** The real client's queue, narrowed to what runFal needs. */
const realQueue = fal.queue as unknown as FalQueueLike;

/** Pause for a number of milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Turn anything thrown by the fal client into a FalStageError, keeping status and body. */
function toStageError(error: unknown, endpoint: string, requestId: string | null, doing: string): FalStageError {
  if (error instanceof FalStageError) return error;
  const e = error as { message?: string; status?: number; body?: unknown };
  const detail = e.body ? ` ${JSON.stringify(e.body).slice(0, 300)}` : '';
  return new FalStageError(`fal ${doing} failed for ${endpoint}: ${e.message ?? String(error)}${detail}`, {
    endpoint,
    requestId,
    status: e.status ?? null,
    body: e.body,
  });
}

/**
 * Call one fal model through the queue and wait for the result.
 *
 * Cost and time depend on the model: see MODELS in ./models.ts. fal bills for a request when it
 * runs, so resuming a saved request id costs nothing extra.
 * Side effects: one fal request (none when resuming). Calls ctx.onRequestId once and ctx.onPoll
 * after every status check. Writes nothing itself.
 *
 * @param endpoint - fal endpoint id. Take it from MODELS, never write one inline.
 * @param input - Model input, shaped as on the model's schema page.
 * @param ctx - Resume id, callbacks and timing. See FalRunContext.
 * @returns The output, the request id and the time taken.
 * @throws FalStageError when the key is missing, fal rejects the request, the request fails, or
 *         timeoutMs passes. The error carries the request id when there is one.
 */
export async function runFal<T = unknown>(
  endpoint: string,
  input: Record<string, unknown>,
  ctx: FalRunContext = {},
): Promise<FalRunResult<T>> {
  const queue = ctx.queue ?? realQueue;
  if (!ctx.queue && !process.env.FAL_KEY) {
    throw new FalStageError('FAL_KEY is not set. Put it in .env.local (server and worker only).', { endpoint });
  }
  const pollIntervalMs = ctx.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const timeoutMs = ctx.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const startMs = Date.now();

  let requestId = ctx.resumeRequestId ?? null;
  if (!requestId) {
    try {
      requestId = (await queue.submit(endpoint, { input })).request_id;
    } catch (error) {
      throw toStageError(error, endpoint, null, 'submit');
    }
    // Saved before the first poll: this is what lets a restarted worker resume instead of paying twice.
    await ctx.onRequestId?.(requestId);
  }

  for (;;) {
    let status: string;
    try {
      status = (await queue.status(endpoint, { requestId })).status;
    } catch (error) {
      throw toStageError(error, endpoint, requestId, 'status check');
    }
    await ctx.onPoll?.();
    if (status === 'COMPLETED') break;
    if (Date.now() - startMs > timeoutMs) {
      throw new FalStageError(`fal request ${requestId} for ${endpoint} did not finish within ${Math.round(timeoutMs / 1000)} s`, {
        endpoint,
        requestId,
      });
    }
    await sleep(pollIntervalMs);
  }

  try {
    const { data } = await queue.result(endpoint, { requestId });
    return { data: data as T, requestId, elapsedMs: Date.now() - startMs, endpoint };
  } catch (error) {
    // A request that ended in an error status shows up here: the result call throws with the body.
    throw toStageError(error, endpoint, requestId, 'result');
  }
}
