// <tanrei-tab-view>, driven by specs/tab-view.spec.json: every behaviour id (TBV-1…23) is cited by a test title, every
// fixture has a baseline (and the test frames of TBV-5 theirs), and every look and timing is read back from the tokens —
// never from a number written here. A swipe is a touch (or pen) drag dispatched in the page, each event stamped with the
// time the finger was there, so a release's velocity is what the test says however late the page's timers run.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, type FixtureItem, acmeSystemCss, fixturesDocument, loadSpec, mountFixtures, resolveToken, tab, tabTo, rootTokens } from '../../../test/harness.js';
import { STOPPED_AFTER, flingThenHold, strokes } from '../../../test/stopped-release.js';

const spec = loadSpec('tab-view');
type P = Page;
const view = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-tab-view`);
/** The fixture's tabs: the view's own row (TBV-16), or the row the harness links it to (TBV-17). */
const row = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-tabs`);
/** The row the view draws itself: its first light-DOM child, in its `tabs` slot. */
const ownRow = (page: P, id: string) => view(page, id).locator(':scope > tanrei-tabs');
const tabAt = (page: P, id: string, n: number) => row(page, id).locator('tanrei-tab').nth(n);
const panel = (page: P, id: string, value: string) => view(page, id).locator(`tanrei-tab-panel[value="${value}"]`);
const container = (page: P, id: string) => view(page, id).locator('.container');
const T = (name: string) => `--tanrei-comp-tab-view-${name}`;
const css = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const bounds = async (locator: Locator) => (await locator.boundingBox())!;
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
/** The easing token as the browser serializes a timing function. */
const easingToken = (page: P, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.transitionTimingFunction = `var(${n})`;
    document.body.append(probe);
    const v = getComputedStyle(probe).transitionTimingFunction;
    probe.remove();
    return v;
  }, name);

/**
 * The panels of the fixtures: the three values, each with its content (a string of body text, or markup as it is) and the
 * label of its tab in the view's own row (the value, capitalized; unused while linked).
 */
const p = (value: string, content = `View of ${value}`, props: FixtureItem['props'] = {}): FixtureItem => ({
  kind: 'panel',
  props: { value, label: value.charAt(0).toUpperCase() + value.slice(1), ...props },
  content,
});
const THREE = [p('overview'), p('activity'), p('settings')];
const fixture = (id: string, items: FixtureItem[] = THREE, props: Fixture['props'] = {}): Fixture => ({ id, props, items });

/** Logs every `change` the page hears, from which element and with what, and each value when it fired. */
const wire = (page: P) =>
  page.evaluate(() => {
    const log: string[] = ((window as any).log = []);
    document.addEventListener('change', (e) => {
      const target = e.target as any;
      const value = (e as CustomEvent).detail?.value;
      const view = document.querySelector<any>('tanrei-tab-view');
      const tabs = document.querySelector<any>('tanrei-tabs');
      log.push(`${target.localName}:${value}:${view?.value}:${tabs?.value}`);
    });
  });
const log = (page: P) => page.evaluate(() => (window as any).log as string[]);

/** What a panel draws now: its travel, opacity and blur, and whether it is hidden or inert. */
const drawn = (locator: Locator) =>
  locator.evaluate((el) => {
    const s = getComputedStyle(el);
    const blur = /blur\(([-\d.]+)px\)/.exec(s.filter);
    return {
      x: s.translate === 'none' ? 0 : Number.parseFloat(s.translate),
      opacity: Number.parseFloat(s.opacity),
      blur: blur ? Number.parseFloat(blur[1]) : 0,
      hidden: el.hasAttribute('hidden'),
      inert: el.hasAttribute('inert'),
      visible: s.display !== 'none',
    };
  });
const offset = (page: P, id: string) => row(page, id).evaluate((el: any) => el.indicatorOffset as number);
const value = (page: P, id: string) => view(page, id).evaluate((el: any) => el.value as string | null);
const tabsValue = (page: P, id: string) => row(page, id).evaluate((el: any) => el.value as string | null);
/** The container's width, which a drag's progress is measured against (TBV-3). */
const width = async (page: P, id: string) => (await bounds(container(page, id))).width;

/**
 * The switch's and the fade's motion made long, right after a mount: a switch is started in one command and held (or
 * counted) in the next, and a slow machine can take longer between the two than the tokens' time — the switch has then
 * ended, and there is nothing to hold. The view makes its animation in the same task as the selection (so it is never
 * "not yet there"), and reads its duration from these tokens, which is what the tests compare it with.
 */
const unhurried = (page: P) => override(page, { [T('motion-switch-duration')]: '60s', [T('motion-fade-duration')]: '60s' });
/**
 * The view's switch animation: held at `at` of its duration, with its timing and the easing's progress there. A test
 * that holds a switch makes the motion `unhurried` first; where none is running, this says so.
 */
const holdSwitch = (page: P, id: string, at: number) =>
  container(page, id).evaluate(async (el, f) => {
    const a = el.getAnimations().find((each) => each.id === 'tanrei-tab-view-switch');
    if (!a?.effect) throw new Error('no switch is running on the view (no animation `tanrei-tab-view-switch` on its container): it has ended, or none was started');
    const timing = a.effect.getTiming();
    a.pause();
    a.currentTime = (timing.duration as number) * f;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return { duration: timing.duration as number, easing: timing.easing as string, progress: a.effect.getComputedTiming().progress ?? 1 };
  }, at);
const switches = (page: P, id: string) => container(page, id).evaluate((el) => el.getAnimations().filter((a) => a.id === 'tanrei-tab-view-switch').length);
const finishSwitch = (page: P, id: string) =>
  container(page, id).evaluate(async (el) => {
    for (const a of el.getAnimations()) if (a.id === 'tanrei-tab-view-switch') a.finish();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
/** Where the tabs draw their indicator now: tab `n`'s covered layer's clip, on the page (TAB-24). */
const pill = (page: P, id: string, n: number) =>
  tabAt(page, id, n)
    .locator('.cover')
    .evaluate((el) => {
      const m = /^inset\((.*)\)$/.exec(getComputedStyle(el).clipPath);
      if (!m || m[1].includes('%')) return null;
      const v = m[1].split(' round ')[0].trim().split(/\s+/).map(Number.parseFloat);
      const [top, right, bottom, left] = v.length === 4 ? v : [v[0], v[1] ?? v[0], v[2] ?? v[0], v[1] ?? v[0]];
      const r = el.getBoundingClientRect();
      return { x: r.x + left, width: r.width - left - right, top, bottom };
    });

interface Point {
  /** Sideways and downward distance from where the finger went down, in px. */
  x: number;
  y?: number;
  /** The time since the event before, in ms. */
  dt: number;
}
/**
 * A drag dispatched in the page on `on` (the shown panel by default): pointer down, one move per point, and — unless
 * `up` is null — pointer up that many ms after the last move, where the last point is. Each event is stamped with the
 * time the finger was there. Returns what the page shows in the same task as the release (the commit of TBV-4 is
 * synchronous): the view's and the tabs' value and the tabs' indicatorOffset.
 */
async function gesture(page: P, id: string, points: Point[], { up = 300, pointerType = 'touch', on = null as string | null } = {}) {
  return page.evaluate(
    ({ id, points, up, pointerType, on }) => {
      const stage = document.querySelector(`[data-fixture="${id}"]`)!;
      const view = stage.querySelector<any>('tanrei-tab-view')!;
      const tabs = stage.querySelector<any>('tanrei-tabs');
      const shown = [...view.querySelectorAll('tanrei-tab-panel')].find((el) => !el.hasAttribute('hidden') && !el.hasAttribute('inert')) ?? view;
      const target: Element = on ? stage.querySelector(on)! : shown;
      const r = target.getBoundingClientRect();
      const [x0, y0] = [r.left + r.width / 2, r.top + Math.min(r.height / 2, 12)];
      let stamp = performance.now() - 2000;
      const at = (type: string, x: number, y: number) => {
        const event = new PointerEvent(type, { bubbles: true, composed: true, cancelable: true, pointerId: 11, pointerType, isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: x, clientY: y });
        Object.defineProperty(event, 'timeStamp', { value: stamp });
        return event;
      };
      target.dispatchEvent(at('pointerdown', x0, y0));
      let last = { x: 0, y: 0 };
      for (const point of points) {
        stamp += point.dt;
        last = { x: point.x, y: point.y ?? 0 };
        target.dispatchEvent(at('pointermove', x0 + last.x, y0 + last.y));
      }
      if (up !== null) {
        stamp += up;
        target.dispatchEvent(at('pointerup', x0 + last.x, y0 + last.y));
      }
      return { value: view.value as string | null, tabs: (tabs?.value ?? null) as string | null, offset: (tabs?.indicatorOffset ?? 0) as number };
    },
    { id, points, up, pointerType, on },
  );
}
/** Lifts a held drag as the browser does when it takes a touch back (pointercancel): the view settles it without a release. */
const lift = (page: P, id: string) =>
  page.evaluate((id) => {
    const target = document.querySelector(`[data-fixture="${id}"] tanrei-tab-view`)!;
    target.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, composed: true, pointerId: 11, pointerType: 'touch', isPrimary: true }));
  }, id);
/** A slow drag to `dx` (sideways), in eight moves 16 ms apart, released 300 ms after it stopped (no fling) or held. */
const slow = (dx: number, dy = 0): Point[] => Array.from({ length: 8 }, (_, i) => ({ x: (dx * (i + 1)) / 8, y: (dy * (i + 1)) / 8, dt: 16 }));
/** A fast drag to `dx`, in four moves 4 ms apart: released at once, it is a fling. */
const fast = (dx: number): Point[] => Array.from({ length: 4 }, (_, i) => ({ x: (dx * (i + 1)) / 4, dt: 4 }));

/**
 * A drag across the row (TAB-28), dispatched in the page with a pointer of its own: down on tab `from` at its centre, eight
 * moves 16 ms apart to the centre of tab `to` plus `dx`, and — unless `up` is null — the release 300 ms later (no fling).
 */
const ROW_POINTER = 21;
async function rowDrag(page: P, id: string, from: number, to: number, { up = 300 as number | null, dx = 0 } = {}) {
  await page.evaluate(
    ({ id, from, to, up, dx, pointerId }) => {
      const tabs = document.querySelectorAll(`[data-fixture="${id}"] tanrei-tabs > tanrei-tab`);
      const [a, b] = [tabs[from].getBoundingClientRect(), tabs[to].getBoundingClientRect()];
      const [x0, x1, y] = [a.left + a.width / 2, b.left + b.width / 2 + dx, a.top + a.height / 2];
      let stamp = ((window as any).rowStamp = performance.now() - 5000);
      const event = (type: string, x: number) => {
        const e = new PointerEvent(type, { bubbles: true, composed: true, cancelable: true, pointerId, pointerType: 'touch', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: x, clientY: y });
        Object.defineProperty(e, 'timeStamp', { value: stamp });
        return e;
      };
      tabs[from].dispatchEvent(event('pointerdown', x0));
      for (let i = 1; i <= 8; i++) {
        stamp += 16;
        tabs[from].dispatchEvent(event('pointermove', x0 + ((x1 - x0) * i) / 8));
      }
      if (up !== null) {
        stamp += up;
        tabs[from].dispatchEvent(event('pointerup', x1));
      }
      (window as any).rowStamp = stamp;
      (window as any).rowAt = { x: x1, y };
    },
    { id, from, to, up, dx, pointerId: ROW_POINTER },
  );
}
/** Ends a held drag across the row where it is: released (no fling), or taken back by the platform. */
const rowEnd = (page: P, id: string, type: 'pointerup' | 'pointercancel' = 'pointerup') =>
  page.evaluate(
    ({ id, type, pointerId }) => {
      const target = document.querySelector(`[data-fixture="${id}"] tanrei-tabs`)!;
      const { x, y } = (window as any).rowAt;
      const e = new PointerEvent(type, { bubbles: true, composed: true, cancelable: true, pointerId, pointerType: 'touch', isPrimary: true, button: 0, buttons: 0, clientX: x, clientY: y });
      Object.defineProperty(e, 'timeStamp', { value: (window as any).rowStamp + 300 });
      target.dispatchEvent(e);
    },
    { id, type, pointerId: ROW_POINTER },
  );
const rowDragging = (page: P, id: string) => row(page, id).evaluate((el: any) => el.dragging as boolean);

