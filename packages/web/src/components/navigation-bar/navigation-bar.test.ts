// <tanrei-navigation-bar> and <tanrei-navigation-bar-item>, driven by specs/navigation-bar.spec.json: every behaviour id
// (NVB-1…33) is cited by a test title — the sentences shared through test/destinations.ts, with
// the bar's own ids — every fixture has a baseline, and every value is read back from the tokens.
import { type Locator, type Page, expect, test } from '@playwright/test';
import { FOUR, bounds, css, destination, destinationSuite, override } from '../../../test/destinations.js';
import { type Fixture, fixturesDocument, loadSpec, mountFixtures, resolveColor, resolveToken, tab, tabTo } from '../../../test/harness.js';
import { releaseAtRest } from '../../../test/release-at-rest.js';
import { STOPPED_AFTER, flingThenHold, strokes } from '../../../test/stopped-release.js';
import { indicatorChoice, indicatorPlace } from '../../primitives/indicator-drag.js';

const spec = loadSpec('navigation-bar');
type P = Page;
const bar = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-navigation-bar`);
const item = (page: P, id: string, n: number) => bar(page, id).locator('tanrei-navigation-bar-item').nth(n);
/** The item container (a badge has a container of its own inside it). */
const container = (page: P, id: string, n: number) => item(page, id, n).locator('.cell > .container');
/** Whether a computed color draws nothing, however the browser serializes it (`rgba(0, 0, 0, 0)`, `color(srgb 0 0 0 / 0)`). */
const clear = (color: string) => /^(rgba\(.*,\s*0\)|.*\/\s*0\)|transparent)$/.test(color);
const pill = (page: P, id: string) => bar(page, id).locator('.pill');
const T = (name: string) => `--tanrei-comp-navigation-bar-${name}`;
const four = (id: string, props: Fixture['props'] = {}): Fixture => ({ id, props: { value: 'inbox', label: 'Main', ...props }, items: FOUR });
const fixtures = (...ids: string[]) => spec.fixtures.filter((f) => ids.includes(f.id));
const SLIDE = 'tanrei-navigation-bar-slide';
const CATCH_UP = 'tanrei-navigation-bar-catch-up';

/**
 * A part's box whether it is drawn or not: at rest the selected destination's plain icon and label are laid out but not
 * drawn under their covered copy (NVB-23), and Playwright gives no box for an element it does not see.
 */
const rect = (locator: Locator) =>
  locator.evaluate((el) => {
    const { x, y, width, height } = el.getBoundingClientRect();
    return { x, y, width, height };
  });

/** Two animation frames: the bar has drawn the indicator (and every covered copy) at least once since. */
const frames = (page: P) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null)))));

/** The bar's slide (or another of its clocks), held at `time` ms (null finishes it). */
const holdSlide = (page: P, id: string, time: number | null, clock = SLIDE) =>
  pill(page, id).evaluate(
    (el, [name, at]) => {
      const slide = el.getAnimations().find((each) => each.id === name);
      if (!slide) return false;
      if (at === null) slide.finish();
      else {
        slide.pause();
        slide.currentTime = at;
      }
      return true;
    },
    [clock, time] as const,
  );

/**
 * The product sets the bar's value, and the slide that begins is held at its beginning in the task that begins it: the
 * next answer of a slow runner comes hundreds of milliseconds later (570 ms a round trip, WebKit on Linux), and a slide
 * left running has gone on, or ended, by then. False: no slide began.
 */
const selectHeld = (page: P, id: string, to: string) =>
  bar(page, id).evaluate(
    async (el: any, [value, name]) => {
      el.value = value;
      await el.updateComplete;
      const slide = (el.shadowRoot.querySelector('.pill') as HTMLElement).getAnimations().find((each) => each.id === name);
      slide?.pause();
      return !!slide;
    },
    [to, SLIDE] as const,
  );

/** Logs every change and reselect the bars fire: the event and the value it carried. */
const wire = (page: P) =>
  page.evaluate(() => {
    const log: string[] = ((window as any).log = []);
    for (const each of document.querySelectorAll<any>('tanrei-navigation-bar')) for (const type of ['change', 'reselect']) each.addEventListener(type, (e: CustomEvent) => log.push(`${type}:${e.detail.value}`));
  });
const log = (page: P) => page.evaluate(() => (window as any).log as string[]);
const value = (page: P, id: string) => bar(page, id).evaluate((el: any) => el.value as string);
/**
 * The product's side for a bar of links: every change and reselect is logged with what it carried, the bar's value and
 * where the page was then, and whether it could be cancelled (`window.cancel` cancels it, as a router does); every click
 * and auxclick that reaches the window from a destination is logged with whether anything prevented it on the way
 * (`window.hold` then holds the browser back, after the bar has heard it, so that the test opens no tab).
 */
const wireLinks = (page: P) =>
  page.evaluate(() => {
    const log: string[] = ((window as any).log = []);
    for (const each of document.querySelectorAll<any>('tanrei-navigation-bar')) {
      for (const type of ['change', 'reselect']) {
        each.addEventListener(type, (e: CustomEvent) => {
          log.push(`${type}:${e.detail.value}:${e.detail.href}:${each.value}:${e.cancelable}`);
          if ((window as any).cancel) e.preventDefault();
        });
      }
    }
    for (const type of ['click', 'auxclick', 'contextmenu']) {
      window.addEventListener(type, (event) => {
        if (!(event.composedPath() as Element[]).some((node) => node.localName === 'tanrei-navigation-bar-item' || (node as HTMLElement).id === 'plain')) return;
        log.push(`${type}:${event.defaultPrevented ? 'prevented' : 'left alone'}`);
        if ((window as any).hold) event.preventDefault();
      });
    }
  });
/** A link destination without a value of its own: its href stands for it (NVB-30). */
const link = (label: string, href: string, icon: string, props: Fixture['props'] = {}) => ({ kind: 'destination', props: { label, href, icon, ...props } });
/** Links to places of the page itself, so that following one is seen (`location.hash`) and nothing is unloaded. */
const PLACES = [link('Home', '#home', 'home'), link('Search', '#search', 'search'), link('Library', '#library', 'video_library'), link('Help', '#help', 'help', { target: 'new', targetLabel: 'opens in a new tab' })];
const cell = (page: P, id: string, n: number) => item(page, id, n).locator('.cell');
/**
 * The Chromium accessibility nodes of the page's navigation landmarks, over the DevTools protocol: what the browser
 * computed — the role, the name, the description and the disabled state of each exposed destination — and, since the
 * protocol's tree carries no current state, `aria-current` as it stands on the very element that node was made from.
 */
async function axDestinations(page: P) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  const byId = new Map(nodes.map((node) => [node.nodeId, node]));
  const landmark = (node: (typeof nodes)[number]) => {
    for (let at = node.parentId ? byId.get(node.parentId) : undefined; at; at = at.parentId ? byId.get(at.parentId) : undefined) if (!at.ignored && at.role?.value === 'navigation') return (at.name?.value ?? '') as string;
    return null;
  };
  const found = [];
  for (const node of nodes) {
    if (node.ignored || !['link', 'button'].includes(node.role?.value as string) || landmark(node) === null) continue;
    const property = (name: string) => node.properties?.find((p) => p.name === name)?.value?.value;
    const attributes = node.backendDOMNodeId === undefined ? [] : ((await cdp.send('DOM.describeNode', { backendNodeId: node.backendDOMNodeId })).node.attributes ?? []);
    const at = attributes.indexOf('aria-current');
    found.push({ in: landmark(node)!.split(' ')[0], role: node.role?.value as string, name: (node.name?.value ?? '') as string, description: (node.description?.value ?? '') as string, current: at >= 0 && at % 2 === 0 ? attributes[at + 1] : '', disabled: property('disabled') === true });
  }
  await cdp.detach();
  return found;
}

/**
 * A one-line text against the box that cuts it: where its first and its last character are laid out, whether it
 * overflows the box (so an ellipsis is drawn), and the box's own direction and `text-overflow`.
 */
const cutEnds = (locator: Locator) =>
  locator.evaluate((el) => {
    const text = document.createTreeWalker(el, NodeFilter.SHOW_TEXT).nextNode() as Text;
    const at = (index: number) => {
      const range = document.createRange();
      range.setStart(text, index);
      range.setEnd(text, index + 1);
      const { left, right } = range.getBoundingClientRect();
      return { left, right };
    };
    const { left, right } = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return { box: { left, right }, first: at(0), last: at(text.length - 1), overflows: el.scrollWidth > el.clientWidth, direction: style.direction, textOverflow: style.textOverflow, dir: el.getAttribute('dir') };
  });
/** A long right-to-left label. */
const ARABIC_LONG = 'في انتظار مراجعة ثانية من فريق إمكانية الوصول';
const moving = (page: P, id: string) => pill(page, id).evaluate((el) => el.classList.contains('moving'));
const centre = (box: { x: number; y: number; width: number; height: number }) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

/**
 * A mouse pressed on destination `n` and dragged along the bar to `x` (a page coordinate), still down: past the slop in
 * small steps, so the bar takes it, and then to where the test wants the pointer. `settle` waits for the catch-up.
 */
async function dragTo(page: P, id: string, n: number, x: number) {
  const from = centre(await bounds(container(page, id, n)));
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  const step = x >= from.x ? 4 : -4;
  for (const d of [1, 2, 3]) await page.mouse.move(from.x + d * step, from.y);
  await page.mouse.move(x, from.y, { steps: 4 });
  await holdSlide(page, id, null, CATCH_UP);
  await page.mouse.move(x, from.y);
  await frames(page);
  return from;
}

/** Every part a destination draws from its condition: NVB-3's list. */
const PARTS = { container: 'container', iconIndicator: 'icon-indicator', icon: 'icon', label: 'label', coveredIcon: 'covered-icon', coveredLabel: 'covered-label' } as const;
const drawn = (page: P, id: string, n: number) =>
  item(page, id, n).evaluate((el) => {
    const root = el.shadowRoot!;
    const color = (selector: string, property: 'color' | 'backgroundColor') => getComputedStyle(root.querySelector(selector)!)[property];
    return {
      container: color('.indicator', 'backgroundColor'),
      iconIndicator: color('.icon-fill', 'backgroundColor'),
      icon: color('.icon', 'color'),
      label: color('.label', 'color'),
      coveredIcon: color('.c-icon', 'color'),
      coveredLabel: color('.c-label', 'color'),
    };
  });
const expected = async (page: P, condition: string, state = '') => {
  const out: Record<string, string> = {};
  for (const [key, part] of Object.entries(PARTS)) out[key] = await resolveColor(page, T(`${condition}-${state ? `${state}-` : ''}item-${part}-color`));
  return out as Record<keyof typeof PARTS, string>;
};

/** The px lengths of a computed or inline `inset(…)`, in order (top, right, bottom, left as written; then the radius). */
const insets = (clip: string) => [...clip.matchAll(/(-?[\d.]+)px/g)].map((m) => Number(m[1]));

/** Where a destination's covered copy is visible across, on the page: its box less the inline clip's left and right insets. */
const coveredSpan = (page: P, id: string, n: number) =>
  item(page, id, n).evaluate((el) => {
    const covered = el.shadowRoot!.querySelector<HTMLElement>('.covered')!;
    const box = covered.getBoundingClientRect();
    const px = [...covered.style.clipPath.matchAll(/(-?[\d.]+)px/g)].map((m) => Number(m[1]));
    const [, right, , left] = px.length >= 4 ? px : [0, 0, 0, 0];
    return { box: { left: box.left, right: box.right }, from: Math.max(box.left, box.left + left), to: Math.min(box.right, box.right - right), inline: covered.style.clipPath };
  });

destinationSuite({
  spec,
  tag: 'tanrei-navigation-bar',
  itemTag: 'tanrei-navigation-bar-item',
  lines: 1,
  range: [3, 5],
  own: ['selection'],
  ids: {
    activate: 'NVB-1',
    disabled: 'NVB-2',
    selectedParts: 'NVB-3',
    states: 'NVB-4',
    focusRing: 'NVB-5',
    disabledLook: 'NVB-7',
    pressHold: 'NVB-8',
    feedback: 'NVB-9',
    cornersAndFocusStyle: 'NVB-10',
    labels: 'NVB-13',
    icon: 'NVB-14',
    selection: 'NVB-15',
    badge: 'NVB-16',
    count: 'NVB-17',
    semantics: 'NVB-19',
    emptyLabel: 'NVB-20',
    duplicate: 'NVB-22',
  },
});

test.describe('the bar', () => {
  test('NVB-6: each hit area is its whole cell — the bar’s full height and an equal share of its width, the first and the last reaching the bar’s ends — never below sys.target.touch either way; hover anywhere in it answers on the item container', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [four('four'), { id: 'crowded', props: { value: 'd0', label: 'Main' }, items: Array.from({ length: 9 }, (_, i) => destination(`d${i}`, `D${i}`, 'star')) }] });
    const [touch, pad] = await Promise.all(['--tanrei-sys-target-touch', T('container-padding')].map((n) => resolveToken(page, n)));
    expect(pad).toBeGreaterThan(0);
    const own = await bounds(bar(page, 'four'));
    for (const n of [0, 1, 2, 3]) {
      const cell = await bounds(item(page, 'four', n).locator('.cell'));
      expect([cell.y, cell.height]).toEqual([own.y, own.height]);
      expect(cell.width).toBeCloseTo((own.width - 2 * pad) / 4, 1);
      // A press at the cell's corner is the destination's.
      const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('tanrei-navigation-bar-item')?.getAttribute('value') ?? null, [cell.x + 1, cell.y + 1]);
      expect(hit).toBe(['inbox', 'sent', 'starred', 'settings'][n]);
    }
    // The first and the last reach the bar's two edges, across the space the item containers are held in by.
    const hitAt = (x: number, y: number) => page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.closest('tanrei-navigation-bar-item')?.getAttribute('value') ?? null, [x, y]);
    expect(await hitAt(own.x + 0.5, own.y + own.height / 2)).toBe('inbox');
    expect(await hitAt(own.x + own.width - 0.5, own.y + own.height - 1)).toBe('settings');
    // Hover on the cell outside the item container answers on the item container.
    await page.mouse.move(own.x + own.width - 1, own.y + own.height - 1);
    await expect.poll(() => css(item(page, 'four', 3).locator('.indicator'), 'background-color')).toBe(await resolveColor(page, T('unselected-hovered-item-container-color')));
    await page.mouse.move(0, 0);
    // Four in 360: each at least the touch target wide.
    expect((await bounds(item(page, 'four', 0).locator('.cell'))).width).toBeGreaterThanOrEqual(touch);
    // Nine in 360: an equal share, below the target, and the bar no wider than its space.
    const crowded = await bounds(bar(page, 'crowded'));
    expect(crowded.width).toBeCloseTo(360, 0);
    for (const n of [0, 8]) expect((await bounds(item(page, 'crowded', n).locator('.cell'))).width).toBeCloseTo((360 - 2 * pad) / 9, 0);
    await override(page, { [T('container-height')]: '20px' });
    expect((await bounds(item(page, 'four', 0).locator('.cell'))).height).toBeGreaterThanOrEqual(touch);
  });

  test('NVB-6: a bar 200 wide with five destinations keeps the equal share — cells below the target — and stays within its space', async ({ page }) => {
    const five = { id: 'five', props: { value: 'd0', label: 'Main' }, items: Array.from({ length: 5 }, (_, i) => destination(`d${i}`, `Destination ${i}`, 'star')) };
    await mountFixtures(page, spec, { icons: true, fixtures: [five] });
    await page.addStyleTag({ content: '.stage:has(> tanrei-navigation-bar) { inline-size: 200px !important; }' });
    const [touch, pad] = await Promise.all(['--tanrei-sys-target-touch', T('container-padding')].map((n) => resolveToken(page, n)));
    const stage = await bounds(page.locator('[data-fixture="five"]'));
    const own = await bounds(bar(page, 'five'));
    expect(stage.width).toBeCloseTo(200, 0);
    expect([own.x, own.width]).toEqual([expect.closeTo(stage.x, 0), expect.closeTo(200, 0)]);
    expect(await bar(page, 'five').evaluate((b) => b.scrollWidth <= b.clientWidth)).toBe(true);
    let end = own.x + pad;
    for (let n = 0; n < 5; n++) {
      const cell = await bounds(item(page, 'five', n).locator('.cell'));
      expect(cell.width).toBeCloseTo((200 - 2 * pad) / 5, 0);
      expect(cell.width).toBeLessThan(touch);
      expect(cell.x).toBeCloseTo(end, 0);
      end = cell.x + cell.width;
      // The item container is its cell, however narrow.
      const box = await bounds(container(page, 'five', n));
      expect([box.x, box.width]).toEqual([expect.closeTo(cell.x, 1), expect.closeTo(cell.width, 1)]);
    }
    expect(end).toBeCloseTo(own.x + own.width - pad, 0);
    // Still the bar's full height, at least the target tall.
    expect((await bounds(item(page, 'five', 0).locator('.cell'))).height).toBeGreaterThanOrEqual(touch);
  });

  test('NVB-11: the parent’s full width, at least container.height, on container.color with its elevation and a top edge; its width less container.padding at each end in equal cells in reading order, mirrored in right-to-left; the container is the same whichever destination is selected or hovered and while the indicator moves; under m3-like (no padding) the cells are 90', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [four('four')] });
    const [height, edge, pad] = await Promise.all([T('container-height'), T('outline-width'), T('container-padding')].map((n) => resolveToken(page, n)));
    const own = await bounds(bar(page, 'four'));
    const stage = await bounds(page.locator('[data-fixture="four"]'));
    expect([own.x, own.width]).toEqual([stage.x, stage.width]);
    expect(own.height).toBeGreaterThanOrEqual(height);
    const barBox = bar(page, 'four').locator('.bar');
    const ground = await resolveColor(page, T('container-color'));
    expect(await css(barBox, 'background-color')).toBe(ground);
    expect(await css(barBox, 'box-shadow')).toBe(await page.evaluate((n) => {
      const p = document.createElement('div');
      p.style.boxShadow = `var(${n})`;
      document.body.appendChild(p);
      const v = getComputedStyle(p).boxShadow;
      p.remove();
      return v;
    }, T('container-elevation')));
    const outline = await bounds(bar(page, 'four').locator('.outline'));
    expect([outline.x, outline.y, outline.width, outline.height]).toEqual([own.x, own.y, own.width, edge]);
    expect(await css(bar(page, 'four').locator('.outline'), 'background-color')).toBe(await resolveColor(page, T('outline-color')));
    // The verify: 360 wide, four destinations, cells 88 wide, the first 4 from the start edge.
    expect([own.width, pad]).toEqual([360, 4]);
    const cells = async () => Promise.all([0, 1, 2, 3].map(async (n) => bounds(item(page, 'four', n))));
    const ltr = await cells();
    expect(ltr.map((c) => c.width)).toEqual([88, 88, 88, 88]);
    expect(ltr.map((c) => c.x - own.x)).toEqual([4, 92, 180, 268]);
    // The ground does not change with the selection, a state, or the indicator on its way.
    await override(page, { [T('motion-selection-duration')]: '2000ms' });
    await item(page, 'four', 2).locator('.cell').hover();
    expect(await css(barBox, 'background-color')).toBe(ground);
    expect(await selectHeld(page, 'four', 'settings')).toBe(true);
    await holdSlide(page, 'four', 1000);
    await frames(page);
    expect(await css(barBox, 'background-color')).toBe(ground);
    await holdSlide(page, 'four', null);
    expect(await css(barBox, 'background-color')).toBe(ground);
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    const [rtl, mirrored] = [await cells(), await bounds(bar(page, 'four'))];
    expect(rtl.map((c) => mirrored.x + mirrored.width - (c.x + c.width))).toEqual([4, 92, 180, 268]);
    // m3-like holds nothing in from the bar's edges: its cells share the whole width, as before.
    await mountFixtures(page, spec, { icons: true, fixtures: [four('four')], system: 'm3-like' });
    expect(await resolveToken(page, T('container-padding'))).toBe(0);
    expect((await cells()).map((c) => c.width)).toEqual([90, 90, 90, 90]);
  });

  test('NVB-18: the color reaches under the bottom and side insets, the destinations stay inside them (env(safe-area-inset-*))', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [four('four')] });
    const sheet = await bar(page, 'four').evaluate((el) => (el.constructor as any).styles.cssText as string);
    for (const side of ['bottom', 'left', 'right']) expect(sheet).toContain(`env(safe-area-inset-${side}, 0px)`);
    const before = await bounds(bar(page, 'four'));
    await bar(page, 'four').evaluate((el) => el.setAttribute('style', '--_inset-bottom: 34px; --_inset-left: 12px; --_inset-right: 20px'));
    const own = await bounds(bar(page, 'four'));
    const list = await bounds(bar(page, 'four').locator('.destinations'));
    expect(own.height).toBe(before.height + 34);
    expect(own.y + own.height - (list.y + list.height)).toBe(34);
    expect([list.x - own.x, own.x + own.width - (list.x + list.width)]).toEqual([12, 20]);
    const barBox = await bounds(bar(page, 'four').locator('.bar'));
    expect([barBox.y, barBox.height]).toEqual([own.y, own.height]);
  });

  test('NVB-21: enlarged text grows the bar and every item container with it alike, to hold the labels on one line inside them, and does not scale the icon indicators or icons', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [four('four')] });
    const measure = async () => ({
      bar: await bounds(bar(page, 'four')),
      containers: await Promise.all([0, 1, 2, 3].map((n) => bounds(container(page, 'four', n)))),
      indicator: await rect(item(page, 'four', 0).locator('.icon-indicator')),
      icon: await rect(item(page, 'four', 0).locator('.icon')),
    });
    const before = await measure();
    await override(page, { '--tanrei-dial-type-base': '40px' });
    const after = await measure();
    const [pad, block] = await Promise.all([T('container-padding'), T('item-container-padding-block')].map((n) => resolveToken(page, n)));
    expect(after.bar.height).toBeGreaterThan(before.bar.height);
    for (const c of after.containers) expect([c.height, c.y]).toEqual([expect.closeTo(after.bar.height - 2 * pad, 1), expect.closeTo(after.bar.y + pad, 1)]);
    expect(after.containers[0].height).toBeGreaterThan(before.containers[0].height);
    expect([after.indicator.width, after.indicator.height]).toEqual([before.indicator.width, before.indicator.height]);
    expect([after.icon.width, after.icon.height]).toEqual([before.icon.width, before.icon.height]);
    for (const n of [0, 1, 2, 3]) {
      const label = item(page, 'four', n).locator('.label');
      const lines = await label.evaluate((el) => Math.round(el.getBoundingClientRect().height / Number.parseFloat(getComputedStyle(el).lineHeight)));
      expect(lines).toBe(1);
      const [l, box] = [await rect(label), after.containers[n]];
      expect(l.y + l.height).toBeLessThanOrEqual(box.y + box.height - block + 0.5);
    }
  });
});

test.describe('the variant and the conditions', () => {
  test('NVB-3: variant chooses the conditions — tonal (the default) draws from unselected and selected, filled from filled-unselected and filled-selected — for every part: item container, icon indicator, icon, label, covered icon and label', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [four('tonal'), four('filled', { variant: 'filled' })] });
    await page.mouse.move(0, 0);
    // Reflected, tonal by default.
    await expect(bar(page, 'tonal')).toHaveAttribute('variant', 'tonal');
    await expect(bar(page, 'filled')).toHaveAttribute('variant', 'filled');
    for (const [id, variant] of [
      ['tonal', ''],
      ['filled', 'filled-'],
    ] as const) {
      await expect.poll(() => drawn(page, id, 0), `${id} selected`).toEqual(await expected(page, `${variant}selected`));
      for (const n of [1, 2, 3]) expect(await drawn(page, id, n), `${id} ${n}`).toEqual(await expected(page, `${variant}unselected`));
    }
    // The filled indicator is the strong color, its content inverted on it.
    expect((await drawn(page, 'filled', 0)).container).not.toBe((await drawn(page, 'tonal', 0)).container);
    expect((await drawn(page, 'filled', 0)).coveredIcon).toBe(await resolveColor(page, T('filled-selected-item-covered-icon-color')));
    // The property follows the attribute; anything else is tonal.
    await bar(page, 'filled').evaluate((el: any) => (el.variant = 'loud'));
    await expect.poll(() => drawn(page, 'filled', 0)).toEqual(await expected(page, 'selected'));
    await bar(page, 'tonal').evaluate((el) => el.setAttribute('variant', 'filled'));
    await expect.poll(() => drawn(page, 'tonal', 0)).toEqual(await expected(page, 'filled-selected'));
  });

  test('NVB-3: a filled bar is exposed exactly as a tonal one — the variant changes how strongly the selection is drawn, not what is announced', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('four-destinations', 'filled') });
    // Each fixture's landmark is named after its fixture as well (the harness: one landmark of a name per page).
    const tree = (id: string) => `
      - navigation "Main (${id})":
        - list:
          - listitem:
            - button "Inbox"
          - listitem:
            - button "Sent"
          - listitem:
            - button "Starred"
          - listitem:
            - button "Settings"
    `;
    await expect(page.locator('[data-fixture="four-destinations"]')).toMatchAriaSnapshot(tree('four-destinations'));
    await expect(page.locator('[data-fixture="filled"]')).toMatchAriaSnapshot(tree('filled'));
  });

  test('NVB-4: the icon indicator and the covered icon and label follow the state too, from its tokens of the destination’s condition, pressed over focused over hovered', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('four-destinations') });
    const colors: Record<string, string> = {};
    for (const [state, n] of [
      ['hovered', 1],
      ['focused', 2],
      ['pressed', 3],
    ] as const) {
      colors[`${T(`unselected-${state}-item-icon-indicator-color`)}`] = `rgb(${n}, 0, 0)`;
      colors[`${T(`unselected-${state}-item-covered-icon-color`)}`] = `rgb(0, ${n}, 0)`;
      colors[`${T(`unselected-${state}-item-covered-label-color`)}`] = `rgb(0, 0, ${n})`;
    }
    await override(page, colors);
    const look = async (n: number) => {
      const { iconIndicator, coveredIcon, coveredLabel } = await drawn(page, 'four-destinations', n);
      return [iconIndicator, coveredIcon, coveredLabel];
    };
    await page.mouse.move(0, 0);
    await item(page, 'four-destinations', 1).locator('.cell').hover();
    await expect.poll(() => look(1)).toEqual(['rgb(1, 0, 0)', 'rgb(0, 1, 0)', 'rgb(0, 0, 1)']);
    await page.mouse.down();
    await expect.poll(() => look(1)).toEqual(['rgb(3, 0, 0)', 'rgb(0, 3, 0)', 'rgb(0, 0, 3)']);
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('four-destinations') });
    await override(page, colors);
    await page.mouse.click(1, 1); // the page, not the browser, has the keyboard (WebKit)
    await tabTo(page, item(page, 'four-destinations', 2).locator('.cell'));
    await expect.poll(() => look(2)).toEqual(['rgb(2, 0, 0)', 'rgb(0, 2, 0)', 'rgb(0, 0, 2)']);
  });

  test('NVB-7: a disabled destination draws every part from its condition’s disabled tokens; a selected one keeps the tonal indicator, and the filled indicator fades as a fill', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('disabled', 'selected-disabled', 'filled-selected-disabled') });
    await page.mouse.move(0, 0);
    await expect.poll(() => drawn(page, 'disabled', 2)).toEqual(await expected(page, 'unselected', 'disabled'));
    await expect.poll(() => drawn(page, 'selected-disabled', 2)).toEqual(await expected(page, 'selected', 'disabled'));
    await expect.poll(() => drawn(page, 'filled-selected-disabled', 2)).toEqual(await expected(page, 'filled-selected', 'disabled'));
    // Tonal keeps secondary-container with disabled content on it; the disabled filled indicator is not the resting primary.
    expect((await drawn(page, 'selected-disabled', 2)).container).toBe(await resolveColor(page, T('selected-item-container-color')));
    expect((await drawn(page, 'filled-selected-disabled', 2)).container).not.toBe(await resolveColor(page, T('filled-selected-item-container-color')));
    // The icon indicator is a fill or nothing: transparent stays transparent when disabled.
    expect((await drawn(page, 'disabled', 2)).iconIndicator).toBe(await resolveColor(page, T('unselected-item-icon-indicator-color')));
  });
});

test.describe('the item container', () => {
  test('NVB-12: every item container is its whole cell less container.padding above and below — 88 by 56 for four destinations in a 360 bar, a capsule, the same whatever it holds — with the column centred in it: the icon indicator (its size and corners, the icon centred in it), the label item.gap below; hover and press show that capsule, never a shape around the icon and label alone', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('four-destinations', 'badges', 'labels-never') });
    const [pad, block, gap, indicatorWidth, indicatorHeight, indicatorRadius, barHeight] = await Promise.all(
      ['container-padding', 'item-container-padding-block', 'item-gap', 'item-icon-indicator-width', 'item-icon-indicator-height', 'item-icon-indicator-shape', 'container-height'].map((n) => resolveToken(page, T(n))),
    );
    expect([pad, barHeight]).toEqual([4, 64]);
    for (const id of ['four-destinations', 'badges', 'labels-never']) {
      const own = await bounds(bar(page, id));
      expect(own.height, id).toBe(64);
      for (const n of [0, 1, 2, 3]) {
        const at = (selector: string) => rect(item(page, id, n).locator(selector));
        const [c, cell] = [await at('.cell > .container'), await at('.cell')];
        // The same box for every destination: the cell across, the bar less the inset above and below.
        expect([c.width, c.height], `${id}/${n}`).toEqual([88, 56]);
        expect([c.x, c.y], `${id}/${n}`).toEqual([cell.x, own.y + pad]);
        // A capsule: corners of half its height.
        expect(Number.parseFloat(await css(container(page, id, n), 'border-top-left-radius')), `${id}/${n}`).toBeGreaterThanOrEqual(c.height / 2);
        // The state layer and the active indicator are that box.
        const fill = await at('.cell > .container > .indicator');
        expect([fill.x, fill.y, fill.width, fill.height], `${id}/${n}`).toEqual([c.x, c.y, c.width, c.height]);
      }
    }
    for (const n of [0, 1, 2, 3]) {
      const at = (selector: string) => rect(item(page, 'four-destinations', n).locator(selector));
      const [c, indicator, icon, label] = [await at('.cell > .container'), await at('.icon-indicator'), await at('.icon'), await at('.label')];
      expect([indicator.width, indicator.height], `${n} icon indicator`).toEqual([indicatorWidth, indicatorHeight]);
      expect(Number.parseFloat(await css(item(page, 'four-destinations', n).locator('.icon-indicator'), 'border-top-left-radius'))).toBeCloseTo(indicatorRadius, 1);
      expect(icon.x + icon.width / 2).toBeCloseTo(indicator.x + indicator.width / 2, 0);
      expect(icon.y + icon.height / 2).toBeCloseTo(indicator.y + indicator.height / 2, 0);
      expect(label.y - (indicator.y + indicator.height), `${n} gap`).toBeCloseTo(gap, 0);
      // The column is centred in the item container, and keeps padding-block from its top and bottom.
      expect(label.x + label.width / 2).toBeCloseTo(c.x + c.width / 2, 0);
      expect(indicator.x + indicator.width / 2).toBeCloseTo(c.x + c.width / 2, 0);
      expect((indicator.y + label.y + label.height) / 2, `${n} centred`).toBeCloseTo(c.y + c.height / 2, 0);
      expect(indicator.y - c.y).toBeGreaterThanOrEqual(block - 0.5);
      expect(c.y + c.height - (label.y + label.height)).toBeGreaterThanOrEqual(block - 0.5);
    }
    // A transparent part keeps its layout: the default system's icon indicator draws nothing and still has its box.
    expect(clear(await css(item(page, 'four-destinations', 0).locator('.icon-fill'), 'background-color'))).toBe(true);
    // Hover and press on one that is not selected paint the capsule, and nothing outside the item container answers.
    const fill = item(page, 'four-destinations', 2).locator('.indicator');
    await item(page, 'four-destinations', 2).locator('.cell').hover();
    await expect.poll(() => css(fill, 'background-color')).toBe(await resolveColor(page, T('unselected-hovered-item-container-color')));
    expect(clear(await resolveColor(page, T('unselected-hovered-item-container-color')))).toBe(false);
    await page.mouse.down();
    await expect.poll(() => css(fill, 'background-color')).toBe(await resolveColor(page, T('unselected-pressed-item-container-color')));
    await page.mouse.up();
    const painted = await item(page, 'four-destinations', 2).evaluate((el) =>
      [...el.shadowRoot!.querySelectorAll<HTMLElement>('.cell, .content, .label-box, .icon-indicator, .plain')].map((part) => getComputedStyle(part).backgroundColor),
    );
    expect(painted.filter((color) => !clear(color))).toEqual([]);
  });

  test('NVB-12: under m3-like the item container is the whole cell and transparent, and hover, focus and press show on the icon indicator, as before', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('four-destinations'), system: 'm3-like' });
    const [c, cell, own] = [await bounds(container(page, 'four-destinations', 1)), await bounds(item(page, 'four-destinations', 1).locator('.cell')), await bounds(bar(page, 'four-destinations'))];
    expect([c.x, c.y, c.width, c.height]).toEqual([cell.x, own.y, 90, own.height]);
    await item(page, 'four-destinations', 1).locator('.cell').hover();
    await expect.poll(() => css(item(page, 'four-destinations', 1).locator('.icon-fill'), 'background-color')).toBe(await resolveColor(page, T('unselected-hovered-item-icon-indicator-color')));
    expect(clear(await resolveColor(page, T('unselected-hovered-item-icon-indicator-color')))).toBe(false);
    expect(clear(await css(item(page, 'four-destinations', 1).locator('.indicator'), 'background-color'))).toBe(true);
  });

  test('NVB-12: in long-labels the five item containers are equal, a label wider than its item container less padding-inline on each side is cut at its end with an ellipsis, and the whole label stays the name', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('long-labels') });
    const inline = await resolveToken(page, T('item-container-padding-inline'));
    const boxes = await Promise.all([0, 1, 2, 3, 4].map((n) => bounds(container(page, 'long-labels', n))));
    for (const box of boxes) expect([box.width, box.height]).toEqual([expect.closeTo(boxes[0].width, 1), boxes[0].height]);
    let cut = 0;
    for (const n of [0, 1, 2, 3, 4]) {
      const [c, cell, label] = [boxes[n], await bounds(item(page, 'long-labels', n).locator('.cell')), await rect(item(page, 'long-labels', n).locator('.label'))];
      expect([c.x, c.width]).toEqual([expect.closeTo(cell.x, 1), expect.closeTo(cell.width, 1)]);
      expect(label.x).toBeGreaterThanOrEqual(c.x + inline - 0.5);
      expect(label.x + label.width).toBeLessThanOrEqual(c.x + c.width - inline + 0.5);
      const over = await item(page, 'long-labels', n)
        .locator('.label')
        .evaluate((el) => ({ over: el.scrollWidth > el.clientWidth, style: getComputedStyle(el).textOverflow, space: getComputedStyle(el).whiteSpace }));
      expect(over.style).toBe('ellipsis');
      expect(over.space).toBe('nowrap');
      if (over.over) cut++;
    }
    // "Notifications" and "Subscriptions" do not fit a fifth of the bar.
    expect(cut).toBeGreaterThanOrEqual(2);
    for (const name of ['Notifications', 'Subscriptions']) await expect(bar(page, 'long-labels').getByRole('button', { name, exact: true })).toHaveCount(1);
  });

  test('NVB-13: a destination that draws no label centres its icon indicator in its item container, whose size does not change with the label', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('four-destinations', 'labels-never', 'labels-selected') });
    const full = await bounds(container(page, 'four-destinations', 0));
    for (const [id, n, labelled] of [
      ['labels-never', 0, false],
      ['labels-never', 3, false],
      ['labels-selected', 0, false],
      ['labels-selected', 2, false],
      ['labels-selected', 1, true],
    ] as const) {
      const c = await bounds(container(page, id, n));
      expect([c.width, c.height], `${id}/${n}`).toEqual([full.width, full.height]);
      const indicator = await rect(item(page, id, n).locator('.icon-indicator'));
      if (labelled) expect(indicator.y + indicator.height / 2, `${id}/${n}`).toBeLessThan(c.y + c.height / 2 - 1);
      else await expect.poll(async () => { const i = await rect(item(page, id, n).locator('.icon-indicator')); return Math.round(i.y + i.height / 2); }, `${id}/${n}`).toBe(Math.round(c.y + c.height / 2));
    }
    // Selecting another destination under labelVisibility selected resizes and moves no item container.
    const before = await Promise.all([0, 1, 2, 3].map((n) => bounds(container(page, 'labels-selected', n))));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await bar(page, 'labels-selected').evaluate((el: any) => (el.value = 'settings'));
    await frames(page);
    expect(await Promise.all([0, 1, 2, 3].map((n) => bounds(container(page, 'labels-selected', n))))).toEqual(before);
  });
});

test.describe('focus', () => {
  test('NVB-5: keyboard focus shows the ring around the item container, concentric and in its shape, sys.focus.offset outside it and held inside the bar — it reaches container.padding beyond the capsule and meets the bar’s edge without crossing it — drawn above the neighbours; pointer focus does not show it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('four-destinations') });
    const [outer, offset, inner, pad] = await Promise.all(['--tanrei-sys-focus-outer-width', '--tanrei-sys-focus-offset', '--tanrei-sys-focus-inner-width', T('container-padding')].map((n) => resolveToken(page, n)));
    // The verify: an offset of 2 and a ring 2 wide reach 4, which is the bar's inset.
    expect(offset + inner + outer).toBe(pad);
    await item(page, 'four-destinations', 1).locator('.cell').click();
    await expect(container(page, 'four-destinations', 1)).toHaveCSS('outline-style', 'none');
    for (const n of [0, 3]) {
      await tabTo(page, item(page, 'four-destinations', n).locator('.cell'));
      const c = container(page, 'four-destinations', n);
      await expect(c).toHaveCSS('outline-style', 'solid');
      await expect(c).toHaveCSS('outline-width', `${outer}px`);
      await expect(c).toHaveCSS('outline-offset', `${offset + inner}px`);
      expect(await css(c, 'transition-property')).not.toContain('outline');
      // Concentric and in the capsule's shape: the same corners, further out.
      expect(Number.parseFloat(await css(c, 'border-top-left-radius'))).toBeGreaterThanOrEqual((await bounds(c)).height / 2);
      // Its outer edge is the bar's edge, on every side it has one: never beyond it.
      const [box, own] = [await bounds(c), await bounds(bar(page, 'four-destinations'))];
      const reach = offset + inner + outer;
      expect(box.y - reach).toBeGreaterThanOrEqual(own.y);
      expect(box.y + box.height + reach).toBeLessThanOrEqual(own.y + own.height);
      expect(box.x - reach).toBeGreaterThanOrEqual(own.x);
      expect(box.x + box.width + reach).toBeLessThanOrEqual(own.x + own.width);
      // Above the neighbouring destinations.
      expect(await css(item(page, 'four-destinations', n), 'z-index')).toBe('1');
    }
  });

  test('NVB-5: where the bar leaves less room than the indicator reaches it is drawn further in by the difference — under m3-like, whose container.padding is nothing, wholly inside the cell', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('four-destinations'), system: 'm3-like' });
    const [outer, offset, inner, pad] = await Promise.all(['--tanrei-sys-focus-outer-width', '--tanrei-sys-focus-offset', '--tanrei-sys-focus-inner-width', T('container-padding')].map((n) => resolveToken(page, n)));
    expect(pad).toBe(0);
    await page.mouse.click(1, 1);
    await tabTo(page, item(page, 'four-destinations', 1).locator('.cell'));
    const c = container(page, 'four-destinations', 1);
    await expect(c).toHaveCSS('outline-style', 'solid');
    // The outline's outer edge is the item container's own edge: its offset is minus its width.
    await expect(c).toHaveCSS('outline-offset', `${-outer}px`);
    expect(offset + inner + outer).toBeGreaterThan(0);
    // Half-way: room for half of it pulls it in by the other half.
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('four-destinations') });
    await override(page, { [T('container-padding')]: '1px' });
    await page.mouse.click(1, 1);
    await tabTo(page, item(page, 'four-destinations', 2).locator('.cell'));
    const [o, f, i] = await Promise.all(['--tanrei-sys-focus-outer-width', '--tanrei-sys-focus-offset', '--tanrei-sys-focus-inner-width'].map((n) => resolveToken(page, n)));
    await expect(container(page, 'four-destinations', 2)).toHaveCSS('outline-offset', `${1 - o}px`);
    expect(f + i + o).toBeGreaterThan(1);
  });
});

test.describe('the active indicator', () => {
  test('NVB-15: a new selection slides the active indicator from the previous item container to the new one over the selection motion, at its full size in every frame, in the new destination’s colors, and grows the new icon indicator from its centre', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('four-destinations', 'labels-selected') });
    expect(await resolveToken(page, T('motion-selection-duration'), 'duration')).toBeGreaterThan(0);
    await override(page, { [T('motion-selection-duration')]: '2000ms' });
    const [from, to] = [await bounds(container(page, 'four-destinations', 0)), await bounds(container(page, 'four-destinations', 2))];
    // First draw: at once, the bar's layer not drawn.
    expect(await pill(page, 'four-destinations').evaluate((el) => el.getAnimations().length)).toBe(0);
    const [iconFrom, iconTo] = [await resolveColor(page, T('unselected-item-icon-color')), await resolveColor(page, T('selected-item-icon-color'))];
    // What the selection motion's tokens are to a transition, as the engine writes them.
    const selection = await page.evaluate(
      ([duration, easing]) => {
        const probe = document.body.appendChild(document.createElement('div'));
        probe.style.transition = `color var(${duration}) var(${easing})`;
        const style = getComputedStyle(probe);
        const timing = [style.transitionDuration, style.transitionTimingFunction];
        probe.remove();
        return timing;
      },
      [T('motion-selection-duration'), T('motion-selection-easing')] as const,
    );
    // What the new selection starts is read in the task that starts it, and the slide is held there: nothing below
    // depends on how long an answer takes (CI read the end color of the 2 s recolor "400 ms" in — five round trips of
    // WebKit on Linux and the wait were 1.7 s).
    const seen = await bar(page, 'four-destinations').evaluate(async (el: any, name) => {
      el.value = 'starred';
      await el.updateComplete;
      const items = [...el.querySelectorAll('tanrei-navigation-bar-item')] as any[];
      await Promise.all(items.map((each) => each.updateComplete));
      const layer = el.shadowRoot.querySelector('.pill') as HTMLElement;
      const a = layer.getAnimations().find((each) => each.id === name);
      a?.pause();
      const slide = a ? { duration: a.effect!.getTiming().duration, moving: layer.classList.contains('moving') } : null;
      const g = (items[2].shadowRoot.querySelector('.icon-fill') as HTMLElement).getAnimations().find((each) => each.id === 'tanrei-destination-grow');
      const grow = g ? { duration: g.effect!.getTiming().duration, frames: (g.effect as KeyframeEffect).getKeyframes().map((k) => k.insetInline) } : null;
      // The new icon's recolor: the one transition of its color, with the timing its style gives color at this moment,
      // and what it draws at the start, 400 ms in and at the end of its own timeline (paused, set, read, put back).
      const icon = items[2].shadowRoot.querySelector('.icon') as HTMLElement;
      const all = icon.getAnimations();
      const running = all.filter((each) => (each as CSSTransition).transitionProperty === 'color');
      const style = getComputedStyle(icon);
      const listed = (value: string) => value.split(/,\s*(?![^(]*\))/).map((each) => each.trim());
      const at = Math.max(listed(style.transitionProperty).indexOf('color'), 0);
      const pick = (values: string[]) => values[at % values.length];
      const timing = [pick(listed(style.transitionDuration)), pick(listed(style.transitionTimingFunction))];
      const was = all.map((each) => each.currentTime);
      const drawn = (time: number) => {
        for (const each of all) {
          each.pause();
          each.currentTime = time;
        }
        return getComputedStyle(icon).color;
      };
      const duration = running.length === 1 ? Math.round(Number(running[0].effect!.getTiming().duration)) : null;
      const colors = running.length === 1 ? [drawn(0), drawn(400), drawn(duration!)] : [];
      all.forEach((each, i) => {
        each.currentTime = was[i] ?? 0;
        each.play();
      });
      return { slide, grow, recolor: { found: running.length, duration, timing, colors } };
    }, SLIDE);
    expect(seen.slide).toEqual({ duration: 2000, moving: true });
    // The icon indicator grows in width from its centre at full height.
    expect(seen.grow).toEqual({ duration: 2000, frames: ['50%', '0px'] });
    // The icon and label recolor over the selection motion, not the state motion: one transition of the color with the
    // selection motion's duration and easing, from the unselected color to the selected one, and 400 ms in — the state
    // motion long over — still on its way, between the two.
    expect(await resolveToken(page, T('motion-state-duration'), 'duration')).toBeLessThan(400);
    expect(seen.recolor).toMatchObject({ found: 1, duration: 2000, timing: selection });
    // A color as numbers, however the engine writes one that is on its way (`rgb(75, 75, 75)`, `color(srgb 0.29 0.29 0.29)`).
    const channels = (color: string) => {
      const numbers = (color.match(/-?[\d.]+(?:e-?\d+)?/g) ?? []).slice(0, 3).map(Number);
      return color.startsWith('color(') ? numbers.map((n) => n * 255) : numbers;
    };
    const [ends, [start, early, end]] = [[channels(iconFrom), channels(iconTo)], seen.recolor.colors.map(channels)];
    const most = [0, 1, 2].reduce((best, c) => (Math.abs(ends[1][c] - ends[0][c]) > Math.abs(ends[1][best] - ends[0][best]) ? c : best), 0);
    expect(Math.abs(ends[1][most] - ends[0][most])).toBeGreaterThan(8);
    for (const c of [0, 1, 2]) {
      expect(start[c], `the start, channel ${c}`).toBeCloseTo(ends[0][c], 0);
      expect(end[c], `the end, channel ${c}`).toBeCloseTo(ends[1][c], 0);
    }
    expect([iconFrom, iconTo]).not.toContain(seen.recolor.colors[1]);
    expect(Math.min(Math.abs(early[most] - ends[0][most]), Math.abs(early[most] - ends[1][most])), `400 ms in: ${seen.recolor.colors[1]} between ${iconFrom} and ${iconTo}`).toBeGreaterThan(1);
    expect(Math.abs(early[most] - ends[0][most]) + Math.abs(early[most] - ends[1][most])).toBeCloseTo(Math.abs(ends[1][most] - ends[0][most]), 0);
    // No frame shows an indicator narrower or lower than an item container: it only changes place.
    for (const time of [0, 200, 700, 1000, 1500, 1999]) {
      await holdSlide(page, 'four-destinations', time);
      await frames(page);
      const box = await bounds(pill(page, 'four-destinations'));
      expect([box.width, box.height, box.y], `at ${time}`).toEqual([expect.closeTo(from.width, 1), from.height, from.y]);
      expect(await css(pill(page, 'four-destinations'), 'opacity'), `at ${time}`).toBe('1');
    }
    // Half-way: between the two item containers, in the selected condition's color; the new destination's own fill is
    // not drawn, so the indicator is painted once.
    await holdSlide(page, 'four-destinations', 1000);
    await frames(page);
    const mid = await bounds(pill(page, 'four-destinations'));
    expect(mid.x).toBeGreaterThan(from.x + 1);
    expect(mid.x).toBeLessThan(to.x - 1);
    expect(await css(pill(page, 'four-destinations'), 'background-color')).toBe(await resolveColor(page, T('selected-item-container-color')));
    expect(await css(item(page, 'four-destinations', 2).locator('.indicator'), 'visibility')).toBe('hidden');
    // Landed: the bar's layer is gone, the new item container is the indicator, nothing is clipped by hand.
    await holdSlide(page, 'four-destinations', null);
    await expect.poll(() => moving(page, 'four-destinations')).toBe(false);
    expect(await css(item(page, 'four-destinations', 2).locator('.indicator'), 'visibility')).toBe('visible');
    await expect.poll(() => css(item(page, 'four-destinations', 2).locator('.indicator'), 'background-color')).toBe(await resolveColor(page, T('selected-item-container-color')));
    expect(await css(item(page, 'four-destinations', 0).locator('.indicator'), 'background-color')).toBe(await resolveColor(page, T('unselected-item-container-color')));
    // Labels shown only for the selected destination appear and disappear over the same motion.
    expect(await css(item(page, 'labels-selected', 0).locator('.label-box'), 'transition-duration')).toContain('2s');
  });

  test('NVB-15, NVB-23: in a bar an ancestor scales (a surface growing in around it) a sliding indicator is still an item container’s size and on its way between the two, and every covered copy is clipped to it — what is measured on the page is written in the bar’s own pixels', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('four-destinations') });
    await override(page, { [T('motion-selection-duration')]: '2000ms' });
    for (const scale of [1, 0.8, 1.25]) {
      await bar(page, 'four-destinations').evaluate((el: any, s) => {
        el.value = 'inbox';
        const stage = el.closest('.stage') as HTMLElement;
        stage.style.transformOrigin = '0 0';
        stage.style.transform = s === 1 ? '' : `scale(${s})`;
      }, scale);
      await holdSlide(page, 'four-destinations', null);
      await expect.poll(() => moving(page, 'four-destinations')).toBe(false);
      const [from, to] = [await rect(container(page, 'four-destinations', 0)), await rect(container(page, 'four-destinations', 2))];
      expect(await selectHeld(page, 'four-destinations', 'starred'), `a slide, scale ${scale}`).toBe(true);
      for (const [time, p] of [[0, 0], [1999, 1]] as const) {
        await holdSlide(page, 'four-destinations', time);
        await frames(page);
        const box = await rect(pill(page, 'four-destinations'));
        const want = from.x + (to.x - from.x) * p;
        expect(Math.abs(box.x - want), `x at ${time}, scale ${scale}`).toBeLessThan(1);
        expect(Math.abs(box.y - from.y), `y at ${time}, scale ${scale}`).toBeLessThan(0.5);
        expect(Math.abs(box.width - from.width), `width at ${time}, scale ${scale}`).toBeLessThan(1);
        expect(Math.abs(box.height - from.height), `height at ${time}, scale ${scale}`).toBeLessThan(0.5);
        // The covered copy of the destination the indicator is on is clipped to the indicator, as it is drawn on the page.
        const clip = await item(page, 'four-destinations', p ? 2 : 0)
          .locator('.covered')
          .evaluate((el, s) => {
            const [top, right, bottom, left] = /^inset\(([^)]*?)(?: round .*)?\)/.exec((el as HTMLElement).style.clipPath)![1].trim().split(/\s+/).map(Number.parseFloat);
            const own = el.getBoundingClientRect();
            return { x: own.left + left * s, y: own.top + top * s, width: own.width - (left + right) * s, height: own.height - (top + bottom) * s };
          }, scale);
        for (const k of ['x', 'y', 'width', 'height'] as const) expect(Math.abs(clip[k] - box[k]), `the clip’s ${k} at ${time}, scale ${scale}`).toBeLessThan(0.5);
      }
    }
  });

  test('NVB-15: a frame of a tap’s slide is the look a drag draws with the indicator at that place — the same box, the same clip of every covered copy', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('four-destinations', 'filled') });
    await override(page, { [T('motion-selection-duration')]: '2000ms' });
    // A drag held where Inbox and Sent meet, in one bar…
    const [a, b] = [await bounds(container(page, 'four-destinations', 0)), await bounds(container(page, 'four-destinations', 1))];
    await dragTo(page, 'four-destinations', 0, a.x + a.width);
    const dragged = await bounds(pill(page, 'four-destinations'));
    expect(dragged.x).toBeCloseTo((a.x + b.x) / 2, 0);
    const clip = (id: string, n: number) => item(page, id, n).locator('.covered').evaluate((el: HTMLElement) => el.style.clipPath);
    const dragClips = [await clip('four-destinations', 0), await clip('four-destinations', 1)];
    // …and a tap's slide from Sent to Starred in the other, held at the frame its indicator is halfway.
    expect(await selectHeld(page, 'filled', 'starred')).toBe(true);
    const [c, d] = [await bounds(container(page, 'filled', 1)), await bounds(container(page, 'filled', 2))];
    let at: { x: number; width: number; height: number } | null = null;
    for (let time = 0; time <= 2000 && !at; time += 20) {
      await holdSlide(page, 'filled', time);
      await frames(page);
      const box = await bounds(pill(page, 'filled'));
      if (Math.abs(box.x - (c.x + d.x) / 2) < 1.5) at = box;
    }
    expect(at, 'a frame with the indicator halfway').not.toBeNull();
    // The same thing is drawn: a box of the item container's size there, and each covered copy clipped to it.
    expect([at!.width, at!.height]).toEqual([expect.closeTo(dragged.width, 1), dragged.height]);
    const slideClips = [await clip('filled', 1), await clip('filled', 2)];
    const insetsOf = (value: string) => insets(value).slice(0, 4);
    for (const index of [0, 1]) {
      const [drag, slide] = [insetsOf(dragClips[index]), insetsOf(slideClips[index])];
      expect(slide.length).toBe(4);
      for (const side of [0, 1, 2, 3]) expect(slide[side], `copy ${index} side ${side}`).toBeCloseTo(drag[side], -0.5);
    }
    await page.mouse.up();
    await holdSlide(page, 'filled', null);
  });

  test('NVB-15: from no selection the indicator fades in on the new item container at its full size, and to no selection it fades out — it never grows or shrinks in width; at once where motion is reduced, and on a change of size without a new selection', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('none-selected', 'four-destinations') });
    await override(page, { [T('motion-selection-duration')]: '2000ms' });
    // From none: the whole item container from the first frame, its opacity rising.
    const target = await bounds(container(page, 'none-selected', 1));
    expect(await selectHeld(page, 'none-selected', 'sent')).toBe(true);
    const opacities: number[] = [];
    for (const time of [0, 400, 1000, 1600]) {
      await holdSlide(page, 'none-selected', time);
      await frames(page);
      const box = await bounds(pill(page, 'none-selected'));
      expect([box.x, box.y, box.width, box.height], `at ${time}`).toEqual([expect.closeTo(target.x, 1), target.y, expect.closeTo(target.width, 1), target.height]);
      opacities.push(Number(await css(pill(page, 'none-selected'), 'opacity')));
      // The covered copy fades with it, over the plain one.
      expect(Number(await css(item(page, 'none-selected', 1).locator('.covered'), 'opacity'))).toBeCloseTo(opacities.at(-1)!, 2);
    }
    expect(opacities[0]).toBeLessThan(0.05);
    expect(opacities[1]).toBeGreaterThan(opacities[0]);
    expect(opacities[2]).toBeGreaterThan(0);
    await holdSlide(page, 'none-selected', null);
    await expect.poll(() => moving(page, 'none-selected')).toBe(false);
    // To none: in place, fading.
    const old = await bounds(container(page, 'four-destinations', 0));
    expect(await selectHeld(page, 'four-destinations', '')).toBe(true);
    await holdSlide(page, 'four-destinations', 1000);
    await frames(page);
    const fading = await bounds(pill(page, 'four-destinations'));
    expect([fading.x, fading.width, fading.height]).toEqual([expect.closeTo(old.x, 0), expect.closeTo(old.width, 0), old.height]);
    const opacity = Number(await css(pill(page, 'four-destinations'), 'opacity'));
    expect(opacity).toBeGreaterThanOrEqual(0);
    expect(opacity).toBeLessThan(1);
    await holdSlide(page, 'four-destinations', null);
    await expect.poll(() => moving(page, 'four-destinations')).toBe(false);
    // A change of size without a new selection: the item container grows at once, nothing moves.
    const before = await bounds(container(page, 'none-selected', 1));
    await override(page, { [T('container-height')]: '80px' });
    const after = await bounds(container(page, 'none-selected', 1));
    expect(after.height).toBeGreaterThan(before.height);
    expect(await pill(page, 'none-selected').evaluate((el) => el.getAnimations().length)).toBe(0);
    expect(await item(page, 'none-selected', 1).locator('.covered').evaluate((el: HTMLElement) => el.style.clipPath)).toBe('');
    // Reduced motion: at once.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // (Asked in the task that makes the change: a motion begun by mistake is running then, however long it is.)
    const begun = await bar(page, 'none-selected').evaluate(async (el: any) => {
      el.value = 'settings';
      await el.updateComplete;
      const items = [...el.querySelectorAll('tanrei-navigation-bar-item')] as any[];
      await Promise.all(items.map((each) => each.updateComplete));
      return [(el.shadowRoot.querySelector('.pill') as HTMLElement).getAnimations().length, (items[3].shadowRoot.querySelector('.icon-fill') as HTMLElement).getAnimations().length];
    });
    expect(begun).toEqual([0, 0]);
    await expect.poll(() => css(item(page, 'none-selected', 3).locator('.indicator'), 'background-color')).toBe(await resolveColor(page, T('selected-item-container-color')));
    expect(await css(item(page, 'none-selected', 1).locator('.indicator'), 'transition-duration')).toBe('0s');
  });
});

test.describe('the covered copy', () => {
  test('NVB-23: landed, in every fixture — the selected destination’s icon and label wholly in their covered colors; every other copy clipped away; no blend mode; the badge above both copies; each destination exposed once', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    await page.mouse.move(0, 0);
    for (const f of spec.fixtures) {
      const variant = f.props.variant === 'filled' ? 'filled-' : '';
      // NVB-30: a link without a value of its own is selected by its address.
      const selected = f.items!.findIndex((each) => (each.props.value ?? each.props.href) === f.props.value);
      for (const [n, each] of f.items!.entries()) {
        const at = `${f.id}/${n}`;
        const copy = await item(page, f.id, n).evaluate((el) => {
          const root = el.shadowRoot!;
          const covered = root.querySelector<HTMLElement>('.covered')!;
          const content = root.querySelector('.content')!;
          const style = getComputedStyle(covered);
          return {
            clip: style.clipPath,
            inline: covered.style.clipPath,
            hidden: covered.getAttribute('aria-hidden'),
            blend: [covered, root.querySelector('.c-icon')!, root.querySelector('.c-label')!].map((node) => getComputedStyle(node).mixBlendMode),
            above: !!(content.compareDocumentPosition(covered) & Node.DOCUMENT_POSITION_FOLLOWING),
            badge: !!root.querySelector('.covered tanrei-badge.covered-badge .c-icon'),
            text: [root.querySelector('.c-icon')!.textContent, root.querySelector('.c-label')!.textContent],
            plain: ['.icon', '.label'].map((part) => getComputedStyle(root.querySelector(part)!).visibility),
          };
        });
        expect(copy.hidden, at).toBe('true');
        expect(copy.inline, at).toBe('');
        expect(copy.blend, at).toEqual(['normal', 'normal', 'normal']);
        expect(copy.above, at).toBe(true);
        expect(copy.text, at).toEqual([each.props.icon, each.props.label]);
        expect(copy.badge, at).toBe(!!each.props.badge);
        if (n === selected) {
          // Wholly covered: the covered copy is drawn whole, and the plain glyph and label under it are not drawn, so
          // none of their edges shows.
          expect(copy.clip, at).toBe('none');
          expect(copy.plain, at).toEqual(['hidden', 'hidden']);
          const { coveredIcon, coveredLabel } = await drawn(page, f.id, n);
          const state = each.props.disabled ? 'disabled-' : '';
          expect(coveredIcon, at).toBe(await resolveColor(page, T(`${variant}selected-${state}item-covered-icon-color`)));
          expect(coveredLabel, at).toBe(await resolveColor(page, T(`${variant}selected-${state}item-covered-label-color`)));
        } else {
          expect(copy.clip, at).toBe('inset(50%)');
          expect(copy.plain, at).toEqual(['visible', 'visible']);
        }
        // Exposed once: a button, or a link while it has an address (NVB-19).
        const role = bar(page, f.id).getByRole(each.props.href ? 'link' : 'button', { name: String(each.props.label), exact: true });
        await expect(role, at).toHaveCount(1);
      }
    }
  });

  test('NVB-23: mid-slide in filled, a destination the indicator passes over is in the covered colors only where it is covered — the plain copy cut away exactly there — and the new one is wholly covered only when the indicator lands', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('filled') });
    await override(page, { [T('motion-selection-duration')]: '2000ms' });
    // Plain and covered differ where the filled indicator passes: on-surface-variant against on-primary.
    const passed = await drawn(page, 'filled', 2);
    expect(passed.coveredIcon).not.toBe(passed.icon);
    expect(await selectHeld(page, 'filled', 'settings')).toBe(true);
    let partial: { from: number; to: number; box: { left: number; right: number } } | null = null;
    const labelBox = await rect(item(page, 'filled', 2).locator('.label-box'));
    for (let time = 0; time <= 2000 && !partial; time += 25) {
      await holdSlide(page, 'filled', time);
      await frames(page);
      const span = await coveredSpan(page, 'filled', 2);
      // A frame in which the indicator's edge crosses Starred's label.
      const crosses = (edge: number) => edge > labelBox.x + 2 && edge < labelBox.x + labelBox.width - 2;
      if (span.to > span.from && (crosses(span.from) || crosses(span.to))) partial = span;
    }
    expect(partial, 'a frame where Starred’s label is partly covered').not.toBeNull();
    // The clip is the indicator's box, in the same frame.
    const indicator = await bounds(pill(page, 'filled'));
    expect(partial!.from).toBeCloseTo(Math.max(partial!.box.left, indicator.x), 0);
    expect(partial!.to).toBeCloseTo(Math.min(partial!.box.right, indicator.x + indicator.width), 0);
    // The plain label is cut away where the indicator is: an even-odd path whose inner box is the indicator's.
    const cut = await item(page, 'filled', 2).evaluate((el) => {
      const label = el.shadowRoot!.querySelector<HTMLElement>('.label-box')!;
      return { clip: label.style.clipPath, left: label.getBoundingClientRect().left };
    });
    expect(cut.clip).toMatch(/^path\(evenodd/);
    // No blend mode stands in for the two copies.
    expect(await css(item(page, 'filled', 2).locator('.covered'), 'mix-blend-mode')).toBe('normal');
    // Not landed yet: Settings is not wholly covered.
    const target = await coveredSpan(page, 'filled', 3);
    const box = await bounds(container(page, 'filled', 3));
    expect(target.from > box.x + 0.5 || target.to < box.x + box.width - 0.5).toBe(true);
    // Its plain copy is drawn where the indicator has not reached yet.
    expect(await css(item(page, 'filled', 3).locator('.icon'), 'visibility')).toBe('visible');
    // Landed: wholly covered, by the styles; nothing is cut any longer.
    await holdSlide(page, 'filled', null);
    await expect.poll(() => coveredSpan(page, 'filled', 3).then((s) => s.inline)).toBe('');
    expect(await item(page, 'filled', 3).locator('.covered').evaluate((el) => getComputedStyle(el).clipPath)).toBe('none');
    expect(await item(page, 'filled', 2).locator('.covered').evaluate((el) => getComputedStyle(el).clipPath)).toBe('inset(50%)');
    expect(await item(page, 'filled', 2).locator('.label-box').evaluate((el: HTMLElement) => el.style.clipPath)).toBe('');
  });

  test('NVB-23: a drag held where two cells meet draws both destinations partly in each color, the clip moving with the indicator in the same frame', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('filled') });
    // Sent is selected; held where Sent and Starred meet.
    const [a, b] = [await bounds(container(page, 'filled', 1)), await bounds(container(page, 'filled', 2))];
    const from = await dragTo(page, 'filled', 1, b.x);
    const indicator = await bounds(pill(page, 'filled'));
    expect(indicator.x).toBeCloseTo((a.x + b.x) / 2, 0);
    for (const n of [1, 2]) {
      const span = await coveredSpan(page, 'filled', n);
      expect(span.from, `${n} from`).toBeCloseTo(Math.max(span.box.left, indicator.x), 0);
      expect(span.to, `${n} to`).toBeCloseTo(Math.min(span.box.right, indicator.x + indicator.width), 0);
      expect(span.to - span.from).toBeGreaterThan(1);
      expect(span.to - span.from).toBeLessThan(span.box.right - span.box.left - 1);
    }
    // A move of the pointer moves the indicator and the clips together.
    await page.mouse.move(b.x + 20, from.y);
    await frames(page);
    const moved = await bounds(pill(page, 'filled'));
    expect(moved.x).toBeGreaterThan(indicator.x + 1);
    const span = await coveredSpan(page, 'filled', 2);
    expect(span.from).toBeCloseTo(Math.max(span.box.left, moved.x), 0);
    await page.mouse.up();
  });
});

test.describe('the drag', () => {
  test('NVB-27: where the indicator is while the pointer is at a place — on a destination at its cell’s centre, halfway where two cells meet (the middle of any disabled ones between them), linear in between, on the first or last before or beyond its centre', async () => {
    const stops = [
      { item: 'a', left: 0, right: 100 },
      { item: 'b', left: 100, right: 200 },
      // c, from 200 to 300, is disabled: not a stop.
      { item: 'd', left: 300, right: 400 },
    ];
    expect(indicatorPlace([], 10)).toBeNull();
    expect(indicatorPlace(stops, -50)).toEqual({ from: 'a', to: 'b', p: 0 });
    expect(indicatorPlace(stops, 50)).toEqual({ from: 'a', to: 'b', p: 0 });
    expect(indicatorPlace(stops, 75)).toEqual({ from: 'a', to: 'b', p: 0.25 });
    expect(indicatorPlace(stops, 100)).toEqual({ from: 'a', to: 'b', p: 0.5 });
    expect(indicatorPlace(stops, 125)).toEqual({ from: 'a', to: 'b', p: 0.75 });
    expect(indicatorPlace(stops, 150)).toEqual({ from: 'b', to: 'd', p: 0 });
    // Between b and d the cells meet in the middle of the disabled one, at 250.
    expect(indicatorPlace(stops, 250)).toEqual({ from: 'b', to: 'd', p: 0.5 });
    expect(indicatorPlace(stops, 200)!.p).toBeCloseTo(0.25, 5);
    expect(indicatorPlace(stops, 350)).toEqual({ from: 'd', to: 'd', p: 0 });
    expect(indicatorPlace(stops, 900)).toEqual({ from: 'd', to: 'd', p: 0 });
    // Continuous: no jump as the pointer crosses the place where the cells meet.
    let last = indicatorPlace(stops, 50)!.p;
    for (let x = 51; x <= 150; x++) {
      const place = indicatorPlace(stops, x)!;
      const p = place.from === 'a' ? place.p : 1;
      expect(Math.abs(p - last)).toBeLessThan(0.02);
      last = p;
    }
  });

  test('NVB-27: a press dragged sideways past the slop is taken — held where Inbox and Sent meet the indicator is halfway between them at its full size, Sent’s icon and label partly in each color, value still inbox and nothing emitted; the pressed destination leaves its pressed state; the indicator follows the pointer in the frame it moves', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('four-destinations') });
    await wire(page);
    const [a, b] = [await bounds(container(page, 'four-destinations', 0)), await bounds(container(page, 'four-destinations', 1))];
    // Within the slop nothing is taken: the destination is pressed, the indicator at rest.
    const start = centre(a);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 6, start.y);
    expect(await moving(page, 'four-destinations')).toBe(false);
    await expect(container(page, 'four-destinations', 0)).toHaveAttribute('data-pressed', /.+/);
    // Past it: taken. The press ends as a press does (after press-hold), and nothing is selected.
    await page.mouse.move(start.x + 12, start.y);
    await page.mouse.move(a.x + a.width, start.y, { steps: 5 });
    await holdSlide(page, 'four-destinations', null, CATCH_UP);
    await page.mouse.move(a.x + a.width, start.y);
    await frames(page);
    expect(await moving(page, 'four-destinations')).toBe(true);
    await expect(container(page, 'four-destinations', 0)).not.toHaveAttribute('data-pressed', /.+/);
    const box = await bounds(pill(page, 'four-destinations'));
    expect([box.x, box.width, box.height, box.y]).toEqual([expect.closeTo((a.x + b.x) / 2, 0), expect.closeTo(a.width, 1), a.height, a.y]);
    expect(await css(pill(page, 'four-destinations'), 'background-color')).toBe(await resolveColor(page, T('selected-item-container-color')));
    const sent = await coveredSpan(page, 'four-destinations', 1);
    expect(sent.from).toBeCloseTo(sent.box.left, 0);
    expect(sent.to).toBeCloseTo(box.x + box.width, 0);
    expect(sent.to).toBeLessThan(sent.box.right - 1);
    expect(await value(page, 'four-destinations')).toBe('inbox');
    expect(await log(page)).toEqual([]);
    // What stays with the selected destination until the release: aria-current, the icon's fill, the icon indicator.
    await expect(item(page, 'four-destinations', 0).locator('.cell')).toHaveAttribute('aria-current', 'page');
    await expect(item(page, 'four-destinations', 1).locator('.cell')).not.toHaveAttribute('aria-current', 'page');
    expect(await item(page, 'four-destinations', 1).locator('.cell').evaluate((el) => el.classList.contains('selected'))).toBe(false);
    // It follows the pointer without a motion of its own, linearly: a quarter of a cell further is half that in place.
    for (const dx of [10, 30, 44]) {
      await page.mouse.move(a.x + a.width + dx, start.y);
      await frames(page);
      const at = await bounds(pill(page, 'four-destinations'));
      expect(at.x, `+${dx}`).toBeCloseTo((a.x + b.x) / 2 + dx, 0);
      expect(at.width).toBeCloseTo(a.width, 1);
    }
    // Beyond the last destination's centre it stays on it.
    const last = await bounds(container(page, 'four-destinations', 3));
    await page.mouse.move(last.x + last.width + 200, start.y, { steps: 3 });
    await frames(page);
    expect((await bounds(pill(page, 'four-destinations'))).x).toBeCloseTo(last.x, 0);
    expect(await pill(page, 'four-destinations').evaluate((el) => el.getAnimations().length)).toBe(0);
    expect(await log(page)).toEqual([]);
    await page.mouse.up();
  });

  test('NVB-27: a drag taken with the pointer away from the indicator brings it to the pointer over the state motion; a drag 12 up is not taken and is left to the page; a wheel moves nothing; the bar leaves vertical drags to the browser (touch-action: pan-y)', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('four-destinations') });
    await wire(page);
    // Long enough to be under way whenever the answers come: the moves and the question are four round trips.
    await override(page, { [T('motion-state-duration')]: '20000ms' });
    const [inbox, settings] = [await bounds(container(page, 'four-destinations', 0)), await bounds(container(page, 'four-destinations', 3))];
    // A press on Settings dragged 12 to the side: the indicator comes from Inbox, over the state motion.
    const from = centre(settings);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    for (const dx of [-4, -8, -12]) await page.mouse.move(from.x + dx, from.y);
    const clock = await pill(page, 'four-destinations').evaluate((el, name) => {
      const a = el.getAnimations().find((each) => each.id === name);
      return a ? a.effect!.getTiming().duration : null;
    }, CATCH_UP);
    expect(clock).toBe(20000);
    expect(await holdSlide(page, 'four-destinations', 10000, CATCH_UP)).toBe(true);
    await frames(page);
    const mid = await bounds(pill(page, 'four-destinations'));
    expect(mid.x).toBeGreaterThan(inbox.x + 5);
    expect(mid.x).toBeLessThan(settings.x - 5);
    expect(mid.width).toBeCloseTo(inbox.width, 1);
    // Once it has caught up it is where the pointer is.
    await holdSlide(page, 'four-destinations', null, CATCH_UP);
    await page.mouse.move(from.x - 12, from.y);
    await frames(page);
    expect((await bounds(pill(page, 'four-destinations'))).x).toBeCloseTo(settings.x - 12, 0);
    // Returned by a release on the selected destination's side of nothing: Settings is chosen here, so cancel instead.
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await holdSlide(page, 'four-destinations', null);
    expect(await log(page)).toEqual([]);
    // Up first: not taken, for its whole length; the press still ends as a tap does not (the pointer left the cell).
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('four-destinations') });
    await wire(page);
    const c = centre(await bounds(container(page, 'four-destinations', 1)));
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.mouse.move(c.x, c.y - 12, { steps: 3 });
    await page.mouse.move(c.x + 60, c.y - 12, { steps: 3 });
    expect(await moving(page, 'four-destinations')).toBe(false);
    await page.mouse.up();
    // A wheel or a trackpad moves nothing.
    await page.mouse.move(c.x, c.y);
    await page.mouse.wheel(120, 0);
    await frames(page);
    expect(await moving(page, 'four-destinations')).toBe(false);
    expect(await value(page, 'four-destinations')).toBe('inbox');
    expect(await css(bar(page, 'four-destinations').locator('.bar'), 'touch-action')).toContain('pan-y');
  });

  test('NVB-27: in disabled the indicator passes over the disabled destination and never rests on it; in none-selected no drag is taken and a press still activates', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('disabled', 'none-selected') });
    await wire(page);
    // disabled: Inbox selected, Starred disabled. Held at Starred's centre, the indicator is halfway between Sent and Settings.
    const boxes = await Promise.all([0, 1, 2, 3].map((n) => bounds(container(page, 'disabled', n))));
    await dragTo(page, 'disabled', 0, boxes[2].x + boxes[2].width / 2);
    const over = await bounds(pill(page, 'disabled'));
    expect(over.x).toBeCloseTo((boxes[1].x + boxes[3].x) / 2, 0);
    await releaseAtRest(page);
    // From halfway on, the one after: Settings — never Starred.
    await expect.poll(() => value(page, 'disabled')).toBe('settings');
    expect(await log(page)).toEqual(['change:settings']);
    await holdSlide(page, 'disabled', null);
    // none-selected: nothing to carry, so nothing is taken; the click activates.
    const start = centre(await bounds(container(page, 'none-selected', 1)));
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 20, start.y, { steps: 5 });
    expect(await moving(page, 'none-selected')).toBe(false);
    await page.mouse.up();
    await expect.poll(() => value(page, 'none-selected')).toBe('sent');
    expect(await log(page)).toEqual(['change:settings', 'change:sent']);
  });

  test('NVB-27: under m3-like, whose item container is transparent, nothing is drawn moving and the release still chooses', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('four-destinations'), system: 'm3-like' });
    await wire(page);
    const b = await bounds(container(page, 'four-destinations', 1));
    await dragTo(page, 'four-destinations', 0, b.x + b.width / 2);
    expect(clear(await css(pill(page, 'four-destinations'), 'background-color'))).toBe(true);
    // The icon indicator stays behind the selected destination's glyph until the release.
    await expect.poll(() => css(item(page, 'four-destinations', 0).locator('.icon-fill'), 'background-color')).toBe(await resolveColor(page, T('selected-item-icon-indicator-color')));
    expect(clear(await css(item(page, 'four-destinations', 1).locator('.icon-fill'), 'background-color'))).toBe(true);
    await releaseAtRest(page);
    await expect.poll(() => value(page, 'four-destinations')).toBe('sent');
    expect(await log(page)).toEqual(['change:sent']);
  });

  test('NVB-28: what a release chooses — the nearer of the two destinations the indicator lies between, the one after it from halfway on, or the one of the two a fling is toward (0.5 px per ms)', async () => {
    const place = (p: number) => ({ from: 'a', to: 'b', p });
    expect(indicatorChoice(place(0.49), 0)).toBe('a');
    expect(indicatorChoice(place(0.5), 0)).toBe('b');
    expect(indicatorChoice(place(0.9), 0.49)).toBe('b');
    // A fling toward the right chooses the one toward the right, wherever the release is; toward the left, the other.
    expect(indicatorChoice(place(0.1), 0.5)).toBe('b');
    expect(indicatorChoice(place(0.9), -0.5)).toBe('a');
    expect(indicatorChoice(place(0.1), -3)).toBe('a');
  });

  test('NVB-28: a drag from Inbox released past the place where it meets Sent selects Sent with one change and the indicator settles from where the release left it; released short of it the indicator returns and nothing is emitted, reselect included; no click of the release activates anything', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('four-destinations') });
    await wire(page);
    // A slide a release starts is held some round trips later (the release, the value, the log): long enough to be there.
    await override(page, { [T('motion-selection-duration')]: '20000ms' });
    const [a, b] = [await bounds(container(page, 'four-destinations', 0)), await bounds(container(page, 'four-destinations', 1))];
    await page.evaluate(() => {
      (window as any).clicks = 0;
      document.querySelector('tanrei-navigation-bar')!.addEventListener('click', () => (window as any).clicks++);
    });
    // Short of it: returns over the selection motion, and nothing is emitted.
    await dragTo(page, 'four-destinations', 0, a.x + a.width - 10);
    const left = await bounds(pill(page, 'four-destinations'));
    await releaseAtRest(page);
    expect(await holdSlide(page, 'four-destinations', 0)).toBe(true);
    await frames(page);
    expect((await bounds(pill(page, 'four-destinations'))).x).toBeCloseTo(left.x, 0);
    await holdSlide(page, 'four-destinations', null);
    await expect.poll(() => moving(page, 'four-destinations')).toBe(false);
    expect(await value(page, 'four-destinations')).toBe('inbox');
    expect(await log(page)).toEqual([]);
    // Past it: Sent, one change; the slide starts where the release left the indicator.
    await dragTo(page, 'four-destinations', 0, a.x + a.width + 10);
    const released = await bounds(pill(page, 'four-destinations'));
    await releaseAtRest(page);
    await expect.poll(() => value(page, 'four-destinations')).toBe('sent');
    expect(await log(page)).toEqual(['change:sent']);
    expect(await holdSlide(page, 'four-destinations', 0)).toBe(true);
    await frames(page);
    expect((await bounds(pill(page, 'four-destinations'))).x).toBeCloseTo(released.x, 0);
    await expect(item(page, 'four-destinations', 1).locator('.cell')).toHaveAttribute('aria-current', 'page');
    await holdSlide(page, 'four-destinations', null);
    await expect.poll(() => moving(page, 'four-destinations')).toBe(false);
    expect((await bounds(container(page, 'four-destinations', 1))).x).toBe(b.x);
    // The release happened over Sent: no click-driven second change or reselect follows, and none reached a listener
    // but the bar's own activation of the chosen destination.
    await page.waitForTimeout(50);
    expect(await log(page)).toEqual(['change:sent']);
    expect(await page.evaluate(() => (window as any).clicks)).toBe(1);
    // A tap afterwards is a tap again.
    await item(page, 'four-destinations', 1).locator('.cell').click();
    expect(await log(page)).toEqual(['change:sent', 'reselect:sent']);
  });

  test('NVB-28: a fling toward Sent released short of the place where the cells meet selects Sent, and a fling back toward Inbox released past it leaves Inbox selected', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('four-destinations') });
    await wire(page);
    const a = await bounds(container(page, 'four-destinations', 0));
    const y = a.y + a.height / 2;
    // Toward Sent, released short of halfway: a fling, so Sent. The events are dispatched in the page, each stamped 8 ms
    // after the one before — the time the pointer was there: 40 px in 32 ms, far more than 0.5 px per ms. (Moves sent
    // one command at a time arrive as slowly as the machine is loaded, and a loaded Firefox saw no fling in them.)
    // A move is how far the pointer is from where it went down, and how long after the event before it.
    const pointer = (moves: readonly (readonly [dx: number, after: number])[]) =>
      bar(page, 'four-destinations').evaluate(
        async (el, [x, y, moves]) => {
          const target = (el.querySelector('tanrei-navigation-bar-item') as HTMLElement).shadowRoot!.querySelector('.cell')!;
          let stamp = performance.now();
          const at = (type: string, xx: number) => {
            const event = new PointerEvent(type, { bubbles: true, composed: true, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: xx, clientY: y });
            Object.defineProperty(event, 'timeStamp', { value: stamp });
            return event;
          };
          target.dispatchEvent(at('pointerdown', x));
          for (const [dx, after] of moves) {
            await new Promise((resolve) => setTimeout(resolve, 8));
            stamp += after;
            target.dispatchEvent(at('pointermove', x + dx));
          }
          target.dispatchEvent(at('pointerup', x + moves.at(-1)![0]));
        },
        [a.x + a.width / 2, y, moves] as const,
      );
    await pointer([4, 8, 12, 16, 28, 40].map((dx) => [dx, 8] as const));
    await expect.poll(() => value(page, 'four-destinations')).toBe('sent');
    expect(await log(page)).toEqual(['change:sent']);
    await holdSlide(page, 'four-destinations', null);
    // Back to Inbox for the second half.
    await bar(page, 'four-destinations').evaluate((el: any) => (el.value = 'inbox'));
    await holdSlide(page, 'four-destinations', null);
    await expect.poll(() => moving(page, 'four-destinations')).toBe(false);
    // Past the place where they meet, at rest there (200 ms: longer than the velocity looks back), then flung back
    // toward Inbox — 34 px in 16 ms — and released still past it: Inbox stays, nothing more is emitted. Stamped as the
    // first half is: the velocity looks back 80 ms, and three moves and a release sent one command at a time are in it
    // only on a machine that answers each in a few milliseconds.
    const past = a.width / 2;
    await pointer([[4, 8], [8, 8], [12, 8], [past, 8], [past + 40, 8], [past + 38, 200], [past + 20, 8], [past + 4, 8]]);
    await holdSlide(page, 'four-destinations', null);
    await expect.poll(() => moving(page, 'four-destinations')).toBe(false);
    expect(await value(page, 'four-destinations')).toBe('inbox');
    expect(await log(page)).toEqual(['change:sent']);
  });

  test('NVB-28: a fast drag that holds still for more than 40 ms before its release is no fling — the nearer destination is chosen — and the same drag released within 40 ms of its last move is one', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('four-destinations'), reducedMotion: true });
    await wire(page);
    const a = await bounds(container(page, 'four-destinations', 0));
    const from = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
    // 30 px toward Sent at 2.5 px per ms, short of where Inbox's cell meets Sent's: only a fling chooses Sent.
    const moves = strokes(from, { x: 10, y: 0 });
    const cell = item(page, 'four-destinations', 0).locator('.cell');
    await flingThenHold(page, cell, { from, moves, hold: STOPPED_AFTER + 1, pointerType: 'mouse', pointerId: 1 });
    expect(await log(page)).toEqual([]);
    expect(await value(page, 'four-destinations')).toBe('inbox');
    await expect.poll(() => moving(page, 'four-destinations')).toBe(false);
    await flingThenHold(page, cell, { from, moves, hold: STOPPED_AFTER, pointerType: 'mouse', pointerId: 1 });
    expect(await log(page)).toEqual(['change:sent']);
    expect(await value(page, 'four-destinations')).toBe('sent');
  });

  test('NVB-28: a destination that is a link is not draggable as a link; a release that chooses it is a plain press on it — one change with its href, the link followed, value not written and the indicator back on what value selects; with value set in the listener the indicator ends on the chosen one; a link to a new context opens and emits nothing', async ({ page }) => {
    // The spec's fixture, its addresses as fragments of the page itself, so that following one is seen and nothing is unloaded.
    const places = spec.fixtures.find((f) => f.id === 'links')!.items!.map((each) => ({ ...each, props: { ...each.props, href: `#${String(each.props.label).toLowerCase()}` } }));
    await mountFixtures(page, spec, { icons: true, fixtures: [{ id: 'links', props: { value: '#search', label: 'Main' }, items: places }] });
    await wireLinks(page);
    // A slide a release starts is held some round trips later (five, the first time): long enough to be there.
    await override(page, { [T('motion-selection-duration')]: '20000ms' });
    for (const n of [0, 1, 2, 3]) await expect(item(page, 'links', n).locator('a.cell')).toHaveAttribute('draggable', 'false');
    // A sideways drag that begins on a link moves the indicator and drags nothing of the link (NVB-30).
    expect(await item(page, 'links', 1).locator('a.cell').evaluate((el) => !el.dispatchEvent(new DragEvent('dragstart', { bubbles: true, composed: true, cancelable: true })))).toBe(true);
    const [search, library] = [await bounds(container(page, 'links', 1)), await bounds(container(page, 'links', 2))];
    await dragTo(page, 'links', 1, library.x + library.width / 2);
    expect(await moving(page, 'links')).toBe(true);
    expect(await page.evaluate(() => location.hash)).toBe('');
    expect(await log(page)).toEqual([]);
    await releaseAtRest(page);
    // One change, carrying the value and the address, cancelable; the link is followed; the bar's value is the page's.
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#library');
    expect(await log(page)).toEqual(['change:#library:#library:#search:true', 'click:left alone']);
    expect(await value(page, 'links')).toBe('#search');
    await expect(item(page, 'links', 1).locator('.cell')).toHaveAttribute('aria-current', 'page');
    // The indicator returns to the destination value selects, over the selection motion, from where the release left it.
    expect(await holdSlide(page, 'links', null)).toBe(true);
    await expect.poll(() => moving(page, 'links')).toBe(false);
    await page.mouse.move(0, 0);
    expect((await bounds(container(page, 'links', 1))).x).toBe(search.x);
    await expect.poll(async () => (await drawn(page, 'links', 1)).container).toBe(await resolveColor(page, T('selected-item-container-color')));
    await expect.poll(async () => (await drawn(page, 'links', 2)).container).toBe(await resolveColor(page, T('unselected-item-container-color')));
    // Cancelled, with value left alone: the link is not followed, and the indicator is back on Search.
    await page.evaluate(() => {
      (window as any).log.length = 0;
      (window as any).cancel = true;
      history.replaceState(null, '', '#');
    });
    await dragTo(page, 'links', 1, library.x + library.width / 2);
    await releaseAtRest(page);
    await expect.poll(() => log(page)).toEqual(['change:#library:#library:#search:true', 'click:prevented']);
    await holdSlide(page, 'links', null);
    await expect.poll(() => moving(page, 'links')).toBe(false);
    expect(await page.evaluate(() => location.hash)).toBe('');
    expect(await value(page, 'links')).toBe('#search');
    await expect(item(page, 'links', 1).locator('.cell')).toHaveAttribute('aria-current', 'page');
    // A router: value set to the chosen destination inside the listener — the indicator goes on to it from where the
    // release left it, and ends there.
    await page.evaluate(() => {
      (window as any).log.length = 0;
      document.querySelector<any>('tanrei-navigation-bar')!.addEventListener('change', (e: any) => (e.currentTarget.value = e.detail.value), { once: true });
    });
    await dragTo(page, 'links', 1, library.x + library.width / 2);
    const released = await bounds(pill(page, 'links'));
    await releaseAtRest(page);
    await expect.poll(() => value(page, 'links')).toBe('#library');
    expect(await holdSlide(page, 'links', 0)).toBe(true);
    await frames(page);
    expect((await bounds(pill(page, 'links'))).x).toBeCloseTo(released.x, 0);
    await holdSlide(page, 'links', null);
    await expect.poll(() => moving(page, 'links')).toBe(false);
    await expect(item(page, 'links', 2).locator('.cell')).toHaveAttribute('aria-current', 'page');
    await page.mouse.move(0, 0);
    await expect.poll(async () => (await drawn(page, 'links', 2)).container).toBe(await resolveColor(page, T('selected-item-container-color')));
    expect((await log(page)).filter((each) => each.startsWith('change') || each.startsWith('reselect')).length).toBe(1);
    // A link that opens a new context, chosen by a release: it opens (held back here, after the bar has heard it) and
    // the bar emits nothing and selects nothing.
    await page.evaluate(() => {
      (window as any).log.length = 0;
      (window as any).cancel = false;
      (window as any).hold = true;
    });
    const help = await bounds(container(page, 'links', 3));
    await dragTo(page, 'links', 2, help.x + help.width / 2);
    await releaseAtRest(page);
    await expect.poll(() => log(page)).toEqual(['click:left alone']);
    await holdSlide(page, 'links', null);
    await expect.poll(() => moving(page, 'links')).toBe(false);
    expect(await value(page, 'links')).toBe('#library');
    expect(page.context().pages().length).toBe(1);
  });

  test('NVB-29: Escape, a cancelled pointer and a lost capture return the indicator to the selected destination over the selection motion and emit nothing; the pointer, still down, does nothing more', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('four-destinations') });
    await wire(page);
    const [a, c] = [await bounds(container(page, 'four-destinations', 0)), await bounds(container(page, 'four-destinations', 2))];
    // Escape.
    await dragTo(page, 'four-destinations', 0, c.x + c.width / 2);
    await page.keyboard.press('Escape');
    await holdSlide(page, 'four-destinations', null);
    await expect.poll(() => moving(page, 'four-destinations')).toBe(false);
    expect(await value(page, 'four-destinations')).toBe('inbox');
    // Still down: moving on carries nothing, and the release selects nothing.
    await page.mouse.move(c.x + c.width / 2 + 40, a.y + 20);
    expect(await moving(page, 'four-destinations')).toBe(false);
    await page.mouse.up();
    await page.waitForTimeout(50);
    expect(await log(page)).toEqual([]);
    expect(await value(page, 'four-destinations')).toBe('inbox');
    // The platform cancels the pointer, and a capture lost while the drag lasts (the mouse's own pointer id: 1 or 0).
    await page.evaluate(() => window.addEventListener('pointerdown', (event) => ((window as any).pointer = event.pointerId), true));
    for (const type of ['pointercancel', 'lostpointercapture']) {
      await dragTo(page, 'four-destinations', 0, c.x + c.width / 2);
      expect(await moving(page, 'four-destinations')).toBe(true);
      await bar(page, 'four-destinations').evaluate((el, t) => {
        const event = new PointerEvent(t, { pointerId: (window as any).pointer, bubbles: true, composed: true });
        if (t === 'pointercancel') window.dispatchEvent(event);
        else el.dispatchEvent(event);
      }, type);
      await holdSlide(page, 'four-destinations', null);
      await expect.poll(() => moving(page, 'four-destinations'), type).toBe(false);
      await page.mouse.up();
      await page.waitForTimeout(50);
      expect(await value(page, 'four-destinations'), type).toBe('inbox');
      expect(await log(page), type).toEqual([]);
    }
  });

  test('NVB-29: the product setting value, or disabling a destination the indicator lies between, ends the drag: the indicator goes to the selected destination — the one just set — and nothing is emitted', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('four-destinations') });
    await wire(page);
    await override(page, { [T('motion-selection-duration')]: '20000ms' });
    const boxes = await Promise.all([0, 1, 2, 3].map((n) => bounds(container(page, 'four-destinations', n))));
    await dragTo(page, 'four-destinations', 0, boxes[1].x + boxes[1].width / 2);
    expect(await selectHeld(page, 'four-destinations', 'settings')).toBe(true);
    // It slides from where it is to Settings.
    expect(await holdSlide(page, 'four-destinations', 0)).toBe(true);
    await frames(page);
    expect((await bounds(pill(page, 'four-destinations'))).x).toBeCloseTo(boxes[1].x, 0);
    await holdSlide(page, 'four-destinations', null);
    await expect.poll(() => moving(page, 'four-destinations')).toBe(false);
    await expect(item(page, 'four-destinations', 3).locator('.cell')).toHaveAttribute('aria-current', 'page');
    // The pointer is ignored until it is released, and its release chooses nothing.
    await page.mouse.move(boxes[2].x + 10, boxes[2].y + 20);
    await page.mouse.up();
    await page.waitForTimeout(50);
    expect(await value(page, 'four-destinations')).toBe('settings');
    expect(await log(page)).toEqual([]);
    // A destination under the indicator disabled meanwhile: back to the selected one.
    await dragTo(page, 'four-destinations', 3, boxes[2].x + boxes[2].width / 2);
    expect(await moving(page, 'four-destinations')).toBe(true);
    await item(page, 'four-destinations', 2).evaluate((el: any) => (el.disabled = true));
    await expect.poll(() => holdSlide(page, 'four-destinations', null)).toBe(true);
    await expect.poll(() => moving(page, 'four-destinations')).toBe(false);
    await page.mouse.up();
    await page.waitForTimeout(50);
    expect(await value(page, 'four-destinations')).toBe('settings');
    expect(await log(page)).toEqual([]);
  });

  test('NVB-29: while a drag lasts nothing exposed changes — the accessibility tree mid-drag is the one before the press — and focus stays where it was; with motion reduced the indicator still follows the pointer, without the catch-up, and is on its destination at once on release', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('four-destinations') });
    await wire(page);
    const stage = page.locator('[data-fixture="four-destinations"]');
    const before = await stage.ariaSnapshot();
    expect(before).toContain('button "Inbox"');
    const c = await bounds(container(page, 'four-destinations', 2));
    await dragTo(page, 'four-destinations', 0, c.x + c.width / 2);
    expect(await stage.ariaSnapshot()).toBe(before);
    const current = () => page.evaluate(() => [...document.querySelectorAll('tanrei-navigation-bar-item')].map((el) => el.shadowRoot!.querySelector('.cell')!.getAttribute('aria-current')));
    expect(await current()).toEqual(['page', null, null, null]);
    await releaseAtRest(page);
    await expect.poll(current).toEqual([null, null, 'page', null]);
    await holdSlide(page, 'four-destinations', null);
    // Reduced motion.
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('four-destinations'), reducedMotion: true });
    await wire(page);
    const boxes = await Promise.all([0, 1, 2, 3].map((n) => bounds(container(page, 'four-destinations', n))));
    const from = centre(boxes[3]);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    for (const dx of [-4, -8, -12]) await page.mouse.move(from.x + dx, from.y);
    // No catch-up: the indicator is at the pointer's place in the frame the drag is taken, though it rested on Inbox.
    expect(await pill(page, 'four-destinations').evaluate((el) => el.getAnimations().length)).toBe(0);
    await frames(page);
    expect((await bounds(pill(page, 'four-destinations'))).x).toBeCloseTo(boxes[3].x - 12, 0);
    await page.mouse.move(boxes[2].x + boxes[2].width / 2, from.y, { steps: 3 });
    await frames(page);
    expect((await bounds(pill(page, 'four-destinations'))).x).toBeCloseTo(boxes[2].x, 0);
    await releaseAtRest(page);
    await frames(page);
    expect(await moving(page, 'four-destinations')).toBe(false);
    expect(await value(page, 'four-destinations')).toBe('starred');
    expect(await log(page)).toEqual(['change:starred']);
    await page.mouse.move(0, 0);
    await expect.poll(() => css(item(page, 'four-destinations', 2).locator('.cell > .container > .indicator'), 'background-color')).toBe(await resolveColor(page, T('selected-item-container-color')));
  });
});

