// <tanrei-side-sheet>, driven by specs/side-sheet.spec.json: every behaviour id (SSH-1…23) is cited by a test title,
// every fixture has a baseline, and every value is read back from the tokens.
import AxeBuilder from '@axe-core/playwright';
import { atRest } from '../../../test/at-rest.js';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { bounds, css, override, warnings } from '../../../test/destinations.js';
import { type Fixture, type FixtureItem, innerStrokeAtEdges, loadSpec, mountFixtures, resolveColor, resolveToken, tab, tabTo } from '../../../test/harness.js';
import { STOPPED_AFTER, flingThenHold, strokes } from '../../../test/stopped-release.js';

const spec = loadSpec('side-sheet');
type P = Page;
/** The spec's stage: a 720 × 480 window on a surface page. */
const WINDOW = { width: 720, height: 480 };
const T = (name: string) => `--tanrei-comp-side-sheet-${name}`;
const fixtureOf = (id: string) => spec.fixtures.find((f) => f.id === id)!;
const TEXT = fixtureOf('standard').content!;
const LONG = Array.from({ length: 40 }, (_, i) => `<p id="p${i}">Line ${i + 1} of the filters: ${TEXT}</p>`).join('');
const act = (content: string, props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'action', props, content });
const fx = (id: string, props: Fixture['props'] = {}, content: string = TEXT, items?: FixtureItem[]): Fixture => ({
  id,
  props: { open: true, headline: 'Filters', closable: true, closeLabel: 'Close filters', ...props },
  content,
  ...(items ? { items } : {}),
});
/** standard-actions' items: Reset (unflagged), then Apply (confirming). */
const ACTIONS = [act('Reset'), act('Apply', { confirming: true })];
/** Given confirming first: placed dismissive first all the same. */
const GIVEN = [act('Apply', { confirming: true }), act('Cancel', { dismissive: true })];

const host = (page: P, id = 's') => page.locator(`[data-fixture="${id}"] tanrei-side-sheet`);
const sheet = (page: P, id = 's') => host(page, id).locator('.sheet');
const header = (page: P, id = 's') => host(page, id).locator('.header');
const headline = (page: P, id = 's') => host(page, id).locator('.headline');
const close = (page: P, id = 's') => host(page, id).locator('tanrei-button.close');
const content = (page: P, id = 's') => host(page, id).locator('.content');
const actions = (page: P, id = 's') => host(page, id).locator('.actions');
const divider = (page: P, id = 's') => host(page, id).locator('.divider.above-actions');
const headerDivider = (page: P, id = 's') => host(page, id).locator('.divider.below-header');
const action = (page: P, label: string, id = 's') => host(page, id).locator('tanrei-button', { hasText: label });
/** The container color a Button draws (its native button). */
const paint = (locator: Locator) => locator.locator('button').evaluate((el) => getComputedStyle(el).backgroundColor);
/** What debug builds report: warnings and errors. */
function reports(page: P) {
  const seen: { type: string; text: string }[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error') seen.push({ type: message.type(), text: message.text() });
  });
  return seen;
}
/** SSH-20: an on-screen keyboard `height` px tall (0: none), as the visual viewport reports it. */
const keyboard = (page: P, height: number) =>
  page.evaluate((h) => {
    const viewport = window.visualViewport!;
    if (h > 0) Object.defineProperty(viewport, 'height', { configurable: true, get: () => document.documentElement.clientHeight - h });
    else delete (viewport as unknown as Record<string, unknown>).height;
    viewport.dispatchEvent(new Event('resize'));
  }, height);
const filler = (page: P, id = 's') => page.locator(`[data-fixture="${id}"] .side-sheet-content`);
const px = (page: P, name: string) => resolveToken(page, name);
const ms = (page: P, name: string) => resolveToken(page, name, 'duration');
const shadowOf = (page: P, n: string) =>
  page.evaluate((name) => {
    const p = document.createElement('div');
    p.style.boxShadow = `var(${name})`;
    document.body.appendChild(p);
    const v = getComputedStyle(p).boxShadow;
    p.remove();
    return v;
  }, n);

/** Every sheet has rendered and laid itself out, and two frames have passed. */
const settled = (page: P) =>
  page.evaluate(async () => {
    for (const el of document.querySelectorAll<any>('tanrei-side-sheet')) await el.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    for (const el of document.querySelectorAll<any>('tanrei-side-sheet')) await el.updateComplete;
  });
async function mount(page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) {
  await page.setViewportSize(WINDOW);
  await mountFixtures(page, spec, { fixtures, icons: true, ...options });
  await settled(page);
}
/** Waits for the sheet's own motion (a slide, a width change) to end. */
const still = (page: P, id = 's') =>
  expect.poll(() => host(page, id).evaluate((el) => [el, ...el.shadowRoot!.querySelectorAll('.sheet')].flatMap((e) => e.getAnimations()).filter((a) => a.playState === 'running').length)).toBe(0);
const setOpen = (page: P, open: boolean, id = 's') =>
  host(page, id).evaluate(async (el: any, o) => {
    el.open = o;
    await el.updateComplete;
  }, open);
/**
 * Sets open and lists the transitions that starts — the host's (a standard sheet's width) and the panel's (a modal
 * sheet's slide and fade) — in the same task: no frame passes between the two, so the list does not depend on how long
 * the test's next command takes to reach the browser (on a loaded runner, longer than the whole enter motion).
 */
const openMoving = (page: P, open: boolean, id = 's') =>
  host(page, id).evaluate(async (el: any, o) => {
    el.open = o;
    await el.updateComplete;
    const properties = (e: Element) => e.getAnimations().map((a) => (a as CSSTransition).transitionProperty);
    return { host: properties(el), sheet: properties(el.shadowRoot.querySelector('.sheet')) };
  }, open);

const wire = (page: P) =>
  page.evaluate(() => {
    const log: string[] = ((window as any).log = []);
    for (const el of document.querySelectorAll<any>('tanrei-side-sheet')) el.addEventListener('close', (e: any) => log.push(`close:${e.detail.reason}`));
  });
const log = (page: P) => page.evaluate(() => (window as any).log as string[]);
/** Closes the sheet whenever it asks, as a product does. */
const closeOnRequest = (page: P) => page.evaluate(() => document.querySelectorAll<any>('tanrei-side-sheet').forEach((el) => el.addEventListener('close', () => (el.open = false))));

/** What has focus, through shadow roots: its id, else its tag. */
const focused = (page: P) =>
  page.evaluate(() => {
    let active: Element | null = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    return active?.id || active?.localName || null;
  });

/** How far the modal sheet is drawn from where it rests, toward the end edge (left-to-right). */
const offset = async (page: P, id = 's') => {
  const box = await bounds(sheet(page, id));
  return box.x + box.width - WINDOW.width;
};
/** A translate transition of the modal sheet: where it started, and how long it runs (in whole milliseconds, as the token is: Firefox reports a token of 200 ms as 200.000015, a float of seconds). */
type Slide = { from: string; duration: number };
/**
 * Watches the next release from inside the page and records the modal sheet's slides twice:
 * at the pointerup — after the sheet's own handler (on the window, in the capture phase) and after the product's answer
 * to `close` has rendered — and in the next frame, after the sheet's own frame callback. What is seen then does not
 * depend on how long the test's next command takes to reach the browser. Read it with `released()` once the pointer is
 * up.
 */
const watchRelease = (page: P, id = 's') =>
  host(page, id).evaluate((el: any) => {
    const sheet = el.shadowRoot.querySelector('.sheet') as HTMLElement;
    const seen = () =>
      sheet
        .getAnimations()
        .filter((a) => (a as CSSTransition).transitionProperty === 'translate')
        .map((a) => ({ from: String(((a.effect as KeyframeEffect).getKeyframes()[0] as Record<string, unknown>).translate ?? ''), duration: Math.round(Number(a.effect!.getTiming().duration)) }));
    (window as any).released = new Promise((resolve) => {
      window.addEventListener(
        'pointerup',
        async () => {
          await el.updateComplete;
          const atRelease = seen();
          requestAnimationFrame(() => resolve({ atRelease, nextFrame: seen() }));
        },
        { once: true },
      );
    });
  });