test.describe('selection and link', () => {
  test('TBV-1: shows the panel of its tabs’ selected tab — its own row’s or the linked row’s (the first enabled one while it is null) — and hides the others; the view’s value and the tabs’ are kept equal, either way, without change', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    await wire(page);
    // default: selected is null on both, and the first tab's panel is shown.
    expect([await value(page, 'default'), await tabsValue(page, 'default')]).toEqual([null, null]);
    await expect(panel(page, 'default', 'overview')).toBeVisible();
    for (const v of ['activity', 'settings']) await expect(panel(page, 'default', v)).toBeHidden();
    // second-selected: the tabs and the view both hold activity.
    expect([await value(page, 'second-selected'), await tabsValue(page, 'second-selected')]).toEqual(['activity', 'activity']);
    await expect(panel(page, 'second-selected', 'activity')).toBeVisible();
    await expect(tabAt(page, 'second-selected', 1)).toHaveAttribute('aria-selected', 'true');
    // The fixture's content: body text inside space200 of padding (TBV-1's verify).
    const content = panel(page, 'default', 'overview').locator('p');
    expect(Number.parseFloat(await css(content, 'padding-top'))).toBeCloseTo(await resolveToken(page, '--tanrei-sys-space-space200'), 1);
    // Setting either sets the other, without an event.
    await view(page, 'default').evaluate((el: any) => (el.value = 'settings'));
    await expect.poll(() => tabsValue(page, 'default')).toBe('settings');
    await finishSwitch(page, 'default');
    await expect(panel(page, 'default', 'settings')).toBeVisible();
    await row(page, 'default').evaluate((el: any) => (el.value = 'activity'));
    await expect.poll(() => value(page, 'default')).toBe('activity');
    await finishSwitch(page, 'default');
    await expect(panel(page, 'default', 'activity')).toBeVisible();
    await expect(panel(page, 'default', 'settings')).toBeHidden();
    // Linked (the `linked` fixture): the row above the view is its tabs, the same both ways.
    expect([await value(page, 'linked'), await tabsValue(page, 'linked')]).toEqual([null, null]);
    await expect(panel(page, 'linked', 'overview')).toBeVisible();
    await page.locator('#tabs-linked').evaluate((el: any) => (el.value = 'settings'));
    await expect.poll(() => value(page, 'linked')).toBe('settings');
    await finishSwitch(page, 'linked');
    await expect(panel(page, 'linked', 'settings')).toBeVisible();
    await view(page, 'linked').evaluate((el: any) => (el.value = 'activity'));
    await expect.poll(() => page.locator('#tabs-linked').evaluate((el: any) => el.value)).toBe('activity');
    expect(await log(page)).toEqual([]);
  });

  test('TBV-2: a selection on its tabs — or by the product — switches the panel over the switch’s motion; linked, the tabs announce it and the view does not; with its own row, the view alone (TBV-18)', async ({ page }) => {
    // Linked: the linked tabs' change, none from the view.
    await mountFixtures(page, spec, { fixtures: [fixture('l', THREE, { tabs: 'x' })], reducedMotion: false });
    // The switch is read after the click that starts it, in another command: its motion is made long enough to be
    // still running then on any machine (a loaded one took longer than the token's time and read a switch that had
    // ended). Its duration is still the token's, which is what is compared below.
    await override(page, { [T('motion-switch-duration')]: '60s' });
    await wire(page);
    await tabAt(page, 'l', 1).click();
    expect(await switches(page, 'l')).toBe(1);
    await finishSwitch(page, 'l');
    await expect(panel(page, 'l', 'activity')).toBeVisible();
    expect(await log(page)).toEqual(['tanrei-tabs:activity:activity:activity']);

    // Its own row: the same switch; the view's change, none from the row.
    await mountFixtures(page, spec, { fixtures: [fixture('v')], reducedMotion: false });
    await override(page, { [T('motion-switch-duration')]: '60s' });
    await wire(page);
    await tabAt(page, 'v', 1).click();
    expect(await switches(page, 'v')).toBe(1);
    const held = await holdSwitch(page, 'v', 0.5);
    expect(held.duration).toBe(await resolveToken(page, T('motion-switch-duration'), 'duration'));
    expect(held.easing).toBe(await easingToken(page, T('motion-switch-easing')));
    // Both panels are drawn while it runs; the view announced it once (TBV-18).
    expect((await drawn(panel(page, 'v', 'overview'))).visible).toBe(true);
    expect((await drawn(panel(page, 'v', 'activity'))).visible).toBe(true);
    await finishSwitch(page, 'v');
    await expect(panel(page, 'v', 'overview')).toBeHidden();
    await expect(panel(page, 'v', 'activity')).toBeVisible();
    // The product sets the view's value: a switch too, and no event at all.
    await view(page, 'v').evaluate((el: any) => (el.value = 'settings'));
    await expect.poll(() => switches(page, 'v')).toBe(1);
    await finishSwitch(page, 'v');
    await expect(panel(page, 'v', 'settings')).toBeVisible();
    expect(await log(page)).toEqual(['tanrei-tab-view:activity:activity:activity']);
  });
});

test.describe('the swipe', () => {
  test('TBV-3: a touch or pen drag past the slop, further sideways than up or down, draws the switch at p (over the container’s width) and sets the tabs’ indicatorOffset to ±p; none at an end; a vertical drag is scrolling; a drag on its own row is the row’s', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('v', THREE, { selected: 'activity' })], reducedMotion: false });
    const w = await width(page, 'v');
    const D = await resolveToken(page, T('transition-distance'));
    // Toward the start edge (left): the next tab, at p = 0.25.
    let now = await gesture(page, 'v', slow(-w / 4), { up: null });
    expect(now.offset).toBeCloseTo(0.25, 3);
    let [a, b] = [await drawn(panel(page, 'v', 'activity')), await drawn(panel(page, 'v', 'settings'))];
    expect(a.x).toBeCloseTo(-0.25 * D, 1);
    expect(b.x).toBeCloseTo(0.75 * D, 1);
    expect(b.visible).toBe(true);
    // The drag is released slowly under half: it goes back; then toward the end edge: the previous tab, −p. By pen.
    await lift(page, 'v');
    await finishSwitch(page, 'v');
    now = await gesture(page, 'v', slow(w * 0.4), { up: null, pointerType: 'pen' });
    expect(now.offset).toBeCloseTo(-0.4, 3);
    [a, b] = [await drawn(panel(page, 'v', 'activity')), await drawn(panel(page, 'v', 'overview'))];
    expect(a.x).toBeCloseTo(0.4 * D, 1);
    expect(b.x).toBeCloseTo(-0.6 * D, 1);
    await lift(page, 'v');
    await finishSwitch(page, 'v');

    // At the first tab, a drag toward the end edge has no tab to go to: the panel stays at rest, the offset at 0.
    await mountFixtures(page, spec, { fixtures: [fixture('v')], reducedMotion: false });
    now = await gesture(page, 'v', slow(w * 0.3), { up: null });
    expect(now.offset).toBe(0);
    expect(await drawn(panel(page, 'v', 'overview'))).toMatchObject({ x: 0, opacity: 1, blur: 0 });
    await lift(page, 'v');
    // A drag that goes down before it goes sideways is the browser's scrolling, for its whole length.
    await mountFixtures(page, spec, { fixtures: [fixture('v')], reducedMotion: false });
    now = await gesture(page, 'v', [{ x: -2, y: 12, dt: 16 }, { x: -60, y: 14, dt: 16 }, { x: -120, y: 16, dt: 16 }], { up: null });
    expect(now.offset).toBe(0);
    expect(await drawn(panel(page, 'v', 'overview'))).toMatchObject({ x: 0, opacity: 1 });
    await expect(panel(page, 'v', 'activity')).toBeHidden();
    await lift(page, 'v');
    // A drag that starts on the view's own row is the row's: not taken, whichever tab it starts on.
    await mountFixtures(page, spec, { fixtures: [fixture('v')], reducedMotion: false });
    for (const n of [1, 2]) {
      now = await gesture(page, 'v', slow(-w * 0.8), { on: `tanrei-tab-view > tanrei-tabs > tanrei-tab:nth-child(${n})`, up: null });
      expect([now.offset, now.value]).toEqual([0, null]);
      await expect(panel(page, 'v', 'activity')).toBeHidden();
      await lift(page, 'v');
    }
    // The row is outside the container: only the container leaves vertical panning to the browser.
    expect(await css(container(page, 'v'), 'touch-action')).toBe('pan-y pinch-zoom');
    expect(await css(ownRow(page, 'v'), 'touch-action')).toBe('auto');
  });

  test('TBV-4: a release commits past half or on a fling toward the tab — both values set, indicatorOffset re-expressed from the new tab and change once, at the release — and cancels otherwise, a fling away always cancelling; the rest runs over the switch’s motion', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('v')], reducedMotion: false });
    await unhurried(page);
    await wire(page);
    const w = await width(page, 'v');
    const [duration, easing] = [await resolveToken(page, T('motion-switch-duration'), 'duration'), await easingToken(page, T('motion-switch-easing'))];
    // Past half, released slowly: committed at the release.
    const at = await gesture(page, 'v', slow(-w * 0.6));
    expect([at.value, at.tabs]).toEqual(['activity', 'activity']);
    expect(at.offset).toBeCloseTo(-0.4, 3);
    expect(await log(page)).toEqual(['tanrei-tab-view:activity:activity:activity']);
    // The rest of the switch and of the offset run over the switch's motion, from where the release left them.
    let held = await holdSwitch(page, 'v', 0);
    expect([held.duration, held.easing]).toEqual([duration, easing]);
    expect(await offset(page, 'v')).toBeCloseTo(-0.4, 3);
    const D = await resolveToken(page, T('transition-distance'));
    expect((await drawn(panel(page, 'v', 'activity'))).x).toBeCloseTo(0.4 * D, 1);
    held = await holdSwitch(page, 'v', 0.5);
    expect(await offset(page, 'v')).toBeCloseTo(-0.4 * (1 - held.progress), 3);
    await finishSwitch(page, 'v');
    expect(await offset(page, 'v')).toBe(0);
    await expect(panel(page, 'v', 'overview')).toBeHidden();
    expect(await drawn(panel(page, 'v', 'activity'))).toMatchObject({ x: 0, opacity: 1, blur: 0 });

    // Under half, released slowly: cancelled, nothing emitted, back to rest over the same motion.
    let now = await gesture(page, 'v', slow(-w * 0.3));
    expect([now.value, now.tabs]).toEqual(['activity', 'activity']);
    expect(now.offset).toBeCloseTo(0.3, 3);
    held = await holdSwitch(page, 'v', 0);
    expect([held.duration, held.easing]).toEqual([duration, easing]);
    await finishSwitch(page, 'v');
    expect(await offset(page, 'v')).toBe(0);
    await expect(panel(page, 'v', 'settings')).toBeHidden();
    expect(await log(page)).toHaveLength(1);

    // A fling toward the tab under half: committed.
    now = await gesture(page, 'v', fast(-w * 0.2), { up: 4 });
    expect(now.value).toBe('settings');
    await finishSwitch(page, 'v');
    // A fling away from the tab past half: cancelled.
    now = await gesture(page, 'v', [...slow(w * 0.8), { x: w * 0.8, dt: 100 }, { x: w * 0.7, dt: 4 }, { x: w * 0.6, dt: 4 }], { up: 4 });
    expect(now.value).toBe('settings');
    await finishSwitch(page, 'v');
    expect(await log(page)).toEqual(['tanrei-tab-view:activity:activity:activity', 'tanrei-tab-view:settings:settings:settings']);
    await expect(panel(page, 'v', 'settings')).toBeVisible();
  });

  test('TBV-4: a fast swipe that holds still for more than 40 ms before its release is no fling — under half it cancels — and the same swipe released within 40 ms of its last move commits', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('v')], reducedMotion: false });
    await wire(page);
    const shown = panel(page, 'v', 'overview');
    const r = await bounds(shown);
    const from = { x: r.x + r.width / 2, y: r.y + Math.min(r.height / 2, 12) };
    // 30 px toward Activity at 2.5 px per ms, far under half the view: only a fling commits it.
    const moves = strokes(from, { x: -10, y: 0 });
    expect(30).toBeLessThan((await width(page, 'v')) / 2);
    const before = await value(page, 'v');
    await flingThenHold(page, shown, { from, moves, hold: STOPPED_AFTER + 1 });
    expect(await value(page, 'v')).toBe(before);
    expect(await log(page)).toEqual([]);
    await finishSwitch(page, 'v');
    await expect(shown).toBeVisible();
    await flingThenHold(page, shown, { from, moves, hold: STOPPED_AFTER });
    expect(await value(page, 'v')).toBe('activity');
    expect(await log(page)).toEqual(['tanrei-tab-view:activity:activity:activity']);
    await finishSwitch(page, 'v');
  });

  test('TBV-8: a mouse drag, a drag on its own row or on content that drags sideways itself (a text field, a sideways scroller, a slider) and any drag while no-swipe is set are not taken; the tabs still switch', async ({ page }) => {
    const markup = `<p class="tanrei-text-body">Filters</p><input id="field" aria-label="Filter" value="text" /><div id="strip" style="overflow-x:auto;white-space:nowrap;inline-size:200px"><span style="display:inline-block;inline-size:600px">Wide strip</span></div><div id="knob" role="slider" aria-label="Level" aria-valuenow="1" tabindex="0">Level</div>`;
    await mountFixtures(page, spec, { fixtures: [fixture('v', [p('overview', markup), p('activity'), p('settings')])], reducedMotion: false });
    const w = await width(page, 'v');
    const untouched = async () => {
      expect(await offset(page, 'v')).toBe(0);
      expect(await value(page, 'v')).toBeNull();
      await expect(panel(page, 'v', 'activity')).toBeHidden();
    };
    await gesture(page, 'v', slow(-w * 0.8), { pointerType: 'mouse', up: null });
    await untouched();
    await lift(page, 'v');
    for (const on of ['#field', '#strip span', '#knob', 'tanrei-tab-view > tanrei-tabs > tanrei-tab']) {
      await gesture(page, 'v', slow(-w * 0.8), { on, up: null });
      await untouched();
      await lift(page, 'v');
    }
    // Selected text: a drag that starts on it is the selection's.
    await page.evaluate(() => {
      const text = document.querySelector('tanrei-tab-panel[value="overview"] p')!;
      getSelection()!.selectAllChildren(text);
    });
    await gesture(page, 'v', slow(-w * 0.8), { on: 'tanrei-tab-panel[value="overview"] p', up: null });
    await untouched();
    await lift(page, 'v');
    await page.evaluate(() => getSelection()!.removeAllRanges());
    // The container leaves vertical panning to the browser while it can swipe…
    expect(await css(container(page, 'v'), 'touch-action')).toBe('pan-y pinch-zoom');
    // …and nothing is taken while no-swipe is set: the browser keeps every touch gesture.
    await view(page, 'v').evaluate((el: any) => (el.noSwipe = true));
    await expect(view(page, 'v')).toHaveAttribute('no-swipe', '');
    await expect.poll(() => css(container(page, 'v'), 'touch-action')).toBe('auto');
    await gesture(page, 'v', slow(-w * 0.8), { up: null });
    await untouched();
    await lift(page, 'v');
    await tabAt(page, 'v', 2).click();
    await finishSwitch(page, 'v');
    await expect(panel(page, 'v', 'settings')).toBeVisible();
  });
});

