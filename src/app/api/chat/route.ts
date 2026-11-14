/**
 * POST /api/chat: the guide's streamed reply, as server-sent events.
 *
 * Owner: Agent 1 (Core). MASTER.md sections 4.3 and 7, task A1-13.
 * Request: ChatRequest `{ eraId, playerId, messages }`. Response: `text/event-stream`, one JSON
 * ChatStreamEvent per `data:` line, ending with `done` or `error`. The typed client's streamChat
 * parses it. Errors before the stream starts are JSON: 400 bad input, 404 unknown era,
 * 409 `era_not_ready` when the era has no guide yet.
 */
import type { NextRequest } from 'next/server';
import { ChatRequestSchema, parseEraId } from '@/lib/contracts';
import { ChatInputError, pickNextLandmark, streamGuideReply, toChatTurns } from '@/lib/chat';
import { formatSseEvent } from '@/lib/client/sse';
import { getEra, getLandmark, listCaptures, listLandmarks } from '@/lib/db';
import { handle, jsonError, readJson } from '../_lib/http';

/**
 * Stream a reply from the era's guide.
 *
 * @param request - Body: ChatRequest. Aborting the request stops generation.
 * @returns An SSE stream, or a JSON error.
 */
export async function POST(request: NextRequest): Promise<Response> {
  return handle('POST /api/chat', async () => {
    const body = await readJson(request, ChatRequestSchema);
    if (!body.ok) return body.response;
    const { eraId, playerId, messages } = body.data;

    try {
      toChatTurns(messages);
    } catch (err) {
      if (err instanceof ChatInputError) return jsonError(400, 'bad_request', err.message);
      throw err;
    }

    const { landmarkId } = parseEraId(eraId);
    const [era, landmark, landmarks, captures] = await Promise.all([
      getEra(eraId),
      getLandmark(landmarkId),
      listLandmarks(),
      listCaptures(playerId),
    ]);
    if (!era || !landmark) return jsonError(404, 'not_found', `No era "${eraId}"`);
    const { guide } = era;
    if (!guide) return jsonError(409, 'era_not_ready', 'This era has no guide yet. Generate it first.');

    const suggestion = pickNextLandmark(landmark, landmarks, new Set(captures.map((c) => c.landmarkId)));
    const events = streamGuideReply({ era: { ...era, guide }, landmark, suggestion, messages, signal: request.signal });
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        const next = await events.next();
        if (next.done) controller.close();
        else controller.enqueue(encoder.encode(formatSseEvent(next.value)));
      },
      async cancel() {
        await events.return(undefined);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store, no-transform',
        Connection: 'keep-alive',
        // Stops proxies such as nginx from buffering the stream.
        'X-Accel-Buffering': 'no',
      },
    });
  });
}
