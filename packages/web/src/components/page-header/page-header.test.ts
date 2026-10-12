// <tanrei-page-header> and page-header.css, driven by specs/page-header.spec.json: every behaviour id (PGH-1…24) is
// cited by a test title, every fixture has a baseline, and every length and color is read back from the tokens — never
// from a number written here (the numbers of a `verify` are the spec's own, for the default system).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
// The build's own step (scripts/build.js), read here so a width that drifts from its token fails a test.
import { declarations, resolved, tokensIn, writeConditions } from '../../../scripts/conditions.js';
import { type Fixture, fixturesDocument, loadSpec, mountFixtures, resolveColor, resolveToken, tab, rootTokens } from '../../../test/harness.js';

const spec = loadSpec('page-header');
type P = Page;
const TAG = 'tanrei-page-header';
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const T = (name: string) => `--tanrei-comp-page-header-${name}`;

const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] ${TAG}`);
const title = (page: P, id: string) => host(page, id).locator('> :is(h1, h2, h3, h4, h5, h6, [data-part="title"])');
const description = (page: P, id: string) => host(page, id).locator('> p:not([data-part])').first();
const eyebrow = (page: P, id: string) => host(page, id).locator('> [data-part="eyebrow"]');
const breadcrumbs = (page: P, id: string) => host(page, id).locator('> :is(tanrei-breadcrumbs, [data-part="breadcrumbs"])');
const meta = (page: P, id: string) => host(page, id).locator('> [data-part="meta"]');
const item = (page: P, id: string, n: number) => meta(page, id).locator(`> :nth-child(${n})`);
const actions = (page: P, id: string) => host(page, id).locator('> [data-part="actions"]');
const action = (page: P, id: string, n: number) => actions(page, id).locator(`> :nth-child(${n})`);
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
/** The dot an item draws before itself: its box, its color, and whether it is one at all. */
const dot = (locator: Locator) =>
  locator.evaluate((el) => {
    const style = getComputedStyle(el, '::before');
    if (style.content === 'none') return null;
    const [rect, n] = [el.getBoundingClientRect(), Number.parseFloat];
    const rtl = getComputedStyle(el).direction === 'rtl';
    const [width, height] = [n(style.width), n(style.height)];
    const left = rtl ? rect.right - n(style.right) - width : rect.left + n(style.left);
    const top = rect.top + n(style.top);
    return { left, right: left + width, top, bottom: top + height, width, height, color: style.backgroundColor, radius: n(style.borderTopLeftRadius) };
  });
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning' && message.text().includes('[tanrei]')) seen.push(message.text());
  });
  return seen;
}
const frame = (page: P) => page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
const fixture = (id: string) => spec.fixtures.find((f) => f.id === id)!;
const some = (...ids: string[]) => ids.map(fixture);
/** A head whose parts are written by the test. */
const raw = (id: string, props: Fixture['props'], content: string, extra: Partial<Fixture> = {}): Fixture => ({ id, props, content, ...extra });
/** The head's width (a fixture cannot state the size of its stage: PGH-10, PGH-12, PGH-18). */
const size = async (page: P, id: string, width: number) => {
  await stage(page, id).evaluate((el, w) => {
    (el as HTMLElement).style.maxInlineSize = 'none';
    (el as HTMLElement).style.inlineSize = `${w + 32}px`;
  }, width);
  await frame(page);
};
const near = (a: number, b: number, tolerance = 0.6) => expect(Math.abs(a - b), `${a} ≈ ${b}`).toBeLessThanOrEqual(tolerance);
/**
 * Two edges at the same place: within one unit of the engine's layout (Firefox: a sixtieth of a pixel). An edge that is
 * reached through the widths of text — an end edge, or a start edge in a right-to-left layout — is a sum of fractions
 * where the font's advances are fractions, and is reported a 2⁻¹⁵ px off the edge it lies on (784.00003 for 784).
 */
const flush = (a: number, b: number, message?: string) => expect(Math.abs(a - b), message ?? `${a} = ${b}`).toBeLessThanOrEqual(1 / 60);
const mount = async (page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) => {
  await mountFixtures(page, spec, { fixtures, ...options });
  await frame(page);
};
const SIZES = ['small', 'medium', 'large'] as const;
/** A head of every part, with real links in it, for the order of focus. */
const LINKED = (id: string, props: Fixture['props'] = {}, extra: Partial<Fixture> = {}) =>
  raw(
    id,
    props,
    `<nav data-part="breadcrumbs" aria-label="Breadcrumbs"><a id="${id}-up" class="tanrei-link" data-standalone href="#up">Foundations</a></nav>
     <p data-part="eyebrow">Guides</p>
     <h1>Add a design system as a layer</h1>
     <p>A layer changes values and may extend the <a id="${id}-inline" href="#v">vocabulary</a>; it never forks a component.</p>
     <div data-part="meta"><time datetime="2026-10-07">7 October 2026</time><a id="${id}-author" class="tanrei-link" href="#team">The Tanrei team</a><span>8 min read</span></div>
     <div data-part="actions"><tanrei-button id="${id}-edit" variant="outlined">Edit</tanrei-button><tanrei-button id="${id}-share">Share</tanrei-button></div>`,
    extra,
  );

test.describe('the parts and their order', () => {
  test('PGH-1: the parts from the top in order — the breadcrumbs slot, 12, the title on a 40 line, 8, the description on 26 lines, 16 of space below — each at the start edge and none taking room while absent; title-only is 40 + 16 high; no space above the first part, the size’s space kept below inside the box; no fill, edge, corner shape or elevation', async ({ page }) => {
    await mount(page, some('docs-page', 'title-only', 'small', 'large', 'everything'));
    const [crumbGap, descriptionGap, end] = [await resolveToken(page, T('breadcrumbs-gap')), await resolveToken(page, T('description-gap-medium')), await resolveToken(page, T('container-padding-block-end-medium'))];
    expect([crumbGap, descriptionGap, end]).toEqual([12, 8, 16]);
    const [box, crumbs, heading, lead] = [await edges(host(page, 'docs-page')), await edges(breadcrumbs(page, 'docs-page')), await edges(title(page, 'docs-page')), await edges(description(page, 'docs-page'))];
    // From the top, each at the start edge.
    expect([crumbs.top, crumbs.left, heading.left, lead.left]).toEqual([box.top, box.left, box.left, box.left]);
    near(heading.top - crumbs.bottom, crumbGap, 0.01);
    expect(heading.height).toBe(40);
    near(lead.top - heading.bottom, descriptionGap, 0.01);
    expect(lead.height % 26).toBe(0);
    near(box.bottom - lead.bottom, end, 0.01);
    // A title alone: its line, and the space kept below.
    expect((await edges(host(page, 'title-only'))).height).toBe(40 + 16);
    expect((await edges(title(page, 'title-only'))).top).toBe((await edges(host(page, 'title-only'))).top);
    // The space below by size.
    for (const name of SIZES) expect(await px(host(page, name === 'medium' ? 'docs-page' : name), 'padding-bottom'), name).toBe(await resolveToken(page, T(`container-padding-block-end-${name}`)));
    expect([await px(host(page, 'small'), 'padding-bottom'), await px(host(page, 'large'), 'padding-bottom')]).toEqual([8, 32]);
    // Every space between two parts of the fullest head.
    const e = 'everything';
    const parts = await Promise.all([breadcrumbs(page, e), eyebrow(page, e), title(page, e), description(page, e), meta(page, e)].map(edges));
    const gaps = parts.slice(1).map((part, i) => Math.round((part.top - parts[i].bottom) * 100) / 100);
    expect(gaps).toEqual([crumbGap, await resolveToken(page, T('eyebrow-gap')), descriptionGap, await resolveToken(page, T('meta-gap'))]);
    // No look of its own: it stands on the surface its container is drawn on.
    for (const id of ['docs-page', 'everything']) {
      const el = host(page, id);
      expect([await css(el, 'background-color'), await css(el, 'box-shadow'), await px(el, 'border-top-left-radius'), await px(el, 'border-top-width'), await px(el, 'padding-top'), await px(el, 'padding-left'), await px(el, 'margin-top'), await px(el, 'margin-bottom')], id).toEqual(['rgba(0, 0, 0, 0)', 'none', 0, 0, 0, 0, 0, 0]);
    }
  });

  test('PGH-2: the title is drawn in the text style of its size and in title.color, and is a heading — of level 1 for medium and large, 2 for small, of the level given — exactly once and as text; the product’s own heading in its place keeps its role and its level; the document holds one h1 with the title’s text before the element is defined and after', async ({ page }) => {
    await mount(page, some('medium', 'small', 'large', 'level', 'title-slot'));
    const roles = { small: 'heading-2', medium: 'heading-1', large: 'display' } as const;
    for (const name of SIZES) {
      const heading = title(page, name);
      expect([await px(heading, 'font-size'), await css(heading, 'font-weight')], name).toEqual([
        await resolveToken(page, T(`title-typescale-${name}-font-size`)),
        await page.evaluate((t) => getComputedStyle(document.documentElement).getPropertyValue(t).trim(), T(`title-typescale-${name}-font-weight`)),
      ]);
      near(await px(heading, 'line-height'), (await resolveToken(page, T(`title-typescale-${name}-font-size`))) * Number(await page.evaluate((t) => getComputedStyle(document.documentElement).getPropertyValue(t), T(`title-typescale-${name}-line-height`))), 0.01);
      expect(await px(heading, 'font-size')).toBe(await resolveToken(page, `--tanrei-sys-typescale-${roles[name]}-font-size`));
      expect(await css(heading, 'color')).toBe(await resolveColor(page, T('title-color')));
    }
    expect([await px(title(page, 'small'), 'font-size'), await px(title(page, 'medium'), 'font-size'), await px(title(page, 'large'), 'font-size')]).toEqual([24, 32, 48]);
    // A heading of its level, once, as text.
    await expect(stage(page, 'medium').getByRole('heading', { level: 1, name: 'Typography', exact: true })).toHaveCount(1);
    await expect(stage(page, 'small').getByRole('heading', { level: 2, name: 'Members', exact: true })).toHaveCount(1);
    await expect(stage(page, 'large').getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(stage(page, 'level').getByRole('heading', { level: 3, name: 'Danger zone', exact: true })).toHaveCount(1);
    for (const id of ['medium', 'small', 'large', 'level', 'title-slot']) {
      await expect(stage(page, id).getByRole('heading'), id).toHaveCount(1);
      expect(await title(page, id).evaluate((el) => [getComputedStyle(el).visibility, el.getAttribute('aria-hidden'), el.querySelector('img, svg')]), id).toEqual(['visible', null, null]);
      expect(await host(page, id).evaluate((el) => [el.shadowRoot, el.getAttribute('headline'), el.getAttribute('title')]), id).toEqual([null, null, null]);
    }
    // The product's own heading, of level 3, in the title's place and style; its level is kept.
    await mount(page, [raw('own', {}, '<h3>comp.<code>button</code></h3><p>Every value a button reads.</p>')]);
    const own = title(page, 'own');
    expect([await own.evaluate((el) => el.localName), await px(own, 'font-size'), await css(own, 'color')]).toEqual(['h3', await resolveToken(page, T('title-typescale-medium-font-size')), await resolveColor(page, T('title-color'))]);
    await expect(stage(page, 'own').getByRole('heading', { level: 3 })).toHaveCount(1);
    expect(await own.evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-level')])).toEqual([null, null]);

    // One h1 with the title's text, with no script, before the element is defined and after.
    const fresh = await page.context().newPage();
    const document = await fixturesDocument(spec, { fixtures: some('medium') });
    await fresh.setContent(`${document.slice(0, document.lastIndexOf('<script type="module">'))}</body></html>`);
    const h1 = () => fresh.evaluate(() => [...document.querySelectorAll('h1')].map((el) => el.textContent));
    expect([await fresh.evaluate((tag) => !!customElements.get(tag), TAG), await h1()]).toEqual([false, ['Typography']]);
    await expect(fresh.getByRole('heading', { level: 1, name: 'Typography' })).toHaveCount(1);
    expect(await fresh.locator('h1').evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize))).toBe(32);
    await fresh.addScriptTag({ content: fs.readFileSync(path.join(pkg, 'dist/tanrei.bundle.js'), 'utf8'), type: 'module' });
    await fresh.waitForFunction((tag) => !!customElements.get(tag), TAG);
    expect(await h1()).toEqual(['Typography']);
    await fresh.close();
  });

  test('PGH-2: a head built by script — headline, description, eyebrow and level write the heading and the paragraphs where the children have none, the heading at the level given or its size’s, in reading order; the page’s own part takes its place', async ({ page }) => {
    await mount(page, [raw('built', { title: 'Members', description: 'People who can open this project.', eyebrow: 'Project' }, '<!--built--><div data-part="actions"><tanrei-button>Invite</tanrei-button></div>'), raw('part', { size: 'small', title: 'Access tokens' }, '<!--built-->'), raw('leveled', { size: 'large', level: 4, title: 'Danger zone' }, '<!--built-->')]);
    const kids = (id: string) => host(page, id).evaluate((el) => [...el.children].map((child) => `${child.localName}${child.getAttribute('data-part') ? `[${child.getAttribute('data-part')}]` : ''}:${child.localName.startsWith('tanrei') ? '' : child.textContent}`));
    await expect.poll(() => kids('built')).toEqual(['p[eyebrow]:Project', 'h1:Members', 'p:People who can open this project.', 'div[actions]:Invite']);
    await expect(stage(page, 'built').getByRole('heading', { level: 1, name: 'Members', exact: true })).toHaveCount(1);
    expect(await kids('part')).toEqual(['h2:Access tokens']);
    expect(await kids('leveled')).toEqual(['h4:Danger zone']);
    expect(await px(title(page, 'built'), 'font-size')).toBe(await resolveToken(page, T('title-typescale-medium-font-size')));
    // Changed, the written parts follow at once; emptied, they leave; the page's own heading takes the written one's place.
    await host(page, 'built').evaluate((el) => Object.assign(el, { headline: 'Team', description: '', level: 2 }));
    await expect.poll(() => kids('built')).toEqual(['p[eyebrow]:Project', 'h2:Team', 'div[actions]:Invite']);
    await host(page, 'built').evaluate((el) => el.insertAdjacentHTML('afterbegin', '<h1>The page’s own</h1>'));
    await expect.poll(() => kids('built')).toEqual(['h1:The page’s own', 'p[eyebrow]:Project', 'div[actions]:Invite']);
  });

  test('PGH-3: the title wraps onto as many lines as it needs and is never cut, limited to a number of lines or shrunk; a string with no break opportunity breaks anywhere rather than overflow; lines align to the start edge, of balanced length where the browser can, by the rules of the title’s language; it takes the whole width of the head and is not limited by the description’s measure', async ({ page }) => {
    await mount(page, some('long-title', 'long-title-actions', 'unbroken-title', 'japanese', 'medium'));
    for (const id of ['long-title', 'long-title-actions', 'unbroken-title', 'japanese']) {
      const heading = title(page, id);
      expect(await lines(heading), id).toBeGreaterThan(1);
      // Nothing is cut: no clip, no ellipsis, no line limit, and the text is as large as its style says.
      expect(await heading.evaluate((el) => [getComputedStyle(el).overflow, getComputedStyle(el).textOverflow, getComputedStyle(el).getPropertyValue('-webkit-line-clamp'), getComputedStyle(el).whiteSpaceCollapse || getComputedStyle(el).whiteSpace]), id).toEqual(['visible', 'clip', 'none', expect.stringMatching(/collapse|normal/)]);
      expect(await px(heading, 'font-size'), id).toBe(await resolveToken(page, T('title-typescale-medium-font-size')));
      // Every character is drawn inside the head.
      const [box, text] = [await edges(host(page, id)), await textBox(heading)];
      expect(text.left, id).toBeGreaterThanOrEqual(box.left - 0.5);
      expect(text.right, id).toBeLessThanOrEqual(box.right + 0.5);
      expect(await stage(page, id).evaluate((el) => el.scrollWidth <= el.clientWidth), id).toBe(true);
      expect(await css(heading, 'text-align'), id).toBe('left');
      expect(await css(heading, 'hyphens'), id).toBe('manual');
    }
    expect(await css(title(page, 'unbroken-title'), 'overflow-wrap')).toBe('anywhere');
    // Balanced where the browser can: the two lines of a title do not end in a single word.
    const balanced = await page.evaluate(() => CSS.supports('text-wrap', 'balance'));
    expect(await title(page, 'long-title').evaluate((el) => getComputedStyle(el).getPropertyValue('text-wrap') || getComputedStyle(el).getPropertyValue('text-wrap-style'))).toContain(balanced ? 'balance' : '');
    // The language's own rules (PRS-19).
    expect(await css(title(page, 'japanese'), 'line-break')).toBe('strict');
    expect(await css(title(page, 'long-title'), 'line-break')).toBe('auto');
    // The whole width the head gives its text: wider than the description's measure.
    const [heading, lead, box] = [await edges(title(page, 'medium')), await edges(description(page, 'medium')), await edges(host(page, 'medium'))];
    expect(heading.width).toBe(box.width);
    expect(lead.width).toBeLessThan(heading.width);
  });

  test('PGH-4: in Japanese and in Arabic the title and the eyebrow are drawn at a letter-spacing of zero; in the fixture medium the title has the letter-spacing of sys.typescale.heading-1', async ({ page }) => {
    await mount(page, some('japanese', 'rtl', 'medium', 'eyebrow'));
    for (const id of ['japanese', 'rtl']) {
      expect([await px(title(page, id), 'letter-spacing') || 0, await px(eyebrow(page, id), 'letter-spacing') || 0], id).toEqual([0, 0]);
    }
    const tracking = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.cssText = 'font: var(--tanrei-sys-typescale-heading-1-font); letter-spacing: var(--tanrei-sys-typescale-heading-1-letter-spacing)';
      document.body.append(probe);
      const value = Number.parseFloat(getComputedStyle(probe).letterSpacing);
      probe.remove();
      return value;
    });
    expect(tracking).toBeLessThan(0);
    expect(await px(title(page, 'medium'), 'letter-spacing')).toBe(tracking);
    // The eyebrow's own tracking, where the script keeps its letters apart.
    expect(await px(eyebrow(page, 'eyebrow'), 'letter-spacing')).toBeGreaterThan(0);
    // Other scripts that join their letters or stack marks on them, and the description, which is never tracked apart.
    await mount(page, [raw('hi', {}, '<p data-part="eyebrow" lang="hi">घोषणाएँ</p><h1 lang="hi">टोकन व्युत्पन्न हैं</h1>'), raw('ko', {}, '<h1 lang="ko">토큰은 파생됩니다</h1>')]);
    expect([await px(title(page, 'hi'), 'letter-spacing') || 0, await px(eyebrow(page, 'hi'), 'letter-spacing') || 0, await px(title(page, 'ko'), 'letter-spacing') || 0]).toEqual([0, 0, 0]);
  });

  test('PGH-5: what the breadcrumbs slot holds is placed first, at the start edge, across the head’s whole width — above the actions too — and is not restyled, cut or given a role; it comes first in the reading and the focus order', async ({ page }) => {
    await mount(page, [...some('breadcrumbs', 'everything'), LINKED('linked'), raw('crumbs', {}, '<nav data-part="breadcrumbs" aria-label="Breadcrumbs" style="display: flex; gap: 8px"><a href="#f">Foundations</a><a href="#t" aria-current="page">Typography</a></nav><h1>Typography</h1><div data-part="actions"><tanrei-button>Edit</tanrei-button></div>')], { icons: true });
    for (const id of ['breadcrumbs', 'everything', 'linked', 'crumbs']) {
      const [box, crumbs] = [await edges(host(page, id)), await edges(breadcrumbs(page, id))];
      expect([crumbs.left, crumbs.top, crumbs.width], id).toEqual([box.left, box.top, box.width]);
    }
    // Above the actions, which never stand beside it.
    expect((await edges(actions(page, 'everything'))).top).toBeGreaterThanOrEqual((await edges(breadcrumbs(page, 'everything'))).bottom);
    expect((await edges(actions(page, 'crumbs'))).top).toBeGreaterThanOrEqual((await edges(breadcrumbs(page, 'crumbs'))).bottom);
    // Not restyled, and no role given: plain text takes the stage's own style, and a trail keeps its own landmark and
    // its own layout. (The trail here is the product's own `nav`; `tanrei-breadcrumbs` is placed by the same
    // rule.)
    const plain = breadcrumbs(page, 'breadcrumbs');
    expect([await css(plain, 'font-size'), await css(plain, 'color'), await plain.getAttribute('role')]).toEqual([await css(stage(page, 'breadcrumbs'), 'font-size'), await css(stage(page, 'breadcrumbs'), 'color'), null]);
    await expect(stage(page, 'crumbs').getByRole('navigation', { name: 'Breadcrumbs' })).toHaveCount(1);
    expect(await breadcrumbs(page, 'crumbs').evaluate((el) => [el.getAttribute('role'), getComputedStyle(el).display, getComputedStyle(el).columnGap])).toEqual([null, 'flex', '8px']);
    expect(fs.readFileSync(path.join(pkg, 'src/styles/page-header.css'), 'utf8')).toContain(":where(tanrei-breadcrumbs, [data-part='breadcrumbs'])");
    // First in the focus order of the head.
    await page.locator('#linked-up').evaluate((el) => (el as HTMLElement).focus());
    expect(await host(page, 'linked').evaluate((el) => el.querySelector('a, button, [tabindex], tanrei-button')?.id)).toBe('linked-up');
  });

  test('PGH-5: the Breadcrumbs element in the slot is placed first, at the start edge, across the head’s whole width with breadcrumbs.gap under it, keeps its own landmark and look, and folds by the width of the head — not by the window’s', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 700 });
    const trail =
      '<tanrei-breadcrumbs label="Breadcrumbs" overflow-label="Show hidden levels"><a id="real-up" href="#home">Home</a><a href="#docs">Documentation</a><a href="#foundations">Foundations</a><a href="#tokens">Design tokens</a><span aria-current="page">How a disabled container is derived</span></tanrei-breadcrumbs>';
    await mount(page, [raw('real', {}, `${trail}<h1>How a disabled container is derived</h1><div data-part="actions"><tanrei-button>Edit</tanrei-button></div>`)], { icons: true });
    await page.waitForFunction(() => !!customElements.get('tanrei-breadcrumbs'));
    const crumbs = breadcrumbs(page, 'real');
    const entries = () =>
      crumbs.evaluate((el) =>
        [...el.shadowRoot!.querySelectorAll('li')].flatMap((li) => (!li.getClientRects().length ? [] : li.classList.contains('more') ? ['…'] : [li.querySelector('slot')!.assignedElements()[0]?.textContent ?? ''])),
      );
    for (const width of [768, 320]) {
      await size(page, 'real', width);
      const [box, own] = [await edges(host(page, 'real')), await edges(crumbs)];
      expect([own.left, own.top, own.width], `${width}`).toEqual([box.left, box.top, box.width]);
      near((await edges(title(page, 'real'))).top - own.bottom, await resolveToken(page, T('breadcrumbs-gap')), 0.1);
      expect((await edges(actions(page, 'real'))).top).toBeGreaterThanOrEqual(own.bottom);
      // One line of its own text, whatever the head's: the head restyles nothing of it.
      near(own.height, Number.parseFloat(await css(crumbs.locator('> a').first(), 'line-height')), 0.1);
      expect(await entries(), `${width}`).toEqual(width === 768 ? ['Home', 'Documentation', 'Foundations', 'Design tokens', 'How a disabled container is derived'] : ['…', 'How a disabled container is derived']);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }
    await expect(stage(page, 'real').getByRole('navigation', { name: 'Breadcrumbs' })).toHaveCount(1);
    expect(await crumbs.getAttribute('role')).toBeNull();
    expect(await css(crumbs.locator('> a').first(), 'text-decoration-line')).toBe('underline');
    // First in the focus order of the head.
    expect(await host(page, 'real').evaluate((el) => el.querySelector('a, button, [tabindex], tanrei-button')?.id)).toBe('real-up');
  });

  test('PGH-6: the eyebrow is drawn directly above the title in eyebrow.typescale and eyebrow.color, in capitals that are drawn only — its text stays as written — and wraps; it is text read before the title, not a heading and not part of the heading’s name', async ({ page }) => {
    await mount(page, some('eyebrow', 'japanese'));
    const brow = eyebrow(page, 'eyebrow');
    expect([await css(brow, 'text-transform'), await brow.textContent(), await brow.evaluate((el) => (el as HTMLElement).innerText.trim())]).toEqual(['uppercase', 'Announcements', 'ANNOUNCEMENTS']);
    expect([await px(brow, 'font-size'), await css(brow, 'color')]).toEqual([await resolveToken(page, T('eyebrow-typescale-font-size')), await resolveColor(page, T('eyebrow-color'))]);
    expect(await px(brow, 'font-size')).toBe(await resolveToken(page, '--tanrei-sys-typescale-eyebrow-font-size'));
    near((await edges(title(page, 'eyebrow'))).top - (await edges(brow)).bottom, await resolveToken(page, T('eyebrow-gap')), 0.01);
    expect((await edges(brow)).top).toBe((await edges(host(page, 'eyebrow'))).top);
    // A script without capitals is unchanged.
    expect(await eyebrow(page, 'japanese').evaluate((el) => (el as HTMLElement).innerText.trim())).toBe('お知らせ');
    // Text, read before the title: no heading, no role, and the heading's name is the title alone.
    expect(await brow.evaluate((el) => [el.localName, el.getAttribute('role'), el.compareDocumentPosition(el.parentElement!.querySelector('h1')!) & Node.DOCUMENT_POSITION_FOLLOWING])).toEqual(['p', null, 4]);
    await expect(stage(page, 'eyebrow').getByRole('heading', { name: 'Tokens are derived, and design systems are layers', exact: true })).toHaveCount(1);
    await expect(stage(page, 'eyebrow').getByRole('heading')).toHaveCount(1);
    // It wraps, and is never cut.
    await size(page, 'eyebrow', 60);
    expect([await css(brow, 'overflow'), await css(brow, 'text-overflow')]).toEqual(['visible', 'clip']);
    expect((await textBox(brow)).right).toBeLessThanOrEqual((await edges(host(page, 'eyebrow'))).right + 0.5);
  });

  test('PGH-7: the description is a paragraph under the title in the text style of its size and in description.color, no wider than description.measure times its font size — 576 in a head 768 wide — at the start edge, wrapped and never cut; the slot’s content takes its place; a link in it is underlined at rest and inline code sits on its baseline without making its line taller', async ({ page }) => {
    await mount(page, [...some('medium', 'small', 'large', 'description-slot'), raw('inline', {}, '<h1>Tokens</h1><p>Read <a id="link" href="#layers">how layers work</a> and set <code class="tanrei-code">comp.button</code> once.</p>'), raw('plain', {}, '<h1>Tokens</h1><p>Read how layers work and set a token once.</p>')]);
    await page.addStyleTag({ content: fs.readFileSync(path.join(pkg, 'dist/code.css'), 'utf8') });
    const gaps = { small: 4, medium: 8, large: 16 } as const;
    for (const name of SIZES) {
      const lead = description(page, name);
      expect([await px(lead, 'font-size'), await css(lead, 'color')], name).toEqual([await resolveToken(page, T(`description-typescale-${name}-font-size`)), await resolveColor(page, T('description-color'))]);
      expect(await lead.evaluate((el) => el.localName)).toBe('p');
      const gap = (await edges(lead)).top - (await edges(title(page, name))).bottom;
      near(gap, await resolveToken(page, T(`description-gap-${name}`)), 0.01);
      expect(Math.round(gap)).toBe(gaps[name]);
      expect((await edges(lead)).left).toBe((await edges(host(page, name))).left);
      expect([await css(lead, 'text-align'), await css(lead, 'overflow'), await css(lead, 'text-overflow')]).toEqual(['left', 'visible', 'clip']);
    }
    // The measure: 36 times the description's own font size.
    const measure = Number(await page.evaluate((t) => getComputedStyle(document.documentElement).getPropertyValue(t), T('description-measure')));
    expect([(await edges(host(page, 'medium'))).width, measure, await px(description(page, 'medium'), 'max-width')]).toEqual([768, 36, 576]);
    expect((await edges(description(page, 'medium'))).width).toBeLessThanOrEqual(576);
    expect(await px(description(page, 'small'), 'max-width')).toBe(36 * (await resolveToken(page, T('description-typescale-small-font-size'))));
    await expect(stage(page, 'description-slot').locator(`${TAG} > p`)).toHaveText('Which component exists on which platform, generated from the repository.');
    // A link is underlined at rest; inline code does not make its line taller.
    expect(await css(page.locator('#link'), 'text-decoration-line')).toBe('underline');
    expect((await edges(description(page, 'inline'))).height).toBe((await edges(description(page, 'plain'))).height);
    // A paragraph that follows the heading: not a heading, and not part of its name.
    await expect(stage(page, 'medium').getByRole('heading', { name: 'Typography', exact: true })).toHaveCount(1);
  });
});

test.describe('the meta line', () => {
  test('PGH-8: the meta items in the order given as a row that starts at the start edge and wraps — blog-post draws four on one row in a head 768 wide, item-gap apart; 288 wide they wrap onto rows 4 apart and every item is whole — in meta.typescale and meta.color, centred on their row; a glyph or an Avatar and its text are centred on one line, icon.gap apart; a Tag, a Link and an Avatar keep their own look; no item is given a role, reordered or hidden', async ({ page }) => {
    const composed = raw(
      'composed',
      {},
      `<h1>Default typefaces and icons</h1><div data-part="meta"><span id="by"><span id="picture" aria-hidden="true" style="flex: none; inline-size: 20px; block-size: 20px; border-radius: 50%; background: currentColor"></span>The Tanrei team</span><time datetime="2026-09-21">21 September 2026</time><a id="more" class="tanrei-link" href="#all">All posts</a><tanrei-tag id="tag" size="small" label="Tokens"></tanrei-tag></div>`,
    );
    await mount(page, [...some('blog-post', 'meta'), composed], { icons: true });
    const [itemGap, rowGap, metaGap] = [await resolveToken(page, T('meta-item-gap')), await resolveToken(page, T('meta-row-gap')), await resolveToken(page, T('meta-gap'))];
    expect([itemGap, rowGap, metaGap]).toEqual([16, 4, 12]);
    const boxes = async (id: string, count: number) => Promise.all(Array.from({ length: count }, (_, i) => edges(item(page, id, i + 1))));
    const row = await boxes('blog-post', 4);
    // One row, from the start edge, in the order given, item-gap apart.
    expect(new Set(row.map((box) => Math.round(box.top))).size).toBe(1);
    expect(row[0].left).toBe((await edges(host(page, 'blog-post'))).left);
    for (let i = 1; i < row.length; i++) near(row[i].left - row[i - 1].right, itemGap, 0.01);
    expect(await meta(page, 'blog-post').evaluate((el) => [...el.children].map((child) => child.textContent))).toEqual(fixture('blog-post').items!.map((entry) => entry.content));
    near((await edges(meta(page, 'blog-post'))).top - (await edges(description(page, 'blog-post'))).bottom, metaGap, 0.01);
    const text = item(page, 'blog-post', 1);
    expect([await px(text, 'font-size'), await css(text, 'color')]).toEqual([await resolveToken(page, T('meta-typescale-font-size')), await resolveColor(page, T('meta-color'))]);
    expect(await px(text, 'font-size')).toBe(await resolveToken(page, '--tanrei-sys-typescale-body-small-font-size'));
    expect(await meta(page, 'blog-post').evaluate((el) => [el.getAttribute('role'), ...[...el.children].map((child) => child.getAttribute('role'))])).toEqual([null, null, null, null, null]);
    // A narrow head: rows row-gap apart, every item whole on its row.
    await size(page, 'blog-post', 288);
    const wrapped = await boxes('blog-post', 4);
    const tops = [...new Set(wrapped.map((box) => Math.round(box.top * 100) / 100))].sort((a, b) => a - b);
    expect(tops.length).toBeGreaterThan(1);
    const rowHeight = wrapped[0].height;
    for (let i = 1; i < tops.length; i++) near(tops[i] - tops[i - 1] - rowHeight, rowGap, 0.01);
    for (const [i, box] of wrapped.entries()) {
      expect(await lines(item(page, 'blog-post', i + 1)), String(i)).toBe(1);
      expect(box.right).toBeLessThanOrEqual((await edges(host(page, 'blog-post'))).right + 0.5);
    }
    // An item wider than the head wraps inside itself, and nothing is cut.
    await size(page, 'blog-post', 96);
    expect(await lines(item(page, 'blog-post', 1))).toBeGreaterThan(1);
    expect(await stage(page, 'blog-post').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    // A picture and its text in one item: centred on one line, icon.gap apart. (The web has no Avatar element yet — a
    // box of an avatar's small size stands for it; a glyph is placed the same way.)
    await page.waitForFunction(() => !!customElements.get('tanrei-tag'));
    await frame(page);
    const [avatar, name] = [await edges(page.locator('#picture')), await page.locator('#by').evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el.lastChild!);
      const r = range.getBoundingClientRect();
      return { left: r.left, top: r.top, bottom: r.bottom };
    })];
    near(name.left - avatar.right, await resolveToken(page, T('meta-icon-gap')), 0.01);
    near((avatar.top + avatar.bottom) / 2, (name.top + name.bottom) / 2, 1);
    // The items of a row are centred on it.
    const mixed = await boxes('composed', 4);
    const centre = (box: { top: number; bottom: number }) => (box.top + box.bottom) / 2;
    for (const box of mixed.slice(1)) near(centre(box), centre(mixed[0]), 0.51);
    // A component placed as an item keeps its own: the Tag's and the Avatar's size and color are their tokens', and the Link is a link.
    await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<div id="outside"><tanrei-tag size="small" label="Tokens"></tanrei-tag><a class="tanrei-link" href="#all">All posts</a></div>'));
    await frame(page);
    expect([(await edges(page.locator('#tag'))).width, (await edges(page.locator('#tag'))).height]).toEqual([(await edges(page.locator('#outside tanrei-tag'))).width, (await edges(page.locator('#outside tanrei-tag'))).height]);
    expect([await css(page.locator('#more'), 'color'), await css(page.locator('#more'), 'text-decoration-line'), await css(page.locator('#more'), 'font-size')]).toEqual([await css(page.locator('#outside a'), 'color'), await css(page.locator('#outside a'), 'text-decoration-line'), `${await resolveToken(page, T('meta-typescale-font-size'))}px`]);
  });

  // The real element in the stand-in's place.
  test('PGH-8: a real Avatar in a meta item keeps its own small size and its own semantics — decorative beside its name, so the name is read once — and is centred on the line with its text, icon.gap apart, before its picture arrives and after', async ({ page }) => {
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route('https://pictures.test/team.png', async (route) => {
      await held;
      return route.fulfill({ contentType: 'image/png', body: fs.readFileSync(path.join(pkg, 'test/fixtures/avatar.png')) });
    });
    const byline = (id: string, avatar: string) => raw(id, {}, `<h1>Default typefaces and icons</h1><div data-part="meta"><span id="${id}-by">${avatar}The Tanrei team</span><time datetime="2026-09-21">21 September 2026</time><span>4 min read</span></div>`);
    await mount(
      page,
      [
        byline('picture', '<tanrei-avatar size="small" decorative initials="TT"></tanrei-avatar>'),
        byline('initials', '<tanrei-avatar size="small" decorative initials="TT"></tanrei-avatar>'),
        byline('glyph', '<tanrei-avatar size="small" decorative shape="square"></tanrei-avatar>'),
        byline('named', '<tanrei-avatar size="small" label="The Tanrei team" initials="TT"></tanrei-avatar>'),
        byline('none', ''),
      ],
      { icons: true },
    );
    await page.waitForFunction(() => !!customElements.get('tanrei-avatar'));
    // The picture is asked for once the page has loaded, and is held until the head has been measured without it.
    await host(page, 'picture').locator('tanrei-avatar').evaluate((el) => ((el as HTMLElement & { src: string }).src = 'https://pictures.test/team.png'));
    await page.evaluate(() => Promise.all([...document.querySelectorAll('tanrei-avatar')].map((el) => (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete)));
    await frame(page);
    const side = await resolveToken(page, '--tanrei-comp-avatar-container-size-small');
    const gap = await resolveToken(page, T('meta-icon-gap'));
    const placed = async (id: string) => {
      const avatar = await edges(host(page, id).locator('tanrei-avatar'));
      const name = await page.locator(`#${id}-by`).evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el.lastChild!);
        const r = range.getBoundingClientRect();
        return { left: r.left, top: r.top, bottom: r.bottom };
      });
      return { avatar, name, items: await Promise.all([1, 2, 3].map((n) => edges(item(page, id, n)))), head: await edges(host(page, id)) };
    };
    const centre = (box: { top: number; bottom: number }) => (box.top + box.bottom) / 2;
    for (const id of ['picture', 'initials', 'glyph', 'named']) {
      const { avatar, name, items } = await placed(id);
      // Its own size: the avatar's small side, whatever the meta line's text style.
      expect([avatar.width, avatar.height], id).toEqual([side, side]);
      // Centred on the line with its text, icon.gap apart; the other items centred on the same row.
      near(name.left - avatar.right, gap, 0.01);
      near(centre(avatar), centre(name), 1);
      for (const other of items.slice(1)) near(centre(other), centre(items[0]), 0.51);
    }
    // Its own colors: the avatar's fill and initials, not the meta line's.
    const own = host(page, 'initials').locator('tanrei-avatar');
    expect(await css(own.locator('.container'), 'background-color')).toBe(await resolveColor(page, '--tanrei-comp-avatar-container-color'));
    expect(await px(own.locator('.label'), 'font-size')).toBe(await resolveToken(page, '--tanrei-comp-avatar-label-typescale-small-font-size'));
    // Its own semantics: decorative beside the name, it exposes nothing and the name is read once; named, it is an image.
    for (const id of ['picture', 'initials', 'glyph']) {
      await expect(host(page, id).getByRole('img'), id).toHaveCount(0);
      expect(await host(page, id).locator('tanrei-avatar').getAttribute('aria-hidden'), id).toBe('true');
    }
    await expect(host(page, 'named').getByRole('img', { name: 'The Tanrei team', exact: true })).toHaveCount(1);
    // The avatar takes a row of the small side: the meta line of a head with one is that much taller than one without, and no more.
    const [withAvatar, without] = [await placed('initials'), await edges(item(page, 'none', 1))];
    expect(withAvatar.items[0].height).toBe(Math.max(side, without.height));
    // The picture arrives: nothing in the head moves.
    const before = await placed('picture');
    expect(await host(page, 'picture').locator('tanrei-avatar .label').textContent()).toBe('TT');
    release();
    await expect(host(page, 'picture').locator('tanrei-avatar .image.loaded')).toHaveCount(1);
    expect(await placed('picture')).toEqual(before);
  });

  test('PGH-9: between two items on one row a filled circle of separator.size in separator.color, centred in the space between them and on the row — the fixture meta draws two dots between three items; none before the first item of a row or after the last, none where there is one item; it is not text, not read, not copied and not mirrored; a separator the product writes is left', async ({ page }) => {
    await mount(page, [...some('meta', 'meta-one', 'rtl'), raw('written', {}, '<h1>Roadmap</h1><div data-part="meta"><span>One</span><span aria-hidden="true">/</span><span>Two</span></div>')]);
    const [dotSize, gap] = [await resolveToken(page, T('meta-separator-size')), await resolveToken(page, T('meta-item-gap'))];
    expect([dotSize, gap]).toEqual([4, 16]);
    const dots = await Promise.all([1, 2, 3].map((n) => dot(item(page, 'meta', n))));
    expect(dots[0]).toBeNull();
    expect(dots.filter(Boolean)).toHaveLength(2);
    for (const n of [2, 3]) {
      const [mark, before, self] = [dots[n - 1]!, await edges(item(page, 'meta', n - 1)), await edges(item(page, 'meta', n))];
      expect([mark.width, mark.height, mark.color]).toEqual([dotSize, dotSize, await resolveColor(page, T('meta-separator-color'))]);
      // A circle: the radius reaches half the size.
      expect(mark.radius).toBeGreaterThanOrEqual(dotSize / 2);
      // In the middle of the space between the two, and on the row's line of text.
      near((mark.left + mark.right) / 2, (before.right + self.left) / 2, 0.01);
      near((mark.top + mark.bottom) / 2, (self.top + self.bottom) / 2, 0.01);
    }
    // One item: none.
    expect(await dot(item(page, 'meta-one', 1))).toBeNull();
    // Not text: nothing is read or copied but the items.
    expect(await meta(page, 'meta').evaluate((el) => [(el as HTMLElement).innerText.replace(/\s+/g, ' ').trim(), getComputedStyle(el.children[1], '::before').content])).toEqual(['20 September 2026 The Tanrei team 4 min read', '""']);
    await expect(meta(page, 'meta')).toMatchAriaSnapshot(`
      - text: 20 September 2026 The Tanrei team 4 min read
    `);
    // Each item on a row of its own: the dot of an item that begins a row stands outside what the row shows.
    await size(page, 'meta', 120);
    const rows = await Promise.all([1, 2, 3].map((n) => edges(item(page, 'meta', n))));
    expect(new Set(rows.map((box) => Math.round(box.top))).size).toBe(3);
    const clip = await meta(page, 'meta').evaluate((el) => ({ left: el.getBoundingClientRect().left, path: getComputedStyle(el).clipPath }));
    expect(clip.path).toMatch(/^inset\(/);
    const cut = clip.left - (gap - dotSize) / 2;
    for (const n of [2, 3]) expect((await dot(item(page, 'meta', n)))!.right, String(n)).toBeLessThanOrEqual(cut + 0.01);
    // …and what is at the place of that dot is not the meta line: nothing of it is drawn there.
    const hidden = (await dot(item(page, 'meta', 2)))!;
    expect(await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest('[data-part="meta"]'), [(hidden.left + hidden.right) / 2, (hidden.top + hidden.bottom) / 2])).toBe(false);
    // Right-to-left: the same dot in the same place between two items, not mirrored.
    const [mark, first, second] = [(await dot(item(page, 'rtl', 2)))!, await edges(item(page, 'rtl', 1)), await edges(item(page, 'rtl', 2))];
    near((mark.left + mark.right) / 2, (first.left + second.right) / 2, 0.01);
    expect(await item(page, 'rtl', 2).evaluate((el) => getComputedStyle(el, '::before').transform)).toBe('none');
    // A separator the product wrote is still there.
    await expect(meta(page, 'written').locator('> span')).toHaveCount(3);
    expect(await css(meta(page, 'written').locator('> span').nth(1), 'display')).not.toBe('none');
  });
});

