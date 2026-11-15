/**
 * The pipeline stages, one function per fal stage. Import from "@/lib/pipeline/stages".
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 5.1, task A2-08. The orchestrator (A2-09) calls
 * these in the order of the dependency graph. The stitch stage arrives with A2-14 and the Claude image
 * checks with A2-12.
 */
export { runScene } from './scene';
export { runPanorama, PANORAMA_VFOV_DEG } from './panorama';
export { runHeadshot } from './headshot';
export { runNarration } from './narration';
export { runGuideFrame } from './guideFrame';
export { runWalkOn, runWalkOff, type WalkInput } from './walk';
export { runTalk } from './talk';
export { runStitch, type StitchOutcome } from './stitch';
export { inspectMp4, verifyStitch, type Mp4Info } from './video';
export type { StageContext, StageOutput, PanoramaOutput } from './types';
