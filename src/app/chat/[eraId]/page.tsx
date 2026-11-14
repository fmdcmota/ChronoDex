/**
 * Route `/chat/[eraId]`: text-message chat with the era's guide (MASTER.md section 1.1).
 *
 * Owner: Agent 4 (Time Machine). Created by Agent 1 as the M0 placeholder (task A1-06): it shows
 * the greeting and streams replies from the typed client.
 * TODO(agent-4): A4-07 and A4-08 replace this with the real chat screen and voice.
 */
'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { ChatMessage, Era } from '@/lib/contracts';
import { api, getPlayerId } from '@/lib/client';

/**
 * Placeholder chat: a list of bubbles and a text box.
 *
 * @returns The page.
 */
export default function ChatPage() {
  const { eraId } = useParams<{ eraId: string }>();
  const [era, setEra] = useState<Era | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    api.getEra(eraId).then(
      ({ era: loaded }) => {
        setEra(loaded);
        if (loaded.guide) setMessages([{ role: 'guide', text: loaded.guide.greeting }]);
      },
      (err: Error) => setError(err.message),
    );
    return () => abort.current?.abort();
  }, [eraId]);

  const send = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    const history: ChatMessage[] = [...messages, { role: 'player', text }];
    setMessages([...history, { role: 'guide', text: '' }]);
    setDraft('');
    setBusy(true);
    abort.current = new AbortController();
    try {
      let reply = '';
      for await (const event of api.streamChat({ eraId, playerId: getPlayerId(), messages: history }, { signal: abort.current.signal })) {
        if (event.type === 'error') throw new Error(event.message);
        reply = event.type === 'done' ? event.text : reply + event.text;
        setMessages([...history, { role: 'guide', text: reply }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chat failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">
        Chat: {era?.guide ? `${era.guide.name}, ${era.guide.role}` : eraId} (placeholder)
      </h1>
      {error && <p className="text-red-700">{error}</p>}
      <ul className="space-y-2">
        {messages.map((m, i) => (
          <li key={i} className={m.role === 'player' ? 'text-right' : 'text-left'}>
            <span className="inline-block border-2 border-foreground px-3 py-1">{m.text || '…'}</span>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          className="flex-1 border-2 border-foreground px-2 py-1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask your guide…"
        />
        <button className="border-2 border-foreground px-3 py-1" disabled={busy || !era?.guide}>
          Send
        </button>
      </form>
    </section>
  );
}
