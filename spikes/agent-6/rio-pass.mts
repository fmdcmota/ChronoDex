// Agent 6: repaint the city in the Rio 1931 scene. The plain edit kept every modern tower (twice), so the city area is
// greyed out first and the model must paint it fresh. About $0.15.
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { MODELS, runFal, uploadToFal } from '../../src/lib/fal/index';
import { buildImageEditInput } from '../../src/lib/pipeline/stages/inputs';
const file = 'public/demo/christ-the-redeemer_1931/scene.jpg';
const img = sharp(readFileSync(file));
const { width = 0, height = 0 } = await img.metadata();
// The built-up area: the lower part of the frame, from just below the bay's far shore. A polygon that leaves the
// mountains on the right and the bay in place.
const w = width, h = height;
const pts = [[0, 0.54], [0.36, 0.7], [0.47, 0.62], [0.6, 0.53], [0.68, 0.55], [0.8, 0.6], [0.85, 0.75], [1, 0.82], [1, 1], [0, 1]].map(([x, y]) => `${Math.round(x * w)},${Math.round(y * h)}`).join(' ');
const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><polygon points="${pts}" fill="#808080"/></svg>`);
const greyed = await img.composite([{ input: mask }]).png().toBuffer();
const url = await uploadToFal(new Blob([new Uint8Array(greyed)], { type: 'image/png' }));
const prompt = 'This is a photograph of Rio de Janeiro seen from the Corcovado mountain in 1931, with a flat grey area covering the lower part. Replace all of the flat grey with the 1931 city at the foot of the mountain, seen from high above: a low town of two- and three-storey colonial houses with red terracotta tiled roofs and pale walls, among gardens, palm trees and tree-lined streets, a few church towers and squares, and forested hillsides at the edges. Nothing taller than three storeys. Keep everything that is not grey exactly as it is: the bay, Sugarloaf, the mountains, the boats, the sea and the sky. Match the perspective, haze and light. It must look like one real early colour photograph from 1931, muted colours, fine grain, no text, no grey left.';
const { data } = await runFal<{ images?: { url?: string }[] }>(MODELS.scene.endpoint, buildImageEditInput(prompt, [url]));
const out = data.images?.[0]?.url;
if (!out) throw new Error('no image');
writeFileSync(file, await sharp(Buffer.from(await (await fetch(out)).arrayBuffer())).resize(w, h, { fit: 'fill' }).jpeg({ quality: 90 }).toBuffer());
console.log('rio city repainted', out);
