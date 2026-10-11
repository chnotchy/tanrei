// A system's stylesheet names what it leaves out in `--tanrei-unavailable`, and an element it names reports
// it once in a debug build — and still renders. The parsing is checked alone; the elements read it from the cascade:
// from the shipped sheets, and from the property (and the proposed system id and replacements) set by hand.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';
import { parseReplacements, parseUnavailable, unavailableEntry, unavailableMessage } from './availability.js';
import { debugBuild } from './report.js';

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file: string) => fs.readFileSync(path.join(web, file), 'utf8');

/** Captures what the page reports in debug builds about availability. Call before mounting. */
function warnings(page: Page) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning' && message.text().includes('(availability)')) seen.push(message.text());
  });
  return seen;
}

async function mount(page: Page, body: string, { system }: { system?: string } = {}) {
  await page.setContent(`<!doctype html>
<html lang="en"${system ? ` data-tanrei-system="${system}"` : ''}><head>
  <style>${read('dist/tokens.css')}</style>
  ${system ? `<style>${read(`dist/systems/${system}.css`)}</style>` : ''}
</head><body>${body}<script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`);
  await page.waitForFunction(() => !!customElements.get('tanrei-navigation-bar'));
}

test.describe('parsing', () => {
  test('the list is the string’s space-separated entries, quoted or not; an undeclared property is an empty list', () => {
    expect([...parseUnavailable(' "segmented-button fab-menu"')]).toEqual(['segmented-button', 'fab-menu']);
    expect([...parseUnavailable("'navigation-bar:filled'")]).toEqual(['navigation-bar:filled']);
    expect([...parseUnavailable('""')]).toEqual([]);
    expect([...parseUnavailable('')]).toEqual([]);
  });

  test('a component whole is found before its variant; another component’s variant is not this one’s', () => {
    const list = parseUnavailable('"fab-menu navigation-bar:filled"');
    expect(unavailableEntry(list, 'fab-menu', 'filled')).toBe('fab-menu');
    expect(unavailableEntry(list, 'navigation-bar', 'filled')).toBe('navigation-bar:filled');
    expect(unavailableEntry(list, 'navigation-bar', 'tonal')).toBeNull();
    expect(unavailableEntry(list, 'navigation-bar')).toBeNull();
    expect(unavailableEntry(list, 'navigation-drawer', 'filled')).toBeNull();
  });

  test('replacements are `<entry>=<replacement>,…`; a pair without either side is ignored', () => {
    const replacements = parseReplacements('"segmented-button=tabs,button-group navigation-bar:filled=navigation-bar:tonal =x y="');
    expect([...replacements]).toEqual([
      ['segmented-button', ['tabs', 'button-group']],
      ['navigation-bar:filled', ['navigation-bar:tonal']],
    ]);
  });

  test('the message names the component or variant, the system, and the replacement when there is one', () => {
    expect(unavailableMessage('fab-menu', 'tanrei')).toBe('fab-menu is left out of the design system "tanrei"; it still works');
    expect(unavailableMessage('navigation-bar:filled', null, ['navigation-bar:tonal'])).toBe(
      'variant "filled" of navigation-bar is left out of the active design system; it still works, but the system uses variant "tonal" of navigation-bar instead',
    );
    expect(unavailableMessage('segmented-button', 'tanrei', ['tabs', 'button-group'])).toMatch(/uses tabs or button-group instead$/);
  });

  test('nothing is reported in a production build', () => {
    const env = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      expect(debugBuild()).toBe(false);
      process.env.NODE_ENV = 'development';
      expect(debugBuild()).toBe(true);
    } finally {
      process.env.NODE_ENV = env;
    }
  });
});

