/**
 * Shared shapes for the pipeline stages: what a stage receives and what it returns.
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md section 5.1 and task A2-08.
 * A stage is a function from plain inputs to a URL. It never reads or writes the database and never
 * touches the job: the orchestrator (A2-09) saves the request id, stores the result on the Era and
 * updates the stage. That keeps every stage testable with a fake queue.
 */
import type { FalRunContext } from '@/lib/fal';

/** Options every stage accepts. Extends the runFal context with a way to pick the fallback model. */
export interface StageContext extends FalRunContext {
  /** Endpoint to use instead of the registry's primary, for example MODELS.scene.fallback. */
  endpoint?: string;
}

/** What every stage returns. */
export interface StageOutput {
  /** Public URL of the stage's file on fal's CDN. */
  url: string;
  /** Endpoint that made it. The progress sheet shows this (MASTER.md 5.3 rule 6). */
  model: string;
  /** fal request id, or null when the stage made several requests or none. */
  requestId: string | null;
  /** Wall-clock milliseconds the stage took. */
  elapsedMs: number;
  /** Length of a video stage's clip in seconds, when the model reports it. */
  durationS?: number | null;
}

/** The panorama stage also reports the picture size, which the Era's Panorama needs. */
export interface PanoramaOutput extends StageOutput {
  /** Width of the final image in pixels. */
  widthPx: number;
  /** Height of the final image in pixels. */
  heightPx: number;
  /** How many model requests it took: 1, or 2 when the first left the canvas unpainted. */
  attempts: number;
  /** Share of the kept picture that is still unpainted canvas grey (0 to 1). Near 0 is good. */
  unpaintedFraction: number;
}

/** The images of a fal image result, as every image model returns them. */
export interface FalImageResult {
  /** The generated images. Stages use the first. */
  images?: { url?: string; width?: number; height?: number }[];
}

/** The video of a fal video result, as the video models return it. */
export interface FalVideoResult {
  /** The generated video file. */
  video?: { url?: string };
  /** Length in seconds, when the model reports it. */
  duration?: number;
}
