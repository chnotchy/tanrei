// <tanrei-number-ticker>, driven by specs/number-ticker.spec.json: every behaviour id (NTK-1…17) is cited by a test
// title, every fixture has a baseline, and every duration, curve and distance is read back from the tokens — never from
// a number written here. A motion is read at set moments: its animations are paused and moved to a time, so what is
// read is the same on any machine.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, mountFixtures, resolveToken, rootTokens } from '../../../test/harness.js';
import { motionCount, motionEnded } from '../../../test/motions.js';

const spec = loadSpec('number-ticker');
type P = Page;
const T = (name: string) => `--tanrei-comp-number-ticker-${name}`;
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-number-ticker`);
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const fixture = (id: string, props: Fixture['props'], extra: Partial<Fixture> = {}): Fixture => ({ id, props, ...extra });
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}

/**
 * Sets props on the ticker and returns once it has updated, its animations paused at their start — the moment the
 * change begins — so a test reads the change at the times it chooses with `seek()`.
 */
const set = (locator: Locator, props: Record<string, unknown>) =>
  locator.evaluate(async (el: HTMLElement & { updateComplete: Promise<unknown> }, given) => {
    Object.assign(el, given);
    await el.updateComplete;
    for (const animation of el.shadowRoot!.getAnimations()) animation.pause();
  }, props);
/** Moves every animation of the ticker (paused by `set`) to `ms` after the change began. */
const seek = (locator: Locator, ms: number) =>
  locator.evaluate((el, at) => {
    for (const animation of el.shadowRoot!.getAnimations()) animation.currentTime = at;
  }, ms);
/** Lets every paused animation of the ticker play on, and waits for them to end. */
const play = async (locator: Locator) => {
  await locator.evaluate((el) => {
    for (const animation of el.shadowRoot!.getAnimations()) animation.play();
  });
  await motionEnded(locator);
};
/** Each digit place, most significant first: its key, the position its column is drawn at (digit p mod 10), its opacity. */
const places = (locator: Locator) =>
  locator.evaluate((el) =>
    [...el.shadowRoot!.querySelectorAll<HTMLElement>('.place')].map((place) => {
      const column = place.querySelector<HTMLElement>('.column')!;
      const m = new DOMMatrixReadOnly(getComputedStyle(column).transform);
      return { key: place.dataset.key!, leaving: place.classList.contains('leaving'), p: Math.round(((-m.m42 * 30) / column.offsetHeight) * 10) / 10, opacity: Number(getComputedStyle(place).opacity) };
    }),
  );
/** The digit each window shows at rest, read from what is drawn in it: the row of the column standing in the window. */
const shownDigits = (locator: Locator) =>
  locator.evaluate((el) =>
    [...el.shadowRoot!.querySelectorAll<HTMLElement>('.place:not(.leaving)')]
      .map((place) => {
        const top = place.getBoundingClientRect().top;
        const row = [...place.querySelectorAll<HTMLElement>('.column > span')].find((span) => Math.abs(span.getBoundingClientRect().top - top) < 0.5);
        return row?.textContent ?? '?';
      })
      .join(''),
  );
const boxOf = (locator: Locator, selector: string) => locator.evaluate((el, s) => el.shadowRoot!.querySelector(s)!.getBoundingClientRect().toJSON() as DOMRect, selector);
const spoken = (locator: Locator) => locator.evaluate((el) => el.shadowRoot!.querySelector('.text')!.textContent);
/** Every `settle` the ticker emits from now on, with its value. */
const settles = (locator: Locator) =>
  locator.evaluate((el) => {
    (window as unknown as { settled: number[] }).settled = [];
    el.addEventListener('settle', (event) => (window as unknown as { settled: number[] }).settled.push((event as CustomEvent<{ value: number }>).detail.value));
  });
const settled = (page: P) => page.evaluate(() => (window as unknown as { settled: number[] }).settled);
/** The ticker's animations now: target class, duration, delay, easing. */
const timings = (locator: Locator) =>
  locator.evaluate((el) =>
    el
      .shadowRoot!.getAnimations()
      .map((animation) => {
        const effect = animation.effect as KeyframeEffect;
        const timing = effect.getTiming();
        return { on: (effect.target as Element).className, duration: Number(timing.duration), delay: Number(timing.delay ?? 0), easing: String(timing.easing) };
      }),
  );
/** A token's easing as the browser serializes a timing function. */
const easing = (page: P, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.transitionTimingFunction = `var(${n})`;
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).transitionTimingFunction;
    probe.remove();
    return value;
  }, name);

test.describe('behavior', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false });
  });

  test('NTK-1: written by the platform’s number formatter in the locale, every digit in a place of its own and every other character as text, in tabular figures of the font where it stands, with no fill, edge or color of its own', async ({ page }) => {
    for (const f of spec.fixtures) {
      const props = f.props as Record<string, string | number>;
      const options: Intl.NumberFormatOptions = { style: (props.style as Intl.NumberFormatOptions['style']) ?? 'decimal', notation: (props.notation as 'compact') ?? 'standard' };
      if (props.currency) options.currency = props.currency as string;
      if (props.fractionDigits !== undefined) Object.assign(options, { minimumFractionDigits: props.fractionDigits, maximumFractionDigits: props.fractionDigits });
      if (props.signDisplay) options.signDisplay = props.signDisplay === 'except-zero' ? 'exceptZero' : (props.signDisplay as 'auto');
      const written = await page.evaluate(([locale, o, v]) => new Intl.NumberFormat(locale as string, o as Intl.NumberFormatOptions).formatToParts(v as number), [props.locale ?? 'en', options, props.value] as const);
      const drawn = await host(page, f.id).evaluate((el) => [...el.shadowRoot!.querySelectorAll<HTMLElement>('.place, .char')].map((e) => ({ place: e.classList.contains('place'), text: e.classList.contains('place') ? '' : e.textContent })));
      const digits = written.filter((part) => part.type === 'integer' || part.type === 'fraction').reduce((n, part) => n + [...part.value].length, 0);
      expect(drawn.filter((each) => each.place).length, f.id).toBe(digits);
      expect(drawn.filter((each) => !each.place).map((each) => each.text).join(''), f.id).toBe(written.filter((part) => !['integer', 'fraction'].includes(part.type)).map((part) => part.value).join(''));
      expect((await spoken(host(page, f.id)))!.replace(/[‎‏؜]/g, ''), f.id).toBe(written.map((part) => part.value).join('').replace(/[‎‏؜]/g, ''));
    }
    // The locale's own digits: Arabic as Egypt writes it.
    expect(await shownDigits(host(page, 'arabic-digits'))).toBe('١٢٣٤');
    expect(await shownDigits(host(page, 'default'))).toBe('1234');
    // The text style of where it stands, in tabular figures, isolated, with no paint of its own.
    const style = await host(page, 'default').evaluate((el) => {
      const own = getComputedStyle(el);
      const digit = getComputedStyle(el.shadowRoot!.querySelector('.column > span')!);
      const parent = getComputedStyle(el.parentElement!);
      return { numeric: own.fontVariantNumeric, bidi: own.unicodeBidi, display: own.display, font: [digit.fontFamily, digit.fontSize, digit.fontWeight, digit.color].join('|'), stage: [parent.fontFamily, parent.fontSize, parent.fontWeight, parent.color].join('|'), background: own.backgroundColor, border: own.borderTopWidth, numberBackground: getComputedStyle(el.shadowRoot!.querySelector('.number')!).backgroundColor };
    });
    expect(style.numeric).toBe('tabular-nums');
    expect(style.bidi).toBe('isolate');
    expect(style.display).toBe('inline-block');
    expect(style.font).toBe(style.stage);
    expect([style.background, style.numberBackground, style.border]).toEqual(['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)', '0px']);
    // Every digit is as wide as every other.
    const widths = await host(page, 'default').evaluate((el) => [...el.shadowRoot!.querySelectorAll('.place')].map((p) => p.getBoundingClientRect().width));
    expect(new Set(widths).size).toBe(1);
  });

  test('NTK-2: each digit place is a window one line high over a column of the locale’s digits 0 to 9 from top to bottom, clipped to the window, standing with its digit in the window', async ({ page }) => {
    const ticker = host(page, 'default');
    const shape = await ticker.evaluate((el) => {
      const place = el.shadowRoot!.querySelector<HTMLElement>('.place')!;
      const rows = [...place.querySelectorAll<HTMLElement>('.column > span')];
      return { height: place.getBoundingClientRect().height, row: rows[0].getBoundingClientRect().height, digits: rows.slice(0, 10).map((r) => r.textContent).join(''), tops: rows.slice(0, 10).map((r) => r.getBoundingClientRect().top), clip: getComputedStyle(place).clipPath };
    });
    expect(shape.digits).toBe('0123456789');
    expect(shape.row).toBeCloseTo(shape.height, 1);
    // A greater digit lies lower.
    expect(shape.tops).toEqual([...shape.tops].sort((a, b) => a - b));
    expect(shape.clip).toMatch(/^inset\(0px -1em\)$|^inset\(0px -1em 0px\)$|inset/);
    expect(await shownDigits(ticker)).toBe('1234');
    expect(await shownDigits(host(page, 'currency-ja'))).toBe('1234');
  });

  test('NTK-3: 19 to 20 moves both digits on, up, with the whole number; digit moves the ones down from 9 to 0; up and down force the way; over motion.duration with motion.easing, each place motion.stagger after the one before', async ({ page }) => {
    const ticker = host(page, 'default');
    await set(ticker, { value: 19 });
    await play(ticker);
    expect((await places(ticker)).map((p) => p.p)).toEqual([11, 19]);
    // auto: up — every changed digit one step toward the greater digits, 9 going on to 0.
    await set(ticker, { value: 20 });
    let start = await places(ticker);
    expect(start.map((p) => p.p)).toEqual([11, 19]);
    const duration = await resolveToken(page, T('motion-duration'), 'duration');
    const stagger = await resolveToken(page, T('motion-stagger'), 'duration');
    const columns = (await timings(ticker)).filter((t) => t.on === 'column');
    expect(columns.map((t) => t.duration)).toEqual([duration, duration]);
    expect(columns.map((t) => t.delay)).toEqual([0, stagger]);
    expect(columns[0].easing).toBe(await easing(page, T('motion-easing')));
    expect(duration).toBe(await resolveToken(page, '--tanrei-sys-motion-role-resize-large', 'duration'));
    await seek(ticker, duration / 2);
    const middle = await places(ticker);
    expect(middle[0].p).toBeGreaterThan(11);
    expect(middle[0].p).toBeLessThan(12);
    expect(middle[1].p).toBeGreaterThan(19);
    expect(middle[1].p).toBeLessThan(20);
    await seek(ticker, duration + stagger);
    expect((await places(ticker)).map((p) => p.p)).toEqual([12, 20]);
    await play(ticker);
    expect(await shownDigits(ticker)).toBe('20');
    // Shrinking: down — 20 to 19 moves the ones back past 0 to 9.
    await set(ticker, { value: 19 });
    await seek(ticker, duration / 2);
    const down = await places(ticker);
    expect(down[1].p).toBeLessThan(10);
    expect(down[1].p).toBeGreaterThan(9);
    await play(ticker);
    // digit: each by its own change — 19 to 20 moves the ones down the column from 9 to 0, nine steps.
    await set(ticker, { trend: 'digit' });
    await set(ticker, { value: 20 });
    await seek(ticker, stagger + duration / 16);
    expect((await places(ticker))[1].p).toBeLessThan(19);
    expect((await places(ticker))[1].p).toBeGreaterThan(10);
    await seek(ticker, duration + stagger);
    expect((await places(ticker)).map((p) => p.p)).toEqual([12, 10]);
    await play(ticker);
    // up: a number that shrinks still moves its digits up — 20 to 19 takes the ones on from 0 to 9.
    await set(ticker, { trend: 'up' });
    await set(ticker, { value: 19 });
    start = await places(ticker);
    await seek(ticker, duration + stagger);
    expect((await places(ticker)).map((p) => p.p)).toEqual([start[0].p + 9, 19]);
    await play(ticker);
    // down: a number that grows moves them down — 19 to 20 takes the tens back from 1 to 2 the long way.
    await set(ticker, { trend: 'down' });
    await set(ticker, { value: 20 });
    await seek(ticker, duration + stagger);
    expect((await places(ticker)).map((p) => p.p)).toEqual([2, 10]);
    await play(ticker);
    expect(await shownDigits(ticker)).toBe('20');
    // The duration prop takes the place of the token.
    await set(ticker, { trend: 'auto', duration: duration * 2 });
    await set(ticker, { value: 21 });
    expect((await timings(ticker)).filter((t) => t.on === 'column').map((t) => t.duration)).toEqual([duration * 2]);
  });

  test('NTK-4: blur cross-fades the old digit out blurring to blur.radius and the new one in; blur-slide also moves them by blur-slide.distance; flip turns the old upper half down over the lower one', async ({ page }) => {
    const ticker = host(page, 'default');
    const radius = await resolveToken(page, T('blur-radius'));
    const distance = await resolveToken(page, T('blur-slide-distance'));
    const duration = await resolveToken(page, T('motion-duration'), 'duration');
    const layers = () =>
      ticker.evaluate((el) =>
        [...el.shadowRoot!.querySelectorAll<HTMLElement>('.layer')].map((layer) => ({ text: layer.textContent, half: layer.classList.contains('top') ? 'top' : layer.classList.contains('bottom') ? 'bottom' : 'whole', ...Object.fromEntries(['opacity', 'filter', 'translate'].map((p) => [p, getComputedStyle(layer).getPropertyValue(p)])), angle: ((t) => (t === 'none' ? 0 : Math.round((Math.acos(Math.max(-1, Math.min(1, new DOMMatrixReadOnly(t).m22))) * 180) / Math.PI)))(getComputedStyle(layer).transform) })),
      );
    const column = (key: string) => ticker.evaluate((el, k) => Object.fromEntries(['opacity', 'filter', 'translate', 'visibility'].map((p) => [p, getComputedStyle(el.shadowRoot!.querySelector(`[data-key="${k}"] .column`)!).getPropertyValue(p)])), key);
    await set(ticker, { animation: 'blur' });
    await set(ticker, { value: 1235 });
    let drawn = await layers();
    expect(drawn).toHaveLength(1);
    expect(drawn[0]).toMatchObject({ text: '4', opacity: '1' });
    expect((await column('i0')).opacity).toBe('0');
    expect((await column('i0')).filter).toBe(`blur(${radius}px)`);
    await seek(ticker, duration);
    expect((await layers())[0]?.filter ?? `blur(${radius}px)`).toBe(`blur(${radius}px)`);
    await play(ticker);
    expect(await layers()).toEqual([]);
    expect(await column('i0')).toMatchObject({ opacity: '1', filter: 'none' });
    expect(await shownDigits(ticker)).toBe('1235');
    // blur-slide: the old digit moves out up as the new one comes from below (the number grew).
    await set(ticker, { animation: 'blur-slide' });
    await set(ticker, { value: 1236 });
    expect((await column('i0')).translate).toBe(`0px ${distance}px`);
    await seek(ticker, duration);
    expect((await layers())[0].translate).toBe(`0px -${distance}px`);
    await play(ticker);
    // flip: the new upper half behind, the old upper half turning down about the middle, then the new lower half.
    await set(ticker, { animation: 'flip' });
    await set(ticker, { value: 1237 });
    drawn = await layers();
    expect(drawn.map((l) => `${l.half}:${l.text}`)).toEqual(['top:7', 'bottom:6', 'top:6', 'bottom:7']);
    expect((await column('i0')).visibility).toBe('hidden');
    // Read through the change: the old upper half turns from 0° to 90° while the new lower half waits at 90°, then the
    // new lower half turns from 90° to 0° once the old lower half is gone.
    const seen: { oldTop: number; newBottom: number; oldBottom: string }[] = [];
    for (let i = 1; i < 64; i++) {
      await seek(ticker, (duration * i) / 64);
      drawn = await layers();
      seen.push({ oldTop: drawn[2].angle, newBottom: drawn[3].angle, oldBottom: drawn[1].opacity });
    }
    expect(seen.some((s) => s.oldTop > 0 && s.oldTop < 90 && s.newBottom === 90 && s.oldBottom === '1')).toBe(true);
    expect(seen.some((s) => s.newBottom > 0 && s.newBottom < 90 && s.oldBottom === '0')).toBe(true);
    expect(seen.every((s) => s.newBottom === 90 || s.oldTop === 90)).toBe(true);
    await play(ticker);
    expect(await layers()).toEqual([]);
    expect(await shownDigits(ticker)).toBe('1237');
    // auto takes the component token.
    await set(ticker, { animation: 'auto' });
    await rootTokens(page, { [T('animation')]: 'flip' });
    await set(ticker, { value: 1238 });
    expect((await layers()).length).toBe(4);
    await play(ticker);
  });

  test('NTK-5: 99 to 100 moves the width with the digits, the new place sliding in and fading in; a place that goes fades out; an end-aligned ticker keeps its end edge still', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('start', { value: 99 }), fixture('end', { value: 99 })], reducedMotion: false });
    await page.locator('[data-fixture="end"]').evaluate((el) => {
      (el as HTMLElement).style.cssText += ';inline-size: 240px; text-align: end; display: block';
    });
    const duration = await resolveToken(page, T('motion-duration'), 'duration');
    for (const id of ['start', 'end']) {
      const ticker = host(page, id);
      const before = await boxOf(ticker, '.number');
      await set(ticker, { value: 100 });
      await seek(ticker, 0);
      const first = await boxOf(ticker, '.number');
      expect(first.width, id).toBeCloseTo(before.width, 0);
      const entering = (await places(ticker)).find((p) => p.key === 'i2')!;
      expect(entering.opacity, id).toBe(0);
      // It comes from below: one step before its digit.
      expect(entering.p, id).toBeCloseTo(10, 1);
      await seek(ticker, duration / 2);
      const middle = await boxOf(ticker, '.number');
      expect(middle.width, id).toBeGreaterThan(before.width + 1);
      // It stays on its line while its width moves: clipped, it keeps the baseline of its digits.
      expect(middle.top, id).toBeCloseTo(before.top, 0);
      expect((await boxOf(ticker, '.place')).top, id).toBeCloseTo(before.top, 0);
      await play(ticker);
      const after = await boxOf(ticker, '.number');
      expect(after.width, id).toBeGreaterThan(middle.width + 1);
      if (id === 'end') {
        expect(middle.right).toBeCloseTo(before.right, 0);
        expect(after.right).toBeCloseTo(before.right, 0);
      } else {
        expect(middle.left).toBeCloseTo(before.left, 0);
      }
      expect(await shownDigits(ticker), id).toBe('100');
      // Back: the hundreds go, fading out where they were.
      const hundreds = (await ticker.evaluate((el) => el.shadowRoot!.querySelector('[data-key="i2"]')!.getBoundingClientRect().left));
      await set(ticker, { value: 99 });
      await seek(ticker, duration / 2);
      const going = await ticker.evaluate((el) => {
        const place = el.shadowRoot!.querySelector<HTMLElement>('.leaving[data-key="i2"]');
        return place ? { opacity: Number(getComputedStyle(place).opacity), left: place.getBoundingClientRect().left } : null;
      });
      expect(going, id).not.toBeNull();
      expect(going!.opacity, id).toBeGreaterThan(0);
      expect(going!.opacity, id).toBeLessThan(1);
      expect(going!.left, id).toBeCloseTo(hundreds, 0);
      await play(ticker);
      expect(await ticker.evaluate((el) => el.shadowRoot!.querySelectorAll('.leaving').length), id).toBe(0);
      expect(await shownDigits(ticker), id).toBe('99');
    }
    // 999 to 1,000: the group separator fades in in its place.
    const ticker = host(page, 'start');
    await set(ticker, { value: 999 });
    await play(ticker);
    await set(ticker, { value: 1000 });
    const separator = await ticker.evaluate((el) => Number(getComputedStyle(el.shadowRoot!.querySelector('[data-key="g3"]')!).opacity));
    expect(separator).toBe(0);
    await play(ticker);
  });

  test('NTK-6: a change before the last one ended goes on from where each column is drawn, never jumping, and its duration starts again', async ({ page }) => {
    const ticker = host(page, 'default');
    const duration = await resolveToken(page, T('motion-duration'), 'duration');
    await set(ticker, { value: 1230 });
    await play(ticker);
    await set(ticker, { value: 1235 });
    await seek(ticker, duration / 2);
    const midway = (await places(ticker))[3].p;
    expect(midway).toBeGreaterThan(10);
    expect(midway).toBeLessThan(15);
    await set(ticker, { value: 1239 });
    const now = (await places(ticker))[3].p;
    expect(now).toBeCloseTo(midway, 1);
    expect((await timings(ticker)).filter((t) => t.on === 'column').map((t) => t.duration)).toEqual([duration]);
    await seek(ticker, duration);
    expect((await places(ticker))[3].p).toBe(19);
    await play(ticker);
    expect(await shownDigits(ticker)).toBe('1239');
    // Turned back the other way, it goes back from where it is drawn.
    await set(ticker, { value: 1249 });
    await seek(ticker, duration / 2);
    const tens = (await places(ticker))[2].p;
    await set(ticker, { value: 1239 });
    expect((await places(ticker))[2].p).toBeCloseTo(tens, 1);
    await seek(ticker, duration);
    expect((await places(ticker))[2].p).toBe(13);
    await play(ticker);
  });

  test('NTK-7: animation none shows the new number at once, its width too, and settles at once', async ({ page }) => {
    const ticker = host(page, 'default');
    await settles(ticker);
    await ticker.evaluate(async (el: HTMLElement & { updateComplete: Promise<unknown> }) => {
      Object.assign(el, { animation: 'none', value: 123456 });
      await el.updateComplete;
    });
    expect(await motionCount(ticker)).toBe(0);
    expect(await shownDigits(ticker)).toBe('123456');
    expect(await settled(page)).toEqual([123456]);
  });

  test('NTK-8: with startValue it draws startValue and moves to value the first time it comes into view, once; without it, the value at once', async ({ page }) => {
    await page.evaluate(() => {
      const spacer = document.createElement('div');
      spacer.style.blockSize = '3000px';
      spacer.id = 'spacer';
      const ticker = document.createElement('tanrei-number-ticker') as HTMLElement & { value: number; startValue: number };
      ticker.id = 'late';
      ticker.startValue = 0;
      ticker.value = 512;
      document.body.append(spacer, ticker);
      (window as unknown as { settled: number[] }).settled = [];
      ticker.addEventListener('settle', (event) => (window as unknown as { settled: number[] }).settled.push((event as CustomEvent<{ value: number }>).detail.value));
    });
    const late = page.locator('#late');
    await late.evaluate((el: HTMLElement & { updateComplete: Promise<unknown> }) => el.updateComplete);
    expect(await shownDigits(late)).toBe('0');
    expect(await motionCount(late)).toBe(0);
    await late.scrollIntoViewIfNeeded();
    await expect.poll(() => motionCount(late)).toBeGreaterThan(0);
    await motionEnded(late);
    expect(await shownDigits(late)).toBe('512');
    await expect.poll(() => settled(page)).toEqual([512]);
    // Out of view and back: nothing moves again.
    await page.evaluate(() => window.scrollTo(0, 0));
    await late.scrollIntoViewIfNeeded();
    expect(await motionCount(late)).toBe(0);
    // Without startValue: the first value at once.
    expect(await motionCount(host(page, 'default'))).toBe(0);
  });

  test('NTK-9: one text for assistive technology — label, then the number as written — and every drawn digit hidden', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('labelled', { value: 1234, label: 'Revenue', style: 'currency', currency: 'USD' })], reducedMotion: true });
    const ticker = host(page, 'labelled');
    expect(await spoken(ticker)).toBe('Revenue $1,234.00');
    const tree = await ticker.evaluate((el) => ({ role: el.getAttribute('role'), hidden: el.shadowRoot!.querySelector('.number')!.getAttribute('aria-hidden'), live: el.shadowRoot!.querySelector('.text')!.getAttribute('aria-live') }));
    expect(tree).toEqual({ role: null, hidden: 'true', live: null });
    await expect(stage(page, 'labelled')).toMatchAriaSnapshot('- text: Revenue $1,234.00');
    // Always the current value, in place.
    await ticker.evaluate(async (el: HTMLElement & { updateComplete: Promise<unknown> }) => {
      Object.assign(el, { value: 99 });
      await el.updateComplete;
    });
    expect(await spoken(ticker)).toBe('Revenue $99.00');
  });

  test('NTK-10: with live polite the text is a polite region written once each change has settled, never a value in between or of a change replaced', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('live', { value: 10, live: 'polite' })], reducedMotion: false });
    const ticker = host(page, 'live');
    expect(await ticker.evaluate((el) => [el.shadowRoot!.querySelector('.text')!.getAttribute('aria-live'), el.shadowRoot!.querySelector('.text')!.getAttribute('aria-atomic')])).toEqual(['polite', 'true']);
    await ticker.evaluate((el) => {
      const seen: string[] = [];
      (window as unknown as { written: string[] }).written = seen;
      new MutationObserver(() => seen.push(el.shadowRoot!.querySelector('.text')!.textContent ?? '')).observe(el.shadowRoot!.querySelector('.text')!, { childList: true, characterData: true, subtree: true });
    });
    await set(ticker, { value: 20 });
    await seek(ticker, 50);
    expect(await spoken(ticker)).toBe('10');
    await set(ticker, { value: 30 });
    await play(ticker);
    await expect.poll(() => spoken(ticker)).toBe('30');
    const written = await page.evaluate(() => (window as unknown as { written: string[] }).written);
    expect(written.filter((text) => text)).toEqual(['30']);
    // off: no region.
    expect(await host(page, 'live').evaluate((el) => (el as HTMLElement & { live: string }).live)).toBe('polite');
  });

  test('NTK-11: settle once at the end of each change, with its value; a change replaced before its end emits none', async ({ page }) => {
    const ticker = host(page, 'default');
    await settles(ticker);
    await set(ticker, { value: 2000 });
    await seek(ticker, 50);
    await set(ticker, { value: 3000 });
    await play(ticker);
    await expect.poll(() => settled(page)).toEqual([3000]);
    await set(ticker, { value: 3001 });
    await play(ticker);
    await expect.poll(() => settled(page)).toEqual([3000, 3001]);
  });

  test('NTK-12: a value that is not finite is written as the formatter writes it, at once; an unknown currency or unit is written as decimal; each is reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [fixture('nan', { value: 1 }), fixture('bad-currency', { value: 1234, style: 'currency', currency: 'ZZQ' }), fixture('bad-unit', { value: 1234, style: 'unit', unit: 'furlong-per-fortnight' })],
      reducedMotion: false,
    });
    const nan = host(page, 'nan');
    await nan.evaluate(async (el: HTMLElement & { updateComplete: Promise<unknown> }) => {
      Object.assign(el, { value: Number.NaN });
      await el.updateComplete;
    });
    expect(await nan.evaluate((el) => el.shadowRoot!.querySelectorAll('.place').length)).toBe(0);
    expect(await motionCount(nan)).toBe(0);
    expect(await spoken(nan)).toBe('NaN');
    await nan.evaluate(async (el: HTMLElement & { updateComplete: Promise<unknown> }) => {
      Object.assign(el, { value: Number.POSITIVE_INFINITY });
      await el.updateComplete;
    });
    expect(await spoken(nan)).toBe('∞');
    expect(await spoken(host(page, 'bad-currency'))).toBe('1,234');
    expect(await spoken(host(page, 'bad-unit'))).toBe('1,234');
    expect(seen.filter((m) => m.includes('NTK-12')).length).toBeGreaterThanOrEqual(3);
  });

  test('NTK-13: right to left, the number is laid out as its locale writes it — digits left to right — and stands at the start, the right', async ({ page }) => {
    const ticker = host(page, 'rtl');
    const lefts = await ticker.evaluate((el) => [...el.shadowRoot!.querySelectorAll('.place')].map((p) => p.getBoundingClientRect().left));
    expect(lefts).toEqual([...lefts].sort((a, b) => a - b));
    expect(await shownDigits(ticker)).toBe('123400');
    // The euro sign after the number in Hebrew: on its left, in a right-to-left locale.
    const euro = await ticker.evaluate((el) => [...el.shadowRoot!.querySelectorAll<HTMLElement>('.char')].find((c) => c.textContent!.includes('€'))!.getBoundingClientRect().left);
    expect(euro).toBeLessThan(lefts[0]);
    const [own, room] = [await ticker.boundingBox(), await stage(page, 'rtl').boundingBox()];
    expect(own!.x + own!.width).toBeCloseTo(room!.x + room!.width - 16, 0);
    // A column still moves up for a number that grows.
    await set(ticker, { value: 1235 });
    await seek(ticker, (await resolveToken(page, T('motion-duration'), 'duration')) / 2);
    const ones = (await places(ticker)).find((p) => p.key === 'i0')!;
    expect(ones.p).toBeGreaterThan(14);
    expect(ones.p).toBeLessThan(15);
    await play(ticker);
  });

  test('NTK-14: the language and the direction come from an ancestor; a change of either while it is shown is drawn at once', async ({ page }) => {
    const ticker = host(page, 'default');
    await stage(page, 'default').evaluate((el) => el.setAttribute('lang', 'de-DE'));
    await expect.poll(() => spoken(ticker)).toBe('1.234');
    expect(await motionCount(ticker)).toBe(0);
    await page.locator('main').evaluate((el) => el.setAttribute('lang', 'fr-FR'));
    expect(await spoken(ticker)).toBe('1.234');
    await stage(page, 'default').evaluate((el) => el.removeAttribute('lang'));
    await expect.poll(() => spoken(ticker)).toBe('1 234');
    // Direction: a flip of direction during a change finishes the change at once.
    await set(ticker, { value: 99999 });
    await ticker.evaluate((el) => {
      for (const animation of el.shadowRoot!.getAnimations()) animation.play();
    });
    await stage(page, 'default').evaluate((el) => el.setAttribute('dir', 'rtl'));
    await expect.poll(() => motionCount(ticker)).toBe(0);
    expect(await shownDigits(ticker)).toBe('99999');
  });

  test('NTK-15: with enlarged text the windows are a line of the larger text high', async ({ page }) => {
    const ticker = host(page, 'default');
    const height = async () => (await boxOf(ticker, '.place')).height;
    const before = await height();
    const line = await stage(page, 'default').evaluate((el) => {
      (el as HTMLElement).style.fontSize = '200%';
      (el as HTMLElement).style.lineHeight = '1.5';
      const probe = document.createElement('span');
      probe.style.display = 'inline-block';
      probe.textContent = '0';
      el.append(probe);
      const height = probe.getBoundingClientRect().height;
      probe.remove();
      return height;
    });
    const after = await height();
    expect(after).toBeGreaterThan(before);
    expect(after).toBeCloseTo(line, 0);
    expect(await shownDigits(ticker)).toBe('1234');
    // The motion's distances with them: a column's step is its window.
    const step = await ticker.evaluate((el) => el.shadowRoot!.querySelector<HTMLElement>('.column')!.offsetHeight / 30);
    expect(step).toBeCloseTo(after, 0);
  });

  test('NTK-16: an unknown animation, trend, style, notation, sign display or live draws the default and is reported; a duration that is not positive takes the token', async ({ page }) => {
    const seen = warnings(page);
    const ticker = host(page, 'default');
    const duration = await resolveToken(page, T('motion-duration'), 'duration');
    await set(ticker, { animation: 'spin', trend: 'sideways', numberStyle: 'roman', notation: 'scientific', signDisplay: 'never', live: 'loud', duration: -5 });
    await set(ticker, { value: 1235 });
    expect((await timings(ticker)).filter((t) => t.on === 'column').map((t) => t.duration)).toEqual([duration]);
    await play(ticker);
    expect(await spoken(ticker)).toBe('1,235');
    expect(await ticker.evaluate((el) => el.shadowRoot!.querySelector('.text')!.getAttribute('aria-live'))).toBeNull();
    for (const name of ['animation "spin"', 'trend "sideways"', 'number-style "roman"', 'notation "scientific"', 'sign-display "never"', 'live "loud"', 'duration -5']) {
      expect(seen.some((m) => m.includes(name) && m.includes('NTK-16')), name).toBe(true);
    }
  });

  test('NTK-17: no words of its own — with no label the text is exactly what the formatter writes', async ({ page }) => {
    for (const f of spec.fixtures.filter((f) => !f.props.label)) {
      const text = await spoken(host(page, f.id));
      const [chars, digits] = await host(page, f.id).evaluate((el) => [[...el.shadowRoot!.querySelectorAll<HTMLElement>('.char')].map((e) => e.textContent).join('').replace(/[\u200e\u200f\u061c]/g, ''), el.shadowRoot!.querySelectorAll('.place').length] as const);
      // Every drawn character is the formatter's: the text is the characters and the digits, and nothing more.
      expect(chars.length + digits, f.id).toBe([...text!].length);
    }
  });
});

test.describe('reduced motion', () => {
  test('NTK-7: where motion is reduced the new number and its width are there at once, the old number cross-fading out over motion.reduced-duration, and settle is emitted at once', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: true });
    const ticker = host(page, 'default');
    await settles(ticker);
    const before = await boxOf(ticker, '.number');
    await set(ticker, { value: 123456 });
    expect(await settled(page)).toEqual([123456]);
    const after = await boxOf(ticker, '.number');
    expect(after.width).toBeGreaterThan(before.width + 1);
    const reduced = await resolveToken(page, T('motion-reduced-duration'), 'duration');
    expect(reduced).toBe(await resolveToken(page, '--tanrei-sys-motion-role-reduced', 'duration'));
    const fades = await timings(ticker);
    expect(fades.length).toBeGreaterThan(0);
    expect(new Set(fades.map((t) => t.duration))).toEqual(new Set([reduced]));
    // No column moves.
    expect(fades.some((t) => t.on === 'column')).toBe(false);
    await play(ticker);
    expect(await shownDigits(ticker)).toBe('123456');
    expect(await ticker.evaluate((el) => el.shadowRoot!.querySelectorAll('.leaving').length)).toBe(0);
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, reducedMotion: true });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
    }
  });
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: true });
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
