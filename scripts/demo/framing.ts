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
  /** Replaces SceneBrief.surroundings (what the panorama paints around the scene), for example to keep it at eye level. */
  surroundings?: string;
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
      'Exactly the framing of the photograph: standing at ground level in the middle of the great square among a crowd, eye height, looking north to where the cathedral stands today, the same horizon line. In 1519 this is the heart of Tenochtitlan: the wide plaza is paved with smooth white stucco and busy with people; across it rises the wall of the sacred precinct, carved with serpent heads, and behind it, filling the place of the cathedral’s two towers, the great twin-shrine pyramid of the Templo Mayor with its two temples on top, its steep staircase facing the viewer, plus smaller temple platforms. People in white cotton cloaks fill the foreground as the crowd does in the photograph, porters carry loads with tumplines, a few warriors with feathered shields.',
    mustNotAppear: ['the cathedral or any church', 'horses, wheels or carts', 'trees in planters or a flagpole', 'Spanish soldiers', 'a view from above, rooftops seen from above or an aerial view'],
    surroundings:
      'Seen from eye height, standing on the paving in the middle of the busy plaza: the camera is at the height of a person, so the horizon runs through the heads of the crowd and buildings are seen from below, never from above. Ahead, the precinct wall and the Templo Mayor. To the right (east), the long white front of the palace of Moctezuma with its colonnade. To the left (west), more white palaces and temple platforms. Behind the viewer, the plaza continues south towards the causeway, crowded with people, porters and market mats. Clear high-altitude blue sky with a few clouds, the volcanoes faint on the horizon.',
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
  'brandenburg-gate-east_1987': {
    description:
      'Exactly the framing of the photograph: standing on Pariser Platz on the East Berlin side at eye level, looking west straight at the Brandenburg Gate, the quadriga on top facing the viewer, the same size and position in the frame. In 1987 this is the GDR border zone: the gate is soot-grey and weathered, the square in front of it is closed to the public and almost empty, with a low white-and-red barrier fence across it and a sign forbidding entry. Through the columns the grey concrete Berlin Wall with its rounded top runs across behind the gate, and beyond it a watchtower. Two East German border guards in grey-green uniforms and peaked caps stand by the barrier. A GDR flag on a pole beside the gate. Overcast sky.',
    mustNotAppear: ['the Fernsehturm TV tower or the Berlin Cathedral dome seen through the gate (they stand behind the viewer, to the east; through the gate are the Wall, the death strip and the trees of the Tiergarten in West Berlin)', 'any readable text, signs or lettering', 'tourists or crowds at the gate', 'modern buildings, embassies or the Hotel Adlon around the square', 'modern cars, vans or bicycles', 'Western advertising', 'the gate lit in colours'],
    periodCues:
      'East Berlin in 1987: Trabant and Wartburg cars at a distance, East German border guards (Grenztruppen) in grey-green uniforms, plain concrete lamp posts, worn cobbles and cracked asphalt, the GDR flag (black, red and gold with the hammer and compass emblem), people in 1980s East German anoraks and jeans kept well back, the muted colours and fine grain of ORWO colour film, a grey overcast sky',
    surroundings:
      'Seen from eye height on Pariser Platz in the East Berlin border zone in 1987. Ahead (west), the Brandenburg Gate with the Berlin Wall curving behind it and a concrete watchtower. To the left and right, the square is mostly empty ground where the bombed buildings were cleared, with a few bare plane trees, lamp posts and the plain side walls of East German buildings. Behind the viewer (east), the start of Unter den Linden with its lime trees and grey East German facades, a few Trabants parked, people walking at a distance. Overcast sky.',
  },
  'praca-do-comercio_1754': {
    description:
      'Exactly the framing of the photograph: standing at street level in the south-west corner of the riverside square, looking north-east across it, the same horizon and perspective. In 1754, a year before the great earthquake, this is the Terreiro do Paço: there is no triumphal arch, no yellow arcades and no equestrian statue. Along the left (west) side stands the long royal Ribeira Palace, a stately Baroque front of pale stone with rows of tall windows and a square corner tower with a pointed roof. Ahead across the square, a jumble of older multi-storey merchant houses with red tiled roofs and narrow streets leading into the old city, and the castle hill rising behind. The square is unpaved packed earth and cobbles, busy with people.',
    mustNotAppear: ['the triumphal arch (Arco da Rua Augusta)', 'yellow arcaded buildings', 'the equestrian statue', 'street signs, lamp posts, trams or cars', 'patterned calçada paving'],
    periodCues:
      'Lisbon in 1754: men in tricorn hats, long coats and breeches, wigs, women in long full skirts and shawls, black-clad clergy, fishwives (varinas) carrying baskets on their heads, water carriers with barrels, sedan chairs and a gilded carriage, mules with packs, ships’ masts on the Tagus, golden late-afternoon Atlantic light, the soft look of an 18th-century scene rendered as a real photograph',
    surroundings:
      'Seen from eye height in the Terreiro do Paço in 1754. To the left (west), the long Baroque front of the royal Ribeira Palace with its corner tower. Ahead (north and east), old merchant houses with red roofs, church towers and the castle hill. Behind the viewer (south), the open waterfront of the river Tagus with quays, small boats and the masts of tall sailing ships at anchor. Clear sky with a few clouds.',
  },
  'praca-do-comercio_1775': {
    description:
      'Exactly the framing of the photograph: standing at street level in the south-west corner of the riverside square, looking north-east across it, the same horizon and perspective. In 1775, twenty years after the earthquake, the new Praça do Comércio is rising: the long arcaded government buildings on the left and ahead stand in fresh pale stone and ochre render, some bays still in scaffolding; the great bronze equestrian statue of King José I has just been unveiled on its tall plinth in the middle of the square, with crowds around it. There is no triumphal arch yet: the north side opens straight into the new street, the Rua Augusta, with only plain building fronts either side.',
    mustNotAppear: ['the triumphal arch (Arco da Rua Augusta), built a century later', 'street signs, lamp posts, trams or cars', 'patterned calçada paving', 'the old Ribeira Palace'],
    periodCues:
      'Lisbon in 1775: men in tricorn hats, long coats and breeches, powdered wigs, women in wide skirts and shawls, soldiers in blue coats lining the square for the statue unveiling, black-clad clergy, a gilded royal coach, varinas with baskets on their heads, builders with ladders and stone blocks, ships\u2019 masts on the Tagus, bright Atlantic light, rendered as a real photograph',
    surroundings:
      'Seen from eye height in the new Praça do Comércio in 1775. To the left (west) and ahead (north), the long new arcaded buildings, partly in scaffolding, and the opening of the Rua Augusta. To the right (east), more new arcades. Behind the viewer (south), the open waterfront of the river Tagus with quays, small boats and tall sailing ships at anchor. Clear sky with a few clouds.',
  },
  'christ-the-redeemer_1931': {
    description:
      'Exactly the framing of the photograph: standing at the railing of the summit platform at the foot of the statue, eye level, looking south-east over Botafogo bay to Sugarloaf Mountain, the same horizon, the same mountains, islands and bay shapes. In October 1931, the week the statue is unveiled, the platform is a new plain concrete terrace with a low stone parapet, and the crowd in the foreground at the parapet are visitors of 1931: men in suits, straw boaters and fedoras, women in light dresses and cloche hats, a priest in a cassock, a boy in shorts, some pointing at the view; nobody holds a phone or a camera held up high. Far below, the city of 1931 is a low town of two- and three-storey houses with red tiled roofs among gardens and trees, with no high-rise towers or apartment blocks at all, and much more forest on the slopes. Steamships and sailing boats in the bay.',
    mustNotAppear: ['phones, selfie sticks or modern cameras', 'modern clothes, caps, sunglasses or backpacks', 'high-rise towers or modern apartment blocks', 'modern cars, motorways or tunnels', 'modern yachts or a marina', 'any text or signs'],
    periodCues:
      'Rio de Janeiro in October 1931: inauguration visitors in 1930s suits, straw boaters, fedoras, light dresses and cloche hats, a priest in a black cassock, the brand-new Art Deco statue in pale soapstone mosaic behind the viewer, the little electric rack railway train at the summit station, dense Atlantic rainforest, steamships in Guanabara Bay, low red-roofed houses, hazy tropical light, the muted colours of an early colour photograph',
    surroundings:
      'Seen from eye height at the railing of the Corcovado summit platform in 1931, 700 m above Rio. Ahead (south-east), Botafogo bay, Urca and Sugarloaf, the Atlantic beyond. To the left (north-east), Guanabara Bay with the low old city centre, the port and the Niteroi hills. To the right (south), the Lagoa lagoon and the beaches of Copacabana and Ipanema with only a few low buildings. Behind the viewer, the platform with more 1931 visitors and, towering over them, the new statue of Christ the Redeemer with outstretched arms, and the forested Tijuca peaks. The city lies far below the horizon, low and red-roofed, with no high-rise towers. Hazy sky.',
  },
  'roman-forum_120': {
    description:
      'Exactly the framing of the photograph: standing on the terrace at the foot of the Capitoline Hill, looking east down over the Forum, the same horizon, the same hills and the same positions of the monuments. In AD 120, under Emperor Hadrian, every building is whole and in use: on the left the Arch of Septimius Severus does not exist yet (it is built in AD 203), so there is open paving and the Curia, the senate house, with its tall brick front; in the centre the Temple of Vespasian stands complete with its six Corinthian columns, pediment and roof, gleaming white marble; on the right the Temple of Saturn with its full portico of tall columns on a high podium, and beyond it the two-storey arcades of the Basilica Julia. Down the middle the paved Forum square and the Sacred Way are crowded, lined with honorific columns and gilded bronze statues, and at the far end the Colosseum stands complete against the sky. No ruins, no modern buildings, no church: the left-hand church is replaced by Roman buildings.',
    mustNotAppear: ['ruins, broken columns or bare foundations', 'the church of Santi Luca e Martina or any church or dome', 'the Arch of Septimius Severus', 'cypress or umbrella pine trees growing among the ruins', 'tourists, railings, signs or modern buildings'],
    periodCues:
      'Rome in AD 120: citizens in white togas, people in tunics and coloured cloaks, senators with purple-striped togas, soldiers of the Praetorian Guard, slaves carrying litters, market stalls, gleaming white and coloured marble, painted details and gilded bronze statues on the buildings, red terracotta roof tiles, bright Mediterranean sunlight, rendered as a real photograph',
    surroundings:
      'Seen from eye height on the Capitoline terrace above the Forum in AD 120. Ahead (east), the Forum, the Sacred Way and the Colosseum. To the right (south), the Palatine Hill crowned by the vast imperial palaces of the emperors. To the left (north), the Curia and the Imperial Fora with the Forum of Trajan and its column. Behind the viewer (west), the Temple of Jupiter on the Capitoline Hill with its gilded roof and the Tabularium archives. Clear blue sky.',
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
    surroundings: framing.surroundings ?? brief.surroundings,
    changes: { ...brief.changes, notYetBuilt: [...brief.changes.notYetBuilt, ...(framing.mustNotAppear ?? [])] },
    referenceImageUrls: [],
  };
}
