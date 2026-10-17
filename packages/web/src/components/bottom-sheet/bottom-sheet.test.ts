// <tanrei-bottom-sheet>, driven by specs/bottom-sheet.spec.json: every behaviour id (BSH-1…30) is cited by a test title,
// every fixture has a baseline, and every value is read back from the tokens.
import AxeBuilder from '@axe-core/playwright';
import { atRest } from '../../../test/at-rest.js';
import { type Page, expect, test } from '@playwright/test';
import { bounds, css, override, warnings } from '../../../test/destinations.js';
import { clickCentre, heldPress } from '../../../test/watched-press.js';
import { type Fixture, acmeSystemCss, innerStrokeAtEdges, loadSpec, mountFixtures, resolveColor, resolveToken, tab, tabTo } from '../../../test/harness.js';
import { expectKeyPressOutlastsPointer } from '../../../test/key-press-pointer-leaves.js';
import { motionEnded } from '../../../test/motions.js';
import { STOPPED_AFTER, flingThenHold, strokes } from '../../../test/stopped-release.js';

const spec = loadSpec('bottom-sheet');
type P = Page;
/** The spec's stage: a 400 × 720 window on a surface page. */
const WINDOW = { width: 400, height: 720 };
const T = (name: string) => `--tanrei-comp-bottom-sheet-${name}`;
const fixtureOf = (id: string) => spec.fixtures.find((f) => f.id === id)!;
const SHORT = fixtureOf('modal').content!;
const LONG = fixtureOf('modal-partial').content!;
const fx = (id: string, props: Fixture['props'] = {}, content: string = SHORT): Fixture => ({ id, props: { open: true, label: 'Sheet', handleLabel: 'Resize sheet', ...props }, content });

const host = (page: P, id = 's') => page.locator(`[data-fixture="${id}"] tanrei-bottom-sheet`);
const sheet = (page: P, id = 's') => host(page, id).locator('.sheet');
const handle = (page: P, id = 's') => host(page, id).locator('.handle');
const grip = (page: P, id = 's') => host(page, id).locator('.grip');
const content = (page: P, id = 's') => host(page, id).locator('.content');
const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const px = (page: P, name: string) => resolveToken(page, name);
const ms = (page: P, name: string) => resolveToken(page, name, 'duration');
const top = async (page: P, id = 's') => (await bounds(sheet(page, id))).y;
const scrollTop = (page: P, id = 's') => content(page, id).evaluate((el) => el.scrollTop);
const shadowOf = (page: P, n: string) =>
  page.evaluate((name) => {
    const p = document.createElement('div');
    p.style.boxShadow = `var(${name})`;
    document.body.appendChild(p);
    const v = getComputedStyle(p).boxShadow;
    p.remove();
    return v;
  }, n);

/** Every sheet has rendered and measured itself, and two frames have passed. */
const settled = (page: P) =>
  page.evaluate(async () => {
    for (const el of document.querySelectorAll<any>('tanrei-bottom-sheet')) await el.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    for (const el of document.querySelectorAll<any>('tanrei-bottom-sheet')) await el.updateComplete;
  });
async function mount(page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) {
  await page.setViewportSize(WINDOW);
  await mountFixtures(page, spec, { fixtures, ...options });
  await settled(page);
}
/**
 * Waits for the sheet's own motion (a settle, a slide) to end. A frame passes first: a motion that starts in the next
 * frame (a declined drag holds for one, BSH-20) is then already running, not missed by a check made before it began.
 */
const still = async (page: P, id = 's') => {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect.poll(() => sheet(page, id).evaluate((el) => el.getAnimations().filter((a) => a.playState === 'running').length)).toBe(0);
};

const wire = (page: P) =>
  page.evaluate(() => {
    const log: string[] = ((window as any).log = []);
    for (const el of document.querySelectorAll<any>('tanrei-bottom-sheet')) {
      el.addEventListener('close', (e: any) => log.push(`close:${e.detail.reason}`));
      el.addEventListener('detentchange', (e: any) => log.push(`detent:${e.detail.detent}:${el.detent}`));
    }
  });
const log = (page: P) => page.evaluate(() => (window as any).log as string[]);
/** Closes the sheet whenever it asks, as a product does. */
const closeOnRequest = (page: P) => page.evaluate(() => document.querySelectorAll<any>('tanrei-bottom-sheet').forEach((el) => el.addEventListener('close', () => (el.open = false))));

/** What has focus, through shadow roots: its id, else its tag. */
const focused = (page: P) =>
  page.evaluate(() => {
    let active: Element | null = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    return active?.id || active?.localName || null;
  });

/** The handle's centre. */
const handleCentre = async (page: P, id = 's') => {
  const box = await bounds(handle(page, id));
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};
/** A slow drag (released after a pause: no fling), or not released. */
async function drag(page: P, from: { x: number; y: number }, dy: number, { steps = 10, release = true } = {}) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) await page.mouse.move(from.x, from.y + (dy * i) / steps);
  await page.waitForTimeout(120);
  if (release) await page.mouse.up();
}
/**
 * A fast drag, released while still moving: dispatched in the page, each event stamped 8 ms after the one before — the
 * time the finger was there, as a touchscreen stamps it. The sheet measures a release's velocity on those stamps, so a
 * fling is a fling however late the page's timers run on a loaded machine (an unstamped event carries the time it was
 * created: one 8 ms wait stretched past 40 ms made this fling slower than a fling). The real waits are at least as long
 * as the stamps, so no stamp is in the future.
 */
async function fling(page: P, from: { x: number; y: number }, dy: number) {
  await page.evaluate(
    async ([x, y, d]) => {
      const sheet = document.querySelector('tanrei-bottom-sheet')!;
      const target = sheet.shadowRoot!.elementFromPoint(x, y)!;
      let stamp = performance.now();
      const at = (type: string, yy: number) => {
        const event = new PointerEvent(type, { bubbles: true, composed: true, pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: x, clientY: yy });
        Object.defineProperty(event, 'timeStamp', { value: stamp });
        return event;
      };
      target.dispatchEvent(at('pointerdown', y));
      for (let i = 1; i <= 3; i++) {
        await new Promise((resolve) => setTimeout(resolve, 8));
        stamp += 8;
        target.dispatchEvent(at('pointermove', y + (d * i) / 3));
      }
      target.dispatchEvent(at('pointerup', y + d));
    },
    [from.x, from.y, dy] as const,
  );
}

/**
 * The sheet as seen at one moment: its top edge (null where it is not drawn), and each animation running on it — the
 * duration, and the property of a CSS transition (empty for the sheet's own settle).
 */
type Seen = { top: number | null; durations: number[]; transitions: [string, number][] };
/**
 * Watches the next release from inside the page: at the pointerup, after the sheet's own handler (which listens on the
 * window in the capture phase), and in the next frame, after the sheet's own frame callback. What is seen then does not
 * depend on how long the test's next command takes to reach the browser — on a loaded runner that can be most of a
 * motion. Read it with `released()` once the pointer is up.
 */
const watchRelease = (page: P, id = 's') =>
  host(page, id).evaluate((el) => {
    const sheet = el.shadowRoot!.querySelector<HTMLElement>('.sheet')!;
    const seen = () => {
      const animations = sheet.getAnimations();
      return {
        top: sheet.getClientRects().length ? sheet.getBoundingClientRect().top : null,
        // Whole milliseconds, as the token is: Firefox reports a token of 200 ms as 200.000015 (a float of seconds).
        durations: animations.map((a) => Math.round(Number(a.effect!.getTiming().duration))),
        transitions: animations.map((a) => [(a as CSSTransition).transitionProperty ?? '', Math.round(Number(a.effect!.getTiming().duration))]),
      };
    };
    (window as any).released = new Promise((resolve) => {
      window.addEventListener(
        'pointerup',
        () => {
          const asked = [...((window as any).log ?? [])];
          const atRelease = seen();
          requestAnimationFrame(() => resolve({ asked, atRelease, nextFrame: seen() }));
        },
        { once: true },
      );
    });
  });
/** What `watchRelease()` saw: the requests made by the release, the sheet at it, and the sheet a frame later. */
const released = (page: P) => page.evaluate(() => (window as any).released as Promise<{ asked: string[]; atRelease: Seen; nextFrame: Seen }>);