test.describe('a drag across the row', () => {
  const linkedFixture = spec.fixtures.filter((f) => f.id === 'linked');
  const atRest = { x: 0, opacity: 1, blur: 0, hidden: false, inert: false, visible: true };

  for (const [name, fixtures, id] of [
    ['its own row', [fixture('v')], 'v'],
    ['the linked row', linkedFixture, 'linked'],
  ] as const) {
    test(`TBV-3: while its tabs follow a drag of their own (${name}) the view takes no drag and leaves the shown panel at rest — the indicator moves under the finger, the panel does not — until the release selects a tab`, async ({ page }) => {
      await mountFixtures(page, spec, { fixtures: [...fixtures], reducedMotion: false });
      // The switch the release starts is still running when it is counted, on any machine: WebKit on Linux was up to
      // 432 ms into the token's 500 ms when the test had asked two things after the release, and past it on CI.
      await override(page, { [T('motion-switch-duration')]: '60s' });
      await wire(page);
      const before = await pill(page, id, 0);
      const shown = await value(page, id);
      await rowDrag(page, id, 0, 2, { up: null });
      expect(await rowDragging(page, id)).toBe(true);
      // The indicator has gone with the finger, across Activity to Settings…
      await expect.poll(async () => (await pill(page, id, 0))!.x).toBeGreaterThan(before!.x + 100);
      // …and the content has not changed: the shown panel at rest, the others hidden, no switch drawn, nothing selected.
      expect(await drawn(panel(page, id, 'overview'))).toEqual(atRest);
      for (const other of ['activity', 'settings']) expect(await drawn(panel(page, id, other))).toMatchObject({ hidden: true, visible: false });
      expect(await switches(page, id)).toBe(0);
      expect([await value(page, id), await tabsValue(page, id), await offset(page, id)]).toEqual([shown, shown, 0]);
      await expect(tabAt(page, id, 0)).toHaveAttribute('aria-selected', 'true');
      // A swipe of the panel meanwhile is not taken: only one gesture at a time.
      await gesture(page, id, slow(-(await width(page, id)) * 0.8), { up: null });
      expect(await offset(page, id)).toBe(0);
      expect(await drawn(panel(page, id, 'overview'))).toEqual(atRest);
      await lift(page, id);
      expect(await rowDragging(page, id)).toBe(true);
      expect(await log(page)).toEqual([]);
      // The release selects Settings: the view switches to its panel as for any selected tab (TBV-2).
      await rowEnd(page, id);
      expect([await value(page, id), await tabsValue(page, id)]).toEqual(['settings', 'settings']);
      expect(await switches(page, id)).toBe(1);
      await finishSwitch(page, id);
      await expect(panel(page, id, 'settings')).toBeVisible();
      await expect(panel(page, id, 'overview')).toBeHidden();
    });
  }

  test('TBV-2: a drag across the row released on another tab switches the panel over the switch’s motion, as any selection does; linked, the tabs announce it and the view does not; a drag that returns switches nothing', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...linkedFixture], reducedMotion: false });
    // The switch the release starts is still running when it is held, two commands later, on any machine: it lasts the
    // token's 500 ms from the release, and in WebKit on the CI's Linux there was once none left to hold (in the same
    // image on a faster machine the hold came 69–103 ms after the release).
    await unhurried(page);
    await wire(page);
    const [duration, easing] = [await resolveToken(page, T('motion-switch-duration'), 'duration'), await easingToken(page, T('motion-switch-easing'))];
    await rowDrag(page, 'linked', 0, 1);
    expect(await log(page)).toEqual(['tanrei-tabs:activity:activity:activity']);
    const held = await holdSwitch(page, 'linked', 0.5);
    expect([held.duration, held.easing]).toEqual([duration, easing]);
    expect((await drawn(panel(page, 'linked', 'activity'))).visible).toBe(true);
    await finishSwitch(page, 'linked');
    await expect(panel(page, 'linked', 'activity')).toBeVisible();
    await expect(panel(page, 'linked', 'overview')).toBeHidden();
    // Dragged a little toward Settings and released short of it: the indicator returns, the panel stays, nothing is heard.
    await rowDrag(page, 'linked', 1, 1, { dx: 20 });
    expect(await switches(page, 'linked')).toBe(0);
    expect(await drawn(panel(page, 'linked', 'activity'))).toEqual(atRest);
    expect(await log(page)).toEqual(['tanrei-tabs:activity:activity:activity']);
  });

  test('TBV-8: one gesture at a time — the view takes no drag that starts on its own row or while its tabs follow a drag of their own, and its tabs take none while the view’s swipe has set their indicatorOffset', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('v')], reducedMotion: false });
    const w = await width(page, 'v');
    // A drag that starts on the own row is the row's: its indicator follows, the view's offset and panels do not.
    await rowDrag(page, 'v', 0, 1, { up: null });
    expect(await rowDragging(page, 'v')).toBe(true);
    expect(await offset(page, 'v')).toBe(0);
    expect(await drawn(panel(page, 'v', 'overview'))).toEqual(atRest);
    // The tabs follow a drag of their own: a touch on the panel is not taken.
    await gesture(page, 'v', slow(-w * 0.8), { up: null });
    expect(await offset(page, 'v')).toBe(0);
    await expect(panel(page, 'v', 'activity')).toBeHidden();
    await lift(page, 'v');
    await rowEnd(page, 'v', 'pointercancel');
    expect(await rowDragging(page, 'v')).toBe(false);
    expect(await value(page, 'v')).toBeNull();
    // The view's swipe has the indicator (indicatorOffset is not 0): a press on the row dragged sideways is not taken.
    await gesture(page, 'v', slow(-w * 0.4), { up: null });
    expect(await offset(page, 'v')).toBeCloseTo(0.4, 2);
    await rowDrag(page, 'v', 0, 2, { up: null });
    expect(await rowDragging(page, 'v')).toBe(false);
    expect(await offset(page, 'v')).toBeCloseTo(0.4, 2);
    await rowEnd(page, 'v');
    expect(await value(page, 'v')).toBeNull();
    await lift(page, 'v');
  });

  test('TBV-18: a drag across its own row released on another tab is announced once, by the view, its value set first; one that returns to the selected tab, or is cancelled, announces nothing', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('v')], reducedMotion: true });
    await page.evaluate(() => {
      const heard: string[] = ((window as any).heard = []);
      const stage = document.querySelector('[data-fixture="v"]')!;
      stage.addEventListener('change', (e) => heard.push(`parent ${(e.target as Element).localName}:${(e as CustomEvent).detail.value}:${(e.target as any).value}`));
      document.addEventListener('change', (e) => heard.push(`capture ${(e.target as Element).localName}`), { capture: true });
    });
    const heard = () => page.evaluate(() => (window as any).heard.splice(0) as string[]);
    await rowDrag(page, 'v', 0, 2);
    expect(await heard()).toEqual(['capture tanrei-tab-view', 'parent tanrei-tab-view:settings:settings']);
    expect(await tabsValue(page, 'v')).toBe('settings');
    await expect(panel(page, 'v', 'settings')).toBeVisible();
    // Returned to the selected tab: nothing.
    await rowDrag(page, 'v', 2, 2, { dx: -20 });
    expect(await heard()).toEqual([]);
    // Cancelled on the way to another tab: nothing.
    await rowDrag(page, 'v', 2, 0, { up: null });
    await rowEnd(page, 'v', 'pointercancel');
    expect(await heard()).toEqual([]);
    expect([await value(page, 'v'), await tabsValue(page, 'v')]).toEqual(['settings', 'settings']);
    await expect(panel(page, 'v', 'settings')).toBeVisible();
  });
});

test.describe('the switch', () => {
  test('TBV-5: at p the old panel moves p × D toward the edge it leaves by, fades and blurs, the new one arrives from the other side, B over A; both clipped to the container’s corners, never over its own row, which stays still; at 0 and 1 one panel, at rest and sharp', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('v')], reducedMotion: false });
    await unhurried(page);
    const w = await width(page, 'v');
    const [D, blur, opacity] = [await resolveToken(page, T('transition-distance')), await resolveToken(page, T('transition-blur')), Number(await page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), T('transition-opacity')))];
    // Where the indicator rests on each tab.
    const onFirst = (await pill(page, 'v', 0))!;
    await row(page, 'v').evaluate((el: any) => (el.indicatorOffset = 1));
    const onSecond = (await pill(page, 'v', 1))!;
    await row(page, 'v').evaluate((el: any) => (el.indicatorOffset = 0));
    const still = async () => ({ box: await bounds(ownRow(page, 'v')), filter: await css(ownRow(page, 'v'), 'filter'), opacity: await css(ownRow(page, 'v'), 'opacity'), translate: await css(ownRow(page, 'v'), 'translate') });
    const atRest = await still();
    // A drag held at p = 0.5 toward the next tab (TBV-5's verify).
    await gesture(page, 'v', slow(-w / 2), { up: null });
    // The view's own row is neither moved, faded nor blurred, and the panels are drawn below it, never over it.
    expect(await still()).toEqual(atRest);
    expect(atRest).toMatchObject({ filter: 'none', opacity: '1', translate: 'none' });
    const clip = await bounds(container(page, 'v'));
    expect(clip.y).toBeCloseTo(atRest.box.y + atRest.box.height, 1);
    const [a, b] = [await drawn(panel(page, 'v', 'overview')), await drawn(panel(page, 'v', 'activity'))];
    expect(a.x).toBeCloseTo(-0.5 * D, 1);
    expect(b.x).toBeCloseTo(0.5 * D, 1);
    expect(a.opacity).toBeCloseTo(1 - 0.5 * (1 - opacity), 2);
    expect(b.opacity).toBeCloseTo(1 - 0.5 * (1 - opacity), 2);
    expect(a.blur).toBeCloseTo(blur / 2, 1);
    expect(b.blur).toBeCloseTo(blur / 2, 1);
    expect(Number(await css(panel(page, 'v', 'activity'), 'z-index'))).toBeGreaterThan(Number(await css(panel(page, 'v', 'overview'), 'z-index')) || 0);
    // The tabs' indicator is halfway between the two tabs.
    const half = (await pill(page, 'v', 0))!;
    expect(half.x).toBeCloseTo((onFirst.x + onSecond.x) / 2, 0);
    expect(half.width).toBeCloseTo((onFirst.width + onSecond.width) / 2, 0);
    await lift(page, 'v');
    await finishSwitch(page, 'v');
    // A switch from a tab, held at its ends: one panel, at rest and sharp.
    await tabAt(page, 'v', 2).click();
    await holdSwitch(page, 'v', 0);
    expect(await drawn(panel(page, 'v', 'overview'))).toMatchObject({ x: 0, opacity: 1, blur: 0 });
    expect((await drawn(panel(page, 'v', 'settings'))).opacity).toBeCloseTo(opacity, 3);
    // (Held a hair before its end: an animation held at its very end has finished.)
    await holdSwitch(page, 'v', 0.9999);
    expect((await drawn(panel(page, 'v', 'overview'))).opacity).toBeCloseTo(opacity, 2);
    const landed = await drawn(panel(page, 'v', 'settings'));
    expect([landed.x, landed.opacity, landed.blur]).toEqual([expect.closeTo(0, 1), expect.closeTo(1, 2), expect.closeTo(0, 1)]);
    // Mid-switch the travel follows the eased progress: the old panel moves toward the start edge (Settings comes after).
    const held = await holdSwitch(page, 'v', 0.3);
    expect((await drawn(panel(page, 'v', 'overview'))).x).toBeCloseTo(-held.progress * D, 1);
    await finishSwitch(page, 'v');
    // Clipped to the container, its corners the container's shape.
    expect(await css(container(page, 'v'), 'overflow-x')).toBe('clip');
    expect(await css(container(page, 'v'), 'overflow-y')).toBe('clip');
    await override(page, { [T('container-shape')]: '16px' });
    await expect.poll(async () => Number.parseFloat(await css(container(page, 'v'), 'border-top-left-radius'))).toBeCloseTo(16, 1);
  });

  test('TBV-5: a page turn — distance 0, a whole width, no fade, no blur (the m3-like preset) — moves the panels exactly with the finger', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('v')], system: 'm3-like', reducedMotion: false });
    const w = await width(page, 'v');
    await gesture(page, 'v', slow(-w * 0.3), { up: null });
    const [a, b] = [await drawn(panel(page, 'v', 'overview')), await drawn(panel(page, 'v', 'activity'))];
    expect(a).toMatchObject({ opacity: 1, blur: 0 });
    expect(b).toMatchObject({ opacity: 1, blur: 0 });
    expect(a.x).toBeCloseTo(-0.3 * w, 0);
    expect(b.x).toBeCloseTo(0.7 * w, 0);
    await lift(page, 'v');
  });

  test('TBV-6: a selection or a drag during a switch ends it at once, as if finished, and starts from its panel; the first appearance and a change of panels show the panel at once', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('v')], reducedMotion: false });
    await unhurried(page);
    // First appearance: no switch.
    expect(await switches(page, 'v')).toBe(0);
    await tabAt(page, 'v', 1).click();
    await holdSwitch(page, 'v', 0.3);
    // Another selection before it ends: Overview is gone at once, and the next switch starts from Activity.
    await tabAt(page, 'v', 2).click();
    expect(await switches(page, 'v')).toBe(1);
    await holdSwitch(page, 'v', 0);
    await expect(panel(page, 'v', 'overview')).toBeHidden();
    expect(await drawn(panel(page, 'v', 'activity'))).toMatchObject({ x: 0, opacity: 1, visible: true, inert: true });
    await holdSwitch(page, 'v', 0.3);
    // A drag before it ends: the switch ends at once and the drag starts from Settings.
    const w = await width(page, 'v');
    await gesture(page, 'v', slow(w * 0.25), { up: null });
    expect(await switches(page, 'v')).toBe(0);
    await expect(panel(page, 'v', 'overview')).toBeHidden();
    expect(await offset(page, 'v')).toBeCloseTo(-0.25, 3);
    expect((await drawn(panel(page, 'v', 'activity'))).visible).toBe(true);
    await lift(page, 'v');
    await finishSwitch(page, 'v');
    // Panels given other values: the selected tab's panel at once, without a switch.
    await panel(page, 'v', 'settings').evaluate((el: any) => (el.value = 'elsewhere'));
    await view(page, 'v').locator('tanrei-tab-panel').nth(1).evaluate((el: any) => (el.value = 'settings'));
    await expect(view(page, 'v').locator('tanrei-tab-panel').nth(1)).toBeVisible();
    expect(await switches(page, 'v')).toBe(0);
    // A panel added for the selected value, before the others: shown at once.
    await view(page, 'v').evaluate((el) => el.prepend(Object.assign(document.createElement('tanrei-tab-panel'), { value: 'settings', textContent: 'New settings' })));
    await expect(view(page, 'v').locator('tanrei-tab-panel').first()).toBeVisible();
    await expect(view(page, 'v').locator('tanrei-tab-panel').nth(2)).toBeHidden();
    expect(await switches(page, 'v')).toBe(0);
  });

  test('TBV-7: where motion is reduced only the fade is left — a drag crossfades with the finger, a switch runs over the fade’s motion — and the offset follows the finger and returns at once', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('v')], reducedMotion: true });
    await unhurried(page);
    await wire(page);
    const w = await width(page, 'v');
    const opacity = Number(await page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), T('transition-opacity')));
    const now = await gesture(page, 'v', slow(-w / 2), { up: null });
    expect(now.offset).toBeCloseTo(0.5, 3);
    const [a, b] = [await drawn(panel(page, 'v', 'overview')), await drawn(panel(page, 'v', 'activity'))];
    expect([a.x, a.blur, b.x, b.blur]).toEqual([0, 0, 0, 0]);
    expect(a.opacity).toBeCloseTo(1 - 0.5 * (1 - opacity), 2);
    expect(b.opacity).toBeCloseTo(1 - 0.5 * (1 - opacity), 2);
    // Released past half: committed, the offset back at once, the rest of the fade over the fade's motion.
    const released = await gesture(page, 'v', [{ x: -w * 0.55, dt: 16 }], { up: 300 });
    expect([released.value, released.offset]).toEqual(['activity', 0]);
    const [duration, easing] = [await resolveToken(page, T('motion-fade-duration'), 'duration'), await easingToken(page, T('motion-fade-easing'))];
    let held = await holdSwitch(page, 'v', 0.5);
    expect([held.duration, held.easing]).toEqual([duration, easing]);
    expect((await drawn(panel(page, 'v', 'activity'))).x).toBe(0);
    await finishSwitch(page, 'v');
    // A switch from a tab: the fade alone, over the fade's motion.
    await tabAt(page, 'v', 2).click();
    held = await holdSwitch(page, 'v', 0.5);
    expect([held.duration, held.easing]).toEqual([duration, easing]);
    const [c, d] = [await drawn(panel(page, 'v', 'activity')), await drawn(panel(page, 'v', 'settings'))];
    expect([c.x, c.blur, d.x, d.blur]).toEqual([0, 0, 0, 0]);
    await finishSwitch(page, 'v');
    expect(await log(page)).toEqual(['tanrei-tab-view:activity:activity:activity', 'tanrei-tab-view:settings:settings:settings']);
  });
});

