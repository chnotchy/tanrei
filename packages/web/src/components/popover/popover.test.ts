// <tanrei-popover>, driven by specs/popover.spec.json: every behaviour id (POP-1…43) is cited by a test title, every
// fixture has a baseline, and every color, length and time is read back from the tokens. The fixtures are drawn in
// place (`inline`), each on its 480 × 480 stage; what a fixture cannot hold — the top layer, the window's edges, focus,
// dismissal, nesting — is tested on the real overlay, mounted by the tests as a product would write it: its own opener,
// `open` set from the opener's press, and set to false from `close`.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, fixturesDocument, innerStrokeAtEdges, loadSpec, mountFixtures, popoverWindow, resolveColor, resolveToken, rootTokens, tab, tabTo } from '../../../test/harness.js';
import { appearProbe, bezierOf, expectAppearStart, expectExitEnd, resolveEasing } from '../../../test/appear.js';
import { type Frames, expectAnimated, expectNoFlicker, sampleFrames } from '../../../test/frames.js';
import { motionEnded } from '../../../test/motions.js';
import { holdClock } from '../../../test/page-clock.js';
import { transitionsRun, watchTransitions } from '../../../test/transitions.js';
import { ANCHORED_PLACEMENTS, type AnchoredInput, type AnchoredPlacement, placeAnchored } from '../../primitives/placement.js';

const spec = loadSpec('popover');
/** The fixtures drawn in place on their stages; the `compact-` ones are the real overlay, each alone in its window (POP-39). */
const IN_PLACE = spec.fixtures.filter((f) => !f.id.startsWith('compact'));
const COMPACT_FIXTURES = spec.fixtures.filter((f) => f.id.startsWith('compact'));
type P = Page;
const TAG = 'tanrei-popover';
const T = (name: string) => `--tanrei-comp-popover-${name}`;
type Box = { x: number; y: number; width: number; height: number };

const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id = 'p') => page.locator(`${TAG}#${id}`);
const fixtureHost = (page: P, id: string) => page.locator(`[data-fixture="${id}"] ${TAG}`);
const part = (page: P, selector: string, id = 'p') => host(page, id).locator(selector);
/** The popover's own parts: its content may hold elements with parts of the same names (a tooltip's surface). */
const surface = (page: P, id = 'p') => page.locator(`${TAG}#${id} > .surface`);
const container = (page: P, id = 'p') => page.locator(`${TAG}#${id} > .surface > .motion > .container`);
const css = (locator: Locator, property: string) => locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
const rect = (locator: Locator): Promise<Box> =>
  locator.evaluate((el) => {
    const box = el.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  });
const right = (box: Box) => box.x + box.width;
const bottom = (box: Box) => box.y + box.height;
const centerX = (box: Box) => box.x + box.width / 2;
const centerY = (box: Box) => box.y + box.height / 2;
const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const override = (page: P, vars: Record<string, string>, selector = ':root') =>
  page.evaluate(
    ([v, s]) => {
      for (const [k, val] of Object.entries(v)) (document.querySelector(s) as HTMLElement).style.setProperty(k, val);
    },
    [vars, selector] as const,
  );
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

/**
 * A page of the test's own markup, wired as a product wires a popover: a press on its opener (the element `opener`,
 * else `anchor`, names) toggles `open`, and `close` sets it to false — unless the popover carries `data-keep`, a product
 * that declines. Every `close` is recorded as `<id>:<reason>`, and a menu's as `<id>:menu:<reason>`.
 */
async function mount(page: P, html: string, { width = 800, height = 600, reducedMotion = true, dir, system }: { width?: number; height?: number; reducedMotion?: boolean; dir?: 'ltr' | 'rtl'; system?: string } = {}) {
  await page.setViewportSize({ width, height });
  await mountFixtures(page, spec, { icons: true, fixtures: [], reducedMotion, dir, system });
  await page.evaluate((markup) => {
    const main = document.querySelector('main') as HTMLElement;
    main.style.display = 'block';
    main.innerHTML = markup;
    const w = window as unknown as { __log: string[] };
    w.__log = [];
    type Overlay = HTMLElement & { open: boolean; anchor: string; opener?: string };
    for (const popover of document.querySelectorAll<Overlay>('tanrei-popover, tanrei-menu')) {
      const menu = popover.localName === 'tanrei-menu';
      popover.addEventListener('close', (event) => {
        w.__log.push(`${popover.id}:${menu ? 'menu:' : ''}${(event as CustomEvent<{ reason: string }>).detail.reason}`);
        if (!popover.hasAttribute('data-keep')) popover.open = false;
      });
      const opener = document.getElementById(popover.opener || popover.anchor);
      opener?.addEventListener('click', () => (popover.open = !popover.open));
    }
  }, html);
  await settle(page);
}
const settle = (page: P) =>
  page.evaluate(async () => {
    await Promise.all([...document.querySelectorAll('tanrei-popover, tanrei-menu, tanrei-button')].map((el) => (el as unknown as { updateComplete: Promise<unknown> }).updateComplete));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
const log = (page: P) => page.evaluate(() => (window as unknown as { __log: string[] }).__log);
const clearLog = (page: P) => page.evaluate(() => void ((window as unknown as { __log: string[] }).__log.length = 0));
const set = (page: P, props: Record<string, unknown>, id = 'p') => host(page, id).evaluate((el, p) => Object.assign(el, p), props);
const isShown = (page: P, id = 'p') => surface(page, id).evaluate((el) => el.matches(':popover-open') && el.classList.contains('open'));
const isOpen = (page: P, id = 'p') => host(page, id).evaluate((el) => (el as unknown as { open: boolean }).open);
/**
 * Opens a popover and waits for its open motion (POP-26) to end: until then it is still growing from its anchor's edge,
 * so a box measured before is not where the popover rests, and a press aimed at it later may land elsewhere. The motion
 * runs in the popover's shadow root, which `document.getAnimations()` does not look into: the moving part is asked.
 */
async function open(page: P, id = 'p') {
  await set(page, { open: true }, id);
  await expect.poll(() => isShown(page, id)).toBe(true);
  await settle(page);
  // (Its own moving part: an overlay inside it, a tooltip on an element it holds, has one too.)
  await motionEnded(surface(page, id).locator('> .motion'));
}
async function close(page: P, id = 'p') {
  await set(page, { open: false }, id);
  await expect.poll(() => surface(page, id).evaluate((el) => el.matches(':popover-open'))).toBe(false);
}
/** The element that has focus, through shadow roots: its id, or its tag and classes. */
const active = (page: P) =>
  page.evaluate(() => {
    let el: Element | null = document.activeElement;
    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
    if (!el || el === document.body) return 'body';
    return el.id ? `#${el.id}` : `${el.localName}${el.classList.length ? `.${[...el.classList].join('.')}` : ''}`;
  });
/** The Tanrei Button whose native button has focus: its label. */
const activeButton = (page: P) =>
  page.evaluate(() => {
    let el: Element | null = document.activeElement;
    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
    const root = el?.getRootNode();
    const button = root instanceof ShadowRoot ? root.host : null;
    return button?.localName === 'tanrei-button' ? (button.getAttribute('label') ?? button.textContent?.trim() ?? '') : '';
  });

/** An anchor fixed in the window at a place the test chooses, so that the window's edges are where the test says. */
const anchorAt = (x: number, y: number, { width = 100, height = 40, label = 'Storage' } = {}) =>
  `<button id="a" type="button" style="position: fixed; left: ${x}px; top: ${y}px; inline-size: ${width}px; block-size: ${height}px; margin: 0; padding: 0">${label}</button>`;
const popover = (attributes: string, content = 'Trash counts.', id = 'p') => `<${TAG} id="${id}" anchor="a" ${attributes}>${content}</${TAG}>`;
const LONG = Array.from({ length: 24 }, () => 'Files in the trash still count toward your storage until they are deleted.').join(' ');
const ACTIONS = '<tanrei-button slot="actions" dismissive>Cancel</tanrei-button><tanrei-button slot="actions" confirming>Empty</tanrei-button>';

/** Where a placement puts the surface against the anchor, read from the two boxes (POP-2, POP-34). */
function expectPlaced(placement: string, a: Box, s: Box, gap: number, rtl = false) {
  const [named, align] = placement.split('-');
  const side = named === 'start' ? (rtl ? 'right' : 'left') : named === 'end' ? (rtl ? 'left' : 'right') : named;
  const close = (got: number, want: number, what: string) => expect(Math.abs(got - want), `${placement}: ${what} (${got} vs ${want})`).toBeLessThanOrEqual(0.6);
  if (side === 'top') close(bottom(s), a.y - gap, 'above the anchor');
  if (side === 'bottom') close(s.y, bottom(a) + gap, 'below the anchor');
  if (side === 'left') close(right(s), a.x - gap, 'at the anchor’s left');
  if (side === 'right') close(s.x, right(a) + gap, 'at the anchor’s right');
  if (side === 'top' || side === 'bottom') {
    if (!align) close(centerX(s), centerX(a), 'centred');
    else if ((align === 'start') !== rtl) close(s.x, a.x, 'left edges together');
    else close(right(s), right(a), 'right edges together');
  } else if (!align) close(centerY(s), centerY(a), 'centred');
  else if (align === 'top') close(s.y, a.y, 'top edges together');
  else close(bottom(s), bottom(a), 'bottom edges together');
}

test.describe('presentation', () => {
  test('POP-1: open presents the container in the top layer at its elevation, with no scrim, no focus trap and nothing else inert, unscrollable or hidden; closed, it is removed', async ({ page }) => {
    await mount(page, `<div style="padding: 120px 200px"><button id="a" type="button">Storage</button>${popover('label="Storage" data-keep')}<button id="other" type="button">Other</button></div><div style="block-size: 2000px"></div>`);
    expect(await surface(page).evaluate((el) => [el.matches(':popover-open'), getComputedStyle(el).display, el.getClientRects().length])).toEqual([false, 'none', 0]);
    await open(page);
    // In the top layer, as the menu's surface is: a manual popover, which the browser draws above the page.
    expect(await surface(page).evaluate((el) => [el.getAttribute('popover'), el.matches(':popover-open')])).toEqual(['manual', true]);
    const box = await rect(container(page));
    expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('tanrei-popover')?.id ?? document.elementFromPoint(x, y)?.id, [centerX(box), centerY(box)])).toBe('p');
    expect(await css(container(page), 'box-shadow')).toBe(await resolveShadow(page, T('container-elevation')));
    // Not modal: no dialog element and no scrim, no aria-modal, nothing inert, the page scrolls and its controls answer.
    expect(await host(page).evaluate((el) => [el.shadowRoot!.querySelector('dialog'), el.shadowRoot!.querySelector('[aria-modal]')])).toEqual([null, null]);
    expect(await page.evaluate(() => [document.querySelectorAll('[inert]').length, getComputedStyle(document.documentElement).overflow, document.querySelector('#other')!.closest('[aria-hidden]')])).toEqual([0, 'visible', null]);
    await page.evaluate(() => document.querySelector('#other')!.addEventListener('click', () => (window as unknown as { __log: string[] }).__log.push('other')));
    await page.locator('#other').click();
    expect(await log(page)).toEqual(['p:outside', 'other']);
    await page.mouse.wheel(0, 40);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(40);
    // No focus trap: focus moves to a control outside it.
    await page.locator('#other').focus();
    expect(await active(page)).toBe('#other');
    await close(page);
    expect(await surface(page).evaluate((el) => [getComputedStyle(el).display, el.getClientRects().length])).toEqual(['none', 0]);
  });

  test('POP-6: the container is filled, raised and rounded from its tokens and clips its parts to its shape; a pointer, a press and focus change nothing it draws', async ({ page }) => {
    await mount(page, `${anchorAt(300, 100)}${popover('headline="Storage"', LONG)}`);
    await open(page);
    const paints = () => container(page).evaluate((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(el).boxShadow, getComputedStyle(el).borderTopLeftRadius, el.querySelectorAll('.ripple, .state-layer').length]);
    const rest = await paints();
    expect(rest[0]).toBe(await resolveColor(page, T('container-color')));
    expect(rest[1]).toBe(await resolveShadow(page, T('container-elevation')));
    expect(Number.parseFloat(String(rest[2]))).toBeCloseTo(await resolveToken(page, T('container-shape')), 1);
    expect(await container(page).evaluate((el) => el.hasAttribute('data-tanrei-shape'))).toBe(true);
    // Clipped to the shape: the box that holds the header, the content and the actions has the container's corners and hides what overflows.
    expect(await part(page, '.clip').evaluate((el) => [getComputedStyle(el).overflowX, getComputedStyle(el).borderTopLeftRadius])).toEqual(['hidden', rest[2]]);
    const box = await rect(container(page));
    await page.mouse.move(box.x + 20, box.y + 20);
    expect(await paints()).toEqual(rest);
    await page.mouse.down();
    expect(await paints()).toEqual(rest);
    await page.mouse.up();
    expect(await paints()).toEqual(rest);
    expect(await container(page).evaluate((el) => getComputedStyle(el).cursor)).toBe('auto');
  });

  test('POP-26: opening, the container appears from where the appearance starts it — opacity 0 and scale 0.96 under the default system — grown from the middle of the edge that faces the anchor, over the open motion on its curve; closing, it leaves the same way back over the close motion on the accelerating curve, its last frame leaving no more than that curve does; nothing flickers, and the placed box never moves', async ({ page }) => {
    await mount(page, `${anchorAt(300, 200)}${popover('label="Storage"')}`, { reducedMotion: false });
    const opening = await sampleFrames(host(page), () => set(page, { open: true }), { probe: appearProbe });
    // The first frame, where it starts: the default system's appearance (sys.motion.appear.*), from the top edge's middle.
    expectAppearStart(opening.frames[0]!, { opacity: 0, scale: 0.96 });
    expect(opening.rest.probe).toMatchObject({ opacity: 1, sx: 1, sy: 1, tx: 0, ty: 0, blur: 0 });
    const width = (await rect(part(page, '.motion'))).width;
    expect(String(opening.frames[0]!.probe.origin)).toBe(`${width / 2}px 0px`);
    expectNoFlicker(opening);
    expectAnimated(opening, 'opacity');
    const motions = (seen: Frames) => seen.motions.filter((motion) => motion.on === 'div.motion' && ['opacity', 'scale'].includes(motion.name));
    for (const motion of motions(opening)) {
      expect(motion.duration, motion.name).toBe(await resolveToken(page, T('motion-open-duration'), 'duration'));
      expect(motion.easing, motion.name).toBe(await resolveEasing(page, T('motion-open-easing')));
    }
    expect(motions(opening).map((motion) => motion.name).sort()).toEqual(['opacity', 'scale']);
    // The place and the room are those of the popover at rest: the placed box did not move while it grew.
    const placed = await rect(surface(page));
    expect(await surface(page).evaluate((el) => [getComputedStyle(el).transform, getComputedStyle(el).scale])).toEqual(['none', 'none']);

    const closing = await sampleFrames(host(page), () => set(page, { open: false }), { probe: appearProbe });
    // The same way back, to where it started.
    expect(closing.rest.probe).toMatchObject({ opacity: 0, sx: 0.96, sy: 0.96 });
    expectNoFlicker(closing);
    expectAnimated(closing, 'opacity');
    const exit = await resolveEasing(page, T('motion-close-easing'));
    // The default system leaves on standard-accelerate.
    expect(exit).toBe(await resolveEasing(page, '--tanrei-sys-motion-easing-standard-accelerate'));
    for (const motion of motions(closing)) {
      expect(motion.duration, motion.name).toBe(await resolveToken(page, T('motion-close-duration'), 'duration'));
      expect(motion.easing, motion.name).toBe(exit);
    }
    expect(motions(closing).map((motion) => motion.name).sort()).toEqual(['opacity', 'scale']);
    expectExitEnd(closing, { duration: await resolveToken(page, T('motion-close-duration'), 'duration'), easing: bezierOf(exit) });
    // Out of the top layer once its exit has played; it drew where it was placed throughout.
    await expect.poll(() => surface(page).evaluate((el) => el.matches(':popover-open'))).toBe(false);
    expect(closing.frames.filter((frame) => frame.probe.opacity !== 0).length).toBeGreaterThan(3);
    await set(page, { open: true });
    await expect.poll(() => isShown(page)).toBe(true);
    expect(await rect(surface(page))).toEqual(placed);
  });

  test('POP-26: placed above its anchor it grows from its bottom edge, beside it from the edge that faces it, and over its anchor from its centre; where appear.origin is center it grows from its centre on every side', async ({ page }) => {
    await mount(page, `${anchorAt(300, 400)}${popover('label="Storage"')}`, { reducedMotion: false });
    const originAt = async (placement: string) => {
      await set(page, { placement, open: true });
      await expect.poll(() => isShown(page)).toBe(true);
      // Against its box at rest (a box measured while it grows is the grown one).
      const [x, y, width, height] = await part(page, '.motion').evaluate((el: HTMLElement) => [...getComputedStyle(el).transformOrigin.split(' ').map(Number.parseFloat), el.offsetWidth, el.offsetHeight]);
      await close(page);
      return [Math.round((x! / width!) * 100) / 100, Math.round((y! / height!) * 100) / 100];
    };
    expect(await originAt('top')).toEqual([0.5, 1]);
    expect(await originAt('bottom')).toEqual([0.5, 0]);
    expect(await originAt('start')).toEqual([1, 0.5]);
    expect(await originAt('end')).toEqual([0, 0.5]);
    // appear.origin: center — read with a style query on the custom property.
    await rootTokens(page, { '--tanrei-sys-motion-appear-origin': 'center' });
    expect(await originAt('top')).toEqual([0.5, 0.5]);
    expect(await originAt('end')).toEqual([0.5, 0.5]);
  });

  test('POP-26: under the unfold appearance (m3-like) the container unfolds from the edge that faces the anchor at its full width, on the emphasized curves the system keeps, and folds back the same way', async ({ page }) => {
    await mount(page, `${anchorAt(300, 200)}${popover('label="Storage"')}`, { reducedMotion: false, system: 'm3-like' });
    expect(await token(page, '--tanrei-sys-behavior-appearance')).toBe('unfold');
    const opening = await sampleFrames(host(page), () => set(page, { open: true }), { probe: appearProbe });
    // A style query on the custom property picks the axis that leaves the anchor: the height, from the top edge.
    expectAppearStart(opening.frames[0]!, { opacity: 0, scale: 0, axis: 'y' });
    expect(String(opening.frames[0]!.probe.origin).split(' ')[1]).toBe('0px');
    expect(opening.rest.probe).toMatchObject({ opacity: 1, sx: 1, sy: 1 });
    expectNoFlicker(opening);
    const opacity = opening.motions.find((motion) => motion.on === 'div.motion' && motion.name === 'opacity')!;
    expect(opacity.easing).toBe(await resolveEasing(page, '--tanrei-sys-motion-easing-emphasized-decelerate'));
    expect(opacity.duration).toBe(await resolveToken(page, '--tanrei-sys-motion-duration-short4', 'duration'));
    const closing = await sampleFrames(host(page), () => set(page, { open: false }), { probe: appearProbe });
    expect(closing.rest.probe).toMatchObject({ opacity: 0, sy: 0 });
    const out = closing.motions.find((motion) => motion.on === 'div.motion' && motion.name === 'opacity')!;
    expect(out.easing).toBe(await resolveEasing(page, '--tanrei-sys-motion-easing-emphasized-accelerate'));
    expect(out.duration).toBe(await resolveToken(page, '--tanrei-sys-motion-duration-short2', 'duration'));
  });

  test('POP-26: where motion is reduced the container only fades, in and out, over sys.motion.role.reduced — no scale, no distance, no blur', async ({ page }) => {
    await mount(page, `${anchorAt(300, 200)}${popover('label="Storage"')}`, { reducedMotion: true });
    const reduced = await resolveToken(page, '--tanrei-sys-motion-role-reduced', 'duration');
    const opening = await sampleFrames(host(page), () => set(page, { open: true }), { probe: appearProbe });
    expectAppearStart(opening.frames[0]!, { opacity: 0, scale: 1 });
    expect(opening.frames.every((frame) => frame.probe.sx === 1 && frame.probe.sy === 1 && frame.probe.ty === 0 && frame.probe.blur === 0)).toBe(true);
    const own = (seen: Frames) => seen.motions.filter((motion) => motion.on === 'div.motion').map((motion) => [motion.name, motion.duration]);
    expect(own(opening)).toEqual([['opacity', reduced]]);
    expect(opening.rest.probe).toMatchObject({ opacity: 1 });
    const closing = await sampleFrames(host(page), () => set(page, { open: false }), { probe: appearProbe });
    expect(own(closing)).toEqual([['opacity', reduced]]);
    expect(closing.rest.probe).toMatchObject({ opacity: 0, sx: 1, sy: 1 });
    await expect.poll(() => surface(page).evaluate((el) => el.matches(':popover-open'))).toBe(false);
  });

  test('POP-26: a popover in the page\'s markup with open appears in the first frame without its motion, and one mounted open after the first paint plays its entrance', async ({ page }) => {
    await mount(page, `${anchorAt(300, 200)}`, { reducedMotion: false });
    // Mounted open after the document was painted: it enters.
    const main = page.locator('main');
    const mounted = await sampleFrames(main, () => main.evaluate((el) => el.insertAdjacentHTML('beforeend', '<tanrei-popover id="late" anchor="a" label="Storage" open>Trash counts.</tanrei-popover>')), { probe: appearProbe });
    expectAppearStart(mounted.frames[0]!, { opacity: 0, scale: 0.96 });
    expect(mounted.rest.probe).toMatchObject({ opacity: 1, sx: 1 });
    // In the page's markup, open before the first paint: there at once, and no entrance runs (every transition that
    // starts in a shadow root is counted from before the first element is made).
    const count = `<script>window.__runs = []; const attach = Element.prototype.attachShadow; Element.prototype.attachShadow = function (init) { const root = attach.call(this, init); root.addEventListener('transitionrun', (event) => window.__runs.push(this.localName + ' ' + event.target.className + ' ' + event.propertyName)); return root; };</script>`;
    // A page that is loaded (not one written into the window with setContent, whose navigation was over before it).
    const markup = await fixturesDocument(spec, { icons: true, fixtures: [], lead: `${count}${anchorAt(300, 200)}${popover('label="Storage" open')}` });
    await page.route('http://popover.test/', (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: markup }));
    await page.goto('http://popover.test/');
    await page.waitForFunction(() => !!customElements.get('tanrei-popover'));
    await settle(page);
    expect(await isShown(page)).toBe(true);
    expect(await part(page, '.motion').evaluate((el) => [getComputedStyle(el).opacity, getComputedStyle(el).scale])).toEqual(['1', 'none']);
    expect((await page.evaluate(() => (window as unknown as { __runs: string[] }).__runs)).filter((run) => run.startsWith('tanrei-popover motion'))).toEqual([]);
  });

  test('POP-27: a motion that is turned round goes on from the opacity and the size it has reached; closed or closing the popover takes no pointer and no focus, and closed it takes no room, draws nothing and exposes nothing', async ({ page }) => {
    await mount(page, `${anchorAt(300, 200)}${popover('label="Storage"', '<button id="in" type="button">Inside</button>')}<button id="under" type="button" style="position: fixed; left: 300px; top: 250px; inline-size: 160px; block-size: 50px">Under</button>`, {
      reducedMotion: false,
    });
    await override(page, { [T('motion-open-duration')]: '600ms', [T('motion-close-duration')]: '600ms' });
    const motion = part(page, '.motion');
    // Its opacity and its scale along the line to the anchor (below it: the height), as drawn.
    const reached = () => motion.evaluate((el) => ({ opacity: Number(getComputedStyle(el).opacity), scale: getComputedStyle(el).scale === 'none' ? 1 : Number(getComputedStyle(el).scale.split(' ').at(-1)) }));
    // The motions of the appearance that draw something here: its opacity and its scale (the distance and the blur
    // are 0 under the default system, and move nothing).
    const DRAWN = ['opacity', 'scale'];
    // A turn is read where the motion is HELD, not where a clock has let it get to: the browser shortens a motion that
    // turns round to the part it had covered, and the opening motion starts fast — a turn at a fifth of the way is over
    // in 120 ms, and one taken in the opening's first frame in 30 (which is how this test once read 0 in WebKit on a
    // busy machine: the frame was 2 ms into the motion, the closing motion lasted 28 ms, and the reading came 69 ms
    // later). Held, the motion stays at `at` of its length until the popover is told to turn; it tells how many it holds.
    const hold = (at: number) =>
      motion.evaluate((el, part) => {
        const running = el.getAnimations();
        for (const animation of running) {
          animation.pause();
          animation.currentTime = Number(animation.effect!.getComputedTiming().endTime) * part;
        }
        return running.filter((animation) => ['opacity', 'scale'].includes((animation as CSSTransition).transitionProperty)).length;
      }, at);
    /** Sets `open` and reads the motion in the same task, before a frame has passed: the place the turn starts from. */
    const turn = (open: boolean, held: boolean) =>
      host(page).evaluate(
        async (el, [to, keep]) => {
          Object.assign(el, { open: to });
          await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
          const moving = el.shadowRoot!.querySelector('.motion') as HTMLElement;
          const running = moving.getAnimations();
          if (keep) for (const animation of running) animation.pause();
          const style = getComputedStyle(moving);
          const drawn = running.filter((animation) => ['opacity', 'scale'].includes((animation as CSSTransition).transitionProperty));
          return { opacity: Number(style.opacity), scale: style.scale === 'none' ? 1 : Number(style.scale.split(' ').at(-1)), moving: drawn.length };
        },
        [open, held] as const,
      );
    // Opening: its opacity and its size, half-way — held there in the task that opens it. (Asked for in a later answer,
    // a motion of 600 ms is over where one answer takes WebKit on Linux 300 to 570 ms, and nothing is left to hold.)
    const begun = await host(page).evaluate(async (el) => {
      Object.assign(el, { open: true });
      await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
      const running = (el.shadowRoot!.querySelector('.motion') as HTMLElement).getAnimations();
      for (const animation of running) {
        animation.pause();
        animation.currentTime = Number(animation.effect!.getComputedTiming().endTime) * 0.5;
      }
      return running.map((animation) => (animation as CSSTransition).transitionProperty).filter((property) => ['opacity', 'scale'].includes(property)).sort();
    });
    expect(begun).toEqual(DRAWN);
    const opening = await reached();
    const start = Number(await token(page, '--tanrei-sys-motion-appear-scale'));
    expect(opening.opacity).toBeGreaterThan(0);
    expect(opening.opacity).toBeLessThan(1);
    expect(opening.scale).toBeGreaterThan(start);
    expect(opening.scale).toBeLessThan(1);
    // Told to close while opening: from where it is, never from the end of the opening motion — the opacity and the
    // size it had reached, from which it goes back the way it came.
    const turned = await turn(false, true);
    expect(turned.moving).toBe(2);
    expect(turned.opacity).toBeCloseTo(opening.opacity, 2);
    expect(turned.scale).toBeCloseTo(opening.scale, 2);
    // Closing: no pointer and no focus — a press reaches what lies under it.
    expect(await surface(page).evaluate((el) => [getComputedStyle(el).pointerEvents, el.inert, el.matches(':popover-open')])).toEqual(['none', true, true]);
    await page.evaluate(() => document.querySelector('#under')!.addEventListener('click', () => (window as unknown as { __log: string[] }).__log.push('under')));
    await page.mouse.click(380, 275);
    expect(await log(page)).toEqual(['under']);
    // Told to open while closing, half-way through it: on from the opacity and the size it had, without first going to
    // nothing or to its start.
    expect(await hold(0.5)).toBe(2);
    const before = await reached();
    expect(before.opacity).toBeGreaterThan(0);
    expect(before.opacity).toBeLessThan(turned.opacity);
    const back = await turn(true, false);
    expect(back.opacity).toBeGreaterThanOrEqual(before.opacity - 0.05);
    expect(back.scale).toBeCloseTo(before.scale, 2);
    expect(back.opacity).toBeLessThan(1);
    expect(back.scale).toBeGreaterThan(start);
    expect(await surface(page).evaluate((el) => [el.matches(':popover-open'), el.inert])).toEqual([true, false]);
    // The rest takes no longer than the whole motion it turned to.
    const left = await motion.evaluate((el) => Math.max(0, ...el.getAnimations().map((animation) => Number(animation.effect!.getComputedTiming().endTime) - Number(animation.currentTime ?? 0))));
    expect(left).toBeLessThanOrEqual(600);
    await motion.evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished)));
    expect(await reached()).toEqual({ opacity: 1, scale: 1 });
    await set(page, { open: false });
    await motion.evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished)));
    await expect.poll(() => surface(page).evaluate((el) => el.matches(':popover-open'))).toBe(false);
    // Closed: no room in the layout (the element has no box), nothing drawn, nothing for assistive technology.
    expect(await host(page).evaluate((el) => [getComputedStyle(el).display, el.getClientRects().length, (el.shadowRoot!.querySelector('.surface') as HTMLElement).getClientRects().length])).toEqual(['contents', 0, 0]);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await page.locator('#in').evaluate((el) => [el.getClientRects().length, el.checkVisibility()])).toEqual([0, false]);
  });
});

