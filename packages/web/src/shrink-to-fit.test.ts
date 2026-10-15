// A component in a box that is as wide as its content has a width, and keeps it. Such a box — a table cell, an inline
// block, a flex item that is not stretched — gives what stands in it no width: it asks its content how wide it would
// like to be. A component that measures its own box and then sizes something inside itself from the measurement is
// asked again by that box, and if what it wrote made it wider it measures a wider box: it grows on every pass, without
// end, with a resize observer that never comes to rest (a carousel in a cell of a table, say, is a million pixels
// wide a second after the page loads).
//
// So every fixture of every component is put in each of the three boxes, and what is asked is the same of all: two
// frames later it has the width it will keep, thirty frames on nothing is wider, and no observer ran out of passes in
// between. A component that sizes its parts from its own measured box needs a width of its own for this case — one that
// nothing it places inside itself changes (`contain: inline-size` with an intrinsic size, as the carousel's row has).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { type Spec, loadSpec, mountFixtures } from '../test/harness.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const inventory = JSON.parse(fs.readFileSync(path.join(repo, 'specs/inventory.json'), 'utf8')) as { components: { name: string }[] };
/** Every component that has a spec and is built here: an element (src/components/<name>), or a class of a stylesheet (src/styles/<name>.css). */
const built = (name: string) => fs.existsSync(path.join(repo, `packages/web/src/components/${name}`)) || fs.existsSync(path.join(repo, `packages/web/src/styles/${name}.css`));
const specs: Spec[] = inventory.components.filter((c) => fs.existsSync(path.join(repo, `specs/${c.name}.spec.json`)) && built(c.name)).map((c) => loadSpec(c.name));

/** The three boxes that are as wide as their content, as the declarations of a fixture's stage. */
const BOXES = {
  'an inline block': 'display: inline-block; inline-size: auto;',
  'a table cell': 'display: table-cell; inline-size: auto;',
  // Its child is a flex item with `min-width: auto`, in a row as long as its items.
  'a flex item': 'display: flex; inline-size: max-content;',
} as const;

test.describe('in a box as wide as its content', () => {
  // One test for each box: a component with many fixtures (the date-time picker) took most of the time limit to mount
  // and stand in all three on a slow runner, so each box is a test of its own with the whole of the limit.
  for (const spec of specs) for (const [box, declarations] of Object.entries(BOXES)) {
    test(`${spec.name}: in ${box} every fixture has its width within two frames and keeps it`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true });
      await page.evaluate(() => {
        (window as any).loops = 0;
        window.addEventListener('error', (event) => {
          if (/ResizeObserver/.test(event.message)) (window as any).loops += 1;
        });
      });
      {
        const seen = await page.evaluate(async (css) => {
          const frames = async (count: number) => {
            for (let i = 0; i < count; i++) await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          };
          const stages = [...document.querySelectorAll<HTMLElement>('.stage')];
          for (const stage of stages) stage.style.cssText += `;${css}`;
          // The stage, and everything it holds directly: the fixture's element, or what the harness stands it in.
          const widths = () => stages.map((stage) => [stage.dataset.fixture, ...[stage, ...stage.children].map((element) => Math.round(element.getBoundingClientRect().width * 100) / 100)]);
          await frames(2);
          const first = widths();
          (window as any).loops = 0;
          await frames(30);
          return { first, later: widths(), loops: (window as any).loops as number };
        }, declarations);
        expect(seen.later, `${box}: the widths two frames after standing there, and thirty frames on`).toEqual(seen.first);
        expect(seen.loops, `${box}: a resize observer that did not come to rest`).toBe(0);
      }
    });
  }
});
