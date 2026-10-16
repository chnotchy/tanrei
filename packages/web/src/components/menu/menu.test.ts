// <tanrei-menu> and its items, driven by specs/menu.spec.json: every behaviour id (MNU-1…63) is cited by a test title,
// every fixture has a baseline (drawn in place with the `inline` test attribute), and every state, condition and choice
// of kind is read back from the tokens — never from a number written here.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, type FixtureItem, acmeSystemCss, iconFaceArrives, loadSpec, mountFixtures, resolveColor, resolveToken, tab, tabTo, withoutIconFont, rootTokens } from '../../../test/harness.js';
import { MIRRORED, anchorOf, expectDrawnAlike, expectNewContext, expectRefusals, markOf } from '../../../test/links.js';
import { holdClock, releaseClock } from '../../../test/page-clock.js';
import { decodePng } from '../../../test/png.js';
import { clickCentre, heldPress } from '../../../test/watched-press.js';

const spec = loadSpec('menu');
type P = Page;
const menu = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-menu`);
const surface = (page: P, id: string) => menu(page, id).locator('> .surface');
const items = (page: P, id: string) => menu(page, id).locator('tanrei-menu-item, tanrei-menu-checkbox-item, tanrei-menu-radio-item');
const item = (page: P, id: string, n: number) => items(page, id).nth(n);
const row = (page: P, id: string, n: number) => item(page, id, n).locator('.row');
const anchor = (page: P, id: string) => page.locator(`#a-${id}`);
/**
 * The anchor painted from the system's tokens, as a product paints the button that opens its menu. The staging's anchor
 * is a bare UA button, and in the dark scheme a UA button's colors are the engine's: WebKit on Linux draws white
 * ButtonText on silver ButtonFace (#c0c0c0, 1.81:1) — the page's contrast, not the menu's.
 */
const paintAnchor = (page: P, id: string) =>
  anchor(page, id).evaluate((el: HTMLElement) => {
    el.style.backgroundColor = 'var(--tanrei-sys-color-surface-container-highest)';
    el.style.color = 'var(--tanrei-sys-color-on-surface)';
  });
const css = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
/**
 * The element's computed `property` once every transition and animation running on it has reached its end on its own
 * timeline. A color read mid-transition can serialize like its end value (Firefox writes an interpolated color in the end
 * value's space, alpha already rounded to it) and differ from it in the last digit a frame later.
 */
const settledCss = (locator: Locator, property: string) =>
  locator.evaluate(async (el, p) => {
    await Promise.all(el.getAnimations().map((a) => a.finished.catch(() => undefined)));
    return getComputedStyle(el).getPropertyValue(p);
  }, property);
/**
 * Every motion running in the page — a surface opening or closing, a state's colors — has ended on its own timeline, and
 * what follows a frame (a surface placed against its anchor) has been drawn. Where a test reads geometry or colors
 * after a motion it waits on this, not for a length of time: a loaded machine keeps no schedule.
 */
const motionEnded = (page: P) =>
  page.evaluate(async () => {
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    for (;;) {
      await frame();
      await frame();
      // A document's animations are its own tree's: each shadow root answers for the elements it holds.
      const roots: (Document | ShadowRoot)[] = [document];
      for (const root of roots) for (const el of root.querySelectorAll('*')) if (el.shadowRoot) roots.push(el.shadowRoot);
      const running = roots
        .flatMap((root) => root.getAnimations())
        .filter((a) => a.playState !== 'finished' && a.playState !== 'idle' && a.playState !== 'paused' && Number.isFinite(Number(a.effect?.getComputedTiming().endTime)));
      if (!running.length) return;
      await Promise.all(running.map((a) => a.finished.catch(() => undefined)));
    }
  });
const T = (name: string) => `--tanrei-comp-menu-${name}`;
type Rgb = [number, number, number];
/**
 * What is painted inside a row, once its colors have settled: a pixel of the window in the row's start padding — past
 * where a focus indicator is drawn, before the first column — at half its height: the row's fill as the engine lays it
 * over the sheet (MNU-37, MNU-50), with none of its content on it.
 */
const IN_PADDING = 9;
async function paintedIn(page: P, rowLocator: Locator): Promise<Rgb> {
  await settledCss(rowLocator, 'background-color');
  const r = (await rowLocator.boundingBox())!;
  const shot = decodePng(await page.screenshot({ scale: 'css', animations: 'allow' }));
  const i = (Math.round(r.y + r.height / 2) * shot.width + Math.round(r.x + IN_PADDING)) * 4;
  return [shot.data[i], shot.data[i + 1], shot.data[i + 2]];
}
const rgbOf = (color: string): Rgb => {
  const m = /^rgba?\((\d+), (\d+), (\d+)\)$/.exec(color);
  if (!m) throw new Error(`not an opaque rgb() color: ${color}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};
/** Two painted colors that are one color: the same, or a rounding step apart in a channel (two ways of writing one layer). */
const sameColor = (a: Rgb, b: Rgb) => a.every((v, i) => Math.abs(v - b[i]) <= 1);
/** The contrast of two opaque colors (WCAG's relative luminance), 1 to 21. */
const contrast = (a: Rgb, b: Rgb) => {
  const luminance = (c: Rgb) => c.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};
const bounds = async (locator: Locator) => (await locator.boundingBox())!;
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
const resolveShadow = (page: P, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;box-shadow:var(${n})`;
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).boxShadow;
    probe.remove();
    return value;
  }, name);

// Items, as a fixture lists them.
const it = (label: string, props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'item', props: { label, ...props } });
const cb = (label: string, props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'checkbox-item', props: { label, ...props } });
const radio = (label: string, value: string, props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'radio-item', props: { label, value, ...props } });
const group = (props: FixtureItem['props'], children: FixtureItem[]): FixtureItem => ({ kind: 'group', props, items: children });
const sub = (label: string, children: FixtureItem[], props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'submenu', props: { label, ...props }, items: children });
/** A row of the menu by its label, whatever its kind and level; a submenu item's own row and surface (never a nested one's). */
const labelled = (page: P, id: string, label: string) => menu(page, id).locator(`[label="${label}"]`);
const rowOf = (host: Locator) => host.locator('> .row');
const box = (host: Locator, selector: string) =>
  host.evaluate((el, sel) => {
    const r = el.shadowRoot!.querySelector(sel)!.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }, selector);
const surfaceBox = (host: Locator) => box(host, '.surface');
/** Whether a submenu item's surface is drawn: in the top layer and not fading out, or in place. */
const shown = (host: Locator) =>
  host.evaluate((el) => {
    const s = el.shadowRoot!.querySelector('.surface')!;
    return (s.matches(':popover-open') && !s.classList.contains('leaving')) || s.classList.contains('inline');
  });
/** A real overlay menu (not inline): its anchor is a button with the id `a-<id>`, drawn before it. */
const overlay = (id: string, children: FixtureItem[], props: Fixture['props'] = {}): Fixture => ({ id, props: { anchor: `a-${id}`, ...props }, items: children });
const inline = (id: string, children: FixtureItem[], props: Fixture['props'] = {}): Fixture => ({ id, props: { open: true, ...props }, items: children });

/**
 * The product's side, as the docs page writes it: the anchor opens the menu (it toggles), and `close` closes it. Every
 * close, click and change is logged in order.
 */
const wire = (page: P) =>
  page.evaluate(() => {
    const log: string[] = ((window as any).log = []);
    for (const m of document.querySelectorAll<any>('tanrei-menu:not([inline])')) {
      document.getElementById(m.anchor)!.addEventListener('click', () => (m.open = !m.open));
      m.addEventListener('close', (e: CustomEvent) => {
        log.push(`close:${e.detail.reason}`);
        m.open = false;
      });
    }
    for (const el of document.querySelectorAll<any>('tanrei-menu-item, tanrei-menu-checkbox-item, tanrei-menu-radio-item')) {
      el.addEventListener('click', () => log.push(`click:${el.label}`));
      el.addEventListener('change', (e: CustomEvent) => log.push(`change:${el.label}:${JSON.stringify(e.detail)}`));
    }
    for (const el of document.querySelectorAll<any>('tanrei-submenu')) el.addEventListener('toggle', (e: CustomEvent) => e.target === el && log.push(`toggle:${el.label}:${e.detail.open}`));
    for (const g of document.querySelectorAll<any>('tanrei-menu-group')) g.addEventListener('change', (e: CustomEvent) => e.target === g && log.push(`group:${g.label}:${JSON.stringify(e.detail)}`));
  });
const log = (page: P) => page.evaluate(() => (window as any).log as string[]);
const isOpen = (page: P, id: string) => surface(page, id).evaluate((el) => el.matches(':popover-open'));
/** The label of the item that has focus, or the id of the focused element. */
const focused = (page: P) =>
  page.evaluate(() => {
    const active = document.activeElement as any;
    return active?.label ?? active?.id ?? active?.localName ?? null;
  });
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
const drawn = (page: P, id: string, n: number) =>
  item(page, id, n).evaluate((el) => {
    const root = el.shadowRoot!;
    const r = getComputedStyle(root.querySelector('.row')!);
    return { bg: r.backgroundColor, label: getComputedStyle(root.querySelector('.label')!).color, opacity: r.opacity };
  });
const expected = async (page: P, condition: 'unselected' | 'selected' | 'current' | 'destructive' | 'expanded', state = '') => {
  const name = (part: string) => T(`${condition}-${state ? `${state}-` : ''}${part}`);
  return {
    bg: await resolveColor(page, name('container-color')),
    label: await resolveColor(page, name('label-color')),
    opacity: state ? await token(page, T(`${state}-opacity`)) : '1',
  };
};
/**
 * The document in a contrast scheme, as a person's setting or the product puts it there: `data-tanrei-contrast` on
 * <html>. The menu reads its tokens in that scheme and decides nothing by it (MNU-37). Resolves once the tokens follow.
 */
const inContrast = async (page: P, level: 'medium' | 'high' | null) => {
  await page.evaluate((l) => (l ? document.documentElement.setAttribute('data-tanrei-contrast', l) : document.documentElement.removeAttribute('data-tanrei-contrast')), level);
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
};

const EDIT = [it('Cut', { shortcut: ['mod+x'] }), it('Copy', { shortcut: ['mod+c'] }), it('Paste', { disabled: true }), it('Select all')];
const VIEW = [
  group({ title: 'View' }, [cb('Show grid', { checked: true }), cb('Show rulers')]),
  group({ title: 'Sort by', value: 'date' }, [radio('Name', 'name'), radio('Date', 'date'), radio('Size', 'size')]),
  it('Delete', { destructive: true }),
];

test.describe('overlay', () => {
  test('MNU-1: opening puts the surface in the top layer at its elevation and focuses the first enabled item; closing returns focus to the anchor', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [overlay('edit', [it('Undo', { disabled: true }), ...EDIT])] });
    await wire(page);
    expect(await isOpen(page, 'edit')).toBe(false);
    await expect(surface(page, 'edit')).toBeHidden();
    await anchor(page, 'edit').focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => isOpen(page, 'edit')).toBe(true);
    expect(await focused(page)).toBe('Cut');
    expect(await css(surface(page, 'edit'), 'box-shadow')).toBe(await resolveShadow(page, T('surface-elevation')));
    await page.keyboard.press('Escape');
    expect(await log(page)).toEqual(['close:escape']);
    await expect.poll(() => isOpen(page, 'edit')).toBe(false);
    expect(await focused(page)).toBe('a-edit');
    // Closed with focus elsewhere, it leaves focus alone.
    await page.keyboard.press('Enter');
    await expect.poll(() => isOpen(page, 'edit')).toBe(true);
    await page.evaluate(() => document.body.append(Object.assign(document.createElement('input'), { id: 'elsewhere' })));
    await page.locator('#elsewhere').focus();
    await menu(page, 'edit').evaluate((el: any) => (el.open = false));
    await expect.poll(() => isOpen(page, 'edit')).toBe(false);
    expect(await focused(page)).toBe('elsewhere');
  });

  test('MNU-2: placed offset from the anchor by placement, flipped and shifted to stay in the viewport, scrolled when too tall, following the anchor, mirrored in RTL', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    const fixtures = (['bottom-start', 'bottom-end', 'top-start', 'top-end'] as const).map((placement) => overlay(placement, EDIT, { placement }));
    await mountFixtures(page, spec, { fixtures });
    await page.addStyleTag({ content: `button[id^="a-"] { position: fixed; top: 280px; left: 300px; inline-size: 200px; }` });
    await wire(page);
    const [offset, margin] = await Promise.all([resolveToken(page, T('surface-offset')), resolveToken(page, T('surface-viewport-margin'))]);
    const open = async (id: string) => {
      await menu(page, id).evaluate((el: any) => (el.open = true));
      await expect.poll(() => isOpen(page, id)).toBe(true);
      await motionEnded(page);
      return [await bounds(anchor(page, id)), await bounds(surface(page, id))] as const;
    };
    const close = (id: string) => menu(page, id).evaluate((el: any) => (el.open = false));
    let [a, s] = await open('bottom-start');
    expect(s.y).toBeCloseTo(a.y + a.height + offset, 0);
    expect(s.x).toBeCloseTo(a.x, 0);
    await close('bottom-start');
    [a, s] = await open('bottom-end');
    expect(s.x + s.width).toBeCloseTo(a.x + a.width, 0);
    await close('bottom-end');
    [a, s] = await open('top-start');
    expect(s.y + s.height).toBeCloseTo(a.y - offset, 0);
    await expect(surface(page, 'top-start')).toHaveClass(/side-top/);
    await close('top-start');
    // Near the bottom edge it flips above; near the right edge it shifts left to stay within the margin.
    await page.addStyleTag({ content: `#a-bottom-start { top: 540px; left: 760px; inline-size: 30px; }` });
    [a, s] = await open('bottom-start');
    expect(s.y + s.height).toBeCloseTo(a.y - offset, 0);
    expect(s.x + s.width).toBeCloseTo(800 - margin, 0);
    // It follows the anchor as it moves.
    await page.addStyleTag({ content: `#a-bottom-start { top: 100px; left: 100px; }` });
    await expect.poll(async () => (await bounds(surface(page, 'bottom-start'))).y).toBeCloseTo(100 + a.height + offset, 0);
    await close('bottom-start');
    // In RTL start is the right edge.
    await page.locator('[data-fixture="top-end"]').evaluate((el) => el.setAttribute('dir', 'rtl'));
    await page.addStyleTag({ content: `#a-top-end { top: 400px; left: 300px; }` });
    [a, s] = await open('top-end');
    expect(s.x).toBeCloseTo(a.x, 0);
    await close('top-end');
    // Taller than the room left, it is limited to the room and its items scroll.
    await page.setViewportSize({ width: 800, height: 200 });
    await page.addStyleTag({ content: `#a-bottom-end { top: 20px; left: 300px; }` });
    [a, s] = await open('bottom-end');
    expect(s.y + s.height).toBeLessThanOrEqual(200 - margin + 0.5);
    const scroll = menu(page, 'bottom-end').locator('.scroll');
    expect(await scroll.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  });

  test('MNU-2: a surface whose size is not a whole number of pixels still ends at the anchor’s end edge and stands the offset above it — it is placed by its size as laid out, not by one snapped to whole pixels', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    const fixtures = (['bottom-end', 'top-start'] as const).map((placement) => overlay(placement, EDIT, { placement }));
    await mountFixtures(page, spec, { fixtures });
    await page.addStyleTag({ content: `button[id^="a-"] { position: fixed; top: 320px; left: 300px; inline-size: 200px; }` });
    await override(page, { [T('surface-min-width')]: '210.4px', [T('surface-padding-block')]: '8.3px' });
    const offset = await resolveToken(page, T('surface-offset'));
    const open = async (id: string) => {
      await menu(page, id).evaluate((el: any) => (el.open = true));
      await expect.poll(() => isOpen(page, id)).toBe(true);
      await motionEnded(page);
      return [await rectOf(anchor(page, id)), await rectOf(surface(page, id))] as const;
    };
    const rectOf = (locator: Locator) => locator.evaluate((el) => ((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height }))(el.getBoundingClientRect()));
    let [a, s] = await open('bottom-end');
    expect(s.width % 1, 'the surface is not a whole number of pixels wide').not.toBeCloseTo(0, 1);
    expect(Math.abs(s.x + s.width - (a.x + a.width)), 'end edges aligned').toBeLessThan(0.1);
    await menu(page, 'bottom-end').evaluate((el: any) => (el.open = false));
    [a, s] = await open('top-start');
    await expect(surface(page, 'top-start')).toHaveClass(/side-top/);
    expect(s.height % 1, 'nor a whole number tall').not.toBeCloseTo(0, 1);
    expect(Math.abs(s.y + s.height - (a.y - offset)), 'the offset above the anchor').toBeLessThan(0.1);
  });

  test('MNU-2: placed again as the page moves or the window resizes, a scrolled list keeps its offset and the focused item stays in view', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 300 });
    await mountFixtures(page, spec, { fixtures: [overlay('long', Array.from({ length: 16 }, (_, n) => it(`Item ${n + 1}`)))] });
    await wire(page);
    await anchor(page, 'long').focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => isOpen(page, 'long')).toBe(true);
    await surface(page, 'long').evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished.catch(() => undefined))));
    // Down to the tenth item, which scrolls the list; back up to the eighth, which leaves it there, two rows clear of the
    // bottom edge — so neither a few pixels less room nor a few more can hide it or clamp the offset.
    for (let n = 0; n < 9; n++) await page.keyboard.press('ArrowDown');
    const s = surface(page, 'long');
    const scroll = menu(page, 'long').locator('.scroll');
    const inView = async () => {
      const [r, b] = [await bounds(row(page, 'long', 7)), await bounds(scroll)];
      return r.y >= b.y - 0.5 && r.y + r.height <= b.y + b.height + 0.5;
    };
    await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    expect(await focused(page)).toBe('Item 8');
    await expect.poll(inView).toBe(true);
    const scrolled = await scroll.evaluate((el) => el.scrollTop);
    // The page moves under the anchor: the surface follows it, placed again, measured as capped — uncapped, the list
    // would not scroll and the browser would put it back at its top.
    const top = (await bounds(s)).y;
    await page.evaluate(() => {
      document.querySelector('main')!.style.paddingTop = '3px';
    });
    await expect.poll(async () => (await bounds(s)).y).toBeCloseTo(top + 3, 1);
    expect(await scroll.evaluate((el) => el.scrollTop)).toBe(scrolled);
    expect(await inView()).toBe(true);
    // The window shrinks: placed again with less room, the surface is capped to it, and the list stays where it was.
    const height = (await bounds(s)).height;
    await page.setViewportSize({ width: 800, height: 280 });
    await expect.poll(async () => (await bounds(s)).height).toBeCloseTo(height - 20, 1);
    expect(await scroll.evaluate((el) => el.scrollTop)).toBe(scrolled);
    expect(await inView()).toBe(true);
    expect(await focused(page)).toBe('Item 8');
  });

  test('MNU-4: it fades in and grows from the edge facing the anchor, fades out, and appears and disappears at once where motion is reduced', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [overlay('edit', EDIT)] });
    await wire(page);
    // (40 s each: the surface is read 'not yet whole' four answers after it opens and 'still open' two after it is
    // told to close; nothing here waits for either motion's end.)
    await override(page, { [T('motion-open-duration')]: '40s', [T('motion-close-duration')]: '40s' });
    await menu(page, 'edit').evaluate((el: any) => (el.open = true));
    const s = surface(page, 'edit');
    expect(await css(s, 'animation-name')).toBe('menu-open');
    expect(await css(s, 'animation-duration')).toBe('40s');
    expect(await css(s, 'transform-origin')).toMatch(/ 0px$/); // the top edge, which faces an anchor above it
    expect(Number(await css(s, 'opacity'))).toBeLessThan(1);
    await menu(page, 'edit').evaluate((el: any) => (el.open = false));
    expect(await css(s, 'animation-name')).toBe('menu-close');
    expect(await isOpen(page, 'edit')).toBe(true); // still fading out
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mountFixtures(page, spec, { fixtures: [overlay('edit', EDIT)] });
    await menu(page, 'edit').evaluate((el: any) => (el.open = true));
    expect(await css(surface(page, 'edit'), 'animation-name')).toBe('none');
    expect(await css(surface(page, 'edit'), 'opacity')).toBe('1');
    await menu(page, 'edit').evaluate((el: any) => (el.open = false));
    expect(await isOpen(page, 'edit')).toBe(false);
    // The tokens' own durations.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await mountFixtures(page, spec, { fixtures: [overlay('edit', EDIT)] });
    await menu(page, 'edit').evaluate((el: any) => (el.open = true));
    expect(Number.parseFloat(await css(surface(page, 'edit'), 'animation-duration')) * 1000).toBe(await resolveToken(page, T('motion-open-duration'), 'duration'));
  });

  test('MNU-5: Escape, a press outside, Tab and focus leaving each emit close once with their reason; Tab moves on from the anchor; the press outside reaches what is under it', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [overlay('edit', EDIT)] });
    await page.evaluate(() => {
      const after = Object.assign(document.createElement('button'), { id: 'after', textContent: 'After' });
      after.style.cssText = 'position: fixed; inset-inline-end: 8px; inset-block-end: 8px;';
      document.querySelector('[data-fixture="edit"]')!.after(after);
      after.addEventListener('click', () => (window as any).log.push('click:after'));
    });
    await wire(page);
    const reopen = async () => {
      await anchor(page, 'edit').click();
      await expect.poll(() => isOpen(page, 'edit')).toBe(true);
    };
    await reopen();
    await page.keyboard.press('Escape');
    await reopen();
    await page.locator('#after').click();
    await expect.poll(() => isOpen(page, 'edit')).toBe(false);
    await reopen();
    await page.keyboard.press('ArrowDown');
    await tab(page);
    expect(await focused(page)).toBe('after');
    await reopen();
    await page.locator('#after').evaluate((el) => (el as HTMLElement).focus());
    expect(await log(page)).toEqual(['close:escape', 'close:outside', 'click:after', 'close:tab', 'close:focus-out']);
    // A press on the anchor is the anchor's (here it toggles the menu); it is not a press outside.
    await reopen();
    await anchor(page, 'edit').click();
    expect(await log(page)).toEqual(['close:escape', 'close:outside', 'click:after', 'close:tab', 'close:focus-out']);
    // Once: a menu the product leaves open asks once, and a closed menu asks nothing.
    await mountFixtures(page, spec, { fixtures: [overlay('edit', EDIT)] });
    await menu(page, 'edit').evaluate((el: any) => {
      (window as any).raw = 0;
      el.addEventListener('close', () => (window as any).raw++);
      el.open = true;
    });
    await expect.poll(() => isOpen(page, 'edit')).toBe(true);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.mouse.click(5, 5);
    expect(await page.evaluate(() => (window as any).raw)).toBe(1);
    await menu(page, 'edit').evaluate((el: any) => (el.open = false));
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => (window as any).raw)).toBe(1);
  });

  test('MNU-25: not modal — no focus trap, nothing made inert, no scrim', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [overlay('edit', EDIT)] });
    await page.evaluate(() => document.body.append(Object.assign(document.createElement('button'), { id: 'far', textContent: 'Far' })));
    await wire(page);
    await anchor(page, 'edit').click();
    await expect.poll(() => isOpen(page, 'edit')).toBe(true);
    // The rest of the page is reachable and not inert: what is under a point outside the surface is the page's.
    const far = await bounds(page.locator('#far'));
    expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.id, [far.x + 2, far.y + 2])).toBe('far');
    expect(await page.locator('#far').evaluate((el) => (el as HTMLElement).inert || !!el.closest('[inert]'))).toBe(false);
    expect(await page.evaluate(() => document.querySelectorAll('dialog[open], [inert]').length)).toBe(0);
    // Tab leaves the menu (and asks to close it).
    await tab(page);
    expect(await page.evaluate(() => !!document.activeElement?.closest('tanrei-menu'))).toBe(false);
  });

  test('MNU-6: an action emits click then close; a checkbox item switches and emits change; a radio item sets its group; Space keeps a checkbox or radio item’s menu open', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [overlay('view', VIEW)] });
    await wire(page);
    const open = async () => {
      await anchor(page, 'view').click();
      await expect.poll(() => isOpen(page, 'view')).toBe(true);
    };
    const labels = (n: number) => item(page, 'view', n);
    // Pointer on a checkbox item: switches, emits change, closes.
    await open();
    await labels(1).click();
    expect(await labels(1).evaluate((el: any) => el.checked)).toBe(true);
    // Space: switches and stays open; Enter: switches and closes.
    await open();
    await labels(1).focus();
    await page.keyboard.press('Space');
    expect(await isOpen(page, 'view')).toBe(true);
    await page.keyboard.press('Enter');
    // A radio item: the group's value, its change, closing; a checked one emits no change but still closes.
    await open();
    await labels(2).click();
    expect(await menu(page, 'view').locator('tanrei-menu-group').nth(1).evaluate((el: any) => el.value)).toBe('name');
    await open();
    await labels(2).click();
    await open();
    await labels(4).focus();
    await page.keyboard.press('Space');
    expect(await isOpen(page, 'view')).toBe(true);
    await labels(4).focus();
    await page.keyboard.press('Space'); // already checked: nothing, and still open
    // An action: click, then close — by Space too.
    await labels(5).focus();
    await page.keyboard.press('Space');
    expect(await log(page)).toEqual([
      'click:Show rulers',
      'change:Show rulers:{"checked":true}',
      'close:item',
      'click:Show rulers',
      'change:Show rulers:{"checked":false}',
      'click:Show rulers',
      'change:Show rulers:{"checked":true}',
      'close:item',
      'click:Name',
      'group:Sort by:{"value":"name"}',
      'close:item',
      'click:Name',
      'close:item',
      'click:Size',
      'group:Sort by:{"value":"size"}',
      'click:Size',
      'click:Delete',
      'close:item',
    ]);
  });

  test('MNU-7: arrows move through every item, groups included, wrapping; Home, End, typeahead; disabled items are reached; nothing else takes focus', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [overlay('view', [it('Cut'), it('Paste', { disabled: true }), ...VIEW])] });
    await wire(page);
    await anchor(page, 'view').focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => focused(page)).toBe('Cut');
    const order: string[] = [];
    for (let i = 0; i < 9; i++) {
      await page.keyboard.press('ArrowDown');
      order.push((await focused(page)) as string);
    }
    expect(order).toEqual(['Paste', 'Show grid', 'Show rulers', 'Name', 'Date', 'Size', 'Delete', 'Cut', 'Paste']);
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    expect(await focused(page)).toBe('Delete');
    await page.keyboard.press('Home');
    expect(await focused(page)).toBe('Cut');
    await page.keyboard.press('End');
    expect(await focused(page)).toBe('Delete');
    await page.keyboard.type('sh', { delay: 30 });
    expect(await focused(page)).toBe('Show grid');
    await page.waitForTimeout(1100);
    await page.keyboard.press('s');
    expect(await focused(page)).toBe('Show rulers');
    // The disabled item is reached, not activated.
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    expect(await log(page)).toEqual([]);
    // No tabindex other than the items': titles, groups and dividers take no focus.
    expect(await menu(page, 'view').evaluate((el) => [...el.querySelectorAll('[tabindex]')].map((e) => e.localName).filter((n) => !n.includes('item')))).toEqual([]);
    expect(await menu(page, 'view').evaluate((el) => el.shadowRoot!.querySelectorAll('[tabindex]').length)).toBe(0);
  });

  test('MNU-8: a pointer moving onto an item moves focus there without the ring, drawn hovered; leaving the surface keeps it; the arrows continue from it', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [overlay('edit', EDIT)] });
    await wire(page);
    await anchor(page, 'edit').focus();
    await page.keyboard.press('Enter'); // opened from the keyboard: the ring shows on the first item
    await expect.poll(() => focused(page)).toBe('Cut');
    await expect(row(page, 'edit', 0)).toHaveCSS('outline-style', 'solid');
    await row(page, 'edit', 3).hover();
    expect(await focused(page)).toBe('Select all');
    await expect(row(page, 'edit', 3)).toHaveCSS('outline-style', 'none');
    await expect.poll(() => drawn(page, 'edit', 3)).toEqual(await expected(page, 'unselected', 'hovered'));
    await page.mouse.move(700, 10);
    expect(await focused(page)).toBe('Select all');
    await page.keyboard.press('ArrowUp');
    expect(await focused(page)).toBe('Paste');
    await expect(row(page, 'edit', 2)).toHaveCSS('outline-style', 'solid');
  });

  test('MNU-24: the menu named by its anchor; items by role, checked state, position, name and description; the shortcut; groups named; icons hidden; the anchor told', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [overlay('view', [it('Copy', { leadingIcon: 'content_copy', shortcut: ['mod+c'], supportingText: 'To the clipboard' }), it('Rename', { trailingText: 'Beta' }), it('Paste', { trailingText: '⌘V' }), ...VIEW])],
    });
    await wire(page);
    await expect(anchor(page, 'view')).toHaveAttribute('aria-haspopup', 'menu');
    await expect(anchor(page, 'view')).toHaveAttribute('aria-expanded', 'false');
    await anchor(page, 'view').click();
    await expect(anchor(page, 'view')).toHaveAttribute('aria-expanded', 'true');
    await expect(anchor(page, 'view')).toHaveAttribute('aria-controls', (await menu(page, 'view').getAttribute('id'))!);
    await expect(page.getByRole('menu', { name: 'a-view' })).toHaveCount(1);
    // The shortcut is the item's keyboard shortcut in KBS-12's form (the harness's convention is apple), never read as text.
    await expect(page.getByRole('menuitem', { name: 'Copy' })).toHaveAttribute('aria-keyshortcuts', 'Meta+C');
    await expect(page.getByRole('menuitem', { name: 'Copy' })).toHaveAttribute('aria-description', 'To the clipboard');
    // The web has the property, so the item never says its shortcut in words — the text KBS-10 gives is for a platform
    // without it: the hosted shortcut exposes no text of its own, and no name of a key is made for it in any language.
    expect(await menu(page, 'view').evaluate((el) => [...el.querySelectorAll('tanrei-menu-item')].flatMap((each) => [...each.shadowRoot!.querySelectorAll('tanrei-keyboard-shortcut')]).map((shortcut) => [shortcut.getAttribute('aria-hidden'), shortcut.shadowRoot!.querySelector('.spoken')])) ).toEqual([['true', null]]);
    expect(seen.filter((w) => w.includes('KBS-11'))).toEqual([]);
    // Trailing text is the description only, whatever it holds — even what looks like a shortcut.
    await expect(page.getByRole('menuitem', { name: 'Rename' })).not.toHaveAttribute('aria-keyshortcuts');
    await expect(page.getByRole('menuitem', { name: 'Rename' })).toHaveAttribute('aria-description', 'Beta');
    await expect(page.getByRole('menuitem', { name: 'Paste' })).not.toHaveAttribute('aria-keyshortcuts');
    await expect(page.getByRole('menuitem', { name: 'Paste' })).toHaveAttribute('aria-description', '⌘V');
    await expect(page.getByRole('menuitemcheckbox', { name: 'Show grid', checked: true })).toHaveCount(1);
    await expect(page.getByRole('menuitemcheckbox', { name: 'Show rulers', checked: false })).toHaveCount(1);
    await expect(page.getByRole('menuitemradio', { name: 'Date', checked: true })).toHaveCount(1);
    await expect(page.getByRole('menuitemradio', { checked: false })).toHaveCount(2);
    await expect(page.getByRole('group', { name: 'Sort by' })).toHaveCount(1);
    await expect(item(page, 'view', 3)).toHaveAttribute('aria-posinset', '4');
    await expect(item(page, 'view', 3)).toHaveAttribute('aria-setsize', '9');
    await expect(row(page, 'view', 0).locator('.leading-icon')).toHaveAttribute('aria-hidden', 'true');
    await expect(row(page, 'view', 0).locator('.shortcut')).toHaveAttribute('aria-hidden', 'true');
    await expect(row(page, 'view', 3).locator('.column.mark')).toHaveAttribute('aria-hidden', 'true');
    await anchor(page, 'view').click();
    await expect(anchor(page, 'view')).toHaveAttribute('aria-expanded', 'false');
    await expect(menu(page, 'view')).not.toHaveAttribute('role');
  });
});

/**
 * MNU-10's walk in the default system: for each condition, its row at rest, hovered and pressed by the pointer, and
 * focused from the keyboard. Each entry is a test of its own on a fresh page; the coverage test below holds that every
 * (row, state) pair is walked exactly once, in this order.
 */
const MNU_10_ROWS = [['actions', 0, 'unselected'], ['destructive', 1, 'destructive'], ['checkbox-checked', 0, 'selected']] as const;
const MNU_10_WALK = MNU_10_ROWS.flatMap(([id, n, condition]) => [
  { id, n, condition, states: ['rest', 'hovered', 'pressed'] },
  { id, n, condition, states: ['focused'] },
]);

test('MNU-10: the parts of the state walk check each row in each state exactly once, in order', () => {
  expect(MNU_10_WALK.flatMap(({ id, n, states }) => states.map((state) => `${id}/${n}/${state}`))).toEqual(
    MNU_10_ROWS.flatMap(([id, n]) => ['rest', 'hovered', 'pressed', 'focused'].map((state) => `${id}/${n}/${state}`)),
  );
  // The test names tell the parts apart.
  expect(new Set(MNU_10_WALK.map(({ id, states }) => `${id}, ${states.join(', ')}`)).size).toBe(MNU_10_WALK.length);
});

