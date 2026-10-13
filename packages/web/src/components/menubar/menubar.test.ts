// <tanrei-menubar>, <tanrei-menubar-menu> and <tanrei-menubar-item>, driven by specs/menubar.spec.json: every behaviour
// id (MBR-1 … MBR-47) is cited by a test title, every fixture has a baseline, and every size, color and duration is read back from the tokens —
// never from a number written here. A fixture cannot fill a bar's menu (its items are the menu's own kinds), so the
// tests fill the menus with the real menu elements: these tests also show that the bar leaves them as they are.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, type FixtureItem, acmeSystemCss, loadSpec, missingWords, mountFixtures, resolveColor, resolveToken, setWords, tab, rootTokens } from '../../../test/harness.js';
import { holdClock, releaseClock } from '../../../test/page-clock.js';

const spec = loadSpec('menubar');
type P = Page;
const T = (name: string) => `--tanrei-comp-menubar-${name}`;
const bar = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-menubar`);
const menu = (page: P, id: string, label: string) => bar(page, id).locator(`tanrei-menubar-menu[label="${label}"]`);
const title = (page: P, id: string, label: string) => menu(page, id, label).locator('.title');
const container = (page: P, id: string, label: string) => menu(page, id, label).locator('.title > .container');
const overflow = (page: P, id: string) => bar(page, id).locator('.overflow');
/** A bar item (MBR-32), by its label: an action's attribute, or the text of a link item's anchor. */
const item = (page: P, id: string, label: string) => bar(page, id).locator(`tanrei-menubar-item[label="${label}"], tanrei-menubar-item:has(> a:text-is("${label}"))`);
/** The product's own anchor of a link item (MBR-35). */
const anchor = (page: P, id: string, label: string) => item(page, id, label).locator('> a');
const itemContainer = (page: P, id: string, label: string) => item(page, id, label).locator('.title > .container');
const row = (page: P, id: string) => bar(page, id).locator('.bar');
const css = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const px = async (locator: Locator, property: string, pseudo?: string) => Number.parseFloat(await css(locator, property, pseudo));
const box = async (locator: Locator) => locator.evaluate((el) => (({ x, y, width, height }) => ({ x, y, width, height, right: x + width, bottom: y + height }))(el.getBoundingClientRect()));
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
/** The colors have arrived: nothing of the bar is still moving between two states. */
const settled = (page: P) =>
  page.evaluate(async () => {
    const deep = (root: Document | ShadowRoot): Animation[] => [...root.getAnimations(), ...[...root.querySelectorAll('*')].flatMap((el) => (el.shadowRoot ? deep(el.shadowRoot) : []))];
    await Promise.allSettled(deep(document).map((animation) => animation.finished));
  });
const color = async (page: P, locator: Locator, property = 'background-color') => {
  await settled(page);
  return css(locator, property);
};

// Items, as a product writes them.
const it = (label: string, extra = '') => `<tanrei-menu-item label="${label}" ${extra}></tanrei-menu-item>`;
const sub = (label: string, items: string, extra = '') => `<tanrei-submenu label="${label}" ${extra}>${items}</tanrei-submenu>`;
const m = (label: string, items = '', props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'menu', props: { label, ...props }, content: items });
/** A bar item, as a fixture writes one: an action, or with `href` a link item (the harness writes the product's anchor). */
const b = (label: string, props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'item', props: { label, ...props } });
const fx = (id: string, menus: FixtureItem[], props: Fixture['props'] = {}, direction?: 'rtl'): Fixture => ({ id, props: { label: 'Application', overflowLabel: 'More menus', ...props }, items: menus, ...(direction ? { direction } : {}) });
/** An editor's bar: File with a submenu and a disabled item, Edit with a checkbox item, View, a disabled Format, Help. */
const EDITOR = () => [
  m('File', it('New', 'shortcut="mod+n"') + it('Open') + sub('Open recent', it('One') + sub('Older', it('Two') + it('Three'))) + it('Save', 'disabled') + it('Print')),
  m('Edit', it('Undo') + it('Redo') + '<tanrei-menu-checkbox-item label="Word wrap"></tanrei-menu-checkbox-item>'),
  m('View', it('Zoom in') + it('Zoom out')),
  m('Format', it('Bold'), { disabled: true }),
  m('Help', it('About')),
];
const editor = (id = 'editor', props: Fixture['props'] = {}, direction?: 'rtl') => fx(id, EDITOR(), props, direction);

/**
 * Logs each bar menu's toggle, each submenu's, and every item's click, in the order the page hears them. A bar item's
 * click is logged as `act:<label>` — with what the page then sees of the bar, which menus are open — and a link item's
 * as `go:<label>`, on the product's own anchor.
 */
const wire = (page: P) =>
  page.evaluate(() => {
    const log: string[] = ((window as any).log = []);
    document.addEventListener('toggle', (event) => {
      const target = event.target as HTMLElement & { label: string };
      log.push(`${target.localName === 'tanrei-menubar-menu' ? 'toggle' : 'sub'}:${target.label}:${(event as CustomEvent).detail.open}`);
    });
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement & { label?: string };
      if (target.localName === 'tanrei-menubar-item') log.push(`act:${target.label}`);
      else if (target.localName === 'a' && target.parentElement?.localName === 'tanrei-menubar-item') log.push(`go:${(target.parentElement as any).label}`);
      else if (target.localName?.startsWith('tanrei-menu-')) log.push(`click:${target.label}`);
    });
  });
const log = (page: P) => page.evaluate(() => (window as any).log as string[]);
const clearLog = (page: P) => page.evaluate(() => void ((window as any).log.length = 0));

/** What the bar is doing: where focus is, which menus are open, which are folded, where the Tab stop is. */
const state = (page: P, id: string) =>
  bar(page, id).evaluate((el) => {
    let active: Element | null = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    const name = (node: Element | null) => {
      if (!node || node === document.body) return 'none';
      if (node.localName === 'tanrei-menubar-menu' || node.localName === 'tanrei-menubar-item') return `title:${(node as any).label}`;
      if (node.localName === 'a' && node.parentElement?.localName === 'tanrei-menubar-item') return `title:${(node.parentElement as any).label}`;
      if (node.classList.contains('overflow')) return 'title:overflow';
      const host = node.localName.startsWith('tanrei-') ? node : ((node.getRootNode() as ShadowRoot).host ?? node);
      if (host.localName.startsWith('tanrei-menu-') || host.localName === 'tanrei-submenu') return `item:${(host as any).label}`;
      return node.id || node.localName;
    };
    const menus = [...el.querySelectorAll<HTMLElement & { open: boolean; label: string }>(':scope > tanrei-menubar-menu')];
    const over = el.shadowRoot!.querySelector('.overflow');
    // The bar's entries, menus and bar items (MBR-32): the Tab stop is on a menu's host, an action's host or a link item's anchor.
    const entries = [...el.querySelectorAll<HTMLElement & { label: string }>(':scope > tanrei-menubar-menu, :scope > tanrei-menubar-item')];
    const stopped = (each: HTMLElement) => (each.querySelector(':scope > a') ?? each).getAttribute('tabindex') === '0' && !each.hasAttribute('data-tanrei-folded');
    const stops = [...entries.filter(stopped).map((each) => each.label), ...(over?.getAttribute('tabindex') === '0' ? ['overflow'] : [])];
    return {
      focus: name(active),
      open: menus.filter((each) => each.open).map((each) => each.label),
      overflow: over ? over.getAttribute('aria-expanded') === 'true' : null,
      folded: entries.filter((each) => each.hasAttribute('data-tanrei-folded')).map((each) => each.label),
      stop: stops.join(','),
    };
  });
const focus = async (page: P, id: string) => (await state(page, id)).focus;
const open = async (page: P, id: string) => (await state(page, id)).open;
/** Whether a surface is shown: the menu a title opens, or a submenu's. */
const surfaceShown = (host: Locator) => host.evaluate((el) => !!el.shadowRoot?.querySelector('.surface')?.matches(':popover-open, .inline'));
const surfaceOf = (page: P, id: string, label: string) => menu(page, id, label).locator('tanrei-menu .surface');
/** Keyboard focus to a title: the bar's Tab stop first, then along the bar. */
async function focusTitle(page: P, id: string, label: string) {
  await menu(page, id, label).focus();
  await expect.poll(() => focus(page, id)).toBe(`title:${label}`);
}
/** The stage's inline size: what the bar's parent gives it. */
const stageWidth = (page: P, id: string, width: number) => page.locator(`[data-fixture="${id}"]`).evaluate((el, w) => ((el as HTMLElement).style.inlineSize = `${w}px`), width);
/** Whether the focused row of a menu was focused by a pointer's act (no ring), as the menu marks it. */
const quiet = (page: P) =>
  page.evaluate(() => {
    let active: Element | null = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    return !!active?.shadowRoot?.querySelector('.row')?.classList.contains('pf');
  });

test.describe('the row and a title', () => {
  test('MBR-1: one row across the inline size its parent gives it — the bar’s fill behind it, the titles in the order given from the start edge, the gap apart, inside the paddings — with no position, edge or elevation of its own', async ({ page }) => {
    await mountFixtures(page, spec);
    const stage = await box(page.locator('[data-fixture="default"]'));
    const own = await box(bar(page, 'default'));
    const [gap, padInline, padBlock, height] = [await resolveToken(page, T('bar-gap')), await resolveToken(page, T('bar-padding-inline')), await resolveToken(page, T('bar-padding-block')), await resolveToken(page, T('container-height'))];
    // The whole inline size of its place (the stage's content box), whatever its titles need.
    expect(own.width).toBeCloseTo(stage.width - 32, 1);
    expect(await css(bar(page, 'default'), 'display')).toBe('block');
    const labels = spec.fixtures.find((f) => f.id === 'default')!.items!.map((each) => String(each.props.label));
    const boxes = await Promise.all(labels.map((label) => box(menu(page, 'default', label))));
    expect(boxes[0].x).toBeCloseTo(own.x + padInline, 1);
    for (let n = 1; n < boxes.length; n += 1) expect(boxes[n].x - boxes[n - 1].right, labels[n]).toBeCloseTo(gap, 1);
    for (const each of boxes) expect(each.y - own.y).toBeGreaterThanOrEqual(padBlock - 0.01);
    expect(own.height).toBeCloseTo(height + 2 * padBlock, 1);
    // The fill is the token's, across the whole row.
    await override(page, { [T('bar-color')]: 'rgb(10, 20, 30)' });
    expect(await css(row(page, 'default'), 'background-color')).toBe('rgb(10, 20, 30)');
    expect((await box(row(page, 'default'))).width).toBeCloseTo(own.width, 1);
    // It places, raises and edges nothing.
    for (const el of [bar(page, 'default'), row(page, 'default')]) {
      expect(await css(el, 'position')).toBe('static');
      expect(await css(el, 'box-shadow')).toBe('none');
      expect(await css(el, 'border-top-width')).toBe('0px');
      expect(await css(el, 'border-bottom-width')).toBe('0px');
    }
  });

  test('MBR-2: a title is a container at least container.height tall, as wide as its label and the padding on each side, with the container’s corners, its label centred on one line in the label style — never wrapped, shrunk or cut', async ({ page }) => {
    await mountFixtures(page, spec);
    const [height, pad, shape] = [await resolveToken(page, T('container-height')), await resolveToken(page, T('container-padding-inline')), await resolveToken(page, T('container-shape'))];
    for (const [id, label] of [['default', 'Format'], ['long-labels', 'Document and page settings'], ['ja', 'ファイル']] as const) {
      const c = container(page, id, label);
      const l = c.locator('.label');
      const [cb, lb] = [await box(c), await box(l)];
      expect(cb.height, label).toBeGreaterThanOrEqual(height - 0.01);
      expect(cb.width, label).toBeCloseTo(lb.width + 2 * pad, 1);
      // Centred in the container, on both axes.
      expect(lb.x - cb.x, label).toBeCloseTo(cb.right - lb.right, 1);
      expect(lb.y - cb.y, label).toBeCloseTo(cb.bottom - lb.bottom, 1);
      expect(await css(l, 'white-space-collapse').then((v) => v || 'collapse')).toBe('collapse');
      expect(await css(l, 'text-wrap-mode').then((v) => v || 'nowrap')).toBe('nowrap');
      // Not cut: nothing of the label lies outside its box, and nothing clips it.
      expect(await l.evaluate((el) => el.scrollWidth <= el.clientWidth + 1 || getComputedStyle(el).display === 'inline')).toBe(true);
      expect(await css(l, 'text-overflow')).toBe('clip');
      expect(await css(c, 'overflow-x')).toBe('visible');
      expect(Math.min(await px(c, 'border-top-left-radius'), cb.height / 2), label).toBeCloseTo(Math.min(shape, cb.height / 2), 1);
    }
    // The label's style is the token's: another role changes it.
    const before = await px(container(page, 'default', 'File').locator('.label'), 'font-size');
    await override(page, { [T('label-typescale-font')]: 'var(--tanrei-sys-typescale-headline-font)' });
    expect(await px(container(page, 'default', 'File').locator('.label'), 'font-size')).toBeGreaterThan(before);
  });

  test('MBR-3: a title is drawn from its condition — expanded while its menu is open, otherwise unselected — container and label from that condition’s tokens; nothing is selected, and the condition ends when the menu closes', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [editor()] });
    await override(page, {
      [T('unselected-container-color')]: 'rgb(1, 1, 1)',
      [T('unselected-label-color')]: 'rgb(2, 2, 2)',
      [T('expanded-container-color')]: 'rgb(3, 3, 3)',
      [T('expanded-label-color')]: 'rgb(4, 4, 4)',
      [T('expanded-hovered-container-color')]: 'rgb(3, 3, 3)',
    });
    const c = container(page, 'editor', 'Edit');
    expect(await color(page, c)).toBe('rgb(1, 1, 1)');
    expect(await color(page, c.locator('.label'), 'color')).toBe('rgb(2, 2, 2)');
    await menu(page, 'editor', 'Edit').evaluate((el: any) => (el.open = true));
    await expect.poll(() => surfaceShown(menu(page, 'editor', 'Edit').locator('tanrei-menu'))).toBe(true);
    expect(await color(page, c)).toBe('rgb(3, 3, 3)');
    expect(await color(page, c.locator('.label'), 'color')).toBe('rgb(4, 4, 4)');
    // The others stay unselected, and no title carries a selection.
    expect(await color(page, container(page, 'editor', 'File'))).toBe('rgb(1, 1, 1)');
    expect(await bar(page, 'editor').evaluate((el) => !!el.querySelector(':scope > [aria-selected], :scope > [aria-checked], :scope > [aria-current], :scope > [aria-pressed]'))).toBe(false);
    // Closed by the product: focus that was in the menu is on the title now; at rest again it is unselected.
    await menu(page, 'editor', 'Edit').evaluate((el: any) => (el.open = false));
    await expect.poll(() => focus(page, 'editor')).toBe('title:Edit');
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    await expect.poll(() => color(page, c)).toBe('rgb(1, 1, 1)');
  });

  test('MBR-4: hovered, keyboard-focused and pressed each draw the container and label from that state’s tokens of the condition, pressed over focused over hovered; focus a pointer gave is not the focused state', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [editor()], reducedMotion: true });
    await override(page, {
      '--tanrei-sys-behavior-pressed-feedback': 'overlay',
      [T('unselected-container-color')]: 'rgb(1, 1, 1)',
      [T('unselected-hovered-container-color')]: 'rgb(10, 0, 0)',
      [T('unselected-hovered-label-color')]: 'rgb(11, 0, 0)',
      [T('unselected-focused-container-color')]: 'rgb(20, 0, 0)',
      [T('unselected-focused-label-color')]: 'rgb(21, 0, 0)',
      [T('unselected-pressed-container-color')]: 'rgb(30, 0, 0)',
      [T('unselected-pressed-label-color')]: 'rgb(31, 0, 0)',
      [T('hovered-opacity')]: '0.9',
    });
    const c = container(page, 'editor', 'View');
    const at = await box(c);
    await page.mouse.move(at.x + at.width / 2, at.y + at.height / 2);
    expect(await color(page, c)).toBe('rgb(10, 0, 0)');
    expect(await color(page, c.locator('.label'), 'color')).toBe('rgb(11, 0, 0)');
    expect(await css(c, 'opacity')).toBe('0.9');
    // Keyboard focus wins over hover.
    await focusTitle(page, 'editor', 'Edit');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => focus(page, 'editor')).toBe('title:View');
    expect(await color(page, c)).toBe('rgb(20, 0, 0)');
    expect(await color(page, c.locator('.label'), 'color')).toBe('rgb(21, 0, 0)');
    // Pressed wins over both.
    await page.mouse.down();
    expect(await css(c, 'background-color')).toBe('rgb(30, 0, 0)');
    expect(await css(c.locator('.label'), 'color')).toBe('rgb(31, 0, 0)');
    await page.mouse.up();
    // The press opened View and closed nothing else; press again to close it: focus is the pointer's, on the title.
    await expect.poll(() => open(page, 'editor')).toEqual(['View']);
    await page.mouse.down();
    await page.mouse.up();
    await expect.poll(() => open(page, 'editor')).toEqual([]);
    await expect.poll(() => focus(page, 'editor')).toBe('title:View');
    await page.mouse.move(2, 400);
    await expect.poll(() => c.evaluate((el) => el.dataset.pressed ?? null)).toBeNull();
    // Focused by the pointer, at rest: not the focused state.
    expect(await color(page, c)).toBe('rgb(1, 1, 1)');
  });

  test('MBR-5: keyboard focus shows the focus ring around the title’s container, at once; focus a pointer gave shows none; the bar clips nothing, so the ring has room at its edges', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [editor()] });
    const outer = await resolveToken(page, '--tanrei-sys-focus-outer-width');
    const c = container(page, 'editor', 'File');
    await focusTitle(page, 'editor', 'Edit');
    await page.keyboard.press('Home');
    await expect.poll(() => focus(page, 'editor')).toBe('title:File');
    expect(await css(c, 'outline-style')).toBe('solid');
    expect(await px(c, 'outline-width')).toBe(outer);
    expect(await css(c, 'outline-color')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    // Never animated.
    expect(await css(c, 'transition-property')).not.toContain('outline');
    // The first title's ring reaches into the bar's padding and past it: nothing on the way clips.
    for (const el of [row(page, 'editor'), bar(page, 'editor'), menu(page, 'editor', 'File')]) {
      expect(await css(el, 'overflow-x')).toBe('visible');
      expect(await css(el, 'contain')).not.toMatch(/paint|content|strict/);
    }
    // A pointer's focus: no ring.
    const at = await box(container(page, 'editor', 'View'));
    await page.mouse.click(at.x + at.width / 2, at.y + at.height / 2);
    await page.mouse.click(at.x + at.width / 2, at.y + at.height / 2);
    await expect.poll(() => state(page, 'editor')).toMatchObject({ focus: 'title:View', open: [] });
    expect(await css(container(page, 'editor', 'View'), 'outline-style')).toBe('none');
  });

  test('MBR-6: a press by pointer, Enter or Space shows the pressed state without delay and keeps it for at least press-hold, even when the press ends at once', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [editor()] });
    await override(page, { '--tanrei-sys-motion-duration-press-hold': '300ms' });
    const pressed = (label: string) => container(page, 'editor', label).evaluate((el) => el.dataset.pressed ?? null);
    const at = await box(container(page, 'editor', 'View'));
    await page.mouse.move(at.x + at.width / 2, at.y + at.height / 2);
    // The hold runs on the page's clock, held still and moved on by the test: there at 299 ms from the press, gone at 300.
    await holdClock(page);
    await page.mouse.down();
    expect(await pressed('View')).not.toBeNull();
    await page.mouse.up();
    // Released at once, it is still pressed; it ends only after the hold.
    expect(await pressed('View')).not.toBeNull();
    await page.clock.runFor(299);
    expect(await pressed('View')).not.toBeNull();
    await page.clock.runFor(1);
    await expect.poll(() => pressed('View')).toBeNull();
    await releaseClock(page);
    await page.keyboard.press('Escape');
    for (const key of ['Enter', ' ']) {
      await focusTitle(page, 'editor', 'Edit');
      await holdClock(page);
      await page.keyboard.down(key);
      expect(await pressed('Edit'), key).not.toBeNull();
      await page.keyboard.up(key);
      expect(await pressed('Edit'), key).not.toBeNull();
      await page.clock.runFor(299);
      expect(await pressed('Edit'), key).not.toBeNull();
      await page.clock.runFor(1);
      await expect.poll(() => pressed('Edit')).toBeNull();
      await releaseClock(page);
      await page.keyboard.press('Escape');
      await expect.poll(() => open(page, 'editor')).toEqual([]);
    }
  });

  test('MBR-7: the press answers as sys.behavior.pressed-feedback names — overlay the pressed tokens at once, ripple a layer from the point of contact, dim the pressed opacity and no layer, none nothing', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [editor()] });
    await override(page, {
      '--tanrei-sys-motion-duration-press-hold': '400ms',
      [T('unselected-container-color')]: 'rgb(1, 1, 1)',
      [T('unselected-hovered-container-color')]: 'rgb(10, 0, 0)',
      [T('unselected-pressed-container-color')]: 'rgb(30, 0, 0)',
      [T('unselected-pressed-label-color')]: 'rgb(31, 0, 0)',
      [T('unselected-hovered-label-color')]: 'rgb(11, 0, 0)',
      [T('pressed-opacity')]: '0.5',
      [T('expanded-container-color')]: 'rgb(10, 0, 0)',
      [T('expanded-hovered-container-color')]: 'rgb(10, 0, 0)',
      [T('expanded-pressed-container-color')]: 'rgb(30, 0, 0)',
      [T('expanded-pressed-label-color')]: 'rgb(31, 0, 0)',
      [T('expanded-hovered-label-color')]: 'rgb(11, 0, 0)',
    });
    const c = container(page, 'editor', 'View');
    const at = await box(c);
    for (const feedback of ['overlay', 'ripple', 'dim', 'none'] as const) {
      await override(page, { '--tanrei-sys-behavior-pressed-feedback': feedback });
      // A whole pixel: an engine may round the pointer's place.
      const pressAt = Math.round(at.x) + 4;
      await page.mouse.move(pressAt, Math.round(at.y + at.height / 2));
      await page.mouse.down();
      expect(await c.evaluate((el) => el.dataset.pressed), feedback).toBe(feedback);
      const ripple = c.locator('.ripple');
      if (feedback === 'overlay') {
        expect(await css(c, 'background-color')).toBe('rgb(30, 0, 0)');
        expect(await css(c.locator('.label'), 'color')).toBe('rgb(31, 0, 0)');
        expect(await ripple.count()).toBe(0);
      } else if (feedback === 'ripple') {
        // The container stays with the state under the press; the layer brings the pressed color from the point of contact.
        expect(await color(page, c)).toBe('rgb(10, 0, 0)');
        expect(await css(c.locator('.label'), 'color')).toBe('rgb(31, 0, 0)');
        expect(await ripple.count()).toBe(1);
        expect(await css(ripple, 'background-color')).toBe('rgb(30, 0, 0)');
        expect(Math.abs(Number.parseFloat(await ripple.evaluate((el) => el.style.getPropertyValue('--_x'))) - (pressAt - at.x))).toBeLessThan(0.6);
        expect(await css(ripple, 'animation-duration')).toBe(`${(await resolveToken(page, T('motion-feedback-duration'), 'duration')) / 1000}s`);
      } else if (feedback === 'dim') {
        expect(await color(page, c)).toBe('rgb(10, 0, 0)');
        expect(await css(c, 'opacity')).toBe('0.5');
        expect(await ripple.count()).toBe(0);
      } else {
        expect(await color(page, c)).toBe('rgb(10, 0, 0)');
        expect(await color(page, c.locator('.label'), 'color')).toBe('rgb(11, 0, 0)');
        expect(await css(c, 'opacity')).toBe('1');
        expect(await ripple.count()).toBe(0);
      }
      await page.mouse.up();
      await expect.poll(() => c.evaluate((el) => el.dataset.pressed ?? null)).toBeNull();
      // Every second press closed the menu the first opened: start each feedback from a closed bar.
      if ((await open(page, 'editor')).length) {
        await page.mouse.down();
        await page.mouse.up();
        await expect.poll(() => c.evaluate((el) => el.dataset.pressed ?? null)).toBeNull();
      }
      await expect.poll(() => open(page, 'editor')).toEqual([]);
    }
    // Ripple, from the keyboard: from the centre. Where motion is reduced it appears whole.
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'ripple' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.mouse.move(2, 400);
    await focusTitle(page, 'editor', 'Edit');
    await page.keyboard.down('Enter');
    const ripple = container(page, 'editor', 'Edit').locator('.ripple');
    expect(await ripple.count()).toBe(1);
    const size = await box(container(page, 'editor', 'Edit'));
    expect(Number.parseFloat(await ripple.evaluate((el) => el.style.getPropertyValue('--_x')))).toBeCloseTo(size.width / 2, 0);
    expect(await css(ripple, 'animation-name')).toBe('none');
    await page.keyboard.up('Enter');
  });

  test('MBR-8: the container’s corners are eased by sys.shape.corner-smoothing, the ring concentric, and keyboard focus is shown as sys.behavior.focus-style names — a ring, or a glow', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'cupertino', fixtures: [editor()] });
    const shape = await resolveToken(page, T('container-shape'));
    const c = container(page, 'editor', 'File');
    await expect(c).toHaveAttribute('data-tanrei-shape', '');
    if (await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'))) {
      expect(Number.parseFloat((await css(c, 'corner-top-left-shape')).replace(/^superellipse\(|\)$/g, ''))).toBeCloseTo(Math.log2(2.6), 3);
      await expect.poll(async () => px(c, 'border-top-left-radius')).toBeCloseTo(shape * 1.24, 2);
    } else expect(await px(c, 'border-top-left-radius')).toBe(shape);

    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss(), fixtures: [editor()] });
    await override(page, { '--tanrei-sys-focus-inner-width': '1px', '--tanrei-sys-color-focus-ring-inner': 'rgb(255, 255, 255)' });
    const outer = await resolveToken(page, '--tanrei-sys-focus-outer-width');
    await focusTitle(page, 'editor', 'Edit');
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => focus(page, 'editor')).toBe('title:File');
    const glowing = container(page, 'editor', 'File');
    expect(await css(glowing, 'outline-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(glowing, 'box-shadow', '::after')).toBe(`rgb(255, 255, 255) 0px 0px 1px 1px, ${await resolveColor(page, '--tanrei-sys-color-focus-ring')} 0px 0px ${outer}px ${outer + 1}px`);
    await expect(menu(page, 'editor', 'File')).toHaveAttribute('data-focus-style', 'glow');
    // The overflow item, a title of the bar's own, shows it the same way.
    await stageWidth(page, 'editor', 200);
    await expect.poll(async () => (await state(page, 'editor')).folded.length).toBeGreaterThan(0);
    await page.keyboard.press('End');
    await expect.poll(() => focus(page, 'editor')).toBe('title:overflow');
    expect(await css(overflow(page, 'editor').locator('.container'), 'outline-color')).toBe('rgba(0, 0, 0, 0)');
    await expect(overflow(page, 'editor')).toHaveAttribute('data-focus-style', 'glow');
  });
});

test.describe('opening and closing', () => {
  test('MBR-9: a press, a tap, Enter, Space and Down Arrow on a closed, enabled title open its menu at once with focus on its first enabled item, Up Arrow on its last — the ring only for a key — set open, fire toggle once, and draw the title expanded; the menu is a Tanrei Menu below the title, their start edges together, surface.offset away', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [editor()], reducedMotion: true });
    await wire(page);
    const offset = await resolveToken(page, '--tanrei-comp-menu-surface-offset');
    for (const [key, first] of [['Enter', 'item:New'], [' ', 'item:New'], ['ArrowDown', 'item:New'], ['ArrowUp', 'item:Print']] as const) {
      await focusTitle(page, 'editor', 'File');
      await clearLog(page);
      await page.keyboard.press(key);
      await expect.poll(() => state(page, 'editor'), key).toMatchObject({ focus: first, open: ['File'] });
      expect(await log(page), key).toEqual(['toggle:File:true']);
      expect(await quiet(page), key).toBe(false);
      await expect(menu(page, 'editor', 'File')).toHaveAttribute('open', '');
      await expect(menu(page, 'editor', 'File')).toHaveAttribute('aria-expanded', 'true');
      await expect(title(page, 'editor', 'File')).toHaveClass(/expanded/);
      await page.keyboard.press('Escape');
      await expect.poll(() => state(page, 'editor'), key).toMatchObject({ focus: 'title:File', open: [] });
    }
    // The surface: the menu's own, below the title's container, start edges together.
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => focus(page, 'editor')).toBe('item:New');
    const [c, s] = [await box(container(page, 'editor', 'File')), await box(surfaceOf(page, 'editor', 'File'))];
    expect(s.y).toBeCloseTo(c.bottom + offset, 1);
    expect(s.x).toBeCloseTo(c.x, 1);
    expect(await css(surfaceOf(page, 'editor', 'File'), 'background-color')).toBe(await resolveColor(page, '--tanrei-comp-menu-surface-color'));
    await expect(menu(page, 'editor', 'File').locator('tanrei-menu')).toHaveAttribute('role', 'menu');
    // Its items behave as the menu's: the block arrow keys, a submenu by the inline-end key.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => focus(page, 'editor')).toBe('item:Open recent');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => focus(page, 'editor')).toBe('item:One');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect.poll(() => state(page, 'editor')).toMatchObject({ focus: 'title:File', open: [] });
    // A press: the same menu, focus on its first item, without the ring.
    await clearLog(page);
    await title(page, 'editor', 'Edit').click();
    await expect.poll(() => state(page, 'editor')).toMatchObject({ focus: 'item:Undo', open: ['Edit'] });
    expect(await quiet(page)).toBe(true);
    expect(await log(page)).toEqual(['toggle:Edit:true']);
  });

  test('MBR-9: a tap opens a title’s menu, and a menu in which no item is enabled takes focus on its first item, or its last for Up Arrow', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { fixtures: [fx('none', [m('Tools', it('One', 'disabled') + it('Two', 'disabled') + it('Three', 'disabled')), m('Help', it('About'))])], reducedMotion: true });
    await focusTitle(page, 'none', 'Tools');
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => focus(page, 'none')).toBe('item:One');
    await page.keyboard.press('Escape');
    await page.keyboard.press('ArrowUp');
    await expect.poll(() => focus(page, 'none')).toBe('item:Three');
    await page.keyboard.press('Escape');
    await expect.poll(() => open(page, 'none')).toEqual([]);
    // A tap is a click with no hover before it.
    await title(page, 'none', 'Help').dispatchEvent('pointerdown', { pointerType: 'touch', bubbles: true, composed: true });
    await title(page, 'none', 'Help').dispatchEvent('click', { bubbles: true, composed: true });
    await expect.poll(() => open(page, 'none'), browserName).toEqual(['Help']);
    await expect.poll(() => focus(page, 'none')).toBe('item:About');
  });

  test('MBR-10: at most one menu is shown — opening one closes the other first, with its toggle; a press on the open title closes it and keeps focus on the title; open set by the product opens and closes without that menu’s toggle; of several the product opens, the first is shown and it is reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [editor()], reducedMotion: true });
    await wire(page);
    await title(page, 'editor', 'File').click();
    await expect.poll(() => open(page, 'editor')).toEqual(['File']);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => focus(page, 'editor')).toBe('item:One');
    await clearLog(page);
    // Another title, by a tap (no hover): File closes first, its submenu with it, then Edit opens.
    await title(page, 'editor', 'Edit').dispatchEvent('click', { bubbles: true, composed: true });
    await expect.poll(() => open(page, 'editor')).toEqual(['Edit']);
    expect((await log(page)).filter((entry) => entry.startsWith('toggle'))).toEqual(['toggle:File:false', 'toggle:Edit:true']);
    await expect.poll(() => surfaceShown(menu(page, 'editor', 'File').locator('tanrei-menu'))).toBe(false);
    await expect.poll(() => menu(page, 'editor', 'File').locator('tanrei-submenu[label="Open recent"]').evaluate((el: any) => el.open)).toBe(false);
    // The open title pressed: closed, focus on the title.
    await clearLog(page);
    await title(page, 'editor', 'Edit').click();
    await expect.poll(() => state(page, 'editor')).toMatchObject({ focus: 'title:Edit', open: [] });
    expect(await log(page)).toEqual(['toggle:Edit:false']);
    await expect(menu(page, 'editor', 'Edit')).not.toHaveAttribute('open', '');
    // The product's own change: no toggle for that menu; the one it replaces says so.
    await clearLog(page);
    await menu(page, 'editor', 'View').evaluate((el: any) => (el.open = true));
    await expect.poll(() => surfaceShown(menu(page, 'editor', 'View').locator('tanrei-menu'))).toBe(true);
    expect(await log(page)).toEqual([]);
    await menu(page, 'editor', 'Help').evaluate((el: any) => (el.open = true));
    await expect.poll(() => open(page, 'editor')).toEqual(['Help']);
    expect(await log(page)).toEqual(['toggle:View:false']);
    await clearLog(page);
    await menu(page, 'editor', 'Help').evaluate((el: any) => (el.open = false));
    await expect.poll(() => surfaceShown(menu(page, 'editor', 'Help').locator('tanrei-menu'))).toBe(false);
    expect(await log(page)).toEqual([]);
    // Two at once: the first in the order given.
    await bar(page, 'editor').evaluate((el) => {
      for (const label of ['View', 'Edit']) (el.querySelector(`[label="${label}"]`) as any).open = true;
    });
    await expect.poll(() => open(page, 'editor')).toEqual(['Edit']);
    expect(seen.some((text) => text.includes('MBR-10'))).toBe(true);
  });

  test('MBR-11: while a menu is open a hovering pointer on another enabled title opens that one at once and closes the other, focus in the new menu without a ring; a disabled title and the bar between titles leave it open; with no menu open hovering opens nothing', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [editor()], reducedMotion: true });
    await wire(page);
    const centre = async (label: string) => {
      const at = await box(container(page, 'editor', label));
      return [at.x + at.width / 2, at.y + at.height / 2] as const;
    };
    // Nothing open: a pointer along the bar only hovers.
    for (const label of ['File', 'Edit', 'View']) await page.mouse.move(...(await centre(label)));
    expect(await state(page, 'editor')).toMatchObject({ open: [], focus: 'none' });
    expect(await log(page)).toEqual([]);
    await page.mouse.click(...(await centre('File')));
    await expect.poll(() => state(page, 'editor')).toMatchObject({ open: ['File'], focus: 'item:New' });
    await clearLog(page);
    await page.mouse.move(...(await centre('Edit')));
    // At once: no delay is waited for.
    expect(await open(page, 'editor')).toEqual(['Edit']);
    await expect.poll(() => focus(page, 'editor')).toBe('item:Undo');
    expect(await quiet(page)).toBe(true);
    expect(await log(page)).toEqual(['toggle:File:false', 'toggle:Edit:true']);
    // A disabled title, and the gap and padding of the bar, change nothing.
    await page.mouse.move(...(await centre('Format')));
    const edge = await box(row(page, 'editor'));
    await page.mouse.move(edge.right - 2, edge.y + edge.height / 2);
    expect(await open(page, 'editor')).toEqual(['Edit']);
    await page.mouse.move(...(await centre('Help')));
    expect(await open(page, 'editor')).toEqual(['Help']);
    // Touch has no hover: a pointer of a finger entering a title opens nothing.
    await title(page, 'editor', 'View').dispatchEvent('pointerenter', { pointerType: 'touch' });
    expect(await open(page, 'editor')).toEqual(['Help']);
  });
});

test.describe('the keys', () => {
  test('MBR-12: the bar is one Tab stop — its first title, then the title focused last; the inline arrow keys move along the titles, wrapping, Home and End to the ends, a typed character to the next title that begins with it whatever its case; a disabled title is reached; none of them opens a menu; Tab and Shift+Tab leave the bar', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [editor()], lead: '<button id="before">before</button>' });
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterend', '<button id="after">after</button>'));
    await wire(page);
    expect((await state(page, 'editor')).stop).toBe('File');
    await page.locator('#before').focus();
    await tab(page);
    await expect.poll(() => focus(page, 'editor')).toBe('title:File');
    const path: string[] = [];
    for (const key of ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowLeft', 'End', 'Home', 'h', 'F', 'f', 'e', 'x']) {
      await page.keyboard.press(key);
      path.push((await focus(page, 'editor')).replace('title:', ''));
    }
    // Format is disabled and reached all the same; "f" finds Format after File, "F" finds File after Help.
    expect(path).toEqual(['Edit', 'View', 'Format', 'Help', 'File', 'Help', 'Help', 'File', 'Help', 'File', 'Format', 'Edit', 'Edit']);
    expect(await state(page, 'editor')).toMatchObject({ open: [], stop: 'Edit' });
    expect(await log(page)).toEqual([]);
    // One stop: Tab goes on to what follows the bar, Shift+Tab from the bar to what precedes it, and back in to the title focused last.
    await tab(page);
    expect(await focus(page, 'editor')).toBe('after');
    await tab(page, { back: true });
    await expect.poll(() => focus(page, 'editor')).toBe('title:Edit');
    await tab(page, { back: true });
    expect(await focus(page, 'editor')).toBe('before');
  });

  test('MBR-12: the Tab stop follows the menu opened last, by any input — a menu reached by travelling, or opened by a pointer — and the keys the bar handles neither scroll nor reach what is around it, while it handles no other key and not Escape', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [editor()], lead: '<button id="before">before</button>', reducedMotion: true });
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterend', '<button id="after">after</button><div style="block-size: 3000px; inline-size: 3000px"></div>'));
    await focusTitle(page, 'editor', 'File');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => state(page, 'editor')).toMatchObject({ open: ['View'], stop: 'View' });
    // Tab leaves the bar from View's menu; coming back, the stop is View, not File.
    await tab(page);
    await expect.poll(() => state(page, 'editor')).toMatchObject({ open: [], focus: 'after' });
    await tab(page, { back: true });
    await expect.poll(() => focus(page, 'editor')).toBe('title:View');
    // Opened by a pointer, closed by a press outside: the stop is that title.
    await title(page, 'editor', 'Help').click();
    await expect.poll(() => open(page, 'editor')).toEqual(['Help']);
    await page.mouse.click(300, 500);
    await expect.poll(() => state(page, 'editor')).toMatchObject({ open: [], stop: 'Help' });
    // What the bar handles goes no further and scrolls nothing; what it does not handle is left alone.
    await page.evaluate(() => {
      const seen: string[] = ((window as any).keys = []);
      document.addEventListener('keydown', (event) => seen.push(`${event.key}:${event.defaultPrevented}`));
    });
    await focusTitle(page, 'editor', 'File');
    for (const key of ['ArrowRight', 'ArrowLeft', 'End', 'Home', 'e', 'Escape', 'F2', 'Shift']) await page.keyboard.press(key);
    expect(await page.evaluate(() => (window as any).keys)).toEqual(['Escape:false', 'F2:false', 'Shift:false']);
    await focusTitle(page, 'editor', 'Format');
    for (const key of ['ArrowDown', ' ', 'ArrowUp', 'End', 'ArrowRight']) await page.keyboard.press(key);
    expect(await page.evaluate(() => [window.scrollX, window.scrollY])).toEqual([0, 0]);
    expect(await open(page, 'editor')).toEqual([]);
    // A key with a modifier is the product's.
    await page.keyboard.press('Control+f');
    expect(await focus(page, 'editor')).toBe('title:File');
  });

  test('MBR-13: from inside a menu the inline-end arrow key on an item that is not a submenu item closes it and opens the next enabled title’s menu — wrapping, passing over a disabled title, from any depth — and the inline-start key in the menu’s own surface the previous one, focus on the first enabled item with the ring; a submenu item still opens its submenu, and a submenu still closes alone; each menu’s open is set and its toggle fired once', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [editor()], reducedMotion: true });
    await wire(page);
    await focusTitle(page, 'editor', 'View');
    await page.keyboard.press('Enter');
    await expect.poll(() => focus(page, 'editor')).toBe('item:Zoom in');
    await clearLog(page);
    // Past Format, which is disabled.
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => state(page, 'editor')).toMatchObject({ open: ['Help'], focus: 'item:About' });
    expect(await quiet(page)).toBe(false);
    expect(await log(page)).toEqual(['toggle:View:false', 'toggle:Help:true']);
    // Wrapping at the end, and back.
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => state(page, 'editor')).toMatchObject({ open: ['File'], focus: 'item:New' });
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => state(page, 'editor')).toMatchObject({ open: ['Help'], focus: 'item:About' });
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => state(page, 'editor')).toMatchObject({ open: ['View'], focus: 'item:Zoom in' });
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => state(page, 'editor')).toMatchObject({ open: ['File'], focus: 'item:New' });
    // On a submenu item the inline-end key opens its submenu; in the submenu the inline-start key closes it alone.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => state(page, 'editor')).toMatchObject({ open: ['File'], focus: 'item:One' });
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => state(page, 'editor')).toMatchObject({ open: ['File'], focus: 'item:Open recent' });
    // From two levels down, on an item that opens nothing: on to the next title's menu, every level closed.
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => focus(page, 'editor')).toBe('item:Two');
    await clearLog(page);
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => state(page, 'editor')).toMatchObject({ open: ['Edit'], focus: 'item:Undo' });
    expect((await log(page)).filter((entry) => entry.startsWith('toggle'))).toEqual(['toggle:File:false', 'toggle:Edit:true']);
    await expect.poll(() => menu(page, 'editor', 'File').locator('tanrei-submenu').evaluateAll((all) => all.map((el: any) => el.open))).toEqual([false, false]);
  });

  test('MBR-13: with one enabled title the inline arrow keys in its menu do nothing, and neither scroll nor reach what is behind', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fx('one', [m('File', it('New') + it('Open')), m('Edit', it('Undo'), { disabled: true })])], reducedMotion: true });
    await page.evaluate(() => {
      document.body.insertAdjacentHTML('beforeend', '<div style="inline-size: 4000px; block-size: 10px"></div>');
      const seen: string[] = ((window as any).keys = []);
      document.addEventListener('keydown', (event) => seen.push(event.key));
    });
    await wire(page);
    await focusTitle(page, 'one', 'File');
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => focus(page, 'one')).toBe('item:New');
    await clearLog(page);
    await page.evaluate(() => ((window as any).keys.length = 0));
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    expect(await state(page, 'one')).toMatchObject({ open: ['File'], focus: 'item:New' });
    expect(await log(page)).toEqual([]);
    expect(await page.evaluate(() => (window as any).keys)).toEqual([]);
    expect(await page.evaluate(() => window.scrollX)).toBe(0);
  });

  test('MBR-14: Escape closes the innermost submenu, then the menu, returning focus to its title with the ring, so that the arrow keys go on along the bar; with no menu open the bar leaves Escape alone', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [editor()], reducedMotion: true });
    await wire(page);
    await page.evaluate(() => document.addEventListener('keydown', (event) => event.key === 'Escape' && (window as any).log.push(`escape:${event.defaultPrevented}`)));
    await title(page, 'editor', 'File').click();
    await expect.poll(() => focus(page, 'editor')).toBe('item:New');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => focus(page, 'editor')).toBe('item:One');
    await clearLog(page);
    await page.keyboard.press('Escape');
    await expect.poll(() => state(page, 'editor')).toMatchObject({ open: ['File'], focus: 'item:Open recent' });
    await page.keyboard.press('Escape');
    await expect.poll(() => state(page, 'editor')).toMatchObject({ open: [], focus: 'title:File' });
    expect(await log(page)).toEqual(['sub:Open recent:false', 'toggle:File:false']);
    await expect(menu(page, 'editor', 'File')).not.toHaveAttribute('open', '');
    // The ring, though a pointer opened it: the input that closed it was a key.
    expect(await css(container(page, 'editor', 'File'), 'outline-style')).toBe('solid');
    await page.keyboard.press('ArrowRight');
    expect(await focus(page, 'editor')).toBe('title:Edit');
    // No menu open: Escape reaches the page untouched.
    await clearLog(page);
    await page.keyboard.press('Escape');
    expect(await log(page)).toEqual(['escape:false']);
  });

  test('MBR-14: Tab and Shift+Tab in an open menu, at any level, close it and let focus move on out of the bar — to what follows it, to what precedes it — never to another title', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [editor()], lead: '<button id="before">before</button>', reducedMotion: true });
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterend', '<button id="after">after</button>'));
    await wire(page);
    for (const [back, lands] of [[false, 'after'], [true, 'before']] as const) {
      await focusTitle(page, 'editor', 'Edit');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowRight');
      await expect.poll(() => focus(page, 'editor')).toBe('item:One');
      await clearLog(page);
      await tab(page, { back });
      await expect.poll(() => state(page, 'editor'), lands).toMatchObject({ open: [], focus: lands });
      expect((await log(page)).filter((entry) => entry.startsWith('toggle')), lands).toEqual(['toggle:File:false']);
      await expect.poll(() => surfaceShown(menu(page, 'editor', 'File').locator('tanrei-menu'))).toBe(false);
    }
  });

  test('MBR-14: a press outside every surface of the open menu and outside the bar, and focus leaving the bar and the menu, close the menu and take no focus back; a press on the bar between titles, and in a submenu, close nothing', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [editor()], reducedMotion: true });
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterend', '<button id="after" style="position: fixed; inset: auto 16px 16px auto">after</button>'));
    await wire(page);
    await title(page, 'editor', 'File').click();
    await expect.poll(() => focus(page, 'editor')).toBe('item:New');
    // On the bar's own padding: the menu stays.
    const edge = await box(row(page, 'editor'));
    await page.mouse.click(edge.right - 3, edge.y + edge.height / 2);
    expect(await open(page, 'editor')).toEqual(['File']);
    // In a submenu's surface: inside.
    await menu(page, 'editor', 'File').locator('tanrei-submenu[label="Open recent"]').click();
    await expect.poll(() => surfaceShown(menu(page, 'editor', 'File').locator('tanrei-submenu[label="Open recent"]'))).toBe(true);
    expect(await open(page, 'editor')).toEqual(['File']);
    await clearLog(page);
    await page.mouse.click(400, 500);
    await expect.poll(() => open(page, 'editor')).toEqual([]);
    expect((await log(page)).filter((entry) => entry.startsWith('toggle'))).toEqual(['toggle:File:false']);
    expect(await focus(page, 'editor')).not.toMatch(/^title:/);
    // Focus leaving for an element outside.
    await title(page, 'editor', 'Edit').click();
    await expect.poll(() => focus(page, 'editor')).toBe('item:Undo');
    await clearLog(page);
    await page.locator('#after').focus();
    await expect.poll(() => state(page, 'editor')).toMatchObject({ open: [], focus: 'after' });
    expect(await log(page)).toEqual(['toggle:Edit:false']);
  });

  test('MBR-15: an action activated in an open menu, at any level, closes the menu and every submenu, fires the menu’s toggle after the item’s own event and returns focus to the title — unless the product moved focus while handling the event, where it stays; a checkbox item activated with Space leaves the menu open', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [editor()], reducedMotion: true });
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterend', '<textarea id="document"></textarea>'));
    await wire(page);
    await focusTitle(page, 'editor', 'File');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => focus(page, 'editor')).toBe('item:One');
    await clearLog(page);
    await page.keyboard.press('Enter');
    await expect.poll(() => state(page, 'editor')).toMatchObject({ open: [], focus: 'title:File' });
    expect(await log(page)).toEqual(['click:One', 'toggle:File:false']);
    await expect.poll(() => menu(page, 'editor', 'File').locator('tanrei-submenu[label="Open recent"]').evaluate((el: any) => el.open)).toBe(false);
    // The product moves focus to what the command acts on: the bar does not take it back.
    await page.evaluate(() => document.querySelector('[label="Open"]')!.addEventListener('click', () => (document.querySelector('#document') as HTMLElement).focus()));
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => focus(page, 'editor')).toBe('item:Open');
    await clearLog(page);
    await page.keyboard.press('Enter');
    await expect.poll(() => open(page, 'editor')).toEqual([]);
    // Focus leaving the bar closes the menu by itself (MBR-14), as the product's listener moves it: once, and not again after the click.
    expect((await log(page)).sort()).toEqual(['click:Open', 'toggle:File:false']);
    expect(await focus(page, 'editor')).toBe('document');
    // By a pointer: focus returns to the title without the ring.
    await title(page, 'editor', 'Edit').click();
    await menu(page, 'editor', 'Edit').locator('[label="Redo"]').click();
    await expect.poll(() => state(page, 'editor')).toMatchObject({ open: [], focus: 'title:Edit' });
    expect(await css(container(page, 'editor', 'Edit'), 'outline-style')).toBe('none');
    // A checkbox item with Space: checked, the menu still open.
    await page.keyboard.press('ArrowUp');
    await expect.poll(() => focus(page, 'editor')).toBe('item:Word wrap');
    await page.keyboard.press(' ');
    await expect.poll(() => menu(page, 'editor', 'Edit').locator('tanrei-menu-checkbox-item').evaluate((el: any) => el.checked)).toBe(true);
    expect(await state(page, 'editor')).toMatchObject({ open: ['Edit'], focus: 'item:Word wrap' });
  });

  test('MBR-16: the bar adds no event to an item and takes none away, binds no shortcut an item shows, and defines no access key', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [editor()], reducedMotion: true });
    await page.evaluate(() => {
      const heard: string[] = ((window as any).log = []);
      for (const type of ['click', 'change', 'toggle', 'close', 'select', 'input']) document.addEventListener(type, (event) => heard.push(`${type}:${(event.target as any).localName}:${(event.target as any).label ?? ''}`), true);
    });
    // The shortcut the item shows does nothing by itself, from the page or from the bar.
    await page.keyboard.press('Control+n');
    await page.keyboard.press('Meta+n');
    await focusTitle(page, 'editor', 'File');
    await page.keyboard.press('Control+n');
    expect(await log(page)).toEqual([]);
    expect(await open(page, 'editor')).toEqual([]);
    // The menu still draws and exposes it.
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => focus(page, 'editor')).toBe('item:Undo');
    await expect(menu(page, 'editor', 'File').locator('[label="New"]')).toHaveAttribute('aria-keyshortcuts', /.+/);
    await clearLog(page);
    // A checkbox item: its click and its change, the item's own, once each; the bar's toggle is the menu's.
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await expect.poll(() => open(page, 'editor')).toEqual([]);
    expect(await log(page)).toEqual(['click:tanrei-menu-checkbox-item:Word wrap', 'change:tanrei-menu-checkbox-item:Word wrap', 'toggle:tanrei-menubar-menu:Edit']);
    // No access key: no accesskey, no underlined letter, in any title.
    expect(await bar(page, 'editor').evaluate((el) => [...el.querySelectorAll('*'), ...[...el.querySelectorAll('tanrei-menubar-menu')].flatMap((each) => [...each.shadowRoot!.querySelectorAll('*')])].some((node) => node.hasAttribute('accesskey') || node.localName === 'u' || getComputedStyle(node).textDecorationLine !== 'none'))).toBe(false);
    // A product may add one: by setting open, or by moving focus to a title.
    await menu(page, 'editor', 'Help').evaluate((el: any) => (el.open = true));
    await expect.poll(() => state(page, 'editor')).toMatchObject({ open: ['Help'], focus: 'item:About' });
  });
});

test.describe('targets and disabled', () => {
  test('MBR-17: a title’s hit area reaches the minimum target on both axes without changing what is drawn; two neighbours’ hit areas meet at the middle of the gap and never overlap; a title narrower than the target is given the room by moving its neighbours apart', async ({ page }) => {
    await mountFixtures(page, spec);
    const [gap, pointer, touch, height] = [await resolveToken(page, T('bar-gap')), await resolveToken(page, '--tanrei-sys-target-pointer'), await resolveToken(page, '--tanrei-sys-target-touch'), await resolveToken(page, T('container-height'))];
    const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
    const target = coarse ? touch : pointer;
    const labels = ['Go', 'Do', 'Run'];
    const hit = async (label: string) => {
      const t = title(page, 'short-titles', label);
      const own = await box(t);
      const [top, h, start, end] = [await px(t, 'top', '::before'), await px(t, 'height', '::before'), await px(t, 'left', '::before'), await px(t, 'right', '::before')];
      // The pseudo-element is centred on the title by its transform.
      return { x: own.x + start, right: own.right - end, y: own.y + top - h / 2, bottom: own.y + top + h / 2, own };
    };
    const areas = await Promise.all(labels.map(hit));
    for (const [n, label] of labels.entries()) {
      const drawn = await box(container(page, 'short-titles', label));
      const text = await box(container(page, 'short-titles', label).locator('.label'));
      // What is drawn keeps its own size: the label and the padding, the container's height.
      expect(drawn.width, label).toBeCloseTo(text.width + 2 * (await resolveToken(page, T('container-padding-inline'))), 1);
      expect(drawn.height, label).toBeCloseTo(height, 1);
      expect(areas[n].right - areas[n].x, label).toBeGreaterThanOrEqual(target - 0.01);
      expect(areas[n].bottom - areas[n].y, label).toBeGreaterThanOrEqual(target - 0.01);
      // Centred on what is drawn.
      expect(drawn.x - areas[n].x, label).toBeCloseTo(areas[n].right - drawn.right, 1);
    }
    // "Go" is narrower than the target: it keeps the target's length in the row.
    expect((await box(container(page, 'short-titles', 'Go'))).width).toBeLessThan(target);
    expect(areas[0].own.width).toBeCloseTo(target, 1);
    for (let n = 1; n < areas.length; n += 1) {
      const middle = (areas[n - 1].own.right + areas[n].own.x) / 2;
      expect(areas[n].own.x - areas[n - 1].own.right).toBeCloseTo(gap, 1);
      expect(areas[n - 1].right).toBeCloseTo(middle, 1);
      expect(areas[n].x).toBeCloseTo(middle, 1);
    }
    // A press to either side of the middle goes to the nearer title (a wider gap, so that whole pixels lie on each side).
    await override(page, { [T('bar-gap')]: '10px' });
    const [go, next] = [await box(menu(page, 'short-titles', 'Go')), await box(menu(page, 'short-titles', 'Do'))];
    expect(next.x - go.right).toBeCloseTo(10, 1);
    const middle = (go.right + next.x) / 2;
    const y = go.y + go.height / 2;
    const under = (x: number) =>
      page.evaluate(
        ([px0, py0]) => {
          let el: Element | null = document.elementFromPoint(px0, py0);
          while (el?.shadowRoot?.elementFromPoint(px0, py0) && el.shadowRoot.elementFromPoint(px0, py0) !== el) el = el.shadowRoot.elementFromPoint(px0, py0);
          const host = el?.closest('tanrei-menubar-menu') ?? ((el?.getRootNode() as ShadowRoot).host as Element | undefined);
          return host?.getAttribute('label') ?? null;
        },
        [x, y],
      );
    expect(await under(Math.floor(middle) - 2)).toBe('Go');
    expect(await under(Math.ceil(middle) + 2)).toBe('Do');
    expect(await under(Math.floor(go.right) + 1)).toBe('Go');
    expect(await under(Math.ceil(next.x) - 1)).toBe('Do');
  });

  test('MBR-18: a disabled menu’s title is drawn from the disabled tokens of the unselected condition, opens by no input and not by the product’s open, fires no toggle, stays reachable by the keys, and is exposed as a disabled menu item that opens a menu; disabled while open, it is closed', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [editor()], reducedMotion: true });
    await override(page, { [T('unselected-disabled-container-color')]: 'rgb(5, 5, 5)', [T('unselected-disabled-label-color')]: 'rgb(6, 6, 6)', [T('disabled-opacity')]: '0.7', [T('unselected-hovered-container-color')]: 'rgb(9, 9, 9)' });
    await wire(page);
    const c = container(page, 'editor', 'Format');
    expect(await color(page, c)).toBe('rgb(5, 5, 5)');
    expect(await color(page, c.locator('.label'), 'color')).toBe('rgb(6, 6, 6)');
    expect(await css(c, 'opacity')).toBe('0.7');
    const host = menu(page, 'editor', 'Format');
    await expect(host).toHaveAttribute('role', 'menuitem');
    await expect(host).toHaveAttribute('aria-haspopup', 'menu');
    await expect(host).toHaveAttribute('aria-disabled', 'true');
    await expect(host).toHaveAttribute('aria-expanded', 'false');
    // A pointer: hovered it stays disabled, pressed it opens nothing.
    await title(page, 'editor', 'Format').click();
    expect(await color(page, c)).toBe('rgb(5, 5, 5)');
    expect(await c.evaluate((el) => el.dataset.pressed ?? null)).toBeNull();
    // The keys reach it and open nothing.
    await focusTitle(page, 'editor', 'View');
    await page.keyboard.press('ArrowRight');
    expect(await focus(page, 'editor')).toBe('title:Format');
    for (const key of ['Enter', ' ', 'ArrowDown', 'ArrowUp']) await page.keyboard.press(key);
    // The product's open is not taken.
    await host.evaluate((el: any) => (el.open = true));
    await expect.poll(() => host.evaluate((el: any) => el.open)).toBe(false);
    expect(await surfaceShown(host.locator('tanrei-menu'))).toBe(false);
    expect(await log(page)).toEqual([]);
    // Disabled while open: closed.
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Enter');
    await expect.poll(() => open(page, 'editor')).toEqual(['View']);
    await clearLog(page);
    await menu(page, 'editor', 'View').evaluate((el: any) => (el.disabled = true));
    await expect.poll(() => open(page, 'editor')).toEqual([]);
    await expect.poll(() => surfaceShown(menu(page, 'editor', 'View').locator('tanrei-menu'))).toBe(false);
    expect(await log(page)).toEqual(['toggle:View:false']);
  });
});

test.describe('what assistive technology is told', () => {
  test('MBR-19: the bar is a menubar named by label, horizontal; each title a menu item that opens a menu, named by its label, with whether it is open, its disabled state, its position and the number of titles; an open menu a menu named by its title; the overflow item one such title, named by overflowLabel', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { fixtures: [editor()], icons: true, reducedMotion: true });
    const host = bar(page, 'editor');
    await expect(host).toHaveAttribute('role', 'menubar');
    await expect(host).toHaveAttribute('aria-label', 'Application');
    await expect(host).toHaveAttribute('aria-orientation', 'horizontal');
    const described = () =>
      host.evaluate((el) =>
        [...el.querySelectorAll(':scope > tanrei-menubar-menu:not([data-tanrei-folded])'), ...el.shadowRoot!.querySelectorAll('.overflow')].map((each) =>
          ['role', 'aria-label', 'aria-haspopup', 'aria-expanded', 'aria-disabled', 'aria-posinset', 'aria-setsize'].map((name) => each.getAttribute(name) ?? '-').join(' '),
        ),
      );
    expect(await described()).toEqual([
      'menuitem File menu false - 1 5',
      'menuitem Edit menu false - 2 5',
      'menuitem View menu false - 3 5',
      'menuitem Format menu false true 4 5',
      'menuitem Help menu false - 5 5',
    ]);
    await focusTitle(page, 'editor', 'Edit');
    await page.keyboard.press('Enter');
    await expect.poll(() => focus(page, 'editor')).toBe('item:Undo');
    expect((await described())[1]).toBe('menuitem Edit menu true - 2 5');
    const opened = menu(page, 'editor', 'Edit').locator('tanrei-menu');
    await expect(opened).toHaveAttribute('role', 'menu');
    await expect(opened).toHaveAttribute('aria-label', 'Edit');
    if (browserName === 'chromium') {
      const tree = await ax(page);
      expect(tree.find((node) => node.role === 'menubar')).toMatchObject({ name: 'Application', orientation: 'horizontal' });
      expect(tree.filter((node) => node.role === 'menuitem' && node.parent === 'menubar').map((node) => `${node.name}${node.expanded === undefined ? '' : `:${node.expanded}`}${node.disabled ? ':disabled' : ''}:${node.popup}`)).toEqual([
        'File:false:menu',
        'Edit:true:menu',
        'View:false:menu',
        'Format:false:disabled:menu',
        'Help:false:menu',
      ]);
      expect(tree.find((node) => node.role === 'menu')).toMatchObject({ name: 'Edit' });
      expect(tree.filter((node) => node.parent === 'menu').map((node) => `${node.role}:${node.name}`)).toEqual(['menuitem:Undo', 'menuitem:Redo', 'menuitemcheckbox:Word wrap']);
      expect(tree.find((node) => node.focused && node.role !== 'RootWebArea')).toMatchObject({ role: 'menuitem', name: 'Undo' });
    }
    await page.keyboard.press('Escape');
    // Folded: the overflow item is the last title, and the folded menus are submenu items of its menu.
    await stageWidth(page, 'editor', 215);
    await expect.poll(async () => (await state(page, 'editor')).folded).toEqual(['View', 'Format', 'Help']);
    expect(await described()).toEqual(['menuitem File menu false - 1 3', 'menuitem Edit menu false - 2 3', 'menuitem More menus menu false - 3 3']);
    await expect(menu(page, 'editor', 'View')).toHaveAttribute('role', 'none');
    await expect(menu(page, 'editor', 'View')).not.toHaveAttribute('tabindex');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await expect.poll(() => focus(page, 'editor')).toBe('item:View');
    if (browserName === 'chromium') {
      const tree = await ax(page);
      expect(tree.filter((node) => node.role === 'menuitem' && node.parent === 'menubar').map((node) => `${node.name}:${node.expanded}`)).toEqual(['File:false', 'Edit:false', 'More menus:true']);
      expect(tree.find((node) => node.role === 'menu')).toMatchObject({ name: 'More menus' });
      expect(tree.filter((node) => node.parent === 'menu').map((node) => `${node.role}:${node.name}:${node.popup}${node.disabled ? ':disabled' : ''}`)).toEqual(['menuitem:View:menu', 'menuitem:Format:menu:disabled', 'menuitem:Help:menu']);
    }
  });

  test('MBR-20: without a label the bar still works and is reported; a menu without a label is an empty title of the title’s height and paddings, reachable and operable; a bar with neither a menu nor a bar item draws nothing on it and takes no focus; what is neither gets no title, no key and no place in the row — a field, a control of the product’s own, an entry that holds a state — and a bar item is let in', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [
        fx('unnamed', [m('', it('New')), m('Edit', it('Undo'))], { label: '' }),
        { id: 'nothing', props: { label: 'Application' }, items: [] },
        { ...fx('strays', [m('File', it('New')), b('Run')]), content: '<button id="stray">Run</button><a id="link" href="#x">Docs</a><input id="field" aria-label="Find"><tanrei-menu-checkbox-item id="held" label="Word wrap"></tanrei-menu-checkbox-item>' },
      ],
      lead: '<button id="before">before</button>',
      reducedMotion: true,
    });
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterend', '<button id="after">after</button>'));
    await expect(bar(page, 'unnamed')).not.toHaveAttribute('aria-label');
    await expect.poll(() => seen.filter((text) => text.includes('MBR-20')).length).toBeGreaterThanOrEqual(4);
    expect(seen.some((text) => text.includes('<tanrei-menubar>') && text.includes('label is empty'))).toBe(true);
    expect(seen.some((text) => text.includes('<tanrei-menubar-menu>') && text.includes('label is empty'))).toBe(true);
    // The empty title: the container at its height and paddings, nothing in it, and it opens its menu.
    const empty = bar(page, 'unnamed').locator('tanrei-menubar-menu').first();
    const drawn = await box(empty.locator('.container'));
    expect(drawn.height).toBeCloseTo(await resolveToken(page, T('container-height')), 1);
    expect(drawn.width).toBeCloseTo(2 * (await resolveToken(page, T('container-padding-inline'))), 1);
    await expect(empty).not.toHaveAttribute('aria-label');
    await empty.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => focus(page, 'unnamed')).toBe('item:New');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => state(page, 'unnamed')).toMatchObject({ open: ['Edit'], focus: 'item:Undo' });
    await page.keyboard.press('Escape');
    // No menu: the bar, at its paddings, with nothing on it and no Tab stop.
    expect(seen.some((text) => text.includes('<tanrei-menubar>') && text.includes('it holds neither a menu nor a bar item') && text.includes('MBR-20'))).toBe(true);
    const bare = await box(bar(page, 'nothing'));
    expect(bare.height).toBeCloseTo(2 * (await resolveToken(page, T('bar-padding-block'))), 1);
    expect(await bar(page, 'nothing').evaluate((el) => !!el.shadowRoot!.querySelector('[tabindex]') || el.hasAttribute('tabindex'))).toBe(false);
    // Neither a menu nor a bar item — a Button, an anchor written straight into the bar, a field, an entry that holds a
    // state: reported, not drawn, not a stop of the bar's, no key. The report no longer names an action or a link.
    for (const tag of ['<button>', '<a>', '<input>', '<tanrei-menu-checkbox-item>']) {
      const said = seen.find((text) => text.includes(`it holds ${tag}`) && text.includes('MBR-20'));
      expect(said, tag).toContain('neither a <tanrei-menubar-menu> nor a <tanrei-menubar-item>');
      expect(said, tag).toContain('a field, a control of the product\'s own or an entry that holds a state');
      expect(said, tag).not.toMatch(/an action, a link/);
    }
    for (const stray of ['#stray', '#link', '#field', '#held']) {
      expect(await page.locator(stray).evaluate((el) => el.getBoundingClientRect().width + el.getBoundingClientRect().height)).toBe(0);
      expect(await page.locator(stray).evaluate((el) => el.assignedSlot)).toBeNull();
    }
    // The bar item is let in: no report names it, and it is the row's second and last entry.
    expect(seen.some((text) => text.includes('it holds <tanrei-menubar-item>'))).toBe(false);
    await focusTitle(page, 'strays', 'File');
    for (const [key, at] of [['ArrowRight', 'Run'], ['ArrowRight', 'File'], ['End', 'Run'], ['ArrowLeft', 'File']] as const) {
      await page.keyboard.press(key);
      expect(await focus(page, 'strays'), key).toBe(`title:${at}`);
    }
    await tab(page);
    expect(await focus(page, 'strays')).toBe('after');
  });

  test('MBR-20: a menu with no item still draws its title and opens its surface, empty; focus stays on the title while it is open, the inline arrow keys travel from it, Escape and Tab close it, and it is reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [fx('hollow', [m('File', it('New')), m('Edit'), m('View', it('Zoom in'))])], reducedMotion: true });
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterend', '<button id="after">after</button>'));
    await wire(page);
    await expect.poll(() => seen.some((text) => text.includes('MBR-20') && text.includes('"Edit" holds no item'))).toBe(true);
    await focusTitle(page, 'hollow', 'Edit');
    await page.keyboard.press('Enter');
    await expect.poll(() => surfaceShown(menu(page, 'hollow', 'Edit').locator('tanrei-menu'))).toBe(true);
    expect(await state(page, 'hollow')).toMatchObject({ open: ['Edit'], focus: 'title:Edit' });
    await expect(title(page, 'hollow', 'Edit')).toHaveClass(/expanded/);
    const surface = await box(surfaceOf(page, 'hollow', 'Edit'));
    expect(surface.height).toBeCloseTo(2 * (await resolveToken(page, '--tanrei-comp-menu-surface-padding-block')), 1);
    // The inline arrow keys, as in a menu's own surface: on to the neighbours' menus, and back onto the title.
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => state(page, 'hollow')).toMatchObject({ open: ['View'], focus: 'item:Zoom in' });
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => state(page, 'hollow')).toMatchObject({ open: ['Edit'], focus: 'title:Edit' });
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => state(page, 'hollow')).toMatchObject({ open: ['File'], focus: 'item:New' });
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => state(page, 'hollow')).toMatchObject({ open: ['Edit'], focus: 'title:Edit' });
    await clearLog(page);
    await page.keyboard.press('Escape');
    await expect.poll(() => state(page, 'hollow')).toMatchObject({ open: [], focus: 'title:Edit' });
    expect(await log(page)).toEqual(['toggle:Edit:false']);
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => open(page, 'hollow')).toEqual(['Edit']);
    await tab(page);
    await expect.poll(() => state(page, 'hollow')).toMatchObject({ open: [], focus: 'after' });
    // A hovering pointer brings an empty menu along too, focus on its title.
    await title(page, 'hollow', 'File').click();
    await expect.poll(() => focus(page, 'hollow')).toBe('item:New');
    const at = await box(container(page, 'hollow', 'Edit'));
    await page.mouse.move(at.x + at.width / 2, at.y + at.height / 2);
    await expect.poll(() => state(page, 'hollow')).toMatchObject({ open: ['Edit'], focus: 'title:Edit' });
  });
});

/** Chromium's accessibility tree, flattened: each node's role, name and states, and the role of its nearest exposed ancestor. */
async function ax(page: P) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  const byId = new Map(nodes.map((node) => [node.nodeId, node]));
  const structural = new Set(['none', 'generic', 'presentation', 'group', 'InlineTextBox', 'StaticText']);
  return nodes
    .filter((node) => !node.ignored)
    .map((node) => {
      const property = (name: string) => node.properties?.find((p) => p.name === name)?.value?.value;
      let parent: string | undefined;
      for (let at = node.parentId ? byId.get(node.parentId) : undefined; at; at = at.parentId ? byId.get(at.parentId) : undefined) {
        if (at.ignored || structural.has(at.role?.value as string)) continue;
        parent = at.role?.value as string;
        break;
      }
      return {
        role: node.role?.value as string,
        name: (node.name?.value ?? '') as string,
        parent,
        expanded: property('expanded') as boolean | undefined,
        disabled: property('disabled') === true,
        focused: property('focused') === true,
        popup: property('hasPopup') as string | undefined,
        orientation: property('orientation') as string | undefined,
        description: (node.description?.value ?? '') as string,
      };
    });
}

test.describe('the fold', () => {
  test('MBR-21: titles that need more than the row has keep their size and fold whole from the end, as few as make the rest fit beside the overflow item — the icon set’s more_horiz through the icon helper, in a container at least container.height wide and tall; never wrapped, scrolled, shrunk or cut; none while every title fits; every one where the first does not fit', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const [gap, pad, height] = [await resolveToken(page, T('bar-gap')), await resolveToken(page, T('bar-padding-inline')), await resolveToken(page, T('container-height'))];
    // Every title fits: no overflow item.
    expect(await state(page, 'default')).toMatchObject({ folded: [], overflow: null });
    for (const id of ['many', 'many-rtl', 'long-labels']) {
      const labels = spec.fixtures.find((f) => f.id === id)!.items!.map((each) => String(each.props.label));
      const { folded } = await state(page, id);
      expect(folded.length, id).toBeGreaterThan(0);
      // From the end, in the order given.
      expect(folded, id).toEqual(labels.slice(labels.length - folded.length));
      const inner = await box(row(page, id));
      const kept = labels.slice(0, labels.length - folded.length);
      const boxes = await Promise.all(kept.map((label) => box(menu(page, id, label))));
      const over = await box(overflow(page, id));
      // One line, inside the row, the overflow item last.
      for (const each of boxes) expect(each.y, id).toBeCloseTo(boxes[0]?.y ?? each.y, 1);
      const last = boxes.at(-1);
      const rtl = id.endsWith('rtl');
      if (last) expect(rtl ? last.x - over.right : over.x - last.right, id).toBeCloseTo(gap, 1);
      expect(rtl ? over.x - inner.x : inner.right - over.right, id).toBeGreaterThanOrEqual(pad - 0.6);
      // As few as needed: the next title would not have fitted beside the overflow item.
      const next = await bar(page, id).evaluate((el, n) => (el.shadowRoot!.querySelectorAll('.ruler > .menu-copy')[n] as HTMLElement).getBoundingClientRect().width, kept.length);
      const used = (last ? (rtl ? inner.right - last.x : last.right - inner.x) : pad) + (last ? gap : 0);
      expect(used + next + gap + over.width + pad, id).toBeGreaterThan(inner.width);
      // Nothing wraps, scrolls or is cut.
      expect(await row(page, id).evaluate((el) => getComputedStyle(el).flexWrap)).toBe('nowrap');
      expect(await bar(page, id).evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      expect(inner.height, id).toBeCloseTo((await box(row(page, 'default'))).height, 1);
      // A title keeps the size it has unfolded.
      if (kept[0]) expect(boxes[0].width, id).toBeCloseTo(await bar(page, id).evaluate((el) => (el.shadowRoot!.querySelector('.ruler > .menu-copy') as HTMLElement).getBoundingClientRect().width), 1);
    }
    // The overflow item: the glyph, drawn by the icon helper at icon.size in its condition's color, in a square container.
    const over = overflow(page, 'many');
    const icon = over.locator('.icon');
    const size = await resolveToken(page, T('icon-size'));
    expect(await icon.textContent()).toBe('more_horiz');
    await expect(icon).toHaveAttribute('aria-hidden', 'true');
    await expect(icon).toHaveAttribute('data-drawn', '');
    expect((await box(icon)).width).toBeCloseTo(size, 1);
    expect(await css(icon, 'font-family')).toContain(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tanrei-sys-icon-family-unselected').trim().replaceAll('"', '').split(',')[0]));
    expect(await css(icon, 'font-variation-settings')).toContain('"FILL" 0');
    expect(await css(icon, 'color')).toBe(await resolveColor(page, T('unselected-icon-color')));
    const square = await box(over.locator('.container'));
    expect(square.width).toBeCloseTo(height, 1);
    expect(square.height).toBeCloseTo(height, 1);
    expect(Math.abs((await box(icon)).x - square.x - (square.right - (await box(icon)).right))).toBeLessThan(0.1);
    // Narrower than its first title beside the overflow item: the row is the overflow item alone.
    await stageWidth(page, 'long-labels', 200);
    await expect.poll(async () => (await state(page, 'long-labels')).folded.length).toBe(4);
    expect(await row(page, 'long-labels').evaluate((el) => (el.querySelector('slot.row') as HTMLSlotElement).assignedElements().length)).toBe(0);
  });

  test('MBR-21: what fits is decided again, at once and without a motion, when the bar’s inline size, its menus, a label or the text size changes', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [editor()], icons: true });
    const folded = async () => (await state(page, 'editor')).folded;
    expect(await folded()).toEqual([]);
    await stageWidth(page, 'editor', 300);
    await expect.poll(folded).toEqual(['Format', 'Help']);
    // Decided in the frame the size changed in: nothing is animated into place.
    expect(await bar(page, 'editor').evaluate((el) => el.shadowRoot!.getAnimations().length)).toBe(0);
    await stageWidth(page, 'editor', 560);
    await expect.poll(folded).toEqual([]);
    // A longer label, and the short one again.
    await stageWidth(page, 'editor', 345);
    await expect.poll(folded).toEqual([]);
    await menu(page, 'editor', 'File').evaluate((el) => el.setAttribute('label', 'File and folders'));
    await expect.poll(async () => (await folded()).length).toBeGreaterThan(0);
    await menu(page, 'editor', 'File and folders').evaluate((el) => el.setAttribute('label', 'File'));
    await expect.poll(folded).toEqual([]);
    // One menu more, and one fewer.
    await bar(page, 'editor').evaluate((el) => el.insertAdjacentHTML('beforeend', '<tanrei-menubar-menu label="Window"></tanrei-menubar-menu>'));
    await expect.poll(async () => (await folded()).at(-1)).toBe('Window');
    await bar(page, 'editor').evaluate((el) => el.querySelector('[label="Window"]')!.remove());
    await expect.poll(folded).toEqual([]);
    // The text size.
    await page.evaluate(() => (document.documentElement.style.fontSize = '150%'));
    await expect.poll(async () => (await folded()).length).toBeGreaterThan(0);
    await page.evaluate(() => (document.documentElement.style.fontSize = ''));
    await expect.poll(folded).toEqual([]);
  });

  test('MBR-22: the overflow item is a title in every respect, and its menu lists the folded menus in order, each a submenu item named by the menu’s label holding the menu’s items unchanged, a disabled menu a disabled one; a folded menu’s open is set and its toggle fired as its submenu opens and closes; the fold’s level is not counted in the depth reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [fx('deep', [...EDITOR().slice(1), EDITOR()[0]])], icons: true, reducedMotion: true });
    await wire(page);
    await stageWidth(page, 'deep', 170);
    await expect.poll(async () => (await state(page, 'deep')).folded).toEqual(['View', 'Format', 'Help', 'File']);
    // The product's elements stay where the product wrote them.
    expect(await bar(page, 'deep').evaluate((el) => [...el.children].map((each) => `${each.localName}:${(each as any).label}`))).toEqual(['tanrei-menubar-menu:Edit', 'tanrei-menubar-menu:View', 'tanrei-menubar-menu:Format', 'tanrei-menubar-menu:Help', 'tanrei-menubar-menu:File']);
    expect(await menu(page, 'deep', 'File').evaluate((el) => [...el.children].map((each) => (each as any).label))).toEqual(['New', 'Open', 'Open recent', 'Save', 'Print']);
    // A title: the Tab stop along the bar, the keys, the expanded condition, the press.
    await focusTitle(page, 'deep', 'Edit');
    await page.keyboard.press('ArrowRight');
    expect(await state(page, 'deep')).toMatchObject({ focus: 'title:overflow', stop: 'overflow' });
    expect(await css(overflow(page, 'deep').locator('.container'), 'outline-style')).toBe('solid');
    await page.keyboard.press('ArrowRight');
    expect(await focus(page, 'deep')).toBe('title:Edit');
    await page.keyboard.press('m');
    expect(await focus(page, 'deep')).toBe('title:overflow');
    await page.keyboard.press('ArrowUp');
    await expect.poll(() => state(page, 'deep')).toMatchObject({ overflow: true, focus: 'item:File', open: [] });
    await expect(overflow(page, 'deep').locator('.title')).toHaveClass(/expanded/);
    expect(await color(page, overflow(page, 'deep').locator('.icon'), 'color')).toBe(await resolveColor(page, T('expanded-icon-color')));
    // Its menu: the folded menus in order, as submenu items; the disabled one disabled.
    const rows = await bar(page, 'deep').evaluate((el) =>
      [...el.querySelectorAll('tanrei-menubar-menu[data-tanrei-folded]')].map((each) => {
        const item = each.shadowRoot!.querySelector('tanrei-submenu')!;
        return `${item.getAttribute('role')}:${item.getAttribute('aria-label')}:${item.getAttribute('aria-haspopup')}:${item.getAttribute('aria-disabled') ?? 'enabled'}:${item.getAttribute('aria-posinset')}/${item.getAttribute('aria-setsize')}`;
      }),
    );
    expect(rows).toEqual(['menuitem:View:menu:enabled:1/4', 'menuitem:Format:menu:true:2/4', 'menuitem:Help:menu:enabled:3/4', 'menuitem:File:menu:enabled:4/4']);
    // MNU-42 … MNU-52: opened by the inline-end key, focus on its first item; its toggle is the menu's own.
    await clearLog(page);
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => state(page, 'deep')).toMatchObject({ overflow: true, focus: 'item:New', open: ['File'] });
    await expect(menu(page, 'deep', 'File')).toHaveAttribute('open', '');
    expect(await log(page)).toEqual(['toggle:File:true']);
    // The menu's own two levels below the fold are not a third and a fourth.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => focus(page, 'deep')).toBe('item:Two');
    expect(seen.filter((text) => text.includes('MNU-52'))).toEqual([]);
    // The inline-start key closes one level at a time, the folded menu's with its toggle.
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await clearLog(page);
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => state(page, 'deep')).toMatchObject({ overflow: true, focus: 'item:File', open: [] });
    expect(await log(page)).toEqual(['toggle:File:false']);
    // A pointer on the row opens it after the menu's delay, and an item's activation closes all of it.
    await page.keyboard.press('Home');
    await page.keyboard.press('Enter');
    await expect.poll(() => state(page, 'deep')).toMatchObject({ focus: 'item:Zoom in', open: ['View'] });
    await clearLog(page);
    await page.keyboard.press('Enter');
    await expect.poll(() => state(page, 'deep')).toMatchObject({ overflow: false, open: [], focus: 'title:overflow' });
    expect(await log(page)).toEqual(['click:Zoom in', 'toggle:View:false']);
    // MBR-13 from the fold: the inline-start key in the overflow item's own surface goes to the previous title's menu.
    await page.keyboard.press('Enter');
    await expect.poll(() => focus(page, 'deep')).toBe('item:View');
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => state(page, 'deep')).toMatchObject({ overflow: false, open: ['Edit'], focus: 'item:Undo' });
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => state(page, 'deep')).toMatchObject({ overflow: true, open: [], focus: 'item:View' });
    // MBR-11: the pointer brings the overflow item's menu along as any title's.
    const edit = await box(container(page, 'deep', 'Edit'));
    await page.mouse.move(edit.x + edit.width / 2, edit.y + edit.height / 2);
    await expect.poll(() => state(page, 'deep')).toMatchObject({ overflow: false, open: ['Edit'] });
    const more = await box(overflow(page, 'deep').locator('.container'));
    await page.mouse.move(more.x + more.width / 2, more.y + more.height / 2);
    await expect.poll(() => state(page, 'deep')).toMatchObject({ overflow: true, open: [] });
    await page.mouse.click(more.x + more.width / 2, more.y + more.height / 2);
    await expect.poll(() => state(page, 'deep')).toMatchObject({ overflow: false, open: [], focus: 'title:overflow' });
  });

  test('MBR-22: a change that folds or unfolds the open menu closes it first and moves focus that was inside it to the title it is now reached from — the overflow item, or its own', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [editor()], icons: true, reducedMotion: true });
    await wire(page);
    await focusTitle(page, 'editor', 'Help');
    await page.keyboard.press('Enter');
    await expect.poll(() => state(page, 'editor')).toMatchObject({ open: ['Help'], focus: 'item:About' });
    await clearLog(page);
    await stageWidth(page, 'editor', 260);
    await expect.poll(() => state(page, 'editor')).toMatchObject({ open: [], overflow: false, focus: 'title:overflow', stop: 'overflow' });
    expect(await log(page)).toEqual(['toggle:Help:false']);
    expect((await state(page, 'editor')).folded).toContain('Help');
    // Open as a submenu of the overflow item's menu, then given room again.
    await page.keyboard.press('Enter');
    await page.keyboard.press('End');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => state(page, 'editor')).toMatchObject({ open: ['Help'], focus: 'item:About', overflow: true });
    await clearLog(page);
    await stageWidth(page, 'editor', 560);
    await expect.poll(() => state(page, 'editor')).toMatchObject({ open: [], overflow: null, folded: [], focus: 'title:Help' });
    expect(await log(page)).toEqual(['toggle:Help:false']);
    // A menu that stays in the row stays open.
    await page.keyboard.press('Home');
    await page.keyboard.press('Enter');
    await expect.poll(() => focus(page, 'editor')).toBe('item:New');
    await stageWidth(page, 'editor', 300);
    await expect.poll(async () => (await state(page, 'editor')).folded.length).toBeGreaterThan(0);
    expect(await state(page, 'editor')).toMatchObject({ open: ['File'], focus: 'item:New' });
  });

  test('MBR-22, MBR-23: the overflow item’s name is overflowLabel, else the product’s word menubarOverflowLabel; with neither it is still drawn and works, is exposed without a name and the missing word is reported once — and no word of Tanrei’s own stands in', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [editor('worded', { overflowLabel: '' }), editor('own', { overflowLabel: 'Other menus' }), editor('second', { overflowLabel: '' })], icons: true, reducedMotion: true });
    for (const id of ['worded', 'own', 'second']) await stageWidth(page, id, 200);
    await expect.poll(async () => (await state(page, 'second')).folded.length).toBeGreaterThan(0);
    // Nobody gave the word: unnamed, working, reported once for the page.
    await expect(overflow(page, 'worded')).not.toHaveAttribute('aria-label');
    await expect(overflow(page, 'own')).toHaveAttribute('aria-label', 'Other menus');
    await expect.poll(() => missingWords(page)).toEqual(['menubarOverflowLabel']);
    expect(seen.filter((text) => text.includes('menubarOverflowLabel'))).toHaveLength(1);
    expect(seen.find((text) => text.includes('menubarOverflowLabel'))).toContain('MBR-22');
    await overflow(page, 'worded').locator('.title').click();
    await expect.poll(() => state(page, 'worded')).toMatchObject({ overflow: true });
    await expect(overflow(page, 'worded').locator('tanrei-menu')).not.toHaveAttribute('aria-label');
    await page.keyboard.press('Escape');
    // Nothing a person reads or hears is Tanrei's: the only text of the bar's own is the glyph's name, hidden.
    expect(await bar(page, 'worded').evaluate((el) => [...el.shadowRoot!.querySelectorAll('.bar *')].flatMap((node) => [...node.childNodes].filter((child) => child.nodeType === 3 && child.textContent!.trim() && !(node as Element).closest('[aria-hidden="true"]')).map((child) => child.textContent)))).toEqual([]);
    // The product's words name it, the instance's own word winning.
    await setWords(page, { menubarOverflowLabel: 'More menus' });
    await expect(overflow(page, 'worded')).toHaveAttribute('aria-label', 'More menus');
    await expect(overflow(page, 'second')).toHaveAttribute('aria-label', 'More menus');
    await expect(overflow(page, 'own')).toHaveAttribute('aria-label', 'Other menus');
    // The bar's own name and the titles are the instance's, never read from the words.
    await expect(bar(page, 'worded')).toHaveAttribute('aria-label', 'Application');
    await expect(menu(page, 'worded', 'File')).toHaveAttribute('aria-label', 'File');
  });
});

test.describe('direction', () => {
  test('MBR-24: the direction comes from where the bar is used, and a change of it while shown is followed at once — the titles laid out again, focus, the Tab stop and the open menu kept, the menu placed by the new direction', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [editor()], reducedMotion: true });
    expect(await bar(page, 'editor').evaluate((el) => el.hasAttribute('dir') || 'direction' in el)).toBe(false);
    await focusTitle(page, 'editor', 'Edit');
    await page.keyboard.press('Enter');
    await expect.poll(() => state(page, 'editor')).toMatchObject({ open: ['Edit'], focus: 'item:Undo', stop: 'Edit' });
    const before = { file: await box(menu(page, 'editor', 'File')), edit: await box(container(page, 'editor', 'Edit')) };
    await page.locator('[data-fixture="editor"]').evaluate((el) => el.setAttribute('dir', 'rtl'));
    const inner = await box(row(page, 'editor'));
    await expect.poll(async () => (await box(menu(page, 'editor', 'File'))).right).toBeCloseTo(inner.right - (await resolveToken(page, T('bar-padding-inline'))), 1);
    expect((await box(menu(page, 'editor', 'File'))).x).toBeGreaterThan(before.file.x);
    expect(await state(page, 'editor')).toMatchObject({ open: ['Edit'], focus: 'item:Undo', stop: 'Edit' });
    // The open menu, by the new direction: its right edge on the title's.
    await expect.poll(async () => (await box(surfaceOf(page, 'editor', 'Edit'))).right).toBeCloseTo((await box(container(page, 'editor', 'Edit'))).right, 1);
    expect(await bar(page, 'editor').evaluate((el) => el.shadowRoot!.getAnimations().length)).toBe(0);
    // And the keys follow it.
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => state(page, 'editor')).toMatchObject({ open: ['View'], focus: 'item:Zoom in' });
  });

  test('MBR-25: right-to-left — the titles from the right edge in the order given, the fold at the left end with the overflow item there, each menu below its title with their right edges together, Left Arrow to the next title and Right Arrow to the previous; the order of focus stays the order given', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [editor('editor', {}, 'rtl')], icons: true, reducedMotion: true });
    const labels = ['File', 'Edit', 'View', 'Format', 'Help'];
    const inner = await box(row(page, 'editor'));
    const pad = await resolveToken(page, T('bar-padding-inline'));
    const boxes = await Promise.all(labels.map((label) => box(menu(page, 'editor', label))));
    expect(boxes[0].right).toBeCloseTo(inner.right - pad, 1);
    for (let n = 1; n < boxes.length; n += 1) expect(boxes[n].right).toBeLessThan(boxes[n - 1].x + 0.01);
    await focusTitle(page, 'editor', 'File');
    const path: string[] = [];
    for (const key of ['ArrowLeft', 'ArrowLeft', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'End', 'Home']) {
      await page.keyboard.press(key);
      path.push((await focus(page, 'editor')).replace('title:', ''));
    }
    expect(path).toEqual(['Edit', 'View', 'Edit', 'File', 'Help', 'Help', 'File']);
    // The menu: right edges together; from inside it, Left Arrow is "next".
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => focus(page, 'editor')).toBe('item:New');
    expect((await box(surfaceOf(page, 'editor', 'File'))).right).toBeCloseTo((await box(container(page, 'editor', 'File'))).right, 1);
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => state(page, 'editor')).toMatchObject({ open: ['Edit'], focus: 'item:Undo' });
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => state(page, 'editor')).toMatchObject({ open: ['File'], focus: 'item:New' });
    // A submenu item opens toward the inline end, which is the left.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => focus(page, 'editor')).toBe('item:One');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    // The fold: from the left end, the overflow item the leftmost title; the glyph is not one the icon set mirrors.
    await stageWidth(page, 'editor', 215);
    await expect.poll(async () => (await state(page, 'editor')).folded).toEqual(['View', 'Format', 'Help']);
    const over = await box(overflow(page, 'editor'));
    expect(over.right).toBeLessThan((await box(menu(page, 'editor', 'Edit'))).x + 0.01);
    expect(over.x).toBeGreaterThanOrEqual((await box(row(page, 'editor'))).x + pad - 0.6);
    expect(await overflow(page, 'editor').locator('.icon').evaluate((el) => el.hasAttribute('data-tanrei-mirrored'))).toBe(false);
    expect(await css(overflow(page, 'editor').locator('.icon'), 'transform')).toBe('none');
  });

  test('MBR-26: each title’s label is text of its own direction, isolated — a left-to-right word keeps its order in a right-to-left bar — while the title is placed by the layout’s direction', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: spec.fixtures.filter((f) => f.id === 'ltr-titles-rtl') });
    const id = 'ltr-titles-rtl';
    const labels = spec.fixtures.find((f) => f.id === id)!.items!.map((each) => String(each.props.label));
    for (const label of labels) expect(await css(container(page, id, label).locator('.label'), 'unicode-bidi'), label).toBe('plaintext');
    // Placed by the layout: from the right, in the order given, whatever each label's own direction.
    const boxes = await Promise.all(labels.map((label) => box(menu(page, id, label))));
    for (let n = 1; n < boxes.length; n += 1) expect(boxes[n].right, labels[n]).toBeLessThan(boxes[n - 1].x + 0.01);
    // "Tanrei 2.0" keeps its own order: the number after the word, at the right.
    const order = await container(page, id, 'Tanrei 2.0')
      .locator('.label')
      .evaluate((el) => {
        const text = [...el.childNodes].find((node) => node.nodeType === 3) as Text;
        const at = (from: number, to: number) => {
          const range = document.createRange();
          range.setStart(text, from);
          range.setEnd(text, to);
          return range.getBoundingClientRect().x;
        };
        return at(0, 6) < at(7, 10);
      });
    expect(order).toBe(true);
  });
});

test.describe('text size, colors, motion', () => {
  test('MBR-27: with the text enlarged a title grows with its label and the row with its titles, the gap and paddings as they are, and what fits is decided again — at twice the text size in a window 320 wide every menu is still reached, nothing is cut and nothing scrolls sideways', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await mountFixtures(page, spec, { fixtures: [editor()], icons: true, reducedMotion: true });
    await page.locator('[data-fixture="editor"]').evaluate((el) => {
      (el as HTMLElement).style.inlineSize = '100%';
      (el as HTMLElement).style.boxSizing = 'border-box';
      document.querySelector('main')!.style.alignItems = 'stretch';
    });
    const heightBefore = (await box(container(page, 'editor', 'File'))).height;
    const widthBefore = (await box(container(page, 'editor', 'File'))).width;
    const [gap, pad, padBlock] = [await resolveToken(page, T('bar-gap')), await resolveToken(page, T('container-padding-inline')), await resolveToken(page, T('bar-padding-block'))];
    // Twice the text size: the type scale's sizes are rem.
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    await expect.poll(async () => (await box(container(page, 'editor', 'File'))).width).toBeGreaterThan(widthBefore + 4);
    const c = await box(container(page, 'editor', 'File'));
    const l = await box(container(page, 'editor', 'File').locator('.label'));
    expect(c.height).toBeGreaterThanOrEqual(heightBefore - 0.01);
    expect(c.height).toBeGreaterThanOrEqual(l.height - 0.01);
    // The paddings and the gap are still the tokens' — whatever the tokens are at this text size — and nothing else is added.
    expect(pad + gap + padBlock).toBeGreaterThan(0);
    const [gapNow, padNow, padBlockNow] = [await resolveToken(page, T('bar-gap')), await resolveToken(page, T('container-padding-inline')), await resolveToken(page, T('bar-padding-block'))];
    expect(c.width).toBeCloseTo(l.width + 2 * padNow, 1);
    expect((await box(row(page, 'editor'))).height).toBeCloseTo(c.height + 2 * padBlockNow, 1);
    const { folded } = await state(page, 'editor');
    expect(folded.length).toBeGreaterThan(0);
    const kept = ['File', 'Edit', 'View', 'Format', 'Help'].slice(0, 5 - folded.length);
    if (kept.length > 1) expect((await box(menu(page, 'editor', kept[1]))).x - (await box(menu(page, 'editor', kept[0]))).right).toBeCloseTo(gapNow, 1);
    // No scrolling sideways, nothing outside the window.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    expect((await box(overflow(page, 'editor'))).right).toBeLessThanOrEqual(320);
    // Every menu is reached: its own title, or the overflow item's menu.
    const reached: string[] = [];
    for (const label of kept) {
      await focusTitle(page, 'editor', label);
      reached.push(label);
    }
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await expect.poll(() => state(page, 'editor')).toMatchObject({ overflow: true });
    for (const _ of folded) {
      reached.push((await focus(page, 'editor')).replace('item:', ''));
      await page.keyboard.press('ArrowDown');
    }
    expect(reached).toEqual(['File', 'Edit', 'View', 'Format', 'Help']);
    // A folded menu's own items are reached too, in a surface that starts and ends inside the window (the Menu's own
    // bound, MNU-3: at twice the text size its minimum width is wider than this window less its margins).
    await page.keyboard.press('Home');
    if ((await focus(page, 'editor')) === 'item:Format') await page.keyboard.press('ArrowDown');
    const from = (await focus(page, 'editor')).replace('item:', '');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => open(page, 'editor')).toEqual([from]);
    const surfaces = await bar(page, 'editor').evaluate((el) =>
      [...el.shadowRoot!.querySelectorAll('.overflow tanrei-menu'), ...[...el.querySelectorAll('tanrei-menubar-menu[data-tanrei-folded]')].map((host) => host.shadowRoot!.querySelector('tanrei-submenu')!)]
        .map((host) => host.shadowRoot!.querySelector('.surface:popover-open')?.getBoundingClientRect())
        .filter((rect): rect is DOMRect => !!rect)
        .map((rect) => [rect.left, rect.right]),
    );
    expect(surfaces).toHaveLength(2);
    for (const [left, right] of surfaces) {
      expect(left).toBeGreaterThanOrEqual(0);
      expect(right).toBeLessThanOrEqual(320);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test('MBR-28: forced colors — the labels and the glyph in the button text color, a disabled title in the disabled text color, the open title in the highlight colors, a hovered title by a line around its container and never by a fill, the focus ring in the highlight color, and no fill for the bar', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [editor()], icons: true, reducedMotion: true });
    await override(page, { [T('bar-color')]: 'rgb(10, 20, 30)' });
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    const forced = await page.evaluate(() => {
      const probe = document.body.appendChild(document.createElement('div'));
      probe.style.color = 'rgb(1, 2, 3)';
      const repainted = matchMedia('(forced-colors: active)').matches && getComputedStyle(probe).color !== 'rgb(1, 2, 3)';
      probe.remove();
      return repainted;
    });
    test.skip(!forced, 'forced colors are not emulated by this browser');
    const system = (name: string, property = 'color') =>
      page.evaluate(
        ([value, p]) => {
          const probe = document.body.appendChild(document.createElement('span'));
          probe.style.setProperty('forced-color-adjust', 'none');
          probe.style.setProperty(p, value);
          const read = getComputedStyle(probe).getPropertyValue(p);
          probe.remove();
          return read;
        },
        [name, property],
      );
    const [buttonText, gray, highlight, highlightText] = [await system('ButtonText'), await system('GrayText'), await system('Highlight'), await system('HighlightText')];
    const transparent = 'rgba(0, 0, 0, 0)';
    expect(await css(row(page, 'editor'), 'background-color')).toMatch(/, 0\)$/);
    expect(await css(container(page, 'editor', 'File').locator('.label'), 'color')).toBe(buttonText);
    expect(await css(container(page, 'editor', 'File'), 'background-color')).toBe(transparent);
    expect(await css(container(page, 'editor', 'Format').locator('.label'), 'color')).toBe(gray);
    // Hovered: a line of sys.border.hairline, no fill.
    const hairline = await resolveToken(page, '--tanrei-sys-border-hairline');
    const at = await box(container(page, 'editor', 'View'));
    await page.mouse.move(at.x + at.width / 2, at.y + at.height / 2);
    expect(await css(container(page, 'editor', 'View'), 'background-color')).toBe(transparent);
    expect(await css(container(page, 'editor', 'View'), 'box-shadow')).toBe(`${buttonText} 0px 0px 0px ${hairline}px inset`);
    await page.mouse.move(2, 400);
    // Keyboard focus: the ring, in the highlight color.
    await focusTitle(page, 'editor', 'Edit');
    await page.keyboard.press('ArrowLeft');
    expect(await css(container(page, 'editor', 'File'), 'outline-style')).toBe('solid');
    expect(await css(container(page, 'editor', 'File'), 'outline-color')).toBe(highlight);
    // The open title: the highlight colors.
    await page.keyboard.press('Enter');
    await expect.poll(() => open(page, 'editor')).toEqual(['File']);
    expect(await css(container(page, 'editor', 'File'), 'background-color')).toBe(highlight);
    expect(await css(container(page, 'editor', 'File').locator('.label'), 'color')).toBe(highlightText);
    await page.keyboard.press('Escape');
    // The overflow item's glyph.
    await stageWidth(page, 'editor', 215);
    await expect.poll(async () => (await state(page, 'editor')).folded.length).toBeGreaterThan(0);
    expect(await css(overflow(page, 'editor').locator('.icon'), 'color')).toBe(buttonText);
  });

  test('MBR-29: a title’s colors change over motion.state-duration with motion.state-easing, and at once where motion is reduced; a menu that takes the place of another comes with no open motion and the other goes with no close motion, while the first to open and the last to close move as the menu’s own', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [editor()], reducedMotion: false });
    // The menu's own motions at 30 s: whether one is running, or a menu still shown while it leaves, is asked some round
    // trips after the key that began it, and on a slow runner those take longer than a motion of 600 ms. The one whose
    // end is waited for is ended by hand.
    await override(page, { '--tanrei-comp-menu-motion-open-duration': '30s', '--tanrei-comp-menu-motion-close-duration': '30s' });
    const duration = (await resolveToken(page, T('motion-state-duration'), 'duration')) / 1000;
    const c = container(page, 'editor', 'File');
    expect(await css(c, 'transition-property')).toContain('background-color');
    expect((await css(c, 'transition-duration')).split(', ').every((value) => Number.parseFloat(value) === duration)).toBe(true);
    expect(await css(c.locator('.label'), 'transition-property')).toBe('color');
    expect(Number.parseFloat(await css(c.locator('.label'), 'transition-duration'))).toBe(duration);
    const easing = await page.evaluate((name) => {
      const probe = document.body.appendChild(document.createElement('div'));
      probe.style.transitionTimingFunction = `var(${name})`;
      const value = getComputedStyle(probe).transitionTimingFunction;
      probe.remove();
      return value;
    }, T('motion-state-easing'));
    expect(await css(c, 'transition-timing-function')).toContain(easing);
    const moving = (label: string) => menu(page, 'editor', label).evaluate((el) => {
      const surface = el.shadowRoot!.querySelector('tanrei-menu')!.shadowRoot!.querySelector('.surface')!;
      return { classes: [...surface.classList].filter((name) => name === 'entering' || name === 'leaving').join(','), animations: surface.getAnimations().length, shown: surface.matches(':popover-open') };
    });
    // The first to open moves as MNU-4 says.
    await focusTitle(page, 'editor', 'File');
    await page.keyboard.press('Enter');
    await expect.poll(() => open(page, 'editor')).toEqual(['File']);
    await expect.poll(() => moving('File')).toMatchObject({ classes: 'entering', shown: true });
    expect((await moving('File')).animations).toBeGreaterThan(0);
    // Along the bar: the one is gone and the other there at once, neither moving — by a key and by a pointer.
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => open(page, 'editor')).toEqual(['Edit']);
    await expect.poll(() => moving('Edit')).toEqual({ classes: '', animations: 0, shown: true });
    expect(await moving('File')).toEqual({ classes: '', animations: 0, shown: false });
    const at = await box(container(page, 'editor', 'View'));
    await page.mouse.move(at.x + at.width / 2, at.y + at.height / 2);
    await expect.poll(() => moving('View')).toEqual({ classes: '', animations: 0, shown: true });
    expect(await moving('Edit')).toEqual({ classes: '', animations: 0, shown: false });
    // The last to close moves as MNU-4 says: still shown while it fades.
    await page.keyboard.press('Escape');
    await expect.poll(() => open(page, 'editor')).toEqual([]);
    expect(await moving('View')).toMatchObject({ classes: 'leaving', shown: true });
    expect((await moving('View')).animations).toBeGreaterThan(0);
    await menu(page, 'editor', 'View').evaluate((el) => {
      for (const animation of el.shadowRoot!.querySelector('tanrei-menu')!.shadowRoot!.querySelector('.surface')!.getAnimations()) animation.finish();
    });
    await expect.poll(async () => (await moving('View')).shown, { timeout: 3000 }).toBe(false);
    // Opened again alone, a menu that was once swapped in moves again.
    await page.keyboard.press('Enter');
    await expect.poll(() => moving('View')).toMatchObject({ classes: 'entering', shown: true });
    await page.keyboard.press('Escape');
    // Reduced motion: the colors at once.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(c, 'transition-property')).toBe('none');
    expect(await css(c.locator('.label'), 'transition-property')).toBe('none');
  });
});

test.describe('menus that come and go, and not modal', () => {
  test('MBR-30: a menu added, removed, reordered, renamed or disabled while the bar is shown is laid out at once; a menu removed while open is closed without its toggle; when the title that holds focus or the Tab stop is removed, focus and the stop move to the title that followed, or the one before', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [editor()], reducedMotion: true });
    await wire(page);
    const order = async () => {
      const labels = await bar(page, 'editor').evaluate((el) => [...el.querySelectorAll(':scope > tanrei-menubar-menu')].map((each) => (each as any).label as string));
      const boxes = await Promise.all(labels.map((label) => box(menu(page, 'editor', label))));
      return labels.map((label, n) => ({ label, x: boxes[n].x })).sort((a, b) => a.x - b.x).map((each) => each.label);
    };
    // Added, and reached by the keys at once.
    await bar(page, 'editor').evaluate((el) => el.insertAdjacentHTML('beforeend', '<tanrei-menubar-menu label="Window"><tanrei-menu-item label="Minimise"></tanrei-menu-item></tanrei-menubar-menu>'));
    await expect.poll(order).toEqual(['File', 'Edit', 'View', 'Format', 'Help', 'Window']);
    await focusTitle(page, 'editor', 'File');
    await page.keyboard.press('End');
    expect(await focus(page, 'editor')).toBe('title:Window');
    await expect(menu(page, 'editor', 'Window')).toHaveAttribute('aria-setsize', '6');
    // Reordered and renamed.
    await bar(page, 'editor').evaluate((el) => el.insertBefore(el.querySelector('[label="Help"]')!, el.firstElementChild));
    await expect.poll(order).toEqual(['Help', 'File', 'Edit', 'View', 'Format', 'Window']);
    await expect(menu(page, 'editor', 'Help')).toHaveAttribute('aria-posinset', '1');
    const widthBefore = (await box(menu(page, 'editor', 'Edit'))).width;
    await menu(page, 'editor', 'Edit').evaluate((el) => el.setAttribute('label', 'Edit and select'));
    await expect.poll(async () => (await box(menu(page, 'editor', 'Edit and select'))).width).toBeGreaterThan(widthBefore);
    await expect(menu(page, 'editor', 'Edit and select')).toHaveAttribute('aria-label', 'Edit and select');
    await menu(page, 'editor', 'Format').evaluate((el) => el.removeAttribute('disabled'));
    await expect(menu(page, 'editor', 'Format')).not.toHaveAttribute('aria-disabled');
    // The focused title removed: focus to the one that followed.
    await focusTitle(page, 'editor', 'View');
    await bar(page, 'editor').evaluate((el) => el.querySelector('[label="View"]')!.remove());
    await expect.poll(() => state(page, 'editor')).toMatchObject({ focus: 'title:Format', stop: 'Format' });
    // The last one removed: to the one before.
    await page.keyboard.press('End');
    expect(await focus(page, 'editor')).toBe('title:Window');
    await bar(page, 'editor').evaluate((el) => el.querySelector('[label="Window"]')!.remove());
    await expect.poll(() => state(page, 'editor')).toMatchObject({ focus: 'title:Format', stop: 'Format' });
    // The Tab stop removed while focus is elsewhere: the stop moves, focus does not.
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    await bar(page, 'editor').evaluate((el) => el.querySelector('[label="Format"]')!.remove());
    await expect.poll(() => state(page, 'editor')).toMatchObject({ focus: 'none', stop: 'Edit and select' });
    // Removed while open: closed, no toggle; focus that was inside does not fall out of the bar.
    await focusTitle(page, 'editor', 'File');
    await page.keyboard.press('Enter');
    await expect.poll(() => state(page, 'editor')).toMatchObject({ open: ['File'], focus: 'item:New' });
    await clearLog(page);
    const removed = await bar(page, 'editor').evaluateHandle((el) => {
      const file = el.querySelector('[label="File"]')!;
      file.remove();
      return file;
    });
    await expect.poll(() => state(page, 'editor')).toMatchObject({ open: [], focus: 'title:Edit and select' });
    expect(await removed.evaluate((el: any) => el.open)).toBe(false);
    expect(await log(page)).toEqual([]);
    expect(await order()).toEqual(['Help', 'Edit and select']);
  });

  test('MBR-31: an open menu traps no focus, makes nothing inert and draws no scrim; a press outside that closes it also reaches what is under it', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [editor()], reducedMotion: true });
    await page.evaluate(() => {
      document.querySelector('main')!.insertAdjacentHTML('afterend', '<button id="under" style="position: fixed; inset: 300px auto auto 300px">under</button>');
      (window as any).presses = 0;
      document.querySelector('#under')!.addEventListener('click', () => ((window as any).presses += 1));
    });
    await title(page, 'editor', 'File').click();
    await expect.poll(() => focus(page, 'editor')).toBe('item:New');
    // Nothing is inert, nothing is modal, nothing is drawn behind the menu.
    expect(await page.evaluate(() => !!document.querySelector('[inert], dialog[open], [aria-modal="true"]') || !!document.querySelector(':modal'))).toBe(false);
    expect(await surfaceOf(page, 'editor', 'File').evaluate((el) => getComputedStyle(el, '::backdrop').backgroundColor)).toMatch(/rgba\(0, 0, 0, 0\)|transparent|^$/);
    expect(await surfaceOf(page, 'editor', 'File').getAttribute('popover')).toBe('manual');
    // Focus can be moved out by the product: not trapped, and the menu closes.
    await page.locator('#under').focus();
    await expect.poll(() => state(page, 'editor')).toMatchObject({ open: [], focus: 'under' });
    // The press that closes the menu is also the button's.
    await title(page, 'editor', 'Edit').click();
    await expect.poll(() => open(page, 'editor')).toEqual(['Edit']);
    await page.locator('#under').click();
    await expect.poll(() => open(page, 'editor')).toEqual([]);
    expect(await page.evaluate(() => (window as any).presses)).toBe(1);
    // The bar is part of the page: not a popover, not in the top layer.
    expect(await bar(page, 'editor').evaluate((el) => el.hasAttribute('popover') || !!el.shadowRoot!.querySelector('.bar[popover]'))).toBe(false);
  });
});

// ── Entries that act: MBR-32 … MBR-46 ──

/** The fixture `mixed` with its menus filled: File, Edit and View, the action Run and the link item Documentation. */
const MIXED = (): FixtureItem[] => [m('File', it('New') + it('Open')), m('Edit', it('Undo')), m('View', it('Zoom in') + it('Zoom out')), b('Run'), b('Documentation', { href: '#docs' })];
const mixed = (id = 'mixed', items: FixtureItem[] = MIXED()) => fx(id, items, { overflowLabel: 'More' });
const centre = async (locator: Locator) => {
  const at = await box(locator);
  return [at.x + at.width / 2, at.y + at.height / 2] as const;
};
/** What a pointer at a point of the page is on: a link item's anchor, an entry's host, or whatever else is there. */
const under = (page: P, x: number, y: number) =>
  page.evaluate(([px, py]) => {
    const el = document.elementFromPoint(px, py) as (HTMLElement & { label?: string }) | null;
    if (!el) return 'nothing';
    if (el.localName === 'a') return `a:${el.textContent}`;
    return el.localName.startsWith('tanrei-menubar-') ? `${el.localName.replace('tanrei-menubar-', '')}:${el.label}` : el.localName;
  }, [x, y] as const);
/** Every click the window hears, with whether anything prevented it — and then prevents it, so that a test's modified click opens no tab. */
const watchClicks = (page: P) =>
  page.evaluate(() => {
    const heard: string[] = ((window as any).heard = []);
    for (const type of ['click', 'auxclick']) {
      window.addEventListener(type, (event) => {
        const e = event as MouseEvent;
        const modified = e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey;
        heard.push(`${type}:${e.button}:${e.defaultPrevented ? 'prevented' : 'left'}`);
        if (modified) e.preventDefault();
      });
    }
  });
const heard = (page: P) => page.evaluate(() => (window as any).heard.splice(0) as string[]);
/** A click as the browser sends it for a link, dispatched on `target`: with a modifier key, or another button. */
const send = (target: Locator, type: 'click' | 'auxclick', init: MouseEventInit) => target.evaluate((el, [t, i]) => void el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, composed: true, ...i })), [type, init] as const);
const hash = (page: P) => page.evaluate(() => location.hash);
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const dist = (file: string) => fs.readFileSync(path.join(pkg, 'dist', file), 'utf8');

test.describe('entries that act', () => {
  test('MBR-32: a bar item takes its place in the row among the titles and is drawn as a title is — the same container, text style and colors at rest and in every state, the same ring and target, its hit area meeting its neighbours’ — always unselected, and nothing at rest tells an action or a link item from a title', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [mixed()], reducedMotion: true });
    const [gap, padInline, height, target] = [await resolveToken(page, T('bar-gap')), await resolveToken(page, T('container-padding-inline')), await resolveToken(page, T('container-height')), await resolveToken(page, '--tanrei-sys-target-pointer')];
    // In the order given, the gap apart, titles and bar items alike.
    const boxes = [await box(menu(page, 'mixed', 'File')), await box(menu(page, 'mixed', 'Edit')), await box(menu(page, 'mixed', 'View')), await box(item(page, 'mixed', 'Run')), await box(item(page, 'mixed', 'Documentation'))];
    for (let n = 1; n < boxes.length; n += 1) expect(boxes[n].x - boxes[n - 1].right, String(n)).toBeCloseTo(gap, 1);
    for (const each of boxes) expect(each.y).toBeCloseTo(boxes[0].y, 1);
    // Drawn exactly as the title beside it: the container and the label, from the same tokens.
    const reference = container(page, 'mixed', 'View');
    for (const label of ['Run', 'Documentation']) {
      const c = itemContainer(page, 'mixed', label);
      for (const property of ['height', 'padding-left', 'padding-right', 'background-color', 'border-top-left-radius', 'outline-style', 'opacity']) expect(await css(c, property), `${label} ${property}`).toBe(await css(reference, property));
      expect((await box(c)).height).toBeCloseTo(height, 1);
      // The text is the label's own for an action, and the product's anchor for a link item: neither has a look of its own.
      const text = label === 'Run' ? c.locator('.label') : anchor(page, 'mixed', label);
      for (const property of ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'line-height', 'color', 'white-space', 'text-decoration-line']) expect(await css(text, property), `${label} ${property}`).toBe(await css(reference.locator('.label'), property));
      expect((await box(c)).width, label).toBeCloseTo((await box(c.locator('.label'))).width + 2 * padInline, 1);
      // Never the expanded condition, and no state of a menu.
      await expect(item(page, 'mixed', label).locator('.title')).not.toHaveClass(/expanded/);
      await expect(item(page, 'mixed', label).locator('.icon')).toHaveCount(0);
    }
    // MBR-17: the hit areas meet in the middle of the gap, the target tall — a link item's is its anchor's.
    const [run, docs] = [await box(itemContainer(page, 'mixed', 'Run')), await box(itemContainer(page, 'mixed', 'Documentation'))];
    const mid = run.y + run.height / 2;
    const seam = (run.right + docs.x) / 2;
    expect(await under(page, seam - 1, mid)).toBe('item:Run');
    expect(await under(page, seam + 1, mid)).toBe('a:Documentation');
    expect(await under(page, docs.x + 1, mid - target / 2 + 1)).toBe('a:Documentation');
    expect(await under(page, docs.x + 1, mid + target / 2 - 1)).toBe('a:Documentation');
    expect(await under(page, docs.right + gap / 2 - 1, mid)).toBe('a:Documentation');
    expect(await under(page, (boxes[2].right + boxes[3].x) / 2 + 1, mid - target / 2 + 1)).toBe('item:Run');
    // The states, from the unselected condition's tokens: hovered, keyboard-focused over it, pressed over both.
    await override(page, {
      '--tanrei-sys-behavior-pressed-feedback': 'overlay',
      [T('unselected-container-color')]: 'rgb(1, 1, 1)',
      [T('unselected-hovered-container-color')]: 'rgb(10, 0, 0)',
      [T('unselected-hovered-label-color')]: 'rgb(11, 0, 0)',
      [T('unselected-focused-container-color')]: 'rgb(20, 0, 0)',
      [T('unselected-focused-label-color')]: 'rgb(21, 0, 0)',
      [T('unselected-pressed-container-color')]: 'rgb(30, 0, 0)',
      [T('unselected-pressed-label-color')]: 'rgb(31, 0, 0)',
    });
    for (const label of ['Run', 'Documentation']) {
      const c = itemContainer(page, 'mixed', label);
      const text = label === 'Run' ? c.locator('.label') : anchor(page, 'mixed', label);
      await page.mouse.move(...(await centre(c)));
      expect(await color(page, c), label).toBe('rgb(10, 0, 0)');
      expect(await color(page, text, 'color'), label).toBe('rgb(11, 0, 0)');
      await focusTitle(page, 'mixed', 'View');
      await page.keyboard.press(label === 'Run' ? 'ArrowRight' : 'End');
      await expect.poll(() => focus(page, 'mixed')).toBe(`title:${label}`);
      expect(await color(page, c), label).toBe('rgb(20, 0, 0)');
      expect(await color(page, text, 'color'), label).toBe('rgb(21, 0, 0)');
      // MBR-5: the ring around the container, for keyboard focus.
      expect(await css(c, 'outline-style'), label).toBe('solid');
      expect(await px(c, 'outline-width'), label).toBe(await resolveToken(page, '--tanrei-sys-focus-outer-width'));
      if (label === 'Documentation') expect(await css(anchor(page, 'mixed', label), 'outline-style')).toBe('none');
      await page.mouse.down();
      expect(await css(c, 'background-color'), label).toBe('rgb(30, 0, 0)');
      expect(await css(text, 'color'), label).toBe('rgb(31, 0, 0)');
      expect(await c.evaluate((el) => el.dataset.pressed), label).toBe('overlay');
      await page.mouse.up();
      await page.mouse.move(2, 400);
      await expect.poll(() => c.evaluate((el) => el.dataset.pressed ?? null)).toBeNull();
      // Activated by a pointer: focus is on it, and that is not the focused state — no ring.
      await expect.poll(() => focus(page, 'mixed')).toBe(`title:${label}`);
      await page.keyboard.press('Tab');
      await page.mouse.click(...(await centre(c)));
      await page.mouse.move(2, 400);
      await expect.poll(() => focus(page, 'mixed')).toBe(`title:${label}`);
      await expect.poll(() => c.evaluate((el) => el.dataset.pressed ?? null)).toBeNull();
      expect(await css(c, 'outline-style'), label).toBe('none');
      expect(await color(page, c), label).toBe('rgb(1, 1, 1)');
    }
  });

  test('MBR-32: a bar item is one of the stops of the bar’s one Tab stop — the inline arrow keys, Home, End and a typed character reach it as they reach a title, a disabled one included — and the Tab stop stands on it when it had focus or was activated last', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [mixed('stops', [m('File', it('New')), b('Run', { disabled: true }), b('Documentation', { href: '#docs' }), m('View', it('Zoom in')), b('Share')])],
      lead: '<button id="before">before</button>',
      reducedMotion: true,
    });
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterend', '<button id="after">after</button>'));
    await wire(page);
    await focusTitle(page, 'stops', 'File');
    for (const [key, at] of [['ArrowRight', 'Run'], ['ArrowRight', 'Documentation'], ['ArrowRight', 'View'], ['ArrowRight', 'Share'], ['ArrowRight', 'File'], ['ArrowLeft', 'Share'], ['Home', 'File'], ['End', 'Share'], ['d', 'Documentation'], ['R', 'Run'], ['s', 'Share'], ['ArrowLeft', 'View'], ['ArrowLeft', 'Documentation']] as const) {
      await page.keyboard.press(key);
      expect(await state(page, 'stops'), key).toMatchObject({ focus: `title:${at}`, stop: at, open: [] });
    }
    // Moving along the bar ran nothing and opened nothing.
    expect(await log(page)).toEqual([]);
    expect(await hash(page)).toBe('');
    // One Tab stop: Tab leaves from the link item, and comes back to it — never to another entry on the way.
    await tab(page);
    expect(await focus(page, 'stops')).toBe('after');
    await tab(page, { back: true });
    expect(await focus(page, 'stops')).toBe('title:Documentation');
    await tab(page, { back: true });
    expect(await focus(page, 'stops')).toBe('before');
    // Activated last, by a pointer: the Tab stop is the bar item.
    await page.mouse.click(...(await centre(itemContainer(page, 'stops', 'Share'))));
    await expect.poll(() => state(page, 'stops')).toMatchObject({ focus: 'title:Share', stop: 'Share' });
    expect(await bar(page, 'stops').evaluate((el) => [...el.querySelectorAll('[tabindex="0"]')].length)).toBe(1);
  });

  test('MBR-32: a bar item shows keyboard focus as sys.behavior.focus-style names and answers a press as sys.behavior.pressed-feedback names, as a title does — an action on its host, a link item around its anchor', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss(), fixtures: [mixed()] });
    await override(page, { '--tanrei-sys-focus-inner-width': '1px', '--tanrei-sys-color-focus-ring-inner': 'rgb(255, 255, 255)', '--tanrei-sys-motion-duration-press-hold': '400ms' });
    const outer = await resolveToken(page, '--tanrei-sys-focus-outer-width');
    for (const label of ['Run', 'Documentation']) {
      const c = itemContainer(page, 'mixed', label);
      await focusTitle(page, 'mixed', 'View');
      await page.keyboard.press(label === 'Run' ? 'ArrowRight' : 'End');
      await expect.poll(() => focus(page, 'mixed')).toBe(`title:${label}`);
      // The glow in place of the ring: the same two colors as a halo.
      expect(await css(c, 'outline-color'), label).toBe('rgba(0, 0, 0, 0)');
      expect(await css(c, 'box-shadow', '::after'), label).toBe(`rgb(255, 255, 255) 0px 0px 1px 1px, ${await resolveColor(page, '--tanrei-sys-color-focus-ring')} 0px 0px ${outer}px ${outer + 1}px`);
      await expect(item(page, 'mixed', label)).toHaveAttribute('data-focus-style', 'glow');
      for (const feedback of ['overlay', 'dim', 'none', 'ripple'] as const) {
        await override(page, { '--tanrei-sys-behavior-pressed-feedback': feedback });
        await page.mouse.move(...(await centre(c)));
        await page.mouse.down();
        expect(await c.evaluate((el) => el.dataset.pressed), `${label} ${feedback}`).toBe(feedback);
        expect(await c.locator('.ripple').count(), `${label} ${feedback}`).toBe(feedback === 'ripple' ? 1 : 0);
        // Released where it was pressed: a press that leaves a link while held is the start of a drag of its address.
        await page.mouse.up();
        await page.mouse.move(2, 400);
        await expect.poll(() => c.evaluate((el) => el.dataset.pressed ?? null)).toBeNull();
      }
    }
  });

  test('MBR-33: a press, Enter, Space or assistive technology on an action emits its click exactly once and opens nothing, focus staying on it — without the ring for a pointer — unless the product moved it; the menu of the bar that is open closes first, with its toggle; and focus arriving, hover, the arrow keys, Home, End and a typed character run nothing', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [mixed()], lead: '<button id="before">before</button>', reducedMotion: true });
    await wire(page);
    // Moving along the bar runs no command.
    await focusTitle(page, 'mixed', 'View');
    for (const key of ['ArrowRight', 'Home', 'End', 'ArrowLeft', 'Home', 'r']) await page.keyboard.press(key);
    expect(await focus(page, 'mixed')).toBe('title:Run');
    await page.mouse.move(...(await centre(itemContainer(page, 'mixed', 'Run'))));
    await page.mouse.move(2, 400);
    expect(await log(page)).toEqual([]);
    // Enter: one click, at once, and focus is still the bar item; a held key runs it once.
    await page.keyboard.down('Enter');
    expect(await log(page)).toEqual(['act:Run']);
    await page.keyboard.down('Enter');
    await page.keyboard.up('Enter');
    expect(await log(page)).toEqual(['act:Run']);
    expect(await state(page, 'mixed')).toMatchObject({ focus: 'title:Run', open: [], stop: 'Run' });
    expect(await css(itemContainer(page, 'mixed', 'Run'), 'outline-style')).toBe('solid');
    // Space: when the key comes up, as a button's.
    await clearLog(page);
    await page.keyboard.down(' ');
    expect(await log(page)).toEqual([]);
    await page.keyboard.up(' ');
    expect(await log(page)).toEqual(['act:Run']);
    expect(await focus(page, 'mixed')).toBe('title:Run');
    // With a menu open, a pointer press: that menu's toggle with false, then the click — which sees no menu open.
    await page.evaluate(() => {
      const run = document.querySelector('[data-fixture="mixed"] tanrei-menubar-item[label="Run"]')!;
      run.addEventListener('click', () => ((window as any).openAtClick = [...document.querySelectorAll('[data-fixture="mixed"] tanrei-menubar-menu')].filter((each) => (each as any).open).length));
    });
    await page.mouse.click(...(await centre(container(page, 'mixed', 'File'))));
    await expect.poll(() => state(page, 'mixed')).toMatchObject({ open: ['File'], focus: 'item:New' });
    await clearLog(page);
    await page.mouse.click(...(await centre(itemContainer(page, 'mixed', 'Run'))));
    expect(await log(page)).toEqual(['toggle:File:false', 'act:Run']);
    expect(await page.evaluate(() => (window as any).openAtClick)).toBe(0);
    await page.mouse.move(2, 400);
    await expect.poll(() => state(page, 'mixed')).toMatchObject({ focus: 'title:Run', open: [], stop: 'Run' });
    await expect.poll(() => itemContainer(page, 'mixed', 'Run').evaluate((el) => el.dataset.pressed ?? null)).toBeNull();
    expect(await css(itemContainer(page, 'mixed', 'Run'), 'outline-style')).toBe('none');
    await expect(item(page, 'mixed', 'Run').locator('.title')).not.toHaveClass(/expanded/);
    // The default action of assistive technology — a click on the element — from inside an open menu.
    await focusTitle(page, 'mixed', 'File');
    await page.keyboard.press('Enter');
    await expect.poll(() => focus(page, 'mixed')).toBe('item:New');
    await clearLog(page);
    await item(page, 'mixed', 'Run').evaluate((el) => (el as HTMLElement).click());
    expect(await log(page)).toEqual(['toggle:File:false', 'act:Run']);
    await expect.poll(() => state(page, 'mixed')).toMatchObject({ focus: 'title:Run', open: [] });
    // Focus the product moved while handling the click stays where the product put it.
    await page.evaluate(() => document.querySelector('[data-fixture="mixed"] tanrei-menubar-item[label="Run"]')!.addEventListener('click', () => document.getElementById('before')!.focus()));
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    expect(await focus(page, 'mixed')).toBe('before');
    await page.mouse.click(...(await centre(itemContainer(page, 'mixed', 'Run'))));
    await page.waitForTimeout(100);
    expect(await focus(page, 'mixed')).toBe('before');
  });

  test('MBR-34: on a bar item Down Arrow and Up Arrow do nothing — they open nothing, run nothing, scroll nothing and reach nothing around the bar — Escape is not the bar’s, and Tab and Shift+Tab leave the bar', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [mixed()], lead: '<button id="before">before</button>', reducedMotion: true });
    await page.evaluate(() => {
      document.querySelector('main')!.insertAdjacentHTML('afterend', '<button id="after">after</button><div style="block-size: 3000px"></div>');
      const keys: string[] = ((window as any).keys = []);
      document.addEventListener('keydown', (event) => keys.push(`${event.key}:${event.defaultPrevented ? 'prevented' : 'left'}`));
    });
    await wire(page);
    for (const label of ['Run', 'Documentation']) {
      await focusTitle(page, 'mixed', 'View');
      await page.keyboard.press(label === 'Run' ? 'ArrowRight' : 'End');
      await page.evaluate(() => void ((window as any).keys.length = 0));
      for (const key of ['ArrowDown', 'ArrowUp', 'ArrowDown']) await page.keyboard.press(key);
      expect(await state(page, 'mixed'), label).toMatchObject({ focus: `title:${label}`, open: [], overflow: null });
      expect(await page.evaluate(() => window.scrollY), label).toBe(0);
      // The keys were taken: nothing around the bar heard them.
      expect(await page.evaluate(() => (window as any).keys), label).toEqual([]);
      // Escape, with no menu open, is not handled: it goes on, unprevented.
      await page.keyboard.press('Escape');
      expect(await page.evaluate(() => (window as any).keys), label).toEqual(['Escape:left']);
      expect(await focus(page, 'mixed'), label).toBe(`title:${label}`);
      await tab(page);
      expect(await focus(page, 'mixed'), label).toBe('after');
      await tab(page, { back: true });
      expect(await focus(page, 'mixed'), label).toBe(`title:${label}`);
      await tab(page, { back: true });
      expect(await focus(page, 'mixed'), label).toBe('before');
    }
    expect(await log(page)).toEqual([]);
    expect(await hash(page)).toBe('');
  });

  test('MBR-35: a link item is the product’s own anchor, in the document, with the menu item role on it and none on the element around it — exposed as a menu item and not as a link — drawn as an action is, the whole container and hit area its link, and one stop of the bar’s Tab stop, never one of its own', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { icons: true, lead: '<button id="before">before</button>' });
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterend', '<button id="after">after</button>'));
    const link = anchor(page, 'mixed', 'Documentation');
    // The product's own element: in the document, a child of the bar item, with its address.
    expect(await link.evaluate((el) => [el.getRootNode() === document, el.parentElement!.localName, el.getAttribute('href'), !!el.assignedSlot])).toEqual([true, 'tanrei-menubar-item', '/docs/', true]);
    await expect(link).toHaveAttribute('role', 'menuitem');
    await expect(item(page, 'mixed', 'Documentation')).toHaveAttribute('role', 'none');
    await expect(item(page, 'mixed', 'Documentation')).not.toHaveAttribute('tabindex');
    await expect(item(page, 'mixed', 'Documentation')).not.toHaveAttribute('aria-label');
    if (browserName === 'chromium') {
      const tree = await ax(page);
      // Every bar of the page is a menubar of menu items, and there is no link in any of them.
      const entries = tree.filter((node) => node.parent === 'menubar');
      expect(tree.filter((node) => node.role === 'link')).toEqual([]);
      expect(entries.every((node) => node.role === 'menuitem')).toBe(true);
      expect(entries.filter((node) => node.name === 'Documentation').length).toBeGreaterThan(0);
    }
    // Drawn exactly as Run beside it.
    const [action, drawn] = [itemContainer(page, 'mixed', 'Run'), itemContainer(page, 'mixed', 'Documentation')];
    for (const property of ['height', 'padding-left', 'padding-right', 'background-color', 'border-top-left-radius']) expect(await css(drawn, property), property).toBe(await css(action, property));
    for (const property of ['font-size', 'font-weight', 'color', 'text-decoration-line', 'cursor']) expect(await css(link, property), property).toBe(await css(action.locator('.label'), property));
    // The whole container is the link: its corners, its paddings.
    await drawn.scrollIntoViewIfNeeded();
    const at = await box(drawn);
    for (const [x, y] of [[at.x + 1, at.y + 1], [at.right - 1, at.bottom - 1], [at.x + 2, at.y + at.height / 2]] as const) expect(await under(page, x, y)).toBe('a:Documentation');
    // Reached as a title is; Tab leaves the bar instead of moving to it.
    await focusTitle(page, 'mixed', 'File');
    await page.keyboard.press('End');
    expect(await state(page, 'mixed')).toMatchObject({ focus: 'title:Documentation', stop: 'Documentation' });
    expect(await link.evaluate((el) => el === document.activeElement)).toBe(true);
    await page.keyboard.press('Home');
    await page.keyboard.press('d');
    expect(await focus(page, 'mixed')).toBe('title:Documentation');
    await page.keyboard.press('Home');
    await tab(page);
    expect(await bar(page, 'mixed').evaluate((el) => el.contains(document.activeElement))).toBe(false);
    expect(await bar(page, 'mixed').evaluate((el) => [...el.querySelectorAll('[tabindex="0"]')].map((each) => each.localName))).toEqual(['tanrei-menubar-menu']);
  });

  test('MBR-36: a plain activation of a link item — a click, Enter, Space — closes the open menu, emits its click once and follows the link, at once, unless the product cancelled the click; Space scrolls nothing; a click or Enter with a modifier key and a middle click are the browser’s: nothing is prevented and no menu closes', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [mixed()], reducedMotion: true });
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterend', '<div id="docs" style="block-size: 3000px"></div>'));
    await override(page, { '--tanrei-sys-motion-duration-press-hold': '2000ms' });
    await wire(page);
    await watchClicks(page);
    const link = anchor(page, 'mixed', 'Documentation');
    // Following a link to a place in the page takes focus there, as the browser does for any link: back to the link item.
    const reset = async () => {
      await page.evaluate(() => {
        location.hash = '';
        window.scrollTo(0, 0);
      });
      await link.focus();
      await clearLog(page);
      await heard(page);
    };
    // Enter: the anchor's own click, once, and the link is followed — not held back for the press-hold time.
    await focusTitle(page, 'mixed', 'View');
    await page.keyboard.press('End');
    // (Counted in the page, from the key to the change of address, with the press as it is shown at that moment: the
    // test's own clock also counts its answers, and two of a slow runner's are most of 1.5 s.)
    await itemContainer(page, 'mixed', 'Documentation').evaluate((el) => {
      const w = window as unknown as { __followed?: { after: number; pressed: string | null } };
      let down = Number.NaN;
      window.addEventListener('keydown', () => (down = performance.now()), { capture: true, once: true });
      window.addEventListener('hashchange', () => (w.__followed = { after: performance.now() - down, pressed: el.dataset.pressed ?? null }), { once: true });
    });
    await page.keyboard.down('Enter');
    await expect.poll(() => hash(page)).toBe('#docs');
    await expect.poll(() => page.evaluate(() => (window as unknown as { __followed?: unknown }).__followed)).toBeDefined();
    const followed = await page.evaluate(() => (window as unknown as { __followed: { after: number; pressed: string | null } }).__followed);
    expect(followed.after).toBeLessThan(1500);
    expect(followed.pressed, 'followed while the press is shown').not.toBeNull();
    expect(await itemContainer(page, 'mixed', 'Documentation').evaluate((el) => el.dataset.pressed ?? null)).not.toBeNull();
    await page.keyboard.up('Enter');
    expect(await log(page)).toEqual(['go:Documentation']);
    expect(await heard(page)).toEqual(['click:0:left']);
    // Space: exactly as Enter does, and the page does not scroll for the key.
    await reset();
    await link.evaluate((el) => el.addEventListener('click', (event) => event.preventDefault(), { once: true }));
    await page.keyboard.press(' ');
    expect(await log(page)).toEqual(['go:Documentation']);
    // That click was cancelled by the product: its router took it, and nothing was followed or scrolled; focus is the link item's.
    expect(await hash(page)).toBe('');
    expect(await focus(page, 'mixed')).toBe('title:Documentation');
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await reset();
    await page.keyboard.press(' ');
    await expect.poll(() => hash(page)).toBe('#docs');
    expect(await log(page)).toEqual(['go:Documentation']);
    // A click with a menu open: the menu closes, with its toggle, and then the click.
    await reset();
    await page.mouse.click(...(await centre(container(page, 'mixed', 'File'))));
    await expect.poll(() => open(page, 'mixed')).toEqual(['File']);
    await clearLog(page);
    await page.mouse.click(...(await centre(itemContainer(page, 'mixed', 'Documentation'))));
    expect(await log(page)).toEqual(['toggle:File:false', 'go:Documentation']);
    await expect.poll(() => hash(page)).toBe('#docs');
    expect(await open(page, 'mixed')).toEqual([]);
    await page.mouse.move(2, 400);
    // What the platform gives a link: left to it. The bar prevents none of it, and the open menu stays open.
    await reset();
    await focusTitle(page, 'mixed', 'File');
    await page.keyboard.press('Enter');
    await expect.poll(() => state(page, 'mixed')).toMatchObject({ open: ['File'], focus: 'item:New' });
    await clearLog(page);
    for (const init of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }] as const) {
      await send(link, 'click', init);
      expect(await heard(page), JSON.stringify(init)).toEqual(['click:0:left']);
    }
    await send(link, 'auxclick', { button: 1 });
    expect(await heard(page)).toEqual(['auxclick:1:left']);
    expect(await state(page, 'mixed')).toMatchObject({ open: ['File'], focus: 'item:New' });
    expect((await log(page)).filter((entry) => entry.startsWith('toggle'))).toEqual([]);
    await page.keyboard.press('Escape');
    // Enter with a modifier key is passed to the anchor: the bar prevents nothing and handles nothing.
    await page.keyboard.press('End');
    await clearLog(page);
    await page.evaluate(() =>
      document.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        (window as any).enter = `${event.key}:${event.ctrlKey}:${event.defaultPrevented ? 'prevented' : 'left'}`;
        // The test opens no tab: what the browser would do next is stopped here, after the bar had its turn.
        event.preventDefault();
      }),
    );
    await page.keyboard.press('Control+Enter');
    expect(await page.evaluate(() => (window as any).enter)).toBe('Enter:true:left');
    expect(await log(page)).toEqual([]);
  });

  test('MBR-37: a link item that opens a new context ends in the icon set’s open_in_new, container.gap after its label at the icon size and in the icon color, hidden from assistive technology and mirrored in right-to-left; targetLabel — its own, else the product’s words — is its description, a missing one is reported, and with target same there is no mark and no description', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true });
    const [gap, size, padInline] = [await resolveToken(page, T('container-gap')), await resolveToken(page, T('icon-size')), await resolveToken(page, T('container-padding-inline'))];
    const source = item(page, 'link-new', 'Source');
    const mark = source.locator('.icon');
    await expect(mark).toHaveAttribute('data-drawn', '');
    await expect(mark).toHaveAttribute('aria-hidden', 'true');
    await expect(mark).toHaveAttribute('part', 'mark');
    expect(await mark.evaluate((el) => el.textContent!.trim())).toBe('open_in_new');
    const [m0, l0, c0] = [await box(mark), await box(anchor(page, 'link-new', 'Source')), await box(itemContainer(page, 'link-new', 'Source'))];
    expect(m0.width).toBeCloseTo(size, 1);
    expect(m0.height).toBeCloseTo(size, 1);
    expect(m0.x - l0.right).toBeCloseTo(gap, 1);
    // As wide as its label, the gap and the glyph need, inside the paddings.
    expect(c0.width).toBeCloseTo(2 * padInline + l0.width + gap + size, 1);
    expect(await color(page, mark, 'color')).toBe(await resolveColor(page, T('unselected-icon-color')));
    // The icon set marks its name; only a right-to-left layout draws it mirrored.
    await expect(mark).toHaveAttribute('data-tanrei-mirrored', '');
    expect(await css(mark, 'transform')).toBe('none');
    // The description, on the link; a new context that gets no handle to this page.
    const link = anchor(page, 'link-new', 'Source');
    await expect(link).toHaveAttribute('aria-description', 'opens in a new tab');
    await expect(link).toHaveAttribute('target', '_blank');
    expect((await link.getAttribute('rel'))!.split(' ')).toContain('noopener');
    expect(await source.evaluate((el: any) => [el.target, el.targetLabel, el.href])).toEqual(['new', 'opens in a new tab', 'https://example.com/tanrei']);
    // No other entry has a mark.
    expect(await bar(page, 'link-new').evaluate((el) => [...el.children].filter((each) => each.shadowRoot!.querySelector('.icon')).length)).toBe(1);
    await expect(item(page, 'mixed', 'Documentation').locator('.icon')).toHaveCount(0);
    await expect(anchor(page, 'mixed', 'Documentation')).not.toHaveAttribute('aria-description');
    // Right-to-left: at the label's left, mirrored by the icon helper.
    const rtl = item(page, 'mixed-rtl', 'المصدر');
    const [m1, l1] = [await box(rtl.locator('.icon')), await box(rtl.locator('> a'))];
    expect(l1.x - m1.right).toBeCloseTo(gap, 1);
    await expect(rtl.locator('.icon')).toHaveAttribute('data-tanrei-mirrored', '');
    expect(await css(rtl.locator('.icon'), 'transform')).toBe('matrix(-1, 0, 0, 1, 0, 0)');
    expect(seen.filter((text) => text.includes('MBR-37'))).toEqual([]);

    // The words: the bar item's own, else the product's; with neither it still renders, and says so in a debug build.
    await mountFixtures(page, spec, {
      fixtures: [
        {
          ...mixed('words', [m('File', it('New'))]),
          content:
            '<tanrei-menubar-item id="bare"><a href="#a" target="_blank">Source</a></tanrei-menubar-item><tanrei-menubar-item id="own" target-label="in a new window"><a href="#b" target="_blank" rel="external">Issues</a></tanrei-menubar-item><tanrei-menubar-item id="theirs" target-label="ignored"><a href="#c" target="_blank" aria-description="the product’s own">Chat</a></tanrei-menubar-item><tanrei-menubar-item id="same" target-label="ignored"><a href="#d">Guide</a></tanrei-menubar-item>',
        },
      ],
      icons: true,
    });
    await expect.poll(() => seen.some((text) => text.includes('<tanrei-menubar-item>') && text.includes('MBR-37') && text.includes('targetLabel is empty'))).toBe(true);
    expect(await missingWords(page)).toContain('targetLabel');
    await expect(page.locator('#bare .icon')).toHaveCount(1);
    await expect(page.locator('#bare > a')).not.toHaveAttribute('aria-description');
    await expect(page.locator('#own > a')).toHaveAttribute('aria-description', 'in a new window');
    await expect(page.locator('#own > a')).toHaveAttribute('rel', 'external noopener');
    await expect(page.locator('#theirs > a')).toHaveAttribute('aria-description', 'the product’s own');
    await expect(page.locator('#same .icon')).toHaveCount(0);
    await expect(page.locator('#same > a')).not.toHaveAttribute('aria-description');
    await setWords(page, { targetLabel: 'opens in a new tab' });
    await expect(page.locator('#bare > a')).toHaveAttribute('aria-description', 'opens in a new tab');
    await expect(page.locator('#own > a')).toHaveAttribute('aria-description', 'in a new window');
    // The product changes its anchor: the mark and the description follow, and the row is laid out again.
    const before = await box(page.locator('#same'));
    await page.locator('#same').evaluate((el: any) => (el.target = 'new'));
    await expect(page.locator('#same > a')).toHaveAttribute('target', '_blank');
    await expect(page.locator('#same .icon')).toHaveCount(1);
    await expect(page.locator('#same > a')).toHaveAttribute('aria-description', 'ignored');
    expect((await box(page.locator('#same'))).width).toBeCloseTo(before.width + gap + size, 1);
  });

  test('MBR-38: the current link item is exposed as the current page and drawn from the selected condition — the fill and colors of the menu’s selected row — at its label’s own weight; it stays a link; the bar never sets it, its width does not change with it, and more than one and one without a destination are reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, reducedMotion: true });
    await wire(page);
    const [preview, history] = [anchor(page, 'link-current', 'Preview'), anchor(page, 'link-current', 'History')];
    await expect(history).toHaveAttribute('aria-current', 'page');
    await expect(preview).not.toHaveAttribute('aria-current');
    // The label's own weight and size: the place is told by the fill, never by a heavier label.
    for (const property of ['font-weight', 'font-size']) expect(await css(history, property), property).toBe(await css(preview, property));
    // The selected condition, whose colors are the menu's selected row's: the same fill in a bar and in a menu.
    const fill = await resolveColor(page, T('selected-container-color'));
    expect(fill).toBe(await resolveColor(page, '--tanrei-comp-menu-selected-container-color'));
    expect(await css(itemContainer(page, 'link-current', 'History'), 'background-color')).toBe(fill);
    expect(await css(itemContainer(page, 'link-current', 'History'), 'background-color')).not.toBe(await css(itemContainer(page, 'link-current', 'Preview'), 'background-color'));
    expect(await css(history, 'color')).toBe(await resolveColor(page, T('selected-label-color')));
    expect(await resolveColor(page, T('selected-label-color'))).toBe(await resolveColor(page, '--tanrei-comp-menu-selected-label-color'));
    // Never mistaken for the title of an open menu: not the expanded condition.
    await expect(item(page, 'link-current', 'History').locator('.title')).not.toHaveClass(/expanded/);
    expect(fill).not.toBe(await resolveColor(page, T('expanded-container-color')));
    expect(await item(page, 'link-current', 'History').evaluate((el: any) => [el.current, el.href, el.label])).toEqual([true, '/history/', 'History']);
    expect(seen.filter((text) => text.includes('MBR-38'))).toEqual([]);

    await mountFixtures(page, spec, { fixtures: [mixed('here', [m('File', it('New')), b('Preview', { href: '#preview' }), b('Documentation', { href: '#history', current: true })])], reducedMotion: true });
    await wire(page);
    // A plain click on Preview emits its click and follows it, and leaves the other current: the bar sets nothing.
    await page.mouse.click(...(await centre(itemContainer(page, 'here', 'Preview'))));
    await expect.poll(() => hash(page)).toBe('#preview');
    expect(await log(page)).toEqual(['go:Preview']);
    await expect(anchor(page, 'here', 'Documentation')).toHaveAttribute('aria-current', 'page');
    await expect(anchor(page, 'here', 'Preview')).not.toHaveAttribute('aria-current');
    // It stays a link that takes focus and can be followed.
    await focusTitle(page, 'here', 'File');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await expect.poll(() => hash(page)).toBe('#history');
    // Its width is the same current or not: a fill takes no room.
    const current = anchor(page, 'here', 'Documentation');
    const filled = await box(item(page, 'here', 'Documentation'));
    // At rest: neither under the pointer nor focused, so that only the condition tells the two apart.
    await page.mouse.move(0, 0);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await current.evaluate((el) => el.removeAttribute('aria-current'));
    await expect.poll(async () => css(itemContainer(page, 'here', 'Documentation'), 'background-color')).toBe(await css(itemContainer(page, 'here', 'Preview'), 'background-color'));
    expect((await box(item(page, 'here', 'Documentation'))).width).toBeCloseTo(filled.width, 1);
    await item(page, 'here', 'Documentation').evaluate((el: any) => (el.current = true));
    await expect(current).toHaveAttribute('aria-current', 'page');
    await expect.poll(async () => css(itemContainer(page, 'here', 'Documentation'), 'background-color')).toBe(fill);
    // More than one: each drawn and exposed as given, and reported. Without a destination: ignored, and reported.
    expect(seen.filter((text) => text.includes('MBR-38'))).toEqual([]);
    await anchor(page, 'here', 'Preview').evaluate((el) => el.setAttribute('aria-current', 'page'));
    await expect.poll(() => seen.some((text) => text.includes('<tanrei-menubar>') && text.includes('2 bar items say they are the current page') && text.includes('MBR-38'))).toBe(true);
    expect(await css(itemContainer(page, 'here', 'Preview'), 'background-color')).toBe(fill);
    await current.evaluate((el) => el.removeAttribute('href'));
    await expect.poll(() => seen.some((text) => text.includes('<tanrei-menubar-item>') && text.includes('names no destination; current is ignored') && text.includes('MBR-38'))).toBe(true);
    await expect.poll(async () => css(itemContainer(page, 'here', 'Documentation'), 'background-color')).not.toBe(fill);
  });

  test('MBR-39: a disabled bar item is drawn from the disabled tokens of the unselected condition, emits no click and acts on no input, stays reachable by the keys and is exposed disabled; a disabled link item keeps the menu item role, has no destination and opens nothing by any means', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, reducedMotion: true });
    await wire(page);
    await watchClicks(page);
    const id = 'disabled-item';
    const [run, docs] = [item(page, id, 'Run'), item(page, id, 'Documentation')];
    // Drawn disabled, as a disabled title is.
    expect(await color(page, run.locator('.label'), 'color')).toBe(await resolveColor(page, T('unselected-disabled-label-color')));
    expect(await color(page, anchor(page, id, 'Documentation'), 'color')).toBe(await resolveColor(page, T('unselected-disabled-label-color')));
    expect(await color(page, itemContainer(page, id, 'Run'))).toBe(await resolveColor(page, T('unselected-disabled-container-color')));
    expect(await css(run.locator('.title'), 'cursor')).toBe('default');
    // Exposed disabled; the link item is still a menu item on its anchor, which has no address.
    await expect(run).toHaveAttribute('aria-disabled', 'true');
    await expect(run).toHaveAttribute('role', 'menuitem');
    await expect(anchor(page, id, 'Documentation')).toHaveAttribute('aria-disabled', 'true');
    await expect(anchor(page, id, 'Documentation')).toHaveAttribute('role', 'menuitem');
    await expect(anchor(page, id, 'Documentation')).not.toHaveAttribute('href');
    await expect(item(page, id, 'Share')).not.toHaveAttribute('aria-disabled');
    // Reached by the keys; hovered and pressed it does not change.
    await focusTitle(page, id, 'Edit');
    for (const label of ['Run', 'Share', 'Documentation']) {
      await page.keyboard.press('ArrowRight');
      expect(await focus(page, id)).toBe(`title:${label}`);
    }
    // Enter, Space, a click, a click with a modifier key: nothing.
    for (const label of ['Documentation', 'Run']) {
      await page.keyboard.press(label === 'Run' ? 'r' : 'd');
      expect(await focus(page, id)).toBe(`title:${label}`);
      await page.keyboard.press('Enter');
      await page.keyboard.press(' ');
      await page.mouse.click(...(await centre(itemContainer(page, id, label))));
      const entry = label === 'Run' ? run : anchor(page, id, label);
      await send(entry, 'click', { ctrlKey: true });
      await entry.evaluate((el) => (el as HTMLElement).click());
      await item(page, id, label).evaluate((el) => (el as HTMLElement).click());
      expect(await itemContainer(page, id, label).evaluate((el) => el.dataset.pressed ?? null), label).toBeNull();
    }
    expect(await log(page)).toEqual([]);
    expect(await heard(page)).toEqual([]);
    expect(await hash(page)).toBe('');
    expect(seen.filter((text) => text.includes('MBR-39'))).toEqual([]);
    // Disabled later: the entry says so at once; enabled again, it runs.
    await item(page, id, 'Share').evaluate((el: any) => (el.disabled = true));
    await expect(item(page, id, 'Share')).toHaveAttribute('aria-disabled', 'true');
    await item(page, id, 'Share').evaluate((el: any) => (el.disabled = false));
    await page.mouse.click(...(await centre(itemContainer(page, id, 'Share'))));
    expect(await log(page)).toEqual(['act:Share']);

    // The mismatch: a disabled bar item whose anchor still has an address is drawn and exposed disabled, emits no click
    // and has its plain activation prevented — and the report says to take the href away.
    await mountFixtures(page, spec, { fixtures: [{ ...mixed('kept', [m('File', it('New'))]), content: '<tanrei-menubar-item disabled><a href="#kept">Documentation</a></tanrei-menubar-item>' }], reducedMotion: true });
    await wire(page);
    await expect(anchor(page, 'kept', 'Documentation')).toHaveAttribute('aria-disabled', 'true');
    await expect(anchor(page, 'kept', 'Documentation')).toHaveAttribute('href', '#kept');
    expect(await color(page, anchor(page, 'kept', 'Documentation'), 'color')).toBe(await resolveColor(page, T('unselected-disabled-label-color')));
    await page.mouse.click(...(await centre(itemContainer(page, 'kept', 'Documentation'))));
    await focusTitle(page, 'kept', 'File');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.press(' ');
    await page.waitForTimeout(50);
    expect(await log(page)).toEqual([]);
    expect(await hash(page)).toBe('');
    expect(seen.some((text) => text.includes('MBR-39') && text.includes('its anchor still has an href') && text.includes('write the anchor without href'))).toBe(true);
  });

  test('MBR-40: from an open menu the inline arrow key towards a bar item closes the menu — one toggle with false — and puts focus on the bar item with the ring; nothing opens and nothing runs, and the bar keeps no memory that a menu was open: the keys that follow move along the row and open none', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [mixed(), mixed('off', [m('File', it('New')), b('Run', { disabled: true }), b('Share'), m('View', it('Zoom in'))]), mixed('alone', [m('File', it('New')), b('Run', { disabled: true }), m('View', it('Zoom in'), { disabled: true })])], reducedMotion: true });
    await wire(page);
    await focusTitle(page, 'mixed', 'View');
    await page.keyboard.press('Enter');
    await expect.poll(() => state(page, 'mixed')).toMatchObject({ open: ['View'], focus: 'item:Zoom in' });
    await clearLog(page);
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => state(page, 'mixed')).toMatchObject({ open: [], focus: 'title:Run', stop: 'Run' });
    expect(await log(page)).toEqual(['toggle:View:false']);
    expect(await css(itemContainer(page, 'mixed', 'Run'), 'outline-style')).toBe('solid');
    expect(await surfaceShown(menu(page, 'mixed', 'View').locator('tanrei-menu'))).toBe(false);
    // No menu follows focus any more: on to Documentation, and round to File, whose menu stays closed…
    await page.keyboard.press('ArrowRight');
    expect(await state(page, 'mixed')).toMatchObject({ open: [], focus: 'title:Documentation' });
    expect(await css(itemContainer(page, 'mixed', 'Documentation'), 'outline-style')).toBe('solid');
    await page.keyboard.press('ArrowRight');
    expect(await state(page, 'mixed')).toMatchObject({ open: [], focus: 'title:File' });
    expect(await log(page)).toEqual(['toggle:View:false']);
    expect(await hash(page)).toBe('');
    // …until Enter, Space or a block arrow key opens it. Backwards from it, the previous entry is the last: a link item.
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => state(page, 'mixed')).toMatchObject({ open: ['File'], focus: 'item:New' });
    await clearLog(page);
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => state(page, 'mixed')).toMatchObject({ open: [], focus: 'title:Documentation' });
    expect(await log(page)).toEqual(['toggle:File:false']);
    expect(await hash(page)).toBe('');
    // A disabled bar item is passed over, as a disabled title is.
    await focusTitle(page, 'off', 'File');
    await page.keyboard.press('Enter');
    await expect.poll(() => focus(page, 'off')).toBe('item:New');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => state(page, 'off')).toMatchObject({ open: [], focus: 'title:Share' });
    // Where the open menu's title is the bar's only enabled entry, the keys do nothing.
    await focusTitle(page, 'alone', 'File');
    await page.keyboard.press('Enter');
    await expect.poll(() => focus(page, 'alone')).toBe('item:New');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    expect(await state(page, 'alone')).toMatchObject({ open: ['File'], focus: 'item:New' });
  });

  test('MBR-41: while a menu is open a hovering pointer on a bar item only hovers it — the open menu stays open and focus where it is — and the next title it reaches opens its menu; with no menu open a pointer on a bar item only hovers it', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [mixed('hover', [m('File', it('New')), b('Run'), b('Documentation', { href: '#docs' }), m('View', it('Zoom in'))])], reducedMotion: true });
    await override(page, { [T('unselected-hovered-container-color')]: 'rgb(10, 0, 0)' });
    await wire(page);
    // No menu open: only hovered.
    for (const label of ['Run', 'Documentation']) {
      await page.mouse.move(...(await centre(itemContainer(page, 'hover', label))));
      expect(await color(page, itemContainer(page, 'hover', label))).toBe('rgb(10, 0, 0)');
    }
    expect(await state(page, 'hover')).toMatchObject({ open: [], focus: 'none' });
    await page.mouse.click(...(await centre(container(page, 'hover', 'File'))));
    await expect.poll(() => state(page, 'hover')).toMatchObject({ open: ['File'], focus: 'item:New' });
    await clearLog(page);
    // Across Run and Documentation: File's menu is still shown, focus still in it.
    for (const label of ['Run', 'Documentation']) {
      await page.mouse.move(...(await centre(itemContainer(page, 'hover', label))));
      expect(await color(page, itemContainer(page, 'hover', label)), label).toBe('rgb(10, 0, 0)');
      expect(await state(page, 'hover'), label).toMatchObject({ open: ['File'], focus: 'item:New' });
      expect(await surfaceShown(menu(page, 'hover', 'File').locator('tanrei-menu')), label).toBe(true);
    }
    expect(await log(page)).toEqual([]);
    // At View, its menu replaces File's (MBR-11).
    await page.mouse.move(...(await centre(container(page, 'hover', 'View'))));
    expect(await open(page, 'hover')).toEqual(['View']);
    expect(await log(page)).toEqual(['toggle:File:false', 'toggle:View:true']);
    // A press on the bar item then activates it, which closes the open menu first.
    await clearLog(page);
    await page.mouse.click(...(await centre(itemContainer(page, 'hover', 'Run'))));
    expect(await log(page)).toEqual(['toggle:View:false', 'act:Run']);
  });

  test('MBR-42: a bar item is a menu item named by its label that does not say it opens a menu and has no expanded state, with its disabled state and its position among the bar’s entries — titles, bar items and the overflow item counted together; a link item says its description and whether it is current', async ({ page, browserName }) => {
    await mountFixtures(page, spec, {
      fixtures: [mixed('told', [m('File', it('New')), b('Run'), b('Off', { disabled: true }), b('Source', { href: '#src', target: 'new', targetLabel: 'opens in a new tab' }), m('View', it('Zoom in')), b('History', { href: '#history', current: true })])],
      icons: true,
      reducedMotion: true,
    });
    const described = () =>
      bar(page, 'told').evaluate((el) =>
        [...el.querySelectorAll(':scope > :not([data-tanrei-folded])'), ...el.shadowRoot!.querySelectorAll('.overflow')].map((each) => {
          const entry = each.querySelector(':scope > a') ?? each;
          const name = entry.localName === 'a' ? entry.textContent : entry.getAttribute('aria-label');
          return [entry.localName === 'a' ? `a in ${each.getAttribute('role')}` : 'host', name, ...['role', 'aria-haspopup', 'aria-expanded', 'aria-disabled', 'aria-posinset', 'aria-setsize', 'aria-description', 'aria-current'].map((attribute) => entry.getAttribute(attribute) ?? '-')].join(' | ');
        }),
      );
    expect(await described()).toEqual([
      'host | File | menuitem | menu | false | - | 1 | 6 | - | -',
      'host | Run | menuitem | - | - | - | 2 | 6 | - | -',
      'host | Off | menuitem | - | - | true | 3 | 6 | - | -',
      'a in none | Source | menuitem | - | - | - | 4 | 6 | opens in a new tab | -',
      'host | View | menuitem | menu | false | - | 5 | 6 | - | -',
      'a in none | History | menuitem | - | - | - | 6 | 6 | - | page',
    ]);
    // Activated, an action still has no expanded state.
    await item(page, 'told', 'Run').evaluate((el) => (el as HTMLElement).click());
    await expect(item(page, 'told', 'Run')).not.toHaveAttribute('aria-expanded');
    await expect(item(page, 'told', 'Run')).not.toHaveAttribute('aria-haspopup');
    if (browserName === 'chromium') {
      const tree = await ax(page);
      expect(tree.filter((node) => node.parent === 'menubar').map((node) => `${node.role}:${node.name}:${node.expanded ?? '-'}:${node.popup ?? '-'}${node.disabled ? ':disabled' : ''}${node.description ? `:${node.description}` : ''}`)).toEqual([
        'menuitem:File:false:menu',
        'menuitem:Run:-:-',
        'menuitem:Off:-:-:disabled',
        'menuitem:Source:-:-:opens in a new tab',
        'menuitem:View:false:menu',
        'menuitem:History:-:-',
      ]);
      expect(tree.filter((node) => node.role === 'link')).toEqual([]);
    }
    // Folded: the entries in the row and the overflow item are counted together, in the order drawn.
    const fits = (await box(item(page, 'told', 'Source'))).right - (await box(menu(page, 'told', 'File'))).x + 2 * (await resolveToken(page, T('bar-padding-inline'))) + 32;
    await stageWidth(page, 'told', fits - 20);
    await expect.poll(async () => (await state(page, 'told')).folded).toEqual(['Source', 'View', 'History']);
    expect((await described()).map((line) => line.split(' | ').filter((_, n) => [1, 2, 3, 6, 7].includes(n)).join(' '))).toEqual(['File menuitem menu 1 4', 'Run menuitem - 2 4', 'Off menuitem - 3 4', 'More menuitem menu 4 4']);
    await expect(item(page, 'told', 'History')).toHaveAttribute('role', 'none');
  });

  test('MBR-43: bar items fold as menus do, whole and in order, and a folded one is an item of the overflow item’s menu among the folded menus’ submenu items — an action its item, a link item its link item with the same address, mark and words, disabled while the bar item is, current while it is; its activation is the bar item’s own click, once, on the product’s own element and while that menu is still shown, then the menu closes and focus returns to the overflow item unless the product moved it', async ({ page, browserName }) => {
    await mountFixtures(page, spec, {
      fixtures: [
        mixed('fold', [
          m('File', it('New')),
          m('Edit', it('Undo')),
          b('Run'),
          m('Tools', it('Lint')),
          b('Documentation', { href: '#docs' }),
          b('Source', { href: '#src', target: 'new', targetLabel: 'opens in a new tab' }),
          b('History', { href: '#history', current: true }),
          b('Off', { disabled: true }),
          b('Gone', { href: '#gone', disabled: true }),
        ]),
      ],
      icons: true,
      lead: '<button id="before">before</button>',
      reducedMotion: true,
    });
    await wire(page);
    await watchClicks(page);
    // File's title ends in the indicator (MBR-47): the bar mixes menus with bar items.
    await stageWidth(page, 'fold', 150 + (await resolveToken(page, T('container-gap'))) + (await resolveToken(page, T('indicator-size'))));
    const folded = ['Edit', 'Run', 'Tools', 'Documentation', 'Source', 'History', 'Off', 'Gone'];
    await expect.poll(async () => (await state(page, 'fold')).folded).toEqual(folded);
    // The product's elements stay where the product wrote them; a folded link item's anchor is in the document, not displayed.
    expect(await bar(page, 'fold').evaluate((el) => [...el.children].map((each) => (each as any).label))).toEqual(['File', ...folded]);
    expect(await anchor(page, 'fold', 'Documentation').evaluate((el) => [el.isConnected, el.parentElement!.localName, el.getClientRects().length, el.getAttribute('href')])).toEqual([true, 'tanrei-menubar-item', 0, '#docs']);
    // The overflow item's menu, in the order given: submenu items for the menus, items for the bar items.
    const rows = () =>
      bar(page, 'fold').evaluate((el) =>
        [...el.querySelectorAll(':scope > [data-tanrei-folded]')].map((each) => {
          const row = each.shadowRoot!.querySelector('tanrei-submenu, tanrei-menu-item')!;
          const link = row.shadowRoot!.querySelector('a');
          const said = link ?? row;
          return [row.localName.replace('tanrei-', ''), (row as any).label, said.getAttribute('role'), said.getAttribute('aria-haspopup') ?? '-', said.getAttribute('aria-disabled') ?? '-', `${said.getAttribute('aria-posinset')}/${said.getAttribute('aria-setsize')}`, link ? `a ${link.getAttribute('href') ?? '-'} ${link.getAttribute('target') ?? '-'}` : '-', said.getAttribute('aria-description') ?? '-', said.getAttribute('aria-current') ?? '-'].join(' | ');
        }),
      );
    await focusTitle(page, 'fold', 'File');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await expect.poll(() => state(page, 'fold')).toMatchObject({ overflow: true, focus: 'item:Edit' });
    expect(await rows()).toEqual([
      'submenu | Edit | menuitem | menu | - | 1/8 | - | - | -',
      'menu-item | Run | menuitem | - | - | 2/8 | - | - | -',
      'submenu | Tools | menuitem | menu | - | 3/8 | - | - | -',
      'menu-item | Documentation | menuitem | - | - | 4/8 | a #docs - | - | -',
      'menu-item | Source | menuitem | - | - | 5/8 | a #src _blank | opens in a new tab | -',
      'menu-item | History | menuitem | - | - | 6/8 | a #history - | - | page',
      'menu-item | Off | menuitem | - | true | 7/8 | - | - | -',
      'menu-item | Gone | menuitem | - | true | 8/8 | - | - | -',
    ]);
    if (browserName === 'chromium') {
      const tree = await ax(page);
      // Every row is a menu item of that menu (a link row's own host is nothing, its anchor the item: MNU-53); their order is the positions above.
      expect(tree.filter((node) => node.parent === 'menu' && node.role !== 'generic').map((node) => `${node.role}:${node.name}:${node.popup ?? '-'}${node.disabled ? ':disabled' : ''}`).sort()).toEqual(['menuitem:Edit:menu', 'menuitem:Run:-', 'menuitem:Tools:menu', 'menuitem:Documentation:-', 'menuitem:Source:-', 'menuitem:History:-', 'menuitem:Off:-:disabled', 'menuitem:Gone:-:disabled'].sort());
      expect(tree.filter((node) => node.role === 'link')).toEqual([]);
      expect(tree.filter((node) => node.role === 'menuitem' && node.parent === 'menubar').map((node) => `${node.name}:${node.expanded}:${node.popup}`)).toEqual(['File:false:menu', 'More:true:menu']);
    }
    // A folded link item that opens a new context is marked as the menu marks its own; a current one is the menu's own
    // current link item (MNU-58): filled from the selected condition, at its label's own weight.
    const row = (label: string) => item(page, 'fold', label).locator('tanrei-menu-item');
    await expect(row('Source').locator('.link-mark')).toHaveCount(1);
    await expect(row('Documentation').locator('.link-mark')).toHaveCount(0);
    expect(await css(row('History').locator('.label'), 'font-weight')).toBe(await css(row('Documentation').locator('.label'), 'font-weight'));
    expect(await css(row('History').locator('.row'), 'background-color')).toBe(await resolveColor(page, '--tanrei-comp-menu-selected-container-color'));
    expect(await css(row('Documentation').locator('.row'), 'background-color')).not.toBe(await css(row('History').locator('.row'), 'background-color'));
    // An action: the listener on the bar item's own element hears it once, while the overflow item's menu is still shown.
    await page.evaluate(() => {
      const seen: string[] = ((window as any).seen = []);
      const shown = () => document.querySelector('[data-fixture="fold"] tanrei-menubar')!.shadowRoot!.querySelector('.overflow')?.getAttribute('aria-expanded') ?? null;
      for (const each of document.querySelectorAll<HTMLElement>('[data-fixture="fold"] tanrei-menubar-item')) {
        const own = each.querySelector(':scope > a') ?? each;
        own.addEventListener('click', (event) => seen.push(`${(each as any).label}:${event.target === own}:${shown()}`));
      }
    });
    const seenAt = () => page.evaluate(() => (window as any).seen.splice(0) as string[]);
    await page.keyboard.press('ArrowDown');
    expect(await focus(page, 'fold')).toBe('item:Run');
    await clearLog(page);
    await page.keyboard.press('Enter');
    expect(await seenAt()).toEqual(['Run:true:true']);
    expect(await log(page)).toEqual(['act:Run']);
    await expect.poll(() => state(page, 'fold')).toMatchObject({ overflow: false, focus: 'title:overflow', open: [] });
    // By a pointer, and with a listener that moves focus: it stays where the product put it.
    await page.locator('[data-fixture="fold"] tanrei-menubar-item[label="Run"]').evaluate((el) => el.addEventListener('click', () => document.getElementById('before')!.focus(), { once: true }));
    await page.mouse.click(...(await centre(overflow(page, 'fold').locator('.container'))));
    await expect.poll(() => state(page, 'fold')).toMatchObject({ overflow: true });
    await clearLog(page);
    await page.mouse.click(...(await centre(row('Run').locator('.row'))));
    expect(await seenAt()).toEqual(['Run:true:true']);
    expect(await log(page)).toEqual(['act:Run']);
    await expect.poll(() => state(page, 'fold')).toMatchObject({ overflow: false, focus: 'before' });
    // A link item: one click, on the product's own anchor, cancelable there; then the destination.
    const openOverflowOn = async (label: string) => {
      await focusTitle(page, 'fold', 'File');
      await page.keyboard.press('End');
      await page.keyboard.press('Enter');
      await expect.poll(() => state(page, 'fold')).toMatchObject({ overflow: true, focus: 'item:Edit' });
      for (let n = 0; n < folded.indexOf(label); n += 1) await page.keyboard.press('ArrowDown');
      expect(await focus(page, 'fold')).toBe(`item:${label}`);
      await clearLog(page);
      await heard(page);
      await seenAt();
    };
    for (const key of ['Enter', ' ']) {
      await page.evaluate(() => void (location.hash = ''));
      await openOverflowOn('Documentation');
      await page.keyboard.press(key);
      expect(await seenAt(), key).toEqual(['Documentation:true:true']);
      expect(await log(page), key).toEqual(['go:Documentation']);
      expect(await heard(page), key).toEqual(['click:0:left']);
      await expect.poll(() => hash(page)).toBe('#docs');
      await expect.poll(() => state(page, 'fold')).toMatchObject({ overflow: false, focus: 'title:overflow' });
    }
    await page.evaluate(() => void (location.hash = ''));
    await openOverflowOn('Documentation');
    await anchor(page, 'fold', 'Documentation').evaluate((el) => el.addEventListener('click', (event) => event.preventDefault(), { once: true }));
    await page.mouse.click(...(await centre(row('Documentation').locator('.row'))));
    expect(await seenAt()).toEqual(['Documentation:true:true']);
    expect(await heard(page)).toEqual(['click:0:prevented']);
    await expect.poll(() => state(page, 'fold')).toMatchObject({ overflow: false, focus: 'title:overflow' });
    expect(await hash(page)).toBe('');
    // What the platform gives a link is left to the row's own anchor, which has the same address: the menu stays open.
    await openOverflowOn('Documentation');
    const own = row('Documentation').locator('a');
    await send(own, 'click', { ctrlKey: true });
    await send(own, 'click', { metaKey: true });
    await send(own, 'auxclick', { button: 1 });
    expect(await heard(page)).toEqual(['click:0:left', 'click:0:left', 'auxclick:1:left']);
    expect(await seenAt()).toEqual([]);
    expect(await state(page, 'fold')).toMatchObject({ overflow: true, focus: 'item:Documentation' });
    // A disabled one acts on nothing.
    await page.mouse.click(...(await centre(row('Off').locator('.row'))));
    await page.mouse.click(...(await centre(row('Gone').locator('.row'))));
    expect(await seenAt()).toEqual([]);
    expect(await state(page, 'fold')).toMatchObject({ overflow: true });
    await page.keyboard.press('Escape');
    // Unfolded again, the same elements are the row's entries, and the same listeners hear them.
    await stageWidth(page, 'fold', 900);
    await expect.poll(async () => (await state(page, 'fold')).folded).toEqual([]);
    await clearLog(page);
    await page.mouse.click(...(await centre(itemContainer(page, 'fold', 'Run'))));
    expect(await seenAt()).toEqual(['Run:true:null']);
  });

  test('MBR-43: the overflow item is a title that opens a menu whatever is folded into it and never acts by itself — where everything folded is bar items its menu holds items and no submenu', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [mixed('tail', [m('File', it('New')), m('Edit', it('Undo')), b('Run'), b('Documentation', { href: '#docs' })])], icons: true, reducedMotion: true });
    await wire(page);
    const fits = (await box(menu(page, 'tail', 'Edit'))).right - (await box(menu(page, 'tail', 'File'))).x + 2 * (await resolveToken(page, T('bar-padding-inline'))) + 32;
    await stageWidth(page, 'tail', fits + (await resolveToken(page, T('bar-gap'))) + Math.max(await resolveToken(page, T('container-height')), await resolveToken(page, '--tanrei-sys-target-pointer')) + 4);
    await expect.poll(async () => (await state(page, 'tail')).folded).toEqual(['Run', 'Documentation']);
    await expect(overflow(page, 'tail')).toHaveAttribute('aria-haspopup', 'menu');
    expect(await bar(page, 'tail').evaluate((el) => [...el.querySelectorAll(':scope > [data-tanrei-folded]')].map((each) => each.shadowRoot!.querySelector('tanrei-submenu, tanrei-menu-item')!.localName))).toEqual(['tanrei-menu-item', 'tanrei-menu-item']);
    // A press on it opens its menu and runs nothing.
    await page.mouse.click(...(await centre(overflow(page, 'tail').locator('.container'))));
    await expect.poll(() => state(page, 'tail')).toMatchObject({ overflow: true, focus: 'item:Run' });
    expect(await log(page)).toEqual([]);
    // The inline arrow keys from it go on to the next title, as from any menu (MBR-13).
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => state(page, 'tail')).toMatchObject({ overflow: false, open: ['File'] });
  });

  test('MBR-44: an unknown target is same; an address that is white space, a script or unreadable makes the bar item an action; an empty label is an empty container that still works; a destination on a menu is ignored; a bar of bar items alone still works — each reported where the spec says', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [
        {
          ...mixed('odd', [m('File', it('New'))]),
          content: [
            '<tanrei-menubar-item id="frame"><a href="#frame" target="sidebar">Frame</a></tanrei-menubar-item>',
            '<tanrei-menubar-item id="space"><a href="  ">Space</a></tanrei-menubar-item>',
            '<tanrei-menubar-item id="script"><a href="javascript:void(window.ran = true)">Script</a></tanrei-menubar-item>',
            '<tanrei-menubar-item id="unread"><a href="http://[">Unread</a></tanrei-menubar-item>',
            '<tanrei-menubar-item id="noaddress" target-label="ignored"><a target="_blank">Plain</a></tanrei-menubar-item>',
            '<tanrei-menubar-item id="nameless"></tanrei-menubar-item>',
            '<tanrei-menubar-item id="hosted" label="Hosted" href="#hosted"></tanrei-menubar-item>',
            `<tanrei-menubar-menu id="menu" label="Tools" href="#tools">${it('Lint')}</tanrei-menubar-menu>`,
          ].join(''),
        },
        { id: 'toolbar', props: { label: 'Application' }, items: [b('Run'), b('Share'), b('Documentation', { href: '#docs' })] },
      ],
      icons: true,
      lead: '<button id="before">before</button>',
      reducedMotion: true,
    });
    await wire(page);
    await stageWidth(page, 'odd', 1000);
    await expect.poll(async () => (await state(page, 'odd')).folded).toEqual([]);
    const said = (id: string, ...parts: string[]) => expect.poll(() => seen.some((text) => parts.every((part) => text.includes(part)) && text.includes(`(${id})`)), parts.join(' / ')).toBe(true);
    // An unknown target: drawn and described as same — no mark, no description.
    await said('MBR-44', '<tanrei-menubar-item>', 'target "sidebar"');
    await expect(page.locator('#frame .icon')).toHaveCount(0);
    expect(await page.locator('#frame').evaluate((el: any) => el.target)).toBe('same');
    // White space: an action, and nothing is said. A script, an unreadable address: an action, and reported.
    await said('MBR-44', 'href names a script to run');
    await said('MBR-44', 'cannot be read as an address');
    expect(seen.some((text) => text.includes('"  "'))).toBe(false);
    const before = await page.evaluate(() => location.href);
    for (const id of ['space', 'script', 'unread']) {
      await clearLog(page);
      await page.mouse.click(...(await centre(page.locator(`#${id} .container`))));
      expect(await log(page), id).toEqual([`go:${id[0].toUpperCase()}${id.slice(1)}`]);
      await expect(page.locator(`#${id} .title`), id).not.toHaveClass(/link/);
    }
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => [location.href, (window as any).ran])).toEqual([before, undefined]);
    // Without an address the target and its words are ignored; the anchor is still the entry, and the report says to write an action.
    await said('MBR-44', 'its anchor has no href', 'write an action with label');
    await expect(page.locator('#noaddress .icon')).toHaveCount(0);
    await expect(page.locator('#noaddress > a')).not.toHaveAttribute('aria-description');
    await expect(page.locator('#noaddress > a')).toHaveAttribute('role', 'menuitem');
    // An empty label: a title's empty container, reachable and operable.
    await said('MBR-44', '<tanrei-menubar-item>', 'label is empty');
    const empty = await box(page.locator('#nameless .container'));
    expect(empty.height).toBeCloseTo(await resolveToken(page, T('container-height')), 1);
    expect(empty.width).toBeCloseTo(2 * (await resolveToken(page, T('container-padding-inline'))), 1);
    await expect(page.locator('#nameless')).not.toHaveAttribute('aria-label');
    await page.locator('#nameless').focus();
    await clearLog(page);
    await page.keyboard.press('Enter');
    expect(await log(page)).toEqual(['act:']);
    // A destination written on the element that holds no anchor, and one on a menu: ignored, and reported.
    await said('MBR-45', 'href is written on the element, which holds no anchor');
    await page.mouse.click(...(await centre(page.locator('#hosted .container'))));
    expect(await hash(page)).toBe('');
    await said('MBR-44', '<tanrei-menubar-menu>', 'href is written on a menu');
    await page.mouse.click(...(await centre(page.locator('#menu .container'))));
    await expect.poll(() => state(page, 'odd')).toMatchObject({ open: ['Tools'], focus: 'item:Lint' });
    expect(await hash(page)).toBe('');
    await page.keyboard.press('Escape');
    // Bar items and no menu: drawn, one Tab stop, the keys — and reported.
    await said('MBR-44', '<tanrei-menubar>', 'it holds bar items and no menu', 'a toolbar');
    expect(seen.some((text) => text.includes('it holds neither a menu nor a bar item'))).toBe(false);
    await item(page, 'toolbar', 'Run').focus();
    await page.keyboard.press('End');
    expect(await state(page, 'toolbar')).toMatchObject({ focus: 'title:Documentation', stop: 'Documentation' });
    await page.keyboard.press('ArrowRight');
    expect(await focus(page, 'toolbar')).toBe('title:Run');
    await clearLog(page);
    await page.keyboard.press('Enter');
    expect(await log(page)).toEqual(['act:Run']);
  });

  test('MBR-45: with scripting off the bar’s link items are links that work — shown in the bar’s place in the order given, followed by the browser, reached with Tab, with no role and no roving focus — and menus and actions show nothing', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    try {
      await page.setContent(`<!doctype html><html lang="en" data-tanrei-theme="light"><head><meta charset="utf-8"><title>no script</title>
        <style>${dist('tokens.css')}</style><style>${dist('menubar.css')}</style><style>body { margin: 16px; inline-size: 528px; } a { color: blue; }</style></head><body>
        <button id="before">before</button>
        <tanrei-menubar label="Application" overflow-label="More">
          <tanrei-menubar-menu label="File"><tanrei-menu-item label="New"></tanrei-menu-item></tanrei-menubar-menu>
          <tanrei-menubar-item label="Run"></tanrei-menubar-item>
          <tanrei-menubar-item><a href="#docs">Documentation</a></tanrei-menubar-item>
          <tanrei-menubar-item target-label="opens in a new tab"><a href="#src" target="_blank">Source</a></tanrei-menubar-item>
          <tanrei-menubar-item><a href="#history" aria-current="page">History</a></tanrei-menubar-item>
          <tanrei-menubar-item disabled><a>Archive</a></tanrei-menubar-item>
        </tanrei-menubar>
        <button id="after">after</button><div id="docs" style="block-size: 2000px"></div></body></html>`);
      const read = (selector: string, property: string) => page.locator(selector).evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
      const rect = (selector: string) => page.locator(selector).evaluate((el) => (({ x, y, width, height }) => ({ x, y, width, height, right: x + width }))(el.getBoundingClientRect()));
      const token = (name: string) => page.evaluate((n) => {
        const probe = document.body.appendChild(document.createElement('div'));
        probe.style.inlineSize = `var(${n})`;
        const value = probe.getBoundingClientRect().width;
        probe.remove();
        return value;
      }, name);
      // A row of the links alone, in the order given, in a title's text style, height and paddings, with no underline.
      const links = ['Documentation', 'Source', 'History', 'Archive'];
      const boxes = await Promise.all(links.map((label) => rect(`a:text-is("${label}")`)));
      const [gap, height, pad, barPad] = [await token(T('bar-gap')), await token(T('container-height')), await token(T('container-padding-inline')), await token(T('bar-padding-inline'))];
      const own = await rect('tanrei-menubar');
      expect(boxes[0].x).toBeCloseTo(own.x + barPad, 1);
      for (let n = 1; n < boxes.length; n += 1) {
        expect(boxes[n].x - boxes[n - 1].right, links[n]).toBeCloseTo(gap, 1);
        expect(boxes[n].y).toBeCloseTo(boxes[0].y, 1);
      }
      for (const each of boxes) expect(each.height).toBeCloseTo(height, 1);
      expect(await read('a:text-is("Documentation")', 'padding-left')).toBe(`${pad}px`);
      expect(await read('a:text-is("Documentation")', 'text-decoration-line')).toBe('none');
      expect(await read('a:text-is("Documentation")', 'white-space')).toBe('nowrap');
      // The product's own rule for its anchors wins: the stylesheet's selectors have no specificity, in a layer.
      expect(await read('a:text-is("Documentation")', 'color')).toBe('rgb(0, 0, 255)');
      // The current link item is filled from the selected condition, at its label's own weight (MBR-38).
      expect(await read('a:text-is("History")', 'font-weight')).toBe(await read('a:text-is("Documentation")', 'font-weight'));
      expect(await read('a:text-is("History")', 'background-color')).not.toBe(await read('a:text-is("Documentation")', 'background-color'));
      // A menu and an action show nothing there.
      for (const selector of ['tanrei-menubar-menu', 'tanrei-menubar-item[label="Run"]']) expect(await page.locator(selector).evaluate((el) => el.getClientRects().length)).toBe(0);
      // No menubar, no menu item, no roving focus: nothing ran.
      expect(await page.locator('tanrei-menubar').evaluate((el) => [el.getAttribute('role'), el.querySelectorAll('[role], [tabindex]').length, !!el.shadowRoot])).toEqual([null, 0, false]);
      // Tab reaches each link that has an address, as any link — and not the one that has none.
      await page.locator('#before').focus();
      const reached: string[] = [];
      for (let n = 0; n < 4; n += 1) {
        await tab(page);
        reached.push(await page.evaluate(() => document.activeElement?.textContent ?? ''));
      }
      expect(reached).toEqual(['Documentation', 'Source', 'History', 'after']);
      // Followed by the browser.
      await page.locator('a:text-is("Documentation")').click();
      await expect.poll(() => page.evaluate(() => location.hash)).toBe('#docs');
    } finally {
      await context.close();
    }
  });

  test('MBR-45: when the bar begins to run it takes the anchors where they stand — the same nodes, not copied, moved or replaced — and gives them the menu item role and the bar’s one Tab stop', async ({ page }) => {
    await page.setContent(`<!doctype html><html lang="en" data-tanrei-theme="light"><head><meta charset="utf-8"><title>before definition</title>
      <style>${dist('tokens.css')}</style><style>${dist('menubar.css')}</style><style>body { margin: 16px; inline-size: 528px; }</style></head><body>
      <button id="before">before</button>
      <div data-fixture="late"><tanrei-menubar label="Application" overflow-label="More">
        <tanrei-menubar-menu label="File"><tanrei-menu-item label="New"></tanrei-menu-item></tanrei-menubar-menu>
        <tanrei-menubar-item label="Run"></tanrei-menubar-item>
        <tanrei-menubar-item><a href="#docs">Documentation</a></tanrei-menubar-item>
      </tanrei-menubar></div>
      <button id="after">after</button></body></html>`);
    expect(await page.evaluate(() => !!customElements.get('tanrei-menubar'))).toBe(false);
    const link = page.locator('tanrei-menubar-item > a');
    await expect(link).not.toHaveAttribute('role');
    expect(await css(link, 'text-decoration-line')).toBe('none');
    expect((await box(link)).height).toBeCloseTo(await resolveToken(page, T('container-height')), 1);
    await page.evaluate(() => ((window as any).kept = document.querySelector('tanrei-menubar-item > a')));
    await page.addScriptTag({ type: 'module', content: dist('tanrei.bundle.js') });
    await page.waitForFunction(() => !!customElements.get('tanrei-menubar'));
    await expect(link).toHaveAttribute('role', 'menuitem');
    // The same node, where it stood.
    expect(await page.evaluate(() => { const kept = (window as any).kept as HTMLElement; return [kept === document.querySelector('tanrei-menubar-item > a'), kept.isConnected, kept.parentElement!.localName, kept.getAttribute('href'), document.querySelectorAll('tanrei-menubar a').length]; })).toEqual([true, true, 'tanrei-menubar-item', '#docs', 1]);
    // The stylesheet's rules no longer match; the bar draws the row, the link item a title in it.
    expect(await css(bar(page, 'late'), 'display')).toBe('block');
    expect((await box(itemContainer(page, 'late', 'Documentation'))).height).toBeCloseTo(await resolveToken(page, T('container-height')), 1);
    // Tab reaches the bar once.
    await page.locator('#before').focus();
    await tab(page);
    expect(await focus(page, 'late')).toBe('title:File');
    await tab(page);
    expect(await focus(page, 'late')).toBe('after');
    await expect(link).toHaveAttribute('tabindex', '-1');
  });

  test('MBR-46: forced colors — an action as a title, in the button text color; a link item’s label and mark in the link color; a disabled bar item, action or link, in the disabled text color; the current link item, whose fill the mode removes, by a line in the link color', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [mixed('forced', [m('File', it('New')), b('Run'), b('Documentation', { href: '#docs' }), b('Source', { href: '#src', target: 'new', targetLabel: 'opens in a new tab' }), b('History', { href: '#history', current: true }), b('Off', { disabled: true }), b('Gone', { href: '#gone', disabled: true })])],
      icons: true,
      reducedMotion: true,
    });
    // Every entry in the row: none folded into the overflow item, where it is a row of a menu instead.
    await stageWidth(page, 'forced', 1000);
    await expect.poll(async () => (await state(page, 'forced')).folded).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    const forced = await page.evaluate(() => {
      const probe = document.body.appendChild(document.createElement('div'));
      probe.style.color = 'rgb(1, 2, 3)';
      const repainted = matchMedia('(forced-colors: active)').matches && getComputedStyle(probe).color !== 'rgb(1, 2, 3)';
      probe.remove();
      return repainted;
    });
    test.skip(!forced, 'forced colors are not emulated by this browser');
    const system = (name: string) =>
      page.evaluate((value) => {
        const probe = document.body.appendChild(document.createElement('span'));
        probe.style.setProperty('forced-color-adjust', 'none');
        probe.style.setProperty('color', value);
        const read = getComputedStyle(probe).color;
        probe.remove();
        return read;
      }, name);
    const [button, link, gray] = [await system('ButtonText'), await system('LinkText'), await system('GrayText')];
    expect(new Set([button, link, gray]).size).toBe(3);
    expect(await css(item(page, 'forced', 'Run').locator('.label'), 'color')).toBe(button);
    expect(await css(container(page, 'forced', 'File').locator('.label'), 'color')).toBe(button);
    for (const label of ['Documentation', 'Source', 'History']) expect(await css(anchor(page, 'forced', label), 'color'), label).toBe(link);
    expect(await css(item(page, 'forced', 'Source').locator('.icon'), 'color')).toBe(link);
    expect(await css(item(page, 'forced', 'Off').locator('.label'), 'color')).toBe(gray);
    expect(await css(anchor(page, 'forced', 'Gone'), 'color')).toBe(gray);
    // No fill of the design system's; a hovered bar item by a line, as a title.
    expect(await css(itemContainer(page, 'forced', 'Run'), 'background-color')).toBe('rgba(0, 0, 0, 0)');
    await page.mouse.move(...(await centre(itemContainer(page, 'forced', 'Documentation'))));
    expect(await css(itemContainer(page, 'forced', 'Documentation'), 'box-shadow')).toContain('inset');
    // The current link item: no fill (the mode removes it), and a line of sys.border.thick inside its edge in the link color.
    await page.mouse.move(0, 0);
    expect(await css(itemContainer(page, 'forced', 'History'), 'background-color')).toBe('rgba(0, 0, 0, 0)');
    const thick = await resolveToken(page, '--tanrei-sys-border-thick');
    expect(await css(itemContainer(page, 'forced', 'History'), 'box-shadow')).toBe(`${link} 0px 0px 0px ${thick}px inset`);
  });

  test('MBR-47: while the bar mixes menus with bar items each menu’s title ends in expand_more at indicator.size, container.gap after its label, in its condition’s icon color, never mirrored and hidden; a bar of menus only draws none; it is decided from every entry, folded or not; the title is as wide as its label, the gap and the glyph', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, reducedMotion: true });
    const [size, gap, pad] = [await resolveToken(page, T('indicator-size')), await resolveToken(page, T('container-gap')), await resolveToken(page, T('container-padding-inline'))];
    expect(size).toBe(await resolveToken(page, '--tanrei-sys-icon-small'));
    for (const label of ['File', 'Edit', 'View']) {
      const glyph = container(page, 'mixed', label).locator('.indicator');
      await expect(glyph, label).toHaveCount(1);
      await expect(glyph, label).toHaveText('expand_more');
      await expect(glyph, label).toHaveAttribute('aria-hidden', 'true');
      await expect(glyph, label).toHaveAttribute('data-drawn', '');
      const [g, l, c] = [await box(glyph), await box(container(page, 'mixed', label).locator('.label')), await box(container(page, 'mixed', label))];
      expect(g.width, label).toBeCloseTo(size, 1);
      expect(g.x - l.right, label).toBeCloseTo(gap, 1);
      // As wide as its label, the gap and the glyph, inside the paddings.
      expect(c.width, label).toBeCloseTo(l.width + gap + size + 2 * pad, 1);
      expect(await css(glyph, 'color'), label).toBe(await resolveColor(page, T('unselected-icon-color')));
      expect(await css(glyph, 'transform'), label).toBe('none');
    }
    // A bar item has none; the title of the open menu draws it in the expanded condition's icon color.
    for (const label of ['Run', 'Documentation']) await expect(item(page, 'mixed', label).locator('.indicator'), label).toHaveCount(0);
    await expect(container(page, 'mixed-open', 'Edit').locator('.indicator')).toHaveCount(1);
    expect(await color(page, container(page, 'mixed-open', 'Edit').locator('.indicator'), 'color')).toBe(await resolveColor(page, T('expanded-icon-color')));
    // A bar of menus only: no indicator anywhere, and no overflow glyph is one.
    for (const id of ['default', 'many']) await expect(bar(page, id).locator('tanrei-menubar-menu .indicator'), id).toHaveCount(0);
    // Never mirrored in a right-to-left layout.
    for (const label of ['ملف']) {
      const glyph = container(page, 'mixed-rtl', label).locator('.indicator');
      await expect(glyph).toHaveCount(1);
      expect(await css(glyph, 'transform')).toBe('none');
      expect(await css(glyph, 'scale')).toBe('none');
    }
    // Decided from every entry: folding the bar items away keeps the indicators, and removing the last bar item takes
    // them away at once.
    await mountFixtures(page, spec, { fixtures: [mixed('fold', [m('File', it('New')), m('Edit', it('Undo')), b('Run')])], icons: true, reducedMotion: true });
    await expect(container(page, 'fold', 'File').locator('.indicator')).toHaveCount(1);
    const fileWidth = (await box(container(page, 'fold', 'File'))).width;
    await stageWidth(page, 'fold', fileWidth + 90);
    await expect.poll(async () => (await state(page, 'fold')).folded.length).toBeGreaterThan(0);
    await expect(container(page, 'fold', 'File').locator('.indicator')).toHaveCount(1);
    await stageWidth(page, 'fold', 560);
    await expect.poll(async () => (await state(page, 'fold')).folded).toEqual([]);
    await item(page, 'fold', 'Run').evaluate((el) => el.remove());
    await expect(container(page, 'fold', 'File').locator('.indicator')).toHaveCount(0);
    await expect.poll(async () => (await box(container(page, 'fold', 'File'))).width).toBeCloseTo(fileWidth - gap - size, 1);
  });

  test('MBR-30: a bar item added, removed, reordered or renamed while the bar is shown is laid out at once — an anchor’s text and attributes are seen changing too — and when the bar item that holds focus is removed focus moves to the entry that followed', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [mixed()], reducedMotion: true });
    const order = () => bar(page, 'mixed').evaluate((el) => [...el.children].sort((a, z) => a.getBoundingClientRect().x - z.getBoundingClientRect().x).map((each) => (each as any).label as string));
    const gap = await resolveToken(page, T('bar-gap'));
    // The anchor's text changes: the label, the ruler's copy and the type-ahead follow.
    const before = await box(item(page, 'mixed', 'Documentation'));
    await anchor(page, 'mixed', 'Documentation').evaluate((el) => (el.firstChild!.nodeValue = 'Docs'));
    await expect.poll(async () => (await box(item(page, 'mixed', 'Docs'))).width).toBeLessThan(before.width);
    expect(await item(page, 'mixed', 'Docs').evaluate((el: any) => el.label)).toBe('Docs');
    await expect.poll(() => bar(page, 'mixed').evaluate((el) => [...el.shadowRoot!.querySelectorAll('.ruler > .menu-copy')].map((each) => each.querySelector('.label')!.textContent!.trim()))).toEqual(['File', 'Edit', 'View', 'Run', 'Docs']);
    expect(await bar(page, 'mixed').evaluate((el) => { const copy = el.shadowRoot!.querySelectorAll('.ruler > .menu-copy')[4]; return Math.abs(copy.getBoundingClientRect().width - el.children[4].getBoundingClientRect().width) < 0.1; })).toBe(true);
    // The property writes the anchor.
    await item(page, 'mixed', 'Docs').evaluate((el: any) => { el.label = 'Guide'; el.href = '#guide'; });
    await expect(anchor(page, 'mixed', 'Guide')).toHaveAttribute('href', '#guide');
    await focusTitle(page, 'mixed', 'File');
    await page.keyboard.press('g');
    expect(await focus(page, 'mixed')).toBe('title:Guide');
    // An action renamed, a bar item added between two entries and one reordered: at once, the gap apart.
    await item(page, 'mixed', 'Run').evaluate((el) => el.setAttribute('label', 'Run all'));
    await expect(item(page, 'mixed', 'Run all')).toHaveAttribute('aria-label', 'Run all');
    await expect.poll(async () => (await box(item(page, 'mixed', 'Run all'))).width).toBeGreaterThan(0);
    await bar(page, 'mixed').evaluate((el) => el.children[1].insertAdjacentHTML('afterend', '<tanrei-menubar-item label="Share"></tanrei-menubar-item>'));
    await expect.poll(order).toEqual(['File', 'Edit', 'Share', 'View', 'Run all', 'Guide']);
    await expect.poll(async () => (await box(menu(page, 'mixed', 'View'))).x - (await box(item(page, 'mixed', 'Share'))).right).toBeCloseTo(gap, 1);
    await expect(item(page, 'mixed', 'Share')).toHaveAttribute('aria-posinset', '3');
    await expect(anchor(page, 'mixed', 'Guide')).toHaveAttribute('aria-setsize', '6');
    await bar(page, 'mixed').evaluate((el) => el.prepend(el.children[5]));
    await expect.poll(order).toEqual(['Guide', 'File', 'Edit', 'Share', 'View', 'Run all']);
    await expect(anchor(page, 'mixed', 'Guide')).toHaveAttribute('aria-posinset', '1');
    // The link item that holds focus is removed: focus goes to the entry that followed.
    await anchor(page, 'mixed', 'Guide').focus();
    expect(await state(page, 'mixed')).toMatchObject({ focus: 'title:Guide', stop: 'Guide' });
    await item(page, 'mixed', 'Guide').evaluate((el) => el.remove());
    await expect.poll(() => state(page, 'mixed')).toMatchObject({ focus: 'title:File', stop: 'File' });
    // The last one removed: to the one before.
    await page.keyboard.press('End');
    expect(await focus(page, 'mixed')).toBe('title:Run all');
    await item(page, 'mixed', 'Run all').evaluate((el) => el.remove());
    await expect.poll(() => state(page, 'mixed')).toMatchObject({ focus: 'title:View', stop: 'View' });
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark: every fixture, a filled bar with a menu and a submenu open, and a folded bar with the overflow item’s menu open', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true, reducedMotion: true });
      let results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(' ')}`).join(', ')}`).toEqual([]);
      await mountFixtures(page, spec, { theme, icons: true, reducedMotion: true, fixtures: [editor()] });
      await focusTitle(page, 'editor', 'File');
      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowRight');
      await expect.poll(() => focus(page, 'editor')).toBe('item:One');
      await settled(page);
      results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}, open: ${results.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(' ')}`).join(', ')}`).toEqual([]);
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
      await stageWidth(page, 'editor', 215);
      await expect.poll(async () => (await state(page, 'editor')).folded.length).toBeGreaterThan(0);
      await page.keyboard.press('End');
      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowRight');
      await expect.poll(() => focus(page, 'editor')).toBe('item:Zoom in');
      await settled(page);
      results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}, folded: ${results.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(' ')}`).join(', ')}`).toEqual([]);
    }
  });

  test('keyboard only: every command of a bar is reached and run without a pointer, at full width and folded — MBR-9, MBR-12, MBR-13, MBR-22', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [editor()], icons: true, lead: '<button id="before">before</button>', reducedMotion: true });
    await wire(page);
    for (const width of [560, 220]) {
      await stageWidth(page, 'editor', width);
      await page.locator('#before').focus();
      await expect.poll(async () => (await state(page, 'editor')).folded.length > 0).toBe(width < 400);
      await clearLog(page);
      await tab(page);
      await expect.poll(async () => (await focus(page, 'editor')).startsWith('title:')).toBe(true);
      await page.keyboard.press('Home');
      // To Help's About: along the bar and into the menu — through the overflow item where Help is folded.
      const { folded } = await state(page, 'editor');
      if (folded.includes('Help')) {
        await page.keyboard.press('End');
        await page.keyboard.press('ArrowUp');
        await expect.poll(() => focus(page, 'editor')).toBe('item:Help');
        await page.keyboard.press('ArrowRight');
      } else {
        await page.keyboard.press('h');
        await page.keyboard.press('ArrowDown');
      }
      await expect.poll(() => focus(page, 'editor')).toBe('item:About');
      await page.keyboard.press('Enter');
      await expect.poll(() => open(page, 'editor')).toEqual([]);
      expect(await log(page), String(width)).toEqual(['toggle:Help:true', 'click:About', 'toggle:Help:false']);
    }
  });
});

