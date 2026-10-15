// The default icon style: Material Symbols Rounded, weight 300, outlined when unselected and filled when selected.
// Every assertion reads the tokens; the stylesheet has no numbers of its own.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';
import { acmeSystemCss, glyphsDrawn, glyphsSpelled, loadSpec, mountFixtures, presetFontFaces, resolveToken } from '../test/harness.js';
import { opticalSize } from '../test/icons.js';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');
const symbols = fs.readdirSync(path.join(pkg, 'node_modules/@fontsource-variable/material-symbols-rounded/files')).find((f) => f.includes('latin-full-normal'))!;
const font = fs.readFileSync(path.join(pkg, 'node_modules/@fontsource-variable/material-symbols-rounded/files', symbols)).toString('base64');

async function mount(page: Page, body: string, system?: { id: string; css: string }) {
  await page.setContent(`<!doctype html><html lang="en" data-tanrei-theme="light"${system ? ` data-tanrei-system="${system.id}"` : ''}><head>
    <style>@font-face{font-family:"Material Symbols Rounded";font-weight:100 700;src:url(data:font/woff2;base64,${font}) format("woff2");}</style>
    <style>${read('dist/tokens.css')}</style>${system ? `<style>${system.css}</style>` : ''}<style>${read('dist/icons.css')}</style>
    <style>body{margin:16px;background:var(--tanrei-sys-color-surface);color:var(--tanrei-sys-color-on-surface)} .row{display:flex;gap:16px;align-items:center;padding:8px}</style>
    </head><body>${body}<script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`);
  await page.evaluate(() => document.fonts.ready);
}
// Axis values to 1/1000: Firefox serializes an opsz computed as tan(atan2(48px, 1px)) as 47.9999.
const axes = (page: Page, selector: string) =>
  page.locator(selector).evaluate((el) => Object.fromEntries([...getComputedStyle(el).fontVariationSettings.matchAll(/"(\w+)" ([\d.]+)/g)].map((m) => [m[1], Math.round(Number(m[2]) * 1000) / 1000])));
/** What a family token resolves to. Chromium and Firefox serialize a family with spaces in quotes, WebKit without: the quotes are dropped. */
const family = (page: Page, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('span');
    probe.style.fontFamily = `var(${n})`;
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).fontFamily.replaceAll('"', '');
    probe.remove();
    return value;
  }, name);
const SELECTION = `<div class="row">
    <button id="toggle" aria-pressed="false"><span class="tanrei-icon">favorite</span></button>
    <span id="off" class="tanrei-icon">star</span>
    <span id="on" class="tanrei-icon" data-selected>star</span>
    <div data-selected><span id="opt-out" class="tanrei-icon" data-selected="false">star</span></div>
  </div>`;
const token = (page: Page, name: string) => page.evaluate((n) => Number(getComputedStyle(document.documentElement).getPropertyValue(n)), name);

// Building the acme fixture layer takes longer than a test's budget (about 50 s with today's token set): once per
// worker, up front.
test.beforeAll(async () => {
  test.setTimeout(240_000);
  await acmeSystemCss();
});

test('an icon is drawn with the icon font at the system weight, outlined, at its box size', async ({ page }) => {
  const SIZES = ['extra-small', 'small', 'medium', 'large'];
  await mount(
    page,
    `<div class="row"><span id="i" class="tanrei-icon" aria-hidden="true">favorite</span>${SIZES.map((s) => `<span id="${s}" class="tanrei-icon" data-size="${s}" aria-hidden="true">home</span>`).join('')}</div>`,
  );
  expect(await page.locator('#i').evaluate((el) => getComputedStyle(el).fontFamily.replaceAll('"', ''))).toBe('Material Symbols Rounded');
  expect(await family(page, '--tanrei-sys-icon-family-unselected')).toBe('Material Symbols Rounded');
  // The optical size is the box's (a bare icon's: sys.icon.medium), clamped to sys.icon.optical-size (the next test draws it).
  expect(await axes(page, '#i')).toEqual({ FILL: await token(page, '--tanrei-sys-icon-fill-unselected'), wght: await token(page, '--tanrei-sys-icon-weight'), GRAD: 0, opsz: await opticalSize(page, await resolveToken(page, '--tanrei-sys-icon-medium')) });
  expect(await token(page, '--tanrei-sys-icon-weight')).toBe(300);
  // A bare icon is the default size, sys.icon.medium;`data-size` picks any step of the scale.
  expect((await page.locator('#i').boundingBox())!.width).toBe(await resolveToken(page, '--tanrei-sys-icon-medium'));
  for (const size of SIZES) {
    const side = await resolveToken(page, `--tanrei-sys-icon-${size}`);
    expect((await page.locator(`#${size}`).boundingBox())!.height, size).toBe(side);
  }
  const sides = await Promise.all(SIZES.map((s) => resolveToken(page, `--tanrei-sys-icon-${s}`)));
  expect(new Set(sides).size, 'four distinct steps').toBe(SIZES.length);
});

