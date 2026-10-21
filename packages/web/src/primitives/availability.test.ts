// A system's stylesheet names what it leaves out in `--tanrei-unavailable`, and an element it names reports
// it once in a debug build — and still renders (AVL-1). The parsing is checked alone; the elements read it from the
// cascade: from the shipped sheets, and from the property (and the proposed system id and replacements) set by hand.
// What the system uses instead is named (AVL-2), a use is reported under the element the product wrote — a text
// field, for the text input it draws — and every use is recorded for `unavailableUses()`, reported as an error in the
// error mode (AVL-3).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';
import { setAvailabilityMode, unavailableUses } from '../../test/harness.js';
import { outsideMessage, parseOutside, parseReplacements, parseUnavailable, unavailableEntry, unavailableMessage, useOf } from './availability.js';
import { debugBuild } from './report.js';

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file: string) => fs.readFileSync(path.join(web, file), 'utf8');

/** Captures what the page reports in debug builds about availability, at `level`. Call before mounting. */
function warnings(page: Page, level: 'warning' | 'error' = 'warning') {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === level && message.text().includes('(availability)')) seen.push(message.text());
  });
  return seen;
}

/** The value of a list property in a sheet's first block: its space-separated entries. */
const declared = (sheet: string, name: string) => (new RegExp(`${name}: "([^"]*)";`).exec(sheet)?.[1] ?? '').split(' ').filter(Boolean);

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

  test('what lives in a layer the system does not extend is `<component>=<layer>`; the message names the layer and the way in', () => {
    expect([...parseOutside('"fab-menu=m3-like other=x =y z="')]).toEqual([
      ['fab-menu', 'm3-like'],
      ['other', 'x'],
    ]);
    expect([...parseOutside('""')]).toEqual([]);
    expect(outsideMessage('fab-menu', 'm3-like', 'tanrei')).toBe(
      'fab-menu lives in the layer "m3-like", which the design system "tanrei" does not extend: its stylesheet has none of the component\'s tokens. Use a system that extends "m3-like", or include the component from it in a layer of your own',
    );
  });

  test('a component that lives in another layer names what the system uses instead, when it names one (AVL-2)', () => {
    expect(outsideMessage('fab-menu', 'm3-like', 'tanrei', ['main-action-button'])).toBe(
      'fab-menu lives in the layer "m3-like", which the design system "tanrei" does not extend: its stylesheet has none of the component\'s tokens. The system uses main-action-button instead; or use a system that extends "m3-like", or include the component from it in a layer of your own',
    );
  });

  test('a use is named by what the product wrote: a variant a composed component has as well is its own; anything else is what it draws', () => {
    expect(useOf('text-input:outlined', { component: 'text-field', variant: 'outlined' }, 'text-input')).toEqual({ use: 'text-field:outlined', drawn: false });
    expect(useOf('text-input:outlined', { component: 'text-input', variant: 'outlined' }, 'text-input')).toEqual({ use: 'text-input:outlined', drawn: false });
    expect(useOf('segmented-button', { component: 'toolbar' }, 'segmented-button')).toEqual({ use: 'segmented-button', drawn: true });
    expect(useOf('text-input:outlined', { component: 'chat-composer' }, 'text-input')).toEqual({ use: 'text-input:outlined', drawn: true });
    expect(unavailableMessage('text-field:outlined', 'tanrei')).toBe('variant "outlined" of text-field is left out of the design system "tanrei"; it still works');
    expect(unavailableMessage('segmented-button', null, ['tabs'], 'toolbar')).toBe('toolbar draws segmented-button, which is left out of the active design system; it still works, but the system uses tabs instead');
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
    await mount(page, `<div style='--tanrei-unavailable: ""'><tanrei-segmented-button label="View"><tanrei-segment value="a" label="A"></tanrei-segment><tanrei-segment value="b" label="B"></tanrei-segment></tanrei-segmented-button></div>`);
    await page.waitForTimeout(100);
    expect(seen).toEqual([]);
  });

  test('a component used under a system that does not descend from the layer it lives in says so; under that layer’s systems it does not', async ({ page }) => {
    // The default system and cupertino do not extend m3-like, where the FAB menu lives: read from their sheets.
    const outside = (file: string) => parseOutside(/--tanrei-unavailable-layer: ("[^"]*");/.exec(read(file))?.[1] ?? '');
    expect(outside('dist/tokens.css').get('fab-menu')).toBe('m3-like');
    expect(outside('dist/systems/cupertino.css').get('fab-menu')).toBe('m3-like');
    expect(outside('dist/systems/m3-like.css').size).toBe(0);
    const seen = warnings(page);
    await mount(page, `<tanrei-fab-menu label="Create"></tanrei-fab-menu>`);
    await expect.poll(() => seen.length).toBe(1);
    expect(seen[0]).toContain('[tanrei] <tanrei-fab-menu>: fab-menu lives in the layer "m3-like", which the active design system does not extend');
    seen.length = 0;
    for (const system of ['m3-like']) {
      await mount(page, `<tanrei-fab-menu label="Create"></tanrei-fab-menu>`, { system });
      await page.waitForFunction(() => !!customElements.get('tanrei-fab-menu'));
      // A report that does not come has no event to wait for: the read runs in a microtask after the host's first
      // update, well inside this wait, as the other tests here that see nothing reported wait for it.
      await page.waitForTimeout(100);
      expect(seen, system).toEqual([]);
    }
  });

  test('the shipped sheet names what the default system uses instead of what it leaves out, as its layer says (AVL-2)', async ({ page }) => {
    // The stand-ins are the default system's layer's `insteadUse`, carried by its manifest and its sheet: read from all three.
    const layer = JSON.parse(fs.readFileSync(path.join(web, '../../tokens/systems/tanrei.system.json'), 'utf8'));
    const insteadUse: string[] = layer.components.omit['segmented-button'].insteadUse;
    const manifest = JSON.parse(read('dist/systems/tanrei.components.json'));
    expect(manifest.omitted.find((entry: { name: string }) => entry.name === 'segmented-button').insteadUse).toEqual(insteadUse);
    expect(parseReplacements(declared(read('dist/tokens.css'), '--tanrei-unavailable-replacement').join(' ')).get('segmented-button')).toEqual(insteadUse);
    const seen = warnings(page);
    await mount(page, `<tanrei-segmented-button label="View"><tanrei-segment value="a" label="A"></tanrei-segment><tanrei-segment value="b" label="B"></tanrei-segment></tanrei-segmented-button>`);
    await expect.poll(() => seen.length).toBe(1);
    expect(seen[0]).toContain(`<tanrei-segmented-button>: segmented-button is left out of the active design system; it still works, but the system uses ${insteadUse.join(' or ')} instead (availability)`);
    // A preset that leaves out nothing whole declares an empty list of its own, so it names no stand-in it does not have.
    expect(declared(read('dist/systems/m3-like.css'), '--tanrei-unavailable-replacement')).toEqual([]);
  });

  test('a use inside a composed component is reported under the component the product wrote, by its name (AVL-1)', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, `<tanrei-text-field label="Name" variant="outlined"></tanrei-text-field>`);
    await expect.poll(() => unavailableUses(page)).toEqual(['text-field:outlined']);
    await expect.poll(() => seen.length).toBe(1);
    expect(seen[0]).toContain('[tanrei] <tanrei-text-field>: variant "outlined" of text-field is left out of the active design system; it still works (availability)');
    expect(seen.join('\n')).not.toContain('<tanrei-text-input>');
    // A text input the product wrote itself is its own: reported and recorded by its own name.
    await page.evaluate(() => document.body.append(Object.assign(document.createElement('tanrei-text-input'), { label: 'Alone', variant: 'filled' })));
    await expect.poll(() => unavailableUses(page)).toEqual(['text-field:outlined', 'text-input:filled']);
    await expect.poll(() => seen.length).toBe(2);
    expect(seen[1]).toContain('<tanrei-text-input>: variant "filled" of text-input is left out of the active design system');
  });

  test('in the error mode a use is reported as an error; in either mode it is recorded, once, in alphabetical order (AVL-3)', async ({ page }) => {
    const errors = warnings(page, 'error');
    const seen = warnings(page);
    await mount(page, '');
    expect(await unavailableUses(page)).toEqual([]);
    await setAvailabilityMode(page, 'error');
    const segmented = (label: string) => `<tanrei-segmented-button label="${label}"><tanrei-segment value="a" label="A"></tanrei-segment><tanrei-segment value="b" label="B"></tanrei-segment></tanrei-segmented-button>`;
    await page.evaluate((html) => document.body.insertAdjacentHTML('beforeend', html), `<tanrei-text-field label="Name" variant="outlined"></tanrei-text-field>${segmented('View')}${segmented('Again')}`);
    await expect.poll(() => errors.length).toBe(3);
    expect(errors.filter((message) => message.includes('<tanrei-segmented-button>: segmented-button is left out'))).toHaveLength(2);
    expect(seen).toEqual([]);
    expect(await unavailableUses(page)).toEqual(['segmented-button', 'text-field:outlined']);
    // Back in the warning mode, a new use is a warning, and recorded beside the others.
    await setAvailabilityMode(page, 'warn');
    await page.evaluate(() => document.body.append(Object.assign(document.createElement('tanrei-fab-menu'), { label: 'Create' })));
    await expect.poll(() => seen.length).toBe(1);
    expect(seen[0]).toContain('<tanrei-fab-menu>: fab-menu lives in the layer "m3-like"');
    expect(await unavailableUses(page)).toEqual(['fab-menu', 'segmented-button', 'text-field:outlined']);
    expect(errors).toHaveLength(3);
  });

  test('a mode that is not one is refused, and the mode stays', async ({ page }) => {
    const messages: string[] = [];
    page.on('console', (message) => messages.push(message.text()));
    await mount(page, '');
    await setAvailabilityMode(page, 'loud');
    await expect.poll(() => messages.find((text) => text.includes('setAvailabilityMode()'))).toBe('[tanrei] setAvailabilityMode(): "loud" is not a mode (warn, error); the mode stays "warn"');
  });

  test('a component that lives in another layer names the stand-ins the layer that holds it names (AVL-2)', async ({ page }) => {
    // m3-like, which holds the FAB menu, says what a system without it uses; the default system's manifest and sheet carry it.
    const layer = JSON.parse(fs.readFileSync(path.join(web, '../../tokens/systems/m3-like.system.json'), 'utf8'));
    const [, fabMenu] = Object.entries<{ outside: { insteadUse: string[] } }>(layer.vocabulary).find(([key]) => key.endsWith('.comp.fab-menu'))!;
    const insteadUse = fabMenu.outside.insteadUse;
    const manifest = JSON.parse(read('dist/systems/tanrei.components.json'));
    expect(manifest.omitted.find((entry: { name: string }) => entry.name === 'fab-menu').insteadUse).toEqual(insteadUse);
    expect(parseReplacements(declared(read('dist/tokens.css'), '--tanrei-unavailable-replacement').join(' ')).get('fab-menu')).toEqual(insteadUse);
    const seen = warnings(page);
    await mount(page, `<tanrei-fab-menu label="Create"></tanrei-fab-menu>`);
    await expect.poll(() => seen.length).toBe(1);
    expect(seen[0]).toContain(`<tanrei-fab-menu>: fab-menu lives in the layer "m3-like", which the active design system does not extend: its stylesheet has none of the component's tokens. The system uses ${insteadUse.join(' or ')} instead;`);
    expect(await unavailableUses(page)).toEqual(['fab-menu']);
  });
});
