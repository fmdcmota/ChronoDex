# Video runbook: making the guide videos

Owner: Agent 2 (Studio). Finish line V7 in `REMAINING_WORK_2.md` section 0. Phone checks: Agent 4 (R3-4f).

This is the last step of the project: switch video on, make the videos one era at a time, switch it off. Every
command runs from the repo root in Git Bash. Keys stay in `.env.local`. Variables typed before a command override it.

## 0. Before you start (all must be true)

- [ ] V1 to V9 are ticked on the board, and the human has said **go**. The video freezes the script, so the
      fact-check (V8) comes first.
- [ ] **fal has credit.** At 04:20 on 15 Nov fal refused a free upload with "User is locked. Reason: Exhausted
      balance". Top up at fal.ai/dashboard/billing. The command below checks this for free before it queues anything.
- [ ] Budget: about **$4.34 an era** (guide frame and check $0.27, two 5 s walk clips $1.57, talk about $2.50). One
      era is about 15 minutes.

## 1. Free rehearsal (2 minutes, no spend)

Copy the demo eras to a scratch database, then run the exact video command on dry-run stages:

    node --import tsx --env-file=.env.local spikes/agent-2/copy-db.mts chronodex chronodex_rehearse_agent2
    NEXT_PUBLIC_USE_MOCKS=1 VIDEO_GENERATION=on MONGODB_DB=chronodex_rehearse_agent2 \
      npx tsx --env-file=.env.local scripts/pregenerate.ts --rehearse --video --only queens-tower_1893

Expect `video ready` in the table. Rehearsal refuses to run on `chronodex`.

## 2. The canary: Queen's Tower 1893

    # See the plan and the price. Spends nothing.
    NEXT_PUBLIC_USE_MOCKS= VIDEO_GENERATION=on VIDEO_ERAS=queens-tower_1893 MONGODB_DB=chronodex \
      npx tsx --env-file=.env.local scripts/pregenerate.ts --dry-run --video --only queens-tower_1893
    # Make it. Refuses to start if the estimate is over $5.
    NEXT_PUBLIC_USE_MOCKS= VIDEO_GENERATION=on VIDEO_ERAS=queens-tower_1893 MONGODB_DB=chronodex \
      npx tsx --env-file=.env.local scripts/pregenerate.ts --video --only queens-tower_1893 --max-usd 5 --concurrency 1

`VIDEO_ERAS` is Agent 1's allow list (R3-1a). It does nothing until that lands, and it does no harm.

**Watch:** the terminal prints each job. On a phone, the Time Machine's progress sheet for that era lists each
stage with its model. The stages are guide_frame (about 1 min), then walk_on, talk and walk_off at the same time.
The talk clip is the slowest, about 14 min for 38 s.

**Stop:** Ctrl+C once stops claiming and lets the running job finish. Pressing it twice exits at once. Every fal
request id is saved, so running the same command again resumes and never pays twice for a finished clip.

## 3. Check the canary on a phone (phone checks: Agent 4, R3-4f)

Use an iPhone in Safari through the tunnel URL on the board (and an Android phone if one is around). Sound on,
silent switch off.

**While it is being made** (open the Time Machine for the canary before or during the run):

- [ ] Queen's Tower, year 1893. A **progress sheet** appears at the top with guide_frame, walk_on, talk and
      walk_off, each with its model and a running time. The 360° view and the **▶ Meet** button stay usable.
- [ ] The preview still plays while the job runs (portrait walks on, narration, captions). Nothing asks for a reload.
- [ ] When the job ends the sheet folds away and the button resets to **▶ Meet**. **No reload.** (If the preview
      was playing at that moment it stops and the button comes back: that is expected.)

**The real clips** (tap ▶ Meet):

- [ ] Walk on, talk, walk off play in order with **no black flash or freeze** between clips (under a frame).
- [ ] Same person, same clothes, same spot in all three clips, and they match the chat's profile picture.
- [ ] Lips match the voice through the talk clip. The voice is the narration voice, start to finish, not cut short.
- [ ] **Captions** appear during the talk clip only and keep pace with the words.
- [ ] The background ambience goes quiet under the voice and comes back after. The ♪ button still mutes it.
- [ ] **Skip ›** stops everything at once and offers **Chat with <guide>**. The chat opens and replies.
- [ ] Leave the page and come back: the clips start promptly (they come from the browser's cache).
- [ ] iPhone only: the clips play inline (not forced full screen) and the sound comes out of the speaker, not the
      earpiece. Lock and unlock the phone mid-clip: Meet or Skip still works.
- [ ] Then/Now stays hidden for this era (expected until the scene is remade from a wide photo).

**On the server side:**

- [ ] The job's stages carry no `KEPT WITH PROBLEMS` flag. If one does, look at that clip before going on.

If the canary is wrong, stop here and post on the board. Do not make the next era.

## 4. Back up, then the next eras

    MONGODB_DB=chronodex npx tsx --env-file=.env.local scripts/backup-media.ts --only queens-tower_1893

Then repeat section 2 for one era at a time. Credit allows at most two more. Suggested order:
`royal-albert-hall_1871`, then one outside London, which the team picks. Back up each era after it is made.

## 5. Switch off

Remove `VIDEO_GENERATION=on` and `VIDEO_ERAS` from `.env.local` if they were put there, and restart the server.
Post on the board: which eras have video, what they cost, and the backup folder.

## If something fails

| What you see | Meaning | Do |
|---|---|---|
| `fal refused a free test upload ... Exhausted balance` | No fal credit | Top up, then run again |
| `--video needs VIDEO_GENERATION=on` | The switch is off | Add `VIDEO_GENERATION=on` before the command |
| `Could not queue ...: video_disabled` | The era is not on `VIDEO_ERAS` | Add it to `VIDEO_ERAS` |
| Video `failed`, stages `skipped: ... site path` | A stored input is not readable by fal | Run `spikes/agent-2/falurl-repair.mts --fix` on `chronodex`, then run again |
| `talk` failed with an audio or length error | Kling refused the narration | Post on the board. Agent 2 splits the narration into two clips |
| `stitch` skipped | fal's ffmpeg API is not open to our key | Normal. The player plays the three clips in order |
