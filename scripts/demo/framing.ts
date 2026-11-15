/**
 * Per-era scene notes for the demo set: what the camera of the reference photo would have seen in that year.
 *
 * Owner: Agent 6 (demo assets). Used by scripts/demo/generate-demo.ts.
 *
 * Why: the human asked that every reference photo and its scene show the same building from the same spot (15 Nov
 * 2026 review). The Historian's `sceneBrief.description` describes the place from wherever its sources looked, and
 * the period photographs given as extra references pull the composition towards their own viewpoint, so the first
 * scenes drifted (Queen's Tower 1962 became a shopping street, the Royal Albert Hall a distant garden view).
 * These notes are written from each reference photo's actual viewpoint, using the facts in the brief, and the demo
 * scenes are made without the period photographs. Each entry may also add things that must not appear (the human
 * asked for Porto's second bridge to go) and extra activity to show.
 *
 * Prompts are code (MASTER.md 8.4 rule 4): these texts are the inputs the scene and panorama prompt builders get.
 * Example use: `{ ...brief.sceneBrief, description: DEMO_FRAMING['dom-luis-bridge_1886'].description }`.
 */
import type { EraId, SceneBrief } from '@/lib/contracts';

/** Overrides for one era's scene brief. */
export interface DemoFraming {
  /** Replaces SceneBrief.description: the reference photo's view, in that year. */
  description: string;
  /** Added to SceneBrief.changes.notYetBuilt: things that must not appear in the scene or the panorama. */
  mustNotAppear?: string[];
  /** Replaces the London period cues (PromptStyle.periodCues) for places outside Britain. */
  periodCues?: string;
}

