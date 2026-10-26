// The docs' one frame as the built site draws it (components/visuals/Example.astro, lib/example.ts), in each engine:
//
// - its code is closed until a reader opens it, under the stage; it is what the stage held as the page was built, in
//   HTML or — the reader's choice, kept for every example — in React with the React package's wrappers; the copy button
//   copies the code in the flavor chosen;
// - its stage is drawn in the other direction when the direction is turned, and as wide as its handle says;
// - every frame follows the page's look: the design system chosen in the header's menu (a frame pinned to a preset
//   excepted) and the scheme chosen in its appearance menu;
// - what a stage holds is defined once it comes near the view, not with the page.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium node --test test/browser/example.test.mjs   # in one engine (all three by default)
//
// It reads `dist/` and serves it on a free port, as the host does (host.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { serveDist } from './host.mjs';
import { engines, launch } from './launch.mjs';

register('../vite-shim.mjs', import.meta.url);
const { strings } = await import('../../src/lib/i18n.ts');

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');
const config = JSON.parse(fs.readFileSync(path.join(docs, '../../tanrei.config.json'), 'utf8'));

const ENGINES = engines('chromium,firefox,webkit');
let host;
let origin;

before(async () => {
  host = await serveDist(dist);
  origin = host.origin;
});

after(async () => {
  await host?.close();
});

const PAGE = '/components/button/';
const WIDE = { width: 1440, height: 900 };
const t = strings('en');

/** The page's first example that shows its code: one of the page's own, not a stage of the gallery. */
const FIRST = '[data-example]:not([data-stage]):has([data-example-actions])';

/** The frame's actions drawn, its elements defined, the fonts in, and two frames drawn since. */
const drawn = (page, selector) =>
  page.evaluate(async (selector) => {
    const frame = document.querySelector(selector);
    frame.scrollIntoView({ block: 'center' });
    const deadline = Date.now() + 10_000;
    while (frame.querySelector('[data-example-actions] > template:not([data-example-panel])') && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));
    const names = new Set([...frame.querySelectorAll('*')].map((element) => element.localName).filter((name) => name.includes('-')));
    await Promise.all([...names].map((name) => customElements.whenDefined(name)));
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, selector);

/** What the frame's open code block shows, and what its copy button copies. */
const code = (page, selector) =>
  page.evaluate((selector) => {
    const frame = document.querySelector(selector);
    const panel = frame.querySelector('[data-example-code-panel]');
    return { open: Boolean(panel && !panel.hidden), shown: panel?.querySelector('tanrei-code-block')?.code ?? null, copied: frame.querySelector('[data-example-copy]')?.text ?? null, language: panel?.querySelector('tanrei-code-block')?.language ?? null };
  }, selector);

/** Chooses a look in the header's Appearance panel, as a reader does, and closes the panel. */
async function chooseLook(page, id) {
  const panel = page.locator('tanrei-popover[anchor="docs-appearance"]');
  if (!(await panel.evaluate((popover) => popover.open))) await page.locator('#docs-appearance').click();
  await page.waitForFunction(() => document.querySelector('tanrei-popover[anchor="docs-appearance"]')?.open === true);
  await panel.locator(`tanrei-list-item[value="${id}"]`).click();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('tanrei-popover[anchor="docs-appearance"]')?.open === false);
}

