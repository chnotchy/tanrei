// <tanrei-split-view>, driven by specs/split-view.spec.json: every behaviour id (SPV-1…16) is cited by a test title,
// every fixture has a baseline, and every value is read back from the tokens. The handle is the Handle's own (its tests
// hold how it is drawn and how it takes a drag and a key); these hold what the split view does with it.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { bounds, css, warnings } from '../../../test/destinations.js';
import { type Fixture, loadSpec, mountFixtureAsInAll, mountFixtures, resolveColor, resolveToken, tab, tabTo } from '../../../test/harness.js';
import { resolveEasing } from '../../../test/appear.js';
import { motionEnded } from '../../../test/motions.js';
import { transitionsRun, watchTransitions } from '../../../test/transitions.js';

const spec = loadSpec('split-view');
type P = Page;
const T = (name: string) => `--tanrei-comp-split-view-${name}`;
const fixtureOf = (id: string) => spec.fixtures.find((f) => f.id === id)!;
/** A fixture of the split view, named "Resize the list", its panes "List" and "Detail"; a prop given as null is left unset. */
const fx = (id: string, props: Record<string, Fixture['props'][string] | null> = {}, extra: Partial<Fixture> = {}): Fixture => ({
  id,
  props: Object.fromEntries(Object.entries({ label: 'Resize the list', ...props }).filter(([, value]) => value !== null)) as Fixture['props'],
  slots: { start: 'List', end: 'Detail' },
  ...extra,
});

