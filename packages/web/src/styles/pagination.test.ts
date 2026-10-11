// `.tanrei-pagination` (pagination.css, src/pagination.ts), driven by specs/pagination.spec.json: every behaviour id
// (PGN-1…22) is cited by a test title, every fixture has a baseline, and every length, color and time is read back from
// the tokens, never from a number written here. A fixture cannot set a width, so the stacked form (PGN-5) is a test
// that sets the stage's width; several fixtures share a landmark's name, so the tests of the name give their own markup.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { acmeSystemCss, fixtureHost, fixturesDocument, loadSpec, mountFixtures, resolveColor, resolveToken, tab, tabTo, rootTokens } from '../../test/harness.js';
import { drawnOpticalSize, opticalSize } from '../../test/icons.js';
import { expectPressHeldAtEveryMoment } from '../../test/held-press.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '../..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

const spec = loadSpec('pagination');
type P = Page;
type Direction = 'previous' | 'next';
const T = (name: string) => `--tanrei-comp-pagination-${name}`;
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const nav = (page: P, id: string) => fixtureHost(page, spec, id);
const item = (page: P, id: string, direction: Direction) => nav(page, id).locator(`.tanrei-pagination-item[data-direction="${direction}"]`);
/** The pseudo-element that is an item's arrow, and the one that is its hit area. */
const ARROW: Record<Direction, string> = { previous: '::before', next: '::after' };
const TARGET: Record<Direction, string> = { previous: '::after', next: '::before' };

interface MountOptions { system?: string; systemCss?: string; dir?: 'ltr' | 'rtl'; direction?: 'ltr' | 'rtl'; theme?: 'light' | 'dark' }
/** A window of its own for every mount: the script of the document before would still be observing (see link.test.ts). */
const fresh = (page: P) => page.goto('about:blank');
const mountSpec = async (page: P, ids: string[] = [], options: MountOptions = {}) => {
  await fresh(page);
  await mountFixtures(page, spec, { icons: true, ...(ids.length ? { fixtures: spec.fixtures.filter((f) => ids.includes(f.id)) } : {}), ...options });
};
/** A stage holding `html` as it is: the fixture `t`. */
const mount = async (page: P, html: string, { direction, ...options }: MountOptions = {}) => {
  await fresh(page);
  await mountFixtures(page, spec, { icons: true, fixtures: [{ id: 't', props: {}, content: html, ...(direction ? { direction } : {}) }], ...options });
};
const anchor = (direction: Direction, { href = `#${direction}`, label = direction === 'previous' ? 'Previous' : 'Next', title = direction === 'previous' ? 'Installation' : 'Design tokens', attributes = '' } = {}) =>
  `<a class="tanrei-pagination-item" data-direction="${direction}" ${href === null ? '' : `href="${href}"`} ${attributes}><span class="tanrei-pagination-label">${label}</span><span class="tanrei-pagination-title">${title}</span></a>`;
const pages = (inner = `${anchor('previous')}${anchor('next')}`, attributes = 'aria-label="Pages"') => `<nav class="tanrei-pagination" ${attributes}>${inner}</nav>`;
/** A page with the stylesheets and NO script of the package: what the stylesheet alone does. */
const bare = (page: P, body: string) =>
  page.setContent(`<!doctype html><html lang="en" data-tanrei-theme="light"><head><meta charset="utf-8"><title>pagination</title>
    <style>${read('dist/tokens.css')}</style><style>${read('dist/icons.css')}</style><style>${read('dist/pagination.css')}</style>
    <style>body { margin: 16px; inline-size: 720px; background: var(--tanrei-sys-color-surface); }</style>
    </head><body>${body}</body></html>`);

const css = (target: Locator, property: string, pseudo?: string): Promise<string> =>
  target.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const px = async (target: Locator, property: string, pseudo?: string) => Number.parseFloat(await css(target, property, pseudo));
interface Box { x: number; y: number; width: number; height: number; right: number; bottom: number }
const box = (target: Locator): Promise<Box> => target.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; });
/** The box of the text an element holds, over all its lines. */
const textBox = (target: Locator): Promise<Box> =>
  target.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0);
    const [x, y, right, bottom] = [Math.min(...rects.map((r) => r.left)), Math.min(...rects.map((r) => r.top)), Math.max(...rects.map((r) => r.right)), Math.max(...rects.map((r) => r.bottom))];
    return { x, y, right, bottom, width: right - x, height: bottom - y };
  });
const near = (actual: number, expected: number, what: string, tolerance = 0.5) => expect(Math.abs(actual - expected), `${what}: ${actual} ≠ ${expected}`).toBeLessThanOrEqual(tolerance);

