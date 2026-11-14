/**
 * Prompt builders for the Historian. Prompts are code (MASTER.md 8.4 rule 4).
 *
 * Owner: Agent 1 (Core). Implements the Historian rules of MASTER.md section 7, task A1-11.
 * Two phases: research (with web search, free-text notes) then writing (structured JSON, no tools).
 * Unit tested in historian.test.ts.
 */
import { bearingDeg, type Landmark } from '@/lib/contracts';

/** Compass points for describing the camera direction in words. */
const COMPASS_POINTS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'] as const;
const DEGREES_PER_POINT = 360 / COMPASS_POINTS.length;

/** Script length bounds from MASTER.md section 7: about 45 seconds spoken. */
export const SCRIPT_MIN_WORDS = 105;
/** Upper script length bound. */
export const SCRIPT_MAX_WORDS = 120;

/**
 * The camera direction from the photo spot to the subject, in words.
 *
 * @param landmark - The landmark.
 * @returns For example "north (bearing 2°)".
 */
export function viewingDirection(landmark: Pick<Landmark, 'photoSpot' | 'subject'>): string {
  const deg = bearingDeg(landmark.photoSpot, landmark.subject);
  const point = COMPASS_POINTS[Math.round(deg / DEGREES_PER_POINT) % COMPASS_POINTS.length];
  return `${point} (bearing ${Math.round(deg)}°)`;
}

/**
 * Phase 1, research: find out what this place looked like and what life was like there in this year.
 *
 * Intent: a careful local historian who searches, cites every claim with a URL, says plainly when
 * the record is thin, and never uses Google imagery (MASTER.md section 6).
 *
 * Example output (the model's notes, abridged):
 *
 *     FACTS
 *     - The Imperial Institute was opened by Queen Victoria on 10 May 1893. [https://en.wikipedia.org/wiki/Imperial_Institute]
 *     SCENE FROM THE PHOTO SPOT
 *     - Facing north: the Institute's long red-brick front with the central tower ...
 *     GAPS
 *     - No photograph from exactly 1893 found; descriptions from 1890s engravings.
 *
 * @param landmark - The landmark.
 * @param year - The year to research.
 * @returns System and user prompt text.
 */
export function buildResearchPrompt(landmark: Landmark, year: number): { system: string; user: string } {
  const system = `You are a careful local historian of South Kensington, London. You research one place in one year for a public history game. Use web search. Prefer primary and scholarly sources (Survey of London on British History Online, Historic England, museum and college archives, Wikipedia for orientation). Every fact you report must carry the URL of the page that supports it. If the record for the year is thin, say so plainly instead of filling gaps. Do not use, link or describe Google Maps, Street View or Google Earth imagery.`;
  const user = `Research ${landmark.name} (${landmark.blurb}) as it was in ${year}.

The visitor stands at latitude ${landmark.photoSpot.lat}, longitude ${landmark.photoSpot.lng}, facing ${viewingDirection(landmark)} towards the subject at latitude ${landmark.subject.lat}, longitude ${landmark.subject.lng}. Coordinates may be off by tens of metres.

Write notes in plain text under these headings:
FACTS: dated, specific facts about this place in or around ${year}, each followed by its source URL in square brackets.
DAILY LIFE: customs, dress, transport and prices typical of the area in ${year}, each with a source URL.
SCENE FROM THE PHOTO SPOT: what the visitor would see in ${year} facing that way: buildings standing, under construction, not yet built, already gone; road surface, lighting, traffic, people. Compare with today where you can.
ALL AROUND: what surrounds the visitor through 360 degrees in ${year}.
IMAGES: URLs of public-domain or openly licensed period images of this view (Wikimedia Commons file pages are ideal). None from Google.
GAPS: what you could not confirm.`;
  return { system, user };
}

/**
 * Phase 2, writing: turn the research notes into the EraBrief JSON.
 *
 * Intent: a script writer who keeps to the notes, invents only a fictional everyday guide, and
 * hits the script length. The JSON shape is enforced by structured outputs; this prompt carries
 * the rules a schema cannot express.
 *
 * Example output (abridged JSON):
 *
 *     { "title": "The Imperial Institute opens", "summary": "...", "funFacts": ["..."],
 *       "sources": [{ "title": "Imperial Institute, Wikipedia", "url": "https://..." }],
 *       "sceneBrief": { "description": "...", "changes": { "persists": [...], ... }, ... },
 *       "guide": { "name": "Albert Finch", "role": "Porter at the Imperial Institute", ...,
 *                  "voiceKey": "placeholder-male-older", "script": "Good day! My name is Albert Finch ..." } }
 *
 * @param landmark - The landmark.
 * @param year - The year.
 * @param notes - Phase 1 output.
 * @param voices - Voice keys with descriptions, from VOICE_CATALOG.
 * @returns System and user prompt text.
 */
export function buildWritingPrompt(
  landmark: Landmark,
  year: number,
  notes: string,
  voices: Readonly<Record<string, { description: string }>>,
): { system: string; user: string } {
  const voiceList = Object.entries(voices)
    .map(([key, v]) => `- ${key}: ${v.description}`)
    .join('\n');
  const system = `You write the content for one stop of a public history game, from a historian's research notes. Use only facts that appear in the notes, and keep their sources. Write for curious visitors: clear, warm, concrete. Output must match the JSON schema exactly.`;
  const user = `Write the brief for ${landmark.name} in ${year}, from these research notes:

<notes>
${notes}
</notes>

Rules:
- title: a short headline for the year (under 60 characters).
- summary: 2 to 4 sentences. Every claim must be supported by a source in "sources". If the notes say the record is thin, say so in the summary.
- funFacts: 3 to 6 short facts from the notes, each supported by a source.
- sources: every URL the summary and facts rely on, with a readable title. Only URLs that appear in the notes.
- sceneBrief.description: what the camera sees from the photo spot facing ${viewingDirection(landmark)} in ${year}, in plain visual terms for an image model.
- sceneBrief.changes: compared with a present-day photo from the same spot: "persists" (still there), "altered" (there but different), "notYetBuilt" (exists today, not yet in ${year}), "gone" (in ${year}, gone today).
- sceneBrief.surroundings: what surrounds the viewer through 360 degrees, for a panorama.
- sceneBrief.referenceImageUrls: only public-domain or openly licensed image URLs from the notes. Never Google. Empty if none.
- guide: a FICTIONAL person with a plain everyday job tied to this place in ${year} (porter, cab driver, flower seller, student, builder...). Never a real named person.
  - bio: two sentences, first person.
  - appearance: age, build and period clothing, for an image model.
  - voiceKey: exactly one of these keys, matching the guide's sex and age:
${voiceList}
  - script: ${SCRIPT_MIN_WORDS} to ${SCRIPT_MAX_WORDS} words, spoken aloud by the guide to the visitor. It opens with the guide introducing themself by name, covers customs of the time and at least two facts from funFacts, and ends with a friendly goodbye as they walk off. Plain speech, no stage directions.
  - greeting: one or two sentences, the guide's first chat message.`;
  return { system, user };
}

/**
 * The follow-up message when a written brief fails the mechanical checks.
 *
 * Example output: "Your brief failed these checks: ... Return the complete corrected brief as JSON."
 *
 * @param problems - Human-readable problems from validateBrief.
 * @returns The user message text.
 */
export function buildCorrectionPrompt(problems: readonly string[]): string {
  return `Your brief failed these checks:\n${problems.map((p) => `- ${p}`).join('\n')}\nFix them and return the complete corrected brief as JSON. Keep everything else the same.`;
}
