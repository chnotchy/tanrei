// <tanrei-date-time-picker>, driven by specs/date-time-picker.spec.json: every behaviour id (DTM-1…47) is cited by a
// test title, every fixture has a baseline (a modal one is the window — 480 × 720, or 800 × 640 for a horizontal layout —
// since the picker and its scrim are in the top layer; a docked one is drawn in place with the `inline` test attribute),
// and every value is read back from the tokens — never from a number written here.
// DTM-51: the product's ARIA on the host is tested with every other control's, in every engine, in
// src/primitives/delegated-aria.test.ts.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, acmeSystemCss, loadSpec, missingWords, mountFixtures, pickerWindow, resolveColor, resolveToken, setWords, tab, tabTo, rootTokens } from '../../../test/harness.js';
import { appearProbe, bezierOf, expectAppearStart, expectExitEnd, resolveEasing } from '../../../test/appear.js';
import { type Frames, expectNoFlicker, sampleFrames } from '../../../test/frames.js';
import { motionEnded } from '../../../test/motions.js';
import { releaseClock } from '../../../test/page-clock.js';
import { STOPPED_AFTER, flingThenHold, strokes } from '../../../test/stopped-release.js';
import { expectOneThumb, readThumb } from '../../../test/thumb.js';

const spec = loadSpec('date-time-picker');
type P = Page;
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-date-time-picker`);
const surface = (page: P, id: string) => host(page, id).locator('dialog.surface, div.surface.docked');
const day = (page: P, id: string, iso: string) => host(page, id).locator(`tanrei-calendar .page.current .day[data-date="${iso}"]`);
/** A wheel's spin button: the input on its middle row (DTM-20, DTM-43). */
const wheel = (page: P, id: string, unit: 'hour' | 'minute') => host(page, id).locator(`.wheel[data-unit="${unit}"] .entry`);
/** The wheel itself: its rows, its selection container and its ring. */
const wheelBox = (page: P, id: string, unit: 'hour' | 'minute') => host(page, id).locator(`.wheel[data-unit="${unit}"]`);
/** A range field: the start's or the end's (DTM-15). */
const field = (page: P, id: string, end: 'start' | 'end') => host(page, id).locator(`.range-field[data-end="${end}"]`);
/** The header's value line (DTM-10). */
const headerValue = (page: P, id: string) => host(page, id).locator('.header > .value');
const selector = (page: P, id: string, unit: 'hour' | 'minute') => host(page, id).locator(`.selector[data-unit="${unit}"]`);
/** The entry-mode tabs: the picker's only row of tabs (DTM-12, DTM-13). */
const tabsRow = (page: P, id: string, row: 'entry' = 'entry') => host(page, id).locator(`.${row}-tabs`);
/** The period (DTM-14, DTM-46, DTM-47), where it is drawn: the period wheel or the period selector … */
const periodBox = (page: P, id: string) => host(page, id).locator('[part="period"]');
/** … and its spin button: the period wheel's middle row, or the period selector itself. */
const period = (page: P, id: string) => host(page, id).locator('.wheel.period[part="period"] .entry, .selector.period[part="period"]');
/** The name the period selector draws (it holds both, in one place, and shows the pending one: DTM-14). */
const periodName = (page: P, id: string) => host(page, id).locator('.selector.period[part="period"] .name:not([data-off])');
/** The time display's and the wheels' own rows — not the copies the section measures the other entry mode with (DTM-12). */
const shownRow = (page: P, id: string, row: 'display' | 'wheels') => host(page, id).locator(`.time > .${row}`);
const tabOf = (page: P, id: string, tabId: string) => host(page, id).locator(`tanrei-tab#${tabId}`);
const action = (page: P, id: string, name: 'cancel' | 'confirm') => host(page, id).locator(`tanrei-button.${name}`);
const css = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const px = async (locator: Locator, property: string) => Number.parseFloat(await css(locator, property));
const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const T = (name: string) => `--tanrei-comp-date-time-picker-${name}`;
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
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
/** The deepest focused element: a day's date, `year:<y>`, a wheel or selector (`wheel:hour`), a Button's or tab's id or class, or an id. */
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
    if (el.classList?.contains('entry')) return `wheel:${el.dataset.unit}`;
    if (el.classList?.contains('range-field')) return `field:${el.dataset.end}`;
    if (el.classList?.contains('selector')) return `selector:${el.dataset.unit}`;
    if (el.localName === 'tanrei-tab') return `tab:${el.id}`;
    const owner = hosts.reverse().find((h) => h.localName === 'tanrei-button');
    if (owner) return owner.classList[0] ?? owner.localName;
    return el.id || el.localName;
  });
/** A spin button's value now. */
const now = (locator: Locator) => locator.getAttribute('aria-valuenow').then(Number);

/** The words of this file's own fixtures: a test is the product there and gives them itself (DTM-48). */
const WORDS = {
  dateLabel: 'Date',
  startLabel: 'Start',
  endLabel: 'End',
  confirmLabel: 'OK',
  cancelLabel: 'Cancel',
  previousMonthLabel: 'Previous month',
  nextMonthLabel: 'Next month',
  yearViewLabel: 'Choose a year',
  todayLabel: 'Today',
  hourLabel: 'Hour',
  minuteLabel: 'Minute',
  wheelsLabel: 'Wheels',
  dialLabel: 'Dial',
  entryModeLabel: 'Time input',
  periodLabel: 'Period',
  rangeLabel: 'Range',
  nextDayLabel: 'next day',
  rangeErrorText: 'End must be after start',
};
/** What each kind of picker is titled in this file: `label` is the instance's alone (DTM-10, DTM-48). */
const TITLES: Record<string, [string, string]> = { date: ['Select date', 'Select dates'], time: ['Select time', 'Select times'], 'date-time': ['Select date and time', 'Select dates and times'] };
/** A fixture as the spec writes one: today and the locale pinned, and its title and its words given. */
const f = (id: string, props: Fixture['props'] = {}): Fixture => ({
  id,
  props: { today: '2026-09-24', locale: 'en-US', label: TITLES[String(props.mode ?? 'date')]?.[props.range ? 1 : 0] ?? 'Select', ...WORDS, ...props },
});
/** The same with no title and no words but the ones it names (DTM-48). */
const wordless = (id: string, props: Fixture['props'] = {}): Fixture => ({ id, props: { today: '2026-09-24', locale: 'en-US', ...props } });
/** A modal picker, closed: `wire` puts a button before it that opens it. */
const modal = (id: string, props: Fixture['props'] = {}) => f(id, { presentation: 'modal', ...props });
/** A modal picker, open from the start (the fixtures' way). */
const opened = (id: string, props: Fixture['props'] = {}) => f(id, { open: true, ...props });
/** A docked picker drawn in place (the fixtures' way). */
const inline = (id: string, props: Fixture['props'] = {}) => f(id, { presentation: 'docked', open: true, ...props });
/** A real docked overlay, closed, below a button with the id `a-<id>` that opens it. */
const docked = (id: string, props: Fixture['props'] = {}) => f(id, { presentation: 'docked', anchor: `a-${id}`, inline: false, ...props });

/**
 * The product's side, as the docs page writes it: a button opens the picker (a docked picker's anchor, or a button put
 * before a modal one), and `close` closes it. Every change and close is logged in order, with the element's value then.
 */
const wire = (page: P) =>
  page.evaluate(() => {
    const log: string[] = ((window as any).log = []);
    for (const p of document.querySelectorAll<any>('tanrei-date-time-picker:not([inline])')) {
      const id = (p.closest('[data-fixture]') as HTMLElement).dataset.fixture!;
      let opener = p.anchor ? document.getElementById(p.anchor) : null;
      if (!opener) {
        p.insertAdjacentHTML('beforebegin', `<button id="open-${id}" type="button">Open ${id}</button>`);
        opener = document.getElementById(`open-${id}`);
      }
      opener!.addEventListener('click', () => (p.open = !p.open));
      p.addEventListener('change', (e: CustomEvent) => log.push(`change:${JSON.stringify(e.detail)}:${p.value}|${p.start}|${p.end}`));
      p.addEventListener('close', (e: CustomEvent) => {
        log.push(`close:${e.detail.reason}`);
        p.open = false;
      });
    }
  });
const log = (page: P) => page.evaluate(() => (window as any).log as string[]);
const opener = (page: P, id: string) => page.locator(`#open-${id}, #a-${id}`).first();
const isOpen = (page: P, id: string) => surface(page, id).evaluate((el) => (el instanceof HTMLDialogElement ? el.open : el.matches(':popover-open')));

async function mount(page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] & { window?: { width: number; height: number } } = {}) {
  const { window, ...rest } = options;
  await page.setViewportSize(window ?? { width: 480, height: 720 });
  await mountFixtures(page, spec, { icons: true, fixtures, ...rest });
  await wire(page);
  // An open fixture grows in over the open motion: what is measured is the picker at rest.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  // The surface's own motion runs in the picker's shadow tree, which a document's list of animations leaves out in
  // Chromium, Firefox and WebKit alike: every shadow root is asked for its own.
  await motionEnded(page);
}
/** Opens a picker from its button by the keyboard (focus on the button, Enter), and waits for the open motion. */
async function open(page: P, id: string) {
  await opener(page, id).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => isOpen(page, id)).toBe(true);
  await settle(page, id);
}
const settle = (page: P, id: string) => surface(page, id).evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined))));
/** Moves a wheel by keys and waits until its value is taken. */
const press = async (page: P, keys: string[]) => {
  for (const key of keys) await page.keyboard.press(key);
};

test.describe('presentation, focus and closing', () => {
  test('DTM-1: a modal picker opens as a modal dialog over the scrim, centred at least the margin from the edges, in its color, elevation and corners; everything else inert, the page held, focus kept inside', async ({ page }) => {
    await mount(page, [modal('m', { value: '2026-09-17' })]);
    await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<div style="block-size: 3000px"></div><button id="elsewhere">Elsewhere</button>'));
    await open(page, 'm');
    const s = surface(page, 'm');
    expect(await s.evaluate((el) => el.matches(':modal'))).toBe(true);
    expect(await css(s, 'background-color', '::backdrop')).toBe(await resolveColor(page, T('modal-scrim-color')));
    expect(await page.evaluate(() => document.elementFromPoint(2, 2)?.localName)).toBe('tanrei-date-time-picker');
    expect(await css(s, 'background-color')).toBe(await resolveColor(page, T('modal-container-color')));
    expect(await css(s, 'box-shadow')).toBe(await resolveShadow(page, T('modal-container-elevation')));
    expect(await px(s, 'border-top-left-radius')).toBeGreaterThan(0);
    const b = await bounds(s);
    const margin = await resolveToken(page, T('modal-container-margin'));
    expect(b.x).toBeGreaterThanOrEqual(margin - 0.5);
    expect(b.y).toBeGreaterThanOrEqual(margin - 0.5);
    expect(b.x + b.width / 2).toBeCloseTo(240, 0);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('hidden');
    // Tab from the last element goes to the first.
    await action(page, 'm', 'confirm').focus();
    await tab(page);
    expect(await focused(page)).not.toBe('elsewhere');
    expect(await page.evaluate(() => document.activeElement?.localName)).toBe('tanrei-date-time-picker');
  });

  test('DTM-2: a docked picker is a popover the offset below its anchor, start edges aligned, flipped above when there is more room there, in its color, elevation and corners; no scrim, not modal', async ({ page }) => {
    await mount(page, [docked('d', { value: '2026-09-17' })]);
    await open(page, 'd');
    const s = surface(page, 'd');
    expect(await s.evaluate((el) => el.matches(':popover-open'))).toBe(true);
    expect(await s.evaluate((el) => el.matches(':modal'))).toBe(false);
    const [a, b] = [await bounds(opener(page, 'd')), await bounds(s)];
    expect(b.y - (a.y + a.height)).toBeCloseTo(await resolveToken(page, T('docked-offset')), 0);
    // Start edges aligned, shifted to stay the viewport margin inside the window.
    const vm = await resolveToken(page, T('docked-viewport-margin'));
    expect(b.x).toBeCloseTo(Math.min(Math.max(a.x, vm), 480 - vm - b.width), 0);
    expect(await css(s, 'background-color')).toBe(await resolveColor(page, T('docked-container-color')));
    expect(await css(s, 'box-shadow')).toBe(await resolveShadow(page, T('docked-container-elevation')));
    // Moved to the bottom of the window: it flips above the anchor.
    await page.keyboard.press('Escape');
    await opener(page, 'd').evaluate((el) => ((el as HTMLElement).style.cssText = 'position: fixed; bottom: 8px; left: 8px;'));
    await open(page, 'd');
    const [a2, b2] = [await bounds(opener(page, 'd')), await bounds(s)];
    expect(b2.y + b2.height).toBeLessThanOrEqual(a2.y + 0.5);
  });

  test('DTM-2: a docked picker whose height is not a whole number of pixels, flipped above its anchor, still stands the offset above it — it is placed by its size as laid out, not by one snapped to whole pixels', async ({ page }) => {
    await mount(page, [docked('d', { value: '2026-09-17' })]);
    await opener(page, 'd').evaluate((el) => ((el as HTMLElement).style.cssText = 'position: fixed; bottom: 8px; left: 8px;'));
    const s = surface(page, 'd');
    await s.evaluate((el) => ((el as HTMLElement).style.paddingBlockEnd = '0.4px'));
    await open(page, 'd');
    await expect(s).toHaveClass(/side-top/);
    const offset = await resolveToken(page, T('docked-offset'));
    const rect = (locator: Locator) => locator.evaluate((el) => ((r) => ({ top: r.top, bottom: r.bottom, height: r.height }))(el.getBoundingClientRect()));
    await expect.poll(async () => Math.abs((await rect(s)).bottom - ((await rect(opener(page, 'd'))).top - offset))).toBeLessThan(0.1);
    expect((await rect(s)).height % 1, 'the picker is not a whole number of pixels tall').not.toBeCloseTo(0, 1);
  });

  test('DTM-2: placed again as the page moves or the window resizes, a scrolled body keeps its offset and the focused day stays in view', async ({ page }) => {
    await mount(page, [docked('d', { value: '2026-09-17' })]);
    // The anchor at the top of the page, so that the picker opens below it, taller than the room there.
    await page.addStyleTag({ content: `.stage:has(> tanrei-date-time-picker[presentation='docked']) { block-size: auto; }` });
    await page.setViewportSize({ width: 480, height: 280 });
    const inside = async (item: Locator, room: Locator) => {
      const [r, b] = [await bounds(item), await bounds(room)];
      return r.y >= b.y - 0.5 && r.y + r.height <= b.y + b.height + 0.5;
    };
    const offsetOf = (scroller: Locator) => scroller.evaluate((el) => el.scrollTop);
    const movePage = (by: number) =>
      page.evaluate((px) => {
        document.querySelector('main')!.style.paddingTop = `${px}px`;
      }, by);
    // The calendar, taller than the room below its anchor, scrolls in the body (DTM-36): down a week, the focused day is
    // scrolled into view; back up a week, the body stays scrolled with the focused day a row clear of its bottom edge.
    await open(page, 'd');
    await page.keyboard.press('ArrowDown');
    const body = host(page, 'd').locator('.body');
    await expect.poll(() => offsetOf(body)).toBeGreaterThan(0);
    await page.keyboard.press('ArrowUp');
    expect(await focused(page)).toBe('2026-09-17');
    await expect.poll(() => inside(day(page, 'd', '2026-09-17'), body)).toBe(true);
    const scrolled = await offsetOf(body);
    expect(scrolled).toBeGreaterThan(0);
    // The page moves under the anchor: the picker follows it, placed again. Measured uncapped, where the body does not
    // scroll, it would have the browser put the calendar back at its top.
    const s = surface(page, 'd');
    const top = (await bounds(s)).y;
    await movePage(3);
    await expect.poll(async () => (await bounds(s)).y).toBeCloseTo(top + 3, 1);
    expect(await offsetOf(body)).toBe(scrolled);
    expect(await inside(day(page, 'd', '2026-09-17'), body)).toBe(true);
    // The window shrinks: placed again with less room, the picker is capped to it, and the calendar stays where it was.
    const height = (await bounds(s)).height;
    await page.setViewportSize({ width: 480, height: 260 });
    await expect.poll(async () => (await bounds(s)).height).toBeCloseTo(height - 20, 1);
    expect(await offsetOf(body)).toBe(scrolled);
    expect(await inside(day(page, 'd', '2026-09-17'), body)).toBe(true);
    expect(await focused(page)).toBe('2026-09-17');
  });

  test('DTM-3: a picker drawn in place takes no focus when the page draws it open — modal or docked, a date, a time or both — and the page stays at its top', async ({ page }) => {
    // Drawn in place, the modal form's `<dialog>` is not shown with `show()`: its focusing steps would take focus for a
    // picker nobody has opened, and the browser would scroll to it.
    const drawn = (id: string, props: Fixture['props']) => f(id, { open: true, inline: true, ...props });
    const fixtures = [
      drawn('m-date', { mode: 'date', value: '2026-09-17' }),
      drawn('m-time', { mode: 'time', value: '07:30' }),
      drawn('m-dial', { mode: 'time', value: '07:30', entryMode: 'dial' }),
      drawn('m-both', { mode: 'date-time', range: true, start: '2026-09-10T09:00', end: '2026-09-16T17:00' }),
      drawn('d-date', { presentation: 'docked', mode: 'date', value: '2026-09-17' }),
      drawn('d-time', { presentation: 'docked', mode: 'time', value: '07:30' }),
    ];
    await mount(page, fixtures, { lead: '<p style="block-size: 3000px; margin: 0">A page</p>' });
    await page.waitForTimeout(400);
    for (const fixture of fixtures) await expect(surface(page, fixture.id)).toBeVisible();
    expect(await page.evaluate(() => [document.activeElement === document.body, Math.round(window.scrollY), document.documentElement.scrollHeight > window.innerHeight])).toEqual([true, 0, true]);
    // It is still a view a person works: Tab reaches it, and the first stop is in the first picker.
    await tab(page);
    expect(await page.evaluate(() => (document.activeElement?.closest('[data-fixture]') as HTMLElement | null)?.dataset.fixture)).toBe('m-date');
  });

  test('DTM-3: focus moves in as it opens: to the calendar’s active day (or its displayed year), the hour wheel, or the selector of unit', async ({ page }) => {
    await mount(page, [
      modal('d', { value: '2026-09-17' }),
      modal('y', { value: '2026-09-17', startView: 'year' }),
      modal('w', { mode: 'time', value: '07:30' }),
      modal('m', { mode: 'time', value: '07:30', entryMode: 'dial', unit: 'minute' }),
      docked('k', { value: '2026-09-17' }),
      // DTM-47: still the hour where the period stands before it (ja-JP), in either mode.
      modal('jw', { mode: 'time', value: '07:30', hourCycle: 'h12', locale: 'ja-JP' }),
      modal('jd', { mode: 'time', value: '07:30', hourCycle: 'h12', locale: 'ja-JP', entryMode: 'dial' }),
    ]);
    for (const [id, expected] of [['d', '2026-09-17'], ['y', 'year:2026'], ['w', 'wheel:hour'], ['m', 'selector:minute'], ['k', '2026-09-17'], ['jw', 'wheel:hour'], ['jd', 'selector:hour']] as const) {
      await open(page, id);
      await expect.poll(() => focused(page), id).toBe(expected);
      await page.keyboard.press('Escape');
      await expect.poll(() => isOpen(page, id)).toBe(false);
    }
  });

  test('DTM-4: closing returns focus to where it was when the picker opened', async ({ page }) => {
    await mount(page, [modal('m', { value: '2026-09-17' }), docked('d', { value: '2026-09-17' })]);
    for (const id of ['m', 'd']) {
      await open(page, id);
      await page.keyboard.press('Escape');
      await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe(id === 'm' ? 'open-m' : 'a-d');
    }
  });

  test('DTM-5: Escape, the scrim, Cancel and OK close a modal picker with their reason; Tab, a press outside, focus leaving and a completed choice close a docked one; nothing is committed but by confirm and select', async ({ page }) => {
    await mount(page, [modal('m', { value: '2026-09-17' }), docked('d', { value: '2026-09-17' })]);
    await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<button id="elsewhere">Elsewhere</button>'));
    await open(page, 'm');
    await page.keyboard.press('Escape');
    await open(page, 'm');
    await page.mouse.click(2, 2);
    await open(page, 'm');
    await action(page, 'm', 'cancel').click();
    await open(page, 'm');
    await day(page, 'm', '2026-09-18').click();
    await action(page, 'm', 'confirm').click();
    expect(await log(page)).toEqual(['close:escape', 'close:outside', 'close:cancel', 'change:{"value":"2026-09-18","start":"","end":""}:2026-09-18||', 'close:confirm']);
    await page.evaluate(() => ((window as any).log.length = 0));
    await open(page, 'd');
    await tab(page);
    await expect.poll(() => log(page)).toEqual(['close:tab']);
    await open(page, 'd');
    await page.locator('#elsewhere').click();
    await expect.poll(() => log(page)).toEqual(['close:tab', 'close:outside']);
    await open(page, 'd');
    await page.locator('#elsewhere').focus();
    await expect.poll(() => log(page)).toEqual(['close:tab', 'close:outside', 'close:focus-out']);
    await open(page, 'd');
    await day(page, 'd', '2026-09-19').click();
    await expect.poll(() => log(page)).toEqual(['close:tab', 'close:outside', 'close:focus-out', 'change:{"value":"2026-09-19","start":"","end":""}:2026-09-19||', 'close:select']);
  });

  test('DTM-6: a modal picker holds a pending choice from its value — one the product sets while open does not change it — and commits it only by OK, change before close; OK is disabled while incomplete', async ({ page }) => {
    await mount(page, [modal('m', { value: '2026-09-17' }), modal('e'), modal('r', { range: true, start: '2026-09-10' })]);
    await open(page, 'm');
    await day(page, 'm', '2026-09-20').click();
    await host(page, 'm').evaluate((el: any) => (el.value = '2026-09-01'));
    await expect(host(page, 'm').locator('.value')).toHaveText('Sun, Sep 20');
    await expect(day(page, 'm', '2026-09-20')).toHaveClass(/selected/);
    expect(await log(page)).toEqual([]);
    await action(page, 'm', 'confirm').click();
    expect(await log(page)).toEqual(['change:{"value":"2026-09-20","start":"","end":""}:2026-09-20||', 'close:confirm']);
    // Unchanged: OK closes without change.
    await open(page, 'm');
    await action(page, 'm', 'confirm').click();
    expect((await log(page)).slice(2)).toEqual(['close:confirm']);
    // Incomplete: no date, or no end.
    await open(page, 'e');
    expect(await action(page, 'e', 'confirm').evaluate((el: any) => el.disabled)).toBe(true);
    await page.keyboard.press('Escape');
    await open(page, 'r');
    expect(await action(page, 'r', 'confirm').evaluate((el: any) => el.disabled)).toBe(true);
    await day(page, 'r', '2026-09-12').click();
    await expect.poll(() => action(page, 'r', 'confirm').evaluate((el: any) => el.disabled)).toBe(false);
  });

  test('DTM-7: a docked picker for a date only commits a completed choice by choosing — change, then close with select — a range’s start emits nothing, and it draws no actions', async ({ page }) => {
    await mount(page, [docked('r', { range: true }), inline('i', { value: '2026-09-17' })]);
    expect(await host(page, 'i').locator('.actions').count()).toBe(0);
    await open(page, 'r');
    await day(page, 'r', '2026-09-10').click();
    expect(await log(page)).toEqual([]);
    expect(await isOpen(page, 'r')).toBe(true);
    await day(page, 'r', '2026-09-14').click();
    expect(await log(page)).toEqual(['change:{"value":"","start":"2026-09-10","end":"2026-09-14"}:|2026-09-10|2026-09-14', 'close:select']);
  });

  test('DTM-8: values in the mode’s form; an empty time starts at the device’s time; a minute off the step is rounded down and committed so', async ({ page }) => {
    await mount(page, [modal('t', { mode: 'time', value: '07:32', minuteStep: 15 }), modal('e', { mode: 'time' }), modal('dt', { mode: 'date-time', value: '2026-09-17T19:30' })]);
    await open(page, 't');
    expect(await now(wheel(page, 't', 'minute'))).toBe(30);
    await action(page, 't', 'confirm').click();
    expect(await log(page)).toEqual(['change:{"value":"07:30","start":"","end":""}:07:30||', 'close:confirm']);
    const before = await page.evaluate(() => new Date().getHours() * 60 + new Date().getMinutes());
    await open(page, 'e');
    // en-US counts 1 to 12, and the hour after midnight and after noon is its 12: the hour is compared within its half of
    // the day (a minute may pass between the two readings), and the period wheel says which half.
    const minutes = ((await now(wheel(page, 'e', 'hour'))) % 12) * 60 + (await now(wheel(page, 'e', 'minute')));
    expect([before % 720, (before + 1) % 720]).toContain(minutes);
    expect([Math.floor(before / 720), Math.floor(((before + 1) % 1440) / 720)]).toContain(await now(period(page, 'e')));
    await page.keyboard.press('Escape');
    await open(page, 'dt');
    await day(page, 'dt', '2026-09-18').click();
    await action(page, 'dt', 'confirm').click();
    expect((await log(page)).slice(-2)).toEqual(['change:{"value":"2026-09-18T19:30","start":"","end":""}:2026-09-18T19:30||', 'close:confirm']);
  });
});

