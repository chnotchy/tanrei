// <tanrei-description-list> and description-list.css, driven by specs/description-list.spec.json: every behaviour id
// (DSL-1…23) is cited by a test title, every fixture has a baseline, and every length and color is read back from the
// tokens — never from a number written here (the numbers of a `verify` are the spec's own, for the default system).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { decodePng } from '../../../test/png.js';
import { type Fixture, type FixtureItem, fixturesDocument, loadSpec, mountFixtures, resolveColor, resolveToken, tab, rootTokens } from '../../../test/harness.js';

const spec = loadSpec('description-list');
type P = Page;
const TAG = 'tanrei-description-list';
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const T = (name: string) => `--tanrei-comp-description-list-${name}`;

const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] ${TAG}`);
const list = (page: P, id: string) => host(page, id).locator('> dl');
/** A fact, its term and one of its values, counted from 1. */
const fact = (page: P, id: string, n: number) => list(page, id).locator(`> div:nth-child(${n})`);
const term = (page: P, id: string, n: number) => fact(page, id, n).locator('> dt');
const value = (page: P, id: string, n: number, k = 1) => fact(page, id, n).locator(`> dd:nth-of-type(${k})`);
const css = (locator: Locator, property: string) => locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
const px = async (locator: Locator, property: string) => Number.parseFloat(await css(locator, property));
const edges = (locator: Locator) =>
  locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  });
/** Where the text of an element is drawn: the box of its contents, not of the element. */
const textBox = (locator: Locator) =>
  locator.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const r = range.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  });
/** How many lines the text of an element runs over. */
const lines = (locator: Locator) =>
  locator.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const tops: number[] = [];
    for (const r of range.getClientRects()) if (r.width > 0 && !tops.some((top) => Math.abs(top - r.top) < r.height / 2)) tops.push(r.top);
    return tops.length;
  });
/** The baseline of an element's first line: the foot of an empty inline box set before its content, taken out again. */
const baseline = (locator: Locator) =>
  locator.evaluate((el) => {
    const probe = document.createElement('span');
    probe.style.cssText = 'display: inline-block; inline-size: 0; block-size: 0';
    el.prepend(probe);
    const y = probe.getBoundingClientRect().bottom;
    probe.remove();
    return y;
  });
/** Where the first and the last character of an element's text are drawn, from the left. */
const ends = (locator: Locator) =>
  locator.evaluate((el) => {
    const node = el.firstChild as Text;
    const at = (index: number) => {
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + 1);
      return range.getBoundingClientRect().left;
    };
    return { first: at(0), last: at(node.length - 1) };
  });
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning' && message.text().includes('[tanrei]')) seen.push(message.text());
  });
  return seen;
}
/** One frame drawn: what an observer of sizes or of the document wrote has been styled. */
const frame = (page: P) => page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

// Fixtures of a test's own, in the spec's shape.
const f1 = (termText: string, content: string | string[] = ''): FixtureItem =>
  Array.isArray(content) ? { kind: 'fact', props: { term: termText }, items: content.map((c) => ({ kind: 'value', props: {}, content: c })) } : { kind: 'fact', props: { term: termText }, content };
const fx = (id: string, props: Fixture['props'], items: FixtureItem[], extra: Partial<Fixture> = {}): Fixture => ({ id, props, items, ...extra });
/** A fixture whose list is written by the test. */
const raw = (id: string, props: Fixture['props'], content: string, extra: Partial<Fixture> = {}): Fixture => ({ id, props, content, ...extra });
const fixture = (id: string) => spec.fixtures.find((f) => f.id === id)!;
const some = (...ids: string[]) => ids.map(fixture);
/** A term that is exactly `width` wide, whatever the face. */
const wide = (width: number, name = 'Term') => `<span style="display: inline-block; inline-size: ${width}px">${name}</span>`;
/** The list's width (a fixture cannot state the size of its stage: DSL-4, DSL-7). */
const size = (page: P, id: string, width: number) =>
  stage(page, id).evaluate((el, w) => {
    (el as HTMLElement).style.maxInlineSize = 'none';
    (el as HTMLElement).style.inlineSize = `${w + 32}px`;
  }, width);
const near = (a: number, b: number, tolerance = 0.6) => expect(Math.abs(a - b), `${a} ≈ ${b}`).toBeLessThanOrEqual(tolerance);
/** The values of a fact, as the fixture gives them. */
const valuesOf = (item: FixtureItem) => (item.items ? item.items.map((v) => v.content ?? '') : [item.content ?? '']);
/** How many columns of facts a list draws: the distinct start edges of its facts. */
const columnsOf = (page: P, id: string) => list(page, id).evaluate((el) => new Set([...el.children].map((child) => Math.round(child.getBoundingClientRect().left))).size);
/** Whether a list draws its terms beside its values (inline) or above them (stacked). */
const drawn = async (page: P, id: string, n = 1) => {
  const [t, v] = [await edges(term(page, id, n)), await edges(value(page, id, n))];
  const beside = v.left >= t.right - 0.5 || v.right <= t.left + 0.5;
  return v.top >= t.bottom - 0.5 && !beside ? 'stacked' : beside && v.top < t.bottom ? 'inline' : `neither (${JSON.stringify([t, v])})`;
};

test.describe('the parts and their text', () => {
  test('DSL-1: the facts in the order given, each a term and its values, as a block as wide as its layout and as tall as its facts; no fill, edge, corner, elevation or outer space of its own, none above its first fact and none below its last', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('inline', 'several-values', 'stat', 'separation-divider-columns', 'separation-gap-stat', 'stacked') });
    for (const id of ['inline', 'several-values', 'stat', 'separation-divider-columns', 'separation-gap-stat', 'stacked']) {
      const items = fixture(id).items!;
      expect(await list(page, id).locator('> div > dt').allTextContents(), id).toEqual(items.map((item) => String(item.props.term)));
      expect(await list(page, id).evaluate((el) => [...el.children].map((group) => [...group.querySelectorAll(':scope > dd')].map((dd) => dd.textContent))), id).toEqual(items.map(valuesOf));
      const [outer, wrapper] = [await edges(stage(page, id)), await edges(host(page, id))];
      near(wrapper.width, outer.width - 32);
      expect(await css(host(page, id), 'display')).toBe('block');
      for (const part of [host(page, id), list(page, id)]) {
        const look = await part.evaluate((el) => {
          const s = getComputedStyle(el);
          const sides = ['top', 'right', 'bottom', 'left'];
          return {
            fill: s.backgroundColor,
            image: s.backgroundImage,
            elevation: s.boxShadow,
            edges: sides.map((side) => s.getPropertyValue(`border-${side}-width`)),
            padding: sides.map((side) => s.getPropertyValue(`padding-${side}`)),
            corners: ['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => s.getPropertyValue(`border-${corner}-radius`)),
          };
        });
        expect(look, id).toEqual({ fill: 'rgba(0, 0, 0, 0)', image: 'none', elevation: 'none', edges: Array(4).fill('0px'), padding: Array(4).fill('0px'), corners: Array(4).fill('0px') });
      }
      expect(await host(page, id).evaluate((el) => ['top', 'right', 'bottom', 'left'].map((side) => getComputedStyle(el).getPropertyValue(`margin-${side}`)))).toEqual(Array(4).fill('0px'));
      // No space above the first fact and none below the last: the box begins and ends where its facts' content does.
      const content = await list(page, id).evaluate((el) => {
        const boxes = [...el.querySelectorAll(':scope > div > :is(dt, dd)')].map((part) => part.getBoundingClientRect());
        return { top: Math.min(...boxes.map((b) => b.top)), bottom: Math.max(...boxes.map((b) => b.bottom)) };
      });
      near(content.top, wrapper.top);
      near(content.bottom, wrapper.bottom);
      near(wrapper.bottom, outer.bottom - 16);
    }
  });

  test('DSL-2: a term in its text style and color and a value in its own, by density (14 on 20 at 500 and 14 on 22; compact 12 on 16 and 13 on 20), digits of equal width; no mark after a term, and nothing done to the weight, case or family of what was written', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('inline', 'inline-compact') });
    for (const [id, density, numbers] of [['inline', 'regular', [14, 20, 14, 22]], ['inline-compact', 'compact', [12, 16, 13, 20]]] as const) {
      const [t, v] = [term(page, id, 2), value(page, id, 2)];
      for (const [part, name] of [[t, 'term'], [v, 'value']] as const) {
        expect(await px(part, 'font-size'), `${id} ${name}`).toBe(await resolveToken(page, T(`${name}-typescale-${density}-font-size`)));
        near(await px(part, 'line-height'), (await resolveToken(page, T(`${name}-typescale-${density}-font-size`))) * Number(await css(page.locator('html'), T(`${name}-typescale-${density}-line-height`))), 0.05);
        expect(await css(part, 'font-weight')).toBe((await css(page.locator('html'), T(`${name}-typescale-${density}-font-weight`))).trim());
        expect(await css(part, 'color')).toBe(await resolveColor(page, T(`${name}-color`)));
        expect(await css(part, 'text-transform')).toBe('none');
        expect(await css(part, 'font-style')).toBe('normal');
        // Nothing of the list's own is drawn before or after what the product wrote.
        expect(await part.evaluate((el) => [getComputedStyle(el, '::before').content, getComputedStyle(el, '::after').content])).toEqual(['none', 'none']);
      }
      // The verify, under the default system.
      expect([await px(t, 'font-size'), await px(t, 'line-height'), await px(v, 'font-size'), await px(v, 'line-height')].map((n) => Math.round(n))).toEqual([...numbers]);
      expect(await css(t, 'font-weight')).toBe('500');
      expect(await css(v, 'font-variant-numeric')).toBe('tabular-nums');
      expect(await t.textContent()).toBe(String(fixture(id).items![1].props.term));
    }
    expect(await css(term(page, 'inline', 1), 'color')).toBe(await resolveColor(page, '--tanrei-sys-color-on-surface-variant'));
    expect(await css(value(page, 'inline', 1), 'color')).toBe(await resolveColor(page, '--tanrei-sys-color-on-surface'));
  });
});

test.describe('layouts', () => {
  test('DSL-3: inline — one column of facts, every term in one column as wide as the widest term on one line, every value in a column that takes the rest, term.gap apart by density (16 and 8), the first lines on one baseline', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('inline', 'inline-compact', 'inline-long-values') });
    for (const [id, density, apart] of [['inline', 'regular', 16], ['inline-compact', 'compact', 8], ['inline-long-values', 'regular', 16]] as const) {
      const count = fixture(id).items!.length;
      const gap = await resolveToken(page, T(`term-gap-${density}`));
      expect(gap).toBe(apart);
      const wrapper = await edges(host(page, id));
      const terms = await Promise.all(Array.from({ length: count }, (_, i) => textBox(term(page, id, i + 1))));
      const widest = Math.max(...terms.map((t) => t.right));
      for (let n = 1; n <= count; n++) {
        expect(await lines(term(page, id, n)), `${id} term ${n}`).toBe(1);
        const [t, v] = [await edges(term(page, id, n)), await edges(value(page, id, n))];
        // The term at the start, in a column as wide as the widest; the value after it, to the end of the list.
        near(t.left, wrapper.left);
        near(t.right, widest, 1);
        near(v.left, widest + gap, 1);
        near(v.right, wrapper.right);
        near(await baseline(term(page, id, n)), await baseline(value(page, id, n)), 0.6);
      }
      expect(await columnsOf(page, id)).toBe(1);
    }
    // A long value wraps inside its column.
    expect(await lines(value(page, 'inline-long-values', 2))).toBeGreaterThan(1);
    // The widest term is "Platforms" (the verify).
    const platforms = await textBox(term(page, 'inline', 4));
    for (const n of [1, 2, 3, 4]) near((await edges(value(page, 'inline', n))).left, platforms.right + 16, 1);
  });

  test('DSL-4: an inline list whose values would be left less than column.min-width draws every fact stacked — all together — and returns to two columns when the room is there: 256 and 255 for a 96 wide term; by its own width, at once, with no motion, exposing the same', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await mountFixtures(page, spec, { fixtures: [fx('own', {}, [f1(wide(96), 'A value'), f1('Short', 'Another value')]), ...some('inline-falls-back', 'inline')] });
    await page.evaluate(() => window.addEventListener('error', (event) => ((window as unknown as { __errors: string[] }).__errors ??= []).push(event.message)));
    const [least, gap] = [await resolveToken(page, T('column-min-width')), await resolveToken(page, T('term-gap-regular'))];
    expect([least, gap]).toEqual([144, 16]);
    // The verify: two columns at 256, stacked at 255 — both facts — and two columns again.
    await size(page, 'own', 256);
    expect([await drawn(page, 'own', 1), await drawn(page, 'own', 2)]).toEqual(['inline', 'inline']);
    near((await edges(value(page, 'own', 1))).width, least);
    await size(page, 'own', 255);
    expect([await drawn(page, 'own', 1), await drawn(page, 'own', 2)]).toEqual(['stacked', 'stacked']);
    // As the stacked layout draws it (DSL-5): the value stack.gap under its term, both at the start edge.
    near((await edges(value(page, 'own', 1))).top - (await edges(term(page, 'own', 1))).bottom, await resolveToken(page, T('stack-gap')));
    await size(page, 'own', 256);
    expect([await drawn(page, 'own', 1), await drawn(page, 'own', 2)]).toEqual(['inline', 'inline']);
    // By its own width, not the window's: the window never changed, and a wide window does not unstack a narrow list.
    await size(page, 'own', 200);
    await page.setViewportSize({ width: 1400, height: 800 });
    expect(await drawn(page, 'own')).toBe('stacked');
    // The browser draws the other form itself: nothing moves, and nothing is animated.
    for (const part of [list(page, 'own'), fact(page, 'own', 1), term(page, 'own', 1), value(page, 'own', 1)]) {
      expect(await css(part, 'transition-duration')).toBe('0s');
      expect(await css(part, 'animation-name')).toBe('none');
    }
    // Nothing that is exposed changes (DSL-17).
    await expect(list(page, 'own').getByRole('term')).toHaveCount(2);
    await expect(list(page, 'own').getByRole('definition')).toHaveCount(2);
    expect(await list(page, 'own').evaluate((el) => [...el.querySelectorAll('dt, dd')].map((part) => part.localName))).toEqual(['dt', 'dd', 'dt', 'dd']);
    // The fixture: a term wider than the stage is drawn stacked, and the short fact with it.
    expect([await drawn(page, 'inline-falls-back', 1), await drawn(page, 'inline-falls-back', 2)]).toEqual(['stacked', 'stacked']);
    expect(await lines(term(page, 'inline-falls-back', 1))).toBeGreaterThan(1);
    expect(await drawn(page, 'inline')).toBe('inline');
    // Resizing across the width reported no loop of the observer of sizes and no other error.
    await frame(page);
    expect([...errors, ...(await page.evaluate(() => (window as unknown as { __errors?: string[] }).__errors ?? []))]).toEqual([]);
  });

  test('DSL-5: stacked — the term on lines of its own and its values below it after stack.gap, both at the start edge of the fact’s column and no wider than it', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...some('stacked', 'stacked-compact', 'columns'), fx('long-term', { layout: 'stacked', columns: 3 }, [f1('A term that is long enough to run over more than one line of the column it is drawn in, whatever the face', 'Value'), f1('B', 'Value'), f1('C', 'Value')])] });
    const gap = await resolveToken(page, T('stack-gap'));
    for (const id of ['stacked', 'stacked-compact', 'columns', 'long-term']) {
      const count = fixture(id)?.items!.length ?? 3;
      for (let n = 1; n <= count; n++) {
        const [group, t, v] = [await edges(fact(page, id, n)), await edges(term(page, id, n)), await edges(value(page, id, n))];
        near(v.top - t.bottom, gap);
        near(t.left, group.left);
        near(v.left, group.left);
        expect(t.right).toBeLessThanOrEqual(group.right + 0.5);
        expect(v.right).toBeLessThanOrEqual(group.right + 0.5);
      }
    }
    expect(await lines(term(page, 'long-term', 1))).toBeGreaterThan(1);
    expect(await lines(value(page, 'stacked', 1))).toBeGreaterThan(1);
  });

  test('DSL-6: stat — the first value first, as a figure in the stat text style by density (32 on 40, 20 on 28) in the value’s color with digits of equal width, on one line; the term stack.gap below it in its own style; no negative letter-spacing in Japanese; the term is still exposed first', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('stat', 'stat-compact', 'stat-single', 'japanese-stat') });
    const gap = await resolveToken(page, T('stack-gap'));
    expect(gap).toBe(4);
    for (const [id, density, numbers] of [['stat', 'regular', [32, 40]], ['stat-compact', 'compact', [20, 28]], ['stat-single', 'regular', [32, 40]]] as const) {
      for (let n = 1; n <= fixture(id).items!.length; n++) {
        const [group, t, v] = [await edges(fact(page, id, n)), await edges(term(page, id, n)), await edges(value(page, id, n))];
        const figure = value(page, id, n);
        expect(await px(figure, 'font-size')).toBe(await resolveToken(page, T(`stat-value-typescale-${density}-font-size`)));
        expect([Math.round(await px(figure, 'font-size')), Math.round(await px(figure, 'line-height'))]).toEqual([...numbers]);
        expect(await css(figure, 'color')).toBe(await resolveColor(page, T('value-color')));
        expect(await css(figure, 'font-variant-numeric')).toBe('tabular-nums');
        expect(await lines(figure)).toBe(1);
        // The figure first, its label under it, both at the start edge of the fact's column.
        near(t.top - v.bottom, gap);
        near(v.left, group.left);
        near(t.left, group.left);
        expect(await px(term(page, id, n), 'font-size')).toBe(await resolveToken(page, T(`term-typescale-${density}-font-size`)));
        expect(await css(term(page, id, n), 'color')).toBe(await resolveColor(page, T('term-color')));
        // What is read is the document's order: the term before its value.
        expect(await fact(page, id, n).evaluate((el) => [...el.children].map((child) => child.localName))).toEqual(['dt', 'dd']);
      }
    }
    await expect(list(page, 'stat')).toMatchAriaSnapshot(`
      - term: platforms
      - definition: "5"
      - term: components planned
      - definition: "37"
    `);
    // The heading style's letter-spacing is the figure's; in Japanese a negative one is not applied.
    const tracking = Number.parseFloat((await css(page.locator('html'), T('stat-value-typescale-regular-letter-spacing'))).trim());
    expect(tracking).toBeLessThan(0);
    near(await px(value(page, 'stat', 1), 'letter-spacing'), tracking * 32, 0.01);
    expect(await css(value(page, 'japanese-stat', 1), 'letter-spacing')).toMatch(/^(0px|normal)$/);
  });

  test('DSL-7: stacked and stat facts in columns of equal width, column.gap apart, row by row from the start edge — as many as columns, the facts and the width allow (four at 672, three at 671, two at 495, one at 319), laid out again at once; an inline list is one column; a number that is not whole or less than 1 is one, and reported', async ({ page }) => {
    const seen = warnings(page);
    const four = [f1('Order', 'A-20418'), f1('Placed', '6 October 2026'), f1('Ships to', 'Tokyo'), f1('Total', '¥ 12,800')];
    await page.setViewportSize({ width: 1500, height: 900 });
    await mountFixtures(page, spec, {
      fixtures: [
        fx('four', { layout: 'stacked', columns: 4 }, four),
        fx('four-stat', { layout: 'stat', columns: 4 }, four),
        fx('two', { layout: 'stacked', columns: 4 }, four.slice(0, 2)),
        fx('inline-columns', { columns: 3 }, four),
        fx('none', { layout: 'stacked', columns: 0 }, four),
        fx('half', { layout: 'stacked', columns: 2.5 }, four),
        fx('eight', { layout: 'stacked', columns: 8 }, [...four, ...four]),
        fx('wide-two', { layout: 'stacked', columns: 2 }, four),
      ],
    });
    const [least, gap] = [await resolveToken(page, T('column-min-width')), await resolveToken(page, T('column-gap'))];
    expect([least, gap]).toEqual([144, 32]);
    for (const id of ['four', 'four-stat']) {
      for (const [width, columns] of [[672, 4], [671, 3], [495, 2], [319, 1], [672, 4]] as const) {
        await size(page, id, width);
        expect(await columnsOf(page, id), `${id} at ${width}`).toBe(columns);
        // Equal widths, the gap between them, row by row in reading order, the facts of a row at one top edge.
        const boxes = await Promise.all([1, 2, 3, 4].map((n) => edges(fact(page, id, n))));
        const each = (width - (columns - 1) * gap) / columns;
        for (const [i, b] of boxes.entries()) {
          near(b.width, each, 0.1);
          near(b.left - boxes[0].left, (i % columns) * (each + gap), 0.1);
          if (i % columns) near(b.top, boxes[i - 1].top, 0.1);
          else if (i) expect(b.top).toBeGreaterThan(boxes[i - 1].top);
        }
      }
      expect(await css(list(page, id), 'transition-duration')).toBe('0s');
    }
    // Never more columns than facts: two facts with columns 4 are two columns, each half of the width less the gap.
    await size(page, 'two', 672);
    expect(await columnsOf(page, 'two')).toBe(2);
    for (const n of [1, 2]) near((await edges(fact(page, 'two', n))).width, (672 - gap) / 2, 0.1);
    // Never more than `columns`, however wide.
    await size(page, 'wide-two', 1200);
    expect(await columnsOf(page, 'wide-two')).toBe(2);
    // More columns than the stylesheet reads from the attribute: the element writes the rule.
    await size(page, 'eight', 8 * least + 7 * gap);
    await expect.poll(() => columnsOf(page, 'eight')).toBe(8);
    // Inline is one column whatever `columns` says; so is a number that is less than 1 or not whole. Each is reported.
    for (const id of ['inline-columns', 'none', 'half']) {
      await size(page, id, 900);
      expect(await columnsOf(page, id), id).toBe(1);
    }
    await expect.poll(() => seen.filter((m) => m.includes('DSL-7')).length).toBe(3);
    expect(seen.filter((m) => m.includes('an inline list has one column'))).toHaveLength(1);
    expect(seen.filter((m) => m.includes('is not a whole number of at least 1'))).toHaveLength(2);
  });

  test('DSL-8: text wraps inside its column by its language’s rules and is never cut or ended with an ellipsis; a run with no break opportunity is broken at the column’s edge, whole, and the list does not scroll sideways', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...some('unbreakable', 'inline-long-values', 'japanese'), fx('unbreakable-stacked', { layout: 'stacked', columns: 2 }, [f1('a_term_with_no_break_opportunity_that_is_wider_than_the_column_it_is_drawn_in_whatever_the_face_is', 'x'), f1('B', 'y')])] });
    await size(page, 'unbreakable-stacked', 320);
    const id = 'unbreakable';
    const [wrapper, v] = [await edges(host(page, id)), value(page, id, 1)];
    // The verify: broken at the edge, whole, nothing scrolling sideways.
    expect(await lines(v)).toBeGreaterThan(1);
    expect((await textBox(v)).right).toBeLessThanOrEqual(wrapper.right + 0.5);
    expect(await v.textContent()).toBe(fixture(id).items![0].content);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    for (const each of ['unbreakable', 'inline-long-values', 'unbreakable-stacked']) {
      expect(await stage(page, each).evaluate((el) => el.scrollWidth <= el.clientWidth), each).toBe(true);
      expect(await host(page, each).evaluate((el) => el.scrollWidth <= el.clientWidth), each).toBe(true);
    }
    for (const part of [v, term(page, id, 1), value(page, 'inline-long-values', 2), term(page, 'unbreakable-stacked', 1)]) {
      expect(await css(part, 'text-overflow')).toBe('clip');
      expect(await css(part, 'white-space')).toBe('normal');
      expect(await css(part, 'overflow')).toBe('visible');
      expect(await css(part, '-webkit-line-clamp')).toBe('none');
    }
    // A term where the stacked layout places it is broken at its column's edge too.
    expect(await lines(term(page, 'unbreakable-stacked', 1))).toBeGreaterThan(1);
    expect((await textBox(term(page, 'unbreakable-stacked', 1))).right).toBeLessThanOrEqual((await edges(fact(page, 'unbreakable-stacked', 1))).right + 0.5);
    // Japanese breaks by its own rules.
    expect(await css(value(page, 'japanese', 3), 'line-break')).toBe('strict');
    expect(await lines(value(page, 'japanese', 3))).toBeGreaterThan(1);
  });

  test('DSL-9: several values of one term are each on lines of their own, stack.gap apart, in the order given — in the value column beside the term, under it while stacked; in stat only the first is the figure, the others under the term in the value’s style', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...some('several-values', 'stat-note'), { ...fixture('several-values'), id: 'several-stacked', props: { layout: 'stacked' } }] });
    const gap = await resolveToken(page, T('stack-gap'));
    for (const id of ['several-values', 'several-stacked']) {
      const [t, first, second, third] = [await edges(term(page, id, 1)), await edges(value(page, id, 1, 1)), await edges(value(page, id, 1, 2)), await edges(value(page, id, 1, 3))];
      near(second.top - first.bottom, gap);
      near(third.top - second.bottom, gap);
      near(second.left, first.left);
      near(third.left, first.left);
      if (id === 'several-values') expect(first.left).toBeGreaterThan(t.right);
      else near(first.left, t.left);
    }
    expect(await fact(page, 'several-values', 1).locator('> dd').allTextContents()).toEqual(valuesOf(fixture('several-values').items![0]));
    // Stat: the figure, the term, then the note in the value's own style.
    for (const n of [1, 2]) {
      const [figure, t, note] = [await edges(value(page, 'stat-note', n, 1)), await edges(term(page, 'stat-note', n)), await edges(value(page, 'stat-note', n, 2))];
      near(t.top - figure.bottom, gap);
      near(note.top - t.bottom, gap);
      expect(await px(value(page, 'stat-note', n, 2), 'font-size')).toBe(await resolveToken(page, T('value-typescale-regular-font-size')));
      expect(await px(value(page, 'stat-note', n, 1), 'font-size')).toBe(await resolveToken(page, T('stat-value-typescale-regular-font-size')));
    }
  });

  test('DSL-10: a component in a term or a value is placed where the text would begin, on the first line, with nothing added to it and no height added to its fact, and pointer and keyboard reach it in the reading order of the facts', async ({ page }) => {
    const tag = '<tanrei-tag size="small" label="Planned"></tanrei-tag>';
    await mountFixtures(page, spec, {
      fixtures: [
        ...some('tags'),
        // A term that holds a component: the status legend (no fixture can write it).
        fx('legend', { layout: 'stacked', columns: 3 }, [f1(tag, 'Specified, not yet implemented on this platform.'), f1('Lagging', 'Implemented, but behind the current spec.')]),
        fx('links', {}, [f1('Docs', '<a id="first" href="#first">the first link</a>'), f1('Source', ['<button id="second" type="button">the button</button>', '<a id="third" href="#third">the third link</a>'])]),
      ],
    });
    await page.waitForFunction(() => !!customElements.get('tanrei-tag'));
    // The verify: each tag as the tag's own spec draws it, on the first line of its value, adding no height.
    const plain = await edges(fact(page, 'tags', 2));
    for (const [n, k] of [[1, 1], [3, 1], [3, 2], [4, 1]] as const) {
      const [v, drawnTag] = [await edges(value(page, 'tags', n, k)), await edges(value(page, 'tags', n, k).locator('tanrei-tag'))];
      near(drawnTag.left, v.left);
      near(v.height, await px(value(page, 'tags', 2), 'line-height'), 0.1);
      expect(drawnTag.top).toBeGreaterThanOrEqual(v.top - 0.5);
      expect(drawnTag.bottom).toBeLessThanOrEqual(v.bottom + 0.5);
      near(drawnTag.height, await resolveToken(page, '--tanrei-comp-tag-container-height-small'));
    }
    near((await edges(fact(page, 'tags', 4))).height - (await px(fact(page, 'tags', 4), 'padding-top')) - (await px(fact(page, 'tags', 4), 'border-top-width')), plain.height - (await px(fact(page, 'tags', 2), 'padding-top')) - (await px(fact(page, 'tags', 2), 'border-top-width')), 0.1);
    // A component as the term: at the start of the fact, where the text would begin.
    near((await edges(term(page, 'legend', 1).locator('tanrei-tag'))).left, (await edges(fact(page, 'legend', 1))).left);
    await expect(term(page, 'legend', 1).locator('tanrei-tag')).toBeVisible();
    // Nothing is added to what a value holds.
    for (const id of ['first', 'second', 'third']) {
      expect(await page.locator(`#${id}`).evaluate((el) => [getComputedStyle(el, '::before').content, getComputedStyle(el, '::after').content, getComputedStyle(el).marginLeft, getComputedStyle(el).position])).toEqual(['none', 'none', '0px', 'static']);
    }
    // The keyboard reaches them in the order of the facts, and so does a pointer.
    await page.locator('body').click({ position: { x: 790, y: 5 } });
    await page.evaluate(() => (document.querySelector('#first') as HTMLElement).focus());
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('second');
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('third');
    await page.evaluate(() => document.querySelector('#second')!.addEventListener('click', () => document.body.setAttribute('data-pressed', '')));
    await page.locator('#second').click();
    await expect(page.locator('body')).toHaveAttribute('data-pressed', '');
  });

  test('DSL-11: a fact with a term and no value, or an empty one, draws the term, keeps the value’s place and one line of its height and puts no mark of its own there; a value with no term is drawn where it would be and reported; a list with no facts draws nothing, takes no space and exposes nothing', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [
        ...some('empty-value'),
        raw('no-value', {}, '<dl><div><dt>Order</dt><dd>A-20418</dd></div><div><dt>Coupon</dt></div><div><dt>Total</dt><dd>¥ 12,800</dd></div></dl>'),
        raw('no-term', {}, '<dl><div><dt>Order</dt><dd>A-20418</dd></div><div><dd id="untermed">Nothing names this</dd></div></dl>'),
        raw('no-facts', {}, '<dl></dl>'),
        raw('no-list', {}, ''),
      ],
    });
    const line = await px(value(page, 'empty-value', 1), 'line-height');
    for (const n of [2, 3]) {
      const v = value(page, 'empty-value', n);
      expect(await v.textContent()).toBe('');
      near((await edges(v)).height, line, 0.1);
      near((await edges(v)).left, (await edges(value(page, 'empty-value', 1))).left);
      // No mark of its own: what keeps the line is an empty box, and nothing follows it.
      expect(await v.evaluate((el) => [getComputedStyle(el, '::before').content, getComputedStyle(el, '::after').content])).toEqual(['""', 'none']);
      expect((await textBox(v)).width).toBe(0);
      await expect(term(page, 'empty-value', n)).toBeVisible();
      // In step with the others: its term stands where the term of a fact with a value stands.
      near((await edges(term(page, 'empty-value', n))).top - (await edges(fact(page, 'empty-value', n))).top, (await edges(term(page, 'empty-value', 4))).top - (await edges(fact(page, 'empty-value', 4))).top, 0.1);
      // In step with the others: the fact is as tall as a fact with a value.
      near((await edges(fact(page, 'empty-value', n))).height, (await edges(fact(page, 'empty-value', 4))).height, 0.1);
    }
    // Exposed with an empty value.
    await expect(list(page, 'empty-value').getByRole('definition')).toHaveCount(4);
    // No value at all: the term, and the value's line kept.
    near((await edges(fact(page, 'no-value', 2))).height, (await edges(fact(page, 'no-value', 3))).height, 0.1);
    await expect(term(page, 'no-value', 2)).toBeVisible();
    // No term: the value where it would be, and a report.
    near((await edges(page.locator('#untermed'))).left, (await edges(value(page, 'no-term', 1))).left);
    await expect.poll(() => seen.filter((m) => m.includes('DSL-11') && m.includes('no term')).length).toBe(1);
    // No facts: nothing, no space, nothing exposed.
    for (const id of ['no-facts', 'no-list']) {
      expect((await edges(host(page, id))).height, id).toBe(0);
      await expect(stage(page, id).getByRole('term')).toHaveCount(0);
      await expect(stage(page, id).getByRole('definition')).toHaveCount(0);
    }
    expect(await css(list(page, 'no-facts'), 'display')).toBe('none');
  });
});