test('the optical size is the box’s, clamped to sys.icon.optical-size: drawn exactly as an explicit opsz of that size', async ({ page }) => {
  // `font-optical-sizing: auto` is not drawn by every engine — WebKit on Linux draws the font's default opsz (24) at every
  // size — so the axis is written by hand from the box size, with `tan(atan2(<length>, 1px))`: never `calc(<length> /
  // 1px)`, which Firefox lacks and which would drop the whole declaration, fill and weight with it. An engine that cannot
  // evaluate it keeps `font-optical-sizing: auto` (test/icons.ts). Pixels prove the drawing in every engine: at each box
  // size the glyph equals an explicit opsz of the clamped size — below the range the minimum, inside it the box, above it
  // the maximum — and at 48 it differs from opsz 20 (the axis is live, not the 20 master scaled up).
  const at = (id: string, size: number, opsz?: number) =>
    `<span id="${id}" class="tanrei-icon" aria-hidden="true" style="--tanrei-icon-size:${size}px;transition:none;color:#000${opsz ? `;font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' ${opsz}` : ''}">favorite</span>`;
  const cases = [
    [16, 20],
    [32, 32],
    [48, 48],
    [56, 48],
  ] as const;
  await mount(page, cases.map(([size, opsz]) => `<div class="row">${at(`drawn-${size}`, size)}${at(`explicit-${size}`, size, opsz)}${at(`master-20-${size}`, size, 20)}</div>`).join(''));
  expect([await token(page, '--tanrei-sys-icon-optical-size-min'), await token(page, '--tanrei-sys-icon-optical-size-max')]).toEqual([20, 48]);
  for (const [size, opsz] of cases) {
    expect(await page.locator(`#drawn-${size}`).evaluate((el) => getComputedStyle(el).fontOpticalSizing)).toBe('auto');
    const written = (await opticalSize(page, size)) !== undefined;
    expect(await axes(page, `#drawn-${size}`), `${size}`).toEqual({ FILL: 0, wght: 300, GRAD: 0, ...(written ? { opsz } : {}) });
    const [drawn, explicit, master] = await Promise.all([`#drawn-${size}`, `#explicit-${size}`, `#master-20-${size}`].map((id) => page.locator(id).screenshot()));
    expect(drawn.equals(explicit), `the optical size at ${size}px = opsz ${opsz}`).toBe(true);
    if (opsz !== 20) expect(drawn.equals(master), `and at ${size}px it is not the 20 master`).toBe(false);
  }
});

test('selected is filled, unselected is outlined — from the state of the control, never by hand', async ({ page }) => {
  await mount(page, `<div class="row">
    <button id="toggle" aria-pressed="false"><span class="tanrei-icon">favorite</span></button>
    <div role="tablist"><button role="tab" aria-selected="true"><span id="tab-on" class="tanrei-icon">home</span></button><button role="tab" aria-selected="false"><span id="tab-off" class="tanrei-icon">search</span></button></div>
    <a aria-current="page"><span id="nav" class="tanrei-icon">settings</span></a>
    <span id="own" class="tanrei-icon" data-selected>star</span>
    <div data-selected><span id="opt-out" class="tanrei-icon" data-selected="false">star</span></div>
  </div>`);
  const [off, on] = [await token(page, '--tanrei-sys-icon-fill-unselected'), await token(page, '--tanrei-sys-icon-fill-selected')];
  expect([off, on]).toEqual([0, 1]);
  const fill = async (selector: string) => (await axes(page, selector)).FILL;
  expect(await fill('#toggle .tanrei-icon')).toBe(off);
  await page.locator('#toggle').evaluate((el) => el.setAttribute('aria-pressed', 'true'));
  await expect.poll(() => fill('#toggle .tanrei-icon')).toBe(on);
  expect(await fill('#tab-on')).toBe(on);
  expect(await fill('#tab-off')).toBe(off);
  expect(await fill('#nav')).toBe(on);
  expect(await fill('#own')).toBe(on);
  expect(await fill('#opt-out')).toBe(off);
});

