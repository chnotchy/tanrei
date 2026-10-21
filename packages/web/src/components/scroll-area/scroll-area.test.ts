// <tanrei-scroll-area>, driven by specs/scroll-area.spec.json: every behaviour id (SCA-1…17) is cited by a test title,
// every fixture has a baseline, and every length, color, duration and easing is read back from the tokens — never from
// a number written here.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, mountFixtures, resolveColor, resolveToken, rootTokens, tab, tabTo } from '../../../test/harness.js';
import { decodePng } from '../../../test/png.js';
import { motionEnded } from '../../../test/motions.js';
import { allSettled } from '../../../test/settled.js';
import { transitionsRun, watchTransitions } from '../../../test/transitions.js';

const spec = loadSpec('scroll-area');
type P = Page;
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-scroll-area`);
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const box = (page: P, id: string) => host(page, id).locator('.scroll');
const edge = (page: P, id: string, name: string) => host(page, id).locator(`.edge.${name}`);
const band = (page: P, id: string, name: string) => edge(page, id, name).locator('.band');
const T = (name: string) => `--tanrei-comp-scroll-area-${name}`;
const css = (locator: Locator, property: string, pseudo?: string) => locator.evaluate((el, [p, s]) => getComputedStyle(el, s || undefined).getPropertyValue(p!), [property, pseudo] as const);
const rect = async (locator: Locator) => (await locator.boundingBox())!;
const fixture = (id: string, props: Fixture['props'] = {}, rest: Partial<Fixture> = {}): Fixture => ({ id, props, slots: { default: 'Long content' }, ...rest }) as Fixture;
const EDGE_NAMES = ['top', 'bottom', 'start', 'end'] as const;

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
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
/** Colors in a screenshot are compared within antialiasing and compositing noise. */
const near = (a: string, b: string, within = 6) => {
  const [x, y] = [a, b].map((c) => c.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number));
  return x.every((v, i) => Math.abs(v - y[i]) <= within);
};

/** The edges whose mark is shown (data-<edge> on the frame) — what SCA-2 draws. */
const marked = (locator: Locator) => locator.evaluate((el) => ['top', 'bottom', 'start', 'end'].filter((e) => el.shadowRoot!.querySelector('.frame')!.hasAttribute(`data-${e}`)));
/** Scrolls the box to `to` (top, or along the inline axis from the start edge) and waits until the marks it changes are written. */
async function scrollTo(locator: Locator, to: { top?: number; fromStart?: number }, expected: string[]) {
  // A scroll that moves the box has ended (scrollend) before the test goes on, as a person's scroll ends before the next thing they do.
  await locator.evaluate(async (el, t) => {
    const b = el.shadowRoot!.querySelector<HTMLElement>('.scroll')!;
    const [top, left] = [b.scrollTop, b.scrollLeft];
    const ended = new Promise((resolve) => b.addEventListener('scrollend', resolve, { once: true }));
    if (t.top !== undefined) b.scrollTop = t.top;
    if (t.fromStart !== undefined) b.scrollLeft = getComputedStyle(b).direction === 'rtl' ? -t.fromStart : t.fromStart;
    if (b.scrollTop !== top || b.scrollLeft !== left) await ended;
  }, to);
  await expect.poll(() => marked(locator)).toEqual(expected);
}
/** The far end of the box's scroll: its height (or width) less its client size. */
const extent = (locator: Locator, axis: 'block' | 'inline') =>
  locator.evaluate((el, a) => {
    const b = el.shadowRoot!.querySelector<HTMLElement>('.scroll')!;
    return a === 'block' ? b.scrollHeight - b.clientHeight : b.scrollWidth - b.clientWidth;
  }, axis);
/** Where a line of the content begins: a scroll that puts it at the top shows a line on a container color at the edge. */
const lineTop = (locator: Locator, index: number) =>
  locator.evaluate((el, i) => el.querySelectorAll<HTMLElement>('.scroll-fixture-line')[i]!.getBoundingClientRect().top - el.shadowRoot!.querySelector('.content')!.getBoundingClientRect().top, index);

/**
 * The form an area draws, read from what it draws: the fade masks the box, the blur shows its layers, none hides the
 * edges, and the band is a gradient (shadow) or a fill (line).
 */
const drawnForm = (locator: Locator) =>
  locator.evaluate((el) => {
    const root = el.shadowRoot!;
    const scroll = getComputedStyle(root.querySelector('.scroll')!);
    if (scroll.maskImage && scroll.maskImage !== 'none') return 'fade';
    const edgeEl = root.querySelector('.edge');
    if (!edgeEl || getComputedStyle(edgeEl).display === 'none') return 'none';
    const layer = root.querySelector('.layer');
    if (layer && getComputedStyle(layer).display !== 'none') return 'blur';
    return getComputedStyle(root.querySelector('.band')!).backgroundImage.includes('gradient') ? 'shadow' : 'line';
  });

test.describe('behavior', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: true });
  });

  test('SCA-1: as large as its layout gives it, the content laid out at its width, scrolled with the platform’s own scrolling where it does not fit; no fill, edge, corner or elevation, and the platform’s scroll bars', async ({ page }) => {
    // The stage gives the host 280 × 160; the box is that size.
    for (const id of ['default', 'sideways']) {
      expect(await rect(host(page, id)), id).toMatchObject({ width: 280, height: 160 });
      expect(await rect(box(page, id)), id).toMatchObject({ width: 280, height: 160 });
    }
    // Lines wrap at the box's width and scroll up and down only; a row that cannot wrap scrolls sideways only.
    const lines = await host(page, 'default').evaluate((el) => {
      const b = el.shadowRoot!.querySelector<HTMLElement>('.scroll')!;
      return { line: el.querySelector<HTMLElement>('.scroll-fixture-line')!.getBoundingClientRect().width, client: b.clientWidth, sw: b.scrollWidth, down: b.scrollHeight > b.clientHeight };
    });
    expect(lines.line).toBe(lines.client);
    expect([lines.sw, lines.down]).toEqual([lines.client, true]);
    expect(await extent(host(page, 'sideways'), 'inline')).toBeGreaterThan(0);
    expect(await extent(host(page, 'sideways'), 'block')).toBe(0);
    // The platform's own scrolling: the wheel over it, and the keys while the box has focus.
    await scrollTo(host(page, 'none'), { top: 0 }, ['bottom']);
    await host(page, 'none').scrollIntoViewIfNeeded();
    const top = () => box(page, 'none').evaluate((el) => el.scrollTop);
    const at = await rect(box(page, 'none'));
    await page.mouse.move(at.x + at.width / 2, at.y + at.height / 2);
    await page.mouse.wheel(0, 120);
    await expect.poll(top).toBeGreaterThan(0);
    const wheeled = await top();
    await box(page, 'none').focus();
    await page.keyboard.press('PageDown');
    await expect.poll(top).toBeGreaterThan(wheeled);
    // Nothing of its own: no fill, edge, corner or elevation, and the scroll bars are the browser's.
    for (const part of [host(page, 'default'), box(page, 'default')]) {
      expect(await css(part, 'background-color')).toBe('rgba(0, 0, 0, 0)');
      expect(await css(part, 'background-image')).toBe('none');
      expect(await css(part, 'border-top-width')).toBe('0px');
      expect(await css(part, 'border-top-left-radius')).toBe('0px');
      expect(await css(part, 'box-shadow')).toBe('none');
    }
    expect(await css(box(page, 'default'), 'overflow-y')).toBe('auto');
    // The scroll bars are what the browser gives any scroll box (Playwright's Firefox hides every scroll bar, a plain one's too).
    const plain = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.overflow = 'auto';
      document.body.append(probe);
      const style = getComputedStyle(probe);
      const seen = [style.scrollbarWidth, style.scrollbarColor];
      probe.remove();
      return seen;
    });
    expect([await css(box(page, 'default'), 'scrollbar-width'), await css(box(page, 'default'), 'scrollbar-color')]).toEqual(plain);
    // A height of its layout's: a max-height, and a share of a flex column, are the box's — it scrolls, never grows.
    await mountFixtures(page, spec, {
      fixtures: [fixture('capped'), fixture('shared')],
      lead: '<style>[data-fixture="capped"] tanrei-scroll-area { block-size: auto; max-block-size: 120px; } [data-fixture="shared"] { display: flex; flex-direction: column; block-size: 200px; box-sizing: border-box; } [data-fixture="shared"] tanrei-scroll-area { block-size: auto; flex: 1; }</style>',
    });
    expect((await rect(box(page, 'capped'))).height).toBe(120);
    expect((await rect(box(page, 'shared'))).height).toBe(200 - 32);
    expect(await extent(host(page, 'shared'), 'block')).toBeGreaterThan(0);
  });

  test('SCA-2: each watched edge is marked while content lies beyond it, and drawn and faded by itself; an edge not named is never marked', async ({ page }) => {
    const area = host(page, 'default');
    const far = await extent(area, 'block');
    await scrollTo(area, { top: 0 }, ['bottom']);
    const shown = () => Promise.all(['top', 'bottom'].map((name) => css(band(page, 'default', name), 'opacity')));
    expect(await shown()).toEqual(['0', '1']);
    await scrollTo(area, { top: far / 2 }, ['top', 'bottom']);
    expect(await shown()).toEqual(['1', '1']);
    await scrollTo(area, { top: far }, ['top']);
    expect(await shown()).toEqual(['1', '0']);
    // The sideways fixture watches start and end: no top or bottom edge is drawn.
    expect(await host(page, 'sideways').evaluate((el) => [...el.shadowRoot!.querySelectorAll('.edge')].map((e) => e.classList[1]))).toEqual(['start', 'end']);
    await scrollTo(host(page, 'sideways'), { fromStart: 0 }, ['end']);
    // edges="top": the bottom has content beyond it, and is not marked.
    await host(page, 'default').evaluate(async (el: any) => {
      el.edges = ['top'];
      await el.updateComplete;
    });
    await expect.poll(() => marked(area)).toEqual(['top']);
    expect(await edge(page, 'default', 'bottom').count()).toBe(0);
    await scrollTo(area, { top: 0 }, []);
  });

  test('SCA-3: shadow is a band shadow.extent deep in shadow.color, full at the edge and none at its inner end, with no line; set to the surface it stands on, it joins that surface with no seam', async ({ page }) => {
    const area = host(page, 'default');
    expect(await drawnForm(area)).toBe('shadow');
    const depth = await resolveToken(page, T('shadow-extent'));
    expect((await rect(band(page, 'default', 'top'))).height).toBe(depth);
    expect((await rect(band(page, 'default', 'top'))).width).toBe(280);
    const color = await resolveColor(page, T('shadow-color'));
    expect(color).toBe(await resolveColor(page, '--tanrei-sys-color-surface'));
    const image = await css(band(page, 'default', 'top'), 'background-image');
    expect(image).toBe(`linear-gradient(${color}, rgba(0, 0, 0, 0))`);
    expect(await css(band(page, 'default', 'bottom'), 'background-image')).toBe(`linear-gradient(to top, ${color}, rgba(0, 0, 0, 0))`);
    expect(await css(edge(page, 'default', 'top'), 'border-top-width')).toBe('0px');
    // The verify: on a surface that is not the plain surface, shadow.color set to it — the band meets the stage with no seam.
    await mountFixtures(page, spec, { reducedMotion: true, fixtures: [fixture('on-container')], lead: `<style>[data-fixture="on-container"] { background: var(--tanrei-sys-color-surface-container-highest); ${T('shadow-color')}: var(--tanrei-sys-color-surface-container-highest); } .scroll-fixture-line:nth-child(odd) { background: var(--tanrei-sys-color-primary-container); }</style>` });
    const on = host(page, 'on-container');
    await scrollTo(on, { top: await lineTop(on, 2) }, ['top', 'bottom']);
    const shot = decodePng(await stage(page, 'on-container').screenshot({ animations: 'disabled' }));
    const dpr = await page.evaluate(() => devicePixelRatio);
    const surface = await resolveColor(page, '--tanrei-sys-color-surface-container-highest');
    const x = Math.round(150 * dpr);
    // The stage above the box, the box's first row, and the band's inner end (the line's own color under it).
    expect(near(shot.at(x, Math.round(8 * dpr)), surface), shot.at(x, Math.round(8 * dpr))).toBe(true);
    expect(near(shot.at(x, Math.round(16 * dpr)), surface), shot.at(x, Math.round(16 * dpr))).toBe(true);
    expect(near(shot.at(x, Math.round((16 + depth + 2) * dpr)), await resolveColor(page, '--tanrei-sys-color-primary-container'))).toBe(true);
  });

  test('SCA-4: fade fades the content itself toward the edge — none of it at the edge, all of it fade.extent in — and draws no color and no line', async ({ page }) => {
    const [fade, none] = [host(page, 'fade'), host(page, 'none')];
    expect(await drawnForm(fade)).toBe('fade');
    expect(await edge(page, 'fade', 'top').evaluate((el) => getComputedStyle(el).display)).toBe('none');
    const e = await resolveToken(page, T('fade-extent'));
    for (const area of [fade, none]) await scrollTo(area, { top: await lineTop(area, 2) }, ['top', 'bottom']);
    const dpr = await page.evaluate(() => devicePixelRatio);
    const [faded, plain] = await Promise.all([fade, none].map(async (area) => decodePng(await area.screenshot({ animations: 'disabled' }))));
    const x = Math.round(200 * dpr);
    const surface = await resolveColor(page, '--tanrei-sys-color-surface');
    const line = await resolveColor(page, '--tanrei-sys-color-surface-container-highest');
    // At the edge the stage shows through; fade.extent in, the content is whole — the same as with no mark. (Two pixels
    // in: WebKit scrolls by whole pixels, so the line may begin under a pixel down.)
    const edgeRow = Math.round(2 * dpr);
    expect(near(plain.at(x, edgeRow), line), plain.at(x, edgeRow)).toBe(true);
    expect(near(faded.at(x, edgeRow), surface, 10), faded.at(x, edgeRow)).toBe(true);
    expect(faded.at(x, Math.round((e + 1) * dpr))).toBe(plain.at(x, Math.round((e + 1) * dpr)));
    // Halfway in, partly faded: between the two.
    const half = faded.at(x, Math.round((e / 2) * dpr));
    expect(near(half, surface, 2) || near(half, line, 2), half).toBe(false);
    // The mask is moved in only at an edge with content beyond it: at the top of the scroll the top band lies outside.
    await scrollTo(fade, { top: 0 }, ['bottom']);
    expect((await css(box(page, 'fade'), 'mask-position')).split(',')[0].trim()).toBe(`0px ${-e}px`);
  });

  test('SCA-5: line is a line line.width thick in line.color along the whole edge, inside the box', async ({ page }) => {
    expect(await drawnForm(host(page, 'line'))).toBe('line');
    const width = await resolveToken(page, T('line-width'));
    const [area, top, bottom] = [await rect(box(page, 'line')), await rect(band(page, 'line', 'top')), await rect(band(page, 'line', 'bottom'))];
    expect(top).toEqual({ x: area.x, y: area.y, width: area.width, height: width });
    expect(bottom).toEqual({ x: area.x, y: area.y + area.height - width, width: area.width, height: width });
    expect(await css(band(page, 'line', 'top'), 'background-color')).toBe(await resolveColor(page, T('line-color')));
    expect(await css(band(page, 'line', 'top'), 'background-image')).toBe('none');
  });

  test('SCA-6: blur blurs a band blur.extent deep in blur.layers layers of evenly stepped radius, each masked to its step, with no line and no tint', async ({ page }) => {
    const area = host(page, 'blur');
    expect(await drawnForm(area)).toBe('blur');
    const [depth, radius, count] = [await resolveToken(page, T('blur-extent')), await resolveToken(page, T('blur-radius')), await page.evaluate((n) => Number(getComputedStyle(document.documentElement).getPropertyValue(n)), T('blur-layers'))];
    expect(count).toBeGreaterThan(1);
    expect((await rect(edge(page, 'blur', 'top'))).height).toBe(depth);
    const layers = await edge(page, 'blur', 'top').evaluate((el) =>
      [...el.querySelectorAll('.layer')].map((layer) => {
        const s = getComputedStyle(layer);
        return { filter: s.backdropFilter, mask: s.maskImage, background: s.backgroundColor, opacity: s.opacity };
      }),
    );
    expect(layers.length).toBe(count);
    const step = depth / count;
    layers.forEach((layer, index) => {
      const i = index + 1;
      // Radius blur.radius × i / n; the strongest (i = n) at the edge, each full at its own depth and none a step either side.
      expect(layer.filter, `layer ${i}`).toBe(`blur(${(radius * i) / count}px)`);
      const at = (count - i) * step;
      expect(layer.mask, `layer ${i}`).toBe(`linear-gradient(rgba(0, 0, 0, 0) ${at - step}px, rgb(0, 0, 0) ${at}px, rgba(0, 0, 0, 0) ${at + step}px)`);
      expect([layer.background, layer.opacity]).toEqual(['rgba(0, 0, 0, 0)', '1']);
    });
    // No line: the band of the shadow and the line is not drawn.
    expect(await band(page, 'blur', 'top').evaluate((el) => getComputedStyle(el).display)).toBe('none');
  });

  test('SCA-7: auto takes comp.scroll-area.scroll-edge, which follows sys.behavior.scroll-edge; a value names its form whatever the tokens say; a change draws the other form at once, keeping the scroll position and focus', async ({ page }) => {
    const area = host(page, 'default');
    expect(await drawnForm(area)).toBe('shadow');
    // The component token, set apart from the system's.
    await rootTokens(page, { [T('scroll-edge')]: 'fade' });
    await expect.poll(() => drawnForm(area)).toBe('fade');
    await rootTokens(page, { [T('scroll-edge')]: '', '--tanrei-sys-behavior-scroll-edge': 'line' });
    await expect.poll(() => drawnForm(area)).toBe('line');
    expect(await drawnForm(host(page, 'blur'))).toBe('blur');
    await rootTokens(page, { '--tanrei-sys-behavior-scroll-edge': '' });
    // Each preset's answer.
    for (const [system, form] of [['m3-like', 'line'], ['cupertino', 'blur']] as const) {
      await mountFixtures(page, spec, { reducedMotion: true, system, fixtures: spec.fixtures.filter((f) => ['default', 'fade'].includes(f.id)) });
      // A preset this test names no form for draws the one its system token names.
      const named = form ?? (await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tanrei-sys-behavior-scroll-edge').trim()));
      expect(await drawnForm(host(page, 'default')), system).toBe(named);
      expect(await drawnForm(host(page, 'fade')), system).toBe('fade');
    }
    // A change of form while focused and scrolled: drawn at once (nothing in transition), the same place and focus.
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: spec.fixtures.filter((f) => f.id === 'default') });
    await allSettled(page);
    await tabTo(page, box(page, 'default'));
    const before = await box(page, 'default').evaluate((el) => el.scrollTop);
    for (const form of ['fade', 'line', 'blur', 'none', 'shadow'] as const) {
      const seen = await area.evaluate(async (el: any, f) => {
        el.scrollEdge = f;
        await el.updateComplete;
        const root = el.shadowRoot as ShadowRoot;
        const moving = root.getAnimations().filter((a) => a instanceof CSSTransition).map((a) => (a as CSSTransition).transitionProperty);
        return { moving, top: root.querySelector('.scroll')!.scrollTop, focused: root.activeElement === root.querySelector('.scroll') };
      }, form);
      expect(seen, form).toEqual({ moving: [], top: before, focused: true });
      expect(await drawnForm(area), form).toBe(form);
    }
  });

  test('SCA-7: where the browser has no style queries, the form is still the token’s and the attribute’s, and follows a system switched on the root', async ({ page }) => {
    expect(await drawnForm(host(page, 'default'))).toBe('shadow');
    expect(await drawnForm(host(page, 'line'))).toBe('line');
    await mountFixtures(page, spec, { reducedMotion: true, system: 'm3-like', fixtures: spec.fixtures.filter((f) => ['default', 'blur'].includes(f.id)) });
    expect(await drawnForm(host(page, 'default'))).toBe('line');
    expect(await drawnForm(host(page, 'blur'))).toBe('blur');
    // The system switched on the root while the area is shown: the default system's shadow, drawn at once.
    await page.evaluate(() => document.documentElement.removeAttribute('data-tanrei-system'));
    await expect.poll(() => drawnForm(host(page, 'default'))).toBe('shadow');
    expect(await drawnForm(host(page, 'blur'))).toBe('blur');
  });

  test('SCA-8: an edge fades in and out over motion.duration with motion.easing, starting one transition, and changes nothing else — its size, the content and the other marks stay', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: spec.fixtures.filter((f) => ['default', 'fade'].includes(f.id)) });
    await allSettled(page);
    const duration = await resolveToken(page, T('motion-duration'), 'duration');
    const ease = await easing(page, T('motion-easing'));
    expect(duration).toBeGreaterThan(0);
    for (const id of ['default', 'fade']) {
      const area = host(page, id);
      await scrollTo(area, { top: 0 }, ['bottom']);
      await motionEnded(area);
      const sizes = await area.evaluate((el) => [el.getBoundingClientRect().height, el.querySelector<HTMLElement>('.scroll-fixture-line')!.getBoundingClientRect().width]);
      await watchTransitions(area);
      await scrollTo(area, { top: 40 }, ['top', 'bottom']);
      await expect.poll(() => transitionsRun(area), id).toHaveLength(1);
      const [run] = await transitionsRun(area);
      // (The fade's mask moves on one axis: an engine names the longhand, -webkit-mask-position-y in Chromium.)
      expect(run, id).toMatchObject({ property: id === 'fade' ? expect.stringMatching(/mask-position/) : 'opacity', duration, on: expect.stringContaining(id === 'fade' ? 'scroll' : 'band') });
      expect(run.easing, id).toContain(ease.replace(/^cubic-bezier/, ''));
      await motionEnded(area);
      expect(await area.evaluate((el) => [el.getBoundingClientRect().height, el.querySelector<HTMLElement>('.scroll-fixture-line')!.getBoundingClientRect().width]), id).toEqual(sizes);
      expect(await transitionsRun(area), id).toHaveLength(1);
    }
  });

  test('SCA-8: where motion is reduced an edge changes at once', async ({ page }) => {
    await allSettled(page);
    const area = host(page, 'default');
    await scrollTo(area, { top: 0 }, ['bottom']);
    await watchTransitions(area);
    await scrollTo(area, { top: 40 }, ['top', 'bottom']);
    expect(await css(band(page, 'default', 'top'), 'opacity')).toBe('1');
    expect(await transitionsRun(area)).toEqual([]);
  });

  test('SCA-8: count the work — scrolled end to end, the script runs only when an edge changes (two notices for one edge on and off), reads no layout, adds no scroll listener, and starts one transition for each edge that changes', async ({ page }) => {
    // What the area registers and reads is watched from before it is made: a scroll, wheel or touch listener of its own,
    // and every read of the layout or of the scroll's offsets.
    await page.evaluate(() => {
      const seen = ((window as any).__seen = { listeners: [] as string[], reads: 0 });
      const add = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function (this: EventTarget, type: string, ...rest: any[]) {
        if (/^(scroll|wheel|touchmove|pointermove)$/.test(type)) seen.listeners.push(type);
        return (add as any).call(this, type, ...rest);
      } as typeof add;
      const counted = (proto: object, name: string) => {
        const d = Object.getOwnPropertyDescriptor(proto, name)!;
        if (d.get) Object.defineProperty(proto, name, { ...d, get(this: unknown) { seen.reads++; return d.get!.call(this); } });
        else Object.defineProperty(proto, name, { ...d, value(this: unknown, ...args: unknown[]) { seen.reads++; return d.value.apply(this, args); } });
      };
      for (const name of ['getBoundingClientRect', 'getClientRects', 'scrollTop', 'scrollLeft', 'scrollHeight', 'scrollWidth', 'clientHeight', 'clientWidth', 'clientTop', 'clientLeft']) counted(Element.prototype, name);
      for (const name of ['offsetWidth', 'offsetHeight', 'offsetTop', 'offsetLeft']) counted(HTMLElement.prototype, name);
    });
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: [fixture('long', {}, { slots: { default: 'Long content' } })] });
    await allSettled(page);
    const area = host(page, 'long');
    expect(await page.evaluate(() => (window as any).__seen.listeners)).toEqual([]);
    await scrollTo(area, { top: 0 }, ['bottom']);
    await motionEnded(area);
    await watchTransitions(area);
    // Down to the end and back up, a step a frame, as a wheel scrolls; nothing is read by the test while it runs.
    const counted = await area.evaluate(async (el) => {
      const b = el.shadowRoot!.querySelector<HTMLElement>('.scroll')!;
      const seen = (window as any).__seen as { reads: number };
      const counts = () => ({ ...((globalThis as any).__tanreiCounts ?? {}) }) as Record<string, number>;
      const frame = () => new Promise((r) => requestAnimationFrame(r));
      const far = b.scrollHeight - b.clientHeight;
      const [startCounts, startReads] = [counts(), seen.reads];
      for (let top = 24; top < far + 24; top += 24) {
        b.scrollTop = top;
        await frame();
      }
      for (let i = 0; i < 4; i++) await frame();
      const down = { counts: counts(), reads: seen.reads };
      for (let top = far - 24; top > -24; top -= 24) {
        b.scrollTop = top;
        await frame();
      }
      for (let i = 0; i < 4; i++) await frame();
      const diff = (a: Record<string, number>, z: Record<string, number>) => Object.fromEntries(Object.keys(z).filter((k) => k.startsWith('scroll-area.') && (z[k] ?? 0) !== (a[k] ?? 0)).map((k) => [k, z[k] - (a[k] ?? 0)]));
      // The test's own reads: the two of `far` above, before the counts were taken.
      return { down: diff(startCounts, down.counts), up: diff(down.counts, counts()), reads: [down.reads - startReads, seen.reads - down.reads] };
    });
    // Down: the top turns on, the bottom turns off — one notice each; up: the same backwards.
    expect(counted.down).toEqual({ 'scroll-area.intersected': 2 });
    expect(counted.up).toEqual({ 'scroll-area.intersected': 2 });
    expect(counted.reads).toEqual([0, 0]);
    await motionEnded(area);
    expect((await transitionsRun(area)).map((run) => `${run.on} ${run.property}`)).toEqual(['div.band opacity', 'div.band opacity', 'div.band opacity', 'div.band opacity']);
  });

  test('SCA-9: with forced colors every form is the line of SCA-5 in the platform’s text color; none stays none', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    const width = await resolveToken(page, T('line-width'));
    const text = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.cssText = 'forced-color-adjust: none; background-color: CanvasText';
      document.body.appendChild(probe);
      const value = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return value;
    });
    for (const id of ['default', 'fade', 'line', 'blur']) {
      expect(await drawnForm(host(page, id)), id).toBe('line');
      expect((await rect(band(page, id, 'top'))).height, id).toBe(width);
      expect(await css(band(page, id, 'top'), 'background-color'), id).toBe(text);
      expect(await css(band(page, id, 'top'), 'opacity'), id).toBe('1');
    }
    expect(await drawnForm(host(page, 'none'))).toBe('none');
    await page.emulateMedia({ forcedColors: 'none' });
    expect(await drawnForm(host(page, 'fade'))).toBe('fade');
  });

  test('SCA-9: where the browser cannot blur what lies behind a band, blur draws the shadow', async ({ page }) => {
    // The blur form stands inside `@supports (backdrop-filter: …)`: taken out of the area's sheet, the browser is one
    // without backdrop filters, and the shadow — the system's first form — is drawn.
    expect(await drawnForm(host(page, 'blur'))).toBe('blur');
    const removed = await host(page, 'blur').evaluate((el) => {
      let count = 0;
      for (const sheet of el.shadowRoot!.adoptedStyleSheets) {
        for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
          const rule = sheet.cssRules[i];
          if (rule instanceof CSSSupportsRule && rule.conditionText.includes('backdrop-filter')) {
            sheet.deleteRule(i);
            count++;
          }
        }
      }
      return count;
    });
    expect(removed).toBe(1);
    expect(await drawnForm(host(page, 'blur'))).toBe('shadow');
    expect((await rect(band(page, 'blur', 'top'))).height).toBe(await resolveToken(page, T('shadow-extent')));
  });

  test('SCA-10: while the content does not fit and nothing inside takes focus, the box is one focus stop, a region named by label; otherwise no stop and no role', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      reducedMotion: true,
      fixtures: [
        fixture('named', { label: 'Messages' }),
        fixture('holding', { label: 'Messages' }, { content: '<button type="button">Reply</button>' }),
        fixture('fits', { label: 'Messages' }, { slots: undefined, content: '<p>Short</p>' }),
        fixture('nameless'),
      ],
    });
    const stop = (id: string) => box(page, id).evaluate((el) => [el.getAttribute('tabindex'), el.getAttribute('role'), el.getAttribute('aria-label')]);
    expect(await stop('named')).toEqual(['0', 'region', 'Messages']);
    expect(await stop('holding')).toEqual([null, null, null]);
    expect(await stop('fits')).toEqual([null, null, null]);
    // No name: still a stop, and reported.
    expect(await stop('nameless')).toEqual(['0', 'region', null]);
    expect(seen.filter((text) => text.includes('SCA-10'))).toHaveLength(1);
    // A keyboard reaches it and scrolls it (Page Down: WebKit's arrow keys scroll the page's scroll box, not a focused one).
    await tabTo(page, box(page, 'named'));
    const before = await box(page, 'named').evaluate((el) => el.scrollTop);
    await page.keyboard.press('PageDown');
    await expect.poll(() => box(page, 'named').evaluate((el) => el.scrollTop)).toBeGreaterThan(before);
    // Something focusable put inside: no longer a stop. Taken away again: a stop again.
    await host(page, 'named').evaluate((el) => el.insertAdjacentHTML('afterbegin', '<a href="#top" id="added">Top</a>'));
    await expect.poll(() => stop('named')).toEqual([null, null, null]);
    await page.locator('#added').evaluate((el) => el.remove());
    await expect.poll(() => stop('named')).toEqual(['0', 'region', 'Messages']);
    // The content made to fit: no stop.
    await host(page, 'named').evaluate((el) => el.style.setProperty('block-size', '2000px'));
    await expect.poll(() => stop('named')).toEqual([null, null, null]);
  });

  test('SCA-11: keyboard focus shows the focus indicator inside the box’s edge, over every mark and never faded, without animation; pointer focus shows none', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: true, fixtures: [fixture('focused', { label: 'Messages', scrollEdge: 'fade' })] });
    const ring = host(page, 'focused').locator('.ring');
    const outer = await resolveToken(page, '--tanrei-sys-focus-outer-width');
    // Pointer focus: none.
    const at = await rect(box(page, 'focused'));
    await page.mouse.click(at.x + at.width / 2, at.y + at.height / 2);
    expect(await box(page, 'focused').evaluate((el) => el.getRootNode() instanceof ShadowRoot && (el.getRootNode() as ShadowRoot).activeElement === el)).toBe(true);
    expect(await css(ring, 'outline-style')).toBe('none');
    await page.mouse.click(1, 1);
    await tabTo(page, box(page, 'focused'));
    expect(await css(ring, 'outline-style')).toBe('solid');
    expect(Number.parseFloat(await css(ring, 'outline-width'))).toBe(outer);
    expect(await css(ring, 'outline-color')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    // Inside the box's edge: the ring's box is the box's, its outline drawn inward.
    expect(await rect(ring)).toEqual(at);
    expect(Number.parseFloat(await css(ring, 'outline-offset'))).toBe(-outer);
    // Over every mark (after them, never masked) and not animated.
    const order = await host(page, 'focused').evaluate((el) => [...el.shadowRoot!.querySelector('.frame')!.children].map((c) => c.classList[0]));
    expect(order.indexOf('ring')).toBeGreaterThan(Math.max(order.lastIndexOf('edge'), order.indexOf('scroll')));
    expect(await css(ring, 'mask-image')).toBe('none');
    expect(await css(ring, 'transition-duration')).toBe('0s');
    expect(await css(ring, 'border-top-width', '::after')).toBe(`${await resolveToken(page, '--tanrei-sys-focus-inner-width')}px`);
  });

  test('SCA-11: where the focus style is glow, the same two focus colors are a halo inside the box', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: true, fixtures: [fixture('glow', { label: 'Messages' })] });
    await rootTokens(page, { '--tanrei-sys-behavior-focus-style': 'glow' });
    await tabTo(page, box(page, 'glow'));
    const ring = host(page, 'glow').locator('.ring');
    expect(await css(ring, 'outline-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(ring, 'box-shadow', '::after')).toContain(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
  });

  test('SCA-12: every mark is over the content, hidden from assistive technology, and lets presses, hovers and scrolls reach the content under it', async ({ page }) => {
    for (const id of ['default', 'line', 'blur', 'sideways']) {
      const parts = await host(page, id).evaluate((el) => [...el.shadowRoot!.querySelectorAll('.edge')].map((e) => [e.getAttribute('aria-hidden'), getComputedStyle(e).pointerEvents, getComputedStyle(e.querySelector('.band')!).pointerEvents]));
      expect(parts.length, id).toBeGreaterThan(0);
      for (const part of parts) expect(part, id).toEqual(['true', 'none', 'none']);
    }
    // A press at the top edge, inside the band, reaches the line under it; the wheel there scrolls the box.
    const area = host(page, 'default');
    const top = await rect(band(page, 'default', 'top'));
    const hit = await page.evaluate(([x, y]) => (document.elementFromPoint(x, y) as HTMLElement | null)?.className, [top.x + 40, top.y + 2]);
    expect(hit).toBe('scroll-fixture-line');
    const before = await box(page, 'default').evaluate((el) => el.scrollTop);
    await page.mouse.move(top.x + 40, top.y + 2);
    await page.mouse.wheel(0, -60);
    await expect.poll(() => box(page, 'default').evaluate((el) => el.scrollTop)).toBeLessThan(before);
    // Order: the marks after the box, so they are drawn over it.
    const order = await area.evaluate((el) => [...el.shadowRoot!.querySelector('.frame')!.children].map((c) => c.classList[0]));
    expect(order.indexOf('edge')).toBeGreaterThan(order.indexOf('scroll'));
  });

  test('SCA-13: right to left, start is the right edge and end the left, a sideways scroll begins at the right, and each form is drawn the same toward its own edge', async ({ page }) => {
    const [ltr, rtl] = [host(page, 'sideways'), host(page, 'rtl-sideways')];
    const area = await rect(box(page, 'rtl-sideways'));
    const [start, end] = [await rect(edge(page, 'rtl-sideways', 'start')), await rect(edge(page, 'rtl-sideways', 'end'))];
    const depth = await resolveToken(page, T('shadow-extent'));
    expect(start).toEqual({ x: area.x + area.width - depth, y: area.y, width: depth, height: area.height });
    expect(end).toEqual({ x: area.x, y: area.y, width: depth, height: area.height });
    expect((await rect(edge(page, 'sideways', 'start'))).x).toBe((await rect(box(page, 'sideways'))).x);
    // Full at the edge: toward the right at the start in right to left, toward the left in left to right.
    const color = await resolveColor(page, T('shadow-color'));
    expect(await css(band(page, 'rtl-sideways', 'start'), 'background-image')).toBe(`linear-gradient(to left, ${color}, rgba(0, 0, 0, 0))`);
    expect(await css(band(page, 'sideways', 'start'), 'background-image')).toBe(`linear-gradient(to right, ${color}, rgba(0, 0, 0, 0))`);
    // At the start of the scroll, the first tile stands at the right and only the end (left) is marked.
    await scrollTo(rtl, { fromStart: 0 }, ['end']);
    const first = await rtl.locator('.scroll-fixture-tile').first().boundingBox();
    expect(first!.x + first!.width).toBe(area.x + area.width);
    expect(await box(page, 'rtl-sideways').evaluate((el) => el.scrollLeft)).toBe(0);
    await scrollTo(rtl, { fromStart: 100 }, ['start', 'end']);
    expect(await box(page, 'rtl-sideways').evaluate((el) => el.scrollLeft)).toBe(-100);
    await scrollTo(ltr, { fromStart: 0 }, ['end']);
  });

  test('SCA-14: the direction comes from the nearest ancestor that sets one; a change of it while shown is drawn at once, keeping the scroll position from the start edge', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: [fixture('turning', { edges: ['start', 'end'], scrollEdge: 'fade' }, { slots: { default: 'A wide row' } })] });
    await allSettled(page);
    const area = host(page, 'turning');
    // No direction anywhere: the platform's, left to right.
    expect(await page.evaluate(() => document.documentElement.getAttribute('dir'))).toBe(null);
    await scrollTo(area, { fromStart: 100 }, ['start', 'end']);
    await motionEnded(area);
    const leftMask = async () => (await css(box(page, 'turning'), 'mask-position')).split(',').map((p) => p.trim());
    const ltrMask = await leftMask();
    // The stage — an ancestor inside the page, not the root — turns right to left after the first render.
    const seen = await area.evaluate(async (el) => {
      const stageEl = el.closest<HTMLElement>('[data-fixture]')!;
      stageEl.dir = 'rtl';
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const root = el.shadowRoot!;
      return {
        left: root.querySelector<HTMLElement>('.scroll')!.scrollLeft,
        // The mask as drawn in that frame (a transition's value, were one running).
        mask: getComputedStyle(root.querySelector('.scroll')!).maskPosition,
        startAt: getComputedStyle(root.querySelector('.edge.start')!).left,
      };
    });
    // (The fade draws no edge box; the start edge's place is its style: no longer at the left.)
    expect({ left: seen.left, startAt: seen.startAt }).toEqual({ left: -100, startAt: 'auto' });
    // The fade's two sideways layers have swapped sides with the edges, and nothing ran to get there: the first frame's
    // mask is the one at rest.
    await motionEnded(area);
    const rtlMask = await leftMask();
    expect(seen.mask.split(',').map((p) => p.trim())).toEqual(rtlMask);
    expect([rtlMask[2], rtlMask[3]]).toEqual([ltrMask[2], ltrMask[3]]);
    await expect.poll(() => marked(area)).toEqual(['start', 'end']);
    // And back.
    const back = await area.evaluate(async (el) => {
      el.closest<HTMLElement>('[data-fixture]')!.removeAttribute('dir');
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return el.shadowRoot!.querySelector<HTMLElement>('.scroll')!.scrollLeft;
    });
    expect(back).toBe(100);
    // At the start, only the end is marked: a flip moves the fade's mask from one side to the other — in its first frame
    // it is already where it rests, not on its way (the transition the flip started is finished before it is painted).
    await scrollTo(area, { fromStart: 0 }, ['end']);
    await motionEnded(area);
    const before = await leftMask();
    const first = await area.evaluate(async (el) => {
      el.closest<HTMLElement>('[data-fixture]')!.dir = 'rtl';
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return getComputedStyle(el.shadowRoot!.querySelector('.scroll')!).maskPosition.split(',').map((p) => p.trim());
    });
    await motionEnded(area);
    const rest = await leftMask();
    expect(rest).not.toEqual(before);
    expect(first).toEqual(rest);
  });

  test('SCA-15: a scroll edge the area does not define is auto, an edge name it does not know is ignored, and each is reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { reducedMotion: true, fixtures: [fixture('odd', { label: 'Messages', scrollEdge: 'glow', edges: ['top', 'left', 'bottom'] })] });
    expect(await drawnForm(host(page, 'odd'))).toBe('shadow');
    expect(await host(page, 'odd').evaluate((el) => [...el.shadowRoot!.querySelectorAll('.edge')].map((e) => e.classList[1]))).toEqual(['top', 'bottom']);
    expect(seen.filter((text) => text.includes('SCA-15') && text.includes('"glow"'))).toHaveLength(1);
    expect(seen.filter((text) => text.includes('SCA-15') && text.includes('"left"'))).toHaveLength(1);
  });

  test('SCA-16: with the text enlarged the marks keep their sizes and the larger content scrolls further', async ({ page }) => {
    const area = host(page, 'default');
    const [depth, far] = [(await rect(band(page, 'default', 'top'))).height, await extent(area, 'block')];
    await stage(page, 'default').evaluate((el) => (el.style.fontSize = '200%'));
    await area.evaluate((el) => el.querySelectorAll<HTMLElement>('.scroll-fixture-line').forEach((line) => (line.style.font = 'inherit')));
    await expect.poll(() => extent(area, 'block')).toBeGreaterThan(far * 1.3);
    expect((await rect(band(page, 'default', 'top'))).height).toBe(depth);
    expect(await resolveToken(page, T('shadow-extent'))).toBe(depth);
  });

  test('SCA-17: the area has no words of its own — its shadow tree holds no text — and label names only its region', async ({ page }) => {
    for (const id of spec.fixtures.map((f) => f.id)) {
      expect(await host(page, id).evaluate((el) => el.shadowRoot!.textContent!.trim()), id).toBe('');
    }
    expect(await box(page, 'sideways').getAttribute('aria-label')).toBe('Photos');
    expect(await host(page, 'sideways').evaluate((el) => el.shadowRoot!.querySelectorAll('[aria-label]').length)).toBe(1);
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark, in every fixture', async ({ page }) => {
    // Each fixture alone: a box that is a focus stop is a region, and a page of every fixture would hold the spec's
    // regions side by side — two named "Photos", five with no name — which landmark-unique rightly refuses on a page.
    for (const theme of ['light', 'dark'] as const) {
      for (const f of spec.fixtures) {
        await mountFixtures(page, spec, { theme, reducedMotion: true, fixtures: [f] });
        const results = await new AxeBuilder({ page }).include('.stage').analyze();
        expect(results.violations, `${theme} ${f.id}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
      }
    }
  });

  test('the box that is a stop is a named region in the accessibility tree; the marks are not in it', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: true, fixtures: spec.fixtures.filter((f) => f.id === 'sideways') });
    await expect(page.getByRole('region', { name: 'Photos' })).toHaveCount(1);
    const exposed = await host(page, 'sideways').evaluate((el) => [...el.shadowRoot!.querySelectorAll('.edge, .sentinel')].every((e) => e.closest('[aria-hidden="true"]')));
    expect(exposed).toBe(true);
  });
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: true });
  });

  test('every fixture is staged scrolled to the middle, both edges it watches marked', async ({ page }) => {
    for (const f of spec.fixtures) {
      const watched = (f.props.edges as string[] | undefined) ?? ['top', 'bottom'];
      expect(await marked(host(page, f.id)), f.id).toEqual(EDGE_NAMES.filter((e) => watched.includes(e)));
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
