/**
 * Vite config for the Agent 4 360° spike (A4-01).
 * basic-ssl serves a self-signed HTTPS cert, because the gyroscope and iOS motion permission
 * only work in a secure context. `npm run dev` listens on the LAN so a phone can open it.
 */
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// HTTP=1 serves plain HTTP for desktop checks: localhost is a secure context without TLS.
const plainHttp = process.env.HTTP === '1';

export default defineConfig({
  plugins: plainHttp ? [] : [basicSsl()],
  server: { host: true, port: 5173 },
  // Two pages: the 360 viewer (A4-01) and the media spike (A4-04, A4-08).
  build: { rolldownOptions: { input: { main: 'index.html', media: 'media.html' } } },
});
