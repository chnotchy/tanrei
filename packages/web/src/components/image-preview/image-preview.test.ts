// <tanrei-image-preview>, driven by specs/image-preview.spec.json: every behaviour id (IMP-1…43) starts the title of a
// test, every fixture has a baseline, and every value is read back from the tokens. Its five controls are Tanrei
// Buttons and its placeholder a Tanrei Skeleton: nothing of theirs is tested again here.
//
// The gestures are driven three ways, and each test says which: a real mouse (`page.mouse`), which every engine turns
// into pointer events of its own; pointer events made in the page for a finger (`finger()`, `drag()`), which every
// engine dispatches alike; and, in Chromium, real touches over the DevTools protocol.
import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';
import { override, warnings } from '../../../test/destinations.js';
import { type Fixture, type FixtureItem, innerStrokeAtEdges, loadSpec, missingWords, mountFixtures, resolveColor, resolveToken, tab } from '../../../test/harness.js';
import { fixturePicture } from '../../../test/pictures.js';
import { holdClock, releaseClock } from '../../../test/page-clock.js';
import { releaseAtRest } from '../../../test/release-at-rest.js';
import { STOPPED_AFTER, flingThenHold, strokes } from '../../../test/stopped-release.js';

const spec = loadSpec('image-preview');
type P = Page;
/** The spec's stage: a 640 × 640 window; 360 × 640 for the `compact-` runs. */
const WINDOW = { width: 640, height: 640 };
const COMPACT = { width: 360, height: 640 };
const T = (name: string) => `--tanrei-comp-image-preview-${name}`;
const fixtureOf = (id: string) => spec.fixtures.find((f) => f.id === id)!;

const WORDS = { label: 'Photos of the room', closeLabel: 'Close', zoomInLabel: 'Zoom in', zoomOutLabel: 'Zoom out', errorText: 'This image could not be loaded', previousLabel: 'Previous image', nextLabel: 'Next image', countText: '{position} of {count}' };
const image = (name: string, alt: string, props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'image', props: { src: name === 'missing' ? 'fixtures/missing.png' : name.includes(':') || name === '' ? name : `fixtures/image-preview-${name}.png`, alt, ...props } });
const LANDSCAPE = image('landscape', 'A bedroom with a window onto a garden', { width: 1600, height: 1000 });
const PORTRAIT = image('portrait', 'The desk beside the window, seen from the door', { width: 1000, height: 1500 });
const SQUARE = image('square', 'A reading chair under a lamp', { width: 1200, height: 1200 });
const THREE = [LANDSCAPE, PORTRAIT, SQUARE];
const fx = (props: Fixture['props'] = {}, items: FixtureItem[] = THREE, more: Partial<Fixture> = {}): Fixture => ({ id: 'p', props: { open: true, ...WORDS, ...props }, items, ...more });
const LONG = fixtureOf('long-caption').items![0].props.caption as string;

/** Each preview has rendered, and two frames have passed. */
const settled = (page: P) =>
  page.evaluate(async () => {
    for (const el of document.querySelectorAll<HTMLElement & { updateComplete: Promise<unknown> }>('tanrei-image-preview')) await el.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    for (const el of document.querySelectorAll<HTMLElement & { updateComplete: Promise<unknown> }>('tanrei-image-preview')) await el.updateComplete;
  });

/** IMP-14, IMP-24: the web's interval for a double press — two `pointerup`s within 300 ms (the spec's web notes). */
const DOUBLE_PRESS = 300;
/**
 * Two presses of a mouse at `at`, within the interval on any machine, and then the interval run out. The page's clock is
 * held — its timers and the presses' own times (`event.timeStamp`) — so no page time passes between the two however
 * long the driver takes to send them (300 ms and more on a loaded runner, 600 in harsh mode), and the preview's wait for
 * a second press is then run to its end on the clock: a press also answered as a single one would have answered by then.
 */
const doublePress = async (page: P, at: { x: number; y: number }) => {
  await holdClock(page);
  try {
    await page.mouse.click(at.x, at.y);
    await page.mouse.click(at.x, at.y, { delay: 20 });
    await page.clock.runFor(DOUBLE_PRESS);
  } finally {
    await releaseClock(page);
  }
};

/** Nothing of the preview is in transition any more (the Skeleton's own stir goes on by design). */
const rest = async (page: P) => {
  await settled(page);
  await page.waitForFunction(() => {
    const root = document.querySelector('tanrei-image-preview')?.shadowRoot;
    return !!root && root.getAnimations().every((animation) => !(animation instanceof CSSTransition) || animation.playState !== 'running');
  });
  await settled(page);
};

async function mount(page: P, fixture: Fixture | Fixture[] = fx(), options: Parameters<typeof mountFixtures>[2] & { window?: { width: number; height: number }; loaded?: boolean } = {}) {
  const { window: size = WINDOW, loaded = true, ...rest_ } = options;
  await page.setViewportSize(size);
  await mountFixtures(page, spec, { fixtures: Array.isArray(fixture) ? fixture : [fixture], icons: true, ...rest_ });
  await settled(page);
  // The image shown has arrived (a picture given as a `data:` address loads in a turn of its own).
  if (loaded) {
    await page.waitForFunction(() => {
      const host = document.querySelector<HTMLElement & { open: boolean }>('tanrei-image-preview');
      const root = host?.shadowRoot;
      return !host?.open || !root?.querySelector('dialog[open]') || !!root.querySelector('.page[style="--_at: 0"] :is(.image, .error, .waiting, .thumbnail)');
    });
    await rest(page);
  }
  await record(page);
}

/** The events the preview has fired since, in order. */
const record = (page: P) =>
  page.evaluate(() => {
    const seen: { type: string; detail: unknown }[] = [];
    (window as unknown as { __seen: typeof seen }).__seen = seen;
    for (const type of ['close', 'indexchange', 'zoomchange', 'controlshiddenchange', 'loaderror']) {
      document.addEventListener(type, (event) => {
        if ((event.target as Element).localName === 'tanrei-image-preview') seen.push({ type, detail: (event as CustomEvent).detail ?? null });
      });
    }
  });
const events = (page: P, type?: string) => page.evaluate((t) => (window as unknown as { __seen: { type: string; detail: Record<string, unknown> }[] }).__seen.filter((event) => !t || event.type === t), type ?? '');
/** The product's answer to `close`: it closes the preview. */
const closing = (page: P) => page.evaluate(() => document.querySelector('tanrei-image-preview')!.addEventListener('close', (event) => ((event.currentTarget as HTMLElement & { open: boolean }).open = false)));

const host = (page: P) => page.locator('tanrei-image-preview');
const part = (page: P, selector: string) => host(page).locator(selector);
const control = (page: P, name: string) => part(page, `tanrei-button.${name}`);
const set = (page: P, props: Record<string, unknown>) => host(page).evaluate((el, p) => Object.assign(el, p), props);

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}
interface Seen {
  open: boolean;
  index: number;
  zoom: number;
  hidden: boolean;
  modal: boolean;
  /** The image shown, its neighbours' pages and the fit area, as they are drawn. */
  image: Box | null;
  fit: Box;
  page: Box | null;
  before: Box | null;
  after: Box | null;
  focus: string;
  said: string;
  sources: string[];
}
/** What the preview holds and draws now. */
const look = (page: P): Promise<Seen> =>
  page.evaluate(() => {
    const el = document.querySelector('tanrei-image-preview') as HTMLElement & { open: boolean; index: number; zoom: number; controlsHidden: boolean };
    const root = el.shadowRoot!;
    const box = (element: Element | null) => {
      if (!element) return null;
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    };
    const active = root.activeElement;
    return {
      open: el.open,
      index: el.index,
      zoom: el.zoom,
      hidden: el.controlsHidden,
      modal: !!root.querySelector('dialog')?.matches(':modal'),
      image: box(root.querySelector('.page[style="--_at: 0"] .image')),
      fit: box(root.querySelector('.fit'))!,
      page: box(root.querySelector('.page[style="--_at: 0"]')),
      before: box(root.querySelector('.page[style="--_at: -1"]')),
      after: box(root.querySelector('.page[style="--_at: 1"]')),
      focus: active ? [...active.classList].find((name) => ['stage', 'zoom-out', 'zoom-in', 'close', 'previous', 'next', 'caption'].includes(name)) ?? active.localName : '',
      said: [...root.querySelectorAll('.said > div')].map((block) => block.textContent).join(' | '),
      sources: [...root.querySelectorAll<HTMLImageElement>('.pages img')].map((img) => img.dataset.src ?? ''),
    };
  });

const near = (actual: number, expected: number, what = '', within = 1) => expect(Math.abs(actual - expected), `${what}: ${actual} is not within ${within} of ${expected}`).toBeLessThanOrEqual(within);
/** The image shown, among the three that are drawn. */
const SHOWN = '.page[style="--_at: 0"] .image';
/** A fling has run out: the image shown is where it was a moment ago. */
const stopped = async (page: P) => {
  let last = '';
  await expect
    .poll(
      async () => {
        const now = JSON.stringify((await look(page)).image);
        const same = now === last;
        last = now;
        return same;
      },
      { intervals: [120] },
    )
    .toBe(true);
};
/**
 * Whether the engine can hold a closed dialog where it was — displayed, in the top layer — while it fades (the
 * `overlay` property). Where it cannot, a closed preview is gone at once, as a closed Dialog is.
 */