test.describe('layout and header', () => {
  test('DTM-9: the body is inset by the padding; vertical stacks the calendar above the time, horizontal sets them side by side container.gap apart; auto picks horizontal only in a window too short for vertical and wide enough; mode time’s horizontal layout keeps the range display across both columns, the time display beside the dial, each centred on the other — and draws the wheels mode as the vertical layout does', async ({ page }) => {
    await mount(page, [opened('v', { mode: 'date-time', value: '2026-09-17T19:30', layout: 'vertical' }), opened('h', { mode: 'date-time', value: '2026-09-17T19:30', layout: 'horizontal' })], { window: { width: 800, height: 900 } });
    const body = host(page, 'v').locator('.body');
    expect(await px(body, 'padding-left')).toBe(await resolveToken(page, T('container-padding-inline')));
    expect(await px(body, 'padding-top')).toBe(await resolveToken(page, T('container-padding-block')));
    const [cv, tv] = [await bounds(host(page, 'v').locator('tanrei-calendar')), await bounds(host(page, 'v').locator('.time'))];
    expect(tv.y).toBeGreaterThanOrEqual(cv.y + cv.height - 0.5);
    await mount(page, [opened('h', { mode: 'date-time', value: '2026-09-17T19:30', layout: 'horizontal' })], { window: { width: 800, height: 640 } });
    const [ch, th] = [await bounds(host(page, 'h').locator('tanrei-calendar')), await bounds(host(page, 'h').locator('.time'))];
    expect(th.x - (ch.x + ch.width)).toBeCloseTo(await resolveToken(page, T('container-gap')), 0);
    // auto: a short, wide window is horizontal; a tall one vertical.
    await mount(page, [opened('a', { mode: 'date-time', value: '2026-09-17T19:30' })], { window: { width: 800, height: 520 } });
    await expect.poll(() => surface(page, 'a').getAttribute('data-layout')).toBe('horizontal');
    await page.setViewportSize({ width: 800, height: 1200 });
    await expect.poll(() => surface(page, 'a').getAttribute('data-layout')).toBe('vertical');
    // Mode time, horizontal: the time display in a start column, the dial in an end column, each centred on the other.
    await mount(page, [opened('t', { mode: 'time', value: '07:30', entryMode: 'dial', layout: 'horizontal' })], { window: { width: 800, height: 640 } });
    const [d, dial] = [await bounds(shownRow(page, 't', 'display')), await bounds(host(page, 't').locator('.dial'))];
    expect(dial.x - (d.x + d.width)).toBeCloseTo(await resolveToken(page, T('container-gap')), 0);
    expect(d.y + d.height / 2).toBeCloseTo(dial.y + dial.height / 2, 0);
    // With a range: the range display above both, across the whole section.
    await mount(page, [opened('r', { mode: 'time', range: true, start: '09:00', end: '17:30', hourCycle: 'h12', entryMode: 'dial', layout: 'horizontal' })], { window: { width: 800, height: 640 } });
    await settle(page, 'r');
    const [range, section, shown, face] = [await bounds(host(page, 'r').locator('.range-display')), await bounds(host(page, 'r').locator('.time')), await bounds(shownRow(page, 'r', 'display')), await bounds(host(page, 'r').locator('.dial'))];
    expect(range.x).toBeCloseTo(section.x, 0);
    expect(range.width).toBeCloseTo(section.width, 0);
    expect(range.x).toBeCloseTo(shown.x, 0);
    expect(range.x + range.width).toBeCloseTo(face.x + face.width, 0);
    expect(range.y + range.height).toBeLessThanOrEqual(Math.min(shown.y, face.y) + 0.5);
    // The wheels mode has one row below the range display: it is drawn as the vertical layout is, in one column.
    await tabOf(page, 'r', 'entry-wheels').click();
    await settle(page, 'r');
    const [wheelsRange, wheels, wheelsSection] = [await bounds(host(page, 'r').locator('.range-display')), await bounds(shownRow(page, 'r', 'wheels')), await bounds(host(page, 'r').locator('.time'))];
    expect(wheels.y).toBeGreaterThanOrEqual(wheelsRange.y + wheelsRange.height - 0.5);
    expect(wheels.x + wheels.width / 2).toBeCloseTo(wheelsSection.x + wheelsSection.width / 2, 0);
    expect(wheelsRange.width).toBeCloseTo(wheelsSection.width, 0);
  });

  test('DTM-10: the title row — label or the words for the mode at the start, the entry-mode tabs at the end — the pending value below it in a modal picker with a date, a date not chosen yet as dateLabel for either end of a range (never a word for start or end), the divider below; in the header’s tokens', async ({ page }) => {
    await mount(page, [
      opened('d', { value: '2026-09-17' }),
      opened('r', { range: true, start: '2026-09-10' }),
      opened('n', { range: true }),
      opened('dt', { mode: 'date-time', value: '2026-09-17T19:30', layout: 'horizontal' }),
      opened('y', { value: '2027-01-15' }),
      opened('yt', { mode: 'date-time', value: '2027-01-15T07:05', layout: 'horizontal' }),
    ], { window: { width: 800, height: 900 } });
    await expect(host(page, 'd').locator('.title')).toHaveText('Select date');
    await expect(host(page, 'r').locator('.title')).toHaveText('Select dates');
    await expect(host(page, 'dt').locator('.title')).toHaveText('Select date and time');
    await expect(headerValue(page, 'd')).toHaveText('Thu, Sep 17');
    await expect(headerValue(page, 'r')).toHaveText('Sep 10 – Date');
    await expect(host(page, 'r').locator('.placeholder')).toHaveText('Date');
    expect(await css(host(page, 'r').locator('.placeholder'), 'color')).toBe(await resolveColor(page, T('header-placeholder-color')));
    // Either end: no word for start or end is drawn, whatever startLabel and endLabel are.
    await expect(headerValue(page, 'n')).toHaveText('Date – Date');
    await host(page, 'n').evaluate((el: any) => ((el.dateLabel = 'Pick'), (el.startLabel = 'From'), (el.endLabel = 'Until')));
    await expect(headerValue(page, 'n')).toHaveText('Pick – Pick');
    await expect(headerValue(page, 'dt')).toHaveText('Thu, Sep 17, 7:30 PM');
    await expect(headerValue(page, 'y')).toHaveText('Fri, Jan 15, 2027');
    // The date and the time are joined as the locale joins the two — never by a word one engine adds and another does
    // not ("Sep 17 at 7:30 PM", "17 sept. à 19:30"): a space in Japanese and in French, the comma again with the year.
    await host(page, 'dt').evaluate((el: any) => ((el.locale = 'ja-JP'), (el.hourCycle = 'h23')));
    await expect(headerValue(page, 'dt')).toHaveText('9月17日(木) 19:30');
    await host(page, 'dt').evaluate((el: any) => (el.locale = 'fr-FR'));
    await expect(headerValue(page, 'dt')).toHaveText(/^jeu\.? 17 sept\.? 19:30$/);
    await host(page, 'dt').evaluate((el: any) => ((el.locale = 'en-US'), (el.hourCycle = 'h12')));
    await expect(headerValue(page, 'dt')).toHaveText('Thu, Sep 17, 7:30 PM');
    await expect(headerValue(page, 'yt')).toHaveText('Fri, Jan 15, 2027, 7:05 AM');
    const title = host(page, 'dt').locator('.title');
    expect(await css(title, 'color')).toBe(await resolveColor(page, T('header-label-color')));
    expect(await px(headerValue(page, 'd'), 'font-size')).toBe(await resolveToken(page, T('header-value-typescale-font-size')));
    const [t, tabs] = [await bounds(title), await bounds(tabsRow(page, 'dt', 'entry'))];
    expect(Math.abs(t.y + t.height / 2 - (tabs.y + tabs.height / 2))).toBeLessThan(tabs.height / 2);
    const header = await bounds(host(page, 'dt').locator('.header'));
    expect(tabs.x + tabs.width).toBeCloseTo(header.x + header.width - (await resolveToken(page, T('header-padding-inline-end'))), 0);
    expect(await px(host(page, 'd').locator('.divider'), 'height')).toBe(await resolveToken(page, T('divider-width')));
    expect(await css(host(page, 'd').locator('.divider'), 'background-color')).toBe(await resolveColor(page, T('divider-color')));
    // A label names it.
    await host(page, 'd').evaluate((el: any) => (el.label = 'Due date'));
    await expect(host(page, 'd').locator('.title')).toHaveText('Due date');
  });

  test('DTM-11: the calendar gets the pending dates and the words, no label; a choice changes the pending dates; in a date-time range a chosen start selects the start’s range field and a chosen end the end’s', async ({ page }) => {
    await mount(page, [opened('r', { mode: 'date-time', range: true, layout: 'horizontal', start: '2026-09-10T09:00', end: '2026-09-16T17:00', startLabel: 'From', min: '2026-09-02', showAdjacentDays: true, firstDayOfWeek: 'monday' })], { window: { width: 800, height: 640 } });
    const cal = host(page, 'r').locator('tanrei-calendar');
    expect(await cal.evaluate((el: any) => [el.mode, el.start, el.end, el.min, el.startLabel, el.showAdjacentDays, el.firstDayOfWeek, el.label])).toEqual(['range', '2026-09-10', '2026-09-16', '2026-09-02', 'From', true, 'monday', '']);
    await field(page, 'r', 'end').click();
    await expect(field(page, 'r', 'end')).toHaveAttribute('aria-pressed', 'true');
    await day(page, 'r', '2026-09-20').click();
    await expect(field(page, 'r', 'start')).toHaveAttribute('aria-pressed', 'true');
    await expect(field(page, 'r', 'end')).toHaveAttribute('aria-pressed', 'false');
    await day(page, 'r', '2026-09-22').click();
    await expect(field(page, 'r', 'end')).toHaveAttribute('aria-pressed', 'true');
    await expect(wheel(page, 'r', 'hour')).toHaveAttribute('aria-valuetext', '5 PM');
    await expect(headerValue(page, 'r')).toHaveText('Sep 20, 9:00 AM – Sep 22, 5:00 PM');
  });

  test('DTM-12: the time section’s rows top to bottom, container.gap apart — the range display across its whole width, then the time display and the dial (or the wheels), centred; the time display is the row next to the dial; no row of tabs in the section — the entry-mode tabs are the picker’s only tabs, secondary — and the period is a part of the time, not a row; the section is never narrower than the dial and as wide in one entry mode as in the other', async ({ page }) => {
    await mount(page, [opened('t', { mode: 'time', range: true, start: '09:00', end: '17:30', hourCycle: 'h12', entryMode: 'dial' })]);
    await settle(page, 't');
    const order = ['.range-display', '.time > .display', '.dial'];
    const boxes = [];
    for (const s of order) boxes.push(await bounds(host(page, 't').locator(s)));
    const gap = await resolveToken(page, T('container-gap'));
    // Each row the gap below the one before: nothing stands between the range display, the time display and the dial.
    for (let i = 1; i < boxes.length; i++) expect(boxes[i].y - (boxes[i - 1].y + boxes[i - 1].height), `${order[i - 1]} to ${order[i]}`).toBeCloseTo(gap, 0);
    const time = await bounds(host(page, 't').locator('.time'));
    for (const [i, b] of boxes.entries()) expect(b.x + b.width / 2, `${order[i]} is centred`).toBeCloseTo(time.x + time.width / 2, 0);
    // The range display spans the section; the section's rows are these three and nothing else that is drawn.
    expect(boxes[0].x).toBeCloseTo(time.x, 0);
    expect(boxes[0].width).toBeCloseTo(time.width, 0);
    expect(time.height).toBeCloseTo(boxes[2].y + boxes[2].height - boxes[0].y, 0);
    // No row of tabs in the section, and no tab panel but the entry mode's: the entry-mode tabs are the only tabs.
    await expect(host(page, 't').locator('.time tanrei-tabs, .time tanrei-tab, .period-tabs, #period-panel')).toHaveCount(0);
    await expect(host(page, 't').locator('tanrei-tabs')).toHaveCount(1);
    await expect(tabsRow(page, 't')).toHaveAttribute('variant', 'secondary');
    await expect(host(page, 't').locator('[role="tabpanel"]')).toHaveCount(1);
    // The period is in the time display's row, not a row of its own.
    const [period12, display] = [await bounds(periodBox(page, 't')), boxes[1]];
    expect(period12.y).toBeGreaterThanOrEqual(display.y - 0.5);
    expect(period12.y + period12.height).toBeLessThanOrEqual(display.y + display.height + 0.5);
    // Never narrower than the dial, and as wide in the wheels mode as in the dial mode — the wider of what the two
    // need (the time display, here) — so the picker's width does not change with the entry mode.
    expect(time.width).toBeGreaterThanOrEqual((await resolveToken(page, T('dial-container-size'))) - 0.5);
    expect(time.width).toBeCloseTo(display.width, 0);
    const picker = (await bounds(surface(page, 't'))).width;
    await tabOf(page, 't', 'entry-wheels').click();
    await settle(page, 't');
    const [range, wheels, section] = [await bounds(host(page, 't').locator('.range-display')), await bounds(shownRow(page, 't', 'wheels')), await bounds(host(page, 't').locator('.time'))];
    expect(section.width).toBeCloseTo(time.width, 0);
    expect((await bounds(surface(page, 't'))).width).toBeCloseTo(picker, 0);
    expect(wheels.y - (range.y + range.height)).toBeCloseTo(gap, 0);
    expect(wheels.x + wheels.width / 2).toBeCloseTo(section.x + section.width / 2, 0);
    expect(range.x).toBeCloseTo(section.x, 0);
    expect(range.width).toBeCloseTo(section.width, 0);
    expect(section.height).toBeCloseTo(wheels.y + wheels.height - range.y, 0);
    // The 24-hour clock, where the dial is the widest row: the section is the dial's width, in both modes.
    await mount(page, [opened('h', { mode: 'time', value: '19:30', hourCycle: 'h23' })]);
    await settle(page, 'h');
    const dialSize = await resolveToken(page, T('dial-container-size'));
    expect((await bounds(host(page, 'h').locator('.time'))).width).toBeCloseTo(dialSize, 0);
    await tabOf(page, 'h', 'entry-dial').click();
    await settle(page, 'h');
    expect((await bounds(host(page, 'h').locator('.time'))).width).toBeCloseTo(dialSize, 0);
    // Mode time, horizontal: the dial mode's two columns, and the wheels mode as wide.
    await mount(page, [opened('w', { mode: 'time', value: '07:30', hourCycle: 'h12', layout: 'horizontal' })], { window: { width: 800, height: 640 } });
    await settle(page, 'w');
    const one = await bounds(host(page, 'w').locator('.time'));
    await tabOf(page, 'w', 'entry-dial').click();
    await settle(page, 'w');
    const two = await bounds(host(page, 'w').locator('.time'));
    expect(one.width).toBeCloseTo(two.width, 0);
    // A system that offers one mode measures no other: the section is what its own rows need (cupertino: the wheels, in the dial's width).
    await mount(page, [inline('c', { mode: 'time', value: '07:30', hourCycle: 'h12' })], { system: 'cupertino' });
    await expect(host(page, 'c').locator('.other-mode')).toHaveCount(0);
    expect((await bounds(host(page, 'c').locator('.time'))).width).toBeCloseTo(await resolveToken(page, T('dial-container-size')), 0);
  });
});