test.describe('items', () => {
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await acmeSystemCss();
  });
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec);
  });

  test('MNU-3: the surface is as wide as its widest item within its bounds, padded, filled, rounded and clipped', async ({ page }) => {
    const [min, max, padB, padI] = await Promise.all(['surface-min-width', 'surface-max-width', 'surface-padding-block', 'surface-padding-inline'].map((n) => resolveToken(page, T(n))));
    expect((await bounds(surface(page, 'actions'))).width).toBeCloseTo(min, 1);
    const wide = await bounds(surface(page, 'supporting-text'));
    expect(wide.width).toBeGreaterThan(min);
    expect(wide.width).toBeLessThanOrEqual(max);
    await mountFixtures(page, spec, { fixtures: [inline('long', [it('A label long enough that the surface reaches its maximum width and the label wraps onto more lines')])] });
    expect((await bounds(surface(page, 'long'))).width).toBeCloseTo(max, 1);
    const s = surface(page, 'long');
    const r = await bounds(row(page, 'long', 0));
    const sb = await bounds(s);
    expect(r.x - sb.x).toBeCloseTo(padI, 1);
    expect(r.y - sb.y).toBeCloseTo(padB, 1);
    expect(await css(s, 'background-color')).toBe(await resolveColor(page, T('surface-color')));
    expect(Number.parseFloat(await css(s, 'border-top-left-radius'))).toBe(await resolveToken(page, T('surface-shape')));
    expect(await css(s, 'overflow')).toBe('hidden');
  });

  test('MNU-9: a disabled item emits no click, change or group change, and exposes disabled', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [inline('x', [it('Paste', { disabled: true }), cb('Grid', { disabled: true }), group({ title: 'Sort', value: 'a' }, [radio('A', 'a'), radio('B', 'b', { disabled: true })])])] });
    await wire(page);
    for (const n of [0, 1, 3]) {
      await expect(item(page, 'x', n)).toHaveAttribute('aria-disabled', 'true');
      await row(page, 'x', n).click();
      await item(page, 'x', n).focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('Space');
      await item(page, 'x', n).evaluate((el) => (el as HTMLElement).click());
    }
    expect(await log(page)).toEqual([]);
    expect(await item(page, 'x', 1).evaluate((el: any) => el.checked)).toBe(false);
  });

  // One test for each part of MNU_10_WALK, each on the fresh page beforeEach mounts and with the whole of the time limit:
  // the walk in one test mounted every fixture six times and took 26-29 s in WebKit on a CI runner, against 30 s.
  for (const { id, n, condition, states } of MNU_10_WALK) {
    test(`MNU-10: each state renders the row from that state’s tokens of its condition; pointer focus is not the focused state (default system) — ${id}, ${states.join(', ')}`, async ({ page }) => {
      if (states[0] === 'focused') {
        // Keyboard focus, reached with the arrow keys from a focused item.
        await item(page, id, n === 0 ? 1 : 0).focus();
        await page.keyboard.press(n === 0 ? 'ArrowUp' : 'ArrowDown');
        await expect.poll(() => drawn(page, id, n), `${id} focused`).toEqual(await expected(page, condition, 'focused'));
        return;
      }
      await page.mouse.move(0, 0);
      await expect.poll(() => drawn(page, id, n), `${id}`).toEqual(await expected(page, condition));
      await row(page, id, n).hover();
      await expect.poll(() => drawn(page, id, n), `${id} hovered`).toEqual(await expected(page, condition, 'hovered'));
      await page.mouse.down();
      await expect.poll(() => drawn(page, id, n), `${id} pressed`).toEqual(await expected(page, condition, 'pressed'));
      await page.mouse.move(0, 0);
      await page.mouse.up();
    });
  }

  test('MNU-10: under acme, where the three states differ, pressed beats focused beats hovered', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() });
    const bg = () => css(row(page, 'actions', 1), 'background-color');
    const [rest, hovered, focus, down] = await Promise.all(['', 'hovered-', 'focused-', 'pressed-'].map((s) => resolveColor(page, T(`unselected-${s}container-color`))));
    expect(new Set([rest, hovered, focus, down]).size).toBe(4);
    await page.mouse.move(0, 0);
    await expect.poll(bg).toBe(rest);
    await row(page, 'actions', 1).hover();
    await expect.poll(bg).toBe(hovered);
    await item(page, 'actions', 0).focus();
    await page.keyboard.press('ArrowDown'); // hovered AND keyboard-focused: focused wins
    await expect.poll(bg).toBe(focus);
    await page.keyboard.down('Space');
    await expect.poll(bg).toBe(down);
    await page.keyboard.up('Space');
  });

  test('MNU-11: keyboard focus shows the ring inside the row, which the surface would otherwise clip; pointer focus does not', async ({ page }) => {
    const outer = await resolveToken(page, '--tanrei-sys-focus-outer-width');
    await row(page, 'actions', 1).click();
    await expect(row(page, 'actions', 1)).toHaveCSS('outline-style', 'none');
    await item(page, 'actions', 0).focus();
    await page.keyboard.press('ArrowDown');
    const r = row(page, 'actions', 1);
    await expect(r).toHaveCSS('outline-style', 'solid');
    await expect(r).toHaveCSS('outline-offset', `${-outer}px`);
    expect(await css(r, 'top', '::after')).toBe(`${outer}px`);
    expect(await css(r, 'transition-property')).not.toContain('outline');
    await expect(item(page, 'actions', 1)).toHaveCSS('outline-style', 'none');
  });

  test('MNU-12: an item is at least the minimum target tall, and the whole row is its hit area', async ({ page, browserName }) => {
    await override(page, { [T('container-height')]: '20px', [T('container-padding-block')]: '0px' });
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    expect((await bounds(row(page, 'actions', 0))).height).toBeCloseTo(pointer, 1);
    await wire(page);
    const box = await bounds(row(page, 'icons-shortcut', 0));
    for (const [x, y] of [[box.x + 2, box.y + 2], [box.x + box.width - 2, box.y + box.height - 2]]) await page.mouse.click(x, y);
    await row(page, 'icons-shortcut', 0).locator('.leading-icon').click();
    await row(page, 'icons-shortcut', 0).locator('.shortcut').click();
    expect(await log(page)).toEqual(Array(4).fill('click:Cut'));
    if (browserName !== 'chromium') return;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    expect((await bounds(row(page, 'actions', 0))).height).toBeCloseTo(await resolveToken(page, '--tanrei-sys-target-touch'), 1);
  });

  test('MNU-13: a disabled item renders from the disabled tokens of its condition — the box, its check and the ring of a control look, and a glyph mark, included', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...spec.fixtures, inline('glyph', [cb('Grid', { checked: true, disabled: true, markIcon: 'check' })])] });
    await expect.poll(() => drawn(page, 'disabled', 0)).toEqual(await expected(page, 'unselected', 'disabled'));
    await expect.poll(() => drawn(page, 'checked-disabled', 0)).toEqual(await expected(page, 'selected', 'disabled'));
    await expect.poll(() => drawn(page, 'destructive-disabled', 0)).toEqual(await expected(page, 'destructive', 'disabled'));
    // A disabled checked item keeps a fill, so that the choice still shows.
    expect((await expected(page, 'selected', 'disabled')).bg).not.toBe('rgba(0, 0, 0, 0)');
    const control = await resolveColor(page, T('selected-disabled-control-color'));
    const checked = row(page, 'checked-disabled', 0);
    await expect.poll(() => settledCss(checked.locator('.box'), 'background-color')).toBe(control);
    expect(await settledCss(checked.locator('.box'), 'box-shadow')).toContain(control);
    expect(await settledCss(checked.locator('.box-check'), 'color')).toBe(await resolveColor(page, T('selected-disabled-control-mark-color')));
    for (const [n, condition] of [[0, 'selected'], [1, 'unselected']] as const) {
      const ring = row(page, 'radio-checked-disabled', n).locator('.ring');
      expect(await settledCss(ring, 'box-shadow'), condition).toContain(await resolveColor(page, T(`${condition}-disabled-control-color`)));
    }
    expect(await settledCss(row(page, 'glyph', 0).locator('.check'), 'color')).toBe(await resolveColor(page, T('selected-disabled-mark-color')));
  });

  test('MNU-14: a placement the menu does not define renders as bottom-start, and a debug build reports it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [overlay('odd', EDIT, { placement: 'left-middle' })] });
    await page.addStyleTag({ content: `#a-odd { position: fixed; top: 200px; left: 300px; }` });
    await menu(page, 'odd').evaluate((el: any) => (el.open = true));
    await expect.poll(() => isOpen(page, 'odd')).toBe(true);
    await motionEnded(page);
    const [a, s] = [await bounds(anchor(page, 'odd')), await bounds(surface(page, 'odd'))];
    expect(s.x).toBeCloseTo(a.x, 0);
    expect(s.y).toBeGreaterThan(a.y + a.height);
    await expect.poll(() => seen.filter((w) => w.includes('MNU-14')).length).toBe(1);
    expect(seen.join('\n')).toMatch(/placement "left-middle" is not a value the menu defines; it is drawn as "bottom-start" \(MNU-14\)/);
  });

  test('MNU-18: an item is drawn from its condition — destructive, selected when checked, else unselected', async ({ page }) => {
    await expect(row(page, 'destructive', 1)).toHaveClass(/destructive/);
    expect(await css(row(page, 'destructive', 1).locator('.label'), 'color')).toBe(await resolveColor(page, T('destructive-label-color')));
    expect(await css(row(page, 'destructive', 1).locator('.leading-icon'), 'color')).toBe(await resolveColor(page, T('destructive-leading-icon-color')));
    await expect(row(page, 'checkbox-checked', 0)).toHaveClass(/selected/);
    await expect(row(page, 'checkbox-checked', 1)).not.toHaveClass(/selected/);
    await expect(row(page, 'radio-checked', 0)).toHaveClass(/selected/);
    await expect(row(page, 'radio-checked', 1)).not.toHaveClass(/selected/);
    // The group's value decides, and follows the product.
    await menu(page, 'radio-checked').locator('tanrei-menu-group').evaluate((el: any) => (el.value = 'size'));
    await expect(row(page, 'radio-checked', 2)).toHaveClass(/selected/);
    await expect(row(page, 'radio-checked', 0)).not.toHaveClass(/selected/);
    // A submenu item whose submenu is open is expanded; closed, unselected.
    await expect(rowOf(labelled(page, 'submenu-open', 'Open recent'))).toHaveClass(/expanded/);
    await expect(rowOf(labelled(page, 'submenu', 'Open recent'))).not.toHaveClass(/expanded|selected/);
    await labelled(page, 'submenu-open', 'Open recent').evaluate((el: any) => (el.open = false));
    await expect(rowOf(labelled(page, 'submenu-open', 'Open recent'))).not.toHaveClass(/expanded/);
  });

  test('MNU-19: one row — padding, the mark column, the icon column, the label, the shortcut or trailing text and the icon — each a gap apart, the empty columns kept so labels align, mirrored in RTL', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [inline('cols', [cb('Grid', { checked: true }), it('Copy', { leadingIcon: 'content_copy', trailingText: '12', trailingIcon: 'open_in_new' }), it('Plain'), it('Cut', { shortcut: ['mod+x'], trailingIcon: 'open_in_new' })])],
    });
    const [pad, gap, mark, icon] = await Promise.all(['container-padding-inline', 'container-gap', 'mark-size', 'leading-icon-size'].map((n) => resolveToken(page, T(n))));
    const measure = async () => {
      const r = await bounds(row(page, 'cols', 1));
      const m = await bounds(row(page, 'cols', 1).locator('.column.mark'));
      const i = await bounds(row(page, 'cols', 1).locator('.leading-icon'));
      const l = await bounds(row(page, 'cols', 1).locator('.label'));
      const tt = await bounds(row(page, 'cols', 1).locator('.trailing-text'));
      const ti = await bounds(row(page, 'cols', 1).locator('.trailing-icon'));
      return { r, m, i, l, tt, ti };
    };
    const ltr = await measure();
    expect(ltr.m.x - ltr.r.x).toBeCloseTo(pad, 1);
    expect(ltr.m.width).toBeCloseTo(mark, 1);
    expect(ltr.i.x - (ltr.m.x + ltr.m.width)).toBeCloseTo(gap, 1);
    expect(ltr.l.x - (ltr.i.x + icon)).toBeCloseTo(gap, 1);
    expect(ltr.ti.x - (ltr.tt.x + ltr.tt.width)).toBeCloseTo(gap, 1);
    expect(ltr.r.x + ltr.r.width - (ltr.ti.x + ltr.ti.width)).toBeCloseTo(pad, 1);
    // The shortcut takes the trailing column, the same gap before the trailing icon.
    const [sc, sti] = [await bounds(row(page, 'cols', 3).locator('.shortcut')), await bounds(row(page, 'cols', 3).locator('.trailing-icon'))];
    expect(sti.x - (sc.x + sc.width)).toBeCloseTo(gap, 1);
    // Every label starts at the same place, whatever the item holds.
    const starts = await Promise.all([0, 1, 2, 3].map(async (n) => (await bounds(row(page, 'cols', n).locator('.text .label'))).x));
    expect(new Set(starts.map((x) => Math.round(x))).size).toBe(1);
    await page.locator('[data-fixture="cols"]').evaluate((el) => el.setAttribute('dir', 'rtl'));
    const rtl = await measure();
    expect(rtl.r.x + rtl.r.width - (rtl.m.x + rtl.m.width)).toBeCloseTo(pad, 1);
    expect(rtl.ti.x - rtl.r.x).toBeCloseTo(pad, 1);
  });

  test('MNU-59: the mark and icon columns are kept for each section — auto where another item of the section draws in them, always on every row, never only where the row does — each surface by itself, decided again on a change, an unknown value drawn as auto', async ({ page }) => {
    const seen = warnings(page);
    const spaced = spec.fixtures.filter((f) => f.id.startsWith('icon-space-'));
    expect(spaced.map((f) => f.id)).toEqual(['icon-space-auto', 'icon-space-always', 'icon-space-never']);
    const [auto] = spaced;
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        ...spaced,
        inline('icon-space-odd', auto.items!, { iconSpace: 'sometimes' }),
        inline('icon-space-sub', [sub('Share', [it('Copy link', { leadingIcon: 'link' }), it('Send')], { open: true }), it('Print')]),
      ],
    });
    const [pad, gap, mark, icon] = await Promise.all(['container-padding-inline', 'container-gap', 'mark-size', 'leading-icon-size'].map((n) => resolveToken(page, T(n))));
    /** Where a row's label starts, from its row's start edge. */
    const at = async (id: string, label: string) => {
      const host = labelled(page, id, label);
      const [r, l] = [await bounds(rowOf(host)), await bounds(rowOf(host).locator('.text .label'))];
      return l.x - r.x;
    };
    const none = pad;
    const markOnly = pad + mark + gap;
    const iconOnly = pad + icon + gap;
    const both = pad + mark + gap + icon + gap;
    const expectStarts = async (id: string, starts: Record<string, number>) => {
      for (const [label, x] of Object.entries(starts)) expect(await at(id, label), `${id}: ${label}`).toBeCloseTo(x, 1);
    };
    // auto (the default): each section keeps what one of its items draws, and nothing else.
    expect(await menu(page, 'icon-space-auto').evaluate((el: any) => el.iconSpace)).toBe('auto');
    const autoStarts = { Cut: iconOnly, Copy: iconOnly, Paste: iconOnly, 'Show grid': markOnly, 'Show rulers': markOnly, 'Zoom to fit': markOnly, Settings: none, Help: none };
    await expectStarts('icon-space-auto', autoStarts);
    // A kept room draws nothing and is nothing to assistive technology; a column no row of the section uses is not there.
    await expect(rowOf(labelled(page, 'icon-space-auto', 'Paste')).locator('.leading-icon.empty[aria-hidden="true"]')).toHaveCount(1);
    await expect(rowOf(labelled(page, 'icon-space-auto', 'Paste')).locator('.column.mark')).toHaveCount(0);
    await expect(rowOf(labelled(page, 'icon-space-auto', 'Zoom to fit')).locator('.column.mark[aria-hidden="true"]')).toHaveCount(1);
    await expect(rowOf(labelled(page, 'icon-space-auto', 'Zoom to fit')).locator('.column.leading')).toHaveCount(0);
    await expect(rowOf(labelled(page, 'icon-space-auto', 'Help')).locator('.column.mark, .column.leading')).toHaveCount(0);
    // always: both columns on every row; never: a column only where the row itself draws in it.
    await expectStarts('icon-space-always', Object.fromEntries(Object.keys(autoStarts).map((label) => [label, both])));
    await expectStarts('icon-space-never', { Cut: iconOnly, Copy: iconOnly, Paste: none, 'Show grid': markOnly, 'Show rulers': markOnly, 'Zoom to fit': none, Settings: none, Help: none });
    // An unknown value is auto, and a debug build says so.
    await expectStarts('icon-space-odd', autoStarts);
    await expect.poll(() => seen.filter((w) => w.includes('MNU-59')).length).toBe(1);
    expect(seen.join('\n')).toMatch(/iconSpace "sometimes" is not a value the menu defines; it is drawn as "auto" \(MNU-59\)/);
    // An icon given to one item keeps its room on the other rows of its section only; a change of the prop is followed.
    await labelled(page, 'icon-space-auto', 'Settings').evaluate((el: any) => (el.leadingIcon = 'settings'));
    await expect.poll(() => at('icon-space-auto', 'Help')).toBeCloseTo(iconOnly, 1);
    await expectStarts('icon-space-auto', { 'Show grid': markOnly, Paste: iconOnly });
    await menu(page, 'icon-space-auto').evaluate((el: any) => (el.iconSpace = 'never'));
    await expect.poll(() => at('icon-space-auto', 'Paste')).toBeCloseTo(none, 1);
    await expectStarts('icon-space-auto', { Help: none, Settings: iconOnly });
    // Each surface by itself: the submenu keeps the icon's room for Send, the menu's own surface keeps none for Print;
    // the submenu follows the menu's iconSpace.
    await expectStarts('icon-space-sub', { 'Copy link': iconOnly, Send: iconOnly, Print: none, Share: none });
    await menu(page, 'icon-space-sub').evaluate((el: any) => (el.iconSpace = 'never'));
    await expect.poll(() => at('icon-space-sub', 'Send')).toBeCloseTo(none, 1);
    await menu(page, 'icon-space-sub').evaluate((el: any) => (el.iconSpace = 'always'));
    await expect.poll(() => at('icon-space-sub', 'Print')).toBeCloseTo(both, 1);
    await expectStarts('icon-space-sub', { Send: both, Share: both });
  });

  test('MNU-20: at least container.height tall, padded above and below, texts in their roles, growing with the content and enlarged text', async ({ page }) => {
    const [height, pad] = await Promise.all([resolveToken(page, T('container-height')), resolveToken(page, T('container-padding-block'))]);
    expect((await bounds(row(page, 'actions', 0))).height).toBeCloseTo(height, 1);
    const size = (locator: Locator) => css(locator, 'font-size');
    expect(await size(row(page, 'actions', 0).locator('.label'))).toBe(`${await resolveToken(page, T('label-typescale-font-size'))}px`);
    expect(await size(row(page, 'supporting-text', 0).locator('.supporting'))).toBe(`${await resolveToken(page, T('supporting-text-typescale-font-size'))}px`);
    // The trailing text and the shortcut's legends are in the trailing text's role.
    await mountFixtures(page, spec, { fixtures: [...spec.fixtures, inline('beta', [it('Rename', { trailingText: 'Beta' })])] });
    expect(await size(row(page, 'beta', 0).locator('.trailing-text'))).toBe(`${await resolveToken(page, T('trailing-text-typescale-font-size'))}px`);
    for (const legend of await row(page, 'icons-shortcut', 0).locator('.shortcut .label').all()) {
      expect(await size(legend)).toBe(`${await resolveToken(page, T('trailing-text-typescale-font-size'))}px`);
    }
    const tall = await bounds(row(page, 'supporting-text', 0));
    const text = await bounds(row(page, 'supporting-text', 0).locator('.text'));
    expect(tall.height).toBeGreaterThan(height);
    expect(text.y - tall.y).toBeGreaterThanOrEqual(pad - 0.5);
    expect(tall.y + tall.height - (text.y + text.height)).toBeCloseTo(pad, 1);
    // Enlarged text: the row grows to its line of text and the padding above and below it, and nothing is clipped. (By
    // how much it grows is the text role's line height, not a number of this test: a doubled type dial can leave a row
    // exactly 8 over the minimum.)
    await override(page, { '--tanrei-dial-type-base': '32px' });
    const action = row(page, 'actions', 0);
    await expect.poll(async () => (await bounds(action)).height).toBeGreaterThan(height);
    const [grown, line, label] = await Promise.all([bounds(action), bounds(action.locator('.text')), bounds(action.locator('.label'))]);
    expect(line.height).toBeGreaterThan(height - 2 * pad);
    expect(line.height).toBeGreaterThanOrEqual(label.height - 0.5);
    expect(grown.height).toBeCloseTo(line.height + 2 * pad, 1);
    expect(line.y - grown.y).toBeCloseTo(pad, 1);
    for (const part of [action, action.locator('.text'), action.locator('.label')]) {
      const [scrollHeight, clientHeight, scrollWidth, clientWidth] = await part.evaluate((el) => [el.scrollHeight, el.clientHeight, el.scrollWidth, el.clientWidth]);
      expect(scrollHeight).toBeLessThanOrEqual(clientHeight);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    }
  });

  test('MNU-21: icons at their sizes in the family and fill of the item’s condition; an empty name draws nothing', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...spec.fixtures, inline('checked-icon', [cb('Bold', { leadingIcon: 'format_bold', checked: true }), cb('Italic', { leadingIcon: 'format_italic' })])] });
    expect(await css(row(page, 'icons-shortcut', 0).locator('.leading-icon'), 'font-size')).toBe(`${await resolveToken(page, T('leading-icon-size'))}px`);
    expect(await css(row(page, 'trailing-icon', 0).locator('.trailing-icon'), 'font-size')).toBe(`${await resolveToken(page, T('trailing-icon-size'))}px`);
    const fill = (n: number) => css(row(page, 'checked-icon', n).locator('.leading-icon'), '--tanrei-icon-fill').then((v) => v.trim());
    expect(await fill(0)).toBe(await token(page, '--tanrei-sys-icon-fill-selected'));
    expect(await fill(1)).toBe(await token(page, '--tanrei-sys-icon-fill-unselected'));
    // The item without an icon in a menu with icons keeps the column, drawing nothing in it.
    await expect(row(page, 'supporting-text', 1).locator('.leading-icon')).toHaveCount(1);
    await mountFixtures(page, spec, { fixtures: [inline('mixed', [it('Share', { leadingIcon: 'share' }), it('Rename')])] });
    const empty = row(page, 'mixed', 1).locator('.leading-icon');
    expect(await empty.textContent()).toBe('');
    expect(await css(empty, 'visibility')).toBe('hidden');
    await expect(row(page, 'actions', 0).locator('.leading-icon')).toHaveCount(0);
  });

  test('MNU-22: a checked item whose mark is a glyph draws that glyph of the icon set in its mark column at the mark’s size, in the selected family and fill, the check never mirrored, and nothing while it is not checked; a change of checked fades it over the state motion, at once where reduced', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    // checkbox-check-mark names the glyph check, so it draws the plain check under every design system.
    const check = (n: number) => row(page, 'checkbox-check-mark', n).locator('.check');
    const size = await resolveToken(page, T('mark-size'));
    expect(size).toBe(await resolveToken(page, T('leading-icon-size')));
    await expect(check(0)).toHaveAttribute('data-drawn', '');
    // The glyph `check` of the icon set, as a ligature: no path, shape or character of the menu's own, and no control look.
    expect(await check(0).textContent()).toBe('check');
    await expect(row(page, 'checkbox-check-mark', 0).locator('svg, path, .control')).toHaveCount(0);
    const glyph = await bounds(check(0));
    const column = await bounds(row(page, 'checkbox-check-mark', 0).locator('.column.mark'));
    expect(glyph.width).toBeCloseTo(size, 1);
    expect(glyph.height).toBeCloseTo(size, 1);
    expect(glyph.x + glyph.width / 2).toBeCloseTo(column.x + column.width / 2, 1);
    expect(await css(check(0), 'font-size')).toBe(`${size}px`);
    // The selected family and fill, in a checked and an unchecked item alike.
    for (const n of [0, 1]) {
      expect((await css(check(n), '--tanrei-icon-family')).trim()).toBe(await token(page, '--tanrei-sys-icon-family-selected'));
      expect((await css(check(n), '--tanrei-icon-fill')).trim()).toBe(await token(page, '--tanrei-sys-icon-fill-selected'));
    }
    expect(await css(check(0), 'color')).toBe(await resolveColor(page, T('selected-mark-color')));
    expect(await settledCss(check(0), 'opacity')).toBe('1');
    // Not checked: nothing is drawn in the column — the glyph is not merely transparent.
    expect(await settledCss(check(1), 'opacity')).toBe('0');
    expect(await settledCss(check(1), 'visibility')).toBe('hidden');
    // A named glyph is that glyph: mark-icon-custom draws keep and star, and nothing for the unchecked item.
    expect(await row(page, 'mark-icon-custom', 0).locator('.check').textContent()).toBe('keep');
    expect(await row(page, 'mark-icon-custom', 1).locator('.check').textContent()).toBe('star');
    expect(await settledCss(row(page, 'mark-icon-custom', 2).locator('.check'), 'visibility')).toBe('hidden');
    // The fade: the opacity (and the mark color) over the state motion, never a move or a scale.
    const duration = await resolveToken(page, T('motion-state-duration'), 'duration');
    const properties = (await css(check(1), 'transition-property')).split(', ');
    expect(properties).toContain('opacity');
    expect(properties).not.toContain('transform');
    expect((await css(check(1), 'transition-duration')).split(', ').map((v) => Number.parseFloat(v) * 1000)).toContain(duration);
    await check(1).evaluate((el) => {
      (window as any).ran = [];
      el.addEventListener('transitionrun', (e) => (window as any).ran.push((e as TransitionEvent).propertyName));
    });
    // Focus first: it scrolls the item into view, which moves every box in the viewport's coordinates.
    await item(page, 'checkbox-check-mark', 1).focus();
    const before = await bounds(check(1));
    await page.keyboard.press('Space');
    await expect.poll(() => settledCss(check(1), 'opacity')).toBe('1');
    expect(await css(check(1), 'visibility')).toBe('visible');
    expect(await page.evaluate(() => (window as any).ran)).toContain('opacity');
    expect(await css(check(1), 'transform')).toBe('none');
    expect(await bounds(check(1))).toEqual(before);
    // Not mirrored: in right-to-left the column moves to the start (right) edge, and the glyph is drawn left to right.
    await page.locator('[data-fixture="checkbox-check-mark"]').evaluate((el) => el.setAttribute('dir', 'rtl'));
    expect(await css(check(0), 'direction')).toBe('ltr');
    expect(await css(check(0), 'transform')).toBe('none');
    const r = await bounds(row(page, 'checkbox-check-mark', 0));
    const rtl = await bounds(check(0));
    expect(r.x + r.width - (rtl.x + rtl.width)).toBeCloseTo(await resolveToken(page, T('container-padding-inline')), 1);
    // Where motion is reduced, at once.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(check(1), 'transition-duration')).toBe('0s');
    await page.evaluate(() => ((window as any).ran = []));
    await page.keyboard.press('Space');
    await expect.poll(() => css(check(1), 'opacity')).toBe('0');
    expect(await page.evaluate(() => (window as any).ran)).not.toContain('opacity');
  });

  test('MNU-22: under m3-like and cupertino, which choose check for both kinds of item, checkbox-checked and radio-checked draw the same plain check', async ({ page }) => {
    for (const system of ['m3-like', 'cupertino']) {
      await mountFixtures(page, spec, { system, icons: true });
      for (const id of ['checkbox-checked', 'radio-checked']) {
        const glyph = row(page, id, 0).locator('.check.system');
        await expect(glyph, `${system} ${id}`).toBeVisible();
        expect(await glyph.textContent(), `${system} ${id}`).toBe('check');
        expect(await settledCss(glyph, 'color'), `${system} ${id}`).toBe(await resolveColor(page, T('selected-mark-color')));
        await expect(row(page, id, 0).locator('.control'), `${system} ${id}`).toBeHidden();
        // Not checked: nothing in the column.
        expect(await settledCss(row(page, id, 1).locator('.check.system'), 'visibility'), `${system} ${id}`).toBe('hidden');
      }
    }
  });

  test('MNU-22: under the acme system, whose icon set is static, the check is drawn in the selected family', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() });
    const check = row(page, 'checkbox-check-mark', 0).locator('.check');
    const unquote = (v: string) => v.replaceAll(/["']/g, '').trim();
    const [selected, unselected] = await Promise.all(['selected', 'unselected'].map((s) => token(page, `--tanrei-sys-icon-family-${s}`).then(unquote)));
    expect(selected).not.toBe(unselected);
    expect(unquote(await css(check, 'font-family')).startsWith(selected.split(',')[0].trim())).toBe(true);
    expect(await css(check, 'font-size')).toBe(`${await resolveToken(page, T('mark-size'))}px`);
  });

  test('MNU-30: until the icon set can draw a glyph the menu draws — a mark’s check, the check in a checked box, the submenu indicator — nothing in its place, never its name; the column kept, the box and the ring still drawn, the states still exposed; then the glyph, without the fade', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    await withoutIconFont(page);
    const host = item(page, 'checkbox-check-mark', 0);
    const check = row(page, 'checkbox-check-mark', 0).locator('.check');
    await expect(check).not.toHaveAttribute('data-drawn');
    expect(await css(check, 'visibility')).toBe('hidden');
    // What the browser would print is the name, spelled out in a text face: far wider than a glyph.
    expect(await check.locator('.check-ink').evaluate((el) => (el as HTMLElement).offsetWidth)).toBeGreaterThan((await resolveToken(page, T('mark-size'))) * 1.5);
    await expect(host).toHaveAttribute('aria-checked', 'true');
    const [pad, gap, size] = await Promise.all(['container-padding-inline', 'container-gap', 'mark-size'].map((n) => resolveToken(page, T(n))));
    const r = await bounds(row(page, 'checkbox-check-mark', 0));
    expect((await bounds(row(page, 'checkbox-check-mark', 0).locator('.column.mark'))).width).toBeCloseTo(size, 1);
    expect((await bounds(row(page, 'checkbox-check-mark', 0).locator('.label'))).x - r.x).toBeCloseTo(pad + size + gap, 1);
    // A control look: the box and the ring are still drawn, the check on the box is not.
    const boxed = row(page, 'checkbox-checked', 0);
    await expect(boxed.locator('.box')).toBeVisible();
    expect(await settledCss(boxed.locator('.box'), 'background-color')).toBe(await resolveColor(page, T('selected-control-color')));
    expect(await css(boxed.locator('.box-check'), 'visibility')).toBe('hidden');
    await expect(item(page, 'checkbox-checked', 0)).toHaveAttribute('aria-checked', 'true');
    await expect(row(page, 'radio-checked', 0).locator('.ring')).toBeVisible();
    // The submenu indicator: nothing in its place, its column kept, and whether its submenu is open still exposed.
    const indicator = rowOf(labelled(page, 'submenu-open', 'Open recent')).locator('.submenu-indicator');
    await expect(indicator).not.toHaveAttribute('data-drawn');
    expect(await css(indicator, 'visibility')).toBe('hidden');
    expect((await bounds(indicator)).width).toBeCloseTo(await resolveToken(page, T('trailing-icon-size')), 1);
    await expect(labelled(page, 'submenu-open', 'Open recent')).toHaveAttribute('aria-expanded', 'true');
    // The face can draw it: the glyphs are there at once, with no fade.
    await check.evaluate((el) => {
      (window as any).ran = [];
      el.addEventListener('transitionrun', (e) => (window as any).ran.push((e as TransitionEvent).propertyName));
    });
    await iconFaceArrives(page);
    await expect(check).toHaveAttribute('data-drawn', '');
    expect(await css(check, 'visibility')).toBe('visible');
    expect(await css(check, 'opacity')).toBe('1');
    expect(await page.evaluate(() => (window as any).ran)).not.toContain('opacity');
    await expect(boxed.locator('.box-check')).toHaveAttribute('data-drawn', '');
    expect(await css(boxed.locator('.box-check'), 'visibility')).toBe('visible');
    await expect(indicator).toHaveAttribute('data-drawn', '');
    expect(await css(indicator, 'visibility')).toBe('visible');
    // A face that does not load at all (the items are mounted without the icon faces, and the family is one no machine
    // has — the default's may be installed locally): nothing, never the word.
    await mountFixtures(page, spec);
    await withoutIconFont(page);
    await expect(item(page, 'checkbox-check-mark', 0)).toHaveAttribute('aria-checked', 'true');
    await expect.poll(() => css(row(page, 'checkbox-check-mark', 0).locator('.check'), 'visibility')).toBe('hidden');
    await expect.poll(() => css(rowOf(labelled(page, 'submenu', 'Open recent')).locator('.submenu-indicator'), 'visibility')).toBe('hidden');
  });

  test('MNU-31: a shortcut is drawn in the trailing column by the keyboard shortcut, hosted — small, in comp.menu.shortcut.variant’s form, convention auto — its legends in the trailing text’s role and color, its caps its own', async ({ page }) => {
    const K = (name: string) => `--tanrei-comp-keyboard-shortcut-${name}`;
    const shortcutOf = (id: string, n: number) => row(page, id, n).locator('tanrei-keyboard-shortcut');
    const legends = (id: string, n: number) => shortcutOf(id, n).locator('.label, .separator');
    const written = (id: string, n: number) => legends(id, n).allTextContents().then((texts) => texts.join(''));
    // The fixture: ⌘X, ⌘C and ⌘V as small keys in the default system (keycap), the harness's convention apple.
    expect(await token(page, T('shortcut-variant'))).toBe('keycap');
    const [small, trailing] = [await resolveToken(page, K('container-height-small')), await resolveToken(page, T('trailing-text-typescale-font-size'))];
    for (const [n, key] of ['X', 'C', 'V'].entries()) {
      const shortcut = shortcutOf('icons-shortcut', n);
      await expect(shortcut).toHaveAttribute('size', 'small');
      await expect(shortcut).toHaveAttribute('variant', 'keycap');
      await expect(shortcut).toHaveAttribute('convention', 'auto');
      await expect(shortcut).toHaveAttribute('aria-hidden', 'true');
      expect(await written('icons-shortcut', n)).toBe(`⌘${key}`);
      const cap = shortcut.locator('.key').first();
      expect((await bounds(cap)).height).toBeCloseTo(small, 1);
      expect(await css(cap, 'background-color')).toBe(await resolveColor(page, K('container-color')));
      for (const legend of await legends('icons-shortcut', n).all()) {
        expect(await css(legend, 'font-size')).toBe(`${trailing}px`);
        expect(await settledCss(legend, 'color')).toBe(await resolveColor(page, T('unselected-trailing-text-color')));
      }
      // Nothing of it is read: the item exposes the shortcut as its own.
      await expect(item(page, 'icons-shortcut', n)).toHaveAttribute('aria-keyshortcuts', `Meta+${key}`);
      await expect(item(page, 'icons-shortcut', n)).not.toHaveAttribute('aria-description');
    }
    // Disabled with its item; the legends in the trailing-text color of the item's condition and state.
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [
        inline('states', [
          it('Cut', { shortcut: ['mod+x'], disabled: true }),
          it('Delete', { shortcut: ['mod+backspace'], destructive: true }),
          cb('Grid', { shortcut: ['mod+g'], checked: true }),
          it('Both', { shortcut: ['mod+b'], trailingText: 'Beta' }),
          it('Open', { shortcut: ['mod+o'] }),
        ]),
      ],
    });
    await expect(shortcutOf('states', 0)).toHaveAttribute('disabled', '');
    await expect(shortcutOf('states', 1)).not.toHaveAttribute('disabled');
    for (const [n, color] of [[0, 'unselected-disabled'], [1, 'destructive'], [2, 'selected']] as const) {
      for (const legend of await legends('states', n).all()) await expect.poll(() => settledCss(legend, 'color'), color).toBe(await resolveColor(page, T(`${color}-trailing-text-color`)));
    }
    await row(page, 'states', 4).hover();
    for (const legend of await legends('states', 4).all()) await expect.poll(() => settledCss(legend, 'color')).toBe(await resolveColor(page, T('unselected-hovered-trailing-text-color')));
    // Both a shortcut and trailing text: the shortcut is drawn, the text is not (nor read), and a debug build reports it.
    await expect(row(page, 'states', 3).locator('.trailing-text')).toHaveCount(0);
    expect(await written('states', 3)).toBe('⌘B');
    await expect(item(page, 'states', 3)).not.toHaveAttribute('aria-description');
    await expect.poll(() => seen.join('\n')).toMatch(/the item "Both" has both a shortcut and trailing text; the shortcut is drawn and the trailing text is not \(MNU-31\)/);
    // The attribute holds the chords separated by spaces.
    await item(page, 'states', 4).evaluate((el) => el.setAttribute('shortcut', 'mod+k mod+c'));
    await expect(item(page, 'states', 4)).toHaveAttribute('aria-keyshortcuts', 'Meta+K Meta+C');
    // Convention auto: the keyboard the page says, followed as it changes — drawn and exposed alike.
    await menu(page, 'states').evaluate((el) => el.setAttribute('data-tanrei-keyboard-convention', 'standard'));
    await expect.poll(() => written('states', 1)).toBe('Ctrl+Backspace');
    await expect(item(page, 'states', 1)).toHaveAttribute('aria-keyshortcuts', 'Control+Backspace');
  });

  test('MNU-31: m3-like and cupertino draw the shortcut as text (comp.menu.shortcut.variant plain), in the trailing text’s role and color', async ({ page }) => {
    for (const system of ['m3-like', 'cupertino']) {
      await mountFixtures(page, spec, { system, icons: true });
      expect(await token(page, T('shortcut-variant')), system).toBe('plain');
      const shortcut = row(page, 'icons-shortcut', 1).locator('tanrei-keyboard-shortcut');
      await expect(shortcut, system).toHaveAttribute('variant', 'plain');
      expect(await css(shortcut.locator('.key').first(), 'background-color'), system).toBe('rgba(0, 0, 0, 0)');
      expect(await css(shortcut.locator('.key').first(), 'border-top-width'), system).toBe('0px');
      expect((await shortcut.locator('.label').allTextContents()).join(''), system).toBe('⌘C');
      for (const legend of await shortcut.locator('.label').all()) {
        expect(await css(legend, 'font-size'), system).toBe(`${await resolveToken(page, T('trailing-text-typescale-font-size'))}px`);
        expect(await settledCss(legend, 'color'), system).toBe(await resolveColor(page, T('unselected-trailing-text-color')));
      }
    }
  });

  test('MNU-23: a divider between a group and what is next to it, inside the surface’s padding, spaced above and below, a separator; none at the ends', async ({ page }) => {
    const [pad, space, thickness] = await Promise.all(['surface-padding-inline', 'divider-space', 'divider-thickness'].map((n) => resolveToken(page, T(n))));
    const dividers = menu(page, 'groups').locator('.divider');
    await expect(dividers).toHaveCount(1);
    await expect(dividers).toHaveAttribute('role', 'separator');
    const [d, s] = [await bounds(dividers), await bounds(surface(page, 'groups'))];
    expect(d.height).toBeCloseTo(thickness, 1);
    expect(d.x - s.x).toBeCloseTo(pad, 1);
    expect(s.x + s.width - (d.x + d.width)).toBeCloseTo(pad, 1);
    expect(d.y - (await bounds(row(page, 'groups', 2))).y - (await bounds(row(page, 'groups', 2))).height).toBeCloseTo(space, 1);
    expect((await bounds(row(page, 'groups', 3))).y - (d.y + d.height)).toBeCloseTo(space, 1);
    expect(await css(dividers, 'background-color')).toBe(await resolveColor(page, T('divider-color')));
    // Between a group and an item outside any group too; never between two plain items.
    await mountFixtures(page, spec, { fixtures: [inline('mixed', [it('A'), it('B'), group({}, [it('C')]), it('D')])] });
    await expect(menu(page, 'mixed').locator('.divider')).toHaveCount(2);
    await expect(menu(page, 'actions').locator('.divider')).toHaveCount(0);
  });

  test('MNU-26: an item without a label still renders, and a debug build reports it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [inline('x', [it(''), it('Copy')])] });
    await expect(items(page, 'x')).toHaveCount(2);
    await expect.poll(() => seen.filter((w) => w.includes('MNU-26')).length).toBe(1);
  });

  test('MNU-27: colors change over the state motion, and at once where motion is reduced', async ({ page }) => {
    const duration = await resolveToken(page, T('motion-state-duration'), 'duration');
    const r = row(page, 'actions', 0);
    expect(await css(r, 'transition-property')).toContain('background-color');
    expect((await css(r, 'transition-duration')).split(', ').map((v) => Number.parseFloat(v) * 1000)).toContain(duration);
    expect(Number.parseFloat(await css(r.locator('.label'), 'transition-duration')) * 1000).toBe(duration);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(r, 'transition-duration')).toBe('0s');
    expect(await css(r.locator('.label'), 'transition-duration')).toBe('0s');
  });

  test('MNU-28: a group’s title above its items, in its role and color, inset from the rows’ edges by its own padding — where the rows’ marks start, not their labels — mirrored in RTL, padded, taking no focus and read as the group’s name', async ({ page }) => {
    const title = (id: string) => menu(page, id).locator('tanrei-menu-group').first().locator('.title');
    const textBox = (id: string) =>
      title(id).evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const rect = range.getBoundingClientRect();
        return { start: rect.left, end: rect.right };
      });
    const inset = await resolveToken(page, T('group-title-padding-inline'));
    // group-titles: the mark column; group-titles-icons: the mark and leading icon columns. Either way, over the marks.
    for (const id of ['group-titles', 'group-titles-icons']) {
      expect(Number.parseFloat(await css(title(id), 'padding-inline-start'))).toBe(inset);
      expect(Number.parseFloat(await css(title(id), 'padding-inline-end'))).toBe(inset);
      const mark = await bounds(row(page, id, 0).locator('.column.mark'));
      const label = await bounds(row(page, id, 0).locator('.label'));
      expect((await textBox(id)).start).toBeCloseTo(mark.x, 0);
      expect((await textBox(id)).start).toBeLessThan(label.x - 1);
      await page.locator(`[data-fixture="${id}"]`).evaluate((el) => el.setAttribute('dir', 'rtl'));
      const rtlMark = await bounds(row(page, id, 0).locator('.column.mark'));
      expect((await textBox(id)).end).toBeCloseTo(rtlMark.x + rtlMark.width, 0);
      await page.locator(`[data-fixture="${id}"]`).evaluate((el) => el.removeAttribute('dir'));
    }
    // The title's inset is its own: moving it moves no row.
    const before = await bounds(row(page, 'group-titles', 0).locator('.label'));
    const group = await bounds(menu(page, 'group-titles').locator('tanrei-menu-group').first());
    // The token is set on the fixture's stage, not on the document's root. WebKit, when a custom property the root
    // declares is replaced there, compares the old and the new set of every element of the page value by value, and a
    // set of ten thousand tokens costs it milliseconds an element (a page of plain elements outside Tanrei does the
    // same): this page's 1,400 elements took four to seven seconds for this token, and the poll's five ran out before
    // its first read had come back. The stage's few elements are what the sentence is about.
    const stage = page.locator('[data-fixture="group-titles"]');
    await stage.evaluate((el: HTMLElement, [name, value]) => el.style.setProperty(name, value), [T('group-title-padding-inline'), `${inset + 20}px`] as const);
    await expect.poll(async () => (await textBox('group-titles')).start - group.x).toBeCloseTo(inset + 20, 0);
    expect(await bounds(row(page, 'group-titles', 0).locator('.label'))).toEqual(before);
    await stage.evaluate((el: HTMLElement, name) => el.style.removeProperty(name), T('group-title-padding-inline'));
    const t = title('group-titles');
    expect(await css(t, 'font-size')).toBe(`${await resolveToken(page, T('group-title-typescale-font-size'))}px`);
    expect(await css(t, 'color')).toBe(await resolveColor(page, T('group-title-color')));
    const pad = await resolveToken(page, T('container-padding-block'));
    expect(Number.parseFloat(await css(t, 'padding-top'))).toBe(pad);
    await expect(t).toHaveAttribute('aria-hidden', 'true');
    await expect(t).not.toHaveAttribute('tabindex');
    await expect(menu(page, 'group-titles').locator('tanrei-menu-group').first()).toHaveAttribute('aria-label', 'View');
    // It grows with enlarged text.
    const height = (await bounds(t)).height;
    await override(page, { '--tanrei-dial-type-base': '32px' });
    await expect.poll(async () => (await bounds(t)).height).toBeGreaterThan(height * 1.3);
  });

  test('MNU-29: a radio item outside a group, a value naming none, repeated values and a group in a group are drawn as the spec says and reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [
        inline('x', [
          radio('Loose', 'loose'),
          group({ title: 'Sort', value: 'nothing' }, [radio('A', 'a'), radio('B', 'b')]),
          group({ title: 'Twice', value: 'same' }, [radio('One', 'same'), radio('Two', 'same')]),
          group({ title: 'Outer', value: 'in' }, [group({ title: 'Inner' }, [radio('In', 'in')])]),
        ]),
      ],
    });
    await expect(item(page, 'x', 0)).toHaveAttribute('aria-checked', 'false');
    await expect(item(page, 'x', 1)).toHaveAttribute('aria-checked', 'false');
    await expect(item(page, 'x', 2)).toHaveAttribute('aria-checked', 'false');
    await expect(item(page, 'x', 3)).toHaveAttribute('aria-checked', 'true');
    await expect(item(page, 'x', 4)).toHaveAttribute('aria-checked', 'true');
    // The inner group's item is the outer group's: checked by the outer value, with no title or divider of its own.
    await expect(item(page, 'x', 5)).toHaveAttribute('aria-checked', 'true');
    const inner = menu(page, 'x').locator('tanrei-menu-group tanrei-menu-group');
    await expect(inner.locator('.title')).toHaveCount(0);
    await expect(inner).toHaveAttribute('role', 'none');
    await expect(menu(page, 'x').locator('.divider')).toHaveCount(3);
    await expect.poll(() => seen.filter((w) => w.includes('MNU-29')).length).toBe(4);
    expect(seen.join('\n')).toMatch(/"Loose" is not inside a group/);
    expect(seen.join('\n')).toMatch(/"Sort" has the value "nothing", which none of its radio items has/);
    expect(seen.join('\n')).toMatch(/two radio items of the group "Twice" share the value "same"/);
    expect(seen.join('\n')).toMatch(/the group "Inner" is inside another group/);
  });
});