const released = (page: P) => page.evaluate(() => (window as any).released as Promise<{ atRelease: Slide[]; nextFrame: Slide[] }>);
/** A point inside the modal sheet's content, clear of every control. */
const inside = async (page: P, id = 's') => {
  const box = await bounds(sheet(page, id));
  return { x: box.x + 60, y: box.y + box.height / 2 };
};
/** A slow drag (released after a pause: no fling), or not released. */
async function drag(page: P, from: { x: number; y: number }, dx: number, { steps = 10, release = true } = {}) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) await page.mouse.move(from.x + (dx * i) / steps, from.y);
  await page.waitForTimeout(120);
  if (release) await page.mouse.up();
}
/**
 * A fast drag, released while still moving: dispatched in the page, each event stamped 8 ms after the one before — the
 * time the finger was there, as a touchscreen stamps it. The sheet measures a release's velocity on those stamps, so a
 * fling is a fling however late the page's timers run on a loaded machine (an unstamped event carries the time it was
 * created: one 8 ms wait stretched past 40 ms made this fling slower than a fling). The real waits are at least as long
 * as the stamps, so no stamp is in the future.
 */
async function fling(page: P, from: { x: number; y: number }, dx: number) {
  await page.evaluate(
    async ([x, y, d]) => {
      const sheet = document.querySelector('tanrei-side-sheet')!;
      const target = sheet.shadowRoot!.elementFromPoint(x, y)!;
      let stamp = performance.now();
      const at = (type: string, xx: number) => {
        const event = new PointerEvent(type, { bubbles: true, composed: true, pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: xx, clientY: y });
        Object.defineProperty(event, 'timeStamp', { value: stamp });
        return event;
      };
      target.dispatchEvent(at('pointerdown', x));
      for (let i = 1; i <= 3; i++) {
        await new Promise((resolve) => setTimeout(resolve, 8));
        stamp += 8;
        target.dispatchEvent(at('pointermove', x + (d * i) / 3));
      }
      target.dispatchEvent(at('pointerup', x + d));
    },
    [from.x, from.y, dx] as const,
  );
}

