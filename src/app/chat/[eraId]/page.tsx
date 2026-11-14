/**
 * Route `/chat/[eraId]`: text-message chat with the era's guide (MASTER.md section 1.1).
 *
 * Owner: Agent 4. Implements A4-07 and A4-08. The screen itself is in src/components/chat/.
 * A client page reading params with useParams(), as Agent 1's M0 notes say (params are Promises).
 */
'use client';

import { useParams } from 'next/navigation';
import { ChatScreen } from '@/components/chat/ChatScreen';

/**
 * Read the era id from the URL and render the chat.
 *
 * @returns The page.
 */
export default function ChatPage() {
  const { eraId } = useParams<{ eraId: string }>();
  return <ChatScreen eraId={eraId} />;
}