test.describe('semantics, focus and layout', () => {
  test('TBV-9: the shown panel is the tab panel, named by its tab and controlled by it; the others hidden from assistive technology and focus, a drawn one too; exposure moves at the selection; an empty panel is a Tab stop', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('v', [p('overview'), p('activity', '<button id="in-activity">Open activity</button>'), p('settings')])], reducedMotion: false });
    await unhurried(page);
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
    await expect(page.getByRole('tabpanel', { name: 'Overview' })).toHaveCount(1);
    const [tabId, panelId] = [await tabAt(page, 'v', 0).getAttribute('id'), await panel(page, 'v', 'overview').getAttribute('id')];
    await expect(panel(page, 'v', 'overview')).toHaveAttribute('aria-labelledby', tabId!);
    await expect(tabAt(page, 'v', 0)).toHaveAttribute('aria-controls', panelId!);
    await expect(tabAt(page, 'v', 1)).toHaveAttribute('aria-controls', (await panel(page, 'v', 'activity').getAttribute('id'))!);
    for (const v of ['activity', 'settings']) {
      await expect(panel(page, 'v', v)).toHaveAttribute('hidden', '');
      await expect(panel(page, 'v', v)).toHaveAttribute('inert', '');
      await expect(panel(page, 'v', v)).toHaveAttribute('role', 'tabpanel');
    }
    // An empty panel is a Tab stop; one with a control is not. Tab goes from the selected tab into the panel.
    await expect(panel(page, 'v', 'overview')).toHaveAttribute('tabindex', '0');
    await tabAt(page, 'v', 0).focus();
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.getAttribute('value'))).toBe('overview');
    // Mid-drag the incoming panel is drawn but inert and hidden from assistive technology.
    const w = await width(page, 'v');
    await gesture(page, 'v', slow(-w * 0.3), { up: null });
    await expect(panel(page, 'v', 'activity')).toHaveAttribute('inert', '');
    await expect(panel(page, 'v', 'activity')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
    await lift(page, 'v');
    await finishSwitch(page, 'v');
    // At the selection, not when the drawing ends: Activity is the tab panel while Overview is still drawn.
    await tabAt(page, 'v', 1).click();
    await holdSwitch(page, 'v', 0.2);
    await expect(page.getByRole('tabpanel', { name: 'Activity' })).toHaveCount(1);
    await expect(panel(page, 'v', 'overview')).toHaveAttribute('inert', '');
    await expect(panel(page, 'v', 'overview')).toHaveAttribute('aria-hidden', 'true');
    expect((await drawn(panel(page, 'v', 'overview'))).visible).toBe(true);
    await expect(panel(page, 'v', 'activity')).not.toHaveAttribute('tabindex');
    await expect(panel(page, 'v', 'activity')).not.toHaveAttribute('inert');
    await finishSwitch(page, 'v');
  });

  test('TBV-10: a switch that hides the panel holding focus moves it to the selected tab; an empty panel’s keyboard focus ring is inside the container’s edge, in its corners, without animation, and not for pointer focus; glow under acme', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('v', [p('overview', '<button id="in-overview">Open overview</button>'), p('activity'), p('settings')])], reducedMotion: false });
    await page.locator('#in-overview').focus();
    await view(page, 'v').evaluate((el: any) => (el.value = 'activity'));
    await expect.poll(() => page.evaluate(() => (document.activeElement as any)?.value)).toBe('activity');
    expect(await page.evaluate(() => document.activeElement?.localName)).toBe('tanrei-tab');
    await finishSwitch(page, 'v');
    // Keyboard focus on the empty Activity panel: the ring inside its edge, never animated.
    const outer = await resolveToken(page, '--tanrei-sys-focus-outer-width');
    const box = panel(page, 'v', 'activity').locator('.panel');
    await tabTo(page, panel(page, 'v', 'activity'));
    await expect(box).toHaveCSS('outline-style', 'solid');
    await expect(box).toHaveCSS('outline-offset', `${-outer}px`);
    expect(await css(box, 'transition-property')).not.toContain('outline');
    // Its corners follow the container's shape.
    await override(page, { [T('container-shape')]: '12px' });
    await expect.poll(async () => Number.parseFloat(await css(box, 'border-top-left-radius'))).toBeCloseTo(12, 1);
    // Pointer focus shows nothing.
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await panel(page, 'v', 'activity').click();
    await expect(box).toHaveCSS('outline-style', 'none');

    await mountFixtures(page, spec, { fixtures: [fixture('v')], system: 'acme', systemCss: await acmeSystemCss() });
    await override(page, { '--tanrei-sys-focus-inner-width': '1px', '--tanrei-sys-color-focus-ring-inner': 'rgb(255, 255, 255)' });
    await tabTo(page, panel(page, 'v', 'overview'));
    const glow = panel(page, 'v', 'overview').locator('.panel');
    expect(await css(glow, 'outline-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(glow, 'box-shadow', '::after')).toContain('rgb(255, 255, 255) 0px 0px 1px 1px');
    await expect(panel(page, 'v', 'overview')).toHaveAttribute('data-focus-style', 'glow');
  });

  test('TBV-11: as wide as its parent and as tall as its own row plus the shown panel (the panel alone, linked); the row at the top across the width, the container right under it; the taller of two panels during a switch, the new height at once when it ends; a sized view keeps its row and fills each panel below it, which scrolls', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false });
    await unhurried(page);
    const short = await bounds(view(page, 'default'));
    const tall = await bounds(view(page, 'tall-panel'));
    const top = await bounds(ownRow(page, 'default'));
    expect(short.width).toBe(360);
    // The row at the view's top edge, across its whole width, the container directly below it with no space between.
    expect([top.x, top.y, top.width]).toEqual([short.x, short.y, short.width]);
    expect((await bounds(container(page, 'default'))).y).toBeCloseTo(top.y + top.height, 1);
    expect(short.height).toBeCloseTo(top.height + (await bounds(panel(page, 'default', 'overview'))).height, 1);
    expect(tall.height).toBeCloseTo(top.height + (await bounds(panel(page, 'tall-panel', 'settings'))).height, 1);
    expect(tall.height).toBeGreaterThan(short.height);
    // Linked, the view draws no row: it is as tall as its panel.
    expect((await bounds(view(page, 'linked'))).height).toBeCloseTo((await bounds(panel(page, 'linked', 'overview'))).height, 1);
    // During a switch from the tall panel to a short one: the taller; then the short one's at once.
    await tabAt(page, 'tall-panel', 0).click();
    await holdSwitch(page, 'tall-panel', 0.5);
    expect((await bounds(view(page, 'tall-panel'))).height).toBeCloseTo(tall.height, 1);
    await finishSwitch(page, 'tall-panel');
    expect((await bounds(view(page, 'tall-panel'))).height).toBeCloseTo(top.height + (await bounds(panel(page, 'tall-panel', 'overview'))).height, 1);
    // Sized by the product: the row keeps its height at the top; each panel fills the rest and scrolls inside it.
    await view(page, 'tall-panel').evaluate((el, h) => ((el as HTMLElement).style.blockSize = `${h}px`), top.height + 48);
    await tabAt(page, 'tall-panel', 2).click();
    await finishSwitch(page, 'tall-panel');
    const settings = panel(page, 'tall-panel', 'settings');
    expect((await bounds(ownRow(page, 'tall-panel'))).height).toBeCloseTo(top.height, 1);
    expect((await bounds(settings)).height).toBeCloseTo(48, 1);
    expect((await bounds(settings)).y).toBeCloseTo((await bounds(ownRow(page, 'tall-panel'))).y + top.height, 1);
    expect(await css(settings, 'overflow-y')).toBe('auto');
    expect(await settings.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  });

  test('TBV-12: a hidden panel is kept with its state — what was typed and where it was scrolled — and never recreated', async ({ page }) => {
    const markup = `<input id="note" aria-label="Note" /><div id="log" style="block-size:40px;overflow-y:auto"><div style="block-size:400px">Log</div></div>`;
    await mountFixtures(page, spec, { fixtures: [fixture('v', [p('overview', markup), p('activity'), p('settings')])], reducedMotion: true });
    await page.locator('#note').fill('Draft');
    await page.locator('#log').evaluate((el) => (el.scrollTop = 120));
    const before = await panel(page, 'v', 'overview').evaluate((el) => ((window as any).kept = el) && true);
    expect(before).toBe(true);
    await tabAt(page, 'v', 1).click();
    await finishSwitch(page, 'v');
    await expect(panel(page, 'v', 'overview')).toBeHidden();
    await tabAt(page, 'v', 0).click();
    await finishSwitch(page, 'v');
    await expect(page.locator('#note')).toHaveValue('Draft');
    expect(await page.locator('#log').evaluate((el) => el.scrollTop)).toBe(120);
    expect(await panel(page, 'v', 'overview').evaluate((el) => (window as any).kept === el)).toBe(true);
  });

  test('TBV-13: right-to-left mirrors the drag and the travel: a drag toward the right goes to the next tab and a panel leaves by the right; the content is not mirrored', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('v')], reducedMotion: false });
    await unhurried(page);
    await page.locator('[data-fixture="v"]').evaluate((el) => el.setAttribute('dir', 'rtl'));
    const w = await width(page, 'v');
    const D = await resolveToken(page, T('transition-distance'));
    const now = await gesture(page, 'v', slow(w * 0.3), { up: null });
    expect(now.offset).toBeCloseTo(0.3, 3);
    expect((await drawn(panel(page, 'v', 'overview'))).x).toBeCloseTo(0.3 * D, 1);
    expect((await drawn(panel(page, 'v', 'activity'))).x).toBeCloseTo(-0.7 * D, 1);
    await lift(page, 'v');
    await finishSwitch(page, 'v');
    // A switch from a tab: Overview leaves by the right, the start edge.
    await tabAt(page, 'v', 1).click();
    const held = await holdSwitch(page, 'v', 0.5);
    expect((await drawn(panel(page, 'v', 'overview'))).x).toBeCloseTo(held.progress * D, 1);
    await finishSwitch(page, 'v');
    // Nothing mirrors the panel's content itself; its own row mirrors as the tabs do (TAB-21): the first tab on the right.
    expect(await css(panel(page, 'v', 'activity'), 'transform')).toBe('none');
    expect((await bounds(tabAt(page, 'v', 0))).x).toBeGreaterThan((await bounds(tabAt(page, 'v', 1))).x);
  });
});

