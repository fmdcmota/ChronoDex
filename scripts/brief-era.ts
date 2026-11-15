/**
 * `npm run brief`: run the Historian for demo eras and save each brief for a human to read.
 *
 * Owner: Agent 1 (Core). Task A1-16 (MASTER.md section 11) and the H7 accuracy gate (section 10).
 *
 * Usage:
 *   npm run brief -- queens-tower_1893             one era
 *   npm run brief -- --all                         every era in the fixtures
 *   npm run brief -- queens-tower_1893 --save      also store the brief on the era in the database
 *   npm run brief -- queens-tower_1893 --force --save --replace
 *                                                  regenerate, and overwrite a brief already stored, but only
 *                                                  while the era has no generated media (see saveBrief)
 *
 * What it does, per era: calls `writeEraBrief` (DeepSeek with web search, 2 to 3 minutes and well
 * under $0.10 of tokens on deepseek-flash, see notebook/agent-1.md), then writes
 * `briefs/<eraId>.json` and a readable `briefs/<eraId>.md` listing every claim next to its sources.
 * A brief that already exists on disk is not regenerated unless `--force` is passed, so a rerun after
 * a failure never pays twice.
 *
 * If `data/eras/<eraId>.notes.txt` exists the Historian writes from it with no web search, and the
 * Archivist's sources and images are merged in (src/lib/archive).
 *
 * `--save` patches title, summary, funFacts, sources, sceneBrief and guide onto the era in the database
 * named by MONGODB_URI and MONGODB_DB. It never touches `state`, media fields or an era that already
 * has a brief (unless `--replace`, and then only an era with no media), so the pipeline (which skips its brief stage when one exists) carries on from here and
 * nothing generated is overwritten. The brief stays a draft until a human has read it (H7).
 * Side effects: DeepSeek requests, files in briefs/, optional database writes. No fal calls.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { EraBriefSchema, eraIdOf, type EraBrief, type EraId } from '@/lib/contracts';
import { closeMongo, getEra, mongoConfigured, patchEra } from '@/lib/db';
import { writeEraBrief } from '@/lib/historian';
import { landmarks } from '@fixtures/index';

/** Where briefs are written, relative to the repo root. */
const BRIEF_DIR = path.join(process.cwd(), 'briefs');

/** Every era id the fixtures define, in landmark order. */
function allEraIds(): EraId[] {
  return landmarks.flatMap((landmark) => landmark.eraYears.map((year) => eraIdOf(landmark.id, year)));
}

/**
 * Render a brief as Markdown for the human reading it (H7).
 *
 * @param eraId - The era the brief is for.
 * @param brief - The validated brief.
 * @returns Markdown with the facts, the sources, the scene description and the guide's script.
 */
function renderMarkdown(eraId: EraId, brief: EraBrief): string {
  const lines = [
    `# ${brief.title} (${eraId})`,
    '',
    '**Status: DRAFT. A human must check every claim against its source before generation spends credits (H7).**',
    '',
    '## Summary',
    brief.summary,
    '',
    '## Fun facts',
    ...brief.funFacts.map((fact) => `- ${fact}`),
    '',
    '## Sources',
    ...brief.sources.map((source) => `- [${source.title}](${source.url})`),
    '',
    '## What the camera sees',
    brief.sceneBrief.description,
    '',
    `Persists: ${brief.sceneBrief.changes.persists.join('; ') || 'none'}`,
    `Altered: ${brief.sceneBrief.changes.altered.join('; ') || 'none'}`,
    `Not yet built: ${brief.sceneBrief.changes.notYetBuilt.join('; ') || 'none'}`,
    `Gone: ${brief.sceneBrief.changes.gone.join('; ') || 'none'}`,
    '',
    `Surroundings: ${brief.sceneBrief.surroundings}`,
    '',
    `## Guide: ${brief.guide.name}, ${brief.guide.role}`,
    brief.guide.bio,
    '',
    `Appearance: ${brief.guide.appearance}`,
    `Voice: ${brief.guide.voiceKey}`,
    '',
    '### Script',
    brief.guide.script,
    '',
    '### Greeting',
    brief.guide.greeting,
    '',
  ];
  return lines.join('\n');
}