test.describe('fixtures', () => {
  test('every fixture is mounted: its titles and its bar items in the row or folded, an open menu over its empty surface in place', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    for (const f of spec.fixtures) {
      const labels = f.items!.map((each) => String(each.props.label));
      const drawn = await bar(page, f.id).evaluate((el) => [...el.querySelectorAll(':scope > tanrei-menubar-menu, :scope > tanrei-menubar-item')].map((each) => (each as any).label as string));
      expect(drawn, f.id).toEqual(labels);
      // MBR-32, MBR-35: each entry is the element of its kind — a menu, an action, or a link item around its anchor.
      const kinds = await bar(page, f.id).evaluate((el) => [...el.children].map((each) => (each.localName === 'tanrei-menubar-menu' ? 'menu' : each.querySelector(':scope > a') ? 'link' : 'action')));
      expect(kinds, f.id).toEqual(f.items!.map((each) => (each.kind === 'menu' ? 'menu' : each.props.href ? 'link' : 'action')));
      await expect(bar(page, f.id), f.id).toHaveAttribute('role', 'menubar');
      const opened = f.items!.filter((each) => each.props.open).map((each) => String(each.props.label));
      expect(await open(page, f.id), f.id).toEqual(opened);
      // Only the open menu's surface is drawn.
      const drawnSurfaces = await bar(page, f.id).evaluate((el) => [...el.querySelectorAll(':scope > tanrei-menubar-menu')].filter((each) => { const surface = each.shadowRoot!.querySelector('tanrei-menu')?.shadowRoot!.querySelector('.surface'); return !!surface && surface.getBoundingClientRect().height > 0; }).map((each) => (each as any).label as string));
      expect(drawnSurfaces, f.id).toEqual(opened);
      for (const label of opened) {
        expect(await surfaceShown(menu(page, f.id, label).locator('tanrei-menu')), f.id).toBe(true);
        await expect(title(page, f.id, label)).toHaveClass(/expanded/);
        const [c, s] = [await box(container(page, f.id, label)), await box(surfaceOf(page, f.id, label))];
        expect(s.y, f.id).toBeCloseTo(c.bottom + (await resolveToken(page, '--tanrei-comp-menu-surface-offset')), 1);
        // In place the surface is laid out below the title, on the engine's own pixel grid.
        if (f.direction === 'rtl') expect(Math.abs(s.right - c.right), f.id).toBeLessThan(0.6);
        else expect(Math.abs(s.x - c.x), f.id).toBeLessThan(0.6);
      }
    }
    // Nothing took focus: the open fixtures are drawn in place.
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true });
      await expect(page.locator(`[data-fixture="${f.id}"]`)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