test.describe('placement', () => {
  test('POP-2: each of the thirteen placements is a side and an alignment along it, as the tooltip reads them; a placement changed while it is shown is taken at once, without a motion, keeping focus', async ({ page }) => {
    await mount(page, `${anchorAt(400, 330)}${popover('label="Storage"')}`, { width: 900, height: 700, reducedMotion: false });
    await open(page);
    await part(page, '.motion').evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished)));
    const gap = await resolveToken(page, T('offset'));
    const anchor = await rect(page.locator('#a'));
    expect(await host(page).evaluate((el) => (el as unknown as { placement: string }).placement)).toBe('bottom-start');
    expectPlaced('bottom-start', anchor, await rect(surface(page)), gap);
    expect(await active(page)).toBe('div.container');
    for (const placement of ANCHORED_PLACEMENTS.filter((value) => value !== 'auto')) {
      // Read in the same task the prop is set and rendered in: its new place is taken at once.
      const placed = await host(page).evaluate(async (el, value) => {
        (el as unknown as { placement: string }).placement = value;
        await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
        const surface = el.shadowRoot!.querySelector('.surface')!;
        const box = surface.getBoundingClientRect();
        return { box: { x: box.x, y: box.y, width: box.width, height: box.height }, moving: [...surface.getAnimations(), ...el.shadowRoot!.querySelector('.motion')!.getAnimations()].length };
      }, placement);
      expectPlaced(placement, anchor, placed.box, gap);
      expect(placed.moving, placement).toBe(0);
      expect(await active(page), placement).toBe('div.container');
    }
  });

  test('POP-3: auto tries bottom, top, end, start and takes the first with room, or the one with the most, its start edge on the anchor’s for bottom and top and its top edge on the anchor’s for end and start', async ({ page }) => {
    // The geometry alone: a 200 × 100 container, a 40 × 40 anchor, an offset of 4 and a margin of 8.
    const place = (anchor: [number, number], viewport: [number, number], more: Partial<AnchoredInput> = {}) =>
      placeAnchored({
        anchor: { x: anchor[0], y: anchor[1], width: 40, height: 40 },
        surface: { width: 200, height: 100 },
        viewport: { width: viewport[0], height: viewport[1] },
        placement: 'auto',
        offset: 4,
        margin: 8,
        rtl: false,
        fallback: 'bottom-start',
        auto: ['bottom', 'top', 'end', 'start'],
        autoAlign: 'start',
        holdInMargin: true,
        ...more,
      });
    expect(place([180, 130], [400, 300])).toMatchObject({ side: 'bottom', left: 180, top: 174, fits: true });
    expect(place([180, 200], [400, 300])).toMatchObject({ side: 'top', left: 180, top: 96, fits: true });
    // Neither above nor below: end, with top edges together (then shifted to stay in the margin).
    expect(place([100, 20], [400, 150])).toMatchObject({ side: 'right', left: 144, top: 20, fits: true });
    expect(place([300, 20], [400, 150])).toMatchObject({ side: 'left', left: 96, top: 20, fits: true });
    // No side has room: the one with the most.
    expect(place([60, 55], [200, 150])).toMatchObject({ side: 'right', fits: false });
    expect(place([100, 55], [200, 150])).toMatchObject({ side: 'left', fits: false });
    // The order is by the sides' names: end is the left in right-to-left, and the start edge the right one.
    expect(place([300, 20], [400, 150], { rtl: true })).toMatchObject({ side: 'left' });
    expect(place([180, 130], [400, 300], { rtl: true })).toMatchObject({ side: 'bottom', left: 20 });
    // It keeps the side it took for as long as that side has room, whatever comes first in the order.
    expect(place([180, 130], [400, 300], { keep: 'top' })).toMatchObject({ side: 'top' });
    expect(place([180, 90], [400, 300], { keep: 'top' })).toMatchObject({ side: 'bottom' });

    // The element: below with start edges together; above once there is no room below; beside in a short window.
    await mount(page, `${anchorAt(300, 200)}${popover('label="Storage" placement="auto"')}`);
    await open(page);
    const gap = await resolveToken(page, T('offset'));
    expectPlaced('bottom-start', await rect(page.locator('#a')), await rect(surface(page)), gap);
    await close(page);
    await page.locator('#a').evaluate((el) => (el.style.top = '520px'));
    await open(page);
    expectPlaced('top-start', await rect(page.locator('#a')), await rect(surface(page)), gap);
    await close(page);
    await page.setViewportSize({ width: 800, height: 110 });
    await page.locator('#a').evaluate((el) => (el.style.top = '30px'));
    await open(page);
    expect(await surface(page).getAttribute('data-side')).toBe('right');
    expectPlaced('end-top', await rect(page.locator('#a')), await rect(surface(page)), gap);
  });

  test('POP-4: the distance to the anchor is comp.popover.offset, or offset as given (0 touches), measured to the arrow’s tip while one is drawn; crossOffset moves it along its side and never off the anchor’s side; a negative or non-finite offset takes the token, a non-finite crossOffset 0, each reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, `${anchorAt(300, 200)}${popover('label="Storage"')}`);
    await open(page);
    const anchor = await rect(page.locator('#a'));
    const fromAnchor = async () => (await rect(surface(page))).y - bottom(anchor);
    const tokenGap = await resolveToken(page, T('offset'));
    expect(tokenGap).toBeGreaterThan(0);
    expect(await fromAnchor()).toBeCloseTo(tokenGap, 1);
    await set(page, { offset: 0 });
    await expect.poll(fromAnchor).toBeCloseTo(0, 1);
    await set(page, { offset: 16 });
    await expect.poll(fromAnchor).toBeCloseTo(16, 1);
    // With an arrow the container stands the arrow's height farther: the tip keeps the offset.
    const arrowHeight = await resolveToken(page, T('arrow-height'));
    await set(page, { arrow: true });
    await expect.poll(fromAnchor).toBeCloseTo(16 + arrowHeight, 1);
    await set(page, { arrow: null, offset: null });
    await expect.poll(fromAnchor).toBeCloseTo(tokenGap, 1);
    // crossOffset: towards the end below the anchor, towards the bottom beside it.
    const startX = (await rect(surface(page))).x;
    await set(page, { crossOffset: 24 });
    await expect.poll(async () => (await rect(surface(page))).x - startX).toBeCloseTo(24, 1);
    // Never off the anchor's side: an arrow's width of the container stays beside the anchor.
    const arrowWidth = await resolveToken(page, T('arrow-width'));
    await set(page, { crossOffset: 5000 });
    await expect.poll(async () => (await rect(surface(page))).x).toBeCloseTo(right(anchor) - arrowWidth, 1);
    await set(page, { crossOffset: -5000 });
    await expect.poll(async () => right(await rect(surface(page)))).toBeCloseTo(anchor.x + arrowWidth, 1);
    await set(page, { crossOffset: 0, placement: 'end-top' });
    const startY = (await rect(surface(page))).y;
    await set(page, { crossOffset: 10 });
    await expect.poll(async () => (await rect(surface(page))).y - startY).toBeCloseTo(10, 1);
    // Values that cannot be used: the token and 0, with a report each.
    await set(page, { placement: 'bottom-start', crossOffset: Number.NaN, offset: -8 });
    await expect.poll(fromAnchor).toBeCloseTo(tokenGap, 1);
    expect((await rect(surface(page))).x).toBeCloseTo(startX, 1);
    await set(page, { offset: Number.POSITIVE_INFINITY });
    await expect.poll(fromAnchor).toBeCloseTo(tokenGap, 1);
    // The attributes are numbers as the tooltip's are: an empty one is not a number.
    await host(page).evaluate((el) => {
      el.setAttribute('offset', '');
      el.setAttribute('cross-offset', '12');
    });
    expect(await host(page).evaluate((el) => [Number.isNaN((el as unknown as { offset: number }).offset), (el as unknown as { crossOffset: number }).crossOffset])).toEqual([true, 12]);
    await expect.poll(() => seen.filter((text) => text.includes('POP-4')).length).toBeGreaterThanOrEqual(3);
    expect(seen.some((text) => text.includes('offset "-8" is negative') && text.includes('comp.popover.offset'))).toBe(true);
    expect(seen.some((text) => text.includes('cross-offset "NaN" is not a finite number'))).toBe(true);
  });

  test('POP-5: it flips to the opposite side keeping the alignment, takes the side with more room and is limited to it where neither has enough, shifts along the side as far as the margin asks, and covers its anchor inside the margin where the window is smaller than its least size', async ({ page }) => {
    await mount(page, `${anchorAt(600, 540)}${popover('label="Storage" placement="bottom-end"', 'Trash still counts toward storage.')}`);
    const margin = await resolveToken(page, T('window-margin'));
    const gap = await resolveToken(page, T('offset'));
    await open(page);
    // No room below: above, its end edge still on the anchor's.
    expect(await surface(page).getAttribute('data-side')).toBe('top');
    expectPlaced('top-end', await rect(page.locator('#a')), await rect(surface(page)), gap);
    await close(page);
    // Shifted: start-aligned at the window's end edge, it stays the margin inside it and no farther.
    await page.locator('#a').evaluate((el) => Object.assign(el.style, { left: '690px', top: '200px' }));
    await set(page, { placement: 'bottom-start' });
    await open(page);
    expect(right(await rect(surface(page)))).toBeCloseTo(800 - margin, 1);
    expect((await rect(surface(page))).y).toBeCloseTo(240 + gap, 1);
    await close(page);

    // Neither side has room for its content: the one with more, limited to that room, the content scrolling.
    await mount(page, `${anchorAt(300, 100)}${popover('headline="What changed"', LONG)}`, { width: 800, height: 400 });
    await open(page);
    const limited = await rect(surface(page));
    expect(await surface(page).getAttribute('data-side')).toBe('bottom');
    expect(limited.y).toBeCloseTo(140 + gap, 1);
    expect(bottom(limited)).toBeCloseTo(400 - margin, 1);
    expect(await part(page, '.content').evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    expect(await surface(page).evaluate((el) => el.hasAttribute('data-held'))).toBe(false);

    // A window smaller than its least size (its header and its actions): moved back over the anchor, inside the margin.
    // (A compact window: the popover keeps its own presentation, POP-43.)
    await mount(page, `${anchorAt(100, 60)}${popover('headline="Empty the trash?" arrow compact-presentation="own"', `The 12 files in it will be deleted.${ACTIONS}`)}`, { width: 400, height: 160 });
    await open(page);
    const held = await rect(surface(page));
    expect(await surface(page).evaluate((el) => [el.hasAttribute('data-held'), el.hasAttribute('data-arrow')])).toEqual([true, false]);
    expect(held.y).toBeGreaterThanOrEqual(margin - 0.5);
    expect(bottom(held)).toBeLessThanOrEqual(160 - margin + 0.5);
    const anchor = await rect(page.locator('#a'));
    expect(held.y < bottom(anchor) && bottom(held) > anchor.y).toBe(true);
  });

  test('POP-5: it follows its anchor when the anchor moves and keeps the side it is on while that side has room; when no part of the anchor can be seen any more it emits close once with the reason anchor-hidden', async ({ page }) => {
    await mount(
      page,
      `<div id="box" style="position: fixed; left: 100px; top: 100px; inline-size: 400px; block-size: 300px; overflow: auto">
         <div style="block-size: 120px"></div><button id="a" type="button" style="display: block; block-size: 40px">Storage</button><div style="block-size: 900px"></div>
       </div>${popover('label="Storage" data-keep')}`,
    );
    await open(page);
    const gap = await resolveToken(page, T('offset'));
    const scrollTo = (top: number) => page.locator('#box').evaluate((el, y) => el.scrollTo(0, y), top);
    const below = async () => (await rect(surface(page))).y - bottom(await rect(page.locator('#a')));
    expect(await below()).toBeCloseTo(gap, 1);
    // Scrolled until the anchor meets the box's edge: the popover follows and keeps its side.
    await scrollTo(100);
    await expect.poll(async () => (await rect(page.locator('#a'))).y).toBeCloseTo(120, 0);
    await expect.poll(below).toBeCloseTo(gap, 1);
    expect(await surface(page).getAttribute('data-side')).toBe('bottom');
    await scrollTo(140);
    await expect.poll(below).toBeCloseTo(gap, 1);
    expect(await log(page)).toEqual([]);
    // Until no part of it is seen: close, reason anchor-hidden, exactly once — also while the product declines and the page goes on scrolling.
    await scrollTo(170);
    await expect.poll(() => log(page)).toEqual(['p:anchor-hidden']);
    await scrollTo(260);
    await scrollTo(400);
    await settle(page);
    expect(await log(page)).toEqual(['p:anchor-hidden']);
    // In sight again and gone again: once more.
    await scrollTo(0);
    await expect.poll(below).toBeCloseTo(gap, 1);
    await scrollTo(400);
    await expect.poll(() => log(page)).toEqual(['p:anchor-hidden', 'p:anchor-hidden']);

    // The anchor hidden, and removed: the same.
    await mount(page, `${anchorAt(300, 200)}${popover('label="Storage"')}`);
    await open(page);
    await page.locator('#a').evaluate((el) => (el.style.visibility = 'hidden'));
    await expect.poll(() => log(page)).toEqual(['p:anchor-hidden']);
    await expect.poll(() => isOpen(page)).toBe(false);
    await page.locator('#a').evaluate((el) => (el.style.visibility = ''));
    await clearLog(page);
    await open(page);
    await page.locator('#a').evaluate((el) => el.remove());
    await expect.poll(() => log(page)).toEqual(['p:anchor-hidden']);
  });

  test('POP-36: while the on-screen keyboard is shown its top edge is an edge of the window: the popover flips, shifts or shortens so that no part of it is under the keyboard, and takes its place again when the keyboard hides', async ({ page }) => {
    await mount(page, `${anchorAt(300, 300)}${popover('headline="Rename"', `<input id="name" aria-label="Name" />${LONG}`)}`, { width: 800, height: 700 });
    await open(page);
    const before = await rect(surface(page));
    expect(await surface(page).getAttribute('data-side')).toBe('bottom');
    // The keyboard: the visual viewport loses its lower 300 pixels (the layout viewport keeps its size).
    const keyboard = (covers: number) =>
      page.evaluate((cover) => {
        const real = window.visualViewport!;
        const fake = { height: window.innerHeight - cover, width: window.innerWidth, offsetTop: 0, offsetLeft: 0, scale: 1, addEventListener() {}, removeEventListener() {} };
        Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => (cover ? fake : real) });
        if (!cover) delete (window as unknown as { visualViewport?: unknown }).visualViewport;
        window.dispatchEvent(new Event('resize'));
      }, covers);
    await page.locator('#name').focus();
    await keyboard(300);
    const margin = await resolveToken(page, T('window-margin'));
    await expect.poll(async () => bottom(await rect(surface(page)))).toBeLessThanOrEqual(400 - margin + 0.5);
    const lifted = await rect(surface(page));
    expect(lifted.y).toBeGreaterThanOrEqual(margin - 0.5);
    // The focused field is in the room left.
    const field = await rect(page.locator('#name'));
    expect(field.y >= lifted.y && bottom(field) <= 400).toBe(true);
    await keyboard(0);
    await expect.poll(() => rect(surface(page))).toEqual(before);
  });
});

