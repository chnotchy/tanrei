// <tanrei-calendar>, driven by specs/calendar.spec.json: every behaviour id (CAL-1…34) is cited by a test title, every
// fixture has a baseline (the calendar at its natural size centred on a 400 × 440 stage, CAL-1's verify), and every value
// is read back from the tokens — never from a number written here.
// CAL-36: the product's ARIA on the host is tested with every other control's, in every engine, in
// src/primitives/delegated-aria.test.ts.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, acmeSystemCss, loadSpec, missingWords, mountFixtures, resolveColor, resolveToken, setWords, tab, tabTo, rootTokens } from '../../../test/harness.js';
import { expectKeyPressOutlastsPointer } from '../../../test/key-press-pointer-leaves.js';
import { motionEnded } from '../../../test/motions.js';
import { releaseAtRest } from '../../../test/release-at-rest.js';
import { STOPPED_AFTER, flingThenHold, strokes } from '../../../test/stopped-release.js';

const spec = loadSpec('calendar');
type P = Page;
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-calendar`);
const day = (page: P, id: string, iso: string) => host(page, id).locator(`.page.current .day[data-date="${iso}"]`);
const box = (page: P, id: string, iso: string) => day(page, id, iso).locator('.box');
const band = (page: P, id: string, iso: string) => day(page, id, iso).locator('.band');
const year = (page: P, id: string, y: number) => host(page, id).locator(`.year[data-year="${y}"]`);
const toggle = (page: P, id: string) => host(page, id).locator('.toggle');
const button = (page: P, id: string, name: 'previous' | 'next') => host(page, id).locator(`tanrei-button.${name}`);
const css = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const px = async (locator: Locator, property: string) => Number.parseFloat(await css(locator, property));
const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const T = (name: string) => `--tanrei-comp-calendar-${name}`;
const bounds = async (locator: Locator) => (await locator.boundingBox())!;
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
/** The deepest focused element: a day's date, `year:<y>`, `toggle`, a Button's class, or a tag. */
const focused = (page: P) =>
  page.evaluate(() => {
    let active: Element | null = document.activeElement;
    const hosts: Element[] = [];
    while (active?.shadowRoot?.activeElement) {
      hosts.push(active);
      active = active.shadowRoot.activeElement;
    }
    const el = active as HTMLElement | null;
    if (!el) return null;
    if (el.dataset?.date) return el.dataset.date;
    if (el.dataset?.year) return `year:${el.dataset.year}`;
    if (el.classList?.contains('toggle')) return 'toggle';
    const owner = hosts.reverse().find((h) => h.localName === 'tanrei-button');
    if (owner) return owner.classList[0];
    return el.localName;
  });
/** The displayed month, as the grid names it. */
const shown = (page: P, id: string) => host(page, id).locator('.day-view').getAttribute('aria-label');

/** The words of this file's own fixtures: a test is the product there and gives them itself (CAL-35). */
const WORDS = { previousMonthLabel: 'Previous month', nextMonthLabel: 'Next month', yearViewLabel: 'Choose a year', todayLabel: 'Today', startLabel: 'Start date', endLabel: 'End date' };
/** A fixture as the spec writes one: today and the locale pinned, and its words given. */
const f = (id: string, props: Fixture['props'] = {}): Fixture => ({ id, props: { today: '2026-09-24', locale: 'en-US', ...WORDS, ...props } });
/** The same with no words but the ones it names (CAL-35). */
const wordless = (id: string, props: Fixture['props'] = {}): Fixture => ({ id, props: { today: '2026-09-24', locale: 'en-US', ...props } });

async function mount(page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) {
  await mountFixtures(page, spec, { icons: true, fixtures, ...options });
  await page.evaluate(() => {
    const log: string[] = ((window as any).log = []);
    for (const c of document.querySelectorAll<any>('tanrei-calendar')) c.addEventListener('change', (e: CustomEvent) => log.push(`${JSON.stringify(e.detail)}:${c.value}|${c.start}|${c.end}`));
  });
}
const log = (page: P) => page.evaluate(() => (window as any).log as string[]);
/** Waits for a month change and a cross-fade to end. */
const settled = (page: P, id: string) => host(page, id).evaluate((el) => Promise.all(el.shadowRoot!.getAnimations().map((a) => a.finished.catch(() => undefined))));

// CAL-29 … CAL-32: the column of weeks, the progress it is drawn from, and the drag that writes it.
/**
 * The custom property every in-between look is drawn from: 0 at the first view the grid holds, 1 at the next. No one
 * registers it: a drag writes it, and a change of month writes it in each frame of the page motion, by a clock of the
 * element's — an animation of the grid that has no effect and carries the property's name as its `id`.
 */
const PROGRESS = '--_tanrei-calendar-progress';
const pages = (page: P, id: string) => host(page, id).locator('.pages');
const progress = (page: P, id: string) => pages(page, id).evaluate((el, property) => Number(getComputedStyle(el).getPropertyValue(property)), PROGRESS);
/** Whether the grid holds more than the displayed month's view (a change plays or a drag lasts), and whether a drag holds it. */
const moving = (page: P, id: string) => pages(page, id).getAttribute('data-moving');
const held = (page: P, id: string) => pages(page, id).evaluate((el) => el.hasAttribute('data-held'));
/** The progress's own travel, as the duration of its clock in ms: null when it is at rest. */
const travelling = (page: P, id: string) =>
  pages(page, id).evaluate((el, property) => {
    const travel = el.getAnimations().find((a) => a.id === property);
    return travel ? Number(travel.effect!.getComputedTiming().duration) : null;
  }, PROGRESS);
/** Ends whatever the progress is doing, as if its motion had run. */
const land = async (page: P, id: string) => {
  await pages(page, id).evaluate((el) => el.getAnimations().forEach((a) => a.finish()));
  await expect.poll(() => moving(page, id)).toBe(null);
};
/**
 * Holds the progress's travel at `time` ms — its clock stopped there, and the frame that draws it drawn — and returns
 * the progress there. The frames waited for are the browser's own (an animation that ends is told by the document's
 * timeline), whatever clock the test has put in place of the page's timers.
 */
const hold = (page: P, id: string, time: number) =>
  pages(page, id).evaluate(
    async (el, [property, at]) => {
      const travel = el.getAnimations().find((a) => a.id === property)!;
      travel.pause();
      travel.currentTime = at as number;
      for (let frame = 0; frame < 3; frame++) await document.body.animate(null, { duration: 1 }).finished;
      return Number(getComputedStyle(el).getPropertyValue(property as string));
    },
    [PROGRESS, time] as const,
  );
/** The curve of the progress's travel: its clock's. */
const travelEasing = (page: P, id: string) => pages(page, id).evaluate((el, property) => String(el.getAnimations().find((a) => a.id === property)?.effect?.getTiming().easing), PROGRESS);
interface Move {
  /** From the press, in px: toward the right and toward the bottom. */
  dx?: number;
  dy?: number;
  /** The time since the event before, in ms. */
  dt?: number;
}
/**
 * A pointer dispatched in the page on the day grid: down at `at` (a day's ISO date, else the grid's centre), one move per
 * step and — unless `up` is null — up that many ms after the last move, where it is. Returns the progress drawn in the
 * same task as the last event: a drag has no motion of its own.
 */
async function pointer(page: P, id: string, moves: Move[], { up = 300 as number | null, pointerType = 'touch', down = true, at = '', button = 0 } = {}) {
  return host(page, id).evaluate(
    (el, { moves, up, pointerType, down, at, button, property }) => {
      const root = el.shadowRoot!;
      const grid = root.querySelector('.day-view')!;
      const w = window as any;
      w.dragStamp ??= performance.now() - 5000;
      if (down) {
        const box = (at ? root.querySelector(`.page.current .day[data-date="${at}"]`)! : root.querySelector('.pages')!).getBoundingClientRect();
        w.dragFrom = { x: box.left + box.width / 2, y: box.top + box.height / 2, target: at ? root.querySelector(`.page.current .day[data-date="${at}"] .box`) : grid };
        w.dragLast = { dx: 0, dy: 0 };
      }
      const fire = (type: string, target: Element) => {
        const event = new PointerEvent(type, { bubbles: true, composed: true, cancelable: true, pointerId: 31, pointerType, isPrimary: true, button, buttons: type === 'pointerup' ? 0 : button === 2 ? 2 : 1, clientX: w.dragFrom.x + w.dragLast.dx, clientY: w.dragFrom.y + w.dragLast.dy });
        Object.defineProperty(event, 'timeStamp', { value: w.dragStamp });
        target.dispatchEvent(event);
      };
      if (down) fire('pointerdown', w.dragFrom.target);
      for (const move of moves) {
        w.dragStamp += move.dt ?? 16;
        w.dragLast = { dx: move.dx ?? 0, dy: move.dy ?? 0 };
        fire('pointermove', grid);
      }
      if (up !== null) {
        w.dragStamp += up;
        fire('pointerup', grid);
      }
      return Number(getComputedStyle(root.querySelector('.pages')!).getPropertyValue(property));
    },
    { moves, up, pointerType, down, at, button, property: PROGRESS },
  );
}
/** More moves, and maybe the release, of the pointer `pointer()` left down. */
const pointerOn = (page: P, id: string, moves: Move[], options: { up?: number | null } = {}) => pointer(page, id, moves, { up: null, ...options, down: false });
const cancelPointer = (page: P, id: string) =>
  host(page, id).evaluate((el) => el.shadowRoot!.querySelector('.day-view')!.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, composed: true, pointerId: 31, pointerType: 'touch', isPrimary: true })));
interface Scroll {
  /** The event's deltas (toward the right and toward the bottom) and their unit: 0 pixels, 1 lines, 2 pages. */
  dx?: number;
  dy?: number;
  mode?: 0 | 1 | 2;
  /** The time since the event before on the events' own clock, in ms (16). */
  dt?: number;
  ctrl?: boolean;
}
/**
 * Wheel events dispatched on the day grid, each with its own time (CAL-34 reads the events' times; the quiet that ends a
 * scroll is the page's own timer). Returns the progress drawn before another frame could be, whether each event was
 * taken (prevented) and the month the grid named after each.
 */
async function scroll(page: P, id: string, events: Scroll[]) {
  return host(page, id).evaluate(
    async (el, { events, property }) => {
      const root = el.shadowRoot!;
      const grid = root.querySelector('.day-view')!;
      const w = window as any;
      w.wheelStamp = Math.max(w.wheelStamp ?? 0, performance.now());
      const taken: boolean[] = [];
      const months: string[] = [];
      for (const { dx = 0, dy = 0, mode = 0, dt = 16, ctrl = false } of events) {
        w.wheelStamp += dt;
        const event = new WheelEvent('wheel', { deltaX: dx, deltaY: dy, deltaMode: mode, ctrlKey: ctrl, bubbles: true, cancelable: true, composed: true });
        Object.defineProperty(event, 'timeStamp', { value: w.wheelStamp });
        taken.push(!grid.dispatchEvent(event));
        await (el as any).updateComplete;
        months.push(grid.getAttribute('aria-label')!);
      }
      return { progress: Number(getComputedStyle(root.querySelector('.pages')!).getPropertyValue(property)), taken, months };
    },
    { events, property: PROGRESS },
  );
}
/**
 * CAL-34's clock, controlled: the page's timers stand still, so the quiet that ends a scroll (150 ms without an event)
 * passes only when a test lets it (`quiet`, `pass`) — however long the test's own reads take. Motion is not a timer: a
 * transition runs, and is held or finished by the test, as everywhere else.
 */
const holdClock = async (page: P) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 60_000));
};
const pass = (page: P, ms: number) => page.clock.runFor(ms);
/** The quiet that ends a scroll, and then some. */
const quiet = (page: P) => pass(page, 200);
/** A row's height: a sixth of the grid's. */
const rowHeight = async (page: P, id: string) => (await bounds(pages(page, id))).height / 6;
/** How far below the grid's top the week row that begins on `iso` is, in rows. */
const rowAt = (page: P, id: string, iso: string) =>
  host(page, id).evaluate((el, date) => {
    const root = el.shadowRoot!;
    const grid = root.querySelector('.pages')!.getBoundingClientRect();
    return (root.querySelector(`.day[data-date="${date}"]`)!.closest('.row')!.getBoundingClientRect().top - grid.top) / (grid.height / 6);
  }, iso);
/** How a day is drawn now: the opacity of its fade, and its label, container and outline colors. */
const drawn = async (page: P, id: string, iso: string) => {
  const raw = await host(page, id).evaluate((el, date) => {
    const cell = el.shadowRoot!.querySelector(`.day[data-date="${date}"]`)!;
    const boxStyle = getComputedStyle(cell.querySelector('.box')!);
    return { opacity: Number(getComputedStyle(cell.querySelector('.lane')!).opacity), label: boxStyle.color, container: boxStyle.backgroundColor, outline: boxStyle.boxShadow };
  }, iso);
  const color = /(?:color\(srgb [^)]+\)|rgba?\([^)]+\))/;
  return { opacity: raw.opacity, label: rgba(raw.label), container: rgba(raw.container), outline: rgba(color.exec(raw.outline)![0]) };
};
type RGBA = [number, number, number, number];
/** A computed color as red, green, blue (0…255) and alpha. */
const rgba = (value: string): RGBA => {
  const srgb = /color\(srgb ([-\d.e]+) ([-\d.e]+) ([-\d.e]+)(?: \/ ([-\d.e]+))?\)/.exec(value);
  if (srgb) return [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255, srgb[4] === undefined ? 1 : Number(srgb[4])];
  const rgb = /rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)/.exec(value);
  if (!rgb) throw new Error(`not a color: ${value}`);
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] === undefined ? 1 : Number(rgb[4])];
};
/** The linear interpolation of two colors in sRGB, as the browser mixes them (premultiplied by alpha). */
const mixed = (from: RGBA, to: RGBA, p: number): RGBA => {
  const alpha = from[3] * (1 - p) + to[3] * p;
  const channel = (i: number) => (alpha === 0 ? 0 : (from[i] * from[3] * (1 - p) + to[i] * to[3] * p) / alpha);
  return [channel(0), channel(1), channel(2), alpha];
};
/** Within one step of an 8-bit channel, and a hundredth of alpha. */
const sameColor = (a: RGBA, b: RGBA) => (a[3] === 0 && b[3] === 0 ? true : [0, 1, 2].every((i) => Math.abs(a[i] - b[i]) <= 1.01) && Math.abs(a[3] - b[3]) <= 0.01);
const expectColor = (actual: RGBA, wanted: RGBA, what: string) => expect(sameColor(actual, wanted), `${what}: drew ${actual.map((c) => +c.toFixed(2))}, expected ${wanted.map((c) => +c.toFixed(2))}`).toBe(true);
const tokenRGBA = async (page: P, name: string) => rgba(await resolveColor(page, name));

test.describe('layout and drawing', () => {
  test('CAL-1: the navigation row, the weekday row and six rows of seven cells of cell.size (never under the target), the first day in its weekday’s column; no surface and no padding', async ({ page }) => {
    await mount(page, [f('c', { value: '2026-09-17' }), f('feb', { value: '2026-02-10' })]);
    const cell = Math.max(await resolveToken(page, T('cell-size')), await resolveToken(page, '--tanrei-sys-target-pointer'));
    const rows = host(page, 'c').locator('.page.current [role="row"]');
    await expect(rows).toHaveCount(6);
    expect((await bounds(host(page, 'c'))).width).toBeCloseTo(7 * cell, 0);
    const b = await bounds(day(page, 'c', '2026-09-17'));
    expect([Math.round(b.width), Math.round(b.height)]).toEqual([cell, cell]);
    expect((await bounds(host(page, 'c').locator('.nav'))).height).toBeCloseTo(cell, 0);
    expect((await bounds(host(page, 'c').locator('.weekdays'))).height).toBeCloseTo(cell, 0);
    // 1 September 2026 is a Tuesday: the third column of a week from Sunday.
    const first = await bounds(day(page, 'c', '2026-09-01'));
    const grid = await bounds(host(page, 'c').locator('.page.current'));
    expect(Math.round((first.x - grid.x) / cell)).toBe(2);
    // February 2026 needs only four rows; all six are kept, so the height does not change.
    expect((await bounds(host(page, 'feb'))).height).toBeCloseTo((await bounds(host(page, 'c'))).height, 0);
    // No surface of its own.
    expect(await css(host(page, 'c'), 'background-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await px(host(page, 'c'), 'padding-left')).toBe(0);
    // The cell token lowered below the target: the target wins.
    await override(page, { [T('cell-size')]: '20px' });
    expect(Math.round((await bounds(day(page, 'c', '2026-09-17'))).width)).toBe(await resolveToken(page, '--tanrei-sys-target-pointer'));
  });

  test('CAL-2: each day draws from one condition by precedence — selected, in-range, today, adjacent, unselected — and years from selected, today, unselected', async ({ page }) => {
    await mount(page, [
      f('r', { mode: 'range', start: '2026-09-22', end: '2026-10-02', showAdjacentDays: true }),
      f('y', { startView: 'year', value: '2026-09-17', today: '2027-01-15' }),
    ]);
    const cls = async (iso: string) => (await day(page, 'r', iso).getAttribute('class'))!;
    expect(await cls('2026-09-22')).toContain('selected');
    // Today (24) inside the range is in-range: in-range is above today.
    expect(await cls('2026-09-24')).toContain('in-range');
    expect(await cls('2026-09-24')).not.toContain('today');
    // A neighbouring month's day inside the range is in-range, not adjacent; one outside it is adjacent.
    expect(await cls('2026-10-01')).toContain('in-range');
    expect(await cls('2026-10-03')).toContain('adjacent');
    expect(await cls('2026-09-10')).not.toMatch(/selected|in-range|today|adjacent/);
    for (const [iso, condition] of [['2026-09-22', 'selected'], ['2026-09-23', 'in-range'], ['2026-10-03', 'adjacent'], ['2026-09-10', 'unselected']] as const) {
      expect(await css(box(page, 'r', iso), 'color'), `${iso} ${condition}`).toBe(await resolveColor(page, T(`${condition}-label-color`)));
    }
    expect(await year(page, 'y', 2026).getAttribute('class')).toContain('selected');
    expect(await year(page, 'y', 2027).getAttribute('class')).toContain('today');
    expect(await css(toggle(page, 'y').locator('.box'), 'color')).toBe(await resolveColor(page, T('unselected-label-color')));
  });

  test('CAL-3: a day’s number in its label role on a circle of day.container.size, its condition’s colors and outline; the range’s band across whole cells, the ends drawing their inner half, no empty cell banded', async ({ page }) => {
    await mount(page, [f('r', { mode: 'range', start: '2026-09-10', end: '2026-09-16' }), f('x', { mode: 'range', start: '2026-09-28', end: '2026-10-02' })]);
    const size = await resolveToken(page, T('day-container-size'));
    const b = await bounds(box(page, 'r', '2026-09-10'));
    expect([Math.round(b.width), Math.round(b.height)]).toEqual([size, size]);
    expect(await px(box(page, 'r', '2026-09-10'), 'font-size')).toBe(await resolveToken(page, T('day-label-typescale-font-size')));
    expect(await css(box(page, 'r', '2026-09-10'), 'background-color')).toBe(await resolveColor(page, T('selected-container-color')));
    expect(await css(box(page, 'r', '2026-09-24'), 'box-shadow')).toContain(`${await resolveToken(page, T('outline-width'))}px`);
    // In range: the band spans the whole cell at the container's height.
    const cell = await bounds(day(page, 'r', '2026-09-12'));
    const inner = await bounds(band(page, 'r', '2026-09-12'));
    expect(inner.width).toBeCloseTo(cell.width, 0);
    expect(await css(band(page, 'r', '2026-09-12'), 'background-color')).toBe(await resolveColor(page, T('in-range-container-color')));
    // The start draws the half of its cell toward the end; the end the half toward the start.
    const start = [await bounds(day(page, 'r', '2026-09-10')), await bounds(band(page, 'r', '2026-09-10'))];
    expect(start[1].x).toBeCloseTo(start[0].x + start[0].width / 2, 0);
    const end = [await bounds(day(page, 'r', '2026-09-16')), await bounds(band(page, 'r', '2026-09-16'))];
    expect(end[1].x + end[1].width).toBeCloseTo(end[0].x + end[0].width / 2, 0);
    // Across the month's end without the neighbouring days: the empty cells after 30 September carry no band.
    const empty = host(page, 'x').locator('.page.current .cell.empty');
    expect(await empty.first().locator('.band').count()).toBe(0);
    expect(await css(empty.first(), 'background-color')).toBe('rgba(0, 0, 0, 0)');
  });

  test('CAL-4: the narrow weekday names from the locale, centred, in their role and color, column headers named by the full name, taking no focus', async ({ page }) => {
    await mount(page, [f('c'), f('ja', { locale: 'ja-JP' })]);
    const headers = host(page, 'c').locator('[role="columnheader"]');
    await expect(headers).toHaveText(['S', 'M', 'T', 'W', 'T', 'F', 'S']);
    await expect(headers.first()).toHaveAttribute('aria-label', 'Sunday');
    expect(await headers.first().getAttribute('tabindex')).toBeNull();
    expect(await css(headers.first(), 'color')).toBe(await resolveColor(page, T('weekday-color')));
    expect(await px(headers.first(), 'font-size')).toBe(await resolveToken(page, T('weekday-typescale-font-size')));
    await expect(host(page, 'ja').locator('[role="columnheader"]')).toHaveText(['日', '月', '火', '水', '木', '金', '土']);
  });

  test('CAL-5: the previous and next buttons are text medium Buttons with arrows by the axis — up and down (vertical), back and forward (horizontal, the same names right to left, where the icon helper mirrors each) — disabled at min’s and max’s months, hidden in the year view', async ({ page }) => {
    await mount(page, [f('c', { value: '2026-09-17' }), f('b', { value: '2026-09-17', min: '2026-09-01', max: '2026-10-31' })]);
    const glyphs = async (id: string) => [await button(page, id, 'previous').locator('[slot="icon"]').textContent(), await button(page, id, 'next').locator('[slot="icon"]').textContent()];
    expect(await token(page, T('navigation-axis'))).toBe('vertical');
    expect(await glyphs('c')).toEqual(['arrow_upward', 'arrow_downward']);
    for (const name of ['previous', 'next'] as const) {
      await expect(button(page, 'c', name)).toHaveAttribute('variant', 'text');
      await expect(button(page, 'c', name)).toHaveAttribute('size', 'medium');
    }
    await expect(button(page, 'c', 'previous')).toHaveAttribute('label', 'Previous month');
    expect(await button(page, 'b', 'previous').evaluate((el: any) => el.disabled)).toBe(true);
    expect(await button(page, 'b', 'next').evaluate((el: any) => el.disabled)).toBe(false);
    await button(page, 'b', 'next').click();
    await expect.poll(() => button(page, 'b', 'next').evaluate((el: any) => el.disabled)).toBe(true);
    // A fixture system that sets the axis to horizontal (1).
    await override(page, { [T('navigation-axis')]: 'horizontal' });
    await expect.poll(() => glyphs('c')).toEqual(['arrow_back', 'arrow_forward']);
    // Right to left: the names never change; each Button's icon helper mirrors its flagged glyph in its own box (BTN-19).
    const mirrored = (id: string) =>
      Promise.all((['previous', 'next'] as const).map((name) => button(page, id, name).locator('[slot="icon"]').evaluate((el) => getComputedStyle(el).transform)));
    expect(await mirrored('c')).toEqual(['none', 'none']);
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    expect(await glyphs('c')).toEqual(['arrow_back', 'arrow_forward']);
    expect(await mirrored('c')).toEqual(['matrix(-1, 0, 0, 1, 0, 0)', 'matrix(-1, 0, 0, 1, 0, 0)']);
    await page.evaluate(() => document.documentElement.removeAttribute('dir'));
    expect(await mirrored('c')).toEqual(['none', 'none']);
    await toggle(page, 'c').click();
    await expect.poll(() => css(host(page, 'c').locator('.arrows'), 'visibility')).toBe('hidden');
  });

  test('CAL-6: the view toggle — month and year in the locale’s form and the expand_more chevron in its tokens, at least its height, hit area to the target — switches the views, the chevron turned in the year view', async ({ page }) => {
    await mount(page, [f('c', { value: '2026-09-17' }), f('ja', { value: '2026-09-17', locale: 'ja-JP' })]);
    const b = toggle(page, 'c').locator('.box');
    await expect(toggle(page, 'c').locator('.toggle-label')).toHaveText('September 2026');
    await expect(toggle(page, 'ja').locator('.toggle-label')).toHaveText('2026年9月');
    await expect(toggle(page, 'c').locator('.chevron')).toHaveText('expand_more');
    expect((await bounds(b)).height).toBeGreaterThanOrEqual((await resolveToken(page, T('view-toggle-container-height'))) - 0.5);
    expect(await px(b, 'padding-left')).toBe(await resolveToken(page, T('view-toggle-container-padding-inline')));
    expect(await px(b, 'column-gap')).toBe(await resolveToken(page, T('view-toggle-gap')));
    expect(await px(toggle(page, 'c').locator('.chevron'), 'font-size')).toBe(await resolveToken(page, T('view-toggle-icon-size')));
    expect(await css(b, 'background-color')).toBe(await resolveColor(page, T('unselected-container-color')));
    expect(Number.parseFloat(await css(toggle(page, 'c'), 'height', '::before'))).toBeGreaterThanOrEqual(await resolveToken(page, '--tanrei-sys-target-pointer'));
    await toggle(page, 'c').click();
    await expect(toggle(page, 'c')).toHaveAttribute('aria-expanded', 'true');
    await expect(host(page, 'c').locator('.years')).not.toHaveAttribute('data-off', '');
    await settled(page, 'c');
    expect(await css(toggle(page, 'c').locator('.chevron'), 'rotate')).toBe('180deg');
    await toggle(page, 'c').click();
    await expect(toggle(page, 'c')).toHaveAttribute('aria-expanded', 'false');
  });

  test('CAL-6, CAL-7: the years are drawn while the year view is shown and until it has faded out — a calendar in its day view holds none of them, at once where motion is reduced', async ({ page }) => {
    await mount(page, [f('c', { value: '2026-09-17' })]);
    const years = host(page, 'c').locator('.year');
    const nodes = () => host(page, 'c').evaluate((el) => el.shadowRoot!.querySelectorAll('*').length);
    // The day view: the weekday row, six rows of days and the navigation row — well under the two hundred years' worth.
    await expect(years).toHaveCount(0);
    const resting = await nodes();
    expect(resting).toBeLessThan(250);
    await toggle(page, 'c').click();
    await expect(years).toHaveCount(201);
    await settled(page, 'c');
    // Back to the days: the list keeps its years while it fades out (the cross-fade), then lets them go. (The fade at
    // 40 s and ended by hand: the years are counted an answer after the click, and at the token's length a runner that
    // takes longer than that to answer counted none.)
    await override(page, { [T('motion-page-duration')]: '40s' });
    await toggle(page, 'c').click();
    expect(await years.count()).toBe(201);
    expect(await host(page, 'c').locator('.years').evaluate((el) => el.getAnimations().map((animation) => (animation as CSSTransition).transitionProperty)), 'the list is on its way out').toContain('visibility');
    await host(page, 'c').evaluate((el) => el.shadowRoot!.getAnimations().forEach((animation) => animation.finish()));
    await expect(years).toHaveCount(0);
    await override(page, { [T('motion-page-duration')]: '' });
    expect(await nodes()).toBe(resting);
    // Chosen by a year, too.
    await toggle(page, 'c').click();
    await year(page, 'c', 2027).click();
    await expect(toggle(page, 'c').locator('.toggle-label')).toHaveText('September 2027');
    await expect(years).toHaveCount(0);
    // Reduced motion: nothing fades, so nothing waits.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await toggle(page, 'c').click();
    await expect(years).toHaveCount(201);
    await toggle(page, 'c').click();
    await expect(years).toHaveCount(0);
  });

  test('CAL-7: the year view lists min’s year to max’s (1900–2100 without them) in rows of three, opens with the displayed year third in view; choosing a year shows that month’s day view with focus on its active day and the choice unchanged', async ({ page }) => {
    await mount(page, [f('y', { startView: 'year', value: '2026-09-17' }), f('b', { startView: 'year', value: '2026-09-17', min: '2024-03-01', max: '2027-05-31' })]);
    await expect(host(page, 'y').locator('.year')).toHaveCount(201);
    await expect(host(page, 'y').locator('.year').first()).toHaveText('1900');
    await expect(host(page, 'b').locator('.year')).toHaveText(['2024', '2025', '2026', '2027']);
    const list = await bounds(host(page, 'y').locator('.years'));
    const cell = await bounds(year(page, 'y', 2026));
    expect(cell.width).toBeCloseTo(list.width / 3, 0);
    expect(Math.round((cell.y - list.y) / cell.height)).toBe(2);
    const size = [await resolveToken(page, T('year-container-width')), await resolveToken(page, T('year-container-height'))];
    const yb = await bounds(year(page, 'y', 2026).locator('.box'));
    expect([Math.round(yb.width), Math.round(yb.height)]).toEqual(size);
    await year(page, 'y', 2030).click();
    await expect.poll(() => shown(page, 'y')).toBe('September 2030');
    await expect.poll(() => focused(page)).toBe('2030-09-01');
    expect(await host(page, 'y').evaluate((el: any) => el.value)).toBe('2026-09-17');
    expect(await log(page)).toEqual([]);
    // Clamped between min's and max's months.
    await year(page, 'b', 2027).click();
    await expect.poll(() => shown(page, 'b')).toBe('May 2027');
    // The toggle in the year view shows the day view unchanged.
    await toggle(page, 'b').click();
    await toggle(page, 'b').click();
    await expect.poll(() => shown(page, 'b')).toBe('May 2027');
  });
});

test.describe('choosing', () => {
  test('CAL-8: in single mode a chosen day by click, Enter or Space becomes value, and change fires once when it differs', async ({ page }) => {
    await mount(page, [f('c', { value: '2026-09-17' })]);
    await day(page, 'c', '2026-09-18').click();
    expect(await log(page)).toEqual(['{"value":"2026-09-18","start":"","end":""}:2026-09-18||']);
    await day(page, 'c', '2026-09-18').click();
    expect(await log(page)).toHaveLength(1);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    expect((await log(page)).slice(1)).toEqual(['{"value":"2026-09-19","start":"","end":""}:2026-09-19||', '{"value":"2026-09-20","start":"","end":""}:2026-09-20||']);
  });

  test('CAL-9: in range mode a day makes the start (none yet, both chosen, or before the start) or the end; change fires after each with both; unavailable days stay inside the span', async ({ page }) => {
    await mount(page, [f('r', { mode: 'range', disabledDates: ['2026-09-13'] })]);
    await day(page, 'r', '2026-09-10').click();
    await day(page, 'r', '2026-09-08').click();
    await day(page, 'r', '2026-09-15').click();
    await day(page, 'r', '2026-09-20').click();
    await day(page, 'r', '2026-09-20').click();
    expect(await log(page)).toEqual([
      '{"value":"","start":"2026-09-10","end":""}:|2026-09-10|',
      '{"value":"","start":"2026-09-08","end":""}:|2026-09-08|',
      '{"value":"","start":"2026-09-08","end":"2026-09-15"}:|2026-09-08|2026-09-15',
      '{"value":"","start":"2026-09-20","end":""}:|2026-09-20|',
      '{"value":"","start":"2026-09-20","end":"2026-09-20"}:|2026-09-20|2026-09-20',
    ]);
    await host(page, 'r').evaluate((el: any) => ((el.start = '2026-09-10'), (el.end = '2026-09-16')));
    await expect(day(page, 'r', '2026-09-13')).toHaveClass(/in-range/);
    await expect(day(page, 'r', '2026-09-13')).toHaveAttribute('aria-disabled', 'true');
  });

  test('CAL-15: with showAdjacentDays the spare cells hold the neighbouring months’ days, quieter; choosing an available one emits change and then shows its month, where it is the active day and takes focus if focus was in the grid — a range’s start and its end too; an unavailable one does nothing; without it the cells are empty and hidden', async ({ page }) => {
    await mount(page, [
      f('a', { value: '2026-09-17', showAdjacentDays: true }),
      f('n', { value: '2026-09-17' }),
      f('r', { mode: 'range', showAdjacentDays: true }),
      f('u', { value: '2026-09-17', showAdjacentDays: true, disabledDates: ['2026-10-02'] }),
    ]);
    const adjacent = day(page, 'a', '2026-08-30');
    await expect(adjacent).toHaveAttribute('data-adjacent', '');
    expect(await css(adjacent.locator('.box'), 'color')).toBe(await resolveColor(page, T('adjacent-label-color')));
    await expect(day(page, 'a', '2026-10-10')).toHaveCount(1);
    // The order: change is heard while September is still the displayed month, and October is shown after it.
    await page.evaluate(() => {
      const c = document.querySelector<any>('[data-fixture="a"] tanrei-calendar');
      c.addEventListener('change', () => ((window as any).shownAtChange = c.shadowRoot.querySelector('.day-view').getAttribute('aria-label')));
    });
    await day(page, 'a', '2026-09-17').focus();
    await day(page, 'a', '2026-10-01').click();
    expect(await log(page)).toEqual(['{"value":"2026-10-01","start":"","end":""}:2026-10-01||']);
    expect(await page.evaluate(() => (window as any).shownAtChange)).toBe('September 2026');
    await expect.poll(() => shown(page, 'a')).toBe('October 2026');
    // With the motion of CAL-14: the days travel there.
    expect(await moving(page, 'a')).toBe('vertical');
    await land(page, 'a');
    // One of the month's own now, the active day, and — focus was in the grid — focused, without a ring.
    await expect(day(page, 'a', '2026-10-01')).toHaveClass(/selected/);
    await expect(day(page, 'a', '2026-10-01')).not.toHaveAttribute('data-adjacent');
    await expect(day(page, 'a', '2026-10-01')).toHaveAttribute('tabindex', '0');
    expect(await focused(page)).toBe('2026-10-01');
    await expect(host(page, 'a').locator('.announce')).toHaveText('October 2026');
    // Focus that was not in the grid stays where it was.
    await button(page, 'a', 'previous').focus();
    await day(page, 'a', '2026-11-03').click();
    await expect.poll(() => shown(page, 'a')).toBe('November 2026');
    expect(await focused(page)).toBe('previous');
    // A range's start and its end both show their month.
    await day(page, 'r', '2026-08-31').click();
    await expect.poll(() => shown(page, 'r')).toBe('August 2026');
    await land(page, 'r');
    await day(page, 'r', '2026-09-02').click();
    await expect.poll(() => shown(page, 'r')).toBe('September 2026');
    // Its days land before another calendar of the page is pressed: a grid that lands takes its month's height, and
    // what stands under it moves.
    await land(page, 'r');
    expect((await log(page)).slice(2)).toEqual(['{"value":"","start":"2026-08-31","end":""}:|2026-08-31|', '{"value":"","start":"2026-08-31","end":"2026-09-02"}:|2026-08-31|2026-09-02']);
    // An unavailable one chooses nothing and shows no other month.
    const before = (await log(page)).length;
    await day(page, 'u', '2026-10-02').click({ force: true });
    expect(await log(page)).toHaveLength(before);
    expect(await shown(page, 'u')).toBe('September 2026');
    expect(await moving(page, 'u')).toBe(null);
    const empty = host(page, 'n').locator('.page.current .cell.empty');
    await expect(empty).toHaveCount(42 - 30);
    await expect(empty.first()).toHaveAttribute('aria-hidden', 'true');
    await empty.first().click({ force: true });
    expect(await log(page)).toHaveLength(before);
  });

  test('CAL-16: days before min, after max, listed or named by isDateDisabled are unavailable — drawn from the disabled tokens, exposed disabled, reachable, never chosen; a chosen one still draws as chosen', async ({ page }) => {
    await mount(page, [f('u', { value: '2026-09-12', min: '2026-09-03', max: '2026-09-22', disabledDates: ['2026-09-12'] })]);
    await host(page, 'u').evaluate((el: any) => (el.isDateDisabled = (iso: string) => iso === '2026-09-19'));
    for (const iso of ['2026-09-02', '2026-09-23', '2026-09-12', '2026-09-19']) await expect(day(page, 'u', iso)).toHaveAttribute('aria-disabled', 'true');
    await expect(day(page, 'u', '2026-09-18')).not.toHaveAttribute('aria-disabled', 'true');
    expect(await css(box(page, 'u', '2026-09-02'), 'color')).toBe(await resolveColor(page, T('unselected-disabled-label-color')));
    expect(await css(day(page, 'u', '2026-09-02'), 'opacity')).toBe(await token(page, T('disabled-opacity')));
    // The chosen unavailable day draws as chosen, from the selected condition's disabled tokens.
    await expect(day(page, 'u', '2026-09-12')).toHaveClass(/selected/);
    expect(await css(box(page, 'u', '2026-09-12'), 'background-color')).toBe(await resolveColor(page, T('selected-disabled-container-color')));
    await day(page, 'u', '2026-09-19').click({ force: true });
    expect(await log(page)).toEqual([]);
    // Reachable by the arrow keys, not chosen by Enter.
    await day(page, 'u', '2026-09-18').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => focused(page)).toBe('2026-09-19');
    await page.keyboard.press('Enter');
    expect(await log(page)).toEqual([]);
  });

  test('CAL-17: the first month is value’s or start’s, else today’s, between min and max, or the year view; a date set outside the displayed month shows that month without the motion', async ({ page }) => {
    await mount(page, [f('v', { value: '2026-03-05' }), f('t'), f('m', { min: '2026-11-01' }), f('y', { startView: 'year' })]);
    expect(await shown(page, 'v')).toBe('March 2026');
    expect(await shown(page, 't')).toBe('September 2026');
    expect(await shown(page, 'm')).toBe('November 2026');
    await expect(toggle(page, 'y')).toHaveAttribute('aria-expanded', 'true');
    await host(page, 'v').evaluate((el: any) => (el.value = '2027-01-20'));
    await expect.poll(() => shown(page, 'v')).toBe('January 2027');
    // Without the motion of CAL-14: the grid holds January's view alone, at once.
    expect(await moving(page, 'v')).toBe(null);
    expect(await travelling(page, 'v')).toBe(null);
    await expect(host(page, 'v').locator('.page.current [role="row"]')).toHaveCount(6);
  });
});

test.describe('keyboard and navigation', () => {
  test('CAL-10: the grid has one tab stop, the active day: the chosen date (start), else today, else the first available day, else the first', async ({ page }) => {
    await mount(page, [f('v', { value: '2026-09-17' }), f('t'), f('m', { min: '2026-10-05', value: '' }), f('r', { mode: 'range', start: '2026-09-10' })]);
    const stop = (id: string) => host(page, id).locator('.page.current .day[tabindex="0"]').getAttribute('data-date');
    expect(await stop('v')).toBe('2026-09-17');
    expect(await stop('t')).toBe('2026-09-24');
    expect(await stop('m')).toBe('2026-10-05');
    expect(await stop('r')).toBe('2026-09-10');
    await expect(host(page, 'v').locator('.page.current .day[tabindex="0"]')).toHaveCount(1);
    await tabTo(page, day(page, 'v', '2026-09-17'));
    expect(await focused(page)).toBe('2026-09-17');
  });

  test('CAL-11: the arrows move a day (mirrored right to left) or a week, Home and End to the row’s ends, Page Up/Down a month, Shift a year, whatever the axis; never past min or max', async ({ page }) => {
    await mount(page, [f('c', { value: '2026-09-17', max: '2027-09-30' })]);
    const go = async (key: string, expected: string) => {
      await page.keyboard.press(key);
      await expect.poll(() => focused(page), key).toBe(expected);
    };
    await day(page, 'c', '2026-09-17').focus();
    await go('ArrowRight', '2026-09-18');
    await go('ArrowLeft', '2026-09-17');
    await go('ArrowDown', '2026-09-24');
    await go('ArrowUp', '2026-09-17');
    await go('Home', '2026-09-13');
    await go('End', '2026-09-19');
    await go('PageDown', '2026-10-19');
    expect(await shown(page, 'c')).toBe('October 2026');
    await go('PageUp', '2026-09-19');
    await go('Shift+PageDown', '2027-09-19');
    await go('Shift+PageDown', '2027-09-30');
    await override(page, { [T('navigation-axis')]: 'horizontal' });
    await go('ArrowUp', '2027-09-23');
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    await go('ArrowRight', '2027-09-22');
  });

  test('CAL-12: the year list is one tab stop; the arrows move a year (mirrored) or a row, Home and End to its ends, scrolled into view; Enter chooses', async ({ page }) => {
    await mount(page, [f('y', { startView: 'year', value: '2026-09-17' })]);
    await expect(host(page, 'y').locator('.year[tabindex="0"]')).toHaveCount(1);
    await year(page, 'y', 2026).focus();
    const go = async (key: string, expected: number) => {
      await page.keyboard.press(key);
      await expect.poll(() => focused(page), key).toBe(`year:${expected}`);
    };
    await go('ArrowRight', 2027);
    await go('ArrowLeft', 2026);
    await go('ArrowDown', 2029);
    await go('ArrowUp', 2026);
    await go('End', 2100);
    expect(await year(page, 'y', 2100).isVisible()).toBe(true);
    const list = await bounds(host(page, 'y').locator('.years'));
    const last = await bounds(year(page, 'y', 2100));
    expect(last.y + last.height).toBeLessThanOrEqual(list.y + list.height + 1);
    await go('Home', 1900);
    await page.keyboard.press('Enter');
    await expect.poll(() => shown(page, 'y')).toBe('September 1900');
  });

  test('CAL-13: the buttons, a step of a wheel, a scroll that ends on another month, a released drag and a chosen neighbouring day show the month, keep focus where it was, carry the day number (the last day of a shorter month; the chosen day) and announce the month once, politely', async ({ page }) => {
    await mount(page, [f('c', { value: '2026-10-31' }), f('d', { value: '2026-09-17', showAdjacentDays: true })]);
    // (Activated by its key: Safari on macOS takes focus off a button a mouse presses, which is the browser's doing.)
    await button(page, 'c', 'previous').focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => shown(page, 'c')).toBe('September 2026');
    expect(await focused(page)).toBe('previous');
    await expect(host(page, 'c').locator('.page.current .day[tabindex="0"]')).toHaveAttribute('data-date', '2026-09-30');
    const live = host(page, 'c').locator('.announce');
    await expect(live).toHaveAttribute('aria-live', 'polite');
    await expect(live).toHaveText('September 2026');
    await button(page, 'c', 'next').click();
    await expect(live).toHaveText('October 2026');
    // A drag released on another month: shown, the day number carried, announced once; a focused day hands the focus on.
    await land(page, 'd');
    await day(page, 'd', '2026-09-17').focus();
    const said = host(page, 'd').locator('.announce');
    await expect(said).toHaveText('');
    await pointer(page, 'd', [{ dy: -20 }, { dy: -4 * (await rowHeight(page, 'd')) }]);
    await expect.poll(() => shown(page, 'd')).toBe('October 2026');
    await expect(said).toHaveText('October 2026');
    await land(page, 'd');
    await expect(host(page, 'd').locator('.page.current .day[tabindex="0"]')).toHaveAttribute('data-date', '2026-10-17');
    expect(await focused(page)).toBe('2026-10-17');
    // A chosen day of a neighbouring month: its month, and the chosen day the active one (CAL-15).
    await day(page, 'd', '2026-11-05').click();
    await expect(said).toHaveText('November 2026');
    await expect(host(page, 'd').locator('.page.current .day[tabindex="0"]')).toHaveAttribute('data-date', '2026-11-05');
    await land(page, 'd');
    // A step of a detented wheel: the month, the day number carried, announced; focus stays on the day it hands on to.
    await holdClock(page);
    await scroll(page, 'd', [{ dy: 1, mode: 1 }]);
    await expect(said).toHaveText('December 2026');
    await expect(host(page, 'd').locator('.page.current .day[tabindex="0"]')).toHaveAttribute('data-date', '2026-12-05');
    expect(await focused(page)).toBe('2026-12-05');
    await land(page, 'd');
    // A scroll that passes January and ends on February: January is shown in passing and not announced; February is,
    // once, when the scroll has ended — and the day number is carried through both.
    const row = await rowHeight(page, 'd');
    const passed = await scroll(page, 'd', [{ dy: 4 * row }, { dy: 3 * row }]);
    expect(passed.months).toEqual(['January 2027', 'January 2027']);
    await expect(said).toHaveText('December 2026');
    await quiet(page);
    await expect.poll(() => shown(page, 'd')).toBe('February 2027');
    await expect(said).toHaveText('February 2027');
    await expect(host(page, 'd').locator('.page.current .day[tabindex="0"]')).toHaveAttribute('data-date', '2027-02-05');
    expect(await focused(page)).toBe('2027-02-05');
  });

  test('CAL-14: a button’s, a key’s and a wheel step’s change plays over the page motion — on the vertical axis as one scroll of the weeks, one grid whose shared row is between its two places, on the horizontal as two pages; every way of moving the month moves the same progress, and one that begins while the days are moving (a change after a change, a scroll during a change, a button during a scroll) carries on without a jump; the views cross-fade; at once where reduced', async ({ page }) => {
    await mount(page, [f('c', { value: '2026-09-17', min: '2026-01-01', max: '2027-06-30' })]);
    // The change: the progress travels from one view to the other over the page motion, with its easing. (At 40 s, as
    // in every test of this file that holds a travel: it is found and held one to four answers after what begins it —
    // 570 ms apiece in WebKit on Linux — and a travel of 4 s had ended by then. None is waited for: `land` ends it.)
    await override(page, { [T('motion-page-duration')]: '40000ms', [T('motion-page-easing')]: 'linear' });
    await button(page, 'c', 'next').click();
    expect(await travelling(page, 'c')).toBe(40_000);
    expect(await travelEasing(page, 'c')).toBe('linear');
    // A frame in the middle of it: ONE grid — the rows of both views in one column, the shared week (September 27 to
    // October 3) once, between its place in September's view (the fifth row) and in October's (the first).
    expect(await hold(page, 'c', 10_000)).toBeCloseTo(0.25, 5);
    await expect(host(page, 'c').locator('.page')).toHaveCount(1);
    await expect(host(page, 'c').locator('.page.current [role="row"]')).toHaveCount(10);
    await expect(host(page, 'c').locator('.day[data-date="2026-09-27"]')).toHaveCount(1);
    expect(await rowAt(page, 'c', '2026-09-27')).toBeCloseTo(4 - 4 * 0.25, 2);
    // The grid keeps its six rows, the weekday row and the navigation row their places.
    expect((await bounds(pages(page, 'c'))).height).toBeCloseTo(6 * (await bounds(day(page, 'c', '2026-09-28'))).height, 0);
    expect(await host(page, 'c').locator('.weekdays').evaluate((el) => el.getAnimations().length)).toBe(0);
    // A change that begins while this one plays carries on from what is on screen: the row does not jump.
    const at = await rowAt(page, 'c', '2026-09-27');
    const twice = () => host(page, 'c').evaluate((el, name) => {
      const press = () => el.shadowRoot!.querySelector<HTMLElement>(`tanrei-button.${name}`)!.click();
      press();
    }, 'next');
    await twice();
    expect(await travelling(page, 'c')).toBe(40_000);
    await hold(page, 'c', 0);
    expect(await shown(page, 'c')).toBe('November 2026');
    await expect(host(page, 'c').locator('.day[data-date="2026-11-30"]')).toHaveCount(1);
    expect(await rowAt(page, 'c', '2026-09-27')).toBeCloseTo(at, 2);
    // And back again, from the same place.
    await host(page, 'c').evaluate((el) => el.shadowRoot!.querySelector<HTMLElement>('tanrei-button.previous')!.click());
    await hold(page, 'c', 0);
    await host(page, 'c').evaluate((el) => el.shadowRoot!.querySelector<HTMLElement>('tanrei-button.previous')!.click());
    await hold(page, 'c', 0);
    expect(await shown(page, 'c')).toBe('September 2026');
    expect(await rowAt(page, 'c', '2026-09-27')).toBeCloseTo(at, 2);
    await land(page, 'c');
    await expect(host(page, 'c').locator('.page.current [role="row"]')).toHaveCount(6);
    expect(await progress(page, 'c')).toBe(0);
    // A scroll that begins before a button's change has ended carries on from where the days are: 24 px further, with
    // no frame at either month's view in between (CAL-33).
    const row = await rowHeight(page, 'c');
    await holdClock(page);
    await button(page, 'c', 'next').click();
    expect(await hold(page, 'c', 10_000)).toBeCloseTo(0.25, 5);
    expect(await rowAt(page, 'c', '2026-09-27')).toBeCloseTo(3, 2);
    const scrolled = await scroll(page, 'c', [{ dy: 24 }]);
    expect(scrolled.progress).toBeCloseTo(0.25 + 24 / (4 * row), 5);
    expect(await held(page, 'c')).toBe(true);
    expect(await travelling(page, 'c')).toBe(null);
    expect(await rowAt(page, 'c', '2026-09-27')).toBeCloseTo(3 - 24 / row, 2);
    expect(await shown(page, 'c')).toBe('October 2026');
    // A key while the scroll holds the days: the same progress again, travelling on from that place (Page Up: September).
    await day(page, 'c', '2026-10-17').focus();
    await page.keyboard.press('PageUp');
    await expect.poll(() => held(page, 'c')).toBe(false);
    expect(await travelling(page, 'c')).toBe(40_000);
    await hold(page, 'c', 0);
    expect(await shown(page, 'c')).toBe('September 2026');
    expect(await rowAt(page, 'c', '2026-09-27')).toBeCloseTo(3 - 24 / row, 2);
    await land(page, 'c');
    await quiet(page);
    // A step of a detented wheel plays as a button's change does.
    await scroll(page, 'c', [{ dy: 3, mode: 1 }]);
    expect(await shown(page, 'c')).toBe('October 2026');
    expect(await travelling(page, 'c')).toBe(40_000);
    expect(await hold(page, 'c', 20_000)).toBeCloseTo(0.5, 5);
    await land(page, 'c');
    await button(page, 'c', 'previous').click();
    await land(page, 'c');
    // A horizontal axis: the change is two pages, the old month's leaving toward the start and the new one's coming
    // from the end.
    await override(page, { [T('navigation-axis')]: 'horizontal' });
    await scroll(page, 'c', [{ dx: 1, mode: 1 }]);
    await page.clock.resume();
    await expect.poll(() => shown(page, 'c')).toBe('October 2026');
    expect(await moving(page, 'c')).toBe('horizontal');
    expect(await hold(page, 'c', 10_000)).toBeCloseTo(0.25, 5);
    await expect(host(page, 'c').locator('.page')).toHaveCount(2);
    const width = (await bounds(pages(page, 'c'))).width;
    const [old, next] = [await bounds(host(page, 'c').locator('.page:not(.current)')), await bounds(host(page, 'c').locator('.page.current'))];
    expect(old.x - (await bounds(pages(page, 'c'))).x).toBeCloseTo(-0.25 * width, 0);
    expect(next.x - old.x).toBeCloseTo(width, 0);
    await land(page, 'c');
    await expect(host(page, 'c').locator('.page')).toHaveCount(1);
    // The views cross-fade over the same motion.
    expect(await css(host(page, 'c').locator('.years'), 'transition-duration')).toContain('40s');
    // Reduced motion: every change at once.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await button(page, 'c', 'next').click();
    expect(await shown(page, 'c')).toBe('November 2026');
    expect(await moving(page, 'c')).toBe(null);
    expect(await travelling(page, 'c')).toBe(null);
    expect(await css(host(page, 'c').locator('.years'), 'transition-duration')).toBe('0s');
    await override(page, { [T('navigation-axis')]: '' });
    await button(page, 'c', 'next').click();
    expect(await shown(page, 'c')).toBe('December 2026');
    expect(await moving(page, 'c')).toBe(null);
  });
});

test.describe('the column of weeks and the drag', () => {
  /** What CAL-29 says is drawn at `p` between September's view (0) and October's (1), 2026. */
  const expectBetween = async (page: P, id: string, p: number, adjacentDays: boolean, what: string) => {
    // The rows are offset by the progress times the four rows between the two views: the shared row travels.
    expect(await rowAt(page, id, '2026-09-27'), `${what}: the shared row`).toBeCloseTo(4 - 4 * p, 2);
    // October 1: a neighbouring month's day in September's view, one of the month's own in October's.
    const first = await drawn(page, id, '2026-10-01');
    if (adjacentDays) {
      for (const part of ['label', 'container', 'outline'] as const)
        expectColor(first[part], mixed(await tokenRGBA(page, T(`adjacent-${part}-color`)), await tokenRGBA(page, T(`unselected-${part}-color`)), p), `${what}: October 1's ${part}`);
      expect(first.opacity, `${what}: October 1 is drawn by both views`).toBe(1);
      // September 30, the other way: the month's own, then a neighbouring month's.
      expectColor((await drawn(page, id, '2026-09-30')).label, mixed(await tokenRGBA(page, T('unselected-label-color')), await tokenRGBA(page, T('adjacent-label-color')), p), `${what}: September 30's label`);
    } else {
      // Without adjacent days September's view leaves its cell empty: it fades in, in the month's own colors.
      expect(first.opacity, `${what}: October 1 fades in`).toBeCloseTo(p, 5);
      expectColor(first.label, await tokenRGBA(page, T('unselected-label-color')), `${what}: October 1's label`);
      expect((await drawn(page, id, '2026-09-30')).opacity, `${what}: September 30 fades out`).toBeCloseTo(1 - p, 5);
    }
    // A row outside a view's six: October 20 comes into view, September 8 leaves it.
    expect((await drawn(page, id, '2026-10-20')).opacity, `${what}: October 20`).toBeCloseTo(p, 5);
    expect((await drawn(page, id, '2026-09-08')).opacity, `${what}: September 8`).toBeCloseTo(1 - p, 5);
    // A day both views draw alike does not change: today's ring, and a day of the shared row that is neither's own.
    const today = await drawn(page, id, '2026-09-24');
    expectColor(today.outline, await tokenRGBA(page, T('today-outline-color')), `${what}: today's ring`);
    expectColor(today.label, await tokenRGBA(page, T('today-label-color')), `${what}: today's label`);
  };

  test('CAL-29: one column of week rows drawn from one progress — a drag held a quarter, a half and three quarters of the way from September to October offsets the shared row, mixes October 1 between adjacent and unselected (fades it without adjacent days), fades October 20 in and September 8 out; September 28 is one element throughout; a frame of a button’s change draws the same; months that are not neighbours lie six rows apart', async ({ page }) => {
    test.setTimeout(120_000);
    for (const adjacentDays of [true, false]) {
      await mount(page, [f('c', { value: '2026-09-17', showAdjacentDays: adjacentDays })]);
      // Each state's recoloring aside: the looks read are the resting ones.
      await override(page, { [T('motion-state-duration')]: '0ms' });
      const row = await rowHeight(page, 'c');
      await host(page, 'c').evaluate((el) => ((window as any).kept = el.shadowRoot!.querySelector('.day[data-date="2026-09-28"]')));
      const same = () => host(page, 'c').evaluate((el) => (window as any).kept === el.shadowRoot!.querySelector('.day[data-date="2026-09-28"]') && el.shadowRoot!.querySelectorAll('.day[data-date="2026-09-28"]').length === 1);
      // The drag: the progress is the travel over the distance between the two views (four rows), with no threshold.
      await pointer(page, 'c', [{ dy: -10 }], { up: null });
      for (const p of [0.25, 0.5, 0.75]) {
        const at = await pointerOn(page, 'c', [{ dy: -4 * row * p }]);
        // September's view is the second the grid holds (August's is before it): the progress counts from there.
        expect(at - 1, `held at ${p}`).toBeCloseTo(p, 5);
        await expectBetween(page, 'c', p, adjacentDays, `adjacent days ${adjacentDays}, a drag held at ${p}`);
        expect(await same(), 'September 28 is one element').toBe(true);
        // The band of a range aside, nothing has a threshold: a hair on, everything has moved by a hair.
      }
      await pointerOn(page, 'c', [{ dy: -4 * row * 0.75 }], { up: 300 });
      await land(page, 'c');
      expect(await shown(page, 'c')).toBe('October 2026');
      // (Without adjacent days October's view leaves its cell empty.)
      if (adjacentDays) expect(await same(), 'September 28 is one element after the release').toBe(true);
      // A frame of a button's month change is the same look at the progress the easing gives.
      await button(page, 'c', 'previous').click();
      await land(page, 'c');
      await host(page, 'c').evaluate((el) => ((window as any).kept = el.shadowRoot!.querySelector('.day[data-date="2026-09-28"]')));
      await override(page, { [T('motion-page-duration')]: '40000ms' });
      await button(page, 'c', 'next').click();
      const p = await hold(page, 'c', 13_000);
      expect(p).toBeGreaterThan(0.05);
      expect(p).toBeLessThan(0.95);
      await expectBetween(page, 'c', p, adjacentDays, `adjacent days ${adjacentDays}, a frame of a button’s change`);
      expect(await same(), 'September 28 is one element in a button’s change').toBe(true);
    }
    // The band of a range follows the same rule, each piece with its day.
    await mount(page, [f('r', { mode: 'range', start: '2026-09-08', end: '2026-10-20', showAdjacentDays: true })]);
    await override(page, { [T('motion-state-duration')]: '0ms' });
    const row = await rowHeight(page, 'r');
    await pointer(page, 'r', [{ dy: -10 }, { dy: -4 * row * 0.25 }], { up: null });
    expect((await drawn(page, 'r', '2026-09-09')).opacity).toBeCloseTo(0.75, 5);
    expect((await drawn(page, 'r', '2026-10-19')).opacity).toBeCloseTo(0.25, 5);
    expect(await css(band(page, 'r', '2026-10-19'), 'background-color')).toBe(await resolveColor(page, T('in-range-container-color')));
    // A day inside the range in the shared row is in-range in both views: it only travels.
    const shared = await drawn(page, 'r', '2026-10-01');
    expect(shared.opacity).toBe(1);
    expectColor(shared.label, await tokenRGBA(page, T('in-range-label-color')), 'an in-range day of the shared row');
    await cancelPointer(page, 'r');
    await land(page, 'r');
    // Months that are not neighbours (a step of a year): six rows apart, as if the later view began where the earlier ends.
    await override(page, { [T('motion-page-duration')]: '40000ms', [T('motion-page-easing')]: 'linear' });
    await day(page, 'r', '2026-09-08').focus();
    await page.keyboard.press('Shift+PageDown');
    await expect.poll(() => shown(page, 'r')).toBe('September 2027');
    expect(await hold(page, 'r', 20_000)).toBeCloseTo(0.5, 5);
    await expect(host(page, 'r').locator('.page.current [role="row"]')).toHaveCount(12);
    expect(await rowAt(page, 'r', '2026-09-01')).toBeCloseTo(-3, 2);
    expect(await rowAt(page, 'r', '2027-09-01')).toBeCloseTo(3, 2);
  });

  test('CAL-30: a drag of touch, a pen or the primary mouse button past the slop, further along the axis than across it, is the calendar’s — no day is chosen, the pressed day lets go, the days follow the pointer in the frame it moves, to the neighbouring month’s view at most and never past min or max; across the axis it is the page’s; another mouse button takes none', async ({ page }) => {
    await mount(page, [f('c', { value: '2026-09-17' }), f('x', { value: '2026-09-17', max: '2026-09-30' }), f('h', { value: '2026-09-17' })]);
    const row = await rowHeight(page, 'c');
    // Within the slop (8 px) nothing moves and the press is still a press.
    expect(await pointer(page, 'c', [{ dy: -6 }], { up: null, at: '2026-09-09' })).toBe(0);
    expect(await held(page, 'c')).toBe(false);
    await expect(box(page, 'c', '2026-09-09')).toHaveAttribute('data-pressed', 'overlay');
    // Past it, along the axis: taken. The days are where the pointer is, measured from the press, in the same task.
    expect((await pointerOn(page, 'c', [{ dy: -2 * row }])) - 1).toBeCloseTo(0.5, 5);
    expect(await held(page, 'c')).toBe(true);
    expect(await moving(page, 'c')).toBe('vertical');
    expect(await rowAt(page, 'c', '2026-09-27')).toBeCloseTo(2, 2);
    // No motion of its own: the progress has no transition while the drag holds it.
    expect(await travelling(page, 'c')).toBe(null);
    // The day under the press leaves its pressed state as when a press ends.
    await expect(box(page, 'c', '2026-09-09')).not.toHaveAttribute('data-pressed', /./);
    // On past the next month's view: the days stop there.
    expect((await pointerOn(page, 'c', [{ dy: -7 * row }])) - 1).toBe(1);
    expect(await rowAt(page, 'c', '2026-09-27')).toBeCloseTo(0, 2);
    // The other way, through the displayed month's view and on to the previous month's (five rows before), where they stop.
    expect((await pointerOn(page, 'c', [{ dy: 2.5 * row }])) - 1).toBeCloseTo(-0.5, 5);
    expect(await rowAt(page, 'c', '2026-08-30')).toBeCloseTo(2.5, 2);
    expect(await pointerOn(page, 'c', [{ dy: 9 * row }])).toBe(0);
    // Released there (on August's view), the press chose no day, and the click the release still produces chooses none.
    await pointerOn(page, 'c', [], { up: 300 });
    await day(page, 'c', '2026-08-12').dispatchEvent('click');
    expect(await log(page)).toEqual([]);
    expect(await host(page, 'c').evaluate((el: any) => el.value)).toBe('2026-09-17');
    expect(await shown(page, 'c')).toBe('August 2026');
    // Never past max's month: a drag toward the next month moves nothing; toward the previous one it does.
    expect(await pointer(page, 'x', [{ dy: -20 }, { dy: -3 * row }], { up: null })).toBe(1);
    expect(await rowAt(page, 'x', '2026-08-30')).toBeCloseTo(0, 2);
    await expect(host(page, 'x').locator('.day[data-date="2026-10-20"]')).toHaveCount(0);
    expect(await pointerOn(page, 'x', [{ dy: 2.5 * row }])).toBeCloseTo(0.5, 5);
    await cancelPointer(page, 'x');
    // Further across the axis than along it when it passes the slop: not the calendar's, for its whole length — the
    // grid leaves that pan to the scrolling ancestor.
    await land(page, 'c');
    await button(page, 'c', 'next').click();
    await land(page, 'c');
    expect(await pointer(page, 'c', [{ dx: 12, dy: -9 }, { dx: 14, dy: -3 * row }], { up: null })).toBe(0);
    expect(await held(page, 'c')).toBe(false);
    expect(await css(host(page, 'c').locator('.day-view'), 'touch-action')).toContain('pan-x');
    await pointerOn(page, 'c', [], { up: 300 });
    // A pen is followed, and so is the primary button of a mouse — past the same slop; another button takes no drag.
    expect((await pointer(page, 'c', [{ dy: -20 }, { dy: -row }], { up: null, pointerType: 'pen' })) - 1).toBeCloseTo(0.25, 5);
    await cancelPointer(page, 'c');
    await land(page, 'c');
    expect(await pointer(page, 'c', [{ dy: -7 }], { up: null, pointerType: 'mouse' })).toBe(0);
    expect(await held(page, 'c')).toBe(false);
    expect((await pointerOn(page, 'c', [{ dy: -row }])) - 1).toBeCloseTo(0.25, 5);
    expect(await held(page, 'c')).toBe(true);
    expect((await pointerOn(page, 'c', [{ dy: -9 * row }])) - 1).toBe(1);
    await cancelPointer(page, 'c');
    await land(page, 'c');
    expect(await pointer(page, 'c', [{ dy: -20 }, { dy: -3 * row }], { pointerType: 'mouse', button: 2 })).toBe(0);
    expect(await shown(page, 'c')).toBe('September 2026');
    // The horizontal axis: the two pages travel with the pointer, side by side — toward the start for the next month.
    await override(page, { [T('navigation-axis')]: 'horizontal' });
    const width = (await bounds(pages(page, 'h'))).width;
    expect((await pointer(page, 'h', [{ dx: -20 }, { dx: -0.5 * width }], { up: null })) - 1).toBeCloseTo(0.5, 5);
    expect(await moving(page, 'h')).toBe('horizontal');
    const [grid, current, next] = [await bounds(pages(page, 'h')), await bounds(host(page, 'h').locator('.page.current')), await bounds(host(page, 'h').locator('.page').last())];
    expect(current.x - grid.x).toBeCloseTo(-0.5 * width, 0);
    expect(next.x - grid.x).toBeCloseTo(0.5 * width, 0);
    expect(await css(host(page, 'h').locator('.day-view'), 'touch-action')).toContain('pan-y');
    // A vertical drag is the page's there.
    await cancelPointer(page, 'h');
    await land(page, 'h');
    expect(await pointer(page, 'h', [{ dy: -20 }, { dy: -100 }], { up: null })).toBe(0);
    expect(await held(page, 'h')).toBe(false);
  });

  test('CAL-30: a real mouse — a click inside the slop still chooses the day; a drag is followed outside the grid and the calendar, shows the grabbing cursor only once taken, draws no day hovered, selects no text and starts no drag and drop; released over another element it chooses no day there or here', async ({ page }) => {
    await mount(page, [f('c', { value: '2026-09-17', showAdjacentDays: true }), f('o', { value: '2026-09-17' })]);
    const row = await rowHeight(page, 'c');
    const from = await bounds(box(page, 'c', '2026-09-23'));
    const [x, y] = [from.x + from.width / 2, from.y + from.height / 2];
    const cursorOf = (locator: Locator) => css(locator, 'cursor');
    const hovered = () => host(page, 'c').evaluate((el) => el.shadowRoot!.querySelectorAll('.cell:hover').length);
    await page.evaluate(() => document.addEventListener('dragstart', () => ((window as any).dragStarted = true)));
    // At rest the cursor over a day is a pressable day's, and the day under the pointer is hovered.
    await page.mouse.move(x, y);
    expect(await cursorOf(day(page, 'c', '2026-09-23'))).toBe('pointer');
    expect(await hovered()).toBe(1);
    // A press that wobbles inside the slop (8 px) is a click: it chooses the day.
    await page.mouse.down();
    await page.mouse.move(x + 2, y - 6);
    expect(await held(page, 'c')).toBe(false);
    expect(await cursorOf(day(page, 'c', '2026-09-23'))).toBe('pointer');
    await page.mouse.up();
    expect(await log(page)).toHaveLength(1);
    expect(await host(page, 'c').evaluate((el: any) => el.value)).toBe('2026-09-23');
    // Past the slop it is a drag: the days follow, in the frame the pointer moves.
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y - 2 * row, { steps: 4 });
    expect(await held(page, 'c')).toBe(true);
    expect((await progress(page, 'c')) - 1).toBeCloseTo(0.5, 2);
    // The grabbing cursor, wherever in the calendar the pointer is; no day is hovered, and none takes the pointer.
    expect(await cursorOf(host(page, 'c').locator('.calendar'))).toBe('grabbing');
    expect(await host(page, 'c').evaluate((el, [px, py]) => getComputedStyle(el.shadowRoot!.elementFromPoint(px, py)!).cursor, [x, y - 2 * row] as const)).toBe('grabbing');
    expect(await hovered()).toBe(0);
    // Outside the grid and the calendar the pointer is still followed: back toward September's view, then far past October's.
    const other = await bounds(host(page, 'o').locator('.day-view'));
    await page.mouse.move(x + 300, y - row, { steps: 3 });
    expect((await progress(page, 'c')) - 1).toBeCloseTo(0.25, 2);
    await page.mouse.move(x + 300, 2, { steps: 3 });
    await page.mouse.move(other.x + 20, other.y + 20, { steps: 6 });
    expect((await progress(page, 'c')) - 1).toBeLessThan(0);
    await page.mouse.move(x + 300, y - 3 * row, { steps: 3 });
    expect((await progress(page, 'c')) - 1).toBeCloseTo(0.75, 2);
    // Nothing was selected as text, and the platform's drag and drop did not start.
    expect(await page.evaluate(() => String(getSelection()))).toBe('');
    expect(await page.evaluate(() => (window as any).dragStarted)).toBeUndefined();
    // Released outside, over nothing of the calendar's: October is shown, and no day is chosen by the click that follows.
    // (Released at rest, so that where the days are decides and not how fast the pointer came: its way here went up,
    // down and up again, and a browser that delivers those moves within the time a release looks back over — WebKit
    // does — sees a fling toward September in them. A fling's own choice is CAL-31's.)
    await releaseAtRest(page);
    await expect.poll(() => shown(page, 'c')).toBe('October 2026');
    await expect.poll(() => cursorOf(host(page, 'c').locator('.calendar'))).not.toBe('grabbing');
    await land(page, 'c');
    expect(await log(page)).toHaveLength(1);
    expect(await page.evaluate(() => String(getSelection()))).toBe('');
    // A drag begun on the weekday row or between the days is followed as well, and selects nothing.
    const weekday = await bounds(host(page, 'c').locator('.weekday').nth(3));
    await page.mouse.move(weekday.x + weekday.width / 2, weekday.y + weekday.height / 2);
    await page.mouse.down();
    await page.mouse.move(weekday.x + weekday.width / 2, weekday.y + weekday.height / 2 + 2 * row, { steps: 4 });
    expect(await held(page, 'c')).toBe(true);
    expect(await page.evaluate(() => String(getSelection()))).toBe('');
    await page.mouse.up();
    await expect.poll(() => shown(page, 'c')).toBe('September 2026');
    await land(page, 'c');
    // The secondary button takes no drag.
    await page.mouse.move(x, y);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(x, y - 2 * row, { steps: 4 });
    expect(await held(page, 'c')).toBe(false);
    expect(await progress(page, 'c')).toBe(0);
    await page.mouse.up({ button: 'right' });
    expect(await log(page)).toHaveLength(1);
  });

  test('CAL-31: a release chooses the neighbour from a quarter of the way on, else the displayed month — or the one a fling is toward, with a mouse as with a finger; another month is shown and announced and the days settle over the page motion; the displayed one has them return and announces nothing; a drag never chooses a day, changes the choice or emits change', async ({ page }) => {
    await mount(page, [f('c', { value: '2026-09-17' })]);
    await override(page, { [T('motion-page-duration')]: '40000ms', [T('motion-page-easing')]: 'linear' });
    const row = await rowHeight(page, 'c');
    const said = host(page, 'c').locator('.announce');
    // A fifth of the way: the displayed month; the days return over the page motion, and nothing is announced.
    await pointer(page, 'c', [{ dy: -20 }, { dy: -4 * row * 0.2 }], { at: '2026-09-09' });
    expect(await shown(page, 'c')).toBe('September 2026');
    expect(await held(page, 'c')).toBe(false);
    expect(await travelling(page, 'c')).toBe(40_000);
    // From where the release left them, not from a view.
    expect((await hold(page, 'c', 0)) - 1).toBeCloseTo(0.2, 5);
    expect((await hold(page, 'c', 20_000)) - 1).toBeCloseTo(0.1, 3);
    await land(page, 'c');
    await expect(said).toHaveText('');
    expect(await progress(page, 'c')).toBe(0);
    // A hair short of the quarter still returns.
    await pointer(page, 'c', [{ dy: -20 }, { dy: -4 * row * 0.24 }]);
    expect(await shown(page, 'c')).toBe('September 2026');
    await land(page, 'c');
    // Nothing drawn changes at the quarter: a hair either side is the same look but for that hair.
    await pointer(page, 'c', [{ dy: -20 }, { dy: -4 * row * 0.249 }], { up: null });
    const before = await drawn(page, 'c', '2026-10-20');
    await pointerOn(page, 'c', [{ dy: -4 * row * 0.251 }]);
    expect((await drawn(page, 'c', '2026-10-20')).opacity - before.opacity).toBeCloseTo(0.002, 4);
    // Three tenths of the way (from a quarter on): the neighbour. It is shown as any month change is, announced once,
    // and the days settle from where they were left.
    await pointerOn(page, 'c', [{ dy: -4 * row * 0.3 }], { up: 300 });
    expect(await shown(page, 'c')).toBe('October 2026');
    await expect(said).toHaveText('October 2026');
    await expect(host(page, 'c').locator('.page.current .day[tabindex="0"]')).toHaveAttribute('data-date', '2026-10-17');
    expect(await travelling(page, 'c')).toBe(40_000);
    expect((await hold(page, 'c', 0)) - 1).toBeCloseTo(0.3, 5);
    await land(page, 'c');
    // A fling toward the previous month from a little way: the previous month (0.5 px per ms or faster) — a mouse flings as a finger does.
    await pointer(page, 'c', [{ dy: 10 }, { dy: 40, dt: 16 }], { up: 8, pointerType: 'mouse' });
    expect(await shown(page, 'c')).toBe('September 2026');
    await expect(said).toHaveText('September 2026');
    await land(page, 'c');
    // A fling back toward the displayed month, from three quarters of the way: the displayed month.
    await pointer(page, 'c', [{ dy: -20 }, { dy: -4 * row * 0.75 - 40, dt: 400 }, { dy: -4 * row * 0.75, dt: 16 }], { up: 8 });
    expect(await shown(page, 'c')).toBe('September 2026');
    await land(page, 'c');
    // A pointer that stopped before it was lifted is no fling: the quarter decides.
    await pointer(page, 'c', [{ dy: -20 }, { dy: -40, dt: 16 }], { up: 300 });
    expect(await shown(page, 'c')).toBe('September 2026');
    await land(page, 'c');
    // A drag never chooses a day and never changes the choice.
    expect(await log(page)).toEqual([]);
    expect(await host(page, 'c').evaluate((el: any) => el.value)).toBe('2026-09-17');
    await expect(day(page, 'c', '2026-09-17')).toHaveClass(/selected/);
  });

  test('CAL-31: a fast drag that holds still for more than 40 ms before its release is no fling — the quarter decides — and the same drag released within 40 ms of its last move is one', async ({ page }) => {
    await mount(page, [f('c', { value: '2026-09-17' })]);
    const box = await bounds(pages(page, 'c'));
    const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    // 30 px toward October at 2.5 px per ms, short of a quarter of the way: only a fling shows October.
    const moves = strokes(from, { x: 0, y: -10 });
    expect(30).toBeLessThan(await rowHeight(page, 'c'));
    const grid = host(page, 'c').locator('.day-view');
    await flingThenHold(page, grid, { from, moves, hold: STOPPED_AFTER + 1 });
    expect(await shown(page, 'c')).toBe('September 2026');
    await land(page, 'c');
    await flingThenHold(page, grid, { from, moves, hold: STOPPED_AFTER });
    expect(await shown(page, 'c')).toBe('October 2026');
    await land(page, 'c');
    expect(await log(page)).toEqual([]);
  });

  test('CAL-32: a cancelled pointer, Escape, a date the product sets and the year view return the days and announce nothing — the last two cancel a scroll being followed too, and what is left of it is ignored; while a drag or a scroll holds the days the month shown, the active day, focus and what is exposed do not change, and what comes into view is inert and hidden; reduced motion follows the pointer and lands at once', async ({ page }) => {
    await mount(page, [f('c', { value: '2026-09-17', showAdjacentDays: true })]);
    await override(page, { [T('motion-page-duration')]: '40000ms', [T('motion-page-easing')]: 'linear' });
    const row = await rowHeight(page, 'c');
    const said = host(page, 'c').locator('.announce');
    await day(page, 'c', '2026-09-17').focus();
    const take = () => pointer(page, 'c', [{ dy: -20 }, { dy: -4 * row * 0.75 }], { up: null });
    // While it lasts: nothing the calendar exposes changes.
    await take();
    expect(await shown(page, 'c')).toBe('September 2026');
    await expect(toggle(page, 'c').locator('.toggle-label')).toHaveText('September 2026');
    await expect(host(page, 'c').locator('.day[tabindex="0"]')).toHaveAttribute('data-date', '2026-09-17');
    expect(await focused(page)).toBe('2026-09-17');
    await expect(said).toHaveText('');
    // The days of the month coming into view are hidden, take no focus and no press, until it is the displayed one.
    const coming = host(page, 'c').locator('.day[data-date="2026-10-20"]');
    await expect(coming.locator('xpath=ancestor::*[@role="row"]')).toHaveAttribute('aria-hidden', 'true');
    expect(await coming.evaluate((el) => (el.closest('[inert]') as HTMLElement | null)?.inert)).toBe(true);
    await expect(coming).toHaveAttribute('tabindex', '-1');
    // A day of the shared row stays what the displayed month's view makes it: October 1 is still a neighbouring month's.
    await expect(host(page, 'c').locator('.day[data-date="2026-10-01"]')).toHaveAttribute('data-adjacent', '');
    // The platform cancels the pointer: the days return over the page motion.
    await cancelPointer(page, 'c');
    expect(await held(page, 'c')).toBe(false);
    expect(await travelling(page, 'c')).toBe(40_000);
    expect((await hold(page, 'c', 20_000)) - 1).toBeCloseTo(0.375, 3);
    await land(page, 'c');
    expect(await shown(page, 'c')).toBe('September 2026');
    await expect(said).toHaveText('');
    // Escape: cancelled, and spent on it — nothing behind the calendar hears the key.
    await page.evaluate(() => document.addEventListener('keydown', (event) => ((window as any).heard = event.key)));
    await take();
    await page.keyboard.press('Escape');
    expect(await held(page, 'c')).toBe(false);
    expect(await page.evaluate(() => (window as any).heard)).toBeUndefined();
    await land(page, 'c');
    expect(await shown(page, 'c')).toBe('September 2026');
    // The year view shown: cancelled.
    await take();
    await toggle(page, 'c').dispatchEvent('click');
    expect(await held(page, 'c')).toBe(false);
    await toggle(page, 'c').dispatchEvent('click');
    await land(page, 'c');
    expect(await shown(page, 'c')).toBe('September 2026');
    // The product sets a date: the days return — to the month it names, where it names one.
    await take();
    await host(page, 'c').evaluate((el: any) => (el.value = '2026-09-20'));
    await expect.poll(() => held(page, 'c')).toBe(false);
    await land(page, 'c');
    expect(await shown(page, 'c')).toBe('September 2026');
    await take();
    await host(page, 'c').evaluate((el: any) => (el.value = '2026-08-20'));
    await expect.poll(() => shown(page, 'c')).toBe('August 2026');
    expect(await held(page, 'c')).toBe(false);
    expect(await travelling(page, 'c')).toBe(40_000);
    await land(page, 'c');
    await expect(said).toHaveText('');
    // After a release the month is the displayed one: its days are exposed and take focus.
    await pointer(page, 'c', [{ dy: -20 }, { dy: -5 * row * 0.75 }]);
    await land(page, 'c');
    expect(await shown(page, 'c')).toBe('September 2026');
    await expect(host(page, 'c').locator('.page.current [inert]')).toHaveCount(0);
    await expect(said).toHaveText('September 2026');
    // A scroll that holds the days between two views changes nothing the calendar exposes either.
    const announced = () => said.evaluate((el) => el.textContent);
    const before = await announced();
    await holdClock(page);
    await scroll(page, 'c', [{ dy: 2 * row }]);
    expect(await held(page, 'c')).toBe(true);
    expect(await shown(page, 'c')).toBe('September 2026');
    await expect(toggle(page, 'c').locator('.toggle-label')).toHaveText('September 2026');
    expect(await coming.evaluate((el) => (el.closest('[inert]') as HTMLElement | null)?.inert)).toBe(true);
    await expect(coming.locator('xpath=ancestor::*[@role="row"]')).toHaveAttribute('aria-hidden', 'true');
    // The product sets a date while it is followed: the days return over the page motion, nothing is announced, and
    // what is left of that scroll moves nothing, however fast.
    await host(page, 'c').evaluate((el: any) => (el.value = '2026-09-21'));
    await expect.poll(() => held(page, 'c')).toBe(false);
    expect(await travelling(page, 'c')).toBe(40_000);
    expect((await hold(page, 'c', 20_000)) - 1).toBeCloseTo(0.25, 3);
    await scroll(page, 'c', [{ dy: 60 }, { dy: 60 }]);
    expect(await held(page, 'c')).toBe(false);
    expect((await progress(page, 'c')) - 1).toBeCloseTo(0.25, 3);
    await land(page, 'c');
    expect(await shown(page, 'c')).toBe('September 2026');
    expect(await announced()).toBe(before);
    await quiet(page);
    // To the month the date names, where it names one.
    await scroll(page, 'c', [{ dy: 2 * row }]);
    await host(page, 'c').evaluate((el: any) => (el.value = '2026-08-20'));
    await expect.poll(() => shown(page, 'c')).toBe('August 2026');
    expect(await held(page, 'c')).toBe(false);
    expect(await travelling(page, 'c')).toBe(40_000);
    await land(page, 'c');
    expect(await announced()).toBe(before);
    await quiet(page);
    // The year view shown while a scroll is followed: cancelled, and the rest of it ignored.
    await scroll(page, 'c', [{ dy: 2 * row }]);
    expect(await held(page, 'c')).toBe(true);
    await toggle(page, 'c').dispatchEvent('click');
    await expect.poll(() => held(page, 'c')).toBe(false);
    await toggle(page, 'c').dispatchEvent('click');
    await scroll(page, 'c', [{ dy: 60 }]);
    expect(await held(page, 'c')).toBe(false);
    await land(page, 'c');
    expect(await shown(page, 'c')).toBe('August 2026');
    expect(await announced()).toBe(before);
    await quiet(page);
    await page.clock.resume();
    await host(page, 'c').evaluate((el: any) => (el.value = '2026-09-17'));
    await expect.poll(() => shown(page, 'c')).toBe('September 2026');
    // Reduced motion: the days still move with the pointer and draw the in-between look; they land at once.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect((await take()) - 1).toBeCloseTo(0.75, 5);
    expect(await rowAt(page, 'c', '2026-09-27')).toBeCloseTo(1, 2);
    expect((await drawn(page, 'c', '2026-10-20')).opacity).toBeCloseTo(0.75, 5);
    await pointerOn(page, 'c', [], { up: 300 });
    expect(await shown(page, 'c')).toBe('October 2026');
    expect(await travelling(page, 'c')).toBe(null);
    await expect.poll(() => moving(page, 'c')).toBe(null);
    expect(await rowAt(page, 'c', '2026-09-27')).toBeCloseTo(0, 2);
    await take();
    await cancelPointer(page, 'c');
    await expect.poll(() => moving(page, 'c')).toBe(null);
    expect(await shown(page, 'c')).toBe('October 2026');
    // And with a scroll (October's view to November's is five rows): followed, the in-between look drawn, landed at once when it ends.
    await holdClock(page);
    expect((await scroll(page, 'c', [{ dy: 2 * row }])).progress - 1).toBeCloseTo(0.4, 5);
    expect(await rowAt(page, 'c', '2026-11-01')).toBeCloseTo(3, 2);
    expect((await drawn(page, 'c', '2026-11-24')).opacity).toBeCloseTo(0.4, 5);
    expect(await moving(page, 'c')).toBe('vertical');
    await quiet(page);
    await expect.poll(() => moving(page, 'c')).toBe(null);
    expect(await shown(page, 'c')).toBe('November 2026');
    expect(await travelling(page, 'c')).toBe(null);
    expect(await rowAt(page, 'c', '2026-11-01')).toBeCloseTo(0, 2);
  });

  test('CAL-33: a scroll over the day grid moves the days point for point in the frame it arrives, with no least amount, through month after month — each month reached shown at once, none announced in passing — and stops at min’s and max’s month, where it is still the calendar’s; across the axis and a zoom are the page’s; a delta in lines or pages moves one month a step; the horizontal axis follows a horizontal delta, the same way right to left as a list’s', async ({ page }) => {
    await mount(page, [f('c', { value: '2026-09-17' }), f('x', { value: '2026-09-17', max: '2026-09-30' }), f('l', { value: '2026-09-17' }), f('h', { value: '2026-09-17' })]);
    const row = await rowHeight(page, 'c');
    const said = host(page, 'c').locator('.announce');
    await holdClock(page);
    // 24 px of scroll are 24 px of travel, in the same frame (September's view is four rows from October's), without
    // a motion of its own; neither the title nor the announcement changes.
    const first = await scroll(page, 'c', [{ dy: 24 }]);
    expect(first.taken).toEqual([true]);
    expect(first.progress - 1).toBeCloseTo(24 / (4 * row), 5);
    expect(await rowAt(page, 'c', '2026-09-27')).toBeCloseTo(4 - 24 / row, 2);
    expect(await held(page, 'c')).toBe(true);
    expect(await travelling(page, 'c')).toBe(null);
    expect(await moving(page, 'c')).toBe('vertical');
    expect(await shown(page, 'c')).toBe('September 2026');
    await expect(toggle(page, 'c').locator('.toggle-label')).toHaveText('September 2026');
    await expect(said).toHaveText('');
    // No least amount: one more pixel is one more pixel, either way.
    expect((await scroll(page, 'c', [{ dy: 1 }])).progress - 1).toBeCloseTo(25 / (4 * row), 5);
    expect((await scroll(page, 'c', [{ dy: -1 }])).progress - 1).toBeCloseTo(24 / (4 * row), 5);
    // On to four rows and 48 px more: October is the displayed month, the rows 48 px on toward November (five rows
    // from October), and nothing is announced in passing.
    const on = await scroll(page, 'c', [{ dy: 2 * row }, { dy: 2 * row - 24 - 10 }, { dy: 10 + 48 }]);
    expect(on.months).toEqual(['September 2026', 'September 2026', 'October 2026']);
    await expect(toggle(page, 'c').locator('.toggle-label')).toHaveText('October 2026');
    expect(on.progress - 1).toBeCloseTo(48 / (5 * row), 5);
    expect(await rowAt(page, 'c', '2026-09-27')).toBeCloseTo(-48 / row, 2);
    await expect(host(page, 'c').locator('.page.current .day[tabindex="0"]')).toHaveAttribute('data-date', '2026-10-17');
    await expect(host(page, 'c').locator('.day[data-date="2026-10-20"]')).not.toHaveAttribute('aria-hidden', 'true');
    await expect(said).toHaveText('');
    // Twenty events of 100 px, 16 ms apart: several months later, each month passed through in turn.
    const fling = await scroll(page, 'c', Array.from({ length: 20 }, () => ({ dy: 100 })));
    const passed = fling.months.filter((month, i, all) => month !== all[i - 1]);
    const monthAfter = (text: string) => {
      const date = new Date(`1 ${text} UTC`);
      date.setUTCMonth(date.getUTCMonth() + 1);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    };
    expect(passed[0]).toBe('October 2026');
    expect(passed.length).toBeGreaterThanOrEqual(7);
    passed.slice(1).forEach((month, i) => expect(month, 'each month in turn').toBe(monthAfter(passed[i])));
    await expect(said).toHaveText('');
    // …and back the other way, through as many.
    const back = await scroll(page, 'c', Array.from({ length: 23 }, () => ({ dy: -100 })));
    expect(back.months[back.months.length - 1]).toBe('September 2026');
    expect(back.taken.every(Boolean)).toBe(true);
    // Never past max's month: a scroll toward the next month moves nothing, and is still the calendar's (not passed on).
    const stopped = await scroll(page, 'x', [{ dy: 60 }, { dy: 300 }]);
    expect(stopped.taken).toEqual([true, true]);
    expect(await rowAt(page, 'x', '2026-08-30')).toBeCloseTo(0, 2);
    await expect(host(page, 'x').locator('.day[data-date="2026-10-20"]')).toHaveCount(0);
    expect(await shown(page, 'x')).toBe('September 2026');
    // Toward the previous month it moves (August's view is five rows before).
    expect((await scroll(page, 'x', [{ dy: -row }])).progress).toBeCloseTo(1 - 1 / 5, 5);
    // A scroll further across the axis than along it, and one that zooms, are left to the page.
    expect((await scroll(page, 'x', [{ dx: 120, dy: 20 }, { dy: 60, ctrl: true }])).taken).toEqual([false, false]);
    // A delta in lines or pages is a step of a detented wheel: one month each, one after another without waiting.
    const steps = await scroll(page, 'l', [{ dy: 1, mode: 1 }]);
    expect(steps.taken).toEqual([true]);
    expect(steps.months).toEqual(['October 2026']);
    await expect(host(page, 'l').locator('.announce')).toHaveText('October 2026');
    expect(await held(page, 'l')).toBe(false);
    expect((await scroll(page, 'l', [{ dy: 3, mode: 1 }, { dy: 3, mode: 1 }, { dy: 1, mode: 2 }])).months).toEqual(['November 2026', 'December 2026', 'January 2027']);
    expect((await scroll(page, 'l', [{ dy: -3, mode: 1 }])).months).toEqual(['December 2026']);
    await expect(host(page, 'l').locator('.announce')).toHaveText('December 2026');
    // The horizontal axis: a horizontal delta is followed — the two pages side by side — and a vertical one is the page's.
    await quiet(page);
    await override(page, { [T('navigation-axis')]: 'horizontal' });
    const width = (await bounds(pages(page, 'h'))).width;
    expect((await scroll(page, 'h', [{ dy: 100 }])).taken).toEqual([false]);
    expect((await scroll(page, 'h', [{ dx: 0.25 * width }])).progress - 1).toBeCloseTo(0.25, 5);
    expect(await moving(page, 'h')).toBe('horizontal');
    const [grid, current, next] = [await bounds(pages(page, 'h')), await bounds(host(page, 'h').locator('.page.current')), await bounds(host(page, 'h').locator('.page').last())];
    expect(current.x - grid.x).toBeCloseTo(-0.25 * width, 0);
    expect(next.x - grid.x).toBeCloseTo(0.75 * width, 0);
    expect((await scroll(page, 'h', [{ dx: width }])).months).toEqual(['October 2026']);
    await quiet(page);
    await expect.poll(() => held(page, 'h')).toBe(false);
    await land(page, 'h');
    await quiet(page);
    // Right to left the later month lies toward the left, and a scroll moves the days where it moves a list's content:
    // a delta toward the left brings the next month.
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    expect((await scroll(page, 'h', [{ dx: -0.25 * width }])).progress - 1).toBeCloseTo(0.25, 5);
    const [rtlGrid, rtlCurrent, rtlNext] = [await bounds(pages(page, 'h')), await bounds(host(page, 'h').locator('.page.current')), await bounds(host(page, 'h').locator('.page').last())];
    expect(rtlCurrent.x - rtlGrid.x).toBeCloseTo(0.25 * width, 0);
    expect(rtlNext.x - rtlGrid.x).toBeCloseTo(-0.75 * width, 0);
    expect((await scroll(page, 'h', [{ dx: 0.5 * width }])).progress - 1).toBeCloseTo(-0.25, 5);
  });

  test('CAL-34: a scroll ends after 150 ms without an event, or when it has slowed below 0.1 px per ms over its last 100 ms — what follows no faster is ignored, and a faster event moves the days again from where they are; the days then settle over the page motion on the neighbour from a quarter of the way on, else return; a month reached in passing is shown at once and announced once at the end; a return announces nothing; a scroll never changes the choice', async ({ page }) => {
    await mount(page, [f('c', { value: '2026-09-17' }), f('s', { value: '2026-09-17' })]);
    await override(page, { [T('motion-page-duration')]: '40000ms', [T('motion-page-easing')]: 'linear' });
    const row = await rowHeight(page, 'c');
    const said = host(page, 'c').locator('.announce');
    await holdClock(page);
    // 40 px — less than a quarter of the four rows to October's view — then silence: the days are held until 150 ms
    // have passed without an event, then return over the page motion from where the scroll left them; nothing is announced.
    await scroll(page, 'c', [{ dy: 10 }, { dy: 10 }, { dy: 10 }, { dy: 10 }]);
    expect(await held(page, 'c')).toBe(true);
    await pass(page, 145);
    expect(await held(page, 'c')).toBe(true);
    expect(await travelling(page, 'c')).toBe(null);
    await pass(page, 10);
    await expect.poll(() => held(page, 'c')).toBe(false);
    expect(await travelling(page, 'c')).toBe(40_000);
    expect((await hold(page, 'c', 0)) - 1).toBeCloseTo(40 / (4 * row), 4);
    expect((await hold(page, 'c', 20_000)) - 1).toBeCloseTo(20 / (4 * row), 3);
    expect(await shown(page, 'c')).toBe('September 2026');
    await land(page, 'c');
    expect(await progress(page, 'c')).toBe(0);
    await expect(said).toHaveText('');
    // 60 px — a quarter and more — then silence: October is shown and announced once, the days settle from where they were.
    await scroll(page, 'c', [{ dy: 20 }, { dy: 20 }, { dy: 20 }]);
    expect(await shown(page, 'c')).toBe('September 2026');
    await quiet(page);
    await expect.poll(() => held(page, 'c')).toBe(false);
    expect(await shown(page, 'c')).toBe('October 2026');
    await expect(said).toHaveText('October 2026');
    await expect(host(page, 'c').locator('.page.current .day[tabindex="0"]')).toHaveAttribute('data-date', '2026-10-17');
    expect((await hold(page, 'c', 0)) - 1).toBeCloseTo(60 / (4 * row), 4);
    await land(page, 'c');
    // Exactly the quarter counts (October's view is five rows from November's: a row and a quarter); a pixel short of it returns.
    await scroll(page, 'c', [{ dy: 1.25 * row - 1 }]);
    await quiet(page);
    await expect.poll(() => held(page, 'c')).toBe(false);
    expect(await shown(page, 'c')).toBe('October 2026');
    await land(page, 'c');
    await scroll(page, 'c', [{ dy: 1.25 * row }]);
    await quiet(page);
    await expect.poll(() => held(page, 'c')).toBe(false);
    expect(await shown(page, 'c')).toBe('November 2026');
    await expect(said).toHaveText('November 2026');
    await land(page, 'c');
    // A scroll that reaches December's view (four rows on) and 20 px more: the title reads December when its view is
    // reached, nothing is announced yet; after the silence the days return to December's view — the quarter is counted
    // from there — and December is announced, once.
    const reached = await scroll(page, 'c', [{ dy: 2 * row }, { dy: 2 * row }, { dy: 20 }]);
    expect(reached.months).toEqual(['November 2026', 'December 2026', 'December 2026']);
    await expect(toggle(page, 'c').locator('.toggle-label')).toHaveText('December 2026');
    await expect(said).toHaveText('November 2026');
    await quiet(page);
    await expect.poll(() => held(page, 'c')).toBe(false);
    expect(await shown(page, 'c')).toBe('December 2026');
    await expect(said).toHaveText('December 2026');
    expect((await hold(page, 'c', 0)) - 1).toBeCloseTo(20 / (4 * row), 4);
    await land(page, 'c');
    expect(await progress(page, 'c')).toBe(0);
    // A scroll never changes the choice.
    expect(await log(page)).toEqual([]);
    expect(await host(page, 'c').evaluate((el: any) => el.value)).toBe('2026-09-17');
    // A stream that slows: six events of 20 px, then one pixel every 16 ms (0.06 px per ms). Once the last 100 ms hold
    // less than 10 px the scroll has ended — before its last event: the days settle at once, on October (127 px on).
    const told = host(page, 's').locator('.announce');
    const tail = await scroll(page, 's', [...Array.from({ length: 6 }, () => ({ dy: 20 })), ...Array.from({ length: 12 }, () => ({ dy: 1 }))]);
    expect(tail.months[11]).toBe('September 2026');
    expect(tail.months[12]).toBe('October 2026');
    expect(await held(page, 's')).toBe(false);
    await expect(told).toHaveText('October 2026');
    expect(await travelling(page, 's')).toBe(40_000);
    // …from 127 px: the 120 and the seven slow events before the end; the five after it moved nothing.
    expect((await hold(page, 's', 0)) - 1).toBeCloseTo(127 / (4 * row), 4);
    const paused = await hold(page, 's', 10_000);
    // Later events no faster move nothing.
    expect((await scroll(page, 's', [{ dy: 1 }, { dy: 1 }, { dy: 1 }])).progress).toBeCloseTo(paused, 5);
    expect(await held(page, 's')).toBe(false);
    // Nor does one that only wavers about the threshold (11 px in its last 100 ms): a momentum tail does that as it
    // falls through it, and a scroll that has ended begins again only with a clearly faster event (half as fast again).
    expect((await scroll(page, 's', [{ dy: 5 }])).progress).toBeCloseTo(paused, 5);
    expect(await held(page, 's')).toBe(false);
    // An event of 30 px 20 ms after them is a new push: the days move again, from where they are.
    expect((await scroll(page, 's', [{ dy: 30, dt: 20 }])).progress).toBeCloseTo(paused + 30 / (4 * row), 4);
    expect(await held(page, 's')).toBe(true);
    await quiet(page);
    await expect.poll(() => held(page, 's')).toBe(false);
    await land(page, 's');
    expect(await shown(page, 's')).toBe('October 2026');
    // A scroll that never was that fast has not slowed: a slow one is followed for as long as it goes on, and ends by silence.
    const slow = await scroll(page, 's', Array.from({ length: 30 }, () => ({ dy: 1 })));
    expect(slow.progress - 1).toBeCloseTo(30 / (5 * row), 5);
    expect(await held(page, 's')).toBe(true);
    // Each event restarts the silence: 100 ms on, and another 100 ms after one more pixel, it has not ended.
    await pass(page, 100);
    expect((await scroll(page, 's', [{ dy: 1, dt: 100 }])).progress - 1).toBeCloseTo(31 / (5 * row), 5);
    await pass(page, 100);
    expect(await held(page, 's')).toBe(true);
    await quiet(page);
    await expect.poll(() => held(page, 's')).toBe(false);
    expect(await shown(page, 's')).toBe('October 2026');
    await expect(told).toHaveText('October 2026');
  });
});