test.describe('drawing', () => {
  test('SSH-7: container.width at the end edge, the full height; each variant’s color, elevation, start corners (end corners square) and start edge; a modal sheet leaves a target of scrim; right-to-left mirrors it', async ({ page }) => {
    await mount(page, [fx('s', { variant: 'standard' })]);
    const [width, edge] = [await px(page, T('container-width')), await px(page, T('outline-width'))];
    let box = await bounds(sheet(page));
    expect([box.x, box.y, box.width, box.height]).toEqual([WINDOW.width - width, 0, width, WINDOW.height]);
    expect((await bounds(filler(page))).width).toBe(WINDOW.width - width);
    await expect(sheet(page)).toHaveCSS('background-color', await resolveColor(page, T('container-color-standard')));
    expect(await css(sheet(page), 'box-shadow')).toBe(await shadowOf(page, T('container-elevation-standard')));
    expect(Number.parseFloat(await css(sheet(page), 'border-top-left-radius'))).toBeCloseTo(await px(page, T('container-shape-standard')), 1);
    const edgeBox = host(page).locator('.edge');
    expect(Number.parseFloat(await css(edgeBox, 'border-left-width'))).toBeCloseTo(edge, 1);
    await expect(edgeBox).toHaveCSS('border-left-color', await resolveColor(page, T('outline-color-standard')));
    await expect(edgeBox).toHaveCSS('border-right-width', '0px');
    // Modal: at the window's end edge, its full height, over the content.
    await mount(page, [fx('s', { variant: 'modal' })]);
    box = await bounds(sheet(page));
    expect([box.x, box.y, box.width, box.height]).toEqual([WINDOW.width - width, 0, width, WINDOW.height]);
    await expect(sheet(page)).toHaveCSS('background-color', await resolveColor(page, T('container-color-modal')));
    expect(await css(sheet(page), 'box-shadow')).toBe(await shadowOf(page, T('container-elevation-modal')));
    const radius = await px(page, T('container-shape-modal'));
    expect(radius).toBeGreaterThan(0);
    expect(Number.parseFloat(await css(sheet(page), 'border-top-left-radius'))).toBeCloseTo(radius, 1);
    expect(Number.parseFloat(await css(sheet(page), 'border-bottom-left-radius'))).toBeCloseTo(radius, 1);
    expect(await css(sheet(page), 'border-top-right-radius')).toBe('0px');
    expect(await css(sheet(page), 'border-bottom-right-radius')).toBe('0px');
    await expect(host(page).locator('.edge')).toHaveCSS('border-left-color', await resolveColor(page, T('outline-color-modal')));
    // A narrow window: never wider than the window less sys.target.touch.
    const touch = await px(page, '--tanrei-sys-target-touch');
    await page.setViewportSize({ width: 360, height: 480 });
    await expect.poll(async () => (await bounds(sheet(page))).width).toBe(360 - touch);
    expect((await bounds(sheet(page))).x).toBe(touch);
    // Right-to-left: at the left edge, its end corners square, the edge at its (right) start.
    await page.setViewportSize(WINDOW);
    await mount(page, [fx('s', { variant: 'modal' }), fx('std', { variant: 'standard' })]);
    await page.evaluate(() => (document.documentElement.dir = 'rtl'));
    await expect.poll(async () => (await bounds(sheet(page))).x).toBe(0);
    expect(Number.parseFloat(await css(sheet(page), 'border-top-right-radius'))).toBeCloseTo(radius, 1);
    expect(await css(sheet(page), 'border-top-left-radius')).toBe('0px');
    expect(Number.parseFloat(await css(host(page, 'std').locator('.edge'), 'border-right-width'))).toBeCloseTo(edge, 1);
    const std = await bounds(sheet(page, 'std'));
    expect(std.x).toBe((await bounds(page.locator('[data-fixture="std"]'))).x);
    const close = await bounds(host(page, 'std').locator('tanrei-button.close'));
    expect(close.x).toBeCloseTo(std.x + (await px(page, T('header-padding-inline-end'))), 0);
  });

  test('SSH-8: the header — at least header.height, the headline from padding-inline, the close button header.padding-inline-end from the end and header.gap after the headline, both centred — then the content inset by padding-inline, then padding-block (or the actions); the color reaches under the insets', async ({ page }) => {
    await mount(page, [fx('s'), fx('bare', { headline: '', closable: false }), fx('titled', { closable: false })]);
    const [pad, block, height, gap, end] = [await px(page, T('container-padding-inline')), await px(page, T('container-padding-block')), await px(page, T('header-height')), await px(page, T('header-gap')), await px(page, T('header-padding-inline-end'))];
    const s = await bounds(sheet(page));
    const h = await bounds(header(page));
    const title = await bounds(headline(page));
    const button = await bounds(close(page));
    expect(h.height).toBe(height);
    expect(title.x).toBeCloseTo(s.x + pad, 1);
    expect(button.x + button.width).toBeCloseTo(s.x + s.width - end, 1);
    expect(button.x - (title.x + title.width)).toBeCloseTo(gap, 1);
    expect(title.y + title.height / 2).toBeCloseTo(h.y + h.height / 2, 0);
    expect(button.y + button.height / 2).toBeCloseTo(h.y + h.height / 2, 0);
    // The content: directly below the header, padding-inline from both edges, padding-block above the bottom.
    const c = await bounds(content(page));
    const inner = await bounds(host(page).locator('.inner'));
    expect(c.y).toBeCloseTo(h.y + h.height, 1);
    expect(inner.x).toBeCloseTo(s.x + pad, 1);
    expect(inner.width).toBeCloseTo(s.width - 2 * pad, 1);
    expect(Number.parseFloat(await css(content(page), 'padding-bottom'))).toBeCloseTo(block, 1);
    // Without a close button, the headline runs to padding-inline from the end edge.
    const titled = await bounds(headline(page, 'titled'));
    expect(titled.x + titled.width).toBeCloseTo(s.x + s.width - pad, 1);
    // Without a header: the content starts padding-block below the top edge.
    await expect(header(page, 'bare')).toHaveCount(0);
    expect((await bounds(host(page, 'bare').locator('.inner'))).y).toBeCloseTo((await bounds(sheet(page, 'bare'))).y + block, 1);
    // The system insets (env(safe-area-inset-*), 0 in this window): the container reaches under them, its parts stay inside.
    await host(page).evaluate((el: HTMLElement) => {
      el.style.setProperty('--_inset-end', '30px');
      el.style.setProperty('--_inset-top', '20px');
      el.style.setProperty('--_inset-bottom', '10px');
    });
    await still(page);
    const wide = await bounds(sheet(page));
    expect(wide.width).toBe(s.width + 30);
    expect([wide.y, wide.height]).toEqual([s.y, s.height]);
    expect((await bounds(header(page))).y).toBeCloseTo(wide.y + 20, 1);
    const moved = await bounds(close(page));
    expect(moved.x + moved.width).toBeCloseTo(wide.x + wide.width - 30 - end, 1);
    const c2 = await bounds(content(page));
    expect(c2.y + c2.height).toBeCloseTo(wide.y + wide.height - 10, 1);
  });

  test('SSH-9: the headline in headline.typescale and headline.color, a heading, wrapping onto more lines and growing the header rather than truncating', async ({ page }) => {
    const words = 'Filters for every selected label, project and person in the results of the last thirty days';
    await mount(page, [fx('s'), fx('long', { headline: words })]);
    await expect(headline(page)).toHaveCSS('color', await resolveColor(page, T('headline-color')));
    // The role whole: its font (size, line height, weight, family) and its letter spacing.
    const role = await page.evaluate(
      ([font, spacing]) => {
        const p = document.createElement('div');
        p.style.font = `var(${font})`;
        p.style.letterSpacing = `var(${spacing})`;
        document.body.appendChild(p);
        const s = getComputedStyle(p);
        const v = [s.fontSize, s.lineHeight, s.fontWeight, s.fontFamily, s.letterSpacing];
        p.remove();
        return v;
      },
      [T('headline-typescale-font'), T('headline-typescale-letter-spacing')] as const,
    );
    expect(await headline(page).evaluate((el) => ['fontSize', 'lineHeight', 'fontWeight', 'fontFamily', 'letterSpacing'].map((k) => (getComputedStyle(el) as any)[k]))).toEqual(role);
    await expect(host(page).getByRole('heading', { name: 'Filters' })).toHaveCount(1);
    const line = Number.parseFloat(await css(headline(page, 'long'), 'line-height'));
    const long = await bounds(headline(page, 'long'));
    expect(long.height).toBeGreaterThanOrEqual(3 * line - 1);
    expect(long.height).toBeGreaterThan(await px(page, T('header-height')));
    expect((await bounds(header(page, 'long'))).height).toBeCloseTo(long.height, 1);
    expect(await headline(page, 'long').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  });

  test('SSH-10: the content gets content.color and plain text the body role; taller than the room, it scrolls between the header and the actions, which stay in place, and the keyboard can scroll it', async ({ page }) => {
    await mount(page, [fx('s', {}, TEXT, ACTIONS), fx('long', { variant: 'standard' }, LONG, ACTIONS)]);
    await expect(content(page)).toHaveCSS('color', await resolveColor(page, T('content-color')));
    const body = await page.evaluate(() => {
      const p = document.createElement('div');
      p.style.font = 'var(--tanrei-sys-typescale-body-font)';
      document.body.appendChild(p);
      const v = [getComputedStyle(p).fontSize, getComputedStyle(p).lineHeight];
      p.remove();
      return v;
    });
    expect([await css(content(page), 'font-size'), await css(content(page), 'line-height')]).toEqual(body);
    await expect(content(page)).not.toHaveAttribute('tabindex');
    // Taller than the room: it scrolls there, and is a Tab stop.
    const c = content(page, 'long');
    expect(await c.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    await expect(c).toHaveAttribute('tabindex', '0');
    await tabTo(page, c);
    const [h, a] = [await bounds(header(page, 'long')), await bounds(actions(page, 'long'))];
    await page.keyboard.press('PageDown');
    await expect.poll(() => c.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    expect(await bounds(header(page, 'long'))).toEqual(h);
    expect(await bounds(actions(page, 'long'))).toEqual(a);
    // Focus on an element below the fold scrolls it into view. (Once Page Down's own scroll has ended: the key scrolls
    // over some frames, and an engine carries what is left of it on from wherever the focus has brought the content.)
    await atRest(c);
    await host(page, 'long').evaluate((el) => el.querySelector('#p39')!.setAttribute('tabindex', '-1'));
    await page.locator('[data-fixture="long"] #p39').focus();
    const p = await bounds(page.locator('[data-fixture="long"] #p39'));
    const room = await bounds(c);
    expect(p.y + p.height).toBeLessThanOrEqual(room.y + room.height + 1);
  });

  test('SSH-10: the keyboard focus of a content that scrolls is drawn inside its edges and stays there while it scrolls — its inner stroke does not move away with the content', async ({ page }) => {
    await mount(page, [fx('long', { variant: 'standard' }, LONG, ACTIONS)]);
    const c = content(page, 'long');
    await tabTo(page, c);
    expect(await c.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
    expect(await innerStrokeAtEdges(page, c), 'before it is scrolled').toEqual({ top: true, bottom: true });
    await c.evaluate((el) => (el.scrollTop = 40));
    expect(await c.evaluate((el) => el.scrollTop)).toBe(40);
    expect(await innerStrokeAtEdges(page, c), 'scrolled by 40').toEqual({ top: true, bottom: true });
    await c.evaluate((el) => (el.scrollTop = el.scrollHeight));
    expect(await innerStrokeAtEdges(page, c), 'scrolled to its end').toEqual({ top: true, bottom: true });
  });

  test('SSH-11: with an action, a divider.width hairline in divider.color across the full width (hidden) whether or not the content scrolls; fill — the actions share the row equally, dismissive at the start and confirming at the end, actions.gap apart, padding-inline from the edges and actions.padding-block above and below; focus follows the placed order', async ({ page }) => {
    await mount(page, [fx('s', { variant: 'standard' }, TEXT, GIVEN), fx('long', { variant: 'standard' }, LONG, ACTIONS), fx('none', { variant: 'standard' })]);
    expect(await page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), T('actions-arrangement'))).toBe('fill');
    const [pad, gap, block, line] = [await px(page, T('container-padding-inline')), await px(page, T('actions-gap')), await px(page, T('actions-padding-block')), await px(page, T('divider-width'))];
    const s = await bounds(sheet(page));
    const d = await bounds(divider(page));
    expect([d.x, d.width]).toEqual([s.x, s.width]);
    expect(d.height).toBeCloseTo(line, 1);
    await expect(divider(page)).toHaveCSS('background-color', await resolveColor(page, T('divider-color')));
    await expect(divider(page)).toHaveAttribute('aria-hidden', 'true');
    // The content does not scroll, and the divider is drawn all the same, directly below it.
    expect(await content(page).evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(false);
    expect(d.y).toBeCloseTo((await bounds(content(page))).y + (await bounds(content(page))).height, 1);
    // Given confirming first: Cancel (dismissive) at the start, Apply (confirming) at the end, sharing the row.
    const [cancel, apply] = [await bounds(action(page, 'Cancel')), await bounds(action(page, 'Apply'))];
    expect(cancel.x).toBeCloseTo(s.x + pad, 0);
    expect(apply.x - (cancel.x + cancel.width)).toBeCloseTo(gap, 0);
    expect(s.x + s.width - (apply.x + apply.width)).toBeCloseTo(pad, 0);
    expect(cancel.width).toBeCloseTo(apply.width, 0);
    expect(cancel.y).toBe(apply.y);
    expect(apply.y - (d.y + d.height)).toBeCloseTo(block, 1);
    expect(s.y + s.height - (apply.y + apply.height)).toBeCloseTo(block, 1);
    // The Button's container fills its share; its height is the Button's own (medium).
    expect((await bounds(action(page, 'Cancel').locator('button'))).width).toBeCloseTo(cancel.width, 0);
    expect(apply.height).toBe(await px(page, '--tanrei-comp-button-container-height-medium'));
    // Focus and the accessibility tree follow the placed order (BGR-15).
    await action(page, 'Cancel').locator('button').focus();
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.textContent?.trim())).toBe('Apply');
    // A scrolling content keeps its divider.
    await expect(divider(page, 'long')).toBeVisible();
    // Without actions: no divider and no row.
    await expect(host(page, 'none').locator('.footer')).toBeHidden();
  });

  test('SSH-11: a column when a label does not fit its share — confirming on top, each as wide as the inner width, actions.gap apart, focus in that order — re-decided when the width changes; right-to-left mirrors the row', async ({ page }) => {
    await mount(page, [fixtureOf('modal-stacked')]);
    const [pad, gap] = [await px(page, T('container-padding-inline')), await px(page, T('actions-gap'))];
    const id = 'modal-stacked';
    await expect(actions(page, id)).toHaveClass(/stacked/);
    const s = await bounds(sheet(page, id));
    const [save, discard] = [await bounds(action(page, 'Save and continue', id)), await bounds(action(page, 'Discard changes', id))];
    expect(save.y).toBeLessThan(discard.y);
    expect(discard.y - (save.y + save.height)).toBeCloseTo(gap, 0);
    for (const r of [save, discard]) {
      expect(r.x).toBeCloseTo(s.x + pad, 0);
      expect(r.width).toBeCloseTo(s.width - 2 * pad, 0);
    }
    await action(page, 'Save and continue', id).locator('button').focus();
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.textContent?.trim())).toBe('Discard changes');
    // A wider sheet gives the row room again: dismissive at the start.
    await override(page, { [T('container-width')]: '600px' });
    await expect(actions(page, id)).not.toHaveClass(/stacked/);
    const [wideSave, wideDiscard] = [await bounds(action(page, 'Save and continue', id)), await bounds(action(page, 'Discard changes', id))];
    expect(wideDiscard.x).toBeLessThan(wideSave.x);
    expect(wideDiscard.y).toBe(wideSave.y);
    // And a narrow one stacks a row that fitted.
    await mount(page, [fx('s', { variant: 'standard' }, TEXT, GIVEN)]);
    await expect(actions(page)).not.toHaveClass(/stacked/);
    await override(page, { [T('container-width')]: '180px' });
    await expect(actions(page)).toHaveClass(/stacked/);
    expect((await bounds(action(page, 'Apply'))).y).toBeLessThan((await bounds(action(page, 'Cancel'))).y);
    // Right-to-left: dismissive at the right, confirming at the left.
    await mount(page, [fx('s', { variant: 'standard' }, TEXT, GIVEN)]);
    await page.evaluate(() => (document.documentElement.dir = 'rtl'));
    await expect.poll(async () => (await bounds(action(page, 'Cancel'))).x).toBeGreaterThan((await bounds(action(page, 'Apply'))).x);
    const rs = await bounds(sheet(page));
    expect(rs.x + rs.width - ((await bounds(action(page, 'Cancel'))).x + (await bounds(action(page, 'Cancel'))).width)).toBeCloseTo(pad, 0);
  });

  test('SSH-11: start (a system choice) — at their own widths, the row aligned to the start edge; a column as wide as its widest action, at the start, when the row does not fit', async ({ page }) => {
    await mount(page, [fx('s', { variant: 'standard', open: false }, TEXT, GIVEN)]);
    await override(page, { [T('actions-arrangement')]: 'start' });
    await setOpen(page, true);
    await still(page);
    const [pad, gap] = [await px(page, T('container-padding-inline')), await px(page, T('actions-gap'))];
    const s = await bounds(sheet(page));
    const [cancel, apply] = [await bounds(action(page, 'Cancel')), await bounds(action(page, 'Apply'))];
    expect(cancel.x).toBeCloseTo(s.x + pad, 0);
    expect(apply.x - (cancel.x + cancel.width)).toBeCloseTo(gap, 0);
    expect(s.x + s.width - (apply.x + apply.width)).toBeGreaterThan(pad + 1);
    // At its own width: the Button is as wide as it is alone.
    const own = await page.evaluate(() => {
      const b = document.createElement('tanrei-button');
      b.textContent = 'Cancel';
      b.style.position = 'absolute';
      document.body.append(b);
      return new Promise<number>((resolve) => requestAnimationFrame(() => {
        const w = b.getBoundingClientRect().width;
        b.remove();
        resolve(w);
      }));
    });
    expect(cancel.width).toBeCloseTo(own, 0);
    // A row that does not fit: a column as wide as its widest action, at the start.
    await override(page, { [T('container-width')]: '180px' });
    await still(page);
    await expect(actions(page)).toHaveClass(/stacked/);
    const narrow = await bounds(sheet(page));
    const rows = [await bounds(action(page, 'Apply')), await bounds(action(page, 'Cancel'))];
    const widest = Math.max(...rows.map((r) => r.width));
    for (const r of rows) {
      expect(r.x).toBeCloseTo(narrow.x + pad, 0);
      expect(r.width).toBeCloseTo(widest, 0);
    }
    expect(widest).toBeLessThan(narrow.width - 2 * pad);
    expect(rows[0].y).toBeLessThan(rows[1].y);
  });

  test('SSH-12: a modal dialog named by the headline, or a complementary region named by it; an empty headline still renders and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fixtureOf('modal')]);
    await expect(page.getByRole('dialog', { name: 'Filters' })).toHaveCount(1);
    expect(await host(page, 'modal').locator('dialog').evaluate((el) => el.matches(':modal'))).toBe(true);
    await mount(page, [fixtureOf('standard')]);
    await expect(page.getByRole('complementary', { name: 'Filters' })).toHaveCount(1);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await mount(page, [fx('s', { headline: '', variant: 'modal' })]);
    await expect(sheet(page)).toBeVisible();
    await expect.poll(() => seen.filter((w) => w.includes('SSH-12')).length).toBe(1);
    expect(seen.join('\n')).toMatch(/headline is empty, so the modal dialog has no accessible name/);
  });

  test('SSH-13: a variant the system does not have renders with standard’s tokens (as a standard sheet) and is reported; a value a layer adds reads its own tokens', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('odd', { variant: 'floating' }), fx('s', { variant: 'standard' })]);
    for (const property of ['background-color', 'box-shadow', 'border-top-left-radius', 'width']) expect(await css(sheet(page, 'odd'), property), property).toBe(await css(sheet(page, 's'), property));
    await expect(host(page, 'odd').locator('dialog')).toHaveCount(0);
    await expect.poll(() => seen.filter((w) => w.includes('SSH-13')).length).toBe(1);
    expect(seen.join('\n')).toMatch(/variant "floating" is not a value of the active design system; it is drawn as "standard"/);
    // A layer's own value: its tokens, no report.
    await mount(page, [fx('s', { variant: 'inspector' })]);
    await override(page, { [T('container-color-inspector')]: 'rgb(1, 2, 3)', [T('container-elevation-inspector')]: 'var(--tanrei-sys-elevation-level0)', [T('outline-color-inspector')]: 'rgb(4, 5, 6)', [T('container-shape-inspector')]: '0px' });
    await expect(sheet(page)).toHaveCSS('background-color', 'rgb(1, 2, 3)');
    await expect(host(page).locator('.edge')).toHaveCSS('border-left-color', 'rgb(4, 5, 6)');
    await expect(host(page, 's').locator('dialog')).toHaveCount(0);
  });

  test('SSH-14: enlarged text keeps the width, grows the header with the headline, scrolls the content and stacks the actions once a label no longer fits its share; the close button does not scale', async ({ page }) => {
    await mount(page, [fx('s', { headline: 'Filters for every label' }, `${TEXT} ${TEXT} ${TEXT}`, ACTIONS)]);
    await expect(actions(page)).not.toHaveClass(/stacked/);
    const before = { sheet: await bounds(sheet(page)), header: await bounds(header(page)), close: await bounds(close(page)) };
    await override(page, { '--tanrei-dial-type-base': '48px' });
    await expect.poll(async () => (await bounds(header(page))).height).toBeGreaterThan(before.header.height);
    const after = { sheet: await bounds(sheet(page)), close: await bounds(close(page)) };
    expect(after.sheet.width).toBe(before.sheet.width);
    expect([after.close.width, after.close.height]).toEqual([before.close.width, before.close.height]);
    await expect.poll(() => content(page).evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    await expect(content(page)).toHaveAttribute('tabindex', '0');
    await expect(actions(page)).toHaveClass(/stacked/);
    expect((await bounds(action(page, 'Apply'))).y).toBeLessThan((await bounds(action(page, 'Reset'))).y);
  });
});

