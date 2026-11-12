// <tanrei-size-transition>, driven by specs/size-transition.spec.json: every behaviour id (SZT-1…13) is cited by a test
// title, every fixture has a baseline, and every duration and distance is read back from the tokens — never from a
// number written here. A motion is read frame by frame (each frame callback reads the box where the frame draws it),
// and held to what must hold in every frame — an edge that stays, a size that never jumps back — not to a frame count,
// which a loaded machine changes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, mountFixtures, resolveToken, tab } from '../../../test/harness.js';
import { EVERY_ANIMATION, heldTaskFrame, motionCount, motionEnded } from '../../../test/motions.js';
import { expectBaseline } from '../../../test/baseline.js';

const spec = loadSpec('size-transition');
type P = Page;
const T = (name: string) => `--tanrei-comp-size-transition-${name}`;
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-size-transition`).first();
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const fixture = (id: string, props: Fixture['props'], content: string, extra: Partial<Fixture> = {}): Fixture => ({ id, props, content, ...extra });
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}

/** A paragraph of `lines` short lines, each its own block, so that a line's height is the size step. */
const lines = (n: number, first = 1) => Array.from({ length: n }, (_, i) => `<div class="line">Line ${first + i}</div>`).join('');
/**
 * The source of an in-page `() => Promise<void>` that resolves in the next frame drawn, once its layout is the one it
 * paints: a resize observer's first report of the root, which every drawn frame gives, after the component's own
 * observers (created before it) have moved the box back to the size it draws. A frame callback runs before them, and
 * reads the frame's layout before a change seen by its resize observer is held at its start.
 */
const FRAME = `() => new Promise((resolve) => { const o = new ResizeObserver(() => { o.disconnect(); resolve(undefined); }); o.observe(document.documentElement); })`;
/** A box property as every engine names it: Chromium names a transition of `block-size` by `height`. */
const physical = (property: string) => ({ 'block-size': 'height', 'inline-size': 'width' })[property] ?? property;

/** The source of an in-page change: appends `n` more lines to the size transition's first child. */
const addLines = (n: number) => `(host) => { const list = host.firstElementChild; const at = list.children.length; list.insertAdjacentHTML('beforeend', ${JSON.stringify(lines(n, 100))}); void at; }`;

interface Box {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}
interface Watched {
  /** The host's box in the frame before the change, and in each frame drawn after it until it has settled. */
  frames: Box[];
  /** The first line's box in the same frames, where the content has one. */
  first: (Box | null)[];
  /** The last line's box in the same frames. */
  last: (Box | null)[];
  /** Each settle's detail, in order. */
  settles: { width: number; height: number }[];
  /** The size motions running on the box right after the change's task: each one's duration and easing. */
  begun: { property: string; duration: number; easing: string }[];
}

/**
 * Makes the change `act` (the source of an in-page `(host) => void`) at the start of a task and reads the host and its
 * first and last lines in that frame and in every frame callback after it, until 150 ms after its first settle — so a
 * second settle would be seen — or 3 s. Each read is where the frame is drawn: a frame callback's layout is that frame's.
 */
const watch = (locator: Locator, act: string, { frames = true }: { frames?: boolean } = {}): Promise<Watched> =>
  locator.evaluate(
    async (el, [source, everyFrame, frameSource]) => {
      const change = (0, eval)(source) as (host: Element) => void;
      const drawn = (0, eval)(frameSource) as () => Promise<void>;
      const box = (element: Element | null | undefined): Box | null => {
        if (!element) return null;
        const r = element.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
      };
      const result: Watched = { frames: [], first: [], last: [], settles: [], begun: [] };
      const read = () => {
        result.frames.push(box(el)!);
        const items = el.querySelectorAll('.line');
        result.first.push(box(items[0]));
        result.last.push(box(items[items.length - 1]));
      };
      let settledAt = 0;
      el.addEventListener('settle', (event) => {
        result.settles.push((event as CustomEvent<{ width: number; height: number }>).detail);
        settledAt ||= performance.now();
      });
      read();
      change(el);
      // The component's mutation observer and update: microtasks of this task.
      for (let turn = 0; turn < 20; turn++) await null;
      const motions = el.shadowRoot!.querySelector('.box')!.getAnimations() as CSSTransition[];
      result.begun = motions.map((animation) => ({
        property: ({ 'block-size': 'height', 'inline-size': 'width' } as Record<string, string>)[animation.transitionProperty] ?? animation.transitionProperty,
        duration: Number((animation.effect as KeyframeEffect).getTiming().duration),
        easing: getComputedStyle(el.shadowRoot!.querySelector('.box')!).transitionTimingFunction,
      }));
      const start = performance.now();
      for (;;) {
        await drawn();
        if (everyFrame) read();
        const now = performance.now();
        if ((settledAt && now - settledAt > 150) || now - start > 3000) break;
      }
      if (!everyFrame) read();
      return result;
    },
    [act, frames, FRAME] as const,
  );

/** Every value of `values` is between the first and the last, and moves only toward the last. */
function expectOneWay(values: number[], what: string, within = 0.5) {
  const [from, to] = [values[0]!, values.at(-1)!];
  const toward = Math.sign(to - from);
  values.forEach((value, i) => {
    expect(Math.min(from, to) - within <= value && value <= Math.max(from, to) + within, `${what}: frame ${i} (${value}) lies between ${from} and ${to}`).toBe(true);
    if (i) expect(toward * (value - values[i - 1]!) >= -within, `${what}: frame ${i} (${values[i - 1]} → ${value}) moves toward ${to}`).toBe(true);
  });
}

test.describe('behavior', () => {
  test('SZT-1: the first frame is drawn at the content’s size, without a motion; content added before it is part of it', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: [fixture('rest', {}, `<div>${lines(3)}</div>`)] });
    const it = host(page, 'rest');
    expect(await motionCount(it)).toBe(0);
    const [own, content] = await it.evaluate((el) => [el.getBoundingClientRect().height, el.firstElementChild!.getBoundingClientRect().height]);
    expect(own).toBeCloseTo(content, 1);
    // An element built with its content and changed in the same task: its first frame is its last size.
    const first = await page.evaluate(
      async ([frame, everySource]) => {
        const drawn = (0, eval)(frame) as () => Promise<void>;
        const every = (0, eval)(everySource) as (root: Element) => Animation[];
        const el = document.createElement('tanrei-size-transition');
        el.innerHTML = '<div><div class="line">One</div></div>';
        document.querySelector('[data-fixture="rest"]')!.append(el);
        el.firstElementChild!.insertAdjacentHTML('beforeend', '<div class="line">Two</div><div class="line">Three</div>');
        const heights: number[] = [];
        const motions: number[] = [];
        for (let i = 0; i < 4; i++) {
          await drawn();
          heights.push(el.getBoundingClientRect().height);
          motions.push(every(el).length);
        }
        return { heights, motions, content: el.firstElementChild!.getBoundingClientRect().height };
      },
      [FRAME, EVERY_ANIMATION] as const,
    );
    expect(first.motions).toEqual([0, 0, 0, 0]);
    for (const height of first.heights) expect(height).toBeCloseTo(first.content, 1);
  });

  test('SZT-2: three changes in a row are one motion — from the size shown toward the newest, never back, settled once at the content’s size', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: [fixture('grow', {}, `<div>${lines(1)}</div>`)] });
    const it = host(page, 'grow');
    // Three changes, each a frame after the one before, while the motion of the first runs.
    const seen = await watch(
      it,
      `async (host) => {
        const list = host.firstElementChild;
        const add = (n) => list.insertAdjacentHTML('beforeend', '<div class="line">More</div>'.repeat(n));
        add(1);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        add(2);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        add(3);
      }`,
    );
    const heights = seen.frames.map((f) => f.height);
    expectOneWay(heights, 'height');
    const content = await it.evaluate((el) => el.firstElementChild!.getBoundingClientRect().height);
    expect(heights.at(-1)).toBeCloseTo(content, 1);
    expect(seen.settles, 'one settle, at the end').toHaveLength(1);
    expect(seen.settles[0]!.height).toBeCloseTo(content, 1);
    // Moved through the frames between, not at once.
    expect(heights.filter((h) => h > heights[0]! + 0.5 && h < content - 0.5).length).toBeGreaterThan(0);
  });

  test('SZT-2: changes made in one task are one motion of the box’s block size', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: [fixture('one', {}, `<div>${lines(1)}</div>`)] });
    const seen = await watch(host(page, 'one'), `(host) => { const list = host.firstElementChild; for (let i = 0; i < 3; i++) list.insertAdjacentHTML('beforeend', '<div class="line">More</div>'); }`);
    expect(seen.begun.map((m) => m.property)).toEqual(['height']);
    expect(seen.settles).toHaveLength(1);
  });

  test('SZT-2: the change’s motion begins in the first frame drawn after the task that made it, however long the task', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: [fixture('held', {}, `<div>${lines(1)}</div>`)] });
    const seen = await heldTaskFrame(host(page, 'held'), addLines(2));
    const named = (motion: string) => motion.replace(/(block-size|inline-size)/, (property) => physical(property));
    expect(seen.begun.map(named), 'the motion the change begins').toEqual(['tanrei-size-transition div.box height']);
    expect(seen.at.map(named), 'it stands at its start in the first frame drawn after the task').toEqual(['tanrei-size-transition div.box height at 0 ms']);
  });

  test('SZT-2: a change of size the markup does not show (an element inside that grows by itself) moves from the size the last frame drew', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: [fixture('self', {}, `<div class="line" style="block-size: 24px">Grows</div>`)] });
    const seen = await watch(host(page, 'self'), `(host) => { host.firstElementChild.style.blockSize = '120px'; }`);
    const heights = seen.frames.map((f) => f.height);
    // The first frame after the change still draws the size before it: no jump to the end.
    expect(heights[1]).toBeLessThan(heights.at(-1)! - 0.5);
    expectOneWay(heights, 'height');
    expect(heights.at(-1)).toBeCloseTo(120, 0);
    expect(seen.settles).toHaveLength(1);
  });

  test('SZT-3: the time grows with the distance — duration up to distance-step, duration-step per step begun, never past duration-max — and a set duration is used as given', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: [fixture('time', {}, `<div class="line" style="block-size: 20px">Box</div>`)] });
    const [base, step, max, distance] = [
      await resolveToken(page, T('motion-duration'), 'duration'),
      await resolveToken(page, T('motion-duration-step'), 'duration'),
      await resolveToken(page, T('motion-duration-max'), 'duration'),
      await resolveToken(page, T('motion-distance-step')),
    ];
    const it = host(page, 'time');
    const expected = (d: number) => Math.min(max, base + step * Math.max(0, Math.ceil((d - distance) / distance)));
    // A line of `by` pixels added: the change of the markup begins its motion in its task, where it is read.
    for (const [by, given] of [[distance / 2, null], [distance * 2, null], [distance * 6, null], [distance * 6, 120]] as const) {
      await it.evaluate((el, d) => ((el as unknown as { duration: number | null }).duration = d), given);
      await it.evaluate((el) => (el as unknown as { updateComplete: Promise<unknown> }).updateComplete);
      const seen = await watch(it, `(host) => { const line = document.createElement('div'); line.className = 'line'; line.style.blockSize = '${by}px'; host.append(line); }`, { frames: false });
      expect(seen.begun.map((m) => m.duration), `${by}px, duration ${given}`).toEqual([given ?? expected(by)]);
      expect(seen.begun[0]!.easing).toBe(await page.evaluate((name) => {
        const probe = document.createElement('div');
        probe.style.transitionTimingFunction = `var(${name})`;
        document.body.append(probe);
        const value = getComputedStyle(probe).transitionTimingFunction;
        probe.remove();
        return value;
      }, T('motion-easing')));
      await it.evaluate((el) => el.querySelectorAll(':scope > .line').forEach((line) => line.remove()));
      await motionEnded(it);
    }
    // 0 is at once.
    await it.evaluate((el) => ((el as unknown as { duration: number }).duration = 0));
    await it.evaluate((el) => (el as unknown as { updateComplete: Promise<unknown> }).updateComplete);
    const now = await watch(it, `(host) => host.insertAdjacentHTML('beforeend', '<div class="line">More</div>')`, { frames: false });
    expect(now.begun).toEqual([]);
    expect(now.settles).toHaveLength(1);
  });

  test('SZT-4: anchor start keeps the first line still in every frame; end keeps the last line on the box’s end; center moves both edges by half', async ({ page }) => {
    await mountFixtures(page, spec, {
      reducedMotion: false,
      fixtures: [fixture('start', {}, `<div>${lines(1)}</div>`), fixture('end', { anchor: 'end' }, `<div>${lines(1)}</div>`), fixture('center', { anchor: 'center' }, `<div>${lines(1)}</div>`)],
    });
    const start = await watch(host(page, 'start'), addLines(3));
    for (const [i, line] of start.first.entries()) expect(line!.top, `frame ${i}: the first line`).toBeCloseTo(start.first[0]!.top, 1);
    for (const [i, f] of start.frames.entries()) expect(f.top, `frame ${i}: the box's top`).toBeCloseTo(start.frames[0]!.top, 1);

    const end = await watch(host(page, 'end'), addLines(3));
    for (const [i, f] of end.frames.entries()) expect(end.last[i]!.bottom, `frame ${i}: the last line on the box's end`).toBeCloseTo(f.bottom, 1);
    expect(end.frames.slice(1, -1).some((f) => f.height < end.frames.at(-1)!.height - 0.5), 'it moved').toBe(true);

    const center = await watch(host(page, 'center'), addLines(3));
    const content = await host(page, 'center').evaluate((el) => el.firstElementChild!.getBoundingClientRect().height);
    for (const [i, f] of center.frames.entries()) {
      // The content's middle on the box's middle: the box clips half of what is new above and half below.
      const middle = (center.first[i]!.top + center.first[i]!.top + content) / 2;
      if (i) expect(middle, `frame ${i}: the content's middle`).toBeCloseTo((f.top + f.bottom) / 2, 0);
    }
  });

  test('SZT-4: on the inline axis, right to left, anchor start keeps the start (right) edge of the content still', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: [fixture('rtl', { axis: 'inline' }, '<span class="line">حفظ</span>', { direction: 'rtl' })] });
    const it = host(page, 'rtl');
    // A stage of its own width: one as wide as what it holds would move its right edge with the box.
    await page.addStyleTag({ content: `[data-fixture="rtl"] { inline-size: 320px; }` });
    await motionEnded(page);
    const seen = await watch(it, `(host) => { host.querySelector('.line').textContent = 'تم الحفظ بنجاح'; }`);
    const widths = seen.frames.map((f) => f.width);
    expectOneWay(widths, 'width');
    expect(widths.at(-1)!).toBeGreaterThan(widths[0]! + 0.5);
    for (const [i, line] of seen.first.entries()) expect(line!.right, `frame ${i}: the text's start edge`).toBeCloseTo(seen.first[0]!.right, 1);
    for (const [i, f] of seen.frames.entries()) expect(f.right, `frame ${i}: the box's start edge`).toBeCloseTo(seen.frames[0]!.right, 1);
  });

  test('SZT-5: while it shrinks with focus in a field it clips, nothing scrolls — not the box, the content or the page — and focus and the caret stay', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: [fixture('focus', {}, `<div>${lines(6)}<input class="field" aria-label="Reply" value="Draft"></div>`)] });
    const it = host(page, 'focus');
    await it.locator('.field').focus();
    await it.locator('.field').evaluate((el: HTMLInputElement) => el.setSelectionRange(2, 2));
    const scrolls = await it.evaluate(async (el) => {
      const seen: number[] = [];
      const box = el.shadowRoot!.querySelector('.box')!;
      const read = () => seen.push(box.scrollTop, el.shadowRoot!.querySelector('.content')!.scrollTop, el.scrollTop, document.scrollingElement!.scrollTop);
      // Five lines go: the field, last, is clipped below the box while it shrinks.
      for (const line of [...el.querySelectorAll('.line')].slice(1)) line.remove();
      for (let frame = 0; frame < 30; frame++) {
        read();
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      return seen;
    });
    expect(new Set(scrolls)).toEqual(new Set([0]));
    expect(await it.locator('.field').evaluate((el: HTMLInputElement) => [document.activeElement === el, el.selectionStart])).toEqual([true, 2]);
    expect(await it.evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('.box')!).overflow)).not.toBe('hidden');
  });

  test('SZT-6: a change of the room it is given — the window’s size, its text size — is taken at once', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: [fixture('room', {}, `<div class="line">${'A line of text that wraps when its place is narrow. '.repeat(3)}</div>`)] });
    const it = host(page, 'room');
    await page.addStyleTag({ content: `[data-fixture="room"] tanrei-size-transition { inline-size: 50vw; }` });
    await motionEnded(page);
    await it.evaluate((el) => {
      const seen: number[] = [];
      el.addEventListener('settle', (event) => seen.push((event as CustomEvent).detail.height));
      (window as unknown as { __settles: number[] }).__settles = seen;
    });
    const size = page.viewportSize()!;
    await page.setViewportSize({ width: Math.round(size.width / 2), height: size.height });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(await motionCount(it), 'the window narrowed').toBe(0);
    const [own, content] = await it.evaluate((el) => [el.getBoundingClientRect().height, el.firstElementChild!.getBoundingClientRect().height]);
    expect(own).toBeCloseTo(content, 1);
    await page.setViewportSize(size);
    await it.evaluate((el) => ((el as HTMLElement).style.fontSize = '24px'));
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(await motionCount(it), 'the text size grew').toBe(0);
    expect(await page.evaluate(() => (window as unknown as { __settles: number[] }).__settles.length)).toBeGreaterThan(0);
  });

  test('SZT-6: the window is listened to only while a size transition is connected — the module adds no listener to a page that draws none', async ({ page }) => {
    const bundle = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../dist/tanrei.bundle.js'), 'utf8');
    await page.setContent(`<!doctype html><html><body><script>
      window.__resize = [];
      const add = EventTarget.prototype.addEventListener;
      const remove = EventTarget.prototype.removeEventListener;
      EventTarget.prototype.addEventListener = function (type, ...rest) { if (this === window && type === 'resize') window.__resize.push('add'); return add.call(this, type, ...rest); };
      EventTarget.prototype.removeEventListener = function (type, ...rest) { if (this === window && type === 'resize') window.__resize.push('remove'); return remove.call(this, type, ...rest); };
    </script><script type="module">${bundle}</script></body></html>`);
    await page.waitForFunction(() => !!customElements.get('tanrei-size-transition'));
    const seen = () => page.evaluate(() => (window as unknown as { __resize: string[] }).__resize.slice());
    expect(await seen(), 'loaded, none drawn').toEqual([]);
    await page.evaluate(() => {
      for (let i = 0; i < 2; i++) document.body.append(Object.assign(document.createElement('tanrei-size-transition'), { textContent: 'Line' }));
    });
    expect(await seen(), 'two connected: one listener').toEqual(['add']);
    await page.evaluate(() => document.querySelector('tanrei-size-transition')!.remove());
    expect(await seen(), 'one left: still listening').toEqual(['add']);
    await page.evaluate(() => document.querySelector('tanrei-size-transition')!.remove());
    expect(await seen(), 'none left').toEqual(['add', 'remove']);
  });

  test('SZT-6: a size transition whose content holds one that moves follows it in every frame, so the two move as one', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: [fixture('nested', {}, `<tanrei-size-transition class="inner"><div>${lines(1)}</div></tanrei-size-transition>`)] });
    const outer = host(page, 'nested');
    const seen = await outer.evaluate(async (el, frame) => {
      const drawn = (0, eval)(frame) as () => Promise<void>;
      const inner = el.querySelector('.inner')!;
      const pairs: [number, number][] = [];
      const settles: string[] = [];
      el.addEventListener('settle', () => settles.push('outer'));
      inner.addEventListener('settle', () => settles.push('inner'));
      inner.firstElementChild!.insertAdjacentHTML('beforeend', '<div class="line">Two</div><div class="line">Three</div><div class="line">Four</div>');
      const start = performance.now();
      while (performance.now() - start < 1500) {
        await drawn();
        pairs.push([el.getBoundingClientRect().height, inner.getBoundingClientRect().height]);
      }
      return { pairs, settles };
    }, FRAME);
    for (const [i, [outer, inner]] of seen.pairs.entries()) expect(outer, `frame ${i}`).toBeCloseTo(inner, 0);
    expect(new Set(seen.pairs.map(([, inner]) => Math.round(inner))).size, 'the inner one moved').toBeGreaterThan(2);
    expect(seen.settles).toEqual(['inner', 'outer']);
  });

  test('SZT-7: where motion is reduced every change is made at once, and settles once', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: true, fixtures: [fixture('reduced', {}, `<div>${lines(1)}</div>`)] });
    const it = host(page, 'reduced');
    const seen = await watch(it, addLines(4));
    expect(seen.begun).toEqual([]);
    const content = await it.evaluate((el) => el.firstElementChild!.getBoundingClientRect().height);
    for (const f of seen.frames.slice(1)) expect(f.height).toBeCloseTo(content, 1);
    expect(seen.settles).toHaveLength(1);
    expect(seen.settles[0]!.height).toBeCloseTo(content, 1);
  });

  test('SZT-8: disabled follows the content at once; turned on during a motion it takes the newest size at once and settles', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: [fixture('off', { disabled: true }, `<div>${lines(1)}</div>`), fixture('mid', {}, `<div>${lines(1)}</div>`)] });
    const off = await watch(host(page, 'off'), addLines(3));
    expect(off.begun).toEqual([]);
    expect(off.settles).toHaveLength(1);
    const mid = host(page, 'mid');
    const seen = await watch(
      mid,
      `async (host) => {
        host.firstElementChild.insertAdjacentHTML('beforeend', '<div class="line">More</div>'.repeat(4));
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        host.disabled = true;
      }`,
    );
    const content = await mid.evaluate((el) => el.firstElementChild!.getBoundingClientRect().height);
    expect(seen.settles).toHaveLength(1);
    expect(seen.settles[0]!.height).toBeCloseTo(content, 1);
    expect(await motionCount(mid)).toBe(0);
  });

  test('SZT-9: a change while it is not drawn is taken at once, and drawn again it shows its content’s size without a motion', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: [fixture('hidden', {}, `<div>${lines(1)}</div>`)] });
    const it = host(page, 'hidden');
    const seen = await it.evaluate(async (el, [source, everySource]) => {
      const stage = el.parentElement!;
      const frame = (0, eval)(source) as () => Promise<void>;
      const every = (0, eval)(everySource) as (root: Element) => Animation[];
      stage.style.display = 'none';
      await frame();
      await frame();
      el.firstElementChild!.insertAdjacentHTML('beforeend', '<div class="line">Two</div><div class="line">Three</div>');
      await frame();
      stage.style.display = '';
      const heights: number[] = [];
      const motions: number[] = [];
      for (let i = 0; i < 4; i++) {
        await frame();
        heights.push(el.getBoundingClientRect().height);
        motions.push(every(el).length);
      }
      return { heights, motions, content: el.firstElementChild!.getBoundingClientRect().height };
    }, [FRAME, EVERY_ANIMATION] as const);
    expect(seen.motions).toEqual([0, 0, 0, 0]);
    for (const height of seen.heights) expect(height).toBeCloseTo(seen.content, 1);
  });

  test('SZT-10: it exposes nothing of its own and is no focus stop; its content is read and reached as if it were not there, clipped or not', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: [fixture('a11y', {}, `<div>${lines(1)}<button class="action">Send</button></div>`)] });
    const it = host(page, 'a11y');
    expect(await it.evaluate((el) => [el.getAttribute('role'), el.getAttribute('tabindex'), el.getAttributeNames().filter((name) => name.startsWith('aria-'))])).toEqual([null, null, []]);
    expect(await it.evaluate((el) => [...el.shadowRoot!.querySelectorAll('*')].filter((node) => node.hasAttribute('role') || node.hasAttribute('tabindex') || (node as HTMLElement).tabIndex >= 0).map((node) => node.className))).toEqual([]);
    // While it grows, the button is clipped below the box, and a Tab still reaches it.
    await it.evaluate((el) => el.firstElementChild!.insertAdjacentHTML('afterbegin', '<div class="line">New</div>'.repeat(6)));
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.className)).toBe('action');
    await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();
  });

  test('SZT-11: settle is emitted once per change with the new width and height, and not for a change that keeps its size along its axis', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: [fixture('settle', {}, `<div>${lines(2)}</div>`)] });
    const it = host(page, 'settle');
    const seen = await watch(it, addLines(1));
    const box = await it.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { width: r.width, height: r.height };
    });
    expect(seen.settles).toHaveLength(1);
    expect(seen.settles[0]!.width).toBeCloseTo(box.width, 1);
    expect(seen.settles[0]!.height).toBeCloseTo(box.height, 1);
    // The same number of lines with other words: nothing moves, nothing settles.
    const same = await watch(it, `(host) => { host.querySelector('.line').textContent = 'Changed'; }`);
    expect(same.begun).toEqual([]);
    expect(same.settles).toEqual([]);
    expect(await it.evaluate((el) => el.hasAttribute('data-resizing'))).toBe(false);
  });

  test('SZT-12: it draws nothing of its own, takes its layout’s width on the block axis, and with both axes moves width and height as one motion', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: [fixture('plain', {}, `<div>${lines(1)}</div>`), fixture('both', { axis: 'both' }, '<span class="line">Short</span>')] });
    const look = await host(page, 'plain').evaluate((el) =>
      [el, ...el.shadowRoot!.querySelectorAll('.box, .content')].map((node) => {
        const s = getComputedStyle(node);
        return [s.backgroundColor, s.borderTopWidth, s.paddingTop, s.paddingLeft, s.boxShadow, s.outlineStyle].join(' ');
      }),
    );
    expect(new Set(look)).toEqual(new Set(['rgba(0, 0, 0, 0) 0px 0px 0px none none']));
    const [own, room] = await host(page, 'plain').evaluate((el) => [el.getBoundingClientRect().width, Number.parseFloat(getComputedStyle(el).inlineSize)]);
    expect(own).toBeCloseTo(room, 1);
    const both = await watch(host(page, 'both'), `(host) => { host.querySelector('.line').innerHTML = 'A longer line<br>and a second'; }`);
    expect(both.begun.map((m) => m.property).sort()).toEqual(['height', 'width']);
    expect(new Set(both.begun.map((m) => m.duration)).size, 'one duration').toBe(1);
    expect(both.settles).toHaveLength(1);
  });

  test('SZT-13: an axis or anchor it does not define is the default, and a duration that is no length of time the system’s — each reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: [fixture('odd', { axis: 'diagonal', anchor: 'middle', duration: -5 }, `<div>${lines(1)}</div>`)] });
    const it = host(page, 'odd');
    expect(seen.some((w) => w.includes('axis "diagonal"') && w.includes('SZT-13'))).toBe(true);
    expect(seen.some((w) => w.includes('anchor "middle"') && w.includes('SZT-13'))).toBe(true);
    expect(seen.some((w) => w.includes('duration "-5"') && w.includes('SZT-13'))).toBe(true);
    const moved = await watch(it, addLines(1), { frames: false });
    expect(moved.begun.map((m) => [m.property, m.duration])).toEqual([['height', await resolveToken(page, T('motion-duration'), 'duration')]]);
    await it.evaluate((el) => el.setAttribute('duration', ''));
    await expect.poll(() => seen.some((w) => w.includes('duration "NaN"'))).toBe(true);
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

  test('every axis and every anchor has a fixture, and one is right to left', async () => {
    expect(new Set(spec.fixtures.map((f) => (f.props.axis as string) ?? 'block'))).toEqual(new Set(['block', 'inline', 'both']));
    expect(new Set(spec.fixtures.map((f) => (f.props.anchor as string) ?? 'start'))).toEqual(new Set(['start', 'end', 'center']));
    expect(spec.fixtures.some((f) => (f as Fixture).direction === 'rtl')).toBe(true);
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expectBaseline(stage(page, f.id), [spec.name, `${f.id}.png`]);
    });
  }
});
