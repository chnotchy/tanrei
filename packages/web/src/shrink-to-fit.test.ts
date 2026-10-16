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
import { type Fixture, type Spec, loadSpec, mountFixtures } from '../test/harness.js';

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

/**
 * The components whose fixtures make a page too heavy to stand in a box in one test, and the most fixtures one test of
 * theirs mounts. The date-time picker's 31 fixtures (about 5 300 elements) took 17–24 s a box in WebKit on a CI runner,
 * and 29–31 s on one a third slower, against a limit of 30 s; every other component took 7 s or less. In parts of at
 * most PART, each part takes about a quarter of the whole: in WebKit in the Linux CI image 3.0–4.1 s, where the whole
 * took 12.4–15.8 s — about 8 s on that slower runner, under half of the limit.
 */
const IN_PARTS = new Set(['date-time-picker']);
const PART = 8;

/**
 * What one test stands in a box: every fixture of the spec on one page; or, for a component in IN_PARTS, its fixtures
 * in equal parts of at most PART, in the spec's order, each part a page and a test of its own.
 * `every fixture is in one part of its component` holds that the parts keep every fixture.
 */
const parts = (spec: Spec): { name: string; fixtures?: Fixture[] }[] => {
  if (!IN_PARTS.has(spec.name)) return [{ name: spec.name }];
  const count = Math.ceil(spec.fixtures.length / PART);
  const size = Math.ceil(spec.fixtures.length / count);
  return Array.from({ length: count }, (_, i) => ({ name: `${spec.name}, part ${i + 1} of ${count}`, fixtures: spec.fixtures.slice(i * size, (i + 1) * size) }));
};

test.describe('in a box as wide as its content', () => {
  // One test for each box, and for a component in IN_PARTS one for each part of its fixtures in each box: each has the
  // whole of the time limit.
  for (const spec of specs) for (const part of parts(spec)) for (const [box, declarations] of Object.entries(BOXES)) {
    test(`${part.name}: in ${box} every fixture has its width within two frames and keeps it`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true, ...(part.fixtures ? { fixtures: part.fixtures } : {}) });
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

test('every fixture is in one part of its component, in the spec’s order, and no part has more than PART', () => {
  for (const spec of specs) {
    const units = parts(spec);
    expect(units.flatMap((unit) => (unit.fixtures ?? spec.fixtures).map((f) => f.id)), spec.name).toEqual(spec.fixtures.map((f) => f.id));
    if (IN_PARTS.has(spec.name)) {
      expect(units.length, `${spec.name}: stood in parts`).toBeGreaterThan(1);
      for (const unit of units) expect(unit.fixtures!.length, unit.name).toBeLessThanOrEqual(PART);
    }
    expect(new Set(units.map((unit) => unit.name)).size, spec.name).toBe(units.length);
  }
  // A component named here that has no spec, or no built element, would stand in no box at all.
  for (const name of IN_PARTS) expect(specs.map((spec) => spec.name), name).toContain(name);
});
