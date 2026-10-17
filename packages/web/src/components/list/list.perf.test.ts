// What a list of many items costs (specs/list.spec.json): a list of up to 1,000 items costs the same for each item at
// 1,000 as at 100 — linear, never a re-read of every item for each item that draws or changes.
//
// Counted, not timed (test/work-count.ts): the function calls the page made from the change to two frames after, per
// item, at 100 and at 1,000 items; and how many times the list re-read its items (`list.sync`, a debug build's counter).
// The time is reported beside them, never held: a time is the machine's as much as the list's.
//
// Chromium only: the counters are the DevTools protocol's.
import { expect, test } from '@playwright/test';
import { buildCost, costOf, countingPage, perItemRatio } from '../../../test/work-count.js';

const KINDS = {
  /** Options, the last one selected, each named by its content. */
  options: (n: number) =>
    `<tanrei-list id="list" selection="single" value="v${n - 1}">${Array.from({ length: n }, (_, i) => `<tanrei-list-item value="v${i}">Item ${i}</tanrei-list-item>`).join('')}</tanrei-list>`,
  /** Static items with dividers, as a product lists its records. */
  'static items': (n: number) => `<tanrei-list id="list" dividers>${Array.from({ length: n }, (_, i) => `<tanrei-list-item>Record ${i}</tanrei-list-item>`).join('')}</tanrei-list>`,
} as const;

test.describe('a list of many items', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'the counters are read over the DevTools protocol');

  for (const [kind, markup] of Object.entries(KINDS)) {
    test(`LST-17, LST-18: a list of ${kind}, built with 100 and with 1,000 items, and every item's label changed at once, reads its items a bounded number of times — the same calls per item at both sizes`, async ({ page }) => {
      test.setTimeout(180_000);
      const cdp = await countingPage(page, ['tanrei-list', 'tanrei-list-item']);
      const run = async (n: number) => {
        const built = await buildCost(page, cdp, markup(n), n, `list of ${kind}`);
        // Every item was told its place (LST-18) and one is the tab stop (LST-17).
        const last = await page.evaluate(() => [...document.querySelectorAll('#list tanrei-list-item')].map((item) => [item.getAttribute('aria-posinset'), item.getAttribute('aria-setsize')]).at(-1));
        expect(last).toEqual([String(n), String(n)]);
        if (kind === 'options') expect(await page.evaluate(() => [...document.querySelectorAll('#list [tabindex="0"]')].map((item) => item.getAttribute('aria-selected')))).toEqual(['true']);
        // Every item given a label in one task, as a product that names its items for assistive technology does.
        const renamed = await costOf(page, cdp, n, `list of ${kind}, every label changed`, () =>
          page.evaluate(() => {
            for (const [i, item] of [...document.querySelectorAll<HTMLElement & { label: string }>('#list tanrei-list-item')].entries()) item.label = `Named ${i}`;
          }),
        );
        if (kind === 'options') expect(await page.evaluate(() => document.querySelector('#list tanrei-list-item')?.getAttribute('aria-label'))).toBe('Named 0');
        return { built, renamed };
      };
      // The first run compiles what the others run.
      await run(100);
      const small = await run(100);
      const large = await run(1000);
      for (const { built, renamed } of [small, large]) {
        expect(built.counts['list.sync'] ?? 0, `list.sync in a build of ${built.n} items`).toBeLessThanOrEqual(3);
        expect(renamed.counts['list.sync'] ?? 0, `list.sync as ${renamed.n} labels change`).toBeLessThanOrEqual(1);
      }
      expect(perItemRatio(`list of ${kind}, built`, small.built, large.built)).toBeLessThanOrEqual(1.1);
      expect(perItemRatio(`list of ${kind}, every label changed`, small.renamed, large.renamed)).toBeLessThanOrEqual(1.1);
      await cdp.detach();
    });
  }
});
