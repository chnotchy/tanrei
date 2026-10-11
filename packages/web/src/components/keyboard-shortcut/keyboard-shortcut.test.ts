// <tanrei-keyboard-shortcut>, driven by specs/keyboard-shortcut.spec.json: every behaviour id (KBS-1…18) is cited by a
// test title, every fixture has a baseline, and every length and color is read back from the tokens — never from a
// number written here. The legends each convention writes are the spec's own (KBS-3, KBS-4); what is read aloud is the
// product's label, or the notation of aria-keyshortcuts — the shortcut has no names for keys (KBS-11).
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, mountFixtures, resolveColor, resolveToken, setWords, tab, rootTokens } from '../../../test/harness.js';
import { type Rgb, offLine, shoot } from '../../../test/one-shape.js';
import { paintedColor } from '../../../test/png.js';

const spec = loadSpec('keyboard-shortcut');
type P = Page;
const TAG = 'tanrei-keyboard-shortcut';
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] ${TAG}`);
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const caps = (page: P, id: string) => host(page, id).locator('.key');
const labels = (page: P, id: string) => host(page, id).locator('.label');
const separators = (page: P, id: string) => host(page, id).locator('.separator');
const chords = (page: P, id: string) => host(page, id).locator('.chord');
const T = (name: string) => `--tanrei-comp-keyboard-shortcut-${name}`;
const box = async (locator: Locator) => (await locator.boundingBox())!;
const css = (locator: Locator, property: string) => locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
const fx = (id: string, props: Fixture['props']): Fixture => ({ id, props });
/** What is drawn: every legend and separator in order, as one string (⇧⌘K, Ctrl+Shift+K), the chords a space apart. */
const written = (page: P, id: string) =>
  host(page, id).evaluate((el) =>
    [...el.shadowRoot!.querySelectorAll('.chord')].map((chord) => [...chord.querySelectorAll('.label, .separator')].map((n) => n.textContent).join('')).join(' '),
  );
/** The text read in place of the keys. */
const spoken = (page: P, id: string) => host(page, id).evaluate((el) => el.shadowRoot!.querySelector('.spoken')?.textContent ?? null);
/** KBS-12's form, as the element gives it. */
const aria = (page: P, id: string) => host(page, id).evaluate((el) => (el as HTMLElement & { ariaKeyShortcuts: string | null }).ariaKeyShortcuts);

/** Every named key (KBS-1), how each convention writes it (KBS-3, KBS-4), and its name in the notation of `aria-keyshortcuts` (KBS-12). */
const NAMED: [name: string, apple: string, standard: string, notation: string][] = [
  ['enter', '↩', 'Enter', 'Enter'],
  ['escape', '⎋', 'Esc', 'Escape'],
  ['tab', '⇥', 'Tab', 'Tab'],
  ['backspace', '⌫', 'Backspace', 'Backspace'],
  ['delete', '⌦', 'Delete', 'Delete'],
  ['space', 'Space', 'Space', 'Space'],
  ['arrow-up', '↑', '↑', 'ArrowUp'],
  ['arrow-down', '↓', '↓', 'ArrowDown'],
  ['arrow-left', '←', '←', 'ArrowLeft'],
  ['arrow-right', '→', '→', 'ArrowRight'],
  ['home', '↖', 'Home', 'Home'],
  ['end', '↘', 'End', 'End'],
  ['page-up', '⇞', 'PgUp', 'PageUp'],
  ['page-down', '⇟', 'PgDn', 'PageDown'],
  ['caps-lock', '⇪', 'Caps Lock', 'CapsLock'],
  ['f1', 'F1', 'F1', 'F1'],
  ['f12', 'F12', 'F12', 'F12'],
  ['f24', 'F24', 'F24', 'F24'],
  ['plus', '+', '+', 'Plus'],
];
/** Characters that are keys as they are: the shortcut has no names for them (KBS-11). */
const PUNCTUATION = [',', '.', '/', '\\', ';', "'", '[', ']', '-', '=', '`'];
const id = (name: string, convention: string) => `${convention}-${name.replace(/[^a-z0-9]/gi, (c) => c.charCodeAt(0).toString(16))}`;

/**
 * The platform the page reports, for `auto` without an ancestor (KBS-2): `navigator.platform`, with no userAgentData. An
 * init script runs from the next navigation on, not in the page's first empty document, which `setContent` writes into.
 */
async function pretendPlatform(page: P, platform: string) {
  await page.addInitScript((name) => {
    Object.defineProperty(Navigator.prototype, 'platform', { get: () => name, configurable: true });
    Object.defineProperty(Navigator.prototype, 'userAgentData', { get: () => undefined, configurable: true });
  }, platform);
  await page.goto('about:blank');
}