test.describe('press, feedback, corners and focus style', () => {
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await acmeSystemCss();
  });
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec);
  });
  const pressed = (page: P, id: string, n: number) => row(page, id, n).getAttribute('data-pressed');

  test('MNU-15: a press that ends within a frame — Enter, Space, a click — is shown at once and for at least press-hold', async ({ page }) => {
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    expect(hold).toBe(100);
    for (const [name, activate] of [
      ['Enter', () => page.keyboard.press('Enter')],
      ['Space', () => page.keyboard.press('Space')],
      ['click', () => clickCentre(page, row(page, 'checkbox-unchecked', 1))],
    ] as const) {
      // The one fixture the press is made in, mounted afresh for each press (a press checks the item): the 34 fixtures,
      // three times, take seconds to mount in WebKit.
      await mountFixtures(page, spec, { fixtures: spec.fixtures.filter((f) => f.id === 'checkbox-unchecked') });
      await item(page, 'checkbox-unchecked', 1).focus();
      await row(page, 'checkbox-unchecked', 1).evaluate((el) => {
        const log: { down?: number; on?: number; off?: number; up?: number } = ((window as any).press = {});
        new MutationObserver(() => {
          if (el.hasAttribute('data-pressed')) log.on ??= performance.now();
          else if (log.on !== undefined) log.off ??= performance.now();
        }).observe(el, { attributes: true, attributeFilter: ['data-pressed'] });
        for (const type of ['pointerup', 'keyup']) window.addEventListener(type, () => (log.up ??= performance.now()), true);
        for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => (log.down ??= performance.now()), true);
      });
      // The press and the hold on the page's clock, held still: the press is over in no page time at all, so it is the
      // short one at the system's own hold, however long the driver takes to send the release.
      await heldPress(page, hold, activate, async () => (await page.evaluate(() => (window as any).press.off)) !== undefined, name);
      const log = await page.evaluate(() => (window as any).press);
      expect(log.up - log.on, name).toBeLessThan(hold);
      expect(log.off - log.down, name).toBeGreaterThanOrEqual(hold - 1);
    }
  });

  test('MNU-15: a press is never a selection of the rows’ text nor the start of a drag — a press held on a row after a drag across the rows, or inside a selection of the page that reaches across the menu, ends with the pointer', async ({ page }) => {
    await page.evaluate(() => {
      const seen: string[] = ((window as any).seen = []);
      for (const type of ['pointerdown', 'pointerup', 'pointercancel']) window.addEventListener(type, () => seen.push(type), true);
      // The drag an engine would begin, had the row not refused it.
      window.addEventListener('dragstart', (event) => seen.push(event.defaultPrevented ? 'dragstart:refused' : 'dragstart'));
    });
    const seen = () => page.evaluate(() => (window as any).seen.splice(0).join(' '));
    // An engine takes a press for a drag of the selected text only once it has been held: longer than its own delay.
    const HELD = 400;
    const heldPress = async (target: Locator) => {
      await target.hover();
      await page.mouse.down();
      await expect.poll(() => target.getAttribute('data-pressed')).toBe('overlay');
      await page.waitForTimeout(HELD);
      await page.mouse.move(0, 0, { steps: 4 });
      await page.mouse.up();
      await expect.poll(() => target.getAttribute('data-pressed')).toBeNull();
    };
    // A drag from one row across the others selects none of their text (WebKit selected it: `user-select` alone).
    await row(page, 'actions', 2).scrollIntoViewIfNeeded();
    const [from, to] = [await bounds(row(page, 'actions', 0).locator('.label')), await bounds(row(page, 'actions', 2))];
    await page.mouse.move(from.x + 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width - 4, to.y + to.height - 2, { steps: 6 });
    await page.mouse.up();
    expect(await page.evaluate(() => String(getSelection()))).toBe('');
    await seen();
    // So the next press held on a row is a press: it ends where the pointer ends it.
    await heldPress(row(page, 'actions', 0));
    expect(await seen()).toBe('pointerdown pointerup');
    // A selection of the page that reaches across the menu: the press held on a row inside it still ends, and no drag
    // of the text began.
    await page.locator('[data-fixture="actions"]').evaluate((el) => {
      el.insertAdjacentHTML('beforebegin', '<p id="before">Text of the page before the menu</p>');
      el.insertAdjacentHTML('afterend', '<p id="after">Text of the page after the menu</p>');
      const range = document.createRange();
      range.setStart(document.getElementById('before')!.firstChild!, 0);
      range.setEnd(document.getElementById('after')!.firstChild!, 4);
      getSelection()!.removeAllRanges();
      getSelection()!.addRange(range);
    });
    expect(await page.evaluate(() => String(getSelection()))).toMatch(/^Text of the page before the menu\s+Text$/);
    await heldPress(row(page, 'actions', 0));
    expect((await seen()).replace(' dragstart:refused', '')).toBe('pointerdown pointerup');
  });

  test('MNU-16: overlay (default), ripple (m3-like), dim (cupertino) and none each answer the press; an unknown name is the first', async ({ page }) => {
    // The one fixture it presses in: each mount is followed by two tokens set on the root, and WebKit restyles a page
    // of all the fixtures for seconds after each — five mounts of them take the test's thirty seconds on a busy machine.
    const actions = spec.fixtures.filter((f) => f.id === 'actions');
    const press = async (system?: string, feedback?: string) => {
      await mountFixtures(page, spec, { fixtures: actions, ...(system ? { system } : {}) });
      if (feedback) await override(page, { '--tanrei-sys-behavior-pressed-feedback': feedback });
      await override(page, { [T('unselected-pressed-label-color')]: 'rgb(0, 0, 255)' });
      const r = row(page, 'actions', 0);
      await r.hover();
      // The press starts from the hovered state at rest: its transition in has ended (a running one would go on through
      // the press, which changes neither the container color under a ripple nor anything under none).
      await expect.poll(() => settledCss(r, 'background-color')).toBe(await resolveColor(page, T('unselected-hovered-container-color')));
      const hovered = await css(r, 'background-color');
      await page.mouse.down();
      const result = {
        pressed: await pressed(page, 'actions', 0),
        bg: await css(r, 'background-color'),
        hovered,
        label: await css(r.locator('.label'), 'color'),
        ripple: await r.locator('.ripple').count(),
        opacity: await css(r, 'opacity'),
      };
      await page.mouse.move(0, 0);
      await page.mouse.up();
      return result;
    };
    const overlay$ = await press();
    expect(overlay$).toMatchObject({ pressed: 'overlay', ripple: 0, label: 'rgb(0, 0, 255)' });
    expect(overlay$.bg).toBe(await resolveColor(page, T('unselected-pressed-container-color')));
    const ripple = await press('m3-like');
    expect(ripple).toMatchObject({ pressed: 'ripple', ripple: 1, label: 'rgb(0, 0, 255)' });
    expect(ripple.bg).toBe(ripple.hovered);
    const dim = await press('cupertino');
    expect(dim).toMatchObject({ pressed: 'dim', ripple: 0, label: 'rgb(0, 0, 255)' });
    expect(dim.opacity).toBe(await token(page, T('pressed-opacity')));
    const none = await press(undefined, 'none');
    expect(none).toMatchObject({ pressed: 'none', ripple: 0 });
    expect(none.bg).toBe(none.hovered);
    expect((await press(undefined, 'sparkle')).pressed).toBe('overlay');
    // The ripple grows over the feedback duration and fades over the state duration; from the center for a key.
    await mountFixtures(page, spec, { system: 'm3-like' });
    await item(page, 'actions', 0).focus();
    await page.keyboard.down('Enter');
    const layer = await row(page, 'actions', 0).locator('.ripple').evaluate((el) => {
      const s = getComputedStyle(el);
      return { x: Number.parseFloat(el.style.getPropertyValue('--_x')) / el.getBoundingClientRect().width, grow: Number.parseFloat(s.animationDuration) * 1000, fade: Number.parseFloat(s.transitionDuration) * 1000 };
    });
    await page.keyboard.up('Enter');
    expect(layer.x).toBeCloseTo(0.5, 5);
    expect(layer.grow).toBe(await resolveToken(page, T('motion-feedback-duration'), 'duration'));
    expect(layer.fade).toBe(await resolveToken(page, T('motion-state-duration'), 'duration'));
  });

  test('MNU-17 corner smoothing and focus-style: cupertino eases the row’s corners, the ring concentric; acme shows focus as a glow inside the row', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'cupertino' });
    expect(await token(page, '--tanrei-sys-shape-corner-smoothing')).toBe('0.6');
    const shape = await resolveToken(page, T('container-shape'));
    const r = row(page, 'actions', 1);
    if (await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'))) {
      expect(Number.parseFloat((await css(r, 'corner-top-left-shape')).replace(/^superellipse\(|\)$/g, ''))).toBeCloseTo(Math.log2(2.6), 3);
      await expect.poll(async () => Number.parseFloat(await css(r, 'border-top-left-radius'))).toBeCloseTo(shape * 1.24, 2);
      await item(page, 'actions', 0).focus();
      await page.keyboard.press('ArrowDown');
      expect(await css(r, 'corner-top-left-shape', '::after')).toBe(await css(r, 'corner-top-left-shape'));
    } else expect(Number.parseFloat(await css(r, 'border-top-left-radius'))).toBe(shape);

    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() });
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('glow');
    await override(page, { '--tanrei-sys-focus-inner-width': '1px', '--tanrei-sys-color-focus-ring-inner': 'rgb(255, 255, 255)' });
    const outer = await resolveToken(page, '--tanrei-sys-focus-outer-width');
    await item(page, 'actions', 0).focus();
    await page.keyboard.press('ArrowDown');
    expect(await css(r, 'outline-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(r, 'box-shadow', '::after')).toBe(`rgb(255, 255, 255) 0px 0px 1px 1px, ${await resolveColor(page, '--tanrei-sys-color-focus-ring')} 0px 0px ${outer}px ${outer + 1}px`);
    expect(await css(r, 'top', '::after')).toBe(`${(1 + outer) * 2}px`);
    await expect(item(page, 'actions', 1)).toHaveAttribute('data-focus-style', 'glow');
  });
});

// ── Submenus (MNU-42 … MNU-52, and what MNU-5 … MNU-8, MNU-18, MNU-19 and MNU-24 say about them) ───────────────────

const FILE = [it('New'), sub('Open recent', [it('Report.pdf'), sub('More', [it('Older'), it('Oldest')]), it('Notes.txt')]), sub('Export', [it('PDF'), it('PNG')]), it('Save')];
/** Opens an overlay menu from its anchor with the keyboard: focus is on its first item, with the ring. */
const openMenu = async (page: P, id: string, first = 'New') => {
  await anchor(page, id).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => focused(page)).toBe(first);
  // The open motion scales the surface: its boxes are where they will stay once it has ended.
  await surface(page, id).evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished.catch(() => undefined))));
};
/** Presses `key` until the item called `label` has focus. */
const pressTo = async (page: P, label: string, key = 'ArrowDown') => {
  for (let presses = 0; presses < 12 && (await focused(page)) !== label; presses++) await page.keyboard.press(key);
  expect(await focused(page)).toBe(label);
};
const centre = async (locator: Locator) => {
  const b = await bounds(locator);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
const ownSurface = (host: Locator) => host.locator('> .surface');
/**
 * A tap at a point of the page, as a touch screen sends it to the element there (through shadow roots): the pointer
 * goes down and up with no move before it — touch has no hover — and the click follows the pointer's release at once.
 */
const tap = (page: P, x: number, y: number) =>
  page.evaluate(
    ([px, py]) => {
      let target: Element | null = document.elementFromPoint(px, py);
      for (let inner = target?.shadowRoot?.elementFromPoint(px, py); inner && inner !== target; inner = target.shadowRoot?.elementFromPoint(px, py)) target = inner;
      if (!target) throw new Error('nothing at the point');
      const init = { bubbles: true, composed: true, cancelable: true, clientX: px, clientY: py, pointerId: 7, pointerType: 'touch', isPrimary: true };
      target.dispatchEvent(new PointerEvent('pointerdown', init));
      target.dispatchEvent(new PointerEvent('pointerup', init));
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true, clientX: px, clientY: py }));
    },
    [x, y] as const,
  );
const DELAY = T('motion-submenu-delay');