test.describe('drawing', () => {
  test('BSH-7: at the bottom edge of the window, as wide as it but no wider than container.max-width and centred, on container.color with its elevation, the top corners rounded and the bottom ones square', async ({ page }) => {
    await mount(page, [fx('s')]);
    const box = await bounds(sheet(page));
    expect(box.y + box.height).toBeCloseTo(WINDOW.height, 1);
    expect(box.x).toBe(0);
    expect(box.width).toBe(WINDOW.width);
    await expect(sheet(page)).toHaveCSS('background-color', await resolveColor(page, T('container-color')));
    expect(await css(sheet(page), 'box-shadow')).toBe(await shadowOf(page, T('container-elevation')));
    const radius = await px(page, T('container-shape'));
    expect(Number.parseFloat(await css(sheet(page), 'border-top-left-radius'))).toBeCloseTo(radius, 1);
    expect(Number.parseFloat(await css(sheet(page), 'border-top-right-radius'))).toBeCloseTo(radius, 1);
    expect(await css(sheet(page), 'border-bottom-left-radius')).toBe('0px');
    expect(await css(sheet(page), 'border-bottom-right-radius')).toBe('0px');
    // A wider window: container.max-width, centred.
    const max = await px(page, T('container-max-width'));
    await page.setViewportSize({ width: 1000, height: 720 });
    await expect.poll(async () => (await bounds(sheet(page))).width).toBe(max);
    expect((await bounds(sheet(page))).x).toBe((1000 - max) / 2);
  });

  test('BSH-6, BSH-7: as tall as its handle row and content up to its detent — partial-fraction of the area, or the area less margin-block-start; above the on-screen keyboard, from the smaller area', async ({ page }) => {
    await mount(page, [fx('short'), fx('partial', {}, LONG), fx('full', { detent: 'full' }, LONG)]);
    const [boxH, margin, pad, fraction, gap] = [await px(page, T('handle-container-height')), await px(page, T('handle-margin-block')), await px(page, T('container-padding')), Number(await token(page, T('container-partial-fraction'))), await px(page, T('container-margin-block-start'))];
    // One height: the handle's row, the content and its padding.
    const text = (await bounds(host(page, 'short').locator('.inner'))).height;
    expect((await bounds(sheet(page, 'short'))).height).toBeCloseTo(boxH + 2 * margin + text + pad, 0);
    await expect(host(page, 'short').locator('button.handle')).toHaveCount(0);
    expect(await top(page, 'partial')).toBeCloseTo(WINDOW.height * (1 - fraction), 1);
    expect(await top(page, 'full')).toBeCloseTo(gap, 1);
    // The keyboard covers the bottom 300 of the window: the sheet sits on it, and its heights come from the 420 left.
    await page.evaluate(() => {
      const viewport = window.visualViewport!;
      Object.defineProperty(viewport, 'height', { configurable: true, get: () => 420 });
      viewport.dispatchEvent(new Event('resize'));
    });
    await expect.poll(async () => {
      const b = await bounds(sheet(page, 'partial'));
      return Math.round(b.y + b.height);
    }).toBe(420);
    expect(await top(page, 'partial')).toBeCloseTo(420 * (1 - fraction), 1);
    expect(await top(page, 'full')).toBeCloseTo(gap, 1);
    await expect(sheet(page, 'partial')).toHaveClass(/keyboard/);
    await expect(sheet(page, 'partial')).toHaveCSS('padding-bottom', '0px');
  });

  test('BSH-6: a standard sheet takes its heights from the parent the product placed it in', async ({ page }) => {
    await mount(page, [fx('s', { variant: 'standard' }, LONG)]);
    await page.locator('[data-fixture="s"]').evaluate((el) => ((el as HTMLElement).style.blockSize = '500px'));
    await expect.poll(async () => Math.round((await bounds(sheet(page))).height)).toBe(250);
    const stage = await bounds(page.locator('[data-fixture="s"]'));
    const box = await bounds(sheet(page));
    expect(box.y + box.height).toBeCloseTo(stage.y + stage.height, 1);
  });

  test('BSH-8: the content is inset by container.padding at the start, end and bottom (the top too without a handle), reaches the edges when flush, is clipped, and gets content.color and the body role', async ({ page }) => {
    const probe = `<span id="t">${SHORT}</span>`;
    await mount(page, [fx('s', {}, probe), fx('bare', { handle: false }, probe), fx('flush', { inset: false }, probe)]);
    const pad = await px(page, T('container-padding'));
    const row = (await px(page, T('handle-container-height'))) + 2 * (await px(page, T('handle-margin-block')));
    const inner = (id: string) => bounds(host(page, id).locator('.inner'));
    const s = await bounds(sheet(page));
    expect((await inner('s')).x).toBeCloseTo(s.x + pad, 1);
    expect((await inner('s')).y).toBeCloseTo(s.y + row, 1);
    expect((await inner('s')).width).toBeCloseTo(s.width - 2 * pad, 1);
    const i = await inner('s');
    expect(s.y + s.height - (i.y + i.height)).toBeCloseTo(pad, 1);
    const bare = await bounds(sheet(page, 'bare'));
    expect((await inner('bare')).y).toBeCloseTo(bare.y + pad, 1);
    const flush = await bounds(sheet(page, 'flush'));
    expect((await inner('flush')).x).toBeCloseTo(flush.x, 1);
    expect((await inner('flush')).y).toBeCloseTo(flush.y + row, 1);
    await expect(content(page)).toHaveCSS('overflow-y', 'auto');
    await expect(content(page)).toHaveCSS('overflow-x', 'hidden');
    // Without a handle the content's top corners are the container's.
    expect(Number.parseFloat(await css(content(page, 'bare'), 'border-top-left-radius'))).toBeCloseTo(await px(page, T('container-shape')), 1);
    const t = page.locator('[data-fixture="s"] #t');
    await expect(t).toHaveCSS('color', await resolveColor(page, T('content-color')));
    await expect(t).toHaveCSS('font-size', `${await px(page, '--tanrei-sys-typescale-body-font-size')}px`);
  });

  test('BSH-12: the handle row — a box handle.container-width × container-height with its corners, centred, margin-block above and below, on its container color, and the grip centred in it — stays in place while the content scrolls', async ({ page }) => {
    await mount(page, [fx('s', { detent: 'full' }, LONG)]);
    const [bw, bh, margin, gw, gh] = await Promise.all(['handle-container-width', 'handle-container-height', 'handle-margin-block', 'handle-grip-width', 'handle-grip-height'].map((n) => px(page, T(n))));
    const s = await bounds(sheet(page));
    const box = await bounds(handle(page));
    expect([box.width, box.height]).toEqual([bw, bh]);
    expect(box.x + box.width / 2).toBeCloseTo(s.x + s.width / 2, 1);
    expect(box.y - s.y).toBeCloseTo(margin, 1);
    expect((await bounds(content(page))).y - (box.y + box.height)).toBeCloseTo(margin, 1);
    const g = await bounds(grip(page));
    expect([g.width, g.height]).toEqual([gw, gh]);
    expect(g.x + g.width / 2).toBeCloseTo(box.x + box.width / 2, 1);
    expect(g.y + g.height / 2).toBeCloseTo(box.y + box.height / 2, 1);
    await page.mouse.move(5, 5);
    await expect(handle(page)).toHaveCSS('background-color', await resolveColor(page, T('drag-handle-container-color')));
    await expect(grip(page)).toHaveCSS('background-color', await resolveColor(page, T('drag-handle-grip-color')));
    expect(Number.parseFloat(await css(handle(page), 'border-top-left-radius'))).toBeGreaterThanOrEqual(bh / 2);
    await content(page).evaluate((el) => (el.scrollTop = 300));
    expect(await scrollTop(page)).toBeGreaterThan(0);
    expect((await bounds(handle(page))).y).toBe(box.y);
  });

  test('BSH-15: the handle’s hit area is its whole row across its box, at least sys.target.pointer for a fine pointer, without changing its drawn size', async ({ page }) => {
    await mount(page, [fx('s', {}, LONG)]);
    const [bw, bh, margin, pointer] = await Promise.all([T('handle-container-width'), T('handle-container-height'), T('handle-margin-block'), '--tanrei-sys-target-pointer'].map((n) => px(page, n)));
    const before = (property: string) => handle(page).evaluate((el, p) => Number.parseFloat(getComputedStyle(el, '::before').getPropertyValue(p)), property);
    expect(await before('height')).toBe(Math.max(bh + 2 * margin, pointer));
    expect(await before('width')).toBe(Math.max(bw, pointer));
    const s = await bounds(sheet(page));
    const at = (x: number, y: number) => host(page).evaluate((el, [xx, yy]) => el.shadowRoot!.elementFromPoint(xx, yy)?.closest('button')?.className ?? null, [x, y]);
    expect(await at(s.x + s.width / 2, s.y + 1)).toBe('handle');
    expect(await at(s.x + s.width / 2, s.y + bh + 2 * margin - 1)).toBe('handle');
    // A system whose row is shorter than the target (cupertino's) still reaches it, the box drawn at its size.
    await override(page, { [T('handle-margin-block')]: '0px' });
    expect(await before('height')).toBe(pointer);
    expect((await bounds(handle(page))).height).toBe(bh);
  });

  test('BSH-24: enlarged text grows the sheet with its content up to its detent’s height and scrolls beyond it; the handle does not scale', async ({ page }) => {
    await mount(page, [fx('short'), fx('long', {}, LONG)]);
    const before = (await bounds(sheet(page, 'short'))).height;
    const box = await bounds(handle(page, 'short'));
    await override(page, { '--tanrei-dial-type-base': '32px' });
    await expect.poll(async () => (await bounds(sheet(page, 'short'))).height).toBeGreaterThan(before + 40);
    const after = await bounds(handle(page, 'short'));
    expect([after.width, after.height]).toEqual([box.width, box.height]);
    expect(await top(page, 'long')).toBeCloseTo(WINDOW.height / 2, 1);
    expect(await content(page, 'long').evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  });

  test('BSH-26: right-to-left keeps the container and the handle centred, and the content follows the direction', async ({ page }) => {
    await mount(page, [fx('s', {}, `<span id="t">Nearby</span>`)]);
    await page.evaluate(() => (document.documentElement.dir = 'rtl'));
    await page.setViewportSize({ width: 1000, height: 720 });
    const max = await px(page, T('container-max-width'));
    await expect.poll(async () => (await bounds(sheet(page))).x).toBe((1000 - max) / 2);
    const s = await bounds(sheet(page));
    const box = await bounds(handle(page));
    expect(box.x + box.width / 2).toBeCloseTo(s.x + s.width / 2, 1);
    await expect(content(page)).toHaveCSS('direction', 'rtl');
    const t = await bounds(page.locator('#t'));
    expect(t.x + t.width).toBeCloseTo(s.x + s.width - (await px(page, T('container-padding'))), 0);
  });

  test('BSH-22: a modal dialog named by the label, or a region named by it (a landmark); the grip is hidden, the handle exposed only as BSH-11 says; an empty label renders and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fixtureOf('modal')]);
    await expect(page.getByRole('dialog', { name: 'Save photo' })).toHaveCount(1);
    expect(await host(page, 'modal').locator('dialog').evaluate((el) => el.matches(':modal'))).toBe(true);
    await expect(grip(page, 'modal')).toHaveAttribute('aria-hidden', 'true');
    await expect(handle(page, 'modal')).toHaveAttribute('aria-hidden', 'true');
    await mount(page, [fixtureOf('standard')]);
    await expect(page.getByRole('region', { name: 'Nearby places' })).toHaveCount(1);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await mount(page, [fx('s', { label: '' })]);
    await expect(sheet(page)).toBeVisible();
    await expect.poll(() => seen.filter((w) => w.includes('BSH-22')).length).toBe(1);
    expect(seen.join('\n')).toMatch(/label and headline are empty, so the modal dialog has no accessible name/);
    // A headline names it where label is empty, and then nothing is reported.
    seen.length = 0;
    await mount(page, [fx('s', { label: '', headline: 'Share photo' })]);
    await expect(page.getByRole('dialog', { name: 'Share photo' })).toHaveCount(1);
    await settled(page);
    expect(seen.filter((w) => w.includes('BSH-22'))).toEqual([]);
  });

  test('BSH-25: a variant or detent the sheet does not define renders with the default and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('s', { variant: 'drawer', detent: 'half' }, LONG)]);
    expect(await host(page).locator('dialog').evaluate((el) => el.matches(':modal'))).toBe(true);
    expect(await top(page)).toBeCloseTo(WINDOW.height / 2, 1);
    await expect.poll(() => seen.filter((w) => w.includes('BSH-25')).length).toBe(2);
    expect(seen.join('\n')).toMatch(/variant "drawer" is not defined/);
    expect(seen.join('\n')).toMatch(/detent "half" is not defined/);
  });
});

