// What the tests of holdPageScroll() (src/primitives/modal.ts, MDL-2) share: a dialog on a page taller than its window,
// with two bars fixed across the window, and a reading of where everything stands before, while and after the dialog
// holds the page's scroll. The engines and their scroll bars are each test file's: see
// src/primitives/page-scroll-hold.test.ts, which says which engine takes which branch of the hold.
import { type Locator, type Page, expect } from '@playwright/test';
import { fixtureHost, loadSpec, mountFixtures } from './harness.js';
import { motionEnded } from './motions.js';

/** The engines' own scroll bars, not Playwright's headless Chromium without them (`--hide-scrollbars`): a launch option. */
export const DRAWN_BARS = { ignoreDefaultArgs: ['--hide-scrollbars'] };

/** The properties the hold writes on the root (MDL-2), by the names the docs give a product. */
export const SCROLL_HOLD_INSET = { left: '--tanrei-scroll-hold-inset-left', right: '--tanrei-scroll-hold-inset-right' };

/** 10 px: not the 15 px of a classic bar, so that room kept at the engine's own width, not the bar's, shows. */
export const STYLED_BAR = '::-webkit-scrollbar { width: 10px; background: Canvas; } ::-webkit-scrollbar-thumb { background: CanvasText; }';

/** No room written on either side. */
export const NONE = { left: '', right: '' };

const SPEC = loadSpec('dialog');
const FIXTURE = 'basic';

type Dialog = HTMLElement & { open: boolean; updateComplete: Promise<unknown> };

/** The window the pages here start in. */
export const WINDOW = { width: 640, height: 480 };

/**
 * The dialog, closed, on a page with a block `height` tall (by default far taller than its window), with a scroll bar
 * styled as `bar` asks (or the engine's own; `bar` is a style sheet, which may style the root too), and two bars fixed
 * across the top of the window: `#fixed` at insets of 0, `#fixed-held` at the hold's insets.
 */
export async function mount(page: Page, bar: string, { height = 3000, viewport = WINDOW }: { height?: number; viewport?: { width: number; height: number } } = {}): Promise<Locator> {
  await page.setViewportSize(viewport);
  const fixture = SPEC.fixtures.find((f) => f.id === FIXTURE)!;
  await mountFixtures(page, SPEC, { icons: true, fixtures: [{ ...fixture, props: { ...fixture.props, open: false } }] });
  await page.evaluate(
    ({ bar, inset, height }) => {
      if (bar) document.head.insertAdjacentHTML('beforeend', `<style>${bar}</style>`);
      document.body.insertAdjacentHTML(
        'beforeend',
        `<div id="tall" style="block-size: ${height}px"></div>` +
          '<div id="fixed" style="position: fixed; left: 0; right: 0; top: 0; block-size: 8px"></div>' +
          `<div id="fixed-held" style="position: fixed; left: var(${inset.left}, 0px); right: var(${inset.right}, 0px); top: 8px; block-size: 8px"></div>`,
      );
    },
    { bar, inset: SCROLL_HOLD_INSET, height },
  );
  return fixtureHost(page, SPEC, FIXTURE);
}

/**
 * Where the page's content stands, where each fixed bar stands, how much room the root's scroll bar takes, what the
 * root's inline style says, and the room the hold says the window gained on each side.
 */
const place = (page: Page) =>
  page.evaluate((inset) => {
    const root = document.documentElement;
    const at = (id: string) => {
      const box = document.getElementById(id)!.getBoundingClientRect();
      return { x: box.x, width: box.width };
    };
    return {
      ...at('tall'),
      fixed: at('fixed'),
      held: at('fixed-held'),
      bar: window.innerWidth - root.clientWidth,
      style: root.style.cssText,
      inset: { left: root.style.getPropertyValue(inset.left), right: root.style.getPropertyValue(inset.right) },
    };
  }, SCROLL_HOLD_INSET);

const toggle = (host: Locator, open: boolean) =>
  host.evaluate(async (el: Dialog, open) => {
    el.open = open;
    await el.updateComplete;
  }, open);

/** Opens the dialog and closes it again; where things stood before, while it was open (and what `read` saw), and after. */
export async function holdAndRelease<T = undefined>(page: Page, host: Locator, read?: () => Promise<T>) {
  const before = { ...(await place(page)), read: await read?.() };
  await toggle(host, true);
  await expect.poll(() => host.evaluate((el) => !!el.shadowRoot!.querySelector('dialog')?.matches(':modal'))).toBe(true);
  await motionEnded(host);
  const held = { ...(await place(page)), read: await read?.() };
  await toggle(host, false);
  await motionEnded(host);
  const after = { ...(await place(page)), read: await read?.() };
  return { before, held, after };
}