test.describe('states, press, corners and focus style', () => {
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await acmeSystemCss();
  });

  test('CAL-18: hovered, focused and pressed paint that state’s tokens of the cell’s condition (acme values them apart), pressed over focused over hovered; pointer focus is not the focused state; at once where reduced', async ({ page }) => {
    await mount(page, [f('c', { value: '2026-09-17' })], { system: 'acme', systemCss: await acmeSystemCss() });
    const look = (condition: string, state: string) => resolveColor(page, T(`${condition}-${state}-container-color`));
    const [hovered, focusedC, pressed] = await Promise.all([look('unselected', 'hovered'), look('unselected', 'focused'), look('unselected', 'pressed')]);
    expect(new Set([hovered, focusedC, pressed]).size).toBe(3);
    await override(page, { [T('motion-state-duration')]: '0ms' });
    const b = box(page, 'c', '2026-09-18');
    await day(page, 'c', '2026-09-18').hover();
    await expect.poll(() => css(b, 'background-color')).toBe(hovered);
    await page.mouse.down();
    await expect.poll(() => css(b, 'background-color')).toBe(pressed);
    await page.mouse.move(0, 0);
    await page.mouse.up();
    // The press ended off the day: nothing was chosen, and focus from the pointer is not the focused state.
    await expect.poll(() => css(b, 'background-color')).not.toBe(focusedC);
    // Keyboard focus is: 17 is still the chosen day (the selected condition's focused state), 16 is not.
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => css(box(page, 'c', '2026-09-17'), 'background-color')).toBe(await look('selected', 'focused'));
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => css(box(page, 'c', '2026-09-16'), 'background-color')).toBe(focusedC);
    await toggle(page, 'c').hover();
    await expect.poll(() => css(toggle(page, 'c').locator('.box'), 'background-color')).toBe(hovered);
    await override(page, { [T('motion-state-duration')]: '' });
    // Read until it is there: the override was removed in the task before, and Firefox may still answer from the style
    // it computed under it. A duration that stayed at the override's would be a defect, and would fail here all the same.
    const stateDuration = `${(await resolveToken(page, T('motion-state-duration'), 'duration')) / 1000}s`;
    await expect.poll(() => css(b, 'transition-duration')).toContain(stateDuration);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(b, 'transition-duration')).toBe('0s');
  });

  test('CAL-19: keyboard focus shows the ring around the circle — an in-range day’s too — without animation; pointer focus shows none', async ({ page }) => {
    await mount(page, [f('r', { mode: 'range', start: '2026-09-10', end: '2026-09-16' })]);
    await day(page, 'r', '2026-09-12').click();
    expect(await css(box(page, 'r', '2026-09-12'), 'outline-style')).toBe('none');
    await page.keyboard.press('ArrowRight');
    const b = box(page, 'r', '2026-09-13');
    await expect.poll(() => css(b, 'outline-style')).toBe('solid');
    expect(await px(b, 'outline-width')).toBe(await resolveToken(page, '--tanrei-sys-focus-outer-width'));
    const size = await resolveToken(page, T('day-container-size'));
    const bb = await bounds(b);
    expect([Math.round(bb.width), Math.round(bb.height)]).toEqual([size, size]);
    expect(await css(b, 'transition-property')).not.toContain('outline');
  });

  test('CAL-20: a press of a day, a year or the view toggle — Enter, Space, a click — shows at once and for at least press-hold', async ({ page }) => {
    const hold = 1000;
    const cases: [string, (p: P) => Promise<void>, (p: P) => Locator][] = [
      ['day Enter', (p) => p.keyboard.press('Enter'), (p) => box(p, 'c', '2026-09-17')],
      ['day Space', (p) => p.keyboard.press('Space'), (p) => box(p, 'c', '2026-09-17')],
      ['day click', (p) => day(p, 'c', '2026-09-18').click(), (p) => box(p, 'c', '2026-09-18')],
      ['toggle click', (p) => toggle(p, 'c').click(), (p) => toggle(p, 'c').locator('.box')],
    ];
    for (const [name, activate, target] of cases) {
      await mount(page, [f('c', { value: '2026-09-17' })]);
      await override(page, { '--tanrei-sys-motion-duration-press-hold': `${hold}ms` });
      await day(page, 'c', '2026-09-17').focus();
      await target(page).evaluate((el) => {
        const l: { down?: number; on?: number; off?: number; up?: number } = ((window as any).press = {});
        new MutationObserver(() => {
          if (el.hasAttribute('data-pressed')) l.on ??= performance.now();
          else if (l.on !== undefined) l.off ??= performance.now();
        }).observe(el, { attributes: true, attributeFilter: ['data-pressed'] });
        for (const type of ['pointerup', 'keyup']) window.addEventListener(type, () => (l.up ??= performance.now()), true);
        for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => (l.down ??= performance.now()), true);
      });
      await activate(page);
      await expect.poll(() => page.evaluate(() => (window as any).press.off), name).toBeDefined();
      const l = await page.evaluate(() => (window as any).press);
      expect(l.up - l.on, name).toBeLessThan(hold);
      expect(l.off - l.down, name).toBeGreaterThanOrEqual(hold - 1);
    }
    await mount(page, [f('y', { value: '2026-09-17', startView: 'year' })]);
    await year(page, 'y', 2027).dispatchEvent('pointerdown', { button: 0, pointerType: 'mouse', clientX: 1, clientY: 1 });
    await expect(year(page, 'y', 2027).locator('.box')).toHaveAttribute('data-pressed', 'overlay');
  });

  test('CAL-20: a day pressed by Space stays pressed while the key is down, though the pointer resting over it leaves the grid; the keyup ends it', async ({ page }) => {
    await mount(page, [f('c', { value: '2026-09-17' })]);
    await expectKeyPressOutlastsPointer(page, { control: day(page, 'c', '2026-09-17') });
  });

  test('CAL-21: overlay (default), ripple (m3-like), dim (cupertino) and none each answer a day’s press; an in-range day answers on its band', async ({ page }) => {
    const press = async (system?: string, feedback?: string) => {
      await mount(page, [f('c', { value: '2026-09-17' })], system ? { system } : {});
      if (feedback) await override(page, { '--tanrei-sys-behavior-pressed-feedback': feedback });
      await override(page, { [T('unselected-pressed-label-color')]: 'rgb(0, 0, 255)', [T('motion-state-duration')]: '0ms' });
      const c = day(page, 'c', '2026-09-18');
      const b = c.locator('.box');
      await c.hover();
      await expect.poll(() => css(b, 'background-color')).toBe(await resolveColor(page, T('unselected-hovered-container-color')));
      // Pressed once the hovered color has ended its motion: the poll passes on its last frames, where the color reads
      // as its end value and, a frame later, one channel a step of 1e-6 off it (Firefox).
      await motionEnded(c);
      const hovered = await css(b, 'background-color');
      await page.mouse.down();
      const result = { pressed: await b.getAttribute('data-pressed'), bg: await css(b, 'background-color'), hovered, label: await css(b, 'color'), ripple: await b.locator('.ripple').count(), opacity: await css(c, 'opacity') };
      await page.mouse.move(0, 0);
      await page.mouse.up();
      return result;
    };
    const overlay = await press();
    expect(overlay).toMatchObject({ pressed: 'overlay', ripple: 0, label: 'rgb(0, 0, 255)' });
    expect(overlay.bg).toBe(await resolveColor(page, T('unselected-pressed-container-color')));
    const ripple = await press('m3-like');
    expect(ripple).toMatchObject({ pressed: 'ripple', ripple: 1, label: 'rgb(0, 0, 255)' });
    expect(ripple.bg).toBe(ripple.hovered);
    const dim = await press('cupertino');
    expect(dim).toMatchObject({ pressed: 'dim', ripple: 0, label: 'rgb(0, 0, 255)' });
    expect(dim.opacity).toBe(await token(page, T('pressed-opacity')));
    const none = await press(undefined, 'none');
    expect(none).toMatchObject({ pressed: 'none', ripple: 0 });
    expect(none.bg).toBe(none.hovered);
    // The ripple grows over the feedback duration and fades over the state duration; from the center for a key.
    await mount(page, [f('c', { value: '2026-09-17' })], { system: 'm3-like' });
    await day(page, 'c', '2026-09-17').focus();
    await page.keyboard.down('Enter');
    const layer = await box(page, 'c', '2026-09-17')
      .locator('.ripple')
      .evaluate((el) => {
        const s = getComputedStyle(el);
        return { x: Number.parseFloat(el.style.getPropertyValue('--_x')) / el.getBoundingClientRect().width, grow: Number.parseFloat(s.animationDuration) * 1000, fade: Number.parseFloat(s.transitionDuration) * 1000 };
      });
    await page.keyboard.up('Enter');
    expect(layer.x).toBeCloseTo(0.5, 5);
    expect(layer.grow).toBe(await resolveToken(page, T('motion-feedback-duration'), 'duration'));
    expect(layer.fade).toBe(await resolveToken(page, T('motion-state-duration'), 'duration'));
    await mount(page, [f('r', { mode: 'range', start: '2026-09-10', end: '2026-09-16' })]);
    await day(page, 'r', '2026-09-14').hover();
    await page.mouse.down();
    await expect(band(page, 'r', '2026-09-14')).toHaveAttribute('data-pressed', 'overlay');
    await page.mouse.up();
  });

  test('CAL-22: cupertino eases the containers’ corners (days stay circles), the ring concentric; acme shows focus as a glow', async ({ page }) => {
    await mount(page, [f('c', { value: '2026-09-17' })], { system: 'cupertino' });
    expect(await token(page, '--tanrei-sys-shape-corner-smoothing')).toBe('0.6');
    const b = toggle(page, 'c').locator('.box');
    if (await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'))) {
      // `superellipse(1)`, which some Chromium builds serialize as `round`.
      expect(await css(box(page, 'c', '2026-09-17'), 'corner-top-left-shape')).toMatch(/^(round|superellipse\(1\))$/);
      await toggle(page, 'c').focus();
      await tab(page, { back: true });
      await tab(page);
      expect(await css(b, 'corner-top-left-shape', '::after')).toBe(await css(b, 'corner-top-left-shape'));
    } else expect(await css(b, 'border-top-left-radius')).not.toBe('0px');

    await mount(page, [f('c', { value: '2026-09-17' })], { system: 'acme', systemCss: await acmeSystemCss() });
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('glow');
    await day(page, 'c', '2026-09-17').focus();
    await page.keyboard.press('ArrowRight');
    const next = box(page, 'c', '2026-09-18');
    await expect.poll(() => css(next, 'outline-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(next, 'box-shadow', '::after')).not.toBe('none');
    await expect(day(page, 'c', '2026-09-18')).toHaveAttribute('data-focus-style', 'glow');
  });
});