const rgba = (color: string): number[] => {
  const srgb = /^color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.e-]+))?\)$/.exec(color);
  if (srgb) return [...srgb.slice(1, 4).map((c) => Math.round(Number(c) * 255)), Math.round(Number(srgb[4] ?? 1) * 100) / 100];
  const parts = color.match(/[\d.]+/g)?.map(Number) ?? [];
  return [...parts.slice(0, 3).map(Math.round), Math.round((parts[3] ?? 1) * 100) / 100];
};
const color = async (page: P, name: string) => rgba(await resolveColor(page, name));
/** A color of `target` once it has settled: a state changes over the motion tokens (PGN-13). */
const drawn = async (target: Locator, property: string, pseudo?: string) => {
  let last = await css(target, property, pseudo);
  for (let reads = 0; reads < 60; reads++) {
    await target.page().waitForTimeout(20);
    const now = await css(target, property, pseudo);
    if (now === last && !/^(oklab|oklch|lab|lch)\(/.test(now)) break;
    last = now;
  }
  return rgba(last);
};
/** A token as a real property computes it (a token may be an expression). */
const computed = (page: P, property: string, name: string) =>
  page.evaluate(([p, token]) => { const probe = document.createElement('i'); probe.style.setProperty(p, `var(${token})`); document.body.append(probe); const value = getComputedStyle(probe).getPropertyValue(p); probe.remove(); return value; }, [property, name] as const);
/** Debug reports of the page so far. */
const reports = (page: P) => {
  const seen: string[] = [];
  page.on('console', (message) => { if (message.type() === 'warning' && message.text().includes('[tanrei]')) seen.push(message.text()); });
  return seen;
};
const hoverless = async (page: P) => page.mouse.move(0, 0);
const keepHere = (target: Locator) => target.evaluate((el) => el.addEventListener('click', (e) => e.preventDefault()));

test.describe('the stylesheet', () => {
  test('every value is a token: no literal color, length, duration or opacity', () => {
    const body = read('src/styles/pagination.css').replace(/\/\*[\s\S]*?\*\//g, '');
    const literals = [...body.matchAll(/:\s*([^;{}]+);/g)]
      .map((m) => m[1].replace(/var\([^()]*(\([^()]*\))*[^()]*\)/g, '').replace(/calc\(|\)/g, ''))
      .flatMap((value) => value.match(/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsl|\b\d*\.?\d+(px|rem|em|ms|s)\b/gi) ?? []);
    // `0px` and `0s` are nothing: the floor of the hit area's reach, and a change that takes no time.
    expect(literals.filter((literal) => !['0px', '0s'].includes(literal))).toEqual([]);
  });

  test('a rule has no specificity: one class of the product wins, even in the same layer and written first; the corner rule is the shared one (PGN-12)', async ({ page }) => {
    await mount(page, `<style>@layer tanrei.components { .mine { row-gap: 3px; } .mine > .one { padding: 7px; } .mine .word { letter-spacing: 3px; } }</style><nav class="tanrei-pagination mine" aria-label="Pages"><a class="tanrei-pagination-item one" href="#a"><span class="tanrei-pagination-label word">Next</span></a></nav>`);
    expect(await css(page.locator('.mine'), 'row-gap')).toBe('3px');
    expect(await css(page.locator('.one'), 'padding-top')).toBe('7px');
    expect(await css(page.locator('.word'), 'letter-spacing')).toBe('3px');
    const { SHAPE_CSS } = (await import(path.join(pkg, 'dist/styles/shape.js'))) as { SHAPE_CSS: string };
    expect(read('dist/pagination.css').replace(/\s+/g, ' ')).toContain(SHAPE_CSS.slice(SHAPE_CSS.indexOf('@supports'), SHAPE_CSS.indexOf('[data-tanrei-shape]::before')).replaceAll('[data-tanrei-shape]', ':where(.tanrei-pagination-item)').replace(/\s+/g, ' ').trim());
    expect(read('src/styles/pagination.css')).not.toContain('superellipse');
  });
});

test.describe('the landmark and its links', () => {
  test('PGN-1 one navigation landmark named by label, holding the previous item and then the next and nothing else, in the document and in the focus order, in both directions and whatever order the product gave; an empty label still renders and is reported', async ({ page }) => {
    for (const direction of ['ltr', 'rtl'] as const) {
      await mount(page, `<button id="before">before</button>${pages()}<button id="after">after</button>`, { direction });
      const landmark = page.getByRole('navigation', { name: 'Pages', exact: true });
      await expect(landmark).toHaveCount(1);
      expect(await landmark.evaluate((el) => [el.localName, [...el.children].map((child) => `${child.localName}:${child.getAttribute('data-direction')}`).join(' ')])).toEqual(['nav', 'a:previous a:next']);
      await page.locator('#before').focus();
      const order: string[] = [];
      for (let i = 0; i < 3; i++) { await tab(page); order.push(await page.evaluate(() => document.activeElement?.getAttribute('data-direction') ?? document.activeElement?.id ?? '')); }
      expect(order, direction).toEqual(['previous', 'next', 'after']);
    }
    // Given next-first: the script puts them previous-first; the stylesheet alone already draws them so.
    await mount(page, `<button id="before">before</button>${pages(`${anchor('next')}${anchor('previous')}`)}`);
    const landmark = page.locator('.tanrei-pagination');
    await expect.poll(() => landmark.evaluate((el) => [...el.children].map((child) => child.getAttribute('data-direction')))).toEqual(['previous', 'next']);
    await page.locator('#before').focus();
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.getAttribute('data-direction'))).toBe('previous');
    await page.goto('about:blank');
    await bare(page, pages(`${anchor('next')}${anchor('previous')}`));
    expect((await box(page.locator('[data-direction="previous"]'))).x).toBeLessThan((await box(page.locator('[data-direction="next"]'))).x);
    // No name: it still renders, and a debug build is told.
    const seen = reports(page);
    await mount(page, pages(undefined, ''));
    await expect(page.locator('.tanrei-pagination-item')).toHaveCount(2);
    await expect(page.locator('.tanrei-pagination-item').first()).toBeVisible();
    await expect.poll(() => seen.filter((line) => line.includes('PGN-1'))).toHaveLength(1);
  });

  test('PGN-2 with scripting off an item is the document’s own anchor: two links with their href, rel prev and rel next, each named by its label and then its title, the arrow not in the name', async ({ browser, page }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const off = await context.newPage();
    const both = spec.fixtures.find((f) => f.id === 'both')!;
    await off.setContent((await fixturesDocument(spec, { icons: true, fixtures: [both] })).replace(/<script type="module">[\s\S]*<\/script>/, ''));
    const links = off.getByRole('link');
    await expect(links).toHaveCount(2);
    const next = off.getByRole('link', { name: 'Next Design tokens', exact: true });
    const previous = off.getByRole('link', { name: 'Previous Installation', exact: true });
    await expect(next).toHaveCount(1);
    await expect(previous).toHaveCount(1);
    expect(await next.evaluate((a: HTMLAnchorElement) => [a.localName, a.getAttribute('href'), a.rel, a.getRootNode() === document, [...document.links].includes(a)])).toEqual(['a', '/foundations/tokens/', 'next', true, true]);
    expect(await previous.evaluate((a: HTMLAnchorElement) => [a.getAttribute('href'), a.rel])).toEqual(['/getting-started/installation/', 'prev']);
    // The arrow: generated content whose alternative text is nothing, where the browser knows that form.
    const alt = await css(next, 'content', '::after');
    expect(alt).toContain('arrow_forward');
    if (alt.includes('/')) expect(alt.replace(/\s/g, '')).toMatch(/\/(""|'')$/);
    await context.close();
    // Without rel the script says how the destination relates to the page; one the product wrote is left.
    await mount(page, pages(`${anchor('previous')}${anchor('next', { attributes: 'rel="next nofollow"' })}`));
    await expect(page.locator('[data-direction="previous"]')).toHaveAttribute('rel', 'prev');
    await expect(page.locator('[data-direction="next"]')).toHaveAttribute('rel', 'next nofollow');
    await expect(page.getByRole('link', { name: 'Next Design tokens', exact: true })).toHaveCount(1);
  });

  test('PGN-3 an item without a destination is not drawn and not exposed; a script’s address, an unreadable one, an unknown direction and a second item of a direction are not drawn and are reported; with no destination at all nothing is drawn, no room is taken and there is no landmark', async ({ page }) => {
    await mountSpec(page, ['next-only']);
    await expect(nav(page, 'next-only').locator('a')).toHaveCount(2);
    await expect(nav(page, 'next-only').getByRole('link')).toHaveCount(1);
    expect(await css(item(page, 'next-only', 'previous'), 'display')).toBe('none');
    await expect(item(page, 'next-only', 'next')).toBeVisible();

    const seen = reports(page);
    await mount(page, [
      pages(`${anchor('previous', { href: '   ' })}${anchor('next')}`, 'aria-label="White space" id="space"'),
      pages(`${anchor('previous', { href: 'javascript:void(0)' })}${anchor('next')}`, 'aria-label="Script" id="script"'),
      pages(`${anchor('previous', { href: 'http://' })}${anchor('next')}`, 'aria-label="Unreadable" id="unreadable"'),
      pages(`${anchor('previous')}<a class="tanrei-pagination-item" data-direction="first" href="#first" id="unknown"><span class="tanrei-pagination-label">First</span></a>`, 'aria-label="Unknown" id="direction"'),
      pages(`${anchor('previous')}${anchor('next')}${anchor('next', { attributes: 'id="second"' })}`, 'aria-label="Twice" id="twice"'),
    ].join(''));
    for (const id of ['space', 'script', 'unreadable']) {
      const refused = page.locator(`#${id} [data-direction="previous"]`);
      await expect(refused, id).not.toHaveAttribute('href', /.*/);
      expect(await css(refused, 'display'), id).toBe('none');
      await expect(page.locator(`#${id}`).getByRole('link'), id).toHaveCount(1);
    }
    expect(await css(page.locator('#unknown'), 'display')).toBe('none');
    expect(await css(page.locator('#second'), 'display')).toBe('none');
    await expect(page.locator('#twice').getByRole('link')).toHaveCount(2);
    await expect.poll(() => seen.filter((line) => line.includes('PGN-3')).length).toBe(4);
    const said = seen.filter((line) => line.includes('PGN-3')).join('\n');
    for (const words of ['names a script', 'cannot be read', 'data-direction "first"', 'a second "next" item']) expect(said).toContain(words);
    // White space is no finding.
    expect(said).not.toContain('"   "');

    // No item has a destination.
    await mount(page, `<p id="before" style="margin:0">Before.</p>${pages(`${anchor('previous', { href: '' })}<a class="tanrei-pagination-item" data-direction="next"><span class="tanrei-pagination-label">Next</span></a>`)}<p id="after" style="margin:0">After.</p>`);
    expect(await css(page.locator('.tanrei-pagination'), 'display')).toBe('none');
    near((await box(page.locator('#after'))).y, (await box(page.locator('#before'))).bottom, 'no room', 0.05);
    await expect(page.getByRole('navigation')).toHaveCount(0);
    // A destination given later draws it.
    await page.locator('[data-direction="next"]').evaluate((a) => a.setAttribute('href', '#next'));
    expect(await css(page.locator('.tanrei-pagination'), 'display')).toBe('grid');
    await expect(page.getByRole('navigation', { name: 'Pages' })).toHaveCount(1);

    // The stylesheet alone: no href, an empty one, a script's.
    await page.goto('about:blank');
    await bare(page, `${pages(`${anchor('previous', { href: '' })}${anchor('next')}`, 'aria-label="One" id="one"')}${pages(`<a class="tanrei-pagination-item" data-direction="previous">x</a>${anchor('next', { href: 'JavaScript:void(0)' })}`, 'aria-label="None" id="none"')}`);
    expect(await css(page.locator('#one [data-direction="previous"]'), 'display')).toBe('none');
    expect(await css(page.locator('#one [data-direction="next"]'), 'display')).toBe('grid');
    expect(await css(page.locator('#none'), 'display')).toBe('none');
  });
});

test.describe('inside a prose', () => {
  for (const order of [['prose', 'pagination'], ['pagination', 'prose']] as const) {
    test(`PGN-2, PGN-10 (and PRS-16: a component placed in the flow keeps its own styles): a pagination inside a prose is drawn by its own rules and not as prose’s links, with ${order[1]}.css loaded last, and a press on an item is answered once`, async ({ page }) => {
      await mount(page, `<div id="out">${pages()}</div><div class="tanrei-prose"><p>Text with <a id="plain" href="#x">a link</a>.</p>${pages()}</div>`, { system: 'm3-like' });
      for (const name of order) await page.addStyleTag({ content: read(`dist/${name}.css`) });
      const next = (where: string) => page.locator(`${where} .tanrei-pagination-item[data-direction="next"]`);
      const [outside, inside] = [next('#out'), next('.tanrei-prose')];
      // Prose is there, and its own anchors are the Link's.
      expect(await css(page.locator('#plain'), 'text-decoration-line')).toBe('underline');
      for (const property of ['display', 'text-decoration-line', 'color', 'background-color', 'border-top-width', 'border-top-color', 'padding-top', 'padding-left', 'font-size', 'line-height', 'cursor', 'transition-property']) {
        expect(await css(inside, property), property).toBe(await css(outside, property));
      }
      for (const pseudo of ['::before', '::after']) {
        for (const property of ['content', 'position', 'inline-size', 'color']) expect(await css(inside, property, pseudo), `${pseudo} ${property}`).toBe(await css(outside, property, pseudo));
      }
      for (const part of ['.tanrei-pagination-label', '.tanrei-pagination-title']) {
        for (const property of ['font-size', 'color', 'text-decoration-line']) expect(await css(inside.locator(part), property), `${part} ${property}`).toBe(await css(outside.locator(part), property));
      }
      expect((await box(inside)).height, 'as tall as outside a prose').toBe((await box(outside)).height);
      // One press, one answer: the pagination's own script, and not the Link's as well.
      expect(await css(page.locator('html'), '--tanrei-sys-behavior-pressed-feedback')).toBe('ripple');
      await inside.scrollIntoViewIfNeeded();
      const place = await box(inside);
      await page.mouse.move(place.x + 30, place.y + place.height / 2);
      await page.mouse.down();
      await expect(inside).toHaveAttribute('data-pressed', 'ripple');
      await expect(inside.locator('.ripple')).toHaveCount(1);
      await page.mouse.up();
    });
  }
});