test.describe('telling facts apart', () => {
  /** The form a list draws between its first two rows of facts: read from the second fact (or the last, in columns). */
  const form = async (page: P, id: string, density: 'regular' | 'compact' = 'regular', n = 2) => {
    const [thickness, gap] = [await resolveToken(page, T('divider-thickness')), await resolveToken(page, T(`fact-gap-${density}`))];
    const group = fact(page, id, n);
    const [line, margin, padding] = [await px(group, 'border-top-width'), await px(group, 'margin-top'), await px(group, 'padding-top')];
    if (line === thickness && Math.abs(margin + line + padding - 2 * gap) < 0.01 && Math.abs(margin - padding) < 0.01) return 'divider';
    return line === 0 && padding === 0 && Math.abs(margin - gap) < 0.01 ? 'gap' : `neither (${line}, ${margin}, ${padding})`;
  };

  test('DSL-12: while the separation is divider one line of divider.thickness in divider.color above every fact that is not in the first row, as wide as its column, fact.gap on each side of it and taking no room of its own (24 between two facts, 12 compact); none above the first row, below the last, between columns or between a term and its value', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...some('separation-divider', 'separation-divider-columns'), { ...fixture('inline-compact'), id: 'compact-divider', props: { density: 'compact', separation: 'divider' } }] });
    const thickness = await resolveToken(page, T('divider-thickness'));
    const color = await resolveColor(page, T('divider-color'));
    expect(color).toBe(await resolveColor(page, '--tanrei-sys-color-outline-variant'));
    for (const [id, density, between] of [['separation-divider', 'regular', 24], ['compact-divider', 'compact', 12]] as const) {
      const gap = await resolveToken(page, T(`fact-gap-${density}`));
      expect(2 * gap).toBe(between);
      const count = fixture(id === 'compact-divider' ? 'inline-compact' : id).items!.length;
      for (let n = 2; n <= count; n++) {
        const [above, group] = [await edges(fact(page, id, n - 1)), fact(page, id, n)];
        // The last line of a fact to the first of the next: twice the gap, the line in the middle.
        const first = await edges(value(page, id, n));
        const last = await edges(fact(page, id, n - 1).locator('> dd:last-of-type'));
        near(first.top - last.bottom, between, 0.1);
        expect(await px(group, 'border-top-width')).toBe(thickness);
        expect(await css(group, 'border-top-style')).toBe('solid');
        expect(await css(group, 'border-top-color')).toBe(color);
        const g = await edges(group);
        near(g.top + thickness / 2 - above.bottom, gap, 0.1);
        // A term and its value under one line: as wide as the list.
        near(g.width, (await edges(host(page, id))).width, 0.1);
      }
      // None above the first row or below the last, and none between a term and its value.
      expect(await px(fact(page, id, 1), 'border-top-width')).toBe(0);
      expect(await px(fact(page, id, count), 'border-bottom-width')).toBe(0);
      for (const part of [term(page, id, 2), value(page, id, 2)]) expect(await part.evaluate((el) => ['top', 'right', 'bottom', 'left'].map((side) => getComputedStyle(el).getPropertyValue(`border-${side}-width`)))).toEqual(Array(4).fill('0px'));
    }
    // In columns: the line is as wide as the fact's column, there is none between two columns, and the first row draws none.
    const id = 'separation-divider-columns';
    expect(await columnsOf(page, id)).toBe(2);
    for (const n of [3, 4]) {
      near((await edges(value(page, id, n))).bottom - (await edges(value(page, id, n))).height - (await edges(term(page, id, n - 2))).top - (await edges(fact(page, id, n - 2))).height + (await px(fact(page, id, n - 2), 'padding-top')) + (await px(fact(page, id, n - 2), 'border-top-width')) - (await edges(term(page, id, n))).height - (await resolveToken(page, T('stack-gap'))), 24, 0.1);
      near((await edges(fact(page, id, n))).width, ((await edges(host(page, id))).width - (await resolveToken(page, T('column-gap')))) / 2, 0.1);
      expect(await fact(page, id, n).evaluate((el) => ['left', 'right'].map((side) => getComputedStyle(el).getPropertyValue(`border-${side}-width`)))).toEqual(['0px', '0px']);
    }
    // What is painted: the surface alone above the first row (its facts keep a line there, which the list clips),
    // and the line's color between the two rows, across each column and not across the space between them.
    const wrapper = await edges(host(page, id));
    const shot = decodePng(await page.screenshot({ clip: { x: wrapper.left, y: wrapper.top - 16, width: wrapper.width, height: wrapper.height + 32 }, scale: 'css' }));
    const at = (x: number, y: number) => [...shot.data.subarray((y * shot.width + x) * 4, (y * shot.width + x) * 4 + 3)].join(' ');
    const surface = at(1, 1);
    for (let y = 0; y < 16; y++) for (const x of [2, Math.floor(wrapper.width / 4), Math.floor((wrapper.width * 3) / 4)]) expect(at(x, y), `above the first row at ${x}, ${y}`).toBe(surface);
    const second = await edges(fact(page, id, 3));
    // (The line is one pixel on a fraction of a pixel: it is looked for on the rows it touches.)
    const y = Math.floor(second.top - wrapper.top + 16);
    const rows = [y - 1, y, y + 1];
    const painted = (x: number) => rows.some((row) => at(x, row) !== surface);
    expect(painted(Math.floor(wrapper.width / 4))).toBe(true);
    expect(painted(Math.floor((wrapper.width * 3) / 4))).toBe(true);
    expect(painted(Math.floor(wrapper.width / 2))).toBe(false);
  });

  test('DSL-13: separation auto is what comp.description-list.separation names, which follows the system’s choice; divider and gap are themselves whatever the tokens say; a change is drawn at once; an unknown value is auto and reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: some('inline', 'separation-divider', 'separation-gap', 'separation-divider-columns', 'separation-gap-stat', 'stat') });
    expect([await form(page, 'inline'), await form(page, 'separation-divider'), await form(page, 'separation-gap'), await form(page, 'separation-divider-columns', 'regular', 4), await form(page, 'separation-gap-stat', 'regular', 4), await form(page, 'stat', 'regular', 4)]).toEqual(['divider', 'divider', 'gap', 'divider', 'gap', 'divider']);
    // A browser without style queries is told the choice by the element, which reads it when it reads the list: a
    // change of a token is then seen at its next reading (README). Where the queries work, `override` is all there is.
    const set = async (vars: Record<string, string>) => {
      await override(page, vars);
      await page.evaluate(() => {
        for (const element of document.querySelectorAll('tanrei-description-list')) if (element.querySelector(':scope > dl[data-separation]')) (element as unknown as { read(): void }).read();
      });
    };
    // The system's choice is followed by auto alone (the verify: the named fixtures draw the same under every system)…
    await set({ '--tanrei-sys-behavior-separation': 'gap' });
    await expect.poll(() => form(page, 'inline')).toBe('gap');
    expect([await form(page, 'separation-divider'), await form(page, 'separation-gap'), await form(page, 'separation-divider-columns', 'regular', 4), await form(page, 'separation-gap-stat', 'regular', 4), await form(page, 'stat', 'regular', 4)]).toEqual(['divider', 'gap', 'divider', 'gap', 'gap']);
    // …and the list's own token sets it apart from the system.
    await set({ [T('separation')]: 'divider' });
    await expect.poll(() => form(page, 'inline')).toBe('divider');
    await set({ [T('separation')]: 'gap', '--tanrei-sys-behavior-separation': 'divider' });
    await expect.poll(() => form(page, 'inline')).toBe('gap');
    // A name the choice does not have is the first value, divider.
    await set({ [T('separation')]: 'stripes' });
    await expect.poll(() => form(page, 'inline')).toBe('divider');
    // The prop, changed while shown: at once, no animation.
    await host(page, 'inline').evaluate((el) => ((el as unknown as { separation: string }).separation = 'gap'));
    await expect.poll(() => form(page, 'inline')).toBe('gap');
    expect(await css(fact(page, 'inline', 2), 'transition-duration')).toBe('0s');
    // Unknown: auto, and a debug build says so.
    await host(page, 'inline').evaluate((el) => ((el as unknown as { separation: string }).separation = 'dotted'));
    await expect.poll(() => form(page, 'inline')).toBe('divider');
    await expect.poll(() => seen.filter((m) => m.includes('DSL-13') && m.includes('"dotted"')).length).toBe(1);
  });

  test('DSL-13: where the browser has no style queries the element names the tokens’ separation on the list, and the same rules draw it', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('inline', 'separation-gap') });
    const queries = await page.evaluate(() => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync('@container style(--probe: on) { #probe-inner { --answer: yes; } }');
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      document.body.insertAdjacentHTML('beforeend', '<div style="--probe: on"><div id="probe-inner"></div></div>');
      return getComputedStyle(document.querySelector('#probe-inner')!).getPropertyValue('--answer').trim() === 'yes';
    });
    expect(await list(page, 'inline').getAttribute('data-separation')).toBe(queries ? null : 'divider');
    expect(await list(page, 'separation-gap').getAttribute('data-separation')).toBe(queries ? null : 'gap');
    expect([await form(page, 'inline'), await form(page, 'separation-gap')]).toEqual(['divider', 'gap']);
    // The attribute alone draws the gap form, whatever the browser.
    await host(page, 'inline').evaluate((el) => {
      el.replaceWith(el.cloneNode(true));
    });
    await stage(page, 'inline').evaluate((el) => {
      const copy = document.createElement('div');
      copy.innerHTML = el.innerHTML.replaceAll('tanrei-description-list', 'tanrei-description-list-undefined');
      copy.querySelector('dl')!.setAttribute('data-separation', 'gap');
      copy.id = 'attribute';
      el.append(copy);
    });
    await page.addStyleTag({ content: fs.readFileSync(path.join(pkg, 'dist/description-list.css'), 'utf8').replaceAll('tanrei-description-list', 'tanrei-description-list-undefined') });
    const second = page.locator('#attribute dl > div:nth-child(2)');
    expect([await px(second, 'border-top-width'), await px(second, 'padding-top'), await px(second, 'margin-top')]).toEqual([0, 0, await resolveToken(page, T('fact-gap-regular'))]);
  });

  test('DSL-14: while the separation is gap, fact.gap of empty space between a fact and the fact below it by density (12 and 6), none of the lines, and no such space above the first row or below the last; the facts are still facts', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...some('separation-gap', 'separation-gap-stat'), { ...fixture('inline-compact'), id: 'compact-gap', props: { density: 'compact', separation: 'gap' } }] });
    for (const [id, density, apart] of [['separation-gap', 'regular', 12], ['compact-gap', 'compact', 6]] as const) {
      const gap = await resolveToken(page, T(`fact-gap-${density}`));
      expect(gap).toBe(apart);
      const count = fixture(id === 'compact-gap' ? 'inline-compact' : id).items!.length;
      for (let n = 2; n <= count; n++) {
        near((await edges(value(page, id, n))).top - (await edges(fact(page, id, n - 1).locator('> dd:last-of-type'))).bottom, gap, 0.1);
        expect(await fact(page, id, n).evaluate((el) => ['top', 'right', 'bottom', 'left'].map((side) => getComputedStyle(el).getPropertyValue(`border-${side}-width`)))).toEqual(Array(4).fill('0px'));
      }
      near((await edges(fact(page, id, 1))).top, (await edges(host(page, id))).top, 0.1);
      near((await edges(fact(page, id, count))).bottom, (await edges(host(page, id))).bottom, 0.1);
      await expect(list(page, id).getByRole('term')).toHaveCount(count);
    }
    // In columns: nothing is clipped where no line is drawn, and the first row begins at the list's top.
    expect(await css(list(page, 'separation-gap-stat'), 'clip-path')).toBe('none');
    near((await edges(value(page, 'separation-gap-stat', 1))).top, (await edges(host(page, 'separation-gap-stat'))).top, 0.1);
  });
});

