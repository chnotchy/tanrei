// `setTokens()` of `@tanrei/web`: tokens set from script on the root or on an element, taken off with an empty value,
// and — the reason it exists — each write changes the NUMBER of the element's custom properties, which WebKit does not
// compare value by value (README, "A single token set on the root from script is slow in WebKit": 9.9 s for 2,000
// elements without that, 0.08 s with it). The number is counted here, in every engine, for every kind of write: a
// name the stylesheet already declares, a new one, one taken off that the stylesheet declares, one it does not, and
// several at once.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';
import { buildSync } from 'esbuild';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let api: string | undefined;
/** The built `setTokens()`, as a product's bundle has it, on `window.tanreiTokens`. */
const script = () =>
  (api ??= buildSync({ entryPoints: [path.join(pkg, 'dist/set-tokens.js')], bundle: true, write: false, format: 'iife', globalName: 'tanreiTokens', define: { 'process.env.NODE_ENV': '"development"' } }).outputFiles[0].text);

/** Names the page's stylesheet declares on the root, as tokens.css does. */
const DECLARED = ['--a', '--b', '--c'];

async function mount(page: Page) {
  await page.setContent(`<!doctype html><html><head><style>:root { ${DECLARED.map((name, i) => `${name}: ${i}`).join('; ')} } #box { --own: 1 }</style></head><body><div id="box"><span id="inner"></span></div></body></html>`);
  await page.addScriptTag({ content: script() });
}

type Tokens = Record<string, string | null>;
/** Runs setTokens(tokens, { on }) in the page and returns the number of custom properties the element has, before and after, as the cascade gives them. */
const write = (page: Page, tokens: Tokens, on?: string) =>
  page.evaluate(
    ([t, selector, declared]) => {
      const el = (selector ? document.querySelector(selector) : document.documentElement) as HTMLElement;
      // The element's set of custom properties: what its stylesheet rules declare (here: the root's three, the box's
      // one) and what its own style holds. Counted from the declarations, so that counting forces no style work.
      const sheet = el === document.documentElement ? declared : el.id === 'box' ? ['--own'] : [];
      const count = () => new Set([...sheet, ...[...el.style].filter((name) => name.startsWith('--'))]).size;
      const before = count();
      (window as unknown as { tanreiTokens: { setTokens: (tokens: unknown, options: unknown) => void } }).tanreiTokens.setTokens(t, selector ? { on: el } : {});
      return { before, after: count(), markers: [...el.style].filter((name) => name.startsWith('--tanrei-tokens-written-')).length };
    },
    [tokens, on, DECLARED] as const,
  );
const value = (page: Page, name: string, selector = 'html') => page.evaluate(([n, s]) => getComputedStyle(document.querySelector(s)!).getPropertyValue(n).trim(), [name, selector] as const);

test('sets each token on the root, and an empty value takes it off: the stylesheet’s value is back', async ({ page }) => {
  await mount(page);
  await write(page, { '--a': '10', '--new': 'x' });
  expect(await value(page, '--a')).toBe('10');
  expect(await value(page, '--new')).toBe('x');
  // Inherited by what the root holds, as a stylesheet's token is.
  expect(await value(page, '--a', '#inner')).toBe('10');
  await write(page, { '--a': '', '--new': null });
  expect(await value(page, '--a')).toBe('0');
  expect(await value(page, '--new')).toBe('');
});

test('with on, the tokens are the element’s own and reach only what it holds', async ({ page }) => {
  await mount(page);
  await write(page, { '--a': '20' }, '#box');
  expect(await value(page, '--a', '#inner')).toBe('20');
  expect(await value(page, '--a')).toBe('0');
});

test('a name that is not a custom property is ignored and reported in a debug build', async ({ page }) => {
  const warnings: string[] = [];
  page.on('console', (message) => message.type() === 'warning' && warnings.push(message.text()));
  await mount(page);
  await write(page, { color: 'red', '--a': '1' });
  expect(await page.evaluate(() => document.documentElement.style.color)).toBe('');
  expect(warnings.some((line) => line.includes('"color" is not a custom property'))).toBe(true);
});

test('every write changes the number of the element’s custom properties, whatever it sets or takes off, and the element holds few names of its own', async ({ page }) => {
  await mount(page);
  // Each kind of write, several times over, so that the markers are both added and taken off.
  const writes: Tokens[] = [
    { '--a': '1' }, // declared by the stylesheet: the set's size is unchanged by the write itself
    { '--a': '2' },
    { '--a': '3' },
    { '--new': '1' }, // a new name: +1
    { '--new': '' }, // taken off, declared nowhere else: -1
    { '--new': '2' },
    { '--a': '' }, // taken off, declared by the stylesheet: unchanged
    { '--a': '4', '--b': '5' },
    { '--x': '1', '--y': '1' }, // two new names
    { '--x': '', '--y': '' },
    { '--a': '', '--b': '', '--new': '' },
    { '--c': '7' },
    { '--c': '8' },
    { '--c': '9' },
    { '--c': '10' },
  ];
  for (const on of [undefined, '#box', '#inner']) {
    for (const tokens of writes) {
      const { before, after, markers } = await write(page, tokens, on);
      expect(after, `${on ?? 'root'}: ${JSON.stringify(tokens)}`).not.toBe(before);
      expect(markers).toBeLessThanOrEqual(4);
    }
  }
});

test('a write of nothing changes nothing', async ({ page }) => {
  await mount(page);
  const { before, after, markers } = await write(page, {});
  expect([after, markers]).toEqual([before, 0]);
});