test.describe('layout', () => {
  test('PGN-4 the row is two columns of equal width, the gap apart, the previous item at the start and the next at the end, both as high as the taller; an item that is not drawn leaves its column empty, so the next item keeps its place and width', async ({ page }) => {
    await mountSpec(page, ['both', 'next-only', 'previous-only', 'long-titles']);
    const gap = await resolveToken(page, T('gap'));
    const outer = await box(nav(page, 'both'));
    expect(outer.width).toBe(720);
    const [previous, next] = [await box(item(page, 'both', 'previous')), await box(item(page, 'both', 'next'))];
    near(previous.width, (720 - gap) / 2, 'half the row less half the gap', 0.05);
    near(next.width, previous.width, 'equal widths', 0.01);
    near(previous.x, outer.x, 'the previous item at the start', 0.05);
    near(next.right, outer.right, 'the next item at the end', 0.05);
    near(next.x - previous.right, gap, 'the gap', 0.05);
    near(next.y, previous.y, 'one row', 0.01);
    // The taller of the two.
    const [long, other] = [await box(item(page, 'long-titles', 'previous')), await box(item(page, 'long-titles', 'next'))];
    near(long.height, other.height, 'equal heights', 0.01);
    expect(long.height).toBeGreaterThan(previous.height);
    near((await box(nav(page, 'long-titles'))).height, long.height, 'the row is as high as its items', 0.01);
    // Next alone: the same place and width.
    const alone = await box(item(page, 'next-only', 'next'));
    near(alone.x - (await box(nav(page, 'next-only'))).x, next.x - outer.x, 'the same place', 0.01);
    near(alone.width, next.width, 'the same width', 0.01);
    // Previous alone: the start column, the end one empty.
    const first = await box(item(page, 'previous-only', 'previous'));
    near(first.x, (await box(nav(page, 'previous-only'))).x, 'previous alone at the start', 0.05);
    near(first.width, previous.width, 'half the row', 0.01);
  });

  test('PGN-5 given less width than two minimum item widths and the gap, the items stack — each as wide as the pagination, previous above next, the gap between, no room for an item that is not drawn — by the width it is given, not the window’s', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await mount(page, `<div id="column">${pages()}</div><div id="alone">${pages(`${anchor('previous', { href: '' })}${anchor('next')}`, 'aria-label="First page"')}</div>`);
    await page.addStyleTag({ content: '.stage { padding: 0 !important; }' });
    const gap = await resolveToken(page, T('gap'));
    const least = await resolveToken(page, T('container-min-width'));
    const limit = 2 * least + gap;
    expect(limit).toBe(496);
    const column = page.locator('#column');
    const [previous, next] = [column.locator('[data-direction="previous"]'), column.locator('[data-direction="next"]')];
    const width = (value: number) => page.evaluate((w) => { for (const el of document.querySelectorAll<HTMLElement>('#column, #alone')) el.style.inlineSize = `${w}px`; }, value);
    // At the limit and above: a row.
    for (const wide of [limit, limit + 1, 720, 1200]) {
      await width(wide);
      const [a, b] = [await box(previous), await box(next)];
      near(a.y, b.y, `${wide}: one row`, 0.01);
      near(a.width, (wide - gap) / 2, `${wide}: two equal columns`, 0.05);
      near(b.right, (await box(column)).right, `${wide}: next at the end`, 0.05);
    }
    // Below it: stacked.
    for (const narrow of [limit - 1, 400, 320, 200]) {
      await width(narrow);
      const [a, b] = [await box(previous), await box(next)];
      near(a.width, narrow, `${narrow}: previous as wide as the pagination`, 0.05);
      near(b.width, narrow, `${narrow}: next as wide as the pagination`, 0.05);
      near(b.y - a.bottom, gap, `${narrow}: previous above next, the gap between`, 0.05);
      // No room kept for an item that is not drawn.
      const only = page.locator('#alone [data-direction="next"]');
      near((await box(page.locator('#alone .tanrei-pagination'))).height, (await box(only)).height, `${narrow}: next alone`, 0.01);
      near((await box(only)).y, (await box(page.locator('#alone'))).y, `${narrow}: next alone begins the pagination`, 0.01);
    }
    // The window did not change; and in a narrow window a wide container still draws a row.
    expect(page.viewportSize()!.width).toBe(1280);
    expect(read('src/styles/pagination.css').replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/@media[^{]*(width|inline-size)/);
    // A layer's own minimum width moves the limit.
    await width(600);
    near((await box(previous)).y, (await box(next)).y, 'a row at 600', 0.01);
    await page.addStyleTag({ content: ':root { --tanrei-comp-pagination-container-min-width: 320px; }' });
    expect((await box(next)).y).toBeGreaterThan((await box(previous)).bottom);
    // Given next-first and no script to reorder them, the stacked order is still previous, then next.
    await page.goto('about:blank');
    await bare(page, `<div style="inline-size:300px">${pages(`${anchor('next')}${anchor('previous')}`)}</div>`);
    expect((await box(page.locator('[data-direction="previous"]'))).bottom).toBeLessThanOrEqual((await box(page.locator('[data-direction="next"]'))).y);
  });

  test('PGN-6 an item is a container with the container shape and an edge inside it, its content the padding from the edge: the arrow in a box of the icon size at the start edge of the previous item and the end edge of the next, centred on the height, the gap from the text, whose lines begin at it', async ({ page }) => {
    await mountSpec(page, ['both', 'long-titles']);
    const [padding, gap, icon, edge, radius] = await Promise.all([T('container-padding'), T('container-gap'), T('icon-size'), T('outline-width'), T('container-shape')].map((name) => resolveToken(page, name)));
    expect([radius, edge, padding, icon, gap]).toEqual([8, 1, 16, 20, 12]);
    for (const id of ['both', 'long-titles']) {
      for (const direction of ['previous', 'next'] as const) {
        const one = item(page, id, direction);
        const outer = await box(one);
        expect(await px(one, 'border-top-left-radius')).toBe(radius);
        for (const side of ['top', 'right', 'bottom', 'left']) {
          expect(await px(one, `border-${side}-width`)).toBe(edge);
          expect(await css(one, `border-${side}-style`)).toBe('solid');
          // The edge is inside the item's size: the padding is counted from the item's own edge.
          expect((await px(one, `padding-${side}`)) + edge).toBe(padding);
        }
        expect(await css(one, 'box-sizing')).toBe('border-box');
        expect(rgba(await css(one, 'border-top-color'))).toEqual(await color(page, T('item-outline-color')));
        expect(rgba(await css(one, 'background-color'))).toEqual(await color(page, T('item-container-color')));
        // The arrow's box, and its place: a column of the item's grid at the edge the direction names.
        const arrow = ARROW[direction];
        expect([await px(one, 'width', arrow), await px(one, 'height', arrow)]).toEqual([icon, icon]);
        expect(await css(one, 'align-self', arrow)).toBe('center');
        expect(await px(one, 'column-gap')).toBe(gap);
        const columns = (await css(one, 'grid-template-columns')).split(' ').map(Number.parseFloat);
        expect(columns[direction === 'previous' ? 0 : 1]).toBe(icon);
        expect(await css(one, 'grid-column-start', arrow)).toBe(direction === 'previous' ? '1' : '2');
        // The text fills the rest, beside the arrow.
        for (const part of ['label', 'title']) {
          const text = await box(one.locator(`.tanrei-pagination-${part}`));
          if (direction === 'previous') {
            near(text.x, outer.x + padding + icon + gap, `${id} ${direction} ${part}: after the arrow`, 0.05);
            near(text.right, outer.right - padding, `${id} ${direction} ${part}: to the padding`, 0.05);
          } else {
            near(text.x, outer.x + padding, `${id} ${direction} ${part}: from the padding`, 0.05);
            near(text.right, outer.right - padding - icon - gap, `${id} ${direction} ${part}: before the arrow`, 0.05);
          }
        }
        // Its lines are aligned to the start in the previous item and to the end in the next.
        expect(await css(one.locator('.tanrei-pagination-title'), 'text-align')).toBe(direction === 'previous' ? 'left' : 'right');
        const title = await textBox(one.locator('.tanrei-pagination-title'));
        if (direction === 'previous') near(title.x, outer.x + padding + icon + gap, 'the title begins beside the arrow', 0.5);
        else near(title.right, outer.right - padding - icon - gap, 'the title ends beside the arrow', 0.5);
        // The content is centred on the item's height: the padding above the label and under the title where it is the taller.
        const [label, last] = [await box(one.locator('.tanrei-pagination-label')), await box(one.locator('.tanrei-pagination-title'))];
        near(label.y - outer.y, outer.bottom - last.bottom, `${id} ${direction}: centred`, 0.05);
        expect(label.y - outer.y).toBeGreaterThanOrEqual(padding - 0.05);
      }
    }
    // The verify of PGN-15's numbers: 16, a 16 line, 2, a 26 line, 16.
    near((await box(item(page, 'both', 'next'))).height, 76, '16, a 16 line, 2, a 26 line, 16', 0.05);
  });

  test('PGN-7 the label and the title are set in their text styles, the label gap apart, wrap and are never cut; without a title the label stands alone in the title’s style and color; without a label the title stands alone and it is reported', async ({ page }) => {
    const seen = reports(page);
    await mountSpec(page, ['both', 'long-titles', 'labels-only']);
    const one = item(page, 'both', 'next');
    const [label, title] = [one.locator('.tanrei-pagination-label'), one.locator('.tanrei-pagination-title')];
    expect(await px(label, 'font-size')).toBe(await resolveToken(page, T('label-typescale-font-size')));
    expect(await css(label, 'font-weight')).toBe(await computed(page, 'font-weight', T('label-typescale-font-weight')));
    expect(await px(title, 'font-size')).toBe(await resolveToken(page, T('title-typescale-font-size')));
    expect(await css(title, 'font-weight')).toBe(await computed(page, 'font-weight', T('title-typescale-font-weight')));
    near((await box(title)).y - (await box(label)).bottom, await resolveToken(page, T('label-gap')), 'the label gap', 0.05);
    expect(rgba(await css(label, 'color'))).toEqual(await color(page, T('item-label-color')));
    expect(rgba(await css(title, 'color'))).toEqual(await color(page, T('item-title-color')));
    expect(await css(title, 'text-decoration-line')).toBe('none');
    // Wrapped, nothing hidden.
    for (const direction of ['previous', 'next'] as const) {
      const long = item(page, 'long-titles', direction).locator('.tanrei-pagination-title');
      expect((await box(long)).height).toBeGreaterThan(2 * (await px(long, 'line-height')) - 1);
      expect([await css(long, 'overflow-x'), await css(long, 'text-overflow'), await css(long, 'white-space')]).toEqual(['visible', 'clip', 'normal']);
      expect(await long.evaluate((el) => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight)).toBe(true);
      const outer = await box(item(page, 'long-titles', direction));
      expect((await textBox(long)).bottom).toBeLessThanOrEqual(outer.bottom);
    }
    // A run with no place to break, longer than the line, breaks inside itself.
    await mount(page, pages(`${anchor('previous', { title: 'averyveryverylongidentifierwithoutanybreakopportunity_thatislongerthantheline_andmustbreakinsideitself' })}${anchor('next')}`));
    const run = page.locator('[data-direction="previous"] .tanrei-pagination-title');
    expect((await box(run)).height).toBeGreaterThan(await px(run, 'line-height'));
    expect((await textBox(run)).right).toBeLessThanOrEqual((await box(page.locator('[data-direction="previous"]'))).right);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    // Labels alone.
    await mountSpec(page, ['labels-only']);
    for (const [direction, text] of [['previous', 'Newer'], ['next', 'Older']] as const) {
      const alone = item(page, 'labels-only', direction).locator('.tanrei-pagination-label');
      await expect(alone).toHaveText(text);
      expect(await px(alone, 'font-size')).toBe(await resolveToken(page, T('title-typescale-font-size')));
      expect(await css(alone, 'font-weight')).toBe(await computed(page, 'font-weight', T('title-typescale-font-weight')));
      expect(rgba(await css(alone, 'color'))).toEqual(await color(page, T('item-title-color')));
      expect(await css(item(page, 'labels-only', direction).locator('.tanrei-pagination-title'), 'display')).toBe('none');
    }
    expect(seen.filter((line) => line.includes('PGN-7'))).toEqual([]);
    // No label: the title alone, and a report.
    await mount(page, pages(`${anchor('previous', { label: '' })}${anchor('next')}`));
    const untitled = page.locator('[data-direction="previous"]');
    await expect(untitled.locator('.tanrei-pagination-title')).toBeVisible();
    expect(await css(untitled.locator('.tanrei-pagination-label'), 'display')).toBe('none');
    expect(await px(untitled.locator('.tanrei-pagination-title'), 'margin-top')).toBe(0);
    await expect.poll(() => seen.filter((line) => line.includes('PGN-7'))).toHaveLength(1);
  });
});

