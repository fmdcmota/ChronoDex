/**
 * Next.js configuration for Chronodex.
 *
 * Owner: Agent 1 (Core). Implements MASTER.md section 2 (one Next.js app at the repo root).
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
