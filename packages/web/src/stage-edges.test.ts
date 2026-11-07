// A fixture's picture holds its own stage and nothing of the stages beside it. A picture of an element is clipped to
// whole CSS pixels around it (its top and start rounded down, its bottom and end up), and a stage's height is often a
// fraction of a pixel (a line of text is), so the clip takes in up to a pixel of its neighbours. Where a neighbour is
// of the surface's own color that draws nothing; where it is of another color it draws a line along the picture's
// edge: the skeleton's text-short picture had a grey line at its top from the stage on surface-container-highest above
// it. The harness sets a stage a fixture paints in a surface role a pixel apart.
//
// Every fixture page of every component with a web implementation is mounted, and the box a picture of each stage is
// clipped to must not reach a stage of another color.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { loadSpec, mountFixtures } from '../test/harness.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
/** Every spec the web implements. */
const NAMES = fs
  .readdirSync(path.join(repo, 'specs'))
  .filter((file) => file.endsWith('.spec.json'))
  .map((file) => JSON.parse(fs.readFileSync(path.join(repo, 'specs', file), 'utf8')) as { name: string; platforms?: { web?: { status?: string } } })
  .filter((spec) => spec.platforms?.web?.status && spec.platforms.web.status !== 'planned')
  .map((spec) => spec.name)
  .sort();

/** Runs in the page: `<stage> ← <neighbour of another color>` for each stage whose picture's clip reaches one. */
function reached(): string[] {
  const stages = [...document.querySelectorAll('.stage')].map((el) => ({
    id: el.getAttribute('data-fixture') ?? `twin of ${el.getAttribute('data-twin-of')}`,
    box: el.getBoundingClientRect(),
    color: getComputedStyle(el).backgroundColor,
  }));
  const out: string[] = [];
  for (const own of stages) {
    const clip = { top: Math.floor(own.box.top), bottom: Math.ceil(own.box.bottom), left: Math.floor(own.box.left), right: Math.ceil(own.box.right) };
    for (const other of stages) {
      if (other === own || other.color === own.color) continue;
      const { box } = other;
      if (box.top < clip.bottom && box.bottom > clip.top && box.left < clip.right && box.right > clip.left) out.push(`${own.id} ← ${other.id} (${other.color})`);
    }
  }
  return out;
}

/**
 * The pages whose stages still reach one of another color, each with the stages it is known for. The link's inverse
 * stages are painted by its staging (not a fixture's surface role), several of them in a row, and they reach their
 * neighbours on this page; no picture is taken of it: the link's are taken one fixture to a page (link.test.ts).
 */
const KNOWN: Record<string, RegExp> = {
  link: /^(disabled-icon-only|inverse|inverse-icon-only|ltr-label-rtl|standalone-underline-never|inverse-underline-never|external|external-disabled|external-inverse|external-rtl) ← /,
};

for (const name of NAMES) {
  test(`a picture of a ${name} stage holds nothing of a stage of another color`, async ({ page, browserName }) => {
    await mountFixtures(page, loadSpec(name));
    const found = await page.evaluate(reached);
    const known = KNOWN[name];
    expect(found.filter((line) => !known?.test(line))).toEqual([]);
    // Chromium's, where the pictures are compared: Firefox lays the link's stages out on whole pixels.
    if (known && browserName === 'chromium') expect(found.length, `${name} no longer reaches a stage of another color: take it out of KNOWN`).toBeGreaterThan(0);
  });
}
