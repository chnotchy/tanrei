// The one corner rule (src/styles/shape.ts) on a pill: a comp shape token that aliases `sys.shape.corner.full`
// draws round caps whatever the smoothing. The CSS emitter marks such tokens at
// build time (`<token>-pill: 1`); the sheet here is built through its own entry point, `emitCss(model, { scope })`,
// exactly as `buildProductSystem` does for the `web` target.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';
import { fixtureHost, loadSpec, mountFixtures, resolveToken, tabTo } from '../test/harness.js';

const spec = loadSpec('button');
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (file: string) => fs.readFileSync(path.join(repo, file), 'utf8');

/**
 * What a system's sheet says of its comp shape tokens: for each, the step of `sys.shape.corner` its alias chain ends
 * at (through other comp tokens: a state's shape aliases its component's), or — for a corner inside another, derived
 * by `sub` (the outer corner less the inset, never below zero, written `max(0px, calc(var(<outer>) - var(<inset>)))`)
 * — the outer corner it is derived from; and the emitter's `-pill` mark. Read from the sheet itself, so that no test
 * here names a component as "the one that is not a pill": which components are pills is the tokens' to say, and has
 * changed before (the default system's Button became one).
 */
function shapeTokens(sheet: string) {
  const values = new Map([...sheet.matchAll(/(--tanrei-comp-[a-z0-9-]+-shape): var\((--tanrei-[a-z0-9-]+)\);/g)].map((m) => [m[1], m[2]] as const));
  const subs = new Map([...sheet.matchAll(/(--tanrei-comp-[a-z0-9-]+-shape): max\(0px, calc\(var\((--tanrei-comp-[a-z0-9-]+-shape)\) - var\(--tanrei-[a-z0-9-]+\)\)\);/g)].map((m) => [m[1], m[2]] as const));
  const marks = new Map([...sheet.matchAll(/(--tanrei-comp-[a-z0-9-]+-shape)-pill: ([01]);/g)].map((m) => [m[1], Number(m[2])] as const));
  const end = (name: string): { step: string | null; inside: string | null } => {
    for (let at: string | undefined = name, hops = 0; at && hops < 8; at = values.get(at), hops += 1) {
      const corner = /^--tanrei-sys-shape-corner-(.+)$/.exec(at);
      if (corner) return { step: corner[1], inside: null };
      const outer = subs.get(at);
      if (outer) return { step: null, inside: outer };
    }
    return { step: null, inside: null };
  };
  return [...marks].map(([name, pill]) => ({ name, pill, ...end(name) }));
}

/** A step of the corner scale that some comp shape token of the default system takes and that is not the pill: found, not named. */
const EASED_STEP = (() => {
  const found = shapeTokens(read('packages/web/dist/tokens.css')).find((token) => token.pill === 0 && token.step !== null && token.step !== 'none');
  if (!found?.step) throw new Error('the default system has no comp shape token that is a rounded corner and not a pill');
  return found.step;
})();

/** cupertino (smoothing 0.6), with the Button's container shape pointed at the full step — whatever cupertino gives it. */
const layer = {
  id: 'pill-cupertino',
  name: 'Pill cupertino',
  extends: 'cupertino',
  description: 'A test layer: cupertino’s eased corners, with a pill-shaped Button.',
  tokens: { 'tanrei.comp.button.container.shape': { $value: '{tanrei.sys.shape.corner.full}' } },
};
/** The same, with the Button's container shape pointed at a step that is not the pill: the non-pill beside it. */
const eased = {
  id: 'eased-cupertino',
  name: 'Eased cupertino',
  extends: 'cupertino',
  description: 'A test layer: cupertino’s eased corners, with a Button whose corners are a step of the scale.',
  tokens: { 'tanrei.comp.button.container.shape': { $value: `{tanrei.sys.shape.corner.${EASED_STEP}}` } },
};

let built: Promise<{ pill: string; eased: string }> | undefined;
function sheets() {
  built ??= (async () => {
    const { resolveSystem } = await import('@tanrei/tokens-build/resolve');
    const { emitCss } = await import('@tanrei/tokens-build/emit/css');
    const emit = async (system: typeof layer) => emitCss(await (await resolveSystem({ layers: [system] })).model(), { scope: system.id }) as string;
    return { pill: await emit(layer), eased: await emit(eased) };
  })();
  return built;
}
const pillSheet = async () => (await sheets()).pill;

// Building a layer takes longer than a test's budget on a busy machine, and longer with every component added to the
// token set: once per worker, up front.
test.beforeAll(async () => {
  test.setTimeout(480_000);
  await sheets();
});

const inner = (page: Page, id: string) => fixtureHost(page, spec, id).locator('button');
const css = (page: Page, id: string, property: string, pseudo?: string) =>
  inner(page, id).evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
/** A circle is `round`, which computes to superellipse(1). */
const ROUND = /^(round|superellipse\(1\))$/;

