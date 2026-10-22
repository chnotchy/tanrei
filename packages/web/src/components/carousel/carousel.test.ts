// <tanrei-carousel> and <tanrei-carousel-item>, driven by specs/carousel.spec.json: every behaviour id (CRL-1…38 and
// CRL-40) is cited by a test title, every fixture has a baseline, and every state and choice of kind is read back from
// the tokens — never from a number written here, except the spec's own worked examples (the verify notes of CRL-9 –
// CRL-13, CRL-26, CRL-27, CRL-29 and CRL-40).
//
// The fixtures are the spec's ten; the defaults are `centered` (a hero in the centre). A row with its hero at
// the start has no fixture: the tests that need one build it (`fixture(id, { heroAlignment: 'start' })`).
import AxeBuilder from '@axe-core/playwright';
import { type Browser, type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, acmeSystemCss, loadSpec, mountFixtures, resolveColor, resolveToken, tab, tabTo, rootTokens } from '../../../test/harness.js';
import { decodePng } from '../../../test/png.js';
import { holdClock as holdPageClock, releaseClock } from '../../../test/page-clock.js';
import { STOPPED_AFTER } from '../../../test/stopped-release.js';
import { clickCentre, heldPress } from '../../../test/watched-press.js';
import { motionEnded } from '../../../test/motions.js';
import { CarouselGeometry, type CarouselMetrics } from './carousel-geometry.js';

