// The picture a modal fixture's stage of the gallery shows of it open (lib/fixture-gallery.ts, `picture`): its
// baseline — the web package's snapshot of it, packages/web/snapshots/<component>/<id>.png, taken at a device pixel
// ratio of 2 in the light scheme under the default system — made as small as the stage draws it, at that same ratio,
// as a WebP. One for each modal fixture that has a baseline, and for nothing else: what the gallery draws in the page
// it draws from the web package's document, and a fixture's picture is never a document of the site.
import fs from 'node:fs';
import path from 'node:path';
import type { APIRoute, GetStaticPaths } from 'astro';
import sharp from 'sharp';
import { galleryOf } from '../../../lib/fixture-gallery';
import { specs } from '../../../lib/repo';

// The build runs in apps/docs (package.json): the snapshots are read from the repository's root.
const repoRoot = path.resolve(process.cwd(), '../..');

/** The device pixel ratio the picture is made for: the baselines', so a picture is as sharp as its baseline allows. */
const RATIO = 2;

export const getStaticPaths = (() =>
  Object.values(specs).flatMap((spec) =>
    galleryOf(spec)
      .flatMap((group) => group.stages)
      .flatMap((stage) => (stage.picture ? [{ params: { component: spec.name, fixture: stage.id }, props: { width: stage.picture.width } }] : [])),
  )) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params, props }) => {
  const file = path.join(repoRoot, 'packages/web/snapshots', params.component!, `${params.fixture}.png`);
  if (!fs.existsSync(file)) throw new Error(`fixture-pictures: ${params.component}/${params.fixture} has no baseline at ${path.relative(repoRoot, file)}`);
  const { width } = props as { width: number };
  const webp = await sharp(file).resize({ width: width * RATIO }).webp({ quality: 82 }).toBuffer();
  return new Response(new Uint8Array(webp), { headers: { 'Content-Type': 'image/webp' } });
};
