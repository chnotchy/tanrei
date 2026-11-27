// A form's reset after a server's render, in a browser of each engine: every control a form resets returns to the value
// the product gave it first — its default, as a native control's `defaultValue` or `defaultChecked` is — and not to
// what the server wrote, nor to nothing because the client gave the value as a property. The same form is rendered on
// the server and hydrated, and rendered by the client alone; in both the product's state then changes every value,
// the form is reset, and each control holds its first value again.
//
//   pnpm --filter @tanrei/web build && pnpm --filter @tanrei/react build && pnpm --filter @tanrei/react test
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from '@playwright/test';
import { build } from 'esbuild';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { App, READ, STATES } from './form-reset-app.mjs';

const ORIGIN = 'http://tanrei.test';
let script;
let server;

before(async () => {
  const bundle = await build({
    entryPoints: [fileURLToPath(new URL('form-reset-client.mjs', import.meta.url))],
    bundle: true,
    format: 'esm',
    write: false,
    logLevel: 'silent',
    define: { 'process.env.NODE_ENV': '"development"' },
  });
  script = bundle.outputFiles[0].text;
  // Rendered here, under Node: the server's HTML, with each first value written as its attribute.
  server = renderToString(React.createElement(App));
});

/** The first values, as the test reads them: the product's own (a range's as `[startValue, value]`). */
const FIRST = Object.fromEntries(Object.keys(READ).map((id) => [id, STATES[0][id]]));

for (const engine of [chromium, firefox, webkit]) {
  describe(engine.name(), () => {
    let browser;
    before(async () => {
      browser = await engine.launch();
    });
    after(async () => {
      await browser?.close();
    });

    /** A page with `body` in its root, and the client script after it; ready once every control has drawn. */
    const open = async (body) => {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(String(error)));
      await page.route(`${ORIGIN}/**`, (route) =>
        new URL(route.request().url()).pathname === '/client.js'
          ? route.fulfill({ contentType: 'text/javascript', body: script })
          : route.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="en"><body><div id="root">${body}</div><script type="module" src="/client.js"></script></body></html>` }),
      );
      await page.goto(`${ORIGIN}/`);
      // Rendered or hydrated: React has claimed the button (its fiber is on the node), and every control is defined.
      await page.waitForFunction((ids) => {
        const next = document.getElementById('next');
        return !!next && Object.keys(next).some((key) => key.startsWith('__reactFiber')) && ids.every((id) => document.getElementById(id)?.matches(':defined'));
      }, Object.keys(READ));
      return { page, errors };
    };

    /** Each control's value, once it has taken what it was given. */
    const read = (page) =>
      page.evaluate(async (want) => {
        const out = {};
        for (const [id, props] of Object.entries(want)) {
          const element = document.getElementById(id);
          await element.updateComplete;
          const values = props.map((prop) => element[prop]);
          out[id] = values.length === 1 ? values[0] : values;
        }
        return out;
      }, READ);

    for (const [mode, body] of [
      ['rendered on the server and hydrated', () => server],
      ['rendered by the client alone', () => ''],
    ]) {
      test(`${mode}: a reset returns every control to the value the product gave it first, after its state changed every value`, async () => {
        const { page, errors } = await open(body());
        assert.deepEqual(await read(page), FIRST, 'each control holds the first value it was given');
        await page.locator('#next').click();
        await page.waitForFunction(() => document.getElementById('text').value === 'Grace');
        const later = await read(page);
        const unchanged = Object.keys(READ).filter((id) => JSON.stringify(later[id]) === JSON.stringify(FIRST[id]));
        assert.deepEqual(unchanged, [], 'the product changed every value');
        await page.evaluate(() => document.getElementById('form').reset());
        assert.deepEqual(await read(page), FIRST, 'a reset returns each control to its first value');
        assert.deepEqual(await page.evaluate(() => window.hydrationErrors), []);
        assert.deepEqual(errors, []);
        await page.close();
      });
    }
  });
}