test('inside a button the icon takes the button’s icon size; a design system restyles icons by value', async ({ page }) => {
  await mount(page, `<div class="row"><tanrei-button id="b"><span slot="icon" class="tanrei-icon" aria-hidden="true">add</span>Add</tanrei-button></div>
    <div class="row" id="heavy" style="--tanrei-sys-icon-weight: 500; --tanrei-sys-icon-fill-unselected: 1"><span id="h" class="tanrei-icon">add</span></div>`);
  await page.waitForFunction(() => !!customElements.get('tanrei-button'));
  const box = await page.locator('#b .tanrei-icon').boundingBox();
  expect(box!.width).toBe(await resolveToken(page, '--tanrei-comp-button-icon-size-medium'));
  expect(await axes(page, '#h')).toMatchObject({ FILL: 1, wght: 500 });
});

test('the default system: one variable family for both states — selected switches the fill, the family stays', async ({ page }) => {
  await mount(page, SELECTION);
  const drawn = (selector: string) => page.locator(selector).evaluate((el) => getComputedStyle(el).fontFamily.replaceAll('"', ''));
  expect(await family(page, '--tanrei-sys-icon-family-selected')).toBe(await family(page, '--tanrei-sys-icon-family-unselected'));
  expect(await drawn('#off')).toBe('Material Symbols Rounded');
  expect(await drawn('#on')).toBe('Material Symbols Rounded');
  expect([(await axes(page, '#off')).FILL, (await axes(page, '#on')).FILL]).toEqual([0, 1]);
});

test('acme draws a static icon set: selected switches the FAMILY (and the fill, which a static font ignores)', async ({ page }) => {
  await mount(page, SELECTION, { id: 'acme', css: await acmeSystemCss() });
  const drawn = (selector: string) => page.locator(selector).evaluate((el) => getComputedStyle(el).fontFamily.replaceAll('"', ''));
  expect(await family(page, '--tanrei-sys-icon-family-unselected')).toBe('Material Icons Outlined');
  expect(await family(page, '--tanrei-sys-icon-family-selected')).toBe('Material Icons');
  expect(await drawn('#off')).toBe('Material Icons Outlined');
  expect(await drawn('#on')).toBe('Material Icons');
  expect(await drawn('#opt-out')).toBe('Material Icons Outlined');
  // Family AND fill switch together, from the state of the control.
  expect(await drawn('#toggle .tanrei-icon')).toBe('Material Icons Outlined');
  await page.locator('#toggle').evaluate((el) => el.setAttribute('aria-pressed', 'true'));
  await expect.poll(() => drawn('#toggle .tanrei-icon')).toBe('Material Icons');
  await expect.poll(() => axes(page, '#toggle .tanrei-icon')).toMatchObject({ FILL: 1, wght: 400, GRAD: 0 }); // the fill transitions
  expect(await axes(page, '#off')).toMatchObject({ FILL: 0, wght: await token(page, '--tanrei-sys-icon-weight') });
});

test('two icon sets on one page: a system scope changes the set only inside itself', async ({ page }) => {
  await mount(page, `<div id="scope" data-tanrei-system="acme"><span id="inside" class="tanrei-icon" data-selected>star</span></div><span id="outside" class="tanrei-icon" data-selected>star</span>`);
  await page.addStyleTag({ content: await acmeSystemCss() });
  const drawn = (selector: string) => page.locator(selector).evaluate((el) => getComputedStyle(el).fontFamily.replaceAll('"', ''));
  expect(await drawn('#inside')).toBe('Material Icons');
  expect(await drawn('#outside')).toBe('Material Symbols Rounded');
});

