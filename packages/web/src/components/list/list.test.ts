// <tanrei-list> and <tanrei-list-item>, driven by specs/list.spec.json: every behaviour id is cited by a test title,
// every fixture has a baseline, and every state, condition and choice of kind is read back from the tokens — never from
// a number written here.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, acmeSystemCss, iconFaceArrives, loadSpec, mountFixtures, resolveColor, resolveToken, rootTokens, setWords, tabTo, withoutIconFont } from '../../../test/harness.js';
import { MIRRORED, anchorOf, expectDisabledLink, expectLinkActivation, expectNewContext, expectRefusals, expectTargetLabel, markOf } from '../../../test/links.js';

const spec = loadSpec('list');
type P = Page;
type Props = Record<string, unknown>;
const list = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-list`);
const item = (page: P, id: string, n: number) => list(page, id).locator('tanrei-list-item').nth(n);
const row = (page: P, id: string, n: number) => item(page, id, n).locator('.row').first();
const handle = (page: P, id: string, n: number) => item(page, id, n).locator('.handle');
const css = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const T = (name: string) => `--tanrei-comp-list-${name}`;
const bounds = async (locator: Locator) => (await locator.boundingBox())!;
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
/** A fixture of this test's own: the list's props and one list item per entry — its content and its props. */
const fixture = (id: string, props: Fixture['props'], items: [string, Props?][], direction?: 'rtl'): Fixture => ({
  id,
  props,
  items: items.map(([content, p]) => ({ kind: 'list-item', props: (p ?? {}) as Fixture['props'], content })),
  ...(direction ? { direction } : {}),
});
const byId = (id: string) => spec.fixtures.find((f) => f.id === id)!;
/** Counts click events on each item and change events on each list. */
const listen = (page: P) =>
  page.evaluate(() => {
    const log = ((window as any).events = { clicks: [] as string[], changes: [] as unknown[] });
    for (const element of document.querySelectorAll('tanrei-list-item')) {
      element.addEventListener('click', () => log.clicks.push(`${element.closest('[data-fixture]')!.getAttribute('data-fixture')}:${(element as any).name}`));
    }
    for (const element of document.querySelectorAll('tanrei-list')) element.addEventListener('change', (e) => log.changes.push((e as CustomEvent).detail));
  });
const events = (page: P) => page.evaluate(() => (window as any).events as { clicks: string[]; changes: unknown[] });
/** Captures what the page reports in debug builds (console warnings). Call before mounting. */
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
/** Everything a state paints on an item, as drawn. */
const drawn = (page: P, id: string, n: number) =>
  item(page, id, n).evaluate((el) => {
    const root = el.shadowRoot!;
    const r = getComputedStyle(root.querySelector('.row')!);
    return { bg: r.backgroundColor, content: getComputedStyle(root.querySelector('.content')!).color, opacity: r.opacity };
  });
const expected = async (page: P, condition: 'unselected' | 'selected', state = '') => {
  const name = (part: string) => T(`${condition}-${state ? `${state}-` : ''}${part}`);
  return { bg: await resolveColor(page, name('container-color')), content: await resolveColor(page, name('content-color')), opacity: state ? await token(page, T(`${state}-opacity`)) : '1' };
};
/** The name of the item that has focus, through shadow roots, and whether focus is on its handle. */
const focused = (page: P) =>
  page.evaluate(() => {
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    let node: Node | null = active;
    let onHandle = false;
    while (node && !(node instanceof Element && node.localName === 'tanrei-list-item')) {
      if (node instanceof Element && node.classList.contains('handle')) onHandle = true;
      node = node.parentNode ?? (node as ShadowRoot).host ?? null;
    }
    return node ? `${(node as any).name}${onHandle ? ':handle' : ''}` : null;
  });

test.describe('layout', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
  });

  test('LST-1: a column from the top, each item as wide as the list, touching; a line from the start edge, each as wide as its content and as tall as the tallest; no fill, edge or padding of its own', async ({ page }) => {
    const column = await bounds(list(page, 'column'));
    for (let n = 0; n < 3; n++) {
      const b = await bounds(item(page, 'column', n));
      expect(b.x).toBe(column.x);
      expect(b.width).toBe(column.width);
      if (n) expect(b.y).toBeCloseTo((await bounds(item(page, 'column', n - 1))).y + (await bounds(item(page, 'column', n - 1))).height, 1);
    }
    expect((await bounds(item(page, 'column', 0))).y).toBe(column.y);
    expect(await css(list(page, 'column'), 'background-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(list(page, 'column'), 'padding-top')).toBe('0px');
    // A line: from the start edge, each as wide as its content, all as tall as the tallest, gap.small apart.
    await item(page, 'line', 1).evaluate((el) => (el.querySelector('.fixture-tile') as HTMLElement).style.setProperty('padding-block', '24px'));
    const line = await bounds(list(page, 'line'));
    const small = await resolveToken(page, T('gap-small'));
    const tallest = (await bounds(item(page, 'line', 1))).height;
    let x = line.x;
    for (let n = 0; n < 4; n++) {
      const b = await bounds(item(page, 'line', n));
      expect(b.x).toBeCloseTo(x, 1);
      expect(b.height).toBe(tallest);
      expect(b.width).toBeLessThan(line.width / 2);
      x = b.x + b.width + small;
    }
    // A line wider than the list goes past its end: no item is narrowed.
    await list(page, 'line').evaluate((el) => (el.style.inlineSize = '120px'));
    const narrow = await bounds(item(page, 'line', 3));
    expect(narrow.x + narrow.width).toBeGreaterThan((await bounds(list(page, 'line'))).x + 120);
  });

  test('LST-2: wrap — lines from the start edge that wrap below, the gap between items and between lines, the items of a line aligned at their tops, each never wider than the list; a vertical list wraps into columns where its height ends', async ({ page }) => {
    const box = await bounds(list(page, 'wrap'));
    const medium = await resolveToken(page, T('gap-medium'));
    const b = await Promise.all([0, 1, 2, 3, 4, 5, 6].map((n) => bounds(item(page, 'wrap', n))));
    const lines = [...new Set(b.map((each) => Math.round(each.y)))];
    expect(lines.length).toBeGreaterThan(1);
    expect(b[0].x).toBe(box.x);
    expect(b[1].x).toBeCloseTo(b[0].x + b[0].width + medium, 1);
    const second = b.findIndex((each) => Math.round(each.y) === lines[1]);
    expect(b[second].x, 'a new line begins at the start edge').toBe(box.x);
    expect(b[second].y).toBeCloseTo(b[0].y + b[0].height + medium, 1);
    for (const each of b) expect(each.x + each.width).toBeLessThanOrEqual(box.x + box.width + 0.5);
    // Aligned at their tops: a taller item does not move its neighbours down.
    await item(page, 'wrap', 1).evaluate((el) => (el.querySelector('.fixture-tile') as HTMLElement).style.setProperty('padding-block', '30px'));
    expect((await bounds(item(page, 'wrap', 0))).y).toBe(b[0].y);
    expect((await bounds(item(page, 'wrap', 0))).height).toBe(b[0].height);
    // LST-5 right-to-left: every line begins at the right.
    const rtl = await bounds(list(page, 'wrap-rtl'));
    const first = await bounds(item(page, 'wrap-rtl', 0));
    expect(first.x + first.width).toBeCloseTo(rtl.x + rtl.width, 1);
    expect((await bounds(item(page, 'wrap-rtl', 1))).x).toBeLessThan(first.x);
    // A vertical list wraps into a further column where the height the product gives it ends.
    await mountFixtures(page, spec, { fixtures: [fixture('columns', { wrap: true, gap: 'small' }, [['A'], ['B'], ['C'], ['D']])] });
    await list(page, 'columns').evaluate((el) => (el.style.blockSize = '100px'));
    const a = await bounds(item(page, 'columns', 0));
    const d = await bounds(item(page, 'columns', 3));
    expect(d.x).toBeGreaterThan(a.x);
  });

  test('LST-3: dividers — a hairline between neighbours, in the middle of the gap, across the list, none before the first; hidden; full opacity beside a disabled item; none while wrapping, reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [byId('dividers'), byId('line-dividers'), fixture('disabled-dividers', { dividers: true, gap: 'medium' }, [['One', { interactive: true }], ['Two', { interactive: true, disabled: true }]]), fixture('wrap-dividers', { orientation: 'horizontal', wrap: true, dividers: true }, [['A'], ['B']])],
    });
    const thickness = await resolveToken(page, T('divider-thickness'));
    const color = await resolveColor(page, T('divider-color'));
    expect(await item(page, 'dividers', 0).locator('.divider').count()).toBe(0);
    for (const n of [1, 2]) {
      const d = item(page, 'dividers', n).locator('.divider');
      await expect(d).toHaveAttribute('aria-hidden', 'true');
      const box = await bounds(d);
      const own = await bounds(item(page, 'dividers', n));
      expect(box.height).toBeCloseTo(thickness, 1);
      expect(box.width).toBe(own.width);
      expect(box.y + box.height / 2).toBeCloseTo(own.y, 1);
      expect(await css(d, 'background-color')).toBe(color);
    }
    // A line: vertical lines in the middle of the gap.
    const medium = await resolveToken(page, T('gap-medium'));
    const v = await bounds(item(page, 'line-dividers', 1).locator('.divider'));
    const one = await bounds(item(page, 'line-dividers', 0));
    expect(v.width).toBeCloseTo(thickness, 1);
    expect(v.x + v.width / 2).toBeCloseTo(one.x + one.width + medium / 2, 1);
    // Beside (and on) a disabled item, the divider keeps its full opacity.
    const disabled = item(page, 'disabled-dividers', 1);
    expect(await disabled.locator('.divider').evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    expect(await css(disabled.locator('.divider'), 'background-color')).toBe(color);
    // Wrapping: no dividers, and a debug build says so.
    expect(await item(page, 'wrap-dividers', 1).locator('.divider').count()).toBe(0);
    await expect.poll(() => seen.filter((w) => w.includes('(LST-3)')).length).toBeGreaterThan(0);
  });

  test('LST-4: the direction comes from where the list is used; a change is drawn at once, keeping the selection and focus', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [byId('line-single-selected')] });
    const first = async () => (await bounds(item(page, 'line-single-selected', 0))).x;
    const ltr = await first();
    await tabTo(page, item(page, 'line-single-selected', 1));
    await page.locator('[data-fixture="line-single-selected"]').evaluate((el) => el.setAttribute('dir', 'rtl'));
    expect(await first()).toBeGreaterThan(ltr);
    await expect(list(page, 'line-single-selected')).toHaveJSProperty('value', 'm');
    expect(await focused(page)).toBe('Medium');
    expect(await item(page, 'line-single-selected', 0).evaluate((el) => el.getAnimations().length)).toBe(0);
  });

  test('LST-5: right-to-left — the handle and the mark stand at the right and left ends; the arrows that point to the end and the start follow', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [byId('reorderable-rtl'), fixture('options-rtl', { selection: 'single', label: 'Theme', value: 'a', orientation: 'horizontal' }, [['A', { value: 'a' }], ['B', { value: 'b' }]], 'rtl')] });
    const h = await bounds(handle(page, 'reorderable-rtl', 0));
    const content = await bounds(item(page, 'reorderable-rtl', 0).locator('.content').first());
    expect(h.x).toBeGreaterThan(content.x + content.width - 1);
    const mark = await bounds(item(page, 'options-rtl', 0).locator('.mark'));
    const text = await bounds(item(page, 'options-rtl', 0).locator('.content').first());
    expect(mark.x + mark.width).toBeLessThanOrEqual(text.x + 0.5);
    // In a right-to-left line the arrow that points to the end is Left.
    await tabTo(page, item(page, 'options-rtl', 0));
    await page.keyboard.press('ArrowLeft');
    expect(await focused(page)).toBe('B');
    await page.keyboard.press('ArrowRight');
    expect(await focused(page)).toBe('A');
  });

  test('LST-6: an orientation, a gap, a selection or a target the list does not define is drawn as the default, and reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [fixture('odd', { orientation: 'diagonal', gap: 'huge', selection: 'some' } as Fixture['props'], [['A'], ['B']])] });
    expect((await bounds(item(page, 'odd', 1))).y).toBeGreaterThan((await bounds(item(page, 'odd', 0))).y);
    expect((await bounds(item(page, 'odd', 1))).y).toBeCloseTo((await bounds(item(page, 'odd', 0))).y + (await bounds(item(page, 'odd', 0))).height, 1);
    await expect(list(page, 'odd')).toHaveAttribute('role', 'list');
    await expect.poll(() => seen.filter((w) => w.includes('(LST-6)')).length).toBe(3);
  });
});

test.describe('items', () => {
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await acmeSystemCss();
  });
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
  });

  test('LST-7: a static item draws nothing and adds no space — it is as large as its content — takes no focus, emits no click, answers no state, ignores disabled, and leaves a control in its content alone', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('static', {}, [['<span class="box" style="display:block;block-size:30px">Box</span>', { disabled: true }], ['Text <button>Edit</button>']])] });
    const own = await bounds(item(page, 'static', 0));
    expect(own.height).toBe(30);
    expect(await css(row(page, 'static', 0), 'padding-left')).toBe('0px');
    expect(await css(row(page, 'static', 0), 'background-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await row(page, 'static', 0).getAttribute('tabindex')).toBeNull();
    await expect(item(page, 'static', 0)).not.toHaveAttribute('aria-disabled');
    await listen(page);
    await row(page, 'static', 0).hover();
    await page.mouse.down();
    expect(await row(page, 'static', 0).getAttribute('data-pressed')).toBeNull();
    await page.mouse.up();
    expect(await css(row(page, 'static', 0), 'background-color')).toBe('rgba(0, 0, 0, 0)');
    // The product's control keeps its role and its own focus stop.
    await expect(list(page, 'static').getByRole('button', { name: 'Edit' })).toHaveCount(1);
    await list(page, 'static').getByRole('button', { name: 'Edit' }).focus();
    await expect(list(page, 'static').getByRole('button', { name: 'Edit' })).toBeFocused();
  });

  test('LST-8: an action, a link or an option is one padded box at least container.height tall, the mark container.gap after its content, handing it the content color and text style; the whole box is the hit area', async ({ page }) => {
    const box = await bounds(row(page, 'single-selected', 0));
    expect(box.height).toBeGreaterThanOrEqual(await resolveToken(page, T('container-height')));
    expect(Number.parseFloat(await css(row(page, 'interactive', 0), 'padding-left'))).toBe(await resolveToken(page, T('container-padding-inline-start')));
    expect(Number.parseFloat(await css(row(page, 'interactive', 0), 'padding-right'))).toBe(await resolveToken(page, T('container-padding-inline-end')));
    expect(Number.parseFloat(await css(row(page, 'interactive', 0), 'padding-top'))).toBe(await resolveToken(page, T('container-padding-block')));
    const content = await bounds(item(page, 'single-selected', 0).locator('.content').first());
    const mark = await bounds(item(page, 'single-selected', 0).locator('.mark'));
    expect(mark.x - (content.x + content.width)).toBeCloseTo(await resolveToken(page, T('container-gap')), 1);
    expect(await css(item(page, 'interactive', 0).locator('.content').first(), 'color')).toBe(await resolveColor(page, T('unselected-content-color')));
    const font = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.font = 'var(--tanrei-comp-list-content-typescale-font)';
      document.body.append(probe);
      const size = getComputedStyle(probe).fontSize;
      probe.remove();
      return size;
    });
    expect(await css(item(page, 'interactive', 0).locator('.content').first(), 'font-size')).toBe(font);
    // It grows with its content.
    await item(page, 'interactive', 0).evaluate((el) => (el.innerHTML = '<span style="display:block;block-size:90px">Tall</span>'));
    expect((await bounds(row(page, 'interactive', 0))).height).toBeGreaterThanOrEqual(90);
    // Anywhere on the box presses it.
    await listen(page);
    await row(page, 'interactive', 1).scrollIntoViewIfNeeded();
    const b = await bounds(row(page, 'interactive', 1));
    await page.mouse.click(b.x + b.width - 2, b.y + 2);
    expect((await events(page)).clicks).toEqual(['interactive:Bluetooth']);
  });

  test('LST-9: each state renders the box from that state’s tokens of its condition; pointer focus is not the focused state', async ({ page }) => {
    await expect.poll(() => drawn(page, 'interactive', 0)).toEqual(await expected(page, 'unselected'));
    await row(page, 'interactive', 0).hover();
    await expect.poll(() => drawn(page, 'interactive', 0)).toEqual(await expected(page, 'unselected', 'hovered'));
    await page.mouse.move(0, 0);
    await tabTo(page, item(page, 'single-selected', 0));
    await expect.poll(() => drawn(page, 'single-selected', 0)).toEqual(await expected(page, 'selected', 'focused'));
    await row(page, 'interactive', 1).click();
    await page.mouse.move(0, 0);
    await expect.poll(() => drawn(page, 'interactive', 1)).toEqual(await expected(page, 'unselected'));
  });

  test('LST-9: under acme, where the three states differ, pressed beats focused beats hovered', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss(), fixtures: [byId('interactive')] });
    await tabTo(page, row(page, 'interactive', 0));
    await row(page, 'interactive', 0).hover();
    await expect.poll(() => drawn(page, 'interactive', 0)).toEqual(await expected(page, 'unselected', 'focused'));
    await page.mouse.down();
    await expect.poll(() => drawn(page, 'interactive', 0)).toMatchObject({ content: (await expected(page, 'unselected', 'pressed')).content });
    await page.mouse.up();
  });

  test('LST-10: keyboard focus shows the ring inside the box, on an action and an option; pointer focus does not', async ({ page }) => {
    await tabTo(page, row(page, 'interactive', 0));
    await expect(row(page, 'interactive', 0)).toHaveCSS('outline-style', 'solid');
    expect(Number.parseFloat(await css(row(page, 'interactive', 0), 'outline-offset'))).toBeLessThan(0);
    await tabTo(page, item(page, 'single-selected', 0));
    await expect(row(page, 'single-selected', 0)).toHaveCSS('outline-style', 'solid');
    await row(page, 'interactive', 1).click();
    await expect(row(page, 'interactive', 1)).not.toHaveCSS('outline-style', 'solid');
  });

  test('LST-11: an action, a link or an option is at least sys.target.pointer tall and wide; a coarse pointer makes it sys.target.touch', async ({ page, browserName }) => {
    await override(page, { [T('container-height')]: '10px', [T('container-padding-block')]: '0px', [T('container-padding-inline-start')]: '0px', [T('container-padding-inline-end')]: '0px' });
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    const b = await bounds(row(page, 'line-single-selected', 0));
    expect(b.height).toBeGreaterThanOrEqual(pointer);
    expect(b.width).toBeGreaterThanOrEqual(pointer);
    test.skip(browserName !== 'chromium', 'a coarse pointer is emulated in Chromium');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await page.reload();
    await mountFixtures(page, spec, { fixtures: [byId('interactive')] });
    await override(page, { [T('container-height')]: '10px', [T('container-padding-block')]: '0px' });
    if (await page.evaluate(() => matchMedia('(pointer: coarse)').matches)) expect((await bounds(row(page, 'interactive', 0))).height).toBeGreaterThanOrEqual(await resolveToken(page, '--tanrei-sys-target-touch'));
  });

  test('LST-15: a disabled action or option emits no click or change, exposes disabled, renders from the disabled tokens with the opacity on the whole item, and is reached by the arrow keys only', async ({ page }) => {
    await listen(page);
    await row(page, 'interactive', 2).click({ force: true });
    await row(page, 'selected-disabled', 1).click({ force: true });
    expect(await events(page)).toEqual({ clicks: [], changes: [] });
    await expect(row(page, 'interactive', 2)).toHaveAttribute('aria-disabled', 'true');
    await expect(item(page, 'selected-disabled', 1)).toHaveAttribute('aria-disabled', 'true');
    await expect.poll(() => drawn(page, 'interactive', 2)).toEqual(await expected(page, 'unselected', 'disabled'));
    await expect.poll(() => drawn(page, 'selected-disabled', 0)).toEqual(await expected(page, 'selected', 'disabled'));
    await tabTo(page, row(page, 'interactive', 0));
    await page.keyboard.press('End');
    expect(await focused(page)).toBe('Airplane mode');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    expect((await events(page)).clicks).toEqual([]);
  });

  test('LST-16: an action’s or an option’s colors change over the state motion, and at once where motion is reduced', async ({ page }) => {
    const duration = await resolveToken(page, T('motion-state-duration'), 'duration');
    expect(Number.parseFloat(await css(row(page, 'interactive', 0), 'transition-duration')) * 1000).toBe(duration);
    expect(await css(row(page, 'interactive', 0), 'transition-property')).toContain('background-color');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(row(page, 'interactive', 0), 'transition-duration')).toBe('0s');
  });
});

test.describe('press, feedback, corners and focus style', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [byId('interactive'), byId('single-selected')] });
  });
  const pressed = (page: P, id: string, n: number) => row(page, id, n).getAttribute('data-pressed');
  const ripples = (page: P, id: string, n: number) => row(page, id, n).locator('.ripple');

  test('LST-12: a press is shown at once and for at least press-hold, even when it ends sooner; a pointer press lasts while the pointer is down', async ({ page }) => {
    const hold = 600;
    await override(page, { '--tanrei-sys-motion-duration-press-hold': `${hold}ms` });
    const target = row(page, 'interactive', 0);
    await target.focus();
    await target.evaluate((el) => {
      const log: { on?: number; off?: number; down?: number } = ((window as any).press = {});
      new MutationObserver(() => {
        if (el.hasAttribute('data-pressed')) log.on ??= performance.now();
        else if (log.on !== undefined) log.off ??= performance.now();
      }).observe(el, { attributes: true, attributeFilter: ['data-pressed'] });
      window.addEventListener('keydown', () => (log.down ??= performance.now()), true);
    });
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => (window as any).press.off), { timeout: 3000 }).toBeDefined();
    const log = await page.evaluate(() => (window as any).press as { on: number; off: number; down: number });
    expect(log.off - log.down).toBeGreaterThanOrEqual(hold - 1);
    await row(page, 'interactive', 1).hover();
    await page.mouse.down();
    await page.waitForTimeout(hold * 2);
    expect(await pressed(page, 'interactive', 1)).toBe('overlay');
    await page.mouse.up();
  });

  test('LST-13 overlay, ripple, dim and none: the answer the system names', async ({ page }) => {
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('overlay');
    await row(page, 'interactive', 0).hover();
    await page.mouse.down();
    expect(await css(row(page, 'interactive', 0), 'background-color')).toBe(await resolveColor(page, T('unselected-pressed-container-color')));
    expect(await ripples(page, 'interactive', 0).count()).toBe(0);
    await page.mouse.up();
    await mountFixtures(page, spec, { system: 'm3-like', fixtures: [byId('interactive')] });
    await row(page, 'interactive', 0).hover();
    await page.mouse.down();
    expect(await pressed(page, 'interactive', 0)).toBe('ripple');
    await expect(ripples(page, 'interactive', 0)).toHaveCount(1);
    expect(await ripples(page, 'interactive', 0).evaluate((el) => Number.parseFloat(getComputedStyle(el).animationDuration) * 1000)).toBe(await resolveToken(page, T('motion-feedback-duration'), 'duration'));
    await page.mouse.up();
    await mountFixtures(page, spec, { system: 'cupertino', fixtures: [byId('interactive')] });
    await row(page, 'interactive', 0).hover();
    await page.mouse.down();
    expect(await pressed(page, 'interactive', 0)).toBe('dim');
    expect(await css(row(page, 'interactive', 0), 'opacity')).toBe(await token(page, T('pressed-opacity')));
    await page.mouse.up();
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'none' });
    await row(page, 'interactive', 1).hover();
    await page.mouse.down();
    expect(await pressed(page, 'interactive', 1)).toBe('none');
    await page.mouse.up();
  });

  test('LST-14: corners are container.shape eased by corner smoothing; focus style glow under acme, ring by default', async ({ page }) => {
    expect(Number.parseFloat(await css(row(page, 'interactive', 0), 'border-top-left-radius'))).toBe(await resolveToken(page, T('container-shape')));
    await override(page, { [T('container-shape')]: '12px' });
    await expect.poll(async () => Number.parseFloat(await css(row(page, 'interactive', 0), 'border-top-left-radius'))).toBeGreaterThan(0);
    await tabTo(page, row(page, 'interactive', 0));
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('ring');
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss(), fixtures: [byId('interactive'), byId('single-selected')] });
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('glow');
    await tabTo(page, row(page, 'interactive', 0));
    expect(await css(row(page, 'interactive', 0), 'box-shadow', '::after')).not.toBe('none');
  });
});

test.describe('semantics and keyboard', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
  });

  test('LST-17: one tab stop — the first selected option, the first enabled item, then the one focused last; the arrows of the arrangement without wrapping, Home, End, typeahead; a wrapping list moves across lines to the nearest item', async ({ page }) => {
    await tabTo(page, item(page, 'single-selected', 0));
    await expect(item(page, 'single-selected', 0)).toHaveAttribute('tabindex', '0');
    await expect(item(page, 'single-selected', 1)).toHaveAttribute('tabindex', '-1');
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('Dark');
    await page.keyboard.press('End');
    expect(await focused(page)).toBe('Match the system');
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('Match the system');
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowUp');
    expect(await focused(page)).toBe('Light');
    await page.keyboard.press('m');
    expect(await focused(page)).toBe('Match the system');
    await expect(list(page, 'single-selected')).toHaveJSProperty('value', 'light');
    // A horizontal list: Right and Left; Up and Down are not its keys.
    await tabTo(page, item(page, 'line-single-selected', 1));
    await page.keyboard.press('ArrowRight');
    expect(await focused(page)).toBe('Large');
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('Large');
    await page.keyboard.press('ArrowLeft');
    expect(await focused(page)).toBe('Medium');
    // A wrapping list of options: across the lines, to the nearest item of the next line.
    const tiles = Array.from({ length: 6 }, (_, n) => [`Tile ${n + 1}`, { value: `t${n + 1}` }] as [string, Props]);
    await mountFixtures(page, spec, { fixtures: [fixture('grid', { selection: 'single', label: 'Tiles', orientation: 'horizontal', wrap: true, gap: 'small' }, tiles)] });
    await list(page, 'grid').evaluate((el) => (el.style.inlineSize = '300px'));
    await tabTo(page, item(page, 'grid', 0));
    const perLine = await list(page, 'grid').evaluate((el) => {
      const items = [...el.querySelectorAll('tanrei-list-item')];
      return items.filter((each) => Math.round(each.getBoundingClientRect().top) === Math.round(items[0].getBoundingClientRect().top)).length;
    });
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe(`Tile ${perLine + 1}`);
    await page.keyboard.press('ArrowUp');
    expect(await focused(page)).toBe('Tile 1');
    await page.keyboard.press('ArrowRight');
    expect(await focused(page)).toBe('Tile 2');
  });

  test('LST-18: a list of list items with positions; an action is one button inside its item; a listbox named by label, multi-selectable, with its orientation; options with selected state; a reorderable list named by label', async ({ page }) => {
    await expect(list(page, 'column')).toHaveAttribute('role', 'list');
    await expect(item(page, 'column', 1)).toHaveAttribute('role', 'listitem');
    await expect(item(page, 'column', 1)).toHaveAttribute('aria-posinset', '2');
    await expect(item(page, 'column', 1)).toHaveAttribute('aria-setsize', '3');
    await expect(list(page, 'interactive').getByRole('listitem').nth(0).getByRole('button', { name: 'Wi-Fi' })).toHaveCount(1);
    await expect(list(page, 'single-selected')).toHaveAttribute('role', 'listbox');
    await expect(list(page, 'single-selected')).toHaveAttribute('aria-label', 'Theme');
    await expect(list(page, 'multiple-selected')).toHaveAttribute('aria-multiselectable', 'true');
    await expect(list(page, 'line-single-selected')).toHaveAttribute('aria-orientation', 'horizontal');
    await expect(list(page, 'single-selected')).not.toHaveAttribute('aria-orientation');
    await expect(list(page, 'single-selected').getByRole('option', { name: 'Light', selected: true })).toHaveCount(1);
    await expect(list(page, 'single-selected').getByRole('option', { name: 'Dark', selected: false })).toHaveCount(1);
    await expect(page.locator('[data-fixture="reorderable"]').getByRole('list', { name: 'Typefaces' })).toHaveCount(1);
    await expect(page.locator('[data-fixture="reorderable"]').getByRole('listitem')).toHaveCount(3);
  });

  test('LST-19: named by label, else by the content’s text, which is read as part of the item; the mark and dividers are hidden; a nameless item is reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [fixture('names', { selection: 'single', label: 'Plans', value: 'a' }, [['Basic <small>free</small>', { value: 'a' }], ['Pro', { value: 'b', label: 'Professional' }], ['<span aria-hidden="true">●</span>', { value: 'c' }]])] });
    await expect(list(page, 'names').getByRole('option', { name: 'Basic free' })).toHaveCount(1);
    await expect(list(page, 'names').getByRole('option', { name: 'Professional' })).toHaveCount(1);
    await expect(item(page, 'names', 0).locator('.mark')).toHaveAttribute('aria-hidden', 'true');
    expect(await item(page, 'names', 1).evaluate((el) => (el as any).name)).toBe('Professional');
    await item(page, 'names', 2).evaluate((el) => (el.innerHTML = ''));
    await expect.poll(() => seen.filter((w) => w.includes('(LST-19)')).length).toBeGreaterThan(0);
  });

  test('LST-20: an action’s, a link’s or an option’s content holds nothing interactive — a debug build reports one, on every change of it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [fixture('nested', {}, [['Row <button>Edit</button>', { interactive: true }]])] });
    await expect.poll(() => seen.filter((w) => w.includes('(LST-20)')).length).toBe(1);
  });

  test('LST-23: pointer, Enter and Space activate an interactive item exactly once — Enter on key-down, Space on key-up', async ({ page }) => {
    await listen(page);
    await row(page, 'interactive', 0).click();
    expect((await events(page)).clicks).toEqual(['interactive:Wi-Fi']);
    await row(page, 'interactive', 0).focus();
    await page.keyboard.down('Enter');
    expect((await events(page)).clicks).toHaveLength(2);
    await page.keyboard.up('Enter');
    await page.keyboard.down('Space');
    expect((await events(page)).clicks).toHaveLength(2);
    await page.keyboard.up('Space');
    expect((await events(page)).clicks).toHaveLength(3);
    await item(page, 'interactive', 0).evaluate((el) => (el as HTMLElement).click());
    expect((await events(page)).clicks).toHaveLength(4);
  });

  test('LST-24: single — choosing another option sets value and emits change once, choosing the selected one changes nothing; multiple — adds or removes', async ({ page }) => {
    await listen(page);
    await row(page, 'single-selected', 1).click();
    await row(page, 'single-selected', 1).click();
    await expect(list(page, 'single-selected')).toHaveJSProperty('value', 'dark');
    await row(page, 'multiple-selected', 1).click();
    await row(page, 'multiple-selected', 0).click();
    expect((await events(page)).changes).toEqual([{ value: 'dark' }, { values: ['bug', 'docs', 'feature'] }, { values: ['docs', 'feature'] }]);
  });

  test('LST-25: options are selected by value or values and drawn from the selected condition; names that select nothing, empty and repeated values are still drawn and reported', async ({ page }) => {
    const seen = warnings(page);
    await expect.poll(() => drawn(page, 'single-selected', 0)).toEqual(await expected(page, 'selected'));
    await expect.poll(() => drawn(page, 'single-selected', 1)).toEqual(await expected(page, 'unselected'));
    await mountFixtures(page, spec, { fixtures: [fixture('odd', { selection: 'single', label: 'Odd', value: 'nothing' }, [['A', { value: '' }], ['B', { value: 'b' }], ['C', { value: 'b' }]])] });
    await expect(list(page, 'odd').getByRole('option')).toHaveCount(3);
    await expect.poll(() => seen.filter((w) => w.includes('(LST-25)')).length).toBe(3);
  });

  test('LST-21: a mark box of mark.size is reserved in every option; a selected option draws the icon set’s check, in the mark color, never mirrored; it fades over the state motion', async ({ page }) => {
    const size = await resolveToken(page, T('mark-size'));
    for (const n of [0, 1]) {
      const mark = item(page, 'single-selected', n).locator('.mark');
      const b = await bounds(mark);
      expect([b.width, b.height]).toEqual([size, size]);
      expect((await mark.textContent())?.trim()).toBe('check');
    }
    expect(await css(item(page, 'single-selected', 0).locator('.mark'), 'opacity')).toBe('1');
    expect(await css(item(page, 'single-selected', 1).locator('.mark'), 'opacity')).toBe('0');
    expect(await css(item(page, 'single-selected', 0).locator('.mark'), 'color')).toBe(await resolveColor(page, T('selected-mark-color')));
    expect(await css(item(page, 'single-selected', 0).locator('.mark'), 'transition-property')).toContain('opacity');
    expect(Number.parseFloat(await css(item(page, 'single-selected', 0).locator('.mark'), 'transition-duration')) * 1000).toBe(await resolveToken(page, T('motion-state-duration'), 'duration'));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(item(page, 'single-selected', 0).locator('.mark'), 'transition-duration')).toBe('0s');
  });

  test('LST-22: while the icon set cannot draw the check, nothing stands in its place, the box keeps its size and the selected state is exposed; then it is shown', async ({ page }) => {
    await withoutIconFont(page);
    const mark = item(page, 'single-selected', 0).locator('.mark');
    await expect(mark).not.toHaveAttribute('data-drawn');
    expect(await css(mark, 'visibility')).toBe('hidden');
    expect((await bounds(mark)).width).toBe(await resolveToken(page, T('mark-size')));
    await expect(item(page, 'single-selected', 0)).toHaveAttribute('aria-selected', 'true');
    await iconFaceArrives(page);
    await expect(mark).toHaveAttribute('data-drawn', '');
  });
});

test.describe('link form', () => {
  const links = byId('links');

  test('LST-26: an item with href is one anchor — the link role and not the button role — inside its list item, named by its content, in the one tab stop, drawn as an interactive item', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [links, byId('interactive')] });
    await expect(list(page, 'links').getByRole('link')).toHaveCount(3);
    await expect(list(page, 'links').getByRole('button')).toHaveCount(0);
    expect(await anchorOf(item(page, 'links', 0))).toMatchObject({ tag: 'a', href: '/components/button/', target: null, role: null });
    await expect(list(page, 'links').getByRole('link', { name: 'Button', exact: true })).toHaveCount(1);
    expect(await css(row(page, 'links', 0), 'text-decoration-line')).toBe('none');
    expect((await bounds(row(page, 'links', 0))).height).toBe((await bounds(row(page, 'interactive', 0))).height);
    await expect.poll(() => drawn(page, 'links', 0)).toEqual(await expected(page, 'unselected'));
    await tabTo(page, row(page, 'links', 0));
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('Source');
    await page.keyboard.press('End');
    expect(await focused(page)).toBe('Archive');
  });

  test('LST-27: a link item emits its click once for a pointer and for Enter and follows href; a cancelled click opens nothing; Space emits no click', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [links] });
    await expectLinkActivation(page, item(page, 'links', 0));
  });

  test('LST-28: a link item that opens a new context draws open_in_new at its end, hidden, mirrored in right-to-left, and is described by targetLabel; an empty one is reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, fixtures: [links, byId('links-rtl')] });
    const source = item(page, 'links', 1);
    expect(await anchorOf(source)).toMatchObject({ tag: 'a', target: '_blank', rel: 'noopener', description: 'opens in a new tab' });
    const mark = (await markOf(source, '.new-context'))!;
    expect(mark.glyph).toBe('open_in_new');
    expect(mark.hidden).toBe(true);
    expect(mark.width).toBe(await resolveToken(page, '--tanrei-sys-icon-small'));
    expect(mark.color).toBe(await resolveColor(page, T('unselected-content-color')));
    expect(await markOf(item(page, 'links', 0), '.new-context')).toBeNull();
    const rtl = (await markOf(item(page, 'links-rtl', 1), '.new-context'))!;
    expect(rtl.transform).toBe(MIRRORED);
    await expectTargetLabel(page, source, seen, 'LST-28', {});
    await expectNewContext(page, source);
  });

  test('LST-29: a disabled link item is an anchor without href — the link role, disabled — reached by the arrow keys, opening nothing, drawn as a disabled interactive item', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [links] });
    await expectDisabledLink(page, item(page, 'links', 2));
    await expect.poll(() => drawn(page, 'links', 2)).toEqual(await expected(page, 'unselected', 'disabled'));
  });

  test('LST-30: a selectable list ignores href, target and targetLabel and reports an option that has one; a javascript: address and one that cannot be read are refused and reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [fixture('options', { selection: 'single', label: 'Theme', value: 'a' }, [['A', { value: 'a', href: '/a/' }], ['B', { value: 'b' }]]), fixture('plain', {}, [['Somewhere', { href: '/somewhere/' }]])],
    });
    await expect(list(page, 'options').getByRole('link')).toHaveCount(0);
    await expect(item(page, 'options', 0)).toHaveAttribute('role', 'option');
    await expect.poll(() => seen.filter((w) => w.includes('(LST-30)')).length).toBeGreaterThan(0);
    await expectRefusals(page, item(page, 'plain', 0), seen, 'LST-30', { tag: 'div' });
  });
});

// ── Reordering ───────────────────────────────────────────────────────────────────────────────────────────────────────
// The test is the product: it gives the words, answers `move` by reordering its own items, and removes one.
const WORDS = byId('reorderable').props;
const NAMES = ['Inter', 'Noto Sans JP', 'Helvetica Neue'];
const order = (page: P, id: string) => list(page, id).evaluate((el) => [...el.querySelectorAll('tanrei-list-item')].map((each) => (each as any).name as string));
const announced = (page: P, id: string) => list(page, id).evaluate((el) => el.shadowRoot!.querySelector('.announcer')?.textContent ?? null);
const moves = (page: P) => page.evaluate(() => ((window as any).moves ?? []) as { from: number; to: number }[]);
/** The product's answer to `move`: it moves the element it has — at once, after `delay` ms, or never. */
const product = (page: P, id: string, delay: number | 'ignore' | 'replace' = 0) =>
  list(page, id).evaluate(
    (el, delay) => {
      const log = ((window as any).moves ??= [] as unknown[]);
      el.addEventListener('move', (event) => {
        const { from, to } = (event as CustomEvent).detail;
        log.push({ from, to });
        if (delay === 'ignore') return;
        const apply = () => {
          const items = [...el.querySelectorAll('tanrei-list-item')];
          if (delay === 'replace') {
            const html = items.map((each) => each.outerHTML);
            html.splice(to, 0, html.splice(from, 1)[0]);
            el.innerHTML = html.join('');
          } else el.insertBefore(items[from], items[to > from ? to + 1 : to] ?? null);
        };
        if (delay) setTimeout(apply, delay as number);
        else apply();
      });
    },
    delay as number | string,
  );
/** Whether the item's move menu is open (it is drawn the first time it opens). */
const menuOpen = (target: Locator) => target.evaluate((el) => !!el.shadowRoot!.querySelector('tanrei-menu[open]'));
const reorderWindow = (page: P) => resolveToken(page, T('motion-reorder-duration'), 'duration');
/** Presses the pointer on the item's content and drags by (dx, dy) in steps, without releasing. */
async function dragBy(page: P, target: Locator, dx: number, dy: number) {
  await target.scrollIntoViewIfNeeded();
  const b = await bounds(target);
  const x = b.x + b.width - 12;
  const y = b.y + b.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + Math.sign(dx) * 2, y + Math.sign(dy) * 12, { steps: 2 });
  await page.mouse.move(x + dx, y + dy, { steps: 8 });
}

test.describe('reordering', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: spec.fixtures.filter((f) => f.id.startsWith('reorderable')) });
  });

  test('LST-31: a reorderable list draws a handle in every item and makes every item static, reporting one that asks to be a button or a link; a selectable list is never reorderable, reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [fixture('mixed', { reorderable: true, ...WORDS }, [['A', { interactive: true }], ['B', { href: '/b/' }]]), fixture('chosen', { reorderable: true, selection: 'single', label: 'X', value: 'a' }, [['A', { value: 'a' }], ['B', { value: 'b' }]])],
    });
    await expect(item(page, 'mixed', 0).locator('.handle')).toHaveCount(1);
    await expect(list(page, 'mixed').getByRole('link')).toHaveCount(0);
    expect(await row(page, 'mixed', 0).getAttribute('role')).toBeNull();
    await expect.poll(() => seen.filter((w) => w.includes('(LST-31)')).length).toBe(3);
    await expect(item(page, 'chosen', 0).locator('.handle')).toHaveCount(0);
    await expect(item(page, 'chosen', 0)).toHaveAttribute('role', 'option');
  });

  test('LST-32: the handle — an icon-only text Button at small size showing drag_indicator, at the start, container.gap before the content, centred — named by dragHandleLabel with the item’s name, described by dragHandleHint, a menu button; disabled for one item; its own Tab stop', async ({ page, browserName }) => {
    const h = handle(page, 'reorderable', 1);
    await expect(h).toHaveAttribute('variant', 'text');
    await expect(h).toHaveAttribute('size', 'small');
    expect((await h.locator('.handle-glyph').textContent())?.trim()).toBe('drag_indicator');
    const hb = await bounds(h);
    const content = await bounds(item(page, 'reorderable', 1).locator('.content').first());
    const own = await bounds(item(page, 'reorderable', 1));
    expect(hb.x).toBe(own.x);
    expect(content.x - (hb.x + hb.width)).toBeCloseTo(await resolveToken(page, T('container-gap')), 1);
    expect(hb.y + hb.height / 2).toBeCloseTo(own.y + own.height / 2, 0);
    const button = list(page, 'reorderable').getByRole('button', { name: 'Reorder Noto Sans JP' });
    await expect(button).toHaveCount(1);
    await expect(button).toHaveAttribute('aria-haspopup', 'menu');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(button).toHaveAccessibleDescription(String(WORDS.dragHandleHint));
    await expect(handle(page, 'reorderable-single-item', 0)).toHaveJSProperty('disabled', true);
    // Each handle is a Tab stop of its own. (WebKit's Tab passes buttons unless the system says otherwise.)
    test.skip(browserName === 'webkit', 'Tab passes buttons in WebKit');
    await tabTo(page, handle(page, 'reorderable', 0));
    await page.keyboard.press('Tab');
    expect(await focused(page)).toBe('Noto Sans JP:handle');
  });

  test('LST-33: the handle opens the move menu — four moves with their glyphs, those that move nothing disabled; choosing emits move once; Escape moves nothing; focus returns to the handle', async ({ page }) => {
    await product(page, 'reorderable', 'ignore');
    await handle(page, 'reorderable', 0).click();
    const menu = item(page, 'reorderable', 0).locator('tanrei-menu');
    await expect(menu).toHaveAttribute('open', '');
    const entries = menu.locator('tanrei-menu-item');
    expect(await entries.evaluateAll((els) => els.map((el) => [(el as any).label, (el as any).leadingIcon, (el as any).disabled]))).toEqual([
      ['Move to top', 'vertical_align_top', true],
      ['Move up', 'arrow_upward', true],
      ['Move down', 'arrow_downward', false],
      ['Move to bottom', 'vertical_align_bottom', false],
    ]);
    await page.keyboard.press('Escape');
    await expect(menu).not.toHaveAttribute('open', '');
    expect(await focused(page)).toBe('Inter:handle');
    expect(await moves(page)).toEqual([]);
    // Enter and Down Arrow open it too; choosing a move emits it once.
    await page.keyboard.press('ArrowDown');
    await expect(menu).toHaveAttribute('open', '');
    await entries.nth(3).click();
    expect(await moves(page)).toEqual([{ from: 0, to: 2 }]);
    await expect(menu).not.toHaveAttribute('open', '');
    // A line: its own glyphs.
    await handle(page, 'reorderable-wrap', 2).click();
    const line = item(page, 'reorderable-wrap', 2).locator('tanrei-menu-item');
    expect(await line.evaluateAll((els) => els.map((el) => (el as any).leadingIcon))).toEqual(['first_page', 'arrow_back', 'arrow_forward', 'last_page']);
  });

  test('LST-34, LST-35: Space lifts — dragged look, liftedText — the arrows carry it a place at a time with movedText, Space drops and emits move once; Escape puts it back with cancelledText; Tab away cancels', async ({ page }) => {
    await product(page, 'reorderable');
    await tabTo(page, handle(page, 'reorderable', 0));
    await page.keyboard.press('Space');
    await expect(item(page, 'reorderable', 0)).toHaveAttribute('data-dragged', '');
    expect(await menuOpen(item(page, 'reorderable', 0))).toBe(false);
    expect(await announced(page, 'reorderable')).toBe('Inter lifted: 1 of 3');
    await page.keyboard.press('ArrowDown');
    expect(await announced(page, 'reorderable')).toBe('Inter: 2 of 3');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    expect(await announced(page, 'reorderable')).toBe('Inter: 3 of 3');
    await page.keyboard.press('Home');
    await page.keyboard.press('End');
    expect(await moves(page)).toEqual([]);
    await page.keyboard.press('Space');
    expect(await moves(page)).toEqual([{ from: 0, to: 2 }]);
    await expect.poll(() => order(page, 'reorderable')).toEqual(['Noto Sans JP', 'Helvetica Neue', 'Inter']);
    await expect(item(page, 'reorderable', 2)).not.toHaveAttribute('data-dragged');
    await expect.poll(() => focused(page)).toBe('Inter:handle');
    // Escape: back, cancelledText, nothing emitted.
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Escape');
    expect(await announced(page, 'reorderable')).toBe('Inter returned to 3 of 3');
    expect(await moves(page)).toHaveLength(1);
    await expect.poll(() => item(page, 'reorderable', 1).evaluate((el) => (el as HTMLElement).style.transform)).toBe('');
    // Tab away while lifted: back.
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Tab');
    await expect.poll(() => announced(page, 'reorderable')).toBe('Inter returned to 3 of 3');
    expect(await moves(page)).toHaveLength(1);
    // Escape reaches nothing else while lifted.
    await tabTo(page, handle(page, 'reorderable', 2));
    let escaped = false;
    await page.exposeFunction('escaped', () => (escaped = true));
    await page.evaluate(() => document.addEventListener('keydown', (e) => e.key === 'Escape' && (window as any).escaped()));
    await page.keyboard.press('Space');
    await page.keyboard.press('Escape');
    expect(escaped).toBe(false);
  });

  test('LST-34: in a wrapping list the arrows along the lines move in reading order and the arrows across them to the nearest place of the next line', async ({ page }) => {
    await product(page, 'reorderable-wrap');
    await list(page, 'reorderable-wrap').evaluate((el) => (el.style.inlineSize = '300px'));
    const perLine = await list(page, 'reorderable-wrap').evaluate((el) => {
      const items = [...el.querySelectorAll('tanrei-list-item')];
      return items.filter((each) => Math.round(each.getBoundingClientRect().top) === Math.round(items[0].getBoundingClientRect().top)).length;
    });
    await tabTo(page, handle(page, 'reorderable-wrap', 0));
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    expect(await announced(page, 'reorderable-wrap')).toBe(`Photo 1: ${perLine + 1} of 5`);
    await page.keyboard.press('ArrowLeft');
    expect(await announced(page, 'reorderable-wrap')).toBe(`Photo 1: ${perLine} of 5`);
    await page.keyboard.press('Enter');
    expect(await moves(page)).toEqual([{ from: 0, to: perLine - 1 }]);
  });

  test('LST-36, LST-37, LST-38, LST-39: a mouse drags the whole item past the slop; it is drawn dragged and follows the pointer along the axis; neighbours slide aside; release emits move once and the product’s order is drawn without a jump', async ({ page }) => {
    await product(page, 'reorderable');
    await list(page, 'reorderable').scrollIntoViewIfNeeded();
    const [first, third] = [await bounds(item(page, 'reorderable', 0)), await bounds(item(page, 'reorderable', 2))];
    const distance = third.y - first.y + 4;
    await dragBy(page, item(page, 'reorderable', 0).locator('.content').first(), 40, distance);
    await expect(item(page, 'reorderable', 0)).toHaveAttribute('data-dragged', '');
    await expect(list(page, 'reorderable')).toHaveAttribute('data-pointer-carrying', '');
    // Along the axis only: no move across it.
    const lifted = await bounds(item(page, 'reorderable', 0));
    expect(lifted.x).toBeCloseTo(first.x, 0);
    expect(lifted.y).toBeGreaterThan(first.y + 10);
    const dragged = await resolveColor(page, T('dragged-container-color'));
    await expect.poll(() => css(row(page, 'reorderable', 0), 'background-color')).toBe(dragged);
    expect(await css(row(page, 'reorderable', 0), 'box-shadow')).not.toBe('none');
    // The neighbours slid toward the start, over the reorder motion.
    const duration = await reorderWindow(page);
    expect(await item(page, 'reorderable', 1).evaluate((el) => (el as HTMLElement).style.transition)).toContain(`${duration}ms`);
    await expect.poll(async () => (await bounds(item(page, 'reorderable', 2))).y).toBeLessThan(third.y - 10);
    expect(await moves(page), 'nothing during a drag').toEqual([]);
    await page.mouse.up();
    expect(await moves(page)).toEqual([{ from: 0, to: 2 }]);
    await expect.poll(() => order(page, 'reorderable')).toEqual(['Noto Sans JP', 'Helvetica Neue', 'Inter']);
    await expect(item(page, 'reorderable', 2)).not.toHaveAttribute('data-dragged');
    await expect.poll(() => announced(page, 'reorderable')).toBe('Inter: 3 of 3');
    await page.waitForTimeout(duration + 100);
    expect((await bounds(item(page, 'reorderable', 2))).y).toBeCloseTo(third.y, 0);
    // A drop where it began emits nothing.
    await dragBy(page, item(page, 'reorderable', 0).locator('.content').first(), 0, 6);
    await page.mouse.up();
    expect(await moves(page)).toHaveLength(1);
    // A press on the handle that does not move opens the menu; one that drags does not.
    await dragBy(page, handle(page, 'reorderable', 0), 0, distance);
    await page.mouse.up();
    expect(await menuOpen(item(page, 'reorderable', 2))).toBe(false);
    expect(await moves(page)).toHaveLength(2);
  });

  test('LST-36: a press on an interactive element of the content is that element’s; another mouse button lifts nothing; a disabled handle lifts nothing', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('controls', { reorderable: true, ...WORDS }, [['A <button class="remove">Remove</button>'], ['B'], ['C']]), byId('reorderable-single-item')] });
    await product(page, 'controls');
    await dragBy(page, item(page, 'controls', 0).locator('.remove'), 0, 80);
    await expect(item(page, 'controls', 0)).not.toHaveAttribute('data-dragged');
    await page.mouse.up();
    const b = await bounds(item(page, 'controls', 0).locator('.content').first());
    await page.mouse.move(b.x + 4, b.y + 4);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(b.x + 4, b.y + 80, { steps: 6 });
    await expect(item(page, 'controls', 0)).not.toHaveAttribute('data-dragged');
    await page.mouse.up({ button: 'right' });
    await dragBy(page, item(page, 'reorderable-single-item', 0).locator('.content').first(), 0, 40);
    await expect(item(page, 'reorderable-single-item', 0)).not.toHaveAttribute('data-dragged');
    await page.mouse.up();
    expect(await moves(page)).toEqual([]);
  });

  test('LST-36: a touch lifts after a long press held within the slop, or at once from the handle; a touch that moves sooner lifts nothing', async ({ browser, browserName }) => {
    test.skip(browserName !== 'chromium', 'touch is dispatched over the DevTools protocol');
    const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 420, height: 800 }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    await mountFixtures(page, spec, { fixtures: [byId('reorderable')] });
    await product(page, 'reorderable');
    const cdp = await context.newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    const first = await bounds(item(page, 'reorderable', 0).locator('.content').first());
    const third = await bounds(item(page, 'reorderable', 2));
    const [x, y] = [first.x + first.width - 20, first.y + first.height / 2];
    // A swipe: no lift.
    await touch('touchStart', x, y);
    await touch('touchMove', x, y + 30);
    await expect(item(page, 'reorderable', 0)).not.toHaveAttribute('data-dragged');
    await touch('touchEnd', x, y + 30);
    // A long press: lifted after the platform's duration, then carried.
    await touch('touchStart', x, y);
    await page.waitForTimeout(650);
    await expect(item(page, 'reorderable', 0)).toHaveAttribute('data-dragged', '');
    for (let step = 1; step <= 6; step++) await touch('touchMove', x, y + ((third.y - first.y + 8) * step) / 6);
    await touch('touchEnd', x, third.y + 8);
    await expect.poll(() => moves(page)).toEqual([{ from: 0, to: 2 }]);
    // From the handle: at once, past the slop.
    const h = await bounds(handle(page, 'reorderable', 0));
    await touch('touchStart', h.x + h.width / 2, h.y + h.height / 2);
    await touch('touchMove', h.x + h.width / 2, h.y + h.height / 2 + 12);
    await expect(item(page, 'reorderable', 0)).toHaveAttribute('data-dragged', '');
    await touch('touchEnd', h.x + h.width / 2, h.y + h.height / 2 + 12);
    await context.close();
  });

  test('LST-37: never past the list’s own box; in a wrapping list the item follows the pointer in both directions', async ({ page }) => {
    await list(page, 'reorderable').scrollIntoViewIfNeeded();
    const box = await bounds(list(page, 'reorderable'));
    await dragBy(page, item(page, 'reorderable', 0).locator('.content').first(), 0, -200);
    expect((await bounds(item(page, 'reorderable', 0))).y).toBeGreaterThanOrEqual(box.y - 0.5);
    await page.mouse.move(400, 2000, { steps: 4 });
    const lifted = await bounds(item(page, 'reorderable', 0));
    expect(lifted.y + lifted.height).toBeLessThanOrEqual(box.y + box.height + 0.5);
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await list(page, 'reorderable-wrap').scrollIntoViewIfNeeded();
    const p1 = await bounds(item(page, 'reorderable-wrap', 0));
    await dragBy(page, item(page, 'reorderable-wrap', 0).locator('.content').first(), 30, 40);
    const moved = await bounds(item(page, 'reorderable-wrap', 0));
    expect(moved.x).toBeGreaterThan(p1.x + 10);
    expect(moved.y).toBeGreaterThan(p1.y + 10);
    await page.keyboard.press('Escape');
    await page.mouse.up();
  });

  test('LST-38: in a wrapping list the place is the nearest of those the items had, and the items between move into their neighbours’ places', async ({ page }) => {
    await product(page, 'reorderable-wrap');
    await list(page, 'reorderable-wrap').scrollIntoViewIfNeeded();
    const places = await Promise.all([0, 1, 2, 3, 4].map((n) => bounds(item(page, 'reorderable-wrap', n))));
    await dragBy(page, item(page, 'reorderable-wrap', 0).locator('.content').first(), places[3].x - places[0].x, places[3].y - places[0].y);
    await page.waitForTimeout((await reorderWindow(page)) + 100);
    const second = await bounds(item(page, 'reorderable-wrap', 1));
    expect(second.x).toBeCloseTo(places[0].x, 0);
    expect(second.y).toBeCloseTo(places[0].y, 0);
    await page.mouse.up();
    expect(await moves(page)).toEqual([{ from: 0, to: 3 }]);
  });

  test('LST-38: near the edge of the scrolling ancestor the list scrolls it, the faster the nearer', async ({ page }) => {
    await page.locator('[data-fixture="reorderable"]').evaluate((stage) => {
      const scroller = document.createElement('div');
      scroller.className = 'scroller';
      scroller.style.cssText = 'block-size: 80px; overflow: auto;';
      stage.before(scroller);
      scroller.append(stage);
    });
    const scroller = page.locator('.scroller');
    const b = await bounds(scroller);
    await dragBy(page, item(page, 'reorderable', 0).locator('.content').first(), 0, 20);
    await page.mouse.move(b.x + 200, b.y + b.height - 4, { steps: 3 });
    await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await page.keyboard.press('Escape');
    await page.mouse.up();
  });

  test('LST-40: Escape, a cancelled pointer or a loss of focus puts a dragged item back with its neighbours, emitting and announcing nothing; Escape reaches nothing else', async ({ page }) => {
    await product(page, 'reorderable');
    let escaped = false;
    await page.exposeFunction('escaped', () => (escaped = true));
    await page.evaluate(() => document.body.addEventListener('keydown', (e) => e.key === 'Escape' && (window as any).escaped()));
    await list(page, 'reorderable').scrollIntoViewIfNeeded();
    const third = await bounds(item(page, 'reorderable', 2));
    await dragBy(page, item(page, 'reorderable', 0).locator('.content').first(), 0, 120);
    await page.keyboard.press('Escape');
    expect(escaped).toBe(false);
    await expect(item(page, 'reorderable', 0)).not.toHaveAttribute('data-dragged');
    await page.mouse.up();
    await page.waitForTimeout((await reorderWindow(page)) + 100);
    expect((await bounds(item(page, 'reorderable', 2))).y).toBeCloseTo(third.y, 0);
    expect(await moves(page)).toEqual([]);
    expect(await announced(page, 'reorderable')).toBe('');
    // The window loses focus: back.
    await dragBy(page, item(page, 'reorderable', 0).locator('.content').first(), 0, 120);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await expect(item(page, 'reorderable', 0)).not.toHaveAttribute('data-dragged');
    await page.mouse.up();
    // The product changes the items: back.
    await dragBy(page, item(page, 'reorderable', 0).locator('.content').first(), 0, 120);
    await list(page, 'reorderable').evaluate((el) => el.append(document.createElement('tanrei-list-item')));
    await expect(item(page, 'reorderable', 0)).not.toHaveAttribute('data-dragged');
    await page.mouse.up();
    expect(await moves(page)).toEqual([]);
  });

  test('LST-41: an order the product changes is drawn from the old places to the new over the reorder motion, in both directions in a wrapping list; a new item appears at once', async ({ page }) => {
    const duration = await reorderWindow(page);
    await page.waitForTimeout(100);
    const before = await bounds(item(page, 'reorderable-wrap', 0));
    await list(page, 'reorderable-wrap').evaluate((el) => el.append(el.firstElementChild!));
    const motion = await item(page, 'reorderable-wrap', 4).evaluate((el) => el.getAnimations().map((a) => (a.effect as KeyframeEffect).getTiming().duration));
    expect(motion).toEqual([duration]);
    const startFrame = await item(page, 'reorderable-wrap', 4).evaluate((el) => ((el.getAnimations()[0].effect as KeyframeEffect).getKeyframes()[0].transform as string));
    expect(startFrame).toMatch(/translate\(-?\d+(\.\d+)?px, -?\d+(\.\d+)?px\)/);
    expect(startFrame).not.toBe('translate(0px, 0px)');
    await page.waitForTimeout(duration + 50);
    expect((await bounds(item(page, 'reorderable-wrap', 4))).y).toBeGreaterThan(before.y);
    await list(page, 'reorderable').evaluate((el) => el.prepend(Object.assign(document.createElement('tanrei-list-item'), { textContent: 'New' })));
    expect(await item(page, 'reorderable', 0).evaluate((el) => el.getAnimations().length)).toBe(0);
  });

  test('LST-42: where motion is reduced, the dragged look, the neighbours, the drop and a new order are drawn at once — the item still follows the pointer', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await product(page, 'reorderable');
    await list(page, 'reorderable').scrollIntoViewIfNeeded();
    const first = await bounds(item(page, 'reorderable', 0));
    const third = await bounds(item(page, 'reorderable', 2));
    await dragBy(page, item(page, 'reorderable', 0).locator('.content').first(), 0, third.y - first.y + 4);
    expect(await item(page, 'reorderable', 1).evaluate((el) => (el as HTMLElement).style.transition)).toBe('none');
    expect((await bounds(item(page, 'reorderable', 0))).y).toBeGreaterThan(first.y + 10);
    expect(await css(row(page, 'reorderable', 0), 'transition-duration')).toBe('0s');
    await page.mouse.up();
    await expect.poll(() => order(page, 'reorderable')).toEqual(['Noto Sans JP', 'Helvetica Neue', 'Inter']);
    expect(await item(page, 'reorderable', 2).evaluate((el) => el.getAnimations().length)).toBe(0);
  });

  test('LST-43: after a move focus stays on the moved item’s handle, also when the product gives a new element; a move the product ignores is taken as refused — nothing announced', async ({ page }) => {
    await product(page, 'reorderable', 'replace');
    await tabTo(page, handle(page, 'reorderable', 0));
    await page.keyboard.press('ArrowDown');
    await item(page, 'reorderable', 0).locator('tanrei-menu-item').nth(2).click();
    await expect.poll(() => order(page, 'reorderable')).toEqual(['Noto Sans JP', 'Inter', 'Helvetica Neue']);
    await expect.poll(() => focused(page)).toBe('Inter:handle');
    expect(await announced(page, 'reorderable')).toBe('Inter: 2 of 3');
    // Refused.
    await mountFixtures(page, spec, { fixtures: [byId('reorderable')] });
    await product(page, 'reorderable', 'ignore');
    await tabTo(page, handle(page, 'reorderable', 0));
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');
    await page.waitForTimeout((await reorderWindow(page)) * 2 + 100);
    expect(await order(page, 'reorderable')).toEqual(NAMES);
    expect(await item(page, 'reorderable', 1).evaluate((el) => (el as HTMLElement).style.transform)).toBe('');
    expect(await focused(page)).toBe('Inter:handle');
    // A product that answers late, within the window, is still answered.
    await mountFixtures(page, spec, { fixtures: [byId('reorderable')] });
    await product(page, 'reorderable', 60);
    await tabTo(page, handle(page, 'reorderable', 2));
    await page.keyboard.press('Space');
    await page.keyboard.press('Home');
    await page.keyboard.press('Space');
    await expect.poll(() => announced(page, 'reorderable')).toBe('Helvetica Neue: 1 of 3');
  });

  test('LST-44: one polite live region, empty at rest and drawn nowhere; the places are filled wherever and however often written, the name isolated; another text in braces stays and is reported', async ({ page }) => {
    const seen = warnings(page);
    const region = list(page, 'reorderable').locator('.announcer');
    await expect(region).toHaveAttribute('role', 'status');
    await expect(region).toHaveAttribute('aria-live', 'polite');
    expect(await announced(page, 'reorderable')).toBe('');
    expect((await bounds(region)).width).toBeLessThanOrEqual(1);
    await list(page, 'reorderable').evaluate((el) => ((el as any).liftedText = '{label} ({position}/{count}) {label} {odd} {{x}}'));
    await tabTo(page, handle(page, 'reorderable', 1));
    await page.keyboard.press('Space');
    expect(await announced(page, 'reorderable')).toBe('Noto Sans JP (2/3) Noto Sans JP {odd} {x}');
    expect(await region.locator('bdi').count()).toBe(2);
    await page.keyboard.press('Escape');
    await expect.poll(() => seen.filter((w) => w.includes('(LST-44)')).length).toBeGreaterThan(0);
    // A pointer lift says nothing.
    await dragBy(page, item(page, 'reorderable', 0).locator('.content').first(), 0, 20);
    expect(await announced(page, 'reorderable')).toBe('Noto Sans JP returned to 2 of 3');
    await page.keyboard.press('Escape');
    await page.mouse.up();
  });

  test('LST-45: forced colors — a dragged item on the background with a hairline in the highlight color; dividers in the text color', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    const forced = await page.evaluate(() => matchMedia('(forced-colors: active)').matches);
    test.skip(!forced, 'forced colors are not emulated by this browser');
    await tabTo(page, handle(page, 'reorderable', 0));
    await page.keyboard.press('Space');
    expect(await css(row(page, 'reorderable', 0), 'outline-style')).toBe('solid');
    expect(await css(row(page, 'reorderable', 0), 'box-shadow')).toBe('none');
    await page.keyboard.press('Escape');
  });

  test('LST-46: when the product removes the item whose handle has focus, focus goes to the handle of the item in its place, else of the one before; nothing is announced; the product’s control comes after the handle', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('removable', { reorderable: true, ...WORDS }, NAMES.map((name) => [`${name} <button class="remove">Remove ${name}</button>`, { label: name }] as [string, Props]))] });
    // (WebKit's Tab passes buttons unless the system says otherwise.)
    if (browserName !== 'webkit') {
      await tabTo(page, handle(page, 'removable', 0));
      await page.keyboard.press('Tab');
      await expect(list(page, 'removable').getByRole('button', { name: 'Remove Inter', exact: true })).toBeFocused();
    }
    // Focus on the product's control of an item that is removed goes to the handle in its place too.
    await list(page, 'removable').getByRole('button', { name: 'Remove Inter', exact: true }).focus();
    await item(page, 'removable', 0).evaluate((el) => el.remove());
    await expect.poll(() => focused(page)).toBe('Noto Sans JP:handle');
    await list(page, 'removable').evaluate((el) => el.prepend(Object.assign(document.createElement('tanrei-list-item'), { label: 'Inter', innerHTML: 'Inter' })));
    await handle(page, 'removable', 1).focus();
    await item(page, 'removable', 1).evaluate((el) => el.remove());
    await expect.poll(() => focused(page)).toBe('Helvetica Neue:handle');
    await item(page, 'removable', 1).evaluate((el) => el.remove());
    await expect.poll(() => focused(page)).toBe('Inter:handle');
    expect(await announced(page, 'removable')).toBe('');
  });

  test('LST-47: the words are the props, else the product’s words; a missing word is reported once; a handle label without {label} is reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [fixture('bare', { reorderable: true, label: 'Bare' }, [['A'], ['B']])] });
    await expect.poll(() => seen.filter((w) => w.includes('(LST-47)')).length).toBeGreaterThanOrEqual(7);
    await setWords(page, { dragHandleLabel: 'Sort {label}', moveToStartLabel: 'First', moveBeforeLabel: 'Earlier', moveAfterLabel: 'Later', moveToEndLabel: 'Last', liftedText: 'up', movedText: 'moved', cancelledText: 'back' });
    await expect(list(page, 'bare').getByRole('button', { name: 'Sort A' })).toHaveCount(1);
    await handle(page, 'bare', 0).click();
    expect(await item(page, 'bare', 0).locator('tanrei-menu-item').evaluateAll((els) => els.map((el) => (el as any).label))).toEqual(['First', 'Earlier', 'Later', 'Last']);
    await list(page, 'bare').evaluate((el) => ((el as any).dragHandleLabel = 'Sort'));
    await expect.poll(() => seen.filter((w) => w.includes('(LST-47)') && w.includes('{label}')).length).toBe(1);
  });

  test('accessibility of the reorderable fixtures: no axe violations in light and dark, the menu open included', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true, fixtures: spec.fixtures.filter((f) => f.id.startsWith('reorderable')) });
      await handle(page, 'reorderable', 0).click();
      await page.waitForTimeout(300);
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
    }
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true });
      await page.waitForTimeout(300);
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
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
