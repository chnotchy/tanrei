// What the HTML a wrapper writes on a server means to its element, in a browser of each engine. Every wrapper and every
// prop its element reads from an attribute (../ssr-cases.mjs) is rendered under Node, and the element reads the HTML
// back as the value it was given — by its own converters: `no-handle` for `handle={false}`, `icon-only="false"` for a
// boolean that is true by default. Then a page rendered on the server hydrates: no mismatch is reported, the elements
// hold the props, and a re-render still reaches them.
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
import { cases } from '../ssr-cases.mjs';
import { App, expected } from './ssr-app.mjs';

const ORIGIN = 'http://tanrei.test';
let script;
let app;
let rendered;

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

    /** A page with `body`, and the client script after it. */
    const open = async (body) => {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(String(error)));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await page.route(`${ORIGIN}/**`, (route) =>
        new URL(route.request().url()).pathname === '/client.js'
          ? route.fulfill({ contentType: 'text/javascript', body: script })
          : route.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="en"><body>${body}<script type="module" src="/client.js"></script></body></html>` }),
      );
      await page.goto(`${ORIGIN}/`);
      await page.waitForFunction(() => typeof window.read === 'function');
      return { page, errors };
    };

    test('each prop a wrapper writes on the server is read back by its element as the value it was given', async () => {
      const { page, errors } = await open('');
      const values = await page.evaluate((list) => window.read(list), rendered);
      const wrong = cases.flatMap((c, i) => (Object.is(values[i], c.value) ? [] : [`${c.wrapper} ${c.prop}=${JSON.stringify(c.value)}: ${rendered[i][0]} reads as ${JSON.stringify(values[i])}`]));
      assert.deepEqual(wrong, []);
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