test.describe('submenus', () => {
  // The acme fixture system is built once per worker, outside any test's budget: otherwise a test of this group that is
  // the first of its worker to ask for it pays the build out of its own 30 s.
  test.beforeAll(async () => {
    test.setTimeout(240_000);
    await acmeSystemCss();
  });
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 700 });
  });
  const mount = async (page: P, children: FixtureItem[] = FILE, options: Parameters<typeof mountFixtures>[2] = {}) => {
    await mountFixtures(page, spec, { fixtures: [overlay('file', children)], ...options });
    await page.addStyleTag({ content: `#a-file { position: fixed; top: 100px; left: 100px; }` });
    await wire(page);
  };
  const recent = (page: P) => labelled(page, 'file', 'Open recent');
  const more = (page: P) => labelled(page, 'file', 'More');
  const exported = (page: P) => labelled(page, 'file', 'Export');
  const ring = (host: Locator) => css(rowOf(host), 'outline-style');

  test('MNU-43: Enter, Space, the arrow to the inline end, a press and a tap open a submenu at once, close any other of its surface, move focus to its first enabled item — the ring only for a key — set open and emit toggle once, and close nothing else; an open one only takes focus; the product’s open moves no focus and emits nothing', async ({ page }) => {
    await mount(page);
    await openMenu(page, 'file');
    await pressTo(page, 'Open recent');
    // The arrow to the inline start does not open it.
    await page.keyboard.press('ArrowLeft');
    expect(await shown(recent(page))).toBe(false);
    for (const key of ['ArrowRight', 'Enter', 'Space']) {
      await page.keyboard.press(key);
      await expect.poll(() => shown(recent(page)), key).toBe(true);
      expect(await focused(page), key).toBe('Report.pdf');
      expect(await ring(labelled(page, 'file', 'Report.pdf')), key).toBe('solid');
      expect(await recent(page).evaluate((el: any) => el.open && el.hasAttribute('open')), key).toBe(true);
      // Already open: the same input moves focus to its first enabled item and emits nothing.
      await recent(page).focus();
      await page.keyboard.press(key);
      expect(await focused(page), key).toBe('Report.pdf');
      await page.keyboard.press('ArrowLeft');
      expect(await focused(page), key).toBe('Open recent');
      await expect.poll(() => shown(recent(page)), key).toBe(false);
    }
    const once = ['toggle:Open recent:true', 'toggle:Open recent:false'];
    expect(await log(page)).toEqual([...once, ...once, ...once]);
    expect(await isOpen(page, 'file')).toBe(true);
    // A press: open, focus inside without the ring; a press on the open one keeps it open.
    await rowOf(recent(page)).click();
    await expect.poll(() => shown(recent(page))).toBe(true);
    expect(await focused(page)).toBe('Report.pdf');
    expect(await ring(labelled(page, 'file', 'Report.pdf'))).toBe('none');
    await rowOf(recent(page)).click();
    expect(await shown(recent(page))).toBe(true);
    expect(await focused(page)).toBe('Report.pdf');
    // Another submenu of the same surface: the first closes.
    await rowOf(exported(page)).click();
    await expect.poll(() => shown(exported(page))).toBe(true);
    await expect.poll(() => shown(recent(page))).toBe(false);
    expect(await focused(page)).toBe('PDF');
    // A tap, as assistive technology and `click()` activate it.
    await recent(page).evaluate((el: HTMLElement) => el.click());
    await expect.poll(() => shown(recent(page))).toBe(true);
    expect((await log(page)).slice(6)).toEqual(['toggle:Open recent:true', 'toggle:Open recent:false', 'toggle:Export:true', 'toggle:Export:false', 'toggle:Open recent:true']);
    expect((await log(page)).filter((entry) => entry.startsWith('close'))).toEqual([]);
    // The product sets open: shown without moving focus and without a toggle.
    await page.keyboard.press('Escape');
    await page.evaluate(() => ((window as any).log.length = 0));
    await exported(page).evaluate((el: any) => (el.open = true));
    await expect.poll(() => shown(exported(page))).toBe(true);
    expect(await focused(page)).toBe('Open recent');
    expect(await log(page)).toEqual([]);
  });

  test('MNU-43: the first enabled item takes focus — the first item where none is enabled; in right-to-left the Left Arrow opens and the Right Arrow does not', async ({ page }) => {
    await mount(page, [sub('Some', [it('Off', { disabled: true }), it('On')]), sub('None', [it('A', { disabled: true }), it('B', { disabled: true })])]);
    await openMenu(page, 'file', 'Some');
    await page.keyboard.press('ArrowRight');
    expect(await focused(page)).toBe('On');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    expect(await focused(page)).toBe('A');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.locator('[data-fixture="file"]').evaluate((el) => el.setAttribute('dir', 'rtl'));
    await openMenu(page, 'file', 'Some');
    await page.keyboard.press('ArrowRight');
    expect(await focused(page)).toBe('Some');
    expect(await shown(labelled(page, 'file', 'Some'))).toBe(false);
    await page.keyboard.press('ArrowLeft');
    expect(await focused(page)).toBe('On');
    await expect.poll(() => shown(labelled(page, 'file', 'Some'))).toBe(true);
    // MNU-48: and the Right Arrow, which points to the inline start there, closes it.
    await page.keyboard.press('ArrowLeft');
    expect(await focused(page)).toBe('On');
    await page.keyboard.press('ArrowRight');
    expect(await focused(page)).toBe('Some');
    await expect.poll(() => shown(labelled(page, 'file', 'Some'))).toBe(false);
  });

  test('MNU-44: a pointer that rests on a submenu item for submenu-delay opens it, focus staying on the item; one that leaves sooner opens nothing; the delay applies where motion is reduced', async ({ page }) => {
    for (const reducedMotion of [false, true]) {
      await page.emulateMedia({ reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
      await mount(page);
      await override(page, { [DELAY]: '500ms' });
      await openMenu(page, 'file');
      // The delay runs on the page's clock, held still and moved on by the test: not at 499 ms, at 500.
      await holdClock(page);
      await rowOf(recent(page)).hover();
      expect(await focused(page)).toBe('Open recent');
      await page.clock.runFor(499);
      expect(await shown(recent(page)), `reduced motion ${reducedMotion}: not before the delay`).toBe(false);
      expect(await log(page)).toEqual([]);
      await page.clock.runFor(1);
      await expect.poll(() => shown(recent(page))).toBe(true);
      // Focus stays on the submenu item, and the arrow keys continue from it.
      expect(await focused(page)).toBe('Open recent');
      expect(await log(page)).toEqual(['toggle:Open recent:true']);
      // The pointer enters the submenu: focus follows it there.
      await releaseClock(page);
      await rowOf(labelled(page, 'file', 'Notes.txt')).hover();
      expect(await focused(page)).toBe('Notes.txt');
      // A pointer that crosses an item in less than the delay opens nothing.
      await rowOf(labelled(page, 'file', 'New')).hover();
      await expect.poll(() => shown(recent(page))).toBe(false);
      await holdClock(page);
      await rowOf(exported(page)).hover();
      await page.clock.runFor(499);
      await rowOf(labelled(page, 'file', 'Save')).hover();
      await page.clock.runFor(700);
      expect(await shown(exported(page))).toBe(false);
      expect((await log(page)).filter((entry) => entry.includes('Export'))).toEqual([]);
      await releaseClock(page);
    }
    // The token's own value is what is waited for.
    await mount(page);
    expect(await menu(page, 'file').evaluate((el) => Number.parseFloat(getComputedStyle(el.shadowRoot!.querySelector('.scroll')!).transitionDelay) * 1000)).toBe(await resolveToken(page, DELAY, 'duration'));
  });

  test('MNU-45: a pointer moving from a submenu item towards its submenu keeps it open and neither hovers nor focuses the items it crosses; straight down, the item below is hovered and the submenu closes; resting on the way ends it', async ({ page }) => {
    await mount(page);
    await override(page, { [DELAY]: '300ms' });
    await openMenu(page, 'file');
    const rest = await expected(page, 'unselected');
    const open = async () => {
      const from = await centre(rowOf(recent(page)));
      await page.mouse.move(from.x, from.y, { steps: 3 });
      await expect.poll(() => shown(recent(page))).toBe(true);
      return from;
    };
    const exportDrawn = () =>
      exported(page).evaluate((el) => {
        const r = getComputedStyle(el.shadowRoot!.querySelector('.row')!);
        return { bg: r.backgroundColor, label: getComputedStyle(el.shadowRoot!.querySelector('.label')!).color, opacity: r.opacity };
      });
    let from = await open();
    const parent = await bounds(surface(page, 'file'));
    const target = await surfaceBox(recent(page));
    // The far corner of the submenu, a little inside it: a straight line there crosses the item below.
    const corner = { x: target.x + target.width - 12, y: target.y + target.height - 12 };
    const crossing = { x: parent.x + parent.width - 8, y: from.y + ((corner.y - from.y) * (parent.x + parent.width - 8 - from.x)) / (corner.x - from.x) };
    const below = await bounds(rowOf(exported(page)));
    expect(crossing.y).toBeGreaterThan(below.y);
    expect(crossing.y).toBeLessThan(below.y + below.height);
    // The pause on the way runs on the page's clock, held still and moved on by the test.
    await holdClock(page);
    await page.mouse.move(crossing.x, crossing.y, { steps: 4 });
    await page.clock.runFor(299);
    // On the item below, and on its way: that item is neither hovered nor focused, and the submenu stays.
    expect(await exportDrawn()).toEqual(rest);
    expect(await focused(page)).toBe('Open recent');
    expect(await shown(recent(page))).toBe(true);
    await page.mouse.move(corner.x, corner.y, { steps: 6 });
    expect(await shown(recent(page))).toBe(true);
    expect(await focused(page)).toBe('Notes.txt');
    expect(await log(page)).toEqual(['toggle:Open recent:true']);
    // Resting on the way for the delay: the item under the pointer is treated as any hovered item, which closes the submenu.
    await releaseClock(page);
    from = await open();
    await holdClock(page);
    await page.mouse.move(crossing.x, crossing.y, { steps: 4 });
    await page.clock.runFor(299);
    expect(await shown(recent(page))).toBe(true);
    expect(await focused(page)).toBe('Open recent');
    await page.clock.runFor(1);
    await expect.poll(() => shown(recent(page))).toBe(false);
    expect(await focused(page)).toBe('Export');
    await expect.poll(() => exportDrawn()).not.toEqual(rest);
    // Straight down instead: out of the triangle at once.
    // The pointer now rests on Export, a submenu item itself: its submenu opens (MNU-44) — a delay after the pause
    // ended, not before. Escape closes that one.
    await page.clock.runFor(299);
    expect(await shown(exported(page))).toBe(false);
    await page.clock.runFor(1);
    await expect.poll(() => shown(exported(page))).toBe(true);
    await releaseClock(page);
    await page.keyboard.press('Escape');
    await expect.poll(() => shown(exported(page))).toBe(false);
    from = await open();
    await page.evaluate(() => ((window as any).log.length = 0));
    await page.mouse.move(from.x, below.y + below.height / 2, { steps: 4 });
    expect(await focused(page)).toBe('Export');
    await expect.poll(() => shown(recent(page))).toBe(false);
    expect((await log(page))[0]).toBe('toggle:Open recent:false');
  });

  test('MNU-45: the triangle follows the side the submenu is on — mirrored in a right-to-left layout', async ({ page }) => {
    await mount(page);
    await page.addStyleTag({ content: `#a-file { left: 600px; }` });
    await page.locator('[data-fixture="file"]').evaluate((el) => el.setAttribute('dir', 'rtl'));
    await override(page, { [DELAY]: '300ms' });
    await openMenu(page, 'file');
    const from = await centre(rowOf(recent(page)));
    await page.mouse.move(from.x, from.y, { steps: 3 });
    await expect.poll(() => shown(recent(page))).toBe(true);
    const parent = await bounds(surface(page, 'file'));
    const target = await surfaceBox(recent(page));
    expect(target.x + target.width).toBeLessThan(parent.x);
    const corner = { x: target.x + 12, y: target.y + target.height - 12 };
    const crossing = { x: parent.x + 8, y: from.y + ((corner.y - from.y) * (parent.x + 8 - from.x)) / (corner.x - from.x) };
    // The pause on the way runs on the page's clock, held still: one millisecond short of it, still on its way.
    await holdClock(page);
    await page.mouse.move(crossing.x, crossing.y, { steps: 4 });
    await page.clock.runFor(299);
    expect(await focused(page)).toBe('Open recent');
    await page.mouse.move(corner.x, corner.y, { steps: 6 });
    expect(await shown(recent(page))).toBe(true);
    expect(await focused(page)).toBe('Notes.txt');
  });

  test('MNU-46: a submenu is placed submenu.offset from the inline-end edge of the surface that holds its item, its first row level with the item’s row, above that surface; where only the inline start has room it goes there, and a submenu opened from it tries that side first; in right-to-left it opens to the left', async ({ page }) => {
    await mount(page);
    const offset = await resolveToken(page, T('submenu-offset'));
    const open = async () => {
      await openMenu(page, 'file');
      await pressTo(page, 'Open recent');
      await page.keyboard.press('ArrowRight');
      await pressTo(page, 'More');
      await page.keyboard.press('ArrowRight');
      await expect.poll(() => focused(page)).toBe('Older');
      await motionEnded(page); // the open motion
      return { root: await bounds(surface(page, 'file')), first: await surfaceBox(recent(page)), second: await surfaceBox(more(page)) };
    };
    const close = async () => {
      await menu(page, 'file').evaluate((el: any) => (el.open = false));
      await expect.poll(() => isOpen(page, 'file')).toBe(false);
    };
    let at = await open();
    expect(at.first.x).toBeCloseTo(at.root.x + at.root.width + offset, 0);
    expect(at.second.x).toBeCloseTo(at.first.x + at.first.width + offset, 0);
    // The first row of each submenu is level with its item's row.
    expect((await bounds(rowOf(labelled(page, 'file', 'Report.pdf')))).y).toBeCloseTo((await bounds(rowOf(recent(page)))).y, 0);
    expect((await bounds(rowOf(labelled(page, 'file', 'Older')))).y).toBeCloseTo((await bounds(rowOf(more(page)))).y, 0);
    // Above the surface it opened from: each is a popover of its own, opened after it.
    expect(await ownSurface(recent(page)).evaluate((el) => el.matches(':popover-open'))).toBe(true);
    const inside = { x: at.second.x + 6, y: at.second.y + 6 };
    expect(await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest('tanrei-submenu[label="More"]'), [inside.x, inside.y])).toBe(true);
    await close();
    // Room only at the inline start: the first submenu flips, and the second tries that side first although the other
    // side of its parent has room in the window (where it would cover the menu).
    await page.addStyleTag({ content: `#a-file { left: 800px; }` });
    at = await open();
    expect(at.first.x + at.first.width).toBeCloseTo(at.root.x - offset, 0);
    expect(at.second.x + at.second.width).toBeCloseTo(at.first.x - offset, 0);
    await close();
    // Right-to-left: the inline end is the left.
    await page.addStyleTag({ content: `#a-file { left: 600px; }` });
    await page.locator('[data-fixture="file"]').evaluate((el) => el.setAttribute('dir', 'rtl'));
    await openMenu(page, 'file');
    await pressTo(page, 'Open recent');
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => focused(page)).toBe('Report.pdf');
    await motionEnded(page);
    const [root, first] = [await bounds(surface(page, 'file')), await surfaceBox(recent(page))];
    expect(first.x + first.width).toBeCloseTo(root.x - offset, 0);
  });

  test('MNU-46: a submenu is shifted to stay within the viewport’s margin, limited to the room and scrolled beyond it, follows its item while it moves, and closes when its item is scrolled out of the visible part of its surface', async ({ page }) => {
    const many = Array.from({ length: 10 }, (_, n) => it(`Item ${n + 1}`));
    await mount(page, [sub('Open recent', many), ...many]);
    const margin = await resolveToken(page, T('surface-viewport-margin'));
    await page.setViewportSize({ width: 1000, height: 300 });
    await page.addStyleTag({ content: `#a-file { top: 8px; }` });
    await openMenu(page, 'file', 'Open recent');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => shown(recent(page))).toBe(true);
    await motionEnded(page);
    let own = await surfaceBox(recent(page));
    // Taller than the window: within the margin at both ends, its items scrolling.
    expect(own.y).toBeGreaterThanOrEqual(margin - 0.5);
    expect(own.y + own.height).toBeLessThanOrEqual(300 - margin + 0.5);
    expect(await recent(page).evaluate((el) => el.shadowRoot!.querySelector('.scroll')!.scrollHeight > el.shadowRoot!.querySelector('.scroll')!.clientHeight)).toBe(true);
    // It follows its item: the anchor moves, the menu follows it, and the submenu the menu.
    const before = own.x;
    await page.addStyleTag({ content: `#a-file { left: 300px; }` });
    await expect.poll(async () => (await surfaceBox(recent(page))).x).toBeCloseTo(before + 200, 0);
    // The menu's own items scroll: once the submenu's item is out of sight the submenu closes, focus going to its item.
    await page.evaluate(() => ((window as any).log.length = 0));
    await menu(page, 'file').evaluate((el) => el.shadowRoot!.querySelector('.scroll')!.scrollTo(0, 10_000));
    await expect.poll(() => shown(recent(page))).toBe(false);
    expect(await log(page)).toEqual(['toggle:Open recent:false']);
    expect(await focused(page)).toBe('Open recent');
    // Shifted along the block axis: a short submenu opened from the last row of a tall window stays inside it.
    await page.setViewportSize({ width: 1000, height: 700 });
    await mount(page, [...many, sub('Last', [it('One'), it('Two'), it('Three'), it('Four')])]);
    await page.addStyleTag({ content: `#a-file { top: 150px; }` });
    await openMenu(page, 'file', 'Item 1');
    await page.keyboard.press('End');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => focused(page)).toBe('One');
    await motionEnded(page);
    own = await surfaceBox(labelled(page, 'file', 'Last'));
    expect(own.y + own.height).toBeCloseTo(700 - margin, 0);
    expect((await bounds(rowOf(labelled(page, 'file', 'One')))).y).toBeLessThan((await bounds(rowOf(labelled(page, 'file', 'Last')))).y);
  });

  test('MNU-46: placed again as its item moves or the window resizes, a scrolled submenu keeps its offset', async ({ page }) => {
    const many = Array.from({ length: 16 }, (_, n) => it(`Item ${n + 1}`));
    await mount(page, [sub('Open recent', many), it('Close')]);
    await page.setViewportSize({ width: 1000, height: 300 });
    await page.addStyleTag({ content: `#a-file { top: 8px; }` });
    await openMenu(page, 'file', 'Open recent');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => shown(recent(page))).toBe(true);
    await motionEnded(page);
    const scroll = recent(page).locator('.scroll');
    // Down to the tenth item, which scrolls the submenu's list; back up two, which leaves it there.
    for (let n = 0; n < 9; n++) await page.keyboard.press('ArrowDown');
    await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    expect(await focused(page)).toBe('Item 8');
    const scrolled = await scroll.evaluate((el) => el.scrollTop);
    expect(scrolled).toBeGreaterThan(0);
    // Its item moves with the menu: the submenu follows, placed again. Measured uncapped, its list would not scroll and
    // the browser would put it back at its top.
    const left = (await surfaceBox(recent(page))).x;
    await page.addStyleTag({ content: `#a-file { left: 300px; }` });
    await expect.poll(async () => (await surfaceBox(recent(page))).x).not.toBeCloseTo(left, 0);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    expect(await scroll.evaluate((el) => el.scrollTop)).toBe(scrolled);
    // The window shrinks: capped to less room, the list stays where it was.
    const height = (await surfaceBox(recent(page))).height;
    await page.setViewportSize({ width: 1000, height: 280 });
    await expect.poll(async () => (await surfaceBox(recent(page))).height).toBeCloseTo(height - 20, 1);
    expect(await scroll.evaluate((el) => el.scrollTop)).toBe(scrolled);
    expect(await focused(page)).toBe('Item 8');
  });

  test('MNU-3: in a window narrower than the minimum width and its margins — twice the text size, 320 wide — the window bounds the minimum too: the menu’s surface and a submenu’s are the window less comp.menu.surface.viewport-margin on each side, end inside it, and nothing scrolls sideways', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await mountFixtures(page, spec, { fixtures: [overlay('file', [it('New'), sub('Open recent', [it('Report.pdf'), it('Notes.txt')]), it('Save')])] });
    await wire(page);
    // Twice the text size: the minimum width is a length of the text's, and is now wider than the window.
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    const [margin, min] = [await resolveToken(page, T('surface-viewport-margin')), await resolveToken(page, T('surface-min-width'))];
    expect(min).toBeGreaterThan(320 - 2 * margin);
    await openMenu(page, 'file');
    await motionEnded(page);
    const root = await bounds(surface(page, 'file'));
    expect(root.x).toBeCloseTo(margin, 0);
    expect(root.width).toBeCloseTo(320 - 2 * margin, 0);
    expect(root.x + root.width).toBeLessThanOrEqual(320 - margin + 0.5);
    // A submenu's surface is the same surface: laid over its parent (MNU-47), inside the same margins.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => focused(page)).toBe('Report.pdf');
    await motionEnded(page);
    const own = await surfaceBox(labelled(page, 'file', 'Open recent'));
    expect(own.x).toBeGreaterThanOrEqual(margin - 0.5);
    expect(own.x + own.width).toBeLessThanOrEqual(320 - margin + 0.5);
    expect(own.width).toBeLessThanOrEqual(320 - 2 * margin + 0.5);
    // No item is cut: each row ends inside its surface.
    for (const label of ['Report.pdf', 'Notes.txt']) {
      const r = await bounds(rowOf(labelled(page, 'file', label)));
      expect(r.x + r.width, label).toBeLessThanOrEqual(own.x + own.width + 0.5);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    // In a window with room the minimum is the token again.
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect.poll(() => isOpen(page, 'file')).toBe(false);
    await page.setViewportSize({ width: 1000, height: 700 });
    await openMenu(page, 'file');
    await motionEnded(page);
    expect((await bounds(surface(page, 'file'))).width).toBeCloseTo(min, 0);
  });

  test('MNU-47: in a window 360 wide the submenu is laid over its parent, never swapped in for it, at least sys.target.touch of the parent uncovered; a press there closes the submenu only and activates nothing, the next one acts; the keys work as in a wide window', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    const wide = 'A label long enough to make this menu wide';
    await mountFixtures(page, spec, { fixtures: [overlay('file', [it(wide), sub('Open recent', [it('Report.pdf'), it('Notes.txt')]), sub('Archive', [it('A file whose name is long enough to need all the room there is.pdf')])])] });
    await wire(page);
    const [margin, min, touch] = [await resolveToken(page, T('surface-viewport-margin')), await resolveToken(page, T('surface-min-width')), await resolveToken(page, '--tanrei-sys-target-touch')];
    await openMenu(page, 'file', wide);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => focused(page)).toBe('Report.pdf');
    await motionEnded(page);
    const root = await bounds(surface(page, 'file'));
    let own = await surfaceBox(recent(page));
    // Neither side has room for it at the minimum width: it overlaps, on the side with more room, against the margin.
    expect(360 - margin - (root.x + root.width)).toBeLessThan(min);
    expect(own.x).toBeLessThan(root.x + root.width);
    expect(own.x + own.width).toBeCloseTo(360 - margin, 0);
    expect(own.width).toBeGreaterThanOrEqual(min - 0.5);
    expect(own.x - root.x).toBeGreaterThanOrEqual(touch - 0.5);
    // The parent's items are still there, under and beside it: nothing was swapped in.
    await expect(rowOf(labelled(page, 'file', wide))).toBeVisible();
    expect(await isOpen(page, 'file')).toBe(true);
    // The keys, as in a wide window.
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('Notes.txt');
    await page.keyboard.press('ArrowLeft');
    expect(await focused(page)).toBe('Open recent');
    await expect.poll(() => shown(recent(page))).toBe(false);
    await page.keyboard.press('Enter');
    await expect.poll(() => shown(recent(page))).toBe(true);
    await page.evaluate(() => ((window as any).log.length = 0));
    // A tap on what is left of the parent — here on another item — closes the submenu and does not activate the item.
    const first = await bounds(rowOf(labelled(page, 'file', wide)));
    await tap(page, root.x + touch / 2, first.y + first.height / 2);
    await expect.poll(() => shown(recent(page))).toBe(false);
    expect(await log(page)).toEqual(['toggle:Open recent:false']);
    expect(await isOpen(page, 'file')).toBe(true);
    expect(await focused(page)).toBe('Open recent');
    expect(await css(rowOf(recent(page)), 'outline-style')).toBe('none');
    // A second tap acts on the item.
    await tap(page, root.x + touch / 2, first.y + first.height / 2);
    expect(await log(page)).toEqual(['toggle:Open recent:false', `click:${wide}`, 'close:item']);
    await expect.poll(() => isOpen(page, 'file')).toBe(false);
    // A pointer that can hover gets there by MNU-48 instead: moving onto another item of the parent closes the submenu.
    await openMenu(page, 'file', wide);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect.poll(() => shown(recent(page))).toBe(true);
    await page.mouse.move(root.x + touch / 2, first.y + first.height / 2, { steps: 2 });
    await expect.poll(() => shown(recent(page))).toBe(false);
    await page.keyboard.press('Escape');
    await expect.poll(() => isOpen(page, 'file')).toBe(false);
    // A submenu wider than what the parent can spare is narrowed — not below the minimum — so that the touch target stays.
    await openMenu(page, 'file', wide);
    await page.keyboard.press('End');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => shown(labelled(page, 'file', 'Archive'))).toBe(true);
    await motionEnded(page);
    own = await surfaceBox(labelled(page, 'file', 'Archive'));
    expect(own.x - root.x).toBeCloseTo(touch, 0);
    expect(own.x + own.width).toBeCloseTo(360 - margin, 0);
    expect(own.width).toBeGreaterThan(min);
  });

  test('MNU-48: the arrow to the inline start and Escape close the submenu that holds focus and every submenu opened from it, nothing else, return focus to its item with the ring and emit its toggle, never close; Escape three times closes the inner submenu, the outer one and the menu', async ({ page }) => {
    await mount(page);
    const both = async () => {
      await openMenu(page, 'file');
      await pressTo(page, 'Open recent');
      await page.keyboard.press('ArrowRight');
      await pressTo(page, 'More');
      await page.keyboard.press('ArrowRight');
      await expect.poll(() => focused(page)).toBe('Older');
      await page.evaluate(() => ((window as any).log.length = 0));
    };
    await both();
    await page.keyboard.press('Escape');
    expect(await focused(page)).toBe('More');
    expect(await ring(more(page))).toBe('solid');
    await expect.poll(() => shown(more(page))).toBe(false);
    expect(await shown(recent(page))).toBe(true);
    expect(await more(page).evaluate((el: any) => el.open)).toBe(false);
    await page.keyboard.press('Escape');
    expect(await focused(page)).toBe('Open recent');
    await expect.poll(() => shown(recent(page))).toBe(false);
    expect(await isOpen(page, 'file')).toBe(true);
    await page.keyboard.press('Escape');
    await expect.poll(() => isOpen(page, 'file')).toBe(false);
    expect(await focused(page)).toBe('a-file');
    expect(await log(page)).toEqual(['toggle:More:false', 'toggle:Open recent:false', 'close:escape']);
    // The arrow to the inline start, one level for each press; in the menu's own surface it closes nothing.
    await both();
    await page.keyboard.press('ArrowLeft');
    expect(await focused(page)).toBe('More');
    await page.keyboard.press('ArrowLeft');
    expect(await focused(page)).toBe('Open recent');
    await page.keyboard.press('ArrowLeft');
    expect(await isOpen(page, 'file')).toBe(true);
    expect(await log(page)).toEqual(['toggle:More:false', 'toggle:Open recent:false']);
    // From the outer submenu with the inner one open: both close, the inner first.
    await page.keyboard.press('ArrowRight');
    await pressTo(page, 'More');
    await more(page).evaluate((el: any) => (el.open = true)); // the product's: no focus move, no toggle
    await expect.poll(() => shown(more(page))).toBe(true);
    await page.evaluate(() => ((window as any).log.length = 0));
    await page.keyboard.press('Escape');
    expect(await focused(page)).toBe('Open recent');
    await expect.poll(() => shown(recent(page))).toBe(false);
    expect(await shown(more(page))).toBe(false);
    expect(await log(page)).toEqual(['toggle:More:false', 'toggle:Open recent:false']);
  });

  test('MNU-48: focus or hover moving to another item of the surface closes the submenu; the product’s open=false closes it without a toggle, focus that was inside going to its item; a removed or disabled item’s submenu closes; at most one is open in a surface', async ({ page }) => {
    await mount(page);
    await override(page, { [DELAY]: '50ms' });
    await openMenu(page, 'file');
    // Opened by a resting pointer, focus on its item: the Down Arrow moves focus on and closes it.
    await rowOf(recent(page)).hover();
    await expect.poll(() => shown(recent(page))).toBe(true);
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('Export');
    await expect.poll(() => shown(recent(page))).toBe(false);
    expect(await log(page)).toEqual(['toggle:Open recent:true', 'toggle:Open recent:false']);
    // Hover onto another item.
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => shown(exported(page))).toBe(true);
    await rowOf(labelled(page, 'file', 'New')).hover();
    await expect.poll(() => shown(exported(page))).toBe(false);
    expect(await focused(page)).toBe('New');
    // The product closes it: no toggle, and focus that was inside moves to its item.
    await pressTo(page, 'Open recent');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => focused(page)).toBe('Report.pdf');
    await page.evaluate(() => ((window as any).log.length = 0));
    await recent(page).evaluate((el: any) => (el.open = false));
    await expect.poll(() => shown(recent(page))).toBe(false);
    expect(await focused(page)).toBe('Open recent');
    expect(await log(page)).toEqual([]);
    // The product opens two in one surface: the one opened last stays.
    await recent(page).evaluate((el: any) => (el.open = true));
    await expect.poll(() => shown(recent(page))).toBe(true);
    await exported(page).evaluate((el: any) => (el.open = true));
    await expect.poll(() => shown(exported(page))).toBe(true);
    await expect.poll(() => shown(recent(page))).toBe(false);
    expect(await recent(page).evaluate((el: any) => el.open)).toBe(false);
    expect(await log(page)).toEqual([]);
    // Removed with focus inside: nothing is left shown, and the menu is still open.
    await page.keyboard.press('ArrowDown'); // focus → Export, which is open
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => focused(page)).toBe('PDF');
    await exported(page).evaluate((el) => el.remove());
    await expect(menu(page, 'file').locator('tanrei-submenu[label="Export"]')).toHaveCount(0);
    expect(await isOpen(page, 'file')).toBe(true);
  });

  test('MNU-49: with two levels open, a press outside, Tab and an action in the innermost submenu each emit close once, with the reasons outside, tab and item, and leave no surface shown, every submenu’s open false without a toggle; a press inside any surface is not a press outside, and focus moving between surfaces is not focus leaving', async ({ page }) => {
    const both = async () => {
      await mount(page);
      await page.evaluate(() => {
        const after = Object.assign(document.createElement('button'), { id: 'after', textContent: 'After' });
        after.style.cssText = 'position: fixed; inset-inline-end: 8px; inset-block-end: 8px;';
        document.querySelector('[data-fixture="file"]')!.after(after);
      });
      await openMenu(page, 'file');
      await pressTo(page, 'Open recent');
      await page.keyboard.press('ArrowRight');
      await pressTo(page, 'More');
      await page.keyboard.press('ArrowRight');
      await expect.poll(() => focused(page)).toBe('Older');
      await motionEnded(page);
      await page.evaluate(() => ((window as any).log.length = 0));
    };
    const allClosed = async () => {
      await expect.poll(() => isOpen(page, 'file')).toBe(false);
      await expect.poll(() => shown(recent(page))).toBe(false);
      await expect.poll(() => shown(more(page))).toBe(false);
      expect(await menu(page, 'file').evaluate((el) => [...el.querySelectorAll<any>('tanrei-submenu')].map((each) => each.open || each.hasAttribute('open')))).toEqual([false, false, false]);
    };
    // A press inside a submenu's surface, beside its items, is inside the menu; so is focus moving between the levels.
    await both();
    const inner = await surfaceBox(more(page));
    await page.mouse.click(inner.x + inner.width / 2, inner.y + 2); // in its padding, clear of its rounded corners
    await rowOf(labelled(page, 'file', 'Report.pdf')).hover();
    expect(await focused(page)).toBe('Report.pdf');
    expect((await log(page)).filter((entry) => entry.startsWith('close'))).toEqual([]);
    expect(await isOpen(page, 'file')).toBe(true);
    // A press outside.
    await both();
    await page.mouse.click(600, 600);
    expect(await log(page)).toEqual(['close:outside']);
    await allClosed();
    // Tab, from the innermost level: focus moves on from the anchor.
    await both();
    await tab(page);
    expect(await log(page)).toEqual(['close:tab']);
    expect(await focused(page)).toBe('after');
    await allClosed();
    // An action in the innermost submenu: its click, then one close; focus returns to the anchor, not to a submenu item.
    await both();
    await page.keyboard.press('Enter');
    expect(await log(page)).toEqual(['click:Older', 'close:item']);
    expect(await focused(page)).toBe('a-file');
    await allClosed();
    // Focus leaving every surface.
    await both();
    await page.locator('#after').evaluate((el) => (el as HTMLElement).focus());
    expect(await log(page)).toEqual(['close:focus-out']);
    await allClosed();
    // The product closes the menu: the same, and no event at all.
    await both();
    await menu(page, 'file').evaluate((el: any) => (el.open = false));
    await allClosed();
    expect(await log(page)).toEqual([]);
    expect(await focused(page)).toBe('a-file');
  });

  test('MNU-49: the surfaces fade out together', async ({ page }) => {
    await mount(page);
    // (40 s: the submenu is read 'still fading out' four answers after the menu is told to close; nothing waits for its end.)
    await override(page, { [T('motion-close-duration')]: '40s' });
    await openMenu(page, 'file');
    await pressTo(page, 'Open recent');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => shown(recent(page))).toBe(true);
    await motionEnded(page);
    await menu(page, 'file').evaluate((el: any) => (el.open = false));
    expect(await css(surface(page, 'file'), 'animation-name')).toBe('menu-close');
    expect(await css(ownSurface(recent(page)), 'animation-name')).toBe('submenu-close');
    expect(await css(ownSurface(recent(page)), 'animation-duration')).toBe('40s');
    expect(await ownSurface(recent(page)).evaluate((el) => el.matches(':popover-open'))).toBe(true); // still fading out
  });

  test('MNU-50: while its submenu is open a submenu item is drawn in the expanded condition, whatever state it is in; the submenu’s surface is drawn from the menu’s surface tokens and grows in from the edge that faces its item', async ({ page }) => {
    await mount(page);
    // (20 s, once the menu itself has grown in — `openMenu` waits for that: the submenu's surface is read growing in five
    // answers after the key that opens it, and at 2 s it had grown in where an answer takes a slow runner half a second.)
    await openMenu(page, 'file');
    await override(page, { [T('motion-open-duration')]: '20s' });
    await pressTo(page, 'Open recent');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => shown(recent(page))).toBe(true);
    const own = ownSurface(recent(page));
    expect(await css(own, 'animation-name')).toBe('submenu-open');
    expect(await css(own, 'animation-duration')).toBe('20s');
    expect(await css(own, 'transform-origin')).toMatch(/^0px /); // the left edge, which faces the item
    expect(Number(await css(own, 'opacity'))).toBeLessThan(1);
    // The surface, as the menu's own (MNU-3).
    expect(await css(own, 'background-color')).toBe(await resolveColor(page, T('surface-color')));
    expect(await css(own, 'box-shadow')).toBe(await resolveShadow(page, T('surface-elevation')));
    expect(Number.parseFloat(await css(own, 'border-top-left-radius'))).toBe(await resolveToken(page, T('surface-shape')));
    expect(Number.parseFloat(await css(own, 'min-width'))).toBe(await resolveToken(page, T('surface-min-width')));
    // Its item: expanded, with focus and the pointer elsewhere.
    const drawnItem = () =>
      recent(page).evaluate((el) => {
        const r = getComputedStyle(el.shadowRoot!.querySelector('.row')!);
        return { bg: r.backgroundColor, label: getComputedStyle(el.shadowRoot!.querySelector('.label')!).color, opacity: r.opacity };
      });
    await page.mouse.move(900, 600);
    await expect.poll(drawnItem).toEqual(await expected(page, 'expanded'));
    expect((await expected(page, 'expanded')).bg).not.toBe((await expected(page, 'unselected')).bg);
    // Flipped to the left, it grows from its right edge.
    await menu(page, 'file').evaluate((el: any) => (el.open = false));
    await page.addStyleTag({ content: `#a-file { left: 800px; }` });
    await override(page, { [T('motion-open-duration')]: '' });
    await openMenu(page, 'file');
    await override(page, { [T('motion-open-duration')]: '20s' });
    await pressTo(page, 'Open recent');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => shown(recent(page))).toBe(true);
    const width = (await surfaceBox(recent(page))).width;
    expect(await own.evaluate((el) => el.classList.contains('side-left'))).toBe(true);
    expect(Number.parseFloat(await css(own, 'transform-origin'))).toBeGreaterThan(width / 2);
    // Where motion is reduced, at once.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(own, 'animation-name')).toBe('none');
  });

  test('MNU-50: over the sheet the open item’s fill is the color of a hovered plain row, with the pointer elsewhere and with the pointer on it, in light and in dark; under keyboard focus and under a press it takes the plain row’s focused and pressed colors; it is never the color of the current link item’s row', async ({ page }) => {
    const fixtures = spec.fixtures.filter((fixture) => ['actions', 'links-current', 'submenu-open'].includes(fixture.id));
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true, fixtures });
      const host = labelled(page, 'submenu-open', 'Open recent');
      const open = rowOf(host);
      await page.mouse.move(0, 0);
      await expect(open).toHaveClass(/expanded/);
      // With no pointer on it: the hover layer over the sheet — what a plain row is under the pointer.
      const sheet = await paintedIn(page, row(page, 'actions', 1));
      const fill = await paintedIn(page, open);
      await row(page, 'actions', 0).hover();
      const plainHovered = await paintedIn(page, row(page, 'actions', 0));
      expect(sameColor(fill, plainHovered), `${theme}: ${fill} and ${plainHovered}`).toBe(true);
      expect(contrast(fill, sheet), theme).toBeGreaterThanOrEqual(1.1);
      // With the pointer on it: the same color, so the open item looks as it did under the pointer that opened it.
      await open.hover();
      await expect(open).toHaveClass(/expanded/);
      expect(sameColor(await paintedIn(page, open), fill), theme).toBe(true);
      expect(await settledCss(open, 'background-color'), theme).toBe(await resolveColor(page, T('expanded-hovered-container-color')));
      // Never the color of the row the person is on (the one filled row at rest, MNU-58): that one is a step stronger.
      await page.mouse.move(0, 0);
      const current = await paintedIn(page, row(page, 'links-current', 1));
      expect(contrast(current, fill), theme).toBeGreaterThanOrEqual(1.1);
      expect(contrast(current, sheet), theme).toBeGreaterThan(contrast(fill, sheet));
      // Under a press, and under keyboard focus: the plain row's pressed and focused colors, as they are painted.
      await open.hover();
      await page.mouse.down();
      await expect.poll(() => settledCss(open, 'background-color'), theme).toBe(await resolveColor(page, T('expanded-pressed-container-color')));
      const pressed = await paintedIn(page, open);
      await page.mouse.move(0, 0);
      await page.mouse.up();
      await row(page, 'actions', 0).hover();
      await page.mouse.down();
      await expect.poll(() => settledCss(row(page, 'actions', 0), 'background-color'), theme).toBe(await resolveColor(page, T('unselected-pressed-container-color')));
      expect(sameColor(await paintedIn(page, row(page, 'actions', 0)), pressed), `${theme} pressed`).toBe(true);
      await page.mouse.move(0, 0);
      await page.mouse.up();
      // Keyboard focus on the item (which closes its submenu, MNU-48), and the product opens it again: expanded and focused.
      await item(page, 'submenu-open', 0).focus();
      await page.keyboard.press('ArrowDown');
      await host.evaluate((el: any) => (el.open = true));
      await expect(open).toHaveClass(/expanded/);
      await expect.poll(() => settledCss(open, 'background-color'), theme).toBe(await resolveColor(page, T('expanded-focused-container-color')));
      const focused = await paintedIn(page, open);
      await item(page, 'actions', 0).focus();
      await page.keyboard.press('ArrowDown');
      await expect.poll(() => settledCss(row(page, 'actions', 1), 'background-color'), theme).toBe(await resolveColor(page, T('unselected-focused-container-color')));
      expect(sameColor(await paintedIn(page, row(page, 'actions', 1)), focused), `${theme} focused`).toBe(true);
    }
  });

  test('MNU-50: under acme, which values the states apart, the open item keeps its fill under the pointer and is drawn from the expanded tokens of its state under keyboard focus', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() });
    const host = labelled(page, 'submenu-open', 'Open recent');
    const bg = () => settledCss(rowOf(host), 'background-color');
    const [rest, hovered, focus, down] = await Promise.all(['', 'hovered-', 'focused-', 'pressed-'].map((state) => resolveColor(page, T(`expanded-${state}container-color`))));
    // The open item under the pointer is the open item: one color. Focused and pressed are each their own.
    expect(hovered).toBe(rest);
    expect(new Set([rest, focus, down]).size).toBe(3);
    expect(rest).not.toBe(await resolveColor(page, T('unselected-container-color')));
    await page.mouse.move(0, 0);
    await expect.poll(bg).toBe(rest);
    await rowOf(host).hover();
    expect(await bg()).toBe(rest);
    await page.mouse.move(0, 0);
    // Keyboard focus on the item (which closes its submenu, MNU-48), and the product opens it again: expanded and focused.
    await item(page, 'submenu-open', 0).focus();
    await page.keyboard.press('ArrowDown');
    await host.evaluate((el: any) => (el.open = true));
    await expect(rowOf(host)).toHaveClass(/expanded/);
    await expect.poll(bg).toBe(focus);
    // Its submenu's items follow every behaviour of the menu's: hovered, from the hovered tokens.
    const inner = labelled(page, 'submenu-open', 'Budget.xlsx');
    await rowOf(inner).hover();
    await expect.poll(() => css(rowOf(inner), 'background-color')).toBe(await resolveColor(page, T('unselected-hovered-container-color')));
  });

  test('MNU-51: the arrow to the inline end on an item that is not a submenu item, and the arrow to the inline start in the menu’s own surface, do nothing and are not passed on to what is behind the menu; a disabled submenu item opens by no input, closes if it is open, and still says it opens a menu', async ({ page }) => {
    await mount(page, [it('New'), sub('Open recent', [it('Report.pdf')], { disabled: true }), sub('Export', [it('PDF')])]);
    await page.evaluate(() => {
      (window as any).reached = [];
      document.addEventListener('keydown', (event) => (window as any).reached.push(`${event.key}:${event.defaultPrevented}`));
    });
    await override(page, { [DELAY]: '50ms' });
    await openMenu(page, 'file');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    expect(await focused(page)).toBe('New');
    expect(await isOpen(page, 'file')).toBe(true);
    await page.keyboard.press('ArrowDown');
    // The disabled submenu item is reached, and no input opens it.
    expect(await focused(page)).toBe('Open recent');
    for (const key of ['ArrowRight', 'Enter', 'Space']) await page.keyboard.press(key);
    await rowOf(recent(page)).click({ force: true });
    await rowOf(recent(page)).hover({ force: true });
    await page.waitForTimeout(250);
    await recent(page).evaluate((el: HTMLElement) => el.click());
    expect(await shown(recent(page))).toBe(false);
    expect(await log(page)).toEqual([]);
    expect(await page.evaluate(() => (window as any).reached.filter((entry: string) => entry.startsWith('Arrow')))).toEqual([]);
    await expect(recent(page)).toHaveAttribute('aria-haspopup', 'menu');
    await expect(recent(page)).toHaveAttribute('aria-disabled', 'true');
    await expect(recent(page)).toHaveAttribute('aria-expanded', 'false');
    // Disabled while open: it closes, focus that was inside going to its item.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => focused(page)).toBe('PDF');
    await exported(page).evaluate((el: any) => (el.disabled = true));
    await expect.poll(() => shown(exported(page))).toBe(false);
    expect(await exported(page).evaluate((el: any) => el.open)).toBe(false);
    expect(await focused(page)).toBe('Export');
    // Even where the product says open.
    await exported(page).evaluate(async (el: any) => {
      el.open = true;
      await el.updateComplete;
    });
    await motionEnded(page);
    expect(await shown(exported(page))).toBe(false);
  });

  test('MNU-52: a submenu holds items of every kind, groups and further submenus included; its radio items are its own surface’s; a third level works and a debug build reports it; a submenu without items draws its row, takes focus, opens nothing and is reported; open on an item whose surface is not shown shows nothing until it is', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      group({ title: 'Sort', value: 'a' }, [
        radio('A', 'a'),
        sub('Inner', [radio('Loose A', 'a'), group({ value: 'b' }, [radio('B', 'b'), cb('Check', { checked: true })]), sub('Deeper', [sub('Deepest', [it('Bottom')]), sub('Shown later', [it('Late')], { open: true })])]),
      ]),
      sub('Empty', []),
    ]);
    await openMenu(page, 'file', 'A');
    // The group's value reaches only the radio items of its own surface.
    await expect(labelled(page, 'file', 'A')).toHaveAttribute('aria-checked', 'true');
    await expect(labelled(page, 'file', 'Loose A')).toHaveAttribute('aria-checked', 'false');
    await expect(labelled(page, 'file', 'B')).toHaveAttribute('aria-checked', 'true');
    // Each surface counts its own items.
    await expect(labelled(page, 'file', 'A')).toHaveAttribute('aria-setsize', '3');
    await expect(labelled(page, 'file', 'B')).toHaveAttribute('aria-setsize', '4');
    // open on an item whose own surface is not shown: nothing, until that surface is shown.
    const later = labelled(page, 'file', 'Shown later');
    expect(await later.evaluate((el: any) => el.open)).toBe(true);
    expect(await shown(later)).toBe(false);
    // Down three levels with the keyboard, and back.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    expect(await focused(page)).toBe('Loose A');
    await page.keyboard.press('End');
    await page.keyboard.press('ArrowRight');
    expect(await focused(page)).toBe('Deepest');
    await expect.poll(() => shown(later)).toBe(true);
    await page.keyboard.press('ArrowRight');
    expect(await focused(page)).toBe('Bottom');
    // Opening Deepest closed the other submenu of its surface.
    await expect.poll(() => shown(later)).toBe(false);
    await page.keyboard.press('Enter');
    expect((await log(page)).slice(-2)).toEqual(['click:Bottom', 'close:item']);
    await expect.poll(() => seen.filter((w) => w.includes('MNU-52') && w.includes('3 levels below the menu')).length).toBe(2);
    // The submenu without items.
    await openMenu(page, 'file', 'A');
    await page.keyboard.press('End');
    expect(await focused(page)).toBe('Empty');
    const empty = labelled(page, 'file', 'Empty');
    await expect(rowOf(empty).locator('.submenu-indicator')).toHaveCount(1);
    await page.evaluate(() => ((window as any).log.length = 0));
    for (const key of ['ArrowRight', 'Enter', 'Space']) await page.keyboard.press(key);
    await rowOf(empty).click();
    expect(await shown(empty)).toBe(false);
    expect(await focused(page)).toBe('Empty');
    expect(await log(page)).toEqual([]);
    expect(await isOpen(page, 'file')).toBe(true);
    expect(seen.join('\n')).toMatch(/the submenu "Empty" holds no item, so it opens nothing; give it items or remove it \(MNU-52\)/);
  });

  test('MNU-5: Escape closes the menu only while no submenu is open — the innermost open one first, also where focus is on its item; Tab at any level closes everything and moves on from the anchor', async ({ page }) => {
    await mount(page);
    await override(page, { [DELAY]: '50ms' });
    await page.evaluate(() => {
      const after = Object.assign(document.createElement('button'), { id: 'after', textContent: 'After' });
      document.querySelector('[data-fixture="file"]')!.after(after);
    });
    await openMenu(page, 'file');
    // Open from a resting pointer: focus is on the item, in the menu's own surface. Escape closes the submenu, not the menu.
    await rowOf(recent(page)).hover();
    await expect.poll(() => shown(recent(page))).toBe(true);
    await page.mouse.move(900, 650);
    await page.keyboard.press('Escape');
    await expect.poll(() => shown(recent(page))).toBe(false);
    expect(await isOpen(page, 'file')).toBe(true);
    expect(await focused(page)).toBe('Open recent');
    await page.keyboard.press('Escape');
    await expect.poll(() => isOpen(page, 'file')).toBe(false);
    expect(await log(page)).toEqual(['toggle:Open recent:true', 'toggle:Open recent:false', 'close:escape']);
    // Shift+Tab from inside a submenu: one close, and focus moves back from the anchor.
    await openMenu(page, 'file');
    await pressTo(page, 'Export');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => focused(page)).toBe('PDF');
    await page.evaluate(() => ((window as any).log.length = 0));
    await tab(page);
    expect(await log(page)).toEqual(['close:tab']);
    expect(await focused(page)).toBe('after');
    await expect.poll(() => shown(exported(page))).toBe(false);
  });

  test('MNU-6: an action at any level emits its click, then close once, and every level closes; a checkbox or radio item in a submenu closes them by pointer or Enter and none by Space; a submenu item’s activation closes nothing', async ({ page }) => {
    await mount(page, [sub('View', [cb('Grid'), group({ value: 'a' }, [radio('A', 'a'), radio('B', 'b')]), it('Reset')])]);
    const view = labelled(page, 'file', 'View');
    const into = async () => {
      await openMenu(page, 'file', 'View');
      await page.keyboard.press('Enter');
      await expect.poll(() => focused(page)).toBe('Grid');
      await page.evaluate(() => ((window as any).log.length = 0));
    };
    await into();
    // Space: the item changes and every level stays open.
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');
    expect(await log(page)).toEqual(['click:Grid', 'change:Grid:{"checked":true}', 'click:B', 'group::{"value":"b"}']);
    expect(await shown(view)).toBe(true);
    expect(await isOpen(page, 'file')).toBe(true);
    // Enter: it changes and the whole menu closes, once.
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    expect((await log(page)).slice(4)).toEqual(['click:A', 'group::{"value":"a"}', 'close:item']);
    await expect.poll(() => isOpen(page, 'file')).toBe(false);
    await expect.poll(() => shown(view)).toBe(false);
    // A pointer on a checkbox item, and on an action.
    await into();
    await rowOf(labelled(page, 'file', 'Grid')).click();
    expect(await log(page)).toEqual(['click:Grid', 'change:Grid:{"checked":false}', 'close:item']);
    await into();
    await rowOf(labelled(page, 'file', 'Reset')).click();
    expect(await log(page)).toEqual(['click:Reset', 'close:item']);
    await expect.poll(() => isOpen(page, 'file')).toBe(false);
  });

  test('MNU-7: the arrows, Home, End and typeahead move within the surface that holds focus, never across levels, wrapping; a submenu item takes focus as any other item', async ({ page }) => {
    await mount(page, [it('New'), sub('Open recent', [it('Report.pdf'), it('Notes.txt'), it('Receipt.pdf')]), it('Rename'), it('Save')]);
    await openMenu(page, 'file');
    const order: string[] = [];
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowDown');
      order.push((await focused(page)) as string);
    }
    // The submenu's items are not the menu's: the menu's own surface has four.
    expect(order).toEqual(['Open recent', 'Rename', 'Save', 'New', 'Open recent']);
    await page.keyboard.press('ArrowRight');
    const inner: string[] = [];
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('ArrowDown');
      inner.push((await focused(page)) as string);
    }
    expect(inner).toEqual(['Notes.txt', 'Receipt.pdf', 'Report.pdf', 'Notes.txt']);
    await page.keyboard.press('End');
    expect(await focused(page)).toBe('Receipt.pdf');
    await page.keyboard.press('Home');
    expect(await focused(page)).toBe('Report.pdf');
    await page.keyboard.press('ArrowUp');
    expect(await focused(page)).toBe('Receipt.pdf');
    // Typeahead: "re" finds the next item of the submenu that begins with it — never "Rename", which is the menu's.
    await page.waitForTimeout(1100);
    await page.keyboard.type('re', { delay: 30 });
    expect(await focused(page)).toBe('Report.pdf');
    await page.waitForTimeout(1100);
    await page.keyboard.press('r');
    expect(await focused(page)).toBe('Receipt.pdf');
    await page.waitForTimeout(1100);
    await page.keyboard.press('n');
    expect(await focused(page)).toBe('Notes.txt');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(1100);
    await page.keyboard.type('re', { delay: 30 });
    expect(await focused(page)).toBe('Rename');
  });

  test('MNU-8: a pointer moving onto an item of a submenu moves focus there without the ring, so that the arrow keys continue from it in that surface', async ({ page }) => {
    await mount(page);
    await openMenu(page, 'file');
    await pressTo(page, 'Open recent');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => focused(page)).toBe('Report.pdf');
    await motionEnded(page);
    await rowOf(labelled(page, 'file', 'Notes.txt')).hover();
    expect(await focused(page)).toBe('Notes.txt');
    expect(await ring(labelled(page, 'file', 'Notes.txt'))).toBe('none');
    await page.mouse.move(900, 650);
    expect(await focused(page)).toBe('Notes.txt');
    await page.keyboard.press('ArrowUp');
    expect(await focused(page)).toBe('More');
    expect(await ring(more(page))).toBe('solid');
    expect(await shown(recent(page))).toBe(true);
  });

  test('MNU-24: a submenu item is a menu item that opens a menu, with whether it is open, described also by its trailing text; its surface is a menu of its own named by the item’s label; positions count each surface’s own items; the indicator is hidden', async ({ page }) => {
    await mount(page, [it('New'), sub('Language', [it('English'), it('Japanese')], { trailingText: 'English', supportingText: 'Of the interface' }), it('Save')]);
    const language = labelled(page, 'file', 'Language');
    await openMenu(page, 'file');
    await expect(language).toHaveAttribute('role', 'menuitem');
    await expect(language).toHaveAttribute('aria-haspopup', 'menu');
    await expect(language).toHaveAttribute('aria-expanded', 'false');
    await expect(language).toHaveAttribute('aria-description', 'Of the interface, English');
    await expect(language).toHaveAttribute('aria-posinset', '2');
    await expect(language).toHaveAttribute('aria-setsize', '3');
    await expect(rowOf(language).locator('.submenu-indicator')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.getByRole('menu', { name: 'Language' })).toHaveCount(0);
    await pressTo(page, 'Language');
    await page.keyboard.press('ArrowRight');
    await expect(language).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('menu', { name: 'Language' })).toHaveCount(1);
    // Its items are the submenu's, in the tree assistive technology reads (they are slotted into its surface).
    const tree = await page.getByRole('menu', { name: 'Language' }).ariaSnapshot();
    expect(tree).toContain('menuitem "English"');
    expect(tree).toContain('menuitem "Japanese"');
    expect(tree).not.toContain('Save');
    await expect(labelled(page, 'file', 'Japanese')).toHaveAttribute('aria-posinset', '2');
    await expect(labelled(page, 'file', 'Japanese')).toHaveAttribute('aria-setsize', '2');
    await page.keyboard.press('Escape');
    await expect(language).toHaveAttribute('aria-expanded', 'false');
  });
});

