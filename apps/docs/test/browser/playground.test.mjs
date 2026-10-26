// A component's playground as the built site draws it (components/visuals/Playground.astro, lib/playground.ts), in
// each engine:
//
// - each control sets its prop on the live element, the frame's code follows in HTML and in React, and the page's
//   address keeps what differs from where the playground started;
// - an address opens the playground as it was left, and the reset takes every control and the element back;
// - a control is named by its prop and is used from the keyboard; on a page that reads right to left its words are the
//   page's;
// - nothing moves as the page loads: the stage and the controls take the same room before anything is defined as once
//   they are, at a phone's width and a desktop's.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium node --test test/browser/playground.test.mjs   # in one engine (all three by default)
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

const FRAME = '[data-example][data-playground]';
const WIDE = { width: 1440, height: 900 };
const VIEWPORTS = [{ width: 390, height: 844 }, WIDE];

/** The playground near the view, its actions drawn, its elements and its controls defined, the fonts in, and two frames drawn since. */
const settled = (page) =>
  page.evaluate(async (selector) => {
    const frame = document.querySelector(selector);
    frame.scrollIntoView({ block: 'start' });
    const deadline = Date.now() + 10_000;
    while ((frame.querySelector('[data-example-actions] > template') || frame.querySelector('[data-example-controls][data-example-pending]')) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));
    const names = new Set([...frame.querySelectorAll('*')].map((element) => element.localName).filter((name) => name.includes('-')));
    await Promise.all([...names].map((name) => customElements.whenDefined(name)));
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, FRAME);

/** The live element's props, the controls' values, the code's copy, and the address. */
const read = (page, tag, props) =>
  page.evaluate(
    ({ selector, tag, props }) => {
      const frame = document.querySelector(selector);
      const element = frame.querySelector(`[data-example-stage] ${tag}`);
      const control = (prop) => frame.querySelector(`[data-playground-prop="${prop}"]`);
      return {
        element: Object.fromEntries(props.map((prop) => [prop, element[prop]])),
        controls: Object.fromEntries(props.map((prop) => [prop, control(prop)?.localName === 'tanrei-switch' ? control(prop).checked : control(prop)?.value])),
        copied: frame.querySelector('[data-example-copy]')?.text ?? null,
        hash: location.hash,
      };
    },
    { selector: FRAME, tag, props },
  );

/** Waits until the copy of the code says what is asked. */
const copyIs = (page, pattern) =>
  page.waitForFunction(({ selector, source }) => new RegExp(source).test(document.querySelector(selector).querySelector('[data-example-copy]')?.text ?? ''), { selector: FRAME, source: pattern.source }, { timeout: 5000 });