for (const engine of ENGINES) {
  describe(`the one frame in ${engine}`, () => {
    let browser;
    before(async () => {
      browser = await launch(engine);
    });
    after(async () => {
      await browser?.close();
    });
    const open = async (url = PAGE, viewport = WIDE) => {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce', colorScheme: 'light' });
      const page = await context.newPage();
      await page.goto(`${origin}${url}`);
      await page.waitForLoadState('load');
      return { context, page };
    };

    test('its code is closed until it is opened, under the stage, in HTML or React as the reader chose, and the copy copies it', async () => {
      const { context, page } = await open();
      await drawn(page, FIRST);
      const frame = page.locator(FIRST).first();
      const button = frame.locator('[data-example-code]');
      // The button says whether the code is shown: the state is the inner button's, where the element hands it.
      const says = (expanded) => frame.getByRole('button', { name: t.example.code, exact: true, expanded }).count();
      assert.equal(await says(false), 1);
      const closed = await code(page, FIRST);
      assert.equal(closed.open, false, 'the code is closed until a reader opens it');
      assert.match(closed.copied, /<tanrei-button\b/, 'the copy copies the code before it is shown');

      await button.click();
      await page.waitForFunction((selector) => document.querySelector(selector).querySelector('[data-example-code-panel] tanrei-code-block')?.code, FIRST);
      const html = await code(page, FIRST);
      assert.equal(html.open, true);
      assert.equal(await says(true), 1);
      assert.equal(html.language, 'html');
      assert.match(html.shown, /<tanrei-button\b/);
      assert.doesNotMatch(html.shown, /data-pagefind|="true"|astro-|data-resize-handle/, 'the markup as an author writes it');
      assert.equal(html.copied, html.shown);
      // The panel stands under the stage, inside the frame.
      assert.ok(await page.evaluate((selector) => document.querySelector(selector).querySelector('[data-example-stage] + [data-example-code-panel]') !== null, FIRST));

      await frame.locator('[data-example-flavors] tanrei-tab[value="react"]').click();
      await page.waitForFunction((selector) => document.querySelector(selector).querySelector('[data-example-code-panel] tanrei-code-block').language === 'jsx', FIRST);
      const react = await code(page, FIRST);
      assert.match(react.shown, new RegExp(`^import \\{ Button \\} from '${config.packages.npmScope}/react';`));
      assert.match(react.shown, /<Button\b/);
      assert.equal(react.copied, react.shown);
      assert.equal(await page.evaluate(() => localStorage.getItem('tanrei-docs-example-code')), 'react', 'the choice is kept');

      // Another frame opened after follows the choice.
      const next = await page.evaluate(() => {
        const frames = [...document.querySelectorAll('[data-example]:not([data-stage])')].filter((frame) => frame.querySelector('[data-example-actions]'));
        frames[1].id ||= 'docs-test-second-frame';
        return `#${frames[1].id}`;
      });
      await drawn(page, next);
      await page.locator(`${next} [data-example-code]`).click();
      await page.waitForFunction((selector) => document.querySelector(selector).querySelector('[data-example-code-panel] tanrei-code-block')?.language === 'jsx', next);

      await button.click();
      assert.equal((await code(page, FIRST)).open, false, 'pressed again, the code closes');
      assert.equal(await says(false), 1);
      await context.close();
    });

    test('its stage is drawn in the other direction when that is turned, and as wide as its handle says', async () => {
      const { context, page } = await open();
      await drawn(page, FIRST);
      const frame = page.locator(FIRST).first();
      const stage = frame.locator('[data-example-stage]');
      const toggle = frame.locator('[data-example-direction]');
      assert.equal(await toggle.getAttribute('data-example-direction'), 'rtl');
      assert.equal(await toggle.getAttribute('label'), t.example.direction.ltr);
      await toggle.click();
      await page.waitForFunction((selector) => document.querySelector(selector).querySelector('[data-example-stage]').getAttribute('dir') === 'rtl', FIRST);
      assert.equal(await stage.evaluate((element) => getComputedStyle(element.querySelector('tanrei-button')).direction), 'rtl');
      await toggle.click();
      await page.waitForFunction((selector) => !document.querySelector(selector).querySelector('[data-example-stage]').hasAttribute('dir'), FIRST);

      const handle = stage.locator(':scope > [data-resize-handle]');
      await page.waitForFunction((selector) => document.querySelector(selector).querySelector('[data-resize-handle]').hasAttribute('aria-valuenow'), FIRST);
      const full = await stage.evaluate((element) => element.getBoundingClientRect().width);
      await handle.focus();
      await page.keyboard.press('Home');
      await page.waitForFunction((selector) => Math.round(document.querySelector(selector).querySelector('[data-example-stage]').getBoundingClientRect().width) === 160, FIRST);
      assert.equal(await handle.getAttribute('aria-valuenow'), '160');
      await page.keyboard.press('End');
      await page.waitForFunction(({ selector, full }) => Math.abs(document.querySelector(selector).querySelector('[data-example-stage]').getBoundingClientRect().width - full) < 1, { selector: FIRST, full });
      await context.close();
    });

    test('on a page that reads right to left, the direction turned is left to right', async () => {
      const { context, page } = await open('/ar/components/button/');
      await drawn(page, FIRST);
      const toggle = page.locator(FIRST).first().locator('[data-example-direction]');
      assert.equal(await toggle.getAttribute('data-example-direction'), 'ltr');
      assert.equal(await toggle.getAttribute('label'), strings('ar').example.direction.rtl);
      await context.close();
    });

    test('every frame follows the design system and the scheme the reader chose for the page', async () => {
      const { context, page } = await open();
      await drawn(page, FIRST);
      const presets = await page.locator('tanrei-popover[anchor="docs-appearance"] tanrei-list-item').evaluateAll((all) => all.map((item) => item.getAttribute('value')).slice(1));
      assert.ok(presets.length > 0, 'a preset is shipped');
      const [preset] = presets;
      await chooseLook(page, preset);
      await page.waitForFunction((preset) => [...document.querySelectorAll('[data-example]:not([data-pinned])')].every((frame) => frame.querySelector('[data-example-stage]').getAttribute('data-tanrei-system') === preset), preset);
      // The scheme is the page's: the stage inherits it.
      await page.locator('#docs-mode').click();
      await page.waitForFunction((selector) => getComputedStyle(document.querySelector(selector).querySelector('[data-example-stage]')).colorScheme.includes('dark'), FIRST);
      // And back: the default system again.
      await chooseLook(page, config.namespace);
      await page.waitForFunction(() => [...document.querySelectorAll('[data-example]:not([data-pinned])')].every((frame) => !frame.querySelector('[data-example-stage]').hasAttribute('data-tanrei-system')));
      await context.close();
    });

    test('what a stage holds is defined when it comes near the view, not with the page', async () => {
      const { context, page } = await open();
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const far = await page.evaluate(() => {
        const frames = [...document.querySelectorAll('[data-example]')];
        const last = frames.at(-1);
        last.id ||= 'docs-test-far-frame';
        return { id: `#${last.id}`, pending: last.querySelector('[data-example-stage]').hasAttribute('data-example-pending'), near: document.querySelector('[data-example]').querySelector('[data-example-stage]').hasAttribute('data-example-pending') };
      });
      assert.equal(far.near, false, 'the first frame, in the view, is drawn');
      assert.equal(far.pending, true, 'the last frame, far from the view, holds its elements back');
      await drawn(page, far.id);
      assert.equal(await page.evaluate((selector) => document.querySelector(selector).querySelector('[data-example-stage]').hasAttribute('data-example-pending'), far.id), false);
      assert.equal(await page.evaluate((selector) => document.querySelector(selector).querySelectorAll('[data-example-stage] :not(:defined)').length, far.id), 0);
      await context.close();
    });
  });
}