/** The framing notes, one per demo era. */
export const DEMO_FRAMING: Record<EraId, DemoFraming> = {
  'queens-tower_1893': {
    description:
      'Exactly the framing of the photograph: standing on Imperial Institute Road looking west and slightly up, a long building front running diagonally from the left edge into the distance, the tower rising behind it on the right with its dome against the sky. In 1893 the long building on the left is the brand-new Imperial Institute\'s ornate south frontage, in the same position and perspective as the modern library: pale Portland stone banded with red brick, rows of tall round-arched windows, carved friezes, gables and small domed turrets along the roofline. The central tower on the right is the same tower, new and clean, its copper dome bright copper-brown, not yet green. A clear sky with light smoke haze.',
    mustNotAppear: ['the modern library building', 'glass curtain walls', 'concrete panels', 'trees in front of the frontage'],
  },
  'queens-tower_1962': {
    description:
      'Exactly the framing of the photograph: standing on Imperial Institute Road looking west and slightly up, a long building front running diagonally from the left edge into the distance, the tower rising behind it on the right with its dome against the sky. In 1962 the Imperial Institute wing on the left is being demolished: its stone and brick front is half gone, empty window openings with sky behind them, scaffolding and timber hoardings along it, rubble at its foot, and a tall builder\'s crane beyond. The tower on the right still stands, its stone soot-darkened and its copper dome green. At the far end the bare concrete frame of a new college building is going up. Overcast 1960s sky.',
    mustNotAppear: ['the finished modern library with its glass band', 'shops, shop signs or a shopping street', 'buses or traffic'],
  },
  'royal-albert-hall_1871': {
    description:
      'Exactly the framing of the photograph: standing on the road directly in front of the north porch of the Royal Albert Hall, looking straight at it, the curved drum filling the frame from edge to edge. In 1871 the hall has just opened: clean, bright red brick and buff terracotta, the mosaic frieze fresh under the cornice. The central arch of the porch is an open carriage entrance with tall timber doors, no glass. In front, a macadam carriage road with gas lamps, two or three horse-drawn carriages and a hansom cab setting down concert-goers, Victorian men in top hats and women in bustled dresses on the pavement.',
    mustNotAppear: ['glass in the arch', 'bollards', 'modern signage or a banner', 'the Albert Memorial reflected in glass'],
  },
  'natural-history-museum_1862': {
    description:
      'Exactly the framing of the photograph: standing on the east lawn by Exhibition Road, looking west along the building front that runs from the right edge into the distance. In 1862 the building on this exact line is the International Exhibition building: a very long, plain, two-storey yellow-brown brick facade with tall round-arched windows in a regular rhythm, running in the same perspective from the right edge to the vanishing point, and where the museum\'s corner tower stands now, one of the exhibition\'s two enormous glass-and-iron domes rises above the roofline. Flags on poles along the parapet. In front, a gravel forecourt crowded with visitors in 1860s crinolines and top hats, a few carriages. A large tree on the left, as in the photograph.',
    mustNotAppear: ['the Natural History Museum or its towers', 'a wall or hoarding standing across the forecourt', 'garden umbrellas or modern cafe furniture'],
  },
  'natural-history-museum_1881': {
    description:
      'Exactly the framing of the photograph: standing on the east lawn by Exhibition Road, looking west along the museum front that runs from the right edge to the corner tower in the middle distance. In 1881 the Natural History Museum has just opened: the same building, its terracotta clean and bright buff and blue-grey, every carved detail sharp. The lawn is newly laid with young, thin trees instead of the large mature tree, iron railings along the front, a gravel path. A few visitors in 1880s dress walking towards the entrance.',
    mustNotAppear: ['garden umbrellas or cafe tables', 'people sitting on the grass', 'modern clothes'],
  },
  'zocalo-cathedral_1519': {
    description:
      'Exactly the framing of the photograph: a raised view across the great square, looking north to where the cathedral stands today, the same horizon and the same mountains in the haze. In 1519 this is Tenochtitlan: across a wide plaza paved with smooth white stucco rises the wall of the sacred precinct, decorated with carved serpent heads, and behind it, filling the place of the cathedral, the twin-shrine pyramid of the Templo Mayor with its two temples on top, plus smaller temple platforms. White plastered flat-roofed palaces to the left and right. People in white cotton cloaks and loincloths cross the plaza, porters carry loads with tumplines, a few warriors with feathered shields.',
    mustNotAppear: ['the cathedral or any church', 'horses, wheels or carts', 'trees in planters or a flagpole', 'Spanish soldiers'],
    periodCues:
      'Mexica people of Tenochtitlan: men in white cotton tilmatli cloaks knotted at the shoulder and loincloths, women in huipil blouses and wrap skirts, porters bent under loads carried with a tumpline across the forehead, priests in black robes, eagle and jaguar warriors with feathered shields, canoes on the canals, flower and maize sellers, white stucco walls, clear high-altitude light',
  },
  'dom-luis-bridge_1886': {
    description:
      'Exactly the framing of the photograph: standing at the Vila Nova de Gaia end of the upper deck, looking north along the brand-new iron arch bridge to Porto across the Douro, the old town and the cathedral hill on the left, the granite abutment wall on the right. In 1886 the bridge has just opened: fresh dark grey iron, the upper deck busy with traffic: ox carts loaded with barrels, mule carts, horse-drawn carriages, women carrying baskets on their heads, porters, men in flat caps and dark suits. Below on the river, wooden rabelo sailing boats with port wine barrels moored along the Ribeira quay.',
    mustNotAppear: ['a second bridge', 'a suspension bridge or its stone towers', 'overhead tram wires or lamp gantries', 'modern roofs with air-conditioning units', 'cars or trams', 'London streets, shopfronts or terraces'],
    periodCues:
      'Porto in 1886: ox carts with wooden wheels carrying port wine barrels, mule carts, a horse-drawn carriage or two, varinas (fishwives) and peasant women in black shawls carrying baskets and pots on their heads, porters in shirtsleeves and flat caps, men in dark suits and bowler hats, gas lamps on the bridge, rabelo boats with square sails on the Douro, terraced granite houses with red tiled roofs on the hillside',
  },
  'raffles-landing-site_1819': {
    description:
      'Exactly the framing of the photograph: standing on the north bank of the Singapore River, looking south across the water at the opposite bank, the river in the foreground. In 1819 there is no town: the far bank is muddy shore and mangrove, a handful of Malay stilt houses with attap roofs and a few beached sampans, low jungle-covered ground rising behind, tall tropical trees against a humid sky. Small boats and a dugout on the brown river, a British naval longboat with sailors rowing in the distance.',
    mustNotAppear: ['horses, carts or carriages', 'skyscrapers or shophouses', 'men in top hats', 'paved roads', 'brick buildings or a European street'],
    periodCues:
      'Singapore River in 1819: Malay and Orang Laut villagers in sarongs and headcloths, fishermen poling sampans and paddling dugouts, fish traps of bamboo stakes in the water, attap-roofed timber houses on stilts over the mud, mangroves and nipah palms, coconut palms, a humid hazy tropical sky',
  },
};

/**
 * Period detail for an era's prompts when it is outside Britain.
 *
 * @param eraId - The era.
 * @returns The cues, or undefined to keep the prompt builder's London default.
 */
export function demoPeriodCues(eraId: EraId): string | undefined {
  return DEMO_FRAMING[eraId]?.periodCues;
}

/**
 * The scene brief the demo uses for an era: the Historian's brief with the framing note applied, and no period
 * photographs (they pulled the composition away from the reference photo).
 *
 * @param eraId - The era.
 * @param brief - The Historian's scene brief.
 * @returns The brief to pass to the scene and panorama stages. Unchanged except for the photographs when the era
 *   has no framing note.
 */
export function demoSceneBrief(eraId: EraId, brief: SceneBrief): SceneBrief {
  const framing = DEMO_FRAMING[eraId];
  if (!framing) return { ...brief, referenceImageUrls: [] };
  return {
    ...brief,
    description: framing.description,
    changes: { ...brief.changes, notYetBuilt: [...brief.changes.notYetBuilt, ...(framing.mustNotAppear ?? [])] },
    referenceImageUrls: [],
  };
}