test.describe('states', () => {
  const parts = async (page: P, one: Locator, direction: Direction) => ({
    container: await drawn(one, 'background-color'),
    outline: await drawn(one, 'border-top-color'),
    label: await drawn(one.locator('.tanrei-pagination-label'), 'color'),
    title: await drawn(one.locator('.tanrei-pagination-title'), 'color'),
    icon: await drawn(one, 'color', ARROW[direction]),
  });
  const tokens = async (page: P, state: '' | 'hovered-' | 'focused-' | 'pressed-') => ({
    container: await color(page, T(`item-${state}container-color`)),
    outline: await color(page, T(`item-${state}outline-color`)),
    label: await color(page, T(`item-${state}label-color`)),
    title: await color(page, T(`item-${state}title-color`)),
    icon: await color(page, T(`item-${state}icon-color`)),
  });

  test('PGN-8 under acme, where the three states differ, an item’s container, outline, label, title and arrow come from the tokens of the highest state — pressed over focused over hovered — and focus by pointer does not select the focused state', async ({ page }) => {
    await mountSpec(page, ['both'], { system: 'acme', systemCss: await acmeSystemCss() });
    const one = item(page, 'both', 'next');
    const [rest, hovered, focused, down] = [await tokens(page, ''), await tokens(page, 'hovered-'), await tokens(page, 'focused-'), await tokens(page, 'pressed-')];
    expect(new Set([rest, hovered, focused, down].map((state) => String(state.container))).size).toBe(4);
    expect(await parts(page, one, 'next')).toEqual(rest);
    await one.hover();
    await expect.poll(() => drawn(one, 'background-color')).toEqual(hovered.container);
    expect(await parts(page, one, 'next')).toEqual(hovered);
    expect(await css(one, 'opacity')).toBe(await computed(page, 'opacity', T('hovered-opacity')));
    await keepHere(one);
    await tabTo(page, one); // hovered AND keyboard-focused
    await expect.poll(() => drawn(one, 'background-color')).toEqual(focused.container);
    expect(await parts(page, one, 'next')).toEqual(focused);
    await page.keyboard.down('Enter'); // hovered AND focused AND pressed
    await expect.poll(() => drawn(one, 'background-color')).toEqual(down.container);
    expect(await parts(page, one, 'next')).toEqual(down);
    await page.keyboard.up('Enter');
    await expect.poll(() => drawn(one, 'background-color')).toEqual(focused.container);
    await page.mouse.down(); // the same with the pointer
    await expect.poll(() => drawn(one, 'background-color')).toEqual(down.container);
    await page.mouse.up();
    // The other item stayed at rest all along.
    expect(await parts(page, item(page, 'both', 'previous'), 'previous')).toEqual(rest);
    // Focus by pointer: a script focuses it the way a press does, and the focused tokens are not read.
    await mount(page, `<button id="b">b</button>${pages()}`, { system: 'acme', systemCss: await acmeSystemCss() });
    await page.locator('#b').click();
    const next = page.locator('[data-direction="next"]');
    await next.evaluate((el: HTMLElement) => el.focus());
    await hoverless(page);
    expect(await next.evaluate((el) => el.matches(':focus') && !el.matches(':focus-visible'))).toBe(true);
    // (Nothing is nothing: a color that came back to a clear fill keeps the channels of where it came from in one engine.)
    const unfocused = await drawn(next, 'background-color');
    expect(unfocused[3] === 0 && rest.container[3] === 0 ? rest.container : unfocused).toEqual(rest.container);
    expect(await css(next, 'outline-style')).toBe('none');
  });

  test('PGN-9 keyboard focus shows the system’s focus indicator around the item’s container, without animation; focus by pointer shows none', async ({ page }) => {
    await mountSpec(page, ['both']);
    const one = item(page, 'both', 'previous');
    expect(await css(one, 'outline-style')).toBe('none');
    await tabTo(page, one);
    expect(await css(one, 'outline-style')).toBe('solid');
    expect(await px(one, 'outline-width')).toBe(await resolveToken(page, '--tanrei-sys-focus-outer-width'));
    expect(await px(one, 'outline-offset')).toBe((await resolveToken(page, '--tanrei-sys-focus-offset')) + (await resolveToken(page, '--tanrei-sys-focus-inner-width')));
    expect(await drawn(one, 'outline-color')).toEqual(await color(page, '--tanrei-sys-color-focus-ring'));
    expect(await drawn(one, 'background-color')).toEqual(await color(page, T('item-focused-container-color')));
    expect(await css(one, 'transition-property')).not.toMatch(/outline|all|box-shadow/);
    // The other item shows none.
    expect(await css(item(page, 'both', 'next'), 'outline-style')).toBe('none');
    // Pointer focus.
    await mount(page, pages());
    const next = page.locator('[data-direction="next"]');
    await keepHere(next);
    await next.click();
    expect(await css(next, 'outline-style')).toBe('none');
  });

  /** Records, inside the page, when data-pressed appears and disappears, when the press ends, and what was seen. */
  const watchPress = (target: Locator) =>
    target.evaluate((el) => {
      const log: { down?: number; on?: number; off?: number; up?: number; seen?: string[] } = ((window as any).press = {});
      new MutationObserver(() => {
        if (el.hasAttribute('data-pressed')) {
          log.on ??= performance.now();
          const s = getComputedStyle(el);
          log.seen ??= [el.getAttribute('data-pressed')!, s.backgroundColor, s.opacity];
        } else if (log.on !== undefined) log.off ??= performance.now();
      }).observe(el, { attributes: true, attributeFilter: ['data-pressed'] });
      for (const type of ['pointerup', 'keyup']) window.addEventListener(type, () => (log.up ??= performance.now()), true);
      for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => (log.down ??= performance.now()), true);
    });
  const pressLog = (page: P) => page.evaluate(() => (window as any).press as { down?: number; on?: number; off?: number; up?: number; seen?: string[] });
  const CLOCK = 1;

  test('PGN-10 PGN-14 a press by Enter or a click is shown at once and for at least press-hold, even when the press ends sooner, and the navigation is not held back for it', async ({ page }) => {
    for (const how of ['Enter', 'click'] as const) {
      await mount(page, pages(`${anchor('previous')}${anchor('next', { href: '#there' })}`));
      await rootTokens(page, { '--tanrei-sys-motion-duration-press-hold': '400ms' });
      const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
      expect(hold).toBe(400);
      const next = page.locator('[data-direction="next"]');
      await watchPress(next);
      await page.evaluate(() => addEventListener('hashchange', () => ((window as any).went = performance.now())));
      if (how === 'Enter') {
        await tabTo(page, next);
        expect(await drawn(next, 'background-color')).toEqual(await color(page, T('item-focused-container-color')));
        await page.keyboard.press('Enter');
      } else {
        await next.hover();
        expect(await drawn(next, 'background-color')).toEqual(await color(page, T('item-hovered-container-color')));
        await next.click();
      }
      await expect.poll(async () => (await pressLog(page)).off, { timeout: 5000 }).toBeDefined();
      const log = await pressLog(page);
      expect(log.seen![0], how).toBe('overlay');
      expect(rgba(log.seen![1]), `${how}: pressed at once`).toEqual(await color(page, T('item-pressed-container-color')));
      expect(log.off! - log.down!, `${how}: held`).toBeGreaterThanOrEqual(hold - CLOCK);
      expect(log.up! - log.down!, `${how}: the press itself was shorter`).toBeLessThan(hold);
      // PGN-14: the address opened while the press was still shown.
      const went = await page.evaluate(() => (window as any).went as number);
      expect(went, `${how}: followed`).toBeDefined();
      expect(went, `${how}: not held back`).toBeLessThan(log.off!);
      expect(await page.evaluate(() => location.hash)).toBe('#there');
      // The item that was not pressed never was.
      expect(await page.locator('[data-direction="previous"]').getAttribute('data-pressed')).toBeNull();
    }
  });

  test('PGN-10 without the package’s script the stylesheet alone shows the press at once and holds it for press-hold', async ({ page }) => {
    await bare(page, pages());
    await rootTokens(page, { '--tanrei-sys-motion-duration-press-hold': '1500ms' });
    const next = page.locator('[data-direction="next"]');
    const bg = () => drawn(next, 'background-color');
    const hovered = await color(page, T('item-hovered-container-color'));
    await next.hover();
    await expect.poll(bg).toEqual(hovered);
    // What is drawn, not that a number is held: the pressed container in the state's place, at once and in every
    // frame of press-hold after the release — the hovered color under it neither drawn nor on its way anywhere (it
    // faded toward the hovered color and came back while the hold went through the background's color) — and then gone.
    await expectPressHeldAtEveryMoment(page, next, { pressed: await resolveColor(page, T('item-pressed-container-color')) });
    expect(await bg()).toEqual(hovered);
  });

  test('PGN-11 ripple (m3-like): the layer grows from the point of contact — from the center for the keyboard — and the container stays with the state under the press, while the other parts are the pressed tokens’; the control is the pressed item, never both', async ({ page }) => {
    await mountSpec(page, ['both'], { system: 'm3-like' });
    expect(await css(page.locator('html'), '--tanrei-sys-behavior-pressed-feedback')).toBe('ripple');
    const one = item(page, 'both', 'next');
    await keepHere(one);
    const place = await box(one);
    await page.mouse.move(place.x + 30, place.y + place.height / 2);
    const hovered = await color(page, T('item-hovered-container-color'));
    await expect.poll(() => drawn(one, 'background-color')).toEqual(hovered);
    await page.mouse.down();
    await expect(one).toHaveAttribute('data-pressed', 'ripple');
    const ripple = one.locator('.ripple');
    await expect(ripple).toHaveCount(1);
    expect(await drawn(one, 'background-color')).toEqual(hovered);
    expect(await drawn(ripple, 'background-color')).toEqual(await color(page, T('item-pressed-container-color')));
    expect(await drawn(one.locator('.tanrei-pagination-title'), 'color')).toEqual(await color(page, T('item-pressed-title-color')));
    expect(await drawn(one, 'border-top-color')).toEqual(await color(page, T('item-pressed-outline-color')));
    near(Number.parseFloat(await ripple.evaluate((el: HTMLElement) => el.style.getPropertyValue('--_x'))), 30 - (await px(one, 'border-left-width')), 'the point of contact', 1.5);
    expect(await css(ripple, 'animation-duration')).toBe(`${(await resolveToken(page, T('motion-feedback-duration'), 'duration')) / 1000}s`);
    expect(await css(ripple, 'transition-duration')).toBe(`${(await resolveToken(page, T('motion-state-duration'), 'duration')) / 1000}s`);
    expect(await css(ripple, 'animation-timing-function')).toBe(await computed(page, 'transition-timing-function', T('motion-state-easing')));
    expect([await css(ripple, 'pointer-events'), await css(ripple, 'position')]).toEqual(['none', 'absolute']);
    // No part of the layout, and never the other item.
    near((await box(one)).height, place.height, 'the item’s height', 0.01);
    expect(await item(page, 'both', 'previous').getAttribute('data-pressed')).toBeNull();
    await expect(item(page, 'both', 'previous').locator('.ripple')).toHaveCount(0);
    await page.mouse.up();
    await expect(ripple).toHaveCount(0, { timeout: 5000 });
    await expect(one).not.toHaveAttribute('data-pressed');
    // From the center for the keyboard.
    await tabTo(page, one);
    await page.keyboard.down('Enter');
    near(Number.parseFloat(await one.locator('.ripple').evaluate((el: HTMLElement) => el.style.getPropertyValue('--_x'))), place.width / 2 - (await px(one, 'border-left-width')), 'the center', 1.5);
    await page.keyboard.up('Enter');
    await expect(one.locator('.ripple')).toHaveCount(0, { timeout: 5000 });
    // Where motion is reduced the layer appears whole.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.mouse.move(place.x + 30, place.y + place.height / 2);
    await page.mouse.down();
    expect(await css(one.locator('.ripple'), 'animation-name')).toBe('none');
    await page.mouse.up();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  test('PGN-11 dim (cupertino) applies the pressed opacity to the whole item and draws no layer; none answers nothing; the default is the overlay, on the whole container at once', async ({ page }) => {
    await mountSpec(page, ['both'], { system: 'cupertino' });
    expect(await css(page.locator('html'), '--tanrei-sys-behavior-pressed-feedback')).toBe('dim');
    let one = item(page, 'both', 'next');
    await keepHere(one);
    const under = async () => drawn(one, 'background-color');
    await one.hover();
    const beforePress = await under();
    await page.mouse.down();
    await expect(one).toHaveAttribute('data-pressed', 'dim');
    await expect(one.locator('.ripple')).toHaveCount(0);
    expect(await under()).toEqual(beforePress);
    expect(await css(one, 'opacity')).toBe(await computed(page, 'opacity', T('pressed-opacity')));
    expect(Number(await css(one, 'opacity'))).toBeLessThan(1);
    expect(await css(item(page, 'both', 'previous'), 'opacity')).toBe('1');
    await page.mouse.up();

    await mountSpec(page, ['both']);
    one = item(page, 'both', 'next');
    await keepHere(one);
    await one.hover();
    await page.mouse.down();
    await expect(one).toHaveAttribute('data-pressed', 'overlay');
    expect(await under()).toEqual(await color(page, T('item-pressed-container-color')));
    await expect(one.locator('.ripple')).toHaveCount(0);
    await page.mouse.up();
    await expect(one).not.toHaveAttribute('data-pressed', 'overlay', { timeout: 5000 });
    await rootTokens(page, { '--tanrei-sys-behavior-pressed-feedback': 'none' });
    await page.addStyleTag({ content: ':root { --tanrei-comp-pagination-item-pressed-container-color: rgb(10, 20, 30); --tanrei-comp-pagination-item-pressed-title-color: rgb(40, 50, 60); }' });
    const hovered = await color(page, T('item-hovered-container-color'));
    await expect.poll(under).toEqual(hovered);
    await page.mouse.down();
    await expect(one).toHaveAttribute('data-pressed', 'none');
    expect(await under()).toEqual(hovered);
    expect(await drawn(one.locator('.tanrei-pagination-title'), 'color')).toEqual(await color(page, T('item-hovered-title-color')));
    await page.mouse.up();
  });

  test('PGN-12 the corners are eased by sys.shape.corner-smoothing where the browser can (cupertino), and keyboard focus is a glow where sys.behavior.focus-style says so (acme)', async ({ page }) => {
    await mountSpec(page, ['both'], { system: 'cupertino' });
    const one = item(page, 'both', 'next');
    const eases = await page.evaluate(() => CSS.supports('corner-shape', 'superellipse(1)'));
    const smoothing = Number(await css(page.locator('html'), '--tanrei-sys-shape-corner-smoothing'));
    expect(smoothing).toBeGreaterThan(0);
    const radius = await resolveToken(page, T('container-shape'));
    near(await px(one, 'border-top-left-radius'), radius * (eases ? 1 + 0.4 * smoothing : 1), 'the radius', 0.05);
    if (eases) expect(['round', 'superellipse(1)']).not.toContain(await css(one, 'corner-top-left-shape'));
    else test.info().annotations.push({ type: 'corner-shape', description: 'not in this browser: circular corners, the first value' });

    await mountSpec(page, ['both'], { system: 'acme', systemCss: await acmeSystemCss() });
    expect(await css(page.locator('html'), '--tanrei-sys-behavior-focus-style')).toBe('glow');
    const glowing = item(page, 'both', 'previous');
    await tabTo(page, glowing);
    expect(await drawn(glowing, 'outline-color')).toEqual([0, 0, 0, 0]);
    expect(await css(glowing, 'outline-style')).toBe('solid');
    expect(await css(glowing, 'box-shadow')).not.toBe('none');
    // The default system is the ring.
    await mountSpec(page, ['both']);
    await tabTo(page, item(page, 'both', 'previous'));
    expect((await drawn(item(page, 'both', 'previous'), 'outline-color'))[3]).toBe(1);
  });

  test('PGN-13 an item changes between its states over the motion tokens, and at once where motion is reduced', async ({ page }) => {
    await mountSpec(page, ['both']);
    const one = item(page, 'both', 'next');
    const timing = (target: Locator, pseudo?: string) =>
      target.evaluate((el, ps) => {
        const s = getComputedStyle(el, ps ?? undefined);
        const properties = s.transitionProperty.split(', ');
        const durations = s.transitionDuration.split(', ');
        const easings = s.transitionTimingFunction.split(/, (?=[a-z])/);
        return Object.fromEntries(properties.map((property, i) => [property, [durations[i % durations.length], easings[i % easings.length]]]));
      }, pseudo ?? null);
    const duration = `${(await resolveToken(page, T('motion-state-duration'), 'duration')) / 1000}s`;
    const easing = await computed(page, 'transition-timing-function', T('motion-state-easing'));
    const moving = await timing(one);
    for (const property of ['background-color', 'border-color', 'color', 'opacity']) {
      const found = moving[property] ?? moving[`${property.replace('border-color', 'border-top-color')}`];
      expect(found, property).toEqual([duration, easing]);
    }
    for (const part of [one.locator('.tanrei-pagination-label'), one.locator('.tanrei-pagination-title')]) expect((await timing(part)).color).toEqual([duration, easing]);
    expect((await timing(one, '::after')).color).toEqual([duration, easing]);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(Object.keys(await timing(one))).not.toEqual(expect.arrayContaining(['background-color']));
    expect(Object.keys(await timing(one.locator('.tanrei-pagination-title')))).not.toContain('color');
    await one.hover();
    expect(rgba(await css(one, 'background-color'))).toEqual(await color(page, T('item-hovered-container-color')));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });
});

test.describe('activation', () => {
  test('PGN-14 Enter and a click emit click once and follow the address; a cancelled click opens nothing; Space emits nothing, shows no press and is left to the page; a modified click is left to the browser', async ({ page }) => {
    await mount(page, `${pages(`${anchor('previous')}${anchor('next', { href: '#there', attributes: 'id="one"' })}`)}<div style="block-size: 3000px"></div>`);
    const next = page.locator('#one');
    await page.evaluate(() => {
      const w = window as any;
      w.clicks = 0;
      document.querySelector('#one')!.addEventListener('click', () => w.clicks++);
    });
    await tabTo(page, next);
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => [(window as any).clicks, location.hash])).toEqual([1, '#there']);
    await page.evaluate(() => history.replaceState(null, '', location.href.replace(/#.*/, '')));
    await next.click();
    expect(await page.evaluate(() => [(window as any).clicks, location.hash])).toEqual([2, '#there']);
    // Space: no click, no pressed state; the key is not taken from the page.
    await page.evaluate(() => {
      history.replaceState(null, '', location.href.replace(/#.*/, ''));
      scrollTo(0, 0);
      addEventListener('keydown', (e) => ((window as any).spacePrevented = e.defaultPrevented));
    });
    await next.focus();
    await expect(next).not.toHaveAttribute('data-pressed', /./, { timeout: 5000 });
    await page.keyboard.down('Space');
    expect(await next.getAttribute('data-pressed')).toBeNull();
    await page.keyboard.up('Space');
    expect(await page.evaluate(() => [(window as any).clicks, location.hash, (window as any).spacePrevented])).toEqual([2, '', false]);
    // The product's router takes the navigation.
    await page.evaluate(() => document.querySelector('#one')!.addEventListener('click', (e) => { if (!(e as MouseEvent).ctrlKey && !(e as MouseEvent).metaKey) e.preventDefault(); }));
    await next.click();
    await tabTo(page, next); // (Safari does not focus a link that is clicked.)
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => [(window as any).clicks, location.hash])).toEqual([4, '']);
    // A click with the new-tab modifier reaches the browser uncancelled by the pagination (the test stops it at the window).
    const cancelled = await page.evaluate(
      () =>
        new Promise<boolean>((resolve) => {
          addEventListener('click', (e) => { resolve(e.defaultPrevented); e.preventDefault(); }, { once: true });
          document.querySelector('#one')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, ctrlKey: true, metaKey: true }));
        }),
    );
    expect(cancelled).toBe(false);
  });

  test('PGN-15 an item at least a target high extends nothing; one below the minimum target has its hit area extended on both axes to the target of the input, without changing its visual size', async ({ page }) => {
    await mountSpec(page, ['both', 'labels-only']);
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    for (const [id, direction] of [['both', 'previous'], ['both', 'next'], ['labels-only', 'next']] as const) {
      const one = item(page, id, direction);
      expect((await box(one)).height).toBeGreaterThanOrEqual(pointer);
      expect(await css(one, 'position', TARGET[direction])).toBe('absolute');
      for (const side of ['top', 'bottom', 'left', 'right']) expect(await px(one, side, TARGET[direction]), `${id} ${direction} ${side}`).toBe(0);
    }
    near((await box(item(page, 'both', 'next'))).height, 76, '16, a 16 line, 2, a 26 line, 16', 0.05);
    // A layer with less padding: the label alone is lower than the target.
    await page.addStyleTag({ content: ':root { --tanrei-comp-pagination-container-padding: 4px; }' });
    const low = item(page, 'labels-only', 'next');
    const size = await box(low);
    expect(size.height).toBeLessThan(pointer);
    for (const side of ['top', 'bottom']) near(await px(low, side, TARGET.next), (size.height - (await px(low, 'border-top-width')) * 2 - pointer) / 2, `the hit area reaches the target: ${side}`, 0.05);
    for (const side of ['left', 'right']) expect(await px(low, side, TARGET.next)).toBe(0);
    near((await px(low, 'height', TARGET.next)) , pointer, 'the hit area’s height', 0.05);
    // A click above the item's edge, inside the target, reaches it.
    await keepHere(low);
    await low.evaluate((el) => el.addEventListener('click', () => ((window as any).hit = true)));
    await page.mouse.click(size.x + size.width / 2, size.y - (pointer - size.height) / 2 + 1);
    expect(await page.evaluate(() => (window as any).hit)).toBe(true);
    // Touch input: the touch target.
    const sheet = read('src/styles/pagination.css').replace(/\s+/g, ' ');
    expect(sheet).toContain('@media (pointer: coarse) { :where(.tanrei-pagination-item) { --_pgn-target: var(--tanrei-sys-target-touch); } }');
  });

  test('PGN-16 an item opens its destination where the person is: no target is written, read or marked, and no state is drawn for a destination already visited', async ({ page }) => {
    await mountSpec(page, ['both']);
    for (const direction of ['previous', 'next'] as const) {
      const one = item(page, 'both', direction);
      expect(await one.evaluate((a: HTMLAnchorElement) => [a.target, a.hasAttribute('target'), a.hasAttribute('aria-description')])).toEqual(['', false, false]);
      for (const pseudo of ['::before', '::after']) expect(await css(one, 'content', pseudo)).not.toContain('open_in_new');
    }
    const sheet = read('src/styles/pagination.css').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(sheet).not.toMatch(/:visited|:link\b|\[target|open_in_new/);
    expect(read('src/pagination.ts').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/window\.open|\.target\b = |setAttribute\('target'/);
    // One rule colors an item whether followed or not.
    expect(sheet).toMatch(/color: var\(--_pgn-now-title\)/);
  });

  test('PGN-17 each arrow is a glyph of the system’s icon set — arrow_back and arrow_forward — drawn as the icon helper draws one: the unselected family and fill, the system’s weight, the optical size following its box, in the icon color; no glyph from the product and no path', async ({ page }) => {
    await mountSpec(page, ['both']);
    const html = page.locator('html');
    const family = (value: string) => value.split(',')[0].trim().replace(/^["']|["']$/g, '');
    for (const [direction, name] of [['previous', 'arrow_back'], ['next', 'arrow_forward']] as const) {
      const one = item(page, 'both', direction);
      const arrow = (property: string) => css(one, property, ARROW[direction]);
      expect(await arrow('content')).toContain(name);
      expect(family(await arrow('font-family'))).toBe(family(await css(html, '--tanrei-sys-icon-family-unselected')));
      expect(await px(one, 'font-size', ARROW[direction])).toBe(await resolveToken(page, T('icon-size')));
      const settings = (await arrow('font-variation-settings')).replace(/'/g, '"');
      expect(settings).toContain(`"FILL" ${Number(await css(html, '--tanrei-sys-icon-fill-unselected'))}`);
      expect(settings).toContain(`"wght" ${Number(await css(html, '--tanrei-sys-icon-weight'))}`);
      expect(await arrow('font-optical-sizing')).toBe('auto');
      // The optical size is the box's, written by hand (src/styles/icons.ts): not every engine draws font-optical-sizing: auto.
      expect(await drawnOpticalSize(one, ARROW[direction]), direction).toBe(await opticalSize(page, await resolveToken(page, T('icon-size'))));
      expect(rgba(await arrow('color'))).toEqual(await color(page, T('item-icon-color')));
      expect(await arrow('opacity')).toBe('1');
      expect(await one.locator('svg, img, .tanrei-icon').count()).toBe(0);
    }
    expect(read('src/styles/pagination.css')).not.toMatch(/<svg|path\(|url\(/);
    // Another system's icon set draws them: its own family.
    await mountSpec(page, ['both'], { system: 'm3-like' });
    expect(family(await css(item(page, 'both', 'next'), 'font-family', '::after'))).toBe(family(await css(page.locator('html'), '--tanrei-sys-icon-family-unselected')));
    // Without the icon stylesheet no arrow is drawn and none takes room.
    await page.goto('about:blank');
    await page.setContent(`<!doctype html><html lang="en" data-tanrei-theme="light"><head><style>${read('dist/tokens.css')}</style><style>${read('dist/pagination.css')}</style></head><body style="inline-size:720px">${pages()}</body></html>`);
    const bareNext = page.locator('[data-direction="next"]');
    expect([await px(bareNext, 'width', '::after'), await css(bareNext, 'opacity', '::after'), await px(bareNext, 'column-gap')]).toEqual([0, '0', 0]);
  });
});

test.describe('forced colors, scaling, direction', () => {
  test('PGN-18 while the platform forces its colors each item’s edge, label, title and arrow are its link color, the edge keeps its width, and the focus ring is its highlight', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mountSpec(page, ['both', 'labels-only']);
    const system = (name: string) => page.evaluate((keyword) => { const probe = document.createElement('div'); probe.style.cssText = `color: ${keyword}; forced-color-adjust: none`; document.body.append(probe); const out = getComputedStyle(probe).color; probe.remove(); return out; }, name);
    const linkText = rgba(await system('LinkText'));
    for (const id of ['both', 'labels-only']) {
      for (const direction of ['previous', 'next'] as const) {
        const one = item(page, id, direction);
        expect(rgba(await css(one, 'border-top-color')), `${id} ${direction}`).toEqual(linkText);
        expect(await px(one, 'border-top-width')).toBe(await resolveToken(page, T('outline-width')));
        expect(await css(one, 'border-top-style')).toBe('solid');
        expect(rgba(await css(one.locator('.tanrei-pagination-label'), 'color'))).toEqual(linkText);
        if (id === 'both') expect(rgba(await css(one.locator('.tanrei-pagination-title'), 'color'))).toEqual(linkText);
        expect(rgba(await css(one, 'color', ARROW[direction]))).toEqual(linkText);
      }
    }
    await tabTo(page, item(page, 'both', 'next'));
    expect(rgba(await css(item(page, 'both', 'next'), 'outline-color'))).toEqual(rgba(await system('Highlight')));
    expect(await css(item(page, 'both', 'next'), 'outline-style')).toBe('solid');
    await page.emulateMedia({ forcedColors: 'none' });
  });

  test('PGN-19 with the text size enlarged each item grows with its text, both of a row to the taller; the padding, the gaps and the arrow’s box are the tokens’; it still stacks by the width it has; no text is cut or overlaps and the page does not scroll sideways', async ({ page }) => {
    const measure = async (enlarged: boolean) => {
      await mountSpec(page, ['long-titles']);
      if (enlarged) await page.addStyleTag({ content: 'html { font-size: 200%; }' });
      await page.evaluate(() => document.fonts.ready);
      const [previous, next] = [item(page, 'long-titles', 'previous'), item(page, 'long-titles', 'next')];
      const title = previous.locator('.tanrei-pagination-title');
      return {
        title: await px(title, 'font-size'),
        label: await px(previous.locator('.tanrei-pagination-label'), 'font-size'),
        heights: [(await box(previous)).height, (await box(next)).height],
        padding: [(await px(previous, 'padding-top')) + (await px(previous, 'border-top-width')), await resolveToken(page, T('container-padding'))],
        gap: [await px(previous, 'column-gap'), await resolveToken(page, T('container-gap'))],
        between: [(await box(title)).y - (await box(previous.locator('.tanrei-pagination-label'))).bottom, await resolveToken(page, T('label-gap'))],
        arrow: [await px(previous, 'width', '::before'), await resolveToken(page, T('icon-size'))],
        stacked: (await box(next)).y > (await box(previous)).y + 1,
        rowGap: [await px(nav(page, 'long-titles'), 'row-gap'), await resolveToken(page, T('gap'))],
        limit: 2 * (await resolveToken(page, T('container-min-width'))) + (await resolveToken(page, T('gap'))),
        sideways: await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth),
        cut: await page.evaluate(() => [...document.querySelectorAll('.tanrei-pagination-label, .tanrei-pagination-title')].some((el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)),
      };
    };
    const [rest, large] = [await measure(false), await measure(true)];
    expect([large.title, large.label]).toEqual([rest.title * 2, rest.label * 2]);
    for (const state of [rest, large]) {
      for (const key of ['padding', 'gap', 'arrow', 'rowGap'] as const) expect(state[key][0], key).toBe(state[key][1]);
      near(state.between[0], state.between[1], 'the label gap', 0.05);
      expect([state.sideways, state.cut]).toEqual([false, false]);
    }
    near(rest.heights[0], rest.heights[1], 'a row: equal heights', 0.01);
    expect(rest.stacked).toBe(false);
    expect(large.heights[0]).toBeGreaterThan(rest.heights[0]);
    // 720 is less than the enlarged limit: it stacks by the width it has.
    expect(large.limit).toBeGreaterThan(720);
    expect(large.stacked).toBe(true);
    // A row at 200 % where there is room: both items the height of the taller, the title under the label, nothing overlapping.
    await page.setViewportSize({ width: 1400, height: 900 });
    await mount(page, `<div style="inline-size:1200px">${pages(`${anchor('previous', { title: 'A title long enough to run over several lines at this size of text, more than the one beside it does' })}${anchor('next')}`)}</div>`);
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    await page.evaluate(() => document.fonts.ready);
    const [a, b] = [page.locator('[data-direction="previous"]'), page.locator('[data-direction="next"]')];
    near((await box(a)).y, (await box(b)).y, 'a row', 0.01);
    near((await box(a)).height, (await box(b)).height, 'the height of the taller', 0.01);
    expect((await box(a.locator('.tanrei-pagination-title'))).y).toBeGreaterThanOrEqual((await box(a.locator('.tanrei-pagination-label'))).bottom);
    expect((await textBox(a.locator('.tanrei-pagination-title'))).bottom).toBeLessThanOrEqual((await box(a)).bottom);
  });

  test('PGN-20 the pagination takes its direction from an ancestor inside the page and has none of its own; a change while it is shown is drawn at once, keeping its focus', async ({ page }) => {
    await mount(page, `<section id="around" dir="rtl" style="inline-size:720px">${pages()}</section>`);
    expect(await page.evaluate(() => document.documentElement.dir)).toBe('');
    const landmark = page.locator('.tanrei-pagination');
    expect(await landmark.evaluate((el) => el.hasAttribute('dir') || !!el.querySelector('[dir]'))).toBe(false);
    const [previous, next] = [page.locator('[data-direction="previous"]'), page.locator('[data-direction="next"]')];
    expect((await box(previous)).x).toBeGreaterThan((await box(next)).x);
    await tabTo(page, next);
    await page.locator('#around').evaluate((el) => (el.dir = 'ltr'));
    expect((await box(previous)).x).toBeLessThan((await box(next)).x);
    expect(await css(next, 'text-align')).toBe('right');
    expect(await page.evaluate(() => document.activeElement?.getAttribute('data-direction'))).toBe('next');
    expect(await css(next, 'outline-style')).toBe('solid');
    await page.locator('#around').evaluate((el) => (el.dir = 'rtl'));
    expect((await box(previous)).x).toBeGreaterThan((await box(next)).x);
    expect(await css(next, 'text-align')).toBe('left');
    expect(await page.evaluate(() => document.activeElement?.getAttribute('data-direction'))).toBe('next');
    // The layout has no motion of its own: the row is placed by the grid, which no transition names.
    expect(await css(landmark, 'transition-duration')).toBe('0s');
    expect(await css(next, 'transition-property')).not.toMatch(/all|transform|inset|grid/);
    // The document's own direction, where no ancestor sets one.
    await mount(page, pages(), { dir: 'rtl' });
    expect((await box(page.locator('[data-direction="previous"]'))).x).toBeGreaterThan((await box(page.locator('[data-direction="next"]'))).x);
  });

  test('PGN-21 right to left the previous item stands at the right with its arrow at its right edge and the next at the left with its arrow at its left edge, both arrows mirrored as the icon set marks them; an icon set that marks neither draws them unmirrored; the reading and focus order stay previous, then next', async ({ page }) => {
    await mountSpec(page, ['both-rtl', 'next-only-rtl', 'both']);
    const outer = await box(nav(page, 'both-rtl'));
    const [previous, next] = [item(page, 'both-rtl', 'previous'), item(page, 'both-rtl', 'next')];
    await expect(previous.locator('.tanrei-pagination-label')).toHaveText('السابق');
    await expect(next.locator('.tanrei-pagination-label')).toHaveText('التالي');
    near((await box(previous)).right, outer.right, 'previous at the right', 0.05);
    near((await box(next)).x, outer.x, 'next at the left', 0.05);
    const [padding, gap, icon] = await Promise.all([T('container-padding'), T('container-gap'), T('icon-size')].map((name) => resolveToken(page, name)));
    // The arrow's column is at the item's outer edge: the text ends (previous) or begins (next) the arrow and the gap from the padding.
    near((await box(previous.locator('.tanrei-pagination-title'))).right, (await box(previous)).right - padding - icon - gap, 'the previous item’s arrow at its right edge', 0.05);
    near((await box(next.locator('.tanrei-pagination-title'))).x, (await box(next)).x + padding + icon + gap, 'the next item’s arrow at its left edge', 0.05);
    expect([await css(previous, 'text-align'), await css(next, 'text-align')]).toEqual(['right', 'left']);
    // Mirrored left to right, each in its own box: arrow_back then points right and arrow_forward left.
    const mirrored = async (one: Locator, direction: Direction) => (await css(one, 'transform', ARROW[direction])).replace(/\s/g, '');
    expect(await mirrored(previous, 'previous')).toBe('matrix(-1,0,0,1,0,0)');
    expect(await mirrored(next, 'next')).toBe('matrix(-1,0,0,1,0,0)');
    expect(await css(previous, 'content', '::before')).toContain('arrow_back');
    expect(await css(next, 'content', '::after')).toContain('arrow_forward');
    expect([await px(previous, 'width', '::before'), await px(next, 'width', '::after')]).toEqual([icon, icon]);
    // Left to right nothing is mirrored.
    expect(await mirrored(item(page, 'both', 'next'), 'next')).toBe('none');
    // The icon set says so: the default system's marks both names.
    expect(await previous.evaluate((el) => el.hasAttribute('data-tanrei-unmirrored'))).toBe(false);
    // Next alone keeps the left column.
    near((await box(item(page, 'next-only-rtl', 'next'))).x, (await box(nav(page, 'next-only-rtl'))).x, 'next alone at the left', 0.05);
    near((await box(item(page, 'next-only-rtl', 'next'))).width, (await box(next)).width, 'the same width', 0.01);
    // Reading and focus order.
    expect(await nav(page, 'both-rtl').evaluate((el) => [...el.children].map((child) => child.getAttribute('data-direction')))).toEqual(['previous', 'next']);
    await tabTo(page, previous);
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.getAttribute('data-direction'))).toBe('next');
    // A system whose icon set marks neither name: a product's layer with a family no icon set describes.
    await mount(page, `<div data-tanrei-system="product" style="inline-size:720px; --tanrei-sys-icon-family-unselected: 'Product Icons'">${pages()}</div><div style="inline-size:720px">${pages(`${anchor('previous', { attributes: 'data-mirror="never"' })}${anchor('next')}`, 'aria-label="Never" id="never"')}</div>`, { direction: 'rtl' });
    const product = page.locator('[data-tanrei-system="product"]');
    await expect(product.locator('[data-direction="previous"]')).toHaveAttribute('data-tanrei-unmirrored', '');
    expect(await mirrored(product.locator('[data-direction="previous"]'), 'previous')).toBe('none');
    expect(await mirrored(product.locator('[data-direction="next"]'), 'next')).toBe('none');
    // …and the product's word for one use.
    expect(await mirrored(page.locator('#never [data-direction="previous"]'), 'previous')).toBe('none');
    expect(await mirrored(page.locator('#never [data-direction="next"]'), 'next')).toBe('matrix(-1,0,0,1,0,0)');
    // The pagination mirrors no glyph itself beyond that mark: the row and the content are placed by logical start and end.
    expect(read('src/styles/pagination.css').replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/(?<!-)\b(left|right):|margin-(left|right)|padding-(left|right)|border-(left|right)/);
  });

  test('PGN-22 a label and a title are text of their own direction, isolated: a left-to-right title in a right-to-left pagination reads in its own order and its lines are aligned as the Arabic label above it', async ({ page }) => {
    await mountSpec(page, ['ltr-title-rtl', 'long-titles-rtl']);
    for (const [direction, text] of [['previous', 'Web Components 1.2'], ['next', 'Jetpack Compose']] as const) {
      const one = item(page, 'ltr-title-rtl', direction);
      const [label, title] = [one.locator('.tanrei-pagination-label'), one.locator('.tanrei-pagination-title')];
      await expect(title).toHaveText(text);
      for (const part of [label, title]) expect(await css(part, 'unicode-bidi')).toBe('plaintext');
      expect(await css(title, 'direction')).toBe('rtl');
      // Its own order: the first character stands at the left of the last, and the number stays after the name.
      const [first, last] = await title.evaluate((el) => { const node = el.firstChild!; const at = (n: number) => { const r = document.createRange(); r.setStart(node, n); r.setEnd(node, n + 1); return r.getBoundingClientRect().left; }; return [at(0), at(node.textContent!.length - 1)]; });
      expect(first).toBeLessThan(last);
      // Aligned as the label above it: by the layout and the item's side, not by the text's own direction.
      const [labelText, titleText] = [await textBox(label), await textBox(title)];
      if (direction === 'previous') near(titleText.right, labelText.right, 'the previous item’s lines begin at the right', 0.5);
      else near(titleText.x, labelText.x, 'the next item’s lines end at the left', 0.5);
      expect(await css(title, 'text-align')).toBe(direction === 'previous' ? 'right' : 'left');
    }
    // Arabic titles that wrap: aligned the same way on every line.
    const long = item(page, 'long-titles-rtl', 'previous').locator('.tanrei-pagination-title');
    expect((await box(long)).height).toBeGreaterThan(await px(long, 'line-height'));
    near((await textBox(long)).right, (await box(long)).right, 'the lines begin at the right', 0.5);
    // An Arabic title in a left-to-right pagination: placed by the layout, at the left in the previous item.
    await mount(page, pages(`${anchor('previous', { title: 'التثبيت' })}${anchor('next', { title: 'رموز التصميم' })}`));
    const title = page.locator('[data-direction="previous"] .tanrei-pagination-title');
    near((await textBox(title)).x, (await box(title)).x, 'at the left', 0.5);
    near((await textBox(page.locator('[data-direction="next"] .tanrei-pagination-title'))).right, (await box(page.locator('[data-direction="next"] .tanrei-pagination-title'))).right, 'at the right', 0.5);
  });
});

test.describe('without the script', () => {
  test('the stylesheet alone draws every fixture: with scripting off the layout is the same box for box (PGN-2, PGN-4, PGN-6)', async ({ page, browser }) => {
    const document = (await fixturesDocument(spec, { icons: true })).replace(/<script type="module">[\s\S]*<\/script>/, '');
    const measure = (p: P) =>
      p.evaluate(() => [...document.querySelectorAll('.tanrei-pagination, .tanrei-pagination-item, .tanrei-pagination-label, .tanrei-pagination-title')].map((el) => { const r = el.getBoundingClientRect(); return [el.className, Math.round(r.left * 8), Math.round(r.top * 8), Math.round(r.width * 8), Math.round(r.height * 8)].join(' '); }));
    await mountSpec(page);
    const context = await browser.newContext({ javaScriptEnabled: false, deviceScaleFactor: 2 });
    const off = await context.newPage();
    await off.setContent(document);
    await off.waitForFunction(() => document.fonts.status === 'loaded').catch(() => {});
    const [on, bareRows] = [await measure(page), await measure(off)];
    expect(bareRows.length).toBeGreaterThan(40);
    expect(bareRows).toEqual(on);
    await context.close();
  });
});

test.describe('fixtures', () => {
  test('all 9 fixtures are mounted and visible, each a nav with the class around its anchors on a stage 720 wide, and the review gallery draws the same document', async ({ page }) => {
    expect(spec.fixtures).toHaveLength(9);
    await mountSpec(page);
    await expect(page.locator('.stage > nav.tanrei-pagination')).toHaveCount(9);
    for (const f of spec.fixtures) {
      const landmark = nav(page, f.id);
      await expect(landmark, f.id).toHaveCount(1);
      await expect(landmark, f.id).toBeVisible();
      expect((await box(landmark)).width, f.id).toBe(720);
      const drawnItems = (f.items ?? []).filter((one) => String(one.props.href ?? '').trim());
      await expect(landmark.getByRole('link'), f.id).toHaveCount(drawnItems.length);
      for (const one of drawnItems) {
        const link = item(page, f.id, one.props.direction as Direction);
        await expect(link, f.id).toBeVisible();
        await expect(link).toHaveAttribute('href', String(one.props.href));
        await expect(link.locator('.tanrei-pagination-label')).toHaveText(String(one.props.label));
        if (one.props.title) await expect(link.locator('.tanrei-pagination-title')).toHaveText(String(one.props.title));
      }
      if (f.direction === 'rtl') expect(await css(landmark, 'direction')).toBe('rtl');
    }
    const gallery = await fixturesDocument(spec, { icons: true, assets: { font: '/f.css', tokens: '/t.css', system: (id) => `/${id}.css`, icons: () => '/i.css', bundle: '/b.js' } });
    for (const f of spec.fixtures) expect(gallery, f.id).toContain(`data-fixture="${f.id}"`);
    expect(gallery.match(/<div class="stage" data-fixture="[^"]+"(?: dir="rtl")?><nav class="tanrei-pagination"/g)).toHaveLength(9);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`accessibility: every fixture passes axe in ${theme}`, async ({ page }) => {
      await mountSpec(page, [], { theme });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  }

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true, fixtures: [f] });
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
