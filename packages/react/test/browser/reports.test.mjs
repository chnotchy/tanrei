// Wrappers used correctly, at run time in each engine, report nothing: no `[tanrei]` warning or error in the console of
// a debug build. A select's and a combobox's checks of their options (SEL-17, CMB-57) read the options as their
// attributes say; a wrapper sets an option's `value` as a property after the field has read its children, and the
// attribute follows only with the option's own update — so a check that read them then saw every option with the empty
// value, and a value that named none of them.
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
    entryPoints: [fileURLToPath(new URL('reports.tsx', import.meta.url))],
    bundle: true,
    format: 'esm',
    jsx: 'automatic',
    write: false,
    logLevel: 'silent',
    define: { 'process.env.NODE_ENV': '"development"' },
  });
  script = bundle.outputFiles[0].text;
});

/** Waits until each field — and the select or combobox a field element draws — has rendered with what it was given, and two frames more: every report has been made by then. */
const settled = (page) =>
  page.evaluate(async () => {
    const fields = [...document.querySelectorAll('tanrei-select, tanrei-combobox, tanrei-select-field, tanrei-combobox-field, tanrei-option, tanrei-option-group')];
    await Promise.all(fields.map((field) => field.updateComplete));
    const inner = fields.flatMap((field) => [...(field.shadowRoot?.querySelectorAll('tanrei-select, tanrei-combobox') ?? [])]);
    await Promise.all(inner.map((field) => field.updateComplete));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
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

    test('SEL-17, CMB-57: a <Select> and a <Combobox> given options and a value that names one report nothing, at mount and when both change in one render; a value that names no option is still reported', async () => {
      const page = await browser.newPage();
      const errors = [];
      const reports = [];
      page.on('pageerror', (error) => errors.push(error));
      // Installed before the page loads, so that a report made at mount is heard.
      page.on('console', (message) => {
        if (message.text().includes('[tanrei]')) reports.push(`${message.type()}: ${message.text()}`);
      });
      await page.route(`${ORIGIN}/**`, (route) =>
        new URL(route.request().url()).pathname === '/reports.js'
          ? route.fulfill({ contentType: 'text/javascript', body: script })
          : route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><body><div id="root"></div><script type="module" src="/reports.js"></script></body></html>' }),
      );
      await page.goto(`${ORIGIN}/`);
      await page.locator('tanrei-combobox-field:defined').waitFor();
      await settled(page);
      // What each field shows is the option its value names: the options were read with their values.
      const shown = () => page.evaluate(() => ['theme', 'food', 'grouped'].map((id) => document.getElementById(id).shadowRoot.querySelector('.value')?.textContent ?? null));
      assert.deepEqual(await shown(), ['Light', 'Pear', 'Kyoto']);
      // The misuse is heard, once: the reports are listened to, and still made.
      const misuse = (report) => report.includes('value "zz" names no option') && report.includes('(SEL-17)');
      assert.equal(reports.filter(misuse).length, 1, JSON.stringify(reports));
      assert.deepEqual(reports.filter((report) => !misuse(report)), []);
      await page.evaluate(() => window.swap());
      await settled(page);
      assert.deepEqual(await shown(), ['Light', 'Kale', 'Kyoto']);
      assert.deepEqual(reports.filter((report) => !misuse(report)), []);
      assert.deepEqual(errors, []);
      await page.close();
    });
  });
}
