# Hosting the game at fmota.com/chronodex

Owner: Agent 4 (R3-4e, server and tunnel). The human asked for the game at fmota.com/chronodex, served from this machine.

## How it fits together

```
phone -> fmota.com/chronodex/...  (Netlify, static portfolio)
           | _redirects proxy (status 200, the address bar stays on fmota.com)
           v
         https://<pc>.<tailnet>.ts.net/chronodex/...  (Tailscale Funnel, fixed URL)
           v
         next start -p 3120 on this machine, built with NEXT_BASE_PATH=/chronodex
```

The normal phone server (port 3110, no base path, Cloudflare quick tunnel) keeps running beside it.

## Build and run (Git Bash, from the repo)

```bash
set -a; . ../../../.env.local; set +a
export MSYS2_ENV_CONV_EXCL=NEXT_BASE_PATH   # else Git Bash turns /chronodex into C:/Program Files/Git/chronodex
export NEXT_BASE_PATH=/chronodex NEXT_DIST_DIR=.next-chronodex
export NEXT_PUBLIC_USE_MOCKS= NEXT_PUBLIC_DEV_TOOLS=1 ALLOW_SPOOFED_LOCATION=1 MONGODB_DB=chronodex VIDEO_GENERATION=off
npx next build
git checkout tsconfig.json   # the build adds .next-chronodex type paths; do not commit them
nohup npx next start -p 3120 > server-chronodex.log 2>&1 < /dev/null & disown
```

Tailscale Funnel, once installed and signed in: `tailscale funnel --bg 3120`. `tailscale funnel status` shows the URL.

## Netlify rules (portfolio `dist/_redirects`)

Next prefixes pages, links and its own scripts with /chronodex, but not the raw paths the code and stored
data use (`/api/...`, `/sprites/...`, `/audio/...`, `/demo/...`, era media at `/api/media/...`). So fmota.com forwards
those root paths too, into /chronodex on this machine. These paths are then taken on fmota.com.

```
/chronodex                 https://HOST/chronodex                         200!
/chronodex/*               https://HOST/chronodex/:splat                  200!
/api/*                     https://HOST/chronodex/api/:splat              200!
/audio/*                   https://HOST/chronodex/audio/:splat            200!
/demo/*                    https://HOST/chronodex/demo/:splat             200!
/icons/*                   https://HOST/chronodex/icons/:splat            200!
/mock/*                    https://HOST/chronodex/mock/:splat             200!
/reference/*               https://HOST/chronodex/reference/:splat        200!
/sprites/*                 https://HOST/chronodex/sprites/:splat          200!
/manifest.webmanifest      https://HOST/chronodex/manifest.webmanifest    200!
/maplibre-gl-worker.mjs    https://HOST/chronodex/maplibre-gl-worker.mjs  200!
```

## Traps

- A new folder in `public/` or a new raw root path in code must be added to the list above (and to the
  comment in `next.config.ts`), or it 404s on fmota.com only. Check with a local imitation of these rules:
  any request that reaches the portfolio instead of the game is a miss (only `/favicon.ico` on 15 Nov).
- If this machine sleeps or the server stops, fmota.com/chronodex shows Netlify's proxy error.
- Netlify proxies can cut off very long requests. Chat streams and media are short enough so far.