const fadesOut = (page: P) => page.evaluate(() => CSS.supports('overlay', 'auto'));
const centre = (box: Box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
const style = (page: P, selector: string, property: string) => part(page, selector).first().evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
const px = (page: P, name: string) => resolveToken(page, name);
const ms = (page: P, name: string) => resolveToken(page, name, 'duration');
/** The transitions running on `selector`, by property, with their durations in ms. */
const running = (page: P, selector: string) =>
  part(page, selector)
    .first()
    .evaluate((el) =>
      el
        .getAnimations()
        .filter((animation) => animation instanceof CSSTransition && animation.playState === 'running')
        .map((animation) => ({ property: (animation as CSSTransition).transitionProperty, duration: Number((animation.effect as KeyframeEffect).getTiming().duration) })),
    );

/**
 * Begins to keep the transitions the preview's own parts start, as the engine announces them (`transitionrun` in its
 * shadow root), each with its duration and the first and last value it runs between. A test that asks `running` for a
 * motion asks a round trip — or `settled`'s two frames — after the change that began it, and where a frame takes
 * longer than the motion the answer is empty; what is kept here does not depend on when the question arrives.
 * Called again, it forgets what it kept.
 */
const watchRuns = (page: P) =>
  host(page).evaluate((el) => {
    const kept = el as HTMLElement & { runs?: unknown[]; stopRuns?: () => void };
    kept.stopRuns?.();
    const stop = new AbortController();
    kept.stopRuns = () => stop.abort();
    const runs: unknown[] = (kept.runs = []);
    const listed = (value: string) => value.split(/,\s*(?![^(]*\))/).map((each) => each.trim());
    el.shadowRoot!.addEventListener(
      'transitionrun',
      (event) => {
        const { propertyName: property, pseudoElement } = event as TransitionEvent;
        if (pseudoElement) return;
        const target = event.target as Element;
        const transition = target.getAnimations().find((a) => a instanceof CSSTransition && a.transitionProperty === property && !(a.effect as KeyframeEffect).pseudoElement);
        let duration: number;
        let [from, to]: (string | null)[] = [null, null];
        if (transition) {
          const effect = transition.effect as KeyframeEffect;
          duration = Number(effect.getTiming().duration);
          const frames = effect.getKeyframes() as unknown as Record<string, unknown>[];
          const name = property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
          [from, to] = [String(frames[0]?.[name]), String(frames[frames.length - 1]?.[name])];
        } else {
          // Over before the frame that announces it: what it ran over is what its style says for its property.
          const style = getComputedStyle(target);
          const properties = listed(style.transitionProperty);
          const at = Math.max(properties.indexOf(property), properties.indexOf('all'), 0);
          const time = listed(style.transitionDuration)[at % listed(style.transitionDuration).length]!;
          duration = Number.parseFloat(time) * (time.endsWith('ms') ? 1 : 1000);
        }
        runs.push({ target, property, duration: Math.round(duration), from, to });
      },
      { signal: stop.signal },
    );
  });
/** The transitions begun since `watchRuns` on what `selector` names now, in the order the engine announced them. */
const runs = (page: P, selector: string) =>
  host(page).evaluate(
    (el, s) =>
      ((el as HTMLElement & { runs?: { target: Element; property: string; duration: number; from: string | null; to: string | null }[] }).runs ?? [])
        .filter((run) => run.target.matches(s))
        .map(({ property, duration, from, to }) => ({ property, duration, from, to })),
    selector,
  );
/** …by property and duration alone, as `running` gives them. */
const begun = async (page: P, selector: string) => (await runs(page, selector)).map(({ property, duration }) => ({ property, duration }));

/** A pointer event made in the page and dispatched on the stage: a finger (or a pen, or a mouse) every engine hears alike. */
const finger = (page: P, type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel', x: number, y: number, { id = 11, pointerType = 'touch' } = {}) =>
  host(page).evaluate(
    (el, [t, px_, py, i, kind]) => {
      el.shadowRoot!.querySelector('.stage')!.dispatchEvent(
        new PointerEvent(t as string, { pointerId: i as number, pointerType: kind as string, clientX: px_ as number, clientY: py as number, bubbles: true, composed: true, cancelable: true, isPrimary: true, button: 0, buttons: t === 'pointerup' ? 0 : 1 }),
      );
    },
    [type, x, y, id, pointerType] as const,
  );

/**
 * One pointer's drag, made in the page so that its timing is its own: down at `from`, `steps` moves `every` ms apart to
 * `to`, held `hold` ms (a drag held longer than the fling's window is released at rest) and — unless `release` is
 * false — lifted.
 */
const drag = (page: P, from: [number, number], to: [number, number], { steps = 6, every = 16, hold = 140, release = true, id = 11, pointerType = 'touch' } = {}) =>
  host(page).evaluate(
    async (el, [f, t, n, gap, wait, up, i, kind]) => {
      const stage = el.shadowRoot!.querySelector('.stage')!;
      const send = (type: string, x: number, y: number) =>
        stage.dispatchEvent(new PointerEvent(type, { pointerId: i as number, pointerType: kind as string, clientX: x, clientY: y, bubbles: true, composed: true, cancelable: true, isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
      const sleep = (time: number) => new Promise((resolve) => setTimeout(resolve, time));
      const [fx_, fy] = f as [number, number];
      const [tx, ty] = t as [number, number];
      send('pointerdown', fx_, fy);
      for (let step = 1; step <= (n as number); step++) {
        await sleep(gap as number);
        send('pointermove', fx_ + ((tx - fx_) * step) / (n as number), fy + ((ty - fy) * step) / (n as number));
      }
      if (wait) await sleep(wait as number);
      if (up) send('pointerup', tx, ty);
    },
    [from, to, steps, every, hold, release, id, pointerType] as const,
  );

/** A wheel event made in the page, on the stage at (`x`, `y`); returns whether the preview took it (prevented its default). */
const wheel = (page: P, x: number, y: number, init: WheelEventInit) =>
  host(page).evaluate(
    (el, [px_, py, more]) => {
      const event = new WheelEvent('wheel', { clientX: px_ as number, clientY: py as number, bubbles: true, composed: true, cancelable: true, ...(more as WheelEventInit) });
      el.shadowRoot!.querySelector('.stage')!.dispatchEvent(event);
      return event.defaultPrevented;
    },
    [x, y, init] as const,
  );

/** The role, name, description and children of the nodes Chromium exposes for the page (CDP). */
async function tree(page: P) {
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = (await cdp.send('Accessibility.getFullAXTree')) as unknown as {
    nodes: { ignored?: boolean; role?: { value: string }; name?: { value: string }; description?: { value: string }; properties?: { name: string; value: { value: unknown } }[] }[];
  };
  await cdp.detach();
  return nodes.filter((node) => !node.ignored).map((node) => ({ role: node.role?.value ?? '', name: node.name?.value ?? '', description: node.description?.value ?? '', properties: Object.fromEntries((node.properties ?? []).map((p) => [p.name, p.value.value])) }));
}

/** A picture answered from a route: an address of its own that the test can count, hold open or fail. */
const BYTES = (name: string) => Buffer.from(fixturePicture(`fixtures/image-preview-${name}.png`).split(',')[1], 'base64');
const ADDRESS = (name: string) => `http://pictures.test/${name}.png`;

test.describe('the modal layer', () => {
  test('IMP-1: open, the container is presented by a native modal dialog above everything, over the whole window and filled with container.color; everything outside is inert, the page does not scroll, and no scrim is drawn', async ({ page }) => {
    await mount(page, fx({ open: false }), { lead: '<button id="behind">Behind</button><p style="block-size: 2000px; margin: 0">A page</p>' });
    expect((await look(page)).modal, 'closed: nothing is presented').toBe(false);
    expect(await part(page, 'dialog').evaluate((el) => getComputedStyle(el).display)).toBe('none');
    await set(page, { open: true });
    await rest(page);
    const seen = await look(page);
    expect(seen.modal).toBe(true);
    const box = (await part(page, 'dialog').boundingBox())!;
    expect(box).toEqual({ x: 0, y: 0, ...WINDOW });
    expect(await style(page, '.surface', 'background-color')).toBe(await resolveColor(page, T('container-color')));
    // No scrim: nothing of the window is left uncovered.
    expect(await part(page, 'dialog').evaluate((el) => getComputedStyle(el, '::backdrop').backgroundColor)).toBe('rgba(0, 0, 0, 0)');
    // Inert: what is behind takes neither focus nor a press, and is hidden from assistive technology.
    const behind = await page.evaluate(() => {
      const button = document.querySelector<HTMLButtonElement>('#behind')!;
      let pressed = false;
      button.addEventListener('click', () => (pressed = true));
      button.focus();
      const hit = document.elementFromPoint(20, 20);
      return { focused: document.activeElement === button, pressed, hit: hit?.localName };
    });
    expect(behind).toEqual({ focused: false, pressed: false, hit: 'tanrei-image-preview' });
    // The page behind does not scroll.
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('hidden');
    await page.mouse.move(320, 320);
    await page.mouse.wheel(0, 400);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await set(page, { open: false });
    await settled(page);
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
  });

  test('IMP-1: closed, the preview takes no wheel of the page — the page scrolls under the pointer as if it were not there, before it was ever opened and after it has closed', async ({ page }) => {
    await mount(page, fx({ open: false }), { lead: '<p style="block-size: 3000px; margin: 0">A page</p>' });
    await page.mouse.move(320, 320);
    const turned = async () => {
      const from = await page.evaluate(() => window.scrollY);
      await page.mouse.wheel(0, 300);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(from);
    };
    await turned();
    await set(page, { open: true });
    await rest(page);
    await set(page, { open: false });
    await rest(page);
    await turned();
    // And it asks for no picture while it is closed.
    expect((await look(page)).modal).toBe(false);
  });

  test('IMP-2: when it opens focus moves to its stage — at once, while its entrance still runs — and a preview mounted with open true takes focus as if it had just opened', async ({ page }) => {
    await mount(page, fx({ open: false }), { lead: '<button id="opener">Open</button>' });
    await page.locator('#opener').focus();
    await override(page, { [T('motion-enter-duration')]: '2000ms' });
    const at = await host(page).evaluate(async (el: HTMLElement & { open: boolean; updateComplete: Promise<unknown> }) => {
      el.open = true;
      await el.updateComplete;
      const root = el.shadowRoot!;
      return { focus: root.activeElement?.className, moving: root.querySelector('dialog')!.getAnimations().length > 0 };
    });
    expect(at.focus).toContain('stage');
    expect(at.moving, 'focus did not wait for the motion').toBe(true);
    // Mounted open.
    await mount(page, fx());
    expect((await look(page)).focus).toBe('stage');
  });

  for (const dir of ['ltr', 'rtl'] as const) {
    test(`IMP-3: Tab moves through zoom out, zoom in, close, previous, the stage, next and the scrolling caption, in that order in a ${dir} layout, and wraps both ways; focus never leaves the preview`, async ({ page }) => {
      const items = [LANDSCAPE, { ...PORTRAIT, props: { ...PORTRAIT.props, caption: LONG } }, SQUARE];
      await mount(page, fx({ index: 1, zoom: 2 }, items), { dir, lead: '<button id="behind">Behind</button>' });
      expect((await look(page)).focus).toBe('stage');
      const order = ['next', 'caption', 'zoom-out', 'zoom-in', 'close', 'previous', 'stage', 'next'];
      for (const stop of order) {
        await tab(page);
        expect((await look(page)).focus, `Tab reaches ${stop}`).toBe(stop);
      }
      for (const stop of ['stage', 'previous', 'close', 'zoom-in', 'zoom-out', 'caption', 'next']) {
        await tab(page, { back: true });
        expect((await look(page)).focus, `Shift+Tab reaches ${stop}`).toBe(stop);
      }
      expect(await page.evaluate(() => document.activeElement?.localName)).toBe('tanrei-image-preview');
    });
  }

  test('IMP-3: what is not drawn is left out of the order — one image without a caption has the zoom controls, close and the stage, and a control at the end of its range is passed', async ({ page }) => {
    await mount(page, fx({}, [LANDSCAPE]));
    // At fit the zoom-out control is disabled.
    for (const stop of ['zoom-in', 'close', 'stage', 'zoom-in']) {
      await tab(page);
      expect((await look(page)).focus).toBe(stop);
    }
  });

  test('IMP-4: closed, focus returns to the element that had it when the preview opened — or, where that element is gone, is dropped to the document — and the page scrolls again', async ({ page }) => {
    await mount(page, fx({ open: false }), { lead: '<button id="opener">Open</button>' });
    await page.locator('#opener').focus();
    await set(page, { open: true });
    await settled(page);
    expect((await look(page)).focus).toBe('stage');
    await override(page, { [T('motion-exit-duration')]: '2000ms' });
    const back = await host(page).evaluate(async (el: HTMLElement & { open: boolean; updateComplete: Promise<unknown> }) => {
      el.open = false;
      await el.updateComplete;
      return { focus: document.activeElement?.id, fading: el.shadowRoot!.querySelector('dialog')!.getAnimations().length > 0, overflow: document.documentElement.style.overflow };
    });
    expect(back.focus, 'focus moved when it closed, not when its motion ended').toBe('opener');
    expect(back.overflow).toBe('');
    // The opener is gone.
    await set(page, { open: true });
    await settled(page);
    await page.evaluate(() => document.querySelector('#opener')!.remove());
    await set(page, { open: false });
    await settled(page);
    expect(await page.evaluate(() => document.activeElement === document.body || document.activeElement === null)).toBe(true);
  });

  test('IMP-5: the close control, Escape and the platform’s back each fire close exactly once with their reason, whatever the zoom; the preview stays open until the product sets open to false, and has no setting that takes these away', async ({ page }) => {
    await mount(page, fx({ index: 1, zoom: 2 }));
    await page.evaluate(() => {
      (window as unknown as { __clicks: number }).__clicks = 0;
      document.addEventListener('click', () => (window as unknown as { __clicks: number }).__clicks++);
    });
    await control(page, 'close').click();
    await page.keyboard.press('Escape');
    // The platform's back: a close request without a key (Android's back) arrives as the dialog's own cancel.
    await page.waitForTimeout(1100);
    const prevented = await part(page, 'dialog').evaluate((el) => !el.dispatchEvent(new Event('cancel', { cancelable: true })));
    expect(prevented, 'the browser does not close it itself').toBe(true);
    expect(await events(page, 'close')).toEqual([
      { type: 'close', detail: { reason: 'button' } },
      { type: 'close', detail: { reason: 'escape' } },
      { type: 'close', detail: { reason: 'back' } },
    ]);
    const seen = await look(page);
    expect(seen.open && seen.modal, 'it never closes itself').toBe(true);
    // The Button's own click does not leave the preview.
    expect(await page.evaluate(() => (window as unknown as { __clicks: number }).__clicks)).toBe(0);
    await closing(page);
    await page.keyboard.press('Escape');
    await settled(page);
    expect((await look(page)).modal).toBe(false);
    // Nothing on the element can take a way out away.
    const names = await host(page).evaluate((el) => Object.keys((el.constructor as unknown as { elementProperties: Map<string, unknown> }).elementProperties ? Object.fromEntries((el.constructor as unknown as { elementProperties: Map<string, unknown> }).elementProperties) : {}));
    expect(names.filter((name) => /dismiss|closedby|closable|escape/i.test(name))).toEqual([]);
  });

  test('IMP-6: opened from a dialog it stacks above it, makes it inert and returns focus to the element inside it; an overlay opened while it is shown is above it and gives focus back; Escape closes only the topmost', async ({ page }) => {
    await mount(page, fx({ open: false }), {
      lead: '<tanrei-dialog id="under" headline="Room" open><button id="thumb" autofocus>Enlarge</button><tanrei-button slot="actions">Done</tanrei-button></tanrei-dialog><tanrei-dialog id="over" headline="Report this image?"><tanrei-button slot="actions">No</tanrei-button></tanrei-dialog>',
    });
    await page.evaluate(() => {
      const seen = ((window as unknown as { __cancelled: string[] }).__cancelled = [] as string[]);
      for (const dialog of document.querySelectorAll('tanrei-dialog')) dialog.addEventListener('cancel', () => seen.push(dialog.id));
    });
    await page.locator('#thumb').focus();
    await closing(page);
    await set(page, { open: true });
    await rest(page);
    expect((await look(page)).focus).toBe('stage');
    // Above the dialog: it is what is at any point of the window, and the dialog's button takes no focus — in WebKit
    // too, where the dialog below is made inert by the modal layer.
    expect(await page.evaluate(() => (document.querySelector<HTMLElement>('#thumb')!.focus(), document.activeElement?.id))).not.toBe('thumb');
    await part(page, '.stage').focus();
    expect(await page.evaluate(() => document.elementFromPoint(320, 320)?.localName)).toBe('tanrei-image-preview');
    // Another overlay opens from it: above, and Escape closes that one alone.
    await page.evaluate(() => ((document.querySelector('#over') as HTMLElement & { open: boolean }).open = true));
    await settled(page);
    await page.keyboard.press('Escape');
    await settled(page);
    expect(await page.evaluate(() => (window as unknown as { __cancelled: string[] }).__cancelled)).toEqual(['over']);
    expect(await events(page, 'close')).toEqual([]);
    const still = await look(page);
    expect(still.modal).toBe(true);
    expect(still.focus, 'it receives back the focus the overlay returns').toBe('stage');
    // Escape now closes the preview, and only it; focus is back inside the dialog under it.
    await page.keyboard.press('Escape');
    await settled(page);
    expect((await events(page, 'close')).map((event) => event.detail.reason)).toEqual(['escape']);
    expect(await page.evaluate(() => ({ under: (document.querySelector('#under') as HTMLElement & { open: boolean }).open, cancelled: (window as unknown as { __cancelled: string[] }).__cancelled, focus: document.activeElement?.id }))).toEqual({
      under: true,
      cancelled: ['over'],
      focus: 'thumb',
    });
  });

  test('IMP-7: the container is a modal dialog named by label; without a label it still opens and a debug build says so; it writes and reads no history entry and no address', async ({ page, browserName }) => {
    const seen = warnings(page);
    await mount(page, fx());
    const before = await page.evaluate(() => ({ length: history.length, href: location.href }));
    expect(await part(page, 'dialog').getAttribute('aria-label')).toBe('Photos of the room');
    if (browserName === 'chromium') {
      const dialog = (await tree(page)).find((node) => node.role === 'dialog');
      expect(dialog).toMatchObject({ name: 'Photos of the room', properties: { modal: true } });
    }
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('+');
    await closing(page);
    await page.keyboard.press('Escape');
    await settled(page);
    expect(await page.evaluate(() => ({ length: history.length, href: location.href }))).toEqual(before);
    expect(seen.filter((text) => text.includes('IMP-7'))).toEqual([]);
    await mount(page, fx({ label: '' }));
    expect((await look(page)).modal).toBe(true);
    expect(await part(page, 'dialog').getAttribute('aria-label')).toBeNull();
    expect(seen.some((text) => text.includes('IMP-7') && text.includes('label is empty'))).toBe(true);
  });
});

test.describe('the bar, the count and the controls', () => {
  test('IMP-8: the bar across the top is at least bar.height tall on bar.container.color, the count at its start and zoom out, zoom in and close at its end, bar.gap apart and bar.padding-inline from the sides, centred; each an icon-only small Button named by its label, 32 × 32 and alike, in the variant the token names (tonal in the default system) through the Button’s channel', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, fx({ index: 1 }));
    const bar = (await part(page, '.bar').boundingBox())!;
    expect(bar.x).toBe(0);
    expect(bar.y).toBe(0);
    expect(bar.width).toBe(WINDOW.width);
    near(bar.height, await px(page, T('bar-height')), 'the bar’s height');
    expect(await style(page, '.bar', 'background-color')).toBe(await resolveColor(page, T('bar-container-color')));
    const [count, out, into, close] = await Promise.all(['.count', 'tanrei-button.zoom-out', 'tanrei-button.zoom-in', 'tanrei-button.close'].map(async (selector) => (await part(page, selector).boundingBox())!));
    const gap = await px(page, T('bar-gap'));
    const inset = await px(page, T('bar-padding-inline'));
    near(count.x, inset, 'the count from the start edge');
    near(into.x - (out.x + out.width), gap, 'zoom out to zoom in');
    near(close.x - (into.x + into.width), gap, 'zoom in to close');
    near(WINDOW.width - (close.x + close.width), inset, 'close from the end edge');
    for (const box of [out, into, close]) near(centre(box).y, centre(bar).y, 'centred on the bar’s height');
    const drawn = await host(page).evaluate((el) =>
      ['zoom-out', 'zoom-in', 'close'].map((name) => {
        const button = el.shadowRoot!.querySelector<HTMLElement & { size: string; label: string }>(`tanrei-button.${name}`)!;
        const native = button.shadowRoot!.querySelector('button')!;
        return { size: button.size, own: button.getAttribute('variant'), given: native.dataset.hostVariant, name: native.getAttribute('aria-label'), glyph: button.querySelector('[slot="icon"]')!.textContent, text: button.textContent!.trim() };
      }),
    );
    expect(drawn).toEqual([
      { size: 'small', own: null, given: 'tonal', name: 'Zoom out', glyph: 'zoom_out', text: 'zoom_out' },
      { size: 'small', own: null, given: 'tonal', name: 'Zoom in', glyph: 'zoom_in', text: 'zoom_in' },
      { size: 'small', own: null, given: 'tonal', name: 'Close', glyph: 'close', text: 'close' },
    ]);
    // The three are alike: the small Button's 32 × 32 in the default system, each drawing the tonal container.
    const small = await px(page, '--tanrei-comp-button-container-height-small');
    expect(small).toBe(32);
    for (const box of [out, into, close]) expect([box.width, box.height]).toEqual([small, small]);
    // Zoom out is disabled at fit (IMP-13): the tonal variant's disabled container.
    const tonal = await resolveColor(page, '--tanrei-comp-button-tonal-container-color');
    const fill = (name: string) => control(page, name).evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('button')!).backgroundColor);
    for (const name of ['zoom-in', 'close'] as const) await expect.poll(() => fill(name), name).toBe(tonal);
    expect(await fill('zoom-out')).toBe(await resolveColor(page, '--tanrei-comp-button-tonal-disabled-container-color'));
    // The verify: a system that sets the variant to text.
    await override(page, { [T('bar-button-variant')]: 'text' });
    await settled(page);
    await expect.poll(() => control(page, 'close').evaluate((el) => el.shadowRoot!.querySelector('button')!.dataset.hostVariant)).toBe('text');
    const text = await resolveColor(page, '--tanrei-comp-button-text-container-color');
    await expect.poll(() => control(page, 'close').evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('button')!).backgroundColor)).toBe(text);
    expect(seen.filter((text) => text.includes('IMP-8'))).toEqual([]);
    // An empty name: the control is still drawn, and reported.
    await mount(page, fx({ closeLabel: '' }));
    expect((await control(page, 'close').boundingBox())!.width).toBeGreaterThan(0);
    expect(await missingWords(page)).toContain('closeLabel');
    expect(seen.some((text) => text.includes('IMP-8') && text.includes('close-label'))).toBe(true);
  });

  test('IMP-8: the presets keep the bare glyphs they inherited — m3-like, m3-expressive-like and cupertino give the bar’s three controls the text variant, at their own small Button size', async ({ page }) => {
    for (const system of ['m3-like', 'm3-expressive-like', 'cupertino'] as const) {
      await mount(page, fx({ index: 1 }), { system });
      const small = await px(page, '--tanrei-comp-button-container-height-small');
      const text = await resolveColor(page, '--tanrei-comp-button-text-container-color');
      for (const name of ['zoom-out', 'zoom-in', 'close'] as const) {
        await expect.poll(() => control(page, name).evaluate((el) => el.shadowRoot!.querySelector('button')!.dataset.hostVariant), `${system} ${name}`).toBe('text');
        expect(await control(page, name).evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('button')!).backgroundColor), `${system} ${name}`).toBe(text);
        expect((await control(page, name).boundingBox())!.height, `${system} ${name}`).toBeCloseTo(small, 1);
      }
    }
  });

  test('IMP-9: with two or more images the count is drawn at the bar’s start — countText with its two places filled in the digits of the product’s locale — in its role and color, wrapping and growing the bar, and takes no focus; one image draws none, and an empty countText draws none and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, fx({ index: 1 }));
    await expect(part(page, '.count')).toHaveText('2 of 3');
    expect(await style(page, '.count', 'color')).toBe(await resolveColor(page, T('count-color')));
    expect(await style(page, '.count', 'font-size')).toBe(`${await px(page, T('count-typescale-font-size'))}px`);
    near(Number.parseFloat(await style(page, '.count', 'padding-inline-start')), await px(page, T('count-padding-inline')), 'the count’s padding');
    expect(await part(page, '.count').evaluate((el: HTMLElement) => el.tabIndex)).toBe(-1);
    // The digits of the product's locale, and the product's own order of words.
    await mount(page, { ...fx({ index: 1, countText: '{count}枚中{position}枚目' }), content: '' });
    await expect(part(page, '.count')).toHaveText('3枚中2枚目');
    await host(page).evaluate((el) => el.setAttribute('lang', 'ar-EG'));
    await set(page, { countText: '{position} من {count}' });
    await expect(part(page, '.count')).toHaveText('٢ من ٣');
    expect(seen.filter((text) => text.includes('IMP-9')), 'three sentences that fit: nothing is reported').toEqual([]);
    // Another text between braces is drawn as it is written, and reported once.
    await set(page, { countText: '{position} / {count} {place}' });
    await expect(part(page, '.count')).toHaveText('٢ / ٣ {place}');
    await expect.poll(() => seen.filter((text) => text.includes('IMP-9') && text.includes('countText') && text.includes('{place}')).length).toBe(1);
    await set(page, { index: 0 });
    await expect(part(page, '.count')).toHaveText('١ / ٣ {place}');
    expect(seen.filter((text) => text.includes('IMP-9')), 'drawn again, reported no second time').toHaveLength(1);
    // A brace written twice is drawn as one brace, and reports nothing.
    await set(page, { index: 1, countText: '{{{position}}} {{count}}' });
    await expect(part(page, '.count')).toHaveText('{٢} {count}');
    expect(seen.filter((text) => text.includes('IMP-9'))).toHaveLength(1);
    // A brace that opens or closes nothing is drawn as it is written, and reported.
    await set(page, { countText: '{position} } {count}' });
    await expect(part(page, '.count')).toHaveText('٢ } ٣');
    await expect.poll(() => seen.filter((text) => text.includes('IMP-9') && text.includes('a brace that opens or closes nothing')).length).toBe(1);
    seen.length = 0;
    await set(page, { countText: '{position} من {count}' });
    // It wraps, and the bar grows.
    const short = (await part(page, '.bar').boundingBox())!.height;
    await set(page, { countText: 'The picture numbered {position} of the {count} pictures that were taken of the east bedroom in the morning, before the shutters were opened, from the door that leads to the landing, with the desk under the window and the bed against the north wall' });
    await settled(page);
    const grown = (await part(page, '.bar').boundingBox())!;
    expect(grown.height).toBeGreaterThan(short);
    expect(await part(page, '.count').evaluate((el) => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight), 'never cut').toBe(true);
    near((await look(page)).fit.y, grown.height, 'the fit area begins below the bar');
    // One image: none.
    await mount(page, fx({}, [LANDSCAPE]));
    await expect(part(page, '.count')).toHaveText('');
    expect(seen.filter((text) => text.includes('IMP-9'))).toEqual([]);
    // Two or more and no sentence: none, reported.
    await mount(page, fx({ countText: '' }));
    await expect(part(page, '.count')).toHaveText('');
    expect(await missingWords(page)).toContain('imageCountText');
    expect(seen.some((text) => text.includes('IMP-9') && text.includes('count-text'))).toBe(true);
  });

  test('IMP-10: with two or more images a previous control stands at the stage’s inline start and a next at its end, navigation.margin-inline from the sides and centred on the fit area: medium icon-only Buttons in the variant the token names, named by their labels; previous is disabled at the first image and next at the last; one image draws neither', async ({ page }) => {
    await mount(page, fx({ index: 1 }));
    const seen = await look(page);
    const [previous, next] = await Promise.all(['previous', 'next'].map(async (name) => (await control(page, name).boundingBox())!));
    const margin = await px(page, T('navigation-margin-inline'));
    near(previous.x, margin, 'previous from the start edge');
    near(WINDOW.width - (next.x + next.width), margin, 'next from the end edge');
    for (const box of [previous, next]) near(centre(box).y, centre(seen.fit).y, 'centred on the fit area');
    const drawn = (index: number) =>
      host(page).evaluate(
        (el, at) => {
          (el as HTMLElement & { index: number }).index = at;
          return (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete.then(() =>
            ['previous', 'next'].map((name) => {
              const button = el.shadowRoot!.querySelector<HTMLElement & { size: string; disabled: boolean }>(`tanrei-button.${name}`)!;
              const native = button.shadowRoot!.querySelector('button')!;
              return { size: button.size, given: native.dataset.hostVariant, name: native.getAttribute('aria-label'), glyph: button.querySelector('[slot="icon"]')!.textContent, disabled: button.disabled };
            }),
          );
        },
        index,
      );
    expect(await drawn(1)).toEqual([
      { size: 'medium', given: 'tonal', name: 'Previous image', glyph: 'chevron_left', disabled: false },
      { size: 'medium', given: 'tonal', name: 'Next image', glyph: 'chevron_right', disabled: false },
    ]);
    // The set does not go round.
    expect((await drawn(0)).map((button) => button.disabled)).toEqual([true, false]);
    expect((await drawn(2)).map((button) => button.disabled)).toEqual([false, true]);
    // The verify: a system that sets the variant to elevated.
    await override(page, { [T('navigation-button-variant')]: 'elevated' });
    await settled(page);
    await expect.poll(async () => (await drawn(1)).map((button) => button.given)).toEqual(['elevated', 'elevated']);
    await mount(page, fx({}, [LANDSCAPE]));
    await expect(control(page, 'previous')).toHaveCount(0);
    await expect(control(page, 'next')).toHaveCount(0);
  });
});

