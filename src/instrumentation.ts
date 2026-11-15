/**
 * Runs once when the Next.js server starts. Owner: Agent 2 (Studio); new file, not in MASTER.md section 3.
 *
 * Its only job today is one loud warning for the setup that fooled the human in phone test round 1:
 * mock mode on while a real FAL_KEY is also set. Voice, upload and generation then answer from fixtures
 * and nothing real is called, which looks like a working feature.
 */

/**
 * Next.js calls this once per server start, in each runtime. Only the Node.js runtime has the fal client.
 *
 * @returns Resolves when done. Never throws: a startup warning must not stop the server.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  try {
    const { warnIfMocksShadowKey } = await import('@/lib/fal');
    warnIfMocksShadowKey();
  } catch (error) {
    console.error('instrumentation: could not check the mock-mode setup', error);
  }
}