test.describe('the actions', () => {
  /** The centre of the title's first line. */
  const firstLine = (page: P, id: string) =>
    title(page, id).evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const [first] = [...range.getClientRects()].filter((rect) => rect.width > 0);
      const line = Number.parseFloat(getComputedStyle(el).lineHeight);
      return { centre: (first.top + first.bottom) / 2, top: el.getBoundingClientRect().top, line };
    });
  const centre = (box: { top: number; bottom: number }) => (box.top + box.bottom) / 2;

  test('PGH-10: in a head 768 wide the fixture actions has its two Buttons at the end edge, centred on the 40 line of the title (actions taller than the line start at its top and grow the head downward), container.gap after the text’s column, which keeps at least half of the head; 400 wide they are under the description, 16 below it, at the start edge; actions-below has them under the text at 768; the width that decides is the head’s own, never the window’s', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await mount(page, [...some('actions', 'actions-below', 'small-actions', 'long-title-actions', 'everything'), raw('many', {}, `<h1>Members</h1><div data-part="actions">${Array.from({ length: 6 }, (_, i) => `<tanrei-button variant="outlined">A long action ${i + 1}</tanrei-button>`).join('')}</div>`)]);
    const wide = await resolveToken(page, T('wide-container-width'));
    expect(wide).toBe(480);
    const box = await edges(host(page, 'actions'));
    expect(box.width).toBe(768);
    const [last, first, line] = [await edges(action(page, 'actions', 2)), await edges(action(page, 'actions', 1)), await firstLine(page, 'actions')];
    near(last.right, box.right, 0.01);
    near(line.line, 40, 0.01);
    near(centre(first), line.top + 20, 0.51);
    near(centre(last), line.centre, 1);
    // The text is one column that takes the rest; the actions stand container.gap after it.
    const text = await edges(title(page, 'actions'));
    near((await edges(actions(page, 'actions'))).left - text.right, await resolveToken(page, T('container-gap')), 0.01);
    expect(first.left).toBeGreaterThanOrEqual(text.right + (await resolveToken(page, T('container-gap'))) - 0.01);
    expect((await edges(description(page, 'actions'))).right).toBeLessThanOrEqual(text.right);
    // Centred on the first line however many lines the title has, while they are no taller than the line.
    expect(await lines(title(page, 'long-title-actions'))).toBeGreaterThan(1);
    near(centre(await edges(action(page, 'long-title-actions', 1))), (await firstLine(page, 'long-title-actions')).top + 20, 0.51);
    // A Button taller than the line starts at the line's top and never stands out of the head above it.
    const small = await firstLine(page, 'small-actions');
    const smallAction = await edges(action(page, 'small-actions', 1));
    expect(small.line).toBeLessThan(smallAction.height);
    near(smallAction.top, small.top, 0.51);
    expect(smallAction.top).toBeGreaterThanOrEqual((await edges(host(page, 'small-actions'))).top - 0.01);
    // Below the breadcrumbs and the eyebrow, level with the title.
    near(centre(await edges(action(page, 'everything', 1))), (await firstLine(page, 'everything')).top + 20, 0.51);
    // The column keeps at least half of the head, and actions that need more wrap in their own box.
    expect((await edges(title(page, 'many'))).width).toBeGreaterThanOrEqual(768 / 2 - 0.5);
    expect(new Set(await actions(page, 'many').evaluate((el) => [...el.children].map((child) => Math.round(child.getBoundingClientRect().top)))).size).toBeGreaterThan(1);
    // Rows that wrap start at the top of the title's first line and grow the head downward: nothing stands out of it.
    const manyLine = await firstLine(page, 'many');
    const manyActions = await edges(actions(page, 'many'));
    const manyHead = await edges(host(page, 'many'));
    near((await edges(action(page, 'many', 1))).top, manyLine.top, 0.51);
    expect(manyActions.top).toBeGreaterThanOrEqual(manyHead.top - 0.01);
    expect(manyActions.bottom).toBeLessThanOrEqual(manyHead.bottom + 0.01);
    expect(await stage(page, 'many').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);

    // actions-below: under the text at every width.
    const below = await edges(action(page, 'actions-below', 1));
    near(below.top - (await edges(description(page, 'actions-below'))).bottom, await resolveToken(page, T('actions-gap')), 0.01);
    expect(below.left).toBe((await edges(host(page, 'actions-below'))).left);
    // A narrow head, in the same wide window: the head's own width decides.
    await size(page, 'actions', 400);
    const narrow = await edges(action(page, 'actions', 1));
    expect(Math.round((narrow.top - (await edges(description(page, 'actions'))).bottom) * 100) / 100).toBe(16);
    expect(narrow.left).toBe((await edges(host(page, 'actions'))).left);
    expect((await edges(title(page, 'actions'))).width).toBe(400);
    // The step is at wide.container-width exactly.
    await size(page, 'actions', wide);
    near((await edges(action(page, 'actions', 2))).right, (await edges(host(page, 'actions'))).right, 0.01);
    await size(page, 'actions', wide - 1);
    expect((await edges(action(page, 'actions', 1))).left).toBe((await edges(host(page, 'actions'))).left);
    // A narrow window with a wide head keeps the actions beside the title.
    await page.setViewportSize({ width: 1280, height: 400 });
    await size(page, 'actions', 768);
    near((await edges(action(page, 'actions', 2))).right, (await edges(host(page, 'actions'))).right, 0.01);
  });

  test('PGH-11: the actions are a row in the order given, actions.item-gap between two along the row and between rows, ending at the end edge beside the text and starting at the start edge below it; no label is cut and no action is restyled; in the reading and the focus order they come after the meta line at 768 and at 320 alike', async ({ page, browserName }) => {
    await mount(page, [...some('everything', 'large-landing'), LINKED('linked')]);
    const gap = await resolveToken(page, T('actions-item-gap'));
    expect(gap).toBe(8);
    const [first, second] = [await edges(action(page, 'everything', 1)), await edges(action(page, 'everything', 2))];
    near(second.left - first.right, gap, 0.01);
    near(second.right, (await edges(host(page, 'everything'))).right, 0.01);
    await expect(action(page, 'everything', 1)).toHaveText('Edit');
    // Not restyled or resized: a Button in the row is the Button it is outside it.
    await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<tanrei-button id="outside" variant="text">Edit</tanrei-button>'));
    await frame(page);
    expect([first.width, first.height]).toEqual([(await edges(page.locator('#outside'))).width, (await edges(page.locator('#outside'))).height]);
    // Below the text: from the start edge, wrapping with the same gap between rows.
    const landing = await Promise.all([1, 2, 3].map((n) => edges(action(page, 'large-landing', n))));
    expect(landing[0].left).toBe((await edges(host(page, 'large-landing'))).left);
    near(landing[1].left - landing[0].right, gap, 0.01);
    await size(page, 'large-landing', 200);
    const stacked = await Promise.all([1, 2, 3].map((n) => edges(action(page, 'large-landing', n))));
    const tops = [...new Set(stacked.map((box) => box.top))].sort((a, b) => a - b);
    expect(tops.length).toBeGreaterThan(1);
    near(tops[1] - tops[0] - stacked[0].height, gap, 0.01);
    for (const n of [1, 2, 3]) expect(await action(page, 'large-landing', n).evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);

    // The order of focus and of the accessibility tree: the same at 768 and at 320.
    const walk = async () => {
      await page.locator('#linked-up').evaluate((el) => (el as HTMLElement).focus());
      const stops = ['linked-up'];
      for (let presses = 0; presses < 4; presses++) {
        await tab(page);
        stops.push(await page.evaluate(() => document.activeElement?.id ?? ''));
      }
      return stops;
    };
    const order = ['linked-up', 'linked-inline', 'linked-author', 'linked-edit', 'linked-share'];
    const tree = `
      - navigation "Breadcrumbs":
        - link "Foundations"
      - paragraph: Guides
      - heading "Add a design system as a layer" [level=1]
      - paragraph:
        - text: A layer changes values and may extend the
        - link "vocabulary"
        - text: ; it never forks a component.
      - time: 7 October 2026
      - link "The Tanrei team"
      - text: 8 min read
      - button "Edit"
      - button "Share"
    `;
    for (const width of [768, 320]) {
      await size(page, 'linked', width);
      // Beside the title at 768, drawn above the description; below everything at 320 — and last in the order either way.
      const drawnAbove = (await edges(actions(page, 'linked'))).top < (await edges(description(page, 'linked'))).top;
      expect(drawnAbove, String(width)).toBe(width === 768);
      if (browserName !== 'webkit' || process.platform !== 'darwin') expect(await walk(), String(width)).toEqual(order);
      await expect(host(page, 'linked')).toMatchAriaSnapshot(tree);
      expect(await host(page, 'linked').evaluate((el) => [...el.children].map((child) => getComputedStyle(child).order))).toEqual(['0', '0', '0', '0', '0', '0']);
    }
  });

  test('PGH-12: a large head narrower than wide.container-width draws its title in the medium text style and the medium space under it, and everything else as a large head — the font size of sys.typescale.heading-1 at 400, of sys.typescale.display at 768 — one step at that width, with the same level and the same order', async ({ page }) => {
    await mount(page, some('large', 'large-landing'));
    const [display, heading1] = [await resolveToken(page, '--tanrei-sys-typescale-display-font-size'), await resolveToken(page, '--tanrei-sys-typescale-heading-1-font-size')];
    const wide = await resolveToken(page, T('wide-container-width'));
    const read = async () => ({ font: await px(title(page, 'large'), 'font-size'), gap: Math.round(((await edges(description(page, 'large'))).top - (await edges(title(page, 'large'))).bottom) * 100) / 100, end: await px(host(page, 'large'), 'padding-bottom'), lead: await px(description(page, 'large'), 'font-size') });
    const large = { font: display, gap: await resolveToken(page, T('description-gap-large')), end: await resolveToken(page, T('container-padding-block-end-large')), lead: await resolveToken(page, T('description-typescale-large-font-size')) };
    expect(await read()).toEqual(large);
    await size(page, 'large', 400);
    expect(await read()).toEqual({ ...large, font: heading1, gap: await resolveToken(page, T('description-gap-medium')) });
    // One step, at that width.
    await size(page, 'large', wide - 1);
    expect((await read()).font).toBe(heading1);
    await size(page, 'large', wide);
    expect((await read()).font).toBe(display);
    await size(page, 'large', 1200);
    expect((await read()).font).toBe(display);
    // The level and the order of the parts do not change.
    await size(page, 'large', 400);
    await expect(stage(page, 'large').getByRole('heading', { level: 1 })).toHaveCount(1);
    await size(page, 'large-landing', 400);
    expect(await host(page, 'large-landing').evaluate((el) => [...el.children].map((child) => Math.round(child.getBoundingClientRect().top)).every((top, i, all) => i === 0 || top >= all[i - 1]))).toBe(true);
    // The letter-spacing follows the style that is drawn.
    expect(await px(title(page, 'large'), 'letter-spacing')).toBe(-0.03 * heading1);
  });
});