// ── Separation, the selected fill and the marks (MNU-35 … MNU-42), drawn in place ──────────────────────────────────

/**
 * MNU-37's fill of a checked row, in parts: the default system at standard, medium and high contrast; the content's
 * colors, the corners and the marks; and the two presets that pin the selected colors. Each part is a test of its own;
 * the coverage test below holds that every part the one test walked is walked exactly once, in its order.
 */
const MNU_37_FILL: { part: 'standard contrast' | 'medium contrast' | 'high contrast' | 'content, corners and marks' | 'm3-like' | 'cupertino' }[] = [
  { part: 'standard contrast' },
  { part: 'medium contrast' },
  { part: 'high contrast' },
  { part: 'content, corners and marks' },
  { part: 'm3-like' },
  { part: 'cupertino' },
];

test('MNU-37: the parts of the fill walk check each contrast level, the content and each preset exactly once, in order', () => {
  expect(MNU_37_FILL.map(({ part }) => part)).toEqual([
    ...['standard', 'medium', 'high'].map((level) => `${level} contrast`),
    'content, corners and marks',
    ...['m3-like', 'cupertino'],
  ]);
});

/**
 * MNU-37 at high contrast, in parts: the four colors and the states in light and in dark, the fill over a sheet a layer
 * has recolored in light and in dark, and the fade. Each part is a test of its own on a page it mounts; the coverage
 * test below holds that every part the one test walked is walked exactly once, in its order.
 */
const MNU_37_HIGH: { part: 'the states' | 'a recolored sheet' | 'the fade'; theme?: 'light' | 'dark'; ground?: string }[] = [
  { part: 'the states', theme: 'light' },
  { part: 'the states', theme: 'dark' },
  { part: 'a recolored sheet', theme: 'light', ground: 'rgb(255, 236, 200)' },
  { part: 'a recolored sheet', theme: 'dark', ground: 'rgb(20, 40, 80)' },
  { part: 'the fade' },
];

test('MNU-37: the parts of the high-contrast walk check each scheme and the fade exactly once, in order', () => {
  expect(MNU_37_HIGH.map(({ part, theme, ground }) => [part, theme ?? null, ground ?? null])).toEqual([
    ...(['light', 'dark'] as const).map((theme) => ['the states', theme, null]),
    ...([['light', 'rgb(255, 236, 200)'], ['dark', 'rgb(20, 40, 80)']] as const).map(([theme, ground]) => ['a recolored sheet', theme, ground]),
    ['the fade', null, null],
  ]);
});