test.describe('the stage and the zoom', () => {
  test('IMP-11: the stage is the whole container; at zoom 1 the image is drawn whole, at the largest size that lies inside the fit area — below the bar, above the caption — with its proportions kept, centred, never above its own size, and never cropped, stretched or mirrored', async ({ page }) => {
    await mount(page, fx({}, [{ ...LANDSCAPE, props: { ...LANDSCAPE.props, caption: 'The east bedroom in the morning.' } }]));
    const seen = await look(page);
    expect(await part(page, '.stage').boundingBox()).toEqual({ x: 0, y: 0, ...WINDOW });
    const bar = (await part(page, '.bar').boundingBox())!;
    const caption = (await part(page, '.caption').boundingBox())!;
    near(seen.fit.y, bar.height, 'the fit area begins below the bar');
    near(seen.fit.y + seen.fit.height, caption.y, 'and ends above the caption');
    const drawn = seen.image!;
    near(drawn.width, WINDOW.width, 'as wide as the fit area');
    near(drawn.width / drawn.height, 1.6, 'its proportions', 0.01);
    near(centre(drawn).x, centre(seen.fit).x, 'centred across');
    near(centre(drawn).y, centre(seen.fit).y, 'centred down');
    expect(drawn.y).toBeGreaterThanOrEqual(seen.fit.y - 0.5);
    expect(drawn.y + drawn.height).toBeLessThanOrEqual(seen.fit.y + seen.fit.height + 0.5);
    const how = await part(page, SHOWN).evaluate((el: HTMLImageElement) => ({ fit: getComputedStyle(el).objectFit, transform: new DOMMatrixReadOnly(getComputedStyle(el).transform), natural: el.naturalWidth / el.naturalHeight, filter: getComputedStyle(el).filter }));
    expect(how.fit).toBe('fill');
    expect(how.transform.a).toBe(1);
    expect(how.transform.d).toBe(1);
    expect(how.transform.b).toBe(0);
    expect(how.filter).toBe('none');
    near(how.natural, 1.6, 'the picture’s own proportions', 0.01);
    // A portrait is as high as the fit area.
    await mount(page, fx({}, [PORTRAIT]));
    const tall = await look(page);
    near(tall.image!.height, tall.fit.height, 'as high as the fit area');
    near(tall.image!.width / tall.image!.height, 1000 / 1500, 'its proportions', 0.01);
    // Never above its own size.
    await mount(page, fixtureOf('small-image'));
    const small = await look(page);
    expect([small.image!.width, small.image!.height]).toEqual([96, 96]);
    near(centre(small.image!).y, centre(small.fit).y, 'centred');
  });

  test('IMP-12: the zoom steps are 1, then the greater of 2 and the fill zoom, then each twice the one before, the greatest value — maxZoom, or the greater of 4 and twice the fill zoom — the last; a zoom set outside 1 and the greatest takes the nearer and a maxZoom below 1 is taken as none, each reported', async ({ page }) => {
    const seen = warnings(page);
    const steps = async () => {
      const zooms = [(await look(page)).zoom];
      for (let press = 0; press < 6; press++) {
        await page.keyboard.press('+');
        await rest(page);
        const { zoom } = await look(page);
        if (zoom === zooms[zooms.length - 1]) break;
        zooms.push(zoom);
      }
      return zooms;
    };
    // An ordinary picture: 1, 2, 4.
    await mount(page, fx({}, [LANDSCAPE]));
    expect(await steps()).toEqual([1, 2, 4]);
    // A page-long picture, small at fit: its first step fills the fit area across, and the greatest is twice that.
    await mount(page, fixtureOf('tall-image'));
    const fit = await look(page);
    const fill = fit.fit.width / fit.image!.width;
    expect(fill).toBeGreaterThan(4);
    const tall = await steps();
    expect(tall.length).toBe(3);
    near(tall[1], fill, 'the first step is the fill zoom', 0.01);
    near(tall[2], 2 * fill, 'the greatest is twice the fill zoom', 0.01);
    await page.keyboard.press('0');
    await page.keyboard.press('+');
    await rest(page);
    near((await look(page)).image!.width, fit.fit.width, 'the first step fills the width');
    // maxZoom is the last step.
    await mount(page, fx({ maxZoom: 3 }, [LANDSCAPE]));
    expect(await steps()).toEqual([1, 2, 3]);
    expect(seen.filter((text) => text.includes('IMP-12'))).toEqual([]);
    // Outside the range: the nearer, reported.
    await set(page, { zoom: 9 });
    await rest(page);
    near((await look(page)).image!.width, 3 * WINDOW.width, 'drawn at the greatest zoom');
    expect(seen.some((text) => text.includes('IMP-12') && text.includes('zoom is 9'))).toBe(true);
    await set(page, { zoom: 0.2 });
    await rest(page);
    near((await look(page)).image!.width, WINDOW.width, 'drawn at fit');
    // A maxZoom below 1 is taken as none.
    await set(page, { maxZoom: 0.5, zoom: 1 });
    await rest(page);
    expect(await steps()).toEqual([1, 2, 4]);
    expect(seen.some((text) => text.includes('IMP-12') && text.includes('max-zoom is 0.5'))).toBe(true);
  });

  test('IMP-13: the zoom-in control and + or = move the zoom one step up, the zoom-out control and − one step down and 0 to 1, about the centre of the fit area over the zoom motion; zoom out is disabled at 1, zoom in at the greatest zoom and while the image has not loaded or has failed', async ({ page }) => {
    await mount(page, fx({}, [LANDSCAPE]));
    const disabled = () => Promise.all(['zoom-out', 'zoom-in'].map((name) => control(page, name).evaluate((el: HTMLElement & { disabled: boolean }) => el.disabled)));
    expect(await disabled()).toEqual([true, false]);
    await watchRuns(page);
    await control(page, 'zoom-in').click();
    await expect.poll(() => begun(page, SHOWN)).toEqual([{ property: 'transform', duration: await ms(page, T('motion-zoom-duration')) }]);
    expect(await style(page, SHOWN, 'transition-timing-function')).toBe(await page.evaluate((name) => {
      const probe = document.createElement('div');
      probe.style.transitionTimingFunction = `var(${name})`;
      document.body.append(probe);
      const value = getComputedStyle(probe).transitionTimingFunction;
      probe.remove();
      return value;
    }, T('motion-zoom-easing')));
    await rest(page);
    let seen = await look(page);
    expect(seen.zoom).toBe(2);
    near(seen.image!.width, 2 * WINDOW.width, 'twice its fit');
    near(centre(seen.image!).x, centre(seen.fit).x, 'about the centre');
    expect(await disabled()).toEqual([false, false]);
    // The point of the image at the centre of the fit area stays there: move it first.
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await rest(page);
    const before = await look(page);
    const point = { x: (centre(before.fit).x - before.image!.x) / before.image!.width, y: (centre(before.fit).y - before.image!.y) / before.image!.height };
    await page.keyboard.press('=');
    await rest(page);
    seen = await look(page);
    expect(seen.zoom).toBe(4);
    near(seen.image!.x + point.x * seen.image!.width, centre(seen.fit).x, 'the same point across');
    near(seen.image!.y + point.y * seen.image!.height, centre(seen.fit).y, 'the same point down');
    expect(await disabled()).toEqual([false, true]);
    await control(page, 'zoom-out').click();
    await rest(page);
    expect((await look(page)).zoom).toBe(2);
    await page.keyboard.press('-');
    await rest(page);
    expect((await look(page)).zoom).toBe(1);
    await page.keyboard.press('+');
    await page.keyboard.press('+');
    await page.keyboard.press('0');
    await rest(page);
    seen = await look(page);
    expect(seen.zoom).toBe(1);
    near(seen.image!.width, WINDOW.width, 'back at fit');
    expect((await events(page, 'zoomchange')).map((event) => event.detail.zoom)).toEqual([2, 4, 2, 1, 2, 4, 1]);
    // Not loaded, and failed: zoom in is disabled.
    await mount(page, fixtureOf('loading'), { loaded: false });
    expect(await disabled()).toEqual([true, true]);
    await mount(page, fixtureOf('error'));
    expect(await disabled()).toEqual([true, true]);
  });

  test('IMP-14: two presses of a mouse on the stage within the interval enlarge the image from fit to its first step with the point under the pointer kept under it, and from any zoom return it to fit, over the zoom motion; the two presses are not also single presses', async ({ page }) => {
    await mount(page, fx({}, [LANDSCAPE]));
    const fit = await look(page);
    const at = { x: fit.image!.x + fit.image!.width * 0.25, y: fit.image!.y + fit.image!.height * 0.3 };
    await watchRuns(page);
    await doublePress(page, at);
    await expect.poll(async () => (await begun(page, SHOWN)).map((transition) => transition.property)).toEqual(['transform']);
    await rest(page);
    let seen = await look(page);
    expect(seen.zoom).toBe(2);
    near(seen.image!.x + seen.image!.width * 0.25, at.x, 'the point under the pointer, across');
    near(seen.image!.y + seen.image!.height * 0.3, at.y, 'the point under the pointer, down');
    await doublePress(page, at);
    await rest(page);
    seen = await look(page);
    expect(seen.zoom).toBe(1);
    near(seen.image!.width, WINDOW.width, 'back at fit');
    // Each pair's interval ran out on the clock (`doublePress`): a single press would have answered.
    expect(await events(page, 'controlshiddenchange'), 'neither pair answered as a single press').toEqual([]);
    expect((await look(page)).hidden).toBe(false);
  });

  test('IMP-14: two taps of a finger do the same — the point under the tap stays under it as far as the limits allow — and a tap that is followed by another is no single tap', async ({ page }) => {
    await mount(page, fx({}, [PORTRAIT]));
    const fit = await look(page);
    const at = { x: fit.image!.x + fit.image!.width * 0.6, y: fit.image!.y + fit.image!.height * 0.6 };
    // The two taps in one turn of the page: the preview counts the interval between them from the events' own times,
    // and two answers from a slow machine can take longer than it — the pair would be two single taps.
    const tapTwice = (x: number, y: number) =>
      host(page).evaluate(
        (el, [px_, py]) => {
          const stage = el.shadowRoot!.querySelector('.stage')!;
          for (const type of ['pointerdown', 'pointerup', 'pointerdown', 'pointerup'])
            stage.dispatchEvent(new PointerEvent(type, { pointerId: 11, pointerType: 'touch', clientX: px_, clientY: py, bubbles: true, composed: true, cancelable: true, isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
        },
        [x, y] as const,
      );
    await tapTwice(at.x, at.y);
    await rest(page);
    const seen = await look(page);
    expect(seen.zoom).toBe(2);
    near(seen.image!.x + seen.image!.width * 0.6, at.x, 'the point under the tap, across', 1.5);
    near(seen.image!.y + seen.image!.height * 0.6, at.y, 'the point under the tap, down', 1.5);
    // A tap at a corner is held to the limits (IMP-17).
    await tapTwice(at.x, at.y);
    await rest(page);
    expect((await look(page)).zoom).toBe(1);
    await page.waitForTimeout(400);
    const corner = { x: fit.image!.x + 2, y: fit.image!.y + 2 };
    await tapTwice(corner.x, corner.y);
    await rest(page);
    const held = await look(page);
    expect(held.zoom).toBe(2);
    near(held.image!.x, held.fit.x, 'the image’s left edge at the fit area’s, and no farther');
    await page.waitForTimeout(400);
    expect(await events(page, 'controlshiddenchange')).toEqual([]);
  });

  test('IMP-15: a wheel turned with Ctrl — which is also how a trackpad pinch arrives — changes the zoom with the gesture, without a motion of its own, about the point under the pointer, never below 1 nor above the greatest value; when it ends the zoom stays where it is', async ({ page }) => {
    await mount(page, fx({}, [LANDSCAPE]));
    const fit = await look(page);
    const at = { x: fit.image!.x + fit.image!.width * 0.75, y: fit.image!.y + fit.image!.height * 0.45 };
    expect(await wheel(page, at.x, at.y, { deltaY: -45, ctrlKey: true }), 'the browser’s own zoom of the page does not take it').toBe(true);
    expect(await running(page, SHOWN), 'it follows the gesture: no motion of its own').toEqual([]);
    let seen = await look(page);
    const zoom = seen.image!.width / WINDOW.width;
    near(zoom, Math.exp(0.45), 'the zoom follows the wheel', 0.01);
    near(seen.image!.x + seen.image!.width * 0.75, at.x, 'about the pointer, across');
    near(seen.image!.y + seen.image!.height * 0.45, at.y, 'about the pointer, down');
    // Command is the same.
    await wheel(page, at.x, at.y, { deltaY: -10, metaKey: true });
    expect((await look(page)).image!.width).toBeGreaterThan(seen.image!.width);
    // The element's zoom is written once the gesture has ended — and not at a step.
    expect((await look(page)).zoom).toBe(1);
    expect(await events(page, 'zoomchange')).toEqual([]);
    await expect.poll(async () => (await look(page)).zoom).toBeGreaterThan(1.5);
    seen = await look(page);
    near(seen.zoom, Math.exp(0.55), 'where the wheel left it', 0.01);
    expect(await events(page, 'zoomchange')).toEqual([{ type: 'zoomchange', detail: { zoom: seen.zoom } }]);
    // Never above the greatest value, never below 1.
    for (let turn = 0; turn < 6; turn++) await wheel(page, at.x, at.y, { deltaY: -100, ctrlKey: true });
    near((await look(page)).image!.width, 4 * WINDOW.width, 'the greatest zoom');
    for (let turn = 0; turn < 8; turn++) await wheel(page, at.x, at.y, { deltaY: 100, ctrlKey: true });
    seen = await look(page);
    near(seen.image!.width, WINDOW.width, 'never below fit');
    near(centre(seen.image!).y, centre(seen.fit).y, 'and centred again');
  });

  test('IMP-15: two fingers that move apart enlarge the image about the point midway between them, two that move together move it as well, and when they are lifted the zoom stays where it is — not at a step', async ({ page }) => {
    await mount(page, fx({}, [LANDSCAPE]));
    const fit = await look(page);
    const mid = centre(fit.image!);
    await finger(page, 'pointerdown', mid.x - 50, mid.y, { id: 1 });
    await finger(page, 'pointerdown', mid.x + 50, mid.y, { id: 2 });
    await finger(page, 'pointermove', mid.x - 80, mid.y, { id: 1 });
    await finger(page, 'pointermove', mid.x + 80, mid.y, { id: 2 });
    let seen = await look(page);
    near(seen.image!.width, 1.6 * WINDOW.width, 'the zoom is the ratio of the distances');
    near(centre(seen.image!).x, mid.x, 'about the point midway');
    expect(await running(page, SHOWN)).toEqual([]);
    // Together: the image moves with them (as far as IMP-17 allows: it is wider than the fit area now, and no higher).
    await finger(page, 'pointermove', mid.x - 80 + 40, mid.y, { id: 1 });
    await finger(page, 'pointermove', mid.x + 80 + 40, mid.y, { id: 2 });
    seen = await look(page);
    near(centre(seen.image!).x, mid.x + 40, 'moved with the fingers');
    near(seen.image!.width, 1.6 * WINDOW.width, 'at the same zoom');
    expect(await events(page, 'zoomchange'), 'not for each frame').toEqual([]);
    await finger(page, 'pointerup', mid.x - 40, mid.y, { id: 1 });
    await finger(page, 'pointerup', mid.x + 120, mid.y, { id: 2 });
    await settled(page);
    seen = await look(page);
    near(seen.zoom, 1.6, 'it stays where the fingers left it', 0.01);
    expect((await events(page, 'zoomchange')).length).toBe(1);
    // A pinch below fit stops at 1.
    await finger(page, 'pointerdown', mid.x - 100, mid.y, { id: 1 });
    await finger(page, 'pointerdown', mid.x + 100, mid.y, { id: 2 });
    await finger(page, 'pointermove', mid.x - 10, mid.y, { id: 1 });
    await finger(page, 'pointermove', mid.x + 10, mid.y, { id: 2 });
    near((await look(page)).image!.width, WINDOW.width, 'never below fit');
    await finger(page, 'pointerup', mid.x - 10, mid.y, { id: 1 });
    await finger(page, 'pointerup', mid.x + 10, mid.y, { id: 2 });
    await settled(page);
    expect((await look(page)).zoom).toBe(1);
  });

  test('IMP-15: a trackpad pinch that a browser tells as a gesture of its own — its scale from 1 — changes the zoom about the pointer, and ends as any other', async ({ page }) => {
    await mount(page, fx({}, [LANDSCAPE]));
    const fit = await look(page);
    const at = centre(fit.image!);
    const tell = (type: string, scale: number) =>
      host(page).evaluate(
        (el, [t, s, x, y]) => {
          const event = Object.assign(new Event(t as string, { bubbles: true, cancelable: true }), { scale: s, clientX: x, clientY: y });
          el.shadowRoot!.querySelector('.stage')!.dispatchEvent(event);
          return event.defaultPrevented;
        },
        [type, scale, at.x, at.y] as const,
      );
    expect(await tell('gesturestart', 1)).toBe(true);
    await tell('gesturechange', 1.5);
    await tell('gesturechange', 2.5);
    near((await look(page)).image!.width, 2.5 * WINDOW.width, 'the zoom is the scale');
    expect((await look(page)).zoom).toBe(1);
    await tell('gestureend', 2.5);
    await settled(page);
    expect((await look(page)).zoom).toBe(2.5);
    expect((await events(page, 'zoomchange')).map((event) => event.detail.zoom)).toEqual([2.5]);
  });

  test('IMP-15: real touches in Chromium — two fingers on the stage pinch the image, and the browser’s own pinch does not zoom the page (touch-action: none)', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'real touches are sent over the DevTools protocol');
    await mount(page, fx({}, [LANDSCAPE]));
    expect(await style(page, '.stage', 'touch-action')).toBe('none');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', points: [number, number][]) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], id) => ({ x, y, id })) });
    await touch('touchStart', [[270, 340], [370, 340]]);
    for (let step = 1; step <= 5; step++) await touch('touchMove', [[270 - step * 10, 340], [370 + step * 10, 340]]);
    const during = await look(page);
    expect(during.image!.width, 'the image follows the two fingers').toBeGreaterThan(1.5 * WINDOW.width);
    await touch('touchEnd', []);
    await settled(page);
    const seen = await look(page);
    near(seen.zoom, 2, 'the ratio of the distances', 0.1);
    expect(await page.evaluate(() => window.visualViewport!.scale), 'the page itself was not zoomed').toBe(1);
    await cdp.detach();
  });

  test('IMP-16: enlarged, a drag with a mouse’s main button past the slop moves the image with the pointer, and a fling goes on and slows; a wheel moves it up and down and, turned sideways or with Shift, sideways; at fit a wheel does nothing', async ({ page }) => {
    await mount(page, fx({ index: 1, zoom: 2 }));
    const from = (await look(page)).image!;
    // Within the slop nothing moves.
    await page.mouse.move(320, 340);
    await page.mouse.down();
    await page.mouse.move(324, 343);
    expect((await look(page)).image!.x).toBe(from.x);
    await page.mouse.move(360, 380, { steps: 4 });
    await page.mouse.move(380, 400, { steps: 4 });
    let seen = await look(page);
    near(seen.image!.x - from.x, 60, 'with the pointer, across');
    near(seen.image!.y - from.y, 60, 'with the pointer, down');
    await releaseAtRest(page);
    await page.waitForTimeout(120);
    near((await look(page)).image!.y - from.y, 60, 'released at rest it stays');
    expect((await look(page)).index, 'a drag over an enlarged image is not the pager’s').toBe(1);
    // Another button moves nothing.
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(300, 300, { steps: 3 });
    await page.mouse.up({ button: 'right' });
    near((await look(page)).image!.y - from.y, 60, 'the main button only');
    // A fling: released while moving, it goes on and slows to a stop.
    await drag(page, [320, 500], [320, 380], { steps: 6, every: 10, hold: 0, pointerType: 'mouse' });
    const released = (await look(page)).image!.y;
    await expect.poll(async () => (await look(page)).image!.y).toBeLessThan(released - 5);
    await stopped(page);
    expect((await look(page)).image!.y, 'it went on after the release').toBeLessThan(released - 5);
    // A wheel.
    await page.keyboard.press('0');
    await page.keyboard.press('+');
    await rest(page);
    seen = await look(page);
    expect(await wheel(page, 320, 340, { deltaY: 30 })).toBe(true);
    near((await look(page)).image!.y, seen.image!.y - 30, 'a wheel moves it up and down');
    await wheel(page, 320, 340, { deltaX: -20 });
    near((await look(page)).image!.x, seen.image!.x + 20, 'a sideways wheel sideways');
    await wheel(page, 320, 340, { deltaY: 20, shiftKey: true });
    near((await look(page)).image!.x, seen.image!.x, 'and Shift turns a wheel sideways');
    // At fit a wheel does nothing, and is left to the browser.
    await mount(page, fx({ index: 1 }));
    const fit = (await look(page)).image!;
    expect(await wheel(page, 320, 340, { deltaY: 80 })).toBe(false);
    expect(await wheel(page, 320, 340, { deltaX: 80 })).toBe(false);
    expect((await look(page)).image).toEqual(fit);
    expect((await look(page)).index).toBe(1);
  });

  test('IMP-17: each edge of an enlarged image can be brought to the matching edge of the fit area and no farther, an image no larger than the fit area along an axis stays centred along it, and a zoom that would leave it outside its limits brings it inside as part of the same motion', async ({ page }) => {
    await mount(page, fx({ zoom: 2 }, [{ ...LANDSCAPE, props: { ...LANDSCAPE.props, caption: 'The east bedroom in the morning.' } }]));
    const fit = (await look(page)).fit;
    // Far to the right and down: its left and top edges stop at the fit area's.
    await drag(page, [100, 200], [600, 620], { pointerType: 'mouse' });
    let seen = (await look(page)).image!;
    near(seen.x, fit.x, 'the left edge at the fit area’s');
    near(seen.y, fit.y, 'the top edge at the fit area’s: no part stays under the bar');
    await drag(page, [600, 500], [20, 80], { pointerType: 'mouse' });
    await drag(page, [600, 500], [20, 80], { pointerType: 'mouse' });
    seen = (await look(page)).image!;
    near(seen.x + seen.width, fit.x + fit.width, 'the right edge at the fit area’s');
    near(seen.y + seen.height, fit.y + fit.height, 'the bottom edge at the fit area’s: no part stays under the caption');
    // From that corner, one step down returns to fit: inside its limits when the motion ends.
    await page.keyboard.press('-');
    await rest(page);
    seen = (await look(page)).image!;
    near(centre(seen).x, centre(fit).x, 'centred across');
    near(centre(seen).y, centre(fit).y, 'centred down');
    // Wider than the fit area and no higher: it moves across, and stays centred down.
    await wheel(page, 320, 300, { deltaY: -18, ctrlKey: true });
    seen = (await look(page)).image!;
    expect(seen.width).toBeGreaterThan(fit.width);
    expect(seen.height).toBeLessThan(fit.height);
    await drag(page, [200, 200], [500, 500], { pointerType: 'mouse' });
    seen = (await look(page)).image!;
    near(seen.x, fit.x, 'moved across to its limit');
    near(centre(seen).y, centre(fit).y, 'still centred down');
  });
});

test.describe('moving between images', () => {
  test('IMP-18: at fit a sideways drag with a mouse moves the image with the pointer, its neighbour following layout.page-gap away; released past half the stage it shows the neighbour, and sooner it comes back, over the page motion; where there is no neighbour it follows by a part only and comes back', async ({ page }) => {
    await mount(page, fx({ index: 1 }));
    const from = await look(page);
    const gap = await px(page, T('layout-page-gap'));
    near(from.after!.x - (from.page!.x + from.page!.width), gap, 'the next page lies page-gap after');
    near(from.page!.x - (from.before!.x + from.before!.width), gap, 'the previous page lies page-gap before');
    await page.mouse.move(400, 340);
    await page.mouse.down();
    await page.mouse.move(300, 345, { steps: 5 });
    let seen = await look(page);
    near(seen.image!.x - from.image!.x, -100, 'the image moves with the pointer');
    near(seen.after!.x - (seen.page!.x + seen.page!.width), gap, 'its neighbour follows');
    near(seen.image!.y, from.image!.y, 'sideways only');
    await page.waitForTimeout(160);
    await watchRuns(page);
    await page.mouse.up();
    // Released sooner than half: it comes back over the page motion.
    await expect.poll(() => begun(page, '.page[style="--_at: 0"]')).toEqual([{ property: 'translate', duration: await ms(page, T('motion-page-duration')) }]);
    await rest(page);
    seen = await look(page);
    expect(seen.index).toBe(1);
    near(seen.image!.x, from.image!.x, 'back where it was');
    expect(await events(page, 'indexchange')).toEqual([]);
    // Past half the stage's width.
    await page.mouse.move(520, 340);
    await page.mouse.down();
    await page.mouse.move(180, 340, { steps: 6 });
    await page.waitForTimeout(160);
    await watchRuns(page);
    await page.mouse.up();
    await expect.poll(async () => (await begun(page, '.page[style="--_at: 0"]')).map((transition) => transition.property)).toEqual(['translate']);
    await rest(page);
    seen = await look(page);
    expect(seen.index).toBe(2);
    expect(await events(page, 'indexchange')).toEqual([{ type: 'indexchange', detail: { index: 2 } }]);
    // No neighbour on that side: it follows by a part, and comes back.
    await page.mouse.move(520, 340);
    await page.mouse.down();
    await page.mouse.move(120, 340, { steps: 6 });
    const pulled = await look(page);
    const moved = from.page!.x - pulled.page!.x;
    expect(moved).toBeGreaterThan(20);
    expect(moved, 'by less than the pointer went').toBeLessThan(200);
    await page.waitForTimeout(160);
    await page.mouse.up();
    await rest(page);
    seen = await look(page);
    expect(seen.index).toBe(2);
    near(seen.page!.x, 0, 'back');
    expect((await events(page, 'indexchange')).length).toBe(1);
    // A drag that begins more up or down than sideways is not the pager's.
    await page.mouse.move(400, 300);
    await page.mouse.down();
    await page.mouse.move(380, 400, { steps: 3 });
    await page.mouse.move(100, 420, { steps: 3 });
    expect((await look(page)).page!.x).toBe(0);
    await page.mouse.up();
  });

  test('IMP-18: a short drag that is flung toward a side shows that neighbour, by a finger and by a pen alike; one image has nothing to drag to', async ({ page }) => {
    await mount(page, fx({ index: 1 }));
    await drag(page, [420, 340], [340, 340], { steps: 4, every: 12, hold: 0 });
    await rest(page);
    expect((await look(page)).index, 'flung toward the start: the image after').toBe(2);
    await drag(page, [300, 340], [380, 340], { steps: 4, every: 12, hold: 0, pointerType: 'pen' });
    await rest(page);
    expect((await look(page)).index, 'flung toward the end: the image before').toBe(1);
    // The same distance, released at rest: it comes back.
    await drag(page, [420, 340], [340, 340], { steps: 4, every: 12, hold: 160 });
    await rest(page);
    expect((await look(page)).index).toBe(1);
    expect((await events(page, 'indexchange')).map((event) => event.detail.index)).toEqual([2, 1]);
    await mount(page, fx({}, [LANDSCAPE]));
    const from = await look(page);
    await drag(page, [420, 340], [200, 340], { release: false });
    expect((await look(page)).image).toEqual(from.image);
    await finger(page, 'pointerup', 200, 340);
  });

  test('IMP-18, IMP-16: a fast stroke by a finger that holds still for more than 40 ms before its release is no fling — at fit the image comes back, enlarged it stays where it was left — and the same stroke released within 40 ms of its last move is one', async ({ page }) => {
    await mount(page, fx({ index: 1 }));
    const stage = part(page, '.stage');
    // At fit: 30 px toward the start at 2.5 px per ms, far short of half the stage (320): only a fling turns the page.
    const from = { x: 420, y: 340 };
    const moves = strokes(from, { x: -10, y: 0 });
    await flingThenHold(page, stage, { from, moves, hold: STOPPED_AFTER + 1 });
    await rest(page);
    expect((await look(page)).index, 'held still: it comes back').toBe(1);
    await flingThenHold(page, stage, { from, moves, hold: STOPPED_AFTER });
    await rest(page);
    expect((await look(page)).index, 'released within 40 ms: flung to the image after').toBe(2);
    expect((await events(page, 'indexchange')).map((event) => event.detail.index)).toEqual([2]);
    // Enlarged: a pan held still stays where the release left it; released within 40 ms it goes on. The fling runs by
    // frames of the page clock, which the test holds and moves on.
    await set(page, { zoom: 2 });
    await rest(page);
    const up = { x: 320, y: 500 };
    const climb = strokes(up, { x: 0, y: -10 });
    await flingThenHold(page, stage, { from: up, moves: climb, hold: STOPPED_AFTER + 1, keepClock: true });
    const left = (await look(page)).image!.y;
    await page.clock.runFor(200);
    expect((await look(page)).image!.y, 'held still: no fling goes on').toBe(left);
    await releaseClock(page);
    await flingThenHold(page, stage, { from: up, moves: climb, hold: STOPPED_AFTER, keepClock: true });
    const flung = (await look(page)).image!.y;
    await page.clock.runFor(200);
    expect((await look(page)).image!.y, 'released within 40 ms: the fling goes on').toBeLessThan(flung - 5);
    await releaseClock(page);
  });

  test('IMP-18: at fit a short stroke by a mouse released while it is moving, however fast, comes back and shows no neighbour — a mouse turns the page by its distance alone — where the same stroke by a finger turns it', async ({ page }) => {
    await mount(page, fx({ index: 1 }));
    const from = await look(page);
    // 80 px in 48 ms and 150 px in 60 ms: each faster than 0.5 px per ms, each far short of half the stage (320).
    for (const [length, toward] of [[80, -1], [150, -1], [80, 1], [150, 1]] as const) {
      await drag(page, [320 - (toward * length) / 2, 340], [320 + (toward * length) / 2, 340], { steps: 4, every: length === 80 ? 12 : 15, hold: 0, pointerType: 'mouse' });
      await rest(page);
      const seen = await look(page);
      expect(seen.index, `a mouse, ${length} px ${toward < 0 ? 'toward the start' : 'toward the end'}`).toBe(1);
      near(seen.image!.x, from.image!.x, 'back where it was');
    }
    expect(await events(page, 'indexchange')).toEqual([]);
    // The same stroke by a finger is a fling, and turns the page.
    await drag(page, [360, 340], [280, 340], { steps: 4, every: 12, hold: 0 });
    await rest(page);
    expect((await look(page)).index).toBe(2);
    expect(await events(page, 'indexchange')).toEqual([{ type: 'indexchange', detail: { index: 2 } }]);
  });

  test('IMP-19: enlarged, a sideways drag that begins while the image already stands at its limit on that side is the pager’s and moves to the neighbour without returning to fit first; a drag that reaches the limit while it is under way stops the image there and changes no image', async ({ page }) => {
    await mount(page, fx({ index: 1, zoom: 2 }));
    const fit = (await look(page)).fit;
    // One drag from the middle, far past the limit: the image stops there, and the image shown is the same.
    await page.mouse.move(500, 340);
    await page.mouse.down();
    await page.mouse.move(60, 340, { steps: 8 });
    let seen = await look(page);
    near(seen.image!.x + seen.image!.width, fit.x + fit.width, 'its right edge stopped at the fit area’s');
    expect(seen.page!.x, 'the page did not move').toBe(0);
    await page.waitForTimeout(160);
    await page.mouse.up();
    await rest(page);
    seen = await look(page);
    expect(seen.index).toBe(1);
    expect(seen.zoom).toBe(2);
    expect(await events(page, 'indexchange')).toEqual([]);
    // A new drag the same way, begun at the limit: the pager's.
    await page.mouse.move(520, 340);
    await page.mouse.down();
    await page.mouse.move(420, 340, { steps: 4 });
    seen = await look(page);
    near(seen.page!.x, -100, 'the page follows the pointer');
    near(seen.image!.width, 2 * (await look(page)).fit.height * (1000 / 1500), 'still enlarged: it did not return to fit first', 2);
    await page.mouse.move(150, 340, { steps: 4 });
    await page.waitForTimeout(160);
    await page.mouse.up();
    await rest(page);
    seen = await look(page);
    expect(seen.index).toBe(2);
    expect(seen.zoom, 'the zoom belongs to the image that was left').toBe(1);
    expect((await events(page)).map((event) => [event.type, event.detail])).toEqual([
      ['indexchange', { index: 2 }],
      ['zoomchange', { zoom: 1 }],
    ]);
    // Away from the limit the same drag is the image's: back one image, enlarged, a drag toward the side it is not at.
    await set(page, { index: 1 });
    await set(page, { zoom: 2 });
    await rest(page);
    await page.mouse.move(300, 340);
    await page.mouse.down();
    await page.mouse.move(200, 340, { steps: 4 });
    seen = await look(page);
    expect(seen.page!.x).toBe(0);
    await page.mouse.up();
  });

  test('IMP-19: enlarged and at its limit, a second stroke by a mouse that is short and released while moving comes back with the zoom kept, whatever its speed; a mouse’s stroke past half the stage, counted from where it began, turns the page though released while moving; a finger’s and a pen’s short flung stroke from the limit turns it', async ({ page }) => {
    await mount(page, fx({ index: 1, zoom: 2 }));
    const fit = (await look(page)).fit;
    /** One stroke of a mouse from the middle, far past the limit and released at rest: the image stands at its limit on the end side. */
    const toTheLimit = async () => {
      await drag(page, [500, 340], [60, 340], { steps: 8, hold: 160, pointerType: 'mouse' });
      await rest(page);
      const seen = await look(page);
      near(seen.image!.x + seen.image!.width, fit.x + fit.width, 'its end edge stands at the fit area’s');
      return seen;
    };
    const at = await toTheLimit();
    expect(at.zoom).toBe(2);
    expect(await events(page)).toEqual([]);
    // Four strokes that a fling's rule would turn the page for (0.5 px per ms and faster), each released while moving,
    // none as long as half the stage (320).
    for (const [length, time] of [[40, 60], [80, 150], [150, 150], [300, 300]] as const) {
      const steps = Math.round(time / 15);
      await drag(page, [540, 340], [540 - length, 340], { steps, every: time / steps, hold: 0, pointerType: 'mouse' });
      await rest(page);
      const seen = await look(page);
      expect(seen.index, `${length} px in ${time} ms`).toBe(1);
      expect(seen.zoom, `${length} px in ${time} ms: the zoom is kept`).toBe(2);
      near(seen.image!.x, at.image!.x, `${length} px in ${time} ms: back at its limit`);
      expect(seen.page!.x, 'the page is back').toBe(0);
    }
    expect(await events(page), 'no indexchange and no zoomchange').toEqual([]);
    // Past half the stage, released while moving: the distance turns the page.
    await drag(page, [560, 340], [160, 340], { steps: 8, every: 15, hold: 0, pointerType: 'mouse' });
    await rest(page);
    let seen = await look(page);
    expect(seen.index).toBe(2);
    expect(seen.zoom).toBe(1);
    expect((await events(page)).map((event) => [event.type, event.detail])).toEqual([
      ['indexchange', { index: 2 }],
      ['zoomchange', { zoom: 1 }],
    ]);
    // A finger's short flung stroke from the limit, and a pen's, turn the page as they did.
    for (const pointerType of ['touch', 'pen']) {
      await set(page, { index: 1 });
      await set(page, { zoom: 2 });
      await rest(page);
      await toTheLimit();
      await record(page);
      await drag(page, [420, 340], [340, 340], { steps: 4, every: 12, hold: 0, pointerType });
      await rest(page);
      seen = await look(page);
      expect(seen.index, `flung by ${pointerType}`).toBe(2);
      expect(seen.zoom).toBe(1);
      expect((await events(page)).map((event) => [event.type, event.detail]), pointerType).toEqual([
        ['indexchange', { index: 2 }],
        ['zoomchange', { zoom: 1 }],
      ]);
    }
  });

  test('IMP-20: the next and previous controls show the image after or before — the one arriving sliding in as the one leaving slides out, page-gap apart, over the page motion — set index and fire indexchange once; a change of image returns the zoom to 1 and fires zoomchange where it was not 1; an index the product sets is shown at once, without a slide and without indexchange, and one outside the images is the nearest, reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, fx({ index: 0 }));
    await watchRuns(page);
    // Each page's slide is held half way through its time as the engine announces it: the two pages are then read on
    // their way however long the reading takes, and the slides are ended by hand.
    await host(page).evaluate((el) => {
      const held: Animation[] = ((window as unknown as { held: Animation[] }).held = []);
      const stop = new AbortController();
      (window as unknown as { letGo: () => void }).letGo = () => {
        stop.abort();
        for (const animation of held) animation.finish();
      };
      el.shadowRoot!.addEventListener(
        'transitionrun',
        (event) => {
          const target = event.target as Element;
          if ((event as TransitionEvent).propertyName !== 'translate' || !target.matches('.page')) return;
          for (const animation of target.getAnimations()) {
            if (!(animation instanceof CSSTransition) || animation.transitionProperty !== 'translate') continue;
            animation.pause();
            animation.currentTime = Number(animation.effect!.getComputedTiming().endTime) / 2;
            held.push(animation);
          }
        },
        { signal: stop.signal },
      );
    });
    await control(page, 'next').click();
    await expect.poll(() => begun(page, '.page[style="--_at: 0"]')).toEqual([{ property: 'translate', duration: await ms(page, T('motion-page-duration')) }]);
    expect(await page.evaluate(() => (window as unknown as { held?: Animation[] }).held?.length ?? 0), 'the pages’ slides, held').toBeGreaterThan(1);
    const during = await look(page);
    const gap = await px(page, T('layout-page-gap'));
    expect(during.page!.x, 'the one arriving comes from its side').toBeGreaterThan(0);
    near(during.page!.x - (during.before!.x + during.before!.width), gap, 'page-gap apart while they slide', 1.5);
    await page.evaluate(() => (window as unknown as { letGo: () => void }).letGo());
    await rest(page);
    expect((await look(page)).index).toBe(1);
    expect(await events(page)).toEqual([{ type: 'indexchange', detail: { index: 1 } }]);
    // Enlarged, then on: the zoom returns to 1 and says so.
    await page.keyboard.press('+');
    await rest(page);
    await control(page, 'next').click();
    await rest(page);
    let now = await look(page);
    expect([now.index, now.zoom]).toEqual([2, 1]);
    near(now.image!.width, now.fit.height, 'the square at its fit', 1);
    expect((await events(page)).slice(1)).toEqual([
      { type: 'zoomchange', detail: { zoom: 2 } },
      { type: 'indexchange', detail: { index: 2 } },
      { type: 'zoomchange', detail: { zoom: 1 } },
    ]);
    // The image that was left is at its fit again.
    await control(page, 'previous').click();
    await rest(page);
    now = await look(page);
    near(now.image!.height, now.fit.height, 'the portrait at its fit');
    // The product sets index: at once, no slide, no indexchange — and the zoom returns to 1 all the same.
    await page.keyboard.press('+');
    await rest(page);
    const before = (await events(page)).length;
    await set(page, { index: 0 });
    await settled(page);
    expect(await running(page, '.page[style="--_at: 0"]'), 'without the slide').toEqual([]);
    now = await look(page);
    expect([now.index, now.zoom]).toEqual([0, 1]);
    near(now.page!.x, 0, 'shown at once');
    expect((await events(page)).slice(before)).toEqual([{ type: 'zoomchange', detail: { zoom: 1 } }]);
    // Outside the images: the nearest, reported.
    await set(page, { index: 7 });
    await settled(page);
    expect(await part(page, '.stage').getAttribute('aria-label')).toBe(SQUARE.props.alt);
    expect(seen.some((text) => text.includes('IMP-20') && text.includes('index is 7'))).toBe(true);
    await set(page, { index: -3 });
    await settled(page);
    expect(await part(page, '.stage').getAttribute('aria-label')).toBe(LANDSCAPE.props.alt);
    expect((await events(page, 'indexchange')).length, 'the product’s own changes fired none').toBe(3);
  });

  test('IMP-21: zoom is set and zoomchange fired once when a gesture, a step or a return has ended, not for each frame of it; controlsHidden is set and controlshiddenchange fired when the person hides or shows the controls; what the product sets is taken at once and fires nothing', async ({ page }) => {
    await mount(page, fx({ index: 1 }));
    for (let turn = 0; turn < 5; turn++) await wheel(page, 320, 340, { deltaY: -20, ctrlKey: true });
    expect(await events(page, 'zoomchange')).toEqual([]);
    await expect.poll(async () => (await events(page, 'zoomchange')).length).toBe(1);
    const { zoom } = await look(page);
    near(zoom, Math.E, 'the zoom the gesture ended at', 0.01);
    expect((await events(page, 'zoomchange'))[0].detail.zoom).toBe(zoom);
    // The product sets them.
    await set(page, { zoom: 2 });
    await settled(page);
    expect(await running(page, SHOWN), 'taken at once').toEqual([]);
    near((await look(page)).image!.height, 2 * (await look(page)).fit.height, 'drawn at 2');
    await set(page, { controlsHidden: true });
    await settled(page);
    expect(await style(page, 'dialog', 'opacity')).toBe('1');
    await set(page, { controlsHidden: false });
    await settled(page);
    expect((await events(page)).length, 'nothing was fired for what the product set').toBe(1);
    // The person: one press on the picture.
    await page.mouse.click(320, 340);
    await expect.poll(async () => (await look(page)).hidden).toBe(true);
    expect((await events(page)).slice(1)).toEqual([{ type: 'controlshiddenchange', detail: { hidden: true } }]);
  });

  test('IMP-22: at fit a downward drag by touch moves the image with the finger and makes the container, the bar, the controls and the caption clearer with the distance; released past a quarter of the stage it fires close with the reason swipe, and then closes from there where the product closed it, or comes back; an upward drag, and a mouse’s, close nothing', async ({ page }) => {
    await mount(page, fx({ index: 1 }, [LANDSCAPE, { ...PORTRAIT, props: { ...PORTRAIT.props, caption: 'The desk.' } }, SQUARE]));
    const from = await look(page);
    await drag(page, [320, 200], [320, 328], { release: false });
    let seen = await look(page);
    near(seen.image!.y - from.image!.y, 128, 'the image moves with the finger');
    near(seen.image!.x, from.image!.x, 'down only');
    const presence = 1 - 128 / WINDOW.height;
    for (const selector of ['.surface', '.bar', '.caption', 'tanrei-button.previous', 'tanrei-button.next']) near(Number(await style(page, selector, 'opacity')), presence, `${selector} is clearer in proportion`, 0.01);
    expect(await style(page, SHOWN, 'opacity'), 'the image is left as it is').toBe('1');
    // Released sooner than a quarter: everything back, over the page motion.
    await watchRuns(page);
    await finger(page, 'pointerup', 320, 328);
    await expect.poll(async () => (await begun(page, '.surface')).map((transition) => transition.property)).toEqual(['opacity']);
    await rest(page);
    seen = await look(page);
    near(seen.image!.y, from.image!.y, 'back');
    expect(await style(page, '.surface', 'opacity')).toBe('1');
    expect(await events(page, 'close')).toEqual([]);
    // Past a quarter, and the product declines: asked once, and everything comes back.
    await drag(page, [320, 200], [320, 400]);
    expect(await events(page, 'close')).toEqual([{ type: 'close', detail: { reason: 'swipe' } }]);
    await rest(page);
    seen = await look(page);
    expect(seen.modal).toBe(true);
    near(seen.image!.y, from.image!.y, 'back');
    // A short one that is flung asks too.
    await drag(page, [320, 200], [320, 270], { steps: 4, every: 12, hold: 0 });
    expect((await events(page, 'close')).length).toBe(2);
    await rest(page);
    // Upward, and a mouse's: nothing.
    await drag(page, [320, 420], [320, 150]);
    await drag(page, [320, 200], [320, 460], { pointerType: 'mouse' });
    await rest(page);
    expect((await events(page, 'close')).length).toBe(2);
    expect((await look(page)).image!.y).toBe(from.image!.y);
    // The product closes it: it closes from where it was left.
    await closing(page);
    // (60 s: the image is read 'while it fades' after the drag's own questions and two frames.)
    await override(page, { [T('motion-exit-duration')]: '60s' });
    await watchRuns(page);
    await drag(page, [320, 200], [320, 420]);
    await settled(page);
    seen = await look(page);
    expect(seen.open).toBe(false);
    expect(seen.modal).toBe(false);
    if (await fadesOut(page)) {
      near(seen.image!.y - from.image!.y, 220, 'held where it was left while it fades', 2);
      await expect.poll(async () => (await begun(page, 'dialog')).map((transition) => transition.property)).toContain('opacity');
    } else expect(await style(page, 'dialog', 'display'), 'gone at once where a closed dialog cannot be held').toBe('none');
    // Opened again, nothing of the drag is left.
    await override(page, { [T('motion-exit-duration')]: '0ms' });
    await set(page, { open: true });
    await rest(page);
    seen = await look(page);
    near(seen.image!.y, from.image!.y, 'at its fit');
    expect(await style(page, '.surface', 'opacity')).toBe('1');
  });

  test('IMP-22: while enlarged a downward drag by touch moves the image and closes nothing', async ({ page }) => {
    await mount(page, fx({ index: 1, zoom: 2 }));
    const from = (await look(page)).image!;
    await drag(page, [320, 200], [320, 500]);
    await rest(page);
    expect(await events(page, 'close')).toEqual([]);
    expect((await look(page)).image!.y).toBeGreaterThan(from.y);
  });
});

