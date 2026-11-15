/**
 * Tests for the image critic and the "check, then retry once, then keep the better" logic. Owner: Agent 2 (Studio).
 * Task A2-12. Nothing here calls fal: a fake queue answers both the image model and the vision model.
 */
import { describe, expect, it, vi } from 'vitest';
import type { SceneBrief } from '@/lib/contracts';
import { MODELS, type FalQueueLike } from '@/lib/fal';
import { criticContext, generateChecked, checksEnabled, badness } from './checked';
import { checkGuideFrame, checkPanorama, checkScene, parseJsonAnswer, type CheckVerdict } from './critic';
import { buildPanoramaCheckPrompt, buildSceneCheckPrompt, buildGuideFrameCheckPrompt, withCorrection } from './prompts';
import { runGuideFrame } from './guideFrame';
import { runScene } from './scene';
import type { StageContext, StageOutput } from './types';

const brief: SceneBrief = {
  description: 'x',
  changes: { persists: [], altered: [], notYetBuilt: ['modern lamps', 'cars'], gone: [] },
  surroundings: 'y',
  referenceImageUrls: [],
};

/**
 * A fake queue: image requests return a numbered picture, vision requests return the next scripted answer.
 *
 * @param answers - What the critic says, in order. A string is its raw `output`; an Error makes that call fail.
 */
function fakeFal(answers: (string | Error)[]): FalQueueLike & { submitted: { endpoint: string; input: Record<string, unknown> }[] } {
  const submitted: { endpoint: string; input: Record<string, unknown> }[] = [];
  let pictures = 0;
  let asked = 0;
  const results = new Map<string, unknown>();
  return {
    submitted,
    async submit(endpoint, options) {
      submitted.push({ endpoint, input: options.input });
      const id = `req-${submitted.length}`;
      if (endpoint === MODELS.image_check.endpoint) {
        const answer = answers[Math.min(asked++, answers.length - 1)];
        if (answer instanceof Error) throw answer;
        results.set(id, { output: answer, usage: { cost: 0.0125 } });
      } else {
        results.set(id, { images: [{ url: `https://cdn/picture-${++pictures}.jpg` }] });
      }
      return { request_id: id };
    },
    async status() {
      return { status: 'COMPLETED' };
    },
    async result(_endpoint, options) {
      return { data: results.get(options.requestId) };
    },
  };
}

const PASS = JSON.stringify({ anachronisms: [], looks_computer_generated: false, verdict: 'pass', problems: [], fix: '' });
const FAIL = (fix: string): string => JSON.stringify({ anachronisms: ['a modern lamp'], looks_computer_generated: false, verdict: 'fail', problems: ['a modern lamp is still standing'], fix });