const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-split-view`);
const pane = (page: P, id: string, side: 'start' | 'end') => host(page, id).locator(`.pane[part="${side}-pane"]`);
const divider = (page: P, id: string) => host(page, id).locator('.divider');
const handle = (page: P, id: string) => host(page, id).locator('tanrei-handle');
const separator = (page: P, id: string) => handle(page, id).locator('[role="separator"]');
const px = (page: P, name: string) => resolveToken(page, name);
const ms = (page: P, name: string) => resolveToken(page, name, 'duration');
const centreOf = async (locator: Locator) => {
  const b = await bounds(locator);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
/** The region's size along the axis less the divider: what a share counts against. */
const region = async (page: P, id: string, vertical = false) => {
  const whole = await bounds(host(page, id));
  const line = await bounds(divider(page, id));
  return vertical ? whole.height - line.height : whole.width - line.width;
};
/** A pane's size along the axis. */
const sizeOf = async (page: P, id: string, side: 'start' | 'end', vertical = false) => {
  const b = await bounds(pane(page, id, side));
  return vertical ? b.height : b.width;
};
const valueOf = (page: P, id: string): Promise<number> => host(page, id).evaluate((el: any) => el.value);

async function mount(page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) {
  await mountFixtures(page, spec, { fixtures, ...options });
}

/** Every event the split views of the page emit, in order, with its detail. */
const listen = (page: P) =>
  page.evaluate(() => {
    const log: string[] = ((window as any).log = []);
    for (const el of document.querySelectorAll('tanrei-split-view')) {
      for (const type of ['resize', 'change', 'toggle']) el.addEventListener(type, (e) => log.push(`${type} ${JSON.stringify((e as CustomEvent).detail)}`));
    }
  });
const log = (page: P): Promise<string[]> => page.evaluate(() => (window as any).log);
const clear = (page: P) => page.evaluate(() => ((window as any).log.length = 0));

/** A drag of the handle by `dx`, `dy` from its centre, in `steps` moves. */
async function drag(page: P, target: Locator, dx: number, dy: number, steps = 6) {
  const c = await centreOf(target);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) await page.mouse.move(c.x + (dx * i) / steps, c.y + (dy * i) / steps);
  await page.mouse.up();
}

/** The motions of the primary pane's own size that have started since `watchTransitions()` on it, read two frames later. */
async function sizeMotions(target: Locator) {
  await target.page().evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  return (await transitionsRun(target)).filter((run) => run.own && /^(inline-size|block-size|width|height)$/.test(run.property));
}

/** A button put at the end of a pane's content, to find in the focus order. */
const addButton = (page: P, id: string, side: 'start' | 'end', text: string) =>
  host(page, id).evaluate(
    (el, [slot, words]) => {
      const button = document.createElement('button');
      button.textContent = words;
      el.querySelector(`[slot="${slot}"]`)!.append(button);
    },
    [side, text] as const,
  );

const away = (page: P) => page.mouse.move(1, 1);
/** The share a distance of `distance` pixels moves the divider by, as the split view counts it. */
const tidy = (share: number) => Math.round(share * 100) / 100;

test.describe('the layout', () => {
  test('SPV-1: side by side, the start pane at the inline-start is its share of the region less the divider, the end pane the rest, the divider divider.width in divider.color across the region', async ({ page }) => {
    await mount(page, [fixtureOf('horizontal'), fx('wide', { value: 30 })]);
    const width = await px(page, T('divider-width'));
    expect(width).toBeGreaterThan(0);
    const whole = await bounds(host(page, 'horizontal'));
    const line = await bounds(divider(page, 'horizontal'));
    expect(line.width).toBeCloseTo(width, 1);
    expect(line.height).toBeCloseTo(whole.height, 1);
    await expect(divider(page, 'horizontal')).toHaveCSS('background-color', await resolveColor(page, T('divider-color')));
    const room = await region(page, 'horizontal');
    expect(await sizeOf(page, 'horizontal', 'start')).toBeCloseTo(room / 2, 0);
    expect(await sizeOf(page, 'horizontal', 'end')).toBeCloseTo(room / 2, 0);
    const start = await bounds(pane(page, 'horizontal', 'start'));
    expect(start.x).toBeCloseTo(whole.x, 1);
    expect(line.x).toBeCloseTo(start.x + start.width, 1);
    expect(await sizeOf(page, 'wide', 'start')).toBeCloseTo((await region(page, 'wide')) * 0.3, 0);
    // The panes draw nothing of their own and clip their content.
    for (const side of ['start', 'end'] as const) {
      await expect(pane(page, 'horizontal', side)).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      expect(['clip', 'hidden']).toContain(await css(pane(page, 'horizontal', side), 'overflow-x'));
    }
  });

  test('SPV-1: one above the other, the start pane on top is its share of the height less the divider; content larger than a pane is clipped to it', async ({ page }) => {
    await mount(page, [fixtureOf('vertical')]);
    const room = await region(page, 'vertical', true);
    expect(await sizeOf(page, 'vertical', 'start', true)).toBeCloseTo(room * 0.6, 0);
    expect(await sizeOf(page, 'vertical', 'end', true)).toBeCloseTo(room * 0.4, 0);
    const line = await bounds(divider(page, 'vertical'));
    expect(line.height).toBeCloseTo(await px(page, T('divider-width')), 1);
    expect(line.width).toBeCloseTo((await bounds(host(page, 'vertical'))).width, 1);
    const top = await bounds(pane(page, 'vertical', 'start'));
    expect(line.y).toBeCloseTo(top.y + top.height, 1);
    await host(page, 'vertical').evaluate((el) => (el.querySelector('[slot="start"]') as HTMLElement).style.setProperty('block-size', '900px'));
    expect(await sizeOf(page, 'vertical', 'start', true)).toBeCloseTo(room * 0.6, 0);
  });
});

test.describe('the handle', () => {
  test('SPV-2: one medium Handle with the axis of the split, centred on the divider, a separator whose value is the share and whose least and greatest are min and max', async ({ page }) => {
    await mount(page, [fixtureOf('horizontal'), fixtureOf('vertical'), fixtureOf('collapsed')]);
    await expect(handle(page, 'horizontal')).toHaveCount(1);
    await expect(handle(page, 'horizontal')).toHaveAttribute('axis', 'horizontal');
    await expect(handle(page, 'horizontal')).toHaveAttribute('size', 'medium');
    await expect(handle(page, 'vertical')).toHaveAttribute('axis', 'vertical');
    const line = await centreOf(divider(page, 'horizontal'));
    const h = await centreOf(handle(page, 'horizontal'));
    expect(h.x).toBeCloseTo(line.x, 0);
    expect(h.y).toBeCloseTo(line.y, 0);
    const v = await centreOf(handle(page, 'vertical'));
    const vline = await centreOf(divider(page, 'vertical'));
    expect(v.y).toBeCloseTo(vline.y, 0);
    await expect(separator(page, 'horizontal')).toHaveAttribute('aria-valuenow', '50');
    await expect(separator(page, 'horizontal')).toHaveAttribute('aria-valuemin', '10');
    await expect(separator(page, 'horizontal')).toHaveAttribute('aria-valuemax', '90');
    await expect(separator(page, 'horizontal')).toHaveAttribute('aria-label', 'Resize the message list');
    await expect(separator(page, 'vertical')).toHaveAttribute('aria-valuenow', '60');
    // Collapsible: the least is 0, where the pane is folded away.
    await expect(separator(page, 'collapsed')).toHaveAttribute('aria-valuemin', '0');
  });

  test('SPV-2: the Handle controls the primary pane, and moves to the other pane when primary changes', async ({ page }) => {
    await mount(page, [fixtureOf('horizontal')]);
    const controls = () =>
      separator(page, 'horizontal').evaluate((el) => {
        const named = (el as Element & { ariaControlsElements?: readonly Element[] | null }).ariaControlsElements ?? [];
        return named.map((node) => node.getAttribute('part'));
      });
    expect(await controls()).toEqual(['start-pane']);
    await host(page, 'horizontal').evaluate((el: any) => (el.primary = 'end'));
    await expect.poll(controls).toEqual(['end-pane']);
  });

  test('SPV-2: the Handle stands between the start pane’s content and the end pane’s in the focus order, and its target reaches over both panes', async ({ page }) => {
    await mount(page, [fixtureOf('horizontal')]);
    await addButton(page, 'horizontal', 'start', 'In the list');
    await addButton(page, 'horizontal', 'end', 'In the detail');
    await tabTo(page, host(page, 'horizontal').locator('[slot="start"] button'));
    await tab(page);
    await expect(separator(page, 'horizontal')).toBeFocused();
    await tab(page);
    await expect(host(page, 'horizontal').locator('[slot="end"] button')).toBeFocused();
    // The press lands on the handle a few pixels into either pane: its target covers them.
    const line = await centreOf(divider(page, 'horizontal'));
    for (const dx of [-6, 6]) {
      const hit = await page.evaluate(([x, y]) => {
        let el: Element | null = document.elementFromPoint(x, y);
        while (el?.shadowRoot?.elementFromPoint(x, y) && el.shadowRoot.elementFromPoint(x, y) !== el) el = el.shadowRoot.elementFromPoint(x, y);
        return el?.closest('tanrei-handle') !== null || el?.localName === 'tanrei-handle' || (el?.getRootNode() as ShadowRoot)?.host?.localName === 'tanrei-handle';
      }, [line.x + dx, line.y] as const);
      expect(hit, `${dx}`).toBe(true);
    }
  });
});

test.describe('a drag', () => {
  test('SPV-3: a drag moves the divider with the press, without a motion, resize in every frame and change once; it stops at max', async ({ page }) => {
    await mount(page, [fixtureOf('horizontal')]);
    await listen(page);
    const room = await region(page, 'horizontal');
    await watchTransitions(pane(page, 'horizontal', 'start'));
    await drag(page, handle(page, 'horizontal'), 48, 0);
    const value = tidy(50 + (48 * 100) / room);
    expect(await valueOf(page, 'horizontal')).toBeCloseTo(value, 1);
    expect(await sizeOf(page, 'horizontal', 'start')).toBeCloseTo(room / 2 + 48, 0);
    const entries = await log(page);
    expect(entries.filter((e) => e.startsWith('resize')).length).toBeGreaterThan(1);
    expect(entries.filter((e) => e.startsWith('change'))).toEqual([`change ${JSON.stringify({ value: await valueOf(page, 'horizontal'), collapsed: false })}`]);
    expect(entries.at(-1)!.startsWith('change')).toBe(true);
    expect(await sizeMotions(pane(page, 'horizontal', 'start'))).toEqual([]);
    await clear(page);
    await drag(page, handle(page, 'horizontal'), 600, 0);
    expect(await valueOf(page, 'horizontal')).toBe(90);
    await expect(separator(page, 'horizontal')).toHaveAttribute('aria-valuenow', '90');
  });

  test('SPV-3: with the end pane primary, a drag toward the end gives the end pane less room', async ({ page }) => {
    await mount(page, [fixtureOf('primary-end')]);
    const room = await region(page, 'primary-end');
    await drag(page, handle(page, 'primary-end'), 48, 0);
    expect(await valueOf(page, 'primary-end')).toBeCloseTo(tidy(30 - (48 * 100) / room), 1);
    expect(await sizeOf(page, 'primary-end', 'end')).toBeCloseTo(room * 0.3 - 48, 0);
  });

  test('SPV-3: while a drag lasts an embedded document in a pane takes no pointer, and takes it again when the drag ends', async ({ page }) => {
    await mount(page, [fixtureOf('horizontal')]);
    await host(page, 'horizontal').evaluate((el) => {
      const frame = document.createElement('iframe');
      frame.title = 'Message';
      frame.srcdoc = '<p>Message</p>';
      el.querySelector('[slot="end"]')!.append(frame);
    });
    const iframe = host(page, 'horizontal').locator('iframe');
    const c = await centreOf(handle(page, 'horizontal'));
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.mouse.move(c.x + 20, c.y);
    await page.mouse.move(c.x + 40, c.y);
    await expect(iframe).toHaveCSS('pointer-events', 'none');
    await page.mouse.up();
    await expect(iframe).toHaveCSS('pointer-events', 'auto');
    expect(await iframe.evaluate((el) => el.getAttribute('style'))).toBeFalsy();
  });

  test('SPV-4: collapsible, a drag past half the least share folds the pane away, and back past it brings it back at the least share; toggle once when the drag ends', async ({ page }) => {
    await mount(page, [fx('fold', { collapsible: true, value: 30 })]);
    await listen(page);
    const room = await region(page, 'fold');
    // From 30 to 4 (below 10 / 2): folded; the value keeps 30 to come back at.
    const c = await centreOf(handle(page, 'fold'));
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.mouse.move(c.x - (26 * room) / 100, c.y, { steps: 4 });
    expect(await sizeOf(page, 'fold', 'start')).toBe(0);
    // Back to 6 (past 5): shown again at the least share, 10.
    await page.mouse.move(c.x - (24 * room) / 100, c.y, { steps: 2 });
    expect(await sizeOf(page, 'fold', 'start')).toBeCloseTo(room * 0.1, 0);
    await page.mouse.move(c.x - (27 * room) / 100, c.y, { steps: 2 });
    await page.mouse.up();
    expect(await host(page, 'fold').evaluate((el: any) => el.collapsed)).toBe(true);
    expect(await valueOf(page, 'fold')).toBe(30);
    const entries = await log(page);
    expect(entries.filter((e) => !e.startsWith('resize'))).toEqual(['toggle {"value":30,"collapsed":true}']);
    expect(entries).toContain('resize {"value":0,"collapsed":true}');
    await clear(page);
    // A drag out of the fold: from 0, 20 percent of the region.
    await drag(page, handle(page, 'fold'), (20 * room) / 100, 0);
    expect(await host(page, 'fold').evaluate((el: any) => el.collapsed)).toBe(false);
    expect(await valueOf(page, 'fold')).toBeCloseTo(20, 0);
    expect((await log(page)).filter((e) => !e.startsWith('resize')).map((e) => e.split(' ')[0])).toEqual(['change', 'toggle']);
  });
});

test.describe('keys', () => {
  test('SPV-5: arrows step by step the way they point, Shift and Page Up/Down by largeStep, Home and End to min and max, at once; change once for each', async ({ page }) => {
    await mount(page, [fixtureOf('horizontal')]);
    await listen(page);
    await tabTo(page, separator(page, 'horizontal'));
    await watchTransitions(pane(page, 'horizontal', 'start'));
    const values: number[] = [];
    for (const key of ['ArrowRight', 'Shift+ArrowRight', 'PageUp', 'ArrowLeft', 'PageDown', 'Home', 'Home', 'End']) {
      await page.keyboard.press(key);
      values.push(await valueOf(page, 'horizontal'));
    }
    expect(values).toEqual([55, 75, 55, 50, 70, 10, 10, 90]);
    expect(await log(page)).toEqual([55, 75, 55, 50, 70, 10, 90].map((value) => `change {"value":${value},"collapsed":false}`));
    expect(await sizeMotions(pane(page, 'horizontal', 'start'))).toEqual([]);
    expect(await sizeOf(page, 'horizontal', 'start')).toBeCloseTo((await region(page, 'horizontal')) * 0.9, 0);
  });

  test('SPV-5: with the end pane primary, the Right Arrow takes room from it; Home gives it its least and End its greatest', async ({ page }) => {
    await mount(page, [fixtureOf('primary-end')]);
    await tabTo(page, separator(page, 'primary-end'));
    await page.keyboard.press('ArrowRight');
    expect(await valueOf(page, 'primary-end')).toBe(25);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    expect(await valueOf(page, 'primary-end')).toBe(35);
    await page.keyboard.press('Home');
    expect(await valueOf(page, 'primary-end')).toBe(10);
    await page.keyboard.press('End');
    expect(await valueOf(page, 'primary-end')).toBe(90);
    // Vertical: the Down Arrow moves the divider down.
    await mount(page, [fixtureOf('vertical')]);
    await tabTo(page, separator(page, 'vertical'));
    await page.keyboard.press('ArrowDown');
    expect(await valueOf(page, 'vertical')).toBe(65);
    await page.keyboard.press('ArrowRight');
    expect(await valueOf(page, 'vertical')).toBe(65);
  });

  test('SPV-5: a step never folds the pane away; folded, a step that gives it room or Home brings it back at the least share, End at the greatest, and one that takes room changes nothing', async ({ page }) => {
    await mount(page, [fixtureOf('collapsed'), fx('edge', { collapsible: true, value: 10 })], { reducedMotion: true });
    await listen(page);
    await tabTo(page, separator(page, 'edge'));
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Home');
    expect(await host(page, 'edge').evaluate((el: any) => el.collapsed)).toBe(false);
    expect(await valueOf(page, 'edge')).toBe(10);
    await tabTo(page, separator(page, 'collapsed'));
    await page.keyboard.press('ArrowLeft');
    expect(await host(page, 'collapsed').evaluate((el: any) => el.collapsed)).toBe(true);
    await page.keyboard.press('ArrowRight');
    expect(await host(page, 'collapsed').evaluate((el: any) => el.collapsed)).toBe(false);
    expect(await valueOf(page, 'collapsed')).toBe(10);
    expect(await log(page)).toEqual(['toggle {"value":10,"collapsed":false}', 'change {"value":10,"collapsed":false}']);
    await host(page, 'collapsed').evaluate((el: any) => (el.collapsed = true));
    await page.keyboard.press('End');
    expect(await valueOf(page, 'collapsed')).toBe(90);
    expect(await host(page, 'collapsed').evaluate((el: any) => el.collapsed)).toBe(false);
  });
});

test.describe('a press', () => {
  test('SPV-6: collapsible, Enter folds the primary pane away and brings it back where it was, over collapse-duration with collapse-easing; toggle each time; focus stays on the Handle', async ({ page }) => {
    await mount(page, [fx('fold', { collapsible: true, value: 30 })]);
    await listen(page);
    await tabTo(page, separator(page, 'fold'));
    const duration = await ms(page, T('motion-collapse-duration'));
    const easing = await resolveEasing(page, T('motion-collapse-easing'));
    await watchTransitions(pane(page, 'fold', 'start'));
    await page.keyboard.press('Enter');
    await expect.poll(() => transitionsRun(pane(page, 'fold', 'start'))).toContainEqual({ property: 'width', pseudo: '', own: true, on: expect.any(String), duration, easing });
    await motionEnded(page);
    expect(await sizeOf(page, 'fold', 'start')).toBe(0);
    await expect(separator(page, 'fold')).toBeFocused();
    await expect(separator(page, 'fold')).toHaveAttribute('aria-valuenow', '0');
    await page.keyboard.press('Enter');
    await motionEnded(page);
    expect(await sizeOf(page, 'fold', 'start')).toBeCloseTo((await region(page, 'fold')) * 0.3, 0);
    await expect(separator(page, 'fold')).toHaveAttribute('aria-valuenow', '30');
    expect(await log(page)).toEqual(['toggle {"value":30,"collapsed":true}', 'toggle {"value":30,"collapsed":false}']);
  });

  test('SPV-6: a press without a drag folds and restores the pane too, and Space does', async ({ page }) => {
    await mount(page, [fx('fold', { collapsible: true, value: 30 })], { reducedMotion: true });
    await tabTo(page, separator(page, 'fold'));
    await page.keyboard.press('Space');
    expect(await host(page, 'fold').evaluate((el: any) => el.collapsed)).toBe(true);
    const c = await centreOf(handle(page, 'fold'));
    await page.mouse.click(c.x, c.y);
    expect(await host(page, 'fold').evaluate((el: any) => el.collapsed)).toBe(false);
    // Restored, the handle stands on the divider again, 30 percent in.
    const back = await centreOf(handle(page, 'fold'));
    expect(back.x).toBeGreaterThan(c.x);
    await page.mouse.click(back.x, back.y);
    expect(await host(page, 'fold').evaluate((el: any) => el.collapsed)).toBe(true);
  });

  test('SPV-7: not collapsible, a press moves the divider to resetValue and the next one back, over collapse-duration; at resetValue with nothing to go back to, it changes nothing', async ({ page }) => {
    await mount(page, [fx('reset', { value: 35 })]);
    await listen(page);
    await tabTo(page, separator(page, 'reset'));
    await watchTransitions(pane(page, 'reset', 'start'));
    await page.keyboard.press('Enter');
    const duration = await ms(page, T('motion-collapse-duration'));
    await expect.poll(async () => (await transitionsRun(pane(page, 'reset', 'start'))).map((run) => run.duration)).toContain(duration);
    await motionEnded(page);
    expect(await valueOf(page, 'reset')).toBe(50);
    await page.keyboard.press('Enter');
    await motionEnded(page);
    expect(await valueOf(page, 'reset')).toBe(35);
    expect(await log(page)).toEqual(['change {"value":50,"collapsed":false}', 'change {"value":35,"collapsed":false}']);
    // Another change in between: the next press goes to resetValue again, not back.
    await page.keyboard.press('Enter');
    await motionEnded(page);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await motionEnded(page);
    expect(await valueOf(page, 'reset')).toBe(50);
    await clear(page);
    await mount(page, [fx('at-reset', {})], { reducedMotion: true });
    await listen(page);
    await tabTo(page, separator(page, 'at-reset'));
    await page.keyboard.press('Enter');
    expect(await valueOf(page, 'at-reset')).toBe(50);
    expect(await log(page)).toEqual([]);
  });
});

test.describe('the folded pane', () => {
  test('SPV-8: folded away, the pane has no size and draws nothing, its content is out of reach of focus and assistive technology, the other pane takes the region, and the Handle stands at the edge with the value 0', async ({ page }) => {
    await mount(page, [fixtureOf('collapsed'), fx('end-folded', { primary: 'end', collapsible: true, collapsed: true })]);
    await addButton(page, 'collapsed', 'start', 'In the navigation');
    expect(await sizeOf(page, 'collapsed', 'start')).toBe(0);
    await expect(pane(page, 'collapsed', 'start')).toHaveAttribute('inert', '');
    await expect(host(page, 'collapsed').locator('.pane.primary .content')).toHaveCSS('visibility', 'hidden');
    const whole = await bounds(host(page, 'collapsed'));
    const line = await bounds(divider(page, 'collapsed'));
    expect(line.x).toBeCloseTo(whole.x, 1);
    expect(await sizeOf(page, 'collapsed', 'end')).toBeCloseTo(await region(page, 'collapsed'), 0);
    await expect(separator(page, 'collapsed')).toHaveAttribute('aria-valuenow', '0');
    const snapshot = await host(page, 'collapsed').ariaSnapshot();
    expect(snapshot).not.toContain('In the navigation');
    expect(snapshot).not.toContain('Navigation');
    // Tab goes from the Handle to the end pane's content, past the folded pane's.
    await addButton(page, 'collapsed', 'end', 'In the page');
    await tabTo(page, separator(page, 'collapsed'));
    await tab(page, { back: true });
    await expect(host(page, 'collapsed').locator('[slot="start"] button')).not.toBeFocused();
    // The end pane folded: the divider stands at the region's end edge.
    const endWhole = await bounds(host(page, 'end-folded'));
    const endLine = await bounds(divider(page, 'end-folded'));
    expect(endLine.x + endLine.width).toBeCloseTo(endWhole.x + endWhole.width, 1);
  });
});

test.describe('the product and the layout', () => {
  test('SPV-9: a share or a fold the product sets moves over resize-duration or collapse-duration with collapse-easing and sends no event; the first frame is drawn at once; at once where motion is reduced', async ({ page }) => {
    await mount(page, [fx('set', { collapsible: true, value: 30 })]);
    await listen(page);
    const primary = pane(page, 'set', 'start');
    const resize = await ms(page, T('motion-resize-duration'));
    const collapse = await ms(page, T('motion-collapse-duration'));
    const easing = await resolveEasing(page, T('motion-collapse-easing'));
    await watchTransitions(primary);
    await host(page, 'set').evaluate((el: any) => (el.value = 60));
    await expect.poll(() => transitionsRun(primary)).toContainEqual({ property: 'width', pseudo: '', own: true, on: expect.any(String), duration: resize, easing });
    await motionEnded(page);
    expect(await sizeOf(page, 'set', 'start')).toBeCloseTo((await region(page, 'set')) * 0.6, 0);
    await watchTransitions(primary);
    await host(page, 'set').evaluate((el: any) => (el.collapsed = true));
    await expect.poll(async () => (await transitionsRun(primary)).map((run) => run.duration)).toContain(collapse);
    await motionEnded(page);
    expect(await sizeOf(page, 'set', 'start')).toBe(0);
    expect(await log(page)).toEqual([]);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await watchTransitions(primary);
    await host(page, 'set').evaluate((el: any) => (el.collapsed = false));
    expect(await sizeOf(page, 'set', 'start')).toBeCloseTo((await region(page, 'set')) * 0.6, 0);
    expect(await sizeMotions(primary)).toEqual([]);
    // The first frame: a split view mounted with its share starts no motion.
    await mount(page, [fixtureOf('primary-end')], { beforePaint: true });
    await watchTransitions(pane(page, 'primary-end', 'end'));
    expect(await sizeMotions(pane(page, 'primary-end', 'end'))).toEqual([]);
  });

  test('SPV-10: while the divider moves by a motion, both panes are laid out at every frame and nothing is scrolled', async ({ page }) => {
    await mount(page, [fx('moving', { value: 20 })]);
    const room = await region(page, 'moving');
    await host(page, 'moving').evaluate((el: any) => (el.value = 80));
    // A frame inside the motion: the two panes and the divider still fill the region.
    const mid = await host(page, 'moving').evaluate(
      (el) =>
        new Promise<number[]>((done) =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              const panes = [...el.shadowRoot!.querySelectorAll('.pane')].map((p) => p.getBoundingClientRect().width);
              done(panes);
            }),
          ),
        ),
    );
    expect(mid[0]! + mid[1]!).toBeCloseTo(room, 0);
    await motionEnded(page);
    expect(await sizeOf(page, 'moving', 'start')).toBeCloseTo(room * 0.8, 0);
    for (const side of ['start', 'end'] as const) expect(await pane(page, 'moving', side).evaluate((el) => el.scrollLeft + el.scrollTop)).toBe(0);
  });

  test('SPV-11: when the region’s size changes the share is kept, laid out again at once, and nothing is sent', async ({ page }) => {
    await mount(page, [fx('room', { value: 40 })]);
    await listen(page);
    await watchTransitions(pane(page, 'room', 'start'));
    await host(page, 'room').evaluate((el) => el.style.setProperty('inline-size', '300px'));
    await expect.poll(async () => Math.round(await sizeOf(page, 'room', 'start'))).toBe(Math.round((await region(page, 'room')) * 0.4));
    expect(await valueOf(page, 'room')).toBe(40);
    expect(await sizeMotions(pane(page, 'room', 'start'))).toEqual([]);
    expect(await log(page)).toEqual([]);
  });

  test('SPV-12: right-to-left, the start pane stands at the right; the Right Arrow and a drag to the right move the divider to the right', async ({ page }) => {
    await mount(page, [fixtureOf('rtl')], { reducedMotion: true });
    const whole = await bounds(host(page, 'rtl'));
    const start = await bounds(pane(page, 'rtl', 'start'));
    expect(start.x + start.width).toBeCloseTo(whole.x + whole.width, 1);
    const before = (await centreOf(divider(page, 'rtl'))).x;
    await tabTo(page, separator(page, 'rtl'));
    await page.keyboard.press('ArrowRight');
    expect(await valueOf(page, 'rtl')).toBe(30);
    expect((await centreOf(divider(page, 'rtl'))).x).toBeGreaterThan(before);
    await away(page);
    const room = await region(page, 'rtl');
    await drag(page, handle(page, 'rtl'), -30, 0);
    expect(await valueOf(page, 'rtl')).toBeCloseTo(tidy(30 + (30 * 100) / room), 1);
    // The content is not mirrored: it is laid out right to left by its own direction.
    await expect(host(page, 'rtl').locator('[slot="start"]')).toHaveCSS('direction', 'rtl');
  });

  test('SPV-13: disabled, both panes keep their sizes, the Handle takes no focus and no drag, and the panes’ content stays operable', async ({ page }) => {
    await mount(page, [fixtureOf('disabled')]);
    await listen(page);
    await addButton(page, 'disabled', 'end', 'In the detail');
    await expect(handle(page, 'disabled')).toHaveAttribute('disabled', '');
    await expect(separator(page, 'disabled')).not.toHaveAttribute('tabindex');
    await expect(separator(page, 'disabled')).toHaveAttribute('aria-disabled', 'true');
    const before = await sizeOf(page, 'disabled', 'start');
    await drag(page, handle(page, 'disabled'), 60, 0);
    expect(await sizeOf(page, 'disabled', 'start')).toBe(before);
    expect(await log(page)).toEqual([]);
    await tabTo(page, host(page, 'disabled').locator('[slot="end"] button'));
    await expect(host(page, 'disabled').locator('[slot="end"] button')).toBeFocused();
  });

  test('SPV-14: in forced colors the divider is drawn in the text color', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium emulates forced colors');
    await mount(page, [fixtureOf('horizontal')]);
    await page.emulateMedia({ forcedColors: 'active' });
    const canvasText = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = 'CanvasText';
      document.body.append(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    });
    await expect(divider(page, 'horizontal')).toHaveCSS('background-color', canvasText);
  });

  test('SPV-15: an unknown axis or primary, a range outside 0–100, steps that cannot be used and a negative size each take their default, and are reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('odd', { axis: 'diagonal', primary: 'middle', min: 60, max: 40, step: -1, minSize: -5 })], { reducedMotion: true });
    await expect(divider(page, 'odd')).toHaveCSS('inline-size', `${await px(page, T('divider-width'))}px`);
    await expect(separator(page, 'odd')).toHaveAttribute('aria-valuemin', '10');
    await expect(separator(page, 'odd')).toHaveAttribute('aria-valuemax', '90');
    for (const value of ['"diagonal"', '"middle"', 'min 60', 'step -1', 'minSize -5']) expect(seen.some((w) => w.includes(value) && w.includes('SPV-15')), value).toBe(true);
    await tabTo(page, separator(page, 'odd'));
    await page.keyboard.press('ArrowRight');
    expect(await valueOf(page, 'odd')).toBe(55);
    // No label: the Handle reports its missing name.
    const unnamed = warnings(page);
    await mount(page, [fx('unnamed', { label: '' })]);
    await expect(handle(page, 'unnamed')).toHaveCount(1);
    expect(unnamed.some((w) => w.includes('HDL-8'))).toBe(true);
  });

  test('SPV-16: minSize and maxSize hold the primary pane to pixels on top of min and max, counted again as the region changes; where both cannot hold, the least wins', async ({ page }) => {
    await mount(page, [fx('least', { value: 30, minSize: 240 }), fx('greatest', { value: 70, maxSize: 120 }), fx('both', { minSize: 300, maxSize: 100 })], { reducedMotion: true });
    expect(await sizeOf(page, 'least', 'start')).toBeCloseTo(240, 0);
    expect(await valueOf(page, 'least')).toBe(30);
    const room = await region(page, 'least');
    await expect(separator(page, 'least')).toHaveAttribute('aria-valuemin', String(Math.round((240 * 100) / room)));
    expect(await sizeOf(page, 'greatest', 'start')).toBeCloseTo(120, 0);
    await expect(separator(page, 'greatest')).toHaveAttribute('aria-valuemax', String(Math.round((120 * 100) / room)));
    expect(await sizeOf(page, 'both', 'start')).toBeCloseTo(300, 0);
    await tabTo(page, separator(page, 'least'));
    // Drawn at its least already, Home changes nothing; from End, it goes back to the least the pixels give.
    await page.keyboard.press('Home');
    expect(await valueOf(page, 'least')).toBe(30);
    await page.keyboard.press('End');
    expect(await valueOf(page, 'least')).toBe(90);
    await page.keyboard.press('Home');
    expect(await valueOf(page, 'least')).toBeCloseTo(tidy((240 * 100) / room), 1);
    // A narrower region: 240 pixels are a larger share of it.
    await host(page, 'least').evaluate((el) => el.style.setProperty('inline-size', '400px'));
    await expect.poll(async () => Math.round(await sizeOf(page, 'least', 'start'))).toBe(240);
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
  test('every axis, both primary panes, the folded, the disabled and the right-to-left split have a fixture', () => {
    const seen = new Set(spec.fixtures.flatMap((f) => [`axis:${f.props.axis ?? 'horizontal'}`, `primary:${f.props.primary ?? 'start'}`, ...(f.props.collapsed ? ['collapsed'] : []), ...(f.props.disabled ? ['disabled'] : []), ...(f.direction === 'rtl' ? ['rtl'] : [])]));
    for (const name of ['axis:horizontal', 'axis:vertical', 'primary:start', 'primary:end', 'collapsed', 'disabled', 'rtl']) expect(seen.has(name), name).toBe(true);
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtureAsInAll(page, spec, f);
      await away(page);
      await expect(page.locator(`[data-fixture="${f.id}"]`)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