test.describe('separation, selection and marks', () => {
  // The acme fixture system is built once per worker, outside any test's budget: otherwise a test of this group that is
  // the first of its worker to ask for it pays the build out of its own 30 s.
  test.beforeAll(async () => {
    test.setTimeout(240_000);
    await acmeSystemCss();
  });
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
  });
  const display = (locator: Locator) => css(locator, 'display');
  /** Which form a surface draws between its groups. */
  const form = async (page: P, id: string) => {
    const [divider, gap] = [await display(menu(page, id).locator('.divider').first()), await display(menu(page, id).locator('.gap').first())];
    return divider !== 'none' && gap === 'none' ? 'divider' : divider === 'none' && gap !== 'none' ? 'gap' : `divider ${divider}, gap ${gap}`;
  };

  test('MNU-35: a group is told from what is next to it as separation names — the attribute, else comp.menu.separation, which follows sys.behavior.separation unless a system sets it apart; submenus follow their menu; a change is drawn at once, open state and focus kept; an unknown value is auto and reported', async ({ page }) => {
    const seen = warnings(page);
    expect(await token(page, '--tanrei-sys-behavior-separation')).toBe('divider');
    expect(await form(page, 'groups')).toBe('divider');
    expect(await form(page, 'groups-divider')).toBe('divider');
    expect(await form(page, 'groups-gap')).toBe('gap');
    // The system's choice alone set to gap: auto follows it; the attribute does not.
    await override(page, { '--tanrei-sys-behavior-separation': 'gap' });
    await expect.poll(() => form(page, 'groups')).toBe('gap');
    await expect.poll(() => form(page, 'group-titles')).toBe('gap');
    expect(await form(page, 'groups-divider')).toBe('divider');
    // The component token set apart from the system's choice: auto follows the token.
    await override(page, { [T('separation')]: 'divider' });
    await expect.poll(() => form(page, 'groups')).toBe('divider');
    expect(await form(page, 'groups-gap')).toBe('gap');
    // m3-like is that system: its joined buttons take a gap, its menus a line.
    await mountFixtures(page, spec, { system: 'm3-like', icons: true });
    expect(await token(page, '--tanrei-sys-behavior-separation')).toBe('gap');
    expect(await token(page, T('separation'))).toBe('divider');
    expect(await form(page, 'groups')).toBe('divider');
    expect(await form(page, 'groups-gap')).toBe('gap');
    // A submenu separates its groups as its menu does.
    await mountFixtures(page, spec, { fixtures: [inline('nested', [sub('Sort', [group({}, [it('A')]), group({}, [it('B')])], { open: true })], { separation: 'gap' }), inline('auto', [group({}, [it('A')]), group({}, [it('B')])])] });
    const nested = labelled(page, 'nested', 'Sort');
    await expect.poll(() => display(nested.locator('.gap'))).toBe('block');
    expect(await display(nested.locator('.divider'))).toBe('none');
    await menu(page, 'nested').evaluate((el: any) => (el.separation = 'divider'));
    await expect.poll(() => display(nested.locator('.gap'))).toBe('none');
    expect(await display(nested.locator('.divider'))).toBe('block');
    // Changed while shown: the other form at once, with no motion, focus and the open state kept.
    await item(page, 'auto', 1).focus();
    await menu(page, 'auto').evaluate((el: any) => (el.separation = 'gap'));
    await expect.poll(() => form(page, 'auto')).toBe('gap');
    expect(await css(menu(page, 'auto').locator('.gap'), 'transition-duration')).toBe('0s');
    expect(await focused(page)).toBe('B');
    await expect(menu(page, 'auto')).toHaveAttribute('open', '');
    // A value the menu does not define is auto, and a debug build says so.
    await menu(page, 'auto').evaluate((el: any) => (el.separation = 'stripes'));
    await expect.poll(() => form(page, 'auto')).toBe('divider');
    await expect.poll(() => seen.join('\n')).toMatch(/separation "stripes" is not a value the menu defines; it is drawn as "auto" \(MNU-35\)/);
  });

  test('MNU-36: under gap each group, and each run of items outside a group, is a tile of its own — the surface’s color, corners, elevation and padding — comp.menu.group.gap apart, the surface drawing no sheet around them; nothing drawn between them and no separator exposed, the groups still groups; no space before the first or after the last tile; a title keeps its own padding inside its tile', async ({ page }) => {
    const [gap, padB, padI, padRow] = await Promise.all(['group-gap', 'surface-padding-block', 'surface-padding-inline', 'container-padding-block'].map((n) => resolveToken(page, T(n))));
    const tiles = menu(page, 'groups-gap').locator('.tile');
    await expect(tiles).toHaveCount(2);
    const [first, second] = [await bounds(tiles.nth(0)), await bounds(tiles.nth(1))];
    // The space between two tiles is the gap; the rows stand inside each tile's padding.
    expect(second.y - (first.y + first.height)).toBeCloseTo(gap, 1);
    const last = await bounds(row(page, 'groups-gap', 2));
    const next = await bounds(row(page, 'groups-gap', 3));
    expect(next.y - (last.y + last.height)).toBeCloseTo(gap + 2 * padB, 1);
    expect((await bounds(row(page, 'groups-gap', 0))).y - first.y).toBeCloseTo(padB, 1);
    expect((await bounds(row(page, 'groups-gap', 0))).x - first.x).toBeCloseTo(padI, 1);
    // Each tile is a sheet: the surface's color, corners and elevation (its ring inside the tile's edge); the surface
    // itself draws none around them, so what is under the menu shows between the tiles.
    for (const n of [0, 1]) {
      const tile = tiles.nth(n);
      expect(await css(tile, 'background-color'), `tile ${n}`).toBe(await resolveColor(page, T('surface-color')));
      expect(Number.parseFloat(await css(tile, 'border-top-left-radius')), `tile ${n}`).toBe(await resolveToken(page, T('surface-shape')));
      expect(await css(tile, 'box-shadow'), `tile ${n}`).toContain('inset');
    }
    expect(await css(surface(page, 'groups-gap'), 'background-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(surface(page, 'groups-gap'), 'box-shadow')).toBe('none');
    // Under divider the tiles have no look: one sheet, as before.
    expect(await css(menu(page, 'groups-divider').locator('.tile').first(), 'display')).toBe('contents');
    expect(await css(surface(page, 'groups-divider'), 'background-color')).toBe(await resolveColor(page, T('surface-color')));
    // No line, and no separator: the divider is not rendered, and the space is nothing to assistive technology.
    await expect(menu(page, 'groups-gap').locator('.divider')).toBeHidden();
    await expect(page.locator('[data-fixture="groups-gap"]').getByRole('separator')).toHaveCount(0);
    await expect(page.locator('[data-fixture="groups-divider"]').getByRole('separator')).toHaveCount(1);
    expect(await css(menu(page, 'groups-gap').locator('.gap'), 'background-color')).toBe('rgba(0, 0, 0, 0)');
    await expect(menu(page, 'groups-gap').locator('.gap')).not.toHaveAttribute('role');
    await expect(tiles.first()).not.toHaveAttribute('role');
    await expect(page.locator('[data-fixture="groups-gap"]').getByRole('group')).toHaveCount(2);
    await expect(page.locator('[data-fixture="groups-gap"]').getByRole('menuitem')).toHaveCount(4);
    // None at the ends: the first tile starts at the surface's top and the last ends at its bottom.
    const s = await bounds(surface(page, 'groups-gap'));
    expect(first.y - s.y).toBeCloseTo(0, 1);
    expect(s.y + s.height - (second.y + second.height)).toBeCloseTo(0, 1);
    await expect(menu(page, 'groups-gap').locator('.gap')).toHaveCount(1);
    // A run of items outside any group is one tile; a group beside it is another.
    await mountFixtures(page, spec, { fixtures: [inline('runs', [it('A'), it('B'), group({}, [it('C')]), it('D')], { separation: 'gap' })] });
    await expect(menu(page, 'runs').locator('.tile')).toHaveCount(3);
    expect(await menu(page, 'runs').locator('.tile').evaluateAll((all) => all.map((tile) => tile.querySelectorAll('slot').length))).toEqual([2, 1, 1]);
    // A titled group: its title with its own padding, inside its tile.
    await mountFixtures(page, spec, { icons: true });
    const titled = menu(page, 'group-titles-gap').locator('.tile').nth(1);
    const title = menu(page, 'group-titles-gap').locator('tanrei-menu-group').nth(1).locator('.title');
    expect((await bounds(title)).y - (await bounds(titled)).y).toBeCloseTo(padB, 1);
    expect(Number.parseFloat(await css(title, 'padding-top'))).toBe(padRow);
  });

  test('MNU-23: under divider the line is drawn in a submenu’s surface as in the menu’s, a separator; under gap none is', async ({ page }) => {
    const nested = labelled(page, 'submenu-choices', 'Sort by');
    await expect(nested.locator('.divider')).toHaveCount(1);
    await expect(nested.locator('.divider')).toBeVisible();
    await expect(nested.locator('.divider')).toHaveAttribute('role', 'separator');
    expect((await bounds(nested.locator('.divider'))).height).toBeCloseTo(await resolveToken(page, T('divider-thickness')), 1);
    await menu(page, 'submenu-choices').evaluate((el: any) => (el.separation = 'gap'));
    await expect(nested.locator('.divider')).toBeHidden();
  });

  // One test for each part of MNU_37_FILL, each with the whole of the time limit: in one test the three mounts and the
  // three contrast levels took 15 s in WebKit on a CI runner.
  for (const { part } of MNU_37_FILL) {
    test(`MNU-37: a checked row is filled with the selected container color of the scheme it is drawn in within its own corners — none at standard contrast in the default system, a fill at medium and high — its label, supporting text, trailing text and icons in the selected colors; checked rows next to each other are not joined; the choice is never the fill alone — ${part}`, async ({ page }) => {
      if (part === 'standard contrast') {
        // Standard contrast: the default system gives a checked row no fill; its mark tells it.
        const selected = await expected(page, 'selected');
        expect(selected.bg, 'no fill: alpha 0').toMatch(/(\/ ?0|, ?0)\)$/);
        for (const [id, n] of [['checkbox-checked', 0], ['radio-checked', 0], ['selected-supporting-text', 0]] as const) await expect.poll(() => drawn(page, id, n), id).toEqual(selected);
        await expect.poll(() => drawn(page, 'checkbox-checked', 1)).toEqual(await expected(page, 'unselected'));
        return;
      }
      // Medium and high contrast: the same token gives the fill, and the menu draws it.
      if (part === 'medium contrast' || part === 'high contrast') {
        const level = part === 'medium contrast' ? 'medium' : 'high';
        await inContrast(page, level);
        const selected = await expected(page, 'selected');
        expect(selected.bg, level).not.toBe((await expected(page, 'unselected')).bg);
        for (const [id, n] of [['checkbox-checked', 0], ['radio-checked', 0], ['selected-supporting-text', 0]] as const) await expect.poll(() => drawn(page, id, n), `${level} ${id}`).toEqual(selected);
        await expect.poll(() => drawn(page, 'checkbox-checked', 1), level).toEqual(await expected(page, 'unselected'));
        return;
      }
      // m3-like and cupertino pin the selected colors to what they drew: no fill, and the mark still there.
      if (part === 'm3-like' || part === 'cupertino') {
        const system = part;
        await mountFixtures(page, spec, { system, icons: true });
        expect((await expected(page, 'selected')).bg, system).toBe((await expected(page, 'unselected')).bg);
        await expect.poll(() => drawn(page, 'checkbox-checked', 0), system).toEqual(await expected(page, 'selected'));
        await expect(row(page, 'checkbox-checked', 0).locator('.check.system'), system).toBeVisible();
        return;
      }
      expect(part).toBe('content, corners and marks');
      const chosen = row(page, 'selected-supporting-text', 0);
      expect(await settledCss(chosen.locator('.supporting'), 'color')).toBe(await resolveColor(page, T('selected-supporting-text-color')));
      expect(await settledCss(chosen.locator('.trailing-text'), 'color')).toBe(await resolveColor(page, T('selected-trailing-text-color')));
      expect(await settledCss(row(page, 'group-titles-icons', 0).locator('.leading-icon'), 'color')).toBe(await resolveColor(page, T('selected-leading-icon-color')));
      // Two checked rows in a row: each keeps its own corners.
      const radius = await resolveToken(page, T('container-shape'));
      expect(radius).toBeGreaterThan(0);
      for (const [n, corner] of [[0, 'border-bottom-left-radius'], [1, 'border-top-left-radius']] as const) expect(Number.parseFloat(await css(row(page, 'mark-icon-custom', n), corner))).toBe(radius);
      // Never the fill alone: the mark is drawn in every checked row — the box, the ring, a glyph.
      await expect(row(page, 'checkbox-checked', 0).locator('.box')).toBeVisible();
      await expect(row(page, 'radio-checked', 0).locator('.ring')).toBeVisible();
      await expect(row(page, 'mark-icon-custom', 0).locator('.check')).toBeVisible();
    });
  }

  test('MNU-37: at standard contrast a checked row at rest is the sheet and a hovered one a hovered unchecked row, in light and in dark', async ({ page }) => {
    const fixtures = spec.fixtures.filter((fixture) => fixture.id === 'checkbox-checked');
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true, fixtures });
      const [checked, unchecked] = [row(page, 'checkbox-checked', 0), row(page, 'checkbox-checked', 1)];
      await page.mouse.move(0, 0);
      const sheet = await paintedIn(page, unchecked);
      expect(sameColor(await paintedIn(page, checked), sheet), `${theme} at rest`).toBe(true);
      await unchecked.hover();
      const hovered = await paintedIn(page, unchecked);
      await checked.hover();
      expect(sameColor(await paintedIn(page, checked), hovered), `${theme} hovered`).toBe(true);
      // The mark tells it, and its label keeps 4.5:1 on the sheet.
      await expect(checked.locator('.box')).toBeVisible();
      await page.mouse.move(0, 0);
      expect(contrast(rgbOf(await settledCss(checked.locator('.label'), 'color')), sheet), theme).toBeGreaterThanOrEqual(4.5);
    }
  });

  // One test for each part of MNU_37_HIGH, each with the whole of the time limit: in one test the five mounts took
  // 15 s in WebKit on a CI runner.
  for (const { part, theme, ground } of MNU_37_HIGH) {
    test(`MNU-37: at high contrast, over the sheet an unchecked row at rest, a hovered unchecked row, a checked row and a hovered checked row are four colors in that order of strength, each at least 1.1:1 from the one before, in light and in dark, the checked row’s content keeping 4.5:1 on its fill in every state; the fill follows a sheet a layer has recolored, and fades in without a color between that is neither — ${part}${theme ? `, ${theme}` : ''}`, async ({ page }) => {
      const fixtures = spec.fixtures.filter((fixture) => fixture.id === 'checkbox-checked');
      if (part === 'the states' && theme) {
        await mountFixtures(page, spec, { theme, icons: true, fixtures });
        await inContrast(page, 'high');
        const [checked, unchecked] = [row(page, 'checkbox-checked', 0), row(page, 'checkbox-checked', 1)];
        expect(await resolveToken(page, T('container-padding-inline')), 'the sampled pixel is in the row’s padding').toBeGreaterThan(IN_PADDING);
        await page.mouse.move(0, 0);
        // The sheet shows through an unchecked row at rest: its container is no color at all.
        const sheet = await paintedIn(page, unchecked);
        expect(sheet, theme).toEqual(rgbOf(await resolveColor(page, T('surface-color'))));
        await unchecked.hover();
        const hovered = await paintedIn(page, unchecked);
        await page.mouse.move(0, 0);
        const fill = await paintedIn(page, checked);
        await checked.hover();
        const fillHovered = await paintedIn(page, checked);
        // Four colors, each one a step stronger against the sheet than the one before.
        const steps = [sheet, hovered, fill, fillHovered];
        expect(new Set(steps.map(String)).size, `${theme} ${steps.join(' | ')}`).toBe(4);
        for (let i = 1; i < steps.length; i++) {
          expect(contrast(steps[i], steps[i - 1]), `${theme} step ${i}: ${steps[i - 1]} to ${steps[i]}`).toBeGreaterThanOrEqual(1.1);
          expect(contrast(steps[i], sheet), `${theme} step ${i} against the sheet`).toBeGreaterThan(contrast(steps[i - 1], sheet));
        }
        // The fill is not opaque: what is painted is the selected container color laid over the sheet, not that color itself.
        const written = await settledCss(checked, 'background-color');
        expect(written, theme).toBe(await resolveColor(page, T('selected-hovered-container-color')));
        expect(written, theme).not.toBe(`rgb(${fillHovered.join(', ')})`);
        // The content on a checked row: at least 4.5:1 on its fill at rest, hovered, focused and pressed.
        const label = async () => rgbOf(await settledCss(checked.locator('.label'), 'color'));
        expect(contrast(await label(), fillHovered), `${theme} hovered`).toBeGreaterThanOrEqual(4.5);
        await page.mouse.move(0, 0);
        expect(contrast(await label(), await paintedIn(page, checked)), `${theme} at rest`).toBeGreaterThanOrEqual(4.5);
        await item(page, 'checkbox-checked', 1).focus();
        await page.keyboard.press('ArrowUp');
        await expect.poll(() => settledCss(checked, 'background-color'), theme).toBe(await resolveColor(page, T('selected-focused-container-color')));
        const focused = await paintedIn(page, checked);
        expect(contrast(await label(), focused), `${theme} focused`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(focused, fill), `${theme} focused against the fill at rest`).toBeGreaterThan(1);
        await checked.hover();
        await page.mouse.down();
        await expect.poll(() => settledCss(checked, 'background-color'), theme).toBe(await resolveColor(page, T('selected-pressed-container-color')));
        expect(contrast(await label(), await paintedIn(page, checked)), `${theme} pressed`).toBeGreaterThanOrEqual(4.5);
        await page.mouse.move(0, 0);
        await page.mouse.up();
        return;
      }
      // A layer that recolors the sheet: the checked row is that sheet with the same layer over it — still apart from it.
      if (part === 'a recolored sheet' && theme && ground) {
        await mountFixtures(page, spec, { theme, icons: true, fixtures });
        await inContrast(page, 'high');
        await page.mouse.move(0, 0);
        const before = await paintedIn(page, row(page, 'checkbox-checked', 0));
        await override(page, { [T('surface-color')]: ground });
        const [sheet, fill] = [await paintedIn(page, row(page, 'checkbox-checked', 1)), await paintedIn(page, row(page, 'checkbox-checked', 0))];
        expect(sheet, ground).toEqual(rgbOf(ground));
        expect(contrast(fill, sheet), ground).toBeGreaterThanOrEqual(1.1);
        expect(String(fill), ground).not.toBe(String(before));
        return;
      }
      expect(part).toBe('the fade');
      // MNU-27: an unfilled row becoming a filled one passes through nothing but what lies between the two — both ends are
      // translucent, and a fade that went by way of an opaque or a darker color would show here.
      await mountFixtures(page, spec, { icons: true, fixtures });
      await inContrast(page, 'high');
      // (60 s: the fade is found and then held in later answers, and a slow runner's answers come half a second apart.)
      await override(page, { [T('motion-state-duration')]: '60s', [T('motion-state-easing')]: 'linear' });
      await page.mouse.move(0, 0);
      const target = row(page, 'checkbox-checked', 1);
      const [from, to] = [await paintedIn(page, target), await paintedIn(page, row(page, 'checkbox-checked', 0))];
      await item(page, 'checkbox-checked', 1).evaluate((el: any) => (el.checked = true));
      await expect.poll(() => target.evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0);
      const along: Rgb[] = [];
      for (const share of [0.25, 0.5, 0.75]) {
        await target.evaluate((el, at) => {
          for (const animation of el.getAnimations()) {
            animation.pause();
            animation.currentTime = Number(animation.effect!.getComputedTiming().endTime) * at;
          }
        }, share);
        const r = (await target.boundingBox())!;
        const shot = decodePng(await page.screenshot({ scale: 'css', animations: 'allow' }));
        const i = (Math.round(r.y + r.height / 2) * shot.width + Math.round(r.x + IN_PADDING)) * 4;
        along.push([shot.data[i], shot.data[i + 1], shot.data[i + 2]]);
      }
      for (const [n, color] of along.entries()) {
        for (const channel of [0, 1, 2]) {
          expect(color[channel], `at ${n}: ${color} between ${from} and ${to}`).toBeLessThanOrEqual(Math.max(from[channel], to[channel]) + 1);
          expect(color[channel], `at ${n}: ${color} between ${from} and ${to}`).toBeGreaterThanOrEqual(Math.min(from[channel], to[channel]) - 1);
        }
      }
      // Nearer the fill at each step.
      expect(contrast(along[0], to)).toBeGreaterThan(contrast(along[1], to));
      expect(contrast(along[1], to)).toBeGreaterThan(contrast(along[2], to));
    });
  }

  test('MNU-37: under acme the selected condition’s hovered, focused and pressed fills are its own, apart from the unselected one’s', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() });
    const bg = () => css(row(page, 'checkbox-checked', 0), 'background-color');
    const [rest, hovered, focus, down] = await Promise.all(['', 'hovered-', 'focused-', 'pressed-'].map((state) => resolveColor(page, T(`selected-${state}container-color`))));
    expect(new Set([rest, hovered, focus, down]).size).toBe(4);
    expect(hovered).not.toBe(await resolveColor(page, T('unselected-hovered-container-color')));
    await page.mouse.move(0, 0);
    await expect.poll(bg).toBe(rest);
    await row(page, 'checkbox-checked', 0).hover();
    await expect.poll(bg).toBe(hovered);
    await item(page, 'checkbox-checked', 1).focus();
    await page.keyboard.press('ArrowUp');
    await expect.poll(bg).toBe(focus);
  });

  test('MNU-38: the mark is the glyph the item names, else the one its group names, else the design system’s choice for the kind — a box and a ring in the default system, the check where the token says so; whatever it is, it is in the mark column before the leading icon, centred, hidden from assistive technology and no control of its own', async ({ page }) => {
    expect(await token(page, T('checkbox-item-mark'))).toBe('checkbox');
    expect(await token(page, T('radio-item-mark'))).toBe('radio');
    const marks = async (id: string, n: number) => {
      const mark = row(page, id, n).locator('.column.mark');
      const drawnOf = async (selector: string) => ((await mark.locator(selector).count()) ? (await display(mark.locator(selector))) !== 'none' : false);
      return { box: await drawnOf('.box'), ring: await drawnOf('.ring'), check: await drawnOf('.check.system'), named: (await mark.locator('.check.named').count()) ? await mark.locator('.check.named').textContent() : null };
    };
    // The default system: boxes and rings, in both conditions.
    for (const n of [0, 1]) expect(await marks('checkbox-checked', n)).toEqual({ box: true, ring: false, check: false, named: null });
    for (const n of [0, 1]) expect(await marks('radio-checked', n)).toEqual({ box: false, ring: true, check: false, named: null });
    // Each token chooses for its own kind. (The two fixtures alone: each override below restyles the whole document,
    // which takes WebKit longer than the poll waits with all 34 mounted.)
    await mountFixtures(page, spec, { icons: true, fixtures: spec.fixtures.filter((f) => ['checkbox-checked', 'radio-checked'].includes(f.id)) });
    await override(page, { [T('checkbox-item-mark')]: 'check' });
    await expect.poll(() => marks('checkbox-checked', 0)).toEqual({ box: false, ring: false, check: true, named: null });
    expect(await marks('radio-checked', 0)).toEqual({ box: false, ring: true, check: false, named: null });
    await override(page, { [T('checkbox-item-mark')]: 'checkbox', [T('radio-item-mark')]: 'check' });
    await expect.poll(() => marks('radio-checked', 0)).toEqual({ box: false, ring: false, check: true, named: null });
    await expect.poll(() => marks('checkbox-checked', 0)).toEqual({ box: true, ring: false, check: false, named: null });
    // A name the menu does not know is the first value.
    await override(page, { [T('checkbox-item-mark')]: 'tick', [T('radio-item-mark')]: 'dot' });
    await expect.poll(() => marks('radio-checked', 0)).toEqual({ box: false, ring: true, check: false, named: null });
    expect(await marks('checkbox-checked', 0)).toEqual({ box: true, ring: false, check: false, named: null });
    // The item's glyph wins over its group's, and the group's over the system's; a named glyph is the whole mark.
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        ...spec.fixtures,
        inline('named', [group({ markIcon: 'star', value: 'a' }, [cb('Own', { checked: true, markIcon: 'keep' }), cb('Group’s', { checked: true }), radio('Radio', 'a')]), cb('System’s', { checked: true })]),
      ],
    });
    expect(await marks('named', 0)).toEqual({ box: false, ring: false, check: false, named: 'keep' });
    expect(await marks('named', 1)).toEqual({ box: false, ring: false, check: false, named: 'star' });
    expect(await marks('named', 2)).toEqual({ box: false, ring: false, check: false, named: 'star' });
    expect(await marks('named', 3)).toEqual({ box: true, ring: false, check: false, named: null });
    expect(await marks('radio-check-mark', 0)).toEqual({ box: false, ring: false, check: false, named: 'check' });
    // The group's glyph, changed, is followed.
    await menu(page, 'named').locator('tanrei-menu-group').evaluate((el: any) => (el.markIcon = ''));
    await expect.poll(() => marks('named', 1)).toEqual({ box: true, ring: false, check: false, named: null });
    // In the mark column: the first column, before the leading icon, the label and the shortcut, centred in mark.size.
    const size = await resolveToken(page, T('mark-size'));
    for (const n of [0, 2]) {
      const r = row(page, 'marks-icons-shortcut', n);
      const [column, control, icon, label, shortcut] = [await bounds(r.locator('.column.mark')), await bounds(r.locator('.control')), await bounds(r.locator('.leading-icon')), await bounds(r.locator('.text .label')), await bounds(r.locator('.shortcut'))];
      expect(column.width).toBeCloseTo(size, 1);
      expect(column.height).toBeCloseTo(size, 1);
      expect(control.x + control.width / 2).toBeCloseTo(column.x + column.width / 2, 1);
      expect(control.y + control.height / 2).toBeCloseTo(column.y + column.height / 2, 1);
      expect(column.x + column.width).toBeLessThanOrEqual(icon.x);
      expect(icon.x + icon.width).toBeLessThanOrEqual(label.x);
      expect(label.x + label.width).toBeLessThanOrEqual(shortcut.x);
    }
    // A drawing: hidden, without a role, a tab stop or a press of its own; the item stays what it is.
    const mark = row(page, 'checkbox-checked', 0).locator('.column.mark');
    await expect(mark).toHaveAttribute('aria-hidden', 'true');
    expect(await mark.evaluate((el) => el.querySelectorAll('input, button, [role], [tabindex]').length)).toBe(0);
    expect(await css(mark.locator('.control'), 'pointer-events')).toBe('none');
    await expect(item(page, 'checkbox-checked', 0)).toHaveAttribute('role', 'menuitemcheckbox');
    await expect(item(page, 'checkbox-checked', 0)).toHaveAttribute('aria-checked', 'true');
    await expect(item(page, 'radio-checked', 0)).toHaveAttribute('role', 'menuitemradio');
    await expect(page.locator('[data-fixture="checkbox-checked"]').getByRole('checkbox')).toHaveCount(0);
    // A mark-icon under m3-like: the named glyph, not the system's check.
    await mountFixtures(page, spec, { system: 'm3-like', icons: true });
    expect(await marks('mark-icon-custom', 0)).toEqual({ box: false, ring: false, check: false, named: 'keep' });
    expect(await marks('checkbox-checked', 0)).toEqual({ box: false, ring: false, check: true, named: null });
    expect(await marks('radio-checked', 0)).toEqual({ box: false, ring: false, check: true, named: null });
  });

  test('MNU-39: the checkbox look is a box of control.box.size with control.box.shape corners in both conditions — empty with an outline of control.outline.width in the control color, or filled in it with the icon set’s check on it at control.mark.size and control.mark.weight in the control-mark color, not clipped and never mirrored — the box the checkbox draws, with no state layer behind it', async ({ page }) => {
    const [size, shape, outline, mark] = await Promise.all(['control-box-size', 'control-box-shape', 'control-outline-width', 'control-mark-size'].map((n) => resolveToken(page, T(n))));
    // The checkbox's own values, value for value.
    const C = (name: string) => `--tanrei-comp-checkbox-${name}`;
    expect([size, shape, outline, mark]).toEqual(await Promise.all(['box-size', 'box-shape', 'outline-width', 'mark-size'].map((n) => resolveToken(page, C(n)))));
    for (const [n, condition] of [[0, 'selected'], [1, 'unselected']] as const) {
      const b = row(page, 'checkbox-checked', n).locator('.box');
      const color = await resolveColor(page, T(`${condition}-control-color`));
      const at = await bounds(b);
      expect(at.width, condition).toBeCloseTo(size, 1);
      expect(at.height, condition).toBeCloseTo(size, 1);
      expect(Number.parseFloat(await css(b, 'border-top-left-radius')), condition).toBe(shape);
      // The outline inside the edge; the fill inside the outline, one shape with it.
      expect(await settledCss(b, 'box-shadow'), condition).toBe(`${color} 0px 0px 0px ${outline}px inset`);
      expect(await css(b, 'background-clip'), condition).toBe('content-box');
      expect(Number.parseFloat(await css(b, 'padding-top')), condition).toBe(outline);
      expect(await settledCss(b, 'background-color'), condition).toBe(condition === 'selected' ? color : 'rgba(0, 0, 0, 0)');
      const check = b.locator('.box-check');
      expect(await settledCss(check, 'opacity'), condition).toBe(condition === 'selected' ? '1' : '0');
      expect(await settledCss(check, 'visibility'), condition).toBe(condition === 'selected' ? 'visible' : 'hidden');
    }
    const b = row(page, 'checkbox-checked', 0).locator('.box');
    const check = b.locator('.box-check');
    expect(await check.textContent()).toBe('check');
    await expect(b.locator('svg, path')).toHaveCount(0);
    expect(await css(check, 'font-size')).toBe(`${mark}px`);
    expect(await settledCss(check, 'color')).toBe(await resolveColor(page, T('selected-control-mark-color')));
    expect((await css(check, '--tanrei-icon-family')).trim()).toBe(await token(page, '--tanrei-sys-icon-family-selected'));
    expect((await css(check, '--tanrei-icon-fill')).trim()).toBe(await token(page, '--tanrei-sys-icon-fill-selected'));
    // A control's own mark, at the weight the checkbox's is (CHK-12), heavier than the system's icons; the check of the
    // glyph look (MNU-22) keeps sys.icon.weight. The weight is the stroke only: the glyph box is still control.mark.size.
    const weightOf = (glyph: Locator) => glyph.evaluate((el) => Number(/["']wght["'] ([\d.]+)/.exec(getComputedStyle(el).fontVariationSettings)?.[1]));
    const [markWeight, iconWeight] = [Number(await token(page, T('control-mark-weight'))), Number(await token(page, '--tanrei-sys-icon-weight'))];
    expect(markWeight).toBe(Number(await token(page, C('mark-weight'))));
    expect(markWeight).toBeGreaterThan(iconWeight);
    for (const id of ['checkbox-checked', 'checkbox-unchecked', 'checked-disabled']) expect(await weightOf(row(page, id, 0).locator('.box-check')), id).toBe(markWeight);
    expect(await weightOf(row(page, 'checkbox-check-mark', 0).locator('.check'))).toBe(iconWeight);
    // Centred on the box and not clipped by it (it is larger than the box in the default system).
    const [bb, cb2] = [await bounds(b), await bounds(check)];
    expect(cb2.width).toBeCloseTo(mark, 1);
    expect(cb2.x + cb2.width / 2).toBeCloseTo(bb.x + bb.width / 2, 1);
    expect(cb2.y + cb2.height / 2).toBeCloseTo(bb.y + bb.height / 2, 1);
    expect(await css(b, 'overflow')).toBe('visible');
    // The row is the container: nothing round behind the box.
    await expect(row(page, 'checkbox-checked', 0).locator('.column.mark > *')).toHaveCount(2);
    expect(await css(row(page, 'checkbox-checked', 0).locator('.column.mark'), 'background-color')).toBe('rgba(0, 0, 0, 0)');
    // Never mirrored.
    await page.locator('[data-fixture="checkbox-checked"]').evaluate((el) => el.setAttribute('dir', 'rtl'));
    await expect(check).not.toHaveAttribute('data-tanrei-mirrored');
    expect(await css(check, 'transform')).toBe('none');
    const rtl = [await bounds(b), await bounds(check)];
    expect(rtl[1].x + rtl[1].width / 2).toBeCloseTo(rtl[0].x + rtl[0].width / 2, 1);
  });

  test('MNU-40: the radio look is a ring of control.ring.size in both conditions, stroked inward at control.ring.width, or — checked — at control.ring.selected-width-share of its radius with what it leaves inside filled at control.fill.opacity; no dot, and a fill that has no room is not drawn — the ring the radio button draws', async ({ page }) => {
    const [size, width, inset] = await Promise.all(['control-ring-size', 'control-ring-width', 'control-fill-inset'].map((n) => resolveToken(page, T(n))));
    const [share, opacity] = [Number(await token(page, T('control-ring-selected-width-share'))), Number(await token(page, T('control-fill-opacity')))];
    const R = (name: string) => `--tanrei-comp-radio-button-${name}`;
    expect([size, width, inset]).toEqual(await Promise.all(['ring-size', 'ring-width', 'fill-inset'].map((n) => resolveToken(page, R(n)))));
    expect([share, opacity]).toEqual([Number(await token(page, R('ring-selected-width-share'))), Number(await token(page, R('fill-opacity')))]);
    const mixed = (color: string) =>
      page.evaluate(
        ([name, amount]) => {
          const probe = document.createElement('div');
          probe.style.cssText = `position:absolute;visibility:hidden;background-color:color-mix(in srgb, var(${name}) calc(${amount} * 100%), transparent)`;
          document.body.appendChild(probe);
          const value = getComputedStyle(probe).backgroundColor;
          probe.remove();
          return value;
        },
        [color, opacity] as const,
      );
    const stroke = Math.max(width, (share * size) / 2);
    expect(stroke).toBeGreaterThan(width);
    for (const [n, condition, thick] of [[0, 'selected', stroke], [1, 'unselected', width]] as const) {
      const r = row(page, 'radio-checked', n).locator('.ring');
      const color = await resolveColor(page, T(`${condition}-control-color`));
      const at = await bounds(r);
      // The outer diameter is the same in both conditions; the stroke grows inward.
      expect(at.width, condition).toBeCloseTo(size, 1);
      expect(at.height, condition).toBeCloseTo(size, 1);
      expect(Number.parseFloat(await css(r, 'border-top-left-radius')), condition).toBe(size / 2);
      expect(await settledCss(r, 'box-shadow'), condition).toBe(`${color} 0px 0px 0px ${thick}px inset`);
      const fill = r.locator('.fill');
      const inner = await fill.evaluate(async (el) => {
        await Promise.all(el.getAnimations().map((a) => a.finished.catch(() => undefined)));
        const rect = el.getBoundingClientRect();
        return { x: rect.x, width: rect.width };
      });
      expect(inner.width, condition).toBeCloseTo(size - 2 * thick - 2 * inset, 1);
      expect(inner.x - at.x, condition).toBeCloseTo(thick + inset, 1);
      expect(await settledCss(fill, 'background-color'), condition).toBe(condition === 'selected' ? await mixed(T('selected-control-color')) : 'rgba(0, 0, 0, 0)');
    }
    // No dot, no glyph, no state layer: the ring and its fill are all there is.
    expect(await row(page, 'radio-checked', 0).locator('.ring').evaluate((el) => el.children.length)).toBe(1);
    await expect(row(page, 'radio-checked', 0).locator('.ring svg, .ring .check')).toHaveCount(0);
    // radio-none-checked: every ring thin. A share that leaves nothing inside: no fill is drawn.
    for (const n of [0, 1]) expect(await settledCss(row(page, 'radio-none-checked', n).locator('.ring'), 'box-shadow')).toContain(`${width}px inset`);
    await override(page, { [T('control-ring-selected-width-share')]: '1' });
    await expect.poll(async () => (await row(page, 'radio-checked', 0).locator('.fill').evaluate(async (el) => {
      await Promise.all(el.getAnimations().map((a) => a.finished.catch(() => undefined)));
      return el.getBoundingClientRect().width;
    }))).toBe(0);
    // A share below the unchecked width: the ring is never thinner than control.ring.width.
    await override(page, { [T('control-ring-selected-width-share')]: '0.05' });
    await expect.poll(() => settledCss(row(page, 'radio-checked', 0).locator('.ring'), 'box-shadow')).toContain(`${width}px inset`);
  });

  test('MNU-41: a change of checked moves the box’s outline and fill, the check on it, the ring’s stroke and its fill over the state motion — nothing moved or resized — the row’s fill with it; at once where motion is reduced', async ({ page }) => {
    const duration = await resolveToken(page, T('motion-state-duration'), 'duration');
    const transitions = async (locator: Locator) => {
      const [properties, durations] = [(await css(locator, 'transition-property')).split(', '), (await css(locator, 'transition-duration')).split(', ').map((v) => Number.parseFloat(v) * 1000)];
      return Object.fromEntries(properties.map((property, i) => [property, durations[i % durations.length]]));
    };
    const unchecked = row(page, 'checkbox-checked', 1);
    expect(await transitions(unchecked.locator('.box'))).toEqual({ 'background-color': duration, 'box-shadow': duration });
    expect((await transitions(unchecked.locator('.box-check'))).opacity).toBe(duration);
    expect(await transitions(row(page, 'radio-checked', 1).locator('.ring'))).toEqual({ 'box-shadow': duration });
    expect(await transitions(row(page, 'radio-checked', 1).locator('.fill'))).toEqual({ inset: duration, 'background-color': duration });
    expect((await transitions(unchecked))['background-color']).toBe(duration);
    // Checked with Space (the menu stays): the transitions run, and the box stays where and as large as it was.
    const watch = (locator: Locator, name: string) =>
      locator.evaluate((el, key) => {
        ((window as any).ran ??= {})[key] = [];
        el.addEventListener('transitionrun', (e) => e.target === el && (window as any).ran[key].push((e as TransitionEvent).propertyName));
      }, name);
    await watch(unchecked.locator('.box'), 'box');
    await watch(unchecked.locator('.box-check'), 'check');
    await item(page, 'checkbox-checked', 1).focus();
    const before = await bounds(unchecked.locator('.box'));
    await page.keyboard.press('Space');
    await expect.poll(() => settledCss(unchecked.locator('.box'), 'background-color')).toBe(await resolveColor(page, T('selected-focused-control-color')));
    const ran = await page.evaluate(() => (window as any).ran);
    expect(ran.box).toEqual(expect.arrayContaining(['background-color', 'box-shadow']));
    expect(ran.check).toContain('opacity');
    expect(await bounds(unchecked.locator('.box'))).toEqual(before);
    expect(await css(unchecked.locator('.box'), 'transform')).toBe('none');
    // A radio item: the stroke thickens inward and the fill follows; the ring's outer box does not change.
    const next = row(page, 'radio-checked', 1);
    await watch(next.locator('.ring'), 'ring');
    await watch(next.locator('.fill'), 'fill');
    await item(page, 'radio-checked', 1).focus();
    const ringBefore = await bounds(next.locator('.ring'));
    await page.keyboard.press('Space');
    await expect.poll(() => page.evaluate(() => (window as any).ran.ring)).toContain('box-shadow');
    expect(await page.evaluate(() => (window as any).ran.fill)).toEqual(expect.arrayContaining(['background-color']));
    await expect.poll(async () => (await settledCss(next.locator('.ring'), 'box-shadow')).includes(`${await resolveToken(page, T('control-ring-width'))}px inset`)).toBe(false);
    expect(await bounds(next.locator('.ring'))).toEqual(ringBefore);
    // The row's fill changes with the mark (MNU-27). Not under a Space: that press is the pressed state, which the overlay
    // draws at once (MNU-16), and at standard contrast the default system gives a checked row no fill (MNU-37), so a row's
    // fill has nothing to move there. At high contrast it has one: the product unchecks a row at rest, after its fill has
    // settled, so what runs is the change of checked and not a focus or a press.
    await inContrast(page, 'high');
    const filled = await settledCss(unchecked, 'background-color');
    await watch(unchecked, 'row');
    await item(page, 'checkbox-checked', 1).evaluate((el: any) => (el.checked = false));
    await expect.poll(() => page.evaluate(() => (window as any).ran.row)).toContain('background-color');
    expect(await settledCss(unchecked, 'background-color')).not.toBe(filled);
    await inContrast(page, null);
    // Where motion is reduced: the new condition whole, at once.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const part of [unchecked.locator('.box'), unchecked.locator('.box-check'), next.locator('.ring'), next.locator('.fill'), unchecked]) expect(await css(part, 'transition-duration')).toBe('0s');
  });

  test('MNU-10: hovered, focused and pressed draw a control look’s box, its check and its ring from the control and control-mark colors of that state, and a glyph mark from its mark color', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() });
    for (const [state, enter] of [
      ['hovered', () => row(page, 'checkbox-checked', 0).hover()],
      ['focused', async () => { await page.mouse.move(0, 0); await item(page, 'checkbox-checked', 1).focus(); await page.keyboard.press('ArrowUp'); }],
      ['pressed', () => page.keyboard.down('Space')],
    ] as const) {
      await enter();
      const b = row(page, 'checkbox-checked', 0).locator('.box');
      await expect.poll(() => settledCss(b, 'background-color'), state).toBe(await resolveColor(page, T(`selected-${state}-control-color`)));
      expect(await settledCss(b.locator('.box-check'), 'color'), state).toBe(await resolveColor(page, T(`selected-${state}-control-mark-color`)));
    }
    await page.keyboard.up('Space');
    await row(page, 'radio-checked', 1).hover();
    await expect.poll(() => settledCss(row(page, 'radio-checked', 1).locator('.ring'), 'box-shadow')).toContain(await resolveColor(page, T('unselected-hovered-control-color')));
    await row(page, 'checkbox-check-mark', 0).hover();
    await expect.poll(() => settledCss(row(page, 'checkbox-check-mark', 0).locator('.check'), 'color')).toBe(await resolveColor(page, T('selected-hovered-mark-color')));
  });

  test('MNU-42: a submenu item is an item’s row that ends in the icon set’s chevron_right, at the trailing icon’s size and color, in the unselected family and fill, its trailing text before it; it has no shortcut, no trailing icon of the product’s and no mark, and the menu draws no chevron of its own', async ({ page }) => {
    const host = labelled(page, 'submenu', 'Open recent');
    const indicator = rowOf(host).locator('.submenu-indicator');
    await expect(indicator).toHaveAttribute('data-drawn', '');
    expect(await indicator.textContent()).toBe('chevron_right');
    await expect(rowOf(host).locator('svg, path')).toHaveCount(0);
    const size = await resolveToken(page, T('trailing-icon-size'));
    expect(await css(indicator, 'font-size')).toBe(`${size}px`);
    expect((await bounds(indicator)).width).toBeCloseTo(size, 1);
    expect(await settledCss(indicator, 'color')).toBe(await resolveColor(page, T('unselected-trailing-icon-color')));
    expect((await css(indicator, '--tanrei-icon-family')).trim()).toBe(await token(page, '--tanrei-sys-icon-family-unselected'));
    expect((await css(indicator, '--tanrei-icon-fill')).trim()).toBe(await token(page, '--tanrei-sys-icon-fill-unselected'));
    // The row is an item's row: as tall, as padded, the label where the other labels are.
    const [own, other] = [await bounds(rowOf(host)), await bounds(row(page, 'submenu', 0))];
    expect(own.height).toBeCloseTo(other.height, 1);
    expect((await bounds(rowOf(host).locator('.label'))).x).toBeCloseTo((await bounds(row(page, 'submenu', 0).locator('.label'))).x, 1);
    const [pad, gap] = [await resolveToken(page, T('container-padding-inline')), await resolveToken(page, T('container-gap'))];
    expect(own.x + own.width - ((await bounds(indicator)).x + size)).toBeCloseTo(pad, 1);
    // Its trailing text is in the trailing column, before the indicator; a row with a shortcut and one with the indicator align.
    const language = rowOf(labelled(page, 'submenu-icons-trailing-text', 'Language'));
    const [text, chevron, shortcut] = [await bounds(language.locator('.trailing-text')), await bounds(language.locator('.submenu-indicator')), await bounds(row(page, 'submenu-icons-trailing-text', 0).locator('.shortcut'))];
    expect(chevron.x - (text.x + text.width)).toBeCloseTo(gap, 1);
    expect(shortcut.x + shortcut.width).toBeCloseTo(text.x + text.width, 1);
    // No shortcut, no trailing icon, no mark: the element has none of those props, and draws none.
    expect(await host.evaluate((el) => ['shortcut', 'trailingIcon', 'markIcon', 'checked'].filter((name) => name in el))).toEqual([]);
    await expect(rowOf(host).locator('.shortcut, .mark .control, .mark .check')).toHaveCount(0);
    // Disabled: the indicator in the disabled trailing-icon color.
    const disabled = rowOf(labelled(page, 'submenu-disabled', 'Open recent')).locator('.submenu-indicator');
    expect(await settledCss(disabled, 'color')).toBe(await resolveColor(page, T('unselected-disabled-trailing-icon-color')));
  });

  test('MNU-19: each surface reserves its own columns; a submenu whose open is true is drawn in place beside its item — comp.menu.submenu.offset from the surface that holds it, its first row level with the item’s row — and one whose open is false draws its row only; mirrored in right-to-left', async ({ page }) => {
    const offset = await resolveToken(page, T('submenu-offset'));
    // submenu-choices: the submenu holds radio and checkbox items, the menu none — the mark column is the submenu's alone.
    await expect(row(page, 'submenu-choices', 0).locator('.column.mark')).toHaveCount(0);
    await expect(rowOf(labelled(page, 'submenu-choices', 'Sort by')).locator('.column.mark')).toHaveCount(0);
    await expect(rowOf(labelled(page, 'submenu-choices', 'Name')).locator('.column.mark')).toHaveCount(1);
    for (const [id, labels] of [['submenu-open', ['Open recent']], ['submenu-two-levels', ['Export', 'Image']], ['submenu-choices', ['Sort by']]] as const) {
      let holder = await bounds(surface(page, id));
      for (const label of labels) {
        const host = labelled(page, id, label);
        expect(await shown(host), `${id} ${label}`).toBe(true);
        const own = await surfaceBox(host);
        expect(own.x, `${id} ${label}`).toBeCloseTo(holder.x + holder.width + offset, 1);
        const first = host.locator('> tanrei-menu-item, > tanrei-menu-group').first();
        expect((await bounds(first)).y, `${id} ${label}`).toBeCloseTo((await bounds(rowOf(host))).y, 1);
        // In place: without the open motion, and inside the fixture's stage.
        expect(await css(ownSurface(host), 'animation-name')).toBe('none');
        const stage = await bounds(page.locator(`[data-fixture="${id}"]`));
        expect(own.x + own.width, `${id} ${label}`).toBeLessThanOrEqual(stage.x + stage.width);
        expect(own.y + own.height, `${id} ${label}`).toBeLessThanOrEqual(stage.y + stage.height);
        holder = own;
      }
    }
    // Right-to-left: to the left of the menu, the same distance.
    const [root, own] = [await bounds(surface(page, 'submenu-open-rtl')), await surfaceBox(labelled(page, 'submenu-open-rtl', 'Open recent'))];
    expect(own.x + own.width).toBeCloseTo(root.x - offset, 1);
    expect(own.x).toBeGreaterThanOrEqual((await bounds(page.locator('[data-fixture="submenu-open-rtl"]'))).x);
    // open false: the row only. Drawn in place, nothing took focus.
    expect(await shown(labelled(page, 'submenu', 'Open recent'))).toBe(false);
    await expect(ownSurface(labelled(page, 'submenu', 'Open recent'))).toBeHidden();
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  });

  test('MNU-33: in right-to-left the submenu indicator and a glyph a mark-icon names are drawn mirrored exactly when the icon set marks their names, in their own boxes; the check of a mark and the check in a checked box never are; nothing is mirrored in left-to-right', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...spec.fixtures, inline('named', [cb('Forward', { checked: true, markIcon: 'arrow_forward' }), cb('Star', { checked: true, markIcon: 'star' }), cb('Check', { checked: true, markIcon: 'check' }), cb('Box', { checked: true })])] });
    const indicator = rowOf(labelled(page, 'submenu-open-rtl', 'Open recent')).locator('.submenu-indicator');
    const mirrored = (locator: Locator) => css(locator, 'transform').then((value) => value !== 'none');
    // chevron_right is marked by the default icon set: it points to the left, the side its submenu opens on.
    await expect(indicator).toHaveAttribute('data-tanrei-mirrored', '');
    expect(await mirrored(indicator)).toBe(true);
    // The same glyph in a left-to-right layout carries the mark and is not mirrored.
    const ltr = rowOf(labelled(page, 'submenu-open', 'Open recent')).locator('.submenu-indicator');
    await expect(ltr).toHaveAttribute('data-tanrei-mirrored', '');
    expect(await mirrored(ltr)).toBe(false);
    const glyph = (n: number) => row(page, 'named', n).locator('.check').first();
    for (const n of [0, 1, 2, 3]) expect(await mirrored(glyph(n)), `ltr ${n}`).toBe(false);
    const before = await bounds(glyph(0));
    await page.locator('[data-fixture="named"]').evaluate((el) => el.setAttribute('dir', 'rtl'));
    // arrow_forward is marked, star is not; the check — named, or on a box — never is.
    expect(await mirrored(glyph(0))).toBe(true);
    expect(await mirrored(glyph(1))).toBe(false);
    expect(await mirrored(glyph(2))).toBe(false);
    expect(await mirrored(glyph(3))).toBe(false);
    await expect(glyph(3)).not.toHaveAttribute('data-tanrei-mirrored');
    // Mirrored inside its own box: the same size, at the row's start edge.
    const after = await bounds(glyph(0));
    expect(after.width).toBeCloseTo(before.width, 1);
    const r = await bounds(row(page, 'named', 0));
    expect(r.x + r.width - (after.x + after.width)).toBeCloseTo(await resolveToken(page, T('container-padding-inline')), 1);
  });
});