test.describe('without tabs, and odd panels', () => {
  test('TBV-14: while tabs names a missing row the view draws no row, shows the panel of its value (the first while null), takes no drag, exposes no tab panel and reports; a selected tab without a panel shows none and is reported; its own row with no panel has no tab, reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [fixture('alone')], reducedMotion: false });
    await view(page, 'alone').evaluate((el: any) => (el.tabs = 'nowhere'));
    await expect(ownRow(page, 'alone')).toHaveCount(0);
    await expect(panel(page, 'alone', 'overview')).toBeVisible();
    await expect(page.getByRole('tabpanel')).toHaveCount(0);
    await expect(panel(page, 'alone', 'overview')).not.toHaveAttribute('role');
    const w = await width(page, 'alone');
    const now = await gesture(page, 'alone', slow(-w * 0.8));
    expect(now.value).toBeNull();
    await expect(panel(page, 'alone', 'activity')).toBeHidden();
    await view(page, 'alone').evaluate((el: any) => (el.value = 'settings'));
    await expect(panel(page, 'alone', 'settings')).toBeVisible();
    await expect(panel(page, 'alone', 'overview')).toBeHidden();
    await expect.poll(() => seen.some((w) => /tabs="nowhere" names no <tanrei-tabs> in this tree; its panels have no tabs \(TBV-14\)/.test(w))).toBe(true);
    // A selected tab without a panel (the `missing-panel` fixture, linked): none is shown, and it is reported.
    await mountFixtures(page, spec, { fixtures: spec.fixtures.filter((f) => f.id === 'missing-panel') });
    for (const v of ['overview', 'settings']) await expect(panel(page, 'missing-panel', v)).toBeHidden();
    await expect(tabAt(page, 'missing-panel', 1)).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => seen.some((w) => /the selected tab "activity" has no panel; none is shown \(TBV-14\)/.test(w))).toBe(true);
    // Its own row and no panel: the row is drawn, with no tab, and it is reported.
    await mountFixtures(page, spec, { fixtures: [fixture('empty', [], { label: 'Project' })] });
    await expect(ownRow(page, 'empty')).toHaveCount(1);
    await expect(ownRow(page, 'empty').locator('tanrei-tab')).toHaveCount(0);
    await expect(page.getByRole('tablist', { name: 'Project' })).toHaveCount(1);
    await expect.poll(() => seen.some((w) => /it holds no <tanrei-tab-panel>, so its own row has no tab \(TBV-14\)/.test(w))).toBe(true);
  });

  test('TBV-15: empty and repeated panel values are held and reported, only the first panel with a value shown and given a tab of its own row; linked, a panel whose value is no tab’s is reported, and the tabs’ own panels stay hidden, the view’s taking their place, reported', async ({ page }) => {
    const seen = warnings(page);
    const odd = [p(''), p('overview', 'First overview'), p('overview', 'Second overview'), p('elsewhere'), p('activity'), p('settings')];
    // Its own row: one tab for each value shown, in the panels' order.
    await mountFixtures(page, spec, { fixtures: [fixture('own', odd)] });
    await expect(view(page, 'own').locator('tanrei-tab-panel')).toHaveCount(6);
    await expect(ownRow(page, 'own').locator('tanrei-tab')).toHaveCount(4);
    expect(await ownRow(page, 'own').locator('tanrei-tab').evaluateAll((tabs) => tabs.map((tab: any) => tab.value))).toEqual(['overview', 'elsewhere', 'activity', 'settings']);
    await expect(view(page, 'own').locator('tanrei-tab-panel').nth(1)).toBeVisible();
    for (const n of [0, 2, 3]) await expect(view(page, 'own').locator('tanrei-tab-panel').nth(n)).toBeHidden();
    await expect.poll(() => seen.filter((w) => w.includes('TBV-15')).length).toBe(2);
    expect(seen.join('\n')).toMatch(/panel 1 has an empty value; it is never shown and has no tab/);
    expect(seen.join('\n')).toMatch(/the value "overview" is given to more than one panel; only the first of them is shown and has a tab/);
    expect(seen.join('\n')).not.toMatch(/the value of no tab/);

    // Linked: the same, and the panel "elsewhere" has no tab of the linked row.
    seen.length = 0;
    await mountFixtures(page, spec, { fixtures: [fixture('v', odd, { tabs: 'x' })] });
    await expect(view(page, 'v').locator('tanrei-tab-panel').nth(1)).toBeVisible();
    for (const n of [0, 2, 3]) await expect(view(page, 'v').locator('tanrei-tab-panel').nth(n)).toBeHidden();
    await expect.poll(() => seen.filter((w) => w.includes('TBV-15')).length).toBe(3);
    expect(seen.join('\n')).toMatch(/panel 1 has an empty value; it is never shown \(TBV-15\)/);
    expect(seen.join('\n')).toMatch(/the value "overview" is given to more than one panel; only the first of them is shown \(TBV-15\)/);
    expect(seen.join('\n')).toMatch(/the panel "elsewhere" has the value of no tab of the linked tabs/);
    // The tabs hold a panel of their own: it stays hidden, the tab controls the view's panel, and it is reported.
    await row(page, 'v').evaluate((el) => el.append(Object.assign(document.createElement('tanrei-tab-panel'), { value: 'overview', textContent: 'The row’s own' })));
    const own = row(page, 'v').locator('tanrei-tab-panel');
    await expect(own).toBeHidden();
    await expect(tabAt(page, 'v', 0)).toHaveAttribute('aria-controls', (await view(page, 'v').locator('tanrei-tab-panel').nth(1).getAttribute('id'))!);
    await expect.poll(() => seen.some((w) => /the linked <tanrei-tabs> hold 1 panel\(s\) of their own/.test(w))).toBe(true);
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
  });
});

test.describe('its own row, or a link', () => {
  test('TBV-16: with tabs empty the view draws its own row — a Tabs, its first child, above the container — one tab per panel from the panel’s value, label, icon, labelHidden and disabled, the row’s variant, fullWidth and label the view’s; the row follows the panels in the same frame, and the panels are kept', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    // default: a primary row that hugs, named by the view's label, with the panels' labels.
    const first = ownRow(page, 'default');
    await expect(first).toHaveCount(1);
    expect(await view(page, 'default').evaluate((el) => el.firstElementChild?.localName)).toBe('tanrei-tabs');
    await expect(first).toHaveAttribute('slot', 'tabs');
    expect(await first.evaluate((el: any) => [el.variant, el.fullWidth, el.label])).toEqual(['primary', false, 'Project']);
    await expect(page.locator('[data-fixture="default"]').getByRole('tablist', { name: 'Project' })).toHaveCount(1);
    expect(await first.locator('tanrei-tab').evaluateAll((tabs) => tabs.map((tab: any) => [tab.value, tab.label, tab.icon, tab.labelHidden, tab.disabled]))).toEqual([
      ['overview', 'Overview', '', false, false],
      ['activity', 'Activity', '', false, false],
      ['settings', 'Settings', '', false, false],
    ]);
    await expect(page.locator('[data-fixture="default"]').getByRole('tab', { name: 'Activity' })).toHaveAttribute('aria-controls', (await panel(page, 'default', 'activity').getAttribute('id'))!);
    // The view's variant and full-width reach the row (secondary-fill), and each panel's icon (icons) and disabled
    // (disabled-tab).
    expect(await ownRow(page, 'secondary-fill').evaluate((el: any) => [el.variant, el.fullWidth, el.getAttribute('variant'), el.hasAttribute('full-width')])).toEqual(['secondary', true, 'secondary', true]);
    expect(await ownRow(page, 'icons').locator('tanrei-tab').evaluateAll((tabs) => tabs.map((tab: any) => tab.icon))).toEqual(['dashboard', 'history', 'settings']);
    await expect(tabAt(page, 'icons', 0).locator('[part="icon"]')).toHaveText('dashboard');
    await expect(tabAt(page, 'disabled-tab', 2)).toHaveAttribute('aria-disabled', 'true');
    await expect(tabAt(page, 'disabled-tab', 2)).toHaveAttribute('disabled', '');
    // The view's props follow at run time.
    await view(page, 'default').evaluate((el: any) => Object.assign(el, { variant: 'secondary', fullWidth: true, label: 'Views' }));
    await expect.poll(() => first.evaluate((el: any) => [el.variant, el.fullWidth, el.label])).toEqual(['secondary', true, 'Views']);

    // A panel given another label and icon: its tab changes in the same frame, the panel and its state kept (TBV-12).
    const markup = `<input id="note" aria-label="Note" />`;
    await mountFixtures(page, spec, { fixtures: [fixture('v', [p('overview', markup), p('activity'), p('settings')])], icons: true });
    await page.locator('#note').fill('Draft');
    await panel(page, 'v', 'overview').evaluate((el) => ((window as any).kept = el));
    const frame = await page.evaluate(async () => {
      const panel = document.querySelector<any>('tanrei-tab-panel[value="overview"]')!;
      const tab = document.querySelector<any>('tanrei-tab-view > tanrei-tabs > tanrei-tab')!;
      panel.label = 'Summary';
      panel.icon = 'dashboard';
      panel.labelHidden = true;
      // Read in the next frame's animation callbacks, before it is painted.
      return new Promise<string[]>((resolve) =>
        requestAnimationFrame(() => resolve([tab.label, tab.icon, String(tab.labelHidden), tab.getAttribute('aria-label'), tab.shadowRoot.querySelector('[part="icon"]')?.textContent ?? ''])),
      );
    });
    expect(frame).toEqual(['Summary', 'dashboard', 'true', 'Summary', 'dashboard']);
    await expect(page.locator('#note')).toHaveValue('Draft');
    expect(await panel(page, 'v', 'overview').evaluate((el) => (window as any).kept === el)).toBe(true);
    // Disabled, added, removed and reordered, each in the same frame.
    const tabsNow = () =>
      page.evaluate(
        () =>
          new Promise<string[]>((resolve) =>
            requestAnimationFrame(() => resolve([...document.querySelectorAll<any>('tanrei-tab-view > tanrei-tabs > tanrei-tab')].map((tab) => `${tab.value}${tab.disabled ? '!' : ''}`))),
          ),
      );
    await panel(page, 'v', 'settings').evaluate((el: any) => (el.disabled = true));
    expect(await tabsNow()).toEqual(['overview', 'activity', 'settings!']);
    await view(page, 'v').evaluate((el) => el.append(Object.assign(document.createElement('tanrei-tab-panel'), { value: 'billing', label: 'Billing', textContent: 'Invoices' })));
    expect(await tabsNow()).toEqual(['overview', 'activity', 'settings!', 'billing']);
    await panel(page, 'v', 'activity').evaluate((el) => el.remove());
    expect(await tabsNow()).toEqual(['overview', 'settings!', 'billing']);
    await view(page, 'v').evaluate((el) => el.append(el.querySelector('tanrei-tab-panel[value="overview"]')!));
    expect(await tabsNow()).toEqual(['settings!', 'billing', 'overview']);
    // The row is a Tabs in every respect: the arrow keys select the next enabled tab (TAB-12), and the panel follows.
    // (Settings is disabled, so the first enabled tab, Billing, is the selected one while the view's value is null.)
    await expect(tabAt(page, 'v', 1)).toHaveAttribute('aria-selected', 'true');
    await tabAt(page, 'v', 1).focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => value(page, 'v')).toBe('overview');
    await finishSwitch(page, 'v');
    await expect(panel(page, 'v', 'overview')).toBeVisible();
  });

  test('TBV-17: while tabs names a row the view draws none (the row’s props and the panels’ tab props unused, reported); changing tabs at run time removes or draws its own row at once, keeps the selection and shows its panel at once', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [...spec.fixtures.filter((f) => f.id === 'linked'), fixture('both', THREE, { tabs: 'x', variant: 'secondary', fullWidth: true, label: 'Project' })], reducedMotion: false });
    // linked: the row above the view names the panels; the view draws none of its own.
    await expect(ownRow(page, 'linked')).toHaveCount(0);
    await expect(page.locator('#tabs-linked')).toHaveCount(1);
    await expect(page.getByRole('tabpanel', { name: 'Overview' }).first()).toHaveAttribute('aria-labelledby', (await tabAt(page, 'linked', 0).getAttribute('id'))!);
    // Both given: the link wins, the row's props and the panels' labels are unused, and the three props are reported.
    await expect(ownRow(page, 'both')).toHaveCount(0);
    expect(await page.locator('#tabs-both').evaluate((el: any) => [el.variant, el.fullWidth])).toEqual(['primary', false]);
    await expect.poll(() => seen.some((w) => /variant, full-width, label apply only to a row the view draws itself; linked to other tabs, the view draws none and they are unused \(TBV-17\)/.test(w))).toBe(true);
    expect(seen.filter((w) => w.includes('TBV-17') && w.includes('<tanrei-tab-view>'))).toHaveLength(1);

    // Switching form at run time: own row → linked → own row, the selection kept, the panel shown at once.
    await mountFixtures(page, spec, { fixtures: [fixture('v', THREE, { selected: 'activity' })], reducedMotion: false });
    await page.locator('[data-fixture="v"]').evaluate((stage) =>
      stage.insertAdjacentHTML(
        'afterbegin',
        '<tanrei-tabs id="outside" label="Outside"><tanrei-tab value="overview" label="Overview"></tanrei-tab><tanrei-tab value="activity" label="Activity"></tanrei-tab><tanrei-tab value="settings" label="Settings"></tanrei-tab></tanrei-tabs>',
      ),
    );
    const outside = page.locator('#outside');
    const own = await ownRow(page, 'v').elementHandle();
    await view(page, 'v').evaluate((el: any) => (el.tabs = 'outside'));
    await expect(ownRow(page, 'v')).toHaveCount(0);
    expect(await own!.evaluate((el) => el.isConnected)).toBe(false);
    // The view's selection is given to the newly linked row, and its panel is shown without a switch.
    await expect.poll(() => outside.evaluate((el: any) => el.value)).toBe('activity');
    expect(await switches(page, 'v')).toBe(0);
    await expect(panel(page, 'v', 'activity')).toBeVisible();
    await expect(panel(page, 'v', 'activity')).toHaveAttribute('aria-labelledby', (await outside.locator('tanrei-tab').nth(1).getAttribute('id'))!);
    await outside.locator('tanrei-tab').nth(2).click();
    await finishSwitch(page, 'v');
    expect(await value(page, 'v')).toBe('settings');
    // Back to its own row: drawn at once, first, with the selection kept, and no switch.
    await view(page, 'v').evaluate((el: any) => (el.tabs = ''));
    await expect(ownRow(page, 'v')).toHaveCount(1);
    expect(await view(page, 'v').evaluate((el) => el.firstElementChild?.localName)).toBe('tanrei-tabs');
    expect(await ownRow(page, 'v').evaluate((el: any) => el.value)).toBe('settings');
    const ownTab = (n: number) => ownRow(page, 'v').locator('tanrei-tab').nth(n);
    await expect(ownTab(2)).toHaveAttribute('aria-selected', 'true');
    expect(await switches(page, 'v')).toBe(0);
    await expect(panel(page, 'v', 'settings')).toBeVisible();
    await expect(panel(page, 'v', 'settings')).toHaveAttribute('aria-labelledby', (await ownTab(2).getAttribute('id'))!);
    // The outside row no longer controls the panels.
    await expect(outside.locator('tanrei-tab').nth(2)).not.toHaveAttribute('aria-controls');
    // tabsElement links an element itself (no row of its own), and null gives the view its own row back.
    await view(page, 'v').evaluate((el: any) => (el.tabsElement = document.getElementById('outside')));
    await expect(ownRow(page, 'v')).toHaveCount(0);
    await expect.poll(() => outside.evaluate((el: any) => el.value)).toBe('settings');
    await view(page, 'v').evaluate((el: any) => (el.tabsElement = null));
    await expect(ownRow(page, 'v')).toHaveCount(1);
    await expect(panel(page, 'v', 'settings')).toBeVisible();
  });

  test('TBV-18: with its own row the view announces every selection once — a tab tapped, each arrow key, a committed swipe — its value set first, and the row’s own change never reaches the product; a selection by the product and a cancelled swipe announce nothing', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('v')], reducedMotion: true });
    // Heard on the view's parent, and in the capture phase on the document, before anything could stop it.
    await page.evaluate(() => {
      const heard: string[] = ((window as any).heard = []);
      const stage = document.querySelector('[data-fixture="v"]')!;
      stage.addEventListener('change', (e) => heard.push(`parent ${(e.target as Element).localName}:${(e as CustomEvent).detail.value}:${(e.target as any).value}`));
      document.addEventListener('change', (e) => heard.push(`capture ${(e.target as Element).localName}`), { capture: true });
    });
    const heard = () => page.evaluate(() => (window as any).heard.splice(0) as string[]);
    await tabAt(page, 'v', 1).click();
    expect(await heard()).toEqual(['capture tanrei-tab-view', 'parent tanrei-tab-view:activity:activity']);
    await finishSwitch(page, 'v');
    // Each arrow key that selects a tab: one change each.
    await tabAt(page, 'v', 1).focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    expect(await heard()).toEqual(['capture tanrei-tab-view', 'parent tanrei-tab-view:settings:settings', 'capture tanrei-tab-view', 'parent tanrei-tab-view:activity:activity']);
    await finishSwitch(page, 'v');
    // A committed swipe: one; a cancelled one: none.
    const w = await width(page, 'v');
    await gesture(page, 'v', slow(-w * 0.6));
    expect(await heard()).toEqual(['capture tanrei-tab-view', 'parent tanrei-tab-view:settings:settings']);
    await finishSwitch(page, 'v');
    await gesture(page, 'v', slow(w * 0.3));
    await finishSwitch(page, 'v');
    expect(await heard()).toEqual([]);
    // Set by the product, on the view: none.
    await view(page, 'v').evaluate((el: any) => (el.value = 'overview'));
    await expect.poll(() => tabsValue(page, 'v')).toBe('overview');
    await finishSwitch(page, 'v');
    expect(await heard()).toEqual([]);
  });
});

