// What a row of many tabs costs (specs/tabs.spec.json): a row of up to 1,000 tabs costs the same for each tab at 1,000
// as at 100 — linear, never a re-read of every tab for each tab that draws or changes — and a key press reads each
// tab's box a bounded number of times.
//
// Counted, not timed (test/work-count.ts): the function calls the page made from the change to two frames after, per
// tab, at 100 and at 1,000 tabs; how many times the row re-read its tabs (`tabs.sync`, a debug build's counter); and
// the layout reads a key press makes. The time is reported beside them, never held: a time is the machine's as much as
// the row's.
//
// The build is counted in Chromium only (the call counters are the DevTools protocol's); the reads of a key press are
// counted in the page itself, in every engine.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';
import { buildCost, costOf, countingPage, perItemRatio, twoFrames } from '../../../test/work-count.js';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** The counting page without its counters, in any engine: every stylesheet of the package, the bundle, an empty `#pane`. */
async function bundlePage(page: Page, tags: string[]) {
  const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');
  const sheets = fs.readdirSync(path.join(pkg, 'dist')).filter((file) => file.endsWith('.css'));
  const head = `<meta charset="utf-8">${sheets.map((file) => `<style>${read(`dist/${file}`)}</style>`).join('')}<style>body { margin: 0; }</style>`;
  await page.setContent(`<!doctype html><html lang="en"><head>${head}</head><body><div id="pane"></div><script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`);
  await page.waitForFunction((all) => all.every((tag) => !!customElements.get(tag)), tags);
}

/** A row of `n` tabs, each with its panel, the last one selected. */
function row(n: number): string {
  const tabs = Array.from({ length: n }, (_, i) => `<tanrei-tab value="v${i}" label="Tab ${i}"></tanrei-tab>`).join('');
  const panels = Array.from({ length: n }, (_, i) => `<tanrei-tab-panel value="v${i}">Panel ${i}</tanrei-tab-panel>`).join('');
  return `<tanrei-tabs id="row" label="Many" value="v${n - 1}">${tabs}${panels}</tanrei-tabs>`;
}

/**
 * Counts every call of `getBoundingClientRect` and `getComputedStyle` the page makes from now on, on `__reads`: the
 * reads that make the browser lay out or style the page, whatever calls them.
 */
const countReads = (page: Page) =>
  page.evaluate(() => {
    const reads = { rect: 0, style: 0 };
    (globalThis as { __reads?: typeof reads }).__reads = reads;
    const rect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function (this: Element) {
      reads.rect++;
      return rect.call(this);
    };
    const style = window.getComputedStyle;
    window.getComputedStyle = function (this: Window, ...args: Parameters<typeof getComputedStyle>) {
      reads.style++;
      return style.apply(this, args);
    };
  });

/** The reads (`countReads`) from a press of `key` to two frames after it: what the key press made the page read. */
async function keyReads(page: Page, key: string) {
  await page.evaluate(() => {
    const reads = (globalThis as unknown as { __reads: { rect: number; style: number } }).__reads;
    reads.rect = 0;
    reads.style = 0;
  });
  await page.keyboard.press(key);
  await twoFrames(page);
  return page.evaluate(() => ({ ...(globalThis as unknown as { __reads: { rect: number; style: number } }).__reads }));
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

  test("TAB-12, TAB-15, TAB-17: a key press that selects another tab of a row of 20 that scrolls reads each tab's box about twice and the computed style at most five times, with the slide and where motion is reduced", async ({ page }) => {
    const n = 20;
    for (const motion of ['no-preference', 'reduce'] as const) {
      await page.emulateMedia({ reducedMotion: motion });
      await bundlePage(page, ['tanrei-tabs', 'tanrei-tab', 'tanrei-tab-panel']);
      await page.evaluate((html) => {
        document.querySelector('#pane')!.innerHTML = html;
      }, row(n).replace(`value="v${n - 1}"`, 'value="v0"'));
      await twoFrames(page);
      // The tabs do not fit the page's width: each move brings its tab into view (TAB-15).
      expect(
        await page.locator('#row').evaluate((el) => {
          const scroller = el.shadowRoot!.querySelector('.scroller')!;
          return scroller.scrollWidth > scroller.clientWidth;
        }),
      ).toBe(true);
      await page.locator('#row tanrei-tab').first().focus();
      await twoFrames(page);
      await countReads(page);
      const selected: string[] = [];
      for (const key of ['ArrowRight', 'ArrowRight', 'ArrowLeft', 'End', 'Home']) {
        const reads = await keyReads(page, key);
        const line = `tabs, ${key} on ${n} tabs (motion ${motion}): ${reads.rect} getBoundingClientRect, ${reads.style} getComputedStyle`;
        console.log(`work-count ${line}`);
        test.info().annotations.push({ type: 'cost', description: line });
        // Every tab's box and content once (the indicator is cut out of each), the strip and the track once, and the
        // indicator's box on each tab it goes from, to — and past: End and Home slide it over every tab between (TAB-17).
        const passed = key === 'End' || key === 'Home' ? n - 2 : 0;
        expect(reads.rect, `getBoundingClientRect for ${key} (${motion})`).toBeLessThanOrEqual(2 * n + 4 + passed);
        // The focus style of the tab focus moves to (TAB-10), the transition's choice (TAB-43), the strip's style (its
        // scale and inset), the indicator's timing and its corner.
        expect(reads.style, `getComputedStyle for ${key} (${motion})`).toBeLessThanOrEqual(5);
        selected.push((await page.locator('#row tanrei-tab[aria-selected="true"]').getAttribute('value')) ?? '');
      }
      // Each key selected the tab it reached (TAB-12).
      expect(selected).toEqual(['v1', 'v2', 'v1', `v${n - 1}`, 'v0']);
    }
  });
});