// ── Link items (MNU-53 … MNU-58, with MNU-6, MNU-19 and MNU-24) ──

/** A link item, as a fixture lists it. */
const link = (label: string, href: string, props: FixtureItem['props'] = {}): FixtureItem => it(label, { href, ...props });
/** Links to places of the page itself, so that following one is seen (`location.hash`) and nothing is unloaded. */
const PLACES = [link('Guides', '#guides'), link('Components', '#components'), link('Source', '#source', { target: 'new', targetLabel: 'opens in a new tab' }), link('Archive', '#archive', { disabled: true })];
/** The anchor of a link item: its row. */
const linkRow = (page: P, id: string, label: string) => rowOf(labelled(page, id, label));
/** The Chromium accessibility nodes under the menus of the page, over the DevTools protocol: what the browser computed. */
async function axItems(page: P) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  const byId = new Map(nodes.map((node) => [node.nodeId, node]));
  const inMenu = (node: (typeof nodes)[number]) => {
    for (let at = node.parentId ? byId.get(node.parentId) : undefined; at; at = at.parentId ? byId.get(at.parentId) : undefined) if (!at.ignored && at.role?.value === 'menu') return true;
    return false;
  };
  return nodes
    .filter((node) => !node.ignored && inMenu(node) && ['menuitem', 'menuitemcheckbox', 'menuitemradio', 'link', 'button'].includes(node.role?.value as string))
    .map((node) => {
      const property = (name: string) => node.properties?.find((p) => p.name === name)?.value?.value;
      return { role: node.role?.value as string, name: (node.name?.value ?? '') as string, description: (node.description?.value ?? '') as string, disabled: property('disabled') === true, focused: property('focused') === true };
    });
}
/** The product's side for a menu of links: every click that reaches the window is logged with whether it was cancelled, and where the page was when `close` came. */
const wireLinks = (page: P) =>
  page.evaluate(() => {
    const log = (window as any).log as string[];
    for (const m of document.querySelectorAll<any>('tanrei-menu')) m.addEventListener('close', () => log.push(`at:${location.hash}`), { capture: true });
    for (const type of ['click', 'auxclick']) {
      window.addEventListener(type, (event) => {
        const mouse = event as MouseEvent;
        const item = (event.composedPath() as Element[]).find((node) => node.localName === 'tanrei-menu-item') as any;
        if (!item) return;
        const elsewhere = mouse.ctrlKey || mouse.metaKey || mouse.shiftKey || mouse.altKey || mouse.button !== 0;
        if (elsewhere) {
          log.push(`${type}:${item.label}:${event.defaultPrevented ? 'prevented' : 'left to the browser'}`);
          // Read, then held back by the test itself, so that no tab or window is opened.
          event.preventDefault();
        }
      });
    }
  });

test.describe('link items', () => {
  test('MNU-53: an item with href is the browser’s own link — an anchor with the address, the menu item role and no tab stop — exposed once, as a menu item and not as a link; the host is nothing; it is drawn exactly as an action at rest, hovered and pressed', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...spec.fixtures.filter((f) => f.id === 'links' || f.id === 'actions'), inline('twins', [link('Twin', '/guides/'), it('Twin')])] });
    for (const [label, href] of [['Guides', '/guides/'], ['Components', '/components/'], ['Source', 'https://example.com/tanrei']] as const) {
      const host = labelled(page, 'links', label);
      expect(await anchorOf(host), label).toMatchObject({ tag: 'a', href, role: 'menuitem', tabindex: '-1', disabled: null });
      // The host says nothing and takes no focus of its own: the item is exposed once.
      for (const name of ['role', 'tabindex', 'aria-label', 'aria-description', 'aria-posinset', 'aria-setsize', 'aria-disabled']) await expect(host, `${label} ${name}`).not.toHaveAttribute(name);
      await expect(linkRow(page, 'links', label)).toHaveAttribute('aria-label', label);
      await expect(linkRow(page, 'links', label)).toHaveAttribute('aria-setsize', '4');
    }
    await expect(linkRow(page, 'links', 'Components')).toHaveAttribute('aria-posinset', '2');
    const links = page.locator('[data-fixture="links"]');
    await expect(links.getByRole('menuitem')).toHaveCount(4);
    await expect(links.getByRole('link')).toHaveCount(0);
    await expect(links.getByRole('menuitem', { name: 'Guides' })).toHaveAttribute('href', '/guides/');
    // An action beside it is what it was: its host is the menu item.
    await expect(labelled(page, 'twins', 'Twin').nth(1)).toHaveAttribute('role', 'menuitem');
    await expect(labelled(page, 'twins', 'Twin').nth(1)).toHaveAttribute('tabindex', '-1');
    expect((await anchorOf(labelled(page, 'twins', 'Twin').nth(1))).tag).toBe('div');
    if (browserName === 'chromium') {
      // What the browser computed: four menu items, none of them a link, each named by its label.
      const tree = (await axItems(page)).filter((node) => ['Guides', 'Components', 'Source', 'Archive'].includes(node.name));
      expect(tree.map((node) => `${node.role}:${node.name}`)).toEqual(['menuitem:Guides', 'menuitem:Components', 'menuitem:Source', 'menuitem:Archive']);
      // The link and the action beside it are the same thing to assistive technology.
      expect((await axItems(page)).filter((node) => node.name === 'Twin').map((node) => node.role)).toEqual(['menuitem', 'menuitem']);
      expect((await axItems(page)).filter((node) => node.role === 'link')).toEqual([]);
    }
    // D1: no look of its own — the same paint and size as the action beside it, in every state a pointer gives.
    await expectDrawnAlike(page, labelled(page, 'twins', 'Twin').nth(0), labelled(page, 'twins', 'Twin').nth(1));
    // The fixture's rows are the rows of `actions`: as tall, the label in the same place and color.
    const [a, b] = [await bounds(row(page, 'actions', 0)), await bounds(row(page, 'links', 0))];
    expect(b.height).toBeCloseTo(a.height, 1);
    expect((await bounds(row(page, 'links', 0).locator('.label'))).x - b.x).toBeCloseTo((await bounds(row(page, 'actions', 0).locator('.label'))).x - a.x, 1);
    expect(await settledCss(row(page, 'links', 0).locator('.label'), 'color')).toBe(await settledCss(row(page, 'actions', 0).locator('.label'), 'color'));
    expect(await css(row(page, 'links', 0), 'text-decoration-line')).toBe('none');
    // No look for a destination already visited: nothing in the item's styles names one.
    expect(await labelled(page, 'links', 'Guides').evaluate((el) => [...el.shadowRoot!.adoptedStyleSheets].some((sheet) => [...sheet.cssRules].some((rule) => rule.cssText.includes(':visited'))))).toBe(false);
  });

  test('MNU-58: a link item that is current is exposed as the current page on its anchor, still a menu item, and drawn from the current condition — the fill of the row the person is on, in every contrast scheme, apart from a checked row’s — with no mark and its label’s own weight; current without a destination is ignored and reported; the menu never sets it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, fixtures: spec.fixtures.filter((f) => f.id === 'links-current') });
    const [guides, components] = [linkRow(page, 'links-current', 'Guides'), linkRow(page, 'links-current', 'Components')];
    await expect(components).toHaveAttribute('aria-current', 'page');
    await expect(guides).not.toHaveAttribute('aria-current');
    await expect(labelled(page, 'links-current', 'Components')).not.toHaveAttribute('aria-current');
    expect(await anchorOf(labelled(page, 'links-current', 'Components'))).toMatchObject({ tag: 'a', href: '/components/', role: 'menuitem', tabindex: '-1' });
    const fixture = page.locator('[data-fixture="links-current"]');
    await expect(fixture.getByRole('menuitem')).toHaveCount(3);
    await expect(fixture.getByRole('link')).toHaveCount(0);
    // The current condition: its own fill and colors, and the other rows as actions are drawn. Its fill is not a
    // checked row's: at standard contrast the default system gives a checked row none and keeps this one (MNU-37).
    await page.mouse.move(0, 0);
    for (const level of [null, 'medium', 'high'] as const) {
      await inContrast(page, level);
      const current = await expected(page, 'current');
      expect(current.bg, `${level ?? 'standard'}: filled`).not.toBe((await expected(page, 'unselected')).bg);
      await expect.poll(() => drawn(page, 'links-current', 1), level ?? 'standard').toEqual(current);
      await expect.poll(() => drawn(page, 'links-current', 0), level ?? 'standard').toEqual(await expected(page, 'unselected'));
    }
    await inContrast(page, null);
    expect((await expected(page, 'current')).bg).not.toBe((await expected(page, 'selected')).bg);
    // No mark, and the label's own weight: a fill, never a check or a heavier label.
    await expect(components.locator('.check')).toHaveCount(0);
    expect(await css(components.locator('.label'), 'font-weight')).toBe(await css(guides.locator('.label'), 'font-weight'));
    expect((await bounds(components)).height).toBeCloseTo((await bounds(guides)).height, 1);
    expect(seen.filter((text) => text.includes('MNU-58'))).toEqual([]);
    // The product moves it; the menu sets nothing of its own.
    await labelled(page, 'links-current', 'Components').evaluate((el: any) => (el.current = false));
    await labelled(page, 'links-current', 'Guides').evaluate((el: any) => (el.current = true));
    await expect(guides).toHaveAttribute('aria-current', 'page');
    await expect(components).not.toHaveAttribute('aria-current');
    await expect.poll(() => drawn(page, 'links-current', 0)).toEqual(await expected(page, 'current'));
    // Without a destination current is ignored — no state, no fill — and a debug build says so.
    await labelled(page, 'links-current', 'Guides').evaluate((el: any) => (el.href = ''));
    await expect.poll(() => seen.some((text) => text.includes('MNU-58') && text.includes('no destination'))).toBe(true);
    await expect.poll(() => drawn(page, 'links-current', 0)).toEqual(await expected(page, 'unselected'));
    await expect(labelled(page, 'links-current', 'Guides')).not.toHaveAttribute('aria-current');
  });

  test('MNU-53: the arrow keys, Home, End and typed characters move between link items as between actions, focus on the anchor, with the ring for a key and without it for the pointer; Tab closes the menu and is never a stop; an item that becomes a link under focus keeps it', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { fixtures: [overlay('places', [...PLACES, it('Sign out')])] });
    await wire(page);
    await anchor(page, 'places').click();
    await expect.poll(() => isOpen(page, 'places')).toBe(true);
    await expect.poll(() => focused(page)).toBe('Guides');
    // Focus is the anchor's: the element that is the menu item.
    const active = () => page.evaluate(() => (document.activeElement?.shadowRoot?.activeElement ?? document.activeElement)?.localName);
    expect(await active()).toBe('a');
    const path: string[] = [];
    for (const key of ['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'End', 'Home', 'ArrowUp', 'c']) {
      await page.keyboard.press(key);
      path.push(`${key} → ${await focused(page)}`);
    }
    expect(path).toEqual(['ArrowDown → Components', 'ArrowDown → Source', 'ArrowDown → Archive', 'ArrowDown → Sign out', 'ArrowDown → Guides', 'End → Sign out', 'Home → Guides', 'ArrowUp → Sign out', 'c → Components']);
    if (browserName === 'chromium') expect((await axItems(page)).filter((node) => node.focused).map((node) => `${node.role}:${node.name}`)).toEqual(['menuitem:Components']);
    // The ring is the row's, inside it, for a key (MNU-11).
    await page.keyboard.press('Home');
    const outer = await resolveToken(page, '--tanrei-sys-focus-outer-width');
    await expect(linkRow(page, 'places', 'Guides')).toHaveCSS('outline-style', 'solid');
    await expect(linkRow(page, 'places', 'Guides')).toHaveCSS('outline-width', `${outer}px`);
    expect(await settledCss(linkRow(page, 'places', 'Guides'), 'background-color')).toBe(await resolveColor(page, T('unselected-focused-container-color')));
    // The pointer moves focus there without it (MNU-8), and the arrows continue from it.
    await linkRow(page, 'places', 'Components').hover();
    await expect.poll(() => focused(page)).toBe('Components');
    await expect(linkRow(page, 'places', 'Components')).toHaveCSS('outline-style', 'none');
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('Source');
    // An action that is given an address while it has focus is still where focus is, and one that loses it too.
    await page.keyboard.press('End');
    await labelled(page, 'places', 'Sign out').evaluate((el: any) => (el.href = '#out'));
    await expect.poll(async () => (await anchorOf(labelled(page, 'places', 'Sign out'))).tag).toBe('a');
    expect([await focused(page), await active()]).toEqual(['Sign out', 'a']);
    await labelled(page, 'places', 'Sign out').evaluate((el: any) => (el.href = ''));
    await expect.poll(async () => (await anchorOf(labelled(page, 'places', 'Sign out'))).tag).toBe('div');
    expect([await focused(page), await active()]).toEqual(['Sign out', 'tanrei-menu-item']);
    expect(await isOpen(page, 'places')).toBe(true);
    expect(await log(page)).toEqual([]);
    // Tab closes the menu instead of moving to the next link.
    await page.keyboard.press('Home');
    await tab(page);
    await expect.poll(() => isOpen(page, 'places')).toBe(false);
    expect(await log(page)).toEqual(['close:tab']);
    expect(await page.evaluate(() => !!document.activeElement?.closest('tanrei-menu'))).toBe(false);
  });

  test('MNU-54, MNU-6: Enter, Space, a click and click() on a link item each emit its click once, then close with the reason item, then follow the link — at once, not after press-hold; Space scrolls nothing; a cancelled click still closes and opens nothing', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [overlay('places', PLACES)] });
    await override(page, { '--tanrei-sys-motion-duration-press-hold': '2000ms' });
    await page.evaluate(() => (document.body.style.minBlockSize = '400vh'));
    await wire(page);
    await wireLinks(page);
    const hash = () => page.evaluate(() => location.hash);
    const said = async () => {
      const all = await log(page);
      await page.evaluate(() => {
        (window as any).log.length = 0;
        history.replaceState(null, '', '#');
      });
      return all;
    };
    const open = async () => {
      await anchor(page, 'places').click();
      await expect.poll(() => isOpen(page, 'places')).toBe(true);
      await expect.poll(() => focused(page)).toBe('Guides');
    };
    // Enter: the click, then close — while the page is still where it was — then the address, with the press still shown.
    await open();
    // (Whether the press is still shown is read in the page as the address changes: the menu has closed by then, the
    // press lasts press-hold from the key on, and two answers of a slow runner are most of those 2 s.)
    await linkRow(page, 'places', 'Guides').evaluate((el) => addEventListener('hashchange', () => ((window as any).pressedAsFollowed = el.getAttribute('data-pressed') ?? ''), { once: true }));
    await page.keyboard.down('Enter');
    await expect.poll(hash).toBe('#guides');
    await expect.poll(() => page.evaluate(() => (window as any).pressedAsFollowed as string | undefined)).toMatch(/.+/);
    await page.keyboard.up('Enter');
    await expect.poll(() => isOpen(page, 'places')).toBe(false);
    expect(await said()).toEqual(['click:Guides', 'at:', 'close:item']);
    // Space: exactly as Enter, and the page behind does not scroll.
    await open();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');
    await expect.poll(hash).toBe('#components');
    await expect.poll(() => isOpen(page, 'places')).toBe(false);
    expect(await said()).toEqual(['click:Components', 'at:', 'close:item']);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    // A pointer.
    await open();
    await linkRow(page, 'places', 'Components').click();
    await expect.poll(hash).toBe('#components');
    expect(await said()).toEqual(['click:Components', 'at:', 'close:item']);
    await expect.poll(() => isOpen(page, 'places')).toBe(false);
    // click() — the default action of assistive technology.
    await open();
    await labelled(page, 'places', 'Guides').evaluate((el: HTMLElement) => el.click());
    await expect.poll(hash).toBe('#guides');
    expect(await said()).toEqual(['click:Guides', 'at:', 'close:item']);
    await expect.poll(() => isOpen(page, 'places')).toBe(false);
    // The product's router takes the navigation: the click is cancelled, the menu still closes, nothing opens.
    await labelled(page, 'places', 'Guides').evaluate((el) => el.addEventListener('click', (event) => event.preventDefault()));
    for (const activate of [() => page.keyboard.press('Enter'), () => page.keyboard.press('Space'), () => linkRow(page, 'places', 'Guides').click()]) {
      await open();
      await activate();
      await expect.poll(() => isOpen(page, 'places')).toBe(false);
      expect(await hash()).toBe('');
      expect(await said()).toEqual(['click:Guides', 'at:', 'close:item']);
    }
  });

  test('MNU-54: a control-click, a command-click, a shift-click, a middle click and Enter with a modifier key on a link item are left to the browser — none prevented, no close, the menu open at every level and focus on the item; a link item in an open submenu closes both surfaces with one close', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [overlay('places', [...PLACES.slice(0, 2), sub('Language', [link('English', '#en'), link('日本語', '#ja')])])] });
    await wire(page);
    await wireLinks(page);
    await anchor(page, 'places').click();
    await expect.poll(() => isOpen(page, 'places')).toBe(true);
    const guides = linkRow(page, 'places', 'Guides');
    for (const [press, heard] of [
      [() => guides.click({ modifiers: ['ControlOrMeta'] }), 'click'],
      [() => guides.click({ modifiers: ['Control'] }), 'click'],
      [() => guides.click({ modifiers: ['Meta'] }), 'click'],
      [() => guides.click({ modifiers: ['Shift'] }), 'click'],
      [() => guides.click({ button: 'middle' }), 'auxclick'],
    ] as const) {
      await press();
      const all = await log(page);
      await page.evaluate(() => ((window as any).log.length = 0));
      // What reached the page — the item's own click, the platform's report of the press — was not prevented by the
      // menu, and no close followed; a browser that sends no click for a press (a control-click that opens the context
      // menu on macOS) sends the menu nothing to answer either.
      expect(all.filter((each) => each !== 'click:Guides' && each !== `${heard}:Guides:left to the browser`)).toEqual([]);
      expect(await isOpen(page, 'places')).toBe(true);
      expect(await focused(page)).toBe('Guides');
    }
    // Enter with a modifier key is the anchor's: the browser's own click, with the modifier, uncancelled.
    await page.keyboard.press('Home');
    for (const chord of ['ControlOrMeta+Enter', 'Shift+Enter']) {
      await page.keyboard.press(chord);
      expect((await log(page)).filter((each) => each !== 'click:Guides' && each !== 'click:Guides:left to the browser')).toEqual([]);
      expect(await isOpen(page, 'places')).toBe(true);
      expect(await focused(page)).toBe('Guides');
    }
    expect(await page.evaluate(() => location.hash)).toBe('');
    expect(page.context().pages().length).toBe(1);
    await page.evaluate(() => ((window as any).log.length = 0));
    // In an open submenu: the same, and a plain activation closes every level with one close.
    await page.keyboard.press('End');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => focused(page)).toBe('English');
    await linkRow(page, 'places', '日本語').click({ modifiers: ['Shift'] });
    expect(await shown(labelled(page, 'places', 'Language'))).toBe(true);
    expect((await log(page)).filter((each) => /^close|^toggle:Language:false/.test(each))).toEqual([]);
    await page.evaluate(() => ((window as any).log.length = 0));
    await page.keyboard.press('Enter');
    await expect.poll(() => isOpen(page, 'places')).toBe(false);
    expect(await log(page)).toEqual(['click:日本語', 'at:', 'close:item']);
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#ja');
    await expect.poll(() => shown(labelled(page, 'places', 'Language'))).toBe(false);
  });

  test('MNU-55, MNU-19, MNU-24: a link item whose target is new opens a new tab that has no handle to its opener, ends in the icon set’s open_in_new in the trailing icon column — at the trailing icon’s size and color, hidden, every row keeping the column — and is described by targetLabel; without the words it still renders and is reported', async ({ page, browserName }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, fixtures: [...spec.fixtures.filter((f) => f.id === 'links'), inline('own', [link('Delete forever', '/gone/', { target: 'new', targetLabel: 'opens in a new tab', destructive: true, supportingText: 'Cannot be undone' }), link('Quiet', '/quiet/', { target: 'new' }), link('Here', '/here/', { targetLabel: 'ignored' })])] });
    const size = await resolveToken(page, T('trailing-icon-size'));
    expect(size).toBe(24);
    const source = labelled(page, 'links', 'Source');
    await expect(linkRow(page, 'links', 'Source').locator('.link-mark')).toHaveAttribute('data-drawn', '');
    const mark = (await markOf(source, '.link-mark'))!;
    expect(mark).toMatchObject({ glyph: 'open_in_new', hidden: true, width: size, height: size, transform: 'none' });
    expect(await settledCss(linkRow(page, 'links', 'Source').locator('.link-mark'), 'color')).toBe(await resolveColor(page, T('unselected-trailing-icon-color')));
    expect(await css(linkRow(page, 'links', 'Source').locator('.link-mark'), 'font-size')).toBe(`${size}px`);
    const pad = await resolveToken(page, T('container-padding-inline'));
    expect(mark.right).toBeCloseTo(pad, 1);
    await expect(linkRow(page, 'links', 'Source')).toHaveAttribute('part', 'container');
    await expect(linkRow(page, 'links', 'Source').locator('.link-mark')).toHaveAttribute('part', 'trailing-icon link-mark');
    // No other row has one, and every row of the surface keeps the column, so the labels' room is the same.
    for (const label of ['Guides', 'Components', 'Archive']) {
      await expect(linkRow(page, 'links', label).locator('.link-mark'), label).toHaveCount(0);
      await expect(linkRow(page, 'links', label).locator('.trailing-icon-column'), label).toHaveCount(1);
      expect((await bounds(linkRow(page, 'links', label).locator('.text'))).width, label).toBeCloseTo((await bounds(linkRow(page, 'links', 'Source').locator('.text'))).width, 1);
    }
    // Said: the words end the description, after the supporting text.
    await expect(linkRow(page, 'links', 'Source')).toHaveAttribute('aria-description', 'opens in a new tab');
    await expect(page.locator('[data-fixture="links"]').getByRole('menuitem', { name: 'Source' })).toHaveAccessibleDescription('opens in a new tab');
    await expect(linkRow(page, 'own', 'Delete forever')).toHaveAttribute('aria-description', 'Cannot be undone, opens in a new tab');
    if (browserName === 'chromium') expect((await axItems(page)).find((node) => node.name === 'Source')).toMatchObject({ role: 'menuitem', description: 'opens in a new tab' });
    // A destructive link item's mark is in the destructive trailing-icon color.
    expect(await settledCss(linkRow(page, 'own', 'Delete forever').locator('.link-mark'), 'color')).toBe(await resolveColor(page, T('destructive-trailing-icon-color')));
    // A new context that is not said still renders, marked, and a debug build reports it once; in place, the words are ignored.
    await expect(linkRow(page, 'own', 'Quiet').locator('.link-mark')).toHaveCount(1);
    await expect(linkRow(page, 'own', 'Quiet')).not.toHaveAttribute('aria-description');
    await expect.poll(() => seen.filter((w) => w.includes('(MNU-55)') && w.includes('targetLabel is empty')).length).toBe(1);
    await expect(linkRow(page, 'own', 'Here').locator('.link-mark')).toHaveCount(0);
    await expect(linkRow(page, 'own', 'Here')).not.toHaveAttribute('aria-description');
    await expect(linkRow(page, 'own', 'Here')).not.toHaveAttribute('target');
    // D6: `_blank` with `noopener`; the page it opens has no handle to the one that opened it.
    await expectNewContext(page, labelled(page, 'own', 'Quiet'));
  });

  test('MNU-55, MNU-33: in links-rtl the mark is at the left, mirrored by the icon helper; in links-trailing a shortcut keeps its column and draws no mark, trailing text and the mark stand side by side, the product’s own trailing icon stands and no mark is added, and the mark is in the column the submenu indicator stands in', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: spec.fixtures.filter((f) => f.id === 'links' || f.id === 'links-rtl' || f.id === 'links-trailing') });
    const pad = await resolveToken(page, T('container-padding-inline'));
    const gap = await resolveToken(page, T('container-gap'));
    const rtl = (await markOf(labelled(page, 'links-rtl', 'Source'), '.link-mark'))!;
    expect(rtl).toMatchObject({ glyph: 'open_in_new', hidden: true, mirrored: true, transform: MIRRORED });
    expect(rtl.left).toBeCloseTo(pad, 1);
    // The same glyph in a left-to-right layout carries the icon set's mark and is not mirrored.
    expect(await markOf(labelled(page, 'links', 'Source'), '.link-mark')).toMatchObject({ mirrored: true, transform: 'none' });
    // A shortcut: its own column, no mark (the link opens in place), the trailing icon column kept after it.
    const search = linkRow(page, 'links-trailing', 'Search the docs');
    await expect(search.locator('.shortcut')).toHaveCount(1);
    await expect(search.locator('.link-mark')).toHaveCount(0);
    await expect(search.locator('.trailing-icon-column.reserved')).toHaveCount(1);
    await expect(search).toHaveAttribute('aria-keyshortcuts', 'Meta+K');
    // Trailing text and the mark, side by side: the text in the column before, a gap apart.
    const notes = linkRow(page, 'links-trailing', 'Release notes');
    const [text, mark] = [await bounds(notes.locator('.trailing-text')), await bounds(notes.locator('.link-mark'))];
    expect(mark.x - (text.x + text.width)).toBeCloseTo(gap, 1);
    await expect(notes).toHaveAttribute('aria-description', 'New, opens in a new tab');
    // The product's own glyph stands, and no mark is added; the words are still said.
    const report = linkRow(page, 'links-trailing', 'Report a problem');
    await expect(report.locator('.link-mark')).toHaveCount(0);
    expect(await report.locator('.trailing-icon').textContent()).toBe('bug_report');
    await expect(report).toHaveAttribute('aria-description', 'opens in a new tab');
    await expect(report).toHaveAttribute('target', '_blank');
    // The mark stands in the column the submenu indicator below it stands in.
    const indicator = await bounds(rowOf(labelled(page, 'links-trailing', 'Language')).locator('.submenu-indicator'));
    expect(mark.x).toBeCloseTo(indicator.x, 1);
    expect(mark.width).toBeCloseTo(indicator.width, 1);
    // The submenu's rows are link items too, of its own surface.
    expect(await anchorOf(labelled(page, 'links-trailing', 'English'))).toMatchObject({ tag: 'a', href: '/en/', role: 'menuitem' });
  });

  test('MNU-30: a check that was marked drawable in the turn of a render is taken back when its font is gone again before a frame was drawn', async ({ page }) => {
    // The mark is written by two readers: the shared
    // ResizeObserver, which hears the ink's width change, and the read a host makes in the turn of its render or when
    // a face has loaded. The observer compares with the width it last reported — so a glyph the second reader marked
    // (narrow: the ligature) while the observer had last reported the name spelled out (wide) was never read again
    // when it went back to wide before a frame: the same width as the observer knew, and no report. Here the face
    // arrives, the item renders and the family is taken away again in one task, which is what a busy machine made of
    // «the faces are ready» followed by `withoutIconFont()`.
    await mountFixtures(page, spec, { icons: true, fixtures: spec.fixtures.filter((f) => f.id === 'checkbox-check-mark') });
    const check = row(page, 'checkbox-check-mark', 0).locator('.check');
    await expect(check).toHaveAttribute('data-drawn', '');
    const family = await withoutIconFont(page);
    await expect(check).not.toHaveAttribute('data-drawn');
    // Two frames, so that the observer's last report is the wide ink.
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const marked = await check.evaluate(async (glyph, name) => {
      const root = document.documentElement;
      const families = ['selected', 'unselected'].map((s) => `--tanrei-sys-icon-family-${s}`);
      const host = (glyph.getRootNode() as ShadowRoot).host as HTMLElement & { requestUpdate(): void; updateComplete: Promise<unknown> };
      for (const each of families) root.style.removeProperty(each);
      host.requestUpdate();
      await host.updateComplete;
      for (let turn = 0; turn < 4; turn++) await Promise.resolve();
      const was = glyph.hasAttribute('data-drawn');
      for (const each of families) root.style.setProperty(each, `"${name}"`);
      return was;
    }, family);
    expect(marked, 'the render read the ligature and marked it').toBe(true);
    await expect(check).not.toHaveAttribute('data-drawn');
    await expect(check).toHaveCSS('visibility', 'hidden');
    // And the other way: the face is back, and the glyph with it.
    await rootTokens(page, { '--tanrei-sys-icon-family-selected': '', '--tanrei-sys-icon-family-unselected': '' });
    // The mark is written by the observer, with the next frame the page draws. The check is not painted now, and it
    // is all of this page that the face changes: WebKit on Linux draws no frame for a change that paints nothing, and
    // the ink — 24 px wide in its 24 px box again — stays unmarked for as long as the test waits, where the other
    // engines, and WebKit on macOS, report it. A page draws frames for other reasons; this one is asked for one.
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
    await expect(check).toHaveAttribute('data-drawn', '');
  });

  test('MNU-55, MNU-30: until the icon set can draw the mark nothing is drawn in its place, never its name, and the column keeps its width', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: spec.fixtures.filter((f) => f.id === 'links') });
    await withoutIconFont(page);
    const mark = linkRow(page, 'links', 'Source').locator('.link-mark');
    await expect(mark).not.toHaveAttribute('data-drawn');
    await expect(mark).toHaveCSS('visibility', 'hidden');
    expect((await bounds(linkRow(page, 'links', 'Source').locator('.trailing-icon-column'))).width).toBeCloseTo(await resolveToken(page, T('trailing-icon-size')), 1);
    await iconFaceArrives(page);
    await expect(mark).toHaveAttribute('data-drawn', '');
    await expect(mark).toHaveCSS('visibility', 'visible');
  });

  test('MNU-56: a disabled link item is the anchor without an address, a disabled menu item drawn from the disabled tokens with its mark; the arrow keys reach it, and Enter, Space, a click, a control-click and click() do nothing and leave the menu open', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...spec.fixtures.filter((f) => f.id === 'links'), overlay('places', [...PLACES, link('Elsewhere', '#elsewhere', { target: 'new', targetLabel: 'opens in a new tab', disabled: true })])] });
    expect(await anchorOf(labelled(page, 'links', 'Archive'))).toMatchObject({ tag: 'a', href: null, target: null, rel: null, role: 'menuitem', disabled: 'true', tabindex: '-1' });
    await expect(page.locator('[data-fixture="links"]').getByRole('menuitem', { name: 'Archive', disabled: true })).toHaveCount(1);
    if (browserName === 'chromium') expect((await axItems(page)).find((node) => node.name === 'Archive')).toMatchObject({ role: 'menuitem', disabled: true });
    await page.mouse.move(1, 1);
    await expect.poll(() => drawn(page, 'links', 3)).toEqual(await expected(page, 'unselected', 'disabled'));
    await wire(page);
    await wireLinks(page);
    await anchor(page, 'places').click();
    await expect.poll(() => isOpen(page, 'places')).toBe(true);
    // The open motion draws the surface from no height at all: a row is pressed where it stands once the motion has
    // ended, never while it is still a sliver that no pointer can be put on.
    await surface(page, 'places').evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished.catch(() => undefined))));
    expect((await bounds(linkRow(page, 'places', 'Archive'))).height).toBeCloseTo((await bounds(linkRow(page, 'places', 'Guides'))).height, 1);
    // The mark stays with it, in the disabled trailing-icon color.
    const mark = linkRow(page, 'places', 'Elsewhere').locator('.link-mark');
    await expect(mark).toHaveCount(1);
    expect(await settledCss(mark, 'color')).toBe(await resolveColor(page, T('unselected-disabled-trailing-icon-color')));
    expect(await anchorOf(labelled(page, 'places', 'Elsewhere'))).toMatchObject({ href: null, target: null, disabled: 'true' });
    for (const key of ['ArrowDown', 'ArrowDown', 'ArrowDown']) await page.keyboard.press(key);
    expect(await focused(page)).toBe('Archive');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await linkRow(page, 'places', 'Archive').click({ force: true });
    await linkRow(page, 'places', 'Archive').click({ force: true, modifiers: ['ControlOrMeta'] });
    await labelled(page, 'places', 'Archive').evaluate((el: HTMLElement) => el.click());
    await linkRow(page, 'places', 'Archive').evaluate((el: HTMLElement) => el.click());
    await expect(linkRow(page, 'places', 'Archive')).not.toHaveAttribute('data-pressed');
    // Not even its click: a disabled item emits none (MNU-9).
    expect(await log(page)).toEqual([]);
    expect(await isOpen(page, 'places')).toBe(true);
    expect(await page.evaluate(() => location.hash)).toBe('');
    expect(page.context().pages().length).toBe(1);
    // Enabled again, it is a link again.
    await labelled(page, 'places', 'Archive').evaluate((el: any) => (el.disabled = false));
    await expect(linkRow(page, 'places', 'Archive')).toHaveAttribute('href', '#archive');
    await expect(linkRow(page, 'places', 'Archive')).not.toHaveAttribute('aria-disabled');
  });

  test('MNU-57: an href on a checkbox item, a radio item or a submenu item changes nothing about it and is reported once; an unknown target is same, white space is no destination, and a script or an unreadable address makes the item an action, reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [inline('kinds', [cb('Wrap', { checked: false }), group({ title: 'Size', value: 's' }, [radio('Small', 's'), radio('Large', 'l')]), sub('More', [it('Deeper')]), it('Plain')])] });
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('tanrei-menu-checkbox-item, tanrei-menu-radio-item, tanrei-submenu')) {
        el.setAttribute('href', '/somewhere/');
        el.setAttribute('target', 'new');
        (el as any).requestUpdate();
      }
    });
    for (const [what, count] of [['a checkbox item', 1], ['a radio item', 2], ['a submenu item', 1]] as const) {
      await expect.poll(() => seen.filter((w) => w.includes('(MNU-57)') && w.includes(`${what} cannot be a link`)).length, what).toBe(count);
    }
    const kinds = page.locator('[data-fixture="kinds"]');
    await expect(kinds.getByRole('menuitemcheckbox', { name: 'Wrap', checked: false })).toHaveCount(1);
    await expect(kinds.getByRole('menuitemradio')).toHaveCount(2);
    await expect(kinds.getByRole('link')).toHaveCount(0);
    await expect(kinds.locator('a')).toHaveCount(0);
    for (const label of ['Wrap', 'Small', 'More']) expect(await rowOf(labelled(page, 'kinds', label)).evaluate((el) => el.localName), label).toBe('div');
    expect(await labelled(page, 'kinds', 'Wrap').evaluate((el) => ['href', 'target', 'targetLabel'].filter((name) => name in el))).toEqual([]);
    // Space still switches it.
    await labelled(page, 'kinds', 'Wrap').focus();
    await page.keyboard.press('Space');
    await expect(kinds.getByRole('menuitemcheckbox', { name: 'Wrap', checked: true })).toHaveCount(1);
    // Reported once, however often the item renders.
    await labelled(page, 'kinds', 'Wrap').evaluate((el: any) => (el.label = 'Wrap lines'));
    await expect(kinds.getByRole('menuitemcheckbox', { name: 'Wrap lines' })).toHaveCount(1);
    expect(seen.filter((w) => w.includes('a checkbox item cannot be a link')).length).toBe(1);
    // The item kind: D11's refusals, citing MNU-57; without a destination its row is the action's.
    await expectRefusals(page, labelled(page, 'kinds', 'Plain'), seen, 'MNU-57', { tag: 'div' });
    // While href is empty, target and targetLabel are ignored: an action, with no mark and no words.
    await labelled(page, 'kinds', 'Plain').evaluate((el: any) => Object.assign(el, { href: '', target: 'new', targetLabel: 'opens in a new tab' }));
    await expect.poll(async () => (await anchorOf(labelled(page, 'kinds', 'Plain'))).tag).toBe('div');
    await expect(rowOf(labelled(page, 'kinds', 'Plain')).locator('.link-mark')).toHaveCount(0);
    await expect(labelled(page, 'kinds', 'Plain')).toHaveAttribute('role', 'menuitem');
    await expect(labelled(page, 'kinds', 'Plain')).not.toHaveAttribute('aria-description');
  });

  test('MNU-53, MNU-13: forced colors — a link item is drawn in the mode’s own colors, none of the tokens’: its content in a system color the mode gives a link, its mark with it; a disabled link item, and a disabled action, read as disabled', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: spec.fixtures.filter((f) => f.id === 'links' || f.id === 'disabled') });
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
    const system = (name: string) =>
      page.evaluate((color) => {
        const probe = document.body.appendChild(document.createElement('span'));
        probe.style.color = color;
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      }, name);
    const [text, linkText, gray] = [await system('CanvasText'), await system('LinkText'), await system('GrayText')];
    expect(new Set([text, linkText, gray]).size).toBe(3);
    const color = (id: string, n: number, part: string) => settledCss(row(page, id, n).locator(part), 'color');
    // The mode's color for a link (the person's own palette) or for text — never a token's color.
    for (const n of [0, 1, 2]) expect([text, linkText], `links/${n}`).toContain(await color('links', n, '.label'));
    expect([text, linkText]).toContain(await color('links', 2, '.link-mark'));
    expect(await color('links', 2, '.link-mark')).toBe(await color('links', 2, '.label'));
    // Disabled: the anchor without an address is no link to the mode, and reads as disabled, as a disabled action does.
    expect(await color('links', 3, '.label')).toBe(gray);
    const disabled = spec.fixtures.find((f) => f.id === 'disabled')!.items!.findIndex((each) => each.props.disabled);
    expect(await color('disabled', disabled, '.label')).toBe(gray);
    expect(await color('disabled', disabled === 0 ? 1 : 0, '.label')).toBe(text);
    // The row keeps its shape as a row: nothing of a link's underline.
    expect(await css(row(page, 'links', 0), 'text-decoration-line')).toBe('none');
  });
});