test.describe('the close button', () => {
  test('SSH-5: while closable, an icon-only medium Button with the close glyph named by close-label, in close-button.variant (tonal) given through the Button’s channel; a click, Enter or Space asks to close once with the reason close, in either variant; an empty close-label still draws it and is reported', async ({ page }) => {
    const seen = warnings(page);
    for (const variant of ['standard', 'modal']) {
      await mount(page, [fx('s', { variant }, TEXT, ACTIONS)]);
      await wire(page);
      expect(await page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), T('close-button-variant'))).toBe('tonal');
      // No variant attribute: the sheet gives it, and the Button draws the tonal variant from its own tokens (at rest:
      // the pointer is moved off the previous round's button).
      await page.mouse.move(0, 0);
      await expect(close(page)).not.toHaveAttribute('variant');
      await expect.poll(() => paint(close(page))).toBe(await resolveColor(page, '--tanrei-comp-button-tonal-container-color'));
      await expect(close(page)).toHaveAttribute('size', 'medium');
      expect(await close(page).evaluate((el) => el.textContent?.trim())).toBe('close');
      const size = await px(page, '--tanrei-comp-button-container-height-medium');
      const box = await bounds(close(page).locator('button'));
      expect([box.width, box.height]).toEqual([size, size]);
      await expect(host(page).getByRole('button', { name: 'Close filters' })).toHaveCount(1);
      await close(page).locator('button').click();
      expect(await log(page), variant).toEqual(['close:close']);
      await close(page).locator('button').focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('Space');
      expect(await log(page), variant).toEqual(['close:close', 'close:close', 'close:close']);
      // Controlled: it stays open until the product closes it.
      await expect(host(page)).toHaveAttribute('open', '');
    }
    // A system's choice (m3-like: text), read when the sheet opens.
    await mount(page, [fx('s', { variant: 'standard', open: false })]);
    await override(page, { [T('close-button-variant')]: 'text' });
    await setOpen(page, true);
    await page.mouse.move(0, 0);
    await expect.poll(() => paint(close(page))).toBe(await resolveColor(page, '--tanrei-comp-button-text-container-color'));
    // Not closable: no button.
    await mount(page, [fx('s', { closable: false })]);
    await expect(close(page)).toHaveCount(0);
    await mount(page, [fx('s', { closeLabel: '' })]);
    await expect(close(page)).toBeVisible();
    await expect.poll(() => seen.filter((w) => w.includes('SSH-5')).length).toBe(1);
    expect(seen.join('\n')).toMatch(/close-label is empty, so the close button has no accessible name/);
  });
});

