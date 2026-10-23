// Theme Studio's page (components/StudioPage.astro): the Studio, the whole window, with its own bar and none of the
// documentation's frame; its layer in the page's address, so that a link opens it on the same layer; undo and redo,
// from the bar and from the keyboard; every part of it within reach of the Tab key; the preview's five screens, in
// light, dark and side by side; and nothing axe finds, wide and narrow.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium,firefox,webkit node --test test/browser/studio-page.test.mjs   # in each engine
//
// It reads `dist/` and serves it on a free port, as the host does (host.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import * as playwright from '@playwright/test';
import { serveDist } from './host.mjs';

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'studio', 'index.html'))) throw new Error('apps/docs/dist holds no Theme Studio page: run `pnpm --filter @tanrei/docs build` first');

const ENGINES = (process.env.DOCS_ENGINES ?? 'chromium').split(',').map((name) => name.trim());
const WIDE = { width: 1440, height: 900 };
const NARROW = { width: 390, height: 844 };

let host;
let origin;
before(async () => {
  host = await serveDist(dist);
  origin = host.origin;
});
after(async () => host?.close());

/** The Studio's page, opened and drawn; what the page said in its console is collected. */
async function open(browser, { viewport = WIDE, url = '/studio/', locale = 'en-US' } = {}) {
  const context = await browser.newContext({ viewport, locale });
  context.setDefaultTimeout(30_000);
  const page = await context.newPage();
  const problems = [];
  page.on('console', (message) => message.type() === 'error' && problems.push(message.text()));
  page.on('pageerror', (error) => problems.push(error.message));
  // The base system is switched after a confirmation: the person says yes.
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto(origin + url);
  await page.waitForSelector('[data-studio][data-level] [data-levels]');
  await page.evaluate(async () => {
    await Promise.all([...new Set([...document.querySelectorAll('*')].map((el) => el.localName).filter((name) => name.includes('-')))].map((name) => customElements.whenDefined(name)));
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  return { context, page, problems, close: () => context.close() };
}

const box = (page, selector) => page.locator(selector).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width) }; });
const layer = (page) => page.evaluate(() => window.tanreiStudio.getLayer());
const param = (page) => page.evaluate(() => new URLSearchParams(location.hash.slice(1)).get('layer'));
/** Choose a base system in Essentials, as a person does: press its radio button. */
const chooseBase = (page, id) => page.locator(`[data-panel="base"] tanrei-radio-button[data-value="${id}"]`).click();
/** Where the focus is: the element that has it, through shadow roots, and the Studio's part it stands in. */
const focused = (page) =>
  page.evaluate(() => {
    let el = document.activeElement;
    const host = el;
    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
    const part = host?.closest('[data-bar], [data-rail], .ts-preview, [data-panel-handle], [data-inspector]');
    return { tag: host?.localName ?? '', part: part ? (part.dataset.bar !== undefined ? 'bar' : part.dataset.rail !== undefined ? 'rail' : part.dataset.panelHandle !== undefined ? 'handle' : part.dataset.inspector !== undefined ? 'panel' : 'preview') : 'page', undo: Boolean(host?.closest('[data-undo]')), redo: Boolean(host?.closest('[data-redo]')), brand: Boolean(host?.closest('.docs-studio-brand')) };
  });

