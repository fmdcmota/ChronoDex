---
name: haiku-delegate
description: Hand mechanical, well-specified work to a Claude Haiku subagent so a Chronodex build agent keeps its own time and context for design and integration. Use when you are one of the four Chronodex agents and a task is repetitive or easy to specify exactly, such as doc comments, unit tests for pure functions, fixtures, boilerplate that copies an existing pattern, reading a model's schema page, or summarising logs.
---

# Haiku delegation

Each of the four Chronodex agents may hand small, mechanical jobs to a Haiku subagent. Haiku is fast and cheap. You stay responsible for everything it produces.

Your own sheet lists what to hand over and what to keep:

- Agent 1, Core: [agent-1.md](agent-1.md)
- Agent 2, Studio: [agent-2.md](agent-2.md)
- Agent 3, Explorer: [agent-3.md](agent-3.md)
- Agent 4, Time Machine: [agent-4.md](agent-4.md)
- Agent 5, Archivist: [agent-5.md](agent-5.md) (brief in `AGENT5.md`)

Read your sheet before you delegate anything.

## Delegate only when all four are true

1. You can state the task and what "done" means in a few sentences, with no need for this conversation.
2. It touches only files you own (`MASTER.md` section 3), and you can list them.
3. A pattern already exists for it to copy, or the rules are fully written down.
4. A mistake would be cheap to spot in the diff.

## Never delegate

- The contracts in `MASTER.md` section 4, architecture, or anything another agent depends on.
- Prompt design for the Historian, the guide chat or the fal stages. Tests for prompt builders are fine.
- Judging images, audio or video.
- Anything that spends money. A delegate makes no fal call and no Claude API call.
- Git. A delegate never commits, pushes, pulls, switches branch or stashes.
- `BOARD.md`, the notebooks and `MASTER.md`. Only you write the board and your notebook.
- Secrets. Never give a delegate a key, and never let it read `.env.local`.
- Anything that needs a phone or a human.

## How to delegate

1. Start a subagent with the model set to Haiku. In Claude Code that is the Agent tool (called Task in some versions) with `model: "haiku"`. The full model id is `claude-haiku-5-5`.
2. Give it the brief below, filled in. It knows nothing about this project except what the brief says.
3. Tasks that touch different files can run at the same time: start them in one message. Never put two delegates on the same file.
4. When it returns, read the whole diff and run `npm run check`. Fix it, redo it, or throw it away.
5. Note in your notebook log what you delegated and whether you kept it.

If your tool has no subagents or no Haiku, skip this skill and do the work yourself.

## Brief template

```
You are helping Agent <N> of the Chronodex build. Do exactly this task and nothing else.

Task: <one or two sentences>

Files you may create or change: <explicit list>. Touch nothing else.

Read first: <files that show the pattern or hold the rules>

Rules:
- Follow the documentation standard in MASTER.md section 8.4: a header comment
  on every file, a doc comment on every export, units in names (radiusM, durationS).
- Do not run any git command that changes anything (no commit, push, pull,
  checkout, stash).
- Do not call any paid API (fal, Anthropic). Do not read or print .env files.
- Do not install packages. If you think one is needed, stop and say so.
- Do not edit BOARD.md, MASTER.md, DEV_NOTEBOOK.md or anything in notebook/.

Done when: <a condition you can check, for example "npx vitest run src/lib/contracts passes">

Report back: the files you changed, anything you were unsure about, and anything
you could not do.
```