test.describe('forms, focus and dismissal', () => {
  const opener = (page: P) =>
    page.evaluate(() => {
      document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<button id="opener">Open</button>');
      document.querySelector('main')!.insertAdjacentHTML('beforeend', '<button id="after">After</button>');
    });

  test('SSH-1: a standard sheet takes its width at the end of the row while open and none while closed, sliding while the content beside it resizes (enter and exit motion, at once where reduced); no scrim, no trap, Tab leaves it open, Escape and drags are ignored', async ({ page }) => {
    await mount(page, [fx('s', { variant: 'standard', open: false }, '<button id="inside">Inside</button>')]);
    const [width, enter, exit] = [await px(page, T('container-width')), await ms(page, T('motion-enter-duration')), await ms(page, T('motion-exit-duration'))];
    // Closed: no width, nothing to assistive technology or focus.
    expect((await bounds(filler(page))).width).toBe(WINDOW.width);
    await expect(page.getByRole('complementary')).toHaveCount(0);
    await expect(sheet(page)).toHaveAttribute('inert', '');
    const opening = await openMoving(page, true);
    expect(Number.parseFloat(await css(host(page), 'transition-duration')) * 1000).toBeCloseTo(enter, 0);
    // (A transition of inline-size is reported as one of width, its physical property, in every engine.)
    expect(opening.host.some((property) => ['inline-size', 'width'].includes(property))).toBe(true);
    await still(page);
    expect((await bounds(filler(page))).width).toBe(WINDOW.width - width);
    expect((await bounds(sheet(page))).x).toBe(WINDOW.width - width);
    await expect(page.getByRole('complementary', { name: 'Filters' })).toHaveCount(1);
    // A layout region: no scrim, nothing inert, the page's scroll free; Tab leaves it and it stays open; Escape and a drag do nothing.
    await wire(page);
    await expect(host(page).locator('dialog')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('beforeend', '<button id="after">After</button>'));
    await page.locator('#inside').focus();
    await page.keyboard.press('Escape');
    await drag(page, { x: WINDOW.width - width + 60, y: 300 }, 250);
    expect((await bounds(sheet(page))).x).toBe(WINDOW.width - width);
    await tabTo(page, page.locator('#after'));
    await expect(host(page)).toHaveAttribute('open', '');
    expect(await log(page)).toEqual([]);
    // Closing: the exit motion, back to no width.
    await setOpen(page, false);
    expect(Number.parseFloat(await css(host(page), 'transition-duration')) * 1000).toBeCloseTo(exit, 0);
    await still(page);
    expect((await bounds(filler(page))).width).toBe(WINDOW.width);
    await expect(host(page)).toHaveCSS('visibility', 'hidden');
    // Reduced motion: at once.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await setOpen(page, true);
    expect(await host(page).evaluate((el) => el.getAnimations().length)).toBe(0);
    expect((await bounds(filler(page))).width).toBe(WINDOW.width - width);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  test('SSH-2: a modal sheet slides in from the end edge over a fading scrim (enter motion) and out to it (exit motion), fades in place where motion is reduced; while open everything behind it is inert, the page’s scroll is held and focus stays inside (Tab wraps both ways)', async ({ page }) => {
    await mount(page, [fx('s', { variant: 'modal', open: false }, '<button id="a">A</button> <button id="b">B</button>', ACTIONS)]);
    const [enter, exit] = [await ms(page, T('motion-enter-duration')), await ms(page, T('motion-exit-duration'))];
    const dialog = host(page).locator('dialog');
    const opening = await openMoving(page, true);
    expect(await dialog.evaluate((el) => el.matches(':modal'))).toBe(true);
    expect(Number.parseFloat(await css(dialog, 'transition-duration')) * 1000).toBeCloseTo(enter, 0);
    expect(opening.sheet).toContain('translate');
    expect(await css(dialog, 'background-color', '::backdrop')).toBe(await resolveColor(page, T('scrim-color')));
    await still(page);
    expect(await offset(page)).toBeCloseTo(0, 1);
    // Everything behind: inert, not pressable; the page's scroll held.
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<button id="behind" style="position:fixed;inset:0 auto auto 0">Behind</button>'));
    await page.locator('#behind').evaluate((el: HTMLElement) => el.focus());
    expect(await focused(page)).not.toBe('behind');
    expect(await page.evaluate(() => document.elementFromPoint(5, 5)?.id ?? null)).not.toBe('behind');
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden');
    // The trap: the close button, the content, the actions, and around.
    await close(page).locator('button').focus();
    const order: (string | null)[] = [];
    for (let i = 0; i < 5; i++) {
      await tab(page);
      order.push(await focused(page));
    }
    expect(order).toEqual(['a', 'b', 'button', 'button', 'button']);
    expect(await close(page).evaluate((el) => el.shadowRoot!.activeElement?.localName)).toBe('button');
    await tab(page, { back: true });
    // The actions in their placed order: Reset (unflagged), then Apply (confirming) last.
    expect(await page.evaluate(() => (document.activeElement as HTMLElement | null)?.textContent)).toBe('Apply');
    await setOpen(page, false);
    expect(Number.parseFloat(await css(dialog, 'transition-duration')) * 1000).toBeCloseTo(exit, 0);
    await expect(dialog).toHaveJSProperty('open', false);
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
    // Reduced motion: a fade in place, no slide.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mount(page, [fx('s', { variant: 'modal', open: false })]);
    const moving = (await openMoving(page, true)).sheet;
    expect(moving).toContain('opacity');
    expect(moving).not.toContain('translate');
    expect(await offset(page)).toBeCloseTo(0, 1);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  test('SSH-3: opening moves focus to the element marked autofocus, else the sheet; closing with focus inside returns it (or drops it when that element is gone) — when it opens and closes, not when the motion ends; mounted open, only a modal sheet moves focus', async ({ page }) => {
    for (const variant of ['modal', 'standard']) {
      await mount(page, [fx('s', { open: false, variant }, '<button id="a">A</button> <button id="marked" autofocus>B</button>'), fx('plain', { open: false, variant, headline: 'Plain' })]);
      await opener(page);
      await page.locator('#opener').focus();
      const opening = await openMoving(page, true);
      expect([...opening.host, ...opening.sheet].length, variant).toBeGreaterThan(0);
      expect(await focused(page), variant).toBe('marked');
      await setOpen(page, false);
      expect(await focused(page), variant).toBe('opener');
      await setOpen(page, true, 'plain');
      expect(await host(page, 'plain').evaluate((el) => el.shadowRoot!.activeElement?.classList.contains('sheet')), variant).toBe(true);
      await page.locator('#opener').evaluate((el) => el.remove());
      await setOpen(page, false, 'plain');
      expect(await page.evaluate(() => document.activeElement?.localName), variant).toBe('body');
    }
    await mount(page, [fixtureOf('modal')]);
    expect(await host(page, 'modal').evaluate((el) => el.shadowRoot!.activeElement?.localName)).toBe('dialog');
    await mount(page, [fixtureOf('standard')]);
    expect(await page.evaluate(() => document.activeElement?.localName)).toBe('body');
  });

  test('SSH-4: an open modal sheet asks to close once, with the reason, on a press on the scrim, Escape, back, or a drag toward its end past half its width or a fling; the drag follows past the slop, and one that does not ask slides back over the enter motion (at once where reduced)', async ({ page }) => {
    const width = 320;
    const cases: [string, () => Promise<void>][] = [
      ['scrim', () => page.mouse.click(100, 100)],
      ['escape', () => page.keyboard.press('Escape')],
      ['back', () => host(page).locator('dialog').evaluate((el) => el.dispatchEvent(new Event('cancel', { cancelable: true })))],
      ['drag', async () => drag(page, await inside(page), width / 2 + 20)],
      ['drag', async () => fling(page, await inside(page), 60)],
    ];
    for (const [reason, act] of cases) {
      await mount(page, [fx('s', { variant: 'modal' })]);
      await wire(page);
      await act();
      await expect.poll(() => log(page), reason).toEqual([`close:${reason}`]);
      // Controlled: the sheet stays open until the product closes it.
      await expect(host(page), reason).toHaveAttribute('open', '');
      await expect(host(page).locator('dialog'), reason).toHaveJSProperty('open', true);
    }
    // The drag: nothing within the slop; past it the sheet follows the pointer, never past where it rests.
    await mount(page, [fx('s', { variant: 'modal' })]);
    await wire(page);
    expect(await px(page, T('container-width'))).toBe(width);
    const enter = await ms(page, T('motion-enter-duration'));
    const at = await inside(page);
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x + 6, at.y);
    expect(await offset(page)).toBeCloseTo(0, 1);
    await page.mouse.move(at.x + 100, at.y);
    expect(await offset(page)).toBeCloseTo(100, 1);
    await page.mouse.move(at.x - 50, at.y);
    expect(await offset(page)).toBeCloseTo(0, 1);
    await page.mouse.move(at.x + 120, at.y);
    await page.waitForTimeout(120);
    await watchRelease(page);
    await page.mouse.up();
    // Less than half its width, slowly: back over the enter motion, and nothing asked.
    expect((await released(page)).atRelease.map((slide) => slide.duration)).toContain(enter);
    await still(page);
    expect(await offset(page)).toBeCloseTo(0, 1);
    expect(await log(page)).toEqual([]);
    // The click that ends a drag activates nothing (not the close button under the pointer).
    const c = await bounds(close(page));
    await drag(page, { x: c.x + c.width / 2, y: c.y + c.height / 2 }, 40);
    await still(page);
    expect(await log(page)).toEqual([]);
    // Reduced motion: back at once.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await watchRelease(page);
    await drag(page, await inside(page), 100);
    expect(await released(page)).toEqual({ atRelease: [], nextFrame: [] });
    expect(await sheet(page).evaluate((el) => el.getAnimations().length)).toBe(0);
    expect(await offset(page)).toBeCloseTo(0, 1);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    // Right-to-left: toward the left edge.
    await mount(page, [fx('s', { variant: 'modal' })]);
    await page.evaluate(() => (document.documentElement.dir = 'rtl'));
    await wire(page);
    await drag(page, { x: 200, y: 240 }, 100);
    await still(page);
    expect(await log(page)).toEqual([]);
    await drag(page, { x: 200, y: 240 }, -(width / 2 + 20));
    await expect.poll(() => log(page)).toEqual(['close:drag']);
  });

  test('SSH-4: a fast drag toward the end that holds still for more than 40 ms before its release is no fling — the sheet slides back — and the same drag released within 40 ms of its last move asks to close', async ({ page }) => {
    await mount(page, [fx('s', { variant: 'modal' })]);
    await wire(page);
    // 30 px toward the end at 2.5 px per ms, far short of half the sheet's width: only a fling asks to close.
    const from = await inside(page);
    const moves = strokes(from, { x: 10, y: 0 });
    await flingThenHold(page, sheet(page), { from, moves, hold: STOPPED_AFTER + 1 });
    await still(page);
    expect(await offset(page)).toBeCloseTo(0, 1);
    expect(await log(page)).toEqual([]);
    await flingThenHold(page, sheet(page), { from, moves, hold: STOPPED_AFTER });
    await expect.poll(() => log(page)).toEqual(['close:drag']);
  });

  test('SSH-6: a drag that asks to close holds for a frame, then slides out from where it was when the product closes it, or slides back when it declines', async ({ page }) => {
    // Declined: back to where it rests, from where the drag left it, over the enter motion.
    await mount(page, [fx('s', { variant: 'modal' })]);
    await wire(page);
    const enter = await ms(page, T('motion-enter-duration'));
    await watchRelease(page);
    await drag(page, await inside(page), 200);
    // Held where the drag left it for a frame, then back from there.
    expect(await released(page)).toEqual({ atRelease: [], nextFrame: [{ from: '200px', duration: enter }] });
    await still(page);
    expect(await offset(page)).toBeCloseTo(0, 1);
    expect(await log(page)).toEqual(['close:drag']);
    await expect(host(page).locator('dialog')).toHaveJSProperty('open', true);
    // Closed: the exit motion starts from where the drag left it.
    await mount(page, [fx('s', { variant: 'modal' })]);
    await closeOnRequest(page);
    const exit = await ms(page, T('motion-exit-duration'));
    await watchRelease(page);
    await drag(page, await inside(page), 200);
    await expect(host(page)).not.toHaveAttribute('open');
    // Where the browser keeps the dialog drawn while it leaves (not Firefox, which has no overlay transition).
    const leaving = (await released(page)).atRelease;
    if (leaving.length) expect(leaving).toEqual([{ from: '200px', duration: exit }]);
    await expect(host(page).locator('dialog')).toHaveJSProperty('open', false);
    // A standard sheet closed by its button: the product sets open to false.
    await mount(page, [fx('s', { variant: 'standard' })]);
    await closeOnRequest(page);
    await close(page).locator('button').click();
    await expect(host(page)).not.toHaveAttribute('open');
  });

  test('SSH-15: a dialog opened from a modal sheet is above it and makes it inert; Escape closes only the dialog, and the sheet gets back the focus the dialog returns', async ({ page }) => {
    await mount(page, [fx('s', { variant: 'modal' }, '<button id="ask">Ask</button>')]);
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('beforeend', '<tanrei-dialog headline="Discard?"><tanrei-button slot="actions" variant="text">OK</tanrei-button></tanrei-dialog>'));
    await wire(page);
    await page.locator('#ask').focus();
    await page.locator('tanrei-dialog').evaluate(async (el: any) => {
      el.open = true;
      await el.updateComplete;
    });
    // Below the dialog: a point over the sheet's content hits the dialog, not the content (WebKit still lets script focus
    // an element of a lower modal dialog, so the check is the hit, as the dialog's own DLG-15).
    const ask = await bounds(page.locator('#ask'));
    expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.localName, [ask.x + 4, ask.y + 4])).toBe('tanrei-dialog');
    await page.locator('tanrei-dialog').locator('dialog').focus();
    await page.keyboard.press('Escape');
    await expect(page.locator('tanrei-dialog')).not.toHaveAttribute('open');
    expect(await log(page)).toEqual([]);
    await expect.poll(() => focused(page)).toBe('ask');
    await page.keyboard.press('Escape');
    expect(await log(page)).toEqual(['close:escape']);
  });
});