test.describe('the drag handle', () => {
  test.beforeAll(async () => {
    test.setTimeout(240_000);
    await acmeSystemCss();
  });

  test('BSH-11: with two heights the handle is one button named by handle-label, expanded at full; a pointer, Enter or Space moves the sheet to its other height and fires detentchange once; at one height it is not focusable or exposed; an empty handle-label is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('s', {}, LONG)]);
    await wire(page);
    const button = host(page).getByRole('button', { name: 'Resize sheet' });
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(() => top(page)).toBeCloseTo(await px(page, T('container-margin-block-start')), 0);
    await still(page);
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Space');
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(await log(page)).toEqual(['detent:full:full', 'detent:partial:partial', 'detent:full:full']);
    // One height: drawn, and nothing to focus or assistive technology.
    await mount(page, [fx('s'), fx('empty', { handleLabel: '' }, LONG)]);
    await expect(host(page).locator('button')).toHaveCount(0);
    await expect(handle(page)).toBeVisible();
    await expect(handle(page)).toHaveAttribute('aria-hidden', 'true');
    await expect(handle(page, 'empty')).toBeVisible();
    await expect.poll(() => seen.filter((w) => w.includes('BSH-11')).length).toBe(1);
  });

  test('BSH-13: each state draws the handle’s box, grip and opacity from that state’s tokens, pressed over focused over hovered; pointer focus is not the focused state; a drag from the handle does not leave it pressed', async ({ page, browserName }) => {
    const drawn = () => handle(page).evaluate((el) => ({ box: getComputedStyle(el).backgroundColor, grip: getComputedStyle(el.querySelector('.grip')!).backgroundColor, opacity: getComputedStyle(el).opacity }));
    const expected = async (state = '') => ({
      box: await resolveColor(page, T(`drag-handle-${state ? `${state}-` : ''}container-color`)),
      grip: await resolveColor(page, T(`drag-handle-${state ? `${state}-` : ''}grip-color`)),
      opacity: state ? await token(page, T(`${state}-opacity`)) : '1',
    });
    await mount(page, [fx('s', {}, LONG)]);
    await page.mouse.move(5, 5);
    await expect.poll(drawn).toEqual(await expected());
    await handle(page).hover();
    await expect.poll(drawn).toEqual(await expected('hovered'));
    await page.mouse.down();
    await expect.poll(drawn).toEqual(await expected('pressed'));
    await page.mouse.up();
    await page.mouse.move(5, 5);
    if (browserName !== 'webkit') await expect(handle(page)).toBeFocused();
    await expect.poll(drawn).toEqual(await expected());
    await mount(page, [fx('s', {}, LONG)]);
    await tabTo(page, handle(page));
    await expect.poll(drawn).toEqual(await expected('focused'));
    // Under acme the three states differ: pressed beats focused beats hovered.
    await mount(page, [fx('s', {}, LONG)], { system: 'acme', systemCss: await acmeSystemCss() });
    const bg = () => css(handle(page), 'background-color');
    const [rest, hovered, focus, down] = await Promise.all(['', 'hovered-', 'focused-', 'pressed-'].map((s) => resolveColor(page, T(`drag-handle-${s}container-color`))));
    expect(new Set([rest, hovered, focus, down]).size).toBe(4);
    await page.mouse.move(5, 5);
    await expect.poll(bg).toBe(rest);
    await handle(page).hover();
    await expect.poll(bg).toBe(hovered);
    await tabTo(page, handle(page));
    await expect.poll(bg).toBe(focus);
    await page.keyboard.down('Space');
    await expect.poll(bg).toBe(down);
    await page.keyboard.up('Space');
    // A drag that starts on the handle: once the sheet follows, the handle is not pressed.
    await mount(page, [fx('s', {}, LONG)]);
    await drag(page, await handleCentre(page), -60, { release: false });
    await expect(handle(page)).not.toHaveAttribute('data-pressed');
    await expect(handle(page).locator('.ripple')).toHaveCount(0);
    await page.mouse.up();
  });

  test('BSH-14: keyboard focus shows the ring around the handle’s box, without animation; pointer focus does not', async ({ page }) => {
    await mount(page, [fx('s', {}, LONG)]);
    const [outer, offset, inner] = await Promise.all(['--tanrei-sys-focus-outer-width', '--tanrei-sys-focus-offset', '--tanrei-sys-focus-inner-width'].map((n) => px(page, n)));
    await handle(page).click();
    await expect(handle(page)).toHaveCSS('outline-style', 'none');
    await mount(page, [fx('s', {}, LONG)]);
    await tabTo(page, handle(page));
    await expect(handle(page)).toHaveCSS('outline-style', 'solid');
    await expect(handle(page)).toHaveCSS('outline-width', `${outer}px`);
    await expect(handle(page)).toHaveCSS('outline-offset', `${offset + inner}px`);
    expect(await css(handle(page), 'transition-property')).not.toContain('outline');
  });

  test('BSH-16: a press that ends within a frame — Enter, Space, a click — is shown at once and for at least press-hold', async ({ page }) => {
    for (const [name, activate] of [
      ['Enter', () => page.keyboard.press('Enter')],
      ['Space', () => page.keyboard.press('Space')],
      ['click', () => clickCentre(page, handle(page))],
    ] as const) {
      await mount(page, [fx('s', {}, LONG)]);
      const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
      expect(hold, name).toBe(100);
      await handle(page).evaluate((el: HTMLElement) => el.focus());
      await handle(page).evaluate((el) => {
        const l: { down?: number; on?: number; off?: number; up?: number } = ((window as any).press = {});
        new MutationObserver(() => {
          if (el.hasAttribute('data-pressed')) l.on ??= performance.now();
          else if (l.on !== undefined) l.off ??= performance.now();
        }).observe(el, { attributes: true, attributeFilter: ['data-pressed'] });
        for (const type of ['pointerup', 'keyup']) window.addEventListener(type, () => (l.up ??= performance.now()), true);
        for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => (l.down ??= performance.now()), true);
      });
      // The press and the hold on the page's clock, held still: the press is over in no page time at all, so it is the
      // short one at the system's own hold, however long the driver takes to send the release.
      await heldPress(page, hold, activate, async () => (await page.evaluate(() => (window as any).press.off)) !== undefined, name);
      const logged = await page.evaluate(() => (window as any).press);
      expect(logged.up - logged.on, name).toBeLessThan(hold);
      expect(logged.off - logged.down, name).toBeGreaterThanOrEqual(hold - 1);
    }
  });

  test('BSH-17: overlay (default), ripple (m3-like), dim (cupertino) and none each answer the press; an unknown name is the first', async ({ page }) => {
    const press = async (system?: string, feedback?: string) => {
      await mount(page, [fx('s', {}, LONG)], system ? { system } : {});
      if (feedback) await override(page, { '--tanrei-sys-behavior-pressed-feedback': feedback });
      await override(page, { [T('drag-handle-pressed-grip-color')]: 'rgb(0, 0, 255)' });
      const h = handle(page);
      await h.hover();
      await expect.poll(() => css(h, 'background-color')).toBe(await resolveColor(page, T('drag-handle-hovered-container-color')));
      // Pressed once the hovered color has ended its motion: the poll passes on its last frames, where the color reads
      // as its end value and, a frame later, one channel a step of 1e-6 off it (Firefox).
      await motionEnded(h);
      const hovered = await css(h, 'background-color');
      await page.mouse.down();
      const result = { pressed: await h.getAttribute('data-pressed'), bg: await css(h, 'background-color'), hovered, grip: await css(grip(page), 'background-color'), ripple: await h.locator('.ripple').count(), opacity: await css(h, 'opacity') };
      await page.mouse.up();
      return result;
    };
    const overlay = await press();
    expect(overlay).toMatchObject({ pressed: 'overlay', ripple: 0, grip: 'rgb(0, 0, 255)' });
    expect(overlay.bg).toBe(await resolveColor(page, T('drag-handle-pressed-container-color')));
    const ripple = await press('m3-like');
    expect(ripple).toMatchObject({ pressed: 'ripple', ripple: 1, grip: 'rgb(0, 0, 255)' });
    expect(ripple.bg).toBe(ripple.hovered);
    const dim = await press('cupertino');
    expect(dim).toMatchObject({ pressed: 'dim', ripple: 0, grip: 'rgb(0, 0, 255)' });
    expect(dim.opacity).toBe(await token(page, T('pressed-opacity')));
    const none = await press(undefined, 'none');
    expect(none).toMatchObject({ pressed: 'none', ripple: 0 });
    expect(none.bg).toBe(none.hovered);
    expect((await press(undefined, 'sparkle')).pressed).toBe('overlay');
    // A keyboard press grows the ripple from the centre over feedback-duration; it fades over state-duration. The pointer
    // the presses above left on the handle goes to the window's corner first, so that only the key presses the handle
    // here (a pointer that Enter's rise leaves behind ends no press of the key's: the test after this one).
    await mount(page, [fx('s', {}, LONG)], { system: 'm3-like' });
    await page.mouse.move(0, 0);
    await tabTo(page, handle(page));
    await page.keyboard.down('Enter');
    const layer = await handle(page)
      .locator('.ripple')
      .evaluate((el) => {
        const s = getComputedStyle(el);
        return { x: Number.parseFloat(el.style.getPropertyValue('--_x')) / el.getBoundingClientRect().width, grow: Number.parseFloat(s.animationDuration) * 1000, fade: Number.parseFloat(s.transitionDuration) * 1000 };
      });
    await page.keyboard.up('Enter');
    expect(layer.x).toBeCloseTo(0.5, 5);
    expect(layer.grow).toBe(await ms(page, T('motion-feedback-duration')));
    expect(layer.fade).toBe(await ms(page, T('motion-state-duration')));
  });

  test('BSH-17: Enter raises the sheet and moves the handle out from under the pointer resting on it; the handle stays pressed while the key is down, and the keyup ends it', async ({ page }) => {
    await mount(page, [fx('s', {}, LONG)]);
    const before = await top(page);
    await expectKeyPressOutlastsPointer(page, {
      control: handle(page),
      key: 'Enter',
      // The sheet rose to its full height: the handle is far above the pointer, which has not moved.
      whileDown: async () => {
        await expect.poll(() => top(page)).toBeCloseTo(await px(page, T('container-margin-block-start')), 0);
        await still(page);
        expect(before - (await top(page))).toBeGreaterThan((await bounds(handle(page))).height);
      },
      away: null,
    });
  });

  test('BSH-18 corner smoothing and focus-style: cupertino eases the container’s top corners; acme shows the handle’s focus as a glow', async ({ page }) => {
    await mount(page, [fx('s', {}, LONG)], { system: 'cupertino' });
    expect(await token(page, '--tanrei-sys-shape-corner-smoothing')).toBe('0.6');
    const radius = await px(page, T('container-shape'));
    if (await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'))) {
      expect(Number.parseFloat((await css(sheet(page), 'corner-top-left-shape')).replace(/^superellipse\(|\)$/g, ''))).toBeCloseTo(Math.log2(2.6), 3);
      expect(Number.parseFloat(await css(sheet(page), 'border-top-left-radius'))).toBeCloseTo(radius * 1.24, 1);
      // The handle's box is a pill (corner.full): round caps whatever the smoothing.
      expect(await css(handle(page), 'corner-top-left-shape')).toMatch(/^(round|superellipse\(1\))$/);
    } else expect(Number.parseFloat(await css(sheet(page), 'border-top-left-radius'))).toBe(radius);

    await mount(page, [fx('s', {}, LONG)], { system: 'acme', systemCss: await acmeSystemCss() });
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('glow');
    await override(page, { '--tanrei-sys-focus-inner-width': '1px', '--tanrei-sys-color-focus-ring-inner': 'rgb(255, 255, 255)' });
    const outer = await px(page, '--tanrei-sys-focus-outer-width');
    await tabTo(page, handle(page));
    expect(await css(handle(page), 'outline-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(handle(page), 'box-shadow', '::after')).toBe(`rgb(255, 255, 255) 0px 0px 1px 1px, ${await resolveColor(page, '--tanrei-sys-color-focus-ring')} 0px 0px ${outer}px ${outer + 1}px`);
    await expect(handle(page)).toHaveAttribute('data-focus-style', 'glow');
  });

  test('BSH-19: the handle’s colors move over motion.state-duration with motion.state-easing, at once where motion is reduced', async ({ page }) => {
    await mount(page, [fx('s', {}, LONG)]);
    const duration = await ms(page, T('motion-state-duration'));
    expect(Number.parseFloat(await css(handle(page), 'transition-duration')) * 1000).toBe(duration);
    expect(await css(handle(page), 'transition-property')).toContain('background-color');
    expect(await css(handle(page), 'transition-timing-function')).toBe(await page.evaluate((n) => {
      const p = document.createElement('div');
      p.style.transitionTimingFunction = `var(${n})`;
      document.body.appendChild(p);
      const v = getComputedStyle(p).transitionTimingFunction;
      p.remove();
      return v;
    }, T('motion-state-easing')));
    expect(Number.parseFloat(await css(grip(page), 'transition-duration')) * 1000).toBe(duration);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(handle(page), 'transition-duration')).toBe('0s');
    expect(await css(grip(page), 'transition-duration')).toBe('0s');
  });
});