// A shared choice (TBV-20, TBV-21): the spec's two fixtures name the group the tabs' fixtures of the same
// ids name; a test stages them — and views of its own — in one document.
const sharedFixture = (id: string) => spec.fixtures.find((f) => f.id === id)!;
const FOUR = [p('web', 'Add the element to the page.'), p('react', 'Import the component and render it.'), p('swiftui', 'Add the Swift package, import the module and place the view in a body.'), p('flutter', 'Add the package and place the widget.')];
/** Every `change` the document hears: the fixture and the element it came from, and the value it carried. */
const hear = (page: P) =>
  page.evaluate(() => {
    const heard: string[] = ((window as any).heard = []);
    // (A native control in a panel fires `change` too; it is not a selection.)
    document.addEventListener('change', (e) => {
      const target = e.target as Element;
      if (target.localName.startsWith('tanrei-')) heard.push(`${target.closest('[data-fixture]')?.getAttribute('data-fixture')}:${target.localName}:${(e as CustomEvent).detail?.value}`);
    });
  });
const heard = (page: P) => page.evaluate(() => (window as any).heard as string[]);
/** What a view shows: its value, its tabs' and the one panel that is not hidden — the same tab's, or the mismatch. */
const shows = (page: P, id: string) =>
  view(page, id).evaluate((el: any) => {
    const open = [...el.querySelectorAll(':scope > tanrei-tab-panel')].filter((each: any) => !each.hasAttribute('hidden') && !each.hasAttribute('inert')).map((each: any) => each.value);
    const tabs = el.tabsElement?.value;
    // While `value` is null the tabs select their first enabled tab (TAB-11).
    return open.length === 1 && (el.value ?? open[0]) === open[0] && tabs === el.value ? (open[0] as string) : `${el.value}/${tabs}/${open.join(',')}`;
  });