test.describe('the time', () => {
  test('DTM-13: while both entry modes are offered the entry-mode tabs are two icon-only tabs that hug — the keyboard glyph named wheelsLabel first, the schedule glyph named dialLabel second, no word drawn — and choose wheels or dial, keeping the pending time and ending a typed entry first; a system that offers one draws no tabs and shows it whatever entryMode says', async ({ page }) => {
    await mount(page, [opened('t', { mode: 'time', value: '07:30' })]);
    await expect(tabsRow(page, 't', 'entry').locator('tanrei-tab')).toHaveCount(2);
    // Each tab's glyph and its accessible name (DTM-13's verify).
    for (const [id, glyph, name] of [['entry-wheels', 'keyboard', 'Wheels'], ['entry-dial', 'schedule', 'Dial']] as const) {
      const t = tabOf(page, 't', id);
      await expect(t).toHaveAttribute('icon', glyph);
      await expect(t).toHaveAttribute('label-hidden', '');
      await expect(t).toHaveAttribute('role', 'tab');
      await expect(t).toHaveAttribute('aria-label', name);
      // The glyph is drawn, and no word.
      await expect(t.locator('.icon').first()).toHaveText(glyph);
      await expect(t.locator('.label')).toHaveCount(0);
      expect(await t.evaluate((el) => (el.shadowRoot!.querySelector('.tab') as HTMLElement).innerText.trim())).not.toContain(name);
    }
    await host(page, 't').evaluate((el: any) => ((el.wheelsLabel = 'Type'), (el.dialLabel = 'Clock')));
    await expect(tabOf(page, 't', 'entry-wheels')).toHaveAttribute('aria-label', 'Type');
    await expect(tabOf(page, 't', 'entry-dial')).toHaveAttribute('aria-label', 'Clock');
    expect((await bounds(tabOf(page, 't', 'entry-wheels'))).x).toBeLessThan((await bounds(tabOf(page, 't', 'entry-dial'))).x);
    await expect(tabsRow(page, 't', 'entry')).not.toHaveAttribute('full-width', '');
    await expect(tabsRow(page, 't', 'entry')).toHaveAttribute('label', 'Time input');
    await expect(tabOf(page, 't', 'entry-wheels')).toHaveAttribute('aria-selected', 'true');
    await wheel(page, 't', 'hour').focus();
    await page.keyboard.press('ArrowUp');
    // A typed entry in progress ends first, keeping what it read: 1 on the hour, and the dial opens on 1.
    await page.keyboard.press('1');
    await tabOf(page, 't', 'entry-dial').click();
    await expect(host(page, 't').locator('.dial')).toHaveCount(1);
    await expect(selector(page, 't', 'hour')).toHaveAttribute('aria-valuenow', '1');
    // A fixture system that offers the wheels alone (1), and the dial alone (2).
    await override(page, { [T('time-entry-modes')]: 'wheels' });
    await expect(tabsRow(page, 't', 'entry')).toHaveCount(0);
    await expect(wheel(page, 't', 'hour')).toHaveCount(1);
    await override(page, { [T('time-entry-modes')]: 'dial' });
    await expect(host(page, 't').locator('.dial')).toHaveCount(1);
    await expect(tabsRow(page, 't', 'entry')).toHaveCount(0);
  });

  test('DTM-14: with the 12-hour clock the period is a part of the time, never tabs — the period selector in the row of the hour and the minute, period.gap after the minute (before the hour where the locale writes it first), at least period.container.width wide and as tall as the selectors, on the selector’s shape, its name in period.label.typescale; drawn from the unselected selector’s tokens in every state, never selected; a press, Enter or Space changes the period and keeps the hour’s number, the unit the dial shows, the selected selector and focus; no period with the 24-hour clock', async ({ page }) => {
    await mount(page, [modal('t', { mode: 'time', value: '07:30', hourCycle: 'h12', entryMode: 'dial' })], { system: 'acme', systemCss: await acmeSystemCss() });
    await open(page, 't');
    await page.mouse.move(0, 0);
    await override(page, { [T('motion-state-duration')]: '0ms' });
    const p = period(page, 't');
    // Not tabs, not a switch: one cell in the time display's row, after the minute, period.gap from it.
    await expect(host(page, 't').locator('.period-tabs, tanrei-tab#period-am, [role="switch"]')).toHaveCount(0);
    await expect(p).toHaveCount(1);
    await expect(periodName(page, 't')).toHaveText('AM');
    const [m, box, h] = [await bounds(selector(page, 't', 'minute')), await bounds(p), await bounds(selector(page, 't', 'hour'))];
    expect(box.x - (m.x + m.width)).toBeCloseTo(await resolveToken(page, T('period-gap')), 0);
    expect(box.width).toBeCloseTo(Math.max(await resolveToken(page, T('period-container-width')), await resolveToken(page, '--tanrei-sys-target-pointer')), 0);
    expect(box.y).toBeCloseTo(h.y, 0);
    expect(box.height).toBeCloseTo(h.height, 0);
    expect(await px(p, 'border-top-left-radius')).toBe(await resolveToken(page, T('selector-container-shape')));
    expect(await px(p, 'font-size')).toBe(await resolveToken(page, T('period-label-typescale-font-size')));
    expect(await css(p, 'font-weight')).toBe(String(await token(page, T('period-label-typescale-font-weight'))));
    const name = await bounds(p.locator('.name:not([data-off])'));
    expect(name.x + name.width / 2).toBeCloseTo(box.x + box.width / 2, 0);
    expect(name.y + name.height / 2).toBeCloseTo(box.y + box.height / 2, 0);
    // The unselected selector's tokens at rest — never the selected ones, though it has the focus or is pressed.
    const look = async (locator: Locator) => [await css(locator, 'background-color'), await css(locator, 'color'), await css(locator, 'box-shadow')];
    const tokens = async (condition: string, state = '') => [
      await resolveColor(page, T(`${condition}${state}-selector-container-color`)),
      await resolveColor(page, T(`${condition}${state}-selector-label-color`)),
      `${await resolveColor(page, T(`${condition}${state}-selector-outline-color`))} 0px 0px 0px ${await resolveToken(page, T(`${condition}${state}-selector-outline-width`))}px inset`,
    ];
    expect(await look(p)).toEqual(await tokens('unselected'));
    expect(await tokens('unselected')).not.toEqual(await tokens('selected'));
    await expect(p).not.toHaveClass(/selected/);
    // Hovered, focused by the keyboard and pressed: each that state's tokens of the unselected condition (DTM-27).
    await p.hover();
    await expect.poll(() => css(p, 'background-color')).toBe(await resolveColor(page, T('unselected-hovered-selector-container-color')));
    await page.mouse.move(0, 0);
    await selector(page, 't', 'minute').focus();
    await tab(page);
    expect(await focused(page)).toBe('selector:period');
    await expect.poll(() => css(p, 'background-color')).toBe(await resolveColor(page, T('unselected-focused-selector-container-color')));
    // Taking focus changed neither the unit the dial shows nor which selector is selected (the minute's, focused before).
    await expect(selector(page, 't', 'minute')).toHaveClass(/selected/);
    await expect(host(page, 't').locator('.face .numbers.minutes')).not.toHaveClass(/faded/);
    await selector(page, 't', 'hour').focus();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect.poll(() => look(p)).toEqual(await tokens('unselected', '-pressed'));
    await expect(p).toHaveAttribute('data-pressed', /./);
    await expect(p).not.toHaveClass(/selected/);
    await page.mouse.up();
    // That press changed it: 07:30 is 19:30, the name PM shown at once, the hour selector still selected, the dial still on the hours.
    await expect(periodName(page, 't')).toHaveText('PM');
    await expect(selector(page, 't', 'hour')).toHaveAttribute('aria-valuetext', '7 PM');
    await expect(selector(page, 't', 'hour')).toHaveText('7');
    await expect(selector(page, 't', 'hour')).toHaveClass(/selected/);
    await expect(selector(page, 't', 'minute')).not.toHaveClass(/selected/);
    await expect(host(page, 't').locator('.face .numbers.hours')).not.toHaveClass(/faded/);
    // Its width is the wider name's, whichever it shows: nothing moved.
    expect((await bounds(p)).width).toBeCloseTo(box.width, 1);
    // Enter and Space change it too, and focus stays on it.
    await p.focus();
    await page.keyboard.press('Enter');
    await expect(periodName(page, 't')).toHaveText('AM');
    await page.keyboard.press('Space');
    await expect(periodName(page, 't')).toHaveText('PM');
    expect(await focused(page)).toBe('selector:period');
    await expect(selector(page, 't', 'hour')).toHaveClass(/selected/);
    // Nothing is committed by itself (DTM-6): OK commits 19:30.
    expect(await log(page)).toEqual([]);
    await action(page, 't', 'confirm').click();
    expect(await log(page)).toEqual(['change:{"value":"19:30","start":"","end":""}:19:30||', 'close:confirm']);
    // Where the locale writes the period first (ja-JP): before the hour, the same gap away, in the locale's names.
    await mount(page, [opened('ja', { mode: 'time', value: '19:30', hourCycle: 'h12', locale: 'ja-JP', entryMode: 'dial' })]);
    await settle(page, 'ja');
    await expect(periodName(page, 'ja')).toHaveText('午後');
    const [jp, jh] = [await bounds(period(page, 'ja')), await bounds(selector(page, 'ja', 'hour'))];
    expect(jh.x - (jp.x + jp.width)).toBeCloseTo(await resolveToken(page, T('period-gap')), 0);
    await period(page, 'ja').click();
    await expect(periodName(page, 'ja')).toHaveText('午前');
    await expect(selector(page, 'ja', 'hour')).toHaveAttribute('aria-valuetext', '午前 7');
    // A longer name is not cut: the selector grows.
    await mount(page, [opened('es', { mode: 'time', value: '19:30', hourCycle: 'h12', locale: 'es-ES', entryMode: 'dial' })]);
    await override(page, { [T('period-container-width')]: '10px', [T('period-label-typescale-font')]: '500 28px/1.2 sans-serif' });
    const [cell, word] = [await bounds(period(page, 'es')), await bounds(period(page, 'es').locator('.name:not([data-off])'))];
    expect(cell.width).toBeGreaterThanOrEqual(word.width - 0.5);
    expect(word.x).toBeGreaterThanOrEqual(cell.x - 0.5);
    // The 24-hour clock draws no period, in either mode.
    await mount(page, [opened('b', { mode: 'time', value: '19:30', hourCycle: 'h23', entryMode: 'dial' })]);
    await expect(periodBox(page, 'b')).toHaveCount(0);
    await tabOf(page, 'b', 'entry-wheels').click();
    await expect(periodBox(page, 'b')).toHaveCount(0);
  });

  test('DTM-15: a range with a time draws the range display — the start’s range field, an en dash, the end’s, range-field.gap apart, equally wide, in a group named rangeLabel — each field at least its height, padded, its time in its role, on the selector’s shape and its condition’s selector tokens (acme values them apart); no word for start or end; the start’s selected when it opens, and the time section sets the selected end; the display is the first row and as wide as the time section in every mode and layout', async ({ page }) => {
    await mount(page, [modal('r', { mode: 'time', range: true, start: '09:00', end: '17:30', hourCycle: 'h12' })], { system: 'acme', systemCss: await acmeSystemCss() });
    await open(page, 'r');
    await page.mouse.move(0, 0);
    await override(page, { [T('motion-state-duration')]: '0ms' });
    const display = host(page, 'r').locator('.range-display');
    await expect(display).toHaveAttribute('role', 'group');
    await expect(display).toHaveAttribute('aria-label', 'Range');
    await expect(host(page, 'r').locator('.range-tabs, tanrei-tab#range-start')).toHaveCount(0);
    const [start, end, dash] = [field(page, 'r', 'start'), field(page, 'r', 'end'), host(page, 'r').locator('.range-separator')];
    // The times as the locale writes them, and nothing else: no word says start or end.
    await expect(start).toHaveText('9:00 AM');
    await expect(end).toHaveText('5:30 PM');
    await expect(dash).toHaveText('–');
    await expect(dash).toHaveAttribute('aria-hidden', 'true');
    expect(await display.evaluate((el) => (el as HTMLElement).innerText.replace(/\s+/g, ' ').trim())).toBe('9:00 AM – 5:30 PM');
    // In reading order, the gap apart, equally wide: the dash at the middle of the row.
    const [s, d, e, row] = [await bounds(start), await bounds(dash), await bounds(end), await bounds(display)];
    const gap = await resolveToken(page, T('range-field-gap'));
    expect(d.x - (s.x + s.width)).toBeCloseTo(gap, 0);
    expect(e.x - (d.x + d.width)).toBeCloseTo(gap, 0);
    expect(s.width).toBeCloseTo(e.width, 0);
    expect(d.x + d.width / 2).toBeCloseTo(row.x + row.width / 2, 0);
    // Each field: at least its height, padded at each end, its time centred in its role, on the selector's shape.
    expect(s.height).toBeCloseTo(Math.max(await resolveToken(page, T('range-field-container-height')), await resolveToken(page, '--tanrei-sys-target-pointer')), 0);
    expect(await px(start, 'padding-left')).toBe(await resolveToken(page, T('range-field-container-padding-inline')));
    expect(await px(start, 'padding-right')).toBe(await resolveToken(page, T('range-field-container-padding-inline')));
    expect(await px(start.locator('.value'), 'font-size')).toBe(await resolveToken(page, T('range-field-label-typescale-font-size')));
    expect(await px(dash, 'font-size')).toBe(await resolveToken(page, T('range-field-label-typescale-font-size')));
    expect(await css(dash, 'color')).toBe(await resolveColor(page, T('separator-color')));
    expect(await px(start, 'border-top-left-radius')).toBe(await resolveToken(page, T('selector-container-shape')));
    const text = await bounds(start.locator('.value'));
    expect(text.x + text.width / 2).toBeCloseTo(s.x + s.width / 2, 0);
    // The start's is selected when the picker opens: each field in its condition's selector tokens.
    const look = async (locator: Locator) => [await css(locator, 'background-color'), await css(locator, 'color'), await css(locator, 'box-shadow')];
    const tokens = async (condition: string) => [
      await resolveColor(page, T(`${condition}-selector-container-color`)),
      await resolveColor(page, T(`${condition}-selector-label-color`)),
      `${await resolveColor(page, T(`${condition}-selector-outline-color`))} 0px 0px 0px ${await resolveToken(page, T(`${condition}-selector-outline-width`))}px inset`,
    ];
    await expect(start).toHaveClass(/selected/);
    await expect(end).not.toHaveClass(/selected/);
    expect(await look(start)).toEqual(await tokens('selected'));
    expect(await look(end)).toEqual(await tokens('unselected'));
    expect(await tokens('selected')).not.toEqual(await tokens('unselected'));
    await expect(wheel(page, 'r', 'hour')).toHaveAttribute('aria-valuetext', '9 AM');
    // The end's selected (which is not a prop): the two conditions change places, and the time section sets the end.
    await end.click();
    await page.mouse.move(0, 0);
    await expect.poll(() => look(end)).toEqual(await tokens('selected'));
    expect(await look(start)).toEqual(await tokens('unselected'));
    await expect(wheel(page, 'r', 'hour')).toHaveAttribute('aria-valuetext', '5 PM');
    await expect(period(page, 'r')).toHaveAttribute('aria-valuetext', 'PM');
    await wheel(page, 'r', 'minute').focus();
    await page.keyboard.press('ArrowUp');
    await expect(end).toHaveText('5:31 PM');
    await expect(start).toHaveText('9:00 AM');
    await action(page, 'r', 'confirm').click();
    expect(await log(page)).toEqual(['change:{"value":"","start":"09:00","end":"17:31"}:|09:00|17:31', 'close:confirm']);
    // The first row of the time section and as wide as it — the two fields equally wide — in mode time (vertical and
    // horizontal, wheels and dial) and in mode date-time.
    const range = (props: Fixture['props']) => ({ range: true, hourCycle: 'h12', ...props });
    const times = { mode: 'time', start: '09:00', end: '17:30' };
    const dates = { mode: 'date-time', start: '2026-09-10T09:00', end: '2026-09-16T17:00' };
    const cases: [string, Fixture['props'], { width: number; height: number }][] = [
      ['time, wheels', range(times), { width: 480, height: 720 }],
      ['time, dial', range({ ...times, entryMode: 'dial' }), { width: 480, height: 720 }],
      ['time, horizontal, wheels', range({ ...times, layout: 'horizontal' }), { width: 800, height: 640 }],
      ['time, horizontal, dial', range({ ...times, layout: 'horizontal', entryMode: 'dial' }), { width: 800, height: 640 }],
      ['date-time, vertical, wheels', range({ ...dates, layout: 'vertical' }), { width: 480, height: 1100 }],
      ['date-time, vertical, dial', range({ ...dates, layout: 'vertical', entryMode: 'dial' }), { width: 480, height: 1100 }],
      ['date-time, horizontal, wheels', range({ ...dates, layout: 'horizontal' }), { width: 800, height: 640 }],
      ['date-time, horizontal, dial', range({ ...dates, layout: 'horizontal', entryMode: 'dial' }), { width: 800, height: 640 }],
    ];
    for (const [name, props, window] of cases) {
      await mount(page, [opened('w', props)], { window });
      await settle(page, 'w');
      const [whole, section, first, second, line] = [await bounds(host(page, 'w').locator('.range-display')), await bounds(host(page, 'w').locator('.time')), await bounds(field(page, 'w', 'start')), await bounds(field(page, 'w', 'end')), await bounds(host(page, 'w').locator('.range-separator'))];
      expect(whole.x, `${name}: as wide as the section`).toBeCloseTo(section.x, 0);
      expect(whole.width, `${name}: as wide as the section`).toBeCloseTo(section.width, 0);
      expect(whole.y, `${name}: the first row`).toBeCloseTo(section.y, 0);
      expect(first.width, `${name}: equally wide`).toBeCloseTo(second.width, 0);
      expect(first.width + second.width + line.width + 2 * gap, `${name}: the fields fill it`).toBeCloseTo(whole.width, 0);
      expect(line.x + line.width / 2, `${name}: the dash at the middle`).toBeCloseTo(section.x + section.width / 2, 0);
    }
    // A range of dates alone has no time section, so no range display; nor has a single time.
    await mount(page, [opened('d', { range: true, start: '2026-09-10', end: '2026-09-16' }), opened('t', { mode: 'time', value: '07:30' })]);
    await expect(host(page, 'd').locator('.range-display')).toHaveCount(0);
    await expect(host(page, 't').locator('.range-display')).toHaveCount(0);
  });

  test('DTM-16: h12 runs 1–12 with a period, h23 00–23 without one, locale takes the locale’s clock; values are 24-hour', async ({ page }) => {
    await mount(page, [
      opened('a', { mode: 'time', value: '19:30', hourCycle: 'h12' }),
      opened('b', { mode: 'time', value: '19:30', hourCycle: 'h23' }),
      opened('us', { mode: 'time', value: '19:30' }),
      opened('gb', { mode: 'time', value: '19:30', locale: 'en-GB' }),
    ]);
    expect([await wheel(page, 'a', 'hour').getAttribute('aria-valuemin'), await wheel(page, 'a', 'hour').getAttribute('aria-valuemax'), await now(wheel(page, 'a', 'hour'))]).toEqual(['1', '12', 7]);
    expect([await wheel(page, 'b', 'hour').getAttribute('aria-valuemin'), await wheel(page, 'b', 'hour').getAttribute('aria-valuemax'), await now(wheel(page, 'b', 'hour'))]).toEqual(['0', '23', 19]);
    await expect(periodBox(page, 'a')).toHaveCount(1);
    await expect(periodBox(page, 'b')).toHaveCount(0);
    await expect(periodBox(page, 'us')).toHaveCount(1);
    await expect(periodBox(page, 'gb')).toHaveCount(0);
    await expect(wheel(page, 'b', 'hour')).toHaveAttribute('aria-valuetext', '19');
  });

  test('DTM-17: only the multiples of minuteStep are offered; another step behaves as 1 and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [inline('s', { mode: 'time', value: '07:45', minuteStep: 15 }), inline('x', { mode: 'time', value: '07:45', minuteStep: 7 })]);
    await expect(wheel(page, 's', 'minute')).toHaveAttribute('aria-valuemax', '45');
    await wheel(page, 's', 'minute').focus();
    await page.keyboard.press('ArrowUp');
    await expect(wheel(page, 's', 'minute')).toHaveAttribute('aria-valuenow', '0');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(wheel(page, 's', 'minute')).toHaveAttribute('aria-valuenow', '30');
    await expect(wheel(page, 'x', 'minute')).toHaveAttribute('aria-valuemax', '59');
    expect(seen.some((w) => w.includes('DTM-17') && w.includes('minuteStep "7"'))).toBe(true);
  });

  test('DTM-18: the wheels — hour, separator, minute, left to right, wheel.gap apart, each wheel.width × wheel.height of rows row.height tall — each on its own selection container behind its middle row, in its color and shape, the separator between the two; one band behind both where the span is joined (cupertino); values on a container in selected-label.color', async ({ page }) => {
    await mount(page, [opened('t', { mode: 'time', value: '07:30', hourCycle: 'h12' })]);
    const [h, s, m] = [await bounds(wheelBox(page, 't', 'hour')), await bounds(host(page, 't').locator('.time > .wheels .separator')), await bounds(wheelBox(page, 't', 'minute'))];
    expect(h.x).toBeLessThan(s.x);
    expect(s.x).toBeLessThan(m.x);
    expect(s.x - (h.x + h.width)).toBeCloseTo(await resolveToken(page, T('wheel-gap')), 0);
    expect(h.width).toBeCloseTo(await resolveToken(page, T('wheel-width')), 0);
    expect(h.height).toBeCloseTo(await resolveToken(page, T('wheel-height')), 0);
    const row = host(page, 't').locator('.wheel[data-unit="hour"] .row.on');
    await expect(row).toHaveText('7');
    const rowHeight = Math.max(await resolveToken(page, T('wheel-row-height')), await resolveToken(page, '--tanrei-sys-target-pointer'));
    expect((await bounds(row)).height).toBeCloseTo(rowHeight, 0);
    expect(await css(row, 'color')).toBe(await resolveColor(page, T('wheel-selected-label-color')));
    const other = host(page, 't').locator('.wheel[data-unit="hour"] .row:not(.on)').first();
    expect(await css(other, 'color')).toBe(await resolveColor(page, T('wheel-label-color')));
    // The default system is each: a selection container for each wheel, as wide as the wheel and one row tall, behind
    // its middle row — and nothing behind the separator between the two.
    await expect(shownRow(page, 't', 'wheels')).toHaveAttribute('data-span', 'each');
    const transparent = 'rgba(0, 0, 0, 0)';
    for (const unit of ['hour', 'minute'] as const) {
      const ground = wheelBox(page, 't', unit).locator('.ground');
      const [g, w] = [await bounds(ground), await bounds(wheelBox(page, 't', unit))];
      expect(await css(ground, 'background-color'), unit).toBe(await resolveColor(page, T('wheel-selection-container-color')));
      expect(await px(ground, 'border-top-left-radius'), unit).toBe(await resolveToken(page, T('wheel-selection-container-shape')));
      expect([g.x, g.width, g.height].map(Math.round), unit).toEqual([w.x, w.width, rowHeight].map(Math.round));
      expect(g.y + g.height / 2, unit).toBeCloseTo(w.y + w.height / 2, 0);
      await expect(ground).toHaveAttribute('aria-hidden', 'true');
    }
    const band = host(page, 't').locator('.time > .wheels > .band');
    expect(await css(band, 'background-color')).toBe(transparent);
    await expect(host(page, 't').locator('.wheel[data-unit="minute"] .row.on')).toHaveText('30');
    expect(await css(host(page, 't').locator('.time > .wheels .separator'), 'color')).toBe(await resolveColor(page, T('separator-color')));
    expect(await px(host(page, 't').locator('.time > .wheels .separator'), 'font-size')).toBe(await resolveToken(page, T('wheel-label-typescale-font-size')));
    // The rows run on past the ends: below 12 comes 1 again.
    await expect(host(page, 't').locator('.wheel[data-unit="hour"] .row')).toContainText(['3', '4', '5', '6', '7', '8', '9', '10', '11']);
    // A fixture system that joins them (1): one container behind the middle row of both wheels and the separator.
    // With the 12-hour clock the period wheel stands beside them (DTM-46), on its own selection container.
    const p = await bounds(periodBox(page, 't'));
    expect(p.x).toBeGreaterThan(m.x + m.width - 0.5);
    expect(await css(periodBox(page, 't').locator('.ground'), 'background-color')).toBe(await resolveColor(page, T('wheel-selection-container-color')));
    await override(page, { [T('wheel-selection-span')]: 'joined' });
    await expect(shownRow(page, 't', 'wheels')).toHaveAttribute('data-span', 'joined');
    expect(await css(band, 'background-color')).toBe(await resolveColor(page, T('wheel-selection-container-color')));
    // The band runs behind all three: from the hour wheel to the period wheel.
    const b = await bounds(band);
    expect(b.x).toBeCloseTo(h.x, 0);
    expect(b.x + b.width).toBeCloseTo(p.x + p.width, 0);
    await expect.poll(() => css(periodBox(page, 't').locator('.ground'), 'background-color')).toBe(transparent);
    expect(b.height).toBeCloseTo(rowHeight, 0);
    expect(b.y + b.height / 2).toBeCloseTo(h.y + h.height / 2, 0);
    for (const unit of ['hour', 'minute'] as const) await expect.poll(() => css(wheelBox(page, 't', unit).locator('.ground'), 'background-color')).toBe(transparent);
    // cupertino sets it.
    await mount(page, [inline('c', { mode: 'time', value: '07:30', hourCycle: 'h12' })], { system: 'cupertino' });
    await expect(shownRow(page, 'c', 'wheels')).toHaveAttribute('data-span', 'joined');
    expect(await css(host(page, 'c').locator('.wheels > .band'), 'background-color')).toBe(await resolveColor(page, T('wheel-selection-container-color')));
    // cupertino's band behind all three wheels (DTM-46), the period's names set as the other columns' are.
    const [cb, ch, cp] = [await bounds(host(page, 'c').locator('.wheels > .band')), await bounds(wheelBox(page, 'c', 'hour')), await bounds(periodBox(page, 'c'))];
    expect(cb.x).toBeCloseTo(ch.x, 0);
    expect(cb.x + cb.width).toBeCloseTo(cp.x + cp.width, 0);
    expect(await px(periodBox(page, 'c'), 'font-size')).toBe(await px(wheelBox(page, 'c', 'hour'), 'font-size'));
    // A 24-hour time has no period: the band is behind the two wheels.
    await mount(page, [inline('d', { mode: 'time', value: '19:30', hourCycle: 'h23' })], { system: 'cupertino' });
    const [db, dm] = [await bounds(host(page, 'd').locator('.wheels > .band')), await bounds(wheelBox(page, 'd', 'minute'))];
    expect(db.x + db.width).toBeCloseTo(dm.x + dm.width, 0);
  });

  test('DTM-19: a drag moves the rows with the pointer and settles the nearest row, taking its value once settled; a press on a row above or below the selection container settles it (one on the middle row begins a typed entry); a scroll moves them; the other wheel and the period stay; at once where reduced', async ({ page }) => {
    await mount(page, [opened('t', { mode: 'time', value: '07:30', hourCycle: 'h12' })]);
    const w = wheel(page, 't', 'hour');
    const b = await bounds(wheelBox(page, 't', 'hour'));
    const row = (await bounds(host(page, 't').locator('.wheel[data-unit="hour"] .row.on'))).height;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy - row, { steps: 5 });
    await page.waitForTimeout(150);
    await page.mouse.move(cx, cy - 2 * row, { steps: 5 });
    await page.waitForTimeout(150);
    await page.mouse.up();
    await expect.poll(() => now(w)).toBe(9);
    expect(await now(wheel(page, 't', 'minute'))).toBe(30);
    await expect(period(page, 't')).toHaveAttribute('aria-valuetext', 'AM');
    // A press on the row below the band.
    await page.mouse.click(cx, cy + row);
    await expect.poll(() => now(w)).toBe(10);
    // Wrapping: 12 to 1 keeps the period.
    await page.mouse.click(cx, cy + 2 * row);
    await page.mouse.click(cx, cy + row);
    await expect.poll(() => now(w)).toBe(1);
    await expect(period(page, 't')).toHaveAttribute('aria-valuetext', 'AM');
    // A scroll.
    await wheelBox(page, 't', 'hour').evaluate((el, r) => el.dispatchEvent(new WheelEvent('wheel', { deltaY: r * 2, bubbles: true, cancelable: true })), row);
    await expect.poll(() => now(w)).toBe(3);
    // The settle runs over the wheel motion; at once where reduced.
    expect(await css(host(page, 't').locator('.wheel[data-unit="hour"] .row').first(), 'transition-duration')).toContain(`${(await resolveToken(page, T('motion-wheel-duration'), 'duration')) / 1000}s`);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.mouse.click(cx, cy + row);
    expect(await now(w)).toBe(4);
    // A press on the middle row that ends without a drag moves nothing: it begins a typed entry (DTM-43).
    await page.mouse.click(cx, cy);
    expect(await now(w)).toBe(4);
    await expect(wheelBox(page, 't', 'hour')).toHaveClass(/typing/);
  });

  test('DTM-19: a fast drag released within 40 ms of its last move is a fling — the wheel carries on past the nearest row and takes the value it settles on once settled, over the wheel motion — and the same drag held still for more than 40 ms before its release settles the nearest row; the period wheel likewise', async ({ page }) => {
    await mount(page, [opened('t', { mode: 'time', value: '07:30', hourCycle: 'h12' })]);
    const w = wheel(page, 't', 'hour');
    const box = wheelBox(page, 't', 'hour');
    const row = (await bounds(box.locator('.row.on'))).height;
    const duration = await resolveToken(page, T('motion-wheel-duration'), 'duration');
    expect(duration).toBeGreaterThan(0);
    const b = await bounds(box);
    const from = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    // 30 px up in three moves 4 ms apart (2.5 px per ms), past the touch slop. The pointer's events are made in the page
    // on a held clock, so the stillness before the release is exact.
    const moves = strokes(from, { x: 0, y: -10 });
    const nearest = Math.round(30 / row);
    // Held still for longer than 40 ms: no velocity, so the nearest row settles.
    await flingThenHold(page, box, { from, moves, hold: STOPPED_AFTER + 1 });
    await expect.poll(() => now(w)).toBe(7 + nearest);
    // Released 40 ms after the last move: a fling. Its velocity over the drag carries the wheel on, slowing to rest
    // over the wheel motion (v · duration / 2), past the nearest row; the value is taken once the rows have settled.
    const velocity = 30 / (moves.length * 4 + STOPPED_AFTER);
    const carried = Math.round((30 + (velocity * duration) / 2) / row);
    expect(carried).toBeGreaterThan(nearest);
    await flingThenHold(page, box, { from, moves, hold: STOPPED_AFTER, keepClock: true });
    await page.clock.runFor(duration - 1);
    expect(await now(w)).toBe(7 + nearest);
    await page.clock.runFor(1);
    await expect.poll(() => now(w)).toBe(7 + nearest + carried);
    await releaseClock(page);
    expect(await now(wheel(page, 't', 'minute'))).toBe(30);
    // The period wheel: 12 px up is nearer the pending name (AM) than the next; only a fling carries it to PM.
    const p = periodBox(page, 't');
    const pb = await bounds(p);
    const at = { x: pb.x + pb.width / 2, y: pb.y + pb.height / 2 };
    const short = strokes(at, { x: 0, y: -4 });
    expect(Math.round(12 / row)).toBe(0);
    expect((12 + ((12 / (short.length * 4 + STOPPED_AFTER)) * duration) / 2) / row).toBeGreaterThan(0.5);
    await flingThenHold(page, p, { from: at, moves: short, hold: STOPPED_AFTER + 1 });
    await expect.poll(() => p.locator('.row.on').textContent()).toBe('AM');
    await expect(period(page, 't')).toHaveAttribute('aria-valuetext', 'AM');
    await flingThenHold(page, p, { from: at, moves: short, hold: STOPPED_AFTER });
    await expect(period(page, 't')).toHaveAttribute('aria-valuetext', 'PM');
  });

  test('DTM-20: each wheel is a spin button named hourLabel or minuteLabel, its value as drawn with the period; the keys move it, wrapping; the rows off the selection container are hidden; keyboard focus rings its selection container (its part of a joined one), pointer focus does not; a digit begins a typed entry; no hover or press state', async ({ page }) => {
    await mount(page, [opened('t', { mode: 'time', value: '07:30', hourCycle: 'h12' })]);
    const h = wheel(page, 't', 'hour');
    await expect(h).toHaveAttribute('role', 'spinbutton');
    await expect(h).toHaveAttribute('aria-label', 'Hour');
    await expect(wheel(page, 't', 'minute')).toHaveAttribute('aria-label', 'Minute');
    await expect(h).toHaveAttribute('aria-valuetext', '7 AM');
    await expect(wheelBox(page, 't', 'hour').locator('.rows')).toHaveAttribute('aria-hidden', 'true');
    // One focusable control a wheel: the wheel itself and its rows take no focus.
    expect(await wheelBox(page, 't', 'hour').evaluate((el) => [...el.querySelectorAll('*')].filter((n) => (n as HTMLElement).tabIndex >= 0).length)).toBe(1);
    await h.focus();
    await press(page, ['ArrowUp']);
    await expect(h).toHaveAttribute('aria-valuenow', '8');
    await press(page, ['End']);
    await expect(h).toHaveAttribute('aria-valuenow', '12');
    await press(page, ['ArrowUp']);
    await expect(h).toHaveAttribute('aria-valuenow', '1');
    await press(page, ['Home', 'ArrowDown']);
    await expect(h).toHaveAttribute('aria-valuenow', '12');
    await expect(period(page, 't')).toHaveAttribute('aria-valuetext', 'AM');
    const m = wheel(page, 't', 'minute');
    const ring = wheelBox(page, 't', 'minute').locator('.ring');
    // Focus by the keyboard: the ring, around the wheel's selection container, never animated.
    await tab(page);
    expect(await focused(page)).toBe('wheel:minute');
    await press(page, ['PageUp']);
    await expect(m).toHaveAttribute('aria-valuenow', '35');
    await press(page, ['End', 'ArrowUp']);
    await expect(m).toHaveAttribute('aria-valuenow', '0');
    await expect.poll(() => css(ring, 'outline-style')).toBe('solid');
    expect(await css(ring, 'transition-property')).not.toContain('outline');
    const [r, g] = [await bounds(ring), await bounds(wheelBox(page, 't', 'minute').locator('.ground'))];
    expect([r.x, r.y, r.width, r.height].map(Math.round)).toEqual([g.x, g.y, g.width, g.height].map(Math.round));
    // Around its own part of a joined container too.
    await override(page, { [T('wheel-selection-span')]: 'joined' });
    expect(await css(ring, 'outline-style')).toBe('solid');
    expect((await bounds(ring)).width).toBeCloseTo((await bounds(wheelBox(page, 't', 'minute'))).width, 0);
    await override(page, { [T('wheel-selection-span')]: '' });
    // Focus by a press on the wheel: no ring — and no hover or press state.
    await m.evaluate((el) => (el as HTMLElement).blur());
    const box = await bounds(wheelBox(page, 't', 'minute'));
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2 + (await bounds(ring)).height);
    expect(await focused(page)).toBe('wheel:minute');
    expect(await css(ring, 'outline-style')).toBe('none');
    expect(await wheelBox(page, 't', 'minute').getAttribute('data-pressed')).toBeNull();
    const ground = wheelBox(page, 't', 'minute').locator('.ground');
    const resting = await resolveColor(page, T('wheel-selection-container-color'));
    await expect.poll(() => css(ground, 'background-color')).toBe(resting);
    await wheelBox(page, 't', 'minute').hover();
    await page.mouse.down();
    expect(await css(ground, 'background-color')).toBe(resting);
    await page.mouse.up();
    // A digit typed while the wheel has focus begins a typed entry (DTM-43).
    await h.focus();
    await page.keyboard.press('1');
    await expect(wheelBox(page, 't', 'hour')).toHaveClass(/typing/);
    await expect(h).toHaveValue('1');
  });

  test('DTM-46: the period wheel — beside the minute wheel period.gap away (before the hour where the locale writes the period first), at least period.container.width wide and as tall as the others, two rows of row.height, AM above PM, in period.label.typescale, not running on — draws the pending name on its selection container and the other off it; a drag, a scroll, a press on the other name’s row and a press on the middle row settle it, stopping at its ends, and keep the hour’s number; it takes no text and begins no entry; no hover or press state', async ({ page }) => {
    await mount(page, [opened('t', { mode: 'time', value: '19:30', hourCycle: 'h12' })]);
    const box = periodBox(page, 't');
    const p = period(page, 't');
    await settle(page, 't');
    const [m, b, h] = [await bounds(wheelBox(page, 't', 'minute')), await bounds(box), await bounds(wheelBox(page, 't', 'hour'))];
    const rowHeight = Math.max(await resolveToken(page, T('wheel-row-height')), await resolveToken(page, '--tanrei-sys-target-pointer'));
    expect(b.x - (m.x + m.width)).toBeCloseTo(await resolveToken(page, T('period-gap')), 0);
    expect(b.width).toBeCloseTo(Math.max(await resolveToken(page, T('period-container-width')), await resolveToken(page, '--tanrei-sys-target-pointer')), 0);
    expect(b.y).toBeCloseTo(h.y, 0);
    expect(b.height).toBeCloseTo(h.height, 0);
    expect(await px(box, 'font-size')).toBe(await resolveToken(page, T('period-label-typescale-font-size')));
    // Two rows and no more: the name before noon above the one after; the pending one (PM) on the middle row, on the
    // selection container, the other in the row above — and nothing below, since the wheel does not run on.
    const rows = box.locator('.row');
    await expect(rows).toHaveText(['AM', 'PM']);
    const [am, pm, ground] = [await bounds(rows.nth(0)), await bounds(rows.nth(1)), await bounds(box.locator('.ground'))];
    expect(am.height).toBeCloseTo(rowHeight, 0);
    expect(Math.round(pm.y)).toBe(Math.round(ground.y));
    expect(pm.y - am.y).toBeCloseTo(rowHeight, 0);
    expect([ground.x, ground.width, ground.height].map(Math.round)).toEqual([b.x, b.width, rowHeight].map(Math.round));
    expect(ground.y + ground.height / 2).toBeCloseTo(b.y + b.height / 2, 0);
    expect(await css(box.locator('.ground'), 'background-color')).toBe(await resolveColor(page, T('wheel-selection-container-color')));
    expect(await px(box.locator('.ground'), 'border-top-left-radius')).toBe(await resolveToken(page, T('wheel-selection-container-shape')));
    await expect(rows.nth(1)).toHaveClass(/on/);
    expect(await css(rows.nth(1), 'color')).toBe(await resolveColor(page, T('wheel-selected-label-color')));
    expect(await css(rows.nth(0), 'color')).toBe(await resolveColor(page, T('wheel-label-color')));
    const name = await bounds(rows.nth(1));
    expect(name.x + name.width / 2).toBeCloseTo(b.x + b.width / 2, 0);
    const [cx, cy] = [b.x + b.width / 2, b.y + b.height / 2];
    const hour = wheel(page, 't', 'hour');
    // A press on the row above the middle row (the other name's): it settles, 19:30 is 07:30 and the hour's number stays.
    await page.mouse.click(cx, cy - rowHeight);
    await expect(p).toHaveAttribute('aria-valuetext', 'AM');
    await expect(hour).toHaveAttribute('aria-valuetext', '7 AM');
    expect(await now(hour)).toBe(7);
    expect(await now(wheel(page, 't', 'minute'))).toBe(30);
    await expect(rows.nth(0)).toHaveClass(/on/);
    await expect.poll(async () => Math.round((await bounds(rows.nth(0))).y)).toBe(Math.round(ground.y));
    // A press on the empty row above its first name moves nothing.
    await page.mouse.click(cx, cy - rowHeight);
    await page.waitForTimeout(350);
    await expect(p).toHaveAttribute('aria-valuetext', 'AM');
    // A drag past its last name: the rows follow the pointer and stop there — PM on the middle row, however far it goes.
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy - 0.5 * rowHeight, { steps: 3 });
    expect((await bounds(rows.nth(1))).y - ground.y).toBeCloseTo(0.5 * rowHeight, 0);
    await page.mouse.move(cx, cy - 4 * rowHeight, { steps: 4 });
    expect((await bounds(rows.nth(1))).y).toBeCloseTo(ground.y, 0);
    await page.waitForTimeout(150);
    await page.mouse.up();
    await expect(p).toHaveAttribute('aria-valuetext', 'PM');
    await expect(hour).toHaveAttribute('aria-valuetext', '7 PM');
    // A drag the other way, released a little way: it settles back on the nearer name.
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy + 0.3 * rowHeight, { steps: 3 });
    await page.waitForTimeout(150);
    await page.mouse.up();
    await page.waitForTimeout(350);
    await expect(p).toHaveAttribute('aria-valuetext', 'PM');
    // A press on the middle row that ends without a drag settles the other name: the period begins no typed entry, and the
    // press begins none — no input, no input mode, nothing typing.
    await page.mouse.click(cx, cy);
    await expect(p).toHaveAttribute('aria-valuetext', 'AM');
    expect(await focused(page)).toBe('wheel:period');
    expect(await p.evaluate((el) => [el.localName, el.getAttribute('inputmode'), (el as HTMLElement).isContentEditable])).toEqual(['div', null, false]);
    await expect(host(page, 't').locator('.wheel.typing')).toHaveCount(0);
    await expect(box.locator('input')).toHaveCount(0);
    // A scroll moves the rows, to the last name at most; when it stops, the nearer name settles.
    await box.evaluate((el, r) => el.dispatchEvent(new WheelEvent('wheel', { deltaY: r * 3, bubbles: true, cancelable: true })), rowHeight);
    expect((await bounds(rows.nth(1))).y).toBeCloseTo(ground.y, 0);
    await expect(p).toHaveAttribute('aria-valuetext', 'PM');
    // No hover and no press state: the selection container keeps its color, and nothing is marked pressed.
    const resting = await resolveColor(page, T('wheel-selection-container-color'));
    await page.waitForTimeout(350);
    await box.hover();
    await page.mouse.down();
    expect(await css(box.locator('.ground'), 'background-color')).toBe(resting);
    expect(await box.getAttribute('data-pressed')).toBeNull();
    await page.mouse.move(cx, cy - 20);
    await page.mouse.up();
    await page.waitForTimeout(350);
    // Where the locale writes the period first (ja-JP): before the hour wheel, the same gap away, in its names.
    await mount(page, [opened('ja', { mode: 'time', value: '07:30', hourCycle: 'h12', locale: 'ja-JP' }), opened('b', { mode: 'time', value: '19:30', hourCycle: 'h23' })]);
    const [jp, jh] = [await bounds(periodBox(page, 'ja')), await bounds(wheelBox(page, 'ja', 'hour'))];
    expect(jh.x - (jp.x + jp.width)).toBeCloseTo(await resolveToken(page, T('period-gap')), 0);
    await expect(periodBox(page, 'ja').locator('.row')).toHaveText(['午前', '午後']);
    await expect(periodBox(page, 'b')).toHaveCount(0);
    // Reduced motion: it settles at once.
    await mount(page, [opened('ja', { mode: 'time', value: '07:30', hourCycle: 'h12', locale: 'ja-JP' })]);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const j = await bounds(periodBox(page, 'ja'));
    await page.mouse.click(j.x + j.width / 2, j.y + j.height / 2 + rowHeight);
    expect(await period(page, 'ja').getAttribute('aria-valuetext')).toBe('午後');
  });

  test('DTM-47: the period is one spin button named periodLabel with two values, the one before noon first — Up and Down change it (Right and Left too on the period selector, not on the period wheel), Home is before noon and End after, Enter and Space change it, the first letter of a period’s name sets that period (A, P; under ja-JP, where both begin with 午, it changes it), any other letter and a digit are ignored; one Tab stop where it is drawn — after the minute’s, before the hour’s under ja-JP; keyboard focus rings the selector or the wheel’s selection container; a change keeps the hour’s number and the minute, leaves the handle, changes the hour’s exposed value, sets the selected end of a range and commits nothing', async ({ page }) => {
    await mount(page, [modal('w', { mode: 'time', value: '07:30', hourCycle: 'h12', periodLabel: 'Half of the day' }), modal('d', { mode: 'time', value: '07:30', hourCycle: 'h12', entryMode: 'dial' })]);
    const spin = (locator: Locator) => locator.evaluate((el) => ['role', 'aria-label', 'aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext'].map((name) => el.getAttribute(name)));
    // The period wheel.
    await open(page, 'w');
    expect(await focused(page)).toBe('wheel:hour');
    const p = period(page, 'w');
    expect(await spin(p)).toEqual(['spinbutton', 'Half of the day', '0', '1', '0', 'AM']);
    // One Tab stop, after the minute's; one focusable control in the wheel.
    await tab(page);
    expect(await focused(page)).toBe('wheel:minute');
    await tab(page);
    expect(await focused(page)).toBe('wheel:period');
    expect(await periodBox(page, 'w').evaluate((el) => [...el.querySelectorAll('*')].filter((n) => (n as HTMLElement).tabIndex >= 0).length)).toBe(1);
    // Keyboard focus rings the wheel's selection container; taking focus changed nothing.
    const ring = periodBox(page, 'w').locator('.ring');
    await expect.poll(() => css(ring, 'outline-style')).toBe('solid');
    expect(await css(ring, 'transition-property')).not.toContain('outline');
    const [r, g] = [await bounds(ring), await bounds(periodBox(page, 'w').locator('.ground'))];
    expect([r.x, r.y, r.width, r.height].map(Math.round)).toEqual([g.x, g.y, g.width, g.height].map(Math.round));
    await expect(p).toHaveAttribute('aria-valuetext', 'AM');
    const hour = wheel(page, 'w', 'hour');
    const reads = async () => [await p.getAttribute('aria-valuenow'), await p.getAttribute('aria-valuetext'), await hour.getAttribute('aria-valuetext'), await wheel(page, 'w', 'minute').getAttribute('aria-valuenow')];
    for (const [key, expected] of [
      ['ArrowDown', ['1', 'PM', '7 PM', '30']],
      ['ArrowDown', ['0', 'AM', '7 AM', '30']],
      ['ArrowUp', ['1', 'PM', '7 PM', '30']],
      ['Home', ['0', 'AM', '7 AM', '30']],
      ['Home', ['0', 'AM', '7 AM', '30']],
      ['End', ['1', 'PM', '7 PM', '30']],
      ['End', ['1', 'PM', '7 PM', '30']],
      ['Enter', ['0', 'AM', '7 AM', '30']],
      ['Space', ['1', 'PM', '7 PM', '30']],
      // Right and Left are not the period wheel's; a digit and a letter that begins neither name are ignored.
      ['ArrowRight', ['1', 'PM', '7 PM', '30']],
      ['ArrowLeft', ['1', 'PM', '7 PM', '30']],
      ['x', ['1', 'PM', '7 PM', '30']],
      ['1', ['1', 'PM', '7 PM', '30']],
      // The first letter of a period's name, in either case, sets that period.
      ['a', ['0', 'AM', '7 AM', '30']],
      ['a', ['0', 'AM', '7 AM', '30']],
      ['Shift+P', ['1', 'PM', '7 PM', '30']],
      ['p', ['1', 'PM', '7 PM', '30']],
    ] as const) {
      await page.keyboard.press(key);
      await expect.poll(reads, key).toEqual(expected);
    }
    await expect(host(page, 'w').locator('.wheel.typing')).toHaveCount(0);
    // The rows follow: PM is on the middle row.
    await expect(periodBox(page, 'w').locator('.row.on')).toHaveText('PM');
    // Nothing is committed by itself; OK commits 19:30.
    expect(await log(page)).toEqual([]);
    await action(page, 'w', 'confirm').click();
    expect(await log(page)).toEqual(['change:{"value":"19:30","start":"","end":""}:19:30||', 'close:confirm']);
    await expect.poll(() => isOpen(page, 'w')).toBe(false);
    // The period selector.
    await open(page, 'd');
    expect(await focused(page)).toBe('selector:hour');
    const s = period(page, 'd');
    expect(await spin(s)).toEqual(['spinbutton', 'Period', '0', '1', '0', 'AM']);
    await tab(page);
    expect(await focused(page)).toBe('selector:minute');
    await tab(page);
    expect(await focused(page)).toBe('selector:period');
    await expect.poll(() => css(s, 'outline-style')).toBe('solid');
    expect(await css(s, 'transition-property')).not.toContain('outline');
    // The handle stays where it is while the period changes (the dial shows the minutes: the selector focused before).
    const angle = () => host(page, 'd').locator('.dial').evaluate((el) => (el as HTMLElement).style.getPropertyValue('--_angle'));
    const before = await angle();
    const dialHour = selector(page, 'd', 'hour');
    const dialReads = async () => [await s.getAttribute('aria-valuenow'), await s.getAttribute('aria-valuetext'), await dialHour.getAttribute('aria-valuetext'), await selector(page, 'd', 'minute').getAttribute('aria-valuenow')];
    for (const [key, expected] of [
      ['ArrowDown', ['1', 'PM', '7 PM', '30']],
      ['ArrowUp', ['0', 'AM', '7 AM', '30']],
      ['ArrowRight', ['1', 'PM', '7 PM', '30']],
      ['ArrowLeft', ['0', 'AM', '7 AM', '30']],
      ['End', ['1', 'PM', '7 PM', '30']],
      ['Home', ['0', 'AM', '7 AM', '30']],
      ['Enter', ['1', 'PM', '7 PM', '30']],
      ['Space', ['0', 'AM', '7 AM', '30']],
      ['q', ['0', 'AM', '7 AM', '30']],
      ['2', ['0', 'AM', '7 AM', '30']],
      ['p', ['1', 'PM', '7 PM', '30']],
      ['A', ['0', 'AM', '7 AM', '30']],
    ] as const) {
      await page.keyboard.press(key);
      await expect.poll(dialReads, key).toEqual(expected);
    }
    expect(await angle()).toBe(before);
    await expect(selector(page, 'd', 'minute')).toHaveClass(/selected/);
    expect(await focused(page)).toBe('selector:period');
    await page.keyboard.press('Escape');
    // Under ja-JP the period stands before the hour: its Tab stop is before the hour's, in both modes — and focus still opens on the hour.
    await mount(page, [modal('jw', { mode: 'time', value: '07:30', hourCycle: 'h12', locale: 'ja-JP' }), modal('jd', { mode: 'time', value: '07:30', hourCycle: 'h12', locale: 'ja-JP', entryMode: 'dial' })]);
    await open(page, 'jw');
    expect(await focused(page)).toBe('wheel:hour');
    await tab(page, { back: true });
    expect(await focused(page)).toBe('wheel:period');
    await tab(page);
    expect(await focused(page)).toBe('wheel:hour');
    // Both names begin with 午: typed, it changes the period.
    await tab(page, { back: true });
    const jp = period(page, 'jw');
    await expect(jp).toHaveAttribute('aria-valuetext', '午前');
    // (No key of the test browser's keyboard layout types 午: a keydown whose key is that character stands for it.)
    const typeKey = (key: string) => jp.evaluate((el, k) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, composed: true, cancelable: true })), key);
    await typeKey('午');
    await expect(jp).toHaveAttribute('aria-valuetext', '午後');
    await typeKey('午');
    await expect(jp).toHaveAttribute('aria-valuetext', '午前');
    await typeKey('後');
    await expect(jp, 'a character that begins neither name').toHaveAttribute('aria-valuetext', '午前');
    await page.keyboard.press('Escape');
    await expect.poll(() => isOpen(page, 'jw')).toBe(false);
    await open(page, 'jd');
    expect(await focused(page)).toBe('selector:hour');
    await tab(page, { back: true });
    expect(await focused(page)).toBe('selector:period');
    await tab(page);
    expect(await focused(page)).toBe('selector:hour');
    // In a range the period sets the end whose range field is selected.
    await mount(page, [opened('r', { mode: 'time', range: true, start: '09:00', end: '17:30', hourCycle: 'h12' })]);
    await field(page, 'r', 'end').click();
    await expect(period(page, 'r')).toHaveAttribute('aria-valuetext', 'PM');
    await period(page, 'r').focus();
    await page.keyboard.press('Home');
    await expect(field(page, 'r', 'end')).toHaveText(/5:30 AM/);
    await expect(field(page, 'r', 'start')).toHaveText('9:00 AM');
  });

  test('DTM-28, DTM-15: a range field focused by a press shows no ring, and a key that works it then — Space, Enter — makes its focus keyboard focus: the ring is around the field, in every engine, until focus leaves it; the other field, reached by Tab, shows it too', async ({ page }) => {
    await mount(page, [modal('r', { mode: 'time', range: true, start: '09:00', end: '17:30', hourCycle: 'h12' })]);
    await open(page, 'r');
    const [start, end] = [field(page, 'r', 'start'), field(page, 'r', 'end')];
    const ring = (locator: Locator) => css(locator, 'outline-style');
    // A press: focus where the engine gives a pressed button focus, and no ring in any.
    await end.click();
    await expect(end).toHaveClass(/selected/);
    expect(await ring(end), 'no ring after a press').toBe('none');
    // A key that works the field: its focus is keyboard focus from then on. (An engine that gives a pressed button no
    // focus is given it by the picker's own script here, as a product's script may.)
    await end.evaluate((el) => (el as HTMLElement).focus());
    expect(await ring(end), 'no ring after focus by a script that followed a press').toBe('none');
    await page.keyboard.press('Space');
    await expect(end).toHaveClass(/selected/);
    expect(await ring(end), 'the ring after a key').toBe('solid');
    // Focus leaves and comes back by a press: no ring again.
    await start.click();
    expect(await ring(end)).toBe('none');
    expect(await ring(start), 'no ring after a press').toBe('none');
    await start.evaluate((el) => (el as HTMLElement).focus());
    await page.keyboard.press('Enter');
    expect(await ring(start), 'the ring after Enter').toBe('solid');
    // Tab to the other: keyboard focus.
    await tab(page);
    await expect(end).toBeFocused();
    expect(await ring(end)).toBe('solid');
    expect(await ring(start)).toBe('none');
  });
  test('DTM-47, DTM-20: the period focused by a press shows no ring, and a key that works it then makes its focus keyboard focus — the ring around the period wheel’s selection container, or around the period selector — until focus leaves it; a key it ignores shows none', async ({ page }) => {
    await mount(page, [opened('w', { mode: 'time', value: '07:30', hourCycle: 'h12' })]);
    // The period wheel: a press on the other name's row focuses its control and settles it, with no ring.
    const ring = periodBox(page, 'w').locator('.ring');
    const box = await bounds(periodBox(page, 'w'));
    const row = await resolveToken(page, T('wheel-row-height'));
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2 + row);
    await expect(period(page, 'w')).toHaveAttribute('aria-valuetext', 'PM');
    expect(await focused(page)).toBe('wheel:period');
    expect(await css(ring, 'outline-style')).toBe('none');
    // A digit is not the period's: it is ignored, and shows no ring.
    await page.keyboard.press('1');
    expect(await css(ring, 'outline-style')).toBe('none');
    await page.keyboard.press('ArrowDown');
    await expect(period(page, 'w')).toHaveAttribute('aria-valuetext', 'AM');
    await expect.poll(() => css(ring, 'outline-style')).toBe('solid');
    expect(await css(ring, 'outline-color')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    expect(await focused(page)).toBe('wheel:period');
    // Focus leaves and comes back by a press: no ring again.
    await wheelBox(page, 'w', 'hour').click();
    expect(await css(ring, 'outline-style')).toBe('none');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2 + row);
    await expect(period(page, 'w')).toHaveAttribute('aria-valuetext', 'PM');
    expect(await css(ring, 'outline-style')).toBe('none');
    // The period selector, the same.
    await mount(page, [opened('d', { mode: 'time', value: '07:30', hourCycle: 'h12', entryMode: 'dial' })]);
    const s = period(page, 'd');
    await s.click();
    await expect(s).toHaveAttribute('aria-valuetext', 'PM');
    expect(await focused(page)).toBe('selector:period');
    expect(await css(s, 'outline-style')).toBe('none');
    await page.keyboard.press('2');
    expect(await css(s, 'outline-style')).toBe('none');
    await page.keyboard.press('ArrowDown');
    await expect(s).toHaveAttribute('aria-valuetext', 'AM');
    await expect.poll(() => css(s, 'outline-style')).toBe('solid');
    expect(await css(s, 'outline-color')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    await selector(page, 'd', 'hour').click();
    expect(await css(s, 'outline-style')).toBe('none');
    await s.click();
    expect(await css(s, 'outline-style')).toBe('none');
  });

  test('DTM-19, DTM-25: a press that may become a drag selects no text — the wheels, the separator, the selectors, the dial and the range display are kept from text selection in every engine (Safari reads the prefixed property only), and a wheel’s input still takes a typed entry', async ({ page }) => {
    // One modal picker at a time: a second one would make the first inert.
    await mount(page, [opened('d', { mode: 'time', value: '07:30', hourCycle: 'h12', entryMode: 'dial' })]);
    const kept = (locator: Locator) => locator.first().evaluate((el) => ((style) => (style as any).webkitUserSelect || style.userSelect)(getComputedStyle(el)));
    for (const part of ['.time > .display .selector[data-unit="hour"]', '.time > .display .selector.period', '.time > .display .separator', '.dial']) expect(await kept(host(page, 'd').locator(part)), part).toBe('none');
    await mount(page, [opened('w', { mode: 'time', range: true, start: '09:00', end: '17:30', hourCycle: 'h12' })]);
    for (const part of ['.time > .wheels .wheel[data-unit="hour"]', '.time > .wheels .wheel.period', '.time > .wheels .separator', '.range-field', '.range-separator']) expect(await kept(host(page, 'w').locator(part)), part).toBe('none');
    // A drag across the wheels leaves nothing selected.
    const box = await bounds(wheelBox(page, 'w', 'hour'));
    await page.mouse.move(box.x + box.width / 2, box.y + 4);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width + 60, box.y + box.height - 4, { steps: 6 });
    await page.mouse.up();
    expect(await page.evaluate(() => String(getSelection()))).toBe('');
    // The input is not kept from text: a digit typed into the hour wheel is read (DTM-43).
    await wheel(page, 'w', 'hour').focus();
    await page.keyboard.press('1');
    await expect(host(page, 'w').locator('.wheel[data-unit="hour"].typing')).toHaveCount(1);
    await page.keyboard.press('Enter');
    await expect(wheel(page, 'w', 'hour')).toHaveAttribute('aria-valuetext', /^1 /);
  });

  test('DTM-21: in the dial mode the hour selector, the separator and the minute selector, selector.gap apart, left to right, each at least its size in its condition’s tokens; the hour as the clock writes it, the minute in two digits; with the 12-hour clock the period selector stands in the same row', async ({ page }) => {
    await mount(page, [opened('a', { mode: 'time', value: '07:05', hourCycle: 'h12', entryMode: 'dial' }), opened('b', { mode: 'time', value: '07:05', hourCycle: 'h23', entryMode: 'dial' })]);
    await expect(selector(page, 'a', 'hour')).toHaveText('7');
    await expect(selector(page, 'b', 'hour')).toHaveText('07');
    await expect(selector(page, 'a', 'minute')).toHaveText('05');
    const [h, m] = [await bounds(selector(page, 'a', 'hour')), await bounds(selector(page, 'a', 'minute'))];
    expect(h.width).toBeGreaterThanOrEqual((await resolveToken(page, T('selector-container-width'))) - 0.5);
    expect(h.height).toBeGreaterThanOrEqual((await resolveToken(page, T('selector-container-height'))) - 0.5);
    expect(h.x).toBeLessThan(m.x);
    const sep = await bounds(host(page, 'a').locator('.time > .display .separator'));
    expect(sep.x - (h.x + h.width)).toBeCloseTo(await resolveToken(page, T('selector-gap')), 0);
    await expect(selector(page, 'a', 'hour')).toHaveClass(/selected/);
    expect(await css(selector(page, 'a', 'hour'), 'background-color')).toBe(await resolveColor(page, T('selected-selector-container-color')));
    expect(await css(selector(page, 'a', 'minute'), 'background-color')).toBe(await resolveColor(page, T('unselected-selector-container-color')));
    expect(await px(selector(page, 'a', 'hour'), 'font-size')).toBe(await resolveToken(page, T('selector-label-typescale-font-size')));
    // The period selector in the same row (DTM-14), after the minute; none with the 24-hour clock.
    const period12 = await bounds(period(page, 'a'));
    expect(period12.x).toBeGreaterThan(m.x + m.width);
    expect(period12.y).toBeCloseTo(m.y, 0);
    expect(period12.height).toBeCloseTo(m.height, 0);
    await expect(period(page, 'b')).toHaveCount(0);
  });

  test('DTM-22: each selector is a spin button — Up and Right the next value, Down and Left the previous, Page Up/Down five minutes, Home and End — and focusing or pressing one shows its unit on the dial', async ({ page }) => {
    await mount(page, [opened('a', { mode: 'time', value: '07:30', hourCycle: 'h12', entryMode: 'dial' })]);
    const m = selector(page, 'a', 'minute');
    await expect(m).toHaveAttribute('role', 'spinbutton');
    await m.focus();
    await expect(m).toHaveClass(/selected/);
    await expect(host(page, 'a').locator('.face .numbers.minutes')).not.toHaveClass(/faded/);
    await press(page, ['ArrowRight', 'ArrowUp']);
    await expect(m).toHaveAttribute('aria-valuenow', '32');
    await press(page, ['ArrowLeft', 'PageDown']);
    await expect(m).toHaveAttribute('aria-valuenow', '26');
    await press(page, ['End']);
    await expect(m).toHaveAttribute('aria-valuenow', '59');
    const h = selector(page, 'a', 'hour');
    await h.click();
    await expect(h).toHaveClass(/selected/);
    await press(page, ['ArrowDown']);
    await expect(h).toHaveAttribute('aria-valuetext', '6 AM');
  });

  test('DTM-23: the dial — a circle of dial.container.size in its color — holds the numbers clockwise from the top: 12 and 1–11, or two rings for 24 hours, the minutes every five or every step; on the rings the tokens set', async ({ page }) => {
    await mount(page, [
      opened('a', { mode: 'time', value: '07:30', hourCycle: 'h12', entryMode: 'dial' }),
      opened('b', { mode: 'time', value: '19:30', hourCycle: 'h23', entryMode: 'dial' }),
      opened('c', { mode: 'time', value: '07:20', hourCycle: 'h12', entryMode: 'dial', unit: 'minute', minuteStep: 10 }),
    ], { window: { width: 480, height: 2400 } });
    const dial = host(page, 'a').locator('.dial');
    const size = await resolveToken(page, T('dial-container-size'));
    expect((await bounds(dial)).width).toBeCloseTo(size, 0);
    expect(await css(dial, 'background-color')).toBe(await resolveColor(page, T('dial-container-color')));
    await expect(host(page, 'a').locator('.face .hours .number')).toHaveText(['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']);
    const d = await bounds(dial);
    const twelve = await bounds(host(page, 'a').locator('.face .hours .number').first());
    const radius = size / 2 - (await resolveToken(page, T('dial-padding'))) - (await resolveToken(page, T('dial-handle-size'))) / 2;
    expect(d.y + d.height / 2 - (twelve.y + twelve.height / 2)).toBeCloseTo(radius, 0);
    await expect(host(page, 'b').locator('.face .hours .inner')).toHaveCount(12);
    await expect(host(page, 'b').locator('.face .hours .inner').first()).toHaveText('12');
    await expect(host(page, 'c').locator('.face .minutes .number')).toHaveText(['00', '10', '20', '30', '40', '50']);
    await expect(host(page, 'a').locator('.face .minutes .number')).toHaveCount(12);
  });

  test('DTM-24: the handle — dial.handle.size in its color — sits over the pending value, joined to the centre by the track, a centre dot; a minute between the numbers holds a dot', async ({ page }) => {
    await mount(page, [opened('a', { mode: 'time', value: '07:32', hourCycle: 'h12', entryMode: 'dial', unit: 'minute' })]);
    const handle = host(page, 'a').locator('.handle');
    expect(await handle.evaluate((el) => (el as HTMLElement).offsetWidth)).toBeCloseTo(await resolveToken(page, T('dial-handle-size')), 0);
    expect(await css(handle, 'background-color')).toBe(await resolveColor(page, T('dial-handle-color')));
    expect(await css(host(page, 'a').locator('.track'), 'background-color')).toBe(await resolveColor(page, T('dial-track-color')));
    expect(await host(page, 'a').locator('.center').evaluate((el) => (el as HTMLElement).offsetWidth)).toBeCloseTo(await resolveToken(page, T('dial-center-size')), 0);
    await expect(handle.locator('.between')).toHaveCount(1);
    expect(await host(page, 'a').locator('.dial').evaluate((el) => el.style.getPropertyValue('--_angle'))).toBe('192deg');
  });

  test('DTM-25: a press or drag on the dial moves the handle at once to the nearest value (the nearer ring for 24 hours, a minute of the step); a press on the hour dial ends on the minute dial, focus moved there from the hour selector; the dial is hidden', async ({ page }) => {
    await mount(page, [inline('a', { mode: 'time', value: '07:30', hourCycle: 'h12', entryMode: 'dial' }), inline('b', { mode: 'time', value: '07:30', hourCycle: 'h23', entryMode: 'dial' })], { window: { width: 480, height: 1600 } });
    const dial = host(page, 'a').locator('.dial');
    await expect(dial).toHaveAttribute('aria-hidden', 'true');
    await selector(page, 'a', 'hour').focus();
    const d = await bounds(dial);
    await page.mouse.click(d.x + d.width - 20, d.y + d.height / 2);
    await expect(selector(page, 'a', 'hour')).toHaveAttribute('aria-valuenow', '3');
    await expect(selector(page, 'a', 'minute')).toHaveClass(/selected/);
    await expect.poll(() => focused(page)).toBe('selector:minute');
    await page.mouse.click(d.x + d.width / 2, d.y + d.height - 20);
    await expect(selector(page, 'a', 'minute')).toHaveAttribute('aria-valuenow', '30');
    // The inner ring of the 24-hour dial.
    const e = await bounds(host(page, 'b').locator('.dial'));
    const inner = await bounds(host(page, 'b').locator('.face .hours .inner').nth(3));
    await page.mouse.click(inner.x + inner.width / 2, inner.y + inner.height / 2);
    await expect(selector(page, 'b', 'hour')).toHaveAttribute('aria-valuenow', '15');
    expect(e.width).toBeGreaterThan(0);
  });

  test('DTM-26: the numbers cross-fade and the handle moves along the shorter arc over the dial motion; a press moves it at once; at once where reduced', async ({ page }) => {
    await mount(page, [opened('a', { mode: 'time', value: '11:30', hourCycle: 'h12', entryMode: 'dial' })]);
    await page.waitForTimeout(100);
    const arm = host(page, 'a').locator('.arm');
    expect(await css(arm, 'transition-duration')).toContain(`${(await resolveToken(page, T('motion-dial-duration'), 'duration')) / 1000}s`);
    expect(await css(host(page, 'a').locator('.numbers').first(), 'transition-duration')).toContain(`${(await resolveToken(page, T('motion-dial-duration'), 'duration')) / 1000}s`);
    await selector(page, 'a', 'hour').focus();
    await page.keyboard.press('ArrowUp');
    // 11 to 12: 330° to 360°, not back to 0°.
    expect(await host(page, 'a').locator('.dial').evaluate((el) => el.style.getPropertyValue('--_angle'))).toBe('360deg');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(arm, 'transition-duration')).toBe('0s');
  });
});