test.describe('behavior', () => {
  test('KBS-1: keys are chords pressed in order, each the names of one string joined by +, without case; the named keys and any other single character', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [
        fx('case', { keys: ['MOD+Shift+k'], convention: 'standard' }),
        fx('sequence', { keys: ['mod+k', 'mod+c'], convention: 'standard' }),
        fx('char', { keys: ['alt+ä'], convention: 'standard' }),
        ...NAMED.map(([name]) => fx(id(name, 'standard'), { keys: [`ctrl+${name.toUpperCase()}`], convention: 'standard' })),
      ],
    });
    expect(await written(page, 'case')).toBe('Ctrl+Shift+K');
    // One chord per string, in order.
    expect(await written(page, 'sequence')).toBe('Ctrl+K Ctrl+C');
    await expect(chords(page, 'sequence')).toHaveCount(2);
    // Any other single character is that character's key.
    expect(await written(page, 'char')).toBe('Alt+Ä');
    for (const [name, , standard] of NAMED) expect(await written(page, id(name, 'standard')), name).toBe(`Ctrl+${standard}`);
    // The attribute holds the chords separated by spaces; the property is an array.
    const [attribute, property] = await host(page, 'sequence').evaluate((el) => [el.getAttribute('keys'), (el as HTMLElement & { keys: string[] }).keys]);
    expect(attribute).toBe('mod+k mod+c');
    expect(property).toEqual(['mod+k', 'mod+c']);
  });

  test('KBS-2: auto takes the nearest ancestor’s convention, across shadow roots and as it changes; without one, the platform’s — never the design system’s', async ({ page }) => {
    await pretendPlatform(page, 'Win32');
    await mountFixtures(page, spec, { system: 'cupertino', fixtures: [fx('auto', { keys: ['mod+k'] }), fx('pinned', { keys: ['mod+k'], convention: 'apple' })] });
    // Windows reports itself: standard, whatever system is mounted (cupertino here).
    expect(await written(page, 'auto')).toBe('Ctrl+K');
    expect(await written(page, 'pinned')).toBe('⌘K');
    // The nearest ancestor that sets the attribute: set on the stage, then on <html>, then nearer again.
    await stage(page, 'auto').evaluate((el) => el.setAttribute('data-tanrei-keyboard-convention', 'apple'));
    await expect.poll(() => written(page, 'auto')).toBe('⌘K');
    await page.evaluate(() => document.documentElement.setAttribute('data-tanrei-keyboard-convention', 'standard'));
    await expect.poll(() => written(page, 'auto')).toBe('⌘K');
    await stage(page, 'auto').evaluate((el) => el.setAttribute('data-tanrei-keyboard-convention', 'nonsense'));
    await expect.poll(() => written(page, 'auto')).toBe('Ctrl+K');
    await stage(page, 'auto').evaluate((el) => el.removeAttribute('data-tanrei-keyboard-convention'));
    // A pinned convention is not the ancestor's.
    expect(await written(page, 'pinned')).toBe('⌘K');
    // Across a shadow root: the attribute on a shadow host outside, the shortcut inside its shadow tree.
    await page.evaluate(() => {
      const outer = document.createElement('div');
      outer.id = 'outer';
      outer.setAttribute('data-tanrei-keyboard-convention', 'apple');
      const inner = document.createElement('div');
      outer.appendChild(inner);
      inner.attachShadow({ mode: 'open' }).innerHTML = '<tanrei-keyboard-shortcut keys="mod+k"></tanrei-keyboard-shortcut>';
      document.body.appendChild(outer);
    });
    const inside = page.locator('#outer tanrei-keyboard-shortcut');
    const insideWritten = () => inside.evaluate((el) => [...el.shadowRoot!.querySelectorAll('.label, .separator')].map((n) => n.textContent).join(''));
    await expect.poll(insideWritten).toBe('⌘K');
    await page.evaluate(() => document.getElementById('outer')!.setAttribute('data-tanrei-keyboard-convention', 'standard'));
    await expect.poll(insideWritten).toBe('Ctrl+K');
  });

  test('KBS-2: without an ancestor, apple where the platform is macOS, iOS or iPadOS, standard elsewhere', async ({ browser }) => {
    for (const [platform, expected] of [['MacIntel', '⌘K'], ['iPhone', '⌘K'], ['iPad', '⌘K'], ['Linux x86_64', 'Ctrl+K'], ['Win32', 'Ctrl+K']] as const) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await pretendPlatform(page, platform);
      await mountFixtures(page, spec, { fixtures: [fx('auto', { keys: ['mod+k'] })] });
      expect(await written(page, 'auto'), platform).toBe(expected);
      await context.close();
    }
  });

  test('KBS-3: under apple, ⌃ ⌥ ⇧ ⌘ in that order whatever order keys gives, then the key, no separator; the named keys’ symbols', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [
        ...spec.fixtures,
        fx('all', { keys: ['k+mod+shift+alt+ctrl'], convention: 'apple' }),
        ...NAMED.map(([name]) => fx(id(name, 'apple'), { keys: [name], convention: 'apple' })),
      ],
    });
    expect(await written(page, 'all')).toBe('⌃⌥⇧⌘K');
    await expect(separators(page, 'all')).toHaveCount(0);
    expect(await written(page, 'keycap-apple')).toBe('⇧⌘K');
    expect(await written(page, 'reordered-apple')).toBe('⌥⌘⎋');
    for (const [name, apple] of NAMED) expect(await written(page, id(name, 'apple')), name).toBe(apple);
  });

  test('KBS-4: under standard, Ctrl, Alt, Shift in that order whatever order keys gives, then the key, each joined by +; the named keys’ names', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [
        ...spec.fixtures,
        fx('all', { keys: ['k+shift+alt+mod'], convention: 'standard' }),
        fx('ctrl', { keys: ['shift+ctrl+k'], convention: 'standard' }),
        ...NAMED.map(([name]) => fx(id(name, 'standard'), { keys: [name], convention: 'standard' })),
      ],
    });
    expect(await written(page, 'all')).toBe('Ctrl+Alt+Shift+K');
    expect(await written(page, 'ctrl')).toBe('Ctrl+Shift+K');
    expect(await written(page, 'keycap-standard')).toBe('Ctrl+Shift+K');
    expect(await written(page, 'named-keys-standard')).toBe('Ctrl+Alt+Delete');
    expect(await written(page, 'single-key')).toBe('F2');
    // The + key beside the + separator.
    expect(await written(page, 'plus-key-standard')).toBe('Ctrl++');
    await expect(separators(page, 'plus-key-standard')).toHaveCount(1);
    await expect(labels(page, 'plus-key-standard')).toHaveText(['Ctrl', '+']);
    for (const [name, , standard] of NAMED) expect(await written(page, id(name, 'standard')), name).toBe(standard);
  });

  test('KBS-5: a letter is its capital in both conventions, any other character as given, and a capital adds no shift', async ({ page }) => {
    const cases: [string[], string, string, string][] = [
      [['mod+k'], 'apple', '⌘K', 'k'],
      [['mod+K'], 'apple', '⌘K', 'K'],
      [['mod+shift+k'], 'apple', '⇧⌘K', 'shift'],
      [['mod+K'], 'standard', 'Ctrl+K', 'standard-K'],
      [['mod+/'], 'standard', 'Ctrl+/', 'slash'],
      [['alt+1'], 'apple', '⌥1', 'digit'],
    ];
    await mountFixtures(page, spec, { fixtures: cases.map(([keys, convention, , name]) => fx(name, { keys, convention })) });
    for (const [, , expected, name] of cases) expect(await written(page, name), name).toBe(expected);
  });

  test('KBS-6: keycap — each key in its own cap, at least its size’s height and as wide as tall, padded, shaped, filled and edged by its tokens; legends in its size’s role and color; the chord gap, and the separator between gaps', async ({ page }) => {
    await mountFixtures(page, spec);
    for (const [fixture, size] of [['keycap-apple', 'medium'], ['keycap-standard', 'medium'], ['small-apple', 'small'], ['small-standard', 'small']] as const) {
      const [height, pad, shape, gap, fontSize] = await Promise.all([
        resolveToken(page, T(`container-height-${size}`)),
        resolveToken(page, T(`container-padding-inline-${size}`)),
        resolveToken(page, T(`container-shape-${size}`)),
        resolveToken(page, T(`chord-gap-${size}`)),
        resolveToken(page, T(`label-typescale-${size}-font-size`)),
      ]);
      const [outline, bottom] = [await resolveToken(page, T('outline-width')), await resolveToken(page, T('outline-bottom-width'))];
      const count = await caps(page, fixture).count();
      expect(count, fixture).toBe(fixture.startsWith('small') ? 2 : 3);
      const boxes: { x: number; y: number; width: number; height: number }[] = [];
      for (let i = 0; i < count; i++) {
        const cap = caps(page, fixture).nth(i);
        const b = await box(cap);
        boxes.push(b);
        expect(b.height, `${fixture} ${i}`).toBeCloseTo(height, 1);
        expect(b.width, `${fixture} ${i}`).toBeGreaterThanOrEqual(b.height - 0.01);
        expect(await css(cap, 'padding-inline-start'), fixture).toBe(`${pad}px`);
        expect(await css(cap, 'padding-inline-end'), fixture).toBe(`${pad}px`);
        expect(await css(cap, 'background-color'), fixture).toBe(await resolveColor(page, T('container-color')));
        expect(await css(cap, 'border-top-color'), fixture).toBe(await resolveColor(page, T('outline-color')));
        expect(await css(cap, 'border-bottom-color'), fixture).toBe(await resolveColor(page, T('outline-color')));
        expect(Number.parseFloat(await css(cap, 'border-top-width')), fixture).toBeCloseTo(outline, 1);
        expect(Number.parseFloat(await css(cap, 'border-left-width')), fixture).toBeCloseTo(outline, 1);
        expect(Number.parseFloat(await css(cap, 'border-right-width')), fixture).toBeCloseTo(outline, 1);
        expect(Number.parseFloat(await css(cap, 'border-bottom-width')), fixture).toBeCloseTo(bottom, 1);
        expect(await css(cap, 'box-sizing'), fixture).toBe('border-box');
        // The default system does not smooth corners, so the radius is the token's.
        expect(Number.parseFloat(await css(cap, 'border-top-left-radius')), fixture).toBeCloseTo(shape, 2);
        const label = labels(page, fixture).nth(i);
        expect(await css(label, 'font-size'), fixture).toBe(`${fontSize}px`);
        expect(await css(label, 'color'), fixture).toBe(await resolveColor(page, T('keycap-label-color')));
        // The legend is centered.
        const l = await box(label);
        expect(l.x + l.width / 2, fixture).toBeCloseTo(b.x + b.width / 2, 0);
      }
      if (fixture.endsWith('apple')) {
        // No separator: the caps are the chord gap apart.
        await expect(separators(page, fixture)).toHaveCount(0);
        for (let i = 1; i < boxes.length; i++) expect(boxes[i].x - (boxes[i - 1].x + boxes[i - 1].width), fixture).toBeCloseTo(gap, 1);
      } else {
        // The + in the legend's style and color, the chord gap on each side.
        await expect(separators(page, fixture)).toHaveCount(count - 1);
        for (let i = 1; i < boxes.length; i++) {
          const sep = separators(page, fixture).nth(i - 1);
          const s = await box(sep);
          expect(s.x - (boxes[i - 1].x + boxes[i - 1].width), fixture).toBeCloseTo(gap, 1);
          expect(boxes[i].x - (s.x + s.width), fixture).toBeCloseTo(gap, 1);
          expect(await css(sep, 'font-size'), fixture).toBe(`${fontSize}px`);
          expect(await css(sep, 'color'), fixture).toBe(await resolveColor(page, T('keycap-label-color')));
        }
      }
    }
    // A long legend widens its cap (Delete), a single letter sits on a square key.
    const del = await box(caps(page, 'named-keys-standard').nth(2));
    expect(del.width).toBeGreaterThan(del.height);
    const k = await box(caps(page, 'keycap-apple').nth(2));
    expect(k.width).toBeCloseTo(k.height, 1);
  });

  test('KBS-6: a width of 0 draws no edge — under the default system a cap is its fill alone: no border on any side (no least width), and no pixel of it differs from container.color except its legend’s; under a layer that gives the edge 1 and 2 the cap keeps its height and the edge is drawn inside its box', async ({ page }) => {
    const KEYCAPS = ['keycap-apple', 'keycap-standard', 'small-apple', 'small-standard'];
    // These four alone, so that all of them are in the viewport the pixels are read from.
    await mountFixtures(page, spec, { fixtures: spec.fixtures.filter((f) => KEYCAPS.includes(f.id)) });
    expect([await resolveToken(page, T('outline-width')), await resolveToken(page, T('outline-bottom-width'))]).toEqual([0, 0]);
    const sizes: Record<string, { width: number; height: number }[]> = {};
    for (const id of KEYCAPS) {
      sizes[id] = [];
      for (const cap of await caps(page, id).all()) {
        for (const side of ['top', 'right', 'bottom', 'left']) expect(await css(cap, `border-${side}-width`), `${id} ${side}`).toBe('0px');
        expect(await css(cap, 'box-shadow'), id).toBe('none');
        expect(await css(cap, 'outline-style'), id).toBe('none');
        const b = await box(cap);
        sizes[id].push({ width: b.width, height: b.height });
      }
    }
    // Read the pixels, the legends taken away: every pixel of a cap is the fill, or — where its round corner crosses a
    // pixel — a share of the fill and the surface behind it. An edge would be a third color, darker than the fill.
    await override(page, { [T('keycap-label-color')]: 'transparent' });
    const rgb = (c: string) => c.match(/\d+/g)!.slice(0, 3).map(Number) as Rgb;
    const [fill, surface, edge] = [rgb(await paintedColor(page, `var(${T('container-color')})`)), rgb(await paintedColor(page, 'var(--tanrei-sys-color-surface)')), rgb(await paintedColor(page, `var(${T('outline-color')})`, `var(${T('container-color')})`))];
    expect(offLine(edge, fill, surface), 'an edge in outline.color would be seen').toBeGreaterThan(8);
    const shot = await shoot(page);
    let read = 0;
    for (const id of KEYCAPS) {
      for (const cap of await caps(page, id).all()) {
        const b = await shot.box(cap);
        expect(b.y + b.height, `${id}: in the viewport`).toBeLessThanOrEqual(shot.pixels.height);
        let worst = { off: 0, at: '' };
        for (let y = Math.floor(b.y); y < Math.ceil(b.y + b.height); y++) {
          for (let x = Math.floor(b.x); x < Math.ceil(b.x + b.width); x++) {
            read++;
            const off = offLine(shot.rgb(x, y), fill, surface);
            if (off > worst.off) worst = { off, at: `${shot.rgb(x, y)} at ${x},${y}` };
          }
        }
        expect(worst.off, `${id}: ${worst.at}`).toBeLessThanOrEqual(3);
        // …and it is the fill: its middle row, from side to side.
        const mid = Math.floor(b.y + b.height / 2);
        let middle = 0;
        for (let x = Math.ceil(b.x) + 1; x < Math.floor(b.x + b.width) - 1; x++) middle = Math.max(middle, offLine(shot.rgb(x, mid), fill, fill));
        expect(middle, `${id}: the fill along the middle row`).toBeLessThanOrEqual(3);
      }
    }
    expect(read).toBeGreaterThan(0);
    // A layer whose keys have an edge, flat or deep: it is the border of a border-box, inside the cap's size — a cap is
    // as tall as it was (its least height holds the edge), and no wider than it was but by the edge beside its legend's
    // padding, which is still container.padding-inline on each side, as it was when the default system had an edge.
    await override(page, { [T('outline-width')]: '1px', [T('outline-bottom-width')]: '2px', [T('keycap-label-color')]: '' });
    for (const id of KEYCAPS) {
      const all = await caps(page, id).all();
      for (const [i, cap] of all.entries()) {
        expect(await Promise.all(['top', 'right', 'bottom', 'left'].map((side) => css(cap, `border-${side}-width`))), id).toEqual(['1px', '1px', '2px', '1px']);
        expect(await css(cap, 'box-sizing'), id).toBe('border-box');
        const b = await box(cap);
        expect(b.height, `${id} cap ${i}`).toBe(sizes[id][i].height);
        expect(b.width, `${id} cap ${i}`).toBeGreaterThanOrEqual(sizes[id][i].width);
        expect(b.width, `${id} cap ${i}`).toBeLessThanOrEqual(sizes[id][i].width + 2);
      }
    }
  });

  test('KBS-6: a size or variant the design system does not have is drawn as the default and reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [fx('odd', { keys: ['mod+k'], convention: 'apple', size: 'huge', variant: 'embossed' }), fx('medium', { keys: ['mod+k'], convention: 'apple' })] });
    const [odd, medium] = [await box(caps(page, 'odd').first()), await box(caps(page, 'medium').first())];
    expect(odd.height).toBeCloseTo(medium.height, 1);
    expect(await css(labels(page, 'odd').first(), 'color')).toBe(await resolveColor(page, T('keycap-label-color')));
    await expect.poll(() => seen.join('\n')).toMatch(/size "huge" is not a value of the active design system; it is drawn as "medium"/);
    await expect.poll(() => seen.join('\n')).toMatch(/variant "embossed" is not a value of the active design system; it is drawn as "keycap"/);
  });

  test('KBS-7: plain — each chord one run of text in its size’s role and the plain color, Apple’s symbols with no separator and the standard names joined by + without spaces; no cap, fill or edge', async ({ page }) => {
    await mountFixtures(page, spec);
    expect(await written(page, 'plain-apple')).toBe('⇧⌘K');
    expect(await written(page, 'plain-standard')).toBe('Ctrl+Shift+K');
    const fontSize = await resolveToken(page, T('label-typescale-medium-font-size'));
    for (const fixture of ['plain-apple', 'plain-standard']) {
      const parts = host(page, fixture).locator('.label, .separator');
      const count = await parts.count();
      let right: number | null = null;
      for (let i = 0; i < count; i++) {
        const part = parts.nth(i);
        expect(await css(part, 'color'), fixture).toBe(await resolveColor(page, T('plain-label-color')));
        expect(await css(part, 'font-size'), fixture).toBe(`${fontSize}px`);
        // One run: each piece starts where the last ended.
        const b = await box(part);
        if (right !== null) expect(b.x, `${fixture} ${i}`).toBeCloseTo(right, 0);
        right = b.x + b.width;
      }
      for (let i = 0; i < (await caps(page, fixture).count()); i++) {
        const cap = caps(page, fixture).nth(i);
        expect(await css(cap, 'background-color'), fixture).toBe('rgba(0, 0, 0, 0)');
        for (const side of ['top', 'right', 'bottom', 'left']) expect(await css(cap, `border-${side}-width`), fixture).toBe('0px');
        expect(await css(cap, 'padding-inline-start'), fixture).toBe('0px');
      }
    }
  });

  test('KBS-8: a sequence draws its chords in order, its size’s sequence gap apart, in both forms, and nothing between them', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...spec.fixtures, fx('small-sequence', { keys: ['mod+k', 'mod+c'], size: 'small', convention: 'apple' })] });
    for (const [fixture, size] of [['sequence-standard', 'medium'], ['sequence-plain-apple', 'medium'], ['small-sequence', 'small']] as const) {
      const gap = await resolveToken(page, T(`sequence-gap-${size}`));
      await expect(chords(page, fixture), fixture).toHaveCount(2);
      const [first, second] = [await box(chords(page, fixture).nth(0)), await box(chords(page, fixture).nth(1))];
      expect(second.x - (first.x + first.width), fixture).toBeCloseTo(gap, 1);
      // Nothing else between the chords: the sequence holds only them.
      const children = await host(page, fixture).evaluate((el) => [...el.shadowRoot!.querySelector('.sequence')!.childNodes].filter((n) => n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.textContent!.trim())).map((n) => (n as Element).localName ?? '#text'));
      expect(children, fixture).toEqual(['kbd', 'kbd']);
    }
    expect(await written(page, 'sequence-standard')).toBe('Ctrl+K Ctrl+C');
    expect(await written(page, 'sequence-plain-apple')).toBe('⌘K ⌘C');
  });

  test('KBS-9: disabled draws the legends and separators from the disabled tokens of its variant, keeps the caps at rest, and exposes no disabled state', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...spec.fixtures, fx('disabled-keycap-standard', { keys: ['mod+shift+k'], convention: 'standard', disabled: true })] });
    for (const [fixture, variant] of [['disabled-keycap', 'keycap'], ['disabled-plain', 'plain'], ['disabled-keycap-standard', 'keycap']] as const) {
      const parts = host(page, fixture).locator('.label, .separator');
      for (let i = 0; i < (await parts.count()); i++) expect(await css(parts.nth(i), 'color'), fixture).toBe(await resolveColor(page, T(`${variant}-disabled-label-color`)));
      await expect(host(page, fixture)).not.toHaveAttribute('aria-disabled');
      expect(await spoken(page, fixture), fixture).not.toBe('');
    }
    // The caps are the enabled ones'.
    for (const [disabled, enabled] of [['disabled-keycap', 'keycap-apple']]) {
      for (const property of ['background-color', 'border-top-color', 'border-top-width', 'border-bottom-width']) {
        expect(await css(caps(page, disabled).first(), property), property).toBe(await css(caps(page, enabled).first(), property));
      }
      expect(await box(caps(page, disabled).first())).toEqual(expect.objectContaining({ height: (await box(caps(page, enabled).first())).height }));
    }
  });

  test('KBS-10: the drawn keys are hidden and one text is read in their place, where the shortcut sits: label, the shortcut in the product’s own words — and without it the text KBS-11 gives; the symbols themselves are never exposed', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [...spec.fixtures, fx('labelled', { keys: ['mod+shift+k'], convention: 'apple', label: 'Befehl Umschalt K' }), fx('unlabelled', { keys: ['mod+shift+k'], convention: 'apple' })],
    });
    await expect(host(page, 'keycap-apple').locator('.sequence')).toHaveAttribute('aria-hidden', 'true');
    // The fixtures give their words: what is read is what each says.
    await expect(stage(page, 'keycap-apple')).toMatchAriaSnapshot('- text: Shift Command K');
    await expect(stage(page, 'sequence-standard')).toMatchAriaSnapshot('- text: Control K, then Control C');
    await expect(stage(page, 'labelled')).toMatchAriaSnapshot('- text: Befehl Umschalt K');
    // Without a label: the notation, never a name of a key.
    await expect(stage(page, 'unlabelled')).toMatchAriaSnapshot('- text: Meta+Shift+K');
    // Read where the shortcut sits: inside a button it is part of the button's name.
    await page.evaluate(() => {
      const button = document.createElement('button');
      button.id = 'save';
      button.innerHTML = 'Save <tanrei-keyboard-shortcut keys="mod+s" convention="apple" label="Command S"></tanrei-keyboard-shortcut>';
      document.body.appendChild(button);
    });
    await expect(page.locator('#save')).toHaveAccessibleName('Save Command S');
    // Symbols are never read: the hidden text is the only text in the accessibility tree.
    const text = await stage(page, 'reordered-apple').ariaSnapshot();
    expect(text).toBe('- text: Option Command Escape');
    expect(await stage(page, 'unlabelled').ariaSnapshot()).toBe('- text: Meta+Shift+K');
  });

  test('KBS-11: without a label the shortcut has no names for keys in any language — it exposes the notation of aria-keyshortcuts, the same under both conventions’ legends, for modifiers, named keys, letters, digits and punctuation, a sequence’s chords a space apart — and reports once; with a label it exposes that and reports nothing; the product’s words hold no name of a key', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [
        { ...spec.fixtures.find((f) => f.id === 'keycap-apple')!, id: 'keycap-apple-unlabelled', props: { keys: ['mod+shift+k'], convention: 'apple' } },
        spec.fixtures.find((f) => f.id === 'keycap-apple')!,
        fx('mods-apple', { keys: ['ctrl+alt+shift+mod+k'], convention: 'apple' }),
        fx('mods-standard', { keys: ['alt+shift+mod+k'], convention: 'standard' }),
        fx('digit', { keys: ['mod+1'], convention: 'standard' }),
        fx('sequence', { keys: ['mod+k', 'mod+c'], convention: 'standard' }),
        ...NAMED.flatMap(([name]) => [fx(id(name, 'apple'), { keys: [name], convention: 'apple' }), fx(id(name, 'standard'), { keys: [name], convention: 'standard' })]),
        ...PUNCTUATION.map((char) => fx(id(char, 'p'), { keys: [`shift+${char}`], convention: 'standard' })),
      ],
    });
    // keycap-apple without its label: "Meta+Shift+K", and one report; with the label "Shift Command K", and none.
    expect(await spoken(page, 'keycap-apple-unlabelled')).toBe('Meta+Shift+K');
    expect(await spoken(page, 'keycap-apple')).toBe('Shift Command K');
    // One report for each shortcut that has no words; none for the one that has.
    await expect.poll(() => seen.filter((w) => w.includes('KBS-11')).length).toBe(5 + NAMED.length * 2 + PUNCTUATION.length);
    expect(seen.find((w) => w.includes('KBS-11'))).toContain('label is empty');
    // The notation is the text, whatever the legends: what KBS-12 gives.
    expect(await spoken(page, 'mods-apple')).toBe('Meta+Control+Alt+Shift+K');
    expect(await spoken(page, 'mods-standard')).toBe('Control+Alt+Shift+K');
    expect(await spoken(page, 'digit')).toBe('Control+1');
    expect(await spoken(page, 'sequence')).toBe('Control+K Control+C');
    for (const [name, , , notation] of NAMED) {
      expect(await spoken(page, id(name, 'apple')), `${name} apple`).toBe(notation);
      expect(await spoken(page, id(name, 'standard')), `${name} standard`).toBe(notation);
      expect(await spoken(page, id(name, 'apple')), `${name}: what aria-keyshortcuts takes`).toBe(await aria(page, id(name, 'apple')));
    }
    // A character is its own key: no name is made for it.
    for (const char of PUNCTUATION) expect(await spoken(page, id(char, 'p')), char).toBe(`Shift+${char}`);
    // No name of a key, in any language, is exposed by the unlabelled ones.
    const said = await page.evaluate(() => [...document.querySelectorAll('tanrei-keyboard-shortcut:not([label])')].map((el) => el.shadowRoot!.querySelector('.spoken')?.textContent ?? '').join(' | '));
    expect(said).not.toMatch(/Command|Option|Return|Arrow |Page |Comma|Slash|Bracket|then/);
    // A reported shortcut is reported once, however often it is drawn again.
    const before = seen.filter((w) => w.includes('KBS-11')).length;
    await host(page, 'digit').evaluate(async (el) => {
      (el as HTMLElement & { size: string }).size = 'small';
      await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    });
    expect(seen.filter((w) => w.includes('KBS-11'))).toHaveLength(before);
    // The product's words hold no key names: setting them changes nothing here; `label` is the instance's (open question 6).
    await setWords(page, { closeLabel: 'Close' });
    expect(await spoken(page, 'keycap-apple-unlabelled')).toBe('Meta+Shift+K');
  });

  test('KBS-12: the host’s form is aria-keyshortcuts’ — modifiers then key joined by +, mod as Meta or Control, chords separated by spaces — and the shortcut sets none itself', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [
        ...spec.fixtures,
        fx('named', { keys: ['shift+arrow-up', 'alt+page-down', 'ctrl+space', 'enter', 'escape', 'caps-lock', 'f5'], convention: 'apple' }),
        fx('all-apple', { keys: ['shift+alt+ctrl+mod+k'], convention: 'apple' }),
        fx('empty', { keys: [], convention: 'apple' }),
      ],
    });
    expect(await aria(page, 'keycap-apple')).toBe('Meta+Shift+K');
    expect(await aria(page, 'keycap-standard')).toBe('Control+Shift+K');
    expect(await aria(page, 'sequence-standard')).toBe('Control+K Control+C');
    expect(await aria(page, 'sequence-plain-apple')).toBe('Meta+K Meta+C');
    expect(await aria(page, 'named-keys-standard')).toBe('Control+Alt+Delete');
    expect(await aria(page, 'plus-key-standard')).toBe('Control+Plus');
    expect(await aria(page, 'single-key')).toBe('F2');
    expect(await aria(page, 'all-apple')).toBe('Meta+Control+Alt+Shift+K');
    expect(await aria(page, 'named')).toBe('Shift+ArrowUp Alt+PageDown Control+Space Enter Escape CapsLock F5');
    expect(await aria(page, 'empty')).toBeNull();
    for (const f of spec.fixtures) await expect(host(page, f.id), f.id).not.toHaveAttribute('aria-keyshortcuts');
    // Read-only.
    const assigned = await host(page, 'keycap-apple').evaluate((el) => {
      try {
        (el as HTMLElement & { ariaKeyShortcuts: string | null }).ariaKeyShortcuts = 'Alt+X';
      } catch {
        // Strict mode: a getter without a setter throws.
      }
      return [(el as HTMLElement & { ariaKeyShortcuts: string | null }).ariaKeyShortcuts, el.getAttribute('aria-keyshortcuts')];
    });
    expect(assigned).toEqual(['Meta+Shift+K', null]);
  });

  test('KBS-13: hosted in a component’s part, the legends and separators take that part’s text style and color, the caps keep their own, and nothing is exposed', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fx('hosted', { keys: ['mod+shift+k'], convention: 'standard', size: 'small' })] });
    await host(page, 'hosted').evaluate(async (el) => {
      const shortcut = el as HTMLElement & { hosted: boolean; updateComplete: Promise<boolean> };
      shortcut.style.font = '500 17px/24px Inter';
      shortcut.style.letterSpacing = '0.5px';
      shortcut.style.color = 'rgb(200, 10, 20)';
      shortcut.hosted = true;
      await shortcut.updateComplete;
    });
    for (const part of await host(page, 'hosted').locator('.label, .separator').all()) {
      expect(await css(part, 'font-size')).toBe('17px');
      expect(await css(part, 'letter-spacing')).toBe('0.5px');
      expect(await css(part, 'color')).toBe('rgb(200, 10, 20)');
    }
    // Its own caps: fill, edge and at least the small height.
    const cap = caps(page, 'hosted').first();
    expect(await css(cap, 'background-color')).toBe(await resolveColor(page, T('container-color')));
    expect((await box(cap)).height).toBeGreaterThanOrEqual(await resolveToken(page, T('container-height-small')));
    // Nothing exposed: the host is hidden and reads nothing.
    await expect(host(page, 'hosted')).toHaveAttribute('aria-hidden', 'true');
    expect(await spoken(page, 'hosted')).toBeNull();
    expect(await stage(page, 'hosted').ariaSnapshot()).toBe('');
  });

  test('KBS-14: takes no focus and no input of its own, and does not listen for the keys it shows', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fx('keys', { keys: ['mod+k'], convention: 'apple' })] });
    await page.evaluate(() => {
      const before = document.createElement('button');
      before.id = 'before';
      before.textContent = 'Before';
      const after = document.createElement('button');
      after.id = 'after';
      after.textContent = 'After';
      const stage = document.querySelector('[data-fixture="keys"]')!;
      stage.prepend(before);
      stage.append(after);
      (window as any).seen = [];
      document.addEventListener('keydown', (e) => (window as any).seen.push(e.defaultPrevented), { capture: false });
    });
    await page.locator('#before').focus();
    await tab(page);
    await expect(page.locator('#after')).toBeFocused();
    expect(await host(page, 'keys').evaluate((el) => [el.tabIndex, el.shadowRoot!.querySelectorAll('[tabindex], button, input, a').length, el.shadowRoot!.delegatesFocus])).toEqual([-1, 0, false]);
    // The keys it shows do nothing: the event reaches the page untouched.
    await page.keyboard.press('Meta+K');
    const seen = await page.evaluate(() => (window as any).seen as boolean[]);
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((prevented) => !prevented)).toBe(true);
    // A press on it reaches what it sits in.
    await page.evaluate(() => {
      const button = document.createElement('button');
      button.id = 'wrap';
      button.innerHTML = 'Open <tanrei-keyboard-shortcut keys="mod+o" convention="apple"></tanrei-keyboard-shortcut>';
      button.addEventListener('click', () => ((window as any).clicked = true));
      document.body.appendChild(button);
    });
    await page.locator('#wrap tanrei-keyboard-shortcut').click();
    expect(await page.evaluate(() => (window as any).clicked)).toBe(true);
  });

  test('KBS-15: inline with the text, its legends on the text’s baseline; never broken inside a chord, a sequence broken between chords; caps grow with enlarged text', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fx('inline', { keys: ['mod+shift+k'], convention: 'standard', size: 'small' }), fx('wrap', { keys: ['mod+k', 'mod+c', 'mod+shift+v'], convention: 'standard' })] });
    // A line of body text around the small shortcut: the legend's baseline is the text's.
    const [textBaseline, legendBaseline] = await page.evaluate(() => {
      const stage = document.querySelector('[data-fixture="inline"]')!;
      const shortcut = stage.querySelector('tanrei-keyboard-shortcut')!;
      const p = document.createElement('p');
      p.style.font = 'var(--tanrei-sys-typescale-body-font)';
      p.append('Press ', shortcut, ' to search');
      stage.append(p);
      const marker = () => Object.assign(document.createElement('span'), { style: 'display:inline-block;inline-size:0;block-size:0' });
      const inText = marker();
      p.append(inText);
      const inLegend = marker();
      shortcut.shadowRoot!.querySelector('.label')!.append(inLegend);
      return [inText.getBoundingClientRect().bottom, inLegend.getBoundingClientRect().bottom];
    });
    expect(legendBaseline).toBeCloseTo(textBaseline, 0);
    expect(await css(host(page, 'inline'), 'display')).toBe('inline-flex');
    // Too narrow for the sequence: it breaks between chords, each chord on one line.
    await host(page, 'wrap').evaluate((el) => ((el.parentElement as HTMLElement).style.inlineSize = '80px'));
    const rows: number[][] = [];
    for (let c = 0; c < 3; c++) {
      const keys = chords(page, 'wrap').nth(c).locator('.key');
      rows.push(await Promise.all((await keys.all()).map(async (k) => Math.round((await box(k)).y))));
    }
    for (const row of rows) expect(new Set(row).size).toBe(1);
    expect(rows[1][0]).toBeGreaterThan(rows[0][0]);
    expect(rows[2][0]).toBeGreaterThan(rows[1][0]);
    // Enlarged text: the caps grow with their legends; container height stays the minimum.
    const height = await resolveToken(page, T('container-height-small'));
    const before = await box(caps(page, 'inline').first());
    await override(page, { '--tanrei-dial-type-base': '32px' });
    await expect.poll(async () => (await box(caps(page, 'inline').first())).height).toBeGreaterThan(before.height);
    const after = await box(caps(page, 'inline').first());
    expect(after.height).toBeGreaterThanOrEqual(height);
    expect(after.width).toBeGreaterThan(before.width);
  });

  test('KBS-16: in right-to-left, the keys of a chord and the chords of a sequence stay left to right, isolated from the direction', async ({ page }) => {
    await mountFixtures(page, spec);
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    for (const fixture of ['keycap-standard', 'sequence-standard', 'plain-apple']) {
      expect(await css(host(page, fixture), 'direction'), fixture).toBe('ltr');
      expect(await css(host(page, fixture), 'unicode-bidi'), fixture).toBe('isolate');
      const parts = await host(page, fixture).locator('.label, .separator').all();
      const xs = await Promise.all(parts.map(async (p) => (await box(p)).x));
      expect(xs, fixture).toEqual([...xs].sort((a, b) => a - b));
    }
    expect(await written(page, 'sequence-standard')).toBe('Ctrl+K Ctrl+C');
  });

  test('KBS-17: a symbol the text style’s font lacks is drawn from the system’s fonts at the same size and baseline, never a missing-glyph box', async ({ page }) => {
    await mountFixtures(page, spec);
    // The legend's family list ends in a generic family, so the browser draws a glyph the brand face lacks from a system
    // face — per character, in the same font size, on the same baseline — and never falls back to a missing-glyph box
    // while a system face has it. The legends are text: no glyph is drawn by the component itself.
    for (const fixture of ['keycap-apple', 'reordered-apple', 'plain-apple']) {
      const families = (await css(labels(page, fixture).first(), 'font-family')).split(',').map((f) => f.trim());
      expect(['sans-serif', 'serif', 'system-ui', 'monospace'], fixture).toContain(families.at(-1));
    }
    // Every Apple symbol is drawn with ink: a glyph from some face, not an empty or zero-width box.
    const inked = await host(page, 'reordered-apple').evaluate((el) =>
      [...el.shadowRoot!.querySelectorAll('.label')].map((label) => {
        const range = document.createRange();
        range.selectNodeContents(label);
        return range.getBoundingClientRect().width > 0;
      }),
    );
    expect(inked).toEqual([true, true, true]);
  });

  test('KBS-18: empty keys draw and expose nothing; an empty chord, only modifiers, two keys, a repeated key or an unknown name draw what they can and are reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [
        fx('empty', { keys: [], convention: 'apple' }),
        fx('modifiers', { keys: ['mod+shift'], convention: 'standard' }),
        fx('two', { keys: ['mod+k+c'], convention: 'standard' }),
        fx('twice', { keys: ['ctrl+mod+k'], convention: 'standard' }),
        fx('shift-twice', { keys: ['shift+shift+k'], convention: 'apple' }),
        fx('unknown', { keys: ['mod+enterr'], convention: 'standard' }),
      ],
    });
    expect(await host(page, 'empty').evaluate((el) => el.shadowRoot!.childElementCount)).toBe(0);
    expect((await box(host(page, 'empty'))).width).toBe(0);
    expect(await stage(page, 'empty').ariaSnapshot()).toBe('');
    expect(await written(page, 'modifiers')).toBe('Ctrl+Shift');
    expect(await written(page, 'two')).toBe('Ctrl+K+C');
    expect(await written(page, 'twice')).toBe('Ctrl+K');
    expect(await written(page, 'shift-twice')).toBe('⇧K');
    expect(await written(page, 'unknown')).toBe('Ctrl+enterr');
    // An empty chord (only through the property: the attribute has no empty chords) is skipped.
    await host(page, 'modifiers').evaluate(async (el) => {
      const shortcut = el as HTMLElement & { keys: string[]; updateComplete: Promise<boolean> };
      shortcut.keys = ['', 'mod+k'];
      await shortcut.updateComplete;
    });
    expect(await written(page, 'modifiers')).toBe('Ctrl+K');
    expect(await spoken(page, 'modifiers')).toBe('Control+K');
    await expect
      .poll(() => seen.join('\n'))
      .toMatch(/the chord "mod\+shift": it holds only modifiers \(KBS-18\)/);
    const all = seen.join('\n');
    expect(all).toMatch(/the chord "mod\+k\+c": it holds more than one key other than modifiers \(KBS-18\)/);
    expect(all).toMatch(/the chord "ctrl\+mod\+k": it names a key twice once the convention has written it \(KBS-18\)/);
    expect(all).toMatch(/the chord "shift\+shift\+k": it names a key twice/);
    expect(all).toMatch(/the chord "mod\+enterr": the key "enterr" is not a key name; it is drawn as given \(KBS-18\)/);
    expect(all).toMatch(/the chord "": a chord is empty \(KBS-18\)/);
    // Valid keys report nothing.
    expect(all).not.toMatch(/"mod\+k"/);
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme });
      // A disabled shortcut is the shortcut of an unavailable command, and the command exposes that (KBS-9): it is staged
      // in the disabled control it belongs to, whose text WCAG 1.4.3 exempts from contrast. The enabled legends are held
      // to 4.5:1.
      await page.evaluate(() => {
        for (const shortcut of document.querySelectorAll('tanrei-keyboard-shortcut[disabled]')) {
          const command = document.createElement('button');
          command.type = 'button';
          command.disabled = true;
          shortcut.replaceWith(command);
          command.append(shortcut);
        }
      });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
    }
  });

  test('forced colors: an edge a layer gives the caps is drawn in a system color, and a disabled legend is GrayText, where the engine has the mode', async ({ page }) => {
    await mountFixtures(page, spec);
    // The default system's cap has no edge (KBS-6): the mode has only its legend to repaint.
    await override(page, { [T('outline-width')]: 'var(--tanrei-sys-border-hairline)' });
    await page.emulateMedia({ forcedColors: 'active' });
    const forced = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = 'rgb(1, 2, 3)';
      document.body.appendChild(probe);
      const repainted = getComputedStyle(probe).color !== 'rgb(1, 2, 3)';
      probe.remove();
      return repainted;
    });
    test.skip(!forced, 'forced colors are not emulated by this browser');
    const cap = caps(page, 'keycap-apple').first();
    expect(await css(cap, 'border-top-style')).toBe('solid');
    expect(await css(cap, 'border-top-color')).not.toBe('rgba(0, 0, 0, 0)');
    expect(await css(labels(page, 'disabled-keycap').first(), 'color')).not.toBe(await css(labels(page, 'keycap-apple').first(), 'color'));
  });
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec);
  });

  test('every fixture pins its convention and draws the keys it names', async ({ page }) => {
    const expected: Record<string, string> = {
      'keycap-apple': '⇧⌘K',
      'keycap-standard': 'Ctrl+Shift+K',
      'plain-apple': '⇧⌘K',
      'plain-standard': 'Ctrl+Shift+K',
      'small-apple': '⌘C',
      'small-standard': 'Ctrl+C',
      'reordered-apple': '⌥⌘⎋',
      'named-keys-standard': 'Ctrl+Alt+Delete',
      'single-key': 'F2',
      'sequence-standard': 'Ctrl+K Ctrl+C',
      'sequence-plain-apple': '⌘K ⌘C',
      'plus-key-standard': 'Ctrl++',
      'disabled-keycap': '⇧⌘K',
      'disabled-plain': 'Ctrl+Shift+K',
    };
    for (const f of spec.fixtures) {
      expect(f.props.convention, f.id).toMatch(/^(apple|standard)$/);
      expect(await written(page, f.id), f.id).toBe(expected[f.id]);
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
