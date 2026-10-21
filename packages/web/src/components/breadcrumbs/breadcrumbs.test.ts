// <tanrei-breadcrumbs> and breadcrumbs.css, driven by specs/breadcrumbs.spec.json: every behaviour id (BRC-1…29) is
// cited by a test title, every fixture has a baseline, and every length and color is read back from the tokens — never
// from a number written here (the numbers of a `verify` are the spec's own, for the default system).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, acmeSystemCss, fixturesDocument, loadSpec, missingWords, mountFixtures, resolveColor, resolveToken, setWords, tab, tabTo, rootTokens } from '../../../test/harness.js';
import { drawnOpticalSize, opticalSize } from '../../../test/icons.js';
import { holdClock, releaseClock } from '../../../test/page-clock.js';
import { expectPressHeldAtEveryMoment } from '../../../test/held-press.js';
import { motionEnded } from '../../../test/motions.js';
import { expectPressShownAndHeld, watchPress } from '../../../test/watched-press.js';

const spec = loadSpec('breadcrumbs');
type P = Page;
const TAG = 'tanrei-breadcrumbs';
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const T = (name: string) => `--tanrei-comp-breadcrumbs-${name}`;
const SYS = (name: string) => `--tanrei-sys-${name}`;

const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] ${TAG}`);
/** The nth level (from 1): the product's own child. */
const level = (page: P, id: string, n: number) => host(page, id).locator(`> :is(a, span):nth-child(${n})`);
const separators = (page: P, id: string) => host(page, id).locator('li:not(.out):not(.none) > .separator');
const more = (page: P, id: string) => host(page, id).locator('button.overflow');
const menu = (page: P, id: string) => host(page, id).locator('tanrei-menu');
const rows = (page: P, id: string) => host(page, id).locator('tanrei-menu-item');
const css = (locator: Locator, property: string, pseudo?: string) => locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p!), [property, pseudo] as const);
const px = async (locator: Locator, property: string, pseudo?: string) => Number.parseFloat(await css(locator, property, pseudo));
const edges = (locator: Locator) =>
  locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  });
const near = (a: number, b: number, tolerance = 0.6) => expect(Math.abs(a - b), `${a} ≈ ${b}`).toBeLessThanOrEqual(tolerance);
const some = (...ids: string[]) => spec.fixtures.filter((f) => ids.includes(f.id));
const NAMES = { label: 'Breadcrumbs', overflowLabel: 'Show hidden levels' };
/** A trail a test writes itself: the levels as the product's markup. */
const own = (id: string, content: string, props: Fixture['props'] = NAMES, direction?: 'rtl'): Fixture => ({ id, props, content, ...(direction ? { direction } : {}) });
/** Levels that lead to places on the page itself, so that following one can be seen and nothing is loaded. */
const PLACES = '<a href="#top-level">Home</a><a href="#docs">Documentation</a><a href="#tokens">Design tokens</a><a href="#states">State tokens</a><span aria-current="page">How a disabled container is derived</span>';
/** The same, with a glyph on a level and a level without a destination among those the narrow trail takes out. */
const MENU_PLACES = '<a href="#top-level">Home</a><a href="#docs" data-icon="home">Documentation</a><span>Design tokens</span><a href="#states">State tokens</a><span aria-current="page">How a disabled container is derived</span>';
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning' && message.text().includes('[tanrei]')) seen.push(message.text());
  });
  return seen;
}
/** Two frames: what a change of size asks for has been observed and drawn. */
const settled = (page: P) => page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
/** Gives the trail of a fixture this width (the stage has 16 of padding on each side). */
async function give(page: P, id: string, width: number) {
  await stage(page, id).evaluate((el, w) => {
    (el as HTMLElement).style.boxSizing = 'border-box';
    (el as HTMLElement).style.inlineSize = `${w + 32}px`;
    (el as HTMLElement).style.maxInlineSize = 'none';
  }, width);
  await settled(page);
}
/** The labels of the levels that are drawn, in the trail's order; `…` where the overflow button stands. */
const drawn = (page: P, id: string) =>
  host(page, id).evaluate((el) =>
    [...el.shadowRoot!.querySelectorAll('li')].flatMap((li) => {
      if (!li.getClientRects().length) return [];
      if (li.classList.contains('more')) return ['…'];
      const slotted = li.querySelector('slot')!.assignedElements()[0];
      return [slotted?.textContent ?? ''];
    }),
  );
/** The width every entry needs, measured where all of them fit; and the overflow button's entry. */
async function needs(page: P, id: string) {
  await give(page, id, 4000);
  const widths = await host(page, id).evaluate((el) => [...el.shadowRoot!.querySelectorAll('li.level')].map((li) => li.getBoundingClientRect().width));
  await give(page, id, 1);
  const button = await host(page, id).evaluate((el) => el.shadowRoot!.querySelector('li.more')?.getBoundingClientRect().width ?? 0);
  return { widths, button };
}
/** BRC-9, written again from the spec's sentence: how many levels are out at a width, and whether the last is cut. */
function expected({ widths, button }: { widths: number[]; button: number }, room: number) {
  const count = widths.length;
  const order = [...Array.from({ length: Math.max(0, count - 2) }, (_, i) => i + 1), ...(count > 1 ? [0] : [])];
  let shown = widths.reduce((a, b) => a + b, 0);
  let out = 0;
  while (shown > room + 0.05 && out < order.length) {
    shown -= widths[order[out]!]!;
    if (out === 0) shown += button;
    out++;
  }
  return { out: new Set(order.slice(0, out)), cut: shown > room + 0.05 };
}
const noMotion = (page: P) => page.addStyleTag({ content: `${TAG} > * { transition: none !important; }` });
const active = (page: P) =>
  page.evaluate(() => {
    let el: Element | null = document.activeElement;
    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
    return el ? `${el.localName}${el.id ? `#${el.id}` : ''}:${(el.getAttribute('label') ?? el.textContent ?? '').trim().slice(0, 60)}` : '';
  });
/**
 * The row of the overflow menu that holds focus, and the element in it that does (through every shadow root): a link
 * item's focus and semantics are on its anchor (MNU-53), every other item's on its host.
 */
const focusedRow = (page: P) =>
  page.evaluate(() => {
    let el: Element | null = document.activeElement;
    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
    const item = el?.localName === 'tanrei-menu-item' ? el : ((el?.getRootNode() as ShadowRoot | undefined)?.host ?? null);
    if (!el || item?.localName !== 'tanrei-menu-item') return null;
    return { row: item.getAttribute('label'), focus: el.localName, role: el.getAttribute('role'), href: el.getAttribute('href'), tabindex: el.getAttribute('tabindex') };
  });
/** A row of the overflow menu that is a link item: the anchor in the item's shadow root (MNU-53). */
const rowAnchor = (page: P, id: string, label: string) => host(page, id).locator(`tanrei-menu-item[label="${label}"] a.row`);
/**
 * The product's side of a level chosen in the menu. `__clicks`: every click that reaches the document, as the product
 * hears it — one that came from a row of the menu is written `row:<label>`, and none should be. `__rows`: what became
 * of each row's own click once it had been dispatched. `__hashes`: how many times the address changed.
 */
type Heard = { __clicks: string[]; __rows: string[]; __hashes: number; __cancel: boolean; __hold: boolean };
const listen = (page: P) =>
  page.evaluate(() => {
    const w = window as unknown as Heard;
    Object.assign(w, { __clicks: [], __rows: [], __hashes: 0, __cancel: false, __hold: false });
    window.addEventListener('hashchange', () => w.__hashes++);
    const rowOf = (event: Event) => (event.composedPath() as Element[]).find((node) => node.localName === 'tanrei-menu-item');
    const reached = new WeakSet<Event>();
    const line = (event: Event, row: Element, where: string) => {
      const mouse = event as MouseEvent;
      const how = [mouse.ctrlKey && 'ctrl', mouse.metaKey && 'meta', mouse.shiftKey && 'shift', mouse.button === 1 && 'middle'].filter(Boolean).join('+') || 'plain';
      return `${event.type}:${row.getAttribute('label')}:${how}:${event.defaultPrevented ? 'cancelled' : 'left to the browser'}:${where}`;
    };
    for (const type of ['click', 'auxclick', 'contextmenu', 'dragstart']) {
      // What came of an event of a row: read where it reaches the page, or — stopped on its way — once it is over.
      window.addEventListener(
        type,
        (event) => {
          const row = rowOf(event);
          if (row) setTimeout(() => reached.has(event) || w.__rows.push(line(event, row, 'stopped at the menu')));
        },
        { capture: true },
      );
      window.addEventListener(type, (event) => {
        const row = rowOf(event);
        if (!row) return;
        reached.add(event);
        w.__rows.push(line(event, row, 'reached the page'));
        // Read, then held back by the test itself where it asks for that, so that no tab, window or menu is opened.
        if (w.__hold) event.preventDefault();
      });
    }
    document.addEventListener('click', (event) => {
      const [origin] = event.composedPath() as Element[];
      // (A press on the overflow button is a click too: it is the button's, and not what is counted here.)
      if (origin?.closest?.('button.overflow')) return;
      const row = rowOf(event);
      const target = event.target as Element;
      w.__clicks.push(row ? `row:${row.getAttribute('label')}` : `${target.localName}:${target.getAttribute('href') ?? ''}`);
      if (w.__cancel) event.preventDefault();
    });
  });
const heard = (page: P) =>
  page.evaluate(() => {
    const w = window as unknown as Heard;
    const all = { clicks: [...w.__clicks], rows: [...w.__rows], hashes: w.__hashes, hash: location.hash };
    Object.assign(w, { __clicks: [], __rows: [], __hashes: 0 });
    history.replaceState(null, '', '#');
    return all;
  });
type AXNode = { nodeId: string; parentId?: string; ignored: boolean; role?: { value: string }; name?: { value: string }; childIds?: string[]; properties?: { name: string; value: { value: unknown } }[] };
/** The accessibility tree as Chromium exposes it (over the DevTools protocol). */
async function tree(page: P) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = (await cdp.send('Accessibility.getFullAXTree')) as { nodes: AXNode[] };
  await cdp.detach();
  const byId = new Map(nodes.map((node) => [node.nodeId, node]));
  /** The nodes under `node` that are exposed, as `role:name`, in order — an ignored node stands for its children. */
  const under = (node: AXNode): string[] =>
    (node.childIds ?? []).flatMap((id) => {
      const child = byId.get(id)!;
      if (child.ignored || ['none', 'generic', 'InlineTextBox'].includes(child.role?.value ?? '')) return under(child);
      return [`${child.role?.value}:${child.name?.value ?? ''}`, ...under(child).map((line) => `  ${line}`)];
    });
  return { nodes, under, find: (role: string, name: string) => nodes.find((node) => !node.ignored && node.role?.value === role && node.name?.value === name) };
}

test.describe('the landmark and its levels', () => {
  test('BRC-1: one navigation landmark named by label holds one ordered list of the levels in the order given, each a list item, and nothing else that is read — no separator; without a label it still renders and is reported; without a level it draws nothing, takes no room and exposes no landmark', async ({ page, browserName }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('default'), own('unnamed', '<a href="#a">Home</a><span aria-current="page">Button</span>', {}), own('none', '')] });
    const nav = page.getByRole('navigation', { name: 'Breadcrumbs (default)' });
    await expect(nav).toHaveCount(1);
    await expect(nav.getByRole('list')).toHaveCount(1);
    await expect(nav.getByRole('listitem')).toHaveCount(3);
    expect(await nav.getByRole('listitem').allTextContents()).toHaveLength(3);
    expect(await drawn(page, 'default')).toEqual(['Home', 'Components', 'Button']);
    // The list is an ordered list, and a separator is hidden from assistive technology.
    expect(await host(page, 'default').evaluate((el) => el.shadowRoot!.querySelector('nav > ol') !== null && [...el.shadowRoot!.querySelectorAll('.separator')].every((s) => s.getAttribute('aria-hidden') === 'true'))).toBe(true);
    if (browserName === 'chromium') {
      const ax = await tree(page);
      const landmark = ax.find('navigation', 'Breadcrumbs (default)')!;
      expect(landmark).toBeDefined();
      expect(ax.under(landmark)).toEqual(['list:', '  listitem:', '    link:Home', '      StaticText:Home', '  listitem:', '    link:Components', '      StaticText:Components', '  listitem:', '    StaticText:Button']);
    }
    // No label: the trail is drawn, the landmark has no name, and a debug build says so.
    await expect(level(page, 'unnamed', 1)).toBeVisible();
    expect(await host(page, 'unnamed').evaluate((el) => el.shadowRoot!.querySelector('nav')!.hasAttribute('aria-label'))).toBe(false);
    expect(seen.some((text) => text.includes('BRC-1') && text.includes('label is empty'))).toBe(true);
    // No level: nothing at all.
    expect(await edges(host(page, 'none'))).toMatchObject({ width: 0, height: 0 });
    expect(await css(host(page, 'none'), 'display')).toBe('none');
    await expect(page.getByRole('navigation', { name: 'Breadcrumbs (none)' })).toHaveCount(0);
  });

  test('BRC-2: a level with a destination is the product’s own anchor in the document, a link named by its label, in label.typescale and item.content.color, while its underline is shown — at rest in the default system — underlined underline.width thick underline.offset below the baseline in its own color, under the text and not under a glyph; with scripting off every such level is still an anchor with its href and is told from an unlinked one without color', async ({ page, browser }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('default', 'home-icon') });
    const home = level(page, 'default', 1);
    expect(await home.evaluate((el) => [el.localName, el.getAttribute('href'), el.getRootNode() === document, el.getAttribute('role')])).toEqual(['a', '/', true, null]);
    await expect(host(page, 'default').getByRole('link', { name: 'Home', exact: true })).toHaveCount(1);
    near(await px(home, 'font-size'), await resolveToken(page, T('label-typescale-font-size')), 0.01);
    expect(await css(home, 'color')).toBe(await resolveColor(page, T('item-content-color')));
    expect(await css(home, 'text-decoration-line')).toBe('underline');
    near(await px(home, 'text-decoration-thickness'), await resolveToken(page, T('underline-width')), 0.01);
    near(await px(home, 'text-underline-offset'), await resolveToken(page, T('underline-offset')), 0.01);
    expect(await css(home, 'text-decoration-color')).toBe(await css(home, 'color'));
    // The glyph is an inline block of the anchor's: no underline is drawn under it.
    expect(await css(level(page, 'home-icon', 1), 'display', '::before')).toBe('inline-block');
    // Scripting off: the anchors are there, and the underline tells a link from the other levels.
    const context = await browser.newContext({ javaScriptEnabled: false });
    const still = await context.newPage();
    await still.setContent(await fixturesDocument(spec, { icons: true, fixtures: some('default', 'text-level') }));
    expect(await still.locator(`[data-fixture="default"] ${TAG} > a[href]`).count()).toBe(2);
    const lines = await still.locator(`[data-fixture="text-level"] ${TAG} > *`).evaluateAll((els) => els.map((el) => getComputedStyle(el).textDecorationLine));
    expect(lines).toEqual(['underline', 'none', 'none']);
    await context.close();
  });

  test('BRC-3: a level without a destination is text in label.typescale and label.color — no underline, no container, not focusable, answering no hover, with no role of its own; an href that names a script or cannot be read is taken off, drawn so and reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('text-level'), own('refused', '<a href="javascript:alert(1)">Run</a><a href="http://[">Broken</a><a href="#here">Here</a>')] });
    const middle = level(page, 'text-level', 2);
    expect(await middle.evaluate((el) => [el.localName, el.getAttribute('role'), (el as HTMLElement).tabIndex])).toEqual(['span', null, -1]);
    expect(await css(middle, 'color')).toBe(await resolveColor(page, T('label-color')));
    expect(await css(middle, 'text-decoration-line')).toBe('none');
    expect(await css(middle, 'background-color')).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    near(await px(middle, 'font-size'), await resolveToken(page, T('label-typescale-font-size')), 0.01);
    const before = await middle.evaluate((el) => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor, getComputedStyle(el).cursor]);
    await middle.hover();
    expect(await middle.evaluate((el) => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor, getComputedStyle(el).cursor])).toEqual(before);
    // Tab passes it: after the one link of the trail, focus is outside the trail.
    await tabTo(page, level(page, 'text-level', 1));
    await tab(page);
    expect(await host(page, 'text-level').evaluate((el) => el.contains(document.activeElement))).toBe(false);
    // What is no place to go is no destination.
    expect(await host(page, 'refused').evaluate((el) => [...el.children].map((child) => child.hasAttribute('href')))).toEqual([false, false, true]);
    for (const n of [1, 2]) {
      expect(await css(level(page, 'refused', n), 'text-decoration-line')).toBe('none');
      expect(await css(level(page, 'refused', n), 'color')).toBe(await resolveColor(page, T('label-color')));
    }
    expect(seen.some((text) => text.includes('BRC-3') && text.includes('script'))).toBe(true);
    expect(seen.some((text) => text.includes('BRC-3') && text.includes('cannot be read'))).toBe(true);
  });

  test('BRC-4: the last level marked current is exposed as the current page and drawn in current.content.color at the emphasized weight, without an underline; without a destination it is text passed by Tab, with one it is a link with the same look that answers hover from the current part; a level marked current that is not the last is drawn as if it were not, and reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('default', 'current-link'), own('early', '<a href="#a" aria-current="page">Home</a><span>Button</span>')] });
    await noMotion(page);
    const weight = await page.evaluate((name) => {
      const probe = document.body.appendChild(document.createElement('div'));
      probe.style.fontWeight = `var(${name})`;
      const value = getComputedStyle(probe).fontWeight;
      probe.remove();
      return value;
    }, T('label-typescale-font-weight-emphasized'));
    const look = (target: Locator) => target.evaluate((el) => [el.getAttribute('aria-current'), getComputedStyle(el).color, getComputedStyle(el).fontWeight, getComputedStyle(el).textDecorationLine]);
    const text = level(page, 'default', 3);
    const link = level(page, 'current-link', 3);
    const want = ['page', await resolveColor(page, T('current-content-color')), weight, 'none'];
    expect(await look(text)).toEqual(want);
    expect(await look(link)).toEqual(want);
    expect(Number(weight)).toBeGreaterThan(Number(await css(level(page, 'default', 1), 'font-weight')));
    near((await edges(text)).width, (await edges(link)).width, 0.1);
    expect(await text.evaluate((el) => [el.localName, (el as HTMLElement).tabIndex])).toEqual(['span', -1]);
    await tabTo(page, link);
    expect(await css(link, 'background-color')).toBe(await resolveColor(page, T('current-focused-container-color')));
    await page.mouse.move(0, 0);
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    await link.hover();
    expect(await css(link, 'background-color')).toBe(await resolveColor(page, T('current-hovered-container-color')));
    // Not the last: a link like any other.
    const early = level(page, 'early', 1);
    expect(await early.evaluate((el) => [getComputedStyle(el).textDecorationLine, getComputedStyle(el).fontWeight])).toEqual(['underline', await css(level(page, 'default', 1), 'font-weight')]);
    expect(await css(early, 'color')).toBe(await resolveColor(page, T('item-content-color')));
    expect(seen.some((message) => message.includes('BRC-4'))).toBe(true);
  });

  test('BRC-5: a level opens where the person is — no target is written on its anchor, no mark for a new context is drawn, and no rule draws a visited destination', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('default') });
    expect(await host(page, 'default').evaluate((el) => [...el.querySelectorAll('a')].map((a) => [a.hasAttribute('target'), a.hasAttribute('rel')]))).toEqual([
      [false, false],
      [false, false],
    ]);
    // Once defined, an anchor's ::after is its hit area and holds nothing.
    expect(await css(level(page, 'default', 1), 'content', '::after')).toMatch(/^(""|'')$/);
    const sheet = fs.readFileSync(path.join(pkg, 'dist/breadcrumbs.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(sheet).not.toMatch(/:visited|open_in_new|target=/);
  });

  test('BRC-6: one separator between every two neighbouring entries and none before the first or after the last: chevron_right in a box separator.size large, in separator.color, separator.gap from the entry on either side, centred on the label’s line, hidden from assistive technology, no part of a link or its box, and unchanged by the state of the level beside it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('default', 'single', 'long-trail') });
    await noMotion(page);
    await expect(separators(page, 'default')).toHaveCount(2);
    await expect(separators(page, 'single')).toHaveCount(0);
    // With the overflow button: one separator fewer than there are entries.
    expect(await separators(page, 'long-trail').count()).toBe((await drawn(page, 'long-trail')).length - 1);
    const [size, gap] = [await resolveToken(page, T('separator-size')), await resolveToken(page, T('separator-gap'))];
    const first = separators(page, 'default').first();
    const [box, left, right] = [await edges(first), await edges(level(page, 'default', 1)), await edges(level(page, 'default', 2))];
    near(box.width, size, 0.1);
    near(box.height, size, 0.1);
    near(box.left - left.right, gap, 0.1);
    near(right.left - box.right, gap, 0.1);
    near((box.top + box.bottom) / 2, (left.top + left.bottom) / 2, 0.6);
    expect(await first.evaluate((el) => [el.textContent?.trim(), el.getAttribute('aria-hidden'), el.hasAttribute('data-drawn'), el.closest('a')])).toEqual(['chevron_right', 'true', true, null]);
    expect(await css(first, 'color')).toBe(await resolveColor(page, T('separator-color')));
    const unquoted = (family: string) => family.replace(/["']/g, '');
    expect(unquoted(await css(first, 'font-family'))).toBe(unquoted(await page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), SYS('icon-family-unselected'))));
    await level(page, 'default', 1).hover();
    expect(await css(first, 'color')).toBe(await resolveColor(page, T('separator-color')));
    // The last level's box ends the trail: nothing is drawn after it.
    expect(await host(page, 'default').evaluate((el) => el.shadowRoot!.querySelector('li.level:last-of-type .separator'))).toBeNull();
  });

  test('BRC-7: a level’s glyph is drawn before its label in a box icon.size large, container.gap from the label, centred on the label’s line, in the level’s color and hidden from assistive technology; with iconOnly the glyph stands alone in a square one line high and the label is still the name; a level without a label still renders and is reported', async ({ page, browserName }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('home-icon', 'home-icon-only'), own('nameless', '<a href="#a"></a><span aria-current="page">Button</span>')] });
    const home = level(page, 'home-icon', 1);
    const [size, gap, line] = [await resolveToken(page, T('icon-size')), await resolveToken(page, T('container-gap')), await px(home, 'line-height')];
    expect(await css(home, 'content', '::before')).toContain('home');
    near(await px(home, 'width', '::before'), size, 0.1);
    near(await px(home, 'height', '::before'), size, 0.1);
    // The optical size is the box's, written by hand (src/styles/icons.ts): not every engine draws font-optical-sizing: auto.
    expect(await drawnOpticalSize(home, '::before')).toBe(await opticalSize(page, size));
    near(await px(home, 'margin-inline-end', '::before'), gap, 0.1);
    near(await px(home, 'margin-top', '::before'), (line - size) / 2, 0.6);
    expect(await css(home, 'color', '::before')).toBe(await css(home, 'color'));
    expect(await css(home, 'opacity', '::before')).toBe('1');
    // The label begins after the glyph and its gap.
    const text = await home.evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return range.getBoundingClientRect().left - el.getBoundingClientRect().left;
    });
    near(text, size + gap, 0.6);
    await expect(host(page, 'home-icon').getByRole('link', { name: 'Home', exact: true })).toHaveCount(1);
    // The glyph alone.
    const alone = level(page, 'home-icon-only', 1);
    const box = await edges(alone);
    near(box.width, line, 0.1);
    near(box.height, line, 0.1);
    expect(await css(alone, 'text-decoration-line')).toBe('none');
    expect(await alone.evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return range.getBoundingClientRect().width;
    })).toBeLessThan(0.5);
    const glyph = await alone.evaluate((el) => {
      const s = getComputedStyle(el, '::before');
      return [Number.parseFloat(s.width), Number.parseFloat(s.marginInlineEnd)];
    });
    expect(glyph).toEqual([size, 0]);
    await expect(host(page, 'home-icon-only').getByRole('link', { name: 'Home', exact: true })).toHaveCount(1);
    if (browserName === 'chromium') {
      const ax = await tree(page);
      expect(ax.find('link', 'Home')).toBeDefined();
      expect(ax.nodes.some((node) => !node.ignored && /home/.test(node.name?.value ?? '') && node.name?.value !== 'Home' && !/\(home-icon/.test(node.name?.value ?? ''))).toBe(false);
    }
    await expect(level(page, 'nameless', 1)).toBeAttached();
    expect(seen.some((message) => message.includes('BRC-7'))).toBe(true);
  });
});

test.describe('one line, and what is folded away', () => {
  test('BRC-8: under collapse the trail is one line, each label on one line, as wide as its entries need and no wider than its layout, at the start edge, and neither wraps nor scrolls', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('default', 'long-trail') });
    for (const id of ['default', 'long-trail']) {
      const [box, line] = [await edges(host(page, id)), await px(level(page, id, 1), 'line-height')];
      near(box.height, line, 0.1);
      expect(await css(level(page, id, 1), 'white-space')).toBe('nowrap');
      near((await edges(level(page, id, 1))).left, box.left, 0.1);
      const list = host(page, id).locator('ol');
      expect(await list.evaluate((el) => [el.scrollWidth <= el.clientWidth, getComputedStyle(el).flexWrap, getComputedStyle(el).overflowX])).toEqual([true, 'nowrap', 'visible']);
    }
    // In a layout that gives it the width of its content it is as wide as its entries need.
    await stage(page, 'default').evaluate((el) => ((el as HTMLElement).style.cssText = 'display: flex; inline-size: 512px; box-sizing: border-box;'));
    await settled(page);
    const entries = await host(page, 'default').evaluate((el) => [...el.shadowRoot!.querySelectorAll('li.level')].reduce((sum, li) => sum + li.getBoundingClientRect().width, 0));
    near((await edges(host(page, 'default'))).width, entries, 0.2);
  });

  test('BRC-9: a trail wider than its width takes levels out and draws the overflow button once in the place of the first: the levels between the first and the last from the one next to the first, each only while what is left does not fit, then the first — never the last and never more than the width asks for, measured by its own width', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 600 });
    await mountFixtures(page, spec, { icons: true, fixtures: some('long-trail') });
    const all = (await host(page, 'long-trail').evaluate((el) => [...el.children].map((child) => child.textContent ?? ''))) as string[];
    const sizes = await needs(page, 'long-trail');
    const whole = sizes.widths.reduce((a, b) => a + b, 0);
    const seenOut = new Set<number>();
    for (const room of [Math.ceil(whole) + 1, 1000, 800, 640, 480, 420, 360, 330, Math.ceil(sizes.button + sizes.widths.at(-1)!) + 1]) {
      await give(page, 'long-trail', room);
      const { out } = expected(sizes, room);
      seenOut.add(out.size);
      const want = all.flatMap((label, index) => (out.has(index) ? [] : index === 0 && out.size ? [label, '…'] : [label]));
      if (out.has(0)) want.unshift('…');
      expect(await drawn(page, 'long-trail'), `at ${room}`).toEqual(want);
      await expect(more(page, 'long-trail')).toHaveCount(1);
      await expect(more(page, 'long-trail')).toBeVisible({ visible: out.size > 0 });
      // What is drawn fits, and the last level is in it.
      expect(await host(page, 'long-trail').evaluate((el) => el.shadowRoot!.querySelector('ol')!.scrollWidth <= el.clientWidth + 1)).toBe(true);
      await expect(level(page, 'long-trail', all.length)).toBeVisible();
    }
    // The walk met every stage: nothing out, the middle one by one, one level beside the button, the button first.
    expect(seenOut.has(0) && seenOut.has(all.length - 2) && seenOut.has(all.length - 1)).toBe(true);
    // The spec's verify: on a stage 480 wide, the first level, the button, and the last levels that fit.
    await give(page, 'long-trail', 480);
    const at480 = await drawn(page, 'long-trail');
    expect(at480.slice(0, 2)).toEqual(['Home', '…']);
    expect(at480.at(-1)).toBe('How a disabled container is derived');
    // By the width it is given, not the window's: the window did not change above.
    expect(page.viewportSize()!.width).toBe(1600);
  });

  test('BRC-10: the overflow button is more_horiz in a box icon.size large, in overflow.content.color, in a square one line high with corners container.shape — one list item holding one button named by overflowLabel that says it opens a menu and whether it is open; without a name it still renders and is reported; with no level out there is no button', async ({ page, browserName }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('default', 'long-trail'), own('unnamed-button', PLACES, { label: 'Breadcrumbs' })] });
    await give(page, 'unnamed-button', 300);
    const button = more(page, 'long-trail');
    const line = await px(level(page, 'long-trail', 1), 'line-height');
    const box = await edges(button);
    near(box.width, line, 0.1);
    near(box.height, line, 0.1);
    const glyph = button.locator('.more-glyph');
    expect(await glyph.evaluate((el) => [el.textContent?.trim(), el.getAttribute('aria-hidden'), el.hasAttribute('data-drawn'), el.hasAttribute('data-tanrei-mirrored')])).toEqual(['more_horiz', 'true', true, false]);
    near((await edges(glyph)).width, await resolveToken(page, T('icon-size')), 0.1);
    expect(await css(button, 'color')).toBe(await resolveColor(page, T('overflow-content-color')));
    const smooth = await page.evaluate(() => CSS.supports('corner-shape: superellipse(1)'));
    if (!smooth) near(await px(button, 'border-top-left-radius'), await resolveToken(page, T('container-shape')), 0.1);
    expect(await button.evaluate((el) => [el.localName, el.parentElement!.localName, el.parentElement!.querySelectorAll('button').length, el.getAttribute('aria-haspopup'), el.getAttribute('aria-expanded')])).toEqual(['button', 'li', 1, 'menu', 'false']);
    await expect(host(page, 'long-trail').getByRole('button', { name: 'Show hidden levels' })).toHaveCount(1);
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    if (browserName === 'chromium') {
      const ax = await tree(page);
      const node = ax.find('button', 'Show hidden levels')!;
      expect(node.properties?.find((p) => p.name === 'hasPopup')?.value.value).toBe('menu');
      expect(node.properties?.find((p) => p.name === 'expanded')?.value.value).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    // No name: still a button, and a debug build says so.
    await expect(more(page, 'unnamed-button')).toBeVisible();
    expect(await more(page, 'unnamed-button').getAttribute('aria-label')).toBeNull();
    expect(seen.some((message) => message.includes('BRC-10'))).toBe(true);
    // The product's words name it, under the key `breadcrumbsOverflowLabel`; the instance's own prop wins.
    expect(await missingWords(page)).toContain('breadcrumbsOverflowLabel');
    await setWords(page, { breadcrumbsOverflowLabel: 'Show hidden places' });
    await expect(more(page, 'unnamed-button')).toHaveAttribute('aria-label', 'Show hidden places');
    await host(page, 'unnamed-button').evaluate((el) => el.setAttribute('overflow-label', 'More places'));
    await expect(more(page, 'unnamed-button')).toHaveAttribute('aria-label', 'More places');
    await expect(more(page, 'long-trail')).toHaveAttribute('aria-label', 'Show hidden levels');
    // No level out: no button is drawn or exposed.
    await expect(more(page, 'default')).toBeHidden();
    await expect(host(page, 'default').getByRole('button')).toHaveCount(0);
  });

  test('BRC-11: activating the overflow button by Enter, Space or a press opens a menu anchored below it with the start edges aligned that lists the levels taken out in the trail’s order, each named by its label with its glyph — a level with a destination as a link to it, one without as a disabled item; focus enters the menu, Escape closes it and returns focus to the button; a level chosen there is one click on that level’s own anchor, which the product can cancel', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [own('places', MENU_PLACES)],
    });
    const sizes = await needs(page, 'places');
    await give(page, 'places', Math.ceil(sizes.widths[0]! + sizes.button + sizes.widths.at(-1)!) + 1);
    expect(await drawn(page, 'places')).toEqual(['Home', '…', 'How a disabled container is derived']);
    const button = more(page, 'places');
    const surface = menu(page, 'places').locator('.surface');
    for (const open of ['Enter', 'Space', 'press'] as const) {
      await tabTo(page, button);
      if (open === 'press') await button.click();
      else await page.keyboard.press(open);
      await expect(surface).toBeVisible();
      // MNU-1, MNU-53: focus is on the first item — a link item, so on its anchor, which is the menu item and no Tab stop.
      await expect.poll(() => focusedRow(page)).toEqual({ row: 'Documentation', focus: 'a', role: 'menuitem', href: '#docs', tabindex: '-1' });
      await page.keyboard.press('Escape');
      await expect(surface).toBeHidden();
      await expect.poll(() => active(page)).toMatch(/^button#more/);
    }
    await button.click();
    await expect(surface).toBeVisible();
    expect(await rows(page, 'places').evaluateAll((els) => els.map((el) => [el.getAttribute('label'), el.getAttribute('href'), el.getAttribute('leading-icon'), el.hasAttribute('disabled')]))).toEqual([
      ['Documentation', '#docs', 'home', false],
      ['Design tokens', null, null, true],
      ['State tokens', '#states', null, false],
    ]);
    const [at, anchor] = [await edges(surface), await edges(button)];
    expect(at.top).toBeGreaterThanOrEqual(anchor.bottom);
    near(at.left, anchor.left, 1);
    // A level chosen — by Enter, by Space (MNU-54: it activates a link item as Enter does) and by a press: ONE click, on
    // the product's own anchor; the row's own click is cancelled and goes no further than the menu, so the address is
    // followed once (the product's anchor, not the row's as well); the menu closes and focus is on the button.
    await page.keyboard.press('Escape');
    await listen(page);
    for (const choose of ['Enter', 'Space', 'press'] as const) {
      await button.click();
      await expect(surface).toBeVisible();
      await page.keyboard.press('End');
      await expect.poll(() => focusedRow(page)).toMatchObject({ row: 'State tokens', focus: 'a', href: '#states' });
      if (choose === 'press') await rowAnchor(page, 'places', 'State tokens').click();
      else await page.keyboard.press(choose);
      await expect(surface).toBeHidden();
      await expect.poll(() => page.evaluate(() => location.hash), choose).toBe('#states');
      await settled(page);
      expect(await heard(page), choose).toEqual({ clicks: ['a:#states'], rows: ['click:State tokens:plain:cancelled:stopped at the menu'], hashes: 1, hash: '#states' });
      await expect.poll(() => active(page), choose).toMatch(/^button#more/);
      expect(await page.evaluate(() => window.scrollY), choose).toBe(0);
    }
    // Cancelled by the product: the menu closes, nothing is followed — by neither anchor — and focus is on the button.
    await page.evaluate(() => ((window as unknown as Heard).__cancel = true));
    for (const choose of ['Enter', 'Space', 'press'] as const) {
      await button.click();
      await expect(surface).toBeVisible();
      await expect.poll(() => focusedRow(page)).toMatchObject({ row: 'Documentation' });
      if (choose === 'press') await rowAnchor(page, 'places', 'Documentation').click();
      else await page.keyboard.press(choose);
      await expect(surface).toBeHidden();
      await settled(page);
      expect(await heard(page), choose).toEqual({ clicks: ['a:#docs'], rows: ['click:Documentation:plain:cancelled:stopped at the menu'], hashes: 0, hash: '' });
      await expect.poll(() => active(page), choose).toMatch(/^button#more/);
    }
    // A level without a destination is a disabled item: choosing it does nothing, and the menu stays.
    await button.click();
    await expect(surface).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => focusedRow(page)).toMatchObject({ row: 'Design tokens', focus: 'tanrei-menu-item', href: null });
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    // A forced press does not wait for the row to stand still (a disabled row is not one Playwright would press), so
    // the menu's entrance has ended first: the press is on that row, and not on where another row passes meanwhile.
    await motionEnded(surface);
    await rows(page, 'places').nth(1).click({ force: true });
    await settled(page);
    expect(await heard(page)).toMatchObject({ clicks: [], hashes: 0, hash: '' });
    await expect(surface).toBeVisible();
  });

  test('BRC-22, MNU-54: a row of the menu is the browser’s own link to the level — a control-, command- or shift-click, a middle click and Enter with a modifier key are left to the browser on the row’s anchor, whose address is the level’s: none is cancelled, none becomes a click on the product’s anchor, the menu stays open with focus on the row, and the browser opens the level in a new tab; the context menu and a drag of the address are the browser’s too; the row of a level without a destination gives the browser nothing to open', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [own('places', MENU_PLACES)] });
    const sizes = await needs(page, 'places');
    await give(page, 'places', Math.ceil(sizes.widths[0]! + sizes.button + sizes.widths.at(-1)!) + 1);
    const surface = menu(page, 'places').locator('.surface');
    const docs = rowAnchor(page, 'places', 'Documentation');
    await listen(page);
    await more(page, 'places').click();
    await expect(surface).toBeVisible();
    await expect.poll(() => focusedRow(page)).toMatchObject({ row: 'Documentation', focus: 'a' });
    // The row's address is the level's own, as the browser resolves it — what a new tab, "copy link" and a drag take.
    expect(await docs.evaluate((a: HTMLAnchorElement) => [a.getAttribute('href'), a.href, a.draggable, a.target, a.hasAttribute('download')])).toEqual([
      '#docs',
      await level(page, 'places', 2).evaluate((a: HTMLAnchorElement) => a.href),
      true,
      '',
      false,
    ]);
    const still = async (what: string) => {
      await expect(surface, what).toBeVisible();
      expect(await focusedRow(page), what).toMatchObject({ row: 'Documentation', focus: 'a' });
    };
    // Held back by the test once it has been read: what the element did with each of the browser's own gestures.
    await page.evaluate(() => ((window as unknown as Heard).__hold = true));
    const mod = process.platform === 'darwin' ? 'meta' : 'ctrl';
    for (const [name, press, said] of [
      ['a control- or command-click', () => docs.click({ modifiers: ['ControlOrMeta'] }), `click:Documentation:${mod}:left to the browser:reached the page`],
      ['a shift-click', () => docs.click({ modifiers: ['Shift'] }), 'click:Documentation:shift:left to the browser:reached the page'],
      ['a middle click', () => docs.click({ button: 'middle' }), 'auxclick:Documentation:middle:left to the browser:reached the page'],
      ['Enter with the platform’s modifier', () => page.keyboard.press('ControlOrMeta+Enter'), `click:Documentation:${mod}:left to the browser:reached the page`],
      ['Enter with Shift', () => page.keyboard.press('Shift+Enter'), 'click:Documentation:shift:left to the browser:reached the page'],
      ['the context menu', () => docs.click({ button: 'right' }), 'contextmenu:Documentation:plain:left to the browser:reached the page'],
    ] as const) {
      await press();
      await settled(page);
      const all = await heard(page);
      // Nothing of the row's was cancelled or stopped (a browser that sends no click for a press — WebKit's middle
      // button — sends the element nothing to answer either), and the product's own anchor heard no click.
      expect(all.rows.filter((each) => each !== said && !/^(aux)?click:Documentation:[a-z+]+:left to the browser:reached the page$/.test(each)), name).toEqual([]);
      if (browserName === 'chromium') expect(all.rows, name).toContain(said);
      expect(all.clicks.filter((each) => each.startsWith('a:')), name).toEqual([]);
      expect([all.hashes, all.hash], name).toEqual([0, '']);
      await still(name);
    }
    // A drag of the row is a drag of its address: the menu's rule against dragging a row (MNU-15) is not a link item's.
    await heard(page);
    await docs.evaluate((a) => a.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, composed: true })));
    await rows(page, 'places').nth(1).evaluate((item) => item.shadowRoot!.querySelector('.row')!.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, composed: true })));
    await settled(page);
    expect((await heard(page)).rows).toEqual(['dragstart:Documentation:plain:left to the browser:reached the page', 'dragstart:Design tokens:plain:cancelled:reached the page']);
    // The row of a level without a destination holds no anchor: there is nothing for the browser to open.
    expect(await rows(page, 'places').nth(1).evaluate((item) => [item.shadowRoot!.querySelectorAll('a').length, item.hasAttribute('href')])).toEqual([0, false]);
    await rows(page, 'places').nth(1).click({ force: true, modifiers: ['ControlOrMeta'] });
    await settled(page);
    expect(await heard(page)).toMatchObject({ clicks: [], hashes: 0, hash: '' });
    await expect(surface).toBeVisible();
    expect(page.context().pages()).toHaveLength(1);
    // Not held back: the browser opens the level's address in a new tab, the page stays where it is, the menu open.
    await page.evaluate(() => ((window as unknown as Heard).__hold = false));
    if (browserName === 'chromium') {
      for (const press of [() => docs.click({ modifiers: ['ControlOrMeta'] }), () => docs.click({ button: 'middle' })]) {
        const [opened] = await Promise.all([page.context().waitForEvent('page'), press()]);
        expect(new URL(opened.url()).hash).toBe('#docs');
        await opened.close();
        await page.bringToFront();
        const after = await heard(page);
        expect([after.clicks.filter((each) => each.startsWith('a:')), after.rows.filter((each) => !each.endsWith(':left to the browser:reached the page')), after.hashes, after.hash]).toEqual([[], [], 0, '']);
        await still('a new tab');
      }
    }
  });

  test('BRC-11, MNU-53, MNU-56: a row of the menu to the eye and to assistive technology — the level’s glyph before its label, hidden, every label on one edge and none underlined; one menu item for each level taken out, named by its label, exposed as a menu item and not as a link, the row of a level without a destination a disabled menu item and no link at all; the current page and the levels still in the trail are never in the menu', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [own('places', MENU_PLACES)] });
    const sizes = await needs(page, 'places');
    await give(page, 'places', Math.ceil(sizes.widths[0]! + sizes.button + sizes.widths.at(-1)!) + 1);
    await tabTo(page, more(page, 'places'));
    await page.keyboard.press('Enter');
    const surface = menu(page, 'places').locator('.surface');
    await expect(surface).toBeVisible();
    await expect.poll(() => focusedRow(page)).toMatchObject({ row: 'Documentation' });
    // The glyph: drawn in the leading icon column of its row, hidden; the other rows keep the column, so the labels align.
    const docs = rowAnchor(page, 'places', 'Documentation');
    const glyph = docs.locator('.leading-icon');
    await expect(glyph).toHaveText('home');
    await expect(glyph).toHaveAttribute('aria-hidden', 'true');
    const size = await resolveToken(page, '--tanrei-comp-menu-leading-icon-size-regular');
    expect(size).toBeGreaterThan(0);
    // (Layout sizes: the surface may still be arriving, and a box read then would be the scaled one.)
    expect(await glyph.evaluate((el: HTMLElement) => [el.offsetWidth, el.offsetHeight, getComputedStyle(el).fontSize])).toEqual([size, size, `${size}px`]);
    const starts = await rows(page, 'places').evaluateAll((items) => items.map((item) => Math.round(item.shadowRoot!.querySelector('.label')!.getBoundingClientRect().left * 10) / 10));
    expect(new Set(starts).size, String(starts)).toBe(1);
    expect((await edges(docs.locator('.label'))).left).toBeGreaterThanOrEqual((await edges(glyph)).right);
    // No row is underlined, and a link row is drawn as the row beside it: the same face and the same color at rest.
    const drawnAs = (row: Locator) => row.evaluate((el) => [getComputedStyle(el).textDecorationLine, getComputedStyle(el.querySelector('.label')!).font, getComputedStyle(el.querySelector('.label')!).textDecorationLine]);
    const states = rowAnchor(page, 'places', 'State tokens');
    await page.mouse.move(0, 0);
    expect(await drawnAs(docs)).toEqual(await drawnAs(states));
    expect((await drawnAs(docs))[0]).toBe('none');
    expect(await css(states.locator('.label'), 'color')).toBe(await resolveColor(page, '--tanrei-comp-menu-unselected-label-color'));
    // The elements: a link row's anchor is the menu item; the row of a level without a destination is a plain disabled item.
    expect(
      await rows(page, 'places').evaluateAll((items) =>
        items.map((item) => {
          const row = item.shadowRoot!.querySelector('.row')!;
          return [item.getAttribute('label'), item.getAttribute('role'), item.getAttribute('aria-disabled'), row.localName, row.getAttribute('role'), row.getAttribute('href'), row.getAttribute('aria-disabled'), row.getAttribute('aria-current')];
        }),
      ),
    ).toEqual([
      ['Documentation', null, null, 'a', 'menuitem', '#docs', null, null],
      ['Design tokens', 'menuitem', 'true', 'div', null, null, null, null],
      ['State tokens', null, null, 'a', 'menuitem', '#states', null, null],
    ]);
    const items = menu(page, 'places').getByRole('menuitem');
    await expect(items).toHaveCount(3);
    for (const name of ['Documentation', 'Design tokens', 'State tokens']) await expect(menu(page, 'places').getByRole('menuitem', { name, exact: true }), name).toHaveCount(1);
    await expect(menu(page, 'places').getByRole('menuitem', { name: 'Design tokens', exact: true })).toBeDisabled();
    await expect(menu(page, 'places').getByRole('link')).toHaveCount(0);
    if (browserName !== 'chromium') return;
    // What Chromium computed (over the DevTools protocol): one menu of three menu items, the second disabled, the first
    // focused; no link in it; neither the current page nor a level still drawn in the trail is listed.
    const ax = await tree(page);
    const list = ax.nodes.find((node) => !node.ignored && node.role?.value === 'menu')!;
    expect(list).toBeDefined();
    // Nothing stands between the menu and its rows: the menu's surface, a popover that is only a box, is not exposed
    // (src/overlay-tree.test.ts).
    const listed = ax.under(list).map((line) => line.trim()).filter((line) => !line.startsWith('StaticText:'));
    expect(listed).toEqual(['menuitem:Documentation', 'menuitem:Design tokens', 'menuitem:State tokens']);
    const property = (name: string, of: string) => ax.find('menuitem', name)?.properties?.find((p) => p.name === of)?.value.value;
    expect([property('Documentation', 'focused'), property('Documentation', 'disabled'), property('Design tokens', 'disabled'), property('State tokens', 'disabled')]).toEqual([true, undefined, true, undefined]);
    for (const name of ['Documentation', 'Design tokens', 'State tokens']) expect(ax.find('link', name), name).toBeUndefined();
    expect(ax.find('menuitem', 'Home')).toBeUndefined();
    expect(ax.find('menuitem', 'How a disabled container is derived')).toBeUndefined();
    // The trail behind it is still what it was: the first level a link, the last the current page.
    expect(ax.find('link', 'Home')).toBeDefined();
  });

  test('BRC-12: when the width, a label or the text size changes the trail decides again at once and without a motion, and a level that fits returns to its place; a level that holds keyboard focus and is taken out hands focus to the overflow button; an overflow button removed while its menu is open closes the menu and hands focus to the first level that returned', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 600 });
    await mountFixtures(page, spec, { icons: true, fixtures: [own('places', PLACES)] });
    const sizes = await needs(page, 'places');
    const whole = Math.ceil(sizes.widths.reduce((a, b) => a + b, 0)) + 1;
    const folded = Math.ceil(sizes.widths[0]! + sizes.button + sizes.widths.at(-1)!) + 1;
    await give(page, 'places', whole);
    expect(await drawn(page, 'places')).toEqual(['Home', 'Documentation', 'Design tokens', 'State tokens', 'How a disabled container is derived']);
    // The width: in the frame the width changed, with nothing that moves.
    await stage(page, 'places').evaluate((el, w) => ((el as HTMLElement).style.inlineSize = `${w + 32}px`), folded);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
    expect(await drawn(page, 'places')).toEqual(['Home', '…', 'How a disabled container is derived']);
    expect(await host(page, 'places').evaluate((el) => [...el.shadowRoot!.querySelectorAll('li')].every((li) => li.getAnimations().length === 0 && getComputedStyle(li).transitionDuration === '0s'))).toBe(true);
    await give(page, 'places', whole);
    expect(await drawn(page, 'places')).toHaveLength(5);
    // A label: a longer one takes a level out, and the shorter one brings it back.
    await level(page, 'places', 5).evaluate((el) => (el.textContent = 'How a disabled container is derived, and why'));
    await settled(page);
    expect(await drawn(page, 'places')).toEqual(['Home', '…', 'Design tokens', 'State tokens', 'How a disabled container is derived, and why']);
    await level(page, 'places', 5).evaluate((el) => (el.textContent = 'How a disabled container is derived'));
    await settled(page);
    expect(await drawn(page, 'places')).toHaveLength(5);
    // The text size.
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    await settled(page);
    expect((await drawn(page, 'places')).includes('…')).toBe(true);
    await page.evaluate(() => (document.documentElement.style.fontSize = ''));
    await settled(page);
    expect(await drawn(page, 'places')).toHaveLength(5);
    // Focus on a level that is taken out goes to the overflow button.
    await tabTo(page, level(page, 'places', 2));
    await give(page, 'places', folded);
    await expect.poll(() => active(page)).toMatch(/^button#more/);
    // The menu is open and the button goes: the menu closes, and focus is on the first level that returned.
    await page.keyboard.press('Enter');
    await expect(menu(page, 'places').locator('.surface')).toBeVisible();
    await give(page, 'places', whole);
    await expect(menu(page, 'places').locator('.surface')).toBeHidden();
    await expect(more(page, 'places')).toBeHidden();
    await expect.poll(() => active(page)).toBe('a:Documentation');
  });

  test('BRC-13: a level taken out is not in the list assistive technology reads nor in the focus order, and its anchor is still in the document: document.links lists every level that has a destination', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('long-trail') });
    const shown = await drawn(page, 'long-trail');
    expect(shown.length).toBeLessThan(8);
    expect(await page.evaluate(() => [...document.links].map((a) => a.getAttribute('href')))).toEqual(spec.fixtures.find((f) => f.id === 'long-trail')!.items!.flatMap((item) => (item.props.href ? [item.props.href] : [])));
    const nav = page.getByRole('navigation', { name: 'Breadcrumbs (long-trail)' });
    // The links that are drawn at all: a level taken out has no box, so it is in no tree and takes no focus.
    expect(await host(page, 'long-trail').evaluate((el) => [...el.querySelectorAll('a')].filter((a) => a.getClientRects().length > 0 && a.checkVisibility()).length)).toBe(shown.filter((label) => label !== '…').length - 1);
    if (browserName !== 'webkit') await expect(host(page, 'long-trail').getByRole('link')).toHaveCount(shown.filter((label) => label !== '…').length - 1);
    await expect(nav.getByRole('listitem')).toHaveCount(shown.length);
    // Tab: the first level, the overflow button, the links that are shown — never one that is out.
    const stops: string[] = [];
    await tabTo(page, level(page, 'long-trail', 1));
    for (let i = 0; i < shown.length; i++) {
      stops.push(await active(page));
      await tab(page);
    }
    expect(stops.slice(0, 2)).toEqual(['a:Home', expect.stringMatching(/^button#more/)]);
    expect(stops.some((stop) => stop === 'a:Documentation')).toBe(false);
    if (browserName === 'chromium') {
      const ax = await tree(page);
      expect(ax.find('link', 'Documentation')).toBeUndefined();
      expect(ax.find('link', 'Home')).toBeDefined();
    }
  });

  test('BRC-14: where the overflow button and the last level alone are wider than the width — or the one level of a trail is — that level’s label is cut with an ellipsis at its end, the button, the separator and a glyph stay whole, and the full label is still what is read', async ({ page }) => {
    const LONG = 'Right-to-left layouts: where a component takes its direction from, which glyphs mirror, and which never do';
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('long-current'), own('one', `<span aria-current="page">${LONG}</span>`), own('glyph', `<a href="#a">Home</a><span aria-current="page" data-icon="home">${LONG}</span>`)] });
    await give(page, 'one', 320);
    await give(page, 'glyph', 320);
    expect(await drawn(page, 'long-current')).toEqual(['…', spec.fixtures.find((f) => f.id === 'long-current')!.items!.at(-1)!.props.label]);
    const last = level(page, 'long-current', 3);
    expect(await last.evaluate((el) => [getComputedStyle(el).textOverflow, getComputedStyle(el).overflowX, getComputedStyle(el).whiteSpace, el.scrollWidth > el.clientWidth])).toEqual(['ellipsis', 'clip', 'nowrap', true]);
    const [box, around, button, separator] = [await edges(last), await edges(host(page, 'long-current')), await edges(more(page, 'long-current')), await edges(separators(page, 'long-current').first())];
    near(box.right, around.right, 0.6);
    near(around.width, 320, 0.1);
    near(button.width, await px(last, 'line-height'), 0.1);
    near(separator.width, await resolveToken(page, T('separator-size')), 0.1);
    near(box.left - separator.right, await resolveToken(page, T('separator-gap')), 0.1);
    // The page is not widened by what is cut.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    expect(await last.textContent()).toMatch(/with every case the icon set decides$/);
    await expect(page.getByText(/with every case the icon set decides$/)).toHaveCount(1);
    // One level that is wider than the trail: cut, and no button.
    expect(await drawn(page, 'one')).toEqual([LONG]);
    expect(await level(page, 'one', 1).evaluate((el) => [getComputedStyle(el).textOverflow, el.scrollWidth > el.clientWidth, el.getBoundingClientRect().width <= 320.5])).toEqual(['ellipsis', true, true]);
    await expect(more(page, 'one')).toHaveCount(0);
    // A glyph stays whole before the cut label.
    near(await px(level(page, 'glyph', 2), 'width', '::before'), await resolveToken(page, T('icon-size')), 0.1);
    expect(await level(page, 'glyph', 2).evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  });

  test('BRC-15: under wrap every level stays in the trail and there is no overflow button: the trail breaks onto as many lines as it needs, row-gap apart, aligned to the start, only after a separator — every line begins with a label — and a label longer than a line wraps, inside a run that has no break, and is never cut', async ({ page }) => {
    const RUN = 'Averyveryverylongrunwithnoplacetobreakatallinitanywhere';
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('long-trail-wrap'), own('narrow', `<a href="#a">Home</a><a href="#b">How a disabled container is derived from its role</a><span aria-current="page">${RUN}</span>`, { ...NAMES, overflow: 'wrap' })] });
    await give(page, 'narrow', 200);
    expect(await drawn(page, 'long-trail-wrap')).toHaveLength(8);
    await expect(more(page, 'long-trail-wrap')).toHaveCount(0);
    const layout = await host(page, 'long-trail-wrap').evaluate((el) =>
      [...el.shadowRoot!.querySelectorAll('li')].map((li) => {
        const [item, own, separator] = [li.getBoundingClientRect(), li.querySelector('slot')!.assignedElements()[0]!.getBoundingClientRect(), li.querySelector('.separator')?.getBoundingClientRect()];
        return { top: item.top, bottom: item.bottom, left: own.left, separatorTop: separator?.top ?? null, separatorLeft: separator?.left ?? null, labelRight: own.right };
      }),
    );
    const tops = [...new Set(layout.map((entry) => Math.round(entry.top)))];
    expect(tops.length).toBeGreaterThan(1);
    const start = (await edges(host(page, 'long-trail-wrap'))).left;
    for (const top of tops) near(layout.find((entry) => Math.round(entry.top) === top)!.left, start, 0.1);
    // A separator is on its own label's line, after it: it ends a line and never begins one.
    for (const entry of layout) if (entry.separatorTop !== null) expect(entry.separatorTop > entry.top - 1 && entry.separatorTop < entry.bottom && entry.separatorLeft! >= entry.labelRight).toBe(true);
    const byLine = tops.map((top) => layout.find((entry) => Math.round(entry.top) === top)!);
    near(byLine[1]!.top - byLine[0]!.bottom, await resolveToken(page, T('row-gap')), 0.1);
    // A label longer than the line wraps and is whole; a run with no break breaks inside itself.
    const line = await px(level(page, 'narrow', 1), 'line-height');
    for (const n of [2, 3]) {
      const target = level(page, 'narrow', n);
      expect((await edges(target)).height).toBeGreaterThan(line * 1.5);
      const whole = await target.evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const [text, box] = [range.getBoundingClientRect(), el.getBoundingClientRect()];
        return text.left >= box.left - 1 && text.right <= box.right + 1;
      });
      expect([whole, await css(target, 'text-overflow'), await css(target, 'white-space')]).toEqual([true, 'clip', 'normal']);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
});

test.describe('states', () => {
  // (Levels that lead to places on the page: a press here follows nothing that would unload it.)
  const fixtures = [own('places', PLACES), own('current-link', '<a href="#a">Home</a><a href="#b">Components</a><a href="#c" aria-current="page">Button</a>')];
  const folded = async (page: P) => {
    const sizes = await needs(page, 'places');
    await give(page, 'places', Math.ceil(sizes.widths[0]! + sizes.button + sizes.widths.at(-1)!) + 1);
  };
  const paints = (target: Locator) => target.evaluate((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(el).color, getComputedStyle(el).opacity]);
  const part = async (page: P, name: string, state: string) => [
    await resolveColor(page, T(`${name}-${state}container-color`)),
    await resolveColor(page, T(`${name}-${state}content-color`)),
    String(Number(await page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n), T(`${state || 'hovered-'}opacity`)))),
  ];
  const still = (page: P) => page.addStyleTag({ content: `${TAG} > *, ${TAG}::part(overflow-button) { transition: none !important; }` });

  test('BRC-16: a hovered, keyboard-focused or pressed link and overflow button are drawn from the tokens of their part in that state — pressed over focused over hovered; focus gained by a pointer is not the focused state; the container is the box of the content and takes no room', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures });
    await still(page);
    await folded(page);
    for (const [name, target] of [
      ['item', level(page, 'places', 1)],
      ['current', level(page, 'current-link', 3)],
      ['overflow', more(page, 'places')],
    ] as const) {
      const rest = await edges(target);
      // At rest: no fill, and the content color of the part.
      expect((await paints(target))[0]).toMatch(/^rgba\(0, 0, 0, 0\)$|\/ 0\)$/);
      expect((await paints(target))[1]).toBe((await part(page, name, ''))[1]);
      await target.hover();
      expect(await paints(target)).toEqual(await part(page, name, 'hovered-'));
      near((await edges(target)).width, rest.width, 0.01);
      await page.mouse.move(0, 0);
      await tabTo(page, target);
      expect(await paints(target)).toEqual(await part(page, name, 'focused-'));
      // Hovered and focused: focused. Pressed as well: pressed.
      await target.hover();
      expect(await paints(target)).toEqual(await part(page, name, 'focused-'));
      await page.mouse.move(0, 0);
      // Pressed, read while the press is shown, on the page's clock held still. Enter on the overflow button opens its
      // menu in the turn of the key, and focus goes into the menu: the key's press ends there, and the pressed state
      // stays for press-hold (BRC-18) and then gives way to the button at rest. A read a round trip or two after the key
      // comes after press-hold on a slow machine (WebKit on Linux, two workers), and sees the button at rest.
      await holdClock(page);
      try {
        await page.keyboard.down('Enter');
        await expect(target).toHaveAttribute('data-pressed', 'overlay');
        expect(await paints(target)).toEqual(await part(page, name, 'pressed-'));
        near((await edges(target)).height, rest.height, 0.01);
      } finally {
        await releaseClock(page);
      }
      // (The key is let go on another page's worth of nothing: Enter on the button opened its menu.)
      await page.keyboard.up('Enter');
      await page.keyboard.press('Escape');
      await expect.poll(() => target.getAttribute('data-pressed')).toBeNull();
      await target.evaluate((el) => (el as HTMLElement).blur());
    }
    // Focus by a pointer: not the focused state, and no ring.
    const home = level(page, 'places', 1);
    const box = await edges(home);
    await page.mouse.move(box.left + 5, box.top + 5);
    await page.mouse.down();
    expect(await home.evaluate((el) => [el.matches(':focus-visible'), getComputedStyle(el).outlineStyle])).toEqual([false, 'none']);
    await page.mouse.up();
  });

  test('BRC-17: keyboard focus on a link or on the overflow button shows the focus ring around its container without animation — sys.focus.offset away, sys.focus.outer-width wide, in the focus-ring color; focus gained by a pointer shows none', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures });
    await folded(page);
    const [outer, offset, inner, color] = [await resolveToken(page, SYS('focus-outer-width')), await resolveToken(page, SYS('focus-offset')), await resolveToken(page, SYS('focus-inner-width')), await resolveColor(page, SYS('color-focus-ring'))];
    for (const target of [level(page, 'places', 1), more(page, 'places')]) {
      await tabTo(page, target);
      expect(await target.evaluate((el) => [getComputedStyle(el).outlineStyle, getComputedStyle(el).outlineColor])).toEqual(['solid', color]);
      near(await px(target, 'outline-width'), outer, 0.01);
      near(await px(target, 'outline-offset'), offset + inner, 0.01);
      expect(await css(target, 'transition-property')).not.toMatch(/outline|all/);
    }
    const button = more(page, 'places');
    await button.evaluate((el) => (el as HTMLElement).blur());
    const box = await edges(button);
    await page.mouse.move(box.left + 5, box.top + 5);
    await page.mouse.down();
    expect(await css(button, 'outline-style')).toBe('none');
    await page.mouse.up();
    await page.keyboard.press('Escape');
  });

  test('BRC-18: a press on a link by pointer or Enter, and on the overflow button by pointer, Enter or Space, is shown without delay and stays visible for at least sys.motion.duration.press-hold when the press ends sooner; Space on a link shows none', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures });
    await folded(page);
    const hold = await resolveToken(page, SYS('motion-duration-press-hold'), 'duration');
    // Shown in the turn of the event that pressed, and there for press-hold from that event on — the event as it
    // reached the window, before the element's own listener (test/watched-press.ts).
    for (const [target, keys] of [
      [level(page, 'places', 1), ['pointer', 'Enter']],
      [more(page, 'places'), ['pointer', 'Enter', 'Space']],
    ] as const) {
      for (const key of keys) {
        await watchPress(target);
        if (key === 'pointer') {
          const box = await edges(target);
          await page.mouse.move(box.left + 4, box.top + 4);
          await page.mouse.down();
          await page.mouse.up();
          await page.mouse.move(0, 0);
        } else {
          await target.focus();
          await page.keyboard.press(key);
        }
        await expectPressShownAndHeld(page, hold, key);
        await page.keyboard.press('Escape');
      }
    }
    // Space on a link: the page's, not a press.
    const home = level(page, 'places', 1);
    await home.focus();
    await page.keyboard.down('Space');
    expect(await home.getAttribute('data-pressed')).toBeNull();
    await page.keyboard.up('Space');
  });

  test('BRC-19: the answer to a press is the one sys.behavior.pressed-feedback names — overlay paints the pressed tokens on the whole container, ripple grows the pressed layer from the point of contact (from the center for a key, whole where motion is reduced), dim applies the pressed opacity and no layer, none changes nothing — on the pressed level or the overflow button, never the trail', async ({ page }) => {
    // Four systems are mounted one after another.
    test.slow();
    const down = async (target: Locator) => {
      const box = await edges(target);
      // Firefox and WebKit put the pointer on a whole pixel: aim at one, and say where the pointer landed in the box.
      const at = { x: Math.round(box.left + 6), y: Math.round(box.top + 8) };
      await page.mouse.move(at.x, at.y);
      await page.mouse.down();
      return { ...box, at: [Math.round(at.x - box.left), Math.round(at.y - box.top)] };
    };
    const up = async (target: Locator) => {
      await page.mouse.up();
      await page.mouse.move(0, 0);
      await page.keyboard.press('Escape');
      await expect.poll(() => target.getAttribute('data-pressed')).toBeNull();
    };
    const targets = () =>
      [
        ['item', level(page, 'places', 1)],
        ['overflow', more(page, 'places')],
      ] as const;
    // overlay
    await mountFixtures(page, spec, { icons: true, fixtures });
    await still(page);
    await folded(page);
    for (const [name, target] of targets()) {
      await down(target);
      await expect(target).toHaveAttribute('data-pressed', 'overlay');
      expect(await css(target, 'background-color')).toBe(await resolveColor(page, T(`${name}-pressed-container-color`)));
      await expect(target.locator('.ripple')).toHaveCount(0);
      expect(await host(page, 'places').getAttribute('data-pressed')).toBeNull();
      await up(target);
    }
    // ripple
    await mountFixtures(page, spec, { icons: true, fixtures, system: 'm3-like' });
    await folded(page);
    for (const [name, target] of targets()) {
      const box = await down(target);
      await expect(target).toHaveAttribute('data-pressed', 'ripple');
      const ripple = target.locator('> .ripple');
      await expect(ripple).toHaveCount(1);
      expect(await ripple.evaluate((el) => [(el as HTMLElement).style.getPropertyValue('--_x'), (el as HTMLElement).style.getPropertyValue('--_y')].map((v) => Math.round(Number.parseFloat(v))))).toEqual(box.at);
      expect(await css(ripple, 'background-color')).toBe(await resolveColor(page, T(`${name}-pressed-container-color`)));
      expect(await css(ripple, 'animation-duration')).toBe(`${(await resolveToken(page, T('motion-feedback-duration'), 'duration')) / 1000}s`);
      expect(await css(target, 'background-color')).not.toBe(await resolveColor(page, T(`${name}-pressed-container-color`)));
      near((await edges(target)).width, box.width, 0.01);
      await up(target);
      await expect(ripple).toHaveCount(0);
    }
    const home = level(page, 'places', 1);
    await home.focus();
    await page.keyboard.down('Enter');
    near(await home.locator('> .ripple').evaluate((el) => Number.parseFloat((el as HTMLElement).style.getPropertyValue('--_x'))), (await edges(home)).width / 2, 1);
    await page.keyboard.up('Enter');
    await expect.poll(() => home.getAttribute('data-pressed')).toBeNull();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await down(home);
    expect(await css(home.locator('> .ripple'), 'animation-name')).toBe('none');
    await up(home);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    // dim
    await mountFixtures(page, spec, { icons: true, fixtures, system: 'cupertino' });
    await still(page);
    await folded(page);
    for (const [, target] of targets()) {
      await down(target);
      await expect(target).toHaveAttribute('data-pressed', 'dim');
      expect(Number(await css(target, 'opacity'))).toBeCloseTo(Number(await page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n), T('pressed-opacity'))), 2);
      await expect(target.locator('.ripple')).toHaveCount(0);
      await up(target);
    }
    // none
    await mountFixtures(page, spec, { icons: true, fixtures });
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'none' });
    await still(page);
    await folded(page);
    for (const [name, target] of targets()) {
      // (Space on the button: Enter opens its menu at once, and focus is then in the menu.)
      const key = name === 'overflow' ? 'Space' : 'Enter';
      await tabTo(page, target);
      const focused = await paints(target);
      await page.keyboard.down(key);
      await expect(target).toHaveAttribute('data-pressed', 'none');
      expect(await paints(target)).toEqual(focused);
      await page.keyboard.up(key);
      await page.keyboard.press('Escape');
    }
  });

  test('BRC-20: the corners of a level’s container and of the overflow button are eased by sys.shape.corner-smoothing (cupertino is continuous) where the browser can, and keyboard focus is drawn as sys.behavior.focus-style names — a ring, or a glow under the acme system', async ({ page }) => {
    // Three systems are mounted one after another, one of them built here.
    test.slow();
    await mountFixtures(page, spec, { icons: true, fixtures, system: 'cupertino' });
    await folded(page);
    const smooth = await page.evaluate(() => CSS.supports('corner-shape: superellipse(1)'));
    for (const target of [level(page, 'places', 1), more(page, 'places')]) {
      const shape = await css(target, 'corner-shape');
      if (smooth) expect(shape).toContain('superellipse');
      else expect(shape).toBe('');
      const [radius, drawnRadius] = [await resolveToken(page, T('container-shape')), await px(target, 'border-top-left-radius')];
      if (smooth) expect(drawnRadius).toBeGreaterThan(radius);
      else expect(drawnRadius).toBeCloseTo(radius, 1);
    }
    await mountFixtures(page, spec, { icons: true, fixtures });
    await folded(page);
    for (const target of [level(page, 'places', 1), more(page, 'places')]) {
      await tabTo(page, target);
      expect(await css(target, 'outline-color')).toBe(await resolveColor(page, SYS('color-focus-ring')));
    }
    await mountFixtures(page, spec, { icons: true, fixtures, system: 'acme', systemCss: await acmeSystemCss() });
    await folded(page);
    const home = level(page, 'places', 1);
    await tabTo(page, home);
    expect(await css(home, 'outline-color')).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    expect(await css(home, 'box-shadow')).not.toBe('none');
    const button = more(page, 'places');
    await tabTo(page, button);
    expect(await css(button, 'outline-color')).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    expect(await css(button, 'box-shadow', '::after')).not.toBe('none');
  });

  test('BRC-21: a level and the overflow button change between their states over motion.state-duration with motion.state-easing, and at once where motion is reduced', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures });
    await folded(page);
    const duration = `${(await resolveToken(page, T('motion-state-duration'), 'duration')) / 1000}s`;
    const easing = await page.evaluate((n) => {
      const probe = document.body.appendChild(document.createElement('div'));
      probe.style.transitionTimingFunction = `var(${n})`;
      const value = getComputedStyle(probe).transitionTimingFunction;
      probe.remove();
      return value;
    }, T('motion-state-easing'));
    const home = level(page, 'places', 1);
    const moving = await home.evaluate((el) => {
      const s = getComputedStyle(el);
      const [properties, durations, easings] = [s.transitionProperty.split(', '), s.transitionDuration.split(', '), s.transitionTimingFunction.split(/, (?=[a-z])/)];
      return ['background-color', 'color', 'opacity'].map((name) => [durations[properties.indexOf(name)], easings[properties.indexOf(name)]]);
    });
    expect(moving).toEqual([
      [duration, easing],
      [duration, easing],
      [duration, easing],
    ]);
    const button = more(page, 'places');
    expect(await button.evaluate((el) => [getComputedStyle(el).transitionProperty, getComputedStyle(el).transitionDuration, getComputedStyle(el).transitionTimingFunction])).toEqual(['background-color, color, opacity', duration, easing]);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(home, 'transition-property')).toBe('--_brc-held-image, --_brc-held-clip');
    expect(await css(button, 'transition-property')).toBe('none');
  });

  test('BRC-22: Enter on a link in the trail fires click once and follows it at once, a click listener that cancels keeps the page where it is, Space fires no click and shows no press, and a modified click is left to the browser', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [own('places', PLACES)] });
    await give(page, 'places', 1000);
    await page.evaluate(() => {
      const w = window as unknown as { __clicks: string[]; __cancel: boolean; __prevented: boolean[] };
      w.__clicks = [];
      w.__prevented = [];
      w.__cancel = false;
      document.querySelector('tanrei-breadcrumbs')!.addEventListener('click', (event) => {
        w.__clicks.push((event.target as Element).getAttribute('href') ?? '');
        if (w.__cancel) event.preventDefault();
      });
      // What the element did with the click is seen after it: on the document.
      document.addEventListener('click', (event) => {
        w.__prevented.push(event.defaultPrevented);
        if (event.ctrlKey || event.metaKey) event.preventDefault();
      });
    });
    const state = () => page.evaluate(() => [(window as unknown as { __clicks: string[] }).__clicks.join(' '), location.hash]);
    const docs = level(page, 'places', 2);
    await tabTo(page, docs);
    await page.keyboard.press('Enter');
    // Followed in the same task as the click: nothing waits for press-hold.
    expect(await state()).toEqual(['#docs', '#docs']);
    await expect.poll(() => docs.getAttribute('data-pressed')).toBeNull();
    await page.keyboard.down('Space');
    expect(await docs.getAttribute('data-pressed')).toBeNull();
    await page.keyboard.up('Space');
    expect(await state()).toEqual(['#docs', '#docs']);
    await page.evaluate(() => ((window as unknown as { __cancel: boolean }).__cancel = true));
    await level(page, 'places', 3).click();
    expect(await state()).toEqual(['#docs #tokens', '#docs']);
    // A modified click reaches the page uncancelled by the element.
    await page.evaluate(() => {
      const w = window as unknown as { __cancel: boolean; __prevented: boolean[] };
      w.__cancel = false;
      w.__prevented = [];
    });
    await level(page, 'places', 4).click({ modifiers: ['ControlOrMeta'] });
    expect(await page.evaluate(() => (window as unknown as { __prevented: boolean[] }).__prevented)).toEqual([false]);
  });

  test('BRC-23: a link and the overflow button take presses on the minimum target on both axes without changing their size or room, and along the trail no further than halfway to the entry beside them: a press on a separator reaches the nearer of its two neighbours, and no two hit areas overlap', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('default'), own('places', PLACES), own('ends', '<a href="#a">Home</a><a href="#b">Components</a>')] });
    // A trail of links alone against both edges of a box that scrolls: no hit area widens it, in either direction.
    for (const dir of ['ltr', 'rtl']) {
      await stage(page, 'ends').evaluate((el, d) => {
        el.setAttribute('dir', d);
        (el as HTMLElement).style.cssText = 'display: inline-block; padding: 0; overflow: auto; inline-size: auto;';
      }, dir);
      await settled(page);
      expect(await stage(page, 'ends').evaluate((el) => [el.scrollWidth <= el.clientWidth, el.clientWidth > 0]), dir).toEqual([true, true]);
    }
    const sizes = await needs(page, 'places');
    await give(page, 'places', Math.ceil(sizes.widths[0]! + sizes.button + sizes.widths.at(-1)!) + 1);
    // Room above and below the trail, so that the hit areas lie in the page.
    await page.addStyleTag({ content: '.stage { padding-block: 40px !important; }' });
    const target = await resolveToken(page, SYS('target-pointer'));
    const hit = (x: number, y: number) =>
      page.evaluate(
        ([px, py]) => {
          let el = document.elementFromPoint(px!, py!);
          while (el?.shadowRoot?.elementFromPoint(px!, py!) && el.shadowRoot.elementFromPoint(px!, py!) !== el) el = el.shadowRoot.elementFromPoint(px!, py!);
          const control = el?.closest('a, button');
          return control ? `${control.localName}:${control.textContent?.trim()}` : (el?.localName ?? '');
        },
        [x, y] as const,
      );
    const [home, components, separator] = [await edges(level(page, 'default', 1)), await edges(level(page, 'default', 2)), await edges(separators(page, 'default').first())];
    expect(home.height).toBeLessThan(target);
    const middle = (home.top + home.bottom) / 2;
    // Above and below: half the target from the middle of the line, and not beyond.
    expect(await hit(home.left + 4, middle - target / 2 + 1)).toBe('a:Home');
    expect(await hit(home.left + 4, middle + target / 2 - 1)).toBe('a:Home');
    expect(await hit(home.left + 4, middle - target / 2 - 2)).not.toBe('a:Home');
    // On the separator: the nearer neighbour.
    expect(await hit(separator.left + 2, middle)).toBe('a:Home');
    expect(await hit(separator.right - 2, middle)).toBe('a:Components');
    const reach = (await resolveToken(page, T('separator-size'))) / 2 + (await resolveToken(page, T('separator-gap')));
    // Halfway to the entry beside it; and where there is none — the trail's two ends — no further than the level.
    const sides = (target: Locator) => target.evaluate((el) => [Number.parseFloat(getComputedStyle(el, '::after').left), Number.parseFloat(getComputedStyle(el, '::after').right)]);
    expect(await sides(level(page, 'default', 1))).toEqual([0, -reach]);
    expect(await sides(level(page, 'default', 2))).toEqual([-reach, -reach]);
    expect(await sides(level(page, 'places', 1))).toEqual([0, -reach]);
    // Halfway: where one hit area ends the next begins.
    expect(await hit(separator.left + separator.width / 2 - 1, middle)).toBe('a:Home');
    expect(await hit(separator.left + separator.width / 2 + 1, middle)).toBe('a:Components');
    // Nothing takes room: the neighbour starts where the separator and its gaps end.
    near(components.left - home.right, reach * 2, 0.1);
    // The overflow button: the same, around its square.
    const button = await edges(more(page, 'places'));
    const line = (button.top + button.bottom) / 2;
    expect(await hit(button.left + 2, line - target / 2 + 1)).toMatch(/^button:/);
    expect(await hit(button.left - reach + 1, line)).toMatch(/^button:/);
    expect(await hit(button.left - reach - 1, line)).toBe('a:Home');
    // For touch the target is sys.target.touch: the stylesheet's and the element's own condition.
    expect(fs.readFileSync(path.join(pkg, 'dist/breadcrumbs.css'), 'utf8')).toMatch(/@media \(pointer: coarse\) \{\s*--_brc-target: var\(--tanrei-sys-target-touch\)/);
  });
});

test.describe('when the underline is shown', () => {
  const LINKS = '<a href="#a">Home</a><a href="#b">Components</a><a href="#c" aria-current="page">Button</a>';
  const line = (target: Locator) => css(target, 'text-decoration-line');
  const TOKEN = '--tanrei-comp-breadcrumbs-underline-visibility';

  test('BRC-30: the links of a trail are underlined as underline names — always at rest and in every state, hover only while hovered, keyboard-focused or pressed with no level moving, never in no state while the container and the ring still answer; auto follows comp.breadcrumbs.underline.visibility and through it sys.behavior.link-underline; a change is drawn at once keeping focus; an unknown value is auto and reported; the current page and the rows of the overflow menu are never underlined', async ({ page, browser }) => {
    const seen = warnings(page);
    const kinds = ['always', 'hover', 'never'] as const;
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [...some('default', 'underline-always', 'underline-hover', 'underline-never'), ...kinds.map((kind) => own(kind, LINKS, { ...NAMES, underline: kind })), own('unknown', LINKS, { ...NAMES, underline: 'sometimes' }), own('folded', PLACES, { ...NAMES, underline: 'always' })],
    });
    await page.addStyleTag({ content: `${TAG} > * { transition: none !important; }` });
    const rest = async () => Object.fromEntries(await Promise.all(['default', 'underline-always', 'underline-hover', 'underline-never', 'unknown'].map(async (id) => [id, await line(level(page, id, 1))] as const)));
    // The default system: always. The attribute, whatever the tokens say.
    expect(await rest()).toEqual({ default: 'underline', 'underline-always': 'underline', 'underline-hover': 'none', 'underline-never': 'none', unknown: 'underline' });
    expect(seen.some((message) => message.includes('BRC-30') && message.includes('sometimes'))).toBe(true);
    // auto follows the trail's own token…
    for (const named of ['hover', 'never']) {
      await override(page, { [TOKEN]: named });
      await settled(page);
      expect(await rest(), named).toEqual({ default: 'none', 'underline-always': 'underline', 'underline-hover': 'none', 'underline-never': 'none', unknown: 'none' });
    }
    // …which follows the system's choice; a name neither knows is the first value.
    await rootTokens(page, { [TOKEN]: '' });
    await override(page, { '--tanrei-sys-behavior-link-underline': 'hover' });
    await settled(page);
    expect((await rest()).default).toBe('none');
    await override(page, { '--tanrei-sys-behavior-link-underline': 'dotted' });
    await settled(page);
    expect((await rest()).default).toBe('underline');
    await rootTokens(page, { '--tanrei-sys-behavior-link-underline': '' });
    await settled(page);
    // In a state: hovered, keyboard-focused, pressed.
    const boxes = (id: string) => host(page, id).evaluate((el) => [...el.children].map((child) => child.getBoundingClientRect().left + child.getBoundingClientRect().width));
    for (const kind of kinds) {
      const target = level(page, kind, 1);
      const [still, shown] = [await boxes(kind), kind === 'never' ? 'none' : 'underline'];
      expect(await line(target), kind).toBe(kind === 'always' ? 'underline' : 'none');
      await target.hover();
      expect(await line(target), `${kind} hovered`).toBe(shown);
      expect(await css(target, 'background-color')).toBe(await resolveColor(page, T('item-hovered-container-color')));
      expect(await boxes(kind)).toEqual(still);
      await page.mouse.move(0, 0);
      await tabTo(page, target);
      expect(await line(target), `${kind} focused`).toBe(shown);
      expect(await css(target, 'outline-style')).toBe('solid');
      await page.keyboard.down('Enter');
      await expect(target).toHaveAttribute('data-pressed', 'overlay');
      expect(await line(target), `${kind} pressed`).toBe(shown);
      await page.keyboard.up('Enter');
      await expect.poll(() => target.getAttribute('data-pressed')).toBeNull();
      // The current page, a link here, is not underlined in any state.
      const current = level(page, kind, 3);
      await current.hover();
      expect(await line(current), `${kind} current`).toBe('none');
      await page.mouse.move(0, 0);
    }
    // Changed while shown: the other form at once, with focus where it was.
    await tabTo(page, level(page, 'never', 2));
    await host(page, 'never').evaluate((el) => el.setAttribute('underline', 'always'));
    await settled(page);
    expect(await line(level(page, 'never', 1))).toBe('underline');
    expect(await active(page)).toBe('a:Components');
    // The rows of the overflow menu are menu items: nothing in one is underlined.
    await give(page, 'folded', 300);
    await more(page, 'folded').click();
    await expect(menu(page, 'folded').locator('.surface')).toBeVisible();
    expect(await rows(page, 'folded').evaluateAll((els) => els.flatMap((el) => [el, ...(el.shadowRoot?.querySelectorAll('*') ?? [])].map((part) => getComputedStyle(part).textDecorationLine)).filter((value) => value !== 'none'))).toEqual([]);
    await page.keyboard.press('Escape');
    // Before the element is defined the stylesheet reads the same attribute: nothing flashes.
    const context = await browser.newContext({ javaScriptEnabled: false });
    const stillPage = await context.newPage();
    await stillPage.setContent(await fixturesDocument(spec, { icons: true, fixtures: some('default', 'underline-always', 'underline-hover', 'underline-never') }));
    expect(await stillPage.locator(`${TAG} > a:first-child`).evaluateAll((els) => els.map((el) => getComputedStyle(el).textDecorationLine))).toEqual(['underline', 'underline', 'none', 'none']);
    await context.close();
  });
});

test.describe('forced colors, text size, direction, unknown values', () => {
  test('BRC-24: in forced colors a link, its underline and its glyph are the system’s link color, the current page, a level without a destination and the separators its text color, the overflow button’s glyph its button text color, the focus ring its highlight, and the underline of a link is drawn at rest whatever underline and the tokens say', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('text-level', 'home-icon', 'long-trail', 'underline-never', 'underline-hover')] });
    test.skip(!(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)), 'this browser does not emulate forced colors');
    const system = (name: string) =>
      page.evaluate((n) => {
        const probe = document.body.appendChild(document.createElement('div'));
        probe.style.color = n;
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      }, name);
    const link = level(page, 'home-icon', 1);
    expect(await css(link, 'color')).toBe(await system('LinkText'));
    expect(await css(link, 'color', '::before')).toBe(await system('LinkText'));
    expect(await css(link, 'text-decoration-line')).toBe('underline');
    // The underline at rest whatever underline and the tokens say — on a link, and still not on the current page.
    await override(page, { '--tanrei-comp-breadcrumbs-underline-visibility': 'never' });
    await settled(page);
    for (const id of ['home-icon', 'underline-never', 'underline-hover']) {
      expect(await css(level(page, id, 2), 'text-decoration-line'), id).toBe('underline');
      expect(await css(level(page, id, 3), 'text-decoration-line'), id).toBe('none');
    }
    expect(await css(level(page, 'text-level', 2), 'color')).toBe(await system('CanvasText'));
    expect(await css(level(page, 'text-level', 3), 'color')).toBe(await system('CanvasText'));
    expect(await css(separators(page, 'text-level').first(), 'color')).toBe(await system('CanvasText'));
    expect(await css(more(page, 'long-trail'), 'color')).toBe(await system('ButtonText'));
    await tabTo(page, link);
    expect(await css(link, 'outline-color')).toBe(await system('Highlight'));
    await tabTo(page, more(page, 'long-trail'));
    expect(await css(more(page, 'long-trail'), 'outline-color')).toBe(await system('Highlight'));
  });

  test('BRC-25: at 200 % text the trail grows with its text — labels, containers and hit areas — keeps its gaps, its underline and its glyph sizes as the tokens give them, and decides again what fits: collapsed it still fits a width of 320 and the page does not scroll sideways; under wrap every level is still shown', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await mountFixtures(page, spec, { icons: true, fixtures: some('long-trail', 'long-trail-wrap', 'home-icon') });
    for (const id of ['long-trail', 'long-trail-wrap', 'home-icon']) await give(page, id, 320);
    const before = { size: await px(level(page, 'long-trail', 8), 'font-size'), line: (await edges(level(page, 'long-trail', 8))).height, out: (await drawn(page, 'long-trail')).length };
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    await settled(page);
    const home = level(page, 'long-trail', 1);
    near(await px(level(page, 'long-trail', 8), 'font-size'), before.size * 2, 0.5);
    near((await edges(level(page, 'long-trail', 8))).height, before.line * 2, 1);
    for (const name of ['separator-gap', 'container-gap', 'underline-width', 'underline-offset', 'row-gap', 'icon-size', 'separator-size']) expect(await resolveToken(page, T(name))).toBeGreaterThan(0);
    near((await edges(separators(page, 'long-trail-wrap').first())).width, await resolveToken(page, T('separator-size')), 0.1);
    near(await px(level(page, 'home-icon', 1), 'width', '::before'), await resolveToken(page, T('icon-size')), 0.1);
    near(await px(level(page, 'long-trail-wrap', 1), 'text-decoration-thickness'), await resolveToken(page, T('underline-width')), 0.01);
    // Decided again: fewer levels than before are drawn, what is drawn fits, and the page is not widened.
    expect((await drawn(page, 'long-trail')).length).toBeLessThanOrEqual(before.out);
    await expect(more(page, 'long-trail')).toBeVisible();
    near((await edges(more(page, 'long-trail'))).height, before.line * 2, 1);
    expect(await host(page, 'long-trail').evaluate((el) => el.shadowRoot!.querySelector('ol')!.scrollWidth <= el.clientWidth + 1)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expect(home).toBeHidden();
    // Wrap: every level, on more lines.
    expect(await drawn(page, 'long-trail-wrap')).toHaveLength(8);
    for (let n = 1; n <= 8; n++) await expect(level(page, 'long-trail-wrap', n)).toBeVisible();
  });

  test('BRC-26: the direction is that of the nearest ancestor that sets one — the trail has no setting of its own — and a change of it while the trail is shown is drawn at once, without a motion, keeping its focus and its open menu', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [own('places', PLACES), own('inner', PLACES)] });
    for (const id of ['places', 'inner']) await give(page, id, 1000);
    expect(await host(page, 'places').evaluate((el) => [el.hasAttribute('dir'), 'dir' in (el.constructor as unknown as { properties: object }).properties])).toEqual([false, false]);
    // An ancestor inside the page, not the root.
    await page.evaluate(() => {
      const around = document.createElement('section');
      around.dir = 'rtl';
      const stage = document.querySelector('[data-fixture="inner"]')!;
      stage.replaceWith(around);
      around.append(stage);
    });
    await settled(page);
    const order = async (id: string) => (await edges(level(page, id, 1))).left > (await edges(level(page, id, 5))).left;
    expect(await order('inner')).toBe(true);
    expect(await order('places')).toBe(false);
    near((await edges(level(page, 'inner', 1))).right, (await edges(host(page, 'inner'))).right, 0.1);
    // Changed after the first render: with focus on a level, then with the menu open.
    await tabTo(page, level(page, 'places', 2));
    await stage(page, 'places').evaluate((el) => el.setAttribute('dir', 'rtl'));
    await settled(page);
    expect(await order('places')).toBe(true);
    expect(await active(page)).toBe('a:Documentation');
    const sizes = await needs(page, 'places');
    await give(page, 'places', Math.ceil(sizes.widths[0]! + sizes.button + sizes.widths.at(-1)!) + 1);
    await more(page, 'places').click();
    const surface = menu(page, 'places').locator('.surface');
    await expect(surface).toBeVisible();
    await stage(page, 'places').evaluate((el) => el.removeAttribute('dir'));
    await settled(page);
    expect(await order('places')).toBe(false);
    await expect(surface).toBeVisible();
    await expect(more(page, 'places')).toHaveAttribute('aria-expanded', 'true');
    expect(await host(page, 'places').evaluate((el) => [...el.shadowRoot!.querySelectorAll('li')].every((li) => li.getAnimations().length === 0))).toBe(true);
  });

  test('BRC-27: in a right-to-left layout the trail runs from the right, a level’s glyph is at the right of its label, the menu opens with its right edge on the button’s, each separator is mirrored by the icon helper and points left, home and more_horiz are drawn as in left-to-right, a level’s own glyph is mirrored when the icon set marks its name or the product says always and never when it says never, and the reading and focus order stay from the top to the page', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [...some('default-rtl', 'home-icon-only-rtl', 'long-trail-rtl'), own('glyphs', '<a href="#a" data-icon="home">الرئيسية</a><a href="#b" data-icon="arrow_forward">التالي</a><a href="#c" data-icon="arrow_forward" data-mirror="never">التالي</a><a href="#d" data-icon="home" data-mirror="always">الرئيسية</a>', NAMES, 'rtl')],
    });
    const [first, second, third, around] = [await edges(level(page, 'default-rtl', 1)), await edges(level(page, 'default-rtl', 2)), await edges(level(page, 'default-rtl', 3)), await edges(host(page, 'default-rtl'))];
    near(first.right, around.right, 0.1);
    expect(first.left > second.right && second.left > third.right).toBe(true);
    // The separators: marked by the icon helper, and mirrored in their own box.
    const separator = separators(page, 'default-rtl').first();
    expect(await separator.evaluate((el) => [el.hasAttribute('data-tanrei-mirrored'), getComputedStyle(el).transform])).toEqual([true, 'matrix(-1, 0, 0, 1, 0, 0)']);
    // home and more_horiz are not marked.
    expect(await more(page, 'long-trail-rtl').locator('.more-glyph').evaluate((el) => [el.hasAttribute('data-tanrei-mirrored'), getComputedStyle(el).transform])).toEqual([false, 'none']);
    const mirrored = (target: Locator) => target.evaluate((el) => getComputedStyle(el, '::before').transform !== 'none');
    expect(await mirrored(level(page, 'home-icon-only-rtl', 1))).toBe(false);
    expect([await mirrored(level(page, 'glyphs', 1)), await mirrored(level(page, 'glyphs', 2)), await mirrored(level(page, 'glyphs', 3)), await mirrored(level(page, 'glyphs', 4))]).toEqual([false, true, false, true]);
    // A glyph at the right of its label.
    const glyphs = level(page, 'glyphs', 1);
    const text = await glyphs.evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return el.getBoundingClientRect().right - range.getBoundingClientRect().right;
    });
    near(text, (await resolveToken(page, T('icon-size'))) + (await resolveToken(page, T('container-gap'))), 0.6);
    // The menu: its right edge on the button's.
    const button = more(page, 'long-trail-rtl');
    await button.click();
    const surface = menu(page, 'long-trail-rtl').locator('.surface');
    await expect(surface).toBeVisible();
    near((await edges(surface)).right, (await edges(button)).right, 1);
    await page.keyboard.press('Escape');
    // Focus: from the top of the hierarchy to the page.
    await tabTo(page, level(page, 'default-rtl', 1));
    await tab(page);
    expect(await level(page, 'default-rtl', 2).evaluate((el) => el === document.activeElement)).toBe(true);
    expect(await drawn(page, 'default-rtl')).toEqual(['الرئيسية', 'المكوّنات', 'الزر']);
  });

  test('BRC-7, BRC-27: the space between a level’s glyph and its label is on the label’s side of the glyph — its right in a left-to-right layout, its left in a right-to-left one — and the level is as wide in both', async ({ page }) => {
    // The glyph is laid out left to right (its name is a ligature), so a margin at its own inline end is at its right
    // in both layouts — outside the level in a right-to-left one, where the glyph would touch the label. The level's
    // width cannot tell the two apart.
    const markup = '<a href="#a" data-icon="home">Home</a><span aria-current="page">Here</span>';
    await mountFixtures(page, spec, { icons: true, fixtures: [own('ltr', markup), own('rtl', markup, NAMES, 'rtl')] });
    const gap = await resolveToken(page, T('container-gap'));
    const size = await resolveToken(page, T('icon-size'));
    expect(gap).toBeGreaterThan(0);
    const read = (id: string) =>
      level(page, id, 1).evaluate((el) => {
        const glyph = getComputedStyle(el, '::before');
        const range = document.createRange();
        range.selectNodeContents(el);
        const [box, text] = [el.getBoundingClientRect(), range.getBoundingClientRect()];
        return { left: Number.parseFloat(glyph.marginLeft), right: Number.parseFloat(glyph.marginRight), before: text.left - box.left, after: box.right - text.right, width: box.width };
      });
    const [ltr, rtl] = [await read('ltr'), await read('rtl')];
    // Left to right: [glyph][gap][label].
    near(ltr.right, gap, 0.1);
    near(ltr.left, 0, 0.1);
    near(ltr.before, size + gap, 0.6);
    // Right to left: [label][gap][glyph].
    near(rtl.left, gap, 0.1);
    near(rtl.right, 0, 0.1);
    near(rtl.after, size + gap, 0.6);
    near(rtl.width, ltr.width, 0.1);
  });

  test('BRC-28: each label is text of its own direction, isolated: in ltr-label-rtl a left-to-right name reads in its own order and the trail still runs from the right; a left-to-right label cut in a right-to-left layout loses its right end and never its beginning', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('ltr-label-rtl'), own('cut', '<a href="#a">الرئيسية</a><span aria-current="page">tanrei-button 1.2: the release notes of every version since the first one</span>', NAMES, 'rtl')] });
    await give(page, 'cut', 240);
    const ends = (target: Locator) =>
      target.evaluate((el) => {
        const node = el.firstChild as Text;
        const at = (index: number) => {
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + 1);
          return range.getBoundingClientRect();
        };
        return { first: at(0).left, last: at(node.length - 1).left };
      });
    for (const n of [2, 3]) {
      const read = await ends(level(page, 'ltr-label-rtl', n));
      expect(read.first, `level ${n}`).toBeLessThan(read.last);
      expect(await css(level(page, 'ltr-label-rtl', n), 'unicode-bidi')).toBe('plaintext');
    }
    expect((await edges(level(page, 'ltr-label-rtl', 1))).left).toBeGreaterThan((await edges(level(page, 'ltr-label-rtl', 2))).right);
    expect((await edges(level(page, 'ltr-label-rtl', 2))).left).toBeGreaterThan((await edges(level(page, 'ltr-label-rtl', 3))).right);
    // Cut at its own end: the label's beginning is drawn at the box's left edge, and the box is the text's direction.
    const cut = level(page, 'cut', 2);
    expect(await cut.evaluate((el) => [el.getAttribute('dir'), getComputedStyle(el).direction, getComputedStyle(el).textOverflow, el.scrollWidth > el.clientWidth])).toEqual(['auto', 'ltr', 'ellipsis', true]);
    near((await ends(cut)).first, (await edges(cut)).left, 1);
    // …and the trail still runs from the right: the button stands at the right of the cut label.
    expect((await edges(more(page, 'cut'))).left).toBeGreaterThan((await edges(cut)).right);
    // Room again: the direction the element gave is taken back.
    await give(page, 'cut', 1200);
    expect(await cut.getAttribute('dir')).toBeNull();
  });

  test('BRC-29: an overflow the trail does not have behaves as collapse and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, fixtures: [own('unknown', PLACES, { ...NAMES, overflow: 'sideways' })] });
    await give(page, 'unknown', 300);
    expect((await drawn(page, 'unknown')).includes('…')).toBe(true);
    expect(await css(level(page, 'unknown', 5), 'white-space')).toBe('nowrap');
    expect(seen.some((message) => message.includes('BRC-29') && message.includes('sideways'))).toBe(true);
  });
});

test.describe('the element and its stylesheet', () => {
  const FITS = ['default', 'two-levels', 'single', 'current-link', 'no-current', 'text-level', 'home-icon', 'home-icon-only', 'long-trail-wrap', 'default-rtl', 'home-icon-only-rtl', 'ltr-label-rtl'];
  const boxes = (page: P) =>
    page.evaluate((tag) =>
      [...document.querySelectorAll(tag)].map((el) => [el, ...el.children].map((each) => {
        const r = each.getBoundingClientRect();
        return [r.left, r.top, r.width, r.height].map((n) => Math.round(n * 10) / 10);
      })),
    TAG);

  test('the stylesheet alone draws every trail that fits its width as the element will — the wrap form, with its separators — and defining the element moves nothing (BRC-2, BRC-6, BRC-15)', async ({ page, browser }) => {
    const fixtures = some(...FITS);
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: page.viewportSize() });
    const still = await context.newPage();
    await still.setContent(await fixturesDocument(spec, { icons: true, fixtures }));
    const before = await boxes(still);
    // The separators it draws itself until then: after every level but the last, in the room the level keeps.
    const first = still.locator(`[data-fixture="default"] ${TAG} > :nth-child(1)`);
    expect(await css(first, 'content', '::after')).toContain('chevron_right');
    expect(await css(still.locator(`[data-fixture="default"] ${TAG} > :nth-child(3)`), 'content', '::after')).toBe('none');
    near(await px(first, 'margin-inline-end'), (await resolveToken(still, T('separator-size'))) + 2 * (await resolveToken(still, T('separator-gap'))), 0.01);
    expect(await css(first, 'pointer-events', '::after')).toBe('none');
    // Its optical size is its box's, as the element's own separator's is.
    expect(await drawnOpticalSize(first, '::after')).toBe(await opticalSize(still, await resolveToken(still, T('separator-size'))));
    await context.close();
    await mountFixtures(page, spec, { icons: true, fixtures });
    expect(await boxes(page)).toEqual(before);
  });

  test('the element brings its stylesheet to the root it is connected to: a trail in another component’s shadow root is drawn (BRC-2)', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('default') });
    const look = await page.evaluate(async (tag) => {
      const outer = document.body.appendChild(document.createElement('div'));
      const root = outer.attachShadow({ mode: 'open' });
      root.innerHTML = `<${tag} label="Inner"><a href="#a">Home</a><span aria-current="page">Button</span></${tag}>`;
      await (root.querySelector(tag) as unknown as { updateComplete: Promise<unknown> }).updateComplete;
      const a = root.querySelector('a')!;
      return [getComputedStyle(a).textDecorationLine, getComputedStyle(a).display, root.adoptedStyleSheets.length];
    }, TAG);
    expect(look).toEqual(['underline', 'block', 1]);
  });

  test('in a layout that gives it the width of its content the trail folds when the room goes and unfolds when it returns, and asks its ancestors for no more room than the page has (BRC-8, BRC-12)', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [own('places', PLACES)] });
    // A row of a flex layout, inside an item that keeps the least width of its content.
    await stage(page, 'places').evaluate((el) => {
      (el as HTMLElement).style.cssText = 'display: flex; box-sizing: border-box; inline-size: 332px; max-inline-size: none;';
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; flex: 1 1 auto;';
      row.append(el.firstElementChild!);
      el.append(row);
    });
    await settled(page);
    expect((await drawn(page, 'places')).includes('…')).toBe(true);
    expect((await edges(host(page, 'places'))).width).toBeLessThanOrEqual(300.5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await stage(page, 'places').evaluate((el) => ((el as HTMLElement).style.inlineSize = '1200px'));
    await settled(page);
    expect(await drawn(page, 'places')).toHaveLength(5);
  });

  test('no design value is written in the stylesheet or the element’s styles: every length, color, radius, duration and opacity is a token (BRC-2, BRC-6, BRC-16)', async () => {
    const sheet = fs.readFileSync(path.join(pkg, 'src/styles/breadcrumbs.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const element = fs.readFileSync(path.join(pkg, 'src/components/breadcrumbs/breadcrumbs.styles.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const text of [sheet, element]) {
      expect(text).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsl|oklch/i);
      // Lengths and times: only zero, a percentage, and the factors of a calculation.
      const literals = [...text.matchAll(/(?<![\w-])(\d*\.?\d+)(px|rem|em|ms|s)\b/g)].filter((match) => Number(match[1]) !== 0);
      expect(literals.map((match) => match[0])).toEqual([]);
    }
  });
});

test.describe('accessibility', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`BRC-1: no axe violations in ${theme}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true, theme });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  }

  test('BRC-11, MNU-53: no axe violations with the menu of the levels taken out open — its rows anchors with the menu item role, and a disabled row among them', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('long-trail'), own('places', MENU_PLACES)] });
    const sizes = await needs(page, 'places');
    await give(page, 'places', Math.ceil(sizes.widths[0]! + sizes.button + sizes.widths.at(-1)!) + 1);
    for (const id of ['long-trail', 'places']) {
      await more(page, id).click();
      await expect(menu(page, id).locator('.surface')).toBeVisible();
      await expect.poll(() => focusedRow(page)).toMatchObject({ focus: 'a', role: 'menuitem' });
      expect(await rows(page, id).evaluateAll((items) => items.filter((item) => item.shadowRoot!.querySelector('a[role="menuitem"][href]')).length), id).toBeGreaterThan(0);
      // The menu as it rests: in the middle of its entrance its rows are still fading in, and their contrast is not theirs.
      await motionEnded(menu(page, id).locator('.surface'));
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`), id).toEqual([]);
      await page.keyboard.press('Escape');
      await expect(menu(page, id).locator('.surface')).toBeHidden();
    }
  });
});

test.describe('fixtures', () => {
  test('every fixture of the spec is mounted', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    for (const f of spec.fixtures) {
      await expect(host(page, f.id)).toHaveCount(1);
      expect(await host(page, f.id).evaluate((el) => el.children.length)).toBe(f.items!.length);
      expect((await drawn(page, f.id)).at(-1)).toBe(f.items!.at(-1)!.props.label);
    }
  });
});

test.describe('baselines', () => {
  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true });
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});

test.describe('without the package’s script', () => {
  test('BRC-18: the stylesheet alone shows a press on a link at once and holds it for press-hold — the pressed container is what is drawn, in the state’s place, in every frame of the hold', async ({ page }) => {
    const document = await fixturesDocument(spec, { icons: true, fixtures: some('default') });
    await page.setContent(`${document.slice(0, document.lastIndexOf('<script type="module">'))}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate((tag) => !!customElements.get(tag), TAG)).toBe(false);
    const home = level(page, 'default', 1);
    await home.evaluate((el) => el.addEventListener('click', (event) => event.preventDefault()));
    await expectPressHeldAtEveryMoment(page, home, { pressed: await resolveColor(page, T('item-pressed-container-color')) });
  });
});