test.describe('the keys and the controls', () => {
  test('IMP-23: at fit Left and Right Arrow show the image on that side and Up and Down do nothing; enlarged the four arrows move the view by a quarter of the fit area within its limits; Page Up and Page Down, Home and End move between images at any zoom; a key with nothing to do does nothing and does not leave the preview', async ({ page }) => {
    await mount(page, fx({ index: 1 }));
    const shown = async () => (await look(page)).index;
    await page.keyboard.press('ArrowRight');
    expect(await shown()).toBe(2);
    await page.keyboard.press('ArrowRight');
    expect(await shown(), 'at the last image the key does nothing').toBe(2);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    expect(await shown()).toBe(0);
    await page.keyboard.press('ArrowLeft');
    expect(await shown()).toBe(0);
    expect((await look(page)).focus, 'and does not leave the preview').toBe('stage');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    await rest(page);
    const fit = await look(page);
    expect([fit.index, fit.zoom]).toEqual([0, 1]);
    near(centre(fit.image!).y, centre(fit.fit).y, 'Up and Down did nothing');
    await page.keyboard.press('End');
    expect(await shown()).toBe(2);
    await page.keyboard.press('Home');
    expect(await shown()).toBe(0);
    await page.keyboard.press('PageDown');
    expect(await shown()).toBe(1);
    // Enlarged: the arrows move the view over the image, a quarter of the fit area each.
    await page.keyboard.press('+');
    await page.keyboard.press('+');
    await rest(page);
    const from = await look(page);
    expect(from.zoom).toBe(4);
    await page.keyboard.press('ArrowRight');
    await rest(page);
    near((await look(page)).image!.x, from.image!.x - from.fit.width / 4, 'Right: the view moves right, the image left');
    await page.keyboard.press('ArrowDown');
    await rest(page);
    near((await look(page)).image!.y, from.image!.y - from.fit.height / 4, 'Down: the view moves down');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowUp');
    await rest(page);
    const back = await look(page);
    near(back.image!.x, from.image!.x, 'Left');
    near(back.image!.y, from.image!.y, 'Up');
    expect(back.index, 'enlarged, an arrow changes no image').toBe(1);
    // Within the limits.
    for (let press = 0; press < 12; press++) await page.keyboard.press('ArrowLeft');
    await rest(page);
    near((await look(page)).image!.x, from.fit.x, 'held at the limit');
    // Page Up and Page Down at any zoom; from a control as well as from the stage.
    await tab(page);
    expect((await look(page)).focus).toBe('next');
    await page.keyboard.press('PageDown');
    await rest(page);
    expect([(await look(page)).index, (await look(page)).zoom]).toEqual([2, 1]);
    await page.keyboard.press('PageUp');
    await page.keyboard.press('PageUp');
    expect(await shown()).toBe(0);
    await page.keyboard.press('PageUp');
    expect(await shown()).toBe(0);
    // Enter and Space do nothing on the stage; with a modifier the key is the browser's.
    await part(page, '.stage').focus();
    const before = (await events(page)).length;
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await page.keyboard.press('Control+ArrowRight');
    await settled(page);
    expect((await events(page)).length).toBe(before);
  });

  test('IMP-23: after a press on a control with a mouse the keys still act — in an engine that gives a button no focus for a press, focus is on the stage again and not on nothing', async ({ page }) => {
    await mount(page, fx({ index: 0 }));
    await control(page, 'next').click();
    await rest(page);
    await expect.poll(async () => (await look(page)).focus).toMatch(/^(next|stage)$/);
    expect(await page.evaluate(() => document.activeElement?.localName)).toBe('tanrei-image-preview');
    await page.keyboard.press('ArrowRight');
    await rest(page);
    expect((await look(page)).index).toBe(2);
    await control(page, 'zoom-in').click();
    await rest(page);
    await expect.poll(async () => (await look(page)).focus).toMatch(/^(zoom-in|stage)$/);
    await page.keyboard.press('0');
    await rest(page);
    expect((await look(page)).zoom).toBe(1);
    // No indicator is drawn for focus that came back after a press.
    expect(await style(page, '.fit', 'outline-style')).toBe('none');
  });

  test('IMP-24: one press on the stage, without a drag and without a second press within the interval, hides the controls, and the next shows them; the preview never hides them by itself — not after a time without input and not when the zoom changes', async ({ page }) => {
    await mount(page, fx({ index: 1 }));
    // The interval runs on the page's clock, held still: "not yet" and "now" are asked at exact page times, not after
    // whatever time the machine took to answer.
    await holdClock(page);
    await page.mouse.click(320, 340);
    expect((await look(page)).hidden, 'it waits out the interval for a second press').toBe(false);
    await page.clock.runFor(DOUBLE_PRESS - 1);
    expect((await look(page)).hidden, 'still waiting at the interval less 1 ms').toBe(false);
    await page.clock.runFor(1);
    await expect.poll(async () => (await look(page)).hidden).toBe(true);
    expect(await host(page).getAttribute('controls-hidden')).toBe('');
    await page.mouse.click(320, 340);
    await page.clock.runFor(DOUBLE_PRESS);
    await expect.poll(async () => (await look(page)).hidden).toBe(false);
    expect((await events(page, 'controlshiddenchange')).map((event) => event.detail.hidden)).toEqual([true, false]);
    // A finger's tap does the same; a drag does not.
    await finger(page, 'pointerdown', 320, 340);
    await finger(page, 'pointerup', 320, 340);
    await page.clock.runFor(DOUBLE_PRESS);
    await expect.poll(async () => (await look(page)).hidden).toBe(true);
    await finger(page, 'pointerdown', 320, 340);
    await finger(page, 'pointerup', 320, 340);
    await page.clock.runFor(DOUBLE_PRESS);
    await expect.poll(async () => (await look(page)).hidden).toBe(false);
    // The drag keeps its own timing (its moves are timers of the page), so the clock runs for it; held again after it,
    // the clock jumps a second ahead, past any interval the drag could have begun.
    await releaseClock(page);
    await drag(page, [320, 300], [330, 420], { pointerType: 'mouse' });
    await holdClock(page);
    expect((await look(page)).hidden).toBe(false);
    // Never by itself.
    await page.keyboard.press('+');
    await page.clock.runFor(1500);
    expect((await look(page)).hidden).toBe(false);
    await releaseClock(page);
    expect((await events(page, 'controlshiddenchange')).length).toBe(4);
  });

  test('IMP-25: hidden, the bar, the count, the previous and next controls and the caption are not drawn — fading over the controls motion — and the image neither moves nor is resized; they stay in the focus order and exposed with their names and states, and the keys act as before', async ({ page, browserName }) => {
    const items = [LANDSCAPE, { ...PORTRAIT, props: { ...PORTRAIT.props, caption: 'The desk.' } }, SQUARE];
    await mount(page, fx({ index: 1 }, items));
    const shown = await look(page);
    await override(page, { [T('motion-controls-duration')]: '300ms' });
    await watchRuns(page);
    await page.mouse.click(320, 300);
    await expect.poll(async () => (await look(page)).hidden).toBe(true);
    await settled(page);
    await expect.poll(() => begun(page, '.bar')).toEqual([{ property: 'opacity', duration: 300 }]);
    await rest(page);
    for (const selector of ['.bar', '.caption', 'tanrei-button.previous', 'tanrei-button.next']) {
      expect(await style(page, selector, 'opacity'), `${selector} is not drawn`).toBe('0');
      expect(await style(page, selector, 'visibility'), `${selector} is only not drawn`).toBe('visible');
      expect(await style(page, selector, 'display')).not.toBe('none');
      expect(await part(page, selector).first().evaluate((el) => !!el.closest('[inert]'))).toBe(false);
    }
    const hidden = await look(page);
    expect(hidden.image, 'the image does not move').toEqual(shown.image);
    expect(hidden.fit, 'the fit area is measured with the controls shown').toEqual(shown.fit);
    // Exposed to assistive technology, with their names and states.
    if (browserName === 'chromium') {
      const buttons = (await tree(page)).filter((node) => node.role === 'button').map((node) => `${node.name}${node.properties.disabled ? ' (disabled)' : ''}`);
      expect(buttons.sort()).toEqual(['Close', 'Next image', 'Previous image', 'Zoom in', 'Zoom out (disabled)']);
    }
    // Where a hidden control stands, what a press meets is the picture: a person presses nothing they cannot see.
    const next = centre((await control(page, 'next').boundingBox())!);
    expect(await host(page).evaluate((el, at) => el.shadowRoot!.elementFromPoint(at.x, at.y)?.className, next)).toBe('stage');
    const close = centre((await control(page, 'close').boundingBox())!);
    expect(await host(page).evaluate((el, at) => el.shadowRoot!.elementFromPoint(at.x, at.y)?.className, close)).toBe('stage');
    // A mouse that goes there shows them on its way, before the control answers its press.
    await page.mouse.click(next.x, next.y);
    const pressed = await look(page);
    expect([pressed.hidden, pressed.index]).toEqual([false, 2]);
  });

  test('IMP-25: hidden controls are shown again by any key, by focus that reaches one of them, by a mouse that moves over the preview and by a tap on the stage — before the control answers', async ({ page }) => {
    await mount(page, fx({ index: 1, controlsHidden: true }));
    const hide = async () => {
      await set(page, { controlsHidden: true });
      await settled(page);
      expect((await look(page)).hidden).toBe(true);
    };
    // A key — and the key still acts.
    await page.keyboard.press('ArrowRight');
    let seen = await look(page);
    expect([seen.hidden, seen.index]).toEqual([false, 2]);
    await hide();
    await page.keyboard.press('Shift');
    expect((await look(page)).hidden).toBe(false);
    // Focus reaches a control: Tab is a key; focus moved by assistive technology is not.
    await hide();
    await control(page, 'close').evaluate((el: HTMLElement) => el.focus());
    expect((await look(page)).hidden).toBe(false);
    expect((await look(page)).focus).toBe('close');
    // Shown before the control answers: Enter on the focused close control asks to close with the controls drawn.
    await hide();
    await page.keyboard.press('Enter');
    expect((await look(page)).hidden).toBe(false);
    expect((await events(page, 'close')).map((event) => event.detail.reason)).toEqual(['button']);
    // A mouse that moves.
    await hide();
    await page.mouse.move(200, 300);
    await page.mouse.move(260, 330, { steps: 3 });
    expect((await look(page)).hidden).toBe(false);
    // A tap on the stage.
    await hide();
    await finger(page, 'pointerdown', 320, 340);
    await finger(page, 'pointerup', 320, 340);
    await expect.poll(async () => (await look(page)).hidden).toBe(false);
    expect((await events(page, 'controlshiddenchange')).every((event) => event.detail.hidden === false), 'each showing was the person’s').toBe(true);
    // A mouse that rests where it pressed does not show what its press has just hidden.
    await page.mouse.move(300, 350);
    await page.mouse.click(300, 350);
    await expect.poll(async () => (await look(page)).hidden).toBe(true);
    await page.mouse.move(302, 351);
    expect((await look(page)).hidden).toBe(true);
    await page.mouse.move(340, 380, { steps: 2 });
    expect((await look(page)).hidden).toBe(false);
  });
});

