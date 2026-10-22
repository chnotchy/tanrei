// `aria-*` props on a wrapper, at run time in each engine: React writes them on the element's host, the element moves
// them to `data-aria-*` and exposes them on the native element that carries its role (the Button spec's accessibility
// notes: "WHEN the product sets an aria- attribute on the host"), and when React takes a prop away (`undefined`, so
// `removeAttribute`) the moved value and what the native element exposes go with it.
//
//   pnpm --filter @tanrei/web build && pnpm --filter @tanrei/react build && pnpm --filter @tanrei/react test
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from '@playwright/test';
import { build } from 'esbuild';

const ORIGIN = 'http://tanrei.test';
let script;

before(async () => {
  const bundle = await build({
    entryPoints: [fileURLToPath(new URL('aria.tsx', import.meta.url))],
    bundle: true,
    format: 'esm',
    jsx: 'automatic',
    write: false,
    logLevel: 'silent',
    define: { 'process.env.NODE_ENV': '"development"' },
  });
  script = bundle.outputFiles[0].text;
});

/** What the host carries and what its native button exposes. */
const read = (page) =>
  page.evaluate(async () => {
    const host = document.querySelector('#inbox');
    await host.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const button = host.shadowRoot.querySelector('button');
    return {
      host: [...host.attributes].map((a) => a.name).filter((name) => name.startsWith('aria-') || name.startsWith('data-aria-')).sort(),
      label: button.getAttribute('aria-label'),
      current: button.getAttribute('aria-current'),
      // The description: the text of what the button's aria-describedby names in its own tree.
      described: (button.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean).map((id) => host.shadowRoot.getElementById(id)?.textContent).join(' '),
    };
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

    test('aria-* props a React product sets on <Button> reach its native button, and go when React takes them away', async () => {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error));
      await page.route(`${ORIGIN}/**`, (route) =>
        new URL(route.request().url()).pathname === '/aria.js'
          ? route.fulfill({ contentType: 'text/javascript', body: script })
          : route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><body><div id="root"></div><script type="module" src="/aria.js"></script></body></html>' }),
      );
      await page.goto(`${ORIGIN}/`);
      await page.locator('tanrei-button:defined').waitFor();
      assert.deepEqual(await read(page), { host: ['data-aria-current', 'data-aria-describedby', 'data-aria-label'], label: 'Inbox', current: 'page', described: 'Opens the inbox' });
      await page.evaluate(() => window.setAria(false));
      assert.deepEqual(await read(page), { host: [], label: null, current: null, described: '' });
      await page.evaluate(() => window.setAria(true));
      assert.deepEqual(await read(page), { host: ['data-aria-current', 'data-aria-describedby', 'data-aria-label'], label: 'Inbox', current: 'page', described: 'Opens the inbox' });
      assert.deepEqual(errors, []);
      await page.close();
    });
  });
}
