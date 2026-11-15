/**
 * Calibrate the image critic (A2-12) on panoramas whose answer is already known. Owner: Agent 2 (Studio).
 *
 * Question: does the vision model tell a real 360 panorama from a flat photo, a tiled layout or one with a
 * hard seam? Runs the production checkPanorama on a labelled set and prints agreement.
 *
 * Usage (from spikes/agent-2/): npm run critic -- <modelId>      (default: the production CRITIC_MODEL_ID)
 * Cost: about a cent per image.
 */
import { uploadFile, failAndExit } from './lib.js';
import { checkPanorama } from '../../src/lib/pipeline/stages/critic.js';
import { buildPanoramaCheckPrompt } from '../../src/lib/pipeline/stages/prompts.js';

/** Known cases: what a human saw when looking at each file. */
const CASES: { file: string; truth: 'real' | 'flat' | 'tiled'; note: string }[] = [
  { file: 'out/pano-1880-b2-2x1.jpg', truth: 'real', note: 'A2-03 route b2, true sphere (some modern road markings)' },
  { file: 'out/realism/pano-colour-ref.jpg', truth: 'real', note: 'colour, refs: true sphere' },
  { file: 'out/realism/pano-colour-noref.jpg', truth: 'real', note: 'colour, no refs: true sphere' },
  { file: 'out/realism/pano-colour-feather.jpg', truth: 'real', note: 'colour, feathered edge: true sphere' },
  { file: 'out/realism/pano-mono-ref.jpg', truth: 'real', note: 'monochrome: true sphere, stain and seam line' },
  { file: 'out/e2e-pano.jpg', truth: 'real', note: 'live end-to-end run: true sphere (Albert Hall behind the viewer), the critic called it flat' },
  { file: 'out/realism/feather-run-2.jpg', truth: 'flat', note: 'feathered run 2: one-direction wide photo' },
  { file: 'out/realism/stage-final.jpg', truth: 'flat', note: 'production run: flat wide photo' },
  { file: 'out/realism/pano-mono-feather.jpg', truth: 'flat', note: 'monochrome feathered: flat wide photo' },
  { file: 'out/realism/pano-old.jpg', truth: 'tiled', note: 'old prompt: three tiled panels' },
];

/** Run the calibration. */
async function main(): Promise<void> {
  if (process.argv[2]) process.env.IMAGE_CHECK_MODEL = process.argv[2];
  const prompt = buildPanoramaCheckPrompt(1893);
  let agree = 0;
  let spend = 0;
  for (const c of CASES) {
    const url = await uploadFile(c.file);
    const t = Date.now();
    const v = await checkPanorama(url, prompt);
    spend += v.costUsd ?? 0;
    const sawReal = v.checked && v.raw?.projection === 'equirectangular_360';
    const ok = c.truth === 'real' ? sawReal : !sawReal;
    if (ok) agree++;
    console.log(
      `${ok ? 'OK  ' : 'MISS'} truth=${c.truth.padEnd(5)} critic: projection=${String(v.raw?.projection)} seams=${String(v.raw?.visible_seams)} horizon=${String(v.raw?.horizon_level_and_central)} edges=${String(v.raw?.edges_match)} passed=${v.passed} (${((Date.now() - t) / 1000).toFixed(1)} s, $${(v.costUsd ?? 0).toFixed(4)})  ${c.file.split('/').pop()}`,
    );
    if (v.problems.length) console.log(`       problems: ${v.problems.join(' | ').slice(0, 220)}`);
  }
  console.log(`\nagreement on projection: ${agree}/${CASES.length}, spend $${spend.toFixed(3)}`);
}

main().catch((error: unknown) => failAndExit('critic', error));