test.describe('the block', () => {
  test('PGH-13: divider draws one line of divider.thickness in divider.color along the bottom edge of the box, across its whole width, below the space kept under the last part — the fixture divider is the fixture medium plus one line of 1 — and is not exposed as a separator; without it none is drawn', async ({ page }) => {
    await mount(page, some('medium', 'divider', 'small-divider'));
    const [thickness, color] = [await resolveToken(page, T('divider-thickness')), await resolveColor(page, T('divider-color'))];
    expect(thickness).toBe(1);
    const [plain, ruled] = [host(page, 'medium'), host(page, 'divider')];
    expect([await px(plain, 'border-bottom-width'), await px(ruled, 'border-bottom-width'), await css(ruled, 'border-bottom-color'), await css(ruled, 'border-bottom-style')]).toEqual([0, thickness, color, 'solid']);
    expect((await edges(ruled)).height - (await edges(plain)).height).toBe(thickness);
    // Every part is where it is without the line.
    const place = async (id: string) => {
      const top = (await edges(host(page, id))).top;
      return [(await edges(title(page, id))).top - top, (await edges(description(page, id))).top - top, (await edges(description(page, id))).bottom - top];
    };
    expect(await place('divider')).toEqual(await place('medium'));
    near((await edges(ruled)).bottom - thickness - (await edges(description(page, 'divider'))).bottom, await resolveToken(page, T('container-padding-block-end-medium')), 0.01);
    // Decorative: no separator in the accessibility tree.
    await expect(stage(page, 'divider').getByRole('separator')).toHaveCount(0);
    expect(await ruled.getAttribute('role')).toBeNull();
    // Turned on and off while shown.
    await plain.evaluate((el) => ((el as unknown as { divider: boolean }).divider = true));
    await expect.poll(() => px(plain, 'border-bottom-width')).toBe(thickness);
    await plain.evaluate((el) => ((el as unknown as { divider: boolean }).divider = false));
    await expect.poll(() => px(plain, 'border-bottom-width')).toBe(0);
  });

  test('PGH-14: the head is a block in the flow of its container: the whole inline size it is given, its start edge on the start edge of what follows, no outer space, no least and no greatest width, never wider than its container; it does not scroll, stick, float or change with the page’s scrolling', async ({ page }) => {
    await mount(page, [...some('medium', 'everything'), raw('in-shell', {}, '<h1>Typography</h1><p>Text styles are named by level.</p>')]);
    for (const id of ['medium', 'everything']) {
      const el = host(page, id);
      expect([await css(el, 'display'), await css(el, 'position'), await css(el, 'float'), await css(el, 'overflow'), await css(el, 'min-width'), await css(el, 'max-width')], id).toEqual(['grid', 'static', 'none', 'visible', '0px', 'none']);
      expect((await edges(el)).width, id).toBe(768);
      expect(['top', 'right', 'bottom', 'left'].map((side) => side), id).toHaveLength(4);
      for (const side of ['top', 'right', 'bottom', 'left']) expect(await px(el, `margin-${side}`), `${id} ${side}`).toBe(0);
    }
    // Whatever its container gives it: narrower, and never wider.
    for (const width of [1000, 320, 140]) {
      await size(page, 'everything', width);
      expect((await edges(host(page, 'everything'))).width, String(width)).toBe(width);
      expect(await stage(page, 'everything').evaluate((el) => el.scrollWidth <= el.clientWidth), String(width)).toBe(true);
    }
    // It scrolls with the content it heads.
    await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<div style="block-size: 3000px"></div>'));
    const before = await edges(host(page, 'medium'));
    await page.evaluate(() => window.scrollTo(0, 300));
    const after = await edges(host(page, 'medium'));
    expect([after.top, after.height]).toEqual([before.top - 300, before.height]);
    // In the main region of an app shell its start edge is the content's.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.addStyleTag({ content: fs.readFileSync(path.join(pkg, 'dist/app-shell.css'), 'utf8') });
    await stage(page, 'in-shell').evaluate((el) => {
      const head = el.querySelector('tanrei-page-header')!;
      el.style.cssText = 'inline-size: auto; max-inline-size: none; padding: 0';
      const shell = document.createElement('tanrei-app-shell');
      shell.innerHTML = '<main id="shell-main"><p id="following" style="margin: 0">What follows.</p></main>';
      el.append(shell);
      shell.querySelector('main')!.prepend(head);
    });
    await frame(page);
    expect((await edges(host(page, 'in-shell'))).left).toBe((await edges(page.locator('#following'))).left);
    expect((await textBox(title(page, 'in-shell'))).left).toBe((await textBox(page.locator('#following'))).left);
  });

  test('PGH-15: the head has no state: it answers no pointer, press, key or focus, draws no state layer, ripple or focus ring, takes no place in the focus order and emits no event; its text stays selectable; a Button inside it is reached and answers by itself', async ({ page }) => {
    await mount(page, [LINKED('linked')]);
    const el = host(page, 'linked');
    const look = () => el.evaluate((node) => [...[node, ...node.children].map((part) => `${getComputedStyle(part).backgroundColor} ${getComputedStyle(part).color} ${getComputedStyle(part).outlineStyle} ${getComputedStyle(part).boxShadow} ${getComputedStyle(part).opacity}`)].join('|'));
    const rest = await look();
    await page.evaluate(() => {
      (window as unknown as { __events: string[] }).__events = [];
      const head = document.querySelector('tanrei-page-header')!;
      for (const type of ['change', 'input', 'toggle', 'close', 'select']) head.addEventListener(type, () => (window as unknown as { __events: string[] }).__events.push(type));
    });
    const box = await edges(title(page, 'linked'));
    await page.mouse.move(box.left + 10, box.top + 10);
    expect(await look()).toBe(rest);
    await page.mouse.down();
    expect(await look()).toBe(rest);
    await page.mouse.up();
    expect(await el.evaluate((node) => [node.tabIndex, node.hasAttribute('tabindex'), node.querySelectorAll('.ripple').length, getComputedStyle(node).cursor, getComputedStyle(node.querySelector('h1')!).userSelect])).toEqual([-1, false, 0, 'auto', expect.stringMatching(/auto|text/)]);
    expect(await page.evaluate(() => document.activeElement === document.body || document.activeElement === null)).toBe(true);
    // Its text can be selected.
    await title(page, 'linked').evaluate((heading) => {
      const range = document.createRange();
      range.selectNodeContents(heading);
      getSelection()!.removeAllRanges();
      getSelection()!.addRange(range);
    });
    expect(await page.evaluate(() => getSelection()!.toString())).toBe('Add a design system as a layer');
    // Input over a Button inside reaches the Button.
    await page.evaluate(() => document.querySelector('#linked-share')!.addEventListener('click', () => (window as unknown as { __events: string[] }).__events.push('button click')));
    await page.locator('#linked-share').click();
    expect(await page.evaluate(() => (window as unknown as { __events: string[] }).__events)).toEqual(['button click']);
  });

  test('PGH-16: the head adds no landmark, no region and no name of its own — it is not the page’s banner — and is exposed as its parts in their order; the heading is found by its level with the title’s text and nothing else as its name', async ({ page }) => {
    await mount(page, some('everything'));
    const el = host(page, 'everything');
    expect(await el.evaluate((node) => [node.getAttribute('role'), node.getAttribute('aria-label'), node.getAttribute('aria-labelledby'), node.shadowRoot])).toEqual([null, null, null, null]);
    await expect(page.getByRole('banner')).toHaveCount(0);
    await expect(page.getByRole('region')).toHaveCount(0);
    await expect(stage(page, 'everything').getByRole('heading', { level: 1, name: 'Add a design system as a layer', exact: true })).toHaveCount(1);
    await expect(el).toMatchAriaSnapshot(`
      - text: Foundations
      - paragraph: Guides
      - heading "Add a design system as a layer" [level=1]
      - paragraph: A layer changes values and may extend the vocabulary; it never forks a component.
      - text: 7 October 2026 The Tanrei team 8 min read
      - button "Edit"
      - button "Share"
    `);
    // A machine that reads the document without running script finds the same heading.
    const document = await fixturesDocument(spec, { fixtures: some('everything') });
    expect(document.replace(/<style>[\s\S]*?<\/style>/g, '').match(/<h1>[^<]+<\/h1>/g)).toEqual(['<h1>Add a design system as a layer</h1>']);
  });

  test('PGH-17: a title, a description, an eyebrow, a size or a part that changes while the head is shown is drawn at once, with no motion, and nothing is announced and focus does not move', async ({ page }) => {
    await mount(page, [LINKED('linked')]);
    await page.locator('#linked-author').evaluate((el) => (el as HTMLElement).focus());
    const el = host(page, 'linked');
    await title(page, 'linked').evaluate((heading) => (heading.textContent = 'Renamed in place'));
    await description(page, 'linked').evaluate((lead) => (lead.textContent = 'A new sentence.'));
    await eyebrow(page, 'linked').evaluate((brow) => (brow.textContent = 'Notes'));
    await expect(stage(page, 'linked').getByRole('heading', { name: 'Renamed in place', exact: true })).toHaveCount(1);
    await el.evaluate((node) => ((node as unknown as { size: string }).size = 'small'));
    // The same frame: the small size's text style.
    expect(await px(title(page, 'linked'), 'font-size')).toBe(await resolveToken(page, T('title-typescale-small-font-size')));
    await meta(page, 'linked').evaluate((line) => line.insertAdjacentHTML('beforeend', '<span id="added">Draft</span>'));
    expect(await dot(page.locator('#added'))).not.toBeNull();
    // No motion of its own, on the head or on any part.
    expect(await el.evaluate((node) => [node, ...node.children].filter((part) => !part.localName.startsWith('tanrei-') && !part.classList.contains('tanrei-link')).map((part) => `${getComputedStyle(part).transitionDuration} ${getComputedStyle(part).animationName}`).filter((motion) => motion !== '0s none'))).toEqual([]);
    // Nothing announces it, and focus stays where it was.
    expect(await el.evaluate((node) => [node.getAttribute('aria-live'), node.querySelectorAll('[aria-live], [role="status"], [role="alert"]').length])).toEqual([null, 0]);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('linked-author');
  });
});

