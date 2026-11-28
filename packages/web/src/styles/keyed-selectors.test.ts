// A light-DOM rule written again so that an engine's filter of ancestors can reject it (test/keyed-selectors.test.mjs
// says why) must match exactly the elements it matched before, with the same specificity. Each rewrite is listed
// here, the selector it had and the one it has: in the fixtures of its component, and in markup that holds every case
// either form tells apart, the two select the same elements, and some. Specificity: both forms are `:where()`, or
// `:is()` of nothing but `:where()`, so both are 0 — `:is()` takes its most specific argument.
// affected: each component — each test draws the component whose stylesheet it reads from disk, and names it in its title.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';
import { type Fixture, type Spec, loadSpec, mountFixtures } from '../../test/harness.js';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

interface Rewrite {
  /** The stylesheet as built, which must hold `after` and no longer `written`. */
  sheet: string;
  /** The rule as the source wrote it (a nested one with its `&`), as it reads in the built sheet. */
  written: string;
  /** What the engine read it as: a nested rule's `&` is `:is()` of its parent's whole list. */
  before: string;
  after: string;
  spec: string;
  /** Fixtures that hold what the spec's may not: every case the two forms could tell apart. */
  cases: (spec: Spec) => Fixture[];
}

const DL_STACKED = ":where(tanrei-description-list:is([layout='stacked'], [layout='stat']):not([columns])) > :where(dl)";
const DL_ONE_COLUMN = ":where(tanrei-description-list:is([layout='stacked'], [layout='stat'])[columns='1']) > :where(dl)";
const TASK = "li > [type='checkbox']:first-child";
const TASK_IN_PARAGRAPH = "li > p:first-child > [type='checkbox']:first-child";

const REWRITES: Rewrite[] = [
  {
    sheet: 'dist/description-list.css',
    written: '& > :where(div:first-child)',
    before: `:is(${DL_STACKED}, ${DL_ONE_COLUMN}) > :where(div:first-child)`,
    after: `${DL_STACKED} > :where(div:first-child), ${DL_ONE_COLUMN} > :where(div:first-child)`,
    spec: 'description-list',
    // The stacked fixture's facts under every layout, with no columns, one, and two.
    cases: (spec) => {
      const stacked = spec.fixtures.find((f) => f.id === 'stacked')!;
      return ['stacked', 'stat', 'inline'].flatMap((layout) =>
        [undefined, 1, 2].map((columns) => ({ ...stacked, id: `${layout}-${columns ?? 'none'}`, props: { ...stacked.props, layout, ...(columns ? { columns } : {}) } })),
      );
    },
  },
  {
    sheet: 'dist/prose.css',
    written: `:where(input):where(${TASK}, ${TASK_IN_PARAGRAPH})`,
    before: `:where(input):where(${TASK}, ${TASK_IN_PARAGRAPH})`,
    after: `:where(input):where(${TASK}), :where(input):where(${TASK_IN_PARAGRAPH})`,
    spec: 'prose',
    cases: () => [{ id: 'cases', props: {}, content: `<ul>
      <li><input type="checkbox" disabled> first in the item</li>
      <li><p><input type="checkbox" disabled checked> first in its first paragraph</p><p>more <input type="checkbox"></p></li>
      <li>text <input type="checkbox"> not first</li>
      <li><span></span><input type="checkbox"> after an element</li>
      <li><p>a</p><p><input type="checkbox"> in a later paragraph</p></li>
      <li><input type="radio"> a radio button</li>
      <li><input type="checkbox"><input type="checkbox"> two</li>
    </ul><p><input type="checkbox"> outside a list</p>` }],
  },
];

/** The elements `selector` matches in the page, each named by its place in the document. */
const matched = (page: Page, selector: string) =>
  page.evaluate((s) => {
    const all = [...document.querySelectorAll('*')];
    return [...document.querySelectorAll(s)].map((element) => all.indexOf(element));
  }, selector);

for (const rewrite of REWRITES) {
  test.describe(`${rewrite.spec}: ${rewrite.after}`, () => {
    test('the built stylesheet holds the rewritten rule and no longer the one written before', () => {
      // A list of selectors may stand on lines of its own.
      const sheet = read(rewrite.sheet).replace(/\s+/g, ' ');
      expect(sheet).toContain(rewrite.after);
      expect(sheet).not.toContain(rewrite.written);
    });

    const spec = loadSpec(rewrite.spec);
    const groups: { name: string; fixtures: Fixture[] }[] = [
      { name: 'its fixtures', fixtures: spec.fixtures },
      { name: 'markup that holds every case', fixtures: rewrite.cases(spec) },
    ];
    for (const { name, fixtures } of groups) {
      test(`selects the elements it selected before, in ${name}`, async ({ page }) => {
        await mountFixtures(page, spec, { fixtures, icons: true });
        const before = await matched(page, rewrite.before);
        expect(await matched(page, rewrite.after)).toEqual(before);
        // Not a comparison of two empty lists: the fixtures and the cases each hold elements the rule is for.
        expect(before.length).toBeGreaterThan(0);
      });
    }
  });
}