/**
 * Opens the dialog, resizes the window to `size` while it holds the page's scroll, and closes it there: where things
 * stood once the window had been resized (its `resize` event dispatched), and after the dialog closed in that window.
 */
export async function resizeWhileHeld(page: Page, host: Locator, size: { width: number; height: number }) {
  await toggle(host, true);
  await expect.poll(() => host.evaluate((el) => !!el.shadowRoot!.querySelector('dialog')?.matches(':modal'))).toBe(true);
  await motionEnded(host);
  // The listener goes in before the window is resized, after the hold's own (added as it began), so it runs after it.
  await page.evaluate(() => {
    (window as unknown as { resized: Promise<void> }).resized = new Promise((resolve) => addEventListener('resize', () => resolve(), { once: true }));
  });
  await page.setViewportSize(size);
  await page.evaluate(() => (window as unknown as { resized: Promise<void> }).resized);
  const held = await place(page);
  await toggle(host, false);
  await motionEnded(host);
  const after = await place(page);
  return { held, after };
}

const px = (length: string) => (length ? Number.parseFloat(length) : 0);

/**
 * Nothing behind moved; the room the window gained on each side is what the hold wrote (`inset`, `''` for none), the bar
 * at insets of 0 moved by exactly that, and the bar at the hold's insets did not move at all.
 */
export function expectNothingMoved({ before, held, after }: Awaited<ReturnType<typeof holdAndRelease>>, inset: { left: string; right: string }) {
  expect(held.style, 'the root’s scroll is held').toContain('overflow: hidden');
  expect({ x: held.x, width: held.width }, `nothing behind moves sideways while the scroll is held (a bar ${before.bar} px wide before; the root: ${held.style})`).toEqual({ x: before.x, width: before.width });
  expect(held.inset, `the room the window gained on each side, written on the root (the root: ${held.style})`).toEqual(inset);
  const left = px(held.inset.left);
  const right = px(held.inset.right);
  expect(held.fixed, `a bar fixed across the window at insets of 0 moves by that room and no more (the root: ${held.style})`).toEqual({ x: before.fixed.x - left, width: before.fixed.width + left + right });
  expect(held.held, `a bar fixed across the window at the hold’s insets does not move (the root: ${held.style})`).toEqual(before.held);
  // Where no bar takes room, the hold writes nothing on the root but its overflow: a stable gutter there would make room
  // for a bar that is not drawn, and move the page.
  if (before.bar === 0) expect(held.style, 'no bar took room: nothing is written but the overflow').toBe('overflow: hidden;');
  expect(after, 'closed, the root is as it was').toEqual(before);
}

/**
 * In a window resized while the scroll was held, the hold measured that window again: the room the window gained on
 * each side is what the hold wrote (`inset`, `''` for none) for that window's bar, and nothing behind moves sideways as
 * the hold lets go there — the page's content, and the bar fixed at the hold's insets; the bar at insets of 0 by that
 * room and no more.
 */
export function expectNothingMovesOnRelease({ held, after }: Awaited<ReturnType<typeof resizeWhileHeld>>, inset: { left: string; right: string }) {
  expect(held.style, 'the root’s scroll is still held').toContain('overflow: hidden');
  expect(held.inset, `the room the window gained on each side, for the resized window’s bar (${after.bar} px wide once released; the root: ${held.style})`).toEqual(inset);
  expect({ x: held.x, width: held.width }, `nothing behind moves sideways as the hold lets go in the resized window (a bar ${after.bar} px wide there; the root while held: ${held.style})`).toEqual({ x: after.x, width: after.width });
  const left = px(held.inset.left);
  const right = px(held.inset.right);
  expect(held.fixed, `a bar fixed across the window at insets of 0 stands that room away from where it is once released (the root: ${held.style})`).toEqual({ x: after.fixed.x - left, width: after.fixed.width + left + right });
  expect(held.held, `a bar fixed across the window at the hold’s insets does not move as the hold lets go (the root: ${held.style})`).toEqual(after.held);
  if (after.bar === 0) expect(held.style, 'no bar takes room in the resized window: nothing is written but the overflow').toBe('overflow: hidden;');
}
