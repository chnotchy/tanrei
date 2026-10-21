// <tanrei-resizable-frame>, driven by specs/resizable-frame.spec.json: every behaviour id (RSF-1…19) is cited by a test
// title, every fixture has a baseline, and every value is read back from the tokens. The handles are the Handle's own
// (its tests hold how each is drawn and how it takes a drag and a key); these hold what the frame does with them.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { bounds, css, warnings } from '../../../test/destinations.js';
import { type Fixture, loadSpec, mountFixtureAsInAll, mountFixtures, resolveColor, resolveToken, tab, tabTo } from '../../../test/harness.js';
import { motionEnded } from '../../../test/motions.js';

const spec = loadSpec('resizable-frame');
type P = Page;
const T = (name: string) => `--tanrei-comp-resizable-frame-${name}`;
const fixtureOf = (id: string) => spec.fixtures.find((f) => f.id === id)!;
const fx = (id: string, props: Fixture['props'] = {}, extra: Partial<Fixture> = {}): Fixture => ({ id, props: { width: 480, height: 240, widthLabel: 'Resize preview width', ...props }, slots: { default: 'Preview' }, ...extra });

const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-resizable-frame`);
const box = (page: P, id: string) => host(page, id).locator('.box');
const room = (page: P, id: string) => host(page, id).locator('.room');
const indicator = (page: P, id: string) => host(page, id).locator('.indicator');
const handle = (page: P, id: string, name: string) => host(page, id).locator(`tanrei-handle[data-handle="${name}"]`);
const separator = (page: P, id: string, name: string) => handle(page, id, name).locator('[role="separator"]');
const px = (page: P, name: string) => resolveToken(page, name);
const ms = (page: P, name: string) => resolveToken(page, name, 'duration');
const size = async (page: P, id: string) => {
  const b = await bounds(box(page, id));
  return [Math.round(b.width), Math.round(b.height)];
};
const centreOf = async (locator: Locator) => {
  const b = await bounds(locator);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

async function mount(page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) {
  await mountFixtures(page, spec, { fixtures, ...options });
}

/** Every event the frames of the page emit, in order, with its detail. */
const listen = (page: P) =>
  page.evaluate(() => {
    const log: string[] = ((window as any).log = []);
    for (const el of document.querySelectorAll('tanrei-resizable-frame')) {
      for (const type of ['resize', 'change']) el.addEventListener(type, (e) => log.push(`${type} ${JSON.stringify((e as CustomEvent).detail)}`));
    }
  });
const log = (page: P): Promise<string[]> => page.evaluate(() => (window as any).log);
const clear = (page: P) => page.evaluate(() => ((window as any).log.length = 0));

/** A drag of a handle by `dx`, `dy` from its centre, in `steps` moves. */
async function drag(page: P, target: Locator, dx: number, dy: number, steps = 6) {
  const c = await centreOf(target);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) await page.mouse.move(c.x + (dx * i) / steps, c.y + (dy * i) / steps);
  await page.mouse.up();
}

/** The pointer is taken off every frame: to the page's top corner, which no stage covers. */
const away = (page: P) => page.mouse.move(1, 1);

test.describe('the box', () => {
  test('RSF-1: the box is its width × height, within its least and greatest, with no fill and no elevation, at the start of its room', async ({ page }) => {
    await mount(page, [fixtureOf('default'), fx('narrow', { width: 100 }), fx('wide', { width: 2000 }), fx('capped', { width: null, maxWidth: 400 }), fx('filling', { width: null }), fx('least', { width: 100, minWidth: 200 })]);
    expect(await size(page, 'default')).toEqual([480, 240]);
    const least = await px(page, T('container-min-width'));
    expect(least).toBe(320);
    expect((await size(page, 'narrow'))[0]).toBe(least);
    expect((await size(page, 'least'))[0]).toBe(200);
    // The greatest is the room the layout gives, less the end handle's track and the gap before it.
    const r = await bounds(room(page, 'wide'));
    const h = await bounds(handle(page, 'wide', 'end'));
    const gap = await px(page, T('handle-gap'));
    expect((await size(page, 'wide'))[0]).toBe(Math.round(r.width - h.width - gap));
    expect((await size(page, 'filling'))[0]).toBe(Math.round(r.width - h.width - gap));
    expect((await size(page, 'capped'))[0]).toBe(400);
    const b = await bounds(box(page, 'default'));
    expect(b.x).toBeCloseTo((await bounds(room(page, 'default'))).x, 1);
    await expect(box(page, 'default')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(box(page, 'default')).toHaveCSS('box-shadow', 'none');
  });

  test('RSF-1: resized from its start edge alone, the box stands at the end of its room; a height of null is the content’s, at least min-height', async ({ page }) => {
    await mount(page, [fixtureOf('plain-start'), fx('auto-height', { height: null })]);
    const r = await bounds(room(page, 'plain-start'));
    const b = await bounds(box(page, 'plain-start'));
    expect(b.x + b.width).toBeCloseTo(r.x + r.width, 1);
    expect((await size(page, 'auto-height'))[1]).toBe(await px(page, T('container-min-height')));
  });

  test('RSF-2: outlined, the corners are container.shape and the edge outline.width in outline.color, drawn inside the box; the content is clipped and scrolls, the box then a focus stop', async ({ page }) => {
    await mount(page, [fixtureOf('default'), fx('tall', { height: 200 })]);
    const radius = await px(page, T('container-shape'));
    expect(Number.parseFloat(await css(box(page, 'default'), 'border-top-left-radius'))).toBeGreaterThanOrEqual(radius - 0.01);
    await expect(box(page, 'default')).toHaveCSS('border-top-width', `${await px(page, T('outline-width'))}px`);
    await expect(box(page, 'default')).toHaveCSS('border-top-color', await resolveColor(page, T('outline-color')));
    await expect(box(page, 'default')).toHaveCSS('box-sizing', 'border-box');
    await expect(box(page, 'default')).toHaveCSS('overflow-y', 'auto');
    await expect(box(page, 'default')).not.toHaveAttribute('tabindex');
    // Content taller than the box scrolls inside it, and the box takes keyboard focus so that a keyboard scrolls it.
    await host(page, 'tall').evaluate((el) => (el.querySelector('.resizable-frame-content') as HTMLElement).style.setProperty('block-size', '600px'));
    await expect(box(page, 'tall')).toHaveAttribute('tabindex', '0');
    expect(await box(page, 'tall').evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    expect((await size(page, 'tall'))[1]).toBe(200);
  });

  test('RSF-2: plain, the frame draws no edge and no corners, clips nothing, and the content fills the box', async ({ page }) => {
    await mount(page, [fixtureOf('plain')]);
    await expect(box(page, 'plain')).toHaveCSS('border-top-width', '0px');
    await expect(box(page, 'plain')).toHaveCSS('border-top-left-radius', '0px');
    await expect(box(page, 'plain')).toHaveCSS('overflow-y', 'visible');
    const content = await bounds(host(page, 'plain').locator('.resizable-frame-content'));
    expect([Math.round(content.width), Math.round(content.height)]).toEqual(await size(page, 'plain'));
  });
});

test.describe('the handles', () => {
  test('RSF-3: the handles handles names and no other — start and end upright on the inline edges, bottom across the bottom edge, bottom-end an arc at that corner, each medium', async ({ page }) => {
    const errors = warnings(page);
    await mount(page, [fixtureOf('all-handles'), fixtureOf('bottom-only'), fixtureOf('no-handles'), fx('odd', { handles: ['end', 'top', 'end'] })]);
    await expect(host(page, 'all-handles').locator('tanrei-handle')).toHaveCount(3);
    await expect(handle(page, 'all-handles', 'end')).toHaveAttribute('axis', 'horizontal');
    await expect(handle(page, 'all-handles', 'bottom')).toHaveAttribute('axis', 'vertical');
    await expect(handle(page, 'all-handles', 'bottom-end')).toHaveAttribute('axis', 'both');
    await expect(handle(page, 'all-handles', 'bottom-end')).toHaveAttribute('corner', 'bottom-end');
    for (const name of ['end', 'bottom', 'bottom-end']) await expect(handle(page, 'all-handles', name)).toHaveAttribute('size', 'medium');
    await expect(host(page, 'bottom-only').locator('tanrei-handle')).toHaveCount(1);
    await expect(host(page, 'no-handles').locator('tanrei-handle')).toHaveCount(0);
    // RSF-16 too: an unknown name is not drawn, and a name given twice is one handle.
    await expect(host(page, 'odd').locator('tanrei-handle')).toHaveCount(1);
    expect(errors.some((w) => w.includes('"top"') && w.includes('RSF-16'))).toBe(true);
  });

  test('RSF-3: outlined, each handle stands handle.gap beyond its edge, centred along it, and covers no content', async ({ page }) => {
    await mount(page, [fixtureOf('all-handles')]);
    const gap = await px(page, T('handle-gap'));
    const b = await bounds(box(page, 'all-handles'));
    const end = await bounds(handle(page, 'all-handles', 'end'));
    const bottom = await bounds(handle(page, 'all-handles', 'bottom'));
    const corner = await bounds(handle(page, 'all-handles', 'bottom-end'));
    expect(end.x).toBeCloseTo(b.x + b.width + gap, 1);
    expect(end.y + end.height / 2).toBeCloseTo(b.y + b.height / 2, 1);
    expect(bottom.y).toBeCloseTo(b.y + b.height + gap, 1);
    expect(bottom.x + bottom.width / 2).toBeCloseTo(b.x + b.width / 2, 1);
    expect(corner.x).toBeCloseTo(b.x + b.width + gap, 1);
    expect(corner.y).toBeCloseTo(b.y + b.height + gap, 1);
  });

  test('RSF-3: plain, each handle is centred on its edge and takes no room', async ({ page }) => {
    await mount(page, [fixtureOf('plain'), fixtureOf('plain-start'), fx('plain-corner', { variant: 'plain', handles: ['bottom', 'bottom-end'], heightLabel: 'Resize height', cornerLabel: 'Resize' })]);
    const b = await bounds(box(page, 'plain'));
    const end = await centreOf(handle(page, 'plain', 'end'));
    expect(end.x).toBeCloseTo(b.x + b.width, 1);
    expect(end.y).toBeCloseTo(b.y + b.height / 2, 1);
    const s = await bounds(box(page, 'plain-start'));
    expect((await centreOf(handle(page, 'plain-start', 'start'))).x).toBeCloseTo(s.x, 1);
    const c = await bounds(box(page, 'plain-corner'));
    expect((await centreOf(handle(page, 'plain-corner', 'bottom'))).y).toBeCloseTo(c.y + c.height, 1);
    const corner = await centreOf(handle(page, 'plain-corner', 'bottom-end'));
    expect([corner.x, corner.y].map(Math.round)).toEqual([Math.round(c.x + c.width), Math.round(c.y + c.height)]);
    // No room is kept for the handle: the box may take the whole room.
    const r = await bounds(room(page, 'plain'));
    await host(page, 'plain').evaluate((el: any) => (el.width = 5000));
    await expect.poll(async () => (await size(page, 'plain'))[0]).toBe(Math.round(r.width));
  });

  test('RSF-19: outlined, a mouse over the frame draws the handles at rest; plain, they stay out of sight until used', async ({ page }) => {
    await mount(page, [fixtureOf('default'), fixtureOf('plain')]);
    await away(page);
    await expect(handle(page, 'default', 'end')).not.toHaveAttribute('revealed');
    const b = await centreOf(box(page, 'default'));
    await page.mouse.move(b.x, b.y);
    await expect(handle(page, 'default', 'end')).toHaveAttribute('revealed', '');
    await away(page);
    await expect(handle(page, 'default', 'end')).not.toHaveAttribute('revealed');
    const p = await centreOf(box(page, 'plain'));
    await page.mouse.move(p.x, p.y);
    await expect(handle(page, 'plain', 'end')).not.toHaveAttribute('revealed');
  });
});

test.describe('a drag', () => {
  test('RSF-4: a drag of the end, the bottom and the corner handle changes the width, the height and both, without a motion, resize in every frame and change once', async ({ page }) => {
    await mount(page, [fixtureOf('all-handles')]);
    await listen(page);
    await drag(page, handle(page, 'all-handles', 'end'), 60, 0);
    expect(await size(page, 'all-handles')).toEqual([540, 240]);
    const entries = await log(page);
    expect(entries.filter((e) => e.startsWith('resize')).length).toBeGreaterThan(1);
    expect(entries.at(-2)).toBe('resize {"width":540,"height":240}');
    expect(entries.at(-1)).toBe('change {"width":540,"height":240}');
    expect(entries.filter((e) => e.startsWith('change'))).toHaveLength(1);
    expect(await box(page, 'all-handles').evaluate((el) => el.getAnimations().length)).toBe(0);
    await clear(page);
    await drag(page, handle(page, 'all-handles', 'bottom'), 0, 40);
    expect(await size(page, 'all-handles')).toEqual([540, 280]);
    await drag(page, handle(page, 'all-handles', 'bottom-end'), -40, -30);
    expect(await size(page, 'all-handles')).toEqual([500, 250]);
    expect((await log(page)).filter((e) => e.startsWith('change'))).toEqual(['change {"width":540,"height":280}', 'change {"width":500,"height":250}']);
    // Within its least: a drag far past it stops there.
    await drag(page, handle(page, 'all-handles', 'end'), -600, 0);
    expect((await size(page, 'all-handles'))[0]).toBe(await px(page, T('container-min-width')));
  });

  test('RSF-4: the start handle widens the box toward the start edge', async ({ page }) => {
    await mount(page, [fixtureOf('plain-start')]);
    await listen(page);
    const before = await bounds(box(page, 'plain-start'));
    await drag(page, handle(page, 'plain-start', 'start'), -50, 0);
    const after = await bounds(box(page, 'plain-start'));
    expect(Math.round(after.width)).toBe(330);
    expect(after.x + after.width).toBeCloseTo(before.x + before.width, 1);
    expect((await log(page)).at(-1)).toBe('change {"width":330,"height":240}');
  });

  test('RSF-5: a drag that comes within snap-distance of a snap width takes it, and goes on past it', async ({ page }) => {
    await mount(page, [fx('snap', { snapWidths: [540] })]);
    const distance = await px(page, T('snap-distance'));
    await drag(page, handle(page, 'snap', 'end'), 60 - distance + 2, 0);
    expect((await size(page, 'snap'))[0]).toBe(540);
    await drag(page, handle(page, 'snap', 'end'), distance + 10, 0);
    expect((await size(page, 'snap'))[0]).toBe(540 + distance + 10);
  });

  test('RSF-6: while a drag lasts an embedded document takes no pointer, and takes it again when the drag ends', async ({ page }) => {
    await mount(page, [fixtureOf('default')]);
    await host(page, 'default').evaluate((el) => {
      const frame = document.createElement('iframe');
      frame.title = 'Preview';
      frame.srcdoc = '<p>Preview</p>';
      el.querySelector('.resizable-frame-content')!.append(frame);
    });
    const iframe = host(page, 'default').locator('iframe');
    const c = await centreOf(handle(page, 'default', 'end'));
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.mouse.move(c.x - 20, c.y);
    await page.mouse.move(c.x - 40, c.y);
    await expect(iframe).toHaveCSS('pointer-events', 'none');
    await page.mouse.up();
    await expect(iframe).toHaveCSS('pointer-events', 'auto');
    expect(await iframe.evaluate((el) => el.getAttribute('style'))).toBeFalsy();
  });
});

test.describe('keys and activation', () => {
  test('RSF-7: arrows step by step, Shift and Page Up/Down by largeStep, Home and End to the least and the greatest; change once for each', async ({ page }) => {
    await mount(page, [fx('keys', { handles: ['end', 'bottom'], heightLabel: 'Resize preview height' })], { reducedMotion: true });
    await listen(page);
    await tabTo(page, separator(page, 'keys', 'end'));
    await page.keyboard.press('ArrowRight');
    expect((await size(page, 'keys'))[0]).toBe(490);
    await page.keyboard.press('Shift+ArrowRight');
    expect((await size(page, 'keys'))[0]).toBe(590);
    await page.keyboard.press('PageUp');
    expect((await size(page, 'keys'))[0]).toBe(490);
    await page.keyboard.press('ArrowLeft');
    expect((await size(page, 'keys'))[0]).toBe(480);
    await page.keyboard.press('Home');
    expect((await size(page, 'keys'))[0]).toBe(320);
    await page.keyboard.press('Home');
    await page.keyboard.press('End');
    const greatest = Number(await separator(page, 'keys', 'end').getAttribute('aria-valuemax'));
    expect((await size(page, 'keys'))[0]).toBe(greatest);
    expect(await log(page)).toEqual(['change {"width":490,"height":240}', 'change {"width":590,"height":240}', 'change {"width":490,"height":240}', 'change {"width":480,"height":240}', 'change {"width":320,"height":240}', `change {"width":${greatest},"height":240}`]);
    await clear(page);
    await tab(page);
    await page.keyboard.press('ArrowDown');
    expect((await size(page, 'keys'))[1]).toBe(250);
    await page.keyboard.press('Home');
    expect((await size(page, 'keys'))[1]).toBe(await px(page, T('container-min-height')));
    expect((await log(page)).length).toBe(2);
  });

  test('RSF-7: on the start handle the arrow toward the start widens; a key moves the box over resize-duration with resize-easing, at once where motion is reduced', async ({ page }) => {
    await mount(page, [fixtureOf('plain-start')]);
    await tabTo(page, separator(page, 'plain-start', 'start'));
    await page.keyboard.press('ArrowLeft');
    // The motion runs on the box's size, timed by the frame's own tokens.
    const timing = await box(page, 'plain-start').evaluate((el) => {
      const style = getComputedStyle(el);
      return { property: style.transitionProperty, duration: style.transitionDuration, easing: style.transitionTimingFunction, running: el.getAnimations().length };
    });
    expect(timing.running).toBeGreaterThan(0);
    expect(timing.property).toContain('inline-size');
    expect(Number.parseFloat(timing.duration) * 1000).toBe(await ms(page, T('motion-resize-duration')));
    await motionEnded(page);
    expect((await size(page, 'plain-start'))[0]).toBe(290);
    await page.keyboard.press('ArrowRight');
    await motionEnded(page);
    expect((await size(page, 'plain-start'))[0]).toBe(280);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.keyboard.press('ArrowLeft');
    expect(await box(page, 'plain-start').evaluate((el) => el.getAnimations().length)).toBe(0);
    expect((await size(page, 'plain-start'))[0]).toBe(290);
  });

  test('RSF-8: activating a handle makes the size its greatest, and again gives back the size it had', async ({ page }) => {
    await mount(page, [fx('activate', { handles: ['end', 'bottom'], heightLabel: 'Resize preview height', maxHeight: 400 })], { reducedMotion: true });
    await listen(page);
    const greatest = Number(await separator(page, 'activate', 'end').getAttribute('aria-valuemax'));
    await tabTo(page, separator(page, 'activate', 'end'));
    await page.keyboard.press('Enter');
    expect((await size(page, 'activate'))[0]).toBe(greatest);
    await page.keyboard.press('Space');
    expect((await size(page, 'activate'))[0]).toBe(480);
    // A press without a drag is an activation too.
    await page.mouse.click(...(Object.values(await centreOf(handle(page, 'activate', 'bottom'))) as [number, number]));
    expect((await size(page, 'activate'))[1]).toBe(400);
    expect((await log(page)).filter((e) => e.startsWith('change'))).toHaveLength(3);
    expect((await log(page)).filter((e) => e.startsWith('resize'))).toHaveLength(0);
  });

  test('RSF-8: the bottom handle takes the content’s height for its greatest while max-height is null', async ({ page }) => {
    await mount(page, [fx('content', { handles: ['bottom'], heightLabel: 'Resize preview height', height: 300 })], { reducedMotion: true });
    await host(page, 'content').evaluate((el) => (el.querySelector('.resizable-frame-content') as HTMLElement).style.setProperty('block-size', '420px'));
    await tabTo(page, separator(page, 'content', 'bottom'));
    await page.keyboard.press('Enter');
    const border = await px(page, T('outline-width'));
    expect((await size(page, 'content'))[1]).toBe(Math.round(420 + 2 * border));
  });
});

test.describe('assistive technology', () => {
  test('RSF-9: each handle is a separator whose value is its size, with its least and greatest, named by its label', async ({ page }) => {
    await mount(page, [fixtureOf('all-handles')]);
    const end = separator(page, 'all-handles', 'end');
    await expect(end).toHaveAttribute('aria-valuenow', '480');
    await expect(end).toHaveAttribute('aria-valuemin', '320');
    await expect(end).toHaveAttribute('aria-label', 'Resize preview width');
    await expect(separator(page, 'all-handles', 'bottom')).toHaveAttribute('aria-valuenow', '240');
    await expect(separator(page, 'all-handles', 'bottom')).toHaveAttribute('aria-label', 'Resize preview height');
    await expect(separator(page, 'all-handles', 'bottom-end')).toHaveAttribute('aria-valuenow', '240');
    await expect(separator(page, 'all-handles', 'bottom-end')).toHaveAttribute('aria-label', 'Resize preview');
    const r = await bounds(room(page, 'all-handles'));
    expect(Number(await end.getAttribute('aria-valuemax'))).toBeLessThan(r.width);
  });

  test('RSF-9: a drawn handle without a label is still drawn, and reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('unnamed', { widthLabel: '' })]);
    await expect(handle(page, 'unnamed', 'end')).toHaveCount(1);
    expect(seen.some((w) => w.includes('width-label is empty') && w.includes('RSF-9'))).toBe(true);
  });

  test('RSF-18: the handles come after the content in the focus order — start, end, bottom, corner — and the frame adds no other stop', async ({ page }) => {
    await mount(page, [fx('order', { handles: ['bottom-end', 'bottom', 'end', 'start'], heightLabel: 'Resize preview height', cornerLabel: 'Resize preview' })]);
    await host(page, 'order').evaluate((el) => {
      const button = document.createElement('button');
      button.textContent = 'In the content';
      el.querySelector('.resizable-frame-content')!.append(button);
    });
    await tabTo(page, host(page, 'order').locator('button'));
    const order: string[] = [];
    for (let i = 0; i < 4; i++) {
      await tab(page);
      order.push(await page.evaluate(() => (document.activeElement?.shadowRoot?.activeElement as HTMLElement | null)?.dataset.handle ?? ''));
    }
    expect(order).toEqual(['start', 'end', 'bottom', 'bottom-end']);
  });
});

test.describe('the size indicator', () => {
  test('RSF-10: always, it is drawn inside the box at its top-end corner: width × height, in the indicator’s tokens, hidden from assistive technology', async ({ page }) => {
    await mount(page, [fixtureOf('indicator-always')]);
    const label = indicator(page, 'indicator-always');
    await expect(label).toHaveText('390 × 240');
    await expect(label).toHaveAttribute('aria-hidden', 'true');
    await expect(label).toHaveCSS('opacity', '1');
    await expect(label).toHaveCSS('pointer-events', 'none');
    const offset = await px(page, T('size-indicator-offset'));
    const b = await bounds(box(page, 'indicator-always'));
    const l = await bounds(label);
    expect(l.y - b.y).toBeCloseTo(offset, 1);
    expect(b.x + b.width - (l.x + l.width)).toBeCloseTo(offset, 1);
    expect(l.height).toBeCloseTo(await px(page, T('size-indicator-container-height')), 1);
    await expect(label).toHaveCSS('padding-left', `${await px(page, T('size-indicator-container-padding-inline'))}px`);
    await expect(label).toHaveCSS('border-top-left-radius', `${await px(page, T('size-indicator-container-shape'))}px`);
    await expect(label).toHaveCSS('background-color', await resolveColor(page, T('size-indicator-container-color')));
    await expect(label).toHaveCSS('color', await resolveColor(page, T('size-indicator-label-color')));
    const family = await page.evaluate((n) => {
      const probe = document.createElement('div');
      probe.style.fontFamily = `var(${n})`;
      document.body.append(probe);
      const value = getComputedStyle(probe).fontFamily;
      probe.remove();
      return value;
    }, T('size-indicator-label-typescale-font-family'));
    await expect(label).toHaveCSS('font-family', family);
  });

  test('RSF-10: active, it is drawn while a handle has keyboard focus or is held, and not otherwise; none, never; the digits are the language’s', async ({ page }) => {
    await mount(page, [fixtureOf('default'), fx('never', { sizeIndicator: 'none' }), fx('arabic', {})], { reducedMotion: true });
    await page.locator('[data-fixture="arabic"]').evaluate((el) => el.setAttribute('lang', 'ar-EG'));
    await host(page, 'arabic').evaluate((el: any) => el.requestUpdate());
    await expect(indicator(page, 'arabic')).toHaveText('٤٨٠ × ٢٤٠');
    await expect(indicator(page, 'default')).toHaveCSS('opacity', '0');
    await tabTo(page, separator(page, 'default', 'end'));
    await expect(indicator(page, 'default')).toHaveCSS('opacity', '1');
    await tabTo(page, separator(page, 'never', 'end'));
    await expect(indicator(page, 'default')).toHaveCSS('opacity', '0');
    await expect(indicator(page, 'never')).toHaveCSS('opacity', '0');
    // Held by a press: drawn until the press is released.
    const c = await centreOf(handle(page, 'default', 'end'));
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await expect(indicator(page, 'default')).toHaveCSS('opacity', '1');
    await page.mouse.move(c.x + 30, c.y);
    await expect(indicator(page, 'default')).toHaveText('510 × 240');
    await page.mouse.up();
    await away(page);
    await expect(indicator(page, 'default')).toHaveCSS('opacity', '0');
  });

  test('RSF-11: it fades in over indicator-enter-duration and out over indicator-exit-duration, with their curves; at once where motion is reduced', async ({ page }) => {
    await mount(page, [fixtureOf('default')]);
    const label = indicator(page, 'default');
    expect(Number.parseFloat(await css(label, 'transition-duration')) * 1000).toBe(await ms(page, T('motion-indicator-exit-duration')));
    await tabTo(page, separator(page, 'default', 'end'));
    expect(Number.parseFloat(await css(label, 'transition-duration')) * 1000).toBe(await ms(page, T('motion-indicator-enter-duration')));
    const easing = await page.evaluate((n) => {
      const probe = document.createElement('div');
      probe.style.transitionTimingFunction = `var(${n})`;
      document.body.append(probe);
      const value = getComputedStyle(probe).transitionTimingFunction;
      probe.remove();
      return value;
    }, T('motion-indicator-enter-easing'));
    await expect(label).toHaveCSS('transition-timing-function', easing);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(label).toHaveCSS('transition-duration', '0s');
  });
});

test.describe('the product and the layout', () => {
  test('RSF-12: a size the product sets is drawn at once and sends no event; a narrower layout narrows the box and gives the person’s width back when there is room', async ({ page }) => {
    await mount(page, [fixtureOf('default')]);
    await listen(page);
    await host(page, 'default').evaluate((el: any) => {
      el.width = 400;
      el.height = 300;
    });
    await expect.poll(() => size(page, 'default')).toEqual([400, 300]);
    expect(await box(page, 'default').evaluate((el) => el.getAnimations().length)).toBe(0);
    await host(page, 'default').evaluate((el: any) => (el.style.inlineSize = '360px'));
    const narrow = await bounds(room(page, 'default'));
    const end = await bounds(handle(page, 'default', 'end'));
    const gap = await px(page, T('handle-gap'));
    await expect.poll(async () => (await size(page, 'default'))[0]).toBe(Math.round(narrow.width - end.width - gap));
    expect(await host(page, 'default').evaluate((el: any) => el.width)).toBe(400);
    await host(page, 'default').evaluate((el: any) => (el.style.inlineSize = ''));
    await expect.poll(async () => (await size(page, 'default'))[0]).toBe(400);
    expect(await log(page)).toEqual([]);
  });

  test('RSF-13: right-to-left, the box stands at the right, the end handle on its left edge, the corner at the bottom-left, the indicator at the top-left, written left to right; a drag to the left widens', async ({ page }) => {
    await mount(page, [fixtureOf('rtl')]);
    const r = await bounds(room(page, 'rtl'));
    const b = await bounds(box(page, 'rtl'));
    expect(b.x + b.width).toBeCloseTo(r.x + r.width, 1);
    const end = await bounds(handle(page, 'rtl', 'end'));
    expect(end.x + end.width).toBeLessThan(b.x);
    const corner = await bounds(handle(page, 'rtl', 'bottom-end'));
    expect(corner.x + corner.width).toBeLessThan(b.x);
    expect(corner.y).toBeGreaterThan(b.y + b.height);
    const label = await bounds(indicator(page, 'rtl'));
    expect(label.x - b.x).toBeCloseTo(await px(page, T('size-indicator-offset')), 1);
    await expect(indicator(page, 'rtl')).toHaveText('480 × 240');
    // Its numbers are written left to right, the width at the left, as a size is written in every language.
    await expect(indicator(page, 'rtl')).toHaveCSS('direction', 'ltr');
    await drag(page, handle(page, 'rtl', 'end'), -40, 0);
    expect((await size(page, 'rtl'))[0]).toBe(520);
  });

  test('RSF-14: the direction comes from an ancestor, and a change of it after the first render draws the frame for the new one at once, keeping its size', async ({ page }) => {
    await mount(page, [fixtureOf('default'), fixtureOf('plain')]);
    const stage = page.locator('[data-fixture="default"]');
    const holder = await stage.evaluateHandle((el) => {
      const wrap = document.createElement('div');
      el.parentElement!.insertBefore(wrap, el);
      wrap.append(el);
      return wrap;
    });
    await holder.evaluate((el: HTMLElement) => el.setAttribute('dir', 'rtl'));
    await expect.poll(async () => {
      const b = await bounds(box(page, 'default'));
      const e = await bounds(handle(page, 'default', 'end'));
      return e.x + e.width < b.x;
    }).toBe(true);
    expect(await size(page, 'default')).toEqual([480, 240]);
    expect(await box(page, 'default').evaluate((el) => el.getAnimations().length)).toBe(0);
    // Plain: the handle's centre stays on the end edge, now the left one.
    await page.locator('[data-fixture="plain"]').evaluate((el) => el.setAttribute('dir', 'rtl'));
    const p = await bounds(box(page, 'plain'));
    await expect.poll(async () => Math.round((await centreOf(handle(page, 'plain', 'end'))).x)).toBe(Math.round(p.x));
  });

  test('RSF-15: in forced colors the edge is drawn in the text color and the indicator in the text color on the canvas, edged', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium emulates forced colors');
    await mount(page, [fixtureOf('indicator-always')]);
    await page.emulateMedia({ forcedColors: 'active' });
    const canvasText = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = 'CanvasText';
      document.body.append(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    });
    await expect(box(page, 'indicator-always')).toHaveCSS('border-top-color', canvasText);
    await expect(indicator(page, 'indicator-always')).toHaveCSS('color', canvasText);
    await expect(indicator(page, 'indicator-always')).toHaveCSS('border-top-color', canvasText);
    await expect(indicator(page, 'indicator-always')).toHaveCSS('border-top-width', `${await px(page, T('outline-width'))}px`);
  });

  test('RSF-16: an unknown variant is drawn as outlined and an unknown indicator as active; a snap width that is not a whole number above zero is ignored; each is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('odd', { variant: 'framed', sizeIndicator: 'sometimes', snapWidths: [500.5, -3, 520] })]);
    await expect(box(page, 'odd')).toHaveCSS('border-top-width', `${await px(page, T('outline-width'))}px`);
    for (const value of ['"framed"', '"sometimes"', '"500.5"', '"-3"']) expect(seen.some((w) => w.includes(value) && w.includes('RSF-16')), value).toBe(true);
    await tabTo(page, separator(page, 'odd', 'end'));
    await expect(indicator(page, 'odd')).toHaveCSS('opacity', '1');
    await page.keyboard.press('Escape');
    // 520 still snaps, and the ignored widths do not: from 480, a drag to 501 stays at 501.
    await drag(page, handle(page, 'odd', 'end'), 21, 0);
    expect((await size(page, 'odd'))[0]).toBe(501);
  });

  test('RSF-17: the frame has no words of its own: its shadow root holds no text but the indicator’s digits and mark', async ({ page }) => {
    await mount(page, [fixtureOf('indicator-always')]);
    const text = await host(page, 'indicator-always').evaluate((el) => {
      const walker = document.createTreeWalker(el.shadowRoot!, NodeFilter.SHOW_TEXT);
      const out: string[] = [];
      for (let node = walker.nextNode(); node; node = walker.nextNode()) if (node.textContent!.trim()) out.push(node.textContent!.trim());
      return out.join('');
    });
    expect(text).toMatch(/^[0-9]+ × [0-9]+$/);
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mount(page, spec.fixtures, { theme });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
    }
  });
});

test.describe('fixtures', () => {
  test('every variant, every handle and every indicator of the spec has a fixture', () => {
    const seen = new Set(spec.fixtures.flatMap((f) => [`variant:${f.props.variant ?? 'outlined'}`, `indicator:${f.props.sizeIndicator ?? 'active'}`, ...((f.props.handles as string[] | undefined) ?? ['end']).map((h) => `handle:${h}`)]));
    for (const name of ['variant:outlined', 'variant:plain', 'indicator:none', 'indicator:active', 'indicator:always', 'handle:start', 'handle:end', 'handle:bottom', 'handle:bottom-end']) expect(seen.has(name), name).toBe(true);
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtureAsInAll(page, spec, f);
      await away(page);
      await expect(page.locator(`[data-fixture="${f.id}"]`)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
