/**
 * Picture credits for an era: who made the third-party images we show or feed to the models, under which licence.
 *
 * Owner: Agent 4 (Time Machine). Task A4-b, REMAINING_WORK.md. Server only (reads the Archivist's data/ files).
 * Why: CC BY and CC BY-SA require the author and licence wherever the picture is used. The present-day reference
 * photo is shown in the Then/Now slider, and period photos shape every AI reconstruction, so both are credited in
 * the app. Source of truth: data/landmarks/<id>.json `referencePhoto` and data/eras/<eraId>.json `referenceImages`
 * (the same files data/ATTRIBUTION.md is generated from). Missing or malformed files give no credits, not an error.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

/** One credited picture. Serialised as is by GET /api/media/credits/[eraId]. */
export interface PictureCredit {
  /** `reference`: the present-day photo shown in Then/Now. `period`: an archive image given to the models. */
  role: 'reference' | 'period';
  title: string;
  author: string;
  /** As written on the file page, for example "CC BY-SA 4.0" or "Public domain". */
  licence: string;
  /** The licence's deed, or null for public domain and unknown licences. */
  licenceUrl: string | null;
  /** The file page (Wikimedia Commons or a museum), or null. */
  pageUrl: string | null;
}

const ReferencePhotoSchema = z.object({
  referencePhoto: z
    .object({
      status: z.string(),
      pageUrl: z.string().nullish(),
      licence: z.string().nullish(),
      author: z.string().nullish(),
    })
    .nullish(),
});

const EraImagesSchema = z.object({
  referenceImages: z
    .array(
      z.object({
        title: z.string().nullish(),
        pageUrl: z.string().nullish(),
        url: z.string().nullish(),
        licence: z.string().nullish(),
        author: z.string().nullish(),
      }),
    )
    .nullish(),
});

/**
 * The deed URL for a Creative Commons licence name.
 *
 * @param licence - For example "CC BY-SA 4.0", "CC BY 2.0" or "CC0".
 * @returns The creativecommons.org deed, or null for anything else (public domain, unknown).
 * @example licenceUrlFor('CC BY-SA 4.0') // 'https://creativecommons.org/licenses/by-sa/4.0/'
 */
export function licenceUrlFor(licence: string): string | null {
  const l = licence.trim();
  if (/^CC0\b/i.test(l)) return 'https://creativecommons.org/publicdomain/zero/1.0/';
  const m = /^CC (BY(?:-(?:SA|NC|ND|NC-SA|NC-ND))?) (\d\.\d)$/i.exec(l);
  return m ? `https://creativecommons.org/licenses/${m[1].toLowerCase()}/${m[2]}/` : null;
}

/** Read and parse a JSON file, or null when it is missing or not JSON. */
async function readJson(file: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * The credits for one era: its landmark's reference photo, then the era's period images.
 *
 * Side effects: reads up to two small files under `dataDir`.
 *
 * @param landmarkId - The landmark, for its reference photo.
 * @param eraId - The era, for its period images.
 * @param dataDir - The Archivist's data folder (src/lib/archive's archiveDir()).
 * @returns The credits, possibly empty. Never throws for missing or malformed files.
 */
export async function eraPictureCredits(landmarkId: string, eraId: string, dataDir: string): Promise<PictureCredit[]> {
  const credits: PictureCredit[] = [];
  const landmark = ReferencePhotoSchema.safeParse(await readJson(path.join(dataDir, 'landmarks', `${landmarkId}.json`)));
  const photo = landmark.success ? landmark.data.referencePhoto : null;
  // H1 photos are the team's own and need no credit (data/ATTRIBUTION.md says the same).
  if (photo && photo.status === 'commons_stand_in' && photo.licence) {
    credits.push({
      role: 'reference',
      title: 'Present-day photo',
      author: photo.author || 'Unknown author',
      licence: photo.licence,
      licenceUrl: licenceUrlFor(photo.licence),
      pageUrl: photo.pageUrl ?? null,
    });
  }
  const era = EraImagesSchema.safeParse(await readJson(path.join(dataDir, 'eras', `${eraId}.json`)));
  for (const image of (era.success ? era.data.referenceImages : null) ?? []) {
    if (!image.licence) continue;
    credits.push({
      role: 'period',
      title: image.title || 'Period image',
      author: image.author || 'Unknown author',
      licence: image.licence,
      licenceUrl: licenceUrlFor(image.licence),
      pageUrl: image.pageUrl ?? image.url ?? null,
    });
  }
  return credits;
}
