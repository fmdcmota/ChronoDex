# src/components/ui

The shared pixel-style UI kit (Agent 3, task A3-03). Build screens from these so every screen
shares one look. Import from the folder: `import { Button, Card, Sheet } from '@/components/ui'`.

| Component | Use |
|---|---|
| `Button` | Gold call to action, or `variant="quiet"`. Pass `href` for a link that looks like a button |
| `Card` | Framed paper panel, optional `title` |
| `Sheet` | Bottom sheet over a full-screen page, optional `onClose` |
| `Spinner` | Stepped square loading indicator |
| `ProgressList` | Steps with a state mark. States match `JobStage.state`, so job stages map straight in |
| `Toast` | Self-dismissing message, calls `onDone` after `durationMs` |

Styles are in `src/app/globals.css`, classes prefixed `ui-` (and the older `.btn`). Colours come from
the theme tokens at the top of that file; do not hard-code colours in a screen.

Traps: the Map's landmark card keeps its own older `.sheet` class. `Toast` is a client component.
Colour is never the only signal: `ProgressList` also uses a symbol and hidden text.
