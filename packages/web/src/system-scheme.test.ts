// A system's scope inherits the colour scheme around it. The page declares the scheme once, on the root (both themes,
// following the operating system), and `data-tanrei-theme` forces one on any subtree; a scope (`data-tanrei-system`)
// declares none of its own, so a preset placed under a forced theme draws in that theme — not in the operating
// system's, which is what it drew while each preset's sheet declared `color-scheme: light dark` on its scope.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');
/** The shipped presets: each one's opt-in sheet (`dist/systems/<id>.css`; the other files there are per-component). */
const SYSTEMS = fs
  .readdirSync(path.join(pkg, 'dist/systems'))
  .filter((file) => /^[a-z0-9-]+\.css$/.test(file))
  .map((file) => file.slice(0, -'.css'.length));

/**
 * The page: the default system's tokens and every preset's sheet, the theme forced on <html> (or not), and in the body
 * each preset's scope with a probe painted with the surface token. Beside each, a reference: the same scope that forces
 * the theme itself, which is what the scope must draw.
 */
async function mount(page: Page, forced: 'light' | 'dark' | null) {
  await page.setContent(`<!doctype html><html lang="en"${forced ? ` data-tanrei-theme="${forced}"` : ''}><head>
<style>${read('dist/tokens.css')}</style>${SYSTEMS.map((id) => `<style>${read(`dist/systems/${id}.css`)}</style>`).join('')}
<style>.probe { background: var(--tanrei-sys-color-surface); block-size: 8px }</style></head><body>
${SYSTEMS.map((id) => `<section data-tanrei-system="${id}" data-scope="${id}"><div class="probe"></div></section>
<section data-tanrei-system="${id}" data-tanrei-theme="light" data-reference="${id}-light"><div class="probe"></div></section>
<section data-tanrei-system="${id}" data-tanrei-theme="dark" data-reference="${id}-dark"><div class="probe"></div></section>`).join('\n')}
</body></html>`);
}

const drawn = (page: Page, selector: string) =>
  page.locator(selector).evaluate((scope) => ({ scheme: getComputedStyle(scope).colorScheme, surface: getComputedStyle(scope.querySelector('.probe')!).backgroundColor }));

test('there are presets to place', () => {
  expect(SYSTEMS.length).toBeGreaterThan(0);
});

for (const os of ['light', 'dark'] as const) {
  for (const forced of ['light', 'dark'] as const) {
    test(`a preset's scope under a page forced ${forced} draws ${forced}, with the system in ${os}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: os });
      await mount(page, forced);
      for (const id of SYSTEMS) {
        const scope = await drawn(page, `[data-scope="${id}"]`);
        const reference = await drawn(page, `[data-reference="${id}-${forced}"]`);
        const other = await drawn(page, `[data-reference="${id}-${forced === 'light' ? 'dark' : 'light'}"]`);
        expect(scope.scheme, id).toBe(forced);
        expect(scope.surface, id).toBe(reference.surface);
        // The two themes differ, so the comparison above tells them apart.
        expect(other.surface, id).not.toBe(reference.surface);
      }
    });
  }

  test(`with nothing forced, a preset's scope follows the system (${os})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: os });
    await mount(page, null);
    for (const id of SYSTEMS) {
      const scope = await drawn(page, `[data-scope="${id}"]`);
      const reference = await drawn(page, `[data-reference="${id}-${os}"]`);
      expect(scope.scheme, id).toBe('light dark');
      expect(scope.surface, id).toBe(reference.surface);
    }
  });
}

test("a preset's scope that forces a theme itself keeps it under a page forced to the other", async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await mount(page, 'dark');
  for (const id of SYSTEMS) expect((await drawn(page, `[data-reference="${id}-light"]`)).scheme, id).toBe('light');
});