test.describe('size and layout', () => {
  test('POP-7: sized by its content the container is as wide as its widest part between its least and greatest width, wrapping beyond; sized by its anchor it is as wide as the anchor and follows it, at least the least width; it is never wider than the window less the margins', async ({ page }) => {
    // It narrows with the window below the compact width too: there it keeps its own presentation (POP-43).
    await mount(page, `${anchorAt(100, 100, { width: 240 })}${popover('label="Storage" compact-presentation="own"', 'Ok.')}`, { width: 900, height: 600 });
    const [min, max, margin] = [await resolveToken(page, T('container-min-width')), await resolveToken(page, T('container-max-width')), await resolveToken(page, T('window-margin'))];
    const width = async () => (await rect(container(page))).width;
    await open(page);
    expect(await width()).toBeCloseTo(min, 1);
    // As wide as its widest part: here, one line of text and the paddings.
    await host(page).evaluate((el) => (el.textContent = 'Trash still counts toward storage.'));
    await expect.poll(width).toBeGreaterThan(min);
    expect(await width()).toBeLessThan(max);
    expect(await part(page, '.content').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    const oneLine = (await rect(container(page))).height;
    await host(page).evaluate((el, text) => (el.textContent = text), LONG.slice(0, 300));
    await expect.poll(width).toBeCloseTo(max, 1);
    expect((await rect(container(page))).height).toBeGreaterThan(oneLine);
    // Its actions in one row at their own widths are a part too — also while they are a column.
    await host(page).evaluate((el) => (el.innerHTML = 'Short.<tanrei-button slot="actions" dismissive>Stop sharing</tanrei-button><tanrei-button slot="actions" confirming>Copy the link to the clipboard</tanrei-button>'));
    await expect.poll(() => part(page, '.actions').evaluate((el) => el.classList.contains('stacked'))).toBe(true);
    // Their own widths: the same two Buttons standing free, in the variant the popover gives its actions.
    const natural = await page.evaluate(async () => {
      const probe = document.createElement('div');
      probe.style.cssText = 'position: fixed; left: 0; top: 520px; display: flex';
      probe.innerHTML = '<tanrei-button variant="tonal">Stop sharing</tanrei-button><tanrei-button variant="tonal">Copy the link to the clipboard</tanrei-button>';
      document.body.appendChild(probe);
      await Promise.all([...probe.children].map((button) => (button as unknown as { updateComplete: Promise<unknown> }).updateComplete));
      const sum = [...probe.children].reduce((total, button) => total + button.getBoundingClientRect().width, 0);
      probe.remove();
      return sum;
    });
    const [padding, between] = [await resolveToken(page, T('container-padding-inline')), await resolveToken(page, T('actions-gap'))];
    expect(natural + between + 2 * padding).toBeLessThan(max);
    await expect.poll(async () => Math.abs((await width()) - (natural + between + 2 * padding))).toBeLessThanOrEqual(1);
    // width anchor: the anchor's width, following it; the greatest width does not apply, the least one does.
    await host(page).evaluate((el) => (el.textContent = 'Trash counts.'));
    await set(page, { width: 'anchor' });
    await expect.poll(width).toBeCloseTo(240, 1);
    await page.locator('#a').evaluate((el) => (el.style.inlineSize = '520px'));
    await expect.poll(width).toBeCloseTo(520, 1);
    expect(520).toBeGreaterThan(max);
    await page.locator('#a').evaluate((el) => (el.style.inlineSize = '60px'));
    await expect.poll(width).toBeCloseTo(min, 1);
    // The window: never wider than it less the margin on each side, in either mode — below the least width where it must.
    await page.locator('#a').evaluate((el) => (el.style.inlineSize = '520px'));
    await page.setViewportSize({ width: 320, height: 600 });
    await expect.poll(width).toBeCloseTo(320 - 2 * margin, 1);
    await set(page, { width: 'content' });
    await host(page).evaluate((el, text) => (el.textContent = text), LONG.slice(0, 300));
    await expect.poll(width).toBeCloseTo(320 - 2 * margin, 1);
    await page.setViewportSize({ width: 120, height: 600 });
    await expect.poll(width).toBeCloseTo(120 - 2 * margin, 1);
    expect(120 - 2 * margin).toBeLessThan(min);
  });

  test('POP-8: the container is at most its greatest height and the room its side leaves; beyond that the header and the actions stay and the content scrolls between them, a Tab stop, under scroll with a divider below the header once it is scrolled and one above the actions while more lies below; nothing is drawn while everything fits; where the header and the actions leave no room, everything scrolls together', async ({ page }) => {
    const scrolling = spec.fixtures.find((f) => f.id === 'scrolling')!;
    await mount(page, `${anchorAt(200, 20)}${popover('headline="What changed" closable close-label="Close what changed" divider-visibility="scroll"', `${scrolling.content}<tanrei-button slot="actions" confirming>Manage storage</tanrei-button>`)}`, { width: 800, height: 900 });
    await open(page);
    const content = part(page, '.content');
    const clip = part(page, '.clip');
    const shown = () => clip.evaluate((el) => [...el.querySelectorAll('.divider')].map((divider) => getComputedStyle(divider).visibility));
    // More text than the greatest height allows, with room to spare: as tall as the token.
    expect((await rect(container(page))).height).toBeCloseTo(await resolveToken(page, T('container-max-height')), 1);
    expect(await content.evaluate((el) => [el.scrollHeight > el.clientHeight, el.getAttribute('tabindex'), getComputedStyle(el).overflowY])).toEqual([true, '0', 'auto']);
    // The header and the actions stay; the divider above the actions is drawn, the one below the header is not yet.
    expect(await shown()).toEqual(['hidden', 'visible']);
    const fixed = async () => [await rect(part(page, '.header')), await rect(part(page, '.footer'))];
    const before = await fixed();
    await content.evaluate((el) => el.scrollTo(0, 60));
    await expect.poll(shown).toEqual(['visible', 'visible']);
    expect(await fixed()).toEqual(before);
    // The dividers: a hairline in the divider color across the container, hidden from assistive technology, shown at once.
    const divider = part(page, '.divider.below-header');
    expect(await divider.evaluate((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(el).transitionDuration, el.getAttribute('aria-hidden')])).toEqual([await resolveColor(page, T('divider-color')), '0s', 'true']);
    expect((await rect(divider)).height).toBeCloseTo(await resolveToken(page, T('divider-width')), 1);
    expect((await rect(divider)).width).toBeCloseTo((await rect(container(page))).width, 1);
    expect((await rect(divider)).y).toBeCloseTo(bottom(await rect(part(page, '.header'))), 1);
    await content.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await expect.poll(shown).toEqual(['visible', 'hidden']);
    // The keyboard scrolls it: it takes focus by Tab and answers the arrow keys.
    await content.evaluate((el) => el.scrollTo(0, 0));
    await content.focus();
    expect(await active(page)).toBe('div.content');
    // (Safari scrolls a focused box with the arrow keys only for a person's own key presses, which a test's are not.)
    if (test.info().project.name !== 'webkit') {
      await page.keyboard.press('ArrowDown');
      await expect.poll(() => content.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    }
    // The room its side leaves: a shorter window shortens it.
    await page.setViewportSize({ width: 800, height: 360 });
    const margin = await resolveToken(page, T('window-margin'));
    await expect.poll(async () => bottom(await rect(container(page)))).toBeCloseTo(360 - margin, 1);
    // Everything fits: no divider, and no Tab stop.
    await page.setViewportSize({ width: 800, height: 900 });
    await host(page).evaluate((el) => (el.firstChild!.textContent = 'Short.'));
    await expect.poll(() => content.evaluate((el) => el.hasAttribute('tabindex'))).toBe(false);
    expect(await shown()).toEqual(['hidden', 'hidden']);
    // No header on that side of the content: no divider there, however far it is scrolled.
    await host(page).evaluate((el, text) => (el.firstChild!.textContent = text), scrolling.content!);
    await set(page, { headline: '', closable: false });
    await content.evaluate((el) => el.scrollTo(0, 60));
    await settle(page);
    expect(await part(page, '.divider.below-header').count()).toBe(0);

    // Large text in a short window: the header and the actions alone leave no room, so all of it scrolls together.
    await mount(page, `${anchorAt(20, 20)}${popover('headline="Empty the trash for every device you own?" closable close-label="Close" compact-presentation="own"', `The 12 files in it will be deleted.${ACTIONS}`)}`, { width: 320, height: 230 });
    await override(page, { '--tanrei-dial-type-base': '32px' });
    await open(page);
    await expect.poll(() => part(page, '.clip').evaluate((el) => el.classList.contains('crowded'))).toBe(true);
    const all = part(page, '.clip');
    expect(await all.evaluate((el) => [getComputedStyle(el).overflowY, el.scrollHeight > el.clientHeight, el.getAttribute('tabindex')])).toEqual(['auto', true, '0']);
    // Nothing is cut off or unreachable: its last action can be scrolled into the container.
    await all.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    const last = await rect(host(page).locator('tanrei-button[dismissive]'));
    expect(bottom(last)).toBeLessThanOrEqual(bottom(await rect(container(page))) + 0.5);
    expect(await part(page, '.clip').evaluate((el) => [...el.querySelectorAll('.divider')].map((d) => getComputedStyle(d).visibility))).toEqual(['hidden', 'hidden']);
  });

  test('POP-8: under always — the default — both dividers stand for as long as the content scrolls, at its top and its end included; none while everything fits, and none on a side without a header', async ({ page }) => {
    const scrolling = spec.fixtures.find((f) => f.id === 'scrolling')!;
    await mount(page, `${anchorAt(200, 20)}${popover('headline="What changed" closable close-label="Close what changed"', `${scrolling.content}<tanrei-button slot="actions" confirming>Manage storage</tanrei-button>`)}`, { width: 800, height: 900 });
    await open(page);
    const content = part(page, '.content');
    const shown = () => part(page, '.clip').evaluate((el) => [...el.querySelectorAll('.divider')].map((divider) => getComputedStyle(divider).visibility));
    expect(await content.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    // At rest, nothing scrolled: the header and the actions are ruled off from the content.
    expect(await shown()).toEqual(['visible', 'visible']);
    await content.evaluate((el) => el.scrollTo(0, 60));
    await settle(page);
    expect(await shown()).toEqual(['visible', 'visible']);
    await content.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await settle(page);
    expect(await shown()).toEqual(['visible', 'visible']);
    // Everything fits: none.
    await host(page).evaluate((el) => (el.firstChild!.textContent = 'Short.'));
    await expect.poll(() => content.evaluate((el) => el.hasAttribute('tabindex'))).toBe(false);
    expect(await shown()).toEqual(['hidden', 'hidden']);
    // No header: only the divider above the actions.
    await host(page).evaluate((el, text) => (el.firstChild!.textContent = text), scrolling.content!);
    await set(page, { headline: '', closable: false });
    await settle(page);
    expect(await part(page, '.divider.below-header').count()).toBe(0);
    await expect.poll(shown).toEqual(['visible']);
  });

  test('POP-38: auto follows comp.popover.divider.visibility, which follows sys.behavior.divider-visibility; the attribute overrides it; a change is drawn at once, keeping the scroll position; an unknown value is auto and reported', async ({ page }) => {
    const seen = warnings(page);
    const scrolling = spec.fixtures.find((f) => f.id === 'scrolling')!;
    await mount(page, `${anchorAt(200, 20)}${popover('headline="What changed"', `${scrolling.content}<tanrei-button slot="actions" confirming>Manage storage</tanrei-button>`)}`, { width: 800, height: 900 });
    await open(page);
    const below = () => part(page, '.divider.below-header').evaluate((el) => getComputedStyle(el).visibility);
    expect(await below()).toBe('visible');
    await override(page, { '--tanrei-sys-behavior-divider-visibility': 'scroll' });
    await expect.poll(below).toBe('hidden');
    await override(page, { [T('divider-visibility')]: 'always' });
    await expect.poll(below).toBe('visible');
    await set(page, { dividerVisibility: 'scroll' });
    await expect(host(page)).toHaveAttribute('divider-visibility', 'scroll');
    await expect.poll(below).toBe('hidden');
    await part(page, '.content').evaluate((el) => el.scrollTo(0, 60));
    await expect.poll(below).toBe('visible');
    await set(page, { dividerVisibility: 'always' });
    expect(await part(page, '.content').evaluate((el) => el.scrollTop)).toBe(60);
    await part(page, '.content').evaluate((el) => el.scrollTo(0, 0));
    await host(page).evaluate((el) => el.setAttribute('divider-visibility', 'sometimes'));
    await settle(page);
    await expect.poll(below).toBe('visible');
    await expect.poll(() => seen.some((text) => text.includes('POP-38') && text.includes('sometimes'))).toBe(true);
  });

  test('POP-8: the keyboard focus of what scrolls — the content, or everything where everything scrolls together — is drawn inside its edges and stays there while it scrolls; its inner stroke does not move away with what is scrolled', async ({ page }) => {
    const scrolling = spec.fixtures.find((f) => f.id === 'scrolling')!;
    await mount(page, `${anchorAt(200, 20)}${popover('headline="What changed" closable close-label="Close what changed"', `${scrolling.content}<tanrei-button slot="actions" confirming>Manage storage</tanrei-button>`)}`, { width: 800, height: 900 });
    await open(page);
    const content = part(page, '.content');
    await tabTo(page, content);
    expect(await content.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
    expect(await innerStrokeAtEdges(page, content), 'the content, before it is scrolled').toEqual({ top: true, bottom: true });
    await content.evaluate((el) => (el.scrollTop = 40));
    expect(await content.evaluate((el) => el.scrollTop)).toBe(40);
    expect(await innerStrokeAtEdges(page, content), 'the content, scrolled by 40').toEqual({ top: true, bottom: true });
    await content.evaluate((el) => (el.scrollTop = el.scrollHeight));
    expect(await innerStrokeAtEdges(page, content), 'the content, scrolled to its end').toEqual({ top: true, bottom: true });

    // Everything scrolls together: the box is the container's.
    await mount(page, `${anchorAt(20, 20)}${popover('headline="Empty the trash for every device you own?" closable close-label="Close" compact-presentation="own"', `The 12 files in it will be deleted.${ACTIONS}`)}`, { width: 320, height: 230 });
    await override(page, { '--tanrei-dial-type-base': '32px' });
    await open(page);
    const all = part(page, '.clip');
    await expect.poll(() => all.evaluate((el) => el.classList.contains('crowded'))).toBe(true);
    await expect(all).toHaveAttribute('tabindex', '0');
    await tabTo(page, all);
    expect(await all.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
    expect(await innerStrokeAtEdges(page, all), 'everything, before it is scrolled').toEqual({ top: true, bottom: true });
    await all.evaluate((el) => (el.scrollTop = 30));
    expect(await innerStrokeAtEdges(page, all), 'everything, scrolled by 30').toEqual({ top: true, bottom: true });
    await all.evaluate((el) => (el.scrollTop = el.scrollHeight));
    expect(await innerStrokeAtEdges(page, all), 'everything, scrolled to its end').toEqual({ top: true, bottom: true });
  });

  test('POP-9: inside the block padding the header comes first, the content container.gap below it, the actions actions.margin-block-start below the content; the content is inset by the inline padding, and with inset false reaches the start and end edges, and the top and bottom edges where no header or no action stands there', async ({ page }) => {
    await mount(page, `${anchorAt(200, 60)}${popover('headline="Empty the trash?"', `<div id="c">The 12 files in it will be deleted from every device.</div>${ACTIONS}`)}`);
    await open(page);
    const [padBlock, padInline, gap, above] = [
      await resolveToken(page, T('container-padding-block')),
      await resolveToken(page, T('container-padding-inline')),
      await resolveToken(page, T('container-gap')),
      await resolveToken(page, T('actions-margin-block-start')),
    ];
    const boxes = async () => ({ box: await rect(container(page)), headline: await rect(part(page, '.headline')), content: await rect(page.locator('#c')), action: await rect(host(page).locator('tanrei-button[confirming]')) });
    let b = await boxes();
    expect(b.headline.y - b.box.y).toBeCloseTo(padBlock, 1);
    expect(b.content.y - bottom(b.headline)).toBeCloseTo(gap, 1);
    expect(b.action.y - bottom(b.content)).toBeCloseTo(above, 1);
    expect(bottom(b.box) - bottom(b.action)).toBeCloseTo(padBlock, 1);
    expect(b.content.x - b.box.x).toBeCloseTo(padInline, 1);
    expect(right(b.box) - right(b.content)).toBeCloseTo(padInline, 1);
    // inset false: to the start and end edges; the header and the actions keep their insets, and the gaps stay.
    await set(page, { inset: false });
    await expect.poll(async () => (await boxes()).content.x - (await boxes()).box.x).toBeCloseTo(0, 1);
    b = await boxes();
    expect(right(b.box) - right(b.content)).toBeCloseTo(0, 1);
    expect(b.headline.x - b.box.x).toBeCloseTo(padInline, 1);
    expect(right(b.box) - right(b.action)).toBeCloseTo(padInline, 1);
    expect(b.content.y - bottom(b.headline)).toBeCloseTo(gap, 1);
    expect(await host(page).evaluate((el) => el.hasAttribute('no-inset'))).toBe(true);
    // No header and no action: the content reaches the top and bottom edges too, clipped by the container's shape.
    await host(page).evaluate((el) => el.querySelectorAll('tanrei-button').forEach((button) => button.remove()));
    await set(page, { headline: '', label: 'Storage' });
    const alone = async () => ({ box: await rect(container(page)), content: await rect(page.locator('#c')) });
    await expect.poll(async () => (await alone()).content.y - (await alone()).box.y).toBeCloseTo(0, 1);
    expect(bottom((await alone()).box) - bottom((await alone()).content)).toBeCloseTo(0, 1);
    expect(await part(page, '.clip').evaluate((el) => getComputedStyle(el).overflowX)).toBe('hidden');
    // …and with the inset back, the block padding at both.
    await set(page, { inset: true });
    await expect.poll(async () => (await alone()).content.y - (await alone()).box.y).toBeCloseTo(padBlock, 1);
    expect(bottom((await alone()).box) - bottom((await alone()).content)).toBeCloseTo(padBlock, 1);
    // No content: the actions come actions.margin-block-start below the header.
    await host(page).evaluate((el, actions) => (el.innerHTML = actions), ACTIONS);
    await set(page, { headline: 'Empty the trash?' });
    await expect.poll(async () => (await rect(host(page).locator('tanrei-button[confirming]'))).y - bottom(await rect(part(page, '.headline')))).toBeCloseTo(above, 1);
  });

  test('POP-10: an arrow is drawn while arrow is true, or unset under a system whose arrow.visible is on: a triangle of arrow.width by arrow.height on the edge that faces the anchor, one shape with the container under one elevation, pointing at the middle of the anchor’s edge it stands beside and staying off the corners; it moves with the container, is not drawn over the anchor, takes no press and is hidden from assistive technology', async ({ page }) => {
    await mount(page, `${anchorAt(350, 250)}${popover('label="Storage"', 'Trash still counts toward storage.')}`);
    await open(page);
    const arrow = part(page, '.arrow');
    const drawn = () => surface(page).evaluate((el) => el.hasAttribute('data-arrow'));
    expect(await token(page, T('arrow-visible'))).toBe('off');
    expect(await drawn()).toBe(false);
    expect(await css(arrow, 'display')).toBe('none');
    const without = await rect(surface(page));
    await set(page, { arrow: true });
    await expect.poll(drawn).toBe(true);
    const [w, h, inset, radius] = [await resolveToken(page, T('arrow-width')), await resolveToken(page, T('arrow-height')), await resolveToken(page, T('arrow-inset')), await resolveToken(page, T('container-shape'))];
    const anchor = await rect(page.locator('#a'));
    // Below the anchor: on the container's top edge, its tip the offset from the anchor; the container stands its height farther.
    let box = await rect(surface(page));
    let tri = await rect(arrow);
    expect(box.y - without.y).toBeCloseTo(h, 1);
    expect(tri.width).toBeCloseTo(w, 1);
    expect(tri.y).toBeCloseTo(box.y - h, 1);
    expect(tri.y - bottom(anchor)).toBeCloseTo(await resolveToken(page, T('offset')), 1);
    // It points at the middle of the anchor's edge (the container, start-aligned and wider, stands beside all of it).
    expect(centerX(tri)).toBeCloseTo(centerX(anchor), 1);
    // One shape, one elevation: the container gives up its own shadow for the filter round both, in the container's color
    // — set on the placed box, which draws what moves inside it: what moves keeps its own filter for the appearance's blur.
    expect(await css(container(page), 'box-shadow')).toBe('none');
    expect(await surface(page).evaluate((el) => [el.style.filter.includes('#shade'), !!el.querySelector('filter#shade feMerge')])).toEqual([true, true]);
    expect(await part(page, '.motion').evaluate((el) => [el.style.filter, getComputedStyle(el).filter])).toEqual(['', 'none']);
    expect(await css(arrow, 'background-color')).toBe(await resolveColor(page, T('container-color')));
    expect(await arrow.evaluate((el) => [el.getAttribute('aria-hidden'), getComputedStyle(el).clipPath.startsWith('polygon')])).toEqual(['true', true]);
    // Off the corners: a narrow anchor at the container's end keeps the base arrow.inset (or the radius) from the end.
    await set(page, { placement: 'bottom-end', crossOffset: 5000 });
    await settle(page);
    box = await rect(surface(page));
    tri = await rect(arrow);
    expect(tri.x - box.x).toBeGreaterThanOrEqual(Math.max(inset, radius) - 0.6);
    // It moves with the container: flipped above, it is on the bottom edge, pointing down at the anchor again.
    await set(page, { placement: 'top', crossOffset: 0 });
    await settle(page);
    box = await rect(surface(page));
    tri = await rect(arrow);
    expect(await surface(page).getAttribute('data-side')).toBe('top');
    expect(bottom(tri)).toBeCloseTo(bottom(box) + h, 1);
    expect(centerX(tri)).toBeCloseTo(centerX(anchor), 1);
    await set(page, { placement: 'end' });
    await settle(page);
    box = await rect(surface(page));
    tri = await rect(arrow);
    expect(tri.x).toBeCloseTo(box.x - h, 1);
    expect(tri.height).toBeCloseTo(w, 1);
    expect(centerY(tri)).toBeCloseTo(centerY(anchor), 1);
    // A press on the arrow is the popover's, not a press outside.
    await page.mouse.click(tri.x + h / 2, centerY(tri));
    expect(await log(page)).toEqual([]);
    // The system's choice while unset; arrow="false" refuses it.
    await set(page, { arrow: null, placement: 'bottom' });
    await expect.poll(drawn).toBe(false);
    await override(page, { [T('arrow-visible')]: 'on' });
    await expect.poll(drawn).toBe(true);
    await host(page).evaluate((el) => el.setAttribute('arrow', 'false'));
    await expect.poll(drawn).toBe(false);
    expect(await host(page).evaluate((el) => (el as unknown as { arrow: boolean | null }).arrow)).toBe(false);
    await host(page).evaluate((el) => el.removeAttribute('arrow'));
    await expect.poll(drawn).toBe(true);
    expect(await host(page).evaluate((el) => (el as unknown as { arrow: boolean | null }).arrow)).toBe(null);
  });

  test('POP-11: the header is one row — the headline from the inline padding after the start edge, taking the width the close button leaves, the close button at the row’s end, header.gap after the headline, both on the row’s first line — as tall as the taller of the two, and it stays in place while the content scrolls', async ({ page }) => {
    await mount(page, `${anchorAt(200, 20)}${popover('headline="Storage" closable close-label="Close storage"', LONG)}`, { height: 500 });
    await open(page);
    const [padInline, padBlock, gap] = [await resolveToken(page, T('container-padding-inline')), await resolveToken(page, T('container-padding-block')), await resolveToken(page, T('header-gap'))];
    const read = async () => ({ box: await rect(container(page)), header: await rect(part(page, '.header')), headline: await rect(part(page, '.headline')), close: await rect(part(page, 'tanrei-button.close').locator('button')) });
    let b = await read();
    expect(b.headline.x - b.box.x).toBeCloseTo(padInline, 1);
    expect(right(b.box) - right(b.close)).toBeCloseTo(padInline, 1);
    expect(b.close.x - right(b.headline)).toBeCloseTo(gap, 1);
    // One line: the button is the taller, the header is as tall as it (inside the block padding), the line centred on it.
    expect(b.header.height - padBlock).toBeCloseTo(b.close.height, 1);
    const firstLine = () => part(page, '.headline').evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const line = range.getClientRects()[0];
      return line.y + line.height / 2;
    });
    expect(Math.abs((await firstLine()) - centerY(b.close))).toBeLessThanOrEqual(1);
    // The header stays while the content scrolls.
    await part(page, '.content').evaluate((el) => el.scrollTo(0, 80));
    await settle(page);
    expect((await read()).header).toEqual(b.header);
    // A headline that wraps grows the header; the close button stays on its first line.
    await set(page, { headline: 'Everything that counts toward the storage of this account and of the people it is shared with' });
    await expect.poll(async () => (await read()).header.height).toBeGreaterThan(b.header.height + 10);
    b = await read();
    expect(Math.abs((await firstLine()) - centerY(b.close))).toBeLessThanOrEqual(1);
    expect(b.header.height - padBlock).toBeCloseTo(b.headline.height, 1);
    expect(b.close.x - right(b.headline)).toBeGreaterThanOrEqual(gap - 0.6);
    // No headline: the close button alone, at the row's end.
    await set(page, { headline: '', label: 'Storage' });
    await expect.poll(() => part(page, '.headline').count()).toBe(0);
    expect(right(await rect(container(page))) - right(await rect(part(page, 'tanrei-button.close').locator('button')))).toBeCloseTo(padInline, 1);
  });

  test('POP-12: the headline is drawn in its typescale and color, wraps onto more lines rather than truncating, growing the header, and is exposed as a heading', async ({ page }) => {
    await mount(page, `${anchorAt(200, 60)}${popover('headline="Storage"')}`);
    await open(page);
    const headline = part(page, '.headline');
    expect(await css(headline, 'color')).toBe(await resolveColor(page, T('headline-color')));
    expect(Number.parseFloat(await css(headline, 'font-size'))).toBeCloseTo(await resolveToken(page, T('headline-typescale-font-size')), 1);
    expect(await css(headline, 'font-weight')).toBe(await token(page, '--tanrei-sys-typescale-heading-6-font-weight').then(async () => page.evaluate((n) => {
      const probe = document.createElement('div');
      probe.style.font = `var(${n})`;
      document.body.appendChild(probe);
      const weight = getComputedStyle(probe).fontWeight;
      probe.remove();
      return weight;
    }, T('headline-typescale-font'))));
    await expect(page.getByRole('heading', { name: 'Storage' })).toHaveCount(1);
    const one = await rect(headline);
    await set(page, { headline: 'Everything that counts toward the storage of this account and of the people it is shared with' });
    await expect.poll(async () => (await rect(headline)).height).toBeGreaterThan(one.height * 1.9);
    expect(await headline.evaluate((el) => [getComputedStyle(el).textOverflow, getComputedStyle(el).whiteSpace, el.scrollWidth <= el.clientWidth])).toEqual(['clip', 'normal', true]);
    expect(right(await rect(headline))).toBeLessThanOrEqual(right(await rect(container(page))));
  });

  test('POP-13: while closable the header ends with an icon-only small Button showing the close glyph, named by closeLabel, in close-button.variant given through the Button’s channel and otherwise its own; activating it emits close once with the reason close; an empty closeLabel still draws it and is reported; the popover draws no close mark of its own', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, `${anchorAt(200, 60)}${popover('headline="Storage" closable close-label="Close storage" data-keep')}`);
    await open(page);
    const button = part(page, 'tanrei-button.close');
    expect(await token(page, T('close-button-variant'))).toBe('tonal');
    // No variant attribute: the popover gives it, and the Button draws that variant from its own tokens.
    expect(await button.evaluate((el) => [el.getAttribute('size'), el.hasAttribute('variant'), el.querySelector('[slot="icon"]')!.textContent, el.getAttribute('part')])).toEqual(['small', false, 'close', 'close-button']);
    await page.mouse.move(0, 0);
    expect(await button.locator('button').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(await resolveColor(page, '--tanrei-comp-button-tonal-container-color'));
    // Small: 32 × 32 in the default system, the small Button's own height.
    const box = await rect(button.locator('button'));
    expect(box.height).toBeCloseTo(await resolveToken(page, '--tanrei-comp-button-container-height-small'), 1);
    expect([Math.round(box.width), Math.round(box.height)]).toEqual([32, 32]);
    await expect(page.getByRole('button', { name: 'Close storage', exact: true })).toHaveCount(1);
    // It answers as any Button does: hover paints the Button's own hovered container.
    await button.hover();
    await expect.poll(() => button.locator('button').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(await resolveColor(page, '--tanrei-comp-button-tonal-hovered-container-color'));
    // A system's choice of variant reaches it through the same channel.
    await page.mouse.move(0, 0);
    await override(page, { [T('close-button-variant')]: 'text' });
    await set(page, { headline: 'Storage used' });
    await expect.poll(() => button.locator('button').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(await resolveColor(page, '--tanrei-comp-button-text-container-color'));
    // Activated by pointer, Enter and Space: close, once each, with the reason close.
    await button.click();
    expect(await log(page)).toEqual(['p:close']);
    await button.locator('button').focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    expect(await log(page)).toEqual(['p:close', 'p:close', 'p:close']);
    // No mark of its own: nothing but the Button draws in the header beside the headline.
    expect(await part(page, '.header').evaluate((el) => [...el.querySelectorAll('svg, path, img').values()].length)).toBe(0);
    expect(seen.filter((text) => text.includes('POP-13'))).toEqual([]);
    await set(page, { closeLabel: '' });
    await expect.poll(() => seen.filter((text) => text.includes('POP-13')).length).toBe(1);
    expect(seen.find((text) => text.includes('POP-13'))).toContain('close-label is empty');
    await expect(button).toHaveCount(1);
  });

  test('POP-13: the presets keep the bare close glyph they inherited — m3-like, m3-expressive-like and cupertino give the close button the text variant, at their own small Button size', async ({ page }) => {
    for (const system of ['m3-like', 'm3-expressive-like', 'cupertino'] as const) {
      await mountFixtures(page, spec, { icons: true, system, fixtures: spec.fixtures.filter((f) => f.id === 'closable') });
      const button = fixtureHost(page, 'closable').locator('tanrei-button.close');
      await expect(button, system).toHaveCount(1);
      expect(await token(page, T('close-button-variant')), system).toBe('text');
      await expect.poll(() => button.locator('button').evaluate((el) => getComputedStyle(el).backgroundColor), system).toBe(await resolveColor(page, '--tanrei-comp-button-text-container-color'));
      expect((await rect(button.locator('button'))).height, system).toBeCloseTo(await resolveToken(page, '--tanrei-comp-button-container-height-small'), 1);
    }
  });

  test('POP-14: the content inherits comp.popover.content.color and plain text takes the body role; the popover does not lay out or restyle what it holds, which may be anything that takes input', async ({ page }) => {
    await mount(page, `${anchorAt(200, 60)}${popover('label="Storage"', 'Plain text. <a id="link" href="#x">A link</a> <input id="field" aria-label="Name" /> <tanrei-button id="inner" variant="outlined">A button</tanrei-button><span id="probe" style="display: inline-flex; gap: 3px">x</span>')}`);
    await open(page);
    const content = part(page, '.content');
    expect(await css(content, 'color')).toBe(await resolveColor(page, T('content-color')));
    expect(await page.locator('#probe').evaluate((el) => getComputedStyle(el).color)).toBe(await resolveColor(page, T('content-color')));
    expect(Number.parseFloat(await css(content, 'font-size'))).toBeCloseTo(await resolveToken(page, '--tanrei-sys-typescale-body-font-size'), 1);
    // What it holds is the product's: its own display and gap, and its own variant.
    expect(await page.locator('#probe').evaluate((el) => [getComputedStyle(el).display, getComputedStyle(el).columnGap])).toEqual(['inline-flex', '3px']);
    await expect(page.locator('#inner')).toHaveAttribute('variant', 'outlined');
    // It takes input: a field is typed in, a button is pressed, and nothing closes.
    await page.locator('#field').click();
    await page.keyboard.type('Report');
    await expect(page.locator('#field')).toHaveValue('Report');
    await page.locator('#inner').click();
    expect(await log(page)).toEqual([]);
    expect(await isShown(page)).toBe(true);
  });

  test('POP-15: the actions are laid out as a Button group lays out its items — dismissive at the start and confirming at the end of a row, confirming on top of a column, focus following that order; fill shares the inner width equally, end keeps their own widths at the end; a row while it fits and a column otherwise, decided again when the width changes', async ({ page }) => {
    await mount(
      page,
      `${anchorAt(200, 60)}${popover('headline="Empty the trash?"', 'The 12 files in it will be deleted from every device.<tanrei-button slot="actions" confirming>Empty</tanrei-button><tanrei-button slot="actions">Later</tanrei-button><tanrei-button slot="actions" dismissive>Cancel</tanrei-button>')}`,
    );
    await open(page);
    const actions = part(page, '.actions');
    const action = (label: string) => host(page).locator('tanrei-button', { hasText: label }).locator('button');
    const [padInline, gap] = [await resolveToken(page, T('container-padding-inline')), await resolveToken(page, T('actions-gap'))];
    expect(await token(page, T('actions-arrangement'))).toBe('fill');
    await expect(actions).not.toHaveClass(/stacked/);
    let [cancel, later, empty, box] = [await rect(action('Cancel')), await rect(action('Later')), await rect(action('Empty')), await rect(container(page))];
    // A row: dismissive first, the unflagged one between, confirming last; equal shares of the inner width, gap apart.
    expect(cancel.x - box.x).toBeCloseTo(padInline, 1);
    expect(right(box) - right(empty)).toBeCloseTo(padInline, 1);
    expect(later.x - right(cancel)).toBeCloseTo(gap, 1);
    expect(empty.x - right(later)).toBeCloseTo(gap, 1);
    expect([later.width, empty.width].map((width) => Math.round(width))).toEqual([Math.round(cancel.width), Math.round(cancel.width)]);
    expect(cancel.y).toBe(empty.y);
    // Focus and reading follow the placed order, not the order they were written in.
    await container(page).focus();
    const order: string[] = [];
    for (let i = 0; i < 3; i++) {
      await tab(page);
      order.push(await activeButton(page));
    }
    expect(order).toEqual(['Cancel', 'Later', 'Empty']);
    // A label that no longer fits its share: a column, confirming on top, each as wide as the column.
    await host(page).locator('tanrei-button[confirming]').evaluate((el) => (el.textContent = 'Empty the trash on every device now'));
    await expect(actions).toHaveClass(/stacked/);
    [cancel, later, empty, box] = [await rect(action('Cancel')), await rect(action('Later')), await rect(action('Empty the trash')), await rect(container(page))];
    expect(empty.y).toBeLessThan(later.y);
    expect(later.y).toBeLessThan(cancel.y);
    expect(later.y - bottom(empty)).toBeCloseTo(gap, 1);
    expect(empty.width).toBeCloseTo(box.width - 2 * padInline, 1);
    expect(cancel.width).toBeCloseTo(empty.width, 1);
    await container(page).focus();
    await tab(page);
    expect(await activeButton(page)).toBe('Empty the trash on every device now');
    // Decided again when the label fits again.
    await host(page).locator('tanrei-button[confirming]').evaluate((el) => (el.textContent = 'Empty'));
    await expect(actions).not.toHaveClass(/stacked/);
    // end (a system's choice): their own widths, the row aligned to the end; a column as wide as its widest action.
    await override(page, { [T('actions-arrangement')]: 'end' });
    await set(page, { headline: 'Empty the trash now?' });
    await expect.poll(async () => (await rect(action('Empty'))).width).toBeLessThan(cancel.width - 1);
    [cancel, later, empty, box] = [await rect(action('Cancel')), await rect(action('Later')), await rect(action('Empty')), await rect(container(page))];
    expect(right(box) - right(empty)).toBeCloseTo(padInline, 1);
    expect(cancel.x - box.x).toBeGreaterThan(padInline + 1);
    expect(empty.x - right(later)).toBeCloseTo(gap, 1);
    expect(Math.round(empty.width)).not.toBe(Math.round(cancel.width));
    await host(page).locator('tanrei-button[confirming]').evaluate((el) => (el.textContent = 'Empty the trash on every device now'));
    await expect(actions).toHaveClass(/stacked/);
    [cancel, empty, box] = [await rect(action('Cancel')), await rect(action('Empty the trash')), await rect(container(page))];
    expect(right(box) - right(empty)).toBeCloseTo(padInline, 1);
    expect(cancel.width).toBeCloseTo(empty.width, 1);
    expect(right(cancel)).toBeCloseTo(right(empty), 1);
    // As wide as its widest action, not as the container.
    expect(empty.width).toBeLessThan(box.width - 2 * padInline - 1);
    expect(empty.y).toBeLessThan(cancel.y);
  });

  test('POP-16: an action without a variant is given comp.popover.actions.variant through the Button’s channel and renders from that variant’s tokens and states; one with a variant keeps it; confirming and dismissive change no look', async ({ page }) => {
    await mount(page, `${anchorAt(200, 60)}${popover('headline="Empty the trash?"', `Text.${ACTIONS}<tanrei-button slot="actions" variant="outlined">Later</tanrei-button>`)}`);
    await open(page);
    const action = (label: string) => host(page).locator('tanrei-button', { hasText: label });
    const paint = (label: string) => action(label).locator('button').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(await token(page, T('actions-variant'))).toBe('tonal');
    const tonal = await resolveColor(page, '--tanrei-comp-button-tonal-container-color');
    await page.mouse.move(0, 0);
    for (const label of ['Cancel', 'Empty']) {
      await expect(action(label)).not.toHaveAttribute('variant');
      expect(await paint(label), label).toBe(tonal);
      expect((await rect(action(label).locator('button'))).height).toBeCloseTo(await resolveToken(page, '--tanrei-comp-button-container-height-medium'), 1);
    }
    // Its states are the variant's.
    await action('Empty').hover();
    await expect.poll(() => paint('Empty')).toBe(await resolveColor(page, '--tanrei-comp-button-tonal-hovered-container-color'));
    await page.mouse.move(0, 0);
    // Set: left as set.
    await expect(action('Later')).toHaveAttribute('variant', 'outlined');
    expect(await paint('Later')).toBe(await resolveColor(page, '--tanrei-comp-button-outlined-container-color'));
    // A system's choice reaches every action without one, and only those.
    await override(page, { [T('actions-variant')]: 'filled' });
    await set(page, { headline: 'Empty it?' });
    await expect.poll(() => paint('Cancel')).toBe(await resolveColor(page, '--tanrei-comp-button-filled-container-color'));
    expect(await paint('Empty')).toBe(await paint('Cancel'));
    expect(await paint('Later')).toBe(await resolveColor(page, '--tanrei-comp-button-outlined-container-color'));
    // The variant attribute, once written, wins.
    await action('Cancel').evaluate((el) => el.setAttribute('variant', 'text'));
    await expect.poll(() => paint('Cancel')).toBe(await resolveColor(page, '--tanrei-comp-button-text-container-color'));
  });

  test('POP-17: activating an action emits the Button’s own click and nothing else — the popover does not close or emit close, whichever flag the action carries; the product closes it from the handler, and focus returns to the opener', async ({ page }) => {
    await mount(page, `<div style="padding: 60px 200px"><button id="a" type="button">Storage</button></div>${popover('headline="Empty the trash?"', `Text.${ACTIONS}<tanrei-button slot="actions">Later</tanrei-button>`)}`);
    await page.evaluate(() => {
      const w = window as unknown as { __log: string[] };
      for (const button of document.querySelectorAll('tanrei-button[slot="actions"]')) button.addEventListener('click', () => w.__log.push(`click:${button.textContent}`));
    });
    await page.locator('#a').focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => isShown(page)).toBe(true);
    for (const label of ['Cancel', 'Later', 'Empty']) await host(page).locator('tanrei-button', { hasText: label }).click();
    await host(page).locator('tanrei-button[confirming] button').focus();
    await page.keyboard.press('Enter');
    expect(await log(page)).toEqual(['click:Cancel', 'click:Later', 'click:Empty', 'click:Empty']);
    expect(await isShown(page)).toBe(true);
    // The product closes it from the action's handler: focus was on the action, and goes back to the opener.
    await host(page).locator('tanrei-button[confirming]').evaluate((el) => el.addEventListener('click', () => ((document.querySelector('tanrei-popover') as unknown as { open: boolean }).open = false)));
    await page.keyboard.press('Enter');
    await expect.poll(() => isOpen(page)).toBe(false);
    await expect.poll(() => active(page)).toBe('#a');
    expect((await log(page)).filter((entry) => entry.startsWith('p:'))).toEqual([]);
  });
});

test.describe('opening and focus', () => {
  test('POP-18: it is shown exactly while open is true — hovering, focusing or long-pressing the anchor opens nothing and emits nothing; the opener says it opens a dialog, whether it is open and which it is, and keeps its name and role; a named opener carries them instead of the anchor, and they are taken back when the popover leaves the page', async ({ page }) => {
    await mount(page, `<div style="padding: 80px 200px"><button id="a" type="button">Storage</button> <tanrei-button id="t" variant="outlined">Filters</tanrei-button></div>${popover('label="Storage"')}<${TAG} id="q" anchor="t" label="Filters">Filters.</${TAG}>`);
    const states = (selector: string) => page.locator(selector).evaluate((el) => [el.getAttribute('aria-haspopup'), el.getAttribute('aria-expanded'), el.getAttribute('aria-controls')]);
    expect(await states('#a')).toEqual(['dialog', 'false', 'p']);
    // Hover, focus and a long press: open stays false and nothing is emitted.
    await page.locator('#a').hover();
    await page.locator('#a').focus();
    const box = await rect(page.locator('#a'));
    await page.mouse.move(centerX(box), centerY(box));
    await page.waitForTimeout(700);
    await page.evaluate(() => document.querySelector('#a')!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' })));
    await page.waitForTimeout(700);
    expect([await isOpen(page), await log(page), await states('#a')]).toEqual([false, [], ['dialog', 'false', 'p']]);
    // The product sets open when the opener is activated — by pointer, Enter or Space — and to false when it is activated again.
    await page.locator('#a').click();
    await expect.poll(() => isShown(page)).toBe(true);
    expect(await states('#a')).toEqual(['dialog', 'true', 'p']);
    await page.locator('#a').click();
    await expect.poll(() => isOpen(page)).toBe(false);
    expect(await states('#a')).toEqual(['dialog', 'false', 'p']);
    for (const key of ['Enter', 'Space']) {
      await page.locator('#a').focus();
      await page.keyboard.press(key);
      await expect.poll(() => isShown(page)).toBe(true);
      await close(page);
    }
    // It stays open for as long as open is true, whatever the pointer does: no delay, no timeout.
    await open(page);
    await page.mouse.move(700, 500);
    await page.waitForTimeout(600);
    expect(await isShown(page)).toBe(true);
    // The opener's own name and role are untouched.
    await expect(page.getByRole('button', { name: 'Storage', exact: true })).toHaveCount(1);
    await close(page);
    // A Tanrei Button as the opener: the states are on the button it draws, which is what is focused and read.
    const inner = () => page.locator('#t').evaluate((el) => ['aria-haspopup', 'aria-expanded', 'aria-controls'].map((name) => el.shadowRoot!.querySelector('button')!.getAttribute(name)));
    expect(await inner()).toEqual(['dialog', 'false', null]);
    await open(page, 'q');
    expect(await inner()).toEqual(['dialog', 'true', null]);
    await close(page, 'q');
    // A separate opener: it carries the states, and the container is placed against the anchor.
    await mount(page, `<div style="padding: 80px 200px"><span id="field" style="display: inline-block; inline-size: 240px; border: 1px solid">Field <button id="o" type="button">Open</button></span></div><${TAG} id="p" anchor="field" opener="o" label="Suggestions">Trash counts.</${TAG}>`);
    expect(await states('#o')).toEqual(['dialog', 'false', 'p']);
    expect(await states('#field')).toEqual([null, null, null]);
    await page.locator('#o').click();
    await expect.poll(() => isShown(page)).toBe(true);
    expect(await states('#o')).toEqual(['dialog', 'true', 'p']);
    expectPlaced('bottom-start', await rect(page.locator('#field')), await rect(surface(page)), await resolveToken(page, T('offset')));
    // Everything said of the opener holds for it: a press on it is not a press outside, and focus returns to it.
    await page.locator('#o').click();
    await expect.poll(() => isOpen(page)).toBe(false);
    expect(await log(page)).toEqual([]);
    await page.locator('#o').focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => isShown(page)).toBe(true);
    await page.keyboard.press('Escape');
    await expect.poll(() => active(page)).toBe('#o');
    // Disconnected: what it wrote on the opener is removed.
    await host(page).evaluate((el) => el.remove());
    expect(await states('#o')).toEqual([null, null, null]);
  });

  test('POP-19: opening moves focus to the element marked autofocus, or to the container, at once and not when the motion ends, with a focus indicator on the container only when it was opened from the keyboard; initialFocus anchor leaves focus where it is; a popover mounted open moves no focus', async ({ page }) => {
    await mount(page, `<div style="padding: 80px 200px"><button id="a" type="button">Storage</button></div>${popover('headline="Rename"', '<input id="one" aria-label="One" /><input id="two" aria-label="Two" />')}`, { reducedMotion: false });
    // From the keyboard: the container takes focus, so its name is read first, and shows the indicator.
    await tabTo(page, page.locator('#a'));
    // What focus is on is kept at the moment the surface's motion begins — as the engine announces it, not asked for
    // afterwards, when on a slow runner a motion of this length is over.
    await watchTransitions(part(page, '.motion'));
    await part(page, '.motion').evaluate((el) => {
      el.addEventListener('transitionrun', () => ((window as any).focusAtMotion ??= (el.getRootNode() as Document | ShadowRoot).activeElement?.className ?? null), { once: true });
    });
    await page.keyboard.press('Enter');
    await expect.poll(() => active(page)).toBe('div.container');
    // Focus moved when it opened, not when its motion ended.
    await expect.poll(async () => (await transitionsRun(part(page, '.motion'))).filter((run) => run.own).length).toBeGreaterThan(0);
    expect(await page.evaluate(() => (window as any).focusAtMotion)).toContain('container');
    expect(await container(page).evaluate((el) => [el.getAttribute('tabindex'), el.matches(':focus-visible'), getComputedStyle(el).outlineStyle !== 'none'])).toEqual(['-1', true, true]);
    // As sys.behavior.focus-style names: the style is read when focus arrives, for a browser without style queries.
    expect(await container(page).getAttribute('data-focus-style')).toBe(await token(page, '--tanrei-sys-behavior-focus-style'));
    expect(await css(container(page), 'outline-color')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    // The next Tab reaches its first focusable element.
    await tab(page);
    expect(await active(page)).toBe('#one');
    await close(page);
    // From a pointer: focus moves in the same way, with no indicator — even where the browser would show one for a
    // focus a script moved (the opener still had keyboard focus when it was pressed).
    await page.locator('#a').click();
    await expect.poll(() => active(page)).toBe('div.container');
    expect(await container(page).evaluate((el) => [el.hasAttribute('data-focus-quiet'), getComputedStyle(el).outlineStyle, getComputedStyle(el, '::after').content === 'none' || getComputedStyle(el, '::after').display === 'none'])).toEqual([true, 'none', true]);
    await close(page);
    // …and from the keyboard again, with one.
    await page.locator('#a').focus();
    await page.keyboard.press('Space');
    await expect.poll(() => active(page)).toBe('div.container');
    expect(await container(page).evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none');
    await close(page);
    // The product's mark: the platform's autofocus, on a slotted element.
    await page.locator('#two').evaluate((el) => el.setAttribute('autofocus', ''));
    await page.locator('#a').focus();
    await open(page);
    expect(await active(page)).toBe('#two');
    await close(page);
    // initialFocus anchor: focus stays where it is — even with a marked element — and the field keeps its keys.
    await set(page, { initialFocus: 'anchor' });
    await page.locator('#a').focus();
    await open(page);
    expect(await active(page)).toBe('#a');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Home');
    expect([await active(page), await isShown(page), await log(page)]).toEqual(['#a', true, []]);
    // …except Escape, which closes it (POP-23).
    await page.keyboard.press('Escape');
    await expect.poll(() => log(page)).toEqual(['p:escape']);

    // Mounted open: shown, and focus is where it was.
    await mount(page, `<div style="padding: 80px 200px"><button id="a" type="button">Storage</button></div>${popover('headline="Rename" open', '<input id="one" aria-label="One" />')}`);
    await expect.poll(() => isShown(page)).toBe(true);
    expect(await active(page)).toBe('body');
    expect(await page.locator('#a').getAttribute('aria-expanded')).toBe('true');
  });

  test('POP-20: the popover stands in the focus order directly after its opener, wherever it is in the document: Tab from the opener reaches its first element, Shift+Tab from that element returns to the opener and leaves it open, Tab moves through it in the order its parts are placed and, from its last element, on to what follows the opener, which closes it; nothing wraps', async ({ page }) => {
    // The spec's verify, with the popover far from its opener in the document and then directly after it.
    const pages = {
      apart: `<div style="padding: 80px 200px"><a id="before" href="#b">Before</a> <button id="a" type="button">Storage</button> <a id="after" href="#a">After</a> <a id="last" href="#l">Last</a></div>${popover('headline="Rename" closable close-label="Close" initial-focus="anchor"', `<input id="one" aria-label="One" /><input id="two" aria-label="Two" />${ACTIONS}`)}`,
      adjacent: `<div style="padding: 80px 200px"><a id="before" href="#b">Before</a> <button id="a" type="button">Storage</button>${popover('headline="Rename" closable close-label="Close" initial-focus="anchor"', `<input id="one" aria-label="One" /><input id="two" aria-label="Two" />${ACTIONS}`)} <a id="after" href="#a">After</a> <a id="last" href="#l">Last</a></div>`,
    };
    for (const [where, markup] of Object.entries(pages)) {
      await mount(page, markup);
      await page.locator('#a').focus();
      await open(page);
      expect(await active(page), where).toBe('#a');
      const seen: string[] = [];
      const step = async (back = false) => {
        await tab(page, { back });
        const at = await active(page);
        seen.push(at === 'button' || at.startsWith('button.') ? `button:${await activeButton(page)}` : at);
      };
      // Tab from the opener: through the close button, the content's fields and the actions, in the order they are placed.
      for (let i = 0; i < 5; i++) await step();
      expect(seen, where).toEqual(['button:Close', '#one', '#two', 'button:Cancel', 'button:Empty']);
      expect(await log(page), where).toEqual([]);
      // Shift+Tab back through it, to the opener: still open, nothing emitted.
      seen.length = 0;
      for (let i = 0; i < 5; i++) await step(true);
      expect(seen, where).toEqual(['button:Cancel', '#two', '#one', 'button:Close', '#a']);
      expect([await isShown(page), await log(page)], where).toEqual([true, []]);
      // Tab from its last element: on to what follows the opener — never back to its first — which closes it, once.
      await host(page).locator('tanrei-button[confirming] button').focus();
      await tab(page);
      await expect.poll(() => active(page), where).toBe('#after');
      await expect.poll(() => log(page), where).toEqual(['p:focus-out']);
      await expect.poll(() => isOpen(page), where).toBe(false);
      // Focus stays where the person put it, and the page's order is whole again after it.
      await tab(page);
      expect(await active(page), where).toBe('#last');
      // Shift+Tab from the opener leaves both, as it would with the popover closed: that closes it too.
      await clearLog(page);
      await page.locator('#a').focus();
      await open(page);
      await tab(page, { back: true });
      await expect.poll(() => active(page), where).toBe('#before');
      await expect.poll(() => log(page), where).toEqual(['p:focus-out']);
    }
    // From the container itself (the default initial focus): Tab reaches the first element, Shift+Tab the opener; and a
    // popover with nothing focusable is left by Tab at once.
    await mount(page, `<div style="padding: 80px 200px"><button id="a" type="button">Storage</button> <a id="after" href="#a">After</a></div>${popover('label="Storage"', '<input id="one" aria-label="One" />')}<${TAG} id="q" anchor="a" label="Note">Only text.</${TAG}>`);
    await page.locator('#a').focus();
    await open(page);
    expect(await active(page)).toBe('div.container');
    await tab(page);
    expect(await active(page)).toBe('#one');
    await container(page).focus();
    await tab(page, { back: true });
    expect([await active(page), await isShown(page), await log(page)]).toEqual(['#a', true, []]);
    await close(page);
    await open(page, 'q');
    await tab(page);
    await expect.poll(() => active(page)).toBe('#after');
    await expect.poll(() => log(page)).toEqual(['q:focus-out']);
  });

  test('POP-20: Tab from the popover’s last element skips the popover only for the key’s own move — once focus has moved on, or the Tab was cancelled, the popover takes focus again, however late the page runs its timers', async ({ page }) => {
    // The popover's element directly after its opener in the document, where the key's move would come back into it.
    await mount(page, `<div style="padding: 80px 200px"><button id="a" type="button">Storage</button>${popover('headline="Rename" closable close-label="Close" data-keep', `<input id="one" aria-label="One" /><input id="two" aria-label="Two" />${ACTIONS}`)} <a id="after" href="#a">After</a></div>`);
    await page.locator('#a').focus();
    await open(page);
    // The page's timers stand still from here: a popover that only a timer gave back its focus would stay out of reach
    // at every later act, as it does when the browser runs other tasks first.
    await holdClock(page);
    const inert = () => host(page).evaluate((el) => (el as HTMLElement).inert);
    const last = host(page).locator('tanrei-button[confirming] button');
    await last.focus();
    await tab(page);
    expect(await active(page)).toBe('#after');
    // The product declines the close, and moves focus into the popover right away: it is there to take it.
    expect(await log(page)).toEqual(['p:focus-out']);
    await page.locator('#one').evaluate((el) => (el as HTMLElement).focus());
    expect(await active(page)).toBe('#one');
    expect(await inert()).toBe(false);
    // A Tab that something on the page cancels after the popover has heard it moves nothing past the opener; once the
    // key is up, the popover takes focus again.
    await page.evaluate(() => {
      const cancel = (event: KeyboardEvent) => {
        if (event.key !== 'Tab') return;
        event.preventDefault();
        window.removeEventListener('keydown', cancel);
      };
      window.addEventListener('keydown', cancel);
    });
    await last.focus();
    await tab(page);
    expect(await active(page)).toBe('#a');
    await page.locator('#one').evaluate((el) => (el as HTMLElement).focus());
    expect(await active(page)).toBe('#one');
    expect(await inert()).toBe(false);
  });

  test('POP-22: closing returns focus to the opener if it was inside the popover or was lost with it, and leaves it where the person put it otherwise; the opener shows its focus indicator only when the close came from the keyboard; an opener that is gone takes nothing', async ({ page }) => {
    await mount(
      page,
      `<div style="padding: 80px 200px"><button id="a" type="button">Storage</button> <input id="else" aria-label="Elsewhere" /></div><div id="blank" style="position: fixed; left: 500px; top: 400px; inline-size: 100px; block-size: 100px"></div>${popover('headline="Rename" closable close-label="Close"', '<input id="one" aria-label="One" />')}`,
      { reducedMotion: false },
    );
    const openByKey = async () => {
      await tabTo(page, page.locator('#a'));
      await page.keyboard.press('Enter');
      await expect.poll(() => isShown(page)).toBe(true);
    };
    // Escape, with focus inside: back to the opener, at once (not when the motion ends), with its indicator.
    await openByKey();
    await part(page, '.motion').evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished)));
    await page.locator('#one').focus();
    // Read as the product closes it, in the task of the key: focus is back already, while the popover is still fading.
    await host(page).evaluate((el) =>
      el.addEventListener(
        'close',
        async () => {
          await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
          (window as unknown as { __log: string[] }).__log.push(`then:${document.activeElement?.id}:${el.shadowRoot!.querySelector('.surface')!.matches(':popover-open')}`);
        },
        { once: true },
      ),
    );
    await page.keyboard.press('Escape');
    await expect.poll(() => log(page)).toEqual(['p:escape', 'then:a:true']);
    expect(await active(page)).toBe('#a');
    expect(await page.locator('#a').evaluate((el) => el.matches(':focus-visible'))).toBe(true);
    await expect.poll(() => surface(page).evaluate((el) => el.matches(':popover-open'))).toBe(false);
    await clearLog(page);
    // The close button, by pointer: back to the opener, without its indicator.
    await page.locator('#a').click();
    await expect.poll(() => isShown(page)).toBe(true);
    await part(page, 'tanrei-button.close').click();
    await expect.poll(() => isOpen(page)).toBe(false);
    await expect.poll(() => active(page)).toBe('#a');
    expect(await page.locator('#a').evaluate((el) => el.matches(':focus-visible'))).toBe(false);
    // A press outside that lands on another focusable element: focus stays where the person put it.
    await open(page);
    await page.locator('#else').click();
    await expect.poll(() => isOpen(page)).toBe(false);
    expect(await active(page)).toBe('#else');
    // A press outside that lands on nothing focusable: focus would be lost with the popover — the opener takes it.
    await open(page);
    await page.locator('#one').focus();
    await page.mouse.click(550, 450);
    await expect.poll(() => isOpen(page)).toBe(false);
    await expect.poll(() => active(page)).toBe('#a');
    // Closed by the product while focus is elsewhere (initialFocus anchor, focus on another field): left there.
    await set(page, { initialFocus: 'anchor' });
    await page.locator('#else').focus();
    await set(page, { open: true, 'data-x': 1 });
    await expect.poll(() => isShown(page)).toBe(true);
    await close(page);
    expect(await active(page)).toBe('#else');
    // The opener is gone: nothing takes focus, and nothing throws.
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await set(page, { initialFocus: 'popover' });
    await open(page);
    await page.locator('#one').focus();
    await page.locator('#a').evaluate((el) => el.remove());
    await expect.poll(() => isOpen(page)).toBe(false);
    await settle(page);
    expect(await active(page)).not.toBe('#one');
    expect(errors).toEqual([]);
  });
});

test.describe('dismissal', () => {
  test('POP-21: Escape, a press outside, focus moving outside and the close button each emit close once with their reason, and the product closes it; a press on the opener or the anchor is never outside, so one press never closes and opens it again; a press outside also reaches what is under it; focus leaving the window is not focus leaving the popover', async ({ page }) => {
    await mount(
      page,
      `<div style="padding: 80px 200px"><button id="a" type="button">Storage</button> <button id="other" type="button">Other</button></div><${TAG} id="p" anchor="a" headline="Rename" closable close-label="Close"><input id="one" aria-label="One" /></${TAG}>`,
    );
    await page.evaluate(() => document.querySelector('#other')!.addEventListener('click', () => (window as unknown as { __log: string[] }).__log.push('other')));
    // The detail carries the reason, and the event is the element's own.
    await page.evaluate(() => document.querySelector('tanrei-popover')!.addEventListener('close', (event) => (window as unknown as { __log: string[] }).__log.push(`${event.constructor.name}:${JSON.stringify((event as CustomEvent).detail)}`)));
    await open(page);
    await page.keyboard.press('Escape');
    await expect.poll(() => log(page)).toEqual(['p:escape', 'CustomEvent:{"reason":"escape"}']);
    await expect.poll(() => isOpen(page)).toBe(false);
    // A press outside: once (it also moves focus there, which is the same act), and the press reaches the element under it.
    await clearLog(page);
    await open(page);
    await page.locator('#other').click();
    await expect.poll(() => log(page)).toEqual(['p:outside', 'CustomEvent:{"reason":"outside"}', 'other']);
    // Focus moving to an element outside, with no press.
    await clearLog(page);
    await open(page);
    await page.locator('#other').focus();
    await expect.poll(() => log(page)).toEqual(['p:focus-out', 'CustomEvent:{"reason":"focus-out"}']);
    // The close button.
    await clearLog(page);
    await open(page);
    await part(page, 'tanrei-button.close').click();
    await expect.poll(() => log(page)).toEqual(['p:close', 'CustomEvent:{"reason":"close"}']);
    // A press inside, on the container or its content, is no reason.
    await clearLog(page);
    await open(page);
    const box = await rect(container(page));
    await page.mouse.click(box.x + 6, box.y + 6);
    await page.locator('#one').click();
    expect([await log(page), await isShown(page)]).toEqual([[], true]);
    // A press on the opener: the product's own handler closes it — the popover emits nothing, and it does not open again.
    await page.locator('#a').click();
    await expect.poll(() => isOpen(page)).toBe(false);
    await settle(page);
    expect([await log(page), await isOpen(page)]).toEqual([[], false]);
    // Focus on the opener has not left; focus leaving the window (nothing in the page takes it) has not left either.
    await open(page);
    await page.locator('#a').focus();
    await page.evaluate(() => {
      (document.activeElement as HTMLElement).blur();
      window.dispatchEvent(new Event('blur'));
    });
    await settle(page);
    expect([await log(page), await isShown(page)]).toEqual([[], true]);
    // The product may decline: the popover stays, and asks again at the next act.
    await host(page).evaluate((el) => el.setAttribute('data-keep', ''));
    await page.locator('#other').click();
    await page.locator('#other').click();
    await page.keyboard.press('Escape');
    expect((await log(page)).filter((entry) => entry.startsWith('p:'))).toEqual(['p:outside', 'p:outside', 'p:escape']);
    expect(await isShown(page)).toBe(true);
  });

  test('POP-21: a declined close is over with the act that asked for it — focus moved outside again, or after a declined Escape, asks again however late the page runs its timers; one act still asks once', async ({ page }) => {
    await mount(
      page,
      `<div style="padding: 80px 200px"><button id="a" type="button">Storage</button> <button id="other" type="button">Other</button> <button id="third" type="button">Third</button></div><${TAG} id="p" anchor="a" headline="Rename" data-keep><input id="one" aria-label="One" /></${TAG}>`,
    );
    await open(page);
    // The page's timers stand still from here: an act that only a timer ended would still be going on at every later
    // act, as it is when the browser runs other tasks first.
    await holdClock(page);
    const focus = (selector: string) => page.locator(selector).evaluate((el) => (el as HTMLElement).focus());
    // The product moves focus outside, twice, in two tasks of its own (no press, no key between them): each asks.
    await focus('#other');
    expect(await log(page)).toEqual(['p:focus-out']);
    await focus('#third');
    expect(await log(page)).toEqual(['p:focus-out', 'p:focus-out']);
    // Escape, declined; then the product moves focus outside: that asks too.
    await clearLog(page);
    await focus('#one');
    await page.keyboard.press('Escape');
    expect(await log(page)).toEqual(['p:escape']);
    await focus('#other');
    expect(await log(page)).toEqual(['p:escape', 'p:focus-out']);
    // One act asks once: a product that answers Escape by moving focus outside is not asked again by that move.
    await clearLog(page);
    await focus('#one');
    await host(page).evaluate((el) => el.addEventListener('close', () => document.getElementById('third')!.focus(), { once: true }));
    await page.keyboard.press('Escape');
    expect(await active(page)).toBe('#third');
    expect(await log(page)).toEqual(['p:escape']);
    expect(await isShown(page)).toBe(true);
  });

  test('POP-23: Escape closes the popover alone and goes no further — a dialog it stands in stays open — unless an overlay opened from inside it or an element inside it took the key; with several overlays open it closes only the topmost', async ({ page }) => {
    await mount(
      page,
      `<dialog id="d" style="inline-size: 500px; block-size: 300px"><button id="a" type="button">Storage</button>
         <${TAG} id="p" anchor="a" headline="Rename"><input id="one" aria-label="One" /><input id="takes" aria-label="Clears itself" /><button id="m-anchor" type="button">More</button></${TAG}>
         <tanrei-menu id="m" anchor="m-anchor"><tanrei-menu-item label="Cut"></tanrei-menu-item><tanrei-menu-item label="Copy"></tanrei-menu-item></tanrei-menu>
         <${TAG} id="q" anchor="one" label="Second">Second.</${TAG}>
       </dialog>`,
    );
    await page.evaluate(() => {
      const w = window as unknown as { __log: string[] };
      const dialog = document.querySelector('dialog')!;
      dialog.addEventListener('cancel', () => w.__log.push('dialog:cancel'));
      dialog.addEventListener('keydown', (event) => event.key === 'Escape' && w.__log.push('dialog:keydown'));
      dialog.showModal();
      // A field that takes Escape for itself (it clears its value).
      document.querySelector('#takes')!.addEventListener('keydown', (event) => {
        if ((event as KeyboardEvent).key !== 'Escape') return;
        event.preventDefault();
        (event.target as HTMLInputElement).value = '';
      });
    });
    const dialogOpen = () => page.locator('#d').evaluate((el) => (el as HTMLDialogElement).open);
    await open(page);
    // An element inside took the key: the popover stays.
    await page.locator('#takes').fill('text');
    await page.locator('#takes').press('Escape');
    await expect(page.locator('#takes')).toHaveValue('');
    expect([await isShown(page), await log(page)]).toEqual([true, ['dialog:keydown']]);
    await clearLog(page);
    // An overlay opened from inside it took the key: the menu closes, the popover stays.
    await page.locator('#m-anchor').click();
    await expect.poll(() => page.locator('#m').evaluate((el) => (el as unknown as { open: boolean }).open)).toBe(true);
    await settle(page);
    await page.keyboard.press('Escape');
    await expect.poll(() => log(page)).toEqual(['m:menu:escape']);
    expect([await isShown(page), await dialogOpen()]).toEqual([true, true]);
    await clearLog(page);
    // The popover takes it: closed, and the key goes no further — the dialog neither hears it nor closes.
    await page.locator('#one').focus();
    await page.keyboard.press('Escape');
    await expect.poll(() => log(page)).toEqual(['p:escape']);
    await expect.poll(() => isOpen(page)).toBe(false);
    expect(await dialogOpen()).toBe(true);
    await clearLog(page);
    // Several open: only the topmost, wherever focus is.
    await open(page);
    await set(page, { open: true }, 'q');
    await expect.poll(() => isShown(page, 'q')).toBe(true);
    await page.locator('#one').focus();
    await page.keyboard.press('Escape');
    await expect.poll(() => log(page)).toEqual(['q:escape']);
    expect([await isShown(page), await dialogOpen()]).toEqual([true, true]);
    await page.keyboard.press('Escape');
    await expect.poll(() => log(page)).toEqual(['q:escape', 'p:escape']);
    expect(await dialogOpen()).toBe(true);
    // With no popover open, the key is the dialog's again.
    await expect.poll(() => isOpen(page)).toBe(false);
    await page.keyboard.press('Escape');
    await expect.poll(dialogOpen).toBe(false);
  });

  test('POP-24: an overlay opened from an element inside the popover is its own — a press or focus in it is not outside, the popover stays open under it, and takes back the focus it returns; closing the popover closes those that are not modal with it and returns focus to its own opener; a popover three levels deep still works and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(
      page,
      `<div style="padding: 60px 100px"><button id="a" type="button">Storage</button></div>
       <${TAG} id="p" anchor="a" headline="Share"><button id="m-anchor" type="button">More</button> <button id="b" type="button">Details</button> <button id="ask" type="button">Ask</button>
         <tanrei-tooltip text="More choices"><button id="tip" type="button">Tip</button></tanrei-tooltip></${TAG}>
       <tanrei-menu id="m" anchor="m-anchor"><tanrei-menu-item label="Cut"></tanrei-menu-item><tanrei-menu-item label="Copy"></tanrei-menu-item></tanrei-menu>
       <${TAG} id="q" anchor="b" headline="Details" placement="end-top"><button id="c" type="button">Deeper</button></${TAG}>
       <${TAG} id="r" anchor="c" label="Deepest" placement="end-top"><input id="deep" aria-label="Deep" /></${TAG}>
       <dialog id="d"><button id="yes" type="button">Yes</button></dialog>`,
      { width: 1000, height: 600 },
    );
    await page.evaluate(() => {
      const dialog = document.querySelector('dialog')!;
      document.querySelector('#ask')!.addEventListener('click', () => dialog.showModal());
      document.querySelector('#yes')!.addEventListener('click', () => dialog.close());
    });
    const menuOpen = () => page.locator('#m').evaluate((el) => (el as unknown as { open: boolean }).open);
    await page.locator('#a').focus();
    await open(page);
    // A menu that stands elsewhere in the document, opened from a button inside: focus moves into it, a press lands in it — neither is outside.
    await page.locator('#m-anchor').click();
    await expect.poll(menuOpen).toBe(true);
    await settle(page);
    expect(await active(page)).toContain('tanrei-menu-item');
    await page.keyboard.press('ArrowDown');
    const item = await rect(page.locator('tanrei-menu-item[label="Copy"]'));
    await page.mouse.move(centerX(item), centerY(item));
    await page.mouse.down();
    expect([await isShown(page), (await log(page)).filter((entry) => entry.startsWith('p:'))]).toEqual([true, []]);
    await page.mouse.up();
    // The menu closed (an item was chosen) and returned focus to its anchor, inside the popover: the popover has it back.
    await expect.poll(menuOpen).toBe(false);
    await expect.poll(() => active(page)).toBe('#m-anchor');
    expect(await isShown(page)).toBe(true);
    await clearLog(page);
    // Closing the popover closes the menu opened from inside it with it, and focus goes to the popover's own opener.
    await page.locator('#m-anchor').click();
    await expect.poll(menuOpen).toBe(true);
    await settle(page);
    await set(page, { open: false });
    await expect.poll(menuOpen).toBe(false);
    await expect.poll(() => active(page)).toBe('#a');
    // The menu's own close carries no reason of the person's.
    expect((await log(page)).filter((entry) => entry.includes(':menu:'))).toEqual(['m:menu:focus-out']);
    await clearLog(page);
    // A tooltip of a control inside: it goes with the popover, at once.
    await open(page);
    await page.locator('#tip').hover();
    const tooltip = page.locator('tanrei-tooltip');
    await expect.poll(() => tooltip.evaluate((el) => (el as unknown as { open: boolean }).open)).toBe(true);
    expect(await isShown(page)).toBe(true);
    await set(page, { open: false });
    await expect.poll(() => tooltip.evaluate((el) => [(el as unknown as { open: boolean }).open, el.shadowRoot!.querySelector('.surface')!.matches(':popover-open')])).toEqual([false, false]);
    await page.mouse.move(0, 0);
    await clearLog(page);
    // A modal dialog opened from inside, standing elsewhere: the popover stays open under it, and has focus back after it.
    await open(page);
    await page.locator('#ask').click();
    await expect.poll(() => active(page)).toBe('#yes');
    expect([await isShown(page), await log(page)]).toEqual([true, []]);
    await page.locator('#yes').click();
    // (Safari does not focus a button that is pressed: there the dialog returns focus to the container, which had it.)
    await expect.poll(async () => ['#ask', 'div.container'].includes(await active(page))).toBe(true);
    expect([await isShown(page), await log(page)]).toEqual([true, []]);
    // A popover in a popover in a popover: each press and each focus inside the innermost is inside all three.
    await page.locator('#b').click();
    await expect.poll(() => isShown(page, 'q')).toBe(true);
    expect(seen.filter((text) => text.includes('POP-24'))).toEqual([]);
    await page.locator('#c').click();
    await expect.poll(() => isShown(page, 'r')).toBe(true);
    await page.locator('#deep').click();
    await page.keyboard.type('x');
    expect([await isShown(page), await isShown(page, 'q'), await isShown(page, 'r'), await log(page)]).toEqual([true, true, true, []]);
    await expect.poll(() => seen.filter((text) => text.includes('POP-24')).length).toBe(1);
    expect(seen.find((text) => text.includes('POP-24'))).toContain('depth 3');
    // Escape closes only the topmost, and each returns focus to its own opener.
    await page.keyboard.press('Escape');
    await expect.poll(() => log(page)).toEqual(['r:escape']);
    await expect.poll(() => active(page)).toBe('#c');
    // The outermost closing takes the rest with it, at once, with a reason that is not the person's; focus goes to its own opener.
    await clearLog(page);
    await page.locator('#c').click();
    await expect.poll(() => isShown(page, 'r')).toBe(true);
    await page.locator('#deep').focus();
    await set(page, { open: false });
    await expect.poll(async () => [await isOpen(page, 'q'), await isOpen(page, 'r')]).toEqual([false, false]);
    await expect.poll(() => active(page)).toBe('#a');
    expect((await log(page)).every((entry) => /^[qr]:(anchor-hidden|focus-out)$/.test(entry))).toBe(true);
    expect((await log(page)).length).toBeGreaterThanOrEqual(2);
  });

  test('POP-25: a popover whose anchor is inside a modal dialog is presented above it and belongs to it — operable while the rest of the window is inert, and in its focus loop directly after its opener; a second popover opened while another is open is drawn above it, and opening one closes no other', async ({ page }) => {
    await mount(
      page,
      `<button id="outside" type="button">Outside</button>
       <dialog id="d" style="inline-size: 420px; block-size: 240px"><button id="a" type="button">Storage</button> <button id="next" type="button">Next</button>
         <${TAG} id="p" anchor="a" headline="Rename"><input id="one" aria-label="One" /><button id="in" type="button">Apply</button></${TAG}>
       </dialog>
       <button id="b" type="button" style="position: fixed; left: 40px; top: 40px">Second</button><${TAG} id="q" anchor="b" label="Second" data-keep>Second popover, set open by the product.</${TAG}>`,
    );
    await page.evaluate(() => {
      (document.querySelector('#d') as HTMLDialogElement).showModal();
      document.querySelector('#in')!.addEventListener('click', () => (window as unknown as { __log: string[] }).__log.push('apply'));
    });
    await page.locator('#a').focus();
    await open(page);
    // Above the dialog: what is at its centre is the popover's, not the dialog's.
    const box = await rect(container(page));
    const dialog = await rect(page.locator('#d'));
    expect(bottom(box)).toBeGreaterThan(dialog.y);
    expect(await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest('tanrei-popover'), [centerX(await rect(page.locator('#in'))), centerY(await rect(page.locator('#in')))])).toBe(true);
    // Operable while the rest of the window is inert.
    await page.locator('#in').click();
    await page.locator('#one').fill('name');
    expect(await log(page)).toEqual(['apply']);
    await expect(page.locator('#one')).toHaveValue('name');
    // In the dialog's focus loop directly after its opener: opener, the popover's elements, then what follows the opener in the dialog.
    await page.locator('#a').focus();
    const seen: string[] = [];
    for (let i = 0; i < 3; i++) {
      await tab(page);
      seen.push(await active(page));
    }
    expect(seen).toEqual(['#one', '#in', '#next']);
    await expect.poll(() => log(page)).toEqual(['apply', 'p:focus-out']);
    expect(await page.locator('#d').evaluate((el) => (el as HTMLDialogElement).open)).toBe(true);
    await page.evaluate(() => (document.querySelector('#d') as HTMLDialogElement).close());
    // Two the product sets open at once: both are shown, the later above — opening one does not close the other.
    await mount(
      page,
      `<button id="a" type="button" style="position: fixed; left: 100px; top: 100px">First</button><${TAG} id="p" anchor="a" label="First" data-keep>The first popover, which is wide enough to reach under the second.</${TAG}>
       <button id="b" type="button" style="position: fixed; left: 160px; top: 110px">Second</button><${TAG} id="q" anchor="b" label="Second" data-keep>Second popover.</${TAG}>`,
    );
    await set(page, { open: true, initialFocus: 'anchor' });
    await set(page, { open: true, initialFocus: 'anchor' }, 'q');
    await expect.poll(async () => [await isShown(page), await isShown(page, 'q')]).toEqual([true, true]);
    expect(await log(page)).toEqual([]);
    const [first, second] = [await rect(container(page)), await rect(container(page, 'q'))];
    const overlap = { x: Math.max(first.x, second.x) + 8, y: Math.max(first.y, second.y) + 8 };
    expect(overlap.x < Math.min(right(first), right(second)) && overlap.y < Math.min(bottom(first), bottom(second))).toBe(true);
    expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('tanrei-popover')?.id ?? document.elementFromPoint(x, y)?.id, [overlap.x, overlap.y])).toBe('q');
  });
});