test.describe('the caption and what is exposed', () => {
  test('IMP-26: a caption is drawn at the bottom of the container across its width on caption.container.color, its text in its role and color, wrapping, in a column at most caption.max-width wide that is centred, with its paddings; without one there is no region and the fit area reaches the bottom', async ({ page }) => {
    await mount(page, fixtureOf('caption'), { window: { width: 1000, height: 640 } });
    const caption = (await part(page, '.caption').boundingBox())!;
    const text = (await part(page, '.caption-text').boundingBox())!;
    expect(caption.x).toBe(0);
    expect(caption.width).toBe(1000);
    near(caption.y + caption.height, 640, 'at the bottom');
    expect(await style(page, '.caption', 'background-color')).toBe(await resolveColor(page, T('caption-container-color')));
    expect(await style(page, '.caption-text', 'color')).toBe(await resolveColor(page, T('caption-color')));
    expect(await style(page, '.caption-text', 'font-size')).toBe(`${await px(page, T('caption-typescale-font-size'))}px`);
    near(text.width, await px(page, T('caption-max-width')), 'the column');
    near(centre(text).x, 500, 'centred in the container');
    near(text.y - caption.y, await px(page, T('caption-padding-block')), 'padding above');
    near(caption.y + caption.height - (text.y + text.height), await px(page, T('caption-padding-block')), 'padding below');
    expect(await style(page, '.caption-text', 'text-align')).toBe('left');
    expect(await part(page, '.caption').getAttribute('tabindex'), 'a caption that fits is no focus stop').toBeNull();
    // A narrow window: at least padding-inline before and after.
    await page.setViewportSize(COMPACT);
    await settled(page);
    const narrow = (await part(page, '.caption-text').boundingBox())!;
    near(narrow.x, await px(page, T('caption-padding-inline')), 'padding before');
    near(COMPACT.width - (narrow.x + narrow.width), await px(page, T('caption-padding-inline')), 'padding after');
    expect(await part(page, '.caption-text').evaluate((el) => el.scrollWidth <= el.clientWidth), 'wrapping, never cut').toBe(true);
    // No caption: no region.
    await mount(page, fixtureOf('single'));
    await expect(part(page, '.caption')).toHaveCount(0);
    const seen = await look(page);
    near(seen.fit.y + seen.fit.height, WINDOW.height, 'the fit area reaches the bottom');
  });

  test('IMP-26: the caption’s region is no taller than a third of the container; a text that needs more scrolls inside it, and the region is then one focus stop, exposed as a group, scrolled by the keys as the platform scrolls a region — they do not move the image — and drawn with the system’s focus indicator inside its edge, as a ring or as a glow', async ({ page }) => {
    await mount(page, fixtureOf('long-caption'));
    const caption = part(page, '.caption');
    const box = (await caption.boundingBox())!;
    near(box.height, WINDOW.height / 3, 'a third of the container');
    expect(await caption.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    expect(await caption.getAttribute('tabindex')).toBe('0');
    expect(await caption.getAttribute('role')).toBe('group');
    const seen = await look(page);
    near(seen.fit.y + seen.fit.height, box.y, 'the image is fitted above it');
    expect(seen.image!.y + seen.image!.height).toBeLessThanOrEqual(box.y + 0.5);
    // Keyboard focus: the ring, inside its edge.
    await tab(page);
    await tab(page);
    expect((await look(page)).focus).toBe('caption');
    // It is drawn by a box in the caption's place that does not scroll with the text.
    const ring = part(page, '.caption-focus');
    expect(await ring.boundingBox()).toEqual(box);
    expect(await style(page, '.caption-focus', 'outline-style')).toBe('solid');
    near(Number.parseFloat(await style(page, '.caption-focus', 'outline-width')), await px(page, '--tanrei-sys-focus-outer-width'), 'the outer width');
    expect(await style(page, '.caption-focus', 'outline-color')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    expect(Number.parseFloat(await style(page, '.caption-focus', 'outline-offset'))).toBeLessThan(0);
    expect(await ring.evaluate((el) => el.getAnimations().length), 'never animated').toBe(0);
    // The keys scroll the region and move no image.
    // Each key is pressed on text at rest, as a person presses it. A key scrolls over some frames (End, about 90 ms in
    // WebKit), and WebKit adds a key that arrives on the way to where the scroll was going: Home, pressed when End had
    // brought the text to 9 of its 75, ended at 66 — neither the start nor the end.
    const atRest = () =>
      caption.evaluate(async (el) => {
        for (let last = -1, same = 0; same < 5; ) {
          await new Promise((r) => requestAnimationFrame(r));
          same = el.scrollTop === last ? same + 1 : 0;
          last = el.scrollTop;
        }
        return el.scrollTop;
      });
    const end = await caption.evaluate((el) => el.scrollHeight - el.clientHeight);
    await page.keyboard.press('End');
    await expect.poll(() => caption.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    near(await atRest(), end, 'End: the end of the text');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('PageDown');
    near(await atRest(), end, 'held at its end');
    await page.keyboard.press('Home');
    await expect.poll(() => caption.evaluate((el) => el.scrollTop)).toBe(0);
    expect((await look(page)).index).toBe(0);
    // The zoom keys are not the caption's.
    await page.keyboard.press('+');
    await rest(page);
    expect((await look(page)).zoom).toBe(2);
    // focus-style: glow — a halo and no line.
    await part(page, '.stage').focus();
    await override(page, { '--tanrei-sys-behavior-focus-style': 'glow' });
    await tab(page);
    await tab(page);
    expect((await look(page)).focus).toBe('caption');
    expect(await ring.evaluate((el) => getComputedStyle(el).outlineColor)).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    expect(await ring.evaluate((el) => getComputedStyle(el, '::after').boxShadow)).not.toBe('none');
  });

  test('IMP-26: the keyboard focus of a caption that scrolls stays inside its edges while it scrolls — its inner stroke does not move away with the text', async ({ page }) => {
    await mount(page, fixtureOf('long-caption'));
    const caption = part(page, '.caption');
    await tab(page);
    await tab(page);
    expect((await look(page)).focus).toBe('caption');
    expect(await innerStrokeAtEdges(page, caption), 'before it is scrolled').toEqual({ top: true, bottom: true });
    await caption.evaluate((el) => (el.scrollTop = 40));
    expect(await caption.evaluate((el) => el.scrollTop)).toBe(40);
    expect(await innerStrokeAtEdges(page, caption), 'scrolled by 40').toEqual({ top: true, bottom: true });
    await caption.evaluate((el) => (el.scrollTop = el.scrollHeight));
    expect(await innerStrokeAtEdges(page, caption), 'scrolled to its end').toEqual({ top: true, bottom: true });
  });

  test('IMP-27: the stage is one image that takes focus, named by the alt of the image shown and described by the count’s sentence and then its caption; no other image of the set is exposed, and the zoom and the place are told to no one; keyboard focus draws the system’s indicator inside the edge of the fit area — a ring or a glow — and focus by a press does not; an empty alt still shows the image and is reported', async ({ page, browserName }) => {
    const seen = warnings(page);
    const items = [LANDSCAPE, { ...PORTRAIT, props: { ...PORTRAIT.props, caption: 'The desk, in the morning.' } }, SQUARE];
    await mount(page, fx({ index: 1, zoom: 2 }, items), { lead: '<button id="opener">Open</button>' });
    const stage = part(page, '.stage');
    expect(await stage.evaluate((el: HTMLElement) => ({ role: el.getAttribute('role'), tab: el.tabIndex, name: el.getAttribute('aria-label'), described: el.getAttribute('aria-describedby'), value: el.getAttribute('aria-valuenow') ?? el.getAttribute('aria-valuetext') }))).toEqual({
      role: 'img',
      tab: 0,
      name: PORTRAIT.props.alt,
      described: 'count caption',
      value: null,
    });
    // The pictures themselves are named to no one: the stage alone is the image.
    expect(await host(page).evaluate((el) => [...el.shadowRoot!.querySelectorAll('img')].map((img) => img.getAttribute('alt')))).toEqual(['', '', '']);
    if (browserName === 'chromium') {
      const images = (await tree(page)).filter((node) => node.role === 'image' || node.role === 'img');
      expect(images).toEqual([expect.objectContaining({ name: PORTRAIT.props.alt, description: '2 of 3 The desk, in the morning.' })]);
      expect(JSON.stringify(await tree(page))).not.toMatch(/zoom(?! (in|out))|200\s?%/i);
    }
    // Mounted open the stage has keyboard focus: the indicator is drawn inside the edge of the fit area.
    const fit = part(page, '.fit');
    const ring = async () => ({ style: await style(page, '.fit', 'outline-style'), width: Number.parseFloat(await style(page, '.fit', 'outline-width')), offset: Number.parseFloat(await style(page, '.fit', 'outline-offset')) });
    await tab(page);
    await tab(page, { back: true });
    expect((await look(page)).focus).toBe('stage');
    expect(await ring()).toEqual({ style: 'solid', width: await px(page, '--tanrei-sys-focus-outer-width'), offset: -(await px(page, '--tanrei-sys-focus-outer-width')) });
    expect(await style(page, '.fit', 'outline-color')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    expect(await fit.evaluate((el) => el.getAnimations().length), 'never animated').toBe(0);
    expect(await stage.evaluate((el) => getComputedStyle(el).outlineStyle), 'the stage itself draws nothing').toBe('none');
    // Focus by a press shows none.
    await tab(page);
    await page.mouse.click(320, 340);
    expect((await look(page)).focus).toBe('stage');
    expect((await ring()).style).toBe('none');
    // focus-style: glow.
    await override(page, { '--tanrei-sys-behavior-focus-style': 'glow' });
    await tab(page);
    await tab(page, { back: true });
    expect((await look(page)).focus).toBe('stage');
    expect(await fit.evaluate((el) => getComputedStyle(el).outlineColor)).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    expect(await fit.evaluate((el) => getComputedStyle(el, '::after').boxShadow)).not.toBe('none');
    await override(page, { '--tanrei-sys-behavior-focus-style': 'ring' });
    // Opened by a press on the product's own button: focus is on the stage, and no indicator is drawn.
    await closing(page);
    await page.keyboard.press('Escape');
    await settled(page);
    await page.evaluate(() => document.querySelector('#opener')!.addEventListener('click', () => ((document.querySelector('tanrei-image-preview') as HTMLElement & { open: boolean }).open = true)));
    await page.locator('#opener').click();
    await rest(page);
    expect((await look(page)).focus).toBe('stage');
    expect((await ring()).style).toBe('none');
    expect(seen.filter((text) => text.includes('IMP-27'))).toEqual([]);
    // An empty alt.
    await mount(page, fx({}, [image('landscape', '')]));
    expect((await look(page)).image!.width).toBeGreaterThan(0);
    expect(await part(page, '.stage').getAttribute('aria-label')).toBeNull();
    expect(seen.some((text) => text.includes('IMP-27') && text.includes('no alt'))).toBe(true);
  });

  test('IMP-28: when the image shown changes assistive technology is told, politely and once, the count’s sentence and then the new image’s alt, and focus stays where it is — unless the control that has focus becomes disabled by the change: then focus is on the stage', async ({ page }) => {
    await mount(page, fx({ index: 0 }));
    expect(await part(page, '.said').getAttribute('aria-live')).toBe('polite');
    expect((await look(page)).said, 'opening says nothing: focus on the stage reads the image').toBe('');
    await tab(page);
    expect((await look(page)).focus).toBe('next');
    await page.keyboard.press('Enter');
    await rest(page);
    let seen = await look(page);
    expect(seen.said).toBe(`2 of 3 | ${PORTRAIT.props.alt}`);
    expect(seen.focus, 'focus stays where it is').toBe('next');
    // The last image: next becomes disabled under focus.
    await page.keyboard.press('Enter');
    await rest(page);
    seen = await look(page);
    expect(seen.said).toBe(`3 of 3 | ${SQUARE.props.alt}`);
    expect(seen.focus, 'never on a control that cannot be reached again').toBe('stage');
    expect(await control(page, 'next').evaluate((el: HTMLElement & { disabled: boolean }) => [el.disabled, el.hasAttribute('disabled')])).toEqual([true, true]);
    // Previous at the first image.
    await control(page, 'previous').evaluate((el: HTMLElement) => el.focus());
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await rest(page);
    seen = await look(page);
    expect([seen.index, seen.focus]).toEqual([0, 'stage']);
    // A zoom control at the end of its range.
    await control(page, 'zoom-in').evaluate((el: HTMLElement) => el.focus());
    await page.keyboard.press('Enter');
    await rest(page);
    expect((await look(page)).focus).toBe('zoom-in');
    await page.keyboard.press('Enter');
    await rest(page);
    seen = await look(page);
    expect([seen.zoom, seen.focus]).toEqual([4, 'stage']);
    await control(page, 'zoom-out').evaluate((el: HTMLElement) => el.focus());
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await rest(page);
    seen = await look(page);
    expect([seen.zoom, seen.focus]).toEqual([1, 'stage']);
    // The product's change is said too, whether or not focus is on the stage.
    await control(page, 'close').evaluate((el: HTMLElement) => el.focus());
    await set(page, { index: 2 });
    await settled(page);
    seen = await look(page);
    expect([seen.said, seen.focus]).toEqual([`3 of 3 | ${SQUARE.props.alt}`, 'close']);
  });
});

test.describe('loading and failure', () => {
  /** A page that is at rest, with a closed preview whose pictures are answered by the test. */
  async function served(page: P, items: FixtureItem[], props: Fixture['props'] = {}) {
    const asked: string[] = [];
    const held = new Map<string, () => Promise<void>>();
    await page.route('http://pictures.test/**', async (route) => {
      const name = /\/([\w-]+?)(?:-\d+)?\.png/.exec(route.request().url())![1];
      asked.push(route.request().url());
      if (name === 'missing') return route.fulfill({ status: 404, body: '' });
      const answer = () => route.fulfill({ contentType: 'image/png', body: BYTES(name) });
      if (route.request().url().includes('held')) held.set(route.request().url(), answer);
      else await answer();
    });
    await mount(page, fx({ open: false, ...props }, items));
    return { asked, held };
  }
  const HELD = (name: string) => `http://pictures.test/${name}.png?held`;
  const opened = async (page: P) => {
    await set(page, { open: true });
    await settled(page);
  };

  test('IMP-29: while its source has not loaded an image with a thumbnailSrc is drawn as that picture at the size the image will have at fit; one without is a Skeleton’s one block of that size — of the whole fit area where no size is given — named by loadingLabel; the zoom stays 1, and moving on and closing work as ever', async ({ page }) => {
    const thumbnail = fixturePicture('fixtures/image-preview-landscape-thumbnail.png');
    await served(page, [image(HELD('landscape'), 'A bedroom', { width: 1600, height: 1000, thumbnailSrc: thumbnail }), image(HELD('portrait'), 'The desk', { width: 1000, height: 1500 }), image(HELD('square'), 'A chair')], { loadingLabel: 'Loading image' });
    await override(page, { '--tanrei-comp-skeleton-motion-show-delay': '0ms' });
    await opened(page);
    await expect(part(page, '.thumbnail')).toHaveCount(1);
    // A picture is not text to select: kept from selection under both names (Safari reads the prefixed one only).
    expect(await part(page, '.thumbnail').evaluate((el) => ((style) => [(style as unknown as { webkitUserSelect?: string }).webkitUserSelect ?? 'none', style.userSelect ?? 'none'])(getComputedStyle(el)))).toEqual(['none', 'none']);
    await expect.poll(() => part(page, '.thumbnail').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBe(320);
    await rest(page);
    let seen = await look(page);
    const drawn = (await part(page, '.thumbnail').boundingBox())!;
    near(drawn.width, WINDOW.width, 'the thumbnail enlarged to the image’s fit');
    near(drawn.height, WINDOW.width / 1.6, 'at the image’s proportions');
    near(centre(drawn).y, centre(seen.fit).y, 'in the image’s place');
    await expect(part(page, 'tanrei-skeleton')).toHaveCount(0);
    expect(seen.image, 'the source is not drawn yet').toBeNull();
    // The zoom stays 1.
    await page.keyboard.press('+');
    await finger(page, 'pointerdown', 320, 340);
    await finger(page, 'pointerup', 320, 340);
    await finger(page, 'pointerdown', 320, 340);
    await finger(page, 'pointerup', 320, 340);
    await wheel(page, 320, 340, { deltaY: -50, ctrlKey: true });
    await settled(page);
    expect((await look(page)).zoom).toBe(1);
    near((await part(page, '.thumbnail').boundingBox())!.width, WINDOW.width, 'still at fit');
    expect(await control(page, 'zoom-in').evaluate((el: HTMLElement & { disabled: boolean }) => el.disabled)).toBe(true);
    // Moving on works: the second has no thumbnail — a Skeleton's block, of the size its width and height give.
    await page.keyboard.press('ArrowRight');
    await rest(page);
    seen = await look(page);
    expect(seen.index).toBe(1);
    const skeleton = part(page, 'tanrei-skeleton');
    await expect(skeleton).toHaveCount(1);
    const block = (await part(page, '.tanrei-skeleton-placeholder').boundingBox())!;
    near(block.height, seen.fit.height, 'as high as the image will be');
    near(block.width, seen.fit.height * (1000 / 1500), 'at its proportions');
    near(centre(block).x, centre(seen.fit).x, 'in its place');
    expect(await part(page, '.tanrei-skeleton-placeholder').getAttribute('data-shape')).toBe('block');
    await expect(skeleton).toHaveAttribute('role', 'progressbar');
    await expect(skeleton).toHaveAttribute('aria-label', 'Loading image');
    await expect(skeleton).toHaveAttribute('aria-busy', 'true');
    // The third gives no size: the whole fit area.
    await page.keyboard.press('ArrowRight');
    await rest(page);
    seen = await look(page);
    const whole = (await part(page, '.tanrei-skeleton-placeholder').boundingBox())!;
    near(whole.width, seen.fit.width, 'as wide as the fit area');
    near(whole.height, seen.fit.height, 'as high as the fit area');
    near(whole.y, seen.fit.y, 'in the fit area');
    // Closing works.
    await closing(page);
    await page.keyboard.press('Escape');
    await settled(page);
    expect((await look(page)).modal).toBe(false);
  });

  test('IMP-29: an image whose src is empty is asked for nothing and waits — the fixtures’ picture that never arrives — and the document’s load is not kept waiting', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await mount(page, fixtureOf('loading'), { loaded: false });
    expect(await page.evaluate(() => document.readyState)).toBe('complete');
    expect(await host(page).evaluate((el) => el.querySelector('tanrei-image-preview-item')!.getAttribute('src'))).toBe('');
    await expect(part(page, 'tanrei-skeleton')).toHaveCount(1);
    await page.waitForTimeout(400);
    await expect(part(page, '.error')).toHaveCount(0);
    expect((await look(page)).sources).toEqual([]);
    expect(requests.filter((url) => !url.startsWith('data:') && !url.startsWith('about:'))).toEqual([]);
    // With a thumbnail, the thumbnail.
    await mount(page, fixtureOf('loading-thumbnail'), { loaded: false });
    await expect(part(page, '.thumbnail')).toHaveCount(1);
    await expect(part(page, 'tanrei-skeleton')).toHaveCount(0);
    // Its address given later, it is asked for and drawn.
    await host(page).evaluate((el, src) => el.querySelector('tanrei-image-preview-item')!.setAttribute('src', src), fixturePicture('fixtures/image-preview-landscape.png'));
    await expect(part(page, SHOWN)).toHaveCount(1);
    await expect(part(page, '.thumbnail')).toHaveCount(0);
  });

  test('IMP-30: a source that has loaded is drawn in place of the thumbnail at once, where the thumbnail was; a src changed after it has loaded keeps the earlier picture drawn, at its zoom and its place, until the new one has loaded, and the new one is then drawn at the same zoom and place', async ({ page }) => {
    const thumbnail = fixturePicture('fixtures/image-preview-landscape-thumbnail.png');
    const { held } = await served(page, [image(HELD('landscape'), 'A bedroom', { thumbnailSrc: thumbnail })]);
    await opened(page);
    await expect.poll(() => part(page, '.thumbnail').evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(320);
    await rest(page);
    const before = (await part(page, '.thumbnail').boundingBox())!;
    await expect.poll(() => held.size).toBe(1);
    await [...held.values()][0]();
    await expect(part(page, SHOWN)).toHaveCount(1);
    await rest(page);
    await expect(part(page, '.thumbnail')).toHaveCount(0);
    const loaded = await look(page);
    expect(loaded.image, 'nothing the person sees has moved: the proportions are the same').toEqual(before);
    // Enlarged and moved, then the product answers with a larger source.
    await page.keyboard.press('+');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await rest(page);
    const placed = await look(page);
    held.clear();
    await host(page).evaluate((el, src) => el.querySelector('tanrei-image-preview-item')!.setAttribute('src', src), `http://pictures.test/landscape-2.png?held`);
    await expect.poll(() => held.size).toBe(1);
    await settled(page);
    let seen = await look(page);
    expect(seen.image, 'the earlier picture is still drawn, where it was').toEqual(placed.image);
    expect(await part(page, SHOWN).getAttribute('data-src')).toBe(HELD('landscape'));
    expect(await control(page, 'zoom-out').evaluate((el: HTMLElement & { disabled: boolean }) => el.disabled), 'and can still be operated').toBe(false);
    await [...held.values()][0]();
    await expect.poll(() => part(page, SHOWN).getAttribute('data-src')).toBe('http://pictures.test/landscape-2.png?held');
    await settled(page);
    seen = await look(page);
    expect(seen.image, 'the new one at the same zoom and place').toEqual(placed.image);
    expect(seen.zoom).toBe(2);
    await expect(part(page, '.pages img')).toHaveCount(1);
    expect(await events(page, 'loaderror')).toEqual([]);
  });

  test('IMP-31: a source that fails is drawn as the broken_image glyph in the middle of the fit area with errorText below it, in their tokens; the stage keeps the alt and adds errorText to its description, it is told politely, and loaderror is fired once with the index; the zoom stays 1, moving on works, and a changed src is asked for again; without errorText the glyph is drawn alone, reported', async ({ page }) => {
    const seen = warnings(page);
    await served(page, [image(ADDRESS('landscape'), 'A bedroom'), image(ADDRESS('missing'), 'The desk'), image(ADDRESS('square'), 'A chair')], { index: 1 });
    await opened(page);
    await expect(part(page, '.page[style="--_at: 0"] .error')).toHaveCount(1);
    await rest(page);
    const view = await look(page);
    const glyph = (await part(page, '.glyph').boundingBox())!;
    const text = (await part(page, '.error-text').boundingBox())!;
    const size = await px(page, T('error-icon-size'));
    expect([glyph.width, glyph.height]).toEqual([size, size]);
    expect(await part(page, '.glyph').textContent()).toBe('broken_image');
    near(centre(glyph).x, centre(view.fit).x, 'the mark centred across');
    near(text.y - (glyph.y + glyph.height), await px(page, T('error-gap')), 'error.gap below the mark');
    near((glyph.y + text.y + text.height) / 2, centre(view.fit).y, 'the two in the middle of the fit area');
    expect(await style(page, '.glyph', 'color')).toBe(await resolveColor(page, T('error-icon-color')));
    expect(await style(page, '.error-text', 'color')).toBe(await resolveColor(page, T('error-text-color')));
    expect(await style(page, '.error-text', 'font-size')).toBe(`${await px(page, T('error-text-typescale-font-size'))}px`);
    expect(await style(page, '.error-text', 'text-align')).toBe('center');
    await expect(part(page, '.error-text')).toHaveText(WORDS.errorText);
    expect(await style(page, '.glyph', 'font-family')).toContain(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tanrei-sys-icon-family-unselected').trim().replaceAll('"', '').split(',')[0]));
    // Exposed and told.
    expect(await part(page, '.stage').evaluate((el) => [el.getAttribute('aria-label'), el.getAttribute('aria-describedby')])).toEqual(['The desk', 'count error']);
    expect(view.said).toBe(WORDS.errorText);
    expect(await events(page, 'loaderror')).toEqual([{ type: 'loaderror', detail: { index: 1 } }]);
    // The zoom stays 1.
    await page.keyboard.press('+');
    await settled(page);
    expect((await look(page)).zoom).toBe(1);
    // Moving on and back: asked again, and loaderror not fired a second time for the same source.
    await page.keyboard.press('ArrowRight');
    await rest(page);
    expect((await look(page)).image).not.toBeNull();
    await page.keyboard.press('ArrowLeft');
    await rest(page);
    await expect(part(page, '.page[style="--_at: 0"] .error')).toHaveCount(1);
    expect((await events(page, 'loaderror')).length).toBe(1);
    // The product changes src: it is asked for again.
    await host(page).evaluate((el, src) => el.querySelectorAll('tanrei-image-preview-item')[1].setAttribute('src', src), ADDRESS('portrait'));
    await expect(part(page, '.page[style="--_at: 0"] .image')).toHaveCount(1);
    await expect(part(page, '.page[style="--_at: 0"] .error')).toHaveCount(0);
    expect(await part(page, '.stage').getAttribute('aria-describedby')).toBe('count');
    expect(seen.filter((text) => text.includes('IMP-31'))).toEqual([]);
    // Without the sentence: the glyph alone, reported.
    await mount(page, { ...fixtureOf('error'), props: { ...fixtureOf('error').props, errorText: '' } });
    await expect(part(page, '.page[style="--_at: 0"] .glyph')).toHaveCount(1);
    await expect(part(page, '.error-text')).toHaveCount(0);
    expect(await missingWords(page)).toContain('imageErrorText');
    expect(seen.some((text) => text.includes('IMP-31') && text.includes('error-text'))).toBe(true);
  });

  test('IMP-32: it asks for the source of the image shown and of the one before and the one after it, and of no other, however many there are — nothing while it is closed — and asks for a neighbour when it becomes one', async ({ page }) => {
    const names = ['landscape', 'portrait', 'square', 'landscape', 'portrait', 'square', 'landscape'];
    const { asked } = await served(page, names.map((name, at) => image(`http://pictures.test/${name}-${at}.png`, `Image ${at}`)), { index: 3 });
    const numbers = () => [...new Set(asked.map((url) => Number(/-(\d+)\.png/.exec(url)![1])))].sort();
    await page.waitForTimeout(200);
    expect(asked, 'closed, it asks for nothing').toEqual([]);
    await opened(page);
    await expect.poll(numbers).toEqual([2, 3, 4]);
    await rest(page);
    expect((await look(page)).sources.length).toBe(3);
    await page.keyboard.press('ArrowRight');
    await expect.poll(numbers).toEqual([2, 3, 4, 5]);
    await rest(page);
    expect((await look(page)).sources.map((src) => Number(/-(\d+)\.png/.exec(src)![1])), 'the one that is no longer one of the three is let go').toEqual([3, 4, 5]);
    await page.keyboard.press('End');
    await rest(page);
    expect(numbers()).toEqual([2, 3, 4, 5, 6]);
    expect(numbers(), 'the first two were never asked for').not.toContain(0);
    expect(numbers()).not.toContain(1);
  });
});

test.describe('motion', () => {
  test('IMP-33: opening, the container, the bar, the controls and the caption fade in while the image appears as every modal surface does — from opacity 0 and scale 0.96 under the default system, about the centre of the fit area — over the enter motion; closing, all of it fades out over the exit motion while the image goes back the same way; the image is never flown from anywhere', async ({ page }) => {
    await mount(page, fx({ open: false, index: 1 }));
    await override(page, { [T('motion-enter-duration')]: '2000ms', [T('motion-exit-duration')]: '1500ms' });
    // What each motion is expected to run for: the component's tokens, as just set, read back.
    const enter = await ms(page, T('motion-enter-duration'));
    const exit = await ms(page, T('motion-exit-duration'));
    // What opening begins is kept as the engine announces it, with the values it runs between: asked for after the two
    // frames `settled` waits, and again in a third question, a motion of 2 s is over on a runner that draws slowly.
    await watchRuns(page);
    await set(page, { open: true });
    await settled(page);
    await expect.poll(() => begun(page, 'dialog')).toEqual(expect.arrayContaining([{ property: 'opacity', duration: enter }]));
    await expect.poll(() => begun(page, '.pages')).toEqual(expect.arrayContaining([{ property: 'opacity', duration: enter }, { property: 'scale', duration: enter }]));
    const pagesRuns = await runs(page, '.pages');
    const growing = { ...pagesRuns.find((run) => run.property === 'scale')!, origin: await style(page, '.pages', 'transform-origin') };
    // From where the appearance starts it (sys.motion.appear.*), to whole.
    expect(growing.from).toBe(String(await page.evaluate((name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim(), '--tanrei-sys-motion-appear-scale')));
    expect(growing.to).toBe('none');
    expect(pagesRuns.find((run) => run.property === 'opacity')).toMatchObject({ from: '0', to: '1' });
    const seen = await look(page);
    const origin = growing.origin.split(' ').map(Number.parseFloat);
    near(origin[0], centre(seen.fit).x, 'about the centre of the fit area, across');
    near(origin[1], centre(seen.fit).y, 'about the centre of the fit area, down');
    // Nothing else moves the image: it is not flown from the thumbnail's place.
    expect(await running(page, SHOWN)).toEqual([]);
    expect(await running(page, '.page[style="--_at: 0"]')).toEqual([]);
    expect(await style(page, 'dialog', 'transition-timing-function')).toBe(await style(page, '.pages', 'transition-timing-function'));
    await override(page, { [T('motion-enter-duration')]: '0ms' });
    await rest(page);
    await watchRuns(page);
    await set(page, { open: false });
    await settled(page);
    if (await fadesOut(page)) await expect.poll(() => begun(page, 'dialog')).toEqual(expect.arrayContaining([{ property: 'opacity', duration: exit }]));
    else expect(await style(page, 'dialog', 'display'), 'gone at once where a closed dialog cannot be held').toBe('none');
    expect(await style(page, 'dialog', 'transition-duration')).toBe('1.5s');
    // The image goes back the same way, over the exit motion, where the closed dialog is held while it fades.
    if (await fadesOut(page)) await expect.poll(() => begun(page, '.pages')).toEqual(expect.arrayContaining([{ property: 'opacity', duration: exit }, { property: 'scale', duration: exit }]));
  });

  test('IMP-34: where motion is reduced it opens and closes by fading — the image over sys.motion.role.reduced, without growing — a step of the zoom, a change of image and the controls change at once, an image still follows a finger, and a released drag settles at once', async ({ page }) => {
    await mount(page, fx({ open: false, index: 1 }), { reducedMotion: true });
    await override(page, { [T('motion-enter-duration')]: '2000ms' });
    await watchRuns(page);
    await set(page, { open: true });
    await settled(page);
    await expect.poll(() => begun(page, 'dialog')).toEqual(expect.arrayContaining([{ property: 'opacity', duration: 2000 }]));
    // (The engine announces what one change starts together: a growth would be in the list by now.)
    expect((await begun(page, '.pages')).filter((run) => !['display', 'overlay'].includes(run.property)), 'the image only fades, without growing').toEqual([{ property: 'opacity', duration: await ms(page, '--tanrei-sys-motion-role-reduced') }]);
    await override(page, { [T('motion-enter-duration')]: '0ms' });
    await rest(page);
    await control(page, 'zoom-in').click();
    expect(await running(page, SHOWN), 'the step is at once').toEqual([]);
    near((await look(page)).image!.height, 2 * (await look(page)).fit.height, 'at 2');
    await page.keyboard.press('PageDown');
    await settled(page);
    expect(await running(page, '.page[style="--_at: 0"]'), 'the change of image is at once').toEqual([]);
    expect((await look(page)).page!.x).toBe(0);
    await page.mouse.click(320, 340);
    await expect.poll(async () => (await look(page)).hidden).toBe(true);
    await settled(page);
    expect(await running(page, '.bar'), 'the controls at once').toEqual([]);
    expect(await style(page, '.bar', 'opacity')).toBe('0');
    // The person's own motion is followed.
    await set(page, { index: 1 });
    await settled(page);
    const from = await look(page);
    await drag(page, [400, 340], [300, 340], { release: false });
    near((await look(page)).image!.x, from.image!.x - 100, 'the image follows the finger');
    await page.waitForTimeout(160);
    await finger(page, 'pointerup', 300, 340);
    expect(await running(page, '.page[style="--_at: 0"]'), 'the settle is at once').toEqual([]);
    near((await look(page)).image!.x, from.image!.x, 'back');
    // A fling does not go on.
    await page.keyboard.press('+');
    await settled(page);
    await drag(page, [320, 500], [320, 380], { steps: 6, every: 10, hold: 0, pointerType: 'mouse' });
    const released = (await look(page)).image!.y;
    await page.waitForTimeout(120);
    expect((await look(page)).image!.y).toBe(released);
  });
});

test.describe('direction, colors, text size and the window', () => {
  test('IMP-35: right to left, the count is at the right of the bar and its controls at the left, close leftmost; previous at the right of the stage and next at the left; the image after lies to the left, so a drag toward the right brings it and Left Arrow shows it; the caption’s lines begin at the right; the image, the way an enlarged image moves and the point a double tap keeps are not mirrored', async ({ page }) => {
    await mount(page, fixtureOf('several-rtl'));
    const x = async (selector: string) => centre((await part(page, selector).boundingBox())!).x;
    const [count, out, into, close, previous, next] = await Promise.all(['.count', 'tanrei-button.zoom-out', 'tanrei-button.zoom-in', 'tanrei-button.close', 'tanrei-button.previous', 'tanrei-button.next'].map(x));
    expect(close).toBeLessThan(into);
    expect(into).toBeLessThan(out);
    expect(out).toBeLessThan(count);
    near((await part(page, 'tanrei-button.close').boundingBox())!.x, await px(page, T('bar-padding-inline')), 'close leftmost, padding-inline from the edge');
    expect(next).toBeLessThan(WINDOW.width / 2);
    expect(previous).toBeGreaterThan(WINDOW.width / 2);
    near((await part(page, 'tanrei-button.next').boundingBox())!.x, await px(page, T('navigation-margin-inline')), 'next at the left');
    await expect(part(page, '.count')).toHaveText('2 من 3');
    expect(await style(page, '.caption-text', 'text-align')).toBe('right');
    const text = await part(page, '.caption-text').evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return range.getBoundingClientRect().right - el.getBoundingClientRect().right;
    });
    near(text, 0, 'the lines begin at the right');
    // The image after lies to the left.
    const seen = await look(page);
    expect(seen.after!.x).toBeLessThan(0);
    expect(seen.before!.x).toBeGreaterThan(0);
    near(seen.page!.x - (seen.after!.x + seen.after!.width), await px(page, T('layout-page-gap')), 'page-gap apart');
    await page.keyboard.press('ArrowLeft');
    await rest(page);
    expect((await look(page)).index, 'Left Arrow shows the image after').toBe(2);
    await page.keyboard.press('ArrowRight');
    await rest(page);
    expect((await look(page)).index).toBe(1);
    await page.mouse.move(150, 340);
    await page.mouse.down();
    await page.mouse.move(520, 340, { steps: 6 });
    await page.waitForTimeout(160);
    await page.mouse.up();
    await rest(page);
    expect((await look(page)).index, 'a drag toward the right brings the image after').toBe(2);
    await control(page, 'previous').click();
    await rest(page);
    expect((await look(page)).index).toBe(1);
    // Not mirrored: the picture, the way it moves under an arrow and a drag, the point a double press keeps.
    expect(await part(page, SHOWN).evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).a)).toBe(1);
    const fit = await look(page);
    const at = { x: fit.image!.x + fit.image!.width * 0.45, y: fit.image!.y + fit.image!.height * 0.3 };
    await doublePress(page, at);
    await rest(page);
    let zoomed = await look(page);
    expect(zoomed.zoom).toBe(2);
    near(zoomed.image!.x + zoomed.image!.width * 0.45, at.x, 'the point under the pointer', 1.5);
    await page.keyboard.press('ArrowRight');
    await rest(page);
    expect((await look(page)).image!.x, 'Right Arrow moves the view right — the image left — as in a left-to-right layout').toBeLessThan(zoomed.image!.x - 20);
    zoomed = await look(page);
    await drag(page, [300, 300], [330, 300], { pointerType: 'mouse' });
    near((await look(page)).image!.x, zoomed.image!.x + 30, 'a drag moves it with the pointer');
  });

  test('IMP-36: right to left, the chevrons of the previous and next controls are drawn mirrored by the icon helper — inside their own boxes, where the icon set marks the names — and the zoom, close and broken_image glyphs, which point nowhere, are not; left to right none is', async ({ page }) => {
    const mirrored = () =>
      host(page).evaluate((el) =>
        Object.fromEntries(
          [...el.shadowRoot!.querySelectorAll('tanrei-button')].map((button) => {
            const glyph = button.querySelector<HTMLElement>('[slot="icon"]')!;
            return [glyph.textContent, { marked: glyph.hasAttribute('data-tanrei-mirrored'), flipped: new DOMMatrixReadOnly(getComputedStyle(glyph).transform).a === -1 }];
          }),
        ),
      );
    await mount(page, fixtureOf('several-rtl'));
    expect(await mirrored()).toEqual({
      zoom_out: { marked: false, flipped: false },
      zoom_in: { marked: false, flipped: false },
      close: { marked: false, flipped: false },
      chevron_left: { marked: true, flipped: true },
      chevron_right: { marked: true, flipped: true },
    });
    // The preview mirrors nothing itself: the controls keep their places and sizes.
    const boxes = await Promise.all(['previous', 'next'].map(async (name) => (await control(page, name).boundingBox())!));
    expect(boxes[0].width).toBe(boxes[1].width);
    expect(await control(page, 'previous').evaluate((el) => getComputedStyle(el).transform)).toBe('none');
    await mount(page, fixtureOf('several'));
    expect(Object.values(await mirrored()).every((glyph) => !glyph.flipped)).toBe(true);
    // The mark of a failure points nowhere.
    await mount(page, { ...fixtureOf('error'), direction: 'rtl' });
    expect(await part(page, '.page[style="--_at: 0"] .glyph').evaluate((el) => [el.hasAttribute('data-tanrei-mirrored'), getComputedStyle(el).transform])).toEqual([false, 'none']);
  });

  test('IMP-37: the direction is taken from where it is used and it has no setting of its own; changed while it is shown, it is drawn for the new direction at once, without a motion, keeping its open state, its image, its zoom and its focus', async ({ page }) => {
    await mount(page, fx({ index: 1, zoom: 2 }));
    expect(await host(page).evaluate((el) => ['dir', 'direction'].filter((name) => (el.constructor as unknown as { elementProperties: Map<string, unknown> }).elementProperties.has(name)))).toEqual([]);
    await tab(page);
    const before = await look(page);
    expect(before.focus).toBe('next');
    expect(before.after!.x).toBeGreaterThan(0);
    await page.evaluate(() => document.querySelector('.stage')!.setAttribute('dir', 'rtl'));
    await settled(page);
    const after = await look(page);
    expect(await running(page, '.page[style="--_at: 0"]'), 'without a motion of its own').toEqual([]);
    expect(await running(page, '.page[style="--_at: 1"]')).toEqual([]);
    expect(await running(page, SHOWN)).toEqual([]);
    expect(after.after!.x, 'the image after now lies to the left').toBeLessThan(0);
    expect((await control(page, 'next').boundingBox())!.x).toBeLessThan(WINDOW.width / 2);
    expect((await control(page, 'close').boundingBox())!.x).toBeLessThan(WINDOW.width / 2);
    expect([after.modal, after.index, after.zoom, after.focus]).toEqual([true, 1, 2, 'next']);
    expect(after.image, 'the image is where it was').toEqual(before.image);
    await page.keyboard.press('PageDown');
    await page.keyboard.press('ArrowRight');
    await rest(page);
    expect((await look(page)).index, 'the keys follow the new direction').toBe(1);
  });

  test('IMP-38: the count, the caption and the error text are each laid out as text of its own direction, isolated — a left-to-right sentence keeps its order in a right-to-left layout — and are still placed and aligned by the layout', async ({ page }) => {
    const items = [image('landscape', 'A bedroom', { caption: 'Photograph 12 by A. Mori, +81 3 5550 0100.' }), image('missing', 'The desk'), SQUARE];
    await mount(page, { ...fx({ countText: 'Image {position} of {count}', errorText: 'Not loaded: room-2.jpg' }, items), direction: 'rtl' });
    for (const selector of ['.count', '.caption-text']) {
      expect(await style(page, selector, 'unicode-bidi'), selector).toBe('plaintext');
      expect(await style(page, selector, 'text-align'), `${selector} is aligned by the layout`).toBe('right');
      expect(await style(page, selector, 'direction'), `${selector} is placed by the layout`).toBe('rtl');
    }
    // The left-to-right sentence reads left to right: its last character is at its right end.
    const order = (selector: string) =>
      part(page, selector).evaluate((el) => {
        const node = el.firstChild?.nodeType === Node.TEXT_NODE ? el.firstChild : [...el.childNodes].find((child) => child.nodeType === Node.TEXT_NODE && child.textContent!.trim())!;
        const at = (index: number) => {
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + 1);
          return range.getBoundingClientRect().left;
        };
        return at(0) < at(node.textContent!.length - 1);
      });
    expect(await order('.caption-text')).toBe(true);
    expect(await order('.count')).toBe(true);
    const count = (await part(page, '.count').boundingBox())!;
    expect(count.x + count.width, 'the count stands at the bar’s start: the right').toBeGreaterThan(WINDOW.width - 40);
    await page.keyboard.press('ArrowLeft');
    await rest(page);
    await expect(part(page, '.error-text')).toHaveText('Not loaded: room-2.jpg');
    expect(await style(page, '.error-text', 'unicode-bidi')).toBe('plaintext');
    expect(await style(page, '.error-text', 'text-align')).toBe('center');
    expect(await order('.error-text')).toBe(true);
  });

  test('IMP-39: with text at twice its size in a window 320 wide the count wraps and the bar grows, the caption grows to its third and scrolls, the image is fitted to what is left and nothing is cut or scrolls sideways; the controls are no larger than a Button makes itself', async ({ page }) => {
    const items = [{ ...LANDSCAPE, props: { ...LANDSCAPE.props, caption: LONG } }, PORTRAIT, SQUARE];
    await mount(page, fx({ countText: 'Picture {position} of the {count} pictures of the east bedroom' }, items), { window: { width: 320, height: 640 } });
    const usual = { bar: (await part(page, '.bar').boundingBox())!.height, button: (await control(page, 'close').boundingBox())!, count: Number.parseFloat(await style(page, '.count', 'font-size')), caption: Number.parseFloat(await style(page, '.caption-text', 'font-size')) };
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    await settled(page);
    await rest(page);
    near(Number.parseFloat(await style(page, '.count', 'font-size')), 2 * usual.count, 'the count grows with the text');
    near(Number.parseFloat(await style(page, '.caption-text', 'font-size')), 2 * usual.caption, 'the caption grows with the text');
    const bar = (await part(page, '.bar').boundingBox())!;
    expect(bar.height, 'the bar grows where the count wraps').toBeGreaterThan(usual.bar);
    expect(await part(page, '.count').evaluate((el) => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight), 'the count is not cut').toBe(true);
    await page.screenshot({ path: process.env.LOOK_OUT ? `${process.env.LOOK_OUT}/imp-39.png` : undefined });
    const caption = (await part(page, '.caption').boundingBox())!;
    near(caption.height, 640 / 3, 'the caption’s region at its limit');
    expect(await part(page, '.caption').evaluate((el) => el.scrollHeight > el.clientHeight && el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await part(page, '.caption').getAttribute('tabindex')).toBe('0');
    const seen = await look(page);
    near(seen.fit.y, bar.height, 'the fit area is measured anew');
    near(seen.fit.y + seen.fit.height, caption.y, 'above the caption');
    expect(seen.image!.y).toBeGreaterThanOrEqual(seen.fit.y - 0.5);
    expect(seen.image!.y + seen.image!.height).toBeLessThanOrEqual(seen.fit.y + seen.fit.height + 0.5);
    near(seen.image!.width, Math.min(seen.fit.width, seen.fit.height * 1.6), 'the image is fitted to what is left');
    const count = (await part(page, '.count').boundingBox())!;
    const controls = await Promise.all(['zoom-out', 'zoom-in', 'close'].map(async (name) => (await control(page, name).boundingBox())!));
    expect(count.width, 'the count has a line of its own where the controls leave it less than half the bar').toBeGreaterThan(250);
    for (const box of controls) expect(box.y, 'the three controls together, below it').toBe(controls[0].y);
    expect(controls[0].y).toBeGreaterThanOrEqual(count.y + count.height - 0.5);
    near(320 - (controls[2].x + controls[2].width), await px(page, T('bar-padding-inline')), 'at the bar’s end');
    // Nothing needs scrolling sideways, and every control is whole in the window.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    // (What lies beside the window is the neighbour's page, which the container cuts and no one scrolls to.)
    expect(await part(page, 'dialog').evaluate((el) => [getComputedStyle(el).overflowX, el.scrollLeft, el.scrollTop])).toEqual(['hidden', 0, 0]);
    for (const selector of ['.bar', '.count', '.caption', '.caption-text', '.fit']) {
      const box = (await part(page, selector).boundingBox())!;
      expect(box.x, selector).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, selector).toBeLessThanOrEqual(320);
    }
    for (const name of ['zoom-out', 'zoom-in', 'close', 'previous', 'next']) {
      const box = (await control(page, name).boundingBox())!;
      expect(box.x, name).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, name).toBeLessThanOrEqual(320);
    }
    const button = (await control(page, 'close').boundingBox())!;
    const alone = await page.evaluate(async () => {
      const own = document.createElement('tanrei-button') as HTMLElement & { updateComplete: Promise<unknown> };
      own.setAttribute('variant', 'tonal');
      own.setAttribute('size', 'small');
      own.setAttribute('label', 'Close');
      own.innerHTML = '<span slot="icon">close</span>';
      document.querySelector('.stage')!.append(own);
      await own.updateComplete;
      const { width, height } = own.getBoundingClientRect();
      own.remove();
      return { width, height };
    });
    expect({ width: button.width, height: button.height }, 'a control is as large as a Button makes itself').toEqual(alone);
  });

  test('IMP-40: when the window changes size the fit area is measured anew: at fit the image is drawn to fit it, and enlarged it keeps its zoom and the point of the image at the middle of the fit area, without a motion', async ({ page }) => {
    await mount(page, fx({ index: 1 }));
    await page.setViewportSize({ width: 900, height: 500 });
    await settled(page);
    let seen = await look(page);
    expect(await running(page, SHOWN)).toEqual([]);
    near(seen.fit.width, 900, 'the fit area is the window’s');
    near(seen.image!.height, seen.fit.height, 'drawn to fit');
    near(centre(seen.image!).x, 450, 'centred');
    // Enlarged, and moved off its centre.
    await page.keyboard.press('+');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await rest(page);
    seen = await look(page);
    const point = { x: (centre(seen.fit).x - seen.image!.x) / seen.image!.width, y: (centre(seen.fit).y - seen.image!.y) / seen.image!.height };
    await page.setViewportSize({ width: 500, height: 800 });
    await settled(page);
    const after = await look(page);
    expect(await running(page, SHOWN), 'without a motion').toEqual([]);
    expect(after.zoom, 'the zoom is kept').toBe(seen.zoom);
    near(after.image!.width, seen.zoom * after.fit.height * (1000 / 1500), 'at the same zoom of its new fit');
    near(after.image!.x + point.x * after.image!.width, centre(after.fit).x, 'the same point across', 1.5);
    near(after.image!.y + point.y * after.image!.height, centre(after.fit).y, 'the same point down', 1.5);
  });

  test('IMP-41: in forced colors the container, the bar and the caption are the platform’s background, the count, the caption, the error text and the mark its text color, and every image is left exactly as it is', async ({ page, browserName }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    const items = [{ ...LANDSCAPE, props: { ...LANDSCAPE.props, caption: 'The east bedroom.' } }, image('missing', 'The desk'), SQUARE];
    await mount(page, fx({}, items));
    const forced = await page.evaluate(() => matchMedia('(forced-colors: active)').matches);
    test.skip(!forced, `${browserName} does not emulate forced colors here`);
    const system = (color: string) =>
      page.evaluate((name) => {
        const probe = document.createElement('div');
        probe.style.cssText = `forced-color-adjust: none; color: ${name}`;
        document.body.append(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      }, color);
    const [canvas, canvasText] = [await system('Canvas'), await system('CanvasText')];
    for (const selector of ['.surface', '.bar', '.caption']) expect(await style(page, selector, 'background-color'), selector).toBe(canvas);
    for (const selector of ['.count', '.caption-text']) expect(await style(page, selector, 'color'), selector).toBe(canvasText);
    // (WebKit has no forced-color-adjust: it recolors no picture in the first place.)
    if (await page.evaluate(() => CSS.supports('forced-color-adjust', 'none'))) expect(await style(page, SHOWN, 'forced-color-adjust')).toBe('none');
    await page.keyboard.press('ArrowRight');
    await rest(page);
    for (const selector of ['.error-text', '.glyph']) expect(await style(page, selector, 'color'), selector).toBe(canvasText);
    // The focus indicator of the stage is the platform's own.
    await tab(page);
    await tab(page, { back: true });
    expect(await style(page, '.fit', 'outline-style')).toBe('solid');
    await page.emulateMedia({ forcedColors: 'none' });
  });

  test('IMP-42: the stage draws no state layer, no ripple and no pressed or hovered look of its own — a pointer over an image, or a press on it, changes nothing that is drawn — and each control is a Tanrei Button', async ({ page }) => {
    await mount(page, fx({ index: 1 }));
    const drawn = () =>
      part(page, '.stage').evaluate((el) => {
        const read = (pseudo?: string) => {
          const style = getComputedStyle(el, pseudo);
          return [style.backgroundColor, style.backgroundImage, style.boxShadow, style.opacity, style.filter, style.content, style.outlineStyle];
        };
        return { own: read(), before: read('::before'), after: read('::after'), children: el.childElementCount, pressed: el.hasAttribute('data-pressed') };
      });
    const rest_ = await drawn();
    expect(rest_.own.slice(0, 5)).toEqual(['rgba(0, 0, 0, 0)', 'none', 'none', '1', 'none']);
    expect(rest_.children).toBe(0);
    const image_ = (await look(page)).image;
    await page.mouse.move(300, 340);
    await page.mouse.move(320, 345);
    expect(await drawn(), 'hovered').toEqual(rest_);
    await page.mouse.down();
    expect({ ...(await drawn()), own: (await drawn()).own.slice(0, 6) }, 'pressed').toEqual({ ...rest_, own: rest_.own.slice(0, 6) });
    expect((await look(page)).image).toEqual(image_);
    await page.mouse.up();
    await expect(part(page, '.ripple')).toHaveCount(0);
    expect(await host(page).evaluate((el) => [...el.shadowRoot!.querySelectorAll('.controls > *, .previous, .next')].map((element) => element.localName))).toEqual(Array(5).fill('tanrei-button'));
  });

  test('IMP-43: opened with no image it presents nothing, leaves the window as it is and reports an error; images that change while it is open keep index within them, return the zoom to 1 where the image shown is no longer the same one, and draw or drop the count and the previous and next controls for the new number', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
    await mount(page, fx({}, []), { lead: '<button id="behind" autofocus>Behind</button><p style="block-size: 1500px; margin: 0">A page</p>' });
    await page.locator('#behind').focus();
    let seen = await look(page);
    expect(seen.open).toBe(true);
    expect(seen.modal, 'nothing is presented').toBe(false);
    expect(await page.evaluate(() => [document.activeElement?.id, document.documentElement.style.overflow])).toEqual(['behind', '']);
    expect(errors.some((text) => text.includes('IMP-43') && text.includes('no image'))).toBe(true);
    // An image arrives: it is presented.
    const picture = fixturePicture('fixtures/image-preview-landscape.png');
    const add = (alt: string, src = picture) =>
      host(page).evaluate(
        (el, [a, s]) => {
          const item = document.createElement('tanrei-image-preview-item');
          item.setAttribute('src', s);
          item.setAttribute('alt', a);
          el.append(item);
        },
        [alt, src] as const,
      );
    await add('One');
    await expect(part(page, SHOWN)).toHaveCount(1);
    await rest(page);
    seen = await look(page);
    expect(seen.modal).toBe(true);
    expect(seen.focus).toBe('stage');
    await expect(control(page, 'next')).toHaveCount(0);
    await expect(part(page, '.count')).toHaveText('');
    // A second and a third: the count and the controls are drawn.
    await add('Two', fixturePicture('fixtures/image-preview-portrait.png'));
    await add('Three', fixturePicture('fixtures/image-preview-square.png'));
    await expect(part(page, '.count')).toHaveText('1 of 3');
    await expect(control(page, 'next')).toHaveCount(1);
    await page.keyboard.press('End');
    await expect(part(page, '.page[style="--_at: 0"] .image')).toHaveCount(1);
    await rest(page);
    await page.keyboard.press('+');
    await rest(page);
    seen = await look(page);
    expect([seen.index, seen.zoom]).toEqual([2, 2]);
    await record(page);
    // An image before the one shown changes nothing of the image shown; the one shown is taken away: index stays
    // within, and the zoom returns to 1.
    await host(page).evaluate((el) => el.querySelectorAll('tanrei-image-preview-item')[2].remove());
    await settled(page);
    await rest(page);
    seen = await look(page);
    expect(await part(page, '.stage').getAttribute('aria-label')).toBe('Two');
    expect(seen.zoom).toBe(1);
    await expect(part(page, '.count')).toHaveText('2 of 2');
    expect((await events(page, 'zoomchange')).map((event) => event.detail.zoom)).toContain(1);
    expect(await control(page, 'next').evaluate((el: HTMLElement & { disabled: boolean }) => el.disabled)).toBe(true);
    await host(page).evaluate((el) => el.querySelectorAll('tanrei-image-preview-item')[0].remove());
    await settled(page);
    await expect(control(page, 'previous')).toHaveCount(0);
    await expect(part(page, '.count')).toHaveText('');
    expect(await part(page, '.stage').getAttribute('aria-label')).toBe('Two');
  });
});

test.describe('the whole use', () => {
  test('a keyboard-only walk through every operation: open from the product’s button, enlarge, move about the image, return to fit, move between images by arrows, Page keys, Home and End and by each control, read a long caption, and close with focus back on the opener', async ({ page }) => {
    const items = [{ ...LANDSCAPE, props: { ...LANDSCAPE.props, caption: LONG } }, PORTRAIT, SQUARE];
    await mount(page, fx({ open: false }, items), { lead: '<button id="opener" type="button" aria-haspopup="dialog">Enlarge: a bedroom with a window onto a garden</button>' });
    await page.evaluate(() => {
      const preview = document.querySelector('tanrei-image-preview') as HTMLElement & { open: boolean; index: number };
      document.querySelector('#opener')!.addEventListener('click', () => Object.assign(preview, { index: 0, open: true }));
      preview.addEventListener('close', () => (preview.open = false));
    });
    await page.locator('#opener').focus();
    await page.keyboard.press('Enter');
    await rest(page);
    let seen = await look(page);
    expect([seen.modal, seen.focus]).toEqual([true, 'stage']);
    // Enlarge by key, move about, return.
    await page.keyboard.press('+');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await rest(page);
    seen = await look(page);
    expect(seen.zoom).toBe(2);
    expect(centre(seen.image!).x).toBeLessThan(centre(seen.fit).x);
    await page.keyboard.press('0');
    await rest(page);
    expect((await look(page)).zoom).toBe(1);
    // Enlarge and return by the controls (at the first image, at fit, previous and zoom out are passed).
    await tab(page, { back: true });
    await tab(page, { back: true });
    expect((await look(page)).focus).toBe('zoom-in');
    await page.keyboard.press('Space');
    await rest(page);
    expect((await look(page)).zoom).toBe(2);
    await tab(page, { back: true });
    expect((await look(page)).focus).toBe('zoom-out');
    await page.keyboard.press('Enter');
    await rest(page);
    seen = await look(page);
    expect([seen.zoom, seen.focus], 'at fit the zoom-out control is disabled, and focus is on the stage').toEqual([1, 'stage']);
    // Between images: the next control, the arrows, the Page keys, Home and End, the previous control.
    await tab(page);
    await page.keyboard.press('Enter');
    await rest(page);
    expect((await look(page)).index).toBe(1);
    await page.keyboard.press('ArrowRight');
    await rest(page);
    expect((await look(page)).index).toBe(2);
    await page.keyboard.press('PageUp');
    await page.keyboard.press('Home');
    await page.keyboard.press('End');
    await rest(page);
    expect((await look(page)).index).toBe(2);
    await tab(page, { back: true });
    expect((await look(page)).focus).toBe('previous');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await rest(page);
    seen = await look(page);
    expect([seen.index, seen.focus]).toEqual([0, 'stage']);
    // The long caption: a stop of its own, scrolled by the keys.
    await tab(page);
    await tab(page);
    expect((await look(page)).focus).toBe('caption');
    await page.keyboard.press('PageDown');
    await expect.poll(() => part(page, '.caption').evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    // Close by the control, and again by Escape.
    await tab(page);
    await tab(page);
    expect((await look(page)).focus).toBe('close');
    await page.keyboard.press('Enter');
    await settled(page);
    expect((await look(page)).modal).toBe(false);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('opener');
    await page.keyboard.press('Enter');
    await rest(page);
    await page.keyboard.press('Escape');
    await settled(page);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('opener');
    expect((await events(page, 'close')).map((event) => event.detail.reason)).toEqual(['button', 'escape']);
  });

  test('the parts: the container, the bar, the count, the stage, the image, the placeholder, the error and the caption are styled from outside, each control’s host under its name, and each Button’s own parts under the control’s name before theirs', async ({ page }) => {
    const items = [{ ...LANDSCAPE, props: { ...LANDSCAPE.props, caption: 'The east bedroom.' } }, image('missing', 'The desk'), image('', 'A chair')];
    await mount(page, fx({}, items), { lead: '<style>tanrei-image-preview::part(container), tanrei-image-preview::part(bar), tanrei-image-preview::part(count), tanrei-image-preview::part(stage), tanrei-image-preview::part(image), tanrei-image-preview::part(placeholder), tanrei-image-preview::part(error), tanrei-image-preview::part(caption), tanrei-image-preview::part(zoom-out), tanrei-image-preview::part(zoom-in), tanrei-image-preview::part(close), tanrei-image-preview::part(previous), tanrei-image-preview::part(next), tanrei-image-preview::part(close-container), tanrei-image-preview::part(next-icon), tanrei-image-preview::part(zoom-in-label) { outline-offset: 7px }</style>' });
    const offset = (selector: string) => style(page, selector, 'outline-offset');
    for (const selector of ['dialog', '.bar', '.count', '.image', '.caption', 'tanrei-button.zoom-out', 'tanrei-button.zoom-in', 'tanrei-button.close', 'tanrei-button.previous', 'tanrei-button.next']) expect(await offset(selector), selector).toBe('7px');
    expect(await control(page, 'close').evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('[part="container"]')!).outlineOffset)).toBe('7px');
    expect(await control(page, 'next').evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('[part="icon"]')!).outlineOffset)).toBe('7px');
    expect(await control(page, 'zoom-in').evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('[part="label"]')!).outlineOffset)).toBe('7px');
    // A Button's part is not reached under its own name: there are five of them.
    expect(await host(page).evaluate((el) => (el.constructor as unknown as { parts: string[] }).parts)).toEqual(expect.arrayContaining(['container', 'stage', 'placeholder', 'close', 'close-container', 'previous-icon']));
    await page.keyboard.press('ArrowRight');
    await rest(page);
    expect(await offset('.error')).toBe('7px');
    await page.keyboard.press('ArrowRight');
    await rest(page);
    expect(await offset('.waiting')).toBe('7px');
    // The stage's own focus is drawn by the fit area's edge, so its own outline is the product's to set.
    expect(await part(page, '.stage').evaluate((el) => getComputedStyle(el).outlineOffset)).toBe('7px');
  });
});

test.describe('accessibility', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`no axe violations in ${theme}, every fixture, open`, async ({ page }) => {
      test.setTimeout(180_000);
      for (const f of spec.fixtures) {
        await mount(page, f, { theme, loaded: !f.id.startsWith('loading') });
        expect((await look(page)).modal, `${f.id} is open`).toBe(true);
        const results = await new AxeBuilder({ page }).include('.stage').analyze();
        expect(results.violations, `${theme} ${f.id}: ${results.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(' ')}`).join(', ')}`).toEqual([]);
      }
    });
  }
});

test.describe('fixtures', () => {
  // The spec's snapshot harness: each fixture alone in a 640 × 640 window, and `several` and `caption` again in a
  // 360 × 640 one; the preview is in the top layer, so the baseline is the window.
  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mount(page, f, { reducedMotion: true, loaded: !f.id.startsWith('loading') });
      await expect(page).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
  for (const id of ['several', 'caption']) {
    test(`snapshot: compact-${id}`, async ({ page }) => {
      await mount(page, fixtureOf(id), { window: COMPACT, reducedMotion: true });
      await expect(page).toHaveScreenshot([spec.name, `compact-${id}.png`]);
    });
  }
});