test.describe('text size, forced colors, direction, unknown values', () => {
  test('PGH-18: at 200 % text in a stage 320 wide every word, every meta item and every action of everything and long-title-actions is visible, the actions are below the text and the page does not scroll sideways; text styles and the measure grow, the gaps are kept, no height is fixed; the width that decides grows with the text; raised text spacing loses nothing', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await mount(page, some('everything', 'long-title-actions', 'medium'));
    const before = { font: await px(title(page, 'everything'), 'font-size'), measure: await px(description(page, 'medium'), 'max-width') };
    const gap = (await edges(description(page, 'everything'))).top - (await edges(title(page, 'everything'))).bottom;
    await page.addStyleTag({ content: 'html { font-size: 200%; } main { display: block !important; } .stage { box-sizing: border-box; inline-size: 320px !important; }' });
    await frame(page);
    const whole = async (label: string) => {
      expect(await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]), label).toEqual([320, 320]);
      for (const id of ['everything', 'long-title-actions']) {
        const box = await edges(host(page, id));
        const parts = await host(page, id).evaluate((el) =>
          [...el.querySelectorAll(':scope > *, :scope > [data-part] > *')].map((part) => {
            const range = document.createRange();
            range.selectNodeContents(part);
            const r = part.localName.startsWith('tanrei-') ? part.getBoundingClientRect() : range.getBoundingClientRect();
            const style = getComputedStyle(part);
            return { name: part.localName, left: r.left, right: r.right, height: r.height, clipped: style.overflow !== 'visible' || style.textOverflow !== 'clip', fixed: part.getAttribute('style') };
          }),
        );
        for (const part of parts) {
          expect(part.left, `${label} ${id} ${part.name}`).toBeGreaterThanOrEqual(box.left - 0.5);
          expect(part.right, `${label} ${id} ${part.name}`).toBeLessThanOrEqual(box.right + 0.5);
          expect(part.height, `${label} ${id} ${part.name}`).toBeGreaterThan(0);
          if (!part.name.startsWith('tanrei-')) expect([part.clipped, part.fixed], `${label} ${id} ${part.name}`).toEqual([false, null]);
        }
        // The actions are below the text, at the start edge.
        expect((await edges(actions(page, id))).top, `${label} ${id}`).toBeGreaterThanOrEqual((await edges(description(page, id))).bottom);
        expect((await edges(action(page, id, 1))).left, `${label} ${id}`).toBe(box.left);
      }
    };
    await whole('200 %');
    // Text styles and the measure grow with the text; the gaps are kept as the tokens say.
    expect([await px(title(page, 'everything'), 'font-size'), await px(description(page, 'medium'), 'max-width')]).toEqual([2 * before.font, 2 * before.measure]);
    near((await edges(description(page, 'everything'))).top - (await edges(title(page, 'everything'))).bottom, await resolveToken(page, T('description-gap-medium')), 0.01);
    expect(await resolveToken(page, T('description-gap-medium'))).toBe(2 * gap);
    // The width that decides grows with the text: a head 768 wide at 200 % is still one column, and two at twice that.
    await page.setViewportSize({ width: 2200, height: 800 });
    await page.addStyleTag({ content: '.stage { inline-size: auto !important; }' });
    for (const [width, beside] of [
      [768, false],
      [959, false],
      [960, true],
    ] as const) {
      await stage(page, 'long-title-actions').evaluate((el, w) => el.style.setProperty('inline-size', `${w + 32}px`, 'important'), width);
      await frame(page);
      expect((await edges(host(page, 'long-title-actions'))).width).toBe(width);
      expect((await edges(actions(page, 'long-title-actions'))).top < (await edges(description(page, 'long-title-actions'))).top, String(width)).toBe(beside);
    }
    // WCAG 1.4.12: raised line height, paragraph, letter and word spacing lose nothing.
    await page.setViewportSize({ width: 320, height: 800 });
    await page.addStyleTag({ content: '.stage { inline-size: 320px !important; } tanrei-page-header * { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } tanrei-page-header p { margin-block-end: 2em !important; }' });
    await frame(page);
    await whole('text spacing');
  });

  test('PGH-19: in forced colors the eyebrow, the title, the description and the meta text are the system’s text color, links are still underlined, and the dots and the line of everything are drawn in CanvasText; nothing relies on a fill', async ({ page, browserName }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mount(page, [...some('everything'), LINKED('linked', { divider: true })]);
    test.skip(!(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)), `${browserName} does not emulate forced colors`);
    const text = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = 'CanvasText';
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    });
    const e = 'everything';
    for (const part of [eyebrow(page, e), title(page, e), description(page, e), item(page, e, 1)]) expect(await css(part, 'color')).toBe(text);
    expect((await dot(item(page, e, 2)))!.color).toBe(text);
    expect((await dot(item(page, e, 3)))!.color).toBe(text);
    // (WebKit has the media feature and no `forced-color-adjust`: it forces no color of a page's either.)
    expect(await item(page, e, 2).evaluate((el) => getComputedStyle(el, '::before').forcedColorAdjust ?? 'none')).toBe('none');
    expect([await css(host(page, e), 'border-bottom-color'), await px(host(page, e), 'border-bottom-width')]).toEqual([text, await resolveToken(page, T('divider-thickness'))]);
    expect(await css(host(page, e), 'background-color')).toMatch(/, 0\)$/);
    expect(await css(page.locator('#linked-inline'), 'text-decoration-line')).toBe('underline');
  });

  test('PGH-20: in a right-to-left layout every part starts at the right edge, the meta line runs from the right — its first item the rightmost — and actions beside the text stand at the left edge, centred on the title’s first line; every space is applied by start and end, and nothing the head holds is mirrored', async ({ page }) => {
    await mount(page, some('rtl-everything', 'everything'));
    const r = 'rtl-everything';
    const box = await edges(host(page, r));
    for (const part of [breadcrumbs(page, r), eyebrow(page, r), title(page, r), description(page, r)]) expect((await textBox(part)).right).toBeLessThanOrEqual(box.right + 0.5);
    for (const part of [eyebrow(page, r), title(page, r)]) near((await textBox(part)).right, box.right, 1.5);
    for (const part of [title(page, r), description(page, r), meta(page, r)]) flush((await edges(part)).right, box.right);
    const items = await Promise.all([1, 2, 3].map((n) => edges(item(page, r, n))));
    flush(items[0].right, box.right);
    expect(items[0].left).toBeGreaterThan(items[1].right);
    expect(items[1].left).toBeGreaterThan(items[2].right);
    // The actions at the left edge, their row ending there, centred on the title's first line.
    const buttons = await Promise.all([1, 2].map((n) => edges(action(page, r, n))));
    flush(buttons[1].left, box.left);
    expect(buttons[0].left).toBeGreaterThan(buttons[1].right);
    const heading = await edges(title(page, r));
    near((buttons[0].top + buttons[0].bottom) / 2, heading.top + (await px(title(page, r), 'line-height')) / 2, 0.51);
    near(heading.left - buttons[0].right, await resolveToken(page, T('container-gap')), 0.01);
    // The mirror of the left-to-right head: the same sizes, the other side.
    const ltr = await edges(host(page, 'everything'));
    near(box.right - (await edges(action(page, r, 1))).right, (await edges(action(page, 'everything', 1))).left - ltr.left, 12);
    // Nothing the head holds is mirrored.
    expect(await host(page, r).evaluate((el) => [...el.querySelectorAll('*')].filter((part) => getComputedStyle(part).transform !== 'none' || getComputedStyle(part).scale !== 'none').length)).toBe(0);
  });

  test('PGH-21: the direction is that of the nearest ancestor that sets one — the head has no setting of its own — and a change of it is drawn at once, with no motion, keeping its content and the focus of what is inside it', async ({ page }) => {
    await mount(page, [LINKED('linked')]);
    expect(await page.evaluate(() => [document.documentElement.getAttribute('dir'), document.querySelector('tanrei-page-header')!.getAttribute('dir')])).toEqual([null, null]);
    const el = host(page, 'linked');
    expect(await el.evaluate((node) => 'dir' in node && node.getAttribute('dir') === null && !('direction' in node))).toBe(true);
    const side = async () => {
      const [box, heading, button] = [await edges(el), await textBox(title(page, 'linked')), await edges(action(page, 'linked', 2))];
      return [Math.abs(heading.left - box.left) < 2 ? 'title left' : 'title right', Math.abs(button.right - box.right) < 1 ? 'actions right' : 'actions left'];
    };
    expect(await side()).toEqual(['title left', 'actions right']);
    await page.locator('#linked-author').evaluate((link) => (link as HTMLElement).focus());
    // Set on an ancestor inside the page, not on the root, after the first render.
    await stage(page, 'linked').evaluate((node) => node.setAttribute('dir', 'rtl'));
    expect(await side()).toEqual(['title right', 'actions left']);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('linked-author');
    await expect(title(page, 'linked')).toHaveText('Add a design system as a layer');
    expect(await css(title(page, 'linked'), 'transition-duration')).toBe('0s');
    await stage(page, 'linked').evaluate((node) => node.removeAttribute('dir'));
    expect(await side()).toEqual(['title left', 'actions right']);
  });

  test('PGH-22: the title, the eyebrow and the description are each text of its own direction, isolated, placed and aligned by the layout’s: ltr-title-rtl draws a left-to-right title that begins at the right edge and reads left to right, and its meta item “v2.1 beta” keeps its order', async ({ page }) => {
    await mount(page, [...some('ltr-title-rtl'), raw('mixed', {}, '<p data-part="eyebrow">Tanrei 0.2!</p><h1>Tanrei 0.2 (beta).</h1><p>comp.button.container.color is a token.</p><div data-part="meta"><span>v2.1 beta!</span><time>12:30</time><span>3 files</span></div>', { direction: 'rtl' })]);
    const id = 'ltr-title-rtl';
    const [box, text, order] = [await edges(host(page, id)), await textBox(title(page, id)), await ends(title(page, id))];
    near(text.right, box.right, 1.5);
    expect(order.first).toBeLessThan(order.last);
    expect([await css(title(page, id), 'unicode-bidi'), await css(title(page, id), 'text-align'), await css(title(page, id), 'direction')]).toEqual(['plaintext', 'right', 'rtl']);
    // The meta item keeps its own order, and the items' order is the layout's: the first is the rightmost.
    const version = await ends(item(page, id, 1));
    expect(version.first).toBeLessThan(version.last);
    expect((await edges(item(page, id, 1))).left).toBeGreaterThan((await edges(item(page, id, 2))).right);
    // Punctuation at the end of a left-to-right text stays at its end; a time's digits are not reversed.
    for (const part of [eyebrow(page, 'mixed'), title(page, 'mixed'), description(page, 'mixed'), item(page, 'mixed', 1), item(page, 'mixed', 2)]) {
      const own = await ends(part);
      expect(own.first, await part.textContent() ?? '').toBeLessThan(own.last);
      expect(await css(part, 'unicode-bidi')).toBe('plaintext');
    }
    near((await textBox(description(page, 'mixed'))).right, (await edges(host(page, 'mixed'))).right, 1.5);
  });

  test('PGH-23: a size the active design system does not have, and an actions placement the spec does not have, render with the default — the default size’s tokens, end — and are reported; a level that is not 0 or a whole number from 1 to 6 takes the level of its size and is reported; a size a design system adds is drawn from its tokens', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [raw('unknown', { size: 'huge', actionsPlacement: 'start' }, '<h1>Members</h1><p>People who can open this project.</p><div data-part="actions"><tanrei-button>Invite</tanrei-button></div>'), raw('level', { level: 9, title: 'Danger zone', size: 'small' }, '<!--built-->'), ...some('medium')]);
    const unknown = host(page, 'unknown');
    expect([await px(title(page, 'unknown'), 'font-size'), await px(unknown, 'padding-bottom'), await px(description(page, 'unknown'), 'font-size')]).toEqual([await px(title(page, 'medium'), 'font-size'), await px(host(page, 'medium'), 'padding-bottom'), await px(description(page, 'medium'), 'font-size')]);
    near((await edges(action(page, 'unknown', 1))).right, (await edges(unknown)).right, 0.01);
    await expect.poll(() => seen.filter((m) => m.includes('PGH-23') && m.includes('size "huge"')).length).toBe(1);
    expect(seen.filter((m) => m.includes('PGH-23') && m.includes('actions-placement "start"')).length).toBe(1);
    await expect(stage(page, 'level').getByRole('heading', { level: 2, name: 'Danger zone' })).toHaveCount(1);
    expect(seen.filter((m) => m.includes('PGH-23') && m.includes('level "9"')).length).toBeGreaterThanOrEqual(1);
    // A design system adds a size: its tokens draw it, and what it does not set is the default's.
    await override(page, { [T('title-typescale-compact-font')]: '700 20px/28px sans-serif', [T('title-typescale-compact-font-size')]: '20px', [T('title-typescale-compact-line-height')]: '1.4', [T('container-padding-block-end-compact')]: '4px' });
    const count = seen.length;
    await unknown.evaluate((el) => ((el as unknown as { size: string }).size = 'compact'));
    await expect.poll(() => px(title(page, 'unknown'), 'font-size')).toBe(20);
    expect([await px(unknown, 'padding-bottom'), await px(description(page, 'unknown'), 'font-size')]).toEqual([4, await px(description(page, 'medium'), 'font-size')]);
    expect(seen.slice(count).filter((m) => m.includes('size "compact"'))).toEqual([]);
    // A value that is not a token name is never written into a rule.
    await unknown.evaluate((el) => el.setAttribute('size', 'a } body { display: none'));
    await expect.poll(() => seen.filter((m) => m.includes('PGH-23') && m.includes('display: none')).length).toBe(1);
    expect(await css(page.locator('body'), 'display')).toBe('block');
  });

  test('PGH-24: a head without a title still draws the parts it has, exposes no empty heading and is reported; a head with no part draws nothing, takes no space and exposes nothing; a title that is not a heading is still drawn as the title, and reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [raw('untitled', {}, '<p data-part="eyebrow">Guides</p><p>A layer changes values.</p><div data-part="meta"><span>8 min read</span></div>'), raw('empty', {}, '<!--nothing-->'), raw('div-title', {}, '<div data-part="title">comp.button</div><p>Every value a button reads.</p>'), raw('no-headline', { title: '', description: 'Only a sentence.' }, '<!--built-->')]);
    await expect(stage(page, 'untitled').getByRole('heading')).toHaveCount(0);
    expect([(await edges(eyebrow(page, 'untitled'))).height > 0, (await edges(description(page, 'untitled'))).height > 0, (await edges(meta(page, 'untitled'))).height > 0]).toEqual([true, true, true]);
    await expect.poll(() => seen.filter((m) => m.includes('PGH-24') && m.includes('has no title')).length).toBeGreaterThanOrEqual(1);
    // Nothing at all: no box, no space, nothing exposed.
    const empty = host(page, 'empty');
    expect([await css(empty, 'display'), (await edges(empty)).height, await empty.evaluate((el) => el.children.length)]).toEqual(['none', 0, 0]);
    expect((await edges(stage(page, 'empty'))).height).toBe(32);
    // A head built by script with no headline writes no heading.
    await expect(stage(page, 'no-headline').getByRole('heading')).toHaveCount(0);
    await expect(host(page, 'no-headline').locator('> p')).toHaveText('Only a sentence.');
    // Not a heading: drawn as the title, and reported.
    const fake = title(page, 'div-title');
    expect([await px(fake, 'font-size'), await css(fake, 'color'), await fake.getAttribute('role')]).toEqual([await resolveToken(page, T('title-typescale-medium-font-size')), await resolveColor(page, T('title-color')), null]);
    expect((await edges(description(page, 'div-title'))).top).toBeGreaterThan((await edges(fake)).bottom);
    await expect.poll(() => seen.filter((m) => m.includes('PGH-24') && m.includes('not a heading')).length).toBe(1);
  });
});