for (const engine of ENGINES) {
  describe(`in ${engine}`, () => {
    let browser;
    before(async () => (browser = await playwright[engine].launch()));
    after(async () => browser?.close());

    test('1440 wide: the Studio is the whole window — its bar, then the rail, the preview and the panel side by side, each scrolling by itself', async () => {
      const { page, problems, close } = await open(browser);
      try {
        assert.equal(await page.locator('tanrei-app-shell, .docs-app-bar').count(), 0, 'none of the documentation’s frame');
        // The page's brand and its link to the page about the tool stand in the Studio's bar.
        assert.equal(await page.locator('[data-bar] .docs-studio-brand').getAttribute('href'), '/');
        assert.equal(await page.locator('[data-bar] .docs-studio-about').getAttribute('href'), '/foundations/theme-studio/');
        const [bar, rail, preview, panel] = await Promise.all(['[data-bar]', '[data-rail]', '.ts-preview', '[data-inspector]'].map((selector) => box(page, selector)));
        assert.equal(bar.top, 0);
        for (const part of [rail, preview, panel]) assert.ok(Math.abs(part.top - bar.bottom) <= 1 && part.bottom === WIDE.height, `under the bar, down to the window’s foot: ${JSON.stringify(part)}`);
        assert.ok(rail.left === 0 && rail.right <= preview.left && preview.right <= panel.left && panel.right === WIDE.width, `rail | preview | panel: ${JSON.stringify({ rail, preview, panel })}`);
        assert.ok(preview.width > panel.width && panel.width >= 320, `the preview has the most room: ${preview.width}, the panel ${panel.width}`);
        const scroll = await page.evaluate(() => ({ width: document.scrollingElement.scrollWidth, height: document.scrollingElement.scrollHeight }));
        assert.deepEqual(scroll, { width: WIDE.width, height: WIDE.height }, 'the page itself does not scroll');
        assert.equal(await page.locator('[data-levels]').getAttribute('orientation'), 'vertical', 'the levels stand in a column in the rail');
        assert.deepEqual(problems, []);
      } finally {
        await close();
      }
    });

    test('1440 wide: the handle resizes the panel, from the keyboard, between its least and what leaves the preview its own', async () => {
      const { page, close } = await open(browser);
      try {
        const handle = page.locator('[data-panel-handle]');
        const before = (await box(page, '[data-inspector]')).width;
        assert.equal(await handle.evaluate((el) => el.value), before, 'the handle says the panel’s width');
        await handle.focus();
        await page.keyboard.press('ArrowLeft'); // toward the start edge: the panel widens
        await page.keyboard.press('ArrowLeft');
        const wider = (await box(page, '[data-inspector]')).width;
        assert.equal(wider, before + 32);
        await page.keyboard.press('Home');
        const least = (await box(page, '[data-inspector]')).width;
        assert.equal(least, 320, 'Home: the least');
        await page.keyboard.press('End');
        const most = await box(page, '[data-inspector]');
        assert.ok(most.width > wider && (await box(page, '.ts-preview')).width >= 360, `End: the most that leaves the preview its least (${most.width})`);
        assert.equal(await handle.evaluate((el) => [el.value, el.min, el.max].every(Number.isFinite)), true);
      } finally {
        await close();
      }
    });

    test('390 wide: one column under the bar — the levels, the preview, the panel — and nothing scrolls sideways', async () => {
      const { page, problems, close } = await open(browser, { viewport: NARROW });
      try {
        const [rail, preview, panel] = await Promise.all(['[data-rail]', '.ts-preview', '[data-inspector]'].map((selector) => box(page, selector)));
        assert.ok(rail.bottom <= preview.top && preview.bottom <= panel.top, `one above the other: ${JSON.stringify({ rail, preview, panel })}`);
        assert.equal(await page.locator('[data-levels]').getAttribute('orientation'), 'horizontal');
        assert.equal(await page.locator('[data-panel-handle]').evaluate((el) => el.getBoundingClientRect().width), 0, 'no handle: nothing to resize');
        const wide = await page.evaluate(() => [...document.querySelectorAll('[data-bar] *, [data-rail] *, [data-inspector] [data-panel] > header *')].filter((el) => el.getBoundingClientRect().right > innerWidth + 1).map((el) => el.localName));
        assert.deepEqual({ page: await page.evaluate(() => document.scrollingElement.scrollWidth), wide }, { page: NARROW.width, wide: [] });
        assert.deepEqual(problems, []);
      } finally {
        await close();
      }
    });

    test('the layer is in the address: a link opens the Studio on the same layer, in a browser that kept nothing', async () => {
      const first = await open(browser);
      let link;
      try {
        assert.equal(await param(first.page), null, 'an untouched layer writes no address');
        await chooseBase(first.page, 'cupertino');
        await first.page.waitForFunction(() => new URLSearchParams(location.hash.slice(1)).get('layer'));
        link = first.page.url();
        assert.match(link, /\/studio\/#layer=[A-Za-z0-9_-]+$/);
        assert.equal((await layer(first.page)).extends, 'cupertino');
        assert.deepEqual(first.problems, []);
      } finally {
        await first.close();
      }
      const second = await open(browser, { url: link.slice(origin.length) });
      try {
        assert.equal((await layer(second.page)).extends, 'cupertino', 'the link’s layer');
        assert.equal(await second.page.locator('[data-panel="base"] tanrei-radio-group').evaluate((group) => group.value), 'cupertino', 'and the controls show it');
        assert.deepEqual(second.problems, []);
      } finally {
        await second.close();
      }
    });

    test('undo and redo: from the bar’s buttons and from the keyboard, the address following', async () => {
      const { page, problems, close } = await open(browser);
      try {
        const undo = page.locator('[data-undo]');
        const redo = page.locator('[data-redo]');
        assert.deepEqual([await undo.evaluate((el) => el.disabled), await redo.evaluate((el) => el.disabled)], [true, true], 'nothing to undo or redo yet');
        await chooseBase(page, 'cupertino');
        await page.waitForFunction(() => window.tanreiStudio.getState().canUndo);
        await undo.click();
        assert.equal((await layer(page)).extends, 'tanrei', 'the button undoes');
        await page.waitForFunction(() => !location.hash.includes('layer='));
        assert.equal(await redo.evaluate((el) => el.disabled), false);
        await redo.click();
        assert.equal((await layer(page)).extends, 'cupertino', 'and redoes');
        await page.waitForFunction(() => location.hash.includes('layer='));
        // The keys, with the focus in the rail (a control that holds no text).
        await page.locator('[data-levels] tanrei-tab[data-value="essentials"]').focus();
        await page.keyboard.press('ControlOrMeta+z');
        assert.equal((await layer(page)).extends, 'tanrei', '⌘Z undoes');
        await page.keyboard.press('ControlOrMeta+Shift+z');
        assert.equal((await layer(page)).extends, 'cupertino', '⇧⌘Z redoes');
        assert.equal(await page.locator('[data-status]').textContent(), 'Redone.', 'and says so');
        // In a field that holds text, the keys are the field's.
        await page.locator('[data-id] input').focus();
        await page.keyboard.press('ControlOrMeta+z');
        assert.equal((await layer(page)).extends, 'cupertino', 'not taken from a text field');
        assert.deepEqual(problems, []);
      } finally {
        await close();
      }
    });

    test('every part is within reach of the Tab key, in the order it is drawn: the bar, the rail, the preview, the handle, the panel', async () => {
      const { page, close } = await open(browser);
      try {
        await page.locator('body').focus();
        const seen = [];
        // WebKit moves through buttons and links with Option+Tab, as Safari does unless the reader asks otherwise.
        const tab = engine === 'webkit' ? 'Alt+Tab' : 'Tab';
        // The preview's screen is a product's page: each of its controls is a stop on the way to the panel.
        for (let i = 0; i < 200; i += 1) {
          await page.keyboard.press(tab);
          const at = await focused(page);
          seen.push(at);
          if (at.part === 'panel') break;
        }
        const parts = seen.map((at) => at.part).filter((part, i, all) => part !== all[i - 1]);
        assert.deepEqual(parts, ['bar', 'rail', 'preview', 'handle', 'panel'], JSON.stringify(seen));
        assert.ok(seen.some((at) => at.undo) && seen.some((at) => at.redo), 'undo and redo are stops while there is nothing to do');
      } finally {
        await close();
      }
    });

    test('the preview’s five screens, from its bar: light, dark and side by side; axe finds nothing on any; each switch is drawn at once', async (t) => {
      const { page, problems, close } = await open(browser);
      try {
        const screens = ['overview', 'dashboard', 'settings', 'list', 'docs'];
        /** A tab of the preview's bar pressed; how long until the frame after the one the switch was drawn in. */
        const press = (group, value) =>
          page.evaluate(
            ([selector, value]) =>
              new Promise((resolve) => {
                const started = performance.now();
                document.querySelector(`${selector} > tanrei-tab[data-value="${value}"]`).click();
                requestAnimationFrame(() => requestAnimationFrame(() => resolve(Math.round(performance.now() - started))));
              }),
            [group, value],
          );
        const drawn = async (screen) => {
          await page.waitForSelector(`[data-scope] [data-screen="${screen}"]`);
          await page.evaluate(async () => {
            await Promise.all([...new Set([...document.querySelectorAll('[data-scope] *')].map((el) => el.localName).filter((name) => name.includes('-')))].map((name) => customElements.whenDefined(name)));
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          });
        };
        const times = {};
        for (const mode of ['light', 'dark', 'both']) {
          times[mode] = await press('[data-modes]', mode);
          for (const screen of screens) {
            times[`${mode} ${screen}`] = await press('[data-screens]', screen);
            await drawn(screen);
            assert.equal(await page.locator(`[data-scope] [data-screen="${screen}"]`).count(), mode === 'both' ? 2 : 1, `${mode}: ${screen}`);
            const report = await new AxeBuilder({ page }).include('[data-scope]').analyze();
            assert.deepEqual(report.violations.map((violation) => `${violation.id}: ${violation.nodes.length} — ${violation.nodes[0]?.target}`), [], `axe: ${screen}, ${mode}`);
          }
        }
        t.diagnostic(`${engine}: ${Object.entries(times).map(([what, ms]) => `${what} ${ms} ms`).join(', ')}`);
        assert.deepEqual(problems, []);
      } finally {
        await close();
      }
    });

    for (const [name, viewport] of [['1440', WIDE], ['390', NARROW]]) {
      test(`${name} wide: axe finds nothing`, async () => {
        const { page, close } = await open(browser, { viewport });
        try {
          const report = await new AxeBuilder({ page }).analyze();
          assert.deepEqual(report.violations.map((violation) => `${violation.id}: ${violation.nodes.length} — ${violation.nodes[0]?.target}`), []);
        } finally {
          await close();
        }
      });
    }

    test('each language has its page, in its language and direction, with the Studio speaking it', async () => {
      for (const [url, lang, dir, undo] of [['/ja/studio/', 'ja', 'ltr', '元に戻す'], ['/ar/studio/', 'ar', 'rtl', 'تراجع']]) {
        const { page, problems, close } = await open(browser, { url });
        try {
          assert.deepEqual(await page.evaluate(() => [document.documentElement.lang, document.documentElement.dir]), [lang, dir]);
          assert.equal(await page.locator('[data-undo]').getAttribute('label'), undo);
          assert.equal(await page.locator('[data-bar] .docs-studio-brand').getAttribute('href'), `/${lang}/`);
          assert.deepEqual(problems, []);
        } finally {
          await close();
        }
      }
    });
  });
}
