/**
 * Vitest config for the Agent 3 spike. Owner: Agent 3.
 * Kept apart from vite.config.ts because that one moves the root into src/map-spike.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
  },
});