test.describe('input, changes and what is exposed', () => {
  test('DSL-15: the list, its facts, its terms and its values take no input and no focus and change nothing they draw under a pointer, a press or focus; the list emits no event', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('inline', 'stat') });
    await page.evaluate(() => {
      document.body.insertAdjacentHTML('afterbegin', '<button id="before">before</button>');
      document.body.insertAdjacentHTML('beforeend', '<button id="after">after</button>');
      const w = window as unknown as { __events: string[] };
      w.__events = [];
      for (const name of ['change', 'input', 'toggle', 'select', 'close', 'open', 'focus', 'focusin']) document.querySelector('main')!.addEventListener(name, (event) => w.__events.push(event.type), true);
    });
    const parts = [host(page, 'inline'), list(page, 'inline'), fact(page, 'inline', 2), term(page, 'inline', 2), value(page, 'inline', 2)];
    for (const part of parts) expect(await part.evaluate((el) => [(el as HTMLElement).tabIndex, el.hasAttribute('tabindex'), el.getAttribute('role'), getComputedStyle(el).cursor])).toEqual([-1, false, null, 'auto']);
    const look = () =>
      Promise.all(parts.map((part) => part.evaluate((el) => { const s = getComputedStyle(el); return [s.backgroundColor, s.color, s.outlineStyle, s.boxShadow, s.opacity, s.textDecorationLine, getComputedStyle(el, '::before').content, getComputedStyle(el, '::after').content].join('|'); })));
    const rest = await look();
    await value(page, 'inline', 2).hover();
    expect(await look()).toEqual(rest);
    await page.mouse.down();
    expect(await look()).toEqual(rest);
    await page.mouse.up();
    expect(await look()).toEqual(rest);
    // Not a stop in the focus order: Tab goes from what is before the lists to what is after them.
    await page.locator('#before').focus();
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('after');
    expect(await page.evaluate(() => (window as unknown as { __events: string[] }).__events)).toEqual([]);
  });

  test('DSL-16: facts, a term or a value that change are drawn at once, without a motion, the list laid out again where a width changed with it, and nothing announces the change', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fx('own', {}, [f1('Plan', 'Team, yearly'), f1('Seats', '12')]), ...some('stat')] });
    await size(page, 'own', 320);
    expect(await drawn(page, 'own')).toBe('inline');
    const before = (await edges(value(page, 'own', 1))).left;
    // A longer term widens the term column of every fact…
    await term(page, 'own', 2).evaluate((el) => (el.textContent = 'Seats in use'));
    await expect.poll(async () => (await edges(value(page, 'own', 1))).left).toBeGreaterThan(before);
    near((await edges(value(page, 'own', 1))).left, (await textBox(term(page, 'own', 2))).right + (await resolveToken(page, T('term-gap-regular'))), 1);
    // …and one that leaves the values too little room stacks the list, and back.
    await term(page, 'own', 2).evaluate((el) => (el.textContent = 'The number of seats this subscription has in use today'));
    await expect.poll(() => drawn(page, 'own')).toBe('stacked');
    await term(page, 'own', 2).evaluate((el) => (el.textContent = 'Seats'));
    await expect.poll(() => drawn(page, 'own')).toBe('inline');
    // A value and a fact that change are drawn.
    await value(page, 'own', 2).evaluate((el) => (el.textContent = '13'));
    await expect(value(page, 'own', 2)).toHaveText('13');
    await list(page, 'own').evaluate((el) => el.insertAdjacentHTML('beforeend', '<div><dt>Renews</dt><dd>2 March 2027</dd></div>'));
    await expect(value(page, 'own', 3)).toBeVisible();
    near((await edges(value(page, 'own', 3))).left, (await edges(value(page, 'own', 1))).left);
    expect(await px(fact(page, 'own', 3), 'border-top-width')).toBe(await resolveToken(page, T('divider-thickness')));
    // Nothing moves and nothing speaks.
    for (const part of [host(page, 'own'), list(page, 'own'), fact(page, 'own', 3), term(page, 'own', 3), value(page, 'own', 3)]) {
      expect(await css(part, 'transition-duration')).toBe('0s');
      expect(await css(part, 'animation-name')).toBe('none');
      expect(await part.evaluate((el) => [el.getAttribute('aria-live'), el.getAttribute('role'), el.getAttribute('aria-atomic')])).toEqual([null, null, null]);
    }
  });

  test('DSL-17: every fixture is a description list of terms each followed by its values, term first — also while stacked by its width, in columns and drawn as stat; a term is no heading and the list has no name', async ({ page }) => {
    await mountFixtures(page, spec);
    for (const f of spec.fixtures) {
      const items = f.items!;
      const dl = list(page, f.id);
      // The structure is the browser's own: the native elements, with no role written on any of them.
      expect(await dl.evaluate((el) => [el.localName, el.getAttribute('role'), el.getAttribute('aria-label'), el.getAttribute('aria-labelledby')]), f.id).toEqual(['dl', null, null, null]);
      expect(await host(page, f.id).evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label'), el.getAttribute('aria-labelledby'), el.shadowRoot])).toEqual([null, null, null, null]);
      expect(await dl.evaluate((el) => [...el.querySelectorAll('*')].filter((part) => part.hasAttribute('role') && !part.closest('tanrei-tag')).length)).toBe(0);
      expect(await dl.evaluate((el) => [...el.children].map((group) => [...group.children].map((part) => part.localName))), f.id).toEqual(items.map((item) => ['dt', ...valuesOf(item).map(() => 'dd')]));
      await expect(dl.getByRole('term'), f.id).toHaveCount(items.length);
      await expect(dl.getByRole('definition'), f.id).toHaveCount(items.reduce((sum, item) => sum + valuesOf(item).length, 0));
      await expect(dl.getByRole('heading'), f.id).toHaveCount(0);
      expect(await dl.getByRole('term').allTextContents(), f.id).toEqual(items.map((item) => String(item.props.term)));
    }
    // Term first, whatever is drawn first.
    await expect(list(page, 'stat-note')).toMatchAriaSnapshot(`
      - term: orders this week
      - definition: 1,284
      - definition: up 12 % since last week
      - term: median build time
      - definition: 4 min 12 s
      - definition: down 30 s since last week
    `);
    expect(await drawn(page, 'inline-falls-back')).toBe('stacked');
    await expect(list(page, 'inline-falls-back')).toMatchAriaSnapshot(`
      - term: /The address that receipts/
      - definition: billing@example.com
      - term: Plan
      - definition: Team, yearly
    `);
    await expect(list(page, 'columns')).toMatchAriaSnapshot(`
      - term: Category
      - definition: Actions
      - term: Wave
      - definition: "1"
      - term: Tokens
      - definition: comp.button
    `);
  });

  test('no axe violations in light and dark', async ({ page }) => {
    test.setTimeout(120_000);
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id} (${v.nodes.map((n) => n.target.join(' ')).join('; ')})`).join(', ')}`).toEqual([]);
    }
  });
});