for (const engine of ENGINES) {
  describe(`the playground in ${engine}`, () => {
    let browser;
    before(async () => {
      browser = await launch(engine);
    });
    after(async () => {
      await browser?.close();
    });

    test('a control sets its prop on the live element; the code and the address follow', async () => {
      const context = await browser.newContext({ viewport: WIDE });
      const page = await context.newPage();
      await page.goto(`${origin}/components/button/`);
      await settled(page);
      const frame = page.locator(FRAME);
      await frame.locator('[data-playground-prop="size"] tanrei-segment[value="large"]').click();
      await frame.locator('tanrei-switch[data-playground-prop="disabled"]').click();
      await frame.locator('tanrei-text-field[data-playground-prop="label"] input').fill('Go');
      await copyIs(page, /label="Go"/);
      const state = await read(page, 'tanrei-button', ['size', 'disabled', 'label']);
      assert.deepEqual(state.element, { size: 'large', disabled: true, label: 'Go' });
      assert.deepEqual(state.controls, { size: 'large', disabled: true, label: 'Go' });
      assert.equal(state.copied, '<tanrei-button size="large" disabled label="Go">Deploy</tanrei-button>');
      assert.equal(state.hash, '#play-button=size:large,disabled:true,label:Go');

      // The code, opened, in React with the React package's wrapper.
      await frame.locator('[data-example-code]').click();
      await frame.locator('[data-example-flavors] tanrei-tab[value="react"]').click();
      await copyIs(page, /<Button/);
      const react = await page.evaluate((selector) => document.querySelector(selector).querySelector('[data-example-code-panel] tanrei-code-block').code, FRAME);
      assert.match(react, /^import \{ Button \} from '@tanrei\/react';$/m);
      assert.match(react, /<Button size="large" disabled label="Go">Deploy<\/Button>/);
      // The code panel stands under the controls.
      const order = await page.evaluate((selector) => {
        const frame = document.querySelector(selector);
        const panel = frame.querySelector('[data-example-code-panel]');
        return Boolean(frame.querySelector('[data-example-controls]').compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING);
      }, FRAME);
      assert.ok(order, 'the code opens under the controls');
      await context.close();
    });

    test('an address opens the playground as it was left, and the reset takes it back', async () => {
      const context = await browser.newContext({ viewport: WIDE });
      const page = await context.newPage();
      await page.goto(`${origin}/components/button/#play-button=variant:tonal,busy:true,size:huge`);
      await settled(page);
      const opened = await read(page, 'tanrei-button', ['variant', 'busy', 'size']);
      assert.deepEqual(opened.element, { variant: 'tonal', busy: true, size: 'medium' }, 'a value no control offers is not taken');
      assert.deepEqual(opened.controls, { variant: 'tonal', busy: true, size: 'medium' });
      assert.equal(opened.copied, '<tanrei-button variant="tonal" busy>Deploy</tanrei-button>');
      assert.equal(opened.hash, '#play-button=variant:tonal,busy:true', 'the address is written again with what the controls hold');
      await page.locator(FRAME).locator('[data-playground-reset]').click();
      await copyIs(page, /^<tanrei-button>Deploy<\/tanrei-button>$/);
      const reset = await read(page, 'tanrei-button', ['variant', 'busy']);
      assert.deepEqual(reset.element, { variant: 'filled', busy: false });
      assert.deepEqual(reset.controls, { variant: 'filled', busy: false });
      assert.equal(reset.hash, '');
      await context.close();
    });

    test('a control is named by its prop and used from the keyboard; on a page that reads right to left its words are the page’s', async () => {
      const context = await browser.newContext({ viewport: WIDE });
      const page = await context.newPage();
      await page.goto(`${origin}/ar/components/slider/`);
      await settled(page);
      const frame = page.locator(FRAME);
      const t = strings('ar');
      assert.equal(await frame.locator('[data-playground-reset]').getAttribute('label'), t.visuals.playgroundReset);
      assert.equal(await frame.locator('[data-example-controls]').getAttribute('aria-label'), `Slider · ${t.visuals.playgroundControls}`);
      const unnamed = await page.evaluate((selector) => [...document.querySelector(selector).querySelectorAll('[data-playground-prop]')].filter((control) => control.getAttribute('label') !== control.dataset.playgroundProp).map((control) => control.dataset.playgroundProp), FRAME);
      assert.deepEqual(unnamed, [], 'every control is named by its prop');
      // A switch from the keyboard.
      await frame.locator('tanrei-switch[data-playground-prop="disabled"]').focus();
      await page.keyboard.press('Space');
      // A number typed and committed with Enter.
      await frame.locator('tanrei-number-field[data-playground-prop="value"] input').fill('70');
      await page.keyboard.press('Enter');
      await copyIs(page, /value="70"/);
      const state = await read(page, 'tanrei-slider', ['disabled', 'value']);
      assert.deepEqual(state.element, { disabled: true, value: 70 });
      assert.equal(state.hash, '#play-slider=value:70,disabled:true');
      await context.close();
    });

    for (const viewport of VIEWPORTS) {
      test(`at ${viewport.width}: the stage and the controls take the same room before anything is defined as once drawn`, async () => {
        // Every script is held until the document is parsed and its faces are in, as test/browser/visuals.test.mjs
        // holds them: the first frame is the page before any element is defined.
        const context = await browser.newContext({ viewport });
        const page = await context.newPage();
        let release;
        const gate = new Promise((resolve) => (release = resolve));
        await page.route(/\.m?js(\?|$)/, async (route) => {
          await gate;
          await route.continue();
        });
        await page.goto(`${origin}/components/text-field/`, { waitUntil: 'commit' });
        await page.waitForFunction(() => document.readyState !== 'loading');
        await page.waitForFunction(() => [...document.fonts].every((face) => face.status !== 'loading'));
        const boxes = () =>
          page.evaluate((selector) => {
            const frame = document.querySelector(selector);
            const height = (element) => element.getBoundingClientRect().height;
            return { stage: height(frame.querySelector('[data-example-stage]')), controls: height(frame.querySelector('[data-example-controls]')), header: height(frame.querySelector('header')) };
          }, FRAME);
        await page.evaluate((selector) => document.querySelector(selector).scrollIntoView({ block: 'start' }), FRAME);
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const parsed = await boxes();
        release();
        await settled(page);
        const drawn = await boxes();
        await context.close();
        for (const part of ['stage', 'controls', 'header']) assert.ok(Math.abs(drawn[part] - parsed[part]) < 0.5, `the ${part} holds ${parsed[part]}px while the script is held and takes ${drawn[part]}px once drawn`);
      });
    }
  });
}
