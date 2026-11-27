// What the HTML a wrapper writes on a server means to its element, in a browser of each engine. Every wrapper and every
// prop its element reads from an attribute (../ssr-cases.mjs) is rendered under Node, and the element reads the HTML
// back as the value it was given — by its own converters: `no-handle` for `handle={false}`, `icon-only="false"` for a
// boolean that is true by default; every list prop (a chip field's `value`, a combobox's `values`) by its entries. The
// lists are in the server's HTML: before any script runs, and drawn once the elements are defined, before the page is
// hydrated. Then a page rendered on the server hydrates: no mismatch is reported, the elements hold the props, and a
// re-render still reaches them.
//
//   pnpm --filter @tanrei/web build && pnpm --filter @tanrei/react build && pnpm --filter @tanrei/react test
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from '@playwright/test';
import { build } from 'esbuild';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import * as wrappers from '@tanrei/react/all';
import { cases, lists } from '../ssr-cases.mjs';
import { App, expected } from './ssr-app.mjs';

const ORIGIN = 'http://tanrei.test';
let script;
let app;
let rendered;
let renderedLists;

before(async () => {
  const bundle = await build({
    entryPoints: [fileURLToPath(new URL('ssr-client.mjs', import.meta.url))],
    bundle: true,
    format: 'esm',
    write: false,
    logLevel: 'silent',
    define: { 'process.env.NODE_ENV': '"development"' },
  });
  script = bundle.outputFiles[0].text;
  // Rendered here, under Node: the server's HTML, not the browser's.
  app = renderToString(React.createElement(App));
  rendered = cases.map((c) => [renderToString(React.createElement(wrappers[c.wrapper], { [c.prop]: c.value })), c.prop]);
  renderedLists = lists.map((c) => [renderToString(React.createElement(wrappers[c.wrapper], { [c.prop]: c.value })), c.prop]);
});

for (const engine of [chromium, firefox, webkit]) {
  describe(engine.name(), () => {
    let browser;
    before(async () => {
      browser = await engine.launch();
    });
    after(async () => {
      await browser?.close();
    });

    /** A page with `body`, and the client script after it (none where `script` is false). */
    const open = async (body, { script: withScript = true } = {}) => {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(String(error)));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await page.route(`${ORIGIN}/**`, (route) =>
        new URL(route.request().url()).pathname === '/client.js'
          ? route.fulfill({ contentType: 'text/javascript', body: script })
          : route.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="en"><body>${body}${withScript ? '<script type="module" src="/client.js"></script>' : ''}</body></html>` }),
      );
      await page.goto(`${ORIGIN}/`);
      if (withScript) await page.waitForFunction(() => typeof window.read === 'function');
      return { page, errors };
    };

    /** The labels of the chips `id`'s element draws in its shadow root: the entries a person sees. */
    const chipsOf = (page, id) => page.locator(`#${id} tanrei-chip`).evaluateAll((chips) => chips.map((chip) => chip.label));

    test('each prop a wrapper writes on the server is read back by its element as the value it was given', async () => {
      const { page, errors } = await open('');
      const values = await page.evaluate((list) => window.read(list), rendered);
      const wrong = cases.flatMap((c, i) => (Object.is(values[i], c.value) ? [] : [`${c.wrapper} ${c.prop}=${JSON.stringify(c.value)}: ${rendered[i][0]} reads as ${JSON.stringify(values[i])}`]));
      assert.deepEqual(wrong, []);
      assert.deepEqual(errors, []);
      await page.close();
    });

    test('each list prop a wrapper writes on the server is read back by its element as the list it was given', async () => {
      const { page, errors } = await open('');
      const values = await page.evaluate((list) => window.read(list), renderedLists);
      const wrong = lists.flatMap((c, i) => {
        try {
          assert.deepEqual(values[i], c.value);
          return [];
        } catch {
          return [`${c.wrapper} ${c.prop}=${JSON.stringify(c.value)}: ${renderedLists[i][0]} reads as ${JSON.stringify(values[i])}`];
        }
      });
      assert.deepEqual(wrong, []);
      assert.deepEqual(errors, []);
      await page.close();
    });

    test('the lists are in the server’s HTML before any script runs, and drawn once the elements are defined, before hydration', async () => {
      // No script: what a reader without scripts, or a page before its scripts load, is given.
      const bare = await open(`<div id="server">${app}</div>`, { script: false });
      const attributes = await bare.page.evaluate(() => ({
        defined: !!customElements.get('tanrei-chip-field'),
        chips: document.getElementById('chips').getAttribute('value'),
        cities: document.getElementById('cities').getAttribute('values'),
        shortcut: document.getElementById('shortcut').getAttribute('keys'),
      }));
      // A list as JSON; a list whose converter writes its own text, as that text (chords separated by white space).
      assert.deepEqual(attributes, { defined: false, chips: '["ada@example.com","grace@example.com"]', cities: '["tokyo","osaka"]', shortcut: 'mod+k' });
      await bare.page.close();
      // The elements defined and the page not hydrated (it is not in the root the client hydrates): each draws its list.
      const { page, errors } = await open(`<div id="server">${app}</div>`);
      await page.waitForFunction(() => ['chips', 'cities'].every((id) => document.getElementById(id).hasUpdated));
      assert.equal(await page.evaluate(() => Object.keys(document.getElementById('cities')).some((key) => key.startsWith('__react'))), false, 'not hydrated');
      await page.evaluate(() => Promise.all(['chips', 'cities'].map((id) => document.getElementById(id).updateComplete)));
      await page.locator('#chips tanrei-chip').first().waitFor();
      await page.locator('#cities tanrei-chip').first().waitFor();
      assert.deepEqual(await chipsOf(page, 'chips'), ['ada@example.com', 'grace@example.com']);
      assert.deepEqual(await chipsOf(page, 'cities'), ['Tokyo', 'Osaka']);
      assert.deepEqual(errors, []);
      await page.close();
    });

    test('a page rendered on the server hydrates without a mismatch, its elements hold the props, and a re-render reaches them', async () => {
      const { page, errors } = await open(`<div id="root">${app}</div>`);
      const read = () =>
        page.evaluate(async (want) => {
          const out = {};
          for (const [id, props] of Object.entries(want)) {
            const element = document.getElementById(id);
            await element.updateComplete;
            out[id] = Object.fromEntries(Object.keys(props).map((key) => [key, element[key]]));
          }
          return out;
        }, expected(0));
      // Hydrated: React has claimed the button (its fiber is on the node) and the elements are defined.
      await page.waitForFunction(() => {
        const press = document.getElementById('press');
        return press?.matches(':defined') && Object.keys(press).some((key) => key.startsWith('__reactFiber'));
      });
      assert.deepEqual(await read(), expected(0));
      await page.locator('#press').click();
      await page.waitForFunction(() => document.getElementById('name').label === 'Name 1');
      assert.deepEqual(await read(), expected(1));
      assert.deepEqual(await page.evaluate(() => window.hydrationErrors), []);
      assert.deepEqual(errors, []);
      await page.close();
    });
  });
}