test('m3-like is drawn in ITS faces when they are registered: Material Symbols Outlined glyphs and Roboto text, not fallbacks', async ({ page }) => {
  // The registration our own sites use (packages/tools/src/font-faces.js), from development-only packages.
  const faces = await presetFontFaces(['Roboto', 'Material Symbols Outlined']);
  await mount(
    page,
    `<style>${faces}</style><div class="row"><span id="icon" class="tanrei-icon" aria-hidden="true">favorite</span><span id="on" class="tanrei-icon" data-selected aria-hidden="true">favorite</span><tanrei-button id="b">Label</tanrei-button></div>`,
    { id: 'm3-like', css: read('dist/systems/m3-like.css') },
  );
  await page.waitForFunction(() => !!customElements.get('tanrei-button'));
  await page.evaluate(() => document.fonts.ready);
  expect(await page.locator('#icon').evaluate((el) => getComputedStyle(el).fontFamily.replaceAll('"', ''))).toBe('Material Symbols Outlined');
  // A face is fetched only when a glyph is drawn with it: both families were used, and nothing failed.
  const loaded = await page.evaluate(() => [...document.fonts].filter((face) => face.status === 'loaded').map((face) => face.family.replaceAll('"', '')));
  expect(loaded).toEqual(expect.arrayContaining(['Roboto', 'Material Symbols Outlined']));
  expect(await page.evaluate(() => [...document.fonts].filter((face) => face.status === 'error').length)).toBe(0);
  // The ligature became ONE glyph the size of the box; as fallback text "favorite" is several times wider.
  const glyph = (id: string) => page.locator(id).evaluate((el) => { const range = document.createRange(); range.selectNodeContents(el); return range.getBoundingClientRect().width; });
  expect(await glyph('#icon')).toBeCloseTo((await page.locator('#icon').boundingBox())!.width, 0);
  // Selected is the same family, filled (a variable set): the two drawings differ.
  const [off, on] = await Promise.all(['#icon', '#on'].map((id) => page.locator(id).screenshot()));
  expect(off.equals(on)).toBe(false);
});

// ── What a page of fixtures draws before it is measured or pictured ─────────────────────────────────────────────
test('a page of fixtures that draws a glyph has the icon face drawing it when it is mounted, whether it asked for the faces or not: its ink is one em, not the name spelled out', async ({ page }) => {
  // A Button's baselines were recorded from a page mounted without the faces: on the Linux recorder, which has no icon
  // font, each glyph was its name in a serif fallback, clipped by its 1 em box (`ad` for `add`, `fav` for `favorite`).
  const button = loadSpec('button');
  const ids = ['filled-leading-icon', 'filled-icon', 'filled-trailing-icon-large', 'outlined-link-new'];
  await mountFixtures(page, button, { fixtures: button.fixtures.filter((f) => ids.includes(f.id)) });
  const loaded = await page.evaluate(() => [...document.fonts].filter((face) => face.status === 'loaded').map((face) => face.family.replaceAll('"', '')));
  expect(loaded, 'the icon face is registered by the page and loaded, not a copy installed on the machine').toContain('Material Symbols Rounded');
  for (const id of ids.filter((id) => id !== 'outlined-link-new')) {
    const [ink, size] = await page.locator(`[data-fixture="${id}"] [slot="icon"]`).evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return [range.getBoundingClientRect().width, parseFloat(getComputedStyle(el).fontSize)];
    });
    expect(ink, `${id}: one glyph, ${ink} wide at ${size}`).toBeLessThanOrEqual(size + 1);
  }
  // The new-context mark the link draws in its shadow tree is a glyph too.
  expect(await page.evaluate(glyphsSpelled, ['Material Symbols Rounded'])).toEqual([]);
});

test('a glyph drawn as its name is found — without a face the page registered, or spelled in one — and a mount waiting for it fails, naming it', async ({ page }) => {
  await page.setContent(`<!doctype html><html><body><span style="font-family: 'Material Symbols Rounded'; font-size: 24px">add</span></body></html>`);
  const bare = await page.evaluate(glyphsSpelled, ['Material Symbols Rounded']);
  expect(bare).toHaveLength(1);
  expect(bare[0]).toContain('"add" in Material Symbols Rounded, which the page has no loaded face of');
  await expect(glyphsDrawn(page, ['Material Symbols Rounded'])).rejects.toThrow(/glyphs drawn as their names[\s\S]*"add"/);
  // With the face: a name the set has is one glyph; a name it does not have is spelled out, wider than 1.5 em.
  await mount(page, `<span class="tanrei-icon">favorite</span><span class="tanrei-icon">no_such_glyph_here</span>`);
  await page.evaluate(() => document.fonts.load('24px "Material Symbols Rounded"', 'favorite'));
  const spelled = await page.evaluate(glyphsSpelled, ['Material Symbols Rounded']);
  expect(spelled).toHaveLength(1);
  expect(spelled[0]).toContain('"no_such_glyph_here"');
});