describe('parseJsonAnswer', () => {
  it('reads plain JSON, JSON in a code fence, and JSON after a sentence', () => {
    expect(parseJsonAnswer('{"a":1}')).toEqual({ a: 1 });
    expect(parseJsonAnswer('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJsonAnswer('Here is my answer: {"a":{"b":2}} Hope that helps.')).toEqual({ a: { b: 2 } });
  });

  it('returns null for text with no object, broken JSON, and arrays', () => {
    expect(parseJsonAnswer('looks fine to me')).toBeNull();
    expect(parseJsonAnswer('{"a":')).toBeNull();
    expect(parseJsonAnswer('[1,2]')).toBeNull();
    expect(parseJsonAnswer('')).toBeNull();
  });
});

describe('verdict rules', () => {
  const ctx = { pollIntervalMs: 0 };

  it('a panorama passes only when it is a 360 projection with no seams, level horizon and no problems', async () => {
    const good = JSON.stringify({ projection: 'equirectangular_360', horizon_level_and_central: true, visible_seams: false, edges_match: true, anachronisms: [], looks_computer_generated: false, verdict: 'pass', problems: [], fix: '' });
    expect((await checkPanorama('u', 'p', { ...ctx, queue: fakeFal([good]) })).passed).toBe(true);
    for (const patch of [{ projection: 'flat_photo' }, { projection: 'tiled' }, { projection: 'other' }, { visible_seams: true }, { anachronisms: ['a car'] }]) {
      const bad = JSON.stringify({ ...JSON.parse(good), ...patch });
      const verdict = await checkPanorama('u', 'p', { ...ctx, queue: fakeFal([bad]) });
      expect(verdict.passed, JSON.stringify(patch)).toBe(false);
      expect(verdict.problems.length).toBeGreaterThan(0);
    }
  });

  it('records soft opinions (horizon, edges, a glossy look) as notes without failing the panorama', async () => {
    const soft = JSON.stringify({
      projection: 'equirectangular_360',
      horizon_level_and_central: false,
      visible_seams: false,
      edges_match: false,
      anachronisms: [],
      looks_computer_generated: true,
      verdict: 'fail',
      problems: ['glossy sky', 'edges do not quite match'],
      fix: 'make it grittier',
    });
    const verdict = await checkPanorama('u', 'p', { pollIntervalMs: 0, queue: fakeFal([soft]) });
    expect(verdict.passed).toBe(true);
    expect(verdict.hard).toEqual([]);
    expect(verdict.problems).toEqual(expect.arrayContaining(['glossy sky', 'edges do not quite match']));
  });

  it('does not trust a "pass" that sits next to a listed anachronism, and ignores a "fail" with no hard reason', async () => {
    const lying = JSON.stringify({ anachronisms: ['a car'], looks_computer_generated: false, verdict: 'pass', problems: [], fix: '' });
    expect((await checkScene('u', 'p', { ...ctx, queue: fakeFal([lying]) })).passed).toBe(false);
    const vague = JSON.stringify({ anachronisms: [], looks_computer_generated: false, verdict: 'fail', problems: [], fix: '' });
    expect((await checkScene('u', 'p', { ...ctx, queue: fakeFal([vague]) })).passed).toBe(true);
  });

  it('a scene fails when it looks computer generated', async () => {
    const cgi = JSON.stringify({ anachronisms: [], looks_computer_generated: true, verdict: 'pass', problems: [], fix: '' });
    const verdict = await checkScene('u', 'p', { ...ctx, queue: fakeFal([cgi]) });
    expect(verdict.passed).toBe(false);
    expect(verdict.hard.join(' ')).toMatch(/computer generated/);
  });

  it('a guide frame fails on a small face, a different person or a distorted street', async () => {
    for (const patch of [{ face_visible_and_large: false }, { same_person_as_portrait: false }, { scene_unchanged: false }]) {
      const answer = JSON.stringify({ face_visible_and_large: true, same_person_as_portrait: true, scene_unchanged: true, verdict: 'pass', problems: [], fix: '', ...patch });
      expect((await checkGuideFrame('f', 'p', 'q', { ...ctx, queue: fakeFal([answer]) })).passed, JSON.stringify(patch)).toBe(false);
    }
  });

  it('keeps the picture, unchecked, when the critic is unreachable or answers in prose', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const down = await checkScene('u', 'p', { ...ctx, queue: fakeFal([new Error('fal is down')]) });
    expect(down).toMatchObject({ passed: true, checked: false });
    const prose = await checkScene('u', 'p', { ...ctx, queue: fakeFal(['It looks fine to me.']) });
    expect(prose).toMatchObject({ passed: true, checked: false });
    warn.mockRestore();
  });

  it('records the cost fal reports', async () => {
    expect((await checkScene('u', 'p', { ...ctx, queue: fakeFal([PASS]) })).costUsd).toBe(0.0125);
  });

  it('sends the critic the picture, the prompt and the configured model, at temperature 0', async () => {
    const queue = fakeFal([PASS]);
    await checkScene('https://cdn/p.jpg', 'THE PROMPT', { pollIntervalMs: 0, queue });
    expect(queue.submitted[0].endpoint).toBe(MODELS.image_check.endpoint);
    expect(queue.submitted[0].input).toMatchObject({ image_urls: ['https://cdn/p.jpg'], prompt: 'THE PROMPT', temperature: 0, model: expect.stringContaining('claude') });
  });
});

describe('check prompts', () => {
  it('say what must be absent and ask for JSON only', () => {
    const scene = buildSceneCheckPrompt(1893, ['modern lamps', 'cars']);
    expect(scene).toContain('modern lamps; cars');
    expect(scene).toContain('1893');
    expect(scene).toContain('one JSON object and nothing else');
    expect(buildPanoramaCheckPrompt(1893)).toContain('equirectangular_360');
    expect(buildPanoramaCheckPrompt(1893)).toContain('"flat_photo"');
    expect(buildGuideFrameCheckPrompt()).toContain('Image 2 is a portrait');
  });

  it('withCorrection leaves the first attempt alone and adds the advice on the retry', () => {
    expect(withCorrection('PROMPT', null)).toBe('PROMPT');
    expect(withCorrection('PROMPT', 'remove the lamp')).toContain('remove the lamp');
    expect(withCorrection('PROMPT', 'remove the lamp').startsWith('PROMPT')).toBe(true);
  });
});

describe('generateChecked', () => {
  const verdict = (passed: boolean, problems: string[] = [], fix = ''): CheckVerdict => ({ passed, checked: true, problems, hard: passed ? [] : problems, fix, raw: {}, costUsd: 0.01 });
  const picture = (n: number): StageOutput => ({ url: `pic-${n}`, model: 'm', requestId: `r${n}`, elapsedMs: 1 });

  it('keeps a picture that passes the first time, after one generation', async () => {
    const generate = vi.fn(async () => picture(1));
    const { output, report } = await generateChecked({ ctx: {}, generate, judge: async () => ({ verdict: verdict(true) }) });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(output.url).toBe('pic-1');
    expect(report).toMatchObject({ passed: true, attempts: 1, problems: [] });
  });

  it('retries once with the critic\'s fix and keeps a retry that passes, with the resume id cleared', async () => {
    const seen: { fix: string | null; resume: string | null | undefined }[] = [];
    let n = 0;
    const { output, report } = await generateChecked({
      ctx: { resumeRequestId: 'saved' },
      generate: async (fix, c) => {
        seen.push({ fix, resume: c.resumeRequestId });
        return picture(++n);
      },
      judge: async (p) => ({ verdict: p.url === 'pic-1' ? verdict(false, ['a lamp'], 'remove the lamp') : verdict(true) }),
    });
    expect(seen).toEqual([{ fix: null, resume: 'saved' }, { fix: 'remove the lamp', resume: null }]);
    expect(output.url).toBe('pic-2');
    expect(report).toMatchObject({ passed: true, attempts: 2, checkCostUsd: 0.02 });
  });

  it('keeps the first picture when the retry is worse, and never tries a third time', async () => {
    let n = 0;
    const generate = vi.fn(async () => picture(++n));
    const { output, report } = await generateChecked({
      ctx: {},
      generate,
      judge: async (p) => ({ verdict: p.url === 'pic-1' ? verdict(false, ['one problem']) : verdict(false, ['a', 'b', 'c']) }),
    });
    expect(generate).toHaveBeenCalledTimes(2);
    expect(output.url).toBe('pic-1');
    expect(report).toMatchObject({ passed: false, attempts: 2, problems: ['one problem'] });
  });

  it('counts extra local problems against a picture even when the critic passes it', async () => {
    let n = 0;
    const { output } = await generateChecked({
      ctx: {},
      generate: async () => picture(++n),
      judge: async (p) => ({ verdict: verdict(true), extraProblems: p.url === 'pic-1' ? ['half the canvas is grey'] : [] }),
    });
    expect(output.url).toBe('pic-2');
  });

  it('does nothing extra when checks are off', async () => {
    const judge = vi.fn(async () => ({ verdict: verdict(false, ['x']) }));
    const generate = vi.fn(async () => picture(1));
    const { report } = await generateChecked({ ctx: { checks: 'off' }, generate, judge });
    expect(judge).not.toHaveBeenCalled();
    expect(generate).toHaveBeenCalledTimes(1);
    expect(report.checked).toBe(false);
  });

  it('scores a pass as 0 and a fail as at least 1', () => {
    expect(badness(verdict(true))).toBe(0);
    expect(badness(verdict(false, []))).toBe(1);
    expect(badness(verdict(false, ['a', 'b']))).toBe(2);
    expect(badness(verdict(true), 1)).toBe(1);
  });

  it('the critic context drops the resume id and the request-id callback, so the critic cannot overwrite the picture\'s id', () => {
    const queue = fakeFal([]);
    const stageCtx: StageContext = { resumeRequestId: 'x', onRequestId: () => undefined, onPoll: () => undefined, pollIntervalMs: 5, queue };
    const critic = criticContext(stageCtx);
    expect(critic.resumeRequestId).toBeUndefined();
    expect(critic.onRequestId).toBeUndefined();
    expect(critic.queue).toBe(queue);
    expect(critic.pollIntervalMs).toBe(5);
  });

  it('checksEnabled follows the context first, then IMAGE_CHECKS', () => {
    vi.stubEnv('IMAGE_CHECKS', 'off');
    expect(checksEnabled({})).toBe(false);
    expect(checksEnabled({ checks: 'on' })).toBe(true);
    vi.stubEnv('IMAGE_CHECKS', '');
    expect(checksEnabled({})).toBe(true);
    expect(checksEnabled({ checks: 'off' })).toBe(false);
    vi.unstubAllEnvs();
  });
});

describe('the checked stages', () => {
  it('runScene repeats the edit with the critic\'s advice when the first picture fails, and reports it', async () => {
    const queue = fakeFal([FAIL('remove every modern lamp post'), PASS]);
    const out = await runScene({ referencePhotoUrl: 'PRESENT', brief, year: 1893 }, { queue, pollIntervalMs: 0 });
    const edits = queue.submitted.filter((s) => s.endpoint === MODELS.scene.endpoint);
    expect(edits).toHaveLength(2);
    expect(String(edits[0].input.prompt)).not.toContain('remove every modern lamp post');
    expect(String(edits[1].input.prompt)).toContain('remove every modern lamp post');
    expect(out.url).toBe('https://cdn/picture-2.jpg');
    expect(out.check).toMatchObject({ passed: true, attempts: 2 });
  });

  it('runScene makes one edit and no retry when the critic is happy, and the critic sees the picture, not the stage\'s ids', async () => {
    const queue = fakeFal([PASS]);
    const saved: string[] = [];
    const out = await runScene({ referencePhotoUrl: 'PRESENT', brief, year: 1893 }, { queue, pollIntervalMs: 0, onRequestId: (id) => void saved.push(id) });
    expect(queue.submitted.filter((s) => s.endpoint === MODELS.scene.endpoint)).toHaveLength(1);
    expect(out.check).toMatchObject({ passed: true, attempts: 1 });
    // Only the picture's request id is saved, never the critic's.
    expect(saved).toEqual(['req-1']);
  });

  it('runScene skips the critic entirely when checks are off', async () => {
    const queue = fakeFal([FAIL('x')]);
    const out = await runScene({ referencePhotoUrl: 'PRESENT', brief, year: 1893 }, { queue, pollIntervalMs: 0, checks: 'off' });
    expect(queue.submitted.every((s) => s.endpoint === MODELS.scene.endpoint)).toBe(true);
    expect(out.check?.checked).toBe(false);
  });

  it('runGuideFrame judges the frame against the portrait and retries once on a small face', async () => {
    const small = JSON.stringify({ face_visible_and_large: false, same_person_as_portrait: true, scene_unchanged: true, verdict: 'fail', problems: ['the face is tiny'], fix: 'frame the guide from the waist up, much closer' });
    const good = JSON.stringify({ face_visible_and_large: true, same_person_as_portrait: true, scene_unchanged: true, verdict: 'pass', problems: [], fix: '' });
    const queue = fakeFal([small, good]);
    const out = await runGuideFrame({ sceneUrl: 'S', headshotUrl: 'H', guide: { name: 'A', role: 'B', appearance: 'C' }, year: 1893 }, { queue, pollIntervalMs: 0 });
    const checks = queue.submitted.filter((s) => s.endpoint === MODELS.image_check.endpoint);
    expect(checks[0].input.image_urls).toEqual(['https://cdn/picture-1.jpg', 'H']);
    expect(out.check).toMatchObject({ passed: true, attempts: 2 });
  });
});

describe('scene viewpoint check (phone test 6.5)', () => {
  it('sends the reference photo as image 2 and fails a scene whose viewpoint changed', async () => {
    const moved = JSON.stringify({ anachronisms: [], looks_computer_generated: false, same_viewpoint: false, verdict: 'fail', problems: [], fix: 'keep the camera where it is' });
    const queue = fakeFal([moved]);
    const verdict = await checkScene('https://cdn/scene.jpg', buildSceneCheckPrompt(1893, [], true), { pollIntervalMs: 0, queue }, 'https://cdn/reference.jpg');
    expect(queue.submitted[0].input.image_urls).toEqual(['https://cdn/scene.jpg', 'https://cdn/reference.jpg']);
    expect(verdict.passed).toBe(false);
    expect(verdict.hard.join(' ')).toMatch(/same viewpoint/);
  });

  it('passes a scene that kept the viewpoint, and asks about the viewpoint only when a reference is sent', async () => {
    const kept = JSON.stringify({ anachronisms: [], looks_computer_generated: false, same_viewpoint: true, verdict: 'pass', problems: [], fix: '' });
    expect((await checkScene('s', buildSceneCheckPrompt(1893, [], true), { pollIntervalMs: 0, queue: fakeFal([kept]) }, 'r')).passed).toBe(true);
    expect(buildSceneCheckPrompt(1893, [], true)).toContain('"same_viewpoint"');
    expect(buildSceneCheckPrompt(1893, [])).not.toContain('same_viewpoint');
  });
});
