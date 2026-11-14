/**
 * The error the typed API client throws for a non-2xx response or a network failure.
 *
 * Owner: Agent 1 (Core). Implements the error shape in MASTER.md section 4.3.
 */

/** A failed API call. `status` is 0 when the request never reached the server. */
export class ApiError extends Error {
  /** HTTP status, or 0 for a network failure. */
  readonly status: number;
  /** Machine-readable code from the error body, for example "not_found", or "network_error". */
  readonly code: string;

  /**
   * Create an ApiError.
   *
   * @param status - HTTP status, or 0 for a network failure.
   * @param code - Machine-readable code.
   * @param message - Human-readable message, for developers.
   */
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}
