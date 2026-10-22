// The page's base (`@tanrei/web/base.css`) and the one file (`@tanrei/web/tanrei.css`): a page that loads them draws
// its own text in the system's color, on its surface, in its body face, with no margin around the body — and a theme
// forced on `<html>`, and any rule of the product's own, still win.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';
import { resolveColor } from '../../test/harness.js';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file: string) => fs.readFileSync(path.join(pkg, 'dist', file), 'utf8');

/** A page of the product's own text: a heading and a paragraph, under the stylesheets given and the product's own rules. */
async function mount(page: Page, sheets: string[], { theme, own = '' }: { theme?: 'light' | 'dark'; own?: string } = {}) {
  await page.setContent(`<!doctype html>
<html lang="en"${theme ? ` data-tanrei-theme="${theme}"` : ''}>
  <head>${sheets.map((sheet) => `<style>${read(sheet)}</style>`).join('')}${own ? `<style>${own}</style>` : ''}</head>
  <body><h2 class="tanrei-text-heading-2">Orders</h2><p>Your product's own text.</p></body>
</html>`);
}

/** What the page draws: the root's background, the body's color and margin, and the paragraph's face and size. */
const drawn = (page: Page) =>
  page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    const p = getComputedStyle(document.querySelector('p')!);
    const first = (family: string) => family.split(',')[0].trim().replace(/^["']|["']$/g, '');
    return { background: root.backgroundColor, color: body.color, margin: body.margin, family: first(p.fontFamily), size: p.fontSize, lineHeight: p.lineHeight, pColor: p.color, rootSize: root.fontSize };
  });

/** What the tokens say the page should draw. */
const expected = (page: Page) =>
  page.evaluate(() => {
    const probe = document.createElement('span');
    probe.style.cssText = 'font: var(--tanrei-sys-typescale-body-font)';
    document.body.append(probe);
    const style = getComputedStyle(probe);
    const result = { family: style.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, ''), size: style.fontSize, lineHeight: style.lineHeight };
    probe.remove();
    return result;
  });

// The base after the tokens, before them, and the one file.
for (const sheets of [['tokens.css', 'base.css'], ['base.css', 'tokens.css'], ['tanrei.css']]) {
  test.describe(sheets.join(' + '), () => {
    test('the page is the surface, the product’s text is on-surface in the body face, and the body has no margin', async ({ page }) => {
      await mount(page, sheets);
      const was = await drawn(page);
      expect(was.background).toBe(await resolveColor(page, '--tanrei-sys-color-surface'));
      expect(was.color).toBe(await resolveColor(page, '--tanrei-sys-color-on-surface'));
      expect(was.pColor).toBe(was.color);
      expect(was.margin).toBe('0px');
      const body = await expected(page);
      expect(was.family).toBe(body.family);
      expect(was.family).not.toMatch(/times/i);
      expect(was.size).toBe(body.size);
      expect(was.lineHeight).toBe(body.lineHeight);
    });

    test('the root keeps the browser’s font size: rem, which the system’s sizes are written in, means what it meant without the base', async ({ page }) => {
      await mount(page, []);
      const before = await drawn(page);
      await mount(page, sheets);
      expect((await drawn(page)).rootSize).toBe(before.rootSize);
    });

    test('a theme forced on <html> wins over the base: the page is the dark surface', async ({ page }) => {
      await mount(page, sheets, { theme: 'light' });
      const light = await drawn(page);
      await mount(page, sheets, { theme: 'dark' });
      const dark = await drawn(page);
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('dark');
      expect(dark.background).toBe(await resolveColor(page, '--tanrei-sys-color-surface'));
      expect(dark.background).not.toBe(light.background);
      expect(dark.color).not.toBe(light.color);
    });

    test('a rule of the product’s own wins over the base: it is in a cascade layer', async ({ page }) => {
      await mount(page, sheets, { own: 'html { background: rgb(1, 2, 3); color: rgb(4, 5, 6); } body { margin: 7px; font: 20px serif; }' });
      const was = await drawn(page);
      expect(was).toMatchObject({ background: 'rgb(1, 2, 3)', color: 'rgb(4, 5, 6)', margin: '7px', size: '20px' });
    });
  });
}

test('tanrei.css also draws the light-DOM stylesheets: a heading with the text class is set in its role', async ({ page }) => {
  await mount(page, ['tanrei.css']);
  const [size, role] = await page.evaluate(() => {
    const probe = document.createElement('span');
    probe.style.cssText = 'font: var(--tanrei-sys-typescale-heading-2-font)';
    document.body.append(probe);
    return [getComputedStyle(document.querySelector('h2')!).fontSize, getComputedStyle(probe).fontSize];
  });
  expect(size).toBe(role);
});

test('without the base the browser’s own defaults stand: the body keeps its margin (the base is what changes it)', async ({ page }) => {
  await mount(page, ['tokens.css']);
  expect((await drawn(page)).margin).not.toBe('0px');
});