test.describe('links', () => {
  test('NVB-30, NVB-19: in links every destination is an anchor with its address, exposed as a link named by its label in the navigation landmark, the one value names current — and drawn exactly as the same bar of buttons, with its hit area and no look for a visited link; its href stands as its value', async ({ page, browserName }) => {
    const twin = { id: 'buttons', props: { value: '/search/', label: 'Buttons' }, items: spec.fixtures.find((f) => f.id === 'links')!.items!.map((each) => ({ kind: 'destination', props: { value: each.props.href, label: each.props.label, icon: each.props.icon } })) };
    await mountFixtures(page, spec, { icons: true, fixtures: [...fixtures('links'), twin] });
    await page.mouse.move(0, 0);
    const hrefs = ['/', '/search/', '/library/', 'https://example.com/tanrei/help'];
    for (const [n, href] of hrefs.entries()) {
      await expect(cell(page, 'links', n)).toHaveJSProperty('localName', 'a');
      await expect(cell(page, 'links', n)).toHaveAttribute('href', href);
      await expect(cell(page, 'links', n)).not.toHaveAttribute('role');
      // Its href stands as its value, and is not written back as one.
      expect(await item(page, 'links', n).evaluate((el: any) => [el.value, el.hasAttribute('value')])).toEqual([href, false]);
      await expect(cell(page, 'buttons', n)).toHaveJSProperty('localName', 'button');
    }
    await expect(page.locator('[data-fixture="links"]')).toMatchAriaSnapshot(`
      - navigation /^Main/:
        - list:
          - listitem:
            - link "Home"
          - listitem:
            - link "Search"
          - listitem:
            - link "Library"
          - listitem:
            - link "Help"
    `);
    // (The harness gives each fixture's landmark a name of its own: the label, then the fixture's id.)
    const nav = page.locator('[data-fixture="links"]').getByRole('navigation', { name: /^Main\b/ });
    await expect(nav.getByRole('link')).toHaveCount(4);
    await expect(nav.getByRole('button')).toHaveCount(0);
    await expect(nav.locator('[aria-current]')).toHaveCount(1);
    await expect(nav.getByRole('link', { name: 'Search' })).toHaveAttribute('aria-current', 'page');
    for (const n of [0, 1, 2, 3]) {
      await expect(item(page, 'links', n)).toHaveAttribute('aria-posinset', String(n + 1));
      await expect(item(page, 'links', n)).toHaveAttribute('aria-setsize', '4');
    }
    if (browserName === 'chromium') {
      // What the browser computed: four links, one of them the current page, and no second state.
      const tree = await axDestinations(page);
      expect(tree.filter((node) => node.in === 'Main')).toEqual([
        { in: 'Main', role: 'link', name: 'Home', description: '', current: '', disabled: false },
        { in: 'Main', role: 'link', name: 'Search', description: '', current: 'page', disabled: false },
        { in: 'Main', role: 'link', name: 'Library', description: '', current: '', disabled: false },
        { in: 'Main', role: 'link', name: 'Help', description: 'opens in a new tab', current: '', disabled: false },
      ]);
      expect(tree.filter((node) => node.in === 'Buttons').map((node) => `${node.role}:${node.name}:${node.current}`)).toEqual(['button:Home:', 'button:Search:page', 'button:Library:', 'button:Help:']);
    }
    // Drawn exactly as the bar of buttons: every part of every destination in the same color, the same boxes.
    for (const n of [0, 1, 2, 3]) {
      await expect.poll(() => drawn(page, 'links', n), `links/${n}`).toEqual(await drawn(page, 'buttons', n));
      const [a, b] = [await bounds(cell(page, 'links', n)), await bounds(cell(page, 'buttons', n))];
      expect([a.width, a.height], `links/${n}`).toEqual([b.width, b.height]);
      const [ca, cb] = [await bounds(container(page, 'links', n)), await bounds(container(page, 'buttons', n))];
      expect([ca.x - a.x, ca.y - a.y, ca.width, ca.height], `links/${n}`).toEqual([cb.x - b.x, cb.y - b.y, cb.width, cb.height]);
      expect(await css(cell(page, 'links', n), 'text-decoration-line')).toBe('none');
      expect(await css(cell(page, 'links', n), 'cursor')).toBe(await css(cell(page, 'buttons', n), 'cursor'));
    }
    expect(await drawn(page, 'links', 1)).toEqual(await expected(page, 'selected'));
    expect(await drawn(page, 'links', 0)).toEqual(await expected(page, 'unselected'));
    // Hovered and pressed: the same tokens, on a link and on a button.
    for (const state of ['hovered', 'pressed'] as const) {
      const read = async (id: string) => {
        await page.mouse.move(0, 0);
        await item(page, id, 2).evaluate((el) => el.addEventListener('click', (event) => event.preventDefault(), { once: true, capture: true }));
        await container(page, id, 2).hover();
        if (state === 'pressed') await page.mouse.down();
        await expect.poll(() => drawn(page, id, 2), `${id} ${state}`).toEqual(await expected(page, 'unselected', state));
        if (state === 'pressed') await page.mouse.up();
        await expect(container(page, id, 2)).not.toHaveAttribute('data-pressed');
      };
      await read('links');
      await read('buttons');
    }
    await page.mouse.move(0, 0);
    // NVB-6: the hit area is the link's — the whole cell, nothing inside it hit-tested.
    const hit = await item(page, 'links', 0).evaluate((el) => {
      const root = el.shadowRoot!;
      const box = root.querySelector('.label')!.getBoundingClientRect();
      return root.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)?.matches('a.cell[href]');
    });
    expect(hit).toBe(true);
    // No look of its own for a link the user has visited.
    expect(await item(page, 'links', 0).evaluate((el) => [...el.shadowRoot!.adoptedStyleSheets].some((sheet) => [...sheet.cssRules].some((rule) => rule.cssText.includes(':visited'))))).toBe(false);
    // A value of its own is what selects it, beside its address.
    await item(page, 'links', 0).evaluate((el: any) => (el.value = 'home'));
    await bar(page, 'links').evaluate((el: any) => (el.value = 'home'));
    await expect(cell(page, 'links', 0)).toHaveAttribute('aria-current', 'page');
    await expect(item(page, 'links', 0)).toHaveAttribute('value', 'home');
    await expect(cell(page, 'links', 1)).not.toHaveAttribute('aria-current');
  });

  test('NVB-30: a control-click, a command-click, a shift-click, a middle click and the context menu on a link destination are the browser’s — the bar prevents none, the same events reach the page as from a plain anchor, and it emits nothing; Space does not activate a link and shows no pressed state', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [{ id: 'links', props: { value: '#search', label: 'Main' }, items: PLACES }] });
    await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<a id="plain" href="#plain" style="position:fixed;inset-inline-end:8px;inset-block-start:8px">Plain</a>'));
    await wireLinks(page);
    await page.evaluate(() => ((window as any).hold = true));
    const said = async () => {
      const all = await log(page);
      await page.evaluate(() => ((window as any).log.length = 0));
      return all;
    };
    const plain = page.locator('#plain');
    for (const press of [{ modifiers: ['ControlOrMeta'] }, { modifiers: ['Control'] }, { modifiers: ['Meta'] }, { modifiers: ['Shift'] }, { button: 'middle' }, { button: 'right' }] as const) {
      await plain.click(press);
      const there = await said();
      await cell(page, 'links', 2).click(press);
      const here = await said();
      const what = `${browserName} ${JSON.stringify(press)}`;
      // The same events as a plain anchor's, none prevented on the way; neither change nor reselect among them.
      expect(here, what).toEqual(there);
      expect(here.every((each) => /^(click|auxclick|contextmenu):left alone$/.test(each)), `${what}: ${here}`).toBe(true);
    }
    expect(await value(page, 'links')).toBe('#search');
    expect(await page.evaluate(() => location.hash)).toBe('');
    expect(page.context().pages().length).toBe(1);
    await page.evaluate(() => ((window as any).hold = false));
    // Space: nothing emitted, no pressed state; Enter beside it activates.
    await tabTo(page, cell(page, 'links', 2));
    await page.keyboard.down('Space');
    await expect(container(page, 'links', 2)).not.toHaveAttribute('data-pressed');
    await page.keyboard.up('Space');
    expect(await said()).toEqual([]);
    await page.keyboard.down('Enter');
    await expect(container(page, 'links', 2)).toHaveAttribute('data-pressed', /.+/);
    await page.keyboard.up('Enter');
    expect(await said()).toEqual(['change:#library:#library:#search:true', 'click:left alone']);
  });

  test('NVB-31, NVB-1: a plain click on a link that is not selected emits one cancelable change with its value and href before the link is followed — not after press-hold — leaves value and the active indicator where they were and navigates; cancelled, it does not navigate; a listener that sets value slides the indicator; the selected link emits reselect; click() and Enter count; a modified click, Enter with a modifier key, a link to a new context and a download emit nothing', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [{ id: 'links', props: { value: '#search', label: 'Main' }, items: [...PLACES, link('Export', '#export', 'download', { download: 'list.txt' })] }] });
    // (The slide a click starts at the end is held two round trips later: long enough to be there.)
    await override(page, { '--tanrei-sys-motion-duration-press-hold': '2000ms', [T('motion-selection-duration')]: '20000ms' });
    await wireLinks(page);
    const said = async () => {
      const all = await log(page);
      await page.evaluate(() => ((window as any).log.length = 0));
      return all;
    };
    const state = () => bar(page, 'links').evaluate((el: any) => [el.value, location.hash, el.items.findIndex((each: any) => each.selected)]);
    // One change with the value and the address, cancelable, while the page is still where it was; the click is left
    // alone, so the browser follows the link at once — the press is still shown while the page has already moved.
    await cell(page, 'links', 2).hover();
    await page.mouse.down();
    await page.mouse.up();
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#library');
    await expect(container(page, 'links', 2)).toHaveAttribute('data-pressed', /.+/);
    expect(await said()).toEqual(['change:#library:#library:#search:true', 'click:left alone']);
    // The bar wrote nothing: value, the drawn selection and the indicator are where they were.
    expect(await state()).toEqual(['#search', '#library', 1]);
    expect(await moving(page, 'links')).toBe(false);
    await expect(cell(page, 'links', 1)).toHaveAttribute('aria-current', 'page');
    await page.mouse.move(0, 0);
    // The product that routes by itself cancels it: the link is not followed.
    await page.evaluate(() => ((window as any).cancel = true));
    await cell(page, 'links', 0).click();
    expect(await said()).toEqual(['change:#home:#home:#search:true', 'click:prevented']);
    expect(await state()).toEqual(['#search', '#library', 1]);
    await page.evaluate(() => ((window as any).cancel = false));
    // The selected link again: reselect, as change — and it is followed.
    await cell(page, 'links', 1).click();
    expect(await said()).toEqual(['reselect:#search:#search:#search:true', 'click:left alone']);
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#search');
    // click() — the default action of assistive technology — and Enter count.
    await item(page, 'links', 0).evaluate((el: HTMLElement) => el.click());
    expect(await said()).toEqual(['change:#home:#home:#search:true', 'click:left alone']);
    await tabTo(page, cell(page, 'links', 2));
    await page.keyboard.press('Enter');
    expect(await said()).toEqual(['change:#library:#library:#search:true', 'click:left alone']);
    expect(await state()).toEqual(['#search', '#library', 1]);
    // Opened somewhere else: nothing is emitted, value and the drawn selection stay. (The browser is held back only
    // after the bar has heard the click, so that the test opens no window and saves no file.)
    await page.evaluate(() => ((window as any).hold = true));
    for (const press of [() => cell(page, 'links', 0).click({ modifiers: ['ControlOrMeta'] }), () => cell(page, 'links', 0).click({ modifiers: ['Shift'] }), () => cell(page, 'links', 0).click({ modifiers: ['Alt'] }), () => cell(page, 'links', 0).click({ button: 'middle' }), () => cell(page, 'links', 3).click(), () => cell(page, 'links', 4).click()]) {
      await press();
      expect((await said()).filter((each) => !/^(click|auxclick):left alone$/.test(each))).toEqual([]);
    }
    await tabTo(page, cell(page, 'links', 0));
    await page.keyboard.press('ControlOrMeta+Enter');
    await page.keyboard.press('Shift+Enter');
    expect((await said()).filter((each) => each !== 'click:left alone')).toEqual([]);
    expect(await state()).toEqual(['#search', '#library', 1]);
    expect(page.context().pages().length).toBe(1);
    await page.evaluate(() => ((window as any).hold = false));
    // A click the product already cancelled is not an activation either.
    await item(page, 'links', 0).evaluate((el) => el.addEventListener('click', (e) => e.preventDefault(), { capture: true, once: true }));
    await cell(page, 'links', 0).click();
    expect(await said()).toEqual(['click:prevented']);
    // A listener that sets value — the page saying where it is — slides the indicator there (NVB-15).
    await bar(page, 'links').evaluate((el: any) => el.addEventListener('change', (e: CustomEvent) => (el.value = e.detail.value), { once: true }));
    await page.mouse.move(0, 0);
    await cell(page, 'links', 2).click();
    await expect.poll(() => value(page, 'links')).toBe('#library');
    expect(await holdSlide(page, 'links', 10000)).toBe(true);
    await frames(page);
    const [from, to, mid] = [await bounds(container(page, 'links', 1)), await bounds(container(page, 'links', 2)), await bounds(pill(page, 'links'))];
    expect(mid.x).toBeGreaterThan(from.x);
    expect(mid.x).toBeLessThan(to.x);
    await holdSlide(page, 'links', null);
    await expect.poll(() => moving(page, 'links')).toBe(false);
    await expect(cell(page, 'links', 2)).toHaveAttribute('aria-current', 'page');
  });

  test('NVB-32, NVB-16: in links Help opens a new tab that has no handle to this page, is drawn as the other three with no mark, and is described by targetLabel after its badge’s description; a plain click on it emits nothing and leaves the indicator on Search; without the words it still renders and is reported', async ({ page, browserName }) => {
    const seen: string[] = [];
    page.on('console', (message) => message.type() === 'warning' && seen.push(message.text()));
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [...fixtures('links'), { id: 'own', props: { value: '#a', label: 'Own' }, items: [link('A', '#a', 'home'), link('Badged', 'about:blank', 'help', { target: 'new', targetLabel: 'opens in a new tab', badge: true, badgeCount: 3, badgeLabel: '3 unread' }), link('Quiet', '#quiet', 'star', { target: 'new' }), link('Here', '#here', 'send', { targetLabel: 'ignored' })] }],
    });
    await page.mouse.move(0, 0);
    const help = cell(page, 'links', 3);
    expect(await help.evaluate((el) => [el.getAttribute('href'), el.getAttribute('target'), el.getAttribute('rel')])).toEqual(['https://example.com/tanrei/help', '_blank', 'noopener']);
    // No mark: the cell holds what the other three hold — one glyph in each copy — and is drawn from the same tokens.
    const glyphs = (n: number) => item(page, 'links', n).evaluate((el) => [...el.shadowRoot!.querySelectorAll('.icon, .c-icon, [part~="link-mark"], .link-mark')].map((each) => each.textContent?.trim()));
    expect(await glyphs(3)).toEqual(['help', 'help']);
    expect((await glyphs(0)).length).toBe(2);
    expect(await item(page, 'links', 3).evaluate((el) => el.shadowRoot!.textContent!.includes('open_in_new'))).toBe(false);
    await expect.poll(() => drawn(page, 'links', 3)).toEqual(await drawn(page, 'links', 0));
    expect((await bounds(container(page, 'links', 3))).width).toBe((await bounds(container(page, 'links', 0))).width);
    // Said: the words are its description — after the badge's, where it has one.
    await expect(help).toHaveAccessibleDescription('opens in a new tab');
    await expect(cell(page, 'own', 1)).toHaveAttribute('aria-description', '3 unread, opens in a new tab');
    if (browserName === 'chromium') expect((await axDestinations(page)).find((node) => node.name === 'Badged')).toMatchObject({ role: 'link', description: '3 unread, opens in a new tab' });
    // In place the words are ignored; a new context that is not said still renders and is reported once.
    await expect(cell(page, 'own', 3)).not.toHaveAttribute('aria-description');
    await expect(cell(page, 'own', 3)).not.toHaveAttribute('target');
    await expect(cell(page, 'own', 2)).toHaveAttribute('target', '_blank');
    await expect(cell(page, 'own', 2)).not.toHaveAttribute('aria-description');
    await expect.poll(() => seen.filter((w) => w.includes('(NVB-32)') && w.includes('targetLabel is empty')).length).toBe(1);
    // A plain click opens the new tab — it has no handle to this page — and the bar emits nothing and selects nothing.
    await wireLinks(page);
    const [popup] = await Promise.all([page.waitForEvent('popup'), cell(page, 'own', 1).click()]);
    expect(await popup.evaluate(() => window.opener)).toBeNull();
    await popup.close();
    expect((await log(page)).filter((each) => each !== 'click:left alone')).toEqual([]);
    expect(await value(page, 'own')).toBe('#a');
    await expect(cell(page, 'own', 0)).toHaveAttribute('aria-current', 'page');
    expect(await moving(page, 'own')).toBe(false);
    // The product's own rel stands, with noopener beside it; HTML's spellings are read as the two values.
    await item(page, 'own', 1).evaluate((el: any) => Object.assign(el, { rel: 'external', target: '_blank' }));
    await expect(cell(page, 'own', 1)).toHaveAttribute('rel', 'external noopener');
    await item(page, 'own', 1).evaluate((el: any) => Object.assign(el, { target: '_self' }));
    await expect(cell(page, 'own', 1)).not.toHaveAttribute('target');
    await expect(cell(page, 'own', 1)).toHaveAttribute('rel', 'external');
  });

  test('NVB-33: an unknown target is same and is reported; an href of white space makes a button and says nothing; a javascript: address and one that cannot be read make a button and are reported; without an href target and targetLabel are ignored', async ({ page }) => {
    const seen: string[] = [];
    page.on('console', (message) => message.type() === 'warning' && seen.push(message.text()));
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [{ id: 'odd', props: { value: 'a', label: 'Main' }, items: [destination('a', 'Named', 'home', { href: '#named', target: 'sidebar' }), destination('b', 'Blank', 'search', { href: '   ' }), destination('c', 'Script', 'star', { href: ' JavaScript:alert(1)' }), destination('d', 'Unread', 'send', { href: 'http://[' }), destination('e', 'Plain', 'help', { target: 'new', targetLabel: 'opens in a new tab' })] }],
    });
    await expect(cell(page, 'odd', 0)).toHaveJSProperty('localName', 'a');
    await expect(cell(page, 'odd', 0)).not.toHaveAttribute('target');
    for (const n of [1, 2, 3, 4]) {
      await expect(cell(page, 'odd', n), String(n)).toHaveJSProperty('localName', 'button');
      await expect(cell(page, 'odd', n), String(n)).not.toHaveAttribute('href');
      await expect(cell(page, 'odd', n), String(n)).not.toHaveAttribute('target');
      await expect(cell(page, 'odd', n), String(n)).not.toHaveAttribute('aria-description');
      // A destination without a destination is a button: the bar selects it, as ever.
      expect(await item(page, 'odd', n).evaluate((el: any) => el.value)).toBe('bcde'[n - 1]);
    }
    await expect(bar(page, 'odd').getByRole('button')).toHaveCount(4);
    await expect.poll(() => seen.filter((w) => w.includes('(NVB-33)')).length).toBe(3);
    const text = seen.join('\n');
    expect(text).toMatch(/target "sidebar" is not a value it defines.*NVB-33/);
    expect(text).toMatch(/href names a script to run.*NVB-33/);
    expect(text).toMatch(/href "http:\/\/\[" cannot be read as an address.*NVB-33/);
    expect(seen.filter((w) => w.includes('NVB-32'))).toEqual([]);
    await wire(page);
    await cell(page, 'odd', 2).click();
    expect(await log(page)).toEqual(['change:c']);
    expect(await value(page, 'odd')).toBe('c');
  });

  test('NVB-2, NVB-30: in links-disabled the disabled link keeps the link role with the disabled state and no address, is drawn from the disabled tokens, leaves the focus order, and nothing opens it or emits for it — a click, a control-click, click() or a drag across it', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('links-disabled') });
    await page.mouse.move(0, 0);
    const disabled = cell(page, 'links-disabled', 1);
    expect(await disabled.evaluate((el) => [el.localName, el.getAttribute('href'), el.getAttribute('role'), el.getAttribute('aria-disabled'), el.getAttribute('draggable')])).toEqual(['a', null, 'link', 'true', 'false']);
    await expect(bar(page, 'links-disabled').getByRole('link', { name: 'Search', disabled: true })).toHaveCount(1);
    if (browserName === 'chromium') expect((await axDestinations(page)).map((node) => `${node.role}:${node.name}:${node.current}:${node.disabled}`)).toEqual(['link:Home:page:false', 'link:Search::true', 'link:Library::false']);
    await expect.poll(() => drawn(page, 'links-disabled', 1)).toEqual(await expected(page, 'unselected', 'disabled'));
    await wireLinks(page);
    await disabled.click({ force: true });
    await disabled.click({ force: true, modifiers: ['ControlOrMeta'] });
    await item(page, 'links-disabled', 1).evaluate((el: HTMLElement) => el.click());
    await disabled.evaluate((el: HTMLElement) => el.click());
    expect((await log(page)).filter((each) => !/^click:prevented$/.test(each))).toEqual([]);
    expect(page.context().pages().length).toBe(1);
    // Tab goes from Home to Library.
    await tabTo(page, cell(page, 'links-disabled', 0));
    await tab(page);
    expect(await page.evaluate(() => (document.activeElement as any)?.label)).toBe('Library');
    // A drag passes over it and never rests on it (NVB-27): released over it — past the halfway place between its two
    // enabled neighbours — the release chooses the one after it, a link, and never the disabled one (NVB-28).
    await page.evaluate(() => {
      (window as any).log.length = 0;
      (window as any).cancel = true;
    });
    const search = await bounds(container(page, 'links-disabled', 1));
    // (A little past its middle: exactly there the two neighbours are equally near, and which one a fraction of a
    // pixel favours is the engine's layout to say.)
    await dragTo(page, 'links-disabled', 0, search.x + search.width / 2 + 6);
    await releaseAtRest(page);
    await expect.poll(() => log(page)).toEqual(['change:/library/:/library/:/:true', 'click:prevented']);
    await holdSlide(page, 'links-disabled', null);
    await expect.poll(() => moving(page, 'links-disabled')).toBe(false);
    expect(await value(page, 'links-disabled')).toBe('/');
  });

  test('NVB-24, NVB-25, NVB-30: links-rtl is the bar of links mirrored — Home at the right, the same anchors and semantics, Help’s glyph mirrored by the icon set’s list in both copies', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('links', 'links-rtl') });
    await page.mouse.move(0, 0);
    const xs = await Promise.all([0, 1, 2, 3].map(async (n) => (await bounds(cell(page, 'links-rtl', n))).x));
    expect([...xs].sort((a, b) => b - a)).toEqual(xs);
    const ltr = await Promise.all([0, 1, 2, 3].map(async (n) => (await bounds(cell(page, 'links', n))).x));
    expect([...ltr].sort((a, b) => a - b)).toEqual(ltr);
    await expect(bar(page, 'links-rtl').getByRole('link')).toHaveCount(4);
    await expect(bar(page, 'links-rtl').getByRole('link', { name: 'Search' })).toHaveAttribute('aria-current', 'page');
    await expect(cell(page, 'links-rtl', 3)).toHaveAccessibleDescription('opens in a new tab');
    expect(await drawn(page, 'links-rtl', 1)).toEqual(await expected(page, 'selected'));
    // `help` is in the icon set's mirrored list: both copies are drawn mirrored in right-to-left, neither in left-to-right.
    const flipped = (id: string, n: number, part: string) => css(item(page, id, n).locator(part), 'transform').then((value) => value !== 'none');
    for (const part of ['.icon', '.c-icon']) {
      expect(await flipped('links-rtl', 3, part), part).toBe(true);
      expect(await flipped('links', 3, part), part).toBe(false);
      expect(await flipped('links-rtl', 0, part), part).toBe(false);
    }
  });

  test('NVB-30, NVB-7: forced colors — a link destination is drawn in the mode’s own colors, none of the tokens’: an unselected one’s icon and label in a system color the mode gives a link, the selected one on the system’s highlight as a button destination is, and a disabled link as disabled', async ({ page }) => {
    const twin = { id: 'buttons', props: { value: '/search/', label: 'Buttons' }, items: spec.fixtures.find((f) => f.id === 'links')!.items!.map((each) => ({ kind: 'destination', props: { value: each.props.href, label: each.props.label, icon: each.props.icon } })) };
    await mountFixtures(page, spec, { icons: true, fixtures: [...fixtures('links', 'links-disabled'), twin] });
    await page.emulateMedia({ forcedColors: 'active' });
    // Whether the engine really repaints: one may answer the media query and still draw the author's colors.
    const forced = await page.evaluate(() => {
      const probe = document.body.appendChild(document.createElement('div'));
      probe.style.color = 'rgb(1, 2, 3)';
      const repainted = matchMedia('(forced-colors: active)').matches && getComputedStyle(probe).color !== 'rgb(1, 2, 3)';
      probe.remove();
      return repainted;
    });
    test.skip(!forced, 'forced colors are not emulated by this browser');
    await page.mouse.move(0, 0);
    const system = (name: string) =>
      page.evaluate((color) => {
        const probe = document.body.appendChild(document.createElement('span'));
        probe.style.color = color;
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      }, name);
    const [text, button, linkText, gray, highlight, highlightText] = [await system('CanvasText'), await system('ButtonText'), await system('LinkText'), await system('GrayText'), await system('Highlight'), await system('HighlightText')];
    const colors = (id: string, n: number) =>
      item(page, id, n).evaluate(async (el) => {
        const root = el.shadowRoot!;
        await Promise.all(root.getAnimations().map((a) => a.finished.catch(() => undefined)));
        const [icon, label] = ['.icon', '.label'].map((part) => getComputedStyle(root.querySelector(part)!).color);
        return { icon, label, indicator: getComputedStyle(root.querySelector('.indicator')!).backgroundColor };
      });
    // Unselected: the mode's color for a link (the person's own palette) or for text — never a token's color.
    for (const n of [0, 2, 3]) {
      const drawn = await colors('links', n);
      expect([text, button, linkText], `links/${n} icon`).toContain(drawn.icon);
      expect([text, button, linkText], `links/${n} label`).toContain(drawn.label);
    }
    // Selected: the system's highlight under the highlight's text color, on a link as on a button.
    const [selected, twinSelected] = [await colors('links', 1), await colors('buttons', 1)];
    expect(selected.indicator).toBe(highlight);
    expect(selected.icon).toBe(highlightText);
    expect([selected.indicator, selected.icon]).toEqual([twinSelected.indicator, twinSelected.icon]);
    // The covered copy is not drawn in the mode: each destination is one icon and one label.
    expect(await item(page, 'links', 1).evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('.covered')!).display)).toBe('none');
    // The disabled link has no address, so it is no link to the mode: it reads as disabled.
    expect(await colors('links-disabled', 1)).toMatchObject({ icon: gray, label: gray });
  });
});