test.describe('semantics, locale, layout and reports', () => {
  test('CAL-23: a group named by label; the grid named by its month with weekday column headers; each day a gridcell named by its full date, selected, current, described as start or end, disabled; the toggle a button with its expanded state; each year a button', async ({ page }) => {
    await mount(page, [f('r', { mode: 'range', start: '2026-09-10', end: '2026-09-16', label: 'Stay', disabledDates: ['2026-09-20'] }), f('n')]);
    await expect(host(page, 'r').locator('.calendar')).toHaveAttribute('role', 'group');
    await expect(host(page, 'r').locator('.calendar')).toHaveAttribute('aria-label', 'Stay');
    expect(await host(page, 'n').locator('.calendar').getAttribute('role')).toBeNull();
    await expect(host(page, 'r').locator('[role="grid"]')).toHaveAttribute('aria-label', 'September 2026');
    const start = day(page, 'r', '2026-09-10');
    await expect(start).toHaveAttribute('role', 'gridcell');
    await expect(start).toHaveAttribute('aria-label', 'Thursday, September 10, 2026');
    await expect(start).toHaveAttribute('aria-selected', 'true');
    await expect(start).toHaveAttribute('aria-description', 'Start date');
    await expect(day(page, 'r', '2026-09-16')).toHaveAttribute('aria-description', 'End date');
    await expect(day(page, 'r', '2026-09-12')).toHaveAttribute('aria-selected', 'true');
    await expect(day(page, 'r', '2026-09-24')).toHaveAttribute('aria-current', 'date');
    await expect(day(page, 'r', '2026-09-20')).toHaveAttribute('aria-disabled', 'true');
    await expect(toggle(page, 'r')).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle(page, 'r')).toHaveAttribute('aria-description', 'Choose a year');
    const snapshot = await host(page, 'r').locator('.nav').ariaSnapshot();
    expect(snapshot).toContain('button "September 2026"');
    expect(snapshot).toContain('button "Previous month"');
    // The years are there while the year view is shown (CAL-7): the day view holds none of them.
    await expect(host(page, 'r').locator('.year')).toHaveCount(0);
    await toggle(page, 'r').click();
    await expect(year(page, 'r', 2026)).toHaveAttribute('aria-current', 'true');
  });

  test('CAL-24: names, digits and the first day of the week come from locale (else the nearest lang); firstDayOfWeek wins over the locale’s; today empty is the device’s date', async ({ page }) => {
    await mount(page, [f('de', { locale: 'de-DE' }), f('mon', { firstDayOfWeek: 'monday' }), f('ar', { locale: 'ar-EG' }), f('dev', { today: '' })]);
    await expect(host(page, 'de').locator('[role="columnheader"]').first()).toHaveAttribute('aria-label', 'Montag');
    await expect(host(page, 'mon').locator('[role="columnheader"]').first()).toHaveAttribute('aria-label', 'Monday');
    await expect(box(page, 'ar', '2026-09-17')).toHaveText('١٧');
    const today = await page.evaluate(() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    await expect(day(page, 'dev', today)).toHaveAttribute('aria-current', 'date');
    await page.evaluate(() => document.documentElement.setAttribute('lang', 'ja-JP'));
    await host(page, 'mon').evaluate((el: any) => ((el.locale = ''), el.requestUpdate()));
    await expect(toggle(page, 'mon').locator('.toggle-label')).toHaveText('2026年9月');
  });

  test('CAL-25: in a space narrower than seven targets the cells narrow equally and the calendar fits it; enlarged text grows a day’s container', async ({ page }) => {
    await mount(page, [f('c', { value: '2026-09-17' })]);
    // A block container 240 wide: a column narrower than seven targets.
    await page.locator('[data-fixture="c"]').evaluate((el) => ((el as HTMLElement).style.cssText = 'display: block; inline-size: 240px;'));
    const cal = await bounds(host(page, 'c'));
    expect(cal.width).toBeLessThanOrEqual(240 + 0.5);
    const [a, b] = [await bounds(day(page, 'c', '2026-09-13')), await bounds(day(page, 'c', '2026-09-14'))];
    expect(a.width).toBeCloseTo(b.width, 1);
    expect(a.width * 7).toBeCloseTo(cal.width, 0);
    await override(page, { [T('day-label-typescale-font')]: '48px/60px Inter' });
    await page.locator('[data-fixture="c"]').evaluate((el) => ((el as HTMLElement).style.cssText = ''));
    expect((await bounds(box(page, 'c', '2026-09-17'))).height).toBeGreaterThan(await resolveToken(page, T('day-container-size')));
  });

  test('CAL-26: right to left mirrors the layout — the first weekday at the right, the toggle at the right — and, on the horizontal axis, the side each neighbouring month lies on (a drag toward the right brings the next); the vertical scroll of the weeks, a vertical drag, a wheel’s vertical scroll and the vertical arrows are not mirrored', async ({ page }) => {
    await mount(page, [f('c', { value: '2026-09-17' })]);
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    await override(page, { [T('motion-page-duration')]: '40000ms', [T('motion-page-easing')]: 'linear' });
    const headers = host(page, 'c').locator('[role="columnheader"]');
    expect((await bounds(headers.first())).x).toBeGreaterThan((await bounds(headers.last())).x);
    expect((await bounds(toggle(page, 'c'))).x).toBeGreaterThan((await bounds(button(page, 'c', 'next'))).x);
    // The vertical scroll of the weeks: a later month still comes from below.
    await button(page, 'c', 'next').click();
    expect(await moving(page, 'c')).toBe('vertical');
    await hold(page, 'c', 10_000);
    expect(await rowAt(page, 'c', '2026-09-27')).toBeCloseTo(3, 2);
    const glyph = await button(page, 'c', 'next').locator('[slot="icon"]').textContent();
    expect(glyph).toBe('arrow_downward');
    await land(page, 'c');
    // A vertical drag: toward the top for the next month, as left to right.
    const row = await rowHeight(page, 'c');
    // (October's view to November's is five rows.)
    expect((await pointer(page, 'c', [{ dy: -20 }, { dy: -row }], { up: null })) - 1).toBeCloseTo(1 / 5, 5);
    await cancelPointer(page, 'c');
    await land(page, 'c');
    // A wheel's vertical scroll: toward the bottom for the next month, as a list's content moves in either direction.
    await holdClock(page);
    expect((await scroll(page, 'c', [{ dy: row }])).progress - 1).toBeCloseTo(1 / 5, 5);
    await host(page, 'c').evaluate((el: any) => (el.value = '2026-10-17'));
    await land(page, 'c');
    await quiet(page);
    await page.clock.resume();
    // The horizontal axis: the next month lies toward the left, so a drag toward the right brings it — the days go
    // where the pointer goes — and a button's slide comes from there too.
    await override(page, { [T('navigation-axis')]: 'horizontal' });
    const width = (await bounds(pages(page, 'c'))).width;
    expect((await pointer(page, 'c', [{ dx: 20 }, { dx: 0.25 * width }], { up: null })) - 1).toBeCloseTo(0.25, 5);
    const [grid, current, next] = [await bounds(pages(page, 'c')), await bounds(host(page, 'c').locator('.page.current')), await bounds(host(page, 'c').locator('.page').last())];
    expect(current.x - grid.x).toBeCloseTo(0.25 * width, 0);
    expect(next.x - grid.x).toBeCloseTo(-0.75 * width, 0);
    // Toward the left: the previous month.
    expect((await pointerOn(page, 'c', [{ dx: -0.25 * width }])) - 1).toBeCloseTo(-0.25, 5);
    await cancelPointer(page, 'c');
    await land(page, 'c');
    await button(page, 'c', 'next').click();
    await hold(page, 'c', 10_000);
    expect((await bounds(host(page, 'c').locator('.page.current'))).x - grid.x).toBeCloseTo(-0.75 * width, 0);
  });

  test('CAL-27: unknown mode, startView and firstDayOfWeek behave as the default and are reported; malformed dates, end before start, value in range mode and min after max are ignored and reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      f('a', { mode: 'multi', startView: 'decade', firstDayOfWeek: 'someday', value: '2026-9-17', min: '2026-10-01', max: '2026-09-01' }),
      f('b', { mode: 'range', value: '2026-09-17', start: '2026-09-10', end: '2026-09-01' }),
    ]);
    await expect(host(page, 'a').locator('.day-view')).toHaveAttribute('aria-label', 'September 2026');
    await expect(host(page, 'b').locator('.page.current .day.selected')).toHaveCount(1);
    for (const text of ['mode "multi"', 'startView "decade"', 'firstDayOfWeek "someday"', 'value "2026-9-17"', 'min "2026-10-01" is after max', 'value "2026-09-17" is set in range mode', 'end "2026-09-01" is before start'])
      expect(seen.some((w) => w.includes(text) && w.includes('CAL-27')), text).toBe(true);
  });

  test('CAL-35: the calendar has no words of its own — its six are the instance’s, else the product’s words; without them the navigation buttons and a range’s ends are still drawn and work, unnamed and undescribed, and reported once each, naming the prop; the view toggle has no description; and the present day’s word is the locale’s own, from the browser', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      wordless('bare', { value: '2026-09-17' }),
      wordless('range', { mode: 'range', start: '2026-09-10', end: '2026-09-16' }),
      wordless('years', { startView: 'year', value: '2026-09-17' }),
      wordless('years-ja', { startView: 'year', value: '2026-09-17', locale: 'ja-JP' }),
      wordless('own', { mode: 'range', start: '2026-09-10', end: '2026-09-16', previousMonthLabel: 'Earlier', nextMonthLabel: 'Later', startLabel: 'Check-in', endLabel: 'Check-out', yearViewLabel: 'Pick a year', todayLabel: 'This year' }),
    ]);
    const name = (id: string, which: 'previous' | 'next') => button(page, id, which).evaluate((el) => [el.getAttribute('label'), el.shadowRoot!.querySelector('button')!.getAttribute('aria-label')]);
    // No words set: both buttons are drawn, with their glyphs and no name — and they work.
    for (const which of ['previous', 'next'] as const) {
      await expect(button(page, 'bare', which), which).toBeVisible();
      expect(await name('bare', which), which).toEqual(['', null]);
    }
    expect(await shown(page, 'bare')).toBe('September 2026');
    await button(page, 'bare', 'next').click();
    await expect.poll(() => shown(page, 'bare')).toBe('October 2026');
    await button(page, 'bare', 'previous').click();
    await expect.poll(() => shown(page, 'bare')).toBe('September 2026');
    // The view toggle has no description: its name and its expanded state say what it shows.
    expect(await toggle(page, 'bare').evaluate((el) => [el.getAttribute('aria-description'), el.getAttribute('aria-expanded'), el.textContent?.includes('September 2026')])).toEqual([null, 'false', true]);
    // A range's ends: selected, and not described.
    expect(await day(page, 'range', '2026-09-10').evaluate((el) => [el.getAttribute('aria-selected'), el.getAttribute('aria-description')])).toEqual(['true', null]);
    expect(await day(page, 'range', '2026-09-16').getAttribute('aria-description')).toBeNull();
    // The present day's word is the platform's, in the calendar's locale — the only word it takes from anywhere else.
    const [today, kyou] = await page.evaluate(() => ['en-US', 'ja-JP'].map((locale) => new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(0, 'day')));
    expect([today, kyou]).toEqual(['today', '今日']);
    await expect(year(page, 'years', 2026)).toHaveAttribute('aria-description', today);
    await expect(year(page, 'years-ja', 2026)).toHaveAttribute('aria-description', kyou);
    expect(await year(page, 'years', 2025).getAttribute('aria-description')).toBeNull();
    // Reported once per word and page, naming the prop; today's word and the toggle's description are not missing.
    await expect.poll(() => seen.filter((w) => w.includes('CAL-35')).length).toBe(4);
    for (const [key, attribute] of [['previousMonthLabel', 'previous-month-label'], ['nextMonthLabel', 'next-month-label'], ['startLabel', 'start-label'], ['endLabel', 'end-label']]) {
      expect(seen.filter((w) => w.includes('CAL-35') && w.includes(`no ${key}`)), key).toHaveLength(1);
      expect(seen.find((w) => w.includes('CAL-35') && w.includes(`no ${key}`)), key).toContain(`${attribute} is empty`);
    }
    expect(await missingWords(page)).toEqual(['endLabel', 'nextMonthLabel', 'previousMonthLabel', 'startLabel']);
    // No English word that the test did not give — but the locale's own names under an English locale.
    const said = await page.evaluate(() => ['bare', 'range', 'years'].map((id) => { const root = document.querySelector(`[data-fixture="${id}"] tanrei-calendar`)!.shadowRoot!; return [...root.querySelectorAll('[aria-description], [label]')].map((el) => `${el.getAttribute('aria-description') ?? ''} ${el.getAttribute('label') ?? ''}`).join(' '); }).join(' '));
    expect(said.replaceAll('today', '').trim()).toBe('');
    // An instance's own words, with no set of the product's.
    expect(await name('own', 'previous')).toEqual(['Earlier', 'Earlier']);
    await expect(day(page, 'own', '2026-09-10')).toHaveAttribute('aria-description', 'Check-in');
    // The product's words, set once: every calendar without the props is named by them, at once.
    await setWords(page, WORDS);
    expect(await name('bare', 'previous')).toEqual(['Previous month', 'Previous month']);
    expect(await name('bare', 'next')).toEqual(['Next month', 'Next month']);
    await expect(toggle(page, 'bare')).toHaveAttribute('aria-description', 'Choose a year');
    await expect(day(page, 'range', '2026-09-10')).toHaveAttribute('aria-description', 'Start date');
    await expect(day(page, 'range', '2026-09-16')).toHaveAttribute('aria-description', 'End date');
    await expect(year(page, 'years', 2026)).toHaveAttribute('aria-description', 'Today');
    expect(await missingWords(page)).toEqual([]);
    // An instance's own prop wins.
    expect(await name('own', 'next')).toEqual(['Later', 'Later']);
    await expect(toggle(page, 'own')).toHaveAttribute('aria-description', 'Pick a year');
    await expect(day(page, 'own', '2026-09-16')).toHaveAttribute('aria-description', 'Check-out');
    await toggle(page, 'own').click();
    await expect(year(page, 'own', 2026)).toHaveAttribute('aria-description', 'This year');
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark, in the day view and the year view', async ({ page }) => {
    test.setTimeout(120_000);
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true });
      await page.waitForTimeout(300);
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(' ')}`).join(', ')}`).toEqual([]);
    }
  });
});

test.describe('fixtures', () => {
  for (const fixture of spec.fixtures) {
    test(`snapshot: ${fixture.id}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true, fixtures: [fixture] });
      await expect(page.locator(`[data-fixture="${fixture.id}"]`)).toHaveScreenshot([spec.name, `${fixture.id}.png`]);
    });
  }
});