test.describe('states, press, corners and focus style', () => {
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await acmeSystemCss();
  });

  test('DTM-27: a selector paints its condition’s tokens of the hovered, focused and pressed states (acme values them apart), pressed over focused over hovered; pointer focus is not the focused state', async ({ page }) => {
    await mount(page, [opened('a', { mode: 'time', value: '07:30', hourCycle: 'h12', entryMode: 'dial' })], { system: 'acme', systemCss: await acmeSystemCss() });
    await override(page, { [T('motion-state-duration')]: '0ms' });
    const look = (condition: string, state: string) => resolveColor(page, T(`${condition}-${state}-selector-container-color`));
    const [hovered, focusedC, pressed] = await Promise.all([look('unselected', 'hovered'), look('unselected', 'focused'), look('unselected', 'pressed')]);
    expect(new Set([hovered, focusedC, pressed]).size).toBe(3);
    const m = selector(page, 'a', 'minute');
    await m.hover();
    await expect.poll(() => css(m, 'background-color')).toBe(hovered);
    await selector(page, 'a', 'hour').focus();
    await tab(page);
    await page.mouse.move(0, 0);
    // Focus by key shows the unit: the minute selector is now selected and focused.
    await expect.poll(() => css(m, 'background-color')).toBe(await look('selected', 'focused'));
    await selector(page, 'a', 'hour').hover();
    await page.mouse.down();
    await expect.poll(() => css(selector(page, 'a', 'hour'), 'background-color')).toBe(await look('selected', 'pressed'));
    await page.mouse.up();
  });

  test('DTM-28: keyboard focus shows the ring around a selector without animation; pointer focus shows none', async ({ page }) => {
    await mount(page, [opened('a', { mode: 'time', value: '07:30', hourCycle: 'h12', entryMode: 'dial' })]);
    await selector(page, 'a', 'minute').click();
    expect(await css(selector(page, 'a', 'minute'), 'outline-style')).toBe('none');
    await tab(page, { back: true });
    await expect.poll(() => css(selector(page, 'a', 'hour'), 'outline-style')).toBe('solid');
    expect(await css(selector(page, 'a', 'hour'), 'transition-property')).not.toContain('outline');
  });

  test('DTM-29: a selector’s press — a click, Enter, Space — shows at once and for at least press-hold', async ({ page }) => {
    const hold = 1000;
    for (const [name, activate] of [
      ['click', (p: P) => selector(p, 'a', 'minute').click()],
      ['Enter', (p: P) => p.keyboard.press('Enter')],
    ] as const) {
      await mount(page, [opened('a', { mode: 'time', value: '07:30', entryMode: 'dial', unit: 'minute' })]);
      await override(page, { '--tanrei-sys-motion-duration-press-hold': `${hold}ms` });
      await selector(page, 'a', 'minute').focus();
      await selector(page, 'a', 'minute').evaluate((el) => {
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
  });

  test('DTM-30: overlay (default), ripple (m3-like), dim (cupertino) and none each answer a selector’s press', async ({ page }) => {
    const pressed = async (system?: string, feedback?: string) => {
      await mount(page, [opened('a', { mode: 'time', value: '07:30', entryMode: 'dial' })], system ? { system } : {});
      // Cupertino offers the wheels alone: the selectors are observed with both modes offered.
      await override(page, { [T('time-entry-modes')]: 'both' });
      if (feedback) await override(page, { '--tanrei-sys-behavior-pressed-feedback': feedback });
      await override(page, { [T('motion-state-duration')]: '0ms' });
      const m = selector(page, 'a', 'minute');
      await m.hover();
      await page.mouse.down();
      const result = { pressed: await m.getAttribute('data-pressed'), ripple: await m.locator('.ripple').count(), opacity: await css(m, 'opacity') };
      await page.mouse.up();
      return result;
    };
    expect(await pressed()).toMatchObject({ pressed: 'overlay', ripple: 0 });
    expect(await pressed('m3-like')).toMatchObject({ pressed: 'ripple', ripple: 1 });
    const dim = await pressed('cupertino');
    expect(dim).toMatchObject({ pressed: 'dim', ripple: 0 });
    expect(dim.opacity).toBe(await token(page, T('pressed-opacity')));
    expect(await pressed(undefined, 'none')).toMatchObject({ pressed: 'none', ripple: 0 });
  });

  test('DTM-31: cupertino eases the selectors’, the range fields’ and the wheels’ selection containers’ corners; acme shows a selector’s, a range field’s and a wheel’s focus as a glow', async ({ page }) => {
    await mount(page, [opened('a', { mode: 'time', value: '07:30', entryMode: 'dial' })], { system: 'cupertino' });
    expect(await token(page, '--tanrei-sys-shape-corner-smoothing')).toBe('0.6');
    if (await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'))) {
      expect(await css(host(page, 'a').locator('.surface'), 'corner-top-left-shape')).toContain('superellipse');
    }
    // Every rounded box carries the shared shape rule's mark: the selectors, the range fields, the wheels' containers.
    await mount(page, [inline('d', { mode: 'time', range: true, start: '09:00', end: '17:30', entryMode: 'dial' })], { system: 'cupertino' });
    await override(page, { [T('time-entry-modes')]: 'both' });
    for (const part of ['.selector', '.range-field']) await expect(host(page, 'd').locator(part).first()).toHaveAttribute('data-tanrei-shape', '');
    await mount(page, [inline('c', { mode: 'time', value: '07:30' })], { system: 'cupertino' });
    for (const part of ['.wheels > .band', '.wheel > .ground']) await expect(host(page, 'c').locator(part).first()).toHaveAttribute('data-tanrei-shape', '');
    await mount(page, [inline('a', { mode: 'time', range: true, start: '09:00', end: '17:30', entryMode: 'dial' }), inline('w', { mode: 'time', value: '07:30' })], { system: 'acme', systemCss: await acmeSystemCss() });
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('glow');
    await selector(page, 'a', 'hour').focus();
    await tab(page);
    await expect.poll(() => css(selector(page, 'a', 'minute'), 'outline-color')).toBe('rgba(0, 0, 0, 0)');
    await expect(selector(page, 'a', 'minute')).toHaveAttribute('data-focus-style', 'glow');
    await field(page, 'a', 'start').focus();
    await tab(page);
    expect(await focused(page)).toBe('field:end');
    await expect.poll(() => css(field(page, 'a', 'end'), 'outline-color')).toBe('rgba(0, 0, 0, 0)');
    await expect(field(page, 'a', 'end')).toHaveAttribute('data-focus-style', 'glow');
    await wheel(page, 'w', 'hour').focus();
    await page.keyboard.press('ArrowUp');
    await expect(wheel(page, 'w', 'hour')).toHaveAttribute('data-focus-style', 'glow');
  });

  test('DTM-32: selectors and range fields are at least the target in each dimension, a wheel’s rows at least the target tall', async ({ page }) => {
    await mount(page, [opened('a', { mode: 'time', range: true, start: '09:00', end: '17:30', entryMode: 'dial' }), opened('w', { mode: 'time', value: '07:30' })]);
    await override(page, { [T('selector-container-width')]: '10px', [T('selector-container-height')]: '10px', [T('wheel-row-height')]: '10px', [T('range-field-container-height')]: '10px', [T('range-field-container-padding-inline')]: '0px', [T('range-field-label-typescale-font')]: '400 2px/1 sans-serif' });
    const target = await resolveToken(page, '--tanrei-sys-target-pointer');
    const s = await bounds(selector(page, 'a', 'hour'));
    expect(Math.min(s.width, s.height)).toBeGreaterThanOrEqual(target - 0.5);
    for (const end of ['start', 'end'] as const) {
      const f = await bounds(field(page, 'a', end));
      expect(Math.min(f.width, f.height), end).toBeGreaterThanOrEqual(target - 0.5);
    }
    expect((await bounds(host(page, 'w').locator('.wheel[data-unit="hour"] .row.on'))).height).toBeGreaterThanOrEqual(target - 0.5);
  });
});

test.describe('ranges, actions, motion, overflow and semantics', () => {
  test('DTM-33: an overnight time range says “next day” after the end’s time in its range field and its name, and commits as it is; a date-time range whose end is before its start — set by the wheels, and again by typed entries — shows the error line, announced once, as the end’s range field’s description, OK disabled', async ({ page }) => {
    await mount(page, [modal('n', { mode: 'time', range: true, start: '22:00', end: '06:00', hourCycle: 'h23' }), modal('dt', { mode: 'date-time', range: true, layout: 'horizontal', hourCycle: 'h23' })], { window: { width: 800, height: 640 } });
    await open(page, 'n');
    await expect(field(page, 'n', 'end')).toHaveText('06:00 next day');
    await expect(field(page, 'n', 'end')).toHaveAttribute('aria-label', 'End, 06:00 next day');
    await expect(field(page, 'n', 'start')).toHaveText('22:00');
    await action(page, 'n', 'confirm').click();
    expect(await log(page)).toEqual(['close:confirm']);
    await open(page, 'dt');
    await day(page, 'dt', '2026-09-10').click();
    await day(page, 'dt', '2026-09-10').click();
    // The start to 17:00 and the end to 09:00, by the wheels.
    await field(page, 'dt', 'start').click();
    await wheel(page, 'dt', 'hour').focus();
    await page.keyboard.press('Home');
    for (let i = 0; i < 17; i++) await page.keyboard.press('ArrowUp');
    await wheel(page, 'dt', 'minute').focus();
    await page.keyboard.press('Home');
    await field(page, 'dt', 'end').click();
    await wheel(page, 'dt', 'hour').focus();
    await page.keyboard.press('Home');
    for (let i = 0; i < 9; i++) await page.keyboard.press('ArrowUp');
    await wheel(page, 'dt', 'minute').focus();
    await page.keyboard.press('Home');
    await expect(field(page, 'dt', 'start')).toHaveText('17:00');
    await expect(field(page, 'dt', 'end')).toHaveText('09:00');
    const error = host(page, 'dt').locator('.error');
    const said = host(page, 'dt').locator('.surface > .announce');
    const shown = async () => {
      await expect(error).toHaveText('End must be after start');
      expect(await css(error, 'color')).toBe(await resolveColor(page, T('error-color')));
      expect(await px(error, 'font-size')).toBe(await resolveToken(page, T('error-typescale-font-size')));
      await expect(said).toHaveText('End must be after start');
      await expect(field(page, 'dt', 'end')).toHaveAttribute('aria-describedby', 'range-error');
      await expect(field(page, 'dt', 'start')).not.toHaveAttribute('aria-describedby', /./);
      await expect(error).toHaveAttribute('id', 'range-error');
      expect(await action(page, 'dt', 'confirm').evaluate((el: any) => el.disabled)).toBe(true);
    };
    await shown();
    // The end no longer before the start: the line goes.
    await wheel(page, 'dt', 'hour').focus();
    await page.keyboard.press('End');
    await expect(error).toHaveCount(0);
    await expect(field(page, 'dt', 'end')).not.toHaveAttribute('aria-describedby', /./);
    expect(await action(page, 'dt', 'confirm').evaluate((el: any) => el.disabled)).toBe(false);
    // Again by typed entries: 09:00 typed into the end's wheels.
    await page.keyboard.type('0900');
    await page.keyboard.press('Enter');
    await expect(field(page, 'dt', 'end')).toHaveText('09:00');
    await shown();
  });

  test('DTM-34: Cancel and OK are medium Buttons of actions.variant, Cancel first in a row they share (fill), OK on top when they stack; end and text under a fixture system; Cancel closes with cancel', async ({ page }) => {
    await mount(page, [opened('d', { value: '2026-09-17' })]);
    const [c, o] = [action(page, 'd', 'cancel'), action(page, 'd', 'confirm')];
    await expect(c).toHaveAttribute('variant', 'tonal');
    await expect(c).toHaveAttribute('size', 'medium');
    const [cb, ob] = [await bounds(c), await bounds(o)];
    expect(cb.x).toBeLessThan(ob.x);
    expect(cb.width).toBeCloseTo(ob.width, 0);
    expect(ob.x - (cb.x + cb.width)).toBeCloseTo(await resolveToken(page, T('actions-gap')), 0);
    const box = host(page, 'd').locator('.actions');
    expect(await px(box, 'padding-top')).toBe(await resolveToken(page, T('actions-padding-block')));
    // A label too long for its share: a column, OK on top.
    await host(page, 'd').evaluate((el: any) => (el.cancelLabel = 'Cancel and go back to where you were before'));
    await expect(box).toHaveClass(/stacked/);
    expect((await bounds(o)).y).toBeLessThan((await bounds(c)).y);
    // A fixture system: end (1) and text (4).
    await host(page, 'd').evaluate((el: any) => (el.cancelLabel = 'Cancel'));
    await override(page, { [T('actions-arrangement')]: 'end', [T('actions-variant')]: 'text' });
    await expect(c).toHaveAttribute('variant', 'text');
    await expect.poll(() => surface(page, 'd').getAttribute('data-arrangement')).toBe('end');
    const [c2, o2, s] = [await bounds(c), await bounds(o), await bounds(box)];
    expect(o2.x + o2.width).toBeCloseTo(s.x + s.width - (await px(box, 'padding-right')), 0);
    expect(c2.width).toBeLessThan(s.width / 2 - 20);
  });

  test('DTM-35, TAB-16, TAB-24: the tabs of a picker opened from closed — every mode with a time, modal and docked — draw one thumb while the surface still grows in and at rest, untouched: the entry-mode tabs — the picker’s only tabs — a circle', async ({ page }) => {
    const cases: [string, Fixture][] = [
      ['time', modal('t', { mode: 'time', value: '07:30', hourCycle: 'h12' })],
      ['time, the dial', modal('t', { mode: 'time', entryMode: 'dial', value: '19:30', hourCycle: 'h12' })],
      ['time range', modal('t', { mode: 'time', range: true, start: '09:00', end: '17:30', hourCycle: 'h12' })],
      ['date-time', modal('t', { mode: 'date-time', layout: 'horizontal', value: '2026-09-17T19:30', hourCycle: 'h12' })],
      ['date-time range', modal('t', { mode: 'date-time', range: true, layout: 'horizontal', start: '2026-09-10T09:00', end: '2026-09-16T17:00', hourCycle: 'h12' })],
      ['docked time', docked('t', { mode: 'time', value: '07:30', hourCycle: 'h12' })],
    ];
    for (const [name, fixture] of cases) {
      await mount(page, [fixture], { window: pickerWindow(fixture) });
      await override(page, { [T('modal-motion-open-duration')]: '600ms', [T('docked-motion-open-duration')]: '600ms' });
      const isModal = fixture.props.presentation === 'modal';
      // A modal picker is read in the middle of its open motion, whatever the machine: the surface's own transitions
      // are held a quarter of the way in as soon as the press has started them, and let go once the tabs have been
      // read. Held in the page, in the turn the dialog is shown in: WebKit on Linux spends 0.8 s in the picker's next
      // update (the first style of what the dialog shows — 20 ms on a Mac), still in that turn, and so is past the
      // 600 ms at the first moment after it — a later turn or a frame finds a surface that has grown in.
      if (isModal) {
        const held = await surface(page, 't').evaluate(async (el, button) => {
          document.querySelector<HTMLElement>(button)!.click();
          for (let turns = 0; turns < 300; turns++) {
            // (Asking for the animations resolves the style, which starts the transitions of a surface just shown.)
            const own = el.getAnimations();
            if (own.some((a) => a instanceof CSSTransition && a.transitionProperty === 'scale')) {
              for (const a of own) {
                a.pause();
                a.currentTime = Number(a.effect!.getComputedTiming().duration) / 4;
              }
              return true;
            }
            // First within this turn, between the element's updates; then turn by turn.
            await (turns < 100 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, 0)));
          }
          return false;
        }, '#open-t');
        expect(held, `${name}: the surface grows in`).toBe(true);
      } else await opener(page, 't').evaluate((el) => (el as HTMLElement).click());
      await expect.poll(() => isOpen(page, 't')).toBe(true);
      await expect.poll(() => tabsRow(page, 't', 'entry').count()).toBe(1);
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const check = async (when: string) => {
        await expectOneThumb(tabsRow(page, 't', 'entry'), 'circle', `${name}, entry, ${when}`);
      };
      // A modal picker is still growing in: its tabs are drawn smaller than they are laid out.
      if (isModal) expect((await readThumb(tabsRow(page, 't', 'entry')))[0].scale, name).toBeLessThan(0.9995);
      await check('opening');
      if (isModal) await surface(page, 't').evaluate((el) => el.getAnimations().forEach((a) => a.play()));
      await settle(page, 't');
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      expect((await readThumb(tabsRow(page, 't', 'entry')))[0].scale, name).toBeCloseTo(1, 3);
      await check('open');
    }
  });

  test('DTM-35: a modal picker fades and grows in over the open motion and fades out over the close motion; a docked one grows from its anchor’s edge; only a fade (modal) or nothing (docked) where reduced', async ({ page }) => {
    await mount(page, [modal('m', { value: '2026-09-17' }), docked('d', { value: '2026-09-17' })]);
    await open(page, 'm');
    const s = surface(page, 'm');
    expect(await css(s, 'transition-duration')).toContain(`${(await resolveToken(page, T('modal-motion-open-duration'), 'duration')) / 1000}s`);
    expect(await css(s, 'transition-property')).toContain('scale');
    await page.keyboard.press('Escape');
    await open(page, 'd');
    const animation = await surface(page, 'd').evaluate((el) => getComputedStyle(el).animationName);
    expect(animation).toBe('docked-open');
    await page.keyboard.press('Escape');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, 'm');
    expect(await css(s, 'transition-property')).not.toContain('scale');
    await page.keyboard.press('Escape');
    await open(page, 'd');
    expect(await surface(page, 'd').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  });

  test('DTM-35: a modal picker appears from where the appearance starts it — opacity 0 and scale 0.96 under the default system — about its centre over the open motion, and leaves the same way back over the close motion, its last frame leaving no more than the accelerating curve does; where reduced it only fades over sys.motion.role.reduced', async ({ page }) => {
    await mount(page, [modal('m', { value: '2026-09-17' })]);
    const s = surface(page, 'm');
    const drawn = (seen: Frames) => seen.motions.filter((motion) => motion.on.startsWith('dialog') && !motion.on.includes('::') && ['opacity', 'scale'].includes(motion.name));
    const opening = await sampleFrames(s, () => host(page, 'm').evaluate((el: any) => (el.open = true)), { probe: appearProbe });
    expectAppearStart(opening.frames[0]!, { opacity: 0, scale: 0.96 });
    expect(opening.rest.probe).toMatchObject({ opacity: 1, sx: 1, sy: 1, tx: 0, ty: 0, blur: 0 });
    expectNoFlicker(opening);
    for (const motion of drawn(opening)) {
      expect(motion.duration, motion.name).toBe(await resolveToken(page, T('modal-motion-open-duration'), 'duration'));
      expect(motion.easing, motion.name).toBe(await resolveEasing(page, T('modal-motion-open-easing')));
    }
    // (WebKit reports the scrim's fade as the surface's own — its pseudo-element unnamed — so the properties are counted once each.)
    expect([...new Set(drawn(opening).map((motion) => motion.name))].sort()).toEqual(['opacity', 'scale']);
    // Closed, it is drawn in the top layer until its exit has played, in every engine (MDL-7).
    const closing = await sampleFrames(s, () => host(page, 'm').evaluate((el: any) => (el.open = false)), { probe: appearProbe, elements: false });
    expect(closing.rest.probe).toMatchObject({ opacity: 0, sx: 0.96, sy: 0.96 });
    // (The exit is read from the probe alone: every element of a picker read in every frame is more than a slow machine
    // draws in time.)
    expect([...new Set(drawn(closing).map((motion) => motion.name))].sort()).toEqual(['opacity', 'scale']);
    const exit = await resolveEasing(page, T('modal-motion-close-easing'));
    for (const motion of drawn(closing)) {
      expect(motion.duration, motion.name).toBe(await resolveToken(page, T('modal-motion-close-duration'), 'duration'));
      expect(motion.easing, motion.name).toBe(exit);
    }
    expectExitEnd(closing, { duration: await resolveToken(page, T('modal-motion-close-duration'), 'duration'), easing: bezierOf(exit) });

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mount(page, [modal('m', { value: '2026-09-17' })]);
    const reduced = await resolveToken(page, '--tanrei-sys-motion-role-reduced', 'duration');
    const own = (seen: Frames) => seen.motions.filter((motion) => motion.on.startsWith('dialog') && !motion.on.includes('::') && !['display', 'overlay'].includes(motion.name)).map((motion) => [motion.name, motion.duration]);
    const fading = await sampleFrames(surface(page, 'm'), () => host(page, 'm').evaluate((el: any) => (el.open = true)), { probe: appearProbe, elements: false });
    expectAppearStart(fading.frames[0]!, { opacity: 0, scale: 1 });
    expect(own(fading)).toContainEqual(['opacity', reduced]);
    expect(own(fading).filter(([name]) => name !== 'opacity')).toEqual([]);
  });

  test('DTM-36: in a short window the header and the actions stay and the body scrolls between them; in a narrow one the picker is the window less the margins', async ({ page }) => {
    await mount(page, [opened('v', { mode: 'date-time', value: '2026-09-17T19:30', layout: 'vertical' })], { window: { width: 480, height: 560 } });
    const body = host(page, 'v').locator('.body');
    expect(await body.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    const [s, a] = [await bounds(surface(page, 'v')), await bounds(host(page, 'v').locator('.actions'))];
    expect(a.y + a.height).toBeLessThanOrEqual(s.y + s.height + 0.5);
    await page.setViewportSize({ width: 320, height: 720 });
    const margin = await resolveToken(page, T('modal-container-margin'));
    await expect.poll(async () => (await bounds(surface(page, 'v'))).width).toBeLessThanOrEqual(320 - 2 * margin + 0.5);
  });

  test('DTM-37: the surface is a (modal) dialog named by label; the entry-mode tabs a tab list with its panel; the period a spin button of two values, not a tab list; the range display a group of two buttons; wheels and selectors are spin buttons, a wheel staying one while a number is typed into it; the dial is hidden; a docked picker’s opener says it opens a dialog and whether it is open', async ({ page }) => {
    await mount(page, [opened('m', { mode: 'time', value: '07:30', label: 'Alarm' })]);
    const s = surface(page, 'm');
    expect(await s.evaluate((el) => el.localName)).toBe('dialog');
    await expect(s).toHaveAttribute('aria-label', 'Alarm');
    await expect(host(page, 'm').locator('#time-panel')).toHaveAttribute('role', 'tabpanel');
    await expect(host(page, 'm').locator('#time-panel')).toHaveAttribute('aria-labelledby', 'entry-wheels');
    await expect.poll(() => tabOf(page, 'm', 'entry-wheels').getAttribute('aria-controls')).toBe('time-panel');
    await expect(host(page, 'm').locator('.dial, .rows').first()).toHaveAttribute('aria-hidden', 'true');
    // One tab list and one panel: the entry mode's. The period is a spin button of two values named periodLabel.
    await expect(host(page, 'm').locator('tanrei-tabs')).toHaveCount(1);
    await expect(host(page, 'm').locator('[role="tabpanel"]')).toHaveCount(1);
    await expect(host(page, 'm').locator('#time-panel > .wheels')).toHaveCount(1);
    const spin = (locator: Locator) => locator.evaluate((el) => ['role', 'aria-label', 'aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext'].map((name) => el.getAttribute(name)));
    expect(await spin(period(page, 'm'))).toEqual(['spinbutton', 'Period', '0', '1', '0', 'AM']);
    // What the section measures the other mode with is hidden from assistive technology and takes no focus.
    await expect(host(page, 'm').locator('.other-mode')).toHaveAttribute('aria-hidden', 'true');
    expect(await host(page, 'm').locator('.other-mode').evaluate((el) => [...el.querySelectorAll('*')].filter((n) => (n as HTMLElement).tabIndex >= 0 || n.hasAttribute('role')).length)).toBe(0);
    // A wheel stays a spin button while a number is typed into it.
    await wheel(page, 'm', 'hour').focus();
    await page.keyboard.press('1');
    await expect(wheel(page, 'm', 'hour')).toHaveAttribute('role', 'spinbutton');
    await expect(wheel(page, 'm', 'hour')).toHaveAttribute('aria-valuetext', '7 AM');
    // The range display: a group named rangeLabel that holds its two range fields as buttons; the dial and its handle hidden.
    await mount(page, [opened('r', { mode: 'time', range: true, start: '09:00', end: '17:30', hourCycle: 'h12', entryMode: 'dial', rangeLabel: 'Hours' })]);
    const group = host(page, 'r').locator('[role="group"]');
    await expect(group).toHaveAttribute('aria-label', 'Hours');
    expect(await group.locator('button').evaluateAll((els) => els.map((el) => [el.getAttribute('aria-label'), el.getAttribute('aria-pressed')]))).toEqual([['Start, 9:00 AM', 'true'], ['End, 5:30 PM', 'false']]);
    await expect(host(page, 'r').locator('.dial')).toHaveAttribute('aria-hidden', 'true');
    await expect(selector(page, 'r', 'hour')).toHaveAttribute('role', 'spinbutton');
    await expect(period(page, 'r')).toHaveAttribute('role', 'spinbutton');
    await expect(period(page, 'r')).toHaveAttribute('aria-label', 'Period');
    await mount(page, [docked('d', { value: '2026-09-17' })]);
    const a = opener(page, 'd');
    await expect(a).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(a).toHaveAttribute('aria-expanded', 'false');
    await open(page, 'd');
    await expect(a).toHaveAttribute('aria-expanded', 'true');
    await expect(a).toHaveAttribute('aria-controls', (await host(page, 'd').getAttribute('id'))!);
    await expect(surface(page, 'd')).toHaveAttribute('role', 'dialog');
  });

  test('DTM-38: names, digits, forms, the separator and the clock come from locale (else the nearest lang)', async ({ page }) => {
    await mount(page, [opened('ja', { mode: 'time', value: '07:30', locale: 'ja-JP', hourCycle: 'h12' }), opened('ar', { mode: 'time', value: '07:30', locale: 'ar-EG', hourCycle: 'h23' }), opened('l', { mode: 'date', value: '2026-09-17', locale: '' })]);
    await expect(wheel(page, 'ja', 'hour')).toHaveAttribute('aria-valuetext', '午前 7');
    await expect(host(page, 'ar').locator('.wheel[data-unit="minute"] .row.on')).toHaveText('٣٠');
    await page.evaluate(() => document.documentElement.setAttribute('lang', 'ja-JP'));
    await host(page, 'l').evaluate((el: any) => el.requestUpdate());
    await expect(headerValue(page, 'l')).toHaveText('9月17日(木)');
  });

  test('DTM-39: right to left mirrors the title row, the columns of the horizontal layout, the side of the time the period stands on (after the minute is at the left), the range display (the start at the right of the dash, each time an isolated run) and the actions — not the order of the hour and the minute, nor the dial, nor a selector’s or the period’s arrow keys, nor the period wheel, nor the order typed digits are read in', async ({ page }) => {
    await mount(page, [opened('t', { mode: 'time', value: '07:30', entryMode: 'dial' })]);
    // Left to right, the period selector is after the minute: at its right.
    expect((await bounds(period(page, 't'))).x).toBeGreaterThan((await bounds(selector(page, 't', 'minute'))).x);
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    await host(page, 't').evaluate((el: any) => el.requestUpdate());
    const [title, tabs] = [await bounds(host(page, 't').locator('.title')), await bounds(tabsRow(page, 't', 'entry'))];
    expect(title.x).toBeGreaterThan(tabs.x);
    // The wheels' tab is still first: at the right.
    expect((await bounds(tabOf(page, 't', 'entry-wheels'))).x).toBeGreaterThan((await bounds(tabOf(page, 't', 'entry-dial'))).x);
    expect((await bounds(selector(page, 't', 'hour'))).x).toBeLessThan((await bounds(selector(page, 't', 'minute'))).x);
    // The period's side follows the layout: after the minute is at the left of the time, period.gap from the hour.
    const [rtlPeriod, rtlHour] = [await bounds(period(page, 't')), await bounds(selector(page, 't', 'hour'))];
    expect(rtlHour.x - (rtlPeriod.x + rtlPeriod.width)).toBeCloseTo(await resolveToken(page, T('period-gap')), 0);
    // It is still the Tab stop after the minute's, and its arrow keys are not mirrored: each changes it.
    await selector(page, 't', 'minute').focus();
    await tab(page);
    expect(await focused(page)).toBe('selector:period');
    for (const [key, name] of [['ArrowRight', 'PM'], ['ArrowRight', 'AM'], ['ArrowLeft', 'PM'], ['ArrowUp', 'AM'], ['End', 'PM'], ['Home', 'AM']] as const) {
      await page.keyboard.press(key);
      await expect(period(page, 't'), key).toHaveAttribute('aria-valuetext', name);
    }
    expect((await bounds(action(page, 't', 'cancel'))).x).toBeGreaterThan((await bounds(action(page, 't', 'confirm'))).x);
    const three = await bounds(host(page, 't').locator('.face .hours .number').nth(3));
    const dial = await bounds(host(page, 't').locator('.dial'));
    expect(three.x).toBeGreaterThan(dial.x + dial.width / 2);
    // Right Arrow is the next value in every layout direction.
    await selector(page, 't', 'hour').focus();
    await page.keyboard.press('ArrowRight');
    await expect(selector(page, 't', 'hour')).toHaveAttribute('aria-valuenow', '8');
    // Typed digits are read in the order they are typed: 1 2 3 0 is half past twelve.
    await page.keyboard.type('1230');
    await expect(selector(page, 't', 'hour')).toHaveAttribute('aria-valuenow', '12');
    await expect(selector(page, 't', 'minute')).toHaveAttribute('aria-valuenow', '30');
    // The range display, drawn in a right-to-left layout set on an ancestor (the fixture's own way): the start's range
    // field at the right of the dash and the end's at its left; each time an isolated run, written as the locale writes it.
    await page.evaluate(() => document.documentElement.removeAttribute('dir'));
    await mount(page, [{ ...opened('r', { mode: 'time', range: true, start: '09:00', end: '17:30', hourCycle: 'h12' }), direction: 'rtl' }]);
    const [start, dash, end] = [await bounds(field(page, 'r', 'start')), await bounds(host(page, 'r').locator('.range-separator')), await bounds(field(page, 'r', 'end'))];
    expect(start.x).toBeGreaterThan(dash.x + dash.width - 0.5);
    expect(end.x + end.width).toBeLessThan(dash.x + 0.5);
    await expect(field(page, 'r', 'start').locator('bdi')).toHaveText('9:00 AM');
    await expect(field(page, 'r', 'end').locator('bdi')).toHaveText('5:30 PM');
    // The start's is still the first Tab stop, and the wheels are still written left to right.
    expect(await host(page, 'r').locator('.range-field').first().getAttribute('data-end')).toBe('start');
    expect((await bounds(wheelBox(page, 'r', 'hour'))).x).toBeLessThan((await bounds(wheelBox(page, 'r', 'minute'))).x);
    // The period wheel at the left of the hour, period.gap away; its two names one above the other, before noon on top.
    const [wheelPeriod, wheelHour] = [await bounds(periodBox(page, 'r')), await bounds(wheelBox(page, 'r', 'hour'))];
    expect(wheelHour.x - (wheelPeriod.x + wheelPeriod.width)).toBeCloseTo(await resolveToken(page, T('period-gap')), 0);
    const rows = periodBox(page, 'r').locator('.row');
    await expect(rows).toHaveText(['AM', 'PM']);
    expect((await bounds(rows.nth(0))).y).toBeLessThan((await bounds(rows.nth(1))).y);
    // The columns of the horizontal layout: the dial at the left of the time display.
    await mount(page, [{ ...opened('h', { mode: 'time', value: '07:30', hourCycle: 'h12', entryMode: 'dial', layout: 'horizontal' }), direction: 'rtl' }], { window: { width: 800, height: 640 } });
    expect((await bounds(host(page, 'h').locator('.dial'))).x).toBeLessThan((await bounds(shownRow(page, 'h', 'display'))).x);
  });

  test('DTM-40: unknown values of the closed props behave as the default and are reported; malformed values, value with a range, a date-time end before its start and min after max are ignored and reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      opened('a', { presentation: 'sheet', mode: 'week', hourCycle: 'h24', entryMode: 'text', unit: 'second', layout: 'grid', startView: 'decade', firstDayOfWeek: 'someday', value: '17/09/2026' }),
      opened('b', { mode: 'date-time', range: true, value: '2026-09-17T10:00', start: '2026-09-10T09:00', end: '2026-09-01T09:00', min: '2026-10-01', max: '2026-09-01' }),
    ]);
    expect(await surface(page, 'a').evaluate((el) => el.localName)).toBe('dialog');
    for (const text of ['presentation "sheet"', 'mode "week"', 'hourCycle "h24"', 'entryMode "text"', 'unit "second"', 'layout "grid"', 'startView "decade"', 'firstDayOfWeek "someday"', 'value "17/09/2026"', 'value "2026-09-17T10:00" is set while range', 'end "2026-09-01T09:00" is before start', 'min "2026-10-01" is after max'])
      expect(seen.some((w) => w.includes(text) && w.includes('DTM-40')), text).toBe(true);
  });

  test('DTM-48, DTM-10, DTM-37: the picker has no words of its own — without them Cancel and OK are icon-only Buttons with close and check, of the same variant and size in the same place, that still cancel and confirm; the title row draws no words and keeps its height, and the surface has no name; a date not chosen draws nothing in a header as tall; the hour’s, the minute’s and the period’s names are the locale’s own; each missing word is reported once, naming the prop', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [opened('worded-date', {}), wordless('bare-date', { open: true })], { window: { width: 800, height: 900 } });
    // A date not chosen yet, with no dateLabel: nothing is drawn there, and the header is as tall as with the word.
    await expect(host(page, 'worded-date').locator('.placeholder')).toHaveText('Date');
    expect(((await host(page, 'bare-date').locator('.placeholder').textContent()) ?? '').replace(/\u200b/g, '')).toBe('');
    expect((await bounds(host(page, 'bare-date').locator('.header'))).height).toBeCloseTo((await bounds(host(page, 'worded-date').locator('.header'))).height, 0);
    // The title: no words, the same height, and a surface without a name (DTM-10, DTM-37).
    expect(((await host(page, 'bare-date').locator('.title').textContent()) ?? '').replace(/\u200b/g, '')).toBe('');
    expect((await bounds(host(page, 'bare-date').locator('.title-row'))).height).toBeCloseTo((await bounds(host(page, 'worded-date').locator('.title-row'))).height, 0);
    expect(await surface(page, 'bare-date').getAttribute('aria-label')).toBeNull();
    await expect(surface(page, 'worded-date')).toHaveAttribute('aria-label', 'Select date');
    // The time picker, opened as a person opens it.
    await mount(page, [modal('worded', { mode: 'time', value: '19:30' }), wordless('bare', { mode: 'time', value: '19:30', presentation: 'modal' })], { window: { width: 800, height: 900 } });
    await open(page, 'worded');
    const places = async (id: string) => ({ cancel: await bounds(action(page, id, 'cancel')), confirm: await bounds(action(page, id, 'confirm')), look: await action(page, id, 'confirm').evaluate((el) => [el.getAttribute('variant'), el.getAttribute('size')]) });
    const worded = await places('worded');
    await action(page, 'worded', 'cancel').click();
    await open(page, 'bare');
    // Two icon-only Buttons: the glyphs close and check, no words, no name.
    for (const [name, glyph] of [['cancel', 'close'], ['confirm', 'check']] as const) {
      const button = action(page, 'bare', name);
      await expect(button).toBeVisible();
      expect(await button.evaluate((el) => [el.querySelector('[slot="icon"]')?.textContent, [...el.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent!.trim()).join(''), el.getAttribute('label'), el.shadowRoot!.querySelector('button')!.getAttribute('aria-label')]), name).toEqual([glyph, '', null, null]);
    }
    // The same variant and size, in the same place: the same order, row and height.
    const bare = await places('bare');
    expect(bare.look).toEqual(worded.look);
    expect(bare.cancel.x).toBeLessThan(bare.confirm.x);
    expect(bare.cancel.height).toBeCloseTo(worded.cancel.height, 0);
    expect(bare.cancel.y).toBeCloseTo(worded.cancel.y, 0);
    expect(bare.confirm.x + bare.confirm.width).toBeCloseTo(worded.confirm.x + worded.confirm.width, 0);
    // The hour's, the minute's and the period's names are the platform's, in the picker's locale.
    const names = await page.evaluate(() => ['hour', 'minute', 'dayPeriod'].map((field) => new (Intl as any).DisplayNames('en-US', { type: 'dateTimeField' }).of(field)));
    await expect(wheel(page, 'bare', 'hour')).toHaveAttribute('aria-label', names[0]);
    await expect(wheel(page, 'bare', 'minute')).toHaveAttribute('aria-label', names[1]);
    await expect(period(page, 'bare')).toHaveAttribute('aria-label', names[2]);
    // The entry-mode tabs are drawn and work, without names.
    await expect(tabsRow(page, 'bare')).toHaveAttribute('label', '');
    await expect(tabOf(page, 'bare', 'entry-dial')).toHaveAttribute('label', '');
    // They still cancel and confirm.
    await action(page, 'bare', 'confirm').click();
    expect((await log(page)).at(-1)).toBe('close:confirm');
    await open(page, 'bare');
    await action(page, 'bare', 'cancel').click();
    expect((await log(page)).at(-1)).toBe('close:cancel');
    // Reported: each word once for the page, naming the prop; `label`, the instance's alone, for each picker.
    for (const [key, attribute] of [['cancelLabel', 'cancel-label'], ['confirmLabel', 'confirm-label'], ['dateLabel', 'date-label'], ['wheelsLabel', 'wheels-label'], ['dialLabel', 'dial-label'], ['entryModeLabel', 'entry-mode-label']]) {
      await expect.poll(() => seen.filter((w) => w.includes('DTM-48') && w.includes(`no ${key}`)).length, key).toBe(1);
      expect(seen.find((w) => w.includes('DTM-48') && w.includes(`no ${key}`)), key).toContain(`${attribute} is empty`);
    }
    expect(seen.filter((w) => w.includes('DTM-48') && w.includes('label is empty, so the title row draws no words'))).toHaveLength(2);
    // The hour, the minute and the period had the platform's names: they are not missing.
    expect(await missingWords(page)).toEqual(['cancelLabel', 'confirmLabel', 'dateLabel', 'dialLabel', 'entryModeLabel', 'nextMonthLabel', 'previousMonthLabel', 'wheelsLabel']);
    // The product's words, set once: every word is drawn and exposed, at once.
    await setWords(page, WORDS);
    await open(page, 'bare');
    await expect(action(page, 'bare', 'cancel')).toHaveText('Cancel');
    await expect(action(page, 'bare', 'confirm')).toHaveText('OK');
    await expect(action(page, 'bare', 'cancel').locator('[slot="icon"]')).toHaveCount(0);
    await expect(wheel(page, 'bare', 'hour')).toHaveAttribute('aria-label', 'Hour');
    await expect(period(page, 'bare')).toHaveAttribute('aria-label', 'Period');
    await expect(tabsRow(page, 'bare')).toHaveAttribute('label', 'Time input');
    await expect(tabOf(page, 'bare', 'entry-wheels')).toHaveAttribute('label', 'Wheels');
    // `label` is the instance's alone: the product's words hold no title.
    expect(await surface(page, 'bare').getAttribute('aria-label')).toBeNull();
    expect(await missingWords(page)).toEqual([]);
    // An instance's own prop wins.
    await host(page, 'bare').evaluate((el: any) => Object.assign(el, { confirmLabel: 'Done', hourLabel: 'Hours', label: 'Meeting time' }));
    await expect(action(page, 'bare', 'confirm')).toHaveText('Done');
    await expect(wheel(page, 'bare', 'hour')).toHaveAttribute('aria-label', 'Hours');
    await expect(surface(page, 'bare')).toHaveAttribute('aria-label', 'Meeting time');
    await expect(host(page, 'bare').locator('.title')).toHaveText('Meeting time');
  });

  test('DTM-48: without nextDayLabel an overnight range draws “+1” in the locale’s digits after the end’s time, and without rangeErrorText the error line draws no words and keeps its height while OK stays disabled; the range’s fields and its group are still drawn and work without their names', async ({ page }) => {
    const seen = warnings(page);
    await mount(
      page,
      [
        wordless('night', { open: true, mode: 'time', range: true, start: '22:00', end: '06:00', hourCycle: 'h23' }),
        wordless('night-ar', { open: true, mode: 'time', range: true, start: '22:00', end: '06:00', hourCycle: 'h23', locale: 'ar-EG' }),
        wordless('night-own', { open: true, mode: 'time', range: true, start: '22:00', end: '06:00', hourCycle: 'h23', nextDayLabel: 'tomorrow', startLabel: 'From', endLabel: 'To' }),
      ],
      { window: { width: 800, height: 900 } },
    );
    // "+1": a mark, in the locale's digits — drawn after the time and part of the field's name.
    await expect(field(page, 'night', 'end')).toHaveText('06:00 +1');
    await expect(field(page, 'night', 'end')).toHaveAttribute('aria-label', '06:00 +1');
    await expect(field(page, 'night', 'start')).toHaveAttribute('aria-label', '22:00');
    const one = await page.evaluate(() => new Intl.NumberFormat('ar-EG').format(1));
    expect((await field(page, 'night-ar', 'end').textContent())!.trim().endsWith(`+${one}`)).toBe(true);
    // The range display is a group without a name; its fields still choose the end the time section sets.
    expect(await host(page, 'night').locator('.range-display').evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label')])).toEqual(['group', null]);
    // (Five modal pickers are open at once, the fixtures' way: the press is given to the field itself.)
    await field(page, 'night', 'end').evaluate((el: HTMLElement) => el.click());
    await expect(field(page, 'night', 'end')).toHaveAttribute('aria-pressed', 'true');
    // An instance's own words.
    await expect(field(page, 'night-own', 'end')).toHaveText('06:00 tomorrow');
    await expect(field(page, 'night-own', 'end')).toHaveAttribute('aria-label', 'To, 06:00 tomorrow');
    // Reported once each, naming the prop.
    const reportedOnce = async (pairs: string[][]) => {
      for (const [key, attribute] of pairs) {
        await expect.poll(() => seen.filter((w) => w.includes(`no ${key}`)).length, key).toBe(1);
        expect(seen.find((w) => w.includes(`no ${key}`)), key).toContain(`${attribute} is empty`);
      }
    };
    await reportedOnce([['nextDayLabel', 'next-day-label'], ['rangeLabel', 'range-label'], ['startLabel', 'start-label'], ['endLabel', 'end-label']]);
    // The product's words, set once; an instance's own prop wins.
    await setWords(page, WORDS);
    await expect(field(page, 'night', 'end')).toHaveText('06:00 next day');
    await expect(field(page, 'night', 'end')).toHaveAttribute('aria-label', 'End, 06:00 next day');
    await expect(host(page, 'night').locator('.range-display')).toHaveAttribute('aria-label', 'Range');
    await expect(field(page, 'night-own', 'end')).toHaveAttribute('aria-label', 'To, 06:00 tomorrow');
    await setWords(page, Object.fromEntries(Object.keys(WORDS).map((key) => [key, ''])));

    // The error line (DTM-33): a date-time range whose end is set before its start, by the wheels, in a picker without words.
    await mount(page, [wordless('dt', { presentation: 'modal', mode: 'date-time', range: true, layout: 'horizontal', hourCycle: 'h23', label: 'Stay' })], { window: { width: 800, height: 640 } });
    await open(page, 'dt');
    await day(page, 'dt', '2026-09-10').click();
    await day(page, 'dt', '2026-09-10').click();
    for (const [end, hours] of [['start', 17], ['end', 9]] as const) {
      await field(page, 'dt', end).click();
      await wheel(page, 'dt', 'hour').focus();
      await page.keyboard.press('Home');
      for (let i = 0; i < hours; i++) await page.keyboard.press('ArrowUp');
      await wheel(page, 'dt', 'minute').focus();
      await page.keyboard.press('Home');
    }
    await expect(field(page, 'dt', 'start')).toHaveText('17:00');
    await expect(field(page, 'dt', 'end')).toHaveText('09:00');
    // Its other answers stand: the line is there and keeps a line's height, it describes the end's field, and OK is disabled.
    const error = host(page, 'dt').locator('.error');
    await expect(error).toHaveCount(1);
    expect(((await error.textContent()) ?? '').replace(/\u200b/g, '')).toBe('');
    const wordlessHeight = (await bounds(error)).height;
    expect(wordlessHeight).toBeGreaterThan(0);
    await expect(field(page, 'dt', 'end')).toHaveAttribute('aria-describedby', 'range-error');
    expect(await action(page, 'dt', 'confirm').evaluate((el: any) => el.disabled)).toBe(true);
    await reportedOnce([['rangeErrorText', 'range-error-text']]);
    // With the product's words the line says them, at the same height.
    await setWords(page, WORDS);
    await expect(error).toHaveText('End must be after start');
    expect((await bounds(error)).height).toBeCloseTo(wordlessHeight, 0);
  });
});