const showsAll = (page: P, ids: string[]) => Promise.all(ids.map((id) => shows(page, id)));
/** A person uses the tab of `value` on a view's row in the page — focus on it, then its activation — and one frame passes. */
const useTab = (page: P, id: string, value: string, { focus = true } = {}) =>
  row(page, id)
    .locator(`tanrei-tab[value="${value}"]`)
    .evaluate(async (el: HTMLElement, focus) => {
      if (focus) el.focus({ preventScroll: true });
      el.click();
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }, focus);
const frames = (page: P, n = 2) =>
  page.evaluate(async (count) => {
    for (let i = 0; i < count; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  }, n);

test.describe('a shared choice', () => {
  test('TBV-20: a view whose tabs follow their group’s choice shows the panel at once — whole, at rest, sharp, as tall as it — keeps the panel it hides, moves the exposure in that frame and emits nothing, while the view acted on is part of the way through its switch; a view without a panel of the choice keeps its own (TAB-36)', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: [sharedFixture('shared-choice'), sharedFixture('shared-choice-lacking'), fixture('other', FOUR, { label: 'Platform', selected: 'flutter', group: 'another' })] });
    await hear(page);
    await override(page, { [T('motion-switch-duration')]: '60s' });
    const [a, b] = ['shared-choice', 'shared-choice-lacking'];
    // A group holds no choice until someone makes one: each view is drawn with its own selected.
    expect(await showsAll(page, [a, b, 'other'])).toEqual(['flutter', 'react', 'flutter']);
    const kept = await panel(page, b, 'react').evaluate((el) => ((el as any).mark = 'kept'));
    await useTab(page, a, 'web');
    // One frame on: the follower shows its Web panel whole; the view acted on is on its way.
    expect(await switches(page, a)).toBe(1);
    expect(await switches(page, b)).toBe(0);
    expect(await drawn(panel(page, b, 'web'))).toEqual({ x: 0, opacity: 1, blur: 0, hidden: false, inert: false, visible: true });
    expect(await drawn(panel(page, b, 'react'))).toMatchObject({ hidden: true, inert: true, visible: false });
    expect(await shows(page, b)).toBe('web');
    // As tall as its row and that panel (TBV-11), in that frame.
    const [whole, rowBox, shown] = [await bounds(view(page, b)), await bounds(ownRow(page, b)), await bounds(panel(page, b, 'web'))];
    expect(whole.height).toBeCloseTo(rowBox.height + shown.height, 0);
    // The exposure moved with it (TBV-9), and the hidden panel is the element it was (TBV-12).
    await expect(panel(page, b, 'web')).toHaveAttribute('role', 'tabpanel');
    await expect(panel(page, b, 'web')).toHaveAttribute('aria-labelledby', (await tabAt(page, b, 0).getAttribute('id'))!);
    expect(await tabAt(page, b, 0).getAttribute('aria-selected')).toBe('true');
    expect(await panel(page, b, 'react').evaluate((el) => (el as any).mark)).toBe(kept);
    // Announced once, by the view the person selected on (TBV-18).
    expect(await heard(page)).toEqual([`${a}:tanrei-tab-view:web`]);
    await finishSwitch(page, a);
    // A view that has no panel of the choice keeps its own; another group never changes.
    await useTab(page, a, 'swiftui');
    expect(await showsAll(page, [a, b, 'other'])).toEqual(['swiftui', 'web', 'flutter']);
    expect(await switches(page, b)).toBe(0);
    // A choice made on the second moves the first, at once.
    await finishSwitch(page, a);
    await useTab(page, b, 'react');
    expect(await showsAll(page, [a, b])).toEqual(['react', 'react']);
    expect([await switches(page, a), await switches(page, b)]).toEqual([0, 1]);
    expect(await heard(page)).toEqual([`${a}:tanrei-tab-view:web`, `${a}:tanrei-tab-view:swiftui`, `${b}:tanrei-tab-view:react`]);
  });

  test('TBV-20: a row of tabs placed by the product and a linked view are members with the views’ own rows; a view that follows keeps what was typed in the panel it hides, moves focus from that panel to its selected tab without scrolling, and ends a swipe in progress without committing it', async ({ page }) => {
    const typed = [p('web', '<input id="in-web" aria-label="Web" />'), p('react', '<input id="in-react" aria-label="React" />'), p('swiftui'), p('flutter')];
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: [fixture('a', FOUR, { label: 'Platform', selected: 'web', group: 'g' }), fixture('b', typed, { label: 'Platform', selected: 'react', group: 'g' })] });
    // A row placed by the product, in the same group (TAB-36), with a view linked to it.
    await page.evaluate(async () => {
      const stage = document.createElement('div');
      stage.className = 'stage';
      stage.dataset.fixture = 'placed';
      stage.innerHTML = `<tanrei-tabs id="placed-row" label="Platform" group="g" value="web">${['web', 'react', 'swiftui'].map((v) => `<tanrei-tab value="${v}" label="${v}"></tanrei-tab>`).join('')}</tanrei-tabs>
        <tanrei-tab-view tabs="placed-row">${['web', 'react', 'swiftui'].map((v) => `<tanrei-tab-panel value="${v}"><p>View of ${v}</p></tanrei-tab-panel>`).join('')}</tanrei-tab-view>`;
      document.querySelector('main')!.append(stage);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    await hear(page);
    await override(page, { [T('motion-switch-duration')]: '60s' });
    expect(await showsAll(page, ['a', 'b', 'placed'])).toEqual(['web', 'react', 'web']);
    // The view's own row is a member: a choice on the placed row moves both views, and the linked view at once too.
    await page.locator('#in-react').fill('kept text');
    await page.locator('#in-react').focus();
    const scrolled = await page.evaluate(() => [scrollX, scrollY]);
    await useTab(page, 'placed', 'swiftui', { focus: false });
    expect(await showsAll(page, ['a', 'b', 'placed'])).toEqual(['swiftui', 'swiftui', 'swiftui']);
    expect([await switches(page, 'a'), await switches(page, 'b')]).toEqual([0, 0]);
    // The linked view is the view of the row acted on: it switches (TBV-2), and the row announces the choice.
    expect(await page.locator('[data-fixture="placed"] tanrei-tab-view').evaluate((el) => el.shadowRoot!.querySelector('.container')!.getAnimations().length)).toBe(1);
    expect(await heard(page)).toEqual(['placed:tanrei-tabs:swiftui']);
    // The panel that held focus is hidden: focus is on that view's selected tab (TBV-10), and nothing scrolled.
    expect(await page.evaluate(() => [document.activeElement?.localName, (document.activeElement as any)?.value, document.activeElement?.closest('[data-fixture]')?.getAttribute('data-fixture')])).toEqual(['tanrei-tab', 'swiftui', 'b']);
    expect(await page.evaluate(() => [scrollX, scrollY])).toEqual(scrolled);
    // What was typed is kept (TBV-12).
    await useTab(page, 'placed', 'react', { focus: false });
    expect(await page.locator('#in-react').inputValue()).toBe('kept text');
    // A swipe in progress on a follower ends without committing; nothing is emitted for it, and the release does nothing.
    const w = await width(page, 'b');
    await gesture(page, 'b', slow(-w * 0.7), { up: null });
    expect(await offset(page, 'b')).toBeCloseTo(0.7, 2);
    await useTab(page, 'placed', 'web', { focus: false });
    expect(await offset(page, 'b')).toBe(0);
    expect(await drawn(panel(page, 'b', 'web'))).toEqual({ x: 0, opacity: 1, blur: 0, hidden: false, inert: false, visible: true });
    expect(await switches(page, 'b')).toBe(0);
    await page.evaluate(() => document.querySelector('[data-fixture="b"] tanrei-tab-view')!.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 11, pointerType: 'touch', isPrimary: true })));
    expect(await showsAll(page, ['a', 'b', 'placed'])).toEqual(['web', 'web', 'web']);
    expect(await heard(page)).toEqual(['placed:tanrei-tabs:swiftui', 'placed:tanrei-tabs:react', 'placed:tanrei-tabs:web']);
  });

  test('TBV-2: a selection set by the product on a view’s selected switches that view over the switch’s motion, and the views that follow it show their panel at once; a choice restored from storage is shown in the view’s first frame, with no switch and nothing emitted (TBV-20, TAB-39)', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: [fixture('a', FOUR, { label: 'Platform', selected: 'web', group: 'p' }), fixture('b', FOUR, { label: 'Platform', selected: 'react', group: 'p' })] });
    await hear(page);
    await override(page, { [T('motion-switch-duration')]: '60s' });
    await view(page, 'a').evaluate(async (el: any) => {
      el.value = 'flutter';
      await el.updateComplete;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    expect(await showsAll(page, ['a', 'b'])).toEqual(['flutter', 'flutter']);
    expect([await switches(page, 'a'), await switches(page, 'b')]).toEqual([1, 0]);
    expect(await drawn(panel(page, 'b', 'flutter'))).toEqual({ x: 0, opacity: 1, blur: 0, hidden: false, inert: false, visible: true });
    expect(await heard(page)).toEqual([]);

    // Restored: a document with an origin, a stored value, and a recording from before the first element exists.
    const body = await fixturesDocument(spec, { fixtures: [fixture('r', FOUR, { label: 'Platform', selected: 'web', rememberAs: 'view-key' }), fixture('f', FOUR, { label: 'Platform', group: 'restored' }), fixture('k', FOUR, { label: 'Platform', group: 'restored', rememberAs: 'group-key' })] });
    await page.route('http://tab-view.test/**', (route) => route.fulfill({ contentType: 'text/html', body }));
    await page.addInitScript(() => {
      const w = window as any;
      [w.opened, w.writes] = [[], []];
      const { setItem } = Storage.prototype;
      Storage.prototype.setItem = function (key: string, value: string) {
        w.writes.push([key, value]);
        setItem.call(this, key, value);
      };
      document.addEventListener('change', (e) => w.opened.push(`change:${(e.target as Element).localName}`));
      new MutationObserver((records) => {
        for (const { target } of records) {
          const el = target as Element;
          if (el.localName === 'tanrei-tab' && el.getAttribute('aria-selected') === 'true') w.opened.push(`${el.closest('[data-fixture]')?.getAttribute('data-fixture')}:${el.getAttribute('value')}`);
        }
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ['aria-selected'] });
      new MutationObserver(() => {
        for (const el of document.querySelectorAll('tanrei-tab-view')) if (el.shadowRoot?.querySelector('.container')?.getAnimations().length) w.opened.push('switch');
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ['hidden', 'style'] });
    });
    await page.goto('http://tab-view.test/');
    await page.evaluate(() => {
      localStorage.setItem('view-key', 'swiftui');
      localStorage.setItem('group-key', 'react');
    });
    await page.reload();
    await page.waitForFunction(() => !!customElements.get('tanrei-tab-view'));
    await frames(page);
    expect(await showsAll(page, ['r', 'f', 'k'])).toEqual(['swiftui', 'react', 'react']);
    expect(await page.evaluate(() => ((window as any).opened as string[]).sort())).toEqual(['f:react', 'k:react', 'r:swiftui']);
    expect([await switches(page, 'r'), await switches(page, 'f'), await switches(page, 'k')]).toEqual([0, 0, 0]);
    // A person's choice on the view is stored under the view's key by the row it draws (TBV-16, TAB-39).
    await tabAt(page, 'r', 3).click();
    await tabAt(page, 'f', 0).click();
    expect(await page.evaluate(() => (window as any).writes)).toEqual([['view-key', 'flutter'], ['group-key', 'web']]);
  });

  test('TBV-16: the row a view draws itself takes the view’s group and rememberAs, at first and when they change, and is the member of the group', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('a', FOUR, { label: 'Platform', selected: 'web', group: 'g16', rememberAs: 'key16' }), fixture('b', FOUR, { label: 'Platform', selected: 'react' })] });
    expect(await ownRow(page, 'a').evaluate((el: any) => [el.group, el.rememberAs])).toEqual(['g16', 'key16']);
    expect(await ownRow(page, 'b').evaluate((el: any) => [el.group, el.rememberAs])).toEqual(['', '']);
    // Given the group later, the view's row follows the choice the group holds, in that frame.
    await useTab(page, 'a', 'flutter');
    expect(await showsAll(page, ['a', 'b'])).toEqual(['flutter', 'react']);
    await view(page, 'b').evaluate(async (el: any) => {
      el.setAttribute('group', 'g16');
      el.rememberAs = 'other16';
      await el.updateComplete;
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
    expect(await ownRow(page, 'b').evaluate((el: any) => [el.group, el.rememberAs])).toEqual(['g16', 'other16']);
    expect(await showsAll(page, ['a', 'b'])).toEqual(['flutter', 'flutter']);
    await useTab(page, 'b', 'swiftui');
    expect(await showsAll(page, ['a', 'b'])).toEqual(['swiftui', 'swiftui']);
  });

  test('TBV-17: a linked view uses neither its group nor its rememberAs — the linked row names its own — and reports them', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [fixture('linked', THREE, { tabs: 'x', group: 'g17', rememberAs: 'key17' }), fixture('own', THREE, { label: 'Project', selected: 'overview', group: 'g17' })] });
    await expect(ownRow(page, 'linked')).toHaveCount(0);
    expect(await page.locator('#tabs-linked').evaluate((el: any) => [el.group, el.rememberAs])).toEqual(['', '']);
    await expect.poll(() => seen.some((w) => /group, remember-as apply only to a row the view draws itself; linked to other tabs, the view draws none and they are unused \(TBV-17\)/.test(w))).toBe(true);
    // The linked row is in no group: a choice in the group the view names does not reach it.
    await useTab(page, 'own', 'settings');
    expect(await showsAll(page, ['own', 'linked'])).toEqual(['settings', 'overview']);
  });

  /**
   * TBV-21's two acts — a committed swipe, then a tab selected on the row — on the eighth of ten views of one group,
   * with the place of its container (its row) read in every frame. `rate` slows the renderer's processor that many
   * times while each act is made and for the ten frames after it (`slowed`, Chromium's own protocol): a height change
   * and its scroll correction that could fall into two frames would on a slow renderer.
   */
  const keptInPlace = async (page: P, rate: number, slowed: (rate: number) => Promise<unknown>) => {
    const panels = sharedFixture('shared-choice').items!;
    const ten = (group: string) => Array.from({ length: 10 }, (_, i) => fixture(`m${i + 1}`, panels, { label: 'Platform', selected: 'web', group }));
    /** The top edge of `selector` in the eighth view in every frame from two before `act` to ten after, and how far `region` scrolled. */
    const during = async (region: string, selector: string, act: () => Promise<unknown>) => {
      await page.evaluate(
        ([region, selector]) => {
          const w = window as any;
          const host = document.querySelector('[data-fixture="m8"] tanrei-tab-view')!;
          const target = selector === 'row' ? host.querySelector(':scope > tanrei-tabs')! : host.shadowRoot!.querySelector('.container')!;
          const scroller = region ? document.querySelector(region)! : document.scrollingElement!;
          const first = document.querySelector('[data-fixture="m1"] tanrei-tab-view')!;
          // A record of its own for every act. The frames were once pushed to one list on the window by a loop that ran
          // while one flag on the window was set — and where no frame came between the end of the swipe's reading and
          // the start of the tab's (a busy machine), the swipe's loop found the flag set again and went on, so that the
          // list held the container's top and the row's in turn: one row's height apart, 48.328125 with what the
          // scroll's whole pixel left.
          const run = (w.run = { tops: [] as number[], seen: [] as number[][], from: scroller.scrollTop, watching: true });
          const tick = () => {
            run.tops.push(target.getBoundingClientRect().top);
            // What a failure is read from: where the region had scrolled to, and how tall a view before it and that
            // view's own row were, in that frame.
            run.seen.push([run.tops.at(-1)!, scroller.scrollTop, first.getBoundingClientRect().height, first.querySelector(':scope > tanrei-tabs')!.getBoundingClientRect().height]);
            if (run.watching) requestAnimationFrame(tick);
          };
          tick();
        },
        [region, selector],
      );
      await frames(page);
      await slowed(rate);
      await act();
      await frames(page, 10);
      await slowed(1);
      return page.evaluate((region) => {
        const run = (window as any).run as { tops: number[]; seen: number[][]; from: number; watching: boolean };
        run.watching = false;
        const scroller = region ? document.querySelector(region)! : document.scrollingElement!;
        return { tops: run.tops, seen: JSON.stringify(run.seen), scrolled: scroller.scrollTop - run.from };
      }, region);
    };
    const still = (tops: number[]) => Math.max(...tops) - Math.min(...tops);
    const heightOf = (id: string) => view(page, id).evaluate((el) => el.getBoundingClientRect().height);
    // One device pixel at the harness's scale of 2.
    const PIXEL = 0.5;
    for (const region of ['', 'main']) {
      for (const anchoring of ['auto', 'none']) {
        await mountFixtures(page, spec, { reducedMotion: false, fixtures: ten(`${rate}-${region}-${anchoring}`) });
        await page.addStyleTag({
          content: `${region ? 'main { box-sizing: border-box; block-size: 100vh; overflow-y: auto; flex-wrap: nowrap; } main > .stage { flex: none; }' : ''}
            html, main { overflow-anchor: ${anchoring}; } main::after { content: ''; flex: none; block-size: 3000px; }`,
        });
        const where = `${rate > 1 ? `${rate}×, ` : ''}${region || 'document'}, anchoring ${anchoring}`;
        await view(page, 'm8').evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
        // A committed swipe to the next tab (React): the container stays; the seven views before it grew.
        const web = await heightOf('m1');
        const w = await width(page, 'm8');
        const swiped = await during(region, 'container', () => gesture(page, 'm8', slow(-w * 0.6)));
        expect(await showsAll(page, ['m1', 'm7', 'm8', 'm10']), where).toEqual(['react', 'react', 'react', 'react']);
        const react = await heightOf('m1');
        expect(react, where).toBeGreaterThan(web);
        expect(still(swiped.tops), `${where}: a committed swipe ${swiped.seen}`).toBeLessThanOrEqual(PIXEL);
        expect(swiped.scrolled, where).toBeCloseTo(7 * (react - web), 0);
        // A tab selected on its row (SwiftUI, the tallest): the row stays (TAB-40).
        const target = await bounds(tabAt(page, 'm8', 2));
        const tapped = await during(region, 'row', () => page.mouse.click(target.x + target.width / 2, target.y + target.height / 2));
        const swiftui = await heightOf('m1');
        expect(await shows(page, 'm1'), where).toBe('swiftui');
        expect(still(tapped.tops), `${where}: a tab ${tapped.seen}`).toBeLessThanOrEqual(PIXEL);
        expect(tapped.scrolled, where).toBeCloseTo(7 * (swiftui - react), 0);
        expect(swiftui - react, where).toBeGreaterThan(20);
      }
    }
  };

  test('TBV-21: a swipe committed on the eighth of ten views of one group leaves its container at the same place in the window in every frame while the seven before it change height, and so does a tab selected on its row (TAB-40) — in the document and in a region that scrolls, with the browser’s own scroll anchoring on and off', async ({ page }) => {
    await keptInPlace(page, 1, async () => {});
  });

  test('TBV-21: with the renderer’s processor slowed four and eight times while the swipe is committed and while the tab is selected, the container and the row are still at the same place in the window in every frame (TAB-40)', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'the processor is slowed through Chromium’s own protocol');
    test.setTimeout(180_000);
    const session = await page.context().newCDPSession(page);
    for (const rate of [4, 8]) await keptInPlace(page, rate, (to) => session.send('Emulation.setCPUThrottlingRate', { rate: to }));
  });
});

