/**
 * Entry point of the chat spike page (chat.html). Mounts ChatScreen with a fixture era.
 *
 * Owner: Agent 4. Spike for A4-07 and A4-08. Mock replies unless `?api=<origin>` points at a server.
 * The fixture guide is fictional (MASTER.md assumption A2), like every guide.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './chat.css';
import { ChatScreen } from './ChatScreen';
import type { Guide } from './contracts';

/** Stand-in for the era a real screen would load from GET /api/eras/[eraId]. */
const FIXTURE_ERA_ID = 'queens-tower_1893';
const FIXTURE_YEAR = 1893;
const FIXTURE_GUIDE: Guide = {
  name: 'Edith Marlow',
  role: 'Tea-room attendant at the Imperial Institute',
  bio: 'I pour the tea for visitors to the new Imperial Institute. I hear every bit of gossip in South Kensington.',
  appearance: 'Woman in her thirties, dark hair pinned up, black dress with a white apron and cap.',
  voiceKey: 'placeholder-female-british',
  script: '',
  greeting: "Good afternoon! I'm Edith, I pour the tea at the Institute. It's only just opened, you know. What would you like to hear about?",
  // Null on purpose: tests the initials fallback. The real headshot comes from the pipeline.
  headshotUrl: null,
};

/** Anonymous player id, the same way the app will keep it (MASTER.md section 2, Identity). */
function playerId(): string {
  const key = 'chronodex.playerId';
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(key, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <ChatScreen eraId={FIXTURE_ERA_ID} year={FIXTURE_YEAR} guide={FIXTURE_GUIDE} playerId={playerId()} backHref="./" />
  </StrictMode>,
);
