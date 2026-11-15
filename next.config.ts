/**
 * Next.js configuration for Chronodex.
 *
 * Owner: Agent 1 (Core). Implements MASTER.md section 2 (one Next.js app at the repo root).
 */
import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

/**
 * Tunnel services teammates use to reach a laptop's dev server from a phone. A `*` stands for
 * exactly one hostname label, so `*.ngrok-free.app` matches `abc123.ngrok-free.app`.
 */
const TUNNEL_HOST_PATTERNS = [
  "*.ngrok-free.app",
  "*.ngrok-free.dev",
  "*.ngrok.app",
  "*.ngrok.io",
  "*.trycloudflare.com",
  "*.loca.lt",
  // VS Code dev tunnels nest a region label: abc-3000.euw.devtunnels.ms. `**` is one or more labels.
  "**.devtunnels.ms",
];

/**
 * Hostnames, other than localhost, that may load the dev server's scripts and hot-reload socket.
 *
 * Why: since Next 15 the dev server refuses cross-origin requests for `/_next/*` assets and the
 * HMR websocket from any hostname except `localhost` and the one it was started with. Opening the
 * site as `http://192.168.x.y:3000` or through a tunnel URL then serves the HTML but blocks every
 * script, so the page shows and nothing works (no map, no buttons). Production (`next start`,
 * Vercel) ignores this setting.
 *
 * Includes every IPv4 address of this machine (Wi-Fi, Ethernet, hotspot), the tunnel patterns
 * above, and any extra hostnames in `DEV_ALLOWED_ORIGINS` (comma-separated, no scheme, no port).
 *
 * @returns Hostname patterns in the `allowedDevOrigins` format.
 */
function devOrigins(): string[] {
  const lanIps = Object.values(networkInterfaces())
    .flat()
    .filter((iface) => iface !== undefined && iface.family === "IPv4" && !iface.internal)
    .map((iface) => iface!.address);
  const extra = (process.env.DEV_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((host) => host.trim().replace(/^https?:\/\//, "").replace(/[:/].*$/, ""))
    .filter(Boolean);
  return [...new Set([...lanIps, ...TUNNEL_HOST_PATTERNS, ...extra])];
}

/**
 * Optional path prefix, for hosting the game under another site, e.g. "/chronodex" for
 * fmota.com/chronodex (Netlify proxies that path to this machine). Empty by default, so local runs
 * and every other deploy are unchanged. Read at build time: rebuild after changing it.
 */
const BASE_PATH = (process.env.NEXT_BASE_PATH ?? "").replace(/\/+$/, "");

// Trap: Next prefixes pages, <Link> and its own scripts, but not raw strings such as
// fetch("/api/..."), <img src="/sprites/...">, the ambience files, stored era media ("/api/media/...",
// "/demo/...") or the map worker. Next cannot rewrite those back itself (a basePath:false rewrite must
// point at an external URL), so the host site forwards them: fmota.com/api/* goes to
// <this machine>/chronodex/api/*, and so on for audio, demo, icons, mock, reference, sprites,
// manifest.webmanifest and maplibre-gl-worker.mjs. See spikes/agent-4/HOSTING.md.

const nextConfig: NextConfig = {
  ...(BASE_PATH ? { basePath: BASE_PATH } : {}),
  // A second build (e.g. the /chronodex one) can go to its own folder so it runs beside the normal one.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // Lets a phone on the LAN or a tunnel URL run the dev build. See devOrigins() above.
  allowedDevOrigins: devOrigins(),
  // Cache Components (and the Partial Prefetching that goes with it) is the scaffold default in
  // Next 16. It is off on purpose: our screens are client components that read live data, our API
  // is fully dynamic, and the prerender rules it adds ("uncached data outside <Suspense>") are a
  // trap for agents trained on earlier Next.js. Decision D-014 in DEV_NOTEBOOK.md.
  cacheComponents: false,
  partialPrefetching: false,
  // `next dev` would otherwise write a managed block into AGENTS.md, which the humans own
  // (MASTER.md section 3). The same advice lives in DEV_NOTEBOOK.md (F-014).
  agentRules: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
