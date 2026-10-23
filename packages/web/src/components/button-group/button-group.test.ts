// <tanrei-button-group>, driven by specs/button-group.spec.json: every behaviour id (BGR-1…24) is cited by a test title,
// every fixture has a baseline, and every gap, corner, target, divider and padding is read back from the tokens — never
// from a number written here. Its items are the real <tanrei-button>s, labelled and icon-only, so these tests also cover
// what BTN-10 says about an item of a connected group.
//
// An item's box is its container's: under a divider the container ends at the seam and paints the fill alone, and its
// outline and elevation are drawn by its ::after, which reaches past the seam and is cut there
// (src/primitives/group-item.ts).
// BGR-25: the product's ARIA on the host is tested with every other host's, in every engine, in
// src/primitives/delegated-aria.test.ts.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, type FixtureItem, acmeSystemCss, loadSpec, mountFixtures, resolveColor, resolveToken, tab, tabTo, rootTokens } from '../../../test/harness.js';
import { atRatio, shoot, stageBehind } from '../../../test/one-shape.js';
import { decodePng, paintedColor } from '../../../test/png.js';
import { readSeam } from '../../../test/seam.js';
import { motionEnded } from '../../../test/motions.js';

const spec = loadSpec('button-group');
type P = Page;
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const group = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-button-group`);
/** The fixture's nth item as it was given (the DOM order, which the group never changes). */
const item = (page: P, id: string, n: number) => group(page, id).locator(':scope > *').nth(n);
const inner = (page: P, id: string, n: number) => item(page, id, n).locator('button');
const css = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const px = async (locator: Locator, property: string, pseudo?: string) => Number.parseFloat(await css(locator, property, pseudo));
const bounds = async (locator: Locator) => (await locator.boundingBox())!;
const boxes = (page: P, id: string, count: number) => Promise.all(Array.from({ length: count }, (_, n) => bounds(item(page, id, n))));
const T = (name: string) => `--tanrei-comp-button-group-${name}`;
const B = (name: string) => `--tanrei-comp-button-${name}`;
/** The items' text in the placed order: the order of the group's slots, which is the flat tree's. */
const placed = (page: P, id: string) =>
  group(page, id).evaluate((el) => [...el.shadowRoot!.querySelectorAll('slot')].map((slot) => (slot.assignedElements()[0] as HTMLElement | undefined)?.textContent?.trim() ?? ''));
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
/** The four corners of an element, by physical side (left/right as drawn). */
const corners = async (locator: Locator, pseudo?: string) => ({
  topLeft: await px(locator, 'border-top-left-radius', pseudo),
  bottomLeft: await px(locator, 'border-bottom-left-radius', pseudo),
  topRight: await px(locator, 'border-top-right-radius', pseudo),
  bottomRight: await px(locator, 'border-bottom-right-radius', pseudo),
});
const sides = (left: number, right: number) => ({ topLeft: left, bottomLeft: left, topRight: right, bottomRight: right });
const ends = (top: number, bottom: number) => ({ topLeft: top, topRight: top, bottomLeft: bottom, bottomRight: bottom });
/** The transitions running on an item's container that would move its shape or its box. */
const moving = (locator: Locator) =>
  locator.evaluate((el) => el.getAnimations().filter((a) => /radius|margin|padding|clip|inline-size|block-size|width|height/.test((a as CSSTransition).transitionProperty ?? '')).length);
/** How many of a group's dividers are drawn (under gap they are in the tree and not displayed). */
const dividers = (page: P, id: string) => group(page, id).evaluate((el) => [...el.shadowRoot!.querySelectorAll('.divider')].filter((divider) => getComputedStyle(divider).display !== 'none').length);

/**
 * BGR-24: what each seam of a group carries, in the placed order — `none` where no line is drawn, else the color its
 * line is drawn in (the computed background of the divider's line).
 */
const seams = (page: P, id: string) =>
  group(page, id).evaluate((el) =>
    [...el.shadowRoot!.querySelectorAll('.divider')].map((divider) => {
      const line = getComputedStyle(divider, '::before');
      return getComputedStyle(divider).display === 'none' || line.display === 'none' || line.content === 'none' ? 'none' : line.backgroundColor;
    }),
  );

// Items, as a fixture lists them: a labelled Button, and an icon-only one (its glyph in the icon slot, named by label).
const b = (content: string, props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'button', props: { variant: 'outlined', ...props }, content });
const i = (glyph: string, props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'button', props: { variant: 'text', icon: glyph, label: glyph, ...props } });
const fixture = (id: string, items: FixtureItem[], props: Fixture['props'] = {}): Fixture => ({ id, props: { variant: 'connected', ...props }, items });

/** Logs every click and change the items fire, by their text (an icon-only item's is its glyph's name). */
const wire = (page: P) =>
  page.evaluate(() => {
    const log: string[] = ((window as any).log = []);
    for (const el of document.querySelectorAll('tanrei-button-group > *')) {
      const name = el.textContent!.trim();
      el.addEventListener('click', () => log.push(`click:${name}`));
      el.addEventListener('change', (e) => log.push(`change:${name}:${(e as CustomEvent).detail.selected}`));
    }
  });
const log = (page: P) => page.evaluate(() => (window as any).log as string[]);
/** The spec's fixtures by id: a page of a few stages, where a test walks the page with Tab. */
const only = (...ids: string[]) => spec.fixtures.filter((f) => ids.includes(f.id));
/** Every stage of the spec is in the window, so that a pointer reaches any of them: the page is taller than a screen. */
const WINDOW = { width: 1280, height: 7200 };

test.describe('layout', () => {
  test.use({ viewport: WINDOW });
  test('BGR-1: one row in the placed order — standard: standard.gap apart and centred on the row’s middle; connected: connected.gap apart under gap, touching under divider, every item stretched to the tallest', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        ...spec.fixtures,
        fixture('mixed-standard', [b('Small', { size: 'small' }), b('Large', { size: 'large' }), i('edit', { size: 'small' })], { variant: 'standard' }),
        fixture('mixed-connected', [b('Small', { size: 'small' }), b('Large', { size: 'large' }), i('edit', { size: 'small' })]),
      ],
    });
    const standardGap = await resolveToken(page, T('standard-gap'));
    const connectedGap = await resolveToken(page, T('connected-gap'));
    expect(standardGap).toBeGreaterThan(connectedGap);
    expect(connectedGap).toBeGreaterThan(0);
    // The default system's separation is divider: a connected fixture that leaves it auto touches (BGR-21).
    const rows = [['standard', standardGap], ['standard-icon-only', standardGap], ['mixed-standard', standardGap], ['connected-gap', connectedGap], ['connected-gap-toggles', connectedGap], ['connected', 0], ['connected-divider', 0], ['connected-large', 0], ['mixed-connected', 0]] as const;
    for (const [id, gap] of rows) {
      const row = await boxes(page, id, 3);
      for (const n of [1, 2]) expect(row[n].x - (row[n - 1].x + row[n - 1].width), `${id} ${n}`).toBeCloseTo(gap, 1);
      // The group is as wide as its row (its natural width) and starts where the stage's content starts.
      const whole = await bounds(group(page, id));
      expect(whole.width, id).toBeCloseTo(row[2].x + row[2].width - row[0].x, 1);
      expect(row[0].x, id).toBeCloseTo(whole.x, 1);
    }
    // In order: the fixture's first item is drawn first.
    expect(await placed(page, 'standard')).toEqual(['Cancel', 'Save draft', 'Publish']);
    // Standard: each at its own height, centred on the row's middle.
    const standard = await boxes(page, 'mixed-standard', 3);
    expect(standard[0].height).toBeCloseTo(await resolveToken(page, B('container-height-small')), 1);
    expect(standard[1].height).toBeCloseTo(await resolveToken(page, B('container-height-large')), 1);
    for (const box of standard) expect(box.y + box.height / 2).toBeCloseTo(standard[1].y + standard[1].height / 2, 1);
    // Connected: every item as tall as the tallest, the small icon-only Button included (its height is a minimum).
    const connected = await boxes(page, 'mixed-connected', 3);
    for (const box of connected) {
      expect(box.height).toBeCloseTo(await resolveToken(page, B('container-height-large')), 1);
      expect(box.y).toBeCloseTo(connected[0].y, 1);
    }
  });

  test('BGR-2: connected row — the first item’s start and the last one’s end corners are connected.horizontal.outer-shape held to half the height; a corner facing a neighbour is connected.inner-shape under gap and square under divider; standard leaves every corner as the item draws it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const innerShape = await resolveToken(page, T('connected-inner-shape'));
    const outerShape = await resolveToken(page, T('connected-horizontal-outer-shape'));
    const own = await resolveToken(page, B('container-shape'));
    expect(innerShape).toBeGreaterThan(0);
    for (const [id, facing] of [['connected-gap', innerShape], ['connected-gap-filled', innerShape], ['connected', 0], ['connected-divider', 0], ['connected-large', 0], ['connected-disabled', 0]] as const) {
      // The outer shape is the full step in the default system: capped at half the item's height.
      const outer = Math.min(outerShape, (await bounds(item(page, id, 0))).height / 2);
      expect(outer, id).toBeGreaterThan(innerShape);
      expect(await corners(inner(page, id, 0)), id).toEqual(sides(outer, facing));
      expect(await corners(inner(page, id, 1)), id).toEqual(sides(facing, facing));
      expect(await corners(inner(page, id, 2)), id).toEqual(sides(facing, outer));
    }
    // A corner smaller than half the height is drawn as the token says.
    await group(page, 'connected-gap').evaluate((el, name) => (el as HTMLElement).style.setProperty(name, '10px'), T('connected-horizontal-outer-shape'));
    expect(await corners(inner(page, 'connected-gap', 0))).toEqual(sides(10, innerShape));
    for (const n of [0, 1, 2]) {
      expect(await corners(inner(page, 'standard', n))).toEqual(sides(own, own));
      expect(await corners(inner(page, 'standard-icon-only', n))).toEqual(sides(own, own));
    }
    // The outline follows the corners: it is an inset ring on the container's ::after, which has the container's corners.
    expect(await css(inner(page, 'connected-gap', 1), 'box-shadow', '::after')).toContain('inset');
    expect(await corners(inner(page, 'connected-gap', 1), '::after')).toEqual(await corners(inner(page, 'connected-gap', 1)));
  });

  test('BGR-2: the focus ring follows the joined corners, concentric — under gap and under divider; so does the ripple (m3-like), inside the outline', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: only('connected-gap', 'connected-divider') });
    const innerShape = await resolveToken(page, T('connected-inner-shape'));
    const edge = (await resolveToken(page, '--tanrei-sys-focus-offset')) + (await resolveToken(page, '--tanrei-sys-focus-inner-width'));
    for (const [id, facing] of [['connected-gap', innerShape], ['connected-divider', 0]] as const) {
      const outer = (await bounds(item(page, id, 0))).height / 2;
      await tabTo(page, item(page, id, 0));
      expect(await corners(inner(page, id, 0), '::after'), id).toEqual(sides(outer + edge, facing + edge));
      await tab(page);
      await expect(item(page, id, 1)).toBeFocused();
      expect(await corners(inner(page, id, 1), '::after'), id).toEqual(sides(facing + edge, facing + edge));
    }

    await mountFixtures(page, spec, { icons: true, system: 'm3-like' });
    const m3Inner = await resolveToken(page, T('connected-inner-shape'));
    const outline = await resolveToken(page, B('outline-width-medium'));
    const box = await bounds(inner(page, 'connected', 2));
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    const ripple = inner(page, 'connected', 2).locator('.ripple');
    await expect(ripple).toHaveCount(1);
    const drawn = await corners(ripple);
    expect(drawn.topLeft).toBeCloseTo(m3Inner - outline, 1);
    expect(drawn.bottomLeft).toBeCloseTo(m3Inner - outline, 1);
    // The last item's outer corners are the pill's caps, held to half its height.
    expect(drawn.topRight).toBeCloseTo(box.height / 2 - outline, 1);
    await page.mouse.up();
  });

  test('BGR-2 focus-style and smoothing: cupertino eases an inner corner and leaves a pill end round; under acme the glow follows the corners, from the offset out', async ({ page }) => {
    test.setTimeout(240_000);
    await mountFixtures(page, spec, { system: 'cupertino', fixtures: only('connected-gap') });
    const smoothing = Number.parseFloat(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tanrei-sys-shape-corner-smoothing')));
    expect(smoothing).toBeGreaterThan(0);
    const cupertinoInner = await resolveToken(page, T('connected-inner-shape'));
    if (await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'))) {
      // The middle item has no pill end: its inner corners take the smoothing's radius scale and curve.
      expect(await px(inner(page, 'connected-gap', 1), 'border-top-left-radius')).toBeCloseTo(cupertinoInner * (1 + 0.4 * smoothing), 2);
      expect(await css(inner(page, 'connected-gap', 1), 'corner-top-left-shape')).toMatch(/^superellipse/);
      expect(await css(inner(page, 'connected-gap', 1), 'corner-top-left-shape')).not.toMatch(/^superellipse\(1\)$/);
      // The first item's outer end is the full step — a pill, which the smoothing leaves round (styles/shape.ts).
      expect(await css(inner(page, 'connected-gap', 0), 'corner-top-left-shape')).toMatch(/^(round|superellipse\(1\))$/);
    } else {
      expect(await px(inner(page, 'connected-gap', 1), 'border-top-left-radius')).toBeCloseTo(cupertinoInner, 2);
    }
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss(), fixtures: only('connected-gap') });
    const innerShape = await resolveToken(page, T('connected-inner-shape'));
    const offset = await resolveToken(page, '--tanrei-sys-focus-offset');
    await tabTo(page, item(page, 'connected-gap', 1));
    await expect(inner(page, 'connected-gap', 1)).toHaveCSS('outline-color', 'rgba(0, 0, 0, 0)');
    const glow = await corners(inner(page, 'connected-gap', 1), '::after');
    const scale = (await px(inner(page, 'connected-gap', 1), 'border-top-left-radius')) / innerShape;
    expect(glow.topLeft).toBeCloseTo(innerShape * scale + offset, 1);
    expect(glow.topRight).toBeCloseTo(innerShape * scale + offset, 1);
  });

  test('BGR-2: pill items (m3-like, whose separation is gap) keep round caps at their outer ends and the group’s inner corners where they meet', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, system: 'm3-like' });
    const innerShape = await resolveToken(page, T('connected-inner-shape'));
    for (const id of ['connected', 'connected-toggles', 'connected-large']) {
      const first = await bounds(item(page, id, 0));
      const drawn = await corners(inner(page, id, 0));
      expect(drawn.topLeft, id).toBeCloseTo(first.height / 2, 1);
      expect(drawn.topRight, id).toBeCloseTo(innerShape, 1);
    }
  });

  test('BGR-3: connected items are at least the target along the join — wide in a row (an icon-only Button widens around its icon), high in a column — and reach the target across it; touch for a coarse pointer', async ({ page, browserName }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [...spec.fixtures, fixture('small-column', [b('Day', { size: 'small' }), b('Week', { size: 'small' })], { orientation: 'vertical', separation: 'gap' })],
    });
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    const size = await resolveToken(page, B('container-height-medium'));
    const small = await resolveToken(page, B('container-height-small'));
    const outerInset = await resolveToken(page, T('connected-horizontal-outer-inset'));
    expect(size).toBeLessThan(pointer);
    // A row: the middle item is exactly the target wide; an end item is that and the padding of BGR-23.
    for (const [n, extra] of [[0, outerInset], [1, 0], [2, outerInset]] as const) {
      const box = await bounds(item(page, 'connected-gap-toggles', n));
      expect(box.width, `item ${n}`).toBeCloseTo(pointer + extra, 1);
      expect(box.height).toBeCloseTo(size, 1);
    }
    const middle = await bounds(item(page, 'connected-gap-toggles', 1));
    const icon = await bounds(item(page, 'connected-gap-toggles', 1).locator('.icon'));
    expect(icon.x + icon.width / 2).toBeCloseTo(middle.x + middle.width / 2, 1);
    // Standard icon-only Buttons keep their square.
    expect((await bounds(item(page, 'standard-icon-only', 0))).width).toBeCloseTo(size, 1);
    // Above and below the row: the hit area reaches the target.
    expect(await px(inner(page, 'connected-gap-toggles', 1), 'height', '::before')).toBeCloseTo(pointer, 1);
    await wire(page);
    await page.mouse.click(middle.x + middle.width / 2, middle.y - (pointer - middle.height) / 2 + 1);
    expect(await log(page)).toEqual(['click:format_italic', 'change:format_italic:true']);
    // A column: every item is at least the target high, its content centred; its width is its own (the column's).
    for (const id of ['connected-vertical-toggles', 'small-column']) {
      for (const n of [0, 1]) {
        const box = await bounds(item(page, id, n));
        expect(box.height, `${id} ${n}`).toBeCloseTo(pointer, 1);
        const content = await bounds(item(page, id, n).locator(id === 'small-column' ? '.label' : '.icon'));
        expect(content.y + content.height / 2, `${id} ${n}`).toBeCloseTo(box.y + box.height / 2, 0);
      }
    }
    expect(small).toBeLessThan(pointer);
    expect((await bounds(item(page, 'connected-vertical-toggles', 0))).width).toBeCloseTo(size, 1);
    if (browserName !== 'chromium') return;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    await expect.poll(async () => (await bounds(item(page, 'connected-gap-toggles', 1))).width).toBeCloseTo(touch, 1);
    await expect.poll(async () => (await bounds(item(page, 'connected-vertical-toggles', 1))).height).toBeCloseTo(touch, 1);
  });

  for (const orientation of ['horizontal', 'vertical'] as const) {
    test(`BGR-4: standard, ${orientation} — a press on an item’s visible bounds goes to that item, a press in the gap to the nearer one; the outer ends reach the whole target`, async ({ page }) => {
      const column = orientation === 'vertical';
      await mountFixtures(page, spec, { icons: true, fixtures: [fixture('small', [i('edit', { size: 'small' }), i('share', { size: 'small' }), i('delete', { size: 'small' })], { variant: 'standard', orientation })] });
      const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
      const touch = await resolveToken(page, '--tanrei-sys-target-touch');
      const along = (box: { x: number; y: number; width: number; height: number }) => (column ? { start: box.y, size: box.height } : { start: box.x, size: box.width });
      // The default's gap leaves even the small icon-only Button its whole touch target between neighbours.
      expect(await resolveToken(page, T('standard-gap'))).toBeGreaterThanOrEqual(touch - along(await bounds(item(page, 'small', 0))).size);
      // A layer with a narrower gap (8), in which the hit areas would overlap: what BGR-4 decides.
      const gap = 8;
      await page.evaluate(([name, value]) => (document.querySelector('[data-fixture="small"]') as HTMLElement).style.setProperty(name, value), [T('standard-gap'), `${gap}px`]);
      await expect.poll(async () => along(await bounds(item(page, 'small', 1))).start - along(await bounds(item(page, 'small', 0))).start).toBeCloseTo(along(await bounds(item(page, 'small', 0))).size + gap, 1);
      const a = await bounds(item(page, 'small', 0));
      const c = await bounds(item(page, 'small', 1));
      const [A, C] = [along(a), along(c)];
      const reach = (pointer - A.size) / 2;
      // The hit areas would overlap in the gap if each reached the whole target.
      expect(reach).toBeGreaterThan(gap / 2);
      await wire(page);
      const click = (at: number) => (column ? page.mouse.click(a.x + a.width / 2, at) : page.mouse.click(at, a.y + a.height / 2));
      await click(A.start + A.size - 1); // A's own bounds
      await click(A.start + A.size + gap / 2 - 1); // the gap, nearer A
      await click(C.start - gap / 2 + 1); // the gap, nearer B
      await click(C.start + 1); // B's own bounds
      await click(A.start - reach + 1); // A's outer end, as far as it reaches alone
      expect(await log(page)).toEqual(['click:edit', 'click:edit', 'click:share', 'click:share', 'click:edit']);
      // No hit area reaches over a neighbour's visible bounds.
      const hits = await Promise.all(
        [0, 1, 2].map((n) =>
          inner(page, 'small', n).evaluate((el, vertical) => {
            const r = getComputedStyle(el, '::before');
            const box = el.getBoundingClientRect();
            return vertical ? { start: box.top + Number.parseFloat(r.top), end: box.bottom - Number.parseFloat(r.bottom) } : { start: box.left + Number.parseFloat(r.left), end: box.right - Number.parseFloat(r.right) };
          }, column),
        ),
      );
      expect(hits[0].end).toBeLessThanOrEqual(C.start + 0.5);
      expect(hits[1].start).toBeGreaterThanOrEqual(A.start + A.size - 0.5);
      expect(hits[0].start).toBeCloseTo(A.start - reach, 1);
    });
  }

  test('BGR-7: a row wider than its space narrows its Buttons in proportion to their widths, down to their longest word, wrapping their labels; icon-only Buttons keep their size; it never wraps or scrolls, and a row that still does not fit is reported', async ({ page }) => {
    const seen = warnings(page);
    const items = [b('Save the draft'), b('Publish everything now', { variant: 'filled' }), i('delete')];
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('wide', items, { variant: 'standard' }), fixture('narrow', items, { variant: 'standard' }), fixture('tiny', items, { variant: 'standard' })] });
    const natural = await boxes(page, 'wide', 3);
    const height = natural[0].height;
    const size = await resolveToken(page, B('container-height-medium'));
    const room = natural[2].x + natural[2].width - natural[0].x - 60;
    await page.addStyleTag({ content: `.stage[data-fixture='narrow'] { inline-size: ${room}px; } .stage[data-fixture='tiny'] { inline-size: 60px; }` });
    await expect.poll(async () => (await bounds(group(page, 'narrow'))).width).toBeCloseTo(room, 0);
    const narrowed = await boxes(page, 'narrow', 3);
    // In proportion to their widths: each Button gives up the same share of its own width.
    const share = (n: number) => (natural[n].width - narrowed[n].width) / natural[n].width;
    expect(share(0)).toBeGreaterThan(0);
    expect(share(0)).toBeCloseTo(share(1), 1);
    // Their labels wrap, so they grow; the icon-only Button keeps its size; one row.
    expect(narrowed[1].height).toBeGreaterThan(height);
    expect(narrowed[2].width).toBeCloseTo(size, 1);
    expect(narrowed[2].height).toBeCloseTo(size, 1);
    for (const box of narrowed) expect(box.y).toBeLessThan(narrowed[1].y + narrowed[1].height);
    for (const n of [1, 2]) expect(narrowed[n].x).toBeGreaterThan(narrowed[n - 1].x + narrowed[n - 1].width);
    // The rows that fit (the natural one and the narrowed one) are not reported; only the 60 px one is, below.
    expect(seen.filter((w) => w.includes('BGR-7') && !w.includes('has 60 px'))).toEqual([]);
    // Too narrow even at their longest words: still one row, never narrower than the longest word, and reported.
    const tiny = await boxes(page, 'tiny', 3);
    // No Button is narrower than its longest word: no label overflows its box.
    for (const n of [0, 1]) {
      const label = item(page, 'tiny', n).locator('.label');
      expect(await label.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    }
    for (const n of [1, 2]) expect(tiny[n].x).toBeGreaterThan(tiny[n - 1].x + tiny[n - 1].width - 0.5);
    expect(await group(page, 'tiny').evaluate((el) => getComputedStyle(el).overflowX)).toBe('visible');
    await expect.poll(() => seen.filter((w) => w.includes('BGR-7')).length).toBe(1);
    expect(seen.join('\n')).toMatch(/the row needs \d+ px but has 60 px.*\(BGR-7\)/);
  });

  test('BGR-8: right-to-left — a row starts at the right: the dismissive item at the right, the confirming one at the left, the first placed item’s outer corners on its right and the inner corners mirrored; a column keeps its top-to-bottom order', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    // The fixture the spec draws in right-to-left (its stage carries dir).
    expect(await stage(page, 'order-rtl').getAttribute('dir')).toBe('rtl');
    expect(await placed(page, 'order-rtl')).toEqual(['Cancel', 'OK']);
    const [cancel, ok] = await boxes(page, 'order-rtl', 2);
    expect(cancel.x).toBeGreaterThan(ok.x + ok.width);
    const whole = await bounds(group(page, 'order-rtl'));
    expect(cancel.x + cancel.width).toBeCloseTo(whole.x + whole.width, 1);
    // A connected row: mirrored corners, under gap and under divider.
    const innerShape = await resolveToken(page, T('connected-inner-shape'));
    for (const [id, facing] of [['connected-gap', innerShape], ['connected-divider', 0]] as const) {
      await stage(page, id).evaluate((el) => el.setAttribute('dir', 'rtl'));
      const row = await boxes(page, id, 3);
      expect(row[0].x, id).toBeGreaterThan(row[1].x);
      expect(row[1].x, id).toBeGreaterThan(row[2].x);
      const outer = row[0].height / 2;
      expect(await corners(inner(page, id, 0)), id).toEqual(sides(facing, outer));
      expect(await corners(inner(page, id, 2)), id).toEqual(sides(outer, facing));
    }
    // A column: the confirming item on top in either direction (BGR-14).
    await stage(page, 'order-cancel-ok-vertical').evaluate((el) => el.setAttribute('dir', 'rtl'));
    expect(await placed(page, 'order-cancel-ok-vertical')).toEqual(['OK', 'Cancel']);
    const [cancelV, okV] = await boxes(page, 'order-cancel-ok-vertical', 2);
    expect(okV.y + okV.height).toBeLessThanOrEqual(cancelV.y);
  });

  test('BGR-9: a variant, an orientation or a separation the group does not define renders as that prop’s default, and a debug build reports it', async ({ page }) => {
    const seen = warnings(page);
    const three = [b('Cut'), b('Copy'), b('Paste')];
    await mountFixtures(page, spec, {
      fixtures: [fixture('odd', three, { variant: 'diagonal' }), fixture('odd-orientation', three, { variant: 'standard', orientation: 'sideways' }), fixture('odd-separation', three, { separation: 'zipper' }), fixture('auto', three)],
    });
    const own = await resolveToken(page, B('container-shape'));
    // An unknown variant: standard.
    const odd = await boxes(page, 'odd', 2);
    expect(odd[1].x - odd[0].x - odd[0].width).toBeCloseTo(await resolveToken(page, T('standard-gap')), 1);
    expect(await corners(inner(page, 'odd', 1))).toEqual(sides(own, own));
    // An unknown orientation: one row.
    const sideways = await boxes(page, 'odd-orientation', 3);
    for (const n of [1, 2]) {
      expect(sideways[n].x).toBeGreaterThan(sideways[n - 1].x + sideways[n - 1].width);
      expect(sideways[n].y).toBeCloseTo(sideways[0].y, 1);
    }
    // An unknown separation: auto — what the same group draws with none set.
    expect((await boxes(page, 'odd-separation', 3)).map((box) => [box.x, box.width])).toEqual((await boxes(page, 'auto', 3)).map((box) => [box.x, box.width]));
    expect(await corners(inner(page, 'odd-separation', 1))).toEqual(await corners(inner(page, 'auto', 1)));
    await expect.poll(() => seen.filter((w) => w.includes('BGR-9')).length).toBe(3);
    expect(seen.join('\n')).toMatch(/variant "diagonal" is not a value of the button group; it is drawn as "standard" \(BGR-9\)/);
    expect(seen.join('\n')).toMatch(/orientation "sideways" is not a value of the button group; it is drawn as "horizontal" \(BGR-9\)/);
    expect(seen.join('\n')).toMatch(/separation "zipper" is not a value of the button group; it is drawn as "auto" \(BGR-9\)/);
  });

  test('BGR-10: fewer than two items, or content that is not a Tanrei Button, still renders — a single item with every corner as it draws it — and a debug build reports it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [fixture('one', [b('Alone')]), fixture('plain', [b('Alone'), b('Too')], { variant: 'standard' }), { id: 'foreign', props: { variant: 'connected' }, content: '<tanrei-button variant="outlined">Cut</tanrei-button><span class="other">Other</span><tanrei-button variant="outlined">Paste</tanrei-button>' }],
    });
    await expect(inner(page, 'one', 0)).toBeVisible();
    // A single item of a connected group: its own corners, no padding added, no seam.
    const own = Math.min(await resolveToken(page, B('container-shape')), (await bounds(item(page, 'one', 0))).height / 2);
    // (The item's own shape is the full step in the default system: a pill, held to half its height.)
    expect(await corners(inner(page, 'one', 0))).toEqual(sides(own, own));
    // No edge of it is a seam: its container is the item's own box, reaching past nothing.
    expect(await css(inner(page, 'one', 0), 'margin')).toBe('0px');
    expect(await bounds(inner(page, 'one', 0))).toEqual(await bounds(item(page, 'one', 0)));
    expect((await bounds(item(page, 'one', 0))).width).toBeCloseTo((await bounds(item(page, 'plain', 0))).width, 1);
    await expect(group(page, 'one').locator('.divider')).toHaveCount(0);
    await expect(page.locator('[data-fixture="foreign"] .other')).toBeVisible();
    // The foreign content is laid out in the row, between its neighbours.
    const [cut, other, paste] = await Promise.all([bounds(item(page, 'foreign', 0)), bounds(page.locator('[data-fixture="foreign"] .other')), bounds(item(page, 'foreign', 2))]);
    expect(other.x).toBeGreaterThanOrEqual(cut.x + cut.width - 0.5);
    expect(paste.x).toBeGreaterThanOrEqual(other.x + other.width - 0.5);
    await expect.poll(() => seen.filter((w) => w.includes('BGR-10')).length).toBe(2);
    expect(seen.join('\n')).toMatch(/it holds 1 item; a button group holds two or more \(BGR-10\)/);
    expect(seen.join('\n')).toMatch(/it holds <span>, which is not a <tanrei-button>.*\(BGR-10\)/);
  });

  test('BGR-11: an item that becomes disabled keeps its place, its dividers and its corners; an item added, removed or flagged is placed again at once — corners, dividers and the outer padding recomputed without animation, focus kept', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: only('connected') });
    const outerInset = await resolveToken(page, T('connected-horizontal-outer-inset'));
    expect(outerInset).toBeGreaterThan(0);
    const padding = await resolveToken(page, B('container-padding-inline-end-medium'));
    const before = await boxes(page, 'connected', 3);
    const cap = before[0].height / 2;
    await item(page, 'connected', 1).evaluate((el: any) => (el.disabled = true));
    await expect(inner(page, 'connected', 1)).toBeDisabled();
    expect(await boxes(page, 'connected', 3)).toEqual(before);
    expect(await corners(inner(page, 'connected', 1))).toEqual(sides(0, 0));
    expect(await dividers(page, 'connected')).toBe(2);
    // Removed: the new last item's end corners are the outer shape, it carries the outer padding, and one divider is
    // left — in the same frame (no transition).
    const endPadding = (n: number) =>
      item(page, 'connected', n).evaluate((el) => {
        const label = el.shadowRoot!.querySelector('.label')!.getBoundingClientRect();
        return el.getBoundingClientRect().right - label.right;
      });
    expect(await endPadding(1)).toBeCloseTo(padding, 1);
    await group(page, 'connected').evaluate(async (el) => {
      el.lastElementChild!.remove();
      await new Promise(requestAnimationFrame);
      await (el as any).updateComplete;
    });
    expect(await corners(inner(page, 'connected', 1))).toEqual(sides(0, cap));
    expect(await moving(inner(page, 'connected', 1))).toBe(0);
    expect(await endPadding(1)).toBeCloseTo(padding + outerInset, 1);
    expect(await dividers(page, 'connected')).toBe(1);
    // Added: the old last item's end corners become inner corners at once, and the new one is placed.
    await group(page, 'connected').evaluate(async (el) => {
      const next = document.createElement('tanrei-button');
      next.setAttribute('variant', 'outlined');
      next.textContent = 'Paste';
      el.append(next);
      await new Promise(requestAnimationFrame);
      await (el as any).updateComplete;
    });
    expect(await corners(inner(page, 'connected', 1))).toEqual(sides(0, 0));
    expect(await corners(inner(page, 'connected', 2))).toEqual(sides(0, cap));
    expect(await moving(inner(page, 'connected', 1))).toBe(0);
    expect(await endPadding(1)).toBeCloseTo(padding, 1);
    expect(await dividers(page, 'connected')).toBe(2);
    // Flagged while it has focus: Cut becomes confirming, moves to the end of the row and keeps the focus.
    await tabTo(page, item(page, 'connected', 0));
    await item(page, 'connected', 0).evaluate(async (el) => {
      el.setAttribute('confirming', '');
      await new Promise(requestAnimationFrame);
      await (el.parentElement as any).updateComplete;
    });
    expect(await placed(page, 'connected')).toEqual(['Copy', 'Paste', 'Cut']);
    await expect(item(page, 'connected', 0)).toBeFocused();
    const moved = await boxes(page, 'connected', 3);
    expect(moved[0].x).toBeGreaterThan(moved[2].x);
    // Out of focus again, the corners are those of its new place: Copy first, Cut last.
    await item(page, 'connected', 0).evaluate((el) => (el as HTMLElement).blur());
    expect(await corners(inner(page, 'connected', 1))).toEqual(sides(cap, 0));
    expect(await corners(inner(page, 'connected', 0))).toEqual(sides(0, cap));
    // Unflagged again: back where it was given.
    await item(page, 'connected', 0).evaluate((el) => el.removeAttribute('confirming'));
    await expect.poll(() => placed(page, 'connected')).toEqual(['Cut', 'Copy', 'Paste']);
  });

  test('BGR-12: a vertical group is one column — each item below the one before, all with the same left and right edge: standard.gap apart, connected.gap apart under gap and touching under divider, as wide as the widest item or as the container while full-width; a narrower column wraps its labels', async ({ page }) => {
    const long = [b('Save the draft'), b('Publish everything now', { variant: 'filled' })];
    await mountFixtures(page, spec, { icons: true, fixtures: [...spec.fixtures, fixture('narrow-column', long, { variant: 'standard', orientation: 'vertical' }), fixture('wide-column', long, { variant: 'standard', orientation: 'vertical' })] });
    const standardGap = await resolveToken(page, T('standard-gap'));
    const connectedGap = await resolveToken(page, T('connected-gap'));
    // BGR-12's verify: every vertical fixture of the spec.
    const columns: Record<string, number> = {
      'connected-vertical': 0,
      'connected-vertical-gap': connectedGap,
      'connected-vertical-toggles': 0,
      'vertical-unflagged': standardGap,
      'order-cancel-ok-vertical': standardGap,
      'order-back-next-vertical': standardGap,
      'order-three-runs-vertical': standardGap,
      'full-width-vertical': standardGap,
    };
    const vertical = spec.fixtures.filter((f) => f.props.orientation === 'vertical');
    expect(vertical.map((f) => f.id).sort()).toEqual(Object.keys(columns).sort());
    for (const f of vertical) {
      const count = f.items!.length;
      // In the placed order (BGR-14), top to bottom.
      const order = await group(page, f.id).evaluate((el) => [...el.shadowRoot!.querySelectorAll('slot')].map((slot) => slot.assignedElements()[0].getBoundingClientRect().toJSON() as { x: number; y: number; width: number; height: number }));
      expect(order).toHaveLength(count);
      const whole = await bounds(group(page, f.id));
      for (let n = 0; n < count; n++) {
        expect(order[n].x, `${f.id} ${n}: left edge`).toBeCloseTo(order[0].x, 1);
        expect(order[n].width, `${f.id} ${n}: right edge`).toBeCloseTo(order[0].width, 1);
        expect(order[n].width, `${f.id} ${n}: as wide as the column`).toBeCloseTo(whole.width, 1);
        if (n > 0) expect(order[n].y - (order[n - 1].y + order[n - 1].height), `${f.id} ${n}: below the one before`).toBeCloseTo(columns[f.id], 1);
      }
      // The item's container fills the item: the content is centred in it.
      const first = item(page, f.id, 0);
      const container = await bounds(first.locator('button'));
      expect(container.width, f.id).toBeGreaterThanOrEqual((await bounds(first)).width - 0.5);
      // Start-aligned at the top of a 400 × 240 stage.
      const box = await stage(page, f.id).evaluate((el) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return { x: rect.x + Number.parseFloat(style.paddingLeft), y: rect.y + Number.parseFloat(style.paddingTop), width: el.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight), height: el.clientHeight - Number.parseFloat(style.paddingTop) - Number.parseFloat(style.paddingBottom) };
      });
      expect([box.width, box.height], f.id).toEqual([400, 240]);
      expect(whole.x, f.id).toBeCloseTo(box.x, 1);
      expect(whole.y, f.id).toBeCloseTo(box.y, 1);
    }
    // As wide as the widest item…
    const three = await boxes(page, 'order-three-runs-vertical', 3);
    const widest = await bounds(item(page, 'order-three-runs-vertical', 1).locator('.label')); // "Save draft"
    const natural = widest.width + (await resolveToken(page, B('container-padding-inline-start-medium'))) + (await resolveToken(page, B('container-padding-inline-end-medium')));
    for (const box of three) expect(box.width).toBeCloseTo(natural, 1);
    // …or as the container, while full-width.
    expect((await bounds(item(page, 'full-width-vertical', 0))).width).toBeCloseTo(400, 1);
    // Given less width than its widest item, every item takes that width and its label wraps; the column does not scroll.
    const height = (await bounds(item(page, 'wide-column', 1))).height;
    await page.addStyleTag({ content: `.stage[data-fixture='narrow-column'] { inline-size: 120px; }` });
    await expect.poll(async () => (await bounds(group(page, 'narrow-column'))).width).toBeCloseTo(120, 0);
    const narrow = await boxes(page, 'narrow-column', 2);
    for (const box of narrow) expect(box.width).toBeCloseTo(120, 0);
    expect(narrow[1].height).toBeGreaterThan(height);
    expect(narrow[1].y).toBeGreaterThanOrEqual(narrow[0].y + narrow[0].height);
    expect(await group(page, 'narrow-column').evaluate((el) => [getComputedStyle(el).overflowX, getComputedStyle(el).overflowY])).toEqual(['visible', 'visible']);
  });

  test('BGR-13: a row places the dismissive items first, then the unflagged, then the confirming, each run in the order given', async ({ page }) => {
    const runs = [b('OK', { confirming: true }), b('Help'), b('Cancel', { dismissive: true }), b('Apply', { confirming: true }), b('Details'), b('Back', { dismissive: true })];
    await mountFixtures(page, spec, { fixtures: [...spec.fixtures, fixture('runs', runs, { variant: 'standard' })] });
    expect(await placed(page, 'order-cancel-ok')).toEqual(['Cancel', 'OK']);
    // Given confirming first: still dismissive first.
    expect(await placed(page, 'order-back-next')).toEqual(['Back', 'Next']);
    const [next, back] = await boxes(page, 'order-back-next', 2);
    expect(back.x + back.width).toBeLessThanOrEqual(next.x);
    expect(await placed(page, 'runs')).toEqual(['Cancel', 'Back', 'Help', 'Details', 'OK', 'Apply']);
    // Drawn in that order from the start, and the children are not moved in the author's DOM.
    const drawn = await group(page, 'runs').evaluate((el) => [...el.children].sort((x, y) => x.getBoundingClientRect().x - y.getBoundingClientRect().x).map((child) => child.textContent!.trim()));
    expect(drawn).toEqual(['Cancel', 'Back', 'Help', 'Details', 'OK', 'Apply']);
    expect(await group(page, 'runs').evaluate((el) => [...el.children].map((child) => child.textContent!.trim()))).toEqual(['OK', 'Help', 'Cancel', 'Apply', 'Details', 'Back']);
  });

  test('BGR-14: a column places the confirming items on top, then the unflagged, then the dismissive, each run in the order given, in either layout direction', async ({ page }) => {
    await mountFixtures(page, spec);
    expect(await placed(page, 'order-cancel-ok-vertical')).toEqual(['OK', 'Cancel']);
    expect(await placed(page, 'order-back-next-vertical')).toEqual(['Next', 'Back']);
    expect(await placed(page, 'order-three-runs-vertical')).toEqual(['Publish', 'Save draft', 'Cancel']);
    expect(await placed(page, 'full-width-vertical')).toEqual(['Allow', 'Not now']);
    expect(await placed(page, 'vertical-unflagged')).toEqual(['1', '2', '3']);
    const [cancel, draft, publish] = await boxes(page, 'order-three-runs-vertical', 3);
    expect(publish.y + publish.height).toBeLessThanOrEqual(draft.y);
    expect(draft.y + draft.height).toBeLessThanOrEqual(cancel.y);
    // The orientation changes: the runs change places at once.
    await group(page, 'order-three-runs-vertical').evaluate(async (el: any) => {
      el.orientation = 'horizontal';
      await el.updateComplete;
    });
    expect(await placed(page, 'order-three-runs-vertical')).toEqual(['Cancel', 'Save draft', 'Publish']);
    await stage(page, 'order-cancel-ok-vertical').evaluate((el) => el.setAttribute('dir', 'rtl'));
    expect(await placed(page, 'order-cancel-ok-vertical')).toEqual(['OK', 'Cancel']);
  });

  test('BGR-16: connected column — the first item’s top corners and the last one’s bottom corners are connected.vertical.outer-shape; every other corner is connected.inner-shape under gap and square under divider', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const innerShape = await resolveToken(page, T('connected-inner-shape'));
    const outer = await resolveToken(page, T('connected-vertical-outer-shape'));
    expect(outer).toBeGreaterThan(innerShape);
    for (const [id, facing] of [['connected-vertical-gap', innerShape], ['connected-vertical', 0]] as const) {
      expect(await corners(inner(page, id, 0)), id).toEqual(ends(outer, facing));
      expect(await corners(inner(page, id, 1)), id).toEqual(ends(facing, facing));
      expect(await corners(inner(page, id, 2)), id).toEqual(ends(facing, outer));
    }
    expect(await corners(inner(page, 'connected-vertical-toggles', 0))).toEqual(ends(outer, 0));
    expect(await corners(inner(page, 'connected-vertical-toggles', 1))).toEqual(ends(0, outer));
    // The focus ring follows the column's corners, concentric.
    const edge = (await resolveToken(page, '--tanrei-sys-focus-offset')) + (await resolveToken(page, '--tanrei-sys-focus-inner-width'));
    await item(page, 'connected-vertical', 0).focus();
    await tab(page);
    await tab(page, { back: true });
    await expect(item(page, 'connected-vertical', 0)).toBeFocused();
    expect(await corners(inner(page, 'connected-vertical', 0), '::after')).toEqual(ends(outer + edge, edge));
    // A standard column leaves every corner as the item draws it.
    const own = await resolveToken(page, B('container-shape'));
    expect(await corners(inner(page, 'vertical-unflagged', 1))).toEqual(sides(own, own));
  });

  test('BGR-17: full-width — the row takes its container’s whole width and divides it, less the gaps, into equal shares, a short label centred and an icon-only Button widened around its icon; an item wider than its share keeps its minimum, the others share the rest, and it is reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        ...spec.fixtures,
        fixture('shares', [b('Cancel', { dismissive: true }), i('delete'), b('OK', { confirming: true })], { variant: 'standard', fullWidth: true }),
        fixture('joined-shares', [b('Cut'), b('Copy'), b('Paste')], { fullWidth: true }),
      ],
    });
    const gap = await resolveToken(page, T('standard-gap'));
    expect((await bounds(group(page, 'full-width'))).width).toBeCloseTo(400, 1);
    const pair = await boxes(page, 'full-width', 2);
    for (const box of pair) expect(box.width).toBeCloseTo((400 - gap) / 2, 1);
    // Whatever each holds: a label, an icon alone.
    const shares = await boxes(page, 'shares', 3);
    for (const box of shares) expect(box.width).toBeCloseTo((400 - 2 * gap) / 3, 1);
    const container = await bounds(inner(page, 'shares', 1));
    expect(container.width).toBeCloseTo(shares[1].width, 1);
    const icon = await bounds(item(page, 'shares', 1).locator('.icon'));
    expect(icon.x + icon.width / 2).toBeCloseTo(shares[1].x + shares[1].width / 2, 1);
    const label = await bounds(item(page, 'shares', 0).locator('.label'));
    expect(label.x + label.width / 2).toBeCloseTo(shares[0].x + shares[0].width / 2, 1);
    // None under divider: the joined row's shares are the whole width.
    const joined = await boxes(page, 'joined-shares', 3);
    for (const box of joined) expect(box.width).toBeCloseTo(400 / 3, 1);
    // Not full-width: the natural width.
    expect((await bounds(group(page, 'order-cancel-ok'))).width).toBeLessThan(400);
    await page.waitForTimeout(100);
    expect(seen.filter((w) => w.includes('BGR-17'))).toEqual([]);
    // A share narrower than an item's minimum: that item keeps its longest word, the others share the rest equally.
    await mountFixtures(page, spec, { fixtures: [fixture('long', [b('No'), b('Synchronise'), b('OK')], { variant: 'standard', fullWidth: true })] });
    await page.addStyleTag({ content: `.stage[data-fixture='long'] { inline-size: 300px; }` });
    await expect.poll(async () => (await bounds(group(page, 'long'))).width).toBeCloseTo(300, 0);
    const long = await boxes(page, 'long', 3);
    expect(long[1].width).toBeGreaterThan((300 - 2 * gap) / 3 + 1);
    expect(long[0].width).toBeCloseTo(long[2].width, 1);
    expect(long[0].width + long[1].width + long[2].width + 2 * gap).toBeCloseTo(300, 0);
    expect(await item(page, 'long', 1).locator('.label').evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    await expect.poll(() => seen.filter((w) => w.includes('BGR-17')).length).toBe(1);
  });

  test('BGR-20: the group takes its layout direction from an ancestor, and follows a change of it at once, keeping its order and its items’ state', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const before = await boxes(page, 'connected-toggles', 3);
    expect(before[0].x).toBeLessThan(before[2].x);
    // No direction setting of its own: the stage's.
    expect(await group(page, 'connected-toggles').getAttribute('dir')).toBeNull();
    await stage(page, 'connected-toggles').evaluate((el) => el.setAttribute('dir', 'rtl'));
    const after = await boxes(page, 'connected-toggles', 3);
    expect(after[0].x).toBeGreaterThan(after[2].x);
    // The row is the same row, mirrored, and nothing of the group's own moves.
    expect(after[0].width).toBeCloseTo(before[0].width, 1);
    expect(await moving(inner(page, 'connected-toggles', 0))).toBe(0);
    expect(await placed(page, 'connected-toggles')).toEqual(['format_bold', 'format_italic', 'format_underlined']);
    await expect(inner(page, 'connected-toggles', 0)).toHaveAttribute('aria-pressed', 'true');
    await stage(page, 'connected-toggles').evaluate((el) => el.removeAttribute('dir'));
    expect((await boxes(page, 'connected-toggles', 3)).map((box) => box.x)).toEqual(before.map((box) => box.x));
  });
});

test.describe('separation', () => {
  test.use({ viewport: WINDOW });
  const three = [b('Cut'), b('Copy'), b('Paste')];
  /** The space between the first two items, the radius of the corner where they face each other, and the dividers drawn. */
  const form = async (page: P, id: string) => {
    const row = await boxes(page, id, 2);
    return { gap: Math.round((row[1].x - row[0].x - row[0].width) * 100) / 100 || 0, facing: await px(inner(page, id, 1), 'border-top-left-radius'), dividers: await dividers(page, id) };
  };
  const choice = (page: P) => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tanrei-sys-behavior-separation').trim());

  test('BGR-21: auto takes comp.button-group.connected.separation, which follows the system’s choice — divider in the default system, gap in m3-like; an explicit value wins whatever the tokens say; standard ignores it', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...spec.fixtures, fixture('standard-gap', three, { variant: 'standard', separation: 'gap' }), fixture('standard-divider', three, { variant: 'standard', separation: 'divider' })] });
    const connectedGap = await resolveToken(page, T('connected-gap'));
    const innerShape = await resolveToken(page, T('connected-inner-shape'));
    const divider = { gap: 0, facing: 0, dividers: 2 };
    const gap = { gap: connectedGap, facing: innerShape, dividers: 0 };
    expect(await choice(page)).toBe('divider');
    expect(await form(page, 'connected')).toEqual(divider);
    expect(await form(page, 'connected-divider')).toEqual(divider);
    expect(await form(page, 'connected-gap')).toEqual(gap);
    // Standard: spaced by standard.gap, its own corners, nothing drawn between, whatever separation says.
    const standardGap = await resolveToken(page, T('standard-gap'));
    const own = await resolveToken(page, B('container-shape'));
    for (const id of ['standard-gap', 'standard-divider']) expect(await form(page, id), id).toEqual({ gap: standardGap, facing: own, dividers: 0 });

    // A system whose choice is gap: the same fixtures, the other default.
    await mountFixtures(page, spec, { system: 'm3-like' });
    expect(await choice(page)).toBe('gap');
    const m3 = { gap: await resolveToken(page, T('connected-gap')), facing: await resolveToken(page, T('connected-inner-shape')), dividers: 0 };
    expect(await form(page, 'connected')).toEqual(m3);
    expect(await form(page, 'connected-gap')).toEqual(m3);
    expect(await form(page, 'connected-divider')).toEqual(divider);
  });

  test('BGR-21: auto under a system that sets the component token apart from the system’s choice draws the component’s', async ({ page }) => {
    // The component token is set where a layer sets it: in the cascade, here on the group itself.
    const apart = (name: string) => ({ style: `${T('connected-separation')}: ${name}` });
    await mountFixtures(page, spec, { fixtures: [fixture('apart-gap', three, apart('gap')), fixture('apart-gap-divider', three, { ...apart('gap'), separation: 'divider' }), fixture('unknown', three, apart('zipper'))] });
    const connectedGap = await resolveToken(page, T('connected-gap'));
    const innerShape = await resolveToken(page, T('connected-inner-shape'));
    expect(await choice(page)).toBe('divider');
    expect(await form(page, 'apart-gap')).toEqual({ gap: connectedGap, facing: innerShape, dividers: 0 });
    // The instance still wins over the component token.
    expect(await form(page, 'apart-gap-divider')).toEqual({ gap: 0, facing: 0, dividers: 2 });
    // A name the choice does not have is the first value: divider.
    expect(await form(page, 'unknown')).toEqual({ gap: 0, facing: 0, dividers: 2 });

    await mountFixtures(page, spec, { system: 'm3-like', fixtures: [fixture('apart-divider', three, apart('divider')), fixture('apart-divider-gap', three, { ...apart('divider'), separation: 'gap' })] });
    expect(await choice(page)).toBe('gap');
    expect(await form(page, 'apart-divider')).toEqual({ gap: 0, facing: 0, dividers: 2 });
    expect((await form(page, 'apart-divider-gap')).dividers).toBe(0);
  });

  test('BGR-21: a change of separation, or of the system it follows, draws the other form at once, without animation, keeping the order, the focus and the state of its items', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, system: 'm3-like', fixtures: only('connected', 'connected-toggles') });
    const connectedGap = await resolveToken(page, T('connected-gap'));
    await tabTo(page, item(page, 'connected-toggles', 1));
    await page.keyboard.press('Space');
    await expect(inner(page, 'connected-toggles', 1)).toHaveAttribute('aria-pressed', 'true');
    expect((await form(page, 'connected-toggles')).gap).toBe(connectedGap);
    // The attribute: gap → divider, in the frame the group renders.
    const changed = await group(page, 'connected-toggles').evaluate(async (el: any) => {
      el.separation = 'divider';
      await el.updateComplete;
      const [first, second] = [...el.children].map((child: Element) => child.getBoundingClientRect());
      const button = el.children[2].shadowRoot.querySelector('button');
      return { gap: second.left - first.right, running: button.getAnimations().filter((a: any) => /radius|margin|padding|clip/.test(a.transitionProperty ?? '')).length };
    });
    expect(changed).toEqual({ gap: 0, running: 0 });
    await expect(item(page, 'connected-toggles', 1)).toBeFocused();
    await expect(inner(page, 'connected-toggles', 1)).toHaveAttribute('aria-pressed', 'true');
    expect(await placed(page, 'connected-toggles')).toEqual(['format_bold', 'format_italic', 'format_underlined']);
    await group(page, 'connected-toggles').evaluate((el: any) => (el.separation = 'auto'));
    await expect.poll(async () => (await form(page, 'connected-toggles')).gap).toBe(connectedGap);
    // The token it follows: the page leaves m3-like for the default system, whose choice is divider.
    await page.evaluate(() => document.documentElement.removeAttribute('data-tanrei-system'));
    await expect.poll(async () => (await form(page, 'connected-toggles')).gap).toBe(0);
    expect((await form(page, 'connected')).dividers).toBe(2);
    await expect(item(page, 'connected-toggles', 1)).toBeFocused();
    await expect(inner(page, 'connected-toggles', 1)).toHaveAttribute('aria-pressed', 'true');
  });

  test('BGR-22: the divider — one line on each seam that carries one, connected.divider.thickness thick in connected.divider.color (connected.divider.on-fill.color between two emphasis fills), centred on the seam and connected.divider.inset short of each end; it takes no space, no press and no semantics, and keeps its color whatever its neighbours’ state', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const thickness = await resolveToken(page, T('connected-divider-thickness'));
    const inset = await resolveToken(page, T('connected-divider-inset'));
    const color = await resolveColor(page, T('connected-divider-color'));
    const onFill = await resolveColor(page, T('connected-divider-on-fill-color'));
    // The default system: the rule is the hairline — the role the divider's line and an outlined Button's edge take —
    // and the line between two emphasis fills is the stronger one.
    expect(color).toBe(await resolveColor(page, '--tanrei-sys-color-outline-variant'));
    expect(color).toBe(await resolveColor(page, '--tanrei-comp-divider-line-color'));
    expect(color).toBe(await resolveColor(page, B('outlined-outline-color')));
    expect(onFill).toBe(await resolveColor(page, '--tanrei-sys-color-outline'));
    expect(onFill).not.toBe(color);
    expect(thickness).toBeGreaterThan(0);
    const lines = (id: string) =>
      group(page, id).evaluate((el) =>
        [...el.shadowRoot!.querySelectorAll('.divider')].map((divider) => {
          const box = divider.getBoundingClientRect();
          const line = getComputedStyle(divider, '::before');
          return {
            x: box.left + Number.parseFloat(line.left),
            y: box.top + Number.parseFloat(line.top),
            width: Number.parseFloat(line.width),
            height: Number.parseFloat(line.height),
            space: [box.width, box.height],
            color: line.backgroundColor,
            drawn: line.display !== 'none',
            hidden: divider.getAttribute('aria-hidden'),
            press: getComputedStyle(divider).pointerEvents,
          };
        }),
      );
    // A row: top to bottom on each seam.
    for (const id of ['connected-divider', 'connected-divider-filled', 'connected-divider-tonal', 'connected-divider-elevated', 'connected', 'connected-toggles', 'connected-large']) {
      const row = await boxes(page, id, 3);
      const drawn = await lines(id);
      expect(drawn, id).toHaveLength(2);
      // BGR-24: three filled Buttons rest on an emphasis fill; a selected toggle beside an unselected one has no line.
      const expected = id === 'connected-divider-filled' ? [onFill, onFill] : id === 'connected-toggles' ? [null, color] : [color, color];
      for (const [n, line] of drawn.entries()) {
        const seam = row[n].x + row[n].width;
        expect(row[n + 1].x, `${id}: the items touch`).toBeCloseTo(seam, 1);
        expect(line.drawn, `${id}: seam ${n}`).toBe(expected[n] !== null);
        expect(line.space[0], id).toBe(0);
        if (expected[n] === null) continue;
        expect(line.x + line.width / 2, `${id}: centred on the seam`).toBeCloseTo(seam, 1);
        expect(line.width, id).toBeCloseTo(thickness, 2);
        expect(line.y, id).toBeCloseTo(row[n].y + inset, 1);
        expect(line.height, id).toBeCloseTo(row[n].height - 2 * inset, 1);
        // No space of its own along the row, no press, no semantics, one color.
        expect(line).toMatchObject({ color: expected[n], hidden: 'true', press: 'none' });
      }
    }
    // A column: from start to end on each seam.
    const column = await boxes(page, 'connected-vertical', 3);
    for (const [n, line] of (await lines('connected-vertical')).entries()) {
      const seam = column[n].y + column[n].height;
      expect(column[n + 1].y).toBeCloseTo(seam, 1);
      expect(line.y + line.height / 2).toBeCloseTo(seam, 1);
      expect(line.height).toBeCloseTo(thickness, 2);
      expect(line.x).toBeCloseTo(column[n].x + inset, 1);
      expect(line.width).toBeCloseTo(column[n].width - 2 * inset, 1);
      expect(line.space[1]).toBe(0);
    }
    // It is not in the accessibility tree: the group is its three buttons.
    expect(await stage(page, 'connected-divider').ariaSnapshot()).toBe('- group "Clipboard":\n  - button "Cut"\n  - button "Copy"\n  - button "Paste"');
    // A press on the line goes to the item under the point.
    await wire(page);
    const row = await boxes(page, 'connected-divider', 3);
    const seam = row[0].x + row[0].width;
    expect(await group(page, 'connected-divider').evaluate((el, [x, y]) => [x - 1, x + 1].map((at) => el.ownerDocument.elementFromPoint(at, y)?.textContent?.trim()), [seam, row[0].y + row[0].height / 2] as const)).toEqual(['Cut', 'Copy']);
    await page.mouse.click(seam - 1, row[0].y + row[0].height / 2);
    await page.mouse.click(seam + 1, row[0].y + row[0].height / 2);
    expect(await log(page)).toEqual(['click:Cut', 'click:Copy']);
    // Its color stays while a neighbour is hovered or pressed.
    await page.mouse.move(row[1].x + row[1].width / 2, row[1].y + row[1].height / 2);
    await page.mouse.down();
    expect((await lines('connected-divider')).map((line) => line.color)).toEqual([color, color]);
    await page.mouse.up();
    // Under gap, and in a standard group, none is drawn.
    for (const id of ['connected-gap', 'connected-gap-filled', 'connected-vertical-gap', 'standard']) expect(await dividers(page, id), id).toBe(0);
  });

  test('BGR-22: under divider no item draws its outline or its ring along a seam — a line of pixels through a seam shows the divider in its middle and nothing but the items’ fill above and below it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const inset = await resolveToken(page, T('connected-divider-inset'));
    const outline = await paintedColor(page, await resolveColor(page, B('outlined-outline-color')));
    const surface = await paintedColor(page, 'transparent');
    const rule = await resolveColor(page, T('connected-divider-color'));
    const strong = await resolveColor(page, T('connected-divider-on-fill-color'));
    const scale = await page.evaluate(() => devicePixelRatio);
    /** `token` is the fill the items rest on (null: none, the page shows through); `color` the line's, composited over it. */
    const through = async (id: string, token: string | null, { column = false, color = rule }: { column?: boolean; color?: string } = {}) => {
      const fill = token ? await paintedColor(page, await resolveColor(page, token)) : surface;
      const line = await paintedColor(page, color, token ? await resolveColor(page, token) : undefined);
      const origin = await bounds(stage(page, id));
      const row = await boxes(page, id, 3);
      const shot = decodePng(await stage(page, id).screenshot({ animations: 'disabled' }));
      const colors = { edge: new Set<string>(), middle: new Set<string>() };
      for (const n of [0, 1]) {
        const seam = Math.round((column ? row[n].y + row[n].height - origin.y : row[n].x + row[n].width - origin.x) * scale);
        const [from, to] = column ? [row[n].x - origin.x, row[n].x + row[n].width - origin.x] : [row[n].y - origin.y, row[n].y + row[n].height - origin.y];
        const at = (across: number, along: number) => (column ? shot.at(along, across) : shot.at(across, along));
        // Across the seam: two device pixels on each side of it.
        for (let across = seam - 2; across < seam + 2; across++) {
          // Along it: past the outer outline and short of the divider's ends, then the divider's own stretch.
          for (let along = Math.round((from + 3) * scale); along < Math.round((from + inset - 2) * scale); along++) colors.edge.add(at(across, along));
          for (let along = Math.round((to - inset + 2) * scale); along < Math.round((to - 3) * scale); along++) colors.edge.add(at(across, along));
          for (let along = Math.round((from + inset + 2) * scale); along < Math.round((to - inset - 2) * scale); along++) colors.middle.add(at(across, along));
        }
      }
      // Two fills that meet under an antialiased edge may round a level apart; anything further off is another color.
      const channels = (color: string) => color.match(/\d+/g)!.map(Number);
      const near = (color: string, other: string) => channels(color).every((value, k) => Math.abs(value - channels(other)[k]) <= 2);
      expect([...colors.edge].filter((color) => !near(color, fill)), `${id}: beside the divider's ends, only the fill`).toEqual([]);
      expect([...colors.middle].filter((color) => !near(color, fill) && !near(color, line)), `${id}: the divider and the fill`).toEqual([]);
      expect([...colors.middle].some((color) => near(color, line)), `${id}: the divider is drawn`).toBe(true);
    };
    expect(outline).not.toBe(surface);
    // Outlined: one outline around the row, and no outline color above or below a rule. In the default system a pixel
    // of the outline and a pixel of a rule have the same color: the hairline.
    expect(await paintedColor(page, rule)).toBe(outline);
    await through('connected-divider', null);
    await through('connected', null);
    await through('connected-vertical', null, { column: true });
    // Filled and tonal: the fills meet with nothing of the page between them. BGR-24: on the filled row the rule is the
    // on-fill color; on a tonal and an elevated one the same hairline as on the outlined row.
    await through('connected-divider-filled', B('filled-container-color'), { color: strong });
    await through('connected-divider-tonal', B('tonal-container-color'));
    // Elevated: its ring runs around the joined shape, not along a seam.
    await through('connected-divider-elevated', B('elevated-container-color'));
    // The outline still runs along the outer edges: the top edge of the middle item is the outline color.
    const origin = await bounds(stage(page, 'connected-divider'));
    const middle = await bounds(item(page, 'connected-divider', 1));
    const shot = decodePng(await stage(page, 'connected-divider').screenshot({ animations: 'disabled' }));
    expect(shot.at(Math.round((middle.x - origin.x + middle.width / 2) * scale), Math.round((middle.y - origin.y) * scale))).toBe(outline);
    // Under gap each item draws its outline inside its own edge, all the way round: the side that faces a neighbour too.
    const gapOrigin = await bounds(stage(page, 'connected-gap'));
    const gapItem = await bounds(item(page, 'connected-gap', 1));
    const gapShot = decodePng(await stage(page, 'connected-gap').screenshot({ animations: 'disabled' }));
    expect(gapShot.at(Math.round((gapItem.x - gapOrigin.x) * scale), Math.round((gapItem.y - gapOrigin.y + gapItem.height / 2) * scale))).toBe(outline);
  });

  test('BGR-24: a seam carries a line only while its two items rest on the same fill — none between a selected toggle and an unselected one, the divider color between two that rest on the same quiet fill or on none, the on-fill color between two emphasis fills; the items still draw neither outline nor ring along a seam without a line', async ({ page }) => {
    const toggles = (variant: string, ...on: boolean[]) => on.map((selected, n) => b(`T${n}`, { variant, toggle: true, selected }));
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        ...only('connected-toggles', 'connected-outlined-toggles', 'connected-divider-filled', 'connected-divider', 'connected-divider-tonal', 'connected-divider-elevated', 'connected-mixed', 'connected-vertical-toggles'),
        fixture('text-toggles', toggles('text', true, false, false), { separation: 'divider' }),
        fixture('filled-toggles', toggles('filled', false, true, true, false, false), { separation: 'divider' }),
        fixture('elevated-toggles', toggles('elevated', true, true, false), { separation: 'divider' }),
        fixture('variants', [b('Filled', { variant: 'filled' }), b('Outlined'), b('Text', { variant: 'text' }), b('Tonal', { variant: 'tonal' }), b('Tonal too', { variant: 'tonal' })], { separation: 'divider' }),
        fixture('gapped', toggles('outlined', true, true, false), { separation: 'gap' }),
      ],
    });
    const line = await resolveColor(page, T('connected-divider-color'));
    const onFill = await resolveColor(page, T('connected-divider-on-fill-color'));
    // The fixtures BGR-24's verify names.
    expect(await seams(page, 'connected-toggles'), 'tonal: Bold selected, Italic and Underline not').toEqual(['none', line]);
    expect(await seams(page, 'connected-outlined-toggles'), 'outlined: Bold not, Italic and Underline selected').toEqual(['none', onFill]);
    expect(await seams(page, 'connected-divider-filled'), 'three filled Buttons').toEqual([onFill, onFill]);
    // The same quiet fill, or none on both sides: the divider color, never the on-fill one.
    for (const id of ['connected-divider', 'connected-divider-tonal', 'connected-divider-elevated']) expect(await seams(page, id), id).toEqual([line, line]);
    expect(await seams(page, 'connected-mixed'), 'outlined Buttons and an icon-only outlined one').toEqual([line, line, line]);
    // A toggle of the text variant has no fill, selected or not: its seams keep their lines.
    expect(await seams(page, 'text-toggles')).toEqual([line, line]);
    // A filled toggle: unselected beside selected none; two selected the on-fill color; two unselected (a quiet fill) the divider color.
    expect(await seams(page, 'filled-toggles')).toEqual(['none', onFill, 'none', line]);
    expect(await seams(page, 'elevated-toggles')).toEqual([onFill, 'none']);
    // Two variants side by side: filled beside outlined none; outlined beside text — neither has a fill — a line; text
    // beside tonal none; two tonal Buttons (not an emphasis fill) the divider color.
    expect(await resolveColor(page, B('outlined-container-color')), 'outlined has no fill in the default system').toMatch(/^rgba\(.*, 0\)$|\/ 0\)$/);
    expect(await seams(page, 'variants')).toEqual(['none', line, 'none', line]);
    // A column takes the same rule.
    const column = await seams(page, 'connected-vertical-toggles');
    const selected = await group(page, 'connected-vertical-toggles').evaluate((el) => [...el.children].map((child) => child.hasAttribute('selected')));
    expect(column).toEqual(selected.slice(1).map((on, n) => (on !== selected[n] ? 'none' : on ? onFill : line)));
    // Under gap nothing is drawn, whatever the fills.
    expect(await seams(page, 'gapped')).toEqual(['none', 'none']);
    // No line, and still no outline along the seam: between the unselected Bold and the selected Italic of the outlined
    // toggles a column of pixels just inside Bold's end edge is Bold's own (the page: it has no fill) from top to bottom,
    // save the outline at the outer top and bottom edges.
    const scale = await page.evaluate(() => devicePixelRatio);
    const origin = await bounds(stage(page, 'connected-outlined-toggles'));
    const bold = await bounds(item(page, 'connected-outlined-toggles', 0));
    const shot = decodePng(await stage(page, 'connected-outlined-toggles').screenshot({ animations: 'disabled' }));
    const surface = await paintedColor(page, 'transparent');
    const seen = new Set<string>();
    for (let y = Math.round((bold.y - origin.y + 3) * scale); y < Math.round((bold.y - origin.y + bold.height - 3) * scale); y++) {
      for (const dx of [-2, -1]) seen.add(shot.at(Math.round((bold.x - origin.x + bold.width) * scale) + dx, y));
    }
    expect([...seen]).toEqual([surface]);
  });

  test('BGR-24, BGR-11: switching a toggle adds, removes or recolors the lines beside it in the same frame, without animation; hover, focus, press and disabling move no line and change no color; a changed variant or toggle is followed at once', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, reducedMotion: false, fixtures: only('connected-toggles', 'connected-outlined-toggles') });
    const line = await resolveColor(page, T('connected-divider-color'));
    const onFill = await resolveColor(page, T('connected-divider-on-fill-color'));
    const id = 'connected-outlined-toggles';
    expect(await seams(page, id)).toEqual(['none', onFill]);
    /** Changes an item and reads the seams before the next frame is drawn: one task, with no frame in between. */
    const change = (n: number, props: Record<string, unknown>) =>
      group(page, id).evaluate(
        async (el, [index, values]) => {
          let frames = 0;
          const count = () => { frames++; };
          requestAnimationFrame(count);
          Object.assign(el.children[index as number], values);
          // The item reflects its property and the group's observer answers, each in a microtask.
          for (let turn = 0; turn < 8; turn++) await Promise.resolve();
          const dividers = [...el.shadowRoot!.querySelectorAll('.divider')];
          return {
            frames,
            seams: dividers.map((divider) => { const drawn = getComputedStyle(divider, '::before'); return drawn.display === 'none' ? 'none' : drawn.backgroundColor; }),
            moving: dividers.flatMap((divider) => divider.getAnimations({ subtree: true })).length,
          };
        },
        [n, props] as const,
      );
    // Bold on: three selected outlined toggles — two lines in the on-fill color, before a frame was drawn.
    expect(await change(0, { selected: true })).toEqual({ frames: 0, seams: [onFill, onFill], moving: 0 });
    // Italic off: no line on either side of it.
    expect(await change(1, { selected: false })).toEqual({ frames: 0, seams: ['none', 'none'], moving: 0 });
    // Bold and Underline off too: three unselected outlined toggles, no fill — the divider color.
    await change(0, { selected: false });
    expect(await change(2, { selected: false })).toEqual({ frames: 0, seams: [line, line], moving: 0 });
    // The person does it: a click on Italic.
    await inner(page, id, 1).click();
    await expect.poll(() => seams(page, id)).toEqual(['none', 'none']);
    // Hover, press and focus on the selected Italic: nothing changes.
    const box = await bounds(item(page, id, 1));
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    expect(await seams(page, id)).toEqual(['none', 'none']);
    await page.mouse.down();
    expect(await seams(page, id)).toEqual(['none', 'none']);
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await inner(page, id, 1).focus();
    expect(await seams(page, id)).toEqual(['none', 'none']);
    // Disabling compares the look the item has when enabled: a disabled selected Italic still has no line beside it, and
    // two disabled toggles, one on and one off, have none between them.
    expect(await change(1, { disabled: true })).toMatchObject({ seams: ['none', 'none'] });
    expect(await change(0, { disabled: true })).toMatchObject({ seams: ['none', 'none'] });
    expect(await change(0, { disabled: false })).toMatchObject({ seams: ['none', 'none'] });
    expect(await change(1, { disabled: false, selected: false })).toMatchObject({ frames: 0, seams: [line, line] });
    // The variant and toggle are followed too: a filled Button that is not a toggle beside an unselected outlined one.
    expect(await change(0, { variant: 'filled', toggle: false })).toMatchObject({ frames: 0, seams: ['none', line] });
    expect(await change(1, { variant: 'filled', toggle: false })).toMatchObject({ frames: 0, seams: [onFill, 'none'] });
    // The tonal fixture: hovering the unselected Italic, whose hovered fill is another color, keeps its line to Underline.
    expect(await seams(page, 'connected-toggles')).toEqual(['none', line]);
    await item(page, 'connected-toggles', 1).hover();
    expect(await seams(page, 'connected-toggles')).toEqual(['none', line]);
  });

  test('BGR-24: the fills are compared as the active scheme and system draw them — the dark scheme and a preset keep the rule, and a layer that gives two looks one color gets its line back', async ({ page }) => {
    const ids = ['connected-toggles', 'connected-outlined-toggles', 'connected-divider-filled'];
    for (const options of [{ theme: 'dark' as const }, { system: 'cupertino' }, { system: 'm3-like' }]) {
      await mountFixtures(page, spec, { icons: true, fixtures: only(...ids), ...options });
      const line = await resolveColor(page, T('connected-divider-color'));
      const onFill = await resolveColor(page, T('connected-divider-on-fill-color'));
      const name = JSON.stringify(options);
      // m3-like joins by gap unless the instance asks: connected-toggles draws nothing there; the two that ask for a divider do.
      const gap = (await group(page, 'connected-toggles').evaluate((el) => getComputedStyle(el).getPropertyValue('--_separation').trim())) === 'gap';
      expect(await seams(page, 'connected-toggles'), name).toEqual(gap ? ['none', 'none'] : ['none', line]);
      expect(await seams(page, 'connected-outlined-toggles'), name).toEqual(['none', onFill]);
      expect(await seams(page, 'connected-divider-filled'), name).toEqual([onFill, onFill]);
    }
    // A layer in which a selected tonal toggle rests on the color an unselected one does: the same fill, so a line —
    // drawn again when the system is switched on the root.
    await mountFixtures(page, spec, { icons: true, fixtures: only('connected-toggles') });
    const line = await resolveColor(page, T('connected-divider-color'));
    expect(await seams(page, 'connected-toggles')).toEqual(['none', line]);
    await rootTokens(page, { [B('tonal-selected-container-color')]: `var(${B('tonal-selected-container-color').replace('selected', 'unselected')})` });
    // Both selected... the selected one is still an emphasis fill by its look, the unselected one is not: the divider color.
    await expect.poll(() => seams(page, 'connected-toggles')).toEqual([line, line]);
  });

  test('BGR-22 / BTN-10: an item’s state layer and focus ring still follow its own shape under divider — the focused item is whole, drawn over its neighbours', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: only('connected-divider-filled') });
    // Hovered: the container color is the item's own hovered token; its neighbour keeps its own.
    await inner(page, 'connected-divider-filled', 1).hover();
    await expect.poll(() => css(inner(page, 'connected-divider-filled', 1), 'background-color')).toBe(await resolveColor(page, B('filled-hovered-container-color')));
    expect(await css(inner(page, 'connected-divider-filled', 0), 'background-color')).toBe(await resolveColor(page, B('filled-container-color')));
    // Keyboard focus: nothing of the item is clipped, its box is the item's own, and it is drawn over its neighbours.
    await tabTo(page, item(page, 'connected-divider-filled', 1));
    const focused = inner(page, 'connected-divider-filled', 1);
    expect(await css(focused, 'clip', '::after')).toBe('auto');
    expect(await css(focused, 'box-shadow')).not.toMatch(/^rgba\(0, 0, 0, 0\) 0px 0px 0px 0px$/);
    const [host, container] = [await bounds(item(page, 'connected-divider-filled', 1)), await bounds(focused)];
    expect([container.x, container.width]).toEqual([host.x, host.width]);
    expect(await css(focused, 'outline-style')).toBe('solid');
    expect(Number(await css(focused, 'z-index'))).toBeGreaterThan(Number(await css(group(page, 'connected-divider-filled').locator('.divider').first(), 'z-index')));
    expect(await css(inner(page, 'connected-divider-filled', 0), 'z-index')).toBe('auto');
    // A press does not raise it: the item under the point at a seam is still the one drawn there.
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await inner(page, 'connected-divider-filled', 0).click();
    expect(await css(inner(page, 'connected-divider-filled', 0), 'z-index')).toBe('auto');
    // Its neighbours' shadows are still cut at their seams, and they draw none themselves: their boxes end at the seam.
    expect(await css(inner(page, 'connected-divider-filled', 0), 'clip', '::after')).toMatch(/^rect\(/);
    expect(await css(inner(page, 'connected-divider-filled', 0), 'box-shadow')).toMatch(/^rgba\(0, 0, 0, 0\) 0px 0px 0px 0px$/);
    expect(await css(inner(page, 'connected-divider-filled', 0), 'margin-right')).toBe('0px');
  });

  test('BGR-23: a connected row adds connected.horizontal.outer-inset to the first item’s start padding and the last one’s end padding, under either separation — not to a middle item, a single item or a column; inside the shares while full-width; mirrored in right-to-left', async ({ page }) => {
    const same = [b('Copy'), b('Copy'), b('Copy')];
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [...spec.fixtures, fixture('same', same), fixture('same-gap', same, { separation: 'gap' }), fixture('joined-shares', three, { fullWidth: true }), fixture('one', [b('Alone')]), fixture('plain', [b('Alone'), b('Too')], { variant: 'standard' })],
    });
    const outer = await resolveToken(page, T('connected-horizontal-outer-inset'));
    const start = await resolveToken(page, B('container-padding-inline-start-medium'));
    const end = await resolveToken(page, B('container-padding-inline-end-medium'));
    expect(outer).toBeGreaterThan(0);
    /** How far an item's content is from its left and right edge. */
    const insets = (id: string, n: number, content = '.label') =>
      item(page, id, n).evaluate((el, selector) => {
        const [box, inside] = [el.getBoundingClientRect(), el.shadowRoot!.querySelector(selector)!.getBoundingClientRect()];
        return { left: Math.round((inside.left - box.left) * 100) / 100, right: Math.round((box.right - inside.right) * 100) / 100, width: box.width };
      }, content);
    // BGR-23's verify: 20 from the row's start edge and 16 from its own end edge; the last the mirror; the middle 16 and 16.
    for (const id of ['connected', 'connected-divider', 'connected-gap', 'connected-disabled']) {
      expect(await insets(id, 0), id).toMatchObject({ left: start + outer, right: end });
      expect(await insets(id, 1), id).toMatchObject({ left: start, right: end });
      expect(await insets(id, 2), id).toMatchObject({ left: start, right: end + outer });
    }
    // Wider by that amount: an end item is its middle twin's width and the padding.
    for (const id of ['same', 'same-gap']) {
      const row = await boxes(page, id, 3);
      expect(row[0].width - row[1].width, id).toBeCloseTo(outer, 1);
      expect(row[2].width - row[1].width, id).toBeCloseTo(outer, 1);
    }
    // An icon-only Button: wider by that amount, its glyph centred in what is left — half of it nearer its neighbour.
    for (const id of ['connected-toggles', 'connected-gap-toggles']) {
      const centre = async (n: number) => {
        const inset = await insets(id, n, '.icon');
        return (inset.left - inset.right) / 2;
      };
      expect(await centre(0), id).toBeCloseTo(outer / 2, 1);
      expect(await centre(1), id).toBeCloseTo(0, 1);
      expect(await centre(2), id).toBeCloseTo(-outer / 2, 1);
      expect((await insets(id, 0, '.icon')).width - (await insets(id, 1, '.icon')).width, id).toBeCloseTo(outer, 1);
    }
    // A single item gets none; a column adds none.
    expect((await bounds(item(page, 'one', 0))).width).toBeCloseTo((await bounds(item(page, 'plain', 0))).width, 1);
    for (const n of [0, 1, 2]) {
      const inset = await insets('connected-vertical-gap', n);
      expect(inset.left).toBeCloseTo(inset.right, 1);
    }
    // Full-width: the shares are divided first, and the padding is taken inside the end items' shares.
    const shares = await boxes(page, 'joined-shares', 3);
    for (const box of shares) expect(box.width).toBeCloseTo(400 / 3, 1);
    const firstShare = await insets('joined-shares', 0);
    expect(firstShare.left - firstShare.right).toBeCloseTo(outer, 1);
    // A system whose outer ends need none sets the token to 0.
    await group(page, 'same').evaluate((el, name) => (el as HTMLElement).style.setProperty(name, '0px'), T('connected-horizontal-outer-inset'));
    const flat = await boxes(page, 'same', 3);
    expect(flat[0].width).toBeCloseTo(flat[1].width, 1);
    // Right-to-left: the start is the right.
    await stage(page, 'connected').evaluate((el) => el.setAttribute('dir', 'rtl'));
    expect(await insets('connected', 0)).toMatchObject({ left: end, right: start + outer });
    expect(await insets('connected', 2)).toMatchObject({ left: end + outer, right: start });
  });
});

