/**
 * Vite config for the Agent 4 spikes (A4-01 360° viewer, A4-04/A4-08 media, A4-07 chat).
 * basic-ssl serves a self-signed HTTPS cert, because the gyroscope, the microphone and iOS motion
 * permission only work in a secure context. `npm run dev` listens on the LAN so a phone can open it.
 */
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// HTTP=1 serves plain HTTP for desktop checks: localhost is a secure context without TLS.
const plainHttp = process.env.HTTP === '1';

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(plainHttp ? [] : [basicSsl()])],
  server: { host: true, port: 5173 },
  // Three pages: the 360 viewer, the media spike and the chat spike.
  build: { rolldownOptions: { input: { main: 'index.html', media: 'media.html', chat: 'chat.html' } } },
});
