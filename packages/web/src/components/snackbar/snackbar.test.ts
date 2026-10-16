// <tanrei-snackbar> and <tanrei-snackbar-host>, driven by specs/snackbar.spec.json: every behaviour id (SNK-1…30) is
// cited by a test title, every fixture has a baseline (drawn in place, SNK-19), and every value is read back from the
// tokens — never from a number written here.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, acmeSystemCss, iconFaceArrives, innerStrokeAtEdges, loadSpec, mountFixtures, resolveColor, resolveToken, tab, tabTo, withoutIconFont, rootTokens, rootTokensInPage } from '../../../test/harness.js';
import { motionEnded } from '../../../test/motions.js';
import { holdClock, releaseClock } from '../../../test/page-clock.js';
import { attachPressLog, logPresses, notePress } from '../../../test/press-log.js';
import { clickCentre, heldPress } from '../../../test/watched-press.js';

const spec = loadSpec('snackbar');
type P = Page;
const bar = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-snackbar`);
const part = (page: P, id: string, name: string) => bar(page, id).locator(`.${name}`);
const css = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const T = (name: string) => `--tanrei-comp-snackbar-${name}`;
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
const f = (id: string, props: Fixture['props']): Fixture => ({ id, props: { message: 'Conversation archived', ...props } });
const fixture = (id: string) => spec.fixtures.find((x) => x.id === id)!;
/** A message longer than three lines at any width a snackbar has (expanded-scrolls'), and a title. */
const LONG = fixture('expanded-scrolls').props.message as string;
const TITLE = fixture('expanded-scrolls').props.title as string;
/** Every control at once: the action on its own row, the expand button and the close button. */
const all = f('all', { title: TITLE, message: LONG, action: 'Undo', closable: true, closeLabel: 'Close', expandLabel: 'Show full message' });
const STATUS_GLYPHS = { info: 'info', warning: 'warning', error: 'error', success: 'check_circle' } as const;
/** Every scheme: light and dark, each at standard, medium and high contrast. */
const SCHEMES = (['light', 'dark'] as const).flatMap((theme) => ['', 'medium', 'high'].map((contrast) => ({ theme, contrast })));
/** Every action, dismiss and expandedchange the drawn-in-place snackbars fire, as `<fixture>:action`, `<fixture>:dismiss:<reason>` or `<fixture>:expandedchange:<expanded>`. */
const wire = (page: P) =>
  page.evaluate(() => {
    const log: string[] = ((window as any).log = []);
    for (const s of document.querySelectorAll<any>('[data-fixture] tanrei-snackbar')) {
      const id = s.closest('[data-fixture]').dataset.fixture;
      s.addEventListener('action', () => log.push(`${id}:action`));
      s.addEventListener('dismiss', (e: CustomEvent) => log.push(`${id}:dismiss:${e.detail.reason}`));
      s.addEventListener('expandedchange', (e: CustomEvent) => log.push(`${id}:expandedchange:${e.detail.expanded}`));
    }
  });
/** The four statuses that have a form of their own. */
const STATUSES = ['info', 'warning', 'error', 'success'] as const;
/** A form's prefix (SNK-21, SNK-30): none, `<status>`, `inverse` or `inverse-<status>`. */
const formOf = (props: Fixture['props']) => [props.inverse === true ? 'inverse' : '', props.status && props.status !== 'default' ? String(props.status) : ''].filter(Boolean).join('-');
/** A bar part's token in a form (`inverse-info-container-color`), and a control part's (`action-inverse-info-content-color`). */
const barToken = (form: string, name: string) => T(`${form ? `${form}-` : ''}${name}`);
const controlToken = (control: 'action' | 'close', form: string, name: string, state = '') => T([control, state, form, name].filter(Boolean).join('-'));
/**
 * SNK-21, SNK-30: a fixture draws its bar, title, message, glyph and controls at rest from its own form's tokens. Colors
 * are read with motion reduced, so a control is not caught between two schemes' colors.
 */
async function readsForm(page: P, id: string, props: Fixture['props'], at: string) {
  const form = formOf(props);
  expect(await css(part(page, id, 'bar'), 'background-color'), `${at} bar`).toBe(await resolveColor(page, barToken(form, 'container-color')));
  // The message: its form's color, at the opacity SNK-32 gives it under a title, whole without one.
  expectFaded(await css(part(page, id, 'message'), 'color'), await resolveColor(page, barToken(form, 'supporting-text-color')), props.title ? await opacityToken(page, 'supporting-text-under-title-opacity') : 1, `${at} message`);
  if (props.title) expect(await css(part(page, id, 'title'), 'color'), `${at} title`).toBe(await resolveColor(page, barToken(form, 'title-color')));
  // The glyph: its form's icon color at icon.opacity (SNK-21).
  if (props.status && props.status !== 'default') expectFaded(await css(part(page, id, 'status'), 'color'), await resolveColor(page, barToken(form, 'icon-color')), await opacityToken(page, 'icon-opacity'), `${at} glyph`);
  for (const [name, control, shown] of [['action', 'action', !!props.action], ['close', 'close', !!props.closable], ['expand', 'close', await part(page, id, 'expand').count() > 0]] as const) {
    if (!shown) continue;
    const c = part(page, id, name);
    expect(await css(c, 'background-color'), `${at} ${name} container`).toBe(await resolveColor(page, controlToken(control, form, 'container-color')));
    expect(await css(c, 'color'), `${at} ${name} content`).toBe(await resolveColor(page, controlToken(control, form, 'content-color')));
  }
}
/** Each scheme in turn, the fixtures mounted in it with motion reduced. */
async function eachScheme(page: P, options: Parameters<typeof mountFixtures>[2], run: (scheme: string) => Promise<void>) {
  for (const { theme, contrast } of SCHEMES) {
    await mountFixtures(page, spec, { icons: true, ...options, theme, reducedMotion: true });
    if (contrast) await page.evaluate((c) => document.documentElement.setAttribute('data-tanrei-contrast', c), contrast);
    await run(`${theme}${contrast ? `-${contrast}` : ''}`);
  }
}
/** The relative luminance contrast of two `rgb()` colors (WCAG). */
const contrastOf = (a: string, b: string) => {
  const lum = (c: string) => {
    const [r, g, bl] = c.match(/[\d.]+/g)!.slice(0, 3).map((v) => {
      const x = Number(v) / 255;
      return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** A computed color — `rgb()`, `rgba()` or `color(srgb …)` — as its channels (0–255) and its alpha. */
const rgba = (color: string) => {
  const n = color.match(/-?\d*\.?\d+(?:e-?\d+)?/g)!.map(Number);
  const scale = color.trim().startsWith('color(') ? 255 : 1;
  return { rgb: n.slice(0, 3).map((v) => v * scale), a: n[3] ?? 1 };
};
/** `top` composited over the opaque `under`, as the screen shows it. */
const over = (top: string, under: string) => {
  const [t, u] = [rgba(top), rgba(under)];
  return `rgb(${t.rgb.map((v, i) => v * t.a + u.rgb[i] * (1 - t.a)).join(', ')})`;
};
/** Both colors seen through an element's `opacity` over `under` (a state's opacity fades the whole control). */
const through = (color: string, opacity: number, under: string) => over(`rgba(${rgba(color).rgb.join(', ')}, ${opacity})`, under);
/**
 * SNK-21, SNK-31, SNK-32, SNK-33: `drawn` is `color` at `opacity` — the color's own channels with that alpha, which is
 * how an opacity of one part's color is drawn (never the element's `opacity`).
 */
function expectFaded(drawn: string, color: string, opacity: number, at: string) {
  const [d, c] = [rgba(drawn), rgba(color)];
  expect(d.a, `${at}: alpha of ${drawn}`).toBeCloseTo(c.a * opacity, 3);
  if (opacity > 0) d.rgb.forEach((v, i) => expect(Math.abs(v - c.rgb[i]), `${at}: ${drawn} is ${color} at ${opacity}`).toBeLessThan(0.6));
}
const opacityToken = async (page: P, name: string) => Number(await token(page, T(name)));
/** Many tokens' colors at once, in the page's current scheme. */
const resolveColors = (page: P, names: string[]) =>
  page.evaluate((ns) => {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden';
    document.body.appendChild(probe);
    const values = ns.map((n) => {
      probe.style.backgroundColor = `var(${n})`;
      return getComputedStyle(probe).backgroundColor;
    });
    probe.remove();
    return values;
  }, names);
/** The layers of a computed `box-shadow`, split at the commas outside a color. */
const shadowLayers = (shadow: string) => shadow.split(/,(?![^(]*\))/).map((layer) => layer.trim());
/** One layer's color and its lengths (x, y, blur, spread), whichever comes first in the engine's serialization. */
const shadowLayer = (layer: string) => {
  const color = layer.match(/(?:rgba?|color)\([^)]*\)/)![0];
  return { color, lengths: layer.replace(color, '').trim().split(/\s+/).map((v) => Number.parseFloat(v)) };
};
/** The action's tonal layer (SNK-33): the pseudo-element under its label. */
const tonalLayer = (control: Locator) =>
  control.evaluate((el) => {
    const hold = el.querySelector('.hold')!;
    const s = getComputedStyle(hold, '::before');
    const drawn = s.content !== 'none' && s.display !== 'none';
    return { drawn, color: s.backgroundColor, size: [Number.parseFloat(s.width), Number.parseFloat(s.height)], position: s.position, z: s.zIndex, events: s.pointerEvents, radius: s.borderTopLeftRadius };
  });
/** The ten forms (SNK-21, SNK-30), each with a title, a message and an action: `ten-<form>`, the default's `ten-default`. */
const TEN = [false, true].flatMap((inverse) =>
  (['default', ...STATUSES] as const).map((status) => {
    const props = { title: 'Draft deleted', message: 'The draft was moved to the bin.', action: 'Undo', ...(status === 'default' ? {} : { status, statusLabel: 'Status' }), ...(inverse ? { inverse: true } : {}) };
    return { id: `ten-${formOf(props) || 'default'}`, props } as Fixture;
  }),
);
/** The shadow root's focused element, by its part name. */
const focusedPart = (locator: Locator) => locator.evaluate((el) => el.shadowRoot!.activeElement?.getAttribute('part') ?? null);
const log = (page: P) => page.evaluate(() => (window as any).log as string[]);

// ── A host ─────────────────────────────────────────────────────────────────────────────────────────────────────────

/** A page with some content, a button before the host, and the host last; short timeouts so timing is observable. */
async function mountHost(page: P, timeouts = { short: '600ms', long: '1200ms' }) {
  await mountFixtures(page, spec, { icons: true, fixtures: [] });
  await override(page, { [T('timeout-short')]: timeouts.short, [T('timeout-long')]: timeouts.long });
  await page.evaluate(() => {
    const main = document.querySelector('main')!;
    main.insertAdjacentHTML('beforeend', '<p>Content</p><button id="before">Before</button><tanrei-snackbar-host></tanrei-snackbar-host>');
    (window as any).results = [];
  });
  await page.waitForFunction(() => !!document.querySelector('tanrei-snackbar-host')?.shadowRoot);
}
const host = (page: P) => page.locator('tanrei-snackbar-host');
const shown = (page: P) => host(page).locator('tanrei-snackbar');
/** Asks the host for a snackbar; its result lands in window.results, in order. */
const show = (page: P, options: Record<string, unknown>) =>
  page.evaluate((o) => {
    const h: any = document.querySelector('tanrei-snackbar-host');
    void h.show(o).then((r: unknown) => (window as any).results.push({ message: o.message, ...(r as object) }));
  }, options);
const results = (page: P) => page.evaluate(() => (window as any).results as Record<string, string>[]);
const showing = (page: P) => page.evaluate(() => [...document.querySelectorAll<any>('tanrei-snackbar-host tanrei-snackbar')].filter((s) => s.matches(':popover-open')).map((s) => s.message));

test.describe('host', () => {
  test('SNK-1: the action emits action once and closes; the close button emits dismiss with close once and closes; by pointer, Enter and Space', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    await wire(page);
    await part(page, 'action-closable', 'action').click();
    await part(page, 'action-closable', 'close').click();
    await part(page, 'action', 'action').focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    expect(await log(page)).toEqual(['action-closable:action', 'action-closable:dismiss:close', 'action:action', 'action:action']);
    // Shown by a host: it closes, and its request resolves with how.
    await mountHost(page);
    await show(page, { message: 'Archived', action: 'Undo' });
    await expect.poll(() => showing(page)).toEqual(['Archived']);
    await shown(page).locator('.action').click();
    await expect.poll(() => results(page)).toEqual([{ message: 'Archived', result: 'action' }]);
    await expect(shown(page)).toHaveCount(0);
    await show(page, { message: 'Printer', closable: true, closeLabel: 'Close' });
    await expect.poll(() => showing(page)).toEqual(['Printer']);
    await shown(page).locator('.close').focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => results(page)).toEqual([
      { message: 'Archived', result: 'action' },
      { message: 'Printer', result: 'dismiss', reason: 'close' },
    ]);
  });

  test('SNK-8: auto is short without an action and indefinite with one; short and long close after their tokens with the reason timeout; indefinite stays', async ({ page }) => {
    await mountHost(page);
    const timeouts = await shownTimeouts(page);
    expect(timeouts).toEqual({ auto: 600, autoAction: null, short: 600, long: 1200, indefinite: null });
    // The timeouts run on the page's clock, held still and moved on by the test: there at 599 ms, closed at 600.
    await holdClock(page);
    await show(page, { message: 'Saved' });
    await expect.poll(() => showing(page)).toEqual(['Saved']);
    await page.clock.runFor(599);
    expect(await results(page)).toEqual([]);
    expect(await showing(page)).toEqual(['Saved']);
    await page.clock.runFor(1);
    await expect.poll(() => results(page)).toEqual([{ message: 'Saved', result: 'dismiss', reason: 'timeout' }]);
    await show(page, { message: 'Archived', action: 'Undo' });
    await expect.poll(() => showing(page)).toEqual(['Archived']);
    await page.clock.runFor(60_000);
    expect(await showing(page)).toEqual(['Archived']);
    await host(page).evaluate((h: any) => h.dismissCurrent());
    await show(page, { message: 'Long', duration: 'long' });
    await expect.poll(() => showing(page)).toEqual(['Long']);
    await page.clock.runFor(1199);
    expect(await showing(page)).toEqual(['Long']);
    expect(await results(page)).not.toContainEqual(expect.objectContaining({ message: 'Long' }));
    await page.clock.runFor(1);
    await expect.poll(() => results(page)).toContainEqual({ message: 'Long', result: 'dismiss', reason: 'timeout' });
    await releaseClock(page);
    // The tokens' own values.
    await mountFixtures(page, spec, { fixtures: [f('a', {})] });
    expect(await bar(page, 'a').evaluate((el: any) => el.timeout)).toBe(await resolveToken(page, T('timeout-short'), 'duration'));
    await bar(page, 'a').evaluate((el: any) => (el.duration = 'long'));
    await expect.poll(() => bar(page, 'a').evaluate((el: any) => el.timeout)).toBe(await resolveToken(page, T('timeout-long'), 'duration'));
  });

  test('SNK-9: the timeout pauses while hovered, while focus is inside and while the window is hidden, and starts again from its whole length', async ({ page }) => {
    await mountHost(page);
    // The timeout runs on the page's clock, held still and moved on by the test: no time passes between two steps, a
    // pause is asked for far longer than the timeout, and "the whole length again" at one millisecond short of it.
    await holdClock(page);
    await show(page, { message: 'Saved', closable: true, closeLabel: 'Close' });
    await expect.poll(() => showing(page)).toEqual(['Saved']);
    await page.clock.runFor(599); // all but the last millisecond is spent, and none of it counts after a pause
    await shown(page).locator('.bar').hover();
    await page.clock.runFor(10_000);
    expect(await showing(page)).toEqual(['Saved']);
    await page.mouse.move(0, 0);
    await page.clock.runFor(599); // less than the whole 600 after leaving
    expect(await showing(page)).toEqual(['Saved']);
    await shown(page).locator('.close').focus();
    await page.clock.runFor(10_000);
    expect(await showing(page)).toEqual(['Saved']);
    await page.locator('#before').focus();
    // Hidden window: paused, then the whole length again.
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.clock.runFor(10_000);
    expect(await showing(page)).toEqual(['Saved']);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.clock.runFor(599);
    expect(await showing(page)).toEqual(['Saved']);
    expect(await results(page)).toEqual([]);
    await page.clock.runFor(1);
    await expect.poll(() => results(page)).toEqual([{ message: 'Saved', result: 'dismiss', reason: 'timeout' }]);
  });

  test('SNK-10: statusLabel, the title, the whole message, then the action’s label, announced once — politely for default, info and success, assertively for warning and error — and focus does not move', async ({ page }) => {
    await mountHost(page);
    await page.locator('#before').focus();
    const polite = host(page).locator('.announce[role="status"]');
    const assertive = host(page).locator('.announce[role="alert"]');
    // Both regions are in the document before the first snackbar.
    await expect(polite).toHaveAttribute('aria-live', 'polite');
    await expect(assertive).toHaveAttribute('aria-live', 'assertive');
    await show(page, { message: 'Conversation archived', action: 'Undo' });
    await expect(polite).toHaveText('Conversation archived. Undo');
    await expect(assertive).toHaveText('');
    await expect(page.locator('#before')).toBeFocused();
    // The snackbar itself is not a live region: the message is announced once.
    expect(await shown(page).evaluate((el) => el.closest('[aria-live]') === null && el.shadowRoot!.querySelectorAll('[aria-live], [role="status"], [role="alert"]').length === 0)).toBe(true);
    for (const status of ['info', 'warning', 'error', 'success'] as const) {
      await host(page).evaluate((h: any) => h.dismissCurrent());
      await expect.poll(() => showing(page)).toEqual([]);
      await show(page, { status, statusLabel: `Label ${status}`, title: 'Message not sent', message: 'Check your connection and try again.', action: 'Retry' });
      const [loud, quiet] = status === 'warning' || status === 'error' ? [assertive, polite] : [polite, assertive];
      await expect(loud, status).toHaveText(`Label ${status}. Message not sent. Check your connection and try again. Retry`);
      await expect(quiet, status).toHaveText('');
      await expect(page.locator('#before')).toBeFocused();
    }
    // The whole message, even while a collapsed snackbar cuts it.
    await host(page).evaluate((h: any) => h.dismissCurrent());
    await show(page, { title: TITLE, message: LONG, expandLabel: 'Show full message', duration: 'indefinite' });
    await expect(polite).toHaveText(`${TITLE}. ${LONG}`);
    await expect.poll(() => shown(page).locator('.expand').count()).toBe(1);
  });

  test('SNK-9: the timeout also pauses while the snackbar is expanded, and starts again from its whole length once it is collapsed', async ({ page }) => {
    await mountHost(page);
    await page.mouse.move(0, 0);
    // The timeout runs on the page's clock, held still and moved on by the test.
    await holdClock(page);
    await show(page, { title: TITLE, message: LONG, expandLabel: 'Show full message', duration: 'long' });
    await expect.poll(() => showing(page)).toEqual([LONG]);
    await expect.poll(() => shown(page).locator('.expand').count()).toBe(1);
    await page.clock.runFor(1199); // all but the last millisecond is spent, and none of it counts after the pause
    const expand = (expanded: boolean) =>
      host(page).evaluate(async (h: any, to) => {
        h.snackbar.expanded = to;
        await h.snackbar.updateComplete;
      }, expanded);
    await expand(true);
    await page.clock.runFor(10_000); // far longer than the long timeout: paused
    expect(await showing(page)).toEqual([LONG]);
    await expand(false);
    await page.clock.runFor(1199); // less than the whole 1200 after collapsing
    expect(await showing(page)).toEqual([LONG]);
    expect(await results(page)).toEqual([]);
    await page.clock.runFor(1);
    await expect.poll(() => results(page)).toEqual([{ message: LONG, result: 'dismiss', reason: 'timeout' }]);
  });

  test('SNK-11, SNK-25: while the expanded text scrolls, the focus order is the text, the action, the expand button, the close button', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 320 });
    await mountHost(page);
    await show(page, { title: TITLE, message: LONG, action: 'Review', closable: true, closeLabel: 'Close', expandLabel: 'Show full message', duration: 'indefinite' });
    await expect.poll(() => showing(page)).toEqual([LONG]);
    await expect.poll(() => shown(page).locator('.expand').count()).toBe(1);
    await host(page).evaluate((h: any) => (h.snackbar.expanded = true));
    await expect(shown(page).locator('.text')).toHaveAttribute('tabindex', '0');
    // Held to the window less the margin above and below.
    const margin = await resolveToken(page, T('container-margin'));
    await expect.poll(async () => (await bounds(shown(page).locator('.bar'))).height).toBeLessThanOrEqual(320 - 2 * margin + 0.5);
    await tabTo(page, page.locator('#before'));
    const order: (string | null)[] = [];
    for (let i = 0; i < 4; i++) {
      await tab(page);
      order.push(await focusedPart(shown(page)));
    }
    expect(order).toEqual(['text', 'action', 'expand', 'close']);
  });

  test('SNK-24: in a host the bar grows upwards and shrinks back, its bottom edge in place', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await mountHost(page);
    await show(page, { title: TITLE, message: LONG, expandLabel: 'Show full message', duration: 'indefinite' });
    await expect.poll(() => showing(page)).toEqual([LONG]);
    await expect.poll(() => shown(page).locator('.expand').count()).toBe(1);
    // At rest before it is measured: the entrance has ended (it rises in from below, so a box read during it is lower).
    await motionEnded(shown(page));
    const before = await bounds(shown(page).locator('.bar'));
    // On its way: the bar's own motion, begun by a press on the expand button, is held half way through its time in
    // the task that begins it, the bar read there, and the motion let go. (Read 100 ms and an answer after a click, a
    // slow runner read the bar at rest, and the reading said nothing of the way.)
    const during = await shown(page).evaluate(async (el: any) => {
      const barEl = el.shadowRoot.querySelector('.bar') as HTMLElement;
      (el.shadowRoot.querySelector('.expand') as HTMLElement).click();
      await el.updateComplete;
      const motions = barEl.getAnimations();
      if (motions.length !== 1) throw new Error(`the bar runs ${motions.length} motions after a press on its expand button`);
      motions[0].pause();
      motions[0].currentTime = Number(motions[0].effect!.getComputedTiming().duration) / 2;
      const box = barEl.getBoundingClientRect();
      motions[0].play();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    });
    expect(during.height, 'half way: taller than collapsed').toBeGreaterThan(before.height + 1);
    await motionEnded(shown(page).locator('.bar'));
    const after = await bounds(shown(page).locator('.bar'));
    expect(after.height).toBeGreaterThan(before.height);
    expect(during.height, 'half way: not yet expanded').toBeLessThan(after.height - 1);
    for (const box of [during, after]) expect(box.y + box.height).toBeCloseTo(before.y + before.height, 0);
    await shown(page).locator('.expand').click();
    await expect.poll(async () => (await bounds(shown(page).locator('.bar'))).height).toBeCloseTo(before.height, 0);
    const back = await bounds(shown(page).locator('.bar'));
    expect(back.y + back.height).toBeCloseTo(before.y + before.height, 0);
  });

  test('SNK-11: the controls are in the focus order at the host’s place; Escape inside dismisses with escape; closing returns focus to where it was', async ({ page }) => {
    await mountHost(page);
    await show(page, { message: 'Archived', action: 'Undo', closable: true, closeLabel: 'Close' });
    await expect.poll(() => showing(page)).toEqual(['Archived']);
    await tabTo(page, page.locator('#before'));
    await tab(page);
    expect(await page.evaluate(() => (document.activeElement as any)?.localName)).toBe('tanrei-snackbar');
    expect(await shown(page).evaluate((el) => el.shadowRoot!.activeElement?.className)).toContain('action');
    await page.keyboard.press('Escape');
    await expect.poll(() => results(page)).toEqual([{ message: 'Archived', result: 'dismiss', reason: 'escape' }]);
    await expect(page.locator('#before')).toBeFocused();
    // Where that element is gone, focus goes to the platform's default (the body).
    await show(page, { message: 'Again', action: 'Undo' });
    await expect.poll(() => showing(page)).toEqual(['Again']);
    await page.locator('#before').focus();
    await tab(page);
    await page.locator('#before').evaluate((el) => el.remove());
    await page.keyboard.press('Enter');
    await expect.poll(() => results(page)).toHaveLength(2);
    expect(await page.evaluate(() => document.activeElement?.localName)).toBe('body');
  });

  test('SNK-12: one at a time, in order, each resolving when it closes; dismissCurrent closes the showing one and the next shows; clear drops the rest', async ({ page }) => {
    await mountHost(page);
    for (const message of ['One', 'Two', 'Three', 'Four']) await show(page, { message, action: 'Undo' });
    await expect.poll(() => showing(page)).toEqual(['One']);
    await host(page).evaluate((h: any) => h.dismissCurrent());
    await expect.poll(() => showing(page)).toEqual(['Two']);
    await shown(page).locator('.action').click();
    await expect.poll(() => showing(page)).toEqual(['Three']);
    await host(page).evaluate((h: any) => h.clear());
    await expect.poll(() => results(page)).toHaveLength(4);
    expect(await results(page)).toEqual([
      { message: 'One', result: 'dismiss', reason: 'host' },
      { message: 'Two', result: 'action' },
      { message: 'Four', result: 'dismiss', reason: 'host' },
      { message: 'Three', result: 'dismiss', reason: 'host' },
    ]);
    await expect.poll(() => showing(page)).toEqual([]);
  });

  test('SNK-9, SNK-12, SNK-13: under a Tanrei modal dialog the showing snackbar pauses and is drawn below the dialog and its scrim; one not yet shown waits until the dialog closes', async ({ page }) => {
    await mountHost(page);
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<tanrei-dialog headline="Discard draft?"><tanrei-button slot="actions" variant="text">OK</tanrei-button></tanrei-dialog>'));
    const dialog = page.locator('tanrei-dialog');
    const setOpen = (open: boolean) =>
      dialog.evaluate(async (el: any, to) => {
        el.open = to;
        await el.updateComplete;
      }, open);
    // The timeout runs on the page's clock, held still and moved on by the test.
    await holdClock(page);
    await show(page, { message: 'Saved' });
    await expect.poll(() => showing(page)).toEqual(['Saved']);
    await page.clock.runFor(599); // all but the last millisecond is spent, and none of it counts after the pause
    await setOpen(true);
    await page.clock.runFor(10_000); // far longer than the timeout: paused
    expect(await showing(page)).toEqual(['Saved']);
    // Measured at rest, as the point is tested later: the snackbar's entrance and the dialog's opening have ended (a box
    // read while the bar still rises in from below names a point under the window's edge, where nothing is hit).
    await motionEnded(page);
    const b = await bounds(shown(page).locator('.bar'));
    expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.localName, [b.x + 4, b.y + b.height / 2])).toBe('tanrei-dialog');
    await show(page, { message: 'Next', action: 'Undo' });
    await setOpen(false);
    await page.clock.runFor(599); // the whole timeout again, from the dialog's closing
    expect(await showing(page)).toEqual(['Saved']);
    await page.clock.runFor(1);
    await expect.poll(() => showing(page)).toEqual(['Next']);
    await host(page).evaluate((h: any) => h.dismissCurrent());
    await expect.poll(() => showing(page)).toEqual([]);
    // Asked for while a dialog is open: it waits for the dialog, however long.
    await setOpen(true);
    await show(page, { message: 'Third', action: 'Undo' });
    await page.clock.runFor(10_000);
    expect(await showing(page)).toEqual([]);
    await releaseClock(page);
    await setOpen(false);
    await expect.poll(() => showing(page)).toEqual(['Third']);
  });

  test('SNK-13: at the bottom of the window, centred, the margin above the bottom edge and from the sides, above the content', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await mountHost(page);
    await show(page, { message: 'Conversation archived', action: 'Undo' });
    await expect.poll(() => showing(page)).toEqual(['Conversation archived']);
    // Where it rests: its entrance, which rises in from below, has ended.
    await motionEnded(shown(page));
    const margin = await resolveToken(page, T('container-margin'));
    const b = await bounds(shown(page).locator('.bar'));
    expect(b.y + b.height).toBeCloseTo(600 - margin, 0);
    expect(b.x + b.width / 2).toBeCloseTo(400, 0);
    expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.localName, [b.x + 4, b.y + 4])).toBe('tanrei-snackbar');
    // A narrow window: the margin from the sides.
    await page.setViewportSize({ width: 300, height: 600 });
    await expect.poll(async () => (await bounds(shown(page).locator('.bar'))).x).toBeCloseTo(margin, 0);
    expect((await bounds(shown(page).locator('.bar'))).width).toBeCloseTo(300 - 2 * margin, 0);
  });

  test('SNK-17: it rises in from below by its height plus its margin while fading in, fades out in place, and the next shows after; only the fade where motion is reduced', async ({ page }) => {
    await mountHost(page);
    // Both motions at 40 s, the exit ended by hand: the entrance's keyframes are read from the running animation four
    // answers after the show, and One is found 'still fading out' three answers and 300 ms after it is dismissed — at
    // 1 s each, a runner that takes 250 ms an answer found the entrance over and Two in One's place.
    await override(page, { [T('motion-enter-duration')]: '40s', [T('motion-exit-duration')]: '40s' });
    await show(page, { message: 'One', action: 'Undo' });
    await show(page, { message: 'Two', action: 'Undo' });
    await expect.poll(() => showing(page)).toEqual(['One']);
    const s = shown(page).first();
    expect(await css(s, 'animation-name')).toBe('snackbar-in');
    expect(await css(s, 'animation-duration')).toBe('40s');
    const [translate] = await s.evaluate((el) => (el.getAnimations()[0].effect as KeyframeEffect).getKeyframes().map((k) => k.translate));
    // Its own height (100% of the element) plus its margin, below where it rests.
    expect(translate).toMatch(/^0px calc\(100% \+ /);
    expect(await s.evaluate((el) => getComputedStyle(el).getPropertyValue('--tanrei-comp-snackbar-container-margin').trim())).not.toBe('');
    await host(page).evaluate((h: any) => h.dismissCurrent());
    expect(await css(s, 'animation-name')).toBe('snackbar-out');
    await page.waitForTimeout(300);
    expect(await showing(page)).toEqual(['One']); // still fading out, Two waits
    expect(await css(s, 'animation-duration')).toBe('40s');
    await s.evaluate((el) => el.getAnimations().forEach((animation) => animation.finish()));
    await expect.poll(() => showing(page)).toEqual(['Two']);
    await override(page, { [T('motion-enter-duration')]: '1s', [T('motion-exit-duration')]: '1s' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // Three shows once Two has faded out (1 s), and its own entrance lasts 1 s: read it when it starts, in the page. A
    // command sent after the poll below sees it can arrive after the entrance has ended (the poll's intervals alone put
    // its last look some 850 ms into it, and a loaded runner adds the rest).
    await host(page).evaluate((h) => {
      (window as any).entered = new Promise((resolve) =>
        h.addEventListener('animationstart', (e) => {
          const s = e.target as HTMLElement & { message?: string };
          if (s.localName !== 'tanrei-snackbar' || s.message !== 'Three') return;
          const style = getComputedStyle(s);
          resolve({ name: style.animationName, duration: style.animationDuration });
        }),
      );
    });
    await host(page).evaluate((h: any) => h.dismissCurrent());
    await show(page, { message: 'Three', action: 'Undo' });
    await expect.poll(() => showing(page)).toEqual(['Three']);
    const entered = await page.evaluate(() => (window as any).entered as Promise<{ name: string; duration: string }>);
    expect(entered.name).toBe('snackbar-fade-in');
    expect(Number.parseFloat(entered.duration) * 1000).toBe(await resolveToken(page, T('motion-enter-duration'), 'duration'));
  });

  test('SNK-19: drawn outside a host it is in place and at rest — centred across its width, no popover, timeout, entrance or announcement — and still emits', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    await override(page, { [T('timeout-short')]: '100ms' });
    await wire(page);
    const s = bar(page, 'message');
    await expect(s).not.toHaveAttribute('popover');
    expect(await css(s, 'position')).toBe('static');
    // Centred across the width it is given, as SNK-13 centres it in a host; narrower than that width, so it shows.
    for (const id of ['message', 'closable']) {
      const [given, drawn] = await Promise.all([bounds(bar(page, id)), bounds(part(page, id, 'bar'))]);
      expect(drawn.width).toBeLessThan(given.width - 1);
      expect(drawn.x + drawn.width / 2).toBeCloseTo(given.x + given.width / 2, 0);
    }
    expect(await css(s, 'animation-name')).toBe('none');
    await page.waitForTimeout(400);
    await expect(s).toBeVisible();
    expect(await page.evaluate(() => document.querySelectorAll('[aria-live], [role="status"]').length)).toBe(0);
    await part(page, 'closable', 'close').click();
    await part(page, 'collapsed', 'expand').click();
    expect(await log(page)).toEqual(['closable:dismiss:close', 'collapsed:expandedchange:true']);
    // At most as tall as the height it is given (expanded-scrolls' 400 × 240 stage), which stands for the host's area.
    // The stage and the bar are measured in one frame: the `collapsed` fixture above them is still growing from the
    // click, so the page under them moves, and two readings a round trip apart disagreed by that movement (the race this
    // test had).
    const { stage, scrolls } = await page.locator('[data-fixture="expanded-scrolls"]').evaluate((el) => {
      const s = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      const bar = el.querySelector('tanrei-snackbar')!.shadowRoot!.querySelector('.bar')!.getBoundingClientRect();
      return { stage: { top: box.top + Number.parseFloat(s.paddingTop), bottom: box.bottom - Number.parseFloat(s.paddingBottom), height: box.height }, scrolls: { y: bar.top, height: bar.height } };
    });
    expect(stage.height).toBeCloseTo(240, 0);
    expect(scrolls.y).toBeGreaterThanOrEqual(stage.top - 0.5);
    expect(scrolls.y + scrolls.height).toBeLessThanOrEqual(stage.bottom + 0.5);
  });
});

/** SNK-8: the timeout each duration resolves to on this page (null: never). */
function shownTimeouts(page: P) {
  return page.evaluate(async () => {
    const make = async (props: Record<string, unknown>) => {
      const s: any = Object.assign(document.createElement('tanrei-snackbar'), props);
      document.body.append(s);
      await s.updateComplete;
      const value = s.timeout;
      s.remove();
      return value;
    };
    return {
      auto: await make({ message: 'x' }),
      autoAction: await make({ message: 'x', action: 'Undo' }),
      short: await make({ message: 'x', action: 'Undo', duration: 'short' }),
      long: await make({ message: 'x', duration: 'long' }),
      indefinite: await make({ message: 'x', duration: 'indefinite' }),
    };
  });
}

test.describe('the bar', () => {
  test('SNK-14: at least its minimum height, as wide as its content within its bounds and the space it has; its form’s color, elevation and corners; its paddings — below the text padding-block, above it at least as much; after the text padding-inline-end where no control follows it on its row, the action on its own row included', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const [minH, minW, maxW] = await Promise.all(['container-min-height', 'container-min-width', 'container-max-width'].map((n) => resolveToken(page, T(n))));
    const b = part(page, 'message', 'bar');
    const box = await bounds(b);
    expect(box.height).toBeCloseTo(minH, 0);
    expect(box.width).toBeCloseTo(minW, 0);
    expect((await bounds(part(page, 'action-own-row', 'bar'))).width).toBeCloseTo(Math.min(maxW, 368), 0);
    expect(await css(b, 'background-color')).toBe(await resolveColor(page, T('container-color')));
    expect(await css(b, 'box-shadow')).toBe(await resolveShadow(page, T('container-elevation')));
    expect(Number.parseFloat(await css(b, 'border-top-left-radius'))).toBe(await resolveToken(page, T('container-shape')));
    const [start, end, endControls, block] = await Promise.all(['container-padding-inline-start', 'container-padding-inline-end', 'container-padding-inline-end-with-controls', 'container-padding-block'].map((n) => resolveToken(page, T(n))));
    const message = await bounds(part(page, 'message', 'message'));
    expect(message.x - box.x).toBeCloseTo(start, 0);
    expect(Number.parseFloat(await css(b, 'padding-right'))).toBe(end);
    // Below the text the padding is padding-block; above it, where SNK-29 places the first line: never less.
    expect(Number.parseFloat(await css(b, 'padding-bottom'))).toBe(block);
    expect(Number.parseFloat(await css(b, 'padding-top'))).toBeGreaterThanOrEqual(block);
    const tall = await bounds(part(page, 'two-lines', 'bar'));
    const tallText = await bounds(part(page, 'two-lines', 'message'));
    expect(tall.y + tall.height - (tallText.y + tallText.height)).toBeCloseTo(block, 0);
    expect(tallText.y - tall.y).toBeGreaterThanOrEqual(block - 0.5);
    const withClose = await bounds(part(page, 'closable', 'bar'));
    const close = await bounds(part(page, 'closable', 'close'));
    expect(withClose.x + withClose.width - (close.x + close.width)).toBeCloseTo(endControls, 0);
    // The action on its own row, nothing after the text on the first: the text ends padding-inline-end from the end edge,
    // as without controls; the action row keeps the controls' inset.
    const ownRow = await bounds(part(page, 'action-own-row', 'bar'));
    const ownText = await bounds(part(page, 'action-own-row', 'text'));
    expect(ownRow.x + ownRow.width - (ownText.x + ownText.width)).toBeCloseTo(end, 0);
    // A status form: its own container color, and the start padding before the glyph.
    const info = part(page, 'info', 'bar');
    expect(await css(info, 'background-color')).toBe(await resolveColor(page, T('info-container-color')));
    // Drawn inverse: the inverse form's color, on the same elevation and corners (SNK-30).
    const inverse = part(page, 'inverse', 'bar');
    expect(await css(inverse, 'background-color')).toBe(await resolveColor(page, T('inverse-container-color')));
    expect(await css(part(page, 'inverse-info', 'bar'), 'background-color')).toBe(await resolveColor(page, T('inverse-info-container-color')));
    expect(await css(inverse, 'box-shadow')).toBe(await css(b, 'box-shadow'));
    expect(await css(inverse, 'border-top-left-radius')).toBe(await css(b, 'border-top-left-radius'));
    const [infoBox, glyph] = await Promise.all([bounds(info), bounds(part(page, 'info', 'status'))]);
    expect(glyph.x - infoBox.x).toBeCloseTo(start, 0);
    // The widest: its content within max-width (here the stage, 368, is narrower).
    await mountFixtures(page, spec, { fixtures: [f('wide', { message: 'A message long enough to reach the widest a snackbar may be when there is room for it, and then wrap.' })] });
    await page.addStyleTag({ content: '.stage { inline-size: 1200px !important; }' });
    expect((await bounds(part(page, 'wide', 'bar'))).width).toBeCloseTo(maxW, 0);
  });

  test('SNK-15: the message in its role and its form’s color, the controls container.gap after it and controls.gap apart, centred on its first line; the action a tonal button in its form’s colors — its height, padding and label; the close square and glyph; their corners', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const [gap, cgap, h, pad, icon] = await Promise.all(['container-gap', 'controls-gap', 'controls-height', 'controls-padding-inline', 'controls-icon-size'].map((n) => resolveToken(page, T(n))));
    const m = part(page, 'action-closable', 'message');
    expect(await css(m, 'color')).toBe(await resolveColor(page, T('supporting-text-color')));
    expect(await css(m, 'font-size')).toBe(`${await resolveToken(page, T('supporting-text-typescale-font-size'))}px`);
    const [message, action, close] = await Promise.all([bounds(m), bounds(part(page, 'action-closable', 'action')), bounds(part(page, 'action-closable', 'close'))]);
    expect(action.x - (message.x + message.width)).toBeGreaterThanOrEqual(gap - 0.5);
    expect(close.x - (action.x + action.width)).toBeCloseTo(cgap, 0);
    expect(action.height).toBeCloseTo(h, 0);
    expect([close.width, close.height]).toEqual([expect.closeTo(h, 0), expect.closeTo(h, 0)]);
    const line = Number.parseFloat(await css(m, 'line-height'));
    expect(action.y + action.height / 2).toBeCloseTo(message.y + line / 2, 0);
    // Two lines: the controls stay on the first.
    const two = await bounds(part(page, 'two-lines', 'message'));
    const retry = await bounds(part(page, 'two-lines', 'action'));
    expect(two.height).toBeCloseTo(line * 2, 0);
    expect(retry.y + retry.height / 2).toBeCloseTo(two.y + line / 2, 0);
    const a = part(page, 'action', 'action');
    expect(Number.parseFloat(await css(a, 'padding-left'))).toBe(pad);
    expect(await css(a, 'font-size')).toBe(`${await resolveToken(page, T('controls-label-typescale-font-size'))}px`);
    expect(await css(a, 'color')).toBe(await resolveColor(page, T('action-content-color')));
    expect(await css(part(page, 'closable', 'close'), 'color')).toBe(await resolveColor(page, T('close-content-color')));
    const glyph = part(page, 'closable', 'icon');
    expect(await css(glyph, 'font-size')).toBe(`${icon}px`);
    expect((await css(glyph, '--tanrei-icon-fill')).trim()).toBe(await token(page, '--tanrei-sys-icon-fill-unselected'));
    await expect(glyph).toHaveAttribute('aria-hidden', 'true');
    for (const c of [a, part(page, 'closable', 'close')]) expect(Number.parseFloat(await css(c, 'border-top-left-radius'))).toBe(await resolveToken(page, T('controls-shape')));
    // The action is a tonal button: its own container color at rest.
    expect(await css(a, 'background-color')).toBe(await resolveColor(page, T('action-container-color')));
    // The expand button: an icon-only button with the close button's tokens, a controls.height square, its glyph at
    // controls.icon.size, between the action and the close button, controls.gap from each.
    const expand = part(page, 'collapsed', 'expand');
    const [e, c] = await Promise.all([bounds(expand), bounds(part(page, 'collapsed', 'close'))]);
    expect([e.width, e.height]).toEqual([expect.closeTo(h, 0), expect.closeTo(h, 0)]);
    expect(c.x - (e.x + e.width)).toBeCloseTo(cgap, 0);
    expect(await css(expand, 'background-color')).toBe(await resolveColor(page, T('close-container-color')));
    expect(await css(expand, 'color')).toBe(await resolveColor(page, T('close-content-color')));
    expect(Number.parseFloat(await css(expand, 'border-top-left-radius'))).toBe(await resolveToken(page, T('controls-shape')));
    const expandGlyph = expand.locator('.icon');
    await expect(expandGlyph).toHaveText('expand_more');
    expect(await css(expandGlyph, 'font-size')).toBe(`${icon}px`);
    expect((await css(expandGlyph, '--tanrei-icon-fill')).trim()).toBe(await token(page, '--tanrei-sys-icon-fill-unselected'));
    const all3 = await Promise.all(['action', 'expand', 'close'].map((n) => bounds(part(page, 'expanded-scrolls', n))));
    expect(all3[2].x - (all3[1].x + all3[1].width)).toBeCloseTo(cgap, 0);
    // With a title, the controls are centred on the title's first line.
    const title = part(page, 'title', 'title');
    const titleLine = Number.parseFloat(await css(title, 'line-height'));
    const [t0, undo] = await Promise.all([bounds(title), bounds(part(page, 'title', 'action'))]);
    expect(undo.y + undo.height / 2).toBeCloseTo(t0.y + titleLine / 2, 0);
    // Each form's message, action and close colors are its own: a status form's and the two inverse ones' (SNK-21, SNK-30).
    for (const id of ['error', 'inverse', 'inverse-error']) {
      const form = formOf(fixture(id).props);
      // Under a title (error, inverse-error) the message is drawn at the opacity SNK-32 gives it.
      expectFaded(await css(part(page, id, 'message'), 'color'), await resolveColor(page, barToken(form, 'supporting-text-color')), fixture(id).props.title ? await opacityToken(page, 'supporting-text-under-title-opacity') : 1, id);
      expect(await css(part(page, id, 'action'), 'background-color'), id).toBe(await resolveColor(page, controlToken('action', form, 'container-color')));
      expect(await css(part(page, id, 'action'), 'color'), id).toBe(await resolveColor(page, controlToken('action', form, 'content-color')));
      expect(await css(part(page, id, 'close'), 'color'), id).toBe(await resolveColor(page, controlToken('close', form, 'content-color')));
    }
    // A tonal action sits on its bar (SNK-33): its container is the bar's own color, the tonal layer over it sets it one
    // quiet step off the bar — in every form, quieter than the label by far — and its label is the strongest thing in it
    // (7:1 or more on the action as drawn).
    for (const id of ['action', 'warning', 'error', 'inverse', 'inverse-info', 'inverse-warning', 'inverse-error', 'inverse-success']) {
      const a = part(page, id, 'action');
      const [container, label, barColor, layer] = [await css(a, 'background-color'), await css(a, 'color'), await css(part(page, id, 'bar'), 'background-color'), await tonalLayer(a)];
      expect(container, `${id} container`).toBe(barColor);
      expect(layer.drawn, `${id} tonal layer`).toBe(true);
      const drawn = over(layer.color, container);
      expect(contrastOf(label, drawn), `${id} label`).toBeGreaterThanOrEqual(7);
      expect(contrastOf(drawn, barColor), `${id} action against the bar`).toBeGreaterThan(1.15);
      expect(contrastOf(drawn, barColor), `${id} action against the bar`).toBeLessThan(1.5);
    }
  });

  test('SNK-16: a title and a message that would need more than two lines put the action on its own row; the expand and close buttons stay on the first row', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const gap = await resolveToken(page, T('container-gap'));
    // Two lines together (one of title, one of message) stay inline; more take the action's own row.
    await expect(part(page, 'title', 'bar')).not.toHaveClass(/stacked/);
    expect(await part(page, 'title', 'message').evaluate((el) => Math.round(el.getBoundingClientRect().height / Number.parseFloat(getComputedStyle(el).lineHeight)))).toBe(1);
    await expect(part(page, 'expanded-scrolls', 'bar')).toHaveClass(/stacked/);
    const [text, action, expand, close] = await Promise.all(['text', 'action', 'expand', 'close'].map((n) => bounds(part(page, 'expanded-scrolls', n))));
    expect(action.y - (text.y + text.height)).toBeCloseTo(gap, 0);
    expect(expand.y).toBeLessThan(text.y + 10);
    expect(close.y).toBeCloseTo(expand.y, 0);
  });

  test('SNK-16: a message that would need more than two lines puts the action on its own row — end-aligned, container.gap below the text, the end inset below it — and the close button stays on the first row; the label is never cut', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...spec.fixtures, f('own-closable', { message: 'Three files could not be uploaded because they are larger than the limit for this folder.', action: 'Review files that failed', closable: true, closeLabel: 'Close' })] });
    const [gap, endControls] = await Promise.all(['container-gap', 'container-padding-inline-end-with-controls'].map((n) => resolveToken(page, T(n))));
    await expect(part(page, 'action-own-row', 'bar')).toHaveClass(/stacked/);
    await expect(part(page, 'two-lines', 'bar')).not.toHaveClass(/stacked/);
    const [b, m, a] = await Promise.all([bounds(part(page, 'action-own-row', 'bar')), bounds(part(page, 'action-own-row', 'message')), bounds(part(page, 'action-own-row', 'action'))]);
    expect(a.y - (m.y + m.height)).toBeCloseTo(gap, 0);
    expect(b.y + b.height - (a.y + a.height)).toBeCloseTo(endControls, 0);
    expect(b.x + b.width - (a.x + a.width)).toBeCloseTo(endControls, 0);
    const action = part(page, 'action-own-row', 'action');
    expect(await action.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await css(action, 'white-space')).toBe('nowrap');
    const [cm, cc] = [await bounds(part(page, 'own-closable', 'message')), await bounds(part(page, 'own-closable', 'close'))];
    expect(cc.y).toBeLessThan(cm.y + 10);
    // Enlarged text: the message wraps and grows; it is cut only at its line limit, with the expand button (SNK-23), and
    // the action's label never is.
    await override(page, { '--tanrei-dial-type-base': '28px' });
    await expect.poll(async () => (await bounds(part(page, 'message', 'bar'))).height).toBeGreaterThan(b.height / 2);
    const message = part(page, 'action-own-row', 'message');
    const cut = await message.evaluate((el) => el.scrollHeight > el.clientHeight + 1);
    await expect(part(page, 'action-own-row', 'expand')).toHaveCount(cut ? 1 : 0);
    expect(await action.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  });

  test('SNK-18: right-to-left mirrors the bar — the message at the right, the controls at the left', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    await page.locator('main').evaluate((el) => el.setAttribute('dir', 'rtl'));
    const [m, a, c] = await Promise.all([bounds(part(page, 'action-closable', 'message')), bounds(part(page, 'action-closable', 'action')), bounds(part(page, 'action-closable', 'close'))]);
    expect(m.x).toBeGreaterThan(a.x);
    expect(a.x).toBeGreaterThan(c.x);
    // The status glyph and the text at the right, the controls at the left; no glyph is mirrored.
    const [g, t, x] = await Promise.all([bounds(part(page, 'info', 'status')), bounds(part(page, 'info', 'text')), bounds(part(page, 'info', 'close'))]);
    expect(g.x).toBeGreaterThan(t.x);
    expect(t.x).toBeGreaterThan(x.x);
    for (const [id, name] of [['info', 'status'], ['info', 'close'], ['collapsed', 'expand']] as const) {
      const glyph = name === 'status' ? part(page, id, 'status') : part(page, id, name).locator('.icon');
      expect(await css(glyph, 'direction'), `${id} ${name}`).toBe('ltr');
      expect(await css(glyph, 'transform'), `${id} ${name}`).toBe('none');
      expect(await css(glyph, 'scale'), `${id} ${name}`).toBe('none');
    }
  });

  test('SNK-20: an empty message, a close button without a name, a status not given in words, an expand button without a name and a timed action are reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [f('empty', { message: '' }), f('unnamed', { closable: true }), f('wordless', { status: 'error' }), f('unnamed-expand', { title: TITLE, message: LONG }), f('timed', { action: 'Undo', duration: 'short' })],
    });
    await expect(bar(page, 'empty')).toBeVisible();
    await expect(part(page, 'unnamed', 'close')).toBeVisible();
    await expect(part(page, 'wordless', 'status')).toBeVisible();
    await expect(part(page, 'wordless', 'bar')).toHaveAttribute('data-status', 'error');
    await expect(part(page, 'unnamed-expand', 'expand')).toBeVisible();
    await expect.poll(() => seen.filter((w) => w.includes('SNK-20')).length).toBe(5);
    expect(seen.join('\n')).toMatch(/message is empty/);
    expect(seen.join('\n')).toMatch(/close-label is empty/);
    expect(seen.join('\n')).toMatch(/status-label is empty/);
    expect(seen.join('\n')).toMatch(/expand-label is empty/);
    expect(seen.join('\n')).toMatch(/offer it elsewhere too/);
  });

  test('SNK-21: each status form, not drawn inverse, draws its bar, title, message, glyph and controls from its own status’s tokens, in every scheme; the default form reads the unprefixed tokens; the glyph is hidden and statusLabel is text before the title', async ({ page }) => {
    // The colors are read with motion reduced: a control's colors move over motion.state-duration when the scheme under
    // it changes, and the close button would otherwise be read on its way from one scheme's color to the next.
    await eachScheme(page, {}, async (scheme) => {
      for (const status of STATUSES) {
        const at = `${scheme} ${status}`;
        await readsForm(page, status, fixture(status).props, at);
        // The tokens are the status's own, never the inverse form's (SNK-30) and never the default form's.
        expect(await css(part(page, status, 'bar'), 'background-color'), at).toBe(await resolveColor(page, T(`${status}-container-color`)));
        const glyph = part(page, status, 'status');
        await expect(glyph, at).toHaveText(STATUS_GLYPHS[status]);
        await expect(glyph, at).toHaveAttribute('aria-hidden', 'true');
      }
      // The default form: the unprefixed tokens, and no glyph.
      for (const id of ['action-closable', 'collapsed', 'title']) await readsForm(page, id, fixture(id).props, `${scheme} ${id}`);
      expect(await css(part(page, 'action-closable', 'bar'), 'background-color'), scheme).toBe(await resolveColor(page, T('container-color')));
    });
    await mountFixtures(page, spec, { icons: true, reducedMotion: false });
    // The glyph: icon.size, icon.gap before the text, centred on its first line, unselected; the default form has none.
    const [size, gap] = await Promise.all(['icon-size', 'icon-gap'].map((n) => resolveToken(page, T(n))));
    const glyph = part(page, 'info', 'status');
    const [g, text, title] = await Promise.all([bounds(glyph), bounds(part(page, 'info', 'text')), bounds(part(page, 'info', 'title'))]);
    expect([g.width, g.height]).toEqual([expect.closeTo(size, 0), expect.closeTo(size, 0)]);
    expect(text.x - (g.x + g.width)).toBeCloseTo(gap, 0);
    const line = Number.parseFloat(await css(part(page, 'info', 'title'), 'line-height'));
    expect(g.y + g.height / 2).toBeCloseTo(title.y + line / 2, 0);
    expect((await css(glyph, '--tanrei-icon-fill')).trim()).toBe(await token(page, '--tanrei-sys-icon-fill-unselected'));
    await expect(part(page, 'message', 'status')).toHaveCount(0);
    await expect(part(page, 'title', 'status')).toHaveCount(0);
    // statusLabel is exposed as text, before the title and the message.
    const order = await bar(page, 'error').evaluate((el) => [...el.shadowRoot!.querySelector('.text')!.children].map((c) => c.textContent));
    expect(order).toEqual([fixture('error').props.statusLabel, fixture('error').props.title, fixture('error').props.message]);
    const label = part(page, 'error', 'status-label');
    expect(await label.evaluate((el) => el.closest('[aria-hidden="true"]') === null && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden')).toBe(true);
    // An unknown status is the default form.
    await mountFixtures(page, spec, { icons: true, fixtures: [f('unknown', { status: 'critical', statusLabel: 'Critical' })] });
    await expect(part(page, 'unknown', 'bar')).toHaveAttribute('data-status', 'default');
    await expect(part(page, 'unknown', 'status')).toHaveCount(0);
  });

  test('SNK-22: the title above the message in its role and its form’s color, title.gap between them; without one, the message alone', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const title = part(page, 'title', 'title');
    expect(await css(title, 'font-size')).toBe(`${await resolveToken(page, T('title-typescale-font-size'))}px`);
    expect(await css(title, 'color')).toBe(await resolveColor(page, T('title-color')));
    // Its form's title color: a status's, the inverse form's, an inverse status's (SNK-21, SNK-30).
    for (const id of ['info', 'inverse-expanded', 'inverse-warning']) {
      expect(await css(part(page, id, 'title'), 'color'), id).toBe(await resolveColor(page, barToken(formOf(fixture(id).props), 'title-color')));
    }
    await expect(title).toHaveText(fixture('title').props.title as string);
    const [t, m] = await Promise.all([bounds(title), bounds(part(page, 'title', 'message'))]);
    expect(m.y - (t.y + t.height)).toBeCloseTo(await resolveToken(page, T('title-gap')), 0);
    await expect(part(page, 'message', 'title')).toHaveCount(0);
    // The title attribute is HTML's own: the spec's title is `headline`.
    await expect(bar(page, 'title')).toHaveAttribute('headline', fixture('title').props.title as string);
    expect(await bar(page, 'title').getAttribute('title')).toBeNull();
  });

  test('SNK-23: collapsed, the title and the message each end with an ellipsis at their line limit at every text size, and the expand button is drawn; text that fits draws none, and expanded has no effect on it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...spec.fixtures, all, f('fits', { message: 'Photo saved', expanded: true, expandLabel: 'Show full message' }), f('long-title', { title: LONG, message: 'Photo saved', expandLabel: 'Show full message' })] });
    const limits = { title: Number(await token(page, T('title-max-lines'))), message: Number(await token(page, T('supporting-text-max-lines'))) };
    const linesOf = (l: Locator) => l.evaluate((el) => el.clientHeight / Number.parseFloat(getComputedStyle(el).lineHeight));
    for (const base of ['', '28px']) {
      if (base) await override(page, { '--tanrei-dial-type-base': base });
      const message = part(page, 'collapsed', 'message');
      await expect.poll(() => linesOf(message), `message ${base}`).toBeCloseTo(limits.message, 1);
      expect(await css(message, '-webkit-line-clamp')).toBe(String(limits.message));
      expect(await message.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
      const title = part(page, 'long-title', 'title');
      await expect.poll(() => linesOf(title), `title ${base}`).toBeCloseTo(limits.title, 1);
      await expect(part(page, 'long-title', 'expand')).toHaveCount(1);
      // The whole of both still reaches assistive technology.
      await expect(message).toHaveText(fixture('collapsed').props.message as string);
      await expect(title).toHaveText(LONG);
    }
    await override(page, { '--tanrei-dial-type-base': '' });
    await expect(part(page, 'collapsed', 'expand').locator('.icon')).toHaveText('expand_more');
    await expect(part(page, 'expanded', 'expand').locator('.icon')).toHaveText('expand_less');
    // Expanded: the whole title and message.
    const whole = part(page, 'expanded', 'message');
    expect(await whole.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    expect(await css(whole, '-webkit-line-clamp')).toBe('none');
    // Text that fits: no expand button, and expanded changes nothing.
    await expect(part(page, 'fits', 'expand')).toHaveCount(0);
    await expect(part(page, 'message', 'expand')).toHaveCount(0);
    await expect(part(page, 'fits', 'bar')).not.toHaveClass(/expanded/);
    expect((await bounds(part(page, 'fits', 'bar'))).height).toBeCloseTo((await bounds(part(page, 'message', 'bar'))).height, 0);
  });

  test('SNK-24: the expand button toggles expanded and emits expandedchange once, keeps focus and the snackbar open, exposes its state and what it controls under one name, and grows the bar over the expand motion; the product setting expanded emits nothing', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    await wire(page);
    await override(page, { [T('motion-expand-duration')]: '1s' });
    const s = bar(page, 'collapsed');
    const button = part(page, 'collapsed', 'expand');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(button).toHaveAttribute('aria-controls', 'text');
    expect(await button.evaluate((el) => (el.getRootNode() as ShadowRoot).getElementById(el.getAttribute('aria-controls')!)?.classList.contains('text'))).toBe(true);
    await expect(page.locator('[data-fixture="collapsed"]').getByRole('button', { name: 'Show full message' })).toHaveCount(1);
    const before = await bounds(part(page, 'collapsed', 'bar'));
    // Keyboard first (WebKit does not focus a button on click): Enter expands, Space collapses, a click expands again.
    await tabTo(page, button);
    // The bar's motion is read in the task of the key, once the snackbar has drawn the change — not a round trip later,
    // when a slow runner may find it over.
    await s.evaluate((el: any) => {
      el.addEventListener(
        'expandedchange',
        async () => {
          await el.updateComplete;
          const [a] = el.shadowRoot.querySelector('.bar').getAnimations();
          (window as any).grown = a ? { duration: a.effect!.getTiming().duration, from: Number.parseFloat(String((a.effect as KeyframeEffect).getKeyframes()[0].blockSize)) } : null;
        },
        { once: true },
      );
    });
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => 'grown' in window)).toBe(true);
    const motion = await page.evaluate(() => (window as any).grown as { duration: number; from: number } | null);
    expect(motion).toEqual({ duration: await resolveToken(page, T('motion-expand-duration'), 'duration'), from: expect.closeTo(before.height, 0) });
    expect(motion!.duration).toBe(1000);
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(button.locator('.icon')).toHaveText('expand_less');
    await expect(page.locator('[data-fixture="collapsed"]').getByRole('button', { name: 'Show full message', expanded: true })).toHaveCount(1);
    expect(await focusedPart(s)).toBe('expand');
    await expect(s).toHaveJSProperty('expanded', true);
    await page.keyboard.press('Space');
    expect(await focusedPart(s)).toBe('expand');
    await button.click();
    expect(await log(page)).toEqual(['collapsed:expandedchange:true', 'collapsed:expandedchange:false', 'collapsed:expandedchange:true']);
    await expect(s).toBeVisible();
    // The product sets it: the same change, no event.
    await s.evaluate((el: any) => (el.expanded = false));
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(await log(page)).toHaveLength(3);
    await expect.poll(async () => (await bounds(part(page, 'collapsed', 'bar'))).height).toBeCloseTo(before.height, 0);
    // Where motion is reduced it changes at once.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await button.click();
    expect(await part(page, 'collapsed', 'bar').evaluate((el) => el.getAnimations().length)).toBe(0);
    expect((await bounds(part(page, 'collapsed', 'bar'))).height).toBeGreaterThan(before.height);
  });

  test('SNK-25, SNK-3: the keyboard focus of the scrolling text is drawn inside its edges and stays there while it scrolls — its inner stroke does not move away with the text', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: spec.fixtures.filter((f) => f.id === 'expanded-scrolls') });
    const text = part(page, 'expanded-scrolls', 'text');
    await tabTo(page, text);
    expect(await text.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
    expect(await innerStrokeAtEdges(page, text), 'before it is scrolled').toEqual({ top: true, bottom: true });
    await text.evaluate((el) => (el.scrollTop = 20));
    expect(await text.evaluate((el) => el.scrollTop)).toBe(20);
    expect(await innerStrokeAtEdges(page, text), 'scrolled by 20').toEqual({ top: true, bottom: true });
    await text.evaluate((el) => (el.scrollTop = el.scrollHeight));
    expect(await innerStrokeAtEdges(page, text), 'scrolled to its end').toEqual({ top: true, bottom: true });
  });

  test('SNK-25: expanded and taller than the height it is given, the text scrolls inside the bar under a fixed glyph and controls — a focus stop named by the title, scrolled by keys and wheel', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const text = part(page, 'expanded-scrolls', 'text');
    expect(await text.evaluate((el) => el.scrollHeight > el.clientHeight + 1)).toBe(true);
    await expect(text).toHaveAttribute('tabindex', '0');
    await expect(page.locator('[data-fixture="expanded-scrolls"]').getByRole('group', { name: TITLE })).toHaveCount(1);
    // Text that fits when expanded is not a focus stop.
    await expect(part(page, 'expanded', 'text')).not.toHaveAttribute('tabindex', /.*/);
    // Where the glyph, the controls and the action's row are, from the bar's own corner. This compared their places in
    // the window, which also move when the PAGE scrolls — and the keys do scroll it, once the text is at its end and
    // since the page grew six fixtures taller — so it failed for a reason that is not the snackbar's. "In place" is
    // SNK-25's own measure: in the bar.
    const fixed = () =>
      bar(page, 'expanded-scrolls').evaluate((el) => {
        const root = el.shadowRoot!;
        const origin = root.querySelector('.bar')!.getBoundingClientRect();
        return ['status', 'action', 'expand', 'close'].map((name) => {
          const box = root.querySelector(`.${name}`)!.getBoundingClientRect();
          return [box.x - origin.x, box.y - origin.y, box.width, box.height].map((v) => Math.round(v * 100) / 100);
        });
      });
    const at = await fixed();
    // The browser scrolls a focused scroller by these keys, not the snackbar; a key this browser does not scroll a plain
    // scroller by is not asked of the snackbar's text either (Playwright's WebKit on macOS leaves Arrow Down to nothing —
    // this test failed there on that key since it was written — and scrolls by Page Down).
    const scrollsBy = async (key: string) => {
      await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<div id="plain" tabindex="0" style="inline-size: 200px; block-size: 80px; overflow-y: auto"><div style="block-size: 800px"></div></div>'));
      await page.locator('#plain').focus();
      await page.keyboard.press(key);
      const scrolled = await page
        .waitForFunction(() => document.getElementById('plain')!.scrollTop > 0, undefined, { timeout: 1500 })
        .then(() => true)
        .catch(() => false);
      await page.locator('#plain').evaluate((el) => el.remove());
      return scrolled;
    };
    const keys: string[] = [];
    for (const key of ['ArrowDown', 'PageDown']) if (await scrollsBy(key)) keys.push(key);
    expect(keys).toContain('PageDown');
    await tabTo(page, text);
    // Its indicator is drawn by the box over it, exactly on it, which does not scroll with the text.
    await expect(part(page, 'expanded-scrolls', 'focus')).toHaveCSS('outline-style', 'solid');
    await expect(text).toHaveCSS('outline-style', 'none');
    expect(await part(page, 'expanded-scrolls', 'focus').boundingBox()).toEqual(await text.boundingBox());
    // A key scrolls over some frames: where the text came to rest, not where it was on its way there (read on its way,
    // Page Up could end below that reading).
    const rest = () =>
      text.evaluate(async (el) => {
        for (let last = -1, same = 0; same < 5; ) {
          await new Promise((r) => requestAnimationFrame(r));
          same = el.scrollTop === last ? same + 1 : 0;
          last = el.scrollTop;
        }
        return el.scrollTop;
      });
    // Each key is pressed on text at rest, as a person presses it. Chromium drops a key that arrives between the last
    // frame of the scroll before it and that scroll's end (its `scrollend`) — of any scroller, a plain one too — and a
    // slow machine puts the next key exactly there: Arrow Down had brought the text to 40, Page Down came some
    // milliseconds later and nothing moved.
    for (const key of keys) {
      const top = await rest();
      await page.keyboard.press(key);
      await expect.poll(() => text.evaluate((el) => el.scrollTop), key).toBeGreaterThan(top);
    }
    const top = await rest();
    await page.keyboard.press('PageUp');
    await expect.poll(() => text.evaluate((el) => el.scrollTop)).toBeLessThan(top);
    await text.hover();
    const wheeled = await rest();
    await page.mouse.wheel(0, 120);
    await expect.poll(() => text.evaluate((el) => el.scrollTop)).toBeGreaterThan(wheeled);
    expect(await fixed()).toEqual(at);
  });

  test('SNK-26: while the icon set cannot draw a glyph, each glyph draws nothing in its kept box, never its name; the names still reach assistive technology; the glyph draws once the face arrives', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('info'), fixture('collapsed')] });
    await withoutIconFont(page);
    const size = await resolveToken(page, T('icon-size'));
    const glyphs = [part(page, 'info', 'status'), part(page, 'info', 'close').locator('.icon'), part(page, 'collapsed', 'expand').locator('.icon')];
    for (const glyph of glyphs) {
      await expect(glyph).not.toHaveAttribute('data-drawn');
      await expect(glyph).toHaveCSS('visibility', 'hidden');
    }
    // What the browser would print is the name, spelled out in a text face: far wider than a glyph.
    expect(await glyphs[0].locator('.ink').evaluate((el) => (el as HTMLElement).offsetWidth)).toBeGreaterThan(size * 1.5);
    const box = await bounds(glyphs[0]);
    expect([box.width, box.height]).toEqual([expect.closeTo(size, 0), expect.closeTo(size, 0)]);
    await expect(page.locator('[data-fixture="info"]').getByRole('button', { name: 'Close' })).toHaveCount(1);
    await expect(page.locator('[data-fixture="collapsed"]').getByRole('button', { name: 'Show full message' })).toHaveCount(1);
    await expect(part(page, 'info', 'status-label')).toHaveText(fixture('info').props.statusLabel as string);
    await iconFaceArrives(page);
    for (const glyph of glyphs) {
      await expect(glyph).toHaveAttribute('data-drawn', '');
      await expect(glyph).toHaveCSS('visibility', 'visible');
    }
    expect(await bounds(glyphs[0]), 'the box keeps its size').toEqual(box);
  });
});

// ── SNK-29: aligned to the top ─────────────────────────────────────────────────────────────────────────────────────

/**
 * Where the first row is, from the bar's top edge: the centre of the status glyph, of the first line of the text (the
 * title's, or the message's without one) and of every control of the first row; where the message starts; and how far
 * an action on its own row is from the bar's BOTTOM edge. Read in one frame, inside the page.
 */
const MEASURE_ROW = (el: Element) => {
    const root = el.shadowRoot!;
    const barEl = root.querySelector('.bar')!;
    const origin = barEl.getBoundingClientRect();
    const box = (name: string) => root.querySelector(`.${name}`)?.getBoundingClientRect() ?? null;
    const centre = (name: string) => {
      const b = box(name);
      return b ? b.top + b.height / 2 - origin.top : null;
    };
    const first = root.querySelector<HTMLElement>('.title') ?? root.querySelector<HTMLElement>('.message')!;
    const line = Number.parseFloat(getComputedStyle(first).lineHeight);
    const stacked = barEl.classList.contains('stacked');
    const action = box('action');
    const text = box('text')!;
    return {
      height: origin.height,
      line,
      firstLine: first.getBoundingClientRect().top + line / 2 - origin.top,
      message: box('message')!.top - origin.top,
      glyph: centre('status'),
      action: stacked ? null : centre('action'),
      expand: centre('expand'),
      close: centre('close'),
      actionFromBottom: stacked && action ? origin.bottom - action.bottom : null,
      below: origin.bottom - text.bottom,
      stacked,
    };
  };
const firstRow = (snackbar: Locator) => snackbar.evaluate(MEASURE_ROW);
type FirstRow = Awaited<ReturnType<typeof firstRow>>;
/** The same reading as a function of the element, as source: the page calls it on every frame of a motion. */
const MEASURE = MEASURE_ROW.toString();
/** The parts of the first row that are drawn, by name. */
const rowParts = (row: FirstRow) => (['firstLine', 'message', 'glyph', 'action', 'expand', 'close'] as const).filter((name) => row[name] !== null);

test.describe('aligned to the top', () => {
  test('SNK-29: the first line is centred half of min-height below the top edge, the glyph and the first row’s controls on it, in every fixture; the one line of `message` is centred in the bar; spare height lies below; an action on its own row keeps the end inset below it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const [minH, pad, endControls] = await Promise.all(['container-min-height', 'container-padding-block', 'container-padding-inline-end-with-controls'].map((n) => resolveToken(page, T(n))));
    const rows: Record<string, FirstRow> = {};
    for (const { id } of spec.fixtures) {
      const row = (rows[id] = await firstRow(bar(page, id)));
      // Half of min-height, or lower where the padding plus half the line is more.
      const expected = Math.max(minH / 2, pad + row.line / 2);
      expect(row.firstLine, `${id} first line`).toBeCloseTo(expected, 1);
      for (const name of ['glyph', 'action', 'expand', 'close'] as const) if (row[name] !== null) expect(row[name], `${id} ${name}`).toBeCloseTo(expected, 1);
      // Below the content: padding-block under the text — more only where min-height asks for it — or, with the
      // action on its own row, the controls' end inset under the action.
      if (row.stacked) expect(row.actionFromBottom, `${id} action from the bottom`).toBeCloseTo(endControls, 1);
      else if (id !== 'expanded-scrolls') expect(row.below, `${id} below the text`).toBeGreaterThanOrEqual(pad - 0.05);
    }
    // A one-line bar looks as it did: its line and its controls in the middle of a min-height bar.
    for (const id of ['message', 'action', 'closable', 'action-closable', 'inverse']) {
      expect(rows[id].height, id).toBeCloseTo(minH, 1);
      expect(rows[id].firstLine, id).toBeCloseTo(rows[id].height / 2, 1);
    }
    // The spare height of a bar taller than its content is below the content, never above it.
    await override(page, { [T('container-min-height')]: '120px' });
    const spare = await firstRow(bar(page, 'action-closable'));
    expect(spare.height).toBeCloseTo(120, 0);
    expect(spare.firstLine).toBeCloseTo(60, 1); // half of min-height, as the rule says
    await override(page, { [T('container-min-height')]: '' });
    // Collapsed and expanded, and drawn inverse: the same first row (SNK-23, SNK-30).
    for (const other of ['expanded', 'inverse-expanded']) {
      for (const name of rowParts(rows.collapsed)) expect(rows[other][name], `${other} ${name}`).toBeCloseTo(rows.collapsed[name]!, 1);
    }
    expect(rows.expanded.height).toBeGreaterThan(rows.collapsed.height);
    // Enlarged text: the padding plus half the line is more than half of min-height, so the line starts at the padding.
    await override(page, { '--tanrei-dial-type-base': '28px' });
    await expect.poll(async () => (await firstRow(bar(page, 'action-closable'))).line).toBeGreaterThan(minH - 2 * pad);
    for (const id of ['message', 'action-closable', 'title', 'info', 'inverse-error']) {
      const row = await firstRow(bar(page, id));
      expect(row.firstLine, `${id} enlarged`).toBeCloseTo(pad + row.line / 2, 1);
      expect(row.firstLine, `${id} enlarged`).toBeGreaterThan(minH / 2);
      for (const name of ['glyph', 'action', 'expand', 'close'] as const) if (row[name] !== null) expect(row[name], `${id} ${name} enlarged`).toBeCloseTo(row.firstLine, 1);
    }
  });

  /**
   * Toggles `expanded` by the expand button and reads the first row through the motion the bar then runs: before it,
   * at nine moments of that motion — the bar's own animation, held and set to each tenth of its time — and at rest
   * after it. The samples, the bar's heights among them; `running` on those taken within the motion.
   * (Not on the frames a machine happens to draw: an engine that paints the bar's shadow without a GPU draws two of
   * them in 600 ms, and a reading of the layout is the same on a frame as between two.)
   */
  const throughMotion = (snackbar: Locator) =>
    snackbar.evaluate(async (el, read) => {
      const measure = new Function(`return (${read})`)() as (el: Element) => Record<string, number | boolean | null>;
      const barEl = el.shadowRoot!.querySelector('.bar')!;
      const samples: Record<string, number | boolean | null>[] = [{ ...measure(el), running: false }];
      el.shadowRoot!.querySelector<HTMLElement>('.expand')!.click();
      // The bar starts its motion in the update the press asks for.
      await (el as unknown as { updateComplete: Promise<boolean> }).updateComplete;
      const motions = barEl.getAnimations();
      if (motions.length !== 1) throw new Error(`the bar runs ${motions.length} motions after a press on its expand button`);
      const [motion] = motions;
      motion.pause();
      const duration = Number(motion.effect!.getComputedTiming().duration);
      for (let tenth = 1; tenth <= 9; tenth++) {
        motion.currentTime = (duration * tenth) / 10;
        samples.push({ ...measure(el), running: barEl.getAnimations().length > 0 });
      }
      // Its end, as the component hears it: the bar is measured again, and drawn at rest.
      motion.finish();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      samples.push({ ...measure(el), running: barEl.getAnimations().length > 0 });
      return samples;
    }, MEASURE);

  for (const [name, options] of [
    ['a default form: the title, the message, the expand and close buttons', { title: TITLE, message: LONG, closable: true, closeLabel: 'Close', expandLabel: 'Show full message', duration: 'indefinite' }],
    ['an inverse status form with its glyph and the action on its own row', { status: 'warning', statusLabel: 'Warning', inverse: true, title: TITLE, message: LONG, action: 'Review', closable: true, closeLabel: 'Close', expandLabel: 'Show full message', duration: 'indefinite' }],
  ] as const) {
    test(`SNK-29: through the expand and the collapse motion nothing of the first row moves from the bar’s top edge, and an action on its own row keeps its distance from the bottom edge — in a host, ${name}`, async ({ page }) => {
      await page.setViewportSize({ width: 800, height: 900 });
      await mountHost(page);
      await override(page, { [T('motion-expand-duration')]: '600ms' });
      await show(page, { ...options });
      await expect.poll(() => showing(page)).toEqual([LONG]);
      await expect.poll(() => shown(page).locator('.expand').count()).toBe(1);
      await expect(shown(page)).not.toHaveClass(/entering/);
      const collapsed = await firstRow(shown(page));
      for (const direction of ['expand', 'collapse'] as const) {
        const samples = await throughMotion(shown(page));
        const heights = samples.map((sample) => sample.height as number);
        // The motion was seen: the bar took heights between its two ends, on several frames.
        const [low, high] = [Math.min(...heights), Math.max(...heights)];
        expect(high - low, direction).toBeGreaterThan(40);
        expect(new Set(heights.filter((h) => h > low + 2 && h < high - 2).map((h) => Math.round(h))).size, `${direction}: frames in the middle of the motion`).toBeGreaterThanOrEqual(3);
        for (const part of [...rowParts(collapsed), ...(collapsed.stacked ? (['actionFromBottom'] as const) : [])]) {
          const seen = samples.map((sample) => sample[part] as number);
          expect(Math.max(...seen) - Math.min(...seen), `${direction} ${part}: ${[...new Set(seen.map((v) => v.toFixed(2)))].join(' ')}`).toBeLessThanOrEqual(0.5);
          expect(seen[0], `${direction} ${part}`).toBeCloseTo(collapsed[part]!, 1);
        }
      }
    });
  }

  test('SNK-29: drawn in place, the first row keeps its place through the expand motion and after it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    await override(page, { [T('motion-expand-duration')]: '600ms' });
    const before = await firstRow(bar(page, 'collapsed'));
    const samples = await throughMotion(bar(page, 'collapsed'));
    expect(samples.filter((sample) => sample.running).length).toBeGreaterThanOrEqual(3);
    for (const part of rowParts(before)) {
      const seen = samples.map((sample) => sample[part] as number);
      expect(Math.max(...seen) - Math.min(...seen), `${part}: ${[...new Set(seen.map((v) => v.toFixed(2)))].join(' ')}`).toBeLessThanOrEqual(0.5);
    }
    const after = await firstRow(bar(page, 'collapsed'));
    expect(after.height).toBeGreaterThan(before.height);
    for (const part of rowParts(before)) expect(after[part], part).toBeCloseTo(before[part]!, 1);
  });
});

// ── SNK-30: inverse ────────────────────────────────────────────────────────────────────────────────────────────────

test.describe('status colors: the edge, the glyph, the description and the action’s tonal layer', () => {
  const barShadow = (page: P, id: string) => css(part(page, id, 'bar'), 'box-shadow');
  const STATUS_FIXTURES = [...STATUSES, ...STATUSES.map((status) => `inverse-${status}`)];
  /** Every part's box, relative to the page: what an edge or a layer must not move. */
  const boxes = (page: P, id: string) =>
    bar(page, id).evaluate((el) => [el, ...el.shadowRoot!.querySelectorAll('.bar, .status, .title, .message, .control, .hold')].map((part) => {
      const box = part.getBoundingClientRect();
      return [box.x, box.y, box.width, box.height].join(' ');
    }));

  test('SNK-31: each status form, on a surface and inverse, draws its edge — outline.width wide around the bar, in its form’s outline color at outline.opacity, a layer before the elevation’s — without changing the bar’s box; the default and the inverse form draw the elevation’s ring alone; none at opacity 0', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, reducedMotion: true });
    const [width, opacity, elevation] = [await resolveToken(page, T('outline-width')), await opacityToken(page, 'outline-opacity'), await resolveShadow(page, T('container-elevation'))];
    expect(opacity).toBeGreaterThan(0);
    expect(width).toBeGreaterThan(0);
    for (const id of STATUS_FIXTURES) {
      const form = formOf(fixture(id).props);
      const [edge, ...under] = shadowLayers(await barShadow(page, id));
      const { color, lengths } = shadowLayer(edge);
      // Outside the bar's bounds, following its corners: a spread with no offset and no blur, as the elevation's ring.
      expect(lengths, id).toEqual([0, 0, 0, width]);
      expectFaded(color, await resolveColor(page, barToken(form, 'outline-color')), opacity, `${id} edge`);
      // Over the ring and above the shadows: the elevation's own layers follow it, whole.
      expect(under.join(', '), id).toBe(elevation);
      // It is the status's color, not the neutral ring's.
      expect(rgba(color).rgb, id).not.toEqual(rgba(shadowLayer(under[0]).color).rgb);
    }
    // The default form and the inverse form: no edge of their own, drawn inverse or not.
    for (const id of ['message', 'action-closable', 'title', 'expanded', 'inverse', 'inverse-expanded']) expect(await barShadow(page, id), id).toBe(elevation);
    // The edge takes no room: wider, narrower or gone, the bar and everything in and around it stay where they are.
    const ids = ['warning', 'inverse-error', 'info'];
    const before = await Promise.all(ids.map((id) => boxes(page, id)));
    const stage = await bounds(page.locator('[data-fixture="warning"]'));
    await override(page, { [T('outline-width')]: '6px' });
    expect(shadowLayer(shadowLayers(await barShadow(page, 'warning'))[0]).lengths).toEqual([0, 0, 0, 6]);
    expect(await Promise.all(ids.map((id) => boxes(page, id)))).toEqual(before);
    expect(await bounds(page.locator('[data-fixture="warning"]'))).toEqual(stage);
    await override(page, { [T('outline-width')]: '', [T('outline-opacity')]: '0.7' });
    expect(rgba(shadowLayer(shadowLayers(await barShadow(page, 'warning'))[0]).color).a).toBeCloseTo(0.7, 3);
    // Where the opacity is 0 a status form draws no edge either: the layer is transparent, the ring shows alone.
    await override(page, { [T('outline-opacity')]: '0' });
    for (const id of STATUS_FIXTURES) expect(rgba(shadowLayer(shadowLayers(await barShadow(page, id))[0]).color).a, id).toBe(0);
    expect(await Promise.all(ids.map((id) => boxes(page, id)))).toEqual(before);
  });

  test('SNK-31, SNK-3: the edge’s opacity is its color’s alone — the bar and its parts keep an opacity of 1, and a focused control’s indicator, a child of the bar drawn above the edge, keeps its form’s whole focus color', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, reducedMotion: true });
    for (const id of ['error', 'inverse-info']) {
      const opacities = await bar(page, id).evaluate((el) => [el, ...el.shadowRoot!.querySelectorAll('.bar, .status, .text, .title, .message, .control, .hold')].map((part) => getComputedStyle(part).opacity));
      expect(new Set(opacities), id).toEqual(new Set(['1']));
      await tabTo(page, part(page, id, 'close'));
      const ring = await css(part(page, id, 'close'), 'outline-color');
      expect(ring, id).toBe(await resolveColor(page, barToken(formOf(fixture(id).props), 'focus-ring-color')));
      expect(rgba(ring).a, id).toBe(1);
      // The indicator is the control's own outline: the control is inside the bar, whose shadow the edge is.
      expect(await part(page, id, 'close').evaluate((el) => el.parentElement!.classList.contains('bar') && getComputedStyle(el).outlineStyle !== 'none'), id).toBe(true);
    }
  });

  test('SNK-21: the glyph is its form’s icon color at icon.opacity — an opacity of the glyph alone — and keeps 3:1 against its bar in every status form and scheme', async ({ page }) => {
    test.setTimeout(120_000);
    const status = TEN.filter((x) => x.props.status);
    await eachScheme(page, { fixtures: status }, async (scheme) => {
      const opacity = await opacityToken(page, 'icon-opacity');
      for (const { id, props } of status) {
        const at = `${scheme} ${id}`;
        const glyph = await css(part(page, id, 'status'), 'color');
        expectFaded(glyph, await resolveColor(page, barToken(formOf(props), 'icon-color')), opacity, at);
        expect(await css(part(page, id, 'status'), 'opacity'), at).toBe('1');
        const barColor = await css(part(page, id, 'bar'), 'background-color');
        expect(contrastOf(over(glyph, barColor), barColor), `${at} glyph as drawn against its bar`).toBeGreaterThanOrEqual(3);
      }
    });
    // The opacity is the token's: another value is drawn at once, and fades nothing but the glyph.
    await override(page, { [T('icon-opacity')]: '0.5' });
    expect(rgba(await css(part(page, 'ten-info', 'status'), 'color')).a).toBeCloseTo(0.5, 3);
    expect(await css(part(page, 'ten-info', 'title'), 'color')).toBe(await resolveColor(page, T('info-title-color')));
  });

  test('SNK-32: under a title the message is drawn at supporting-text.under-title.opacity of its form’s message color, collapsed and expanded — an opacity of its text alone; without a title it is whole, and the title is whole in every form', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, reducedMotion: true });
    const opacity = await opacityToken(page, 'supporting-text-under-title-opacity');
    expect(opacity).toBeLessThan(1);
    for (const f of spec.fixtures) {
      const form = formOf(f.props);
      const message = await css(part(page, f.id, 'message'), 'color');
      expectFaded(message, await resolveColor(page, barToken(form, 'supporting-text-color')), f.props.title ? opacity : 1, `${f.id} message`);
      expect(await css(part(page, f.id, 'message'), 'opacity'), f.id).toBe('1');
      if (f.props.title) expect(await css(part(page, f.id, 'title'), 'color'), `${f.id} title`).toBe(await resolveColor(page, barToken(form, 'title-color')));
    }
    // Both ways are among the fixtures: a title over a description collapsed and expanded, and a message alone in a status form.
    expect(spec.fixtures.filter((f) => f.props.title).map((f) => f.id)).toEqual(expect.arrayContaining(['title', 'collapsed', 'expanded', 'inverse-expanded', 'inverse-error']));
    expect(fixture('success').props.title).toBeUndefined();
    // A title that arrives quiets the message, and one that leaves gives it back whole; an all-blank title is none.
    const s = bar(page, 'message');
    await s.evaluate((el: any) => (el.headline = 'Saved'));
    await expect.poll(async () => rgba(await css(part(page, 'message', 'message'), 'color')).a).toBeCloseTo(opacity, 3);
    await s.evaluate((el: any) => (el.headline = '   '));
    await expect.poll(async () => rgba(await css(part(page, 'message', 'message'), 'color')).a).toBe(1);
    // What assistive technology is given does not change: the whole message is text.
    expect(await part(page, 'title', 'message').textContent()).toBe(fixture('title').props.message);
  });

  test('SNK-32: the message as drawn under a title keeps 4.5:1 against its bar in all ten forms and every scheme, and 7:1 in the high-contrast schemes', async ({ page }) => {
    test.setTimeout(120_000);
    await eachScheme(page, { fixtures: TEN }, async (scheme) => {
      for (const { id } of TEN) {
        const [message, title, barColor] = [await css(part(page, id, 'message'), 'color'), await css(part(page, id, 'title'), 'color'), await css(part(page, id, 'bar'), 'background-color')];
        expect(rgba(message).a, `${scheme} ${id}`).toBeLessThan(1);
        const drawn = contrastOf(over(message, barColor), barColor);
        expect(drawn, `${scheme} ${id} message as drawn against its bar`).toBeGreaterThanOrEqual(scheme.endsWith('high') ? 7 : 4.5);
        // Quieter than the title, which leads.
        expect(drawn, `${scheme} ${id} message against the title`).toBeLessThan(contrastOf(title, barColor));
      }
    });
  });

  test('SNK-33: in the default, a status, the inverse and an inverse status form the action’s container is its bar’s color and the tonal layer over it is its content color at action.tonal-layer.opacity, at rest and hovered — filling the container to its corners, under the label, taking no press and no room; never on the expand or the close button; none at 0', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, reducedMotion: true });
    const opacity = await opacityToken(page, 'action-tonal-layer-opacity');
    expect(opacity).toBeGreaterThan(0);
    for (const id of ['action-closable', 'error', 'inverse', 'inverse-error']) {
      const form = formOf(fixture(id).props);
      const a = part(page, id, 'action');
      await page.mouse.move(0, 0);
      const barColor = await css(part(page, id, 'bar'), 'background-color');
      // At rest: the bar's own color, with the label's color over it at the layer's opacity.
      await expect.poll(() => css(a, 'background-color'), `${id} container`).toBe(barColor);
      expect(await resolveColor(page, controlToken('action', form, 'container-color')), id).toBe(await resolveColor(page, barToken(form, 'container-color')));
      const rest = await tonalLayer(a);
      expect(rest.drawn, id).toBe(true);
      expectFaded(rest.color, await resolveColor(page, controlToken('action', form, 'content-color')), opacity, `${id} layer`);
      // It fills the container to its corners, in its stacking context under the label, and takes no press.
      const box = await bounds(a);
      expect(rest.size, id).toEqual([expect.closeTo(box.width, 1), expect.closeTo(box.height, 1)]);
      expect([rest.position, rest.z, rest.events], id).toEqual(['absolute', '-1', 'none']);
      expect(rest.radius, id).toBe(await css(a, 'border-top-left-radius'));
      expect(await css(a, 'isolation'), id).toBe('isolate');
      // Hovered: the hovered container (the state layer mixed into the bar's color, unchanged), and the layer in the
      // hovered content color over it.
      await a.hover();
      await expect.poll(() => css(a, 'background-color'), `${id} hovered container`).toBe(await resolveColor(page, controlToken('action', form, 'container-color', 'hovered')));
      expectFaded((await tonalLayer(a)).color, await resolveColor(page, controlToken('action', form, 'content-color', 'hovered')), opacity, `${id} hovered layer`);
      // A click on the layer is a click on the action.
      await page.mouse.move(0, 0);
    }
    // Not on the expand or the close button.
    for (const [id, name] of [['action-closable', 'close'], ['collapsed', 'expand'], ['inverse-expanded', 'expand'], ['error', 'close']] as const) expect((await tonalLayer(part(page, id, name))).drawn, `${id} ${name}`).toBe(false);
    // It does not change the action's size, and at 0 it draws nothing: the action is its container alone.
    const size = await bounds(part(page, 'action', 'action'));
    await override(page, { [T('action-tonal-layer-opacity')]: '0' });
    expect(rgba((await tonalLayer(part(page, 'action', 'action'))).color).a).toBe(0);
    expect(await bounds(part(page, 'action', 'action'))).toEqual(size);
    await override(page, { [T('action-tonal-layer-opacity')]: '0.3' });
    expect(rgba((await tonalLayer(part(page, 'action', 'action'))).color).a).toBeCloseTo(0.3, 3);
    expect(await bounds(part(page, 'action', 'action'))).toEqual(size);
  });

  test('SNK-33, SNK-1: a press on the action’s tonal layer is the action’s; SNK-6: a ripple grows under the layer and is not dimmed by it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    await wire(page);
    const a = part(page, 'action', 'action');
    const box = await bounds(a);
    // Inside the padding, where there is no label: the layer is all there is above the container.
    await page.mouse.click(box.x + 3, box.y + box.height / 2);
    expect(await log(page)).toEqual(['action:action']);
    // Under ripple, the layer grows as the control's first child, the label (with the tonal layer, its ::before) after
    // it: both are one step under the content in the control's stacking context, so the later one — the tonal layer —
    // is drawn over the ripple. The ripple is whole (its own opacity is 1) while it grows.
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'ripple' });
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    const order = await a.evaluate((el) => ({ children: [...el.children].map((c) => c.className), ripple: getComputedStyle(el.querySelector('.ripple')!).zIndex, opacity: getComputedStyle(el.querySelector('.ripple')!).opacity }));
    await page.mouse.up();
    expect(order).toEqual({ children: ['ripple', 'hold'], ripple: '-1', opacity: '1' });
    expect((await tonalLayer(a)).z).toBe('-1');
  });

  test('SNK-33: the label keeps 4.5:1 against the action as drawn — the container of the state with the tonal layer over it — in every form, state and scheme, and 7:1 in the high-contrast schemes; the action stands one step off its bar, the same step for the five statuses of one kind of bar', async ({ page }) => {
    test.setTimeout(120_000);
    const states = ['', 'hovered', 'focused', 'pressed'];
    await eachScheme(page, { fixtures: TEN }, async (scheme) => {
      const layerOpacity = await opacityToken(page, 'action-tonal-layer-opacity');
      const stateOpacity = Object.fromEntries(await Promise.all(states.filter(Boolean).map(async (state) => [state, await opacityToken(page, `${state}-opacity`)] as const)));
      const steps: Record<string, number[]> = { surface: [], inverse: [] };
      for (const { id, props } of TEN) {
        const form = formOf(props);
        const a = part(page, id, 'action');
        const barColor = await css(part(page, id, 'bar'), 'background-color');
        const names = states.flatMap((state) => [controlToken('action', form, 'container-color', state), controlToken('action', form, 'content-color', state)]);
        const colors = await resolveColors(page, names);
        // At rest the tokens are what is drawn: the container, the label and the layer.
        expect(await css(a, 'background-color'), `${scheme} ${id}`).toBe(colors[0]);
        expect(await css(a, 'color'), `${scheme} ${id}`).toBe(colors[1]);
        expectFaded((await tonalLayer(a)).color, colors[1], layerOpacity, `${scheme} ${id} layer`);
        for (const [i, state] of states.entries()) {
          const [container, content] = [colors[2 * i], colors[2 * i + 1]];
          // The action as drawn: the state's container with the layer over it; a state's opacity fades the whole
          // control — container, layer and label alike — over the bar.
          const opacity = state ? stateOpacity[state] : 1;
          const action = through(over(`rgba(${rgba(content).rgb.join(', ')}, ${layerOpacity})`, container), opacity, barColor);
          const label = through(content, opacity, action);
          expect(contrastOf(label, action), `${scheme} ${id} ${state || 'at rest'}: label against the action as drawn`).toBeGreaterThanOrEqual(scheme.endsWith('high') ? 7 : 4.5);
          if (!state) steps[props.inverse ? 'inverse' : 'surface'].push(contrastOf(action, barColor));
        }
      }
      // One step off the bar, whatever the variant: visible, quiet, and the same for the five statuses of a kind of bar.
      for (const [kind, ratios] of Object.entries(steps)) {
        expect(Math.min(...ratios), `${scheme} ${kind}: ${ratios.map((r) => r.toFixed(2))}`).toBeGreaterThan(1.2);
        expect(Math.max(...ratios), `${scheme} ${kind}: ${ratios.map((r) => r.toFixed(2))}`).toBeLessThan(1.5);
        expect(Math.max(...ratios) - Math.min(...ratios), `${scheme} ${kind}: ${ratios.map((r) => r.toFixed(2))}`).toBeLessThan(0.05);
      }
    });
  });

  // A document of its own for each preset (see the m3-like test of SNK-30).
  for (const system of ['m3-like', 'cupertino']) {
    test(`SNK-31, SNK-33, SNK-21, SNK-32: under ${system}, which sets the edge’s and the tonal layer’s opacity to 0 and the glyph’s and the description’s to 1, a status form draws no edge, the action no layer, and the glyph and the description are whole`, async ({ page }) => {
      // Each form is asked for by name: m3-like draws a snackbar that does not say inverse (SNK-30).
      const forms = TEN.map((x) => (x.props.inverse ? x : { ...x, props: { ...x.props, inverse: 'false' } }));
      await mountFixtures(page, spec, { icons: true, system, reducedMotion: true, fixtures: forms });
      expect(await Promise.all(['outline-opacity', 'action-tonal-layer-opacity', 'icon-opacity', 'supporting-text-under-title-opacity'].map((name) => opacityToken(page, name)))).toEqual([0, 0, 1, 1]);
      for (const { id, props } of forms) {
        const form = formOf(props);
        const layers = shadowLayers(await barShadow(page, id));
        if (props.status) {
          expect(rgba(shadowLayer(layers[0]).color).a, `${id} edge`).toBe(0);
          expect(layers.slice(1).join(', '), id).toBe(await resolveShadow(page, T('container-elevation')));
          expectFaded(await css(part(page, id, 'status'), 'color'), await resolveColor(page, barToken(form, 'icon-color')), 1, `${id} glyph`);
        } else expect(layers.join(', '), id).toBe(await resolveShadow(page, T('container-elevation')));
        expect(rgba((await tonalLayer(part(page, id, 'action'))).color).a, `${id} layer`).toBe(0);
        expectFaded(await css(part(page, id, 'message'), 'color'), await resolveColor(page, barToken(form, 'supporting-text-color')), 1, `${id} message`);
      }
    });
  }
});

test.describe('inverse', () => {
  // A press read as drawn that fails says what the pointer did: the events and data-pressed, in the attachment.
  test.afterEach(({ page }, info) => attachPressLog(page, info));
  /** The same snackbar three ways: `inverse` unset, set, and refused (the attribute `inverse="false"`). */
  const three = [f('unset', { action: 'Undo', closable: true, closeLabel: 'Close' }), f('set', { action: 'Undo', closable: true, closeLabel: 'Close', inverse: true }), f('refused', { action: 'Undo', closable: true, closeLabel: 'Close', inverse: 'false' })];
  const barColor = (page: P, id: string) => css(part(page, id, 'bar'), 'background-color');

  test('SNK-30: inverse is true, false or null — the attribute absent, present or "false" — and reflects; unset takes the system’s choice: a surface under the default system, the inverse bar under m3-like, where inverse false draws the surface form', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: three });
    expect(await Promise.all(three.map((x) => bar(page, x.id).evaluate((el: any) => el.inverse)))).toEqual([null, true, false]);
    expect(await token(page, T('container-inverse'))).toBe('off');
    const [surface, inverse] = await Promise.all([resolveColor(page, T('container-color')), resolveColor(page, T('inverse-container-color'))]);
    expect(surface).not.toBe(inverse);
    expect(await Promise.all(three.map((x) => barColor(page, x.id)))).toEqual([surface, inverse, surface]);
    expect(await Promise.all(three.map((x) => bar(page, x.id).evaluate((el: any) => el.drawnInverse)))).toEqual([false, true, false]);
    // The property writes the attribute the same way, and any other attribute value is true.
    const s = bar(page, 'unset');
    await s.evaluate((el: any) => (el.inverse = true));
    await expect(s).toHaveAttribute('inverse', '');
    await s.evaluate((el: any) => (el.inverse = false));
    await expect(s).toHaveAttribute('inverse', 'false');
    await s.evaluate((el: any) => (el.inverse = null));
    await expect(s).not.toHaveAttribute('inverse');
    await s.evaluate((el) => el.setAttribute('inverse', 'true'));
    await expect(s).toHaveJSProperty('inverse', true);
    await s.evaluate((el) => el.setAttribute('inverse', 'FALSE'));
    await expect(s).toHaveJSProperty('inverse', false);
    await s.evaluate((el) => el.removeAttribute('inverse'));
    await expect(s).toHaveJSProperty('inverse', null);
    // An unknown name is the first value: off.
    await override(page, { [T('container-inverse')]: 'sideways' });
    expect(await Promise.all(three.map((x) => barColor(page, x.id)))).toEqual([surface, inverse, surface]);
    // The choice set on by a layer, on the root and on an ancestor inside the page: the untouched one follows.
    await override(page, { [T('container-inverse')]: 'on' });
    await expect.poll(() => Promise.all(three.map((x) => barColor(page, x.id)))).toEqual([inverse, inverse, surface]);
    await override(page, { [T('container-inverse')]: '' });
    await expect.poll(() => barColor(page, 'unset')).toBe(surface);
  });

  // A document of its own: in Firefox a preset's document mounted right after another one can wait for its faces
  // without end (the harness's `document.fonts.ready`; the same on the tree before this test existed).
  test('SNK-30: under m3-like, whose choice is on, a snackbar with inverse unset draws the inverse form and one with inverse false the default form', async ({ page }) => {
    // The choice is on, so an untouched snackbar is the inverse bar, and `inverse="false"` refuses it.
    await mountFixtures(page, spec, { icons: true, system: 'm3-like', fixtures: three });
    expect(await token(page, T('container-inverse'))).toBe('on');
    const [m3Surface, m3Inverse] = await Promise.all([resolveColor(page, T('container-color')), resolveColor(page, T('inverse-container-color'))]);
    expect(m3Surface).not.toBe(m3Inverse);
    expect(await Promise.all(three.map((x) => barColor(page, x.id)))).toEqual([m3Inverse, m3Inverse, m3Surface]);
    // Its action by its pins, on the inverse bar; the surface form's action is the default's tonal one.
    expect(await css(part(page, 'unset', 'action'), 'color')).toBe(await resolveColor(page, T('action-inverse-content-color')));
    expect(await css(part(page, 'refused', 'action'), 'color')).toBe(await resolveColor(page, T('action-content-color')));
    expect(await Promise.all(three.map((x) => bar(page, x.id).evaluate((el: any) => el.drawnInverse)))).toEqual([true, true, false]);
    // The form is the bar's from its first frame: a snackbar that appears is drawn in it, and nothing moves there
    // afterwards. (Where a browser has no style queries the element writes the form with the bar — written after it,
    // the controls' colors moved from the default form's over motion.state-duration each time a snackbar appeared.)
    const appeared = await page.evaluate(async () => {
      const fresh = document.createElement('tanrei-snackbar') as HTMLElement & { message: string; action: string; closable: boolean; closeLabel: string; updateComplete: Promise<unknown> };
      Object.assign(fresh, { message: 'Saved', action: 'Undo', closable: true, closeLabel: 'Close' });
      document.querySelector('[data-fixture="unset"]')!.append(fresh);
      await fresh.updateComplete;
      const container = fresh.shadowRoot!.querySelector<HTMLElement>('.bar')!;
      return {
        moving: [...fresh.shadowRoot!.querySelectorAll('*')].flatMap((el) => el.getAnimations().map((a) => `${el.className} ${(a as CSSTransition).transitionProperty}`)),
        container: getComputedStyle(container).backgroundColor,
        action: getComputedStyle(fresh.shadowRoot!.querySelector('[part="action"]')!).color,
      };
    });
    expect(appeared).toEqual({ moving: [], container: m3Inverse, action: await resolveColor(page, T('action-inverse-content-color')) });
  });

  test('SNK-30: each inverse form draws its bar, title, message, glyph, controls and focus indicator from its own tokens, in every scheme', async ({ page }) => {
    test.setTimeout(120_000);
    const inverse = ['inverse', ...STATUSES.map((status) => `inverse-${status}`), 'inverse-expanded'];
    await eachScheme(page, {}, async (scheme) => {
      for (const id of inverse) {
        const props = fixture(id).props;
        await readsForm(page, id, props, `${scheme} ${id}`);
        const form = formOf(props);
        expect(form.startsWith('inverse'), id).toBe(true);
        expect(await bar(page, id).evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('.bar')!).getPropertyValue('--_focus') !== ''), id).toBe(true);
      }
      // The focus indicator, where it is drawn: on a control of the inverse form and of an inverse status.
      for (const id of ['inverse', 'inverse-error']) {
        await tabTo(page, part(page, id, 'action'));
        expect(await css(part(page, id, 'action'), 'outline-color'), `${scheme} ${id}`).toBe(await resolveColor(page, barToken(formOf(fixture(id).props), 'focus-ring-color')));
      }
    });
  });

  // One test for each contrast level: each reads its two themes' eight forms through some two hundred inputs, and the
  // three levels in one test took longer than its time where every input waits (harsh mode).
  for (const contrast of ['', 'medium', 'high']) {
    test(`SNK-30: under the default system each status’s inverse form is drawn as that status’s form is in the other theme at the same contrast level — the bar, the title, the message, the glyph and the edge as drawn, the focus indicator, and the action and the close button at rest, hovered, pressed and focused — light for dark and dark for light, at ${contrast || 'standard'} contrast`, async ({ page }) => {
      test.setTimeout(300_000);
      // The eight forms of a status, each with every part the sentence names: a title, a message, a glyph, an action and
      // a close button. `mirror-<form>`.
      const forms = STATUSES.flatMap((status) => [status, `inverse-${status}`]);
      const MIRROR: Fixture[] = forms.map((form) => ({
        id: `mirror-${form}`,
        props: { title: 'Draft deleted', message: 'The draft was moved to the bin.', action: 'Undo', closable: true, closeLabel: 'Close', status: form.replace('inverse-', ''), statusLabel: 'Status', ...(form.startsWith('inverse-') ? { inverse: true } : {}) },
      }));
      const controls = ['action', 'close'] as const;
      /** A control as drawn: its container, its content, the opacity its state gives it, and the action's tonal layer. */
      const control = async (c: Locator, name: string) => ({
        container: await css(c, 'background-color'),
        content: await css(c, 'color'),
        opacity: await css(c, 'opacity'),
        layer: name === 'action' ? (await tonalLayer(c)).color : null,
      });
      /** The tokens of a control's state in a form, as that control is drawn in it. */
      const stateTokens = async (name: string, form: string, state: string) => ({
        container: await resolveColor(page, controlToken(name as 'action' | 'close', form, 'container-color', state)),
        content: await resolveColor(page, controlToken(name as 'action' | 'close', form, 'content-color', state)),
        opacity: state ? await token(page, T(`${state}-opacity`)) : '1',
      });
      /** Waits until the control is drawn in `state` (its form's tokens of that state), then reads it as drawn. */
      const inState = async (id: string, name: string, form: string, state: string, at: string) => {
        const c = part(page, id, name);
        const want = await stateTokens(name, form, state);
        await expect.poll(async () => { const d = await control(c, name); return { container: d.container, content: d.content, opacity: d.opacity }; }, `${at} ${name} ${state || 'at rest'}`).toEqual(want);
        return control(c, name);
      };
      /** Everything a form draws, read from its elements in the page's scheme. */
      const read = async (form: string, scheme: string) => {
        const id = `mirror-${form}`;
        const at = `${scheme} ${form}`;
        const drawn: Record<string, unknown> = {
          bar: await css(part(page, id, 'bar'), 'background-color'),
          title: await css(part(page, id, 'title'), 'color'),
          message: await css(part(page, id, 'message'), 'color'),
          glyph: await css(part(page, id, 'status'), 'color'),
          // The edge is the bar's first shadow layer, before the elevation's (SNK-31), which is the theme's own.
          edge: shadowLayer(shadowLayers(await css(part(page, id, 'bar'), 'box-shadow'))[0]),
        };
        // Keyboard focus first (WebKit does not move focus with Tab after a press): the focused state and its indicator.
        for (const name of controls) {
          await tabTo(page, part(page, id, name));
          drawn[`${name} focused`] = await inState(id, name, form, 'focused', at);
          drawn[`${name} focus indicator`] = await css(part(page, id, name), 'outline-color');
          expect(await css(part(page, id, name), 'outline-style'), `${at} ${name}: the indicator is drawn`).toBe('solid');
        }
        return drawn;
      };
      /** The states a pointer reaches, after every form's keyboard focus was read. */
      const readPointer = async (form: string, scheme: string, drawn: Record<string, unknown>) => {
        const id = `mirror-${form}`;
        const at = `${scheme} ${form}`;
        for (const name of controls) {
          await page.mouse.move(0, 0);
          drawn[`${name} at rest`] = await inState(id, name, form, '', at);
          await part(page, id, name).hover();
          drawn[`${name} hovered`] = await inState(id, name, form, 'hovered', at);
          await notePress(page, `down: ${at} ${name}`);
          await page.mouse.down();
          drawn[`${name} pressed`] = await inState(id, name, form, 'pressed', at);
          // Released away from the control: nothing is activated, and the bar stays as it is for the next read.
          await page.mouse.move(0, 0);
          await page.mouse.up();
        }
      };
      const THEMES = ['light', 'dark'] as const;
      const mount = async (theme: 'light' | 'dark', contrast: string) => {
        await mountFixtures(page, spec, { icons: true, fixtures: MIRROR, theme, reducedMotion: true });
        if (contrast) await page.evaluate((c) => document.documentElement.setAttribute('data-tanrei-contrast', c), contrast);
        await logPresses(page);
        return `${theme}${contrast ? `-${contrast}` : ''}`;
      };
      const seen: Record<string, Record<string, Record<string, unknown>>> = {};
      // Both themes' keyboard focus before any press: WebKit does not move focus with Tab after a press, even on a new
      // page (as in SNK-2's test).
      for (const theme of THEMES) {
        const scheme = await mount(theme, contrast);
        seen[theme] = {};
        for (const form of forms) seen[theme][form] = await read(form, scheme);
      }
      for (const theme of THEMES) {
        const scheme = await mount(theme, contrast);
        for (const form of forms) await readPointer(form, scheme, seen[theme][form]);
      }
      const level = contrast || 'standard';
      for (const status of STATUSES) {
        // The mirror, both ways: part for part, value for value.
        expect(seen.light[`inverse-${status}`], `${level}: inverse ${status} in light is ${status} in dark`).toEqual(seen.dark[status]);
        expect(seen.dark[`inverse-${status}`], `${level}: inverse ${status} in dark is ${status} in light`).toEqual(seen.light[status]);
        // And it says something: the two themes draw the status apart, so the inverse form is not the surface one.
        expect(seen.light[status].bar, `${level} ${status}: the two themes' bars differ`).not.toBe(seen.dark[status].bar);
        expect(seen.light[`inverse-${status}`].bar, `${level} ${status}`).not.toBe(seen.light[status].bar);
        expect(Object.keys(seen.light[status]).sort(), `${level} ${status}: every part was read`).toEqual(['action at rest', 'action focus indicator', 'action focused', 'action hovered', 'action pressed', 'bar', 'close at rest', 'close focus indicator', 'close focused', 'close hovered', 'close pressed', 'edge', 'glyph', 'message', 'title']);
      }
    });
  }

  test('SNK-30: drawn inverse changes colors only — the same sizes, layout, elevation, corners and glyphs, the same width and opacity of a status form’s edge and the same opacities of the glyph, of a message under a title and of the action’s tonal layer as the same snackbar on a surface', async ({ page }) => {
    const pairs = (['action-closable', 'info', 'warning', 'error', 'expanded'] as const).map((id) => [fixture(id), { id: `${id}-inverse`, props: { ...fixture(id).props, inverse: true } }] as const);
    await mountFixtures(page, spec, { icons: true, fixtures: pairs.flat() });
    const geometry = (id: string) =>
      bar(page, id).evaluate((el) => {
        const root = el.shadowRoot!;
        const barEl = root.querySelector('.bar')!;
        const origin = barEl.getBoundingClientRect();
        const style = getComputedStyle(barEl);
        // What an opacity of a part's color leaves of it: the alpha of the drawn color (1 where the color is whole).
        const alpha = (color: string) => {
          const n = color.match(/-?\d*\.?\d+(?:e-?\d+)?/g)!.map(Number);
          return Math.round((n[3] ?? 1) * 1000) / 1000;
        };
        const colorOf = (selector: string, pseudo?: string) => {
          const part = root.querySelector(selector);
          return part ? alpha(pseudo ? getComputedStyle(part, pseudo).backgroundColor : getComputedStyle(part).color) : null;
        };
        // The bar's shadow: its layers' lengths (the edge's width among them), and the alpha of each layer's color (the
        // edge's opacity) — the colors themselves are the form's.
        const layers = style.boxShadow.split(/,(?![^(]*\))/).map((layer) => {
          const color = layer.match(/(?:rgba?|color)\([^)]*\)/)![0];
          return `${layer.replace(color, '').trim()} @ ${alpha(color)}`;
        });
        return {
          bar: [origin.width, origin.height],
          elevation: layers,
          opacities: { glyph: colorOf('.status'), message: colorOf('.message'), title: colorOf('.title'), tonalLayer: colorOf('.action .hold', '::before') },
          corner: style.borderTopLeftRadius,
          parts: [...root.querySelectorAll('.status, .title, .message, .control, .icon')].map((part) => {
            const box = part.getBoundingClientRect();
            const own = getComputedStyle(part);
            return [part.className, part.textContent!.trim(), box.x - origin.x, box.y - origin.y, box.width, box.height, own.font, own.borderTopLeftRadius].join(' | ');
          }),
        };
      });
    for (const [surface, inverse] of pairs) {
      expect(await geometry(inverse.id), surface.id).toEqual(await geometry(surface.id));
      expect(await css(part(page, inverse.id, 'bar'), 'background-color'), surface.id).not.toBe(await css(part(page, surface.id, 'bar'), 'background-color'));
    }
    // The role, the announcement and the timing are the same message's.
    expect(await bar(page, 'action-closable-inverse').evaluate((el: any) => [el.announcement, el.timeout, el.assertive])).toEqual(await bar(page, 'action-closable').evaluate((el: any) => [el.announcement, el.timeout, el.assertive]));
  });

  test('SNK-30: show(options) takes inverse; a change of inverse, or of the system’s choice, while the snackbar is shown draws the other form at once and keeps it open and its focus', async ({ page }) => {
    await mountHost(page);
    const [surface, inverse] = await Promise.all([resolveColor(page, T('container-color')), resolveColor(page, T('inverse-container-color'))]);
    const drawn = () => css(shown(page).locator('.bar'), 'background-color');
    await show(page, { message: 'Archived', action: 'Undo', closable: true, closeLabel: 'Close', inverse: true });
    await expect.poll(() => showing(page)).toEqual(['Archived']);
    expect(await drawn()).toBe(inverse);
    await expect(shown(page)).toHaveAttribute('inverse', '');
    await host(page).evaluate((h: any) => h.dismissCurrent());
    await expect.poll(() => showing(page)).toEqual([]);
    await show(page, { message: 'Printer', action: 'Undo', closable: true, closeLabel: 'Close' });
    await expect.poll(() => showing(page)).toEqual(['Printer']);
    expect(await drawn()).toBe(surface);
    await expect(shown(page)).toHaveJSProperty('inverse', null);
    // Focus on the close button, then the form changes under it: by the prop, both ways, then by the system's choice.
    await expect(shown(page)).not.toHaveClass(/entering/);
    await tabTo(page, shown(page).locator('.close'));
    await rootTokensInPage(page);
    const frame = (change: string) =>
      page.evaluate(async (c) => {
        const s: any = document.querySelector('tanrei-snackbar-host tanrei-snackbar');
        if (c === 'system-on' || c === 'system-off') (window as any).rootTokens({ '--tanrei-comp-snackbar-container-inverse': c === 'system-on' ? 'on' : '' });
        else s.inverse = c === 'true' ? true : c === 'false' ? false : null;
        // "At once": drawn by the next frame, with no motion of its own on the bar.
        await s.updateComplete;
        await new Promise((r) => requestAnimationFrame(r));
        const barEl = s.shadowRoot.querySelector('.bar');
        return { bar: getComputedStyle(barEl).backgroundColor, animations: [...barEl.getAnimations(), ...s.getAnimations()].map((motion: any) => motion.animationName ?? motion.transitionProperty ?? 'animation').join(', '), open: s.matches(':popover-open'), focus: s.shadowRoot.activeElement?.getAttribute('part') ?? null };
      }, change);
    expect(await frame('true')).toEqual({ bar: inverse, animations: '', open: true, focus: 'close' });
    expect(await frame('false')).toEqual({ bar: surface, animations: '', open: true, focus: 'close' });
    expect(await frame('null')).toEqual({ bar: surface, animations: '', open: true, focus: 'close' });
    expect(await frame('system-on')).toEqual({ bar: inverse, animations: '', open: true, focus: 'close' });
    expect(await frame('system-off')).toEqual({ bar: surface, animations: '', open: true, focus: 'close' });
    expect(await showing(page)).toEqual(['Printer']);
    expect(await results(page)).toHaveLength(1);
  });

  test('SNK-30: a change of inverse while the snackbar is shown keeps the time left before it closes', async ({ page }) => {
    await mountHost(page, { short: '600ms', long: '1500ms' });
    await page.mouse.move(0, 0);
    // On the page's clock, held still and moved on by the test: asked for, redrawn inverse 900 ms later, and closed by
    // its timeout 1500 ms after it was shown — there at 1499 — not 1500 ms after the change (2400).
    await holdClock(page);
    await show(page, { message: 'Saved', duration: 'long' });
    await expect.poll(() => showing(page)).toEqual(['Saved']);
    await page.clock.runFor(900);
    const drawnInverse = await host(page).evaluate(async (h: any) => {
      h.snackbar.inverse = true;
      await h.snackbar.updateComplete;
      return h.snackbar.drawnInverse;
    });
    expect(drawnInverse).toBe(true);
    await page.clock.runFor(599);
    expect(await showing(page)).toEqual(['Saved']);
    expect(await results(page)).toEqual([]);
    await page.clock.runFor(1);
    await expect.poll(() => results(page)).toEqual([{ message: 'Saved', result: 'dismiss', reason: 'timeout' }]);
  });
});