test.describe('forms, focus and dismissal', () => {
  const opener = (page: P) =>
    page.evaluate(() => {
      document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<button id="opener">Open</button>');
      document.querySelector('main')!.insertAdjacentHTML('beforeend', '<button id="after">After</button>');
    });
  const setOpen = (page: P, open: boolean, id = 's') => host(page, id).evaluate(async (el: any, o) => {
    el.open = o;
    await el.updateComplete;
  }, open);
  /**
   * Opens the sheet and lists the transitions it starts, in the same task: no frame can pass between the two, so the list
   * does not depend on how long the test's next command takes to reach the browser (a loaded runner can take longer than
   * the whole enter motion).
   */
  const openMoving = (page: P, id = 's') =>
    host(page, id).evaluate(async (el: any) => {
      el.open = true;
      await el.updateComplete;
      return (el.shadowRoot.querySelector('.sheet') as HTMLElement).getAnimations().map((a) => (a as CSSTransition).transitionProperty);
    });

  test('BSH-1: opening slides the sheet up over the enter motion, a modal one over a scrim fading in; closing slides it down over the exit motion; reduced motion fades in place; mounted open, it appears without motion', async ({ page }) => {
    await mount(page, [fx('s', { open: false }, LONG)]);
    const [enter, exit] = [await ms(page, T('motion-enter-duration')), await ms(page, T('motion-exit-duration'))];
    const dialog = host(page).locator('dialog');
    expect(await openMoving(page)).toContain('translate');
    expect(await dialog.evaluate((el) => el.matches(':modal'))).toBe(true);
    expect(Number.parseFloat(await css(dialog, 'transition-duration')) * 1000).toBeCloseTo(enter, 0);
    expect(await css(dialog, 'transition-property')).toContain('translate');
    expect(await css(dialog, 'background-color', '::backdrop')).toBe(await resolveColor(page, T('scrim-color')));
    await still(page);
    expect(await top(page)).toBeCloseTo(WINDOW.height / 2, 1);
    await setOpen(page, false);
    expect(Number.parseFloat(await css(dialog, 'transition-duration')) * 1000).toBeCloseTo(exit, 0);
    await expect(dialog).toHaveJSProperty('open', false);
    // A standard sheet slides with no scrim.
    await mount(page, [fx('s', { open: false, variant: 'standard' }, LONG)]);
    expect(await openMoving(page)).toContain('translate');
    await expect(host(page).locator('dialog')).toHaveCount(0);
    await still(page);
    expect(await top(page)).toBeCloseTo(WINDOW.height / 2, 1);
    // Reduced motion: a fade in place, no slide.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mount(page, [fx('s', { open: false }, LONG)]);
    const moving = await openMoving(page);
    expect(moving).toContain('opacity');
    expect(moving).not.toContain('translate');
    expect(await top(page)).toBeCloseTo(WINDOW.height / 2, 1);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    // Mounted open: in place at once, no motion.
    await page.setViewportSize(WINDOW);
    await mountFixtures(page, spec, { fixtures: [fx('s', {}, LONG)] });
    expect(await sheet(page).evaluate((el) => el.getAnimations().length)).toBe(0);
    expect(await top(page)).toBeCloseTo(WINDOW.height / 2, 1);
  });

  test('BSH-2: an open modal sheet makes everything outside it inert, holds the page’s scroll and keeps focus inside (Tab wraps both ways)', async ({ page }) => {
    await mount(page, [fx('s', {}, '<button id="a">A</button> <button id="b">B</button>')]);
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<button id="behind" style="position:fixed;inset:0 auto auto 0">Behind</button>'));
    await page.locator('#behind').evaluate((el: HTMLElement) => el.focus());
    expect(await focused(page)).not.toBe('behind');
    expect(await page.evaluate(() => document.elementFromPoint(5, 5)?.id ?? null)).not.toBe('behind');
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden');
    await tab(page);
    expect(await focused(page)).toBe('a');
    await tab(page);
    expect(await focused(page)).toBe('b');
    await tab(page);
    expect(await focused(page)).toBe('a');
    await tab(page, { back: true });
    expect(await focused(page)).toBe('b');
    await setOpen(page, false);
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
  });

  test('BSH-3: opening moves focus to the element marked autofocus, else the sheet; closing with focus inside returns it (or drops it when that element is gone) — when it opens and closes, not when the motion ends; mounted open, only a modal sheet moves focus', async ({ page }) => {
    for (const variant of ['modal', 'standard']) {
      await mount(page, [fx('s', { open: false, variant }, '<button id="a">A</button> <button id="marked" autofocus>B</button>'), fx('plain', { open: false, variant, label: 'Plain' })]);
      await opener(page);
      await page.locator('#opener').focus();
      expect((await openMoving(page)).length, variant).toBeGreaterThan(0);
      expect(await focused(page), variant).toBe('marked');
      await setOpen(page, false);
      expect(await focused(page), variant).toBe('opener');
      await setOpen(page, true, 'plain');
      expect(await host(page, 'plain').evaluate((el) => el.shadowRoot!.activeElement?.classList.contains('sheet')), variant).toBe(true);
      await page.locator('#opener').evaluate((el) => el.remove());
      await setOpen(page, false, 'plain');
      expect(await page.evaluate(() => document.activeElement?.localName), variant).toBe('body');
    }
    await mount(page, [fixtureOf('modal')]);
    expect(await host(page, 'modal').evaluate((el) => el.shadowRoot!.activeElement?.localName)).toBe('dialog');
    await mount(page, [fixtureOf('standard')]);
    expect(await page.evaluate(() => document.activeElement?.localName)).toBe('body');
  });

  test('BSH-4: a standard sheet draws no scrim, makes nothing inert, lets Tab leave it and presses above it reach the content, ignores Escape and docks to its parent’s bottom edge without resizing the content', async ({ page }) => {
    await mount(page, [fx('s', { variant: 'standard', open: false }, '<button id="inside">Inside</button>')]);
    await page.locator('[data-fixture="s"]').evaluate((el) => el.insertAdjacentHTML('afterbegin', '<button id="above" style="position:absolute;inset:0 0 auto 0;block-size:200px">Above</button>'));
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('beforeend', '<button id="after">After</button>'));
    const above = await bounds(page.locator('#above'));
    await setOpen(page, true);
    await wire(page);
    await still(page);
    await expect(host(page).locator('dialog')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
    expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.id ?? null, [above.x + 50, above.y + 50])).toBe('above');
    expect(await bounds(page.locator('#above'))).toEqual(above);
    const stage = await bounds(page.locator('[data-fixture="s"]'));
    const s = await bounds(sheet(page));
    expect(s.y + s.height).toBeCloseTo(stage.y + stage.height, 1);
    await page.locator('#inside').focus();
    await page.keyboard.press('Escape');
    await tabTo(page, page.locator('#after'));
    await expect(host(page)).toHaveAttribute('open', '');
    await page.locator('#above').click();
    expect(await log(page)).toEqual([]);
  });

  test('BSH-5: while dismissible, the scrim, Escape, back and a drag below the lowest height ask to close — once, with the reason — and the product closes it; with closedby none nothing is asked and the scrim still blocks', async ({ page }) => {
    const cases: [string, () => Promise<void>][] = [
      ['scrim', () => page.mouse.click(200, 100)],
      ['escape', () => page.keyboard.press('Escape')],
      ['back', () => host(page).locator('dialog').evaluate((el) => el.dispatchEvent(new Event('cancel', { cancelable: true })))],
      ['drag', async () => drag(page, await handleCentre(page), 70)],
    ];
    for (const [reason, act] of cases) {
      await mount(page, [fx('s')]);
      await wire(page);
      await act();
      await expect.poll(() => log(page), reason).toEqual([`close:${reason}`]);
      // Controlled: the sheet stays open until the product closes it.
      await expect(host(page), reason).toHaveAttribute('open', '');
      await expect(host(page).locator('dialog'), reason).toHaveJSProperty('open', true);
    }
    for (const [reason, act] of cases) {
      await mount(page, [fx('s', { dismissible: false })]);
      await page.evaluate(() => {
        document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<button id="behind" style="position:fixed;inset:0;block-size:300px">Behind</button>');
        document.querySelector('#behind')!.addEventListener('click', () => ((window as any).clickedBehind = true));
      });
      await wire(page);
      await act();
      await page.waitForTimeout(100);
      expect(await log(page), reason).toEqual([]);
      expect(await page.evaluate(() => (window as any).clickedBehind ?? false), reason).toBe(false);
      await expect(host(page).locator('dialog'), reason).toHaveJSProperty('open', true);
    }
    // A standard sheet: only a drag asks.
    await mount(page, [fx('s', { variant: 'standard' })]);
    await wire(page);
    await sheet(page).evaluate((el: HTMLElement) => el.focus());
    await page.keyboard.press('Escape');
    await drag(page, await handleCentre(page), 70);
    await expect.poll(() => log(page)).toEqual(['close:drag']);
  });

  test('BSH-9: a drag past the slop follows the pointer, never above the full height; a release settles at the nearest height or the next one a fling points to, over the enter motion (at once where motion is reduced), and sets detent with one detentchange', async ({ page }) => {
    await mount(page, [fx('s', {}, LONG)]);
    await wire(page);
    const [full, enter] = [await px(page, T('container-margin-block-start')), await ms(page, T('motion-enter-duration'))];
    const partial = WINDOW.height / 2;
    const at = await handleCentre(page);
    // Within the slop, nothing moves.
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x, at.y + 6);
    expect(await top(page)).toBeCloseTo(partial, 1);
    await page.mouse.move(at.x, at.y + 100);
    expect(await top(page)).toBeCloseTo(partial + 100, 1);
    await page.mouse.move(at.x, at.y - 100);
    expect(await top(page)).toBeCloseTo(partial - 100, 1);
    await page.mouse.move(at.x, at.y - 350);
    expect(await top(page)).toBeCloseTo(full, 1);
    // Back down by 100 from the full height: nearer full than partial, so it settles there over the enter motion.
    await page.mouse.move(at.x, at.y - 250);
    expect(await top(page)).toBeCloseTo(full + 100, 1);
    await page.waitForTimeout(120);
    await watchRelease(page);
    await page.mouse.up();
    expect((await released(page)).atRelease.durations).toEqual([enter]);
    await still(page);
    expect(await top(page)).toBeCloseTo(full, 1);
    expect(await log(page)).toEqual(['detent:full:full']);
    // A short slow drag down settles back at full, with no event.
    await drag(page, await handleCentre(page), 100);
    await still(page);
    expect(await top(page)).toBeCloseTo(full, 1);
    // A fling down goes to the next height below.
    await fling(page, await handleCentre(page), 60);
    await still(page);
    expect(await top(page)).toBeCloseTo(partial, 1);
    expect(await log(page)).toEqual(['detent:full:full', 'detent:partial:partial']);
    // A fling up from partial: full.
    await fling(page, await handleCentre(page), -60);
    await still(page);
    expect(await top(page)).toBeCloseTo(full, 1);
    // Reduced motion: at once.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await drag(page, await handleCentre(page), 400);
    expect(await sheet(page).evaluate((el) => el.getAnimations().length)).toBe(0);
    expect(await top(page)).toBeCloseTo(partial, 1);
    expect(await log(page)).toEqual(['detent:full:full', 'detent:partial:partial', 'detent:full:full', 'detent:partial:partial']);
    // Below half of the lowest height (or a fling down from it) asks to close; above it settles back.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await mount(page, [fx('s', {}, LONG)]);
    await wire(page);
    await drag(page, await handleCentre(page), partial / 2 - 20);
    await still(page);
    expect(await top(page)).toBeCloseTo(partial, 1);
    await drag(page, await handleCentre(page), partial / 2 + 20);
    await still(page);
    await fling(page, await handleCentre(page), 60);
    expect(await log(page)).toEqual(['close:drag', 'close:drag']);
    // Not dismissible: it settles at its lowest height instead.
    await mount(page, [fx('s', { dismissible: false }, LONG)]);
    await wire(page);
    await drag(page, await handleCentre(page), partial - 40);
    await still(page);
    expect(await top(page)).toBeCloseTo(partial, 1);
    expect(await log(page)).toEqual([]);
  });

  test('BSH-9: a fast drag that holds still for more than 40 ms before its release is no fling — the nearest height is kept — and the same drag released within 40 ms of its last move flings to the next height', async ({ page }) => {
    await mount(page, [fx('s', {}, LONG)]);
    await wire(page);
    const [full, partial] = [await px(page, T('container-margin-block-start')), WINDOW.height / 2];
    expect(await top(page)).toBeCloseTo(partial, 1);
    // 30 px up at 2.5 px per ms, far nearer partial than full: only a fling raises the sheet to full.
    const from = await handleCentre(page);
    const moves = strokes(from, { x: 0, y: -10 });
    await flingThenHold(page, handle(page), { from, moves, hold: STOPPED_AFTER + 1 });
    await still(page);
    expect(await top(page)).toBeCloseTo(partial, 1);
    expect(await log(page)).toEqual([]);
    await flingThenHold(page, handle(page), { from, moves, hold: STOPPED_AFTER });
    await still(page);
    expect(await top(page)).toBeCloseTo(full, 1);
    expect(await log(page)).toEqual(['detent:full:full']);
  });

  test('BSH-10: the keyboard focus of a content that scrolls is drawn inside its edges and stays there while it scrolls — its inner stroke does not move away with the content', async ({ page }) => {
    await mount(page, [fx('s', { handle: false }, LONG)]);
    const c = content(page);
    await expect(c).toHaveAttribute('tabindex', '0');
    await tabTo(page, c);
    expect(await c.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
    expect(await innerStrokeAtEdges(page, c), 'before it is scrolled').toEqual({ top: true, bottom: true });
    await c.evaluate((el) => (el.scrollTop = 40));
    expect(await c.evaluate((el) => el.scrollTop)).toBe(40);
    expect(await innerStrokeAtEdges(page, c), 'scrolled by 40').toEqual({ top: true, bottom: true });
    await c.evaluate((el) => (el.scrollTop = el.scrollHeight));
    expect(await innerStrokeAtEdges(page, c), 'scrolled to its end').toEqual({ top: true, bottom: true });
  });

  test('BSH-10: the content scrolls inside the container at either height, by keyboard too; a drag up on it first raises the sheet to full, then scrolls it; a drag down first scrolls it to its top, then lowers the sheet', async ({ page }) => {
    await mount(page, [fx('s', {}, LONG)]);
    await wire(page);
    const full = await px(page, T('container-margin-block-start'));
    const partial = WINDOW.height / 2;
    await expect(content(page)).toHaveAttribute('tabindex', '0');
    await expect(content(page)).toHaveAttribute('data-touch', 'sheet');
    await expect(host(page).locator('.row')).toHaveCSS('touch-action', 'none');
    // The keyboard scrolls it at partial height.
    await content(page).focus();
    await page.keyboard.press('PageDown');
    await expect.poll(() => scrollTop(page)).toBeGreaterThan(0);
    // Let a smooth scroll end before going back to the top: the content stands still, however long the key's scroll
    // takes on this machine.
    await atRest(content(page));
    await content(page).evaluate((el) => (el.scrollTop = 0));
    await expect.poll(() => scrollTop(page)).toBe(0);
    // Up: the sheet rises to full, then the content scrolls by the rest.
    const from = { x: 200, y: partial + 150 };
    await drag(page, from, -(partial - full) - 100, { release: false });
    expect(await top(page)).toBeCloseTo(full, 1);
    expect(await scrollTop(page)).toBeCloseTo(100, -1);
    await page.mouse.up();
    await still(page);
    expect(await log(page)).toEqual(['detent:full:full']);
    await expect(content(page)).toHaveAttribute('data-touch', 'scroll');
    // Down: the content scrolls to its top, then the sheet lowers by the rest.
    const scrolled = await scrollTop(page);
    await drag(page, { x: 200, y: full + 150 }, scrolled + 50, { release: false });
    expect(await scrollTop(page)).toBe(0);
    expect(await top(page)).toBeCloseTo(full + 50, 0);
    await page.mouse.up();
    await still(page);
    expect(await top(page)).toBeCloseTo(full, 1);
    await expect(content(page)).toHaveAttribute('data-touch', 'pan-down');
  });

  test('BSH-20: a drag that asks to close holds for a frame, then slides out from where it was when the product closes, or settles back at the lowest height when it declines', async ({ page }) => {
    const partial = WINDOW.height / 2;
    // Declined: back to the lowest height.
    await mount(page, [fx('s', {}, LONG)]);
    await wire(page);
    await watchRelease(page);
    await drag(page, await handleCentre(page), partial / 2 + 40);
    const { asked, atRelease, nextFrame } = await released(page);
    // It asks at the release, and holds there for the frame: nothing moves it yet.
    expect(asked).toEqual(['close:drag']);
    expect(atRelease.durations).toEqual([]);
    expect(atRelease.top).toBeGreaterThan(partial + partial / 4);
    // Then it settles back over the enter motion, starting from where the drag left it.
    expect(nextFrame.durations).toEqual([await ms(page, T('motion-enter-duration'))]);
    expect(nextFrame.top).toBeCloseTo(atRelease.top, 0);
    await still(page);
    expect(await top(page)).toBeCloseTo(partial, 1);
    expect(await log(page)).toEqual(['close:drag']);
    await expect(host(page).locator('dialog')).toHaveJSProperty('open', true);
    // Closed: the exit motion starts from where the drag left it.
    await mount(page, [fx('s', {}, LONG)]);
    await closeOnRequest(page);
    await watchRelease(page);
    await drag(page, await handleCentre(page), partial / 2 + 40);
    const exit = await ms(page, T('motion-exit-duration'));
    // Seen at the release, once the product has closed it: where the browser keeps the dialog drawn while it leaves
    // (not Firefox, which has no overlay transition), it is still where the drag left it, sliding out over the exit.
    const { atRelease: leaving } = await released(page);
    if (leaving.top !== null) expect(leaving.top).toBeGreaterThan(partial + partial / 4);
    if (leaving.transitions.length) expect(leaving.transitions).toContainEqual(['translate', exit]);
    await expect(host(page)).not.toHaveAttribute('open');
    await expect(host(page).locator('dialog')).toHaveJSProperty('open', false);
  });

  test('BSH-21: the product’s detent moves the sheet over the enter motion without detentchange; a height the person chose stays until the product sets detent again', async ({ page }) => {
    await mount(page, [fx('s', {}, LONG)]);
    await wire(page);
    const [full, enter] = [await px(page, T('container-margin-block-start')), await ms(page, T('motion-enter-duration'))];
    // Read in the task that sets it, so the motion cannot have ended before it is seen.
    const moving = await host(page).evaluate(async (el: any) => {
      el.detent = 'full';
      await el.updateComplete;
      // Whole milliseconds, as the token is: Firefox reports a token of 200 ms as 200.000015 (a float of seconds).
      return (el.shadowRoot.querySelector('.sheet') as HTMLElement).getAnimations().map((a) => Math.round(Number(a.effect!.getTiming().duration)));
    });
    expect(moving).toEqual([enter]);
    await still(page);
    expect(await top(page)).toBeCloseTo(full, 1);
    expect(await log(page)).toEqual([]);
    // The person chooses partial with the handle; another change of the product's keeps it.
    await handle(page).click();
    await still(page);
    await host(page).evaluate(async (el: any) => {
      el.label = 'Renamed';
      await el.updateComplete;
    });
    expect(await host(page).evaluate((el: any) => el.detent)).toBe('partial');
    expect(await top(page)).toBeCloseTo(WINDOW.height / 2, 1);
    // Reduced motion: at once.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await host(page).evaluate(async (el: any) => {
      el.detent = 'full';
      await el.updateComplete;
    });
    expect(await top(page)).toBeCloseTo(full, 1);
    expect(await log(page)).toEqual(['detent:partial:partial']);
  });

  test('BSH-23: a dialog opened from a modal sheet is above it and makes it inert; Escape closes only the dialog, and the sheet gets back the focus the dialog returns', async ({ page }) => {
    await mount(page, [fx('s', {}, '<button id="ask">Ask</button>')]);
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('beforeend', '<tanrei-dialog headline="Discard?"><tanrei-button slot="actions" variant="text">OK</tanrei-button></tanrei-dialog>'));
    await wire(page);
    await page.locator('#ask').focus();
    await page.locator('tanrei-dialog').evaluate(async (el: any) => {
      el.open = true;
      await el.updateComplete;
    });
    // Below the dialog: a point over the sheet's content hits the dialog, not the content (WebKit still lets script focus
    // an element of a lower modal dialog, so the check is the hit, as the dialog's own DLG-15).
    const ask = await bounds(page.locator('#ask'));
    expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.localName, [ask.x + 4, ask.y + 4])).toBe('tanrei-dialog');
    await page.locator('tanrei-dialog').locator('dialog').focus();
    await page.keyboard.press('Escape');
    await expect(page.locator('tanrei-dialog')).not.toHaveAttribute('open');
    expect(await log(page)).toEqual([]);
    await expect.poll(() => focused(page)).toBe('ask');
    await page.keyboard.press('Escape');
    expect(await log(page)).toEqual(['close:escape']);
  });
});

