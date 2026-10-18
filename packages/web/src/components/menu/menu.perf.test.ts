// What a menu of many items costs to build (specs/menu.spec.json): a menu of up to 1,000 items costs the same for each
// item at 1,000 as at 100 — linear, never a re-read of every item for each item that draws.
//
// Counted, not timed (test/work-count.ts): the function calls the page made from inserting the menu to two frames after,
// per item, at 100 and at 1,000 items; and how many times the menu re-read its items (`menu.sync`, a debug build's
// counter). The time is reported beside them, never held: a time is the machine's as much as the menu's.
//
// Chromium only: the counters are the DevTools protocol's.
import { expect, test } from '@playwright/test';
import { buildCost, costOf, countingPage, perItemRatio } from '../../../test/work-count.js';

/**
 * A menu of `n` items, drawn in place (the `inline` test attribute), in groups of ten: items with leading icons and
 * shortcuts, a checkbox item and radio items — every column and section MNU-59 decides, every radio MNU-29 checks.
 */
function menu(n: number): string {
  let html = '<tanrei-menu id="menu" open inline>';
  for (let g = 0; g < n / 10; g++) {
    html += `<tanrei-menu-group label="Group ${g}" value="r${g}.0">`;
    for (let i = 0; i < 6; i++) html += `<tanrei-menu-item label="Item ${g}.${i}" leading-icon="content_copy" shortcut="Mod+${i}"></tanrei-menu-item>`;
    html += `<tanrei-menu-checkbox-item label="Check ${g}"></tanrei-menu-checkbox-item>`;
    for (let i = 0; i < 3; i++) html += `<tanrei-menu-radio-item label="Radio ${g}.${i}" value="r${g}.${i}"></tanrei-menu-radio-item>`;
    html += '</tanrei-menu-group>';
  }
  return `${html}</tanrei-menu>`;
}

test.describe('a menu of many items', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'the counters are read over the DevTools protocol');

  test('MNU-18, MNU-59: built with 100 and with 1,000 items, the menu reads its items a bounded number of times — the same calls per item at both sizes', async ({ page }) => {
    test.setTimeout(180_000);
    const cdp = await countingPage(page, ['tanrei-menu', 'tanrei-menu-group', 'tanrei-menu-item', 'tanrei-menu-checkbox-item', 'tanrei-menu-radio-item']);
    const run = async (n: number) => {
      const built = await buildCost(page, cdp, menu(n), n, 'menu');
      // Every item was told its place among the rows (MNU-18), and the first radio item of each group is checked (MNU-29).
      expect(await page.evaluate(() => document.querySelectorAll('#menu [aria-posinset]').length)).toBe(n);
      const last = await page.evaluate(() => [...document.querySelectorAll('#menu [aria-posinset]')].map((row) => [row.getAttribute('aria-posinset'), row.getAttribute('aria-setsize')]).at(-1));
      expect(last).toEqual([String(n), String(n)]);
      expect(await page.evaluate(() => document.querySelectorAll('#menu tanrei-menu-radio-item[aria-checked="true"]').length)).toBe(n / 10);
      // Every label changed in one task, as a product that translates its menu does.
      const relabelled = await costOf(page, cdp, n, 'menu, every label changed', () =>
        page.evaluate(() => {
          for (const item of document.querySelectorAll<HTMLElement & { label: string }>('#menu [aria-posinset]')) item.label = `${item.label}*`;
        }),
      );
      expect(await page.evaluate(() => document.querySelector('#menu [aria-posinset]')?.getAttribute('aria-label'))).toBe('Item 0.0*');
      return { built, relabelled };
    };
    // The first run compiles what the others run.
    await run(100);
    const small = await run(100);
    const large = await run(1000);
    // One build, or one change of every item, re-reads the items a bounded number of times, whatever their number.
    for (const { built, relabelled } of [small, large]) {
      expect(built.counts['menu.sync'] ?? 0, `menu.sync in a build of ${built.n} items`).toBeLessThanOrEqual(3);
      expect(relabelled.counts['menu.sync'] ?? 0, `menu.sync as ${relabelled.n} labels change`).toBeLessThanOrEqual(1);
    }
    // Linear: the calls per item do not grow with the items.
    expect(perItemRatio('menu, built', small.built, large.built)).toBeLessThanOrEqual(1.1);
    expect(perItemRatio('menu, every label changed', small.relabelled, large.relabelled)).toBeLessThanOrEqual(1.1);
    await cdp.detach();
  });
});