test.describe('the range fields and typed entries', () => {
  const time = (page: P, id: string) => Promise.all([now(wheel(page, id, 'hour')), now(wheel(page, id, 'minute'))]);
  const pending = async (page: P, id: string) => `${await wheel(page, id, 'hour').getAttribute('aria-valuetext')}:${await wheel(page, id, 'minute').getAttribute('aria-valuetext')}`;
  /** Types on the hour wheel of a fresh picker at `value`, and returns the pending time as the wheels expose it. */
  const typed = async (page: P, keys: string, props: Fixture['props']) => {
    await mount(page, [opened('t', { mode: 'time', ...props })]);
    await wheel(page, 't', 'hour').focus();
    await page.keyboard.type(keys);
    // What is left of an entry in progress is kept by Enter.
    await page.keyboard.press('Enter');
    return pending(page, 't');
  };

  test('DTM-42: a press, Enter or Space on a range field that is not selected selects it — the wheels, the time display, the period and the dial show its end’s time — keeping focus, changing no time and emitting nothing; the selected one does nothing; each is its own Tab stop, the start’s first, and focus alone selects none; each is a button named startLabel or endLabel and its time, with its pressed state', async ({ page }) => {
    await mount(page, [modal('r', { mode: 'time', range: true, start: '09:00', end: '17:30', hourCycle: 'h12' })]);
    await open(page, 'r');
    const [start, end] = [field(page, 'r', 'start'), field(page, 'r', 'end')];
    const names = () => host(page, 'r').locator('.range-field').evaluateAll((els) => els.map((el) => `${el.localName}:${el.getAttribute('aria-label')}:${el.getAttribute('aria-pressed')}`));
    expect(await names()).toEqual(['button:Start, 9:00 AM:true', 'button:End, 5:30 PM:false']);
    // By pointer.
    await end.click();
    expect(await names()).toEqual(['button:Start, 9:00 AM:false', 'button:End, 5:30 PM:true']);
    expect(await time(page, 'r')).toEqual([5, 30]);
    await expect(period(page, 'r')).toHaveAttribute('aria-valuetext', 'PM');
    // The selected one activated: nothing changes.
    await end.click();
    expect(await names()).toEqual(['button:Start, 9:00 AM:false', 'button:End, 5:30 PM:true']);
    // By Enter, and by Space; focus stays on the field.
    await start.focus();
    expect(await names()).toEqual(['button:Start, 9:00 AM:false', 'button:End, 5:30 PM:true']);
    await page.keyboard.press('Enter');
    expect(await names()).toEqual(['button:Start, 9:00 AM:true', 'button:End, 5:30 PM:false']);
    expect(await time(page, 'r')).toEqual([9, 0]);
    expect(await focused(page)).toBe('field:start');
    await end.focus();
    await page.keyboard.press('Space');
    expect(await names()).toEqual(['button:Start, 9:00 AM:false', 'button:End, 5:30 PM:true']);
    expect(await focused(page)).toBe('field:end');
    await start.focus();
    await page.keyboard.press('Space');
    // Each its own Tab stop, the start's before the end's; focus alone selects none: Tab passes the end's field on its
    // way to the wheels without changing which end they set.
    await tab(page);
    expect(await focused(page)).toBe('field:end');
    await tab(page);
    expect(await focused(page)).toBe('wheel:hour');
    expect(await names()).toEqual(['button:Start, 9:00 AM:true', 'button:End, 5:30 PM:false']);
    expect(await time(page, 'r')).toEqual([9, 0]);
    // Selecting ends a typed entry first, keeping what it read — on the end it was typed for.
    await page.keyboard.press('1');
    await end.click();
    await expect(start).toHaveText('1:00 AM');
    await expect(end).toHaveText('5:30 PM');
    expect(await time(page, 'r')).toEqual([5, 30]);
    // The dial mode: the time display and the dial show the selected end, the dial keeping the unit it shows.
    await tabOf(page, 'r', 'entry-dial').click();
    await selector(page, 'r', 'minute').focus();
    await start.click();
    await expect(selector(page, 'r', 'hour')).toHaveAttribute('aria-valuetext', '1 AM');
    await expect(periodName(page, 'r')).toHaveText('AM');
    await expect(selector(page, 'r', 'minute')).toHaveClass(/selected/);
    await expect(host(page, 'r').locator('.face .numbers.minutes')).not.toHaveClass(/faded/);
    // Nothing was emitted, and no pending time changed but the one typed.
    expect(await log(page)).toEqual([]);
    // The names follow the props; an overnight end says so.
    await host(page, 'r').evaluate((el: any) => ((el.startLabel = 'From'), (el.endLabel = 'Until')));
    expect(await names()).toEqual(['button:From, 1:00 AM:true', 'button:Until, 5:30 PM:false']);
    await mount(page, [opened('n', { mode: 'time', range: true, start: '22:00', end: '06:00', hourCycle: 'h12' })]);
    await expect(field(page, 'n', 'end')).toHaveAttribute('aria-label', 'End, 6:00 AM next day');
  });

  test('DTM-43: a press on a wheel’s middle row that ends without a drag, or a digit typed while it has focus, begins a typed entry — the wheel focused, its input taking text with the number keyboard, still a spin button, its selection container, value and outline the selected selector’s — the value left shown; Tab and opening begin none; a drag from the middle row begins none', async ({ page }) => {
    await mount(page, [modal('t', { mode: 'time', value: '07:30', hourCycle: 'h12' })], { system: 'acme', systemCss: await acmeSystemCss() });
    await open(page, 't');
    await override(page, { [T('motion-state-duration')]: '0ms' });
    const [h, m] = [wheel(page, 't', 'hour'), wheel(page, 't', 'minute')];
    const ground = wheelBox(page, 't', 'hour').locator('.ground');
    const resting = [await css(ground, 'background-color'), await css(ground, 'box-shadow')];
    // Opened (DTM-3): the hour wheel has focus, and no entry has begun — read-only, so no on-screen keyboard.
    expect(await focused(page)).toBe('wheel:hour');
    expect(await h.evaluate((el: HTMLInputElement) => el.readOnly)).toBe(true);
    await expect(wheelBox(page, 't', 'hour')).not.toHaveClass(/typing/);
    // Tab to the minute wheel: none either.
    await tab(page);
    expect(await focused(page)).toBe('wheel:minute');
    expect(await m.evaluate((el: HTMLInputElement) => el.readOnly)).toBe(true);
    await expect(wheelBox(page, 't', 'minute')).not.toHaveClass(/typing/);
    // A press on the hour wheel's middle row, released where it began.
    const box = await bounds(wheelBox(page, 't', 'hour'));
    const [cx, cy] = [box.x + box.width / 2, box.y + box.height / 2];
    await page.mouse.click(cx, cy);
    await page.mouse.move(0, 0);
    // The focused element, its input mode and its role (DTM-43's verify).
    expect(await focused(page)).toBe('wheel:hour');
    expect(await h.evaluate((el: HTMLInputElement) => [el.localName, el.inputMode, el.getAttribute('role'), el.readOnly])).toEqual(['input', 'numeric', 'spinbutton', false]);
    await expect(h).toHaveAttribute('aria-valuetext', '7 AM');
    // The wheel's container, the value on it and its outline: the selected selector's tokens.
    await expect(wheelBox(page, 't', 'hour')).toHaveClass(/typing/);
    expect(await css(ground, 'background-color')).toBe(await resolveColor(page, T('selected-selector-container-color')));
    expect(await css(ground, 'box-shadow')).toBe(`${await resolveColor(page, T('selected-selector-outline-color'))} 0px 0px 0px ${await resolveToken(page, T('selected-selector-outline-width'))}px inset`);
    const on = host(page, 't').locator('.wheel[data-unit="hour"] .row.on');
    expect(await css(on, 'color')).toBe(await resolveColor(page, T('selected-selector-label-color')));
    expect([await css(ground, 'background-color'), await css(ground, 'box-shadow')]).not.toEqual(resting);
    // The value stays shown, as the text the first digit replaces; the rows above and below stay.
    await expect(on).toHaveText('7');
    await expect(on).toBeVisible();
    await expect(h).toHaveValue('');
    await expect(host(page, 't').locator('.wheel[data-unit="hour"] .row:not(.on)').first()).toBeVisible();
    // The other wheel keeps its look. The change between the two looks runs over the state motion (DTM-27).
    await expect(wheelBox(page, 't', 'minute')).not.toHaveClass(/typing/);
    await override(page, { [T('motion-state-duration')]: '' });
    expect(await css(ground, 'transition-duration')).toContain(`${(await resolveToken(page, T('motion-state-duration'), 'duration')) / 1000}s`);
    // A press on a row above or below still settles it — and ends the entry.
    const row = (await bounds(on)).height;
    await page.mouse.click(cx, cy + row);
    await expect.poll(() => now(h)).toBe(8);
    await expect(wheelBox(page, 't', 'hour')).not.toHaveClass(/typing/);
    expect(await h.evaluate((el: HTMLInputElement) => el.readOnly)).toBe(true);
    // A drag from the middle row begins none: past the slop it moves the rows.
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy - row, { steps: 4 });
    await page.waitForTimeout(150);
    await page.mouse.up();
    await expect.poll(() => now(h)).toBe(9);
    await expect(wheelBox(page, 't', 'hour')).not.toHaveClass(/typing/);
    expect(await h.evaluate((el: HTMLInputElement) => el.readOnly)).toBe(true);
    // Within the slop it is still a press: an entry.
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy - 5);
    await page.mouse.up();
    await expect(wheelBox(page, 't', 'hour')).toHaveClass(/typing/);
    expect(await now(h)).toBe(9);
    await page.keyboard.press('Escape');
    // A digit typed while the wheel has focus begins one too.
    await m.focus();
    await page.keyboard.press('4');
    await expect(wheelBox(page, 't', 'minute')).toHaveClass(/typing/);
    expect(await m.evaluate((el: HTMLInputElement) => el.readOnly)).toBe(false);
    // Under a joined span it is the wheel's own part of the container that is drawn so.
    await override(page, { [T('wheel-selection-span')]: 'joined', [T('motion-state-duration')]: '0ms' });
    expect(await css(wheelBox(page, 't', 'minute').locator('.ground'), 'background-color')).toBe(await resolveColor(page, T('selected-selector-container-color')));
    expect((await bounds(wheelBox(page, 't', 'minute').locator('.ground'))).width).toBeCloseTo((await bounds(wheelBox(page, 't', 'minute'))).width, 0);
    expect(await isOpen(page, 't')).toBe(true);
  });

  test('DTM-20, DTM-44: focus that typing moves on to the minute wheel is keyboard focus — the ring around its selection container, in the focus color, though a press had put focus on the hour without one; the hour, left, shows none', async ({ page }) => {
    await mount(page, [opened('t', { mode: 'time', value: '07:30', hourCycle: 'h12' })]);
    await override(page, { [T('motion-state-duration')]: '0ms' });
    const [h, m] = [wheelBox(page, 't', 'hour'), wheelBox(page, 't', 'minute')];
    const ringOf = (box: Locator) => css(box.locator('.ring'), 'outline-style');
    // A press on the hour wheel's middle row: focus by pointer — an entry (DTM-43), and no ring.
    const box = await bounds(h);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.move(0, 0);
    expect(await focused(page)).toBe('wheel:hour');
    await expect(h).toHaveClass(/typing/);
    expect(await ringOf(h)).toBe('none');
    // Two digits end the hour's entry and move focus to the minute wheel, which waits for the next digit (no entry yet).
    await page.keyboard.press('0');
    await page.keyboard.press('9');
    expect(await focused(page)).toBe('wheel:minute');
    await expect(m).not.toHaveClass(/typing/);
    // The wheel that now has focus says so: the ring, around its selection container, in the focus color, not animated.
    await expect.poll(() => ringOf(m)).toBe('solid');
    expect(await css(m.locator('.ring'), 'outline-color')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    expect(await px(m.locator('.ring'), 'outline-width')).toBe(await resolveToken(page, '--tanrei-sys-focus-outer-width'));
    expect(await css(m.locator('.ring'), 'transition-property')).not.toContain('outline');
    const [r, g] = [await bounds(m.locator('.ring')), await bounds(m.locator('.ground'))];
    expect([r.x, r.y, r.width, r.height].map(Math.round)).toEqual([g.x, g.y, g.width, g.height].map(Math.round));
    // The hour wheel, left, shows neither its entry nor a ring.
    await expect(h).not.toHaveClass(/typing/);
    expect(await ringOf(h)).toBe('none');
    // It is drawn: the ring's edge is the focus color on the page, where the hour's is not.
    const edge = async (wheelLocator: Locator) => {
      const b = await bounds(wheelLocator.locator('.ring'));
      const width = await resolveToken(page, '--tanrei-sys-focus-outer-width');
      const shot = await page.screenshot({ clip: { x: b.x + width / 2 - 0.5, y: b.y + b.height / 2 - 0.5, width: 1, height: 1 }, scale: 'css' });
      return page.evaluate(async (data) => {
        const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
        const canvas = new OffscreenCanvas(1, 1).getContext('2d')!;
        canvas.drawImage(image, 0, 0);
        return [...canvas.getImageData(0, 0, 1, 1).data.slice(0, 3)];
      }, shot.toString('base64'));
    };
    const focusColor = (await resolveColor(page, '--tanrei-sys-color-focus-ring')).match(/\d+/g)!.slice(0, 3).map(Number);
    const near = (a: number[], b: number[]) => a.every((v, i) => Math.abs(v - b[i]) <= 12);
    expect(near(await edge(m), focusColor)).toBe(true);
    expect(near(await edge(h), focusColor)).toBe(false);
    // The next digits are the minute's entry; when it ends the minute wheel still has focus, and still shows it.
    await page.keyboard.press('4');
    await expect(m).toHaveClass(/typing/);
    expect(await ringOf(m)).toBe('solid');
    await page.keyboard.press('5');
    await expect(m).not.toHaveClass(/typing/);
    expect(await focused(page)).toBe('wheel:minute');
    expect(await ringOf(m)).toBe('solid');
    expect([await now(wheel(page, 't', 'hour')), await now(wheel(page, 't', 'minute'))]).toEqual([9, 45]);
    // Focus leaving takes the ring with it.
    await wheel(page, 't', 'minute').evaluate((el) => (el as HTMLElement).blur());
    expect(await ringOf(m)).toBe('none');
  });

  test('DTM-20, DTM-43, DTM-45: a wheel reached by a press and then worked by the keyboard holds keyboard focus — the ring once a key has moved it or ended its entry; a press alone shows none', async ({ page }) => {
    await mount(page, [opened('t', { mode: 'time', value: '07:30', hourCycle: 'h12' })]);
    await override(page, { [T('motion-state-duration')]: '0ms' });
    const m = wheelBox(page, 't', 'minute');
    const ringOf = () => css(m.locator('.ring'), 'outline-style');
    const box = await bounds(m);
    const pressMiddle = async () => {
      await wheel(page, 't', 'minute').evaluate((el) => (el as HTMLElement).blur());
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.move(0, 0);
      expect(await focused(page)).toBe('wheel:minute');
      await expect(m).toHaveClass(/typing/);
      expect(await ringOf()).toBe('none');
    };
    // Arrival by a press, then two digits: the entry ends (DTM-45), focus stays, and the wheel shows it.
    await pressMiddle();
    await page.keyboard.press('1');
    await page.keyboard.press('5');
    await expect(m).not.toHaveClass(/typing/);
    expect(await focused(page)).toBe('wheel:minute');
    await expect.poll(ringOf).toBe('solid');
    expect(await now(wheel(page, 't', 'minute'))).toBe(15);
    // … then Enter, Escape and an arrow key, each of which ends the entry the press began.
    for (const key of ['Enter', 'Escape', 'ArrowUp']) {
      await pressMiddle();
      await page.keyboard.press(key);
      await expect(m).not.toHaveClass(/typing/);
      expect(await focused(page)).toBe('wheel:minute');
      await expect.poll(ringOf).toBe('solid');
    }
    expect(await now(wheel(page, 't', 'minute'))).toBe(16);
    expect(await isOpen(page, 't')).toBe(true);
  });

  test('DTM-20, DTM-39, DTM-44: the minute wheel shows the ring after the hour’s entry moves on to it in every form with wheels — time and date-time, a range, docked and modal, a joined selection container, right to left', async ({ page }) => {
    const forms: { fixture: Fixture; window?: { width: number; height: number }; joined?: boolean }[] = [
      { fixture: opened('t', { mode: 'time', value: '07:30', hourCycle: 'h23' }) },
      { fixture: opened('t', { mode: 'time', value: '07:30', hourCycle: 'h12' }), joined: true },
      { fixture: opened('t', { mode: 'date-time', value: '2026-09-17T19:30', hourCycle: 'h12' }), window: { width: 800, height: 900 } },
      { fixture: opened('t', { mode: 'time', range: true, start: '09:00', end: '17:30', hourCycle: 'h12' }) },
      { fixture: opened('t', { mode: 'date-time', range: true, start: '2026-09-17T09:00', end: '2026-09-18T17:30', hourCycle: 'h12' }), window: { width: 800, height: 900 } },
      { fixture: inline('t', { mode: 'time', value: '07:30', hourCycle: 'h12' }) },
      { fixture: inline('t', { mode: 'date-time', value: '2026-09-17T19:30', hourCycle: 'h12' }), window: { width: 800, height: 900 } },
      { fixture: { ...opened('t', { mode: 'time', value: '07:30', hourCycle: 'h12' }), direction: 'rtl' } },
      { fixture: { ...opened('t', { mode: 'time', value: '07:30', hourCycle: 'h12', locale: 'ar-EG' }), direction: 'rtl' } },
    ];
    for (const { fixture, window, joined } of forms) {
      await mount(page, [fixture], window ? { window } : {});
      if (joined) await override(page, { [T('wheel-selection-span')]: 'joined' });
      const [h, m] = [wheelBox(page, 't', 'hour'), wheelBox(page, 't', 'minute')];
      await h.scrollIntoViewIfNeeded();
      const box = await bounds(h);
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.move(0, 0);
      expect(await focused(page), JSON.stringify(fixture)).toBe('wheel:hour');
      expect(await css(h.locator('.ring'), 'outline-style')).toBe('none');
      await page.keyboard.press('0');
      await page.keyboard.press('9');
      expect(await focused(page), JSON.stringify(fixture)).toBe('wheel:minute');
      await expect.poll(() => css(m.locator('.ring'), 'outline-style'), JSON.stringify(fixture)).toBe('solid');
      expect(await css(m.locator('.ring'), 'outline-color')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
      expect(await css(h.locator('.ring'), 'outline-style')).toBe('none');
      // Around the minute wheel's own part, wherever the layout direction puts the period: the digits stay left to right.
      const [r, w] = [await bounds(m.locator('.ring')), await bounds(m)];
      expect(Math.round(r.x)).toBe(Math.round(w.x));
      expect(Math.round(r.width)).toBe(Math.round(w.width));
      expect((await bounds(h)).x).toBeLessThan(w.x);
      if (joined) await override(page, { [T('wheel-selection-span')]: '' });
    }
  });

  test('DTM-44: digits, ASCII or the locale’s, are shown on the middle row in place of the value; a second digit joins the first where the two make a value, else the hour ends with the first and the second begins the minute; an entry ends by two digits or one that none could join, an hour’s moving focus to the minute wheel, as the separator does; Backspace removes the last digit; other characters are ignored, pasted text is read in order, and the period never changes', async ({ page }) => {
    test.setTimeout(120_000);
    const h12 = { value: '09:15', hourCycle: 'h12' };
    const h23 = { value: '09:15', hourCycle: 'h23' };
    // DTM-44's verify, with the 12-hour clock…
    expect(await typed(page, '730', h12)).toBe('7 AM:30');
    expect(await typed(page, '0730', h12)).toBe('7 AM:30');
    expect(await typed(page, '130', h12)).toBe('1 AM:30');
    expect(await typed(page, '12:05', h12)).toBe('12 AM:05');
    // (the minute is full, so 9 begins it again)
    expect(await typed(page, '2359', h12)).toBe('2 AM:09');
    // …and with the 24-hour clock.
    expect(await typed(page, '130', h23)).toBe('13:00');
    expect(await typed(page, '2359', h23)).toBe('23:59');
    expect(await typed(page, '945', h23)).toBe('09:45');
    expect(await typed(page, '0730', h23)).toBe('07:30');
    // The period is the pending one, whatever is typed.
    expect(await typed(page, '730', { value: '21:15', hourCycle: 'h12' })).toBe('7 PM:30');
    expect(await typed(page, '1200', { value: '21:15', hourCycle: 'h12' })).toBe('12 PM:00');
    // The locale's digits (Arabic-Indic under ar-EG), and its own digits on the middle row.
    await mount(page, [opened('ar', { mode: 'time', value: '09:15', hourCycle: 'h23', locale: 'ar-EG' })]);
    await wheel(page, 'ar', 'hour').focus();
    // (A key of a keyboard in that layout; the test's own keyboard has none.)
    await wheel(page, 'ar', 'hour').evaluate((el) => el.dispatchEvent(new KeyboardEvent('keydown', { key: '١', bubbles: true, composed: true, cancelable: true })));
    await expect(wheel(page, 'ar', 'hour')).toHaveValue('١');
    // (The rest as an on-screen keyboard sends it: text into the input, with no key the picker could read.)
    await page.keyboard.insertText('٣');
    expect(await focused(page)).toBe('wheel:minute');
    await page.keyboard.insertText('٤٥');
    expect(await time(page, 'ar')).toEqual([13, 45]);
    // What has been typed stands on the middle row in place of the value; the value returns when the entry ends.
    await mount(page, [opened('t', { mode: 'time', ...h12 })]);
    const [h, m] = [wheel(page, 't', 'hour'), wheel(page, 't', 'minute')];
    const on = host(page, 't').locator('.wheel[data-unit="hour"] .row.on');
    await h.focus();
    await page.keyboard.press('1');
    await expect(h).toHaveValue('1');
    await expect(on).toBeHidden();
    expect(await css(h, 'color')).toBe(await resolveColor(page, T('selected-selector-label-color')));
    expect(await px(h, 'font-size')).toBe(await resolveToken(page, T('wheel-label-typescale-font-size')));
    // Nothing is taken before the entry ends.
    expect(await time(page, 't')).toEqual([9, 15]);
    // Backspace removes the last digit: the value is shown again, and the entry goes on.
    await page.keyboard.press('Backspace');
    await expect(h).toHaveValue('');
    await expect(on).toBeVisible();
    await expect(wheelBox(page, 't', 'hour')).toHaveClass(/typing/);
    // Every other character is ignored.
    await page.keyboard.type('x-1');
    await expect(h).toHaveValue('1');
    // 1 could be joined (10, 11, 12): the entry waits. 2 joins it; the hour is full, so it ends and focus moves on.
    expect(await focused(page)).toBe('wheel:hour');
    await page.keyboard.press('2');
    expect(await focused(page)).toBe('wheel:minute');
    expect(await time(page, 't')).toEqual([12, 15]);
    await expect(wheelBox(page, 't', 'hour')).not.toHaveClass(/typing/);
    // The minute wheel waits for a digit: no entry yet, though its input takes text (an on-screen keyboard stays up).
    await expect(wheelBox(page, 't', 'minute')).not.toHaveClass(/typing/);
    expect(await m.evaluate((el: HTMLInputElement) => el.readOnly)).toBe(false);
    await page.keyboard.press('7');
    // 7 no second digit could join: the minute's entry ends with it, and the wheel keeps the focus.
    expect(await time(page, 't')).toEqual([12, 7]);
    expect(await focused(page)).toBe('wheel:minute');
    // One digit that none could join ends the hour too: 2 to 9 on the 12-hour clock.
    await h.focus();
    await page.keyboard.press('4');
    expect(await focused(page)).toBe('wheel:minute');
    expect(await time(page, 't')).toEqual([4, 7]);
    // The separator on the hour wheel — the locale's, a colon, a full stop, a space — ends the hour and moves on.
    for (const [separator, hour] of [[':', 1], ['.', 1], [' ', 1]] as const) {
      await h.focus();
      await page.keyboard.press('1');
      await page.keyboard.press(separator === ' ' ? 'Space' : separator);
      expect(await focused(page), `after "${separator}"`).toBe('wheel:minute');
      expect((await time(page, 't'))[0], `after "${separator}"`).toBe(hour);
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowDown');
    }
    // On the minute wheel a separator is one more ignored character.
    await page.keyboard.press('3');
    await page.keyboard.press(':');
    await expect(m).toHaveValue('3');
    expect(await focused(page)).toBe('wheel:minute');
    await page.keyboard.press('Escape');
    // Pasted text is read as its characters typed in order.
    await h.focus();
    await page.keyboard.press('1');
    await page.keyboard.press('Backspace');
    await h.evaluate((el: HTMLInputElement) => {
      el.value = '11:45 pm';
      el.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertFromPaste', data: '11:45 pm' }));
    });
    expect(await time(page, 't')).toEqual([11, 45]);
    // A typed entry never changes the period: it was AM, and is.
    await expect(period(page, 't')).toHaveAttribute('aria-valuetext', 'AM');
  });

  test('DTM-45: an entry that ends — by its digits, Enter, Tab, focus leaving, a press elsewhere, a drag or a scroll of the wheel — makes what it read the pending value, a minute rounded down to minuteStep, and keeps the old one for nothing typed or no value; the rows move to it and the container returns; Escape ends it with the value before and closes nothing, a second Escape closes; Enter does not press OK; the keys that move the wheel end it first; nothing is emitted', async ({ page }) => {
    test.setTimeout(120_000);
    // DTM-45's verify: 5 0 on the minute wheel with minuteStep 15 reads 45.
    await mount(page, [modal('s', { mode: 'time', value: '07:30', hourCycle: 'h12', minuteStep: 15 })]);
    await open(page, 's');
    await wheel(page, 's', 'minute').focus();
    await page.keyboard.type('50');
    expect(await now(wheel(page, 's', 'minute'))).toBe(45);
    await expect(host(page, 's').locator('.wheel[data-unit="minute"] .row.on')).toHaveText('45');
    // A step of one keeps the minute as typed.
    await mount(page, [modal('t', { mode: 'time', value: '07:30', hourCycle: 'h12' })]);
    await open(page, 't');
    const [h, m] = [wheel(page, 't', 'hour'), wheel(page, 't', 'minute')];
    const typing = (unit: 'hour' | 'minute') => wheelBox(page, 't', unit).evaluate((el) => el.classList.contains('typing'));
    // 0 and Enter on the 12-hour hour: no value — the hour is unchanged, and the picker is open (Enter pressed no OK).
    await page.keyboard.press('0');
    expect(await typing('hour')).toBe(true);
    await page.keyboard.press('Enter');
    expect(await typing('hour')).toBe(false);
    expect(await now(h)).toBe(7);
    expect(await isOpen(page, 't')).toBe(true);
    expect(await log(page)).toEqual([]);
    expect(await focused(page)).toBe('wheel:hour');
    // Enter keeps what was read; the rows move to it over the wheel motion, and the container is as it was.
    await page.keyboard.press('1');
    await page.keyboard.press('Enter');
    expect(await now(h)).toBe(1);
    expect(await isOpen(page, 't')).toBe(true);
    await expect(host(page, 't').locator('.wheel[data-unit="hour"] .row.on')).toHaveText('1');
    expect(await css(host(page, 't').locator('.wheel[data-unit="hour"] .row').first(), 'transition-duration')).toContain(`${(await resolveToken(page, T('motion-wheel-duration'), 'duration')) / 1000}s`);
    await expect.poll(() => css(wheelBox(page, 't', 'hour').locator('.ground'), 'background-color')).toBe(await resolveColor(page, T('wheel-selection-container-color')));
    expect(await h.evaluate((el: HTMLInputElement) => el.readOnly)).toBe(true);
    // Nothing typed: the value it had.
    const box = await bounds(wheelBox(page, 't', 'hour'));
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    expect(await typing('hour')).toBe(true);
    await page.keyboard.press('Enter');
    expect(await now(h)).toBe(1);
    // Escape during an entry: the value before it, and no close.
    await page.keyboard.press('1');
    await page.keyboard.press('1');
    expect(await focused(page)).toBe('wheel:minute');
    expect(await now(h)).toBe(11);
    await page.keyboard.press('5');
    expect(await typing('minute')).toBe(true);
    await page.keyboard.press('Escape');
    expect(await typing('minute')).toBe(false);
    expect(await now(m)).toBe(30);
    expect(await isOpen(page, 't')).toBe(true);
    expect(await log(page)).toEqual([]);
    // Tab keeps it.
    await page.keyboard.press('4');
    await tab(page);
    expect(await now(m)).toBe(4);
    expect(await focused(page)).not.toBe('wheel:minute');
    // Focus leaving keeps it.
    await m.focus();
    await page.keyboard.press('2');
    await m.evaluate((el: HTMLElement) => el.blur());
    expect(await now(m)).toBe(2);
    // A press elsewhere in the picker keeps it.
    await m.focus();
    await page.keyboard.press('3');
    await host(page, 't').locator('.title').click();
    expect(await now(m)).toBe(3);
    expect(await typing('minute')).toBe(false);
    // The wheel scrolled, and the wheel dragged: the entry ends first, keeping what it read, and the wheel moves from there.
    const row = (await bounds(host(page, 't').locator('.wheel[data-unit="minute"] .row.on'))).height;
    await m.focus();
    await page.keyboard.press('2');
    await wheelBox(page, 't', 'minute').evaluate((el, r) => el.dispatchEvent(new WheelEvent('wheel', { deltaY: r, bubbles: true, cancelable: true })), row);
    await expect.poll(() => now(m)).toBe(3);
    await page.keyboard.press('1');
    const mb = await bounds(wheelBox(page, 't', 'minute'));
    await page.mouse.move(mb.x + mb.width / 2, mb.y + mb.height / 2);
    await page.mouse.down();
    await page.mouse.move(mb.x + mb.width / 2, mb.y + mb.height / 2 - row, { steps: 4 });
    expect(await typing('minute')).toBe(false);
    await page.waitForTimeout(150);
    await page.mouse.up();
    await expect.poll(() => now(m)).toBe(2);
    // Up Arrow first ends it, keeping what it read, and then acts.
    await page.keyboard.press('4');
    await page.keyboard.press('ArrowUp');
    expect(await now(m)).toBe(5);
    expect(await typing('minute')).toBe(false);
    await page.keyboard.press('2');
    await page.keyboard.press('Home');
    expect(await now(m)).toBe(0);
    // Nothing was emitted, and nothing else is checked: OK commits the time.
    expect(await log(page)).toEqual([]);
    await action(page, 't', 'confirm').click();
    expect(await log(page)).toEqual(['change:{"value":"11:00","start":"","end":""}:11:00||', 'close:confirm']);
    // Escape during an entry stays open; a second Escape closes with escape (DTM-45's verify).
    await open(page, 't');
    await page.keyboard.press('1');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('1');
    await page.keyboard.press('Escape');
    expect(await isOpen(page, 't')).toBe(true);
    expect(await now(wheel(page, 't', 'hour'))).toBe(11);
    expect((await log(page)).slice(2)).toEqual([]);
    await page.keyboard.press('Escape');
    await expect.poll(() => isOpen(page, 't')).toBe(false);
    expect((await log(page)).slice(2)).toEqual(['close:escape']);
    // Reduced motion: the rows are at the typed value at once.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, 't');
    await page.keyboard.type('3');
    expect(await css(host(page, 't').locator('.wheel[data-unit="hour"] .row').first(), 'transition-duration')).toBe('0s');
    expect(await now(wheel(page, 't', 'hour'))).toBe(3);
  });

  test('DTM-22: digits typed on a selector are read as a wheel’s typed entry is — the same values, the same rounding to minuteStep, the hour’s entry moving focus to the minute selector — shown as the selector’s text, with no on-screen keyboard', async ({ page }) => {
    await mount(page, [modal('a', { mode: 'time', value: '09:15', hourCycle: 'h12', entryMode: 'dial', minuteStep: 15 })]);
    await open(page, 'a');
    const [h, m] = [selector(page, 'a', 'hour'), selector(page, 'a', 'minute')];
    expect(await focused(page)).toBe('selector:hour');
    // No on-screen keyboard: the dial mode has no text input at all.
    await expect(host(page, 'a').locator('input')).toHaveCount(0);
    await page.keyboard.press('1');
    // What has been typed is the selector's text; nothing is taken yet.
    await expect(h).toHaveText('1');
    await expect(h).toHaveAttribute('aria-valuenow', '9');
    // 3 makes no hour with it: the hour ends with 1, and 3 begins the minute's entry, on the minute selector.
    await page.keyboard.press('3');
    expect(await focused(page)).toBe('selector:minute');
    await expect(h).toHaveAttribute('aria-valuetext', '1 AM');
    await expect(m).toHaveText('3');
    await expect(m).toHaveClass(/selected/);
    // 3 8 is rounded down to the step: 30.
    await page.keyboard.press('8');
    await expect(m).toHaveAttribute('aria-valuenow', '30');
    await expect(m).toHaveText('30');
    // Backspace, Enter (no OK) and Escape (no close), as on a wheel.
    await page.keyboard.type('45');
    await expect(m).toHaveAttribute('aria-valuenow', '45');
    await page.keyboard.press('1');
    await page.keyboard.press('Backspace');
    await expect(m).toHaveText('45');
    await page.keyboard.press('0');
    await page.keyboard.press('Enter');
    await expect(m).toHaveAttribute('aria-valuenow', '0');
    expect(await isOpen(page, 'a')).toBe(true);
    await page.keyboard.press('3');
    await page.keyboard.press('Escape');
    await expect(m).toHaveAttribute('aria-valuenow', '0');
    await expect(m).toHaveText('00');
    expect(await isOpen(page, 'a')).toBe(true);
    // The separator moves an hour's entry on; focus leaving keeps what was read.
    await h.focus();
    await page.keyboard.type('12:');
    expect(await focused(page)).toBe('selector:minute');
    await expect(h).toHaveAttribute('aria-valuetext', '12 AM');
    await h.focus();
    await page.keyboard.press('1');
    await tab(page);
    await expect(h).toHaveAttribute('aria-valuetext', '1 AM');
    expect(await log(page)).toEqual([]);
  });

  test('DTM-26: the handle moves along the shorter arc over the dial motion when a typed entry or a range field changes the pending time', async ({ page }) => {
    await mount(page, [opened('r', { mode: 'time', range: true, start: '11:00', end: '14:30', hourCycle: 'h12', entryMode: 'dial' })]);
    await page.waitForTimeout(100);
    const dial = host(page, 'r').locator('.dial');
    const angle = () => dial.evaluate((el: HTMLElement) => el.style.getPropertyValue('--_angle'));
    expect(await angle()).toBe('330deg');
    // The end's range field: 11 to 2 is 330° on to 420°, not back to 60°; moved, not placed.
    await field(page, 'r', 'end').click();
    expect(await angle()).toBe('420deg');
    await expect(dial).not.toHaveAttribute('data-instant', '');
    expect(await css(host(page, 'r').locator('.arm'), 'transition-duration')).toContain(`${(await resolveToken(page, T('motion-dial-duration'), 'duration')) / 1000}s`);
    // A typed entry: 2 to 1, 420° back to 390°.
    await selector(page, 'r', 'hour').focus();
    await page.keyboard.press('1');
    await page.keyboard.press('Enter');
    expect(await angle()).toBe('390deg');
    await expect(dial).not.toHaveAttribute('data-instant', '');
  });

  test('DTM-27: a range field paints its condition’s selector tokens of the hovered, focused and pressed states (acme values them apart), pressed over focused over hovered; pointer focus is not the focused state; the colors change over the state motion, at once where reduced', async ({ page }) => {
    await mount(page, [opened('r', { mode: 'time', range: true, start: '09:00', end: '17:30', hourCycle: 'h12' })], { system: 'acme', systemCss: await acmeSystemCss() });
    const duration = (await resolveToken(page, T('motion-state-duration'), 'duration')) / 1000;
    expect(await css(field(page, 'r', 'end'), 'transition-property')).toBe('background-color, color, box-shadow, opacity');
    expect(await css(field(page, 'r', 'end'), 'transition-duration')).toBe(`${duration}s`);
    await override(page, { [T('motion-state-duration')]: '0ms' });
    const look = (condition: string, state: string) => resolveColor(page, T(`${condition}-${state}-selector-container-color`));
    const [start, end] = [field(page, 'r', 'start'), field(page, 'r', 'end')];
    await end.hover();
    await expect.poll(() => css(end, 'background-color')).toBe(await look('unselected', 'hovered'));
    expect(await css(end, 'color')).toBe(await resolveColor(page, T('unselected-hovered-selector-label-color')));
    await start.focus();
    await tab(page);
    await page.mouse.move(0, 0);
    // Focus by key does not select: the end's field is focused, and still unselected.
    await expect.poll(() => css(end, 'background-color')).toBe(await look('unselected', 'focused'));
    await end.hover();
    await page.mouse.down();
    await expect.poll(() => css(end, 'background-color')).toBe(await look('unselected', 'pressed'));
    await page.mouse.up();
    // Selected now. Focus gained by a press is not the focused state: the start's field, pressed afresh, is selected and hovered.
    await end.evaluate((el: HTMLElement) => el.blur());
    await expect.poll(() => css(end, 'background-color')).toBe(await look('selected', 'hovered'));
    await start.click();
    await expect.poll(() => css(start, 'background-color')).toBe(await look('selected', 'hovered'));
    expect(await look('selected', 'hovered')).not.toBe(await look('selected', 'focused'));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await override(page, { [T('motion-state-duration')]: '' });
    expect(await css(end, 'transition-duration')).toBe('0s');
  });

  test('DTM-28: keyboard focus shows the ring around a range field without animation; pointer focus shows none', async ({ page }) => {
    await mount(page, [opened('r', { mode: 'time', range: true, start: '09:00', end: '17:30', hourCycle: 'h12' })]);
    await field(page, 'r', 'end').click();
    expect(await css(field(page, 'r', 'end'), 'outline-style')).toBe('none');
    await tabTo(page, field(page, 'r', 'start'));
    expect(await focused(page)).toBe('field:start');
    await expect.poll(() => css(field(page, 'r', 'start'), 'outline-style')).toBe('solid');
    expect(await css(field(page, 'r', 'start'), 'transition-property')).not.toContain('outline');
  });

  test('DTM-29: a range field’s press — a click, Enter, Space — shows at once and for at least press-hold', async ({ page }) => {
    const hold = 1000;
    for (const [name, activate] of [
      ['click', (p: P) => field(p, 'r', 'end').click()],
      ['Enter', (p: P) => p.keyboard.press('Enter')],
      ['Space', (p: P) => p.keyboard.press('Space')],
    ] as const) {
      await mount(page, [opened('r', { mode: 'time', range: true, start: '09:00', end: '17:30', hourCycle: 'h12' })]);
      await override(page, { '--tanrei-sys-motion-duration-press-hold': `${hold}ms` });
      await field(page, 'r', 'end').focus();
      await field(page, 'r', 'end').evaluate((el) => {
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
      await expect(field(page, 'r', 'end')).toHaveAttribute('aria-pressed', 'true');
    }
  });

  test('DTM-30: overlay (default), ripple (m3-like), dim (cupertino) and none each answer a range field’s press', async ({ page }) => {
    const pressed = async (system?: string, feedback?: string) => {
      await mount(page, [opened('r', { mode: 'time', range: true, start: '09:00', end: '17:30', hourCycle: 'h12' })], system ? { system } : {});
      if (feedback) await override(page, { '--tanrei-sys-behavior-pressed-feedback': feedback });
      await override(page, { [T('motion-state-duration')]: '0ms' });
      const f = field(page, 'r', 'end');
      await f.hover();
      await page.mouse.down();
      const result = { pressed: await f.getAttribute('data-pressed'), ripple: await f.locator('.ripple').count(), opacity: await css(f, 'opacity') };
      await page.mouse.up();
      return result;
    };
    expect(await pressed()).toMatchObject({ pressed: 'overlay', ripple: 0 });
    expect(await pressed('m3-like')).toMatchObject({ pressed: 'ripple', ripple: 1 });
    const dim = await pressed('cupertino');
    expect(dim).toMatchObject({ pressed: 'dim', ripple: 0 });
    expect(dim.opacity).toBe(await token(page, T('pressed-opacity')));
    expect(await pressed(undefined, 'none')).toMatchObject({ pressed: 'none', ripple: 0 });
  });

  test('DTM-36: where the picker is narrower than its parts the range fields narrow equally and wrap their text rather than cut it; enlarged text grows them', async ({ page }) => {
    await mount(page, [opened('r', { mode: 'time', range: true, start: '22:00', end: '06:00', hourCycle: 'h12', nextDayLabel: 'on the following day' })], { window: { width: 300, height: 720 } });
    const [start, end, display] = [field(page, 'r', 'start'), field(page, 'r', 'end'), host(page, 'r').locator('.range-display')];
    const [s, e, d, time] = [await bounds(start), await bounds(end), await bounds(display), await bounds(host(page, 'r').locator('.time'))];
    expect(d.width).toBeLessThanOrEqual(time.width + 0.5);
    expect(s.width).toBeCloseTo(e.width, 0);
    // The end's text wraps inside its field: taller than one line, and nothing cut.
    expect(e.height).toBeGreaterThan(await resolveToken(page, T('range-field-container-height')));
    expect(await end.evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    await expect(end).toHaveText('6:00 AM on the following day');
    // Enlarged text: the field grows to hold it.
    await mount(page, [opened('g', { mode: 'time', range: true, start: '09:00', end: '17:30', hourCycle: 'h12' })]);
    const before = await bounds(field(page, 'g', 'start'));
    await override(page, { [T('range-field-label-typescale-font')]: '500 40px/1.5 Inter' });
    const after = await bounds(field(page, 'g', 'start'));
    expect(after.height).toBeGreaterThan(before.height);
    expect(after.width).toBeGreaterThan(before.width);
  });
});

test.describe('bounds of the time', () => {
  test('DTM-49: min and max bound the time — a pending time outside them starts at the nearer bound and OK commits it; an hour or a period that leaves them moves the time into them; a date-time bound limits the times on its own day only; min is rounded up and max down to minuteStep; a bound in another form, a min after max and bounds with no time of the step between them are ignored and reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      modal('a', { mode: 'time', value: '07:30', hourCycle: 'h12', min: '09:00', max: '17:30' }),
      inline('b', { mode: 'time', value: '09:00', hourCycle: 'h12', min: '09:00', max: '17:30' }),
      inline('c', { mode: 'date-time', value: '2026-09-18T07:30', hourCycle: 'h23', min: '2026-09-17T09:00', max: '2026-09-30T17:00' }),
      inline('d', { mode: 'time', value: '12:00', hourCycle: 'h23', min: '09:07', max: '17:50', minuteStep: 15 }),
      inline('e', { mode: 'time', value: '07:30', hourCycle: 'h23', min: '2026-09-17' }),
      inline('f', { mode: 'time', value: '07:30', hourCycle: 'h23', min: '18:00', max: '09:00' }),
      inline('g', { mode: 'time', value: '07:30', hourCycle: 'h23', min: '09:50', max: '09:55', minuteStep: 15 }),
      inline('h', { mode: 'date-time', value: '2026-09-18T07:30', hourCycle: 'h23', min: '2026-09-17' }),
    ]);
    // Opened at 07:30 under a min of 09:00: the pending time is 9:00, and OK commits it.
    await open(page, 'a');
    await expect(wheel(page, 'a', 'hour')).toHaveAttribute('aria-valuenow', '9');
    await expect(wheel(page, 'a', 'minute')).toHaveAttribute('aria-valuenow', '0');
    await action(page, 'a', 'confirm').click();
    await expect.poll(() => log(page)).toEqual(['change:{"value":"09:00","start":"","end":""}:09:00||', 'close:confirm']);
    // 9:00 AM set to PM is 21:00, after a max of 17:30: the time is 5:30 PM.
    await period(page, 'b').focus();
    await page.keyboard.press('ArrowDown');
    await expect(wheel(page, 'b', 'hour')).toHaveAttribute('aria-valuetext', '5 PM');
    await expect(wheel(page, 'b', 'minute')).toHaveAttribute('aria-valuenow', '30');
    // The day after min's: 07:30 is offered. min's own day: the time moves to 09:00. The calendar ends before min's date.
    await expect(wheel(page, 'c', 'hour')).toHaveAttribute('aria-valuenow', '7');
    await expect(host(page, 'c').locator('tanrei-calendar')).toHaveJSProperty('min', '2026-09-17');
    await day(page, 'c', '2026-09-17').click();
    await expect(wheel(page, 'c', 'hour')).toHaveAttribute('aria-valuenow', '9');
    await expect(wheel(page, 'c', 'minute')).toHaveAttribute('aria-valuenow', '0');
    // 09:07 with a step of 15 offers 09:15 first; 17:50 offers 17:45 last.
    await wheel(page, 'd', 'hour').focus();
    await page.keyboard.press('Home');
    await expect(wheel(page, 'd', 'hour')).toHaveAttribute('aria-valuenow', '9');
    await expect(wheel(page, 'd', 'minute')).toHaveAttribute('aria-valuenow', '15');
    await page.keyboard.press('End');
    await expect(wheel(page, 'd', 'hour')).toHaveAttribute('aria-valuenow', '17');
    await expect(wheel(page, 'd', 'minute')).toHaveAttribute('aria-valuemax', '45');
    await wheel(page, 'd', 'minute').focus();
    await page.keyboard.press('End');
    await expect(wheel(page, 'd', 'minute')).toHaveAttribute('aria-valuenow', '45');
    // Ignored and reported: the time keeps 07:30.
    for (const id of ['e', 'f', 'g']) await expect(wheel(page, id, 'hour')).toHaveAttribute('aria-valuenow', '7');
    expect(seen.some((w) => w.includes('DTM-40') && w.includes('min "2026-09-17" is not a time of day'))).toBe(true);
    expect(seen.some((w) => w.includes('DTM-40') && w.includes('min "18:00" is after max "09:00"'))).toBe(true);
    expect(seen.some((w) => w.includes('DTM-40') && w.includes('no time of minuteStep 15 lies between'))).toBe(true);
    // A date alone in mode date-time bounds the dates, and not the times.
    await expect(host(page, 'h').locator('tanrei-calendar')).toHaveJSProperty('min', '2026-09-17');
    await day(page, 'h', '2026-09-17').click();
    await expect(wheel(page, 'h', 'hour')).toHaveAttribute('aria-valuenow', '7');
  });

  test('DTM-49: the picker never offers a time the Text field it opens from refuses — opened with the min and max of the field’s pickerRequest, every value it offers is accepted by the field, and the times just outside them are refused', async ({ page }) => {
    await mount(page, [modal('p', { mode: 'time', hourCycle: 'h23', minuteStep: 15, value: '12:00' })], {
      lead: '<tanrei-text-input id="field" type="time" locale="en-GB" label="Start" picker picker-label="Choose time" min="09:07" max="17:50"></tanrei-text-input>',
    });
    const field = page.locator('#field');
    // The product's side: the field's request configures the picker and opens it.
    await page.evaluate(() => {
      const picker = document.querySelector<any>('[data-fixture="p"] tanrei-date-time-picker');
      document.getElementById('field')!.addEventListener('pickerrequest', (event) => Object.assign(picker, { min: (event as CustomEvent).detail.min, max: (event as CustomEvent).detail.max, open: true }));
    });
    await field.locator('.picker-button button').click();
    await expect.poll(() => isOpen(page, 'p')).toBe(true);
    // Every value the picker offers: each available hour (Home, then Up Arrow until it wraps), and in each its available minutes.
    const offered: string[] = [];
    const two = (n: number) => String(n).padStart(2, '0');
    await wheel(page, 'p', 'hour').focus();
    await page.keyboard.press('Home');
    const firstHour = await now(wheel(page, 'p', 'hour'));
    for (let hour = firstHour, guard = 0; guard < 24; guard++) {
      await wheel(page, 'p', 'minute').focus();
      await page.keyboard.press('Home');
      const firstMinute = await now(wheel(page, 'p', 'minute'));
      for (let minute = firstMinute, steps = 0; steps < 4; steps++) {
        offered.push(`${two(hour)}:${two(minute)}`);
        await page.keyboard.press('ArrowUp');
        minute = await now(wheel(page, 'p', 'minute'));
        if (minute === firstMinute) break;
      }
      await wheel(page, 'p', 'hour').focus();
      await page.keyboard.press('ArrowUp');
      hour = await now(wheel(page, 'p', 'hour'));
      if (hour === firstHour) break;
    }
    expect(offered[0]).toBe('09:15');
    expect(offered.at(-1)).toBe('17:45');
    expect(offered).toHaveLength(35);
    await page.keyboard.press('Escape');
    await expect.poll(() => isOpen(page, 'p')).toBe(false);
    // The field, given each time as a person types it: every time the picker offers is accepted, and the times next to
    // them on the step, outside them, are refused.
    const accepts = async (time: string) => {
      await field.locator('[part="segment"]').first().click();
      await page.keyboard.type(time.replace(':', ''));
      return field.evaluate((el) => (el as any).value);
    };
    for (const time of offered) expect(await accepts(time), time).toBe(time);
    for (const time of ['09:00', '18:00']) expect(await accepts(time), time).toBe('');
  });

  test('DTM-50: hours, minutes and periods outside min and max keep their places, faded by the token, and are passed over — by the keys, a press on a row, a press on the dial and a typed entry; each spin button’s minimum and maximum are its first and last available values', async ({ page }) => {
    await mount(
      page,
      [
        inline('t', { mode: 'time', value: '17:30', hourCycle: 'h23', min: '09:15', max: '17:45', minuteStep: 15 }),
        inline('p', { mode: 'time', value: '10:00', hourCycle: 'h12', min: '09:00', max: '11:30' }),
        inline('d', { mode: 'time', value: '09:30', hourCycle: 'h12', entryMode: 'dial', min: '09:15', max: '17:45', minuteStep: 15 }),
      ],
      { window: { width: 480, height: 2000 } },
    );
    const faded = Number(await token(page, T('time-unavailable-opacity')));
    expect(faded).toBeGreaterThan(0);
    expect(faded).toBeLessThan(1);
    // The hour wheel keeps 18 in its place below 17, faded; 16 is not.
    const row = (id: string, unit: 'hour' | 'minute', text: string) => wheelBox(page, id, unit).locator('.row').filter({ hasText: new RegExp(`^${text}$`) }).first();
    await expect(row('t', 'hour', '18')).toHaveAttribute('data-unavailable', '');
    expect(Number(await css(row('t', 'hour', '18'), 'opacity'))).toBeCloseTo(faded, 2);
    await expect(row('t', 'hour', '16')).not.toHaveAttribute('data-unavailable');
    // The spin buttons' reach.
    await expect(wheel(page, 't', 'hour')).toHaveAttribute('aria-valuemin', '9');
    await expect(wheel(page, 't', 'hour')).toHaveAttribute('aria-valuemax', '17');
    await expect(wheel(page, 't', 'minute')).toHaveAttribute('aria-valuemin', '0');
    await expect(wheel(page, 't', 'minute')).toHaveAttribute('aria-valuemax', '45');
    // Up Arrow from 17 passes over 18 … 08 to 9; Down Arrow back to 17.
    await wheel(page, 't', 'hour').focus();
    await page.keyboard.press('ArrowUp');
    await expect(wheel(page, 't', 'hour')).toHaveAttribute('aria-valuenow', '9');
    await expect(wheel(page, 't', 'minute')).toHaveAttribute('aria-valuenow', '30');
    await page.keyboard.press('ArrowDown');
    await expect(wheel(page, 't', 'hour')).toHaveAttribute('aria-valuenow', '17');
    await page.keyboard.press('Home');
    await expect(wheel(page, 't', 'hour')).toHaveAttribute('aria-valuenow', '9');
    // In hour 9 the minute 00 is unavailable: Home is 15, Down Arrow from 15 wraps to 45.
    await expect(wheel(page, 't', 'minute')).toHaveAttribute('aria-valuemin', '15');
    await wheel(page, 't', 'minute').focus();
    await page.keyboard.press('Home');
    await expect(wheel(page, 't', 'minute')).toHaveAttribute('aria-valuenow', '15');
    await page.keyboard.press('ArrowDown');
    await expect(wheel(page, 't', 'minute')).toHaveAttribute('aria-valuenow', '45');
    // A typed hour or minute outside them keeps the value before.
    await wheel(page, 't', 'hour').focus();
    await page.keyboard.type('20');
    await expect(wheel(page, 't', 'hour')).toHaveAttribute('aria-valuenow', '9');
    await wheel(page, 't', 'minute').focus();
    await page.keyboard.type('00');
    await expect(wheel(page, 't', 'minute')).toHaveAttribute('aria-valuenow', '45');
    // A press on the row above the hour's — 8, unavailable — settles back on 9.
    const box = await bounds(wheelBox(page, 't', 'hour'));
    const rowHeight = (await bounds(wheelBox(page, 't', 'hour').locator('.row.on'))).height;
    await expect(wheelBox(page, 't', 'hour').locator('.row.on')).toHaveText('09');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2 - rowHeight);
    // The rows go where they settle at once (the value is taken once they have): to 9, not to 8.
    await expect(wheelBox(page, 't', 'hour').locator('.row.on')).toHaveText('09');
    await expect(wheel(page, 't', 'hour')).toHaveAttribute('aria-valuenow', '9');
    // A press on the row below — 10, available — settles there.
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2 + rowHeight);
    await expect.poll(() => now(wheel(page, 't', 'hour'))).toBe(10);
    // The period: PM has no time before 11:30 — faded, and the keys, the letter and a press on it change nothing.
    const pm = periodBox(page, 'p').locator('.row').nth(1);
    await expect(pm).toHaveAttribute('data-unavailable', '');
    await expect(period(page, 'p')).toHaveAttribute('aria-valuemax', '0');
    await period(page, 'p').focus();
    for (const key of ['ArrowDown', 'End', 'p']) await page.keyboard.press(key);
    await expect(period(page, 'p')).toHaveAttribute('aria-valuetext', 'AM');
    // The dial: 3 (AM) is faded; a press on it takes the nearest available hour, 11.
    const three = host(page, 'd').locator('.face .numbers.hours .number').filter({ hasText: /^3$/ });
    await expect(three).toHaveAttribute('data-unavailable', '');
    expect(Number(await css(three, 'opacity'))).toBeCloseTo(faded, 2);
    const at = await bounds(three);
    await page.mouse.click(at.x + at.width / 2, at.y + at.height / 2);
    await expect(selector(page, 'd', 'hour')).toHaveAttribute('aria-valuenow', '11');
  });
});