// What is painted where two items meet under a divider, read from the pixels (test/seam.ts): every fixture here sets
// `separation="divider"`, so it draws the same under a preset whose own choice is gap.
test.describe('seams', () => {
  const three = (props: FixtureItem['props']) => [b('Cut', props), b('Copy', props), b('Paste', props)];
  const divided = (id: string, items: FixtureItem[], props: Fixture['props'] = {}, direction?: 'rtl'): Fixture => ({ ...fixture(id, items, { separation: 'divider', ...props }), ...(direction ? { direction } : {}) });
  /** Each fixture, what every seam of it must be (test/seam.ts), and how many lines to read outside its edges. */
  const SEAMS: { fixture: Fixture; expect: ('one' | 'two')[]; outside?: number }[] = [
    { fixture: divided('seam-outlined', three({})), expect: ['one', 'one'] },
    { fixture: divided('seam-outlined-disabled', three({ disabled: true })), expect: ['one', 'one'] },
    { fixture: divided('seam-text', three({ variant: 'text' })), expect: ['one', 'one'] },
    { fixture: divided('seam-filled', three({ variant: 'filled' })), expect: ['one', 'one'] },
    { fixture: divided('seam-filled-disabled', three({ variant: 'filled', disabled: true })), expect: ['one', 'one'] },
    { fixture: divided('seam-tonal', three({ variant: 'tonal' })), expect: ['one', 'one'] },
    { fixture: divided('seam-tonal-disabled', three({ variant: 'tonal', disabled: true })), expect: ['one', 'one'] },
    // An elevated Button's ring is around its box: the line of pixels just outside the row runs through the seams too.
    { fixture: divided('seam-elevated', three({ variant: 'elevated' })), expect: ['one', 'one'], outside: 1 },
    // A selected toggle beside an unselected one: two fills, and — outlined — an outline that ends where the fill begins.
    { fixture: divided('seam-tonal-toggles', [b('Bold', { variant: 'tonal', toggle: true, selected: true }), b('Italic', { variant: 'tonal', toggle: true }), b('Underline', { variant: 'tonal', toggle: true })]), expect: ['two', 'one'] },
    { fixture: divided('seam-outlined-toggles', [b('Bold', { toggle: true }), b('Italic', { toggle: true, selected: true }), b('Underline', { toggle: true, selected: true })]), expect: ['two', 'one'] },
    // A filled Button beside an outlined one.
    { fixture: divided('seam-variants', [b('Save', { variant: 'filled' }), b('Edit'), b('Share')]), expect: ['two', 'one'] },
    { fixture: divided('seam-rtl-outlined', three({}), {}, 'rtl'), expect: ['one', 'one'] },
    { fixture: divided('seam-rtl-filled-disabled', three({ variant: 'filled', disabled: true }), {}, 'rtl'), expect: ['one', 'one'] },
    { fixture: divided('seam-column-outlined', three({}), { orientation: 'vertical' }), expect: ['one', 'one'] },
    { fixture: divided('seam-column-filled-disabled', three({ variant: 'filled', disabled: true }), { orientation: 'vertical' }), expect: ['one', 'one'] },
    { fixture: divided('seam-column-tonal-toggles', [b('Day', { variant: 'tonal', toggle: true, selected: true }), b('Week', { variant: 'tonal', toggle: true }), b('Month', { variant: 'tonal', toggle: true })], { orientation: 'vertical' }), expect: ['two', 'one'] },
  ];
  const VIEW = { width: 480, height: 2880 };
  /**
   * Every item under a divider has measured its box. The size its cut counts from is written by an observer of sizes,
   * in the frame after the box changed — and a box changes when its label's face arrives ("Cut": 56.69 wide in the
   * fallback, 59.47 in the face), which is when the page says its faces are ready: a reading made at once, one mount
   * in ten in WebKit, finds the cut 2.78 short of the seam, one frame before it is drawn there.
   */
  const measured = (page: P) =>
    page.waitForFunction(() =>
      [...document.querySelectorAll('.stage *')].every((host) => {
        const container = host.shadowRoot?.querySelector<HTMLElement>('.connected');
        if (!container) return true;
        const used = getComputedStyle(container);
        return (['width', 'height'] as const).every((side) => Math.abs(Number.parseFloat(container.style.getPropertyValue(`--_box-${side}`)) - Number.parseFloat(used[side])) < 0.01);
      }),
    );
  /** Draws the fixtures on the page a seam is read on and reads every seam of each; returns what was off. */
  const read = async (page: P, options: { theme: 'light' | 'dark'; system?: string; offset: number }) => {
    await mountFixtures(page, spec, { fixtures: SEAMS.map((seam) => seam.fixture), theme: options.theme, ...(options.system ? { system: options.system } : {}) });
    await stageBehind(page, options.offset);
    await measured(page);
    const inset = await resolveToken(page, T('connected-divider-inset'));
    const shot = await shoot(page);
    const off: string[] = [];
    let lines = 0;
    for (const { fixture: f, expect: expected, outside } of SEAMS) {
      const column = f.props.orientation === 'vertical';
      // The seam really is one: the two items touch, and a rule is drawn or not as BGR-24 says.
      const boxes = await Promise.all([0, 1, 2].map((n) => shot.box(item(page, f.id, n))));
      const placed = [...boxes].sort((p, q) => (column ? p.y - q.y : p.x - q.x));
      for (const n of [0, 1]) {
        // The ring of an elevation is the default system's; a preset's elevation is blurred layers alone.
        const result = readSeam(shot, placed[n], placed[n + 1], { column, inset: inset * shot.ratio, expect: expected[n], outside: options.system ? 0 : outside, slack: 3 });
        lines += result.lines;
        off.push(...result.off.map((what) => `${f.id}, seam ${n}: ${what}`));
      }
    }
    return { off, lines, inset };
  };

  test('BGR-22, BGR-24 / BTN-10: no pixel of a fill or of an outline is painted twice at a seam, and none of the page shows there — a line of pixels through a seam, beside the rule’s ends, is one color where the two items rest on the same fill (filled, tonal, outlined, text, elevated; disabled, whose fills are translucent) and the first item’s color then the second’s where they differ; the outline runs through every seam in one even color; in a row, a column and right-to-left, light and dark, at 1, 2 and 3 device pixels per pixel and half a device pixel off the grid', async ({ browser }) => {
    test.slow();
    for (const theme of ['light', 'dark'] as const) {
      for (const ratio of [1, 2, 3]) {
        for (const offset of [0, 0.5]) {
          const result = await atRatio(browser, ratio, (page) => read(page, { theme, offset }), VIEW);
          expect(result.inset, 'the rule stops short of the edge, so there are lines to read').toBeGreaterThan(2);
          expect(result.lines).toBeGreaterThan(0);
          expect(result.off, `${theme}, ${ratio}x, ${offset} off the grid`).toEqual([]);
        }
      }
    }
  });

  for (const system of ['cupertino', 'm3-like', 'm3-expressive-like']) {
    test(`BGR-22, BGR-24: the same under ${system} — its outline widths, its corners, its fills and its elevation meet at a seam without a pixel painted twice`, async ({ browser }) => {
      for (const theme of ['light', 'dark'] as const) {
        for (const offset of [0, 0.5]) {
          const result = await atRatio(browser, 2, (page) => read(page, { theme, system, offset }), VIEW);
          expect(result.lines).toBeGreaterThan(0);
          expect(result.off, `${system}, ${theme}, ${offset} off the grid`).toEqual([]);
        }
      }
    });
  }

  test('BGR-22 / BTN-10: an item under a divider is a box that ends at its seams and paints its fill; its outline and its elevation are its ::after’s, which reaches past each seam and is cut there — in a row, a column and right-to-left; under gap nothing is cut', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...SEAMS.map((seam) => seam.fixture), fixture('seam-gap', three({}), { separation: 'gap' })] });
    await measured(page);
    const drawn = (id: string, n: number) =>
      inner(page, id, n).evaluate((el) => {
        const [own, after, host] = [getComputedStyle(el), getComputedStyle(el, '::after'), (el.getRootNode() as ShadowRoot).host.getBoundingClientRect()];
        const [box, rect] = [el.getBoundingClientRect(), /rect\((.+)\)/.exec(after.clip)?.[1].split(/,\s*/).map(Number.parseFloat) ?? null];
        const [top, right, bottom, left] = ['top', 'right', 'bottom', 'left'].map((side) => Number.parseFloat(after.getPropertyValue(side)));
        // The cut, as distances from the container's own edges: 0 is the edge itself (a seam), negative is beyond it.
        const cut = rect && { top: rect[0] + top, left: rect[3] + left, right: box.width - left - rect[1], bottom: box.height - top - rect[2] };
        return { own: own.boxShadow, after: after.boxShadow, same: [box.x - host.x, box.width - host.width], past: { top, right, bottom, left }, cut };
      });
    const bleed = await resolveToken(page, '--tanrei-sys-space-space50');
    const reach = await resolveToken(page, '--tanrei-sys-target-touch');
    const nothing = /^rgba\(0, 0, 0, 0\) 0px 0px 0px 0px$/;
    // A row: the middle item is cut on the left and on the right, the first on the right only, the last on the left only.
    for (const [id, sides] of [['seam-outlined', [['right'], ['left', 'right'], ['left']]], ['seam-rtl-outlined', [['left'], ['left', 'right'], ['right']]], ['seam-column-outlined', [['bottom'], ['top', 'bottom'], ['top']]]] as const) {
      for (const n of [0, 1, 2]) {
        const item = await drawn(id, n);
        expect(item.own, `${id} ${n}: the container draws no shadow`).toMatch(nothing);
        expect(item.after, `${id} ${n}: its ::after draws the outline`).toContain('inset');
        expect(item.same, `${id} ${n}: the container is the item's box`).toEqual([0, 0]);
        for (const side of ['top', 'right', 'bottom', 'left'] as const) {
          const seam = (sides[n] as readonly string[]).includes(side);
          expect(item.past[side], `${id} ${n} ${side}: reaches past a seam`).toBeCloseTo(seam ? -bleed : 0, 2);
          // A seam: cut on the container's edge, within the thousandth of a pixel the measured size carries. Elsewhere: room.
          if (seam) expect(Math.abs(item.cut![side]), `${id} ${n} ${side}: cut at the seam`).toBeLessThan(0.01);
          else expect(item.cut![side], `${id} ${n} ${side}: room for the elevation`).toBeLessThan(-reach + 0.01);
        }
      }
    }
    // Under gap no edge is a seam: the ::after is the container's box, and no side is cut.
    const apart = await drawn('seam-gap', 1);
    expect(apart.past).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    for (const side of ['top', 'right', 'bottom', 'left'] as const) expect(apart.cut![side]).toBeLessThan(-reach + 0.01);
    // The measured size follows the item: a longer label moves the cut with the seam.
    await item(page, 'seam-outlined', 0).evaluate((el) => { el.textContent = 'Cut the selection'; });
    await expect.poll(async () => Math.abs((await drawn('seam-outlined', 0)).cut!.right)).toBeLessThan(0.01);
  });
});

