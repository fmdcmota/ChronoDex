/**
 * The era pipeline: runs every stage of one job and writes each result as it lands.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 4.4 (src/lib/pipeline) and task A2-09. The
 * signature `runEraJob(job)` is the one Agent 1's stub fixed; the optional second argument is for tests.
 * The orchestration is in ./run.ts, the swappable dependencies in ./deps.ts and the stages in ./stages.
 *
 * With NEXT_PUBLIC_USE_MOCKS=1 the job runs against fixtures and spends nothing (dry run). Otherwise it
 * calls the Historian and fal and costs real money.
 */
export { runEraJob, HEARTBEAT_INTERVAL_MS, SPEECH_WORDS_PER_S } from './run';
export { defaultDeps, dryRunDeps, realDeps, type PipelineDeps } from './deps';