test.describe('direction, text size, forced colors, unknown values', () => {
  test('DSL-18: the direction is that of the nearest ancestor that sets one — the list has no setting of its own — and a change of it is drawn at once, with no motion, keeping what it shows', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...some('rtl', 'inline'), { ...fixture('inline'), id: 'nested', direction: undefined }] });
    // On an ancestor inside the page, not on the root.
    expect(await page.evaluate(() => document.documentElement.getAttribute('dir'))).toBeNull();
    expect(await host(page, 'rtl').evaluate((el) => [el.getAttribute('dir'), 'direction' in el, getComputedStyle(el).direction])).toEqual([null, false, 'rtl']);
    const side = async (id: string) => ((await edges(term(page, id, 1))).left < (await edges(value(page, id, 1))).left ? 'terms at the left' : 'terms at the right');
    expect([await side('rtl'), await side('inline'), await side('nested')]).toEqual(['terms at the right', 'terms at the left', 'terms at the left']);
    // Changed after the first render.
    const texts = await list(page, 'nested').locator('dt, dd').allTextContents();
    await stage(page, 'nested').evaluate((el) => el.setAttribute('dir', 'rtl'));
    expect(await side('nested')).toBe('terms at the right');
    near((await edges(term(page, 'nested', 1))).right, (await edges(host(page, 'nested'))).right);
    expect(await list(page, 'nested').locator('dt, dd').allTextContents()).toEqual(texts);
    expect(await css(term(page, 'nested', 1), 'transition-duration')).toBe('0s');
    await stage(page, 'nested').evaluate((el) => el.setAttribute('dir', 'ltr'));
    expect(await side('nested')).toBe('terms at the left');
    await stage(page, 'rtl').evaluate((el) => el.removeAttribute('dir'));
    expect(await side('rtl')).toBe('terms at the left');
  });

  test('DSL-19: in a right-to-left layout the term column is at the right and the value column at its left, every term and value begins at the right edge of its column, columns of facts fill from the right, and every gap is applied by start and end', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...some('rtl', 'rtl-stat'), { ...fixture('inline-falls-back'), id: 'rtl-stacked', props: { layout: 'stacked' }, direction: 'rtl' }] });
    const gap = await resolveToken(page, T('term-gap-regular'));
    const wrapper = await edges(host(page, 'rtl'));
    const count = fixture('rtl').items!.length;
    const narrowest = Math.min(...(await Promise.all(Array.from({ length: count }, (_, i) => textBox(term(page, 'rtl', i + 1))))).map((t) => t.left));
    for (let n = 1; n <= count; n++) {
      const [t, v, tText, vText] = [await edges(term(page, 'rtl', n)), await edges(value(page, 'rtl', n)), await textBox(term(page, 'rtl', n)), await textBox(value(page, 'rtl', n))];
      near(t.right, wrapper.right);
      near(tText.right, wrapper.right, 1);
      near(v.right, narrowest - gap, 1);
      near(vText.right, v.right, 1);
      near(v.left, wrapper.left);
      expect(await css(term(page, 'rtl', n), 'text-align')).toBe('right');
    }
    // Columns fill from the right.
    const stat = await edges(host(page, 'rtl-stat'));
    const facts = await Promise.all([1, 2, 3].map((n) => edges(fact(page, 'rtl-stat', n))));
    near(facts[0].right, stat.right);
    expect(facts[1].right).toBeLessThan(facts[0].left);
    expect(facts[2].right).toBeLessThan(facts[1].left);
    near(facts[0].left - facts[1].right, await resolveToken(page, T('column-gap')), 0.1);
    for (const n of [1, 2, 3]) near((await textBox(value(page, 'rtl-stat', n))).right, facts[n - 1].right, 1);
    // Stacked: both at the right edge of the fact's column.
    near((await textBox(term(page, 'rtl-stacked', 2))).right, (await edges(host(page, 'rtl-stacked'))).right, 1);
    near((await textBox(value(page, 'rtl-stacked', 2))).right, (await edges(host(page, 'rtl-stacked'))).right, 1);
  });

  test('DSL-20: the text of each term and each value is text of its own direction, isolated, placed and aligned by the layout direction; a version, an address and an amount keep their order in a right-to-left layout, and the digits of a number are never reversed', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('ltr-values-rtl', 'rtl-stat', 'rtl') });
    const id = 'ltr-values-rtl';
    for (const n of [1, 2, 3]) {
      const v = value(page, id, n);
      expect(await css(v, 'unicode-bidi')).toBe('plaintext');
      expect(await css(term(page, id, n), 'unicode-bidi')).toBe('plaintext');
      // Its own order: the first character is at the left of the last…
      const drawnEnds = await ends(v);
      expect(drawnEnds.first, await v.textContent() as string).toBeLessThan(drawnEnds.last);
      // …and its place the layout's: it begins at the right edge of the value column.
      near((await textBox(v)).right, (await edges(v)).right, 1);
      expect(await css(v, 'text-align')).toBe('right');
    }
    expect(await value(page, id, 3).textContent()).toBe('-12.50 USD');
    // The verify: 1,284 and 98.6 %, not their mirror images.
    for (const n of [1, 2]) {
      const drawnEnds = await ends(value(page, 'rtl-stat', n));
      expect(drawnEnds.first).toBeLessThan(drawnEnds.last);
    }
    // An Arabic term reads from the right: its first character is at the right of its last.
    const arabic = await ends(term(page, 'rtl', 1));
    expect(arabic.first).toBeGreaterThan(arabic.last);
  });

  test('DSL-21: at 200 % text and a 320 wide window every fixture’s text is whole and grown, gaps and lines kept, the least width grown with it — an inline list draws its terms above their values and stat is in one or two columns — and nothing scrolls sideways; raised text spacing loses nothing', async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 320, height: 800 });
    await mountFixtures(page, spec);
    await page.waitForFunction(() => !!customElements.get('tanrei-tag'));
    const normal = { term: await px(term(page, 'inline', 1), 'font-size'), value: await px(value(page, 'inline', 1), 'font-size'), figure: await px(value(page, 'stat', 1), 'font-size'), line: await px(fact(page, 'inline', 2), 'border-top-width'), gap: await px(fact(page, 'inline', 2), 'padding-top'), least: await resolveToken(page, T('column-min-width')) };
    // At the default size the four facts of `inline` have room for two columns in 288.
    expect(await drawn(page, 'inline')).toBe('inline');
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    await frame(page);
    expect(await px(term(page, 'inline', 1), 'font-size')).toBe(normal.term * 2);
    expect(await px(value(page, 'inline', 1), 'font-size')).toBe(normal.value * 2);
    expect(await px(value(page, 'stat', 1), 'font-size')).toBe(normal.figure * 2);
    expect(await px(fact(page, 'inline', 2), 'border-top-width')).toBeGreaterThanOrEqual(normal.line);
    expect(await px(fact(page, 'inline', 2), 'padding-top')).toBeGreaterThanOrEqual(normal.gap);
    // The least width grows by the same factor, and the lists are laid out again by it.
    expect(await resolveToken(page, T('column-min-width'))).toBe(normal.least * 2);
    await expect.poll(() => drawn(page, 'inline')).toBe('stacked');
    expect(await columnsOf(page, 'stat')).toBeLessThanOrEqual(2);
    expect(await columnsOf(page, 'columns')).toBe(1);
    const whole = async (label: string) => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth), label).toBeLessThanOrEqual(320);
      for (const f of spec.fixtures) {
        expect(await stage(page, f.id).evaluate((el) => el.scrollWidth <= el.clientWidth), `${label} ${f.id}`).toBe(true);
        near((await edges(host(page, f.id))).width, 288, 0.1);
        // No fixed height, nothing cut: no part clips, and every part holds its text inside the list.
        const cut = await list(page, f.id).evaluate((el) => {
          const bounds = el.parentElement!.getBoundingClientRect();
          return [...el.querySelectorAll(':scope > div > :is(dt, dd)')].filter((part) => {
            const s = getComputedStyle(part);
            const range = document.createRange();
            range.selectNodeContents(part);
            const [outer, inner] = [part.getBoundingClientRect(), range.getBoundingClientRect()];
            const inside = inner.width === 0 || (inner.bottom <= outer.bottom + 1 && inner.top >= outer.top - 1 && inner.right <= bounds.right + 1 && inner.left >= bounds.left - 1);
            return s.overflow !== 'visible' || s.textOverflow !== 'clip' || !inside || part.getBoundingClientRect().bottom > bounds.bottom + 1;
          }).length;
        });
        expect(cut, `${label} ${f.id}`).toBe(0);
      }
    };
    await whole('200 %');
    // The reader's own spacing (WCAG 1.4.12).
    await page.addStyleTag({ content: 'tanrei-description-list :is(dt, dd) { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } tanrei-description-list p { margin-block-end: 2em !important; }' });
    await frame(page);
    await frame(page);
    await whole('text spacing');
  });

  test('DSL-22: in forced colors the lines between facts are the text color and so are the terms and the values, a term still told from its value by its text style and its place; nothing relies on a fill', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mountFixtures(page, spec, { fixtures: some('separation-divider', 'stat', 'separation-divider-columns') });
    const canvasText = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.color = 'CanvasText';
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    });
    for (const id of ['separation-divider', 'separation-divider-columns']) {
      const group = fact(page, id, id === 'separation-divider' ? 2 : 4);
      expect(await css(group, 'border-top-color'), id).toBe(canvasText);
      expect(await px(group, 'border-top-width')).toBe(await resolveToken(page, T('divider-thickness')));
    }
    // The text is the platform's to repaint; a browser whose emulation answers the media query and repaints nothing
    // (WebKit) still draws the lines above, which are this stylesheet's.
    const forced = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = 'rgb(1, 2, 3)';
      document.body.appendChild(probe);
      const repainted = getComputedStyle(probe).color !== 'rgb(1, 2, 3)';
      probe.remove();
      return repainted;
    });
    if (forced) for (const part of [term(page, 'separation-divider', 1), value(page, 'separation-divider', 1), value(page, 'stat', 1), term(page, 'stat', 1)]) expect(await css(part, 'color')).toBe(canvasText);
    // Told apart by style and place.
    expect(await px(term(page, 'separation-divider', 1), 'line-height')).not.toBe(await px(value(page, 'separation-divider', 1), 'line-height'));
    expect(await css(term(page, 'separation-divider', 1), 'font-weight')).toBe('500');
    expect((await edges(value(page, 'separation-divider', 1))).left).toBeGreaterThan((await edges(term(page, 'separation-divider', 1))).right);
    for (const id of ['separation-divider', 'stat', 'separation-divider-columns']) {
      expect(await list(page, id).evaluate((el) => [el, ...el.querySelectorAll('*')].every((part) => getComputedStyle(part).backgroundImage === 'none'))).toBe(true);
    }
  });

  test('DSL-23: a density the active design system does not have renders with the default’s tokens and a layout the spec does not have as inline, each reported; a density a design system adds is drawn from its tokens', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [
        { ...fixture('inline'), id: 'unknown-density', props: { density: 'roomy' } },
        { ...fixture('inline'), id: 'unknown-layout', props: { layout: 'grid' } },
        { ...fixture('inline'), id: 'added', props: { density: 'airy' } },
        ...some('inline'),
      ],
    });
    for (const id of ['unknown-density', 'unknown-layout']) {
      expect(await drawn(page, id), id).toBe('inline');
      expect(await px(term(page, id, 1), 'font-size')).toBe(await px(term(page, 'inline', 1), 'font-size'));
      expect(await px(fact(page, id, 2), 'padding-top')).toBe(await px(fact(page, 'inline', 2), 'padding-top'));
      near((await edges(value(page, id, 1))).left, (await edges(value(page, 'inline', 1))).left, 0.1);
    }
    await expect.poll(() => seen.filter((m) => m.includes('DSL-23') && m.includes('"roomy"')).length).toBe(1);
    expect(seen.filter((m) => m.includes('DSL-23') && m.includes('"grid"'))).toHaveLength(1);
    // A density a design system adds: its tokens, and the default's for those it leaves out.
    await override(page, { [T('fact-gap-airy')]: '20px', [T('term-gap-airy')]: '40px' });
    await host(page, 'added').evaluate((el) => {
      (el as unknown as { density: string }).density = 'regular';
    });
    await frame(page);
    await host(page, 'added').evaluate((el) => {
      (el as unknown as { density: string }).density = 'airy';
    });
    await expect.poll(async () => (await px(fact(page, 'added', 2), 'padding-top')) + (await px(fact(page, 'added', 2), 'border-top-width')) / 2).toBe(20);
    near((await edges(value(page, 'added', 1))).left - (await textBox(term(page, 'added', 4))).right, 40, 1);
    expect(await px(term(page, 'added', 1), 'font-size')).toBe(await px(term(page, 'inline', 1), 'font-size'));
  });
});

