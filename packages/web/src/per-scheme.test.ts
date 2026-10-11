// A component color that differs per scheme (a `tone` rule on a Button state — IR paint kind 'scheme'), drawn by a real browser from the stylesheet the CSS emitter writes.
//
// The sheet is built through the emitter's own entry point, `emitCss(model, { scope })` — exactly the call
// `buildProductSystem` makes for the `web` target.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';
import { fixtureHost, loadSpec, mountFixtures, resolveColor } from '../test/harness.js';

const spec = loadSpec('button');
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const layer = JSON.parse(fs.readFileSync(path.join(repo, 'packages/tokens-build/test/fixtures/tone-per-state.system.json'), 'utf8')) as { id: string };
const SCHEMES = ['light', 'light-medium', 'light-high', 'dark', 'dark-medium', 'dark-high'] as const;
type Scheme = (typeof SCHEMES)[number];

let built: Promise<{ css: string; expected: Record<Scheme, Record<'hovered' | 'pressed', string>> }> | undefined;
function system() {
  built ??= (async () => {
    const { resolveSystem } = await import('@tanrei/tokens-build/resolve');
    const { emitCss } = await import('@tanrei/tokens-build/emit/css');
    const resolved = await resolveSystem({ layers: [layer] });
    const rgb = (hex: string) => `rgb(${[1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;
    const expected = Object.fromEntries(
      SCHEMES.map((scheme) => [scheme, Object.fromEntries((['hovered', 'pressed'] as const).map((state) => [state, rgb(resolved.tokens(scheme)[`tanrei.comp.button.filled.${state}.container.color`].$value.hex)]))]),
    ) as Record<Scheme, Record<'hovered' | 'pressed', string>>;
    return { css: emitCss(await resolved.model(), { scope: layer.id }) as string, expected };
  })();
  return built;
}

// Building the layer takes longer than a test's budget on a busy machine, and longer with every component added to the
// token set: once per worker, up front.
test.beforeAll(async () => {
  test.setTimeout(240_000);
  await system();
});

/** The fixture and the native element whose container color the layer's `tone` rules decide. */
const host = (page: Page) => fixtureHost(page, spec, 'filled-medium');
const background = (page: Page) => host(page).locator('button').evaluate((el) => getComputedStyle(el).backgroundColor);

/** What the filled button draws while hovered, and while hovered and pressed (pressed-feedback: overlay). */
async function drawn(page: Page) {
  await page.mouse.move(0, 0);
  await host(page).hover();
  const { expected } = await system();
  // The hovered color arrives through a transition: wait for one of the six values the system can give.
  const all = new Set(SCHEMES.map((scheme) => expected[scheme].hovered));
  await expect.poll(() => background(page).then((color) => all.has(color))).toBe(true);
  const hovered = await background(page);
  await page.mouse.down();
  const pressed = await background(page); // no transition in (BTN-8)
  await page.mouse.up();
  return { hovered, pressed };
}

test('the fixture differs per scheme (the premise), and the stylesheet says so with light-dark()', async () => {
  const { css, expected } = await system();
  expect(expected.light.pressed).not.toBe(expected.dark.pressed);
  expect(expected.light.pressed).not.toBe(expected['light-high'].pressed);
  expect(css).toMatch(/--tanrei-comp-button-filled-pressed-container-color: light-dark\(#[0-9a-f]{6}, #[0-9a-f]{6}\);/);
});

for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: hovered and pressed draw this scheme's tone — standard, then medium and high contrast`, async ({ page }) => {
    const { css, expected } = await system();
    await mountFixtures(page, spec, { system: layer.id, systemCss: css, theme });
    expect(await drawn(page)).toEqual(expected[theme]);
    // The token itself resolves per scheme too (what a product's own CSS reads).
    expect(await resolveColor(page, '--tanrei-comp-button-filled-pressed-container-color')).toBe(expected[theme].pressed);

    for (const level of ['medium', 'high'] as const) {
      await page.evaluate((l) => document.documentElement.setAttribute('data-tanrei-contrast', l), level);
      expect(await drawn(page), level).toEqual(expected[`${theme}-${level}`]);
    }
    // A subtree's contrast level reaches the component color as it reaches the roles.
    await page.evaluate(() => {
      document.documentElement.removeAttribute('data-tanrei-contrast');
      document.querySelector('[data-fixture="filled-medium"]')!.setAttribute('data-tanrei-contrast', 'high');
    });
    expect(await drawn(page), 'high, on the stage only').toEqual(expected[`${theme}-high`]);
  });
}

test('light and dark on one page: the same button state, two colors', async ({ page }) => {
  const { css, expected } = await system();
  await mountFixtures(page, spec, { system: layer.id, systemCss: css, theme: 'light' });
  const light = await drawn(page);
  await page.evaluate(() => document.documentElement.setAttribute('data-tanrei-theme', 'dark'));
  const dark = await drawn(page);
  expect(light.pressed).not.toBe(dark.pressed);
  expect(light.hovered).not.toBe(dark.hovered);
  expect([light, dark]).toEqual([expected.light, expected.dark]);
});

test('prefers-contrast: more and prefers-color-scheme: dark, with no attribute at all', async ({ page }) => {
  const { css, expected } = await system();
  await page.emulateMedia({ colorScheme: 'dark', contrast: 'more' });
  await mountFixtures(page, spec, { system: layer.id, systemCss: css });
  await page.evaluate(() => document.documentElement.removeAttribute('data-tanrei-theme'));
  expect(await drawn(page)).toEqual(expected['dark-high']);
  await page.emulateMedia({ colorScheme: 'light', contrast: 'more' });
  expect(await drawn(page)).toEqual(expected['light-high']);
});