test.describe('direction', () => {
  test('NVB-24: the direction comes from the nearest ancestor that sets one, and a change of it is drawn at once with the selection kept; a drag carries the indicator to where the pointer is in either direction', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: fixtures('four-destinations') });
    await wire(page);
    expect(await bar(page, 'four-destinations').evaluate((el) => 'dir' in (el.constructor as any).properties)).toBe(false);
    const stage = page.locator('[data-fixture="four-destinations"]');
    const xs = () => Promise.all([0, 1, 2, 3].map(async (n) => (await bounds(container(page, 'four-destinations', n))).x));
    const ltr = await xs();
    // (A slide begun by mistake would be running whenever the question comes.)
    await override(page, { [T('motion-selection-duration')]: '20000ms' });
    await stage.evaluate((el) => el.setAttribute('dir', 'rtl'));
    const rtl = await xs();
    expect(rtl).toEqual([...ltr].reverse());
    expect(await pill(page, 'four-destinations').evaluate((el) => el.getAnimations().length)).toBe(0);
    await expect(item(page, 'four-destinations', 0).locator('.cell')).toHaveAttribute('aria-current', 'page');
    // Right-to-left: Inbox is at the right; a drag toward the left carries the indicator toward Sent.
    const [a, b] = [await bounds(container(page, 'four-destinations', 0)), await bounds(container(page, 'four-destinations', 1))];
    expect(b.x).toBeLessThan(a.x);
    await dragTo(page, 'four-destinations', 0, a.x - 20);
    const box = await bounds(pill(page, 'four-destinations'));
    expect(box.x).toBeCloseTo(a.x - (a.width / 2 + 20) , 0);
    await releaseAtRest(page);
    await expect.poll(() => value(page, 'four-destinations')).toBe('sent');
    expect(await log(page)).toEqual(['change:sent']);
  });

  test('NVB-26: a label that does not fit is cut at the end of its own direction, in both copies — a left-to-right label at its right end in a right-to-left bar, a right-to-left label at its left end in a left-to-right bar — and stays centred', async ({ page }) => {
    const long = spec.fixtures.find((f) => f.id === 'long-labels')!;
    const arabic: Fixture = { ...long, id: 'arabic', items: long.items!.map((each, index) => (index === 0 ? { ...each, props: { ...each.props, label: ARABIC_LONG } } : each)) };
    await mountFixtures(page, spec, { icons: true, fixtures: [{ ...long, id: 'rtl', direction: 'rtl' }, arabic] });
    expect(await css(bar(page, 'rtl'), 'direction')).toBe('rtl');
    // The fixture's long labels are left-to-right: in a right-to-left bar each begins at its box's left edge and loses
    // its right end.
    let cut = 0;
    for (const n of [0, 1, 2, 3, 4]) {
      for (const copy of ['.label', '.c-label']) {
        const e = await cutEnds(item(page, 'rtl', n).locator(copy));
        expect([e.direction, e.textOverflow], `${n} ${copy}`).toEqual(['ltr', 'ellipsis']);
        expect(await css(item(page, 'rtl', n).locator(copy), 'unicode-bidi')).toBe('plaintext');
        expect(await css(item(page, 'rtl', n).locator(copy), 'text-align')).toBe('center');
        if (!e.overflows) continue;
        cut++;
        expect(e.first.left, `${n} ${copy}`).toBeCloseTo(e.box.left, 0);
        expect(e.last.left, `${n} ${copy}`).toBeGreaterThan(e.first.left);
      }
    }
    expect(cut).toBeGreaterThanOrEqual(2);
    // A right-to-left label in a left-to-right bar: it begins at the right and loses its left end.
    for (const copy of ['.label', '.c-label']) {
      const e = await cutEnds(item(page, 'arabic', 0).locator(copy));
      expect([e.overflows, e.direction], copy).toEqual([true, 'rtl']);
      expect(e.first.right, copy).toBeCloseTo(e.box.right, 0);
      expect(e.last.right, copy).toBeLessThan(e.first.right);
    }
  });
});

