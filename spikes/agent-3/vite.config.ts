/**
 * Vite config for the Agent 3 map spike (MASTER.md section 11, task A3-02).
 * Owner: Agent 3. Throwaway: the real app is Next.js and does not use this file.
 *
 * `npm run dev` serves on localhost over HTTP. `npm run dev:phone` (mode "phone") adds a
 * self-signed HTTPS certificate and listens on the LAN, because phones only grant location,
 * camera and motion access to secure origins.
 */
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }) => ({
  root: 'src/map-spike',
  // Sprites and badges are served from art/ so the spike shows exactly the committed PNGs.
  publicDir: '../../art',
  plugins: mode === 'phone' ? [basicSsl()] : [],
  build: { outDir: '../../dist', emptyOutDir: true },
}));
