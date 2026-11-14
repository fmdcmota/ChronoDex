'use client';

/**
 * Route `/dex`: the grid of badges, collected and not (MASTER.md section 1.1, task A3-07).
 *
 * Owner: Agent 3 (Explorer). Replaces the Agent 1 M0 placeholder.
 *
 * A client component because the player id and the cached Dex live in the browser's localStorage.
 * The screen itself is in src/components/explore/DexScreen.tsx.
 */
import DexScreen from '@/components/explore/DexScreen';

/**
 * The Dex page.
 *
 * @returns The Dex screen.
 */
export default function DexPage() {
  return <DexScreen />;
}
