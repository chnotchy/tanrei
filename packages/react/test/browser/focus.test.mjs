// React's `autoFocus` on a wrapper, in a browser of each engine, is what it is on a native control: the element is
// focused when it mounts, whatever had focus — a field revealed by a press on a button takes focus from that button —
// and nothing is focused when a server's page is hydrated (src/server.ts, `focusedAtMount`). React leaves a custom
// element's `autoFocus` to the browser's `autofocus`, which the browser answers only while nothing has focus, so
// without the wrapper's part the field stayed unfocused. A product's ref that calls `focus()` as the element is
// attached, before its first update, reaches the inner control too: the element keeps the call until it has drawn.
//
//   pnpm --filter @tanrei/web build && pnpm --filter @tanrei/react build && pnpm --filter @tanrei/react test
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from '@playwright/test';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { App, CONTROLS } from './focus-app.mjs';

const ORIGIN = 'http://tanrei.test';
let script;

before(async () => {
  const bundle = await build({
    entryPoints: [fileURLToPath(new URL('focus-app.mjs', import.meta.url))],
    bundle: true,
    format: 'esm',
    write: false,
    logLevel: 'silent',
    define: { 'process.env.NODE_ENV': '"development"' },
  });
  script = bundle.outputFiles[0].text;
});

/** Where focus is: each element's id or tag, through every shadow root it is in. */
const focusPath = (page) =>
  page.evaluate(() => {
    let active = document.activeElement;
    const path = [active?.id || active?.localName];
    while (active?.shadowRoot?.activeElement) {
      active = active.shadowRoot.activeElement;
      path.push(active.id || active.localName);
    }
    return path.join(' > ');
  });

/** Once the control has drawn: the commit's effects have run, its update (and its members') has ended, two frames on. */
const drawn = (page) =>
  page.evaluate(async () => {
    const frames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    while (!window.committed || !document.getElementById('subject')) await frames();
    const subject = document.getElementById('subject');
    await customElements.whenDefined(subject.localName);
    for (const element of [subject, ...subject.querySelectorAll('*'), ...(subject.shadowRoot?.querySelectorAll('*') ?? [])]) await element.updateComplete;
    await frames();
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

    /** A page whose root holds `html` (a server's render, hydrated) or nothing (rendered by the client); `lead`, a script of the page, runs before the app's. */
    const open = async ({ html = '', hydrate = '', lead = '' } = {}) => {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(String(error)));
      await page.route(`${ORIGIN}/**`, (route) =>
        new URL(route.request().url()).pathname === '/app.js'
          ? route.fulfill({ contentType: 'text/javascript', body: `${script}\nwindow.start();` })
          : route.fulfill({
              contentType: 'text/html',
              body: `<!doctype html><html lang="en"><body><div id="root" data-hydrate="${hydrate}">${html}</div>${lead}<script type="module" src="/app.js"></script></body></html>`,
            }),
      );
      await page.goto(`${ORIGIN}/`);
      await page.waitForFunction(() => !!window.show);
      return { page, errors };
    };

    test('autoFocus focuses the inner control when the wrapper mounts, with nothing focused and when another element has focus, as on a native control', async () => {
      const { page, errors } = await open();
      for (const name of Object.keys(CONTROLS)) {
        for (const from of ['nothing', 'outside']) {
          await page.evaluate(() => window.show(null));
          await page.evaluate((from) => {
            if (from === 'outside') document.getElementById('outside').focus();
            else document.activeElement?.blur();
          }, from);
          await page.evaluate((name) => window.show(name), name);
          await drawn(page);
          const path = await focusPath(page);
          assert.match(path, /^subject > /, `${name}, focus on ${from} before: focus is on ${path}, not in the control`);
        }
      }
      assert.deepEqual(errors, []);
      await page.close();
    });

    test('a page rendered on the server is hydrated without focusing the control marked autoFocus, where the person has focused something else', async () => {
      const html = renderToString(createElement(App, { initial: { name: 'text-input', key: 'server' } }));
      assert.match(html, /<tanrei-text-input[^>]* autofocus=""/i, 'the server writes the attribute');
      // The person is in the other field before the script runs.
      const { page, errors } = await open({ html, hydrate: 'text-input', lead: "<script>document.getElementById('outside').focus();</script>" });
      await drawn(page);
      assert.equal(await focusPath(page), 'outside');
      assert.deepEqual(errors, []);
      await page.close();
    });
  });
}