/**
 * Write one brief to disk, or reuse the one already there.
 *
 * @param eraId - The era to brief.
 * @param force - Regenerate even if briefs/<eraId>.json exists.
 * @returns The brief and whether it was freshly generated.
 * @throws HistorianError when the Historian cannot produce a valid brief.
 */
async function briefOne(eraId: EraId, force: boolean): Promise<{ brief: EraBrief; fresh: boolean }> {
  const file = path.join(BRIEF_DIR, `${eraId}.json`);
  if (!force && existsSync(file)) {
    return { brief: EraBriefSchema.parse(JSON.parse(readFileSync(file, 'utf8'))), fresh: false };
  }
  const [landmarkId, yearText] = [eraId.slice(0, eraId.lastIndexOf('_')), eraId.slice(eraId.lastIndexOf('_') + 1)];
  const landmark = landmarks.find((candidate) => candidate.id === landmarkId);
  if (!landmark) throw new Error(`Unknown landmark in era id ${eraId}`);
  const started = Date.now();
  const brief = await writeEraBrief(landmark, Number(yearText));
  console.log(`${eraId}: brief written in ${Math.round((Date.now() - started) / 1000)} s`);
  mkdirSync(BRIEF_DIR, { recursive: true });
  writeFileSync(file, `${JSON.stringify(brief, null, 2)}\n`);
  writeFileSync(path.join(BRIEF_DIR, `${eraId}.md`), renderMarkdown(eraId, brief));
  return { brief, fresh: true };
}

/**
 * Store a brief on its era, only if the era has none yet.
 *
 * @param eraId - The era to patch.
 * @param brief - The brief to store. The guide's headshot stays null until the pipeline makes it.
 * @param replace - Overwrite a brief the era already has. Refused once the era has any generated media,
 *   because the headshot, scene and narration were made from the old guide and brief and would no longer match.
 * @returns True if the database was written, false if the era already had a brief, has media, or does not exist.
 */
async function saveBrief(eraId: EraId, brief: EraBrief, replace: boolean): Promise<boolean> {
  const era = await getEra(eraId);
  if (!era) {
    console.warn(`${eraId}: not in the database (run npm run seed first)`);
    return false;
  }
  if (era.guide || era.sceneBrief) {
    const hasMedia = Boolean(era.sceneImageUrl || era.panorama || era.narrationAudioUrl || era.guide?.headshotUrl || era.guideVideo);
    if (!replace) {
      console.log(`${eraId}: already has a brief in the database, left alone (pass --replace to overwrite)`);
      return false;
    }
    if (hasMedia || era.state !== 'missing') {
      console.warn(`${eraId}: has generated media or is not 'missing', so its brief was NOT replaced`);
      return false;
    }
  }
  await patchEra(eraId, {
    title: brief.title,
    summary: brief.summary,
    funFacts: brief.funFacts,
    sources: brief.sources,
    sceneBrief: brief.sceneBrief,
    guide: { ...brief.guide, headshotUrl: null },
  });
  console.log(`${eraId}: brief saved to the database`);
  return true;
}

/** Parse the arguments and brief each era in turn. A failure on one era does not stop the rest. */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((arg) => arg.startsWith('--')));
  const ids = flags.has('--all') ? allEraIds() : args.filter((arg) => !arg.startsWith('--'));
  if (ids.length === 0) {
    console.error('Name an era (for example queens-tower_1893) or pass --all.');
    process.exitCode = 1;
    return;
  }
  const save = flags.has('--save');
  if (save && !mongoConfigured()) {
    console.error('--save needs MONGODB_URI in .env.local.');
    process.exitCode = 1;
    return;
  }
  for (const eraId of ids) {
    try {
      const { brief } = await briefOne(eraId, flags.has('--force'));
      if (save) await saveBrief(eraId, brief, flags.has('--replace'));
    } catch (err) {
      console.error(`${eraId}: FAILED:`, err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  }
}

main()
  .catch((err: unknown) => {
    console.error('Brief failed:', err);
    process.exitCode = 1;
  })
  .finally(() => closeMongo());