const spec = loadSpec('carousel');
type P = Page;
const T = (name: string) => `--tanrei-comp-carousel-${name}`;
const carousel = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-carousel`);
const item = (page: P, id: string, index: number) => carousel(page, id).locator('tanrei-carousel-item').nth(index);
const container = (page: P, id: string, index: number) => item(page, id, index).locator('.container');
const layer = (page: P, id: string, index: number) => item(page, id, index).locator('.state-layer');
const ripples = (page: P, id: string, index: number) => container(page, id, index).locator('.ripple');
const scroller = (page: P, id: string) => carousel(page, id).locator('.scroller');
const indicator = (page: P, id: string) => carousel(page, id).locator('.indicator');
const dots = (page: P, id: string) => carousel(page, id).locator('.dot');
const playback = (page: P, id: string) => carousel(page, id).locator('.playback');
/** The previous or the next control (CRL-41): a `<tanrei-button>`, and the native button inside it. */
const nav = (page: P, id: string, control: 'previous' | 'next') => carousel(page, id).locator(`tanrei-button.${control}`);
const navButton = (page: P, id: string, control: 'previous' | 'next') => nav(page, id, control).locator('button');
const css = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
const pressed = (page: P, id: string, index: number) => container(page, id, index).getAttribute('data-pressed');
const bounds = async (locator: Locator) => (await locator.boundingBox())!;
const round = (n: number) => Math.round(n * 100) / 100;
/** Layout is in 1/64 px: a drawn length is its exact value within a fiftieth of a pixel. */
const NEAR = 0.02;
/**
 * A drawn item's start is on a device pixel and its end follows from the next start (CRL-40), so where the exact value
 * is not on one (a third of a pixel), what is drawn is within a device pixel of it: half a CSS pixel at the suite's
 * pixel ratio of 2.
 */
const DEVICE = 0.5 + NEAR;
function expectNear(actual: number[][], expected: number[][], message = '', tolerance = NEAR) {
  expect(actual.length, message).toBe(expected.length);
  actual.forEach((row, i) => row.forEach((value, j) => expect(Math.abs(value - expected[i][j]), `${message} [${i}][${j}]: ${value}, expected ${expected[i][j]}`).toBeLessThanOrEqual(tolerance)));
}
/** A press on the page away from every fixture: focus leaves the carousel (the body may be shorter than the window). */
const away = (page: P) => page.mouse.click(1200, 700);
/** The spec's fixtures by id, for a page that mounts only them (so they sit at the top of the page, in view). */
const only = (...ids: string[]) => spec.fixtures.filter((f) => ids.includes(f.id));

/** Every item's start and width (or its drawn container's, `part`), measured from the carousel's start edge (its right edge in right-to-left). */
const boxes = (page: P, id: string, part: 'item' | 'container' = 'item') =>
  carousel(page, id).evaluate((host, which) => {
    const own = host.getBoundingClientRect();
    const rtl = getComputedStyle(host).direction === 'rtl';
    return [...host.querySelectorAll('tanrei-carousel-item')].map((el) => {
      const r = (which === 'container' ? el.shadowRoot!.querySelector('.container')! : el).getBoundingClientRect();
      return [Math.round((rtl ? own.right - r.right : r.left - own.left) * 100) / 100, Math.round(r.width * 100) / 100];
    });
  }, part);
/** An item's centre and its content box's centre, and their start and end edges, measured in one frame. */
const edges = (locator: Locator) =>
  locator.evaluate((el) => {
    const [own, content] = [el.shadowRoot!.querySelector('.container')!.getBoundingClientRect(), el.shadowRoot!.querySelector('.content')!.getBoundingClientRect()];
    return { item: own.x + own.width / 2, content: content.x + content.width / 2, left: [own.left, content.left], right: [own.right, content.right] };
  });
/** The scroll offset along the reading direction. */
const offset = (page: P, id: string) => scroller(page, id).evaluate((el) => Math.abs(el.scrollLeft));
/** The scroll position p: the offset over the hero slot plus the gap. */
const step = async (page: P, id: string) => (await bounds(item(page, id, 0))).width + (await resolveToken(page, T('layout-gap')));
/**
 * Scrolls to `to` at once and returns the boxes in the next frame — after the carousel placed its items, before a
 * settle could move them.
 */
const boxesAt = (page: P, id: string, to: number) =>
  carousel(page, id).evaluate(async (host, o) => {
    const el = host.shadowRoot!.querySelector('.scroller')!;
    el.scrollLeft = getComputedStyle(host).direction === 'rtl' ? -o : o;
    await new Promise((r) => requestAnimationFrame(r));
    const own = host.getBoundingClientRect();
    const rtl = getComputedStyle(host).direction === 'rtl';
    return [...host.querySelectorAll('tanrei-carousel-item')].map((i) => {
      const r = i.getBoundingClientRect();
      return [Math.round((rtl ? own.right - r.right : r.left - own.left) * 100) / 100, Math.round(r.width * 100) / 100];
    });
  }, to);
/** Where an item's container is drawn: its start and end from the carousel's start edge (its right edge in right-to-left), its top and its height. */
type Drawn = [from: number, to: number, top: number, height: number];
/**
 * Runs in the page: puts a finger on the row or lifts it. While a finger rests on the row a scroll's end does not settle
 * it (CRL-14 settles when the drag is released), so the row can be held between resting positions and looked at.
 */
const finger = (host: Element, down: boolean) => {
  const event = Object.assign(new Event(down ? 'touchstart' : 'touchend'), { touches: down ? [{ clientX: 0, clientY: 0 }] : [], changedTouches: [{ clientX: 0, clientY: 0 }] });
  host.shadowRoot!.querySelector('.scroller')!.dispatchEvent(event);
};
/**
 * Holds the row `p` positions from where it rested when it was first held (plus `extra` px), settling suspended, and
 * returns every item's drawn container — the scaled box, not a layout box — in the frame after the items were placed.
 * A position is the hero slot plus the gap (CRL-12): the hero's width is the width the content is laid out at.
 */
const drawnAt = async (page: P, id: string, p: number, extra = 0) => {
  const gap = await resolveToken(page, T('layout-gap'));
  return carousel(page, id).evaluate(
    async (host, [p, gap, extra, fingerSource]) => {
      const el = host.shadowRoot!.querySelector('.scroller') as HTMLElement;
      const rtl = getComputedStyle(host).direction === 'rtl';
      (0, eval)(`(${fingerSource})`)(host, true);
      const held = ((host as unknown as { __held?: { base: number; step: number } }).__held ??= {
        base: Math.abs(el.scrollLeft),
        step: Number.parseFloat(host.querySelector<HTMLElement>('tanrei-carousel-item')!.style.getPropertyValue('--_content')) + gap,
      });
      const to = held.base + p * held.step + extra;
      el.scrollLeft = rtl ? -to : to;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const own = host.getBoundingClientRect();
      const boxes = [...host.querySelectorAll('tanrei-carousel-item')].map((item) => {
        const r = item.shadowRoot!.querySelector('.container')!.getBoundingClientRect();
        return [rtl ? own.right - r.right : r.left - own.left, rtl ? own.right - r.left : r.right - own.left, r.top - own.top, r.height].map((v) => Math.round(v * 1000) / 1000) as Drawn;
      });
      return { offset: Math.abs(el.scrollLeft), step: held.step, boxes };
    },
    [p, gap, extra, finger.toString()] as const,
  );
};
/** Lifts the finger `drawnAt` put on the row: it settles again when a scroll ends. */
const release = (page: P, id: string) => carousel(page, id).evaluate((host, fingerSource) => (0, eval)(`(${fingerSource})`)(host, false), finger.toString());
/** The gaps between neighbouring drawn containers: each start less the previous end, for the items that have a width (CRL-40). */
const gapsOf = (boxes: Drawn[]) => {
  const drawn = boxes.filter(([from, to]) => to - from > 0).sort((a, b) => a[0] - b[0]);
  return drawn.slice(1).map(([from], i) => Math.round((from - drawn[i][1]) * 1000) / 1000);
};
/**
 * The dots at scroll offset `to`, in the next frame: their widths and the opacity of their fills, read together. The
 * settle begins 100 ms after the last scroll event, so anything read in a round trip of its own may be read of a row
 * that has begun to move back.
 */
const indicatorAt = (page: P, id: string, to: number) =>
  carousel(page, id).evaluate(async (host, o) => {
    const el = host.shadowRoot!.querySelector('.scroller')!;
    el.scrollLeft = getComputedStyle(host).direction === 'rtl' ? -o : o;
    await new Promise((r) => requestAnimationFrame(r));
    const all = [...host.shadowRoot!.querySelectorAll('.dot')];
    return { widths: all.map((d) => Math.round(d.getBoundingClientRect().width * 100) / 100), fills: all.map((d) => Number(getComputedStyle(d.querySelector('.fill')!).opacity)) };
  }, to);
/** The dots' widths at scroll offset `to`, in the next frame. */
const dotsAt = async (page: P, id: string, to: number) => (await indicatorAt(page, id, to)).widths;
/** Records every scroll offset the scroller passes through. */
const trace = (page: P, id: string) =>
  scroller(page, id).evaluate((el) => {
    const seen: number[] = ((window as any).offsets = []);
    el.addEventListener('scroll', () => seen.push(Math.round(Math.abs(el.scrollLeft) * 100) / 100));
  });
const traced = (page: P) => page.evaluate(() => (window as any).offsets as number[]);
/**
 * The offsets of a settle after a wheel: those after the row was farthest from where it started. The wheel's own scroll
 * is the platform's (CRL-14), and an engine may animate it — WebKit on Linux passes through offsets on its way there —
 * so only what comes after it is the settle's.
 */
const settled = (offsets: number[]) => offsets.slice(offsets.lastIndexOf(Math.max(...offsets)) + 1);
/**
 * Holds the carousel's next scroll motions (a settle, a scroll into place, a dot's or a control's move) at their start
 * as they are played, so that `stepMotion` steps one through its duration and reads what the row passes at fixed moments
 * of the motion — not in whatever frames a busy machine draws: WebKit in the CI image can draw frames more than half a
 * second apart, and a frame that late sees the whole of a scroll motion as one jump. The motion's timing is an animation
 * without a target (the carousel writes the offset from its progress), so it is caught as it is played. Another
 * carousel's motion (an autoplay advance) is timed the same way and would be held too: use `stepMotion` on a page with no
 * autoplay, or `stepDrawn`, which steps every motion held.
 */
const holdMotions = (page: P) =>
  page.evaluate(() => {
    const w = window as any;
    w.heldMotions = [];
    w.play ??= Animation.prototype.play;
    Animation.prototype.play = function (this: Animation) {
      w.play.call(this);
      if (this.effect instanceof KeyframeEffect && this.effect.target === null) {
        this.pause();
        this.currentTime = 0;
        w.heldMotions.push(this);
      }
    };
  });
/**
 * Waits for a motion `holdMotions` caught, lets the motions after it run freely, and steps the last one still held
 * through its duration in tenths, reading at each the offset the carousel wrote there; then lets it finish. Returns its
 * duration and the offsets it passed.
 */
const stepMotion = async (page: P, id: string) => {
  await expect.poll(() => page.evaluate(() => ((window as any).heldMotions as Animation[]).filter((a) => a.playState === 'paused').length), 'a motion began').toBeGreaterThan(0);
  return scroller(page, id).evaluate(async (el) => {
    const w = window as any;
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    Animation.prototype.play = w.play;
    delete w.play;
    const timing = (w.heldMotions as Animation[]).filter((a) => a.playState === 'paused').pop()!;
    const duration = Number(timing.effect!.getComputedTiming().duration);
    const passed: number[] = [];
    for (let i = 1; i < 10; i++) {
      timing.currentTime = (duration * i) / 10;
      // The carousel writes the offset in its next frame; it is read in the one after.
      await frame();
      await frame();
      passed.push(Math.abs(el.scrollLeft));
    }
    timing.finish();
    return { duration, passed };
  });
};
/**
 * A motion from `from` to `to`, read at tenths of it: it passes through several moments between the two (it does not
 * move at once), never away from where it is going.
 */
function expectOver(passed: number[], from: number, to: number) {
  const [low, high] = [Math.min(from, to), Math.max(from, to)];
  expect(passed.filter((o) => o > low && o < high).length, `animated: ${from} → ${passed} → ${to}`).toBeGreaterThan(1);
  expect(passed.every((o, i) => Math.abs(to - o) <= Math.abs(to - (i === 0 ? from : passed[i - 1]))), `toward ${to}: ${from} → ${passed}`).toBe(true);
}
/** The offset and every item's drawn container — the scaled box, not a layout box — of one carousel at one moment (CRL-40). */
type Moment = { offset: number; boxes: Drawn[] };
/**
 * Waits until `count` motions `holdMotions` caught are held, lets the motions after them run freely, and steps all of
 * them together through their durations in tenths, from the start (0) to the end (10) inclusive; then lets them finish.
 * At each moment, and once more at rest after they finished, it reads the offset and every item's drawn container of
 * the carousels of `ids` — read in one frame, the frame after the one the carousel wrote the offset and placed the items
 * in. So what is read between two resting positions is the same nine moments of a motion on any machine, however far
 * apart it draws its frames. Returns the motions' durations and, for each carousel, the twelve moments in order.
 */
const stepDrawn = async (page: P, ids: string[], count = 1) => {
  await expect.poll(() => page.evaluate(() => ((window as any).heldMotions as Animation[]).filter((a) => a.playState === 'paused').length), `${count} motion(s) began`).toBeGreaterThanOrEqual(count);
  return page.evaluate(async (ids) => {
    const w = window as any;
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    Animation.prototype.play = w.play;
    delete w.play;
    const held = (w.heldMotions as Animation[]).filter((a) => a.playState === 'paused');
    const durations = held.map((timing) => Number(timing.effect!.getComputedTiming().duration));
    const hosts = ids.map((id) => [id, document.querySelector(`[data-fixture="${id}"] tanrei-carousel`)!] as const);
    const moments: Record<string, { offset: number; boxes: number[][] }[]> = Object.fromEntries(ids.map((id) => [id, []]));
    const read = () => {
      for (const [id, host] of hosts) {
        const own = host.getBoundingClientRect();
        const rtl = getComputedStyle(host).direction === 'rtl';
        moments[id].push({
          offset: Math.abs(host.shadowRoot!.querySelector('.scroller')!.scrollLeft),
          boxes: [...host.querySelectorAll('tanrei-carousel-item')].map((item) => {
            const r = item.shadowRoot!.querySelector('.container')!.getBoundingClientRect();
            return [rtl ? own.right - r.right : r.left - own.left, rtl ? own.right - r.left : r.right - own.left, r.top - own.top, r.height].map((v) => Math.round(v * 1000) / 1000);
          }),
        });
      }
    };
    for (let i = 0; i <= 11; i++) {
      if (i <= 10) held.forEach((timing, k) => (timing.currentTime = (durations[k] * i) / 10));
      else held.forEach((timing) => timing.finish());
      // The carousel writes the offset and places the items in its next frame; they are read in the one after.
      await frame();
      await frame();
      read();
    }
    return { durations, moments: moments as Record<string, Moment[]> };
  }, ids);
};
/**
 * Waits until the row is at rest: no scroll event for as long as the carousel's longest motion lasts (the scroll motion
 * and the advance, their tokens read through the same properties the carousel reads), and two frames at least. A scroll
 * written in one frame (a motion's last step) is reported in the next, so a task that already reads the final offset can
 * come before that report — and a trace started there would record the earlier motion's end as the next action's first
 * offset. Two quiet frames alone are not enough: WebKit keeps `scrollLeft` in whole CSS pixels, and the decelerating tail
 * of a motion can move the row less than one over several frames, which change nothing and so report nothing while the
 * motion still runs. A motion begun before the wait ends within its duration of the wait's start or of its own last
 * scroll event, whichever is later.
 */
const atRest = (page: P, id: string) =>
  scroller(page, id).evaluate(async (el) => {
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    const root = el.getRootNode() as ShadowRoot;
    const ms = (carrier: Element | null) => (carrier ? (Number.parseFloat(getComputedStyle(carrier).animationDuration) || 0) * 1000 : 0);
    const longest = Math.max(ms(el), ms(root.querySelector('.timing')));
    let last = performance.now();
    let moved = true;
    const mark = () => {
      moved = true;
      last = performance.now();
    };
    el.addEventListener('scroll', mark);
    while (moved || performance.now() - last <= longest) {
      moved = false;
      await frame();
      await frame();
    }
    el.removeEventListener('scroll', mark);
  });
/** Counts the click events of each item of a fixture, by label. */
const listen = (page: P, id: string) =>
  carousel(page, id).evaluate((host) => {
    const log: Record<string, number> = ((window as any).clicks = {});
    for (const el of host.querySelectorAll('tanrei-carousel-item')) el.addEventListener('click', () => (log[el.getAttribute('label')!] = (log[el.getAttribute('label')!] ?? 0) + 1));
  });
const clicks = (page: P) => page.evaluate(() => (window as any).clicks as Record<string, number>);
/** Captures what the page reports in debug builds (console warnings). Call before mounting. */
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
/** What has keyboard focus: an item by its label, or the carousel's own control by its class. */
const focused = (page: P) =>
  page.evaluate(() => {
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    const host = (active?.getRootNode() as ShadowRoot | undefined)?.host;
    if (host?.localName === 'tanrei-carousel-item') return host.getAttribute('label');
    if (host?.localName === 'tanrei-button') return host.classList.contains('previous') ? 'previous' : 'next';
    if (active?.classList.contains('playback')) return 'playback';
    if (active?.classList.contains('indicator')) return 'indicator';
    return null;
  });
const LABELS = ['Coast path', 'Old forest', 'Lake shore', 'City park', 'Dunes', 'Summit'];
const GLYPHS = ['landscape', 'forest', 'water', 'park', 'sunny', 'filter_hdr'];
/** A fixture of the test's own: `count` items, with the defaults unless `props` says otherwise. */
const fixture = (id: string, props: Fixture['props'], count = 6, content?: (i: number) => string): Fixture => ({
  id,
  props: { label: 'Walks near you', previousLabel: 'Previous walk', nextLabel: 'Next walk', ...props },
  items: Array.from({ length: count }, (_, i) => ({ kind: 'item', props: { label: LABELS[i % 6] }, content: content ? content(i) : GLYPHS[i % 6] })),
});
/** The state layer as drawn: its color and opacity. */
const drawnLayer = async (page: P, id: string, index: number) => ({ color: await css(layer(page, id, index), 'background-color'), opacity: Number(await css(layer(page, id, index), 'opacity')) });
const expectedLayer = async (page: P, state: 'hovered' | 'focused' | 'pressed') => {
  const sys = { hovered: 'hover', focused: 'focus', pressed: 'pressed' }[state];
  return { color: await resolveColor(page, T(`item-${state}-state-layer-color`)), opacity: Number(await token(page, `--tanrei-sys-state-${sys}-state-layer-opacity`)) };
};
/** Everything a state paints on the item, as drawn. */
const drawn = async (page: P, id: string, index: number) => ({
  container: await css(container(page, id, index), 'background-color'),
  content: await css(container(page, id, index), 'color'),
  opacity: await css(container(page, id, index), 'opacity'),
  radius: Number.parseFloat(await css(container(page, id, index), 'border-top-left-radius')),
  layer: await drawnLayer(page, id, index),
});
const expected = async (page: P, state?: 'hovered' | 'focused' | 'pressed') => ({
  container: await resolveColor(page, T('item-container-color')),
  content: await resolveColor(page, T(`item-${state ? `${state}-` : ''}content-color`)),
  opacity: state ? await token(page, T(`${state}-opacity`)) : '1',
  radius: await resolveToken(page, T(`${state ? `${state}-` : ''}container-shape`)),
  layer: state ? await expectedLayer(page, state) : { color: await resolveColor(page, T('item-state-layer-color')), opacity: 0 },
});
/** A control of the controls row (the indicator or the playback control) as drawn, and as its state's tokens say. */
const drawnControl = async (locator: Locator) => ({ container: await css(locator, 'background-color'), content: await css(locator, 'color'), opacity: await css(locator, 'opacity') });
const expectedControl = async (page: P, control: 'indicator' | 'playback', state?: 'hovered' | 'focused' | 'pressed') => ({
  container: await resolveColor(page, T(`${control}-${state ? `${state}-` : ''}container-color`)),
  content: await resolveColor(page, T(`${control}-${state ? `${state}-` : ''}content-color`)),
  opacity: state ? await token(page, T(`${state}-opacity`)) : '1',
});
/**
 * A context whose pointer is a touchscreen (Chromium: touch events are dispatched over CDP). `at` stamps the event with
 * the time the finger was there (ms since the epoch, never later than now): the page and the browser's own gestures then
 * see the finger's timing, not how long each CDP round trip took on this machine.
 */
async function touchPage(browser: Browser) {
  const context = await browser.newContext({ hasTouch: true, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const touch = (type: string, x: number, y: number, at?: number) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }], ...(at === undefined ? {} : { timestamp: at / 1000 }) } as never);
  return { context, page, touch };
}
/**
 * CRL-36: the fill of the current dot is drawn by an animation the browser runs on its own timeline, which is not the
 * page clock's. Where a test holds the page clock, it holds that timeline too: every animation of a dot's fill runs at
 * a rate of zero from the moment it is made (so it is where the carousel put it, and a screenshot that disables
 * animations leaves it there), and `tick()` moves the running ones with the clock.
 */
async function holdFills(page: P) {
  const hold = () => {
    const held = ((window as unknown as { __fills: Animation[] }).__fills = [] as Animation[]);
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (this: Element, ...args: Parameters<Element['animate']>) {
      const animation = animate.apply(this, args);
      if (this.classList.contains('fill')) {
        animation.playbackRate = 0;
        held.push(animation);
      }
      return animation;
    };
  };
  // In the document the fixtures are written into (the harness sets its content), and in any it is navigated to.
  await page.addInitScript(hold);
  await page.evaluate(hold);
}
/**
 * The page's clock under the test's hand, and stopped: installed alone it still runs in real time between the test's
 * steps, so on a busy machine autoplay's interval would pass by itself. Paused, time passes only in `runFor` / `tick`.
 */
async function holdClock(page: P) {
  const start = new Date('2026-01-01T00:00:00Z');
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1000));
}
/** `ms` pass: on the page clock (timers, frames, `performance.now()`) and on the timeline of the fills that are running. */
async function tick(page: P, ms: number) {
  await page.evaluate((by) => {
    for (const animation of (window as unknown as { __fills: Animation[] }).__fills) {
      if (animation.playState === 'running') animation.currentTime = Number(animation.currentTime ?? 0) + by;
    }
  }, ms);
  await page.clock.runFor(ms);
}
/**
 * Mounts `fixtures` with the page's clock under the test's hand (timers, frames and `performance.now()`), and the
 * carousel's own motions made instant — the Web Animations timeline that times them is not the page clock's — so that
 * autoplay's interval passes only when the test says so (CRL-32 – CRL-36).
 */
async function clockPage(page: P, fixtures: Fixture[]) {
  await holdClock(page);
  await holdFills(page);
  // On the held clock the page counts itself painted only when the test runs it: the harness does not wait for that.
  await mountFixtures(page, spec, { icons: true, fixtures, beforePaint: true });
  await override(page, { [T('motion-autoplay-duration')]: '0ms', [T('motion-scroll-duration')]: '0ms' });
  // Out of the way of every carousel: the pointer holds autoplay while it is over one.
  await page.mouse.move(1200, 700);
}
/** The interval the default tokens give, in ms. */
const interval = (page: P) => resolveToken(page, T('autoplay-interval'), 'duration');
/** The resting position the indicator reports, from 1. */
const now = (page: P, id: string) => indicator(page, id).getAttribute('aria-valuenow').then(Number);

// ── The geometry, as the spec's worked examples state it ────────────────────────────────────────────
test.describe('geometry', () => {
  const tokens = { padding: 16, gap: 8, smallMin: 40, smallMax: 56 };
  type Options = Partial<CarouselMetrics> & { width: number; largeWidth: number };
  /** The defaults: a hero in the centre, fluid widths, 6 items. */
  const make = (o: Options) => new CarouselGeometry({ ...tokens, heroAlignment: 'center', fluid: true, snap: true, loop: false, count: 6, ...o });
  const start = (o: Options) => make({ heroAlignment: 'start', ...o });
  const layout = (g: CarouselGeometry) => [round(g.hero), ...g.side.map(round)];
  /** Item `i` at `p` as [start, width], or null where it is not drawn. */
  const at = (g: CarouselGeometry, i: number, p: number) => {
    const { start: x, width, drawn } = g.item(i, p);
    return drawn ? [round(x), round(width)] : null;
  };
  /** The gaps between the drawn items that stand next to each other at `p`, unrounded. */
  const gaps = (g: CarouselGeometry, p: number) => {
    const drawn = Array.from({ length: g.count }, (_, i) => g.item(i, p))
      .filter((item) => item.drawn)
      .sort((a, b) => a.s - b.s);
    return drawn.slice(1).map((item, i) => item.start - (drawn[i].start + drawn[i].width));
  };

  test('CRL-9: L is the hero’s width, kept between the floor and the cap of its alignment; a row too narrow for side slots is laid out as fixed widths, H being W', () => {
    // At the centre the floor is 74.67 and the cap 240; at the start 148 and 304 (W 368).
    expect(layout(make({ width: 400, largeWidth: 200 }))[0]).toBe(200);
    expect(layout(make({ width: 400, largeWidth: 120 }))[0]).toBe(120);
    expect(layout(make({ width: 400, largeWidth: 320 }))[0]).toBe(240);
    expect(layout(make({ width: 400, largeWidth: 60 }))[0]).toBe(74.67);
    expect(layout(start({ width: 400, largeWidth: 200 }))[0]).toBe(200);
    expect(layout(start({ width: 400, largeWidth: 120 }))[0]).toBe(148);
    expect(layout(start({ width: 400, largeWidth: 320 }))[0]).toBe(304);
    // Fixed widths: L, at most W.
    expect(layout(make({ width: 400, largeWidth: 1000, fluid: false }))).toEqual([368]);
    // The fallback: below W 184 at the centre, below W 120 at the start.
    expect(make({ width: 32 + 183, largeWidth: 200 }).oneSlot).toBe(true);
    expect(make({ width: 32 + 185, largeWidth: 200 }).oneSlot).toBe(false);
    expect(start({ width: 32 + 119, largeWidth: 200 }).oneSlot).toBe(true);
    expect(start({ width: 32 + 121, largeWidth: 200 }).oneSlot).toBe(false);
    for (const g of [make({ width: 32 + 183, largeWidth: 200 }), start({ width: 32 + 119, largeWidth: 200 })]) {
      const w = g.inner;
      // As fixed widths (CRL-13): no side slot and no edge slot, every item W wide, W + g apart, none left undrawn.
      expect([g.fluid, g.hero, g.heroStart, g.side]).toEqual([false, w, 0, []]);
      expect([at(g, 0, 0), at(g, 1, 0), at(g, 0, 0.5), at(g, 1, 0.5)]).toEqual([[0, w], [w + 8, w], [round(-(w + 8) / 2), w], [round((w + 8) / 2), w]]);
      expect(g.maxPosition).toBe(5);
      // CRL-17, CRL-18 read the prop: the row still brings an item to slot 0.
      expect(g.toSlot).toBe(true);
    }
  });

  test('CRL-10: the fluid arrangement on each side where items follow — the worked examples, unrounded', () => {
    expect(layout(make({ width: 400, largeWidth: 200 }))).toEqual([200, 76]);
    expect(layout(make({ width: 400, largeWidth: 320 }))).toEqual([240, 56]);
    expect(layout(make({ width: 400, largeWidth: 120 }))).toEqual([120, 68, 40]);
    expect(layout(make({ width: 800, largeWidth: 200 }))).toEqual([208, 208, 56]);
    expect(layout(start({ width: 400, largeWidth: 200 }))).toEqual([200, 101.33, 50.67]);
    expect(layout(start({ width: 400, largeWidth: 320 }))).toEqual([304, 56]);
    expect(layout(start({ width: 800, largeWidth: 200 }))).toEqual([348, 348, 56]);
    expect(layout(start({ width: 400, largeWidth: 120 }))).toEqual([148, 148, 56]);
    // Not rounded before the items are placed.
    expect(start({ width: 400, largeWidth: 200 }).side[0]).not.toBe(Math.round(start({ width: 400, largeWidth: 200 }).side[0]));
  });

  test('CRL-11: the hero slot with its middle at the middle of W, or at the inner start edge; every other slot g beyond the one before it', () => {
    const g = make({ width: 400, largeWidth: 200, loop: true, count: 5 });
    expect(g.heroStart).toBe(84);
    // The small slots at 0 and 292.
    expect([4, 0, 1].map((i) => at(g, i, g.middle))).toEqual([[0, 76], [84, 200], [292, 76]]);
    const s = start({ width: 400, largeWidth: 200 });
    expect(s.heroStart).toBe(0);
    expect([0, 1, 2].map((i) => at(s, i, 0))).toEqual([[0, 200], [208, 101.33], [317.33, 50.67]]);
    // Two slots on each side, each g beyond the one before it going outward.
    const two = make({ width: 400, largeWidth: 120, loop: true });
    expect([4, 5, 0, 1, 2].map((i) => at(two, i, two.middle))).toEqual([[0, 40], [48, 68], [124, 120], [252, 68], [328, 40]]);
  });

  test('CRL-12: the edge slots have no width and lie g beyond the last slot; the items at p 0.5 as the verify note has them, for both alignments', () => {
    const g = make({ width: 400, largeWidth: 200, count: 5 });
    // p runs from 0 to N − 1: one resting position per item.
    expect([g.step, g.maxPosition, g.range, g.restingCount]).toEqual([208, 4, 832, 5]);
    // The edge slot after the hero at 376, the one before it at −8, each of no width: an item there is not drawn.
    expect([g.item(2, 0), g.item(0, 2)].map(({ start: x, width, drawn }) => [x, width, drawn])).toEqual([[376, 0, false], [-8, 0, false]]);
    expect([at(g, 0, 0), at(g, 1, 0), at(g, 2, 0), at(g, 3, 0)]).toEqual([[84, 200], [292, 76], null, null]);
    expect([0, 1, 2, 3, 4].map((i) => at(g, i, 0.5))).toEqual([[42, 138], [188, 138], [334, 38], null, null]);
    // An item grows from nothing at the edge slot, and narrows to nothing as it leaves.
    expect(round(g.item(2, 0.01).width)).toBe(0.76);
    expect(round(g.item(0, 1.99).width)).toBe(0.76);
    // At the end of the range the last item is the hero and the slots after it are empty.
    expect([at(g, 3, 4), at(g, 4, 4)]).toEqual([[0, 76], [84, 200]]);
    // A hero at the start, 6 items: the edge slot before it lies g before the hero slot itself, and the hero narrows
    // against the inner start edge as it leaves.
    const s = start({ width: 400, largeWidth: 200 });
    expect([s.step, s.maxPosition, s.range, s.restingCount]).toEqual([208, 5, 1040, 6]);
    expect([s.item(0, 1), s.item(3, 0)].map(({ start: x, width, drawn }) => [round(x), width, drawn])).toEqual([[-8, 0, false], [376, 0, false]]);
    expect([0, 1, 2, 3, 4, 5].map((i) => at(s, i, 0.5))).toEqual([[-4, 100], [104, 150.67], [262.67, 76], [346.67, 25.33], null, null]);
    expect(at(s, 5, 5)).toEqual([0, 200]);
  });

  test('CRL-13: fixed widths are slots H wide and H + g apart without end; at the start, unscaled, the range ends where the last item ends at the inner end edge', () => {
    const g = make({ width: 400, largeWidth: 200, fluid: false, count: 5 });
    expect([at(g, 0, 0), at(g, 1, 0)]).toEqual([[84, 200], [292, 200]]);
    expect([at(g, 0, 0.5), at(g, 1, 0.5)]).toEqual([[-20, 200], [188, 200]]);
    // No edge slot: every item is drawn, however far beyond the carousel's edges (where it is clipped).
    expect([at(g, 4, 0), at(g, 0, 4)]).toEqual([[84 + 4 * 208, 200], [84 - 4 * 208, 200]]);
    // Centred: p runs to N − 1.
    expect([g.maxPosition, g.restingCount]).toEqual([4, 5]);
    const s = start({ width: 400, largeWidth: 200, fluid: false, count: 5 });
    expect([at(s, 0, 0), at(s, 1, 0)]).toEqual([[0, 200], [208, 200]]);
    expect(round(s.maxPosition)).toBe(3.19);
    expect(s.maxPosition).toBe(664 / 208);
    expect(s.restingCount).toBe(5);
    expect(round(s.item(4, s.maxPosition).start + 200)).toBe(368);
    // Every item fits: no scroll at all.
    expect(start({ width: 400, largeWidth: 100, fluid: false, count: 3 }).maxPosition).toBe(0);
    // Not while the others are scaled (the scaled slots close up, so the formula would leave the row short), nor under loop.
    expect(start({ width: 400, largeWidth: 200, fluid: false, count: 5, scaleOthers: true, minScale: 0.85 }).maxPosition).toBe(4);
  });

  test('CRL-14, CRL-17, CRL-18: settle to the fling’s next or the nearest resting position; the resting item; into place', () => {
    const g = start({ width: 400, largeWidth: 200 });
    expect([g.settlePosition(0.3, 0), g.settlePosition(0.3, 1), g.settlePosition(0.7, -1), g.settlePosition(0.7, 0)]).toEqual([0, 1, 0, 1]);
    // The end of a range that ends at a fraction is a resting position: nearest it from 3.1 (3 is 0.1 away, 3.19 is 0.09).
    const f = start({ width: 400, largeWidth: 200, fluid: false, count: 5 });
    expect(round(f.settlePosition(3.1, 0))).toBe(3.19);
    expect(f.settlePosition(3.03, 0)).toBe(3);
    // Fixed widths at the start with free scroll: the first item wholly in view, and into view with the least scroll.
    const free = start({ width: 400, largeWidth: 200, fluid: false, snap: false, count: 5 });
    expect(free.toSlot).toBe(false);
    expect(free.restingIndex(100 / 208)).toBe(1);
    expect(round(free.revealPosition(1, 0) * free.step)).toBe(208 + 200 - 368);
    // Fluid widths, a hero in the centre or a row that snaps: the item at slot 0, and to slot 0.
    for (const slotted of [make({ width: 400, largeWidth: 200, fluid: false, snap: false, count: 5 }), f, g]) {
      expect(slotted.toSlot).toBe(true);
      expect([slotted.restingIndex(0.4), slotted.restingIndex(0.6)]).toEqual([0, 1]);
    }
    expect(g.revealPosition(5, 0)).toBe(5);
    // The shorter way round under loop.
    const l = make({ width: 400, largeWidth: 200, loop: true });
    expect(l.revealPosition(5, l.middle) - l.middle).toBe(-1);
    expect(l.revealPosition(2, l.middle) - l.middle).toBe(2);
  });

  test('CRL-26: the scale belongs to the slots — with fixed widths the scaled slots close up, g between drawn edges; with fluid widths the widths stay', () => {
    const scaled = { scaleOthers: true, minScale: 0.85 };
    const g = make({ width: 400, largeWidth: 200, fluid: false, loop: true, count: 5, ...scaled });
    const here = (i: number, p: number) => {
      const { start: x, width, scale } = g.item(i, g.middle + p);
      return [round(x), round(x + width), Math.round(scale * 1000) / 1000];
    };
    // Slot 1 from 292 to 462, slot −1 from −94 to 76, slot 2 from 470; the hero whole.
    expect([here(0, 0), here(1, 0), here(4, 0), here(2, 0)]).toEqual([[84, 284, 1], [292, 462, 0.85], [-94, 76, 0.85], [470, 640, 0.85]]);
    // At p 0.5: item 0 from −5 to 180 and item 1 from 188 to 373, each at 0.925; item 2 from 381.
    expect([here(0, 0.5), here(1, 0.5), here(2, 0.5)]).toEqual([[-5, 180, 0.925], [188, 373, 0.925], [381, 551, 0.85]]);
    // A hero at the start: the hero slot from 0 to 200, slot 1 from 208 to 378, slot 2 from 386.
    const s = start({ width: 400, largeWidth: 200, fluid: false, count: 5, ...scaled });
    expect([0, 1, 2].map((i) => at(s, i, 0))).toEqual([[0, 200], [208, 170], [386, 170]]);
    // Fluid widths: the slots keep the widths of CRL-10; only the scale is told.
    const fluid = make({ width: 400, largeWidth: 200, loop: true, count: 5, ...scaled });
    expect([4, 0, 1].map((i) => at(fluid, i, fluid.middle))).toEqual([[0, 76], [84, 200], [292, 76]]);
    expect([4, 0, 1].map((i) => fluid.item(i, fluid.middle).scale)).toEqual([0.85, 1, 0.85]);
    // Unscaled, every scale is 1.
    expect(make({ width: 400, largeWidth: 200 }).item(1, 0).scale).toBe(1);
  });

  test('CRL-27: under loop every item sits once in the window around the hero, and passes to the other side at the edge slots, where it has no width; fewer than two items do not loop', () => {
    const g = make({ width: 400, largeWidth: 200, loop: true, count: 5 });
    const here = (i: number, p = 0) => {
      const { start: x, width, s, drawn } = g.item(i, g.middle + p);
      return [s, round(x), round(x + width), drawn];
    };
    // At p 0: item 4 at slot −1, item 0 at slot 0, item 1 at slot 1; items 2 and 3 at the edge slots, not drawn.
    expect([4, 0, 1, 2, 3].map((i) => here(i))).toEqual([[-1, 0, 76, true], [0, 84, 284, true], [1, 292, 368, true], [2, 376, 376, false], [-2, -8, -8, false]]);
    // At p 0.5: item 4 from −4 to 34, item 0 from 42 to 180, item 1 from 188 to 326, item 2 from 334 to 372.
    expect([4, 0, 1, 2].map((i) => here(i, 0.5).slice(1))).toEqual([[-4, 34, true], [42, 180, true], [188, 326, true], [334, 372, true]]);
    // A hero at the start: s above −1 and at most N − 1.
    const s = start({ width: 400, largeWidth: 200, loop: true, count: 5 });
    expect([0, 1, 2, 3, 4].map((i) => s.item(i, s.middle + 0.5).s)).toEqual([-0.5, 0.5, 1.5, 2.5, 3.5]);
    expect(make({ width: 400, largeWidth: 200, loop: true, count: 1 }).loop).toBe(false);
    expect(g.recentre(1)).toBe(g.middle + 1);
  });

  test('CRL-29: the indicator’s position follows p; dot widths as the verify note has them, around the ring under loop', () => {
    const g = make({ width: 400, largeWidth: 200 });
    const width = (q: number, j: number, geometry = g) => 8 + 16 * Math.max(0, 1 - geometry.dotDistance(q, j));
    expect([width(g.indicatorPosition(0.25), 0), width(g.indicatorPosition(0.25), 1)]).toEqual([20, 12]);
    const l = make({ width: 400, largeWidth: 200, loop: true });
    expect([width(l.indicatorPosition(5.5), 5, l), width(l.indicatorPosition(5.5), 0, l)]).toEqual([16, 16]);
    // Between resting positions that are not a whole position apart (3 and 664 / 208, the end of the range), q still
    // runs from 3 to 4: half way between them it is 3.5.
    const f = start({ width: 400, largeWidth: 200, fluid: false, count: 5 });
    expect(round(f.indicatorPosition((3 + f.maxPosition) / 2))).toBe(3.5);
  });

  test('CRL-4: an item between the last slot and an edge slot is told apart — it is narrower than any slot', () => {
    const g = make({ width: 400, largeWidth: 200, count: 5 });
    expect([0, 1, 2].map((i) => g.item(i, 0.1).transit)).toEqual([false, false, true]);
    expect(round(g.item(2, 0.1).width)).toBe(7.6);
    // At rest no item is on its way.
    expect([0, 1, 2, 3, 4].some((i) => g.item(i, 1).transit)).toBe(false);
    // A hero at the start narrows against the inner start edge as it leaves: on its way too.
    expect(start({ width: 400, largeWidth: 200 }).item(0, 0.5).transit).toBe(true);
  });

  test('CRL-40: every two neighbours that are drawn are g apart at every scroll position — every alignment, width, scale and loop, and other tokens', () => {
    // Some 40 000 gaps: each that is not g is collected and the list is expected empty once. A Playwright `expect` per
    // gap records a step apiece, and the sweep took 40 to 58 s on CI — past its 30 s, unseen, as it never awaits.
    const wrong: string[] = [];
    for (const system of [tokens, { padding: 24, gap: 12, smallMin: 40, smallMax: 56 }]) {
      for (const heroAlignment of ['center', 'start'] as const) {
        for (const fluid of [true, false]) {
          for (const scaleOthers of [false, true]) {
            for (const loop of [false, true]) {
              for (const [width, largeWidth, count] of [[400, 200, 5], [400, 120, 6], [800, 200, 7], [200, 200, 4], [400, 320, 2]]) {
                const g = new CarouselGeometry({ ...system, width, largeWidth, heroAlignment, fluid, scaleOthers, minScale: 0.85, snap: true, loop, count });
                const from = g.loop ? g.middle : 0;
                const to = g.loop ? g.middle + count : g.maxPosition;
                let pairs = 0;
                for (let p = from; p <= to + 1e-9; p += 0.0625) {
                  for (const gap of gaps(g, p)) {
                    pairs++;
                    if (!(Math.abs(gap - system.gap) < 1e-9)) wrong.push(`${heroAlignment} fluid ${fluid} scaled ${scaleOthers} loop ${loop} W ${width} L ${largeWidth} N ${count} at p ${p}: ${gap}`);
                  }
                }
                if (pairs === 0) wrong.push(`${heroAlignment} fluid ${fluid} scaled ${scaleOthers} loop ${loop} W ${width} L ${largeWidth} N ${count}: no two drawn neighbours`);
              }
            }
          }
        }
      }
    }
    expect(wrong.slice(0, 20), `${wrong.length} gaps that are not g`).toEqual([]);
  });
});

test.describe('behavior', () => {
  // Building the acme fixture system takes longer than a test's budget on a busy machine: once per worker, up front.
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await acmeSystemCss();
  });
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
  });

  test('CRL-1: pointer, Enter and Space each emit the item’s click exactly once — Enter on key-down, Space on key-up', async ({ page }) => {
    const id = 'centered';
    await listen(page, id);
    await item(page, id, 1).click();
    expect(await clicks(page)).toEqual({ 'Old forest': 1 });
    await tabTo(page, container(page, id, 1));
    await page.keyboard.down('Enter');
    expect((await clicks(page))['Old forest'], 'Enter, on key-down').toBe(2);
    await page.keyboard.up('Enter');
    await page.keyboard.down('Space');
    expect((await clicks(page))['Old forest'], 'Space: nothing until the key comes up').toBe(2);
    await page.keyboard.up('Space');
    expect((await clicks(page))['Old forest'], 'Space, on key-up').toBe(3);
    await item(page, id, 0).evaluate((el) => (el as HTMLElement).click());
    expect(await clicks(page)).toEqual({ 'Old forest': 3, 'Coast path': 1 });
    // A Space whose key-up lands elsewhere does not activate (as a native button).
    await container(page, id, 1).focus();
    await page.keyboard.down('Space');
    await container(page, id, 1).evaluate((el) => (el as HTMLElement).blur());
    await page.keyboard.up('Space');
    expect((await clicks(page))['Old forest']).toBe(3);
  });

  test('CRL-1: a touch that turns into a scroll does not activate the item it started on; a tap does', async ({ browser, browserName }) => {
    test.skip(browserName !== 'chromium', 'touch input is dispatched over CDP');
    const { context, page, touch } = await touchPage(browser);
    await mountFixtures(page, spec, { icons: true });
    await listen(page, 'centered');
    const box = await bounds(item(page, 'centered', 0));
    const y = box.y + box.height / 2;
    await touch('touchStart', 150, y);
    for (let x = 150; x >= 90; x -= 10) {
      await touch('touchMove', x, y);
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(300); // held still: the row settles back where it was
    await touch('touchEnd', 90, y);
    await expect.poll(() => offset(page, 'centered')).toBe(0);
    await page.waitForTimeout(300);
    expect(await clicks(page)).toEqual({});
    await touch('touchStart', 150, y);
    await touch('touchEnd', 150, y);
    await expect.poll(() => clicks(page)).toEqual({ 'Coast path': 1 });
    await context.close();
  });

  test('CRL-2 / CRL-16: each state draws its layer over the content and its content color, opacity and shape from its tokens; the fill stays at rest', async ({ page }) => {
    const id = 'centered';
    await page.mouse.move(1200, 10);
    await expect.poll(() => drawn(page, id, 0)).toEqual(await expected(page));
    await item(page, id, 0).hover();
    await expect.poll(() => drawn(page, id, 0), 'hovered').toEqual(await expected(page, 'hovered'));
    expect((await drawn(page, id, 0)).layer.opacity).toBeGreaterThan(0);
    await page.mouse.down(); // hovered AND pressed: pressed wins
    await expect.poll(() => drawn(page, id, 0), 'pressed').toEqual(await expected(page, 'pressed'));
    await page.mouse.up();
    // Focus gained by the pointer does not select the focused state.
    await page.mouse.move(1200, 10);
    expect(await container(page, id, 0).evaluate((el) => el.matches(':focus-visible'))).toBe(false);
    await expect.poll(() => drawn(page, id, 0), 'after a click').toEqual(await expected(page));
    // Keyboard focus does.
    await away(page);
    await tabTo(page, container(page, id, 0));
    await expect.poll(() => drawn(page, id, 0), 'focused').toEqual(await expected(page, 'focused'));
  });

  test('CRL-2: under acme, where the three states differ, pressed beats focused beats hovered', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, system: 'acme', systemCss: await acmeSystemCss() });
    const id = 'centered';
    const now = () => drawnLayer(page, id, 0);
    const [hovered, focusedLayer, down] = [await expectedLayer(page, 'hovered'), await expectedLayer(page, 'focused'), await expectedLayer(page, 'pressed')];
    expect(new Set([hovered, focusedLayer, down].map((l) => `${l.color} ${l.opacity}`)).size).toBe(3);
    await page.mouse.move(1200, 10);
    await item(page, id, 0).hover();
    await expect.poll(now).toEqual(hovered);
    await tabTo(page, container(page, id, 0)); // hovered AND keyboard-focused: focused wins
    await expect.poll(now).toEqual(focusedLayer);
    await page.keyboard.down('Space'); // hovered AND focused AND pressed: pressed wins
    await expect.poll(now).toEqual(down);
    await page.keyboard.up('Space');
    await expect.poll(now).toEqual(focusedLayer);
  });

  test('CRL-2: the indicator and the playback control paint their container, content color and opacity from their state’s tokens', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, system: 'acme', systemCss: await acmeSystemCss(), fixtures: only('autoplay-paused') });
    const id = 'autoplay-paused';
    for (const [control, locator] of [['indicator', indicator(page, id)], ['playback', playback(page, id)]] as const) {
      await page.mouse.move(1200, 700);
      await expect.poll(() => drawnControl(locator), `${control} at rest`).toEqual(await expectedControl(page, control));
      await locator.hover();
      await expect.poll(() => drawnControl(locator), `${control} hovered`).toEqual(await expectedControl(page, control, 'hovered'));
      await page.mouse.down();
      await expect.poll(() => drawnControl(locator), `${control} pressed`).toEqual(await expectedControl(page, control, 'pressed'));
      await page.mouse.up();
      await page.mouse.move(1200, 700);
      // Pointer focus does not select the focused state; keyboard focus does.
      expect(await locator.evaluate((el) => el.matches(':focus-visible'))).toBe(false);
      await away(page);
      await tabTo(page, locator);
      await expect.poll(() => drawnControl(locator), `${control} focused`).toEqual(await expectedControl(page, control, 'focused'));
    }
    // The dots other than the current one keep dot.color in every state; the current dot's fill is the content color.
    await tabTo(page, indicator(page, id));
    expect(await css(dots(page, id).nth(1), 'background-color')).toBe(await resolveColor(page, T('dot-color')));
    expect(await css(dots(page, id).nth(0).locator('.fill'), 'background-color')).toBe((await expectedControl(page, 'indicator', 'focused')).content);
  });

  test('CRL-3: keyboard focus shows the ring inside an item’s container at once; pointer focus does not', async ({ page }) => {
    const id = 'centered';
    const target = container(page, id, 0);
    await item(page, id, 0).click();
    await expect(target).toHaveCSS('outline-style', 'none');
    expect(await css(target, 'content', '::after')).toBe('none');
    await away(page);
    await tabTo(page, target);
    const outer = await resolveToken(page, '--tanrei-sys-focus-outer-width');
    await expect(target).toHaveCSS('outline-style', 'solid');
    await expect(target).toHaveCSS('outline-color', await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    // Inside: the outline's outer edge is the container's edge, and the inner stroke is inside it.
    await expect(target).toHaveCSS('outline-offset', `${-outer}px`);
    expect(await css(target, 'top', '::after')).toBe(`${outer}px`);
    // Over the content and the state layer; never animated.
    expect(Number(await css(target, 'z-index', '::after'))).toBeGreaterThan(Number(await css(layer(page, id, 0), 'z-index')));
    expect(await css(target, 'transition-property')).not.toContain('outline');
  });

  test('CRL-3: the indicator and the playback control show the ring around their container, at once, only for keyboard focus', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: only('autoplay-paused') });
    const id = 'autoplay-paused';
    const offsetToken = await resolveToken(page, '--tanrei-sys-focus-offset');
    const inner = await resolveToken(page, '--tanrei-sys-focus-inner-width');
    for (const locator of [indicator(page, id), playback(page, id)]) {
      await locator.click();
      await expect(locator).toHaveCSS('outline-style', 'none');
      await away(page);
      await tabTo(page, locator);
      await expect(locator).toHaveCSS('outline-style', 'solid');
      // Around: after the offset, outside the container.
      await expect(locator).toHaveCSS('outline-offset', `${offsetToken + inner}px`);
      expect(await css(locator, 'transition-property')).not.toContain('outline');
    }
  });

  test('CRL-4: the hit area is the container and half the gap on each side; the smallest item is sys.target.touch wide; the row is at least the target tall', async ({ page }) => {
    // A hero at the start, itemWidth 232: 128 is left after it — a medium item of 80 and a small one at small-min-width (40).
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('narrow', { heroAlignment: 'start', itemWidth: 232 })] });
    const id = 'narrow';
    const [gap, pointer, touch, smallMin] = [await resolveToken(page, T('layout-gap')), await resolveToken(page, '--tanrei-sys-target-pointer'), await resolveToken(page, '--tanrei-sys-target-touch'), await resolveToken(page, T('container-small-min-width'))];
    expectNear((await boxes(page, id)).slice(0, 3), [[16, 232], [256, 80], [344, 40]]);
    const hit = (index: number) => container(page, id, index).evaluate((el) => Number.parseFloat(getComputedStyle(el, '::before').width));
    expect(await hit(0)).toBe(232 + gap);
    expect(await hit(2)).toBe(smallMin + gap);
    expect(smallMin + gap, 'the default tokens make the smallest item a touch target').toBe(touch);
    // A press in the gap goes to the nearer item.
    await listen(page, id);
    const [small, medium] = [await bounds(item(page, id, 2)), await bounds(item(page, id, 1))];
    const y = small.y + small.height / 2;
    await page.mouse.click(small.x - gap / 2 + 1, y);
    await page.mouse.click(medium.x + medium.width + gap / 2 - 1, y);
    expect(await clicks(page)).toEqual({ 'Lake shore': 1, 'Old forest': 1 });
    // A system whose widths give less still extends the hit area to the target, without changing the drawn item.
    await override(page, { [T('layout-gap')]: '0px' });
    expect(await hit(2)).toBe(Math.max(smallMin, pointer));
    expect((await bounds(item(page, id, 2))).width).toBe(smallMin);
    // The row's height is never below the target.
    await carousel(page, id).evaluate((el) => (el.style.blockSize = '10px'));
    expect((await bounds(carousel(page, id).locator('.scroller'))).height).toBe(pointer);
    expect(await container(page, id, 0).evaluate((el) => Number.parseFloat(getComputedStyle(el, '::before').height))).toBe(pointer);
  });

  test('CRL-4: an item on its way between the last slot and an edge slot has no hit area beyond its drawn container and half the gap on each side', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: only('centered') });
    const id = 'centered';
    // The items' own hit areas: the next control, which stands over the row's end, out of the way (CRL-41).
    await carousel(page, id).evaluate((el) => el.setAttribute('navigation', 'none'));
    const [gap, pointer] = [await resolveToken(page, T('layout-gap')), await resolveToken(page, '--tanrei-sys-target-pointer')];
    const hit = (index: number) =>
      container(page, id, index).evaluate((el) => {
        const [own, before] = [el.getBoundingClientRect(), getComputedStyle(el, '::before')];
        const width = Number.parseFloat(before.width);
        // The hit area is centred on the container.
        return { from: own.left + own.width / 2 - width / 2, to: own.left + own.width / 2 + width / 2, width, drawn: own.width };
      });
    // At p 0.1 the third item is a tenth of the way in from the edge slot: 7.6 wide, narrower than the pointer target.
    await drawnAt(page, id, 0.1);
    const [second, third] = [await hit(1), await hit(2)];
    expect(third.drawn).toBeGreaterThan(0);
    expect(third.drawn).toBeLessThan(pointer - gap);
    expect(third.width, 'the drawn container and half the gap on each side, no wider').toBeCloseTo(third.drawn + gap, 1);
    expect(third.width).toBeLessThan(pointer);
    // It meets its neighbour's hit area in the middle of the gap and never covers it.
    expect(third.from).toBeCloseTo(second.to, 1);
    // A press in the neighbour's half of the gap is the neighbour's.
    await listen(page, id);
    const y = (await bounds(carousel(page, id))).y + 100;
    await page.mouse.click(second.to - 1, y);
    expect(await clicks(page)).toEqual({ 'Old forest': 1 });
    // At rest it fills no slot and is not drawn: nothing of it can be pressed. The items in slots have the target again.
    await drawnAt(page, id, 0);
    expect((await hit(2)).drawn).toBe(0);
    expect((await hit(1)).width).toBe(76 + gap);
    await page.mouse.click(400 - 4, y);
    await page.mouse.click(4, y);
    expect(await clicks(page)).toEqual({ 'Old forest': 1 });
  });

  test('CRL-4: a coarse pointer extends the hit area and the row to sys.target.touch', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium can emulate a coarse pointer (touch emulation over CDP)');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('narrow', { heroAlignment: 'start', itemWidth: 232 })] });
    const id = 'narrow';
    await override(page, { [T('layout-gap')]: '0px' });
    expect(await container(page, id, 2).evaluate((el) => Number.parseFloat(getComputedStyle(el, '::before').width))).toBe(Math.max(40, touch));
    await carousel(page, id).evaluate((el) => (el.style.blockSize = '10px'));
    expect((await bounds(carousel(page, id).locator('.scroller'))).height).toBe(touch);
  });

  const CLOCK = 1;
  test('CRL-5: a press that ends within a frame — Enter, Space, a click — is shown at once and for at least press-hold, on an item and on the playback control', async ({ page }) => {
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    expect(hold).toBe(100);
    for (const part of ['item', 'playback'] as const) {
      for (const name of ['Enter', 'Space', 'click'] as const) {
        await mountFixtures(page, spec, { icons: true, fixtures: only('centered', 'autoplay-paused') });
        const target = part === 'item' ? container(page, 'centered', 0) : playback(page, 'autoplay-paused');
        await target.focus();
        await page.waitForTimeout(400); // the focus state's own transition ends first
        await target.evaluate((el) => {
          const log: Record<string, number | string> = ((window as any).press = {});
          new MutationObserver(() => {
            if (el.hasAttribute('data-pressed')) {
              log.on ??= performance.now();
              log.seen ??= el.getAttribute('data-pressed')!;
            } else if (log.on !== undefined) log.off ??= performance.now();
          }).observe(el, { attributes: true, attributeFilter: ['data-pressed'] });
          for (const type of ['pointerup', 'keyup']) el.addEventListener(type, () => (log.up ??= performance.now()));
          for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => (log.down ??= performance.now()), true);
        });
        // The press and the hold on the page's clock, held still: the press is over in no page time at all, so it is
        // the short one at the system's own hold, however long the driver takes to send the release.
        const activate = () => (name === 'click' ? clickCentre(page, target) : page.keyboard.press(name));
        await heldPress(page, hold, activate, async () => (await page.evaluate(() => (window as any).press.off)) !== undefined, `${part} ${name}`);
        const log = await page.evaluate(() => (window as any).press);
        expect(log.seen, `${part} ${name}`).toBe('overlay');
        expect(log.up - log.on, `${part} ${name}: the press itself was shorter than press-hold`).toBeLessThan(hold);
        expect(log.off - log.down, `${part} ${name}`).toBeGreaterThanOrEqual(hold - CLOCK);
      }
    }
  });

  test('CRL-5: the indicator’s pressed state comes with a pointer press, lasts as long as the press, and a key does not press it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: only('indicator') });
    const id = 'indicator';
    await indicator(page, id).hover();
    await page.mouse.down();
    await expect(indicator(page, id)).toHaveAttribute('data-pressed', 'overlay');
    await page.waitForTimeout(600);
    await expect(indicator(page, id), 'held for as long as the press').toHaveAttribute('data-pressed', 'overlay');
    await page.mouse.up();
    await expect(indicator(page, id)).not.toHaveAttribute('data-pressed');
    await tabTo(page, indicator(page, id));
    await page.keyboard.down('Enter');
    await page.keyboard.down('Space');
    expect(await indicator(page, id).getAttribute('data-pressed')).toBeNull();
    await page.keyboard.up('Space');
    await page.keyboard.up('Enter');
  });

  test('CRL-6 overlay (the default system): the pressed tokens and the pressed layer at once, no ripple', async ({ page }) => {
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('overlay');
    const id = 'centered';
    await item(page, id, 0).hover();
    await page.mouse.down();
    expect(await pressed(page, id, 0)).toBe('overlay');
    expect(await drawnLayer(page, id, 0)).toEqual(await expectedLayer(page, 'pressed'));
    expect(await ripples(page, id, 0).count()).toBe(0);
    await page.mouse.move(1200, 10);
    await page.mouse.up();
  });

  test('CRL-6 ripple (m3-like): the pressed layer grows from the point of contact over the content; the layer under it stays hovered', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like' });
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('ripple');
    const id = 'centered';
    const box = await bounds(container(page, id, 0));
    await override(page, { [T('item-pressed-content-color')]: 'rgb(0, 0, 255)' });
    await page.mouse.move(box.x + 30, box.y + 12);
    const hovered = await expectedLayer(page, 'hovered');
    await expect.poll(() => drawnLayer(page, id, 0)).toEqual(hovered);
    // Pressed once the hovered color has ended its motion: the poll passes on its last frames, where the color reads
    // as its end value and, a frame later, one channel a step of 1e-6 off it (Firefox).
    await motionEnded(item(page, id, 0));
    await page.mouse.down();
    expect(await pressed(page, id, 0)).toBe('ripple');
    await expect(ripples(page, id, 0)).toHaveCount(1);
    const ripple = await ripples(page, id, 0).evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        x: Number.parseFloat(el.style.getPropertyValue('--_x')),
        y: Number.parseFloat(el.style.getPropertyValue('--_y')),
        color: s.backgroundColor,
        opacity: Number(s.opacity),
        grow: Number.parseFloat(s.animationDuration) * 1000,
        fade: Number.parseFloat(s.transitionDuration) * 1000,
        z: Number(s.zIndex),
        hidden: el.getAttribute('aria-hidden'),
      };
    });
    const down = await expectedLayer(page, 'pressed');
    expect(ripple).toMatchObject({ color: down.color, opacity: down.opacity, hidden: 'true' });
    expect(ripple.x).toBeCloseTo(30, 0);
    expect(ripple.y).toBeCloseTo(12, 0);
    expect(ripple.grow).toBe(await resolveToken(page, T('motion-feedback-duration'), 'duration'));
    expect(ripple.fade).toBe(await resolveToken(page, T('motion-state-duration'), 'duration'));
    // Over the content (CRL-16): above the clip that holds it.
    expect(ripple.z).toBeGreaterThan(0);
    expect(await drawnLayer(page, id, 0)).toEqual(hovered);
    expect(await css(container(page, id, 0), 'color')).toBe('rgb(0, 0, 255)');
    await page.mouse.move(1200, 10);
    await page.mouse.up();
    await expect(ripples(page, id, 0)).toHaveCount(0);
  });

  test('CRL-6 ripple: keyboard activation answers from the center; reduced motion makes it appear whole', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like' });
    const id = 'centered';
    await container(page, id, 0).focus();
    await page.keyboard.down('Enter');
    const center = await ripples(page, id, 0).evaluate((el) => {
      const own = el.getBoundingClientRect();
      return [Number.parseFloat(el.style.getPropertyValue('--_x')) / own.width, Number.parseFloat(el.style.getPropertyValue('--_y')) / own.height];
    });
    expect(center[0]).toBeCloseTo(0.5, 5);
    expect(center[1]).toBeCloseTo(0.5, 5);
    await page.keyboard.up('Enter');
    await expect(ripples(page, id, 0)).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.keyboard.down('Enter');
    expect(await ripples(page, id, 0).evaluate((el) => [getComputedStyle(el).animationName, getComputedStyle(el).transitionDuration])).toEqual(['none', '0s']);
    await page.keyboard.up('Enter');
    await expect(ripples(page, id, 0)).toHaveCount(0);
  });

  test('CRL-6 ripple (m3-like): the indicator and the playback control grow their pressed layer from the point of contact', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, system: 'm3-like', fixtures: only('autoplay-paused') });
    const id = 'autoplay-paused';
    for (const [control, locator] of [['indicator', indicator(page, id)], ['playback', playback(page, id)]] as const) {
      const box = await bounds(locator);
      await page.mouse.move(box.x + 6, box.y + 6);
      // Hovered, and its color arrived (CRL-22 animates it): the press is then seen to leave it as it is.
      await expect.poll(() => css(locator, 'background-color'), control).toBe(await resolveColor(page, T(`${control}-hovered-container-color`)));
      // Pressed once the hovered color has ended its motion: the poll passes on its last frames, where the color reads
      // as its end value and, a frame later, one channel a step of 1e-6 off it (Firefox).
      await motionEnded(locator);
      await page.mouse.down();
      await expect(locator).toHaveAttribute('data-pressed', 'ripple');
      const ripple = locator.locator('.ripple');
      await expect(ripple).toHaveCount(1);
      expect(await css(ripple, 'background-color'), control).toBe(await resolveColor(page, T(`${control}-pressed-container-color`)));
      // The container stays with the state under the press.
      expect(await css(locator, 'background-color'), control).toBe(await resolveColor(page, T(`${control}-hovered-container-color`)));
      await page.mouse.up();
      await page.mouse.move(1200, 700);
      await expect(ripple).toHaveCount(0);
    }
  });

  test('CRL-6 dim (cupertino): the pressed opacity on the whole item, no ripple; the layer stays with the state under the press', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, system: 'cupertino' });
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('dim');
    const id = 'centered';
    await override(page, { [T('item-pressed-content-color')]: 'rgb(0, 0, 255)' });
    await item(page, id, 0).hover();
    const hovered = await expectedLayer(page, 'hovered');
    await expect.poll(() => drawnLayer(page, id, 0)).toEqual(hovered);
    // Pressed once the hovered color has ended its motion: the poll passes on its last frames, where the color reads
    // as its end value and, a frame later, one channel a step of 1e-6 off it (Firefox).
    await motionEnded(item(page, id, 0));
    await page.mouse.down();
    expect(await pressed(page, id, 0)).toBe('dim');
    expect(await css(container(page, id, 0), 'opacity')).toBe(await token(page, T('pressed-opacity')));
    expect(Number(await css(container(page, id, 0), 'opacity'))).toBeLessThan(1);
    expect(await drawnLayer(page, id, 0)).toEqual(hovered);
    expect(await css(container(page, id, 0), 'color')).toBe('rgb(0, 0, 255)');
    expect(await ripples(page, id, 0).count()).toBe(0);
    await page.mouse.move(1200, 10);
    await page.mouse.up();
  });

  test('CRL-6 none: no answer to the press; an unknown name is answered as the first value', async ({ page }) => {
    const id = 'centered';
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'none' });
    await item(page, id, 0).hover();
    await expect.poll(() => drawn(page, id, 0)).toEqual(await expected(page, 'hovered'));
    // Pressed once the hovered color has ended its motion: the poll passes on its last frames, where the color reads
    // as its end value and, a frame later, one channel a step of 1e-6 off it (Firefox).
    await motionEnded(item(page, id, 0));
    const before = await drawn(page, id, 0);
    await page.mouse.down();
    expect(await pressed(page, id, 0)).toBe('none');
    expect(await drawn(page, id, 0)).toEqual(before);
    expect(await ripples(page, id, 0).count()).toBe(0);
    await page.mouse.up();
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'sparkle' });
    await page.mouse.down();
    expect(await pressed(page, id, 0)).toBe('overlay');
    await page.mouse.up();
  });

  test('CRL-7 corner smoothing: a quarter circle at the token radius by default; cupertino eases the items and the controls', async ({ page }) => {
    const id = 'centered';
    const radius = (locator: Locator) => css(locator, 'border-top-left-radius').then(Number.parseFloat);
    const clip = item(page, id, 0).locator('.clip');
    expect(await token(page, '--tanrei-sys-shape-corner-smoothing')).toBe('0');
    expect(await radius(container(page, id, 0))).toBe(await resolveToken(page, T('container-shape')));
    await mountFixtures(page, spec, { icons: true, system: 'cupertino' });
    const shape = await resolveToken(page, T('container-shape'));
    const supported = await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'));
    test.info().annotations.push({ type: 'corner-shape', description: supported ? 'eased with corner-shape' : 'not supported by this browser: circular fallback' });
    if (supported) {
      expect(Number.parseFloat((await css(container(page, id, 0), 'corner-top-left-shape')).replace(/^superellipse\(|\)$/g, ''))).toBeCloseTo(Math.log2(2.6), 3);
      expect(await radius(container(page, id, 0))).toBeCloseTo(shape * 1.24, 2);
      for (const part of [clip, layer(page, id, 0)]) {
        expect(await radius(part)).toBeCloseTo(shape * 1.24, 2);
        expect(await css(part, 'corner-top-left-shape')).toBe(await css(container(page, id, 0), 'corner-top-left-shape'));
      }
    } else {
      expect(await radius(container(page, id, 0))).toBe(shape);
      expect(await radius(clip)).toBe(shape);
    }
    // The controls carry the shared corner rule on controls.shape (a pill: drawn round whatever the smoothing).
    for (const control of [indicator(page, 'autoplay-paused'), playback(page, 'autoplay-paused')]) {
      await expect(control).toHaveAttribute('data-tanrei-shape', '');
      expect(await css(control, '--tanrei-corner-pill')).toBe('1');
    }
  });

  test('CRL-7 focus-style: acme shows keyboard focus as a glow in the same two focus colors; the default is a ring', async ({ page }) => {
    const id = 'centered';
    await tabTo(page, container(page, id, 0));
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('ring');
    expect(await css(container(page, id, 0), 'outline-color')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    expect(await css(container(page, id, 0), 'box-shadow', '::after')).toBe('none');
    expect(await container(page, id, 0).getAttribute('data-focus-style')).toBe('ring');

    await mountFixtures(page, spec, { icons: true, system: 'acme', systemCss: await acmeSystemCss() });
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('glow');
    await item(page, id, 0).click(); // pointer focus: no indicator at all (CRL-3)
    expect(await css(container(page, id, 0), 'content', '::after')).toBe('none');
    await away(page);
    await tabTo(page, container(page, id, 0));
    expect(await css(container(page, id, 0), 'outline-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(container(page, id, 0), 'box-shadow', '::after')).toContain(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    expect(await container(page, id, 0).getAttribute('data-focus-style')).toBe('glow');
    // The indicator's glow likewise.
    await tabTo(page, indicator(page, 'indicator'));
    expect(await css(indicator(page, 'indicator'), 'box-shadow', '::after')).toContain(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
  });

  test('CRL-8: as wide as its parent, the row layout.height tall; every item as tall; one row in order, g apart inside the padding; clipped at the edges', async ({ page }) => {
    const id = 'loop';
    const [height, padding, gap] = [await resolveToken(page, T('layout-height')), await resolveToken(page, T('layout-padding-inline')), await resolveToken(page, T('layout-gap'))];
    const host = await bounds(carousel(page, id));
    expect([host.width, host.height]).toEqual([400, height]);
    for (let i = 0; i < 5; i++) expect((await bounds(item(page, id, i))).height).toBe(height);
    // The last item, the first and the second, in order: from the padding at the start to the padding at the end, g apart.
    const b = await boxes(page, id);
    expect(b[4][0]).toBe(padding);
    expect(round(b[0][0] - (b[4][0] + b[4][1]))).toBe(gap);
    expect(round(b[1][0] - (b[0][0] + b[0][1]))).toBe(gap);
    expect(b[1][0] + b[1][1]).toBe(400 - padding);
    // Items scroll under the padding to the carousel's edges, and are clipped there.
    const under = await boxesAt(page, 'fixed-width', 104);
    expect(under[0][0]).toBeLessThan(0);
    expect(under[1][0] + under[1][1]).toBeGreaterThan(400);
    expect(await carousel(page, id).locator('.stage').evaluate((el) => getComputedStyle(el).overflowX)).toBe('clip');
    // The product sizes it through CSS: the items follow the height, less the controls row where there is one.
    await carousel(page, id).evaluate((el) => (el.style.blockSize = '120px'));
    await expect.poll(async () => (await bounds(item(page, id, 0))).height).toBe(120);
    const controls = await resolveToken(page, T('controls-height'));
    await carousel(page, 'indicator').evaluate((el) => (el.style.blockSize = '300px'));
    await expect.poll(async () => (await bounds(item(page, 'indicator', 0))).height).toBe(300 - controls);
  });

  // A box as wide as its content gives the carousel no width: its own must not come from where it places its items
  // (the track is as long as the scroll range, and the range follows the width).
  for (const box of ['inline-block', 'table-cell', 'flex-item'] as const) {
    test(`CRL-8: in a box as wide as its content (${box}) the carousel is one hero and the padding wide, whatever its items, and stays so`, async ({ page }) => {
      await page.evaluate(() => {
        (window as any).loops = 0;
        window.addEventListener('error', (e) => {
          if (/ResizeObserver/.test(e.message)) (window as any).loops += 1;
        });
      });
      const [large, padding] = [await resolveToken(page, T('container-large-width')), await resolveToken(page, T('layout-padding-inline'))];
      await page.evaluate((kind) => {
        for (const host of document.querySelectorAll<HTMLElement>('.stage > tanrei-carousel')) {
          const stage = host.parentElement!;
          stage.style.inlineSize = 'auto';
          if (kind === 'inline-block') stage.style.display = 'inline-block';
          else if (kind === 'table-cell') {
            const table = document.createElement('table');
            const cell = table.insertRow().insertCell();
            cell.style.padding = '0';
            stage.append(table);
            cell.append(host);
          } else {
            // A flex item with min-width: auto, in a row that does not stretch it along the line.
            stage.style.display = 'flex';
            stage.style.inlineSize = 'max-content';
          }
        }
      }, box);
      const widths = () =>
        page.evaluate(async () => {
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          return [...document.querySelectorAll('.stage tanrei-carousel')].map((el) => [el.closest('.stage')!.getAttribute('data-fixture'), el.getBoundingClientRect().width, el.shadowRoot!.querySelector('.scroller')!.getBoundingClientRect().width]);
        });
      // Within two frames of standing there…
      const first = await widths();
      for (const [id, host, row] of first) {
        // …the row is one hero (itemWidth, or the large width) and the padding wide, and the carousel as wide (the
        // controls row is no wider here).
        const hero = (spec.fixtures.find((f) => f.id === id)?.props.itemWidth as number | undefined) ?? large;
        expect([id, row], String(id)).toEqual([id, hero + 2 * padding]);
        expect([id, host], String(id)).toEqual([id, hero + 2 * padding]);
      }
      // …and it stays: nothing grows in the frames after, and no observer ran out of passes.
      await page.evaluate(async () => {
        for (let i = 0; i < 30; i++) await new Promise((r) => requestAnimationFrame(r));
      });
      expect(await widths()).toEqual(first);
      expect(await page.evaluate(() => (window as any).loops)).toBe(0);
      // itemWidth is the hero's width there too.
      await carousel(page, 'fixed-width').evaluate((el: any) => (el.itemWidth = 120));
      await expect.poll(async () => (await bounds(carousel(page, 'fixed-width'))).width).toBe(120 + 2 * padding);
      // A box with a width of its own is filled as before (CRL-8).
      await page.evaluate(() => {
        const host = document.querySelector<HTMLElement>('[data-fixture="fixed-width"] tanrei-carousel')!;
        host.parentElement!.style.cssText += ';display:block;inline-size:400px';
      });
      await expect.poll(async () => (await bounds(carousel(page, 'fixed-width'))).width).toBe(400);
    });
  }

  test('CRL-9, CRL-10, CRL-11: the fixtures draw the worked examples — centred, two slots a side, a hero at the start, wider rows and the row too narrow for side slots', async ({ page }) => {
    // Centred (the defaults): the slot before the hero empty, the hero at 84 (100 from the edge), a small item of 76 after it.
    expectNear((await boxes(page, 'centered')).slice(0, 2), [[100, 200], [308, 76]]);
    expect((await boxes(page, 'centered')).slice(2).map(([, w]) => w), 'the others are not drawn').toEqual([0, 0, 0]);
    // With loop the last item fills the slot before the hero.
    const loop = await boxes(page, 'loop');
    expectNear([loop[4], loop[0], loop[1]], [[16, 76], [100, 200], [308, 76]]);
    // itemWidth 120: 40 · 68 · 120 · 68 · 40.
    const toward = await boxes(page, 'content-toward-hero');
    expectNear([toward[4], toward[5], toward[0], toward[1], toward[2]], [[16, 40], [64, 68], [140, 120], [268, 68], [344, 40]]);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [fixture('start', { heroAlignment: 'start' }), fixture('wide', { itemWidth: 320 }), fixture('w768', { heroAlignment: 'start' }), fixture('w768c', {}), fixture('narrow', { heroAlignment: 'start' }, 3), fixture('narrow-c', {}, 3)],
    });
    // A hero at the start: 200 · 101.33 · 50.67, each start on a device pixel (CRL-40).
    expectNear((await boxes(page, 'start')).slice(0, 3), [[16, 200], [224, 101.33], [333.33, 50.67]], 'start', DEVICE);
    // L above the cap: the hero is the cap, 240, with a small slot of 56 on each side.
    expectNear((await boxes(page, 'wide')).slice(0, 2), [[80, 240], [328, 56]]);
    await page.addStyleTag({
      content: '[data-fixture^="w768"] { inline-size: 800px !important; } [data-fixture="narrow"] { inline-size: 150px !important; } [data-fixture="narrow-c"] { inline-size: 210px !important; }',
    });
    await expect.poll(async () => (await boxes(page, 'w768'))[0][1]).toBe(348);
    expectNear((await boxes(page, 'w768')).slice(0, 3).map(([, w]) => [w]), [[348], [348], [56]]);
    await expect.poll(async () => (await boxes(page, 'w768c'))[0][1]).toBe(208);
    expectNear((await boxes(page, 'w768c')).slice(0, 3), [[16 + 280, 208], [16 + 280 + 216, 208], [16 + 280 + 432, 56]]);
    // Below the cap (W 118 at the start, W 178 at the centre): laid out as fixed widths, H being W — every item W wide,
    // the next one g beyond it, none undrawn.
    await expect.poll(async () => (await boxes(page, 'narrow'))[0]).toEqual([16, 118]);
    expect((await boxes(page, 'narrow')).slice(1)).toEqual([[16 + 126, 118], [16 + 252, 118]]);
    await expect.poll(async () => (await boxes(page, 'narrow-c'))[0]).toEqual([16, 178]);
    expect((await boxes(page, 'narrow-c')).slice(1)).toEqual([[16 + 186, 178], [16 + 372, 178]]);
  });

  test('CRL-12: items are placed by the scroll position — the verify note at p 0.5, an item growing from nothing at the edge slot, and the last item the hero at the end of the range', async ({ page }) => {
    const id = 'centered';
    // p runs from 0 to N − 1.
    expect(await scroller(page, id).evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(4 * 208);
    // Measured from the carousel's edge: the verify note's inner coordinates plus the padding.
    const at = await boxesAt(page, id, 104);
    expectNear(at.slice(0, 3), [[58, 138], [204, 138], [350, 38]]);
    expect(at.slice(3).map(([, w]) => w), 'at or beyond the edge slot: not drawn').toEqual([0, 0]);
    // Just in from the edge slot the third item is a sliver, g from the second: it grows from nothing.
    const sliver = await boxesAt(page, id, 208 * 0.05);
    expect(sliver[2][1]).toBeGreaterThan(0);
    expect(sliver[2][1]).toBeLessThan(5);
    expect(round(sliver[2][0] - (sliver[1][0] + sliver[1][1]))).toBe(8);
    // At a whole p nothing is drawn beyond the last slots.
    const whole = await boxesAt(page, id, 208);
    expectNear(whole.slice(0, 3), [[16, 76], [100, 200], [308, 76]]);
    expect(whole.slice(3).map(([, w]) => w)).toEqual([0, 0]);
    // At the end of the range the last item is the hero and the slots after it are empty.
    const end = await boxesAt(page, id, 832);
    expect([end[3], end[4]]).toEqual([[16, 76], [100, 200]]);
    expect(end.slice(0, 3).map(([, w]) => w)).toEqual([0, 0, 0]);
    // A hero at the start, 6 items: the verify note at p 0.5 — the hero narrows against the inner start edge.
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('start', { heroAlignment: 'start' }), fixture('wide', { itemWidth: 320 }, 4)] });
    expect(await scroller(page, 'start').evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(5 * 208);
    const start = await boxesAt(page, 'start', 104);
    expectNear(start.slice(0, 4), [[12, 100], [120, 150.67], [278.67, 76], [362.67, 25.33]], 'start', DEVICE);
    expect(start.slice(4).map(([, w]) => w)).toEqual([0, 0]);
    // A wider hero moves by its slot plus the gap.
    expect(await scroller(page, 'wide').evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(3 * 248);
  });

  test('CRL-13: fixed widths lay every item out H wide, H + g apart from the hero slot, cut by the edges; a hero at the start ends its range at the inner end edge, and does not scroll when the items fit', async ({ page }) => {
    const id = 'fixed-width';
    // The hero in the centre, the next item cut by the carousel's edge.
    expectNear((await boxes(page, id)).slice(0, 2), [[100, 200], [308, 200]]);
    expect(await scroller(page, id).evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(4 * 208);
    // At p 0.5: item 0 from −20 to 180, item 1 from 188 to 388 (inner coordinates).
    expectNear((await boxesAt(page, id, 104)).slice(0, 2), [[-4, 200], [204, 200]]);
    await boxesAt(page, id, 0);
    await page.mouse.move(200, (await bounds(carousel(page, id))).y + 100);
    await page.mouse.wheel(60, 0);
    await expect.poll(() => offset(page, id)).toBe(60);
    await page.waitForTimeout(600);
    expect(await offset(page, id), 'free-scroll: no settling').toBe(60);
    // A hero at the start: the range ends where the last item ends at the inner end edge — unless the others are scaled.
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [fixture('shelf', { heroAlignment: 'start', fluidWidth: false, snap: false }, 5), fixture('one', { heroAlignment: 'start', fluidWidth: false }, 1), fixture('shelf-scaled', { heroAlignment: 'start', fluidWidth: false, scaleOthers: true }, 5)],
    });
    expectNear((await boxes(page, 'shelf')).slice(0, 2), [[16, 200], [224, 200]]);
    expect(await scroller(page, 'shelf').evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(5 * 200 + 4 * 8 - 368);
    const end = await boxesAt(page, 'shelf', 664);
    expect(round(end[4][0] + end[4][1])).toBe(400 - 16);
    expect(await scroller(page, 'one').evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(0);
    expect(await scroller(page, 'shelf-scaled').evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(4 * 208);
  });

  test('CRL-14: a wheel scroll follows and then settles at the nearest resting position over the scroll motion; Shift turns a vertical wheel sideways', async ({ page }) => {
    // Alone on the page: another carousel's motion (an autoplay advance) is timed the same way and would be caught too.
    await mountFixtures(page, spec, { icons: true, fixtures: only('centered') });
    const id = 'centered';
    expect(await css(scroller(page, id), 'animation-duration')).toBe(`${(await resolveToken(page, T('motion-scroll-duration'), 'duration')) / 1000}s`);
    const box = await bounds(carousel(page, id));
    await page.mouse.move(200, box.y + 100);
    // The settle is held at its start and stepped through its duration by the test (`holdMotions`).
    await holdMotions(page);
    await page.mouse.wheel(60, 0);
    await expect.poll(() => offset(page, id)).toBeGreaterThanOrEqual(50);
    // The wheel's own scroll is over (an engine may take it in steps, and a settle it overtakes gives way to it): the row
    // stands where the wheel left it, the settle held at its start.
    await atRest(page, id);
    const from = await offset(page, id);
    expect(from).toBeGreaterThanOrEqual(50);
    const settle = await stepMotion(page, id);
    // Over the scroll motion's duration…
    expect(settle.duration).toBe(await resolveToken(page, T('motion-scroll-duration'), 'duration'));
    // …it moves back through several moments of it, never away from where it is going, and comes to rest there.
    expectOver(settle.passed, from, 0);
    await expect.poll(() => offset(page, id)).toBe(0);
    // Each turn of the wheel finds the row at rest, and where a turn left it is read at rest. An engine may take a turn
    // over many frames (WebKit on Linux: ten or so, over 230 ms), so an offset read on the way is not where the row
    // settles — a turn of 300 from 208 passes 416 on its way to 508, before it settles back there.
    const restsAt = async () => {
      await atRest(page, id);
      return offset(page, id);
    };
    await atRest(page, id);
    await page.mouse.wheel(150, 0);
    await expect.poll(restsAt).toBe(208);
    await page.keyboard.down('Shift');
    await page.mouse.wheel(0, 300);
    await page.keyboard.up('Shift');
    await expect.poll(restsAt).toBe(416);
    // A vertical wheel without Shift is the page's.
    await page.mouse.wheel(0, 40);
    await page.waitForTimeout(400);
    expect(await offset(page, id)).toBe(416);
  });

  test('CRL-14: fixed widths that snap settle at a resting position, the end of the range included', async ({ page }) => {
    // A hero at the start, fixed widths, 5 items: the range ends at 664 (3.19 positions), a resting position of its own.
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('fixed-snap', { heroAlignment: 'start', fluidWidth: false }, 5)] });
    const id = 'fixed-snap';
    // A scroll that ends at 650 (written, not wheeled: Firefox turns a wheel no further than a page): nearer 664, the
    // end of the range, than 624 (3 positions).
    await scroller(page, id).evaluate((el) => (el.scrollLeft = 650));
    await expect.poll(() => offset(page, id)).toBe(664);
    // …and 630 is nearer 624.
    await atRest(page, id);
    await scroller(page, id).evaluate((el) => (el.scrollLeft = 630));
    await expect.poll(() => offset(page, id)).toBe(624);
  });

  test('CRL-14: where motion is reduced the settle is at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const id = 'centered';
    await page.mouse.move(200, (await bounds(carousel(page, id))).y + 100);
    await trace(page, id);
    await page.mouse.wheel(60, 0);
    await expect.poll(async () => (await traced(page)).length).toBeGreaterThan(0);
    await expect.poll(() => offset(page, id)).toBe(0);
    await page.waitForTimeout(200);
    // From where the wheel took it, straight to the whole position: no offset in between.
    const passed = await traced(page);
    expect(settled(passed).filter((o) => o > 0), `${passed}`).toEqual([]);
  });

  test('CRL-12, CRL-14: a scroll that comes before a settle’s first frame wins — the items follow it, and it settles in its turn', async ({ page }) => {
    for (const reducedMotion of ['no-preference', 'reduce'] as const) {
      await page.emulateMedia({ reducedMotion });
      const id = 'centered';
      await scroller(page, id).evaluate((el) => (el.scrollLeft = 0));
      await expect.poll(() => offset(page, id), reducedMotion).toBe(0);
      const seen = await carousel(page, id).evaluate(async (host) => {
        const el = host.shadowRoot!.querySelector('.scroller')!;
        const frame = () => new Promise((r) => requestAnimationFrame(r));
        el.scrollLeft = 104;
        await frame();
        el.dispatchEvent(new Event('scrollend'));
        el.scrollLeft = 832;
        await frame();
        await frame();
        const own = host.getBoundingClientRect();
        const last = host.querySelector('tanrei-carousel-item:last-of-type')!.getBoundingClientRect();
        return { offset: el.scrollLeft, last: [Math.round((last.left - own.left) * 100) / 100, Math.round(last.width * 100) / 100] };
      });
      expect(seen, reducedMotion).toEqual({ offset: 832, last: [100, 200] });
      await page.waitForTimeout(500);
      expect(await offset(page, id), reducedMotion).toBe(832);
    }
  });

  test('CRL-14: a slow drag settles at the nearest position; a fling goes on to the next one', async ({ browser, browserName }) => {
    test.skip(browserName !== 'chromium', 'touch input is dispatched over CDP');
    const { context, page, touch } = await touchPage(browser);
    await mountFixtures(page, spec, { icons: true });
    const y = (await bounds(carousel(page, 'centered'))).y + 100;
    const drag = async (from: number, to: number, stepX: number, wait: number, hold: number) => {
      let at = Date.now();
      await touch('touchStart', from, y, at);
      for (let x = from; from > to ? x >= to : x <= to; x += from > to ? -stepX : stepX) {
        await page.waitForTimeout(wait);
        await touch('touchMove', x, y, (at += wait));
      }
      await page.waitForTimeout(hold || wait);
      await touch('touchEnd', to, y, (at += hold || wait));
    };
    await drag(150, 90, 10, 16, 300); // 60 toward the end, then held still: not a fling
    await expect.poll(() => offset(page, 'centered')).toBe(0);
    await page.waitForTimeout(300);
    await drag(150, 90, 20, 4, 0); // the same 60, fast
    await expect.poll(() => offset(page, 'centered')).toBe(208);
    await page.waitForTimeout(300);
    expect(await offset(page, 'centered')).toBe(208);
    await drag(90, 150, 20, 4, 0); // back, fast
    await expect.poll(() => offset(page, 'centered')).toBe(0);
    await context.close();
  });

  test('CRL-14: a fast drag that holds still for more than 40 ms before the finger lifts is no fling — the row settles at the nearest position — and the same drag lifted within 40 ms of its last move goes on to the next one', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: only('centered') });
    // The finger's events are made in the page on a held clock, so the time between the last move and the lift is
    // exact; the row is scrolled by the test as the finger would scroll it, so the carousel's choice is read in every
    // engine. The next test makes the same strokes with real touches in Chromium, whose own momentum the row must not
    // follow.
    const touch = (type: 'touchstart' | 'touchmove' | 'touchend', x: number) =>
      scroller(page, 'centered').evaluate(
        (el, [type, x]) => {
          const at = [{ clientX: x as number, clientY: 0 }];
          el.dispatchEvent(Object.assign(new Event(type as string), { touches: type === 'touchend' ? [] : at, changedTouches: at }));
        },
        [type, x] as const,
      );
    const stroke = async (hold: number) => {
      await holdPageClock(page);
      await touch('touchstart', 150);
      // 60 px toward the end, nearer this position (0) than the next (208): only a fling goes on.
      await scroller(page, 'centered').evaluate(
        (el) =>
          new Promise<void>((resolve) => {
            el.addEventListener('scroll', () => resolve(), { once: true });
            el.scrollLeft = 60;
          }),
      );
      for (const x of [130, 110, 90]) {
        await page.clock.runFor(4);
        await touch('touchmove', x);
      }
      await page.clock.runFor(hold);
      await touch('touchend', 90);
      await releaseClock(page);
    };
    await stroke(STOPPED_AFTER + 1);
    await expect.poll(() => offset(page, 'centered')).toBe(0);
    await stroke(STOPPED_AFTER);
    await expect.poll(() => offset(page, 'centered')).toBe(208);
  });

  test('CRL-14: a fast touch stroke held still for more than 40 ms before the lift settles at the position nearest the lift, not where the browser’s own momentum would carry it; lifted within 40 ms it goes on to the next one', async ({ browser, browserName }) => {
    test.skip(browserName !== 'chromium', 'touch input is dispatched over CDP');
    // Real touches, so that the browser's own momentum is there to carry the row on: Chromium flings this stroke
    // whatever the carousel decides, and only a row the carousel holds from the lift settles where the finger let go.
    // The page clock is held while the finger is down, so the carousel sees exactly `hold` ms between the last move
    // and the lift: an event's timeStamp is the held page time at which the page handles it. Chromium hands a touch
    // move to the page with its next frame, not when it is sent, so each touch is waited for before the clock moves on.
    // The touches' own stamps give the browser the same timing, set in the past so that none is later than now.
    const { context, page, touch } = await touchPage(browser);
    await mountFixtures(page, spec, { icons: true, fixtures: only('centered') });
    const y = (await bounds(carousel(page, 'centered'))).y + 100;
    await scroller(page, 'centered').evaluate((el) => {
      const seen = window as unknown as { touches: number };
      seen.touches = 0;
      for (const type of ['touchstart', 'touchmove', 'touchend']) el.addEventListener(type, () => (seen.touches += 1), { passive: true });
    });
    let sent = 0;
    const handled = async () => {
      sent += 1;
      await expect.poll(() => page.evaluate(() => (window as unknown as { touches: number }).touches)).toBe(sent);
    };
    const stroke = async (from: number, moves: number[], hold: number) => {
      let at = Date.now() - 1000;
      await holdPageClock(page);
      await touch('touchStart', from, y, at);
      await handled();
      for (const x of moves) {
        await page.clock.runFor(4);
        await touch('touchMove', x, y, (at += 4));
        await handled();
      }
      await page.clock.runFor(hold);
      await touch('touchEnd', moves[moves.length - 1], y, (at += hold));
      await handled();
      await releaseClock(page);
      await atRest(page, 'centered');
    };
    // 60 px toward the end, three moves 4 ms apart (5 px per ms), nearer this position (0) than the next (208).
    await stroke(150, [130, 110, 90], STOPPED_AFTER + 1);
    expect(await offset(page, 'centered'), 'held still before the lift: the nearest position, not the momentum’s end').toBe(0);
    await stroke(150, [130, 110, 90], STOPPED_AFTER);
    expect(await offset(page, 'centered'), 'lifted while moving: a fling, one position on').toBe(208);
    await stroke(90, [110, 130, 150], STOPPED_AFTER + 1);
    expect(await offset(page, 'centered'), 'back, held still before the lift: the nearest position').toBe(208);
    await context.close();
  });

  test('CRL-14, CRL-40: inside an ancestor with a CSS zoom of 2 a slow drag still settles at the nearest position and a fling goes on to the next one — the same resting positions, in the row’s own pixels, as without the zoom', async ({ browser, browserName }) => {
    test.skip(browserName !== 'chromium', 'touch input is dispatched over CDP');
    const { context, page, touch } = await touchPage(browser);
    await mountFixtures(page, spec, { icons: true, fixtures: only('centered'), lead: '<style>.stage { zoom: 2; }</style>' });
    const box = await bounds(carousel(page, 'centered'));
    const y = box.y + 100;
    const drag = async (from: number, to: number, stepX: number, wait: number, hold: number) => {
      let at = Date.now();
      await touch('touchStart', box.x + from, y, at);
      for (let x = from; from > to ? x >= to : x <= to; x += from > to ? -stepX : stepX) {
        await page.waitForTimeout(wait);
        await touch('touchMove', box.x + x, y, (at += wait));
      }
      await page.waitForTimeout(hold || wait);
      await touch('touchEnd', box.x + to, y, (at += hold || wait));
    };
    await drag(150, 90, 10, 16, 300); // 60 of the window's pixels toward the end, then held still: not a fling
    await expect.poll(() => offset(page, 'centered')).toBe(0);
    await page.waitForTimeout(300);
    await drag(150, 90, 20, 4, 0); // the same 60, fast: one position on, 208 of the row's own pixels as without the zoom
    await expect.poll(() => offset(page, 'centered')).toBe(208);
    await page.waitForTimeout(300);
    expect(await offset(page, 'centered')).toBe(208);
    await drag(90, 150, 20, 4, 0); // back, fast
    await expect.poll(() => offset(page, 'centered')).toBe(0);
    await context.close();
  });

  test('CRL-15: the content is laid out H wide and the row tall, centred; toward-hero shows the side nearest the hero', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...only('centered', 'content-toward-hero', 'fixed-width'), fixture('wide', { itemWidth: 320 })] });
    for (const [id, hero] of [['centered', 200], ['wide', 240]] as const) {
      for (const index of [0, 1]) {
        const [own, content] = [await bounds(item(page, id, index)), await bounds(item(page, id, index).locator('.content'))];
        expect(content.width, `${id} ${index}`).toBeCloseTo(hero, 1);
        expect(content.height).toBe(own.height);
        const at = await edges(item(page, id, index));
        expect(at.content, `${id} ${index}: centred`).toBeCloseTo(at.item, 1);
      }
    }
    const clip = item(page, 'centered', 1).locator('.clip');
    expect(await css(clip, 'overflow')).toBe('clip');
    expect(Number.parseFloat(await css(clip, 'border-top-left-radius'))).toBe(await resolveToken(page, T('container-shape')));
    // Toward the hero (6 items, itemWidth 120, loop: 40 · 68 · 120 · 68 · 40). The items after the hero align their
    // content's start with their own start…
    const id = 'content-toward-hero';
    expect((await bounds(item(page, id, 1).locator('.content'))).width).toBeCloseTo(120, 1);
    for (const index of [1, 2]) {
      const after = await edges(item(page, id, index));
      expect(after.left[1], `after the hero: item ${index}`).toBeCloseTo(after.left[0], 1);
      expect(after.right[1]).toBeGreaterThan(after.right[0] + 1);
    }
    // …and the items before it their content's end with their own end.
    for (const index of [5, 4]) {
      const before = await edges(item(page, id, index));
      expect(before.right[1], `before the hero: item ${index}`).toBeCloseTo(before.right[0], 1);
      expect(before.left[1]).toBeLessThan(before.left[0] - 1);
    }
    // At the hero slot the content fills the item: the change of side shows no jump.
    const hero = await edges(item(page, id, 0));
    expect(hero.left[1]).toBeCloseTo(hero.left[0], 1);
    expect(hero.right[1]).toBeCloseTo(hero.right[0], 1);
    // With fixed widths the content fills the item: nothing to align.
    const fixed = await edges(item(page, 'fixed-width', 1));
    expect(fixed.content).toBeCloseTo(fixed.item, 1);
  });

  test('CRL-16: the resting fill under the content; the content color inherited; the state layer drawn over the content', async ({ page }) => {
    const id = 'centered';
    expect(await css(item(page, id, 0).locator('.tanrei-icon'), 'color')).toBe(await resolveColor(page, T('item-content-color')));
    await override(page, { [T('item-hovered-state-layer-color')]: 'rgb(255, 0, 0)', '--tanrei-sys-state-hover-state-layer-opacity': '1' });
    await item(page, id, 0).hover();
    await expect.poll(() => css(layer(page, id, 0), 'opacity')).toBe('1');
    await page.waitForTimeout(300);
    const [own, glyph] = [await bounds(item(page, id, 0)), await bounds(item(page, id, 0).locator('.tanrei-icon'))];
    const shot = decodePng(await item(page, id, 0).screenshot({ animations: 'disabled' }));
    const dpr = await page.evaluate(() => devicePixelRatio);
    expect(shot.at(Math.floor((glyph.x - own.x + glyph.width / 2) * dpr), Math.floor((glyph.y - own.y + glyph.height / 2) * dpr))).toBe('rgb(255, 0, 0)');
    expect(await css(container(page, id, 0), 'background-color')).toBe(await resolveColor(page, T('item-container-color')));
    await expect(layer(page, id, 0)).toHaveAttribute('aria-hidden', 'true');
  });

  test('CRL-17: the items are one Tab stop — the item at slot 0, or the one that last had focus; arrows move without wrapping, Home and End', async ({ page }) => {
    const id = 'centered';
    await expect(container(page, id, 0)).toHaveAttribute('tabindex', '0');
    for (let i = 1; i < 5; i++) await expect(container(page, id, i)).toHaveAttribute('tabindex', '-1');
    await boxesAt(page, id, 416);
    await expect(container(page, id, 2)).toHaveAttribute('tabindex', '0');
    await tabTo(page, container(page, id, 2));
    expect(await focused(page)).toBe('Lake shore');
    await page.keyboard.press('ArrowRight');
    expect(await focused(page)).toBe('City park');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    expect(await focused(page)).toBe('Coast path');
    await page.keyboard.press('ArrowLeft'); // no wrap
    expect(await focused(page)).toBe('Coast path');
    // To the last item, which is not drawn while the first is the hero: it takes focus all the same, and comes to slot 0.
    await page.keyboard.press('End');
    expect(await focused(page)).toBe('Dunes');
    await page.keyboard.press('ArrowRight'); // no wrap
    expect(await focused(page)).toBe('Dunes');
    await page.keyboard.press('Home');
    expect(await focused(page)).toBe('Coast path');
    await page.keyboard.press('ArrowRight');
    await tab(page);
    expect(await focused(page)).not.toBe('Old forest');
    await tab(page, { back: true });
    expect(await focused(page)).toBe('Old forest');
    expect(await carousel(page, id).locator('.container[tabindex="0"]').count()).toBe(1);
  });

  test('CRL-17: with fixed widths, a hero at the start and free scroll the resting item is the first item wholly in view; a hero in the centre keeps the item at slot 0', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('shelf', { heroAlignment: 'start', fluidWidth: false, snap: false }, 5), ...only('fixed-width')] });
    await expect(container(page, 'shelf', 0)).toHaveAttribute('tabindex', '0');
    // Scrolled by 100: the first item is cut by the start edge, the second is wholly in view.
    await boxesAt(page, 'shelf', 100);
    await expect(container(page, 'shelf', 1)).toHaveAttribute('tabindex', '0');
    // The `fixed-width` fixture has its hero in the centre: the item nearest slot 0, although it scrolls freely.
    await boxesAt(page, 'fixed-width', 100);
    await expect(container(page, 'fixed-width', 0)).toHaveAttribute('tabindex', '0');
    await boxesAt(page, 'fixed-width', 110);
    await expect(container(page, 'fixed-width', 1)).toHaveAttribute('tabindex', '0');
  });

  test('CRL-17: at most five Tab stops — the playback control first, previous and next, the items, then the indicator; arrows wrap under loop, Home and End do not', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...only('autoplay'), ...only('loop')] });
    await tabTo(page, playback(page, 'autoplay'));
    expect(await focused(page)).toBe('playback');
    await tab(page);
    expect(await focused(page)).toBe('previous');
    await tab(page);
    expect(await focused(page)).toBe('next');
    // Then the items: the row that scrolls them is no stop of its own (Firefox makes a scroller one).
    await tab(page);
    expect(await focused(page)).toBe('Coast path');
    await tab(page);
    expect(await focused(page)).toBe('indicator');
    // The next carousel: no playback control, no indicator.
    await tab(page);
    expect(await focused(page)).toBe('previous');
    await tab(page);
    await tab(page);
    expect(await focused(page)).toBe('Coast path');
    // Loop: from the first item, Left Arrow goes to the last; Home and End still go to the ends.
    await page.keyboard.press('ArrowLeft');
    expect(await focused(page)).toBe('Dunes');
    await page.keyboard.press('ArrowRight');
    expect(await focused(page)).toBe('Coast path');
    await page.keyboard.press('End');
    expect(await focused(page)).toBe('Dunes');
    await page.keyboard.press('ArrowRight');
    expect(await focused(page)).toBe('Coast path');
  });

  test('CRL-18: keyboard focus brings the item to slot 0 over the scroll motion', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...only('centered', 'fixed-width'), fixture('wide', { itemWidth: 320 }, 4)] });
    const id = 'centered';
    await tabTo(page, container(page, id, 0));
    // Held at its start and stepped through its duration by the test (`holdMotions`).
    await holdMotions(page);
    await page.keyboard.press('ArrowRight');
    const motion = await stepMotion(page, id);
    expect(motion.duration).toBe(await resolveToken(page, T('motion-scroll-duration'), 'duration'));
    expectOver(motion.passed, 0, 208);
    await expect.poll(() => offset(page, id)).toBe(208);
    expect((await boxes(page, id))[1]).toEqual([100, 200]);
    await page.keyboard.press('End');
    await expect.poll(() => offset(page, id)).toBe(832);
    expect((await boxes(page, id))[4]).toEqual([100, 200]);
    // A wider hero (the cap, 240) moves by its own slot and the gap.
    await tabTo(page, container(page, 'wide', 0));
    await page.keyboard.press('End');
    await expect.poll(() => offset(page, 'wide')).toBe(3 * 248);
    expect((await boxes(page, 'wide'))[3]).toEqual([80, 240]);
    // Fixed widths with free scroll and a hero in the centre: to slot 0 as well.
    await tabTo(page, container(page, 'fixed-width', 0));
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => offset(page, 'fixed-width')).toBe(208);
    expect((await boxes(page, 'fixed-width'))[1]).toEqual([100, 200]);
  });

  test('CRL-18: under loop the item comes to slot 0 the shorter way round', async ({ page }) => {
    const id = 'loop';
    await tabTo(page, container(page, id, 0));
    const before = await offset(page, id);
    const s = await step(page, id);
    await page.keyboard.press('ArrowLeft'); // to Dunes, one position back round the ring
    await expect.poll(() => offset(page, id)).toBeCloseTo(before - s, 0);
    expectNear([(await boxes(page, id))[4]], [[100, 200]]);
  });

  test('CRL-18: fixed widths at the start with free scroll scroll as little as brings the whole item into view; reduced motion scrolls at once', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('shelf', { heroAlignment: 'start', fluidWidth: false, snap: false }, 5)] });
    const id = 'shelf';
    await tabTo(page, container(page, id, 0));
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => offset(page, id)).toBe(208 + 200 - 368);
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => offset(page, id)).toBe(0);
    await atRest(page, id);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await trace(page, id);
    await page.keyboard.press('End');
    await expect.poll(() => traced(page)).toEqual([664]);
    await page.waitForTimeout(200);
    expect(await traced(page)).toEqual([664]);
  });

  test('CRL-19: a list named by label around the items; each a list item with a button, its position and the count; the controls outside the list', async ({ page }) => {
    const id = 'centered';
    // `centered`, `scaled`, `loop` and the fixtures with a controls row are named "Featured walks".
    await expect(page.getByRole('list', { name: 'Walks near you' })).toHaveCount(2);
    const list = carousel(page, id);
    expect(await list.getAttribute('role')).toBeNull();
    await expect(list.locator('.stage')).toHaveAttribute('role', 'list');
    // Every item, those that are not drawn included (CRL-12), in order; the previous and next controls before the list,
    // outside it, exposed while auto hides them (CRL-41, CRL-42).
    const five = LABELS.slice(0, 5);
    expect(await list.ariaSnapshot()).toBe(['- button "Previous walk" [disabled]', '- button "Next walk"', '- list "Featured walks":', ...five.flatMap((l) => ['  - listitem:', `    - button "${l}"`])].join('\n'));
    for (let i = 0; i < 5; i++) {
      await expect(item(page, id, i)).toHaveAttribute('aria-posinset', String(i + 1));
      await expect(item(page, id, i)).toHaveAttribute('aria-setsize', '5');
    }
    await expect(item(page, id, 0).locator('.clip')).toHaveAttribute('aria-hidden', 'true');
    // The playback control and the indicator are outside the list and not counted among its items. (The items are the
    // carousel's children, slotted into the list: the tree assistive technology reads, not the DOM's, has them in it.)
    const auto = await carousel(page, 'autoplay').ariaSnapshot();
    const lines = auto.split('\n');
    const first = lines.findIndex((line) => line.startsWith('- list "Featured walks"'));
    const inList = lines.slice(first + 1).filter((line) => line.startsWith('  '));
    expect(inList.filter((line) => line.trim().startsWith('- listitem'))).toHaveLength(6);
    expect(inList.join('\n')).not.toMatch(/slider|slideshow/);
    expect(auto).toMatch(/^- button "Pause the slideshow"/m);
    expect(auto).toMatch(/^- slider "Featured walks"/m);
  });

  test('CRL-20: an item without a label and a carousel without one still render, and a debug build reports them; so is interactive content', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        { id: 'unnamed', props: { navigation: 'none' }, items: [{ kind: 'item', props: {}, content: 'landscape' }, { kind: 'item', props: { label: 'With a link' }, content: '<a href="#x">More</a>' }] },
      ],
    });
    expect((await boxes(page, 'unnamed'))[0]).toEqual([100, 200]);
    await expect.poll(() => seen.filter((w) => w.includes('CRL-20')).length).toBe(3);
    expect(seen).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/<tanrei-carousel>: label is empty, so the carousel’s list and its indicator have no accessible name/),
        expect.stringMatching(/<tanrei-carousel-item>: label is empty/),
        expect.stringMatching(/holds an interactive element \(<a>\)/),
      ]),
    );
  });

  test('CRL-20: a playback control without its names, and dots that do not fit, are reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [fixture('nameless-control', { autoplay: true, playLabel: 'Play' }), fixture('many-dots', { indicator: true }, 20)],
    });
    // Each once. (Where the engine hands the items over one by one as it reads them — WebKit, into a document written
    // again — the dots stop fitting at 15 and each count from there is a report of its own, once: the last is the 20.)
    const reports = () => seen.filter((w) => w.includes('CRL-20'));
    await expect.poll(() => reports().filter((w) => /pause-label is empty|its 20 dots do not fit/.test(w)).length).toBe(2);
    expect(new Set(reports()).size, 'none twice').toBe(reports().length);
    expect(reports().filter((w) => !/pause-label is empty|its \d+ dots do not fit/.test(w))).toEqual([]);
    // 20 dots do not fit beside the control's target at W 368: none is drawn, and there is no controls row.
    await expect(indicator(page, 'many-dots')).toHaveCount(0);
    await expect(carousel(page, 'many-dots').locator('.controls')).toHaveCount(0);
  });

  test('CRL-21: a new width or new items keep the item at slot 0 where it was, at once', async ({ page }) => {
    const id = 'centered';
    await boxesAt(page, id, 416);
    expect((await boxes(page, id))[2]).toEqual([100, 200]);
    await page.locator(`[data-fixture="${id}"]`).evaluate((el) => (el.style.inlineSize = '800px'));
    await trace(page, id);
    // Arranged for the wider row (W 768): the hero is its floor (208) in the middle, with "Lake shore" still at slot 0.
    await expect.poll(async () => (await boxes(page, id))[2][1]).toBe(208);
    expect((await boxes(page, id))[2]).toEqual([16 + 280, 208]);
    await item(page, id, 0).evaluate((el) => el.remove());
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    expect(await item(page, id, 1).getAttribute('label')).toBe('Lake shore');
    expect((await boxes(page, id))[1]).toEqual([16 + 280, 208]);
    // Without motion: every offset it passed through is a final one.
    expect(new Set(await traced(page)).size).toBeLessThanOrEqual(2);
    await page.locator(`[data-fixture="${id}"]`).evaluate((el) => (el.style.inlineSize = '400px'));
    await expect.poll(async () => (await boxes(page, id))[1][1]).toBe(200);
    expect((await boxes(page, id))[1]).toEqual([100, 200]);
  });

  test('CRL-21: below two items the carousel stops looping and draws neither the indicator nor the playback control', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('two', { loop: true, indicator: true, autoplay: true, playLabel: 'Play', pauseLabel: 'Pause' }, 2)] });
    const id = 'two';
    await expect(indicator(page, id)).toHaveCount(1);
    await expect(playback(page, id)).toHaveCount(1);
    await item(page, id, 1).evaluate((el) => el.remove());
    await expect(indicator(page, id)).toHaveCount(0);
    await expect(playback(page, id)).toHaveCount(0);
    await expect(carousel(page, id).locator('.controls')).toHaveCount(0);
    expect(await scroller(page, id).evaluate((el) => el.scrollWidth - el.clientWidth), 'no loop track').toBe(0);
  });

  test('CRL-22: colors and opacity change over motion.state-duration with motion.state-easing, on the items and the controls, and at once where motion is reduced', async ({ page }) => {
    const [duration, easing] = [await resolveToken(page, T('motion-state-duration'), 'duration'), await token(page, T('motion-state-easing'))];
    const parts = [container(page, 'centered', 0), layer(page, 'centered', 0), indicator(page, 'autoplay-paused'), playback(page, 'autoplay-paused')];
    for (const part of parts) {
      expect(Number.parseFloat(await css(part, 'transition-duration')) * 1000).toBe(duration);
      expect(await css(part, 'transition-timing-function')).toBe(await page.evaluate((e) => {
        const probe = document.createElement('div');
        probe.style.transitionTimingFunction = e;
        return probe.style.transitionTimingFunction;
      }, easing));
    }
    expect(await css(layer(page, 'centered', 0), 'transition-property')).toContain('opacity');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const part of parts.slice(0, 3)) expect(await css(part, 'transition-duration')).toBe('0s');
  });

  test('CRL-23: right-to-left mirrors the row, the scroll, the arrow keys, toward-hero’s sides and the controls row; a ripple still grows from the point of contact; neither the content nor the glyphs are mirrored', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, system: 'm3-like' });
    await page.evaluate(() => (document.documentElement.dir = 'rtl'));
    const id = 'centered';
    const host = await bounds(carousel(page, id));
    const first = await bounds(item(page, id, 0));
    // Mirrored: the hero 100 from the right edge, and at p 0.5 the verify note's boxes measured from the right.
    expect(round(host.x + host.width - (first.x + first.width))).toBe(100);
    const second = await bounds(item(page, id, 1));
    expect(second.x + second.width, 'the item after the hero is to its left').toBeLessThan(first.x);
    expectNear((await boxesAt(page, id, 104)).slice(0, 3), [[58, 138], [204, 138], [350, 38]]);
    expect(await scroller(page, id).evaluate((el) => el.scrollLeft)).toBeLessThan(0);
    await boxesAt(page, id, 0);
    await tabTo(page, container(page, id, 0));
    await page.keyboard.press('ArrowLeft');
    expect(await focused(page)).toBe('Old forest');
    await page.keyboard.press('ArrowRight');
    expect(await focused(page)).toBe('Coast path');
    await expect.poll(() => offset(page, id)).toBe(0);
    const box = await bounds(container(page, id, 0));
    await page.mouse.move(box.x + 30, box.y + 12);
    await page.mouse.down();
    const origin = await ripples(page, id, 0).evaluate((el) => [Number.parseFloat(el.style.getPropertyValue('--_x')), Number.parseFloat(el.style.getPropertyValue('--_y'))]);
    expect(origin[0]).toBeCloseTo(30, 0);
    expect(origin[1]).toBeCloseTo(12, 0);
    await page.mouse.up();
    // The content is placed physically, centred: nothing flips it.
    expect(await css(item(page, id, 0).locator('.content'), 'transform')).toBe('none');
    expect(await css(item(page, id, 0).locator('.content'), 'scale')).toBe('none');
    const centre = await edges(item(page, id, 1));
    expect(centre.content).toBeCloseTo(centre.item, 1);
    // Toward the hero, mirrored: the item after the hero (to its left) aligns its content's start, its right edge; the
    // item before it (to its right) its content's end, its left edge.
    const after = await edges(item(page, 'content-toward-hero', 1));
    expect(after.right[1]).toBeCloseTo(after.right[0], 1);
    const before = await edges(item(page, 'content-toward-hero', 5));
    expect(before.left[1]).toBeCloseTo(before.left[0], 1);
    // The controls row: the playback control at the left, the dots in mirrored order, the glyph not mirrored.
    const auto = 'autoplay-paused';
    const [own, control] = [await bounds(carousel(page, auto)), await bounds(playback(page, auto))];
    expect(round(control.x - own.x)).toBe(await resolveToken(page, T('layout-padding-inline')));
    const [dot0, dot1] = [await bounds(dots(page, auto).nth(0)), await bounds(dots(page, auto).nth(1))];
    expect(dot0.x).toBeGreaterThan(dot1.x);
    expect(await css(playback(page, auto).locator('.icon'), 'direction')).toBe('ltr');
    expect(await css(playback(page, auto).locator('.icon'), 'transform')).toBe('none');
  });

  test('CRL-24: unknown alignments are drawn as their defaults, and an itemWidth or autoplayInterval that is not a positive number as null; a debug build reports each', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [fixture('odd', { heroAlignment: 'middle' }), fixture('odd-content', { contentAlignment: 'away' }), fixture('negative', { itemWidth: -5 }), fixture('nan', { itemWidth: 'wide' }), fixture('zero-interval', { autoplayInterval: 0 })],
    });
    // Each is drawn as the defaults: the hero in the centre (not at the start), at the token's width.
    for (const id of ['odd', 'odd-content', 'negative', 'nan']) expectNear((await boxes(page, id)).slice(0, 2), [[100, 200], [308, 76]], id);
    const at = await edges(item(page, 'odd-content', 1));
    expect(at.content, 'drawn centred').toBeCloseTo(at.item, 1);
    await expect.poll(() => seen.filter((w) => w.includes('CRL-24')).length).toBe(5);
    expect(seen).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/heroAlignment "middle" is not a hero alignment of the carousel; it is drawn as "center" \(CRL-24\)/),
        expect.stringMatching(/contentAlignment "away" is not a content alignment of the carousel; it is drawn as "center"/),
        expect.stringMatching(/itemWidth -5 is not a positive number/),
        expect.stringMatching(/itemWidth NaN is not a positive number/),
        expect.stringMatching(/autoplayInterval 0 is not a positive number/),
      ]),
    );
  });

  test('CRL-25: enlarged text keeps the height, the slots and the items as they are', async ({ page }) => {
    const before = { host: await bounds(carousel(page, 'centered')), items: await boxes(page, 'centered') };
    await override(page, { '--tanrei-dial-type-base': '32px' });
    await page.waitForTimeout(100);
    expect(await bounds(carousel(page, 'centered'))).toEqual(before.host);
    expect(await boxes(page, 'centered')).toEqual(before.items);
  });

  test('CRL-26: scaleOthers draws the others at min-scale — closed up to their neighbours with fixed widths — following the scroll; the hero whole; the corners at the token radius; the ring at its own width', async ({ page }) => {
    const id = 'scaled';
    const [minScale, height, outer, gap, shape] = [Number(await token(page, T('container-min-scale'))), await resolveToken(page, T('layout-height')), await resolveToken(page, '--tanrei-sys-focus-outer-width'), await resolveToken(page, T('layout-gap')), await resolveToken(page, T('container-shape'))];
    expect(minScale).toBe(0.85);
    /** Every item's drawn container: start, end, top and height, from the carousel's start edge and the row's top. */
    const drawnBoxes = () =>
      carousel(page, id).evaluate((host) => {
        const own = host.getBoundingClientRect();
        return [...host.querySelectorAll('tanrei-carousel-item')].map((el) => {
          const r = el.shadowRoot!.querySelector('.container')!.getBoundingClientRect();
          return [r.left - own.left, r.right - own.left, r.top - own.top, r.height].map((v) => Math.round(v * 100) / 100);
        });
      });
    // The verify note: the hero whole from 84 to 284; slot 1 170 wide from 292 to 462 and 170 tall (15 to 185); slot −1
    // from −94 to 76 — 8 from the hero, where a box scaled about its middle left 23.
    const rest = await drawnBoxes();
    // (Twice the unit: a box's two edges are each kept to a 60th or a 64th of a pixel.)
    expectNear([rest[0], rest[1], rest[4]], [[100, 300, 0, 200], [308, 478, 15, 170], [-78, 92, 15, 170]], 'at rest', 2 * NEAR);
    expect(rest[1][3]).toBeCloseTo(height * minScale, 1);
    // The drawn container is the item's box: nothing shrinks inside an unscaled one.
    expect((await boxes(page, id))[1]).toEqual((await boxes(page, id, 'container'))[1]);
    // The content is laid out at H and the row's height and drawn at the item's scale: it fills the drawn container.
    const content = await item(page, id, 1).evaluate((el) => {
      const [own, inner] = [el.shadowRoot!.querySelector('.container')!.getBoundingClientRect(), el.shadowRoot!.querySelector('.content') as HTMLElement];
      const box = inner.getBoundingClientRect();
      return { laidOut: [inner.offsetWidth, inner.offsetHeight], drawn: [box.width, box.height].map((v) => Math.round(v * 100) / 100), own: [own.width, own.height] };
    });
    expect(content.laidOut).toEqual([200, height]);
    expectNear([content.drawn], [content.own], 'the content', 2 * NEAR);
    // The corners stay the token's radius; they are not multiplied by the scale.
    expect(Number.parseFloat(await css(container(page, id, 1), 'border-top-left-radius'))).toBe(shape);
    expect(Number.parseFloat(await css(item(page, id, 1).locator('.clip'), 'border-top-left-radius'))).toBe(shape);
    // At p 0.5: item 0 from −5 to 180 and item 1 from 188 to 373, each at 0.925 (185 tall), and item 2 from 381.
    const half = (await drawnAt(page, id, 0.5)).boxes;
    expectNear([half[0], half[1]], [[11, 196, 7.5, 185], [204, 389, 7.5, 185]], 'at p 0.5', 2 * NEAR);
    expect(half[2][0]).toBe(16 + 381);
    // Where motion is reduced the scale still follows the person's scroll.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const quarter = (await drawnAt(page, id, 0.25)).boxes;
    expect(quarter[1][3]).toBeCloseTo(height * (1 - 0.15 * 0.75), 1);
    expect(quarter[1][1] - quarter[1][0]).toBeCloseTo(200 * (1 - 0.15 * 0.75), 1);
    // The ring is drawn at its own width inside the drawn container; the hit area follows the drawn container.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await drawnAt(page, id, 0);
    await release(page, id);
    await tabTo(page, container(page, id, 0));
    await atRest(page, id);
    await drawnAt(page, id, 0.5); // the focused item now at s = −0.5, drawn at 0.925
    expect(Number.parseFloat(await css(container(page, id, 0), 'outline-width'))).toBe(outer);
    expect(Number.parseFloat(await css(container(page, id, 0), 'outline-offset'))).toBe(-outer);
    expect(await container(page, id, 0).evaluate((el) => Number.parseFloat(getComputedStyle(el, '::before').width))).toBeCloseTo(200 * 0.925 + gap, 1);
    // With fluid widths the slots keep their widths (which already fill the row): only the height and the content scale.
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('fluid-scaled', { scaleOthers: true, loop: true }, 5)] });
    const fluid = await carousel(page, 'fluid-scaled').evaluate((host) => {
      const own = host.getBoundingClientRect();
      return [...host.querySelectorAll('tanrei-carousel-item')].map((el) => {
        const r = el.shadowRoot!.querySelector('.container')!.getBoundingClientRect();
        return [r.left - own.left, r.width, r.top - own.top, r.height];
      });
    });
    expectNear([fluid[4], fluid[0], fluid[1]], [[16, 76, 15, 170], [100, 200, 0, 200], [308, 76, 15, 170]], 'fluid', 2 * NEAR);
  });

  test('CRL-27: loop scrolls without end — past the last item to the first — each item drawn once, passing to the other side at the edge slots; the track moves by whole turns at rest', async ({ page }) => {
    const id = 'loop';
    await atRest(page, id);
    // At rest: the last item (Dunes) fills the slot before the hero; the items at the edge slots are not drawn.
    expectNear([(await boxes(page, id))[4], (await boxes(page, id))[0], (await boxes(page, id))[1]], [[16, 76], [100, 200], [308, 76]]);
    expect([(await boxes(page, id))[2][1], (await boxes(page, id))[3][1]]).toEqual([0, 0]);
    const s = await step(page, id);
    // The verify note at p 0.5: item 4 from −4 to 34, item 0 from 42 to 180, item 1 from 188 to 326, item 2 from 334 to 372.
    const half = (await drawnAt(page, id, 0.5)).boxes;
    expectNear([half[4], half[0], half[1], half[2]].map(([from, to]) => [from, to]), [[12, 50], [58, 196], [204, 342], [350, 388]]);
    expect(half[3][1] - half[3][0], 'the item at the other edge slot has no width').toBe(0);
    await drawnAt(page, id, 0);
    await release(page, id);
    await tabTo(page, container(page, id, 0));
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
    await atRest(page, id);
    // Round the ring and back to the first item, at the hero slot again.
    expect(await focused(page)).toBe('Coast path');
    expectNear([(await boxes(page, id))[0]], [[100, 200]]);
    // Re-centred by whole turns: the offset is within the middle turn of the track, and the offset moved by 5 × step at most.
    const range = await scroller(page, id).evaluate((el) => el.scrollWidth - el.clientWidth);
    const at = await offset(page, id);
    expect(at).toBeGreaterThan(5 * s - 1);
    expect(at).toBeLessThan(range - 5 * s + 1);
    // Every item once in the tree: no clones.
    expect(await carousel(page, id).locator('tanrei-carousel-item').count()).toBe(5);
  });

  // ── CRL-40: one gap at every scroll position ──────────────────────────────────────────────────────
  // The five fixtures the verify note names, and the items of `centered` with the hero at the start, with fluid and with
  // fixed widths (a hero at the start has no fixture).
  const GAP_FIXTURES = ['centered', 'content-toward-hero', 'fixed-width', 'scaled', 'loop'];
  const gapRows = (): Fixture[] => {
    const centered = only('centered')[0];
    return [
      ...GAP_FIXTURES.map((id) => only(id)[0]),
      { ...centered, id: 'start-fluid', props: { ...centered.props, heroAlignment: 'start' } },
      { ...centered, id: 'start-fixed', props: { ...centered.props, heroAlignment: 'start', fluidWidth: false } },
    ];
  };
  /** A product's layer whose gap and padding are not the default's: a gap that follows the padding, or a literal 8, fails under it. */
  const WIDER = { system: 'wider', systemCss: `:root[data-tanrei-system='wider'] { ${T('layout-gap')}: 12px; ${T('layout-padding-inline')}: 24px; }` };
  /** The drawn containers at p 0.5 as the verify note has them, in inner coordinates (default tokens, W 368), from the first drawn item on. */
  const AT_HALF: Record<string, number[][]> = {
    centered: [[42, 180], [188, 326], [334, 372]],
    'fixed-width': [[-20, 180], [188, 388]],
    scaled: [[-5, 180], [188, 373]],
    loop: [[-4, 34], [42, 180], [188, 326], [334, 372]],
    'start-fluid': [[-4, 96], [104, 254.67], [262.67, 338.67], [346.67, 372]],
  };

  /**
   * The motions CRL-40 is read through, held at their start and stepped through their durations by the test
   * (`holdMotions`, `stepDrawn`): a settle of each row that snaps, a move by the keys of each row, and an advance of all
   * of them at once. Each entry is a test of its own, in each direction; the coverage test below holds that every row's
   * motions are read exactly once.
   */
  const MOTION_PARTS = [
    ...gapRows().map(({ id, props }) => ({ ids: [id], motions: props.snap !== false ? ['settle', 'keys'] : ['keys'] })),
    { ids: gapRows().map((f) => f.id), motions: ['advance'] },
  ];
  test('CRL-40: the parts of the held motions read a settle of every row that snaps, a move by the keys and an advance of every row, each exactly once', () => {
    const read = MOTION_PARTS.flatMap(({ ids, motions }) => ids.flatMap((id) => motions.map((motion) => `${id}/${motion}`)));
    expect([...read].sort()).toEqual(gapRows().flatMap(({ id, props }) => [...(props.snap !== false ? ['settle'] : []), 'keys', 'advance'].map((motion) => `${id}/${motion}`)).sort());
    expect(new Set(read).size).toBe(read.length);
    expect(gapRows().map((f) => f.id)).toEqual([...GAP_FIXTURES, 'start-fluid', 'start-fixed']);
  });
  /**
   * The moments `stepDrawn` read of one row's motion: at each, every two drawn neighbours are the gap apart; the motion
   * goes from its start to its end through the nine between, never away from where it is going, and more than one of
   * them lies between two resting positions (`one` apart).
   */
  const expectGapsHeld = (moments: Moment[], gap: number, id: string, what: string, one: number) => {
    expect(moments.length, `${id}, ${what}`).toBe(12);
    for (const { offset: at, boxes } of moments) {
      const gaps = gapsOf(boxes);
      expect(gaps.length, `${id}, ${what}`).toBeGreaterThan(0);
      for (const each of gaps) expect(Math.abs(each - gap), `${id}, ${what}, at offset ${at}: gaps ${gaps.join(', ')}`).toBeLessThanOrEqual(0.01);
    }
    const passed = moments.slice(1, 10).map((m) => m.offset);
    expectOver(passed, moments[0].offset, moments[10].offset);
    const between = passed.filter((o) => Math.abs(o / one - Math.round(o / one)) > 0.02);
    expect(between.length, `${id}, ${what}: seen between resting positions (${moments[0].offset} → ${passed} → ${moments[10].offset})`).toBeGreaterThan(1);
  };

  for (const dir of ['ltr', 'rtl'] as const) {
    for (const system of ['default', 'wider'] as const) {
      test(`CRL-40: held between resting positions, every two drawn neighbours are layout.gap apart — the five fixtures and a hero at the start, ${dir}, the ${system} tokens`, async ({ page }) => {
        test.setTimeout(90_000);
        await mountFixtures(page, spec, { icons: true, dir, fixtures: gapRows(), ...(system === 'wider' ? WIDER : {}) });
        const [gap, padding] = [await resolveToken(page, T('layout-gap')), await resolveToken(page, T('layout-padding-inline'))];
        expect([gap, padding]).toEqual(system === 'wider' ? [12, 24] : [8, 16]);
        for (const { id } of gapRows()) {
          let pairs = 0;
          // At rest, between resting positions (the verify note's three), past the first one and at an offset that is
          // no whole pixel.
          for (const [p, extra] of [[0, 0], [0.25, 0], [0.5, 0], [0.75, 0], [1.37, 0], [0.5, 1 / 3], [0.1, 0], [0.9, 0]]) {
            const { boxes: drawn, offset: at, step: one } = await drawnAt(page, id, p, extra);
            const gaps = gapsOf(drawn);
            pairs += gaps.length;
            for (const each of gaps) expect(Math.abs(each - gap), `${id} at p ${p}${extra ? ' and a third of a pixel' : ''} (offset ${at}): gaps ${gaps.join(', ')}`).toBeLessThanOrEqual(0.01);
            if (p === 0.5 && !extra && system === 'default' && AT_HALF[id]) {
              expect(one).toBe(208);
              const inView = drawn.filter(([from, to]) => to - from > 0 && to > 0 && from < 400).sort((a, b) => a[0] - b[0]);
              // `scaled` loops with fixed widths: the note gives its two items around the hero slot.
              const named = id === 'scaled' ? inView.filter(([from]) => from > 0 && from < 300) : inView;
              expectNear(named.map(([from, to]) => [from - padding, to - padding]), AT_HALF[id], `${id} at p 0.5`, DEVICE);
            }
          }
          expect(pairs, id).toBeGreaterThan(8);
          // Nothing about an item's place or width has a timing of its own: it is where the scroll position puts it.
          const timing = await item(page, id, 0).evaluate((el) => {
            const [own, inner] = [getComputedStyle(el), getComputedStyle(el.shadowRoot!.querySelector('.container')!)];
            return { host: [own.transitionDuration, own.animationName], container: inner.transitionProperty };
          });
          expect(timing.host).toEqual(['0s', 'none']);
          expect(timing.container).toBe('color, opacity');
        }
        if (system === 'wider') {
          // The row is laid out from the system's tokens: the first slot starts at its padding, 24 from the edge.
          await release(page, 'loop');
          expect((await drawnAt(page, 'loop', 0)).boxes[4][0]).toBe(24);
        }
      });
    }

    // Each move is held at its start and stepped through its duration by the test, so the moments read between two
    // resting positions do not depend on how often the machine draws a frame, and the motions keep their tokens' own
    // lengths. One test for each part of MOTION_PARTS, each with the whole of the time limit.
    for (const { ids, motions } of MOTION_PARTS) {
      if (motions.includes('advance')) {
        test(`CRL-40: at every tenth of an advance, held and stepped, and at rest after it, every two drawn neighbours are layout.gap apart — ${ids.join(', ')}, ${dir}`, async ({ page }) => {
          // The rows with autoplay on, a short interval — longer than the advance, so that a row rests between two of
          // them — nothing holding them once they play. They are mounted paused and set playing once every advance
          // is held as it begins: all of them are timed the same way, and they are stepped together.
          const playing = gapRows()
            .filter((f) => ids.includes(f.id))
            .map((f) => ({ ...f, props: { ...f.props, autoplay: true, autoplayInterval: 1000, paused: true, playLabel: 'Play', pauseLabel: 'Pause' } }));
          await mountFixtures(page, spec, { icons: true, dir, fixtures: playing, reducedMotion: false });
          const gap = await resolveToken(page, T('layout-gap'));
          expect(gap).toBe(8);
          // The pointer away from every row (they stand at the right in right-to-left): it would hold autoplay (CRL-33).
          await page.mouse.move(dir === 'rtl' ? 10 : 1200, 10);
          await holdMotions(page);
          for (const id of ids) await carousel(page, id).evaluate((host) => ((host as unknown as { paused: boolean }).paused = false));
          const advance = await stepDrawn(page, ids, ids.length);
          const advances = await resolveToken(page, T('motion-autoplay-duration'), 'duration');
          expect(advance.durations, 'each advance is the autoplay motion').toEqual(ids.map(() => advances));
          // H is 120 in `content-toward-hero` and 200 in the others.
          for (const id of ids) expectGapsHeld(advance.moments[id], gap, id, 'an advance', (id === 'content-toward-hero' ? 120 : 200) + gap);
        });
        continue;
      }
      const [id] = ids;
      test(`CRL-40: at every tenth of ${motions.includes('settle') ? 'a settle and ' : ''}a move by the keys, held and stepped, and at rest after each, every two drawn neighbours are layout.gap apart — ${id}, ${dir}`, async ({ page }) => {
        await mountFixtures(page, spec, { icons: true, dir, fixtures: gapRows().filter((f) => f.id === id), reducedMotion: false });
        const gap = await resolveToken(page, T('layout-gap'));
        expect(gap).toBe(8);
        const scrolls = await resolveToken(page, T('motion-scroll-duration'), 'duration');
        const base = await offset(page, id);
        const one = await step(page, id);
        if (motions.includes('settle')) {
          await holdMotions(page);
          await carousel(page, id).evaluate(async (host, to) => {
            const el = host.shadowRoot!.querySelector('.scroller')!;
            el.scrollLeft = to;
            await new Promise((r) => requestAnimationFrame(r));
            el.dispatchEvent(new Event('scrollend'));
          }, (dir === 'rtl' ? -1 : 1) * (base + 0.37 * one));
          const settle = await stepDrawn(page, [id]);
          expect(settle.durations, `${id}: a settle is the scroll motion`).toEqual([scrolls]);
          expectGapsHeld(settle.moments[id], gap, id, 'a settle', one);
          await expect.poll(() => offset(page, id), `${id} settles`).toBe(base);
          await atRest(page, id);
        }
        await tabTo(page, container(page, id, 0));
        await atRest(page, id);
        await holdMotions(page);
        await page.keyboard.press(dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight');
        const move = await stepDrawn(page, [id]);
        expect(move.durations, `${id}: a move by the keys is the scroll motion`).toEqual([scrolls]);
        const moments = move.moments[id];
        expect(Math.abs(moments[10].offset - moments[0].offset), `${id} moves by the keys`).toBeGreaterThan(30);
        expectGapsHeld(moments, gap, id, 'a move by the keys', one);
      });
    }
  }

  for (const ratio of [1, 1.1, 1.25, 1.5, 2]) {
    test(`CRL-40: at a device pixel ratio of ${ratio} every start is on a device pixel and every gap is the same whole number of device pixels`, async ({ browser }) => {
      test.setTimeout(90_000);
      const context = await browser.newContext({ deviceScaleFactor: ratio, viewport: { width: 1280, height: 720 } });
      const page = await context.newPage();
      for (const dir of ['ltr', 'rtl'] as const) {
        await mountFixtures(page, spec, { icons: true, dir, fixtures: gapRows() });
        expect(await page.evaluate(() => devicePixelRatio)).toBeCloseTo(ratio, 5);
        // The gap as this ratio rounds it: 8 CSS px is 9 device pixels at 1.1 — and then 9 in every gap, never 8 in one and 9 in the next.
        const gap = Math.round(8 * ratio);
        for (const { id } of gapRows()) {
          for (const [p, extra] of [[0, 0], [0.25, 0], [0.5, 1 / 3], [0.61, 0], [0.75, 0.4], [1.37, 0]]) {
            const { boxes: drawn, offset: at } = await drawnAt(page, id, p, extra);
            const shown = drawn.filter(([from, to]) => to - from > 0).sort((a, b) => a[0] - b[0]);
            const inDevice = shown.map(([from, to]) => [from * ratio, to * ratio]);
            // Layout keeps a 64th of a CSS pixel (a 60th in Firefox): a start is its device pixel within a twentieth.
            for (const [from] of inDevice) expect(Math.abs(from - Math.round(from)), `${dir} ${id} at p ${p} (offset ${at}): the start ${from} device pixels`).toBeLessThan(0.05);
            const gaps = inDevice.slice(1).map(([from], i) => from - inDevice[i][1]);
            expect(gaps.length, `${dir} ${id} at p ${p}`).toBeGreaterThan(0);
            for (const each of gaps) expect(Math.abs(each - gap), `${dir} ${id} at p ${p} (offset ${at}): gaps of ${gaps.map((g) => Math.round(g * 100) / 100).join(', ')} device pixels`).toBeLessThan(0.06);
          }
        }
      }
      await context.close();
    });
  }

  for (const zoom of [1.1, 1.25, 2]) {
    test(`CRL-40: inside an ancestor with a CSS zoom of ${zoom} the row is arranged for its own width — the slots are the ones it has without the zoom — and every start is on a device pixel of the zoomed row, every gap the same whole number of them`, async ({ page }) => {
      test.setTimeout(90_000);
      const positions = [[0, 0], [0.5, 1 / 3], [1.37, 0]] as const;
      const read = async () => {
        const out: Record<string, Drawn[]> = {};
        for (const { id } of gapRows()) for (const [p, extra] of positions) out[`${id} at p ${p}`] = (await drawnAt(page, id, p, extra)).boxes;
        return out;
      };
      await mountFixtures(page, spec, { icons: true, fixtures: gapRows() });
      const plain = await read();
      await mountFixtures(page, spec, { icons: true, fixtures: gapRows(), lead: `<style>.stage { zoom: ${zoom}; }</style>` });
      // What the zoom makes of one of the row's own pixels, as the browser measures a box (1 where it reports boxes unzoomed).
      const scale = await carousel(page, gapRows()[0].id).evaluate((host) => host.getBoundingClientRect().width / Number.parseFloat(getComputedStyle(host).width));
      const zoomed = await read();
      // A device pixel of the row: the window's ratio times the zoom.
      const ratio = (await page.evaluate(() => devicePixelRatio)) * zoom;
      const gap = Math.round(8 * ratio);
      for (const [name, boxes] of Object.entries(zoomed)) {
        const own = boxes.map(([from, to]) => [from / scale, to / scale]);
        // The same slots as without the zoom, to the device pixel a start is rounded to.
        expect(own.length, name).toBe(plain[name].length);
        for (const [index, [from, to]] of own.entries()) {
          expect(Math.abs(from - plain[name][index][0]), `${name}: item ${index} starts at ${from}, without the zoom at ${plain[name][index][0]}`).toBeLessThan(1.05);
          expect(Math.abs(to - plain[name][index][1]), `${name}: item ${index} ends at ${to}, without the zoom at ${plain[name][index][1]}`).toBeLessThan(1.05);
        }
        const shown = own.filter(([from, to]) => to - from > 0).sort((a, b) => a[0] - b[0]);
        const inDevice = shown.map(([from, to]) => [from * ratio, to * ratio]);
        for (const [from] of inDevice) expect(Math.abs(from - Math.round(from)), `${name}: the start ${from} device pixels`).toBeLessThan(0.05);
        const gaps = inDevice.slice(1).map(([from], i) => from - inDevice[i][1]);
        for (const each of gaps) expect(Math.abs(each - gap), `${name}: gaps of ${gaps.map((g) => Math.round(g * 100) / 100).join(', ')} device pixels`).toBeLessThan(0.06);
      }
    });
  }

  test('CRL-40: painted at a device pixel ratio of 1 and an offset that is no whole pixel, every gap along the row is the same number of surface-colored columns', async ({ browser }) => {
    test.setTimeout(90_000);
    const context = await browser.newContext({ deviceScaleFactor: 1, viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    for (const dir of ['ltr', 'rtl'] as const) {
      await mountFixtures(page, spec, { dir, fixtures: gapRows(), reducedMotion: false });
      await page.mouse.move(dir === 'rtl' ? 10 : 1200, 10);
      const gap = await resolveToken(page, T('layout-gap'));
      for (const { id } of gapRows()) {
        for (const p of [0.25, 0.5, 0.75]) {
          await drawnAt(page, id, p, 1 / 3);
          const stage = page.locator(`[data-fixture="${id}"]`);
          const surface = await css(stage, 'background-color');
          const shot = decodePng(await stage.screenshot({ animations: 'disabled' }));
          // Along a line through every item, the scaled ones too (170 of 200 tall), above the glyphs in their middle.
          const y = Math.floor(shot.height * 0.3);
          const runs: number[] = [];
          let [run, seen] = [0, false];
          for (let x = 0; x < shot.width; x++) {
            if (shot.at(x, y) === surface) run++;
            else {
              // A run of surface between two items is a gap; the padding before the first item is not.
              if (run && seen) runs.push(run);
              [run, seen] = [0, true];
            }
          }
          expect(runs.length, `${dir} ${id} at p ${p}`).toBeGreaterThan(0);
          expect(runs, `${dir} ${id} at p ${p}: the surface-colored columns in each gap`).toEqual(runs.map(() => gap));
        }
      }
    }
    await context.close();
  });

  test('CRL-28: the controls row is controls.height tall below the items, the dots centred on the carousel, the playback control at the inline end inside the padding', async ({ page }) => {
    const [height, controls, button, padding] = [await resolveToken(page, T('layout-height')), await resolveToken(page, T('controls-height')), await resolveToken(page, T('controls-button-size')), await resolveToken(page, T('layout-padding-inline'))];
    for (const id of ['autoplay', 'indicator', 'playback-control']) {
      const host = await bounds(carousel(page, id));
      expect(host.height, id).toBe(height + controls);
      const row = await bounds(carousel(page, id).locator('.controls'));
      expect([row.y - host.y, row.width, row.height], id).toEqual([height, 400, controls]);
    }
    await expect(carousel(page, 'centered').locator('.controls')).toHaveCount(0);
    expect((await bounds(carousel(page, 'centered'))).height).toBe(height);
    const host = await bounds(carousel(page, 'autoplay'));
    const [dotsBox, control] = [await bounds(indicator(page, 'autoplay')), await bounds(playback(page, 'autoplay'))];
    expect(dotsBox.x + dotsBox.width / 2 - host.x).toBeCloseTo(200, 1);
    expect(round(host.x + host.width - (control.x + control.width))).toBe(padding);
    expect([control.width, control.height]).toEqual([button, button]);
    expect(control.y + control.height / 2 - host.y).toBeCloseTo(height + controls / 2, 1);
    expect(dotsBox.y + dotsBox.height / 2 - host.y).toBeCloseTo(height + controls / 2, 1);
    // Centred whether or not the control is drawn.
    const alone = await bounds(indicator(page, 'indicator'));
    const aloneHost = await bounds(carousel(page, 'indicator'));
    expect(alone.x + alone.width / 2 - aloneHost.x).toBeCloseTo(200, 1);
  });

  test('CRL-29: D dots, the current one stretched and filled; the stretch and the fill follow the scroll; the container’s size', async ({ page }) => {
    const id = 'indicator';
    const [size, active, gap, pad, button] = [await resolveToken(page, T('dot-size')), await resolveToken(page, T('dot-active-width')), await resolveToken(page, T('dot-gap')), await resolveToken(page, T('controls-indicator-padding-inline')), await resolveToken(page, T('controls-button-size'))];
    await expect(dots(page, id)).toHaveCount(6);
    const box = await bounds(indicator(page, id));
    // The verify note: the dots 104 wide, the container 128, controls.button-size tall.
    expect([box.width, box.height]).toEqual([5 * (size + gap) + active + 2 * pad, button]);
    expect(box.width).toBe(128);
    expect((await bounds(dots(page, id).nth(0))).height).toBe(size);
    expect(await dotsAt(page, id, 0)).toEqual([24, 8, 8, 8, 8, 8]);
    // At p 0.25 dot 0 is 20 wide and dot 1 is 12.
    const quarter = await indicatorAt(page, id, 52);
    expect(quarter.widths.slice(0, 2)).toEqual([20, 12]);
    // The fill: the content color at opacity w, over dot.color — read in the frame the widths are read in.
    expect(quarter.fills[0]).toBeCloseTo(0.75, 2);
    expect(quarter.fills[1]).toBeCloseTo(0.25, 2);
    expect(await css(dots(page, id).nth(0).locator('.fill'), 'background-color')).toBe(await resolveColor(page, T('indicator-content-color')));
    expect(await css(dots(page, id).nth(0), 'background-color')).toBe(await resolveColor(page, T('dot-color')));
    // Where motion is reduced the dots still follow the person's scroll (CRL-34).
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect((await dotsAt(page, id, 104)).slice(0, 2)).toEqual([16, 16]);
  });

  test('CRL-29: under loop the stretch passes from the last dot to the first', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('loop-dots', { indicator: true, loop: true })] });
    const id = 'loop-dots';
    const at = await offset(page, id);
    const s = await step(page, id);
    const widths = await dotsAt(page, id, at + 5.5 * s);
    expect([widths[5], widths[0]]).toEqual([16, 16]);
  });

  test('CRL-30: a press or a drag on the indicator moves the row to the nearest dot; the arrows, Home and End move it; focus stays; the Tab stop follows', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: only('indicator') });
    const id = 'indicator';
    const s = await step(page, id);
    const third = await bounds(dots(page, id).nth(3));
    const y = third.y + third.height / 2;
    await page.mouse.move(third.x + third.width / 2, y);
    await page.mouse.down();
    await expect.poll(() => offset(page, id)).toBe(3 * s);
    // Dragging along the dots moves to the dot nearest the press.
    const fifth = await bounds(dots(page, id).nth(5));
    await page.mouse.move(fifth.x + fifth.width / 2, y, { steps: 4 });
    await expect.poll(() => offset(page, id)).toBe(5 * s);
    await page.mouse.up();
    // Anywhere in the hit area: above the container, in the controls row.
    const box = await bounds(indicator(page, id));
    const row = await bounds(carousel(page, id).locator('.controls'));
    await page.mouse.click(box.x + 2, row.y + 2);
    await expect.poll(() => offset(page, id)).toBe(0);
    // The keys, with focus on the indicator.
    await away(page);
    await tabTo(page, indicator(page, id));
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => offset(page, id)).toBe(s);
    await page.keyboard.press('End');
    await expect.poll(() => offset(page, id)).toBe(5 * s);
    await page.keyboard.press('ArrowRight'); // no wrap without loop
    await page.waitForTimeout(400);
    expect(await offset(page, id)).toBe(5 * s);
    await page.keyboard.press('Home');
    await expect.poll(() => offset(page, id)).toBe(0);
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(400);
    expect(await offset(page, id)).toBe(0);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => offset(page, id)).toBe(2 * s);
    expect(await focused(page)).toBe('indicator');
    // The items' Tab stop is the item the move brought.
    await expect(container(page, id, 2)).toHaveAttribute('tabindex', '0');
    await tab(page, { back: true });
    expect(await focused(page)).toBe('Lake shore');
  });

  test('CRL-30, CRL-40: inside an ancestor with a CSS zoom of 2 a press or a drag on the indicator still moves the row to the dot under the pointer, and to that dot’s resting position in the row’s own pixels', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: only('indicator') });
    const id = 'indicator';
    const s = await step(page, id);
    await mountFixtures(page, spec, { icons: true, fixtures: only('indicator'), lead: '<style>.stage { zoom: 2; }</style>' });
    // Where each dot is in the window, as the pointer meets it.
    const third = await bounds(dots(page, id).nth(3));
    const y = third.y + third.height / 2;
    await page.mouse.move(third.x + third.width / 2, y);
    await page.mouse.down();
    await expect.poll(() => offset(page, id)).toBeCloseTo(3 * s, 0);
    expect(await now(page, id)).toBe(4);
    const fifth = await bounds(dots(page, id).nth(5));
    await page.mouse.move(fifth.x + fifth.width / 2, y, { steps: 4 });
    await expect.poll(() => offset(page, id)).toBeCloseTo(5 * s, 0);
    expect(await now(page, id)).toBe(6);
    await page.mouse.up();
    const first = await bounds(dots(page, id).nth(0));
    await page.mouse.click(first.x + first.width / 2, y);
    await expect.poll(() => offset(page, id)).toBe(0);
  });

  test('CRL-30: the indicator’s moves use the scroll motion, at once where motion is reduced; loop wraps', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...only('indicator'), fixture('loop-dots', { indicator: true, loop: true })] });
    const id = 'indicator';
    await tabTo(page, indicator(page, id));
    // (The step is the hero's width at rest: read before the row moves, while the first item is still the hero.)
    const s = await step(page, id);
    // Held at its start and stepped through its duration by the test (`holdMotions`).
    await holdMotions(page);
    await page.keyboard.press('ArrowRight');
    const motion = await stepMotion(page, id);
    expect(motion.duration).toBe(await resolveToken(page, T('motion-scroll-duration'), 'duration'));
    expectOver(motion.passed, 0, s);
    await expect.poll(() => offset(page, id)).toBe(s);
    await atRest(page, id);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await trace(page, id);
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => traced(page)).toEqual([2 * s]);
    // Loop: from the first dot, Left Arrow goes round to the last.
    await tabTo(page, indicator(page, 'loop-dots'));
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => indicator(page, 'loop-dots').getAttribute('aria-valuenow')).toBe('6');
  });

  test('CRL-31: the indicator is one slider named by label, 1 to D, its value the nearest resting position and its value text that item’s label', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...only('indicator'), fixture('fixed-dots', { heroAlignment: 'start', indicator: true, fluidWidth: false }, 5)] });
    const id = 'indicator';
    const slider = carousel(page, id).getByRole('slider', { name: 'Featured walks' });
    await expect(slider).toHaveCount(1);
    await expect(slider).toHaveAttribute('aria-orientation', 'horizontal');
    await expect(slider).toHaveAttribute('aria-valuemin', '1');
    await expect(slider).toHaveAttribute('aria-valuemax', '6');
    await expect(slider).toHaveAttribute('aria-valuenow', '1');
    await expect(slider).toHaveAttribute('aria-valuetext', 'Coast path');
    await boxesAt(page, id, 2 * (await step(page, id)) + 20);
    await expect(slider).toHaveAttribute('aria-valuenow', '3');
    await expect(slider).toHaveAttribute('aria-valuetext', 'Lake shore');
    // The dots are not exposed one by one.
    await expect(dots(page, id).first()).toHaveAttribute('aria-hidden', 'true');
    // Fixed widths at the start, 5 items: the last resting position (p 3.19) is the fifth; its item is the resting one there.
    const fixed = carousel(page, 'fixed-dots').getByRole('slider');
    await expect(fixed).toHaveAttribute('aria-valuemax', '5');
    await boxesAt(page, 'fixed-dots', 664);
    await expect(fixed).toHaveAttribute('aria-valuenow', '5');
  });

  test('CRL-32: every interval at rest the row advances one resting position, over the autoplay motion; from the last back to the first; no focus move, no Tab stop change', async ({ page }) => {
    await clockPage(page, only('autoplay', 'autoplay-progress'));
    const id = 'autoplay';
    const every = await interval(page);
    expect(every).toBe(5000);
    const s = await step(page, id);
    await page.clock.runFor(every - 100);
    expect(await offset(page, id), 'not yet').toBe(0);
    await page.clock.runFor(200);
    await expect.poll(() => offset(page, id)).toBe(s);
    expect(await now(page, id)).toBe(2);
    // The Tab stop stays with the item that had it; focus has not moved.
    await expect(container(page, id, 0)).toHaveAttribute('tabindex', '0');
    expect(await focused(page)).toBeNull();
    for (let i = 2; i <= 5; i++) {
      await page.clock.runFor(every + 50);
      await expect.poll(() => offset(page, id)).toBe(i * s);
    }
    // From the last resting position back across the row to the first.
    await page.clock.runFor(every + 50);
    await expect.poll(() => offset(page, id)).toBe(0);
  });

  test('CRL-32: an interval that changes while it runs times the advance again — the row moves when the new interval has passed, not the old one', async ({ page }) => {
    await clockPage(page, only('autoplay', 'autoplay-progress'));
    const every = await interval(page);
    const s = await step(page, 'autoplay');
    const set = (id: string, ms: number | null) => carousel(page, id).evaluate((el, value) => ((el as HTMLElement & { autoplayInterval: number | null }).autoplayInterval = value), ms);
    // A shorter one, a fifth of the way in: 1200 ms in all, of which 1000 have passed.
    await page.clock.runFor(1000);
    await set('autoplay', 1200);
    await page.clock.runFor(150);
    expect(await offset(page, 'autoplay'), 'not before the new interval has passed').toBe(0);
    await page.clock.runFor(100);
    await expect.poll(() => offset(page, 'autoplay'), 'when the new interval has passed, not after the old 5 s').toBe(s);
    await set('autoplay', 60_000);
    // A longer one: the old timer does not move the row early.
    await set('autoplay-progress', every * 2);
    await page.clock.runFor(every);
    expect(await offset(page, 'autoplay-progress'), 'the old interval has passed: nothing yet').toBe(0);
    await page.clock.runFor(every - 1000);
    await expect.poll(() => offset(page, 'autoplay-progress')).toBe(s);
    // An interval already overrun advances at once.
    const from = await offset(page, 'autoplay');
    await set('autoplay', 300);
    await page.clock.runFor(50);
    await expect.poll(() => offset(page, 'autoplay')).toBe(from + s);
  });

  test('CRL-32, CRL-33: a scroll end the engine reports for the carousel’s own advance, however late, does not start the time again — the row has been at rest since the advance', async ({ page }) => {
    await clockPage(page, only('autoplay'));
    const id = 'autoplay';
    const every = await interval(page);
    const s = await step(page, id);
    await page.clock.runFor(every + 50);
    await expect.poll(() => offset(page, id)).toBe(s);
    // An engine reports the end of a scroll when it next updates its rendering, which is not the page clock's time: here
    // it comes when most of the next interval has passed (WebKit did this by itself, now and then).
    await page.clock.runFor(every - 200);
    await scroller(page, id).evaluate((el) => el.dispatchEvent(new Event('scrollend')));
    await page.clock.runFor(100);
    expect(await offset(page, id), 'not yet').toBe(s);
    await page.clock.runFor(100);
    await expect.poll(() => offset(page, id), 'an interval after the advance, not after the report').toBe(2 * s);
  });

  test('CRL-32: the advance takes comp.carousel.motion.autoplay-duration with autoplay-easing', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: only('autoplay') });
    const timing = await carousel(page, 'autoplay').locator('.timing').evaluate((el) => [getComputedStyle(el).animationDuration, getComputedStyle(el).animationTimingFunction]);
    expect(Number.parseFloat(timing[0]) * 1000).toBe(await resolveToken(page, T('motion-autoplay-duration'), 'duration'));
    expect(timing[1]).toBe(await page.evaluate((e) => {
      const probe = document.createElement('div');
      probe.style.transitionTimingFunction = e;
      return probe.style.transitionTimingFunction;
    }, await token(page, T('motion-autoplay-easing'))));
  });

  test('CRL-33: hover, focus within, a press and a hidden document hold the time; it continues when the last hold ends; a person’s move starts it from zero', async ({ page }) => {
    await clockPage(page, only('autoplay'));
    const id = 'autoplay';
    const every = await interval(page);
    const s = await step(page, id);
    await page.clock.runFor(every / 2);
    // Hovered: the time holds.
    // The hero: the middle of the item beside it lies under the next control (CRL-41).
    await item(page, id, 0).hover();
    await page.clock.runFor(every * 2);
    expect(await offset(page, id)).toBe(0);
    // It continues from the time it held: half an interval to go.
    await page.mouse.move(1200, 700);
    await page.clock.runFor(every / 2 - 100);
    expect(await offset(page, id)).toBe(0);
    await page.clock.runFor(200);
    await expect.poll(() => offset(page, id)).toBe(s);
    // Focus within, however it came there (a pointer's click), holds it.
    await playback(page, id).focus();
    await page.mouse.move(1200, 700);
    await page.clock.runFor(every * 2);
    expect(await offset(page, id)).toBe(s);
    await away(page);
    // A hidden document holds it.
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.clock.runFor(every * 2);
    expect(await offset(page, id)).toBe(s);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    // The person moves the row: the time starts from zero once it is at rest.
    await page.clock.runFor(every - 1000);
    await scroller(page, id).evaluate((el, o) => (el.scrollLeft = o), 2 * s);
    await page.waitForTimeout(100); // the scroll event comes with the next rendered frame, which the page clock does not hold
    await page.clock.runFor(200); // the scroll ends (scrollend, or the idle fallback's timer)
    await page.clock.runFor(every - 400);
    expect(await offset(page, id)).toBe(2 * s);
    await page.clock.runFor(400);
    await expect.poll(() => offset(page, id)).toBe(3 * s);
  });

  test('CRL-33: pressing play lifts the hover and focus holds in effect until the pointer and focus leave and come back', async ({ page }) => {
    await clockPage(page, only('autoplay-paused'));
    const id = 'autoplay-paused';
    const every = await interval(page);
    const s = await step(page, id);
    await playback(page, id).click(); // hovered and (in most engines) focused: both lifted
    await expect(carousel(page, id)).not.toHaveAttribute('paused');
    await page.clock.runFor(every + 50);
    await expect.poll(() => offset(page, id)).toBe(s);
    // Out and back in: the hover hold applies again.
    await page.mouse.move(1200, 700);
    await away(page);
    // The hero, now the second item: the middle of an item beside it lies under a previous or next control (CRL-41).
    await item(page, id, 1).hover();
    await page.clock.runFor(every * 2);
    expect(await offset(page, id)).toBe(s);
  });

  test('CRL-34: where motion is reduced autoplay does not advance and neither the control nor the progress is drawn; it starts from zero when motion is no longer reduced', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await clockPage(page, only('autoplay-progress'));
    const id = 'autoplay-progress';
    const every = await interval(page);
    const s = await step(page, id);
    await expect(playback(page, id)).toHaveCount(0);
    await expect(indicator(page, id)).not.toHaveClass(/progress/);
    await page.clock.runFor(every * 3);
    expect(await offset(page, id)).toBe(0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(playback(page, id)).toHaveCount(1);
    await page.clock.runFor(every - 100);
    expect(await offset(page, id), 'from zero').toBe(0);
    await page.clock.runFor(200);
    await expect.poll(() => offset(page, id)).toBe(s);
  });

  test('CRL-35: the playback control — pause while playing, play_arrow while paused, named by pauseLabel and playLabel, no pressed state; it toggles paused, fires pausedchange and keeps focus', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: only('autoplay', 'autoplay-paused') });
    const id = 'autoplay';
    const control = playback(page, id);
    await expect(control).toHaveText('pause');
    await expect(control).toHaveAttribute('aria-label', 'Pause the slideshow');
    expect(await control.getAttribute('aria-pressed')).toBeNull();
    expect(await control.evaluate((el) => el.localName)).toBe('button');
    await expect(playback(page, 'autoplay-paused')).toHaveText('play_arrow');
    await expect(playback(page, 'autoplay-paused')).toHaveAttribute('aria-label', 'Play the slideshow');
    // Its look: controls.button-size, controls.shape, the playback colors and the glyph at controls.icon.size, unselected.
    const [button, icon] = [await resolveToken(page, T('controls-button-size')), await resolveToken(page, T('controls-icon-size'))];
    expect(await bounds(control)).toMatchObject({ width: button, height: button });
    expect(Number.parseFloat(await css(control.locator('.icon'), 'font-size'))).toBe(icon);
    expect(await css(control, 'background-color')).toBe(await resolveColor(page, T('playback-container-color')));
    expect(await css(control, 'color')).toBe(await resolveColor(page, T('playback-content-color')));
    await carousel(page, id).evaluate((host) => {
      const log: boolean[] = ((window as any).paused = []);
      host.addEventListener('pausedchange', (e) => log.push((e as CustomEvent<{ paused: boolean }>).detail.paused));
    });
    await tabTo(page, control);
    await page.keyboard.press('Enter');
    await expect(control).toHaveText('play_arrow');
    await expect(control).toHaveAttribute('aria-label', 'Play the slideshow');
    await expect(carousel(page, id)).toHaveAttribute('paused', '');
    expect(await focused(page)).toBe('playback');
    await page.keyboard.press('Space');
    await expect(control).toHaveText('pause');
    expect(await page.evaluate(() => (window as any).paused)).toEqual([true, false]);
    // The product sets paused: nothing is fired.
    await carousel(page, id).evaluate((el) => ((el as HTMLElement & { paused: boolean }).paused = true));
    await expect(control).toHaveText('play_arrow');
    expect(await page.evaluate(() => (window as any).paused)).toEqual([true, false]);
    // playbackControl false hides it.
    await carousel(page, id).evaluate((el) => el.setAttribute('no-playback-control', ''));
    await expect(playback(page, id)).toHaveCount(0);
  });

  test('CRL-36: with autoplayProgress the dot the row rests at fills from its start across the part of the interval passed; it stops while held; none while paused', async ({ page }) => {
    await clockPage(page, only('autoplay-progress', 'autoplay-paused'));
    const id = 'autoplay-progress';
    const every = await interval(page);
    const fill = dots(page, id).nth(0).locator('.fill');
    const part = async () => (await bounds(fill)).width / (await bounds(dots(page, id).nth(0))).width;
    await expect(indicator(page, id)).toHaveClass(/progress/);
    // At the start: nothing but the moment the page's clock ran before the test held the fill (the clock is installed, not paused).
    // (The page's own time is read with it: installed, the clock still runs between the test's steps, and the carousel counts that too.)
    const [began, at] = await carousel(page, id).evaluate((el) => [Number(el.shadowRoot!.querySelector('.dot .fill')!.getAnimations()[0]!.currentTime), performance.now()] as const);
    expect(began / every).toBeLessThan(0.1);
    expect(await part()).toBeCloseTo(began / every, 2);
    // Only the current dot: the others show no fill.
    expect(Number(await css(dots(page, id).nth(1).locator('.fill'), 'opacity'))).toBe(0);
    // What draws it: one animation of the interval's length on that fill, at an even pace, running — and no other fill has one.
    const drawn = () =>
      carousel(page, id).evaluate((el) =>
        [...el.shadowRoot!.querySelectorAll('.dot')].map((dot) =>
          dot.querySelector('.fill')!.getAnimations().map((animation) => ({ ...animation.effect!.getTiming(), state: animation.playState, at: animation.currentTime })),
        ),
      );
    const [first, ...others] = await drawn();
    expect(first).toMatchObject([{ duration: every, easing: 'linear', iterations: 1, state: 'running' }]);
    expect(others.flat()).toEqual([]);
    await tick(page, every / 4 - began);
    await expect.poll(part).toBeCloseTo(0.25, 2);
    // From its start edge.
    expect((await bounds(fill)).x).toBeCloseTo((await bounds(dots(page, id).nth(0))).x, 0);
    await tick(page, every / 4);
    await expect.poll(part).toBeCloseTo(0.5, 2);
    // Held: it stops, where the carousel's clock had got to (a quarter more passes on the page clock alone first).
    await page.clock.runFor(every / 4);
    await carousel(page, id).evaluate((el) => el.addEventListener('pointerenter', () => ((window as unknown as { __heldAt: number }).__heldAt = performance.now()), { once: true }));
    // The hero: the middle of the item beside it lies under the next control (CRL-41).
    await item(page, id, 0).hover();
    const held = await part();
    const counted = began + (await page.evaluate(() => (window as unknown as { __heldAt: number }).__heldAt)) - at;
    expect(counted / every).toBeGreaterThan(0.74);
    // No less than that, and no more than the moment the clock had already run when the fill's time was first read.
    expect(held).toBeGreaterThan(counted / every - 0.005);
    expect(held).toBeLessThan(counted / every + 0.05);
    expect((await drawn())[0]![0]!.state).toBe('paused');
    await tick(page, every);
    expect(await part()).toBeCloseTo(held, 2);
    // Paused: the current dot is wholly in the active color (CRL-29), no progress.
    await expect(indicator(page, 'autoplay-paused')).not.toHaveClass(/progress/);
    expect(Number(await css(dots(page, 'autoplay-paused').nth(0).locator('.fill'), 'opacity'))).toBe(1);
    expect((await bounds(dots(page, 'autoplay-paused').nth(0).locator('.fill'))).width).toBe((await bounds(dots(page, 'autoplay-paused').nth(0))).width);
  });

  test('CRL-36: the browser draws the fill as the interval passes, in its own time; the page moves on when it is full', async ({ page }) => {
    // No clock held: the interval is a short one of the test's, and the fill is measured as the browser draws it.
    const every = 1200;
    await mountFixtures(page, spec, { icons: true, reducedMotion: false, fixtures: only('autoplay-progress') });
    await page.mouse.move(1200, 700);
    const id = 'autoplay-progress';
    const read = () =>
      carousel(page, id).evaluate((el) => {
        const dot = [...el.shadowRoot!.querySelectorAll('.dot')].find((each) => each.classList.contains('timed'));
        const animation = dot?.querySelector('.fill')!.getAnimations()[0];
        if (!dot || !animation) return null;
        return {
          part: dot.querySelector('.fill')!.getBoundingClientRect().width / dot.getBoundingClientRect().width,
          time: Number(animation.currentTime),
          duration: Number(animation.effect!.getTiming().duration),
          rate: animation.playbackRate,
          state: animation.playState,
        };
      });
    await carousel(page, id).evaluate((el, ms) => el.setAttribute('autoplay-interval', String(ms)), every);
    await expect.poll(async () => (await read())?.duration).toBe(every);
    // Running at the browser's pace: what is drawn is the part of the interval the animation has reached, and it grows.
    const samples: NonNullable<Awaited<ReturnType<typeof read>>>[] = [];
    await expect
      .poll(
        async () => {
          const sample = await read();
          if (sample && sample.state === 'running' && sample.time > 0) samples.push(sample);
          return samples.length;
        },
        { intervals: [100] },
      )
      .toBeGreaterThanOrEqual(4);
    for (const sample of samples) {
      expect(sample.rate).toBe(1);
      expect(sample.part).toBeGreaterThan(sample.time / every - 0.1);
      expect(sample.part).toBeLessThan(sample.time / every + 0.1);
    }
    const times = samples.map((sample) => sample.time);
    expect(times.some((time, index) => index > 0 && time > times[index - 1]!)).toBe(true);
    // The interval passed: the row moves on.
    await expect.poll(() => now(page, id), { timeout: every * 4 }).toBeGreaterThan(1);
  });

  test('CRL-37: the playback control’s hit area is the target, centred; the indicator’s is the controls row’s height and at least sys.target.touch wide', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: only('autoplay') });
    const [pointer, touch, controls] = [await resolveToken(page, '--tanrei-sys-target-pointer'), await resolveToken(page, '--tanrei-sys-target-touch'), await resolveToken(page, T('controls-height'))];
    const hit = (locator: Locator) => locator.evaluate((el) => [Number.parseFloat(getComputedStyle(el, '::before').width), Number.parseFloat(getComputedStyle(el, '::before').height)]);
    const button = await resolveToken(page, T('controls-button-size'));
    expect(await hit(playback(page, 'autoplay'))).toEqual([Math.max(button, pointer), Math.max(button, pointer)]);
    const [w, h] = await hit(indicator(page, 'autoplay'));
    expect(h).toBe(controls);
    expect(w).toBe((await bounds(indicator(page, 'autoplay'))).width);
    // A system whose dots make a container narrower than the touch target still gives it a touch-wide hit area.
    await override(page, { [T('dot-size')]: '2px', [T('dot-active-width')]: '2px', [T('dot-gap')]: '2px', [T('controls-indicator-padding-inline')]: '0px' });
    expect((await bounds(indicator(page, 'autoplay'))).width).toBeLessThan(touch);
    expect((await hit(indicator(page, 'autoplay')))[0]).toBe(touch);
  });

  test('CRL-38: until the icon set can draw the glyph, the playback control keeps its box and shows nothing', async ({ page }) => {
    // With the faces loaded, the glyph is drawn.
    await mountFixtures(page, spec, { icons: true, fixtures: only('playback-control') });
    await expect(playback(page, 'playback-control').locator('.icon')).toHaveCSS('visibility', 'visible');
    // An icon face that never arrives: its request is never answered. (Last in the test: a document with a request that
    // never ends cannot be written over — `setContent` would wait for its load for ever.)
    await page.route('**/never.woff2', () => {});
    await mountFixtures(page, spec, { icons: true, fixtures: [] });
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = "@font-face { font-family: 'Never'; src: url('https://fonts.invalid/never.woff2') format('woff2'); font-display: block; } .never { --tanrei-sys-icon-family-unselected: 'Never'; }";
      document.head.append(style);
      const stage = document.createElement('div');
      stage.className = 'stage never';
      stage.dataset.fixture = 'never';
      stage.innerHTML = '<tanrei-carousel label="Featured walks" autoplay play-label="Play the slideshow" pause-label="Pause the slideshow"><tanrei-carousel-item label="Coast path">landscape</tanrei-carousel-item><tanrei-carousel-item label="Old forest">forest</tanrei-carousel-item></tanrei-carousel>';
      document.querySelector('main')!.append(stage);
    });
    const control = playback(page, 'never');
    const icon = control.locator('.icon');
    const size = await resolveToken(page, T('controls-icon-size'));
    await expect(control).toHaveCount(1);
    expect(await bounds(icon)).toMatchObject({ width: size, height: size });
    await expect(icon).toHaveCSS('visibility', 'hidden');
    // The accessible name is there all the same.
    await expect(control).toHaveAttribute('aria-label', 'Pause the slideshow');
  });

  // ── The previous and next controls (CRL-41 – CRL-43) ──

  test('CRL-41: a previous control over the row’s inline start and a next one over its end, centred on the row — icon-only medium Buttons in the token’s variant, with the chevrons and their names', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...only('navigation'), fixture('one', { navigation: 'always' }, 1), fixture('none', { navigation: 'none' })] });
    const id = 'navigation';
    const host = await bounds(carousel(page, id));
    const row = await bounds(scroller(page, id));
    const padding = await resolveToken(page, T('layout-padding-inline'));
    const previous = await bounds(navButton(page, id, 'previous'));
    const next = await bounds(navButton(page, id, 'next'));
    expect(round(previous.x - host.x)).toBe(padding);
    expect(round(host.x + host.width - (next.x + next.width))).toBe(padding);
    for (const box of [previous, next]) {
      expect(box.width).toBe(box.height);
      expect(round(box.y + box.height / 2 - row.y)).toBe(row.height / 2);
    }
    // Over the items: the control is what a press at its middle reaches.
    expect(
      await page.evaluate(([x, y]) => {
        let at: Element | null = document.elementFromPoint(x, y);
        while (at?.shadowRoot) {
          const inner = at.shadowRoot.elementFromPoint(x, y);
          if (!inner || inner === at) break;
          at = inner;
        }
        return at?.closest('tanrei-button') ? 'tanrei-button' : ((at?.getRootNode() as ShadowRoot).host?.localName ?? null);
      }, [next.x + next.width / 2, next.y + next.height / 2]),
    ).toBe('tanrei-button');
    // The glyphs, the names and the variant the token names (elevated by default), through the Button's own channel.
    await expect(nav(page, id, 'previous').locator('[slot="icon"]')).toHaveText('chevron_left');
    await expect(nav(page, id, 'next').locator('[slot="icon"]')).toHaveText('chevron_right');
    await expect(navButton(page, id, 'previous')).toHaveAttribute('aria-label', 'Previous walk');
    await expect(navButton(page, id, 'next')).toHaveAttribute('aria-label', 'Next walk');
    expect(await nav(page, id, 'next').getAttribute('size')).toBe('medium');
    expect(await css(navButton(page, id, 'next'), 'background-color')).toBe(await resolveColor(page, '--tanrei-comp-button-elevated-container-color'));
    await override(page, { [T('navigation-button-variant')]: 'outlined' });
    await expect.poll(() => css(navButton(page, id, 'next'), 'background-color')).toBe(await resolveColor(page, '--tanrei-comp-button-outlined-container-color'));
    // Outside the list, and not among its items.
    expect(await carousel(page, id).locator('[role="list"] tanrei-button').count()).toBe(0);
    // Fewer than two resting positions, or none asked for: neither is drawn.
    await expect(carousel(page, 'one').locator('tanrei-button')).toHaveCount(0);
    await expect(carousel(page, 'none').locator('tanrei-button')).toHaveCount(0);
  });

  test('CRL-41: auto draws nothing for a coarse pointer that cannot hover; always draws them there too', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium can emulate a coarse pointer (touch emulation over CDP)');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    expect(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)).toBe(false);
    await mountFixtures(page, spec, { icons: true, fixtures: only('centered', 'navigation') });
    await expect(nav(page, 'centered', 'next')).toBeHidden();
    await expect(nav(page, 'navigation', 'next')).toBeVisible();
    // Nothing of auto takes focus: back from the items, Tab leaves the carousel.
    await tabTo(page, container(page, 'centered', 0));
    await tab(page, { back: true });
    expect(await focused(page)).toBeNull();
  });

  test('CRL-42: auto shows the controls while the carousel is hovered or holds focus, fading over motion.state-duration; hidden, they keep their Tab stops and their names; always shows them', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: only('centered', 'navigation') });
    const id = 'centered';
    const opacity = (control: 'previous' | 'next', at = id) => css(nav(page, at, control), 'opacity').then(Number);
    await page.mouse.move(1200, 700);
    expect(await opacity('previous')).toBe(0);
    expect(await opacity('next')).toBe(0);
    await expect(navButton(page, id, 'next')).toHaveAttribute('aria-label', 'Next walk');
    expect(await opacity('next', 'navigation')).toBe(1);
    // The fade: the state motion.
    const duration = await resolveToken(page, T('motion-state-duration'), 'duration');
    expect(Number.parseFloat(await css(nav(page, id, 'next'), 'transition-duration')) * 1000).toBe(duration);
    expect(await css(nav(page, id, 'next'), 'transition-property')).toBe('opacity');
    // Hovered: shown.
    await item(page, id, 0).hover();
    await expect.poll(() => opacity('next')).toBe(1);
    await page.mouse.move(1200, 700);
    await expect.poll(() => opacity('next')).toBe(0);
    // Focus within: shown, from the first of them on (the Tab sequence reaches them though they were hidden).
    await tabTo(page, navButton(page, id, 'previous'));
    expect(await focused(page)).toBe('previous');
    await expect.poll(() => opacity('previous')).toBe(1);
    await tab(page);
    expect(await focused(page)).toBe('next');
    await tab(page);
    expect(await focused(page)).toBe('Coast path');
    await expect.poll(() => opacity('next')).toBe(1);
    await away(page);
    await page.mouse.move(1200, 700);
    await expect.poll(() => opacity('next')).toBe(0);
    // At once where motion is reduced.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(nav(page, id, 'next'), 'transition-duration')).toBe('0s');
  });

  test('CRL-43: a press moves the row one resting position over the scroll motion; presses add up; disabled at the ends, keeping focus; the Tab stop follows', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: only('navigation') });
    const id = 'navigation';
    const s = await step(page, id);
    // At the first position previous is disabled (but reachable), next is not.
    await expect(navButton(page, id, 'previous')).toHaveAttribute('aria-disabled', 'true');
    expect(await navButton(page, id, 'next').getAttribute('aria-disabled')).toBeNull();
    await nav(page, id, 'previous').click();
    await page.waitForTimeout(300);
    expect(await offset(page, id)).toBe(0);
    // Over the scroll motion: held at its start and stepped through its duration by the test (`holdMotions`).
    await holdMotions(page);
    await nav(page, id, 'next').click();
    const motion = await stepMotion(page, id);
    expect(motion.duration).toBe(await resolveToken(page, T('motion-scroll-duration'), 'duration'));
    expectOver(motion.passed, 0, s);
    await expect.poll(() => offset(page, id)).toBe(s);
    await expect(navButton(page, id, 'previous')).not.toHaveAttribute('aria-disabled', 'true');
    // Two presses while the row moves go two positions on: the second counts from where the first is going.
    await nav(page, id, 'next').evaluate((el) => {
      (el as HTMLElement).click();
      (el as HTMLElement).click();
    });
    await expect.poll(() => offset(page, id)).toBe(3 * s);
    // The keyboard: Enter on next up to the end; focus stays on it, disabled, and the items' Tab stop is the last item.
    await tabTo(page, navButton(page, id, 'next'));
    await page.keyboard.press('Enter');
    await expect.poll(() => offset(page, id)).toBe(4 * s);
    await expect(navButton(page, id, 'next')).toHaveAttribute('aria-disabled', 'true');
    expect(await focused(page)).toBe('next');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    expect(await offset(page, id)).toBe(4 * s);
    expect(await focused(page)).toBe('next');
    await expect(container(page, id, 4)).toHaveAttribute('tabindex', '0');
    await tab(page);
    expect(await focused(page)).toBe('Dunes');
    // Back with previous, by Space.
    await tab(page, { back: true });
    await tab(page, { back: true });
    expect(await focused(page)).toBe('previous');
    await page.keyboard.press('Space');
    await expect.poll(() => offset(page, id)).toBe(3 * s);
    await expect(container(page, id, 3)).toHaveAttribute('tabindex', '0');
  });

  test('CRL-43: between two resting positions a press goes to the nearer one on its side; under loop the ends go round; at once where motion is reduced', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('free', { navigation: 'always', fluidWidth: false, snap: false }, 5), fixture('round', { navigation: 'always', loop: true }, 5)] });
    const s = await step(page, 'free');
    await boxesAt(page, 'free', 1.5 * s);
    await nav(page, 'free', 'next').click();
    await expect.poll(() => offset(page, 'free')).toBe(2 * s);
    await boxesAt(page, 'free', 1.5 * s);
    await nav(page, 'free', 'previous').click();
    await expect.poll(() => offset(page, 'free')).toBe(s);
    // Loop: neither is ever disabled; previous from the first item brings the last to slot 0.
    await expect(navButton(page, 'round', 'previous')).not.toHaveAttribute('aria-disabled', 'true');
    await nav(page, 'round', 'previous').click();
    await expect(container(page, 'round', 4)).toHaveAttribute('tabindex', '0');
    await atRest(page, 'round');
    await nav(page, 'round', 'next').click();
    await expect(container(page, 'round', 0)).toHaveAttribute('tabindex', '0');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await trace(page, 'free');
    await nav(page, 'free', 'next').click();
    await expect.poll(() => traced(page)).toEqual([2 * s]);
  });

  test('CRL-17, CRL-33, CRL-43: the Tab stops in order — playback, previous, next, the items, the indicator — and a press of next is the person’s move: autoplay’s time starts from zero once the row is at rest', async ({ page }) => {
    await clockPage(page, [fixture('tabs', { navigation: 'always', autoplay: true, indicator: true, playLabel: 'Play the slideshow', pauseLabel: 'Pause the slideshow' })]);
    const id = 'tabs';
    const every = await interval(page);
    const s = await step(page, id);
    // The time has run most of an interval; a press of next (no hover, no focus left behind) moves the row…
    await page.clock.runFor(every - 1000);
    await nav(page, id, 'next').evaluate((el) => (el as HTMLElement).click());
    await page.clock.runFor(100);
    await expect.poll(() => offset(page, id)).toBe(s);
    // …and the interval starts again from zero: no advance where the old one would have ended.
    await page.clock.runFor(every - 400);
    expect(await offset(page, id)).toBe(s);
    await page.clock.runFor(500);
    await expect.poll(() => offset(page, id)).toBe(2 * s);
    // The order of the stops.
    await tabTo(page, playback(page, id));
    const order = [await focused(page)];
    for (let i = 0; i < 4; i++) {
      await tab(page);
      order.push(await focused(page));
    }
    // The items' stop is the item the press brought: the advance after it moved neither focus nor the stop (CRL-32).
    expect(order).toEqual(['playback', 'previous', 'next', 'Old forest', 'indicator']);
  });

  test('CRL-23, CRL-41: right-to-left puts the previous control at the right and the next at the left; the Button marks the chevrons for mirroring as the icon set says', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: only('navigation') });
    await page.evaluate(() => (document.documentElement.dir = 'rtl'));
    const id = 'navigation';
    const host = await bounds(carousel(page, id));
    const padding = await resolveToken(page, T('layout-padding-inline'));
    await expect.poll(async () => {
      const previous = await bounds(navButton(page, id, 'previous'));
      return round(host.x + host.width - (previous.x + previous.width));
    }).toBe(padding);
    expect(round((await bounds(navButton(page, id, 'next'))).x - host.x)).toBe(padding);
    await expect(nav(page, id, 'previous').locator('[slot="icon"]')).toHaveAttribute('data-tanrei-mirrored', '');
    // Next still moves on, and its item becomes the Tab stop.
    const s = await step(page, id);
    await nav(page, id, 'next').click();
    await expect.poll(() => offset(page, id)).toBe(s);
    await expect(container(page, id, 1)).toHaveAttribute('tabindex', '0');
  });

  test('CRL-20, CRL-24: controls without their names are reported; an unknown navigation is drawn as auto and reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, fixtures: [{ ...fixture('nameless', {}), props: { label: 'Walks near you', navigation: 'sideways' } }] });
    await expect.poll(() => seen.filter((w) => w.includes('CRL-24') && w.includes('navigation "sideways"')).length).toBe(1);
    await expect.poll(() => seen.filter((w) => w.includes('CRL-20') && /previous|next/.test(w)).length).toBe(2);
    await expect(nav(page, 'nameless', 'next')).toHaveClass(/\bauto\b/);
    expect(await navButton(page, 'nameless', 'next').getAttribute('aria-label')).toBeNull();
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
  // The harness conditions of the spec's web note: the pointer outside, motion not reduced, and the autoplay clock
  // stopped at the start of its interval (the page clock never advances).
  test.beforeEach(async ({ page }) => {
    await holdClock(page);
    // …and the fill's animation with it, which the page clock does not hold (CRL-36).
    await holdFills(page);
    await mountFixtures(page, spec, { icons: true, reducedMotion: false, beforePaint: true });
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(page.locator(`[data-fixture="${f.id}"]`)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