test.describe('actions and scrolling', () => {
  test('SSH-16: a modal sheet that opens with no action still opens and lays out its other parts, and a debug build reports an error each time it opens; with an action, nothing; a standard sheet with none reports nothing and draws neither the divider nor the actions', async ({ page }) => {
    const seen = reports(page);
    const errors = () => seen.filter((r) => r.type === 'error' && r.text.includes('SSH-16'));
    await mount(page, [fx('s', { variant: 'modal' })]);
    await expect.poll(() => errors().length).toBe(1);
    expect(errors()[0].text).toMatch(/a modal side sheet opened with no action; it must offer at least one/);
    await expect(host(page).locator('dialog')).toHaveJSProperty('open', true);
    await expect(headline(page)).toBeVisible();
    await expect(close(page)).toBeVisible();
    await expect(content(page)).toBeVisible();
    await expect(host(page).locator('.footer')).toBeHidden();
    // Counted when it opens: again on the next opening.
    await setOpen(page, false);
    await setOpen(page, true);
    await expect.poll(() => errors().length).toBe(2);
    // An action given later is counted at the next opening.
    await host(page).evaluate((el) => el.insertAdjacentHTML('beforeend', '<tanrei-button slot="actions" confirming>Apply</tanrei-button>'));
    await setOpen(page, false);
    await setOpen(page, true);
    await expect(action(page, 'Apply')).toBeVisible();
    expect(errors().length).toBe(2);
    // The spec's modal fixtures, and a standard sheet with none: nothing.
    seen.splice(0);
    for (const id of ['modal', 'modal-single-action', 'modal-stacked', 'action-variants']) await mount(page, [fixtureOf(id)]);
    await mount(page, [fixtureOf('standard')]);
    await page.waitForTimeout(100);
    expect(seen.filter((r) => r.text.includes('SSH-16'))).toEqual([]);
    // (Each of those documents was read with the element already defined, so each sheet opened at its start tag: where
    // the engine runs the element's update before it has read the sheet's children — WebKit — the actions are counted
    // once the document has been read. One with none is still reported there, once.)
    await mount(page, [fx('s', { variant: 'modal' })]);
    await expect.poll(() => errors().length).toBe(1);
    await page.waitForTimeout(100);
    expect(errors().length).toBe(1);
    seen.splice(0);
    await mount(page, [fixtureOf('standard')]);
    await page.waitForTimeout(100);
    expect(seen.filter((r) => r.text.includes('SSH-16'))).toEqual([]);
    await expect(host(page, 'standard').locator('.footer')).toBeHidden();
    await expect(divider(page, 'standard')).toBeHidden();
    expect(Number.parseFloat(await css(content(page, 'standard'), 'padding-bottom'))).toBeCloseTo(await px(page, T('container-padding-block')), 1);
  });

  test('SSH-17: an action without a variant takes actions.variant (tonal in the default system), from its tokens and states; one with a variant keeps it; the flags, size and tokens are never changed', async ({ page }) => {
    const tonal = await (async () => {
      await mount(page, [fixtureOf('standard-actions')]);
      return resolveColor(page, '--tanrei-comp-button-tonal-container-color');
    })();
    expect(await page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), T('actions-variant'))).toBe('tonal');
    const id = 'standard-actions';
    for (const label of ['Reset', 'Apply']) {
      await expect(action(page, label, id)).not.toHaveAttribute('variant');
      expect(await paint(action(page, label, id)), label).toBe(tonal);
      expect((await bounds(action(page, label, id))).height).toBe(await px(page, '--tanrei-comp-button-container-height-medium'));
    }
    // Its states are the variant's: hovered paints the tonal hovered container.
    await action(page, 'Apply', id).hover();
    await expect.poll(() => paint(action(page, 'Apply', id))).toBe(await resolveColor(page, '--tanrei-comp-button-tonal-hovered-container-color'));
    await page.mouse.move(0, 0);
    // Every action of the modal fixtures: tonal, confirming or dismissive alike.
    for (const [fixture, labels] of [
      ['modal', ['Cancel', 'Apply']],
      ['modal-single-action', ['Show results']],
      ['modal-stacked', ['Discard changes', 'Save and continue']],
    ] as const) {
      await mount(page, [fixtureOf(fixture)]);
      for (const label of labels) expect(await paint(action(page, label, fixture)), `${fixture} ${label}`).toBe(tonal);
    }
    // Set: kept as set.
    await mount(page, [fixtureOf('action-variants')]);
    expect(await paint(action(page, 'Cancel', 'action-variants'))).toBe(await resolveColor(page, '--tanrei-comp-button-text-container-color'));
    expect(await paint(action(page, 'Apply', 'action-variants'))).toBe(await resolveColor(page, '--tanrei-comp-button-filled-container-color'));
    // A system's choice: outlined for every action without one, read when the sheet opens.
    await mount(page, [{ ...fixtureOf('standard-actions'), props: { ...fixtureOf('standard-actions').props, open: false } }]);
    await override(page, { [T('actions-variant')]: 'outlined' });
    await setOpen(page, true, id);
    const outlined = await resolveColor(page, '--tanrei-comp-button-outlined-container-color');
    await expect.poll(() => paint(action(page, 'Reset', id))).toBe(outlined);
    // A variant written later wins; removed, the sheet's again.
    const filled = await resolveColor(page, '--tanrei-comp-button-filled-container-color');
    await action(page, 'Reset', id).evaluate((el) => el.setAttribute('variant', 'filled'));
    await expect.poll(() => paint(action(page, 'Reset', id))).toBe(filled);
    await action(page, 'Reset', id).evaluate((el) => el.removeAttribute('variant'));
    await expect.poll(() => paint(action(page, 'Reset', id))).toBe(outlined);
    // Taken out of the sheet, a Button is Button's default again.
    await action(page, 'Reset', id).evaluate((el) => document.body.append(el));
    await expect.poll(() => paint(page.locator('body > tanrei-button'))).toBe(filled);
    // An unknown name is the first value (filled).
    await mount(page, [{ ...fixtureOf('standard-actions'), props: { ...fixtureOf('standard-actions').props, open: false } }]);
    await override(page, { [T('actions-variant')]: 'sparkly' });
    await setOpen(page, true, id);
    await expect.poll(() => paint(action(page, 'Apply', id))).toBe(filled);
  });

  test('SSH-18: activating an action lets the Button emit its click, and the sheet neither closes nor emits close — confirming, dismissive or neither, in either variant', async ({ page }) => {
    for (const f of [fixtureOf('standard-actions'), fixtureOf('modal')]) {
      await mount(page, [f]);
      await wire(page);
      await page.evaluate(() => {
        for (const b of document.querySelectorAll('tanrei-button[slot="actions"]')) b.addEventListener('click', () => (window as any).log.push(`click:${b.textContent!.trim()}`));
      });
      const labels = f.items!.map((item) => item.content!);
      for (const label of labels) await action(page, label, f.id).locator('button').click();
      await action(page, labels[0], f.id).locator('button').focus();
      await page.keyboard.press('Enter');
      expect(await log(page), f.id).toEqual([...labels.map((label) => `click:${label}`), `click:${labels[0]}`]);
      await expect(host(page, f.id)).toHaveAttribute('open', '');
      if (f.id === 'modal') await expect(host(page, f.id).locator('dialog')).toHaveJSProperty('open', true);
    }
  });

  test('SSH-19: under always — the default — a divider.width hairline in divider.color across the full width below the header (hidden) whenever the header is drawn: at rest, scrolled, and when the content does not scroll; none without a header', async ({ page }) => {
    await mount(page, [fx('s', { variant: 'standard' }, LONG, ACTIONS), fx('short', { variant: 'standard' }), fx('modal', { variant: 'modal' }, LONG, ACTIONS), fx('bare', { variant: 'standard', headline: '', closable: false }, LONG)]);
    const line = await px(page, T('divider-width'));
    for (const id of ['s', 'short']) {
      await expect(headerDivider(page, id), id).toBeVisible();
      await expect(headerDivider(page, id), id).toHaveAttribute('aria-hidden', 'true');
    }
    const [s, h, d] = [await bounds(sheet(page)), await bounds(header(page)), await bounds(headerDivider(page))];
    expect([d.x, d.width]).toEqual([s.x, s.width]);
    expect(d.y).toBeCloseTo(h.y + h.height, 1);
    expect(d.height).toBeCloseTo(line, 1);
    await expect(headerDivider(page)).toHaveCSS('background-color', await resolveColor(page, T('divider-color')));
    await content(page).evaluate((el) => (el.scrollTop = 120));
    await expect(headerDivider(page)).toBeVisible();
    await content(page).evaluate((el) => (el.scrollTop = 0));
    await expect(headerDivider(page)).toBeVisible();
    // The modal sheet the same.
    await host(page, 'modal').evaluate(async (el: any) => {
      el.open = true;
      await el.updateComplete;
    });
    await expect(headerDivider(page, 'modal')).toBeVisible();
    await content(page, 'bare').evaluate((el) => (el.scrollTop = 120));
    await expect(headerDivider(page, 'bare')).toHaveCount(0);
  });

  test('SSH-19: under scroll a divider.width hairline in divider.color across the full width below the header (hidden) only while the content is scrolled from its top, at once; none without a header', async ({ page }) => {
    await mount(page, [fx('s', { variant: 'standard', dividerVisibility: 'scroll' }, LONG, ACTIONS), fx('bare', { variant: 'standard', headline: '', closable: false, dividerVisibility: 'scroll' }, LONG)]);
    const line = await px(page, T('divider-width'));
    await expect(headerDivider(page)).toBeHidden();
    await expect(headerDivider(page)).toHaveAttribute('aria-hidden', 'true');
    await content(page).evaluate((el) => (el.scrollTop = 120));
    await expect(headerDivider(page)).toBeVisible();
    const [s, h, d] = [await bounds(sheet(page)), await bounds(header(page)), await bounds(headerDivider(page))];
    expect([d.x, d.width]).toEqual([s.x, s.width]);
    expect(d.y).toBeCloseTo(h.y + h.height, 1);
    expect(d.height).toBeCloseTo(line, 1);
    await expect(headerDivider(page)).toHaveCSS('background-color', await resolveColor(page, T('divider-color')));
    // At once: nothing transitions.
    expect(await headerDivider(page).evaluate((el) => el.getAnimations().length)).toBe(0);
    expect(await css(headerDivider(page), 'transition-duration')).toBe('0s');
    await content(page).evaluate((el) => (el.scrollTop = 0));
    await expect(headerDivider(page)).toBeHidden();
    // No header: no divider there, scrolled or not.
    await content(page, 'bare').evaluate((el) => (el.scrollTop = 120));
    await expect(headerDivider(page, 'bare')).toHaveCount(0);
  });

  test('SSH-23: auto follows comp.side-sheet.divider.visibility, which follows sys.behavior.divider-visibility; the attribute overrides it; a change is drawn at once, keeping the scroll position; an unknown value is auto and reported', async ({ page }) => {
    const seen = reports(page);
    await mount(page, [fx('s', { variant: 'standard' }, LONG, ACTIONS)]);
    await expect(headerDivider(page)).toBeVisible();
    await override(page, { '--tanrei-sys-behavior-divider-visibility': 'scroll' });
    await expect(headerDivider(page)).toBeHidden();
    await override(page, { [T('divider-visibility')]: 'always' });
    await expect(headerDivider(page)).toBeVisible();
    await host(page).evaluate(async (el: any) => {
      el.dividerVisibility = 'scroll';
      await el.updateComplete;
    });
    await expect(host(page)).toHaveAttribute('divider-visibility', 'scroll');
    await expect(headerDivider(page)).toBeHidden();
    await content(page).evaluate((el) => (el.scrollTop = 120));
    await expect(headerDivider(page)).toBeVisible();
    await host(page).evaluate(async (el: any) => {
      el.dividerVisibility = 'always';
      await el.updateComplete;
    });
    expect(await content(page).evaluate((el) => el.scrollTop)).toBe(120);
    await content(page).evaluate((el) => (el.scrollTop = 0));
    await host(page).evaluate(async (el: any) => {
      el.setAttribute('divider-visibility', 'sometimes');
      await el.updateComplete;
    });
    await expect(headerDivider(page)).toBeVisible();
    await expect.poll(() => seen.some((m) => m.text.includes('SSH-23') && m.text.includes('sometimes'))).toBe(true);
  });

  test('SSH-20: while the on-screen keyboard covers the bottom, the header stays, the divider and actions sit directly above it, the content scrolls in the room left and the focused element is scrolled into it; the actions return when it hides; at once', async ({ page }) => {
    for (const variant of ['modal', 'standard']) {
      await mount(page, [fx('s', { variant }, `${LONG}<input id="field" aria-label="Field">`, ACTIONS)]);
      const h = await bounds(header(page));
      const footer = host(page).locator('.footer');
      expect((await bounds(footer)).y + (await bounds(footer)).height, variant).toBeCloseTo(WINDOW.height, 0);
      await page.locator('#field').focus();
      await content(page).evaluate((el) => (el.scrollTop = 0));
      await keyboard(page, 200);
      const room = WINDOW.height - 200;
      await expect.poll(async () => (await bounds(footer)).y + (await bounds(footer)).height, variant).toBeCloseTo(room, 0);
      expect(await sheet(page).evaluate((el) => el.getAnimations().length), variant).toBe(0);
      expect(await bounds(header(page)), variant).toEqual(h);
      const [c, d] = [await bounds(content(page)), await bounds(divider(page))];
      expect(c.y + c.height, variant).toBeCloseTo(d.y, 1);
      expect(await content(page).evaluate((el) => el.scrollHeight > el.clientHeight), variant).toBe(true);
      // The focused field, at the bottom of the content, is scrolled into the room.
      await expect.poll(async () => {
        const field = await bounds(page.locator('#field'));
        return field.y >= c.y - 1 && field.y + field.height <= c.y + c.height + 1;
      }, variant).toBe(true);
      await keyboard(page, 0);
      await expect.poll(async () => (await bounds(footer)).y + (await bounds(footer)).height, variant).toBeCloseTo(WINDOW.height, 0);
    }
  });
});

test.describe('accessibility', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`no axe violations in ${theme}, every fixture`, async ({ page }) => {
      for (const f of spec.fixtures) {
        await mount(page, [f], { theme });
        await page.waitForTimeout(300);
        const results = await new AxeBuilder({ page }).include('.stage').analyze();
        expect(results.violations, `${theme} ${f.id}: ${results.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(' ')}`).join(', ')}`).toEqual([]);
      }
    });
  }
});

test.describe('fixtures', () => {
  // The spec's snapshot harness: each fixture alone in a 720 × 480 window on a surface page — a standard sheet at the end
  // of a row whose other child fills the rest, a modal one opened by `open`; the baseline is the window.
  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mount(page, [f]);
      await expect(page).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