test.describe('semantics and reports', () => {
  test('POP-28: the container is a dialog that is not modal, named by its headline or, without one, by label; the close button is named by closeLabel and each action by its label; the arrow and the dividers are hidden; the popover is not its anchor’s description', async ({ page }) => {
    await mount(page, `<div style="padding: 60px 200px"><button id="a" type="button">Storage</button></div>${popover('headline="Storage" label="Ignored" closable close-label="Close storage" arrow', `Files in the trash still count.${ACTIONS}`)}`);
    await open(page);
    await expect(page.getByRole('dialog', { name: 'Storage', exact: true })).toHaveCount(1);
    expect(await container(page).evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label'), el.getAttribute('aria-modal'), el.localName])).toEqual(['dialog', 'Storage', null, 'div']);
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Storage' })).toHaveCount(1);
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Close storage', exact: true })).toHaveCount(1);
    for (const name of ['Cancel', 'Empty']) await expect(page.getByRole('button', { name, exact: true })).toHaveCount(1);
    // Confirming and dismissive are not announced.
    expect(await host(page).locator('tanrei-button[confirming] button').evaluate((el) => [el.getAttribute('aria-label'), el.getAttribute('aria-description')])).toEqual([null, null]);
    expect(await host(page).evaluate((el) => [...el.shadowRoot!.querySelectorAll('.arrow, .divider')].map((part) => part.getAttribute('aria-hidden')))).toEqual(['true', 'true', 'true']);
    // Nothing outside it is hidden, and the anchor gains no description.
    expect(await page.locator('#a').evaluate((el) => [el.getAttribute('aria-describedby'), el.getAttribute('aria-description'), el.closest('[aria-hidden], [inert]')])).toEqual([null, null, null]);
    await expect(page.getByRole('button', { name: 'Storage', exact: true })).toHaveCount(1);
    // Without a headline: named by label, which is never drawn.
    await set(page, { headline: '', label: 'Text formatting' });
    await expect(page.getByRole('dialog', { name: 'Text formatting', exact: true })).toHaveCount(1);
    await expect(page.getByRole('heading')).toHaveCount(0);
    expect(await container(page).evaluate((el) => el.textContent!.includes('Text formatting'))).toBe(false);
  });

  test('POP-29: with neither headline nor label it still opens, reported as unnamed; with no content, no headline and no action it draws nothing, takes no focus and exposes nothing; with no anchor it stays closed and emits nothing — each reported', async ({ page }) => {
    const seen = warnings(page);
    const said = (text: string) => seen.filter((warning) => warning.includes('POP-29') && warning.includes(text)).length;
    await mount(page, `<div style="padding: 60px 200px"><button id="a" type="button">Storage</button></div>${popover('', 'Unnamed.')}<${TAG} id="e" anchor="a" label="Empty"></${TAG}><${TAG} id="n" anchor="missing" label="Lost">Text.</${TAG}><${TAG} id="z" label="None">Text.</${TAG}>`);
    await page.locator('#a').focus();
    await open(page);
    expect(await container(page).getAttribute('aria-label')).toBe(null);
    await expect.poll(() => said('no accessible name')).toBe(1);
    await close(page);
    // Empty: nothing drawn, focus where it was, nothing exposed.
    await page.locator('#a').focus();
    await set(page, { open: true }, 'e');
    await settle(page);
    expect(await surface(page, 'e').evaluate((el) => [el.matches(':popover-open'), el.getClientRects().length])).toEqual([false, 0]);
    expect(await active(page)).toBe('#a');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await page.locator('#a').getAttribute('aria-expanded')).toBe('false');
    await expect.poll(() => said('no content, no headline and no action')).toBe(1);
    // Given content while open is true, it is shown.
    await host(page, 'e').evaluate((el) => (el.textContent = 'Now with content.'));
    await expect.poll(() => isShown(page, 'e')).toBe(true);
    await set(page, { open: false }, 'e');
    // No anchor: closed, silent, reported — for an id nothing has, and for none at all.
    for (const id of ['n', 'z']) {
      await set(page, { open: true }, id);
      await settle(page);
      expect(await surface(page, id).evaluate((el) => el.matches(':popover-open')), id).toBe(false);
    }
    expect(await log(page)).toEqual([]);
    await expect.poll(() => said('no element with the id "missing"')).toBe(1);
    await expect.poll(() => said('it has no anchor')).toBe(1);
  });

  test('POP-37: a placement, a width or an initialFocus the popover does not define renders as the default, and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, `${anchorAt(300, 200, { width: 240 })}${popover('label="Storage" placement="middle" width="wide" initial-focus="first"')}`);
    await page.locator('#a').focus();
    await open(page);
    expectPlaced('bottom-start', await rect(page.locator('#a')), await rect(surface(page)), await resolveToken(page, T('offset')));
    expect((await rect(container(page))).width).toBeCloseTo(await resolveToken(page, T('container-min-width')), 1);
    expect(await active(page)).toBe('div.container');
    await expect.poll(() => seen.filter((text) => text.includes('POP-37')).length).toBe(3);
    expect(seen.some((text) => text.includes('placement "middle"') && text.includes('"bottom-start"'))).toBe(true);
    expect(seen.some((text) => text.includes('width "wide"'))).toBe(true);
    expect(seen.some((text) => text.includes('initial-focus "first"'))).toBe(true);
  });
});