test.describe('controls: states, press, corners and focus style', () => {
  test.beforeAll(async () => {
    test.setTimeout(240_000);
    await acmeSystemCss();
  });
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
  });
  // A press read as drawn that fails says what the pointer did: the events and data-pressed, in the attachment.
  test.afterEach(({ page }, info) => attachPressLog(page, info));
  const drawn = (c: Locator) => c.evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color, opacity: getComputedStyle(el).opacity }));
  const expected = async (page: P, control: string, state = '', form = '') => {
    const name = [control, state, form].filter(Boolean).join('-');
    return {
      bg: await resolveColor(page, T(`${name}-container-color`)),
      color: await resolveColor(page, T(`${name}-content-color`)),
      opacity: state ? await token(page, T(`${state}-opacity`)) : '1',
    };
  };

  test('SNK-2: the expand button renders from the close button’s tokens in each state; every control renders each state from its form’s tokens — a status’s, the inverse form’s and an inverse status’s', async ({ page }) => {
    test.setTimeout(120_000);
    // [fixture, control, the tokens it reads, the form's prefix]
    const cases = [
      ['collapsed', 'expand', 'close', ''],
      ['error', 'action', 'action', 'error'],
      ['error', 'close', 'close', 'error'],
      ['info', 'close', 'close', 'info'],
      ['warning', 'action', 'action', 'warning'],
      ['inverse', 'action', 'action', 'inverse'],
      ['inverse', 'close', 'close', 'inverse'],
      ['inverse-expanded', 'expand', 'close', 'inverse'],
      ['inverse-error', 'action', 'action', 'inverse-error'],
      ['inverse-info', 'close', 'close', 'inverse-info'],
      ['inverse-success', 'action', 'action', 'inverse-success'],
    ] as const;
    // Each form's states are tokens of its own: an inverse form's hovered action is not the surface form's.
    expect(await resolveColor(page, T('action-hovered-inverse-container-color'))).not.toBe(await resolveColor(page, T('action-hovered-container-color')));
    // Each case on a page of its own fixture alone: Tab reaches its control in a press or two, not across every fixture.
    for (const [id, control, tokens, status] of cases) {
      await mountFixtures(page, spec, { icons: true, fixtures: [fixture(id)] });
      await tabTo(page, part(page, id, control));
      await expect.poll(() => drawn(part(page, id, control)), `${id} ${control} focused`).toEqual(await expected(page, tokens, 'focused', status));
    }
    for (const [id, control, tokens, status] of cases) {
      await mountFixtures(page, spec, { icons: true, fixtures: [fixture(id)] });
      await logPresses(page);
      const c = part(page, id, control);
      await page.mouse.move(0, 0);
      await expect.poll(() => drawn(c), `${id} ${control}`).toEqual(await expected(page, tokens, '', status));
      await c.hover();
      await expect.poll(() => drawn(c), `${id} ${control} hovered`).toEqual(await expected(page, tokens, 'hovered', status));
      await notePress(page, `down: ${id} ${control}`);
      await page.mouse.down();
      await expect.poll(() => drawn(c), `${id} ${control} pressed`).toEqual(await expected(page, tokens, 'pressed', status));
      await page.mouse.up();
    }
  });

  test('SNK-2: each control renders from that state’s tokens of its own; pointer focus is not the focused state (default system)', async ({ page }) => {
    // Keyboard focus first: WebKit does not move focus with Tab after a press and a new page (as in TIP-6's test).
    for (const control of ['action', 'close']) {
      await mountFixtures(page, spec, { icons: true });
      await tabTo(page, part(page, 'action-closable', control));
      await expect.poll(() => drawn(part(page, 'action-closable', control)), `${control} focused`).toEqual(await expected(page, control, 'focused'));
    }
    for (const control of ['action', 'close']) {
      await mountFixtures(page, spec, { icons: true });
      await logPresses(page);
      const c = part(page, 'action-closable', control);
      await page.mouse.move(0, 0);
      await expect.poll(() => drawn(c), control).toEqual(await expected(page, control));
      await c.hover();
      await expect.poll(() => drawn(c), `${control} hovered`).toEqual(await expected(page, control, 'hovered'));
      await notePress(page, `down: ${control}`);
      await page.mouse.down();
      await expect.poll(() => drawn(c), `${control} pressed`).toEqual(await expected(page, control, 'pressed'));
      await page.mouse.up();
      await page.mouse.move(0, 0);
      await expect.poll(() => drawn(c), `${control} pointer focus`).toEqual(await expected(page, control));
    }
  });

  test('SNK-2: under acme, where the three states differ, pressed beats focused beats hovered', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, system: 'acme', systemCss: await acmeSystemCss() });
    const c = part(page, 'action', 'action');
    const bg = () => css(c, 'background-color');
    const [rest, hovered, focus, down] = await Promise.all(['', 'hovered-', 'focused-', 'pressed-'].map((s) => resolveColor(page, T(`action-${s}container-color`))));
    expect(new Set([rest, hovered, focus, down]).size).toBe(4);
    await page.mouse.move(0, 0);
    await expect.poll(bg).toBe(rest);
    await c.hover();
    await expect.poll(bg).toBe(hovered);
    await tabTo(page, c);
    await expect.poll(bg).toBe(focus);
    await page.keyboard.down('Space');
    await expect.poll(bg).toBe(down);
    await page.keyboard.up('Space');
  });

  test('SNK-3: keyboard focus shows the ring around the control, without animation; pointer focus does not', async ({ page }) => {
    for (const [id, name] of [['closable', 'close'], ['collapsed', 'expand'], ['action', 'action']] as const) {
      await mountFixtures(page, spec, { icons: true });
      const c = part(page, id, name);
      await c.click();
      await expect(c, name).toHaveCSS('outline-style', 'none');
      await tabTo(page, c);
      await expect(c, name).toHaveCSS('outline-style', 'solid');
      expect(Number.parseFloat(await css(c, 'outline-offset')), name).toBeGreaterThanOrEqual(0);
      expect(await css(c, 'transition-property'), name).not.toContain('outline');
    }
  });

  test('SNK-3: the indicator’s outer stroke is the form’s focus-ring color — on the action, the close and expand buttons and the scrolling text, in the default, a status, the inverse and an inverse status form — at the system’s widths and offset, and 3:1 or more against that form’s bar in every scheme', async ({ page }) => {
    test.setTimeout(180_000);
    // The four kinds of form, each with every control and a text that scrolls (expanded-scrolls' content on its stage).
    const scrolling = fixture('expanded-scrolls').props;
    const forms = [
      f('scrolls-default', { ...scrolling, status: 'default', statusLabel: '' }),
      f('scrolls-status', { ...scrolling, status: 'error', statusLabel: 'Error' }),
      f('scrolls-inverse', { ...scrolling, status: 'default', statusLabel: '', inverse: true }),
      f('scrolls-inverse-status', { ...scrolling, status: 'success', statusLabel: 'Success', inverse: true }),
    ];
    const mount = async (options: Parameters<typeof mountFixtures>[2] = {}) => {
      await mountFixtures(page, spec, { icons: true, fixtures: forms, ...options });
      await page.addStyleTag({ content: `.stage[data-fixture^='scrolls-'] { block-size: 240px; }` });
      for (const form of forms) await expect(part(page, form.id, 'text')).toHaveAttribute('tabindex', '0');
    };
    await mount();
    const [outer, inner, offset] = await Promise.all(['outer-width', 'inner-width', 'offset'].map((n) => resolveToken(page, `--tanrei-sys-focus-${n}`)));
    const system = await resolveColor(page, '--tanrei-sys-color-focus-ring');
    const seen = new Set<string>();
    for (const form of forms) {
      const color = await resolveColor(page, barToken(formOf(form.props), 'focus-ring-color'));
      seen.add(color);
      for (const name of ['text', 'action', 'expand', 'close']) {
        const stop = part(page, form.id, name);
        await tabTo(page, stop);
        // The scrolling text's indicator is drawn by the box over it, which does not scroll with the text.
        const c = name === 'text' ? part(page, form.id, 'focus') : stop;
        const at = `${form.id} ${name}`;
        await expect(c, at).toHaveCSS('outline-style', 'solid');
        expect(await css(c, 'outline-color'), at).toBe(color);
        // The widths and the offset stay the system's: around a control after the offset, inside the scrolling text.
        expect(Number.parseFloat(await css(c, 'outline-width')), at).toBe(outer);
        expect(Number.parseFloat(await css(c, 'outline-offset')), at).toBe(name === 'text' ? -outer : offset + inner);
        // The inner stroke, where the system draws one, is the system's own color.
        expect(await css(c, 'border-top-color', '::after'), at).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring-inner'));
      }
    }
    // The default form's bar is a surface, so its token is the system's focus color; no other form reads that role.
    expect(await resolveColor(page, T('focus-ring-color'))).toBe(system);
    expect(seen.size).toBe(forms.length);
    // Never the system's role read directly: each form follows its own token, and only its own.
    await override(page, { [T('inverse-focus-ring-color')]: 'rgb(1, 2, 3)', '--tanrei-sys-color-focus-ring': 'rgb(4, 5, 6)' });
    await tabTo(page, part(page, 'scrolls-inverse', 'action'));
    expect(await css(part(page, 'scrolls-inverse', 'action'), 'outline-color')).toBe('rgb(1, 2, 3)');
    await tabTo(page, part(page, 'scrolls-inverse', 'text'));
    expect(await css(part(page, 'scrolls-inverse', 'focus'), 'outline-color')).toBe('rgb(1, 2, 3)');
    await tabTo(page, part(page, 'scrolls-default', 'close'));
    expect(await css(part(page, 'scrolls-default', 'close'), 'outline-color')).toBe('rgb(4, 5, 6)');
    await tabTo(page, part(page, 'scrolls-status', 'close'));
    expect(await css(part(page, 'scrolls-status', 'close'), 'outline-color')).toBe(await resolveColor(page, T('error-focus-ring-color')));
    // 3:1 or more against the form's own bar, in every scheme and all ten forms (the token build holds the same).
    await eachScheme(page, {}, async (scheme) => {
      for (const form of ['', ...STATUSES, 'inverse', ...STATUSES.map((status) => `inverse-${status}`)]) {
        const [ring, barColor] = await Promise.all([resolveColor(page, barToken(form, 'focus-ring-color')), resolveColor(page, barToken(form, 'container-color'))]);
        expect(contrastOf(ring, barColor), `${scheme} ${form || 'default'}: ${ring} on ${barColor}`).toBeGreaterThanOrEqual(3);
      }
    });
    // Under the glow focus style the form's color is the halo's outer color (SNK-7), around a control and inside the text.
    await mount({ system: 'acme', systemCss: await acmeSystemCss(), reducedMotion: false });
    for (const [id, name] of [['scrolls-inverse', 'action'], ['scrolls-inverse-status', 'close'], ['scrolls-inverse', 'text']] as const) {
      await tabTo(page, part(page, id, name));
      // The scrolling text's halo is drawn by the box over it, which does not scroll with the text.
      const c = part(page, id, name === 'text' ? 'focus' : name);
      const color = await resolveColor(page, barToken(formOf(forms.find((x) => x.id === id)!.props), 'focus-ring-color'));
      expect(await css(c, 'outline-color'), `${id} ${name}`).toBe('rgba(0, 0, 0, 0)');
      const halo = await css(c, 'box-shadow', '::after');
      expect(halo, `${id} ${name}`).toContain(color);
      expect(halo.lastIndexOf(color), `${id} ${name}: the outer layer`).toBeGreaterThan(halo.indexOf(await resolveColor(page, '--tanrei-sys-color-focus-ring-inner')));
    }
  });

  test('SNK-4: each control’s hit area is at least the minimum target, pointer and touch, without changing its size', async ({ page, browserName }) => {
    await override(page, { [T('controls-height')]: '16px' });
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    for (const [id, name] of [['action-closable', 'action'], ['action-closable', 'close'], ['collapsed', 'expand']] as const) {
      const c = part(page, id, name);
      const hit = await c.evaluate((el) => {
        const s = getComputedStyle(el, '::before');
        return [Number.parseFloat(s.width), Number.parseFloat(s.height)];
      });
      expect(hit[1], name).toBeCloseTo(pointer, 1);
      expect(hit[0], name).toBeGreaterThanOrEqual(pointer - 0.5);
    }
    // The visual size is unchanged: the close and expand squares are controls.height.
    expect((await bounds(part(page, 'action-closable', 'close'))).height).toBeCloseTo(16, 0);
    expect((await bounds(part(page, 'collapsed', 'expand'))).height).toBeCloseTo(16, 0);
    if (browserName !== 'chromium') return;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    await expect.poll(() => part(page, 'action-closable', 'close').evaluate((el) => Number.parseFloat(getComputedStyle(el, '::before').height))).toBeCloseTo(touch, 1);
  });

  test('SNK-5: a press that ends within a frame — Enter, Space, a click — is shown at once and for at least press-hold', async ({ page }) => {
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    expect(hold).toBe(100);
    for (const [id, control, name, activate] of [
      ['action', 'action', 'Enter', () => page.keyboard.press('Enter')],
      ['action', 'action', 'Space', () => page.keyboard.press('Space')],
      ['action', 'action', 'click', () => clickCentre(page, part(page, 'action', 'action'))],
      ['collapsed', 'expand', 'expand Enter', () => page.keyboard.press('Enter')],
      ['collapsed', 'expand', 'expand click', () => clickCentre(page, part(page, 'collapsed', 'expand'))],
    ] as const) {
      await mountFixtures(page, spec, { icons: true });
      await part(page, id, control).focus();
      await part(page, id, control).evaluate((el) => {
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
      const logged = await page.evaluate(() => (window as any).press);
      expect(logged.up - logged.on, name).toBeLessThan(hold);
      expect(logged.off - logged.down, name).toBeGreaterThanOrEqual(hold - 1);
    }
  });

  test('SNK-6: overlay (default), ripple (m3-like), dim (cupertino) and none each answer the press; an unknown name is the first; the ripple grows from the point of contact, also in RTL (SNK-18)', async ({ page }) => {
    const press = async (system?: string, feedback?: string) => {
      await mountFixtures(page, spec, { icons: true, ...(system ? { system } : {}) });
      if (feedback) await override(page, { '--tanrei-sys-behavior-pressed-feedback': feedback });
      // The `action` fixture leaves `inverse` unset, so it is the form its system chooses (SNK-30): the inverse one under
      // m3-like, whose action reads the inverse form's tokens.
      const form = (await bar(page, 'action').evaluate((el: any) => el.drawnInverse)) ? 'inverse' : '';
      await override(page, { [controlToken('action', form, 'content-color', 'pressed')]: 'rgb(0, 0, 255)', [T('pressed-opacity')]: '0.5' });
      const c = part(page, 'action', 'action');
      await c.hover();
      await expect.poll(() => css(c, 'background-color')).toBe(await resolveColor(page, controlToken('action', form, 'container-color', 'hovered')));
      const hovered = await css(c, 'background-color');
      await page.mouse.down();
      const result = { pressed: await c.getAttribute('data-pressed'), bg: await css(c, 'background-color'), hovered, color: await css(c, 'color'), ripple: await c.locator('.ripple').count(), opacity: await css(c, 'opacity') };
      await page.mouse.up();
      return { ...result, form };
    };
    const overlay = await press();
    expect(overlay).toMatchObject({ pressed: 'overlay', ripple: 0, color: 'rgb(0, 0, 255)' });
    expect(overlay.bg).toBe(await resolveColor(page, T('action-pressed-container-color')));
    const ripple = await press('m3-like');
    expect(ripple).toMatchObject({ pressed: 'ripple', ripple: 1, color: 'rgb(0, 0, 255)', form: 'inverse' });
    expect(ripple.bg).toBe(ripple.hovered);
    const dim = await press('cupertino');
    expect(dim).toMatchObject({ pressed: 'dim', ripple: 0, color: 'rgb(0, 0, 255)', opacity: '0.5' });
    const none = await press(undefined, 'none');
    expect(none).toMatchObject({ pressed: 'none', ripple: 0 });
    expect(none.bg, `none: ${JSON.stringify(none)}`).toBe(none.hovered);
    expect((await press(undefined, 'sparkle')).pressed).toBe('overlay');
    // From the point of contact, in RTL too; from the center for a key; over the tokens' durations.
    await mountFixtures(page, spec, { icons: true, system: 'm3-like' });
    await page.locator('main').evaluate((el) => el.setAttribute('dir', 'rtl'));
    const c = part(page, 'action', 'action');
    const box = await bounds(c);
    await page.mouse.move(box.x + 4, box.y + box.height / 2);
    await page.mouse.down();
    const at = await c.locator('.ripple').evaluate((el) => Number.parseFloat(el.style.getPropertyValue('--_x')));
    await page.mouse.up();
    expect(at).toBeCloseTo(4, 0);
    await c.focus();
    await page.keyboard.down('Enter');
    // The newest layer is the first child (the pointer's may still be fading after it).
    const layer = await c.locator('.ripple').first().evaluate((el) => {
      const s = getComputedStyle(el);
      return { x: Number.parseFloat(el.style.getPropertyValue('--_x')) / el.getBoundingClientRect().width, grow: Number.parseFloat(s.animationDuration) * 1000, fade: Number.parseFloat(s.transitionDuration) * 1000 };
    });
    await page.keyboard.up('Enter');
    expect(layer.x).toBeCloseTo(0.5, 5);
    expect(layer.grow).toBe(await resolveToken(page, T('motion-feedback-duration'), 'duration'));
    expect(layer.fade).toBe(await resolveToken(page, T('motion-state-duration'), 'duration'));
  });

  test('SNK-7 corner smoothing and focus-style: cupertino eases the bar’s and the controls’ corners; acme shows focus as a glow', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, system: 'cupertino' });
    expect(await token(page, '--tanrei-sys-shape-corner-smoothing')).toBe('0.6');
    const eased = async (name: 'bar' | 'action', shape: string) => {
      const el = part(page, 'action', name);
      const radius = await resolveToken(page, T(shape));
      if (await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'))) {
        expect(Number.parseFloat((await css(el, 'corner-top-left-shape')).replace(/^superellipse\(|\)$/g, '')), name).toBeCloseTo(Math.log2(2.6), 3);
        expect(Number.parseFloat(await css(el, 'border-top-left-radius')), name).toBeCloseTo(radius * 1.24, 2);
      } else expect(Number.parseFloat(await css(el, 'border-top-left-radius')), name).toBe(radius);
    };
    await eased('bar', 'container-shape');
    // The controls' shape is the full step: a pill, which no smoothing eases (styles/shape.ts; the build writes
    // `controls-shape-pill: 1` beside it) — its caps are circles at the token's own radius, whatever the amount. This
    // test expected the eased corner on the action from before the controls became pills, and failed on it.
    expect(await token(page, T('controls-shape-pill'))).toBe('1');
    const action = part(page, 'action', 'action');
    expect(Number.parseFloat(await css(action, 'border-top-left-radius'))).toBe(await resolveToken(page, T('controls-shape')));
    if (await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'))) expect(await css(action, 'corner-top-left-shape')).toMatch(/^(round|superellipse\(1\))$/);
    // A product whose controls are not pills gets the eased corner on them as on the bar.
    await override(page, { [T('controls-shape')]: 'var(--tanrei-sys-shape-corner-small)', [T('controls-shape-pill')]: '0' });
    await eased('action', 'controls-shape');
    await mountFixtures(page, spec, { icons: true, system: 'acme', systemCss: await acmeSystemCss() });
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('glow');
    const c = part(page, 'action', 'action');
    await tabTo(page, c);
    expect(await css(c, 'outline-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(c, 'box-shadow', '::after')).not.toBe('none');
    await expect(c).toHaveAttribute('data-focus-style', 'glow');
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark, in place and shown by a host', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true });
      await page.evaluate(() => {
        document.querySelector('main')!.insertAdjacentHTML('beforeend', '<tanrei-snackbar-host></tanrei-snackbar-host>');
      });
      await page.waitForFunction(() => !!(document.querySelector('tanrei-snackbar-host') as any)?.show);
      await page.evaluate(
        ([message]) =>
          void (document.querySelector('tanrei-snackbar-host') as any).show({ status: 'error', statusLabel: 'Error', title: 'Message not sent', message, action: 'Retry', closable: true, closeLabel: 'Close', expandLabel: 'Show full message' }),
        [LONG],
      );
      await page.waitForTimeout(600);
      const results = await new AxeBuilder({ page }).include('main').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(' ')}`).join(', ')}`).toEqual([]);
    }
  });

  test('the close button is named by close-label, the expand button by expand-label, the action by its label; the bar is not a tab stop, and its text is one only while it scrolls', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const count = (prop: string, value: unknown) => spec.fixtures.filter((x) => x.props[prop] === value).length;
    await expect(page.getByRole('button', { name: 'Close' })).toHaveCount(count('closeLabel', 'Close'));
    await expect(page.getByRole('button', { name: 'Undo' })).toHaveCount(count('action', 'Undo'));
    await expect(page.getByRole('button', { name: 'Show full message' })).toHaveCount(count('expandLabel', 'Show full message'));
    expect(await page.evaluate(() => [...document.querySelectorAll('tanrei-snackbar')].some((s) => s.hasAttribute('tabindex') || !!s.shadowRoot!.querySelector('.bar[tabindex]')))).toBe(false);
    const stops = await page.evaluate(() => [...document.querySelectorAll('[data-fixture]')].filter((s) => !!s.querySelector('tanrei-snackbar')!.shadowRoot!.querySelector('.text[tabindex="0"]')).map((s) => (s as HTMLElement).dataset.fixture));
    expect(stops).toEqual(['expanded-scrolls']);
  });
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
  });
  for (const fixture of spec.fixtures) {
    test(`snapshot: ${fixture.id}`, async ({ page }) => {
      await expect(page.locator(`[data-fixture="${fixture.id}"]`)).toHaveScreenshot([spec.name, `${fixture.id}.png`]);
    });
  }
});
