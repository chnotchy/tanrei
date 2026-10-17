// What a row of many tabs costs (specs/tabs.spec.json): a row of up to 1,000 tabs costs the same for each tab at 1,000
// as at 100 — linear, never a re-read of every tab for each tab that draws or changes.
//
// Counted, not timed (test/work-count.ts): the function calls the page made from the change to two frames after, per
// tab, at 100 and at 1,000 tabs; and how many times the row re-read its tabs (`tabs.sync`, a debug build's counter).
// The time is reported beside them, never held: a time is the machine's as much as the row's.
//
// Chromium only: the counters are the DevTools protocol's.
import { expect, test } from '@playwright/test';
import { buildCost, costOf, countingPage, perItemRatio } from '../../../test/work-count.js';

/** A row of `n` tabs, each with its panel, the last one selected. */
function row(n: number): string {
  const tabs = Array.from({ length: n }, (_, i) => `<tanrei-tab value="v${i}" label="Tab ${i}"></tanrei-tab>`).join('');
  const panels = Array.from({ length: n }, (_, i) => `<tanrei-tab-panel value="v${i}">Panel ${i}</tanrei-tab-panel>`).join('');
  return `<tanrei-tabs id="row" label="Many" value="v${n - 1}">${tabs}${panels}</tanrei-tabs>`;
}

test.describe('a row of many tabs', () => {
  test('TAB-11, TAB-13: built with 100 and with 1,000 tabs and panels, and every label changed at once, the row reads its tabs a bounded number of times — the same calls per tab at both sizes', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'the call counters are read over the DevTools protocol');
    test.setTimeout(180_000);
    const cdp = await countingPage(page, ['tanrei-tabs', 'tanrei-tab', 'tanrei-tab-panel']);
    const run = async (n: number) => {
      const built = await buildCost(page, cdp, row(n), n, 'tabs');
      // Every tab was told its place (TAB-13), the selected one is the Tab stop (TAB-12), and its panel alone shows.
      const last = await page.evaluate(() => [...document.querySelectorAll('#row tanrei-tab')].map((tab) => [tab.getAttribute('aria-posinset'), tab.getAttribute('aria-setsize'), tab.getAttribute('aria-selected')]).at(-1));
      expect(last).toEqual([String(n), String(n), 'true']);
      expect(await page.evaluate(() => [...document.querySelectorAll('#row tanrei-tab-panel:not([hidden])')].map((panel) => panel.getAttribute('value')))).toEqual([`v${n - 1}`]);
      // Every tab relabelled in one task, as a product that translates its tabs does.
      const relabelled = await costOf(page, cdp, n, 'tabs, every label changed', () =>
        page.evaluate(() => {
          for (const tab of document.querySelectorAll<HTMLElement & { label: string }>('#row tanrei-tab')) tab.label = `${tab.label}*`;
        }),
      );
      expect(await page.evaluate(() => document.querySelector('#row tanrei-tab')?.getAttribute('aria-label'))).toBe('Tab 0*');
      return { built, relabelled };
    };
    // The first run compiles what the others run.
    await run(100);
    const small = await run(100);
    const large = await run(1000);
    // One build, or one change of every tab, re-reads the tabs a bounded number of times, whatever their number.
    for (const { built, relabelled } of [small, large]) {
      expect(built.counts['tabs.sync'] ?? 0, `tabs.sync in a build of ${built.n} tabs`).toBeLessThanOrEqual(3);
      expect(relabelled.counts['tabs.sync'] ?? 0, `tabs.sync as ${relabelled.n} labels change`).toBeLessThanOrEqual(1);
    }
    // Linear: the calls per tab do not grow with the tabs.
    expect(perItemRatio('tabs, built', small.built, large.built)).toBeLessThanOrEqual(1.1);
    expect(perItemRatio('tabs, every label changed', small.relabelled, large.relabelled)).toBeLessThanOrEqual(1.1);
    await cdp.detach();
  });
});