test.describe('the element and its stylesheet', () => {
  /** The fixtures' document with the stylesheet a page loads and no script: the list before its element is defined. */
  const withoutScript = async (page: P, fixtures: Fixture[]) => {
    const document = await fixturesDocument(spec, { fixtures });
    const script = document.lastIndexOf('<script type="module">');
    await page.setContent(`${document.slice(0, script)}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
  };
  const geometry = (page: P) =>
    page.evaluate(() =>
      [...document.querySelectorAll('.stage')].map((s) => [
        (s as HTMLElement).dataset.fixture,
        // Each part's place in its own stage: a stage that grows moves the stages under it, and they are not what moved.
        ...[s, ...s.querySelectorAll('tanrei-description-list, dl, dl > div, dt, dd')].map((part) => {
          const [r, origin] = [part.getBoundingClientRect(), s.getBoundingClientRect()];
          return [r.left - origin.left, r.top - origin.top, r.width, r.height].map((n) => Math.round(n * 100) / 100).join(' ');
        }),
      ]),
    );

  test('the stylesheet alone draws every fixture, and defining the element moves nothing — but the one list that stacks by its width, which wraps its terms until then (DSL-1, DSL-4, DSL-16)', async ({ page }) => {
    // The tags fixture holds another component, whose own definition draws it: it is left out of this measure.
    const fixtures = spec.fixtures.filter((f) => f.id !== 'tags');
    await withoutScript(page, fixtures);
    expect(await page.evaluate(() => customElements.get('tanrei-description-list'))).toBeUndefined();
    // Drawn without script: the term column, the columns of facts, the figure, the lines and the density.
    expect(await drawn(page, 'inline')).toBe('inline');
    near((await edges(value(page, 'inline', 1))).left, (await textBox(term(page, 'inline', 4))).right + (await resolveToken(page, T('term-gap-regular'))), 1);
    expect(await columnsOf(page, 'stat')).toBe(4);
    expect(await columnsOf(page, 'columns-legend')).toBe(3);
    expect(await px(value(page, 'stat', 1), 'font-size')).toBe(await resolveToken(page, T('stat-value-typescale-regular-font-size')));
    expect(await px(fact(page, 'separation-divider', 2), 'border-top-width')).toBe(await resolveToken(page, T('divider-thickness')));
    expect(await px(term(page, 'inline-compact', 1), 'font-size')).toBe(await resolveToken(page, T('term-typescale-compact-font-size')));
    expect(await drawn(page, 'stacked')).toBe('stacked');
    // DSL-4 without script: the term is wrapped beside its value, which keeps the least width; nothing is cut.
    expect(await drawn(page, 'inline-falls-back')).toBe('inline');
    expect(await lines(term(page, 'inline-falls-back', 1))).toBeGreaterThan(1);
    near((await edges(value(page, 'inline-falls-back', 1))).width, await resolveToken(page, T('column-min-width')), 0.1);
    expect(await stage(page, 'inline-falls-back').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    const before = await geometry(page);
    await page.addScriptTag({ content: fs.readFileSync(path.join(pkg, 'dist/tanrei.bundle.js'), 'utf8'), type: 'module' });
    await page.waitForFunction(() => !!customElements.get('tanrei-description-list'));
    await frame(page);
    await expect(host(page, 'inline')).toHaveAttribute('data-stacks-below', /^\d+(\.\d+)?$/);
    const after = await geometry(page);
    const moved = after.filter((s, i) => JSON.stringify(s) !== JSON.stringify(before[i])).map((s) => s[0]);
    expect(moved).toEqual(['inline-falls-back']);
    expect(await drawn(page, 'inline-falls-back')).toBe('stacked');
    // Nothing is written on a list that is not inline, and nothing on any term or value.
    expect(await host(page, 'stat').evaluate((el) => el.hasAttribute('data-stacks-below'))).toBe(false);
    expect(await page.evaluate(() => [...document.querySelectorAll('tanrei-description-list :is(div, dt, dd)')].filter((part) => part.attributes.length > 0).length)).toBe(0);
  });

  test('the element brings its stylesheet to the root it is connected to: a list in another component’s shadow root is drawn and stacks by its own width (DSL-3, DSL-4)', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('inline') });
    await page.evaluate(() => {
      const outer = document.createElement('div');
      outer.id = 'outer';
      outer.style.inlineSize = '400px';
      const root = outer.attachShadow({ mode: 'open' });
      root.innerHTML = '<tanrei-description-list density="compact"><dl><div><dt><span style="display: inline-block; inline-size: 96px">Term</span></dt><dd>A value</dd></div></dl></tanrei-description-list>';
      document.body.append(outer);
    });
    const inner = page.locator('#outer tanrei-description-list');
    await expect(inner).toHaveAttribute('data-stacks-below', '248');
    expect(await inner.evaluate((el) => (el.getRootNode() as ShadowRoot).adoptedStyleSheets.length)).toBeGreaterThan(1);
    expect(await px(inner.locator('dt'), 'font-size')).toBe(await resolveToken(page, T('term-typescale-compact-font-size')));
    expect((await edges(inner.locator('dd'))).left).toBeGreaterThan((await edges(inner.locator('dt'))).right);
    await page.locator('#outer').evaluate((el) => ((el as HTMLElement).style.inlineSize = '247px'));
    expect((await edges(inner.locator('dd'))).top).toBeGreaterThanOrEqual((await edges(inner.locator('dt'))).bottom);
  });

  test('a list without groups is drawn in one column, inline or stacked, with the line above each term that follows a value; columns and stat need the groups, which is reported; a list inside a value is the product’s (DSL-3, DSL-5, DSL-7, DSL-10, DSL-12)', async ({ page }) => {
    const seen = warnings(page);
    const bare = '<dl><dt>Category</dt><dd>Actions</dd><dt>Owners</dt><dd>Aiko Tanaka</dd><dd>Samir Haddad</dd><dt>Wave</dt><dd>1</dd></dl>';
    await mountFixtures(page, spec, {
      fixtures: [raw('bare', {}, bare), raw('bare-stacked', { layout: 'stacked' }, bare), raw('bare-stat', { layout: 'stat', columns: 3 }, bare), raw('bare-gap', { separation: 'gap' }, bare), raw('nested', {}, '<dl><div><dt>Outer</dt><dd><dl id="inner"><dt>Inner term</dt><dd>Inner value</dd></dl></dd></div></dl>')],
    });
    const part = (id: string, selector: string) => list(page, id).locator(`> ${selector}`);
    const [thickness, gap, termGap, stack] = [await resolveToken(page, T('divider-thickness')), await resolveToken(page, T('fact-gap-regular')), await resolveToken(page, T('term-gap-regular')), await resolveToken(page, T('stack-gap'))];
    // Inline: the terms in one column, the values in the other, several values under one another.
    const owners = await textBox(part('bare', 'dt:nth-of-type(2)'));
    for (const n of [1, 2, 3, 4]) near((await textBox(part('bare', `dd:nth-of-type(${n})`))).left, (await textBox(part('bare', 'dt:nth-of-type(1)'))).right + termGap, 1);
    near((await textBox(part('bare', 'dd:nth-of-type(2)'))).top, owners.top, 3);
    near((await edges(part('bare', 'dd:nth-of-type(3)'))).top - (await edges(part('bare', 'dd:nth-of-type(2)'))).bottom, stack, 0.1);
    // One line above each term that follows a value, across both columns, with the gap on each side of it.
    for (const selector of ['dt:nth-of-type(2)', 'dd:nth-of-type(2)', 'dt:nth-of-type(3)', 'dd:nth-of-type(4)']) expect(await px(part('bare', selector), 'border-top-width'), selector).toBe(thickness);
    for (const selector of ['dt:nth-of-type(1)', 'dd:nth-of-type(1)', 'dd:nth-of-type(3)']) expect(await px(part('bare', selector), 'border-top-width'), selector).toBe(0);
    near((await edges(part('bare', 'dd:nth-of-type(2)'))).left, (await edges(part('bare', 'dt:nth-of-type(2)'))).right, 0.1);
    near((await edges(part('bare', 'dd:nth-of-type(2)'))).right, (await edges(host(page, 'bare'))).right, 0.1);
    const above = async (id: string) => (await edges(part(id, 'dd:nth-of-type(2)'))).top + (await px(part(id, 'dd:nth-of-type(2)'), 'border-top-width')) + (await px(part(id, 'dd:nth-of-type(2)'), 'padding-top')) - (await edges(part(id, 'dd:nth-of-type(1)'))).bottom;
    near(await above('bare'), 2 * gap, 0.1);
    near(await above('bare-gap'), gap, 0.1);
    // Stacked, and stat and columns without groups: one column, each value under its term.
    for (const id of ['bare-stacked', 'bare-stat']) {
      near((await edges(part(id, 'dd:nth-of-type(1)'))).left, (await edges(part(id, 'dt:nth-of-type(1)'))).left, 0.1);
      near((await edges(part(id, 'dd:nth-of-type(1)'))).top - (await edges(part(id, 'dt:nth-of-type(1)'))).bottom, stack, 0.1);
      expect(await px(part(id, 'dt:nth-of-type(2)'), 'border-top-width')).toBe(thickness);
      near((await edges(part(id, 'dt:nth-of-type(1)'))).top, (await edges(host(page, id))).top, 0.1);
    }
    await expect.poll(() => seen.filter((m) => m.includes('DSL-7') && m.includes('need each fact in a group')).length).toBe(1);
    // A list inside a value is not drawn by this one.
    expect(await css(page.locator('#inner'), 'display')).toBe('block');
    expect(await css(page.locator('#inner > dt'), 'color')).not.toBe(await resolveColor(page, T('term-color')));
  });
});

test.describe('fixtures', () => {
  test('every fixture of the spec is mounted', async ({ page }) => {
    await mountFixtures(page, spec);
    await page.waitForFunction(() => !!customElements.get('tanrei-tag'));
    expect(spec.fixtures).toHaveLength(26);
    for (const f of spec.fixtures) {
      await expect(host(page, f.id), f.id).toHaveCount(1);
      await expect(list(page, f.id), f.id).toBeVisible();
      for (const prop of ['layout', 'columns', 'density', 'separation'] as const) {
        expect(await host(page, f.id).getAttribute(prop), `${f.id} ${prop}`).toBe(f.props[prop] === undefined ? null : String(f.props[prop]));
      }
      if (f.direction) await expect(stage(page, f.id)).toHaveAttribute('dir', f.direction);
      // Nothing scrolls sideways, and every fixture is drawn in the layout it names — but the one that falls back.
      expect(await stage(page, f.id).evaluate((el) => el.scrollWidth <= el.clientWidth), f.id).toBe(true);
      if (f.props.layout === 'stat') expect((await edges(value(page, f.id, 1))).bottom, f.id).toBeLessThanOrEqual((await edges(term(page, f.id, 1))).top);
      else expect(await drawn(page, f.id), f.id).toBe(f.props.layout === 'stacked' || f.id === 'inline-falls-back' ? 'stacked' : 'inline');
      if (f.props.columns) expect(await columnsOf(page, f.id), f.id).toBe(Math.min(Number(f.props.columns), f.items!.length));
    }
    await expect(list(page, 'tags').locator('tanrei-tag')).toHaveCount(4);
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec);
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