test.describe('text size, windows and modes', () => {
  test('POP-30: with the text enlarged it keeps its width limits, wraps its headline and its content, grows to its limits and scrolls beyond them, and stacks its actions once a label no longer fits; the close button, the arrow, the offset and the margin do not scale, and nothing in the header or the actions is cut', async ({ page }) => {
    await mount(page, `${anchorAt(200, 40)}${popover('headline="Empty the trash for good?" closable close-label="Close" arrow', `${LONG.slice(0, 600)}<tanrei-button slot="actions" dismissive>Keep them</tanrei-button><tanrei-button slot="actions" confirming>Empty it</tanrei-button>`)}`, { width: 900, height: 900 });
    await open(page);
    const read = async () => ({
      box: await rect(container(page)),
      header: await rect(part(page, '.header')),
      close: await rect(part(page, 'tanrei-button.close').locator('button')),
      arrow: await rect(part(page, '.arrow')),
      gap: (await rect(part(page, '.arrow'))).y - bottom(await rect(page.locator('#a'))),
    });
    const before = await read();
    await expect(part(page, '.actions')).not.toHaveClass(/stacked/);
    await override(page, { '--tanrei-dial-type-base': '40px' });
    await expect.poll(async () => (await read()).header.height).toBeGreaterThan(before.header.height);
    const after = await read();
    // The width limits hold; the height grows to its limit and the content scrolls beyond it.
    expect(after.box.width).toBeCloseTo(await resolveToken(page, T('container-max-width')), 1);
    expect(after.box.height).toBeCloseTo(await resolveToken(page, T('container-max-height')), 1);
    expect(await part(page, '.content').evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    await expect(part(page, '.actions')).toHaveClass(/stacked/);
    // What does not scale.
    expect([after.close.width, after.close.height]).toEqual([before.close.width, before.close.height]);
    expect([after.arrow.width, after.arrow.height]).toEqual([before.arrow.width, before.arrow.height]);
    expect(after.gap).toBeCloseTo(before.gap, 1);
    // Nothing in the header or the actions is cut: each lies whole inside the container, at its full size.
    for (const selector of ['.headline', 'tanrei-button.close']) {
      const inner = await rect(part(page, selector));
      expect(inner.x >= after.box.x && right(inner) <= right(after.box) && inner.y >= after.box.y, selector).toBe(true);
    }
    expect(await part(page, '.headline').evaluate((el) => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    for (const button of await host(page).locator('tanrei-button[slot="actions"] button').all()) {
      const inner = await rect(button);
      expect(inner.x >= after.box.x && right(inner) <= right(after.box) && bottom(inner) <= bottom(after.box)).toBe(true);
      expect(await button.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    }
  });

  test('POP-30: an action whose one-line label is wider than the popover’s inner width, at 320 wide with text at 200 %, wraps its label and lies whole inside the container — nothing of it is clipped — while actions that fit are, to a hundredth of a pixel, what they are without the popover’s word', async ({ page }) => {
    const LABEL = 'Move everything to the archive';
    await mount(page, `${anchorAt(110, 60)}${popover('headline="Archive the project?" compact-presentation="own"', `Nothing is deleted.<tanrei-button slot="actions" dismissive>Keep</tanrei-button><tanrei-button id="long" slot="actions" confirming>${LABEL}</tanrei-button>`)}
      ${anchorAt(110, 60).replace('id="a"', 'id="a2"')}${popover('headline="Archive?" compact-presentation="own"', 'Nothing is deleted.<tanrei-button slot="actions" dismissive>Keep</tanrei-button><tanrei-button slot="actions" confirming>Archive</tanrei-button>', 'q').replace('anchor="a"', 'anchor="a2"')}`, { width: 320, height: 900 });
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    await open(page);
    await settle(page);
    const box = await rect(container(page));
    const inlinePadding = await resolveToken(page, T('container-padding-inline'));
    expect(right(box), 'the popover is inside the window').toBeLessThanOrEqual(320);
    await expect(part(page, '.actions')).toHaveClass(/stacked/);
    const long = host(page).locator('#long');
    const native = await rect(long.locator('button'));
    // Whole inside the container's inner width, and its element's box is its button's.
    expect(native.x, 'inside the padding').toBeGreaterThanOrEqual(box.x + inlinePadding - 0.5);
    expect(right(native), 'inside the padding').toBeLessThanOrEqual(right(box) - inlinePadding + 0.5);
    expect(bottom(native)).toBeLessThanOrEqual(bottom(box) + 0.5);
    expect((await rect(long)).width).toBeCloseTo(native.width, 1);
    // The label is on several lines, every word of it drawn: nothing scrolls inside the button and nothing is clipped.
    const lines = await long.locator('.label slot').evaluate((slot) => {
      const range = document.createRange();
      range.selectNodeContents((slot as HTMLSlotElement).assignedNodes({ flatten: true })[0]!);
      const rects = [...range.getClientRects()];
      return { rows: new Set(rects.map((r) => Math.round(r.top))).size, left: Math.min(...rects.map((r) => r.left)), right: Math.max(...rects.map((r) => r.right)) };
    });
    expect(lines.rows).toBeGreaterThan(1);
    expect(lines.left >= native.x && lines.right <= right(native), 'the text is inside the button').toBe(true);
    expect(await long.locator('button').evaluate((el) => [getComputedStyle(el).overflow, el.scrollWidth <= el.clientWidth + 1, el.scrollHeight <= el.clientHeight + 1])).toEqual(['visible', true, true]);
    await expect(long).toHaveText(LABEL);
    expect(await part(page, '.clip').evaluate((el) => el.scrollWidth <= el.clientWidth), 'never in two directions').toBe(true);
    await close(page);

    // Actions that fit: the same boxes with the popover's word and without it.
    await open(page, 'q');
    await settle(page);
    const measure = () =>
      host(page, 'q').evaluate((el) =>
        [...el.querySelectorAll('[slot="actions"]')].map((action) => {
          const size = (node: Element) => [node.getBoundingClientRect().x, node.getBoundingClientRect().y, node.getBoundingClientRect().width, node.getBoundingClientRect().height];
          const button = action.shadowRoot!.querySelector('button')!;
          const s = getComputedStyle(button);
          return { boxes: [...size(action), ...size(button), ...size(button.querySelector('.label')!)], paint: [s.borderRadius, s.paddingInline, s.backgroundColor, s.color, s.boxShadow], place: button.classList.contains('joined') };
        }),
      );
    const told = await measure();
    expect(told.map((a) => a.place), 'each was told its place').toEqual([true, true]);
    const whole = await rect(container(page, 'q'));
    await host(page, 'q').evaluate((el) => {
      for (const action of el.querySelectorAll('[slot="actions"]')) (action as unknown as Record<symbol, { set(place: null): void }>)[Symbol.for('tanrei.group-item')]!.set(null);
    });
    await settle(page);
    const alone = await measure();
    expect(alone.map((a) => a.place)).toEqual([false, false]);
    for (const [i, action] of told.entries()) {
      for (const [j, value] of action.boxes.entries()) expect(Math.abs(value - alone[i]!.boxes[j]!), `action ${i}, measure ${j}: ${value} = ${alone[i]!.boxes[j]}`).toBeLessThanOrEqual(0.01);
      expect(action.paint).toEqual(alone[i]!.paint);
    }
    expect(await rect(container(page, 'q'))).toEqual(whole);
  });

  test('POP-43: with compact-presentation own, in a window 320 wide the fixture actions is 304 wide and every part of it can be reached; it stays an anchored dialog that is not modal at every size — no sheet, no scrim, no focus trap', async ({ page }) => {
    const actions = spec.fixtures.find((f) => f.id === 'actions')!;
    const items = actions.items!.map((item) => `<tanrei-button slot="actions" ${Object.keys(item.props).join(' ')}>${item.content}</tanrei-button>`).join('');
    await mount(page, `${anchorAt(110, 60)}${popover(`headline="${String(actions.props.headline)}" closable close-label="${String(actions.props.closeLabel)}" compact-presentation="own"`, `${actions.content}${items}`)}`, { width: 320, height: 568 });
    const margin = await resolveToken(page, T('window-margin'));
    await page.locator('#a').focus();
    await open(page);
    const box = await rect(container(page));
    expect(margin).toBe(8);
    expect(box.width).toBeCloseTo(304, 1);
    expect(box.x).toBeCloseTo(margin, 1);
    // Still the same thing: a dialog that is not modal, beside its anchor, with the same keys.
    expect(await container(page).evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-modal')])).toEqual(['dialog', null]);
    expect(await host(page).evaluate((el) => [el.shadowRoot!.querySelector('dialog'), document.querySelectorAll('[inert]').length])).toEqual([null, 0]);
    expect(box.y).toBeCloseTo(100 + (await resolveToken(page, T('offset'))), 1);
    // Shorter than it wants: it shortens, covers nothing it need not, and every part is reached by scrolling.
    await page.setViewportSize({ width: 320, height: 250 });
    await expect.poll(async () => bottom(await rect(container(page)))).toBeLessThanOrEqual(250 - margin + 0.5);
    const short = await rect(container(page));
    expect(short.y).toBeGreaterThanOrEqual(margin - 0.5);
    expect(short.width).toBeCloseTo(304, 1);
    for (const selector of ['.headline', '.footer']) {
      await part(page, selector).evaluate((el) => el.scrollIntoView({ block: 'nearest' }));
      const inner = await rect(part(page, selector));
      expect(inner.y >= short.y - 0.5 && bottom(inner) <= bottom(short) + 0.5, selector).toBe(true);
    }
    // Never in two directions.
    expect(await part(page, '.clip').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.keyboard.press('Escape');
    await expect.poll(() => log(page)).toEqual(['p:escape']);
    await expect.poll(() => active(page)).toBe('#a');
  });

  test('POP-32: with forced colors the container and its arrow take an edge sys.border.hairline wide in the text color, as one outline, and the headline and plain text take the text color', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mountFixtures(page, spec, { icons: true });
    // The compact- fixtures are the real overlay, which plays its entrance (POP-26): it is read once that has ended.
    await motionEnded(page);
    const canvasText = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = 'CanvasText';
      document.body.appendChild(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    });
    const hairline = await resolveToken(page, '--tanrei-sys-border-hairline');
    for (const fixture of spec.fixtures) {
      const edge = await fixtureHost(page, fixture.id).evaluate((el) => {
        const root = el.shadowRoot!;
        const box = getComputedStyle(root.querySelector('.container')!);
        const arrow = root.querySelector('.arrow')!;
        const headline = root.querySelector('.headline');
        return {
          style: box.borderTopStyle,
          widths: [box.borderTopWidth, box.borderRightWidth, box.borderBottomWidth, box.borderLeftWidth].map((width) => Number.parseFloat(width)),
          color: box.borderTopColor,
          text: box.color,
          headline: headline ? getComputedStyle(headline).color : null,
          arrow: getComputedStyle(arrow).display === 'none' ? null : [getComputedStyle(arrow).backgroundColor, getComputedStyle(arrow, '::after').content !== 'none', getComputedStyle(arrow, '::after').clipPath.startsWith('polygon')],
          filter: getComputedStyle(root.querySelector('.motion')!).filter,
        };
      });
      expect(edge.style, fixture.id).toBe('solid');
      expect(edge.widths, fixture.id).toEqual([hairline, hairline, hairline, hairline]);
      expect([edge.color, edge.text], fixture.id).toEqual([canvasText, canvasText]);
      if (fixture.props.headline) expect(edge.headline, fixture.id).toBe(canvasText);
      // Round the arrow where one is drawn: the triangle in the text color, with the page's color laid inside it.
      if (fixture.props.arrow) expect(edge.arrow, fixture.id).toEqual([canvasText, true, true]);
      else expect(edge.arrow, fixture.id).toBe(null);
      expect(edge.filter, fixture.id).toBe('none');
    }
  });

  test('POP-33: the layout direction is the one of the nearest ancestor that sets one, with no setting of its own; a direction changed while the popover is shown redraws it at once for the new direction, keeping its open state and its focus', async ({ page }) => {
    await mount(page, `<div id="scope" dir="rtl">${anchorAt(350, 200)}${popover('headline="Storage" closable close-label="Close"')}</div>`);
    expect(await page.evaluate(() => document.documentElement.getAttribute('dir'))).toBe(null);
    expect(await host(page).evaluate((el) => [el.hasAttribute('dir'), 'dir' in (el.constructor as unknown as { properties: object }).properties, 'direction' in (el.constructor as unknown as { properties: object }).properties])).toEqual([false, false, false]);
    await open(page);
    const gap = await resolveToken(page, T('offset'));
    const anchor = await rect(page.locator('#a'));
    // Right-to-left from the ancestor: the start edge is the anchor's right one, the close button is at the left.
    expectPlaced('bottom-start', anchor, await rect(surface(page)), gap, true);
    expect((await rect(part(page, 'tanrei-button.close'))).x).toBeLessThan((await rect(part(page, '.headline'))).x);
    await part(page, 'tanrei-button.close').locator('button').focus();
    // Changed after the first render, on the ancestor: drawn for the new direction at once, still open, focus where it was.
    const redrawn = await page.evaluate(async () => {
      document.querySelector('#scope')!.setAttribute('dir', 'ltr');
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const surface = document.querySelector('tanrei-popover')!.shadowRoot!.querySelector('.surface')!;
      const box = surface.getBoundingClientRect();
      return { box: { x: box.x, y: box.y, width: box.width, height: box.height }, moving: surface.getAnimations({ subtree: true }).length };
    });
    expectPlaced('bottom-start', anchor, redrawn.box, gap, false);
    expect(redrawn.moving).toBe(0);
    expect((await rect(part(page, 'tanrei-button.close'))).x).toBeGreaterThan((await rect(part(page, '.headline'))).x);
    expect([await isShown(page), await activeButton(page), await log(page)]).toEqual([true, 'Close', []]);
  });

  test('POP-34: in right-to-left start is the anchor’s right side and end its left, -start and -end are the right and left edges, and a positive crossOffset above or below moves towards the left; top, bottom, -top, -bottom and a crossOffset beside the anchor stay; the header and the actions mirror, and the close glyph and the arrow’s shape do not', async ({ page }) => {
    await mount(page, `${anchorAt(400, 330)}${popover('headline="إفراغ" closable close-label="إغلاق" arrow', `سلة.<tanrei-button slot="actions" dismissive>إلغاء</tanrei-button><tanrei-button slot="actions" confirming>إفراغ</tanrei-button>`)}`, { width: 900, height: 700, dir: 'rtl' });
    await open(page);
    const gap = (await resolveToken(page, T('offset'))) + (await resolveToken(page, T('arrow-height')));
    const anchor = await rect(page.locator('#a'));
    for (const placement of ANCHORED_PLACEMENTS.filter((value) => value !== 'auto') as AnchoredPlacement[]) {
      await set(page, { placement });
      await settle(page);
      expectPlaced(placement, anchor, await rect(surface(page)), gap, true);
    }
    expect(await surface(page).getAttribute('data-side')).toBe('left');
    // crossOffset: towards the left below the anchor; towards the bottom beside it, as in left-to-right.
    await set(page, { placement: 'bottom' });
    await settle(page);
    const centred = await rect(surface(page));
    await set(page, { crossOffset: 20 });
    await expect.poll(async () => (await rect(surface(page))).x - centred.x).toBeCloseTo(-20, 1);
    await set(page, { placement: 'end', crossOffset: 0 });
    await settle(page);
    const beside = await rect(surface(page));
    await set(page, { crossOffset: 10 });
    await expect.poll(async () => (await rect(surface(page))).y - beside.y).toBeCloseTo(10, 1);
    await set(page, { placement: 'bottom-start', crossOffset: 0 });
    await settle(page);
    // The header mirrors, with logical paddings; the actions run from the right.
    const padInline = await resolveToken(page, T('container-padding-inline'));
    const [box, headline, closeButton] = [await rect(container(page)), await rect(part(page, '.headline')), await rect(part(page, 'tanrei-button.close').locator('button'))];
    expect(right(box) - right(headline)).toBeCloseTo(padInline, 1);
    expect(closeButton.x - box.x).toBeCloseTo(padInline, 1);
    const [dismissive, confirming] = [await rect(host(page).locator('tanrei-button[dismissive] button')), await rect(host(page).locator('tanrei-button[confirming] button'))];
    expect(Math.abs(right(box) - right(dismissive) - padInline)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(confirming.x - box.x - padInline)).toBeLessThanOrEqual(0.5);
    // Not mirrored: the close glyph, and the arrow's shape (the same triangle as in left-to-right, on the same edge).
    expect(await part(page, 'tanrei-button.close').evaluate((el) => getComputedStyle(el.querySelector('[slot="icon"]')!).transform)).toBe('none');
    const rtlArrow = await part(page, '.arrow').evaluate((el) => [getComputedStyle(el).clipPath, getComputedStyle(el).transform]);
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'ltr'));
    await settle(page);
    expect(await part(page, '.arrow').evaluate((el) => [getComputedStyle(el).clipPath, getComputedStyle(el).transform])).toEqual(rtlArrow);
  });

  test('POP-35: the headline is text of its own direction, isolated from the text around it, and is still placed and its lines aligned by the layout direction', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: spec.fixtures.filter((f) => f.id === 'rtl-ltr-headline' || f.id === 'rtl') });
    const headline = fixtureHost(page, 'rtl-ltr-headline').locator('.headline');
    expect(await headline.evaluate((el) => [getComputedStyle(el).unicodeBidi, getComputedStyle(el).direction, getComputedStyle(el).textAlign])).toEqual(['plaintext', 'rtl', 'right']);
    // A left-to-right headline keeps its own order ("v2.1 beta": the v first, at the left of its run)…
    const order = await headline.evaluate((el) => {
      const text = [...el.childNodes].find((node) => node.nodeType === Node.TEXT_NODE)!;
      const at = (index: number) => {
        const range = document.createRange();
        range.setStart(text, index);
        range.setEnd(text, index + 1);
        return range.getBoundingClientRect().x;
      };
      return [at(0), at(el.textContent!.length - 1)];
    });
    expect(order[0]).toBeLessThan(order[1]);
    // …and is still placed by the layout: at the container's right, the close button at its left.
    const box = await rect(fixtureHost(page, 'rtl-ltr-headline').locator('.container'));
    const padInline = await resolveToken(page, T('container-padding-inline'));
    expect(right(box) - right(await rect(headline))).toBeCloseTo(padInline, 1);
    expect((await rect(fixtureHost(page, 'rtl-ltr-headline').locator('tanrei-button.close'))).x).toBeLessThan((await rect(headline)).x);
    // An Arabic headline in the same layout: its own (right-to-left) run, aligned the same way.
    expect(await fixtureHost(page, 'rtl').locator('.headline').evaluate((el) => [getComputedStyle(el).unicodeBidi, getComputedStyle(el).textAlign])).toEqual(['plaintext', 'right']);
    // Aligned by the layout, not by the text: a wrapped left-to-right headline in a right-to-left popover ends its lines at the right.
    await fixtureHost(page, 'rtl-ltr-headline').evaluate((el) => ((el as unknown as { headline: string }).headline = 'Version 2.1 beta of the storage report for every shared folder'));
    await expect.poll(async () => (await rect(headline)).height).toBeGreaterThan(30);
    const lines = await headline.evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return [...range.getClientRects()].map((line) => Math.round(line.right));
    });
    expect(Math.max(...lines) - Math.round(right(await rect(headline)))).toBeLessThanOrEqual(1);
  });
});