test.describe('accessibility', () => {
  // A test per fixture — each alone in its window, a docked one open from its anchor — and so a page per fixture, of
  // two mounts (light, dark). One page that mounted all 31 fixtures in both themes (62 mounts, each document carrying
  // the bundle, the tokens and the 7 MB icon face inline) grew WebKit's web process on Linux from 0.5 GB to 2.2 GB, and
  // under that pressure a later mount had no loaded icon face (its glyphs drawn as their names, on CI) or the page
  // crashed (in a 4 GB container). A page closed after its test frees what its mounts held.
  for (const fixture of spec.fixtures) {
    test(`no axe violations in light and dark, the fixture alone: ${fixture.id}`, async ({ page }) => {
      await page.setViewportSize(pickerWindow(fixture));
      for (const theme of ['light', 'dark'] as const) {
        await mountFixtures(page, spec, { theme, icons: true, fixtures: [fixture] });
        await page.waitForTimeout(300);
        const results = await new AxeBuilder({ page }).include('.stage').analyze();
        expect(results.violations, `${fixture.id} ${theme}: ${results.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(' ')}`).join(', ')}`).toEqual([]);
      }
    });
  }
});

test.describe('fixtures', () => {
  for (const fixture of spec.fixtures) {
    test(`snapshot: ${fixture.id}`, async ({ page }) => {
      await page.setViewportSize(pickerWindow(fixture));
      await mountFixtures(page, spec, { icons: true, fixtures: [fixture] });
      if (fixture.props.presentation === 'docked') {
        await expect(page.locator(`[data-fixture="${fixture.id}"]`)).toHaveScreenshot([spec.name, `${fixture.id}.png`]);
        return;
      }
      await expect.poll(() => isOpen(page, fixture.id)).toBe(true);
      await settle(page, fixture.id);
      await expect(page).toHaveScreenshot([spec.name, `${fixture.id}.png`]);
    });
  }
});
