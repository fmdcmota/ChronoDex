/**
 * A tiny MP4 inspector: does a video file have an audio track, and how long is it?
 *
 * Owner: Agent 2 (Studio). Implements MASTER.md task A2-14: "if audio does not survive the merge, leave stitchedUrl
 * null". There is no ffmpeg on the server, so the stitch stage reads the MP4's own boxes instead. Pure functions on
 * bytes: no network, no dependencies.
 *
 * An MP4 is a tree of boxes, each `size (4 bytes) + type (4 bytes) + payload`. The movie box `moov` holds one `trak`
 * per track; each has `mdia` then a handler box `hdlr` whose handler type says `soun` (audio) or `vide` (video). The
 * movie header `mvhd` has the time scale and the duration.
 */

/** What the inspector learned about a file. */
export interface Mp4Info {
  /** True when the file holds at least one audio track. */
  hasAudio: boolean;
  /** True when it holds at least one video track. */
  hasVideo: boolean;
  /** Length in seconds from the movie header, or null when it could not be read. */
  durationS: number | null;
}

/** One box found while walking: its type and where its payload starts and ends. */
interface Box {
  type: string;
  start: number;
  end: number;
}

/** Walk the boxes between two offsets. Stops at a box that would run past the end. */
function* boxes(bytes: Uint8Array, view: DataView, from: number, to: number): Generator<Box> {
  let offset = from;
  while (offset + 8 <= to) {
    let size = view.getUint32(offset);
    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
    let header = 8;
    if (size === 1) {
      // A 64-bit size follows the type. Files this large never occur here, but read it correctly anyway.
      size = Number(view.getBigUint64(offset + 8));
      header = 16;
    } else if (size === 0) {
      size = to - offset;
    }
    if (size < header || offset + size > to) return;
    yield { type, start: offset + header, end: offset + size };
    offset += size;
  }
}

/**
 * Read an MP4's tracks and length.
 *
 * @param bytes - The whole file, or at least its `moov` box (which fal's MP4s put at the start or the end).
 * @returns What the file holds. A file that is not an MP4 gives no audio, no video and a null length.
 */
export function inspectMp4(bytes: Uint8Array): Mp4Info {
  const info: Mp4Info = { hasAudio: false, hasVideo: false, durationS: null };
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (const top of boxes(bytes, view, 0, bytes.length)) {
    if (top.type !== 'moov') continue;
    for (const child of boxes(bytes, view, top.start, top.end)) {
      if (child.type === 'mvhd') {
        const version = bytes[child.start];
        const scale = view.getUint32(child.start + (version === 1 ? 20 : 12));
        const duration = version === 1 ? Number(view.getBigUint64(child.start + 24)) : view.getUint32(child.start + 16);
        info.durationS = scale > 0 ? duration / scale : null;
      } else if (child.type === 'trak') {
        for (const mdia of boxes(bytes, view, child.start, child.end)) {
          if (mdia.type !== 'mdia') continue;
          for (const inner of boxes(bytes, view, mdia.start, mdia.end)) {
            if (inner.type !== 'hdlr') continue;
            // hdlr payload: version and flags (4), pre-defined (4), then the 4-letter handler type.
            const handler = String.fromCharCode(...bytes.subarray(inner.start + 8, inner.start + 12));
            if (handler === 'soun') info.hasAudio = true;
            if (handler === 'vide') info.hasVideo = true;
          }
        }
      }
    }
  }
  return info;
}

/** How far a stitched file's length may differ from the sum of its clips before it is refused, in seconds. */
export const STITCH_DURATION_TOLERANCE_S = 1.5;

/**
 * Decide whether a stitched file is good enough to use in place of the three separate clips.
 *
 * @param stitched - What inspectMp4 found in the stitched file.
 * @param expectedDurationS - The sum of the clips' lengths.
 * @returns `ok` with no reason, or not ok with one sentence saying why.
 */
export function verifyStitch(stitched: Mp4Info, expectedDurationS: number): { ok: boolean; reason: string | null } {
  if (!stitched.hasVideo) return { ok: false, reason: 'the stitched file has no video track' };
  if (!stitched.hasAudio) return { ok: false, reason: 'the audio did not survive the merge' };
  if (stitched.durationS === null) return { ok: false, reason: 'the stitched file has no readable length' };
  if (Math.abs(stitched.durationS - expectedDurationS) > STITCH_DURATION_TOLERANCE_S) {
    return { ok: false, reason: `the stitched file is ${stitched.durationS.toFixed(1)} s but the clips add up to ${expectedDurationS.toFixed(1)} s` };
  }
  return { ok: true, reason: null };
}