// The row's size and track are the view's, and the form of a switch is set per instance.
test.describe('the row’s size and track, and the transition', () => {
  const only = (...ids: string[]) => ids.map((id) => spec.fixtures.find((f) => f.id === id)!);
  const TABS = (name: string) => `--tanrei-comp-tabs-${name}`;
  const rowTransition = (page: P, id: string) => ownRow(page, id).evaluate((el: any) => [el.transition as string, el.getAttribute('transition')]);
  /** The first frame after `act` ran in the page: each panel, the container's height, the row's indicator and what runs. */
  const firstFrame = (page: P, id: string, act: string) =>
    view(page, id).evaluate(async (el: any, script) => {
      new Function('view', script)(el);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const container = el.shadowRoot.querySelector('.container') as HTMLElement;
      const rowEl = el.querySelector(':scope > tanrei-tabs') as any;
      return {
        panels: [...el.querySelectorAll(':scope > tanrei-tab-panel')].map((panel: any) => {
          const s = getComputedStyle(panel);
          return { value: panel.value, hidden: panel.hasAttribute('hidden'), opacity: s.opacity, translate: s.translate, filter: s.filter, height: panel.getBoundingClientRect().height };
        }),
        height: container.getBoundingClientRect().height,
        running: [...container.getAnimations(), ...(rowEl ? rowEl.shadowRoot.querySelector('.tabs').getAnimations() : [])].map((a) => a.id),
        covered: rowEl ? [...rowEl.querySelectorAll('tanrei-tab')].map((tab: any) => getComputedStyle(tab.shadowRoot.querySelector('.cover')).visibility === 'visible') : [],
      };
    }, act);

  test('TBV-16: the view’s size and track reach the row it draws, at first and when they change, as its variant does; linked, they are unused and reported (TBV-17)', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: only('tonal', 'primary-small', 'tonal-no-track-no-transition', 'default') });
    const given = (id: string) => ownRow(page, id).evaluate((el: any) => [el.variant, el.size, el.track, el.getAttribute('track')]);
    expect(await given('tonal')).toEqual(['tonal', 'medium', null, null]);
    expect(await given('primary-small')).toEqual(['primary', 'small', null, null]);
    expect(await given('tonal-no-track-no-transition')).toEqual(['tonal', 'medium', false, 'false']);
    expect((await bounds(ownRow(page, 'primary-small').locator('.scroller'))).height).toBeCloseTo(await resolveToken(page, TABS('container-height-small')), 1);
    expect(await css(ownRow(page, 'tonal-no-track-no-transition').locator('.scroller'), 'background-color')).toBe('rgba(0, 0, 0, 0)');
    // The container is right under the row at each size.
    const [r, c] = [await bounds(ownRow(page, 'primary-small')), await bounds(container(page, 'primary-small'))];
    expect(c.y).toBeCloseTo(r.y + r.height, 0);
    await view(page, 'default').evaluate(async (el: any) => {
      el.size = 'small';
      el.track = false;
      el.variant = 'tonal';
      await el.updateComplete;
    });
    expect(await given('default')).toEqual(['tonal', 'small', false, 'false']);
    await view(page, 'default').evaluate(async (el: any) => {
      el.track = null;
      await el.updateComplete;
    });
    expect((await given('default')).slice(2)).toEqual([null, null]);
    // Linked elsewhere they apply to nothing, and a debug build says so.
    await mountFixtures(page, spec, { fixtures: [fixture('linked', THREE, { tabs: 'x', size: 'small', track: false })] });
    await expect.poll(() => seen.filter((w) => w.includes('TBV-17')).join('\n')).toMatch(/size, track apply only to a row the view draws itself/);
  });

  test('TBV-22, TBV-2: under none a selection shows the new panel whole in its first frame, the container as tall as it, the row’s indicator on the new tab and nothing running; a swipe moves no panel, the indicator follows the finger, and the release shows the panel at once', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...only('no-transition'), fixture('tall', [p('overview'), p('activity', '<p style="margin:0;block-size:240px">Tall</p>'), p('settings')], { transition: 'none', label: 'Project' })], reducedMotion: false });
    await override(page, { [T('motion-switch-duration')]: '60s', [TABS('motion-indicator-duration')]: '60s' });
    await wire(page);
    const frame = await firstFrame(page, 'no-transition', 'view.querySelectorAll(":scope > tanrei-tabs > tanrei-tab")[1].click()');
    expect(frame.running).toEqual([]);
    expect(frame.covered).toEqual([false, true, false]);
    expect(frame.panels.map((each) => [each.value, each.hidden, each.opacity, each.translate, each.filter])).toEqual([
      ['overview', true, '1', 'none', 'none'],
      ['activity', false, '1', 'none', 'none'],
      ['settings', true, '1', 'none', 'none'],
    ]);
    expect(await log(page)).toEqual(['tanrei-tab-view:activity:activity:activity']);
    // The height with it.
    const tall = await firstFrame(page, 'tall', 'view.value = "activity"');
    expect(tall.running).toEqual([]);
    expect(tall.height).toBeGreaterThanOrEqual(240);
    expect(tall.height).toBeCloseTo(tall.panels[1].height, 0);
    // The hidden panel is kept (TBV-12), the exposure and the focus move as in every form (TBV-9).
    expect(await panel(page, 'no-transition', 'overview').evaluate((el) => [el.isConnected, el.hasAttribute('inert')])).toEqual([true, true]);
    expect(await panel(page, 'no-transition', 'activity').getAttribute('role')).toBe('tabpanel');
    // A swipe toward Settings: the shown panel at rest for its whole length, no second panel drawn, the indicator following.
    const w = await width(page, 'no-transition');
    const held = await gesture(page, 'no-transition', slow(-w * 0.6), { up: null });
    expect(held.offset).toBeCloseTo(0.6, 2);
    expect(await drawn(panel(page, 'no-transition', 'activity'))).toMatchObject({ x: 0, opacity: 1, blur: 0, hidden: false });
    expect(await drawn(panel(page, 'no-transition', 'settings'))).toMatchObject({ hidden: true, visible: false });
    const released = await gesture(page, 'no-transition', [{ x: -w * 0.62, dt: 16 }], { up: 300 });
    expect([released.value, released.tabs, released.offset]).toEqual(['settings', 'settings', 0]);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    expect(await switches(page, 'no-transition')).toBe(0);
    expect(await drawn(panel(page, 'no-transition', 'settings'))).toMatchObject({ x: 0, opacity: 1, blur: 0, hidden: false });
    expect(await drawn(panel(page, 'no-transition', 'activity'))).toMatchObject({ hidden: true });
    // A swipe released before half is cancelled, at once.
    const back = await gesture(page, 'no-transition', slow(w * 0.3), { up: 300 });
    expect([back.value, back.offset]).toEqual(['settings', 0]);
    expect(await switches(page, 'no-transition')).toBe(0);
    expect(await log(page)).toEqual(['tanrei-tab-view:activity:activity:activity', 'tanrei-tab-view:settings:settings:settings']);
  });

  test('TBV-22: under fade both panels stay in place, neither moved nor blurred, their opacities adding to 1, over the fade’s motion, and during a swipe with the finger; the row’s indicator slides; slide named on the view travels under a system whose answer is none; an unknown value is auto', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: only('fade', 'slide', 'default'), reducedMotion: false });
    await unhurried(page);
    // The row's indicator too: its slide is counted below after the switch has been held for two frames and read.
    await override(page, { [TABS('motion-indicator-duration')]: '60s' });
    await wire(page);
    const [duration, easing] = [await resolveToken(page, T('motion-fade-duration'), 'duration'), await easingToken(page, T('motion-fade-easing'))];
    await tabAt(page, 'fade', 1).click();
    const held = await holdSwitch(page, 'fade', 0.5);
    expect([held.duration, held.easing]).toEqual([duration, easing]);
    const [a, b] = [await drawn(panel(page, 'fade', 'overview')), await drawn(panel(page, 'fade', 'activity'))];
    expect([a.x, a.blur, b.x, b.blur]).toEqual([0, 0, 0, 0]);
    expect(a.opacity + b.opacity).toBeCloseTo(1, 2);
    expect(a.opacity).toBeCloseTo(1 - held.progress, 2);
    // The row keeps the tabs' own answer: its indicator slides.
    expect(await rowTransition(page, 'fade')).toEqual(['auto', 'auto']);
    expect(await ownRow(page, 'fade').locator('.tabs').evaluate((el) => el.getAnimations().filter((each) => each.id === 'tanrei-tabs-slide').length)).toBe(1);
    await finishSwitch(page, 'fade');
    // During a swipe the two crossfade with the finger.
    const w = await width(page, 'fade');
    await gesture(page, 'fade', slow(-w * 0.25), { up: null });
    const [c, d] = [await drawn(panel(page, 'fade', 'activity')), await drawn(panel(page, 'fade', 'settings'))];
    expect([c.x, c.blur, d.x, d.blur]).toEqual([0, 0, 0, 0]);
    expect([c.opacity, d.opacity]).toEqual([expect.closeTo(0.75, 2), expect.closeTo(0.25, 2)]);
    await lift(page, 'fade');
    await finishSwitch(page, 'fade');
    // A system whose answer is none: `slide` travels, `default` (auto) changes at once.
    await override(page, { [T('motion-transition')]: 'none' });
    await tabAt(page, 'slide', 1).click();
    const travel = await holdSwitch(page, 'slide', 0.5);
    expect(travel.duration).toBe(await resolveToken(page, T('motion-switch-duration'), 'duration'));
    expect(Math.abs((await drawn(panel(page, 'slide', 'overview'))).x)).toBeGreaterThan(0);
    expect(await rowTransition(page, 'slide')).toEqual(['auto', 'auto']);
    await finishSwitch(page, 'slide');
    const atOnce = await firstFrame(page, 'default', 'view.querySelectorAll(":scope > tanrei-tabs > tanrei-tab")[1].click()');
    expect([atOnce.running, atOnce.covered, atOnce.panels.map((each) => each.hidden)]).toEqual([[], [false, true, false], [true, false, true]]);
    // An unknown name of the system's is the first value, slide; an unknown value of the prop is auto, and reported.
    await override(page, { [T('motion-transition')]: 'spin' });
    await view(page, 'default').evaluate(async (el: any) => {
      el.transition = 'flip';
      await el.updateComplete;
    });
    await tabAt(page, 'default', 2).click();
    expect(await switches(page, 'default')).toBe(1);
    await finishSwitch(page, 'default');
    await expect.poll(() => seen.filter((w) => w.includes('TBV-22')).join('\n')).toMatch(/transition "flip" is not a transition of the Tab view; it is taken as "auto" \(TBV-22\)/);
    // Every form selects, emits and announces alike: one change for each selection, from the view (the log reads the first view's values).
    expect(await log(page)).toEqual(['tanrei-tab-view:activity:activity:activity', 'tanrei-tab-view:activity:activity:activity', 'tanrei-tab-view:activity:activity:activity', 'tanrei-tab-view:settings:activity:activity']);
  });

  test('TBV-23: the view’s own row has the tabs’ transition none while the form is none and auto otherwise, a linked row is never set, a change of transition ends a running switch, and reduced motion adds nothing to none', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...only('tonal-no-track-no-transition', 'fade', 'slide', 'default', 'no-transition'), fixture('linked', THREE, { tabs: 'x', transition: 'none' })], reducedMotion: false });
    await unhurried(page);
    await override(page, { [TABS('motion-indicator-duration')]: '60s' });
    expect(await rowTransition(page, 'tonal-no-track-no-transition')).toEqual(['none', 'none']);
    expect(await rowTransition(page, 'no-transition')).toEqual(['none', 'none']);
    for (const id of ['fade', 'slide', 'default']) expect(await rowTransition(page, id), id).toEqual(['auto', 'auto']);
    // A selection moves its indicator in one frame.
    const frame = await firstFrame(page, 'tonal-no-track-no-transition', 'view.querySelectorAll(":scope > tanrei-tabs > tanrei-tab")[2].click()');
    expect([frame.running, frame.covered]).toEqual([[], [false, false, true, false]]);
    // The linked row keeps its own.
    expect(await row(page, 'linked').evaluate((el: any) => [el.transition, el.getAttribute('transition')])).toEqual(['auto', 'auto']);
    await row(page, 'linked').locator('tanrei-tab').nth(1).click();
    expect(await row(page, 'linked').locator('.tabs').evaluate((el) => el.getAnimations().filter((each) => each.id === 'tanrei-tabs-slide').length)).toBe(1);
    expect(await switches(page, 'linked')).toBe(0);
    // The form changes while a switch is drawn: the switch ends at once, the row follows, nothing else changes.
    await wire(page);
    await tabAt(page, 'default', 1).click();
    expect(await switches(page, 'default')).toBe(1);
    await view(page, 'default').evaluate(async (el: any) => {
      el.transition = 'none';
      await el.updateComplete;
    });
    expect([await switches(page, 'default'), await value(page, 'default'), await rowTransition(page, 'default')]).toEqual([0, 'activity', ['none', 'none']]);
    expect(await drawn(panel(page, 'default', 'activity'))).toMatchObject({ x: 0, opacity: 1, blur: 0, hidden: false });
    expect((await log(page)).length).toBe(1);
    await view(page, 'default').evaluate(async (el: any) => {
      el.transition = 'fade';
      await el.updateComplete;
    });
    expect(await rowTransition(page, 'default')).toEqual(['auto', 'auto']);
    // The system's answer, read when something begins: a view on auto under a system of none gives its row none at the press.
    await override(page, { [T('motion-transition')]: 'none' });
    const system = await firstFrame(page, 'slide', 'view.transition = "auto"; view.querySelectorAll(":scope > tanrei-tabs > tanrei-tab")[0].dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true })); view.querySelectorAll(":scope > tanrei-tabs > tanrei-tab")[2].click()');
    expect([system.running, system.covered, await rowTransition(page, 'slide')]).toEqual([[], [false, false, true], ['none', 'none']]);
    await override(page, { [T('motion-transition')]: '' });
    // Reduced motion: none stays none — nothing fades — and the default still crossfades.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const still = await firstFrame(page, 'no-transition', 'view.value = "settings"');
    expect([still.running, still.panels.map((each) => [each.hidden, each.opacity])]).toEqual([[], [[true, '1'], [true, '1'], [false, '1']]]);
    await tabAt(page, 'fade', 2).click();
    const held = await holdSwitch(page, 'fade', 0.5);
    expect(held.duration).toBe(await resolveToken(page, T('motion-fade-duration'), 'duration'));
    await finishSwitch(page, 'fade');
    await mountFixtures(page, spec, { fixtures: only('default'), reducedMotion: true });
    await unhurried(page);
    await tabAt(page, 'default', 1).click();
    const fade = await holdSwitch(page, 'default', 0.5);
    expect(fade.duration).toBe(await resolveToken(page, T('motion-fade-duration'), 'duration'));
    const [a, b] = [await drawn(panel(page, 'default', 'overview')), await drawn(panel(page, 'default', 'activity'))];
    expect([a.x, a.blur, b.x, b.blur]).toEqual([0, 0, 0, 0]);
    expect(a.opacity).toBeLessThan(1);
  });

  test('TBV-22: where style queries are missing the form is still the cascade’s — a system whose answer is none shows the panel in one frame and gives the view’s row none', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: only('default', 'tonal-no-track-no-transition'), reducedMotion: false });
    await override(page, { [T('motion-transition')]: 'none', [TABS('motion-indicator-duration')]: '60s' });
    const frame = await firstFrame(page, 'default', 'const tabs = view.querySelectorAll(":scope > tanrei-tabs > tanrei-tab"); tabs[1].dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true })); tabs[1].click()');
    expect([frame.running, frame.covered, frame.panels.map((each) => each.hidden)]).toEqual([[], [false, true, false], [true, false, true]]);
    expect(await rowTransition(page, 'default')).toEqual(['none', 'none']);
    // The row without its track, whatever answers the query.
    expect(await css(ownRow(page, 'tonal-no-track-no-transition').locator('.scroller'), 'background-color')).toBe('rgba(0, 0, 0, 0)');
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark, at rest and with a focusable panel', async ({ page }) => {
    // The control in the panel is the product's, drawn in the product's colors: a button left to the engine is the
    // engine's to draw, and one of them draws it white on light grey in a dark page (1.81 : 1) — not the Tab view's.
    const control = '<button style="color: var(--tanrei-sys-color-on-surface); background-color: var(--tanrei-sys-color-surface)">Deploy</button>';
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true, fixtures: [...spec.fixtures, fixture('controls', [p('overview', control), p('activity'), p('settings')], { selected: 'overview', label: 'Deploys' })] });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(' ')}`).join(', ')}`).toEqual([]);
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

// The test frames of TBV-5's verify (not fixtures: a switch in progress is not a resting rendering): a drag held at
// p = 0.5 toward the next tab under the default fixture, with motion not reduced and reduced.
test.describe('test frames', () => {
  for (const reducedMotion of [false, true]) {
    const name = `frame-drag-half${reducedMotion ? '-reduced-motion' : ''}`;
    test(`snapshot: ${name}`, async ({ page }) => {
      await mountFixtures(page, spec, { fixtures: spec.fixtures.filter((f) => f.id === 'default'), reducedMotion });
      await gesture(page, 'default', slow(-(await width(page, 'default')) / 2), { up: null });
      await expect(page.locator('[data-fixture="default"]')).toHaveScreenshot([spec.name, `${name}.png`]);
    });
  }
});