test.describe('elements', () => {
  test('under the default system, a component it leaves out reports once and still renders; one it ships does not', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, `<tanrei-segmented-button label="View"><tanrei-segment value="a" label="A"></tanrei-segment><tanrei-segment value="b" label="B"></tanrei-segment></tanrei-segmented-button>
      <tanrei-button>Save</tanrei-button>`);
    await expect.poll(() => seen.length).toBe(1);
    expect(seen[0]).toContain('[tanrei] <tanrei-segmented-button>: segmented-button is left out of the active design system; it still works');
    await expect(page.locator('tanrei-segment').first()).toBeVisible();
    // Moved within the page, it is the same element: it does not report again.
    await page.evaluate(() => document.body.append(document.querySelector('tanrei-segmented-button')!));
    await page.waitForTimeout(100);
    expect(seen).toHaveLength(1);
  });

  test('a preset replaces the default’s list: its variant is reported, naming the system from data-tanrei-system', async ({ page }) => {
    const seen = warnings(page);
    // A component the default system leaves out and the preset ships — read from the two sheets, not named here: which
    // components a system leaves out is its own to say, and a preset's list has grown before (cupertino came to leave
    // the FAB menu out as well, which this test once mounted as the one it ships).
    const list = (file: string) => [...parseUnavailable(/--tanrei-unavailable: ("[^"]*");/.exec(read(file))?.[1] ?? '')];
    const [defaults, preset] = [list('dist/tokens.css'), list('dist/systems/cupertino.css')];
    expect(preset).toContain('navigation-bar:filled');
    const shipped = defaults.find((entry) => !entry.includes(':') && !preset.includes(entry));
    expect(shipped, 'the default system leaves out a component cupertino ships').toBeDefined();
    await mount(page, `<tanrei-navigation-bar id="filled" variant="filled"></tanrei-navigation-bar><tanrei-navigation-bar id="tonal"></tanrei-navigation-bar>
      <tanrei-${shipped} label="Shipped here"></tanrei-${shipped}>`, { system: 'cupertino' });
    await page.waitForFunction((tag) => !!customElements.get(tag), `tanrei-${shipped}`);
    await expect.poll(() => seen.length).toBe(1);
    expect(seen[0]).toContain('<tanrei-navigation-bar>: variant "filled" of navigation-bar is left out of the design system "cupertino"; it still works');
    // Neither the tonal bar nor the component the default's list names is reported: the preset's list is the whole list.
    await page.waitForTimeout(100);
    expect(seen).toHaveLength(1);
    // What the preset itself leaves out whole is reported under it, as under any system.
    for (const entry of preset.filter((each) => !each.includes(':'))) {
      await page.evaluate((tag) => document.body.append(Object.assign(document.createElement(tag), { label: 'Left out here' })), `tanrei-${entry}`);
      await expect.poll(() => seen.filter((message) => message.includes(`<tanrei-${entry}>: ${entry} is left out of the design system "cupertino"`)).length, entry).toBe(1);
    }
  });

  test('the property set by hand: the system’s own id and its replacements are named, and a variant is checked when it changes', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, `<div style='--tanrei-unavailable: "button navigation-bar:filled"; --tanrei-system: "acme"; --tanrei-unavailable-replacement: "button=extended-fab,fab navigation-bar:filled=navigation-bar:tonal"'>
      <tanrei-button>Save</tanrei-button>
      <tanrei-navigation-bar></tanrei-navigation-bar>
    </div>`, { system: 'cupertino' });
    await expect.poll(() => seen.length).toBe(1);
    expect(seen[0]).toContain('<tanrei-button>: button is left out of the design system "acme"; it still works, but the system uses extended-fab or fab instead (availability)');
    const bar = page.locator('tanrei-navigation-bar');
    await bar.evaluate((el) => el.setAttribute('variant', 'filled'));
    await expect.poll(() => seen.length).toBe(2);
    expect(seen[1]).toContain('<tanrei-navigation-bar>: variant "filled" of navigation-bar is left out of the design system "acme"; it still works, but the system uses variant "tonal" of navigation-bar instead');
    // Once per element: back and forth does not report it again.
    await bar.evaluate((el) => el.setAttribute('variant', 'tonal'));
    await bar.evaluate((el) => el.setAttribute('variant', 'filled'));
    await page.waitForTimeout(100);
    expect(seen).toHaveLength(2);
  });

  test('an empty list ships everything', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, `<div style='--tanrei-unavailable: ""'><tanrei-fab-menu label="Create"></tanrei-fab-menu></div>`);
    await page.waitForTimeout(100);
    expect(seen).toEqual([]);
  });
});
