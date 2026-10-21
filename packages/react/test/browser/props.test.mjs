// The wrappers at run time, in a browser of each engine: a product's handler for one of the platform's own events
// (`onClick`, `onInput`, `onKeyDown`, `onBlur`) runs, and the element's own handling of that event still runs too. A
// wrapper sets a prop on the element as a property when its name is in the element class's prototype (@lit/react
// `createComponent`), so an element with an internal method of the same name had it replaced by the product's: the
// toggle stopped toggling, the text input stopped taking its value, committing and acting.
//
//   pnpm --filter @tanrei/web build && pnpm --filter @tanrei/react build && pnpm --filter @tanrei/react test
//
// The page (app.tsx) is bundled with React and the built wrappers and served from memory.
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from '@playwright/test';
import { build } from 'esbuild';

const ORIGIN = 'http://tanrei.test';
let script;

before(async () => {
  const bundle = await build({
    entryPoints: [fileURLToPath(new URL('app.tsx', import.meta.url))],
    bundle: true,
    format: 'esm',
    jsx: 'automatic',
    write: false,
    logLevel: 'silent',
    define: { 'process.env.NODE_ENV': '"development"' },
  });
  script = bundle.outputFiles[0].text;
});

const calls = (page) => page.evaluate(() => window.calls.slice());
/** Waits for `call`; failing, it says what was seen instead. */
const until = (page, call) =>
  page.waitForFunction((c) => window.calls.includes(c), call, { timeout: 5000 }).catch(async (error) => {
    throw new Error(`${call} never came; the handlers saw ${JSON.stringify(await calls(page))}`, { cause: error });
  });

for (const engine of [chromium, firefox, webkit]) {
  describe(engine.name(), () => {
    let browser;
    let page;
    before(async () => {
      browser = await engine.launch();
    });
    after(async () => {
      await browser?.close();
    });

    const open = async () => {
      page = await browser.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error));
      await page.route(`${ORIGIN}/**`, (route) =>
        new URL(route.request().url()).pathname === '/app.js'
          ? route.fulfill({ contentType: 'text/javascript', body: script })
          : route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>' }),
      );
      await page.goto(`${ORIGIN}/`);
      await page.locator('tanrei-button:defined, tanrei-text-input:defined').nth(1).waitFor();
      return errors;
    };

    test('BTN-14: <Button toggle onClick> runs the product handler and still toggles, then fires change', async () => {
      const errors = await open();
      const button = page.locator('#bold');
      await button.click();
      await until(page, 'change:true');
      assert.deepEqual(await calls(page), ['click', 'change:true']);
      assert.equal(await button.evaluate((el) => el.selected), true);
      assert.equal(await button.locator('button').getAttribute('aria-pressed'), 'true');
      await button.click();
      await until(page, 'change:false');
      assert.deepEqual(await calls(page), ['click', 'change:true', 'click', 'change:false']);
      assert.equal(await button.evaluate((el) => el.selected), false);
      assert.deepEqual(errors, []);
      await page.close();
    });

    test('TXI-2, TXI-3: <TextInput onInput onKeyDown onBlur> runs the product handlers and still takes the value, acts and commits', async () => {
      const errors = await open();
      const field = page.getByRole('textbox', { name: 'Name' });
      await field.click();
      await field.pressSequentially('abc');
      await until(page, 'input:abc');
      assert.equal(await page.locator('#echo').textContent(), 'abc');
      assert.equal(await page.locator('#name').evaluate((el) => el.value), 'abc');
      // Enter: the element's own key handling commits the value and fires `action` (TXI-3).
      await field.press('Enter');
      await until(page, 'action:abc');
      await field.pressSequentially('d');
      // Leaving the field for the next one (an input, which Tab reaches in every engine): the element's own blur handling commits the new value (TXI-2).
      await page.keyboard.press('Tab');
      await until(page, 'commit:abcd');
      const seen = await calls(page);
      assert.deepEqual(
        seen.filter((c) => c.startsWith('input:')),
        ['input:a', 'input:ab', 'input:abc', 'input:abcd'],
      );
      assert.deepEqual(
        seen.filter((c) => c.startsWith('keydown:')),
        ['keydown:a', 'keydown:b', 'keydown:c', 'keydown:Enter', 'keydown:d', 'keydown:Tab'],
      );
      assert.deepEqual(
        seen.filter((c) => /^(commit|action|blur)/.test(c)),
        ['commit:abc', 'action:abc', 'commit:abcd', 'blur'],
      );
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'after');
      assert.deepEqual(errors, []);
      await page.close();
    });
  });
}
