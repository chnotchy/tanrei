// `@tanrei/web/theme-script`: a stored choice of theme is drawn from the FIRST frame — sampled in the first animation
// frame callback, which runs before the page is first painted — and `saveTheme()` / `loadTheme()` store, draw and
// read it. Without the inline script the first frame is the system's theme: the flash the script removes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';
import { themeColorMeta, themeScript } from './theme-script.js';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = (file: string) => fs.readFileSync(path.join(pkg, 'dist', file), 'utf8');
const ORIGIN = 'http://tanrei.test';

interface Frame { attribute: string | null; scheme: string; background: string }
type Window = { tanreiFirstFrame?: Frame; tanreiTheme: { saveTheme: (theme: string) => void; loadTheme: () => string } };

/**
 * A product's page at a real origin (storage needs one): in its head the inline script (or not), the tokens, a rule
 * that paints the page with the surface token, and a probe that records what the first frame draws.
 */
async function serve(page: Page, { inline, meta = '' }: { inline: boolean; meta?: string }) {
  await page.route(`${ORIGIN}/**`, (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/theme-script.js') return route.fulfill({ contentType: 'text/javascript', body: dist('theme-script.js') });
    return route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><html lang="en"><head>${meta}${inline ? `<script>${themeScript()}</script>` : ''}
<script>requestAnimationFrame(() => { const s = getComputedStyle(document.documentElement); window.tanreiFirstFrame = { attribute: document.documentElement.getAttribute('data-tanrei-theme'), scheme: s.colorScheme, background: s.backgroundColor }; });</script>
<style>${dist('tokens.css')}</style><style>html { background: var(--tanrei-sys-color-surface) }</style>
<script type="module">import * as api from '/theme-script.js'; window.tanreiTheme = api;</script></head><body></body></html>`,
    });
  });
}
const open = async (page: Page) => {
  await page.goto(`${ORIGIN}/`);
  await page.waitForFunction(() => !!(window as unknown as Window).tanreiFirstFrame && !!(window as unknown as Window).tanreiTheme);
  return page.evaluate(() => (window as unknown as Window).tanreiFirstFrame!);
};
/** The surface of a theme, as the tokens draw it. */
const surface = (page: Page, theme: 'light' | 'dark') =>
  page.evaluate((t) => {
    const probe = document.createElement('div');
    probe.setAttribute('data-tanrei-theme', t);
    probe.style.background = 'var(--tanrei-sys-color-surface)';
    document.body.append(probe);
    const value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value;
  }, theme);

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
});

test('the stored theme is drawn from the first frame: the inline script puts it on <html> before anything is painted', async ({ page }) => {
  await serve(page, { inline: true });
  await open(page);
  await page.evaluate(() => (window as unknown as Window).tanreiTheme.saveTheme('dark'));
  const first = await open(page);
  expect(first.attribute).toBe('dark');
  expect(first.scheme).toBe('dark');
  expect(first.background).toBe(await surface(page, 'dark'));
  expect(await page.evaluate(() => (window as unknown as Window).tanreiTheme.loadTheme())).toBe('dark');
});

test('without the inline script, the first frame is the system’s theme although a theme is stored: the flash it prevents', async ({ page }) => {
  await serve(page, { inline: false });
  await open(page);
  await page.evaluate(() => (window as unknown as Window).tanreiTheme.saveTheme('dark'));
  const first = await open(page);
  expect(first.attribute).toBe(null);
  expect(first.background).toBe(await surface(page, 'light'));
});

test('saveTheme() draws the choice at once; system takes the stored choice and the attribute away, and the page follows the system again', async ({ page }) => {
  await serve(page, { inline: true });
  await open(page);
  const attribute = () => page.evaluate(() => document.documentElement.getAttribute('data-tanrei-theme'));
  await page.evaluate(() => (window as unknown as Window).tanreiTheme.saveTheme('light'));
  expect(await attribute()).toBe('light');
  await page.evaluate(() => (window as unknown as Window).tanreiTheme.saveTheme('system'));
  expect(await attribute()).toBe(null);
  expect(await page.evaluate(() => (window as unknown as Window).tanreiTheme.loadTheme())).toBe('system');
  await page.emulateMedia({ colorScheme: 'dark' });
  const first = await open(page);
  expect(first.attribute).toBe(null);
  expect(first.background).toBe(await surface(page, 'dark'));
});

test('a stored value that is not a theme is no choice: nothing is set, and loadTheme() says system', async ({ page }) => {
  await serve(page, { inline: true });
  await open(page);
  await page.evaluate(() => localStorage.setItem('tanrei-theme', 'sepia'));
  const first = await open(page);
  expect(first.attribute).toBe(null);
  expect(await page.evaluate(() => (window as unknown as Window).tanreiTheme.loadTheme())).toBe('system');
});

/** The theme color the browser takes: the content of the first theme-color tag whose media query matches. */
const themeColor = (page: Page) =>
  page.evaluate(() => [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')].find((meta) => matchMedia(meta.media || 'all').matches)?.content ?? null);
const hex = (rgb: string) => `#${rgb.match(/\d+/g)!.slice(0, 3).map((c) => Number(c).toString(16).padStart(2, '0')).join('')}`;

test('the theme-color tags follow the system, a stored theme from the first frame, and saveTheme(); each is the surface', async ({ page }) => {
  const colors = JSON.parse(dist('systems/tanrei.theme-color.json')) as Record<string, string>;
  await serve(page, { inline: true, meta: themeColorMeta(colors) });
  await open(page);
  expect(await themeColor(page)).toBe(colors.light);
  expect(hex(await surface(page, 'light'))).toBe(colors.light);
  await page.emulateMedia({ colorScheme: 'dark' });
  expect(await themeColor(page)).toBe(colors.dark);
  expect(hex(await surface(page, 'dark'))).toBe(colors.dark);
  await page.emulateMedia({ colorScheme: 'dark', contrast: 'more' });
  expect(await themeColor(page)).toBe(colors['dark-high']);
  expect(hex(await surface(page, 'dark'))).toBe(colors['dark-high']);
  await page.emulateMedia({ colorScheme: 'light', contrast: 'no-preference' });
  // A stored theme: its color, whatever the system asks for — drawn by saveTheme(), and by the inline script on the next visit.
  await page.evaluate(() => (window as unknown as Window).tanreiTheme.saveTheme('dark'));
  expect(await themeColor(page)).toBe(colors.dark);
  await open(page);
  expect(await themeColor(page)).toBe(colors.dark);
  await page.emulateMedia({ colorScheme: 'light', contrast: 'more' });
  expect(await themeColor(page)).toBe(colors['dark-high']);
  // Back to the system: the tags as they were written.
  await page.evaluate(() => (window as unknown as Window).tanreiTheme.saveTheme('system'));
  expect(await themeColor(page)).toBe(colors['light-high']);
});
