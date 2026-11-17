# Hosting the game at fmota.com/chronodex

Owner: Agent 4 (R3-4e, server and tunnel). The human asked for the game at fmota.com/chronodex, served
permanently from a laptop that stays open. Everything runs from one script: `host` at the repo root.

## How it fits together

```
phone -> fmota.com/chronodex/...      Netlify, the static portfolio (fmota-portfolio/dist)
           | dist/_redirects proxies (status 200, the address bar stays on fmota.com)
           v
         https://<laptop>.<tailnet>.ts.net/chronodex/...      Tailscale Funnel: fixed URL, free
           v
         next start on 127.0.0.1:3120, built with NEXT_BASE_PATH=/chronodex     ./host
         + the generation worker (video tier off)                                ./host
```

## One-time setup on the hosting laptop

1. **Tailscale** (gives the laptop a public HTTPS address that never changes):
   `winget install tailscale.tailscale`, open Tailscale from the tray, sign in. The first `./host` run
   prints a link if Funnel still has to be allowed for your tailnet: open it, allow, run `./host` again.
   Without Tailscale, `./host` uses a Cloudflare quick tunnel whose URL changes on every start.
2. **Power**: Settings > System > Power > Screen and sleep: "When plugged in, put my device to sleep
   after" Never. Control Panel > Power Options > "Choose what closing the lid does": "When I close the
   lid, plugged in" Do nothing. (`./host` already blocks idle sleep while it runs; the lid is not idle.)
3. **The checkout**: the repo folder on `main` with `.env.local` (MONGODB_URI, FAL_KEY,
   DEEPSEEK_API_KEY). `./host` pulls `main` on start and every 30 minutes.
4. **Start at sign-in** (optional): `./host autostart` (undo: `./host autostart off`). For a reboot to
   bring it back with nobody there, Windows must also sign in by itself, or use Task Scheduler instead.

## Run it (Git Bash, repo root)

```bash
./host            # pull, build (about 3 minutes), serve, tunnel, worker; restarts anything that dies
./host status     # running?, public URL, last log lines
./host stop       # from another window; Ctrl+C in its own window does the same
./host redirects  # the _redirects block for fmota.com
```

Settings by environment variable: `HOST_PORT` (3120), `HOST_BRANCH` (main), `HOST_UPDATE_MIN` (30, 0 = off),
`HOST_WORKER` (1), `PORTFOLIO_DIST`, `MONGODB_DB` (chronodex). Logs: `host-logs/`.

## fmota.com side

`./host` writes the block below into `../fmota com/fmota-portfolio/dist/_redirects` (between
`# chronodex start` and `# chronodex end`; other lines in the file are kept). Then redeploy the portfolio:
Netlify > the fmota.com site > Deploys > drag the `dist` folder onto the drop area. With Tailscale this is
needed once; the URL never changes after that.

Next prefixes pages, links and its own scripts with /chronodex, but not the raw root paths the code and
stored data use (`/api/...`, `/sprites/...`, `/audio/...`, `/demo/...`, era media at `/api/media/...`). So
fmota.com also forwards those root paths into /chronodex. `./host` builds the list from `public/`, so a
new folder there is picked up the next time it writes the file (redeploy after).

```
/chronodex                 https://HOST/chronodex                  200!
/chronodex/*               https://HOST/chronodex/:splat           200!
/api/*                     https://HOST/chronodex/api/:splat       200!
/audio/*                   https://HOST/chronodex/audio/:splat     200!
...one line per entry in public/
```

## Traps

- A new raw root path in code that is not under `public/` or `/api` 404s on fmota.com only.
- If the laptop sleeps, loses Wi-Fi or `./host` stops, fmota.com/chronodex shows Netlify's proxy error.
- Netlify can cut off very long proxied requests (limit not checked). Chat streams and media have been
  short enough; a very slow phone downloading a big video could be cut off.
- `next build` adds its type folder to tsconfig.json; `./host` puts the file back so pulls stay clean.
- Git Bash turns `/chronodex` in an environment variable into a Windows path unless
  `MSYS2_ENV_CONV_EXCL=NEXT_BASE_PATH` is set. `./host` sets it.