test.describe('the header and the close button', () => {
  const header = (page: P, id = 's') => host(page, id).locator('.header');
  const close = (page: P, id = 's') => host(page, id).locator('tanrei-button.close');
  const paint = (page: P, id = 's') => close(page, id).locator('button').evaluate((el) => getComputedStyle(el).backgroundColor);
  const divider = (page: P, id = 's') => header(page, id).locator('.divider');

  test('BSH-28: with a headline or closable, a header below the handle’s row at least header.height high — the headline from container.padding in its role and color, a heading that names the sheet where label is empty; the close button header.padding-inline-end from the end edge and header.gap after the headline, both centred; a divider below it; it does not scroll with the content and the sheet is as tall as its rows and content; none without either', async ({ page }) => {
    await mount(page, [fixtureOf('modal-header')]);
    const id = 'modal-header';
    const [s, row, h, title, button] = await Promise.all([bounds(sheet(page, id)), bounds(host(page, id).locator('.row')), bounds(header(page, id)), bounds(host(page, id).locator('.headline')), bounds(close(page, id))]);
    expect(await px(page, T('header-height'))).toBe(64);
    expect(h.height).toBeCloseTo(await px(page, T('header-height')), 1);
    expect(h.y).toBeCloseTo(row.y + row.height, 1);
    expect(title.x - s.x).toBeCloseTo(await px(page, T('container-padding')), 1);
    expect(s.x + s.width - (button.x + button.width)).toBeCloseTo(await px(page, T('header-padding-inline-end')), 1);
    expect(button.x - (title.x + title.width)).toBeGreaterThanOrEqual((await px(page, T('header-gap'))) - 0.5);
    for (const box of [title, button]) expect(box.y + box.height / 2).toBeCloseTo(h.y + h.height / 2, 0);
    expect(await css(host(page, id).locator('.headline'), 'font-size')).toBe(`${await px(page, T('headline-typescale-font-size'))}px`);
    expect(await css(host(page, id).locator('.headline'), 'color')).toBe(await resolveColor(page, T('headline-color')));
    await expect(page.getByRole('heading', { name: 'Save photo', level: 2 })).toHaveCount(1);
    // No label: the headline names the dialog.
    await expect(page.getByRole('dialog', { name: 'Save photo' })).toHaveCount(1);
    // The divider below it, under always (the default system's).
    expect(await token(page, T('divider-visibility'))).toBe('always');
    const line = await bounds(divider(page, id));
    expect([line.y, line.width, line.height]).toEqual([h.y + h.height, s.width, await px(page, T('divider-width'))]);
    expect(await css(divider(page, id), 'background-color')).toBe(await resolveColor(page, T('divider-color')));
    await expect(divider(page, id)).toHaveCSS('visibility', 'visible');
    await expect(divider(page, id)).toHaveAttribute('aria-hidden', 'true');
    // As tall as the handle's row, the header and the content: a short content does not scroll.
    expect(await content(page, id).evaluate((el) => el.scrollHeight <= el.clientHeight + 0.5)).toBe(true);
    expect(s.height).toBeCloseTo(row.height + h.height + (await bounds(content(page, id))).height + Number.parseFloat(await css(sheet(page, id), 'padding-bottom')), 0);
    // The header stays while the content scrolls; under scroll the divider shows only once the content is scrolled.
    await mount(page, [fx('s', { headline: 'Terms of service', detent: 'full', dividerVisibility: 'scroll' }, LONG)]);
    const before = await bounds(header(page));
    await expect(divider(page)).toHaveCSS('visibility', 'hidden');
    await content(page).evaluate((el) => el.scrollBy(0, 120));
    await expect(divider(page)).toHaveCSS('visibility', 'visible');
    expect((await bounds(header(page))).y).toBe(before.y);
    // Without a headline and without closable: no header, no divider.
    await mount(page, [fixtureOf('modal')]);
    await expect(header(page, 'modal')).toHaveCount(0);
    await expect(host(page, 'modal').locator('.divider')).toHaveCount(0);
  });

  test('BSH-28: the header is drawn at the top of a sheet without a handle, and a drag on it moves the sheet; a divider-visibility the sheet does not define is drawn as auto and reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fixtureOf('no-handle-header')]);
    const id = 'no-handle-header';
    expect((await bounds(header(page, id))).y).toBeCloseTo((await bounds(sheet(page, id))).y, 1);
    await mount(page, [fx('s', { headline: 'Terms of service', closable: true, closeLabel: 'Close' }, LONG)]);
    await wire(page);
    const h = await bounds(header(page));
    const start = await top(page);
    await drag(page, { x: h.x + 24, y: h.y + h.height / 2 }, -280);
    await still(page);
    expect(await top(page)).toBeLessThan(start - 60);
    expect(await log(page)).toEqual(['detent:full:full']);
    await mount(page, [fx('s', { headline: 'Filters', dividerVisibility: 'sometimes' })]);
    await expect(divider(page)).toHaveCSS('visibility', 'visible');
    await expect.poll(() => seen.filter((w) => w.includes('BSH-28')).length).toBe(1);
    expect(seen.join('\n')).toMatch(/divider-visibility "sometimes" is not a value of the bottom sheet/);
  });

  test('BSH-29: while closable, an icon-only small Button (32 × 32) with the close glyph named by close-label, in close-button.variant (tonal) given through the Button’s channel; a click, Enter or Space asks to close once with the reason close, in either variant and whatever dismissible says; an empty close-label still draws it and is reported', async ({ page }) => {
    const seen = warnings(page);
    for (const props of [{}, { variant: 'standard' }, { dismissible: false }] as Fixture['props'][]) {
      const name = JSON.stringify(props);
      await mount(page, [fx('s', { headline: 'Share photo', closable: true, closeLabel: 'Close sharing', ...props })]);
      await wire(page);
      expect(await token(page, T('close-button-variant'))).toBe('tonal');
      await page.mouse.move(0, 0);
      await expect(close(page), name).not.toHaveAttribute('variant');
      await expect(close(page), name).toHaveAttribute('size', 'small');
      expect(await close(page).evaluate((el) => el.textContent?.trim())).toBe('close');
      await expect.poll(() => paint(page), name).toBe(await resolveColor(page, '--tanrei-comp-button-tonal-container-color'));
      const box = await bounds(close(page).locator('button'));
      expect([box.width, box.height], name).toEqual([32, 32]);
      await expect(host(page).getByRole('button', { name: 'Close sharing' }), name).toHaveCount(1);
      await close(page).locator('button').click();
      expect(await log(page), name).toEqual(['close:close']);
      await close(page).locator('button').focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('Space');
      expect(await log(page), name).toEqual(['close:close', 'close:close', 'close:close']);
      // Controlled: it stays open until the product closes it.
      await expect(host(page), name).toHaveAttribute('open', '');
    }
    // A system's choice reaches it through the same channel, at the next update.
    await mount(page, [fx('s', { headline: 'Share photo', closable: true, closeLabel: 'Close sharing' })]);
    await override(page, { [T('close-button-variant')]: 'text' });
    await host(page).evaluate((el) => {
      (el as HTMLElement & { headline: string }).headline = 'Share the photo';
    });
    await page.mouse.move(0, 0);
    await expect.poll(() => paint(page)).toBe(await resolveColor(page, '--tanrei-comp-button-text-container-color'));
    expect(seen.filter((w) => w.includes('BSH-29'))).toEqual([]);
    await mount(page, [fx('s', { headline: 'Share photo', closable: true, closeLabel: '' })]);
    await expect(close(page)).toBeVisible();
    await expect.poll(() => seen.filter((w) => w.includes('BSH-29')).length).toBe(1);
    expect(seen.join('\n')).toMatch(/close-label is empty, so the close button has no accessible name/);
  });

  test('BSH-29: under m3-like, m3-expressive-like and cupertino the close button is a bare glyph (text) at the system’s own small Button size', async ({ page }) => {
    for (const system of ['m3-like', 'm3-expressive-like', 'cupertino'] as const) {
      await mount(page, [fixtureOf('modal-header')], { system });
      const id = 'modal-header';
      await expect(close(page, id), system).toHaveAttribute('size', 'small');
      await expect.poll(() => paint(page, id), system).toBe(await resolveColor(page, '--tanrei-comp-button-text-container-color'));
      expect((await bounds(close(page, id).locator('button'))).height, system).toBeCloseTo(await px(page, '--tanrei-comp-button-container-height-small'), 1);
    }
  });

  test('BSH-30: a sheet with no handle, no close button and dismissible true still renders and is reported; a close button or closedby none takes the report away', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fixtureOf('no-handle')]);
    await expect(sheet(page, 'no-handle')).toBeVisible();
    await expect.poll(() => seen.filter((w) => w.includes('BSH-30')).length).toBe(1);
    expect(seen.join('\n')).toMatch(/no drag handle and no close button, so it shows no way out a person can see/);
    seen.length = 0;
    await mount(page, [fixtureOf('no-handle-header'), fx('s', { handle: false, dismissible: false })]);
    await settled(page);
    expect(seen.filter((w) => w.includes('BSH-30'))).toEqual([]);
  });
});

test.describe('accessibility', () => {
  // One test per theme: eight fixtures in two themes in one test outgrow a test's time on a loaded machine.
  for (const theme of ['light', 'dark'] as const) {
    test(`no axe violations in ${theme}, every fixture`, async ({ page }) => {
      for (const f of spec.fixtures) {
        await mount(page, [f], { theme });
        await page.waitForTimeout(300);
        const results = await new AxeBuilder({ page }).include('.stage').analyze();
        expect(results.violations, `${theme} ${f.id}: ${results.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(' ')}`).join(', ')}`).toEqual([]);
      }
    });
  }
});

test.describe('fixtures', () => {
  // The spec's snapshot harness: each fixture alone in a 400 × 720 window on a surface page, the sheet opened by `open`;
  // the baseline is the window (a modal sheet and its scrim are in the top layer).
  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mount(page, [f]);
      await expect(page).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
