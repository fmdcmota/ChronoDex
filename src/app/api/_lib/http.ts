/**
 * Helpers every API route shares: JSON responses, the error shape, body validation, and a
 * wrapper that turns unexpected exceptions into a logged 500.
 *
 * Owner: Agent 1 (Core). Implements the error format of MASTER.md section 4.3.
 * The `_lib` folder name keeps Next.js from treating this as a route (private folder).
 * Agent 2's upload and voice routes may import these too.
 */
import type { z } from 'zod';
import type { ApiErrorBody } from '@/lib/contracts';

/** Every API response is live data that screens poll, so nothing may be cached. */
const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/**
 * A JSON response that is never cached.
 *
 * @param body - Serialisable body.
 * @param status - HTTP status. Defaults to 200.
 * @returns The response.
 */
export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

/**
 * An error response in the shape `{ error: { code, message } }`.
 *
 * @param status - 4xx or 5xx.
 * @param code - Machine-readable code, for example "not_found".
 * @param message - For developers.
 * @returns The response.
 */
export function jsonError(status: number, code: string, message: string): Response {
  const body: ApiErrorBody = { error: { code, message } };
  return json(body, status);
}

/**
 * Read and validate a JSON request body.
 *
 * @param request - The incoming request.
 * @param schema - Zod schema for the body.
 * @returns `{ ok: true, data }`, or `{ ok: false, response }` with a 400 to return as is.
 */
export async function readJson<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<{ ok: true; data: z.infer<S> } | { ok: false; response: Response }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: jsonError(400, 'bad_request', 'The body is not valid JSON') };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? issue.path.join('.') : 'body';
    return { ok: false, response: jsonError(400, 'bad_request', `${where}: ${issue?.message ?? 'invalid'}`) };
  }
  return { ok: true, data: parsed.data };
}

/**
 * Run a route body, turning any uncaught exception into a 500 so the client always gets the
 * documented error shape. The error is logged on the server; its message is not sent, so
 * connection strings and stack traces never reach a browser.
 *
 * @param name - Route name for the log, for example "GET /api/landmarks".
 * @param body - The handler body.
 * @returns The handler's response, or a 500.
 */
export async function handle(name: string, body: () => Promise<Response>): Promise<Response> {
  try {
    return await body();
  } catch (err) {
    console.error(`${name} failed`, err);
    return jsonError(500, 'internal_error', 'Something went wrong on the server');
  }
}