test('the emitter marks every comp shape token by whether its alias chain reaches corner.full', async () => {
  const { pill, eased: easedSheet } = await sheets();
  // The token pointed at the full step, and every state shape that aliases it; pointed at another step, none of them.
  for (const state of ['', 'hovered-', 'focused-', 'pressed-', 'disabled-']) {
    expect(pill).toContain(`--tanrei-comp-button-${state}container-shape-pill: 1;`);
    expect(easedSheet).toContain(`--tanrei-comp-button-${state}container-shape-pill: 0;`);
  }
  // Every sheet that is shipped: each comp shape token is marked exactly when its alias chain ends at the full step —
  // whichever components those are in that system — and the default system has tokens of both kinds.
  const tokensCss = read('packages/web/dist/tokens.css');
  for (const file of ['dist/tokens.css', 'dist/systems/m3-like.css', 'dist/systems/m3-expressive-like.css', 'dist/systems/cupertino.css']) {
    const tokens = shapeTokens(read(`packages/web/${file}`));
    expect(tokens.length, file).toBeGreaterThan(0);
    const byName = new Map(tokens.map((token) => [token.name, token]));
    for (const token of tokens) {
      if (token.inside) {
        // A corner inside another (`sub`): never the full step, and its outer corner is a shape token of the sheet
        // that ends at a step of the scale, marked as every other.
        expect(token.pill, `${file} ${token.name} (inside ${token.inside})`).toBe(0);
        expect(byName.get(token.inside)?.step ?? null, `${file} ${token.name}: its outer corner ${token.inside} ends at a step of the corner scale`).not.toBeNull();
        continue;
      }
      expect(token.step, `${file} ${token.name} ends at a step of the corner scale, or is a corner inside another`).not.toBeNull();
      expect(token.pill, `${file} ${token.name} (${token.step})`).toBe(token.step === 'full' ? 1 : 0);
    }
  }
  const marks = shapeTokens(tokensCss).map((token) => token.pill);
  expect(marks).toContain(0);
  expect(marks).toContain(1);
  // Only shape tokens get one: nothing that does not alias a sys.shape.corner step.
  expect(tokensCss).not.toMatch(/--tanrei-comp-button-container-height-[a-z]+-pill/);
  expect(tokensCss).not.toMatch(/--tanrei-comp-[a-z0-9-]+-(?:height|width|size|color|padding)[a-z0-9-]*-pill:/);
});

test('a comp shape aliasing corner.full draws round caps under cupertino’s smoothing 0.6; a non-pill beside it stays eased', async ({ page }) => {
  await mountFixtures(page, spec, { system: layer.id, systemCss: await pillSheet() });
  // The same system on one stage with the Button's shape at a step that is not the full one, for comparison: the same
  // rule, a radius that is not the pill's. (Which step is read from the tokens; no component is assumed not to be a pill.)
  await page.addStyleTag({ content: (await sheets()).eased });
  await page.locator('[data-fixture="tonal-medium"]').evaluate((el, id) => el.setAttribute('data-tanrei-system', id), eased.id);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tanrei-sys-shape-corner-smoothing').trim())).toBe('0.6');
  expect(await page.locator('[data-fixture="tonal-medium"]').evaluate((el) => getComputedStyle(el).getPropertyValue('--tanrei-sys-shape-corner-smoothing').trim())).toBe('0.6');
  expect(await resolveToken(page, '--tanrei-comp-button-container-shape')).toBe(9999);
  expect(await inner(page, 'tonal-medium').evaluate((el) => getComputedStyle(el).getPropertyValue('--tanrei-corner-pill').trim())).toBe('0');

  const supported = await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'));
  test.info().annotations.push({ type: 'corner-shape', description: supported ? 'eased with corner-shape' : 'not supported by this browser: circular fallback everywhere' });
  if (!supported) {
    expect(await css(page, 'filled-medium', 'corner-top-left-shape')).toBe('');
    expect(await css(page, 'tonal-medium', 'corner-top-left-shape')).toBe('');
    return;
  }
  // The pill: round, at the token's radius (the smoothing's radius scale is 1).
  expect(await css(page, 'filled-medium', 'corner-top-left-shape')).toMatch(ROUND);
  expect(await css(page, 'filled-medium', 'border-top-left-radius')).toBe('9999px');
  // The non-pill: eased, exponent 2.6 at 1.24 r (shape.ts).
  expect(Number.parseFloat((await css(page, 'tonal-medium', 'corner-top-left-shape')).replace(/^superellipse\(|\)$/g, ''))).toBeCloseTo(Math.log2(2.6), 3);

  // Drawn exactly as a circle: the same pixels as `corner-shape: round`, and not those of the flattened caps.
  const stage = page.locator('[data-fixture="filled-medium"]');
  const settle = () => page.waitForTimeout(400); // the state transition includes border-radius
  const drawn = await stage.screenshot({ animations: 'disabled' });
  await inner(page, 'filled-medium').evaluate((el) => el.style.setProperty('corner-shape', 'round'));
  await settle();
  expect(drawn.equals(await stage.screenshot({ animations: 'disabled' })), 'the pill is a circle').toBe(true);
  await inner(page, 'filled-medium').evaluate((el) => {
    el.style.removeProperty('corner-shape');
    el.style.setProperty('--tanrei-corner-pill', '0');
  });
  await settle();
  expect(drawn.equals(await stage.screenshot({ animations: 'disabled' })), 'without the mark the caps flatten').toBe(false);
  await inner(page, 'filled-medium').evaluate((el) => el.style.removeProperty('--tanrei-corner-pill'));

  // The focus ring and the pressed state follow: each state names its own shape token, and each aliases the pill.
  await tabTo(page, fixtureHost(page, spec, 'filled-medium'));
  expect(await css(page, 'filled-medium', 'corner-top-left-shape', '::after')).toMatch(ROUND);
  await page.keyboard.down('Space');
  expect(await inner(page, 'filled-medium').getAttribute('data-pressed')).toBe('dim');
  expect(await css(page, 'filled-medium', 'corner-top-left-shape')).toMatch(ROUND);
  await page.keyboard.up('Space');
});