test.describe('the element and its stylesheet', () => {
  const geometry = (page: P) =>
    page.evaluate(() =>
      [...document.querySelectorAll('.stage')].map((s) => [
        (s as HTMLElement).dataset.fixture,
        ...[s, ...s.querySelectorAll('tanrei-page-header, tanrei-page-header > *, tanrei-page-header > [data-part="meta"] > *')]
          .filter((part) => !part.localName.startsWith('tanrei-button') && part.getAttribute('data-part') !== 'actions')
          .map((part) => {
            const [r, origin] = [part.getBoundingClientRect(), s.getBoundingClientRect()];
            return [r.left - origin.left, r.top - origin.top, r.width, r.height].map((n) => Math.round(n * 100) / 100).join(' ');
          }),
      ]),
    );

  test('the stylesheet alone draws every fixture, and defining the element moves nothing and writes nothing (PGH-1, PGH-2, PGH-14)', async ({ page }) => {
    // The fixtures with actions hold Buttons, which draw themselves when they are defined: they are measured apart.
    const fixtures = spec.fixtures.filter((f) => !f.slots?.actions);
    const document = await fixturesDocument(spec, { fixtures });
    await page.setContent(`${document.slice(0, document.lastIndexOf('<script type="module">'))}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate((tag) => !!customElements.get(tag), TAG)).toBe(false);
    // Drawn without script: the title's style, the eyebrow's capitals, the measure, the dots, the line.
    expect(await px(title(page, 'medium'), 'font-size')).toBe(await resolveToken(page, T('title-typescale-medium-font-size')));
    expect(await px(title(page, 'large'), 'font-size')).toBe(await resolveToken(page, T('title-typescale-large-font-size')));
    expect(await css(eyebrow(page, 'eyebrow'), 'text-transform')).toBe('uppercase');
    expect(await px(description(page, 'medium'), 'max-width')).toBe(576);
    expect((await dot(item(page, 'meta', 2)))!.width).toBe(await resolveToken(page, T('meta-separator-size')));
    expect(await px(host(page, 'divider'), 'border-bottom-width')).toBe(await resolveToken(page, T('divider-thickness')));
    const before = await geometry(page);
    const markup = await page.evaluate(() => [...document.querySelectorAll('tanrei-page-header')].map((el) => el.outerHTML));
    await page.addScriptTag({ content: fs.readFileSync(path.join(pkg, 'dist/tanrei.bundle.js'), 'utf8'), type: 'module' });
    await page.waitForFunction((tag) => !!customElements.get(tag), TAG);
    await frame(page);
    expect(await geometry(page)).toEqual(before);
    // Nothing is written on a head the page wrote: not an attribute, not an element.
    expect(await page.evaluate(() => [...document.querySelectorAll('tanrei-page-header')].map((el) => el.outerHTML))).toEqual(markup);
    // The actions beside a title keep their place too: the row they stand in is the title's line, whatever the Buttons draw.
    const second = await fixturesDocument(spec, { fixtures: some('actions', 'long-title-actions') });
    const fresh = await page.context().newPage();
    await fresh.setContent(`${second.slice(0, second.lastIndexOf('<script type="module">'))}</body></html>`);
    await fresh.evaluate(() => document.fonts.ready);
    // (Their place: a Button that draws itself is another width, and the title's column takes what is left.)
    const text = () => fresh.evaluate(() => [...document.querySelectorAll('tanrei-page-header > :is(h1, p)')].map((part) => `${part.getBoundingClientRect().left} ${part.getBoundingClientRect().top}`));
    const placed = await text();
    await fresh.addScriptTag({ content: fs.readFileSync(path.join(pkg, 'dist/tanrei.bundle.js'), 'utf8'), type: 'module' });
    await fresh.waitForFunction(() => !!customElements.get('tanrei-button'));
    await frame(fresh);
    expect(await text()).toEqual(placed);
    await fresh.close();
  });

  test('the element brings its stylesheet to the root it is connected to: a head in another component’s shadow root is drawn and lays itself out by its own width (PGH-10, PGH-14)', async ({ page }) => {
    await mount(page, some('medium'));
    await page.evaluate(() => {
      const outer = document.createElement('div');
      outer.id = 'outer';
      outer.style.inlineSize = '600px';
      const root = outer.attachShadow({ mode: 'open' });
      root.innerHTML = '<tanrei-page-header size="small"><h2>Access tokens</h2><div data-part="actions"><button>New token</button></div></tanrei-page-header>';
      document.body.append(outer);
    });
    const inner = page.locator('#outer tanrei-page-header');
    expect(await inner.evaluate((el) => (el.getRootNode() as ShadowRoot).adoptedStyleSheets.length)).toBeGreaterThan(0);
    expect(await px(inner.locator('h2'), 'font-size')).toBe(await resolveToken(page, T('title-typescale-small-font-size')));
    flush((await edges(inner.locator('button'))).right, (await edges(inner)).right);
    await page.locator('#outer').evaluate((el) => ((el as HTMLElement).style.inlineSize = '300px'));
    flush((await edges(inner.locator('button'))).left, (await edges(inner)).left);
  });

  test('the width at which the head becomes wide is the token’s, in rem, under the default system and every preset — and a layer that moves it moves the condition (PGH-10, PGH-12, PGH-18)', async ({ page }) => {
    const source = fs.readFileSync(path.join(pkg, 'src/styles/page-header.css'), 'utf8');
    const built = fs.readFileSync(path.join(pkg, 'dist/page-header.css'), 'utf8');
    const id = 'comp.page-header.wide.container-width';
    expect(tokensIn(source)).toEqual([id]);
    expect(source.match(/@container[^{]*\d/g)).toBeNull();
    expect(built).not.toMatch(/(?<!`)token\(/);
    const systems = ['', ...fs.readdirSync(path.join(pkg, 'dist/systems')).filter((file) => /^[a-z0-9-]+\.css$/.test(file)).map((file) => file.replace('.css', ''))];
    for (const system of systems) {
      await mount(page, some('medium'), system ? { system } : {});
      const sheet = system && fs.existsSync(path.join(pkg, `dist/systems/${system}.page-header.css`)) ? fs.readFileSync(path.join(pkg, `dist/systems/${system}.page-header.css`), 'utf8') : built;
      const written = [...sheet.matchAll(/@container \(inline-size >= ([\d.]+)rem\)/g)].map((match) => Number(match[1]) * 16);
      expect(written, system || 'default').toEqual([await resolveToken(page, T('wide-container-width'))]);
    }
    const tokens = declarations(fs.readFileSync(path.join(pkg, 'src/generated/tokens.css'), 'utf8'));
    expect(resolved(id, tokens)).toBe('30rem');
    // A layer that turns the size dial, or sets the token itself, gets another condition.
    expect(writeConditions(source, declarations(':root { --tanrei-dial-size-unit: 0.3rem; }', tokens))).toContain('@container (inline-size >= 36rem)');
    expect(writeConditions(source, declarations(`:root { ${T('wide-container-width')}: 640px; }`, tokens))).toContain('@container (inline-size >= 40rem)');
  });

  test('no design value is written in the stylesheet or the element: every length, color, radius, duration and opacity is a token, and the only literal is the zero letter-spacing of PGH-4 (PGH-1, PGH-4)', async () => {
    const strip = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const sheet = strip(fs.readFileSync(path.join(pkg, 'src/styles/page-header.css'), 'utf8'));
    const lengths = [...sheet.matchAll(/(?<![\w.-])(\d*\.?\d+)(px|rem|em|pt|ms|s)\b/g)].map((match) => match[0]).filter((value) => !/^0(px|s|ms)?$/.test(value));
    // `1em` is the description's own font size, which its measure is a count of (PGH-7).
    expect(lengths).toEqual(['1em']);
    expect(sheet.match(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(/gi)).toBeNull();
    expect(sheet.match(/opacity\s*:|transition|animation/g)).toBeNull();
    expect([...new Set(sheet.match(/\b(CanvasText|Canvas|LinkText|Highlight)\b/g))]).toEqual(['CanvasText']);
    expect(sheet.match(/letter-spacing: 0;/g)).toHaveLength(1);
    const element = strip(fs.readFileSync(path.join(pkg, 'src/components/page-header/page-header.ts'), 'utf8'));
    expect(element.match(/#[0-9a-f]{6}\b|rgba?\(|\d+px/gi)).toBeNull();
  });
});

test.describe('fixtures', () => {
  test('every fixture of the spec is mounted', async ({ page }) => {
    await mount(page, spec.fixtures);
    expect(spec.fixtures).toHaveLength(29);
    for (const f of spec.fixtures) {
      await expect(host(page, f.id), f.id).toHaveCount(1);
      for (const [prop, attribute] of [['size', 'size'], ['actionsPlacement', 'actions-placement']] as const) {
        expect(await host(page, f.id).getAttribute(attribute), `${f.id} ${prop}`).toBe(f.props[prop] === undefined ? null : String(f.props[prop]));
      }
      expect(await host(page, f.id).evaluate((el) => el.hasAttribute('divider')), f.id).toBe(f.props.divider === true);
      if (f.direction) await expect(stage(page, f.id)).toHaveAttribute('dir', f.direction);
      // One heading, with the fixture's title; the head is 768 wide and nothing scrolls sideways.
      const name = String(f.slots?.title ?? f.props.title);
      await expect(stage(page, f.id).getByRole('heading', { name, exact: true }), f.id).toHaveCount(1);
      await expect(stage(page, f.id).getByRole('heading'), f.id).toHaveCount(1);
      expect((await edges(host(page, f.id))).width, f.id).toBe(768);
      expect(await stage(page, f.id).evaluate((el) => el.scrollWidth <= el.clientWidth), f.id).toBe(true);
      await expect(meta(page, f.id).locator('> *'), f.id).toHaveCount(f.items?.length ?? 0);
      const labels = f.slots?.actions === undefined ? [] : Array.isArray(f.slots.actions) ? f.slots.actions : [f.slots.actions];
      await expect(actions(page, f.id).locator('> tanrei-button'), f.id).toHaveText(labels);
    }
  });

  for (const [name, width] of [
    ['compact', 400],
    ['medium', 800],
    ['expanded', 1280],
  ] as const) {
    test(`no axe violations in light and dark at the ${name} window width`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: 800 });
      for (const theme of ['light', 'dark'] as const) {
        await mount(page, spec.fixtures, { theme });
        // (A page has one heading of level 1 and its levels in order; a page of fixtures has a head for each, one after
        // the other: the two rules about that are the page's.)
        const results = await new AxeBuilder({ page }).include('.stage').disableRules(['page-has-heading-one', 'heading-order']).analyze();
        expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id} (${v.nodes.map((n) => n.target.join(' ')).join('; ')})`).join(', ')}`).toEqual([]);
      }
    });
  }

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec);
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