test.describe('items, keyboard and semantics', () => {
  test.use({ viewport: WINDOW });
  test('BGR-5: each item renders from its own tokens, answers hover, focus and press itself and emits its own events; toggles stay independent', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    expect(await css(inner(page, 'standard', 2), 'background-color')).toBe(await resolveColor(page, B('filled-container-color')));
    expect(await css(inner(page, 'standard', 1), 'background-color')).toBe(await resolveColor(page, B('tonal-container-color')));
    expect(await css(inner(page, 'connected-toggles', 0), 'background-color')).toBe(await resolveColor(page, B('tonal-selected-container-color')));
    await inner(page, 'connected', 1).hover();
    await expect.poll(() => css(inner(page, 'connected', 1), 'background-color')).toBe(await resolveColor(page, B('outlined-hovered-container-color')));
    expect(await css(inner(page, 'connected', 0), 'background-color')).toBe(await resolveColor(page, B('outlined-container-color')));
    await wire(page);
    await inner(page, 'standard', 2).click();
    await inner(page, 'connected-toggles', 1).click();
    await inner(page, 'connected-disabled', 1).click({ force: true });
    expect(await log(page)).toEqual(['click:Publish', 'click:format_italic', 'change:format_italic:true']);
    // Bold stays on: the group keeps no selection and makes no toggle exclusive.
    await expect(inner(page, 'connected-toggles', 0)).toHaveAttribute('aria-pressed', 'true');
    await expect(inner(page, 'connected-toggles', 1)).toHaveAttribute('aria-pressed', 'true');
  });

  test('BGR-5: every enabled item is its own Tab stop; the group takes no focus and handles no arrow key; Enter and Space activate the item', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: only('connected', 'connected-disabled') });
    await tabTo(page, item(page, 'connected-disabled', 0));
    await tab(page);
    // The disabled Copy is skipped.
    await expect(item(page, 'connected-disabled', 2)).toBeFocused();
    await tabTo(page, item(page, 'connected', 0));
    for (const n of [1, 2]) {
      await tab(page);
      await expect(item(page, 'connected', n)).toBeFocused();
    }
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Home');
    await expect(item(page, 'connected', 2)).toBeFocused();
    await tab(page, { back: true });
    await expect(item(page, 'connected', 1)).toBeFocused();
    // The group is never focused, by Tab or by a click on it.
    expect(await group(page, 'connected').evaluate((el) => el.tabIndex)).toBe(-1);
    await group(page, 'connected').evaluate((el) => (el as HTMLElement).focus());
    expect(await page.evaluate(() => document.activeElement?.localName)).not.toBe('tanrei-button-group');
    await wire(page);
    await tabTo(page, item(page, 'connected', 1));
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    expect(await log(page)).toEqual(['click:Copy', 'click:Copy']);
  });

  test('BGR-6: with a label the group is a group named by it that contains its items; without one it exposes no element of its own', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    await expect(group(page, 'connected-toggles')).toHaveAttribute('role', 'group');
    await expect(group(page, 'connected-toggles')).toHaveAttribute('aria-label', 'Text style');
    const textStyle = stage(page, 'connected-toggles').getByRole('group', { name: 'Text style' });
    await expect(textStyle.getByRole('button')).toHaveCount(3);
    await expect(textStyle.getByRole('button', { name: 'Bold', pressed: true })).toHaveCount(1);
    await expect(page.getByRole('group', { name: 'Post actions' }).getByRole('button', { name: 'Share' })).toHaveCount(1);
    // No label: no role, no name; the buttons are there as they are anywhere.
    expect(await group(page, 'standard').evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label')])).toEqual([null, null]);
    await expect(stage(page, 'standard').getByRole('group')).toHaveCount(0);
    await expect(stage(page, 'standard').getByRole('button', { name: 'Publish' })).toHaveCount(1);
    // A label set later names the group; cleared, it is gone again.
    await group(page, 'standard').evaluate((el: any) => (el.label = 'Post'));
    await expect(page.getByRole('group', { name: 'Post', exact: true })).toHaveCount(1);
    await group(page, 'standard').evaluate((el: any) => (el.label = ''));
    await expect(group(page, 'standard')).not.toHaveAttribute('role');
  });

  test('BGR-15: focus and assistive technology follow the placed order — start to end in a row, top to bottom in a column — whatever order the items were given in', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: only('order-back-next', 'order-back-next-vertical', 'order-three-runs-vertical') });
    // Given Next, Back: a row is Back, Next…
    expect(await group(page, 'order-back-next').evaluate((el) => [...el.children].map((child) => child.textContent!.trim()))).toEqual(['Next', 'Back']);
    await tabTo(page, item(page, 'order-back-next', 1));
    await tab(page);
    await expect(item(page, 'order-back-next', 0)).toBeFocused();
    expect(await stage(page, 'order-back-next').ariaSnapshot()).toBe('- button "Back"\n- button "Next"');
    // …and a column Next, Back.
    await tabTo(page, item(page, 'order-back-next-vertical', 0));
    await tab(page);
    await expect(item(page, 'order-back-next-vertical', 1)).toBeFocused();
    expect(await stage(page, 'order-back-next-vertical').ariaSnapshot()).toBe('- button "Next"\n- button "Back"');
    // Given Cancel, Save draft, Publish: the column reads Publish, Save draft, Cancel.
    await tabTo(page, item(page, 'order-three-runs-vertical', 2));
    await tab(page);
    await expect(item(page, 'order-three-runs-vertical', 1)).toBeFocused();
    await tab(page);
    await expect(item(page, 'order-three-runs-vertical', 0)).toBeFocused();
    expect(await stage(page, 'order-three-runs-vertical').ariaSnapshot()).toBe('- button "Publish"\n- button "Save draft"\n- button "Cancel"');
    // No CSS order is used: the tree itself is in the placed order.
    for (const n of [0, 1]) expect(await css(item(page, 'order-back-next', n), 'order')).toBe('0');
  });

  test('BGR-18: an item that is both confirming and dismissive is placed among the items with neither flag, and a debug build reports it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [fixture('both', [b('OK', { confirming: true }), b('Maybe', { confirming: true, dismissive: true }), b('Cancel', { dismissive: true })], { variant: 'standard' })] });
    expect(await placed(page, 'both')).toEqual(['Cancel', 'Maybe', 'OK']);
    await group(page, 'both').evaluate(async (el: any) => {
      el.orientation = 'vertical';
      await el.updateComplete;
    });
    expect(await placed(page, 'both')).toEqual(['OK', 'Maybe', 'Cancel']);
    await expect.poll(() => seen.filter((w) => w.includes('BGR-18')).length).toBe(1);
    expect(seen.join('\n')).toMatch(/"Maybe" is both confirming and dismissive.*\(BGR-18\)/);
  });

  test('BGR-19: confirming and dismissive decide an item’s place only — never its look, its emphasis or its semantics', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('flagged', [b('Delete', { variant: 'tonal', confirming: true }), b('Cancel', { variant: 'tonal', dismissive: true }), b('Plain', { variant: 'tonal' })], { variant: 'standard' })] });
    const look = (n: number) =>
      inner(page, 'flagged', n).evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.backgroundColor, s.color, s.boxShadow, s.font, s.borderRadius, s.minHeight, s.paddingBlock, el.getAttribute('aria-pressed'), el.getAttribute('aria-label'), el.getAttribute('aria-description')];
      });
    expect(await look(0)).toEqual(await look(2));
    expect(await look(1)).toEqual(await look(2));
    // A confirming Button is not made filled: it keeps the variant it was given.
    expect(await css(inner(page, 'flagged', 0), 'background-color')).toBe(await resolveColor(page, B('tonal-container-color')));
    // Not announced: three buttons, named by their labels, in the placed order.
    expect(await stage(page, 'flagged').ariaSnapshot()).toBe('- button "Cancel"\n- button "Plain"\n- button "Delete"');
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true });
      await motionEnded(page);
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(' ')}`).join(', ')}`).toEqual([]);
    }
  });

  test('BGR-3 / BGR-4: every item of every fixture has a hit area of at least the target on both axes', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    for (const f of spec.fixtures) {
      for (let n = 0; n < f.items!.length; n++) {
        const hit = await inner(page, f.id, n).evaluate((el) => {
          const area = getComputedStyle(el, '::before');
          return { width: Number.parseFloat(area.width), height: Number.parseFloat(area.height) };
        });
        expect(hit.width, `${f.id} ${n}: width`).toBeGreaterThanOrEqual(pointer - 0.5);
        expect(hit.height, `${f.id} ${n}: height`).toBeGreaterThanOrEqual(pointer - 0.5);
      }
    }
  });
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(page.locator(`[data-fixture="${f.id}"]`)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
