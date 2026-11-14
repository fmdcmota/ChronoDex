/**
 * POST /api/uploads: store a player's capture photo and return its URL.
 *
 * Owner: Agent 2 (Studio). MASTER.md section 4.3, task A2-11.
 * Request: multipart with field `file`, a JPEG under MAX_UPLOAD_BYTES (the client resizes to 1600 px
 * first, MASTER.md 5.3 rule 7). Response: UploadResponse `{ url }`, a public link on fal's CDN that
 * lasts at least 7 days. The capture then posts that URL to POST /api/captures.
 * Errors: 400 no file or an empty one, 413 over MAX_UPLOAD_BYTES, 415 not a JPEG, 429 rate limited,
 * 502 the upload to fal failed, 503 no fal key on this server.
 * Cost: free (fal storage). Time: about 2 s for a 700 KB photo (A2-01).
 * Privacy: the URL is public and unguessable but not secret. Players' photos are taken in public.
 */
import type { NextRequest } from 'next/server';
import { MAX_UPLOAD_BYTES, type UploadResponse } from '@/lib/contracts';
import { uploadToFal } from '@/lib/fal';
import { handle, json, jsonError } from '../_lib/http';
import { callerKey, tooManyRequests, upstreamError, voiceUnavailable } from '../voice/_lib/voice';
import { looksLikeJpeg, uploadLimiter } from './_lib/limits';

/** Bytes read from the start of the file to check it is a JPEG. */
const HEAD_BYTES = 3;

/**
 * Store one capture photo.
 *
 * @param request - Multipart form with a `file` field holding a JPEG.
 * @returns `{ url }`, or a JSON error.
 */
export async function POST(request: NextRequest): Promise<Response> {
  return handle('POST /api/uploads', async () => {
    const limited = tooManyRequests(uploadLimiter.check(callerKey(request)));
    if (limited) return limited;

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return jsonError(400, 'bad_request', 'The body must be multipart form data with a "file" field');
    }
    const file = form.get('file');
    if (!(file instanceof Blob)) return jsonError(400, 'bad_request', 'file: a photo is required');
    if (file.size === 0) return jsonError(400, 'bad_request', 'file: the photo is empty');
    if (file.size > MAX_UPLOAD_BYTES) return jsonError(413, 'too_large', `file: over ${MAX_UPLOAD_BYTES} bytes`);
    const head = new Uint8Array(await file.slice(0, HEAD_BYTES).arrayBuffer());
    if (!looksLikeJpeg(head)) return jsonError(415, 'unsupported_type', 'file: only JPEG photos are accepted');

    const unavailable = voiceUnavailable();
    if (unavailable) return unavailable;
    try {
      // A fixed name and type: whatever the browser called it, it is a JPEG as far as everyone downstream is concerned.
      const url = await uploadToFal(new File([file], 'capture.jpg', { type: 'image/jpeg' }));
      return json({ url } satisfies UploadResponse);
    } catch (error) {
      const response = upstreamError(error, 'POST /api/uploads');
      if (response) return response;
      throw error;
    }
  });
}