test.describe('context menu', () => {
  /**
   * An area with two buttons in it, in place of the staging's anchor button: the menu's anchor, by its id, is the area
   * (MNU-60). The area is `style` (fixed, 800 × 600 by default). The product's side, as the docs page writes it: a
   * request opens the menu, `close` closes it; every request, close and click is logged, with whether the browser's
   * own context menu events were cancelled.
   */
  const contextArea = async (page: P, props: Fixture['props'] = {}, style = 'position: fixed; inset: 0;') => {
    await mountFixtures(page, spec, { fixtures: [overlay('ctx', EDIT, { trigger: 'context', ...props })] });
    await page.evaluate((css) => {
      const button = document.getElementById('a-ctx')!;
      const area = document.createElement('div');
      area.id = 'a-ctx';
      area.style.cssText = css;
      area.innerHTML = '<button id="b1" type="button" style="position: absolute; left: 40px; top: 40px">One</button><button id="b2" type="button" style="position: absolute; left: 140px; top: 40px">Two</button>';
      button.replaceWith(area);
      const log: string[] = ((window as any).log = []);
      const m = document.querySelector<any>('tanrei-menu')!;
      m.addEventListener('contextrequest', (e: CustomEvent) => {
        const { x, y, element, input } = e.detail;
        log.push(`request:${input}:${Math.round(x)},${Math.round(y)}:${element.id || element.localName}`);
        if (!(window as any).refuse) m.open = true;
        else e.preventDefault();
      });
      m.addEventListener('close', (e: CustomEvent) => {
        log.push(`close:${e.detail.reason}`);
        m.open = false;
      });
      for (const el of document.querySelectorAll<any>('tanrei-menu-item')) el.addEventListener('click', () => log.push(`click:${el.label}`));
      for (const id of ['b1', 'b2']) document.getElementById(id)!.addEventListener('click', () => log.push(`click:${id}`));
      // Whether the browser would show its own context menu: the event's default, as the window sees it last.
      window.addEventListener('contextmenu', (e) => log.push(`native:${e.defaultPrevented ? 'cancelled' : 'shown'}`));
    }, style);
  };
  const ctxOpen = (page: P) => isOpen(page, 'ctx');
  const touch = (page: P, type: string, x: number, y: number, target = '#a-ctx') =>
    page.evaluate(
      ([t, px, py, sel]) => {
        const el = document.querySelector(sel as string)!;
        el.dispatchEvent(new PointerEvent(t as string, { bubbles: true, composed: true, cancelable: true, pointerType: 'touch', pointerId: 7, isPrimary: true, button: t === 'pointermove' ? -1 : 0, clientX: px as number, clientY: py as number }));
      },
      [type, x, y, target] as const,
    );
  /** What assistive technology's context-menu command sends: a contextmenu event at the element, no pointer pressed. */
  const atContextMenu = (page: P, selector: string) =>
    page.evaluate((sel) => {
      const el = document.querySelector(sel)!;
      const r = el.getBoundingClientRect();
      el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, composed: true, cancelable: true, clientX: r.x + 2, clientY: r.y + 2, button: 2 }));
    }, selector);
  const close = (page: P) => menu(page, 'ctx').evaluate((el: any) => (el.open = false));

  test('MNU-60: a right click, the context-menu command of assistive technology, Shift+F10 and the ContextMenu key ask for the menu once, with the point, the element and how; the browser’s own menu is cancelled; a cancelled request, one an inner element took and one inside the menu are left alone', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await contextArea(page);
    await page.mouse.click(300, 200, { button: 'right' });
    await expect.poll(() => ctxOpen(page)).toBe(true);
    expect(await log(page)).toEqual(['request:pointer:300,200:a-ctx', 'native:cancelled']);
    await expect.poll(() => focused(page)).toBe('Cut');
    await close(page);
    await expect.poll(() => ctxOpen(page)).toBe(false);
    await page.evaluate(() => ((window as any).log.length = 0));
    // The command of assistive technology is a contextmenu event with no pointer pressed.
    await atContextMenu(page, '#b2');
    const b2 = await bounds(page.locator('#b2'));
    expect(await log(page)).toEqual([`request:pointer:${Math.round(b2.x + 2)},${Math.round(b2.y + 2)}:b2`, 'native:cancelled']);
    await close(page);
    await expect.poll(() => ctxOpen(page)).toBe(false);
    // Keys, on an element of the area that has focus: the point is its block-end, inline-start corner.
    const b1 = await bounds(page.locator('#b1'));
    for (const key of ['Shift+F10', 'ContextMenu']) {
      await page.evaluate(() => ((window as any).log.length = 0));
      await page.locator('#b1').focus();
      await page.keyboard.press(key);
      await expect.poll(() => ctxOpen(page), key).toBe(true);
      expect((await log(page)).filter((line) => line !== 'native:cancelled'), key).toEqual([`request:keyboard:${Math.round(b1.x)},${Math.round(b1.y + b1.height)}:b1`]);
      await expect.poll(() => focused(page)).toBe('Cut');
      await page.keyboard.press('Escape');
      await expect.poll(() => ctxOpen(page)).toBe(false);
    }
    // A request the product cancels is left to the browser; the menu stays closed.
    await page.evaluate(() => {
      (window as any).log.length = 0;
      (window as any).refuse = true;
    });
    await page.mouse.click(300, 200, { button: 'right' });
    expect(await log(page)).toEqual(['request:pointer:300,200:a-ctx', 'native:shown']);
    expect(await ctxOpen(page)).toBe(false);
    await page.evaluate(() => {
      (window as any).log.length = 0;
      (window as any).refuse = false;
      // An element inside the area that takes the event itself.
      document.getElementById('b2')!.addEventListener('contextmenu', (e) => e.preventDefault());
    });
    await atContextMenu(page, '#b2');
    expect(await log(page)).toEqual(['native:cancelled']);
    // Nor is one made inside the open menu a request: a menu item's own context menu is the browser's.
    await page.mouse.click(300, 200, { button: 'right' });
    await expect.poll(() => ctxOpen(page)).toBe(true);
    await page.evaluate(() => ((window as any).log.length = 0));
    await atContextMenu(page, 'tanrei-menu-item');
    expect(await log(page)).toEqual(['native:shown']);
  });

  test('MNU-60: the context menu event a key may make is the key’s only while the key is down — the command of assistive technology that follows a key’s request, with no key or press between them, asks for the menu, however late the page runs its timers', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await contextArea(page);
    // The page's timers stand still from here: a key's request that only a timer ended would still be going on at the
    // next request, as it is when the browser runs other tasks first.
    await holdClock(page);
    const b2 = await bounds(page.locator('#b2'));
    // A context menu event made while the key is down — as an engine that makes one despite the cancelled key would —
    // is the key's: cancelled, and no second request.
    await page.evaluate(() => {
      const make = (event: KeyboardEvent) => {
        if (event.key !== 'ContextMenu') return;
        window.removeEventListener('keydown', make);
        document.getElementById('b1')!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, composed: true, cancelable: true }));
      };
      window.addEventListener('keydown', make);
    });
    await page.locator('#b1').focus();
    await page.keyboard.press('ContextMenu');
    await expect.poll(() => ctxOpen(page)).toBe(true);
    expect(await log(page)).toEqual([expect.stringMatching(/^request:keyboard:.*:b1$/), 'native:cancelled']);
    await close(page);
    await expect.poll(() => ctxOpen(page)).toBe(false);
    for (const key of ['ContextMenu', 'Shift+F10']) {
      await page.evaluate(() => ((window as any).log.length = 0));
      await page.locator('#b1').focus();
      await page.keyboard.press(key);
      await expect.poll(() => ctxOpen(page), key).toBe(true);
      expect((await log(page)).filter((line) => line !== 'native:cancelled'), key).toEqual([expect.stringMatching(/^request:keyboard:.*:b1$/)]);
      // The product closes the menu; then the person asks again with assistive technology, which moves no pointer and
      // presses no key in the page.
      await close(page);
      await expect.poll(() => ctxOpen(page), key).toBe(false);
      await page.evaluate(() => ((window as any).log.length = 0));
      await atContextMenu(page, '#b2');
      expect(await log(page), key).toEqual([`request:pointer:${Math.round(b2.x + 2)},${Math.round(b2.y + 2)}:b2`, 'native:cancelled']);
      await expect.poll(() => ctxOpen(page), key).toBe(true);
      await close(page);
      await expect.poll(() => ctxOpen(page), key).toBe(false);
    }
  });

  test('MNU-60: a touch held still in the area for the long-press duration asks for the menu, and the release of that press activates nothing; one that moves past the slop or lifts sooner asks nothing (the page clock held)', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await contextArea(page);
    await holdClock(page);
    const b1 = await bounds(page.locator('#b1'));
    const [x, y] = [Math.round(b1.x + 4), Math.round(b1.y + 4)];
    await touch(page, 'pointerdown', x, y, '#b1');
    await page.clock.runFor(499);
    expect(await log(page)).toEqual([]);
    await page.clock.runFor(1);
    expect(await log(page)).toEqual([`request:long-press:${x},${y}:b1`]);
    // Android's own context menu event for the same press comes after: cancelled, asking nothing again.
    await page.evaluate(([px, py]) => document.getElementById('b1')!.dispatchEvent(new PointerEvent('contextmenu', { bubbles: true, composed: true, cancelable: true, pointerType: 'touch', clientX: px, clientY: py })), [x, y]);
    // The release and its click go no further than the window: the button under the finger is not pressed.
    await touch(page, 'pointerup', x, y, '#b1');
    await page.locator('#b1').evaluate((el: HTMLElement) => el.click());
    expect(await log(page)).toEqual([`request:long-press:${x},${y}:b1`, 'native:cancelled']);
    await releaseClock(page);
    await expect.poll(() => ctxOpen(page)).toBe(true);
    await close(page);
    await expect.poll(() => ctxOpen(page)).toBe(false);
    await holdClock(page);
    await page.evaluate(() => ((window as any).log.length = 0));
    // Past the slop of 8 it is a scroll: nothing asked.
    await touch(page, 'pointerdown', 300, 300);
    await touch(page, 'pointermove', 309, 300);
    await page.clock.runFor(600);
    await touch(page, 'pointerup', 309, 300);
    // Within the slop, but lifted at 300: nothing asked either.
    await touch(page, 'pointerdown', 300, 300);
    await touch(page, 'pointermove', 305, 304);
    await page.clock.runFor(300);
    await touch(page, 'pointerup', 305, 304);
    await page.clock.runFor(600);
    expect(await log(page)).toEqual([]);
    // A later click on the button is a click again.
    await page.locator('#b1').evaluate((el: HTMLElement) => el.click());
    expect(await log(page)).toEqual(['click:b1']);
    await releaseClock(page);
  });

  test('MNU-60: trigger anchor answers none of these and leaves the browser’s menu; an unknown trigger is anchor, and a debug build reports it', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    for (const trigger of ['anchor', 'menu']) {
      const seen = warnings(page);
      await contextArea(page, { trigger });
      await page.mouse.click(300, 200, { button: 'right' });
      await page.locator('#b1').focus();
      await page.keyboard.press('Shift+F10');
      // The right click's own menu, shown; Shift+F10 makes one too where the platform has that key (Linux, Windows).
      const seenLog = await log(page);
      expect(seenLog[0], trigger).toBe('native:shown');
      expect(new Set(seenLog), trigger).toEqual(new Set(['native:shown']));
      expect(await ctxOpen(page)).toBe(false);
      expect(seen.some((w) => w.includes('MNU-60') && w.includes('"menu"')), trigger).toBe(trigger === 'menu');
    }
  });

  test('MNU-61: the surface opens with a corner on the point, no offset; near the window’s far corner it ends at the point on both axes; mirrored in right-to-left; limited to the room and scrolled; moving with the area; against the focused element for a key; against the area where nothing was asked', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await contextArea(page, {}, 'position: absolute; left: 0; top: 0; inline-size: 800px; block-size: 1400px;');
    const [offset, margin] = await Promise.all([resolveToken(page, T('surface-offset')), resolveToken(page, T('surface-viewport-margin'))]);
    const at = async (x: number, y: number) => {
      await page.mouse.click(x, y, { button: 'right' });
      await expect.poll(() => ctxOpen(page)).toBe(true);
      await motionEnded(page);
      return bounds(surface(page, 'ctx'));
    };
    const shut = async () => {
      await page.keyboard.press('Escape');
      await expect.poll(() => ctxOpen(page)).toBe(false);
    };
    let s = await at(300, 200);
    expect(s.x).toBeCloseTo(300, 0);
    expect(s.y).toBeCloseTo(200, 0);
    await expect(surface(page, 'ctx')).not.toHaveClass(/side-top/);
    // The page scrolled by 50 moves the surface with the area.
    await page.evaluate(() => window.scrollBy(0, 50));
    await expect.poll(async () => (await bounds(surface(page, 'ctx'))).y).toBeCloseTo(150, 0);
    await shut();
    await page.evaluate(() => window.scrollTo(0, 0));
    // Near the window's far corner, clear of its scrollbars.
    const [vw, vh] = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.clientHeight]);
    s = await at(vw - 30, vh - 30);
    expect(s.x + s.width).toBeCloseTo(vw - 30, 0);
    expect(s.y + s.height).toBeCloseTo(vh - 30, 0);
    await expect(surface(page, 'ctx')).toHaveClass(/side-top/);
    await shut();
    // A placement names the corner: top-end puts the surface's block-end, inline-end corner on the point.
    await menu(page, 'ctx').evaluate((el: any) => (el.placement = 'top-end'));
    s = await at(500, 400);
    expect(s.x + s.width).toBeCloseTo(500, 0);
    expect(s.y + s.height).toBeCloseTo(400, 0);
    await shut();
    await menu(page, 'ctx').evaluate((el: any) => (el.placement = 'bottom-start'));
    // In right-to-left the start corner is the right one.
    await page.locator('[data-fixture="ctx"]').evaluate((el) => el.setAttribute('dir', 'rtl'));
    s = await at(500, 200);
    expect(s.x + s.width).toBeCloseTo(500, 0);
    expect(s.y).toBeCloseTo(200, 0);
    await shut();
    await page.locator('[data-fixture="ctx"]').evaluate((el) => el.removeAttribute('dir'));
    // Taller than the room on both sides, it takes the larger, limited to it, and its items scroll.
    await page.setViewportSize({ width: 800, height: 160 });
    s = await at(300, 30);
    expect(s.y).toBeCloseTo(30, 0);
    expect(s.y + s.height).toBeLessThanOrEqual(160 - margin + 0.5);
    expect(await menu(page, 'ctx').locator('.scroll').evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    await shut();
    await page.setViewportSize({ width: 800, height: 600 });
    // A key places it against the element that has focus, as against an anchor: offset below, start edges aligned.
    await page.locator('#b2').focus();
    await page.keyboard.press('Shift+F10');
    await expect.poll(() => ctxOpen(page)).toBe(true);
    await motionEnded(page);
    const b2 = await bounds(page.locator('#b2'));
    s = await bounds(surface(page, 'ctx'));
    expect(s.x).toBeCloseTo(b2.x, 0);
    expect(s.y).toBeCloseTo(b2.y + b2.height + offset, 0);
    await shut();
    // Opened with no request since it was last closed, it is placed against the area.
    await page.locator('#a-ctx').evaluate((el: HTMLElement) => (el.style.cssText = 'position: absolute; left: 100px; top: 100px; inline-size: 200px; block-size: 50px;'));
    await menu(page, 'ctx').evaluate((el: any) => (el.open = true));
    await expect.poll(() => ctxOpen(page)).toBe(true);
    await motionEnded(page);
    s = await bounds(surface(page, 'ctx'));
    expect(s.x).toBeCloseTo(100, 0);
    expect(s.y).toBeCloseTo(150 + offset, 0);
  });

  test('MNU-62: focus returns to the element that had it when the menu was asked for — none where none had; Tab moves on from it; a press in the area is a press outside, and a second right click asks again at the new point', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await contextArea(page);
    await page.locator('#b1').focus();
    const b1 = await bounds(page.locator('#b1'));
    await page.mouse.click(b1.x + 4, b1.y + 4, { button: 'right' });
    await expect.poll(() => focused(page)).toBe('Cut');
    await page.keyboard.press('Escape');
    await expect.poll(() => ctxOpen(page)).toBe(false);
    expect(await focused(page)).toBe('b1');
    // A key on another button; an action returns focus there.
    await page.locator('#b2').focus();
    await page.keyboard.press('Shift+F10');
    await expect.poll(() => focused(page)).toBe('Cut');
    await page.keyboard.press('Enter');
    await expect.poll(() => ctxOpen(page)).toBe(false);
    expect(await focused(page)).toBe('b2');
    // With focus on nothing, focus leaves the menu and goes nowhere in particular.
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    await page.mouse.click(400, 400, { button: 'right' });
    await expect.poll(() => focused(page)).toBe('Cut');
    await page.keyboard.press('Escape');
    await expect.poll(() => ctxOpen(page)).toBe(false);
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
    // Tab moves on from the element focus returns to.
    await page.locator('#b1').focus();
    await page.keyboard.press('Shift+F10');
    await expect.poll(() => focused(page)).toBe('Cut');
    await tab(page);
    await expect.poll(() => ctxOpen(page)).toBe(false);
    expect(await focused(page)).toBe('b2');
    // A left press in the area closes it; a right press elsewhere closes it and asks again there.
    await page.mouse.click(400, 400, { button: 'right' });
    await expect.poll(() => ctxOpen(page)).toBe(true);
    await page.evaluate(() => ((window as any).log.length = 0));
    await page.mouse.click(500, 500);
    await expect.poll(() => ctxOpen(page)).toBe(false);
    await page.mouse.click(400, 400, { button: 'right' });
    await expect.poll(() => ctxOpen(page)).toBe(true);
    await motionEnded(page);
    await page.mouse.click(200, 300, { button: 'right' });
    await expect.poll(async () => (await bounds(surface(page, 'ctx'))).x).toBeCloseTo(200, 0);
    expect(await ctxOpen(page)).toBe(true);
    expect(await log(page)).toEqual(['close:outside', 'request:pointer:400,400:a-ctx', 'native:cancelled', 'close:outside', 'request:pointer:200,300:a-ctx', 'native:cancelled']);
  });

  test('MNU-63: the area carries no popup state, open or closed, and keeps the product’s own; the menu is not named by its area and keeps the product’s name; no axe violations', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await contextArea(page, { trigger: 'anchor' });
    const area = page.locator('#a-ctx');
    // Opened from it as an anchor, the menu writes its state on it; as a context menu it takes it back.
    await menu(page, 'ctx').evaluate((el: any) => (el.open = true));
    await expect(area).toHaveAttribute('aria-haspopup', 'menu');
    await menu(page, 'ctx').evaluate((el: any) => {
      el.open = false;
      el.trigger = 'context';
    });
    await expect(area).not.toHaveAttribute('aria-haspopup');
    await expect(area).not.toHaveAttribute('aria-expanded');
    await expect(area).not.toHaveAttribute('aria-controls');
    await area.evaluate((el) => el.setAttribute('aria-describedby', 'b1'));
    await menu(page, 'ctx').evaluate((el) => el.setAttribute('aria-label', 'Canvas actions'));
    await page.mouse.click(300, 200, { button: 'right' });
    await expect.poll(() => ctxOpen(page)).toBe(true);
    for (const name of ['aria-haspopup', 'aria-expanded', 'aria-controls']) await expect(area).not.toHaveAttribute(name);
    await expect(area).toHaveAttribute('aria-describedby', 'b1');
    await expect(menu(page, 'ctx')).toHaveAttribute('role', 'menu');
    await expect(menu(page, 'ctx')).not.toHaveAttribute('aria-labelledby');
    await expect(menu(page, 'ctx')).toHaveAttribute('aria-label', 'Canvas actions');
    await motionEnded(page);
    const results = await new AxeBuilder({ page }).include('.stage').analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

test.describe('accessibility', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`no axe violations in ${theme}, in place and open from an anchor`, async ({ page }) => {
      await mountFixtures(page, spec, { theme, icons: true, fixtures: [...spec.fixtures, overlay('open', [...VIEW, sub('More', [cb('Wrap', { checked: true }), sub('Deeper', [it('Bottom')], { open: true })], { open: true })])] });
      await paintAnchor(page, 'open');
      await menu(page, 'open').evaluate((el: any) => (el.open = true));
      await expect.poll(() => shown(labelled(page, 'open', 'Deeper'))).toBe(true);
      await motionEnded(page); // colors and the open motion
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(' ')}`).join(', ')}`).toEqual([]);
    });
  }

  test('keyboard only: a two-level submenu is opened, crossed and closed without a pointer — MNU-43, MNU-48, MNU-49', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [overlay('file', FILE)] });
    await wire(page);
    await tabTo(page, anchor(page, 'file'));
    await page.keyboard.press('Enter');
    await expect.poll(() => focused(page)).toBe('New');
    const path: string[] = [];
    for (const key of ['ArrowDown', 'ArrowRight', 'ArrowDown', 'Enter', 'End', 'Escape', 'ArrowLeft', 'ArrowDown', 'Space', 'ArrowDown', 'Enter']) {
      await page.keyboard.press(key);
      path.push(`${key} → ${await focused(page)}`);
    }
    expect(path).toEqual([
      'ArrowDown → Open recent',
      'ArrowRight → Report.pdf',
      'ArrowDown → More',
      'Enter → Older',
      'End → Oldest',
      'Escape → More',
      'ArrowLeft → Open recent',
      'ArrowDown → Export',
      'Space → PDF',
      'ArrowDown → PNG',
      'Enter → a-file',
    ]);
    expect(await log(page)).toEqual(['toggle:Open recent:true', 'toggle:More:true', 'toggle:More:false', 'toggle:Open recent:false', 'toggle:Export:true', 'click:PNG', 'close:item']);
    await tab(page);
    expect(await page.evaluate(() => !!document.activeElement?.closest('tanrei-menu'))).toBe(false);
  });

  test('keyboard: Tab never lands on an item; the anchor opens with Enter and Space', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [overlay('edit', EDIT)] });
    await wire(page);
    await tabTo(page, anchor(page, 'edit'));
    await page.keyboard.press('Space');
    await expect.poll(() => focused(page)).toBe('Cut');
    await page.keyboard.press('Escape');
    await tab(page);
    expect(await page.evaluate(() => !!document.activeElement?.closest('tanrei-menu'))).toBe(false);
  });
});

test.describe('before definition', () => {
  const dist = (file: string) => fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../dist', file), 'utf8');

  test('MNU-19: a menu drawn in place holds, before its elements are defined, the block size its surface will have — every in-place fixture, by menu.css alone: the surface’s padding, each row’s height (MNU-20: a line of supporting text more), a group’s title (MNU-28) and what parts a group from what is next to it (MNU-23, MNU-36) — so nothing under it moves when the script arrives', async ({ page }) => {
    // The fixtures' own markup, as a page writes it: what the elements wrote on themselves is taken off again.
    await mountFixtures(page, spec);
    const WRITTEN = ['role', 'aria-label', 'aria-labelledby', 'aria-checked', 'aria-disabled', 'aria-haspopup', 'aria-expanded', 'aria-setsize', 'aria-posinset', 'tabindex', 'id', 'style'];
    const written = await page.evaluate(
      (attributes) =>
        [...document.querySelectorAll<HTMLElement>('[data-fixture]')]
          .filter((stage) => stage.querySelector(':scope > tanrei-menu[inline]'))
          .map((stage) => {
            const menu = stage.querySelector(':scope > tanrei-menu')!.cloneNode(true) as HTMLElement;
            for (const el of [menu, ...menu.querySelectorAll('*')]) for (const name of [...el.getAttributeNames()]) if (attributes.includes(name) || name.startsWith('data-')) el.removeAttribute(name);
            return `<section data-id="${stage.dataset.fixture}">${menu.outerHTML}</section><p class="after"></p>`;
          }),
      WRITTEN,
    );
    expect(written.length).toBeGreaterThan(20);
    // A document of its own (no element is defined in it), as a server sends it: the tokens, the stylesheet, the
    // content — and no script yet. Then with a gap for the separation, by the token and by the attribute.
    for (const separation of ['divider', 'gap', 'attribute'] as const) {
      await page.goto('about:blank');
      const content = separation === 'attribute' ? written.map((html) => html.replace('<tanrei-menu ', '<tanrei-menu separation="gap" ')) : written;
      await page.setContent(`<!doctype html><html lang="en" data-tanrei-theme="light"><head><meta charset="utf-8"><title>before definition</title>
        <style>${dist('tokens.css')}</style><style>${dist('menu.css')}</style>
        <style>${separation === 'gap' ? `:root { ${T('separation')}: gap; }` : ''} body { margin: 16px; inline-size: 640px; } section { margin: 8px 0; } p.after { margin: 0; block-size: 4px; }</style></head><body>${content.join('')}</body></html>`);
      expect(await page.evaluate(() => !!customElements.get('tanrei-menu'))).toBe(false);
      const measure = () =>
        page.evaluate(() => ({
          menus: [...document.querySelectorAll<HTMLElement>('section')].map((section) => ({ id: section.dataset.id!, height: section.querySelector('tanrei-menu')!.getBoundingClientRect().height })),
          after: [...document.querySelectorAll('p.after')].map((p) => p.getBoundingClientRect().top),
        }));
      const before = await measure();
      // It holds a size and draws nothing: a menu of one row is at least a row tall.
      for (const menu of before.menus) expect(menu.height, `${separation} ${menu.id} before`).toBeGreaterThanOrEqual(await resolveToken(page, T('container-height')));
      await page.addScriptTag({ type: 'module', content: dist('tanrei.bundle.js') });
      await page.waitForFunction(() => !!customElements.get('tanrei-menu'));
      await page.evaluate(async () => {
        await Promise.all([...document.querySelectorAll('tanrei-menu')].map((el) => (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete));
        await document.fonts.ready;
        for (let i = 0; i < 3; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
      });
      const after = await measure();
      after.menus.forEach((menu, i) => expect(Math.abs(menu.height - before.menus[i].height), `${separation} ${menu.id}: ${before.menus[i].height} → ${menu.height}`).toBeLessThanOrEqual(0.5));
      after.after.forEach((top, i) => expect(Math.abs(top - before.after[i]), `${separation}: what is under menu ${i} moved from ${before.after[i]} to ${top}`).toBeLessThanOrEqual(0.5));
      // The gap is drawn where it was held.
      expect(await page.locator('tanrei-menu').first().evaluate((el) => getComputedStyle(el).getPropertyValue('--_separation').trim())).toBe(separation === 'divider' ? 'divider' : 'gap');
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