test.describe('the first frame', () => {
  test('NVB-15, NVB-22: a bar is first drawn with its selection in place — every destination, the first included, is told what it is before it first renders, so no frame shows the selected one unselected and nothing moves or recolors', async ({ page }) => {
    // What the page sees from before the elements are defined: in every frame, what animates in any destination, and
    // whether the selected destination's cell is drawn selected.
    // Both motions are 20 s here: a frame sees whatever began before it, however far apart a slow runner's frames are
    // (a state motion of its own length is over between two frames of WebKit on Linux, and the watch would see nothing).
    const WATCH = `(() => {
      // A rule of the page's own, not a write on the root's inline style (test/root-tokens.test.mjs): it is there before
      // the stylesheets of the tokens and wins over them by its importance.
      const lengths = document.createElement('style');
      lengths.textContent = 'html:root{' + ['selection', 'state'].map((motion) => '${T('motion-')}' + motion + '-duration:20000ms !important').join(';') + '}';
      document.documentElement.append(lengths);
      const seen = (window.seen = { frames: [] });
      const moving = (window.moving = (items) => items.flatMap((item) => item.shadowRoot.getAnimations().map((animation) => animation.transitionProperty || animation.animationName || animation.id)));
      const frame = () => {
        const items = [...document.querySelectorAll('tanrei-navigation-bar-item')].filter((item) => item.shadowRoot && item.shadowRoot.querySelector('.cell'));
        if (items.length) {
          seen.frames.push({
            moving: moving(items),
            selected: items.map((item) => item.shadowRoot.querySelector('.cell').classList.contains('selected')),
          });
        }
        if (seen.frames.length < 12) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    })();`;
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const document = await fixturesDocument(spec, { icons: true, fixtures: [four('first'), four('third', { value: 'starred' })] });
    await page.setContent(document.replace('<head>', `<head><script>${WATCH}</script>`));
    await page.waitForFunction(() => (window as any).seen.frames.length >= 12);
    const frames = await page.evaluate(() => (window as any).seen.frames as { moving: string[]; selected: boolean[] }[]);
    expect(frames.flatMap((each) => each.moving)).toEqual([]);
    for (const each of frames) expect(each.selected).toEqual([true, false, false, false, false, false, true, false]);
    // The watch sees a motion where there is one: a new selection, a frame later, in the same words.
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tanrei-comp-navigation-bar-motion-state-duration'))).toBe('20000ms');
    const after = await page.evaluate(async () => {
      const first = document.querySelector<any>('tanrei-navigation-bar')!;
      first.value = 'sent';
      await first.updateComplete;
      const items = [...first.querySelectorAll('tanrei-navigation-bar-item')] as any[];
      await Promise.all(items.map((each) => each.updateComplete));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      return (window as any).moving(items) as string[];
    });
    expect(after).toContain('color');
  });
});