test.describe('compact window', () => {
  // A compact window under the default system: narrower than comp.popover.compact.window-width (600).
  const COMPACT = popoverWindow;
  const WIDE = { width: 800, height: 600 };
  const B = (name: string) => `--tanrei-comp-bottom-sheet-${name}`;
  const sheet = (page: P, id = 'p') => page.locator(`${TAG}#${id} > dialog.sheet`);
  const isSheet = (page: P, id = 'p') => host(page, id).evaluate((el) => !!el.shadowRoot!.querySelector('dialog.sheet')?.matches('[open]:modal'));
  const isAnchored = (page: P, id = 'p') => host(page, id).evaluate((el) => !!el.shadowRoot!.querySelector('.surface')?.matches(':popover-open'));
  /** Opens by the opener's press, as a product does, and waits for the sheet's motion to end. */
  async function openSheet(page: P, id = 'p') {
    await page.locator('#a').click();
    await expect.poll(() => isSheet(page, id)).toBe(true);
    await settle(page);
    await motionEnded(sheet(page, id));
  }
  const page320 = (attributes = '', content = `The 12 files in it will be deleted.<button id="in" type="button">Details</button>${ACTIONS}`) =>
    `<div style="padding: 120px 40px 0"><button id="a" type="button">Storage</button> <button id="behind" type="button">Behind</button></div>${popover(`headline="Empty the trash?" ${attributes}`, content)}`;

  test('POP-39: narrower than compact.window-width it takes the bottom sheet’s appearance — at the bottom edge, as wide as the window up to its greatest width, its color, elevation and top corners, square at the bottom, no arrow, placement and width ignored; never taller than the window less the top margin; 0 keeps it beside its anchor', async ({ page }) => {
    await mount(page, page320('placement="top" width="anchor" arrow'), COMPACT);
    expect(COMPACT.width).toBeLessThan(await resolveToken(page, T('compact-window-width')));
    await openSheet(page);
    const d = sheet(page);
    const [maxWidth, radius] = [await resolveToken(page, B('container-max-width')), await resolveToken(page, B('container-shape'))];
    const box = await rect(d);
    expect(box.x).toBeCloseTo(0, 1);
    expect(box.width).toBeCloseTo(Math.min(COMPACT.width, maxWidth), 1);
    expect(bottom(box)).toBeCloseTo(COMPACT.height, 1);
    for (const corner of ['top-left', 'top-right']) expect(Number.parseFloat(await css(d, `border-${corner}-radius`))).toBeCloseTo(radius, 1);
    for (const corner of ['bottom-left', 'bottom-right']) expect(Number.parseFloat(await css(d, `border-${corner}-radius`))).toBe(0);
    expect(await css(d, 'background-color')).toBe(await resolveColor(page, B('container-color')));
    expect(await css(d, 'box-shadow')).toBe(await resolveShadow(page, B('container-elevation')));
    // No arrow, no anchored surface: the sheet is the one container.
    await expect(host(page).locator('.arrow')).toHaveCount(0);
    expect(await isAnchored(page)).toBe(false);
    // Its parts keep their own tokens: the headline's color is the popover's.
    expect(await css(part(page, '.headline'), 'color')).toBe(await resolveColor(page, T('headline-color')));
    // Never taller than the window less the top margin: a long content scrolls between the header and the actions.
    await host(page).evaluate((el, text) => el.insertAdjacentText('afterbegin', text), LONG);
    const top = await resolveToken(page, B('container-margin-block-start'));
    await expect.poll(async () => (await rect(d)).y).toBeCloseTo(top, 0);
    expect(bottom(await rect(d))).toBeCloseTo(COMPACT.height, 1);
    expect(await part(page, '.content').evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    await set(page, { open: false });
    await expect.poll(() => isSheet(page)).toBe(false);
    // 0: no window is compact — beside its anchor in the same window.
    await rootTokens(page, { [T('compact-window-width')]: '0px' });
    await set(page, { open: true });
    await expect.poll(() => isAnchored(page)).toBe(true);
    await expect(host(page).locator('dialog.sheet')).toHaveCount(0);
  });

  test('POP-40: as a sheet it is a modal dialog over the bottom sheet’s scrim — everything behind it inert, the page held from scrolling, focus in and kept in; Escape, a press on the scrim and the close button ask to close with escape, outside and close; focus goes back to the opener', async ({ page }) => {
    await mount(page, page320('closable close-label="Close"'), COMPACT);
    await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<div style="block-size: 3000px"></div>'));
    await page.locator('#a').focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => isSheet(page)).toBe(true);
    await settle(page);
    const d = sheet(page);
    expect(await d.evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-modal'), el.getAttribute('aria-label')])).toEqual(['dialog', 'true', 'Empty the trash?']);
    await expect(page.getByRole('dialog', { name: 'Empty the trash?' })).toHaveCount(1);
    expect(await d.evaluate((el) => getComputedStyle(el, '::backdrop').backgroundColor)).toBe(await resolveColor(page, B('scrim-color')));
    // The whole window is the scrim, the popover's own.
    expect(await page.evaluate(() => document.elementFromPoint(2, 2)?.localName)).toBe(TAG);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('hidden');
    // Focus is in it (the container), and stays in: what is behind cannot take it, and Tab wraps.
    expect(await active(page)).toBe('dialog.container.sheet');
    await page.locator('#behind').evaluate((el) => (el as HTMLElement).focus());
    expect(await active(page)).toBe('dialog.container.sheet');
    await tab(page);
    expect(await activeButton(page)).toBe('Close');
    await tab(page);
    expect(await active(page)).toBe('#in');
    await tab(page);
    await tab(page);
    expect(await activeButton(page)).toBe('Empty');
    await tab(page);
    expect(await activeButton(page)).toBe('Close');
    await page.keyboard.press('Shift+Tab');
    expect(await activeButton(page)).toBe('Empty');
    // The opener still says it opens a dialog, and that it is open.
    expect(await page.locator('#a').evaluate((el) => [el.getAttribute('aria-haspopup'), el.getAttribute('aria-expanded')])).toEqual(['dialog', 'true']);
    // Escape: close with escape, focus back on the opener, the page given back.
    await page.keyboard.press('Escape');
    await expect.poll(() => isSheet(page)).toBe(false);
    expect(await log(page)).toEqual(['p:escape']);
    await expect(page.locator('#a')).toBeFocused();
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('visible');
    // A press on the scrim: outside.
    await openSheet(page);
    await page.mouse.click(COMPACT.width / 2, 20);
    await expect.poll(() => isSheet(page)).toBe(false);
    // The close button: close.
    await openSheet(page);
    await host(page).locator('tanrei-button.close').click();
    await expect.poll(() => isSheet(page)).toBe(false);
    expect(await log(page)).toEqual(['p:escape', 'p:outside', 'p:close']);
    // An action does not close it (POP-17).
    await openSheet(page);
    await host(page).locator('tanrei-button[slot="actions"]', { hasText: 'Empty' }).click();
    expect(await isSheet(page)).toBe(true);
    expect(await log(page)).toEqual(['p:escape', 'p:outside', 'p:close']);
  });

  test('POP-41: as a sheet it slides up from below the bottom edge over the bottom sheet’s enter motion and down over its exit motion, the scrim fading with it; it only fades where motion is reduced', async ({ page }) => {
    await mount(page, page320(), { ...COMPACT, reducedMotion: false });
    // The motions at 40 s, so that what is read is read on the way; the durations are read from the transitions.
    await rootTokens(page, { [B('motion-enter-duration')]: '40s', [B('motion-exit-duration')]: '40s' });
    await set(page, { open: true });
    await expect.poll(() => isSheet(page)).toBe(true);
    const d = sheet(page);
    const running = await d.evaluate((el) => el.getAnimations().map((a) => ({ property: (a as CSSTransition).transitionProperty, duration: a.effect!.getTiming().duration })));
    expect(running).toEqual(expect.arrayContaining([{ property: 'translate', duration: 40_000 }]));
    expect(running.map((r) => r.property)).not.toContain('scale');
    expect(running.map((r) => r.property)).not.toContain('opacity');
    // On its way up: below its place, by no more than its own height.
    const [moving, height] = await d.evaluate((el) => [new DOMMatrix(getComputedStyle(el).transform === 'none' ? undefined : getComputedStyle(el).transform).m42 || Number.parseFloat(getComputedStyle(el).translate.split(' ')[1] ?? '0'), el.getBoundingClientRect().height]);
    expect(moving).toBeGreaterThan(0);
    expect(moving).toBeLessThanOrEqual(height + 0.5);
    await d.evaluate((el) => el.getAnimations().forEach((a) => a.finish()));
    // Closing slides it down, drawn in the top layer in every engine until it has (MDL-7), the scrim fading.
    const leaving = await host(page).evaluate(async (el: HTMLElement & { open: boolean; updateComplete: Promise<unknown> }) => {
      el.open = false;
      await el.updateComplete;
      return (el.shadowRoot!.querySelector('dialog') as HTMLElement).getAnimations().map((a) => ({ property: (a as CSSTransition).transitionProperty, duration: a.effect!.getTiming().duration }));
    });
    expect(leaving).toEqual(expect.arrayContaining([{ property: 'translate', duration: 40_000 }]));
    const out = await d.evaluate((el) => {
      const style = getComputedStyle(el);
      return { properties: style.transitionProperty.split(', '), duration: Number.parseFloat(style.transitionDuration) * 1000 };
    });
    expect(out.properties).toContain('translate');
    expect(out.duration).toBe(40_000);
    // The exit ended — the slide and the scrim (on the `::backdrop`) — the sheet has left the top layer.
    await d.evaluate((el) => el.getAnimations({ subtree: true }).forEach((a) => a.finish()));
    await expect.poll(() => d.evaluate((el) => getComputedStyle(el).display)).toBe('none');
    // Reduced: it fades in place.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const reduced = await host(page).evaluate(async (el: HTMLElement & { open: boolean; updateComplete: Promise<unknown> }) => {
      el.open = true;
      await el.updateComplete;
      return (el.shadowRoot!.querySelector('dialog') as HTMLElement).getAnimations().map((a) => (a as CSSTransition).transitionProperty);
    });
    expect(reduced).toContain('opacity');
    expect(reduced).not.toContain('translate');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  test('POP-42: crossing compact.window-width while open changes the presentation at once — no motion, no close — keeping the element that has focus; focus on the opener moves into the sheet', async ({ page }) => {
    await mount(page, page320(), WIDE);
    await page.locator('#a').focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => isAnchored(page)).toBe(true);
    await settle(page);
    await page.locator('#in').focus();
    // No motion: no transition starts in the popover's tree at either switch.
    await watchTransitions(host(page));
    await page.setViewportSize(COMPACT);
    await expect.poll(() => isSheet(page)).toBe(true);
    await settle(page);
    expect(await transitionsRun(host(page))).toEqual([]);
    await expect(page.locator('#in')).toBeFocused();
    await watchTransitions(host(page));
    await page.setViewportSize(WIDE);
    await expect.poll(() => isAnchored(page)).toBe(true);
    await expect(host(page).locator('dialog.sheet')).toHaveCount(0);
    await settle(page);
    expect((await transitionsRun(host(page))).filter((run) => run.on.includes('motion') || run.on.includes('sheet'))).toEqual([]);
    await expect(page.locator('#in')).toBeFocused();
    expect(await log(page)).toEqual([]);
    // Focus on the opener (Shift+Tab from the popover's first element leaves it open): the sheet takes it in.
    await page.locator('#in').focus();
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#a')).toBeFocused();
    expect(await isOpen(page)).toBe(true);
    await page.setViewportSize(COMPACT);
    await expect.poll(() => isSheet(page)).toBe(true);
    expect(await active(page)).toBe('dialog.container.sheet');
    expect(await log(page)).toEqual([]);
  });

  test('POP-43: compact-presentation own, or initial-focus anchor, keeps it beside its anchor and not modal in a compact window; an unknown value is a sheet, and reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, `${page320('compact-presentation="own"')}`, COMPACT);
    await page.locator('#a').click();
    await expect.poll(() => isAnchored(page)).toBe(true);
    await expect(host(page).locator('dialog.sheet')).toHaveCount(0);
    expect(await container(page).evaluate((el) => el.getAttribute('aria-modal'))).toBe(null);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('visible');
    await page.locator('#a').click();
    await expect.poll(() => isOpen(page)).toBe(false);
    await mount(page, `${page320('initial-focus="anchor"')}`, COMPACT);
    // (By the keyboard: a press does not focus a button in WebKit.)
    await page.locator('#a').focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => isAnchored(page)).toBe(true);
    await expect(page.locator('#a')).toBeFocused();
    await page.locator('#a').click();
    await expect.poll(() => isOpen(page)).toBe(false);
    await mount(page, `${page320('compact-presentation="beside"')}`, COMPACT);
    await openSheet(page);
    expect(seen.some((text) => text.includes('POP-43') && text.includes('"beside"'))).toBe(true);
  });

  test('no axe violations as a sheet, in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await page.setViewportSize(COMPACT);
      await mountFixtures(page, spec, { theme, icons: true, fixtures: [spec.fixtures.find((f) => f.id === 'compact')!] });
      await expect.poll(() => fixtureHost(page, 'compact').evaluate((el) => !!el.shadowRoot!.querySelector('dialog.sheet[open]'))).toBe(true);
      await settle(page);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(' ')}`).join(', ')}`).toEqual([]);
    }
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark, in place and in the top layer, open and closed', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true, fixtures: IN_PLACE });
      await settle(page);
      const results = await new AxeBuilder({ page }).include('main').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(' ')}`).join(', ')}`).toEqual([]);
      // The real overlay, open against its opener and closed.
      const real: Fixture[] = [
        { ...spec.fixtures.find((f) => f.id === 'arrow-actions')!, id: 'top-layer', props: { ...spec.fixtures.find((f) => f.id === 'arrow-actions')!.props, anchor: 'opener-open' } },
        { ...spec.fixtures.find((f) => f.id === 'scrolling')!, id: 'closed', props: { ...spec.fixtures.find((f) => f.id === 'scrolling')!.props, open: false, anchor: 'opener-closed' } },
      ];
      await page.setViewportSize({ width: 800, height: 1200 });
      await mountFixtures(page, spec, { theme, icons: true, fixtures: real });
      await expect.poll(() => fixtureHost(page, 'top-layer').evaluate((el) => el.shadowRoot!.querySelector('.surface')!.matches(':popover-open'))).toBe(true);
      await settle(page);
      const overlay = await new AxeBuilder({ page }).analyze();
      expect(overlay.violations, `${theme}, top layer: ${overlay.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(' ')}`).join(', ')}`).toEqual([]);
    }
  });
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: IN_PLACE });
    await settle(page);
  });

  test('every fixture is mounted open on its 480 × 480 stage against a medium outlined Button at its centre, drawn in place, with the parts and the name its props give it', async ({ page }) => {
    expect(spec.fixtures.length).toBe(34);
    expect(COMPACT_FIXTURES.map((f) => f.id)).toEqual(['compact', 'compact-own']);
    const gap = await resolveToken(page, T('offset'));
    const arrowHeight = await resolveToken(page, T('arrow-height'));
    for (const f of IN_PLACE) {
      const [frame, anchor] = [await rect(stage(page, f.id)), await rect(stage(page, f.id).locator('> tanrei-button'))];
      expect([frame.width, frame.height], f.id).toEqual([480, 480]);
      expect(Math.abs(centerX(anchor) - centerX(frame)) < 1 && Math.abs(centerY(anchor) - centerY(frame)) < 1, f.id).toBe(true);
      expect(anchor.width, f.id)[f.id === 'width-anchor' ? 'toBe' : 'toBeLessThan'](240);
      await expect(stage(page, f.id).locator('> tanrei-button'), f.id).toHaveAttribute('variant', 'outlined');
      const own = fixtureHost(page, f.id);
      expect(await own.evaluate((el) => [el.hasAttribute('inline'), el.hasAttribute('open'), el.shadowRoot!.querySelector('.surface')!.classList.contains('open'), el.shadowRoot!.querySelector('.surface')!.hasAttribute('popover')]), f.id).toEqual([true, true, true, false]);
      // Inside its stage, which stands for the window.
      const box = await rect(own.locator('.container'));
      expect(box.x >= frame.x && right(box) <= right(frame) && box.y >= frame.y && bottom(box) <= bottom(frame), f.id).toBe(true);
      await expect(stage(page, f.id).getByRole('dialog', { name: String(f.props.headline ?? f.props.label), exact: true }), f.id).toHaveCount(1);
      await expect(own.locator('.headline'), f.id).toHaveCount(f.props.headline ? 1 : 0);
      await expect(own.locator('tanrei-button.close'), f.id).toHaveCount(f.props.closable ? 1 : 0);
      await expect(own.locator('tanrei-button[slot="actions"]'), f.id).toHaveCount(f.items?.length ?? 0);
      expect(await own.locator('.surface').evaluate((el) => el.hasAttribute('data-arrow')), f.id).toBe(f.props.arrow === true);
      // Where its placement says, for the placements that fit their stage as they are named.
      const placement = String(f.props.placement ?? 'bottom-start');
      if (/^placement-|^arrow-(bottom|top-end|end)$|^rtl-arrow/.test(f.id) && placement !== 'auto') {
        expectPlaced(placement, anchor, await rect(own.locator('.surface')), (f.props.offset as number | undefined) ?? gap + (f.props.arrow ? arrowHeight : 0), f.direction === 'rtl');
      }
    }
    // The fixtures that say more than a placement.
    expect((await rect(fixtureHost(page, 'width-anchor').locator('.container'))).width).toBeCloseTo(240, 1);
    expect(await fixtureHost(page, 'actions-stacked').locator('.actions').evaluate((el) => el.classList.contains('stacked'))).toBe(true);
    expect(await fixtureHost(page, 'actions').locator('.actions').evaluate((el) => el.classList.contains('stacked'))).toBe(false);
    expect(await fixtureHost(page, 'scrolling').locator('.clip').evaluate((el) => [el.hasAttribute('data-more'), el.hasAttribute('data-scrolled')])).toEqual([true, false]);
    expect(await fixtureHost(page, 'inset-off').evaluate((el) => el.hasAttribute('no-inset'))).toBe(true);
    const offset = spec.fixtures.find((f) => f.id === 'offset')!;
    const [anchor, placed] = [await rect(stage(page, 'offset').locator('> tanrei-button')), await rect(fixtureHost(page, 'offset').locator('.surface'))];
    // offset from the anchor's edge, and crossOffset along it — as far as the stage's margin lets it go.
    expect(Math.round(placed.y - bottom(anchor))).toBe(offset.props.offset);
    const end = (await rect(stage(page, 'offset'))).x + 480 - (await resolveToken(page, T('window-margin')));
    expect(placed.x).toBeCloseTo(Math.min(anchor.x + Number(offset.props.crossOffset), end - placed.width), 1);
    expect(placed.x - anchor.x).toBeGreaterThan(20);
  });

  for (const f of IN_PLACE) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});

test.describe('compact fixtures', () => {
  // Each alone in its 360 × 640 window, the real overlay opened at mount; the baseline is the window, because a sheet
  // and its scrim are in the top layer (POP-39, POP-43).
  for (const f of COMPACT_FIXTURES) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await page.setViewportSize(popoverWindow);
      await mountFixtures(page, spec, { icons: true, fixtures: [f] });
      const own = fixtureHost(page, f.id);
      await expect.poll(() => own.evaluate((el) => !!el.shadowRoot!.querySelector('dialog.sheet[open], .surface:popover-open'))).toBe(true);
      await settle(page);
      await motionEnded(own.locator('dialog.sheet, .surface > .motion').first());
      await expect(page).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
